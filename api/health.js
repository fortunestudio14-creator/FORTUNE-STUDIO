const { stripe, isOwner, limited, badOrigin } = require("./_lib");

// Owner-only "system check" used by /payments. It never shows a secret, only whether each piece is set up correctly and what to fix.
module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).end();
  if (badOrigin(req)) return res.status(403).json({ error: "forbidden" });
  if (limited(req, "health", 20, 10 * 60 * 1000)) return res.status(429).json({ error: "Too many requests, wait a minute." });
  if (!(await isOwner(req))) return res.status(401).json({ error: "Not signed in as the owner. Sign in again." });

  const out = [];
  const add = (id, label, status, detail, fix) => out.push({ id, label, status, detail, fix: fix || "" });
  const host = String(req.headers.host || "");
  const sk = process.env.STRIPE_SECRET_KEY || "", pk = process.env.STRIPE_PUBLISHABLE_KEY || "", wh = process.env.STRIPE_WEBHOOK_SECRET || "";
  const mode = /_live_/.test(sk) ? "live" : /_test_/.test(sk) ? "test" : "";
  const T = (ms, p) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error("timeout")), ms))]);

  // ---- Stripe secret key
  if (!sk) add("sk", "Stripe secret key", "fail", "STRIPE_SECRET_KEY is missing in Vercel.", "Vercel > Settings > Environment Variables > add STRIPE_SECRET_KEY (Stripe > Developers > API keys > Secret key), then redeploy.");
  else {
    try { await T(8000, stripe().balance.retrieve()); add("sk", "Stripe secret key", "ok", "Works (" + (mode || "unknown") + " mode)."); }
    catch (e) {
      if (e.type === "StripeAuthenticationError") add("sk", "Stripe secret key", "fail", "Stripe refused this key.", "Copy the Secret key again from Stripe > Developers > API keys (no spaces), paste it in Vercel as STRIPE_SECRET_KEY, redeploy.");
      else add("sk", "Stripe secret key", "warn", "The key exists but could not be fully checked: " + String(e.message).replace(/\b(sk|rk)_[A-Za-z0-9_*]+/g, "[key]").slice(0, 120));
    }
  }
  // ---- Publishable key (payment form inside the site)
  if (!pk) add("pk", "Stripe publishable key", "warn", "STRIPE_PUBLISHABLE_KEY is missing. Payments still work, but customers are sent to Stripe's own payment page instead of paying inside your site.", "Stripe > Developers > API keys > Publishable key (starts with pk_). Add it in Vercel as STRIPE_PUBLISHABLE_KEY and redeploy.");
  else if (mode && !pk.includes("_" + mode + "_")) add("pk", "Stripe publishable key", "fail", "The publishable key is a " + (pk.includes("_live_") ? "live" : "test") + " key but the secret key is a " + mode + " key. They must match.", "Use the pk_" + mode + "_ key together with the sk_" + mode + "_ key.");
  else add("pk", "Stripe publishable key", "ok", "Set and matches the secret key.");
  // ---- Webhook (sends the confirmation emails and closes the date)
  if (!wh) add("whs", "Stripe webhook secret", "fail", "STRIPE_WEBHOOK_SECRET is missing, so confirmation emails cannot be sent.", "Stripe > Developers > Webhooks > your endpoint > Signing secret (whsec_...). Add it in Vercel as STRIPE_WEBHOOK_SECRET and redeploy.");
  else add("whs", "Stripe webhook secret", "ok", "Set.");
  if (sk) {
    try {
      const l = await T(8000, stripe().webhookEndpoints.list({ limit: 100 }));
      const mine = l.data.filter((x) => /\/api\/webhook\/?$/.test(x.url));
      const here = mine.find((x) => { try { return new URL(x.url).host.replace(/^www\./, "") === host.replace(/^www\./, ""); } catch (e) { return false; } });
      const needs = ["checkout.session.completed"];
      if (!mine.length) add("whe", "Stripe webhook address", "fail", "No webhook points to /api/webhook yet.", "Stripe > Developers > Webhooks > Add endpoint: https://" + host + "/api/webhook, events checkout.session.completed and checkout.session.async_payment_succeeded.");
      else if (!here) add("whe", "Stripe webhook address", "fail", "Your webhook points to " + mine.map((x) => x.url).join(", ") + " but your site is " + host + ". Confirmation emails go to the wrong place.", "Stripe > Developers > Webhooks > edit the endpoint URL to https://" + host + "/api/webhook (keep the same events). If the signing secret changes, update STRIPE_WEBHOOK_SECRET in Vercel.");
      else if (here.status !== "enabled") add("whe", "Stripe webhook address", "fail", "The webhook exists but is disabled.", "Stripe > Developers > Webhooks > enable it.");
      else if (!here.enabled_events.includes("*") && !needs.every((e) => here.enabled_events.includes(e))) add("whe", "Stripe webhook address", "fail", "The webhook is missing the event checkout.session.completed.", "Stripe > Developers > Webhooks > your endpoint > add events checkout.session.completed and checkout.session.async_payment_succeeded.");
      else add("whe", "Stripe webhook address", "ok", "https://" + host + "/api/webhook is active.");
    } catch (e) { add("whe", "Stripe webhook address", "warn", "Could not read your webhooks (the key may be restricted).", "Open Stripe > Developers > Webhooks and confirm the URL is https://" + host + "/api/webhook."); }
  }
  // ---- Email (confirmation to customer + alert to owner)
  const rk = process.env.RESEND_API_KEY || "", from = process.env.MAIL_FROM || "";
  if (!rk) add("mail", "Email sending (Resend)", "fail", "RESEND_API_KEY is missing: no confirmation or alert emails are sent.", "resend.com > API Keys > create key, add it in Vercel as RESEND_API_KEY and redeploy.");
  else {
    let domains = null;
    try { const r = await T(8000, fetch("https://api.resend.com/domains", { headers: { Authorization: "Bearer " + rk } })); if (r.status === 401) add("mail", "Email sending (Resend)", "fail", "Resend refused the API key.", "Create a new key in Resend and update RESEND_API_KEY in Vercel."); else if (r.ok) domains = (await r.json()).data || []; } catch (e) {}
    if (!out.some((x) => x.id === "mail")) {
      const fd = (from.match(/<([^>]+)>/) || [, from])[1] || "", dom = fd.split("@")[1] || "";
      if (!from || /@resend\.dev$/i.test(fd)) add("mail", "Email sending (Resend)", "warn", "The sender is Resend's test address, which can only email YOU. Customers will not receive their confirmation.", "In Resend > Domains add your domain (for example fortunestudiollc.com), then set MAIL_FROM in Vercel to Fortune Studio <bookings@fortunestudiollc.com> and redeploy.");
      else if (domains && !domains.some((d) => d.name === dom && d.status === "verified")) add("mail", "Email sending (Resend)", "fail", "The domain " + dom + " is not verified in Resend, so emails are rejected.", "Resend > Domains > " + dom + " > add the DNS records it shows and wait until it says Verified.");
      else add("mail", "Email sending (Resend)", "ok", "Sender " + fd + " is ready.");
    }
  }
  add("owner", "Owner email", "ok", "Alerts go to " + (process.env.OWNER_EMAIL || "fortunestudio14@gmail.com") + ".");
  // ---- AI chat
  const ok = process.env.OPENAI_API_KEY || "", model = process.env.OPENAI_MODEL || "gpt-6-luna";
  if (!ok) add("ai", "AI chat assistant", "fail", "OPENAI_API_KEY is missing: the chat falls back to simple built-in answers.", "platform.openai.com > API keys, add it in Vercel as OPENAI_API_KEY and redeploy.");
  else {
    try {
      const r = await T(8000, fetch("https://api.openai.com/v1/models/" + encodeURIComponent(model), { headers: { Authorization: "Bearer " + ok } }));
      if (r.ok) add("ai", "AI chat assistant", "ok", "Model " + model + " is available.");
      else if (r.status === 401) add("ai", "AI chat assistant", "fail", "OpenAI refused the API key.", "Create a new key and update OPENAI_API_KEY in Vercel.");
      else if (r.status === 404) add("ai", "AI chat assistant", "warn", "The model name " + model + " was not found for this key. The chat will use a backup model.", "Set OPENAI_MODEL in Vercel to a model your account can use (for example gpt-4.1-mini).");
      else add("ai", "AI chat assistant", "warn", "OpenAI answered with status " + r.status + ".");
    } catch (e) { add("ai", "AI chat assistant", "warn", "Could not reach OpenAI to test the key."); }
  }
  // ---- Admin / visitors database
  const su = process.env.FORTUNE_SUPABASE_URL, skey = process.env.FORTUNE_SUPABASE_KEY;
  if (!su || !skey) add("db", "Database (Supabase)", "fail", "FORTUNE_SUPABASE_URL or FORTUNE_SUPABASE_KEY is missing.", "Add both in Vercel and redeploy.");
  else {
    try {
      const r = await T(8000, fetch(su.replace(/\/$/, "") + "/rest/v1/site_settings?id=eq.1&select=id", { headers: { apikey: skey, Authorization: "Bearer " + skey } }));
      add("db", "Database (Supabase)", r.ok ? "ok" : "warn", r.ok ? "Connected." : "Supabase answered with status " + r.status + ".");
    } catch (e) { add("db", "Database (Supabase)", "warn", "Could not reach Supabase."); }
  }
  // ---- Customer support inbox (the private message tables are accessed server-side only)
  const supportKey = process.env.FORTUNE_SUPABASE_SERVICE_ROLE_KEY || "";
  if (!su) add("support", "Customer message inbox", "fail", "FORTUNE_SUPABASE_URL is missing.", "Add FORTUNE_SUPABASE_URL in Vercel and redeploy.");
  else if (!supportKey) add("support", "Customer message inbox", "fail", "FORTUNE_SUPABASE_SERVICE_ROLE_KEY is missing.", "Supabase > Project Settings > API > copy the service_role key. Add it in Vercel as FORTUNE_SUPABASE_SERVICE_ROLE_KEY and redeploy. Keep this key private.");
  else {
    try {
      const r = await T(8000, fetch(su.replace(/\/$/, "") + "/rest/v1/support_conversations?select=id&limit=1", { headers: { apikey: supportKey, Authorization: "Bearer " + supportKey } }));
      if (r.ok) add("support", "Customer message inbox", "ok", "Support tables are reachable.");
      else add("support", "Customer message inbox", "fail", r.status === 404 ? "The support tables do not exist yet." : "Supabase answered with status " + r.status + ".", "Supabase > SQL Editor > run supabase-support.sql from the Fortune Studio project.");
    } catch (e) { add("support", "Customer message inbox", "warn", "Could not reach the support tables."); }
  }
  // ---- PayPal (keys, live/sandbox match, and the Supabase table that stores PayPal orders)
  {
    const pid = process.env.PAYPAL_CLIENT_ID || "", psec = process.env.PAYPAL_CLIENT_SECRET || "";
    const pmode = String(process.env.PAYPAL_ENV || process.env.PAYPAL_MODE || "").toLowerCase() === "live" ? "live" : "sandbox";
    if (!pid || !psec) add("pp", "PayPal keys", "fail", "PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET is missing in Vercel.", "Add both in Vercel (PayPal Developer > Apps & Credentials), then redeploy.");
    else {
      const tok = async (m) => { const r = await T(8000, fetch((m === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com") + "/v1/oauth2/token", { method: "POST", headers: { Authorization: "Basic " + Buffer.from(pid + ":" + psec).toString("base64"), "Content-Type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials" })); const j = await r.json().catch(() => ({})); return r.ok && j.access_token; };
      try {
        if (await tok(pmode)) add("pp", "PayPal keys", "ok", "Works (" + pmode + " mode).");
        else {
          const other = pmode === "live" ? "sandbox" : "live";
          let otherOk = false; try { otherOk = await tok(other); } catch (e) {}
          add("pp", "PayPal keys", "fail", otherOk ? "These keys are " + other.toUpperCase() + " keys but the site is in " + pmode.toUpperCase() + " mode." : "PayPal refused the Client ID / Secret.", otherOk ? "In Vercel set PAYPAL_MODE=" + other + " (or use the " + pmode + " keys), then redeploy." : "Copy the Client ID and Secret again from the same PayPal app (no spaces), paste them in Vercel, redeploy.");
        }
      } catch (e) { add("pp", "PayPal keys", "warn", "Could not reach PayPal: " + String(e.message).slice(0, 80)); }
    }
    const pu = process.env.FORTUNE_SUPABASE_URL || "", pkey = process.env.FORTUNE_SUPABASE_SERVICE_ROLE_KEY || "";
    if (!pu || !pkey) add("ppdb", "PayPal orders table", "fail", (!pu ? "FORTUNE_SUPABASE_URL" : "FORTUNE_SUPABASE_SERVICE_ROLE_KEY") + " is missing in Vercel.", "Add it in Vercel (Supabase > Project Settings > API), then redeploy.");
    else {
      try {
        const r = await T(8000, fetch(pu.replace(/\/$/, "") + "/rest/v1/paypal_bookings?select=order_id&limit=1", { headers: { apikey: pkey, Authorization: "Bearer " + pkey } }));
        if (r.ok) add("ppdb", "PayPal orders table", "ok", "paypal_bookings table is ready.");
        else add("ppdb", "PayPal orders table", "fail", r.status === 404 ? "The paypal_bookings table does not exist." : "Supabase answered with status " + r.status + " (check the service role key).", "Supabase > SQL Editor > run the file supabase-paypal.sql once.");
      } catch (e) { add("ppdb", "PayPal orders table", "warn", "Could not reach Supabase."); }
    }
  }
  res.status(200).json({ host, mode, checks: out });
};
