const API = (String(process.env.PAYPAL_ENV||process.env.PAYPAL_MODE||"").toLowerCase()==="live") ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
async function accessToken() {
  const id = process.env.PAYPAL_CLIENT_ID, secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) throw new Error("PayPal is not configured. Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in Vercel.");
  const r = await fetch(API + "/v1/oauth2/token", { method:"POST", headers:{ Authorization:"Basic "+Buffer.from(id+":"+secret).toString("base64"), "Content-Type":"application/x-www-form-urlencoded" }, body:"grant_type=client_credentials" });
  const j = await r.json().catch(()=>({}));
  if (!r.ok || !j.access_token) throw new Error("PayPal authentication failed: "+(j.error_description||j.error||r.status));
  return j.access_token;
}
async function paypal(path, options={}) {
  const token = await accessToken();
  const r = await fetch(API+path,{...options,headers:{Authorization:"Bearer "+token,"Content-Type":"application/json",...(options.headers||{})}});
  const j=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error("PayPal API error: "+(j.message||j.name||r.status));
  return j;
}
function supaHeaders(){const key=process.env.FORTUNE_SUPABASE_SERVICE_ROLE_KEY;if(!process.env.FORTUNE_SUPABASE_URL||!key)throw new Error("Add FORTUNE_SUPABASE_URL and FORTUNE_SUPABASE_SERVICE_ROLE_KEY in Vercel, and create the PayPal bookings table.");return {apikey:key,Authorization:"Bearer "+key,"Content-Type":"application/json",Prefer:"return=representation"}}
async function saveBooking(orderId,booking,status,captureId){
 const url=process.env.FORTUNE_SUPABASE_URL.replace(/\/$/,"")+"/rest/v1/paypal_bookings";
 const r=await fetch(url,{method:"POST",headers:{...supaHeaders(),Prefer:"resolution=merge-duplicates,return=representation"},body:JSON.stringify({order_id:orderId,status,booking,capture_id:captureId||null})});
 if(!r.ok)throw new Error("Could not save PayPal booking in Supabase: "+(await r.text()).slice(0,250));
 return r.json();
}
async function getBooking(orderId){
 const url=process.env.FORTUNE_SUPABASE_URL.replace(/\/$/,"")+"/rest/v1/paypal_bookings?order_id=eq."+encodeURIComponent(orderId)+"&select=*";
 const r=await fetch(url,{headers:supaHeaders()});if(!r.ok)throw new Error("Could not load PayPal booking");
 const j=await r.json();return j[0]||null;
}
async function setBooking(orderId,status,captureId){
 const url=process.env.FORTUNE_SUPABASE_URL.replace(/\/$/,"")+"/rest/v1/paypal_bookings?order_id=eq."+encodeURIComponent(orderId);
 const r=await fetch(url,{method:"PATCH",headers:supaHeaders(),body:JSON.stringify({status,capture_id:captureId||null,updated_at:new Date().toISOString()})});
 if(!r.ok)throw new Error("Could not update PayPal booking");
}
module.exports={paypal,saveBooking,getBooking,setBooking};
