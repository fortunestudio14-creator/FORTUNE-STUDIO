// Vercel serverless function: POST /api/checkout
// Creates a Stripe Checkout session and returns { url }.
// Needs the environment variable STRIPE_SECRET_KEY (sk_live_... or sk_test_...) in Vercel.

const TAX = 0.06;        // Pennsylvania sales tax, same as the website
const DEP = 0.5;         // deposit percent for rentals and photo sessions
const WED_HR = 150;      // wedding and event coverage, price per hour
const WED_DEP = 100;     // wedding and event deposit
const BASE_H = 4;        // hours included in rentals
const EXTRA = 0.25;      // each extra rental hour adds 25 percent
const PHOTO = { p30: 99, p45: 139, p60: 179, p90: 249, p120: 319 };
const NAMES = {
  c: 'Custom rental, tables and chairs',
  55: 'Party package',
  110: 'Celebration package',
  w: 'Wedding and event coverage',
  p30: 'Photo session 30 min',
  p45: 'Photo session 45 min',
  p60: 'Photo session 60 min',
  p90: 'Photo session 90 min',
  p120: 'Photo session 120 min'
};

const clamp = (v, a, b) => Math.min(b, Math.max(a, Math.floor(+v || 0)));
const r2 = (n) => Math.round(n * 100) / 100;
const cut = (v, n) => String(v == null ? '' : v).slice(0, n);

function price(b) {
  const pk = String(b.pk || '');
  if (!(pk in NAMES)) throw new Error('bad package');
  const isPhoto = pk[0] === 'p';
  const wed = pk === 'w';
  const h = clamp(b.hr, 1, 24) || BASE_H;
  let s;
  if (isPhoto) s = PHOTO[pk];
  else if (pk === '55') s = 55;
  else if (pk === '110') s = 110;
  else if (wed) s = WED_HR * h;
  else s = clamp(b.qt, 0, 6) * 12 + clamp(b.qc, 0, 40) * 3;
  if (!isPhoto && !wed) s += Math.round(s * Math.max(0, h - BASE_H) * EXTRA);
  if (!isPhoto && !wed && b.delivery) s += 25;
  if (s <= 0) throw new Error('empty order');
  const tax = r2(s * TAX);
  const total = r2(s + tax);
  const dep = wed || b.pp === 'dep';
  const due = dep ? (wed ? Math.min(total, WED_DEP) : r2(total * DEP)) : total;
  return { due, total, balance: r2(total - due), dep, name: NAMES[pk] };
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method' });
  }
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return res.status(500).json({ error: 'missing STRIPE_SECRET_KEY' });

  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  b = b || {};

  let p;
  try { p = price(b); } catch (e) { return res.status(400).json({ error: e.message }); }

  const email = cut(b.email, 200);
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'email' });

  const proto = req.headers['x-forwarded-proto'] || 'https';
  const origin = proto + '://' + (req.headers['x-forwarded-host'] || req.headers.host);

  const f = new URLSearchParams();
  f.set('mode', 'payment');
  f.set('customer_email', email);
  f.set('success_url', origin + '/?paid=1#book');
  f.set('cancel_url', origin + '/#book');
  f.set('line_items[0][quantity]', '1');
  f.set('line_items[0][price_data][currency]', 'usd');
  f.set('line_items[0][price_data][unit_amount]', String(Math.round(p.due * 100)));
  f.set('line_items[0][price_data][product_data][name]',
    'Fortune Studio - ' + p.name + (p.dep ? ' (deposit)' : ''));
  f.set('line_items[0][price_data][product_data][description]',
    cut((b.date || '') + ' ' + (b.time || ''), 200).trim() || 'Fortune Studio LLC');
  f.set('payment_intent_data[receipt_email]', email);

  const meta = {
    service: p.name, date: cut(b.date, 100), time: cut(b.time, 100),
    delivery: b.delivery ? 'yes' : 'no',
    tables: String(clamp(b.qt, 0, 6)), chairs: String(clamp(b.qc, 0, 40)),
    hours: String(clamp(b.hr, 0, 24)),
    name: cut(b.name, 200), phone: cut(b.phone, 40), address: cut(b.address, 400),
    total: p.total.toFixed(2), paid_now: p.due.toFixed(2), balance: p.balance.toFixed(2)
  };
  Object.keys(meta).forEach((k) => {
    f.set('metadata[' + k + ']', meta[k]);
    f.set('payment_intent_data[metadata][' + k + ']', meta[k]);
  });

  try {
    const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + key,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: f.toString()
    });
    const j = await r.json();
    if (!r.ok || !j.url) {
      console.error('Stripe error', j && j.error);
      return res.status(502).json({ error: 'stripe' });
    }
    return res.status(200).json({ url: j.url });
  } catch (e) {
    console.error(e);
    return res.status(502).json({ error: 'network' });
  }
};
