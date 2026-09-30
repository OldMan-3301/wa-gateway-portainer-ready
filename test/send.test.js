const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

process.env.GATEWAY_API_KEY = 'test-gateway-key';
process.env.OPENWA_SESSION_ID = '';
process.env.OPENWA_API_KEY = '';
process.env.OPENWA_BASE_URL = 'http://127.0.0.1:9';

const { createApp, normalizePhone } = require('../server');

let server;
let baseUrl;

function request(method, path, { headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const payload = body === undefined ? null : Buffer.from(body);
    const req = http.request({
      method,
      hostname: url.hostname,
      port: url.port,
      path: `${url.pathname}${url.search}`,
      headers: {
        ...headers,
        ...(payload ? { 'Content-Length': payload.length } : {})
      }
    }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        let json;
        try { json = JSON.parse(raw); } catch { json = { raw }; }
        resolve({ status: res.statusCode, json });
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

before(async () => {
  const app = createApp();
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (!server) return;
  await new Promise((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
});

test('POST with query dst/text and Bearer auth reaches OpenWA validation', async () => {
  const res = await request(
    'POST',
    '/send?dst=93701234567&text=Auth%20test',
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-gateway-key'
      },
      body: ''
    }
  );
  assert.equal(res.status, 500);
  assert.equal(res.json.ok, false);
  assert.equal(res.json.error, 'OpenWA is not configured');
});

test('POST JSON body with X-Gateway-Key is accepted', async () => {
  const res = await request('POST', '/send', {
    headers: {
      'Content-Type': 'application/json',
      'X-Gateway-Key': 'test-gateway-key'
    },
    body: JSON.stringify({ dst: '93701234567', text: 'hello' })
  });
  assert.equal(res.status, 500);
  assert.equal(res.json.error, 'OpenWA is not configured');
});

test('POST form body with query key is accepted', async () => {
  const res = await request('POST', '/send?key=test-gateway-key', {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'dst=93701234567&text=hello'
  });
  assert.equal(res.status, 500);
  assert.equal(res.json.error, 'OpenWA is not configured');
});

test('GET query key still works', async () => {
  const res = await request('GET', '/send?key=test-gateway-key&dst=93701234567&text=Auth%20test');
  assert.equal(res.status, 500);
  assert.equal(res.json.error, 'OpenWA is not configured');
});

test('query dst/text win over an empty JSON object', async () => {
  const res = await request('POST', '/send?dst=93701234567&text=from-query', {
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer test-gateway-key'
    },
    body: '{}'
  });
  assert.equal(res.status, 500);
  assert.equal(res.json.error, 'OpenWA is not configured');
});

test('missing credentials are rejected', async () => {
  const res = await request('POST', '/send?dst=93701234567&text=hello', {
    headers: { 'Content-Type': 'application/json' },
    body: '{}'
  });
  assert.equal(res.status, 401);
  assert.equal(res.json.error, 'Unauthorized');
});

test('wrong credentials are rejected', async () => {
  const res = await request('POST', '/send?dst=93701234567&text=hello', {
    headers: { Authorization: 'Bearer wrong-key' },
    body: ''
  });
  assert.equal(res.status, 401);
});

test('AAA POST auth_key, dst, text, and country_code is accepted', async () => {
  const res = await request('POST', '/send?', {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'auth_key=test-gateway-key&dst=0728528440&text=Auth+test&country_code=93'
  });
  assert.equal(res.status, 500);
  assert.equal(res.json.error, 'OpenWA is not configured');
});

test('wrong auth_key is rejected', async () => {
  const res = await request('POST', '/send?', {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'auth_key=wrong&dst=0728528440&text=Auth+test&country_code=93'
  });
  assert.equal(res.status, 401);
});

test('country_code is applied once to local and international numbers', () => {
  assert.equal(normalizePhone('0728528440', '93'), '93728528440@c.us');
  assert.equal(normalizePhone('728528440', '93'), '93728528440@c.us');
  assert.equal(normalizePhone('93728528440', '93'), '93728528440@c.us');
  assert.equal(normalizePhone('+93 728 528 440', '93'), '93728528440@c.us');
  assert.equal(normalizePhone('0093728528440', '93'), '93728528440@c.us');
});

test('missing message is rejected after auth', async () => {
  const res = await request('POST', '/send?dst=93701234567', {
    headers: { Authorization: 'Bearer test-gateway-key' }
  });
  assert.equal(res.status, 400);
  assert.equal(res.json.error, 'Message text is required');
});
