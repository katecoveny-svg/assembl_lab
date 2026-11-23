// The rules behind the existing buildings (contextBuildings.ts), kept free of three.js so they are tested on their own.
// The site as it is now: the existing buildings round a model, from LINZ. Each is its LINZ NZ Building Outline (CC BY 4.0)
// pushed up to the height LINZ's 1 m LiDAR surface model (DSM) stands above its ground model (DEM) inside that outline; where
// neither reaches, the height is assumed and said so. The finish (weatherboard or brick, roof form and colour, window bands) is
// proposed by rule from the outline's size and shape, not surveyed (finishFor below). Outlines read by this browser straight
// from LINZ's public service; the point goes to LINZ only.
//
// 0 buildings (fixed 23 Nov 2026): the outlines under the model were left out by the box round *everything* in the opened file.
// A Revit or ArchiCAD export often carries a topography mesh, a road or a stray part far off (modelBounds.ts), so that box can
// cover the whole neighbourhood and every outline's middle fell inside it. The keep-out is now the building's own box
// (buildingBounds), the query reaches 300 m or more, and outlines past the 140 m LiDAR square get heights from their own read.

export const OUTLINES = 'https://services.arcgis.com/xdsHIIxuCWByZiCB/arcgis/rest/services/LINZ_NZ_Building_Outlines/FeatureServer/0';
export const OUTLINE_CREDIT = 'LINZ NZ Building Outlines, sourced from the LINZ Data Service and licensed for reuse under CC BY 4.0.';
export const ASSUMED_HEIGHT = 5;
/** how far round the point outlines are read: 300 m, or the building's half-diagonal and 200 m, at most 600 m */
export const outlineRadius = (buildingDiagonal = 0) => Math.round(Math.min(600, Math.max(300, buildingDiagonal / 2 + 200)));
export const PAGE = 1000;

export function outlinesUrl(lat: number, lon: number, radiusM = 300, offset = 0) {
  const p = new URLSearchParams({ geometry: `${lon},${lat}`, geometryType: 'esriGeometryPoint', inSR: '4326', distance: String(radiusM), units: 'esriSRUnit_Meter', spatialRel: 'esriSpatialRelIntersects',
    outFields: 'building_id,name,use_,Shape__Area', outSR: '2193', returnGeometry: 'true', f: 'json', resultRecordCount: String(PAGE), resultOffset: String(offset), orderByFields: 'OBJECTID' });
  return `${OUTLINES}/query?${p}`;
}
/** every outline round the point, a page at a time while LINZ says there are more (at most `pages` pages) */
export async function readOutlines(lat: number, lon: number, radiusM: number, get: (url: string) => Promise<unknown> = async (u) => { const r = await fetch(u); if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }, pages = 4) {
  const out: Outline[] = []; let more = false;
  for (let k = 0; k < pages; k++) {
    const j = (await get(outlinesUrl(lat, lon, radiusM, k * PAGE))) as Parameters<typeof parseOutlines>[0] & { exceededTransferLimit?: boolean };
    out.push(...parseOutlines(j));
    more = !!j.exceededTransferLimit;
    if (!more) break;
  }
  return { list: out, radius: radiusM, complete: !more };
}
export interface Outline { id: string; name: string | null; use: string | null; rings: number[][][] }
export function parseOutlines(j: { error?: { message?: string }; features?: { attributes: Record<string, unknown>; geometry?: { rings?: number[][][] } }[] }): Outline[] {
  if (j?.error) throw new Error(`LINZ's building outlines: ${j.error.message || 'query error'}`);
  return (j.features ?? []).filter((f) => f.geometry?.rings?.length).map((f) => ({ id: String(f.attributes.building_id ?? ''), name: (f.attributes.name as string) || null, use: f.attributes.use_ && f.attributes.use_ !== 'Unknown' ? String(f.attributes.use_) : null, rings: f.geometry!.rings! }));
}

/** a grid of heights above the ground (DSM less DEM) in the scene's frame: centre (x, z), size in metres, n cells a side */
export interface Tops { centre: [number, number]; size: number; n: number; heights: ArrayLike<number> }
const inRing = (x: number, z: number, r: number[][]) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, zi] = r[i], [xj, zj] = r[j]; if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };
/**
 * A building's height from the tops grid: the 80th percentile of the cells inside its outline that stand clear (over 2 m), so
 * a tree overhanging an edge does not lift it and a low wing does not drop it. null where the grid does not cover it.
 */
export function heightFromTops(ring: number[][], T: Tops | null): number | null {
  if (!T) return null;
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const [x, z] of ring) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  const vals: number[] = [], cell = T.size / (T.n - 1);
  let inside = 0;
  for (let x = x0 + 0.5; x < x1; x += Math.max(0.5, cell)) for (let z = z0 + 0.5; z < z1; z += Math.max(0.5, cell)) {
    if (!inRing(x, z, ring)) continue;
    const fx = (x - T.centre[0]) / T.size + 0.5, fz = (z - T.centre[1]) / T.size + 0.5;
    if (fx < 0 || fz < 0 || fx > 1 || fz > 1) continue;
    inside++;
    const h = T.heights[Math.round(fz * (T.n - 1)) * T.n + Math.round(fx * (T.n - 1))];
    if (h > 2) vals.push(h);
  }
  if (!inside || vals.length < Math.max(2, inside * 0.25)) return null;
  vals.sort((a, b) => a - b);
  return Math.round(vals[Math.floor(vals.length * 0.8)] * 10) / 10;
}

/**
 * The outlines in the scene's frame (toScene: NZTM e, n to scene x, z), leaving out those whose middle is under the building
 * (keepOut: the building's own box, from buildingBounds, never the box round everything in the file). `left` counts them.
 */
export function toSceneRings(list: Outline[], toScene: (e: number, n: number) => [number, number], keepOut: { x0: number; x1: number; z0: number; z1: number }) {
  const out: { o: Outline; ring: number[][] }[] & { left?: number } = [];
  let left = 0;
  for (const o of list) {
    const ring = o.rings[0].map(([e, n]) => toScene(e, n));
    let cx = 0, cz = 0; for (const [x, z] of ring) { cx += x; cz += z; } cx /= ring.length; cz /= ring.length;
    if (cx > keepOut.x0 && cx < keepOut.x1 && cz > keepOut.z0 && cz < keepOut.z1) { left++; continue; }
    out.push({ o, ring });
  }
  out.left = left;
  return out;
}

// ---- heights from LINZ's own DSM and DEM, for outlines past the 140 m square under the model -------------------------------
/** a north-up 1 m grid as linz/ground.js readHeights gives it: cell (row, col) centre at (originE + col, originN − row) */
export interface NzGrid { n: number; originE: number; originN: number; data: ArrayLike<number> }
const cellOf = (g: NzGrid, e: number, n: number) => { const c = Math.round(e - g.originE), r = Math.round(g.originN - n); return c < 0 || r < 0 || c >= g.n || r >= g.n ? NaN : g.data[r * g.n + c]; };
/**
 * A building's height from LINZ's surface model less its ground model inside its outline (NZTM ring), sampled each metre:
 * the 80th percentile of the cells standing more than 2 m clear, so a tree over an edge or a low lean-to does not decide it.
 * null where the grids do not cover enough of it (under a quarter of its cells standing clear, or none read).
 */
export function heightFromGrids(ringNZTM: number[][], dsm: NzGrid | null, dem: NzGrid | null): number | null {
  if (!dsm || !dem) return null;
  let e0 = Infinity, e1 = -Infinity, n0 = Infinity, n1 = -Infinity;
  for (const [e, n] of ringNZTM) { e0 = Math.min(e0, e); e1 = Math.max(e1, e); n0 = Math.min(n0, n); n1 = Math.max(n1, n); }
  const vals: number[] = []; let inside = 0;
  for (let e = Math.floor(e0) + 0.5; e < e1; e += 1) for (let n = Math.floor(n0) + 0.5; n < n1; n += 1) {
    if (!inRing(e, n, ringNZTM)) continue;
    const d = cellOf(dsm, e, n) - cellOf(dem, e, n);
    if (!(d === d)) continue;
    inside++; if (d > 2) vals.push(d);
  }
  if (!inside || vals.length < Math.max(2, inside * 0.25)) return null;
  vals.sort((a, b) => a - b);
  return Math.round(vals[Math.floor(vals.length * 0.8)] * 10) / 10;
}
/** the square of LiDAR to read for a list of outlines: its middle and half-width in metres (capped at 330, linz/ground.js reads 1 m cells) */
export function gridWindow(list: Outline[], cap = 330) {
  let e0 = Infinity, e1 = -Infinity, n0 = Infinity, n1 = -Infinity;
  for (const o of list) for (const [e, n] of o.rings[0]) { e0 = Math.min(e0, e); e1 = Math.max(e1, e); n0 = Math.min(n0, n); n1 = Math.max(n1, n); }
  if (!isFinite(e0)) return null;
  return { e: (e0 + e1) / 2, n: (n0 + n1) / 2, half: Math.min(cap, Math.ceil(Math.max(e1 - e0, n1 - n0) / 2) + 2) };
}

// ---- the finish, proposed by rule: what a New Zealand building of this size and shape is most often clad and roofed in -----
export const polyArea = (r: number[][]) => { let a = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += (r[j][0] + r[i][0]) * (r[j][1] - r[i][1]); return Math.abs(a) / 2; };
/** the smallest box round a ring, turned to the edge that gives it (rotating callipers over the ring's edges) */
export function orientedBox(r: number[][]) {
  let best = { area: Infinity, angle: 0, cx: 0, cz: 0, L: 0, W: 0 };
  for (let i = 0; i + 1 < r.length; i++) {
    const dx = r[i + 1][0] - r[i][0], dz = r[i + 1][1] - r[i][1], len = Math.hypot(dx, dz);
    if (len < 0.3) continue;
    const ux = dx / len, uz = dz / len;
    let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
    for (const [x, z] of r) { const a = x * ux + z * uz, b = -x * uz + z * ux; a0 = Math.min(a0, a); a1 = Math.max(a1, a); b0 = Math.min(b0, b); b1 = Math.max(b1, b); }
    const area = (a1 - a0) * (b1 - b0);
    if (area < best.area) {
      const ca = (a0 + a1) / 2, cb = (b0 + b1) / 2, long = a1 - a0 >= b1 - b0;
      best = { area, angle: Math.atan2(uz, ux) + (long ? 0 : Math.PI / 2), cx: ca * ux - cb * uz, cz: ca * uz + cb * ux, L: Math.max(a1 - a0, b1 - b0), W: Math.min(a1 - a0, b1 - b0) };
    }
  }
  return best;
}
export type Cladding = 'weatherboard' | 'brick';
export type RoofForm = 'gable' | 'hip' | 'low';
export interface Finish { cladding: Cladding; roof: RoofForm; pitchDeg: number; wall: number; roofColour: number; why: string }
// painted weatherboard: creams, whites, greys (no strong colour); roofs: charcoal, red oxide, grey, ironsand
export const WALL_PAINTS = [0xece6d8, 0xf1eee6, 0xe2dccd, 0xd8d4cb, 0xc9c6bf, 0xe8e1cf, 0xb9b8b2];
export const BRICK_TINTS = [0xffffff, 0xf2e6e0, 0xe6d6cf, 0xfaf0e8];
export const ROOF_PAINTS = [0x3a3c3e, 0x5e3a30, 0x76797a, 0x4a4643, 0x2f3133];
const hash = (s: string) => { let h = 2166136261 >>> 0; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; return h; };
/**
 * The finish for an existing building, proposed by rule (not surveyed): brick for institutional footprints (300 m² and more,
 * or a school, hospital or supermarket), painted weatherboard otherwise; a pitched roof (gable under 220 m², hip to 900 m²)
 * where the outline is near rectangular (at least 78% of its box), else a low longrun roof. Colours vary by the building's id,
 * from muted paints only.
 */
export function finishFor(o: { id: string; use: string | null }, ring: number[][]): Finish {
  const area = polyArea(ring), ob = orientedBox(ring), rect = ob.area > 0 ? area / ob.area : 0, h = hash(o.id || ring.flat().join(','));
  const inst = area >= 300 || /school|hospital|supermarket/i.test(o.use ?? '');
  const cladding: Cladding = inst ? 'brick' : 'weatherboard';
  const roof: RoofForm = area > 900 || rect < 0.78 || ob.W < 3 ? 'low' : area < 220 ? 'gable' : 'hip';
  const wall = inst ? BRICK_TINTS[h % BRICK_TINTS.length] : WALL_PAINTS[h % WALL_PAINTS.length];
  const roofColour = ROOF_PAINTS[(h >>> 8) % ROOF_PAINTS.length];
  const pitchDeg = roof === 'low' ? 3 : roof === 'gable' ? 25 : 22;
  const why = `${cladding === 'brick' ? 'brick, as larger institutional buildings often are' : 'painted weatherboard'}; ${roof === 'low' ? 'a low longrun roof' : `a ${pitchDeg}° ${roof} roof of corrugated iron`} (${Math.round(area)} m² outline, ${Math.round(rect * 100)}% of its box)`;
  return { cladding, roof, pitchDeg, wall, roofColour, why };
}

