const { paypal, getBooking, setBooking } = require("./_paypal");
const { stripe, limited, badOrigin } = require("./_lib");
const esc=v=>String(v??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const OWNER=process.env.OWNER_EMAIL||"fortunestudio14@gmail.com";
async function mail(to,subject,html,replyTo){
 if(!to||!process.env.RESEND_API_KEY)return false;
 const r=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:"Bearer "+process.env.RESEND_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({from:process.env.MAIL_FROM||"Fortune Studio <onboarding@resend.dev>",to:[to],reply_to:replyTo,subject,html})});
 if(!r.ok){console.error("PayPal email failed",r.status,await r.text());return false;}return true;
}
const labels=[["date_label","Date"],["time","Start time"],["service","Service"],["subtotal","Subtotal"],["tax","Tax"],["total","Total"],["paid_now","Paid now"],["balance","Remaining balance"],["name","Name"],["phone","Phone"],["address","Event address"]];
function table(m){return "<table cellpadding='7' style='border-collapse:collapse'>"+labels.map(([k,l])=>"<tr><td style='color:#666'>"+l+"</td><td><b>"+esc(m[k])+"</b></td></tr>").join("")+"</table>";}
module.exports=async(req,res)=>{
 if(req.method!=="POST")return res.status(405).end();
 if(badOrigin(req))return res.status(403).json({error:"forbidden"});
 if(limited(req,"paypal-capture",30,10*60*1000))return res.status(429).json({error:"too_many_requests"});
 try{
  const b=typeof req.body==="string"?JSON.parse(req.body):req.body||{},id=String(b.orderId||"");
  if(!/^[A-Z0-9-]{10,40}$/i.test(id))return res.status(400).json({error:"invalid_order"});
  const row=await getBooking(id);if(!row)return res.status(404).json({error:"booking_not_found"});
  const m=row.booking||{};
  if(row.status==="paid")return res.status(200).json({ok:true,alreadyCaptured:true});
  let captured=await paypal("/v2/checkout/orders/"+encodeURIComponent(id),{method:"GET"});
  if(captured.status!=="COMPLETED") captured=await paypal("/v2/checkout/orders/"+encodeURIComponent(id)+"/capture",{method:"POST",body:"{}"});
  const pu=(captured.purchase_units||[])[0]||{},cap=((pu.payments||{}).captures||[])[0]||{};
  if(captured.status!=="COMPLETED"||cap.status!=="COMPLETED")return res.status(402).json({error:"payment_not_completed"});
  if(!cap.amount||cap.amount.currency_code!=="USD"||Number(cap.amount.value)!==Number(m.amount))return res.status(400).json({error:"payment_amount_mismatch"});
  await setBooking(id,"paid",cap.id);
  if (m.coupon_id) {
    try { await stripe().promotionCodes.update(m.coupon_id, { active: false, metadata: { used: "1", used_date: new Date().toISOString().slice(0,10), booking: m.date_label || "", customer: String(m.name || "").slice(0,100) } }); }
    catch (e) { console.error("PayPal coupon redeem failed", e.message); }
  }
  const brand="<div style='font-family:Arial,sans-serif;max-width:520px;margin:0 auto;border:1px solid #e8e1d6;border-radius:14px;overflow:hidden;background:#fff'><div style='background:#171717;color:#f4e7cf;padding:24px;text-align:center;font-size:24px;letter-spacing:4px;font-weight:700'>FORTUNE STUDIO</div><div style='padding:24px'>";
  const end="<p style='color:#777;font-size:12px;border-top:1px solid #eee;padding-top:16px;margin-top:24px'>Fortune Studio LLC · 570-309-5776 · fortunestudio14@gmail.com</p></div></div>";
  await mail(m.email,"Payment confirmed — your date is reserved · "+m.date_label,brand+"<h2>Thank you, "+esc(m.name)+"!</h2><p>Your PayPal payment was received and your reservation details are below.</p><p style='background:#eaf7ee;color:#176b35;padding:12px;border-radius:8px;font-weight:bold'>PAYMENT CONFIRMED</p>"+table(m)+"<p>We will contact you if any additional details are needed.</p>"+end,OWNER);
  const ownerHtml=brand+"<h2 style='color:#a61b1b'>NEW PAID BOOKING — PAYPAL</h2><p style='background:#eaf7ee;color:#176b35;padding:12px;border-radius:8px;font-weight:bold'>PAYMENT RECEIVED</p>"+table(m)+"<p>Customer email: "+esc(m.email)+"</p><p>PayPal capture: "+esc(cap.id)+"</p>"+end;
  await mail(OWNER,"NEW PAID BOOKING · PayPal · "+m.date_label+" · "+m.name,ownerHtml,m.email);
  res.status(200).json({ok:true});
 }catch(e){console.error("PayPal capture:",e);res.status(400).json({error:"paypal_capture_failed",detail:String(e.message||e).slice(0,220)});}
};
