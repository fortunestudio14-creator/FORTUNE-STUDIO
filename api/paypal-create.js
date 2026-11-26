const { quote, availability, couponFor, claimCode, money, limited, badOrigin } = require("./_lib");
const { paypal, saveBooking } = require("./_paypal");
const cut=(v,n=200)=>String(v??"").slice(0,n);
module.exports=async(req,res)=>{
 // GET = public PayPal Client ID (safe to expose, it is meant for the browser) so the PayPal button can load inside the site.
 if(req.method==="GET"){const id=process.env.PAYPAL_CLIENT_ID;if(!id)return res.status(503).json({error:"not_configured"});res.setHeader("Cache-Control","no-store");return res.status(200).json({clientId:id,env:process.env.PAYPAL_ENV==="live"?"live":"sandbox"});}
 if(req.method!=="POST")return res.status(405).end();
 if(badOrigin(req))return res.status(403).json({error:"forbidden"});
 if(limited(req,"paypal-create",25,10*60*1000))return res.status(429).json({error:"too_many_requests"});
 try{
  const b=typeof req.body==="string"?JSON.parse(req.body):req.body||{};
  const d=cut(b.date,10),today=new Date().toISOString().slice(0,10),day=new Date(d+"T12:00:00Z");
  if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||d<today||day.getUTCDay()===1)throw new Error("Invalid date");
  if(!cut(b.name).trim()||!/^\S+@\S+\.\S+$/.test(cut(b.email))||cut(b.phone).replace(/\D/g,"").length!==10||!cut(b.address).trim())throw new Error("Missing customer details");
  const av=await availability();if(av.blocked.includes(d))return res.status(409).json({error:"taken"});
  const wins=av.windows[d];if(wins){const tv=Number(b.tv);if(!Number.isFinite(tv)||!wins.some(w=>tv>=w[0]&&tv<=w[1]))return res.status(409).json({error:"time"});}
  let coupon=null;
  if(cut(b.coupon,40).trim()&&String(b.pk)!=="w"){
   const c=await couponFor(b.coupon);if(!c.ok)return res.status(409).json({error:"coupon",reason:c.reason});
   if(!(await claimCode(c.code)))return res.status(409).json({error:"coupon",reason:"used"});coupon=c;
  }
  const q=await quote(b,coupon),label=day.toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric",timeZone:"UTC"});
  const origin=req.headers.origin||"https://"+req.headers.host;
  const booking={
   app:"fortune",date:d,date_label:label,time:cut(b.time,20),service:q.label,
   subtotal:q.wd?"-":money(q.subtotal),tax:q.wd?"-":money(q.tax),total:q.wd?"Quote to be confirmed":money(q.total),
   paid_now:money(q.due),balance:q.wd?"Quote to be confirmed":money(q.balance),
   sale:q.sale||"-",coupon:coupon?coupon.code:"",coupon_id:coupon?coupon.id:"",
   discount:coupon?money(q.disc)+(coupon.amt>0?" ("+money(coupon.amt)+" off)":" ("+coupon.pct+"% off)"):"",
   delivery:b.delivery?"yes":"no",name:cut(b.name,100),phone:cut(b.phone,20),email:cut(b.email,200),address:cut(b.address,300),lang:cut(b.lang,2),
   amount:Number(q.due).toFixed(2),currency:"USD"
  };
  // inline = the PayPal button on our own page (popup over the site, nobody leaves). No redirect links needed.
  const inline=b.inline===true;
  const order=await paypal("/v2/checkout/orders",{method:"POST",body:JSON.stringify({
   intent:"CAPTURE",
   purchase_units:[{description:"Fortune Studio · "+q.label+" · "+label,custom_id:"fortune",amount:{currency_code:"USD",value:booking.amount}}],
   ...(inline?{}:{payment_source:{paypal:{experience_context:{brand_name:"Fortune Studio LLC",user_action:"PAY_NOW",return_url:origin+"/?paypal=success",cancel_url:origin+"/?paypal=cancel"}}}})
  })});
  if(inline){await saveBooking(order.id,booking,"pending",null);return res.status(200).json({orderId:order.id});}
  const approve=(order.links||[]).find(x=>x.rel==="payer-action"||x.rel==="approve");
  if(!approve||!approve.href)throw new Error("PayPal did not return an approval link");
  await saveBooking(order.id,booking,"pending",null);
  res.status(200).json({approvalUrl:approve.href});
 }catch(e){console.error("PayPal create order:",e);res.status(400).json({error:"paypal_checkout_failed",detail:String(e.message||e).slice(0,220)});}
};
