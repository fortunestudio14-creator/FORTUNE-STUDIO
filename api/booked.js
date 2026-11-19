const { availability, limited } = require("./_lib");

module.exports = async (req, res) => {
  if (limited(req, "booked", 60, 60 * 1000)) return res.status(429).json({ dates: [] });
  res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=120");
  if (!process.env.STRIPE_SECRET_KEY) return res.status(200).json({ dates: [] });
  try { const a = await availability(); res.status(200).json({ dates: a.blocked, windows: a.windows }); }
  catch (e) { console.error(e); res.status(200).json({ dates: [] }); }
};
