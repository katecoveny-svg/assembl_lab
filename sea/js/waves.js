// assembl lab · Sea state: the sea, as code. A sum of Gerstner wave trains whose heights and periods come from the standard
// fetch-limited wave-growth relations (JONSWAP / CERC: g·Hs/U² = 0.0016·(g·F/U²)^½, g·Tp/U = 0.286·(g·F/U²)^⅓, capped at a
// fully developed Pierson–Moskowitz sea), spread around the wind, plus a long swell. The same function runs in the vertex
// shader (what you see) and here on the CPU (what the boats float on), so they agree.
export const G = 9.81, MAXW = 24;
export const WATERS = {
  harbour: { fetch: 4000, swellShelter: 0.12, label: "Inner harbour" },
  gulf: { fetch: 25000, swellShelter: 0.55, label: "Hauraki Gulf" },
  ocean: { fetch: 400000, swellShelter: 1, label: "Open ocean" },
};
const DOUGLAS = [[0.0, 0, "Calm (glassy)"], [0.1, 1, "Calm (rippled)"], [0.5, 2, "Smooth"], [1.25, 3, "Slight"], [2.5, 4, "Moderate"], [4, 5, "Rough"], [6, 6, "Very rough"], [9, 7, "High"], [1e9, 8, "Very high"]];
export function douglas(hs) { for (const [lim, n, name] of DOUGLAS) if (hs <= lim) return { n, name }; return { n: 9, name: "Phenomenal" }; }

function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const toward = (fromDeg) => { const b = ((fromDeg + 180) * Math.PI) / 180; return [Math.sin(b), -Math.cos(b)]; };   // compass → world (x east, −z north)

// conditions → wave trains. windKn: 10 m wind in knots; windFrom / swellFrom: compass degrees the wind or swell comes FROM.
export function seaState({ windKn = 12, windFrom = 225, swell = 0.6, swellFrom = 45, chop = 0.55, water = "gulf" } = {}) {
  const W = WATERS[water] || WATERS.gulf, U = Math.max(0.6, windKn * 0.514444), F = W.fetch;
  const hsFD = (0.21 * U * U) / G, tpFD = (7.14 * U) / G;
  const hsWind = Math.min(0.0016 * U * Math.sqrt(F / G), hsFD) * (windKn < 1 ? 0.15 : 1);
  const tp = Math.min(0.286 * (U / G) * Math.cbrt((G * F) / (U * U)), tpFD), wp = (2 * Math.PI) / tp, Lp = (G * tp * tp) / (2 * Math.PI);
  const rand = rng(11), waves = [], [wx, wz] = toward(windFrom), wAng = Math.atan2(wz, wx);
  // wind sea: 18 trains, wavelengths 0.2–2.4 × the peak, weighted by the Pierson–Moskowitz shape, spread around the wind
  const NW = 18, wind = [];
  for (let i = 0; i < NW; i++) {
    const f = i / (NW - 1), L = Lp * Math.pow(2, 1.25 - 3.5 * f), k = (2 * Math.PI) / L, w = Math.sqrt(G * k);
    const S = Math.pow(w, -5) * Math.exp(-1.25 * Math.pow(wp / w, 4)), dw = w * 0.19;
    const spread = (0.25 + 0.75 * f) * 1.0 * (rand() * 2 - 1), a = wAng + spread;
    wind.push({ dx: Math.cos(a), dz: Math.sin(a), k, w, e: S * dw, phi: rand() * Math.PI * 2 });
  }
  const eW = wind.reduce((s, x) => s + x.e, 0), targetW = (hsWind / 4) ** 2;      // Hs = 4·√(m0), m0 = Σ A²/2
  for (const x of wind) x.A = Math.sqrt((2 * targetW * x.e) / eW);
  // swell: three long trains from the swell direction, sheltered inside the harbour
  const hsSwell = swell * W.swellShelter, [sx, sz] = toward(swellFrom), sAng = Math.atan2(sz, sx), share = [0.5, 0.3, 0.2], targetS = (hsSwell / 4) ** 2;
  const swl = [95, 130, 170].map((L, i) => { const k = (2 * Math.PI) / L, a = sAng + (i - 1) * 0.12; return { dx: Math.cos(a), dz: Math.sin(a), k, w: Math.sqrt(G * k), A: Math.sqrt(2 * targetS * share[i]), phi: rand() * Math.PI * 2 }; });
  const all = [...wind, ...swl].filter((x) => x.A > 1e-4), N = all.length;
  // steepness: Σ Q·k·A = chop (< 1 keeps every crest from looping over)
  for (const x of all) x.Q = Math.min(1.6, chop / Math.max(1e-6, x.k * x.A * N));
  const hs = Math.hypot(hsWind, hsSwell);
  return { waves: all.slice(0, MAXW), hs, hsWind, hsSwell, tp, Lp, windKn, U, douglas: douglas(hs), water: W.label };
}

// CPU twin of the shader. Gerstner moves points sideways as well as up, so the height above a fixed point is found by inverting
// the horizontal displacement with a few fixed-point steps.
export function displace(waves, x, z, t, o) {
  let dx = 0, dy = 0, dz = 0;
  for (const w of waves) { const th = w.k * (w.dx * x + w.dz * z) - w.w * t + w.phi, c = Math.cos(th), s = Math.sin(th); dx += w.Q * w.A * w.dx * c; dz += w.Q * w.A * w.dz * c; dy += w.A * s; }
  o.x = dx; o.y = dy; o.z = dz; return o;
}
const tmp = { x: 0, y: 0, z: 0 };
export function heightAt(waves, x, z, t) {
  let px = x, pz = z;
  for (let i = 0; i < 3; i++) { displace(waves, px, pz, t, tmp); px = x - tmp.x; pz = z - tmp.z; }
  return displace(waves, px, pz, t, tmp).y;
}
// the water's own vertical velocity at a point (for damping and the ride meter)
export function heaveRate(waves, x, z, t) { const e = 0.02; return (heightAt(waves, x, z, t + e) - heightAt(waves, x, z, t - e)) / (2 * e); }
export function normalAt(waves, x, z, t) {
  const e = 0.35, hx = heightAt(waves, x + e, z, t) - heightAt(waves, x - e, z, t), hz = heightAt(waves, x, z + e, t) - heightAt(waves, x, z - e, t);
  const n = [-hx / (2 * e), 1, -hz / (2 * e)], l = Math.hypot(...n); return n.map((v) => v / l);
}

// pack for the shader: uWA[i] = (dirX, dirZ, k, A), uWB[i] = (omega, Q, phase, 0)
export function packUniforms(waves, uWA, uWB) {
  for (let i = 0; i < MAXW; i++) {
    const w = waves[i]; if (!w) { uWA[i].set(0, 0, 0, 0); uWB[i].set(0, 0, 0, 0); continue; }
    uWA[i].set(w.dx, w.dz, w.k, w.A); uWB[i].set(w.w, w.Q, w.phi, 0);
  }
}

// the shared GLSL: displacement, analytic normal and the horizontal Jacobian (where it folds, the crest breaks into foam).
// Short trains fade with distance so the far sea does not shimmer.
export const GLSL_WAVES = /* glsl */ `
uniform vec4 uWA[${MAXW}]; uniform vec4 uWB[${MAXW}]; uniform float uTime;
void gerstner(vec2 xz, float dist, out vec3 P, out vec3 N, out float J) {
  P = vec3(xz.x, 0.0, xz.y); vec3 T = vec3(1.0, 0.0, 0.0), B = vec3(0.0, 0.0, 1.0);
  for (int i = 0; i < ${MAXW}; i++) {
    vec4 a = uWA[i], b = uWB[i]; if (a.w <= 0.0) continue;
    float L = 6.2831853 / a.z, fade = clamp(L / (dist * 0.012 + 0.001) - 0.6, 0.0, 1.0); if (fade <= 0.0) continue;
    vec2 D = a.xy; float k = a.z, A = a.w * fade, Q = b.y;
    float th = k * dot(D, xz) - b.x * uTime + b.z, c = cos(th), s = sin(th), WA = k * A;
    P.x += Q * A * D.x * c; P.z += Q * A * D.y * c; P.y += A * s;
    T += vec3(-Q * D.x * D.x * WA * s, D.x * WA * c, -Q * D.x * D.y * WA * s);
    B += vec3(-Q * D.x * D.y * WA * s, D.y * WA * c, -Q * D.y * D.y * WA * s);
  }
  N = normalize(cross(B, T)); J = T.x * B.z - T.z * B.x;
}`;
