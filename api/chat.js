// Fortune Studio website assistant.
// 1) Ready-made, human-sounding answers (English, Spanish, French, Haitian Creole) for the questions customers ask most.
//    They use the REAL prices from the site settings (admin editor + Black Friday sale), so they never go stale.
// 2) Anything not covered goes to ChatGPT (needs OPENAI_API_KEY in Vercel; optional OPENAI_MODEL, default gpt-4o-mini).
// 3) If OpenAI is down or has no credit, the ready-made answers still work, so visitors never hit a dead end.
// 4) Site problems, complaints, refunds or "I want a person" always point to a real agent (offer_agent: true).
const { limited, badOrigin, priced } = require("./_lib");

const PHONE = "570-309-5776", EMAIL = "fortunestudio14@gmail.com", SITE = "https://fortunestudiollc.com";
const TZ = "America/New_York";

/* ------------------------------------------------------------------ facts (live prices) */
async function getFacts() {
  let P = { t: 12, c: 3, a: 55, b: 110, wh: 150, wd: 100, sh: 80, tax: 6, dep: 50, xh: 25, mt: 30, mc: 200, ph: { 30: 99, 45: 139, 60: 179, 90: 249, 120: 319 } };
  let sale = { state: "off", pct: 0, end: 0 };
  try { const r = await priced(); P = r.P; sale = r.sale; } catch (e) { console.error("chat prices fallback:", e && e.message); }
  return { ...P, ph: P.ph || {}, live: sale.state === "live", pct: sale.pct || 0, saleEnd: sale.end || 0 };
}
const LOC = { en: "en-US", es: "es-US", fr: "fr-FR", ht: "fr-FR" };
function money(n, l) {
  const v = Number(n), s = Number.isInteger(v) ? String(v) : v.toFixed(2);
  return l === "fr" ? s.replace(".", ",") + " $" : "$" + s;
}
const MONEY_KEYS = ["t", "c", "a", "b", "wh", "wd", "sh"];
function fill(text, F, l) {
  let out = String(text);
  MONEY_KEYS.forEach((k) => { out = out.split("{" + k + "}").join(money(F[k], l)); });
  [30, 45, 60, 90, 120].forEach((m) => { out = out.split("{p" + m + "}").join(money(F.ph[m], l)); });
  out = out.split("{x20}").join(money(20, l));
  ["tax", "dep", "xh", "mt", "mc"].forEach((k) => { out = out.split("{" + k + "}").join(String(F[k])); });
  out = out.split("{pct}").join(String(F.pct));
  let end = "";
  if (F.live && F.saleEnd) { try { end = new Date(F.saleEnd - 60000).toLocaleDateString(LOC[l] || "en-US", { month: "long", day: "numeric", timeZone: TZ }); } catch (_) {} }
  out = out.split("{end}").join(end);
  out = out.split("{sale}").join(F.live ? ({
    en: " Black Friday: " + F.pct + "% off is already included in these prices.",
    es: " Black Friday: el " + F.pct + "% de descuento ya está incluido en estos precios.",
    fr: " Black Friday : la remise de " + F.pct + " % est déjà comprise dans ces prix.",
    ht: " Black Friday: rabè " + F.pct + "% la deja nan pri sa yo."
  }[l] || "") : "");
  return out;
}

/* ------------------------------------------------------------------ language */
const strip = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
function guessLang(text, hint) {
  const t = " " + strip(text).replace(/[^a-z0-9'’ ]/g, " ") + " ";
  const has = (re) => re.test(t);
  if (has(/ (bonjou|bonswa|kijan|kouman|mwen|ou ye|sak pase|souple|tanpri|mesi|konbyen|kobyen|kisa|poukisa|eske|rezerve|louwe|chez|foto|maryaj|livrezon|peman|nou|nap|wi|non|kote|ki le|m ap|m vle|mwen vle|pri|randevou|bezwen|gen|mache|pa mache) /)) {
    if (has(/ (bonjou|bonswa|kijan|kouman|mwen|sak pase|tanpri|mesi|konbyen|kobyen|kisa|poukisa|eske|rezerve|louwe|maryaj|livrezon|peman|randevou|bezwen|m vle|pa mache|nap) /)) return "ht";
  }
  if (has(/ (hola|buenos|buenas|precio|precios|cuanto|cuanta|reservar|reserva|gracias|quiero|quisiera|necesito|alquiler|alquilar|mesas|sillas|boda|entrega|horario|donde|como|puedo|cuando|cancelar|pago|descuento|problema|ayuda|tienen|tiene|favor|que|cual) /) && !has(/ (the|and|how|much|what|do you|price) /)) return "es";
  if (has(/ (bonjour|salut|bonsoir|prix|tarif|tarifs|reserver|merci|combien|seance|je veux|je voudrais|j'aimerais|comment|quand|mariage|livraison|horaires|annuler|paiement|probleme|aide|avez|avez-vous|vous|pouvez|quel|quelle|louer|chaises|tables) /) && !has(/ (the|and|how much|what|do you) /)) return "fr";
  if (has(/ (hello|hi|hey|price|prices|book|booking|how much|thanks|thank you|session|rental|rent|what|do you|can i|wedding|delivery) /)) return "en";
  return ["en", "es", "fr", "ht"].includes(hint) ? hint : "en";
}

/* ------------------------------------------------------------------ ready-made answers */
// Texts use {tokens} that are filled with live prices. A blank line starts a new chat bubble.
const AGENT_LINE = {
  on: {
    en: "A team member is online right now: tap “Talk to an agent” below and you’ll be connected.",
    es: "Hay una persona del equipo en línea ahora mismo: toca “Hablar con un agente” abajo y te conectamos.",
    fr: "Un membre de l’équipe est en ligne : touchez « Parler à un agent » ci-dessous et nous vous connectons.",
    ht: "Gen yon moun nan ekip la ki anliy kounye a: peze “Pale ak yon ajan” anba a epi n ap konekte w."
  },
  off: {
    en: "Nobody from the team is online at this moment. Tap “Talk to an agent” below and I’ll tell you here the second someone is available. You can also call or text " + PHONE + " or email " + EMAIL + ".",
    es: "Ahora mismo no hay nadie del equipo en línea. Toca “Hablar con un agente” abajo y te aviso aquí en cuanto haya alguien. También puedes llamar o escribir al " + PHONE + " o a " + EMAIL + ".",
    fr: "Personne de l’équipe n’est en ligne pour le moment. Touchez « Parler à un agent » ci-dessous et je vous préviens ici dès que quelqu’un est disponible. Vous pouvez aussi appeler ou écrire au " + PHONE + " ou à " + EMAIL + ".",
    ht: "Pa gen pesonn nan ekip la anliy kounye a. Peze “Pale ak yon ajan” anba a epi m ap di w isit la le yon moun disponib. Ou ka rele oswa voye tèks nan " + PHONE + " oswa ekri " + EMAIL + "."
  }
};

const INTENTS = [
  {
    id: "problem", agent: true,
    re: /(not working|doesn'?t work|does not work|won'?t (load|work|open|submit)|isn'?t working|error|bug\b|broken|glitch|stuck|frozen|crash|can'?t (book|pay|log|open|submit|see|load|access)|cannot (book|pay|open|submit|access)|payment (failed|declined|did not|didn'?t|issue|problem|error)|card (declined|failed|not)|charged twice|double charge|no funciona|no (me )?deja|no puedo|fall[oo]|se (trabo|congel)|problema (con|en) (el|la) (sitio|pagina|web|pago)|ne marche (pas|plus)|ne fonctionne|impossible de|probleme (avec|de|sur)|ca (bug|plante)|pa (mache|fonksyone|travay)|pwoblem|pa kapab|bloke|\bere\b|\berè\b)/,
    a: (F, l, st) => ({
      en: "I’m so sorry you’re running into trouble, let’s get it sorted out. 🙏\n\nOne thing that may help: if a payment fails or is canceled during checkout, your date is not reserved and you are not charged.\n\nThe quickest fix is to talk to our team. " + AGENT_LINE[st][l],
      es: "Lamento mucho el inconveniente, vamos a resolverlo. 🙏\n\nAlgo que puede tranquilizarte: si un pago falla o se cancela durante el proceso, tu fecha no queda reservada y no se te cobra.\n\nLo más rápido es hablar con nuestro equipo. " + AGENT_LINE[st][l],
      fr: "Je suis vraiment désolé pour ce souci, on va le régler. 🙏\n\nUne précision rassurante : si un paiement échoue ou est annulé pendant la commande, votre date n’est pas réservée et vous n’êtes pas débité.\n\nLe plus rapide est d’en parler à notre équipe. " + AGENT_LINE[st][l],
      ht: "Mwen regrèt anpil pou pwoblèm nan, n ap rezoud li. 🙏\n\nYon bagay ki ka rasire w: si yon peman echwe oswa anile pandan w ap peye, dat ou a pa rezève e yo pa pran lajan w.\n\nPi vit se pale ak ekip nou an. " + AGENT_LINE[st][l]
    })
  },
  {
    id: "complaint", agent: true,
    re: /(complain|complaint|unhappy|disappointed|not happy|angry|upset|terrible|awful|worst|rude|scam|queja|molest[oa]|decepcionad|enojad|terrible|pesimo|estafa|plainte|mecontent|decu|en colere|nul\b|arnaque|plent|pa kontan|fache|move sevis|vòlè|volè)/,
    a: (F, l, st) => ({
      en: "I’m truly sorry about that experience, and thank you for telling us. Your feedback matters and a real person should look into this personally.\n\n" + AGENT_LINE[st][l],
      es: "Lamento de verdad esa experiencia y gracias por contárnoslo. Tu opinión importa y una persona real debe revisar esto personalmente.\n\n" + AGENT_LINE[st][l],
      fr: "Je suis vraiment navré de cette expérience, merci de nous le dire. Votre avis compte et une vraie personne doit s’en occuper personnellement.\n\n" + AGENT_LINE[st][l],
      ht: "Mwen regrèt tout bon pou eksperyans sa a, mèsi paske w di nou li. Opinyon w enpòtan e se yon vrè moun ki dwe gade sa pèsonèlman.\n\n" + AGENT_LINE[st][l]
    })
  },
  {
    id: "human", agent: true,
    re: /(\bagent\b|\bagents\b|\bagente\b|\bhuman\b|\bhumano\b|\bhumain\b|real person|live person|talk to (a |an |some)|speak (to|with) (a |an |some)|representative|representante|hablar con (un|una|alguien)|persona real|parler (a|avec) (un|quelqu)|une vraie personne|pale ak yon|pale avek yon|yon moun reyel|yon vre moun)/,
    a: (F, l, st) => ({
      en: "Of course! " + AGENT_LINE[st][l],
      es: "¡Claro que sí! " + AGENT_LINE[st][l],
      fr: "Bien sûr ! " + AGENT_LINE[st][l],
      ht: "Natirèlman! " + AGENT_LINE[st][l]
    })
  },
  {
    id: "bot",
    re: /(are you (a |an )?(bot|robot|human|real|ai|person|chatgpt|machine)|is this (a )?(bot|robot|ai|real)|eres (un |una )?(bot|robot|humano|real|persona|ia)|es (un )?(bot|robot)|etes[- ]vous (un |une )?(bot|robot|humain|vrai|reel|ia)|ou se (yon )?(bot|robo|moun|machin)|se moun)/,
    a: (F, l, st) => ({
      en: "Good question! I’m Fortune Studio’s virtual assistant, so I’m an automated helper, not a person. I can answer most questions about prices, booking and rentals instantly.\n\nIf you’d rather talk to a human: " + AGENT_LINE[st][l],
      es: "¡Buena pregunta! Soy el asistente virtual de Fortune Studio, es decir, un ayudante automático, no una persona. Puedo responder al instante la mayoría de preguntas sobre precios, reservas y alquileres.\n\nSi prefieres hablar con una persona: " + AGENT_LINE[st][l],
      fr: "Bonne question ! Je suis l’assistant virtuel de Fortune Studio, donc un assistant automatique et non une personne. Je réponds tout de suite à la plupart des questions sur les tarifs, réservations et locations.\n\nSi vous préférez parler à un humain : " + AGENT_LINE[st][l],
      ht: "Bon kesyon! Mwen se asistan vityèl Fortune Studio a, kidonk yon asistan otomatik, se pa yon moun. Mwen ka reponn pifò kesyon sou pri, rezèvasyon ak lokasyon touswit.\n\nSi w pito pale ak yon moun: " + AGENT_LINE[st][l]
    })
  },
  {
    id: "blackfriday",
    re: /(black friday|discount|coupon|promo|promotion|sale\b|deal\b|offer\b|cheaper|code\b|descuento|oferta|cupon|rebaja|remise|reduction|solde|promotion|rabè|rabe|ofri|koupon|promosyon|mwens chè|mwens che)/,
    a: (F, l) => F.live ? ({
      en: "Yes! Our Black Friday sale is live: {pct}% off every price on the site, applied automatically at checkout. No code needed. It runs through {end}. 🎉\n\nHave a discount code instead? Enter it in the booking form before you pay.",
      es: "¡Sí! Nuestra oferta de Black Friday está activa: {pct}% de descuento en todos los precios del sitio, aplicado automáticamente al pagar. Sin código. Dura hasta el {end}. 🎉\n\n¿Tienes un código de descuento? Escríbelo en el formulario de reserva antes de pagar.",
      fr: "Oui ! Notre offre Black Friday est en cours : {pct} % de remise sur tous les prix du site, appliquée automatiquement au paiement, sans code. Elle dure jusqu’au {end}. 🎉\n\nVous avez un code promo ? Saisissez-le dans le formulaire de réservation avant de payer.",
      ht: "Wi! Vant Black Friday nou an ap mache: rabè {pct}% sou tout pri sou sit la, aplike otomatikman nan peman an. Pa bezwen kòd. Li dire jiska {end}. 🎉\n\nOu gen yon kòd rabè? Mete li nan fòm rezèvasyon an anvan w peye."
    }) : ({
      en: "There’s no sale running at the moment, but our prices are already friendly: tables {t}, chairs {c}, portrait sessions from {p30}.\n\nIf you have a discount code, enter it in the booking form before you pay.",
      es: "Ahora mismo no hay oferta activa, pero nuestros precios ya son accesibles: mesas {t}, sillas {c}, sesiones de retrato desde {p30}.\n\nSi tienes un código de descuento, escríbelo en el formulario de reserva antes de pagar.",
      fr: "Aucune promotion n’est en cours, mais nos prix sont déjà doux : tables {t}, chaises {c}, séances portrait dès {p30}.\n\nSi vous avez un code promo, saisissez-le dans le formulaire de réservation avant de payer.",
      ht: "Pa gen vant kounye a, men pri nou yo deja bon: tab {t}, chèz {c}, sesyon pòtrè depi {p30}.\n\nSi w gen yon kòd rabè, mete li nan fòm rezèvasyon an anvan w peye."
    })
  },
  {
    id: "wedding",
    re: /(wedding|marriage|bride|groom|boda|casamiento|novia|mariage|mariee|maryaj|nopce|event coverage|cobertura|couverture|kouvèti|kouveti|videograph|videographer|video of|videos? (of|for|at))/,
    a: () => ({
      en: "We’d love to be part of your big day! 💍 We cover weddings and events with photos and video, and we come to you.\n\nThe rate is {wh} per hour with a 4 hour minimum, plus tax. A {wd} deposit holds your date, and we confirm your final quote with you.\n\nTo request it, choose “Weddings” on the site, or call/text " + PHONE + " for a custom quote.",
      es: "¡Nos encantaría ser parte de tu gran día! 💍 Cubrimos bodas y eventos con fotos y video, y vamos a donde estés.\n\nLa tarifa es {wh} por hora con mínimo de 4 horas, más impuestos. Un depósito de {wd} aparta tu fecha y te confirmamos la cotización final.\n\nPara solicitarlo, elige “Bodas” en el sitio o llama/escribe al " + PHONE + " para una cotización personalizada.",
      fr: "Nous serions ravis de faire partie de votre grand jour ! 💍 Nous couvrons mariages et événements en photo et vidéo, et nous venons chez vous.\n\nLe tarif est de {wh} l’heure, 4 heures minimum, taxes en plus. Un acompte de {wd} garde votre date et nous confirmons le devis final avec vous.\n\nPour faire la demande, choisissez « Mariages » sur le site ou appelez/écrivez au " + PHONE + " pour un devis sur mesure.",
      ht: "Nou ta renmen fè pati gran jou w la! 💍 Nou kouvri maryaj ak evènman ak foto ak videyo, e nou vin jwenn ou kote w ye a.\n\nTarif la se {wh} chak èdtan, minimòm 4 èdtan, plis taks. Yon depo {wd} kenbe dat ou a, epi n ap konfime pri final la ak ou.\n\nPou mande li, chwazi “Maryaj” sou sit la oswa rele/voye tèks nan " + PHONE + " pou yon pri espesyal."
    })
  },
  {
    id: "space",
    re: /(event space|our space|the space|your space|venue|hall\b|rent (the |your |a )?(studio|space|room|place)|studio (rental|space)|space rental|salon\b|salle\b|espacio|local para|louer (la |le |votre )?(salle|studio|espace)|espas|lokal|sal fèt|sal fet|lounge|restroom|bathroom)/,
    a: () => ({
      en: "You can rent our bright, open event space in Scranton for {sh} per hour. It has a lounge area and a private restroom, and it’s perfect for birthdays, baby showers, weddings, graduations and family gatherings. 🎈\n\nPick your date, start time and number of hours in the booking form, then pay a deposit ({dep}%) or the full amount.",
      es: "Puedes alquilar nuestro espacio luminoso y abierto en Scranton por {sh} la hora. Tiene área de descanso y baño privado, y es ideal para cumpleaños, baby showers, bodas, graduaciones y reuniones familiares. 🎈\n\nElige fecha, hora de inicio y cantidad de horas en el formulario de reserva, y paga un depósito ({dep}%) o el total.",
      fr: "Vous pouvez louer notre espace lumineux et ouvert à Scranton pour {sh} l’heure. Il comprend un coin salon et des toilettes privées, idéal pour anniversaires, baby showers, mariages, remises de diplômes et réunions de famille. 🎈\n\nChoisissez la date, l’heure de début et le nombre d’heures dans le formulaire, puis payez un acompte ({dep} %) ou la totalité.",
      ht: "Ou ka louwe espas evènman klere ak louvri nou an nan Scranton pou {sh} chak èdtan. Li gen yon kwen salon ak yon twalèt prive, e li bon pou fèt anivèsè, baby shower, maryaj, gradyasyon ak reyinyon fanmi. 🎈\n\nChwazi dat la, lè w kòmanse ak kantite èdtan nan fòm rezèvasyon an, epi peye yon depo ({dep}%) oswa tout lajan an."
    })
  },
  {
    id: "packages",
    re: /(package|packages|paquete|paquetes|forfait|forfaits|pake\b|pakè|party pack|celebration|celebracion|celebration|fiesta|fete\b|fèt\b)/,
    a: () => ({
      en: "We have two popular packages: 🎉\n\nParty package {a}: 2 tables (8 FT) + 12 white chairs.\nCelebration package {b}: 4 tables (8 FT) + 25 white chairs.\n\nBoth include 4 hours, and each extra hour adds {xh}% of the price. Sales tax ({tax}%) is added at checkout.{sale}",
      es: "Tenemos dos paquetes muy populares: 🎉\n\nPaquete fiesta {a}: 2 mesas (8 pies) + 12 sillas blancas.\nPaquete celebración {b}: 4 mesas (8 pies) + 25 sillas blancas.\n\nAmbos incluyen 4 horas y cada hora extra suma {xh}% del precio. El impuesto ({tax}%) se añade al pagar.{sale}",
      fr: "Nous avons deux forfaits très demandés : 🎉\n\nForfait fête {a} : 2 tables (8 pieds) + 12 chaises blanches.\nForfait célébration {b} : 4 tables (8 pieds) + 25 chaises blanches.\n\nLes deux incluent 4 heures, et chaque heure en plus ajoute {xh} % du prix. La taxe ({tax} %) s’ajoute au paiement.{sale}",
      ht: "Nou gen de pake ki popilè anpil: 🎉\n\nPake fèt {a}: 2 tab (8 pye) + 12 chèz blan.\nPake selebrasyon {b}: 4 tab (8 pye) + 25 chèz blan.\n\nToule de gen 4 èdtan ladan l, epi chak èdtan anplis ajoute {xh}% sou pri a. Yo ajoute taks ({tax}%) lè w ap peye.{sale}"
    })
  },
  {
    id: "extrahours",
    re: /((extra|additional|more|adicional|adicionales|supplementaire|supplementaires|anplis|plis)\W{0,6}(hour|hours|hora|horas|heure|heures|edtan)|(hour|hours|hora|horas|heure|heures|edtan)\W{0,8}(extra|additional|adicional|supp|anplis)|overtime|how long (is|are|do)|cuanto dura|combien de temps dure|konbyen tan)/,
    a: () => ({
      en: "Rentals (tables, chairs and packages) include 4 hours, and each additional hour adds {xh}% of the price.\n\nOther services: space rental is {sh} per hour, wedding and event coverage is {wh} per hour (4 hour minimum), and portrait sessions run from 30 to 120 minutes.",
      es: "Los alquileres (mesas, sillas y paquetes) incluyen 4 horas, y cada hora adicional suma {xh}% del precio.\n\nOtros servicios: el espacio cuesta {sh} por hora, la cobertura de bodas y eventos {wh} por hora (mínimo 4 horas), y las sesiones de retrato duran de 30 a 120 minutos.",
      fr: "Les locations (tables, chaises et forfaits) incluent 4 heures, et chaque heure supplémentaire ajoute {xh} % du prix.\n\nAutres services : la salle coûte {sh} l’heure, la couverture de mariages et événements {wh} l’heure (4 heures minimum), et les séances portrait durent de 30 à 120 minutes.",
      ht: "Lokasyon yo (tab, chèz ak pake) gen 4 èdtan ladan yo, epi chak èdtan anplis ajoute {xh}% sou pri a.\n\nLòt sèvis: espas la se {sh} chak èdtan, kouvèti maryaj ak evènman se {wh} chak èdtan (minimòm 4 èdtan), epi sesyon pòtrè yo dire 30 a 120 minit."
    })
  },
  {
    id: "portrait",
    re: /(portrait|portraits|session|sessions|photo ?shoot|photoshoot|photo session|headshot|family photo|couple|maternity|graduation photo|photograph|photographer|retrato|retratos|sesion|sesiones|fotografo|fotografia|fotos|seance|seances|photographe|photographie|photos?\b|sesyon|pòtrè|potre|foto\b|fotograf)/,
    a: () => ({
      en: "Our portrait sessions include professionally edited digital photos: 📸\n\n30 min: {p30} (5 photos)\n45 min: {p45} (8 photos)\n60 min: {p60} (12 photos)\n90 min: {p90} (18 photos)\n120 min: {p120} (25 photos)\n\nExtra edited photos are {x20} each. They’re perfect for portraits, couples, family, graduation, headshots and birthdays. Sessions are by appointment: you can pick your date on the site.{sale}",
      es: "Nuestras sesiones de retrato incluyen fotos digitales editadas profesionalmente: 📸\n\n30 min: {p30} (5 fotos)\n45 min: {p45} (8 fotos)\n60 min: {p60} (12 fotos)\n90 min: {p90} (18 fotos)\n120 min: {p120} (25 fotos)\n\nLas fotos editadas extra cuestan {x20} c/u. Son ideales para retratos, parejas, familia, graduaciones, fotos profesionales y cumpleaños. Son con cita previa: puedes elegir tu fecha en el sitio.{sale}",
      fr: "Nos séances portrait incluent des photos numériques retouchées par des professionnels : 📸\n\n30 min : {p30} (5 photos)\n45 min : {p45} (8 photos)\n60 min : {p60} (12 photos)\n90 min : {p90} (18 photos)\n120 min : {p120} (25 photos)\n\nLes photos retouchées supplémentaires coûtent {x20} pièce. Idéal pour portraits, couples, famille, remises de diplômes, photos pro et anniversaires. Sur rendez-vous : choisissez votre date sur le site.{sale}",
      ht: "Sesyon pòtrè nou yo gen foto dijital edite pwofesyonèlman ladan yo: 📸\n\n30 minit: {p30} (5 foto)\n45 minit: {p45} (8 foto)\n60 minit: {p60} (12 foto)\n90 minit: {p90} (18 foto)\n120 minit: {p120} (25 foto)\n\nFoto edite anplis yo koute {x20} chak. Yo bon pou pòtrè, koup, fanmi, gradyasyon, foto pwofesyonèl ak anivèsè. Se sou randevou: ou ka chwazi dat ou sou sit la.{sale}"
    })
  },
  {
    id: "rentals",
    re: /(rent\b|rental|rentals|renting|table|tables|chair|chairs|mesa\b|mesas|silla|sillas|alquil|louer|location\b|chaise|chaises|chez\b|chèz|tab\b|louwe|lokasyon|inventory|inventario|stock|how many)/,
    a: () => ({
      en: "We rent 8 FT tables for {t} each and white folding chairs for {c} each. We have {mt} tables and {mc} chairs in stock. 🪑\n\nPrices include 4 hours, and each extra hour adds {xh}% of the price. Delivery and pickup are available for an additional fee, and sales tax ({tax}%) is added at checkout.{sale}\n\nYou can see free dates on the calendar and book right on the site.",
      es: "Alquilamos mesas de 8 pies a {t} c/u y sillas blancas plegables a {c} c/u. Tenemos {mt} mesas y {mc} sillas disponibles. 🪑\n\nLos precios incluyen 4 horas y cada hora extra suma {xh}% del precio. Entrega y recogida con costo adicional, y el impuesto ({tax}%) se añade al pagar.{sale}\n\nPuedes ver las fechas libres en el calendario y reservar directamente en el sitio.",
      fr: "Nous louons des tables de 8 pieds à {t} pièce et des chaises pliantes blanches à {c} pièce. Nous avons {mt} tables et {mc} chaises. 🪑\n\nLes prix incluent 4 heures, et chaque heure en plus ajoute {xh} % du prix. Livraison et reprise moyennant des frais, taxe ({tax} %) ajoutée au paiement.{sale}\n\nVous voyez les dates libres dans le calendrier et vous réservez directement sur le site.",
      ht: "Nou louwe tab 8 pye a {t} chak ak chèz blan pliyan a {c} chak. Nou gen {mt} tab ak {mc} chèz disponib. 🪑\n\nPri yo gen 4 èdtan ladan yo, epi chak èdtan anplis ajoute {xh}% sou pri a. Livrezon ak ranmase disponib pou yon frè anplis, epi yo ajoute taks ({tax}%) lè w ap peye.{sale}\n\nOu ka wè dat ki lib yo sou kalandriye a epi rezève dirèkteman sou sit la."
    })
  },
  {
    id: "delivery",
    re: /(deliver|delivery|pick ?up|drop ?off|set ?up|setup|transport|entrega|entregan|recogida|recoger|livraison|livrer|reprise|recuperer|livrezon|livre|ranmase|pote)/,
    a: () => ({
      en: "Yes, we deliver and pick up in Scranton and nearby areas for an additional fee (usually around $25 in the Scranton area, and we confirm the exact amount with you). 🚚\n\nJust add “Delivery & pickup” when you book and enter your event address.",
      es: "Sí, entregamos y recogemos en Scranton y alrededores con un costo adicional (normalmente unos $25 en el área de Scranton, y te confirmamos el monto exacto). 🚚\n\nSolo agrega “Entrega y recogida” al reservar e indica la dirección de tu evento.",
      fr: "Oui, nous livrons et reprenons à Scranton et dans les environs moyennant des frais (en général environ 25 $ dans le secteur de Scranton, montant exact confirmé avec vous). 🚚\n\nAjoutez simplement « Livraison et reprise » lors de la réservation et indiquez l’adresse de l’événement.",
      ht: "Wi, nou livre e nou ranmase nan Scranton ak zòn ki toupre yo pou yon frè anplis (anjeneral anviwon $25 nan zòn Scranton, e n ap konfime montan egzak la ak ou). 🚚\n\nTou senpleman ajoute “Livrezon ak ranmase” lè w ap rezève epi mete adrès evènman an."
    })
  },
  {
    id: "payment",
    re: /(pay\b|paying|payment|payments|how (do|can) i pay|card\b|credit|debit|apple pay|google pay|paypal|cash|zelle|venmo|stripe|deposit|down payment|installment|pago|pagos|pagar|tarjeta|efectivo|deposito|anticipo|paiement|payer|carte|especes|acompte|peman|peye|kat\b|lajan|depo\b)/,
    a: () => ({
      en: "You can pay securely online with a card, Apple Pay or Google Pay, and PayPal is available too. 💳\n\nFor rentals and our event space you can pay a deposit ({dep}%) or the full amount. For weddings and events, a {wd} deposit holds your date. Sales tax ({tax}%) is added at checkout. We never see your card number.",
      es: "Puedes pagar de forma segura en línea con tarjeta, Apple Pay o Google Pay, y también hay PayPal. 💳\n\nEn alquileres y en nuestro espacio puedes pagar un depósito ({dep}%) o el total. En bodas y eventos, un depósito de {wd} aparta tu fecha. El impuesto ({tax}%) se añade al pagar. Nunca vemos el número de tu tarjeta.",
      fr: "Vous pouvez payer en ligne en toute sécurité par carte, Apple Pay ou Google Pay, et PayPal est aussi disponible. 💳\n\nPour les locations et notre espace, vous pouvez verser un acompte ({dep} %) ou payer la totalité. Pour les mariages et événements, un acompte de {wd} garde votre date. La taxe ({tax} %) est ajoutée au paiement. Nous ne voyons jamais votre numéro de carte.",
      ht: "Ou ka peye sou entènèt an sekirite ak kat, Apple Pay oswa Google Pay, e PayPal disponib tou. 💳\n\nPou lokasyon ak espas nou an, ou ka peye yon depo ({dep}%) oswa tout lajan an. Pou maryaj ak evènman, yon depo {wd} kenbe dat ou a. Yo ajoute taks ({tax}%) lè w ap peye. Nou pa janm wè nimewo kat ou."
    })
  },
  {
    id: "tax",
    re: /(\btax\b|taxes|sales tax|impuesto|impuestos|taxe|taxes|taks)/,
    a: () => ({
      en: "Pennsylvania sales tax ({tax}%) is added at checkout. The prices you see on the site are before tax, so there are no surprises.",
      es: "El impuesto sobre ventas de Pensilvania ({tax}%) se añade al pagar. Los precios del sitio son antes de impuestos, así que no hay sorpresas.",
      fr: "La taxe de vente de Pennsylvanie ({tax} %) est ajoutée au paiement. Les prix affichés sur le site sont avant taxes, donc aucune surprise.",
      ht: "Taks vant Pennsylvania ({tax}%) ajoute lè w ap peye. Pri ou wè sou sit la yo se anvan taks, kidonk pa gen sipriz."
    })
  },
  {
    id: "cancel", agent: true,
    re: /(cancel|cancell|refund|reschedul|change (my |the )?(date|booking|reservation|time)|move (my |the )?(date|booking)|money back|cancelar|cancelacion|reembolso|reprogramar|cambiar (mi |la )?(fecha|reserva)|annuler|annulation|rembours|reporter|changer (ma |la )?(date|reservation)|anile|anilasyon|ranbouse|chanje (dat|randevou|rezèvasyon|rezevasyon)|reprograme)/,
    a: (F, l, st) => ({
      en: "No problem, just contact us as soon as possible with your name, the service and your booking date. We’ll do our best to move you to another date, depending on availability.\n\nRefund requests are reviewed fairly, and approved refunds go back to the original payment method. A deposit holds your date, so it may not always be refundable, and we’ll explain our decision. Full policy: " + SITE + "/cancellation\n\nSince this involves your booking, a team member should help you directly. " + AGENT_LINE[st][l],
      es: "Sin problema, contáctanos lo antes posible con tu nombre, el servicio y la fecha de tu reserva. Haremos lo posible por moverte a otra fecha, según disponibilidad.\n\nLas solicitudes de reembolso se revisan con justicia y los reembolsos aprobados regresan al método de pago original. Un depósito aparta tu fecha, por lo que no siempre es reembolsable, y te explicaremos nuestra decisión. Política completa: " + SITE + "/cancellation\n\nComo se trata de tu reserva, una persona del equipo debe ayudarte directamente. " + AGENT_LINE[st][l],
      fr: "Aucun souci, contactez-nous dès que possible avec votre nom, le service et la date de votre réservation. Nous ferons de notre mieux pour vous proposer une autre date, selon les disponibilités.\n\nLes demandes de remboursement sont examinées équitablement et les remboursements approuvés reviennent sur le moyen de paiement d’origine. Un acompte garde votre date, il n’est donc pas toujours remboursable, et nous vous expliquerons notre décision. Politique complète : " + SITE + "/cancellation\n\nComme cela concerne votre réservation, un membre de l’équipe doit vous aider directement. " + AGENT_LINE[st][l],
      ht: "Pa gen pwoblèm, kontakte nou le pli vit ak non ou, sèvis la ak dat rezèvasyon w lan. N ap fè tout sa nou kapab pou deplase w sou yon lòt dat, selon disponibilite.\n\nYo egzamine demann ranbousman yo avèk jistis, e ranbousman yo apwouve retounen sou menm metòd peman an. Yon depo kenbe dat ou a, kidonk li pa toujou ranbousab, e n ap eksplike w desizyon nou an. Politik konplè: " + SITE + "/cancellation\n\nPaske sa konsène rezèvasyon w lan, yon moun nan ekip la dwe ede w dirèkteman. " + AGENT_LINE[st][l]
    })
  },
  {
    id: "photostime", agent: true,
    re: /((how (long|soon|fast)|when|cuando|cuanto tarda|quand|combien de temps|ki le|konbyen tan)\W.{0,40}(photos?|pictures|edited|gallery|fotos|galerie|foto)\b|turnaround|editing time)/,
    a: (F, l, st) => ({
      en: "Great question! The time to receive your edited photos depends on the session, so I don’t want to promise a date I can’t guarantee. Our team confirms the timing when you book.\n\nIf you need them by a specific day, let our team know. " + AGENT_LINE[st][l],
      es: "¡Buena pregunta! El tiempo para recibir tus fotos editadas depende de la sesión, y no quiero prometerte una fecha que no puedo garantizar. Nuestro equipo confirma el plazo al reservar.\n\nSi las necesitas para un día específico, avísale al equipo. " + AGENT_LINE[st][l],
      fr: "Bonne question ! Le délai pour recevoir vos photos retouchées dépend de la séance, et je ne veux pas vous promettre une date que je ne peux pas garantir. Notre équipe confirme le délai lors de la réservation.\n\nSi vous les voulez pour un jour précis, prévenez l’équipe. " + AGENT_LINE[st][l],
      ht: "Bon kesyon! Tan pou w resevwa foto edite yo depann de sesyon an, e m pa vle pwomèt w yon dat mwen pa ka garanti. Ekip nou an konfime tan an lè w rezève.\n\nSi w bezwen yo pou yon jou espesifik, fè ekip la konnen. " + AGENT_LINE[st][l]
    })
  },
  {
    id: "booking",
    re: /(book\b|booking|bookings|reserve|reservation|reserv|appointment|schedule|calendar|availability|available|free date|open date|dates?\b|how (do|can) i (get started|order|sign up)|cita|fecha|fechas|disponib|calendario|rendez|disponibilite|calendrier|reserver|randevou|rezev|rezèv|dat\b|kalandriye|disponib)/,
    a: () => ({
      en: "Booking takes just a couple of minutes: 📅\n\n1. Choose your service (portrait session, rental, event space or wedding/event coverage).\n2. Pick a free date on the calendar. We’re open Tuesday to Sunday.\n3. Add your details and pay securely online.\n\nYour date is reserved once payment is confirmed. Start here: " + SITE + "/#book",
      es: "Reservar toma solo un par de minutos: 📅\n\n1. Elige tu servicio (sesión de retrato, alquiler, espacio para eventos o cobertura de bodas/eventos).\n2. Escoge una fecha libre en el calendario. Abrimos de martes a domingo.\n3. Agrega tus datos y paga de forma segura en línea.\n\nTu fecha queda reservada cuando se confirma el pago. Empieza aquí: " + SITE + "/#book",
      fr: "Réserver ne prend que quelques minutes : 📅\n\n1. Choisissez votre service (séance portrait, location, espace événementiel ou couverture mariage/événement).\n2. Sélectionnez une date libre dans le calendrier. Nous sommes ouverts du mardi au dimanche.\n3. Ajoutez vos informations et payez en ligne en toute sécurité.\n\nVotre date est réservée une fois le paiement confirmé. Commencez ici : " + SITE + "/#book",
      ht: "Rezève pran kèk minit sèlman: 📅\n\n1. Chwazi sèvis ou (sesyon pòtrè, lokasyon, espas evènman oswa kouvèti maryaj/evènman).\n2. Chwazi yon dat ki lib sou kalandriye a. Nou louvri madi rive dimanch.\n3. Ajoute enfòmasyon w epi peye sou entènèt an sekirite.\n\nDat ou a rezève le peman an konfime. Kòmanse la a: " + SITE + "/#book"
    })
  },
  {
    id: "hours",
    re: /(opening hours|open on|what days|days open|closed|monday|tuesday|sunday|saturday|weekend|weekends|are you open|do you open|what time|horario|horarios|abierto|abren|cerrado|lunes|domingo|sabado|fin de semana|ouvert|ouvrez|ferme|horaires|lundi|dimanche|samedi|louvri|louvri|fèmen|femen|lendi|dimanch|samdi|ki jou|ki lè nou louvri)/,
    a: () => ({
      en: "We’re open Tuesday through Sunday, Saturdays and Sundays included, and closed on Mondays. 🗓️\n\nOnline booking is open 24/7, and you choose your start time when you book.",
      es: "Abrimos de martes a domingo, incluidos sábados y domingos, y cerramos los lunes. 🗓️\n\nLas reservas en línea están abiertas las 24 horas y eliges tu hora de inicio al reservar.",
      fr: "Nous sommes ouverts du mardi au dimanche, samedis et dimanches inclus, et fermés le lundi. 🗓️\n\nLa réservation en ligne est ouverte 24 h/24 et vous choisissez votre heure de début en réservant.",
      ht: "Nou louvri madi rive dimanch, samdi ak dimanch enkli, e nou fèmen lendi. 🗓️\n\nRezèvasyon sou entènèt louvri 24 sou 24, epi ou chwazi lè w kòmanse a lè w ap rezève."
    })
  },
  {
    id: "contact",
    re: /(where (are|is)|where do you|address|located|directions?|map\b|phone|call you|text you|number|email|e-mail|contact|reach you|donde (estan|queda|esta)|direccion|ubicacion|telefono|llamar|correo|contacto|ou etes|ou se trouve|adresse|telephone|appeler|courriel|joindre|kote nou ye|kote nou|adrès|adres|telefon|rele nou|imel|kontak|scranton)/,
    a: () => ({
      en: "We’re based in Scranton, Pennsylvania, and we serve the surrounding areas. For weddings and deliveries we come to you. 📍\n\nCall or text " + PHONE + ", or email " + EMAIL + ". I’m also here anytime!",
      es: "Estamos en Scranton, Pensilvania, y atendemos las zonas cercanas. Para bodas y entregas vamos a donde estés. 📍\n\nLlama o escribe al " + PHONE + ", o envía un correo a " + EMAIL + ". ¡Aquí también estoy a cualquier hora!",
      fr: "Nous sommes à Scranton, en Pennsylvanie, et nous servons les environs. Pour les mariages et les livraisons, nous venons chez vous. 📍\n\nAppelez ou écrivez au " + PHONE + ", ou envoyez un e-mail à " + EMAIL + ". Je suis aussi là à toute heure !",
      ht: "Nou baze nan Scranton, Pennsylvania, e nou sèvi zòn ki toupre yo. Pou maryaj ak livrezon, nou vin jwenn ou. 📍\n\nRele oswa voye tèks nan " + PHONE + ", oswa ekri " + EMAIL + ". Mwen la tou nenpòt ki lè!"
    })
  },
  {
    id: "languages",
    re: /(language|languages|do you speak|speak spanish|speak french|speak creole|hablan|habla espanol|idioma|idiomas|parlez[- ]vous|langue|langues|kreyol|kreyòl|creole|creole|pale kreyol|pale franse|pale espanyol)/,
    a: () => ({
      en: "Our website and I work in English, Spanish and French, and I can also chat in Haitian Creole. 🌎 Just write in the language you’re most comfortable with.",
      es: "Nuestro sitio y yo funcionamos en inglés, español y francés, y también puedo conversar en criollo haitiano. 🌎 Escribe en el idioma con el que te sientas más cómodo.",
      fr: "Notre site et moi fonctionnons en anglais, espagnol et français, et je peux aussi discuter en créole haïtien. 🌎 Écrivez dans la langue qui vous met le plus à l’aise.",
      ht: "Sit nou an ak mwen mache an angle, espanyòl ak fransè, e mwen ka pale kreyòl ayisyen tou. 🌎 Ekri nan lang ki pi konfòtab pou ou a."
    })
  },
  {
    id: "price",
    re: /(price|prices|pricing|cost|costs|how much|rate|rates|fee|fees|quote|estimate|cheap|afford|precio|precios|cuanto|cuesta|cuestan|tarifa|costo|prix|tarif|tarifs|combien|coute|pri\b|pri yo|konbyen|kobyen|koute|\$)/,
    a: () => ({
      en: "Here’s a quick overview of our prices: 💛\n\nPortrait sessions: from {p30} (30 min, edited photos included)\nTables (8 FT): {t} each\nWhite folding chairs: {c} each\nParty package: {a} (2 tables + 12 chairs)\nCelebration package: {b} (4 tables + 25 chairs)\nEvent space: {sh} per hour\nWedding and event coverage: {wh} per hour (4 hour minimum)\n\nSales tax ({tax}%) is added at checkout.{sale}\n\nWant details on any of these? Just ask!",
      es: "Aquí tienes un resumen de nuestros precios: 💛\n\nSesiones de retrato: desde {p30} (30 min, fotos editadas incluidas)\nMesas (8 pies): {t} c/u\nSillas blancas plegables: {c} c/u\nPaquete fiesta: {a} (2 mesas + 12 sillas)\nPaquete celebración: {b} (4 mesas + 25 sillas)\nEspacio para eventos: {sh} por hora\nCobertura de bodas y eventos: {wh} por hora (mínimo 4 horas)\n\nEl impuesto ({tax}%) se añade al pagar.{sale}\n\n¿Quieres detalles de alguno? ¡Pregunta!",
      fr: "Voici un aperçu de nos tarifs : 💛\n\nSéances portrait : dès {p30} (30 min, photos retouchées incluses)\nTables (8 pieds) : {t} pièce\nChaises pliantes blanches : {c} pièce\nForfait fête : {a} (2 tables + 12 chaises)\nForfait célébration : {b} (4 tables + 25 chaises)\nEspace événementiel : {sh} l’heure\nCouverture mariage et événement : {wh} l’heure (4 heures minimum)\n\nLa taxe ({tax} %) est ajoutée au paiement.{sale}\n\nVous voulez le détail de l’un d’eux ? Demandez !",
      ht: "Men yon rezime rapid pri nou yo: 💛\n\nSesyon pòtrè: depi {p30} (30 minit, foto edite enkli)\nTab (8 pye): {t} chak\nChèz blan pliyan: {c} chak\nPake fèt: {a} (2 tab + 12 chèz)\nPake selebrasyon: {b} (4 tab + 25 chèz)\nEspas evènman: {sh} chak èdtan\nKouvèti maryaj ak evènman: {wh} chak èdtan (minimòm 4 èdtan)\n\nYo ajoute taks ({tax}%) lè w ap peye.{sale}\n\nOu vle plis detay sou youn ladan yo? Mande sèlman!"
    })
  },
  {
    id: "thanks",
    re: /^\W*(thanks|thank you|thx|ty|thanks a lot|many thanks|gracias|muchas gracias|merci|merci beaucoup|mesi|mèsi|mesi anpil|ok thanks|great thanks|perfect|awesome|nice|genial|perfecto|parfait|super|bon)\W*$/,
    a: () => ({
      en: "You’re very welcome! 😊 Anything else I can help you with?",
      es: "¡De nada! 😊 ¿Hay algo más en lo que pueda ayudarte?",
      fr: "Avec plaisir ! 😊 Puis-je vous aider pour autre chose ?",
      ht: "Pa gen pwoblèm! 😊 Gen lòt bagay mwen ka ede w?"
    })
  },
  {
    id: "bye",
    re: /^\W*(bye|goodbye|see you|see ya|later|adios|hasta luego|nos vemos|au revoir|a bientot|bonne journee|orevwa|a pi ta|babay)\W*$/,
    a: () => ({
      en: "Thanks for stopping by! Have a wonderful day. ✨ I’m here whenever you need me.",
      es: "¡Gracias por visitarnos! Que tengas un día maravilloso. ✨ Aquí estoy cuando me necesites.",
      fr: "Merci de votre visite ! Passez une merveilleuse journée. ✨ Je suis là quand vous voulez.",
      ht: "Mèsi paske w vizite nou! Pase yon bèl jounen. ✨ Mwen la lè w bezwen m."
    })
  },
  {
    id: "greeting",
    re: /^\W*(hi|hello|hey|heya|howdy|yo|sup|good (morning|afternoon|evening)|hola|buenas|buenos dias|buenas tardes|buenas noches|que tal|bonjour|bonsoir|salut|coucou|bonjou|bonswa|alo|sak pase|kijan ou ye|ça va|ca va|how are you|como estas|comment ca va|comment allez)\b.{0,25}$/,
    a: () => ({
      en: "Hi there! 👋 Welcome to Fortune Studio. I can help with photo sessions, wedding and event coverage, table and chair rentals, our event space and booking.\n\nWhat would you like to know?",
      es: "¡Hola! 👋 Bienvenido a Fortune Studio. Puedo ayudarte con sesiones de fotos, cobertura de bodas y eventos, alquiler de mesas y sillas, nuestro espacio y reservas.\n\n¿Qué te gustaría saber?",
      fr: "Bonjour ! 👋 Bienvenue chez Fortune Studio. Je peux vous aider pour les séances photo, la couverture de mariages et événements, la location de tables et chaises, notre espace et les réservations.\n\nQue souhaitez-vous savoir ?",
      ht: "Bonjou! 👋 Byenvini nan Fortune Studio. Mwen ka ede w ak sesyon foto, kouvèti maryaj ak evènman, lokasyon tab ak chèz, espas nou an ak rezèvasyon.\n\nKisa w ta renmen konnen?"
    })
  }
];

const OTHER = (F, l, st) => ({
  en: "Thanks for your message! I want to be sure you get the right answer on that one, so the best next step is our team. Call or text " + PHONE + ", email " + EMAIL + ", or: " + AGENT_LINE[st].en,
  es: "¡Gracias por tu mensaje! Quiero asegurarme de darte la respuesta correcta, así que lo mejor es hablar con nuestro equipo. Llama o escribe al " + PHONE + ", envía un correo a " + EMAIL + ", o: " + AGENT_LINE[st].es,
  fr: "Merci pour votre message ! Je veux être sûr de vous donner la bonne réponse, le mieux est donc de contacter notre équipe. Appelez ou écrivez au " + PHONE + ", envoyez un e-mail à " + EMAIL + ", ou : " + AGENT_LINE[st].fr,
  ht: "Mèsi pou mesaj ou! Mwen vle asire w jwenn bon repons lan, kidonk pi bon etap la se ekip nou an. Rele oswa voye tèks nan " + PHONE + ", ekri " + EMAIL + ", oswa: " + AGENT_LINE[st].ht
})[l];

const BEATS = {
  problem: "*", complaint: "*", human: "*", bot: "*",
  cancel: ["booking", "payment", "portrait", "rentals", "price", "photostime"],
  photostime: ["portrait", "booking", "price"],
  wedding: ["portrait", "price", "rentals", "booking", "hours"],
  space: ["rentals", "price", "portrait", "booking"],
  packages: ["rentals", "price"],
  extrahours: ["rentals", "price", "booking"],
  blackfriday: ["price"], rentals: ["price"], portrait: ["price"], payment: ["price", "tax"], delivery: ["price"], tax: ["price"], hours: ["booking"]
};
// Find the ready-made answers that fit the visitor's last message (best 2, in priority order).
function matchIntents(text) {
  const t = strip(text).replace(/\s+/g, " ").trim();
  if (!t) return [];
  let hits = INTENTS.filter((it) => it.re.test(t) || it.re.test(String(text).toLowerCase()));
  // The more specific topic wins over the general one (e.g. "wedding photos" is not a portrait-session question).
  const ids = hits.map((h) => h.id);
  hits = hits.filter((h) => !ids.some((o) => o !== h.id && (BEATS[o] === "*" ? !BEATS[h.id] || BEATS[h.id] !== "*" : (BEATS[o] || []).includes(h.id))));
  // A friendly hello is dropped when the visitor also asked something.
  const real = hits.filter((h) => !["greeting", "thanks", "bye"].includes(h.id));
  return real.length ? real : hits;
}
function readyAnswer(text, F, l, st) {
  const hits = matchIntents(text);
  if (!hits.length) return null;
  const used = hits.slice(0, 2);
  const parts = used.map((h) => fill(h.a(F, l, st)[l], F, l));
  return { reply: parts.join("\n\n"), ids: used.map((h) => h.id), count: hits.length, agent: used.some((h) => h.agent) };
}

/* ------------------------------------------------------------------ ChatGPT */
function knowledge(F, st) {
  const p = (n) => "$" + (Number.isInteger(n) ? n : Number(n).toFixed(2));
  return `Business: Fortune Studio LLC, photography studio and event rentals in Scranton, Pennsylvania (serves nearby areas).
Contact: phone/text ${PHONE}; email ${EMAIL}; website ${SITE}; booking page ${SITE}/#book. Open Tuesday to Sunday (Saturdays and Sundays included), closed Mondays. Online booking is available 24/7.
${F.live ? "BLACK FRIDAY SALE IS LIVE: " + F.pct + "% off every price, applied automatically at checkout, no code needed. The prices below already include the discount.\n" : ""}CURRENT PRICES (before ${F.tax}% Pennsylvania sales tax, which is added at checkout):
- Portrait sessions (professionally edited digital photos included): 30 min ${p(F.ph[30])} (5 photos), 45 min ${p(F.ph[45])} (8), 60 min ${p(F.ph[60])} (12), 90 min ${p(F.ph[90])} (18), 120 min ${p(F.ph[120])} (25). Extra edited photos $20 each. By appointment. Good for portraits, couples, family, graduation, headshots, birthdays.
- 8 FT tables ${p(F.t)} each (${F.mt} available). White folding chairs ${p(F.c)} each (${F.mc} available).
- Party package ${p(F.a)} = 2 tables + 12 chairs. Celebration package ${p(F.b)} = 4 tables + 25 chairs.
- Rental prices include 4 hours; each extra hour adds ${F.xh}% of the price.
- Delivery and pickup: additional fee, usually about $25 in the Scranton area, exact amount confirmed with the customer.
- Event space rental (bright open space, lounge area, private restroom; birthdays, baby showers, weddings, graduations, family events): ${p(F.sh)} per hour. Customer picks date, start time and hours.
- Wedding and event coverage (photos and video, we come to you): ${p(F.wh)} per hour, 4 hour minimum, plus tax. A ${p(F.wd)} deposit holds the date; final quote confirmed with the customer. Request it by choosing "Weddings" on the site or calling.
PAYMENTS: card, Apple Pay, Google Pay, and PayPal, processed securely online. Rentals and event space: pay a ${F.dep}% deposit or the full amount. A date is reserved only after payment is confirmed. If a payment fails or is canceled, the date is not reserved and the customer is not charged.
BOOKING: choose the service, pick a free date on the calendar, enter details, pay online. Rentals are confirmed by phone or email.
CHANGES AND REFUNDS: contact us as soon as possible with name, service and date. We try to move the booking to another date depending on availability. Refund requests are reviewed fairly; approved refunds go to the original payment method. A deposit holds the date and may not be refundable. If we must cancel (illness, severe weather) we offer a new date or a full refund. Policy: ${SITE}/cancellation
LANGUAGES: website in English, Spanish and French; this assistant can also write Haitian Creole.
LIVE AGENT: ${st === "on" ? "A real team member IS online right now. If the visitor wants a person, tell them to tap the \"Talk to an agent\" button under the chat." : "NO team member is online right now. If the visitor wants a person, say clearly that nobody is online at this moment, that tapping \"Talk to an agent\" lets them know here when someone is available, and that they can call/text or email meanwhile."}`;
}
const STYLE = `You are the virtual assistant of Fortune Studio LLC, chatting on the website. Sound like a warm, relaxed, professional front-desk person texting a customer: natural, friendly, never robotic or salesy.
Language: always answer in the language of the visitor's LAST message (English, Spanish, French or Haitian Creole; if it is another language, answer in it if you can).
Style: plain text only, no markdown, no asterisks, no headings, no bullet symbols. Short messages: usually 1 to 4 short sentences, at most one emoji. If you give several facts, put each on its own line. Separate two ideas with a blank line (each blank line becomes a new chat bubble). End with a short natural follow-up question only when it truly helps.
Rules:
- Use ONLY the facts below. Never invent prices, dates, availability, policies, delivery times or promises. If unsure, say so honestly and offer the team: call/text ${PHONE}, email ${EMAIL}, or the "Talk to an agent" button.
- You are an automated assistant. Never claim to be a human. If asked, say you are the virtual assistant.
- Never ask for card numbers, passwords or sensitive data.
- Stay on Fortune Studio topics; politely steer back otherwise.
- If the visitor reports a website or payment problem, a complaint, a refund or booking change, a very custom request, or wants a person: be kind, give any helpful fact, and ALWAYS put the exact marker [[agent]] at the very end of your reply (the marker is hidden from the visitor).`;

const clean = (v, n) => String(v == null ? "" : v).replace(/\u0000/g, "").trim().slice(0, n);

async function agentStatus() {
  let agentOnline = false, aiEnabled = true;
  try {
    const url = String(process.env.FORTUNE_SUPABASE_URL || "").replace(/\/$/, ""), key = process.env.FORTUNE_SUPABASE_SERVICE_ROLE_KEY || "";
    if (url && key) {
      const h = { headers: { apikey: key, Authorization: "Bearer " + key } };
      let rows = await (await fetch(url + "/rest/v1/support_settings?id=eq.1&select=agent_online,ai_enabled", h)).json().catch(() => null);
      if (!Array.isArray(rows)) rows = await (await fetch(url + "/rest/v1/support_settings?id=eq.1&select=agent_online", h)).json().catch(() => null);
      agentOnline = !!(Array.isArray(rows) && rows[0] && rows[0].agent_online);
      aiEnabled = !(Array.isArray(rows) && rows[0] && rows[0].ai_enabled === false);
    }
  } catch (_) {}
  return { agentOnline, aiEnabled };
}

module.exports = async function chat(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  if (badOrigin(req)) return res.status(403).json({ error: "forbidden" });
  if (limited(req, "ai-chat", 40, 10 * 60 * 1000)) return res.status(429).json({ error: "Please wait a moment before sending more messages." });

  let body;
  try { body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {}); }
  catch (_) { return res.status(400).json({ error: "invalid_json" }); }

  const incoming = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
  const messages = incoming
    .map((m) => ({ role: m && m.role === "assistant" ? "assistant" : "user", content: clean(m && m.content, 1500) }))
    .filter((m) => m.content);
  if (!messages.length || messages[messages.length - 1].role !== "user") return res.status(400).json({ error: "Write a message first." });
  const last = messages[messages.length - 1].content;

  const [{ agentOnline, aiEnabled }, F] = await Promise.all([agentStatus(), getFacts()]);
  if (!aiEnabled) return res.status(200).json({ reply: "", ai_disabled: true, agent_online: agentOnline });
  const st = agentOnline ? "on" : "off";
  const l = guessLang(last, body.lang);

  // 1) Ready-made answer: instant, consistent and free. Short, clear questions only; long or multi-topic ones go to ChatGPT.
  const ready = readyAnswer(last, F, l, st);
  const apiKey = process.env.OPENAI_API_KEY || "";
  const simple = ready && last.length <= 120 && ready.count <= 2;
  if (ready && (simple || !apiKey)) {
    return res.status(200).json({ reply: ready.reply, agent_online: agentOnline, offer_agent: ready.agent, source: "ready", intent: ready.ids[0] });
  }

  // 2) ChatGPT for everything else.
  if (apiKey) {
    const system = STYLE + "\n\nFACTS:\n" + knowledge(F, st) + "\n\nThe website language setting is \"" + (body.lang || "en") + "\" (only a hint; follow the visitor's own language).";
    const models = [process.env.OPENAI_MODEL, process.env.OPENAI_BACKUP_MODEL, "gpt-4o-mini"]
      .map((m) => String(m || "").trim()).filter((m, i, all) => m && all.indexOf(m) === i);
    let lastStatus = 0, lastCode = "";
    for (const model of models) {
      try {
        // max_completion_tokens and no custom temperature: works for older (gpt-4o) and newer (gpt-5, o-series) models.
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            max_completion_tokens: /^(gpt-5|o\d)/i.test(model) ? 1200 : 450,
            ...(/^(gpt-5|o\d)/i.test(model) ? { reasoning_effort: "minimal" } : {}),
            messages: [{ role: "system", content: system }].concat(messages)
          })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          lastStatus = response.status; lastCode = String((data && data.error && (data.error.code || data.error.type)) || "");
          console.error("AI chat error:", model, response.status, data && data.error && data.error.message);
          if (response.status === 401 || (response.status === 429 && lastCode === "insufficient_quota")) break; // another model will not fix a bad key or empty balance
          continue;
        }
        let reply = clean(data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content, 2000);
        if (reply) {
          const wantsAgent = /\[\[\s*agent\s*\]\]/i.test(reply);
          reply = reply.replace(/\[\[\s*agent\s*\]\]/gi, "").replace(/\*\*/g, "").trim();
          return res.status(200).json({ reply, agent_online: agentOnline, offer_agent: wantsAgent || !!(ready && ready.agent), source: "ai" });
        }
        console.error("AI chat empty reply from", model);
      } catch (error) {
        console.error("AI chat error:", model, error.message);
      }
    }
    console.error("AI chat fallback used. OpenAI code:", lastCode || String(lastStatus || "network"));
    if (ready) return res.status(200).json({ reply: ready.reply, agent_online: agentOnline, offer_agent: ready.agent, source: "ready", fallback: true });
  }

  // 3) Nothing matched and ChatGPT is not available: be honest and hand over to the team.
  return res.status(200).json({ reply: OTHER(F, l, st), agent_online: agentOnline, offer_agent: true, source: "other", fallback: true });
};
