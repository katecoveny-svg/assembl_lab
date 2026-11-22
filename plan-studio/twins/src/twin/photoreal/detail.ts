// Procedural surface detail for the photoreal look: every texture here is drawn in code (seeded noise), none is a
// photograph. Two jobs:
//  1. Replace the scanned photographs the normal view uses (deck boards, roof steel, weathered framing, bark, forest
//     floor) and the LINZ aerial photo on the ground with drawn equivalents at the same real size.
//  2. Give every surface that had no texture a fine micro-structure (weave, grain, roller stipple, brushing, orange
//     peel, aggregate) in its normal and roughness maps: that is what catches light and stops surfaces reading as plastic.
// Kate's rule (22 Nov 2026): "procedural is key".
import * as THREE from 'three/webgpu';
import type { Detail } from './giMaterial.ts';

// ---- seeded noise ----
function rng(seed: number) { let s = seed >>> 0 || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
/** tileable value noise on an n×n lattice, sampled at (x, y) in lattice units */
function lattice(n: number, seed: number) {
  const r = rng(seed), L = new Float32Array(n * n);
  for (let i = 0; i < L.length; i++) L[i] = r();
  return (x: number, y: number) => {
    const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = ((xi % n) + n) % n, b = (a + 1) % n, c = ((yi % n) + n) % n, d = (c + 1) % n;
    const v00 = L[c * n + a], v10 = L[c * n + b], v01 = L[d * n + a], v11 = L[d * n + b];
    return (v00 * (1 - sx) + v10 * sx) * (1 - sy) + (v01 * (1 - sx) + v11 * sx) * sy;
  };
}
/** fbm over a tile: u, v in [0, 1); base lattice size `f`; anisotropy stretches along u */
function fbm(seed: number, f: number, oct = 5, aniso = 1) {
  const L = Array.from({ length: oct }, (_, i) => lattice(Math.max(1, Math.round(f * 2 ** i)), seed + i * 977));
  const Lv = Array.from({ length: oct }, (_, i) => lattice(Math.max(1, Math.round(f * aniso * 2 ** i)), seed + i * 977));
  return (u: number, v: number) => {
    let s = 0, a = 0.5, w = 0;
    for (let i = 0; i < oct; i++) {
      const n = Math.max(1, Math.round(f * 2 ** i)), m = Math.max(1, Math.round(f * aniso * 2 ** i));
      s += a * (aniso === 1 ? L[i](u * n, v * n) : (L[i](u * n, v * m) + Lv[i](u * n, v * m)) * 0.5); w += a; a *= 0.5;
    }
    return s / w;
  };
}

const N = 512;
interface Maps { col: Float32Array | null; h: Float32Array; rough: Float32Array }
const lin2s = (x: number) => (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
const s2lin = (x: number) => (x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4));
const hex = (h: number): [number, number, number] => [s2lin(((h >> 16) & 255) / 255), s2lin(((h >> 8) & 255) / 255), s2lin((h & 255) / 255)];

function canvasFrom(fn: (i: number, o: Uint8ClampedArray) => void): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = c.height = N;
  const g = c.getContext('2d')!, img = g.createImageData(N, N);
  for (let i = 0; i < N * N; i++) fn(i, img.data);
  g.putImageData(img, 0, 0);
  return c;
}
/** texture objects from height, colour and roughness fields; `bump` scales the normal */
function toTextures(m: Maps, bump: number): { map: THREE.Texture | null; normal: THREE.Texture; rough: THREE.Texture } {
  const H = m.h;
  const nrm = canvasFrom((i, o) => {
    const x = i % N, y = (i / N) | 0;
    const dx = H[y * N + ((x + 1) % N)] - H[y * N + ((x + N - 1) % N)], dy = H[((y + 1) % N) * N + x] - H[((y + N - 1) % N) * N + x];
    let nx = -dx * bump, ny = dy * bump, nz = 1; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    o[i * 4] = (nx * 0.5 + 0.5) * 255; o[i * 4 + 1] = (ny * 0.5 + 0.5) * 255; o[i * 4 + 2] = (nz * 0.5 + 0.5) * 255; o[i * 4 + 3] = 255;
  });
  const rgh = canvasFrom((i, o) => { const r = Math.max(0, Math.min(1, m.rough[i])) * 255; o[i * 4] = r; o[i * 4 + 1] = r; o[i * 4 + 2] = r; o[i * 4 + 3] = 255; });
  const tex = (c: HTMLCanvasElement, srgb: boolean) => { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 8; t.generateMipmaps = true; t.needsUpdate = true; return t; };
  let map: THREE.Texture | null = null;
  if (m.col) { const C = m.col; map = tex(canvasFrom((i, o) => { o[i * 4] = lin2s(C[i * 3]) * 255; o[i * 4 + 1] = lin2s(C[i * 3 + 1]) * 255; o[i * 4 + 2] = lin2s(C[i * 3 + 2]) * 255; o[i * 4 + 3] = 255; }), true); }
  return { map, normal: tex(nrm, false), rough: tex(rgh, false) };
}
function field(fn: (u: number, v: number, i: number) => [number, number, number, number, number] | [number, number]): Maps {
  const h = new Float32Array(N * N), rough = new Float32Array(N * N);
  let col: Float32Array | null = null;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x, r = fn((x + 0.5) / N, (y + 0.5) / N, i);
    h[i] = r[0]; rough[i] = r[1];
    if (r.length === 5) { col ??= new Float32Array(N * N * 3); col[i * 3] = r[2]; col[i * 3 + 1] = r[3]; col[i * 3 + 2] = r[4]; }
  }
  return { col, h, rough };
}

// ---- the drawn surfaces ----
/** timber boards along u: `boards` per tile, grain streaks, knots, per-board tone, seams; colour from `base` (sRGB hex) */
function timber(seed: number, base: number, boards: number, weathered: number) {
  const g1 = fbm(seed, 2, 5, 18), g2 = fbm(seed + 5, 6, 4, 10), sp = fbm(seed + 9, 8, 4), r = rng(seed);
  const tone = Array.from({ length: boards }, () => 0.78 + r() * 0.42), shift = Array.from({ length: boards }, () => r());
  const c0 = hex(base);
  return field((u, v) => {
    const bi = Math.min(boards - 1, Math.floor(v * boards)), fv = v * boards - bi;
    const uu = (u + shift[bi]) % 1;
    const grain = g1(uu, v * 1.0 + bi * 0.37), fine = g2(uu, v + bi * 0.11);
    const rings = 0.5 + 0.5 * Math.sin((grain * 9 + fine * 2) * Math.PI * 2);
    const seam = Math.min(1, Math.min(fv, 1 - fv) * boards * 0.9 / 0.02);
    const k = tone[bi] * (0.82 + 0.3 * rings * 0.6 + 0.1 * fine) * (1 - weathered * 0.35 * sp(u, v));
    const grey = weathered * (0.4 + 0.3 * sp(u * 2, v * 2));
    const h = 0.55 * rings * 0.35 + 0.25 * fine + 0.6 * (seam - 1) + weathered * 0.25 * (sp(u * 3, v * 3) - 0.5);
    const lum = (c0[0] + c0[1] + c0[2]) / 3;
    return [h, 0.55 + 0.3 * fine + 0.15 * (1 - seam) + weathered * 0.2,
      (c0[0] * (1 - grey) + lum * grey) * k * (seam * 0.85 + 0.15), (c0[1] * (1 - grey) + lum * grey) * k * (seam * 0.85 + 0.15), (c0[2] * (1 - grey) + lum * grey * 1.05) * k * (seam * 0.85 + 0.15)];
  });
}
/** coil-coated steel: orange peel, faint rolling streaks along v, a row of fixings */
function steel(seed: number, base: number, ribs: number) {
  const op = fbm(seed, 48, 3), st = fbm(seed + 3, 3, 4, 0.08), c0 = hex(base);
  return field((u, v) => {
    const fu = (u * ribs) % 1, fix = Math.hypot((fu - 0.5) * 3.2, ((v * 2) % 1 - 0.5) * 1.2);
    const dot = fix < 0.04 ? 1 : 0;
    const s = st(u, v), p = op(u, v);
    const k = 0.92 + 0.12 * s + 0.04 * p + dot * 0.6;
    return [0.35 * p + 0.2 * s + dot * 0.5, 0.42 + 0.18 * s + 0.1 * p, c0[0] * k, c0[1] * k, c0[2] * k];
  });
}
/** tree bark: vertical fissures (along v) and plates */
function bark(seed: number) {
  const f = fbm(seed, 3, 5, 0.25), g = fbm(seed + 1, 12, 4), c0 = hex(0x8a7d70);
  return field((u, v) => {
    const fis = Math.pow(Math.abs(Math.sin((u * 7 + f(u, v) * 2.2) * Math.PI)), 0.35);
    const k = 0.45 + 0.6 * fis * (0.7 + 0.5 * g(u, v));
    return [fis * 0.8 + 0.25 * g(u, v), 0.85 + 0.1 * g(u, v), c0[0] * k, c0[1] * k * 0.97, c0[2] * k * 0.92];
  });
}
/** forest floor: leaf litter, moss, soil and twigs */
function forestFloor(seed: number) {
  const a = fbm(seed, 4, 5), b = fbm(seed + 2, 24, 4), c = fbm(seed + 4, 64, 3), r = rng(seed);
  const leaves: [number, number, number, number, number][] = Array.from({ length: 900 }, () => [r(), r(), 0.004 + r() * 0.01, r() * Math.PI, r()]);
  const grid = new Map<number, number[]>();
  leaves.forEach((l, i) => { const k = Math.floor(l[0] * 16) + Math.floor(l[1] * 16) * 16; (grid.get(k) ?? grid.set(k, []).get(k)!).push(i); });
  const soil = hex(0x33281e), moss = hex(0x45552a), litter = hex(0x5a4430), dry = hex(0x7a6650);
  return field((u, v) => {
    const m = a(u, v), d = b(u, v), e = c(u, v);
    let leaf = 0, ltone = 0;
    const gx = Math.floor(u * 16), gy = Math.floor(v * 16);
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
      const list = grid.get(((gx + ox + 16) % 16) + ((gy + oy + 16) % 16) * 16); if (!list) continue;
      for (const i of list) {
        const [lx, ly, s, ang, t] = leaves[i];
        let dx = u - lx, dy = v - ly; dx -= Math.round(dx); dy -= Math.round(dy);
        const ca = Math.cos(ang), sa = Math.sin(ang), px = (dx * ca + dy * sa) / s, py = (-dx * sa + dy * ca) / (s * 0.45);
        const q = px * px + py * py; if (q < 1) { leaf = Math.max(leaf, 1 - q); ltone = t; }
      }
    }
    const mossK = Math.max(0, Math.min(1, (m - 0.46) * 4));
    const base = [0, 1, 2].map((k) => soil[k] * (1 - mossK) + moss[k] * mossK);
    const lc = [0, 1, 2].map((k) => litter[k] * (1 - ltone) + dry[k] * ltone);
    const L = leaf > 0 ? 1 : 0;
    const col = [0, 1, 2].map((k) => (base[k] * (1 - L) + lc[k] * L) * (0.75 + 0.45 * d) * (0.9 + 0.2 * e));
    return [0.5 * d + 0.25 * e + 0.5 * leaf + mossK * 0.2, 0.8 + 0.15 * e - 0.1 * leaf, col[0], col[1], col[2]];
  });
}
// micro-structures for surfaces that had no texture (height + roughness only; colour stays the material's)
const micro = {
  /** plain weave: warp and weft over and under, slubby yarn */
  weave: (seed: number) => { const s = fbm(seed, 16, 3); return field((u, v) => { const n = 96; const a = Math.sin(u * n * Math.PI * 2), b = Math.sin(v * n * Math.PI * 2); const over = ((Math.floor(u * n * 2) + Math.floor(v * n * 2)) & 1) ? a : b; return [0.5 + 0.35 * over + 0.25 * s(u, v), 0.85 + 0.1 * s(u, v)]; }); },
  /** wood grain along u */
  grain: (seed: number) => { const g = fbm(seed, 2, 5, 24), f = fbm(seed + 1, 10, 3, 8); return field((u, v) => { const r = 0.5 + 0.5 * Math.sin((g(u, v) * 10 + f(u, v)) * Math.PI * 2); return [0.4 * r + 0.3 * f(u, v), 0.5 + 0.25 * r]; }); },
  /** roller-applied paint on plaster: soft stipple */
  stipple: (seed: number) => { const a = fbm(seed, 40, 3), b = fbm(seed + 2, 5, 3); return field((u, v) => [0.6 * a(u, v) + 0.3 * b(u, v), 0.82 + 0.1 * a(u, v)]); },
  /** brushed metal along u */
  brushed: (seed: number) => { const a = fbm(seed, 6, 5, 40); return field((u, v) => [a(u, v), 0.3 + 0.25 * a(u, v)]); },
  /** orange peel on enamel, lacquer and glaze */
  peel: (seed: number) => { const a = fbm(seed, 24, 3); return field((u, v) => [a(u, v), 0.25 + 0.15 * a(u, v)]); },
  /** concrete and stone: aggregate and pores */
  aggregate: (seed: number) => { const a = fbm(seed, 20, 4), b = fbm(seed + 3, 80, 2); return field((u, v) => [0.6 * a(u, v) + 0.4 * (b(u, v) > 0.72 ? 0 : 1), 0.75 + 0.2 * a(u, v)]); },
};

type Tex = { map: THREE.Texture | null; normal: THREE.Texture; rough: THREE.Texture };
const made = new Map<string, Tex>();
function once(key: string, mk: () => Tex): Tex { let t = made.get(key); if (!t) { t = mk(); made.set(key, t); } return t; }

/** the drawn stand-in for a scanned set, by the scan's file name */
function forScan(file: string): Tex | null {
  if (/deck_/.test(file)) return once('deck', () => toTextures(timber(11, 0xa0714a, 14, 0.15), 3.2));
  if (/post_/.test(file)) return once('post', () => toTextures(timber(23, 0x8a7a66, 10, 0.75), 3.6));
  if (/roof_/.test(file)) return once('roof', () => toTextures(steel(31, 0xc8c8c8, 6), 1.6));
  if (/bark_/.test(file)) return once('bark', () => toTextures(bark(41), 4));
  if (/floor_/.test(file)) return once('floor', () => toTextures(forestFloor(53), 3));
  return null;
}
const fileOf = (t: THREE.Texture | null | undefined) => {
  const im = t?.image as { currentSrc?: string; src?: string } | undefined;
  return String(im?.currentSrc || im?.src || '');
};
const isScan = (t: THREE.Texture | null | undefined) => /\/tex\/\w+\.webp/.test(fileOf(t));
const isPhoto = (t: THREE.Texture | null | undefined) => /^data:image\/(jpeg|jpg|png|webp)/.test(fileOf(t)) || /\.(jpe?g)(\?|$)/.test(fileOf(t));
function copyXf(dst: THREE.Texture, src: THREE.Texture | null | undefined) {
  const t = dst.clone();
  if (src) { t.repeat.copy(src.repeat); t.offset.copy(src.offset); t.rotation = src.rotation; t.center.copy(src.center); t.channel = src.channel; }
  t.needsUpdate = true;
  return t;
}

/** micro detail by what the surface is, from its material and mesh names */
function microFor(name: string): { tex: Tex; scale: number; tile: number } {
  const s = name.toLowerCase();
  const pick = (k: keyof typeof micro, seed: number) => once('micro_' + k, () => toTextures(micro[k](seed), k === 'weave' ? 2.5 : k === 'brushed' ? 1.2 : 1.5));
  if (/cladding|black_stain|shiplap_black|rib/.test(s)) return { tex: pick('peel', 71), scale: 0.18, tile: 0.35 };
  if (/linen|wool|boucle|fabric|canvas|cloth|rug|towel|cushion|throw|duvet|curtain|shade/.test(s)) return { tex: pick('weave', 61), scale: 0.6, tile: 0.25 };
  if (/steel|chrome|brass|bronze|stainless|alumin|metal|copper|nickel/.test(s)) return { tex: pick('brushed', 67), scale: 0.25, tile: 0.4 };
  if (/enamel|lacquer|ceramic|china|glaze|appliance|stoneware|porcelain|planter|lemon/.test(s)) return { tex: pick('peel', 71), scale: 0.12, tile: 0.3 };
  if (/oak|teak|timber|wood|hardwood|stair|pine|cedar|branch/.test(s)) return { tex: pick('grain', 73), scale: 0.5, tile: 0.8 };
  if (/concrete|parking|path|pad|stone|travertine|paving|retaining|gravel/.test(s)) return { tex: pick('aggregate', 79), scale: 0.6, tile: 0.6 };
  return { tex: pick('stipple', 83), scale: 0.3, tile: 0.5 };
}

/**
 * Detail for one receiver material. `scanned`: the scanned photographs and the aerial photo are replaced by drawn
 * maps at the same placement; `plain`: a material with no maps gets a micro-structure (its mesh carries box UVs in
 * metres, made by the bake's geometry step, so `tile` is in metres). Returns null to keep the material's own maps.
 */
export function detailFor(m: THREE.Material, meshName = ''): (Detail & { replace: boolean; boxUV: boolean; tile?: number }) | null {
  const o = m as THREE.MeshStandardMaterial;
  if (isScan(o.map) || isScan(o.normalMap) || isPhoto(o.map)) {
    const file = fileOf(o.normalMap) || fileOf(o.map);
    let t = forScan(file);
    if (!t && isPhoto(o.map)) t = forScan('floor_');
    if (!t) return null;
    const ref = o.normalMap ?? o.map;
    const photoGround = isPhoto(o.map);
    return {
      replace: true, boxUV: false,
      map: t.map ? copyXf(t.map, photoGround ? o.normalMap : o.map) : null,
      normal: copyXf(t.normal, ref), rough: copyXf(t.rough, o.roughnessMap ?? ref),
      normalScale: o.normalScale?.x ?? 1, roughness: 1,
    };
  }
  if (o.map || o.normalMap || o.roughnessMap || (o as unknown as { bumpMap?: THREE.Texture }).bumpMap) {
    return null; // its own drawn maps stay (a bump map is not carried over: those surfaces read flat in this look)
  }
  const md = microFor(`${m.name} ${meshName}`);
  const rep = (t: THREE.Texture) => { const c = t.clone(); c.repeat.set(1 / md.tile, 1 / md.tile); c.needsUpdate = true; return c; };
  return { replace: false, boxUV: true, tile: md.tile, normal: rep(md.tex.normal), rough: rep(md.tex.rough), normalScale: md.scale, roughness: Math.max(0.05, (o.roughness ?? 0.6) * 1.15) };
}

/** swap scanned maps on materials that do not receive the bake (bush bark, far ground); returns how to put them back */
const swapped: [THREE.MeshStandardMaterial, Record<string, unknown>][] = [];
export function addDetail(scene: THREE.Object3D) {
  let n = 0;
  const seen = new Set<THREE.Material>();
  scene.traverse((ob) => {
    const mesh = ob as THREE.Mesh; if (!mesh.isMesh) return;
    for (const m of (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as THREE.MeshStandardMaterial[]) {
      if (seen.has(m)) continue; seen.add(m);
      if (!(isScan(m.map) || isScan(m.normalMap) || isPhoto(m.map))) continue;
      const d = detailFor(m, mesh.name); if (!d) continue;
      swapped.push([m, { map: m.map, normalMap: m.normalMap, roughnessMap: m.roughnessMap }]);
      if (d.map) m.map = d.map; if (d.normal) m.normalMap = d.normal; if (d.rough) m.roughnessMap = d.rough;
      m.needsUpdate = true; n++;
    }
  });
  return { swappedScans: n, drawnSets: made.size };
}
export function removeDetail(_scene: THREE.Object3D) {
  for (const [m, v] of swapped.splice(0)) { Object.assign(m, v); m.needsUpdate = true; }
}
