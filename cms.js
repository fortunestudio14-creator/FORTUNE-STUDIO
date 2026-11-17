/* Fortune Studio visual editor runtime. Runs on the public site and inside admin.html. */
(function(){
var SKIP='#book,#chat,#mq,script,style,svg,iframe,noscript,.cms-add';
var BLOCK='.card,figure,section,li,.btn,.soc a,.lc a,.lc span';
var LEAF={H1:1,H2:1,H3:1,H4:1,H5:1,P:1,LI:1,SPAN:1,EM:1,STRONG:1,B:1,A:1,BUTTON:1,DIV:1,FIGCAPTION:1,LABEL:1,SMALL:1};
var SAFE=/^(https?:|mailto:|tel:|#|\/)/i;
var F=window.FS_CMS={content:{}};
function lang(){try{return(typeof L!=='undefined'&&L)||'en'}catch(e){return'en'}}
function tag(){
  var n=0,a=0,m=0,x=0;
  document.body.querySelectorAll('*').forEach(function(el){
    var g=el.tagName;
    if(el.dataset&&el.dataset.i&&LEAF[g]&&el.children.length===0&&!el.closest('script,style,svg,noscript')){el.dataset.cms='i:'+el.dataset.i;return}
    if(el.closest(SKIP)||!el.closest('nav,header,section,footer'))return;
    if(g==='IMG'||g==='VIDEO')el.dataset.cmsm='m'+(m++);
    if(g==='A'&&el.hasAttribute('href'))el.dataset.cmsa='a'+(a++);
    if(el.matches(BLOCK))el.dataset.cmsx='x'+(x++);
    if(LEAF[g]&&el.children.length===0&&!el.id){
      el.dataset.cms=el.dataset.i?'i:'+el.dataset.i:'n'+(n++);
    }
  });
}

var DEF={t:12,c:3,a:55,b:110,wh:150,wd:100,ex:20,dl:25,phr:120,tax:6,dep:50,xh:25,ph:{30:[99,5],45:[139,8],60:[179,12],90:[249,18],120:[319,25]}};
F.DEF=DEF;
function curPrices(c){
  var p=(c&&c.prices)||{},o={ph:{}};
  ['t','c','a','b','wh','wd','ex','dl','phr','tax','dep','xh'].forEach(function(k){var v=parseFloat(p[k]);o[k]=isFinite(v)&&v>=0?v:DEF[k]});
  Object.keys(DEF.ph).forEach(function(m){var q=(p.ph&&p.ph[m])||{},a=parseFloat(q[0]),b=parseInt(q[1],10);o.ph[m]=[isFinite(a)&&a>=0?a:DEF.ph[m][0],isFinite(b)&&b>=0?b:DEF.ph[m][1]]});
  return o;
}
function priceMap(o){
  var m={};m[DEF.t]=o.t;m[DEF.c]=o.c;m[DEF.a]=o.a;m[DEF.b]=o.b;m[DEF.wh]=o.wh;m[DEF.wd]=o.wd;m[DEF.ex]=o.ex;m[DEF.dl]=o.dl;m[DEF.phr]=o.phr;
  Object.keys(DEF.ph).forEach(function(k){m[DEF.ph[k][0]]=o.ph[k][0]});
  return m;
}
function swapText(str,m,o){
  var nums=Object.keys(m).sort(function(a,b){return b.length-a.length}).join('|');
  str=str.replace(new RegExp('\\$('+nums+')(?![\\d])','g'),function(x,n){return '$'+m[n]});
  str=str.replace(new RegExp('(?<![\\d.,])('+nums+')(?=[\\s\\u00a0\\u202f]\\$)','g'),function(x,n){return m[n]});
  if(o.tax!==DEF.tax)str=str.replace(/(?<![\d.,])6(?=\s?%)/g,o.tax);
  if(o.xh!==DEF.xh)str=str.replace(/(?<![\d.,])25(?=\s?%)/g,o.xh);
  return str;
}
function applyData(c){
  if(typeof D==='undefined')return;
  if(!F.D0)F.D0=JSON.parse(JSON.stringify(D));
  var o=curPrices(c),m=priceMap(o),changed=Object.keys(m).some(function(k){return +k!==m[k]})||o.tax!==DEF.tax||o.xh!==DEF.xh;
  Object.keys(F.D0).forEach(function(l){
    var src=F.D0[l];if(!D[l])D[l]={};
    Object.keys(src).forEach(function(k){var v=src[k];D[l][k]=(changed&&typeof v==='string')?swapText(v,m,o):v});
  });
  var T=c&&c.t||{};
  Object.keys(T).forEach(function(l){
    if(!D[l])return;
    Object.keys(T[l]).forEach(function(k){if(k.indexOf('i:')===0&&typeof T[l][k]==='string')D[l][k.slice(2)]=T[l][k]});
  });
  if(typeof FSP!=='undefined'){
    FSP.t=o.t;FSP.c=o.c;FSP.a=o.a;FSP.b=o.b;FSP.wh=o.wh;FSP.wd=o.wd;FSP.tax=o.tax/100;FSP.dep=o.dep/100;FSP.xh=o.xh/100;
  }
  if(typeof P!=='undefined')P.forEach(function(r){var q=o.ph[r[0]];if(q){r[1]=q[0];r[2]=q[1]}});
  F.o=o;F.m=m;
}
function patchPrices(c){
  var o=F.o,m=F.m;if(!o)return;
  document.querySelectorAll('.price,label.opt b').forEach(function(e){
    if(e._op===undefined)e._op=e.textContent;
    var base=e._op.replace(/\s/g,'');if(!/^\$\d+$/.test(base))return;
    e.textContent=swapText(base,m,o);
  });
  if(typeof P!=='undefined'){
    document.querySelectorAll('#pho label b').forEach(function(b,i){if(P[i])b.textContent='$'+P[i][1]});
    document.querySelectorAll('#pg .price').forEach(function(b,i){if(P[i])b.textContent='$'+P[i][1]});
  }
  try{if(typeof upd==='function')upd()}catch(e){}
}
function applyText(){
  var c=F.content||{},T=(c.t&&c.t[lang()])||{};
  document.querySelectorAll('[data-cms]').forEach(function(el){
    var k=el.dataset.cms;
    if(k.charAt(0)==='i')return;
    if(T[k]!==undefined){
      if(el._ot===undefined&&!el.dataset.i)el._ot=el.textContent;
      el.textContent=T[k];
    }else if(el._ot!==undefined){el.textContent=el._ot;el._ot=undefined}
  });
}
function applyAll(){
  var c=F.content||{},root=document.documentElement;
  ['--bg','--card','--line','--tx','--mu','--ac'].forEach(function(v){
    if(c.css&&c.css[v])root.style.setProperty(v,c.css[v]);else root.style.removeProperty(v);
  });
  try{applyData(c)}catch(e){console.warn('data apply failed',e)}
  if(typeof window.tr==='function')try{window.tr()}catch(e){}
  try{patchPrices(c)}catch(e){}
  applyText();
  document.querySelectorAll('[data-cmsx]').forEach(function(el){
    el.classList.toggle('cms-hide',!!(c.h&&c.h[el.dataset.cmsx]));
  });
  document.querySelectorAll('[data-cmsa]').forEach(function(el){
    var k=el.dataset.cmsa,v=c.l&&c.l[k];
    if(el._oh===undefined)el._oh=el.getAttribute('href');
    if(v&&SAFE.test(v)){el.setAttribute('href',v);if(/^https?:/i.test(v)){el.target='_blank';el.rel='noopener'}}
    else el.setAttribute('href',el._oh);
  });
  document.querySelectorAll('[data-cmsm]').forEach(function(el){
    var k=el.dataset.cmsm,v=c.m&&c.m[k];
    if(el._os===undefined)el._os=el.getAttribute('src');
    var want=(v&&/^https:/i.test(v))?v:el._os;
    if(el.getAttribute('src')!==want){el.setAttribute('src',want);if(el.tagName==='VIDEO'){try{el.load();el.play&&el.play().catch(function(){})}catch(e){}}}
  });
  document.querySelectorAll('.cms-add,.cms-addg').forEach(function(e){e.remove()});
  var add=c.add||{},gal=document.querySelector('.gal');
  (add.gallery||[]).forEach(function(u){
    if(!gal||!/^https:/i.test(u))return;
    var f=document.createElement('figure');f.className='g cms-addg';
    var i=document.createElement('img');i.src=u;i.alt='';i.loading='lazy';f.appendChild(i);gal.appendChild(f);
  });
  var ft=document.querySelector('footer.ft');
  (add.sections||[]).forEach(function(s){
    if(!ft)return;
    var sec=document.createElement('section');sec.className='cms-add';
    if(s.title){var h=document.createElement('h2');h.textContent=s.title;sec.appendChild(h)}
    if(s.text){var p=document.createElement('p');p.style.cssText='color:var(--mu);max-width:640px;white-space:pre-wrap';p.textContent=s.text;sec.appendChild(p)}
    if(s.media&&/^https:/i.test(s.media)){
      var isV=/\.(mp4|webm|mov)(\?|$)/i.test(s.media),m=document.createElement(isV?'video':'img');
      m.src=s.media;m.style.cssText='max-width:100%;border-radius:14px;margin-top:14px;display:block';
      if(isV){m.controls=true;m.playsInline=true}else m.alt='';
      sec.appendChild(m);
    }
    if(s.btnText&&s.btnLink&&SAFE.test(s.btnLink)){
      var a=document.createElement('a');a.className='btn';a.style.marginTop='14px';a.textContent=s.btnText;a.href=s.btnLink;sec.appendChild(a);
    }
    ft.parentNode.insertBefore(sec,ft);
  });
}
F.tag=tag;F.applyAll=applyAll;F.applyText=applyText;F.lang=lang;
var st=document.createElement('style');st.textContent='.cms-hide{display:none!important}';document.head.appendChild(st);
tag();
if(typeof window.tr==='function'){var o=window.tr;window.tr=function(){var r=o.apply(this,arguments);applyText();return r}}
if(/[?&]cmsedit=1/.test(location.search)){F.edit=true;return}
(async function(){
  try{
    var r=await fetch('/api/supabase-config',{cache:'no-store'});if(!r.ok)return;
    var cfg=await r.json();if(!cfg.url||!cfg.key||!window.supabase)return;
    var cl=window.supabase.createClient(cfg.url,cfg.key);
    var q=await cl.from('site_settings').select('content').eq('id',1).maybeSingle();
    if(q.data&&q.data.content){F.content=q.data.content;applyAll()}
  }catch(e){console.warn('Fortune CMS unavailable',e)}
})();
})();
