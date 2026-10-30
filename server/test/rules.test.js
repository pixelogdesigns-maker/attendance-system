import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isAfterWorkEnd,
  isLateCheckIn,
  isWithinMonitoringWindow,
  monitoringDisplay,
} from '../src/services/attendanceRulesService.js';
import { localParts } from '../src/utils/dateTime.js';

const office = {
  timezone: 'Asia/Kolkata',
  monitoringStartLocal: '10:00',
  monitoringEndLocal: '18:00',
  lateAfterMinutes: 15,
  noUpdateMinutes: 10,
};

// India is UTC+5:30, so 10:00 IST = 04:30 UTC.
const ist = (hhmm) => new Date(`2026-10-30T${hhmm}:00+05:30`);

test('work date and time use the office timezone', () => {
  assert.deepEqual(localParts(new Date('2026-10-30T19:00:00Z'), 'Asia/Kolkata'), {
    workDate: '2026-10-31',
    minutesOfDay: 30,
  });
});

test('monitoring window is 10:00 to 18:00 office time', () => {
  assert.equal(isWithinMonitoringWindow(office, ist('09:59')), false);
  assert.equal(isWithinMonitoringWindow(office, ist('10:00')), true);
  assert.equal(isWithinMonitoringWindow(office, ist('17:59')), true);
  assert.equal(isWithinMonitoringWindow(office, ist('18:00')), false);
  assert.equal(isAfterWorkEnd(office, ist('18:05')), true);
});

test('late after the grace period', () => {
  assert.equal(isLateCheckIn(office, ist('09:45')), false);
  assert.equal(isLateCheckIn(office, ist('10:15')), false);
  assert.equal(isLateCheckIn(office, ist('10:16')), true);
});

test('dashboard display states', () => {
  const now = ist('11:00');
  const base = {
    checkInAt: ist('10:00'),
    lastReadingAt: ist('10:58'),
    monitoringStatus: 'active',
    locationState: 'inside',
    lastClassification: 'inside',
    departureCount: 0,
  };
  assert.equal(monitoringDisplay(null, office, now), 'not_checked_in');
  assert.equal(monitoringDisplay(base, office, now), 'active');
  assert.equal(monitoringDisplay({ ...base, lastReadingAt: ist('10:40') }, office, now), 'no_recent_update');
  assert.equal(monitoringDisplay({ ...base, locationState: 'outside' }, office, now), 'possible_outside');
  assert.equal(monitoringDisplay({ ...base, lastClassification: 'uncertain' }, office, now), 'location_uncertain');
  assert.equal(monitoringDisplay({ ...base, departureCount: 1 }, office, now), 'returned');
  assert.equal(monitoringDisplay({ ...base, checkOutAt: ist('10:59') }, office, now), 'stopped');
});
