import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.MONGODB_URI ||= 'mongodb://127.0.0.1:1/unused';
process.env.AUTH_SECRET ||= 'test-secret';

const { createApp } = await import('../src/app.js');
const { signToken } = await import('../src/middleware/auth.js');

let server;
let base;
before(async () => {
  server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

test('health endpoint responds', async () => {
  const res = await fetch(`${base}/api/health`);
  assert.equal(res.status, 200);
  assert.equal((await res.json()).ok, true);
});

test('protected routes need a login', async () => {
  for (const path of ['/api/v1/attendance/today', '/api/v1/location-events', '/api/v1/owner/dashboard']) {
    const res = await fetch(`${base}${path}`, { method: path.includes('location') ? 'POST' : 'GET' });
    assert.equal(res.status, 401, path);
  }
});

test('a forged or expired token is rejected', async () => {
  const res = await fetch(`${base}/api/v1/owner/dashboard`, {
    headers: { Authorization: 'Bearer not-a-real-token' },
  });
  assert.equal(res.status, 401);
  assert.ok(signToken({ _id: 'x', role: 'owner' }));
});

test('unknown API paths return 404 JSON', async () => {
  const res = await fetch(`${base}/api/nope`);
  assert.equal(res.status, 404);
  assert.equal((await res.json()).error, 'Not found.');
});
