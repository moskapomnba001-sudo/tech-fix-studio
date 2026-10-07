// POST /api/beam-webhook  (ตั้งใน Beam Lighthouse: event charge.succeeded)
const { env, readRaw, send, supa, verifySignature } = require('./_lib');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
  try {
    const raw = await readRaw(req); // ต้องใช้ body ดิบตามที่ส่งมาเป๊ะ ๆ
    if (!verifySignature(raw, req.headers['x-beam-signature'], env('BEAM_WEBHOOK_SECRET'))) {
      return send(res, 401, { error: 'invalid signature' });
    }
    const e = JSON.parse(raw.toString('utf8'));

    // สนใจเฉพาะ charge ที่สำเร็จ อย่างอื่นตอบ 200 แล้วข้าม
    if (!e.chargeId || e.status !== 'SUCCEEDED') return send(res, 200, { ignored: true });

    const baht = e.amount / 100; // amount จาก Beam เป็นสตางค์
    if (e.currency !== 'THB' || !Number.isInteger(baht) || !UUID.test(String(e.referenceId))) {
      console.error('unexpected charge payload', e.chargeId, e.referenceId, e.amount, e.currency);
      return send(res, 200, { ignored: true });
    }

    const r = await supa('/rest/v1/rpc/complete_topup', {
      method: 'POST',
      body: JSON.stringify({ p_id: e.referenceId, p_charge: e.chargeId, p_baht: baht }),
    });
    if (!r.ok) { console.error('complete_topup failed', r.status, await r.text()); return send(res, 500, { error: 'retry' }); } // ให้ Beam ส่งซ้ำ
    const credited = await r.json();
    if (!credited) console.error('not credited (already paid, unknown ref, or amount mismatch)', e.chargeId, e.referenceId, baht);
    return send(res, 200, { ok: true, credited });
  } catch (err) {
    console.error(err);
    return send(res, 500, { error: 'retry' });
  }
};
module.exports.config = { api: { bodyParser: false } };
