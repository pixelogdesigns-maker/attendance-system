import { Router } from 'express';
import { AttendanceRecord } from '../models/AttendanceRecord.js';
import { LocationEvent } from '../models/LocationEvent.js';
import { HttpError } from '../middleware/errorHandler.js';
import { parseReading } from '../middleware/validate.js';
import { raiseAlert } from '../services/alertService.js';
import { isWithinMonitoringWindow, monitoringDisplay } from '../services/attendanceRulesService.js';
import { nextDepartureState } from '../services/departureDetectionService.js';
import { classifyReading } from '../services/geofenceService.js';
import { officeForUser } from '../services/officeService.js';
import { localParts } from '../utils/dateTime.js';

export const locationRouter = Router();

locationRouter.post('/', async (req, res) => {
  const office = await officeForUser(req.user);
  const reading = parseReading(req.body);
  const now = new Date();
  const { workDate } = localParts(now, office.timezone);

  // Employee id always comes from the session, never from the request body.
  const record = await AttendanceRecord.findOne({ employeeId: req.user._id, workDate });
  if (!record || record.checkOutAt || record.monitoringStatus !== 'active') {
    throw new HttpError(409, 'Monitoring is not active. Please check in first.');
  }

  if (!isWithinMonitoringWindow(office, now)) {
    return res.json({ accepted: false, display: monitoringDisplay(record, office, now) });
  }

  // Drop readings that arrive out of order.
  if (record.lastDeviceTimestamp && reading.timestamp <= record.lastDeviceTimestamp) {
    return res.json({ accepted: false, display: monitoringDisplay(record, office, now) });
  }

  const { distance, classification } = classifyReading(office, reading, now);
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
  record.lastDeviceTimestamp = reading.timestamp;
  record.lastClassification = classification;
  record.lastDistanceMeters = distance;
  if (event === 'departure') record.departureCount += 1;
  await record.save(); // optimistic concurrency: a conflicting request gets 409

  await LocationEvent.create({
    employeeId: req.user._id,
    attendanceRecordId: record._id,
    receivedAt: now,
    deviceTimestamp: reading.timestamp,
    latitude: reading.latitude,
    longitude: reading.longitude,
    accuracyMeters: reading.accuracyMeters,
    distanceFromOfficeMeters: distance,
    classification,
    eventType: event || 'sample',
    source: reading.source,
  });

  if (event === 'departure' || (event === 'return' && office.sendReturnAlerts)) {
    await raiseAlert({ record, office, eventType: event, detectedAt: now });
  }

  res.json({ accepted: true, classification, event, display: monitoringDisplay(record, office, now) });
});
