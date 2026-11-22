// Geometry passes → pictures, with no three.js and no browser in it, so the page, the film tool and the tests share it.
// The page renders three exact passes of the model (passes.ts): view-space normals, linear depth and a part map (which
// part of the building each pixel shows, and whether it is glass). From them this file draws:
//   - a clean line drawing: black where the building has an edge (a silhouette, a crease, a change of part or glass),
//     grey for furniture and site works, light grey where planting and ground meet something else;
//   - a depth picture (near is light) and a part picture (one colour a part), for contact sheets;
//   - the lossless part mask the geometry check reads (geocheck.ts).
// Pure functions on typed arrays: the same input always gives the same picture.

/** what each pixel of the part map shows (the red channel of the mask) */
export const PART = {
  NONE: 0, WALLS: 1, OPENINGS: 2, ROOF: 3, DECK: 4, BALUSTRADE: 5, STAIR: 6, POLES: 7, FRAMING: 8, INTERIOR: 9, RETAINING: 10, BUILT: 11, RIBS: 12,
  FITOUT: 20, GROUND: 30, VEG: 31, SKY: 255,
} as const;
export const PART_NAMES: Record<number, string> = {
  1: 'walls', 2: 'openings (windows and doors)', 3: 'roof', 4: 'deck', 5: 'deck balustrade (posts and glass)', 6: 'stair, landings and stair balustrade',
  7: 'poles and piles', 8: 'framing under the floor', 9: 'inside (linings, floor, ceiling)', 10: 'retaining walls', 11: 'other parts of the building',
  12: 'cladding ribs (drawn, not scored: too fine to see at most distances)',
  20: 'furniture (proposed)', 30: 'ground', 31: 'planting and bush', 255: 'sky',
};
/** parts that belong to the building as drawn */
export const isBuilding = (p: number) => p >= 1 && p <= 12;
/** the parts the geometry check scores: the building, less the cladding's fine ribs (a photo rarely shows each one) */
export const isScored = (p: number) => p >= 1 && p <= 11;
/** depth is stored in 24 bits up to FAR metres (0.06 mm a step); anything at or past FAR is sky */
export const FAR = 1000;
const DEPTH_STEPS = 16777215;

export interface Passes {
  w: number;
  h: number;
  /** metres along the view axis; Infinity where there is nothing (sky) */
  depth: Float32Array;
  /** view-space unit normals, 3 per pixel */
  normal: Float32Array;
  part: Uint8Array;
  /** 1 where the surface is glass */
  glass: Uint8Array;
}

/** RGBA bytes of the three passes, rows top to bottom → Passes */
export function decodePasses(w: number, h: number, normalRGBA: Uint8Array, depthRGBA: Uint8Array, idRGBA: Uint8Array): Passes {
  const n = w * h, depth = new Float32Array(n), normal = new Float32Array(n * 3), part = new Uint8Array(n), glass = new Uint8Array(n);
  for (let i = 0, j = 0; i < n; i++, j += 4) {
    const v = depthRGBA[j] * 65536 + depthRGBA[j + 1] * 256 + depthRGBA[j + 2];
    part[i] = idRGBA[j];
    glass[i] = idRGBA[j + 1] > 127 ? 1 : 0;
    depth[i] = part[i] === PART.SKY || v >= DEPTH_STEPS ? Infinity : (v / DEPTH_STEPS) * FAR;
    const x = normalRGBA[j] / 127.5 - 1, y = normalRGBA[j + 1] / 127.5 - 1, z = normalRGBA[j + 2] / 127.5 - 1, l = Math.hypot(x, y, z) || 1;
    normal[i * 3] = x / l; normal[i * 3 + 1] = y / l; normal[i * 3 + 2] = z / l;
  }
  return { w, h, depth, normal, part, glass };
}

/** flip rows (a GPU read-back comes bottom row first) */
export function flipRows(px: Uint8Array, w: number, h: number, ch = 4): Uint8Array {
  const out = new Uint8Array(px.length), s = w * ch;
  for (let y = 0; y < h; y++) out.set(px.subarray((h - 1 - y) * s, (h - y) * s), y * s);
  return out;
}

export interface LineOpts {
  /** a depth jump counts as an edge when 1/depth misses its straight-line guess by more than this share */
  jump?: number;
  /** a crease counts as an edge when the normals of two neighbours differ by more than this many degrees */
  crease?: number;
  /** planting, bush and ground further than this (metres) get no lines */
  contextFar?: number;
}
export interface Lines {
  /** grey, one byte a pixel: 255 paper, 0 a building edge */
  line: Uint8Array;
  /** the part each edge pixel belongs to (0 where there is no edge) */
  edgePart: Uint8Array;
}

const INK = (p: number) => (p === PART.RIBS ? 110 : isBuilding(p) ? 0 : p === PART.FITOUT ? 96 : p === PART.SKY ? 255 : 170);

/**
 * The line drawing. An edge lies between two neighbouring pixels when they show different parts (or glass and not
 * glass), when the depth jumps (1/depth, which is straight across any flat face in a picture, misses its guess from both
 * sides) or when the faces fold (normals apart by more than `crease` degrees). The edge is drawn on the nearer pixel, so a
 * silhouette sits on the thing in front. Inside planting and bush only its outline is drawn; inside the ground only
 * jumps (no folds), so the drawing stays about the building.
 */
export function lineDrawing(P: Passes, o: LineOpts = {}): Lines {
  const { w, h, depth: Z, normal: N, part, glass } = P;
  const jump = o.jump ?? 0.035, cosC = Math.cos(((o.crease ?? 32) * Math.PI) / 180);
  const line = new Uint8Array(w * h).fill(255), edgePart = new Uint8Array(w * h);
  const iz = (i: number) => (Number.isFinite(Z[i]) ? 1 / Z[i] : 0);
  const far = o.contextFar ?? 35;
  const mark = (i: number) => {
    const p = part[i];
    if ((p === PART.VEG || p === PART.GROUND) && Z[i] > far) return; // distant bush and ground are left out: they only clutter
    const ink = INK(p); if (ink < line[i]) { line[i] = ink; edgePart[i] = p; }
  };
  // pixel a and its neighbour b; a0 is the pixel before a, b1 the one after b (on the same row or column), or -1
  const test = (a: number, b: number, a0: number, b1: number) => {
    const pa = part[a], pb = part[b];
    if (pa === PART.SKY && pb === PART.SKY) return;
    const za = Z[a], zb = Z[b];
    const near = za <= zb ? a : b;
    if (pa !== pb || glass[a] !== glass[b]) { mark(near); return; }
    if (pa === PART.SKY) return;
    const veg = pa === PART.VEG;
    // depth jump: guess 1/z at b from a and the pixel before it, and at a from b and the pixel after it
    const ia = iz(a), ib = iz(b);
    const ga = a0 >= 0 && part[a0] === pa ? 2 * ia - iz(a0) : ia, gb = b1 >= 0 && part[b1] === pb ? 2 * ib - iz(b1) : ib;
    if (Math.abs(ib - ga) > jump * Math.max(ia, ib) && Math.abs(ia - gb) > jump * Math.max(ia, ib)) { if (!veg) mark(near); return; }
    if (veg || pa === PART.GROUND) return;
    const d = N[a * 3] * N[b * 3] + N[a * 3 + 1] * N[b * 3 + 1] + N[a * 3 + 2] * N[b * 3 + 2];
    if (d < cosC) mark(near);
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (x + 1 < w) test(i, i + 1, x > 0 ? i - 1 : -1, x + 2 < w ? i + 2 : -1);
      if (y + 1 < h) test(i, i + w, y > 0 ? i - w : -1, y + 2 < h ? i + 2 * w : -1);
    }
  }
  return { line, edgePart };
}

/** the lossless mask the check reads: red = part, green = 255 on glass, blue = 0 */
export function maskRGB(P: Passes): Uint8Array {
  const n = P.w * P.h, out = new Uint8Array(n * 3);
  for (let i = 0; i < n; i++) { out[i * 3] = P.part[i]; out[i * 3 + 1] = P.glass[i] ? 255 : 0; }
  return out;
}
/** back from maskRGB (or any RGB/RGBA copy of it) */
export function maskFrom(px: Uint8Array, w: number, h: number, ch = 3): { part: Uint8Array; glass: Uint8Array } {
  const n = w * h, part = new Uint8Array(n), glass = new Uint8Array(n);
  for (let i = 0; i < n; i++) { part[i] = px[i * ch]; glass[i] = px[i * ch + 1] > 127 ? 1 : 0; }
  return { part, glass };
}

/** depth to look at: near light, far dark, on a log scale from 0.3 m to 300 m; sky black */
export function depthView(P: Passes): Uint8Array {
  const n = P.w * P.h, out = new Uint8Array(n), l0 = Math.log(0.3), l1 = Math.log(300);
  for (let i = 0; i < n; i++) {
    const z = P.depth[i];
    out[i] = Number.isFinite(z) ? Math.round(255 * (1 - Math.min(1, Math.max(0, (Math.log(Math.max(z, 0.3)) - l0) / (l1 - l0))))) : 0;
  }
  return out;
}
/** normals to look at (the usual blue-violet picture), RGB */
export function normalView(P: Passes): Uint8Array {
  const n = P.w * P.h, out = new Uint8Array(n * 3);
  for (let i = 0; i < n; i++) {
    if (P.part[i] === PART.SKY) continue;
    for (let k = 0; k < 3; k++) out[i * 3 + k] = Math.round((P.normal[i * 3 + k] * 0.5 + 0.5) * 255);
  }
  return out;
}
const COLOURS: Record<number, [number, number, number]> = {
  1: [200, 196, 188], 12: [170, 166, 158], 2: [70, 120, 200], 3: [150, 60, 60], 4: [190, 140, 80], 5: [80, 190, 210], 6: [230, 120, 30], 7: [120, 80, 40],
  8: [160, 120, 90], 9: [235, 225, 210], 10: [130, 130, 120], 11: [200, 160, 200], 20: [145, 106, 112], 30: [90, 100, 70], 31: [50, 120, 60], 255: [36, 11, 33],
};
/** one colour a part, for contact sheets */
export function partView(part: Uint8Array): Uint8Array {
  const out = new Uint8Array(part.length * 3);
  for (let i = 0; i < part.length; i++) { const c = COLOURS[part[i]] ?? [0, 0, 0]; out[i * 3] = c[0]; out[i * 3 + 1] = c[1]; out[i * 3 + 2] = c[2]; }
  return out;
}
/** grey → RGB */
export function greyToRGB(g: Uint8Array): Uint8Array {
  const out = new Uint8Array(g.length * 3);
  for (let i = 0; i < g.length; i++) out[i * 3] = out[i * 3 + 1] = out[i * 3 + 2] = g[i];
  return out;
}
/** the colour picture with the line drawing laid over it (lines darkened in, at `strength`), RGB */
export function lined(rgb: Uint8Array, line: Uint8Array, strength = 0.7): Uint8Array {
  const out = new Uint8Array(rgb.length);
  for (let i = 0; i < line.length; i++) {
    const k = 1 - strength * (1 - line[i] / 255);
    out[i * 3] = rgb[i * 3] * k; out[i * 3 + 1] = rgb[i * 3 + 1] * k; out[i * 3 + 2] = rgb[i * 3 + 2] * k;
  }
  return out;
}
/** crop a w×h picture with `ch` channels to the rectangle (sx, sy, sw, sh) */
export function cropPx(px: Uint8Array, w: number, ch: number, sx: number, sy: number, sw: number, sh: number): Uint8Array {
  const out = new Uint8Array(sw * sh * ch);
  for (let y = 0; y < sh; y++) out.set(px.subarray(((sy + y) * w + sx) * ch, ((sy + y) * w + sx + sw) * ch), y * sw * ch);
  return out;
}
