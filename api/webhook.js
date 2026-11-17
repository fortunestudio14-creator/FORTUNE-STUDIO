const { stripe } = require("./_lib");

const raw = (r) => new Promise((ok, no) => { const c = []; r.on("data", (x) => c.push(x)); r.on("end", () => ok(Buffer.concat(c))); r.on("error", no); });
const esc = (v) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const OWNER = process.env.OWNER_EMAIL || "fortunestudio14@gmail.com";

async function mail(to, subject, html, replyTo) {
  if (!process.env.RESEND_API_KEY) return;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: "Bearer " + process.env.RESEND_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.MAIL_FROM || "Fortune Studio <onboarding@resend.dev>", to: [to], reply_to: replyTo, subject, html }),
  });
  if (!r.ok) console.error("mail failed", r.status, await r.text());
}

const table = (m, keys) => "<table cellpadding='6' style='border-collapse:collapse'>" +
  keys.map(([k, l]) => `<tr><td style='color:#666'>${l}</td><td><b>${esc(m[k])}</b></td></tr>`).join("") + "</table>";

async function notify(s) {
  const m = s.metadata || {};
  if (m.app !== "fortune") return;
  const email = s.customer_details?.email || s.customer_email;
  const rows = [["date_label", "Date"], ["time", "Start time"], ["service", "Service"], ["subtotal", "Subtotal"], ["tax", "Tax"], ["total", "Total"], ["paid_now", "Paid now"], ["balance", "Remaining balance"]];
  const owner = [...rows, ["name", "Name"], ["phone", "Phone"], ["address", "Event address"], ["delivery", "Delivery and pickup"]];
  const head = (t) => `<div style='font-family:Arial,sans-serif;max-width:520px'><h2 style='margin:0 0 12px'>${t}</h2>`;
  const foot = "<p style='color:#666;font-size:13px'>Fortune Studio LLC · 570-309-5776 · fortunestudio14@gmail.com</p></div>";
  if (email) await mail(email, "Payment confirmed — your date is reserved · " + m.date_label,
    head(`Thank you, ${esc(m.name)}! Your payment was received and your date is reserved.`) +
    "<p style='background:#eaf7ee;color:#176b35;padding:12px;border-radius:8px;font-weight:bold'>PAYMENT CONFIRMED</p>" +
    table(m, rows) + "<p>We will contact you if any additional details are needed. The remaining balance, if any, is due before the event.</p>" + foot, OWNER);
  await mail(OWNER, `🔴 NEW PAID BOOKING · ${m.date_label} · ${m.name}`,
    head("🔴 NEW PAID BOOKING") +
    "<p style='background:#b91c1c;color:#fff;padding:14px;border-radius:8px;font-weight:bold'>PAYMENT RECEIVED — ACTION REQUIRED: REVIEW THIS BOOKING</p>" +
    table(m, owner) + `<p><b>Customer email:</b> ${esc(email)}</p>` + foot, email);
}

module.exports = async (req, res) => {
  let ev;
  try { ev = stripe().webhooks.constructEvent(await raw(req), req.headers["stripe-signature"], process.env.STRIPE_WEBHOOK_SECRET); }
  catch (e) { return res.status(400).send("Bad signature"); }
  if (["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(ev.type) && ev.data.object.payment_status === "paid") {
    try { await notify(ev.data.object); } catch (e) { console.error(e); }
  }
  res.status(200).json({ received: true });
};
module.exports.config = { api: { bodyParser: false } };
