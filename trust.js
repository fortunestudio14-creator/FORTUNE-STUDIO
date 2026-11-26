/* Fortune Studio trust pieces: FAQ section, legal links, WhatsApp link, cookie notice. Same look as the site (uses its own classes).
   Languages: English, Spanish, French (follows the site language switch). */
(function () {
  var D = document;
  var P = "tel:+15703095776", M = "mailto:fortunestudio14@gmail.com";
  var T = {
    en: {
      fq: "Frequently asked questions", faqLink: "FAQ", wa: "WhatsApp", wam: "Hello Fortune Studio! I am visiting your website ({u}) and I would like more information.", priv: "Privacy Policy", terms: "Terms of Service", canc: "Cancellation & Refunds",
      ck: "We use cookies and similar tools to understand how the site is used and to improve it.", ok: "Accept", no: "Decline",
      q: [
        ["How do I book?", ["Use the booking form on this page: choose your service and date, then pay securely online. A date is only reserved after your payment is confirmed."]],
        ["Which payment methods do you accept?", ["Credit and debit cards, Apple Pay and Google Pay, paid securely online through Stripe. A deposit can hold your date, and the remaining balance is shown at checkout."]],
        ["Do you deliver rentals?", ["Yes. Delivery and pickup are available in Scranton and nearby areas for an additional fee. Call or message us with your address and we will confirm."]],
        ["Where do you work?", ["We are based in Scranton, Pennsylvania and serve nearby areas. If your event is somewhere else, contact us and we will tell you if we can help."]],
        ["How long are portrait sessions?", ["Portrait sessions run from 30 to 120 minutes. Current prices are shown in the booking form."]],
        ["How do weddings and large events work?", ["A deposit holds your date, and the final price is quoted for your event. Call us to talk about what you need."]],
        ["How do I use a discount code?", ["Enter your one-time code in the last step of the booking form. The new price is shown before you pay."]],
        ["Can I change or cancel my booking?", ["Contact us as soon as possible. Please read our ", { a: "/cancellation", t: "Cancellation & Refunds" }, " page."]],
        ["How can I contact you?", ["Call ", { a: P, t: "570-309-5776" }, " or email ", { a: M, t: "fortunestudio14@gmail.com" }, ". You can also use the chat button on this page."]]
      ]
    },
    es: {
      fq: "Preguntas frecuentes", faqLink: "Preguntas", wa: "WhatsApp", wam: "¡Hola Fortune Studio! Estoy visitando su sitio web ({u}) y me gustaría recibir más información.", priv: "Política de privacidad", terms: "Términos de servicio", canc: "Cancelaciones y reembolsos",
      ck: "Usamos cookies y herramientas similares para entender cómo se usa el sitio y mejorarlo.", ok: "Aceptar", no: "Rechazar",
      q: [
        ["¿Cómo reservo?", ["Usa el formulario de reservas de esta página: elige tu servicio y fecha, y paga de forma segura en línea. La fecha solo se reserva cuando se confirma tu pago."]],
        ["¿Qué métodos de pago aceptan?", ["Tarjetas de crédito y débito, Apple Pay y Google Pay, con pago seguro en línea a través de Stripe. Un depósito puede apartar tu fecha y el saldo restante se muestra al pagar."]],
        ["¿Entregan los alquileres?", ["Sí. La entrega y recogida están disponibles en Scranton y zonas cercanas por un costo adicional. Llámanos o escríbenos con tu dirección y te confirmamos."]],
        ["¿Dónde trabajan?", ["Estamos en Scranton, Pensilvania y atendemos zonas cercanas. Si tu evento es en otro lugar, contáctanos y te diremos si podemos ayudarte."]],
        ["¿Cuánto duran las sesiones de retrato?", ["Las sesiones de retrato duran de 30 a 120 minutos. Los precios actuales aparecen en el formulario de reservas."]],
        ["¿Cómo funcionan las bodas y los eventos grandes?", ["Un depósito aparta tu fecha y el precio final se cotiza para tu evento. Llámanos para hablar de lo que necesitas."]],
        ["¿Cómo uso un código de descuento?", ["Escribe tu código de un solo uso en el último paso del formulario de reservas. El nuevo precio se muestra antes de pagar."]],
        ["¿Puedo cambiar o cancelar mi reserva?", ["Contáctanos lo antes posible. Lee nuestra página de ", { a: "/cancellation", t: "Cancelaciones y reembolsos" }, "."]],
        ["¿Cómo puedo contactarlos?", ["Llama al ", { a: P, t: "570-309-5776" }, " o escribe a ", { a: M, t: "fortunestudio14@gmail.com" }, ". También puedes usar el botón de chat de esta página."]]
      ]
    },
    fr: {
      fq: "Questions fréquentes", faqLink: "FAQ", wa: "WhatsApp", wam: "Bonjour Fortune Studio ! Je visite votre site web ({u}) et je souhaite avoir plus d’informations.", priv: "Politique de confidentialité", terms: "Conditions d’utilisation", canc: "Annulations et remboursements",
      ck: "Nous utilisons des cookies et des outils similaires pour comprendre l’usage du site et l’améliorer.", ok: "Accepter", no: "Refuser",
      q: [
        ["Comment réserver ?", ["Utilisez le formulaire de réservation de cette page : choisissez votre service et votre date, puis payez en ligne en toute sécurité. Une date n’est réservée qu’une fois votre paiement confirmé."]],
        ["Quels moyens de paiement acceptez-vous ?", ["Cartes bancaires, Apple Pay et Google Pay, avec paiement sécurisé en ligne via Stripe. Un acompte peut bloquer votre date et le solde restant s’affiche au paiement."]],
        ["Livrez-vous les locations ?", ["Oui. La livraison et la reprise sont possibles à Scranton et dans les environs moyennant un supplément. Appelez-nous ou écrivez-nous avec votre adresse et nous confirmerons."]],
        ["Où intervenez-vous ?", ["Nous sommes à Scranton, en Pennsylvanie, et nous servons les environs. Si votre événement est ailleurs, contactez-nous et nous vous dirons si nous pouvons vous aider."]],
        ["Combien de temps durent les séances portrait ?", ["Les séances portrait durent de 30 à 120 minutes. Les prix actuels sont affichés dans le formulaire de réservation."]],
        ["Comment fonctionnent les mariages et grands événements ?", ["Un acompte bloque votre date et le prix final est établi pour votre événement. Appelez-nous pour parler de vos besoins."]],
        ["Comment utiliser un code de réduction ?", ["Saisissez votre code à usage unique à la dernière étape du formulaire de réservation. Le nouveau prix s’affiche avant le paiement."]],
        ["Puis-je modifier ou annuler ma réservation ?", ["Contactez-nous dès que possible. Lisez notre page ", { a: "/cancellation", t: "Annulations et remboursements" }, "."]],
        ["Comment vous contacter ?", ["Appelez le ", { a: P, t: "570-309-5776" }, " ou écrivez à ", { a: M, t: "fortunestudio14@gmail.com" }, ". Vous pouvez aussi utiliser le bouton de chat de cette page."]]
      ]
    }
  };
  function L() { var l = (D.documentElement.lang || "en").slice(0, 2).toLowerCase(); return T[l] ? l : "en"; }
  function tx(k) { return T[L()][k]; }
  function mk(tag, props) { var e = D.createElement(tag); if (props) for (var k in props) e[k] = props[k]; for (var i = 2; i < arguments.length; i++) e.append(arguments[i]); return e; }

  function renderFaq() {
    var s = D.getElementById("faq"); if (!s) return;
    s.textContent = "";
    s.append(mk("h2", { textContent: tx("fq") }));
    var w = mk("div", { style: "margin-top:20px;border-bottom:1px solid var(--line)" });
    T[L()].q.forEach(function (it) {
      var p = mk("p");
      it[1].forEach(function (x) { p.append(typeof x === "string" ? x : mk("a", { href: x.a, textContent: x.t, style: "color:var(--ac)" })); });
      w.append(mk("details", null, mk("summary", { textContent: it[0] }), p));
    });
    s.append(w);
  }
  function renderLinks() {
    D.querySelectorAll("[data-fs-t]").forEach(function (n) { n.remove(); });
    var q = D.querySelector('.lc a[href="#book"]');
    if (q && D.getElementById("faq")) { var fl = mk("a", { href: "#faq", textContent: tx("faqLink") }); fl.setAttribute("data-fs-t", "1"); q.after(fl); }
    // WhatsApp button in the Contact column, same look as the email/location items (icon circle + text). The number is not shown as text.
    var em = D.querySelector('.lc a.ci[href^="mailto:"]') || D.querySelector('.lc a[href^="tel:"]');
    if (em) {
      var msg = tx("wam").replace("{u}", location.origin);
      var wa = D.createElement("a"); wa.className = "ci"; wa.target = "_blank"; wa.rel = "noopener";
      wa.href = "https://wa.me/15703095776?text=" + encodeURIComponent(msg);
      wa.setAttribute("data-fs-t", "1");
      wa.innerHTML = '<i><svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.65.08-.3-.15-1.26-.46-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35M12.05 21.78h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.88 9.88M20.46 3.49A11.8 11.8 0 0 0 12.05 0C5.5 0 .16 5.33.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.31-1.65a11.9 11.9 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.33 11.89-11.89 0-3.18-1.24-6.17-3.48-8.42"/></svg></i>';
      wa.append(D.createTextNode(tx("wa")));
      em.after(wa);
    }
    var fb = D.querySelector(".fbot");
    if (fb) {
      var box = mk("span", { style: "display:flex;flex-wrap:wrap;gap:6px 18px" });
      [["/privacy", "priv"], ["/terms", "terms"], ["/cancellation", "canc"]].forEach(function (l) { box.append(mk("a", { href: l[0], textContent: tx(l[1]), style: "color:var(--mu);text-decoration:none" })); });
      box.setAttribute("data-fs-t", "1");
      var up = fb.querySelector('a[href="#top"]'); if (up) fb.insertBefore(box, up); else fb.append(box);
    }
  }
  function choice() { try { return localStorage.getItem("fs_consent") || ""; } catch (e) { return ""; } }
  function setChoice(v) {
    try { localStorage.setItem("fs_consent", v); } catch (e) {}
    if (v === "no") {
      window["ga-disable-G-R11118DCHL"] = true; window["ga-disable-G-PYVCZTD1FW"] = true;
      try { if (window.gtag) window.gtag("consent", "update", { analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" }); } catch (e) {}
    }
    var b = D.getElementById("fsck"); if (b) { b.style.opacity = "0"; b.style.transform = "translateY(20px)"; setTimeout(function () { b.remove(); }, 300); }
  }
  function renderCookie() {
    var b = D.getElementById("fsck");
    if (choice()) { if (b) b.remove(); return; }
    // a modal pop-up (for example the Black Friday offer) makes everything behind it unclickable, so wait until it is closed
    if (!b && D.querySelector("dialog[open]")) { clearTimeout(window.__fsckT); window.__fsckT = setTimeout(renderCookie, 700); return; }
    if (!b) {
      b = mk("div", { id: "fsck", role: "dialog", "aria-label": "Cookies" });
      b.style.cssText = "position:fixed;left:50%;bottom:max(14px,env(safe-area-inset-bottom));transform:translateX(-50%);z-index:9400;width:min(720px,calc(100vw - 24px));display:flex;gap:14px 18px;flex-wrap:wrap;align-items:center;justify-content:space-between;padding:14px 18px;border-radius:16px;background:var(--card,#151515);border:1px solid var(--line,#2a2a2a);box-shadow:0 14px 40px #000b;color:var(--tx,#f4efe6);font:400 .92rem/1.45 Outfit,system-ui,sans-serif;transition:opacity .3s,transform .3s";
      b.append(mk("span", { id: "fsckt", style: "flex:1;min-width:220px" }), mk("span", { style: "display:flex;gap:8px" }, mk("button", { id: "fsckn", onclick: function () { setChoice("no"); } }), mk("button", { id: "fscky", onclick: function () { setChoice("yes"); } })));
      var bs = "border-radius:999px;padding:9px 18px;font:600 .88rem Outfit,system-ui,sans-serif;cursor:pointer;";
      D.body.append(b);
      b.querySelector("#fsckn").style.cssText = bs + "background:transparent;color:var(--tx,#f4efe6);border:1px solid var(--line,#2a2a2a)";
      b.querySelector("#fscky").style.cssText = bs + "border:0;background:var(--ac,#e8b99f);color:#17110e";
    }
    var t = b.querySelector("#fsckt"); t.textContent = tx("ck") + " "; t.append(mk("a", { href: "/privacy", textContent: tx("priv"), style: "color:var(--ac,#e8b99f)" }));
    b.querySelector("#fsckn").textContent = tx("no"); b.querySelector("#fscky").textContent = tx("ok");
  }
  function faqSchema() {
    if (D.getElementById("fsfaqld")) return;
    var en = T.en.q.map(function (it) { return { "@type": "Question", name: it[0], acceptedAnswer: { "@type": "Answer", text: it[1].map(function (x) { return typeof x === "string" ? x : x.t; }).join("") } }; });
    var s = D.createElement("script"); s.type = "application/ld+json"; s.id = "fsfaqld"; s.textContent = JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: en }); D.head.append(s);
  }
  function all() { renderFaq(); renderLinks(); renderCookie(); }
  function init() {
    all(); faqSchema();
    var last = D.documentElement.lang;
    new MutationObserver(function () { if (D.documentElement.lang !== last) { last = D.documentElement.lang; all(); } }).observe(D.documentElement, { attributes: true, attributeFilter: ["lang"] });
  }
  if (D.readyState === "loading") D.addEventListener("DOMContentLoaded", init); else init();
})();
