// Surfaces for the finished look of an opened IFC or GLB that the twin's material set (mats.ts) does not already have:
// standing-seam roofing, clay brick, herringbone pavers, sand-finish render, bark mulch, stone flags, upholstery and
// anodised aluminium. Each is a tiling height field baked in code (colour, occlusion/roughness/metalness, Sobel normals),
// generated once per page and shared by every part that uses it. Tiles are in metres, as in mats.ts.
import { bake, fbm, hex, linen, metal, mix, paint, type PBRSet } from '../objects/tex';

const sat = (x: number) => Math.min(1, Math.max(0, x));
const h1 = (a: number, b: number, s: number) => { const v = Math.sin(a * 127.1 + b * 311.7 + s * 74.7) * 43758.5453; return v - Math.floor(v); };

/** standing seam: two 500 mm trays a tile, a 25 mm upstand seam between them, a faint swage, oil-canning and satin roll marks.
 *  Seams run along V (down the slope, see the roof UVs in dressModel.ts). Greyscale: the colour comes from the material. */
export function standingSeam(size: number): PBRSet {
  return bake(size, 1.0, (u, v) => {
    const t = (u * 2) % 1;                       // across one tray, 0..1
    const seam = Math.exp(-(((t - 0.0) * 40) ** 2)) + Math.exp(-(((t - 1.0) * 40) ** 2));
    const swage = 0.25 * (Math.exp(-(((t - 0.33) * 90) ** 2)) + Math.exp(-(((t - 0.67) * 90) ** 2)));
    const can = fbm(u, v, 2, 3, 3, 401) - 0.5;      // oil canning: broad, soft
    const roll = fbm(u, v, 2, 160, 2, 402) - 0.5;   // fine roll marks along the sheet
    const k = 0.9 + can * 0.05 + roll * 0.03 - seam * 0.06;
    return { c: [k, k, k * 1.005], h: seam * 1.0 + swage + can * 0.15, r: 0.42 + roll * 0.06 + can * 0.05 + seam * 0.05, m: 0.55 };
  }, 4, 'standing_seam');
}

/** clay brick, stretcher bond: 230 × 86 mm bricks on 10 mm recessed mortar joints (240 × 96 mm a brick and joint),
 *  brick-to-brick colour drift and fire flash. 0.96 m a tile: four bricks across, ten courses up. */
export function brick(size: number): PBRSet {
  const tile = 0.96, nx = 4, ny = 10, B = hex(0x9a5a44), Bd = hex(0x6e3a2c), Bl = hex(0xb8775a), Mo = hex(0xbdb5a8);
  return bake(size, tile, (u, v) => {
    const row = Math.floor(v * ny), fy = v * ny - row, xx = u * nx + (row % 2 ? 0.5 : 0), col = Math.floor(xx), fx = xx - col;
    const jx = 0.01 / 0.24, jy = 0.01 / 0.096;
    const sand = fbm(u, v, 128, 128, 2, 31), mot = fbm(u, v, 12, 12, 3, 32);
    if (fx < jx || fy < jy) { const k = 0.9 + sand * 0.15; return { c: [Mo[0] * k, Mo[1] * k, Mo[2] * k], h: 0.05 + sand * 0.1, r: 0.95, m: 0, o: 0.7 }; }
    const id = h1(((col % nx) + nx) % nx, row, 7), id2 = h1(row, ((col % nx) + nx) % nx, 9);
    const base = id < 0.25 ? Bd : id > 0.8 ? Bl : B, t = sat(id2 * 0.6 + (mot - 0.5) * 0.6);
    const flash = Math.max(0, fbm(u, v, 6, 6, 2, 33) - 0.6) * 1.6;
    const edge = Math.min(fx - jx, 1 - fx, (fy - jy) * 0.4, (1 - fy) * 0.4), arris = 1 - 0.14 * Math.max(0, 0.05 - edge) / 0.05;
    const k = (0.86 + sand * 0.22 - flash * 0.25) * arris;
    return { c: [mix(base[0], Bd[0], t * 0.4) * k, mix(base[1], Bd[1], t * 0.4) * k, mix(base[2], Bd[2], t * 0.4) * k], h: 0.75 + sand * 0.15 + (mot - 0.5) * 0.1 - (1 - arris) * 2, r: 0.86 + sand * 0.08, m: 0 };
  }, 2.6, 'clay_brick');
}

/** herringbone clay pavers, 200 × 100 mm (90° herringbone), sanded joints, each paver its own shade. 0.8 m a tile. */
export function herringbone(size: number): PBRSet {
  const tile = 0.8, n = 8, P = hex(0xa58e78), Pd = hex(0x7d6552), Pl = hex(0xc0a68c), J = hex(0x8a8170);
  return bake(size, tile, (u, v) => {
    // cells of one paver width; cells with (i − j) mod 4 = 0, 1 are the two halves of a paver lying along x, cells with 3
    // (below) and 2 (above) the halves of one standing along z: the staircase of the herringbone
    const X = u * n, Y = v * n, i = Math.floor(X), j = Math.floor(Y), fx = X - i, fy = Y - j, d = (((i - j) % 4) + 4) % 4;
    let bx: number, by: number, id: number;
    if (d === 0) { bx = fx / 2; by = fy; id = h1(((i % n) + n) % n, j, 13); }
    else if (d === 1) { bx = 0.5 + fx / 2; by = fy; id = h1((((i - 1) % n) + n) % n, j, 13); }
    else if (d === 3) { bx = fx; by = fy / 2; id = h1(i, j, 17); }
    else { bx = fx; by = 0.5 + fy / 2; id = h1(i, ((j - 1) % n + n) % n, 17); }
    const long = d < 2, ja = 0.012 / (long ? 0.2 : 0.1), jb = 0.012 / (long ? 0.1 : 0.2);
    const ea = Math.min(bx, 1 - bx) / ja, eb = Math.min(by, 1 - by) / jb, e = Math.min(ea, eb);
    const grain = fbm(u, v, 96, 96, 2, 51), mot = fbm(u, v, 5, 5, 3, 52);
    if (e < 0.5) { const k = 0.85 + grain * 0.2; return { c: [J[0] * k, J[1] * k, J[2] * k], h: 0.02 + grain * 0.08, r: 0.97, m: 0, o: 0.72 }; }
    const base = id < 0.3 ? Pd : id > 0.75 ? Pl : P, bev = Math.min(1, (e - 0.5) / 2.5), k = (0.84 + grain * 0.18 + (mot - 0.5) * 0.12) * (0.9 + 0.1 * bev);
    return { c: [base[0] * k, base[1] * k, base[2] * k], h: 0.6 + 0.3 * bev + grain * 0.1, r: 0.84 + grain * 0.08 - (mot - 0.5) * 0.05, m: 0 };
  }, 2.4, 'herringbone_pavers');
}

/** a fine sand-float render: sand grain, faint trowel arcs, soft weathering. Greyscale near white. */
export function render(size: number): PBRSet {
  return bake(size, 1.4, (u, v) => {
    const sand = fbm(u, v, 220, 220, 2, 61), fine = fbm(u, v, 60, 60, 2, 62), arcs = fbm(u, v, 9, 9, 3, 63), stain = fbm(u, v, 2, 4, 3, 64);
    const k = 0.93 + (sand - 0.5) * 0.1 + (arcs - 0.5) * 0.08 + (fine - 0.5) * 0.04 - Math.max(0, stain - 0.58) * 0.16;
    return { c: [k, k * 0.995, k * 0.985], h: sand * 0.5 + fine * 0.25 + arcs * 0.2, r: 0.9 + (sand - 0.5) * 0.06, m: 0 };
  }, 1.1, 'render_sand_float');
}

/** bark mulch under planting: chips in warm browns, darker soil between */
export function mulch(size: number): PBRSet {
  return bake(size, 1.2, (u, v) => {
    const chips = fbm(u, v, 40, 40, 3, 71), cells = fbm(u, v, 22, 22, 2, 72), dark = fbm(u, v, 6, 6, 3, 73);
    const chip = chips > 0.5, k = chip ? 0.75 + (chips - 0.5) * 1.2 : 0.4 + cells * 0.2;
    return { c: [0.36 * k + 0.02, 0.26 * k, 0.18 * k * (0.9 + dark * 0.2)], h: chip ? chips : 0.1 + cells * 0.1, r: 0.93, m: 0, o: chip ? 1 : 0.7 };
  }, 2.2, 'bark_mulch');
}

/** stone flags: random rectangles of honed basalt-grey stone with fine pitting */
export function stoneFlags(size: number): PBRSet {
  const S = hex(0xb7b0a4);
  return bake(size, 1.2, (u, v) => {
    const row = Math.floor(v * 3), fy = v * 3 - row, off = h1(row, 1, 5) * 0.5, xx = u * 2 + off, col = Math.floor(xx), fx = xx - col;
    const joint = fx < 0.008 || fy < 0.012;
    const pit = fbm(u, v, 120, 120, 2, 81), mot = fbm(u, v, 4, 4, 3, 82), id = h1(col, row, 3);
    if (joint) return { c: [0.42, 0.4, 0.37], h: 0, r: 0.95, m: 0, o: 0.7 };
    const k = 0.88 + (id - 0.5) * 0.14 + (mot - 0.5) * 0.1 + (pit - 0.5) * 0.06;
    return { c: [S[0] * k, S[1] * k, S[2] * k], h: 0.7 + pit * 0.2, r: 0.7 + (pit - 0.5) * 0.15, m: 0 };
  }, 1.4, 'stone_flags');
}

/** woven upholstery: a fine plain weave in near-neutral (the colour comes from the material) */
export const upholstery = (size: number) => linen(size, { colour: 0xe8e6e2, threads: 64, tile: 0.12, seed: 91, name: 'upholstery_weave' });
/** dark anodised aluminium: fine extrusion lines along U */
export const anodised = (size: number) => metal(size, { tint: 0xe0e0e0, rough: 0.38, brush: 0.6, tile: 0.4, seed: 93, name: 'anodised_aluminium' });
/** satin steel */
export const satinSteel = (size: number) => metal(size, { tint: 0xe6e6e6, rough: 0.32, brush: 1, tile: 0.3, seed: 94, name: 'satin_steel' });
/** powder-coated aluminium for door and window frames: a light satin paint, so any colour can go over it */
export const powderCoat = (size: number) => paint(size, { colour: 0xeeeeee, gloss: 0.45, tile: 0.3, seed: 95, name: 'powder_coat' });
