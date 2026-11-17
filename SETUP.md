[SETUP.md](https://github.com/user-attachments/files/34986220/SETUP.md)
# Setup (10 minutes)

Put `index.html`, `package.json` and the `api/` folder in the root of your Vercel project, then deploy.

1. **Stripe** (stripe.com, free account). Dashboard > Developers > API keys. Copy the Secret key.
2. **Webhook**: Developers > Webhooks > Add endpoint
   URL `https://fortunestudiollc.vercel.app/api/webhook`, events `checkout.session.completed` and `checkout.session.async_payment_succeeded`. Copy the Signing secret.
3. **Payment methods**: Settings > Payment methods. Apple Pay and Google Pay are automatic. PayPal is not used.
4. **Emails** (resend.com, free): create an API key. Without a verified domain, Resend only delivers to your own email, so verify fortunestudio14 domain or use your own domain for `MAIL_FROM`. Stripe also emails the customer a receipt on its own.
5. **Vercel > Settings > Environment Variables**, then redeploy:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_PUBLISHABLE_KEY` (pk_live_... or pk_test_..., Developers > API keys)
   - `STRIPE_WEBHOOK_SECRET`
   - `RESEND_API_KEY`
   - `MAIL_FROM` (example `Fortune Studio <hello@yourdomain.com>`)
   - `OWNER_EMAIL` (optional, default fortunestudio14@gmail.com)

Test first with Stripe test keys and card 4242 4242 4242 4242.

\n## What happens after payment
- The customer is sent to Stripe Checkout to pay securely.
- A date is only treated as reserved after Stripe confirms successful payment.
- Stripe redirects the customer back to the site, which displays the payment confirmation.
- The webhook emails the customer a payment confirmation and sends a red-alert email to `fortunestudio14@gmail.com`.
- Resend email delivery requires a verified sender/domain and the environment variables above.


## Visual website editor (Supabase)
1. In Supabase, open SQL Editor, create a query, paste `supabase-schema.sql`, and run it.
2. In Supabase Storage, create a bucket named `site-media` and turn **Public bucket** on.
3. In Supabase Authentication > Users, create your own admin user with your email and a strong password. Keep public sign-ups disabled.
4. Open `supabase-config.js`. Set `FORTUNE_SUPABASE_URL` to the Project URL and `FORTUNE_SUPABASE_KEY` to the `sb_publishable_...` key. Never use the `sb_secret_...` key in browser code or Vercel public variables.
5. Upload all project files to GitHub, including `admin.html`, `supabase-config.js`, and `supabase-schema.sql`, then redeploy on Vercel.
6. Open `https://YOUR-DOMAIN/admin.html` and sign in with the admin user.

The editor currently supports the English hero headline/description, about paragraph, accent/background colors, and uploading a hero image/video to Storage. Existing booking, Stripe checkout, and webhook files are retained. This is an initial editor; it does not yet provide full product/catalog, gallery, per-language, or booking-management editing.
