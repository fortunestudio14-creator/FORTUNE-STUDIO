const Stripe = require("stripe");
const stripe = () => new Stripe(process.env.STRIPE_SECRET_KEY);

const DEF = { t: 12, c: 3, a: 55, b: 110, wh: 150, wd: 100, sh: 80, tax: 6, dep: 50, xh: 25, mt: 30, mc: 200, ph: { 30: 99, 45: 139, 60: 179, 90: 249, 120: 319 } };

// ---- Black Friday sale (automatic) ----
// Default window: starts Nov 27 2026 at 12:00 AM Eastern, back to normal on Nov 30 2026 at 12:00 AM Eastern.
// The owner can change it (or turn it off) in /admin > Black Friday. The server decides the real price, never the browser.
const BF_DEF = { on: true, pct: 10, start: "2026-11-27", end: "2026-11-30" };
const TZ = "America/New_York";
function tzOffset(ms) {
  const o = {};
  new Intl.DateTimeFormat("en-US", { timeZone: TZ, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" })
    .formatToParts(new Date(ms)).forEach((x) => { o[x.type] = +x.value; });
  return (Date.UTC(o.year, o.month - 1, o.day, o.hour, o.minute, o.second) - ms) / 60000;
}
function etMidnight(ymd) { // exact moment when that date starts in Scranton (Eastern time, handles daylight saving)
  const [y, m, d] = ymd.split("-").map(Number);
  let g = Date.UTC(y, m - 1, d, 5, 0, 0);
  for (let i = 0; i < 3; i++) g = Date.UTC(y, m - 1, d, 0, 0, 0) - tzOffset(g) * 60000;
  return g;
}
const YMD = /^\d{4}-\d{2}-\d{2}$/;
function bfConfig(c) {
  c = c || {};
  const pct = parseFloat(c.pct);
  return {
    on: c.on !== false,
    pct: Number.isFinite(pct) && pct > 0 && pct <= 90 ? pct : BF_DEF.pct,
    start: YMD.test(c.start || "") ? c.start : BF_DEF.start,
    end: YMD.test(c.end || "") ? c.end : BF_DEF.end,
  };
}
function saleState(cfg, now = Date.now()) {
  const s = etMidnight(cfg.start), e = etMidnight(cfg.end);
  const state = !cfg.on || e <= s ? "off" : now < s ? "before" : now < e ? "live" : "ended";
  return { state, pct: cfg.pct, factor: state === "live" ? 1 - cfg.pct / 100 : 1, start: s, end: e, now };
}
const rd = (v) => Math.round(v * 100) / 100;
const clamp = (v, a, b) => Math.min(b, Math.max(a, Math.round(+v || 0)));
const money = (n) => "$" + n.toFixed(2);
const num = (v, d, lo, hi) => (Number.isFinite(+v) && v !== "" && v !== null && +v >= lo && +v <= hi ? +v : d);

// Prices come from the admin editor (Supabase site_settings.content.prices). Falls back to the defaults.
const CP_DEF = { stack: false }, AV_DEF = { freed: [], win: {} };
function cpConfig(c) { return { stack: !!(c && c.stack) }; }
function avConfig(c) { // dates the owner re-opened in /admin: freed = booking ids whose date is open again, win = booking ids whose date is open only for some start hours
  c = c || {};
  const freed = Array.isArray(c.freed) ? c.freed.filter((x) => typeof x === "string").slice(0, 500) : [];
  const win = {};
  Object.keys(c.win || {}).slice(0, 500).forEach((id) => {
    const w = c.win[id], a = Array.isArray(w) ? +w[0] : NaN, z = Array.isArray(w) ? +w[1] : NaN;
    if (Number.isFinite(a) && Number.isFinite(z) && a >= 0 && z <= 24 && a <= z) win[id] = [a, z];
  });
  return { freed, win };
}
let cache = { at: 0, p: DEF, bf: bfConfig(), cp: CP_DEF, av: AV_DEF };
async function load() {
  if (Date.now() - cache.at < 30000) return cache;
  let p = DEF, bf = bfConfig(), cp = CP_DEF, av = AV_DEF;
  try {
    const url = process.env.FORTUNE_SUPABASE_URL, key = process.env.FORTUNE_SUPABASE_KEY;
    if (url && key) {
      const r = await fetch(url.replace(/\/$/, "") + "/rest/v1/site_settings?id=eq.1&select=content", { headers: { apikey: key, Authorization: "Bearer " + key } });
      const j = r.ok ? await r.json() : [];
      const c = (j[0] && j[0].content && j[0].content.prices) || {};
      p = { t: num(c.t, DEF.t, 0, 10000), c: num(c.c, DEF.c, 0, 10000), a: num(c.a, DEF.a, 0, 100000), b: num(c.b, DEF.b, 0, 100000),
        wh: num(c.wh, DEF.wh, 0, 100000), wd: num(c.wd, DEF.wd, 0, 100000), sh: num(c.sh, DEF.sh, 0, 100000), tax: num(c.tax, DEF.tax, 0, 30), dep: num(c.dep, DEF.dep, 1, 100), xh: num(c.xh, DEF.xh, 0, 200), mt: Math.round(num(c.mt, DEF.mt, 0, 10000)), mc: Math.round(num(c.mc, DEF.mc, 0, 100000)), ph: {} };
      for (const m in DEF.ph) { const x = c.ph && c.ph[m]; p.ph[m] = num(Array.isArray(x) ? x[0] : x, DEF.ph[m], 0, 100000); }
      bf = bfConfig(j[0] && j[0].content && j[0].content.bf);
      cp = cpConfig(j[0] && j[0].content && j[0].content.cp);
      av = avConfig(j[0] && j[0].content && j[0].content.av);
    }
  } catch (e) { console.error("prices fallback", e); }
  cache = { at: Date.now(), p, bf, cp, av };
  return cache;
}
// Prices with the Black Friday discount already applied when the sale is live (same rounding as the browser).
async function priced() {
  const { p, bf } = await load();
  const sale = saleState(bf), f = sale.factor;
  if (f === 1) return { P: p, sale };
  const P = { ...p, ph: {} };
  ["t", "c", "a", "b", "wh", "sh"].forEach((k) => { P[k] = rd(p[k] * f); }); // the wedding deposit (wd) is a deposit, not discounted
  for (const m in p.ph) P.ph[m] = rd(p.ph[m] * f);
  return { P, sale };
}

// Prices are computed here so nobody can change the amount in the browser.
async function quote(b, coupon) {
  const { P, sale } = await priced(), TAX = P.tax / 100, DEPS = P.dep / 100, EXTRA = P.xh / 100;
  const off = sale.state === "live" ? " · Black Friday " + sale.pct + "% off" : "";
  const pk = String(b.pk), wd = pk === "w", sp = pk === "s", h = clamp(b.hr, sp ? 1 : 4, 12);
  if (wd) return { label: "Wedding or event coverage", subtotal: 0, tax: 0, total: P.wd, due: P.wd, balance: 0, dep: true, wd: true, taxPct: P.tax }; // flat deposit, final price is quoted
  let s, label;
  if (pk[0] === "p") {
    s = P.ph[pk.slice(1)]; if (!s) throw new Error("bad service");
    label = "Portrait session, " + pk.slice(1) + " min";
  } else {
    if (pk === "55") { s = P.a; label = "Party package"; }
    else if (pk === "110") { s = P.b; label = "Celebration package"; }
    else if (sp) { s = P.sh * h; if (!s) throw new Error("no price"); label = "Space rental, " + h + (h === 1 ? " hour" : " hours"); }
    else if (pk === "c") {
      const q = clamp(b.qt, 0, P.mt), c = clamp(b.qc, 0, P.mc); s = rd(q * P.t + c * P.c);
      if (!s) throw new Error("empty"); label = "Rental: " + q + " tables, " + c + " chairs";
    } else throw new Error("bad service");
    if (!sp) s += Math.round(s * Math.max(0, h - 4) * EXTRA); // extra hours add a share of the price each
  }
  s = rd(s);
  let disc = 0, cl = "";
  if (coupon && (coupon.pct > 0 || coupon.amt > 0)) {
    // The code is "% off" or "$ off", taken from the price before tax. The customer always pays a small minimum
    // (Stripe cannot charge less than $0.50), so the price never goes below floorS. Same formula as the browser.
    const floorS = Math.max(1, Math.ceil(0.5 / (DEPS * (1 + TAX)) * 100) / 100 + 0.01);
    let ns = coupon.amt > 0 ? rd(s - coupon.amt) : rd(s * (1 - coupon.pct / 100));
    ns = rd(Math.max(ns, Math.min(s, floorS)));
    disc = rd(s - ns); s = ns;
    cl = " · Code −" + (coupon.amt > 0 ? money(coupon.amt) : coupon.pct + "%");
  }
  const tax = Math.round(s * TAX * 100) / 100, total = rd(s + tax);
  const dep = b.pp === "dep";
  const due = dep ? Math.round(total * DEPS * 100) / 100 : total;
  return { label: label + off + cl, disc, subtotal: s, tax, total, due, balance: Math.round((total - due) * 100) / 100, dep, taxPct: P.tax, sale: sale.state === "live" ? "Black Friday " + sale.pct + "% off" : "" };
}

// Booked dates = paid Checkout sessions. Stripe is the source of truth, no database needed.
// The owner can re-open a booking's date (or only some start hours) in /admin; that list comes from site_settings.content.av.
async function availability() {
  const { av } = await load();
  const today = new Date().toISOString().slice(0, 10), blocked = new Set(), part = {}, list = [];
  let n = 0;
  for await (const x of stripe().checkout.sessions.list({ limit: 100 })) {
    const m = x.metadata || {};
    if (m.app === "fortune" && x.status === "complete" && x.payment_status === "paid" && m.date >= today) {
      list.push({ id: x.id, date: m.date, label: m.date_label, time: m.time, service: m.service, name: m.name, phone: m.phone, paid: m.paid_now, coupon: m.coupon || "" });
      if (av.freed.includes(x.id)) { /* date is open again */ }
      else if (av.win[x.id]) (part[m.date] = part[m.date] || []).push(av.win[x.id]);
      else blocked.add(m.date);
    }
    if (++n >= 500) break;
  }
  Object.keys(part).forEach((d) => { if (blocked.has(d)) delete part[d]; }); // a new full booking on that date closes it again
  list.sort((a, b) => (a.date < b.date ? -1 : 1));
  return { blocked: [...blocked], windows: part, list };
}
async function bookedDates() { return (await availability()).blocked; }

// ---- One-time discount codes (Stripe Promotion Codes are the code list; a code is switched off the moment its payment is confirmed) ----
const crypto = require("crypto");
const cleanCode = (v) => String(v ?? "").toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 40);
async function findCode(code) {
  code = cleanCode(code);
  if (code.length < 4) return { state: "none" };
  const r = await stripe().promotionCodes.list({ code, limit: 5 });
  const pc = r.data.find((x) => String(x.code).toUpperCase() === code && x.metadata && x.metadata.app === "fortune");
  if (!pc) return { state: "none" };
  // A code is either "% off" (pct, up to 100) or "$ off" (amt, dollars). The owner picks which one in /admin.
  let pct = Number(pc.metadata.pct) || (pc.coupon && pc.coupon.percent_off) || 0;
  pct = Math.min(100, Math.max(0, pct));
  let amt = Number(pc.metadata.amt) || (pc.coupon && pc.coupon.amount_off ? pc.coupon.amount_off / 100 : 0) || 0;
  amt = Math.min(10000, Math.max(0, amt));
  if (!pct && !amt) return { state: "none" };
  if (pc.metadata.used === "1") return { state: "used", pc, pct, amt };
  if (!pc.active) return { state: "off", pc, pct, amt };
  return { state: "ok", pc, pct, amt };
}
// Public check (the website calls it when someone presses Apply). Never says anything about other codes.
async function couponFor(code) {
  const { cp, bf } = await load();
  const f = await findCode(code);
  if (f.state !== "ok") return { ok: false, reason: f.state === "none" ? "invalid" : f.state };
  if (saleState(bf).state === "live" && !cp.stack) return { ok: false, reason: "sale" };
  return { ok: true, pct: f.pct, amt: f.amt, code: String(f.pc.code).toUpperCase(), id: f.pc.id };
}
// Right before payment: refuse a code that already has a paid booking, and close the same person's older unfinished checkouts that hold the code.
async function claimCode(code) {
  let n = 0, used = false;
  for await (const x of stripe().checkout.sessions.list({ limit: 100 })) {
    const m = x.metadata || {};
    if (m.app === "fortune" && m.coupon === code) {
      if (x.status === "complete" && x.payment_status === "paid") { used = true; break; }
      if (x.status === "open") { try { await stripe().checkout.sessions.expire(x.id); } catch (e) { console.error("expire", e.message); } }
    }
    if (++n >= 500) break;
  }
  return !used;
}
function newCode() {
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", b = crypto.randomBytes(8);
  const c = (i) => A[b[i] % A.length];
  return "FS-" + c(0) + c(1) + c(2) + c(3) + "-" + c(4) + c(5) + c(6) + c(7);
}
// Only the signed-in owner (Supabase login from /admin) may call the admin API.
async function isOwner(req) {
  const h = String(req.headers.authorization || ""), tok = h.startsWith("Bearer ") ? h.slice(7) : "";
  const url = process.env.FORTUNE_SUPABASE_URL, key = process.env.FORTUNE_SUPABASE_KEY;
  if (!tok || !url || !key) return false;
  try {
    const r = await fetch(url.replace(/\/$/, "") + "/auth/v1/user", { headers: { apikey: key, Authorization: "Bearer " + tok } });
    if (!r.ok) return false;
    let aal = "", amr = []; try { const p = JSON.parse(Buffer.from(tok.split(".")[1], "base64url").toString()); aal = p.aal; amr = p.amr || []; } catch (e) {}
    const emailCode = Array.isArray(amr) && amr.some((x) => x && x.method === "otp"); // signed in with a code sent to the owner's email
    if (aal !== "aal2" && !emailCode) { // password alone is enough ONLY if the owner switched the backup code off in /admin
      let off = false;
      try { const f = await fetch(url.replace(/\/$/, "") + "/rest/v1/admin_security?id=eq.1&select=nocode", { headers: { apikey: key } }); const j = f.ok ? await f.json() : []; off = !!(j[0] && j[0].nocode === true); } catch (e) {}
      if (!off) return false;
    }
    const u = await r.json();
    return String(u.email || "").toLowerCase() === String(process.env.OWNER_EMAIL || "fortunestudio14@gmail.com").toLowerCase();
  } catch (e) { return false; }
}

// ---- Basic abuse protection (best effort: memory is per server instance; add a Vercel Firewall rate-limit rule for a hard limit) ----
const hits = new Map();
function ipOf(req) { return String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || (req.socket && req.socket.remoteAddress) || "?"; }
function limited(req, name, max, windowMs) {
  const k = name + ":" + ipOf(req), now = Date.now();
  const a = (hits.get(k) || []).filter((t) => now - t < windowMs);
  a.push(now); hits.set(k, a);
  if (hits.size > 5000) for (const [key, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(key);
  return a.length > max;
}
function badOrigin(req) { // browsers always send Origin on POST; refuse other websites calling our API
  const o = req.headers.origin;
  if (!o) return false;
  try { return new URL(o).host.replace(/^www\./, "") !== String(req.headers.host || "").replace(/^www\./, ""); } catch (e) { return true; }
}
module.exports = { stripe, quote, bookedDates, availability, couponFor, claimCode, findCode, newCode, cleanCode, isOwner, money, priced, load, bfConfig, saleState, limited, badOrigin };
