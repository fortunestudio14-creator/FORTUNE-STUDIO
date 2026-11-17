const Stripe = require("stripe");
const stripe = () => new Stripe(process.env.STRIPE_SECRET_KEY);

const PHOTO = { 30: 99, 45: 139, 60: 179, 90: 249, 120: 319 };
const clamp = (v, a, b) => Math.min(b, Math.max(a, Math.round(+v || 0)));
const money = (n) => "$" + n.toFixed(2);

// Same prices as the website. Computed here so nobody can change the amount in the browser.
function quote(b) {
  const pk = String(b.pk), wd = pk === "w", h = clamp(b.hr, 4, 12);
  if (wd) return { label: "Wedding or event coverage", subtotal: 0, tax: 0, total: 100, due: 100, balance: 0, dep: true, wd: true }; // flat $100 deposit, final price is quoted
  let s, label;
  if (pk[0] === "p") {
    s = PHOTO[pk.slice(1)]; if (!s) throw new Error("bad service");
    label = "Portrait session, " + pk.slice(1) + " min";
  } else {
    if (pk === "55") { s = 55; label = "Party package"; }
    else if (pk === "110") { s = 110; label = "Celebration package"; }
    else if (wd) { s = 150 * h; label = "Wedding or event coverage, " + h + " hours"; }
    else if (pk === "c") {
      const q = clamp(b.qt, 0, 6), c = clamp(b.qc, 0, 40); s = q * 12 + c * 3;
      if (!s) throw new Error("empty"); label = "Rental: " + q + " tables, " + c + " chairs";
    } else throw new Error("bad service");
    if (!wd) s += Math.round(s * Math.max(0, h - 4) * 0.25); // extra hours +25% each
  }
  const tax = Math.round(s * 0.06 * 100) / 100, total = s + tax;
  const dep = b.pp === "dep" || wd;
  const due = dep ? (wd ? Math.min(total, 100) : Math.round(total * 0.5 * 100) / 100) : total;
  return { label, subtotal: s, tax, total, due, balance: Math.round((total - due) * 100) / 100, dep };
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
