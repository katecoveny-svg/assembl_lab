// assembl lab · Moving house: the city as a point cloud. Reads the baked map (tools/pointcloud/bake-moving.mjs →
// assets/models/moving/moving-points.{json,bin}: the inner isthmus from open data, plus three street crops) and draws it with the
// assembl point-cloud standard through the shared light pipeline (lab/pc/engine.js: premultiplied additive accumulation, bloom, the
// plum ground, the tone ramp with iridescence on highlights only). On top it draws, from the journey's state (/moving/journey.js,
// "moving:state"): block-level rings for the shortlist, generic-location beacons for each business, the move's arc across the real
// city, and the "Example house, drawn" assembling as move-in readiness over the new street. Callouts are real DOM text tied to their
// anchors by leader lines. Reduced motion: no flights and no sway, every state arrives whole. No WebGL: this file stops and the page
// keeps its still and its text journey.
import * as THREE from "three";
import { createPipeline, GLSL_TONES, rng } from "/lab/pc/engine.js";

const root = document.documentElement, reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const stageEl = document.getElementById("sim"), world = document.querySelector(".mv-world"), canvas = document.getElementById("mv-canvas"), svg = document.querySelector(".mv-leaders"), calloutBox = document.getElementById("mv-callouts");
const BASE = "/assets/models/moving/moving-points";
const phoneish = () => Math.min(innerWidth, innerHeight) < 700;
const wide = () => innerWidth >= 960;

let renderer;
try {
  if (!canvas || !stageEl) throw new Error("no stage");
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, premultipliedAlpha: true, powerPreference: "high-performance", preserveDrawingBuffer: /[?&]still\b/.test(location.search) });
} catch (e) { console.warn("Moving house point cloud unavailable:", e.message); root.classList.add("mv-nogl"); }
if (renderer) start().catch((e) => { console.warn("Moving house point cloud:", e.message); root.classList.remove("mv-on"); root.classList.add("mv-nogl"); });

async function start() {
  root.classList.add("mv-on");
  const PR = Math.min(devicePixelRatio || 1, phoneish() ? 2 : 1.75); renderer.setPixelRatio(PR); renderer.setClearColor("#21121F", 1); renderer.setRenderTarget(null); renderer.clear();
  const BUDGET = phoneish() ? 80000 : 300000, DYN = Math.round(BUDGET * 0.11), BAKED = BUDGET - DYN;
  const h = await fetch(BASE + ".json").then((r) => { if (!r.ok) throw new Error("header " + r.status); return r.json(); });
  const want = Math.min(BAKED, h.count), bytes = want * h.stride;
  const res = await fetch(BASE + ".bin", { headers: want < h.count ? { Range: `bytes=0-${bytes - 1}` } : {} });
  if (!res.ok) throw new Error("points " + res.status);
  const buf = await res.arrayBuffer(), got = Math.min(want, Math.floor(buf.byteLength / h.stride)), dv = new DataView(buf);

  // ---------------------------------------------------------------------------------------------- the points
  const r = rng(11), parts = [];   // dynamic pieces: [x, y, z, light, kind, layer, group, part]
  const add = (x, y, z, l, kind, layer, group, part = 0) => parts.push(x, y, z, l, kind, layer, group, part);
  const [x0, x1] = h.bounds.x, [y0, y1] = h.bounds.y, [z0, z1] = h.bounds.z, q = 1 / 65535;
  // a coarse ground grid from the city's lowest points, so rings and beacons sit on the land
  const G = 160, gridY = new Float32Array(G * G).fill(Infinity), gi = (x, z) => Math.min(G - 1, Math.max(0, Math.floor(((x - x0) / (x1 - x0)) * G))) + Math.min(G - 1, Math.max(0, Math.floor(((z - z0) / (z1 - z0)) * G))) * G;
  const base = new Float32Array(got * 3), bl = new Float32Array(got), bk = new Float32Array(got), blay = new Float32Array(got), bg = new Float32Array(got);
  for (let i = 0; i < got; i++) {
    const o = i * h.stride, x = x0 + (x1 - x0) * dv.getUint16(o, true) * q, y = y0 + (y1 - y0) * dv.getUint16(o + 2, true) * q, z = z0 + (z1 - z0) * dv.getUint16(o + 4, true) * q;
    base[i * 3] = x; base[i * 3 + 1] = y; base[i * 3 + 2] = z; bl[i] = dv.getUint8(o + 6) / 255; bk[i] = dv.getUint8(o + 7); blay[i] = dv.getUint8(o + 8); bg[i] = dv.getUint8(o + 9);
    if (blay[i] === 0 && y > 0.0001) { const k = gi(x, z); if (y < gridY[k]) gridY[k] = y; }
  }
  const groundAt = (x, z) => { const v = gridY[gi(x, z)]; return isFinite(v) ? v : 0.03; };
  const ST = h.streets, PL = h.places;
  const ringAt = { old: ST.old.anchor, b: ST.b.anchor, a: ST.a.anchor, c: h.shortlistC.anchor };
  const RING = { old: 10, b: 11, a: 12, c: 13 }, BEACON = { pm: 20, movers: 21, power: 22, internet: 23 };
  const share = (f) => Math.round(DYN * f);
  // shortlist and home blocks: a ring on the ground about 240 m across the block, a faint disc and a soft beam (never one house)
  for (const [k, g] of Object.entries(RING)) {
    const [cx, , cz] = ringAt[k], R = 0.04, n = share(0.075);
    for (let i = 0; i < n; i++) {
      const u = r(), a = r() * Math.PI * 2;
      if (u < 0.55) { const rr = R * (1 + (r() - 0.5) * 0.04), x = cx + Math.cos(a) * rr, z = cz + Math.sin(a) * rr; add(x, groundAt(x, z) + 0.0012, z, 0.62 + 0.25 * r(), 1, 4, g); }
      else if (u < 0.75) { const rr = R * Math.sqrt(r()), x = cx + Math.cos(a) * rr, z = cz + Math.sin(a) * rr; add(x, groundAt(x, z) + 0.0008, z, 0.28 + 0.1 * r(), 2, 4, g); }
      else { const hh = Math.pow(r(), 1.8) * 0.035, rr = 0.0025 * Math.sqrt(r()); add(cx + Math.cos(a) * rr, groundAt(cx, cz) + hh, cz + Math.sin(a) * rr, 0.85 - hh * 12, 3, 4, g); }
    }
  }
  // businesses at generic locations: a small ground ring, a tall beam and a diamond at its top
  for (const [k, g] of Object.entries(BEACON)) {
    const [cx, , cz] = PL[k].anchor, gy = groundAt(cx, cz), n = share(0.065), H = 0.1;
    for (let i = 0; i < n; i++) {
      const u = r(), a = r() * Math.PI * 2;
      if (u < 0.35) { const rr = 0.024 * (1 + (r() - 0.5) * 0.05); add(cx + Math.cos(a) * rr, gy + 0.001, cz + Math.sin(a) * rr, 0.6 + 0.2 * r(), 1, 4, g); }
      else if (u < 0.8) { const y = Math.pow(r(), 0.9) * H, rr = 0.0018 * Math.sqrt(r()); add(cx + Math.cos(a) * rr, gy + y, cz + Math.sin(a) * rr, 0.55 + 0.4 * (y / H), 3, 4, g); }
      else { const t = r() * 4, e = Math.floor(t), f = t - e, d = 0.007, P = [[d, 0], [0, d], [-d, 0], [0, -d]], A = P[e], B = P[(e + 1) % 4]; add(cx + A[0] + (B[0] - A[0]) * f, gy + H + 0.008 + (A[1] + (B[1] - A[1]) * f) * 1.3, cz + (r() - 0.5) * 0.001, 0.92, 1, 4, g); }
    }
  }
  // the move's arc: t along the curve, a tube of jitter (the shader places it between the two streets)
  { const n = share(0.2); for (let i = 0; i < n; i++) { const t = r(), a = r() * Math.PI * 2, rr = 0.0042 * Math.pow(r(), 1.5); add(t, Math.cos(a) * rr, Math.sin(a) * rr, 0.8 + 0.2 * r(), 1, 5, 30); } }
  // the Example house, drawn (local units: 1 = the house's width). Parts: 0 frame, 1 roof, 2 keys, 3 power, 4 internet, 5 bond
  const HOUSE = { w: 0.5, d: 0.36, wall: 0.42, ridge: 0.72, hover: 0.55 };
  {
    const n = DYN - parts.length / 8, P = { frame: 0.36, roof: 0.22, keys: 0.09, power: 0.11, internet: 0.11, bond: 0.11 };
    const seg = (a, b, m, part, L, kind = 1, j = 0.004) => { for (let i = 0; i < m; i++) { const t = r(); add(a[0] + (b[0] - a[0]) * t + (r() - 0.5) * j, a[1] + (b[1] - a[1]) * t + (r() - 0.5) * j, a[2] + (b[2] - a[2]) * t + (r() - 0.5) * j, L, kind, 6, 40 + part, part); } };
    const quad = (o, u, v, m, part, L) => { for (let i = 0; i < m; i++) { const s = r(), t = r(); add(o[0] + u[0] * s + v[0] * t, o[1] + u[1] * s + v[1] * t, o[2] + u[2] * s + v[2] * t, L, 0, 6, 40 + part, part); } };
    const { w, d, wall, ridge } = HOUSE, X = w, Z = d;
    // frame: the walls' edges dense, the faces faint, windows; the floor outline; a dashed tether down to the street
    const nf = Math.round(n * P.frame), e = Math.round(nf * 0.5);
    const C = [[-X, 0, -Z], [X, 0, -Z], [X, 0, Z], [-X, 0, Z]];
    for (let k = 0; k < 4; k++) { const a = C[k], b = C[(k + 1) % 4]; seg(a, b, e / 16, 0, 0.72); seg([a[0], wall, a[2]], [b[0], wall, b[2]], e / 16, 0, 0.82); seg(a, [a[0], wall, a[2]], e / 16, 0, 0.78); }
    seg([-X, wall, Z], [-X, wall, Z], 1, 0, 0.8);
    // faces: front and right lit by the key light (above, front, left), back and left in shade
    quad([-X, 0, Z], [2 * X, 0, 0], [0, wall, 0], nf * 0.12, 0, 0.5); quad([X, 0, -Z], [0, 0, 2 * Z], [0, wall, 0], nf * 0.08, 0, 0.36);
    quad([-X, 0, -Z], [0, 0, 2 * Z], [0, wall, 0], nf * 0.06, 0, 0.42); quad([-X, 0, -Z], [2 * X, 0, 0], [0, wall, 0], nf * 0.04, 0, 0.28);
    for (const wx of [-0.3, 0.32]) for (const [a, b] of [[[wx - 0.08, 0.16, Z], [wx + 0.08, 0.16, Z]], [[wx - 0.08, 0.32, Z], [wx + 0.08, 0.32, Z]], [[wx - 0.08, 0.16, Z], [wx - 0.08, 0.32, Z]], [[wx + 0.08, 0.16, Z], [wx + 0.08, 0.32, Z]]]) seg(a, b, nf * 0.012, 0, 0.7);
    for (let i = 0; i < nf * 0.1; i++) { const y = -HOUSE.hover + r() * HOUSE.hover; if ((((y * 30) % 1) + 1) % 1 < 0.55) add((r() - 0.5) * 0.008, y, (r() - 0.5) * 0.008, 0.5, 1, 6, 40, 0); }
    // roof: a gable along x, its edges and two sloped faces (the front face lit, the back in shade)
    const nr = Math.round(n * P.roof), R0 = [-X - 0.04, wall, Z + 0.05], R1 = [X + 0.04, wall, Z + 0.05], R2 = [X + 0.04, wall, -Z - 0.05], R3 = [-X - 0.04, wall, -Z - 0.05], K0 = [-X - 0.04, ridge, 0], K1 = [X + 0.04, ridge, 0];
    seg(K0, K1, nr * 0.16, 1, 0.98); seg(R0, R1, nr * 0.1, 1, 0.8); seg(R3, R2, nr * 0.08, 1, 0.66);
    for (const [a, b] of [[R0, K0], [R3, K0], [R1, K1], [R2, K1]]) seg(a, b, nr * 0.05, 1, 0.86);
    quad(R0, [R1[0] - R0[0], 0, 0], [0, ridge - wall, -Z - 0.05], nr * 0.3, 1, 0.66); quad(R3, [R2[0] - R3[0], 0, 0], [0, ridge - wall, Z + 0.05], nr * 0.16, 1, 0.34);
    // keys: the door outline and a key floating in front of it
    const nk = Math.round(n * P.keys), dx = 0.12; seg([dx - 0.06, 0, Z + 0.002], [dx - 0.06, 0.26, Z + 0.002], nk * 0.15, 2, 0.8); seg([dx + 0.06, 0, Z + 0.002], [dx + 0.06, 0.26, Z + 0.002], nk * 0.15, 2, 0.8); seg([dx - 0.06, 0.26, Z + 0.002], [dx + 0.06, 0.26, Z + 0.002], nk * 0.1, 2, 0.8);
    for (let i = 0; i < nk * 0.35; i++) { const a = r() * Math.PI * 2; add(dx + Math.cos(a) * 0.03, 0.44 + Math.sin(a) * 0.03, Z + 0.12, 0.95, 3, 6, 42, 2); }
    seg([dx + 0.03, 0.44, Z + 0.12], [dx + 0.13, 0.44, Z + 0.12], nk * 0.15, 2, 0.95, 3); seg([dx + 0.1, 0.44, Z + 0.12], [dx + 0.1, 0.41, Z + 0.12], nk * 0.05, 2, 0.95, 3); seg([dx + 0.13, 0.44, Z + 0.12], [dx + 0.13, 0.405, Z + 0.12], nk * 0.05, 2, 0.95, 3);
    // power: a meter box on the right wall and the supply line down the tether to the street
    const np = Math.round(n * P.power), mb = [X + 0.003, 0.2, 0.12];
    for (const [a, b] of [[[0, 0, -0.04], [0, 0, 0.04]], [[0, 0.1, -0.04], [0, 0.1, 0.04]], [[0, 0, -0.04], [0, 0.1, -0.04]], [[0, 0, 0.04], [0, 0.1, 0.04]]]) seg([mb[0], mb[1] + a[1], mb[2] + a[2]], [mb[0], mb[1] + b[1], mb[2] + b[2]], np * 0.08, 3, 0.95);
    seg([X + 0.01, 0.2, 0.12], [X + 0.01, 0.0, 0.12], np * 0.12, 3, 0.85); seg([X + 0.01, 0, 0.12], [0.03, 0, 0.04], np * 0.14, 3, 0.85); seg([0.03, 0, 0.04], [0.03, -HOUSE.hover, 0.04], np * 0.34, 3, 0.8);
    // internet: the fibre line up beside the power, a box inside the front room and three arcs of signal over it
    const ni = Math.round(n * P.internet), rt = [-0.2, 0.06, 0.05];
    seg([-0.03, -HOUSE.hover, -0.03], [-0.03, 0, -0.03], ni * 0.3, 4, 0.8); seg([-0.03, 0, -0.03], [rt[0], 0, rt[2]], ni * 0.08, 4, 0.8); seg([rt[0], 0, rt[2]], rt, ni * 0.04, 4, 0.85);
    quad([rt[0] - 0.04, rt[1], rt[2] - 0.02], [0.08, 0, 0], [0, 0.03, 0], ni * 0.1, 4, 0.9);
    for (const rad of [0.07, 0.11, 0.15]) for (let i = 0; i < ni * 0.16; i++) { const a = Math.PI * (0.25 + 0.5 * r()); add(rt[0] + Math.cos(a) * rad, rt[1] + 0.04 + Math.sin(a) * rad, rt[2], 0.9, 1, 6, 44, 4); }
    // bond: a seal round the house's base (dashed in the shader while it waits for approval)
    const nb = Math.round(n * P.bond); for (let i = 0; i < nb; i++) { const a = r() * Math.PI * 2, rr = 0.72 * (1 + (r() - 0.5) * 0.02); add(Math.cos(a) * rr, -0.02 + (r() - 0.5) * 0.006, Math.sin(a) * rr * 0.8, 0.8, 1, 6, 45, 5); }
  }
  const dyn = parts.length / 8, N = got + dyn;
  const pos = new Float32Array(N * 3), L = new Float32Array(N), K = new Float32Array(N), LAY = new Float32Array(N), GR = new Float32Array(N), PART = new Float32Array(N), SEED = new Float32Array(N);
  pos.set(base); L.set(bl); K.set(bk); LAY.set(blay); GR.set(bg);
  for (let i = 0; i < dyn; i++) { const o = i * 8, j = got + i; pos[j * 3] = parts[o]; pos[j * 3 + 1] = parts[o + 1]; pos[j * 3 + 2] = parts[o + 2]; L[j] = parts[o + 3]; K[j] = parts[o + 4]; LAY[j] = parts[o + 5]; GR[j] = parts[o + 6]; PART[j] = parts[o + 7]; }
  const rs = rng(9); for (let i = 0; i < N; i++) SEED[i] = rs();
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("aLight", new THREE.BufferAttribute(L, 1)); geo.setAttribute("aKind", new THREE.BufferAttribute(K, 1));
  geo.setAttribute("aLayer", new THREE.BufferAttribute(LAY, 1)); geo.setAttribute("aGroup", new THREE.BufferAttribute(GR, 1)); geo.setAttribute("aPart", new THREE.BufferAttribute(PART, 1)); geo.setAttribute("aSeed", new THREE.BufferAttribute(SEED, 1));

  // ---------------------------------------------------------------------------------------------- the shader
  const v3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);
  const U = {
    uDim: { value: 0 }, uTime: { value: 0 }, uAsm: { value: reduce ? 1 : 0 }, uSize: { value: 2.2 }, uPR: { value: PR }, uRef: { value: 2 }, uNear: { value: 1 }, uFar: { value: 3 }, uReduce: { value: reduce ? 1 : 0 },
    uCropC: { value: [v3(ST.old.anchor), v3(ST.b.anchor), v3(ST.a.anchor)] }, uCropR: { value: ST.old.cropRadius }, uCropVis: { value: [0, 0, 0] },
    uGlow: { value: new Array(48).fill(0) }, uBuild: { value: [0, 0, 0, 0, 0, 0] },
    uArcA: { value: v3(ST.old.anchor) }, uArcB: { value: v3(ST.b.anchor) }, uArcH: { value: 0.16 }, uArc: { value: 0 }, uArcVis: { value: 0 },
    uHouseAt: { value: new THREE.Vector3() }, uHouseS: { value: 0.024 }, uHouseVis: { value: 0 },
    uScanC: { value: new THREE.Vector3() }, uScanR: { value: 0 }, uScanA: { value: 0 }, uScanW: { value: 0.02 },
  };
  const VERT = /* glsl */ `
attribute float aLight, aKind, aLayer, aGroup, aPart, aSeed;
uniform float uDim, uTime, uAsm, uSize, uPR, uRef, uNear, uFar, uReduce, uCropR, uArcH, uArc, uArcVis, uHouseS, uHouseVis, uScanR, uScanA, uScanW;
uniform vec3 uCropC[3], uArcA, uArcB, uHouseAt, uScanC; uniform float uCropVis[3], uGlow[48], uBuild[6];
varying vec3 vCol; varying float vAlpha, vSpark;
${GLSL_TONES}
float h1(float n) { return fract(sin(n) * 43758.5453123); }
vec3 h3(float n) { return vec3(h1(n), h1(n + 1.31), h1(n + 2.71)) * 2.0 - 1.0; }
void main() {
  vec3 p = position; float L = aLight, alpha = 1.0, size = 1.0, t = clamp(uAsm * 1.6 - aSeed * 0.6, 0.0, 1.0);
  int layer = int(aLayer + 0.5); float g = uGlow[int(aGroup + 0.5)];
  vec3 sc = vec3(0.0, 0.3, 0.0); float sr = 1.3;
  if (layer == 0) {
    for (int i = 0; i < 3; i++) { float d = distance(p.xz, uCropC[i].xz); alpha *= 1.0 - uCropVis[i] * 0.9 * (1.0 - smoothstep(uCropR * 0.55, uCropR * 1.05, d)); }
    L = L * (1.0 - 0.38 * uDim) + g * 0.32;
  } else if (layer <= 3) {
    float v = layer == 1 ? uCropVis[0] : layer == 2 ? uCropVis[1] : uCropVis[2];
    alpha *= v; size = 1.3; L += g * 0.28; sc = (layer == 1 ? uCropC[0] : layer == 2 ? uCropC[1] : uCropC[2]) + vec3(0.0, 0.04, 0.0); sr = 0.09;
    if (v < 0.002) alpha = 0.0;
  } else if (layer == 4) {
    alpha *= g; L = L * (0.55 + 0.45 * g) + 0.1 * (1.0 - uReduce) * sin(uTime * 1.7 + aSeed * 9.0); size = 1.1;
  } else if (layer == 5) {
    float s = p.x; vec3 m = (uArcA + uArcB) * 0.5 + vec3(0.0, uArcH, 0.0);
    vec3 b = mix(mix(uArcA, m, s), mix(m, uArcB, s), s);
    p = b + vec3(p.y, p.z * 0.7, p.z);
    alpha *= uArcVis * smoothstep(s - 0.004, s + 0.004, uArc);
    float head = uArc < 0.999 ? uArc : fract(uTime * 0.11 + 0.0);
    float hd = (s - head) / 0.035; L += 0.5 * exp(-hd * hd) * (uReduce > 0.5 ? 0.0 : 1.0);   // x*x, not pow(): pow of a negative base is undefined in GLSL
    sc = (uArcA + uArcB) * 0.5 + vec3(0.0, 0.2, 0.0); sr = 0.4; t = 1.0; size = 1.45;
  } else {
    int part = int(aPart + 0.5); float b = part == 0 ? uBuild[0] : part == 1 ? uBuild[1] : part == 2 ? uBuild[2] : part == 3 ? uBuild[3] : part == 4 ? uBuild[4] : uBuild[5];
    vec3 local = p; p = uHouseAt + local * uHouseS;
    t = clamp(b * 2.0 * 1.6 - aSeed * 0.6, 0.0, 1.0);
    float done = smoothstep(0.55, 1.0, b);
    L *= mix(0.6, 1.08, done);
    L += (1.0 - done) * step(0.3, b) * 0.1 * (1.0 - uReduce) * (0.5 + 0.5 * sin(uTime * 2.2 + aSeed * 4.0));
    if (part == 5 && b < 0.99) { float a = atan(local.z, local.x); alpha *= step(0.42, fract(a * 3.8197 + uTime * 0.04 * (1.0 - uReduce))); }
    alpha *= uHouseVis; size = 1.2; sc = uHouseAt + vec3(0.0, 0.5 * uHouseS, 0.0); sr = uHouseS * 1.4;
    if (b < 0.001) alpha = 0.0;
  }
  t = t * t * (3.0 - 2.0 * t);
  float fly = sin(3.14159 * t);
  vec3 pp = mix(sc + h3(aSeed * 97.0) * sr, p, t) + h3(aSeed * 31.0) * fly * 0.05 * sr;
  L = clamp(L + fly * 0.22, 0.0, 1.0);
  float dr = (distance(pp.xz, uScanC.xz) - uScanR) / uScanW; L = clamp(L + uScanA * 0.5 * exp(-dr * dr), 0.0, 1.0);
  vec4 mv = modelViewMatrix * vec4(pp, 1.0); gl_Position = projectionMatrix * mv;
  float dist = -mv.z, fade = clamp(1.15 - (dist - uNear) / max(uFar - uNear, 0.0001), 0.35, 1.0);
  vec3 col = pcLook(L * (0.7 + 0.3 * fade), uTime * 0.025 + pp.x * 2.2 + pp.z * 1.4 + aSeed * 0.15);
  vSpark = h1(aSeed * 7.13) < 0.02 && aKind != 2.0 ? 1.0 : 0.0;
  float tw = vSpark * (uReduce > 0.5 ? 0.6 : 0.5 + 0.5 * sin(uTime * 2.4 + aSeed * 61.0));
  vCol = col * (1.0 + tw * 0.9);
  vAlpha = alpha * (aKind == 2.0 ? 0.55 : 1.0) * (0.6 + 0.4 * fade);
  gl_PointSize = vAlpha < 0.004 ? 0.0 : clamp(uSize * uPR * (0.7 + 0.6 * h1(aSeed * 13.7)) * size * (1.0 + tw * 1.8) * (1.0 + fly * 0.4) * uRef / max(dist, 0.0005), 0.0, 14.0 * uPR);
}`;
  const FRAG = /* glsl */ `
varying vec3 vCol; varying float vAlpha, vSpark;
void main() {
  vec2 c = gl_PointCoord - 0.5; float a;
  if (vSpark > 0.5) { vec2 q = abs(c); a = max(1.0 - smoothstep(0.0, 0.07, min(q.x, q.y)), 0.0) * (1.0 - smoothstep(0.2, 0.5, max(q.x, q.y))); a = max(a, 1.0 - smoothstep(0.0, 0.18, length(c))); }
  else a = 1.0 - smoothstep(0.28, 0.5, length(c));
  a *= vAlpha; if (a < 0.01) discard;
  gl_FragColor = vec4(vCol * a, a);
}`;
  const mat = new THREE.ShaderMaterial({ uniforms: U, vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, depthTest: false,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendEquationAlpha: THREE.AddEquation, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneFactor });
  const points = new THREE.Points(geo, mat); points.frustumCulled = false;
  const scene = new THREE.Scene(); scene.add(points);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.0005, 30);
  const pipe = createPipeline(renderer, { bloom: 0.62 });

  // ---------------------------------------------------------------------------------------------- the camera
  let W = 1, H = 1;
  const panelRect = () => { const p = document.querySelector(".mv-panel"); return p && wide() ? p.getBoundingClientRect() : null; };
  const stageRect = () => world.getBoundingClientRect();
  function resize() {
    const w = world.clientWidth, hh = world.clientHeight; if (w === W && hh === H) return false; W = w; H = hh;
    renderer.setSize(w, hh, false); camera.aspect = w / hh; pipe.resize(Math.max(2, Math.round(w * PR)), Math.max(2, Math.round(hh * PR)), w / hh);
    // points scale with the budget (fewer points, bigger) and with the stage's area (a small stage packs the same map into fewer pixels)
    U.uSize.value = 2.5 * Math.sqrt(300000 / N) * Math.min(1.25, Math.max(0.8, hh / 860)) * Math.min(1, Math.max(0.55, Math.sqrt((w * hh) / (1300 * 820)))); layout = null; return true;
  }
  // the free part of the stage (right of the panel on a wide screen), where the camera puts its subject
  const free = () => { const s = stageRect(), p = panelRect(); const left = p ? p.right - s.left + 16 : 0; return { left, width: W - left, cx: left + (W - left) / 2 }; };
  function station(name, m) {
    const D = (m && m.dest) || "b", dest = ST[D].anchor, old = ST.old.anchor, f = free(), tanH = Math.tan((camera.fov * Math.PI) / 360);
    const fit = (spanW, spanD, el) => Math.max(spanW / (2 * tanH * (f.width / H)), (spanD * Math.sin(el) + 0.05 * spanW) / (2 * tanH * 0.82));
    const mid = [(old[0] + dest[0]) / 2, (old[1] + dest[1]) / 2, (old[2] + dest[2]) / 2], span = Math.hypot(dest[0] - old[0], dest[2] - old[2]);
    switch (name) {
      case "old": return { t: [old[0], old[1] + 0.004, old[2]], el: 0.82, az: -0.18, d: fit(0.15, 0.13, 0.82) };
      case "dest": return { t: [dest[0], dest[1] + 0.012, dest[2]], el: 0.42, az: 0.28, d: fit(0.12, 0.09, 0.42) };
      case "arc": return { t: [mid[0], mid[1] + 0.045, mid[2] - 0.04], el: 0.56, az: 0.0, d: fit(span * (wide() ? 1.15 : 1.05) + (wide() ? 0.26 : 0.1), 0.6, 0.56) };
      case "overview": return { t: [mid[0] + 0.02, mid[1] + 0.05, mid[2] - 0.06], el: 0.8, az: 0.0, d: fit(wide() ? 1.95 : 1.3, 1.0, 0.8) };
      default: return wide() ? { t: [0.02, 0.035, 0.0], el: 0.92, az: 0.0, d: fit(2.05, 1.35, 0.92) } : { t: [0.0, 0.035, 0.12], el: 0.95, az: 0.0, d: fit(1.25, 0.9, 0.95) };
    }
  }
  const cam = { t: [0, 0, 0], el: 0.9, az: 0, d: 3 }; let camFrom = null, camTo = null, camT0 = 0, camMs = 2600;
  function placeCamera(c, now) {
    const sway = reduce || paused ? 0 : Math.sin(now / 1000 * 0.09) * 0.05 + Math.sin(now / 1000 * 0.037) * 0.025, az = c.az + sway;
    camera.position.set(c.t[0] + Math.sin(az) * Math.cos(c.el) * c.d, c.t[1] + Math.sin(c.el) * c.d, c.t[2] + Math.cos(az) * Math.cos(c.el) * c.d);
    camera.lookAt(c.t[0], c.t[1], c.t[2]); camera.near = c.d * 0.02; camera.far = c.d * 8;
    // the subject sits in the free part of the stage, not under the panel
    const f = free(), shift = f.cx - W / 2; if (Math.abs(shift) > 1) camera.setViewOffset(W, H, -shift, 0, W, H); else camera.clearViewOffset();
    camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    U.uRef.value = c.d; U.uNear.value = c.d * 0.75; U.uFar.value = c.d * 1.5;
    // a street crop shows only when the camera is over that street and close; from further out the city layer carries it
    for (let i = 0; i < 3; i++) { const cc = U.uCropC.value[i]; U.uCropVis.value[i] = (1 - smoothstep(0.03, 0.1, Math.hypot(c.t[0] - cc.x, c.t[2] - cc.z))) * (1 - smoothstep(0.4, 0.8, c.d)); }
  }
  const smoothstep = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
  const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
  const lerp = (a, b, k) => a + (b - a) * k;
  function flyTo(c, instant) {
    if (instant || reduce || paused || !camTo) { Object.assign(cam, JSON.parse(JSON.stringify(c))); camFrom = camTo = c; camT0 = -1e9; return; }
    camFrom = JSON.parse(JSON.stringify(cam)); camTo = c; camT0 = performance.now();
    // a long hop climbs a little higher on the way (the camera pulls back over the city, then comes down)
    camMs = 2200 + Math.min(1400, Math.hypot(c.t[0] - cam.t[0], c.t[2] - cam.t[2]) * 1400);
  }
  function stepCamera(now) {
    if (!camTo || camFrom === camTo) return false; const k = Math.min(1, (now - camT0) / camMs), e = ease(k);
    const hop = Math.sin(Math.PI * e) * Math.min(0.9, Math.hypot(camTo.t[0] - camFrom.t[0], camTo.t[2] - camFrom.t[2])) * 0.7;
    cam.t = [0, 1, 2].map((i) => lerp(camFrom.t[i], camTo.t[i], e)); cam.el = lerp(camFrom.el, camTo.el, e); cam.az = lerp(camFrom.az, camTo.az, e);
    cam.d = Math.exp(lerp(Math.log(camFrom.d), Math.log(camTo.d), e)) * (1 + hop * (camTo.d < 0.6 || camFrom.d < 0.6 ? 1.6 : 0.4));
    if (k >= 1) { camFrom = camTo; return false; } return true;
  }

  // ---------------------------------------------------------------------------------------------- the state from the journey
  const goal = { glow: new Array(48).fill(0), build: [0, 0, 0, 0, 0, 0], arc: 0, arcVis: 0, houseVis: 0, dim: 0 };
  let state = null, stateKey = "", layout = null, shownAt = 0, typedKeys = new Set();
  function apply(map, instant = false) {
    const g = new Array(48).fill(0);
    for (const k of map.rings || []) g[RING[k]] = 1;
    for (const k of map.beacons || []) g[BEACON[k]] = 1;
    for (const k of map.streets || []) { g[ST[k].group] = 1; g[ST[k].block] = k === "old" ? 0.25 : 0.55; }
    const hs = map.house || null, D = map.dest || "b";
    goal.dim = (map.arc || (map.beacons || []).length) && /arc|overview|city/.test(map.cam) ? 1 : 0;   // the base map steps back when the overlays carry the story
    goal.glow = g; goal.arc = map.arc ? 1 : 0; goal.arcVis = map.arc ? 1 : 0; goal.houseVis = hs ? 1 : 0;
    goal.build = hs ? [hs.frame || 0, hs.frame || 0, hs.keys || 0, hs.power || 0, hs.internet || 0, hs.bond || 0] : [0, 0, 0, 0, 0, 0];
    U.uArcB.value.copy(v3(ST[D].anchor)); U.uArcH.value = 0.05 + Math.hypot(ST[D].anchor[0] - ST.old.anchor[0], ST[D].anchor[2] - ST.old.anchor[2]) * 0.3;
    U.uHouseAt.value.set(ST[D].anchor[0], ST[D].anchor[1] + HOUSE.hover * U.uHouseS.value, ST[D].anchor[2]);
    if (map.arc && U.uArc.value < 0.001 && !instant && !reduce) U.uArc.value = 0.0001;   // the arc draws itself from the old street
    flyTo(station(map.cam, map), instant);
    if (map.scan && !reduce && !instant) { const c = map.scan === "pm" ? PL.pm.anchor : ST[map.scan]?.anchor || ST.old.anchor; scanT = { t0: performance.now(), c, ms: 3200 }; }
    const key = map.stage + ":" + map.cam + ":" + (map.dest || "") + ":" + (map.callouts || []).map((c) => c.at).join(",");
    if (key !== stateKey) { stateKey = key; drawCallouts(map); layout = null; shownAt = performance.now(); }
    if (instant || reduce || paused) { U.uGlow.value = g.slice(); U.uBuild.value = goal.build.slice(); U.uArc.value = goal.arc; U.uArcVis.value = goal.arcVis; U.uHouseVis.value = goal.houseVis; U.uDim.value = goal.dim; }
    state = map; kick();
  }
  let scanT = null;
  function stepState(now, dt) {
    let moving = false; const k = reduce || paused ? 1 : 1 - Math.exp(-dt / 420), kb = reduce || paused ? 1 : 1 - Math.exp(-dt / 700);
    for (let i = 0; i < 48; i++) { const a = U.uGlow.value[i], b = goal.glow[i]; if (Math.abs(a - b) > 0.002) { U.uGlow.value[i] = a + (b - a) * k; moving = true; } else U.uGlow.value[i] = b; }
    for (let i = 0; i < 6; i++) { const a = U.uBuild.value[i], b = goal.build[i]; if (Math.abs(a - b) > 0.002) { U.uBuild.value[i] = a + (b - a) * kb; moving = true; } else U.uBuild.value[i] = b; }
    for (const [u, gk] of [["uArcVis", "arcVis"], ["uHouseVis", "houseVis"], ["uDim", "dim"]]) { const a = U[u].value, b = goal[gk]; if (Math.abs(a - b) > 0.002) { U[u].value = a + (b - a) * k; moving = true; } else U[u].value = b; }
    if (goal.arc > U.uArc.value && U.uArc.value > 0) { U.uArc.value = Math.min(1, U.uArc.value + dt / 2400); moving = true; } else if (goal.arc === 0) U.uArc.value = 0; else if (U.uArc.value === 0) U.uArc.value = 1;
    if (scanT) { const s = (now - scanT.t0) / scanT.ms; if (s >= 1) { scanT = null; U.uScanA.value = 0; } else { U.uScanA.value = Math.sin(Math.PI * s); U.uScanR.value = 0.02 + s * 0.75; U.uScanC.value.set(scanT.c[0], 0, scanT.c[2]); U.uScanW.value = 0.012 + 0.02 * s; moving = true; } }
    if (U.uAsm.value < 1) { U.uAsm.value = Math.min(1, (now - asmT0) / 3200); moving = true; }
    return moving;
  }

  // ---------------------------------------------------------------------------------------------- anchors and callouts
  const H_LOCAL = { "house.roof": [HOUSE.w + 0.04, HOUSE.ridge, 0], "house.bond": [0.5, -0.02, 0.45], "house.keys": [0.16, 0.44, HOUSE.d + 0.12], "house.power": [HOUSE.w, 0.25, 0.12], "house.internet": [-0.2, 0.25, 0.05] };
  function anchorOf(key) {
    if (key.startsWith("house.")) { const l = H_LOCAL[key], s = U.uHouseS.value, a = U.uHouseAt.value; return l ? [a.x + l[0] * s, a.y + l[1] * s, a.z + l[2] * s] : null; }
    if (key === "arc") { const A = U.uArcA.value, B = U.uArcB.value; return [(A.x + B.x) / 2, (A.y + B.y) / 2 + U.uArcH.value * 0.5, (A.z + B.z) / 2]; }
    const [kind, id] = key.includes(".") ? key.split(".") : ["street", key];
    if (kind === "street") return ST[id] ? [ST[id].anchor[0], ST[id].anchor[1] + 0.001, ST[id].anchor[2]] : null;
    if (kind === "ring") { const c = ringAt[id]; if (!c) return null; return [c[0] + 0.028, groundAt(c[0] + 0.028, c[2] - 0.028) + 0.001, c[2] - 0.028]; }
    if (kind === "place") { const c = PL[id]?.anchor; return c ? [c[0], groundAt(c[0], c[2]) + 0.108, c[2]] : null; }
    return null;
  }
  const tmp = new THREE.Vector3();
  function project(p) { tmp.set(p[0], p[1], p[2]).project(camera); return { x: (tmp.x * 0.5 + 0.5) * W, y: (-tmp.y * 0.5 + 0.5) * H, ok: tmp.z < 1 && tmp.z > -1 }; }
  function drawCallouts(map) {
    const list = (map.callouts || []).slice(0, phoneish() ? 2 : 8), J = window.MovingJourney, p = J && J.proof();
    calloutBox.innerHTML = list.map((c, i) => {
      const text = c.bill && p ? `about $${Math.round(p.bill)} for the first ${J.USE.days} days` : c.text;
      return `<li class="mv-callout${c.compact ? " compact" : ""}" data-at="${c.at}" data-i="${i}"><strong class="typing" data-full="${esc(c.title)}">${esc(c.title)}</strong>${text ? `<span>${esc(text)}</span>` : ""}<em class="truth" data-k="${c.chip === "Illustrative" || c.chip === "Estimate" ? "ill" : c.chip === "Live" || c.chip === "Latest published" ? "live" : "sim"}">${esc(c.chip)}</em></li>`;
    }).join("");
    for (const el of calloutBox.querySelectorAll(".mv-callout")) { const t = el.querySelector(".typing"), k = map.stage + el.dataset.at; if (!reduce && !typedKeys.has(k)) { typedKeys.add(k); t.textContent = ""; t.classList.add("caret"); el.dataset.type = "1"; } }
  }
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  function layoutCallouts() {
    const els = [...calloutBox.querySelectorAll(".mv-callout")], s = stageRect(), off = (r) => ({ left: r.left - s.left, right: r.right - s.left, top: r.top - s.top, bottom: r.bottom - s.top });
    const avoid = [...document.querySelectorAll(".mv-panel, .mv-controls, .askb, .mv-credit-chip")].map((e) => e.getBoundingClientRect()).filter((r) => r.width && r.bottom > s.top && r.top < s.bottom).map(off);
    const keep = keepClear();
    const placed = [], lines = []; layout = new Map();
    const hits = (r, a, pad = 8) => !(r.right + pad < a.left || r.left - pad > a.right || r.bottom + pad < a.top || r.top - pad > a.bottom);
    const crosses = (p, r, a) => { for (let k = 0; k <= 12; k++) { const t = k / 12, x = p.x + ((r.left + r.right) / 2 - p.x) * t, y = p.y + ((r.top + r.bottom) / 2 - p.y) * t; if (x > a.left && x < a.right && y > a.top && y < a.bottom) return true; } return false; };
    const pts = new Map(els.map((el) => { const a = anchorOf(el.dataset.at); return [el, a ? project(a) : null]; }));
    const f = free(), minX = wide() ? f.left : 8;
    for (const el of els) {
      const p = pts.get(el); if (!p || !p.ok || p.x < minX - 4 || p.x > W - 6 || p.y < 6 || p.y > H - 6) continue;
      if (avoid.some((a) => hits({ left: p.x, right: p.x, top: p.y, bottom: p.y }, a, 4))) continue;
      const w = el.offsetWidth, h = el.offsetHeight; let best = null;
      for (const dx of [-w - 300, -w - 200, -w - 120, -w - 60, -w - 24, -w / 2, 24, 60, 120, 200, 300])
        for (const dy of [-h - 220, -h - 150, -h - 96, -h - 56, -h - 24, -h / 2, 24, 64, 110, 160, 220]) {
          const r = { left: p.x + dx, top: p.y + dy, right: p.x + dx + w, bottom: p.y + dy + h };
          if (r.left < minX + 4 || r.top < 10 || r.right > W - 10 || r.bottom > H - 10) continue;
          if (avoid.some((a) => hits(r, a)) || keep.some((a) => hits(r, a, 4)) || placed.some((a) => hits(r, a, 10))) continue;
          if ([...pts.values()].some((o) => o && hits(r, { left: o.x, right: o.x, top: o.y, bottom: o.y }, 12))) continue;
          if (placed.some((a) => crosses(p, r, a)) || lines.some(([lp, lr]) => crosses(lp, lr, r))) continue;
          const gx = Math.max(r.left - p.x, 0, p.x - r.right), gy = Math.max(r.top - p.y, 0, p.y - r.bottom), score = Math.hypot(gx, gy) + (dy > 0 ? 6 : 0);
          if (!best || score < best[0]) best = [score, dx, dy, r];
        }
      if (best) { placed.push(best[3]); lines.push([p, best[3]]); layout.set(el, [best[1], best[2]]); }
    }
  }
  // what callouts must never cover: the drawn house (its screen box) and the move's arc (a few boxes along it)
  function keepClear() {
    const out = [];
    if (U.uHouseVis.value > 0.5) { const s = U.uHouseS.value, a = U.uHouseAt.value; let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const lx of [-0.75, 0.75]) for (const ly of [-0.05, HOUSE.ridge]) for (const lz of [-0.6, 0.6]) { const q = project([a.x + lx * s, a.y + ly * s, a.z + lz * s]); x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); }
      if (x1 - x0 > 24) out.push({ left: x0, right: x1, top: y0, bottom: y1 }); }
    if (U.uArcVis.value > 0.5) { const A = U.uArcA.value, B = U.uArcB.value, m = [(A.x + B.x) / 2, (A.y + B.y) / 2 + U.uArcH.value, (A.z + B.z) / 2];
      for (let k = 2; k <= 18; k++) { const t = k / 20, u = 1 - t, q = project([u * u * A.x + 2 * u * t * m[0] + t * t * B.x, u * u * A.y + 2 * u * t * m[1] + t * t * B.y, u * u * A.z + 2 * u * t * m[2] + t * t * B.z]); out.push({ left: q.x - 6, right: q.x + 6, top: q.y - 6, bottom: q.y + 6 }); } }
    return out;
  }
  function leader(p, r, fresh) {
    const bx = p.x < r.left ? r.left : p.x > r.right ? r.right : p.x, by = (r.top + r.bottom) / 2, elbow = Math.abs(p.y - by) > 6 && (p.x < r.left || p.x > r.right);
    const d = elbow ? `M${p.x.toFixed(1)},${p.y.toFixed(1)} L${p.x.toFixed(1)},${by.toFixed(1)} L${bx.toFixed(1)},${by.toFixed(1)}` : `M${p.x.toFixed(1)},${p.y.toFixed(1)} L${bx.toFixed(1)},${(p.y < r.top ? r.top : p.y > r.bottom ? r.bottom : by).toFixed(1)}`;
    return `<path d="${d}"${fresh ? ' class="new"' : ""}/><circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="2.5"/><circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="6" class="ring"/>`;
  }
  function drawLeaders(now, flying) {
    const els = [...calloutBox.querySelectorAll(".mv-callout")];
    if (flying || U.uAsm.value < 0.98) { els.forEach((e) => e.classList.remove("on")); svg.replaceChildren(); return; }
    if (!layout) layoutCallouts();
    const parts = [];
    for (const el of els) {
      const off = layout.get(el); el.classList.toggle("on", !!off); if (!off) continue;
      const a = anchorOf(el.dataset.at), p = project(a), x = Math.round(p.x + off[0]), y = Math.round(p.y + off[1]);
      el.style.transform = `translate(${x}px, ${y}px)`;
      const fresh = el.dataset.type === "1" || now - shownAt < 1600;
      parts.push(leader(p, { left: x, top: y, right: x + el.offsetWidth, bottom: y + el.offsetHeight }, fresh));
      if (el.dataset.type === "1" && !el.dataset.typing) typeIn(el);
    }
    svg.innerHTML = parts.join("");
  }
  function typeIn(el) {
    el.dataset.typing = "1"; const t = el.querySelector(".typing"), full = t.dataset.full; let k = 0;
    const tick = () => { if (!el.isConnected) return; k += 2; t.textContent = full.slice(0, k); if (k < full.length) setTimeout(tick, 22); else { t.classList.remove("caret"); delete el.dataset.type; } };
    setTimeout(tick, 120 + Number(el.dataset.i) * 260);
  }

  // ---------------------------------------------------------------------------------------------- the loop
  let asmT0 = performance.now(), running = false, paused = false, last = performance.now(), shown = false, visible = true, need = true;
  function kick() { need = true; if (!running && visible) { running = true; requestAnimationFrame(frame); } }
  function frame(now) {
    const dt = Math.min(250, now - last); last = now;
    if (!visible) { running = false; return; }
    resize();
    const flying = stepCamera(now), changing = stepState(now, dt);
    if (!paused) U.uTime.value = now / 1000;
    placeCamera(cam, now);
    pipe.setLift(free().cx / W, 0.5);
    pipe.render(scene, camera);
    drawLeaders(now, flying);
    if (!shown) { shown = true; requestAnimationFrame(() => root.classList.add("mv-live")); setTimeout(() => root.classList.add("mv-ready"), reduce ? 0 : 2600); if (/[?&]still\b/.test(location.search)) setTimeout(() => (window.__stillReady = true), 400); }
    need = false;
    // keep drawing while anything moves; with motion paused or reduced, stop once everything has arrived
    if (!reduce && !paused) requestAnimationFrame(frame);
    else if (flying || changing || need) requestAnimationFrame(frame);
    else running = false;
  }
  addEventListener("moving:state", (e) => apply(e.detail.map));
  addEventListener("moving:motion", (e) => { paused = !e.detail.playing; if (paused) { flyTo(camTo || station("city"), true); } kick(); });
  addEventListener("resize", () => { layout = null; if (state) flyTo(station(state.cam, state), true); kick(); });
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick(); }, { rootMargin: "80px" }).observe(world);
  resize();
  const J = window.MovingJourney;
  if (J) { apply(J.mapState(), true); paused = !J.state.playing; }
  else apply({ cam: "overview", rings: ["old", "b"], streets: ["old", "b"], beacons: ["pm", "movers", "power", "internet"], arc: 1, house: { frame: 1, keys: 1, bond: 0.6, power: 1, internet: 1 }, callouts: [] }, true);
  if (!reduce) { U.uAsm.value = 0; asmT0 = performance.now(); }
  window.__movingScene = { U, camera, anchorOf, project, get state() { return state; }, N, got, dyn, kick, geo };
  kick();
}
