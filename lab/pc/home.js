// assembl lab · the home's point-cloud journey. One cloud, on a sticky stage behind the opening chapters: it assembles as a small
// world in the hero (every business twin on one piece of land by a harbour, each named by a label tied to it), loosens into a calm field behind the doors, and re-forms as the Plan Studio demo hall in the architecture
// chapter, where callouts (real DOM text) are tied to real parts of the building by leader lines. Without WebGL, or with the
// script blocked, the page is the complete site-v2 story with a still of the same world.
import * as THREE from "three";
import { createEngine } from "./engine.js";
import { fieldForm, hallForm } from "./forms.js";
import { worldForm } from "./worlds.js";

const run = document.querySelector(".pc-run"), canvas = document.getElementById("pc-canvas"), svg = document.querySelector(".pc-leaders");
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
let engine;
try { engine = createEngine(canvas, { reduceMotion: reduce }); } catch (e) { console.warn("Point cloud unavailable:", e.message); }
if (engine && run) start();

async function start() {
  document.documentElement.classList.add("pc-on");
  engine.resize();                                   // the camera must know the stage's real shape before anything is placed
  const phone = innerWidth < 760;
  const forms = { world: await worldForm(Math.min(engine.N, 260000)), field: fieldForm(Math.min(engine.N, 160000)) };
  // where on screen a chapter wants the cloud: the centre of its slot, held at the stage's middle height
  const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), hit = new THREE.Vector3();
  const worldAt = (sx, sy) => { const w = canvas.clientWidth, h = canvas.clientHeight; engine.camera.updateMatrixWorld(); ray.setFromCamera(new THREE.Vector2((sx / w) * 2 - 1, -(sy / h) * 2 + 1), engine.camera); ray.ray.intersectPlane(plane, hit); return [hit.x, hit.y, 0]; };
  const slotX = (el, fallback) => { if (!el) return fallback; const r = el.getBoundingClientRect(); return r.width ? r.left + r.width / 2 : fallback; };
  const CH = {
    hero: { el: document.getElementById("hero-title")?.closest("section"), form: () => forms.world, place: () => {
      // sit on the still's own slot (hidden while the cloud draws), as wide as the slot, seen from above (tilted toward the camera)
      const r = document.getElementById("hero-world")?.getBoundingClientRect(), ok = r?.width > 40;
      const x = ok ? r.left + r.width / 2 : innerWidth * 0.68, y = ok ? Math.min(innerHeight * 0.8, Math.max(innerHeight * (phone ? 0.22 : 0.3), r.top + r.height * 0.5)) : innerHeight * 0.5;
      const w = ok ? r.width : innerWidth * 0.5, p = worldAt(x, y), span = Math.abs(worldAt(x + w / 2, y)[0] - worldAt(x - w / 2, y)[0]);
      return { offset: [p[0] + span * (phone ? 0 : 0.09), p[1] - span * 0.06, 0], scale: (span / 2.1) * (phone ? 0.9 : 0.96), tilt: 0.42 }; }, lift: () => [phone ? 0.5 : 0.66, phone ? 0.22 : 0.5] },
    jump: { el: document.getElementById("jump"), form: () => forms.field, place: () => ({ offset: [0, phone ? -0.3 : -0.42, 0.2], scale: 1 }), lift: () => [0.5, 0.25] },
    arch: { el: document.getElementById("architecture"), form: () => forms.hall, place: () => { const x = slotX(document.querySelector(".arch-slot"), innerWidth * 0.33), p = worldAt(x, innerHeight * (phone ? 0.34 : 0.55)); return { offset: [p[0], p[1] - 0.16, 0], scale: phone ? 0.6 : 0.86 }; }, lift: () => [phone ? 0.5 : 0.32, 0.55] },
  };
  let active = null, tagsOn = false, tagT;
  const heroTags = [...document.querySelectorAll(".hero-tags a")];
  function go(id, first = false) {
    if (id === active || !CH[id]) return; const c = CH[id], f = c.form(); if (!f) return; active = id;
    engine.resize(); const pl = c.place(); engine.setLift(...c.lift());
    if (first) engine.assembleFrom(f, { ...pl, ms: 3200 }); else engine.setForm(f, { ...pl, ms: 2400 });
    document.querySelectorAll(".arch-callout").forEach((el) => el.classList.toggle("on", id === "arch"));
    tagsOn = false; clearTimeout(tagT); if (id === "hero") tagT = setTimeout(() => { tagsOn = true; }, reduce ? 0 : first ? 3400 : 2500); else heroTags.forEach((t) => t.classList.remove("on"));
    if (id === "arch") { typeCallouts(); setTimeout(() => engine.scan(2800, -0.02, 0.62), reduce ? 0 : 2200); }
  }

  engine.start(); go("hero", true); document.documentElement.classList.add("pc-ready");
  // the hall is built from the studio's own model code, after the first paint
  hallForm(engine.N).then((h) => { forms.hall = h; pick(); }).catch((e) => console.warn("Hall form:", e.message));
  // which chapter holds the middle of the screen
  function pick() {
    let best = null, bestD = Infinity; const mid = innerHeight * 0.5;
    for (const [id, c] of Object.entries(CH)) { if (!c.el) continue; const r = c.el.getBoundingClientRect(); const d = r.top <= mid && r.bottom >= mid ? 0 : Math.min(Math.abs(r.top - mid), Math.abs(r.bottom - mid)); if (d < bestD) { bestD = d; best = id; } }
    if (best && (best !== "arch" || forms.hall)) go(best);
  }
  addEventListener("scroll", () => requestAnimationFrame(pick), { passive: true });
  addEventListener("resize", () => { const c = active && CH[active]; if (c) { engine.resize(); engine.setForm(c.form(), { ...c.place(), immediate: true }); } });
  // only draw while the opening run is on screen, and never in a hidden tab
  const pauseBtn = document.querySelector(".pc-pause");
  new IntersectionObserver(([e]) => { if (e.isIntersecting) engine.start(); else engine.stop(); pauseBtn?.classList.toggle("off-run", !e.isIntersecting); }, { rootMargin: "120px" }).observe(run);
  // leader lines: from each callout to its anchor on the hall, drawn on the sticky stage (stage coordinates = the viewport)
  const callouts = [...document.querySelectorAll(".arch-callout")];
  engine.onFrame = () => {
    if (active === "hero") return drawTags();
    if (active !== "arch" || !forms.hall || engine.morphing()) { svg.replaceChildren(); return; }
    const parts = [];
    for (const el of callouts) {
      const a = forms.hall.anchors[el.dataset.anchor]; if (!a) continue; const p = engine.project(a), r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) continue;
      const bx = p.x < r.left ? r.left : p.x > r.right ? r.right : p.x, by = r.top + r.height / 2, elbow = Math.abs(p.y - by) > 6 && (p.x < r.left || p.x > r.right);
      const d = elbow ? `M${p.x},${p.y} L${p.x},${by} L${bx},${by}` : `M${p.x},${p.y} L${bx},${p.y < r.top ? r.top : p.y > r.bottom ? r.bottom : by}`;
      parts.push(`<path d="${d}" class="${el.classList.contains("typed") ? "" : "new"}"/><circle cx="${p.x}" cy="${p.y}" r="2.5"/><circle cx="${p.x}" cy="${p.y}" r="6" class="ring"/>`);
    }
    svg.innerHTML = parts.join("");
  };
  // the hero's labels: each pill floats above its twin on the model, a riser from the pill down to a dot and ring on the roof
  function drawTags() {
    const shown = tagsOn && !engine.morphing() && innerWidth >= 1100 && scrollY < innerHeight * 0.6; const parts = [];
    for (const el of heroTags) {
      const a = forms.world.anchors[el.dataset.anchor]; el.classList.toggle("on", !!(shown && a)); if (!shown || !a) continue;
      const p = engine.project(a), lift = 46 + (el.dataset.anchor === "dairy" ? 10 : 0), w = el.offsetWidth, h = el.offsetHeight;
      el.style.transform = `translate(${Math.round(p.x - w / 2)}px, ${Math.round(p.y - lift - h)}px)`;
      parts.push(`<path d="M${p.x},${p.y} L${p.x},${p.y - lift}"/><circle cx="${p.x}" cy="${p.y}" r="2.5"/><circle cx="${p.x}" cy="${p.y}" r="6" class="ring"/>`);
    }
    svg.innerHTML = parts.join("");
  }
  // callout copy types in once, with a rose caret (shown whole with reduced motion)
  let typed = false;
  function typeCallouts() {
    if (typed) return; typed = true;
    for (const [i, el] of callouts.entries()) {
      const t = el.querySelector(".typing"); if (!t) continue; const full = t.textContent;
      if (reduce) { el.classList.add("typed"); continue; }
      t.textContent = ""; t.classList.add("caret"); let k = 0;
      setTimeout(function tick() { k += 2; t.textContent = full.slice(0, k); if (k < full.length) setTimeout(tick, 18); else { t.classList.remove("caret"); el.classList.add("typed"); } }, 2400 + i * 500);
    }
  }
  // Pause motion (icon only)
  const pause = document.querySelector(".pc-pause");
  pause?.removeAttribute("hidden");
  pause?.addEventListener("click", () => { const p = !engine.paused; engine.pause(p); pause.setAttribute("aria-pressed", String(p)); pause.setAttribute("aria-label", p ? "Play motion" : "Pause motion"); });
}
