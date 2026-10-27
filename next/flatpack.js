/* flatpack.js: Manual → 3D, a flatpack birdhouse in the assembly 3D look.
   The manual is matched to known parts by keywords only (no AI, no PDF parsing). Each recognised line becomes a step,
   and each step lifts one part off the parts mat and settles it into place.
   Look (from study/kit3d.js): soft studio light from RoomEnvironment, one warm key light with soft navy shadows on a
   paper floor, neutral tone mapping, lacquered birch ply or clear-coated pastel plastic.
   Exports initFlatpack(host). Auto-inits when #flatpackHost exists. Test probe: window.__flatpackProbe(). */

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const PAL = { ink: "#222A55", shadow: "#1B2452", birch: "#EBD5B0", dowel: "#C8955F",
  sky: "#BFDDF5", mint: "#BFE8D6", lavender: "#D9CBF2", blush: "#F3B8C8", peach: "#F9D2B8", butter: "#F7E7A6", peachDeep: "#B2552D" };

const EXAMPLE_MANUAL = [
  "1. Lay the base flat on your table.",
  "2. Stand the back panel up and slot it into the base.",
  "3. Slide the left wall into place.",
  "4. Slide the right wall into place.",
  "5. Fit the front panel on, with the round door facing out.",
  "6. Rest the roof on top so both sides meet in the middle.",
  "7. Push the perch into the small hole under the door."
].join("\n");

/* Recognised parts. Matching is keyword based and fully deterministic. */
const PARTS = [
  { id: "left",  name: "Left wall",  re: /\bleft\b/ },
  { id: "right", name: "Right wall", re: /\bright\b/ },
  { id: "back",  name: "Back wall",  re: /\bback\b/ },
  { id: "base",  name: "Base",       re: /\bbase\b|\bbottom\b|\bfloor\b/ },
  { id: "roof",  name: "Roof",       re: /\broof\b|\blid\b|\btop\b/ },
  { id: "perch", name: "Perch",      re: /\bperch\b|\bdowel\b|\bstick\b/ },
  { id: "front", name: "Front",      re: /\bfront\b|\bdoor\b|\bentrance\b/ }
];
const PART_BY_ID = Object.fromEntries(PARTS.map(p => [p.id, p]));
const SUGGESTED_ORDER = ["base", "back", "left", "right", "front", "roof", "perch"];
const PLASTIC = { base: PAL.sky, back: PAL.lavender, left: PAL.mint, right: PAL.mint, front: PAL.peach, roof: PAL.blush, perch: PAL.butter };

const REDUCED = () => typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/* ---------- deterministic manual parsing ---------- */
function parseManual(text) {
  const lines = String(text || "").split(/\r?\n/);
  const steps = [], warnings = [], seen = new Set();
  let anyText = false;
  lines.forEach((raw, i) => {
    const line = raw.replace(/^\s*(?:step\s*)?\d+\s*[.):–-]\s*/i, "").replace(/^\s*[-*•]\s*/, "").trim();
    if (!line) return;
    anyText = true;
    const part = PARTS.find(p => p.re.test(line.toLowerCase()));
    if (!part) { warnings.push({ type: "unknown", text: `Line ${i + 1}: “${line}” is not a part this model knows, so it was skipped.` }); return; }
    if (seen.has(part.id)) { warnings.push({ type: "duplicate", text: `Line ${i + 1}: the ${part.name.toLowerCase()} is mentioned twice. Keeping the first one.` }); return; }
    seen.add(part.id);
    steps.push({ part: part.id, text: line });
  });
  if (!anyText) warnings.push({ type: "empty", text: "The manual is empty. Write some instructions or press “Reset example”." });
  else {
    const missing = PARTS.filter(p => !seen.has(p.id));
    if (missing.length) warnings.push({ type: "missing", text: `No instruction for the ${missing.map(p => p.name.toLowerCase()).join(", ")}. Those parts stay on the mat.` });
  }
  return { steps, warnings };
}

/* ---------- the birdhouse: dimensions in decimetres (1 unit = 10 cm) ---------- */
const T = 0.06, W = 1.0, D = 1.0, HW = 1.0, G = 0.42, Y0 = T;           // ply thickness, inside width/depth, wall height, gable rise
const FW = W + 2 * T;                                                  // front/back width
const SLOPE = Math.atan2(G, FW / 2), LR = Math.hypot(FW / 2, G) + 0.18, RD = D + 2 * T + 0.3; // roof panel length and depth

function plyTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 512; const g = c.getContext("2d");
  g.fillStyle = PAL.birch; g.fillRect(0, 0, 512, 512);
  let s = 11; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < 240; i++) {
    const y = rnd() * 512, amp = 1.5 + rnd() * 5, f = 0.004 + rnd() * 0.01, ph = rnd() * 6.28;
    g.strokeStyle = rnd() < 0.55 ? `rgba(160,108,52,${0.07 + rnd() * 0.14})` : `rgba(255,248,232,${0.1 + rnd() * 0.18})`;
    g.lineWidth = 0.6 + rnd() * 1.6; g.beginPath();
    for (let x = 0; x <= 512; x += 8) { const yy = y + Math.sin(x * f + ph) * amp; if (x) g.lineTo(x, yy); else g.moveTo(x, yy); }
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  return t;
}

function pentagon(withHole) {
  const s = new THREE.Shape();
  s.moveTo(-FW / 2, 0); s.lineTo(FW / 2, 0); s.lineTo(FW / 2, HW); s.lineTo(0, HW + G); s.lineTo(-FW / 2, HW); s.closePath();
  if (withHole) { const h = new THREE.Path(); h.absarc(0, 0.64, 0.16, 0, Math.PI * 2, true); s.holes.push(h); }
  const geo = new THREE.ExtrudeGeometry(s, { depth: T - 0.016, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2, curveSegments: 36 });
  geo.translate(0, -(HW + G) / 2, -(T - 0.016) / 2);
  return geo;
}

/* Every part is one or more pieces. Each piece has an assembled pose and a flat pose on the mat (set by layout()). */
function buildParts(mats) {
  const q = (x, y, z) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z));
  const rb = (w, h, d) => new RoundedBoxGeometry(w, h, d, 3, 0.012);
  const piece = (geo, id, asmP, asmQ, flatQ) => {
    const m = new THREE.Mesh(geo, mats.part(id)); m.castShadow = true; m.receiveShadow = true;
    return { mesh: m, asm: { p: new THREE.Vector3(...asmP), q: asmQ }, flat: { p: new THREE.Vector3(), q: flatQ }, foot: null };
  };
  const parts = {};
  parts.base = { pieces: [piece(rb(FW + 0.24, T, D + 2 * T + 0.24), "base", [0, T / 2, 0], q(0, 0, 0), q(0, 0, 0))] };
  parts.back = { pieces: [piece(pentagon(false), "back", [0, Y0 + (HW + G) / 2, -(D / 2 + T / 2)], q(0, 0, 0), q(-Math.PI / 2, 0, 0))] };
  parts.left = { pieces: [piece(rb(T, HW, D), "left", [-(W / 2 + T / 2), Y0 + HW / 2, 0], q(0, 0, 0), q(0, 0, Math.PI / 2))] };
  parts.right = { pieces: [piece(rb(T, HW, D), "right", [W / 2 + T / 2, Y0 + HW / 2, 0], q(0, 0, 0), q(0, 0, -Math.PI / 2))] };
  { // front: a hole with a turned ring around it, and a dark disc behind so the doorway reads as a doorway
    const p = piece(pentagon(true), "front", [0, Y0 + (HW + G) / 2, D / 2 + T / 2], q(0, 0, 0), q(-Math.PI / 2, 0, 0));
    const holeY = 0.64 - (HW + G) / 2;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.165, 0.018, 12, 48), mats.trim()); ring.position.set(0, holeY, T / 2); ring.castShadow = true;
    const dark = new THREE.Mesh(new THREE.CircleGeometry(0.17, 40), mats.disc());
    dark.position.set(0, holeY, -T / 2 - 0.004);
    p.mesh.add(ring, dark); parts.front = { pieces: [p] };
  }
  { // roof: two panels resting on the gables and meeting at the ridge
    const ridge = new THREE.Vector2(0, Y0 + HW + G), pieces = [];
    for (const side of [-1, 1]) {
      const u = new THREE.Vector2(side * Math.cos(SLOPE), -Math.sin(SLOPE)), n = new THREE.Vector2(side * Math.sin(SLOPE), Math.cos(SLOPE));
      const c = ridge.clone().addScaledVector(u, LR / 2 - 0.035).addScaledVector(n, T / 2);
      pieces.push(piece(rb(LR, T, RD), "roof", [c.x, c.y, 0], q(0, 0, -side * SLOPE), q(0, 0, 0)));
    }
    parts.roof = { pieces };
  }
  { const geo = new THREE.CylinderGeometry(0.032, 0.032, 0.38, 24); geo.rotateX(Math.PI / 2);
    parts.perch = { pieces: [piece(geo, "perch", [0, Y0 + 0.42, D / 2 + T + 0.15], q(0, 0, 0), q(0, Math.PI / 2, 0))] }; }
  for (const id of Object.keys(parts)) { parts[id].id = id; parts[id].name = PART_BY_ID[id].name; }
  return parts;
}

/* Where the build spot and the parts mat sit, for a wide or a tall view. Values are piece centres on the floor. */
function layout(parts, tall, build) {
  const M = 0.017, flatY = { base: T / 2 + M, back: T / 2 + M, front: T / 2 + M, left: T / 2 + M, right: T / 2 + M, roof: T / 2 + M, perch: 0.032 + M }; // resting on the mat
  const spots = tall
    ? { build: [0, -1.55], mat: [0.15, 1.35, 4.5, 2.9], back: [-1.35, 0.55], front: [-0.05, 0.55], base: [1.3, 0.55], perch: [2.15, 0.35],
        left: [-1.6, 2.15], right: [-0.45, 2.15], roof0: [0.6, 2.15], roof1: [1.6, 2.15] }
    : { build: [-1.75, 0.05], mat: [1.85, 0.12, 4.7, 3.35], back: [0.3, -0.72], front: [1.6, -0.72], roof0: [2.8, -0.72], roof1: [3.8, -0.72],
        base: [0.42, 0.98], left: [1.78, 0.98], right: [2.92, 0.98], perch: [3.85, 0.98] };
  build.set(spots.build[0], 0.02, spots.build[1]);                       // on top of the build plate
  for (const id of Object.keys(parts)) parts[id].pieces.forEach((pc, i) => {
    const s = spots[id === "roof" ? "roof" + i : id];
    pc.flat.p.set(s[0], flatY[id], s[1]);
  });
  return spots;
}

/* ---------- WebGL fallback: a flat diagram ---------- */
const FALLBACK_SVG = `
<svg class="fp-svg" viewBox="0 0 220 190" role="img" aria-label="Diagram of the flatpack birdhouse">
  <g data-part="base"><rect x="30" y="152" width="160" height="12" rx="4" fill="${PAL.sky}" stroke="${PAL.ink}" stroke-width="2"/></g>
  <g data-part="back"><path d="M52 152V74l58-34 58 34v78z" fill="${PAL.lavender}" stroke="${PAL.ink}" stroke-width="2" stroke-dasharray="5 4"/></g>
  <g data-part="left"><rect x="40" y="76" width="12" height="76" rx="2" fill="${PAL.mint}" stroke="${PAL.ink}" stroke-width="2"/></g>
  <g data-part="right"><rect x="168" y="76" width="12" height="76" rx="2" fill="${PAL.mint}" stroke="${PAL.ink}" stroke-width="2"/></g>
  <g data-part="front"><path d="M52 152V74l58-34 58 34v78z" fill="${PAL.peach}" stroke="${PAL.ink}" stroke-width="2.5"/><circle cx="110" cy="100" r="13" fill="#2B3260" stroke="${PAL.ink}" stroke-width="2"/></g>
  <g data-part="perch"><rect x="104" y="122" width="12" height="8" rx="3" fill="${PAL.butter}" stroke="${PAL.ink}" stroke-width="2"/></g>
  <g data-part="roof"><path d="M24 80 110 30l86 50-8 8-78-46-78 46z" fill="${PAL.blush}" stroke="${PAL.ink}" stroke-width="2" stroke-linejoin="round"/></g>
</svg>`;

/* ---------- main ---------- */
export function initFlatpack(host) {
  if (typeof host === "string") host = document.querySelector(host);
  if (!host) return null;
  if (host.dataset.fpInit === "1") return host._fpApi || null;
  host.dataset.fpInit = "1";
  host.classList.add("fp-host");

  host.innerHTML = `
  <section class="fp-wrap" aria-label="Manual to 3D birdhouse builder">
    <div class="fp-view case" tabindex="0" role="application" aria-label="3D birdhouse assembly. Drag to turn it. Use the Back and Next buttons, or the left and right arrow keys, to step through the manual.">
      <div class="fp-labels" aria-hidden="true"></div>
      <p class="fp-badge">Template example · not an AI or PDF converter</p>
      <p class="fp-hint">Drag to turn · scroll or pinch to zoom</p>
      <p class="fp-loading">Loading the 3D view…</p>
      <div class="fp-done" hidden><strong>Birdhouse built</strong><span>Every recognised part is in place.</span></div>
    </div>
    <div class="fp-dock">
      <button type="button" class="btn" data-fp="prev" aria-label="Previous step">‹ Back</button>
      <div class="fp-now"><p class="fp-stepno"></p><p class="fp-stepname" aria-live="polite">Loading…</p>
        <div class="fp-progress" role="progressbar" aria-label="Build progress" aria-valuemin="0" aria-valuemax="1" aria-valuenow="0"><i class="fp-bar"></i></div></div>
      <button type="button" class="btn primary" data-fp="next" aria-label="Next step">Next ›</button>
    </div>
    <div class="fp-tools">
      <button type="button" class="btn" data-fp="play">Play all steps</button>
      <div class="fp-seg" role="group" aria-label="Material"><button type="button" class="btn small" data-mat="ply" aria-pressed="true">Birch ply</button><button type="button" class="btn small" data-mat="plastic" aria-pressed="false">Pastel plastic</button></div>
      <button type="button" class="btn quiet small" data-fp="view">Reset view</button>
    </div>
    <div class="fp-lower">
      <div class="desk fp-editor">
        <label class="fp-label" for="fpManual">Your instruction manual</label>
        <textarea id="fpManual" class="fp-manual" rows="8" spellcheck="false"></textarea>
        <div class="button-row"><button type="button" class="btn primary" data-fp="build">Build 3D manual</button><button type="button" class="btn" data-fp="reset">Reset example</button></div>
        <ul class="fp-warnlist" aria-live="polite"></ul>
        <p class="fp-known">Known parts: base, back, left wall, right wall, front, roof, perch. One line per step.</p>
      </div>
      <div class="desk fp-list">
        <h4>The sequence</h4>
        <ol class="fp-steps" aria-label="Recognised steps"></ol>
        <ul class="fp-legend" aria-label="Part status"></ul>
      </div>
    </div>
    <p class="fp-status" role="status" aria-live="polite"></p>
  </section>`;

  const $ = sel => host.querySelector(sel);
  let loadingEl = host.querySelector(".fp-loading");
  const manualEl = $(".fp-manual"), viewEl = $(".fp-view"), labelsEl = $(".fp-labels"), doneEl = $(".fp-done"), hintEl = $(".fp-hint");
  const stepNoEl = $(".fp-stepno"), stepNameEl = $(".fp-stepname"), statusEl = $(".fp-status"), warnListEl = $(".fp-warnlist");
  const stepsEl = $(".fp-steps"), legendEl = $(".fp-legend"), progressEl = $(".fp-progress"), barEl = $(".fp-bar");
  const btnBuild = $('[data-fp="build"]'), btnReset = $('[data-fp="reset"]'), btnPrev = $('[data-fp="prev"]'), btnNext = $('[data-fp="next"]');
  const btnPlay = $('[data-fp="play"]'), btnView = $('[data-fp="view"]');
  manualEl.value = EXAMPLE_MANUAL;

  let steps = [], warnings = [], step = 0, anim = null, playing = false, playTimer = 0, disposed = false;
  let three = null;
  try { three = makeScene(viewEl, labelsEl); } catch (err) { console.warn("Flatpack 3D unavailable", err); three = null; }
  if (!three) {
    viewEl.classList.add("fp-fallback"); labelsEl.hidden = true; hintEl.hidden = true; host.querySelector(".fp-seg").hidden = true; btnView.hidden = true;
    const wrap = document.createElement("div"); wrap.className = "fp-svgwrap";
    wrap.innerHTML = FALLBACK_SVG + `<p class="fp-svgnote">3D is not available in this browser, so here is the diagram. The steps still work.</p>`;
    viewEl.prepend(wrap);
  }
  const parts = three ? three.parts : null;
  const indexOf = id => steps.findIndex(s => s.part === id);

  /* ----- poses ----- */
  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), tmpC = new THREE.Vector3();
  function poseAt(pc, t, build, lift) {
    const a = pc.flat.p, d = tmpC.copy(pc.asm.p).add(build);
    if (t <= 0) { pc.mesh.position.copy(a); pc.mesh.quaternion.copy(pc.flat.q); return; }
    if (t >= 1) { pc.mesh.position.copy(d); pc.mesh.quaternion.copy(pc.asm.q); return; }
    const e = ease(t), u = 1 - e;
    tmpA.copy(a); tmpA.y += lift; tmpB.copy(d); tmpB.y += lift * 0.8;          // a cubic Bézier: up off the mat, across, down into place
    pc.mesh.position.set(
      u * u * u * a.x + 3 * u * u * e * tmpA.x + 3 * u * e * e * tmpB.x + e * e * e * d.x,
      u * u * u * a.y + 3 * u * u * e * tmpA.y + 3 * u * e * e * tmpB.y + e * e * e * d.y,
      u * u * u * a.z + 3 * u * u * e * tmpA.z + 3 * u * e * e * tmpB.z + e * e * e * d.z);
    pc.mesh.quaternion.slerpQuaternions(pc.flat.q, pc.asm.q, smooth(0.12, 0.78, t));
  }
  function setPart(id, t) { if (!three) return; parts[id].pieces.forEach(pc => poseAt(pc, t, three.build, 1.5)); }
  function applyStep() { if (!three) return; for (const id of Object.keys(parts)) { const i = indexOf(id); setPart(id, i !== -1 && i < step ? 1 : 0); } }

  /* ----- UI ----- */
  function renderWarnings() {
    warnListEl.innerHTML = "";
    for (const w of warnings) { const li = document.createElement("li"); li.className = "fp-warn fp-warn-" + w.type; li.textContent = w.text; warnListEl.appendChild(li); }
  }
  function renderSteps() {
    stepsEl.innerHTML = "";
    steps.forEach((s, i) => {
      const li = document.createElement("li"), b = document.createElement("button");
      b.type = "button"; b.className = "fp-stepitem";
      b.innerHTML = `<span class="fp-stepnum">${i + 1}</span><span class="fp-stepbody"><b class="fp-steppart">${PART_BY_ID[s.part].name}</b><span class="fp-steptext"></span></span>`;
      b.querySelector(".fp-steptext").textContent = s.text;
      b.setAttribute("aria-label", `Go to step ${i + 1}: ${PART_BY_ID[s.part].name}`);
      b.addEventListener("click", () => { stopPlay(); jumpTo(i + 1); });
      li.appendChild(b); stepsEl.appendChild(li);
    });
    if (!steps.length) stepsEl.innerHTML = `<li class="fp-empty">No recognised steps yet.</li>`;
  }
  function renderLegend() {
    legendEl.innerHTML = "";
    for (const id of SUGGESTED_ORDER) { const li = document.createElement("li"); li.dataset.part = id; li.innerHTML = `<i aria-hidden="true"></i>${PART_BY_ID[id].name}`; legendEl.appendChild(li); }
  }
  function updateUI() {
    const total = steps.length;
    btnPrev.disabled = step <= 0; btnNext.disabled = step >= total;
    btnPlay.disabled = total === 0;
    progressEl.setAttribute("aria-valuemax", String(Math.max(1, total))); progressEl.setAttribute("aria-valuenow", String(step));
    barEl.style.width = total ? (step / total) * 100 + "%" : "0%";
    if (total === 0) { stepNoEl.textContent = "No steps"; stepNameEl.textContent = "Edit the manual and press Build 3D manual."; }
    else if (step === 0) { stepNoEl.textContent = `Ready · ${total} step${total === 1 ? "" : "s"}`; stepNameEl.textContent = `Parts laid out on the mat. Next: ${PART_BY_ID[steps[0].part].name.toLowerCase()}.`; }
    else { const s = steps[step - 1]; stepNoEl.textContent = `Step ${step} of ${total} · ${PART_BY_ID[s.part].name}`; stepNameEl.textContent = s.text; }
    [...stepsEl.querySelectorAll("li")].forEach((li, i) => {
      li.classList.toggle("is-done", i < step); li.classList.toggle("is-next", i === step);
      const b = li.querySelector("button"); if (b) b.setAttribute("aria-current", i === step - 1 ? "step" : "false");
    });
    [...legendEl.children].forEach(li => {
      const id = li.dataset.part, i = indexOf(id);
      li.classList.toggle("is-placed", i !== -1 && i < step); li.classList.toggle("is-missing", i === -1);
      li.setAttribute("aria-label", `${PART_BY_ID[id].name}: ${i === -1 ? "not in the manual" : i < step ? "placed" : "waiting"}`);
    });
    if (three) three.setState(steps, step);
    else host.querySelectorAll(".fp-svg [data-part]").forEach(g => { const i = indexOf(g.dataset.part); g.classList.toggle("is-placed", i !== -1 && i < step); g.classList.toggle("is-missing", i === -1); });
    doneEl.hidden = !(total > 0 && step === total);
    btnPlay.textContent = playing ? "Pause" : step >= total && total ? "Play again" : "Play all steps";
    btnPlay.setAttribute("aria-pressed", String(playing));
  }
  const announce = msg => { statusEl.textContent = msg; };

  /* ----- build / step / play ----- */
  function build() {
    stopPlay(); finishAnim();
    const parsed = parseManual(manualEl.value);
    steps = parsed.steps; warnings = parsed.warnings; step = 0;
    renderWarnings(); renderSteps(); applyStep(); updateUI();
    announce(steps.length ? `Manual built: ${steps.length} recognised step${steps.length === 1 ? "" : "s"}, ${warnings.length} warning${warnings.length === 1 ? "" : "s"}.` : "No recognised steps. Check the warnings.");
  }
  function finishAnim() { if (!anim) return; const a = anim; anim = null; setPart(a.id, a.to); }
  function go(delta) {
    if (!steps.length) return;
    finishAnim();
    const target = step + delta;
    if (target < 0 || target > steps.length) return;
    const id = delta > 0 ? steps[step].part : steps[step - 1].part;
    step = target;
    if (three && !REDUCED()) anim = { id, from: delta > 0 ? 0 : 1, to: delta > 0 ? 1 : 0, t0: performance.now(), dur: delta > 0 ? 1300 : 900 };
    else setPart(id, delta > 0 ? 1 : 0);
    updateUI();
    const name = PART_BY_ID[id].name;
    announce(step === steps.length ? `Manual complete. The birdhouse is built in ${step} steps.` : delta > 0 ? `${name} placed. Step ${step} of ${steps.length}.` : `${name} taken off. Back to step ${step} of ${steps.length}.`);
  }
  function jumpTo(n) { finishAnim(); step = Math.max(0, Math.min(steps.length, n)); applyStep(); updateUI(); announce(step === 0 ? "Back to the parts on the mat." : `Jumped to step ${step} of ${steps.length}.`); }
  function stopPlay() { playing = false; clearTimeout(playTimer); }
  function playNext() {
    if (!playing) return;
    if (step >= steps.length) { stopPlay(); updateUI(); return; }
    go(1);
    playTimer = setTimeout(playNext, REDUCED() || !three ? 900 : 1750);
  }
  btnPlay.addEventListener("click", () => {
    if (playing) { stopPlay(); updateUI(); return; }
    if (step >= steps.length) jumpTo(0);
    playing = true; updateUI(); playTimer = setTimeout(playNext, 250);
  });
  btnBuild.addEventListener("click", build);
  btnReset.addEventListener("click", () => { manualEl.value = EXAMPLE_MANUAL; build(); announce("Example manual restored."); });
  btnPrev.addEventListener("click", () => { stopPlay(); go(-1); });
  btnNext.addEventListener("click", () => { stopPlay(); go(1); });
  btnView.addEventListener("click", () => three && three.frame(true));
  host.querySelectorAll("[data-mat]").forEach(b => b.addEventListener("click", () => {
    host.querySelectorAll("[data-mat]").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
    if (three) three.setMaterial(b.dataset.mat);
  }));
  viewEl.addEventListener("keydown", ev => {
    if (ev.key === "ArrowLeft") { ev.preventDefault(); stopPlay(); go(-1); }
    else if (ev.key === "ArrowRight") { ev.preventDefault(); stopPlay(); go(1); }
  });

  /* ----- frame loop (paused when hidden) ----- */
  let raf = 0, visible = true, seenAt = 0;
  function tick(now) {
    raf = 0;
    if (disposed || !three) return;
    if (!visible || document.hidden || viewEl.offsetParent === null) { seenAt = 0; raf = requestAnimationFrame(tick); return; }
    // the first frame compiles the shaders: wait until the stage has been on screen for a moment, so flicking past
    // the studio does not pay for it
    if (!three.ready) { if (!seenAt) seenAt = now; if (now - seenAt < 700) { raf = requestAnimationFrame(tick); return; } }
    if (anim) {
      const k = (now - anim.t0) / anim.dur;
      if (k >= 1) { const a = anim; anim = null; setPart(a.id, a.to); updateUI(); }
      else setPart(anim.id, anim.from + (anim.to - anim.from) * k);
    }
    three.render(now);
    if (loadingEl) { loadingEl.remove(); loadingEl = null; }
    raf = requestAnimationFrame(tick);
  }
  try { new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(viewEl); } catch (e) { /* older browsers: always render */ }

  const dispose = () => {
    if (disposed) return; disposed = true; stopPlay(); cancelAnimationFrame(raf);
    if (three) three.dispose();
  };
  window.addEventListener("pagehide", dispose, { once: true });

  renderLegend(); build();
  if (three) { three.frame(true); raf = requestAnimationFrame(tick); }

  const api = { build, reset: () => btnReset.click(), next: () => go(1), prev: () => go(-1), jumpTo, dispose, get step() { return step; }, get total() { return steps.length; } };
  host._fpApi = api;
  window.__flatpackProbe = () => ({ step, total: steps.length, parts: steps.filter((s, i) => i < step).length, errors: warnings.length, animating: !!anim, webgl: !!three, ready: three ? three.ready : true });
  window.__FLATPACK_READY__ = true;
  return api;
}

/* ---------- three.js scene ---------- */
function makeScene(viewEl, labelsEl) {
  const probe = document.createElement("canvas");
  if (!(probe.getContext("webgl2") || probe.getContext("webgl"))) throw new Error("WebGL unavailable");
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  if (!renderer.getContext()) throw new Error("WebGL unavailable");
  const mobile = matchMedia("(max-width: 820px), (pointer: coarse)").matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.className = "fp-canvas";
  viewEl.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 200);
  // the soft studio light: RoomEnvironment through PMREM, made on the first frame drawn
  const makeEnv = () => { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.5; pm.dispose(); };
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd9d2e6, 0.35));
  const fill = new THREE.DirectionalLight(0xffffff, 0.45); fill.position.set(4, 5, 9); scene.add(fill);
  const sun = new THREE.DirectionalLight(0xfff3e4, 2.4); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02; sun.shadow.radius = 4;
  scene.add(sun, sun.target);
  // the paper floor shows only shadows, so the case colour behind the canvas reads as the room
  const ground = new THREE.Mesh(new THREE.CircleGeometry(40, 64), new THREE.ShadowMaterial({ color: new THREE.Color(PAL.shadow), opacity: 0.28 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

  // materials: lacquered birch ply, or clear-coated pastel plastic (kit3d.js "plastic")
  const tex = plyTexture();
  // two recipes only (so few shader programs to compile): textured ply, and plain clear-coated plastic
  const ply = c => new THREE.MeshPhysicalMaterial({ map: tex, color: new THREE.Color(c), roughness: 0.55, clearcoat: 0.35, clearcoatRoughness: 0.35 });
  const plastic = (c, rough = 0.38) => new THREE.MeshPhysicalMaterial({ color: new THREE.Color(c), roughness: rough, metalness: 0, clearcoat: 0.65, clearcoatRoughness: 0.25 });
  const plyMat = ply("#FFFFFF"), dowelMat = ply(PAL.dowel);
  const plasticMats = Object.fromEntries(Object.entries(PLASTIC).map(([k, c]) => [k, plastic(c)]));
  const trimPly = plastic(PAL.dowel, 0.45), trimPlastic = plastic("#FFFFFF");
  const discMat = plastic("#2B3260", 0.9);
  const mats = { part: id => (id === "perch" ? dowelMat : plyMat), trim: () => trimPly, disc: () => discMat };
  const parts = buildParts(mats);

  // the build spot (a round white plate with a tinted rim) and the parts mat
  const build = new THREE.Vector3();
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.02, 64), plastic("#FFFFFF")); plate.receiveShadow = true;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.014, 10, 96), plastic(PAL.peach)); rim.rotation.x = Math.PI / 2; rim.position.y = 0.012;
  const matGeo = () => new RoundedBoxGeometry(1, 0.016, 1, 2, 0.006);
  const mat = new THREE.Mesh(matGeo(), plastic("#FFFFFF", 0.8)); mat.receiveShadow = true;
  scene.add(plate, rim, mat);
  // a frosted acrylic ghost shows where the next part goes
  const ghostMat = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(PAL.peach), roughness: 0.38, metalness: 0, clearcoat: 0.65, clearcoatRoughness: 0.25, transparent: true, opacity: 0.4, depthWrite: false });
  const ghosts = {};
  for (const id of Object.keys(parts)) {
    parts[id].pieces.forEach(pc => scene.add(pc.mesh));
    const g = new THREE.Group();
    parts[id].pieces.forEach(pc => { const m = new THREE.Mesh(pc.mesh.geometry, ghostMat); m.position.copy(pc.asm.p); m.quaternion.copy(pc.asm.q); m.renderOrder = 2; g.add(m); });
    g.visible = false; scene.add(g); ghosts[id] = g;
  }

  // labels: crisp HTML pills pinned to the parts (as kit3d.js does)
  const pills = {};
  for (const id of Object.keys(parts)) { const el = document.createElement("span"); el.className = "fp-pill"; labelsEl.appendChild(el); pills[id] = el; }
  const donePill = document.createElement("span"); donePill.className = "fp-pill big"; labelsEl.appendChild(donePill);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.08; controls.enablePan = false;
  controls.maxPolarAngle = 1.42; controls.minPolarAngle = 0.12; controls.rotateSpeed = 0.7; controls.zoomSpeed = 0.8;
  let userTouched = false, tween = null;
  controls.addEventListener("start", () => { userTouched = true; tween = null; viewEl.querySelector(".fp-hint")?.classList.add("gone"); });

  let tall = false, W = 0, H = 0, steps = [], step = 0, complete = false;
  const DIR = new THREE.Vector3(0.42, 0.78, 1).normalize();
  function arrange() {
    const s = layout(parts, tall, build);
    plate.position.set(build.x, 0.01, build.z); rim.position.set(build.x, 0.022, build.z);
    mat.position.set(s.mat[0], 0.008, s.mat[1]); mat.scale.set(s.mat[2], 1, s.mat[3]);
    for (const id of Object.keys(parts)) ghosts[id].position.copy(build);
    const span = tall ? 4.4 : 6.4;
    Object.assign(sun.shadow.camera, { left: -span, right: span, top: span, bottom: -span, near: 1, far: 40 }); sun.shadow.camera.updateProjectionMatrix();
    const c = new THREE.Vector3(tall ? 0.1 : 1.0, 0, tall ? 0.4 : 0.1);
    sun.target.position.copy(c); sun.position.set(c.x - 6, 11, c.z + 5);
  }
  // camera views: everything (the build spot and the mat), or a closer look at the finished birdhouse
  // fit by projecting the corners of what must be seen, so the framing is tight at any aspect
  const fitPv = new THREE.Vector3();
  function fit(target, pts, mx, my) {
    let lo = 0.5, hi = 80;
    for (let i = 0; i < 26; i++) {
      const mid = (lo + hi) / 2; camera.position.copy(target).addScaledVector(DIR, mid); camera.lookAt(target); camera.updateMatrixWorld();
      let ok = true;
      for (const p of pts) { fitPv.copy(p).project(camera); if (fitPv.z > 1 || Math.abs(fitPv.x) > mx || Math.abs(fitPv.y) > my) { ok = false; break; } }
      if (ok) hi = mid; else lo = mid;
    }
    return hi;
  }
  const corners = (x0, x1, y0, y1, z0, z1) => { const o = []; for (const x of [x0, x1]) for (const y of [y0, y1]) for (const z of [z0, z1]) o.push(new THREE.Vector3(x, y, z)); return o; };
  function viewFor(name) {
    const keepP = camera.position.clone(), keepQ = camera.quaternion.clone();
    let target, pts;
    if (name === "build") {
      target = build.clone().add(new THREE.Vector3(0, 0.72, 0));
      pts = corners(build.x - 0.8, build.x + 0.8, 0, 1.62, build.z - 0.8, build.z + 0.95);
    } else {
      const m = mat.position, sx = mat.scale.x / 2, sz = mat.scale.z / 2;
      pts = corners(build.x - 1.05, build.x + 1.05, 0, 1.0, build.z - 1.05, build.z + 1.05).concat(corners(m.x - sx, m.x + sx, 0, 0.25, m.z - sz, m.z + sz));
      const b = new THREE.Box3().setFromPoints(pts); target = b.getCenter(new THREE.Vector3()); target.y = 0.35;
    }
    // fit, then slide the target so the content sits in the middle of the frame, and fit again
    const mx = 0.9, my = name === "build" ? 0.8 : 0.86, right = new THREE.Vector3(), up = new THREE.Vector3();
    let dist = fit(target, pts, mx, my);
    for (let k = 0; k < 3; k++) {
      camera.position.copy(target).addScaledVector(DIR, dist); camera.lookAt(target); camera.updateMatrixWorld();
      let x0 = 9, x1 = -9, y0 = 9, y1 = -9;
      for (const p of pts) { fitPv.copy(p).project(camera); x0 = Math.min(x0, fitPv.x); x1 = Math.max(x1, fitPv.x); y0 = Math.min(y0, fitPv.y); y1 = Math.max(y1, fitPv.y); }
      const hh = dist * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2), hw = hh * camera.aspect;
      right.setFromMatrixColumn(camera.matrixWorld, 0); up.setFromMatrixColumn(camera.matrixWorld, 1);
      target.addScaledVector(right, ((x0 + x1) / 2) * hw).addScaledVector(up, ((y0 + y1) / 2) * hh);
      dist = fit(target, pts, mx, my);
    }
    camera.position.copy(keepP); camera.quaternion.copy(keepQ);
    return { pos: target.clone().addScaledVector(DIR, dist), target };
  }
  function goView(name, instant) {
    const v = viewFor(name);
    controls.minDistance = v.pos.distanceTo(v.target) * 0.35; controls.maxDistance = v.pos.distanceTo(v.target) * 2.2;
    if (instant || REDUCED()) { tween = null; camera.position.copy(v.pos); controls.target.copy(v.target); controls.update(); return; }
    tween = { t: 0, dur: 1.4, p0: camera.position.clone(), t0: controls.target.clone(), p1: v.pos, t1: v.target };
  }
  function resize() {
    const r = viewEl.getBoundingClientRect(), w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    if (w === W && h === H) return false;
    W = w; H = h; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    const nowTall = w / h < 1.35;
    if (nowTall !== tall) { tall = nowTall; arrange(); applyPoses(); }
    if (!userTouched) goView(complete ? "build" : "all", true);
    return true;
  }
  function applyPoses() { // after a layout change, put every part back where the current step says
    for (const id of Object.keys(parts)) {
      const i = steps.findIndex(s => s.part === id), placed = i !== -1 && i < step;
      parts[id].pieces.forEach(pc => { if (placed) { pc.mesh.position.copy(pc.asm.p).add(build); pc.mesh.quaternion.copy(pc.asm.q); } else { pc.mesh.position.copy(pc.flat.p); pc.mesh.quaternion.copy(pc.flat.q); } });
    }
  }
  try { new ResizeObserver(() => resize()).observe(viewEl); } catch (e) { addEventListener("resize", resize); }
  arrange();

  const pv = new THREE.Vector3();
  function placePill(el, at, show) {
    if (!show) { el.style.transform = "translate(-9999px,0)"; return; }
    pv.copy(at).project(camera);
    if (pv.z > 1 || pv.z < -1) { el.style.transform = "translate(-9999px,0)"; return; }
    const x = (pv.x * 0.5 + 0.5) * W, y = (-pv.y * 0.5 + 0.5) * H, bw = el.offsetWidth, bh = el.offsetHeight;
    const px = Math.max(4, Math.min(W - bw - 4, x - bw / 2)), py = Math.max(4, Math.min(H - bh - 4, y - bh - 8));
    el.style.transform = `translate(${px.toFixed(1)}px,${py.toFixed(1)}px)`;
  }
  const anchor = new THREE.Vector3();
  let last = 0;
  function render(now) {
    if (!scene.environment) makeEnv();
    resize();
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016); last = now;
    if (tween) {
      tween.t += dt / tween.dur; const k = ease(Math.min(1, tween.t));
      camera.position.lerpVectors(tween.p0, tween.p1, k); controls.target.lerpVectors(tween.t0, tween.t1, k);
      if (tween.t >= 1) tween = null;
    }
    controls.update();
    // pills: the next part is highlighted; other waiting parts get a small name tag when there is room
    const next = steps[step] ? steps[step].part : null, roomy = W > 560;
    for (const id of Object.keys(parts)) {
      const i = steps.findIndex(s => s.part === id), placed = i !== -1 && i < step, isNext = id === next;
      const el = pills[id], cls = "fp-pill" + (isNext ? " hot" : i === -1 ? " off" : ""), txt = isNext ? `Next · ${parts[id].name}` : i === -1 ? `${parts[id].name} · not in manual` : parts[id].name;
      if (el.className !== cls) el.className = cls;
      if (el.textContent !== txt) el.textContent = txt;
      const pcs = parts[id].pieces; anchor.set(0, 0, 0); pcs.forEach(pc => anchor.add(pc.mesh.position)); anchor.multiplyScalar(1 / pcs.length); anchor.y += 0.12;
      placePill(el, anchor, !placed && (isNext || roomy));
    }
    if (!donePill.textContent) donePill.textContent = "Birdhouse built";
    placePill(donePill, anchor.copy(build).add(new THREE.Vector3(0, 2.0, 0)), complete && W > 360);
    renderer.render(scene, camera);
    ready = true;
  }
  function setState(s, st) {
    steps = s; step = st;
    const next = steps[step] ? steps[step].part : null;
    for (const id of Object.keys(ghosts)) ghosts[id].visible = id === next;
    const nowComplete = steps.length > 0 && step === steps.length;
    if (nowComplete !== complete) { complete = nowComplete; if (!userTouched) goView(complete ? "build" : "all"); }
  }
  function setMaterial(kind) {
    for (const id of Object.keys(parts)) parts[id].pieces.forEach(pc => { pc.mesh.material = kind === "plastic" ? plasticMats[id] : id === "perch" ? dowelMat : plyMat; });
    const ring = parts.front.pieces[0].mesh.children[0]; ring.material = kind === "plastic" ? trimPlastic : trimPly;
  }
  function frame(instant) { userTouched = false; viewEl.querySelector(".fp-hint")?.classList.remove("gone"); W = 0; resize(); goView(complete ? "build" : "all", instant); }
  function dispose() {
    controls.dispose();
    scene.traverse(o => { if (o.isMesh) { o.geometry.dispose(); (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose()); } });
    tex.dispose(); if (scene.environment) scene.environment.dispose(); renderer.dispose(); renderer.domElement.remove();
  }
  // shaders compile on the first frame drawn, which only happens once the stage is on screen (see tick), so opening
  // the studio never stalls the page while the 3D view is still scrolled out of sight
  let ready = false;
  return { renderer, scene, camera, controls, parts, build, render, setState, setMaterial, frame, dispose, get ready() { return ready; } };
}

/* ---------- auto-init ---------- */
function bootFlatpack() { const host = document.getElementById("flatpackHost"); if (host && host.dataset.fpInit !== "1") initFlatpack(host); }
if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bootFlatpack);
  else bootFlatpack();
}
