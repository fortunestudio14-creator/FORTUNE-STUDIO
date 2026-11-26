/* Fortune Studio visitor tracker: counts how long a person is really on the site (tab open, not idle) and how far they scroll.
   The country is added by the server. Nothing personal is stored. Not counted: the admin editor, the admin's own device (switch in /admin), bots. */
(function () {
  try {
    if (/[?&]cmsedit=1/.test(location.search) || window.top !== window.self) return;
    if (localStorage.getItem("fs_notrack") === "1") return;
  } catch (e) {}
  var sid = "";
  try { sid = sessionStorage.getItem("fs_sid") || ""; } catch (e) {}
  if (!/^[A-Za-z0-9-]{8,64}$/.test(sid)) {
    sid = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : (Date.now().toString(36) + Math.random().toString(36).slice(2, 12));
    try { sessionStorage.setItem("fs_sid", sid); } catch (e) {}
  }
  var secs = 0, last = Date.now(), act = Date.now(), maxScroll = 0, book = false, sent = "", IDLE = 60000;
  function source() {
    try {
      var u = new URLSearchParams(location.search).get("utm_source");
      if (u) return u.slice(0, 40);
      if (document.referrer) { var h = new URL(document.referrer).hostname.replace(/^www\./, ""); if (h && h !== location.hostname.replace(/^www\./, "")) return h; }
    } catch (e) {}
    return "";
  }
  var SRC = source(), W = window.innerWidth || 1024, DEV = W < 700 ? "mobile" : W < 1100 ? "tablet" : "desktop";
  function pack() {
    return JSON.stringify({ sid: sid, s: Math.round(secs), sc: maxScroll, b: book, p: location.pathname, r: SRC, d: DEV, l: String(document.documentElement.lang || navigator.language || "").slice(0, 2) });
  }
  function send(force) {
    var d = pack();
    if (!force && d === sent) return;
    sent = d;
    try {
      if (navigator.sendBeacon && navigator.sendBeacon("/api/track", new Blob([d], { type: "application/json" }))) return;
    } catch (e) {}
    try { fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: d, keepalive: true }); } catch (e) {}
  }
  function touch() { act = Date.now(); }
  ["pointermove", "pointerdown", "keydown", "touchstart", "wheel"].forEach(function (n) { addEventListener(n, touch, { passive: true }); });
  addEventListener("scroll", function () {
    touch();
    var h = document.documentElement, t = (h.scrollHeight - h.clientHeight) || 1, p = Math.round(((window.pageYOffset || h.scrollTop || 0) / t) * 100);
    if (p > maxScroll) maxScroll = Math.min(100, p);
  }, { passive: true });
  setInterval(function () { // every second: count only if the tab is visible and the person moved/scrolled in the last minute
    var now = Date.now(), dt = Math.min(2000, now - last); last = now;
    if (!document.hidden && now - act < IDLE) secs += dt / 1000;
  }, 1000);
  setInterval(function () { if (!document.hidden) send(false); }, 15000);
  document.addEventListener("visibilitychange", function () { if (document.hidden) send(true); else last = Date.now(); });
  addEventListener("pagehide", function () { send(true); });
  function watchBook() {
    var b = document.getElementById("book");
    if (!b || !("IntersectionObserver" in window)) return;
    new IntersectionObserver(function (e, o) { if (e.some(function (x) { return x.isIntersecting; })) { book = true; send(false); o.disconnect(); } }, { threshold: 0.25 }).observe(b);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", watchBook); else watchBook();
  setTimeout(function () { send(true); }, 800); // count the visit even if the person leaves quickly
})();
