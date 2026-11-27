const crypto = require("crypto");
const { isOwner, limited, badOrigin } = require("./_lib");

const OWNER = process.env.OWNER_EMAIL || "fortunestudio14@gmail.com";
const clean = (v, n = 4000) => String(v == null ? "" : v).replace(/\u0000/g, "").trim().slice(0, n);
const esc = (v) => String(v == null ? "" : v).replace(/[&<>\"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOKEN = /^[A-Za-z0-9_-]{30,100}$/;
const tokenHash = (v) => crypto.createHash("sha256").update(v).digest("hex");

function config() {
  const url = String(process.env.FORTUNE_SUPABASE_URL || "").replace(/\/$/, "");
  const key = process.env.FORTUNE_SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) throw new Error("Customer inbox needs FORTUNE_SUPABASE_URL and FORTUNE_SUPABASE_SERVICE_ROLE_KEY in Vercel.");
  return { url, key };
}
async function db(path, method = "GET", body) {
  const c = config();
  const headers = { apikey: c.key, Authorization: "Bearer " + c.key, "Content-Type": "application/json" };
  if (method === "POST") headers.Prefer = "return=representation";
  if (method === "PATCH") headers.Prefer = "return=representation";
  const r = await fetch(c.url + "/rest/v1/" + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const raw = await r.text();
  let data = null; try { data = raw ? JSON.parse(raw) : null; } catch (e) { data = null; }
  if (!r.ok) throw new Error((data && (data.message || data.details || data.hint)) || ("Supabase returned " + r.status));
  return data;
}
async function mail(to, subject, html, replyTo) {
  if (!process.env.RESEND_API_KEY) return { sent: false, reason: "RESEND_API_KEY is not configured." };
  const from = process.env.MAIL_FROM || "Fortune Studio <onboarding@resend.dev>";
  const payload = { from, to: [to], subject, html };
  if (replyTo) payload.reply_to = replyTo;
  try {
    const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: "Bearer " + process.env.RESEND_API_KEY, "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const raw = await r.text();
    let j = {}; try { j = raw ? JSON.parse(raw) : {}; } catch (e) {}
    return r.ok ? { sent: true, id: j.id || "" } : { sent: false, reason: (j.message || j.name || ("Resend returned " + r.status)).slice(0, 180) };
  } catch (e) { return { sent: false, reason: String(e.message || "Email could not be sent").slice(0, 180) }; }
}
function messageHtml(title, name, body, footer) {
  return "<div style='font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#222'><h2 style='color:#9c6c4c'>" + esc(title) + "</h2><p>Hello " + esc(name || "there") + ",</p><div style='padding:16px;background:#f6f2ee;border-radius:10px;white-space:pre-wrap;line-height:1.6'>" + esc(body) + "</div><p>" + esc(footer) + "</p><p>Fortune Studio LLC</p></div>";
}
async function addMessage(conversationId, sender, body) {
  const rows = await db("support_messages", "POST", { conversation_id: conversationId, sender, body });
  return Array.isArray(rows) ? rows[0] : rows;
}
async function notifyOwner(conv, body) {
  return mail(OWNER, "New website message — " + conv.name, messageHtml("New customer message", conv.name, body, "Reply to this customer from Admin → Customer messages."), conv.email);
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  if (badOrigin(req)) return res.status(403).json({ error: "forbidden" });
  let b;
  try { b = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {}); }
  catch (e) { return res.status(400).json({ error: "invalid_json" }); }
  const action = clean(b.action, 40) || "create";

  try {
    if (action === "status") {
      if (limited(req, "support-status", 120, 10 * 60 * 1000)) return res.status(429).json({ error: "Please wait a moment." });
      const rows = await db("support_settings?id=eq.1&select=agent_online,offline_message");
      const s = rows && rows[0] || {};
      return res.status(200).json({ agent_online: !!s.agent_online, offline_message: clean(s.offline_message, 240) || "Leave a message and our team will reply by email." });
    }

    if (action === "create") {
      if (limited(req, "support-create", 5, 10 * 60 * 1000)) return res.status(429).json({ error: "Too many messages. Please wait a few minutes and try again." });
      // Honeypot: silently accept bot submissions without creating inbox records.
      if (clean(b.website, 200)) return res.status(200).json({ ok: true, email_sent: false });
      const name = clean(b.name, 100), email = clean(b.email, 254).toLowerCase(), body = clean(b.message, 4000);
      if (!name || !/^\S+@\S+\.\S+$/.test(email) || body.length < 2) return res.status(400).json({ error: "Please enter your name, a valid email address and a message." });
      const visitorToken = crypto.randomBytes(32).toString("base64url");
      const now = new Date().toISOString();
      const rows = await db("support_conversations", "POST", { name, email, status: "new", visitor_token_hash: tokenHash(visitorToken), is_test: false, created_at: now, last_message_at: now });
      const conv = Array.isArray(rows) ? rows[0] : rows;
      if (!conv || !conv.id) throw new Error("The message could not be saved in the inbox.");
      try { await addMessage(conv.id, "customer", body); }
      catch (e) { try { await db("support_conversations?id=eq." + conv.id, "DELETE"); } catch (ignored) {} throw e; }
      const notification = await notifyOwner(conv, body);
      return res.status(200).json({ ok: true, conversation_id: conv.id, visitor_token: visitorToken, email_sent: notification.sent });
    }

    if (action === "thread" || action === "customer_reply") {
      if (limited(req, action === "thread" ? "support-thread" : "support-reply", action === "thread" ? 90 : 12, 10 * 60 * 1000)) return res.status(429).json({ error: "Please wait a moment before trying again." });
      const id = clean(b.conversation_id, 50), visitorToken = clean(b.visitor_token, 100);
      if (!UUID.test(id) || !TOKEN.test(visitorToken)) return res.status(400).json({ error: "Invalid conversation." });
      const rows = await db("support_conversations?id=eq." + id + "&select=id,name,email,status,visitor_token_hash");
      const conv = rows && rows[0];
      if (!conv || !crypto.timingSafeEqual(Buffer.from(conv.visitor_token_hash), Buffer.from(tokenHash(visitorToken)))) return res.status(403).json({ error: "This conversation link is not valid on this device." });
      if (action === "thread") {
        const messages = await db("support_messages?conversation_id=eq." + id + "&select=id,sender,body,created_at&order=created_at.asc&limit=100");
        const setting = await db("support_settings?id=eq.1&select=agent_online");
        return res.status(200).json({ status: conv.status, messages: messages || [], agent_online: !!(setting && setting[0] && setting[0].agent_online) });
      }
      const body = clean(b.message, 4000);
      if (body.length < 2) return res.status(400).json({ error: "Write a message first." });
      if (conv.status === "closed") return res.status(409).json({ error: "This conversation is closed. Please start a new message." });
      const msg = await addMessage(id, "customer", body);
      await db("support_conversations?id=eq." + id, "PATCH", { status: "new", last_message_at: new Date().toISOString() });
      const notification = await notifyOwner(conv, body);
      return res.status(200).json({ ok: true, message: msg, email_sent: notification.sent });
    }

    if (!(await isOwner(req))) return res.status(401).json({ error: "Not signed in as the owner. Sign in again." });
    if (limited(req, "support-admin", 90, 10 * 60 * 1000)) return res.status(429).json({ error: "Too many requests. Please wait a minute." });

    if (action === "list") {
      const conversations = await db("support_conversations?select=id,name,email,status,is_test,created_at,last_message_at,last_replied_at&order=last_message_at.desc&limit=100");
      if (!conversations || !conversations.length) return res.status(200).json({ conversations: [] });
      const ids = conversations.map((x) => x.id).filter((x) => UUID.test(x));
      const messages = ids.length ? await db("support_messages?conversation_id=in.(" + ids.join(",") + ")&select=id,conversation_id,sender,body,created_at&order=created_at.asc&limit=1000") : [];
      const by = new Map();
      (messages || []).forEach((m) => { const a = by.get(m.conversation_id) || []; a.push(m); by.set(m.conversation_id, a); });
      return res.status(200).json({ conversations: conversations.map((c) => ({ ...c, messages: by.get(c.id) || [] })) });
    }

    if (action === "admin_reply") {
      const id = clean(b.conversation_id, 50), body = clean(b.message, 4000);
      if (!UUID.test(id) || body.length < 2) return res.status(400).json({ error: "Choose a conversation and write a reply." });
      const rows = await db("support_conversations?id=eq." + id + "&select=id,name,email,status");
      const conv = rows && rows[0];
      if (!conv) return res.status(404).json({ error: "Conversation not found." });
      await addMessage(id, "admin", body);
      await db("support_conversations?id=eq." + id, "PATCH", { status: "replied", last_message_at: new Date().toISOString(), last_replied_at: new Date().toISOString() });
      const sent = await mail(conv.email, "Fortune Studio replied to your message", messageHtml("Fortune Studio has replied", conv.name, body, "You can reply directly to this email if you have another question."), OWNER);
      return res.status(200).json({ ok: true, email_sent: sent.sent, email_error: sent.sent ? "" : sent.reason });
    }

    if (action === "set_status") {
      const id = clean(b.conversation_id, 50), status = clean(b.status, 20);
      if (!UUID.test(id) || !["new", "open", "replied", "closed"].includes(status)) return res.status(400).json({ error: "Invalid status." });
      await db("support_conversations?id=eq." + id, "PATCH", { status });
      return res.status(200).json({ ok: true });
    }

    if (action === "agent_settings") {
      const agent_online = !!b.agent_online;
      const offline_message = clean(b.offline_message, 240) || "Leave a message and our team will reply by email.";
      const rows = await db("support_settings?id=eq.1", "PATCH", { agent_online, offline_message, updated_at: new Date().toISOString() });
      return res.status(200).json({ ok: true, agent_online, offline_message, rows });
    }

    if (action === "test_email") {
      const result = await mail(OWNER, "Fortune Studio — test email", messageHtml("Email test successful", "Admin", "This is a test email from the Fortune Studio admin dashboard. Email delivery is working.", "No customer payment was made."));
      if (!result.sent) return res.status(503).json({ error: result.reason || "Test email was not sent." });
      return res.status(200).json({ ok: true });
    }

    if (action === "test_message") {
      const visitorToken = crypto.randomBytes(32).toString("base64url");
      const now = new Date().toISOString();
      const rows = await db("support_conversations", "POST", { name: "Admin system test", email: OWNER, status: "new", visitor_token_hash: tokenHash(visitorToken), is_test: true, created_at: now, last_message_at: now });
      const conv = Array.isArray(rows) ? rows[0] : rows;
      if (!conv || !conv.id) throw new Error("Test message could not be created.");
      const body = "This is a test customer message. It confirms that the website message form can save a message in the admin inbox. No customer was charged.";
      await addMessage(conv.id, "customer", body);
      const sent = await notifyOwner(conv, body);
      return res.status(200).json({ ok: true, email_sent: sent.sent, email_error: sent.sent ? "" : sent.reason });
    }

    return res.status(400).json({ error: "unknown_action" });
  } catch (e) {
    console.error("Support messages API error:", e.message);
    return res.status(500).json({ error: String(e.message || "Server error").slice(0, 220) });
  }
};
