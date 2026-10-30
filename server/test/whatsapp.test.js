import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildMessagePayload, sendOwnerAlert } from '../src/services/whatsappService.js';

const config = {
  accessToken: 'token',
  phoneNumberId: '123',
  apiVersion: 'v21.0',
  ownerPhone: '919800000000',
  templateName: '',
  templateLang: 'en',
};
const message = { employeeName: 'Arun', eventType: 'departure', timeText: '11:05 am' };

test('builds a template message when a template is configured', () => {
  const payload = buildMessagePayload({ ...config, templateName: 'attendance_alert' }, message);
  assert.equal(payload.type, 'template');
  assert.deepEqual(
    payload.template.components[0].parameters.map((p) => p.text),
    ['Arun', 'Possible departure from office', '11:05 am'],
  );
});

test('builds a text message without a template', () => {
  const payload = buildMessagePayload(config, message);
  assert.equal(payload.type, 'text');
  assert.match(payload.text.body, /Employee: Arun/);
});

test('does not call the API when not configured', async () => {
  let called = false;
  const result = await sendOwnerAlert({ ...config, accessToken: '' }, message, async () => {
    called = true;
  });
  assert.deepEqual(result, { ok: false, failureCode: 'not_configured' });
  assert.equal(called, false);
});

test('returns the provider message id on success and a code on failure', async () => {
  const ok = await sendOwnerAlert(config, message, async (url, init) => {
    assert.equal(url, 'https://graph.facebook.com/v21.0/123/messages');
    assert.equal(init.headers.Authorization, 'Bearer token');
    return { ok: true, json: async () => ({ messages: [{ id: 'wamid.1' }] }) };
  });
  assert.deepEqual(ok, { ok: true, messageId: 'wamid.1' });

  const failed = await sendOwnerAlert(config, message, async () => ({
    ok: false,
    status: 400,
    json: async () => ({ error: { code: 131047, message: 'Re-engagement message' } }),
  }));
  assert.deepEqual(failed, { ok: false, failureCode: 'api_131047' });
});
