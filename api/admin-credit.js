// POST /api/admin-credit  เฉพาะแอดมิน (user id อยู่ใน ADMIN_USER_IDS)
// body: { action: 'check' | 'lookup' | 'adjust', email, type: 'deduct'|'add', amount, note }
const { readRaw, send, supa, getUser } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
  try {
    const user = await getUser(req);
    if (!user) return send(res, 401, { error: 'กรุณาเข้าสู่ระบบ' });
    const admins = (process.env.ADMIN_USER_IDS || '').split(',').map(x => x.trim()).filter(Boolean);
    if (!admins.includes(user.id)) return send(res, 403, { error: 'ไม่มีสิทธิ์แอดมิน' });

    let b = {};
    try { b = JSON.parse((await readRaw(req)).toString('utf8') || '{}'); } catch (_) {}
    if (b.action === 'check') return send(res, 200, { ok: true });

    const email = String(b.email || '').trim().toLowerCase();
    if (!email || email.length > 254) return send(res, 400, { error: 'กรอกอีเมลสมาชิก' });

    if (b.action === 'lookup') {
      const r = await supa('/rest/v1/profiles?select=credits&email=eq.' + encodeURIComponent(email));
      const rows = r.ok ? await r.json() : [];
      if (!rows.length) return send(res, 404, { error: 'ไม่พบสมาชิกอีเมลนี้' });
      return send(res, 200, { credits: Number(rows[0].credits) });
    }

    if (b.action === 'adjust') {
      const amount = Number(b.amount);
      if (!Number.isInteger(amount) || amount < 1 || amount > 100000) return send(res, 400, { error: 'จำนวนต้องเป็นจำนวนเต็ม 1 ถึง 100,000' });
      if (b.type !== 'deduct' && b.type !== 'add') return send(res, 400, { error: 'ประเภทไม่ถูกต้อง' });
      const note = String(b.note || '').slice(0, 200);
      const r = await supa('/rest/v1/rpc/admin_adjust_credits', {
        method: 'POST',
        body: JSON.stringify({ p_email: email, p_delta: b.type === 'deduct' ? -amount : amount, p_note: note, p_admin: user.id }),
      });
      const text = await r.text();
      if (!r.ok) {
        if (text.includes('insufficient credits')) return send(res, 409, { error: 'เครดิตของสมาชิกไม่พอ' });
        if (text.includes('member not found')) return send(res, 404, { error: 'ไม่พบสมาชิกอีเมลนี้' });
        console.error('admin_adjust_credits failed', r.status, text);
        return send(res, 500, { error: 'ปรับเครดิตไม่สำเร็จ' });
      }
      return send(res, 200, { credits: Number(JSON.parse(text)) });
    }
    return send(res, 400, { error: 'action ไม่ถูกต้อง' });
  } catch (e) {
    console.error(e);
    return send(res, 500, { error: 'ระบบขัดข้อง' });
  }
};
