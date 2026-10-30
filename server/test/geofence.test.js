import { test } from 'node:test';
import assert from 'node:assert/strict';
import { distanceMeters } from '../src/utils/distance.js';
import { checkInAllowed, classifyReading } from '../src/services/geofenceService.js';

const office = {
  latitude: 13.0827,
  longitude: 80.2707,
  radiusMeters: 150,
  outsideBufferMeters: 20,
  insideBufferMeters: 20,
  maxAcceptedAccuracyMeters: 50,
  staleReadingSeconds: 120,
};

// Move north by a number of metres (1 degree of latitude is about 111,195 m).
const north = (meters) => office.latitude + meters / 111195;
const now = new Date('2026-10-30T06:00:00Z');
const reading = (meters, extra = {}) => ({
  latitude: north(meters),
  longitude: office.longitude,
  accuracyMeters: 10,
  timestamp: now,
  ...extra,
});

test('distanceMeters matches a known distance', () => {
  assert.ok(Math.abs(distanceMeters(office.latitude, office.longitude, north(1000), office.longitude) - 1000) < 1);
  assert.equal(distanceMeters(1, 1, 1, 1), 0);
});

test('classifies inside, buffer and outside with hysteresis', () => {
  assert.equal(classifyReading(office, reading(50), now).classification, 'inside');
  assert.equal(classifyReading(office, reading(140), now).classification, 'buffer');
  assert.equal(classifyReading(office, reading(160), now).classification, 'buffer');
  assert.equal(classifyReading(office, reading(200), now).classification, 'outside');
});

test('stale or inaccurate readings are uncertain', () => {
  const stale = reading(500, { timestamp: new Date(now.getTime() - 5 * 60 * 1000) });
  assert.equal(classifyReading(office, stale, now).classification, 'uncertain');
  assert.equal(classifyReading(office, reading(500, { accuracyMeters: 80 }), now).classification, 'uncertain');
});

test('check-in allowed inside radius, rejected outside or with poor accuracy', () => {
  assert.equal(checkInAllowed(office, reading(100), now).allowed, true);
  const outside = checkInAllowed(office, reading(300), now);
  assert.equal(outside.allowed, false);
  assert.match(outside.message, /300 m/);
  assert.equal(checkInAllowed(office, reading(20, { accuracyMeters: 200 }), now).allowed, false);
});
