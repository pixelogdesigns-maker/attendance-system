import { env } from '../config/env.js';
import { Alert } from '../models/Alert.js';
import { User } from '../models/User.js';
import { formatLocalTime } from '../utils/dateTime.js';
import { sendOwnerAlert } from './whatsappService.js';

export const MAX_ALERT_ATTEMPTS = 3;

// Creates the alert once (the dedupe key makes repeats a no-op) and tries to deliver it.
export async function raiseAlert({ record, office, eventType, detectedAt }) {
  const dedupeKey = `${record._id}:${eventType}:${record.departureCount}`;
  let alert;
  try {
    alert = await Alert.create({
      employeeId: record.employeeId,
      attendanceRecordId: record._id,
      eventType,
      detectedAt,
      dedupeKey,
    });
  } catch (error) {
    if (error.code === 11000) return null; // already raised
    throw error;
  }
  await deliverAlert(alert, office);
  return alert;
}

export async function deliverAlert(alert, office) {
  const employee = await User.findById(alert.employeeId).lean();
  const result = await sendOwnerAlert(env.whatsapp, {
    employeeName: employee?.name || 'Unknown employee',
    eventType: alert.eventType,
    timeText: formatLocalTime(alert.detectedAt, office.timezone),
  });
  alert.attempts += 1;
  if (result.ok) {
    alert.status = 'sent';
    alert.providerMessageId = result.messageId;
    alert.failureCode = undefined;
  } else {
    alert.status = 'failed';
    alert.failureCode = result.failureCode;
  }
  await alert.save();
  return alert;
}
