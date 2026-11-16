import * as THREE from 'three/webgpu';
import { bake, fbm, hex, mix, metal, paint, pbr, wood, type PBRSet } from '../objects/tex';
import { detail, type Detail, type Quality } from '../objects/util';

// Materials for the 16A twin, built once per quality from the library's procedural PBR bakes.
// Every set carries colour, ORM (occlusion/roughness/metalness) and a normal map, tiled in metres.

/** vertical shiplap cedar, 135 mm cover boards with a 10 mm shadow groove; stained */
function shiplap(size: number, o: { colour: number; dark?: number; seed: number; name: string; gloss?: number }) {
  const C = hex(o.colour);
  const D = hex(o.dark ?? o.colour);
  const boards = 4;
  const cover = 0.135;
  return bake(
    size,
    boards * cover,
    (u, v) => {
      const b = u * boards;
      const f = b - Math.floor(b);
      const k = Math.floor(b);
      const groove = f > 0.926;
      const edge = f < 0.02 || (f > 0.9 && f <= 0.926);
      const grain = fbm(u, v, 64, 3, 4, o.seed + k * 13);
      const streak = fbm(u, v, 16, 1, 3, o.seed + 91 + k);
      const tone = 0.5 + 0.5 * fbm(u, v, 4, 1, 2, o.seed + 7 + k * 5);
      const t = Math.min(1, Math.max(0, tone * 0.7 + grain * 0.3));
      const base: [number, number, number] = [mix(C[0], D[0], t), mix(C[1], D[1], t), mix(C[2], D[2], t)];
      const s = groove ? 0.35 : edge ? 0.8 : 0.92 + 0.12 * streak;
      return {
        c: [base[0] * s, base[1] * s, base[2] * s],
        h: groove ? 0 : edge ? 0.6 : 0.85 + grain * 0.06,
        r: mix(0.82, 0.55, o.gloss ?? 0.2) + grain * 0.06,
        m: 0,
      };
    },
    3.2,
    o.name,
  );
}

/** board-formed or smooth concrete with pores and soft staining */
function concrete(size: number, o: { colour: number; seed: number; name: string; tile?: number }) {
  const C = hex(o.colour);
  return bake(
    size,
    o.tile ?? 1.2,
    (u, v) => {
      const n = fbm(u, v, 6, 6, 5, o.seed);
      const pores = fbm(u, v, 64, 64, 2, o.seed + 3);
      const pit = pores > 0.78 ? 0.6 : 1;
      const k = (0.9 + 0.16 * n) * pit;
      return { c: [C[0] * k, C[1] * k, C[2] * k], h: n * 0.4 + (pit < 1 ? -0.4 : 0), r: 0.85 + 0.1 * n, m: 0 };
    },
    1.6,
    o.name,
  );
}

/** close-mown lawn seen from a few metres: blades as fine noise, clover patches */
function lawn(size: number, seed: number) {
  return bake(
    size,
    2.0,
    (u, v) => {
      const blades = fbm(u, v, 96, 96, 2, seed);
      const patch = fbm(u, v, 3, 3, 4, seed + 5);
      const clover = fbm(u, v, 9, 9, 3, seed + 9) > 0.64 ? 1 : 0;
      const k = 0.75 + 0.45 * blades;
      const g: [number, number, number] = [mix(0.2, 0.3, patch), mix(0.36, 0.44, patch) + 0.03 * clover, mix(0.12, 0.16, patch)];
      return { c: [g[0] * k, g[1] * k, g[2] * k], h: blades, r: 0.92, m: 0 };
    },
    1.4,
    'lawn',
  );
}

function gravel(size: number, seed: number) {
  return bake(
    size,
    0.8,
    (u, v) => {
      const cell = fbm(u, v, 40, 40, 1, seed);
      const n = fbm(u, v, 8, 8, 3, seed + 2);
      const k = 0.6 + 0.5 * cell;
      return { c: [0.62 * k, 0.6 * k, 0.56 * k + 0.02 * n], h: cell, r: 0.9, m: 0 };
    },
    3,
    'gravel',
  );
}

export interface TwinMats {
  d: Detail;
  sets: Record<string, PBRSet>;
  cedar: THREE.MeshPhysicalMaterial;
  blackstain: THREE.MeshPhysicalMaterial;
  roof: THREE.MeshPhysicalMaterial;
  flashing: THREE.MeshPhysicalMaterial;
  joinery: THREE.MeshPhysicalMaterial;
  glass: THREE.MeshPhysicalMaterial;
  lining: THREE.MeshPhysicalMaterial;
  oak: THREE.MeshPhysicalMaterial;
  tile: THREE.MeshPhysicalMaterial;
  bench: THREE.MeshPhysicalMaterial;
  door: THREE.MeshPhysicalMaterial;
  decking: THREE.MeshPhysicalMaterial;
  framing: THREE.MeshPhysicalMaterial;
  pile: THREE.MeshPhysicalMaterial;
  concrete: THREE.MeshPhysicalMaterial;
  existingWall: THREE.MeshPhysicalMaterial;
  existingRoof: THREE.MeshPhysicalMaterial;
  lawn: THREE.MeshPhysicalMaterial;
  drive: THREE.MeshPhysicalMaterial;
  gravel: THREE.MeshPhysicalMaterial;
  spaShell: THREE.MeshPhysicalMaterial;
  water: THREE.MeshPhysicalMaterial;
}

const cache = new Map<Quality, TwinMats>();

export function twinMats(q: Quality): TwinMats {
  const hit = cache.get(q);
  if (hit) return hit;
  // the browser tier still gets 1024 px maps on the large surfaces; hq bakes 2048
  const d = q === 'hq' ? detail('hq') : { ...detail('web'), tex: 1024, texS: 512 };
  const sets: Record<string, PBRSet> = {
    cedar: shiplap(d.tex, { colour: 0x8a7462, dark: 0x5f5044, seed: 11, name: 'cedar_shiplap_stained' }),
    blackstain: shiplap(d.tex, { colour: 0x302a26, dark: 0x1e1a18, seed: 23, name: 'cedar_shiplap_black_stain' }),
    oak: wood(d.tex, { light: 0xc9a97c, dark: 0x9c7a52, rings: 18, gloss: 0.35, tile: 0.9, seed: 41, name: 'oak_floor' }),
    decking: wood(d.tex, { light: 0xa4795a, dark: 0x6f4a33, rings: 14, gloss: 0.05, tile: 0.7, seed: 52, name: 'hardwood_decking' }),
    framing: wood(d.texS, { light: 0x6f655a, dark: 0x4a433c, rings: 16, gloss: 0, tile: 0.5, seed: 63, name: 'treated_pine_weathered' }),
    pile: wood(d.texS, { light: 0x5f574c, dark: 0x3e3832, rings: 10, gloss: 0, tile: 0.4, seed: 64, name: 'h5_pile_weathered' }),
    roof: metal(d.texS, { tint: 0x2f3134, rough: 0.48, brush: 0.1, tile: 0.6, seed: 71, name: 'prepainted_steel_charcoal' }),
    joinery: metal(d.texS, { tint: 0x1d1d1f, rough: 0.42, brush: 0.15, tile: 0.4, seed: 72, name: 'aluminium_powdercoat_black' }),
    lining: paint(d.texS, { colour: 0xf1ede6, gloss: 0.12, tile: 1.0, seed: 81, name: 'plasterboard_paint' }),
    door: paint(d.texS, { colour: 0xece8e1, gloss: 0.35, tile: 0.8, seed: 82, name: 'door_paint' }),
    tile: concrete(d.texS, { colour: 0xbfbab2, seed: 83, name: 'porcelain_tile', tile: 0.6 }),
    bench: concrete(d.texS, { colour: 0xe2ddd4, seed: 84, name: 'engineered_stone', tile: 0.8 }),
    concrete: concrete(d.tex, { colour: 0xa9a59d, seed: 85, name: 'concrete' }),
    existingWall: paint(d.texS, { colour: 0xd8d2c6, gloss: 0.2, tile: 1.0, seed: 86, name: 'existing_painted_wall' }),
    existingRoof: concrete(d.texS, { colour: 0x6e625a, seed: 87, name: 'existing_roof', tile: 0.9 }),
    lawn: lawn(d.tex, 91),
    drive: concrete(d.tex, { colour: 0xb4b0a6, seed: 92, name: 'driveway_concrete', tile: 2.0 }),
    gravel: gravel(d.texS, 93),
  };
  const m: TwinMats = {
    d,
    sets,
    cedar: pbr(sets.cedar, 'cedar_shiplap_stained'),
    blackstain: pbr(sets.blackstain, 'cedar_shiplap_black_stain'),
    roof: pbr(sets.roof, 'roof_profiled_metal', { clearcoat: 0.2, clearcoatRoughness: 0.5, side: THREE.DoubleSide }),
    flashing: pbr(sets.roof, 'flashing_steel', { clearcoat: 0.2 }),
    joinery: pbr(sets.joinery, 'aluminium_joinery'),
    glass: new THREE.MeshPhysicalMaterial({ name: 'glass_double_glazed', color: 0xffffff, metalness: 0, roughness: 0.03, transmission: 1, thickness: 0.004, ior: 1.52, transparent: true, opacity: 1, side: THREE.DoubleSide }),
    lining: pbr(sets.lining, 'plasterboard_lining'),
    oak: pbr(sets.oak, 'oak_flooring'),
    tile: pbr(sets.tile, 'porcelain_tile'),
    bench: pbr(sets.bench, 'engineered_stone'),
    door: pbr(sets.door, 'painted_door'),
    decking: pbr(sets.decking, 'hardwood_decking'),
    framing: pbr(sets.framing, 'treated_pine_framing'),
    pile: pbr(sets.pile, 'treated_pine_h5'),
    concrete: pbr(sets.concrete, 'concrete'),
    existingWall: pbr(sets.existingWall, 'existing_wall_massing'),
    existingRoof: pbr(sets.existingRoof, 'existing_roof_massing'),
    lawn: pbr(sets.lawn, 'lawn'),
    drive: pbr(sets.drive, 'driveway_concrete'),
    gravel: pbr(sets.gravel, 'gravel'),
    spaShell: new THREE.MeshPhysicalMaterial({ name: 'spa_acrylic', color: 0xe9eef0, roughness: 0.15, clearcoat: 1 }),
    water: new THREE.MeshPhysicalMaterial({ name: 'spa_water', color: 0x9fc6cf, roughness: 0.02, transmission: 0.85, thickness: 0.6, ior: 1.33, side: THREE.DoubleSide }),
  };
  cache.set(q, m);
  return m;
}
