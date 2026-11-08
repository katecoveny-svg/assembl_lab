#!/usr/bin/env node
// assembl lab · bakes "Friday night on the Viaduct": the Viaduct Harbour and Wynyard Quarter waterfront, with the city centre and the
// Sky Tower behind, as a point cloud from open data, into a compact points file the sim at /viaduct/ reads.
//
//   node tools/pointcloud/bake-viaduct.mjs [--cache DIR]        (DEBUG_GRID=grid.ppm also writes a picture of the walking grid and routes)
//   → assets/models/viaduct/viaduct-points.bin (+ viaduct-points.json, the header: bounds, anchors, routes, sources, counts)
//
// Sources (all open, no API key; see assets/models/viaduct/SOURCE.md):
//   Terrain     AWS Terrain Tiles (Terrarium PNG, zoom 15, about 3.8 m here), https://registry.opendata.aws/terrain-tiles/. In New
//               Zealand their source is LINZ's 8 m DEM, CC BY 4.0. height = R·256 + G + B/256 − 32768 metres.
//   Map         OpenStreetMap, from OpenFreeMap's vector tiles (OpenMapTiles schema, zoom 14, the tiles' most detailed level): the
//               coastline and the marina basin (water), building footprints and heights (render_height), wharves and marina
//               pontoons (transportation class "pier"), pedestrian areas and footpaths, roads and bridges. © OpenStreetMap
//               contributors, ODbL; tiles © OpenMapTiles, via OpenFreeMap. No name of any business, venue or place is read.
//   Drawn       One fictional "Example restaurant": a small pavilion and deck drawn by this script on an open stretch of the basin's
//               promenade, where the map has no building. It is not any real restaurant or building. The page labels it
//               "Example restaurant, drawn".
//
// Unlike the lab home's Auckland (heights ×5 over 21 km), this crop is about 1.7 km wide, so heights are TRUE scale: the Sky Tower's
// 328 m stands at its real height against the waterfront.
//
// The guests' walking routes are computed here, on the real map: a shortest path over a 2 m walkability grid (footpaths, pedestrian
// areas and wharves are cheap, other open land dearer, roads dearer still, buildings and water closed; bridges and footbridges open).
//
// Per point (8 bytes, little-endian, interleaved so any prefix is a fair sample): x, y, z as uint16 over the header's bounds, light
// (0–255 → 0–1) and kind (0 surface, 1 edge, 2 ground, 3 highlight), as the shared engine's forms (lab/pc/engine.js). The main set is
// in a weighted random order (coast, wharves and towers before open water), so a phone reads just the first 72,000. After it, the
// header's "lights" section holds the night's lights (kind 10 window, 11 street light, 12 reflection on the water), which the page
// switches on through the evening.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fetchCached, decodePNG, decodeMVT, lon2x, lat2y } from "./geo-tiles.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, "../..");
const OUT = path.join(ROOT, "assets/models/viaduct");
const argCache = process.argv.indexOf("--cache");
const CACHE = argCache > 0 ? process.argv[argCache + 1] : path.join(HERE, ".cache");

// ------------------------------------------------------------------------------------------------ the area and the budget
// Westhaven's eastern marina to Queens Wharf, the harbour north of the wharves to the Sky Tower and the towers of the city centre
const BOUNDS = { west: 174.7505, east: 174.7700, south: -36.8505, north: -36.8372 };
const SIZE = 2.1;                       // the larger of width and depth, in engine units (as the engine's normalise())
const TOTAL = 300000, OVER = 1.12;   // candidates are oversampled, then the weighted order keeps TOTAL
const SHARE = { land: 0.1, contour: 0.05, coast: 0.13, sea: 0.12, building: 0.37, road: 0.06, pier: 0.105, sky: 0.02, restaurant: 0.015 };
const LIGHTS = { window: 15000, street: 3200, reflection: 4200 };
const DEM_Z = 15, VEC_Z = 14, MASK_RES = 1024;   // mask: 1024 px per zoom-14 tile, about 1.9 m
const TERRARIUM = (z, x, y) => `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;

const lat0 = (BOUNDS.south + BOUNDS.north) / 2, lon0 = (BOUNDS.west + BOUNDS.east) / 2;
const M_LON = 111320 * Math.cos((lat0 * Math.PI) / 180), M_LAT = 110574;
const WIDTH = (BOUNDS.east - BOUNDS.west) * M_LON, DEPTH = (BOUNDS.north - BOUNDS.south) * M_LAT, S = SIZE / Math.max(WIDTH, DEPTH);
// local metres: x east, z south (three.js: −z is north), y up
const toM = (lon, lat) => [(lon - lon0) * M_LON, (lat0 - lat) * M_LAT];
const toLL = (x, z) => [lon0 + x / M_LON, lat0 - z / M_LAT];

let seed = 20261113;
const rnd = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const KEY = (() => { const v = [-0.45, 0.8, 0.55], n = Math.hypot(...v); return v.map((c) => c / n); })();

// ------------------------------------------------------------------------------------------------ terrain (Terrarium, zoom 15)
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
const landH = (lon, lat) => Math.max(1.2, demAt(lon, lat));
const groundAt = (x, z) => landH(...toLL(x, z));

// ------------------------------------------------------------------------------------------------ vector tiles (OpenFreeMap, zoom 14)
const tilejson = JSON.parse(fetchCached("https://tiles.openfreemap.org/planet", CACHE).toString());
const VEC = tilejson.tiles[0];
const vx0 = Math.floor(lon2x(BOUNDS.west, VEC_Z)), vx1 = Math.floor(lon2x(BOUNDS.east, VEC_Z)), vy0 = Math.floor(lat2y(BOUNDS.north, VEC_Z)), vy1 = Math.floor(lat2y(BOUNDS.south, VEC_Z));
const MW = (vx1 - vx0 + 1) * MASK_RES, MH = (vy1 - vy0 + 1) * MASK_RES, MASK = new Uint8Array(MW * MH);   // 0 land, 1 sea, 2 lake or pond
const coastSegs = [], buildings = [], piers = [], peds = [], lines = [], bridges = [];
const tileLL = (tx, ty, ext, x, y) => { const X = tx + x / ext, Y = ty + y / ext, n = Math.PI - (2 * Math.PI * Y) / 2 ** VEC_Z; return [(X / 2 ** VEC_Z) * 360 - 180, (180 / Math.PI) * Math.atan(Math.sinh(n))]; };
const ringArea = (r) => { let a = 0; for (let i = 0; i + 1 < r.length; i++) a += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]; return a; };
// split a merged multipolygon back into polygons (an exterior ring has the first ring's winding; the others are its holes)
function polygons(f, ext, tx, ty) {
  const out = [], sign = Math.sign(ringArea(f.parts[0] || [])) || 1; let cur = null;
  for (const r of f.parts) {
    if (r.length < 4) continue;
    if (Math.sign(ringArea(r)) === sign || !cur) { cur = { rings: [], tileRings: [], ext, tile: [tx, ty] }; out.push(cur); }
    cur.rings.push(r.map(([x, y]) => toM(...tileLL(tx, ty, ext, x, y)))); cur.tileRings.push(r);
  }
  return out;
}
for (let tx = vx0; tx <= vx1; tx++) for (let ty = vy0; ty <= vy1; ty++) {
  const t = decodeMVT(fetchCached(VEC.replace("{z}", VEC_Z).replace("{x}", tx).replace("{y}", ty), CACHE), ["water", "building", "transportation"]);
  // water: fill the mask (even–odd, only this tile's own pixels) and keep the shore edges
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
      coastSegs.push({ a: toM(...tileLL(tx, ty, ext, ax, ay)), b: toM(...tileLL(tx, ty, ext, bx, by)), lake: v === 2, ext, ta: [ax, ay], tb: [bx, by] });
    }
  }
  for (const f of t.building?.features || []) {
    if (f.type !== 3 || f.props.hide_3d) continue;
    for (const p of polygons(f, t.building.extent, tx, ty)) { p.h = Math.max(3.5, f.props.render_height ?? 6); p.h0 = f.props.render_min_height ?? 0; buildings.push(p); }
  }
  for (const f of t.transportation?.features || []) {
    const c = f.props.class, ext = t.transportation.extent;
    if (f.type === 3) {
      // areas: wharves and marina pontoons (pier), pedestrian squares and promenades (path), bridge decks
      const list = c === "pier" ? piers : c === "path" ? peds : f.props.brunnel === "bridge" || c === "bridge" ? bridges : null;
      if (list) for (const p of polygons(f, ext, tx, ty)) list.push(p);
      continue;
    }
    if (f.type !== 2) continue;
    for (const part of f.parts) lines.push({ cls: c, sub: f.props.subclass || "", brunnel: f.props.brunnel || "", pts: part.map(([x, y]) => toM(...tileLL(tx, ty, ext, x, y))), tile: part, ext });
  }
}
console.log(`vector tiles: ${(vx1 - vx0 + 1) * (vy1 - vy0 + 1)}, ${coastSegs.length} shore segments, ${buildings.length} buildings, ${piers.length} wharves and pontoons, ${peds.length} pedestrian areas, ${lines.length} lines`);
// the marina basin is mapped as a body of water inside the coastline (class "lake" in the tiles): any lake that touches the sea is
// tidal harbour, so it becomes sea; ponds and fountains in the parks stay lakes
{
  const q = []; for (let k = 0; k < MW * MH; k++) if (MASK[k] === 1) q.push(k);
  while (q.length) { const k = q.pop(), i = k % MW, j = (k - i) / MW; for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= MW || jj >= MH) continue; const kk = jj * MW + ii; if (MASK[kk] === 2) { MASK[kk] = 1; q.push(kk); } } }
}
const maskAtLL = (lon, lat) => { const i = Math.floor((lon2x(lon, VEC_Z) - vx0) * MASK_RES), j = Math.floor((lat2y(lat, VEC_Z) - vy0) * MASK_RES); return i < 0 || j < 0 || i >= MW || j >= MH ? 1 : MASK[j * MW + i]; };
const maskAt = (x, z) => maskAtLL(...toLL(x, z));
const inPoly = (rings, x, z) => { let c = false; for (const r of rings) for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, zi] = r[i], [xj, zj] = r[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };
const inTile = (p, i, t) => { const tr = p.tileRings[0], x = tr[i][0] + (tr[i + 1][0] - tr[i][0]) * t, y = tr[i][1] + (tr[i + 1][1] - tr[i][1]) * t; return x >= 0 && y >= 0 && x < p.ext && y < p.ext; };
const bbox = (p) => { const r = p.rings[0]; let a = [Infinity, Infinity, -Infinity, -Infinity]; for (const [x, z] of r) a = [Math.min(a[0], x), Math.min(a[1], z), Math.max(a[2], x), Math.max(a[3], z)]; return a; };
[...buildings, ...piers, ...peds, ...bridges].forEach((p) => { p.bb = bbox(p); p.area = Math.abs(ringArea(p.rings[0])) / 2; let per = 0; const r = p.rings[0]; for (let i = 0; i + 1 < r.length; i++) per += Math.hypot(r[i + 1][0] - r[i][0], r[i + 1][1] - r[i][1]); p.per = per; });

// ------------------------------------------------------------------------------------------------ the point set
const pts = { x: [], y: [], z: [], l: [], k: [], w: [] }, lights = { x: [], y: [], z: [], l: [], k: [] };
const KIND = { surface: 0, edge: 1, ground: 2, highlight: 3, window: 10, street: 11, reflection: 12 };
// the map dissolves at its edges (no box): a soft rounded-rectangle falloff into the plum ground
const edgeFade = (x, z) => { const u = Math.abs(x) / (WIDTH / 2), v = Math.abs(z) / (DEPTH / 2), d = Math.pow(Math.pow(u, 5) + Math.pow(v, 5), 1 / 5); return 1 - smooth(0.8, 1.0, d); };
function put(xm, ym, zm, light, kind, weight = 1) {
  const f = edgeFade(xm, zm); if (f <= 0 || rnd() > Math.pow(f, 0.7)) return false;
  pts.x.push(xm * S); pts.y.push(ym * S); pts.z.push(zm * S); pts.l.push(clamp(light * (0.55 + 0.45 * f))); pts.k.push(kind); pts.w.push(weight); return true;
}
function putLight(xm, ym, zm, light, kind) {
  const f = edgeFade(xm, zm); if (f <= 0.05) return false;
  lights.x.push(xm * S); lights.y.push(ym * S); lights.z.push(zm * S); lights.l.push(clamp(light * (0.5 + 0.5 * f))); lights.k.push(kind); return true;
}
const randXZ = () => [(rnd() - 0.5) * WIDTH, (rnd() - 0.5) * DEPTH];
// buildings by 40 m cell, for "is this point inside a building" tests
const CELL = 40, grid = new Map();
const cellKey = (i, j) => i * 100003 + j;
const addGrid = (p, map) => { for (let i = Math.floor(p.bb[0] / CELL); i <= Math.floor(p.bb[2] / CELL); i++) for (let j = Math.floor(p.bb[1] / CELL); j <= Math.floor(p.bb[3] / CELL); j++) { const k = cellKey(i, j); if (!map.has(k)) map.set(k, []); map.get(k).push(p); } };
buildings.forEach((b) => addGrid(b, grid));
const inBuilding = (x, z, pad = 0) => (grid.get(cellKey(Math.floor(x / CELL), Math.floor(z / CELL))) || []).some((b) => x >= b.bb[0] - pad && x <= b.bb[2] + pad && z >= b.bb[1] - pad && z <= b.bb[3] + pad && (pad ? true : inPoly(b.rings, x, z)));

// ------------------------------------------------------------------------------------------------ the Example restaurant (drawn)
// An open stretch of the basin's southern promenade (no building within about 40 m, no road within about 45 m on the map). The pavilion
// is long along the shore, its deck faces the water. Fictional, drawn here; the page says so.
const SPOT = toM(174.76058, -36.84302);
const shoreDir = (() => {   // which way the water is: the mean direction of water cells within 40 m
  let sx = 0, sz = 0; for (let a = 0; a < 72; a++) for (let r = 6; r <= 40; r += 2) { const th = (a / 72) * Math.PI * 2, x = SPOT[0] + Math.cos(th) * r, z = SPOT[1] + Math.sin(th) * r; if (maskAt(x, z) === 1) { sx += Math.cos(th) / r; sz += Math.sin(th) / r; } }
  const n = Math.hypot(sx, sz) || 1; return [sx / n, sz / n];
})();
const R = (() => {
  const [wx, wz] = shoreDir, ax = -wz, az = wx;               // along the shore
  let cx = SPOT[0] - wx * 6, cz = SPOT[1] - wz * 6;           // set the pavilion back from the water a little; the deck takes the front
  const L = 24, D = 12, deck = 7, H = 5.2, g = groundAt(cx, cz);
  const at = (u, v) => [cx + ax * u + wx * v, cz + az * u + wz * v];   // u along the shore, v toward the water (from the centre)
  return { cx, cz, ax, az, wx, wz, L, D, deck, H, g, at };
})();
{
  const want = Math.round(TOTAL * OVER * SHARE.restaurant), { L, D, deck, H, g, at } = R;
  const corners = [[-L / 2, -D / 2], [L / 2, -D / 2], [L / 2, D / 2], [-L / 2, D / 2]];
  for (let n = 0; n < want;) {
    const pick = rnd(); let u, v, y, light, kind = KIND.edge;
    if (pick < 0.22) { const c = corners[Math.floor(rnd() * 4)]; u = c[0]; v = c[1]; y = rnd() * H; light = 0.72 + 0.2 * rnd(); }                         // the four corner posts
    else if (pick < 0.5) { const i = Math.floor(rnd() * 4), a = corners[i], b = corners[(i + 1) % 4], t = rnd(); u = a[0] + (b[0] - a[0]) * t; v = a[1] + (b[1] - a[1]) * t; y = rnd() < 0.5 ? H : rnd() < 0.5 ? 0.15 : H - 0.6; light = 0.66 + 0.24 * rnd(); }   // roof and floor outlines, the fascia
    else if (pick < 0.62) { u = (rnd() - 0.5) * L; v = (rnd() - 0.5) * D; y = H; light = 0.42 + 0.12 * rnd(); kind = KIND.surface; }                     // the roof
    else if (pick < 0.74) { const t = rnd(), side = rnd() < 0.5 ? -1 : 1; u = (t - 0.5) * L; v = side * D / 2; y = 0.3 + rnd() * (H - 1.2); light = side > 0 ? 0.58 + 0.2 * rnd() : 0.36; kind = KIND.surface; }   // the glass walls, lit from inside
    else if (pick < 0.86) { u = (rnd() - 0.5) * L; v = D / 2 + rnd() * deck; y = 0.12; light = 0.3 + 0.1 * rnd(); kind = KIND.surface; }                   // the deck boards
    else if (pick < 0.94) { const t = rnd(); if (rnd() < 0.6) { u = (t - 0.5) * L; v = D / 2 + deck; } else { u = (rnd() < 0.5 ? -1 : 1) * L / 2; v = D / 2 + t * deck; } y = 0.2 + rnd() * 0.9; light = 0.6 + 0.15 * rnd(); }   // the deck's balustrade
    else { const t = rnd(); u = (t - 0.5) * L; v = D / 2 + (rnd() < 0.5 ? 0 : deck); y = 3.1; light = 0.62; }                                                 // the awning frame
    const [x, z] = at(u, v); if (put(x, g + y, z, light, kind, 6)) n++;
  }
}
const restaurantFoot = [[-R.L / 2, -R.D / 2], [R.L / 2, -R.D / 2], [R.L / 2, R.D / 2 + R.deck], [-R.L / 2, R.D / 2 + R.deck]].map(([u, v]) => R.at(u, v));
const restaurantRing = [[...restaurantFoot, restaurantFoot[0]]], isRestaurant = (x, z) => inPoly(restaurantRing, x, z);

// ------------------------------------------------------------------------------------------------ land, contours, coast, water
{
  const want = Math.round(TOTAL * OVER * SHARE.land), e = 6; let n = 0, guard = 0;
  while (n < want && guard++ < want * 60) {
    const [x, z] = randXZ(), m = maskAt(x, z); if (m === 1 || inBuilding(x, z) || isRestaurant(x, z)) continue;
    const h = groundAt(x, z), gx = (groundAt(x + e, z) - h) / e, gz = (groundAt(x, z + e) - h) / e, nl = Math.hypot(gx, 1, gz), nx = -gx / nl, ny = 1 / nl, nz = -gz / nl;
    const lit = Math.max(0, nx * KEY[0] + ny * KEY[1] + nz * KEY[2]);
    const L = m === 2 ? 0.2 : 0.1 + 0.18 * Math.pow(lit, 1.4) + 0.14 * smooth(4, 70, h) + (rnd() < 0.01 ? 0.12 : 0);
    if (put(x, h, z, L, KIND.ground, 0.6)) n++;
  }
}
// contours every 5 m: the city centre's rise from the waterfront, as a topographic map's rings
{
  const want = Math.round(TOTAL * OVER * SHARE.contour), cross = [], STEP = 5;
  for (let j = 0; j < DH - 1; j++) for (let i = 0; i < DW - 1; i++) {
    const a = DEM[j * DW + i];
    for (const [di, dj] of [[1, 0], [0, 1]]) {
      const b = DEM[(j + dj) * DW + i + di], la = Math.floor(a / STEP), lb = Math.floor(b / STEP); if (la === lb || Math.max(a, b) < STEP) continue;
      const lev = Math.max(la, lb) * STEP, t = (lev - a) / (b - a); cross.push([i + di * t, j + dj * t, lev]);
    }
  }
  const px2ll = (gx, gy) => { const X = dx0 + (gx + 0.5) / 256, Y = dy0 + (gy + 0.5) / 256, n = Math.PI - (2 * Math.PI * Y) / 2 ** DEM_Z; return [(X / 2 ** DEM_Z) * 360 - 180, (180 / Math.PI) * Math.atan(Math.sinh(n))]; };
  let n = 0, guard = 0;
  while (n < want && guard++ < want * 30 && cross.length) {
    const c = cross[Math.floor(rnd() * cross.length)], [lon, lat] = px2ll(c[0] + (rnd() - 0.5) * 0.9, c[1] + (rnd() - 0.5) * 0.9);
    if (maskAtLL(lon, lat) !== 0) continue; const [x, z] = toM(lon, lat); if (inBuilding(x, z)) continue;
    if (put(x, c[2] + 0.4, z, 0.3 + 0.22 * smooth(5, 70, c[2]) + 0.06 * rnd(), KIND.edge, 0.9)) n++;
  }
}
// the coastline: dense, bright points along every shore and around the marina basin, a whisker above the water
// a shore is where water meets land: water-to-water edges (the basin's mouth, where its outline meets the coastline's) are dropped
const coast = coastSegs.map((s) => {
  const L = Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]); if (!L) return null;
  const mx = (s.a[0] + s.b[0]) / 2, mz = (s.a[1] + s.b[1]) / 2, nx = -(s.b[1] - s.a[1]) / L, nz = (s.b[0] - s.a[0]) / L, p = maskAt(mx + nx * 2.5, mz + nz * 2.5), q = maskAt(mx - nx * 2.5, mz - nz * 2.5);
  if (p === q || (p && q)) return null; const lake = p === 2 || q === 2; return { ...s, lake, L: L * (lake ? 0.3 : 1) };
}).filter(Boolean);
{
  const want = Math.round(TOTAL * OVER * SHARE.coast), cum = new Float64Array(coast.length); let acc = 0; coast.forEach((s, i) => { acc += s.L; cum[i] = acc; });
  let n = 0, guard = 0;
  while (n < want && guard++ < want * 20) {
    let lo = 0, hi = cum.length - 1; const u = rnd() * acc; while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] < u) lo = mid + 1; else hi = mid; }
    const s = coast[lo], t = rnd(), tx = s.ta[0] + (s.tb[0] - s.ta[0]) * t, ty = s.ta[1] + (s.tb[1] - s.ta[1]) * t;
    if (tx < 0 || ty < 0 || tx >= s.ext || ty >= s.ext) continue;
    const x = s.a[0] + (s.b[0] - s.a[0]) * t + (rnd() - 0.5) * 1.2, z = s.a[1] + (s.b[1] - s.a[1]) * t + (rnd() - 0.5) * 1.2;
    const y = rnd() < 0.7 ? 1.4 : 0.4 + rnd() * 1.6;            // the wharf's edge, and its face down to the water
    if (put(x, y, z, s.lake ? 0.45 : 0.68 + 0.24 * rnd(), KIND.edge, s.lake ? 1 : 2.4)) n++;
  }
}
// the water: a faint, level sheet with a slow swell of light (the engine's sparkles make it shimmer); brighter close to the wharves
{
  const want = Math.round(TOTAL * OVER * SHARE.sea); let n = 0, guard = 0;
  while (n < want && guard++ < want * 30) {
    const [x, z] = randXZ(); if (maskAt(x, z) !== 1) continue;
    let shore = 0; for (const [ox, oz] of [[24, 0], [-24, 0], [0, 24], [0, -24]]) if (maskAt(x + ox, z + oz) !== 1) shore++;
    const swell = 0.5 + 0.5 * Math.sin(x / 38 + Math.sin(z / 90) * 2) * Math.sin(z / 61 - x / 150);
    if (put(x, 0, z, 0.07 + 0.1 * swell + 0.07 * shore + (rnd() < 0.008 ? 0.32 : 0), KIND.surface, 0.5)) n++;
  }
}

// ------------------------------------------------------------------------------------------------ wharves, pontoons, promenades
{
  const want = Math.round(TOTAL * OVER * SHARE.pier), items = piers.filter((p) => p.per > 0), wts = items.map((p) => p.per * 1.6 + p.area * 0.02), tot = wts.reduce((a, b) => a + b, 0);
  const cum = []; let acc = 0; wts.forEach((w) => cum.push((acc += w)));
  let n = 0, guard = 0;
  while (n < want && guard++ < want * 20 && items.length) {
    let lo = 0, hi = cum.length - 1; const u = rnd() * tot; while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] < u) lo = mid + 1; else hi = mid; }
    const p = items[lo], r = p.rings[0]; let x, z, L, kind;
    if (rnd() < 0.72) { const i = Math.floor(rnd() * (r.length - 1)), t = rnd(); if (!inTile(p, i, t)) continue; x = r[i][0] + (r[i + 1][0] - r[i][0]) * t; z = r[i][1] + (r[i + 1][1] - r[i][1]) * t; L = 0.56 + 0.26 * rnd(); kind = KIND.edge; }
    else { x = p.bb[0] + rnd() * (p.bb[2] - p.bb[0]); z = p.bb[1] + rnd() * (p.bb[3] - p.bb[1]); if (!inPoly(p.rings, x, z) || inBuilding(x, z)) continue; L = 0.2 + 0.08 * rnd(); kind = KIND.surface; }
    const y = maskAt(x, z) === 1 ? 1.2 : groundAt(x, z) + 0.2;
    if (put(x, y, z, L, kind, 1.8)) n++;
  }
}
// roads and paths: faint lines (the city's grid at night); the promenade's paths a little brighter
{
  const want = Math.round(TOTAL * OVER * SHARE.road);
  const wOf = (l) => /motorway|trunk|primary/.test(l.cls) ? 1.3 : /secondary|tertiary/.test(l.cls) ? 1.1 : /minor|service/.test(l.cls) ? 0.7 : l.cls === "path" ? 0.55 : l.cls === "pier" ? 0.8 : 0;
  const items = lines.filter((l) => wOf(l) > 0 && l.brunnel !== "tunnel").map((l) => { let len = 0; for (let i = 0; i + 1 < l.pts.length; i++) len += Math.hypot(l.pts[i + 1][0] - l.pts[i][0], l.pts[i + 1][1] - l.pts[i][1]); return { ...l, len, w: len * wOf(l) }; }).filter((l) => l.len > 0);
  const cum = []; let acc = 0; items.forEach((l) => cum.push((acc += l.w)));
  let n = 0, guard = 0;
  while (n < want && guard++ < want * 20) {
    let lo = 0, hi = cum.length - 1; const u = rnd() * acc; while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] < u) lo = mid + 1; else hi = mid; }
    const l = items[lo], i = Math.floor(rnd() * (l.pts.length - 1)), t = rnd(), tt = l.tile;
    const tx = tt[i][0] + (tt[i + 1][0] - tt[i][0]) * t, ty = tt[i][1] + (tt[i + 1][1] - tt[i][1]) * t; if (tx < 0 || ty < 0 || tx >= l.ext || ty >= l.ext) continue;
    const x = l.pts[i][0] + (l.pts[i + 1][0] - l.pts[i][0]) * t, z = l.pts[i][1] + (l.pts[i + 1][1] - l.pts[i][1]) * t;
    const bridge = l.brunnel === "bridge", y = bridge ? Math.max(groundAt(x, z), 3.5) : maskAt(x, z) === 1 ? 1.3 : groundAt(x, z) + 0.15;
    const L = l.cls === "path" ? 0.3 + 0.08 * rnd() : /motorway|primary|secondary/.test(l.cls) ? 0.26 + 0.08 * rnd() : 0.2 + 0.06 * rnd();
    if (put(x, y, z, L, bridge ? KIND.edge : KIND.surface, 0.9)) n++;
  }
  // street lights every ~22 m along the roads and the waterfront paths (the lights section: they come on at dusk)
  let lit = 0;
  for (const l of items.filter((l) => !/service/.test(l.cls) || l.len > 60)) {
    if (lit >= LIGHTS.street) break;
    const step = l.cls === "path" ? 18 : 24; let d = rnd() * step;
    for (let i = 0; i + 1 < l.pts.length && lit < LIGHTS.street; i++) {
      const [ax, az] = l.pts[i], [bx, bz] = l.pts[i + 1], sl = Math.hypot(bx - ax, bz - az);
      for (; d < sl; d += step) { const t = d / sl, tt = l.tile, tx = tt[i][0] + (tt[i + 1][0] - tt[i][0]) * t, ty = tt[i][1] + (tt[i + 1][1] - tt[i][1]) * t; if (tx < 0 || ty < 0 || tx >= l.ext || ty >= l.ext) continue;
        const x = ax + (bx - ax) * t, z = az + (bz - az) * t; if (inBuilding(x, z)) continue; if (putLight(x, (maskAt(x, z) === 1 ? 1.3 : groundAt(x, z)) + 4.5, z, 0.78 + 0.18 * rnd(), KIND.street)) lit++; }
      d -= sl;
    }
  }
}

// ------------------------------------------------------------------------------------------------ buildings
// OpenStreetMap footprints at their mapped heights, true scale. Towers: dense corner edges and roof outlines; low buildings a grain of
// roof points. Their windows go to the lights section (a lattice of floors on each wall), so the city lights up through the evening.
const SKY = [174.7621, -36.8484];
const [skx, skz] = toM(...SKY);
const isSky = (b) => { const c = [(b.bb[0] + b.bb[2]) / 2, (b.bb[1] + b.bb[3]) / 2]; return Math.hypot(c[0] - skx, c[1] - skz) < 26; };
{
  const want = Math.round(TOTAL * OVER * SHARE.building);
  const items = buildings.filter((b) => !isSky(b) && b.per > 0).map((b) => { const tall = smooth(10, 90, b.h); return { ...b, tall, w: (0.8 + 2.2 * tall) * (b.per * Math.pow(Math.max(4, b.h - b.h0), 0.7) * 0.03 + b.area * 0.006) }; });   // low-rise gets its share: the waterfront's fabric reads, not just the towers
  const cum = []; let acc = 0; items.forEach((b) => cum.push((acc += b.w)));
  let n = 0, guard = 0;
  while (n < want && guard++ < want * 30) {
    let lo = 0, hi = cum.length - 1; const u = rnd() * acc; while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] < u) lo = mid + 1; else hi = mid; }
    const b = items[lo], r0 = b.rings[0], g = groundAt((b.bb[0] + b.bb[2]) / 2, (b.bb[1] + b.bb[3]) / 2), pick = rnd();
    let x, z, y, L, kind;
    if (pick < 0.4 + 0.3 * b.tall) {                                    // an outline point: a corner edge, the roof's rim or a floor line
      const i = Math.floor(rnd() * (r0.length - 1)), t = rnd(), corner = rnd() < 0.42, [ax, az] = r0[i], [bx, bz] = r0[i + 1];
      if (!inTile(b, i, corner ? 0 : t)) continue;
      x = corner ? ax : ax + (bx - ax) * t; z = corner ? az : az + (bz - az) * t;
      y = corner ? b.h0 + rnd() * (b.h - b.h0) : rnd() < 0.8 ? b.h : b.h0 + 0.3;
      L = 0.46 + 0.3 * b.tall + 0.16 * (y - b.h0) / Math.max(1, b.h - b.h0); kind = KIND.edge;
    } else {
      const roof = rnd() < 0.55 || b.tall < 0.15;
      if (roof) { x = b.bb[0] + rnd() * (b.bb[2] - b.bb[0]); z = b.bb[1] + rnd() * (b.bb[3] - b.bb[1]); if (!inPoly(b.rings, x, z)) continue; y = b.h; L = 0.3 + 0.28 * b.tall + 0.08 * rnd(); }
      else { const i = Math.floor(rnd() * (r0.length - 1)), t = rnd(), [ax, az] = r0[i], [bx, bz] = r0[i + 1]; if (!inTile(b, i, t)) continue; x = ax + (bx - ax) * t; z = az + (bz - az) * t; y = b.h0 + rnd() * (b.h - b.h0); const nx = bz - az, nz = -(bx - ax), nl = Math.hypot(nx, nz) || 1; L = 0.2 + 0.26 * Math.abs((nx * KEY[0] + nz * KEY[2]) / nl) + 0.14 * b.tall; }
      kind = KIND.surface;
    }
    if (put(x, g + y, z, L, kind, 0.7 + 1.6 * b.tall)) n++;
  }
  // windows: floors every 3.6 m, a window every ~3 m along each wall; taller buildings first (they carry the skyline)
  const wall = items.filter((b) => b.h >= 9).map((b) => ({ b, w: b.per * (b.h - b.h0) * (0.4 + b.tall) }));
  const wcum = []; let wacc = 0; wall.forEach((o) => wcum.push((wacc += o.w)));
  let wn = 0; guard = 0;
  while (wn < LIGHTS.window && guard++ < LIGHTS.window * 20) {
    let lo = 0, hi = wcum.length - 1; const u = rnd() * wacc; while (lo < hi) { const mid = (lo + hi) >> 1; if (wcum[mid] < u) lo = mid + 1; else hi = mid; }
    const { b } = wall[lo], r0 = b.rings[0], i = Math.floor(rnd() * (r0.length - 1)), [ax, az] = r0[i], [bx, bz] = r0[i + 1], sl = Math.hypot(bx - ax, bz - az); if (sl < 3) continue;
    const t = (Math.floor(rnd() * Math.floor(sl / 3)) + 0.5) * 3 / sl; if (t >= 1 || !inTile(b, i, t)) continue;
    const floors = Math.max(1, Math.floor((b.h - b.h0 - 2) / 3.6)), y = b.h0 + 1.8 + Math.floor(rnd() * floors) * 3.6;
    const nx = bz - az, nz = -(bx - ax), nl = Math.hypot(nx, nz) || 1, o = 0.35;   // a hair outside the wall
    const g = groundAt((b.bb[0] + b.bb[2]) / 2, (b.bb[1] + b.bb[3]) / 2);
    if (putLight(ax + (bx - ax) * t + (nx / nl) * o, g + y, az + (bz - az) * t + (nz / nl) * o, 0.62 + 0.3 * rnd() * (0.6 + 0.4 * b.tall), KIND.window)) wn++;
  }
}
// the Sky Tower from its own OpenStreetMap parts (shaft, pod, mast), the brightest thing on the map
const skyParts = buildings.filter(isSky);
const skyTop = Math.max(328, ...skyParts.map((b) => b.h));
{
  const want = Math.round(TOTAL * OVER * SHARE.sky), g = groundAt(skx, skz);
  const radiusAt = (y) => { let r = 0; for (const b of skyParts) if (y >= b.h0 && y <= b.h) { const rr = Math.max(...b.rings[0].map(([x, z]) => Math.hypot(x - skx, z - skz))); r = Math.max(r, rr); } return Math.min(r || 99, y < 186 ? 6.5 : y < 225 ? 18 : y < 300 ? 3.5 : 1.6) || (y < 186 ? 6.5 : y < 225 ? 18 : y < 300 ? 3.5 : 1.6); };
  for (let n = 0; n < want;) {
    const y = Math.pow(rnd(), 0.85) * skyTop, r = radiusAt(y), th = rnd() * Math.PI * 2, rim = rnd() < 0.5;
    const ring = (y > 186 && y < 225 && rnd() < 0.5) ? (rnd() < 0.5 ? 190 + rnd() * 2 : 220 + rnd() * 2) : y;   // the pod's decks
    const L = 0.84 + 0.16 * rnd() + (y > 300 ? 0.1 : 0);
    if (put(skx + Math.cos(th) * r * (rim ? 1 : Math.sqrt(rnd())), g + ring, skz + Math.sin(th) * r * (rim ? 1 : Math.sqrt(rnd())), L, KIND.highlight, 6)) n++;
  }
}
// reflections: below each light near the water, a short broken streak on the water toward the harbour (the camera's side), so the
// waterfront's lights shimmer in the basin. They switch on with the street lights.
{
  const src = []; for (let i = 0; i < lights.x.length; i++) if (lights.k[i] === KIND.street || (lights.k[i] === KIND.window && lights.y[i] / S < 60)) src.push(i);
  let n = 0, guard = 0;
  while (n < LIGHTS.reflection && guard++ < LIGHTS.reflection * 40 && src.length) {
    const i = src[Math.floor(rnd() * src.length)], x = lights.x[i] / S + (rnd() - 0.5) * 2.5, z0 = lights.z[i] / S, d = 3 + Math.pow(rnd(), 1.6) * 46, z = z0 - d;   // north of the light
    if (maskAt(x, z) !== 1 || maskAt(x, z0 - 2) !== 1 && maskAt(x, z0 - 6) !== 1) continue;
    if (putLight(x, 0.15, z, 0.5 * (1 - d / 52) + 0.12 * rnd(), KIND.reflection)) n++;
  }
}
console.log(`lights: ${lights.x.length} (windows, street lights, reflections)`);

// ------------------------------------------------------------------------------------------------ walking routes on the real map
// A shortest path over a 2 m walkability grid: footpaths, pedestrian areas, wharves and footbridges cheap; other open land dearer;
// roads dearer still; buildings, the drawn restaurant and the water closed.
const GR = 2, GW = Math.ceil(WIDTH / GR), GH = Math.ceil(DEPTH / GR), COST = new Float32Array(GW * GH).fill(3);
const gIdx = (x, z) => { const i = Math.floor((x + WIDTH / 2) / GR), j = Math.floor((z + DEPTH / 2) / GR); return i < 0 || j < 0 || i >= GW || j >= GH ? -1 : j * GW + i; };
const gXZ = (k) => [(k % GW + 0.5) * GR - WIDTH / 2, (Math.floor(k / GW) + 0.5) * GR - DEPTH / 2];
for (let k = 0; k < GW * GH; k++) { const [x, z] = gXZ(k); if (maskAt(x, z) !== 0) COST[k] = Infinity; }
const rasterPoly = (p, v, onlyIf) => { for (let j = Math.max(0, Math.floor((p.bb[1] + DEPTH / 2) / GR)); j <= Math.min(GH - 1, Math.floor((p.bb[3] + DEPTH / 2) / GR)); j++) for (let i = Math.max(0, Math.floor((p.bb[0] + WIDTH / 2) / GR)); i <= Math.min(GW - 1, Math.floor((p.bb[2] + WIDTH / 2) / GR)); i++) { const k = j * GW + i, [x, z] = gXZ(k); if (inPoly(p.rings, x, z) && (!onlyIf || onlyIf(COST[k]))) COST[k] = v; } };
const rasterLine = (l, v, wid, onlyIf) => { for (let s = 0; s + 1 < l.pts.length; s++) { const [ax, az] = l.pts[s], [bx, bz] = l.pts[s + 1], n = Math.ceil(Math.hypot(bx - ax, bz - az) / 1); for (let q = 0; q <= n; q++) { const x = ax + (bx - ax) * q / n, z = az + (bz - az) * q / n; for (let ox = -wid; ox <= wid; ox += GR) for (let oz = -wid; oz <= wid; oz += GR) { const k = gIdx(x + ox, z + oz); if (k >= 0 && (!onlyIf || onlyIf(COST[k]))) COST[k] = Math.min(COST[k] === Infinity && v < 50 ? v : COST[k], v); } } } };
lines.filter((l) => /motorway|trunk|primary|secondary|tertiary/.test(l.cls) && l.brunnel !== "tunnel" && l.brunnel !== "bridge").forEach((l) => rasterLine(l, 6, 4, (c) => c !== Infinity));
lines.filter((l) => /minor|service/.test(l.cls) && l.brunnel !== "tunnel").forEach((l) => rasterLine(l, 3.5, 2, (c) => c !== Infinity));
peds.forEach((p) => rasterPoly(p, 1));
piers.forEach((p) => rasterPoly(p, 1.2));
bridges.forEach((p) => rasterPoly(p, 1.4));
lines.filter((l) => l.cls === "path" && l.brunnel !== "tunnel" && !/corridor|platform/.test(l.sub)).forEach((l) => rasterLine(l, 1, 2));   // footpaths and footbridges open, even over water
lines.filter((l) => l.cls === "pier").forEach((l) => rasterLine(l, 1.2, 1));
buildings.forEach((b) => rasterPoly(b, Infinity));
{ const p = { rings: [[...restaurantFoot, restaurantFoot[0]]] }; p.bb = bbox(p); rasterPoly(p, Infinity); }
if (process.env.DEBUG_GRID) {   // a picture of the walkability grid, for checking routes (not part of the bake)
  const img = Buffer.alloc(GW * GH * 3); for (let k = 0; k < GW * GH; k++) { const c = COST[k], v = c === Infinity ? 0 : Math.round(255 - c * 36); img[k * 3] = img[k * 3 + 1] = img[k * 3 + 2] = Math.max(0, v); if (c === Infinity && maskAt(...gXZ(k)) === 1) img[k * 3 + 2] = 90; }
  const mark = (p, col) => { for (let a = -3; a <= 3; a++) for (let b = -3; b <= 3; b++) { const k = gIdx(p[0] + a * GR, p[1] + b * GR); if (k >= 0) { img[k * 3] = col[0]; img[k * 3 + 1] = col[1]; img[k * 3 + 2] = col[2]; } } };
  globalThis.__dbg = { img, mark }; process.on("exit", () => fs.writeFileSync(process.env.DEBUG_GRID, Buffer.concat([Buffer.from(`P6 ${GW} ${GH} 255\n`), img])));
}
// the one big walkable network (pockets inside courtyards and between footprints are left out)
const COMP = new Int32Array(GW * GH).fill(-1); let MAIN = -1;
{
  let id = 0, best = 0;
  for (let k0 = 0; k0 < GW * GH; k0++) {
    if (COMP[k0] >= 0 || COST[k0] === Infinity) continue; const q = [k0]; COMP[k0] = id; let n = 0;
    while (q.length) { const k = q.pop(); n++; const i = k % GW, j = (k - i) / GW; for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= GW || jj >= GH) continue; const kk = jj * GW + ii; if (COMP[kk] < 0 && COST[kk] !== Infinity) { COMP[kk] = id; q.push(kk); } } }
    if (n > best) { best = n; MAIN = id; } id++;
  }
}
console.log("walk grid", GW, "x", GH, "main network", MAIN);
const nearestOpen = (x, z) => { let best = -1, bd = Infinity; for (let r = 0; r < 60 && best < 0; r += 2) for (let a = 0; a < 24; a++) { const k = gIdx(x + Math.cos(a / 24 * 6.283) * r, z + Math.sin(a / 24 * 6.283) * r); if (k >= 0 && COMP[k] === MAIN) { const [gx, gz] = gXZ(k), d = Math.hypot(gx - x, gz - z); if (d < bd) { bd = d; best = k; } } } return best; };
function route(from, to) {
  const s = nearestOpen(...from), g = nearestOpen(...to); if (s < 0 || g < 0) throw new Error("route endpoint not walkable: " + from + " → " + to);
  const dist = new Float64Array(GW * GH).fill(Infinity), prev = new Int32Array(GW * GH).fill(-1), heap = [];
  const push = (k, d) => { heap.push([d, k]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  const [gx, gz] = gXZ(g), hEst = (k) => { const [x, z] = gXZ(k); return Math.hypot(x - gx, z - gz) / GR; };
  dist[s] = 0; push(s, hEst(s));
  const nb = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]];
  const done = new Uint8Array(GW * GH);
  while (heap.length) {
    const [, k] = pop(); if (done[k]) continue; done[k] = 1; if (k === g) break; const i = k % GW, j = Math.floor(k / GW);
    for (const [di, dj, w] of nb) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= GW || jj >= GH) continue; const kk = jj * GW + ii, c = COST[kk]; if (c === Infinity) continue; const nd = dist[k] + w * (c + COST[k]) / 2; if (nd < dist[kk]) { dist[kk] = nd; prev[kk] = k; push(kk, nd + hEst(kk)); } }
  }
  if (prev[g] < 0 && g !== s) throw new Error("no route " + from + " → " + to);
  const cells = []; for (let k = g; k >= 0; k = prev[k]) cells.push(gXZ(k)); cells.reverse();
  // string-pull: keep a point only where a straight walk would cross a closed or dearer cell
  const clear = (a, b) => { const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 1); for (let q = 0; q <= n; q++) { const k = gIdx(a[0] + (b[0] - a[0]) * q / n, a[1] + (b[1] - a[1]) * q / n); if (k < 0 || COST[k] > 1.5) return false; } return true; };
  const out = [cells[0]]; let a = 0;
  for (let i = 2; i < cells.length; i++) if (!clear(cells[a], cells[i])) { out.push(cells[i - 1]); a = i - 1; }
  out.push(cells[cells.length - 1]);
  // resample every 4 m, a little smoothing
  const res = []; for (let i = 0; i + 1 < out.length; i++) { const [ax, az] = out[i], [bx, bz] = out[i + 1], n = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / 4)); for (let q = 0; q < n; q++) res.push([ax + (bx - ax) * q / n, az + (bz - az) * q / n]); }
  res.push(out[out.length - 1]);
  const sm = res.map((p, i) => i === 0 || i === res.length - 1 ? p : [(res[i - 1][0] + p[0] * 2 + res[i + 1][0]) / 4, (res[i - 1][1] + p[1] * 2 + res[i + 1][1]) / 4]);
  let len = 0; for (let i = 0; i + 1 < sm.length; i++) len += Math.hypot(sm[i + 1][0] - sm[i][0], sm[i + 1][1] - sm[i][1]);
  return { pts: sm, len };
}
// the door: on the landward side of the pavilion, at its eastern end
const DOOR = R.at(R.L * 0.28, -R.D / 2 - 2.5);
if (globalThis.__dbg) { globalThis.__dbg.mark(DOOR, [255, 0, 0]); globalThis.__dbg.mark([R.cx, R.cz], [255, 0, 255]); }
const PLACES = {
  east: toM(174.76555, -36.84345),        // Quay Street at the foot of Princes Wharf
  west: toM(174.75545, -36.84035),        // Wynyard Quarter, across the footbridge over the basin's mouth
  south: toM(174.76285, -36.84615),       // up from the city centre
  princes: toM(174.76545, -36.84060),     // out along Princes Wharf
  wynyard: toM(174.75640, -36.83900),     // the Wynyard waterfront
  basinNorth: toM(174.76010, -36.84150),  // the wharf on the basin's north side
};
const routes = {};
if (globalThis.__dbg) Object.values(PLACES).forEach((p) => globalThis.__dbg.mark(p, [0, 255, 0]));
for (const k of ["east", "west", "south"]) { const r = route(PLACES[k], DOOR); routes[k] = r; console.log(`route ${k}: ${Math.round(r.len)} m, ${r.pts.length} points`); }
// where the waitlist waits: about 110 m along the promenade to the east, out of the doorway and off the path
const WAIT = (() => { const r = routes.east.pts, n = r.length; let d = 0; for (let i = n - 1; i > 0; i--) { d += Math.hypot(r[i][0] - r[i - 1][0], r[i][1] - r[i - 1][1]); if (d > 110) return r[i - 1]; } return r[0]; })();
routes.toWait = route(DOOR, WAIT);
const ambientPairs = [["west", "east"], ["wynyard", "princes"], ["south", "basinNorth"], ["west", "south"], ["princes", "basinNorth"], ["wynyard", "east"]];
const ambient = ambientPairs.map(([a, b]) => { const r = route(PLACES[a], PLACES[b]); console.log(`ambient ${a}→${b}: ${Math.round(r.len)} m`); return r; });
if (globalThis.__dbg) for (const r of [routes.east, routes.west, routes.south, routes.toWait, ...ambient]) for (const p of r.pts) { const k = gIdx(...p); if (k >= 0) { globalThis.__dbg.img[k * 3] = 255; globalThis.__dbg.img[k * 3 + 1] = 120; globalThis.__dbg.img[k * 3 + 2] = 0; } }
const toU = (p, lift = 1.1) => [+(p[0] * S).toFixed(5), +((groundAt(p[0], p[1]) + lift) * S).toFixed(5), +(p[1] * S).toFixed(5)];
const routeU = (r) => ({ lengthM: Math.round(r.len), pts: r.pts.map((p) => toU(p, maskAt(p[0], p[1]) === 1 ? 2.4 : 1.1)) });

// ------------------------------------------------------------------------------------------------ anchors (real geography)
const anchor = (x, z, hM) => [+(x * S).toFixed(4), +(hM * S).toFixed(4), +(z * S).toFixed(4)];
const restaurantTop = R.g + R.H;
const anchors = {
  skytower: anchor(skx, skz, groundAt(skx, skz) + skyTop),
  viaduct: anchor(...toM(174.7598, -36.8423), 0),          // open water in the middle of the basin
  wynyard: anchor(...toM(174.7553, -36.8402), groundAt(...toM(174.7553, -36.8402)) + 8),
  wharf: anchor(...toM(174.76545, -36.8414), 2.5),          // Princes Wharf, where the eastern stream of walk-ins starts
  restaurant: anchor(R.cx, R.cz, restaurantTop),
  deck: anchor(...R.at(0, R.D / 2 + R.deck * 0.6), R.g + 1),
  door: anchor(...DOOR, R.g + 1),
  wait: anchor(...WAIT, groundAt(...WAIT) + 1.5),
};

// ------------------------------------------------------------------------------------------------ order, quantise, write
const N = pts.x.length, order = Array.from({ length: N }, (_, i) => [Math.pow(rnd(), 1 / pts.w[i]), i]).sort((a, b) => b[0] - a[0]).slice(0, TOTAL).map((o) => o[1]);
const LN = lights.x.length, lorder = Array.from({ length: LN }, (_, i) => [rnd(), i]).sort((a, b) => a[0] - b[0]).map((o) => o[1]);
const rng3 = (...arrs) => { let a = Infinity, b = -Infinity; for (const arr of arrs) for (const v of arr) { if (v < a) a = v; if (v > b) b = v; } return [a, b]; };
const bx = rng3(pts.x, lights.x), by = [0, rng3(pts.y, lights.y)[1]], bz = rng3(pts.z, lights.z), q = (v, [a, b]) => Math.round(clamp((v - a) / (b - a)) * 65535);
const buf = Buffer.alloc((order.length + LN) * 8), counts = [0, 0, 0, 0], lcounts = { window: 0, street: 0, reflection: 0 };
const write = (k, x, y, z, l, kind) => { buf.writeUInt16LE(q(x, bx), k * 8); buf.writeUInt16LE(q(Math.max(0, y), by), k * 8 + 2); buf.writeUInt16LE(q(z, bz), k * 8 + 4); buf[k * 8 + 6] = Math.round(l * 255); buf[k * 8 + 7] = kind; };
order.forEach((i, k) => { write(k, pts.x[i], pts.y[i], pts.z[i], pts.l[i], pts.k[i]); counts[pts.k[i]]++; });
lorder.forEach((i, k) => { write(order.length + k, lights.x[i], lights.y[i], lights.z[i], lights.l[i], lights.k[i]); lcounts[{ 10: "window", 11: "street", 12: "reflection" }[lights.k[i]]]++; });
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "viaduct-points.bin"), buf);
const header = {
  format: "assembl-points/1", count: order.length, stride: 8,
  layout: "x:u16 y:u16 z:u16 light:u8 kind:u8, little-endian, interleaved; the main set in weighted random order (any prefix is a fair sample), then the lights",
  lights: { offset: order.length, count: LN, kinds: { 10: "window", 11: "street light", 12: "reflection" }, counts: lcounts, order: "random (any prefix is a fair sample)" },
  bounds: { x: bx, y: by, z: bz }, kinds: { surface: counts[0], edge: counts[1], ground: counts[2], highlight: counts[3] },
  units: "engine units: the larger of width and depth is 2.1; x east, z south, y up; heights at true scale", metresPerUnit: +(1 / S).toFixed(2), verticalExaggeration: 1,
  area: { ...BOUNDS, widthKm: +(WIDTH / 1000).toFixed(2), depthKm: +(DEPTH / 1000).toFixed(2) },
  anchors,
  // the drawn Example restaurant: its outline (pavilion and deck) in engine units, and which way the water is. Fictional.
  restaurant: { drawn: true, label: "Example restaurant, drawn", outline: restaurantFoot.map(([x, z]) => anchor(x, z, R.g)), waterDir: [+R.wx.toFixed(3), +R.wz.toFixed(3)], sizeM: [R.L, R.D, R.deck] },
  // walking routes on the real map (2 m grid), each ending (or starting) at the Example restaurant's door
  routes: { east: routeU(routes.east), west: routeU(routes.west), south: routeU(routes.south), toWait: routeU(routes.toWait), ambient: ambient.map(routeU) },
  sources: [
    { what: "terrain", source: "AWS Terrain Tiles (Terrarium), zoom 15", url: "https://registry.opendata.aws/terrain-tiles/", upstream: "LINZ NZ 8 m Digital Elevation Model", licence: "CC BY 4.0" },
    { what: "coastline and marina basin, buildings and heights, wharves and pontoons, pedestrian areas, paths, roads and bridges (no names read)", source: "OpenFreeMap vector tiles (OpenMapTiles schema), zoom 14, " + VEC.split("/")[4], url: "https://openfreemap.org", upstream: "OpenStreetMap", licence: "ODbL 1.0 (© OpenStreetMap contributors); tiles © OpenMapTiles" },
    { what: "Example restaurant (pavilion and deck) and the night's lights", source: "drawn by this script; window and street-light positions follow the map's buildings and roads", licence: "assembl" },
  ],
  built: new Date().toISOString().slice(0, 10), script: "tools/pointcloud/bake-viaduct.mjs",
};
fs.writeFileSync(path.join(OUT, "viaduct-points.json"), JSON.stringify(header, null, 1) + "\n");
console.log(`wrote ${order.length} points + ${LN} lights (${(buf.length / 1048576).toFixed(2)} MB) of ${N} candidates; kinds`, header.kinds, "lights", lcounts, "anchors", anchors);
