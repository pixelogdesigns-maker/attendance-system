import 'dotenv/config';

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

export const env = {
  port: Number(process.env.PORT || 4000),
  // Number of proxies in front of the server (1 for most hosts). Needed to read the real client IP
  // for the office Wi-Fi check; too high a value lets clients fake their address.
  trustProxy: Number(process.env.TRUST_PROXY ?? 1),
  mongodbUri: required('MONGODB_URI'),
  authSecret: required('AUTH_SECRET'),
  clientOrigins: (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  whatsapp: {
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    apiVersion: process.env.WHATSAPP_API_VERSION || 'v21.0',
    ownerPhone: process.env.OWNER_PHONE || '',
    templateName: process.env.WHATSAPP_TEMPLATE_NAME || '',
    templateLang: process.env.WHATSAPP_TEMPLATE_LANG || 'en',
  },
};
