// Particle Studio · the GPU simulation and the point-cloud look.
// Every particle lives in two float textures (position + age, velocity + light) that ping-pong through one fragment shader each
// frame (WebGL2 render-to-texture, multiple render targets), so a million particles step on a laptop with no CPU loop. Emitters and
// morph targets arrive as textures sampled once on the CPU (shapes.js). The points are then drawn with the assembl point-cloud
// standard, in step with /lab/pc/engine.js: its tone ramp and iridescent highlights (GLSL_TONES), premultiplied additive
// accumulation with pile-up brightening, a half-size bloom, 2% sparkles, depth fade, size by light and distance, and its plum ground
// with a soft lift. The pipeline here adds what a studio needs on top: a trail (feedback) buffer, exposure, and stills at 1–4×.
import * as THREE from "three";
import { TONES, IRID, GROUND, LIFT, GLSL_TONES, ADDITIVE_PREMULTIPLIED } from "/lab/pc/engine.js";

const FIELD_ID = { curl: 1, turbulence: 2, vortex: 3, well: 4, repel: 5, orbit: 6, gravity: 7, wind: 8, drag: 9, attract: 10, spring: 11, flow: 12, flock: 13, contain: 14, scan: 15 };
export const MAX_FIELDS = 12, MAX_EMITTERS = 4, GRID = 32;
const vec = (hex) => { const c = { r: 0, g: 0, b: 0 }; new THREE.Color(hex).getRGB(c, THREE.SRGBColorSpace); return `vec3(${c.r.toFixed(4)}, ${c.g.toFixed(4)}, ${c.b.toFixed(4)})`; };

const NOISE = /* glsl */ `
float hash1(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float hash2(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
// value noise with its analytic gradient (quintic fade), so a curl costs three evaluations, not eighteen
vec4 noised(vec3 x) {
  vec3 i = floor(x), w = fract(x), u = w * w * w * (w * (w * 6.0 - 15.0) + 10.0), du = 30.0 * w * w * (w * (w - 2.0) + 1.0);
  float a = hash1(i), b = hash1(i + vec3(1, 0, 0)), c = hash1(i + vec3(0, 1, 0)), d = hash1(i + vec3(1, 1, 0)), e = hash1(i + vec3(0, 0, 1)), f = hash1(i + vec3(1, 0, 1)), g = hash1(i + vec3(0, 1, 1)), h = hash1(i + vec3(1, 1, 1));
  float k0 = a, k1 = b - a, k2 = c - a, k3 = e - a, k4 = a - b - c + d, k5 = a - c - e + g, k6 = a - b - e + f, k7 = -a + b + c - d + e - f - g + h;
  return vec4(-1.0 + 2.0 * (k0 + k1 * u.x + k2 * u.y + k3 * u.z + k4 * u.x * u.y + k5 * u.y * u.z + k6 * u.z * u.x + k7 * u.x * u.y * u.z),
    2.0 * du * vec3(k1 + k4 * u.y + k6 * u.z + k7 * u.y * u.z, k2 + k5 * u.z + k4 * u.x + k7 * u.z * u.x, k3 + k6 * u.x + k5 * u.y + k7 * u.x * u.y));
}
vec3 curl(vec3 p) { vec3 g1 = noised(p).yzw, g2 = noised(p + vec3(31.4, 7.7, 12.1)).yzw, g3 = noised(p + vec3(-9.2, 44.8, 3.3)).yzw; return vec3(g2.z - g3.y, g3.x - g1.z, g1.y - g2.x); }`;

const QUAD_V = `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const UPDATE = /* glsl */ `
precision highp float; precision highp sampler2D;
in vec2 vUv; layout(location = 0) out vec4 oPos; layout(location = 1) out vec4 oVel;
uniform sampler2D tPos, tVel, tEmit, tTargetA, tTargetB, tGrid0, tGrid1, tFlow;
uniform float uDt, uTime, uMorph, uReset, uNF, uGridOn, uFlowOn, uAttract;
uniform vec4 uF[${MAX_FIELDS}], uFP[${MAX_FIELDS}], uFD[${MAX_FIELDS}], uEm[${MAX_EMITTERS}], uEm2[${MAX_EMITTERS}];
${NOISE}
vec3 rnd3(vec2 s, float k) { return vec3(hash2(s + k), hash2(s + k + 3.1), hash2(s + k + 7.7)) * 2.0 - 1.0; }
vec4 cell(sampler2D t, vec3 p) { vec3 c = clamp(floor((p - vec3(-2.2, -1.7, -2.2)) / 4.4 * ${GRID}.0), 0.0, ${GRID - 1}.0); return texture(t, vec2((c.z * ${GRID}.0 + c.x + 0.5) / ${GRID * GRID}.0, (c.y + 0.5) / ${GRID}.0)); }
void main() {
  vec4 P = texture(tPos, vUv), V = texture(tVel, vUv), E = texture(tEmit, vUv);
  float w = E.w, ei = floor(w / 8.0), ekind = floor((w - ei * 8.0) / 2.0), elight = w - ei * 8.0 - ekind * 2.0;
  int e = int(min(ei, ${MAX_EMITTERS - 1}.0)); vec4 em = uEm[e], em2 = uEm2[e];     // rate, lifeMin, lifeMax, jitter | burst, speed, -, -
  float h = hash2(vUv * 311.7), h2 = hash2(vUv * 97.3 + 1.7), h3 = hash2(vUv * 53.1 + 9.1);
  vec4 TA = texture(tTargetA, vUv), TB = texture(tTargetB, vUv); vec3 tgt = mix(TA.xyz, TB.xyz, uMorph); float tw = mix(TA.w, TB.w, uMorph), tlight = fract(tw);
  vec3 p = P.xyz, v = V.xyz; float age = P.w; bool forever = em.y <= 0.0, dormant = h >= em.x;
  vec3 spawn = E.xyz + rnd3(vUv, floor(uTime * 13.0) + 1.0) * em.w; vec3 dir = normalize(rnd3(vUv, floor(uTime * 7.0) + 2.0) + vec3(0.0, 0.35, 0.0));
  if (uReset > 0.5 || age < -1.5) { p = E.xyz + rnd3(vUv, 1.0) * em.w; v = dir * em2.y; age = forever ? 0.5 : (em2.x > 0.5 ? 0.0 : h2); }
  if (dormant) { oPos = vec4(E.xyz, -1.0); oVel = vec4(0.0, 0.0, 0.0, elight); return; }
  if (age < 0.0) { p = spawn; v = dir * em2.y; age = forever ? 0.5 : 0.0; }
  if (!forever) { float life = mix(em.y, em.z, h3); age += uDt / life; if (age >= 1.0) { age = fract(age); p = spawn; v = dir * em2.y; } }
  vec3 a = vec3(0.0); float L = elight, scan = 0.0; float dT = length(tgt - p);
  for (int i = 0; i < ${MAX_FIELDS}; i++) {
    if (float(i) >= uNF) break; vec4 f = uF[i]; int t = int(f.x); float s = f.y;
    if (t == 1) a += curl(p * f.z + vec3(0.0, uTime * f.w, uTime * f.w * 0.37)) * s * 1.6;
    else if (t == 2) a += rnd3(vUv, floor(uTime * 24.0)) * s * 2.0 + curl(p * f.z + uTime) * s * 0.5;
    else if (t == 3) { vec3 d = p - uFP[i].xyz, ax = normalize(uFD[i].xyz); vec3 rad = d - ax * dot(d, ax); float r = length(rad) + 0.02, fall = exp(-r * r / (uFP[i].w * uFP[i].w)); a += (cross(ax, rad) / r * s * 1.2 - rad / r * s * 0.25) * fall; }
    else if (t == 4) { vec3 d = uFP[i].xyz - p; float r = length(d) + 0.03; a += d / r * s * 1.5 * uFP[i].w * uFP[i].w / (r * r + uFP[i].w * uFP[i].w * 0.35); }
    else if (t == 5) { vec3 d = p - uFP[i].xyz; float r = length(d) + 0.03; a += d / r * s * 2.0 * exp(-r * r / (uFP[i].w * uFP[i].w)); }
    else if (t == 6) { vec3 d = p - uFP[i].xyz, ax = normalize(uFD[i].xyz); vec3 rad = d - ax * dot(d, ax); float r = length(rad) + 0.02; vec3 tan = cross(ax, rad) / r; float want = s * 0.9 / sqrt(r + 0.1);
      a += (tan * want - (v - ax * dot(v, ax))) * 2.5 - ax * dot(d, ax) * 1.5; }   // relax toward the orbital speed in the plane (stable at any step), flatten to it
    else if (t == 7) a += uFD[i].xyz * s;
    else if (t == 8) a += uFD[i].xyz * s * (1.0 + f.z * (0.6 * noised(vec3(uTime * 0.7, p.y * 1.3, p.z * 0.7)).x + 0.4 * noised(p * 2.1 + uTime * 0.9).x));
    else if (t == 9) v *= exp(-s * uDt * 1.6);
    else if (t == 10) { vec3 d = tgt - p; a += d * s * 3.0; v *= 1.0 - clamp(f.z * 8.0 * uDt * smoothstep(0.5, 0.0, dT), 0.0, 0.92); }
    else if (t == 11) { a += (E.xyz - p) * s * 2.0 - v * f.z; }
    else if (t == 12) { if (uFlowOn > 0.5) { vec2 fl = texture(tFlow, clamp(p.xy * vec2(0.5, 0.5) + vec2(0.5, -0.0), 0.0, 1.0)).xy * 2.0 - 1.0; a += vec3(fl, 0.0) * s * 1.5; } }
    else if (t == 13) { if (uGridOn > 0.5) { vec4 g0 = cell(tGrid0, p), g1 = cell(tGrid1, p); if (g0.w > 1.5) { vec3 mv = g0.xyz / g0.w, mp = g1.xyz / g0.w; vec3 dm = p - mp; float dd = length(dm) + 1e-4;
        a += (mv - v) * f.w * 2.5 + (mp - p) * f.z * 2.0 + dm / dd * max(0.0, uFP[i].w - dd) / uFP[i].w * uFD[i].x * 6.0; }
      float sp = length(v) + 1e-4; a += (v / sp * uFD[i].y - v) * 1.4; } }
    else if (t == 14) { vec3 d = p - vec3(0.0, 0.5, 0.0); float r = length(d); if (r > s) a -= d / r * (r - s) * (8.0 / (0.05 + f.z)); }
    else if (t == 15) { float sy = mix(-0.25, 1.65, fract(uTime * s)); float g = exp(-pow((p.y - sy) / max(f.z, 0.005), 2.0)); scan += g * f.w; a.y += g * uFD[i].x * 30.0; }
  }
  v += a * uDt; float vl = length(v); if (vl > 10.0) v *= 10.0 / vl; p += v * uDt;
  if (uAttract > 0.5) L = mix(L, tlight, smoothstep(0.35, 0.03, dT));
  float sp = length(v);
  L = clamp(L + 0.28 * smoothstep(0.0, 2.5, sp) + scan, 0.0, 1.0);
  oPos = vec4(p, age); oVel = vec4(v, L);
}`;
// flocking: every particle is one additive point in a coarse 3D grid (as a 2D atlas), summing velocity, position and a count
const GRID_V = /* glsl */ `
uniform sampler2D tPos, tVel; varying vec3 vV, vP;
void main() { vec4 P = texture2D(tPos, position.xy); vec4 V = texture2D(tVel, position.xy); vP = P.xyz; vV = V.xyz;
  if (P.w < 0.0) { gl_Position = vec4(3.0, 3.0, 3.0, 1.0); gl_PointSize = 0.0; return; }
  vec3 c = clamp(floor((P.xyz - vec3(-2.2, -1.7, -2.2)) / 4.4 * ${GRID}.0), 0.0, ${GRID - 1}.0);
  gl_Position = vec4((c.z * ${GRID}.0 + c.x + 0.5) / ${GRID * GRID}.0 * 2.0 - 1.0, (c.y + 0.5) / ${GRID}.0 * 2.0 - 1.0, 0.0, 1.0); gl_PointSize = 1.0; }`;
const GRID_F = `precision highp float; in vec3 vV, vP; layout(location = 0) out vec4 o0; layout(location = 1) out vec4 o1; void main() { o0 = vec4(vV, 1.0); o1 = vec4(vP, 0.0); }`;

const POINT_V = /* glsl */ `
uniform sampler2D tPos, tVel, tEmit; uniform float uTime, uSize, uPR, uNear, uFar, uReduce, uIrid, uSparkle, uDepth;
varying vec3 vCol; varying float vAlpha, vSpark;
${GLSL_TONES}
float h1(float n) { return fract(sin(n) * 43758.5453123); }
void main() {
  vec4 P = texture2D(tPos, position.xy); vec4 V = texture2D(tVel, position.xy); float w = texture2D(tEmit, position.xy).w;
  if (P.w < 0.0) { gl_Position = vec4(3.0, 3.0, 3.0, 1.0); gl_PointSize = 0.0; vAlpha = 0.0; return; }
  float ei = floor(w / 8.0), kind = floor((w - ei * 8.0) / 2.0), seed = h1(dot(position.xy, vec2(127.1, 311.7)));
  float age = P.w, life = age == 0.5 ? 1.0 : smoothstep(0.0, 0.08, age) * (1.0 - smoothstep(0.8, 1.0, age));
  vec4 mv = modelViewMatrix * vec4(P.xyz, 1.0); gl_Position = projectionMatrix * mv;
  float dist = -mv.z, fade = mix(1.0, clamp(1.15 - (dist - uNear) / max(uFar - uNear, 0.01), 0.35, 1.0), uDepth);
  float L = clamp(V.w, 0.0, 1.0);
  vec3 col = pcRamp(L * (0.7 + 0.3 * fade));
  if (L > 0.7) { float k = uTime * 0.025 * (1.0 - uReduce) + P.x * 0.55 + P.y * 0.35 + seed * 0.15; col = mix(col, pcIrid(k), min(0.6, (L - 0.7) / 0.3 * 0.6) * uIrid); }
  vSpark = h1(seed * 7.13) < uSparkle && kind != 2.0 ? 1.0 : 0.0;
  float tw = vSpark * (uReduce > 0.5 ? 0.6 : 0.5 + 0.5 * sin(uTime * 2.4 + seed * 61.0));
  vCol = col * (1.0 + tw * 0.9);
  vAlpha = (kind == 2.0 ? 0.55 : 1.0) * (0.6 + 0.4 * fade) * life;
  gl_PointSize = uSize * uPR * (0.7 + 0.6 * h1(seed * 13.7)) * (1.0 + tw * 1.8) * (0.8 + 0.4 * L) / max(dist, 0.05);
}`;
const POINT_F = /* glsl */ `
varying vec3 vCol; varying float vAlpha, vSpark;
void main() {
  vec2 c = gl_PointCoord - 0.5; float a;
  if (vSpark > 0.5) { vec2 q = abs(c); a = max(1.0 - smoothstep(0.0, 0.07, min(q.x, q.y)), 0.0) * (1.0 - smoothstep(0.2, 0.5, max(q.x, q.y))); a = max(a, 1.0 - smoothstep(0.0, 0.18, length(c))); }
  else a = 1.0 - smoothstep(0.28, 0.5, length(c));
  a *= vAlpha; if (a < 0.01) discard;
  gl_FragColor = vec4(vCol * a, a);
}`;
// the light pipeline, as the engine's: resolve (pile-up brightening) → half-size bloom → plum ground with a lift; plus trails and exposure
const TRAIL = `uniform sampler2D tAcc, tPrev; uniform float uKeep; varying vec2 vUv; void main() { gl_FragColor = texture2D(tAcc, vUv) + texture2D(tPrev, vUv) * uKeep; }`;
const RESOLVE = `uniform sampler2D tAcc; varying vec2 vUv;
void main() { vec4 s = texture2D(tAcc, vUv); float a = s.a; vec3 c = a > 0.0 ? s.rgb / max(a, 1.0) * (1.0 + min(0.5, max(a - 1.0, 0.0) * 0.14)) : vec3(0.0); gl_FragColor = vec4(c * min(a, 1.0), min(a, 1.0)); }`;
const BLUR = `uniform sampler2D tSrc; uniform vec2 uDir; varying vec2 vUv;
void main() { vec4 s = texture2D(tSrc, vUv) * 0.2270270270;
  s += (texture2D(tSrc, vUv + uDir * 1.3846153846) + texture2D(tSrc, vUv - uDir * 1.3846153846)) * 0.3162162162;
  s += (texture2D(tSrc, vUv + uDir * 3.2307692308) + texture2D(tSrc, vUv - uDir * 3.2307692308)) * 0.0702702703; gl_FragColor = s; }`;
const FINAL = /* glsl */ `
uniform sampler2D tCloud, tBloom; uniform vec2 uLiftAt; uniform float uAspect, uBloom, uExposure, uClear; varying vec2 vUv;
void main() {
  vec4 c = texture2D(tCloud, vUv); vec3 lit = (c.rgb + texture2D(tBloom, vUv).rgb * uBloom) * uExposure;
  if (uClear > 0.5) { gl_FragColor = vec4(lit, clamp(max(c.a, max(lit.r, max(lit.g, lit.b))), 0.0, 1.0)); return; }
  vec2 q = (vUv - uLiftAt) * vec2(uAspect, 1.0);
  vec3 bg = mix(${vec(LIFT)}, ${vec(GROUND)}, smoothstep(0.05, 1.3, length(q)));
  vec3 col = bg * (1.0 - min(1.0, c.a * uExposure)) + lit;
  col += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
  gl_FragColor = vec4(col, 1.0);
}`;
const COPY = `uniform sampler2D tSrc; varying vec2 vUv; void main() { gl_FragColor = texture2D(tSrc, vUv); }`;

export function supportsWebGL2() { try { const c = document.createElement("canvas"); const gl = c.getContext("webgl2"); if (!gl) return false; const ok = !!gl.getExtension("EXT_color_buffer_float"); gl.getExtension("WEBGL_lose_context")?.loseContext(); return ok; } catch { return false; } }

// texture dimensions for a budget: a wide texture, as few rows as needed
export const dims = (n) => { const w = Math.min(1024, 1 << Math.ceil(Math.log2(Math.max(64, Math.sqrt(n))))), h = Math.max(1, Math.ceil(n / w)); return { w, h, n: w * h }; };

export function createSim(canvas, { budget = 262144, pixelRatio, reduceMotion = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, premultipliedAlpha: true, powerPreference: "high-performance", preserveDrawingBuffer: false });
  let PR = pixelRatio ?? Math.min(window.devicePixelRatio || 1, 1.5); renderer.setPixelRatio(PR); renderer.setClearColor(GROUND, 1); renderer.setRenderTarget(null); renderer.clear();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 60); camera.position.set(0, 0.6, 3.4); camera.lookAt(0, 0.4, 0);
  const quadScene = new THREE.Scene(), quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); quadScene.add(quad);
  const mk = (frag, u, extra = {}) => new THREE.ShaderMaterial({ uniforms: u, vertexShader: QUAD_V, fragmentShader: frag, depthTest: false, depthWrite: false, ...extra });
  const pass = (m, target) => { quad.material = m; renderer.setRenderTarget(target); renderer.render(quadScene, quadCam); };
  const F = { type: THREE.FloatType, format: THREE.RGBAFormat, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: false, stencilBuffer: false, generateMipmaps: false };
  const dataTex = (w, h, data) => { const t = new THREE.DataTexture(data, w, h, THREE.RGBAFormat, THREE.FloatType); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; };

  // --- state
  let W, H, N, stateA, stateB, tEmit, tTargetA, tTargetB, geo, points;
  const tFlow = new THREE.DataTexture(new Float32Array([0.5, 0.5, 0, 1]), 1, 1, THREE.RGBAFormat, THREE.FloatType); tFlow.needsUpdate = true;
  const grid = new THREE.WebGLRenderTarget(GRID * GRID, GRID, { ...F, count: 2 });
  const U = {
    tPos: { value: null }, tVel: { value: null }, tEmit: { value: null }, tTargetA: { value: null }, tTargetB: { value: null }, tGrid0: { value: grid.textures[0] }, tGrid1: { value: grid.textures[1] }, tFlow: { value: tFlow },
    uDt: { value: 1 / 60 }, uTime: { value: 0 }, uMorph: { value: 0 }, uReset: { value: 1 }, uNF: { value: 0 }, uGridOn: { value: 0 }, uFlowOn: { value: 0 }, uAttract: { value: 0 },
    uF: { value: Array.from({ length: MAX_FIELDS }, () => new THREE.Vector4()) }, uFP: { value: Array.from({ length: MAX_FIELDS }, () => new THREE.Vector4()) }, uFD: { value: Array.from({ length: MAX_FIELDS }, () => new THREE.Vector4()) },
    uEm: { value: Array.from({ length: MAX_EMITTERS }, () => new THREE.Vector4(1, 0, 0, 0)) }, uEm2: { value: Array.from({ length: MAX_EMITTERS }, () => new THREE.Vector4()) },
  };
  const updateM = mk(UPDATE, U, { glslVersion: THREE.GLSL3 });
  const PU = { tPos: { value: null }, tVel: { value: null }, tEmit: { value: null }, uTime: { value: 0 }, uSize: { value: 2.2 }, uPR: { value: PR }, uNear: { value: 2.4 }, uFar: { value: 4.6 }, uReduce: { value: reduceMotion ? 1 : 0 }, uIrid: { value: 1 }, uSparkle: { value: 0.02 }, uDepth: { value: 1 } };
  const pointM = new THREE.ShaderMaterial({ uniforms: PU, vertexShader: POINT_V, fragmentShader: POINT_F, ...ADDITIVE_PREMULTIPLIED });
  const gridM = new THREE.ShaderMaterial({ uniforms: { tPos: PU.tPos, tVel: PU.tVel }, vertexShader: GRID_V, fragmentShader: GRID_F, glslVersion: THREE.GLSL3, transparent: true, depthTest: false, depthWrite: false, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneFactor });
  const scene = new THREE.Scene(), gridScene = new THREE.Scene();
  // the light pipeline
  const rtOpt = { type: THREE.HalfFloatType, depthBuffer: false }, acc = new THREE.WebGLRenderTarget(4, 4, rtOpt), cloud = new THREE.WebGLRenderTarget(4, 4, rtOpt), trailA = new THREE.WebGLRenderTarget(4, 4, rtOpt), trailB = new THREE.WebGLRenderTarget(4, 4, rtOpt), hA = new THREE.WebGLRenderTarget(2, 2, rtOpt), hB = new THREE.WebGLRenderTarget(2, 2, rtOpt);
  let trails = [trailA, trailB], trailFresh = true;
  const trailM = mk(TRAIL, { tAcc: { value: null }, tPrev: { value: null }, uKeep: { value: 0 } }), resolveM = mk(RESOLVE, { tAcc: { value: null } }), blurM = mk(BLUR, { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } });
  const finalM = mk(FINAL, { tCloud: { value: null }, tBloom: { value: null }, uLiftAt: { value: new THREE.Vector2(0.56, 0.48) }, uAspect: { value: 1 }, uBloom: { value: 0.65 }, uExposure: { value: 1 }, uClear: { value: 0 } });
  const copyM = mk(COPY, { tSrc: { value: null } });
  const look = { trails: 0 };

  function build(n) {
    const d = dims(n); W = d.w; H = d.h; N = d.n;
    [stateA, stateB].forEach((t) => t?.dispose()); geo?.dispose(); [tEmit, tTargetA, tTargetB].forEach((t) => t?.dispose());
    stateA = new THREE.WebGLRenderTarget(W, H, { ...F, count: 2 }); stateB = new THREE.WebGLRenderTarget(W, H, { ...F, count: 2 });
    const zero = new Float32Array(W * H * 4); tEmit = dataTex(W, H, zero); tTargetA = dataTex(W, H, zero.slice()); tTargetB = dataTex(W, H, zero.slice());
    U.tEmit.value = PU.tEmit.value = tEmit; U.tTargetA.value = tTargetA; U.tTargetB.value = tTargetB;
    const uv = new Float32Array(N * 3); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; uv[i * 3] = (x + 0.5) / W; uv[i * 3 + 1] = (y + 0.5) / H; }
    geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(uv, 3)); geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e9);
    if (points) { scene.remove(points); gridScene.clear(); }
    points = new THREE.Points(geo, pointM); points.frustumCulled = false; scene.add(points);
    const gp = new THREE.Points(geo, gridM); gp.frustumCulled = false; gridScene.add(gp);
    U.uReset.value = 1; trailFresh = true; sizeUniform();
  }
  // a form (pos, light, kind, part) → the emit or target texture. w packs: part*8 + kind*2 + light
  const packInto = (tex, f, withPart) => { const d = tex.image.data; for (let i = 0; i < N; i++) { const j = i < f.n ? i : i % f.n; d[i * 4] = f.pos[j * 3]; d[i * 4 + 1] = f.pos[j * 3 + 1]; d[i * 4 + 2] = f.pos[j * 3 + 2]; d[i * 4 + 3] = (withPart && f.part ? f.part[j] : 0) * 8 + f.kind[j] * 2 + Math.min(0.999, f.light[j]); } tex.needsUpdate = true; };
  function setEmit(f) { packInto(tEmit, f, true); U.uReset.value = 1; trailFresh = true; }
  function setTargets(a, b) { packInto(tTargetA, a); packInto(tTargetB, b || a); }
  function setEmitters(list) { for (let i = 0; i < MAX_EMITTERS; i++) { const e = list[i] || { rate: 1, life: 0, jitter: 0, burst: 0, speed: 0 }; U.uEm.value[i].set(e.rate, e.life ? e.life[0] : 0, e.life ? e.life[1] : 0, e.jitter); U.uEm2.value[i].set(e.burst, e.speed, 0, 0); } }
  function setFields(list) {
    U.uNF.value = Math.min(MAX_FIELDS, list.length); U.uGridOn.value = list.some((f) => f.type === "flock") ? 1 : 0; U.uAttract.value = list.some((f) => f.type === "attract") ? 1 : 0;
    list.slice(0, MAX_FIELDS).forEach((f, i) => {
      const id = FIELD_ID[f.type], a = U.uF.value[i], P = U.uFP.value[i], D = U.uFD.value[i]; a.set(id, 0, 0, 0); P.set(0, 0, 0, 1); D.set(0, 1, 0, 0);
      switch (f.type) {
        case "curl": a.set(id, f.strength, f.scale, f.speed); break;
        case "turbulence": a.set(id, f.strength, f.scale, 0); break;
        case "vortex": case "orbit": a.set(id, f.strength, 0, 0); P.set(...f.at, f.radius); D.set(...f.axis, 0); break;
        case "well": case "repel": a.set(id, f.strength, 0, 0); P.set(...f.at, f.radius); break;
        case "gravity": a.set(id, f.strength, 0, 0); D.set(...f.dir, 0); break;
        case "wind": a.set(id, f.strength, f.gust, 0); D.set(...f.dir, 0); break;
        case "drag": a.set(id, f.amount, 0, 0); break;
        case "attract": a.set(id, f.strength, f.snap, 0); break;
        case "spring": a.set(id, f.stiffness, f.damping, 0); break;
        case "flow": a.set(id, f.strength, 0, 0); break;
        case "flock": a.set(id, 1, f.cohesion, f.alignment); P.set(0, 0, 0, f.radius); D.set(f.separation, f.speed, 0, 0); break;
        case "contain": a.set(id, f.radius, f.softness, 0); break;
        case "scan": a.set(id, f.speed, f.width, f.boost); D.set(f.lift, 0, 0, 0); break;
      }
    });
  }
  function setFlow(imgOrNull) {
    if (!imgOrNull) { U.uFlowOn.value = 0; return; }
    // the image's luminance gradient, rotated 90° (a flow runs along the edges), as a 2D direction map
    const s = 128, cv = document.createElement("canvas"); cv.width = cv.height = s; const g = cv.getContext("2d"); g.drawImage(imgOrNull, 0, 0, s, s); const d = g.getImageData(0, 0, s, s).data, lum = new Float32Array(s * s);
    for (let i = 0; i < s * s; i++) lum[i] = (0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]) / 255;
    const out = new Float32Array(s * s * 4); const L = (x, y) => lum[Math.min(s - 1, Math.max(0, s - 1 - y)) * s + Math.min(s - 1, Math.max(0, x))];
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) { const gx = L(x + 1, y) - L(x - 1, y), gy = L(x, y + 1) - L(x, y - 1), m = Math.hypot(gx, gy) + 1e-4, i = (y * s + x) * 4; out[i] = 0.5 + 0.5 * (-gy / m) * Math.min(1, m * 6); out[i + 1] = 0.5 + 0.5 * (gx / m) * Math.min(1, m * 6); out[i + 3] = 1; }
    const t = new THREE.DataTexture(out, s, s, THREE.RGBAFormat, THREE.FloatType); t.minFilter = t.magFilter = THREE.LinearFilter; t.needsUpdate = true; U.tFlow.value?.dispose?.(); U.tFlow.value = t; U.uFlowOn.value = 1;
  }
  function setLook(l) { finalM.uniforms.uBloom.value = l.bloom; finalM.uniforms.uExposure.value = l.exposure; PU.uIrid.value = l.iridescence; PU.uSparkle.value = l.sparkle; PU.uDepth.value = l.depthFade; look.trails = l.trails; look.size = l.size; sizeUniform(); }
  let cw = 1, ch = 1;
  function sizeUniform() { PU.uSize.value = 2.6 * Math.sqrt(300000 / Math.max(N || 1, 1)) * Math.min(1.25, Math.max(0.75, ch / 900)) * (look.size || 1); }
  function resize(force) {
    const w = canvas.clientWidth || 2, h = canvas.clientHeight || 2; if (!force && w === cw && h === ch) return; cw = w; ch = h;
    renderer.setPixelRatio(PR); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    const pw = Math.max(2, Math.round(w * PR)), ph = Math.max(2, Math.round(h * PR)); sizeTargets(pw, ph, w / h); sizeUniform();
  }
  function sizeTargets(pw, ph, aspect) { [acc, cloud, trailA, trailB].forEach((t) => t.setSize(pw, ph)); hA.setSize(Math.max(1, pw >> 1), Math.max(1, ph >> 1)); hB.setSize(Math.max(1, pw >> 1), Math.max(1, ph >> 1)); finalM.uniforms.uAspect.value = aspect; trailFresh = true; }

  // one simulation step (dt seconds)
  let time = 0;
  function step(dt) {
    U.uDt.value = dt; U.uTime.value = time; time += dt;
    const src = stateA, dst = stateB; U.tPos.value = src.textures[0]; U.tVel.value = src.textures[1];
    if (U.uGridOn.value > 0.5 && U.uReset.value < 0.5) { PU.tPos.value = src.textures[0]; PU.tVel.value = src.textures[1]; renderer.setRenderTarget(grid); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(gridScene, camera); }
    pass(updateM, dst); U.uReset.value = 0; stateA = dst; stateB = src;
    PU.tPos.value = stateA.textures[0]; PU.tVel.value = stateA.textures[1];
  }
  // draw the current state with the standard look (to the screen, or to `target`)
  function draw(target = null, { pr = PR, clear = false } = {}) {
    PU.uTime.value = time; PU.uPR.value = pr; const cd = camera.position.distanceTo(LOOK_AT); PU.uNear.value = cd * 0.72; PU.uFar.value = cd * 1.38;
    renderer.setRenderTarget(acc); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(scene, camera);
    let src = acc;
    if (look.trails > 0) { const [prev, next] = trails; trailM.uniforms.tAcc.value = acc.texture; trailM.uniforms.tPrev.value = prev.texture; trailM.uniforms.uKeep.value = trailFresh ? 0 : Math.pow(look.trails, Math.max(0.25, U.uDt.value * 60)); pass(trailM, next); trails = [next, prev]; src = next; trailFresh = false; }
    resolveM.uniforms.tAcc.value = src.texture; pass(resolveM, cloud);
    blurM.uniforms.tSrc.value = cloud.texture; blurM.uniforms.uDir.value.set(1.6 / hA.width, 0); pass(blurM, hA);
    blurM.uniforms.tSrc.value = hA.texture; blurM.uniforms.uDir.value.set(0, 1.6 / hA.height); pass(blurM, hB);
    blurM.uniforms.tSrc.value = hB.texture; blurM.uniforms.uDir.value.set(3.2 / hA.width, 0); pass(blurM, hA);
    blurM.uniforms.tSrc.value = hA.texture; blurM.uniforms.uDir.value.set(0, 3.2 / hA.height); pass(blurM, hB);
    finalM.uniforms.tCloud.value = cloud.texture; finalM.uniforms.tBloom.value = hB.texture; finalM.uniforms.uClear.value = clear ? 1 : 0; renderer.setClearColor(GROUND, 1); pass(finalM, target);
  }
  const LOOK_AT = new THREE.Vector3(0, 0.4, 0);

  // a still at k× the canvas size (PNG export): rendered off screen, the point sizes scaled with it, then read back
  function still(k = 1, { clear = false } = {}) {
    const pw = Math.round(cw * PR * k), ph = Math.round(ch * PR * k), rt = new THREE.WebGLRenderTarget(pw, ph, { depthBuffer: false });
    sizeTargets(pw, ph, cw / ch); const keep = look.trails; look.trails = 0; draw(rt, { pr: PR * k, clear }); look.trails = keep;
    const px = new Uint8Array(pw * ph * 4); renderer.readRenderTargetPixels(rt, 0, 0, pw, ph, px); rt.dispose(); sizeTargets(Math.round(cw * PR), Math.round(ch * PR), cw / ch);
    const cv = document.createElement("canvas"); cv.width = pw; cv.height = ph; const img = cv.getContext("2d").createImageData(pw, ph);
    for (let y = 0; y < ph; y++) img.data.set(px.subarray((ph - 1 - y) * pw * 4, (ph - y) * pw * 4), y * pw * 4); cv.getContext("2d").putImageData(img, 0, 0); return cv;
  }
  // the particle state back on the CPU (export): positions + age, velocities + light
  function readState() {
    const rt = new THREE.WebGLRenderTarget(W, H, F), pos = new Float32Array(W * H * 4), vel = new Float32Array(W * H * 4);
    copyM.uniforms.tSrc.value = stateA.textures[0]; pass(copyM, rt); renderer.readRenderTargetPixels(rt, 0, 0, W, H, pos);
    copyM.uniforms.tSrc.value = stateA.textures[1]; pass(copyM, rt); renderer.readRenderTargetPixels(rt, 0, 0, W, H, vel); rt.dispose(); renderer.setRenderTarget(null);
    return { pos, vel, emit: tEmit.image.data, n: N, w: W, h: H };
  }
  function setPixelRatio(p) { PR = p; resize(true); }
  build(budget);
  return { renderer, camera, get N() { return N; }, get W() { return W; }, get H() { return H; }, get PR() { return PR; }, get time() { return time; }, set time(t) { time = t; },
    build, setEmit, setTargets, setEmitters, setFields, setFlow, setLook, setMorph: (m) => (U.uMorph.value = m), setReduce: (v) => (PU.uReduce.value = v ? 1 : 0), setLift: (x, y) => finalM.uniforms.uLiftAt.value.set(x, y),
    reset: () => { U.uReset.value = 1; trailFresh = true; }, resize, step, draw, still, readState, setPixelRatio,
    dispose() { [stateA, stateB, grid, acc, cloud, trailA, trailB, hA, hB].forEach((t) => t.dispose()); geo?.dispose(); renderer.dispose(); } };
}

export const PALETTE_NOTE = { TONES, IRID, GROUND, LIFT };
