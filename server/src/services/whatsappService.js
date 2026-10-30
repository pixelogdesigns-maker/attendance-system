// Sends owner alerts through the WhatsApp Business Platform (Cloud API).
// Credentials stay on the server; nothing here is ever sent to the browser.

const EVENT_TEXT = {
  departure: 'Possible departure from office',
  return: 'Returned to office',
  no_update: 'No recent location update',
};

export function isWhatsAppConfigured(config) {
  return Boolean(config.accessToken && config.phoneNumberId && config.ownerPhone);
}

export function buildMessagePayload(config, { employeeName, eventType, timeText }) {
  const eventText = EVENT_TEXT[eventType] || eventType;
  if (config.templateName) {
    return {
      messaging_product: 'whatsapp',
      to: config.ownerPhone,
      type: 'template',
      template: {
        name: config.templateName,
        language: { code: config.templateLang },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: employeeName },
              { type: 'text', text: eventText },
              { type: 'text', text: timeText },
            ],
          },
        ],
      },
    };
  }
  const verify =
    eventType === 'departure' ? '\nPlease verify with the employee.' : '';
  return {
    messaging_product: 'whatsapp',
    to: config.ownerPhone,
    type: 'text',
    text: {
      body: `Attendance alert\nEmployee: ${employeeName}\nEvent: ${eventText}\nTime: ${timeText}${verify}`,
    },
  };
}

// Returns { ok: true, messageId } or { ok: false, failureCode }.
export async function sendOwnerAlert(config, message, fetchImpl = fetch) {
  if (!isWhatsAppConfigured(config)) {
    console.info('[whatsapp] not configured, alert logged only:', message);
    return { ok: false, failureCode: 'not_configured' };
  }
  const url = `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`;
  try {
    const response = await fetchImpl(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildMessagePayload(config, message)),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const code = body?.error?.code ? `api_${body.error.code}` : `http_${response.status}`;
      console.warn('[whatsapp] send failed:', code, body?.error?.message);
      return { ok: false, failureCode: code };
    }
    return { ok: true, messageId: body?.messages?.[0]?.id };
  } catch (error) {
    console.warn('[whatsapp] network error:', error.message);
    return { ok: false, failureCode: 'network_error' };
  }
}
