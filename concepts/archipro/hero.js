// The hero: 16A, two timber homes, as the lab's point cloud. The points are sampled from the GLB the live twin exports
// (tools/archipro/sample.html), each carrying its part: 1 cladding, 2 roof, 3 joinery, 4 decking, 5 floor, 6 bench.
// Product tags pin to their part; hovering one picks the part out. This is the catalogue idea made visible: every
// product in a project, as a record an agent can read.
import { createEngine, makeForm } from "/lab/pc/engine.js";
import { byId } from "./data.js";

const canvas = document.getElementById("cloud"), tagsEl = document.getElementById("tags");
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const small = Math.min(innerWidth, innerHeight) < 700 || (navigator.hardwareConcurrency || 8) <= 4;

// what 16A is finished in on the twin's "as lived" schedule, as the sample products that match it
export const TAGS = [
  { part: 1, id: "mf-cedar-black", label: "Cladding" },
  { part: 2, id: "os-corr-black-marine", label: "Roofing" },
  { part: 3, id: "hj-tb-black", label: "Joinery" },
  { part: 4, id: "mf-hw-silver", label: "Decking" },
];

async function load() {
  const buf = await (await fetch("./16a-points.bin")).arrayBuffer();
  const dv = new DataView(buf), hl = dv.getUint32(0, true), head = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 4, hl)));
  const N = head.n, off = 4 + hl, P = new Uint16Array(buf, off, N * 3), L = new Uint8Array(buf, off + N * 6, N * 3);
  return { head, N, P, L };
}

function toForm({ head, N, P, L }, n) {
  const f = makeForm(n); f.part = new Float32Array(n); f.height = head.height;
  for (let i = 0; i < n; i++) {
    for (let q = 0; q < 3; q++) f.pos[i * 3 + q] = head.lo[q] + (P[i * 3 + q] / 65535) * (head.hi[q] - head.lo[q]);
    f.light[i] = L[i] / 255; f.kind[i] = L[N + i]; f.part[i] = L[2 * N + i];
  }
  return f;
}

// one anchor per part: the part's point nearest its on-screen centre, among the points facing the camera
function anchors(eng, f, opts) {
  const out = {};
  for (const t of TAGS) {
    let pts = []; for (let i = 0; i < f.n && pts.length < 2500; i++) if (f.part[i] === t.part && f.kind[i] !== 2) pts.push(i);
    // a roof tag sits up on the roof: keep its highest fifth
    if (t.part === 2 && pts.length > 50) { const ys = pts.map((i) => f.pos[i * 3 + 1]).sort((a, b) => a - b), cut = ys[Math.floor(ys.length * 0.8)]; pts = pts.filter((i) => f.pos[i * 3 + 1] >= cut); }
    if (!pts.length) continue;
    const scr = pts.map((i) => eng.project([f.pos[i * 3], f.pos[i * 3 + 1], f.pos[i * 3 + 2]], opts));
    const sx = scr.map((s) => s.x).sort((a, b) => a - b), sy = scr.map((s) => s.y).sort((a, b) => a - b);
    const mx = sx[sx.length >> 1], my = sy[sy.length >> 1];
    let best = 0, bd = Infinity; scr.forEach((s, k) => { const d = (s.x - mx) ** 2 + (s.y - my) ** 2; if (d < bd) { bd = d; best = pts[k]; } });
    out[t.part] = [f.pos[best * 3], f.pos[best * 3 + 1], f.pos[best * 3 + 2]];
  }
  return out;
}

async function start() {
  let data;
  try { data = await load(); } catch { document.getElementById("cloud-cap").textContent = "The 3D view couldn't load. The house is shown live in idea 03."; return; }
  const eng = createEngine(canvas, { budget: small ? 70000 : 120000, reduceMotion: reduce, sway: !reduce, sizeScale: small ? 0.85 : 1 });
  eng.setLift?.(0.5, 0.48); eng.setTritone?.(true);
  const form = toForm(data, Math.min(data.N, eng.N));
  // frame the homes themselves (not the ground disc): their centre, seen from the north-east, a little above
  const view = { offset: [0, 0, 0], scale: 1.5, tilt: 0 };
  let cx = 0, cy = 0, cz = 0, k = 0;
  for (let i = 0; i < form.n; i++) if (form.kind[i] !== 2) { cx += form.pos[i * 3]; cy += form.pos[i * 3 + 1]; cz += form.pos[i * 3 + 2]; k++; }
  cx = (cx / k) * view.scale; cy = (cy / k) * view.scale; cz = (cz / k) * view.scale;
  const dir = [1.0, 1.08, 1.5], dl = Math.hypot(...dir), aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight), dist = 2.3 * Math.max(1, 1.2 / aspect);
  eng.camera.position.set(cx + (dir[0] / dl) * dist, cy + (dir[1] / dl) * dist, cz + (dir[2] / dl) * dist); eng.camera.lookAt(cx, cy - 0.04, cz);
  if (reduce) eng.setForm(form, { ...view, immediate: true }); else eng.assembleFrom(form, { ...view, ms: 3400 });
  eng.start();
  if (!reduce) setTimeout(() => eng.scan(2800, -0.02, 0.5), 3000);

  // callouts: a dot on each part, a card at the side, a hairline between them
  eng.render();
  const A = anchors(eng, form, view), shown = TAGS.filter((t) => A[t.part]);
  tagsEl.innerHTML = `<svg class="leads" width="100%" height="100%"></svg>` + shown.map((t) => {
    const p = byId[t.id];
    return `<span class="pin" data-part="${t.part}" style="--sw:${p.swatch[0]}"></span><button class="tag" data-part="${t.part}" tabindex="-1"><span class="t"><b>${t.label}</b>${p.name}<i>${p.supplier} · sample record</i></span></button>`;
  }).join("");
  const svg = tagsEl.querySelector("svg"), pins = [...tagsEl.querySelectorAll(".pin")], cards = [...tagsEl.querySelectorAll(".tag")];
  svg.innerHTML = shown.map(() => `<line/>`).join(""); const lines = [...svg.querySelectorAll("line")];
  // slots: left or right of the homes by where each part sits, stacked in screen order
  const slot = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight, m = Math.max(14, w * 0.035);
    const sc = shown.map((t, i) => ({ i, s: eng.project(A[t.part], view) }));
    // four corners, each taking the nearest part still free, so no hairline crosses the homes
    const lo = w < 520 ? 0.68 : 0.7, corners = [["L", 0.05], ["R", 0.05], ["L", lo], ["R", lo]].map(([side, y]) => ({ side, y, x: side === "L" ? 0 : w, py: y * h }));
    const free = new Set(sc.map((o) => o.i));
    for (const c of corners) {
      let best = null, bd = Infinity;
      for (const o of sc) if (free.has(o.i)) { const d = Math.hypot(o.s.x - c.x, o.s.y - c.py); if (d < bd) { bd = d; best = o; } }
      if (!best) break; free.delete(best.i);
      const el = cards[best.i]; el.dataset.side = c.side; el.style.top = `${c.py}px`; el.style.left = c.side === "L" ? `${m}px` : ""; el.style.right = c.side === "R" ? `${m}px` : "";
    }
  };
  const draw = () => {
    const box = tagsEl.getBoundingClientRect();
    shown.forEach((t, i) => {
      const s = eng.project(A[t.part], view); pins[i].style.transform = `translate(${s.x}px, ${s.y}px)`;
      const r = cards[i].getBoundingClientRect(), ex = cards[i].dataset.side === "L" ? r.right - box.left : r.left - box.left, ey = r.top - box.top + 18;
      const ln = lines[i]; ln.setAttribute("x1", s.x); ln.setAttribute("y1", s.y); ln.setAttribute("x2", ex); ln.setAttribute("y2", ey);
    });
  };
  slot(); draw(); eng.onFrame = draw; addEventListener("resize", () => { slot(); draw(); });
  cards.forEach((el, i) => {
    const on = () => { [el, pins[i], lines[i]].forEach((x) => x.classList.add("on")); };
    setTimeout(on, reduce ? 0 : 3300 + i * 260);
    el.addEventListener("pointerenter", () => { eng.setHighlight(+el.dataset.part); tagsEl.classList.add("focus"); el.classList.add("hot"); lines[i].classList.add("hot"); });
    el.addEventListener("pointerleave", () => { eng.setHighlight(-1); tagsEl.classList.remove("focus"); el.classList.remove("hot"); lines[i].classList.remove("hot"); });
    el.addEventListener("click", () => document.getElementById("catalogue").scrollIntoView({ behavior: reduce ? "auto" : "smooth" }));
  });
  // turn with the pointer, gently; pause when off screen
  let tx = 0, yaw = 0;
  canvas.parentElement.addEventListener("pointermove", (e) => { const r = canvas.getBoundingClientRect(); tx = ((e.clientX - r.left) / r.width - 0.5) * 0.5; });
  canvas.parentElement.addEventListener("pointerleave", () => (tx = 0));
  if (!reduce) { const spin = () => { const d = (tx - yaw) * 0.04; if (Math.abs(d) > 1e-4) { yaw += d; eng.setYaw?.(yaw); } requestAnimationFrame(spin); }; spin(); }
  new IntersectionObserver(([e]) => eng.pause?.(!e.isIntersecting)).observe(canvas);
  window.__hero = { eng, view, A, slot, draw };
}
start();
