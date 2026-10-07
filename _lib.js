const crypto = require('crypto');

const AMOUNTS = [5, 15, 30, 40, 60, 90, 150, 250, 340, 440, 490, 640, 790, 990, 1640, 2440, 3240];

function env(name) {
  const v = process.env[name];
  if (!v) throw new Error('Missing environment variable ' + name);
  return v;
}

async function readRaw(req) {
  const chunks = [];
  for await (const c of req) chunks.push(typeof c === 'string' ? Buffer.from(c) : c);
  return Buffer.concat(chunks);
}

function send(res, code, obj) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(obj));
}

// เรียก Supabase ด้วย service_role (ใช้ฝั่งเซิร์ฟเวอร์เท่านั้น)
function supa(path, opts = {}) {
  const base = env('SUPABASE_URL').replace(/\/+$/, '');
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  const headers = { apikey: key, 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (key.startsWith('eyJ')) headers.Authorization = 'Bearer ' + key; // key แบบ JWT เก่า
  return fetch(base + path, { ...opts, headers });
}

// ตรวจลายเซ็น webhook ของ Beam: HMAC-SHA256 ด้วย key ที่ decode จาก base64, ผลเป็น base64
function verifySignature(rawBody, header, secretB64) {
  if (!header || !secretB64) return false;
  const expected = crypto.createHmac('sha256', Buffer.from(secretB64, 'base64')).update(rawBody).digest();
  const got = Buffer.from(String(header), 'base64');
  return got.length === expected.length && crypto.timingSafeEqual(got, expected);
}

// ตรวจ token ของผู้ใช้กับ Supabase คืน user หรือ null
async function getUser(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const base = env('SUPABASE_URL').replace(/\/+$/, '');
  const r = await fetch(base + '/auth/v1/user', { headers: { apikey: env('SUPABASE_SERVICE_ROLE_KEY'), Authorization: 'Bearer ' + token } });
  return r.ok ? r.json() : null;
}

module.exports = { AMOUNTS, env, readRaw, send, supa, verifySignature, getUser };
