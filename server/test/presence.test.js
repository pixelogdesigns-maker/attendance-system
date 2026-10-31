import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertCanCheckIn, classifyPresence } from '../src/services/presenceService.js';

const wifiOffice = { checkMethod: 'wifi', officeNetworks: ['203.0.113.5', '2001:db8:1:2::/64'] };
const req = (ip, body = {}) => ({ ip, body });

test('Wi-Fi check-in works only from the office network', () => {
  assert.doesNotThrow(() => assertCanCheckIn(wifiOffice, req('203.0.113.5')));
  assert.doesNotThrow(() => assertCanCheckIn(wifiOffice, req('2001:db8:1:2::42')));
  assert.throws(() => assertCanCheckIn(wifiOffice, req('198.51.100.7')), (e) => e.status === 400 && /office Wi-Fi/.test(e.message));
});

test('Wi-Fi check-in explains when the office network is not set up', () => {
  assert.throws(
    () => assertCanCheckIn({ checkMethod: 'wifi', officeNetworks: [] }, req('203.0.113.5')),
    (e) => e.status === 409 && /not been set up/.test(e.message),
  );
});

test('Wi-Fi presence: office network is inside, anything else is outside', () => {
  assert.equal(classifyPresence(wifiOffice, req('203.0.113.5')).classification, 'inside');
  assert.equal(classifyPresence(wifiOffice, req('198.51.100.7')).classification, 'outside');
});

test('GPS mode still uses the geofence', () => {
  const gpsOffice = {
    checkMethod: 'gps',
    latitude: 13.0827,
    longitude: 80.2707,
    radiusMeters: 150,
    outsideBufferMeters: 20,
    insideBufferMeters: 20,
    maxAcceptedAccuracyMeters: 50,
    staleReadingSeconds: 120,
    officeNetworks: [],
  };
  const now = new Date();
  const body = { latitude: 13.0827, longitude: 80.2707, accuracy: 10, timestamp: now.getTime() };
  assert.equal(classifyPresence(gpsOffice, req('198.51.100.7', body), now).classification, 'inside');
  assert.doesNotThrow(() => assertCanCheckIn(gpsOffice, req('198.51.100.7', body), now));
});
