// The showroom hero: a real Gaussian-splat capture of a car in a showroom built in three.js (see hero3d.js); the dealer's stock running underneath it as a rail of cars; the simulation's live numbers. The poster (a frame of
// the same scene) is in the HTML, so the hero paints before any script runs and wherever WebGL or bandwidth is missing.
// One pause control stops every ambient motion; reduced motion starts paused and skips the assembly.
import { CFG, $, esc, fmt, json, ambient, sim, pauseBtn, reducedMQ, narrowMQ } from "./core.js";

export function initShow() {
  const stage = $("#showStage"), pb = $("#showPause"), show = $("#show"), load = $("#showLoad");
  const set = (id, html) => { const el = $(id); if (el && el.innerHTML !== html) el.innerHTML = html; };
  const live = (L) => { set("#sHoist", `${L.s.inShop}<small>/${sim.S.bays}</small>`); set("#sPeople", String(L.people)); set("#sLeads", String(L.leadsT)); set("#sDeals", String(L.agreed + L.usedSold)); set("#sClock", `${sim.dayName()} ${sim.clock()} · Simulated`); };
  sim.on(live); live(sim.live());
  let hero = null, cycle = null;
  const apply = (p) => { pauseBtn(pb, p, "motion"); show.classList.toggle("paused", p); hero && hero.pause(p); cycle && cycle(p); };
  apply(ambient.paused); pb.onclick = () => ambient.set(!ambient.paused); ambient.on(apply);
  // the 3D: a big screen loads it once the page has; a phone only on a fast connection that isn't saving data
  const H = CFG.hero || {}, c = navigator.connection || {}, okNet = !c.saveData && (!c.effectiveType || c.effectiveType === "4g");
  const go = () => import("./hero3d.js").then((m) => m.mountHero(stage, { url: H.splat, glb: H.glb, sign: H.sign, plate: H.plate, paused: ambient.paused, shift: narrowMQ.matches ? 0 : .2, assemble: false, bloom: /bloom/.test(location.search),
      onProgress: (g, n) => { load.textContent = n ? `Capture ${Math.round(g / n * 100)}%` : ""; },
      onPhase: (ph) => { load.textContent = ph === "build" ? "Assembling" : ""; if (ph === "build") stage.classList.add("live"); stage.classList.toggle("built", ph === "done"); } }))
    .then((h) => { hero = h; window.__show = { hero: h }; stage.classList.add("live", "built"); load.textContent = load.textContent === "Assembling" ? load.textContent : ""; })
    .catch((e) => { console.warn("hero3d", e, e && e.stack); load.textContent = ""; });
  if (H.tt) turntable(stage, H.tt, (f) => (cycle = f));
  else if (H.room && H.room.length) roomShow(stage, H.room, (f) => (cycle = f));
  else if ((H.glb || H.splat) && (!narrowMQ.matches || okNet)) {
    // the room shows straight away; the poster stays until the room has drawn
    const start = () => setTimeout(go, 150);
    if (document.readyState === "complete") start(); else addEventListener("load", start, { once: true });
  }
  // depth: the stage drifts slower than the page as it scrolls away
  if (!reducedMQ.matches) {
    let raf = 0;
    addEventListener("scroll", () => { if (!raf && scrollY < innerHeight * 1.3) raf = requestAnimationFrame(() => { raf = 0; stage.style.transform = `translate3d(0,${(Math.min(scrollY, innerHeight * 1.2) * .3).toFixed(1)}px,0)`; }); }, { passive: true });
  }

  // the rail: the dealer's own cars (photos for a dealer with photos, renders for the demo), looping under the image; each opens that car
  json(CFG.stockUrl).then((d) => {
    const H = CFG.hero || {}, cars = d.cars.filter((c) => c.img && c.img.rail !== null && (c.img.rail || c.img.card)).slice(0, H.railMax || 24), inner = $("#showRailIn");
    if (!cars.length) return;
    const one = (c, dup) => `<a class="rc" href="#stock" data-id="${esc(c.id)}"${dup ? ' aria-hidden="true" tabindex="-1"' : ""}><img src="${esc(c.img.rail || c.img.card)}" alt="${dup ? "" : esc(c.title)}" loading="lazy" decoding="async"><span><b>${esc(c.make)}</b> ${esc(c.model)}<i>$${fmt(c.priceNzd)}</i></span></a>`;
    inner.innerHTML = cars.map((c) => one(c)).join("") + cars.map((c) => one(c, true)).join("");
    inner.style.setProperty("--dur", `${cars.length * 4.2}s`);
    inner.addEventListener("click", (e) => { const a = e.target.closest(".rc"); if (!a) return; window.__stockPick = a.dataset.id; window.dispatchEvent(new CustomEvent("stock:pick", { detail: a.dataset.id })); });
    const rail = $("#spBrands");
    if (rail && H.brands) {
      const n = (b) => d.cars.filter((c) => c.make === b).length;
      rail.innerHTML = H.brands.map((b) => `<a href="#stock" data-brand="${esc(b)}">${esc(b)}${n(b) ? `<i>${n(b)}</i>` : ""}</a>`).join("");
      rail.addEventListener("click", (e) => { const a = e.target.closest("a[data-brand]"); if (!a) return; window.__stockBrand = a.dataset.brand; window.dispatchEvent(new CustomEvent("stock:brand", { detail: a.dataset.brand })); });
    }
  }).catch((e) => console.warn("rail", e));
}

// Real cars in the room: the dealer's own photos, cut out and composited at build onto the rendered showroom plate, one after another
function roomShow(stage, list, setCycle) {
  const pic = stage.querySelector("picture"), cap = document.createElement("p"); cap.className = "room-cap"; stage.appendChild(cap);
  const tall = narrowMQ.matches, imgs = [];
  const mk = (i) => imgs[i] || (imgs[i] = Object.assign(document.createElement("img"), { className: "room-img", src: list[i][tall ? "tall" : "wide"], alt: `${list[i].title}, the dealer's own photo, cut out and placed in a rendered showroom`, decoding: "async" }));
  let i = 0, timer = 0;
  const show = (k) => { const prev = imgs[i]; i = k % list.length; const im = mk(i); if (!im.isConnected) stage.insertBefore(im, cap);
    requestAnimationFrame(() => { im.classList.add("on"); if (prev && prev !== im) prev.classList.remove("on"); });
    const c = list[i]; cap.innerHTML = `<b>${esc(c.title)}</b> · $${fmt(c.price)} · ${esc(c.branch || "")}<span>${esc(CFG.hero.roomNote || "")}</span>`; mk((i + 1) % list.length); };
  const run = (p) => { clearTimeout(timer); if (!p) timer = setTimeout(function next() { show(i + 1); timer = setTimeout(next, 5600); }, 5600); };
  const H = CFG.hero || {}, po = H.poweron;
  // the room powers on first (dark to lit), then the cars arrive; reduced motion or a paused page goes straight to the cars
  if (po && !ambient.paused && !reducedMQ.matches && !tall) {
    const v = document.createElement("video"); v.className = "room-img poweron"; v.muted = true; v.playsInline = true; v.preload = "auto"; v.setAttribute("aria-hidden", "true");
    po.sources.forEach(([s, ty]) => { const e = document.createElement("source"); e.src = s; e.type = ty; v.appendChild(e); });
    stage.insertBefore(v, cap); cap.innerHTML = `<span>${esc(po.label)}</span>`;
    let started = false; const begin = () => { if (started) return; started = true; show(0); setTimeout(() => v.classList.remove("on"), 1400); setCycle(run); run(ambient.paused); };
    v.addEventListener("playing", () => { v.classList.add("on"); pic.style.opacity = "0"; }, { once: true });
    v.addEventListener("ended", begin, { once: true }); v.addEventListener("error", begin, { once: true });
    v.play().catch(begin); setTimeout(begin, 9000);
    return;
  }
  show(0); pic.style.opacity = "0"; setCycle(run); run(ambient.paused);
}

// The rendered turntable: 72 frames of the car in the room (5° apart). Frame 0 is the poster; the rest load after the page has. It turns
// slowly at about 8 frames a second; dragging scrubs it; reduced motion keeps frame 0.
function turntable(stage, tt, setCycle) {
  const small = narrowMQ.matches && tt.small, url = (i) => (small ? tt.small : tt.wide).replace("{i}", String(i).padStart(3, "0"));
  const img = stage.querySelector(".show-poster"); img.src = url(0); stage.classList.add("live", "built", "tt");
  const frames = new Array(tt.n); let f = 0, timer = 0, drag = null, loaded = 0;
  const load = () => { for (let i = 1; i < tt.n; i++) { const im = new Image(); im.decoding = "async"; im.onload = () => { frames[i] = im; loaded++; }; im.src = url(i); } frames[0] = img; };
  // frames are drawn to a canvas laid exactly over the poster, so a swap never flashes an undecoded image
  const cv = document.createElement("canvas"); cv.className = "show-poster tt-cv"; cv.setAttribute("aria-hidden", "true"); img.after(cv); const cx = cv.getContext("2d");
  const go = (k) => { k = ((k % tt.n) + tt.n) % tt.n; const im = frames[k]; if (!im || !im.complete || !im.naturalWidth) return; f = k;
    if (cv.width !== im.naturalWidth) { cv.width = im.naturalWidth; cv.height = im.naturalHeight; } cx.drawImage(im, 0, 0); };
  const run = (p) => { clearInterval(timer); if (!p && !reducedMQ.matches) timer = setInterval(() => go(f + 1), 125); };
  if (!reducedMQ.matches) { if (document.readyState === "complete") load(); else addEventListener("load", load, { once: true }); }
  stage.style.cursor = "grab"; stage.style.touchAction = "pan-y";
  stage.addEventListener("pointerdown", (e) => { if (reducedMQ.matches) return; drag = { x: e.clientX, f }; stage.setPointerCapture(e.pointerId); clearInterval(timer); });
  stage.addEventListener("pointermove", (e) => { if (drag) go(drag.f - Math.round((e.clientX - drag.x) / 9)); });
  const end = () => { if (drag) { drag = null; run(ambient.paused); } }; stage.addEventListener("pointerup", end); stage.addEventListener("pointercancel", end);
  setCycle(run); run(ambient.paused);
}
