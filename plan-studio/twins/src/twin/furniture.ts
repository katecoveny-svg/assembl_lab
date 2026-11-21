import * as THREE from 'three/webgpu';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { boxUV, detail, type Quality } from '../objects/util';
import { bake, fbm, hex, linen, metal, mix, paint, pbr, wood, woolPile, type PBRSet } from '../objects/tex';
import { complete, pick, PRESETS, type Schedule } from './finishes';

// Interior pieces for the fit-out step, at real sizes, in local axes: origin on the floor at the
// footprint centre, front facing +z, y up. Each returns a named group tagged kind 'furniture'
// (or a fixture class) with its material, so the inspector can say what it is. Designs are
// generic and assembl's own; sizes follow common NZ product dimensions.

export interface Finishes {
  name: string;
  /** exterior cladding override: undefined keeps each wall's own */
  cladding?: 'cedar' | 'blackstain' | 'metal' | 'white';
  joinery: number;
  joineryTimber?: boolean;
  roof: number;
  decking: [number, number];
  floor: 'oak' | 'concrete' | 'tile' | 'terrazzo';
  floorTone: [number, number];
  walls: number;
  bench: 'stone' | 'terrazzo' | 'marble';
  splash: { colour: number; grout: number; n: number; gloss: number } | 'match';
  cabinetry: number;
  bathTile: [number, number];
  fabric: number;
  accent: number;
  metalTrim: number;
  /** the schedule these came from, for the spec and the URL */
  schedule: Schedule;
}

/** render parameters from a finishes schedule */
export function toFinishes(s: Schedule, name = 'Custom schedule'): Finishes {
  const P = (k: string) => pick(s, k).p;
  const sp = P('splashback');
  const fl = P('floor');
  return {
    name,
    cladding: P('cladding').kind as Finishes['cladding'],
    joinery: P('joinery').colour as number,
    joineryTimber: s.joinery === 'timber',
    roof: P('roof').colour as number,
    decking: [P('decking').light as number, P('decking').dark as number],
    floor: fl.kind as Finishes['floor'],
    floorTone: [(fl.light as number) ?? 0xcfae80, (fl.dark as number) ?? 0x9b7650],
    walls: P('walls').colour as number,
    bench: P('bench').kind as Finishes['bench'],
    splash: sp.match ? 'match' : { colour: sp.colour as number, grout: sp.grout as number, n: sp.n as number, gloss: sp.gloss as number },
    cabinetry: P('cabinetry').colour as number,
    bathTile: [P('bathTile').colour as number, P('bathTile').grout as number],
    fabric: P('fabric').fabric as number,
    accent: P('fabric').accent as number,
    metalTrim: P('metal').colour as number,
    schedule: s,
  };
}

export const PALETTES: Record<string, Finishes> = Object.fromEntries(Object.entries(PRESETS).map(([k, v]) => [k, toFinishes(complete(v.s), v.name)]));

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
    0.45,
    (u, v) => {
      const cell = Math.max(fbm(u, v, 70, 70, 1, seed), fbm(u + 0.37, v + 0.11, 110, 110, 1, seed + 3) * 0.97);
      const chip = cell > 0.72 ? 1 : 0;
      const tint = fbm(u, v, 70, 70, 1, seed + 9);
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
  const rows = 12;
  return bake(
    size,
    rows * 0.18,
    (u, v) => {
      const r = Math.floor(v * rows);
      const off = ((r * 0.37) % 1 + 1) % 1;
      const along = (u + off) % 1;
      const segL = 0.5;
      const seg = Math.floor(along / segL);
      const fv = v * rows - r;
      const fu = (along % segL) / segL;
      const seam = fv < 0.018 || fu < 0.003;
      // each board its own tone, as real engineered oak is laid from mixed boards
      const tone = fbm(r * 0.37 + seg * 0.11, r * 0.53, 1, 1, 1, o.seed + 77) - 0.5;
      const g = fbm(u, v, 12, 96, 4, o.seed + r * 7 + seg * 13);
      const t = Math.min(1, Math.max(0, 0.45 + 0.6 * (g - 0.5) + 0.25 * (fbm(u, v, 2, 6, 2, o.seed + r) - 0.5)));
      const k = (seam ? 0.6 : 1) * (1 + tone * 0.18);
      return { c: [mix(L[0], D[0], t) * k, mix(L[1], D[1], t) * k, mix(L[2], D[2], t) * k], h: seam ? 0 : 0.7 + g * 0.08, r: seam ? 0.8 : 0.48 + 0.12 * g, m: 0, o: seam ? 0.7 : 1 };
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
/** interior wall paint on plasterboard: flat, faintly mottled, low sheen (no brush streaks) */
function plasterPaint(size: number, colour: number, seed: number) {
  const C = hex(colour);
  return bake(
    size,
    2.4,
    (u, v) => {
      const n = fbm(u, v, 5, 5, 4, seed);
      const f = fbm(u, v, 96, 96, 2, seed + 3);
      const k = 0.982 + 0.024 * n + 0.01 * (f - 0.5);
      return { c: [C[0] * k, C[1] * k, C[2] * k], h: 0.5 + 0.2 * f, r: 0.84 + 0.08 * n, m: 0 };
    },
    0.08,
    'plaster_paint',
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
  /** walls and ceilings inside: matte paint in the palette's wall colour */
  wallPaint: THREE.MeshPhysicalMaterial;
  /** skirtings and trims: the wall colour in semi-gloss */
  trim: THREE.MeshPhysicalMaterial;
  /** glazed planter pots */
  pot: THREE.MeshPhysicalMaterial;
  soil: THREE.MeshStandardMaterial;
}

const cache = new Map<string, InteriorMats>();
export function interiorMats(q: Quality, f: Finishes): InteriorMats {
  const key = `${q}/${JSON.stringify({ ...f, schedule: undefined, name: undefined })}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const d = q === 'hq' ? detail('hq') : { ...detail('web'), tex: 1024, texS: 512 };
  const sets: Record<string, PBRSet> = {
    fabric: linen(d.texS, { colour: f.fabric, threads: 90, tile: 0.1, name: 'upholstery_linen' }),
    linenWhite: linen(d.texS, { colour: 0xeeeae2, threads: 110, tile: 0.08, name: 'bed_linen' }),
    wool: woolPile(d.texS, { a: 0xd9d0c0, b: 0x9a8b78, tile: 0.4, name: 'wool' }),
    oak: wood(d.texS, { light: 0xd4b78e, dark: 0xb39468, rings: 10, gloss: 0.3, tile: 0.9, seed: 141, straight: 0.9, figure: 0.03, relief: 0.6, name: 'oak' }),
    walnut: wood(d.texS, { light: 0x7a553a, dark: 0x4a3122, rings: 14, gloss: 0.4, tile: 0.9, seed: 142, name: 'walnut' }),
    floor:
      f.floor === 'oak'
        ? planks(d.tex, { light: f.floorTone[0], dark: f.floorTone[1], seed: 151, name: 'oak_plank_floor' })
        : f.floor === 'tile'
          ? tiles(d.tex, { colour: 0xd8d2c8, grout: 0xa8a29a, n: 2, tile: 1.2, name: 'floor_tile' })
          : f.floor === 'terrazzo'
            ? terrazzo(d.tex, 159)
            : marble(d.tex, { base: 0xa6a29a, vein: 0x8f8a82, seed: 152, name: 'polished_concrete' }),
    bench: f.bench === 'marble' ? marble(d.tex, { base: 0xf1eee9, vein: 0x8f8c88, seed: 153, name: 'marble' }) : f.bench === 'terrazzo' ? terrazzo(d.tex, 154) : marble(d.tex, { base: 0xe8e4dc, vein: 0xd6d0c4, seed: 155, name: 'engineered_stone' }),
    cabinet: paint(d.texS, { colour: f.cabinetry, gloss: 0.35, tile: 0.8, seed: 156, name: 'cabinet_lacquer' }),
    tile: f.splash === 'match' ? (null as unknown as PBRSet) : tiles(d.texS, { colour: f.splash.colour, grout: f.splash.grout, n: f.splash.n, tile: 0.6, name: 'splashback_tile_150', gloss: f.splash.gloss }),
    wallTile: tiles(d.texS, { colour: f.bathTile[0], grout: f.bathTile[1], n: 2, tile: 1.2, name: 'bath_tile_600' }),
    steel: metal(d.texS, { tint: 0xb8b8b4, rough: 0.36, brush: 0.12, tile: 0.25, seed: 157, name: 'brushed_steel' }),
    wallPaint: plasterPaint(d.texS, f.walls, 158),
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
    floor: pbr(sets.floor, 'floor_finish', { clearcoat: f.floor === 'oak' ? 0.2 : 0.5, clearcoatRoughness: 0.35 }),
    bench: pbr(sets.bench, 'benchtop', { clearcoat: 0.4, clearcoatRoughness: 0.15 }),
    cabinet: pbr(sets.cabinet, 'cabinet_lacquer'),
    tile: f.splash === 'match' ? pbr(sets.bench, 'splashback_slab', { clearcoat: 0.4, clearcoatRoughness: 0.15 }) : pbr(sets.tile, 'splashback_tile'),
    wallTile: pbr(sets.wallTile, 'bathroom_tile'),
    steel: pbr(sets.steel, 'brushed_steel', { metalness: 0.62 }),
    chrome: ph({ name: 'chrome', color: 0xdddddd, metalness: 1, roughness: 0.08 }),
    brass: ph({ name: 'brushed_brass', color: f.metalTrim, metalness: 1, roughness: 0.3 }),
    ceramic: ph({ name: 'vitreous_china', color: 0xf7f7f4, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05 }),
    blackGlass: ph({ name: 'black_glass', color: 0x0d0d0f, roughness: 0.05, metalness: 0, clearcoat: 1 }),
    glass: ph({ name: 'shower_glass', color: 0xffffff, roughness: 0.02, transmission: 1, thickness: 0.01, ior: 1.5, transparent: true, side: THREE.DoubleSide }),
    appliance: ph({ name: 'appliance_enamel', color: 0x2a2a2c, roughness: 0.3, metalness: 0.2, clearcoat: 0.6 }),
    lampGlow: new THREE.MeshStandardMaterial({ name: 'lamp_glow', color: 0xfff1d6, emissive: new THREE.Color(0xffd9a0), emissiveIntensity: 0, roughness: 0.4 }),
    accent: ph({ name: 'accent_fabric', color: f.accent, roughness: 0.85, sheen: 0.5, sheenColor: new THREE.Color(0xfff0e0) }),
    wallPaint: pbr(sets.wallPaint, 'interior_wall_paint'),
    trim: ph({ name: 'skirting_semigloss', color: f.walls, roughness: 0.35, clearcoat: 0.3, clearcoatRoughness: 0.4 }),
    pot: ph({ name: 'glazed_planter', color: 0xd8d2c6, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.2 }),
    soil: new THREE.MeshStandardMaterial({ name: 'potting_mix', color: 0x2e241c, roughness: 1 }),
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

let displayMat: THREE.MeshStandardMaterial | null = null, markMat: THREE.MeshStandardMaterial | null = null, applianceGlass: THREE.MeshPhysicalMaterial | null = null;
/** a slim bar pull on two posts: `len` long, lying along x (or standing, when `upright`), its back at z */
function barPull(x: number, y: number, z: number, len: number, upright = false) {
  const out: THREE.BufferGeometry[] = [];
  out.push(upright ? box(0.009, len, 0.009, x, y, z + 0.026, 0.3, 'y') : box(len, 0.009, 0.009, x, y, z + 0.026, 0.3, 'x'));
  for (const s of [-1, 1]) out.push(upright ? box(0.007, 0.007, 0.024, x, y + s * (len / 2 - 0.014), z + 0.012, 0.3, 'z') : box(0.007, 0.007, 0.024, x + s * (len / 2 - 0.014), y, z + 0.012, 0.3, 'z'));
  return out;
}

/**
 * A straight kitchen run, every piece standing on the floor or fixed to the wall: base cabinets with drawer
 * fronts and shadow gaps, a stone bench with an undermounted steel sink, an oven with a glass door, handle and
 * control strip under an induction cooktop, a fridge-freezer in a tall housing, and wall cabinets only where
 * they join the tall housing or carry the rangehood. With a metre of solid wall the cooktop goes there and the
 * hood is built into the wall cabinets over it; under a window it has a downdraught extractor in the bench.
 */
export function kitchenRun(M: InteriorMats, len: number, opts: { sinkAt?: number; windowFrom?: number; windowTo?: number; fridge?: boolean } = {}) {
  const g = grp('kitchen_joinery');
  const D = 0.6, H = 0.87, benchY = H + 0.04, zf = D / 2, zb = -D / 2;
  const fridgeW = opts.fridge ? 0.7 : 0;
  const runL = len - fridgeW, x0 = -len / 2, x1 = x0 + runL;
  const hasWin = opts.windowFrom != null && opts.windowTo != null;
  const wf = hasWin ? Math.max(x0, (opts.windowFrom as number) - 0.05) : x1, wt = hasWin ? Math.min(x1, (opts.windowTo as number) + 0.05) : x1;
  const solid: [number, number][] = hasWin ? ([[x0, wf], [wt, x1]] as [number, number][]).filter(([a, b]) => b - a > 0.05) : [[x0, x1]];
  const sinkW = 0.8;
  const sx = Math.min(x1 - sinkW / 2 - 0.02, Math.max(x0 + sinkW / 2 + 0.02, opts.sinkAt ?? x1 - 0.7));
  // where the cooktop goes
  let cx: number | null = null, hood = false;
  for (const [a, b] of [...solid].sort((p, q) => q[1] - q[0] - (p[1] - p[0]))) {
    if (b - a < 0.9) continue;
    const lo = a + 0.45, hi = b - 0.45, mid = (a + b) / 2;
    const ok = (c: number) => c >= lo - 1e-6 && c <= hi + 1e-6 && Math.abs(c - sx) >= 1.0;
    const c = [mid, sx - 1.0, sx + 1.0].filter(ok).sort((p, q) => Math.abs(p - mid) - Math.abs(q - mid))[0];
    if (c != null) { cx = c; hood = true; break; }
  }
  if (cx == null) cx = sx - 0.95 - 0.3 >= x0 ? sx - 0.95 : sx + 0.95 + 0.3 <= x1 ? sx + 0.95 : null;
  const zc = hood ? 0 : 0.03;

  // black appliance glass that stays black in a bright room (the shared black glass mirrors the sky)
  const glassM = (applianceGlass ??= new THREE.MeshPhysicalMaterial({ name: 'appliance_black_ceramic', color: 0x09090a, roughness: 0.16, metalness: 0, clearcoat: 0.5, clearcoatRoughness: 0.1, envMapIntensity: 0.3 }));
  // carcass: kick, boxes (left open where the sink bowl hangs), end panels, and a dark backing so the gaps between fronts read as shadow
  g.add(mesh('kick', box(runL - 0.04, 0.1, D - 0.08, x0 + runL / 2, 0.05, -0.03, 0.8), M.appliance));
  const car: THREE.BufferGeometry[] = [];
  const carBox = (a: number, b: number, y1: number, z0: number, z1: number) => { if (b - a > 0.01) car.push(box(b - a, y1 - 0.1, z1 - z0, (a + b) / 2, 0.1 + (y1 - 0.1) / 2, (z0 + z1) / 2, 0.8)); };
  carBox(x0, sx - 0.26, H, zb, 0.26); carBox(sx + 0.26, x1, H, zb, 0.26); carBox(sx - 0.26, sx + 0.26, 0.72, zb, 0.26); carBox(sx - 0.26, sx + 0.26, H, 0.215, 0.26); carBox(sx - 0.26, sx + 0.26, H, zb, -0.175);
  for (const x of [x0 + 0.009, x1 - 0.009]) car.push(box(0.018, H - 0.1, 0.022, x, 0.1 + (H - 0.1) / 2, 0.271, 0.8));
  g.add(mesh('base_carcass', mergeGeometries(car), M.cabinet));
  g.add(mesh('shadow_gaps', box(runL - 0.04, H - 0.115, 0.02, x0 + runL / 2, 0.1 + (H - 0.1) / 2, 0.2695, 0.8), M.appliance));

  // modules along the run: the oven, the sink cupboard, and drawers in between
  const fronts: THREE.BufferGeometry[] = [], pulls: THREE.BufferGeometry[] = [];
  const front = (a: number, b: number, y0: number, y1: number) => fronts.push(rbox(b - a - 0.004, y1 - y0, 0.019, 0.002, (a + b) / 2, (y0 + y1) / 2, zf - 0.0095, 0.8));
  const drawers = (a: number, b: number) => { for (const [y0, y1] of [[0.112, 0.42], [0.424, 0.7], [0.704, 0.866]]) { front(a, b, y0, y1); pulls.push(...barPull((a + b) / 2, y1 - 0.05, zf, Math.min(0.2, (b - a) * 0.45))); } };
  const fixed: [number, number, string][] = [[sx - sinkW / 2, sx + sinkW / 2, 'sink']];
  if (cx != null) fixed.push([cx - 0.3, cx + 0.3, 'oven']);
  fixed.sort((p, q) => p[0] - q[0]);
  let at = x0;
  for (const [a, b, kind] of [...fixed, [x1, x1, 'end'] as [number, number, string]]) {
    const gap = a - at;
    if (gap > 0.05) {
      const n = Math.max(1, Math.round(gap / 0.6)), w = gap / n;
      for (let i = 0; i < n; i++) {
        const p = at + i * w, q = p + w;
        if (w >= 0.34) drawers(p, q);
        else { front(p, q, 0.112, 0.866); pulls.push(...barPull((p + q) / 2, 0.76, zf, 0.16, true)); }
      }
    }
    if (kind === 'sink') {
      front(a, sx, 0.112, 0.866); front(sx, b, 0.112, 0.866);
      for (const s of [-1, 1]) pulls.push(...barPull(sx + s * 0.045, 0.75, zf, 0.16, true));
    } else if (kind === 'oven') {
      front(a, b, 0.112, 0.246); pulls.push(...barPull(cx as number, 0.2, zf, 0.2));
    }
    at = Math.max(at, b);
  }
  g.add(mesh('cabinet_fronts', mergeGeometries(fronts), M.cabinet), mesh('cabinet_pulls', mergeGeometries(pulls), M.brass));

  // bench: stone round the sink opening, with an upstand at the wall
  const benchTo = x1 + (opts.fridge ? 0 : 0.01);
  g.add(mesh('benchtop', mergeGeometries([
    box(sx - 0.25 - (x0 - 0.01), 0.04, D + 0.02, (sx - 0.25 + x0 - 0.01) / 2, H + 0.02, 0.01, 0.8),
    box(benchTo - (sx + 0.25), 0.04, D + 0.02, (benchTo + sx + 0.25) / 2, H + 0.02, 0.01, 0.8),
    box(0.5, 0.04, 0.11, sx, H + 0.02, 0.265, 0.8),
    box(0.5, 0.04, 0.13, sx, H + 0.02, -0.235, 0.8),
    box(runL, 0.09, 0.012, x0 + runL / 2, benchY + 0.045, zb + 0.006, 0.8),
  ]), M.bench));
  // undermounted sink: a steel bowl hanging in the opening, with its waste
  const by = benchY - 0.18;
  g.add(mesh('sink', mergeGeometries([
    box(0.5, 0.004, 0.38, sx, by, 0.02, 0.25), box(0.004, 0.14, 0.38, sx - 0.248, by + 0.07, 0.02, 0.25, 'z'), box(0.004, 0.14, 0.38, sx + 0.248, by + 0.07, 0.02, 0.25, 'z'),
    box(0.5, 0.14, 0.004, sx, by + 0.07, 0.208, 0.25), box(0.5, 0.14, 0.004, sx, by + 0.07, -0.168, 0.25),
  ]), M.steel));
  g.add(mesh('sink_waste', cyl(0.042, 0.042, 0.004, sx, by + 0.004, 0.02, 28), M.chrome));
  const tap = grp('tap');
  const neck = new THREE.TorusGeometry(0.11, 0.012, 10, 24, Math.PI);
  neck.rotateY(Math.PI / 2);
  neck.translate(0, 0.29, 0.11);
  tap.add(mesh('tap_body', cyl(0.018, 0.022, 0.3, 0, 0.15, 0, 16), M.chrome), mesh('tap_spout', neck, M.chrome));
  tap.userData.fallback = true;
  const tapSlot = grp('slot_tap');
  tapSlot.position.set(sx, benchY, -0.235);
  tapSlot.add(tap);
  g.add(tapSlot);

  if (cx != null) {
    // oven: brushed fascia, glass control strip with two knobs and a clock, glass door, bar handle on two posts
    g.add(mesh('oven_fascia', box(0.596, 0.612, 0.02, cx, 0.558, zf - 0.01, 0.25), M.steel));
    g.add(mesh('oven_glass', mergeGeometries([box(0.572, 0.084, 0.005, cx, 0.812, zf + 0.0025, 0.4), box(0.572, 0.49, 0.006, cx, 0.51, zf + 0.003, 0.4)]), glassM));
    g.add(mesh('oven_door_window', box(0.44, 0.3, 0.002, cx, 0.49, zf + 0.0065, 0.4), new THREE.MeshPhysicalMaterial({ name: 'oven_window', color: 0x030304, roughness: 0.08, clearcoat: 0.6, envMapIntensity: 0.25 })));
    const hw: THREE.BufferGeometry[] = [];
    const bar = new THREE.CylinderGeometry(0.009, 0.009, 0.5, 14).rotateZ(Math.PI / 2).translate(cx, 0.722, zf + 0.046);
    hw.push(boxUV(bar, 0.25, 'x'));
    for (const s of [-1, 1]) { hw.push(boxUV(new THREE.CylinderGeometry(0.006, 0.006, 0.042, 10).rotateX(Math.PI / 2).translate(cx + s * 0.22, 0.722, zf + 0.025), 0.25, 'z')); hw.push(boxUV(new THREE.CylinderGeometry(0.017, 0.017, 0.02, 24).rotateX(Math.PI / 2).translate(cx + s * 0.2, 0.812, zf + 0.014), 0.25, 'x')); }
    g.add(mesh('oven_handle_and_knobs', mergeGeometries(hw), M.steel));
    displayMat ??= new THREE.MeshStandardMaterial({ name: 'appliance_display', color: 0x0c1216, emissive: 0x7cc3d2, emissiveIntensity: 0.5, roughness: 0.3 });
    g.add(mesh('oven_clock', box(0.07, 0.02, 0.001, cx, 0.812, zf + 0.0056, 0.4), displayMat));
    // induction cooktop: a glass plate set on the bench, four printed zones, touch controls at the front
    g.add(mesh('cooktop', rbox(0.59, 0.006, 0.52, 0.003, cx, benchY + 0.003, zc, 0.4), glassM));
    markMat ??= new THREE.MeshStandardMaterial({ name: 'cooktop_markings', color: 0x7d8185, roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const marks: THREE.BufferGeometry[] = [];
    for (const [dx, dz, r] of [[-0.145, -0.115, 0.092], [0.145, -0.115, 0.072], [-0.145, 0.085, 0.072], [0.145, 0.085, 0.092]]) marks.push(new THREE.RingGeometry(r - 0.003, r, 48).rotateX(-Math.PI / 2).translate(cx + dx, benchY + 0.0064, zc + dz));
    for (let i = -2; i <= 2; i++) marks.push(new THREE.PlaneGeometry(0.012, 0.012).rotateX(-Math.PI / 2).translate(cx + i * 0.034, benchY + 0.0064, zc + 0.225));
    g.add(mesh('cooktop_markings', mergeGeometries(marks), markMat));
    if (hood) {
      // rangehood built into the wall cabinets over the cooktop: a steel underside with filters and two lamps
      g.add(mesh('rangehood', box(0.598, 0.04, 0.33, cx, 1.43, zb + 0.175, 0.25), M.steel));
      g.add(mesh('rangehood_filters', mergeGeometries([box(0.25, 0.003, 0.22, cx - 0.14, 1.4085, zb + 0.16, 0.4), box(0.25, 0.003, 0.22, cx + 0.14, 1.4085, zb + 0.16, 0.4)]), M.appliance));
    } else {
      // no wall behind for a hood: a downdraught extractor, shut, set into the bench behind the cooktop
      g.add(mesh('downdraught_extractor', box(0.52, 0.004, 0.045, cx, benchY + 0.002, zc - 0.29, 0.25), M.steel));
      g.add(mesh('downdraught_slot', box(0.47, 0.0045, 0.014, cx, benchY + 0.002, zc - 0.29, 0.4), M.appliance));
    }
  }

  // wall cabinets: over the hood, beside the tall housing, or along a good length of solid wall; tiled beneath
  const ups: THREE.BufferGeometry[] = [], upFronts: THREE.BufferGeometry[] = [], upPulls: THREE.BufferGeometry[] = [], tile: THREE.BufferGeometry[] = [], upGaps: THREE.BufferGeometry[] = [];
  const UY0 = 1.45, UY1 = 2.2, UD = 0.35;
  for (const [a, b] of solid) {
    const carriesHood = hood && cx != null && cx > a && cx < b, joinsTall = !!opts.fridge && b >= x1 - 0.01 && b - a >= 0.3;
    if (!carriesHood && !joinsTall && b - a < 0.9) continue;
    ups.push(box(b - a, UY1 - UY0, UD - 0.02, (a + b) / 2, (UY0 + UY1) / 2, zb + (UD - 0.02) / 2, 0.8));
    upGaps.push(box(b - a - 0.03, UY1 - UY0 - 0.02, 0.004, (a + b) / 2, (UY0 + UY1) / 2, zb + UD - 0.018, 0.8));
    const n = Math.max(1, Math.round((b - a) / 0.5)), w = (b - a) / n;
    for (let i = 0; i < n; i++) {
      const p = a + i * w;
      upFronts.push(rbox(w - 0.004, UY1 - UY0 - 0.004, 0.019, 0.002, p + w / 2, (UY0 + UY1) / 2, zb + UD - 0.0095, 0.8));
      upPulls.push(...barPull(p + (i % 2 ? 0.045 : w - 0.045), UY0 + 0.11, zb + UD, 0.14, true));
    }
    tile.push(box(b - a, UY0 - benchY - 0.09, 0.01, (a + b) / 2, (UY0 + benchY + 0.09) / 2, zb + 0.005, 0.6, 'x'));
  }
  if (ups.length) {
    g.add(mesh('upper_cabinets', mergeGeometries(ups), M.cabinet), mesh('upper_shadow_gaps', mergeGeometries(upGaps), M.appliance), mesh('upper_fronts', mergeGeometries(upFronts), M.cabinet), mesh('upper_pulls', mergeGeometries(upPulls), M.brass));
    g.add(mesh('splashback', mergeGeometries(tile), M.tile));
  }

  if (opts.fridge) {
    // a tall housing at the end of the bench: side panels, a cupboard over, and a fridge-freezer standing in it
    const fa = x1, fb = x1 + fridgeW, fx = (fa + fb) / 2, bw = fridgeW - 0.06;
    g.add(mesh('tall_housing', mergeGeometries([box(0.018, UY1, D + 0.02, fa + 0.009, UY1 / 2, 0.01, 0.8, 'y'), box(0.018, UY1, D + 0.02, fb - 0.009, UY1 / 2, 0.01, 0.8, 'y'), box(fridgeW - 0.036, 0.33, D - 0.04, fx, 2.035, -0.02, 0.8)]), M.cabinet));
    g.add(mesh('tall_housing_fronts', mergeGeometries([-1, 1].map((s) => rbox((fridgeW - 0.036) / 2 - 0.004, 0.326, 0.019, 0.002, fx + (s * (fridgeW - 0.036)) / 4, 2.035, zf - 0.0095, 0.8))), M.cabinet));
    g.add(mesh('tall_housing_pulls', mergeGeometries([-1, 1].flatMap((s) => barPull(fx + s * 0.04, 1.95, zf, 0.12, true))), M.brass));
    g.add(mesh('fridge_body', mergeGeometries([box(bw, 1.78, D - 0.04, fx, 0.06 + 0.89, -0.02, 0.4), box(bw - 0.02, 0.06, D - 0.1, fx, 0.03, -0.04, 0.4)]), M.appliance));
    g.add(mesh('fridge_doors', mergeGeometries([boxUV(new RoundedBoxGeometry(bw, 1.1, 0.04, 3, 0.008).translate(fx, 1.29, zf), 0.25, 'y'), boxUV(new RoundedBoxGeometry(bw, 0.648, 0.04, 3, 0.008).translate(fx, 0.404, zf), 0.25, 'y')]), M.steel));
    const fh: THREE.BufferGeometry[] = [];
    for (const [y, l] of [[1.2, 0.56], [0.52, 0.3]]) {
      fh.push(boxUV(new THREE.CylinderGeometry(0.01, 0.01, l, 14).translate(fa + 0.09, y, zf + 0.062), 0.25, 'y'));
      for (const s of [-1, 1]) fh.push(boxUV(new THREE.CylinderGeometry(0.007, 0.007, 0.044, 10).rotateX(Math.PI / 2).translate(fa + 0.09, y + s * (l / 2 - 0.03), zf + 0.041), 0.25, 'z'));
    }
    g.add(mesh('fridge_handles', mergeGeometries(fh), M.chrome));
  }
  const out = tagged(g, 'kitchen_joinery', 'fitout', 'lacquered cabinetry, stone benchtop, undermounted steel sink, induction cooktop, oven, fridge-freezer in a tall housing', { length: `${Math.round(len * 1000)} mm` });
  // for whoever dresses the bench: where the cooktop and sink are, and the stretches of clear bench (local x)
  const busy: [number, number][] = [[sx - 0.52, sx + 0.52]];
  if (cx != null) busy.push([cx - 0.36, cx + 0.36]);
  busy.sort((p, q) => p[0] - q[0]);
  const free: [number, number][] = [];
  let f = x0 + 0.04;
  for (const [a, b] of busy) { if (a - f > 0.12) free.push([f, a]); f = Math.max(f, b); }
  if (x1 - 0.04 - f > 0.12) free.push([f, x1 - 0.04]);
  (out.userData as Record<string, unknown>).bench = { free, cooktopAt: cx, sinkAt: sx, hood, y: benchY };
  return out;
}

/** the outline of a pan or seat seen from above: straight at the wall end, a full round at the front */
function panShape(w: number, z0: number, z1: number) {
  const s = new THREE.Shape(), r = w / 2;
  // drawn with depth as −y, so that standing it up (a quarter turn about x) puts the front at +z
  s.moveTo(-r, -z0); s.lineTo(r, -z0); s.lineTo(r, -(z1 - r)); s.absarc(0, -(z1 - r), r, 0, -Math.PI, true); s.lineTo(-r, -z0);
  return s;
}
/** stand an extruded plan shape up: the extrusion becomes height, rising from y0 */
const standUp = (s: THREE.Shape, h: number, y0: number, bevel = 0.008) => new THREE.ExtrudeGeometry(s, { depth: h - 2 * bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 20 }).rotateX(-Math.PI / 2).translate(0, y0 + bevel, 0);

/**
 * A furniture-style vanity standing on four oak legs, its back to the wall at −d / 2: a drawer box with two
 * fronts, a stone top, a thrown vessel basin with its waste, and a slatted shelf below for towels.
 */
export function vanity(M: InteriorMats, w = 0.75, d = 0.46) {
  const g = grp('vanity');
  const topY = 0.85, zb = -d / 2, zf = d / 2;
  const legs: THREE.BufferGeometry[] = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) legs.push(box(0.036, topY - 0.02, 0.036, sx * (w / 2 - 0.018), (topY - 0.02) / 2, sz * (d / 2 - 0.018), 0.9, 'y'));
  // the towel shelf: two rails and slats
  for (const sz of [-1, 1]) legs.push(box(w - 0.072, 0.03, 0.02, 0, 0.2, sz * (d / 2 - 0.018), 0.9, 'x'));
  const ns = Math.max(3, Math.round((w - 0.08) / 0.075));
  for (let i = 0; i < ns; i++) legs.push(box(0.05, 0.012, d - 0.04, -(w - 0.08) / 2 + ((i + 0.5) / ns) * (w - 0.08), 0.221, 0, 0.9, 'z'));
  g.add(mesh('vanity_frame', mergeGeometries(legs), M.oak));
  g.add(mesh('vanity_cabinet', box(w - 0.04, 0.27, d - 0.03, 0, 0.695, -0.005, 0.9), M.oak));
  g.add(mesh('vanity_shadow_gaps', box(w - 0.08, 0.25, 0.004, 0, 0.695, zf - 0.0215, 0.9), M.appliance));
  const half = (w - 0.076) / 2;
  g.add(mesh('vanity_drawers', mergeGeometries([-1, 1].map((s) => rbox(half - 0.004, 0.262, 0.018, 0.002, (s * half) / 2, 0.695, zf - 0.0105, 0.9))), M.oak));
  g.add(mesh('vanity_pulls', mergeGeometries([-1, 1].flatMap((s) => barPull((s * half) / 2, 0.775, zf - 0.0015, Math.min(0.14, half * 0.5)))), M.brass));
  g.add(mesh('vanity_top', rbox(w + 0.01, 0.025, d + 0.01, 0.004, 0, topY - 0.0125, 0, 0.6), M.bench));
  // vessel basin: thrown, with a thick wall, standing on the stone
  const br = Math.min(0.18, d / 2 - 0.06), bz = zf - br - 0.02;
  const prof = [[0.0001, 0.004], [br * 0.42, 0.004], [br * 0.47, 0], [br * 0.5, 0.0], [br * 0.56, 0.012], [br * 0.9, 0.07], [br, 0.112], [br, 0.118], [br - 0.006, 0.122], [br - 0.012, 0.118], [br - 0.014, 0.11], [br * 0.82, 0.066], [br * 0.42, 0.032], [0.0001, 0.03]].map(([r, y]) => new THREE.Vector2(r, y));
  g.add(mesh('basin', new THREE.LatheGeometry(prof, 48).translate(0, topY, bz), M.ceramic));
  g.add(mesh('basin_waste', cyl(0.022, 0.022, 0.004, 0, topY + 0.032, bz, 20), M.chrome));
  // the default mixer stands on the stone behind the basin (a project may swap it for its own)
  const mixer = mesh('basin_mixer', mergeGeometries([cyl(0.016, 0.02, 0.2, 0, topY + 0.1, zb + 0.045, 16), box(0.016, 0.016, 0.12, 0, topY + 0.19, zb + 0.095, 0.3, 'z')]), M.chrome);
  g.add(mixer);
  g.add(mesh('mirror', box(w - 0.05, 0.75, 0.01, 0, 1.55, zb + 0.005, 0.4, 'y'), M.chrome));
  const out = tagged(g, 'vanity', 'fitout', 'oak vanity on legs, stone top, ceramic vessel basin, towel shelf');
  (out.userData as Record<string, unknown>).fix = { topY, mixerZ: zb + 0.045, shelfY: 0.227, basinZ: bz };
  return out;
}

/** a back-to-wall toilet suite: the pan runs back to the wall, the cistern sits on it against the wall. Back at z = 0. */
export function toilet(M: InteriorMats) {
  const g = grp('toilet');
  const parts: THREE.BufferGeometry[] = [];
  parts.push(standUp(panShape(0.36, 0, 0.64), 0.4, 0, 0.012));
  parts.push(new RoundedBoxGeometry(0.39, 0.34, 0.15, 3, 0.014).translate(0, 0.57, 0.077));
  parts.push(new RoundedBoxGeometry(0.4, 0.03, 0.16, 3, 0.01).translate(0, 0.753, 0.08));
  g.add(mesh('pan_and_cistern', mergeGeometries(parts.map((p) => boxUV(p.index ? p.toNonIndexed() : p, 0.5, 'x'))), M.ceramic));
  // seat and lid: two thin leaves on the pan, hinged at the cistern
  g.add(mesh('seat_and_lid', mergeGeometries([standUp(panShape(0.37, 0.17, 0.645), 0.018, 0.401, 0.005), standUp(panShape(0.365, 0.17, 0.64), 0.022, 0.42, 0.007)].map((p) => boxUV(p.index ? p.toNonIndexed() : p, 0.5, 'x'))), M.ceramic));
  g.add(mesh('hinges_and_buttons', mergeGeometries([-1, 1].map((s) => cyl(0.009, 0.009, 0.03, s * 0.11, 0.425, 0.165, 12)).concat([cyl(0.022, 0.022, 0.004, -0.024, 0.77, 0.08, 20), cyl(0.014, 0.014, 0.004, 0.022, 0.77, 0.08, 20)])), M.chrome));
  return tagged(g, 'toilet', 'fitout', 'vitreous china, back to wall');
}

/**
 * A tiled shower in a corner: tray with a waste, tiles on the back (−z) and left (−x) walls, frameless glass on
 * the front and right held in slim channels at the floor and walls. `alcove` tiles the right wall too and
 * leaves glass only across the front, with a pull on it.
 */
export function shower(M: InteriorMats, w = 0.9, d = 0.9, alcove = false) {
  const g = grp('shower');
  g.add(mesh('shower_tray', box(w, 0.04, d, 0, 0.02, 0, 0.6), M.wallTile));
  g.add(mesh('shower_waste', box(0.1, 0.003, 0.1, 0, 0.0415, 0, 0.25), M.chrome));
  const tiles = [box(w, 2.1, 0.012, 0, 1.05, -d / 2 + 0.006, 1.2, 'x'), box(0.012, 2.1, d, -w / 2 + 0.006, 1.05, 0, 1.2, 'z')];
  if (alcove) tiles.push(box(0.012, 2.1, d, w / 2 - 0.006, 1.05, 0, 1.2, 'z'));
  g.add(mesh('shower_wall_tiles', mergeGeometries(tiles), M.wallTile));
  const glass = new THREE.PlaneGeometry(w - 0.02, 2.0);
  glass.translate(0, 1.04, d / 2);
  const panes = [glass];
  const trim = [box(w - 0.01, 0.014, 0.014, 0, 0.047, d / 2, 0.3), box(0.014, 2.0, 0.014, -w / 2 + 0.019, 1.04, d / 2, 0.3, 'y')];
  if (!alcove) {
    const glass2 = new THREE.PlaneGeometry(d - 0.02, 2.0);
    glass2.rotateY(Math.PI / 2);
    glass2.translate(w / 2, 1.04, 0);
    panes.push(glass2);
    trim.push(box(0.014, 0.014, d - 0.01, w / 2, 0.047, 0, 0.3, 'z'), box(0.014, 2.0, 0.014, w / 2, 1.04, -d / 2 + 0.019, 0.3, 'y'));
  } else {
    trim.push(box(0.014, 2.0, 0.014, w / 2 - 0.019, 1.04, d / 2, 0.3, 'y'), ...barPull(w * 0.18, 1.05, d / 2, 0.3, true));
  }
  g.add(mesh('glass_screen', mergeGeometries(panes), M.glass));
  g.add(mesh('glass_channels', mergeGeometries(trim), M.chrome));
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
