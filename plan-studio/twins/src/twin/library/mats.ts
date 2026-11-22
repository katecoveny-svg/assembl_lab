import * as THREE from 'three/webgpu';
import { type Field, pack, tint, weave, knit, boucle, pile, grain, endGrain, stone, plaster, brushed, glaze, bark, leafRibs } from './ptex';

// Materials for the library pieces. Every map comes from ptex.ts (synthesised in code, seeded, tileable) and is made
// once per page. Geometry UVs are in metres, so each map repeats every `mm` millimetres of real surface.
// Only standard material features are used (colour, normal, roughness maps, sheen, clearcoat, emissive), so the same
// materials render on the 3D page's WebGPU renderer, its WebGL 2 fallback, and the classic renderer the studio uses.

const fields = new Map<string, Field>();
const texs = new Map<string, THREE.DataTexture>();
const mats = new Map<string, THREE.Material>();
let aniso = 8;
export const setAnisotropy = (n: number) => { aniso = n; };

const field = (key: string, make: () => Field) => { let f = fields.get(key); if (!f) { f = make(); fields.set(key, f); } return f; };
function dataTex(key: string, make: () => Uint8Array, n: number, mm: number, srgb: boolean) {
  let t = texs.get(key);
  if (!t) {
    t = new THREE.DataTexture(make(), n, n, THREE.RGBAFormat, THREE.UnsignedByteType);
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true;
    t.anisotropy = aniso;
    t.repeat.set(1000 / mm, 1000 / mm);
    t.needsUpdate = true;
    t.name = key;
    texs.set(key, t);
  }
  return t;
}
/** colour, normal and roughness maps of one field. c1 given: mix c0..c1 by the field's albedo (grain, stone) */
export function maps(key: string, make: () => Field, c0: number, c1?: number, strength = 1) {
  const f = field(key, make);
  let packed: ReturnType<typeof pack> | null = null;
  const P = () => (packed ??= pack(f, strength));
  return {
    map: dataTex(`${key}|c${c0.toString(16)}|${c1?.toString(16) ?? ''}`, () => tint(f, c0, c1), f.n, f.mm, true),
    normalMap: dataTex(`${key}|n${strength}`, () => P().normal, f.n, f.mm, false),
    roughnessMap: dataTex(`${key}|r`, () => P().rough, f.n, f.mm, false),
  };
}
const once = <T extends THREE.Material>(key: string, make: () => T) => { let m = mats.get(key) as T | undefined; if (!m) { m = make(); m.name = key; mats.set(key, m); } return m; };
const lift = (hex: number, k: number) => new THREE.Color(hex).lerp(new THREE.Color(0xffffff), k);

// ---- cloth -------------------------------------------------------------------------------------------------------------
export type Cloth = 'boucle' | 'linen' | 'twill' | 'knit' | 'chunky' | 'canvas' | 'cord' | 'velvet';
const CLOTH: Record<Cloth, { make: () => Field; sheen: number; sheenRough: number; nscale: number; strength: number }> = {
  boucle: { make: () => boucle({ seed: 3, mm: 60, loops: 1500, size: 1.9 }), sheen: 0.55, sheenRough: 0.8, nscale: 1.0, strength: 1.3 },
  linen: { make: () => weave({ threads: 72, slub: 0.45, seed: 21, mm: 40 }), sheen: 0.35, sheenRough: 0.6, nscale: 0.9, strength: 1.2 },
  twill: { make: () => weave({ threads: 90, slub: 0.15, seed: 22, mm: 40, pattern: 'twill' }), sheen: 0.4, sheenRough: 0.55, nscale: 0.9, strength: 1.2 },
  knit: { make: () => knit({ stitches: 14, rows: 19, seed: 23, mm: 60, rib: 0 }), sheen: 0.45, sheenRough: 0.7, nscale: 1.0, strength: 1.0 },
  chunky: { make: () => knit({ stitches: 6, rows: 8, seed: 24, mm: 150 }), sheen: 0.5, sheenRough: 0.75, nscale: 1.0, strength: 0.8 },
  canvas: { make: () => weave({ threads: 56, slub: 0.2, seed: 25, mm: 40, pattern: 'basket' }), sheen: 0.2, sheenRough: 0.6, nscale: 0.9, strength: 1.2 },
  cord: { make: () => weave({ threads: 12, slub: 0.08, seed: 26, mm: 72, pattern: 'cord', fuzz: 0.03 }), sheen: 0.1, sheenRough: 0.5, nscale: 1.4, strength: 1.6 },
  velvet: { make: () => weave({ threads: 160, slub: 0.05, seed: 27, mm: 30, fuzz: 0.35 }), sheen: 1.0, sheenRough: 0.35, nscale: 0.5, strength: 1.0 },
};
/** upholstery, bedding and throws: woven, knitted or looped, with a soft sheen at grazing angles */
export function cloth(kind: Cloth, colour: number, o: { double?: boolean } = {}) {
  return once(`cloth_${kind}_${colour.toString(16)}${o.double ? '_2s' : ''}`, () => {
    const c = CLOTH[kind], m = maps(`cloth:${kind}`, c.make, colour, undefined, c.strength);
    return new THREE.MeshPhysicalMaterial({
      map: m.map, normalMap: m.normalMap, roughnessMap: m.roughnessMap, roughness: 1, normalScale: new THREE.Vector2(c.nscale, c.nscale),
      sheen: c.sheen, sheenRoughness: c.sheenRough, sheenColor: lift(colour, 0.35), side: o.double ? THREE.DoubleSide : THREE.FrontSide,
    });
  });
}
/** a rug's pile, coloured by a map at the rug's own scale (its pattern), the pile texture tiling over it */
export function rugMaterial(pattern: THREE.Texture) {
  return once(`rug_${pattern.name}`, () => {
    const m = maps('rug:pile', () => pile({ knots: 22, seed: 4, mm: 50 }), 0xffffff, undefined, 1.0);
    return new THREE.MeshPhysicalMaterial({ map: pattern, normalMap: m.normalMap, roughnessMap: m.roughnessMap, roughness: 1, normalScale: new THREE.Vector2(1.1, 1.1), sheen: 0.5, sheenRoughness: 0.8, sheenColor: new THREE.Color(0xf2ece2) });
  });
}

// ---- timber ------------------------------------------------------------------------------------------------------------
export type Timber = 'oak' | 'ash' | 'walnut' | 'rimu' | 'blackbutt';
const TIMBER: Record<Timber, [number, number, number]> = {
  // earlywood, latewood (sRGB), ray flecks 0..1
  oak: [0xd4b68e, 0xab865c, 0.55],
  ash: [0xe2cfb0, 0xb89d78, 0.1],
  walnut: [0x8a6448, 0x4a3122, 0.05],
  rimu: [0xc98f62, 0x8f5536, 0.05],
  blackbutt: [0xd7b98f, 0xa77f57, 0.15],
};
/** oiled solid timber, grain along u (the geometry's long axis); end: the end-grain version for cut ends */
export function timber(kind: Timber, o: { end?: boolean; finish?: number } = {}) {
  const [a, b, rays] = TIMBER[kind], fin = o.finish ?? 0.5;
  return once(`timber_${kind}${o.end ? '_end' : ''}_${fin}`, () => {
    const m = o.end ? maps(`end:${kind}`, () => endGrain({ seed: 6, mm: 120 }), a, b, 1.0) : maps(`grain:${kind}`, () => grain({ seed: kind.length * 7 + 5, mm: 420, rings: 16, rays, pores: kind === 'oak' || kind === 'ash' ? 0.7 : 0.4, finish: fin }), a, b, 1.6);
    return new THREE.MeshPhysicalMaterial({ map: m.map, normalMap: m.normalMap, roughnessMap: m.roughnessMap, roughness: 1, normalScale: new THREE.Vector2(0.5, 0.5), clearcoat: fin * 0.25, clearcoatRoughness: 0.45 });
  });
}

// ---- stone, plaster, metal, ceramic, plant tissue ---------------------------------------------------------------------------
export function stoneMat(kind: 'travertine' | 'limestone' | 'marble' | 'basalt', c0: number, c1: number, honed = 0.6) {
  return once(`stone_${kind}_${c0.toString(16)}_${c1.toString(16)}_${honed}`, () => {
    const m = maps(`stone:${kind}:${honed}`, () => stone({ kind, seed: kind.length + 7, mm: 320, honed }), c0, c1, 1.2);
    return new THREE.MeshPhysicalMaterial({ map: m.map, normalMap: m.normalMap, roughnessMap: m.roughnessMap, roughness: 1, normalScale: new THREE.Vector2(1, 1), clearcoat: kind === 'marble' ? 0.3 : 0, clearcoatRoughness: 0.3 });
  });
}
export function plasterMat(colour: number, mm = 800) {
  return once(`plaster_${colour.toString(16)}_${mm}`, () => {
    const m = maps(`plaster:${mm}`, () => plaster({ seed: 8, mm }), colour, undefined, 1.0);
    return new THREE.MeshStandardMaterial({ map: m.map, normalMap: m.normalMap, roughnessMap: m.roughnessMap, roughness: 1, normalScale: new THREE.Vector2(0.8, 0.8) });
  });
}
/** brushed metal; tint is the metal's own colour (brass, bronze, steel), patina darkens it in places */
export function metalMat(tint: number, rough = 0.3, metalness = 1) {
  return once(`metal_${tint.toString(16)}_${rough}_${metalness}`, () => {
    const m = maps('metal:brushed', () => brushed({ seed: 9, mm: 120 }), tint, undefined, 1.0);
    return new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: m.map, normalMap: m.normalMap, roughnessMap: m.roughnessMap, roughness: rough / 0.3, metalness, normalScale: new THREE.Vector2(0.6, 0.6), envMapIntensity: 1.2 });
  });
}
export function glazeMat(colour: number, o: { crackle?: number; gloss?: number } = {}) {
  const cr = o.crackle ?? 0.6, gl = o.gloss ?? 0.5;
  return once(`glaze_${colour.toString(16)}_${cr}_${gl}`, () => {
    const m = maps(`glaze:${cr}`, () => glaze({ seed: 10, mm: 200, crackle: cr }), colour, undefined, 1.0);
    return new THREE.MeshPhysicalMaterial({ map: m.map, normalMap: m.normalMap, roughnessMap: m.roughnessMap, roughness: 1.2 - gl, normalScale: new THREE.Vector2(0.7, 0.7), clearcoat: gl, clearcoatRoughness: 0.18 });
  });
}
export function barkMat(c0: number, c1: number) {
  return once(`bark_${c0.toString(16)}`, () => {
    const m = maps('bark', () => bark({ seed: 11, mm: 380 }), c0, c1, 0.6);
    return new THREE.MeshStandardMaterial({ map: m.map, normalMap: m.normalMap, roughnessMap: m.roughnessMap, roughness: 1, normalScale: new THREE.Vector2(1.2, 1.2) });
  });
}
/** strap leaves: fine parallel veins, a waxy sheen, light through the blade (two-sided) */
export function leafMat(colour: number, o: { mm?: number; veins?: number } = {}) {
  const mm = o.mm ?? 40, veins = o.veins ?? 24;
  return once(`leaf_${colour.toString(16)}_${mm}_${veins}`, () => {
    const m = maps(`leaf:${mm}:${veins}`, () => leafRibs({ seed: 12, mm, veins }), colour, undefined, 1.0);
    return new THREE.MeshPhysicalMaterial({ map: m.map, normalMap: m.normalMap, roughnessMap: m.roughnessMap, roughness: 1, side: THREE.DoubleSide, vertexColors: true, sheen: 0.25, sheenRoughness: 0.4, sheenColor: lift(colour, 0.5) });
  });
}
/** a glowing shade or diffuser: lit from inside, so it gives light rather than taking it */
export function glowMat(colour: number, glow: number, kind: Cloth | null = 'linen') {
  return once(`glow_${colour.toString(16)}_${glow}_${kind}`, () => {
    const m = kind ? maps(`cloth:${kind}`, CLOTH[kind].make, colour, undefined, CLOTH[kind].strength) : null;
    return new THREE.MeshPhysicalMaterial({ color: kind ? 0xffffff : colour, map: m?.map ?? null, normalMap: m?.normalMap ?? null, roughness: 0.9, emissive: new THREE.Color(0xffd3a0), emissiveMap: m?.map ?? null, emissiveIntensity: glow, side: THREE.DoubleSide });
  });
}
export const plain = (colour: number, rough = 0.6, metalness = 0) => once(`plain_${colour.toString(16)}_${rough}_${metalness}`, () => new THREE.MeshStandardMaterial({ color: colour, roughness: rough, metalness }));

/** a pattern map for a rug, at the rug's own size: px texels per metre */
export function rugPattern(name: string, w: number, d: number, fn: (x: number, y: number) => [number, number, number], px = 220) {
  const key = `rugpat:${name}:${w}:${d}`;
  let t = texs.get(key);
  if (!t) {
    const W = Math.min(1024, Math.round(w * px)), H = Math.min(1024, Math.round(d * px)), out = new Uint8Array(W * H * 4);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const c = fn((x + 0.5) / W, (y + 0.5) / H), i = (y * W + x) * 4; out[i] = c[0]; out[i + 1] = c[1]; out[i + 2] = c[2]; out[i + 3] = 255; }
    t = new THREE.DataTexture(out, W, H, THREE.RGBAFormat, THREE.UnsignedByteType);
    t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.anisotropy = aniso;
    t.repeat.set(1 / w, 1 / d); t.needsUpdate = true; t.name = key;
    texs.set(key, t);
  }
  return t;
}
/** how many maps this page has made, and their bytes (for the report) */
export const texStats = () => { let bytes = 0; for (const t of texs.values()) bytes += (t.image as { data: Uint8Array }).data.byteLength; return { textures: texs.size, bytes }; };
