import * as THREE from 'three/webgpu';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { boxUV, detail, type Quality } from '../objects/util';
import { bake, fbm, hex, linen, metal, mix, paint, pbr, wood, woolPile, type PBRSet } from '../objects/tex';

// Interior pieces for the fit-out step, at real sizes, in local axes: origin on the floor at the
// footprint centre, front facing +z, y up. Each returns a named group tagged kind 'furniture'
// (or a fixture class) with its material, so the inspector can say what it is. Designs are
// generic and assembl's own; sizes follow common NZ product dimensions.

export interface Finishes {
  name: string;
  /** exterior cladding override: undefined keeps each wall's own */
  cladding?: 'cedar' | 'blackstain' | 'metal' | 'white';
  joinery: number;
  floor: 'oak' | 'concrete' | 'tile';
  walls: number;
  bench: 'stone' | 'terrazzo' | 'marble';
  cabinetry: number;
  fabric: number;
  accent: number;
  metalTrim: number;
}

export const PALETTES: Record<string, Finishes> = {
  'cedar-charcoal': { name: 'Cedar and charcoal', joinery: 0x1d1d1f, floor: 'oak', walls: 0xf1ede6, bench: 'stone', cabinetry: 0xe9e4da, fabric: 0xb8ab96, accent: 0x8a5a3c, metalTrim: 0x2a2a2a },
  'white-black': { name: 'White walls, black joinery, dark metal', cladding: 'metal', joinery: 0x141414, floor: 'oak', walls: 0xf6f5f1, bench: 'marble', cabinetry: 0x2b2b2d, fabric: 0xd6d0c4, accent: 0x6e4a32, metalTrim: 0x1a1a1a },
  'warm-oak': { name: 'Warm oak and terrazzo', joinery: 0x3b3027, floor: 'oak', walls: 0xf3ece2, bench: 'terrazzo', cabinetry: 0xc9a77c, fabric: 0x9a7f6a, accent: 0x7a4b3a, metalTrim: 0xa98544 },
  'plum-rose': { name: 'assembl plum and rose', joinery: 0x21121f, floor: 'oak', walls: 0xf9f6f2, bench: 'marble', cabinetry: 0xd9bacb, fabric: 0x5b2a4a, accent: 0x21121f, metalTrim: 0xb08a4a },
};

// --- extra surfaces ----------------------------------------------------------------------------------
function marble(size: number, o: { base: number; vein: number; seed: number; name: string }) {
  const B = hex(o.base);
  const Vn = hex(o.vein);
  return bake(
    size,
    1.2,
    (u, v) => {
      const w = fbm(u, v, 3, 3, 5, o.seed);
      const veins = Math.abs(Math.sin((u * 2 + v * 3 + w * 3.2) * Math.PI * 2));
      const t = Math.pow(1 - veins, 14) * 0.85 + Math.pow(1 - veins, 60) * 0.15;
      const cloud = 0.94 + 0.06 * fbm(u, v, 8, 8, 3, o.seed + 4);
      return { c: [mix(B[0], Vn[0], t) * cloud, mix(B[1], Vn[1], t) * cloud, mix(B[2], Vn[2], t) * cloud], h: 0.5, r: 0.12 + 0.05 * w, m: 0 };
    },
    0.4,
    o.name,
  );
}
function terrazzo(size: number, seed: number) {
  return bake(
    size,
    0.6,
    (u, v) => {
      const cell = fbm(u, v, 30, 30, 1, seed);
      const chip = cell > 0.68 ? 1 : 0;
      const tint = fbm(u, v, 30, 30, 1, seed + 9);
      const base: [number, number, number] = [0.9, 0.88, 0.84];
      const c: [number, number, number] = chip ? (tint > 0.5 ? [0.55, 0.42, 0.4] : [0.35, 0.33, 0.32]) : base;
      return { c, h: chip ? 0.6 : 0.5, r: 0.25, m: 0 };
    },
    0.6,
    'terrazzo',
  );
}
function planks(size: number, o: { light: number; dark: number; seed: number; name: string }) {
  const L = hex(o.light);
  const D = hex(o.dark);
  const rows = 6;
  return bake(
    size,
    rows * 0.185,
    (u, v) => {
      const r = Math.floor(v * rows);
      const off = ((r * 0.37) % 1 + 1) % 1;
      const along = (u + off) % 1;
      const segL = 0.5;
      const seg = Math.floor(along / segL);
      const fv = v * rows - r;
      const fu = (along % segL) / segL;
      const seam = fv < 0.025 || fu < 0.006;
      const g = fbm(u, v, 12, 96, 4, o.seed + r * 7 + seg * 13);
      const t = Math.min(1, Math.max(0, 0.45 + 0.6 * (g - 0.5) + 0.25 * (fbm(u, v, 2, 6, 2, o.seed + r) - 0.5)));
      const k = seam ? 0.55 : 1;
      return { c: [mix(L[0], D[0], t) * k, mix(L[1], D[1], t) * k, mix(L[2], D[2], t) * k], h: seam ? 0 : 0.7 + g * 0.08, r: seam ? 0.8 : 0.42 + 0.1 * g, m: 0 };
    },
    1.6,
    o.name,
  );
}
function tiles(size: number, o: { colour: number; grout: number; n: number; tile: number; name: string; gloss?: number }) {
  const C = hex(o.colour);
  const G = hex(o.grout);
  return bake(
    size,
    o.tile,
    (u, v) => {
      const fu = (u * o.n) % 1;
      const fv = (v * o.n) % 1;
      const gr = 0.03;
      const grout = fu < gr || fv < gr;
      const n = fbm(u, v, 16, 16, 3, 5);
      return grout ? { c: G, h: 0, r: 0.9, m: 0 } : { c: [C[0] * (0.97 + 0.05 * n), C[1] * (0.97 + 0.05 * n), C[2] * (0.97 + 0.05 * n)], h: 0.8, r: o.gloss ? 0.08 : 0.35, m: 0 };
    },
    2,
    o.name,
  );
}
/** ribbed metal cladding: 25 mm ribs at 300 mm centres, painted */
export function ribbedMetal(size: number, colour: number) {
  const C = hex(colour);
  return bake(
    size,
    0.6,
    (u, v) => {
      const f = (u * 2) % 1;
      const rib = Math.max(0, 1 - Math.abs(f - 0.5) / 0.045);
      const n = fbm(u, v, 4, 64, 2, 31);
      const k = 0.95 + 0.06 * n;
      return { c: [C[0] * k, C[1] * k, C[2] * k], h: rib * 1.2, r: 0.38 + 0.05 * n, m: 0.15 };
    },
    3,
    'ribbed_metal_cladding',
  );
}

export interface InteriorMats {
  d: ReturnType<typeof detail>;
  sets: Record<string, PBRSet>;
  fabric: THREE.MeshPhysicalMaterial;
  linenWhite: THREE.MeshPhysicalMaterial;
  wool: THREE.MeshPhysicalMaterial;
  oak: THREE.MeshPhysicalMaterial;
  walnut: THREE.MeshPhysicalMaterial;
  floor: THREE.MeshPhysicalMaterial;
  bench: THREE.MeshPhysicalMaterial;
  cabinet: THREE.MeshPhysicalMaterial;
  tile: THREE.MeshPhysicalMaterial;
  wallTile: THREE.MeshPhysicalMaterial;
  steel: THREE.MeshPhysicalMaterial;
  chrome: THREE.MeshPhysicalMaterial;
  brass: THREE.MeshPhysicalMaterial;
  ceramic: THREE.MeshPhysicalMaterial;
  blackGlass: THREE.MeshPhysicalMaterial;
  glass: THREE.MeshPhysicalMaterial;
  appliance: THREE.MeshPhysicalMaterial;
  lampGlow: THREE.MeshStandardMaterial;
  accent: THREE.MeshPhysicalMaterial;
}

const cache = new Map<string, InteriorMats>();
export function interiorMats(q: Quality, f: Finishes): InteriorMats {
  const key = `${q}/${f.name}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const d = q === 'hq' ? detail('hq') : { ...detail('web'), tex: 1024, texS: 512 };
  const sets: Record<string, PBRSet> = {
    fabric: linen(d.texS, { colour: f.fabric, threads: 90, tile: 0.1, name: 'upholstery_linen' }),
    linenWhite: linen(d.texS, { colour: 0xeeeae2, threads: 110, tile: 0.08, name: 'bed_linen' }),
    wool: woolPile(d.texS, { a: 0xd9d0c0, b: 0x9a8b78, tile: 0.4, name: 'wool' }),
    oak: wood(d.texS, { light: 0xcaa97c, dark: 0x9d7a52, rings: 18, gloss: 0.35, tile: 0.9, seed: 141, name: 'oak' }),
    walnut: wood(d.texS, { light: 0x7a553a, dark: 0x4a3122, rings: 14, gloss: 0.4, tile: 0.9, seed: 142, name: 'walnut' }),
    floor: f.floor === 'oak' ? planks(d.tex, { light: 0xcfae80, dark: 0x9b7650, seed: 151, name: 'oak_plank_floor' }) : f.floor === 'tile' ? tiles(d.tex, { colour: 0xd8d2c8, grout: 0xa8a29a, n: 2, tile: 1.2, name: 'floor_tile' }) : marble(d.tex, { base: 0xa6a29a, vein: 0x8f8a82, seed: 152, name: 'polished_concrete' }),
    bench: f.bench === 'marble' ? marble(d.tex, { base: 0xf1eee9, vein: 0x8f8c88, seed: 153, name: 'marble' }) : f.bench === 'terrazzo' ? terrazzo(d.tex, 154) : marble(d.tex, { base: 0xe8e4dc, vein: 0xd6d0c4, seed: 155, name: 'engineered_stone' }),
    cabinet: paint(d.texS, { colour: f.cabinetry, gloss: 0.35, tile: 0.8, seed: 156, name: 'cabinet_lacquer' }),
    tile: tiles(d.texS, { colour: 0xe9e6e0, grout: 0xc9c4bc, n: 4, tile: 0.6, name: 'wall_tile_150', gloss: 1 }),
    wallTile: tiles(d.texS, { colour: 0xd9d4ca, grout: 0xb4ada2, n: 2, tile: 1.2, name: 'bath_tile_600' }),
    steel: metal(d.texS, { tint: 0xb8b8b4, rough: 0.32, brush: 0.6, tile: 0.4, seed: 157, name: 'brushed_steel' }),
  };
  const ph = (o: THREE.MeshPhysicalMaterialParameters) => new THREE.MeshPhysicalMaterial(o);
  const m: InteriorMats = {
    d,
    sets,
    fabric: pbr(sets.fabric, 'upholstery_linen', { sheen: 0.6, sheenColor: new THREE.Color(0xfff2e2), sheenRoughness: 0.75 }),
    linenWhite: pbr(sets.linenWhite, 'bed_linen', { sheen: 0.5, sheenColor: new THREE.Color(0xffffff), sheenRoughness: 0.8 }),
    wool: pbr(sets.wool, 'wool'),
    oak: pbr(sets.oak, 'oak'),
    walnut: pbr(sets.walnut, 'walnut'),
    floor: pbr(sets.floor, 'floor_finish', { clearcoat: f.floor === 'oak' ? 0.25 : 0.5, clearcoatRoughness: 0.35 }),
    bench: pbr(sets.bench, 'benchtop', { clearcoat: 0.4, clearcoatRoughness: 0.15 }),
    cabinet: pbr(sets.cabinet, 'cabinet_lacquer'),
    tile: pbr(sets.tile, 'splashback_tile'),
    wallTile: pbr(sets.wallTile, 'bathroom_tile'),
    steel: pbr(sets.steel, 'brushed_steel'),
    chrome: ph({ name: 'chrome', color: 0xdddddd, metalness: 1, roughness: 0.08 }),
    brass: ph({ name: 'brushed_brass', color: f.metalTrim, metalness: 1, roughness: 0.3 }),
    ceramic: ph({ name: 'vitreous_china', color: 0xf7f7f4, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05 }),
    blackGlass: ph({ name: 'black_glass', color: 0x0d0d0f, roughness: 0.05, metalness: 0, clearcoat: 1 }),
    glass: ph({ name: 'shower_glass', color: 0xffffff, roughness: 0.02, transmission: 1, thickness: 0.01, ior: 1.5, transparent: true, side: THREE.DoubleSide }),
    appliance: ph({ name: 'appliance_enamel', color: 0x2a2a2c, roughness: 0.3, metalness: 0.2, clearcoat: 0.6 }),
    lampGlow: new THREE.MeshStandardMaterial({ name: 'lamp_glow', color: 0xfff1d6, emissive: new THREE.Color(0xffd9a0), emissiveIntensity: 0, roughness: 0.4 }),
    accent: ph({ name: 'accent_fabric', color: f.accent, roughness: 0.85, sheen: 0.5, sheenColor: new THREE.Color(0xfff0e0) }),
  };
  cache.set(key, m);
  return m;
}

// --- helpers -------------------------------------------------------------------------------------------
function tagged<T extends THREE.Object3D>(o: T, name: string, kind: string, material: string, extra: Record<string, string | number> = {}) {
  o.name = name;
  o.userData = { kind, name: name.replace(/_/g, ' '), material, source: 'proposed', ...extra };
  return o;
}
function mesh(name: string, g: THREE.BufferGeometry, m: THREE.Material) {
  const o = new THREE.Mesh(g, m);
  o.name = name;
  o.castShadow = o.receiveShadow = true;
  return o;
}
const rbox = (w: number, h: number, d: number, r: number, x: number, y: number, z: number, tile = 0.5) => {
  const g = new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3));
  g.translate(x, y, z);
  return boxUV(g, tile, 'x');
};
const box = (w: number, h: number, d: number, x: number, y: number, z: number, tile = 0.5, along: 'x' | 'y' | 'z' = 'x') => {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return boxUV(g, tile, along);
};
const cyl = (r0: number, r1: number, h: number, x: number, y: number, z: number, seg = 20) => {
  const g = new THREE.CylinderGeometry(r0, r1, h, seg);
  g.translate(x, y, z);
  return boxUV(g, 0.3, 'y');
};
const grp = (name: string) => {
  const g = new THREE.Group();
  g.name = name;
  return g;
};

// --- pieces ----------------------------------------------------------------------------------------------
export function bed(M: InteriorMats, w = 1.53, l = 2.03) {
  const g = grp('bed');
  const baseH = 0.32;
  g.add(mesh('bed_base', rbox(w + 0.06, baseH, l + 0.04, 0.03, 0, baseH / 2 + 0.06, 0), M.fabric));
  g.add(mesh('bed_legs', mergeGeometries([-1, 1].flatMap((sx) => [-1, 1].map((sz) => cyl(0.025, 0.025, 0.06, (sx * w) / 2.2, 0.03, (sz * l) / 2.2)))), M.walnut));
  g.add(mesh('headboard', rbox(w + 0.14, 1.05, 0.09, 0.04, 0, 0.55, -l / 2 - 0.02), M.fabric));
  g.add(mesh('mattress', rbox(w, 0.24, l - 0.02, 0.06, 0, baseH + 0.06 + 0.12, 0.01), M.linenWhite));
  // duvet with a soft fold at the foot, turned back at the head
  const duvet = rbox(w + 0.16, 0.07, l * 0.72, 0.035, 0, baseH + 0.06 + 0.27, l * 0.13);
  g.add(mesh('duvet', duvet, M.linenWhite));
  g.add(mesh('turn_back', rbox(w + 0.14, 0.05, 0.22, 0.025, 0, baseH + 0.06 + 0.29, -l * 0.25), M.linenWhite));
  g.add(mesh('throw_at_foot', rbox(w + 0.2, 0.03, 0.42, 0.015, 0, baseH + 0.06 + 0.32, l * 0.34), M.accent));
  const py = baseH + 0.06 + 0.34;
  for (const sx of [-1, 1]) {
    g.add(mesh('pillow', rbox(0.66, 0.13, 0.42, 0.065, (sx * w) / 4, py, -l / 2 + 0.26), M.linenWhite));
    g.add(mesh('cushion', rbox(0.45, 0.42, 0.13, 0.065, (sx * w) / 6.5, py + 0.16, -l / 2 + 0.44), M.fabric));
  }
  return tagged(g, w > 1.6 ? 'king_bed' : w > 1.45 ? 'queen_bed' : 'double_bed', 'furniture', 'linen upholstered base and headboard, cotton bedding', { size: `${Math.round(w * 1000)} × ${Math.round(l * 1000)} mm` });
}

export function bedside(M: InteriorMats) {
  const g = grp('bedside_table');
  g.add(mesh('bedside_top', box(0.45, 0.03, 0.38, 0, 0.5, 0, 0.9), M.walnut));
  g.add(mesh('bedside_drawer', box(0.43, 0.16, 0.36, 0, 0.4, 0, 0.9), M.walnut));
  g.add(mesh('bedside_legs', mergeGeometries([-1, 1].flatMap((sx) => [-1, 1].map((sz) => box(0.025, 0.32, 0.025, sx * 0.2, 0.16, sz * 0.16, 0.9, 'y')))), M.walnut));
  // the library's table lamp sits here when it is available
  const slot = new THREE.Group();
  slot.name = 'slot_table_lamp';
  slot.position.set(0.04, 0.515, -0.04);
  g.add(slot);
  return tagged(g, 'bedside_table', 'furniture', 'walnut');
}

export function wardrobe(M: InteriorMats, w: number, h = 2.4, dpt = 0.6) {
  const g = grp('wardrobe');
  g.add(mesh('wardrobe_carcass', box(w, h, dpt, 0, h / 2, 0, 0.8), M.cabinet));
  const n = Math.max(2, Math.round(w / 0.6));
  const dw = w / n;
  const doors: THREE.BufferGeometry[] = [];
  const pulls: THREE.BufferGeometry[] = [];
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + dw * (i + 0.5);
    doors.push(box(dw - 0.004, h - 0.02, 0.02, x, h / 2, dpt / 2 + 0.01, 0.8, 'y'));
    pulls.push(box(0.012, 0.3, 0.02, x + (i % 2 ? -1 : 1) * (dw / 2 - 0.05), 1.05, dpt / 2 + 0.03, 0.3, 'y'));
  }
  g.add(mesh('wardrobe_doors', mergeGeometries(doors), M.cabinet), mesh('wardrobe_pulls', mergeGeometries(pulls), M.brass));
  return tagged(g, 'wardrobe', 'furniture', 'lacquered doors, brushed pulls', { size: `${Math.round(w * 1000)} × ${Math.round(dpt * 1000)} mm` });
}

export function sofa(M: InteriorMats, w = 2.2) {
  const g = grp('sofa');
  const d = 0.95;
  g.add(mesh('sofa_plinth', rbox(w, 0.18, d, 0.03, 0, 0.13, 0), M.fabric));
  g.add(mesh('sofa_back', rbox(w, 0.5, 0.22, 0.08, 0, 0.47, -d / 2 + 0.11), M.fabric));
  g.add(mesh('sofa_arms', mergeGeometries([-1, 1].map((s) => rbox(0.2, 0.42, d, 0.08, (s * (w - 0.2)) / 2, 0.36, 0))), M.fabric));
  const n = w > 2 ? 3 : 2;
  const sw = (w - 0.4) / n;
  for (let i = 0; i < n; i++) g.add(mesh('seat_cushion', rbox(sw - 0.01, 0.17, d - 0.25, 0.07, -w / 2 + 0.2 + sw * (i + 0.5), 0.3, 0.1), M.fabric));
  for (let i = 0; i < n; i++) g.add(mesh('back_cushion', rbox(sw - 0.02, 0.42, 0.18, 0.08, -w / 2 + 0.2 + sw * (i + 0.5), 0.58, -d / 2 + 0.3), M.fabric));
  g.add(mesh('scatter_cushions', mergeGeometries([rbox(0.45, 0.42, 0.13, 0.06, -w / 2 + 0.45, 0.62, -d / 2 + 0.44), rbox(0.45, 0.42, 0.13, 0.06, w / 2 - 0.45, 0.62, -d / 2 + 0.44)]), M.accent));
  g.add(mesh('sofa_feet', mergeGeometries([-1, 1].flatMap((sx) => [-1, 1].map((sz) => cyl(0.02, 0.015, 0.05, (sx * (w - 0.1)) / 2, 0.025, (sz * (d - 0.1)) / 2)))), M.walnut));
  return tagged(g, 'sofa', 'furniture', 'linen upholstery, walnut feet', { size: `${Math.round(w * 1000)} × ${Math.round(d * 1000)} mm` });
}

export function armchair(M: InteriorMats) {
  const g = grp('armchair');
  g.add(mesh('chair_seat', rbox(0.78, 0.2, 0.75, 0.08, 0, 0.36, 0.03), M.accent));
  g.add(mesh('chair_back', rbox(0.78, 0.5, 0.16, 0.08, 0, 0.62, -0.31), M.accent));
  g.add(mesh('chair_arms', mergeGeometries([-1, 1].map((s) => rbox(0.12, 0.25, 0.7, 0.05, s * 0.36, 0.5, 0))), M.accent));
  g.add(mesh('chair_frame', mergeGeometries([-1, 1].flatMap((sx) => [-1, 1].map((sz) => cyl(0.018, 0.014, 0.27, sx * 0.33, 0.135, sz * 0.3)))), M.walnut));
  return tagged(g, 'armchair', 'furniture', 'bouclé-style upholstery, walnut legs');
}

export function coffeeTable(M: InteriorMats) {
  const g = grp('coffee_table');
  const top = new THREE.CylinderGeometry(0.45, 0.45, 0.035, 48);
  top.translate(0, 0.38, 0);
  g.add(mesh('table_top', boxUV(top, 0.6, 'x'), M.bench));
  g.add(mesh('table_base', cyl(0.18, 0.22, 0.36, 0, 0.18, 0, 32), M.oak));
  return tagged(g, 'coffee_table', 'furniture', 'stone top, oak drum base');
}

export function diningTable(M: InteriorMats, l = 1.8, w = 0.9) {
  const g = grp('dining_table');
  g.add(mesh('table_top', rbox(l, 0.035, w, 0.012, 0, 0.74, 0, 0.9), M.oak));
  g.add(mesh('table_frame', mergeGeometries([box(l - 0.2, 0.08, 0.02, 0, 0.68, w / 2 - 0.08, 0.9), box(l - 0.2, 0.08, 0.02, 0, 0.68, -w / 2 + 0.08, 0.9)]), M.oak));
  g.add(mesh('table_legs', mergeGeometries([-1, 1].flatMap((sx) => [-1, 1].map((sz) => box(0.055, 0.72, 0.055, sx * (l / 2 - 0.12), 0.36, sz * (w / 2 - 0.1), 0.9, 'y')))), M.oak));
  return tagged(g, 'dining_table', 'furniture', 'solid oak', { size: `${Math.round(l * 1000)} × ${Math.round(w * 1000)} mm` });
}

export function diningChair(M: InteriorMats) {
  const g = grp('dining_chair');
  g.add(mesh('seat', rbox(0.46, 0.05, 0.45, 0.02, 0, 0.45, 0), M.fabric));
  g.add(mesh('back', rbox(0.44, 0.32, 0.03, 0.012, 0, 0.66, -0.21), M.oak));
  g.add(mesh('legs', mergeGeometries([-1, 1].flatMap((sx) => [-1, 1].map((sz) => box(0.03, sz < 0 ? 0.82 : 0.44, 0.03, sx * 0.2, (sz < 0 ? 0.82 : 0.44) / 2, sz * 0.19, 0.9, 'y')))), M.oak));
  return tagged(g, 'dining_chair', 'furniture', 'oak frame, linen seat');
}

export function desk(M: InteriorMats, l = 1.4) {
  const g = grp('desk');
  g.add(mesh('desk_top', box(l, 0.03, 0.65, 0, 0.73, 0, 0.9), M.oak));
  g.add(mesh('desk_legs', mergeGeometries([-1, 1].map((s) => box(0.03, 0.72, 0.6, (s * (l - 0.05)) / 2, 0.36, 0, 0.9, 'y'))), M.oak));
  const lamp = grp('desk_lamp');
  lamp.add(mesh('lamp_base', cyl(0.06, 0.07, 0.02, l / 2 - 0.2, 0.755, -0.15), M.brass), mesh('lamp_arm', cyl(0.008, 0.008, 0.4, l / 2 - 0.2, 0.96, -0.15, 8), M.brass));
  const shade = new THREE.ConeGeometry(0.08, 0.1, 24, 1, true);
  shade.translate(l / 2 - 0.2, 1.17, -0.1);
  lamp.add(mesh('lamp_shade', shade, M.brass));
  g.add(lamp);
  return tagged(g, 'desk', 'furniture', 'oak, brass lamp');
}

/** a straight kitchen run: base cabinets with drawers, benchtop, splashback, uppers, oven, cooktop, rangehood, sink */
export function kitchenRun(M: InteriorMats, len: number, opts: { sinkAt?: number; windowFrom?: number; windowTo?: number; fridge?: boolean } = {}) {
  const g = grp('kitchen_joinery');
  const D = 0.6;
  const H = 0.87;
  const fridgeW = opts.fridge ? 0.7 : 0;
  const runL = len - fridgeW;
  const x0 = -len / 2;
  g.add(mesh('kick', box(runL, 0.1, D - 0.06, x0 + runL / 2, 0.05, -0.03, 0.8), M.appliance));
  g.add(mesh('base_carcass', box(runL, H - 0.1, D - 0.02, x0 + runL / 2, 0.1 + (H - 0.1) / 2, -0.01, 0.8), M.cabinet));
  const fronts: THREE.BufferGeometry[] = [];
  const pulls: THREE.BufferGeometry[] = [];
  const n = Math.max(2, Math.round(runL / 0.6));
  const fw = runL / n;
  const cookI = Math.max(0, Math.min(n - 1, Math.round(n * 0.3)));
  for (let i = 0; i < n; i++) {
    const x = x0 + fw * (i + 0.5);
    if (i === cookI) continue;
    for (const [y, h] of [
      [0.12, 0.22],
      [0.36, 0.22],
      [0.6, 0.24],
    ]) {
      fronts.push(box(fw - 0.004, h - 0.004, 0.019, x, y + h / 2, D / 2 - 0.0095, 0.8));
      pulls.push(box(fw * 0.5, 0.012, 0.018, x, y + h - 0.04, D / 2 + 0.008, 0.3));
    }
  }
  g.add(mesh('drawer_fronts', mergeGeometries(fronts), M.cabinet), mesh('drawer_pulls', mergeGeometries(pulls), M.brass));
  // oven under the cooktop
  const ox = x0 + fw * (cookI + 0.5);
  g.add(mesh('oven', box(fw - 0.01, 0.6, 0.02, ox, 0.14 + 0.3, D / 2 - 0.01, 0.4), M.blackGlass));
  g.add(mesh('oven_handle', box(fw * 0.7, 0.018, 0.03, ox, 0.69, D / 2 + 0.02, 0.3), M.steel));
  // benchtop with a sink cut-out approximated by an inset bowl
  g.add(mesh('benchtop', box(runL + 0.02, 0.04, D + 0.02, x0 + runL / 2, H + 0.02, 0, 0.8), M.bench));
  g.add(mesh('cooktop', box(0.58, 0.006, 0.5, ox, H + 0.043, 0, 0.4), M.blackGlass));
  const sx = opts.sinkAt != null ? Math.min(x0 + runL - 0.45, Math.max(x0 + 0.45, opts.sinkAt)) : x0 + runL - 0.6;
  g.add(mesh('sink', box(0.55, 0.012, 0.42, sx, H + 0.042, 0.02, 0.4), M.steel));
  const tap = grp('tap');
  const neck = new THREE.TorusGeometry(0.11, 0.012, 10, 24, Math.PI);
  neck.rotateY(Math.PI / 2);
  neck.translate(sx, H + 0.33, -0.14);
  tap.add(mesh('tap_body', cyl(0.018, 0.022, 0.3, sx, H + 0.19, -0.25, 16), M.chrome), mesh('tap_spout', neck, M.chrome));
  g.add(tap);
  // splashback and uppers (not across a window)
  const sb: THREE.BufferGeometry[] = [];
  const up: THREE.BufferGeometry[] = [];
  const step = 0.3;
  for (let x = x0; x < x0 + runL - 1e-3; x += step) {
    const xm = x + step / 2;
    const inWin = opts.windowFrom != null && opts.windowTo != null && xm > opts.windowFrom - 0.05 && xm < opts.windowTo + 0.05;
    if (!inWin) {
      sb.push(box(step, 0.6, 0.012, xm, H + 0.04 + 0.3, -D / 2 + 0.006, 0.6, 'x'));
      up.push(box(step, 0.72, 0.35, xm, 1.5 + 0.36, -D / 2 + 0.175, 0.8));
    } else sb.push(box(step, 0.12, 0.012, xm, H + 0.04 + 0.06, -D / 2 + 0.006, 0.6, 'x'));
  }
  if (sb.length) g.add(mesh('splashback', mergeGeometries(sb), M.tile));
  if (up.length) g.add(mesh('upper_cabinets', mergeGeometries(up), M.cabinet));
  g.add(mesh('rangehood', box(0.6, 0.06, 0.38, ox, 1.45, -D / 2 + 0.19, 0.4), M.steel));
  if (opts.fridge) {
    const fx = x0 + runL + fridgeW / 2;
    g.add(mesh('fridge', rbox(fridgeW - 0.02, 1.8, 0.66, 0.02, fx, 0.9, 0.02), M.steel));
    g.add(mesh('fridge_handles', mergeGeometries([box(0.02, 0.5, 0.03, fx - fridgeW / 2 + 0.08, 1.2, 0.37, 0.3, 'y'), box(0.02, 0.5, 0.03, fx - fridgeW / 2 + 0.08, 0.55, 0.37, 0.3, 'y')]), M.chrome));
  }
  return tagged(g, 'kitchen_joinery', 'fitout', 'lacquered cabinetry, stone benchtop, tiled splashback, induction cooktop, oven, rangehood', { length: `${Math.round(len * 1000)} mm` });
}

export function vanity(M: InteriorMats, w = 0.75) {
  const g = grp('vanity');
  g.add(mesh('vanity_cabinet', box(w, 0.45, 0.45, 0, 0.62, 0, 0.8), M.walnut));
  g.add(mesh('vanity_top', box(w + 0.01, 0.02, 0.46, 0, 0.855, 0, 0.6), M.bench));
  const basin = new THREE.CylinderGeometry(0.2, 0.17, 0.12, 40);
  basin.translate(0, 0.925, 0.02);
  g.add(mesh('basin', basin, M.ceramic), mesh('basin_mixer', cyl(0.015, 0.018, 0.2, 0, 0.97, -0.16, 12), M.chrome));
  g.add(mesh('mirror', box(w - 0.05, 0.75, 0.01, 0, 1.55, -0.22, 0.4, 'y'), M.chrome));
  return tagged(g, 'vanity', 'fitout', 'wall-hung timber vanity, ceramic basin, mirror');
}

export function toilet(M: InteriorMats) {
  const g = grp('toilet');
  const pan = new THREE.CylinderGeometry(0.18, 0.15, 0.4, 32);
  pan.scale(1, 1, 1.3);
  pan.translate(0, 0.2, 0.06);
  g.add(mesh('pan', pan, M.ceramic), mesh('cistern', rbox(0.38, 0.38, 0.16, 0.03, 0, 0.6, -0.2), M.ceramic), mesh('seat', rbox(0.36, 0.025, 0.44, 0.012, 0, 0.415, 0.07), M.ceramic));
  return tagged(g, 'toilet', 'fitout', 'vitreous china');
}

export function shower(M: InteriorMats, w = 0.9, d = 0.9) {
  const g = grp('shower');
  g.add(mesh('shower_tray', box(w, 0.04, d, 0, 0.02, 0, 0.6), M.wallTile));
  g.add(mesh('shower_wall_tiles', mergeGeometries([box(w, 2.1, 0.012, 0, 1.05, -d / 2 + 0.006, 1.2, 'x'), box(0.012, 2.1, d, -w / 2 + 0.006, 1.05, 0, 1.2, 'z')]), M.wallTile));
  const glass = new THREE.PlaneGeometry(w - 0.02, 2.0);
  glass.translate(0, 1.04, d / 2);
  const glass2 = new THREE.PlaneGeometry(d - 0.02, 2.0);
  glass2.rotateY(Math.PI / 2);
  glass2.translate(w / 2, 1.04, 0);
  g.add(mesh('glass_screen', mergeGeometries([glass, glass2]), M.glass));
  g.add(mesh('shower_rose', mergeGeometries([cyl(0.12, 0.12, 0.01, 0, 2.05, -d / 2 + 0.25, 32), box(0.015, 0.015, 0.25, 0, 2.06, -d / 2 + 0.12, 0.3, 'z')]), M.chrome));
  return tagged(g, 'shower', 'fitout', 'tiled walls, frameless glass, rainfall rose');
}

export function laundryTub(M: InteriorMats) {
  const g = grp('laundry_tub');
  g.add(mesh('tub_cabinet', box(0.6, 0.85, 0.5, 0, 0.425, 0, 0.8), M.cabinet), mesh('tub', box(0.56, 0.06, 0.46, 0, 0.88, 0, 0.4), M.steel));
  return tagged(g, 'laundry_tub', 'fitout', 'steel tub on cabinet');
}

export function floorLamp(M: InteriorMats) {
  const g = grp('floor_lamp');
  g.add(mesh('lamp_base', cyl(0.14, 0.16, 0.03, 0, 0.015, 0, 32), M.brass), mesh('lamp_stem', cyl(0.012, 0.012, 1.45, 0, 0.75, 0, 10), M.brass));
  const shade = new THREE.CylinderGeometry(0.2, 0.24, 0.28, 32, 1, true);
  shade.translate(0, 1.55, 0);
  g.add(mesh('lamp_shade', shade, M.lampGlow));
  return tagged(g, 'floor_lamp', 'furniture', 'brass, linen shade');
}

export function art(M: InteriorMats, w = 0.9, h = 0.65, seed = 1) {
  const g = grp('framed_print');
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 192;
  const x = c.getContext('2d')!;
  x.fillStyle = '#efe9e0';
  x.fillRect(0, 0, 256, 192);
  const cols = ['#21121F', '#D9BACB', '#756771', '#B9A27F', '#4C6A4F'];
  for (let i = 0; i < 4; i++) {
    x.fillStyle = cols[(i + seed) % cols.length];
    x.beginPath();
    x.arc(60 + ((i * 53 + seed * 37) % 150), 50 + ((i * 41 + seed * 19) % 100), 26 + ((i * 13) % 30), 0, Math.PI * 2);
    x.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const pm = new THREE.MeshStandardMaterial({ map: t, roughness: 0.8, name: 'print_paper' });
  g.add(mesh('frame', box(w, h, 0.03, 0, 0, 0, 0.5), M.walnut));
  const pl = new THREE.PlaneGeometry(w - 0.08, h - 0.08);
  pl.translate(0, 0, 0.016);
  g.add(mesh('print', pl, pm));
  return tagged(g, 'framed_print', 'styling', 'walnut frame, abstract print (assembl palette)');
}
