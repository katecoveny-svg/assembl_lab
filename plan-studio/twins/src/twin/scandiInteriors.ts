// Scandinavian / New Zealand interior pieces, all built in code at real size (metres):
// upholstery with crowned cushions and welted seams, thrown ceramics, real books, a wool rug with a
// bound edge, an arc lamp, dining chairs with back posts, an oak bed. Everything here is a proposal.
import * as THREE from 'three/webgpu';
import { createSoftContactShadowTexture } from './pbrTextures';
import { bake, fbm, hex, metal, pbr, wood } from '../objects/tex';
import { boxUV, tubeUV } from '../objects/util';

let cachedContactShadowMat: THREE.MeshBasicMaterial | null = null;
export function addContactShadow(parent: THREE.Group, w: number, d: number, x = 0, z = 0) {
  if (!cachedContactShadowMat) {
    cachedContactShadowMat = new THREE.MeshBasicMaterial({
      map: createSoftContactShadowTexture(),
      transparent: true,
      depthWrite: false,
      opacity: 0.72,
    });
  }
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, d), cachedContactShadowMat);
  plane.rotation.x = -Math.PI / 2;
  plane.position.set(x, 0.008, z);
  parent.add(plane);
}

export interface InteriorMaterials {
  oakMat: THREE.MeshStandardMaterial;
  linenMat: THREE.MeshPhysicalMaterial;
  boucleMat: THREE.MeshPhysicalMaterial;
  terracottaMat: THREE.MeshPhysicalMaterial;
  stoneMat: THREE.MeshStandardMaterial;
  travertineMat: THREE.MeshStandardMaterial;
  zelligeMat: THREE.MeshPhysicalMaterial;
  joineryMat: THREE.MeshStandardMaterial;
  tapwareMat: THREE.MeshStandardMaterial;
  plasterMat: THREE.MeshStandardMaterial;
}

/** a softly bevelled box (ExtrudeGeometry), for stone tops and joinery */
export function createRoundedBoxGeo(width: number, height: number, depth: number, bevelRadius = 0.045, bevelSegments = 4): THREE.BufferGeometry {
  const r = Math.min(bevelRadius, width * 0.24, height * 0.24, depth * 0.24);
  const w = Math.max(0.01, width - r * 2);
  const h = Math.max(0.01, height - r * 2);
  const d = Math.max(0.01, depth - r * 2);
  const shape = new THREE.Shape();
  const hw = w / 2;
  const hh = h / 2;
  shape.moveTo(-hw + r, -hh);
  shape.lineTo(hw - r, -hh);
  shape.quadraticCurveTo(hw, -hh, hw, -hh + r);
  shape.lineTo(hw, hh - r);
  shape.quadraticCurveTo(hw, hh, hw - r, hh);
  shape.lineTo(-hw + r, hh);
  shape.quadraticCurveTo(-hw, hh, -hw, hh - r);
  shape.lineTo(-hw, -hh + r);
  shape.quadraticCurveTo(-hw, -hh, -hw + r, -hh);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: true, bevelThickness: r, bevelSize: r, bevelSegments, curveSegments: 8 });
  geo.center();
  return geo;
}

/** a plain lathe from a [radius, height] profile */
export function createLatheVesselGeo(profile: [number, number][], segments = 24): THREE.BufferGeometry {
  return new THREE.LatheGeometry(profile.map(([rx, ry]) => new THREE.Vector2(rx, ry)), segments);
}

// --- craft materials: fabric, timber, glaze and metal at real scale ----------------------------------
// Each texture tile covers a set distance in metres and the geometry's UVs are in metres, so a loop of
// bouclé is about 8 mm across wherever it is used and nothing is stretched.
const T_BOUCLE = 0.4, T_LINEN = 0.24, T_RUG = 0.6, T_OAK = 0.7, T_GLAZE = 0.25, T_METAL = 0.2;
const h2 = (x: number, y: number, s: number) => {
  let h = (x * 374761393 + y * 668265263 + s * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};
const c01 = (x: number) => Math.min(1, Math.max(0, x));

/** bouclé: curled loops of yarn about 8 mm across, in soft clumps a few centimetres wide */
function boucleTex(colour: number, seed: number, name: string) {
  const C = hex(colour), N = 48;
  return bake(512, T_BOUCLE, (u, v) => {
    const x = u * N, y = v * N, xi = Math.floor(x), yi = Math.floor(y);
    let h = 0, tone = 0.5;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const cx = xi + dx, cy = yi + dy, wx = ((cx % N) + N) % N, wy = ((cy % N) + N) % N;
      const jx = cx + 0.2 + 0.6 * h2(wx, wy, seed), jy = cy + 0.2 + 0.6 * h2(wx, wy, seed + 1);
      const rad = 0.26 + 0.26 * h2(wx, wy, seed + 2);
      const ring = c01(1 - Math.abs(Math.hypot(x - jx, y - jy) - rad) / 0.24);
      const hh = ring * ring * (3 - 2 * ring) * (0.65 + 0.35 * h2(wx, wy, seed + 3));
      if (hh > h) { h = hh; tone = h2(wx, wy, seed + 4); }
    }
    const clump = fbm(u, v, 7, 7, 3, seed + 9);
    const fuzz = fbm(u, v, 128, 128, 2, seed + 11);
    const k = 0.76 + 0.2 * h + 0.16 * (clump - 0.5) + 0.06 * (tone - 0.5) + 0.04 * fuzz;
    return { c: [C[0] * k, C[1] * k, C[2] * k], h: h * 0.8 + clump * 0.55 + fuzz * 0.1, r: 0.97 - 0.07 * h, m: 0 };
  }, 2.4, name);
}
/** washed linen: a plain weave with slubs and the soft rumple of cloth that has been through the wash */
function linenTex(colour: number, seed: number, name: string, threads = 120) {
  const C = hex(colour), n = threads;
  return bake(512, T_LINEN, (u, v) => {
    const x = u * n, y = v * n, xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
    const over = (xi + yi) % 2 === 0;
    const slubU = 0.55 + 0.9 * fbm(u, (yi + 0.5) / n, 9, n, 2, seed);
    const slubV = 0.55 + 0.9 * fbm((xi + 0.5) / n, v, n, 9, 2, seed + 1);
    const warp = Math.sin(fx * Math.PI) * slubV, weft = Math.sin(fy * Math.PI) * slubU;
    const h = over ? warp * 0.9 + weft * 0.35 : weft * 0.9 + warp * 0.35;
    const rumple = fbm(u, v, 4, 4, 4, seed + 5);
    const streak = fbm(u, v, 2, 48, 2, seed + 7) * 0.5 + fbm(u, v, 48, 2, 2, seed + 8) * 0.5;
    const k = 0.8 + 0.13 * h + 0.12 * (streak - 0.5) + 0.1 * (rumple - 0.5);
    return { c: [C[0] * k, C[1] * k, C[2] * k], h: h * 0.45 + rumple * 1.6, r: 0.92 - 0.06 * h, m: 0 };
  }, 1.5, name);
}
/** a hand-loomed wool rug: rounded ribs of looped pile about 15 mm apart, heathered, with the odd dark fleck */
function rugTex(a: number, b: number, seed: number) {
  const A = hex(a), B = hex(b), rows = 40, cols = 64;
  return bake(512, T_RUG, (u, v) => {
    const y = v * rows + (fbm(u, v, 5, 4, 2, seed) - 0.5) * 0.7, yi = Math.floor(y), fy = y - yi, wy = ((yi % rows) + rows) % rows;
    const x = u * cols + h2(wy, 7, seed) * 3, xi = Math.floor(x), fx = x - xi, wx = ((xi % cols) + cols) % cols;
    const rib = Math.sin(fy * Math.PI), loop = Math.sin(fx * Math.PI);
    const h = rib * (0.55 + 0.45 * loop);
    const heather = fbm(u, v, 36, 36, 2, seed + 5), broad = fbm(u, v, 3, 3, 3, seed + 6);
    const t = c01(0.22 + 0.55 * (heather - 0.5) + (h2(wx, wy, seed + 3) > 0.9 ? 0.45 : 0) + 0.35 * (broad - 0.5));
    const k = 0.84 + 0.17 * h;
    return { c: [(A[0] + (B[0] - A[0]) * t) * k, (A[1] + (B[1] - A[1]) * t) * k, (A[2] + (B[2] - A[2]) * t) * k], h: h + heather * 0.25, r: 0.97, m: 0 };
  }, 1.7, 'wool_rug_ribbed');
}
/** stoneware: iron speckle, the glaze breaking thinner and thicker, faint throwing rings round the pot */
function stonewareTex(colour: number, speck: number, seed: number, rough: number, name: string) {
  const C = hex(colour), S = hex(speck);
  return bake(512, T_GLAZE, (u, v) => {
    const s = fbm(u, v, 80, 80, 2, seed), dot = c01((s - 0.7) * 6);
    const pool = fbm(u, v, 3, 5, 3, seed + 2);
    const ring = 0.5 + 0.5 * Math.sin((v * 22 + fbm(u, v, 2, 2, 2, seed + 3) * 0.8) * Math.PI * 2);
    const k = 0.96 + 0.1 * (pool - 0.5) - 0.014 * ring;
    return { c: [(C[0] + (S[0] - C[0]) * dot) * k, (C[1] + (S[1] - C[1]) * dot) * k, (C[2] + (S[2] - C[2]) * dot) * k], h: ring * 0.16 + s * 0.1, r: rough + 0.16 * (pool - 0.5) + dot * 0.2, m: 0 };
  }, 0.7, name);
}
/** the fore-edge of a book: fine lines of pages */
function pagesTex() {
  return bake(128, 0.012, (u, v) => {
    const l = 0.5 + 0.5 * Math.sin(v * Math.PI * 2 * 16), n = fbm(u, v, 3, 32, 2, 5);
    const k = 0.9 + 0.07 * l + 0.05 * (n - 0.5);
    return { c: [0.93 * k, 0.9 * k, 0.83 * k], h: l, r: 0.9, m: 0 };
  }, 1.2, 'book_pages');
}

export interface CraftMats {
  boucle: THREE.MeshPhysicalMaterial;
  linen: THREE.MeshPhysicalMaterial;
  linenWhite: THREE.MeshPhysicalMaterial;
  linenRust: THREE.MeshPhysicalMaterial;
  linenInk: THREE.MeshPhysicalMaterial;
  linenSage: THREE.MeshPhysicalMaterial;
  /** a wool throw: the rust linen weave, drawn double-sided */
  throwWool: THREE.MeshPhysicalMaterial;
  rug: THREE.MeshPhysicalMaterial;
  binding: THREE.MeshPhysicalMaterial;
  oak: THREE.MeshPhysicalMaterial;
  teak: THREE.MeshPhysicalMaterial;
  outdoor: THREE.MeshPhysicalMaterial;
  outdoorDark: THREE.MeshPhysicalMaterial;
  glazeSand: THREE.MeshPhysicalMaterial;
  glazeRust: THREE.MeshPhysicalMaterial;
  glazeWhite: THREE.MeshPhysicalMaterial;
  pages: THREE.MeshPhysicalMaterial;
  bronze: THREE.MeshPhysicalMaterial;
  steel: THREE.MeshPhysicalMaterial;
  black: THREE.MeshStandardMaterial;
  opal: THREE.MeshStandardMaterial;
  twig: THREE.MeshStandardMaterial;
}
let craft: CraftMats | null = null;
export const TILE = { boucle: T_BOUCLE, linen: T_LINEN, rug: T_RUG, oak: T_OAK, glaze: T_GLAZE, metal: T_METAL };
export function craftMats(): CraftMats {
  if (craft) return craft;
  const cloth = (set: ReturnType<typeof bake>, name: string, sheen: number, tint: number) => pbr(set, name, { sheen, sheenColor: new THREE.Color(tint), sheenRoughness: 0.8 }) as unknown as THREE.MeshPhysicalMaterial;
  const rustSet = linenTex(0xa9674a, 23, 'washed_linen_rust');
  const throwWool = cloth(rustSet, 'wool_throw_rust', 0.5, 0xd79a7c);
  throwWool.side = THREE.DoubleSide;
  craft = {
    boucle: cloth(boucleTex(0xece5d8, 3, 'boucle_wool_ivory'), 'boucle_wool_ivory', 0.7, 0xfaf4ea),
    linen: cloth(linenTex(0xd9d0c0, 21, 'washed_linen_oat'), 'washed_linen_oat', 0.45, 0xf5efe5),
    linenWhite: cloth(linenTex(0xefebe3, 22, 'washed_linen_white', 140), 'washed_linen_white', 0.45, 0xffffff),
    linenRust: cloth(rustSet, 'washed_linen_rust', 0.45, 0xd79a7c),
    linenInk: cloth(linenTex(0x3b4046, 24, 'book_cloth_ink'), 'book_cloth_ink', 0.25, 0x8a8f96),
    linenSage: cloth(linenTex(0x8c927c, 25, 'book_cloth_sage'), 'book_cloth_sage', 0.25, 0xc3c8b6),
    throwWool,
    rug: cloth(rugTex(0xdcd3c3, 0x8f8068, 31), 'wool_rug_ribbed', 0.5, 0xf4ede2),
    binding: cloth(linenTex(0xb7aa95, 26, 'rug_binding_tape'), 'rug_binding_tape', 0.3, 0xe6dccb),
    oak: pbr(wood(512, { light: 0xd8c09c, dark: 0xbb9a70, rings: 9, gloss: 0.16, tile: T_OAK, seed: 77, straight: 0.93, pores: 0.35, figure: 0.02, relief: 0.6, name: 'oiled_european_oak' }), 'oiled_european_oak') as unknown as THREE.MeshPhysicalMaterial,
    teak: pbr(wood(512, { light: 0xbf9c72, dark: 0x97714a, rings: 10, gloss: 0.08, tile: T_OAK, seed: 79, straight: 0.93, pores: 0.4, figure: 0.02, relief: 0.6, name: 'oiled_teak' }), 'oiled_teak') as unknown as THREE.MeshPhysicalMaterial,
    outdoor: cloth(linenTex(0xdcd6c9, 27, 'outdoor_canvas_oat', 96), 'outdoor_canvas_oat', 0.2, 0xf2ede2),
    outdoorDark: cloth(linenTex(0x6f7269, 28, 'outdoor_canvas_lichen', 96), 'outdoor_canvas_lichen', 0.2, 0xaeb1a6),
    glazeSand: pbr(stonewareTex(0xd8cdb8, 0x6b5a45, 41, 0.42, 'stoneware_sand_glaze'), 'stoneware_sand_glaze', { clearcoat: 0.35, clearcoatRoughness: 0.35 }) as unknown as THREE.MeshPhysicalMaterial,
    glazeRust: pbr(stonewareTex(0xa5593c, 0x4c2618, 42, 0.5, 'stoneware_rust_glaze'), 'stoneware_rust_glaze', { clearcoat: 0.25, clearcoatRoughness: 0.4 }) as unknown as THREE.MeshPhysicalMaterial,
    glazeWhite: pbr(stonewareTex(0xf1ede4, 0x8a7a66, 43, 0.3, 'stoneware_white_glaze'), 'stoneware_white_glaze', { clearcoat: 0.6, clearcoatRoughness: 0.2 }) as unknown as THREE.MeshPhysicalMaterial,
    pages: pbr(pagesTex(), 'book_pages') as unknown as THREE.MeshPhysicalMaterial,
    // indoors a pure metal mirrors only the sky map's dark ground, so these keep some body colour to read as metal
    bronze: pbr(metal(512, { tint: 0xa98058, rough: 0.34, brush: 0.5, tile: T_METAL, seed: 51, name: 'brushed_bronze' }), 'brushed_bronze', { envMapIntensity: 1.3, metalness: 0.78 }) as unknown as THREE.MeshPhysicalMaterial,
    steel: pbr(metal(512, { tint: 0xc6c8c9, rough: 0.32, brush: 0.45, tile: T_METAL, seed: 52, name: 'brushed_stainless' }), 'brushed_stainless', { envMapIntensity: 1.2, metalness: 0.6 }) as unknown as THREE.MeshPhysicalMaterial,
    black: new THREE.MeshStandardMaterial({ name: 'matt_black', color: 0x1a1b1d, roughness: 0.55, metalness: 0.5 }),
    opal: new THREE.MeshStandardMaterial({ name: 'opal_lens_lit', color: 0xfff3dc, emissive: 0xffd9a0, emissiveIntensity: 1.8, roughness: 0.4 }),
    twig: new THREE.MeshStandardMaterial({ name: 'dried_branch', color: 0x4a3a2c, roughness: 0.85 }),
  };
  return craft;
}

const mk = (g: THREE.BufferGeometry, m: THREE.Material, cast = true) => {
  const o = new THREE.Mesh(g, m);
  o.castShadow = cast;
  o.receiveShadow = true;
  return o;
};

// --- soft geometry -------------------------------------------------------------------------------------
interface OPt { x: number; z: number; nx: number; nz: number }
/** the outline of a rounded rectangle with outward normals: about one point every `seg` metres, `cs` on each corner */
function roundRect(w: number, d: number, r: number, seg = 0.1, cs = 5): OPt[] {
  const hw = w / 2, hd = d / 2;
  r = Math.max(0.001, Math.min(r, hw - 0.001, hd - 0.001));
  const out: OPt[] = [];
  const side = (x0: number, z0: number, x1: number, z1: number, nx: number, nz: number) => {
    const n = Math.max(1, Math.round(Math.hypot(x1 - x0, z1 - z0) / seg));
    for (let i = 0; i < n; i++) out.push({ x: x0 + ((x1 - x0) * i) / n, z: z0 + ((z1 - z0) * i) / n, nx, nz });
  };
  const corner = (cx: number, cz: number, a0: number) => {
    for (let i = 0; i < cs; i++) { const a = a0 + ((i / cs) * Math.PI) / 2; out.push({ x: cx + r * Math.cos(a), z: cz + r * Math.sin(a), nx: Math.cos(a), nz: Math.sin(a) }); }
  };
  side(hw, -(hd - r), hw, hd - r, 1, 0); corner(hw - r, hd - r, 0);
  side(hw - r, hd, -(hw - r), hd, 0, 1); corner(-(hw - r), hd - r, Math.PI / 2);
  side(-hw, hd - r, -hw, -(hd - r), -1, 0); corner(-(hw - r), -(hd - r), Math.PI);
  side(-(hw - r), -hd, hw - r, -hd, 0, -1); corner(hw - r, -(hd - r), 1.5 * Math.PI);
  return out;
}

export interface CushionOpts {
  /** how far the top rises at its centre (the fill pushing the cover up) */
  crown?: number;
  /** the same for the underside */
  under?: number;
  /** corner radius in plan */
  r?: number;
  /** radius of the rolled edge between top and side */
  edge?: number;
  /** how far the side panel bows out at mid height */
  bulge?: number;
  /** radius of a welt (piping) sewn round the top and bottom seams; 0 for none */
  piping?: number;
  /** extra roll-down of the front (+z) edge, as a sat-in seat has */
  front?: number;
  /** soft unevenness of the fill, metres */
  lump?: number;
  seed?: number;
  /** metres per texture tile */
  tile?: number;
}
/**
 * A box cushion: a rounded-rectangle footprint w × d, h thick, lying flat with its centre at the origin.
 * The top is crowned, the edges roll over, the side panel bows a little and a welt runs round both seams.
 */
export function boxCushionGeo(w: number, d: number, h: number, o: CushionOpts = {}): THREE.BufferGeometry {
  const crown = o.crown ?? 0.03, under = o.under ?? 0, bulge = o.bulge ?? 0.008, lump = o.lump ?? 0.004, seed = o.seed ?? 1, front = o.front ?? 0;
  const edge = Math.min(o.edge ?? 0.02, h / 2 - 0.002), pipe = o.piping ?? 0;
  const O = roundRect(w, d, o.r ?? 0.06), S = O.length, hd = d / 2;
  const pos: number[] = [], idx: number[] = [];
  const wob = (x: number, z: number) => Math.sin(x * 9.1 + seed * 1.7) * Math.sin(z * 7.3 + seed * 2.3) * 0.6 + Math.sin(x * 17.3 + z * 13.1 + seed) * 0.4;
  const sag = (z: number) => { const t = c01((z - (hd - 0.14)) / 0.14); return front * t * t; };
  // rings from the top centre out, down the side and back in underneath: scale, inward offset, height, bow, top weight
  const rings: [number, number, number, number, number][] = [];
  const T = 6;
  for (let i = 1; i <= T; i++) { const rho = i / T; rings.push([rho, edge, h / 2 + crown * (1 - rho * rho), 0, 1]); }
  for (const a of [30, 60, 90]) { const f = (a * Math.PI) / 180; rings.push([1, edge * (1 - Math.sin(f)), h / 2 - edge * (1 - Math.cos(f)), 0, 1 - a / 120]); }
  for (const t of [0.33, 0.67]) rings.push([1, 0, (h / 2 - edge) * (1 - 2 * t), bulge * Math.sin(Math.PI * t), 0]);
  for (const a of [90, 60, 30]) { const f = (a * Math.PI) / 180; rings.push([1, edge * (1 - Math.sin(f)), -h / 2 + edge * (1 - Math.cos(f)), 0, 0]); }
  for (const rho of [1, 0.66, 0.33]) rings.push([rho, edge, -h / 2 - under * (1 - rho * rho), 0, 0]);
  pos.push(0, h / 2 + crown + lump * wob(0, 0), 0);
  for (const [rho, a, y, b, tw] of rings) for (const p of O) {
    const x = rho * (p.x - a * p.nx) + b * p.nx, z = rho * (p.z - a * p.nz) + b * p.nz;
    pos.push(x, y + tw * (lump * wob(x, z) - sag(z)), z);
  }
  pos.push(0, -h / 2 - under, 0);
  const R = rings.length, last = 1 + R * S;
  for (let j = 0; j < S; j++) { const j1 = (j + 1) % S; idx.push(0, 1 + j1, 1 + j); idx.push(last, 1 + (R - 1) * S + j, 1 + (R - 1) * S + j1); }
  for (let i = 0; i < R - 1; i++) for (let j = 0; j < S; j++) {
    const j1 = (j + 1) % S, a = 1 + i * S + j, b = 1 + i * S + j1, c = 1 + (i + 1) * S + j, e = 1 + (i + 1) * S + j1;
    idx.push(a, b, c, b, e, c);
  }
  // the welt: a thin tube sitting in the seam where the top (or bottom) panel meets the side panel
  if (pipe > 0) for (const top of [1, -1]) {
    const base = pos.length / 3, K = 6;
    for (const p of O) {
      const cx = p.x - 0.29 * edge * p.nx, cz = p.z - 0.29 * edge * p.nz;
      const cy = top * (h / 2 - 0.29 * edge) + (top > 0 ? lump * wob(cx, cz) - sag(cz) : 0);
      for (let k = 0; k < K; k++) {
        const f = (k / K) * Math.PI * 2, ro = Math.cos(f) * pipe + pipe * 0.55, up = Math.sin(f) * pipe + top * pipe * 0.55;
        pos.push(cx + ro * 0.707 * p.nx, cy + up * 0.9, cz + ro * 0.707 * p.nz);
      }
    }
    for (let j = 0; j < S; j++) for (let k = 0; k < K; k++) {
      const j1 = (j + 1) % S, k1 = (k + 1) % K, a = base + j * K + k, b = base + j1 * K + k, c = base + j * K + k1, e = base + j1 * K + k1;
      idx.push(a, c, b, b, c, e);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  // wound the wrong way round for this outline direction? turn every triangle over
  if (g.getAttribute('normal').getY(0) < 0) {
    for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
    g.setIndex(idx);
    g.computeVertexNormals();
  }
  return boxUV(g, o.tile ?? T_BOUCLE, 'x');
}

/**
 * A stuffed scatter cushion or pillow standing in the x-y plane (w wide, h tall, t thick at its middle):
 * two faces meeting at a knife-edge seam, plump in the middle, the seams drawn in along each side so the
 * corners are left as soft ears.
 */
export function pillowGeo(w: number, h: number, t: number, o: { n?: number; bow?: number; seed?: number; tile?: number; chop?: number } = {}): THREE.BufferGeometry {
  const n = o.n ?? 16, bow = o.bow ?? 0.055, seed = o.seed ?? 1, rows = n + 1;
  const pos: number[] = [], idx: number[] = [];
  for (const side of [1, -1]) {
    const start = pos.length / 3;
    for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) {
      // closer spacing towards the seam, where the surface turns fastest
      const u = -Math.cos((i / n) * Math.PI), v = -Math.cos((j / n) * Math.PI);
      const fill = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(u), 2.4)), 0.55) * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(v), 2.4)), 0.55);
      const dent = 1 + 0.07 * Math.sin(u * 3.1 + seed) * Math.sin(v * 2.7 - seed * 0.7) - (o.chop ?? 0) * Math.exp(-u * u * 7) * c01(v + 0.2);
      pos.push((w / 2) * u * (1 - bow * (1 - v * v)), (h / 2) * v * (1 - bow * (1 - u * u)), side * (t / 2) * fill * dent);
    }
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const a = start + r * rows + c, b = a + rows;
      if (side > 0) idx.push(a, a + 1, b, b, a + 1, b + 1);
      else idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return boxUV(g, o.tile ?? T_LINEN, 'x');
}

/**
 * Cloth hung over something. `path` is the line the cloth follows in a vertical plane, as [across, up]
 * points; its width runs along z. Where the cloth hangs it gathers into folds that deepen towards the hem.
 */
export function drapeGeo(path: [number, number][], width: number, o: { folds?: number; amp?: number; seed?: number; tile?: number; gather?: number; lie?: number } = {}): THREE.BufferGeometry {
  // `lie`: how much of the folding remains where the cloth lies flat
  const folds = o.folds ?? 5, amp = o.amp ?? 0.018, seed = o.seed ?? 1, gather = o.gather ?? 0.08, lie = o.lie ?? 0.12;
  const curve = new THREE.CatmullRomCurve3(path.map(([a, y]) => new THREE.Vector3(a, y, 0)), false, 'centripetal');
  const NP = 44, NW = 30, pts = curve.getSpacedPoints(NP);
  const pos: number[] = [], idx: number[] = [], uv: number[] = [], len = curve.getLength(), tile = o.tile ?? T_LINEN;
  // how freely each point hangs: 0 where the cloth lies on something, 1 where it falls straight
  const hang: number[] = [];
  for (let i = 0; i <= NP; i++) { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(NP, i + 1)]; const ty = Math.abs(b.y - a.y) / Math.max(1e-6, Math.hypot(b.x - a.x, b.y - a.y)); hang.push(c01((ty - 0.35) / 0.5)); }
  // folds build up along a hanging run and die where the cloth lies flat again
  const run: number[] = [];
  let acc = 0;
  for (let i = 0; i <= NP; i++) { acc = hang[i] > 0.5 ? Math.min(1, acc + 2.4 / NP) : acc * 0.7; run.push(acc); }
  let acc2 = 0;
  for (let i = NP; i >= 0; i--) { acc2 = hang[i] > 0.5 ? Math.min(1, acc2 + 2.4 / NP) : acc2 * 0.7; run[i] = Math.max(run[i], acc2 * (i < NP / 2 ? 1 : 0)); }
  for (let j = 0; j <= NW; j++) {
    const q = j / NW - 0.5;
    for (let i = 0; i <= NP; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(NP, i + 1)], tl = Math.max(1e-6, Math.hypot(b.x - a.x, b.y - a.y));
      const nx = -(b.y - a.y) / tl, ny = (b.x - a.x) / tl, f = lie + (1 - lie) * run[i];
      // folds only ever stand off the thing the cloth lies on (the path's left-hand normal), never into it
      const rip = amp * f * (0.5 + 0.5 * (Math.sin(q * folds * Math.PI * 2 + seed + (i / NP) * 1.1) * 0.7 + Math.sin(q * folds * 2.3 * Math.PI * 2 + seed * 2.1) * 0.3));
      pos.push(pts[i].x + nx * rip, pts[i].y + ny * rip, q * width * (1 - gather * run[i]));
      uv.push((q * width) / tile, ((i / NP) * len) / tile);
    }
  }
  const row = NP + 1;
  for (let j = 0; j < NW; j++) for (let i = 0; i < NP; i++) { const a = j * row + i, b = a + row; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// --- ceramics --------------------------------------------------------------------------------------------
/**
 * A vessel as a potter throws it: the outer profile ([radius, height] from the foot to the rim) is drawn
 * through smoothly, the wall has thickness, the rim is rounded, the inside is hollow and the base stands on
 * a turned foot ring. `spout` pulls a pouring lip at +x.
 */
export function thrownGeo(profile: [number, number][], o: { wall?: number; seg?: number; samples?: number; spout?: number; tile?: number; floor?: number } = {}): THREE.BufferGeometry {
  const wall = o.wall ?? 0.006, seg = o.seg ?? 36, samples = o.samples ?? 26;
  const outer = new THREE.SplineCurve(profile.map(([r, y]) => new THREE.Vector2(r, y))).getPoints(samples);
  const rf = profile[0][0], y0 = profile[0][1], top = outer[outer.length - 1];
  const pts: THREE.Vector2[] = [new THREE.Vector2(0.0001, y0 + 0.004), new THREE.Vector2(Math.max(0.002, rf - 0.014), y0 + 0.004), new THREE.Vector2(Math.max(0.003, rf - 0.009), y0), ...outer];
  for (let i = 1; i <= 5; i++) { const a = (i / 6) * Math.PI; pts.push(new THREE.Vector2(top.x - wall / 2 + (wall / 2) * Math.cos(a), top.y + (wall / 2) * Math.sin(a))); }
  const floor = o.floor ?? y0 + Math.max(wall, 0.008) + 0.004;
  for (let i = outer.length - 1; i >= 0; i--) {
    const a = outer[Math.max(0, i - 1)], b = outer[Math.min(outer.length - 1, i + 1)], l = Math.max(1e-6, Math.hypot(b.x - a.x, b.y - a.y));
    const p = new THREE.Vector2(outer[i].x - (wall * (b.y - a.y)) / l, outer[i].y + (wall * (b.x - a.x)) / l);
    if (p.y <= floor) break;
    pts.push(new THREE.Vector2(Math.max(0.002, p.x), p.y));
  }
  pts.push(new THREE.Vector2(Math.max(0.002, pts[pts.length - 1].x * 0.6), floor), new THREE.Vector2(0.0001, floor));
  const g = new THREE.LatheGeometry(pts, seg);
  if (o.spout) {
    const p = g.getAttribute('position'), band = Math.max(0.03, (top.y - y0) * 0.16);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), r = Math.hypot(x, z);
      if (y < top.y - band || r < 1e-4) continue;
      const ang = Math.atan2(z, x), k = Math.exp(-(ang * ang) / 0.09) * c01((y - (top.y - band)) / band);
      p.setXYZ(i, x + (o.spout * k * x) / r, y - o.spout * 0.25 * k, z * (1 - 0.35 * k));
    }
    g.computeVertexNormals();
    // the lathe's seam is two rings of vertices in one place: give them one normal
    const nA = g.getAttribute('normal'), R0 = pts.length;
    for (let j = 0; j < R0; j++) { const a = j, b = seg * R0 + j, v = new THREE.Vector3(nA.getX(a) + nA.getX(b), nA.getY(a) + nA.getY(b), nA.getZ(a) + nA.getZ(b)).normalize(); nA.setXYZ(a, v.x, v.y, v.z); nA.setXYZ(b, v.x, v.y, v.z); }
  }
  // UVs in metres: round the pot and up its wall
  const uvA = g.getAttribute('uv'), pA = g.getAttribute('position'), tile = o.tile ?? T_GLAZE, rows = pts.length;
  const along: number[] = [0];
  for (let i = 1; i < rows; i++) along.push(along[i - 1] + pts[i].distanceTo(pts[i - 1]));
  const turns = Math.max(1, Math.round((2 * Math.PI * Math.max(rf, top.x)) / tile));
  for (let i = 0; i < uvA.count; i++) { void pA; uvA.setXY(i, uvA.getX(i) * turns, along[i % rows] / tile); }
  return g;
}

/** a lemon: pointed at both ends, lying on its side */
let lemonGeo: THREE.BufferGeometry | null = null, lemonMat: THREE.MeshPhysicalMaterial | null = null;
export function lemon(scale = 1) {
  lemonGeo ??= new THREE.LatheGeometry([[0.0001, -0.043], [0.006, -0.04], [0.014, -0.034], [0.026, -0.022], [0.031, -0.008], [0.031, 0.006], [0.026, 0.021], [0.015, 0.033], [0.007, 0.039], [0.0001, 0.042]].map(([r, y]) => new THREE.Vector2(r, y)), 16).rotateZ(Math.PI / 2);
  lemonMat ??= new THREE.MeshPhysicalMaterial({ name: 'lemon', color: 0xe6c236, roughness: 0.55, clearcoat: 0.25, clearcoatRoughness: 0.5 });
  const l = mk(lemonGeo, lemonMat);
  l.scale.setScalar(scale);
  return l;
}

/** a footed stoneware bowl of lemons; stands on y = 0 */
export function lemonBowl() {
  const C = craftMats(), g = new THREE.Group();
  g.add(mk(thrownGeo([[0.055, 0], [0.058, 0.012], [0.05, 0.022], [0.075, 0.036], [0.135, 0.062], [0.162, 0.086], [0.166, 0.094]], { wall: 0.007, seg: 40, floor: 0.043 }), C.glazeSand));
  const spots: [number, number, number, number, number][] = [[-0.06, 0.077, 0.018, 0.4, 0.2], [0.05, 0.076, -0.045, 2.1, -0.15], [0.034, 0.077, 0.06, 1.2, 0.1], [-0.04, 0.077, -0.058, 2.9, 0.25], [-0.004, 0.118, 0.004, 0.9, -0.3], [0.098, 0.097, 0.012, 1.7, 0.45]];
  spots.forEach(([x, y, z, ry, rz], i) => { const l = lemon(0.92 + 0.12 * ((i * 7) % 3) * 0.5); l.position.set(x, y, z); l.rotation.set(0, ry, rz); g.add(l); });
  return g;
}

/** a tall jug with a pulled lip and a strap handle; stands on y = 0, lip towards +x */
export function jug(mat: THREE.Material, s = 1) {
  const g = new THREE.Group();
  g.add(mk(thrownGeo([[0.05 * s, 0], [0.056 * s, 0.012 * s], [0.083 * s, 0.07 * s], [0.088 * s, 0.13 * s], [0.07 * s, 0.2 * s], [0.05 * s, 0.25 * s], [0.052 * s, 0.285 * s], [0.058 * s, 0.3 * s]], { wall: 0.006 * s, seg: 40, samples: 30, spout: 0.016 * s }), mat));
  const hc = new THREE.CatmullRomCurve3([[-0.05, 0.268], [-0.078, 0.286], [-0.112, 0.262], [-0.122, 0.2], [-0.106, 0.14], [-0.084, 0.118]].map(([x, y]) => new THREE.Vector3(x * s, y * s, 0)));
  const handle = new THREE.TubeGeometry(hc, 24, 0.0075 * s, 8, false);
  handle.scale(1, 1, 1.9);
  g.add(mk(tubeUV(handle, hc.getLength(), 0.0075 * s, T_GLAZE), mat));
  return g;
}

/** a shouldered vase holding a few dried branches; stands on y = 0 */
export function vaseWithBranches(mat: THREE.Material, seed = 1, s = 1) {
  const C = craftMats(), g = new THREE.Group();
  g.add(mk(thrownGeo([[0.05 * s, 0], [0.055 * s, 0.01 * s], [0.092 * s, 0.07 * s], [0.108 * s, 0.14 * s], [0.092 * s, 0.205 * s], [0.05 * s, 0.245 * s], [0.04 * s, 0.27 * s], [0.045 * s, 0.292 * s]], { wall: 0.006 * s, seg: 40, samples: 30 }), mat));
  let k = seed * 9973;
  const rnd = () => ((k = (k * 16807) % 2147483647) / 2147483647);
  const twig = (a: THREE.Vector3, dir: THREE.Vector3, len: number, r: number, depth: number) => {
    const pts = [a.clone()], d = dir.clone();
    const n = 4;
    for (let i = 1; i <= n; i++) { d.add(new THREE.Vector3((rnd() - 0.5) * 0.5, 0.08, (rnd() - 0.5) * 0.5)).normalize(); pts.push(pts[i - 1].clone().addScaledVector(d, len / n)); }
    const curve = new THREE.CatmullRomCurve3(pts), tg = new THREE.TubeGeometry(curve, 8, r, 5, false), p = tg.getAttribute('position');
    // taper to the tip
    for (let i = 0; i < p.count; i++) { const ring = Math.floor(i / 6), t = ring / 8, c = curve.getPointAt(Math.min(1, t)); p.setXYZ(i, c.x + (p.getX(i) - c.x) * (1 - 0.6 * t), c.y + (p.getY(i) - c.y) * (1 - 0.6 * t), c.z + (p.getZ(i) - c.z) * (1 - 0.6 * t)); }
    g.add(mk(tg, C.twig));
    if (depth > 0) for (let i = 0; i < 2 + depth; i++) {
      const t = 0.3 + 0.6 * rnd(), at = curve.getPointAt(t), tan = curve.getTangentAt(t);
      twig(at, tan.add(new THREE.Vector3((rnd() - 0.5) * 1.6, 0.3 * rnd(), (rnd() - 0.5) * 1.6)).normalize(), len * (0.3 + 0.25 * rnd()), r * 0.6, depth - 1);
    }
  };
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + rnd(), lean = 0.18 + 0.3 * rnd();
    twig(new THREE.Vector3(Math.cos(a) * 0.012 * s, 0.1 * s, Math.sin(a) * 0.012 * s), new THREE.Vector3(Math.cos(a) * lean, 1, Math.sin(a) * lean).normalize(), (0.52 + 0.3 * rnd()) * s, 0.0035 * s, 2);
  }
  return g;
}

// --- books -----------------------------------------------------------------------------------------------
/** one hardback lying flat: cloth boards that stand proud of the page block, a rounded spine at −x, a foil title */
export function book(w: number, d: number, t: number, cover: THREE.Material) {
  const C = craftMats(), g = new THREE.Group(), b = 0.003;
  const board = boxUV(new THREE.BoxGeometry(w, b, d), T_LINEN, 'x');
  g.add(mk(board.clone().translate(0, b / 2, 0), cover), mk(board.clone().translate(0, t - b / 2, 0), cover));
  const spine = new THREE.CylinderGeometry(t / 2, t / 2, d, 10, 1, false, Math.PI, Math.PI).rotateX(Math.PI / 2);
  spine.scale(0.012 / t, 1, 1);
  g.add(mk(boxUV(spine.translate(-w / 2 + 0.001, t / 2, 0), T_LINEN, 'z'), cover));
  g.add(mk(boxUV(new THREE.BoxGeometry(w - 0.006, t - 2 * b, d - 0.008).translate(0.001, t / 2, 0), 0.012, 'x'), C.pages, false));
  g.add(mk(new THREE.BoxGeometry(w * 0.34, 0.0004, d * 0.07).translate(-w * 0.12, t + 0.0002, -d * 0.24), C.bronze, false));
  return g;
}
/** a small stack of art books, each a little smaller than the one below and turned a few degrees */
export function bookStack(seed = 0) {
  const C = craftMats(), g = new THREE.Group();
  const covers = [C.linenInk, C.linen, C.linenSage, C.linenRust];
  const sizes: [number, number, number][] = [[0.25, 0.33, 0.034], [0.235, 0.3, 0.026], [0.2, 0.26, 0.03]];
  let y = 0;
  sizes.forEach(([w, d, t], i) => {
    const b = book(w, d, t, covers[(i + seed) % covers.length]);
    b.position.set((i - 1) * 0.008, y, i * 0.012 - 0.01);
    b.rotation.y = [0.05, -0.16, 0.12][i] + seed * 0.03;
    g.add(b);
    y += t + 0.0005;
  });
  g.userData.top = y;
  return g;
}

/** a low round tray turned from oak, with a raised rim */
export function tray(radius = 0.2) {
  const C = craftMats();
  const g = new THREE.LatheGeometry([[0.0001, 0], [radius - 0.008, 0], [radius, 0.006], [radius, 0.02], [radius - 0.004, 0.024], [radius - 0.009, 0.02], [radius - 0.012, 0.01], [0.0001, 0.009]].map(([r, y]) => new THREE.Vector2(r, y)), 48);
  return mk(boxUV(g, T_OAK, 'x'), C.oak);
}

// --- timber parts ----------------------------------------------------------------------------------------
/** a round bar from a to b, tapering from r0 to r1, with the grain (or brushing) running along it */
function rod(a: THREE.Vector3, b: THREE.Vector3, r0: number, r1: number, m: THREE.Material, seg = 10) {
  const len = a.distanceTo(b);
  const g = boxUV(new THREE.CylinderGeometry(r1, r0, len, seg), T_OAK, 'y');
  const o = mk(g, m);
  o.position.copy(a).add(b).multiplyScalar(0.5);
  o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return o;
}
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
/** a bent bar through points, grain along its length; `tall` stretches the section upwards (a flat rail) */
function bentBar(pts: THREE.Vector3[], r: number, m: THREE.Material, tall = 1, seg = 28) {
  const curve = new THREE.CatmullRomCurve3(pts), g = new THREE.TubeGeometry(curve, seg, r, 8, false);
  if (tall !== 1) {
    const p = g.getAttribute('position');
    for (let i = 0; i < p.count; i++) { const c = curve.getPointAt(Math.min(1, Math.floor(i / 9) / seg)); p.setY(i, c.y + (p.getY(i) - c.y) * tall); }
    g.computeVertexNormals();
  }
  return mk(tubeUV(g, curve.getLength(), r, T_OAK), m);
}

/**
 * A dining chair facing −z (towards its table): front legs, back legs that run on up as posts to carry the
 * curved back rail, three slim spindles, seat rails and an H stretcher. The seat is a thin upholstered pad.
 */
export function buildDiningChair(frame: THREE.Material, seatMat: THREE.Material, seatTile = T_LINEN): THREE.Group {
  const g = new THREE.Group();
  const seatY = 0.44;
  for (const s of [-1, 1]) {
    // front leg, and the back leg rising through the seat to the rail
    g.add(rod(V(s * 0.205, 0, -0.19), V(s * 0.195, seatY, -0.18), 0.013, 0.017, frame));
    g.add(bentBar([V(s * 0.205, 0, 0.215), V(s * 0.2, 0.22, 0.2), V(s * 0.195, seatY, 0.19), V(s * 0.192, 0.62, 0.2), V(s * 0.188, 0.795, 0.228)], 0.0155, frame, 1, 20));
    // side seat rail and side stretcher
    g.add(mk(boxUV(new THREE.BoxGeometry(0.018, 0.034, 0.36), T_OAK, 'z').translate(s * 0.195, seatY - 0.022, 0.005), frame));
    g.add(rod(V(s * 0.201, 0.2, -0.185), V(s * 0.2, 0.2, 0.2), 0.008, 0.008, frame, 8));
  }
  for (const z of [-0.18, 0.19]) g.add(mk(boxUV(new THREE.BoxGeometry(0.38, 0.034, 0.018), T_OAK, 'x').translate(0, seatY - 0.022, z), frame));
  g.add(rod(V(-0.2, 0.2, 0.01), V(0.2, 0.2, 0.01), 0.008, 0.008, frame, 8));
  // the back rail: a bent lamella carried on the two posts, with short horns beyond them
  g.add(bentBar([V(-0.235, 0.8, 0.19), V(-0.19, 0.8, 0.232), V(-0.1, 0.8, 0.262), V(0, 0.8, 0.272), V(0.1, 0.8, 0.262), V(0.19, 0.8, 0.232), V(0.235, 0.8, 0.19)], 0.0105, frame, 2.9, 30));
  for (const x of [-0.095, 0, 0.095]) g.add(rod(V(x, seatY - 0.01, 0.192), V(x, 0.795, x === 0 ? 0.27 : 0.26), 0.006, 0.006, frame, 6));
  const seat = mk(boxCushionGeo(0.45, 0.43, 0.045, { crown: 0.012, r: 0.045, edge: 0.014, bulge: 0.003, lump: 0.001, piping: 0.003, tile: seatTile }), seatMat);
  seat.position.set(0, seatY + 0.0225, 0);
  g.add(seat);
  return g;
}

/** a rug: wool pile with thickness, its top softly uneven, bound all round with cotton tape */
export function buildRug(w: number, d: number, thick = 0.016): THREE.Group {
  const C = craftMats(), g = new THREE.Group();
  const body = mk(boxCushionGeo(w, d, thick, { crown: 0.0015, r: 0.03, edge: 0.005, bulge: 0, lump: 0.0012, tile: T_RUG, seed: 4 }), C.rug, false);
  body.position.y = thick / 2 + 0.001;
  g.add(body);
  // the binding: a flat tape wrapped over the edge, a touch lower than the pile
  const O = roundRect(w + 0.002, d + 0.002, 0.03, 0.2), S = O.length, pos: number[] = [], idx: number[] = [];
  const sec: [number, number][] = [[-0.022, thick - 0.0015], [-0.008, thick - 0.0005], [0.002, thick - 0.004], [0.004, thick * 0.45], [0.002, 0.001]];
  for (const p of O) for (const [off, y] of sec) pos.push(p.x + off * p.nx, y + 0.001, p.z + off * p.nz);
  for (let j = 0; j < S; j++) for (let k = 0; k < sec.length - 1; k++) { const j1 = (j + 1) % S, a = j * sec.length + k, b = j1 * sec.length + k; idx.push(a, a + 1, b, b, a + 1, b + 1); }
  const bg = new THREE.BufferGeometry();
  bg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  bg.setIndex(idx);
  bg.computeVertexNormals();
  if (bg.getAttribute('normal').getY(0) < 0) { for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; } bg.setIndex(idx); bg.computeVertexNormals(); }
  g.add(mk(boxUV(bg, T_LINEN, 'x'), C.binding, false));
  return g;
}

/**
 * An arc floor lamp: a weighted travertine base, one continuous bronze arc rising from it and sweeping over,
 * and a spun dome shade hanging level from the tip. Base at the origin; the arc reaches `reach` along +x.
 */
export function buildArcLamp(mats: InteriorMaterials, reach = 1.15, height = 1.9): THREE.Group {
  const C = craftMats(), g = new THREE.Group();
  const base = new THREE.LatheGeometry([[0.0001, 0], [0.15, 0], [0.158, 0.008], [0.158, 0.062], [0.15, 0.07], [0.0001, 0.07]].map(([r, y]) => new THREE.Vector2(r, y)), 40);
  g.add(mk(base, mats.travertineMat));
  g.add(mk(new THREE.CylinderGeometry(0.02, 0.024, 0.018, 20).translate(0, 0.079, 0), C.bronze));
  // a quarter ellipse and a little more: upright where it leaves the base, level at the crown, dipping to the tip
  const pts: THREE.Vector3[] = [], end = 1.92;
  for (let i = 0; i <= 40; i++) { const t = (i / 40) * end; pts.push(V(reach * 0.94 * (1 - Math.cos(t)) / (1 - Math.cos(end)), 0.07 + (height - 0.07) * Math.sin(t), 0)); }
  const curve = new THREE.CatmullRomCurve3(pts), stem = new THREE.TubeGeometry(curve, 72, 0.011, 10, false);
  g.add(mk(tubeUV(stem, curve.getLength(), 0.011, T_METAL), C.bronze));
  const tip = pts[pts.length - 1];
  g.add(mk(new THREE.SphereGeometry(0.019, 16, 12).translate(tip.x, tip.y, 0), C.bronze));
  g.add(mk(new THREE.CylinderGeometry(0.006, 0.006, 0.07, 10).translate(tip.x, tip.y - 0.045, 0), C.bronze));
  // the shade: a shallow spun dome 340 mm across with a turned cap, pale inside, an opal lens set up into it
  const sy = tip.y - 0.08;
  const dome: [number, number][] = [[0.0001, 0], [0.022, 0], [0.028, -0.012], [0.06, -0.03], [0.11, -0.062], [0.15, -0.1], [0.168, -0.135], [0.17, -0.142]];
  // outside: the profile runs rim to cap so its faces look outwards; inside: cap to rim, looking in
  const shade = new THREE.LatheGeometry([...dome].reverse().map(([r, y]) => new THREE.Vector2(r, y)), 48);
  g.add(mk(boxUV(shade.translate(tip.x, sy, 0), T_METAL, 'x'), C.bronze));
  const inner = new THREE.Mesh(new THREE.LatheGeometry(dome.map(([r, y]) => new THREE.Vector2(Math.max(0.0001, r - 0.003), y - 0.003)), 48).translate(tip.x, sy, 0), new THREE.MeshStandardMaterial({ name: 'shade_lining_white', color: 0xf6efe2, roughness: 0.7, emissive: 0xffe2b8, emissiveIntensity: 0.35 }));
  g.add(inner);
  g.add(mk(new THREE.CylinderGeometry(0.105, 0.105, 0.006, 32).translate(tip.x, sy - 0.1, 0), C.opal, false));
  g.userData.shadeAt = [tip.x, sy - 0.142];
  return g;
}

/**
 * The living suite: a low bouclé sofa (welted box cushions with crowned tops, plump scatter cushions, a wool
 * throw over one arm) on a bound wool rug, a fluted travertine table styled with books and a vase of branches,
 * and an arc lamp. The sofa faces +z; its back is 0.52 m behind the origin.
 */
export function buildSculptedBoucleSofa(mats: InteriorMaterials, seats = 3, rugDepth = 3.2, rugBack = 1.02): THREE.Group {
  const C = craftMats(), g = new THREE.Group();
  const sw = seats * 1.07;
  addContactShadow(g, sw + 0.7, 1.5, 0, 0);
  addContactShadow(g, 1.25, 1.25, 0, 1.38);

  // the rug runs a hand past each arm; the lamp stands off it, on the floor
  const rug = buildRug(sw + 0.6, rugDepth);
  rug.position.set(0, 0, rugDepth / 2 - rugBack);
  g.add(rug);
  const ry = 0.017; // everything on the rug stands on its pile

  // recessed oak plinth
  g.add(mk(boxUV(new THREE.BoxGeometry(sw + 0.3, 0.1, 0.9), T_OAK, 'x').translate(0, ry + 0.05, 0), C.oak));
  // the upholstered deck the cushions sit on, the back and the two slab arms
  const deck = mk(boxCushionGeo(sw + 0.4, 1.02, 0.17, { crown: 0.004, r: 0.05, edge: 0.03, bulge: 0.006, piping: 0.005, seed: 11 }), C.boucle);
  deck.position.set(0, 0.205, 0);
  g.add(deck);
  const backGeo = boxCushionGeo(sw + 0.02, 0.47, 0.16, { crown: 0.012, under: 0.012, r: 0.05, edge: 0.03, piping: 0.005, seed: 12 }).rotateX(-Math.PI / 2);
  const back = mk(boxUV(backGeo, T_BOUCLE, 'x'), C.boucle);
  back.position.set(0, 0.52, -0.425);
  back.rotation.x = -0.07;
  g.add(back);
  const armGeo = boxCushionGeo(1.02, 0.37, 0.2, { crown: 0.012, under: 0.012, r: 0.055, edge: 0.034, bulge: 0.008, piping: 0.005, seed: 13 }).applyMatrix4(new THREE.Matrix4().makeBasis(V(0, 0, 1), V(1, 0, 0), V(0, 1, 0)));
  boxUV(armGeo, T_BOUCLE, 'x');
  for (const s of [-1, 1]) { const arm = mk(armGeo, C.boucle); arm.position.set(s * (sw / 2 + 0.1), 0.47, 0); g.add(arm); }

  // seat cushions: crowned, welted, the front edge rolled; and softer back cushions leaning on the back
  for (let k = 0; k < seats; k++) {
    const x = (k - (seats - 1) / 2) * 1.07;
    const seat = mk(boxCushionGeo(1.062, 0.82, 0.17, { crown: 0.034, r: 0.05, edge: 0.024, bulge: 0.01, piping: 0.005, front: 0.014, lump: 0.004, seed: 20 + k * 3 }), C.boucle);
    seat.position.set(x, 0.375, 0.1);
    g.add(seat);
    const bcGeo = boxCushionGeo(1.03, 0.4, 0.19, { crown: 0.05, under: 0.022, r: 0.075, edge: 0.034, bulge: 0.012, piping: 0.005, lump: 0.006, seed: 30 + k * 5 }).rotateX(Math.PI / 2);
    const bc = mk(boxUV(bcGeo, T_BOUCLE, 'x'), C.boucle);
    bc.position.set(x, 0.655 - (k % 2) * 0.006, -0.235);
    bc.rotation.set(-0.17, 0, (k - 1) * 0.008);
    g.add(bc);
  }

  // scatter cushions: plump, with pinched corners, resting in the corners of the seat
  const sc = (w: number, h: number, t: number, m: THREE.Material, x: number, z: number, rx: number, ryaw: number, rz: number, seed: number, tile = T_LINEN, chop = 0) => {
    const p = mk(pillowGeo(w, h, t, { seed, tile, chop }), m);
    p.position.set(x, 0.47 + (h / 2) * Math.cos(rx) - 0.012, z);
    p.rotation.set(rx, ryaw, rz, 'YXZ');
    g.add(p);
  };
  sc(0.52, 0.52, 0.17, C.linenRust, -(sw / 2 - 0.3), -0.02, -0.3, 0.42, 0.05, 1, T_LINEN, 0.1);
  sc(0.42, 0.42, 0.15, C.linen, -(sw / 2 - 0.66), 0.08, -0.36, 0.2, -0.07, 2);
  sc(0.6, 0.36, 0.15, C.linen, sw / 2 - 0.82, 0.0, -0.33, -0.28, -0.03, 3);

  // a wool throw folded once and hung over the right arm, pooling on the seat
  const ax = sw / 2;
  const over: [number, number][] = [[ax - 0.4, 0.5], [ax - 0.2, 0.49], [ax - 0.055, 0.5], [ax - 0.03, 0.56], [ax - 0.028, 0.63], [ax + 0.016, 0.674], [ax + 0.1, 0.678], [ax + 0.184, 0.674], [ax + 0.228, 0.63], [ax + 0.232, 0.5], [ax + 0.236, 0.33]];
  const throwA = mk(drapeGeo(over, 0.62, { folds: 4, amp: 0.016, seed: 2 }), C.throwWool);
  throwA.position.z = 0.16;
  // folded in half: the upper layer lies 7 mm off the lower one and stops short of its hems
  const upper = over.map(([a, y], i) => { const p = over[Math.max(0, i - 1)], n = over[Math.min(over.length - 1, i + 1)], l = Math.hypot(n[0] - p[0], n[1] - p[1]) || 1; return [a - (0.007 * (n[1] - p[1])) / l, y + (0.007 * (n[0] - p[0])) / l] as [number, number]; });
  upper[0][0] += 0.05;
  upper[upper.length - 1][1] += 0.07;
  const throwB = mk(drapeGeo(upper, 0.6, { folds: 4, amp: 0.014, seed: 2.6 }), C.throwWool);
  throwB.position.z = 0.168;
  g.add(throwA, throwB);

  // fluted travertine drum table: a metre across, 330 mm clear of the sofa
  const table = new THREE.Group();
  table.position.set(0, ry, 1.38);
  const drum = mk(new THREE.CylinderGeometry(0.3, 0.31, 0.3, 32).translate(0, 0.15, 0), mats.travertineMat);
  table.add(drum);
  const ribGeo = new THREE.CylinderGeometry(0.03, 0.031, 0.296, 10).translate(0, 0.15, 0), nRib = 30;
  const ribs = new THREE.InstancedMesh(ribGeo, mats.travertineMat, nRib), m4 = new THREE.Matrix4();
  for (let i = 0; i < nRib; i++) { const a = (i / nRib) * Math.PI * 2; ribs.setMatrixAt(i, m4.makeTranslation(Math.cos(a) * 0.305, 0, Math.sin(a) * 0.305)); }
  ribs.castShadow = true;
  ribs.receiveShadow = true;
  table.add(ribs);
  const topGeo = new THREE.LatheGeometry([[0.0001, 0.3], [0.33, 0.3], [0.492, 0.303], [0.5, 0.312], [0.5, 0.336], [0.492, 0.345], [0.0001, 0.345]].map(([r, y]) => new THREE.Vector2(r, y)), 64);
  // the stone's bedding runs straight across the top
  { const p = topGeo.getAttribute('position'), uv = topGeo.getAttribute('uv'); for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) + 0.5, p.getZ(i) + 0.5); }
  table.add(mk(topGeo, mats.travertineMat));
  // styling: a tray with a vase of branches and a small bowl, and a stack of books with a dish on it
  const ty = 0.345;
  const tr = tray(0.19);
  tr.position.set(0.17, ty, -0.1);
  table.add(tr);
  const vase = vaseWithBranches(C.glazeRust, 3);
  vase.position.set(0.2, ty + 0.009, -0.13);
  table.add(vase);
  const cup = mk(thrownGeo([[0.022, 0], [0.025, 0.006], [0.038, 0.03], [0.041, 0.052]], { wall: 0.004, seg: 24, samples: 12 }), C.glazeSand);
  cup.position.set(0.08, ty + 0.009, -0.03);
  table.add(cup);
  const books = bookStack(0);
  books.position.set(-0.2, ty, 0.12);
  books.rotation.y = 0.5;
  table.add(books);
  const dish = mk(thrownGeo([[0.03, 0], [0.034, 0.005], [0.06, 0.017], [0.07, 0.026]], { wall: 0.004, seg: 28, samples: 12 }), C.glazeWhite);
  dish.position.set(-0.2, ty + (books.userData.top as number), 0.12);
  table.add(dish);
  g.add(table);

  // the arc lamp stands off the left arm and reaches over towards the table
  const lamp = buildArcLamp(mats, 1.12, 1.92);
  lamp.position.set(-(sw / 2 + 0.5), 0, -0.2);
  lamp.rotation.y = -0.5;
  g.add(lamp);
  return g;
}

/** a dining table with six (or four) chairs. `ceiling` > 0 hangs a lantern over it. */
export function buildScandiDiningSuite(mats: InteriorMaterials, perSide = 3, ceiling = 3.0, outdoor = false): THREE.Group {
  const C = craftMats(), g = new THREE.Group();
  const tl = perSide >= 3 ? 2.6 : 1.9, tw = 1.0;
  const timber = outdoor ? C.teak : C.oak;
  addContactShadow(g, tl + 0.6, 2.0, 0, 0);

  // the top: outdoors, boards with gaps to shed the rain; indoors one bull-nosed top
  if (outdoor) {
    const n = 9, bw = (tw - (n - 1) * 0.006) / n;
    for (let i = 0; i < n; i++) g.add(mk(boxUV(createRoundedBoxGeo(tl, 0.028, bw, 0.004, 2).translate(0, 0.736, -tw / 2 + bw / 2 + i * (bw + 0.006)), T_OAK, 'x'), timber));
  } else {
    g.add(mk(boxUV(createRoundedBoxGeo(tl, 0.04, tw, 0.012, 3).translate(0, 0.73, 0), T_OAK, 'x'), timber));
  }
  // rails under the top, and four tapered legs set in from the corners
  const lx = tl / 2 - 0.16, lz = tw / 2 - 0.13;
  for (const s of [-1, 1]) {
    g.add(mk(boxUV(new THREE.BoxGeometry(2 * lx, 0.07, 0.024).translate(0, 0.676, s * lz), T_OAK, 'x'), timber));
    g.add(mk(boxUV(new THREE.BoxGeometry(0.024, 0.07, 2 * lz).translate(s * lx, 0.676, 0), T_OAK, 'z'), timber));
    for (const t of [-1, 1]) g.add(rod(V(s * (lx + 0.02), 0, t * (lz + 0.015)), V(s * lx, 0.712, t * lz), 0.02, 0.031, timber, 14));
  }

  // on the table: a jug, a low bowl, and indoors two candlesticks
  const j = jug(C.glazeSand, 0.9);
  j.position.set(-0.24, 0.75, 0.03);
  j.rotation.y = 0.6;
  g.add(j);
  const bowl = mk(thrownGeo([[0.05, 0], [0.054, 0.01], [0.1, 0.04], [0.14, 0.07]], { wall: 0.006, seg: 36, samples: 16 }), outdoor ? C.glazeWhite : C.glazeRust);
  bowl.position.set(0.22, 0.75, -0.05);
  g.add(bowl);
  if (!outdoor) for (const [cx, cz, ch] of [[0.5, 0.06, 0.2], [0.6, -0.04, 0.15]]) {
    g.add(mk(new THREE.LatheGeometry([[0.0001, 0], [0.032, 0], [0.034, 0.006], [0.012, 0.012], [0.009, 0.03], [0.014, 0.036], [0.0001, 0.036]].map(([r, y]) => new THREE.Vector2(r, y)), 20).translate(cx, 0.75, cz), C.bronze));
    g.add(mk(new THREE.CylinderGeometry(0.0095, 0.011, ch, 12).translate(cx, 0.786 + ch / 2, cz), new THREE.MeshStandardMaterial({ name: 'beeswax_candle', color: 0xf3ead8, roughness: 0.6 })));
  }

  const chair = buildDiningChair(timber, outdoor ? C.outdoor : C.linen);
  for (const side of [-1, 1]) for (const cx of perSide >= 3 ? [-0.8, 0, 0.8] : [-0.46, 0.46]) {
    const c = chair.clone();
    c.position.set(cx, 0, side * 0.66);
    c.rotation.y = side > 0 ? 0 : Math.PI;
    g.add(c);
  }

  // an alabaster and bronze lantern over the table; none outdoors
  if (ceiling > 0) {
    const lanternY = Math.min(ceiling - 0.5, 1.72);
    g.add(mk(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 20).translate(0, ceiling - 0.015, 0), mats.tapwareMat));
    const rodLen = Math.max(0.05, ceiling - 0.03 - (lanternY + 0.16));
    g.add(mk(new THREE.CylinderGeometry(0.008, 0.008, rodLen, 8).translate(0, ceiling - 0.03 - rodLen / 2, 0), mats.tapwareMat));
    const alabaster = new THREE.Mesh(new THREE.SphereGeometry(0.42, 32, 20), new THREE.MeshStandardMaterial({ color: 0xf7eee0, emissive: 0xffd292, emissiveIntensity: 1.4, roughness: 0.34 }));
    alabaster.scale.set(1.15, 0.44, 1.15);
    alabaster.position.set(0, lanternY, 0);
    g.add(alabaster);
  }
  return g;
}

export interface BedOpts {
  /** mattress width and length: 1.53 × 2.03 is a queen */
  w?: number;
  l?: number;
  /** a side table and lamp on the left (−x) and right (+x) of the bed */
  tables?: [boolean, boolean];
  /** rug size; 0 for none */
  rugW?: number;
  rugD?: number;
}
/**
 * An oak bed at real size with layered linen: a crowned mattress and duvet, plump pillows, a wool throw hung
 * across the foot, on a bound rug, with turned oak side tables and ceramic lamps. Head at −z; the headboard's
 * back face is (l / 2 + 0.11) behind the origin.
 */
export function buildMasterBedroomSuite(mats: InteriorMaterials, o: BedOpts = {}): THREE.Group {
  const C = craftMats(), g = new THREE.Group();
  const w = o.w ?? 1.53, l = o.l ?? 2.03, tables = o.tables ?? [true, true];
  const rugW = o.rugW ?? w + 1.3, rugD = o.rugD ?? 2.0;
  addContactShadow(g, w + 0.6, l + 0.5, 0, 0);
  let fy = 0;
  if (rugW > 0 && rugD > 0) { const rug = buildRug(rugW, rugD, 0.014); rug.position.set(0, 0, l / 2 - rugD / 2 + 0.55); g.add(rug); fy = 0.015; }

  // platform: a recessed plinth and an oak frame a hand wider than the mattress
  const fw = w + 0.1, fl = l + 0.08;
  g.add(mk(new THREE.BoxGeometry(fw - 0.2, 0.1, fl - 0.24).translate(0, 0.05 + fy, 0), mats.joineryMat));
  g.add(mk(boxUV(createRoundedBoxGeo(fw, 0.16, fl, 0.012, 3).translate(0, 0.18 + fy, 0), T_OAK, 'z'), C.oak));
  // headboard: one oak panel standing on the floor behind the frame
  g.add(mk(boxUV(createRoundedBoxGeo(fw + 0.06, 1.0, 0.05, 0.012, 3).translate(0, 0.5, -(fl / 2 + 0.035)), T_OAK, 'x'), C.oak));
  const my = 0.26 + fy;
  const mattress = mk(boxCushionGeo(w, l, 0.22, { crown: 0.012, r: 0.07, edge: 0.03, bulge: 0.006, piping: 0.004, tile: T_LINEN, seed: 5 }), C.linenWhite);
  mattress.position.set(0, my + 0.11, 0.01);
  g.add(mattress);
  // the duvet: wider than the mattress, soft and a little rumpled, turned back below the pillows
  const dl = l * 0.74;
  const duvet = mk(boxCushionGeo(w + 0.16, dl, 0.1, { crown: 0.02, r: 0.09, edge: 0.04, bulge: 0.012, lump: 0.008, tile: T_LINEN, seed: 8 }), C.linen);
  duvet.position.set(0, my + 0.26, l / 2 - dl / 2 + 0.035);
  g.add(duvet);
  const fold = mk(boxCushionGeo(w + 0.15, 0.3, 0.06, { crown: 0.02, r: 0.05, edge: 0.028, lump: 0.008, tile: T_LINEN, seed: 9 }), C.linenWhite);
  fold.position.set(0, my + 0.31, l / 2 - dl + 0.14);
  fold.rotation.x = 0.03;
  g.add(fold);
  // a wool throw hung across the foot of the bed, falling down both sides
  const hw = w / 2 + 0.1;
  const across: [number, number][] = [[-hw - 0.014, my - 0.04], [-hw - 0.012, my + 0.15], [-hw - 0.004, my + 0.27], [-hw + 0.03, my + 0.312], [-hw + 0.12, my + 0.332], [-hw * 0.4, my + 0.343], [0, my + 0.347], [hw * 0.4, my + 0.343], [hw - 0.12, my + 0.332], [hw - 0.03, my + 0.312], [hw + 0.004, my + 0.27], [hw + 0.012, my + 0.15], [hw + 0.014, my - 0.01]];
  const th = mk(drapeGeo(across, 0.52, { folds: 2.5, amp: 0.02, seed: 4, gather: 0.06, lie: 0.38 }), C.throwWool);
  th.position.z = l / 2 - 0.4;
  th.rotation.y = 0.025;
  g.add(th);
  // pillows: two to sleep on standing against the headboard, two in front, one small bouclé cushion
  const py = my + 0.22, hz = -l / 2;
  for (const s of [-1, 1]) {
    const p1 = mk(pillowGeo(0.7, 0.46, 0.19, { seed: 5 + s, bow: 0.035 }), C.linenWhite);
    p1.position.set(s * (w / 4 + 0.01), py + 0.2, hz + 0.14);
    p1.rotation.set(-0.3, 0, s * 0.02);
    const p2 = mk(pillowGeo(0.66, 0.42, 0.18, { seed: 8 + s, bow: 0.04 }), C.linen);
    p2.position.set(s * (w / 4 - 0.01), py + 0.165, hz + 0.31);
    p2.rotation.set(-0.5, 0, -s * 0.03);
    g.add(p1, p2);
  }
  const p3 = mk(pillowGeo(0.52, 0.3, 0.14, { seed: 12, tile: T_BOUCLE }), C.boucle);
  p3.position.set(0.04, py + 0.12, hz + 0.47);
  p3.rotation.set(-0.6, 0.05, 0);
  g.add(p3);

  // side tables: a turned oak drum on a plinth, with a thrown ceramic lamp and a linen shade
  [-1, 1].forEach((s, i) => {
    if (!tables[i]) return;
    const x = s * (fw / 2 + 0.29), z = hz + 0.16;
    const tb = new THREE.LatheGeometry([[0.0001, 0], [0.15, 0], [0.15, 0.03], [0.19, 0.05], [0.19, 0.44], [0.2, 0.45], [0.2, 0.475], [0.196, 0.48], [0.0001, 0.48]].map(([r, y]) => new THREE.Vector2(r, y)), 40);
    g.add(mk(boxUV(tb.translate(x, 0, z), T_OAK, 'y'), C.oak));
    const lampBase = mk(thrownGeo([[0.045, 0], [0.05, 0.01], [0.078, 0.06], [0.08, 0.1], [0.05, 0.16], [0.024, 0.19], [0.022, 0.2]], { wall: 0.02, seg: 28, samples: 16 }), C.glazeSand);
    lampBase.position.set(x, 0.48, z);
    g.add(lampBase);
    g.add(mk(new THREE.CylinderGeometry(0.005, 0.005, 0.1, 8).translate(x, 0.73, z), C.bronze, false));
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.135, 0.19, 32, 1, true).translate(x, 0.8, z), new THREE.MeshPhysicalMaterial({ name: 'linen_shade_lit', color: 0xf7eee0, emissive: 0xffd18c, emissiveIntensity: 0.6, roughness: 0.7, sheen: 0.4, side: THREE.DoubleSide }));
    g.add(shade);
  });
  return g;
}

/**
 * One counter stool, 670 mm seat, facing −z (towards a bench): a bouclé pad on four black steel legs, a
 * footrest that ties the legs together, and the back legs running up to carry a low oak back.
 */
export function buildBarStool(mats: InteriorMaterials): THREE.Group {
  const C = craftMats(), stool = new THREE.Group(), steel = mats.joineryMat;
  const seat = mk(boxCushionGeo(0.38, 0.36, 0.06, { crown: 0.014, r: 0.06, edge: 0.018, bulge: 0.004, piping: 0.003, lump: 0.001 }), C.boucle);
  seat.position.y = 0.67;
  stool.add(seat);
  stool.add(mk(new THREE.BoxGeometry(0.3, 0.012, 0.28).translate(0, 0.634, 0), steel));
  for (const s of [-1, 1]) {
    stool.add(rod(V(s * 0.17, 0, -0.16), V(s * 0.135, 0.634, -0.125), 0.009, 0.011, steel, 8));
    stool.add(bentBar([V(s * 0.17, 0, 0.165), V(s * 0.15, 0.4, 0.14), V(s * 0.14, 0.634, 0.135), V(s * 0.142, 0.74, 0.16), V(s * 0.146, 0.835, 0.178)], 0.01, steel, 1, 16));
    stool.add(rod(V(s * 0.158, 0.24, -0.147), V(s * 0.158, 0.24, 0.152), 0.007, 0.007, steel, 8));
  }
  for (const z of [-0.147, 0.152]) stool.add(rod(V(-0.158, 0.24, z), V(0.158, 0.24, z), 0.007, 0.007, steel, 8));
  stool.add(bentBar([V(-0.175, 0.84, 0.15), V(-0.146, 0.84, 0.18), V(-0.07, 0.84, 0.2), V(0, 0.84, 0.205), V(0.07, 0.84, 0.2), V(0.146, 0.84, 0.18), V(0.175, 0.84, 0.15)], 0.01, C.oak, 2.6, 24));
  return stool;
}
