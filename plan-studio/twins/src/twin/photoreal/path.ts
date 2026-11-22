// The film's camera path: keyframes (flythrough.json) → a smooth move. Eye and look points follow centripetal
// Catmull-Rom curves through the keys; speed is set per key in metres a second and eased between keys, then time is
// integrated along the curve's length, so the camera never jumps or lurches and the overall length hits `duration`.
// Pure (no three.js): the tests check it against the plan's walls.

export type V3 = [number, number, number];
export interface FilmKey {
  eye: V3;
  look: V3;
  /** speed through this key, metres a second (relative; scaled to fit the duration) */
  speed: number;
  /** vertical field of view, degrees */
  fov?: number;
  /** lens aperture radius in millimetres (0 = pin-sharp); focus is on the look point */
  ap?: number;
  /** exposure multiplier at this key */
  exp?: number;
  label?: string;
}
export interface FilmSpec {
  fps: number;
  duration: number;
  keys: FilmKey[];
}
export interface CamState {
  eye: V3;
  look: V3;
  fov: number;
  ap: number;
  exp: number;
  focus: number;
  /** curve parameter (key index + fraction) */
  u: number;
  speed: number;
}

/** centripetal Catmull-Rom between p1 and p2 (Barry–Goldman form), t in [0, 1] */
function cr(p0: V3, p1: V3, p2: V3, p3: V3, t: number): V3 {
  const d = (a: V3, b: V3) => Math.pow(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) || 1e-4, 0.5);
  const t0 = 0, t1 = t0 + d(p0, p1), t2 = t1 + d(p1, p2), t3 = t2 + d(p2, p3);
  const tt = t1 + (t2 - t1) * t;
  const out: V3 = [0, 0, 0];
  for (let k = 0; k < 3; k++) {
    const A1 = ((t1 - tt) * p0[k] + (tt - t0) * p1[k]) / (t1 - t0);
    const A2 = ((t2 - tt) * p1[k] + (tt - t1) * p2[k]) / (t2 - t1);
    const A3 = ((t3 - tt) * p2[k] + (tt - t2) * p3[k]) / (t3 - t2);
    const B1 = ((t2 - tt) * A1 + (tt - t0) * A2) / (t2 - t0);
    const B2 = ((t3 - tt) * A2 + (tt - t1) * A3) / (t3 - t1);
    out[k] = ((t2 - tt) * B1 + (tt - t1) * B2) / (t2 - t1);
  }
  return out;
}
const ext = (a: V3, b: V3): V3 => [2 * a[0] - b[0], 2 * a[1] - b[1], 2 * a[2] - b[2]];
const sm = (x: number) => x * x * (3 - 2 * x);

export class FilmPath {
  spec: FilmSpec;
  private U: Float64Array; // curve parameter samples
  private T: Float64Array; // time at each sample
  private S: Float64Array; // arc length at each sample
  length = 0;
  constructor(spec: FilmSpec, steps = 4000) {
    this.spec = spec;
    const n = spec.keys.length;
    if (n < 2) throw new Error('a film path needs two keys or more');
    this.U = new Float64Array(steps + 1); this.T = new Float64Array(steps + 1); this.S = new Float64Array(steps + 1);
    let prev = this.eyeAt(0), s = 0, t = 0;
    const raw: number[] = [0];
    for (let i = 1; i <= steps; i++) {
      const u = ((n - 1) * i) / steps, p = this.eyeAt(u);
      const ds = Math.hypot(p[0] - prev[0], p[1] - prev[1], p[2] - prev[2]);
      s += ds;
      const v = Math.max(0.05, this.scalar(u - ((n - 1) * 0.5) / steps, 'speed', 1));
      t += ds / v;
      this.U[i] = u; this.S[i] = s; raw.push(t);
      prev = p;
    }
    this.length = s;
    const k = spec.duration / t;
    for (let i = 0; i <= steps; i++) this.T[i] = raw[i] * k;
  }
  eyeAt(u: number): V3 { return this.curve(u, 'eye'); }
  lookAt(u: number): V3 { return this.curve(u, 'look'); }
  private curve(u: number, f: 'eye' | 'look'): V3 {
    const K = this.spec.keys, n = K.length;
    const x = Math.min(n - 1 - 1e-9, Math.max(0, u)), i = Math.floor(x), t = x - i;
    const p1 = K[i][f], p2 = K[i + 1][f];
    const p0 = i > 0 ? K[i - 1][f] : ext(p1, p2), p3 = i + 2 < n ? K[i + 2][f] : ext(p2, p1);
    return cr(p0, p1, p2, p3, t);
  }
  /** a key value eased between keys (smoothstep: continuous, flat at each key) */
  scalar(u: number, f: 'speed' | 'fov' | 'ap' | 'exp', dflt: number): number {
    const K = this.spec.keys, n = K.length;
    const x = Math.min(n - 1 - 1e-9, Math.max(0, u)), i = Math.floor(x), t = x - i;
    const a = (K[i][f] as number | undefined) ?? dflt, b = (K[i + 1][f] as number | undefined) ?? dflt;
    return a + (b - a) * sm(t);
  }
  /** camera at film time t (seconds) */
  at(time: number): CamState {
    const T = this.T, U = this.U;
    const t = Math.min(this.spec.duration, Math.max(0, time));
    let lo = 0, hi = T.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (T[m] <= t) lo = m; else hi = m; }
    const f = T[hi] > T[lo] ? (t - T[lo]) / (T[hi] - T[lo]) : 0;
    const u = U[lo] + (U[hi] - U[lo]) * f;
    const eye = this.eyeAt(u), look = this.lookAt(u);
    const focus = Math.hypot(look[0] - eye[0], look[1] - eye[1], look[2] - eye[2]);
    const ds = this.S[hi] - this.S[lo], dt = T[hi] - T[lo];
    return { eye, look, fov: this.scalar(u, 'fov', 42), ap: this.scalar(u, 'ap', 0), exp: this.scalar(u, 'exp', 1), focus, u, speed: dt > 0 ? ds / dt : 0 };
  }
  frames(): number { return Math.round(this.spec.duration * this.spec.fps); }
}

/** wall segments of a plan model (assembl.plan-model.v1), in the model frame: x = u, z = v */
export interface WallSeg { a: [number, number]; b: [number, number]; half: number; open: { s0: number; s1: number; sill: number; head: number; kind: string }[]; top: number; id: string }
export function planWalls(plan: { buildings: { origin?: number[]; levels: { floor?: number; plate?: number; walls?: unknown[]; partitions?: unknown[] }[] }[] }): WallSeg[] {
  const out: WallSeg[] = [];
  for (const b of plan.buildings) {
    const [ox, oz] = (b.origin as number[] | undefined) ?? [0, 0];
    for (const L of b.levels) {
      const top = (L.plate ?? 2.4) + (L.floor ?? 0);
      for (const w of [...(L.walls ?? []), ...(L.partitions ?? [])] as { id: string; axis: string; at: number; from: number; to: number; thickness?: number; openings?: { a: number; b: number; sill?: number; head?: number; kind: string }[] }[]) {
        const a: [number, number] = w.axis === 'x' ? [ox + w.from, oz + w.at] : [ox + w.at, oz + w.from];
        const bb: [number, number] = w.axis === 'x' ? [ox + w.to, oz + w.at] : [ox + w.at, oz + w.to];
        out.push({ id: w.id, a, b: bb, half: (w.thickness ?? 0.1) / 2, top, open: (w.openings ?? []).map((o) => ({ s0: o.a - w.from, s1: o.b - w.from, sill: o.sill ?? 0, head: o.head ?? 2.1, kind: o.kind })) });
      }
    }
  }
  return out;
}

/**
 * Where a camera point is too close to a wall (closer than `clear` metres beyond the wall's face), unless it is inside
 * an opening (door or window) with headroom. Returns the offending wall ids.
 */
export function wallClash(p: V3, walls: WallSeg[], clear = 0.25): string[] {
  const bad: string[] = [];
  for (const w of walls) {
    if (p[1] > w.top + 0.3) continue; // above the wall plate
    const dx = w.b[0] - w.a[0], dz = w.b[1] - w.a[1], L = Math.hypot(dx, dz);
    const tx = dx / L, tz = dz / L;
    const rx = p[0] - w.a[0], rz = p[2] - w.a[1];
    const s = rx * tx + rz * tz, d = Math.abs(rx * -tz + rz * tx);
    if (s < -clear || s > L + clear) continue;
    if (d > w.half + clear) continue;
    const inOpening = w.open.some((o) => o.kind === 'door' && s > o.s0 + 0.2 && s < o.s1 - 0.2 && p[1] > o.sill + 0.3 && p[1] < o.head - 0.2);
    if (!inOpening) bad.push(w.id);
  }
  return bad;
}
