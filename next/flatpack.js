/* flatpack.js — Manual → 3D: a flatpack birdhouse learning tool.
   Deterministic, template-based conversion only (no AI, no PDF parsing).
   Native ES module. Expects an import map providing "three" and "three/addons/".
   Exports initFlatpack(host) and auto-inits when #flatpackHost exists. */

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const COLOUR = {
  plum: 0x492b3e,
  plumDark: 0x2e1229,
  cream: 0xf5f1f2,
  peach: 0xe0a98f,
  mint: 0x9fdcbb,
  wood: 0xeac9a2,
  hole: 0x2b1420
};

const EXAMPLE_MANUAL = [
  "1. Lay the base flat on your table.",
  "2. Stand the back panel up and slot it into the base.",
  "3. Slide the left wall into place.",
  "4. Slide the right wall into place.",
  "5. Fit the front panel on, with the round door facing out.",
  "6. Rest the roof on top so both sides meet in the middle.",
  "7. Push the perch into the small hole under the door."
].join("\n");

/* Recognised parts. Order is the suggested assembly order; matching is
   keyword/template based and fully deterministic. */
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

const REDUCED = () =>
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/* ---------- deterministic manual parsing ---------- */

function parseManual(text) {
  const lines = String(text || "").split(/\r?\n/);
  const steps = [];
  const warnings = [];
  const seen = new Set();
  let anyText = false;

  lines.forEach((raw, i) => {
    let line = raw
      .replace(/^\s*(?:step\s*)?\d+\s*[.):\u2013-]\s*/i, "")
      .replace(/^\s*[-*\u2022]\s*/, "")
      .trim();
    if (!line) return;
    anyText = true;
    const low = line.toLowerCase();
    const part = PARTS.find(p => p.re.test(low));
    if (!part) {
      warnings.push({ type: "unknown", text: `Line ${i + 1}: \u201c${line}\u201d \u2014 not recognised, skipped.` });
      return;
    }
    if (seen.has(part.id)) {
      warnings.push({ type: "duplicate", text: `Line ${i + 1}: the ${part.name.toLowerCase()} is mentioned twice \u2014 keeping the first one.` });
      return;
    }
    seen.add(part.id);
    steps.push({ part: part.id, text: line });
  });

  if (!anyText) {
    warnings.push({ type: "empty", text: "The manual is empty \u2014 write some instructions or press \u201cReset example\u201d." });
  } else {
    const missing = PARTS.filter(p => !seen.has(p.id));
    if (missing.length) {
      warnings.push({
        type: "missing",
        text: `Missing: no instruction for the ${missing.map(p => p.name.toLowerCase()).join(", ")}. Those parts stay in the flatpack pile.`
      });
    }
  }
  return { steps, warnings };
}

/* ---------- 3D part construction ---------- */

function makeMat(color, opts = {}) {
  return new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.72, metalness: 0.04 }, opts));
}

function buildPartMeshes() {
  const parts = {};
  const shadowed = g => { g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); return g; };

  // base
  {
    const g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 1.6), makeMat(COLOUR.wood));
    g.add(m);
    parts.base = { group: shadowed(g), asmPos: [0, 0.05, 0], asmQuat: [0, 0, 0], flatPos: [-2.6, 0.05, 2.3], flatQuat: [0, 0, 0], labelOff: [0, 0.4, 0] };
  }
  // back wall
  {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.3, 0.1), makeMat(COLOUR.cream)));
    parts.back = { group: shadowed(g), asmPos: [0, 0.75, -0.75], asmQuat: [0, 0, 0], flatPos: [-0.9, 0.05, 2.3], flatQuat: [-Math.PI / 2, 0, 0], labelOff: [0, 0.9, 0] };
  }
  // left / right walls
  for (const [id, x, flatX, roll] of [["left", -0.75, 0.8, Math.PI / 2], ["right", 0.75, 2.5, -Math.PI / 2]]) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.3, 1.4), makeMat(COLOUR.cream)));
    parts[id] = { group: shadowed(g), asmPos: [x, 0.75, 0], asmQuat: [0, 0, 0], flatPos: [flatX, 0.05, 2.3], flatQuat: [0, 0, roll], labelOff: [0, 0.9, 0] };
  }
  // front panel with round door hole
  {
    const shape = new THREE.Shape();
    shape.moveTo(-0.8, -0.65); shape.lineTo(0.8, -0.65); shape.lineTo(0.8, 0.65); shape.lineTo(-0.8, 0.65); shape.closePath();
    const hole = new THREE.Path();
    hole.absarc(0, 0.15, 0.18, 0, Math.PI * 2, true);
    shape.holes.push(hole);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.1, bevelEnabled: false });
    geo.translate(0, 0, -0.05);
    const g = new THREE.Group();
    g.add(new THREE.Mesh(geo, makeMat(COLOUR.cream)));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.022, 10, 28), makeMat(COLOUR.mint, { roughness: 0.5 }));
    ring.position.set(0, 0.15, 0.05);
    g.add(ring);
    const dark = new THREE.Mesh(new THREE.CircleGeometry(0.175, 24), makeMat(COLOUR.hole, { roughness: 1 }));
    dark.position.set(0, 0.15, -0.049);
    dark.rotation.y = Math.PI;
    g.add(dark);
    parts.front = { group: shadowed(g), asmPos: [0, 0.75, 0.75], asmQuat: [0, 0, 0], flatPos: [-1.9, 0.05, 3.7], flatQuat: [-Math.PI / 2, 0, 0], labelOff: [0, 0.95, 0.45] };
  }
  // roof (two slanted panels as one rigid part)
  {
    const g = new THREE.Group();
    const slope = Math.atan2(0.32, 0.85);
    const panelGeo = new THREE.BoxGeometry(0.95, 0.07, 1.85);
    const mat = makeMat(COLOUR.plum, { roughness: 0.6 });
    const left = new THREE.Mesh(panelGeo, mat);
    left.position.set(-0.425, -0.16, 0);
    left.rotation.z = slope;
    const right = new THREE.Mesh(panelGeo, mat);
    right.position.set(0.425, -0.16, 0);
    right.rotation.z = -slope;
    g.add(left, right);
    parts.roof = { group: shadowed(g), asmPos: [0, 1.72, 0], asmQuat: [0, 0, 0], flatPos: [0.2, 0.4, 3.7], flatQuat: [0, 0, 0], labelOff: [0, 0.45, 0] };
  }
  // perch
  {
    const g = new THREE.Group();
    const geo = new THREE.CylinderGeometry(0.05, 0.05, 0.5, 20);
    geo.rotateX(Math.PI / 2);
    g.add(new THREE.Mesh(geo, makeMat(COLOUR.peach, { roughness: 0.55 })));
    parts.perch = { group: shadowed(g), asmPos: [0, 0.66, 0.95], asmQuat: [0, 0, 0], flatPos: [2.1, 0.05, 3.7], flatQuat: [0, 0, 0], labelOff: [0, 0.28, 0.35] };
  }

  // bake vectors/quaternions
  for (const id of Object.keys(parts)) {
    const p = parts[id];
    p.id = id;
    p.name = PART_BY_ID[id].name;
    p.asmPos = new THREE.Vector3(...p.asmPos);
    p.flatPos = new THREE.Vector3(...p.flatPos);
    p.asmQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(...p.asmQuat));
    p.flatQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(...p.flatQuat));
    p.labelOff = new THREE.Vector3(...p.labelOff);
  }
  return parts;
}

/* ---------- WebGL fallback: clear SVG diagram ---------- */

const FALLBACK_SVG = `
<svg class="fp-svg" viewBox="0 0 220 190" role="img" aria-label="Diagram of the flatpack birdhouse">
  <g data-part="back"><rect x="52" y="58" width="116" height="92" rx="3" fill="#e3d9d2" stroke="#492B3E" stroke-width="2" stroke-dasharray="5 4"/></g>
  <g data-part="left"><rect x="40" y="66" width="12" height="84" rx="2" fill="#F5F1F2" stroke="#492B3E" stroke-width="2"/></g>
  <g data-part="right"><rect x="168" y="66" width="12" height="84" rx="2" fill="#F5F1F2" stroke="#492B3E" stroke-width="2"/></g>
  <g data-part="front">
    <rect x="52" y="66" width="116" height="84" rx="3" fill="#F5F1F2" stroke="#492B3E" stroke-width="2.5"/>
    <circle cx="110" cy="92" r="13" fill="#2b1420" stroke="#9fdcbb" stroke-width="3"/>
  </g>
  <g data-part="perch"><circle cx="110" cy="116" r="6" fill="#E0A98F" stroke="#492B3E" stroke-width="2"/></g>
  <g data-part="base"><rect x="32" y="150" width="156" height="14" rx="4" fill="#E0A98F" stroke="#492B3E" stroke-width="2"/></g>
  <g data-part="roof"><path d="M26 68 L110 24 L194 68 L184 68 L110 32 L36 68 Z" fill="#492B3E" stroke="#2E1229" stroke-width="2"/></g>
</svg>`;

/* ---------- main ---------- */

export function initFlatpack(host) {
  if (typeof host === "string") host = document.querySelector(host);
  if (!host) return null;
  if (host.dataset.fpInit === "1") return host._fpApi || null;
  host.dataset.fpInit = "1";
  host.classList.add("fp-host");

  /* ----- DOM ----- */
  host.innerHTML = `
  <section class="fp-wrap" aria-label="Manual to 3D birdhouse builder">
    <header class="fp-head fp-glass">
      <div>
        <h2 class="fp-title">Manual \u2192 3D: build a birdhouse</h2>
        <p class="fp-tag">Template-based birdhouse example \u00b7 not an AI or automatic PDF converter</p>
      </div>
      <p class="fp-blurb">Edit the plain-language manual, press <strong>Build 3D manual</strong>, then step through the assembly. Known parts: base, back, left wall, right wall, front, roof, perch.</p>
    </header>
    <div class="fp-grid">
      <div class="fp-editor fp-glass">
        <label class="fp-label" for="fpManual">Your instruction manual</label>
        <textarea id="fpManual" class="fp-manual" rows="9" spellcheck="false"></textarea>
        <div class="fp-btnrow">
          <button type="button" class="fp-btn fp-primary" data-fp="build">Build 3D manual</button>
          <button type="button" class="fp-btn fp-ghost" data-fp="reset">Reset example</button>
        </div>
        <div class="fp-warnings" aria-live="polite">
          <ul class="fp-warnlist"></ul>
        </div>
      </div>
      <div class="fp-stage fp-glass">
        <div class="fp-view" tabindex="0" role="application" aria-label="3D birdhouse assembly view. Use the Back and Next buttons, or arrow keys, to step through the manual.">
          <div class="fp-labels" aria-hidden="true"></div>
          <div class="fp-done" hidden>
            <strong>Manual complete!</strong>
            <span>The birdhouse is built \u2014 every recognised part is in place.</span>
          </div>
        </div>
        <p class="fp-stepname" aria-live="polite">Loading\u2026</p>
        <div class="fp-controls">
          <button type="button" class="fp-btn fp-step" data-fp="prev" aria-label="Previous step">\u2039 Back</button>
          <div class="fp-progress" role="progressbar" aria-label="Assembly progress" aria-valuemin="0" aria-valuemax="1" aria-valuenow="0">
            <div class="fp-bar"></div>
          </div>
          <button type="button" class="fp-btn fp-step" data-fp="next" aria-label="Next step">Next \u203a</button>
        </div>
        <ol class="fp-steps" aria-label="Parsed manual steps"></ol>
        <ul class="fp-legend" aria-label="Part status"></ul>
      </div>
    </div>
    <p class="fp-status" role="status" aria-live="polite"></p>
  </section>`;

  const $ = sel => host.querySelector(sel);
  const manualEl = $(".fp-manual");
  const viewEl = $(".fp-view");
  const labelsEl = $(".fp-labels");
  const doneEl = $(".fp-done");
  const stepNameEl = $(".fp-stepname");
  const statusEl = $(".fp-status");
  const warnListEl = $(".fp-warnlist");
  const stepsEl = $(".fp-steps");
  const legendEl = $(".fp-legend");
  const progressEl = $(".fp-progress");
  const barEl = $(".fp-bar");
  const btnBuild = $('[data-fp="build"]');
  const btnReset = $('[data-fp="reset"]');
  const btnPrev = $('[data-fp="prev"]');
  const btnNext = $('[data-fp="next"]');

  manualEl.value = EXAMPLE_MANUAL;

  /* ----- state ----- */
  let steps = [];
  let warnings = [];
  let step = 0;             // number of parts assembled
  let anim = null;          // {part, from, to, t0, dur}
  let disposed = false;
  let hidden = false;

  /* ----- three.js scene (with graceful fallback) ----- */
  let three = null;
  try {
    three = makeScene(viewEl, labelsEl);
  } catch (err) {
    three = null;
  }
  if (!three) {
    viewEl.classList.add("fp-fallback");
    labelsEl.hidden = true;
    const wrap = document.createElement("div");
    wrap.className = "fp-svgwrap";
    wrap.innerHTML = FALLBACK_SVG +
      `<p class="fp-svgnote">3D view unavailable in this browser \u2014 here is the diagram instead. The step list below still works.</p>`;
    viewEl.prepend(wrap);
  }

  /* ----- part pose helpers ----- */
  function setPartPose(part, t, hop) {
    if (!three) return;
    const e = easeInOut(Math.min(1, Math.max(0, t)));
    part.group.position.lerpVectors(part.flatPos, part.asmPos, e);
    part.group.quaternion.slerpQuaternions(part.flatQuat, part.asmQuat, e);
    if (hop) part.group.position.y += Math.sin(e * Math.PI) * 0.45;
  }

  function applyStep() {
    for (const id of Object.keys(three ? three.parts : PART_BY_ID)) {
      const part = three ? three.parts[id] : null;
      const idx = steps.findIndex(s => s.part === id);
      const placed = idx !== -1 && idx < step;
      if (part) setPartPose(part, placed ? 1 : 0, false);
    }
  }

  /* ----- UI rendering ----- */
  function renderWarnings() {
    warnListEl.innerHTML = "";
    for (const w of warnings) {
      const li = document.createElement("li");
      li.className = "fp-warn fp-warn-" + w.type;
      li.textContent = (w.type === "missing" ? "Missing step \u2014 " : w.type === "duplicate" ? "Duplicate \u2014 " : w.type === "unknown" ? "Unknown step \u2014 " : "") + w.text;
      warnListEl.appendChild(li);
    }
    $(".fp-warnings").hidden = warnings.length === 0;
  }

  function renderSteps() {
    stepsEl.innerHTML = "";
    steps.forEach((s, i) => {
      const li = document.createElement("li");
      const b = document.createElement("button");
      b.type = "button";
      b.className = "fp-stepitem";
      b.innerHTML = `<span class="fp-stepnum">${i + 1}</span> <span class="fp-steppart">${PART_BY_ID[s.part].name}</span> <span class="fp-steptext"></span>`;
      b.querySelector(".fp-steptext").textContent = s.text;
      b.setAttribute("aria-label", `Go to step ${i + 1}: ${PART_BY_ID[s.part].name}`);
      b.addEventListener("click", () => jumpTo(i + 1));
      li.appendChild(b);
      stepsEl.appendChild(li);
    });
  }

  function renderLegend() {
    legendEl.innerHTML = "";
    for (const id of SUGGESTED_ORDER) {
      const li = document.createElement("li");
      li.dataset.part = id;
      li.innerHTML = `<span class="fp-dot" aria-hidden="true"></span><span>${PART_BY_ID[id].name}</span>`;
      legendEl.appendChild(li);
    }
  }

  function updateUI() {
    const total = steps.length;
    btnPrev.disabled = step <= 0;
    btnNext.disabled = step >= total;
    progressEl.setAttribute("aria-valuemax", String(Math.max(1, total)));
    progressEl.setAttribute("aria-valuenow", String(step));
    barEl.style.width = total ? (step / total) * 100 + "%" : "0%";

    if (total === 0) {
      stepNameEl.textContent = "No recognised steps yet \u2014 edit the manual and press Build 3D manual.";
    } else if (step === 0) {
      stepNameEl.textContent = `Flatpack laid out \u2014 ${total} step${total === 1 ? "" : "s"} to build.`;
    } else {
      const s = steps[step - 1];
      stepNameEl.textContent = `Step ${step} of ${total} \u2014 ${PART_BY_ID[s.part].name}: ${s.text}`;
    }

    [...stepsEl.children].forEach((li, i) => {
      li.classList.toggle("is-done", i < step);
      li.classList.toggle("is-next", i === step);
      li.querySelector("button").setAttribute("aria-current", i === step ? "step" : "false");
    });

    [...legendEl.children].forEach(li => {
      const id = li.dataset.part;
      const idx = steps.findIndex(s => s.part === id);
      li.classList.toggle("is-placed", idx !== -1 && idx < step);
      li.classList.toggle("is-missing", idx === -1);
      li.setAttribute("aria-label", `${PART_BY_ID[id].name}: ${idx === -1 ? "not in the manual" : idx < step ? "placed" : "waiting"}`);
    });

    if (three) {
      for (const id of Object.keys(three.parts)) {
        const part = three.parts[id];
        const idx = steps.findIndex(s => s.part === id);
        part.labelEl.classList.toggle("is-placed", idx !== -1 && idx < step);
        part.labelEl.classList.toggle("is-active", idx === step);
      }
    } else {
      host.querySelectorAll(".fp-svg [data-part]").forEach(g => {
        const idx = steps.findIndex(s => s.part === g.dataset.part);
        g.classList.toggle("is-placed", idx !== -1 && idx < step);
        g.classList.toggle("is-missing", idx === -1);
      });
    }

    const complete = total > 0 && step === total;
    doneEl.hidden = !complete;
  }

  function announce(msg) { statusEl.textContent = msg; }

  /* ----- build / reset / stepping ----- */
  function build() {
    finishAnim();
    const parsed = parseManual(manualEl.value);
    steps = parsed.steps;
    warnings = parsed.warnings;
    step = 0;
    renderWarnings();
    renderSteps();
    applyStep();
    updateUI();
    announce(steps.length
      ? `Manual built: ${steps.length} recognised step${steps.length === 1 ? "" : "s"}, ${warnings.length} warning${warnings.length === 1 ? "" : "s"}.`
      : "No recognised steps. Check the warnings.");
  }

  function finishAnim() {
    if (!anim) return;
    const { part, to } = anim;
    anim = null;
    setPartPose(part, to, false);
  }

  function go(delta) {
    if (!steps.length) return;
    finishAnim();
    const target = step + delta;
    if (target < 0 || target > steps.length) return;
    const partId = delta > 0 ? steps[step].part : steps[step - 1].part;
    const part = three ? three.parts[partId] : null;
    step = target;
    if (part && !REDUCED()) {
      anim = { part, from: delta > 0 ? 0 : 1, to: delta > 0 ? 1 : 0, t0: performance.now(), dur: 900 };
      setPartPose(part, anim.from, false);
    } else if (part) {
      setPartPose(part, delta > 0 ? 1 : 0, false);
    }
    updateUI();
    const name = PART_BY_ID[partId].name;
    announce(delta > 0 ? `${name} placed. Step ${step} of ${steps.length}.` : `${name} removed. Back to step ${step} of ${steps.length}.`);
    if (step === steps.length) announce(`Manual complete! The birdhouse is built in ${step} steps.`);
  }

  function jumpTo(n) {
    finishAnim();
    step = Math.max(0, Math.min(steps.length, n));
    applyStep();
    updateUI();
    announce(step === 0 ? "Back to the flatpack layout." : `Jumped to step ${step} of ${steps.length}.`);
  }

  btnBuild.addEventListener("click", build);
  btnReset.addEventListener("click", () => { manualEl.value = EXAMPLE_MANUAL; build(); announce("Example manual restored."); });
  btnPrev.addEventListener("click", () => go(-1));
  btnNext.addEventListener("click", () => go(1));
  viewEl.addEventListener("keydown", ev => {
    if (ev.key === "ArrowLeft") { ev.preventDefault(); go(-1); }
    else if (ev.key === "ArrowRight") { ev.preventDefault(); go(1); }
  });

  /* ----- render loop (paused when hidden) ----- */
  let raf = 0;
  const tmpV = three ? new THREE.Vector3() : null;

  function updateLabels() {
    if (!three) return;
    const w = viewEl.clientWidth || 1;
    const h = viewEl.clientHeight || 1;
    for (const id of Object.keys(three.parts)) {
      const p = three.parts[id];
      tmpV.copy(p.group.position).add(p.labelOff).project(three.camera);
      const behind = tmpV.z > 1 || tmpV.z < -1;
      p.labelEl.hidden = behind;
      if (!behind) {
        p.labelEl.style.transform =
          `translate(-50%,-130%) translate(${(tmpV.x * 0.5 + 0.5) * w}px,${(-tmpV.y * 0.5 + 0.5) * h}px)`;
      }
    }
  }

  function tick(now) {
    if (disposed) return;
    raf = requestAnimationFrame(tick);
    if (anim) {
      const k = (now - anim.t0) / anim.dur;
      if (k >= 1) {
        const a = anim;
        anim = null;
        setPartPose(a.part, a.to, false);
        updateUI();
      } else {
        setPartPose(anim.part, anim.from + (anim.to - anim.from) * k, true);
      }
    }
    three.controls.update();
    updateLabels();
    three.renderer.render(three.scene, three.camera);
  }

  function startLoop() { if (three && !disposed && !hidden && !raf) raf = requestAnimationFrame(tick); }
  function stopLoop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }

  const onVisibility = () => {
    hidden = document.hidden;
    if (hidden) stopLoop(); else startLoop();
  };
  document.addEventListener("visibilitychange", onVisibility);

  /* ----- responsive sizing ----- */
  const ro = new ResizeObserver(() => {
    if (!three || disposed) return;
    const w = Math.max(1, viewEl.clientWidth);
    const h = Math.max(1, viewEl.clientHeight);
    three.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    three.renderer.setSize(w, h, false);
    three.camera.aspect = w / h;
    three.camera.updateProjectionMatrix();
  });
  ro.observe(viewEl);

  /* ----- dispose on pagehide ----- */
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    stopLoop();
    ro.disconnect();
    document.removeEventListener("visibilitychange", onVisibility);
    if (three) {
      three.controls.dispose();
      three.scene.traverse(o => {
        if (o.isMesh) {
          o.geometry.dispose();
          (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose());
        }
      });
      three.renderer.dispose();
      three.renderer.domElement.remove();
    }
  };
  window.addEventListener("pagehide", dispose, { once: true });

  /* ----- initial build ----- */
  renderLegend();
  build();
  if (three) {          // paint one frame immediately so the view is never blank
    const w = Math.max(1, viewEl.clientWidth), h = Math.max(1, viewEl.clientHeight);
    three.renderer.setSize(w, h, false);
    three.camera.aspect = w / h;
    three.camera.updateProjectionMatrix();
    three.controls.update();
    updateLabels();
    three.renderer.render(three.scene, three.camera);
  }
  startLoop();

  /* ----- test probes ----- */
  const placedCount = () => steps.filter((s, i) => i < step).length;
  const api = {
    build,
    reset: () => btnReset.click(),
    next: () => go(1),
    prev: () => go(-1),
    jumpTo,
    dispose,
    get step() { return step; },
    get total() { return steps.length; }
  };
  host._fpApi = api;
  window.__flatpackProbe = () => ({
    step,
    total: steps.length,
    parts: placedCount(),
    errors: warnings.length
  });
  window.__FLATPACK_READY__ = true;
  return api;
}

/* ---------- three.js scene ---------- */

function makeScene(viewEl, labelsEl) {
  const probe = document.createElement("canvas");
  const context = probe.getContext("webgl2") || probe.getContext("webgl");
  if (!context) throw new Error("WebGL unavailable");
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  if (!renderer.getContext()) throw new Error("WebGL unavailable");
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(Math.max(1, viewEl.clientWidth), Math.max(1, viewEl.clientHeight), false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.className = "fp-canvas";
  viewEl.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, Math.max(1, viewEl.clientWidth) / Math.max(1, viewEl.clientHeight), 0.1, 60);
  camera.position.set(0.5, 3.1, 6.9);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.85, 1.0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 3;
  controls.maxDistance = 15;
  controls.maxPolarAngle = 1.48;

  scene.add(new THREE.HemisphereLight(COLOUR.cream, COLOUR.plumDark, 0.95));
  const sun = new THREE.DirectionalLight(0xfff1dd, 1.7);
  sun.position.set(4.5, 7, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -6; sun.shadow.camera.right = 6;
  sun.shadow.camera.top = 6; sun.shadow.camera.bottom = -6;
  sun.shadow.camera.far = 25;
  sun.shadow.bias = -0.0004;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xdfefff, 0.35);
  fill.position.set(-5, 4, -3);
  scene.add(fill);

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(11, 48),
    makeMat(COLOUR.cream, { roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const matPad = new THREE.Mesh(
    new THREE.BoxGeometry(7.4, 0.04, 3.6),
    makeMat(COLOUR.mint, { roughness: 0.9, transparent: true, opacity: 0.45 })
  );
  matPad.position.set(0, 0.021, 3.0);
  matPad.receiveShadow = true;
  scene.add(matPad);

  const parts = buildPartMeshes();
  for (const id of Object.keys(parts)) {
    const p = parts[id];
    p.group.position.copy(p.flatPos);
    p.group.quaternion.copy(p.flatQuat);
    scene.add(p.group);
    const label = document.createElement("span");
    label.className = "fp-partlabel";
    label.textContent = p.name;
    labelsEl.appendChild(label);
    p.labelEl = label;
  }

  return { renderer, scene, camera, controls, parts };
}

/* ---------- auto-init ---------- */

function bootFlatpack() {
  const host = document.getElementById("flatpackHost");
  if (host && host.dataset.fpInit !== "1") initFlatpack(host);
}
if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bootFlatpack);
  else bootFlatpack();
}
