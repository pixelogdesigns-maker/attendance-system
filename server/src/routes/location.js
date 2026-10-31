import { Router } from 'express';
import { AttendanceRecord } from '../models/AttendanceRecord.js';
import { LocationEvent } from '../models/LocationEvent.js';
import { HttpError } from '../middleware/errorHandler.js';
import { raiseAlert } from '../services/alertService.js';
import { isWithinMonitoringWindow, monitoringDisplay } from '../services/attendanceRulesService.js';
import { nextDepartureState } from '../services/departureDetectionService.js';
import { officeForUser } from '../services/officeService.js';
import { classifyPresence, eventFields } from '../services/presenceService.js';
import { localParts } from '../utils/dateTime.js';

export const locationRouter = Router();

// Minimum gap between counted readings, so a burst of pings cannot trigger an alert on its own.
const MIN_READING_GAP_MS = 30 * 1000;

locationRouter.post('/', async (req, res) => {
  const office = await officeForUser(req.user);
  const now = new Date();
  const { workDate } = localParts(now, office.timezone);

  // Employee id always comes from the session, never from the request body.
  const record = await AttendanceRecord.findOne({ employeeId: req.user._id, workDate });
  if (!record || record.checkOutAt || record.monitoringStatus !== 'active') {
    throw new HttpError(409, 'Monitoring is not active. Please check in first.');
  }

  const presence = classifyPresence(office, req, now);
  const notCounted = () => res.json({ accepted: false, display: monitoringDisplay(record, office, now) });

  if (!isWithinMonitoringWindow(office, now)) return notCounted();
  if (record.lastReadingAt && now - record.lastReadingAt < MIN_READING_GAP_MS) return notCounted();
  // Drop GPS readings that arrive out of order.
  const deviceTime = presence.reading?.timestamp;
  if (deviceTime && record.lastDeviceTimestamp && deviceTime <= record.lastDeviceTimestamp) return notCounted();

  const { classification, distance } = presence;
  const { state, event } = nextDepartureState(
    {
      locationState: record.locationState,
      consecutiveOutside: record.consecutiveOutside,
      consecutiveInside: record.consecutiveInside,
    },
    classification,
    office,
  );

  record.set(state);
  record.lastReadingAt = now;
  if (deviceTime) record.lastDeviceTimestamp = deviceTime;
  record.lastClassification = classification;
  record.lastDistanceMeters = distance ?? undefined;
  if (event === 'departure') record.departureCount += 1;
  await record.save(); // optimistic concurrency: a conflicting request gets 409

  await LocationEvent.create({
    employeeId: req.user._id,
    attendanceRecordId: record._id,
    ...eventFields(req, presence),
    classification,
    eventType: event || 'sample',
  });

  if (event === 'departure' || (event === 'return' && office.sendReturnAlerts)) {
    await raiseAlert({ record, office, eventType: event, detectedAt: now });
  }

  res.json({ accepted: true, classification, event, display: monitoringDisplay(record, office, now) });
});
