import * as THREE from 'three';

// Procedural PBR texture sets, generated on a canvas so they embed in a GLB:
//   map    base colour (sRGB)
//   orm    occlusion (R), roughness (G), metalness (B), linear: three's and glTF's packing
//   normal tangent-space normal map from a height field (Sobel), linear
// Every pattern tiles: noise lattices wrap at the tile's period, so RepeatWrapping is seamless.
// One texture tile covers `tile` metres; geometry UVs are in metres (see util.metreUVs).

export interface PBRSet {
  map: THREE.Texture;
  orm: THREE.Texture;
  normal: THREE.Texture;
  /** metres one tile covers */
  tile: number;
}

type RGB = [number, number, number];

// --- tileable value noise -------------------------------------------------------------------
function hash(x: number, y: number, seed: number) {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
function noise(x: number, y: number, px: number, py: number, seed: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const m = (a: number, p: number) => ((a % p) + p) % p;
  const a = hash(m(xi, px), m(yi, py), seed);
  const b = hash(m(xi + 1, px), m(yi, py), seed);
  const c = hash(m(xi, px), m(yi + 1, py), seed);
  const d = hash(m(xi + 1, px), m(yi + 1, py), seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
/** fbm on the unit square, tiling: fx, fy = base frequency (integers) */
function fbm(x: number, y: number, fx: number, fy: number, oct: number, seed: number) {
  let s = 0;
  let amp = 0.5;
  let norm = 0;
  for (let o = 0; o < oct; o++) {
    s += amp * noise(x * fx, y * fy, fx, fy, seed + o * 17);
    norm += amp;
    amp *= 0.5;
    fx *= 2;
    fy *= 2;
  }
  return s / norm;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const mixRGB = (a: RGB, b: RGB, t: number): RGB => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
const hex = (h: number): RGB => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];

/** Run a per-pixel shader over a size×size tile: returns colour (sRGB 0..1), height, roughness, metalness, and optionally occlusion (default 1). */
function bake(size: number, tile: number, fn: (u: number, v: number) => { c: RGB; h: number; r: number; m: number; o?: number }, normalStrength: number, name: string): PBRSet {
  const n = size * size;
  const col = new Uint8ClampedArray(new ArrayBuffer(n * 4));
  const orm = new Uint8ClampedArray(new ArrayBuffer(n * 4));
  const hgt = new Float32Array(n);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const s = fn((x + 0.5) / size, (y + 0.5) / size);
      col[i * 4] = s.c[0] * 255;
      col[i * 4 + 1] = s.c[1] * 255;
      col[i * 4 + 2] = s.c[2] * 255;
      col[i * 4 + 3] = 255;
      orm[i * 4] = s.o === undefined ? 255 : clamp01(s.o) * 255;
      orm[i * 4 + 1] = clamp01(s.r) * 255;
      orm[i * 4 + 2] = clamp01(s.m) * 255;
      orm[i * 4 + 3] = 255;
      hgt[i] = s.h;
    }
  }
  // normals from the wrapped height field
  const nor = new Uint8ClampedArray(new ArrayBuffer(n * 4));
  const H = (x: number, y: number) => hgt[((y + size) % size) * size + ((x + size) % size)];
  const k = normalStrength * (size / 512);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (H(x + 1, y - 1) + 2 * H(x + 1, y) + H(x + 1, y + 1) - H(x - 1, y - 1) - 2 * H(x - 1, y) - H(x - 1, y + 1)) * k;
      const dy = (H(x - 1, y + 1) + 2 * H(x, y + 1) + H(x + 1, y + 1) - H(x - 1, y - 1) - 2 * H(x, y - 1) - H(x + 1, y - 1)) * k;
      const l = Math.hypot(dx, dy, 1);
      const i = (y * size + x) * 4;
      nor[i] = (-dx / l) * 127.5 + 127.5;
      // canvas rows run down, texture v runs up: flip the y slope (OpenGL / glTF convention)
      nor[i + 1] = (dy / l) * 127.5 + 127.5;
      nor[i + 2] = (1 / l) * 127.5 + 127.5;
      nor[i + 3] = 255;
    }
  }
  const tex = (data: Uint8ClampedArray<ArrayBuffer>, srgb: boolean, suffix: string) => {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    c.getContext('2d')!.putImageData(new ImageData(data as Uint8ClampedArray<ArrayBuffer>, size, size), 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    t.name = `${name}_${suffix}`;
    return t;
  };
  return { map: tex(col, true, 'basecolor'), orm: tex(orm, false, 'orm'), normal: tex(nor, false, 'normal'), tile };
}

/** A material from a set; roughness/metalness come from the ORM map (factors left at 1). */
export function pbr(set: PBRSet, name: string, extra: THREE.MeshPhysicalMaterialParameters = {}) {
  return new THREE.MeshPhysicalMaterial({
    name,
    map: set.map,
    roughnessMap: set.orm,
    metalnessMap: set.orm,
    normalMap: set.normal,
    roughness: 1,
    metalness: 1,
    ...extra,
  });
}

// --- the surfaces ----------------------------------------------------------------------------

/**
 * Timber: growth rings along the board (U = along the grain), pores, figure, finish.
 * `straight` (0 to 1, default 0) calms the ring warp toward straight, quarter-sawn grain, and
 * `relief` scales the normal map (default 1); both leave the default surface unchanged.
 */
export function wood(size: number, o: { light: number; dark: number; tile?: number; rings?: number; figure?: number; gloss?: number; seed?: number; pores?: number; name?: string; straight?: number; relief?: number }) {
  const L = hex(o.light);
  const D = hex(o.dark);
  const rings = o.rings ?? 18;
  const seed = o.seed ?? 1;
  const gloss = o.gloss ?? 0.3; // 0 = raw/oiled, 1 = high-gloss lacquer
  return bake(
    size,
    o.tile ?? 0.4,
    (u, v) => {
      // rings: bands across V, warped along U by slow noise so they flow like flat-sawn grain
      const warp = (fbm(u, v, 2, 3, 4, seed) * 2.2 + fbm(u, v, 1, 8, 3, seed + 5) * 0.6) * (1 - 0.85 * (o.straight ?? 0));
      const r = v * rings + warp * 3;
      const band = Math.pow(0.5 + 0.5 * Math.sin(r * Math.PI * 2), 3);
      // with `straight`, the fine streak runs with the grain rather than across it
      const st = o.straight ?? 0;
      const fine = st > 0 ? fbm(u, v, 64, 2, 3, seed + 9) * (1 - st) + fbm(u, v, 2, 96, 3, seed + 9) * st : fbm(u, v, 64, 2, 3, seed + 9);
      // with `straight`, pores are drawn out along the grain and the cross-figure is calmed
      const poreN = st > 0 ? fbm(u, v, 128, 6, 2, seed + 13) * (1 - st) + fbm(u, v, 8, 160, 2, seed + 13) * st : fbm(u, v, 128, 6, 2, seed + 13);
      const pore = (o.pores ?? 0.5) * Math.max(0, poreN - 0.62) * 3;
      const fig = (o.figure ?? 0.15) * Math.sin((u * 40 + warp * 6) * Math.PI) * (1 - st);
      // latewood bands read, but softly: most of the board is the fine streak
      const streak = fbm(u, v, 3, 90, 3, seed + 21);
      let t = clamp01(band * 0.38 + fine * 0.3 + streak * 0.32 + fig * 0.15);
      const c = mixRGB(L, D, t);
      const shade = 1 - pore * 0.5;
      return {
        c: [c[0] * shade, c[1] * shade, c[2] * shade],
        h: band * 0.3 + fine * 0.2 - pore * 0.6,
        r: mix(0.75, 0.12, gloss) + pore * 0.2 + (fine - 0.5) * 0.05,
        m: 0,
      };
    },
    (gloss > 0.6 ? 0.5 : 1.6) * (o.relief ?? 1),
    o.name ?? 'wood',
  );
}

/** Brushed or satin metal: streaks along U. */
export function metal(size: number, o: { tint: number; rough: number; brush?: number; tile?: number; seed?: number; name?: string }) {
  const T = hex(o.tint);
  const seed = o.seed ?? 3;
  const brush = o.brush ?? 1;
  return bake(
    size,
    o.tile ?? 0.15,
    (u, v) => {
      const streak = fbm(u, v, 1, 256, 3, seed) * 0.7 + fbm(u, v, 4, 512, 2, seed + 1) * 0.3;
      const blotch = fbm(u, v, 3, 3, 3, seed + 2);
      const k = 0.94 + (streak - 0.5) * 0.12 * brush + (blotch - 0.5) * 0.05;
      return { c: [T[0] * k, T[1] * k, T[2] * k], h: streak * brush, r: o.rough + (streak - 0.5) * 0.12 * brush + (blotch - 0.5) * 0.06, m: 1 };
    },
    0.25,
    o.name ?? 'metal',
  );
}

/** Seasoned cast iron: near-black, a satin sheen where it's polished, pitted. */
export function castIron(size: number, o: { tile?: number; seed?: number } = {}) {
  const seed = o.seed ?? 7;
  return bake(
    size,
    o.tile ?? 0.12,
    (u, v) => {
      const pit = fbm(u, v, 48, 48, 3, seed);
      const grain = fbm(u, v, 160, 160, 2, seed + 4);
      const patch = fbm(u, v, 3, 3, 3, seed + 8);
      const k = 0.06 + grain * 0.03 + patch * 0.02;
      return { c: [k, k * 0.98, k * 0.96], h: pit * 0.6 + grain * 0.4, r: 0.5 + (pit - 0.5) * 0.3 + (1 - patch) * 0.15, m: 0.55 };
    },
    2.2,
    'cast_iron',
  );
}

/** Woven linen: warp and weft threads with slubs, a little colour drift between threads. */
export function linen(size: number, o: { colour: number; threads?: number; tile?: number; seed?: number; name?: string }) {
  const C = hex(o.colour);
  const n = o.threads ?? 96;
  const seed = o.seed ?? 11;
  return bake(
    size,
    o.tile ?? 0.08,
    (u, v) => {
      const x = u * n;
      const y = v * n;
      const xi = Math.floor(x);
      const yi = Math.floor(y);
      // plain weave: over-under alternates every thread
      const over = (xi + yi) % 2 === 0;
      const fx = x - xi;
      const fy = y - yi;
      const slubU = 0.75 + 0.5 * noise(u * 24, yi * 0.37, 24, 1e6, seed);
      const slubV = 0.75 + 0.5 * noise(xi * 0.41, v * 24, 1e6, 24, seed + 1);
      const warp = Math.sin(fx * Math.PI) * slubV;
      const weft = Math.sin(fy * Math.PI) * slubU;
      const h = over ? warp * 0.9 + weft * 0.4 : weft * 0.9 + warp * 0.4;
      const drift = (hash(over ? xi : yi, over ? 1 : 2, seed) - 0.5) * 0.08;
      const k = 0.82 + h * 0.2 + drift;
      return { c: [C[0] * k, C[1] * k, C[2] * k], h, r: 0.88 - h * 0.08, m: 0 };
    },
    1.4,
    o.name ?? 'linen',
  );
}

/** Wool twill: a herringbone of fuzzy yarns, two colours. */
export function woolHerringbone(size: number, o: { a: number; b: number; tile?: number; seed?: number; name?: string }) {
  const A = hex(o.a);
  const B = hex(o.b);
  const seed = o.seed ?? 13;
  const n = 48;
  return bake(
    size,
    o.tile ?? 0.1,
    (u, v) => {
      const x = u * n;
      const y = v * n;
      const col = Math.floor(x / 6);
      const dir = col % 2 === 0 ? 1 : -1;
      const diag = (x * dir + y) % 4;
      const twill = diag < 2 ? 1 : 0;
      const fuzz = fbm(u, v, 96, 96, 3, seed);
      const yarn = 0.5 + 0.5 * Math.sin(((x * dir + y) % 1) * Math.PI);
      const c = twill ? A : B;
      const k = 0.85 + fuzz * 0.25;
      return { c: [c[0] * k, c[1] * k, c[2] * k], h: yarn * 0.5 + fuzz * 0.5 + twill * 0.2, r: 0.95, m: 0 };
    },
    1.2,
    o.name ?? 'wool',
  );
}

/** Wool pile (a rug): dense tufts, a soft two-tone pattern. */
export function woolPile(size: number, o: { a: number; b: number; tile?: number; seed?: number; name?: string }) {
  const A = hex(o.a);
  const B = hex(o.b);
  const seed = o.seed ?? 17;
  return bake(
    size,
    o.tile ?? 0.25,
    (u, v) => {
      const tuft = fbm(u, v, 128, 128, 2, seed);
      const loop = 0.5 + 0.5 * Math.sin(u * 128 * Math.PI) * Math.sin(v * 128 * Math.PI);
      // a broad, hand-drawn looking stripe pattern across the rug
      const band = 0.5 + 0.5 * Math.sin((v * 4 + fbm(u, v, 2, 2, 3, seed + 3) * 0.6) * Math.PI * 2);
      const c = mixRGB(A, B, band > 0.62 ? 1 : 0);
      const k = 0.8 + tuft * 0.3;
      return { c: [c[0] * k, c[1] * k, c[2] * k], h: tuft * 0.7 + loop * 0.3, r: 0.97, m: 0 };
    },
    1.6,
    o.name ?? 'wool_pile',
  );
}

/** Painted timber or metal: flat colour, a little orange peel, brush marks along U. */
export function paint(size: number, o: { colour: number; gloss: number; tile?: number; seed?: number; name?: string }) {
  const C = hex(o.colour);
  const seed = o.seed ?? 19;
  return bake(
    size,
    o.tile ?? 0.2,
    (u, v) => {
      const peel = fbm(u, v, 24, 24, 3, seed);
      const brush = fbm(u, v, 2, 96, 2, seed + 2);
      const k = 0.97 + (brush - 0.5) * 0.04;
      return { c: [C[0] * k, C[1] * k, C[2] * k], h: peel * 0.3 + brush * 0.4, r: mix(0.7, 0.2, o.gloss) + (peel - 0.5) * 0.08, m: 0 };
    },
    0.6,
    o.name ?? 'paint',
  );
}

/** Knitted acoustic grille cloth. */
export function grille(size: number, o: { colour: number; tile?: number; seed?: number }) {
  const C = hex(o.colour);
  return bake(
    size,
    o.tile ?? 0.03,
    (u, v) => {
      const n = 32;
      const x = u * n;
      const y = v * n;
      const k = 0.5 + 0.5 * Math.sin((x + Math.sin(y * Math.PI) * 0.25) * Math.PI * 2) * Math.sin(y * Math.PI * 2);
      const f = fbm(u, v, 64, 64, 2, o.seed ?? 23);
      const s = 0.8 + k * 0.25 + f * 0.1;
      return { c: [C[0] * s, C[1] * s, C[2] * s], h: k, r: 0.92, m: 0 };
    },
    1.0,
    'grille_cloth',
  );
}

/** Plain plastics, rubbers and resins: colour with a faint grain. */
export function plastic(size: number, o: { colour: number; rough: number; tile?: number; seed?: number; name?: string }) {
  const C = hex(o.colour);
  return bake(
    size,
    o.tile ?? 0.1,
    (u, v) => {
      const g = fbm(u, v, 32, 32, 3, o.seed ?? 29);
      const k = 0.97 + (g - 0.5) * 0.06;
      return { c: [C[0] * k, C[1] * k, C[2] * k], h: g, r: o.rough + (g - 0.5) * 0.06, m: 0 };
    },
    0.3,
    o.name ?? 'plastic',
  );
}

/**
 * Hot-dip galvanised steel: zinc spangle crystals, each its own grey and sheen. `wear` (0 to 1,
 * default 0, which leaves the surface as new) dulls it toward weathered zinc: matte grey-white
 * patina in blotches, and a few rust-brown freckles where the coating has gone.
 */
export function galvanised(size: number, o: { tile?: number; seed?: number; name?: string; wear?: number } = {}) {
  const seed = o.seed ?? 31;
  const wear = o.wear ?? 0;
  const n = 14;
  return bake(
    size,
    o.tile ?? 0.3,
    (u, v) => {
      // nearest of a jittered grid of crystal centres (tiling)
      let best = 9;
      let second = 9;
      let id = 0;
      const gx = Math.floor(u * n);
      const gy = Math.floor(v * n);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const cx = gx + dx;
          const cy = gy + dy;
          const wx = ((cx % n) + n) % n;
          const wy = ((cy % n) + n) % n;
          const px = (cx + hash(wx, wy, seed)) / n;
          const py = (cy + hash(wx, wy, seed + 1)) / n;
          const d = Math.hypot(u - px, v - py);
          if (d < best) {
            second = best;
            best = d;
            id = wx * 131 + wy;
          } else if (d < second) second = d;
        }
      }
      const tone = 0.62 + 0.22 * hash(id, 7, seed + 2);
      const edge = Math.min(1, (second - best) * n * 6);
      const k = tone * (0.92 + 0.08 * edge);
      const c: RGB = [k, k * 1.01, k * 1.03];
      let r = 0.28 + 0.2 * hash(id, 5, seed + 3);
      let m = 1;
      let h = edge * 0.3 + hash(id, 3, seed) * 0.2;
      if (wear > 0) {
        // patina: zinc carbonate dulls the spangle in drifts; rust where the zinc has gone
        const drift = clamp01((fbm(u, v, 4, 4, 4, seed + 40) - 0.35) * 2.2) * wear;
        const fleck = clamp01((fbm(u, v, 40, 40, 3, seed + 44) - 0.66) * 6) * wear * clamp01(fbm(u, v, 3, 3, 3, seed + 46) * 2 - 0.6);
        const pat: RGB = [0.66, 0.67, 0.64];
        const rust: RGB = [0.42, 0.25, 0.14];
        // weathering dulls everything a little and the drifts a lot, flattening the spangle
        const dull = clamp01(0.45 * wear + drift);
        const t = mixRGB(mixRGB(c, pat, dull * 0.85), rust, fleck);
        c[0] = t[0];
        c[1] = t[1];
        c[2] = t[2];
        r = mix(r, 0.72, dull) + fleck * 0.2;
        m = mix(1, 0.35, dull) * (1 - fleck);
        h = h * (1 - 0.75 * dull) + fleck * 0.6 + drift * 0.1;
      }
      return { c, h, r, m };
    },
    0.4,
    o.name ?? 'galvanised_steel',
  );
}

/**
 * Painted bevel-back weatherboards as a surface: `boards` boards per tile, each lap casting a
 * shadow line, a faint grain under the paint. The tile is `boards × cover` metres tall.
 */
export function weatherboardPaint(size: number, o: { colour: number; cover?: number; boards?: number; gloss?: number; seed?: number; name?: string }) {
  const C = hex(o.colour);
  const boards = o.boards ?? 4;
  const cover = o.cover ?? 0.158;
  const seed = o.seed ?? 37;
  return bake(
    size,
    boards * cover,
    (u, v) => {
      const b = v * boards;
      const f = b - Math.floor(b); // 0 at a board's bottom edge … 1 under the next lap
      // the bevel: thick at the bottom edge, thinning upward; the lap above shadows it
      const bevel = 1 - f * 0.55;
      const shadow = f > 0.9 ? 0.55 + 0.45 * (1 - (f - 0.9) / 0.1) : 1;
      const grain = fbm(u, v, 2, 64, 3, seed + Math.floor(b));
      const k = (0.86 + 0.1 * bevel) * (f < 0.03 ? 0.8 : 1) * (0.98 + 0.03 * grain) * (f > 0.9 ? shadow : 1);
      return { c: [C[0] * k, C[1] * k, C[2] * k], h: bevel * 0.8 + grain * 0.05 - (f < 0.02 ? 0.4 : 0), r: mix(0.75, 0.35, o.gloss ?? 0.4) + grain * 0.05, m: 0 };
    },
    2.4,
    o.name ?? 'painted_weatherboard',
  );
}

/** Cast or precast concrete: broad mottling, sand grain, dark aggregate flecks and bug holes. */
export function concrete(size: number, o: { colour: number; tile?: number; seed?: number; pores?: number; mottle?: number; rough?: number; name?: string }) {
  const C = hex(o.colour);
  const seed = o.seed ?? 71;
  const pores = o.pores ?? 1;
  const mottle = o.mottle ?? 1;
  return bake(
    size,
    o.tile ?? 0.4,
    (u, v) => {
      const mot = fbm(u, v, 3, 3, 4, seed);
      const mid = fbm(u, v, 20, 20, 3, seed + 3);
      const sand = fbm(u, v, 256, 256, 1, seed + 5);
      const grit = fbm(u, v, 128, 128, 2, seed + 7);
      const fleck = grit > 0.68 ? (grit - 0.68) * 4 : grit < 0.3 ? -(0.3 - grit) * 2 : 0;
      const pore = pores * clamp01((fbm(u, v, 72, 72, 2, seed + 9) - 0.71) * 7);
      const k = 0.92 + (mot - 0.5) * 0.2 * mottle + (mid - 0.5) * 0.08 + (sand - 0.5) * 0.12 - fleck * 0.18 - pore * 0.45;
      return {
        c: [C[0] * k, C[1] * k, C[2] * k * 0.99],
        h: sand * 0.35 + mid * 0.3 + Math.abs(fleck) * 0.3 - pore * 1.6,
        r: (o.rough ?? 0.86) + (sand - 0.5) * 0.1 + pore * 0.08 - (mot - 0.5) * 0.06,
        m: 0,
      };
    },
    1.1,
    o.name ?? 'concrete',
  );
}

/**
 * Weathered, unpainted timber (old fence posts, battens): silvered grey with long streaks along
 * the grain (U), raised latewood, open checks (drying splits) running with the grain, and
 * optional pale lichen.
 */
export function weatheredWood(size: number, o: { light: number; dark: number; tile?: number; seed?: number; checks?: number; lichen?: number; name?: string }) {
  const L = hex(o.light);
  const D = hex(o.dark);
  const seed = o.seed ?? 81;
  const checks = o.checks ?? 1;
  const lichen = o.lichen ?? 0;
  const lanes = 7;
  return bake(
    size,
    o.tile ?? 0.5,
    (u, v) => {
      const streak = fbm(u, v, 2, 40, 3, seed);
      const fine = fbm(u, v, 6, 180, 2, seed + 1);
      const warp = fbm(u, v, 2, 3, 3, seed + 2);
      // latewood ridges stand proud where the soft earlywood has worn away
      const ring = Math.pow(0.5 + 0.5 * Math.sin((v * 22 + warp * 3) * Math.PI * 2), 4);
      // checks: a few long splits per tile, opening and closing along their length
      const cv = v * lanes + (fbm(u, v, 1, 3, 3, seed + 3) - 0.5) * 0.9;
      const lane = Math.floor(cv);
      const f = cv - lane;
      const open = noise(u * 3, lane + 0.5, 3, lanes, seed + 4);
      const w = Math.max(0, open - 0.5) * 0.09 * checks;
      const crack = w > 0 ? 1 - THREE.MathUtils.smoothstep(Math.abs(f - 0.5), w * 0.35, w) : 0;
      const blot = clamp01((fbm(u, v, 5, 5, 4, seed + 6) - 0.62) * 5) * lichen;
      const lich: RGB = [0.66, 0.68, 0.58];
      let c = mixRGB(L, D, clamp01(streak * 0.55 + fine * 0.35 + ring * 0.15));
      c = mixRGB(c, lich, blot * (0.5 + 0.5 * fine));
      const k = 1 - crack * 0.7;
      return {
        c: [c[0] * k, c[1] * k, c[2] * k],
        h: streak * 0.25 + fine * 0.3 + ring * 0.35 - crack * 1.4 + blot * 0.15,
        r: 0.9 + (fine - 0.5) * 0.08 - ring * 0.04,
        m: 0,
      };
    },
    2.0,
    o.name ?? 'weathered_timber',
  );
}

/** Mattress ticking: a tight twill with woven stripes running along U. */
export function ticking(size: number, o: { ground: number; stripe: number; tile?: number; seed?: number; name?: string }) {
  const G = hex(o.ground);
  const S = hex(o.stripe);
  const seed = o.seed ?? 91;
  const n = 160;
  return bake(
    size,
    o.tile ?? 0.1,
    (u, v) => {
      // two stripe repeats per tile: one broad stripe flanked by two fine ones
      const sv = (v * 2) % 1;
      const stripe = (sv > 0.1 && sv < 0.26) || (sv > 0.32 && sv < 0.35) || (sv > 0.01 && sv < 0.04) ? 1 : 0;
      const x = u * n;
      const y = v * n;
      const diag = (Math.floor(x) + Math.floor(y)) % 3;
      const fx = x - Math.floor(x);
      const fy = y - Math.floor(y);
      const t = diag === 0 ? Math.sin(fx * Math.PI) : Math.sin(fy * Math.PI) * 0.8;
      const fuzz = fbm(u, v, 64, 64, 2, seed);
      const c = stripe ? mixRGB(S, G, 0.08 * (1 - t)) : G;
      const k = 0.86 + t * 0.12 + (fuzz - 0.5) * 0.06;
      return { c: [c[0] * k, c[1] * k, c[2] * k], h: t * 0.8 + fuzz * 0.2, r: 0.8 - t * 0.06, m: 0 };
    },
    1.2,
    o.name ?? 'ticking',
  );
}

/** Woven galvanised wire mesh (a leaf strainer): raised wires, dark openings between them. */
export function wireMesh(size: number, o: { openings?: number; wire?: number; tile?: number; seed?: number; name?: string } = {}) {
  const n = o.openings ?? 40;
  const w = o.wire ?? 0.28;
  const seed = o.seed ?? 97;
  return bake(
    size,
    o.tile ?? 0.1,
    (u, v) => {
      const x = u * n;
      const y = v * n;
      const fx = x - Math.floor(x);
      const fy = y - Math.floor(y);
      const dx = Math.abs(fx - 0.5) * 2;
      const dy = Math.abs(fy - 0.5) * 2;
      // a wire runs along each cell border; over-under alternates
      const onX = 1 - THREE.MathUtils.smoothstep(1 - dx, w * 0.6, w);
      const onY = 1 - THREE.MathUtils.smoothstep(1 - dy, w * 0.6, w);
      const over = (Math.floor(x + 0.5) + Math.floor(y + 0.5)) % 2 === 0;
      const wire = Math.max(onX, onY);
      const hgt = over ? onX * 0.9 + onY * 0.5 : onY * 0.9 + onX * 0.5;
      const sp = 0.66 + 0.18 * fbm(u, v, 12, 12, 3, seed);
      const hole = 0.05;
      const k = mix(hole, sp, wire);
      return { c: [k, k * 1.01, k * 1.02], h: hgt, r: mix(0.9, 0.35, wire), m: wire };
    },
    1.6,
    o.name ?? 'wire_mesh',
  );
}

/**
 * Paint over a pressed or moulded relief whose height (metres) is given over one tile by
 * `height(u, v)`, u and v in 0..1. Bakes an occlusion term (how far the surroundings rise above
 * each point) into the ORM's red channel and darkens crevices a little in the base colour, as
 * aged paint does. `relief` (0..1) puts the relief's fine detail (the height less a 5 mm blur)
 * into the normal map, for a lighter mesh that cannot carry it; 0 leaves only the paint's own
 * orange peel, for a mesh that already has the relief. Use with pbr(…, { aoMap: set.orm }).
 */
export function reliefPaint(size: number, o: { colour: number; gloss: number; tile: number; height: (u: number, v: number) => number; relief?: number; cavity?: number; seed?: number; name?: string }) {
  const C = hex(o.colour);
  const seed = o.seed ?? 101;
  const relief = o.relief ?? 0;
  const cavity = o.cavity ?? 1;
  // the height field once, on the pixel grid (wrapping)
  const H = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) H[y * size + x] = o.height((x + 0.5) / size, (y + 0.5) / size);
  const at = (x: number, y: number) => H[(((y % size) + size) % size) * size + (((x % size) + size) % size)];
  const px = o.tile / size; // metres per pixel
  const radii = [0.0025, 0.006, 0.012].map((m) => Math.max(1, Math.round(m / px)));
  const blur = Math.max(1, Math.round(0.0025 / px));
  const dirs = Array.from({ length: 8 }, (_, i) => [Math.cos((i * Math.PI) / 4), Math.sin((i * Math.PI) / 4)]);
  return bake(
    size,
    o.tile,
    (u, v) => {
      const x = Math.floor(u * size);
      const y = Math.floor(v * size);
      const h = at(x, y);
      // occlusion: mean horizon slope over 8 directions at three radii
      let occ = 0;
      for (const r of radii) for (const [dx, dy] of dirs) occ += clamp01((at(x + Math.round(dx * r), y + Math.round(dy * r)) - h) / (r * px));
      occ /= radii.length * dirs.length;
      const ao = 1 - clamp01(occ * 1.3) * 0.75 * cavity;
      const lo = (at(x - blur, y) + at(x + blur, y) + at(x, y - blur) + at(x, y + blur) + at(x - blur, y - blur) + at(x + blur, y + blur) + at(x - blur, y + blur) + at(x + blur, y - blur) + h) / 9;
      const peel = fbm(u, v, 48, 48, 3, seed);
      const k = (0.96 + (peel - 0.5) * 0.03) * (0.86 + 0.14 * ao);
      return {
        c: [C[0] * k, C[1] * k, C[2] * k],
        h: (h - lo) * relief + peel * 0.00004,
        r: mix(0.7, 0.22, o.gloss) + (peel - 0.5) * 0.06 + (1 - ao) * 0.12,
        m: 0,
        o: ao,
      };
    },
    64 / o.tile,
    o.name ?? 'relief_paint',
  );
}

/**
 * A uniform ambient-occlusion texture for the inside of an enclosed piece (a cabinet's shelves
 * and back), so light from the environment doesn't fill it: R = `value`, used as an aoMap.
 */
export function flatOcclusion(value: number, name = 'interior_occlusion') {
  const c = document.createElement('canvas');
  c.width = c.height = 4;
  const g = c.getContext('2d')!;
  const k = Math.round(clamp01(value) * 255);
  g.fillStyle = `rgb(${k},255,0)`;
  g.fillRect(0, 0, 4, 4);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  t.name = name;
  return t;
}

export { bake, fbm, hex, mix, clamp01 };
export type { RGB };
