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


// Built-in answers used only when OpenAI is unavailable (bad key, no credit, outage), so visitors never hit a dead end.
function guessLang(text, hint) {
  const t = " " + String(text || "").toLowerCase() + " ";
  if (/\b(bonjou|bonswa|komn|kijan|mwen|ou ye|sak pase|souple|mèsi|mesi|pri|ki jan|nap|wi|non)\b/.test(t)) return "ht";
  if (/[¿¡ñ]|\b(hola|precio|precios|cuánto|cuanto|reservar|gracias|buenos|buenas|quiero|alquiler)\b/.test(t)) return "es";
  if (/\b(bonjour|salut|prix|tarif|tarifs|réserver|reserver|merci|combien|séance|seance|je veux|location)\b/.test(t)) return "fr";
  if (/\b(hello|hi|hey|price|prices|book|how much|thanks|thank you|session|rental)\b/.test(t)) return "en";
  return ["en", "es", "fr", "ht"].includes(hint) ? hint : "en";
}
const FB = {
  en: {
    hi: "Hi! I’m the Fortune Studio assistant. I can help with portrait sessions, event coverage, rentals and booking. What would you like to know?",
    price: "Portrait sessions start from $99 (30 to 120 minutes, edited digital photos included). Wedding and event coverage is $150 per hour with a 4 hour minimum plus tax. Tables and chairs, party packages and studio space are also available. Book at https://fortunestudiollc.com/#book",
    book: "You can book online (date, time and payment by card, Apple Pay or Google Pay) at https://fortunestudiollc.com/#book. For a custom request call 570-309-5776 or email fortunestudio14@gmail.com.",
    rent: "We rent tables and chairs, party and celebration packages, and studio space by the hour. Delivery and pickup are available for an additional fee. Call 570-309-5776 for a custom quote.",
    other: "Thanks for your message! I can’t answer that one right now. Please call 570-309-5776 or email fortunestudio14@gmail.com, or book online at https://fortunestudiollc.com/#book."
  },
  es: {
    hi: "¡Hola! Soy el asistente de Fortune Studio. Puedo ayudarte con sesiones de retrato, cobertura de eventos, alquileres y reservas. ¿Qué te gustaría saber?",
    price: "Las sesiones de retrato empiezan desde $99 (30 a 120 minutos, fotos digitales editadas incluidas). La cobertura de bodas y eventos cuesta $150 por hora con mínimo de 4 horas más impuestos. También alquilamos mesas, sillas, paquetes de fiesta y estudio. Reserva en https://fortunestudiollc.com/#book",
    book: "Puedes reservar en línea (fecha, hora y pago con tarjeta, Apple Pay o Google Pay) en https://fortunestudiollc.com/#book. Para algo personalizado llama al 570-309-5776 o escribe a fortunestudio14@gmail.com.",
    rent: "Alquilamos mesas, sillas, paquetes de fiesta y espacio de estudio por hora. Entrega y recogida disponibles con costo adicional. Llama al 570-309-5776 para una cotización.",
    other: "¡Gracias por tu mensaje! Ahora mismo no puedo responder eso. Llama al 570-309-5776, escribe a fortunestudio14@gmail.com o reserva en https://fortunestudiollc.com/#book."
  },
  fr: {
    hi: "Bonjour ! Je suis l’assistant de Fortune Studio. Je peux vous aider pour les séances portrait, les événements, les locations et les réservations. Que souhaitez-vous savoir ?",
    price: "Les séances portrait commencent à 99 $ (30 à 120 minutes, photos numériques retouchées incluses). La couverture de mariages et d’événements coûte 150 $ de l’heure, minimum 4 heures, taxes en sus. Nous louons aussi tables, chaises, forfaits fête et studio. Réservez sur https://fortunestudiollc.com/#book",
    book: "Vous pouvez réserver en ligne (date, heure et paiement par carte, Apple Pay ou Google Pay) sur https://fortunestudiollc.com/#book. Pour une demande spéciale, appelez le 570-309-5776 ou écrivez à fortunestudio14@gmail.com.",
    rent: "Nous louons des tables, des chaises, des forfaits fête et le studio à l’heure. Livraison et récupération possibles moyennant un supplément. Appelez le 570-309-5776 pour un devis.",
    other: "Merci pour votre message ! Je ne peux pas répondre à cela pour le moment. Appelez le 570-309-5776, écrivez à fortunestudio14@gmail.com ou réservez sur https://fortunestudiollc.com/#book."
  },
  ht: {
    hi: "Bonjou! Mwen se asistan Fortune Studio. Mwen ka ede w ak sesyon foto, evènman, lokasyon ak rezèvasyon. Kisa w ta renmen konnen?",
    price: "Sesyon foto pòtrè kòmanse a $99 (30 a 120 minit, foto dijital edite enkli). Kouvèti maryaj ak evènman se $150 chak èdtan, minimòm 4 èdtan plis taks. Nou louwe tab, chèz, pake fèt ak espas estidyo tou. Rezève sou https://fortunestudiollc.com/#book",
    book: "Ou ka rezève sou entènèt (dat, lè ak peman ak kat, Apple Pay oswa Google Pay) sou https://fortunestudiollc.com/#book. Pou yon demann espesyal rele 570-309-5776 oswa ekri fortunestudio14@gmail.com.",
    rent: "Nou louwe tab, chèz, pake fèt ak espas estidyo pa èdtan. Livrezon ak ranmase disponib pou yon frè anplis. Rele 570-309-5776 pou yon pri.",
    other: "Mèsi pou mesaj ou! Mwen pa ka reponn sa kounye a. Rele 570-309-5776, ekri fortunestudio14@gmail.com oswa rezève sou https://fortunestudiollc.com/#book."
  }
};
function fallbackReply(messages, hint) {
  const last = (messages[messages.length - 1] || {}).content || "";
  const lang = guessLang(last, hint), F = FB[lang];
  const t = last.toLowerCase();
  if (/(price|cost|how much|rate|precio|cu[aá]nto|prix|tarif|combien|pri\b|konbyen|kobyen|\$)/.test(t)) return F.price;
  if (/(book|reserv|appointment|date|cita|r[eé]server|rendez|randevou|rezèv)/.test(t)) return F.book;
  if (/(rent|table|chair|mesa|silla|alquil|louer|location|chèz|chez|tab\b|louwe|lokasyon)/.test(t)) return F.rent;
  if (/^(hi|hello|hey|hola|buenas|buenos|bonjour|salut|bonjou|bonswa|komn|kijan|sak pase|nap|wi\b)/.test(t.trim()) || t.length < 14 && /(ou ye|sak pase|how are|que tal|ça va|ca va)/.test(t)) return F.hi;
  return F.other;
}

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
  if (!apiKey) return res.status(200).json({ reply: fallbackReply(messages, body.lang), agent_online: false, fallback: true, code: "no_key" });

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
  const code = lastCode || String(lastStatus || "network");
  console.error("AI chat fallback used. OpenAI code:", code);
  return res.status(200).json({ reply: fallbackReply(messages, body.lang), agent_online: agentOnline, fallback: true, code });
};
