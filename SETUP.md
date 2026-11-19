[SETUP.md](https://github.com/user-attachments/files/35069034/SETUP.md)
[SETUP.md](https://github.com/user-attachments/files/34992208/SETUP.md)
[SETUP.md](https://github.com/user-attachments/files/34986220/SETUP.md)
# Setup (10 minutes)

Put `index.html`, `package.json` and the `api/` folder in the root of your Vercel project, then deploy.

1. **Stripe** (stripe.com, free account). Dashboard > Developers > API keys. Copy the Secret key.
2. **Webhook**: Developers > Webhooks > Add endpoint
   URL `https://fortunestudio.vercel.app/api/webhook`, events `checkout.session.completed` and `checkout.session.async_payment_succeeded`. Copy the Signing secret.
3. **Payment methods**: Settings > Payment methods. Apple Pay and Google Pay are automatic. PayPal is not used.
4. **Emails** (resend.com): create an API key and add it to Vercel as `RESEND_API_KEY`. The email template displays a Fortune Studio text wordmark; to show the actual logo image, add a publicly hosted logo image URL and update the template. Resend's `onboarding@resend.dev` sender is for testing and can only send to the account owner's verified email. To email customers, verify a domain in Resend and set `MAIL_FROM` to an address on that verified domain, for example `Fortune Studio <bookings@yourdomain.com>`. Stripe also sends its own payment receipt.
5. **Vercel > Settings > Environment Variables**, then redeploy:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_PUBLISHABLE_KEY` (pk_live_... or pk_test_..., Developers > API keys)
   - `STRIPE_WEBHOOK_SECRET`
   - `RESEND_API_KEY`
   - `MAIL_FROM` (example `Fortune Studio <hello@yourdomain.com>`)
   - `OWNER_EMAIL` (optional, default fortunestudio14@gmail.com)

After changing environment variables, redeploy the Production deployment. Confirm the Stripe webhook endpoint is exactly `https://fortunestudio.vercel.app/api/webhook` and that the endpoint has the two events listed above.

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


## Security (added)
- `vercel.json` sends security headers on every page (HTTPS only, no embedding in other sites, no MIME sniffing, strict referrer, blocked camera/microphone). A full Content-Security-Policy is sent in **report-only** mode: open the site, open the browser console (F12), pay with a Stripe test card, and if no "Content Security Policy" warnings appear, rename the header `Content-Security-Policy-Report-Only` to `Content-Security-Policy` in `vercel.json` to enforce it.
- `supabase-security.sql`: edit the email, run it once in Supabase. Only that email can change the site. Keep public sign-ups OFF and turn on MFA for the admin user.
- `.vercelignore` stops SETUP.md, the SQL files and unused files from being downloadable from the live site.
- The API refuses requests from other websites and limits how fast one visitor can create checkouts or use the chat. For a hard limit, also add a rate-limit rule in Vercel > Firewall.
- Prices are always calculated on the server, so nobody can change an amount in the browser, including the Black Friday discount.

## Rent for your event + Black Friday (admin)
- `/admin` > **Rent for your event: prices and stock**: set how many tables and chairs a customer can book online (default 30 tables, 200 chairs, change to your real stock) and every price.
- `/admin` > **Black Friday sale**: default is 10% off from Nov 27 2026 12:00 AM (Scranton time) until Nov 30 2026 12:00 AM, when prices return to normal by themselves. Before it starts the site shows a countdown. You can change the percent and dates, or switch it off.
- Add `blackfriday.js` and `api/sale.js` to the project (they are included in this folder).

## New: Black Friday alert, one-time coupon codes, re-open dates/hours, editable "Rent for your event"
New files: `coupon.js`, `api/coupon.js`, `api/manage.js`. Changed: `index.html`, `blackfriday.js`, `cms.js`, `admin.html`, `api/_lib.js`, `api/checkout.js`, `api/booked.js`, `api/webhook.js`. Upload everything and redeploy. No new SQL and no new environment variables (the admin API uses `FORTUNE_SUPABASE_URL`, `FORTUNE_SUPABASE_KEY`, `STRIPE_SECRET_KEY` and `OWNER_EMAIL` that you already have).

- **Black Friday alert**: when someone opens the site (while the sale is coming or live) a popup appears once per visit, closes by itself after 12 seconds (or with the X), then only a tiny almost invisible reminder stays in the bottom-left corner (it becomes clear when touched and reopens the alert). The big banner no longer takes space on the page. `/admin` > Black Friday sale: switch the alert on/off and "Preview the alert".
- **Coupon codes** (`/admin` > Coupon codes): choose the % (default 10) and how many, click Create. Each code looks like `FS-7K4M-9QXD`, works for ONE booking only, and is switched off automatically when that payment is confirmed. "Copy message" gives you a ready text to send. The customer types it in the last step of the booking form and sees the discount before paying. The server checks it again, so it cannot be faked. Codes are stored as Stripe Promotion Codes (Dashboard > Product catalog > Coupons) so you can also see them there. Not valid on the wedding deposit. By default a code cannot be combined with the Black Friday sale (checkbox in the same panel changes that).
- **Re-open a date or hours** (`/admin` > Available dates and hours): lists upcoming PAID bookings. "Make this date available again" re-opens the whole date (for a cancellation or refund; refund the payment yourself in Stripe). "Open only these hours" keeps the date open but customers can only pick a start time inside the window you set. A new booking on that date closes it again. Click Save and publish; customers see it within about a minute.
- **Rent for your event**: `/admin` > "Rent for your event: title, text and button" edits the title, text, card texts, note, button text and where the title and button go. Titles/buttons that carry text on the site can now also have their link changed by clicking them in the editor.

## Update: choose the exact discount (% or $)
In `/admin` > Coupon codes you now pick the type of discount and the exact number:
- **Percent off**: 0.01 to 100 (100 = free, but the customer still pays the small card minimum, about $1 before tax / $0.50 charged).
- **Dollars off**: $0.50 to $10,000, taken from the price before tax.
Changed files: `api/_lib.js`, `api/manage.js`, `api/coupon.js`, `api/checkout.js`, `coupon.js`, `index.html`, `admin.html`. Upload all of them together, then redeploy.
