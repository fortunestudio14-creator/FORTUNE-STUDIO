// Fortune Studio now uses a real human-agent support inbox.
// The former AI chat endpoint is intentionally retired.
module.exports = async function retiredChat(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex");
  return res.status(410).json({ error: "AI chat has been retired. Please use the Fortune Studio customer support chat." });
};
