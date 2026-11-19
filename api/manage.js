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
