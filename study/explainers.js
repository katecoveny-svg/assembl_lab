/* Short explainer videos: one concept in about 30 seconds, captions burned in for sound-off viewing.
   Code-drawn films (assembl animation studio). On the study hub this adds a "Watch" row after the machines;
   on a paired machine page it adds a "▶ The idea" button to the how-it-works bar (guide.js loads this file).
   Videos open in a sheet on tap, start muted, and never autoplay on their own. */
(function(){
  if(window.__studyExplainers)return;window.__studyExplainers=true;
  const BASE="/study/videos/explainers/";
  const LIST=[
    {id:"plates",title:"Why the Southern Alps are so high",std:"L1/L2 Geography",dur:39,machine:"fly"},
    {id:"quadratics",title:"Roots, vertex, discriminant",std:"L2 Maths · 91261",dur:38,machine:null},
    {id:"gradient",title:"Gradient is rate of change",std:"L2 Maths · 91262",dur:39,machine:null},
    {id:"paragraph",title:"Claim, evidence, explanation, so what",std:"L2 English · 91098",dur:40,machine:null},
    {id:"energy",title:"Energy is conserved",std:"L1 Science · 92047",dur:38,machine:"energy"},
    {id:"genes",title:"From gene to trait",std:"L1 Science · 92022",dur:41,machine:"genes"}];
  const css=`dialog.xvid{width:min(960px,calc(100vw - 24px));padding:0;border:0;border-radius:20px;background:#140e16;overflow:hidden}dialog.xvid::backdrop{background:rgba(20,10,20,.7)}
  dialog.xvid video{display:block;width:100%;height:auto;background:#F8F4EF}dialog.xvid .bar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 14px;color:#F5F1F2;font:500 14px "Instrument Sans",sans-serif}
  dialog.xvid button{all:unset;cursor:pointer;padding:8px 14px;border-radius:10px;background:#F5F1F2;color:#240B21;font-weight:600}dialog.xvid button:focus-visible{outline:2px solid #916A70;outline-offset:2px}
  .xwatch{box-sizing:border-box;max-width:1200px;margin:0 auto;padding:8px clamp(16px,4vw,40px) 28px}.xwatch h2{font:700 clamp(22px,3vw,30px)/1.15 "Instrument Sans",sans-serif;color:#240B21;margin:0 0 4px;letter-spacing:-.02em}.xwatch p{margin:0 0 14px;color:#654A4E;font:500 15px/1.4 "Instrument Sans",sans-serif}
  .xrow{display:flex;gap:14px;overflow-x:auto;padding:4px 2px 12px;scroll-snap-type:x mandatory;min-width:0}
  .xcard{all:unset;cursor:pointer;scroll-snap-align:start;display:block;box-sizing:border-box;flex:0 0 min(250px,72vw);border-radius:18px;background:#fff;border:1px solid rgba(36,11,33,.1);overflow:hidden;box-shadow:0 10px 24px -18px rgba(36,11,33,.5)}
  .xcard img{display:block;width:100%;height:auto;aspect-ratio:16/9;object-fit:cover;background:#F8F4EF}.xcard span{display:block;padding:10px 12px 12px;font:600 15px/1.3 "Instrument Sans",sans-serif;color:#240B21}.xcard small{display:block;margin-top:3px;font:500 12px "IBM Plex Mono",monospace;color:#916A70}
  .xcard:hover{border-color:#916A70}.xcard:focus-visible{outline:2px solid #916A70;outline-offset:2px}
  @media (prefers-color-scheme:dark){.xwatch h2{color:#F5F1F2}.xwatch p{color:#d9cdd3}.xcard{background:#271a2a;border-color:rgba(245,241,242,.12)}.xcard span{color:#F5F1F2}}`;
  const st=document.createElement("style");st.textContent=css;document.head.appendChild(st);
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  function open(v){const d=document.createElement("dialog");d.className="xvid";d.setAttribute("aria-label",v.title+": video");
    d.innerHTML=`<video controls playsinline muted autoplay preload="none" poster="${BASE}${v.id}.webp"><source src="${BASE}${v.id}.mp4" type="video/mp4"><track kind="captions" srclang="en" label="English" src="${BASE}${v.id}.vtt"></video><div class="bar"><span>${esc(v.title)} · ${v.dur} s · captions on screen</span><button type="button">Close</button></div>`;
    document.body.appendChild(d);d.querySelector("button").onclick=()=>d.close();d.addEventListener("close",()=>{const m=d.querySelector("video");if(m)m.pause();d.remove()});d.showModal()}
  window.StudyExplainers={list:LIST,open};
  // the hub: a Watch row after the machines
  const after=document.getElementById("machsec");
  if(after&&!document.getElementById("watch")){const s=document.createElement("section");s.className="xwatch";s.id="watch";s.setAttribute("aria-labelledby","h-watch");
    s.innerHTML=`<h2 id="h-watch">Watch one idea, in about 30 seconds.</h2><p>Six short explainers for this exam season. Captions are on screen, so they work with the sound off.</p><div class="xrow">${LIST.map(v=>`<button class="xcard" type="button" data-x="${v.id}"><img src="${BASE}${v.id}.webp" alt="" loading="lazy" width="640" height="360"><span>▶ ${esc(v.title)}<small>${esc(v.std)} · ${v.dur} s</small></span></button>`).join("")}</div>`;
    after.insertAdjacentElement("afterend",s);s.addEventListener("click",e=>{const b=e.target.closest("[data-x]");if(b)open(LIST.find(v=>v.id===b.dataset.x))})}
  // a machine page: a button in the how-it-works bar
  const mid=(location.pathname.split("/").pop()||"").replace(/\.html?$/,"");
  const mine=LIST.find(v=>v.machine&&v.machine===mid);
  if(mine){const add=()=>{const acts=document.querySelector(".howbar .acts");if(!acts||acts.querySelector("[data-xvid]"))return!!acts;
      const b=document.createElement("button");b.type="button";b.className="vid";b.dataset.xvid="";b.textContent=`▶ The idea · ${mine.dur} s`;b.onclick=()=>open(mine);acts.insertAdjacentElement("afterbegin",b);return true};
    if(!add()){let n=0;const iv=setInterval(()=>{if(add()||++n>40)clearInterval(iv)},250)}}
})();
