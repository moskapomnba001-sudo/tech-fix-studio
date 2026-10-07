// POST /api/create-topup  { amount }  + Authorization: Bearer <supabase access token>
// สร้างรายการเติมเครดิต แล้วขอลิงก์ชำระเงินจาก Beam คืนเป็น { url }
const { AMOUNTS, env, readRaw, send, supa } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
  try {
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!token) return send(res, 401, { error: 'กรุณาเข้าสู่ระบบก่อน' });

    // 1) ยืนยันตัวตนผู้ใช้กับ Supabase
    const base = env('SUPABASE_URL').replace(/\/+$/, '');
    const u = await fetch(base + '/auth/v1/user', {
      headers: { apikey: env('SUPABASE_SERVICE_ROLE_KEY'), Authorization: 'Bearer ' + token },
    });
    if (!u.ok) return send(res, 401, { error: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่' });
    const user = await u.json();

    // 2) ตรวจยอดตามรายการที่อนุญาตเท่านั้น
    let body = {};
    try { body = JSON.parse((await readRaw(req)).toString('utf8') || '{}'); } catch (_) {}
    const amount = Number(body.amount);
    if (!AMOUNTS.includes(amount)) return send(res, 400, { error: 'ยอดเติมไม่ถูกต้อง' });

    // 3) บันทึกรายการ (pending)
    const ins = await supa('/rest/v1/topups', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ user_id: user.id, amount_baht: amount }),
    });
    if (!ins.ok) { console.error('insert topup failed', await ins.text()); return send(res, 500, { error: 'สร้างรายการไม่สำเร็จ' }); }
    const topup = (await ins.json())[0];

    // 4) ขอลิงก์ชำระเงินจาก Beam (จำนวนเงินเป็นสตางค์)
    const satang = amount * 100;
    const site = (process.env.SITE_URL || 'https://qplynnnzdebugshop.vercel.app').replace(/\/+$/, '');
    const beamBase = (process.env.BEAM_API_BASE || 'https://api.beamcheckout.com').replace(/\/+$/, '');
    const auth = Buffer.from(env('BEAM_MERCHANT_ID') + ':' + env('BEAM_API_KEY')).toString('base64');
    const r = await fetch(beamBase + '/api/v1/payment-links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Basic ' + auth },
      body: JSON.stringify({
        order: {
          currency: 'THB',
          description: 'เติมเครดิต Tech Fix Studio',
          netAmount: satang,
          referenceId: topup.id,
          orderItems: [{ itemName: 'เครดิต ' + amount, description: 'เติมเครดิต', price: satang, quantity: 1, sku: 'CREDIT', productId: 'credit-' + amount }],
        },
        linkSettings: { card: { isEnabled: false }, qrPromptPay: { isEnabled: true } },
        collectDeliveryAddress: false,
        redirectUrl: site + '/account.html?topup=done',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      }),
    });
    const text = await r.text();
    let link = {}; try { link = JSON.parse(text); } catch (_) {}
    if (!r.ok || !link.url) {
      console.error('beam create link failed', r.status, text);
      await supa('/rest/v1/topups?id=eq.' + topup.id, { method: 'PATCH', body: JSON.stringify({ status: 'failed' }) });
      return send(res, 502, { error: 'สร้างลิงก์ชำระเงินไม่สำเร็จ ลองใหม่อีกครั้งหรือทักทาง Telegram' });
    }
    await supa('/rest/v1/topups?id=eq.' + topup.id, { method: 'PATCH', body: JSON.stringify({ beam_link_id: link.id }) });
    return send(res, 200, { url: link.url });
  } catch (e) {
    console.error(e);
    return send(res, 500, { error: 'ระบบขัดข้อง กรุณาลองใหม่' });
  }
};
