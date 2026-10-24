/* assembl lab · live strip. Real conditions beside a simulated twin, clearly labelled. */
(function(){
  const place=document.documentElement.dataset.place||"auckland";
  const css=`.alive{position:fixed;left:max(12px,env(safe-area-inset-left,0px));bottom:max(12px,env(safe-area-inset-bottom,0px));z-index:40;max-width:min(560px,calc(100vw - 24px));
  display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:8px 12px 8px 10px;border-radius:14px;font:500 12px/1.35 "IBM Plex Mono",ui-monospace,monospace;color:#492B3E;
  background:rgba(255,253,251,.78);border:1px solid rgba(73,43,62,.14);-webkit-backdrop-filter:blur(12px) saturate(1.3);backdrop-filter:blur(12px) saturate(1.3);box-shadow:0 18px 40px -24px rgba(73,43,62,.45)}
  @media (prefers-color-scheme:dark){.alive{color:#F5F1F2;background:rgba(36,11,33,.72);border-color:rgba(245,241,242,.14)}}
  .alive .dot{width:8px;height:8px;border-radius:50%;background:#3F9A68;box-shadow:0 0 0 0 rgba(63,154,104,.6);animation:alp 2.4s infinite}
  @keyframes alp{0%{box-shadow:0 0 0 0 rgba(63,154,104,.55)}70%{box-shadow:0 0 0 9px rgba(63,154,104,0)}100%{box-shadow:0 0 0 0 rgba(63,154,104,0)}}
  @media (prefers-reduced-motion:reduce){.alive .dot{animation:none}}
  @media (max-width:560px){.alive{bottom:calc(72px + env(safe-area-inset-bottom,0px))}}
  .alive b{font-weight:600}.alive a{color:inherit;opacity:.7}.alive button{all:unset;cursor:pointer;opacity:.6;padding:0 2px}`;
  function show(j){const w=j.weather,p=j.power;if(!w&&!p)return;const s=document.createElement("style");s.textContent=css;document.head.appendChild(s);
    const el=document.createElement("div");el.className="alive";el.setAttribute("role","status");
    const t=w?new Date(w.at).toLocaleTimeString("en-NZ",{hour:"numeric",minute:"2-digit"}):"";
    el.innerHTML=`<span class="dot" aria-hidden="true"></span><b>LIVE</b>`+
      (w?`<span>${w.place.split(" ").slice(-1)[0]} ${Math.round(w.tempC)}°C · wind ${Math.round(w.windKmh)} km/h${w.isDay?` · sun ${Math.round(w.solarWm2)} W/m²`:""} · ${t}</span>`:"")+
      (p?`<span>Wholesale power ${p.date.slice(5)}: avg ${p.avgCentsPerKWh}c/kWh</span>`:"")+
      `<a href="https://open-meteo.com/" target="_blank" rel="noopener">sources</a><button aria-label="Hide live strip">✕</button>`;
    el.querySelector("button").onclick=()=>el.remove();document.body.appendChild(el);
    window.assemblLive=j;window.dispatchEvent(new CustomEvent("assembl:live",{detail:j}))}
  fetch("/api/live/?place="+place).then(r=>r.ok?r.json():null).then(j=>j&&show(j)).catch(()=>{});
})();
