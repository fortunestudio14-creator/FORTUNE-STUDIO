const { limited, badOrigin } = require("./_lib");

// Receives the small "heartbeat" from /track.js and stores it in Supabase (table site_visits).
// The country comes from Vercel's own header (x-vercel-ip-country), so no IP address is stored and no extra service is needed.
const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse|pingdom|uptime|monitor|curl|wget|python|node-fetch|axios/i;
const cut = (v, n) => String(v == null ? "" : v).slice(0, n);
const dec = (v) => { try { return decodeURIComponent(String(v || "")); } catch (e) { return String(v || ""); } };

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).end();
  if (badOrigin(req)) return res.status(403).end();
  if (limited(req, "track", 400, 10 * 60 * 1000)) return res.status(429).end();
  if (BOT.test(String(req.headers["user-agent"] || ""))) return res.status(204).end();
  const url = process.env.FORTUNE_SUPABASE_URL, key = process.env.FORTUNE_SUPABASE_KEY;
  if (!url || !key) return res.status(204).end();
  try {
    const b = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const sid = cut(b.sid, 64);
    if (!/^[A-Za-z0-9-]{8,64}$/.test(sid)) return res.status(400).end();
    const country = cut(req.headers["x-vercel-ip-country"], 2).toUpperCase();
    const r = await fetch(url.replace(/\/$/, "") + "/rest/v1/rpc/track_visit", {
      method: "POST",
      headers: { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({
        p_sid: sid, p_country: /^[A-Z]{2}$/.test(country) ? country : "", p_city: cut(dec(req.headers["x-vercel-ip-city"]), 60),
        p_path: cut(b.p, 120), p_ref: cut(b.r, 80), p_device: cut(b.d, 12), p_lang: cut(b.l, 8),
        p_seconds: Math.round(Number(b.s) || 0), p_scroll: Math.round(Number(b.sc) || 0), p_book: b.b === true,
      }),
    });
    if (!r.ok) console.error("track_visit failed", r.status);
    return res.status(204).end();
  } catch (e) { console.error("track", e.message); return res.status(204).end(); }
};
