/* The study app: makes /study/ installable (home-screen icon, opens full screen, keeps visited machines for when
   the signal drops) and shows a "Get the app" button where the browser allows it. Loaded on the hub and by kit.js
   on every machine. Nothing here changes a lesson. */
(function(){
  if(window.__studyApp)return;window.__studyApp=true;
  const head=document.head,add=(tag,attrs)=>{const el=document.createElement(tag);for(const k in attrs)el.setAttribute(k,attrs[k]);head.appendChild(el);return el};
  if(!document.querySelector('link[rel="manifest"]'))add("link",{rel:"manifest",href:"/study/manifest.webmanifest"});
  if(!document.querySelector('link[rel="apple-touch-icon"]'))add("link",{rel:"apple-touch-icon",href:"/study/app/apple-touch-icon.png"});
  if(!document.querySelector('meta[name="apple-mobile-web-app-title"]'))add("meta",{name:"apple-mobile-web-app-title",content:"Study"});
  if(!document.querySelector('meta[name="mobile-web-app-capable"]'))add("meta",{name:"mobile-web-app-capable",content:"yes"});
  if("serviceWorker" in navigator&&location.protocol==="https:")addEventListener("load",()=>navigator.serviceWorker.register("/study/sw.js",{scope:"/study/"}).catch(()=>{}));

  const standalone=matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
  const ios=/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
  let deferred=null;
  const buttons=()=>document.querySelectorAll("[data-get-app]");
  function show(){if(standalone)return;buttons().forEach(b=>b.hidden=false)}
  addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferred=e;show()});
  addEventListener("appinstalled",()=>{deferred=null;buttons().forEach(b=>b.hidden=true)});
  function howTo(){const d=document.createElement("dialog");d.className="getapp-how";d.setAttribute("aria-label","Add Study to your home screen");
    d.innerHTML=`<b>Add Study to your home screen</b><ol><li>Tap the <strong>Share</strong> button <span aria-hidden="true">⬆︎</span> in Safari.</li><li>Choose <strong>Add to Home Screen</strong>.</li><li>Tap <strong>Add</strong>. Allen's icon appears with your apps.</li></ol><button type="button">Got it</button>`;
    document.body.appendChild(d);d.querySelector("button").onclick=()=>d.close();d.addEventListener("close",()=>d.remove());d.showModal()}
  document.addEventListener("click",async e=>{const b=e.target.closest("[data-get-app]");if(!b)return;
    if(deferred){deferred.prompt();await deferred.userChoice.catch(()=>{});deferred=null;return}
    howTo()});
  const css=`[data-get-app][hidden]{display:none!important}
  dialog.getapp-how{max-width:min(380px,calc(100vw - 32px));border:0;border-radius:20px;padding:20px 22px;background:#FFFDFB;color:#240B21;font:400 16px/1.45 "Instrument Sans",system-ui,sans-serif;box-shadow:0 24px 60px -24px rgba(36,11,33,.6)}
  dialog.getapp-how::backdrop{background:rgba(36,11,33,.45)}dialog.getapp-how b{display:block;font-size:19px;margin-bottom:6px}dialog.getapp-how ol{margin:0 0 14px;padding-left:20px}
  dialog.getapp-how button{all:unset;cursor:pointer;padding:9px 16px;border-radius:12px;background:#240B21;color:#FFFDFB;font-weight:600}dialog.getapp-how button:focus-visible{outline:2px solid #916A70;outline-offset:2px}`;
  const st=document.createElement("style");st.textContent=css;head.appendChild(st);
  // iPhone and iPad never fire beforeinstallprompt, so offer the how-to there instead.
  if(ios&&!standalone)(document.readyState==="loading"?addEventListener("DOMContentLoaded",show):show());
})();
