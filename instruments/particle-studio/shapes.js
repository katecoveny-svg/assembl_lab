// Particle Studio · shapes → points. Every emitter and every morph target is a shape sampled on the CPU once (when the design
// changes), as a form in the shared engine's format (pos, light 0–1, kind), then packed into a texture for the GPU simulation.
// The light each point carries follows the engine's rule (lightFor: the normal against the key light, edges and rims brighter,
// darker toward the ground), so a design baked out of the studio shades exactly as the rest of the lab.
import * as THREE from "three";
import { makeForm, resample, normalise, lightFor, imageForm, objectForm, KIND, rng } from "/lab/pc/engine.js";
import { markForm } from "/lab/pc/forms.js";
import { aucklandForm } from "/lab/pc/auckland.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const V = THREE.Vector3;
const put = (f, k, x, y, z, L, kind) => { f.pos[k * 3] = x; f.pos[k * 3 + 1] = y; f.pos[k * 3 + 2] = z; f.light[k] = L; f.kind[k] = kind; };
const n3 = new V(), tmp = new V();
const light = (nx, ny, nz, edge = 0, h = 0.6) => lightFor(n3.set(nx, ny, nz).normalize(), edge, h);
// rotate about x by `tilt` (a ring or disc laid flat, a sheet leaning back) then offset
const place = (f, at, tilt = 0) => { const c = Math.cos(tilt), s = Math.sin(tilt); for (let i = 0; i < f.n; i++) { const x = f.pos[i * 3], y = f.pos[i * 3 + 1], z = f.pos[i * 3 + 2]; f.pos[i * 3] = x + at[0]; f.pos[i * 3 + 1] = c * y - s * z + at[1]; f.pos[i * 3 + 2] = s * y + c * z + at[2]; } return f; };
// a baked or image form, sized so its larger side is `size`, its middle lifted to sit in the camera's view
const centre = (f, size, y = 0.5) => { normalise(f, size, { ground: false }); for (let i = 0; i < f.n; i++) f.pos[i * 3 + 1] += y; for (const k in f.anchors) f.anchors[k][1] += y; return f; };

// the shapes the GPU cannot sample on its own: sampled here into `n` points
const samplers = {
  point(s, n, r) { const f = makeForm(n); for (let i = 0; i < n; i++) { const th = r() * 6.2832, ph = Math.acos(2 * r() - 1), R = s.spread * Math.cbrt(r()); put(f, i, Math.sin(ph) * Math.cos(th) * R, Math.cos(ph) * R, Math.sin(ph) * Math.sin(th) * R, 0.55 + 0.4 * r(), KIND.highlight); } f.anchors = { centre: [0, 0, 0] }; return place(f, s.at); },
  line(s, n, r) { const f = makeForm(n), d = [s.to[0] - s.from[0], s.to[1] - s.from[1], s.to[2] - s.from[2]]; for (let i = 0; i < n; i++) { const t = r(), j = s.thickness; put(f, i, s.from[0] + d[0] * t + (r() - 0.5) * j, s.from[1] + d[1] * t + (r() - 0.5) * j, s.from[2] + d[2] * t + (r() - 0.5) * j, 0.45 + 0.4 * Math.sin(t * 3.1416), KIND.edge); } f.anchors = { from: s.from.slice(), to: s.to.slice() }; return f; },
  ring(s, n, r) { const f = makeForm(n); for (let i = 0; i < n; i++) { const a = r() * 6.2832, R = s.radius + (r() - 0.5) * s.thickness, y = (r() - 0.5) * s.thickness; put(f, i, Math.cos(a) * R, y, Math.sin(a) * R, light(Math.cos(a), 0.6, Math.sin(a), 0.5, 0.7), KIND.edge); } f.anchors = { centre: [0, 0, 0] }; return place(f, s.at, s.tilt); },
  disc(s, n, r) { const f = makeForm(n); for (let i = 0; i < n; i++) { const a = r() * 6.2832, R = s.radius * Math.sqrt(r()); put(f, i, Math.cos(a) * R, 0, Math.sin(a) * R, light(0, 1, 0, Math.pow(R / s.radius, 8) * 0.6, 0.6) * (0.75 + 0.25 * R / s.radius), R > s.radius * 0.985 ? KIND.edge : KIND.surface); } f.anchors = { centre: [0, 0, 0] }; return place(f, s.at, s.tilt); },
  sphere(s, n, r) { const f = makeForm(n); for (let i = 0; i < n; i++) { const th = r() * 6.2832, ph = Math.acos(2 * r() - 1), R = s.radius * (s.shell ? 1 : Math.cbrt(r())), x = Math.sin(ph) * Math.cos(th), y = Math.cos(ph), z = Math.sin(ph) * Math.sin(th); put(f, i, x * R, y * R, z * R, light(x, y, z, 0, 0.5 + 0.5 * y), KIND.surface); } f.anchors = { top: [0, s.radius, 0], centre: [0, 0, 0] }; return place(f, s.at); },
  box(s, n, r) {
    const f = makeForm(n), [w, h, d] = s.size, faces = [[w, h, d, 0], [w, h, d, 1], [w, h, d, 2]], area = [h * d, w * d, w * h], tot = 2 * (area[0] + area[1] + area[2]);
    for (let i = 0; i < n; i++) {
      let x = (r() - 0.5) * w, y = (r() - 0.5) * h, z = (r() - 0.5) * d, nx = 0, ny = 0, nz = 0, edge = 0;
      if (s.shell || h < 1e-4) { let u = r() * tot, a = 0; while (a < 2 && u > 2 * area[a]) { u -= 2 * area[a]; a++; } const sgn = u < area[a] ? 1 : -1; if (a === 0) { x = sgn * w / 2; nx = sgn; } else if (a === 1) { y = sgn * h / 2; ny = sgn; } else { z = sgn * d / 2; nz = sgn; }
        const ex = 1 - Math.min(1, (w / 2 - Math.abs(x)) / (0.03 * w + 1e-6)), ey = 1 - Math.min(1, (h / 2 - Math.abs(y)) / (0.03 * h + 1e-6)), ez = 1 - Math.min(1, (d / 2 - Math.abs(z)) / (0.03 * d + 1e-6)); edge = Math.max(a === 0 ? Math.max(ey, ez) : a === 1 ? Math.max(ex, ez) : Math.max(ex, ey), 0) * 0.7; }
      else { nx = x / w; ny = y / h; nz = z / d; }
      if (h < 1e-4) { ny = 1; nx = nz = 0; }
      put(f, i, x, y, z, light(nx, ny, nz, edge, 0.5 + y / Math.max(h, 1e-4) * 0.5), edge > 0.5 ? KIND.edge : KIND.surface);
    }
    f.anchors = { top: [0, h / 2, 0], centre: [0, 0, 0] }; return place(f, s.at);
  },
  torus(s, n, r) { const f = makeForm(n); for (let i = 0; i < n; i++) { const a = r() * 6.2832, b = r() * 6.2832, cx = Math.cos(a), sz = Math.sin(a), nx = cx * Math.cos(b), ny = Math.sin(b), nz = sz * Math.cos(b); put(f, i, cx * s.radius + nx * s.tube, ny * s.tube, sz * s.radius + nz * s.tube, light(nx, ny, nz, Math.pow(Math.abs(Math.cos(b)), 10) * 0.4, 0.5 + 0.5 * ny), KIND.surface); } f.anchors = { centre: [0, 0, 0] }; return place(f, s.at); },
  spiral(s, n, r) { const f = makeForm(n); for (let i = 0; i < n; i++) { const t = Math.pow(r(), 0.65), arm = Math.floor(r() * s.arms), a = arm / s.arms * 6.2832 + t * s.twist + (r() - 0.5) * (0.25 + 1.1 * (1 - t)) * 0.9, R = t * s.radius, th = s.thickness * (1 - 0.7 * t) * (r() - 0.5) * 2; put(f, i, Math.cos(a) * R, th + (r() - 0.5) * s.thickness * 0.4, Math.sin(a) * R, Math.min(1, 0.22 + 0.9 * Math.pow(1 - t, 1.6) + 0.12 * r()), t < 0.12 ? KIND.highlight : KIND.surface); } f.anchors = { core: [0, 0, 0] }; return place(f, s.at); },
  sheet(s, n, r) { const f = makeForm(n), [w, h] = s.size; for (let i = 0; i < n; i++) { const u = r(), v = r(), x = (u - 0.5) * w, y = (v - 0.5) * h, e = Math.max(Math.pow(Math.abs(u - 0.5) * 2, 14), Math.pow(Math.abs(v - 0.5) * 2, 14)); put(f, i, x, y, 0, light(0, 0.3, 1, e * 0.6, 0.4 + 0.6 * v), e > 0.5 ? KIND.edge : KIND.surface); } f.anchors = { top: [0, h / 2, 0], centre: [0, 0, 0] }; return place(f, s.at, s.tilt); },
  scatter(s, n, r) { const f = makeForm(n); for (let i = 0; i < n; i++) { const th = r() * 6.2832, ph = Math.acos(2 * r() - 1), R = s.radius * (0.55 + 0.45 * Math.cbrt(r())); put(f, i, Math.sin(ph) * Math.cos(th) * R, Math.cos(ph) * R * 0.6, Math.sin(ph) * Math.sin(th) * R, 0.1 + 0.25 * r(), KIND.surface); } f.anchors = { centre: [0, 0, 0] }; return place(f, s.at); },
  mark(s, n, r) { const f = markForm(n, { seed: 4 }); if (!s.dot) for (let i = 0; i < n; i++) if (f.kind[i] === KIND.highlight) { f.light[i] = 0.5; f.kind[i] = KIND.surface; } return centre(f, s.size, 0.55); },
  sdf(s, n, r) {
    // signed distance of the composed primitives; points sampled by rejection on the shell (|d| < shell) or inside (d < 0)
    const dist = (x, y, z) => { let d = Infinity; for (const o of s.ops) { let q; const px = x - o.at[0], py = y - o.at[1], pz = z - o.at[2];
      if (o.shape === "sphere") q = Math.hypot(px, py, pz) - o.r; else if (o.shape === "torus") q = Math.hypot(Math.hypot(px, pz) - o.r, py) - o.tube;
      else { const qx = Math.abs(px) - o.size[0] / 2, qy = Math.abs(py) - o.size[1] / 2, qz = Math.abs(pz) - o.size[2] / 2; q = Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0); }
      d = o.op === "subtract" ? Math.max(d, -q) : o.op === "intersect" ? Math.max(d, q) : Math.min(d, q); } return d; };
    const b = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
    for (const o of s.ops) { const e = o.shape === "box" ? Math.max(...o.size) / 2 : o.r + (o.tube || 0); for (let a = 0; a < 3; a++) { b[a] = Math.min(b[a], o.at[a] - e); b[a + 3] = Math.max(b[a + 3], o.at[a] + e); } }
    const f = makeForm(n), shell = Math.max(0.004, s.shell), eps = 0.002; let k = 0, tries = 0;
    while (k < n && tries < n * 60) { tries++; const x = b[0] + (b[3] - b[0]) * r(), y = b[1] + (b[4] - b[1]) * r(), z = b[2] + (b[5] - b[2]) * r(), d = dist(x, y, z);
      if (s.shell > 0 ? Math.abs(d) > shell : d > 0) continue;
      const nx = dist(x + eps, y, z) - d, ny = dist(x, y + eps, z) - d, nz = dist(x, y, z + eps) - d;
      put(f, k++, x, y, z, light(nx, ny, nz, 0, (y - b[1]) / Math.max(b[4] - b[1], 1e-6)), KIND.surface); }
    if (k < n) { if (!k) put(f, k++, 0, 0.5, 0, 0.5, 0); for (; k < n; k++) { const j = Math.floor(r() * k); put(f, k, f.pos[j * 3], f.pos[j * 3 + 1], f.pos[j * 3 + 2], f.light[j], f.kind[j]); } }
    f.anchors = { centre: [(b[0] + b[3]) / 2, (b[1] + b[4]) / 2, (b[2] + b[5]) / 2] }; return centre(f, s.size, 0.5);
  },
};

// text, rendered in Instrument Sans on a plum field and read as an image (luminance + Sobel, the standard's image rule)
async function textForm(s, n) {
  try { await document.fonts.load(`${s.weight} 200px "Instrument Sans"`); } catch {}
  const cv = document.createElement("canvas"), g = cv.getContext("2d"); const font = `${s.weight} 200px "Instrument Sans", system-ui, sans-serif`; g.font = font;
  const w = Math.min(4000, Math.ceil(g.measureText(s.text).width) + 80), h = 280; cv.width = w; cv.height = h;
  g.fillStyle = "#21121F"; g.fillRect(0, 0, w, h); g.font = font; g.fillStyle = "#F9F6F2"; g.textBaseline = "middle"; g.fillText(s.text, 40, h / 2 + 8);
  const f = imageForm(cv, n, { maxSide: 900, depth: s.depth * 2, seed: 7 }); f.anchors = { middle: [0, 0, 0] }; return centre(f, s.size, 0.5);
}
export function imageFormFrom(img, s, n) { const f = imageForm(img, n, { maxSide: 460, depth: s.depth, seed: 7 }); return centre(f, s.size, 0.5); }
export async function meshFormFrom(bytesOrScene, s, n) {
  let root = bytesOrScene; if (!root.isObject3D) root = (await new GLTFLoader().parseAsync(bytesOrScene, "")).scene;
  const f = objectForm(root, n, { edgeShare: s.edges, groundShare: 0.05 }); normalise(f, s.size); return f;
}

// the studio's dropped files (images, GLBs) live only in memory, here, and never in the code or a link
export const dropped = { image: null, mesh: null, flow: null };

// one shape → exactly n points, as a form (cached by the caller)
export async function sampleShape(s, n, seed = 11) {
  const r = rng(seed + 17);
  let f;
  if (samplers[s.type]) f = samplers[s.type](s, n, r);
  else if (s.type === "text") f = await textForm(s, n);
  else if (s.type === "image") f = dropped.image ? imageFormFrom(dropped.image, s, n) : samplers.sheet({ ...SHEET_STANDIN, size: [s.size, s.size * 0.62] }, n, r);
  else if (s.type === "mesh") f = dropped.mesh ? await meshFormFrom(dropped.mesh, s, n) : samplers.torus({ radius: s.size * 0.33, tube: s.size * 0.12, at: [0, 0.5, 0] }, n, r);
  else if (s.type === "auckland") { try { f = await aucklandForm(Math.min(n, s.points)); normalise(f, s.size); f.height = undefined; } catch (e) { console.warn("Auckland points:", e.message); f = samplers.ring({ radius: s.size * 0.4, at: [0, 0.3, 0], thickness: 0.03, tilt: 0 }, n, r); } }
  else f = samplers.sphere({ radius: 0.7, at: [0, 0.5, 0], shell: 1 }, n, r);
  if (f.n !== n) f = resample(f, n, seed);
  return f;
}
const SHEET_STANDIN = { at: [0, 0.6, 0], tilt: 0 };
export const shapeNeedsDrop = (s) => (s.type === "image" && !dropped.image) || (s.type === "mesh" && !dropped.mesh);
