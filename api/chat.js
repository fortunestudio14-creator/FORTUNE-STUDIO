// Fortune Studio AI assistant: answers visitors' questions in the website chat.
// A real human agent is only offered by the front end when the owner marks themselves online (see api/messages.js).
// Needs OPENAI_API_KEY in Vercel (optional: OPENAI_MODEL, default gpt-4o-mini).
const { limited, badOrigin } = require("./_lib");

const SYSTEM = `You are the friendly virtual assistant of Fortune Studio LLC, a photography studio and event-rental company in Scranton, Pennsylvania, USA.
Reply in the same language the visitor writes in (English, Spanish, French, Haitian Creole or other). Keep answers short, warm and clear (2 to 5 sentences).

Facts you may use (never invent anything else):
- Portrait photography sessions, 30 to 120 minutes, starting from $99. Every session includes professionally edited digital photos.
- Wedding and event photo and video coverage: $150 per hour, 4 hour minimum, plus tax. We come to you. A $100 deposit holds the date.
- Table and chair rentals, party and celebration packages, studio space rental by the hour. Delivery and pickup available for an additional fee.
- Pennsylvania sales tax applies. Online booking (date, time, payment by card, Apple Pay or Google Pay) is at https://fortunestudiollc.com/#book
- Phone: 570-309-5776. Email: fortunestudio14@gmail.com. Website languages: English, Spanish, French.

Rules:
- If you do not know something (exact availability, a custom quote, a special request, a complaint), say so and suggest booking online, calling 570-309-5776 or emailing fortunestudio14@gmail.com. Never guess prices or dates.
- If the visitor wants a real person, follow the "Live agent status" line at the end of these instructions.
- Never ask for card numbers or passwords. Do not discuss topics unrelated to Fortune Studio; politely steer back.`;

const clean = (v, n) => String(v == null ? "" : v).replace(/\u0000/g, "").trim().slice(0, n);

module.exports = async function chat(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  if (badOrigin(req)) return res.status(403).json({ error: "forbidden" });
  if (limited(req, "ai-chat", 30, 10 * 60 * 1000)) return res.status(429).json({ error: "Please wait a moment before sending more messages." });

  let body;
  try { body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {}); }
  catch (_) { return res.status(400).json({ error: "invalid_json" }); }

  const incoming = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
  const messages = incoming
    .map((m) => ({ role: m && m.role === "assistant" ? "assistant" : "user", content: clean(m && m.content, 1500) }))
    .filter((m) => m.content);
  if (!messages.length || messages[messages.length - 1].role !== "user") return res.status(400).json({ error: "Write a message first." });

  const apiKey = process.env.OPENAI_API_KEY || "";
  if (!apiKey) return res.status(503).json({ error: "The assistant is not connected. Add OPENAI_API_KEY in Vercel and redeploy." });

  // Tell the assistant whether a real agent is online right now (best effort: never blocks the answer).
  let agentOnline = false;
  try {
    const url = String(process.env.FORTUNE_SUPABASE_URL || "").replace(/\/$/, ""), key = process.env.FORTUNE_SUPABASE_SERVICE_ROLE_KEY || "";
    if (url && key) {
      const r = await fetch(url + "/rest/v1/support_settings?id=eq.1&select=agent_online", { headers: { apikey: key, Authorization: "Bearer " + key } });
      const rows = await r.json().catch(() => null);
      agentOnline = !!(Array.isArray(rows) && rows[0] && rows[0].agent_online);
    }
  } catch (_) {}
  const system = SYSTEM + "\n\nLive agent status right now: " + (agentOnline
    ? "A real agent IS available. If the visitor wants a person, tell them to tap the \"Talk to an agent\" button under the chat."
    : "NO agent is available yet. If the visitor asks for a person, say clearly that no agent is available yet, that you will notify them in this chat as soon as one comes online, and meanwhile you can help or they can call or email.");

  const models = [process.env.OPENAI_MODEL, process.env.OPENAI_BACKUP_MODEL, "gpt-4o-mini"]
    .map((m) => String(m || "").trim()).filter((m, i, all) => m && all.indexOf(m) === i);
  let lastStatus = 0, lastCode = "";
  for (const model of models) {
    try {
      // max_completion_tokens and no custom temperature: works for both older (gpt-4o) and newer (gpt-5, o-series) models.
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          max_completion_tokens: /^(gpt-5|o\d)/i.test(model) ? 1200 : 400,
          ...(/^(gpt-5|o\d)/i.test(model) ? { reasoning_effort: "minimal" } : {}),
          messages: [{ role: "system", content: system }].concat(messages)
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        lastStatus = response.status; lastCode = String((data && data.error && (data.error.code || data.error.type)) || "");
        console.error("AI chat error:", model, response.status, data && data.error && data.error.message);
        if (response.status === 401 || response.status === 429 && lastCode === "insufficient_quota") break; // another model will not fix a bad key or empty balance
        continue;
      }
      const reply = clean(data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content, 2000);
      if (reply) return res.status(200).json({ reply, agent_online: agentOnline });
      console.error("AI chat empty reply from", model);
    } catch (error) {
      console.error("AI chat error:", model, error.message);
    }
  }
  return res.status(502).json({ error: "The assistant could not answer right now.", code: lastCode || String(lastStatus || "network") });
};
