import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isIpAllowed, networkEntryFor, normalizeIp, parseNetworkEntry } from '../src/utils/network.js';

test('normalizes IPv4-mapped IPv6 addresses', () => {
  assert.equal(normalizeIp('::ffff:203.0.113.5'), '203.0.113.5');
  assert.equal(normalizeIp('2001:db8::1'), '2001:db8::1');
});

test('parses single addresses and ranges, rejects junk', () => {
  assert.deepEqual(parseNetworkEntry('203.0.113.5'), { address: '203.0.113.5', prefix: 32, family: 'ipv4' });
  assert.deepEqual(parseNetworkEntry('2001:db8:1:2::/64'), { address: '2001:db8:1:2::', prefix: 64, family: 'ipv6' });
  assert.equal(parseNetworkEntry('not-an-ip'), null);
  assert.equal(parseNetworkEntry('203.0.113.5/40'), null);
});

test('matches the office network only', () => {
  const office = ['203.0.113.5', '2001:db8:1:2::/64'];
  assert.equal(isIpAllowed('203.0.113.5', office), true);
  assert.equal(isIpAllowed('::ffff:203.0.113.5', office), true);
  assert.equal(isIpAllowed('2001:db8:1:2:abcd:1234:5678:9abc', office), true);
  assert.equal(isIpAllowed('203.0.113.6', office), false);
  assert.equal(isIpAllowed('2001:db8:1:3::1', office), false);
  assert.equal(isIpAllowed('203.0.113.5', []), false);
  assert.equal(isIpAllowed(undefined, office), false);
});

test('saves the whole /64 for IPv6 so rotating phone addresses still match', () => {
  assert.equal(networkEntryFor('203.0.113.5'), '203.0.113.5');
  assert.equal(networkEntryFor('2001:db8:1:2:abcd:1234:5678:9abc'), '2001:db8:1:2::/64');
  assert.equal(networkEntryFor('2001:db8::1'), '2001:db8:0:0::/64');
  assert.equal(isIpAllowed('2001:db8::99', [networkEntryFor('2001:db8::1')]), true);
  assert.equal(networkEntryFor('garbage'), null);
});
