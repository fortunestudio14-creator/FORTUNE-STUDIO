/* Fortune Studio - Black Friday: countdown banner + automatic 10% sale.
   Default: starts Nov 27 2026 at 12:00 AM Scranton time, everything returns to normal on Nov 30 2026 at 12:00 AM.
   Change or turn it off in /admin > "Black Friday sale". The real price is always decided by the server (api/_lib.js). */
(function () {
  var TZ = 'America/New_York', DEF = { on: true, pct: 10, start: '2026-11-27', end: '2026-11-30' };
  var inView = true, YMD = /^\d{4}-\d{2}-\d{2}$/, F = window.FS_BF = {}, skew = 0, last = '', root = null, els = {};

  function tzOffset(ms) {
    var o = {};
    new Intl.DateTimeFormat('en-US', { timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' })
      .formatToParts(new Date(ms)).forEach(function (x) { o[x.type] = +x.value; });
    return (Date.UTC(o.year, o.month - 1, o.day, o.hour, o.minute, o.second) - ms) / 60000;
  }
  function etMidnight(ymd) {
    var a = ymd.split('-').map(Number), g = Date.UTC(a[0], a[1] - 1, a[2], 5, 0, 0);
    for (var i = 0; i < 3; i++) g = Date.UTC(a[0], a[1] - 1, a[2], 0, 0, 0) - tzOffset(g) * 60000;
    return g;
  }
  function cfg() {
    var c = (window.FS_CMS && window.FS_CMS.content && window.FS_CMS.content.bf) || {}, p = parseFloat(c.pct);
    return { on: c.on !== false, al: c.alert !== false, pct: isFinite(p) && p > 0 && p <= 90 ? p : DEF.pct, start: YMD.test(c.start || '') ? c.start : DEF.start, end: YMD.test(c.end || '') ? c.end : DEF.end };
  }
  function info() {
    var c = cfg(), s = etMidnight(c.start), e = etMidnight(c.end), n = Date.now() + skew;
    var st = !c.on || e <= s ? 'off' : n < s ? 'before' : n < e ? 'live' : 'ended';
    return { st: st, pct: c.pct, s: s, e: e, n: n, c: c };
  }
  F.state = function () { return info().st; };
  F.factor = function () { var i = info(); return i.st === 'live' ? 1 - i.pct / 100 : 1; };

  var LNG = {
    en: { before: 'Starts in', live: 'Sale ends in', badge: 'LIVE NOW', soon: 'COMING SOON', eyebrow: 'Black Friday', title: 'Black Friday', subB: 'Everything on the site gets {p}% off. Applied automatically, no code needed.', subL: '{p}% off every price on the site, applied automatically at checkout.', cta: 'Book now and save {p}%', d: 'Days', h: 'Hours', m: 'Min', s: 'Sec', note: 'Black Friday: {p}% off applied to all prices', prog: 'Sale progress', tb: 'Tables', ch: 'Chairs', p1: 'Party package', p2: 'Celebration package', save: 'You save {a}', t1: 'Automatic discount, no code', t2: 'Card, Apple Pay, Google Pay', t3: 'Delivery available in Scranton', pill: 'Black Friday −{p}%', pillB: 'Black Friday in' },
    es: { before: 'Empieza en', live: 'La oferta termina en', badge: 'EN VIVO', soon: 'PRÓXIMAMENTE', eyebrow: 'Black Friday', title: 'Black Friday', subB: 'Todo el sitio con {p}% de descuento. Se aplica automáticamente, sin código.', subL: '{p}% de descuento en todos los precios, aplicado automáticamente al pagar.', cta: 'Reserva ahora y ahorra {p}%', d: 'Días', h: 'Horas', m: 'Min', s: 'Seg', note: 'Black Friday: {p}% de descuento aplicado a todos los precios', prog: 'Progreso de la oferta', tb: 'Mesas', ch: 'Sillas', p1: 'Paquete fiesta', p2: 'Paquete celebración', save: 'Ahorras {a}', t1: 'Descuento automático, sin código', t2: 'Tarjeta, Apple Pay, Google Pay', t3: 'Entrega disponible en Scranton', pill: 'Black Friday −{p}%', pillB: 'Black Friday en' },
    fr: { before: 'Commence dans', live: 'L’offre se termine dans', badge: 'EN COURS', soon: 'BIENTÔT', eyebrow: 'Black Friday', title: 'Black Friday', subB: 'Tout le site à -{p} %. Appliqué automatiquement, sans code.', subL: '-{p} % sur tous les prix du site, appliqué automatiquement au paiement.', cta: 'Réservez et économisez {p} %', d: 'Jours', h: 'Heures', m: 'Min', s: 'Sec', note: 'Black Friday : -{p} % appliqué à tous les prix', prog: 'Progression de l’offre', tb: 'Tables', ch: 'Chaises', p1: 'Forfait fête', p2: 'Forfait célébration', save: 'Vous économisez {a}', t1: 'Remise automatique, sans code', t2: 'Carte, Apple Pay, Google Pay', t3: 'Livraison à Scranton', pill: 'Black Friday −{p} %', pillB: 'Black Friday dans' }
  };
  function lg() { var l; try { l = typeof L !== 'undefined' ? L : 'en'; } catch (e) { l = 'en'; } return LNG[l] || LNG.en; }
  function lcode() { try { return typeof L !== 'undefined' && LNG[L] ? L : 'en'; } catch (e) { return 'en'; } }
  function dr(i) { // "Nov 27 - 29" in Scranton time
    var loc = { en: 'en-US', es: 'es-US', fr: 'fr-FR' }[lcode()], o = { month: 'short', day: 'numeric', timeZone: TZ };
    var a = new Date(i.s), b = new Date(i.e - 1000), mo = function (d) { return d.toLocaleDateString('en-US', { month: 'numeric', timeZone: TZ }); };
    return a.toLocaleDateString(loc, o) + ' – ' + b.toLocaleDateString(loc, { day: 'numeric', month: mo(a) === mo(b) ? undefined : 'short', timeZone: TZ });
  }

  var ALERT_CSS = '#bf{display:none!important}' +
    '#bfa{position:fixed;inset:0;z-index:9000;display:grid;place-items:center;padding:18px;background:rgba(5,5,5,.6);backdrop-filter:blur(6px);opacity:0;transition:opacity .35s ease}#bfa[hidden]{display:none}#bfa.on{opacity:1}' +
    '.bfa-card{position:relative;width:min(440px,100%);overflow:hidden;text-align:center;padding:34px 26px 26px;border-radius:26px;border:1px solid rgba(232,185,159,.4);box-shadow:0 30px 90px rgba(0,0,0,.7),inset 0 1px 0 rgba(255,255,255,.07);' +
    'background:radial-gradient(120% 90% at 50% 0%,rgba(232,185,159,.2),transparent 60%),linear-gradient(150deg,#1a1410,#0d0d0d 70%);transform:translateY(22px) scale(.97);transition:transform .5s cubic-bezier(.2,.8,.2,1)}#bfa.on .bfa-card{transform:none}' +
    '.bfa-x{position:absolute;top:12px;right:12px;width:36px;height:36px;border-radius:50%;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);color:var(--tx);font:400 18px/1 Outfit,system-ui,sans-serif;cursor:pointer;padding:0;display:grid;place-items:center}.bfa-x:hover{background:var(--ac);color:#17110d}' +
    '.bfa-eye{display:inline-flex;align-items:center;gap:9px;font:500 .72rem Outfit,system-ui,sans-serif;letter-spacing:.24em;text-transform:uppercase;color:var(--ac)}' +
    '.bfa-t{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:6px 16px;margin:12px 0 4px;padding:0}.bfa-t span{font:400 clamp(2.6rem,12vw,3.6rem)/1 Yellowtail,cursive;background:linear-gradient(180deg,#fff7ea,#e8b99f 70%,#b98a70);-webkit-background-clip:text;background-clip:text;color:transparent}' +
    '.bfa-t b{display:grid;place-items:center;width:74px;aspect-ratio:1;border-radius:50%;transform:rotate(-8deg);background:conic-gradient(from 210deg,#f3cdb8,#e8b99f,#b98a70,#f3cdb8);color:#1a1210;font:600 1.5rem/1 Outfit,system-ui,sans-serif;box-shadow:0 10px 30px rgba(232,185,159,.28)}' +
    '.bfa-sub{margin:8px auto 16px;max-width:30rem;color:var(--mu);font:300 1.02rem/1.5 Outfit,system-ui,sans-serif}' +
    '.bfa-cd{display:inline-flex;flex-direction:column;gap:4px;margin:0 0 18px;padding:10px 22px;border-radius:16px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1)}.bfa-cd span{font:500 .68rem Outfit,system-ui,sans-serif;letter-spacing:.2em;text-transform:uppercase;color:var(--mu)}.bfa-cd b{font:600 1.8rem/1.1 Outfit,system-ui,sans-serif;font-variant-numeric:tabular-nums;color:var(--tx)}' +
    '.bfa-cta{display:flex;justify-content:center;background:var(--ac);color:#17110d!important;font-weight:600}.bfa-fine{display:block;margin-top:12px;color:var(--mu);font:400 .78rem Outfit,system-ui,sans-serif}' +
    '#bfpill{opacity:.26;padding:6px 11px 6px 9px;font-size:.7rem;gap:7px;background:rgba(18,14,11,.7);cursor:pointer;transition:opacity .25s ease;-webkit-appearance:none;appearance:none}#bfpill:hover,#bfpill:focus-visible,#bfpill:active{opacity:1}#bfpill i{width:7px;height:7px}' +
    '@media(max-width:480px){.bfa-card{padding:30px 18px 22px}#bfa{place-items:end center;padding:12px}}@media(prefers-reduced-motion:reduce){#bfa,.bfa-card,#bfpill{transition:none}}';
  var CSS = '#bf{position:relative;z-index:2;max-width:1180px;margin:0 auto;padding:clamp(18px,3vw,34px) 20px 0}' +
    '#bf[hidden]{display:none}' +
    '.bf-card{position:relative;overflow:hidden;border-radius:28px;padding:clamp(24px,4.2vw,46px);display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);gap:clamp(22px,4vw,48px);align-items:center;' +
    'background:radial-gradient(120% 140% at 0% 0%,rgba(232,185,159,.20),transparent 58%),radial-gradient(90% 120% at 100% 100%,rgba(232,185,159,.10),transparent 60%),linear-gradient(140deg,#1a1410,#0d0d0d 62%);' +
    'border:1px solid rgba(232,185,159,.38);box-shadow:0 30px 80px rgba(0,0,0,.65),inset 0 1px 0 rgba(255,255,255,.07)}' +
    '.bf-card:before{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(105deg,transparent 38%,rgba(255,255,255,.075) 50%,transparent 62%);transform:translateX(-120%);animation:bfsheen 7s ease-in-out infinite}' +
    '.bf-card:after{content:"";position:absolute;inset:10px;border-radius:20px;border:1px solid rgba(232,185,159,.12);pointer-events:none}' +
    '@keyframes bfsheen{0%,55%{transform:translateX(-120%)}100%{transform:translateX(120%)}}' +
    '.bf-l,.bf-r{position:relative;z-index:1;min-width:0}' +
    '.bf-eye{display:inline-flex;align-items:center;gap:10px;font:500 .74rem Outfit,system-ui,sans-serif;letter-spacing:.24em;text-transform:uppercase;color:var(--ac)}' +
    '.bf-dot{width:9px;height:9px;border-radius:50%;background:#ff4d4d;box-shadow:0 0 0 0 rgba(255,77,77,.6);animation:bfpulse 1.6s infinite}' +
    '.bf-card[data-s=before] .bf-dot{background:var(--ac);box-shadow:none;animation:none}' +
    '@keyframes bfpulse{70%{box-shadow:0 0 0 10px rgba(255,77,77,0)}100%{box-shadow:0 0 0 0 rgba(255,77,77,0)}}' +
    '.bf-t{display:flex;align-items:center;flex-wrap:wrap;gap:6px 18px;margin:10px 0 6px}' +
    '.bf-t h2{margin:0;padding:0;font:400 clamp(3rem,9vw,5.6rem)/1 Yellowtail,cursive;background:linear-gradient(180deg,#fff7ea,#e8b99f 70%,#b98a70);-webkit-background-clip:text;background-clip:text;color:transparent;animation:none}' +
    '.bf-pct{display:grid;place-items:center;width:clamp(74px,12vw,98px);aspect-ratio:1;border-radius:50%;transform:rotate(-8deg);background:conic-gradient(from 210deg,#f3cdb8,#e8b99f,#b98a70,#f3cdb8);color:#1a1210;font:600 clamp(1.5rem,4.4vw,2.1rem)/1 Outfit,system-ui,sans-serif;box-shadow:0 10px 30px rgba(232,185,159,.28),inset 0 0 0 3px rgba(255,255,255,.22)}' +
    '.bf-sub{margin:6px 0 20px;max-width:34rem;color:var(--mu);font:300 clamp(1rem,2.2vw,1.12rem)/1.55 Outfit,system-ui,sans-serif}' +
    '.bf-sub b{color:var(--tx);font-weight:500}' +
    '.bf-cta{display:inline-flex;align-items:center;gap:10px;background:var(--ac);color:#17110d !important;font-weight:600}' +
    '.bf-lab{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;font:500 .78rem Outfit,system-ui,sans-serif;letter-spacing:.2em;text-transform:uppercase;color:var(--mu)}' +
    '.bf-badge{padding:5px 12px;border-radius:99px;font-size:.7rem;letter-spacing:.18em;border:1px solid rgba(255,77,77,.5);color:#ffb3b3;background:rgba(255,77,77,.12)}' +
    '.bf-card[data-s=before] .bf-badge{border-color:rgba(232,185,159,.4);color:var(--ac);background:rgba(232,185,159,.1)}' +
    '.bf-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:clamp(8px,1.6vw,14px)}' +
    '.bf-u{position:relative;text-align:center;padding:clamp(14px,2.4vw,22px) 4px clamp(10px,1.8vw,16px);border-radius:18px;background:linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.02));border:1px solid rgba(255,255,255,.1);box-shadow:inset 0 1px 0 rgba(255,255,255,.08),0 10px 24px rgba(0,0,0,.35);overflow:hidden}' +
    '.bf-u:after{content:"";position:absolute;left:0;right:0;top:50%;height:1px;background:rgba(0,0,0,.45)}' +
    '.bf-n{display:block;font:600 clamp(1.9rem,6vw,3.3rem)/1 Outfit,system-ui,sans-serif;font-variant-numeric:tabular-nums;letter-spacing:.02em;color:var(--tx)}' +
    '.bf-n.tick{animation:bftick .45s cubic-bezier(.2,.8,.2,1)}' +
    '@keyframes bftick{0%{transform:translateY(-35%);opacity:0}100%{transform:none;opacity:1}}' +
    '.bf-k{display:block;margin-top:8px;font:500 clamp(.58rem,1.5vw,.72rem) Outfit,system-ui,sans-serif;letter-spacing:.18em;text-transform:uppercase;color:var(--mu)}' +
    '.bf-bar{margin-top:16px;height:5px;border-radius:9px;background:rgba(255,255,255,.08);overflow:hidden}' +
    '.bf-bar i{display:block;height:100%;width:0;border-radius:9px;background:linear-gradient(90deg,#b98a70,#f3cdb8);transition:width 1s linear}' +
    '.bf-card[data-s=before] .bf-bar{display:none}' +
    '.bf-date{margin-top:14px;font:400 .86rem Outfit,system-ui,sans-serif;color:var(--mu);text-align:center;letter-spacing:.04em}' +
    '.bf-was{font:400 .46em Outfit,system-ui,sans-serif;color:var(--mu);text-decoration:line-through;text-decoration-thickness:1.5px;margin-right:.35em;opacity:.85}' +
    '.bf-note{margin:10px 0 0;padding:9px 14px;border-radius:12px;font:500 .86rem Outfit,system-ui,sans-serif;color:var(--ac);background:rgba(232,185,159,.1);border:1px solid rgba(232,185,159,.3)}' +
    '.bf-chips{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 18px}.bf-chip{display:inline-flex;align-items:baseline;gap:7px;padding:8px 13px;border-radius:99px;background:rgba(255,255,255,.05);border:1px solid rgba(232,185,159,.22);font:400 .82rem Outfit,system-ui,sans-serif;color:var(--mu)}.bf-chip s{opacity:.7}.bf-chip b{color:var(--tx);font-weight:600;font-size:.95rem}' +
    '.bf-trust{display:flex;flex-wrap:wrap;gap:8px 20px;margin:20px 0 0;padding:0;list-style:none;font:400 .8rem Outfit,system-ui,sans-serif;color:var(--mu)}.bf-trust li:before{content:"✓";color:var(--ac);margin-right:7px;font-weight:700}' +
    '.bf-ribbon{position:absolute;top:18px;right:-44px;transform:rotate(35deg);padding:5px 52px;background:linear-gradient(90deg,#b98a70,#f3cdb8,#b98a70);color:#1a1210;font:600 .64rem Outfit,system-ui,sans-serif;letter-spacing:.2em;text-transform:uppercase;z-index:2;box-shadow:0 6px 16px rgba(0,0,0,.4)}' +
    '#bfpill{position:fixed;left:max(14px,env(safe-area-inset-left));bottom:max(14px,env(safe-area-inset-bottom));z-index:60;display:none;align-items:center;gap:10px;padding:10px 16px 10px 12px;border-radius:99px;background:rgba(18,14,11,.94);backdrop-filter:blur(10px);border:1px solid rgba(232,185,159,.5);box-shadow:0 12px 34px rgba(0,0,0,.55);color:var(--tx);text-decoration:none;font:500 .82rem Outfit,system-ui,sans-serif;cursor:pointer}#bfpill.on{display:inline-flex;animation:bfin .5s cubic-bezier(.2,.8,.2,1)}#bfpill i{width:9px;height:9px;border-radius:50%;background:var(--ac)}#bfpill[data-s=live] i{background:#ff4d4d;animation:bfpulse 1.6s infinite}#bfpill b{color:var(--ac);font-variant-numeric:tabular-nums;font-weight:600}@keyframes bfin{from{transform:translateY(20px);opacity:0}}' +
    '.bf-note b{color:var(--tx)}' +
    '@media(max-width:820px){.bf-card{grid-template-columns:1fr;text-align:center}.bf-t{justify-content:center}.bf-sub{margin-left:auto;margin-right:auto}.bf-eye{justify-content:center}.bf-lab{justify-content:center;flex-wrap:wrap}}' +
    '@media(max-width:820px){.bf-chips,.bf-trust{justify-content:center}}@media(max-width:480px){#bfpill{font-size:.76rem;padding:9px 13px 9px 11px}}@media(prefers-reduced-motion:reduce){.bf-card:before,.bf-dot,.bf-n.tick,#bfpill{animation:none}.bf-bar i{transition:none}}' + ALERT_CSS;

  function build() {
    if (root) return true;
    var anchor = document.querySelector('.mq') || document.querySelector('header.hero');
    if (!anchor || !anchor.parentNode) return false;
    var st = document.createElement('style'); st.id = 'bf-css'; st.textContent = CSS; document.head.appendChild(st);
    root = document.createElement('div'); root.id = 'bf'; root.hidden = true; root.setAttribute('role', 'region');
    root.innerHTML = '<div class="bf-card" data-s="before"><span class="bf-ribbon" data-k="soon2"></span>' +
      '<div class="bf-l"><span class="bf-eye"><i class="bf-dot"></i><span data-k="eyebrow"></span><span data-k="range"></span></span>' +
      '<div class="bf-t"><h2 data-k="title"></h2><div class="bf-pct"><span data-k="pct"></span></div></div>' +
      '<p class="bf-sub" data-k="sub"></p><div class="bf-chips" data-k="chips"></div><a class="btn bf-cta" href="#book" data-k="cta"></a><ul class="bf-trust"><li data-k="t1"></li><li data-k="t2"></li><li data-k="t3"></li></ul></div>' +
      '<div class="bf-r"><div class="bf-lab"><span data-k="lab"></span><span class="bf-badge" data-k="badge"></span></div>' +
      '<div class="bf-grid" aria-hidden="true">' + ['d', 'h', 'm', 's'].map(function (u) { return '<div class="bf-u"><span class="bf-n" data-n="' + u + '">00</span><span class="bf-k" data-u="' + u + '"></span></div>'; }).join('') + '</div>' +
      '<div class="bf-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100"><i></i></div></div></div>';
    anchor.parentNode.insertBefore(root, anchor);
    root.querySelectorAll('[data-k]').forEach(function (e) { els[e.dataset.k] = e; });
    root.querySelectorAll('[data-n]').forEach(function (e) { els['n' + e.dataset.n] = e; });
    root.querySelectorAll('[data-u]').forEach(function (e) { els['u' + e.dataset.u] = e; });
    var pill = document.createElement('button'); pill.id = 'bfpill'; pill.type = 'button'; pill.onclick = function () { F.showAlert(true); }; pill.innerHTML = '<i></i><span data-p="t"></span><b data-p="c"></b>'; document.body.appendChild(pill);
    els.pill = pill; els.pt = pill.querySelector('[data-p=t]'); els.pc = pill.querySelector('[data-p=c]'); inView = true;
    els.card = root.firstChild; els.bar = root.querySelector('.bf-bar i'); els.barw = root.querySelector('.bf-bar');
    // note inside the booking window (shown only while the sale is live)
    var tot = document.querySelector('#s2 .tot');
    if (tot && !document.getElementById('bfn')) { var nt = document.createElement('div'); nt.id = 'bfn'; nt.className = 'bf-note'; nt.hidden = true; tot.parentNode.insertBefore(nt, tot.nextSibling); }
    return true;
  }
  // ---- Alert shown when someone opens the site (once per visit), then it shrinks to a nearly invisible reminder ----
  var EDIT = /[?&]cmsedit=1/.test(location.search), A = { el: null, open: false, dismissed: false, key: '', t0: Date.now(), mem: '', timer: 0, hover: false, e: {} };
  function akey(i) { return 'fs_bfa_' + i.st + '_' + i.pct + '_' + i.c.start + '_' + i.c.end; }
  function seen(i) { try { return sessionStorage.getItem(akey(i)) === '1'; } catch (e) { return A.mem === akey(i); } }
  function mark(i) { try { sessionStorage.setItem(akey(i), '1'); } catch (e) { A.mem = akey(i); } }
  function buildAlert() {
    if (A.el) return;
    var d = document.createElement('div'); d.id = 'bfa'; d.hidden = true; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-labelledby', 'bfa-t');
    d.innerHTML = '<div class="bfa-card"><button type="button" class="bfa-x" aria-label="Close">✕</button><span class="bfa-eye"><i class="bf-dot"></i><span data-a="eye"></span></span>' +
      '<h2 class="bfa-t" id="bfa-t"><span data-a="title"></span><b data-a="pct"></b></h2><p class="bfa-sub" data-a="sub"></p>' +
      '<div class="bfa-cd"><span data-a="lab"></span><b data-a="cd"></b></div><a class="btn bfa-cta" href="#book" data-a="cta"></a><small class="bfa-fine" data-a="fine"></small></div>';
    document.body.appendChild(d); A.el = d;
    d.querySelectorAll('[data-a]').forEach(function (e) { A.e[e.dataset.a] = e; });
    d.querySelector('.bfa-x').onclick = closeAlert;
    d.addEventListener('click', function (e) { if (e.target === d || e.target.closest('.bfa-cta')) closeAlert(); });
    d.addEventListener('mouseenter', function () { A.hover = true; }); d.addEventListener('mouseleave', function () { A.hover = false; });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && A.open) closeAlert(); });
  }
  function paintAlert(i, T, live, p, cd) {
    if (!A.el) return;
    setText(A.e.eye, T.eyebrow + ' · ' + dr(i)); setText(A.e.title, T.title); setText(A.e.pct, '−' + p + '%');
    setText(A.e.sub, (live ? T.subL : T.subB).replace('{p}', p)); setText(A.e.lab, live ? T.live : T.before); setText(A.e.cd, cd);
    setText(A.e.cta, T.cta.replace('{p}', p)); setText(A.e.fine, T.t1);
  }
  function openAlert(i) {
    buildAlert(); A.open = true; A.el.hidden = false; if (i) mark(i);
    F.render(); requestAnimationFrame(function () { A.el.classList.add('on'); var x = A.el.querySelector('.bfa-x'); if (x) x.focus({ preventScroll: true }); });
    clearTimeout(A.timer);
    (function wait() { A.timer = setTimeout(function () { if (!A.open) return; if (A.hover) return wait(); closeAlert(); }, 12000); })(); // shrinks by itself after 12 seconds
  }
  function closeAlert() {
    clearTimeout(A.timer); if (!A.open) return; A.open = false; A.dismissed = true;
    if (A.el) { A.el.classList.remove('on'); setTimeout(function () { if (!A.open && A.el) A.el.hidden = true; }, 380); }
    F.render();
  }
  F.showAlert = function (force) { var i = info(); if (i.st !== 'before' && i.st !== 'live') return false; openAlert(force ? null : i); return true; };
  function driveAlert(i, T, live, p, cd) {
    if (A.key !== akey(i)) { A.key = akey(i); A.dismissed = false; if (A.open) closeAlert(); }
    if (A.open) paintAlert(i, T, live, p, cd);
    if (EDIT || A.open || A.dismissed) return;
    if (seen(i)) { A.dismissed = true; return; } // already shown in this visit: only the faint reminder
    var ready = (window.FS_CMS && window.FS_CMS.loaded) || Date.now() - A.t0 > 2500; // wait for the saved settings so a switched-off alert never flashes
    if (!ready) return;
    if (!i.c.al || seen(i)) { A.dismissed = true; return; }
    if (document.querySelector('dialog[open]') || document.hidden) return; // do not interrupt the booking window; try again in a second
    openAlert(i);
  }

  function pad(n) { return n < 10 ? '0' + n : String(n); }
  function setText(e, v) { if (e && e.textContent !== v) e.textContent = v; }

  F.render = function () {
    var i = info(), T = lg(), live = i.st === 'live', show = i.st === 'before' || live;
    if (!build()) return;
    var nt = document.getElementById('bfn');
    if (nt) { nt.hidden = !live; if (live) { var sb = document.getElementById('sb'), sv = sb ? parseFloat(sb.textContent.replace(/[^0-9.]/g, '')) : NaN, ff = 1 - i.pct / 100, a = isFinite(sv) && sv > 0 ? Math.round((sv / ff - sv) * 100) / 100 : 0;
      nt.innerHTML = ''; nt.append(T.note.replace('{p}', fmtp(i.pct))); if (a > 0) { nt.append(' · '); var bb = document.createElement('b'); bb.textContent = T.save.replace('{a}', '$' + a.toFixed(2)); nt.append(bb); } } }
    root.hidden = !show;
    if (!show) { if (els.pill) els.pill.classList.remove('on'); if (A.open) closeAlert(); return; }
    var p = fmtp(i.pct), target = live ? i.e : i.s, left = Math.max(0, Math.floor((target - i.n) / 1000));
    var v = { d: Math.floor(left / 86400), h: Math.floor(left % 86400 / 3600), m: Math.floor(left % 3600 / 60), s: left % 60 };
    els.card.dataset.s = i.st;
    setText(els.eyebrow, T.eyebrow + ' · '); setText(els.range, dr(i)); setText(els.title, T.title);
    setText(els.pct, '−' + p + '%');
    var sub = (live ? T.subL : T.subB).replace('{p}', p);
    if (els.sub.textContent !== sub) els.sub.textContent = sub;
    setText(els.cta, T.cta.replace('{p}', p)); setText(els.lab, live ? T.live : T.before); setText(els.badge, live ? T.badge : T.soon);
    ['d', 'h', 'm', 's'].forEach(function (u) {
      var e = els['n' + u], t = (u === 'd' && v.d > 99 ? String(v.d) : pad(v[u]));
      if (e.textContent !== t) { e.textContent = t; if (root._init) { e.classList.remove('tick'); void e.offsetWidth; e.classList.add('tick'); } }
      setText(els['u' + u], T[u]);
    });
    setText(els.soon2, live ? T.badge : T.soon);
    var o = (window.FS_CMS && window.FS_CMS.o) || {}, f = 1 - i.pct / 100, rd = function (v) { return Math.round(v * 100) / 100; }, fm = function (n) { return '$' + (n % 1 === 0 ? n : n.toFixed(2)); };
    var chips = [['tb', 't', 12], ['ch', 'c', 3], ['p1', 'a', 55], ['p2', 'b', 110]].map(function (r) {
      var cur = o[r[1]] !== undefined ? o[r[1]] : r[2], reg = live ? rd(cur / f) : cur;
      return '<span class="bf-chip">' + T[r[0]] + ' <s>' + fm(reg) + '</s> <b>' + fm(rd(reg * f)) + '</b></span>';
    }).join('');
    if (els.chips.dataset.h !== chips) { els.chips.innerHTML = chips; els.chips.dataset.h = chips; }
    setText(els.t1, T.t1); setText(els.t2, T.t2); setText(els.t3, T.t3);
    var cd = (v.d ? v.d + 'd ' : '') + pad(v.h) + ':' + pad(v.m) + ':' + pad(v.s);
    els.pill.dataset.s = i.st; setText(els.pt, live ? T.pill.replace('{p}', p) + ' · ' : T.pillB + ' '); setText(els.pc, cd);
    els.pill.classList.toggle('on', A.dismissed && !A.open && !EDIT);
    var pr = live ? Math.min(100, Math.max(0, (i.n - i.s) / (i.e - i.s) * 100)) : 0;
    els.bar.style.width = pr + '%'; els.barw.setAttribute('aria-valuenow', Math.round(pr)); els.barw.setAttribute('aria-label', T.prog);
    root._init = true;
    driveAlert(i, T, live, p, cd);
    var mk = Math.floor(left / 60); // screen readers get the time once a minute, not every second
    if (root._mk !== mk) { root._mk = mk; root.setAttribute('aria-label', (live ? T.live : T.before) + ' ' + v.d + ' ' + T.d + ' ' + v.h + ' ' + T.h + ' ' + v.m + ' ' + T.m); }
  };
  function fmtp(n) { return String(n); }

  // When the sale starts or ends (or the owner changes it) the prices on the page are rewritten automatically.
  function check() {
    var i = info(), key = i.st + '|' + i.pct;
    if (key !== last) {
      var first = last === ''; last = key;
      if (window.FS_CMS && window.FS_CMS.applyAll) { try { window.FS_CMS.applyAll(); } catch (e) { console.warn(e); } }
      else if (!first) F.render();
    }
    F.render();
  }
  F.check = check;

  function start() {
    build(); check();
    setInterval(check, 1000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) check(); });
    // exact server clock, so a wrong clock on someone's phone cannot start or end the sale early
    try {
      var t0 = Date.now();
      fetch('/api/sale', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
        if (j && j.now) { skew = j.now - (Date.now() + t0) / 2; check(); }
      }).catch(function () {});
    } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
