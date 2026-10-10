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
    { k: 'login', t: 'เข้าสู่ระบบ / สมัครสมาชิก', u: '/account.html' },
    { k: 'order', t: 'สั่งงานใหม่ / ดูงานของฉัน', u: '/account.html#jobs' },
    { k: 'topup', t: 'เติมเครดิต', u: '/account.html#topup' },
    { k: 'history', t: 'ประวัติเครดิต', u: '/account.html#history' },
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
    input.setAttribute('aria-label', 'พิมพ์คำสั่ง'); input.placeholder = 'พิมพ์คำสั่ง หรือเลือกจากรายการ';
    row.append(el('span', null, '$'), input);
    list = el('ul'); list.setAttribute('role', 'listbox');
    box.append(row, list, el('div', 'pal-hint', '↑↓ เลือก · Enter หรือคลิกเพื่อเปิด · Esc ปิด'));
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
    var all = d.querySelector('[data-admin]') ? CMDS.concat([{ k: 'admin', t: 'หน้าแอดมิน', u: '/admin.html' }]) : CMDS;
    shown = all.filter(function (c) { return !q || c.k.indexOf(q) > -1 || c.t.toLowerCase().indexOf(q) > -1; });
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
  var mac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');
  Array.prototype.forEach.call(d.querySelectorAll('[data-kbd]'), function (k) { k.textContent = mac ? '⌘K' : 'Ctrl K'; });
  Array.prototype.forEach.call(d.querySelectorAll('[data-open-palette]'), function (b) { b.addEventListener('click', openPal); });
  var navEl = d.getElementById('site-nav');
  if (navEl) {
    var nb = el('button', 'pal-in-nav', '>_ คำสั่งลัด'); nb.type = 'button';
    nb.addEventListener('click', function () { closeMenu(); openPal(); }); navEl.insertBefore(nb, navEl.firstChild);
  }
  var fw = d.querySelector('footer .wrap');
  if (fw) {
    var b = el('button', 'pal-open', 'เปิดคำสั่งลัด ( ` / Ctrl+K )'); b.type = 'button';
    b.addEventListener('click', openPal); fw.append(b);
  }
})();

/* ===== กระดิ่งแจ้งเตือน + ลิงก์แอดมิน (แสดงเฉพาะตอนล็อกอิน) ===== */
(function () {
  var d = document, CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  var has = false;
  try { has = Object.keys(localStorage).some(function (k) { return /^sb-.+-auth-token$/.test(k); }); } catch (e) {}
  var login = d.getElementById('hdr-login'), hd = d.querySelector('header');
  if (!has || !login || !hd) return;

  function el(tag, cls, txt) { var e = d.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function loadScript(src) { return new Promise(function (ok, no) { var s = d.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; d.head.appendChild(s); }); }
  function ago(t) {
    var s = (Date.now() - new Date(t).getTime()) / 1000;
    if (s < 60) return 'เมื่อสักครู่';
    if (s < 3600) return Math.floor(s / 60) + ' นาทีที่แล้ว';
    if (s < 86400) return Math.floor(s / 3600) + ' ชั่วโมงที่แล้ว';
    return new Date(t).toLocaleDateString('th-TH');
  }
  var sb = null, uid = null, bell, btn, badge, panel, listEl;

  function build() {
    bell = el('div', 'bell');
    btn = el('button', 'bell-btn'); btn.type = 'button';
    btn.setAttribute('aria-label', 'การแจ้งเตือน'); btn.setAttribute('aria-haspopup', 'true'); btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>';
    badge = el('span', 'bell-badge'); badge.hidden = true; btn.appendChild(badge);
    panel = el('div', 'bell-panel'); panel.hidden = true; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'การแจ้งเตือน');
    var head = el('div', 'bell-head'), all = el('button', null, 'อ่านทั้งหมด'); all.type = 'button'; all.onclick = markAll;
    head.append(el('b', null, 'การแจ้งเตือน'), all);
    listEl = el('ul'); panel.append(head, listEl); bell.append(btn, panel);
    var wrap = el('div', 'hd-right'); login.parentNode.insertBefore(wrap, login); wrap.append(bell, login);
    hd.classList.add('has-bell');
    btn.onclick = function (e) { e.stopPropagation(); toggle(); };
    d.addEventListener('click', function (e) { if (!panel.hidden && !bell.contains(e.target)) toggle(false); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) toggle(false); });
  }
  function toggle(o) {
    var open = typeof o === 'boolean' ? o : panel.hidden;
    panel.hidden = !open; btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) refresh();
  }
  async function refresh() {
    try {
      var r = await sb.from('notifications').select('id,kind,title,body,link,is_read,created_at').order('created_at', { ascending: false }).limit(20);
      if (!r.error) render(r.data || []);
    } catch (e) {}
  }
  function render(items) {
    var n = items.filter(function (i) { return !i.is_read; }).length;
    badge.hidden = !n; badge.textContent = n >= 20 ? '20+' : String(n);
    btn.setAttribute('aria-label', 'การแจ้งเตือน' + (n ? ' ยังไม่ได้อ่าน ' + n + ' รายการ' : ''));
    listEl.textContent = '';
    if (!items.length) { listEl.append(el('li', 'bell-empty', 'ยังไม่มีการแจ้งเตือน')); return; }
    items.forEach(function (i) {
      var li = el('li', 'bell-item nk-' + i.kind + (i.is_read ? '' : ' unread'));
      li.tabIndex = 0; li.setAttribute('role', 'button');
      li.append(el('div', 't', i.title));
      if (i.body) li.append(el('div', 'b', i.body));
      li.append(el('div', 'ts', ago(i.created_at)));
      li.onclick = function () { openItem(i); };
      li.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openItem(i); } };
      listEl.append(li);
    });
  }
  async function openItem(i) {
    try { if (!i.is_read) await sb.from('notifications').update({ is_read: true }).eq('id', i.id); } catch (e) {}
    toggle(false);
    if (typeof i.link === 'string' && /^\/(?!\/)/.test(i.link)) location.assign(i.link); else refresh();
  }
  async function markAll() {
    try { await sb.from('notifications').update({ is_read: true }).eq('is_read', false); } catch (e) {}
    refresh();
  }
  async function checkAdmin() {
    var key = 'adm:' + uid, c = null, ok;
    try { c = JSON.parse(sessionStorage.getItem(key) || 'null'); } catch (e) {}
    if (c && Date.now() - c.t < 600000) ok = c.v;
    else {
      try {
        var s = (await sb.auth.getSession()).data.session;
        var r = await fetch('/api/admin-credit', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + s.access_token }, body: '{"action":"check"}' });
        ok = r.ok; try { sessionStorage.setItem(key, JSON.stringify({ v: ok, t: Date.now() })); } catch (e) {}
      } catch (e) { return; }
    }
    var nv = d.getElementById('site-nav');
    if (ok && nv && !nv.querySelector('[data-admin]')) { var a = el('a', null, 'แอดมิน'); a.href = '/admin.html'; a.setAttribute('data-admin', '1'); nv.append(a); }
  }
  (async function () {
    try {
      if (window.__sb) sb = window.__sb;
      else {
        if (!window.supabase) await loadScript(CDN);
        if (!window.SITE_CONFIG) await loadScript('/config.js');
        var c = window.SITE_CONFIG || {};
        if (!c.url || !c.anonKey || /YOUR/.test(c.url + c.anonKey)) return;
        sb = window.__sb = window.supabase.createClient(c.url, c.anonKey);
      }
      var s = (await sb.auth.getSession()).data.session; if (!s) return;
      uid = s.user.id; build(); refresh(); checkAdmin();
      setInterval(function () { if (!d.hidden) refresh(); }, 60000);
      d.addEventListener('visibilitychange', function () { if (!d.hidden) refresh(); });
    } catch (e) {}
  })();
})();

/* ===== จอบูตสไตล์เทอร์มินัล (หน้าแรก, ครั้งเดียวต่อเซสชัน, ข้ามได้) ===== */
(function () {
  var root = document.documentElement, d = document;
  if (!root.classList.contains('booting')) return;
  var o = d.createElement('div'); o.className = 'boot'; o.setAttribute('role', 'presentation');
  o.innerHTML = '<div class="boot-box"><pre class="boot-log" aria-hidden="true"></pre><div class="boot-bar" aria-hidden="true"><i></i></div><button type="button" class="boot-skip">ข้าม ›</button></div>';
  d.body.appendChild(o);
  var log = o.querySelector('.boot-log'), bar = o.querySelector('i'), skip = o.querySelector('.boot-skip');
  var lines = ['> booting tech-fix-studio ...', '> loading services ........ ok', '> connecting telegram ..... ok', '> ready.'];
  var i = 0, done = false;
  var t = setInterval(function () {
    if (i < lines.length) { log.textContent += (i ? '\n' : '') + lines[i]; i++; } else finish();
  }, 260);
  requestAnimationFrame(function () { requestAnimationFrame(function () { bar.style.width = '100%'; }); });
  function finish() {
    if (done) return; done = true; clearInterval(t);
    try { sessionStorage.setItem('booted', '1'); } catch (e) {}
    root.classList.remove('booting'); o.classList.add('out');
    setTimeout(function () { if (o.parentNode) o.parentNode.removeChild(o); }, 400);
  }
  skip.addEventListener('click', finish);
  d.addEventListener('keydown', function (e) { if (!done && (e.key === 'Escape' || e.key === 'Enter')) finish(); });
})();

/* ===== ป้ายหัวเรื่องที่พิมพ์สลับคำ (อ่านผ่านโปรแกรมอ่านหน้าจอเป็นข้อความคงที่) ===== */
(function () {
  var d = document, e = d.querySelector('[data-rotate]');
  if (!e || (window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches)) return;
  var items = e.getAttribute('data-rotate').split('|'), seg = window.Intl && Intl.Segmenter ? new Intl.Segmenter('th', { granularity: 'grapheme' }) : null;
  function g(s) { return seg ? Array.from(seg.segment(s), function (x) { return x.segment; }) : Array.from(s); }
  var sr = d.createElement('span'); sr.className = 'sr-only'; sr.textContent = e.textContent;
  var vis = d.createElement('span'); vis.setAttribute('aria-hidden', 'true'); vis.className = 'tvis';
  e.textContent = ''; e.append(sr, vis);
  var k = 0;
  function type(chars, n) {
    vis.textContent = '// ' + chars.slice(0, n).join('');
    if (n < chars.length) setTimeout(function () { type(chars, n + 1); }, 70);
    else setTimeout(function () { erase(chars, n); }, 1600);
  }
  function erase(chars, n) {
    vis.textContent = '// ' + chars.slice(0, n).join('');
    if (n > 0) setTimeout(function () { erase(chars, n - 1); }, 35);
    else { k = (k + 1) % items.length; setTimeout(function () { type(g(items[k]), 0); }, 250); }
  }
  type(g(items[0]), 0);
})();
