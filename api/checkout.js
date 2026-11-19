const { stripe, quote, availability, couponFor, claimCode, money, limited, badOrigin } = require("./_lib");
const cut = (v, n = 200) => String(v ?? "").slice(0, n);

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();
  if (badOrigin(req)) return res.status(403).json({ error: "forbidden" });
  if (limited(req, "checkout", 12, 10 * 60 * 1000)) return res.status(429).json({ error: "too_many_requests" });
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_PUBLISHABLE_KEY) return res.status(503).json({ error: "not_configured" });
  try {
    const b = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const d = cut(b.date, 10), today = new Date().toISOString().slice(0, 10);
    const day = new Date(d + "T12:00:00Z");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || d < today || day.getUTCDay() === 1) throw new Error("bad date");
    if (!cut(b.name).trim() || !/^\S+@\S+\.\S+$/.test(cut(b.email)) || cut(b.phone).replace(/\D/g, "").length !== 10) throw new Error("bad contact");
    if (!cut(b.address).trim()) throw new Error("missing address");
    const av = await availability();
    if (av.blocked.includes(d)) return res.status(409).json({ error: "taken" });
    const wins = av.windows[d]; // the owner re-opened this date only for some start hours
    if (wins) { const tv = Number(b.tv); if (!Number.isFinite(tv) || !wins.some((w) => tv >= w[0] && tv <= w[1])) return res.status(409).json({ error: "time" }); }
    let coupon = null; // one-time discount code, checked again here so the browser can never decide it
    if (cut(b.coupon, 40).trim() && String(b.pk) !== "w") {
      const c = await couponFor(b.coupon);
      if (!c.ok) return res.status(409).json({ error: "coupon", reason: c.reason });
      if (!(await claimCode(c.code))) return res.status(409).json({ error: "coupon", reason: "used" });
      coupon = c;
    }

    const q = await quote(b, coupon);
    const label = day.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
    const origin = req.headers.origin || "https://" + req.headers.host;
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      ui_mode: "embedded", // payment form shows inside the site, no redirect to another page
      redirect_on_completion: "never",
      payment_method_types: ["card"], // card + Apple Pay + Google Pay (PayPal and others off)
      customer_email: cut(b.email),
      locale: ["en", "es", "fr"].includes(b.lang) ? b.lang : "auto",
      line_items: [{ quantity: 1, price_data: {
        currency: "usd", unit_amount: Math.round(q.due * 100),
        product_data: {
          name: (q.dep ? "Deposit: " : "") + q.label + " · " + label,
          description: q.wd ? "Deposit to hold your date. Final price confirmed with your quote." : "Total " + money(q.total) + " with " + q.taxPct + "% tax." + (q.balance > 0 ? " Remaining balance " + money(q.balance) + "." : ""),
        } } }],
      payment_intent_data: { receipt_email: cut(b.email), description: "Fortune Studio · " + q.label + " · " + label },
      metadata: {
        app: "fortune", date: d, date_label: label, time: cut(b.time, 20), service: q.label,
        subtotal: q.wd ? "-" : money(q.subtotal), tax: q.wd ? "-" : money(q.tax), total: q.wd ? "Quote to be confirmed" : money(q.total), paid_now: money(q.due), balance: q.wd ? "Quote to be confirmed" : money(q.balance),
        sale: q.sale || "-", coupon: coupon ? coupon.code : "", coupon_id: coupon ? coupon.id : "", discount: coupon ? money(q.disc) + " (" + coupon.pct + "% off)" : "", tv: cut(b.tv, 6), delivery: b.delivery ? "yes" : "no", name: cut(b.name, 100), phone: cut(b.phone, 20), address: cut(b.address, 300), lang: cut(b.lang, 2),
      },
    });
    res.status(200).json({ clientSecret: session.client_secret, publishableKey: process.env.STRIPE_PUBLISHABLE_KEY });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: "bad_request" });
  }
};
