[SETUP.md](https://github.com/user-attachments/files/35445377/SETUP.md)
[SETUP.md](https://github.com/user-attachments/files/35444940/SETUP.md)
[SETUP.md](https://github.com/user-attachments/files/35442360/SETUP.md)
[SETUP.md](https://github.com/user-attachments/files/35432963/SETUP.md)
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


## New: visitor statistics (country + time on site) and "keep visitors on the site"
New files: `track.js`, `retain.js`, `api/track.js`, `supabase-analytics.sql`. Changed: `index.html` (loads the two scripts), `admin.html` (two new panels). No new environment variables.

1. Supabase > SQL Editor > New query > paste `supabase-analytics.sql` > Run (once).
2. Upload all files to GitHub and redeploy on Vercel.
3. `/admin` > **Visitors: country and time on the site**: visits, online now, average and typical time, % who stayed 30 s / 2 min, % who reached the booking form, countries, sources, devices and the latest visits. Pick 24 hours / 7 / 30 / 90 days. Tick "Do not count my own visits on this device" on your own phone and computer.
   - The country comes from Vercel's `x-vercel-ip-country` header (works on Vercel, no extra service). No IP address is stored.
   - Time only counts while the tab is open and the person moved or scrolled in the last minute.
   - Bots and the admin editor preview are not counted. "Delete all visitor data" is in the same panel.
   - If you collect visitor data, mention it in your privacy policy.
4. `/admin` > **Keep visitors on the site**: progress bar (on), floating Book now button (on), friendly help message after 45 s with a chat button (on), "Before you go" message when a computer visitor leaves (off). Change texts, seconds, then **Save and publish**.


## Update (Nov 25 2026): payments never blocked, one message per payment, new Payments page, better chat, tidy phone layout
Changed: `api/checkout.js`, `api/webhook.js`, `api/chat.js`, `api/manage.js`, `index.html`, `admin.html`, `visitors.html`, `vercel.json`, `robots.txt`. New: `api/health.js`, `payments.html`. No new SQL.

- **Payment never blocked**: customers are sent directly to Stripe's own secure hosted Checkout page. If something is wrong on the server, the browser console (F12) and Vercel logs show the real reason (`stage` and `detail`).
- **One message per payment**: the customer confirmation and the owner alert are each sent ONCE. Before sending, a flag is written on the Stripe payment, so when Stripe retries an event nothing is sent twice. If the customer email cannot be sent (for example the Resend domain is not verified), the owner email says so and nothing is retried in a loop. The site no longer asks Stripe to send its own receipt on top of ours. To also stop Stripe's automatic receipt: Stripe > Settings > Customer emails > turn off "Successful payments".
- **/payments** (owner only, same sign in as /admin): money received, paid bookings, balance still due, every customer's details, checkouts that were started but not paid, download as spreadsheet. The top of the page runs a **system check** for Stripe keys, the webhook address, Resend email, the AI chat and the database, with the exact fix for each problem. **/visitors** shows who visits the site.
- **Customer support chat**: this earlier AI-assistant version has been replaced by the human-agent-only support chat described in the latest update below. The public chat no longer uses OpenAI.
- **Phone layout**: Back to top, Book and Chat sit in one tidy row at the bottom, the Black Friday countdown sits just above it, and everything floating hides while the chat is open.


## PayPal checkout (added; payment-only change)
1. In PayPal Developer, create/select a REST app. Copy its **Client ID** and **Secret**. Start with Sandbox credentials.
2. In Supabase SQL Editor, run `supabase-paypal.sql` once.
3. In Vercel > Settings > Environment Variables, add:
   - `PAYPAL_CLIENT_ID` (Sandbox or Live client ID)
   - `PAYPAL_CLIENT_SECRET` (keep private; never put this in browser code)
   - `PAYPAL_ENV` = `sandbox` for testing, then `live` for real payments
   - `FORTUNE_SUPABASE_SERVICE_ROLE_KEY` = Supabase service-role key (server-only; never expose it in browser code)
   - Keep the existing `FORTUNE_SUPABASE_URL`, `RESEND_API_KEY`, `MAIL_FROM`, and `OWNER_EMAIL`.
4. Redeploy. Test with PayPal Sandbox buyer and seller accounts first. For real payments, change `PAYPAL_ENV` to `live` and use the Live app credentials.
5. **Everything now happens inside the website.** Stripe uses *Embedded Checkout* (card, Apple Pay, Google Pay and Link are drawn in a window on top of your page) and PayPal uses the PayPal button (a small secure PayPal popup opens over the page). Nobody is sent to checkout.stripe.com or paypal.com in a new page. Card numbers go straight from the customer's browser to Stripe/PayPal and never touch your server. Only a server-confirmed payment is marked as paid.
6. **Required for Apple Pay**: Stripe Dashboard > Settings > Payment method domains > add your site domain (and www) and verify it.
7. `STRIPE_PUBLISHABLE_KEY` (pk_live_...) and `PAYPAL_CLIENT_ID` must be set in Vercel. If either is missing the payment window shows the "could not be started" message.

## Customer inbox, live-agent status and system test pages

New/updated files: `admin-inbox.html`, `admin-tests.html`, `admin-tools-common.js`, `api/messages.js`, `api/health.js`, `admin.html`, `index.html`, and `supabase-support.sql`.

1. **Run the database SQL.** In Supabase > SQL Editor > New query, open `supabase-support.sql` from this project and click Run. It creates the private support inbox tables and safely adds email-delivery tracking columns to an existing `support_messages` table. You can run it again if the columns already exist.
2. **Check Vercel environment variables.** The server needs `FORTUNE_SUPABASE_URL`, `FORTUNE_SUPABASE_KEY`, `FORTUNE_SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `MAIL_FROM`, and `OWNER_EMAIL`. Keep the service-role key server-side only. The sender in `MAIL_FROM` must be an address on a domain verified in Resend, for example `Fortune Studio <support@fortunestudiollc.com>` after `fortunestudiollc.com` has been verified in your Resend account.
3. **Upload changed/new files and redeploy.** Do not replace the rest of the website. Merge the files in the update folder into the same-named project paths.
4. **Sign in at `/admin`.** Use the new **Customer Inbox** button to open `/admin-inbox`. Select a conversation to read it. Write your reply and click **Send reply by email**. The page shows whether Resend accepted the email. If an email fails, it stays visible in the thread with its error and a **Retry email** action.
5. **Set availability.** At the top of `/admin-inbox`, switch the real-agent status to Online when you are available, or Offline when you are away. Customers can still leave messages either way. Set the offline message and save.
6. **Use `/admin-tests` for live checks.** **Run full system check** contacts the real Stripe, PayPal, Resend, OpenAI and Supabase services. Stripe checks authenticate/read the account and check its webhook; they do not charge a card. The email test sends a real email to the address you enter. The test-conversation form creates a real, clearly marked TEST conversation in the private inbox and sends a notification to `OWNER_EMAIL`; open it in the inbox and reply to its test email address to test the customer-reply flow end to end.

**Email delivery note:** Resend accepting an email request is not the same as proof that it reached the recipient's inbox. Check the recipient's inbox/spam folder and Resend's email delivery log. The default `onboarding@resend.dev` sender is a testing sender for the verified Resend account owner; it cannot be used for normal customer replies. Messages sent directly to the business email from outside the website are not automatically imported into this website inbox; this feature handles messages submitted through the website chat/contact form.


## Update: human-agent support chat (AI chat removed)
- The floating chat on the public website now connects visitors to a real Fortune Studio team member. It does not answer with AI or automated product/price replies.
- Customers see whether the agent is online. They can click **Talk to an agent** when online or **Leave a message** when offline, enter their name, email and message, then continue the same conversation from the same browser.
- New messages and customer follow-ups are saved in the Supabase support inbox and trigger an email alert to `OWNER_EMAIL`. Open `/admin-inbox` to read and reply. Your reply appears in the customer's chat when they reopen the site and is also emailed through Resend.
- The old `/api/chat` AI endpoint now returns HTTP 410 and is no longer used. The OpenAI health check has been removed from `/admin-tests`; OpenAI is not needed for the customer contact chat. You may remove `OPENAI_API_KEY`, `OPENAI_MODEL` and `OPENAI_BACKUP_MODEL` from Vercel if nothing else in the project uses them.
- Changed files in this update: `index.html`, `admin-tests.html`, `api/health.js`, `api/chat.js`, `privacy.html`, and `SETUP.md`. No new SQL or environment variables are required; the support tables and Resend/Supabase settings from the previous inbox update remain required.

## Update: AI assistant + real agent when online
- The website chat now opens with the **AI assistant** (`api/chat.js`). It answers normally about services, prices and booking.
- The **"Talk to an agent"** button appears only while you switch **Online** in `/admin-inbox`. When you are offline the visitor only sees the AI.
- When a visitor starts an agent chat, the thread is saved in the inbox as before. When you finish, click **Close chat** (or set the status to Closed) in `/admin-inbox`. The visitor's chat then returns to the AI automatically.
- The server also refuses new agent chats while you are offline.
- **Needed in Vercel:** `OPENAI_API_KEY` (optional `OPENAI_MODEL`, default `gpt-4o-mini`), then redeploy. No new SQL.
- Changed files: `api/chat.js`, `api/messages.js`, `index.html` (chat part only), `admin-inbox.html`, `SETUP.md`.
