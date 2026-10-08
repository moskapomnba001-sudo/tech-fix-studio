(function () {
  var d = document;
  /* ป้ายปุ่มมุมขวาบนเมื่อล็อกอินค้างอยู่ */
  try {
    if (Object.keys(localStorage).some(function (k) { return /^sb-.+-auth-token$/.test(k); })) {
      var lb = d.getElementById('hdr-login'); if (lb) lb.textContent = 'บัญชีของฉัน';
    }
  } catch (e) {}

  /* เมนูมือถือ (แฮมเบอร์เกอร์) */
  var hd = d.querySelector('header'), mb = d.getElementById('menu-btn'), nav = d.getElementById('site-nav');
  function closeMenu() { if (hd) hd.classList.remove('open'); if (mb) mb.setAttribute('aria-expanded', 'false'); }
  if (hd && mb && nav) {
    mb.addEventListener('click', function () {
      var o = hd.classList.toggle('open'); mb.setAttribute('aria-expanded', o ? 'true' : 'false');
    });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) closeMenu(); });
  }

  /* คำสั่งลัดแบบเทอร์มินัล: กด ` หรือ Ctrl/Cmd+K */
  var CMDS = [
    { k: 'home', t: 'หน้าแรก', u: '/' },
    { k: 'services', t: 'บริการทั้งหมด', u: '/#services' },
    { k: 'pricing', t: 'คำนวณค่าบริการ', u: '/pricing.html' },
    { k: 'faq', t: 'คำถามที่พบบ่อย', u: '/#faq' },
    { k: 'login', t: 'เข้าสู่ระบบ / สมัครสมาชิก / เติมเครดิต', u: '/account.html' },
    { k: 'contact', t: 'ช่องทางติดต่อ', u: '/#contact' },
    { k: 'telegram', t: 'เปิด Telegram @qplynnnz', u: 'https://t.me/qplynnnz', ext: true },
    { k: 'call', t: 'โทร +6661126882', u: 'tel:+6661126882' }
  ];
  var pal, input, list, shown = [], sel = 0, prev = null;
  function el(tag, cls, txt) { var e = d.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function build() {
    pal = el('div', 'pal'); pal.hidden = true; pal.setAttribute('role', 'dialog'); pal.setAttribute('aria-modal', 'true'); pal.setAttribute('aria-label', 'คำสั่งลัด');
    var box = el('div', 'pal-box'), row = el('div', 'pal-in');
    input = el('input'); input.type = 'text'; input.autocomplete = 'off'; input.spellcheck = false;
    input.setAttribute('aria-label', 'พิมพ์คำสั่ง'); input.placeholder = 'พิมพ์คำสั่ง เช่น pricing, login, contact';
    row.append(el('span', null, '$'), input);
    list = el('ul'); list.setAttribute('role', 'listbox');
    box.append(row, list, el('div', 'pal-hint', '↑↓ เลือก · Enter เปิด · Esc ปิด'));
    pal.append(box); d.body.append(pal);
    pal.addEventListener('mousedown', function (e) { if (e.target === pal) closePal(); });
    input.addEventListener('input', function () { render(input.value); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
      else if (e.key === 'Enter') { e.preventDefault(); run(shown[sel]); }
    });
  }
  function render(q) {
    q = (q || '').trim().toLowerCase();
    shown = CMDS.filter(function (c) { return !q || c.k.indexOf(q) > -1 || c.t.toLowerCase().indexOf(q) > -1; });
    sel = 0; list.textContent = '';
    if (!shown.length) { list.append(el('li', null, 'ไม่พบคำสั่ง')); return; }
    shown.forEach(function (c, i) {
      var li = el('li'); li.setAttribute('role', 'option'); li.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
      li.append(el('b', null, c.k), el('span', null, c.t));
      li.addEventListener('mousedown', function (e) { e.preventDefault(); run(c); });
      list.append(li);
    });
  }
  function move(n) {
    if (!shown.length) return;
    sel = (sel + n + shown.length) % shown.length;
    Array.prototype.forEach.call(list.children, function (li, i) { li.setAttribute('aria-selected', i === sel ? 'true' : 'false'); });
  }
  function run(c) {
    if (!c) return; closePal();
    if (c.ext) window.open(c.u, '_blank', 'noopener'); else location.assign(c.u);
  }
  function openPal() {
    if (!pal) build();
    prev = d.activeElement; pal.hidden = false; input.value = ''; render(''); input.focus();
  }
  function closePal() { if (pal) pal.hidden = true; if (prev && prev.focus) prev.focus(); }
  d.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { if (pal && !pal.hidden) closePal(); closeMenu(); return; }
    var t = e.target, typing = t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable);
    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); if (pal && !pal.hidden) closePal(); else openPal(); return; }
    if (e.key === '`' && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); openPal(); }
  });
  var fw = d.querySelector('footer .wrap');
  if (fw) {
    var b = el('button', 'pal-open', 'เปิดคำสั่งลัด ( ` / Ctrl+K )'); b.type = 'button';
    b.addEventListener('click', openPal); fw.append(b);
  }
})();
