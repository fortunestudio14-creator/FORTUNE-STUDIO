const { stripe } = require("./_lib");

// A discount code is used up the moment its payment is confirmed (idempotent: safe if Stripe retries the webhook).
async function redeem(m) {
  if (!m.coupon_id) return;
  try { await stripe().promotionCodes.update(m.coupon_id, { active: false, metadata: { used: "1", used_date: new Date().toISOString().slice(0, 10), booking: m.date_label || "", customer: String(m.name || "").slice(0, 100) } }); }
  catch (e) { console.error("coupon redeem failed", e.message); }
}

const raw = (r) => new Promise((ok, no) => { const c = []; r.on("data", (x) => c.push(x)); r.on("end", () => ok(Buffer.concat(c))); r.on("error", no); });
const esc = (v) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const OWNER = process.env.OWNER_EMAIL || "fortunestudio14@gmail.com";

async function mail(to, subject, html, replyTo) {
  if (!process.env.RESEND_API_KEY) { console.error("RESEND_API_KEY missing, email not sent"); return false; }
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: "Bearer " + process.env.RESEND_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.MAIL_FROM || "Fortune Studio <onboarding@resend.dev>", to: [to], reply_to: replyTo, subject, html }),
  });
  if (!r.ok) { console.error("mail failed", r.status, await r.text()); return false; }
  return true;
}

const table = (m, keys) => "<table cellpadding='6' style='border-collapse:collapse'>" +
  keys.map(([k, l]) => `<tr><td style='color:#666'>${l}</td><td><b>${esc(m[k])}</b></td></tr>`).join("") + "</table>";

// Every message is sent ONCE. Before sending, a small flag is written on the PaymentIntent (fs_c = customer email, fs_o = owner email).
// If Stripe delivers the same event again (retry, or a failed email), anything already sent is skipped, so nobody gets a duplicate.
async function flag(pi, key, val) { if (pi) await stripe().paymentIntents.update(pi, { metadata: { [key]: val } }); }

async function notify(s) {
  const m = s.metadata || {};
  if (m.app !== "fortune") return;
  const email = s.customer_details?.email || s.customer_email;
  const piId = typeof s.payment_intent === "string" ? s.payment_intent : s.payment_intent && s.payment_intent.id;
  let done = {};
  if (piId) { try { done = (await stripe().paymentIntents.retrieve(piId)).metadata || {}; } catch (e) { console.error("flag read failed", e.message); } }

  const rows = [["date_label", "Date"], ["time", "Start time"], ["service", "Service"], ["subtotal", "Subtotal"], ["tax", "Tax"], ["total", "Total"], ["paid_now", "Paid now"], ["balance", "Remaining balance"]];
  if (m.coupon) rows.splice(1, 0, ["coupon", "Discount code"], ["discount", "Discount"]);
  const owner = [...rows, ...(m.sale && m.sale !== "-" ? [["sale", "Sale"]] : []), ["name", "Name"], ["phone", "Phone"], ["address", "Event address"], ["delivery", "Delivery and pickup"]];
  const brand = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;border:1px solid #e8e1d6;border-radius:14px;overflow:hidden;background:#fff"><div style="background:#171717;color:#f4e7cf;padding:24px;text-align:center"><div style="font-size:24px;letter-spacing:4px;font-weight:700">FORTUNE STUDIO</div><div style="font-size:10px;letter-spacing:3px;margin-top:6px;color:#d8c7a8">LLC · PHOTOGRAPHY & EVENTS</div></div><div style="padding:24px">`;
  const end = `<p style="color:#777;font-size:12px;border-top:1px solid #eee;padding-top:16px;margin-top:24px">Fortune Studio LLC · 570-309-5776 · fortunestudio14@gmail.com</p></div></div>`;

  // 1) customer confirmation: sent once. If it cannot be sent (for example the email domain is not verified yet) we do NOT retry for days,
  //    the owner is told in the owner email instead.
  let customerNote = email ? "sent" : "no email on the payment";
  if (email && !done.fs_c) {
    await flag(piId, "fs_c", "1");
    const ok = await mail(email, "Payment confirmed — your date is reserved · " + m.date_label,
      brand + `<h2 style="color:#171717">Thank you, ${esc(m.name)}!</h2><p>Your payment was received and your reservation details are below.</p>` +
      "<p style='background:#eaf7ee;color:#176b35;padding:12px;border-radius:8px;font-weight:bold'>PAYMENT CONFIRMED</p>" +
      table(m, rows) + "<p>We will contact you if any additional details are needed. The remaining balance, if any, is due before the event.</p>" + end, OWNER);
    if (!ok) { customerNote = "NOT SENT (check the email sender in Resend)"; await flag(piId, "fs_c", "fail").catch(() => {}); }
  } else if (email) customerNote = "already sent";

  // 2) owner alert: sent once. If this one fails we DO want Stripe to retry, and the flag is cleared so the retry can send it.
  if (!done.fs_o) {
    await flag(piId, "fs_o", "1");
    const ok = await mail(OWNER, `NEW PAID BOOKING · ${m.date_label} · ${m.name}`,
      brand + "<h2 style='color:#a61b1b'>NEW PAID BOOKING</h2>" +
      "<p style='background:#b91c1c;color:#fff;padding:14px;border-radius:8px;font-weight:bold'>PAYMENT RECEIVED — PLEASE REVIEW THIS BOOKING</p>" +
      table(m, owner) + `<p><b>Customer email:</b> ${esc(email)}<br><b>Customer confirmation email:</b> ${esc(customerNote)}</p>` + end, email);
    if (!ok) { await flag(piId, "fs_o", "").catch(() => {}); throw new Error("owner booking email failed; Stripe will retry the webhook"); }
  }
}

module.exports = async (req, res) => {
  let ev;
  try { ev = stripe().webhooks.constructEvent(await raw(req), req.headers["stripe-signature"], process.env.STRIPE_WEBHOOK_SECRET); }
  catch (e) { return res.status(400).send("Bad signature"); }
  if (["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(ev.type) && ev.data.object.payment_status === "paid") {
    try { await redeem(ev.data.object.metadata || {}); await notify(ev.data.object); } catch (e) { console.error(e); return res.status(500).send("retry"); }
  }
  res.status(200).json({ received: true });
};
module.exports.config = { api: { bodyParser: false } };
