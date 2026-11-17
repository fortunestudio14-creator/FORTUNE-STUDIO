const { bookedDates } = require("./_lib");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=120");
  if (!process.env.STRIPE_SECRET_KEY) return res.status(200).json({ dates: [] });
  try { res.status(200).json({ dates: await bookedDates() }); }
  catch (e) { console.error(e); res.status(200).json({ dates: [] }); }
};
