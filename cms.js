/* Fortune Studio visual editor runtime. Runs on the public site and inside admin.html. */
(function(){
var SKIP='#book,#chat,#mq,#space,script,style,svg,iframe,noscript,.cms-add';
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

var DEF={t:12,c:3,a:55,b:110,wh:150,wd:100,sh:80,ex:20,dl:25,phr:120,tax:6,dep:50,xh:25,ph:{30:[99,5],45:[139,8],60:[179,12],90:[249,18],120:[319,25]}};
F.DEF=DEF;
function curPrices(c){
  var p=(c&&c.prices)||{},o={ph:{}};
  ['t','c','a','b','wh','wd','sh','ex','dl','phr','tax','dep','xh'].forEach(function(k){var v=parseFloat(p[k]);o[k]=isFinite(v)&&v>=0?v:DEF[k]});
  Object.keys(DEF.ph).forEach(function(m){var q=(p.ph&&p.ph[m])||{},a=parseFloat(q[0]),b=parseInt(q[1],10);o.ph[m]=[isFinite(a)&&a>=0?a:DEF.ph[m][0],isFinite(b)&&b>=0?b:DEF.ph[m][1]]});
  return o;
}
function priceMap(o){
  var m={};m[DEF.t]=o.t;m[DEF.c]=o.c;m[DEF.a]=o.a;m[DEF.b]=o.b;m[DEF.wh]=o.wh;m[DEF.wd]=o.wd;m[DEF.sh]=o.sh;m[DEF.ex]=o.ex;m[DEF.dl]=o.dl;m[DEF.phr]=o.phr;
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
    FSP.t=o.t;FSP.c=o.c;FSP.a=o.a;FSP.b=o.b;FSP.wh=o.wh;FSP.wd=o.wd;FSP.sh=o.sh;FSP.tax=o.tax/100;FSP.dep=o.dep/100;FSP.xh=o.xh/100;
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

function sizeMedia(el,ms){
  ['width','height','max-width','object-fit','object-position','border-radius','margin-left','margin-right'].forEach(function(p){if(el._sz)el.style.removeProperty(p)});
  el._sz=false;if(!ms)return;
  var abs=false;try{abs=getComputedStyle(el).position==='absolute'}catch(e){}
  el._sz=true;var set=function(p,v){el.style.setProperty(p,v,'important')};
  if(!abs){
    if(ms.w){set('width',Math.min(100,Math.max(10,parseFloat(ms.w)))+'%');set('max-width','100%')}
    if(ms.h)set('height',parseFloat(ms.h)+'px');
    if(ms.a==='center'){el.style.setProperty('display','block','important');set('margin-left','auto');set('margin-right','auto')}
    if(ms.a==='right'){el.style.setProperty('display','block','important');set('margin-left','auto')}
  }
  if(ms.fit)set('object-fit',ms.fit==='contain'?'contain':'cover');
  if(ms.r!==undefined&&ms.r!=='')set('border-radius',parseFloat(ms.r)+'px');
}
var CLR=/^#[0-9a-f]{3,8}$/i;
function applyFx(c){
  var f=c.fx||{},b=f.bg||{},css='';
  var g=parseFloat(f.grain);if(isFinite(g))css+='#fx:after{opacity:'+Math.min(.3,Math.max(0,g/100))+'!important}';
  if(f.corners===false)css+='#fx i{display:none!important}';
  else if(f.cornerColor&&CLR.test(f.cornerColor))css+='#fx i{border-color:'+f.cornerColor+'!important}';
  if(f.glow===false)css+='.card:before,.opt:before{display:none!important}';
  if(f.reveal===false)css+='.rv{opacity:1!important;transform:none!important;transition:none!important}';
  if(f.hero===false)css+='.hero h1 span{animation:none!important;transform:none!important;opacity:1!important}';
  if(f.marquee===false)css+='.mq{display:none!important}';
  var st=document.getElementById('cms-fx');if(!st){st=document.createElement('style');st.id='cms-fx';document.head.appendChild(st)}
  st.textContent=css+'@keyframes cmsdrift{50%{transform:translate(7vw,-5vh) scale(1.18)}}@keyframes cmsfloat{0%{transform:translateY(0);opacity:0}15%{opacity:var(--o)}100%{transform:translateY(-115vh);opacity:0}}@media(prefers-reduced-motion:reduce){.cms-bgl *{animation:none!important}}';
  document.querySelectorAll('.cms-bgl').forEach(function(e){e.remove()});
  var host=document.getElementById('fx');if(!host||!b.type||b.type==='none')return;
  var L=document.createElement('div');L.className='cms-bgl';L.style.cssText='position:absolute;inset:0;overflow:hidden;pointer-events:none';
  var op=parseFloat(b.op);if(!isFinite(op))op=40;op=Math.min(100,Math.max(0,op))/100;
  var c1=CLR.test(b.c1||'')?b.c1:'#e8b99f',c2=CLR.test(b.c2||'')?b.c2:'#0a0a0a';
  if(b.type==='image'&&/^https:/i.test(b.img||'')){
    var bl=Math.min(40,Math.max(0,parseFloat(b.blur)||0));
    L.style.cssText+=';background:url("'+b.img.replace(/["\\]/g,'')+'") center/cover no-repeat;opacity:'+op+';filter:blur('+bl+'px);transform:scale(1.08)';
  }else if(b.type==='gradient'){
    L.style.cssText+=';background:linear-gradient('+(parseFloat(b.angle)||160)+'deg,'+c1+','+c2+');opacity:'+op;
  }else if(b.type==='glow'){
    [[10,15,'55vmax',26],[75,70,'48vmax',34],[50,-10,'40vmax',30]].forEach(function(p){
      var d=document.createElement('div');d.style.cssText='position:absolute;left:'+p[0]+'%;top:'+p[1]+'%;width:'+p[2]+';height:'+p[2]+';margin:-'+(parseFloat(p[2])/2)+'vmax 0 0 -'+(parseFloat(p[2])/2)+'vmax;border-radius:50%;background:radial-gradient(circle,'+c1+' 0,transparent 65%);opacity:'+(op*.55)+';filter:blur(30px);animation:cmsdrift '+p[3]+'s ease-in-out infinite';L.appendChild(d)});
  }else if(b.type==='bokeh'){
    for(var i=0;i<18;i++){var d=document.createElement('i'),sz=18+(i*37%60),x=(i*53)%100,dur=14+(i*7)%16,dl=-(i*3.1%dur);
      d.style.cssText='position:absolute;bottom:-12vh;left:'+x+'%;width:'+sz+'px;height:'+sz+'px;border-radius:50%;background:radial-gradient(circle,'+c1+',transparent 70%);--o:'+(op*.7)+';filter:blur('+(i%3)+'px);animation:cmsfloat '+dur+'s linear '+dl+'s infinite';L.appendChild(d)}
  }else return;
  host.insertBefore(L,host.firstChild);
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
    sizeMedia(el,c.ms&&c.ms[k]);
    if(el.getAttribute('src')!==want){el.setAttribute('src',want);if(el.tagName==='VIDEO'){try{el.load();el.play&&el.play().catch(function(){})}catch(e){}}}
  });
  document.querySelectorAll('.cms-add,.cms-addg').forEach(function(e){e.remove()});
  var add=c.add||{},gal=document.querySelector('.gal');
  (add.gallery||[]).forEach(function(u){
    if(!gal||!/^https:/i.test(u))return;
    var f=document.createElement('figure');f.className='g cms-addg';
    var i=document.createElement('img');i.src=u;i.alt='';i.loading='lazy';f.appendChild(i);gal.appendChild(f);
  });
  var ft=document.querySelector('footer.ft'),last={};
  var ANCH={start:'#top',top:'#top',mq:'.mq',about:'#about',rent:'#rent',gal:'#gal',wed:'#wed',vid:'#vid',area:'#area'};
  function embedUrl(u){
    var m=/^https:\/\/(?:www\.)?(?:youtube\.com\/watch\?(?:[^#]*&)?v=|youtu\.be\/|youtube\.com\/shorts\/)([\w-]{6,20})/i.exec(u||'');
    if(m)return 'https://www.youtube.com/embed/'+m[1];
    m=/^https:\/\/(?:www\.)?vimeo\.com\/(\d{5,12})/i.exec(u||'');
    if(m)return 'https://player.vimeo.com/video/'+m[1];
    return '';
  }
  (add.sections||[]).forEach(function(s,idx){
    if(!ft)return;
    var isBar=s.kind==='bar';
    var sec=document.createElement(isBar?'div':'section');sec.className='cms-add'+(isBar?' cms-bar':'');sec.dataset.addi=idx;
    var al=s.align==='left'||s.align==='right'?s.align:'center';sec.style.textAlign=al;
    if(isBar){
      var bg=CLR.test(s.bg||'')?s.bg:'#b88963',fg=CLR.test(s.fg||'')?s.fg:'#111111';
      sec.style.cssText+=';background:'+bg+';color:'+fg+';padding:14px 20px;font-weight:700;position:relative;z-index:1';
      var bt=document.createElement('div');bt.style.cssText='max-width:1100px;margin:0 auto;white-space:pre-wrap';
      bt.textContent=[s.title,s.text].filter(Boolean).join(' — ');sec.appendChild(bt);
      if(s.btnText&&s.btnLink&&SAFE.test(s.btnLink)){
        var ba=document.createElement('a');ba.textContent=s.btnText;ba.href=s.btnLink;ba.style.cssText='display:inline-block;margin-left:12px;color:inherit;text-decoration:underline';
        if(/^https?:/i.test(s.btnLink)){ba.target='_blank';ba.rel='noopener'}bt.appendChild(ba);
      }
    }else{
      if(s.title){var h=document.createElement('h2');h.textContent=s.title;sec.appendChild(h)}
      if(s.text){var p=document.createElement('p');p.style.cssText='color:var(--mu);max-width:680px;white-space:pre-wrap;margin:0 '+(al==='center'?'auto':al==='right'?'0 0 auto':'auto 0 0')+' 14px';p.textContent=s.text;sec.appendChild(p)}
      var w=Math.min(100,Math.max(10,parseFloat(s.w)||100)),hh=parseFloat(s.h)||0,r=parseFloat(s.radius);if(!isFinite(r))r=14;
      var mar='margin:14px '+(al==='center'?'auto':al==='right'?'0 0 auto':'auto 0 0');
      var eu=embedUrl(s.embed);
      if(eu){
        var fr=document.createElement('iframe');fr.src=eu;fr.allow='accelerometer;autoplay;encrypted-media;picture-in-picture;fullscreen';fr.allowFullscreen=true;fr.loading='lazy';fr.title=s.title||'Video';
        fr.style.cssText='display:block;border:0;max-width:100%;width:'+w+'%;'+(hh?'height:'+hh+'px':'aspect-ratio:16/9')+';border-radius:'+r+'px;'+mar;
        sec.appendChild(fr);
      }else if(s.media&&/^https:/i.test(s.media)){
        var isV=/\.(mp4|webm|mov)(\?|$)/i.test(s.media),m=document.createElement(isV?'video':'img');
        m.src=s.media;
        m.style.cssText='display:block;max-width:100%;width:'+w+'%;height:'+(hh?hh+'px':'auto')+';object-fit:'+(s.fit==='contain'?'contain':'cover')+';border-radius:'+r+'px;'+mar;
        if(isV){m.controls=true;m.playsInline=true;m.preload='metadata';if(s.auto){m.autoplay=true;m.muted=true;m.loop=true;m.controls=false}}else{m.alt=s.title||'';m.loading='lazy'}
        sec.appendChild(m);
      }
      if(s.btnText&&s.btnLink&&SAFE.test(s.btnLink)){
        var a=document.createElement('a');a.className='btn';a.style.marginTop='14px';a.textContent=s.btnText;a.href=s.btnLink;if(/^https?:/i.test(s.btnLink)){a.target='_blank';a.rel='noopener'}sec.appendChild(a);
      }
    }
    var key=s.after||'';var ref=ANCH[key]&&document.querySelector(ANCH[key]);
    if(key==='start'&&ref&&ref.parentNode){
      ref.parentNode.insertBefore(sec,last.start?last.start.nextSibling:ref);last.start=sec;
    }else{
      if(ref&&last[key])ref=last[key];
      if(ref&&ref.parentNode){ref.parentNode.insertBefore(sec,ref.nextSibling);last[key]=sec}
      else ft.parentNode.insertBefore(sec,ft);
    }
  });
  applyFx(c);
}
F.tag=tag;F.applyAll=applyAll;F.applyText=applyText;F.lang=lang;
var st=document.createElement('style');st.textContent='.cms-hide{display:none!important}img,video{max-width:100%}body{overflow-x:clip}.cms-add{overflow-wrap:anywhere}.cms-add img,.cms-add video{max-width:100%}.cms-add .btn{display:inline-block}.cms-bar a{color:inherit}';document.head.appendChild(st);
tag();
if(typeof window.tr==='function'){var o=window.tr;window.tr=function(){var r=o.apply(this,arguments);applyText();return r}}
if(/[?&]cmsedit=1/.test(location.search)){F.edit=true;return}
var CL=null,LAST='';
async function pull(){
  try{
    if(!CL){
      var r=await fetch('/api/supabase-config',{cache:'no-store'});if(!r.ok)return;
      var cfg=await r.json();if(!cfg.url||!cfg.key||!window.supabase)return;
      CL=window.supabase.createClient(cfg.url,cfg.key);
    }
    var q=await CL.from('site_settings').select('content').eq('id',1).maybeSingle();
    if(q.data&&q.data.content){var j=JSON.stringify(q.data.content);if(j!==LAST){LAST=j;F.content=q.data.content;applyAll()}}
  }catch(e){console.warn('Fortune CMS unavailable',e)}
}
pull();
document.addEventListener('visibilitychange',function(){if(!document.hidden)pull()});
})();
