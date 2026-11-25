/* Fortune Studio "keep visitors on the site" features. Every one can be switched on/off in /admin > "Keep visitors on the site".
   Settings come from site_settings.content.rt (same Save and publish button as the rest of the editor). */
(function () {
  if (/[?&]cmsedit=1/.test(location.search) || window.top !== window.self) return;
  var D = document, L = (D.documentElement.lang || "en").slice(0, 2).toLowerCase();
  if (["en", "es", "fr"].indexOf(L) < 0) L = "en";
  var T = {
    en: { book: "Book now", nT: "Need help choosing?", nX: "Ask us a question, we reply fast.", nC: "Chat with us", nB: "See booking", eT: "Before you go…", eX: "Check our available dates. Your session can be booked in 2 minutes.", eB: "Check dates", x: "Close" },
    es: { book: "Reservar", nT: "¿Necesitas ayuda para elegir?", nX: "Escríbenos, respondemos rápido.", nC: "Chatea con nosotros", nB: "Ver reservas", eT: "Antes de irte…", eX: "Mira nuestras fechas disponibles. Reservar toma 2 minutos.", eB: "Ver fechas", x: "Cerrar" },
    fr: { book: "Réserver", nT: "Besoin d’aide pour choisir ?", nX: "Posez-nous une question, nous répondons vite.", nC: "Discuter avec nous", nB: "Voir la réservation", eT: "Avant de partir…", eX: "Consultez nos dates disponibles. La réservation prend 2 minutes.", eB: "Voir les dates", x: "Fermer" }
  }[L];
  function cfg() { return (window.FS_CMS && window.FS_CMS.content && window.FS_CMS.content.rt) || {}; }
  var shown = {}, once = function (k) { try { if (sessionStorage.getItem("fs_rt_" + k)) return false; sessionStorage.setItem("fs_rt_" + k, "1"); } catch (e) { if (shown[k]) return false; shown[k] = 1; } return true; };
  function css() {
    var s = D.createElement("style");
    s.textContent =
      "#fsprog{position:fixed;left:0;top:0;height:3px;width:100%;transform-origin:0 50%;transform:scaleX(0);background:linear-gradient(90deg,#b98a70,var(--ac,#e8b99f));z-index:9500;pointer-events:none}" +
      "#fsbook{position:fixed;left:50%;bottom:calc(18px + env(safe-area-inset-bottom,0px));transform:translate(-50%,24px);opacity:0;pointer-events:none;z-index:29;display:inline-flex;align-items:center;gap:8px;padding:13px 24px;border-radius:999px;background:var(--ac,#e8b99f);color:#17110e;font:600 .95rem Outfit,system-ui,sans-serif;text-decoration:none;box-shadow:0 10px 30px #000a;transition:opacity .35s,transform .35s}" +
      "#fsbook.on{opacity:1;transform:translate(-50%,0);pointer-events:auto}" +
      "#fsnudge{position:fixed;left:max(14px,env(safe-area-inset-left));bottom:calc(72px + env(safe-area-inset-bottom,0px));z-index:31;width:min(310px,calc(100vw - 100px));padding:16px 16px 14px;border-radius:16px;background:var(--card,#151515);color:var(--tx,#f4efe6);border:1px solid var(--line,#2a2a2a);box-shadow:0 14px 40px #000b;font:400 .92rem/1.45 Outfit,system-ui,sans-serif;opacity:0;transform:translateY(14px);pointer-events:none;transition:opacity .4s,transform .4s}" +
      "#fsnudge.on{opacity:1;transform:none;pointer-events:auto}#fsnudge b{display:block;font-weight:600;margin-bottom:4px}#fsnudge p{margin:0 0 12px;color:var(--mu,#a29d94)}" +
      "#fsnudge .r{display:flex;gap:8px;flex-wrap:wrap}.fsb{border:0;border-radius:999px;padding:9px 16px;font:600 .85rem Outfit,system-ui,sans-serif;cursor:pointer;text-decoration:none;background:var(--ac,#e8b99f);color:#17110e}.fsb.g{background:transparent;color:var(--tx,#f4efe6);border:1px solid var(--line,#2a2a2a)}" +
      "#fsx{position:absolute;right:8px;top:6px;width:28px;height:28px;border:0;background:none;color:var(--mu,#a29d94);font-size:1.2rem;cursor:pointer}" +
      "#fsexit{position:fixed;inset:0;z-index:9100;display:none;place-items:center;padding:18px;background:rgba(5,5,5,.65);backdrop-filter:blur(6px)}#fsexit.on{display:grid}" +
      "#fsexit .c{position:relative;max-width:420px;width:100%;padding:30px 26px 24px;border-radius:22px;background:var(--card,#151515);color:var(--tx,#f4efe6);border:1px solid var(--line,#2a2a2a);text-align:center;font:400 1rem/1.5 Outfit,system-ui,sans-serif}" +
      "#fsexit h3{margin:0 0 8px;font:400 2rem/1.1 Yellowtail,cursive;color:var(--ac,#e8b99f)}#fsexit p{margin:0 0 18px;color:var(--mu,#a29d94)}" +
      "@media(prefers-reduced-motion:reduce){#fsbook,#fsnudge{transition:none}}";
    D.head.appendChild(s);
  }
  function mk(tag, id, html) { var e = D.createElement(tag); if (id) e.id = id; if (html) e.innerHTML = html; D.body.appendChild(e); return e; }
  function goBook() { var b = D.getElementById("book"); if (b) b.scrollIntoView({ behavior: "smooth" }); else location.hash = "#book"; }
  function chatOpen() { var w = D.getElementById("cw"); return !!(w && w.classList.contains("open")); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  function init() {
    var c = cfg(), css1 = false; css(); css1 = true;
    var bookEl = D.getElementById("book"), booked = false;
    if (bookEl && "IntersectionObserver" in window) new IntersectionObserver(function (e) { if (e.some(function (x) { return x.isIntersecting; })) booked = true; }, { threshold: 0.2 }).observe(bookEl);

    // 1) thin progress bar at the top (shows how far down the page they are, gives a reason to keep scrolling)
    var bar = c.progress === false ? null : mk("div", "fsprog");
    // 2) floating "Book now" button after the first screen (hidden while the booking form itself is on screen)
    var fb = c.sticky === false ? null : mk("a", "fsbook", esc(c.stickyText || T.book) + " →");
    if (fb) { fb.href = "#book"; fb.onclick = function (e) { e.preventDefault(); goBook(); }; }
    var tick = 0;
    function onScroll() {
      if (tick) return; tick = requestAnimationFrame(function () {
        tick = 0; var h = D.documentElement, t = (h.scrollHeight - h.clientHeight) || 1, y = window.pageYOffset || h.scrollTop || 0;
        if (bar) bar.style.transform = "scaleX(" + Math.min(1, y / t) + ")";
        if (fb) { var r = bookEl && bookEl.getBoundingClientRect(), inBook = r && r.top < innerHeight * 0.7 && r.bottom > innerHeight * 0.2; fb.classList.toggle("on", y > innerHeight * 0.8 && !inBook); }
      });
    }
    addEventListener("scroll", onScroll, { passive: true }); onScroll();

    // 3) friendly nudge after some time on the site (once per visit, never if they already reached the booking form or opened the chat)
    if (c.nudge !== false) {
      var sec = Math.min(600, Math.max(10, +c.nudgeSec || 45)), n = null;
      setTimeout(function () {
        if (booked || chatOpen() || D.hidden || !once("nudge")) return;
        n = mk("div", "fsnudge", '<button id="fsx" aria-label="' + T.x + '">×</button><b>' + esc(c.nudgeTitle || T.nT) + "</b><p>" + esc(c.nudgeText || T.nX) + '</p><div class="r"><button class="fsb" id="fsn1">' + T.nC + '</button><button class="fsb g" id="fsn2">' + T.nB + "</button></div>");
        requestAnimationFrame(function () { n.classList.add("on"); });
        var close = function () { n.classList.remove("on"); setTimeout(function () { n.remove(); }, 450); };
        D.getElementById("fsx").onclick = close;
        D.getElementById("fsn1").onclick = function () { close(); var b = D.getElementById("cb"); if (b) b.click(); };
        D.getElementById("fsn2").onclick = function () { close(); goBook(); };
        setTimeout(function () { if (n && n.isConnected) close(); }, 20000);
      }, sec * 1000);
    }

    // 4) "before you go" message when the mouse leaves through the top of the window (computer only, once per visit, off by default)
    if (c.exit === true) {
      var ex = null;
      D.documentElement.addEventListener("mouseleave", function (e) {
        if (e.clientY > 0 || booked || ex || !once("exit")) return;
        ex = mk("div", "fsexit", '<div class="c" role="dialog" aria-modal="true"><button id="fsx" aria-label="' + T.x + '">×</button><h3>' + esc(c.exitTitle || T.eT) + "</h3><p>" + esc(c.exitText || T.eX) + '</p><button class="fsb" id="fse">' + esc(c.exitBtn || T.eB) + "</button></div>");
        requestAnimationFrame(function () { ex.classList.add("on"); });
        var close = function () { ex.classList.remove("on"); };
        ex.onclick = function (ev) { if (ev.target === ex) close(); };
        D.getElementById("fsx").onclick = close;
        D.getElementById("fse").onclick = function () { close(); goBook(); };
      });
    }
  }
  // wait (max ~6 s) until the admin settings finished loading so switched-off features never flash on screen
  var tries = 0, iv = setInterval(function () {
    if ((window.FS_CMS && window.FS_CMS.loaded) || ++tries > 20) { clearInterval(iv); if (D.body) init(); else D.addEventListener("DOMContentLoaded", init); }
  }, 300);
})();
