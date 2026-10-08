// POST /api/create-job { title, details, link? } + Authorization: Bearer <token>
const { readRaw, send, supa, getUser, notify } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
  try {
    const user = await getUser(req);
    if (!user) return send(res, 401, { error: 'กรุณาเข้าสู่ระบบก่อน' });
    let b = {};
    try { b = JSON.parse((await readRaw(req)).toString('utf8') || '{}'); } catch (_) {}
    const contact = String(b.contact || '').trim().slice(0, 200), title = String(b.title || '').trim(), details = String(b.details || '').trim(), link = String(b.link || '').trim();
    if (title.length < 3 || title.length > 120) return send(res, 400, { error: 'หัวข้องานต้องยาว 3 ถึง 120 ตัวอักษร' });
    if (details.length < 5 || details.length > 4000) return send(res, 400, { error: 'รายละเอียดต้องยาว 5 ถึง 4,000 ตัวอักษร' });
    if (link && (link.length > 500 || !/^https?:\/\/\S+$/i.test(link))) return send(res, 400, { error: 'ลิงก์ต้องขึ้นต้นด้วย http:// หรือ https://' });

    // จำกัดงานที่ยังไม่จบไม่เกิน 10 งานต่อสมาชิก กันสแปม
    const c = await supa('/rest/v1/jobs?select=id&status=in.(new,doing)&user_id=eq.' + user.id, { headers: { Prefer: 'count=exact', Range: '0-0' } });
    const total = Number((c.headers.get('content-range') || '').split('/')[1] || 0);
    if (total >= 10) return send(res, 429, { error: 'มีงานที่ยังไม่เสร็จหลายรายการแล้ว รอให้ทีมงานดำเนินการก่อน' });

    const r = await supa('/rest/v1/jobs', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ user_id: user.id, title, details, link: link || null, contact: contact || null }) });
    if (!r.ok) { console.error('create job failed', r.status, await r.text()); return send(res, 500, { error: 'สร้างงานไม่สำเร็จ' }); }
    const job = (await r.json())[0];
    await notify('📥 งานใหม่\nจาก: ' + (user.email || user.id) + '\nหัวข้อ: ' + title + (link ? '\nลิงก์: ' + link : '') + (contact ? '\nติดต่อกลับ: ' + contact : '') + '\n\nเปิดหน้าแอดมินเพื่อดูรายละเอียด');
    return send(res, 200, { id: job.id });
  } catch (e) { console.error(e); return send(res, 500, { error: 'ระบบขัดข้อง กรุณาลองใหม่' }); }
};
