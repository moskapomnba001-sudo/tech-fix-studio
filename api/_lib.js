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

// แจ้งเตือนเข้า Telegram ของเจ้าของเว็บ (ไม่บังคับ: ถ้าไม่ได้ตั้งค่า token จะข้ามไปเฉยๆ และไม่ทำให้งานหลักพัง)
async function notify(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN, chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return;
  try {
    await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, text: String(text).slice(0, 3500), disable_web_page_preview: true }),
    });
  } catch (e) { console.error('telegram notify failed'); }
}

// ตรวจว่าผู้เรียกเป็นแอดมิน (user id อยู่ใน ADMIN_USER_IDS) ถ้าไม่ใช่จะตอบกลับเองและคืน null
async function requireAdmin(req, res) {
  const user = await getUser(req);
  if (!user) { send(res, 401, { error: 'กรุณาเข้าสู่ระบบ' }); return null; }
  const admins = (process.env.ADMIN_USER_IDS || '').split(',').map(x => x.trim()).filter(Boolean);
  if (!admins.includes(user.id)) { send(res, 403, { error: 'ไม่มีสิทธิ์แอดมิน' }); return null; }
  return user;
}

module.exports = { AMOUNTS, env, readRaw, send, supa, verifySignature, getUser, notify, requireAdmin };
