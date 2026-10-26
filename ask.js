/* assembl lab · Ask about this. Two questions per page per day, answered by a small model, capped server-side. */
(function(){
  // not inside a lab preview embed (the home page hero): the page around it already has its own button
  if(window.__labEmbed||(/[?&]lab-preview=1\b/.test(location.search)&&window.parent!==window))return;
  const page=(document.currentScript&&document.currentScript.dataset.page)||document.documentElement.dataset.ask||"lab", KEY="ask:"+page+":"+new Date().toISOString().slice(0,10), MAX=2;
  let used=0;try{used=+localStorage.getItem(KEY)||0}catch(e){}
  const css=`.askb{position:fixed;right:max(14px,env(safe-area-inset-right,0px));bottom:max(14px,env(safe-area-inset-bottom,0px));z-index:45;font:500 15px "Instrument Sans",system-ui,sans-serif}
  .askb>button{all:unset;cursor:pointer;display:flex;gap:8px;align-items:center;padding:11px 16px;border-radius:999px;background:#240B21;color:#FFFDFB;box-shadow:0 14px 34px -14px rgba(36,11,33,.7)}
  .askb>button:focus-visible{outline:2px solid #916A70;outline-offset:3px}
  .askp{position:absolute;right:0;bottom:56px;width:min(380px,calc(100vw - 28px));padding:16px;border-radius:20px;background:rgba(255,253,251,.86);color:#492B3E;border:1px solid rgba(73,43,62,.14);
    -webkit-backdrop-filter:blur(16px) saturate(1.3);backdrop-filter:blur(16px) saturate(1.3);box-shadow:0 30px 60px -30px rgba(36,11,33,.55)}
  @media (prefers-color-scheme:dark){.askp{background:rgba(36,11,33,.86);color:#F5F1F2;border-color:rgba(245,241,242,.14)}}
  .askp h2{margin:0 0 4px;font-size:16px}.askp p{margin:0 0 10px;font-size:14px;line-height:1.5}.askp .meta{font:500 12px "IBM Plex Mono",monospace;opacity:.7}
  .askp form{display:flex;gap:8px}.askp input{flex:1;min-width:0;font:inherit;font-size:15px;padding:10px 12px;border-radius:12px;border:1px solid rgba(73,43,62,.25);background:transparent;color:inherit}
  .askp form button{all:unset;cursor:pointer;padding:10px 14px;border-radius:12px;background:#240B21;color:#FFFDFB;font-weight:600}
  @media (prefers-color-scheme:dark){.askp form button{background:#F5F1F2;color:#240B21}}
  .askp .ans{white-space:pre-wrap;max-height:40vh;overflow:auto}`;
  const s=document.createElement("style");s.textContent=css;document.head.appendChild(s);
  const w=document.createElement("div");w.className="askb";
  w.innerHTML=`<div class="askp" hidden role="dialog" aria-label="Ask about this page"><h2>Ask about this</h2><p class="meta" id="askLeft"></p><div class="ans" id="askAns" aria-live="polite"></div>
    <form id="askF"><label class="sr" for="askQ" style="position:absolute;left:-9999px">Your question</label><input id="askQ" maxlength="300" placeholder="Why does insulation save so much?" autocomplete="off"><button type="submit">Ask</button></form>
    <p class="meta" style="margin:10px 0 0">Answers come from an AI and can be wrong. Don't share personal details.</p></div><button type="button" aria-expanded="false">Ask about this</button>`;
  document.body.appendChild(w);
  const panel=w.querySelector(".askp"),btn=w.querySelector(":scope>button"),ans=w.querySelector("#askAns"),left=w.querySelector("#askLeft"),f=w.querySelector("#askF"),q=w.querySelector("#askQ");
  const show=()=>{left.textContent=used>=MAX?"You've used today's questions on this page. Come back tomorrow.":`${MAX-used} question${MAX-used===1?"":"s"} left today`;f.hidden=used>=MAX};
  btn.onclick=()=>{panel.hidden=!panel.hidden;btn.setAttribute("aria-expanded",String(!panel.hidden));show();if(!panel.hidden)q.focus()};
  f.onsubmit=async e=>{e.preventDefault();const v=q.value.trim();if(v.length<3||used>=MAX)return;ans.textContent="Thinking it through…";
    try{const r=await fetch("/api/ask/",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({page,question:v})});const j=await r.json().catch(()=>({}));
      if(r.ok){ans.textContent=j.answer;used++;try{localStorage.setItem(KEY,used)}catch(e){};q.value=""}
      else ans.textContent=j.error==="not_configured"?"Questions aren't switched on yet.":j.error==="visitor_cap"?"You've used today's questions on this page. Come back tomorrow.":j.error==="daily_cap"?"We've hit today's limit for questions. Try again tomorrow.":"Couldn't get an answer just now. Try again in a minute.";
      if(j.error==="visitor_cap"){used=MAX;try{localStorage.setItem(KEY,used)}catch(e){}}
    }catch(err){ans.textContent="Couldn't reach the explainer. Check your connection and try again."}show()};
})();
