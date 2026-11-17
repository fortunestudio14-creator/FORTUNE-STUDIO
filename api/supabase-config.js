module.exports = (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json");
  const url = process.env.FORTUNE_SUPABASE_URL;
  const key = process.env.FORTUNE_SUPABASE_KEY;
  if (!url || !key) {
    return res.status(500).json({
      error: "Missing FORTUNE_SUPABASE_URL or FORTUNE_SUPABASE_KEY in Vercel Environment Variables."
    });
  }
  return res.status(200).json({ url, key });
};
