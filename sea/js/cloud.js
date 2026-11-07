// assembl lab · Sea state in the assembl point-cloud look (the lab's shared visual language). The same simulation, drawn as
// light: the sea is a dense field of points moved by the shared Gerstner code, the boat is baked to points from its own surfaces
// and edges, and the wake and spray are particle foam. Plum ground, the six-tone ramp, iridescence only on highlights, additive
// light, sparkles, points that assemble on load, a reading-scan ring, and depth fade.
import * as THREE from "three";
import { GLSL_WAVES } from "./waves.js";

const lin = (hex) => new THREE.Color(hex);              // THREE.Color converts sRGB hex to linear
export const RAMP = ["#3A2238", "#5E3A58", "#8E6585", "#D9BACB", "#F0DCE6", "#F9F6F2"].map(lin);
export const IRI = ["#F9F6F2", "#F4BEDA", "#D4A8C6", "#FCCEBC", "#ECBCD6"].map(lin);

const GLSL_LOOK = /* glsl */ `
#ifndef HAS_UTIME
uniform float uTime;
#endif
uniform vec3 uRamp[6]; uniform vec3 uIri[5]; uniform float uTone, uAssemble, uPR, uSize;
float h1(float n) { return fract(sin(n) * 43758.5453123); }
vec3 h3(float n) { return vec3(h1(n), h1(n + 1.7), h1(n + 3.3)) * 2.0 - 1.0; }
vec3 ramp(float l) { l = clamp(l, 0.0, 1.0) * 5.0; float i = floor(l), f = l - i; int a = int(i);
  vec3 c0 = uRamp[0], c1 = uRamp[0];
  for (int k = 0; k < 6; k++) { if (k == a) c0 = uRamp[k]; if (k == min(a + 1, 5)) c1 = uRamp[k]; }
  return mix(c0, c1, f); }
vec3 iri(float t) { t = fract(t) * 5.0; float i = floor(t), f = smoothstep(0.0, 1.0, t - i); int a = int(i);
  vec3 c0 = uIri[0], c1 = uIri[0];
  for (int k = 0; k < 5; k++) { if (k == a) c0 = uIri[k]; if (k == (a + 1) - 5 * ((a + 1) / 5)) c1 = uIri[k]; }
  return mix(c0, c1, f); }
// light (0..1) → colour: the ramp, with iridescence blended in only above 0.7, drifting over time and position
vec3 look(float L, vec3 wp) {
  L = clamp(L * uTone, 0.0, 1.0); vec3 c = ramp(L);
  float hi = smoothstep(0.7, 1.0, L); c = mix(c, iri(uTime * 0.03 + dot(wp, vec3(0.013, 0.02, 0.017))), hi * 0.6);
  return c * (0.35 + 0.9 * L);
}
// sparkles: a few points twinkle as small crosses
float twinkle(float seed) { return h1(seed * 7.13) > 0.979 ? 0.5 + 0.5 * sin(uTime * (2.0 + 3.0 * h1(seed)) + seed * 6.28) : 0.0; }`;

const FRAG = /* glsl */ `
varying vec3 vCol; varying float vA; varying float vSpark;
void main() {
  vec2 c = gl_PointCoord - 0.5; float r2 = dot(c, c);
  float a = exp(-r2 * 14.0);
  if (vSpark > 0.01) { float cross = max(exp(-abs(c.x) * 40.0) * exp(-abs(c.y) * 5.0), exp(-abs(c.y) * 40.0) * exp(-abs(c.x) * 5.0)); a = max(a, cross * vSpark * 1.6); }
  if (r2 > 0.25 && vSpark < 0.01) discard;
  gl_FragColor = vec4(vCol * a * vA, 1.0);
}`;

function lookUniforms(extra = {}) {
  return { uRamp: { value: RAMP }, uIri: { value: IRI }, uTime: { value: 0 }, uTone: { value: 1 }, uAssemble: { value: 1 }, uPR: { value: 1 }, uSize: { value: 1 }, ...extra };
}
const additive = (u, vs) => new THREE.ShaderMaterial({ uniforms: u, vertexShader: vs, fragmentShader: FRAG, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false });

// ------------------------------------------------------------------------------------------------ the sea as points
export function createSeaPoints(count) {
  // a projected grid: points laid evenly across the screen below the horizon and cast down onto the sea, so every part of the
  // sea you can see gets the same fine density (jittered so it never shows as rows)
  const aspect = 1.8, rows = Math.round(Math.sqrt(count / aspect)), cols = Math.round(count / rows), pos = [], seed = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) pos.push((i + Math.random()) / cols, (j + Math.random()) / rows, 0), seed.push(Math.random() * 1000);
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("aSeed", new THREE.Float32BufferAttribute(seed, 1));
  const u = lookUniforms({ uWA: { value: null }, uWB: { value: null }, uCam: { value: new THREE.Vector3() }, uKey: { value: new THREE.Vector3(-0.4, 0.75, -0.5).normalize() },
    uInvVP: { value: new THREE.Matrix4() }, uYMax: { value: 0.2 },
    uHs: { value: 0.6 }, uWhitecaps: { value: 0.5 }, uScanC: { value: new THREE.Vector2() }, uScanR: { value: -100 }, uBoatInv: { value: new THREE.Matrix4() }, uBoatHalf: { value: new THREE.Vector3(1.6, 1, 5) }, uFar: { value: 900 } });
  const mat = additive(u, GLSL_WAVES + GLSL_LOOK + /* glsl */ `
    attribute float aSeed; uniform vec2 uScanC; uniform vec3 uCam, uKey, uBoatHalf; uniform float uHs, uWhitecaps, uScanR, uFar, uYMax; uniform mat4 uBoatInv, uInvVP;
    varying vec3 vCol; varying float vA; varying float vSpark;
    void main() {
      // the grid cell → a ray through the screen → where it meets the mean sea level
      vec2 ndc = vec2(position.x * 2.3 - 1.15, mix(-1.25, uYMax, position.y));
      vec4 n0 = uInvVP * vec4(ndc, -1.0, 1.0), f0 = uInvVP * vec4(ndc, 1.0, 1.0); n0 /= n0.w; f0 /= f0.w;
      vec3 dir = f0.xyz - n0.xyz; float tt = dir.y < -1e-5 ? -n0.y / dir.y : -1.0;
      if (tt <= 0.0) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; vA = 0.0; vCol = vec3(0.0); vSpark = 0.0; return; }
      vec2 xz = n0.xz + dir.xz * tt; float dist = length(xz - uCam.xz);
      if (dist > uFar * 1.4) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; vA = 0.0; vCol = vec3(0.0); vSpark = 0.0; return; }
      vec3 P, N; float J; gerstner(xz, dist, P, N, J);
      vec3 V = normalize(uCam - P);
      float dif = max(dot(N, uKey), 0.0), fres = pow(1.0 - max(dot(N, V), 0.0), 5.0), crest = clamp(P.y / (uHs * 0.55 + 0.05) * 0.5 + 0.5, 0.0, 1.0);
      float glint = pow(max(dot(reflect(-V, N), uKey), 0.0), 90.0);
      float fold = smoothstep(0.62, 0.2, J) * uWhitecaps;
      // crests carry the light, troughs fall away: that contrast is what makes it read as swell rather than speckle
      float L = 0.04 + 0.22 * dif * dif + 0.08 * fres + 0.72 * smoothstep(0.4, 1.0, crest) + 0.9 * glint + 0.55 * fold;
      // the reading scan: a ring of light that sweeps out from the boat
      float sd = length(P.xz - uScanC); L += 0.55 * exp(-pow((sd - uScanR) / 1.6, 2.0));
      float fade = 1.0 - smoothstep(uFar * 0.1, uFar, dist); L *= 0.25 + 0.75 * fade;
      // assemble: points rise from a scattered cloud, nearest first
      float delay = clamp(dist / uFar, 0.0, 1.0) * 0.6 + h1(aSeed) * 0.3, t = clamp((uAssemble * 1.5 - delay) / 0.5, 0.0, 1.0); t = t * t * (3.0 - 2.0 * t);
      P = mix(P + h3(aSeed) * vec3(14.0, 6.0, 14.0) + vec3(0.0, 9.0, 0.0), P, t); L += (1.0 - t) * t * 1.2;
      // no sea inside the hull
      // no sea inside the hull: the hull's plan tapers toward the bow (bow at −z)
      vec3 lb = (uBoatInv * vec4(P, 1.0)).xyz; float zt = clamp((-lb.z / uBoatHalf.z - 0.2) / 0.8, 0.0, 1.0), hw = uBoatHalf.x * sqrt(max(0.0, 1.0 - zt * zt));
      float inHull = step(abs(lb.x), hw) * step(abs(lb.z), uBoatHalf.z) * step(lb.y, uBoatHalf.y);
      vSpark = twinkle(aSeed) * fade * crest; vCol = look(L, P); vA = (1.0 - inHull) * (0.2 + 0.4 * fade);
      vec4 mv = viewMatrix * vec4(P, 1.0); gl_Position = projectionMatrix * mv;
      // even screen density, so a near-constant size: a little larger close in
      gl_PointSize = uPR * (0.7 + 0.6 * h1(aSeed + 4.0)) * mix(3.4, 1.5, smoothstep(0.0, 160.0, dist)) * (1.0 + vSpark) * (1.0 - inHull) * max(t, 0.2);
    }`);
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false; pts.renderOrder = 1;
  const vp = new THREE.Matrix4(), hz = new THREE.Vector3(), fw = new THREE.Vector3();
  pts.follow = (cam) => {
    cam.updateMatrixWorld(); vp.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse); u.uInvVP.value.copy(vp).invert(); u.uCam.value.copy(cam.position);
    // where the horizon sits on screen: the grid stops just above it
    cam.getWorldDirection(fw); fw.y = 0; if (fw.lengthSq() < 1e-6) fw.set(0, 0, -1); fw.normalize();
    hz.copy(cam.position).addScaledVector(fw, uFar(u)).setY(0).project(cam); u.uYMax.value = THREE.MathUtils.clamp(hz.y + 0.04, -1, 1.2);
  };
  return { points: pts, uniforms: u };
}
const uFar = (u) => u.uFar.value * 1.4;

// ------------------------------------------------------------------------------------------------ bake a model to points
// area-weighted surface samples plus dense samples on sharp edges; light from the face normal against a key light from above,
// front and left, a little ambient occlusion by height, edges brighter; the material's own brightness only shades it.
export function bakeToPoints(group, { surface = 30000, edges = 14000, key = new THREE.Vector3(-0.45, 0.8, -0.4).normalize(), seed = 3 } = {}) {
  let s = seed; const rand = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  group.updateMatrixWorld(true); const tris = [], eds = []; let ta = 0, el = 0; const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
  let ymin = 1e9, ymax = -1e9;
  group.traverse((m) => {
    if (!m.isMesh) return; const g = m.geometry, p = g.attributes.position, idx = g.index, cnt = idx ? idx.count : p.count, col = m.material.color || new THREE.Color(1, 1, 1), lum = 0.3 * col.r + 0.59 * col.g + 0.11 * col.b;
    const shade = 0.5 + 0.7 * Math.sqrt(lum), dark = m.material.metalness > 0.25 && lum < 0.1;
    for (let i = 0; i < cnt; i += 3) {
      a.fromBufferAttribute(p, idx ? idx.getX(i) : i).applyMatrix4(m.matrixWorld); b.fromBufferAttribute(p, idx ? idx.getX(i + 1) : i + 1).applyMatrix4(m.matrixWorld); c.fromBufferAttribute(p, idx ? idx.getX(i + 2) : i + 2).applyMatrix4(m.matrixWorld);
      n.crossVectors(e1.subVectors(b, a), e2.subVectors(c, a)); const ar = n.length() / 2; if (ar < 1e-8) continue; n.normalize();
      tris.push([a.toArray(), b.toArray(), c.toArray(), n.toArray(), ar, shade * (dark ? 0.8 : 1)]); ta += ar; ymin = Math.min(ymin, a.y, b.y, c.y); ymax = Math.max(ymax, a.y, b.y, c.y);
    }
    const eg = new THREE.EdgesGeometry(g, 30), ep = eg.attributes.position;
    for (let i = 0; i < ep.count; i += 2) { a.fromBufferAttribute(ep, i).applyMatrix4(m.matrixWorld); b.fromBufferAttribute(ep, i + 1).applyMatrix4(m.matrixWorld); const L = a.distanceTo(b); if (L > 1e-4) { eds.push([a.toArray(), b.toArray(), L, shade]); el += L; } }
    eg.dispose();
  });
  const pos = [], light = [], seedA = [], hgt = Math.max(ymax - ymin, 1e-3);
  const L = (nn, y, sh, edge) => Math.min(1, (0.18 + 0.55 * Math.pow(Math.abs(nn[0] * key.x + nn[1] * key.y + nn[2] * key.z), 0.8) * (nn[1] < -0.3 ? 0.4 : 1) + 0.18 * ((y - ymin) / hgt)) * sh + 0.4 * edge);
  for (const [A, B, C, N, ar, sh] of tris) {
    const want = (ar / ta) * surface; let m = Math.floor(want); if (rand() < want - m) m++;
    for (let i = 0; i < m; i++) { let u = rand(), v = rand(); if (u + v > 1) { u = 1 - u; v = 1 - v; } const x = A[0] + (B[0] - A[0]) * u + (C[0] - A[0]) * v, y = A[1] + (B[1] - A[1]) * u + (C[1] - A[1]) * v, z = A[2] + (B[2] - A[2]) * u + (C[2] - A[2]) * v; pos.push(x, y, z); light.push(L(N, y, sh, 0)); seedA.push(rand() * 1000); }
  }
  for (const [A, B, len, sh] of eds) {
    const want = (len / el) * edges; let m = Math.floor(want); if (rand() < want - m) m++;
    for (let i = 0; i < m; i++) { const u = rand(), x = A[0] + (B[0] - A[0]) * u, y = A[1] + (B[1] - A[1]) * u, z = A[2] + (B[2] - A[2]) * u; pos.push(x, y, z); light.push(Math.min(1, 0.55 * sh + 0.35 + 0.15 * ((y - ymin) / hgt))); seedA.push(rand() * 1000); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("aLight", new THREE.Float32BufferAttribute(light, 1)); g.setAttribute("aSeed", new THREE.Float32BufferAttribute(seedA, 1));
  return g;
}

// a baked model, drawn in the look; it rides whatever transform its parent has
export function modelPoints(geometry, { size = 1, fade = 400 } = {}) {
  const u = lookUniforms({ uCam: { value: new THREE.Vector3() }, uFar: { value: fade }, uScanC: { value: new THREE.Vector2() }, uScanR: { value: -100 } });
  u.uSize.value = size;
  const mat = additive(u, GLSL_LOOK + /* glsl */ `
    attribute float aLight, aSeed; uniform vec3 uCam; uniform float uFar, uScanR; uniform vec2 uScanC;
    varying vec3 vCol; varying float vA; varying float vSpark;
    void main() {
      vec4 wp = modelMatrix * vec4(position, 1.0); float dist = length(wp.xyz - uCam);
      float delay = h1(aSeed) * 0.35 + 0.35, t = clamp((uAssemble * 1.5 - delay) / 0.5, 0.0, 1.0); t = t * t * (3.0 - 2.0 * t);
      vec3 p = mix(position + h3(aSeed) * vec3(6.0, 4.0, 9.0) + vec3(0.0, 5.0, 0.0), position, t);
      wp = modelMatrix * vec4(p, 1.0);
      float L = aLight + (1.0 - t) * t * 1.2 + 0.5 * exp(-pow((length(wp.xz - uScanC) - uScanR) / 1.6, 2.0));
      float fade = 1.0 - smoothstep(uFar * 0.15, uFar, dist); L *= 0.3 + 0.7 * fade;
      vSpark = twinkle(aSeed); vCol = look(L, wp.xyz); vA = 0.5 + 0.5 * fade;
      vec4 mv = viewMatrix * wp; gl_Position = projectionMatrix * mv;
      gl_PointSize = uSize * uPR * (0.7 + 0.6 * h1(aSeed + 2.0)) * (16.0 / max(-mv.z, 0.4)) * (1.0 + vSpark);
    }`);
  const pts = new THREE.Points(geometry, mat); pts.frustumCulled = false; pts.renderOrder = 2; return { points: pts, uniforms: u };
}

// ------------------------------------------------------------------------------------------------ wake foam and spray
// foam particles are spawned at the stern and along the two Kelvin arms (19.47° either side of the track), drift outward,
// ride the Gerstner surface in the vertex shader, and fade over their life
export function createWake(max = 24000) {
  const g = new THREE.BufferGeometry(), A = new Float32Array(max * 4), B = new Float32Array(max * 4), P = new Float32Array(max * 3);
  for (let i = 0; i < max; i++) A[i * 4 + 2] = -1e6;            // never spawned
  g.setAttribute("position", new THREE.BufferAttribute(P, 3)); g.setAttribute("aA", new THREE.BufferAttribute(A, 4)); g.setAttribute("aB", new THREE.BufferAttribute(B, 4));
  const u = lookUniforms({ uWA: { value: null }, uWB: { value: null }, uCam: { value: new THREE.Vector3() }, uFar: { value: 700 }, uPhoto: { value: 0 } });
  const mat = additive(u, GLSL_WAVES + GLSL_LOOK + /* glsl */ `
    attribute vec4 aA, aB; uniform vec3 uCam; uniform float uFar, uPhoto;
    varying vec3 vCol; varying float vA; varying float vSpark;
    void main() {
      float age = uTime - aA.z, life = aA.w; if (age < 0.0 || age > life) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; vA = 0.0; return; }
      vec2 xz = aA.xy + aB.xy * (1.0 - exp(-age * 0.6)) / 0.6; float dist = length(xz - uCam.xz);
      vec3 P, N; float J; gerstner(xz, dist, P, N, J); P.y += 0.04;
      float k = 1.0 - age / life, L = 0.35 + 0.65 * k * k * aB.w;
      float fade = 1.0 - smoothstep(uFar * 0.06, uFar, dist);
      vSpark = twinkle(aB.z) * k; vCol = uPhoto > 0.5 ? vec3(0.9, 0.93, 0.95) * (0.25 + 0.75 * k) : look(L, P); vA = k * (0.3 + 0.7 * fade) * (uPhoto > 0.5 ? 0.35 : 1.0);
      vec4 mv = viewMatrix * vec4(P, 1.0); gl_Position = projectionMatrix * mv;
      gl_PointSize = uSize * uPR * (0.8 + 0.8 * h1(aB.z)) * (1.0 + age * 0.08) * (20.0 / max(-mv.z, 0.5)) * (1.0 + vSpark);
    }`);
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false; pts.renderOrder = 3;
  let head = 0;
  const emit = (x, z, dx, dz, t, life, bright) => {
    const i = head; head = (head + 1) % max;
    A[i * 4] = x; A[i * 4 + 1] = z; A[i * 4 + 2] = t; A[i * 4 + 3] = life; B[i * 4] = dx; B[i * 4 + 1] = dz; B[i * 4 + 2] = Math.random() * 1000; B[i * 4 + 3] = bright;
  };
  let acc = 0;
  // called every frame with the boat's stern position, heading vectors and speed
  const update = (stern, fwd, side, speed, beam, t, dt) => {
    const v = Math.max(0, speed); acc += dt * (v * 220 + 6); const n = Math.min(500, Math.floor(acc)); acc -= n; if (n <= 0) return;
    const tanK = 0.354, travel = v * dt;
    for (let i = 0; i < n; i++) {
      // spread this frame's foam along the distance travelled since the last frame, so the trail is continuous
      const r = Math.random(), back = Math.random() * travel, x0 = stern.x - fwd.x * back, z0 = stern.z - fwd.z * back, t0 = t - back / Math.max(v, 0.1);
      if (r < 0.5) {   // the churned centre: prop wash, spreading slowly
        const off = (Math.random() - 0.5) * beam * 0.8, sp = (Math.random() - 0.5) * 0.6, aft = Math.random() * 1.5;
        emit(x0 + side.x * off - fwd.x * aft, z0 + side.z * off - fwd.z * aft, side.x * sp - fwd.x * 0.3, side.z * sp - fwd.z * 0.3, t0, 9 + Math.random() * 7, 1.0);
      } else {         // the Kelvin arms: drift outward at speed·tan(19.47°)
        const sgn = r < 0.75 ? 1 : -1, lat = v * tanK * (0.85 + Math.random() * 0.3), off = sgn * beam * 0.45;
        emit(x0 + side.x * off, z0 + side.z * off, side.x * sgn * lat, side.z * sgn * lat, t0, 7 + Math.random() * 6, 0.75);
      }
    }
    for (const k of ["aA", "aB"]) g.attributes[k].needsUpdate = true;
  };
  return { points: pts, uniforms: u, update };
}

// bow spray: a few hundred ballistic droplets thrown from the bow shoulders when the boat is fast or slams
export function createSpray(max = 900) {
  const g = new THREE.BufferGeometry(), P = new Float32Array(max * 3), S = new Float32Array(max), L = new Float32Array(max);
  for (let i = 0; i < max; i++) P[i * 3 + 1] = -1e5;
  g.setAttribute("position", new THREE.BufferAttribute(P, 3)); g.setAttribute("aSeed", new THREE.BufferAttribute(S, 1)); g.setAttribute("aLife", new THREE.BufferAttribute(L, 1));
  const u = lookUniforms({ uPhoto: { value: 0 } });
  const mat = additive(u, GLSL_LOOK + /* glsl */ `
    attribute float aSeed, aLife; uniform float uPhoto; varying vec3 vCol; varying float vA; varying float vSpark;
    void main() { vec4 mv = viewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; vSpark = twinkle(aSeed) * aLife;
      vCol = uPhoto > 0.5 ? vec3(0.95) : look(0.55 + 0.45 * aLife, position); vA = aLife * (uPhoto > 0.5 ? 0.5 : 1.0);
      gl_PointSize = uSize * uPR * (0.7 + 0.8 * h1(aSeed)) * (14.0 / max(-mv.z, 0.5)) * (1.0 + vSpark) * step(0.001, aLife); }`);
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false; pts.renderOrder = 4;
  const vel = new Float32Array(max * 3), age = new Float32Array(max).fill(99), life = new Float32Array(max).fill(1); let head = 0, acc = 0;
  const update = (bowL, bowR, fwd, boatVel, speed, slam, dt) => {
    acc += dt * Math.max(0, (speed - 4) * 24 + slam * 300); let n = Math.min(120, Math.floor(acc)); acc -= n;
    while (n-- > 0) { const i = head; head = (head + 1) % max; const bow = Math.random() < 0.5 ? bowL : bowR, out = bow === bowL ? -1 : 1;
      P[i * 3] = bow.x; P[i * 3 + 1] = bow.y; P[i * 3 + 2] = bow.z;
      const up = 1.5 + Math.random() * 3 + slam * 3, sideSpeed = 1 + Math.random() * 3;
      vel[i * 3] = boatVel.x * 0.6 + bow.sx * out * sideSpeed + (Math.random() - 0.5); vel[i * 3 + 1] = up; vel[i * 3 + 2] = boatVel.z * 0.6 + bow.sz * out * sideSpeed + (Math.random() - 0.5);
      age[i] = 0; life[i] = 0.7 + Math.random() * 0.9; S[i] = Math.random() * 1000; }
    for (let i = 0; i < max; i++) { if (age[i] > life[i]) { L[i] = 0; continue; } age[i] += dt; vel[i * 3 + 1] -= 9.81 * dt; P[i * 3] += vel[i * 3] * dt; P[i * 3 + 1] += vel[i * 3 + 1] * dt; P[i * 3 + 2] += vel[i * 3 + 2] * dt; L[i] = Math.max(0, 1 - age[i] / life[i]); }
    g.attributes.position.needsUpdate = true; g.attributes.aSeed.needsUpdate = true; g.attributes.aLife.needsUpdate = true;
  };
  return { points: pts, uniforms: u, update };
}

// the plum ground behind everything: deep plum with a soft radial lift
export function createBackdrop() {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    depthTest: false, depthWrite: false, toneMapped: false,
    uniforms: { uA: { value: lin("#21121F") }, uB: { value: lin("#2E1A2C") }, uC: { value: new THREE.Vector2(0.62, 0.42) } },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.9999, 1.0); }`,
    fragmentShader: `uniform vec3 uA, uB; uniform vec2 uC; varying vec2 vUv; void main() { float d = length((vUv - uC) * vec2(1.6, 1.0)); gl_FragColor = vec4(mix(uB, uA, smoothstep(0.0, 0.85, d)), 1.0); }`,
  }));
  m.frustumCulled = false; m.renderOrder = -10; return m;
}
