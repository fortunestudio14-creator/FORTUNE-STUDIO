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
    if(el.closest(SKIP)||!el.closest('nav,header,section,footer'))return;
    var g=el.tagName;
    if(g==='IMG'||g==='VIDEO')el.dataset.cmsm='m'+(m++);
    if(g==='A'&&el.hasAttribute('href'))el.dataset.cmsa='a'+(a++);
    if(el.matches(BLOCK))el.dataset.cmsx='x'+(x++);
    if(LEAF[g]&&el.children.length===0&&!el.id){
      el.dataset.cms=el.dataset.i?'i:'+el.dataset.i:'n'+(n++);
    }
  });
}
function applyText(){
  var c=F.content||{},T=(c.t&&c.t[lang()])||{};
  document.querySelectorAll('[data-cms]').forEach(function(el){
    var k=el.dataset.cms;
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
  if(typeof window.tr==='function'&&F.edit)try{window.tr()}catch(e){}
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
