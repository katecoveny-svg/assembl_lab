// assembl lab · Friday night on the Viaduct: the waterfront as a point cloud, drawn by the shared engine (lab/pc/engine.js) from the baked
// open-data points (tools/pointcloud/bake-viaduct.mjs), plus three layers in the same look that the night drives: the city's lights
// (windows, street lights, their reflections in the basin), the people (guests walking the real promenade routes, the waitlist waiting
// nearby, diners at the Example restaurant's tables, and the Friday crowd), and the rain. The layers share the engine's own uniforms,
// so they sway, tilt, fade with depth and shimmer exactly as the map does.
import * as THREE from "three";
import { createEngine, makeForm, GLSL_TONES, ADDITIVE_PREMULTIPLIED, rng } from "/lab/pc/engine.js";
import { TABLES } from "./sim.js";

const BASE = "/assets/models/viaduct/viaduct-points";
const Q = new URLSearchParams(location.search);   // ?yaw= ?tilt= for framing experiments
export const YAW = Math.PI + (Q.has("yaw") ? +Q.get("yaw") : -0.35);    // seen from over the harbour to the north-west: the basin in front, the city and the Sky Tower rising behind
export const TILT = Q.has("tilt") ? +Q.get("tilt") : 0.56;

// ------------------------------------------------------------------------------------------------ the baked points
export async function loadViaduct(n, nLights) {
  const h = await fetch(BASE + ".json").then((r) => { if (!r.ok) throw new Error("viaduct header " + r.status); return r.json(); });
  const want = Math.min(n, h.count), wantL = Math.min(nLights, h.lights.count), stride = h.stride;
  const whole = want >= h.count * 0.7;
  let buf = await fetch(BASE + ".bin", whole ? {} : { headers: { Range: `bytes=0-${want * stride - 1}` } }).then((r) => { if (!r.ok) throw new Error("viaduct points " + r.status); return r.arrayBuffer(); });
  let lightsBuf = buf, lightsAt = h.lights.offset * stride;
  if (buf.byteLength < (h.lights.offset + wantL) * stride) {   // a server that honours Range: ask for the lights' prefix too
    lightsBuf = await fetch(BASE + ".bin", { headers: { Range: `bytes=${lightsAt}-${lightsAt + wantL * stride - 1}` } }).then((r) => r.arrayBuffer());
    if (lightsBuf.byteLength > wantL * stride * 1.5) lightsAt = h.lights.offset * stride; else lightsAt = 0;
  }
  const c = Math.cos(YAW), s = Math.sin(YAW);
  const rot = (x, z) => [c * x + s * z, -s * x + c * z];
  const [x0, x1] = h.bounds.x, [y0, y1] = h.bounds.y, [z0, z1] = h.bounds.z, q = 1 / 65535;
  const read = (b, at, i) => { const v = new DataView(b), o = at + i * stride; const x = x0 + (x1 - x0) * v.getUint16(o, true) * q, y = y0 + (y1 - y0) * v.getUint16(o + 2, true) * q, z = z0 + (z1 - z0) * v.getUint16(o + 4, true) * q; const [rx, rz] = rot(x, z); return [rx, y, rz, v.getUint8(o + 6) / 255, v.getUint8(o + 7)]; };
  const got = Math.min(want, Math.floor(buf.byteLength / stride)), f = makeForm(got);
  for (let i = 0; i < got; i++) { const p = read(buf, 0, i); f.pos[i * 3] = p[0]; f.pos[i * 3 + 1] = p[1]; f.pos[i * 3 + 2] = p[2]; f.light[i] = p[3]; f.kind[i] = p[4]; }
  const L = { n: wantL, pos: new Float32Array(wantL * 3), light: new Float32Array(wantL), kind: new Float32Array(wantL) };
  for (let i = 0; i < wantL; i++) { const p = read(lightsBuf, lightsAt, i); L.pos.set(p.slice(0, 3), i * 3); L.light[i] = p[3]; L.kind[i] = p[4]; }
  const R = (p) => { const [rx, rz] = rot(p[0], p[2]); return [rx, p[1], rz]; };
  f.anchors = Object.fromEntries(Object.entries(h.anchors).map(([k, a]) => [k, R(a)]));
  const route = (r) => { const pts = r.pts.map(R), cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][2] - pts[i - 1][2])); return { pts, cum, len: cum[cum.length - 1], lengthM: r.lengthM }; };
  const routes = { east: route(h.routes.east), west: route(h.routes.west), south: route(h.routes.south), toWait: route(h.routes.toWait), ambient: h.routes.ambient.map(route) };
  const out = h.restaurant.outline.map(R);
  const S = 1 / h.metresPerUnit, [Lm, Dm, deck] = h.restaurant.sizeM;
  const A = [(out[1][0] - out[0][0]) / Lm, (out[1][2] - out[0][2]) / Lm], W = [(out[3][0] - out[0][0]) / (Dm + deck), (out[3][2] - out[0][2]) / (Dm + deck)];
  const O = [out[0][0] + A[0] * Lm / 2 + W[0] * Dm / 2, out[0][2] + A[1] * Lm / 2 + W[1] * Dm / 2], gy = out[0][1];
  const plan = (u, v, up = 1.2) => [O[0] + A[0] * u + W[0] * v, gy + up * S, O[1] + A[1] * u + W[1] * v];   // plan metres → map units
  const bounds = { x: [Infinity, -Infinity], z: [Infinity, -Infinity] }; for (let i = 0; i < got; i += 50) { const x = f.pos[i * 3], z = f.pos[i * 3 + 2]; bounds.x = [Math.min(bounds.x[0], x), Math.max(bounds.x[1], x)]; bounds.z = [Math.min(bounds.z[0], z), Math.max(bounds.z[1], z)]; }
  return { form: f, lights: L, header: h, routes, plan, S, bounds };
}

// ------------------------------------------------------------------------------------------------ the layers' shader (the engine's look)
const LAYER_V = /* glsl */ `
attribute float aLight, aKind, aSeed, aSize;
uniform float uTime, uSize, uPR, uNear, uFar, uScaleB, uTiltB, uSway, uShow, uNight, uDusk, uRain, uReduce;
uniform vec3 uOffB; uniform float uMode;
varying vec3 vCol; varying float vAlpha;
float h1(float n) { return fract(sin(n) * 43758.5453123); }
vec3 pose(vec3 q, float tilt) { float c = cos(uSway), s = sin(uSway); q = vec3(c * q.x + s * q.z, q.y, -s * q.x + c * q.z); float ct = cos(tilt), st = sin(tilt); return vec3(q.x, ct * q.y - st * q.z, st * q.y + ct * q.z); }
${GLSL_TONES}
void main() {
  vec3 q = position; float L = aLight, on = 1.0, size = aSize;
  if (uMode < 0.5) {                                   // the city's lights
    if (aKind < 10.5) { on = step(h1(aSeed * 3.7), uNight); L *= 0.92 + 0.08 * sin(uTime * 0.7 + aSeed * 30.0) * (1.0 - uReduce); }
    else if (aKind < 11.5) { float k = h1(aSeed * 5.1) * 0.6; on = smoothstep(k, k + 0.12, uDusk); }
    else { on = uDusk * (uReduce > 0.5 ? 0.75 : 0.55 + 0.45 * sin(uTime * 1.9 + aSeed * 47.0)); size *= 0.8; }
  } else if (uMode > 1.5) {                            // the rain: drops falling through the night air, faint
    float sp = 0.16 + 0.1 * h1(aSeed * 9.1);
    q.y = 0.42 * (1.0 - fract(aSeed * 7.3 + uTime * sp * (1.0 - uReduce))) + aKind * 0.009;    // three points a drop: a short streak
    on = uRain * step(h1(aSeed * 2.3), uRain * 1.2) * (1.0 - aKind * 0.3);
  }
  vec3 p = pose(q * uScaleB, uTiltB) + uOffB;
  vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
  float dist = -mv.z, fade = clamp(1.15 - (dist - uNear) / max(uFar - uNear, 0.01), 0.35, 1.0);
  vCol = pcLook(L * (0.7 + 0.3 * fade), uTime * 0.025 + p.x * 0.55 + p.y * 0.35 + aSeed * 0.15);
  vAlpha = on * uShow * (0.6 + 0.4 * fade);
  gl_PointSize = on < 0.01 ? 0.0 : uSize * uPR * size * (0.8 + 0.4 * h1(aSeed * 13.7)) / max(dist, 0.05);
}`;
const LAYER_F = /* glsl */ `
varying vec3 vCol; varying float vAlpha;
void main() { vec2 c = gl_PointCoord - 0.5; float a = (1.0 - smoothstep(0.26, 0.5, length(c))) * vAlpha; if (a < 0.01) discard; gl_FragColor = vec4(vCol * a, a); }`;

function layer(engine, n, mode, extra = {}) {
  const U = engine.uniforms, geo = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 3), light = new Float32Array(n), kind = new Float32Array(n), seed = new Float32Array(n), size = new Float32Array(n).fill(1);
  const r = rng(77 + mode * 13); for (let i = 0; i < n; i++) seed[i] = r();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("aLight", new THREE.BufferAttribute(light, 1)); geo.setAttribute("aKind", new THREE.BufferAttribute(kind, 1));
  geo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1)); geo.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
  const uniforms = { uTime: U.uTime, uSize: U.uSize, uPR: U.uPR, uNear: U.uNear, uFar: U.uFar, uScaleB: U.uScaleB, uTiltB: U.uTiltB, uSway: U.uSway, uOffB: U.uOffB, uReduce: U.uReduce,
    uShow: { value: 0 }, uNight: { value: 0 }, uDusk: { value: 0 }, uRain: { value: 0 }, uMode: { value: mode }, ...extra };
  const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: LAYER_V, fragmentShader: LAYER_F, ...ADDITIVE_PREMULTIPLIED });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; engine.group.add(pts);
  return { geo, pos, light, kind, seed, size, uniforms, pts, n };
}

// ------------------------------------------------------------------------------------------------ the map
export function createMap(canvas, { reduce = false, phone = false, clear = false } = {}) {
  const budget = phone ? 72000 : 285000;
  const engine = createEngine(canvas, { budget, reduceMotion: reduce, sizeScale: phone ? 1.05 : 1, clear });
  engine.camera.position.set(0, 0.62, 3.3); engine.camera.lookAt(0, 0.2, 0);
  return { engine, budget, nLights: phone ? 7000 : 22402, nPeople: phone ? 1100 : 2600, nRain: phone ? 2600 : 7500 };
}

// position along a route at distance d (units), with a sideways offset (units) so a party walks side by side
function along(r, d, side = 0, rev = false) {
  d = Math.max(0, Math.min(r.len, rev ? r.len - d : d));
  let lo = 0, hi = r.cum.length - 1; while (lo < hi - 1) { const mid = (lo + hi) >> 1; if (r.cum[mid] <= d) lo = mid; else hi = mid; }
  const a = r.pts[lo], b = r.pts[hi], seg = r.cum[hi] - r.cum[lo] || 1, t = (d - r.cum[lo]) / seg;
  const dx = b[0] - a[0], dz = b[2] - a[2], l = Math.hypot(dx, dz) || 1;
  return [a[0] + dx * t - (dz / l) * side, a[1] + (b[1] - a[1]) * t, a[2] + dz * t + (dx / l) * side];
}

export function attachNight(map, data, { reduce = false } = {}) {
  const { engine } = map, S = data.S, MIN_PER_M = 1 / 1.25 / 60;   // walking 1.25 m/s
  // the lights
  const lights = layer(engine, data.lights.n, 0); lights.pos.set(data.lights.pos); lights.light.set(data.lights.light); lights.kind.set(data.lights.kind);
  for (let i = 0; i < data.lights.n; i++) lights.size[i] = data.lights.kind[i] === 10 ? 0.85 : data.lights.kind[i] === 11 ? 1.5 : 1.1;
  // the rain: drops over the map, more over the water and promenade in front
  const rain = layer(engine, map.nRain, 2); const rr = rng(91);
  for (let i = 0; i < map.nRain; i += 3) { const x = data.bounds.x[0] + rr() * (data.bounds.x[1] - data.bounds.x[0]), z = data.bounds.z[0] + rr() * (data.bounds.z[1] - data.bounds.z[0]), L = 0.5 + rr() * 0.22, sd = rr();
    for (let k = 0; k < 3 && i + k < map.nRain; k++) { const j = i + k; rain.pos[j * 3] = x; rain.pos[j * 3 + 2] = z; rain.light[j] = L; rain.size[j] = 0.85; rain.kind[j] = k; rain.seed[j] = sd; } }
  rain.geo.attributes.aSeed.needsUpdate = rain.geo.attributes.aKind.needsUpdate = true;
  // the people: rewritten every frame from the night
  const people = layer(engine, map.nPeople, 1); people.pos.fill(0); people.geo.setDrawRange(0, 0);
  for (const L of [lights, rain]) L.geo.attributes.position.needsUpdate = true;
  people.geo.attributes.position.setUsage(THREE.DynamicDrawUsage); people.geo.attributes.aLight.setUsage(THREE.DynamicDrawUsage); people.geo.attributes.aSize.setUsage(THREE.DynamicDrawUsage);
  const R = data.routes, walkM = (r) => r.lengthM * MIN_PER_M;
  const tablePos = Object.fromEntries(TABLES.map((tb) => [tb.id, tb]));
  const pr = rng(5);
  const amb = Array.from({ length: Math.floor(map.nPeople * 0.42) }, (_, i) => ({ r: R.ambient[i % R.ambient.length], ph: pr(), sp: 0.85 + pr() * 0.35, rev: pr() < 0.5, side: (pr() - 0.5) * 4 * S, k: pr() }));
  const crowd = (t, wet) => { const c = 0.22 + 0.78 * Math.max(0, Math.min(1, (t - 0) / 220)) * (t > 300 ? Math.max(0.35, 1 - (t - 300) / 160) : 1); return c * (1 - 0.7 * wet); };

  function update(night, t, now) {
    let k = 0; const P = people.pos, Lt = people.light, Z = people.size, max = people.n;
    const put = (p, l, z = 5.5) => { if (k >= max) return; P[k * 3] = p[0]; P[k * 3 + 1] = p[1]; P[k * 3 + 2] = p[2]; Lt[k] = l; Z[k] = z; k++; };
    const jit = (i, j) => (((i * 9301 + j * 49297) % 233280) / 233280 - 0.5);
    const wet = night.rainAt(t);
    for (const p of night.parties) {
      if (p.arrive == null) continue;
      const route = R[p.route] || R.east, walk = walkM(route), wk = p.kind === "walkin";
      const lightOf = wk ? 1 : 0.9;
      const party = (pos, l, spread = 1.1) => { for (let j = 0; j < Math.min(p.size, 12); j++) put([pos[0] + jit(p.id, j) * spread * S * 2.2, pos[1], pos[2] + jit(j, p.id) * spread * S * 2.2], l); };
      // walking in along the promenade
      if (t >= p.arrive - walk && t < p.arrive) { const d = ((t - (p.arrive - walk)) / walk) * route.len, side = jit(p.id, 7) * 3 * S; party(along(route, d, side), lightOf); for (let k = 1; k <= 4; k++) put(along(route, d - k * 7 * S, side), lightOf * (0.75 - k * 0.12), 4.2 - k * 0.5); continue; }
      if (t < p.arrive) continue;
      // turned away or chose not to wait: back the way they came
      if ((p.state === "lost" || p.state === "toolate") && p.balked !== false && p.lostAt != null && !p.reneged) { if (t < p.lostAt + 4) party(along(route, ((t - p.lostAt) / walk) * route.len, 2 * S, true), 0.7); continue; }
      // the waitlist: off to wait nearby, back when the table is close
      if (p.joinAt != null) {
        const tw = walkM(R.toWait), back = p.returnAt ?? p.calledAt ?? Infinity;
        if (t < p.joinAt + tw && t < back) { party(along(R.toWait, ((t - p.joinAt) / tw) * R.toWait.len), lightOf); continue; }
        if (t < back && t < (p.lostAt ?? Infinity)) { const a = now / 1000; const c = R.toWait.pts[R.toWait.pts.length - 1]; for (let j = 0; j < Math.min(p.size, 12); j++) { const ang = jit(p.id, j) * 6.28 + (reduce ? 0 : a * 0.08 * (j % 2 ? 1 : -1)), rad = (6 + 11 * Math.abs(jit(j, p.id + 3))) * S; put([c[0] + Math.cos(ang + p.id) * rad, c[1], c[2] + Math.sin(ang + p.id) * rad], 0.93 + 0.07 * Math.sin(a * 1.3 + p.id), 6); } continue; }
        if (p.reneged && t < p.lostAt + 5) { party(along(R.east, R.east.len - 110 * S - ((t - p.lostAt) / walkM(R.east)) * R.east.len, 2 * S), 0.62); continue; }
        if (t >= back && t < back + tw && (p.seatedAt == null || t < p.seatedAt + 0.5)) { party(along(R.toWait, ((t - back) / tw) * R.toWait.len, 0, true), 0.98); continue; }
      }
      // at the table: a glint per diner at their table in the Example restaurant (the deck empties when the rain comes)
      if (p.seatedAt != null && t >= p.seatedAt && t < (p.leaveAt ?? Infinity)) {
        const tb = tablePos[latest(night, p, t) || p.table]; if (!tb) continue;
        for (let j = 0; j < Math.min(p.size, 12); j++) { const a = (j / Math.max(1, p.size)) * 6.283; put(data.plan(tb.u + Math.cos(a) * 0.9, tb.v + Math.sin(a) * 0.7, 1.1), 0.86, 2.6); }
        continue;
      }
      // leaving: out along their route
      if (p.leaveAt != null && t >= p.leaveAt && t < p.leaveAt + walk) { const r2 = [R.east, R.south, R.west][p.id % 3]; party(along(r2, ((t - p.leaveAt) / walkM(r2)) * r2.len, -2 * S, true), 0.6); }
    }
    // the Friday crowd on the waterfront (fewer in the rain)
    const n = Math.floor(amb.length * crowd(t, wet));
    for (let i = 0; i < n; i++) { const a = amb[i], d = ((a.ph + (t * a.sp * 75 * S) / a.r.len) % 1) * a.r.len; put(along(a.r, d, a.side, a.rev), 0.5 + 0.22 * a.k, 3.4); }
    people.geo.setDrawRange(0, k);
    people.geo.attributes.position.needsUpdate = people.geo.attributes.aLight.needsUpdate = people.geo.attributes.aSize.needsUpdate = true;
    // the night: dusk (street lights on around sunset), windows lighting up into the evening and going out toward midnight, the rain
    const ss = night.sunset ?? 190, dusk = Math.max(0, Math.min(1, (t - (ss - 40)) / 70));
    const nightF = Math.min(0.78, 0.22 + 0.56 * Math.max(0, Math.min(1, (t - 40) / 200))) * (t > 330 ? Math.max(0.42, 1 - (t - 330) / 200) : 1);
    for (const L of [lights, people, rain]) { L.uniforms.uDusk.value = dusk; L.uniforms.uNight.value = nightF; L.uniforms.uRain.value = wet; }
    return { count: k };
  }
  const show = (v) => { for (const L of [lights, people, rain]) L.uniforms.uShow.value = v; };
  return { update, show, people, lights, rain };
}
// which table a party is at, at a moment (they can move inside when the deck closes)
function latest(night, p, t) { let best = null, at = -1; for (const tb of night.tables) for (const g of tb.seg) if (g.party === p.id && g.from <= t && g.from >= at) { at = g.from; best = tb.id; } return best; }

// ------------------------------------------------------------------------------------------------ framing (as the lab home's hero)
export function fitter(engine, form, tilt = TILT) {
  const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), hit = new THREE.Vector3();
  const sample = []; for (let i = 0; i < form.n; i += Math.max(1, Math.floor(form.n / 6000))) if (form.kind[i] !== 2 || i % 3 === 0) sample.push([form.pos[i * 3], form.pos[i * 3 + 1], form.pos[i * 3 + 2]]);
  const worldAt = (sx, sy, el) => { const w = el.clientWidth, h = el.clientHeight; engine.camera.updateMatrixWorld(); ray.setFromCamera(new THREE.Vector2((sx / w) * 2 - 1, -(sy / h) * 2 + 1), engine.camera); ray.ray.intersectPlane(plane, hit); return [hit.x, hit.y, 0]; };
  function fit(r, el, pad = 0.96) {
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2; let offset = worldAt(cx, cy, el), scale = Math.abs(worldAt(r.right, cy, el)[0] - worldAt(r.left, cy, el)[0]) / 2.1;
    const box = () => { const xs = [], ys = []; for (const p of core || sample) { const q = engine.project(p, { offset, scale, tilt }); xs.push(q.x); ys.push(q.y); } xs.sort((a, b) => a - b); ys.sort((a, b) => a - b); const at = (v, t) => v[Math.floor(t * (v.length - 1))]; return { x0: at(xs, 0.003), x1: at(xs, 0.997), y0: at(ys, 0.003), y1: at(ys, 0.997) }; };
    for (let pass = 0; pass < 4; pass++) {
      let b = box(); scale *= Math.min((r.width * pad) / (b.x1 - b.x0), (r.height * pad) / (b.y1 - b.y0)); b = box();
      const a = worldAt((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, el), t = worldAt(cx, cy, el); offset = [offset[0] + t[0] - a[0], offset[1] + t[1] - a[1], 0];
    }
    return { offset, scale, tilt, box: box() };
  }
  // fit a core of the map instead of all of it: the outskirts run on under the panels and fade out
  let core = null;
  const useCore = (anchors, margin) => { const xs = anchors.map((a) => a[0]), zs = anchors.map((a) => a[2]); const b = [Math.min(...xs) - margin, Math.max(...xs) + margin, Math.min(...zs) - margin, Math.max(...zs) + margin];
    core = sample.filter((p) => p[0] >= b[0] && p[0] <= b[1] && p[2] >= b[2] && p[2] <= b[3]); core.push(...anchors); };
  function scanRange(pl) { const ct = Math.cos(pl.tilt), st = Math.sin(pl.tilt); let a = Infinity, b = -Infinity; for (const p of sample) { const y = pl.offset[1] + pl.scale * (ct * p[1] - st * p[2]); if (y < a) a = y; if (y > b) b = y; } return [a - 0.03, b + 0.03]; }
  return { fit, scanRange, sample, useCore };
}
