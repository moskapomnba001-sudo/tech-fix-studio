// POST /api/job-message { job_id, body } + Authorization: Bearer <token>
// ลูกค้าส่งได้เฉพาะงานของตัวเอง ส่วนแอดมินส่งได้ทุกงาน
const { readRaw, send, supa, getUser, isAdmin, notify, notifyUser, notifyAdmins } = require('./_lib');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
  try {
    const user = await getUser(req);
    if (!user) return send(res, 401, { error: 'กรุณาเข้าสู่ระบบก่อน' });
    let b = {};
    try { b = JSON.parse((await readRaw(req)).toString('utf8') || '{}'); } catch (_) {}
    const body = String(b.body || '').trim();
    if (!UUID.test(String(b.job_id || ''))) return send(res, 400, { error: 'รหัสงานไม่ถูกต้อง' });
    if (body.length < 1 || body.length > 2000) return send(res, 400, { error: 'ข้อความต้องยาว 1 ถึง 2,000 ตัวอักษร' });

    const admin = isAdmin(user);
    const jr = await supa('/rest/v1/jobs?select=id,title,user_id,status&id=eq.' + b.job_id);
    const job = jr.ok ? (await jr.json())[0] : null;
    if (!job || (!admin && job.user_id !== user.id)) return send(res, 404, { error: 'ไม่พบงาน' });

    if (!admin) {
      if (job.status === 'cancelled') return send(res, 409, { error: 'งานนี้ถูกยกเลิกแล้ว' });
      const c = await supa('/rest/v1/job_messages?select=id&job_id=eq.' + job.id, { headers: { Prefer: 'count=exact', Range: '0-0' } });
      if (Number((c.headers.get('content-range') || '').split('/')[1] || 0) >= 200) return send(res, 429, { error: 'มีข้อความในงานนี้มากเกินไป กรุณาติดต่อทาง Telegram' });
    }

    const ins = await supa('/rest/v1/job_messages', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ job_id: job.id, sender_id: user.id, sender_role: admin ? 'admin' : 'customer', body }) });
    if (!ins.ok) { console.error('insert message failed', ins.status, await ins.text()); return send(res, 500, { error: 'ส่งข้อความไม่สำเร็จ' }); }
    const msg = (await ins.json())[0];

    const preview = body.length > 120 ? body.slice(0, 120) + '…' : body;
    if (admin) {
      await notifyUser(job.user_id, 'job_message', 'ข้อความใหม่ในงาน: ' + job.title, preview, '/account.html#jobs');
    } else {
      await notifyAdmins('job_message', 'ลูกค้าตอบกลับ: ' + job.title, (user.email || '') + ': ' + preview, '/admin.html');
      await notify('💬 ลูกค้าตอบกลับงาน\nจาก: ' + (user.email || user.id) + '\nงาน: ' + job.title + '\n' + preview);
    }
    return send(res, 200, { id: msg.id });
  } catch (e) { console.error(e); return send(res, 500, { error: 'ระบบขัดข้อง กรุณาลองใหม่' }); }
};
