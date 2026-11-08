#!/usr/bin/env node
// assembl lab · bakes the "Supermarket order to doorstep" sim's map: about 8 km of Auckland's eastern suburbs around the
// supermarket twin's example site, as a point cloud, plus a street graph for the van's route.
//
//   node tools/pointcloud/bake-delivery.mjs [--cache DIR]
//   → assets/models/delivery/delivery-points.bin (+ delivery-points.json: bounds, anchors, the route, sources, counts)
//
// Sources (all open, no API key; see assets/models/delivery/SOURCE.md):
//   Terrain     AWS Terrain Tiles (Terrarium PNG, zoom 14, ≈7.6 m), https://registry.opendata.aws/terrain-tiles/. In New Zealand
//               their source is LINZ's 8 m DEM, CC BY 4.0. height = R·256 + G + B/256 − 32768 metres.
//   Map         OpenStreetMap roads, rail, water and building footprints with heights, from OpenFreeMap's vector tiles
//               (OpenMapTiles schema, zoom 14). © OpenStreetMap contributors, ODbL; tiles © OpenMapTiles.
//
// The site: the same supermarket site the lab home's twin pin uses (assets/models/auckland/auckland-points.json, sites.store).
// No name is ever read or written: the bake decodes only geometry, road and building classes and heights. The six households
// are fictional: each is a point part-way along a real local street (never a house, never a number). The van's route is the
// shortest drive over the street graph through the six, in the best order; it ignores one-way rules and turns (Illustrative).
//
// Per point (8 bytes, little-endian, interleaved, weighted random order so any prefix is a fair sample): x, y, z as uint16 over
// the header's bounds, light (0–255 → 0–1) and kind (0 surface, 1 edge, 2 ground, 3 highlight), as lab/pc/engine.js forms.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fetchCached, decodePNG, decodeMVT, lon2x, lat2y } from "./geo-tiles.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, "../..");
const OUT = path.join(ROOT, "assets/models/delivery");
const argCache = process.argv.indexOf("--cache");
const CACHE = argCache > 0 ? process.argv[argCache + 1] : path.join(HERE, ".cache");

// ------------------------------------------------------------------------------------------------ the area and the budget
// the store site from the lab home's bake (coordinates only), with about 3.7 km of streets around it on every side
const AKL = JSON.parse(fs.readFileSync(path.join(ROOT, "assets/models/auckland/auckland-points.json"), "utf8"));
const SITE = AKL.sites.store.lonlat;                                   // [lon, lat]
const HALF = 3700;                                                     // metres from the site to each edge
const VERTICAL = 3;                                                    // heights exaggerated 3× (terrain and buildings)
const SIZE = 2.1, TOTAL = 300000;
const SHARE = { land: 0.17, contour: 0.06, coast: 0.08, sea: 0.06, road: 0.29, rail: 0.012, building: 0.29, store: 0.028 };
const DEM_Z = 14, VEC_Z = 14, MASK_RES = 256;
const TERRARIUM = (z, x, y) => `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;

const lat0 = SITE[1], lon0 = SITE[0];
const M_LON = 111320 * Math.cos((lat0 * Math.PI) / 180), M_LAT = 110574;
const BOUNDS = { west: lon0 - HALF / M_LON, east: lon0 + HALF / M_LON, south: lat0 - HALF / M_LAT, north: lat0 + HALF / M_LAT };
const WIDTH = 2 * HALF, DEPTH = 2 * HALF, S = SIZE / Math.max(WIDTH, DEPTH);
const toM = (lon, lat) => [(lon - lon0) * M_LON, (lat0 - lat) * M_LAT];    // x east, z south (−z is north), metres
const toLL = (x, z) => [lon0 + x / M_LON, lat0 - z / M_LAT];

let seed = 20261109;
const rnd = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };

// ------------------------------------------------------------------------------------------------ terrain
const dx0 = Math.floor(lon2x(BOUNDS.west, DEM_Z)), dx1 = Math.floor(lon2x(BOUNDS.east, DEM_Z)), dy0 = Math.floor(lat2y(BOUNDS.north, DEM_Z)), dy1 = Math.floor(lat2y(BOUNDS.south, DEM_Z));
const DW = (dx1 - dx0 + 1) * 256, DH = (dy1 - dy0 + 1) * 256, DEM = new Float32Array(DW * DH);
for (let tx = dx0; tx <= dx1; tx++) for (let ty = dy0; ty <= dy1; ty++) {
  const { w, h, rgb } = decodePNG(fetchCached(TERRARIUM(DEM_Z, tx, ty), CACHE));
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const k = (j * w + i) * 3; DEM[((ty - dy0) * 256 + j) * DW + (tx - dx0) * 256 + i] = rgb[k] * 256 + rgb[k + 1] + rgb[k + 2] / 256 - 32768; }
}
console.log(`terrain: ${(dx1 - dx0 + 1) * (dy1 - dy0 + 1)} tiles, ${DW}×${DH}`);
const demAt = (lon, lat) => {
  const gx = (lon2x(lon, DEM_Z) - dx0) * 256 - 0.5, gy = (lat2y(lat, DEM_Z) - dy0) * 256 - 0.5, x = Math.floor(gx), y = Math.floor(gy), fx = gx - x, fy = gy - y;
  const g = (i, j) => DEM[clamp(j, 0, DH - 1) * DW + clamp(i, 0, DW - 1)];
  return (g(x, y) * (1 - fx) + g(x + 1, y) * fx) * (1 - fy) + (g(x, y + 1) * (1 - fx) + g(x + 1, y + 1) * fx) * fy;
};
const landH = (lon, lat) => Math.max(0.6, demAt(lon, lat));
const hAt = (x, z) => landH(...toLL(x, z));

// ------------------------------------------------------------------------------------------------ vector tiles
const tilejson = JSON.parse(fetchCached("https://tiles.openfreemap.org/planet", CACHE).toString());
const VEC = tilejson.tiles[0];
const vx0 = Math.floor(lon2x(BOUNDS.west, VEC_Z)), vx1 = Math.floor(lon2x(BOUNDS.east, VEC_Z)), vy0 = Math.floor(lat2y(BOUNDS.north, VEC_Z)), vy1 = Math.floor(lat2y(BOUNDS.south, VEC_Z));
const MW = (vx1 - vx0 + 1) * MASK_RES, MH = (vy1 - vy0 + 1) * MASK_RES, MASK = new Uint8Array(MW * MH);   // 0 land, 1 sea, 2 lake
const coastSegs = [], buildings = [], roads = [], rails = [];
const tileLL = (tx, ty, ext, x, y) => { const X = tx + x / ext, Y = ty + y / ext, n = Math.PI - (2 * Math.PI * Y) / 2 ** VEC_Z; return [(X / 2 ** VEC_Z) * 360 - 180, (180 / Math.PI) * Math.atan(Math.sinh(n))]; };
// a line clipped to the tile's own square (the tiler adds a buffer; clipping at exactly 0..ext makes neighbouring tiles meet)
function clipLine(pts, ext) {
  const out = []; let cur = null;
  const inside = ([x, y]) => x >= 0 && y >= 0 && x <= ext && y <= ext;
  const cut = (a, b) => {                               // Liang–Barsky on the square
    let t0 = 0, t1 = 1; const dx = b[0] - a[0], dy = b[1] - a[1];
    for (const [p, q] of [[-dx, a[0]], [dx, ext - a[0]], [-dy, a[1]], [dy, ext - a[1]]]) {
      if (p === 0) { if (q < 0) return null; continue; } const r = q / p; if (p < 0) { if (r > t1) return null; if (r > t0) t0 = r; } else { if (r < t0) return null; if (r < t1) t1 = r; }
    }
    return [[a[0] + dx * t0, a[1] + dy * t0], [a[0] + dx * t1, a[1] + dy * t1]];
  };
  for (let i = 0; i + 1 < pts.length; i++) {
    const c = cut(pts[i], pts[i + 1]); if (!c) { cur = null; continue; }
    if (!cur || cur[cur.length - 1][0] !== c[0][0] || cur[cur.length - 1][1] !== c[0][1]) { cur = [c[0]]; out.push(cur); }
    cur.push(c[1]); if (!inside(pts[i + 1])) cur = null;
  }
  return out.filter((l) => l.length > 1);
}
const ROAD = { motorway: [0.9, 9, 0.2], trunk: [0.86, 8, 0.75], primary: [0.82, 7, 0.78], secondary: [0.76, 6, 0.84], tertiary: [0.68, 5, 0.9], minor: [0.5, 3.5, 1], service: [0.3, 2, 3] };   // light, half width (m), route cost factor
for (let tx = vx0; tx <= vx1; tx++) for (let ty = vy0; ty <= vy1; ty++) {
  const t = decodeMVT(fetchCached(VEC.replace("{z}", VEC_Z).replace("{x}", tx).replace("{y}", ty), CACHE), ["water", "building", "transportation"]);
  for (const f of t.water?.features || []) {
    if (f.type !== 3 || f.props.class === "swimming_pool") continue;
    const ext = t.water.extent, v = /lake|pond/.test(f.props.class) ? 2 : 1, rings = f.parts.map((r) => r.map(([x, y]) => [(x / ext) * MASK_RES, (y / ext) * MASK_RES]));
    const ox = (tx - vx0) * MASK_RES, oy = (ty - vy0) * MASK_RES;
    for (let j = 0; j < MASK_RES; j++) {
      const yc = j + 0.5, xs = [];
      for (const r of rings) for (let k = 0; k + 1 < r.length; k++) { const [ax, ay] = r[k], [bx, by] = r[k + 1]; if ((ay <= yc) !== (by <= yc)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax)); }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) for (let i = Math.max(0, Math.ceil(xs[k] - 0.5)); i <= Math.min(MASK_RES - 1, Math.floor(xs[k + 1] - 0.5)); i++) MASK[(oy + j) * MW + ox + i] = v;
    }
    const onCut = (x, y) => x <= 0 || y <= 0 || x >= ext || y >= ext;
    for (const r of f.parts) for (let k = 0; k + 1 < r.length; k++) {
      const [ax, ay] = r[k], [bx, by] = r[k + 1]; if (onCut(ax, ay) && onCut(bx, by)) continue;
      coastSegs.push({ a: tileLL(tx, ty, ext, ax, ay), b: tileLL(tx, ty, ext, bx, by), lake: v === 2, ext, ta: [ax, ay], tb: [bx, by] });
    }
  }
  for (const f of t.building?.features || []) {
    if (f.type !== 3 || f.props.hide_3d) continue;
    const ext = t.building.extent, area = (r) => { let a = 0; for (let i = 0; i + 1 < r.length; i++) a += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]; return a; };
    const sign = Math.sign(area(f.parts[0] || [])) || 1; let cur = null;
    for (const r of f.parts) {
      if (r.length < 4) continue;
      if (Math.sign(area(r)) === sign || !cur) { cur = { rings: [], tileRings: [], ext, h: Math.max(4, f.props.render_height ?? 6), h0: f.props.render_min_height ?? 0 }; buildings.push(cur); }
      cur.rings.push(r.map(([x, y]) => toM(...tileLL(tx, ty, ext, x, y)))); cur.tileRings.push(r);
    }
  }
  for (const f of t.transportation?.features || []) {
    if (f.type !== 2) continue; const c = f.props.class, ext = t.transportation.extent;
    if (f.props.brunnel === "tunnel") continue;
    const isRail = c === "rail" || c === "transit"; if (!ROAD[c] && !isRail) continue;
    for (const part of f.parts) for (const line of clipLine(part, ext)) {
      const m = line.map(([x, y]) => toM(...tileLL(tx, ty, ext, x, y)));
      if (isRail) rails.push(m); else roads.push({ cls: c, ramp: !!f.props.ramp, pts: m });
    }
  }
}
console.log(`vector tiles: ${(vx1 - vx0 + 1) * (vy1 - vy0 + 1)}, ${coastSegs.length} shore segments, ${buildings.length} buildings, ${roads.length} road lines, ${rails.length} rail lines`);
const maskAt = (lon, lat) => { const i = Math.floor((lon2x(lon, VEC_Z) - vx0) * MASK_RES), j = Math.floor((lat2y(lat, VEC_Z) - vy0) * MASK_RES); return i < 0 || j < 0 || i >= MW || j >= MH ? 1 : MASK[j * MW + i]; };
const maskM = (x, z) => maskAt(...toLL(x, z));

// ------------------------------------------------------------------------------------------------ the point set
const pts = { x: [], y: [], z: [], l: [], k: [], w: [] };
const KIND = { surface: 0, edge: 1, ground: 2, highlight: 3 };
// the map dissolves at its edges into the plum ground: a soft, rounded falloff, no box
const edgeFade = (x, z) => { const u = Math.abs(x) / HALF, v = Math.abs(z) / HALF, d = Math.pow(Math.pow(u, 3.2) + Math.pow(v, 3.2), 1 / 3.2); return 1 - smooth(0.78, 1.0, d); };
function put(xm, ym, zm, light, kind, weight = 1) {
  const f = edgeFade(xm, zm); if (f <= 0 || rnd() > Math.pow(f, 0.7)) return false;
  pts.x.push(xm * S); pts.y.push(ym * VERTICAL * S); pts.z.push(zm * S); pts.l.push(clamp(light * (0.55 + 0.45 * f))); pts.k.push(kind); pts.w.push(weight); return true;
}
const KEY = (() => { const v = [-0.45, 0.8, 0.55], n = Math.hypot(...v); return v.map((c) => c / n); })();
const randXZ = () => [(rnd() - 0.5) * WIDTH, (rnd() - 0.5) * DEPTH];
const pickCum = (cum, u) => { let lo = 0, hi = cum.length - 1; while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] < u) lo = mid + 1; else hi = mid; } return lo; };

// land: lit by the key light, higher ground a little brighter; kept low so the streets read over it
{
  const want = Math.round(TOTAL * SHARE.land), e = 10; let n = 0, guard = 0;
  while (n < want && guard++ < want * 40) {
    const [x, z] = randXZ(), m = maskM(x, z); if (m === 1) continue;
    const h = hAt(x, z), gx = ((hAt(x + e, z) - h) / e) * VERTICAL, gz = ((hAt(x, z + e) - h) / e) * VERTICAL, nl = Math.hypot(gx, 1, gz), nx = -gx / nl, ny = 1 / nl, nz = -gz / nl;
    const lit = Math.max(0, nx * KEY[0] + ny * KEY[1] + nz * KEY[2]);
    const L = m === 2 ? 0.2 : 0.12 + 0.36 * Math.pow(lit, 1.4) + 0.18 * smooth(5, 90, h);
    if (put(x, m === 2 ? h - 0.4 : h, z, L, KIND.surface, 0.8)) n++;
  }
}
// contours every 10 m (gentle ground: the volcanic cones and ridges of the eastern suburbs)
{
  const want = Math.round(TOTAL * SHARE.contour), cross = [], STEP = 10;
  for (let j = 0; j < DH - 1; j++) for (let i = 0; i < DW - 1; i++) {
    const a = DEM[j * DW + i];
    for (const [di, dj] of [[1, 0], [0, 1]]) {
      const b = DEM[(j + dj) * DW + i + di], la = Math.floor(a / STEP), lb = Math.floor(b / STEP); if (la === lb || Math.max(a, b) < STEP) continue;
      cross.push([i + di * ((Math.max(la, lb) * STEP - a) / (b - a)), j + dj * ((Math.max(la, lb) * STEP - a) / (b - a)), Math.max(la, lb) * STEP]);
    }
  }
  const px2ll = (gx, gy) => { const X = dx0 + (gx + 0.5) / 256, Y = dy0 + (gy + 0.5) / 256, n = Math.PI - (2 * Math.PI * Y) / 2 ** DEM_Z; return [(X / 2 ** DEM_Z) * 360 - 180, (180 / Math.PI) * Math.atan(Math.sinh(n))]; };
  let n = 0, guard = 0;
  while (n < want && guard++ < want * 20 && cross.length) {
    const c = cross[Math.floor(rnd() * cross.length)], [lon, lat] = px2ll(c[0] + (rnd() - 0.5) * 0.9, c[1] + (rnd() - 0.5) * 0.9);
    if (maskAt(lon, lat) !== 0) continue; const [x, z] = toM(lon, lat);
    if (put(x, c[2] + 0.6, z, 0.3 + 0.22 * smooth(10, 110, c[2]) + 0.06 * rnd(), KIND.edge, 1)) n++;
  }
}
// the shore: bright, dense points along the coast (lakes quieter)
{
  const want = Math.round(TOTAL * SHARE.coast), segs = coastSegs.map((s) => { const [ax, az] = toM(...s.a), [bx, bz] = toM(...s.b); return { ...s, ax, az, bx, bz, L: Math.hypot(bx - ax, bz - az) * (s.lake ? 0.5 : 1) }; }).filter((s) => s.L > 0);
  const cum = new Float64Array(segs.length); let acc = 0; segs.forEach((s, i) => { acc += s.L; cum[i] = acc; });
  let n = 0, guard = 0;
  while (n < want && guard++ < want * 20 && segs.length) {
    const s = segs[pickCum(cum, rnd() * acc)], t = rnd(), tx = s.ta[0] + (s.tb[0] - s.ta[0]) * t, ty = s.ta[1] + (s.tb[1] - s.ta[1]) * t;
    if (tx < 0 || ty < 0 || tx >= s.ext || ty >= s.ext) continue;
    const x = s.ax + (s.bx - s.ax) * t + (rnd() - 0.5) * 4, z = s.az + (s.bz - s.az) * t + (rnd() - 0.5) * 4;
    if (put(x, s.lake ? hAt(x, z) : 0.8, z, s.lake ? 0.5 + 0.1 * rnd() : 0.7 + 0.2 * rnd(), KIND.edge, 2)) n++;
  }
}
// the sea: a faint, level sheet with a slow swell of light
{
  const want = Math.round(TOTAL * SHARE.sea); let n = 0, guard = 0;
  while (n < want && guard++ < want * 30) {
    const [x, z] = randXZ(); if (maskM(x, z) !== 1) continue;
    const swell = 0.5 + 0.5 * Math.sin(x / 260 + Math.sin(z / 600) * 2) * Math.sin(z / 410 - x / 1000);
    if (put(x, 0, z, 0.1 + 0.11 * swell + (rnd() < 0.01 ? 0.28 : 0), KIND.surface, 0.5)) n++;
  }
}
// streets: every road from OpenStreetMap at its class's width; main roads brighter. They carry the journey, so they come first.
{
  const want = Math.round(TOTAL * SHARE.road), segs = [];
  for (const r of roads) for (let i = 0; i + 1 < r.pts.length; i++) { const [ax, az] = r.pts[i], [bx, bz] = r.pts[i + 1], L = Math.hypot(bx - ax, bz - az); if (L > 0.01) segs.push({ ax, az, bx, bz, L, c: ROAD[r.cls], w: L * (r.cls === "service" ? 0.35 : r.cls === "minor" ? 1 : 1.6) }); }
  const cum = new Float64Array(segs.length); let acc = 0; segs.forEach((s, i) => { acc += s.w; cum[i] = acc; });
  let n = 0, guard = 0;
  while (n < want && guard++ < want * 10 && segs.length) {
    const s = segs[pickCum(cum, rnd() * acc)], t = rnd(), [L, half] = s.c, ux = (s.bx - s.ax) / s.L, uz = (s.bz - s.az) / s.L, off = (rnd() - 0.5) * 2 * half, kerb = Math.abs(off) > half * 0.8;
    const x = s.ax + (s.bx - s.ax) * t - uz * off, z = s.az + (s.bz - s.az) * t + ux * off;
    if (put(x, hAt(x, z) + 0.8, z, L * (kerb ? 1.05 : 0.86) + 0.06 * rnd(), KIND.edge, s.c[0] > 0.6 ? 1.8 : 1.3)) n++;
  }
}
// the railway: a quiet double line
{
  const want = Math.round(TOTAL * SHARE.rail), segs = [];
  for (const r of rails) for (let i = 0; i + 1 < r.length; i++) { const [ax, az] = r[i], [bx, bz] = r[i + 1], L = Math.hypot(bx - ax, bz - az); if (L > 0.01) segs.push({ ax, az, bx, bz, L }); }
  const cum = new Float64Array(segs.length); let acc = 0; segs.forEach((s, i) => { acc += s.L; cum[i] = acc; });
  for (let n = 0, guard = 0; n < want && guard++ < want * 10 && segs.length;) {
    const s = segs[pickCum(cum, rnd() * acc)], t = rnd(), off = rnd() < 0.5 ? -1.6 : 1.6, ux = (s.bx - s.ax) / s.L, uz = (s.bz - s.az) / s.L;
    const x = s.ax + (s.bx - s.ax) * t - uz * off, z = s.az + (s.bz - s.az) * t + ux * off;
    if (put(x, hAt(x, z) + 1, z, 0.42 + 0.06 * rnd(), KIND.edge, 1)) n++;
  }
}
// the store site: the building the lab home's twin pin stands on
const fpArea = (r) => { let a = 0; for (let i = 0; i + 1 < r.length; i++) a += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]; return Math.abs(a) / 2; };
const inRing = (r, x, z) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, zi] = r[i], [xj, zj] = r[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };
const centroid = (r) => { let x = 0, z = 0; for (let i = 0; i + 1 < r.length; i++) { x += r[i][0]; z += r[i][1]; } return [x / (r.length - 1), z / (r.length - 1)]; };
buildings.forEach((b) => { b.c = centroid(b.rings[0]); b.area = fpArea(b.rings[0]); });
const store = buildings.filter((b) => inRing(b.rings[0], 0, 0) || Math.hypot(b.c[0], b.c[1]) < 40).sort((a, b) => b.area - a.area)[0];
if (!store) throw new Error("no building at the store site");
store.isStore = true;
console.log(`store building: ${Math.round(store.area)} m², ${store.h} m`);
// buildings: footprints at their mapped heights; houses a fine grain of roof points, bigger buildings outlined
{
  const want = Math.round(TOTAL * SHARE.building);
  const inPoly = (rings, x, z) => { let c = false; for (const r of rings) for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, zi] = r[i], [xj, zj] = r[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };
  const items = buildings.filter((b) => !b.isStore).map((b) => {
    const r0 = b.rings[0]; let per = 0; for (let i = 0; i + 1 < r0.length; i++) per += Math.hypot(r0[i + 1][0] - r0[i][0], r0[i + 1][1] - r0[i][1]);
    const big = smooth(300, 3000, b.area) * 0.6 + smooth(10, 30, b.h) * 0.4;
    return { ...b, per, big, w: (per * Math.max(3, b.h - b.h0) * 0.05 + b.area * 0.01) * (0.6 + big) };
  }).filter((b) => b.w > 0 && b.per > 0);
  const cum = new Float64Array(items.length); let acc = 0; items.forEach((b, i) => { acc += b.w; cum[i] = acc; });
  let n = 0, guard = 0;
  while (n < want && guard++ < want * 30) {
    const b = items[pickCum(cum, rnd() * acc)], g = hAt(...b.c), r0 = b.rings[0];
    let x, z, y, L, kind;
    if (rnd() < 0.42 + 0.3 * b.big) {                                      // outline: a corner edge or the roof's rim
      const i = Math.floor(rnd() * (r0.length - 1)), t = rnd(), corner = rnd() < 0.3, [ax, az] = r0[i], [bx, bz] = r0[i + 1];
      x = corner ? ax : ax + (bx - ax) * t; z = corner ? az : az + (bz - az) * t; y = corner ? b.h0 + rnd() * (b.h - b.h0) : b.h;
      const tr = b.tileRings[0], tx = corner ? tr[i][0] : tr[i][0] + (tr[i + 1][0] - tr[i][0]) * t, ty = corner ? tr[i][1] : tr[i][1] + (tr[i + 1][1] - tr[i][1]) * t;
      if (tx < 0 || ty < 0 || tx >= b.ext || ty >= b.ext) continue;
      L = 0.36 + 0.26 * b.big + 0.12 * (y - b.h0) / Math.max(1, b.h - b.h0); kind = KIND.edge;
    } else {                                                                 // a roof point
      let ok = false; for (let tries = 0; tries < 12 && !ok; tries++) { const i = Math.floor(rnd() * (r0.length - 1)), j = Math.floor(rnd() * (r0.length - 1)), s = rnd(); x = r0[i][0] + (r0[j][0] - r0[i][0]) * s; z = r0[i][1] + (r0[j][1] - r0[i][1]) * s; ok = inPoly(b.rings, x, z); }
      if (!ok || maskM(x, z) === 1) continue; y = b.h; L = 0.24 + 0.2 * b.big + 0.08 * rnd(); kind = KIND.surface;
    }
    if (put(x, g + y, z, L, kind, 0.9 + 0.8 * b.big)) n++;
  }
}
// the store: dense, rose-lit outline and roof so the page's leader line lands on it
{
  const want = Math.round(TOTAL * SHARE.store), r0 = store.rings[0], g = hAt(...store.c);
  for (let n = 0; n < want;) {
    const pick = rnd(); let x, z, y, L;
    if (pick < 0.62) { const i = Math.floor(rnd() * (r0.length - 1)), t = rnd(), corner = rnd() < 0.3, [ax, az] = r0[i], [bx, bz] = r0[i + 1]; x = corner ? ax : ax + (bx - ax) * t; z = corner ? az : az + (bz - az) * t; y = corner ? rnd() * store.h : rnd() < 0.6 ? store.h : rnd() * store.h; L = 0.62 + 0.14 * rnd(); }
    else { let ok = false; for (let k = 0; k < 12 && !ok; k++) { const i = Math.floor(rnd() * (r0.length - 1)), j = Math.floor(rnd() * (r0.length - 1)), s = rnd(); x = r0[i][0] + (r0[j][0] - r0[i][0]) * s; z = r0[i][1] + (r0[j][1] - r0[i][1]) * s; ok = inRing(r0, x, z); } if (!ok) continue; y = store.h; L = 0.46 + 0.1 * rnd(); }
    put(x, g + y, z, L, KIND.edge, 6); n++;
  }
}

// ------------------------------------------------------------------------------------------------ the street graph and the van's route
const nodes = [], adj = [], grid = new Map(), SNAP = 3;
const cellKey = (x, z) => `${Math.floor(x / SNAP)},${Math.floor(z / SNAP)}`;
function nodeAt(x, z) {
  const ci = Math.floor(x / SNAP), cj = Math.floor(z / SNAP);
  for (let i = ci - 1; i <= ci + 1; i++) for (let j = cj - 1; j <= cj + 1; j++) for (const id of grid.get(`${i},${j}`) || []) if (Math.hypot(nodes[id][0] - x, nodes[id][1] - z) < SNAP) return id;
  const id = nodes.length; nodes.push([x, z]); adj.push([]); const k = cellKey(x, z); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(id); return id;
}
const edges = [];
for (const r of roads) {
  if (r.cls === "motorway" || r.cls === "service" || r.ramp) continue;      // the van keeps to public streets; motorways and car parks out
  const cost = ROAD[r.cls][2]; let prev = nodeAt(...r.pts[0]);
  for (let i = 1; i < r.pts.length; i++) {
    const id = nodeAt(...r.pts[i]); if (id === prev) continue;
    const L = Math.hypot(nodes[id][0] - nodes[prev][0], nodes[id][1] - nodes[prev][1]);
    adj[prev].push([id, L * cost, L]); adj[id].push([prev, L * cost, L]); edges.push({ a: prev, b: id, L, cls: r.cls }); prev = id;
  }
}
// the largest connected piece (tile seams that didn't meet leave a few islands)
const comp = new Int32Array(nodes.length).fill(-1); let best = -1, bestN = 0;
for (let s = 0, c = 0; s < nodes.length; s++) {
  if (comp[s] >= 0) continue; const st = [s]; comp[s] = c; let n = 0;
  while (st.length) { const u = st.pop(); n++; for (const [v] of adj[u]) if (comp[v] < 0) { comp[v] = c; st.push(v); } }
  if (n > bestN) { bestN = n; best = c; } c++;
}
console.log(`street graph: ${nodes.length} nodes, ${edges.length} edges, main piece ${bestN}`);
const inMain = (id) => comp[id] === best;
function addPoint(x, z) { const id = nodes.length; nodes.push([x, z]); adj.push([]); comp[id] = best; return id; }
function link(a, b) { const L = Math.hypot(nodes[a][0] - nodes[b][0], nodes[a][1] - nodes[b][1]); adj[a].push([b, L, L]); adj[b].push([a, L, L]); }
// the store's yard: the nearest street node to the building (its loading dock is drawn as the start of the route)
const dock = (() => { let bi = -1, bd = Infinity; nodes.forEach((p, i) => { if (!inMain(i)) return; const d = Math.hypot(p[0] - store.c[0], p[1] - store.c[1]); if (d < bd) { bd = d; bi = i; } }); return bi; })();
const storeNode = addPoint(...store.c); link(storeNode, dock);
// six fictional households: each a point part-way along a real local street (minor class), 0.9 to 3.1 km from the store,
// spread around it (farthest-point sampling), on land and well inside the map. Never a house, never a number.
const cands = edges.filter((e) => e.cls === "minor" && e.L > 30 && inMain(e.a) && inMain(e.b)).map((e) => {
  const t = 0.3 + 0.4 * rnd(), x = nodes[e.a][0] + (nodes[e.b][0] - nodes[e.a][0]) * t, z = nodes[e.a][1] + (nodes[e.b][1] - nodes[e.a][1]) * t, d = Math.hypot(x, z);
  return { e, x, z, d };
}).filter((c) => c.d > 900 && c.d < 3100 && edgeFade(c.x, c.z) >= 1 && maskM(c.x, c.z) === 0);
const homes = [];
{
  const first = cands.filter((c) => c.d > 1400 && c.d < 2200)[Math.floor(rnd() * 50)] || cands[0]; homes.push(first);
  while (homes.length < 6) {
    let bc = null, bs = -1;
    for (const c of cands) { const md = Math.min(...homes.map((h) => Math.hypot(h.x - c.x, h.z - c.z)), 1.4 * Math.hypot(c.x, c.z)); const s = md * (0.85 + 0.3 * ((c.e.a * 7919) % 97) / 97); if (s > bs) { bs = s; bc = c; } }
    homes.push(bc);
  }
}
homes.forEach((h) => { h.node = addPoint(h.x, h.z); link(h.node, h.e.a); link(h.node, h.e.b); });
function dijkstra(src) {
  const n = nodes.length, dist = new Float64Array(n).fill(Infinity), prev = new Int32Array(n).fill(-1); dist[src] = 0;
  const heap = [[0, src]]; const push = (x) => { heap.push(x); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  while (heap.length) { const [d, u] = pop(); if (d > dist[u]) continue; for (const [v, w] of adj[u]) if (d + w < dist[v]) { dist[v] = d + w; prev[v] = u; push([dist[v], v]); } }
  return { dist, prev };
}
const stops = [storeNode, ...homes.map((h) => h.node)], D = stops.map((s) => dijkstra(s));
// the best order through the six (all 720 orders), out from the store and back
const perms = (a) => (a.length <= 1 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map((p) => [x, ...p])));
let order = null, orderCost = Infinity;
for (const p of perms([1, 2, 3, 4, 5, 6])) { let c = 0, at = 0; for (const k of [...p, 0]) { c += D[at].dist[stops[k]]; at = k; } if (c < orderCost) { orderCost = c; order = p; } }
const pathBetween = (i, j) => { const out = []; let u = stops[j]; const { prev } = D[i]; while (u !== -1) { out.push(u); if (u === stops[i]) break; u = prev[u]; } return out.reverse(); };
const seq = [0, ...order, 0], route = [], legs = [];
for (let k = 0; k + 1 < seq.length; k++) {
  const p = pathBetween(seq[k], seq[k + 1]); const start = route.length ? route.length - 1 : 0;
  p.forEach((id, i) => { if (route.length && i === 0) return; route.push(nodes[id]); });
  legs.push({ from: seq[k], to: seq[k + 1], startIndex: start, endIndex: route.length - 1 });
}
// resample every ~10 m, with the height of the ground under it (a whisker above the street)
const RS = 10, poly = [], cum = []; let total = 0; const legAt = [];
for (let li = 0; li < legs.length; li++) {
  const lg = legs[li];
  for (let i = lg.startIndex; i < lg.endIndex; i++) {
    const [ax, az] = route[i], [bx, bz] = route[i + 1], L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(L / RS));
    for (let k = i === lg.startIndex && li > 0 ? 1 : 0; k < n; k++) { const t = k / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t; if (poly.length) total += Math.hypot(x - poly[poly.length - 1][0], z - poly[poly.length - 1][1]); poly.push([x, z]); cum.push(total); }
  }
  const [ex, ez] = route[lg.endIndex]; total += Math.hypot(ex - poly[poly.length - 1][0], ez - poly[poly.length - 1][1]); poly.push([ex, ez]); cum.push(total); legAt.push(total);
}
console.log(`route: ${(total / 1000).toFixed(1)} km over ${legs.length} legs, order`, order);

// ------------------------------------------------------------------------------------------------ order, quantise, write
const N = pts.x.length, ord = Array.from({ length: N }, (_, i) => [Math.pow(rnd(), 1 / pts.w[i]), i]).sort((a, b) => b[0] - a[0]).slice(0, TOTAL).map((o) => o[1]);
const rng3 = (arr) => { let a = Infinity, b = -Infinity; for (const v of arr) { if (v < a) a = v; if (v > b) b = v; } return [a, b]; };
const bx = rng3(pts.x), by = [0, rng3(pts.y)[1]], bz = rng3(pts.z), q = (v, [a, b]) => Math.round(clamp((v - a) / (b - a)) * 65535);
const buf = Buffer.alloc(ord.length * 8), counts = [0, 0, 0, 0];
ord.forEach((i, k) => { buf.writeUInt16LE(q(pts.x[i], bx), k * 8); buf.writeUInt16LE(q(Math.max(0, pts.y[i]), by), k * 8 + 2); buf.writeUInt16LE(q(pts.z[i], bz), k * 8 + 4); buf[k * 8 + 6] = Math.round(pts.l[i] * 255); buf[k * 8 + 7] = pts.k[i]; counts[pts.k[i]]++; });
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "delivery-points.bin"), buf);
const E = (x, z, up = 0) => [+(x * S).toFixed(4), +((hAt(x, z) + up) * VERTICAL * S).toFixed(4), +(z * S).toFixed(4)];
const bearing = (x, z) => ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"][Math.round(((Math.atan2(x, -z) * 180) / Math.PI + 360) % 360 / 45) % 8];
const header = {
  format: "assembl-points/1", count: ord.length, stride: 8, layout: "x:u16 y:u16 z:u16 light:u8 kind:u8, little-endian, interleaved; weighted random order (any prefix is a fair sample)",
  bounds: { x: bx, y: by, z: bz }, kinds: { surface: counts[0], edge: counts[1], ground: counts[2], highlight: counts[3] },
  units: "engine units: the map's width is 2.1; y = height × vertical exaggeration", metresPerUnit: +(1 / S).toFixed(2), verticalExaggeration: VERTICAL,
  area: { ...Object.fromEntries(Object.entries(BOUNDS).map(([k, v]) => [k, +v.toFixed(5)])), widthKm: +(WIDTH / 1000).toFixed(1), depthKm: +(DEPTH / 1000).toFixed(1) },
  // the store: the same example site as the lab home's supermarket twin pin. Coordinates only, never a name.
  store: { anchor: E(...store.c, store.h), lonlat: SITE, footprintM2: Math.round(store.area), dock: E(...nodes[dock], 2) },
  // six fictional households, each a point on a real local street (not a house, no number): where they are relative to the store
  // (lettered A–F in the order the van reaches them)
  households: order.map((k, i) => { const h = homes[k - 1]; return { id: "ABCDEF"[i], anchor: E(h.x, h.z, 3), km: +(Math.hypot(h.x, h.z) / 1000).toFixed(1), bearing: bearing(h.x, h.z), routeM: Math.round(legAt[i]) }; }),
  // the van's drive: store → the six in the best order → store, resampled every ~10 m (engine units), with metres along it
  route: { km: +(total / 1000).toFixed(2), legEndsM: legAt.map((v) => Math.round(v)),
    points: poly.map(([x, z]) => E(x, z, 2)), metres: cum.map((v) => Math.round(v)), note: "Shortest drive over OpenStreetMap streets (no motorways or car parks), ignoring one-way rules and turns. Illustrative." },
  sources: [
    { what: "terrain", source: "AWS Terrain Tiles (Terrarium), zoom 14", url: "https://registry.opendata.aws/terrain-tiles/", upstream: "LINZ NZ 8 m Digital Elevation Model", licence: "CC BY 4.0" },
    { what: "streets, rail, coastline, lakes, building footprints and heights", source: "OpenFreeMap vector tiles (OpenMapTiles schema), zoom 14, " + VEC.split("/")[4], url: "https://openfreemap.org", upstream: "OpenStreetMap", licence: "ODbL 1.0 (© OpenStreetMap contributors); tiles © OpenMapTiles" },
    { what: "store site", source: "assets/models/auckland/auckland-points.json, sites.store (the lab home's supermarket twin pin)", licence: "as above" },
  ],
  built: new Date().toISOString().slice(0, 10), script: "tools/pointcloud/bake-delivery.mjs",
};
const json = JSON.stringify(header);
if (/"names?"\s*:/.test(json)) throw new Error("a name slipped into the header");
fs.writeFileSync(path.join(OUT, "delivery-points.json"), JSON.stringify(header, (k, v) => v, 0).replace(/\],"/g, '],\n"') + "\n");
console.log(`wrote ${ord.length} points (${(buf.length / 1048576).toFixed(2)} MB) of ${N} candidates; kinds`, header.kinds, "households", header.households.map((h) => `${h.id} ${h.km} km ${h.bearing} at ${h.routeM} m`).join(", "));
