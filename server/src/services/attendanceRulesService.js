import { localParts, parseClock } from '../utils/dateTime.js';

export function isWithinMonitoringWindow(office, date) {
  const { minutesOfDay } = localParts(date, office.timezone);
  return (
    minutesOfDay >= parseClock(office.monitoringStartLocal) &&
    minutesOfDay < parseClock(office.monitoringEndLocal)
  );
}

export function isLateCheckIn(office, date) {
  const { minutesOfDay } = localParts(date, office.timezone);
  return minutesOfDay > parseClock(office.monitoringStartLocal) + office.lateAfterMinutes;
}

export function isAfterWorkEnd(office, date) {
  const { minutesOfDay } = localParts(date, office.timezone);
  return minutesOfDay >= parseClock(office.monitoringEndLocal);
}

// Status shown on dashboards for a day's record.
export function monitoringDisplay(record, office, now = new Date()) {
  if (!record) return 'not_checked_in';
  if (record.checkOutAt || record.monitoringStatus === 'stopped') return 'stopped';
  if (!isWithinMonitoringWindow(office, now)) return 'stopped';
  const last = record.lastReadingAt || record.checkInAt;
  if (now.getTime() - last.getTime() > office.noUpdateMinutes * 60 * 1000) return 'no_recent_update';
  if (record.locationState === 'outside') return 'possible_outside';
  if (record.lastClassification === 'uncertain') return 'location_uncertain';
  if (record.departureCount > 0 && record.locationState === 'inside') return 'returned';
  return 'active';
}
