// Particle Studio · the design spec. A design is one plain object: emitters, fields, look, camera and a timeline. The studio
// generates it as a small readable JS module (`export default { … }`), runs the module back into an object, and keeps the two in
// step. Nothing in here touches the DOM or WebGL; it is the grammar the simulation, the panel and the code editor all share.

export const SHAPES = {
  point: { at: [0, 0.4, 0], spread: 0.02 },
  line: { from: [-1, 0.4, 0], to: [1, 0.4, 0], thickness: 0.01 },
  ring: { radius: 0.8, at: [0, 0.4, 0], thickness: 0.02, tilt: 0 },
  disc: { radius: 0.8, at: [0, 0.4, 0], tilt: 1.5708 },
  sphere: { radius: 0.7, at: [0, 0.5, 0], shell: 1 },
  box: { size: [1.2, 0.8, 0.8], at: [0, 0.45, 0], shell: 1 },
  torus: { radius: 0.7, tube: 0.22, at: [0, 0.5, 0] },
  spiral: { radius: 1.3, arms: 3, twist: 2.4, thickness: 0.08, at: [0, 0.4, 0] },
  sheet: { size: [1.8, 1.1], at: [0, 0.55, 0], tilt: 0.25 },
  scatter: { radius: 1.6, at: [0, 0.5, 0] },
  text: { text: "assembl", size: 1.6, weight: 400, depth: 0.05 },
  image: { source: "dropped", size: 1.6, depth: 0.05 },
  mesh: { source: "dropped", size: 1.5, edges: 0.34 },
  sdf: { ops: [{ shape: "sphere", r: 0.6, at: [0, 0.5, 0] }, { shape: "box", size: [0.5, 0.5, 0.5], at: [0.5, 0.7, 0], op: "subtract" }], shell: 0.03, size: 1.4 },
  mark: { size: 1.2, dot: 1 },
  auckland: { size: 2.1, points: 300000 },
};
export const FIELDS = {
  curl: { strength: 0.4, scale: 1.2, speed: 0.25 },
  turbulence: { strength: 0.2, scale: 6 },
  vortex: { at: [0, 0.4, 0], axis: [0, 1, 0], strength: 1, radius: 1.2 },
  well: { at: [0, 0.4, 0], strength: 1, radius: 0.6 },
  repel: { at: [0, 0.4, 0], strength: 1, radius: 0.6 },
  orbit: { at: [0, 0.4, 0], axis: [0, 1, 0], strength: 1, radius: 1 },
  gravity: { dir: [0, -1, 0], strength: 0.4 },
  wind: { dir: [1, 0, 0], strength: 0.3, gust: 0.5 },
  drag: { amount: 1 },
  attract: { strength: 2.5, snap: 0.5 },
  spring: { stiffness: 6, damping: 2 },
  flow: { source: "dropped", strength: 0.8 },
  flock: { cohesion: 0.6, alignment: 1, separation: 1.2, radius: 0.12, speed: 0.8 },
  contain: { radius: 1.8, softness: 0.4 },
  scan: { speed: 0.12, width: 0.05, boost: 0.6, lift: 0.02 },
};
export const EMITTER = { share: 1, rate: 1, life: 0, jitter: 0, burst: 0, speed: 0 };
export const LOOK = { bloom: 0.65, exposure: 1, size: 1, iridescence: 1, sparkle: 0.02, trails: 0, depthFade: 1 };
export const CAMERA = { distance: 3.4, height: 0.45, yaw: 0, pitch: 0.12, fov: 30, drift: 0.12, path: "none", dof: 0 };
export const CAMERA_PATHS = ["none", "orbit", "sweep", "rise", "push", "figure"];
export const TIMELINE = { seconds: 8, loop: 1, keys: [{ at: 0, target: null }] };
export const MAX_EMITTERS = 4, MAX_FIELDS = 12;

const num = (v, d) => (typeof v === "number" && isFinite(v) ? v : d);
const vec = (v, d) => (Array.isArray(v) && v.length === d.length && v.every((x) => typeof x === "number" && isFinite(x)) ? v.slice() : d.slice());
const fill = (o, defaults, path, errs) => {
  const out = {};
  for (const [k, d] of Object.entries(defaults)) {
    const v = o?.[k];
    if (Array.isArray(d)) out[k] = typeof d[0] === "number" ? vec(v, d) : v == null ? JSON.parse(JSON.stringify(d)) : v;
    else if (typeof d === "number") out[k] = num(v, d);
    else if (typeof d === "string") out[k] = v == null ? d : String(v);
    else out[k] = v == null ? d : v;
  }
  for (const k of Object.keys(o || {})) if (!(k in defaults) && k !== "type") errs.push(`${path}.${k}: not a setting here (allowed: ${Object.keys(defaults).join(", ")})`);
  return out;
};

// a shape object → a complete shape with defaults, or null + an error
export function normaliseShape(s, path, errs) {
  if (s == null) return null;
  if (typeof s === "string") s = { type: s };
  if (typeof s !== "object" || !SHAPES[s.type]) { errs.push(`${path}: unknown shape "${s?.type}" (one of ${Object.keys(SHAPES).join(", ")})`); return null; }
  const out = { type: s.type, ...fill(s, SHAPES[s.type], path, errs) };
  if (out.type === "text") out.text = String(out.text).slice(0, 40) || "assembl";
  if (out.type === "sdf") out.ops = (Array.isArray(out.ops) ? out.ops : []).slice(0, 6).map((op) => ({ shape: ["sphere", "box", "torus"].includes(op?.shape) ? op.shape : "sphere", op: ["union", "subtract", "intersect"].includes(op?.op) ? op.op : "union", at: vec(op?.at, [0, 0.5, 0]), r: num(op?.r, 0.5), tube: num(op?.tube, 0.15), size: vec(op?.size, [0.5, 0.5, 0.5]) }));
  return out;
}

// any object the code returned → a complete, valid spec plus a list of problems (the scene still runs on what was valid)
export function normalise(raw) {
  const errs = [];
  if (!raw || typeof raw !== "object") return { spec: normalise({}).spec, errs: ["the code must return (export default) a design object"] };
  const spec = {
    name: String(raw.name ?? "Untitled").slice(0, 60),
    seed: Math.floor(num(raw.seed, 1)) >>> 0,
    budget: raw.budget === "auto" || raw.budget == null ? "auto" : Math.max(1024, Math.min(2 ** 21, Math.floor(num(raw.budget, 0)) || 1024)),
    emitters: [], fields: [],
    look: fill(raw.look, LOOK, "look", errs), camera: fill(raw.camera, CAMERA, "camera", errs), timeline: fill(raw.timeline, TIMELINE, "timeline", errs),
  };
  const ems = Array.isArray(raw.emitters) ? raw.emitters : raw.emitters ? [raw.emitters] : [];
  if (ems.length > MAX_EMITTERS) errs.push(`emitters: at most ${MAX_EMITTERS} (the rest are ignored)`);
  ems.slice(0, MAX_EMITTERS).forEach((e, i) => {
    const path = `emitters[${i}]`, shape = normaliseShape(e?.shape ?? e?.type ?? "sphere", path + ".shape", errs);
    if (!shape) return; const o = fill(e, { ...EMITTER, shape: null }, path, errs); o.shape = shape;
    o.share = Math.max(0.01, Math.min(1, o.share)); o.rate = Math.max(0, Math.min(1, o.rate)); o.burst = o.burst ? 1 : 0;
    if (Array.isArray(e?.life)) o.life = [Math.max(0.05, num(e.life[0], 1)), Math.max(0.05, num(e.life[1], num(e.life[0], 1)))]; else o.life = o.life > 0 ? [o.life, o.life] : 0;
    spec.emitters.push(o);
  });
  if (!spec.emitters.length) { spec.emitters.push({ ...EMITTER, shape: normaliseShape("sphere", "", errs) }); if (ems.length) errs.push("no emitter could be read, so a sphere is standing in"); }
  const tot = spec.emitters.reduce((s, e) => s + e.share, 0); spec.emitters.forEach((e) => (e.share = e.share / tot));
  const fs = Array.isArray(raw.fields) ? raw.fields : [];
  if (fs.length > MAX_FIELDS) errs.push(`fields: at most ${MAX_FIELDS} (the rest are ignored)`);
  fs.slice(0, MAX_FIELDS).forEach((f, i) => {
    const path = `fields[${i}]`; if (typeof f === "string") f = { type: f };
    if (!f || !FIELDS[f.type]) { errs.push(`${path}: unknown field "${f?.type}" (one of ${Object.keys(FIELDS).join(", ")})`); return; }
    spec.fields.push({ type: f.type, ...fill(f, FIELDS[f.type], path, errs) });
  });
  spec.look.bloom = clamp(spec.look.bloom, 0, 1.5); spec.look.exposure = clamp(spec.look.exposure, 0.3, 2.2); spec.look.size = clamp(spec.look.size, 0.3, 3);
  spec.look.iridescence = clamp(spec.look.iridescence, 0, 1); spec.look.sparkle = clamp(spec.look.sparkle, 0, 0.08); spec.look.trails = clamp(spec.look.trails, 0, 0.97); spec.look.depthFade = clamp(spec.look.depthFade, 0, 1);
  if (spec.look.sparkle > 0.03) errs.push("look.sparkle: the standard keeps sparkles to 1.5–2.5%; above 3% they stop reading as sparkles (allowed, noted)");
  spec.camera.distance = clamp(spec.camera.distance, 0.8, 12); spec.camera.fov = clamp(spec.camera.fov, 12, 80); spec.camera.pitch = clamp(spec.camera.pitch, -1.3, 1.3); spec.camera.drift = clamp(spec.camera.drift, 0, 1);
  if (!CAMERA_PATHS.includes(spec.camera.path)) { errs.push(`camera.path: "${spec.camera.path}" is not one of ${CAMERA_PATHS.join(", ")}`); spec.camera.path = "none"; }
  spec.timeline.seconds = clamp(spec.timeline.seconds, 1, 60); spec.timeline.loop = spec.timeline.loop ? 1 : 0;
  const keys = (Array.isArray(spec.timeline.keys) ? spec.timeline.keys : []).map((k, i) => ({ at: clamp(num(k?.at, i / Math.max(1, spec.timeline.keys.length)), 0, 1), target: normaliseShape(k?.target, `timeline.keys[${i}].target`, errs) })).sort((a, b) => a.at - b.at);
  spec.timeline.keys = keys.length ? keys.slice(0, 8) : [{ at: 0, target: null }];
  return { spec, errs };
}
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// ------------------------------------------------------------------------------------------------ spec → code
const fmt = (v) => (Number.isInteger(v) ? String(v) : String(+v.toFixed(4)));
function lit(v, depth = 0) {
  if (v == null) return "null";
  if (typeof v === "number") return fmt(v);
  if (typeof v === "string") return JSON.stringify(v);
  if (Array.isArray(v)) return v.every((x) => typeof x === "number") ? `[${v.map(fmt).join(", ")}]` : `[${v.map((x) => lit(x, depth + 1)).join(", ")}]`;
  const parts = Object.entries(v).filter(([, x]) => x !== undefined).map(([k, x]) => `${/^[a-z_$][\w$]*$/i.test(k) ? k : JSON.stringify(k)}: ${lit(x, depth + 1)}`);
  return `{ ${parts.join(", ")} }`;
}
const dropDefaults = (o, defaults) => Object.fromEntries(Object.entries(o).filter(([k, v]) => JSON.stringify(v) !== JSON.stringify(defaults[k])));
const shapeLit = (s) => (s == null ? "null" : lit({ type: s.type, ...dropDefaults(s, { ...SHAPES[s.type], type: s.type }) }));

export function toCode(spec) {
  const L = [];
  L.push("// Particle Studio design · assembl lab. The design is this object: change a number and the scene follows.");
  L.push("// Shapes: " + Object.keys(SHAPES).join(", ") + ".");
  L.push("// Fields: " + Object.keys(FIELDS).join(", ") + ". The API drawer lists every setting.");
  L.push("export default {");
  L.push(`  name: ${JSON.stringify(spec.name)},`);
  L.push(`  seed: ${spec.seed},`);
  L.push(`  budget: ${spec.budget === "auto" ? '"auto"' : spec.budget},`);
  L.push("  emitters: [");
  for (const e of spec.emitters) {
    const rest = dropDefaults({ share: +e.share.toFixed(3), rate: e.rate, life: e.life ? (e.life[0] === e.life[1] ? e.life[0] : e.life) : 0, jitter: e.jitter, burst: e.burst, speed: e.speed }, EMITTER);
    if (spec.emitters.length === 1) delete rest.share;
    L.push(`    { shape: ${shapeLit(e.shape)}${Object.keys(rest).length ? ", " + lit(rest).slice(2, -2) : ""} },`);
  }
  L.push("  ],");
  L.push("  fields: [");
  for (const f of spec.fields) L.push(`    ${lit({ type: f.type, ...dropDefaults(f, { ...FIELDS[f.type], type: f.type }) })},`);
  L.push("  ],");
  L.push(`  look: ${lit(spec.look)},`);
  L.push(`  camera: ${lit(spec.camera)},`);
  L.push(`  timeline: { seconds: ${fmt(spec.timeline.seconds)}, loop: ${spec.timeline.loop}, keys: [`);
  for (const k of spec.timeline.keys) L.push(`    { at: ${fmt(k.at)}, target: ${shapeLit(k.target)} },`);
  L.push("  ] },");
  L.push("};");
  return L.join("\n") + "\n";
}

// ------------------------------------------------------------------------------------------------ code → spec
// The studio API the code can use. Pure helpers only: no DOM, no network, no timers.
export function makeApi() {
  const shape = Object.fromEntries(Object.keys(SHAPES).map((t) => [t, (o = {}) => ({ type: t, ...o })]));
  const field = Object.fromEntries(Object.keys(FIELDS).map((t) => [t, (o = {}) => ({ type: t, ...o })]));
  const rng = (seed = 1) => { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const range = (n, fn) => Array.from({ length: Math.max(0, Math.min(64, n | 0)) }, (_, i) => fn(i, n));
  return Object.freeze({ shape, field, rng, range, lerp: (a, b, t) => a + (b - a) * t, clamp, TAU: Math.PI * 2, PI: Math.PI, shapes: Object.keys(SHAPES), fields: Object.keys(FIELDS), paths: CAMERA_PATHS, Math });
}
// names the code is not allowed to reach: each is a parameter of the sandbox function, so inside the code it is undefined
const SHADOW = ["window", "self", "globalThis", "document", "fetch", "XMLHttpRequest", "WebSocket", "navigator", "location", "history", "localStorage", "sessionStorage", "indexedDB", "caches", "importScripts", "Worker", "SharedWorker", "ServiceWorker", "Function", "setTimeout", "setInterval", "requestAnimationFrame", "queueMicrotask", "Image", "Audio", "open", "alert", "prompt", "confirm", "parent", "top", "frames", "postMessage", "crypto", "performance", "console"];

// run the module text in a scope that sees only `studio`. Returns { spec, errs, line } or throws nothing.
export function runCode(code, api = makeApi()) {
  const src = String(code).replace(/^\s*export\s+default\s+/m, "return ");
  if (/\bimport\s*\(|\bimport\s+[\w{*]/.test(src)) return { spec: null, errs: ["imports are not available in a design; everything the code needs is on `studio`"], line: lineOf(src, /\bimport\b/) };
  // the scope sees only `studio`; the few doors out of a strict function are closed by name
  const door = /\beval\s*\(|\.constructor\b|\bglobalThis\b|\bwindow\b|\bdocument\b|\bfetch\s*\(/.exec(src);
  if (door) return { spec: null, errs: [`"${door[0].trim()}" is not available in a design: the code sees only \`studio\` (no page, no network)`], line: lineOf(src, door[0]) };
  let fn;
  try { fn = new Function("studio", ...SHADOW, '"use strict";\n' + src); }
  catch (e) { return { spec: null, errs: [`Syntax: ${e.message}`], line: syntaxLine(src) }; }
  let raw;
  try { raw = fn(api); }
  catch (e) { const m = /<anonymous>:(\d+):(\d+)/.exec(e.stack || ""); return { spec: null, errs: [`${e.name}: ${e.message}`], line: m ? Math.max(1, +m[1] - 2) : null }; }
  if (typeof raw === "function") { try { raw = raw(api); } catch (e) { return { spec: null, errs: [`${e.name}: ${e.message}`], line: null }; } }
  const { spec, errs } = normalise(raw);
  return { spec, errs, line: null };
}
const lineOf = (src, re) => { const i = typeof re === "string" ? src.indexOf(re) : src.search(re); return i < 0 ? null : src.slice(0, i).split("\n").length; };
// V8 gives a syntax error no position: compile growing prefixes and report the first line whose error is not "unexpected end"
function syntaxLine(src) {
  const lines = src.split("\n");
  for (let k = 1; k <= lines.length; k++) {
    try { new Function(lines.slice(0, k).join("\n")); return k === lines.length ? null : null; }
    catch (e) { if (!/end of input|Unexpected end/i.test(e.message)) return k; }
  }
  return lines.length;
}

// a stable key for a shape (texture caching) and the deep copy the panel edits
export const shapeKey = (s) => JSON.stringify(s);
export const clone = (o) => JSON.parse(JSON.stringify(o));

// edit one number in the code text in place when it is written plainly (keeps hand-written code intact); null when it is not found
export function patchNumber(code, path, value) {
  // path like ["look","bloom"] or ["fields",2,"strength"] or ["fields",2,"at",1]
  const lines = code.split("\n"); const v = fmt(value);
  const [top, ...rest] = path;
  if (top === "look" || top === "camera") {
    const re = new RegExp(`(\\b${top}\\s*:\\s*\\{[^}]*\\b${rest[0]}\\s*:\\s*)(-?[\\d.]+)`); const m = re.exec(code); if (!m) return null;
    return code.slice(0, m.index + m[1].length) + v + code.slice(m.index + m[0].length);
  }
  if (top === "timeline" && rest[0] === "seconds") { const m = /(\btimeline\s*:\s*\{[^}]*?\bseconds\s*:\s*)(-?[\d.]+)/.exec(code); return m ? code.slice(0, m.index + m[1].length) + v + code.slice(m.index + m[0].length) : null; }
  if (top === "fields" || top === "emitters") {
    // the n-th object line inside the array
    const start = lines.findIndex((l) => new RegExp(`^\\s*${top}\\s*:\\s*\\[`).test(l)); if (start < 0) return null;
    let n = -1;
    for (let i = start + 1; i < lines.length; i++) {
      if (/^\s*\],?\s*$/.test(lines[i])) break; if (!/^\s*\{/.test(lines[i])) continue; n++;
      if (n !== rest[0]) continue;
      const key = rest[1], idx = rest[2];
      if (idx == null) { const re = new RegExp(`(\\b${key}\\s*:\\s*)(-?[\\d.]+)`); const m = re.exec(lines[i]); if (!m) return null; lines[i] = lines[i].slice(0, m.index + m[1].length) + v + lines[i].slice(m.index + m[0].length); return lines.join("\n"); }
      const re = new RegExp(`(\\b${key}\\s*:\\s*\\[)([^\\]]*)(\\])`); const m = re.exec(lines[i]); if (!m) return null;
      const parts = m[2].split(",").map((s) => s.trim()); if (parts.length <= idx) return null; parts[idx] = v;
      lines[i] = lines[i].slice(0, m.index) + m[1] + parts.join(", ") + m[3] + lines[i].slice(m.index + m[0].length); return lines.join("\n");
    }
  }
  return null;
}
