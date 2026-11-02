/* A short explainer film for the trades twin: tap the button, a sheet opens, the video starts muted with captions on screen.
   preload="none": nothing downloads until someone asks for it. Code-drawn (assembl animation studio), Simulated content. */
(function(){
  const css=`dialog.twatch{width:min(960px,calc(100vw - 24px));padding:0;border:0;border-radius:20px;background:#140e16;overflow:hidden}dialog.twatch::backdrop{background:rgba(20,10,20,.7)}
  dialog.twatch video{display:block;width:100%;height:auto;background:#F8F4EF}dialog.twatch .bar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 14px;color:#F5F1F2;font:500 14px "Instrument Sans",sans-serif}
  dialog.twatch button{all:unset;cursor:pointer;padding:8px 14px;border-radius:10px;background:#F5F1F2;color:#240B21;font-weight:600}dialog.twatch button:focus-visible{outline:2px solid #916A70;outline-offset:2px}
  .watch-row{margin:18px 0 0}`;
  const st=document.createElement("style");st.textContent=css;document.head.appendChild(st);
  document.addEventListener("click",e=>{const b=e.target.closest("[data-watch]");if(!b)return;const src=b.dataset.watch;
    const d=document.createElement("dialog");d.className="twatch";d.setAttribute("aria-label","Plan to quote: video");
    d.innerHTML=`<video controls playsinline muted autoplay preload="none" poster="${src}.webp"><source src="${src}.mp4" type="video/mp4"><track kind="captions" srclang="en" label="English" src="${src}.vtt"></video><div class="bar"><span>Plan to quote · Simulated · captions on screen</span><button type="button">Close</button></div>`;
    document.body.appendChild(d);d.querySelector("button").onclick=()=>d.close();d.addEventListener("close",()=>{d.querySelector("video").pause();d.remove()});d.showModal()});
})();
