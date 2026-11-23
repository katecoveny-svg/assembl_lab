// The rules behind the existing buildings (contextBuildings.ts), kept free of three.js so they are tested on their own.
// The site as it is now: the existing buildings round a model, from LINZ, modelled plainly. Each is its LINZ NZ Building Outline
// (CC BY 4.0) pushed up to the height LINZ's 1 m LiDAR surface model stands above its ground model inside that outline; where
// the surface model does not reach, the height is assumed and said so. Flat-topped blocks in a plain render: no roof form, no
// windows, nothing invented. Outlines read by this browser straight from LINZ's public service; the site point goes to LINZ only.

export const OUTLINES = 'https://services.arcgis.com/xdsHIIxuCWByZiCB/arcgis/rest/services/LINZ_NZ_Building_Outlines/FeatureServer/0';
export const OUTLINE_CREDIT = 'LINZ NZ Building Outlines, sourced from the LINZ Data Service and licensed for reuse under CC BY 4.0.';
export const ASSUMED_HEIGHT = 5;

export function outlinesUrl(lat: number, lon: number, radiusM = 220) {
  const p = new URLSearchParams({ geometry: `${lon},${lat}`, geometryType: 'esriGeometryPoint', inSR: '4326', distance: String(radiusM), units: 'esriSRUnit_Meter', spatialRel: 'esriSpatialRelIntersects',
    outFields: 'building_id,name,use_,Shape__Area', outSR: '2193', returnGeometry: 'true', f: 'json', resultRecordCount: '400' });
  return `${OUTLINES}/query?${p}`;
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

/** the outlines in the scene's frame (toScene: NZTM e, n to scene x, z), leaving out those under the model (keep: box) */
export function toSceneRings(list: Outline[], toScene: (e: number, n: number) => [number, number], keepOut: { x0: number; x1: number; z0: number; z1: number }) {
  const out: { o: Outline; ring: number[][] }[] = [];
  for (const o of list) {
    const ring = o.rings[0].map(([e, n]) => toScene(e, n));
    let cx = 0, cz = 0; for (const [x, z] of ring) { cx += x; cz += z; } cx /= ring.length; cz /= ring.length;
    if (cx > keepOut.x0 && cx < keepOut.x1 && cz > keepOut.z0 && cz < keepOut.z1) continue;
    out.push({ o, ring });
  }
  return out;
}

