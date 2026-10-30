import { Router } from 'express';
import { AttendanceRecord } from '../models/AttendanceRecord.js';
import { LocationEvent } from '../models/LocationEvent.js';
import { HttpError } from '../middleware/errorHandler.js';
import { parseReading } from '../middleware/validate.js';
import { checkInAllowed } from '../services/geofenceService.js';
import { isAfterWorkEnd, isLateCheckIn, monitoringDisplay } from '../services/attendanceRulesService.js';
import { officeForUser } from '../services/officeService.js';
import { localParts } from '../utils/dateTime.js';

export const attendanceRouter = Router();

function serializeRecord(record, office, now = new Date()) {
  if (!record) return null;
  return {
    id: record._id,
    workDate: record.workDate,
    checkInAt: record.checkInAt,
    checkOutAt: record.checkOutAt,
    late: record.late,
    status: record.status,
    monitoringStatus: record.monitoringStatus,
    lastReadingAt: record.lastReadingAt,
    display: monitoringDisplay(record, office, now),
  };
}

function officeSettingsForClient(office) {
  return {
    name: office.name,
    radiusMeters: office.radiusMeters,
    sampleIntervalSeconds: office.sampleIntervalSeconds,
    monitoringStartLocal: office.monitoringStartLocal,
    monitoringEndLocal: office.monitoringEndLocal,
    timezone: office.timezone,
  };
}

attendanceRouter.post('/check-in', async (req, res) => {
  const office = await officeForUser(req.user);
  const reading = parseReading(req.body);
  const now = new Date();

  if (isAfterWorkEnd(office, now)) {
    throw new HttpError(400, `Work hours ended at ${office.monitoringEndLocal}.`);
  }
  const { workDate } = localParts(now, office.timezone);
  const existing = await AttendanceRecord.findOne({ employeeId: req.user._id, workDate });
  if (existing) throw new HttpError(409, 'You have already checked in today.');

  const check = checkInAllowed(office, reading, now);
  if (!check.allowed) throw new HttpError(400, check.message);

  const late = isLateCheckIn(office, now);
  const record = await AttendanceRecord.create({
    employeeId: req.user._id,
    officeId: office._id,
    workDate,
    checkInAt: now,
    late,
    status: late ? 'late' : 'present',
    lastReadingAt: now,
    lastDeviceTimestamp: reading.timestamp,
    lastClassification: 'inside',
    lastDistanceMeters: check.distance,
  });
  await LocationEvent.create({
    employeeId: req.user._id,
    attendanceRecordId: record._id,
    receivedAt: now,
    deviceTimestamp: reading.timestamp,
    latitude: reading.latitude,
    longitude: reading.longitude,
    accuracyMeters: reading.accuracyMeters,
    distanceFromOfficeMeters: check.distance,
    classification: 'inside',
    eventType: 'check_in',
    source: reading.source,
  });
  res.status(201).json({ record: serializeRecord(record, office, now), office: officeSettingsForClient(office) });
});

attendanceRouter.post('/check-out', async (req, res) => {
  const office = await officeForUser(req.user);
  const now = new Date();
  const { workDate } = localParts(now, office.timezone);
  const record = await AttendanceRecord.findOne({ employeeId: req.user._id, workDate });
  if (!record) throw new HttpError(409, 'You have not checked in today.');
  if (record.checkOutAt) throw new HttpError(409, 'You have already checked out.');
  record.checkOutAt = now;
  record.monitoringStatus = 'stopped';
  record.status = 'completed';
  await record.save();
  res.json({ record: serializeRecord(record, office, now) });
});

attendanceRouter.get('/today', async (req, res) => {
  const office = await officeForUser(req.user);
  const now = new Date();
  const { workDate } = localParts(now, office.timezone);
  const record = await AttendanceRecord.findOne({ employeeId: req.user._id, workDate });
  res.json({ record: serializeRecord(record, office, now), office: officeSettingsForClient(office) });
});

attendanceRouter.get('/history', async (req, res) => {
  const records = await AttendanceRecord.find({ employeeId: req.user._id })
    .sort({ workDate: -1 })
    .limit(31)
    .lean();
  res.json({
    records: records.map((r) => ({
      id: r._id,
      workDate: r.workDate,
      checkInAt: r.checkInAt,
      checkOutAt: r.checkOutAt,
      late: r.late,
      status: r.status,
      departureCount: r.departureCount,
    })),
  });
});
