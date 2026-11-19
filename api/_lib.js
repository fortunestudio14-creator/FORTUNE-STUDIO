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
let cache = { at: 0, p: DEF, bf: bfConfig() };
async function load() {
  if (Date.now() - cache.at < 30000) return cache;
  let p = DEF, bf = bfConfig();
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
    }
  } catch (e) { console.error("prices fallback", e); }
  cache = { at: Date.now(), p, bf };
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
async function quote(b) {
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
  const tax = Math.round(s * TAX * 100) / 100, total = rd(s + tax);
  const dep = b.pp === "dep";
  const due = dep ? Math.round(total * DEPS * 100) / 100 : total;
  return { label: label + off, subtotal: s, tax, total, due, balance: Math.round((total - due) * 100) / 100, dep, taxPct: P.tax, sale: sale.state === "live" ? "Black Friday " + sale.pct + "% off" : "" };
}

// Booked dates = paid Checkout sessions. Stripe is the source of truth, no database needed.
async function bookedDates() {
  const today = new Date().toISOString().slice(0, 10), out = new Set();
  let n = 0;
  for await (const x of stripe().checkout.sessions.list({ limit: 100 })) {
    const m = x.metadata || {};
    if (m.app === "fortune" && x.status === "complete" && x.payment_status === "paid" && m.date >= today) out.add(m.date);
    if (++n >= 500) break;
  }
  return [...out];
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
module.exports = { stripe, quote, bookedDates, money, priced, load, bfConfig, saleState, limited, badOrigin };
