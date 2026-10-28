// Parts wait desk: one simulated finding travelling from the hoist to a fitted part, the four numbers the desk changes in a simulated month
// (computed at build time by the desk's own engine), and, in the private build, the full desk module on request.
import { CFG, $, esc, chip, ambient, onFrame, isVisible, loadScript, loadCSS, json, reducedMQ } from "./core.js";

const ICONS = [
  '<path d="M3 20h18M6 20V9m12 11V9M4 9h16M9 9V6h6v3"/><circle cx="12" cy="14" r="2.2"/>',
  '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/>',
  '<path d="M3 7h18M3 13h18M3 19h18M5 7v12M19 7v12"/><rect x="8" y="9" width="4" height="4"/><rect x="13" y="15" width="4" height="4"/>',
  '<path d="M12 3v18M16 7.5c0-1.7-1.8-3-4-3s-4 1.3-4 3 1.8 2.6 4 3 4 1.3 4 3-1.8 3-4 3-4-1.3-4-3"/>',
  '<rect x="7" y="3" width="10" height="18" rx="2"/><path d="m9.5 12 2 2 3.5-4"/>',
  '<path d="M14.5 6.5a4 4 0 0 0-5.3 5.3L4 17l3 3 5.2-5.2a4 4 0 0 0 5.3-5.3l-2.5 2.5-2.5-.5-.5-2.5z"/>'];

export function initParts() {
  const P = CFG.parts, j = $("#journey"), fill = $("#jFill");
  // where each part is: a brick-built part that assembles as it moves supplier → in transit → on the shelf → fitted
  const tr = $("#ptrack");
  if (tr && P.track && P.track.length) {
    const ST = ["At the supplier", "In transit", "On the shelf", "Fitted"];
    tr.innerHTML = `<div class="pt-head"><span class="pill dark">Where's my part · Simulated</span><span class="fine">Brick parts: illustrative render</span></div><div class="pt-row">` + P.track.map((p) => `
      <figure class="pt" data-state="${p.state}"><div class="pt-v"><video muted loop playsinline preload="none" poster="${esc(p.poster)}" aria-hidden="true">${p.sources.map(([s, ty]) => `<source src="${esc(s)}" type="${ty}">`).join("")}</video></div>
        <figcaption><b>${esc(p.name)}</b><ol class="pt-steps">${ST.map((s, i) => `<li class="${i < p.state ? "done" : i === p.state ? "now" : ""}">${s}</li>`).join("")}</ol><span class="pt-note">${esc(p.note)}</span></figcaption></figure>`).join("") + "</div>";
    const vids = [...tr.querySelectorAll("video")];
    const play = (on) => vids.forEach((v) => { if (on && !ambient.paused && !reducedMQ.matches) v.play().catch(() => {}); else v.pause(); });
    new IntersectionObserver((es) => play(es[0].isIntersecting), { threshold: .2 }).observe(tr);
    ambient.on((p) => play(!p && tr.getBoundingClientRect().top < innerHeight));
  }
  j.insertAdjacentHTML("beforeend", P.steps.map((s, i) => `<button type="button" class="st" data-i="${i}" style="appearance:none;border:0;background:none;padding:0;text-align:left;cursor:pointer;font:inherit"><span class="dot"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[i]}</svg></span><span class="who">${esc(s.who)}</span><b>${esc(s.title)}</b><span>${esc(s.value)}</span></button>`).join(""));
  const sts = [...j.querySelectorAll(".st")];
  let at = ambient.paused ? sts.length - 1 : 0, acc = 0, vis = false;
  const show = () => { sts.forEach((s, i) => { s.classList.toggle("on", i <= at); s.classList.toggle("now", i === at); }); const k = sts.length > 1 ? at / (sts.length - 1) : 1; fill.style.width = (k * 92) + "%"; j.style.setProperty("--h", `calc(${k} * (100% - 70px))`); };
  j.onclick = (e) => { const b = e.target.closest(".st"); if (!b) return; at = +b.dataset.i; acc = -2; show(); };
  isVisible(j, (v) => vis = v);
  ambient.on((p) => { if (p) { at = sts.length - 1; show(); } });
  onFrame((dt) => { if (!vis || ambient.paused) return; acc += dt; const hold = at === sts.length - 1 ? 3.2 : 1.5; if (acc > hold) { acc = 0; at = (at + 1) % sts.length; show(); } });
  show();
  $("#proof").innerHTML = P.proof.map((p) => `<div class="kpi"><b>${p.was != null ? `<small style="margin:0 6px 0 0;text-decoration:line-through;text-decoration-thickness:1px">${p.was}</small>` : ""}${p.v}${p.unit ? `<small>${esc(p.unit)}</small>` : ""}</b><span>${esc(p.label)}</span>${chip("sim", p.truth || "Simulated")}</div>`).join("");
  $("#partsEv").innerHTML = `<p>${esc(P.month)}</p><ul>${P.proof.map((p) => `<li><b>${esc(p.label)}</b>: ${esc(p.method)}</li>`).join("")}</ul>${P.evidence || ""}`;

  // private build: the full desk (job lanes, the trade counter, ageing stock), loaded only when asked for
  const go = $("#deskGo");
  if (go && P.full) go.onclick = async () => {
    go.disabled = true; go.textContent = "Loading the parts desk…";
    try {
      loadCSS(P.full.css);
      window.__PARTS_DATA = await json(P.full.data);
      $("#deskHost").hidden = false;
      for (const s of P.full.scripts) await loadScript(s);
      go.parentElement.remove();
      $("#deskHost").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    } catch (e) { go.disabled = false; go.textContent = "The desk couldn't load. Try again"; console.warn(e); }
  };
}
