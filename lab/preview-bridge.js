(() => {
if(!window.__labEmbed)return;
const T=window.__twin||window.__cafe||window.__store;
function report(){parent.postMessage({type:T?'assembl:preview:ready':'assembl:preview:unavailable'},location.origin);}
addEventListener('message',e=>{if(e.origin===location.origin&&e.source===parent&&e.data?.type==='assembl:preview:ping')report();});if(!T){parent.postMessage({type:'assembl:preview:unavailable'},location.origin);return;}
let paused=false,offscreen=false;
const home=!!window.__twin;
function applyPlayback(){const stop=paused||offscreen;const b=document.getElementById('pause');if(b&&b.textContent.trim()===(stop?'Pause':'Play'))b.click();}
if(home){T.speed(1200);T.jump(13);T.S.solar=4;T.sync();T.recompute();}
else if(window.__cafe){T.speed(2);T.jump(9);}
else{T.speed(1);T.jump(17.75);}
window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==parent||e.data?.type!=='assembl:preview')return;const {action,value}=e.data;
if(action==='view'){const allowed=home?['all','living','roof']:window.__cafe?['venue','counter','kitchen']:['store','checkouts','chillers'];if(allowed.includes(value))T.setView(value);}
if(action==='pause'&&typeof value==='boolean'){paused=value;applyPlayback();}
if(action==='visibility'&&typeof value==='boolean'){offscreen=!value;applyPlayback();}
});
if(matchMedia('(prefers-reduced-motion: reduce)').matches){paused=true;applyPlayback();}
parent.postMessage({type:'assembl:preview:ready'},location.origin);
})();
