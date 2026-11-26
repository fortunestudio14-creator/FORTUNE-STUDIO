const { stripe, availability, newCode, isOwner, limited, badOrigin } = require("./_lib");

// Owner-only API used by /admin: create / list / switch off one-time discount codes, and list paid bookings so dates can be re-opened.
module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).end();
  if (badOrigin(req)) return res.status(403).json({ error: "forbidden" });
  if (limited(req, "manage", 60, 10 * 60 * 1000)) return res.status(429).json({ error: "Too many requests, wait a minute." });
  if (!process.env.STRIPE_SECRET_KEY) return res.status(503).json({ error: "Stripe is not configured (STRIPE_SECRET_KEY)." });
  if (!(await isOwner(req))) return res.status(401).json({ error: "Not signed in as the owner. Sign in again." });
  try {
    const b = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const S = stripe();

    if (b.action === "bookings") return res.status(200).json({ bookings: (await availability()).list });

    if (b.action === "payments") {
      // Every payment made on the site (and every checkout that was started but not finished) for the last N days, straight from Stripe.
      const days = Math.min(365, Math.max(1, Math.round(Number(b.days) || 30)));
      const since = Math.floor(Date.now() / 1000) - days * 86400;
      const mv = (v) => { const n = parseFloat(String(v == null ? "" : v).replace(/[^0-9.\-]/g, "")); return Number.isFinite(n) ? n : 0; };
      const ymd = (t) => new Date(t * 1000).toLocaleDateString("en-CA", { timeZone: "America/New_York" });
      const rd = (n) => Math.round(n * 100) / 100;
      const run = async (expand) => {
        const rows = []; let n = 0;
        const args = { limit: 100, created: { gte: since } }; if (expand) args.expand = ["data.payment_intent.latest_charge"];
        for await (const x of S.checkout.sessions.list(args)) { rows.push(x); if (++n >= 500) break; }
        return rows;
      };
      let list; try { list = await run(true); } catch (e) { console.error("payments expand failed", e.message); list = await run(false); }
      const paid = [], unpaid = [], daily = {};
      let live = null;
      for (const x of list) {
        const m = x.metadata || {};
        if (m.app !== "fortune") continue;
        live = x.livemode;
        const base = { id: x.id, created: x.created, name: m.name || "", email: (x.customer_details && x.customer_details.email) || x.customer_email || "", phone: m.phone || "", address: m.address || "", date: m.date || "", dateLabel: m.date_label || "", time: m.time || "", service: m.service || "", lang: m.lang || "" };
        if (x.payment_status === "paid") {
          const pi = x.payment_intent && typeof x.payment_intent === "object" ? x.payment_intent : null;
          const ch = pi && pi.latest_charge && typeof pi.latest_charge === "object" ? pi.latest_charge : null;
          const amount = rd((x.amount_total || 0) / 100), refunded = ch ? rd((ch.amount_refunded || 0) / 100) : 0;
          const totalNum = mv(m.total), tax = mv(m.tax);
          paid.push({ ...base, paid: amount, refunded, subtotal: mv(m.subtotal), tax, taxPaid: totalNum > 0 ? rd(tax * Math.min(1, amount / totalNum)) : 0, total: m.total || "", totalNum, balance: m.balance || "", balanceNum: mv(m.balance), deposit: /deposit/i.test(m.service || "") || (totalNum > 0 && amount < totalNum - 0.01), coupon: m.coupon || "", discount: m.discount || "", sale: m.sale && m.sale !== "-" ? m.sale : "", delivery: m.delivery === "yes", receipt: ch && ch.receipt_url ? ch.receipt_url : "" });
          const k = ymd(x.created); daily[k] = rd((daily[k] || 0) + amount - refunded);
        } else if (x.status === "open" || x.status === "expired") {
          unpaid.push({ ...base, amount: rd((x.amount_total || 0) / 100), state: x.status });
        }
      }
      paid.sort((a, b2) => b2.created - a.created); unpaid.sort((a, b2) => b2.created - a.created);
      const sum = (arr, f) => rd(arr.reduce((t, r) => t + f(r), 0));
      const gross = sum(paid, (r) => r.paid), refunded = sum(paid, (r) => r.refunded);
      return res.status(200).json({
        days, live, daily,
        summary: { count: paid.length, gross, refunded, net: rd(gross - refunded), tax: sum(paid, (r) => r.taxPaid), balanceDue: sum(paid.filter((r) => r.refunded < r.paid), (r) => r.balanceNum), deposits: paid.filter((r) => r.deposit).length, unpaid: unpaid.length },
        payments: paid, unpaid: unpaid.slice(0, 100),
      });
    }

    if (b.action === "codes") {
      const out = []; let n = 0;
      for await (const x of S.promotionCodes.list({ limit: 100 })) {
        const m = x.metadata || {};
        if (m.app === "fortune") out.push({ id: x.id, code: x.code, pct: Number(m.pct) || (x.coupon && x.coupon.percent_off) || 0, amt: Number(m.amt) || (x.coupon && x.coupon.amount_off ? x.coupon.amount_off / 100 : 0) || 0, note: m.note || "", created: x.created,
          state: m.used === "1" ? "used" : x.active ? "ok" : "off", usedDate: m.used_date || "", booking: m.booking || "", customer: m.customer || "" });
        if (++n >= 400) break;
      }
      return res.status(200).json({ codes: out });
    }

    if (b.action === "create") {
      // The owner chooses the kind: "pct" = percent off (1 to 100) or "amt" = dollars off (0.50 to 10,000), and the exact number.
      const isAmt = b.kind === "amt";
      const count = Math.min(20, Math.max(1, Math.round(Number(b.count) || 1)));
      const note = String(b.note || "").slice(0, 80);
      let pct = 0, amt = 0, cp;
      if (isAmt) {
        amt = Math.round(Number(b.amt) * 100) / 100;
        if (!Number.isFinite(amt) || amt < 0.5 || amt > 10000) return res.status(400).json({ error: "Dollar amount must be between $0.50 and $10,000." });
        cp = { amount_off: Math.round(amt * 100), currency: "usd", duration: "once", name: "Fortune Studio code $" + amt.toFixed(2) };
      } else {
        pct = Math.round(Number(b.pct) * 100) / 100;
        if (!Number.isFinite(pct) || pct < 0.01 || pct > 100) return res.status(400).json({ error: "Percent must be between 0.01 and 100." });
        cp = { percent_off: pct, duration: "once", name: "Fortune Studio code " + pct + "%" };
      }
      const coupon = await S.coupons.create(cp);
      const made = [];
      for (let i = 0; i < count; i++) {
        for (let tries = 0; tries < 5; tries++) {
          try {
            const meta = { app: "fortune", note };
            if (isAmt) meta.amt = String(amt); else meta.pct = String(pct);
            const pc = await S.promotionCodes.create({ coupon: coupon.id, code: newCode(), metadata: meta });
            made.push({ id: pc.id, code: pc.code, pct, amt, note, state: "ok", created: pc.created }); break;
          } catch (e) { if (tries === 4) throw e; }
        }
      }
      return res.status(200).json({ made });
    }

    if (b.action === "off") {
      const id = String(b.id || "");
      if (!/^promo_/.test(id)) return res.status(400).json({ error: "bad id" });
      await S.promotionCodes.update(id, { active: false });
      return res.status(200).json({ ok: true });
    }
    res.status(400).json({ error: "unknown action" });
  } catch (e) { console.error(e); res.status(500).json({ error: String(e.message || "Server error").slice(0, 200) }); }
};
