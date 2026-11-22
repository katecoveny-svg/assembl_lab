// Procedural surface detail for the asset library, made entirely in code: no image files, no downloads.
// Every generator here is pure (no three.js, no DOM), seeded and deterministic, and tiles seamlessly, so the same
// call gives the same bytes in a browser and in a node test (tests/architecture/library-tex.test.mjs).
//
// A generator returns a Field: height in millimetres, an albedo multiplier (about 1) and a roughness (0 to 1), one
// value per texel of an n × n tile that covers `mm` millimetres. pack() turns a Field into the three byte maps a
// material wants: a tangent-space normal map (OpenGL convention, +y up), a roughness map (in green, where three.js
// reads it) and the albedo multiplier (in all three colour channels, for tint()).
//
// The idea comes from "room-at-dawn" (MIT, a photoreal bedroom built in three.js code): cloth catches light because
// of its threads, so every surface gets a fine weave, knit, loop, pile, grain or trowel texture of its own.

export interface Field {
  n: number;
  /** millimetres one tile covers */
  mm: number;
  /** height, mm */
  h: Float32Array;
  /** albedo multiplier, about 1 */
  a: Float32Array;
  /** roughness 0..1 */
  r: Float32Array;
}

// ---- noise: integer hashes, periodic value noise, cellular noise ------------------------------------------------------
/** a well-mixed 32-bit hash of two integers and a seed, as a number in [0, 1) */
export function hash2(x: number, y: number, seed: number) {
  let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul(seed | 0, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
/** a small seeded random number source (mulberry32) */
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return { next, range: (a: number, b: number) => a + (b - a) * next(), int: (a: number, b: number) => a + Math.floor((b - a + 1) * next()), pick: <T>(arr: T[]) => arr[Math.floor(next() * arr.length)] };
}
const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const wrapi = (i: number, p: number) => ((i % p) + p) % p;
/** value noise in [0, 1] that repeats every px cells along x and py along y */
export function pnoise(x: number, y: number, px: number, py: number, seed: number) {
  const ix = Math.floor(x), iy = Math.floor(y), u = fade(x - ix), v = fade(y - iy);
  const x0 = wrapi(ix, px), y0 = wrapi(iy, py), x1 = wrapi(ix + 1, px), y1 = wrapi(iy + 1, py);
  const a = hash2(x0, y0, seed), b = hash2(x1, y0, seed), c = hash2(x0, y1, seed), d = hash2(x1, y1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
/** fractal sum of pnoise, still periodic (px, py base cells), in [0, 1] */
export function pfbm(x: number, y: number, oct: number, px: number, py: number, seed: number) {
  let amp = 0.5, sum = 0, norm = 0, f = 1;
  for (let i = 0; i < oct; i++) { sum += amp * pnoise(x * f, y * f, px * f, py * f, seed + i * 101); norm += amp; amp *= 0.5; f *= 2; }
  return sum / norm;
}
/** periodic cellular noise: distances to the nearest and second-nearest feature point, and the nearest cell's hash */
export function worley(x: number, y: number, px: number, py: number, seed: number): [number, number, number] {
  const ix = Math.floor(x), iy = Math.floor(y);
  let f1 = 9, f2 = 9, id = 0;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const cx = ix + dx, cy = iy + dy, wx = wrapi(cx, px), wy = wrapi(cy, py);
    const fx = cx + hash2(wx, wy, seed), fy = cy + hash2(wx, wy, seed + 7);
    const d = Math.hypot(x - fx, y - fy);
    if (d < f1) { f2 = f1; f1 = d; id = hash2(wx, wy, seed + 13); } else if (d < f2) f2 = d;
  }
  return [f1, f2, id];
}
const clamp = (x: number, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const smooth = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

function blank(n: number, mm: number, r0: number): Field {
  const f: Field = { n, mm, h: new Float32Array(n * n), a: new Float32Array(n * n).fill(1), r: new Float32Array(n * n).fill(r0) };
  return f;
}
/** run fn for every texel with u, v in [0, 1) */
function each(n: number, fn: (u: number, v: number, i: number) => void) {
  for (let y = 0; y < n; y++) { const v = y / n; for (let x = 0; x < n; x++) fn(x / n, v, y * n + x); }
}
/** add a splat (a stamp of radius rad texels) to the height field with wrap-around, taking the larger of the two */
function stampMax(f: Field, cx: number, cy: number, rad: number, fn: (dx: number, dy: number) => number, alb?: number) {
  const n = f.n, r = Math.ceil(rad);
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const px = Math.floor(cx) + dx, py = Math.floor(cy) + dy;
    const val = fn(px + 0.5 - cx, py + 0.5 - cy);
    if (val <= 0) continue;
    const i = wrapi(py, n) * n + wrapi(px, n);
    if (val > f.h[i]) { f.h[i] = val; if (alb !== undefined) f.a[i] = alb; }
  }
}

// ---- cloth --------------------------------------------------------------------------------------------------------------
export interface WeaveOpts { threads?: number; slub?: number; seed?: number; pattern?: 'plain' | 'twill' | 'basket' | 'cord'; mm?: number; n?: number; fuzz?: number }
/**
 * Woven cloth: warp and weft threads passing over and under each other, each thread a little thicker or thinner
 * along its length (slub, as linen has), with a fuzz of loose fibre. pattern: plain (linen, canvas), twill (2/1, for
 * upholstery), basket (2 × 2, for heavy weaves), cord (a woven paper-cord chair seat: few, thick, flattened strands).
 */
export function weave(o: WeaveOpts = {}): Field {
  const n = o.n ?? 512, T = o.threads ?? 64, slub = o.slub ?? 0.3, seed = o.seed ?? 1, pat = o.pattern ?? 'plain', fuzz = o.fuzz ?? 0.12;
  const f = blank(n, o.mm ?? 40, 0.9), pitch = (o.mm ?? 40) / T;
  // slub: how a thread's thickness wanders along its length, P slow bumps per tile
  const P = Math.max(1, Math.round(T * 0.11)), kk = P / T;
  each(n, (u, v, i) => {
    const x = u * T, y = v * T, ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    let over: number;
    if (pat === 'twill') over = wrapi(ix - iy, 3) === 0 ? 0 : 1;
    else if (pat === 'basket' || pat === 'cord') over = ((ix >> 1) + (iy >> 1)) & 1;
    else over = (ix + iy) & 1;
    // the thickness of this warp (or weft) thread here: slub along its length, and its own average
    const wx = 0.78 + slub * ((hash2(ix, 7, seed) - 0.5) * 0.9 + (pnoise(ix, y * kk, T, P, seed + 3) - 0.5) * 1.1);
    const wy = 0.78 + slub * ((hash2(3, iy, seed + 1) - 0.5) * 0.9 + (pnoise(x * kk, iy, P, T, seed + 5) - 0.5) * 1.1);
    const flat = pat === 'cord' ? 0.55 : 1;
    const tx = clamp(1 - Math.abs(fx - 0.5) * 2 / wx), ty = clamp(1 - Math.abs(fy - 0.5) * 2 / wy);
    // each thread arches over the one it crosses and dips under the next
    const arcW = 0.55 + 0.45 * Math.sin(Math.PI * (pat === 'basket' || pat === 'cord' ? ((iy & 1) + fy) / 2 : fy));
    const arcF = 0.55 + 0.45 * Math.sin(Math.PI * (pat === 'basket' || pat === 'cord' ? ((ix & 1) + fx) / 2 : fx));
    const warp = Math.pow(tx, flat * 0.5) * (over ? 1 : 0.5) * arcW;
    const weft = Math.pow(ty, flat * 0.5) * (over ? 0.5 : 1) * arcF;
    const top = warp >= weft ? 0 : 1, hv = Math.max(warp, weft);
    // twist of the yarn: fine diagonal lines along each thread
    const ply = top === 0 ? Math.sin((y * 3.2 + fx * 1.4) * Math.PI * 2) : Math.sin((x * 3.2 + fy * 1.4) * Math.PI * 2);
    const fib = (pfbm(u * 64, v * 64, 3, 64, 64, seed + 9) - 0.5);
    f.h[i] = (hv * (1 + 0.06 * ply) + fib * fuzz * 2) * pitch * 0.42;
    const tone = top === 0 ? hash2(ix, 11, seed) : hash2(13, iy, seed);
    f.a[i] = (pat === 'cord' ? 0.42 + 0.58 * Math.sqrt(hv) : 0.8 + 0.2 * Math.sqrt(hv)) * (1 + (tone - 0.5) * 0.12 * (0.5 + slub)) * (1 + fib * 0.1);
    f.r[i] = clamp(0.93 - 0.08 * hv + fib * 0.04);
  });
  return f;
}

export interface KnitOpts { stitches?: number; rows?: number; seed?: number; mm?: number; n?: number; rib?: number }
/**
 * Stockinette knit: columns of V-shaped stitches, each V two plied legs of yarn leaning in towards each other and
 * reaching into the row below. stitches across and rows down the tile; rib > 0 lets every rib-th column sink back
 * (a rib knit, as knitted upholstery and throws have).
 */
export function knit(o: KnitOpts = {}): Field {
  const n = o.n ?? 512, S = o.stitches ?? 16, R = o.rows ?? 22, seed = o.seed ?? 2, rib = o.rib ?? 0;
  const f = blank(n, o.mm ?? 60, 0.92), pitch = (o.mm ?? 60) / S;
  const tilt = 0.5, ca = Math.cos(tilt), sa = Math.sin(tilt);
  each(n, (u, v, i) => {
    const x = u * S, y = v * R;
    let best = 0, along = 0;
    for (let dy = -1; dy <= 1; dy++) {
      const iy = Math.floor(y) + dy, ix0 = Math.floor(x);
      for (let dx = -1; dx <= 1; dx++) {
        const ix = ix0 + dx;
        const jx = (hash2(wrapi(ix, S), wrapi(iy, R), seed) - 0.5) * 0.06, jy = (hash2(wrapi(ix, S), wrapi(iy, R), seed + 1) - 0.5) * 0.06;
        for (const side of [-1, 1]) {
          // leg centre: left or right of the column, leaning in, half a row below the stitch's top
          const cx = ix + 0.5 + side * 0.22 + jx, cy = iy + 0.62 + jy;
          const lx = x - cx, ly = (y - cy) * (S / R);
          const ax = lx * ca - side * ly * sa, ay = side * lx * sa + ly * ca;
          const q = (ax / 0.21) ** 2 + (ay / 0.6) ** 2;
          if (q < 1) {
            const hv = Math.sqrt(1 - q) * (rib && wrapi(ix, rib) === rib - 1 ? 0.55 : 1);
            if (hv > best) { best = hv; along = ay; }
          }
        }
      }
    }
    const ply = Math.sin((along * 7 + x * 0.6) * Math.PI * 2);
    const fib = pfbm(u * 96, v * 96, 3, 96, 96, seed + 5) - 0.5;
    f.h[i] = (best * (1 + 0.07 * ply) + fib * 0.1) * pitch * 0.5;
    f.a[i] = (0.68 + 0.32 * Math.pow(best, 0.6)) * (1 + fib * 0.12);
    f.r[i] = clamp(0.95 - 0.1 * best);
  });
  return f;
}

export interface LoopOpts { loops?: number; seed?: number; mm?: number; n?: number; size?: number }
/** Bouclé: a dense, uneven mat of small curled loops of yarn over a plain ground weave. */
export function boucle(o: LoopOpts = {}): Field {
  const n = o.n ?? 512, seed = o.seed ?? 3, mm = o.mm ?? 50, K = o.loops ?? 2600, sz = o.size ?? 1;
  const f = weave({ n, threads: 48, slub: 0.2, seed: seed + 50, mm, fuzz: 0.05 });
  for (let i = 0; i < f.h.length; i++) { f.h[i] *= 0.35; f.a[i] *= 0.82; }
  const R = rng(seed), tpm = n / mm; // texels per mm
  for (let k = 0; k < K; k++) {
    const cx = R.range(0, n), cy = R.range(0, n), rr = R.range(0.55, 1.25) * sz * tpm, tt = R.range(0.32, 0.55) * sz * tpm, hh = R.range(0.55, 1.0) * sz;
    const sq = R.range(0.6, 1.0), ang = R.range(0, Math.PI), c = Math.cos(ang), s = Math.sin(ang), tone = 0.88 + R.next() * 0.24;
    stampMax(f, cx, cy, rr + tt + 1, (dx, dy) => {
      const lx = dx * c + dy * s, ly = (-dx * s + dy * c) / sq, d = Math.hypot(lx, ly);
      const q = 1 - ((d - rr) / tt) ** 2;
      return q > 0 ? hh * (0.55 + 0.45 * Math.sqrt(q)) * (0.7 + 0.3 * (ly > 0 ? 1 : 0.85)) : 0;
    }, tone);
  }
  each(n, (u, v, i) => {
    const fib = pfbm(u * 128, v * 128, 2, 128, 128, seed + 9) - 0.5;
    const top = f.h[i];
    f.h[i] = top + fib * 0.06;
    f.a[i] = f.a[i] * (0.72 + 0.28 * clamp(top)) * (1 + fib * 0.1);
    f.r[i] = clamp(0.95 - 0.12 * clamp(top));
  });
  return f;
}

export interface PileOpts { knots?: number; seed?: number; mm?: number; n?: number; loop?: boolean }
/** Rug pile: rows of hand-tied knots, each tuft a domed brush of wool fibres, a little uneven in height and lean. */
export function pile(o: PileOpts = {}): Field {
  const n = o.n ?? 512, K = o.knots ?? 24, seed = o.seed ?? 4, mm = o.mm ?? 60;
  const f = blank(n, mm, 0.97), pitch = mm / K;
  each(n, (u, v, i) => {
    const x = u * K, y = v * K;
    const [f1, f2, id] = worley(x * 1.0, y * 1.0, K, K, seed);
    const dome = clamp(1 - (f1 / 0.62) ** 2);
    const ridge = smooth(0.0, 0.18, f2 - f1);
    // fibres splay out from each tuft's centre: streaks running radially, tied to the tuft
    const ang = Math.atan2(y - Math.floor(y) - 0.5, x - Math.floor(x) - 0.5);
    const streak = Math.sin(ang * 9 + id * 40) * 0.5 + (pfbm(u * 160, v * 160, 2, 160, 160, seed + 3) - 0.5);
    const lift = 0.75 + 0.5 * id;
    f.h[i] = (Math.sqrt(dome) * lift * (0.85 + 0.15 * ridge) + streak * 0.08) * pitch * 0.9;
    f.a[i] = (0.62 + 0.38 * Math.pow(dome, 0.5)) * (0.94 + 0.12 * id) * (1 + streak * 0.06);
    f.r[i] = clamp(0.98 - 0.06 * dome);
  });
  return f;
}

// ---- timber, stone, plaster, metal, glaze, bark, leaf ribs -------------------------------------------------------------
export interface GrainOpts { rings?: number; seed?: number; mm?: number; n?: number; pores?: number; rays?: number; figure?: number; finish?: number }
/**
 * Flat-sawn timber, grain along u: growth rings that wander (cathedral figure), darker latewood, open pores drawn out
 * along the grain, short silvery ray flecks (oak), and an oiled finish that is a little glossier on the latewood.
 * a: 0 is earlywood tone, 1 latewood (tint() maps it between the two colours given).
 */
export function grain(o: GrainOpts = {}): Field {
  const n = o.n ?? 512, seed = o.seed ?? 5, mm = o.mm ?? 400, fr = o.rings ?? 18, pores = o.pores ?? 0.5, rays = o.rays ?? 0.4, fig = o.figure ?? 1, fin = o.finish ?? 0.5;
  const f = blank(n, mm, 0.5);
  each(n, (u, v, i) => {
    const warp = pfbm(u * 1, v * 4, 4, 1, 4, seed) - 0.5, warp2 = pfbm(u * 2, v * 16, 3, 2, 16, seed + 1) - 0.5;
    // distance across the board; a gentle arch along the length (cathedral figure) and slow wander
    const t = v * fr + warp * 0.9 * fig + warp2 * 0.12 + Math.abs(Math.sin(Math.PI * (u + warp * 0.15))) * 0.45 * fig;
    const ph = t - Math.floor(t);
    const late = smooth(0.5, 0.8, ph) * (1 - smooth(0.88, 1.0, ph));
    const streak = pfbm(u * 3, v * 120, 3, 3, 120, seed + 3) - 0.5;
    const pore = pnoise(u * 60, v * 900, 60, 900, seed + 7);
    const pd = pore > 0.78 ? (pore - 0.78) * 4.5 * pores * (1 - late * 0.5) : 0;
    const ray = rays > 0 ? clamp((pnoise(u * 50, v * 160, 50, 160, seed + 11) - 0.8) * 7) * rays : 0;
    f.a[i] = clamp(0.18 + late * 0.55 + streak * 0.42 + pd * 0.5 - ray * 0.35);
    f.h[i] = (late * 0.03 - pd * 0.05 + streak * 0.01 + ray * 0.01);
    f.r[i] = clamp(0.62 - fin * 0.25 + pd * 0.25 - late * 0.06 + ray * -0.1 + streak * 0.05);
  });
  return f;
}
/** End grain (the cut end of a board): rings round a pith off to one side, rays running out across them. */
export function endGrain(o: GrainOpts = {}): Field {
  const n = o.n ?? 256, seed = o.seed ?? 6, mm = o.mm ?? 120, fr = o.rings ?? 26;
  const f = blank(n, mm, 0.7);
  each(n, (u, v, i) => {
    const w = pfbm(u * 3, v * 3, 3, 3, 3, seed) - 0.5;
    const d = Math.hypot(Math.sin(u * Math.PI) * 1.2, Math.sin(v * Math.PI) + 0.6) * fr + w * 2;
    const ph = d - Math.floor(d), late = smooth(0.6, 0.85, ph);
    const pore = pnoise(u * 90, v * 90, 90, 90, seed + 2);
    f.a[i] = clamp(0.25 + late * 0.6 + (pore > 0.75 ? 0.25 : 0));
    f.h[i] = -0.03 * (pore > 0.75 ? 1 : 0) + late * 0.01;
    f.r[i] = clamp(0.72 + (pore > 0.75 ? 0.15 : 0));
  });
  return f;
}

export interface StoneOpts { seed?: number; mm?: number; n?: number; kind?: 'travertine' | 'limestone' | 'marble' | 'basalt'; honed?: number }
/** Stone: travertine (banded, pitted), limestone (fine fossil speckle), marble (veins) or basalt (dark, vesicular). */
export function stone(o: StoneOpts = {}): Field {
  const n = o.n ?? 512, seed = o.seed ?? 7, mm = o.mm ?? 300, kind = o.kind ?? 'travertine', honed = o.honed ?? 0.6;
  const f = blank(n, mm, 0.6);
  each(n, (u, v, i) => {
    const w = pfbm(u * 3, v * 3, 5, 3, 3, seed) - 0.5;
    let a = 0.5, h = 0, r = 0.75 - honed * 0.3;
    if (kind === 'travertine') {
      // strata running along the slab, irregular in width and tone, and pits drawn out along them
      const strata = pfbm(u * 2, v * 10 + w * 1.5, 4, 2, 10, seed + 4);
      const fine = pfbm(u * 6, v * 60, 3, 6, 60, seed + 5) - 0.5;
      const [f1, , id] = worley(u * 16, v * 70, 16, 70, seed + 1);
      const rad = 0.16 * (0.4 + id);
      const pit = f1 < rad && id > 0.35 ? smooth(rad, rad * 0.3, f1) : 0;
      a = 0.35 + (strata - 0.5) * 1.1 + fine * 0.35 - pit * 0.4;
      h = -pit * 0.4 + fine * 0.02;
      r = clamp(r + pit * 0.3);
    } else if (kind === 'marble') {
      const vein = Math.abs(Math.sin((u * 3 + v + w * 3.2) * Math.PI * 2));
      const thin = 1 - smooth(0.0, 0.06, vein);
      a = 0.85 + w * 0.15 - thin * 0.55;
      h = 0.0;
      r = 0.2 + thin * 0.05;
    } else if (kind === 'basalt') {
      const [f1, , id] = worley(u * 40, v * 40, 40, 40, seed + 1);
      const ves = f1 < 0.2 * id ? 1 : 0;
      a = 0.5 + w * 0.3 - ves * 0.3;
      h = -ves * 0.3 + (pfbm(u * 120, v * 120, 2, 120, 120, seed + 2) - 0.5) * 0.04;
      r = clamp(0.7 + ves * 0.2);
    } else {
      const sp = pnoise(u * 200, v * 200, 200, 200, seed + 3);
      a = 0.55 + w * 0.25 + (sp > 0.85 ? -0.15 : 0);
      h = (pfbm(u * 60, v * 60, 3, 60, 60, seed + 4) - 0.5) * 0.05 - (sp > 0.85 ? 0.03 : 0);
    }
    f.a[i] = clamp(a); f.h[i] = h; f.r[i] = clamp(r);
  });
  return f;
}

/** Hand-trowelled plaster (or limewash): soft undulation, the arcs where the trowel lifted, and fine sand grit. */
export function plaster(o: { seed?: number; mm?: number; n?: number; strokes?: number } = {}): Field {
  const n = o.n ?? 512, seed = o.seed ?? 8, mm = o.mm ?? 800, K = o.strokes ?? 140;
  const f = blank(n, mm, 0.88);
  each(n, (u, v, i) => { f.h[i] = (pfbm(u * 4, v * 4, 4, 4, 4, seed) - 0.5) * 0.6; f.a[i] = 1 + (pfbm(u * 3, v * 3, 3, 3, 3, seed + 1) - 0.5) * 0.08; });
  const R = rng(seed);
  const tpm = n / mm;
  for (let k = 0; k < K; k++) {
    const cx = R.range(0, n), cy = R.range(0, n), rad = R.range(60, 160) * tpm, ang = R.range(0, Math.PI * 2), sweep = R.range(0.5, 1.2), lip = R.range(0.04, 0.12);
    const c = Math.cos(ang), s = Math.sin(ang);
    const rr = Math.ceil(rad);
    for (let dy = -rr; dy <= rr; dy++) for (let dx = -rr; dx <= rr; dx++) {
      const d = Math.hypot(dx, dy) / rad; if (d > 1) continue;
      const a = Math.atan2(dx * s - dy * c, dx * c + dy * s); if (Math.abs(a) > sweep) continue;
      const i = wrapi(Math.floor(cy) + dy, n) * n + wrapi(Math.floor(cx) + dx, n);
      // a thin raised lip at the edge of each pass, and a slightly smoother, glossier face inside it
      const e0 = ((1 - d) * rad) / (6 * tpm), edge = Math.exp(-e0 * e0);
      f.h[i] += edge * lip * 1.5 + (1 - d) * 0.02;
      f.r[i] = Math.min(f.r[i], 0.8 + d * 0.08);
    }
  }
  each(n, (u, v, i) => {
    const g = pnoise(u * 300, v * 300, 300, 300, seed + 4);
    f.h[i] += g > 0.82 ? (g - 0.82) * 0.6 : 0;
    f.a[i] *= g > 0.9 ? 0.97 : 1;
  });
  return f;
}

/** Brushed metal: long straight streaks along u, a few finer scratches crossing them, roughness that follows. */
export function brushed(o: { seed?: number; mm?: number; n?: number; scratches?: number } = {}): Field {
  const n = o.n ?? 512, seed = o.seed ?? 9, mm = o.mm ?? 120, K = o.scratches ?? 60;
  const f = blank(n, mm, 0.3);
  each(n, (u, v, i) => {
    const s1 = pnoise(u * 3, v * 400, 3, 400, seed), s2 = pnoise(u * 8, v * 1100, 8, 1100, seed + 1);
    f.h[i] = (s1 - 0.5) * 0.004 + (s2 - 0.5) * 0.002;
    f.a[i] = 1 + (s1 - 0.5) * 0.05;
    f.r[i] = clamp(0.28 + (s1 - 0.5) * 0.12 + (s2 - 0.5) * 0.08);
  });
  const R = rng(seed + 2);
  for (let k = 0; k < K; k++) {
    let x = R.range(0, n), y = R.range(0, n); const ang = R.range(-0.4, 0.4), len = R.range(20, 120), dx = Math.cos(ang), dy = Math.sin(ang);
    for (let t = 0; t < len; t++) { const i = wrapi(Math.floor(y), n) * n + wrapi(Math.floor(x), n); f.h[i] -= 0.003; f.r[i] = clamp(f.r[i] + 0.12); x += dx; y += dy; }
  }
  return f;
}

/** Stoneware glaze: gentle throwing ripples along v, pinholes, and a fine crackle in the glaze. */
export function glaze(o: { seed?: number; mm?: number; n?: number; crackle?: number; rings?: number } = {}): Field {
  const n = o.n ?? 512, seed = o.seed ?? 10, mm = o.mm ?? 200, cr = o.crackle ?? 0.6, rings = o.rings ?? 10;
  const f = blank(n, mm, 0.3);
  each(n, (u, v, i) => {
    const rip = Math.sin((v * rings + (pfbm(u * 2, v * 2, 3, 2, 2, seed) - 0.5) * 0.8) * Math.PI * 2);
    const [f1, f2] = worley(u * 14, v * 14, 14, 14, seed + 1);
    const crack = cr * (1 - smooth(0.0, 0.035, f2 - f1));
    const pin = pnoise(u * 160, v * 160, 160, 160, seed + 2) > 0.92 ? 1 : 0;
    const pool = pfbm(u * 4, v * 4, 3, 4, 4, seed + 3) - 0.5;
    f.h[i] = rip * 0.06 - pin * 0.04 - crack * 0.004;
    f.a[i] = 1 + pool * 0.16 - crack * 0.12 - pin * 0.15;
    f.r[i] = clamp(0.22 + pool * 0.1 + pin * 0.4 + crack * 0.05);
  });
  return f;
}

/** Corky bark with vertical fissures (u around the trunk, v up it), as a cabbage tree's trunk has. */
export function bark(o: { seed?: number; mm?: number; n?: number } = {}): Field {
  const n = o.n ?? 512, seed = o.seed ?? 11, mm = o.mm ?? 400;
  const f = blank(n, mm, 0.95);
  each(n, (u, v, i) => {
    const [f1, f2, id] = worley(u * 10, v * 3, 10, 3, seed);
    const fiss = 1 - smooth(0.0, 0.25, f2 - f1);
    const cork = pfbm(u * 30, v * 12, 4, 30, 12, seed + 1);
    f.h[i] = (1 - fiss) * 3 + (cork - 0.5) * 1.2;
    f.a[i] = clamp(0.35 + (1 - fiss) * 0.45 + (cork - 0.5) * 0.3 + (id - 0.5) * 0.15);
    f.r[i] = 0.92;
  });
  return f;
}

/** Strap-leaf venation: many fine parallel veins along v, the leaf faintly glossier between them. */
export function leafRibs(o: { seed?: number; mm?: number; n?: number; veins?: number } = {}): Field {
  const n = o.n ?? 256, seed = o.seed ?? 12, mm = o.mm ?? 40, V = o.veins ?? 24;
  const f = blank(n, mm, 0.5);
  each(n, (u, v, i) => {
    const s = Math.abs(Math.cos(u * V * Math.PI)), vein = Math.pow(1 - s, 6);
    const mott = pfbm(u * 8, v * 32, 3, 8, 32, seed) - 0.5;
    f.h[i] = vein * 0.05 + mott * 0.01;
    f.a[i] = 1 - vein * 0.08 + mott * 0.14;
    f.r[i] = clamp(0.45 + vein * 0.2 + mott * 0.1);
  });
  return f;
}

// ---- packing ---------------------------------------------------------------------------------------------------------------
export interface Packed { n: number; normal: Uint8Array; rough: Uint8Array; albedo: Uint8Array }
/** height (mm) to normals, with `strength` exaggerating the relief (1 = true scale) */
export function pack(f: Field, strength = 1): Packed {
  const n = f.n, px = f.mm / n, k = (0.5 / px) * strength;
  const normal = new Uint8Array(n * n * 4), rough = new Uint8Array(n * n * 4), albedo = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++) {
    const ym = wrapi(y - 1, n) * n, yp = wrapi(y + 1, n) * n, yo = y * n;
    for (let x = 0; x < n; x++) {
      const dx = (f.h[yo + wrapi(x + 1, n)] - f.h[yo + wrapi(x - 1, n)]) * k, dy = (f.h[yp + x] - f.h[ym + x]) * k;
      const il = 1 / Math.sqrt(dx * dx + dy * dy + 1), i = (yo + x) * 4;
      normal[i] = (-dx * il * 0.5 + 0.5) * 255 + 0.5; normal[i + 1] = (-dy * il * 0.5 + 0.5) * 255 + 0.5; normal[i + 2] = (il * 0.5 + 0.5) * 255 + 0.5; normal[i + 3] = 255;
      const r = clamp(f.r[yo + x]) * 255 + 0.5;
      rough[i] = 255; rough[i + 1] = r; rough[i + 2] = 0; rough[i + 3] = 255;
      const a = clamp(f.a[yo + x] * 0.5) * 255 + 0.5;
      albedo[i] = albedo[i + 1] = albedo[i + 2] = a; albedo[i + 3] = 255;
    }
  }
  return { n, normal, rough, albedo };
}

const toLin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toSrgb = (c: number) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);
/** sRGB hex colour, e.g. 0xd9cfc0, as linear [r, g, b] */
export const lin = (hex: number): [number, number, number] => [toLin(((hex >> 16) & 255) / 255), toLin(((hex >> 8) & 255) / 255), toLin((hex & 255) / 255)];
/**
 * A colour map (sRGB bytes). With one colour, the albedo multiplier scales it; with two, a in [0, 1] mixes between
 * them (grain: earlywood to latewood). Mixing and scaling happen in linear light.
 */
export function tint(f: Field, c0: number, c1?: number): Uint8Array {
  const n = f.n, out = new Uint8Array(n * n * 4), A = lin(c0), B = c1 === undefined ? null : lin(c1);
  for (let i = 0; i < n * n; i++) {
    const a = f.a[i], j = i * 4;
    for (let c = 0; c < 3; c++) { const v = B ? A[c] + (B[c] - A[c]) * clamp(a) : A[c] * a; out[j + c] = clamp(toSrgb(clamp(v))) * 255 + 0.5; }
    out[j + 3] = 255;
  }
  return out;
}
/** average linear albedo of a tinted map (for checks and for a renderer's bounce colour) */
export function meanColour(bytes: Uint8Array): [number, number, number] {
  let r = 0, g = 0, b = 0, k = 0;
  for (let i = 0; i < bytes.length; i += 16) { r += toLin(bytes[i] / 255); g += toLin(bytes[i + 1] / 255); b += toLin(bytes[i + 2] / 255); k++; }
  return [r / k, g / k, b / k];
}
