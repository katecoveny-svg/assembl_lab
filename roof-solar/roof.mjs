// roof-solar · finding roof planes in LiDAR heights and laying panels on them. Plain arithmetic: no DOM, no network.
//
// The heights are LINZ's 1 m LiDAR surface model (DSM): a square grid of cells, one per metre, north-up.
//   cell (i, j) has its centre at east = originE + i, north = originN - j, and covers one metre either side of that.
// A grid here is { n, originE, originN, data: Float32Array } with NaN where LINZ has no height.
// Everything in this file is a proposal read from those cells: a roof plane is a flat patch the cells agree on, a panel is a rectangle
// that fits inside one. People confirm it; none of it is a survey.
const RAD = Math.PI / 180, DEG = 180 / Math.PI;

export const cellIndex = (g, e, n) => { const i = Math.round(e - g.originE), j = Math.round(g.originN - n); return i < 0 || j < 0 || i >= g.n || j >= g.n ? -1 : j * g.n + i; };
/** bilinear height between the four nearest cell centres; NaN outside the grid or next to a cell with no height */
export function heightAt(g, e, n) {
  const fx = e - g.originE, fy = g.originN - n, i = Math.floor(fx), j = Math.floor(fy);
  if (i < 0 || j < 0 || i >= g.n - 1 || j >= g.n - 1) return NaN;
  const a = fx - i, b = fy - j, H = g.data, k = j * g.n + i;
  return (H[k] * (1 - a) + H[k + 1] * a) * (1 - b) + (H[k + g.n] * (1 - a) + H[k + g.n + 1] * a) * b;
}
/** is the point inside the polygon (outer ring first, then holes), all in the same flat coordinates */
export function inRings(e, n, rings) {
  let inside = false;
  for (const r of rings) for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [xi, yi] = r[i], [xj, yj] = r[j];
    if ((yi > n) !== (yj > n) && e < ((xj - xi) * (n - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// ---- least squares plane z = a x + b y + c about a centre ------------------------------------------------------------------------
export function fitPlane(pts, e0, n0) {
  let sx = 0, sy = 0, sz = 0, sxx = 0, sxy = 0, syy = 0, sxz = 0, syz = 0; const N = pts.length;
  for (const [e, n, z] of pts) { const x = e - e0, y = n - n0; sx += x; sy += y; sz += z; sxx += x * x; sxy += x * y; syy += y * y; sxz += x * z; syz += y * z; }
  // normal equations [sxx sxy sx; sxy syy sy; sx sy N] [a b c] = [sxz syz sz]
  const M = [[sxx, sxy, sx, sxz], [sxy, syy, sy, syz], [sx, sy, N, sz]];
  for (let c = 0; c < 3; c++) {
    let p = c; for (let r = c + 1; r < 3; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-9) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < 3; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k < 4; k++) M[r][k] -= f * M[c][k]; }
  }
  const a = M[0][3] / M[0][0], b = M[1][3] / M[1][1], c = M[2][3] / M[2][2];
  let ss = 0; for (const [e, n, z] of pts) { const r = z - (a * (e - e0) + b * (n - n0) + c); ss += r * r; }
  return { a, b, c, e0, n0, rms: Math.sqrt(ss / N) };
}
export const planeZ = (p, e, n) => p.a * (e - p.e0) + p.b * (n - p.n0) + p.c;
/** pitch and the compass bearing the roof faces (the way water runs off), plus the unit normal (east, north, up) */
export function planeAngles(p) {
  const g = Math.hypot(p.a, p.b), pitch = Math.atan(g) * DEG;
  const az = g < 1e-6 ? 0 : (Math.atan2(-p.a, -p.b) * DEG + 360) % 360;
  const len = Math.hypot(p.a, p.b, 1), normal = [-p.a / len, -p.b / len, 1 / len];
  return { pitch, azimuth: az, normal };
}

/**
 * Roof planes inside a building outline.
 * @param dsm   the LiDAR surface grid
 * @param rings the building outline as rings of [east, north] metres (same grid as the cells)
 * @param o     { planarRms 0.15 m: how flat a 3x3 patch must be to seed a plane; angleDeg 8: how far two patches' slopes may differ; band 0.22 m: how far a cell may sit
 *                from its plane; minCells 6: smallest plane worth keeping }
 * @returns {{planes: object[], inside: number, cellsInPlanes: number}} each plane: { id, cells[], areaPlanM2, areaRoofM2, pitch, azimuth, normal, a,b,c,e0,n0, rms, centre:[e,n] }
 */
export function detectPlanes(dsm, rings, o = {}) {
  const { planarRms = 0.15, angleDeg = 8, band = 0.22, minCells = 6 } = o, N = dsm.n, H = dsm.data;
  const E = (i) => dsm.originE + (i % N), Nn = (i) => dsm.originN - Math.floor(i / N);
  const inside = new Uint8Array(N * N); let nIn = 0;
  for (let k = 0; k < N * N; k++) if (H[k] === H[k] && inRings(E(k), Nn(k), rings)) { inside[k] = 1; nIn++; }
  // each cell's own slope, from the inside cells of its 3x3 neighbourhood
  const loc = new Array(N * N).fill(null);
  for (let k = 0; k < N * N; k++) {
    if (!inside[k]) continue; const i = k % N, j = (k / N) | 0, pts = [];
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= N || jj >= N) continue; const q = jj * N + ii; if (inside[q]) pts.push([E(q), Nn(q), H[q]]); }
    if (pts.length < 7) continue;
    const f = fitPlane(pts, E(k), Nn(k)); if (f && f.rms <= planarRms) loc[k] = f;
  }
  const maxAng = angleDeg * RAD, assigned = new Int32Array(N * N).fill(-1), planes = [];
  const seeds = []; for (let k = 0; k < N * N; k++) if (loc[k]) seeds.push(k); seeds.sort((p, q) => loc[p].rms - loc[q].rms);
  const nb8 = (k) => { const i = k % N, j = (k / N) | 0, r = []; for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { if (!di && !dj) continue; const ii = i + di, jj = j + dj; if (ii >= 0 && jj >= 0 && ii < N && jj < N) r.push(jj * N + ii); } return r; };
  const angleBetween = (p, q) => { const lp = Math.hypot(p.a, p.b, 1), lq = Math.hypot(q.a, q.b, 1); return Math.acos(Math.min(1, (p.a * q.a + p.b * q.b + 1) / (lp * lq))); };
  for (const s of seeds) {
    if (assigned[s] >= 0) continue;
    const id = planes.length, cells = [s]; assigned[s] = id; const seed = loc[s];
    for (let h = 0; h < cells.length; h++) for (const q of nb8(cells[h])) if (assigned[q] < 0 && loc[q] && angleBetween(seed, loc[q]) <= maxAng) { assigned[q] = id; cells.push(q); }
    let plane = fitPlane(cells.map((k) => [E(k), Nn(k), H[k]]), E(s), Nn(s));
    // grow and tighten: any inside cell within the band of the fitted plane, joined to the patch, belongs to it
    for (let pass = 0; pass < 3 && plane; pass++) {
      const keep = new Set(cells.filter((k) => Math.abs(H[k] - planeZ(plane, E(k), Nn(k))) <= band));
      const out = [...keep]; for (let h = 0; h < out.length; h++) for (const q of nb8(out[h])) if (!keep.has(q) && inside[q] && (assigned[q] < 0 || assigned[q] === id) && Math.abs(H[q] - planeZ(plane, E(q), Nn(q))) <= band) { keep.add(q); out.push(q); }
      for (const k of cells) if (!keep.has(k)) assigned[k] = -1;
      cells.length = 0; for (const k of keep) { assigned[k] = id; cells.push(k); }
      if (cells.length >= 3) plane = fitPlane(cells.map((k) => [E(k), Nn(k), H[k]]), plane.e0, plane.n0); else plane = null;
    }
    if (!plane || cells.length < minCells) { for (const k of cells) assigned[k] = -1; planes.push(null); continue; }
    planes.push({ id, cells, plane });
  }
  const out = [];
  for (const p of planes) {
    if (!p) continue; const ang = planeAngles(p.plane); let se = 0, sn = 0; for (const k of p.cells) { se += E(k); sn += Nn(k); }
    const cosB = Math.cos(ang.pitch * RAD);
    out.push({ id: out.length, cells: p.cells, areaPlanM2: p.cells.length, areaRoofM2: p.cells.length / cosB, pitch: ang.pitch, azimuth: ang.azimuth, normal: ang.normal, a: p.plane.a, b: p.plane.b, c: p.plane.c, e0: p.plane.e0, n0: p.plane.n0, rms: p.plane.rms, centre: [se / p.cells.length, sn / p.cells.length] });
  }
  out.sort((x, y) => y.cells.length - x.cells.length); out.forEach((p, i) => (p.id = i));
  return { planes: out, inside: nIn, cellsInPlanes: out.reduce((s, p) => s + p.cells.length, 0) };
}

// ---- panels ------------------------------------------------------------------------------------------------------------------------
/** the panel assumed throughout: a 430 W, 1.134 m x 1.762 m module (21.5 %), the common size for a house roof in 2026. A stated assumption, not a product. */
export const PANEL = { w: 1.134, l: 1.762, watts: 430, standoff: 0.12, gap: 0.02 };
/**
 * Fit panels on one plane. Rows run across the slope; each rectangle (plus a margin) must lie on cells that belong to the plane.
 * Tries portrait and landscape and a grid of start offsets and keeps the layout with the most panels.
 * @returns {object[]} panels: { plane, e, n, z, normal, azimuth, tilt, across, along (metres on the roof), landscape, corners[4][e,n,z] }
 */
export function layoutPanels(dsm, plane, o = {}) {
  const { margin = 0.25, panel = PANEL } = o, N = dsm.n, cosB = Math.cos(Math.atan(Math.hypot(plane.a, plane.b)));
  const member = new Uint8Array(N * N); for (const k of plane.cells) member[k] = 1;
  const az = plane.azimuth * RAD, down = [Math.sin(az), Math.cos(az)], across = [Math.cos(az), -Math.sin(az)];
  const toXY = (s, t) => [plane.centre[0] + across[0] * s + down[0] * t, plane.centre[1] + across[1] * s + down[1] * t];
  let sMin = Infinity, sMax = -Infinity, tMin = Infinity, tMax = -Infinity;
  for (const k of plane.cells) { const e = dsm.originE + (k % N) - plane.centre[0], n = dsm.originN - Math.floor(k / N) - plane.centre[1], s = e * across[0] + n * across[1], t = e * down[0] + n * down[1]; if (s < sMin) sMin = s; if (s > sMax) sMax = s; if (t < tMin) tMin = t; if (t > tMax) tMax = t; }
  sMin -= 0.5; sMax += 0.5; tMin -= 0.5; tMax += 0.5;
  const fits = (s, t, hw, hl) => { // hw: half width across, hl: half length along the plan; the margin widens it
    const W = hw + margin, L = hl + margin;
    for (let a = 0; a <= 4; a++) for (let b = 0; b <= 4; b++) { const [e, n] = toXY(s - W + (2 * W * a) / 4, t - L + (2 * L * b) / 4), k = cellIndex(dsm, e, n); if (k < 0 || !member[k]) return false; }
    return true;
  };
  let best = [];
  for (const landscape of [false, true]) {
    const w = landscape ? panel.l : panel.w, lSlope = landscape ? panel.w : panel.l, lp = lSlope * cosB;
    for (let s0 = 0; s0 < w + panel.gap; s0 += 0.25) for (let t0 = 0; t0 < lp + panel.gap; t0 += 0.25) {
      const got = [];
      for (let t = tMin + t0 + lp / 2; t + lp / 2 <= tMax; t += lp + panel.gap) for (let s = sMin + s0 + w / 2; s + w / 2 <= sMax; s += w + panel.gap) if (fits(s, t, w / 2, lp / 2)) got.push({ s, t, w, lSlope, lp, landscape });
      if (got.length > best.length) best = got;
    }
  }
  const ang = { pitch: plane.pitch, azimuth: plane.azimuth }, tilt = ang.pitch;
  return best.map((p) => {
    const [e, n] = toXY(p.s, p.t), z = planeZ(plane, e, n) + panel.standoff / cosB;
    const corner = (ds, dt) => { const [ce, cn] = toXY(p.s + ds, p.t + dt); return [ce, cn, planeZ(plane, ce, cn) + panel.standoff / cosB]; };
    return { plane: plane.id, e, n, z, normal: plane.normal, azimuth: ang.azimuth, tilt, across: p.w, along: p.lSlope, landscape: p.landscape, watts: panel.watts,
      corners: [corner(-p.w / 2, -p.lp / 2), corner(p.w / 2, -p.lp / 2), corner(p.w / 2, p.lp / 2), corner(-p.w / 2, p.lp / 2)] };
  });
}
