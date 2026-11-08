// Particle Studio · the studio itself. One design (spec.js) is edited three ways at once and kept in step: the Blocks panel, dragging
// in the scene, and the code. The simulation (sim.js) runs on the GPU; shapes are sampled once per change (shapes.js); exports
// (exporter.js) stay on the device; the "In the engine" preview draws the exported file with the lab's real engine (engine-preview.js).
import * as THREE from "three";
import { createSim, supportsWebGL2, dims } from "./sim.js";
import { normalise, toCode, runCode, shapeKey, clone, patchNumber, SHAPES, FIELDS, EMITTER, LOOK, CAMERA, CAMERA_PATHS, MAX_EMITTERS, MAX_FIELDS } from "./spec.js";
import { sampleShape, dropped } from "./shapes.js";
import { PRESETS, presetById } from "./presets.js";
import { surprise, randomSeed } from "./surprise.js";
import { createEditor } from "./editor.js";
import * as X from "./exporter.js";
import { createEnginePreview } from "./engine-preview.js";

const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const params = new URLSearchParams(location.search), root = document.documentElement, main = $("#ps-main"), canvas = $("#ps-canvas");
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches || params.has("still");
const phone = () => innerWidth < 760;
const toast = (msg, ms = 2600) => { const t = $("#ps-toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("on"), ms); };

// ------------------------------------------------------------------------------------------------ no WebGL2: the still
if (!supportsWebGL2()) {
  $("#ps-nogl").hidden = false; main.classList.add("ps-off"); $$(".ps-top, .ps-panel, .ps-bar, .ps-tabs, #ps-handles, #ps-canvas").forEach((el) => (el.hidden = true));
  root.classList.add("ps-nogl-on"); window.__ps = { nogl: true };
} else boot();

async function boot() {
  const CAP = phone() ? 262144 : 1048576, FLOOR = 32768;
  const fixed = params.has("budget") ? Math.max(1024, Math.min(2 ** 21, +params.get("budget") || 0)) : null;
  let N = fixed || (phone() ? 262144 : 524288);                 // start half way; the budget climbs when the frame time allows
  const sim = createSim(canvas, { budget: N, reduceMotion: reduce }); N = sim.N;
  const api = { fps: 0, N, errors: [], spec: null, code: "" }; window.__ps = api;

  // ---------------------------------------------------------------- state
  let spec = null, code = "", gen = 0, lastEmitKey = "", dirtyFromCode = false;
  const shapeCache = new Map(); // `${N}|${shapeKey}` → form
  const tl = { t: 0, playing: !reduce, scrubbing: false };
  const view = { yaw: 0, pitch: 0, dist: 0, dragging: false, drifting: 0 };
  const editor = createEditor($("#ps-editor"), { onChange: (v) => applyCode(v), onRun: (v) => applyCode(v, true) });

  async function form(shape, n, seed) {
    const key = `${n}|${shapeKey(shape)}`; if (shapeCache.has(key)) return shapeCache.get(key);
    const f = await sampleShape(shape, n, seed); shapeCache.set(key, f);
    if (shapeCache.size > 24) shapeCache.delete(shapeCache.keys().next().value); return f;
  }
  // the emit texture: every emitter's shape in its share of the texture, each point tagged with its emitter (part)
  async function emitForm(s) {
    const n = sim.N, counts = s.emitters.map((e) => Math.max(1, Math.round(e.share * n))); counts[counts.length - 1] += n - counts.reduce((a, b) => a + b, 0);
    const parts = await Promise.all(s.emitters.map((e, i) => form(e.shape, Math.max(1, counts[i]), s.seed + i)));
    const f = { n, pos: new Float32Array(n * 3), light: new Float32Array(n), kind: new Uint8Array(n), part: new Float32Array(n), anchors: {} }; let k = 0;
    parts.forEach((p, i) => { const c = Math.max(0, Math.min(counts[i], n - k)); f.pos.set(p.pos.subarray(0, c * 3), k * 3); f.light.set(p.light.subarray(0, c), k); f.kind.set(p.kind.subarray(0, c), k); f.part.fill(i, k, k + c); k += c; for (const [a, v] of Object.entries(p.anchors || {})) f.anchors[s.emitters.length > 1 ? `${a}${i + 1}` : a] = v; });
    return f;
  }
  // apply the whole design to the simulation (async: fonts, the Auckland file, a GLB)
  async function apply(s, { reset = false } = {}) {
    const g = ++gen; api.spec = s;
    const want = s.budget === "auto" ? N : Math.min(2 ** 21, s.budget);
    if (dims(want).n !== sim.N) { sim.build(want); shapeCache.clear(); reset = true; }
    const ef = await emitForm(s); if (g !== gen) return;
    const ek = `${sim.N}|${JSON.stringify(s.emitters)}`, warm = ek !== lastEmitKey || reset; if (warm) { sim.setEmit(ef); lastEmitKey = ek; }
    sim.setEmitters(s.emitters); sim.setFields(s.fields); sim.setFlow(s.fields.some((f) => f.type === "flow") ? dropped.flow || dropped.image : null); sim.setLook(s.look);
    targets = await Promise.all(s.timeline.keys.map((k) => (k.target ? form(k.target, sim.N, s.seed + 101) : Promise.resolve(ef)))); if (g !== gen) return;
    curTargets = null; setMorph(true);
    emitAnchors = ef.anchors;
    // a warm start when the emitters were reset: short-lived particles are spread along their paths, not one blob at the spout
    if (warm && s.emitters.some((e) => e.life)) for (let i = 0; i < 150; i++) sim.step(1 / 30);
    api.N = sim.N; $("#ps-stat-budget").textContent = s.budget === "auto" ? `auto · ${fmtN(sim.N)}` : `fixed · ${fmtN(sim.N)}`;
    if (reduce || paused) settle();
    placeHandles();
  }
  let targets = [], curTargets = null, emitAnchors = {};
  // the timeline: which two targets, and how far between them (the first 55% of a segment holds, the rest morphs)
  function setMorph(force) {
    const keys = spec.timeline.keys, n = keys.length; if (!targets.length) return;
    let i = 0; for (let k = 0; k < n; k++) if (keys[k].at <= tl.t) i = k;
    const j = i + 1 < n ? i + 1 : spec.timeline.loop ? 0 : i, a0 = keys[i].at, a1 = i + 1 < n ? keys[i + 1].at : 1, u = a1 > a0 ? (tl.t - a0) / (a1 - a0) : 1;
    const m = j === i ? 0 : smooth(Math.max(0, (u - 0.55) / 0.45)), pair = `${i}|${j}`;
    if (force || pair !== curTargets) { sim.setTargets(targets[i], targets[j]); curTargets = pair; }
    sim.setMorph(m);
  }
  const smooth = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
  const fmtN = (n) => (n >= 1e6 ? (n / 1e6).toFixed(2).replace(/\.?0+$/, "") + "M" : n >= 1e3 ? Math.round(n / 1e3) + "k" : String(n));

  // ---------------------------------------------------------------- the design: set from the panel, from code, from a preset
  function setSpec(s, { from = "panel", reset = false, rewriteCode = true } = {}) {
    const { spec: ns, errs } = normalise(s); spec = ns; api.errors = errs;
    $("#ps-name").value = spec.name; document.title = `${spec.name} · Particle Studio · assembl lab`;
    if (rewriteCode) { code = toCode(spec); editor.set(code); api.code = code; dirtyFromCode = false; }
    if (from !== "code") editor.error(errs.slice(0, 3).join(" · "), null);
    buildPanel(); apply(spec, { reset });
  }
  // the panel changed one value: patch the number in the code if it is written plainly, otherwise rewrite the code
  function setPath(path, value, { reset = false } = {}) {
    let o = spec; for (let i = 0; i < path.length - 1; i++) o = o[path[i]]; o[path[path.length - 1]] = value;
    const { spec: ns, errs } = normalise(spec); spec = ns; api.errors = errs; api.spec = spec;
    const patched = typeof value === "number" ? patchNumber(code, path, value) : null;
    if (patched) code = patched; else { code = toCode(spec); if (dirtyFromCode) toast("The code was rewritten from the blocks"); dirtyFromCode = false; }
    editor.set(code);
    api.code = code; apply(spec, { reset });
  }
  // the code changed: run it; a broken design keeps the last good one on screen and shows where
  function applyCode(text, now = false) {
    code = text; api.code = code; const r = runCode(text);
    if (!r.spec) { editor.error(r.errs[0], r.line); api.errors = r.errs; return; }
    editor.error(r.errs.slice(0, 3).join(" · ") + (r.errs.length > 3 ? ` · ${r.errs.length - 3} more` : ""), null); api.errors = r.errs;
    dirtyFromCode = toCode(r.spec) !== text; spec = r.spec; $("#ps-name").value = spec.name; buildPanel(); apply(spec);
    if (now) toast("Running");
  }

  // ---------------------------------------------------------------- the blocks panel (built from the spec each time it changes)
  const RANGE = { radius: [0.05, 2.5, 0.01], at: [-2, 2, 0.01], from: [-2, 2, 0.01], to: [-2, 2, 0.01], spread: [0, 0.5, 0.005], thickness: [0, 0.3, 0.005], tilt: [-1.6, 1.6, 0.01], shell: [0, 1, 1], size: [0.1, 3, 0.01], tube: [0.02, 0.6, 0.01], arms: [1, 8, 1], twist: [0, 6, 0.1], weight: [300, 600, 100], depth: [0, 0.4, 0.005], edges: [0, 0.8, 0.01], points: [20000, 300000, 10000], dot: [0, 1, 1],
    strength: [0, 4, 0.01], scale: [0.2, 6, 0.05], speed: [0, 2, 0.01], amount: [0, 4, 0.05], stiffness: [0, 20, 0.1], damping: [0, 5, 0.05], snap: [0, 1, 0.01], gust: [0, 2, 0.05], cohesion: [0, 3, 0.05], alignment: [0, 3, 0.05], separation: [0, 3, 0.05], softness: [0, 2, 0.05], width: [0.005, 0.3, 0.005], boost: [0, 1.5, 0.05], lift: [0, 0.1, 0.002], axis: [-1, 1, 0.05], dir: [-1, 1, 0.05],
    share: [0.01, 1, 0.01], rate: [0, 1, 0.01], life: [0.1, 12, 0.1], jitter: [0, 0.2, 0.002], burst: [0, 1, 1],
    bloom: [0, 1.5, 0.01], exposure: [0.3, 2.2, 0.01], iridescence: [0, 1, 0.01], sparkle: [0, 0.08, 0.001], trails: [0, 0.97, 0.01], depthFade: [0, 1, 0.01],
    distance: [0.8, 12, 0.05], height: [-1, 2, 0.01], yaw: [-3.1416, 3.1416, 0.01], pitch: [-1.3, 1.3, 0.01], fov: [12, 80, 1], drift: [0, 1, 0.01], seconds: [1, 60, 0.5], r: [0.05, 1.5, 0.01] };
  const LABEL = { at: "position", dir: "direction", depthFade: "depth fade", iridescence: "iridescence", sparkle: "sparkle share", seconds: "length (s)", fov: "field of view", r: "radius", shell: "shell only", burst: "burst (all at once)", life: "lifetime (s)", rate: "rate (share alive)", share: "share of points" };
  const fmtV = (v, step) => (step >= 1 ? String(Math.round(v)) : step >= 0.1 ? v.toFixed(1) : step >= 0.01 ? v.toFixed(2) : v.toFixed(3));
  function slider(label, path, value, [min, max, step], { onInput } = {}) {
    const id = "c-" + path.join("-").replace(/[^a-z0-9-]/gi, "_"), row = document.createElement("label"); row.className = "ps-ctl";
    row.innerHTML = `<span class="ps-ctl-l">${label}</span><input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${value}"><output class="v2-mono" for="${id}">${fmtV(value, step)}</output>`;
    const inp = $("input", row), out = $("output", row);
    inp.addEventListener("input", () => { const v = +inp.value; out.textContent = fmtV(v, step); (onInput || setPath)(path, v); });
    return row;
  }
  function vecCtl(label, path, value, range) { const wrap = document.createElement("div"); wrap.className = "ps-vec"; wrap.innerHTML = `<span class="ps-ctl-l">${label}</span>`; ["x", "y", "z"].slice(0, value.length).forEach((ax, i) => { const s = slider(ax, [...path, i], value[i], range); s.classList.add("ps-vec-ax"); wrap.append(s); }); return wrap; }
  function toggle(label, path, value) { const row = document.createElement("label"); row.className = "ps-ctl ps-ctl-t"; row.innerHTML = `<span class="ps-ctl-l">${label}</span><input type="checkbox" ${value ? "checked" : ""}>`; $("input", row).addEventListener("change", (e) => setPath(path, e.target.checked ? 1 : 0, { reset: path[0] === "emitters" })); return row; }
  function textCtl(label, path, value) { const row = document.createElement("label"); row.className = "ps-ctl ps-ctl-text"; row.innerHTML = `<span class="ps-ctl-l">${label}</span><input type="text" maxlength="40" value="${String(value).replace(/"/g, "&quot;")}">`; let t; $("input", row).addEventListener("input", (e) => { clearTimeout(t); t = setTimeout(() => setPath(path, e.target.value || "assembl"), 350); }); return row; }
  function selectCtl(label, options, value, onChange) { const row = document.createElement("label"); row.className = "ps-ctl ps-ctl-sel"; row.innerHTML = `<span class="ps-ctl-l">${label}</span><select>${options.map((o) => `<option value="${o}" ${o === value ? "selected" : ""}>${o}</option>`).join("")}</select>`; $("select", row).addEventListener("change", (e) => onChange(e.target.value)); return row; }
  // controls for every setting of a shape or a field, from its defaults
  function paramControls(obj, defaults, path, { skip = [] } = {}) {
    const frag = document.createDocumentFragment();
    for (const [k, d] of Object.entries(defaults)) {
      if (skip.includes(k)) continue; const v = obj[k], label = LABEL[k] || k;
      if (k === "source") { const b = document.createElement("p"); b.className = "ps-drop-hint v2-secondary"; b.textContent = (path.includes("shape") ? "Drop an image or a .glb onto the scene; it stays in this browser and is never in the code or a link." : "Drop an image onto the scene to use its edges as a flow field."); frag.append(b); continue; }
      if (k === "ops") { const p = document.createElement("p"); p.className = "ps-drop-hint v2-secondary"; p.textContent = `${v.length} primitive${v.length === 1 ? "" : "s"} (edit them in the code: sphere, box, torus; union, subtract, intersect).`; frag.append(p); continue; }
      if (k === "text") { frag.append(textCtl("text", [...path, k], v)); continue; }
      if (typeof d === "string") continue;
      if (Array.isArray(d)) { if (k === "life") continue; frag.append(vecCtl(label, [...path, k], v, RANGE[k] || [-2, 2, 0.01])); continue; }
      if (RANGE[k]?.[2] === 1 && RANGE[k][1] === 1) { frag.append(toggle(label, [...path, k], v)); continue; }
      frag.append(slider(label, [...path, k], v, RANGE[k] || [0, 2, 0.01]));
    }
    return frag;
  }
  function card(title, onRemove, kicker) { const c = document.createElement("section"); c.className = "ps-card"; c.innerHTML = `<header><h3>${title}</h3>${kicker ? `<span class="v2-mono ps-kicker">${kicker}</span>` : ""}${onRemove ? '<button type="button" class="ps-x" aria-label="Remove ' + title + '">×</button>' : ""}</header>`; if (onRemove) $(".ps-x", c).addEventListener("click", onRemove); return c; }
  function buildPanel() {
    const s = spec;
    // emitters
    const E = $("#ps-emitters"); E.innerHTML = ""; $("#ps-emit-count").textContent = s.emitters.length;
    s.emitters.forEach((e, i) => {
      const c = card(`Emitter ${i + 1}`, s.emitters.length > 1 ? () => { s.emitters.splice(i, 1); setSpec(s, { reset: true }); } : null, e.shape.type);
      c.append(selectCtl("shape", Object.keys(SHAPES), e.shape.type, (t) => { s.emitters[i].shape = { type: t, ...clone(SHAPES[t]) }; setSpec(s, { reset: true }); }));
      c.append(paramControls(e.shape, SHAPES[e.shape.type], ["emitters", i, "shape"]));
      const more = document.createElement("details"); more.className = "ps-more"; more.innerHTML = "<summary>Rate, life, jitter</summary>"; const body = document.createElement("div");
      if (s.emitters.length > 1) body.append(slider(LABEL.share, ["emitters", i, "share"], e.share, RANGE.share));
      body.append(slider(LABEL.rate, ["emitters", i, "rate"], e.rate, RANGE.rate));
      body.append(slider("lifetime (s, 0 = for ever)", ["emitters", i, "life"], e.life ? e.life[1] : 0, [0, 12, 0.1], { onInput: (p, v) => { const lo = e.life ? Math.min(e.life[0], v) : v * 0.5; s.emitters[i].life = v > 0 ? [Math.max(0.1, lo), Math.max(0.1, v)] : 0; setSpec(s, { reset: false }); } }));
      body.append(slider(LABEL.jitter, ["emitters", i, "jitter"], e.jitter, RANGE.jitter)); body.append(slider("initial speed", ["emitters", i, "speed"], e.speed, RANGE.speed)); body.append(toggle(LABEL.burst, ["emitters", i, "burst"], e.burst));
      more.append(body); c.append(more); E.append(c);
    });
    $("#ps-add-emitter").disabled = s.emitters.length >= MAX_EMITTERS;
    // fields
    const F = $("#ps-fields"); F.innerHTML = ""; $("#ps-field-count").textContent = s.fields.length;
    s.fields.forEach((f, i) => { const c = card(f.type, () => { s.fields.splice(i, 1); setSpec(s); }, "at" in f ? "handle in scene" : ""); c.append(paramControls(f, FIELDS[f.type], ["fields", i])); F.append(c); });
    const add = $("#ps-add-field"); add.innerHTML = '<option value="">Add a field…</option>' + Object.keys(FIELDS).map((k) => `<option value="${k}">${k}</option>`).join(""); add.disabled = s.fields.length >= MAX_FIELDS;
    // look, camera, timeline
    const L = $("#ps-look"); L.innerHTML = ""; for (const k of Object.keys(LOOK)) L.append(slider(LABEL[k] || k, ["look", k], s.look[k], RANGE[k]));
    const C = $("#ps-camera"); C.innerHTML = ""; for (const k of ["distance", "height", "yaw", "pitch", "fov", "drift"]) C.append(slider(LABEL[k] || k, ["camera", k], s.camera[k], RANGE[k]));
    C.append(selectCtl("path", CAMERA_PATHS, s.camera.path, (v) => { s.camera.path = v; setSpec(s); }));
    const T = $("#ps-timeline"); T.innerHTML = ""; T.append(slider(LABEL.seconds, ["timeline", "seconds"], s.timeline.seconds, RANGE.seconds)); T.append(toggle("loop", ["timeline", "loop"], s.timeline.loop));
    const K = $("#ps-keys"); K.innerHTML = ""; $("#ps-key-count").textContent = s.timeline.keys.length;
    s.timeline.keys.forEach((k, i) => {
      const c = card(`Target ${i + 1}`, s.timeline.keys.length > 1 ? () => { s.timeline.keys.splice(i, 1); setSpec(s); } : null, k.target ? k.target.type : "rest (the emitters)");
      c.append(slider("at (share of the timeline)", ["timeline", "keys", i, "at"], k.at, [0, 1, 0.01]));
      c.append(selectCtl("target", ["rest", ...Object.keys(SHAPES)], k.target ? k.target.type : "rest", (t) => { s.timeline.keys[i].target = t === "rest" ? null : { type: t, ...clone(SHAPES[t]) }; setSpec(s); }));
      if (k.target) c.append(paramControls(k.target, SHAPES[k.target.type], ["timeline", "keys", i, "target"]));
      K.append(c);
    });
    $("#ps-add-key").disabled = s.timeline.keys.length >= 8;
    $("#ps-loop").checked = !!s.timeline.loop;
  }
  $("#ps-add-emitter").addEventListener("click", () => { if (spec.emitters.length >= MAX_EMITTERS) return; spec.emitters.forEach((e) => (e.share *= 0.7)); spec.emitters.push({ ...EMITTER, share: 0.3, shape: { type: "ring", ...clone(SHAPES.ring) } }); setSpec(spec, { reset: true }); });
  $("#ps-add-field").addEventListener("change", (e) => { const t = e.target.value; if (!t) return; spec.fields.push({ type: t, ...clone(FIELDS[t]) }); setSpec(spec); });
  $("#ps-add-key").addEventListener("click", () => { const k = spec.timeline.keys; k.push({ at: Math.min(1, +(k[k.length - 1].at + 0.5 / (k.length + 1)).toFixed(2)), target: { type: "sphere", ...clone(SHAPES.sphere) } }); if (!spec.fields.some((f) => f.type === "attract")) spec.fields.push({ type: "attract", ...clone(FIELDS.attract) }); setSpec(spec); });
  $("#ps-name").addEventListener("input", (e) => { spec.name = e.target.value.slice(0, 60) || "Untitled"; code = code.replace(/^(\s*name:\s*)"(?:[^"\\]|\\.)*"/m, `$1${JSON.stringify(spec.name)}`); editor.set(code); api.code = code; document.title = `${spec.name} · Particle Studio · assembl lab`; });

  // ---------------------------------------------------------------- presets, surprise, share, the API drawer
  const list = $("#ps-preset-list"); list.innerHTML = PRESETS.map((p) => `<li><button type="button" data-preset="${p.id}"><strong>${p.title}</strong><span>${p.line}</span></button></li>`).join("");
  list.addEventListener("click", (e) => { const b = e.target.closest("[data-preset]"); if (!b) return; loadPreset(b.dataset.preset); $("#ps-presets").open = false; });
  function loadPreset(id) { const p = presetById(id); if (!p) return; history.replaceState(null, "", `?preset=${id}`); tl.t = 0; setSpec(clone(p.spec), { reset: true }); toast(p.title); }
  function loadSurprise(seed) { history.replaceState(null, "", `#seed=${seed}`); tl.t = 0; setSpec(surprise(seed), { reset: true }); toast(`Surprise · seed ${seed}`); }
  $("#ps-surprise").addEventListener("click", () => loadSurprise(randomSeed()));
  async function shareLink() { const h = await X.encodeShare(spec); const url = `${location.origin}${location.pathname}#${h}`; history.replaceState(null, "", `#${h}`); return url; }
  $("#ps-share").addEventListener("click", async () => { const url = await shareLink(); try { await navigator.clipboard.writeText(url); toast("Link copied: the whole design is in it"); } catch { toast("Link is in the address bar"); } });
  const apiBody = $("#ps-api-body");
  apiBody.innerHTML = `
    <p class="v2-body">A design is an object (<code>export default { … }</code>) or a function of <code>studio</code> that returns one. Only <code>studio</code> is in scope: no page, no network. Unknown settings are reported, never fatal.</p>
    <h3>studio</h3><dl class="ps-dl"><dt>studio.shape.&lt;type&gt;(o)</dt><dd>a shape object with defaults: <code>studio.shape.ring({ radius: 1 })</code></dd><dt>studio.field.&lt;type&gt;(o)</dt><dd>a field object: <code>studio.field.curl({ strength: .5 })</code></dd><dt>studio.rng(seed)</dt><dd>a seeded random generator, returns () → 0…1</dd><dt>studio.range(n, fn)</dt><dd>an array of n results of fn(i, n) (n ≤ 64)</dd><dt>studio.lerp, clamp, TAU, PI, Math</dt><dd>the usual</dd></dl>
    <h3>Shapes</h3>${Object.entries(SHAPES).map(([k, d]) => `<p class="ps-api-row"><code class="v2-mono">${k}</code> <span class="v2-mono v2-secondary">${Object.entries(d).map(([a, b]) => `${a}: ${JSON.stringify(b)}`).join(", ")}</span></p>`).join("")}
    <p class="v2-secondary ps-small">image and mesh take the file dropped on the scene (never in the code); text renders in Instrument Sans; auckland reads the lab's baked map; sdf composes sphere, box and torus with union, subtract and intersect.</p>
    <h3>Fields</h3>${Object.entries(FIELDS).map(([k, d]) => `<p class="ps-api-row"><code class="v2-mono">${k}</code> <span class="v2-mono v2-secondary">${Object.entries(d).map(([a, b]) => `${a}: ${JSON.stringify(b)}`).join(", ")}</span></p>`).join("")}
    <p class="v2-secondary ps-small">well pulls, repel pushes; attract pulls every point to the timeline's current target (the assemble effect); spring holds points at their emitter (rest); scan is the reading band that brightens what it passes; flock is a light sketch of boids on a coarse grid; contain keeps a system in frame.</p>
    <h3>Look · camera · timeline</h3><p class="ps-api-row"><code class="v2-mono">look</code> <span class="v2-mono v2-secondary">${Object.entries(LOOK).map(([a, b]) => `${a}: ${b}`).join(", ")}</span></p><p class="ps-api-row"><code class="v2-mono">camera</code> <span class="v2-mono v2-secondary">${Object.entries(CAMERA).map(([a, b]) => `${a}: ${JSON.stringify(b)}`).join(", ")}</span> · path one of ${CAMERA_PATHS.join(", ")}</p><p class="ps-api-row"><code class="v2-mono">timeline</code> <span class="v2-mono v2-secondary">seconds, loop, keys: [{ at: 0…1, target: shape | null }]</span></p>
    <h3>Examples (each runs)</h3>
    <div class="ps-examples">${[
      ["A generated ring of wells", `export default (studio) => ({\n  name: "Twelve wells",\n  emitters: [{ shape: studio.shape.scatter({ radius: 1.6 }) }],\n  fields: [\n    ...studio.range(12, (i, n) => studio.field.well({ at: [Math.cos(i / n * studio.TAU) * 1.1, 0.5, Math.sin(i / n * studio.TAU) * 1.1], strength: 0.5, radius: 0.35 })),\n    studio.field.drag({ amount: 1.2 }), studio.field.curl({ strength: 0.15 }),\n  ],\n  look: { trails: 0.6 }, camera: { pitch: 0.5, path: "orbit" },\n});`],
      ["Seeded variation", `export default (studio) => {\n  const r = studio.rng(42);\n  return { name: "Seeded", emitters: [{ shape: studio.shape.torus({ radius: 0.5 + r() * 0.4, tube: 0.1 + r() * 0.2 }) }],\n    fields: [studio.field.spring({ stiffness: 8 }), studio.field.vortex({ strength: 0.5 + r(), axis: [r() - 0.5, 1, r() - 0.5] })], camera: { path: "sweep" } };\n};`],
      ...PRESETS.map((p) => [p.title, toCode(normalise(clone(p.spec)).spec)]),
    ].map(([t, c]) => `<details class="ps-ex"><summary>${t}</summary><pre class="v2-mono"><code>${c.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</code></pre><button type="button" class="ps-btn ps-btn-sm" data-run>Run this</button></details>`).join("")}</div>`;
  apiBody.addEventListener("click", (e) => { const b = e.target.closest("[data-run]"); if (!b) return; const c = $("code", b.parentElement).textContent; editor.set(c); applyCode(c, true); });
  $("#ps-api-toggle").addEventListener("click", () => { const a = $("#ps-api"); a.hidden = !a.hidden; $("#ps-api-toggle").setAttribute("aria-expanded", String(!a.hidden)); });
  $("#ps-run").addEventListener("click", () => applyCode(editor.value, true));
  $("#ps-copy").addEventListener("click", async () => { try { await navigator.clipboard.writeText(code); toast("Code copied"); } catch { toast("Select the code to copy it"); } });
  $("#ps-rewrite").addEventListener("click", () => { code = toCode(spec); editor.set(code); dirtyFromCode = false; api.code = code; toast("Code tidied from the blocks"); });

  // ---------------------------------------------------------------- panels, tabs, pause
  const setOpen = (id, on) => { const el = document.getElementById(id); el.classList.toggle("open", on); el.hidden = false; $$(`[aria-controls="${id}"].ps-toggle`).forEach((b) => b.setAttribute("aria-pressed", String(on))); $$(`.ps-tab[data-tab="${id}"]`).forEach((b) => b.setAttribute("aria-pressed", String(on))); };
  $$(".ps-toggle").forEach((b) => b.addEventListener("click", () => setOpen(b.getAttribute("aria-controls"), b.getAttribute("aria-pressed") !== "true")));
  $$(".ps-tab[data-tab]").forEach((b) => b.addEventListener("click", () => { const id = b.dataset.tab, on = b.getAttribute("aria-pressed") !== "true"; ["ps-blocks", "ps-code"].forEach((x) => setOpen(x, x === id && on)); }));
  $$("[data-close]").forEach((b) => b.addEventListener("click", () => { const id = b.dataset.close, el = document.getElementById(id); if (el.tagName === "DIALOG") el.close(); else if (id === "ps-api") { el.hidden = true; $("#ps-api-toggle").setAttribute("aria-expanded", "false"); } else setOpen(id, false); }));
  setOpen("ps-blocks", !phone()); setOpen("ps-code", innerWidth >= 1180);
  let paused = false;
  const pauseBtn = $("#ps-pause");
  function setPaused(p) { paused = p; pauseBtn.setAttribute("aria-pressed", String(p)); pauseBtn.setAttribute("aria-label", p ? "Play motion" : "Pause motion"); pauseBtn.title = pauseBtn.getAttribute("aria-label"); sim.setReduce(p || reduce); if (p) settle(); }
  pauseBtn.addEventListener("click", () => setPaused(!paused));
  // a still, fully formed frame: step the system quietly, then draw it once (reduced motion, Pause motion)
  function settle(steps = 240) { setMorph(); for (let i = 0; i < steps; i++) sim.step(1 / 60); placeCamera(sim.time); sim.draw(); }
  addEventListener("keydown", (e) => { if (e.target.closest("input, textarea, select")) return; if (e.key === " ") { e.preventDefault(); setPaused(!paused); } if (e.key === "Escape") { $("#ps-api").hidden = true; } });

  // ---------------------------------------------------------------- camera: orbit by drag, dolly by wheel, drift, paths
  const camPos = new THREE.Vector3(), LOOK_AT = new THREE.Vector3();
  function placeCamera(t) {
    const c = spec.camera, ph = tl.t, e = smooth(ph), drift = c.drift * (reduce || paused ? 0 : 1);
    let yaw = c.yaw + view.yaw + Math.sin(t * 0.11) * 0.18 * drift, pitch = c.pitch + view.pitch + Math.sin(t * 0.07) * 0.06 * drift, dist = Math.max(0.6, c.distance + view.dist);
    if (c.path === "orbit") yaw += ph * Math.PI * 2; else if (c.path === "sweep") yaw += Math.sin(ph * Math.PI * 2) * 0.55; else if (c.path === "rise") pitch += -0.15 + 0.6 * e; else if (c.path === "push") dist *= 1.3 - 0.5 * smooth(Math.sin(ph * Math.PI)); else if (c.path === "figure") { yaw += Math.sin(ph * Math.PI * 2) * 0.7; pitch += Math.sin(ph * Math.PI * 4) * 0.2; }
    pitch = Math.max(-1.35, Math.min(1.45, pitch));
    LOOK_AT.set(0, c.height, 0); camPos.set(Math.sin(yaw) * Math.cos(pitch) * dist, c.height + Math.sin(pitch) * dist, Math.cos(yaw) * Math.cos(pitch) * dist);
    sim.camera.position.copy(camPos); sim.camera.lookAt(LOOK_AT); sim.camera.fov = c.fov; sim.camera.updateProjectionMatrix();
  }
  let drag = null, commitT;
  const commitView = () => { clearTimeout(commitT); commitT = setTimeout(() => { if (!view.yaw && !view.pitch && !view.dist) return; spec.camera.yaw = +(spec.camera.yaw + view.yaw).toFixed(3); spec.camera.pitch = +Math.max(-1.3, Math.min(1.3, spec.camera.pitch + view.pitch)).toFixed(3); spec.camera.distance = +Math.max(0.8, spec.camera.distance + view.dist).toFixed(3); view.yaw = view.pitch = view.dist = 0;
    for (const k of ["yaw", "pitch", "distance"]) { const p = patchNumber(code, ["camera", k], spec.camera[k]); if (p) code = p; } editor.set(code); api.code = code; buildPanel(); }, 500); };
  canvas.addEventListener("pointerdown", (e) => { if (e.button !== 0) return; canvas.setPointerCapture(e.pointerId); drag = { x: e.clientX, y: e.clientY, moved: false }; });
  canvas.addEventListener("pointermove", (e) => { if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY; if (Math.abs(dx) + Math.abs(dy) > 1) drag.moved = true; view.yaw -= dx * 0.005; view.pitch += dy * 0.004; if (paused || reduce) { placeCamera(sim.time); sim.draw(); placeHandles(); } });
  canvas.addEventListener("pointerup", () => { if (drag?.moved) commitView(); drag = null; });
  canvas.addEventListener("wheel", (e) => { e.preventDefault(); view.dist += Math.sign(e.deltaY) * 0.12; view.dist = Math.max(0.8 - spec.camera.distance, Math.min(9, view.dist)); commitView(); if (paused || reduce) { placeCamera(sim.time); sim.draw(); placeHandles(); } }, { passive: false });
  canvas.addEventListener("dblclick", (e) => { const p = scenePoint(e.clientX, e.clientY); if (!p) return; if (spec.fields.length >= MAX_FIELDS) return toast("Twelve fields is the most"); spec.fields.push({ type: e.shiftKey ? "repel" : "well", ...clone(FIELDS.well), at: p.map((v) => +v.toFixed(3)) }); setSpec(spec); toast(e.shiftKey ? "Repeller placed" : "Well placed: drag its handle"); });
  canvas.addEventListener("keydown", (e) => { const k = { ArrowLeft: [-0.08, 0], ArrowRight: [0.08, 0], ArrowUp: [0, 0.05], ArrowDown: [0, -0.05] }[e.key]; if (!k) return; e.preventDefault(); view.yaw += k[0]; view.pitch += k[1]; commitView(); if (paused || reduce) { placeCamera(sim.time); sim.draw(); } });
  // a screen point → the point on the plane through the look-at, facing the camera
  const ray = new THREE.Raycaster(), plane = new THREE.Plane(), hit = new THREE.Vector3();
  function scenePoint(cx, cy, through = LOOK_AT) { const r = canvas.getBoundingClientRect(); ray.setFromCamera(new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1), sim.camera); plane.setFromNormalAndCoplanarPoint(sim.camera.getWorldDirection(new THREE.Vector3()).negate(), through); return ray.ray.intersectPlane(plane, hit) ? [hit.x, hit.y, hit.z] : null; }

  // ---------------------------------------------------------------- field handles: drag a well, vortex, orbit or repeller in the scene
  const handles = $("#ps-handles"), tmpV = new THREE.Vector3();
  function placeHandles() {
    const withAt = spec.fields.map((f, i) => ({ f, i })).filter(({ f }) => "at" in f);
    if (handles.children.length !== withAt.length) { handles.innerHTML = withAt.map(({ f, i }) => `<button type="button" class="ps-handle" data-i="${i}" aria-label="${f.type} ${i + 1}: drag to move, arrow keys to nudge"><span class="v2-mono">${f.type}</span></button>`).join(""); }
    const r = canvas.getBoundingClientRect();
    withAt.forEach(({ f, i }, k) => { const el = handles.children[k]; el.dataset.i = i; el.querySelector("span").textContent = f.type; tmpV.set(...f.at).project(sim.camera); const vis = tmpV.z < 1; el.style.display = vis ? "" : "none"; el.style.left = `${(tmpV.x * 0.5 + 0.5) * r.width}px`; el.style.top = `${(-tmpV.y * 0.5 + 0.5) * r.height}px`; });
  }
  let hdrag = null;
  handles.addEventListener("pointerdown", (e) => { const h = e.target.closest(".ps-handle"); if (!h) return; e.preventDefault(); h.setPointerCapture(e.pointerId); hdrag = { i: +h.dataset.i, el: h }; h.classList.add("live"); });
  handles.addEventListener("pointermove", (e) => { if (!hdrag) return; const f = spec.fields[hdrag.i]; const p = scenePoint(e.clientX, e.clientY, tmpV.set(...f.at)); if (!p) return; f.at = p.map((v) => +v.toFixed(3)); sim.setFields(spec.fields); placeHandles(); if (paused || reduce) settle(60); });
  handles.addEventListener("pointerup", () => { if (!hdrag) return; hdrag.el.classList.remove("live"); const i = hdrag.i; hdrag = null; for (let a = 0; a < 3; a++) { const p = patchNumber(code, ["fields", i, "at", a], spec.fields[i].at[a]); if (p) code = p; else { code = toCode(spec); dirtyFromCode = false; break; } } editor.set(code); api.code = code; buildPanel(); });
  handles.addEventListener("keydown", (e) => { const h = e.target.closest(".ps-handle"); if (!h) return; const d = { ArrowLeft: [-0.05, 0], ArrowRight: [0.05, 0], ArrowUp: [0, 0.05], ArrowDown: [0, -0.05] }[e.key]; if (!d) return; e.preventDefault(); const i = +h.dataset.i, at = spec.fields[i].at.slice(); at[0] = +(at[0] + d[0]).toFixed(3); at[1] = +(at[1] + d[1]).toFixed(3); setPath(["fields", i, "at", 0], at[0]); setPath(["fields", i, "at", 1], at[1]); });

  // ---------------------------------------------------------------- drops: an image (emitter, flow field) or a GLB (emitter), kept in memory only
  const useDrop = (kind) => { const uses = spec.emitters.some((e) => e.shape.type === kind) || spec.timeline.keys.some((k) => k.target?.type === kind); if (!uses) spec.emitters[0].shape = { type: kind, ...clone(SHAPES[kind]) }; shapeCache.clear(); setSpec(spec, { reset: true }); toast(kind === "image" ? "Image sampled by its edges and light. It stays in this browser." : "Model sampled by surface and edges. It stays in this browser."); };
  async function takeFile(file) {
    if (!file) return;
    if (/\.(glb|gltf)$/i.test(file.name) || file.type === "model/gltf-binary") { dropped.mesh = await file.arrayBuffer(); useDrop("mesh"); return; }
    if (file.type.startsWith("image/")) { const img = new Image(); img.onload = () => { dropped.image = img; dropped.flow = img; useDrop("image"); }; img.src = URL.createObjectURL(file); return; }
    toast("Drop a PNG, JPG, WebP or a .glb");
  }
  addEventListener("dragover", (e) => { e.preventDefault(); main.classList.add("ps-dropping"); }); addEventListener("dragleave", () => main.classList.remove("ps-dropping"));
  addEventListener("drop", (e) => { e.preventDefault(); main.classList.remove("ps-dropping"); takeFile(e.dataTransfer?.files?.[0]); });
  addEventListener("paste", (e) => { const f = [...(e.clipboardData?.files || [])][0]; if (f) { e.preventDefault(); takeFile(f); } });

  // ---------------------------------------------------------------- timeline transport
  const scrub = $("#ps-scrub"), timeOut = $("#ps-time"), playBtn = $("#ps-play");
  scrub.addEventListener("input", () => { tl.t = scrub.value / 1000; tl.scrubbing = true; setMorph(); if (paused || reduce) settle(90); }); scrub.addEventListener("change", () => (tl.scrubbing = false));
  playBtn.addEventListener("click", () => { tl.playing = !tl.playing; playBtn.setAttribute("aria-pressed", String(tl.playing)); playBtn.setAttribute("aria-label", tl.playing ? "Pause the timeline" : "Play the timeline"); });
  $("#ps-loop").addEventListener("change", (e) => setPath(["timeline", "loop"], e.target.checked ? 1 : 0));

  // ---------------------------------------------------------------- export dialog
  const dlg = $("#ps-export-dlg"), preview = createEnginePreview($("#x-engine"), { reduceMotion: reduce });
  const openExport = async () => { $("#x-link").value = await shareLink(); dlg.showModal(); };
  $("#ps-export").addEventListener("click", openExport); $("#ps-export-tab").addEventListener("click", openExport);
  dlg.addEventListener("close", () => preview.dispose());
  $("#x-copy-code").addEventListener("click", async () => { try { await navigator.clipboard.writeText(code); toast("Code copied"); } catch { toast("Could not reach the clipboard"); } });
  $("#x-dl-code").addEventListener("click", () => X.download(new Blob([code], { type: "text/javascript" }), `${X.slug(spec.name)}.design.js`));
  $$("[data-png]").forEach((b) => b.addEventListener("click", () => { const k = +b.dataset.png; placeCamera(sim.time); const cv = sim.still(k); cv.toBlob((blob) => { X.download(blob, `${X.slug(spec.name)}@${k}x.png`); toast(`PNG ${cv.width}×${cv.height} saved`); }, "image/png"); }));
  $$("[data-webm]").forEach((b) => b.addEventListener("click", async () => { const s = +b.dataset.webm, rec = $("#x-rec"); rec.hidden = false; dlg.close(); try { const blob = await X.recordCanvas(canvas, s, { onTick: (k) => (rec.textContent = `recording ${Math.round(k * s)} / ${s} s`), onFrame: (fn) => (afterDraw = fn) }); X.download(blob, `${X.slug(spec.name)}-${s}s.webm`); toast(`WebM saved (${(blob.size / 1e6).toFixed(1)} MB)`); } catch (e) { toast(e.message); } afterDraw = null; rec.hidden = true; }));
  let afterDraw = null;
  let baked = { a: null, b: null };
  async function bake(slot) {
    const count = +$("#x-count").value; placeCamera(sim.time);
    const state = sim.readState(), fieldAnchors = Object.fromEntries(spec.fields.filter((f) => "at" in f).map((f, i) => [`${f.type}${i + 1}`, f.at]));
    const f = X.bakeForm(state, { count, size: 2.1, anchors: { ...emitAnchors, ...fieldAnchors }, seed: spec.seed });
    if (!f.n) return toast("No live points to bake yet");
    const { bin, header } = X.encodePoints(f, { name: spec.name, seed: spec.seed, size: 2.1, frame: +tl.t.toFixed(3) });
    const stillCv = sim.still(1); const still = await new Promise((res) => stillCv.toBlob(res, "image/png"));
    baked[slot] = { bin, header, still, form: X.decodePoints(bin, header) };
    if (slot === "a") baked.b = null;
    const id = X.slug(spec.name); $("#x-files").hidden = false; $("#x-baked").textContent = `${header.count.toLocaleString("en-NZ")} points · ${(bin.byteLength / 1024).toFixed(0)} kB${baked.b ? " · pair A + B" : ""}`;
    $("#x-dl-bin").onclick = () => { X.download(new Blob([baked.a.bin]), `${id}-points.bin`); if (baked.b) X.download(new Blob([baked.b.bin]), `${id}-b-points.bin`); };
    $("#x-dl-json").onclick = () => { X.download(new Blob([JSON.stringify(baked.a.header, null, 1)], { type: "application/json" }), `${id}-points.json`); if (baked.b) X.download(new Blob([JSON.stringify(baked.b.header, null, 1)], { type: "application/json" }), `${id}-b-points.json`); };
    $("#x-dl-form").onclick = () => X.download(new Blob([X.formModule(spec.name, baked.a.header, { pair: !!baked.b })], { type: "text/javascript" }), `${id}-form.js`);
    $("#x-compare").hidden = false; $("#x-engine-note").hidden = false; const img = $("#x-studio-still"); img.src = URL.createObjectURL(baked[slot].still);
    preview.show(baked.a.form, baked.b?.form || null); api.rawBaked = baked; api.baked = { a: baked.a && { count: baked.a.header.count, bytes: baked.a.bin.byteLength, stride: baked.a.header.stride, header: baked.a.header }, b: baked.b && { count: baked.b.header.count, bytes: baked.b.bin.byteLength } };
    toast(slot === "a" ? "Frame baked: the engine on the right is drawing the file" : "Frame B baked: the engine morphs A ↔ B");
  }
  $("#x-bake-a").addEventListener("click", () => bake("a")); $("#x-bake-b").addEventListener("click", () => (baked.a ? bake("b") : toast("Bake frame A first")));
  $("#x-copy-link").addEventListener("click", async () => { try { await navigator.clipboard.writeText($("#x-link").value); toast("Link copied"); } catch { $("#x-link").select(); } });
  api.bake = bake; api.readState = () => sim.readState();
  // a small probe of the rendered frame (the canvas has no preserved buffer, so a test reads a fresh still)
  api.pixels = (w = 48, h = 30) => { placeCamera(sim.time); const cv = sim.still(1); const s = document.createElement("canvas"); s.width = w; s.height = h; const g = s.getContext("2d"); g.drawImage(cv, 0, 0, w, h); const d = g.getImageData(0, 0, w, h).data; let bright = 0, sum = 0, ground = 0; for (let i = 0; i < d.length; i += 4) { const l = d[i] + d[i + 1] + d[i + 2]; sum += l; if (l > 300) bright++; if (Math.abs(d[i] - 33) < 6 && Math.abs(d[i + 1] - 18) < 6 && Math.abs(d[i + 2] - 31) < 6) ground++; } return { bright, ground, mean: sum / (d.length / 4), w, h }; };
  api.stillDataURL = (k = 1) => { placeCamera(sim.time); return sim.still(k).toDataURL("image/png"); };

  // ---------------------------------------------------------------- the frame loop, with the adaptive budget
  let last = performance.now(), ema = 16, slowFor = 0, fastFor = 0, lastChange = performance.now(), frames = 0, fpsT = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(1 / 30, Math.max(0.001, (now - last) / 1000)); last = now; frames++;   // a slow device slows the system down; it never blows up
    if (now - fpsT > 1000) { api.fps = Math.round(frames * 1000 / (now - fpsT)); $("#ps-stat-fps").textContent = paused || reduce ? "still" : `${api.fps} fps`; $("#ps-stat-n").textContent = `${fmtN(aliveEstimate())} points`; frames = 0; fpsT = now; }
    if (document.hidden || !spec) return;
    if ((paused || reduce) && afterDraw) { sim.draw(); afterDraw(); }
    if (!paused && !reduce) {
      if (tl.playing && !tl.scrubbing) { tl.t += dt / spec.timeline.seconds; if (tl.t >= 1) tl.t = spec.timeline.loop ? tl.t - 1 : 1; scrub.value = Math.round(tl.t * 1000); }
      timeOut.value = `${(tl.t * spec.timeline.seconds).toFixed(1)} s`;
      setMorph(); sim.step(dt); placeCamera(sim.time); sim.draw(); placeHandles(); afterDraw?.();
      // the budget follows the frame time: halve when slow, climb when there is room (auto only, never under a fixed budget)
      ema = ema * 0.92 + dt * 1000 * 0.08;
      if (spec.budget === "auto" && !fixed && now - lastChange > 4000 && now > 5000) {
        if (ema > 24) { slowFor += dt; fastFor = 0; } else if (ema < 11.5) { fastFor += dt; slowFor = 0; } else { slowFor = fastFor = 0; }
        if (slowFor > 1.5 && sim.N > FLOOR) { N = Math.max(FLOOR, sim.N >> 1); lastChange = now; slowFor = 0; sim.build(N); shapeCache.clear(); apply(spec, { reset: true }); toast(`Budget eased to ${fmtN(dims(N).n)} points for this device`); }
        else if (fastFor > 5 && sim.N < CAP) { N = Math.min(CAP, sim.N << 1); lastChange = now; fastFor = 0; sim.build(N); shapeCache.clear(); apply(spec, { reset: true }); }
      }
    }
    api.N = sim.N;
  }
  const aliveEstimate = () => Math.round(spec ? spec.emitters.reduce((s, e) => s + e.share * e.rate, 0) * sim.N : 0);
  addEventListener("resize", () => { sim.resize(); placeCamera(sim.time); if (paused || reduce) sim.draw(); placeHandles(); });
  document.addEventListener("visibilitychange", () => { last = performance.now(); });

  // ---------------------------------------------------------------- start: a shared design, a surprise seed, a preset, or the mark
  sim.resize(true);
  const seed = X.seedFromHash(location.hash), shared = seed == null ? await X.decodeShare(location.hash) : null;
  if (seed != null) setSpec(surprise(seed), { reset: true });
  else if (shared) setSpec(shared, { reset: true });
  else setSpec(clone((presetById(params.get("preset")) || PRESETS[0]).spec), { reset: true });
  addEventListener("hashchange", async () => { const s = X.seedFromHash(location.hash); if (s != null) return setSpec(surprise(s), { reset: true }); const sh = await X.decodeShare(location.hash); if (sh) setSpec(sh, { reset: true }); });
  api.seek = (t) => { tl.t = Math.min(1, Math.max(0, t)); scrub.value = Math.round(tl.t * 1000); setMorph(); if (paused || reduce) settle(150); };
  api.loadPreset = loadPreset; api.loadSurprise = loadSurprise; api.setCode = (c) => { editor.set(c); applyCode(c, true); }; api.ready = true;
  root.classList.add("ps-on");
  requestAnimationFrame(frame);
}
