// assembl lab · the shared point-cloud engine. One look for every point cloud in the lab (the assembl point-cloud standard):
// plum ground with a soft lift, a six-stop plum → rose → ivory tone ramp, iridescence on highlights only, premultiplied additive
// accumulation (dense places brighten, never blow out), a soft bloom, sparkles, assembling with a stagger, a reading scan and
// depth fade. Forms are plain arrays (positions, light 0–1, kind) and morph into each other, so one cloud can carry a journey.
import * as THREE from "three";

export const TONES = ["#3A2238", "#5E3A58", "#8E6585", "#D9BACB", "#F0DCE6", "#F9F6F2"];
export const IRID = ["#F9F6F2", "#F4BEDA", "#D4A8C6", "#FCCEBC", "#ECBCD6"];
export const GROUND = "#21121F", LIFT = "#2E1A2C";
export const KIND = { surface: 0, edge: 1, ground: 2, highlight: 3 };
const KEY = new THREE.Vector3(-0.45, 0.8, 0.55).normalize();          // key light: above, front, left

export function rng(seed = 1) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const vec = (hex) => { const c = new THREE.Color(hex); return `vec3(${c.r.toFixed(4)}, ${c.g.toFixed(4)}, ${c.b.toFixed(4)})`; };

// ------------------------------------------------------------------------------------------------ forms
// A form: { n, pos: Float32Array(n*3), light: Float32Array(n), kind: Uint8Array(n), anchors: { name: [x,y,z] } }
export function makeForm(n) { return { n, pos: new Float32Array(n * 3), light: new Float32Array(n), kind: new Uint8Array(n), anchors: {} }; }
// resample any form to exactly n points (morphing needs equal counts), shuffled so a subset is still a fair sample
export function resample(f, n, seed = 3) {
  const r = rng(seed), o = makeForm(n); o.anchors = f.anchors;
  for (let i = 0; i < n; i++) { const j = i < f.n ? i : Math.floor(r() * f.n), k = Math.floor(r() * f.n), s = i < f.n ? j : k; o.pos.set(f.pos.subarray(s * 3, s * 3 + 3), i * 3); o.light[i] = f.light[s]; o.kind[i] = f.kind[s]; }
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); for (let a = 0; a < 3; a++) { const t = o.pos[i * 3 + a]; o.pos[i * 3 + a] = o.pos[j * 3 + a]; o.pos[j * 3 + a] = t; } const tl = o.light[i]; o.light[i] = o.light[j]; o.light[j] = tl; const tk = o.kind[i]; o.kind[i] = o.kind[j]; o.kind[j] = tk; }
  return o;
}
// recentre on the ground (y = 0) and scale so the larger of width and depth is `size`
export function normalise(f, size = 1, { ground = true } = {}) {
  const b = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
  // size by the object itself: the faint ground disc is context, not part of the form
  for (let i = 0; i < f.n; i++) { if (f.kind[i] === KIND.ground && f.n > 1) continue; for (let a = 0; a < 3; a++) { const v = f.pos[i * 3 + a]; if (v < b[a]) b[a] = v; if (v > b[a + 3]) b[a + 3] = v; } }
  if (!isFinite(b[0])) for (let i = 0; i < f.n; i++) for (let a = 0; a < 3; a++) { const v = f.pos[i * 3 + a]; if (v < b[a]) b[a] = v; if (v > b[a + 3]) b[a + 3] = v; }
  const cx = (b[0] + b[3]) / 2, cz = (b[2] + b[5]) / 2, y0 = ground ? b[1] : (b[1] + b[4]) / 2, s = size / Math.max(b[3] - b[0], b[5] - b[2], 1e-6);
  const tf = (p) => [(p[0] - cx) * s, (p[1] - y0) * s, (p[2] - cz) * s];
  for (let i = 0; i < f.n; i++) { const p = tf(f.pos.subarray(i * 3, i * 3 + 3)); f.pos.set(p, i * 3); }
  for (const k in f.anchors) f.anchors[k] = tf(f.anchors[k]);
  f.height = (b[4] - b[1]) * s; return f;
}
// the light a point carries: normal against the key light (two-sided), edges and rims brighter, darker toward the ground
export function lightFor(n, edge, h01) { return Math.min(1, 0.18 + 0.55 * Math.pow(Math.abs(n.dot(KEY)), 0.8) + 0.4 * edge) * (0.62 + 0.38 * Math.min(1, h01 * 3)); }

// any three.js object (a GLB, a Plan Studio model) → points: area-weighted surfaces, dense sharp edges, a faint ground disc
export function objectForm(root, n, { edgeShare = 0.34, groundShare = 0.07, weight = () => 1, seed = 5 } = {}) {
  const r = rng(seed); root.updateMatrixWorld(true);
  const tris = [], edges = []; let tw = 0, ew = 0, ymin = Infinity, ymax = -Infinity;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), ab = new THREE.Vector3(), ac = new THREE.Vector3();
  root.traverse((m) => {
    if (!m.isMesh || !m.visible) return; const w = weight(m); if (w <= 0) return;
    const g = m.geometry, p = g.attributes.position, idx = g.index, cnt = idx ? idx.count : p.count;
    for (let i = 0; i < cnt; i += 3) {
      a.fromBufferAttribute(p, idx ? idx.getX(i) : i).applyMatrix4(m.matrixWorld); b.fromBufferAttribute(p, idx ? idx.getX(i + 1) : i + 1).applyMatrix4(m.matrixWorld); c.fromBufferAttribute(p, idx ? idx.getX(i + 2) : i + 2).applyMatrix4(m.matrixWorld);
      const nn = new THREE.Vector3().crossVectors(ab.subVectors(b, a), ac.subVectors(c, a)), ar = nn.length() / 2; if (ar < 1e-9) continue;
      tris.push([a.clone(), b.clone(), c.clone(), nn.normalize(), ar * w]); tw += ar * w;
      ymin = Math.min(ymin, a.y, b.y, c.y); ymax = Math.max(ymax, a.y, b.y, c.y);
    }
    const eg = new THREE.EdgesGeometry(g, 30), ep = eg.attributes.position;
    for (let i = 0; i < ep.count; i += 2) { const e0 = new THREE.Vector3().fromBufferAttribute(ep, i).applyMatrix4(m.matrixWorld), e1 = new THREE.Vector3().fromBufferAttribute(ep, i + 1).applyMatrix4(m.matrixWorld), L = e0.distanceTo(e1); if (L > 1e-6) { edges.push([e0, e1, L * Math.min(1.5, w)]); ew += L * Math.min(1.5, w); } }
    eg.dispose();
  });
  const H = Math.max(ymax - ymin, 1e-6), f = makeForm(n); let k = 0;
  const put = (x, y, z, L, kind) => { if (k >= n) return; f.pos[k * 3] = x; f.pos[k * 3 + 1] = y; f.pos[k * 3 + 2] = z; f.light[k] = L; f.kind[k] = kind; k++; };
  const nS = Math.round(n * (1 - edgeShare - groundShare)), nE = Math.round(n * edgeShare);
  // surfaces: pick triangles by cumulative area
  const cum = new Float64Array(tris.length); let acc = 0; tris.forEach((t, i) => { acc += t[4]; cum[i] = acc; });
  const pick = (u) => { let lo = 0, hi = cum.length - 1; while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] < u) lo = mid + 1; else hi = mid; } return lo; };
  for (let i = 0; i < nS && tris.length; i++) {
    const t = tris[pick(r() * acc)]; let u = r(), v = r(); if (u + v > 1) { u = 1 - u; v = 1 - v; }
    const x = t[0].x + (t[1].x - t[0].x) * u + (t[2].x - t[0].x) * v, y = t[0].y + (t[1].y - t[0].y) * u + (t[2].y - t[0].y) * v, z = t[0].z + (t[1].z - t[0].z) * u + (t[2].z - t[0].z) * v;
    put(x, y, z, lightFor(t[3], 0, (y - ymin) / H), KIND.surface);
  }
  const ecum = new Float64Array(edges.length); let eacc = 0; edges.forEach((e, i) => { eacc += e[2]; ecum[i] = eacc; });
  const epick = (u) => { let lo = 0, hi = ecum.length - 1; while (lo < hi) { const mid = (lo + hi) >> 1; if (ecum[mid] < u) lo = mid + 1; else hi = mid; } return lo; };
  for (let i = 0; i < nE && edges.length; i++) { const e = edges[epick(r() * eacc)], u = r(), j = 0.002 * H; const y = e[0].y + (e[1].y - e[0].y) * u; put(e[0].x + (e[1].x - e[0].x) * u + (r() - 0.5) * j, y + (r() - 0.5) * j, e[0].z + (e[1].z - e[0].z) * u + (r() - 0.5) * j, Math.min(1, 0.55 + 0.45 * Math.min(1, ((y - ymin) / H) * 2.5)), KIND.edge); }
  // a faint ground disc under the object, darker at its rim (contact shadow, then nothing)
  const box = new THREE.Box3().setFromObject(root), cx = (box.min.x + box.max.x) / 2, cz = (box.min.z + box.max.z) / 2, R = Math.max(box.max.x - box.min.x, box.max.z - box.min.z) * 0.75;
  while (k < n) { const rr = R * Math.sqrt(r()), th = r() * Math.PI * 2; put(cx + Math.cos(th) * rr, ymin - 0.002 * H, cz + Math.sin(th) * rr, 0.16 * (1 - rr / R) + 0.04, KIND.ground); }
  return f;
}

// an image → points: luminance and a Sobel edge, kept by the standard's probability, depth kept shallow (it rotates)
export function imageForm(img, n, { maxSide = 420, depth = 0.04, seed = 7, crop } = {}) {
  const r = rng(seed), sc = maxSide / Math.max(img.width, img.height), w = Math.round(img.width * sc), h = Math.round(img.height * sc);
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h; const g = cv.getContext("2d", { willReadFrequently: true });
  if (crop) g.drawImage(img, crop[0], crop[1], crop[2], crop[3], 0, 0, w, h); else g.drawImage(img, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h).data, lum = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) lum[i] = (0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]) / 255;
  const L = (x, y) => lum[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))];
  // the background: the median colour of the border. Pixels close to it are mostly dropped, so a render on a pale cyclorama or a
  // poster with a flat field reads as its subject, not as noise.
  const border = []; for (let x = 0; x < w; x += 2) for (const y of [0, 1, h - 2, h - 1]) border.push((y * w + x) * 4); for (let y = 0; y < h; y += 2) for (const x of [0, 1, w - 2, w - 1]) border.push((y * w + x) * 4);
  const med = [0, 1, 2].map((ch) => { const v = border.map((i) => d[i + ch]).sort((a, b) => a - b); return v[v.length >> 1]; });
  const bgW = (i) => { const dd = Math.hypot(d[i * 4] - med[0], d[i * 4 + 1] - med[1], d[i * 4 + 2] - med[2]) / 255; return Math.min(1, Math.max(0, (dd - 0.05) / 0.16)); };
  const cand = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const gx = L(x + 1, y - 1) + 2 * L(x + 1, y) + L(x + 1, y + 1) - L(x - 1, y - 1) - 2 * L(x - 1, y) - L(x - 1, y + 1);
    const gy = L(x - 1, y + 1) + 2 * L(x, y + 1) + L(x + 1, y + 1) - L(x - 1, y - 1) - 2 * L(x, y - 1) - L(x + 1, y - 1);
    const e = Math.min(1, Math.hypot(gx, gy) / 2), l = L(x, y), b = bgW(y * w + x), keep = (l < 0.22 ? l * 0.35 : 0.06 + l * 0.8 + e * 2.4) * (0.06 + 0.94 * b) + e * 0.6;
    const lin = (0.08 + l * 0.7 + e * 0.75) * (0.45 + 0.55 * b);
    cand.push([x, y, keep, Math.min(1, 0.1 + 1.05 * Math.pow(lin, 0.75)), e]);   // lifted: mid-tone renders land on the brighter half of the ramp
  }
  const tot = cand.reduce((s, c) => s + Math.min(1, c[2]), 0), f = makeForm(n), asp = h / w; let k = 0;
  while (k < n) for (const c of cand) {
    if (k >= n) break; if (r() > (Math.min(1, c[2]) * n) / tot) continue;
    const x = (c[0] + r()) / w - 0.5, y = (1 - (c[1] + r()) / h) * asp, z = (r() - 0.5) * depth * (1 - c[4]);
    f.pos[k * 3] = x; f.pos[k * 3 + 1] = y; f.pos[k * 3 + 2] = z; f.light[k] = Math.min(1, c[3]); f.kind[k] = c[4] > 0.35 ? KIND.edge : KIND.surface; k++;
  }
  return f;
}

// ------------------------------------------------------------------------------------------------ the engine
const VERT = /* glsl */ `
attribute vec3 aA, aB; attribute float aLA, aLB, aSeed, aKind;
uniform float uT, uTime, uScanY, uScan, uSize, uPR, uNear, uFar, uReduce;
uniform vec3 uOffA, uOffB; uniform float uScaleA, uScaleB;
varying vec3 vCol; varying float vAlpha, vSpark;
float h1(float n) { return fract(sin(n) * 43758.5453123); }
vec3 h3(float n) { return vec3(h1(n), h1(n + 1.31), h1(n + 2.71)) * 2.0 - 1.0; }
vec3 ramp(float l) {
  vec3 c[6]; c[0] = ${vec(TONES[0])}; c[1] = ${vec(TONES[1])}; c[2] = ${vec(TONES[2])}; c[3] = ${vec(TONES[3])}; c[4] = ${vec(TONES[4])}; c[5] = ${vec(TONES[5])};
  float x = clamp(l, 0.0, 1.0) * 5.0; int i = int(min(floor(x), 4.0)); float f = x - float(i);
  vec3 a = c[0], b = c[1];
  for (int k = 0; k < 5; k++) if (k == i) { a = c[k]; b = c[k + 1]; }
  return mix(a, b, smoothstep(0.0, 1.0, f));
}
vec3 irid(float k) {
  vec3 c[5]; c[0] = ${vec(IRID[0])}; c[1] = ${vec(IRID[1])}; c[2] = ${vec(IRID[2])}; c[3] = ${vec(IRID[3])}; c[4] = ${vec(IRID[4])};
  float x = fract(k) * 5.0; int i = int(floor(x)); float f = x - float(i); vec3 a = c[0], b = c[1];
  for (int j = 0; j < 5; j++) if (j == i) { a = c[j]; b = c[j == 4 ? 0 : j + 1]; }
  return mix(a, b, smoothstep(0.0, 1.0, f));
}
void main() {
  // the stagger: each point leaves and lands at its own moment; mid-flight it is lifted off its path and glows a little
  float t = clamp(uT * 1.6 - aSeed * 0.6, 0.0, 1.0); t = t * t * (3.0 - 2.0 * t);
  vec3 a = aA * uScaleA + uOffA, b = aB * uScaleB + uOffB, d = b - a;
  float fly = sin(3.14159 * t);
  vec3 p = mix(a, b, t) + h3(aSeed * 97.0) * fly * (0.12 + 0.35 * length(d));
  float L = mix(aLA, aLB, t);
  float scan = uScan * exp(-pow((p.y - uScanY) / 0.035, 2.0));
  L = clamp(L + scan * 0.55 + fly * 0.22, 0.0, 1.0);
  vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
  float dist = -mv.z, fade = clamp(1.15 - (dist - uNear) / max(uFar - uNear, 0.01), 0.35, 1.0);
  vec3 col = ramp(L * (0.7 + 0.3 * fade));
  if (L > 0.7) { float k = uTime * 0.025 + p.x * 0.55 + p.y * 0.35 + aSeed * 0.15; col = mix(col, irid(k), min(0.6, (L - 0.7) / 0.3 * 0.6)); }
  vSpark = h1(aSeed * 7.13) < 0.02 && aKind != 2.0 ? 1.0 : 0.0;
  float tw = vSpark * (uReduce > 0.5 ? 0.6 : 0.5 + 0.5 * sin(uTime * 2.4 + aSeed * 61.0));
  vCol = col * (1.0 + tw * 0.9);
  vAlpha = (aKind == 2.0 ? 0.55 : 1.0) * (0.6 + 0.4 * fade);
  gl_PointSize = uSize * uPR * (0.7 + 0.6 * h1(aSeed * 13.7)) * (1.0 + tw * 1.8) * (1.0 + fly * 0.4) / max(dist, 0.05);
}`;
const FRAG = /* glsl */ `
varying vec3 vCol; varying float vAlpha, vSpark;
void main() {
  vec2 c = gl_PointCoord - 0.5; float a;
  if (vSpark > 0.5) { vec2 q = abs(c); a = max(1.0 - smoothstep(0.0, 0.07, min(q.x, q.y)) * 1.0, 0.0) * (1.0 - smoothstep(0.2, 0.5, max(q.x, q.y))); a = max(a, 1.0 - smoothstep(0.0, 0.18, length(c))); }
  else a = 1.0 - smoothstep(0.28, 0.5, length(c));
  a *= vAlpha; if (a < 0.01) discard;
  gl_FragColor = vec4(vCol * a, a);              // premultiplied, accumulated additively
}`;
const QUAD_V = `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const RESOLVE = /* glsl */ `
uniform sampler2D tAcc; varying vec2 vUv;
void main() { vec4 s = texture2D(tAcc, vUv); float a = s.a; vec3 c = a > 0.0 ? s.rgb / max(a, 1.0) * (1.0 + min(0.5, max(a - 1.0, 0.0) * 0.14)) : vec3(0.0); gl_FragColor = vec4(c * min(a, 1.0), min(a, 1.0)); }`;
const BLUR = /* glsl */ `
uniform sampler2D tSrc; uniform vec2 uDir; varying vec2 vUv;
void main() { vec4 s = texture2D(tSrc, vUv) * 0.2270270270;
  s += (texture2D(tSrc, vUv + uDir * 1.3846153846) + texture2D(tSrc, vUv - uDir * 1.3846153846)) * 0.3162162162;
  s += (texture2D(tSrc, vUv + uDir * 3.2307692308) + texture2D(tSrc, vUv - uDir * 3.2307692308)) * 0.0702702703; gl_FragColor = s; }`;
const FINAL = /* glsl */ `
uniform sampler2D tCloud, tBloom; uniform vec2 uLiftAt; uniform float uAspect, uBloom; varying vec2 vUv;
void main() {
  vec2 q = (vUv - uLiftAt) * vec2(uAspect, 1.0);
  vec3 bg = mix(${vec(LIFT)}, ${vec(GROUND)}, smoothstep(0.05, 1.3, length(q)));
  vec4 c = texture2D(tCloud, vUv); vec3 col = bg * (1.0 - c.a) + c.rgb + texture2D(tBloom, vUv).rgb * uBloom;
  col += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;   // dither: no banding in the lift
  gl_FragColor = vec4(col, 1.0);
}`;

export function createEngine(canvas, { budget, reduceMotion = false, pixelRatio, sizeScale = 1 } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "high-performance", preserveDrawingBuffer: false });
  const PR = pixelRatio ?? Math.min(window.devicePixelRatio || 1, 1.75); renderer.setPixelRatio(PR); renderer.setClearColor(GROUND, 1);
  const N = budget ?? (Math.min(window.innerWidth, window.innerHeight) < 700 ? 80000 : 300000);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(30, 1, 0.05, 50), group = new THREE.Group(); scene.add(group);
  camera.position.set(0, 0.55, 3.4); camera.lookAt(0, 0.32, 0);
  const geo = new THREE.BufferGeometry(), A = new Float32Array(N * 3), B = new Float32Array(N * 3), LA = new Float32Array(N), LB = new Float32Array(N), seed = new Float32Array(N), kind = new Float32Array(N);
  const r = rng(9); for (let i = 0; i < N; i++) seed[i] = r();
  geo.setAttribute("position", new THREE.BufferAttribute(A, 3)); geo.setAttribute("aA", new THREE.BufferAttribute(A, 3)); geo.setAttribute("aB", new THREE.BufferAttribute(B, 3));
  geo.setAttribute("aLA", new THREE.BufferAttribute(LA, 1)); geo.setAttribute("aLB", new THREE.BufferAttribute(LB, 1)); geo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1)); geo.setAttribute("aKind", new THREE.BufferAttribute(kind, 1));
  const U = { uT: { value: 1 }, uTime: { value: 0 }, uScanY: { value: -10 }, uScan: { value: 0 }, uSize: { value: 2.2 }, uPR: { value: PR }, uNear: { value: 2.4 }, uFar: { value: 4.6 }, uReduce: { value: reduceMotion ? 1 : 0 },
    uOffA: { value: new THREE.Vector3() }, uOffB: { value: new THREE.Vector3() }, uScaleA: { value: 1 }, uScaleB: { value: 1 } };
  const mat = new THREE.ShaderMaterial({ uniforms: U, vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, depthTest: false,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendEquationAlpha: THREE.AddEquation, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneFactor });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; group.add(pts);
  // passes: accumulate → resolve → half-size blur → composite over the plum ground
  const rtOpt = { type: THREE.HalfFloatType, depthBuffer: false };
  let acc = new THREE.WebGLRenderTarget(4, 4, rtOpt), cloud = new THREE.WebGLRenderTarget(4, 4, rtOpt), hA = new THREE.WebGLRenderTarget(2, 2, rtOpt), hB = new THREE.WebGLRenderTarget(2, 2, rtOpt);
  const quadScene = new THREE.Scene(), quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); quadScene.add(quad);
  const mk = (frag, u) => new THREE.ShaderMaterial({ uniforms: u, vertexShader: QUAD_V, fragmentShader: frag, depthTest: false, depthWrite: false });
  const resolveM = mk(RESOLVE, { tAcc: { value: null } }), blurM = mk(BLUR, { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } });
  const finalM = mk(FINAL, { tCloud: { value: null }, tBloom: { value: null }, uLiftAt: { value: new THREE.Vector2(0.62, 0.5) }, uAspect: { value: 1 }, uBloom: { value: 0.7 } });
  const pass = (m, target) => { quad.material = m; renderer.setRenderTarget(target); renderer.render(quadScene, quadCam); };
  let W = 1, H = 1;
  function resize() {
    const w = canvas.clientWidth || canvas.parentElement.clientWidth, h = canvas.clientHeight || canvas.parentElement.clientHeight; if (w === W && h === H) return; W = w; H = h;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    const pw = Math.max(2, Math.round(w * PR)), ph = Math.max(2, Math.round(h * PR)); acc.setSize(pw, ph); cloud.setSize(pw, ph); hA.setSize(pw >> 1, ph >> 1); hB.setSize(pw >> 1, ph >> 1);
    finalM.uniforms.uAspect.value = w / h; U.uSize.value = 2.6 * Math.sqrt(300000 / N) * Math.min(1.25, Math.max(0.75, h / 900)) * sizeScale;
  }
  function render() {
    resize();
    renderer.setRenderTarget(acc); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(scene, camera);
    resolveM.uniforms.tAcc.value = acc.texture; pass(resolveM, cloud);
    blurM.uniforms.tSrc.value = cloud.texture; blurM.uniforms.uDir.value.set(1.6 / hA.width, 0); pass(blurM, hA);
    blurM.uniforms.tSrc.value = hA.texture; blurM.uniforms.uDir.value.set(0, 1.6 / hA.height); pass(blurM, hB);
    blurM.uniforms.tSrc.value = hB.texture; blurM.uniforms.uDir.value.set(3.2 / hA.width, 0); pass(blurM, hA);
    blurM.uniforms.tSrc.value = hA.texture; blurM.uniforms.uDir.value.set(0, 3.2 / hA.height); pass(blurM, hB);
    finalM.uniforms.tCloud.value = cloud.texture; finalM.uniforms.tBloom.value = hB.texture; renderer.setClearColor(GROUND, 1); pass(finalM, null);
  }
  // forms and morphing
  let cur = null, next = null, tween = null;
  const load = (arrP, arrL, f) => { const g = f.n === N ? f : resample(f, N); arrP.set(g.pos); arrL.set(g.light); for (let i = 0; i < N; i++) kind[i] = g.kind[i]; return g; };
  function setForm(f, { offset = [0, 0, 0], scale = 1, ms = 2400, immediate = false } = {}) {
    if (!cur || immediate || reduceMotion) {
      cur = { f: load(A, LA, f), offset, scale }; B.set(A); LB.set(LA); U.uOffA.value.set(...offset); U.uOffB.value.set(...offset); U.uScaleA.value = U.uScaleB.value = scale; U.uT.value = 1;
      geo.attributes.aA.needsUpdate = geo.attributes.aB.needsUpdate = geo.attributes.aLA.needsUpdate = geo.attributes.aLB.needsUpdate = geo.attributes.aKind.needsUpdate = true; next = null; return;
    }
    if (tween && U.uT.value < 1) { A.set(B); LA.set(LB); U.uOffA.value.copy(U.uOffB.value); U.uScaleA.value = U.uScaleB.value; }
    else if (next) { A.set(B); LA.set(LB); U.uOffA.value.copy(U.uOffB.value); U.uScaleA.value = U.uScaleB.value; }
    next = { f: load(B, LB, f), offset, scale }; U.uOffB.value.set(...offset); U.uScaleB.value = scale; U.uT.value = 0;
    geo.attributes.aA.needsUpdate = geo.attributes.aB.needsUpdate = geo.attributes.aLA.needsUpdate = geo.attributes.aLB.needsUpdate = geo.attributes.aKind.needsUpdate = true;
    tween = { t0: performance.now(), ms };
  }
  // assemble from a scatter: the first form arrives from a loose cloud
  function assembleFrom(f, opts = {}) {
    if (reduceMotion) return setForm(f, { ...opts, immediate: true });
    const sc = makeForm(N), rr = rng(21); for (let i = 0; i < N; i++) { const th = rr() * Math.PI * 2, ph = Math.acos(2 * rr() - 1), R = 0.9 + rr() * 1.4; sc.pos.set([Math.sin(ph) * Math.cos(th) * R, 0.4 + Math.cos(ph) * R * 0.6, Math.sin(ph) * Math.sin(th) * R], i * 3); sc.light[i] = 0.1 + rr() * 0.25; sc.kind[i] = 0; }
    cur = null; setForm(sc, { offset: opts.offset, scale: 1, immediate: true }); setForm(f, { ...opts, ms: opts.ms ?? 3200 });
  }
  function scan(ms = 2600, y0 = -0.05, y1 = 1.2) { if (reduceMotion) return; scanT = { t0: performance.now(), ms, y0, y1 }; }
  let scanT = null, sway = 0, paused = false, running = false, onFrame = null;
  function frame(now) {
    if (!running) return; requestAnimationFrame(frame); if (paused) return;
    U.uTime.value = now / 1000;
    if (tween) { const k = Math.min(1, (now - tween.t0) / tween.ms); U.uT.value = k; if (k >= 1) { tween = null; cur = next; } }
    if (scanT) { const k = (now - scanT.t0) / scanT.ms; if (k >= 1) { scanT = null; U.uScan.value = 0; } else { U.uScan.value = Math.sin(Math.PI * k); U.uScanY.value = scanT.y0 + (scanT.y1 - scanT.y0) * k; } }
    if (!reduceMotion) { sway = Math.sin(now / 1000 * 0.11) * 0.22 + Math.sin(now / 1000 * 0.047) * 0.08; group.rotation.y = sway; }
    onFrame?.(now); render();
  }
  function start() { if (running) return; running = true; requestAnimationFrame(frame); }
  function stop() { running = false; }
  // where a point of the current form lands on screen (for callout leader lines)
  const tmp = new THREE.Vector3();
  function project(p, { offset = cur?.offset || [0, 0, 0], scale = cur?.scale || 1 } = {}) {
    tmp.set(p[0] * scale + offset[0], p[1] * scale + offset[1], p[2] * scale + offset[2]); tmp.applyMatrix4(group.matrixWorld).project(camera);
    return { x: (tmp.x * 0.5 + 0.5) * W, y: (-tmp.y * 0.5 + 0.5) * H, visible: tmp.z < 1 };
  }
  return { N, renderer, camera, group, uniforms: U, setForm, assembleFrom, scan, start, stop, render, project, resize,
    setLift: (x, y) => finalM.uniforms.uLiftAt.value.set(x, y), pause: (v) => { paused = v; if (!v) render(); }, get paused() { return paused; }, set onFrame(fn) { onFrame = fn; },
    morphing: () => !!tween, dispose: () => { stop(); geo.dispose(); mat.dispose(); [acc, cloud, hA, hB].forEach((t) => t.dispose()); renderer.dispose(); } };
}
