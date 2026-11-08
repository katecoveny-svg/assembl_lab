// assembl lab · Friday night on the Viaduct: the Example restaurant's floor plan as a point cloud (the shared engine, lab/pc/engine.js),
// drawn from the sim's own table list. It assembles once; then each table lights up by its state on the night: seated, waiting for
// food, late, eating, clearing, held, booked, closed. Fictional, drawn: the page labels it so.
import * as THREE from "three";
import { createEngine, makeForm, KIND, GLSL_TONES, ADDITIVE_PREMULTIPLIED, rng } from "/lab/pc/engine.js";
import { TABLES } from "./sim.js";

const SC = 1 / 30;            // plan metres → engine units (the pavilion and deck are about 24 m by 20 m)
export const STATE_LIGHT = { free: 0.2, booked: 0.42, held: 0.6, seated: 0.86, waiting: 0.72, late: 0.98, eating: 0.9, clearing: 0.34, closed: 0.05, awning: 0.58 };

// the plan's static parts: floor, walls and glass, kitchen and pass, bar, the deck's balustrade and awning, the water's edge
export function planForm(n, flip = 1) {
  const r = rng(31), f = makeForm(n); let k = 0;
  const P = (u, v, y, L, kind) => { if (k >= n) return; f.pos[k * 3] = u * SC * flip; f.pos[k * 3 + 1] = y * SC; f.pos[k * 3 + 2] = v * SC; f.light[k] = L; f.kind[k] = kind; k++; };
  const line = (u0, v0, u1, v1, cnt, L, y = 0.05, kind = KIND.edge, jit = 0.04) => { for (let i = 0; i < cnt; i++) { const t = r(); P(u0 + (u1 - u0) * t + (r() - 0.5) * jit, v0 + (v1 - v0) * t + (r() - 0.5) * jit, y + r() * 0.05, L * (0.9 + 0.2 * r()), kind); } };
  const rect = (u0, v0, u1, v1, cnt, L, y) => { const per = 2 * (Math.abs(u1 - u0) + Math.abs(v1 - v0)); line(u0, v0, u1, v0, Math.round(cnt * Math.abs(u1 - u0) / per), L, y); line(u1, v0, u1, v1, Math.round(cnt * Math.abs(v1 - v0) / per), L, y); line(u1, v1, u0, v1, Math.round(cnt * Math.abs(u1 - u0) / per), L, y); line(u0, v1, u0, v0, Math.round(cnt * Math.abs(v1 - v0) / per), L, y); };
  const fill = (u0, v0, u1, v1, cnt, L, y = 0, kind = KIND.ground) => { for (let i = 0; i < cnt; i++) P(u0 + (u1 - u0) * r(), v0 + (v1 - v0) * r(), y, L * (0.8 + 0.4 * r()), kind); };
  const N = (x) => Math.round(n * x);
  fill(-12, -6, 12, 6, N(0.08), 0.06);                                   // the floor
  for (let u = -12; u <= 12; u += 1.2) line(u, 6.2, u, 13, 18, 0.11, 0, KIND.ground, 0.02);   // deck boards
  line(-12, -6, 5.6, -6, N(0.05), 0.62); line(7.8, -6, 12, -6, N(0.016), 0.62);                 // the back wall, with the door
  line(-12, -6, -12, 6, N(0.035), 0.62); line(12, -6, 12, 6, N(0.035), 0.62);                  // the end walls
  for (let u = -12; u < 12; u += 2.4) line(u + 0.2, 6, u + 2.2, 6, N(0.007), 0.52);              // the glass front, in panes
  for (let y = 0; y < 3; y += 0.6) line(-12, -6, -12, -6, 30, 0.7, y, KIND.edge, 0.01);           // corner posts
  rect(-12, -6, -5, -2.6, N(0.05), 0.5);                                                          // the kitchen
  fill(-11.6, -5.6, -5.4, -3.0, N(0.03), 0.24, 0.9, KIND.surface);                                 //   its benches
  line(-11.6, -2.6, -5.2, -2.6, N(0.05), 0.95, 1.0, KIND.highlight, 0.03);                         //   the pass, where the plates go out
  rect(4.2, -5.4, 11.4, -4.4, N(0.03), 0.62, 1.1);                                                 // the bar
  for (let u = 4.8; u <= 11; u += 1.0) fill(u - 0.12, -3.95, u + 0.12, -3.7, 14, 0.4, 0.7, KIND.surface);   //   its stools
  line(-12, 13, 12, 13, N(0.04), 0.58, 0.9); line(-12, 6, -12, 13, N(0.012), 0.5, 0.9); line(12, 6, 12, 13, N(0.012), 0.5, 0.9);   // the balustrade
  line(-12, 6.1, 12, 6.1, N(0.012), 0.44, 3.0); line(-12, 12.6, 12, 12.6, N(0.012), 0.44, 3.0);   // the awning frame
  line(-12.5, 14.2, 12.5, 14.2, N(0.03), 0.46, -0.4);   // the wharf's edge
  line(5.6, -6.6, 7.8, -6.6, 40, 0.8, 0.02);                                                       // the door's threshold
  // tables' outlines and chairs (their state glow is the live layer)
  for (const tb of TABLES) {
    const w = tb.w || (tb.seats >= 4 ? 1.9 : 1.1), d = tb.round ? 2.2 : tb.seats >= 4 ? 1.3 : 1.0, y = tb.high ? 1.05 : 0.75;
    if (tb.round) { for (let i = 0; i < 160; i++) { const a = r() * 6.283; P(tb.u + Math.cos(a) * 1.15, tb.v + Math.sin(a) * 1.15, y, 0.34, KIND.edge); } }
    else rect(tb.u - w / 2, tb.v - d / 2, tb.u + w / 2, tb.v + d / 2, 110, 0.32, y);
  }
  while (k < n) P(-12 + 24 * r(), -6 + 12 * r(), 0, 0.05, KIND.ground);
  f.anchors = { pass: [-8.4 * SC * flip, 1.0 * SC, -2.6 * SC], bar: [7.8 * SC * flip, 1.1 * SC, -4.9 * SC], deck: [0, 0.2 * SC, 10.5 * SC], door: [6.7 * SC * flip, 0, -6.6 * SC], kitchen: [-8.5 * SC * flip, 0.9 * SC, -4.3 * SC] };
  return f;
}

// table glows and diners: positions fixed, light written per frame from the night's floor
const GLOW_V = /* glsl */ `
attribute float aLight, aSeed, aPulse;
uniform float uTime, uSize, uPR, uNear, uFar, uScaleB, uTiltB, uSway, uShow, uReduce; uniform vec3 uOffB;
varying vec3 vCol; varying float vAlpha;
float h1(float n) { return fract(sin(n) * 43758.5453123); }
vec3 pose(vec3 q, float tilt) { float c = cos(uSway), s = sin(uSway); q = vec3(c * q.x + s * q.z, q.y, -s * q.x + c * q.z); float ct = cos(tilt), st = sin(tilt); return vec3(q.x, ct * q.y - st * q.z, st * q.y + ct * q.z); }
${GLSL_TONES}
void main() {
  vec3 p = pose(position * uScaleB, uTiltB) + uOffB;
  float pulse = aPulse * (uReduce > 0.5 ? 0.5 : 0.5 + 0.5 * sin(uTime * 3.2 + aSeed * 6.0));
  float L = clamp(aLight * (1.0 - 0.35 * aPulse) + pulse * 0.35, 0.0, 1.0);
  vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
  float dist = -mv.z;
  vCol = pcLook(L, uTime * 0.03 + p.x * 0.8 + aSeed * 0.2);
  vAlpha = uShow * smoothstep(0.02, 0.12, aLight);
  gl_PointSize = uSize * uPR * (2.0 + 0.8 * h1(aSeed * 13.7)) / max(dist, 0.05);
}`;
const GLOW_F = /* glsl */ `varying vec3 vCol; varying float vAlpha; void main() { vec2 c = gl_PointCoord - 0.5; float a = (1.0 - smoothstep(0.26, 0.5, length(c))) * vAlpha; if (a < 0.01) discard; gl_FragColor = vec4(vCol * a, a); }`;

export function createPlan(canvas, { reduce = false, phone = false, flip = 1 } = {}) {
  const budget = phone ? 9000 : 15000;
  const engine = createEngine(canvas, { budget, reduceMotion: reduce, sizeScale: phone ? 0.55 : 0.5 });
  engine.camera.position.set(0, 2.55, 1.75); engine.camera.lookAt(0, 0, 0.1);
  engine.uniforms.uNear.value = 2.2; engine.uniforms.uFar.value = 4.2;
  const form = planForm(budget, flip);
  // glows: a disc of points per table (chairs round its edge), lit by the table's state
  const per = phone ? 46 : 64, r = rng(17), n = TABLES.length * per, geo = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 3), light = new Float32Array(n), seed = new Float32Array(n), pulse = new Float32Array(n), owner = new Int16Array(n);
  TABLES.forEach((tb, ti) => {
    for (let j = 0; j < per; j++) {
      const i = ti * per + j, chair = j < per * 0.4, a = r() * 6.283, rad = tb.round ? (chair ? 1.55 : Math.sqrt(r()) * 1.05) : 0;
      let u, v;
      if (tb.round) { u = tb.u + Math.cos(a) * rad; v = tb.v + Math.sin(a) * rad; }
      else { const w = tb.w || (tb.seats >= 4 ? 1.9 : 1.1), d = tb.seats >= 4 ? 1.3 : 1.0; if (chair) { const side = j % 2 ? 1 : -1; u = tb.u + (r() - 0.5) * w; v = tb.v + side * (d / 2 + 0.45); } else { u = tb.u + (r() - 0.5) * w * 0.9; v = tb.v + (r() - 0.5) * d * 0.9; } }
      pos[i * 3] = u * SC * flip; pos[i * 3 + 1] = (tb.high ? 1.1 : 0.8) * SC + (chair ? -0.3 * SC : 0); pos[i * 3 + 2] = v * SC; seed[i] = r(); owner[i] = ti * 2 + (chair ? 1 : 0);
    }
  });
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("aLight", new THREE.BufferAttribute(light, 1)); geo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1)); geo.setAttribute("aPulse", new THREE.BufferAttribute(pulse, 1));
  const U = engine.uniforms;
  const mat = new THREE.ShaderMaterial({ uniforms: { uTime: U.uTime, uSize: U.uSize, uPR: U.uPR, uNear: U.uNear, uFar: U.uFar, uScaleB: U.uScaleB, uTiltB: U.uTiltB, uSway: U.uSway, uOffB: U.uOffB, uReduce: U.uReduce, uShow: { value: 0 } }, vertexShader: GLOW_V, fragmentShader: GLOW_F, ...ADDITIVE_PREMULTIPLIED });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; engine.group.add(pts);
  function update(floor) {
    TABLES.forEach((tb, ti) => {
      const st = floor[ti]?.state || "free", base = STATE_LIGHT[st] ?? 0.2, occ = !!floor[ti]?.party && !["held", "booked"].includes(st);
      const p = st === "late" ? 1 : st === "waiting" ? 0.45 : st === "clearing" ? 0.6 : st === "held" ? 0.5 : 0, seatedN = occ ? Math.min(tb.seats, floor[ti].party.size) : 0;
      for (let j = 0; j < per; j++) {
        const i = ti * per + j, chair = owner[i] % 2 === 1;
        light[i] = chair ? (occ && (j / (per * 0.4)) < seatedN / tb.seats ? Math.min(1, base + 0.08) : base * 0.35) : base; pulse[i] = p;
      }
    });
    geo.attributes.aLight.needsUpdate = geo.attributes.aPulse.needsUpdate = true;
  }
  return { engine, form, update, show: (v) => (mat.uniforms.uShow.value = v), place: { offset: [0, -0.02, 0], scale: 1, tilt: 0.06 } };
}
