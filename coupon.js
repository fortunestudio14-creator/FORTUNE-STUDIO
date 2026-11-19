/* Fortune Studio: one-time discount code box in the booking form (step 3).
   The browser only shows the discount. The server checks the code again at payment and decides the real price (api/coupon.js, api/checkout.js). */
(function () {
  var T = {
    en: { ask: 'Have a discount code?', ph: 'FS-XXXX-XXXX', apply: 'Apply', rm: 'Remove', ok: 'Code {c} applied · {p} off', save: 'You save {a}',
      invalid: 'This code is not valid. Check it and try again.', used: 'This code was already used.', off: 'This code is no longer active.',
      sale: 'Codes cannot be combined with the Black Friday sale.', many: 'Too many tries. Please wait a few minutes.', error: 'We could not check the code right now. Try again.', empty: 'Type your code first.',
      time: 'That start time is no longer available on this date. Please pick another time.', gone: 'The code was removed.' },
    es: { ask: '¿Tienes un código de descuento?', ph: 'FS-XXXX-XXXX', apply: 'Aplicar', rm: 'Quitar', ok: 'Código {c} aplicado · {p} de descuento', save: 'Ahorras {a}',
      invalid: 'Este código no es válido. Revísalo e inténtalo de nuevo.', used: 'Este código ya fue usado.', off: 'Este código ya no está activo.',
      sale: 'Los códigos no se combinan con la oferta de Black Friday.', many: 'Demasiados intentos. Espera unos minutos.', error: 'No pudimos revisar el código ahora. Inténtalo de nuevo.', empty: 'Escribe tu código primero.',
      time: 'Esa hora ya no está disponible en esta fecha. Elige otra hora.', gone: 'Se quitó el código.' },
    fr: { ask: 'Vous avez un code promo ?', ph: 'FS-XXXX-XXXX', apply: 'Appliquer', rm: 'Retirer', ok: 'Code {c} appliqué · -{p}', save: 'Vous économisez {a}',
      invalid: 'Ce code n’est pas valide. Vérifiez-le et réessayez.', used: 'Ce code a déjà été utilisé.', off: 'Ce code n’est plus actif.',
      sale: 'Les codes ne se cumulent pas avec l’offre Black Friday.', many: 'Trop d’essais. Patientez quelques minutes.', error: 'Impossible de vérifier le code pour le moment. Réessayez.', empty: 'Saisissez d’abord votre code.',
      time: 'Cette heure n’est plus disponible à cette date. Choisissez une autre heure.', gone: 'Le code a été retiré.' }
  };
  function lg() { var l; try { l = typeof L !== 'undefined' ? L : 'en'; } catch (e) { l = 'en'; } return T[l] || T.en; }
  var box, inp, btn, msg, form, line, rm, ask;

  var CSS = '.cpn{margin:18px 0 0}.cpn-t{background:none;border:0;padding:4px 0;margin:0;color:var(--ac);font:500 .92rem Outfit,system-ui,sans-serif;cursor:pointer;text-decoration:underline;text-underline-offset:3px;width:auto}' +
    '.cpn-f{display:flex;gap:8px;margin-top:8px;max-width:420px}.cpn-f input{flex:1;min-width:0;text-transform:uppercase;letter-spacing:.08em;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}' +
    '.cpn-f button{flex:none;width:auto;padding:0 18px}.cpn-m{margin-top:8px;font:400 .88rem Outfit,system-ui,sans-serif;color:var(--mu);min-height:1.2em}.cpn-m.bad{color:#ff9d9d}' +
    '.cpn-ok{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:11px 14px;margin-top:8px;border-radius:14px;border:1px solid rgba(123,216,143,.45);background:rgba(36,71,43,.35);color:#c9f0d0;font:500 .9rem Outfit,system-ui,sans-serif}' +
    '.cpn [hidden],.cpn[hidden]{display:none!important}' +
    '.cpn-ok b{font-weight:600}.cpn-ok button{background:none;border:0;color:#c9f0d0;text-decoration:underline;cursor:pointer;font:inherit;padding:0;width:auto}';

  function build() {
    var sb = document.getElementById('sb'), row = sb && sb.parentNode;
    if (!row || box) return !!box;
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    box = document.createElement('div'); box.className = 'cpn'; box.id = 'cpn';
    ask = document.createElement('button'); ask.type = 'button'; ask.className = 'cpn-t';
    form = document.createElement('div'); form.className = 'cpn-f'; form.hidden = true;
    inp = document.createElement('input'); inp.id = 'cpn-i'; inp.autocomplete = 'off'; inp.spellcheck = false; inp.maxLength = 20; inp.setAttribute('autocapitalize', 'characters'); inp.setAttribute('aria-label', 'Discount code');
    btn = document.createElement('button'); btn.type = 'button'; btn.className = 'btn';
    form.append(inp, btn);
    msg = document.createElement('div'); msg.className = 'cpn-m'; msg.setAttribute('role', 'status'); msg.setAttribute('aria-live', 'polite');
    line = document.createElement('div'); line.className = 'cpn-ok'; line.hidden = true;
    var tx = document.createElement('span'); tx.id = 'cpn-tx'; rm = document.createElement('button'); rm.type = 'button';
    line.append(tx, rm);
    box.append(ask, form, msg, line);
    row.parentNode.insertBefore(box, row);
    ask.onclick = function () { form.hidden = !form.hidden; if (!form.hidden) inp.focus(); };
    btn.onclick = apply;
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); apply(); } });
    inp.addEventListener('input', function () { inp.value = inp.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''); });
    rm.onclick = function () { window.FS_CPN = null; setMsg(''); redraw(0, false); if (window.upd) upd(); };
    redraw(0, false);
    return true;
  }
  function setMsg(t, bad) { if (!msg) return; msg.textContent = t || ''; msg.className = 'cpn-m' + (bad ? ' bad' : ''); }
  function redraw(amt, wd) {
    if (!box) return;
    var X = lg(), on = !!window.FS_CPN;
    ask.textContent = X.ask; btn.textContent = X.apply; inp.placeholder = X.ph; rm.textContent = X.rm;
    box.hidden = !!wd; // the wedding deposit is a flat deposit, no codes
    ask.hidden = on; form.hidden = on || form.hidden; line.hidden = !on;
    if (on) document.getElementById('cpn-tx').textContent = X.ok.replace('{c}', FS_CPN.code).replace('{p}', FS_CPN.amt > 0 ? '$' + (+FS_CPN.amt).toFixed(2) : FS_CPN.pct + '%') + (amt > 0 ? ' · ' + X.save.replace('{a}', '$' + amt.toFixed(2)) : '');
  }
  async function apply() {
    var X = lg(), code = inp.value.trim().toUpperCase();
    if (!code) { setMsg(X.empty, true); return; }
    btn.disabled = true; setMsg('…');
    try {
      var r = await fetch('/api/coupon', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: code }) });
      var j = await r.json().catch(function () { return {}; });
      if (r.ok && j.ok) { window.FS_CPN = { code: j.code, pct: j.pct, amt: j.amt || 0 }; inp.value = ''; setMsg(''); if (window.upd) upd(); }
      else setMsg(X[j.reason] || X.error, true);
    } catch (e) { setMsg(X.error, true); }
    btn.disabled = false;
  }
  window.fsCpnShow = function (amt, wd) { if (!box && !build()) return; redraw(amt, wd); };
  window.fsCpnErr = function (reason) { var X = lg(); return X[reason] || X.error; };
  window.fsTimeErr = function () { return lg().time; };
  window.fsCpnReset = function () { window.FS_CPN = null; if (box) { form.hidden = false; redraw(0, false); } if (window.upd) setTimeout(upd, 0); };
  function start() { build(); if (window.upd) { try { upd(); } catch (e) {} } }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
