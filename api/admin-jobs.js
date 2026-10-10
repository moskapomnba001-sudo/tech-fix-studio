// POST /api/admin-jobs (เฉพาะแอดมิน)  { action: 'list' | 'status' | 'charge', ... }
const { readRaw, send, supa, requireAdmin, notifyUser } = require('./_lib');
const STATUSES = ['new', 'doing', 'done', 'cancelled'];
const LABEL = { new: 'รอตอบรับ', doing: 'กำลังทำ', done: 'เสร็จแล้ว', cancelled: 'ยกเลิก' };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    let b = {};
    try { b = JSON.parse((await readRaw(req)).toString('utf8') || '{}'); } catch (_) {}

    const VIEWS = { awaiting: 'awaiting_admin=is.true&status=neq.cancelled', doing: 'status=eq.doing', done: 'status=eq.done', cancelled: 'status=eq.cancelled', all: '' };
    const total = r => Number((r.headers.get('content-range') || '').split('/')[1] || 0);

    if (b.action === 'counts') {
      const keys = Object.keys(VIEWS);
      const rs = await Promise.all(keys.map(k => supa('/rest/v1/jobs?select=id' + (VIEWS[k] ? '&' + VIEWS[k] : ''), { headers: { Prefer: 'count=exact', Range: '0-0' } })));
      const counts = {}; keys.forEach((k, i) => { counts[k] = rs[i].ok ? total(rs[i]) : null; });
      return send(res, 200, { counts });
    }

    if (b.action === 'list') {
      const view = VIEWS[b.view] !== undefined ? b.view : 'awaiting';
      const offset = Math.max(0, Math.min(100000, parseInt(b.offset, 10) || 0));
      const q = String(b.q || '').replace(/[^\p{L}\p{M}\p{N}@._\- ]/gu, '').trim().slice(0, 60);
      let filter = VIEWS[view] ? '&' + VIEWS[view] : '';
      if (q) {
        // ค้นจากหัวข้อ/รายละเอียด และอีเมลสมาชิก
        const ur = await supa('/rest/v1/profiles?select=id&limit=50&email=ilike.' + encodeURIComponent('*' + q + '*'));
        const ids = ur.ok ? (await ur.json()).map(x => x.id) : [];
        const pat = encodeURIComponent('*' + q + '*');
        filter += '&or=(title.ilike.' + pat + ',details.ilike.' + pat + (ids.length ? ',user_id.in.(' + ids.join(',') + ')' : '') + ')';
      }
      const r = await supa('/rest/v1/jobs?select=id,title,details,link,contact,status,price_credits,charged,admin_note,awaiting_admin,created_at,updated_at,profiles(email,credits)' + filter + '&order=updated_at.desc&limit=20&offset=' + offset, { headers: { Prefer: 'count=exact' } });
      if (!r.ok) { console.error('list jobs failed', r.status, await r.text()); return send(res, 500, { error: 'โหลดรายการงานไม่สำเร็จ' }); }
      return send(res, 200, { jobs: await r.json(), total: total(r) });
    }
    if (!UUID.test(String(b.id || ''))) return send(res, 400, { error: 'รหัสงานไม่ถูกต้อง' });

    if (b.action === 'status') {
      if (!STATUSES.includes(b.status)) return send(res, 400, { error: 'สถานะไม่ถูกต้อง' });
      const note = String(b.note || '').slice(0, 500);
      const oldRes = await supa('/rest/v1/jobs?select=user_id,title,status,admin_note&id=eq.' + b.id);
      const old = oldRes.ok ? (await oldRes.json())[0] : null;
      if (!old) return send(res, 404, { error: 'ไม่พบงาน' });
      const r = await supa('/rest/v1/jobs?id=eq.' + b.id, { method: 'PATCH', body: JSON.stringify({ status: b.status, admin_note: note || null, awaiting_admin: false, updated_at: new Date().toISOString() }) });
      if (!r.ok) { console.error('update job failed', r.status, await r.text()); return send(res, 500, { error: 'บันทึกไม่สำเร็จ' }); }
      if (old.status !== b.status || (old.admin_note || '') !== note) {
        await notifyUser(old.user_id, 'job_update', 'อัปเดตงาน: ' + old.title, 'สถานะ: ' + LABEL[b.status] + (note ? ' · ' + note.slice(0, 120) : ''), '/account.html#jobs');
      }
      return send(res, 200, { ok: true });
    }

    if (b.action === 'messages') {
      const r = await supa('/rest/v1/job_messages?select=id,sender_role,body,created_at&order=created_at.asc&limit=200&job_id=eq.' + b.id);
      if (!r.ok) return send(res, 500, { error: 'โหลดข้อความไม่สำเร็จ' });
      return send(res, 200, { messages: await r.json() });
    }

    if (b.action === 'charge') {
      const credits = Number(b.credits);
      if (!Number.isInteger(credits) || credits < 1 || credits > 100000) return send(res, 400, { error: 'จำนวนเครดิตต้องเป็นจำนวนเต็ม 1 ถึง 100,000' });
      const r = await supa('/rest/v1/rpc/admin_charge_job', { method: 'POST', body: JSON.stringify({ p_job: b.id, p_credits: credits, p_admin: admin.id }) });
      const text = await r.text();
      if (!r.ok) {
        if (text.includes('insufficient credits')) return send(res, 409, { error: 'เครดิตของสมาชิกไม่พอ' });
        if (text.includes('already charged')) return send(res, 409, { error: 'งานนี้หักเครดิตไปแล้ว' });
        if (text.includes('job not found')) return send(res, 404, { error: 'ไม่พบงาน' });
        console.error('admin_charge_job failed', r.status, text);
        return send(res, 500, { error: 'หักเครดิตไม่สำเร็จ' });
      }
      return send(res, 200, { credits: Number(JSON.parse(text)) });
    }
    return send(res, 400, { error: 'action ไม่ถูกต้อง' });
  } catch (e) { console.error(e); return send(res, 500, { error: 'ระบบขัดข้อง' }); }
};
