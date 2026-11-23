// roof-solar · what the 3D view is drawn from. Plain arithmetic on LINZ's grids: no DOM, no three.js, no network.
//
// The sums (plan.mjs, pv.mjs) use the measured LiDAR surface and nothing else. This file only decides how the picture is drawn, and
// every shape it returns is read from the same LINZ data:
//   buildings  LINZ outline raised from the ground model (DTM) to a roof read from the surface model (DSM): planes fitted to the
//              surface where it is planar (the same detectPlanes the sums use), the surface itself where it is not
//   trees      a tree top is a local high point of the canopy height (surface minus ground, outside outlines); its top is the
//              measured top; its crown radius is how far the canopy stays above half that height. The crown base is assumed.
// A grid is { n, originE, originN, data } as in roof.mjs: cell (i, j) centre at east originE + i, north originN - j.
import { heightAt, inRings, planeZ, detectPlanes } from "./roof.mjs";

/** the share of a tree's height taken as bare trunk under the crown. LiDAR from above does not see it: an assumption, stated. */
export const CROWN_BASE = { tree: 0.32, shrub: 0.12 };

export function ringsBox(rings) { let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (const r of rings) for (const [x, y] of r) { if (x < a) a = x; if (x > c) c = x; if (y < b) b = y; if (y > d) d = y; } return [a, b, c, d]; }

/** nearest point on the outline to (e, n), its distance, and the unit normal of that edge pointing into the building */
export function nearestOnRings(e, n, rings) {
  let best = Infinity, pe = e, pn = n, ne = 0, nn = 0;
  for (const r of rings) for (let i = 0; i < r.length - 1; i++) {
    const [x1, y1] = r[i], [x2, y2] = r[i + 1], dx = x2 - x1, dy = y2 - y1, L = dx * dx + dy * dy, t = L ? Math.max(0, Math.min(1, ((e - x1) * dx + (n - y1) * dy) / L)) : 0;
    const qx = x1 + t * dx, qy = y1 + t * dy, d = Math.hypot(e - qx, n - qy);
    if (d < best) { best = d; pe = qx; pn = qy; const l = Math.sqrt(L) || 1; ne = -dy / l; nn = dx / l; }
  }
  if (!inRings(pe + ne * 0.05, pn + nn * 0.05, rings)) { ne = -ne; nn = -nn; }
  return { d: best, e: pe, n: pn, inE: ne, inN: nn };
}

/** a square piece of a grid round a box, padded; cells outside the source are NaN */
export function cropGrid(g, box, pad = 2) {
  const i0 = Math.floor(box[0] - pad - g.originE), j0 = Math.floor(g.originN - (box[3] + pad)), n = Math.max(Math.ceil(box[2] - box[0]), Math.ceil(box[3] - box[1])) + 2 * pad + 2, data = new Float32Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const si = i0 + i, sj = j0 + j; data[j * n + i] = si < 0 || sj < 0 || si >= g.n || sj >= g.n ? NaN : g.data[sj * g.n + si]; }
  return { n, originE: g.originE + i0, originN: g.originN - j0, data };
}

/**
 * The roof height function for one building, for drawing. `grid` is the grid the planes' cell indices refer to.
 * roofZ(e, n, qe, qn): the height at (e, n), with the plane chosen at (qe, qn), a point a little inside the outline (so eaves are not
 * dragged down by LiDAR cells that straddle the wall). Of the planes within one cell of q (two, if none is that close), the one closest to the surface there wins;
 * that gives crisp ridges where two planes meet. Where no plane is near, the measured surface itself is drawn.
 */
export function roofHeights(dsm, grid, planes, rings = null) {
  const own = new Int32Array(grid.n * grid.n).fill(-1); planes.forEach((p, i) => { for (const k of p.cells) own[k] = i; });
  const sm = rings ? roofSurface(dsm, rings) : dsm;
  return (e, n, qe = e, qn = n) => {
    let ds = heightAt(sm, qe, qn); if (ds !== ds) ds = heightAt(sm, e, n); if (ds !== ds) ds = heightAt(dsm, e, n);
    const ci = Math.round(qe - grid.originE), cj = Math.round(grid.originN - qn); let best = null, bd = Infinity;
    for (let w = 1; w <= 2 && !best; w++) for (let dj = -w; dj <= w; dj++) for (let di = -w; di <= w; di++) {
      const i = ci + di, j = cj + dj; if (i < 0 || j < 0 || i >= grid.n || j >= grid.n) continue; const id = own[j * grid.n + i]; if (id < 0) continue;
      const p = planes[id], d = Math.abs(planeZ(p, qe, qn) - (ds === ds ? ds : planeZ(p, qe, qn))); if (d < bd && d < (w === 1 ? 1.2 : 0.6)) { bd = d; best = p; }
    }
    if (best) return { z: planeZ(best, e, n), plane: best };
    return { z: ds, plane: null };
  };
}

/**
 * The surface inside one outline, steadied for drawing: each cell inside becomes the median of the inside cells round it (so a lone
 * high or low return does not spike the roof), and cells just outside take the nearest inside value (so the eaves are not dragged down
 * by cells that straddle the wall). Drawing only.
 */
export function roofSurface(dsm, rings) {
  const g = cropGrid(dsm, ringsBox(rings), 2), N = g.n, inside = new Uint8Array(N * N), out = new Float32Array(N * N).fill(NaN);
  for (let k = 0; k < N * N; k++) if (g.data[k] === g.data[k] && inRings(g.originE + (k % N), g.originN - Math.floor(k / N), rings)) inside[k] = 1;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = j * N + i; if (!inside[k]) continue; const v = [];
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const ii = i + di, jj = j + dj; if (ii >= 0 && jj >= 0 && ii < N && jj < N && inside[jj * N + ii]) v.push(g.data[jj * N + ii]); }
    v.sort((a, b) => a - b); out[k] = v[v.length >> 1];
  }
  for (let pass = 0; pass < 2; pass++) { const prev = out.slice(); for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const k = j * N + i; if (prev[k] === prev[k]) continue; let s = 0, c = 0; for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const ii = i + di, jj = j + dj; if (ii >= 0 && jj >= 0 && ii < N && jj < N && prev[jj * N + ii] === prev[jj * N + ii]) { s += prev[jj * N + ii]; c++; } } if (c) out[k] = s / c; } }
  return { n: N, originE: g.originE, originN: g.originN, data: out };
}

/**
 * The roof of one building, for drawing: the planes the sums fitted (if any, kept as they are), plus planes found with a looser test in the
 * cells they do not cover (narrow aisles, porches, small roofs), so those draw as planes too rather than as lumpy surface.
 * Drawing only: the sums never see the looser planes.
 * @returns {{ roofAt, planes, grid }}  planes' cells index `grid`, a small crop of the surface round the outline
 */
export function drawRoof(dsm, rings, sumPlanes = null, sumGrid = null) {
  const crop = cropGrid(dsm, ringsBox(rings)), N = crop.n, kept = [], taken = new Uint8Array(N * N);
  for (const p of sumPlanes || []) {
    const cells = []; for (const k of p.cells) { const i = Math.round(sumGrid.originE + (k % sumGrid.n) - crop.originE), j = Math.round(crop.originN - (sumGrid.originN - Math.floor(k / sumGrid.n))); if (i >= 0 && j >= 0 && i < N && j < N) { cells.push(j * N + i); taken[j * N + i] = 1; } }
    if (cells.length) kept.push({ ...p, cells });
  }
  let loose = []; try { loose = detectPlanes(crop, rings, { planarRms: 0.25, angleDeg: 11, band: 0.3, minCells: 4 }).planes; } catch { loose = []; }
  for (const p of loose) { const free = p.cells.filter((k) => !taken[k]); if (free.length >= Math.max(4, p.cells.length * 0.7)) { kept.push({ ...p, cells: free }); for (const k of free) taken[k] = 1; } }
  return { roofAt: roofHeights(dsm, crop, kept, rings), planes: kept, grid: crop };
}

/**
 * The highest a drawn roof goes, so a tree that overhangs a building is not drawn as part of its walls: the top of the fitted planes plus
 * 1.5 m (room for chimneys and ridges), or with no planes the 90th percentile of the surface inside the outline plus 1 m.
 * Drawing only; the sums keep every measured cell.
 */
export function roofCap(dsm, rings, planes, grid) {
  if (planes.length) { let top = -Infinity; for (const p of planes) for (const k of p.cells) { const z = planeZ(p, grid.originE + (k % grid.n), grid.originN - Math.floor(k / grid.n)); if (z > top) top = z; } return top + 1.5; }
  const box = ringsBox(rings), v = [];
  for (let n = Math.ceil(box[1]); n <= box[3]; n++) for (let e = Math.ceil(box[0]); e <= box[2]; e++) if (inRings(e, n, rings)) { const z = heightAt(dsm, e, n); if (z === z) v.push(z); }
  if (!v.length) return Infinity; v.sort((a, b) => a - b); return v[Math.min(v.length - 1, Math.floor(v.length * 0.9))] + 1;
}

/** cells covered by a building, or within `pad` metres of one: 1, else 0 */
export function buildingMask(g, buildings, pad = 1) {
  const N = g.n, m = new Uint8Array(N * N);
  for (const b of buildings) {
    const box = ringsBox(b.rings), i0 = Math.max(0, Math.floor(box[0] - pad - g.originE)), i1 = Math.min(N - 1, Math.ceil(box[2] + pad - g.originE)), j0 = Math.max(0, Math.floor(g.originN - box[3] - pad)), j1 = Math.min(N - 1, Math.ceil(g.originN - box[1] + pad));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const e = g.originE + i, n = g.originN - j; if (inRings(e, n, b.rings) || nearestOnRings(e, n, b.rings).d <= pad) m[j * N + i] = 1; }
  }
  return m;
}

/** canopy height: surface minus ground, outside buildings (and a metre round them), never below zero; NaN-safe */
export function canopyHeight(dsm, dem, mask) {
  const N = dsm.n, out = new Float32Array(N * N);
  for (let k = 0; k < N * N; k++) { const s = dsm.data[k], g = dem.data[k]; out[k] = mask[k] || s !== s || g !== g ? 0 : Math.max(0, s - g); }
  return out;
}

/**
 * Trees and shrubs from the canopy height. Each is { e, n, ground, top, height, radius, base, kind }:
 *   top     the highest measured surface in the 3 x 3 cells round the high point (metres, NZVD2016) — measured
 *   radius  mean distance, over eight directions, at which the smoothed canopy falls under half the height or rises into the next tree — measured
 *   base    where the crown starts: ground + height x CROWN_BASE — assumed
 * @param o { minHeight 1.5, maxTrees 600, centre {e,n}, radius (metres; keep only those within) }
 */
export function canopyTrees(dsm, dem, buildings, o = {}) {
  const { minHeight = 1.5, maxTrees = 600, centre = null, radius = Infinity } = o, N = dsm.n;
  const mask = buildingMask(dsm, buildings, 1), chm = canopyHeight(dsm, dem, mask), S = new Float32Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { let s = 0, c = 0; for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const ii = i + di, jj = j + dj; if (ii >= 0 && jj >= 0 && ii < N && jj < N) { s += chm[jj * N + ii]; c++; } } S[j * N + i] = s / c; }
  const out = [], dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  for (let j = 1; j < N - 1; j++) for (let i = 1; i < N - 1; i++) {
    const k = j * N + i, h = S[k]; if (h < minHeight || mask[k]) continue;
    const w = h < 6 ? 1 : h < 12 ? 2 : 3; let top = true;
    for (let dj = -w; dj <= w && top; dj++) for (let di = -w; di <= w; di++) { if (!di && !dj) continue; const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= N || jj >= N) continue; const q = jj * N + ii; if (S[q] > h || (S[q] === h && q < k)) { top = false; break; } }
    if (!top) continue;
    const e = dsm.originE + i, n = dsm.originN - j; if (centre && Math.hypot(e - centre.e, n - centre.n) > radius) continue;
    let zTop = -Infinity; for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const q = (j + dj) * N + i + di; if (!mask[q] && dsm.data[q] === dsm.data[q]) zTop = Math.max(zTop, dsm.data[q]); }
    const ground = heightAt(dem, e, n); if (!(zTop > -Infinity) || ground !== ground) continue;
    let rs = 0;
    for (const [dx, dy] of dirs) { const step = Math.hypot(dx, dy); let s = 1, prev = h; for (; s <= 9; s++) { const ii = i + dx * s, jj = j + dy * s; if (ii < 0 || jj < 0 || ii >= N || jj >= N) break; const q = jj * N + ii; if (mask[q] || S[q] < 0.5 * h || S[q] > prev + 0.4) break; prev = S[q]; } rs += Math.max(0.8, (s - 0.5) * step); }
    const height = zTop - ground, kind = height < 3.5 ? "shrub" : "tree";
    out.push({ e, n, ground, top: zTop, height, radius: Math.min(9, rs / 8), base: ground + height * CROWN_BASE[kind], kind });
  }
  out.sort((a, b) => b.height - a.height);
  return out.slice(0, maxTrees);
}
