/* The study guide on every machine: a plain "how it works" bar, a first-visit tour that spotlights each part of the
   page in turn, and a short walkthrough video where one has been recorded (study/videos/index.json).
   Loaded by kit.js after a machine mounts. Nothing here changes the lesson; it only points at it. */
(function(){
  if(window.__studyGuide)return;window.__studyGuide=true;
  const q=new URLSearchParams(location.search),VIDEO_MODE=q.has("video"),RM=matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mid=(location.pathname.split("/").pop()||"").replace(/\.html?$/,"");
  const css=`.howbar{display:flex;flex-wrap:wrap;align-items:center;gap:10px 18px;margin:0 0 14px;padding:12px 16px;border-radius:18px;background:#F5F1F2;border:1px solid rgba(36,11,33,.08);font:500 14px/1.35 "Instrument Sans",system-ui,sans-serif;color:#240B21}
  .howbar>b{font:600 11px "IBM Plex Mono",monospace;letter-spacing:.08em;text-transform:uppercase;color:#916A70}
  .howbar ol{display:flex;flex-wrap:wrap;gap:6px 16px;margin:0;padding:0;list-style:none;flex:1}
  .howbar li button{all:unset;cursor:pointer;display:flex;align-items:center;gap:8px;padding:4px 2px;border-radius:8px}.howbar li button:hover{text-decoration:underline;text-underline-offset:3px}.howbar li button:focus-visible{outline:2px solid #916A70;outline-offset:2px}
  .howbar li i{font-style:normal;display:grid;place-items:center;width:24px;height:24px;border-radius:50%;background:#240B21;color:#FFFDFB;font:600 12px "Instrument Sans",sans-serif;flex:none}
  .howbar .acts{display:flex;gap:8px;flex-wrap:wrap}.howbar .acts button{all:unset;cursor:pointer;padding:8px 14px;border-radius:999px;font-weight:600;font-size:14px;background:#fff;border:1px solid rgba(36,11,33,.16)}
  .howbar .acts button.vid{background:#240B21;color:#FFFDFB;border-color:#240B21}.howbar .acts button:focus-visible{outline:2px solid #916A70;outline-offset:2px}
  @media (prefers-color-scheme:dark){.howbar{background:#271a2a;color:#F5F1F2;border-color:rgba(245,241,242,.1)}.howbar li i{background:#F5F1F2;color:#240B21}.howbar .acts button{background:#140e16;color:#F5F1F2;border-color:rgba(245,241,242,.2)}.howbar .acts button.vid{background:#F5F1F2;color:#240B21}}
  @media (max-width:640px){.howbar ol{flex-direction:column;gap:2px}.howbar .acts{width:100%}.howbar .acts button{flex:1;text-align:center}}
  .tour-ring{position:fixed;z-index:80;border-radius:16px;box-shadow:0 0 0 4px #F2DC8A,0 0 0 9999px rgba(36,11,33,.55);pointer-events:none;transition:all .35s ease}
  .tour-tip{position:fixed;z-index:81;width:min(340px,calc(100vw - 24px));padding:16px 18px;border-radius:18px;background:#FFFDFB;color:#240B21;box-shadow:0 24px 60px -24px rgba(0,0,0,.6);font:400 16px/1.45 "Instrument Sans",system-ui,sans-serif;transition:top .35s ease,left .35s ease}
  .tour-tip b{display:block;font-size:18px;margin-bottom:4px}.tour-tip small{display:block;font:500 11px "IBM Plex Mono",monospace;color:#916A70;margin-bottom:6px}
  .tour-tip .row{display:flex;gap:8px;margin-top:12px}.tour-tip button{all:unset;cursor:pointer;padding:9px 16px;border-radius:12px;font-weight:600;font-size:15px}.tour-tip .go{background:#240B21;color:#FFFDFB;margin-left:auto}.tour-tip .skip{color:#654A4E}
  .tour-tip button:focus-visible{outline:2px solid #916A70;outline-offset:2px}
  @media (prefers-reduced-motion:reduce){.tour-ring,.tour-tip{transition:none}}
  dialog.howvid{width:min(960px,calc(100vw - 24px));padding:0;border:0;border-radius:20px;background:#140e16;overflow:hidden}dialog.howvid::backdrop{background:rgba(20,10,20,.7)}
  dialog.howvid video{display:block;width:100%;height:auto;background:#000}dialog.howvid .bar{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;color:#F5F1F2;font:500 14px "Instrument Sans",sans-serif}
  dialog.howvid button{all:unset;cursor:pointer;padding:8px 14px;border-radius:10px;background:#F5F1F2;color:#240B21;font-weight:600}`;
  const style=document.createElement("style");style.textContent=css;document.head.appendChild(style);

  // ---------- the tour: each stop is a part of the page and one plain sentence about it
  const STOPS=[
    ["nav.steps","Pick a topic","The tabs along the top are the topics. Start at 1 and work along. The last tab is Test yourself."],
    ["#k-cap","Read what to do","This line tells you what to do on this topic."],
    ["#k-ctl","Change the controls","Slide, tap or choose here. The picture above changes as you go."],
    ["#k-chips","Watch the numbers","These update every time you change something."],
    ["#k-deck","Read the notes","Exam line is what to write in the exam. Trap is a common mistake. Big idea is the main point."],
    ["nav.steps .step:last-of-type","Test yourself","When you're ready, open Test yourself, set the controls, then press Check on each challenge."],
    [".alt-fab","Stuck? Ask Allen","Allen can see this machine, explain it, move the controls to show you, and work through exam questions with you."]];
  let ring=null,tip=null,at=0;
  function place(){const [sel,title,text]=STOPS[at],el=document.querySelector(sel);if(!el){return next(1)}
    el.scrollIntoView({block:"center",behavior:RM?"auto":"smooth"});
    setTimeout(()=>{const r=el.getBoundingClientRect(),pad=8;Object.assign(ring.style,{left:r.left-pad+"px",top:r.top-pad+"px",width:r.width+pad*2+"px",height:r.height+pad*2+"px"});
      tip.innerHTML=`<small>${at+1} of ${STOPS.length}</small><b>${title}</b>${text}<div class="row"><button class="skip" type="button" data-t="end">Skip</button>${at?`<button type="button" data-t="back">Back</button>`:""}<button class="go" type="button" data-t="next">${at===STOPS.length-1?"Got it":"Next"}</button></div>`;
      const th=tip.offsetHeight,below=r.bottom+16+th<innerHeight;tip.style.top=Math.max(12,below?r.bottom+16:r.top-16-th)+"px";tip.style.left=Math.max(12,Math.min(innerWidth-tip.offsetWidth-12,r.left))+"px";tip.querySelector(".go").focus()},RM?0:380)}
  function next(d){at+=d;if(at<0)at=0;if(at>=STOPS.length)return end();place()}
  function end(){ring?.remove();tip?.remove();ring=tip=null;try{localStorage.setItem("study-tour-v1","done")}catch(e){};removeEventListener("keydown",key)}
  function key(e){if(e.key==="Escape")end();else if(e.key==="ArrowRight")next(1);else if(e.key==="ArrowLeft")next(-1)}
  function tour(from=0){end();at=from;ring=document.createElement("div");ring.className="tour-ring";tip=document.createElement("div");tip.className="tour-tip";tip.setAttribute("role","dialog");tip.setAttribute("aria-label","How this machine works");
    tip.addEventListener("click",e=>{const b=e.target.closest("[data-t]");if(!b)return;b.dataset.t==="next"?next(1):b.dataset.t==="back"?next(-1):end()});
    document.body.append(ring,tip);addEventListener("keydown",key);place()}

  // ---------- the walkthrough video
  function video(info){const d=document.createElement("dialog");d.className="howvid";d.setAttribute("aria-label","How to use this machine: video");
    d.innerHTML=`<video controls autoplay playsinline preload="metadata" poster="/study/videos/${mid}.jpg"><source src="/study/videos/${mid}.mp4" type="video/mp4"><track kind="captions" srclang="en" label="English" src="/study/videos/${mid}.vtt" default></video><div class="bar"><span>How to use this machine · ${info.dur||30} seconds</span><button type="button">Close</button></div>`;
    document.body.appendChild(d);d.querySelector("button").onclick=()=>d.close();d.addEventListener("close",()=>d.remove());d.showModal()}

  function mount(){const head=document.querySelector(".apphead");if(!head||document.querySelector(".howbar"))return;
    const bar=document.createElement("div");bar.className="howbar";bar.setAttribute("role","region");bar.setAttribute("aria-label","How this machine works");
    const items=[["Pick a topic",0],["Change the controls under the picture",2],["Read the notes",4],["Test yourself",5]];
    bar.innerHTML=`<b>How it works</b><ol>${items.map(([t,s],i)=>`<li><button type="button" data-stop="${s}"><i>${i+1}</i>${t}</button></li>`).join("")}</ol><span class="acts"><button type="button" data-tour>Show me around</button></span>`;
    head.insertAdjacentElement("afterend",bar);
    // short concept explainers (study/explainers.js) add a "▶ The idea" button to this bar on paired machines
    try{const x=document.createElement("script");x.src="/study/explainers.js";x.defer=true;document.head.appendChild(x)}catch(e){}
    bar.addEventListener("click",e=>{const s=e.target.closest("[data-stop]");if(s)return tour(+s.dataset.stop);if(e.target.closest("[data-tour]"))tour(0);if(e.target.closest("[data-vid]"))video(bar._vid)});
    fetch("/study/videos/index.json").then(r=>r.ok?r.json():null).then(j=>{const v=j&&j.videos&&j.videos[mid];if(!v)return;bar._vid=v;
      bar.querySelector(".acts").insertAdjacentHTML("afterbegin",`<button class="vid" type="button" data-vid>▶ Watch how · ${v.dur} s</button>`)}).catch(()=>{});
    // first visit to any machine: show the tour once (never during recordings or automated checks)
    let seen=false;try{seen=localStorage.getItem("study-tour-v1")==="done"}catch(e){}
    if(!seen&&!VIDEO_MODE&&!navigator.webdriver)setTimeout(()=>tour(0),1400)}
  window.StudyGuide={tour,mount};
  if(document.querySelector(".apphead"))mount();else addEventListener("studykit:mounted",mount);
})();
