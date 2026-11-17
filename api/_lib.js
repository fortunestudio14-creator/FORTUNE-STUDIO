const Stripe = require("stripe");
const stripe = () => new Stripe(process.env.STRIPE_SECRET_KEY);

const DEF = { t: 12, c: 3, a: 55, b: 110, wh: 150, wd: 100, tax: 6, dep: 50, xh: 25, ph: { 30: 99, 45: 139, 60: 179, 90: 249, 120: 319 } };
const clamp = (v, a, b) => Math.min(b, Math.max(a, Math.round(+v || 0)));
const money = (n) => "$" + n.toFixed(2);
const num = (v, d, lo, hi) => (Number.isFinite(+v) && v !== "" && v !== null && +v >= lo && +v <= hi ? +v : d);

// Prices come from the admin editor (Supabase site_settings.content.prices). Falls back to the defaults.
let cache = { at: 0, p: DEF };
async function prices() {
  if (Date.now() - cache.at < 30000) return cache.p;
  let p = DEF;
  try {
    const url = process.env.FORTUNE_SUPABASE_URL, key = process.env.FORTUNE_SUPABASE_KEY;
    if (url && key) {
      const r = await fetch(url.replace(/\/$/, "") + "/rest/v1/site_settings?id=eq.1&select=content", { headers: { apikey: key, Authorization: "Bearer " + key } });
      const j = r.ok ? await r.json() : [];
      const c = (j[0] && j[0].content && j[0].content.prices) || {};
      p = { t: num(c.t, DEF.t, 0, 10000), c: num(c.c, DEF.c, 0, 10000), a: num(c.a, DEF.a, 0, 100000), b: num(c.b, DEF.b, 0, 100000),
        wh: num(c.wh, DEF.wh, 0, 100000), wd: num(c.wd, DEF.wd, 0, 100000), tax: num(c.tax, DEF.tax, 0, 30), dep: num(c.dep, DEF.dep, 1, 100), xh: num(c.xh, DEF.xh, 0, 200), ph: {} };
      for (const m in DEF.ph) { const x = c.ph && c.ph[m]; p.ph[m] = num(Array.isArray(x) ? x[0] : x, DEF.ph[m], 0, 100000); }
    }
  } catch (e) { console.error("prices fallback", e); }
  cache = { at: Date.now(), p };
  return p;
}

// Prices are computed here so nobody can change the amount in the browser.
async function quote(b) {
  const P = await prices(), TAX = P.tax / 100, DEPS = P.dep / 100, EXTRA = P.xh / 100;
  const pk = String(b.pk), wd = pk === "w", h = clamp(b.hr, 4, 12);
  if (wd) return { label: "Wedding or event coverage", subtotal: 0, tax: 0, total: P.wd, due: P.wd, balance: 0, dep: true, wd: true, taxPct: P.tax }; // flat deposit, final price is quoted
  let s, label;
  if (pk[0] === "p") {
    s = P.ph[pk.slice(1)]; if (!s) throw new Error("bad service");
    label = "Portrait session, " + pk.slice(1) + " min";
  } else {
    if (pk === "55") { s = P.a; label = "Party package"; }
    else if (pk === "110") { s = P.b; label = "Celebration package"; }
    else if (pk === "c") {
      const q = clamp(b.qt, 0, 6), c = clamp(b.qc, 0, 40); s = q * P.t + c * P.c;
      if (!s) throw new Error("empty"); label = "Rental: " + q + " tables, " + c + " chairs";
    } else throw new Error("bad service");
    s += Math.round(s * Math.max(0, h - 4) * EXTRA); // extra hours add a share of the price each
  }
  const tax = Math.round(s * TAX * 100) / 100, total = s + tax;
  const dep = b.pp === "dep";
  const due = dep ? Math.round(total * DEPS * 100) / 100 : total;
  return { label, subtotal: s, tax, total, due, balance: Math.round((total - due) * 100) / 100, dep, taxPct: P.tax };
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

module.exports = { stripe, quote, bookedDates, money };
