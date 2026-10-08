// POST /api/notify-signup  เรียกจาก Supabase Database Webhook (ตาราง profiles, event INSERT)
// ต้องส่ง header  x-webhook-secret  ตรงกับ SIGNUP_WEBHOOK_SECRET
const crypto = require('crypto');
const { readRaw, send, notify } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
  const want = process.env.SIGNUP_WEBHOOK_SECRET || '';
  const got = String(req.headers['x-webhook-secret'] || '');
  const a = Buffer.from(got), b = Buffer.from(want);
  if (!want || a.length !== b.length || !crypto.timingSafeEqual(a, b)) return send(res, 401, { error: 'unauthorized' });
  try {
    const body = JSON.parse((await readRaw(req)).toString('utf8') || '{}');
    if (body.type === 'INSERT' && body.table === 'profiles') {
      await notify('👤 สมาชิกใหม่สมัครแล้ว\nอีเมล: ' + ((body.record && body.record.email) || '-'));
    }
    return send(res, 200, { ok: true });
  } catch (e) { console.error(e); return send(res, 500, { error: 'error' }); }
};
