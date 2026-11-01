// The range in bricks: one brick model per brand in stock, rendered in Blender from a generic body (no badges, no real model's
// design, assembl colours). Each card holds its assembled still; in view, the models take turns to come apart and build again,
// one at a time. Tap a brand to see its cars; a car opens in the stock spotlight. Reduced motion or a paused page: stills only.
import { CFG, $, $$, esc, fmt, json, reducedMQ, ambient } from "./core.js";

export async function initRange() {
  const R = CFG.range, grid = $("#rg"), panel = $("#rgPanel");
  if (!R || !grid) return;
  const cars = (await json(CFG.stockUrl)).cars;
  const items = R.items.map((it) => ({ ...it, cars: cars.filter((c) => c.make === it.brand).sort((a, b) => a.priceNzd - b.priceNzd) })).filter((it) => it.cars.length);
  window.__range = items;   // the content studio's brick reveal reads the same list
  grid.innerHTML = items.map((it, i) => `<button class="rgc" type="button" role="listitem" data-i="${i}" aria-pressed="false" aria-controls="rgPanel">
      <span class="rgv"><img src="${esc(it.poster)}" alt="${esc(`${it.brand}, as a brick model: a generic ${it.bodyWord} built from small bricks on a stone plinth`)}" loading="lazy" decoding="async" width="800" height="600"></span>
      <span class="rgt"><b>${esc(it.brand)}</b><span>${it.cars.length} in stock · from $${fmt(it.cars[0].priceNzd)}</span></span></button>`).join("");
  const cards = $$(".rgc", grid);

  // ---- one model builds at a time: start at the assembled hold, lift away, build again, stop at the hold, back to the still
  let vid = null, cur = -1, cycle = 0, inView = false, hover = -1, timer = 0;
  const still = () => reducedMQ.matches || ambient.paused;
  function stop() { clearTimeout(timer); if (vid) { vid.pause(); vid.remove(); vid = null; } cards.forEach((c) => c.classList.remove("run")); cur = -1; }
  function run(i) {
    stop(); if (still() || !items[i] || !items[i].sources) return; cur = i;
    const v = document.createElement("video"); v.muted = true; v.playsInline = true; v.preload = "auto"; v.setAttribute("aria-hidden", "true");
    items[i].sources.forEach(([s, ty]) => { const e = document.createElement("source"); e.src = s; e.type = ty; v.appendChild(e); });
    const box = $(".rgv", cards[i]); box.appendChild(v); vid = v; let lap = 0;
    v.addEventListener("loadedmetadata", () => { v.currentTime = v.duration * .7; v.play().catch(() => stop()); cards[i].classList.add("run"); }, { once: true });
    v.addEventListener("ended", () => { lap = 1; v.currentTime = 0; v.play().catch(() => {}); });
    v.addEventListener("timeupdate", () => { if (lap && v.currentTime >= v.duration * .7) { stop(); if (hover < 0) timer = setTimeout(next, 900); } });
  }
  function next() { if (!inView || hover >= 0 || still()) return; cycle = (cycle + 1) % cards.length; run(cycle); }
  new IntersectionObserver((es) => { inView = es[0].isIntersecting; if (inView && cur < 0 && hover < 0) timer = setTimeout(() => run(cycle), 600); else if (!inView) stop(); }, { threshold: .35 }).observe(grid);
  grid.addEventListener("pointerover", (e) => { const b = e.target.closest(".rgc"); if (!b || e.pointerType === "touch") return; const i = +b.dataset.i; if (i !== hover) { hover = i; cycle = i; if (cur !== i) run(i); } });
  grid.addEventListener("pointerleave", () => { hover = -1; clearTimeout(timer); timer = setTimeout(next, 1400); });
  ambient.on(() => { if (still()) stop(); });

  // ---- a brand's cars
  function open(i) {
    const it = items[i]; cards.forEach((c, n) => c.setAttribute("aria-pressed", String(n === i)));
    panel.hidden = false;
    panel.innerHTML = `<div class="rgp-head"><div><span class="eyebrow">${esc(it.bodyLabel)} · brick model</span><h3>${esc(it.brand)}: ${it.cars.length} ${it.cars.length === 1 ? "car" : "cars"} in stock</h3></div>
        <div class="row"><button class="btn ghost sm" type="button" data-reveal>Plan a brick reveal</button><button class="btn ghost sm" type="button" data-close aria-label="Close ${esc(it.brand)}">Close</button></div></div>
      <div class="rgp-cars">${it.cars.slice(0, 8).map((c) => `<button class="rgp-car" type="button" data-id="${esc(c.id)}"><img src="${esc(c.img.card)}" alt="" loading="lazy" decoding="async"><span><b>${esc(c.year)} ${esc(c.model)}</b><span>$${fmt(c.priceNzd)}${c.odometerKm == null ? "" : ` · ${fmt(c.odometerKm)} km`}</span></span></button>`).join("")}</div>
      ${it.cars.length > 8 ? `<p class="fine">Showing the 8 lowest prices of ${it.cars.length}. The stock wall below has them all.</p>` : ""}`;
    panel.onclick = (e) => {
      const c = e.target.closest(".rgp-car");
      if (c) { dispatchEvent(new CustomEvent("stock:pick", { detail: c.dataset.id })); window.__stockPick = c.dataset.id; setTimeout(() => (($("#spot") && !$("#spot").hidden) ? $("#spot") : $("#stock")).scrollIntoView({ behavior: reducedMQ.matches ? "auto" : "smooth", block: "center" }), 60); return; }
      if (e.target.closest("[data-close]")) { panel.hidden = true; cards.forEach((c) => c.setAttribute("aria-pressed", "false")); cards[i].focus(); return; }
      if (e.target.closest("[data-reveal]")) { window.__campaign = { id: "brick", brand: it.brand }; dispatchEvent(new CustomEvent("campaign:open", { detail: window.__campaign })); const m = $("#cp") || $("#market"); m.scrollIntoView({ behavior: reducedMQ.matches ? "auto" : "smooth", block: "start" }); }
    };
  }
  grid.addEventListener("click", (e) => { const b = e.target.closest(".rgc"); if (b) open(+b.dataset.i); });
}
