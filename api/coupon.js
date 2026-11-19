const { couponFor, limited, badOrigin } = require("./_lib");

// Public: the booking form asks "is this code good?" when the customer presses Apply. Strictly limited so codes cannot be guessed.
module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).end();
  if (badOrigin(req)) return res.status(403).json({ ok: false, reason: "error" });
  if (limited(req, "coupon", 12, 10 * 60 * 1000)) return res.status(429).json({ ok: false, reason: "many" });
  if (!process.env.STRIPE_SECRET_KEY) return res.status(200).json({ ok: false, reason: "error" });
  try {
    const b = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const r = await couponFor(b.code);
    res.status(200).json(r.ok ? { ok: true, pct: r.pct, amt: r.amt, code: r.code } : { ok: false, reason: r.reason });
  } catch (e) { console.error(e); res.status(200).json({ ok: false, reason: "error" }); }
};
