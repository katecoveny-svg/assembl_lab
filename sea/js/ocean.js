// assembl lab · Sea state: the ocean surface and the sky. The surface is a polar grid that follows the camera (dense under you,
// sparse to the horizon), displaced by the shared Gerstner code. The light is computed per pixel: Fresnel between the water's own
// colour and the reflected sky, a sharp sun glint plus a broad sheen, light scattered through wave crests, whitecaps where the
// surface folds, and haze to the horizon.
import * as THREE from "three";
import { GLSL_WAVES, MAXW } from "./waves.js";

export const GLSL_SKY = /* glsl */ `
uniform vec3 uSunDir, uSunCol, uZenith, uHorizon; uniform float uCloud, uTime;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = p * 2.03 + 17.0; a *= 0.5; } return s; }
vec3 skyColor(vec3 d) {
  float y = max(d.y, 0.0), mu = dot(d, uSunDir);
  vec3 c = mix(uHorizon, uZenith, pow(y, 0.45));
  c += uSunCol * (pow(max(mu, 0.0), 8.0) * 0.35 + pow(max(mu, 0.0), 64.0) * 0.6);   // the glow around the sun
  c += uSunCol * smoothstep(0.9994, 0.99975, mu) * 18.0;                             // the disc
  if (d.y > 0.0 && uCloud > 0.0) {                                                  // a thin deck of cloud
    vec2 uv = d.xz / (d.y + 0.08) * 1.6 + vec2(uTime * 0.004, 0.0);
    float cl = smoothstep(0.52 - uCloud * 0.22, 0.85, fbm(uv)) * smoothstep(0.0, 0.18, d.y);
    vec3 cc = mix(uHorizon * 1.05, uSunCol * 0.9 + uZenith * 0.25, 0.35 + 0.5 * max(mu, 0.0));
    c = mix(c, cc, cl * 0.85);
  }
  return c;
}`;

export function createSky() {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Color() }, uZenith: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() }, uCloud: { value: 0.4 }, uTime: { value: 0 } },
    vertexShader: `varying vec3 vDir; void main() { vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`,
    fragmentShader: GLSL_SKY + `\nvarying vec3 vDir; void main() { vec3 d = normalize(vDir); vec3 c = skyColor(d); if (d.y < 0.0) c = mix(uHorizon, uHorizon * 0.55, min(-d.y * 4.0, 1.0)); gl_FragColor = vec4(c, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(5000, 48, 24), mat); m.frustumCulled = false; m.renderOrder = -1; return m;
}

// a polar grid: rings spaced geometrically from 0.25 m to 6 km
function polarGrid(segments, r0, growth, rMax) {
  const rings = []; for (let r = r0; r < rMax; r *= growth) rings.push(r); rings.push(rMax);
  const pos = [0, 0, 0], idx = [];
  for (const r of rings) for (let s = 0; s < segments; s++) { const a = (s / segments) * Math.PI * 2; pos.push(Math.cos(a) * r, 0, Math.sin(a) * r); }
  for (let s = 0; s < segments; s++) idx.push(0, 1 + ((s + 1) % segments), 1 + s);
  for (let j = 0; j < rings.length - 1; j++) for (let s = 0; s < segments; s++) {
    const a = 1 + j * segments + s, b = 1 + j * segments + ((s + 1) % segments), c = a + segments, d = b + segments; idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); return g;
}

export function createOcean({ detail = 1 } = {}) {
  const uWA = Array.from({ length: MAXW }, () => new THREE.Vector4()), uWB = Array.from({ length: MAXW }, () => new THREE.Vector4());
  const uniforms = {
    uWA: { value: uWA }, uWB: { value: uWB }, uTime: { value: 0 }, uCentre: { value: new THREE.Vector2() }, uCam: { value: new THREE.Vector3() },
    uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Color() }, uZenith: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() }, uCloud: { value: 0.4 },
    uDeep: { value: new THREE.Color("#0b3d4a") }, uScatter: { value: new THREE.Color("#1f7a6a") }, uWhitecaps: { value: 0.5 }, uHs: { value: 0.6 }, uHaze: { value: new THREE.Vector2(400, 4200) },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: GLSL_WAVES + /* glsl */ `
      uniform vec2 uCentre; uniform vec3 uCam;
      varying vec3 vWorld; varying vec3 vN; varying float vJ; varying float vH;
      void main() {
        vec2 xz = position.xz + uCentre; float dist = length(xz - uCam.xz);
        vec3 P, N; float J; gerstner(xz, dist, P, N, J);
        vWorld = P; vN = N; vJ = J; vH = P.y;
        gl_Position = projectionMatrix * viewMatrix * vec4(P, 1.0);
      }`,
    fragmentShader: GLSL_SKY + /* glsl */ `
      uniform vec3 uCam, uDeep, uScatter; uniform float uWhitecaps, uHs; uniform vec2 uHaze;
      varying vec3 vWorld; varying vec3 vN; varying float vJ; varying float vH;
      vec3 ripples(vec2 p, float t, float fade) {   // capillary detail the grid is too coarse to carry
        vec3 n = vec3(0.0);
        n.xz += 0.06 * vec2(cos(dot(p, vec2(1.7, 0.9)) * 3.1 - t * 4.1), cos(dot(p, vec2(-0.6, 1.9)) * 2.7 - t * 3.6));
        n.xz += 0.04 * vec2(cos(dot(p, vec2(2.9, -1.3)) * 5.3 - t * 6.0), cos(dot(p, vec2(1.1, 3.1)) * 4.4 - t * 5.4));
        n.xz += 0.025 * (vec2(vnoise(p * 3.0 + t * 0.6), vnoise(p * 3.0 - t * 0.5)) - 0.5);
        return n * fade;
      }
      void main() {
        vec3 toCam = uCam - vWorld; float dist = length(toCam); vec3 V = toCam / dist;
        vec3 N = normalize(vN + ripples(vWorld.xz, uTime, 1.0 - smoothstep(20.0, 260.0, dist)));
        float NV = max(dot(N, V), 0.0), fres = 0.02 + 0.98 * pow(1.0 - NV, 5.0);
        vec3 R = reflect(-V, N); R.y = abs(R.y);
        vec3 refl = skyColor(R);
        // the water body: deep colour, plus light scattered through crests facing away from the sun
        float crest = clamp(vH / max(uHs * 0.6, 0.05) * 0.5 + 0.5, 0.0, 1.0);
        float through = pow(max(dot(V, -uSunDir), 0.0), 2.0) * 0.6 + 0.4;
        vec3 body = uDeep * (0.55 + 0.45 * max(uSunDir.y, 0.0)) + uScatter * crest * crest * through * 0.9 * max(uSunDir.y + 0.15, 0.05);
        vec3 col = mix(body, refl, fres);
        // sun: a tight glint and a broad sheen
        float mu = max(dot(R, uSunDir), 0.0);
        col += uSunCol * (pow(mu, 1200.0) * 40.0 + pow(mu, 90.0) * 0.6) * smoothstep(-0.05, 0.05, uSunDir.y);
        // whitecaps where the surface folds (horizontal Jacobian below 1), broken up by noise
        float fold = smoothstep(0.62, 0.18, vJ) * uWhitecaps, streak = smoothstep(0.35, 0.75, fbm(vWorld.xz * 0.35 + uTime * 0.05));
        float foam = clamp(fold * (0.5 + streak), 0.0, 1.0);
        col = mix(col, vec3(0.92, 0.95, 0.96) * (0.45 + 0.55 * max(uSunDir.y, 0.15)) + uSunCol * 0.08, foam * 0.9);
        // haze to the horizon
        col = mix(col, uHorizon * 0.96, smoothstep(uHaze.x, uHaze.y, dist));
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const seg = detail > 0.5 ? 384 : 224, mesh = new THREE.Mesh(polarGrid(seg, 0.25, detail > 0.5 ? 1.028 : 1.05, 6000), mat);
  mesh.frustumCulled = false; mesh.name = "OCEAN";
  // follow the camera, snapped so the near grid does not swim
  mesh.follow = (cam) => { const s = 0.5; uniforms.uCentre.value.set(Math.round(cam.position.x / s) * s, Math.round(cam.position.z / s) * s); uniforms.uCam.value.copy(cam.position); };
  return { mesh, uniforms };
}

// times of day: sun position (NZ: the sun is in the northern sky), colours, cloud. Elevation and azimuth in degrees.
export const TIMES = {
  dawn: { label: "Dawn", elev: 5, az: 75, sun: "#ffb98a", sunI: 1.6, zenith: "#3f5a8c", horizon: "#f2b4a0", cloud: 0.5, exp: 0.95 },
  day: { label: "Day", elev: 48, az: 15, sun: "#fff3e2", sunI: 2.4, zenith: "#2f6db5", horizon: "#bcd8ee", cloud: 0.35, exp: 0.85 },
  golden: { label: "Golden hour", elev: 8, az: 295, sun: "#ffc27a", sunI: 2.0, zenith: "#55719f", horizon: "#f3c99b", cloud: 0.45, exp: 0.95 },
  dusk: { label: "Dusk", elev: -1.5, az: 265, sun: "#ff8a7a", sunI: 0.8, zenith: "#231a3a", horizon: "#c97a8e", cloud: 0.55, exp: 1.25 },
};
export const WATER_COLOUR = {
  harbour: { deep: "#0d5a63", scatter: "#2fb9a8" },
  gulf: { deep: "#0a3a45", scatter: "#1d8a74" },
  ocean: { deep: "#052a4c", scatter: "#1667a0" },
};
export function sunVector(t) { const e = (t.elev * Math.PI) / 180, a = (t.az * Math.PI) / 180; return new THREE.Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), -Math.cos(a) * Math.cos(e)).normalize(); }
