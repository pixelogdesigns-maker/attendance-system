import { Alert } from '../models/Alert.js';
import { AttendanceRecord } from '../models/AttendanceRecord.js';
import { Office } from '../models/Office.js';
import { deliverAlert, MAX_ALERT_ATTEMPTS } from '../services/alertService.js';

// Retries alerts that failed for a temporary reason. Alerts are persisted first,
// so retries survive a server restart and never create a second alert.
export async function retryFailedAlerts() {
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const failed = await Alert.find({
    status: 'failed',
    attempts: { $lt: MAX_ALERT_ATTEMPTS },
    failureCode: { $ne: 'not_configured' },
    detectedAt: { $gte: since },
  }).limit(20);

  for (const alert of failed) {
    const record = await AttendanceRecord.findById(alert.attendanceRecordId).lean();
    const office = record && (await Office.findById(record.officeId).lean());
    if (office) await deliverAlert(alert, office);
  }
}

export function startAlertRetryJob(intervalMs = 5 * 60 * 1000) {
  const timer = setInterval(() => {
    retryFailedAlerts().catch((error) => console.error('[alerts] retry job failed:', error));
  }, intervalMs);
  timer.unref();
  return timer;
}
