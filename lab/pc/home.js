// assembl lab · the home's point-cloud journey. One cloud, on a sticky stage behind the opening chapters: it assembles as the
// mark A in the hero, loosens into a calm field behind the doors, and re-forms as the Plan Studio demo hall in the architecture
// chapter, where callouts (real DOM text) are tied to real parts of the building by leader lines. Without WebGL, or with the
// script blocked, the page is the complete site-v2 story with the flat mark.
import * as THREE from "three";
import { createEngine, normalise } from "./engine.js";
import { markForm, fieldForm, hallForm } from "./forms.js";

const run = document.querySelector(".pc-run"), canvas = document.getElementById("pc-canvas"), svg = document.querySelector(".pc-leaders");
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
let engine;
try { engine = createEngine(canvas, { reduceMotion: reduce }); } catch (e) { console.warn("Point cloud unavailable:", e.message); }
if (engine && run) start();

async function start() {
  document.documentElement.classList.add("pc-on");
  engine.resize();                                   // the camera must know the stage's real shape before anything is placed
  const phone = innerWidth < 760;
  const forms = { mark: normalise(markForm(Math.min(engine.N, 160000)), 1, { ground: false }), field: fieldForm(Math.min(engine.N, 160000)) };
  // where on screen a chapter wants the cloud: the centre of its slot, held at the stage's middle height
  const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), hit = new THREE.Vector3();
  const worldAt = (sx, sy) => { const w = canvas.clientWidth, h = canvas.clientHeight; engine.camera.updateMatrixWorld(); ray.setFromCamera(new THREE.Vector2((sx / w) * 2 - 1, -(sy / h) * 2 + 1), engine.camera); ray.ray.intersectPlane(plane, hit); return [hit.x, hit.y, 0]; };
  const slotX = (el, fallback) => { if (!el) return fallback; const r = el.getBoundingClientRect(); return r.width ? r.left + r.width / 2 : fallback; };
  const CH = {
    hero: { el: document.getElementById("hero-title")?.closest("section"), form: () => forms.mark, place: () => {
      // sit on the flat mark's own slot (it is hidden while the cloud draws): its centre, kept clear of the nav
      const r = document.getElementById("mark-a")?.getBoundingClientRect(), x = r?.width ? r.left + r.width / 2 : innerWidth * 0.72;
      const y = r?.height ? Math.min(innerHeight * 0.75, Math.max(innerHeight * (phone ? 0.24 : 0.4), r.top + r.height / 2 + scrollY * 0)) : innerHeight * 0.48;
      const p = worldAt(x, y); return { offset: [p[0], p[1], 0], scale: phone ? 0.44 : 0.95 }; }, lift: () => [phone ? 0.5 : 0.7, phone ? 0.25 : 0.5] },
    jump: { el: document.getElementById("jump"), form: () => forms.field, place: () => ({ offset: [0, phone ? -0.3 : -0.42, 0.2], scale: 1 }), lift: () => [0.5, 0.25] },
    arch: { el: document.getElementById("architecture"), form: () => forms.hall, place: () => { const x = slotX(document.querySelector(".arch-slot"), innerWidth * 0.33), p = worldAt(x, innerHeight * (phone ? 0.34 : 0.55)); return { offset: [p[0], p[1] - 0.16, 0], scale: phone ? 0.6 : 0.86 }; }, lift: () => [phone ? 0.5 : 0.32, 0.55] },
  };
  let active = null;
  function go(id, first = false) {
    if (id === active || !CH[id]) return; const c = CH[id], f = c.form(); if (!f) return; active = id;
    engine.resize(); const pl = c.place(); engine.setLift(...c.lift());
    if (first) engine.assembleFrom(f, { ...pl, ms: 3200 }); else engine.setForm(f, { ...pl, ms: 2400 });
    document.querySelectorAll(".arch-callout").forEach((el) => el.classList.toggle("on", id === "arch"));
    if (id === "arch") { typeCallouts(); setTimeout(() => engine.scan(2800, -0.02, 0.62), reduce ? 0 : 2200); }
  }

  engine.start(); go("hero", true);
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
