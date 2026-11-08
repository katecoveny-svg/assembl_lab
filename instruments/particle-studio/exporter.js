// Particle Studio · exports. Everything here is made in the browser and handed to the maker as a download or a link; nothing is
// sent anywhere. The engine export bakes one frame into the lab's compact points file (the format lab/pc/auckland.js reads:
// a binary of u16 positions and u8 light/kind, here with part and phase too, plus a JSON header with bounds and anchors) and a JS
// form module that reads it with makeForm, so a design can drop into lab/pc/forms.js-style code.
import { makeForm, normalise, KIND } from "/lab/pc/engine.js";

export function download(blob, name) { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); }
export const slug = (s) => (s || "design").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "design";

// --- the current particle state → a form in the engine's units (the larger of width and depth = `size`, the base on y = 0)
export function bakeForm(state, { count = 300000, size = 2.1, anchors = {}, seed = 3 } = {}) {
  const { pos, vel, emit, n } = state, alive = [];
  for (let i = 0; i < n; i++) { const age = pos[i * 4 + 3]; if (age < 0) continue; if (age !== 0.5 && (age < 0.06 || age > 0.86)) continue; if (!isFinite(pos[i * 4]) || !isFinite(pos[i * 4 + 1]) || !isFinite(pos[i * 4 + 2])) continue; alive.push(i); }
  // a fair subset: a stride through the texture (particles are laid out by emitter, so stride, do not truncate)
  const want = Math.min(count, alive.length), f = makeForm(want); f.part = new Float32Array(want); f.phase = new Float32Array(want);
  let s = (seed * 2654435761) >>> 0; const r = () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  for (let k = 0; k < want; k++) {
    const i = alive[Math.min(alive.length - 1, Math.floor((k + r()) * alive.length / want))], w = emit[i * 4 + 3], part = Math.floor(w / 8), kind = Math.floor((w - part * 8) / 2);
    f.pos[k * 3] = pos[i * 4]; f.pos[k * 3 + 1] = pos[i * 4 + 1]; f.pos[k * 3 + 2] = pos[i * 4 + 2];
    f.light[k] = Math.min(1, Math.max(0, vel[i * 4 + 3])); f.kind[k] = kind; f.part[k] = part; f.phase[k] = pos[i * 4 + 3] === 0.5 ? 0 : pos[i * 4 + 3];
  }
  f.anchors = Object.fromEntries(Object.entries(anchors).map(([k, v]) => [k, v.slice()]));
  if (want) normalise(f, size);
  return f;
}

// --- a form → the compact points file: { bin: ArrayBuffer, header: object }
export function encodePoints(f, meta = {}) {
  const b = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
  for (let i = 0; i < f.n; i++) for (let a = 0; a < 3; a++) { const v = f.pos[i * 3 + a]; if (v < b[a]) b[a] = v; if (v > b[a + 3]) b[a + 3] = v; }
  if (!isFinite(b[0])) b.fill(0);
  const stride = 10, buf = new ArrayBuffer(f.n * stride), v = new DataView(buf), q = (x, lo, hi) => Math.round(Math.min(65535, Math.max(0, ((x - lo) / Math.max(hi - lo, 1e-9)) * 65535)));
  const kinds = { surface: 0, edge: 0, ground: 0, highlight: 0 }, names = Object.keys(KIND);
  for (let i = 0; i < f.n; i++) {
    const o = i * stride; v.setUint16(o, q(f.pos[i * 3], b[0], b[3]), true); v.setUint16(o + 2, q(f.pos[i * 3 + 1], b[1], b[4]), true); v.setUint16(o + 4, q(f.pos[i * 3 + 2], b[2], b[5]), true);
    v.setUint8(o + 6, Math.round(f.light[i] * 255)); v.setUint8(o + 7, f.kind[i]); v.setUint8(o + 8, f.part ? f.part[i] : 0); v.setUint8(o + 9, Math.round((f.phase ? f.phase[i] : 0) * 255));
    kinds[names[f.kind[i]] || "surface"]++;
  }
  const header = {
    format: "assembl-points/1", count: f.n, stride,
    layout: "x:u16 y:u16 z:u16 light:u8 kind:u8 part:u8 phase:u8, little-endian, interleaved; a fair random order (any prefix is a fair sample)",
    fields: ["x", "y", "z", "light", "kind", "part", "phase"],
    bounds: { x: [b[0], b[3]], y: [b[1], b[4]], z: [b[2], b[5]] }, kinds,
    units: `engine units: the larger of width and depth is ${meta.size ?? 2.1}; the base sits on y = 0`,
    anchors: Object.fromEntries(Object.entries(f.anchors || {}).map(([k, a]) => [k, a.map((x) => +x.toFixed(4))])),
    source: { tool: "assembl lab · Particle Studio", kind: "one frame of a particle simulation, not the live system", name: meta.name, seed: meta.seed, frame: meta.frame ?? null, built: new Date().toISOString().slice(0, 10) },
  };
  return { bin: buf, header };
}

// --- the file back into a form (the same reading as lab/pc/auckland.js, so the preview shows the file, not the studio's memory)
export function decodePoints(buf, h, n = h.count) {
  const got = Math.min(n, Math.floor(buf.byteLength / h.stride)), v = new DataView(buf), f = makeForm(got), [x0, x1] = h.bounds.x, [y0, y1] = h.bounds.y, [z0, z1] = h.bounds.z, q = 1 / 65535;
  f.part = new Float32Array(got);
  for (let i = 0; i < got; i++) {
    const o = i * h.stride;
    f.pos[i * 3] = x0 + (x1 - x0) * v.getUint16(o, true) * q; f.pos[i * 3 + 1] = y0 + (y1 - y0) * v.getUint16(o + 2, true) * q; f.pos[i * 3 + 2] = z0 + (z1 - z0) * v.getUint16(o + 4, true) * q;
    f.light[i] = v.getUint8(o + 6) / 255; f.kind[i] = v.getUint8(o + 7); if (h.stride >= 9) f.part[i] = v.getUint8(o + 8);
  }
  f.anchors = Object.fromEntries(Object.entries(h.anchors || {}).map(([k, a]) => [k, a.slice()])); f.height = y1;
  return f;
}

// --- the JS form module: reads the baked file with makeForm, lab/pc/auckland.js style, with the design's anchors
export function formModule(name, header, { pair = false } = {}) {
  const id = slug(name), fn = id.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase()).replace(/^[^a-z_$]/i, "f$&");
  const anchors = JSON.stringify(header.anchors || {});
  return `// assembl lab · "${name}" as a point-cloud form, baked by Particle Studio (one frame of the design, not the live simulation).
// Reads ${id}-points.{json,bin}: ${header.layout}
// Drop this beside lab/pc/forms.js and use it like any form: engine.setForm(await ${fn}Form(engine.N)).
import { makeForm } from "./engine.js";

const BASE = "/assets/models/particle-studio/${id}-points";
export async function ${fn}Form(n = ${header.count}${pair ? ', which = "a"' : ""}) {
  const h = await (await fetch(BASE + ${pair ? '(which === "b" ? "-b" : "") + ' : ""}".json")).json(), want = Math.min(n, h.count);
  const r = await fetch(BASE + ${pair ? '(which === "b" ? "-b" : "") + ' : ""}".bin", { headers: want < h.count ? { Range: \`bytes=0-\${want * h.stride - 1}\` } : {} });
  const buf = await r.arrayBuffer(), got = Math.min(want, Math.floor(buf.byteLength / h.stride)), v = new DataView(buf), f = makeForm(got);
  const [x0, x1] = h.bounds.x, [y0, y1] = h.bounds.y, [z0, z1] = h.bounds.z, q = 1 / 65535;
  f.part = new Float32Array(got);
  for (let i = 0; i < got; i++) {
    const o = i * h.stride;
    f.pos[i * 3] = x0 + (x1 - x0) * v.getUint16(o, true) * q; f.pos[i * 3 + 1] = y0 + (y1 - y0) * v.getUint16(o + 2, true) * q; f.pos[i * 3 + 2] = z0 + (z1 - z0) * v.getUint16(o + 4, true) * q;
    f.light[i] = v.getUint8(o + 6) / 255; f.kind[i] = v.getUint8(o + 7); f.part[i] = v.getUint8(o + 8);
  }
  f.anchors = ${anchors}; f.height = y1;
  return f;
}
`;
}

// --- share links: the whole design, deflated and base64url'd into the hash (a seed alone for a surprise)
const b64u = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64u = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
async function deflate(text) { if (!("CompressionStream" in window)) return null; const cs = new CompressionStream("deflate-raw"); const w = cs.writable.getWriter(); w.write(new TextEncoder().encode(text)); w.close(); return new Uint8Array(await new Response(cs.readable).arrayBuffer()); }
async function inflate(bytes) { const ds = new DecompressionStream("deflate-raw"); const w = ds.writable.getWriter(); w.write(bytes); w.close(); return new TextDecoder().decode(await new Response(ds.readable).arrayBuffer()); }
export async function encodeShare(spec) { const json = JSON.stringify(spec); const z = await deflate(json); return z ? "z=" + b64u(z) : "j=" + b64u(new TextEncoder().encode(json)); }
export async function decodeShare(hash) {
  const h = hash.replace(/^#/, ""); const m = /(?:^|&)(z|j)=([A-Za-z0-9_-]+)/.exec(h); if (!m) return null;
  try { const bytes = unb64u(m[2]); return JSON.parse(m[1] === "z" ? await inflate(bytes) : new TextDecoder().decode(bytes)); } catch { return null; }
}
export const seedFromHash = (hash) => { const m = /(?:^|[#&])seed=(\d+)/.exec(hash); return m ? +m[1] : null; };

// --- a short WebM of the canvas (MediaRecorder); resolves to a Blob
// Frames are requested by hand after each draw (captureStream(0) + requestFrame), so the recording follows the real frame loop
// whatever the browser decides a WebGL canvas has changed. `onFrame` receives the function to call after each draw.
export function recordCanvas(canvas, seconds, { onTick, onFrame } = {}) {
  return new Promise((resolve, reject) => {
    if (!("MediaRecorder" in window) || !canvas.captureStream) return reject(new Error("This browser cannot record a canvas (MediaRecorder is missing)."));
    const stream = canvas.captureStream(0), track = stream.getVideoTracks()[0], mime = ["video/webm;codecs=vp8", "video/webm;codecs=vp9", "video/webm"].find((m) => MediaRecorder.isTypeSupported(m)) || "";
    const rec = new MediaRecorder(stream, { mimeType: mime || undefined, videoBitsPerSecond: 10_000_000 }), chunks = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data); rec.onerror = (e) => reject(e.error || new Error("recording failed"));
    rec.onstop = () => { onFrame?.(null); track.stop(); resolve(new Blob(chunks, { type: mime || "video/webm" })); };
    const request = () => { try { track.requestFrame?.(); } catch {} };
    rec.start(250); onFrame?.(request); request();
    const t0 = performance.now(); const tick = () => { const k = Math.min(1, (performance.now() - t0) / (seconds * 1000)); onTick?.(k); if (k < 1) requestAnimationFrame(tick); else rec.stop(); }; tick();
  });
}
