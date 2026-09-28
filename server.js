const express = require('express');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '64kb' }));

const PORT = Number(process.env.PORT || 3000);
const OPENWA_BASE_URL = String(process.env.OPENWA_BASE_URL || 'http://openwa-api:2785').replace(/\/$/, '');
const OPENWA_SESSION_ID = String(process.env.OPENWA_SESSION_ID || '').trim();
const OPENWA_API_KEY = String(process.env.OPENWA_API_KEY || '').trim();
const GATEWAY_API_KEY = String(process.env.GATEWAY_API_KEY || '').trim();
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 30000);
const MAX_TEXT_LENGTH = Number(process.env.MAX_TEXT_LENGTH || 4096);

function unauthorized(res) {
  return res.status(401).json({ ok: false, error: 'Unauthorized' });
}

function authorized(req) {
  if (!GATEWAY_API_KEY) return false;
  const supplied = req.get('x-gateway-key') ||
    (req.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  return supplied && supplied === GATEWAY_API_KEY;
}

function normalizePhone(value) {
  if (value === undefined || value === null) return null;
  let s = String(value).trim();
  const digitMap = { '۰':'0','۱':'1','۲':'2','۳':'3','۴':'4','۵':'5','۶':'6','۷':'7','۸':'8','۹':'9','٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9' };
  s = s.replace(/[۰-۹٠-٩]/g, ch => digitMap[ch] || ch);
  s = s.replace(/[\s().-]/g, '');
  if (s.startsWith('00')) s = '+' + s.slice(2);
  if (s.startsWith('+')) s = s.slice(1);
  if (s.startsWith('0') && s.length === 10) s = '93' + s.slice(1);
  if (!/^\d{8,15}$/.test(s)) return null;
  return `${s}@c.us`;
}

async function sendText(dst, text) {
  if (!OPENWA_SESSION_ID || !OPENWA_API_KEY) {
    const err = new Error('OpenWA is not configured');
    err.status = 500;
    throw err;
  }

  const chatId = normalizePhone(dst);
  if (!chatId) {
    const err = new Error('Invalid recipient phone number');
    err.status = 400;
    throw err;
  }

  const message = String(text ?? '').trim();
  if (!message) {
    const err = new Error('Message text is required');
    err.status = 400;
    throw err;
  }
  if (message.length > MAX_TEXT_LENGTH) {
    const err = new Error(`Message exceeds maximum length of ${MAX_TEXT_LENGTH}`);
    err.status = 400;
    throw err;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const url = `${OPENWA_BASE_URL}/api/sessions/${encodeURIComponent(OPENWA_SESSION_ID)}/messages/send-text`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': OPENWA_API_KEY
      },
      body: JSON.stringify({ chatId, text: message }),
      signal: controller.signal
    });
    const raw = await response.text();
    let data;
    try { data = JSON.parse(raw); } catch { data = { raw }; }
    if (!response.ok) {
      const err = new Error(data?.message || data?.error || `OpenWA returned HTTP ${response.status}`);
      err.status = 502;
      err.openwaStatus = response.status;
      throw err;
    }
    return { chatId, data };
  } finally {
    clearTimeout(timer);
  }
}

app.get('/health', (_req, res) => res.json({ ok: true, service: 'wa-gateway' }));
app.get('/ready', (_req, res) => {
  const ready = Boolean(OPENWA_SESSION_ID && OPENWA_API_KEY && GATEWAY_API_KEY);
  res.status(ready ? 200 : 503).json({ ok: ready, configured: ready });
});

app.all('/send', async (req, res) => {
  if (!authorized(req)) return unauthorized(res);
  const dst = req.method === 'GET' ? req.query.dst : req.body?.dst;
  const text = req.method === 'GET' ? req.query.text : req.body?.text;
  try {
    const result = await sendText(dst, text);
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(err.status || 502).json({ ok: false, error: err.message });
  }
});

app.use((_req, res) => res.status(404).json({ ok: false, error: 'Not found' }));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`wa-gateway listening on ${PORT}`);
});
