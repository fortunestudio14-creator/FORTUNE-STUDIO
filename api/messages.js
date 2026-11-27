const crypto = require("crypto");
const { isOwner, limited, badOrigin } = require("./_lib");

const OWNER = String(process.env.OWNER_EMAIL || "fortunestudio14@gmail.com").trim().toLowerCase();
const clean = (v, n = 4000) => String(v == null ? "" : v).replace(/\u0000/g, "").trim().slice(0, n);
const esc = (v) => String(v == null ? "" : v).replace(/[&<>\"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOKEN = /^[A-Za-z0-9_-]{30,100}$/;
const EMAIL = /^\S+@\S+\.\S+$/;
const tokenHash = (v) => crypto.createHash("sha256").update(v).digest("hex");

function config() {
  const url = String(process.env.FORTUNE_SUPABASE_URL || "").replace(/\/$/, "");
  const key = process.env.FORTUNE_SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) throw new Error("Customer inbox is not connected. Add FORTUNE_SUPABASE_URL and FORTUNE_SUPABASE_SERVICE_ROLE_KEY in Vercel, then redeploy.");
  return { url, key };
}

async function db(path, method = "GET", body) {
  const c = config();
  const headers = { apikey: c.key, Authorization: "Bearer " + c.key, "Content-Type": "application/json" };
  if (["POST", "PATCH"].includes(method)) headers.Prefer = "return=representation";
  const response = await fetch(c.url + "/rest/v1/" + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const raw = await response.text();
  let data = null;
  try { data = raw ? JSON.parse(raw) : null; } catch (_) { data = null; }
  if (!response.ok) {
    const reason = data && (data.message || data.details || data.hint);
    throw new Error(reason || ("Supabase returned " + response.status));
  }
  return data;
}

function emailAddress(from) {
  const match = String(from || "").match(/<([^>]+)>/);
  return (match ? match[1] : String(from || "")).trim().toLowerCase();
}

function emailMarkup(title, name, body, footer, isTest = false) {
  const safeTitle = esc(title), safeName = esc(name || "there"), safeBody = esc(body), safeFooter = esc(footer);
  const tag = isTest ? '<div style="display:inline-block;margin:0 0 14px;padding:5px 9px;border-radius:99px;background:#fff1df;color:#805532;font-size:11px;font-weight:700;letter-spacing:.08em">TEST MESSAGE</div>' : "";
  return `<!doctype html><html><body style="margin:0;padding:28px 12px;background:#f4f1ed;font-family:Arial,Helvetica,sans-serif;color:#292521">
  <div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e7dfd7;border-radius:16px;overflow:hidden">
    <div style="padding:23px 28px;background:#211d1a;color:#ffffff">
      <div style="font-family:Georgia,serif;font-size:24px;letter-spacing:.02em">Fortune Studio</div>
      <div style="margin-top:5px;color:#d7b393;font-size:10px;letter-spacing:.18em;text-transform:uppercase">Photography · Events · Studio</div>
    </div>
    <div style="padding:30px 28px">
      ${tag}<h1 style="font-family:Georgia,serif;font-size:25px;line-height:1.25;font-weight:500;color:#342920;margin:0 0 18px">${safeTitle}</h1>
      <p style="font-size:15px;line-height:1.65;margin:0 0 14px">Hello ${safeName},</p>
      <div style="padding:18px 19px;background:#f7f3ef;border:1px solid #eee5dc;border-radius:12px;font-size:15px;line-height:1.75;white-space:pre-wrap;overflow-wrap:anywhere">${safeBody}</div>
      <p style="font-size:14px;line-height:1.65;color:#635d57;margin:20px 0 0">${safeFooter}</p>
      <p style="font-size:14px;line-height:1.6;margin:22px 0 0">Warm regards,<br><b style="color:#392c22">Fortune Studio LLC</b></p>
    </div>
    <div style="padding:15px 28px;background:#f8f6f3;border-top:1px solid #eee6de;color:#81786f;font-size:11px;line-height:1.6">Scranton, Pennsylvania · <a href="https://fortunestudiollc.com" style="color:#936b4b;text-decoration:none">fortunestudiollc.com</a><br>You are receiving this email because you contacted Fortune Studio.</div>
  </div></body></html>`;
}

function emailText(title, name, body, footer, isTest = false) {
  return [isTest ? "[TEST MESSAGE]" : "", title, "", "Hello " + (name || "there") + ",", "", body, "", footer, "", "Warm regards,", "Fortune Studio LLC", "https://fortunestudiollc.com"].filter(Boolean).join("\n");
}

async function mail(to, subject, title, name, body, footer, replyTo, isTest = false) {
  const apiKey = process.env.RESEND_API_KEY || "";
  if (!apiKey) return { sent: false, reason: "RESEND_API_KEY is missing in Vercel. Add it and redeploy." };
  const recipient = clean(to, 254).toLowerCase();
  if (!EMAIL.test(recipient)) return { sent: false, reason: "The recipient email address is invalid." };
  const from = process.env.MAIL_FROM || "Fortune Studio <onboarding@resend.dev>";
  const sender = emailAddress(from);
  // Resend's onboarding sender is only intended for the verified account owner's test inbox.
  if (/@resend\.dev$/i.test(sender) && recipient !== OWNER) {
    return { sent: false, reason: "MAIL_FROM is still using Resend's test sender. It cannot send replies to customers. Verify fortunestudiollc.com in Resend, set MAIL_FROM to an address on that verified domain, and redeploy." };
  }
  const payload = {
    from,
    to: [recipient],
    subject: clean(subject, 180),
    html: emailMarkup(title, name, body, footer, isTest),
    text: emailText(title, name, body, footer, isTest)
  };
  if (replyTo && EMAIL.test(String(replyTo))) payload.reply_to = String(replyTo).trim();
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const raw = await response.text();
    let data = {};
    try { data = raw ? JSON.parse(raw) : {}; } catch (_) {}
    if (!response.ok) return { sent: false, reason: String(data.message || data.name || ("Resend returned " + response.status)).slice(0, 240) };
    return { sent: true, id: data.id || "" };
  } catch (error) {
    return { sent: false, reason: String(error.message || "Resend could not be reached.").slice(0, 240) };
  }
}

async function getSettings() {
  try { const r = await db("support_settings?id=eq.1&select=agent_online,offline_message,ai_enabled"); return (r && r[0]) || {}; }
  catch (_) { const r = await db("support_settings?id=eq.1&select=agent_online,offline_message"); return (r && r[0]) || {}; } // ai_enabled column not created yet
}
const recent = (v, ms) => { const t = v ? Date.parse(v) : 0; return !!t && Date.now() - t < ms; };
async function addMessage(conversationId, sender, body, extra = {}) {
  const rows = await db("support_messages", "POST", { conversation_id: conversationId, sender, body, ...extra });
  return Array.isArray(rows) ? rows[0] : rows;
}
async function updateMessage(messageId, patch) {
  const rows = await db("support_messages?id=eq." + encodeURIComponent(String(messageId)), "PATCH", patch);
  return Array.isArray(rows) ? rows[0] : rows;
}
async function notifyOwner(conv, body) {
  return mail(OWNER, "New website message — " + conv.name, "We received a new customer message", conv.name, body,
    "Open the private Fortune Studio admin inbox to read the full conversation and reply.", conv.email, !!conv.is_test);
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  if (badOrigin(req)) return res.status(403).json({ error: "forbidden" });
  let body;
  try { body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {}); }
  catch (_) { return res.status(400).json({ error: "invalid_json" }); }
  const action = clean(body.action, 40) || "create";

  try {
    if (action === "status") {
      if (limited(req, "support-status", 600, 10 * 60 * 1000)) return res.status(429).json({ error: "Please wait a moment." });
      const setting = await getSettings();
      return res.status(200).json({ agent_online: !!setting.agent_online, ai_enabled: setting.ai_enabled !== false, offline_message: clean(setting.offline_message, 240) || "Leave a message and our team will reply by email." });
    }

    if (action === "create") {
      if (limited(req, "support-create", 5, 10 * 60 * 1000)) return res.status(429).json({ error: "Too many messages. Please wait a few minutes and try again." });
      if (clean(body.website, 200)) return res.status(200).json({ ok: true, email_sent: false });
      const name = clean(body.name, 100), email = clean(body.email, 254).toLowerCase(), message = clean(body.message, 4000);
      if (!name || !EMAIL.test(email) || message.length < 2) return res.status(400).json({ error: "Please enter your name, a valid email address and a message." });
      // Visitors can only start a real-agent conversation while the owner is marked online.
      const availability = await getSettings();
      if (!availability.agent_online && availability.ai_enabled !== false) return res.status(409).json({ error: "No agent is available right now. The virtual assistant can keep helping you." });
      const visitorToken = crypto.randomBytes(32).toString("base64url");
      const now = new Date().toISOString();
      const rows = await db("support_conversations", "POST", { name, email, status: "new", visitor_token_hash: tokenHash(visitorToken), is_test: false, created_at: now, last_message_at: now });
      const conversation = Array.isArray(rows) ? rows[0] : rows;
      if (!conversation || !conversation.id) throw new Error("The message could not be saved in the inbox.");
      try { await addMessage(conversation.id, "customer", message); }
      catch (error) { try { await db("support_conversations?id=eq." + conversation.id, "DELETE"); } catch (_) {} throw error; }
      const notification = await notifyOwner(conversation, message);
      return res.status(200).json({ ok: true, conversation_id: conversation.id, visitor_token: visitorToken, email_sent: notification.sent, email_error: notification.sent ? "" : notification.reason });
    }

    if (action === "thread" || action === "customer_reply" || action === "typing") {
      if (limited(req, action === "customer_reply" ? "support-reply" : "support-" + action, action === "customer_reply" ? 30 : 900, 10 * 60 * 1000)) return res.status(429).json({ error: "Please wait a moment before trying again." });
      const id = clean(body.conversation_id, 50), visitorToken = clean(body.visitor_token, 100);
      if (!UUID.test(id) || !TOKEN.test(visitorToken)) return res.status(400).json({ error: "Invalid conversation." });
      let rows;
      try { rows = await db("support_conversations?id=eq." + id + "&select=id,name,email,status,visitor_token_hash,admin_typing_at"); }
      catch (_) { rows = await db("support_conversations?id=eq." + id + "&select=id,name,email,status,visitor_token_hash"); }
      const conversation = rows && rows[0];
      if (!conversation || !crypto.timingSafeEqual(Buffer.from(conversation.visitor_token_hash), Buffer.from(tokenHash(visitorToken)))) return res.status(403).json({ error: "This conversation link is not valid on this device." });
      if (action === "typing") {
        try { await db("support_conversations?id=eq." + id, "PATCH", { visitor_typing_at: new Date().toISOString() }); } catch (_) {}
        return res.status(200).json({ ok: true });
      }
      if (action === "thread") {
        const messages = await db("support_messages?conversation_id=eq." + id + "&select=id,sender,body,created_at&order=created_at.asc&limit=100");
        const settings = await getSettings();
        return res.status(200).json({ status: conversation.status, messages: messages || [], agent_online: !!settings.agent_online, ai_enabled: settings.ai_enabled !== false, agent_typing: recent(conversation.admin_typing_at, 5000) });
      }
      const message = clean(body.message, 4000);
      if (message.length < 2) return res.status(400).json({ error: "Write a message first." });
      if (conversation.status === "closed") return res.status(409).json({ error: "This conversation is closed. Please start a new message." });
      const saved = await addMessage(id, "customer", message);
      await db("support_conversations?id=eq." + id, "PATCH", { status: "new", last_message_at: new Date().toISOString() });
      // While you are online and watching the inbox, skip the email alert for every chat line.
      let watching = false; try { watching = !!(await getSettings()).agent_online; } catch (_) {}
      const notification = watching ? { sent: true } : await notifyOwner(conversation, message);
      return res.status(200).json({ ok: true, message: saved, email_sent: notification.sent, email_error: notification.sent ? "" : notification.reason });
    }

    if (!(await isOwner(req))) return res.status(401).json({ error: "Not signed in as the owner. Sign in again." });
    if (limited(req, "support-admin", 1500, 10 * 60 * 1000)) return res.status(429).json({ error: "Too many admin requests. Please wait a minute." });

    if (action === "admin_info") {
      return res.status(200).json({ owner_email: OWNER, mail_from: process.env.MAIL_FROM || "Fortune Studio <onboarding@resend.dev>" });
    }

    if (action === "list") {
      let conversations;
      try { conversations = await db("support_conversations?select=id,name,email,status,is_test,created_at,last_message_at,last_replied_at,visitor_typing_at&order=last_message_at.desc&limit=150"); }
      catch (_) { conversations = await db("support_conversations?select=id,name,email,status,is_test,created_at,last_message_at,last_replied_at&order=last_message_at.desc&limit=150"); }
      if (!conversations || !conversations.length) return res.status(200).json({ conversations: [] });
      const ids = conversations.map((item) => item.id).filter((id) => UUID.test(id));
      const messages = ids.length ? await db("support_messages?conversation_id=in.(" + ids.join(",") + ")&select=id,conversation_id,sender,body,created_at,delivery_status,delivery_error,email_id&order=created_at.asc&limit=1500") : [];
      const byConversation = new Map();
      (messages || []).forEach((message) => { const current = byConversation.get(message.conversation_id) || []; current.push(message); byConversation.set(message.conversation_id, current); });
      return res.status(200).json({ conversations: conversations.map((item) => { const { visitor_typing_at, ...rest } = item; return { ...rest, customer_typing: recent(visitor_typing_at, 5000), messages: byConversation.get(item.id) || [] }; }) });
    }

    if (action === "admin_typing") {
      const id = clean(body.conversation_id, 50);
      if (!UUID.test(id)) return res.status(400).json({ error: "Invalid conversation." });
      try { await db("support_conversations?id=eq." + id, "PATCH", { admin_typing_at: new Date().toISOString() }); } catch (_) {}
      return res.status(200).json({ ok: true });
    }

    if (action === "admin_reply") {
      const id = clean(body.conversation_id, 50), message = clean(body.message, 4000);
      if (!UUID.test(id) || message.length < 2) return res.status(400).json({ error: "Choose a conversation and write a reply." });
      const rows = await db("support_conversations?id=eq." + id + "&select=id,name,email,status,is_test");
      const conversation = rows && rows[0];
      if (!conversation) return res.status(404).json({ error: "Conversation not found." });
      if (conversation.status === "closed") return res.status(409).json({ error: "Reopen this conversation before replying." });
      const saved = await addMessage(id, "admin", message, { delivery_status: "pending", delivery_error: "" });
      if (!saved || !saved.id) throw new Error("Your reply could not be saved.");
      if (body.send_email === false) { // live chat reply: the visitor sees it in the website chat, no email
        await updateMessage(saved.id, { delivery_status: "chat", delivery_error: "" });
        await db("support_conversations?id=eq." + id, "PATCH", { status: "replied", last_message_at: new Date().toISOString(), last_replied_at: new Date().toISOString() });
        try { await db("support_conversations?id=eq." + id, "PATCH", { admin_typing_at: null }); } catch (_) {}
        return res.status(200).json({ ok: true, message_id: saved.id, email_sent: false, chat_only: true, email_error: "" });
      }
      const sent = await mail(conversation.email, "Fortune Studio LLC replied to your message", "Fortune Studio has replied to your message", conversation.name, message,
        "You can reply directly to this email if you have another question.", OWNER, !!conversation.is_test);
      await updateMessage(saved.id, { delivery_status: sent.sent ? "sent" : "failed", delivery_error: sent.sent ? "" : sent.reason, email_id: sent.id || null });
      await db("support_conversations?id=eq." + id, "PATCH", { status: sent.sent ? "replied" : "open", last_message_at: new Date().toISOString(), last_replied_at: sent.sent ? new Date().toISOString() : null });
      return res.status(200).json({ ok: true, message_id: saved.id, email_sent: sent.sent, email_id: sent.id || "", email_error: sent.sent ? "" : sent.reason });
    }

    if (action === "retry_email") {
      const id = clean(body.conversation_id, 50), messageId = clean(body.message_id, 30);
      if (!UUID.test(id) || !/^\d{1,20}$/.test(messageId)) return res.status(400).json({ error: "Invalid conversation or message." });
      const rows = await db("support_conversations?id=eq." + id + "&select=id,name,email,status,is_test");
      const conversation = rows && rows[0];
      if (!conversation) return res.status(404).json({ error: "Conversation not found." });
      const messageRows = await db("support_messages?id=eq." + messageId + "&conversation_id=eq." + id + "&select=id,sender,body,delivery_status");
      const message = messageRows && messageRows[0];
      if (!message || message.sender !== "admin") return res.status(404).json({ error: "The reply to retry was not found." });
      const sent = await mail(conversation.email, "Fortune Studio LLC replied to your message", "Fortune Studio has replied to your message", conversation.name, message.body,
        "You can reply directly to this email if you have another question.", OWNER, !!conversation.is_test);
      await updateMessage(message.id, { delivery_status: sent.sent ? "sent" : "failed", delivery_error: sent.sent ? "" : sent.reason, email_id: sent.id || null });
      if (sent.sent) await db("support_conversations?id=eq." + id, "PATCH", { status: "replied", last_replied_at: new Date().toISOString(), last_message_at: new Date().toISOString() });
      return res.status(200).json({ ok: true, email_sent: sent.sent, email_id: sent.id || "", email_error: sent.sent ? "" : sent.reason });
    }

    if (action === "set_status") {
      const id = clean(body.conversation_id, 50), status = clean(body.status, 20);
      if (!UUID.test(id) || !["new", "open", "replied", "closed"].includes(status)) return res.status(400).json({ error: "Invalid conversation status." });
      await db("support_conversations?id=eq." + id, "PATCH", { status });
      return res.status(200).json({ ok: true });
    }

    if (action === "agent_settings") {
      const agentOnline = !!body.agent_online;
      const offlineMessage = clean(body.offline_message, 240) || "Leave a message and our team will reply by email.";
      const patch = { agent_online: agentOnline, offline_message: offlineMessage, updated_at: new Date().toISOString() };
      if (typeof body.ai_enabled === "boolean") patch.ai_enabled = body.ai_enabled;
      let rows, warning = "";
      try { rows = await db("support_settings?id=eq.1", "PATCH", patch); }
      catch (e) {
        if (patch.ai_enabled === undefined || !/ai_enabled|column|schema/i.test(e.message)) throw e;
        delete patch.ai_enabled; warning = "Your online status was saved, but the AI switch needs a one-time database update: run supabase-support.sql again in Supabase > SQL Editor.";
        rows = await db("support_settings?id=eq.1", "PATCH", patch);
      }
      if (!rows || !rows.length) throw new Error("The agent availability setting could not be saved. Run supabase-support.sql again in Supabase SQL Editor.");
      return res.status(200).json({ ok: true, agent_online: agentOnline, ai_enabled: patch.ai_enabled !== false, offline_message: offlineMessage, warning });
    }

    if (action === "test_email") {
      if (limited(req, "support-test-email", 5, 10 * 60 * 1000)) return res.status(429).json({ error: "Wait a few minutes before sending another test email." });
      const to = clean(body.to || OWNER, 254).toLowerCase();
      if (!EMAIL.test(to)) return res.status(400).json({ error: "Enter a valid email address for the test." });
      const sent = await mail(to, "Fortune Studio LLC — email delivery test", "Your Fortune Studio email test is working", "there",
        "This is a real test email sent from the Fortune Studio admin dashboard. It confirms that Resend accepted this message for delivery.",
        "No customer was charged and no booking was created.", OWNER, true);
      if (!sent.sent) return res.status(503).json({ error: sent.reason || "The test email was not accepted by Resend." });
      return res.status(200).json({ ok: true, to, email_id: sent.id || "" });
    }

    if (action === "test_message") {
      if (limited(req, "support-test-message", 5, 10 * 60 * 1000)) return res.status(429).json({ error: "Wait a few minutes before creating another test message." });
      const name = clean(body.name || "Fortune Studio email test", 100), email = clean(body.email, 254).toLowerCase();
      const message = clean(body.message || "This is a test customer message from the admin dashboard.", 4000);
      if (!name || !EMAIL.test(email) || message.length < 2) return res.status(400).json({ error: "Enter a test name, a valid test email and a message." });
      const visitorToken = crypto.randomBytes(32).toString("base64url"), now = new Date().toISOString();
      const rows = await db("support_conversations", "POST", { name, email, status: "new", visitor_token_hash: tokenHash(visitorToken), is_test: true, created_at: now, last_message_at: now });
      const conversation = Array.isArray(rows) ? rows[0] : rows;
      if (!conversation || !conversation.id) throw new Error("The test conversation could not be saved.");
      await addMessage(conversation.id, "customer", message);
      const notification = await notifyOwner(conversation, message);
      return res.status(200).json({ ok: true, conversation_id: conversation.id, email: conversation.email, notification_sent: notification.sent, email_error: notification.sent ? "" : notification.reason });
    }

    return res.status(400).json({ error: "unknown_action" });
  } catch (error) {
    console.error("Support messages API error:", error.message);
    return res.status(500).json({ error: String(error.message || "Server error").slice(0, 240) });
  }
};
