import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { Alert } from '../models/Alert.js';
import { AttendanceRecord } from '../models/AttendanceRecord.js';
import { AuditLog } from '../models/AuditLog.js';
import { Office } from '../models/Office.js';
import { User } from '../models/User.js';
import { HttpError } from '../middleware/errorHandler.js';
import { pick, requireString } from '../middleware/validate.js';
import { monitoringDisplay } from '../services/attendanceRulesService.js';
import { officeForUser } from '../services/officeService.js';
import { localParts } from '../utils/dateTime.js';

export const ownerRouter = Router();

async function audit(req, action, targetType, targetId, reason, changes) {
  await AuditLog.create({ actorUserId: req.user._id, action, targetType, targetId, reason, changes });
}

function serializeAlert(alert, namesById) {
  return {
    id: alert._id,
    employeeId: alert.employeeId,
    employeeName: namesById.get(String(alert.employeeId)) || 'Unknown',
    eventType: alert.eventType,
    detectedAt: alert.detectedAt,
    status: alert.status,
    failureCode: alert.failureCode,
  };
}

ownerRouter.get('/dashboard', async (req, res) => {
  const office = await officeForUser(req.user);
  const now = new Date();
  const { workDate } = localParts(now, office.timezone);
  const [employees, records, alerts] = await Promise.all([
    User.find({ role: 'employee', active: true }).sort({ name: 1 }).lean(),
    AttendanceRecord.find({ workDate }).lean(),
    Alert.find().sort({ detectedAt: -1 }).limit(10).lean(),
  ]);
  const recordByEmployee = new Map(records.map((r) => [String(r.employeeId), r]));
  const namesById = new Map(employees.map((e) => [String(e._id), e.name]));

  res.json({
    workDate,
    office: { id: office._id, name: office.name, timezone: office.timezone },
    employees: employees.map((employee) => {
      const record = recordByEmployee.get(String(employee._id));
      return {
        id: employee._id,
        name: employee.name,
        recordId: record?._id ?? null,
        checkInAt: record?.checkInAt ?? null,
        checkOutAt: record?.checkOutAt ?? null,
        late: record?.late ?? false,
        status: record?.status ?? null,
        departureCount: record?.departureCount ?? 0,
        lastReadingAt: record?.lastReadingAt ?? null,
        lastDistanceMeters: record?.lastDistanceMeters ?? null,
        display: monitoringDisplay(record, office, now),
      };
    }),
    recentAlerts: alerts.map((a) => serializeAlert(a, namesById)),
  });
});

ownerRouter.get('/alerts', async (req, res) => {
  const filter = {};
  if (req.query.employeeId) filter.employeeId = req.query.employeeId;
  if (req.query.eventType) filter.eventType = String(req.query.eventType);
  const [alerts, users] = await Promise.all([
    Alert.find(filter).sort({ detectedAt: -1 }).limit(100).lean(),
    User.find().select('name').lean(),
  ]);
  const namesById = new Map(users.map((u) => [String(u._id), u.name]));
  res.json({ alerts: alerts.map((a) => serializeAlert(a, namesById)) });
});

ownerRouter.get('/attendance', async (req, res) => {
  const filter = {};
  if (req.query.from || req.query.to) {
    filter.workDate = {};
    if (req.query.from) filter.workDate.$gte = String(req.query.from);
    if (req.query.to) filter.workDate.$lte = String(req.query.to);
  }
  const [records, users] = await Promise.all([
    AttendanceRecord.find(filter).sort({ workDate: -1 }).limit(500).lean(),
    User.find().select('name').lean(),
  ]);
  const namesById = new Map(users.map((u) => [String(u._id), u.name]));
  res.json({
    records: records.map((r) => ({
      id: r._id,
      employeeName: namesById.get(String(r.employeeId)) || 'Unknown',
      workDate: r.workDate,
      checkInAt: r.checkInAt,
      checkOutAt: r.checkOutAt,
      late: r.late,
      status: r.status,
      departureCount: r.departureCount,
    })),
  });
});

ownerRouter.patch('/attendance/:id', async (req, res) => {
  const reason = requireString(req.body?.reason, 'Reason', { min: 3, max: 500 });
  const record = await AttendanceRecord.findById(req.params.id);
  if (!record) throw new HttpError(404, 'Attendance record not found.');

  const changes = pick(req.body, ['checkInAt', 'checkOutAt', 'status', 'late']);
  if (Object.keys(changes).length === 0) throw new HttpError(400, 'Nothing to change.');
  const before = pick(record.toObject(), Object.keys(changes));
  for (const key of ['checkInAt', 'checkOutAt']) {
    if (key in changes && changes[key] !== null) changes[key] = new Date(changes[key]);
  }
  record.set(changes);
  if (record.checkOutAt) record.monitoringStatus = 'stopped';
  await record.save();
  await audit(req, 'attendance.correct', 'AttendanceRecord', record._id, reason, { before, after: changes });
  res.json({ ok: true });
});

const OFFICE_FIELDS = [
  'name', 'latitude', 'longitude', 'radiusMeters', 'outsideBufferMeters', 'insideBufferMeters',
  'maxAcceptedAccuracyMeters', 'staleReadingSeconds', 'outsideReadingsRequired',
  'insideReadingsRequired', 'sampleIntervalSeconds', 'noUpdateMinutes', 'lateAfterMinutes',
  'timezone', 'monitoringStartLocal', 'monitoringEndLocal', 'sendReturnAlerts',
];

ownerRouter.get('/offices', async (_req, res) => {
  res.json({ offices: await Office.find().sort({ createdAt: 1 }).lean() });
});

ownerRouter.patch('/offices/:id', async (req, res) => {
  const office = await Office.findById(req.params.id);
  if (!office) throw new HttpError(404, 'Office not found.');
  const changes = pick(req.body || {}, OFFICE_FIELDS);
  if (Object.keys(changes).length === 0) throw new HttpError(400, 'Nothing to change.');
  const before = pick(office.toObject(), Object.keys(changes));
  office.set(changes);
  await office.save();
  await audit(req, 'office.update', 'Office', office._id, req.body?.reason || '', { before, after: changes });
  res.json({ office });
});

ownerRouter.get('/employees', async (_req, res) => {
  const users = await User.find({ role: 'employee' }).sort({ name: 1 });
  res.json({ employees: users.map((u) => u.toPublic()) });
});

ownerRouter.post('/employees', async (req, res) => {
  const name = requireString(req.body?.name, 'Name', { max: 100 });
  const email = requireString(req.body?.email, 'Email', { max: 200 }).toLowerCase();
  const password = requireString(req.body?.password, 'Password', { min: 8, max: 200 });
  const user = await User.create({
    name,
    email,
    passwordHash: await bcrypt.hash(password, 12),
    role: 'employee',
  });
  await audit(req, 'employee.create', 'User', user._id, '', { name, email });
  res.status(201).json({ employee: user.toPublic() });
});

ownerRouter.patch('/employees/:id', async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, role: 'employee' });
  if (!user) throw new HttpError(404, 'Employee not found.');
  const changes = {};
  if (req.body?.name !== undefined) changes.name = requireString(req.body.name, 'Name', { max: 100 });
  if (req.body?.active !== undefined) changes.active = Boolean(req.body.active);
  if (req.body?.password !== undefined) {
    user.passwordHash = await bcrypt.hash(requireString(req.body.password, 'Password', { min: 8 }), 12);
    changes.passwordReset = true;
  }
  user.set(pick(changes, ['name', 'active']));
  await user.save();
  await audit(req, 'employee.update', 'User', user._id, req.body?.reason || '', changes);
  res.json({ employee: user.toPublic() });
});
