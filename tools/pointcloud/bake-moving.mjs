#!/usr/bin/env node
// assembl lab · bakes the Moving house sim (/moving/): the inner isthmus of Tāmaki Makaurau Auckland as a point cloud, with three
// street-level crops (the flat the Example tenant leaves and the two rentals on their shortlist that the sim can move them to),
// plus the published market rents for the three areas.
//
//   node tools/pointcloud/bake-moving.mjs [--cache DIR]
//   → assets/models/moving/moving-points.bin (+ moving-points.json, the header: bounds, layers, streets, places, rents, sources)
//
// Sources (all open, no API key; see assets/models/moving/SOURCE.md):
//   Terrain     AWS Terrain Tiles (Terrarium PNG, zoom 13, ≈15 m). In New Zealand their source is LINZ's 8 m DEM, CC BY 4.0.
//   Map         OpenStreetMap roads, building footprints and heights, coastline and lakes, from OpenFreeMap's vector tiles
//               (OpenMapTiles schema, zoom 14). © OpenStreetMap contributors, ODbL; tiles © OpenMapTiles. House numbers, names of
//               places and points of interest are never read.
//   Areas       Stats NZ Statistical Area 2 (2019) boundaries, to find which area each street sits in (CC BY 4.0, Stats NZ; served
//               by Eagle Technology's public ArcGIS layer). Only the area's code and name are kept.
//   Rents       Tenancy Services (MBIE) rental bond data, detailed quarterly file by SA2 (2019): the newest quarter's median
//               weekly rent, all dwellings and all bedroom counts. CC BY 3.0 NZ, credit MBIE.
//
// Scale: horizontal positions are true to scale. Terrain is exaggerated ×5 (as the lab home's map) and buildings ×3, so the
// volcanic cones read from above and a house is still a low box beside its street. Nothing here singles out a house: the street
// crops are whole blocks, the page draws its own "Example house" over the street, and no house number is read or written.
//
// Per point (10 bytes, little-endian, interleaved; weighted random order, so any prefix is a fair sample of every layer):
//   x, y, z  uint16 over the header's bounds
//   light    uint8 (0–255 → 0–1)
//   kind     uint8 (0 surface, 1 edge, 2 ground, 3 highlight), as the shared engine's forms (lab/pc/engine.js)
//   layer    uint8 (0 city, 1 old street crop, 2 new street crop "b", 3 new street crop "a")
//   group    uint8 (0 none; 1–3 the three streets' own lines; 4–6 their blocks), for the page to light a street or a block
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fetchCached, decodePNG, decodeMVT, lon2x, lat2y } from "./geo-tiles.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, "../..");
const OUT = path.join(ROOT, "assets/models/moving");
const argCache = process.argv.indexOf("--cache");
const CACHE = argCache > 0 ? process.argv[argCache + 1] : path.join(HERE, ".cache");

// ------------------------------------------------------------------------------------------------ the area, the streets, the budget
// Sandringham to Ellerslie and Royal Oak, Maungawhau to Maungakiekie, the city centre's southern edge to Onehunga: all inside the
// lab home's map (174.668–174.905 E, 36.762–36.93 S)
const BOUNDS = { west: 174.705, east: 174.845, south: -36.928, north: -36.842 };
const VERT = 5, BLD = 3, SIZE = 2.1;
const CITY_N = 196000, CROP_N = 32000, CROP_R = 330;          // street crops: a 330 m radius around the street, dissolving at the rim
// ordinary residential streets. `near` picks the stretch of the street the crop centres on (Calgary Street runs into Balmoral at its
// east end; the crop sits on its Sandringham East half)
const STREETS = {
  old: { group: 1, block: 4, layer: 1, name: "Calgary Street", suburb: "Sandringham", near: [174.7395, -36.8923] },
  b: { group: 2, block: 5, layer: 2, name: "Lonsdale Street", suburb: "Ellerslie", near: [174.8100, -36.8927] },
  a: { group: 3, block: 6, layer: 3, name: "Haydn Avenue", suburb: "Royal Oak", near: [174.7773, -36.9070] },
};
// the third shortlist option is a block, not a street (the sim never moves the tenant there)
const SHORTLIST_C = { suburb: "Mount Albert", at: [174.7232, -36.8838] };
// the businesses in the journey stand at generic locations: a point in a commercial or industrial part of the city chosen by hand,
// not any business's site. No business is named, read from the tiles or modelled.
const PLACES = {
  pm: { label: "Property manager", at: [174.7762, -36.8688] },
  movers: { label: "Movers", at: [174.8175, -36.9062] },
  power: { label: "Power retailer", at: [174.7598, -36.8590] },
  internet: { label: "Internet provider", at: [174.7462, -36.8725] },
};
const LANDMARKS = { maungawhau: [174.7644, -36.8767, 500], maungakiekie: [174.783, -36.9, 600] };   // for orientation only
const DEM_Z = 13, VEC_Z = 14, MASK_RES = 256;
const TERRARIUM = (z, x, y) => `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;
const SA2_LAYER = "https://services.arcgis.com/XTtANUDT8Va4DLwI/arcgis/rest/services/Statistical_Area_2_2019_Clipped_generalised/FeatureServer/0";
const BOND_PAGE = "https://www.tenancy.govt.nz/about-tenancy-services/data-and-statistics/rental-bond-data/";

const lat0 = (BOUNDS.south + BOUNDS.north) / 2, lon0 = (BOUNDS.west + BOUNDS.east) / 2;
const M_LON = 111320 * Math.cos((lat0 * Math.PI) / 180), M_LAT = 110574;
const WIDTH = (BOUNDS.east - BOUNDS.west) * M_LON, DEPTH = (BOUNDS.north - BOUNDS.south) * M_LAT, S = SIZE / Math.max(WIDTH, DEPTH);
const toM = (lon, lat) => [(lon - lon0) * M_LON, (lat0 - lat) * M_LAT];          // local metres: x east, z south, y up
const toLL = (x, z) => [lon0 + x / M_LON, lat0 - z / M_LAT];

let seed = 20261109;
const rnd = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const pick = (cum, acc) => { let lo = 0, hi = cum.length - 1; const u = rnd() * acc; while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] < u) lo = mid + 1; else hi = mid; } return lo; };
const cumOf = (arr, w) => { const c = new Float64Array(arr.length); let a = 0; arr.forEach((x, i) => { a += w(x); c[i] = a; }); return [c, a]; };

// ------------------------------------------------------------------------------------------------ terrain
const dx0 = Math.floor(lon2x(BOUNDS.west, DEM_Z)), dx1 = Math.floor(lon2x(BOUNDS.east, DEM_Z)), dy0 = Math.floor(lat2y(BOUNDS.north, DEM_Z)), dy1 = Math.floor(lat2y(BOUNDS.south, DEM_Z));
const DW = (dx1 - dx0 + 1) * 256, DH = (dy1 - dy0 + 1) * 256, DEM = new Float32Array(DW * DH);
for (let tx = dx0; tx <= dx1; tx++) for (let ty = dy0; ty <= dy1; ty++) {
  const { w, h, rgb } = decodePNG(fetchCached(TERRARIUM(DEM_Z, tx, ty), CACHE));
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const k = (j * w + i) * 3; DEM[((ty - dy0) * 256 + j) * DW + (tx - dx0) * 256 + i] = rgb[k] * 256 + rgb[k + 1] + rgb[k + 2] / 256 - 32768; }
}
const demAt = (lon, lat) => {
  const gx = (lon2x(lon, DEM_Z) - dx0) * 256 - 0.5, gy = (lat2y(lat, DEM_Z) - dy0) * 256 - 0.5, x = Math.floor(gx), y = Math.floor(gy), fx = gx - x, fy = gy - y;
  const g = (i, j) => DEM[clamp(j, 0, DH - 1) * DW + clamp(i, 0, DW - 1)];
  return (g(x, y) * (1 - fx) + g(x + 1, y) * fx) * (1 - fy) + (g(x, y + 1) * (1 - fx) + g(x + 1, y + 1) * fx) * fy;
};
const landH = (lon, lat) => Math.max(0.6, demAt(lon, lat));
console.log(`terrain: ${(dx1 - dx0 + 1) * (dy1 - dy0 + 1)} tiles`);

// ------------------------------------------------------------------------------------------------ vector tiles
const tilejson = JSON.parse(fetchCached("https://tiles.openfreemap.org/planet", CACHE).toString());
const VEC = tilejson.tiles[0];
const vx0 = Math.floor(lon2x(BOUNDS.west, VEC_Z)), vx1 = Math.floor(lon2x(BOUNDS.east, VEC_Z)), vy0 = Math.floor(lat2y(BOUNDS.north, VEC_Z)), vy1 = Math.floor(lat2y(BOUNDS.south, VEC_Z));
const MW = (vx1 - vx0 + 1) * MASK_RES, MH = (vy1 - vy0 + 1) * MASK_RES, MASK = new Uint8Array(MW * MH);   // 0 land, 1 sea, 2 lake
const tileLL = (tx, ty, ext, x, y) => { const X = tx + x / ext, Y = ty + y / ext, n = Math.PI - (2 * Math.PI * Y) / 2 ** VEC_Z; return [(X / 2 ** VEC_Z) * 360 - 180, (180 / Math.PI) * Math.atan(Math.sinh(n))]; };
// every sample is kept only inside its own tile (the tiler repeats a buffer of each neighbour), tested in metres
const tileBox = (tx, ty) => { const [w, n] = toM(...tileLL(tx, ty, 1, 0, 0)), [e, s] = toM(...tileLL(tx, ty, 1, 1, 1)); return { x0: w, x1: e, z0: n, z1: s }; };
const inBox = (b, x, z) => x >= b.x0 && x < b.x1 && z >= b.z0 && z < b.z1;
const coastSegs = [], buildings = [], roads = [], named = {};
for (let tx = vx0; tx <= vx1; tx++) for (let ty = vy0; ty <= vy1; ty++) {
  const t = decodeMVT(fetchCached(VEC.replace("{z}", VEC_Z).replace("{x}", tx).replace("{y}", ty), CACHE), ["water", "building", "transportation", "transportation_name"]), box = tileBox(tx, ty);
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
      coastSegs.push({ a: toM(...tileLL(tx, ty, ext, ax, ay)), b: toM(...tileLL(tx, ty, ext, bx, by)), lake: v === 2, box });
    }
  }
  for (const f of t.building?.features || []) {
    if (f.type !== 3 || f.props.hide_3d) continue;
    const area = (r) => { let a = 0; for (let i = 0; i + 1 < r.length; i++) a += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]; return a; };
    const ext = t.building.extent, sign = Math.sign(area(f.parts[0] || [])) || 1; let cur = null;
    for (const r of f.parts) {
      if (r.length < 4) continue;
      if (Math.sign(area(r)) === sign || !cur) { cur = { rings: [], box, h: Math.max(4, f.props.render_height ?? 6), h0: f.props.render_min_height ?? 0 }; buildings.push(cur); }
      cur.rings.push(r.map(([x, y]) => toM(...tileLL(tx, ty, ext, x, y))));
    }
  }
  for (const f of t.transportation?.features || []) {
    if (f.type !== 2) continue; const c = f.props.class; if (/rail|ferry|aerialway|pier|bridge$/.test(c) && c !== "rail") continue;
    for (const p of f.parts) roads.push({ cls: c, sub: f.props.subclass, brunnel: f.props.brunnel, pts: p.map(([x, y]) => toM(...tileLL(tx, ty, t.transportation.extent, x, y))), box });
  }
  // the three streets' own lines, by name (only these names are matched; no other name is read)
  for (const f of t.transportation_name?.features || []) for (const [id, st] of Object.entries(STREETS)) if (f.props.name === st.name) {
    for (const p of f.parts) (named[id] ??= []).push({ pts: p.map(([x, y]) => toM(...tileLL(tx, ty, t.transportation_name.extent, x, y))), box });
  }
}
const maskAt = (lon, lat) => { const i = Math.floor((lon2x(lon, VEC_Z) - vx0) * MASK_RES), j = Math.floor((lat2y(lat, VEC_Z) - vy0) * MASK_RES); return i < 0 || j < 0 || i >= MW || j >= MH ? 1 : MASK[j * MW + i]; };
console.log(`vector tiles: ${(vx1 - vx0 + 1) * (vy1 - vy0 + 1)}, ${coastSegs.length} shore segments, ${buildings.length} buildings, ${roads.length} road lines`);

// each street: the stretch near `near` (lines within 1.2 km of it), its nearest point as the crop's centre
const segDist = (px, pz, [ax, az], [bx, bz]) => { const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1, t = clamp(((px - ax) * dx + (pz - az) * dz) / L2); return [Math.hypot(px - ax - dx * t, pz - az - dz * t), ax + dx * t, az + dz * t]; };
for (const [id, st] of Object.entries(STREETS)) {
  const [nx, nz] = toM(...st.near); const lines = (named[id] || []).filter((l) => l.pts.some(([x, z]) => Math.hypot(x - nx, z - nz) < 1200));
  if (!lines.length) throw new Error(`street not found in the tiles: ${st.name}`);
  let best = [Infinity, nx, nz]; for (const l of lines) for (let i = 0; i + 1 < l.pts.length; i++) { const d = segDist(nx, nz, l.pts[i], l.pts[i + 1]); if (d[0] < best[0]) best = d; }
  st.lines = lines; st.c = [best[1], best[2]];
  st.len = lines.reduce((s, l) => s + l.pts.slice(1).reduce((a, p, i) => a + Math.hypot(p[0] - l.pts[i][0], p[1] - l.pts[i][1]), 0), 0) / 2;   // each line is in two tiles' buffers at most; a rough length
}
const distToStreet = (st, x, z) => { let d = Infinity; for (const l of st.lines) for (let i = 0; i + 1 < l.pts.length; i++) d = Math.min(d, segDist(x, z, l.pts[i], l.pts[i + 1])[0]); return d; };

// ------------------------------------------------------------------------------------------------ the point set
const P = { x: [], y: [], z: [], l: [], k: [], layer: [], g: [], w: [] };
const KIND = { surface: 0, edge: 1, ground: 2, highlight: 3 };
const KEY = (() => { const v = [-0.45, 0.8, 0.55], n = Math.hypot(...v); return v.map((c) => c / n); })();
const cityFade = (x, z) => { const u = Math.abs(x) / (WIDTH / 2), v = Math.abs(z) / (DEPTH / 2), d = Math.pow(Math.pow(u, 5) + Math.pow(v, 5), 1 / 5); return 1 - smooth(0.8, 1.0, d); };
function put(layer, fade, xm, ym, zm, light, kind, weight = 1, group = 0) {
  if (fade <= 0 || rnd() > Math.pow(fade, 0.7)) return false;
  P.x.push(xm * S); P.y.push(ym * S); P.z.push(zm * S); P.l.push(clamp(light * (0.55 + 0.45 * fade))); P.k.push(kind); P.layer.push(layer); P.g.push(group); P.w.push(weight); return true;
}
// ground height (exaggerated) at a point in metres
const groundY = (x, z) => landH(...toLL(x, z)) * VERT;
const streetOf = (x, z) => { for (const st of Object.values(STREETS)) if (Math.hypot(x - st.c[0], z - st.c[1]) < 1600 && distToStreet(st, x, z) < 9) return st; return null; };
const blockOf = (x, z) => { for (const st of Object.values(STREETS)) if (Math.hypot(x - st.c[0], z - st.c[1]) < 700 && distToStreet(st, x, z) < 70) return st; return null; };

// one sampler for a region: the city (layer 0) or a street crop (layers 1–3). A crop samples the same data far more densely.
function bake(layer, n, fadeAt, inside, share, { roadLight = 1, crop = null } = {}) {
  const want = (k) => Math.round(n * share[k]);
  const randIn = () => { if (!crop) return [(rnd() - 0.5) * WIDTH, (rnd() - 0.5) * DEPTH]; const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * CROP_R; return [crop.c[0] + Math.cos(a) * r, crop.c[1] + Math.sin(a) * r]; };
  // land: area-weighted in 3D, lit by the key light
  { let k = 0, guard = 0; const e = 12, W = want("land");
    while (k < W && guard++ < W * 40) {
      const [x, z] = randIn(), [lon, lat] = toLL(x, z), m = maskAt(lon, lat); if (m === 1) continue;
      const h = landH(lon, lat), [lx, la] = toLL(x + e, z), [, lb] = toLL(x, z + e);
      const gx = ((landH(lx, la) - h) / e) * VERT, gz = ((landH(lon, lb) - h) / e) * VERT, nl = Math.hypot(gx, 1, gz), nx = -gx / nl, ny = 1 / nl, nz = -gz / nl;
      if (rnd() > Math.min(1, (1 / ny) * 0.5)) continue;
      const lit = Math.max(0, nx * KEY[0] + ny * KEY[1] + nz * KEY[2]), L = m === 2 ? 0.22 : 0.14 + 0.42 * Math.pow(lit, 1.4) + 0.3 * smooth(10, 180, h);
      if (put(layer, fadeAt(x, z), x, h * VERT, z, L * (crop ? 0.8 : 1), crop ? KIND.ground : KIND.surface, 1)) k++;
    } }
  // contours every 20 m (the city only)
  if (share.contour) { const W = want("contour"), cross = [], STEP = 20;
    for (let j = 0; j < DH - 1; j++) for (let i = 0; i < DW - 1; i++) { const a = DEM[j * DW + i]; for (const [di, dj] of [[1, 0], [0, 1]]) { const b = DEM[(j + dj) * DW + i + di], la = Math.floor(a / STEP), lb = Math.floor(b / STEP); if (la === lb || Math.max(a, b) < STEP) continue; const lev = Math.max(la, lb) * STEP, t = (lev - a) / (b - a); cross.push([i + di * t, j + dj * t, lev]); } }
    const px2ll = (gx, gy) => { const X = dx0 + (gx + 0.5) / 256, Y = dy0 + (gy + 0.5) / 256, nn = Math.PI - (2 * Math.PI * Y) / 2 ** DEM_Z; return [(X / 2 ** DEM_Z) * 360 - 180, (180 / Math.PI) * Math.atan(Math.sinh(nn))]; };
    let k = 0, guard = 0;
    while (k < W && guard++ < W * 20 && cross.length) { const c = cross[Math.floor(rnd() * cross.length)], [lon, lat] = px2ll(c[0] + (rnd() - 0.5) * 0.9, c[1] + (rnd() - 0.5) * 0.9); if (maskAt(lon, lat) !== 0) continue; const [x, z] = toM(lon, lat); if (put(layer, fadeAt(x, z), x, (c[2] + 1) * VERT, z, 0.4 + 0.3 * smooth(20, 190, c[2]) + 0.08 * rnd(), KIND.edge, 1.2)) k++; } }
  // shores
  if (share.coast) { const segs = coastSegs.filter((s) => inside(s.a[0], s.a[1]) || inside(s.b[0], s.b[1])).map((s) => ({ ...s, L: Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]) * (s.lake ? 0.5 : 1) })).filter((s) => s.L > 0);
    if (segs.length) { const [cum, acc] = cumOf(segs, (s) => s.L); let k = 0, guard = 0; const W = want("coast");
      while (k < W && guard++ < W * 20) { const s = segs[pick(cum, acc)], t = rnd(), x = s.a[0] + (s.b[0] - s.a[0]) * t + (rnd() - 0.5) * 5, z = s.a[1] + (s.b[1] - s.a[1]) * t + (rnd() - 0.5) * 5; if (!inBox(s.box, x, z)) continue; const y = s.lake ? landH(...toLL(x, z)) * VERT : 1.2; if (put(layer, fadeAt(x, z), x, y, z, s.lake ? 0.5 : 0.7 + 0.2 * rnd(), KIND.edge, 2)) k++; } } }
  // sea: a faint level sheet
  if (share.sea) { let k = 0, guard = 0; const W = want("sea");
    while (k < W && guard++ < W * 40) { const [x, z] = randIn(); if (maskAt(...toLL(x, z)) !== 1) continue; const swell = 0.5 + 0.5 * Math.sin(x / 420 + Math.sin(z / 900) * 2) * Math.sin(z / 610 - x / 1500); if (put(layer, fadeAt(x, z), x, 0, z, 0.1 + 0.12 * swell + (rnd() < 0.01 ? 0.3 : 0), KIND.surface, 0.5)) k++; } }
  // roads: dense bright lines by class, a whisker above the ground; the three streets carry their group
  { const RL = { motorway: 0.86, trunk: 0.8, primary: 0.76, secondary: 0.68, tertiary: 0.6, minor: 0.48, service: 0.3, track: 0.26, path: 0.24, rail: 0.4 };
    const RW = { motorway: 4, trunk: 3.2, primary: 3, secondary: 2.4, tertiary: 2, minor: crop ? 1.6 : 0.9, service: crop ? 0.7 : 0.15, track: 0.2, path: crop ? 0.45 : 0.05, rail: 0.8 };
    const segs = []; for (const r of roads) { const cls = r.cls in RL ? r.cls : "path"; for (let i = 0; i + 1 < r.pts.length; i++) { const a = r.pts[i], b = r.pts[i + 1]; if (!inside(a[0], a[1]) && !inside(b[0], b[1])) continue; const L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L > 0) segs.push({ a, b, L, cls, box: r.box, w: L * RW[cls] }); } }
    const [cum, acc] = cumOf(segs, (s) => s.w); let k = 0, guard = 0; const W = want("road");
    while (k < W && guard++ < W * 20 && segs.length) {
      const s = segs[pick(cum, acc)], t = rnd(), half = { motorway: 11, trunk: 9, primary: 8, secondary: 7, tertiary: 6, minor: 4.5 }[s.cls] || 2, side = crop && rnd() < 0.6 ? (rnd() < 0.5 ? -1 : 1) : (rnd() - 0.5) * 0.4;
      const dx = s.b[0] - s.a[0], dz = s.b[1] - s.a[1], nx = -dz / s.L, nz = dx / s.L, x = s.a[0] + dx * t + nx * side * half, z = s.a[1] + dz * t + nz * side * half;
      if (!inBox(s.box, x, z)) continue; const st = streetOf(x, z);
      const L = (RL[s.cls] * roadLight + (st ? 0.18 : 0)) * (0.92 + 0.12 * rnd());
      if (put(layer, fadeAt(x, z), x, groundY(x, z) + 1.5, z, L, KIND.edge, st ? 3 : 1.4, st ? st.group : 0)) k++;
    } }
  // buildings: footprints at their mapped heights (×3). Outlines and corners for the edges, roofs for the faces
  { const W = want("building"), inPoly = (rings, x, z) => { let c = false; for (const r of rings) for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, zi] = r[i], [xj, zj] = r[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };
    const items = []; for (const b of buildings) { const r0 = b.rings[0]; let per = 0, area = 0, cx = 0, cz = 0; for (let i = 0; i + 1 < r0.length; i++) { per += Math.hypot(r0[i + 1][0] - r0[i][0], r0[i + 1][1] - r0[i][1]); area += r0[i][0] * r0[i + 1][1] - r0[i + 1][0] * r0[i][1]; cx += r0[i][0]; cz += r0[i][1]; } cx /= Math.max(1, r0.length - 1); cz /= Math.max(1, r0.length - 1); if (!inside(cx, cz) || per <= 0) continue;
      const tall = smooth(12, 60, b.h); items.push({ ...b, per, area: Math.abs(area) / 2, cx, cz, tall, w: (0.3 + (crop ? 0.6 : 4) * tall) * (per * Math.max(3, b.h - b.h0) * 0.02 + (Math.abs(area) / 2) * 0.0015) }); }
    const [cum, acc] = cumOf(items, (b) => b.w); let k = 0, guard = 0;
    while (k < W && guard++ < W * 30 && items.length) {
      const b = items[pick(cum, acc)], g = groundY(b.cx, b.cz), r0 = b.rings[0], H = b.h * BLD, H0 = b.h0 * BLD; let x, z, y, L, kind;
      if (rnd() < (crop ? 0.5 : 0.55 * b.tall + 0.12)) {
        const i = Math.floor(rnd() * (r0.length - 1)), t = rnd(), corner = rnd() < 0.4, [ax, az] = r0[i], [bx, bz] = r0[i + 1];
        x = corner ? ax : ax + (bx - ax) * t; z = corner ? az : az + (bz - az) * t; y = corner ? H0 + rnd() * (H - H0) : H; L = 0.42 + 0.36 * b.tall + 0.18 * (y - H0) / Math.max(1, H - H0); kind = KIND.edge;
      } else {
        let ok = false; for (let tries = 0; tries < 12 && !ok; tries++) { const i = Math.floor(rnd() * (r0.length - 1)), j = Math.floor(rnd() * (r0.length - 1)), s = rnd(); x = r0[i][0] + (r0[j][0] - r0[i][0]) * s; z = r0[i][1] + (r0[j][1] - r0[i][1]) * s; ok = inPoly(b.rings, x, z); }
        if (!ok) continue; y = H; L = 0.26 + 0.36 * b.tall + 0.1 * rnd(); kind = KIND.surface;
      }
      if (!inBox(b.box, x, z) || maskAt(...toLL(x, z)) === 1) continue;
      const blk = crop ? blockOf(x, z) : null;   // the houses along each street are one block: lit together, never one by one
      if (put(layer, fadeAt(x, z), x, g + y, z, L, kind, 0.8 + 1.2 * b.tall, blk ? blk.block : 0)) k++;
    } }
}
// the city: the whole crop, dissolving at its edges
bake(0, CITY_N, cityFade, (x, z) => Math.abs(x) <= WIDTH / 2 + 50 && Math.abs(z) <= DEPTH / 2 + 50, { land: 0.16, contour: 0.11, coast: 0.07, sea: 0.05, road: 0.27, building: 0.34 });
const cityCount = P.x.length;
// the three street crops
for (const st of Object.values(STREETS)) {
  const fade = (x, z) => 1 - smooth(0.62, 1, Math.hypot(x - st.c[0], z - st.c[1]) / CROP_R);
  bake(st.layer, CROP_N, fade, (x, z) => Math.hypot(x - st.c[0], z - st.c[1]) < CROP_R + 60, { land: 0.1, road: 0.32, building: 0.58 }, { crop: st, roadLight: 1.0 });
}
console.log(`points: city ${cityCount}, crops ${P.x.length - cityCount}`);

// ------------------------------------------------------------------------------------------------ areas and rents (published data)
// long query URLs: cached under a hash of the URL (geo-tiles.mjs names a cache file after the whole URL)
const fetchHashed = (url) => { const f = path.join(CACHE, "q_" + createHash("sha1").update(url).digest("hex") + ".json"); if (fs.existsSync(f) && fs.statSync(f).size > 0) return fs.readFileSync(f); fs.mkdirSync(CACHE, { recursive: true }); const b = execFileSync("curl", ["-sSfL", "--compressed", "--max-time", "60", url]); fs.writeFileSync(f, b); return b; };
const sa2 = {};
for (const [id, st] of Object.entries(STREETS)) {
  const [lon, lat] = toLL(...st.c), url = `${SA2_LAYER}/query?geometry=${lon.toFixed(5)},${lat.toFixed(5)}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=SA2_code,SA2_name&returnGeometry=false&f=json`;
  const a = JSON.parse(fetchHashed(url).toString()).features?.[0]?.attributes; if (!a) throw new Error("no SA2 for " + st.name);
  sa2[id] = { code: a.SA2_code, name: a.SA2_name };
}
// the bond data page links the newest detailed quarterly file; read its link, then its rows for our three areas
const page = fetchCached(BOND_PAGE, CACHE).toString(), csvUrl = (page.match(/https:\/\/www\.tenancy\.govt\.nz\/assets\/Uploads\/Tenancy\/Rental-bond-data\/Detailed-Quarterly-Tenancy-[^"?]+\.csv(\?m=[0-9a-f]+)?/i) || [])[0];
if (!csvUrl) throw new Error("rental bond data: quarterly file not linked");
const csv = fetchCached(csvUrl, CACHE).toString().replace(/^﻿/, "").split(/\r?\n/), head = csv[0].split(",");
const col = (n) => head.indexOf(n), iT = col("TimeFrame"), iL = col("Location Id"), iD = col("Dwelling Type"), iB = col("Number Of Beds"), iM = col("Median Rent"), iA = col("Active Bonds"), iN = col("Total Bonds"), iLQ = col("Lower Quartile Rent"), iUQ = col("Upper Quartile Rent");
const codes = new Set(Object.values(sa2).map((s) => s.code)), rows = csv.slice(1).map((l) => l.split(",")).filter((r) => codes.has(r[iL]) && r[iD] === "ALL" && r[iB] === "ALL" && r[iM] !== "NULL");
const latest = rows.reduce((m, r) => (r[iT] > m ? r[iT] : m), "");
const quarterLabel = (d) => { const [y, m] = d.split("-").map(Number), M = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]; return `${M[m - 1]} to ${M[m + 1]} ${y}`; };
const rents = {};
for (const [id, a] of Object.entries(sa2)) {
  const r = rows.find((x) => x[iL] === a.code && x[iT] === latest); if (!r) throw new Error("no rent row for " + a.name);
  const prev = rows.filter((x) => x[iL] === a.code && x[iT] < latest).sort((p, q) => (p[iT] < q[iT] ? 1 : -1))[0];
  rents[id] = { sa2: a.code, area: a.name, medianWeekly: +r[iM], lowerQuartile: +r[iLQ], upperQuartile: +r[iUQ], newBonds: +r[iN], activeBonds: +r[iA], previousQuarterMedian: prev ? +prev[iM] : null };
}
console.log("rents:", latest, rents);

// ------------------------------------------------------------------------------------------------ anchors
const anchor = (x, z, yM = null) => [+(x * S).toFixed(5), +(((yM ?? landH(...toLL(x, z)) * VERT)) * S).toFixed(5), +(z * S).toFixed(5)];
const streets = Object.fromEntries(Object.entries(STREETS).map(([id, st]) => {
  // a few points along the stretch near the centre, for the page's own lines and the move's arc
  const line = []; for (const l of st.lines) for (const p of l.pts) if (Math.hypot(p[0] - st.c[0], p[1] - st.c[1]) < CROP_R * 0.8) line.push(anchor(p[0], p[1], groundY(...p) + 2));
  return [id, { name: st.name, suburb: st.suburb, layer: st.layer, group: st.group, block: st.block, anchor: anchor(...st.c, groundY(...st.c) + 2), lonlat: toLL(...st.c).map((v) => +v.toFixed(5)), cropRadius: +(CROP_R * S).toFixed(5), line: line.slice(0, 40), sa2: sa2[id] }];
}));
const places = Object.fromEntries(Object.entries(PLACES).map(([id, p]) => { const [x, z] = toM(...p.at); return [id, { label: p.label, anchor: anchor(x, z, groundY(x, z) + 2), lonlat: p.at }]; }));
const peak = (lon, lat, rM) => { let best = [lon, lat, -1e9]; for (let k = 0; k < 4000; k++) { const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * rM, [x, z] = toM(lon, lat), ll = toLL(x + Math.cos(a) * r, z + Math.sin(a) * r), h = demAt(...ll); if (h > best[2]) best = [...ll, h]; } return best; };
const landmarks = Object.fromEntries(Object.entries(LANDMARKS).map(([id, [lon, lat, r]]) => { const p = peak(lon, lat, r), [x, z] = toM(p[0], p[1]); return [id, { anchor: anchor(x, z, p[2] * VERT), heightM: Math.round(p[2]) }]; }));
const shortlistC = (() => { const [x, z] = toM(...SHORTLIST_C.at); return { suburb: SHORTLIST_C.suburb, anchor: anchor(x, z, groundY(x, z) + 2), lonlat: SHORTLIST_C.at }; })();
const km = (a, b) => +(Math.hypot(...[0, 1].map((i) => toM(...a)[i] - toM(...b)[i])) / 1000).toFixed(1);

// ------------------------------------------------------------------------------------------------ order, quantise, write
const N = P.x.length, order = Array.from({ length: N }, (_, i) => [Math.pow(rnd(), 1 / P.w[i]), i]).sort((a, b) => b[0] - a[0]).map((o) => o[1]);
const ext = (arr) => { let a = Infinity, b = -Infinity; for (const v of arr) { if (v < a) a = v; if (v > b) b = v; } return [a, b]; };
const bx = ext(P.x), by = [0, ext(P.y)[1]], bz = ext(P.z), q = (v, [a, b]) => Math.round(clamp((v - a) / (b - a)) * 65535);
const STRIDE = 10, buf = Buffer.alloc(N * STRIDE), counts = [0, 0, 0, 0], layers = [0, 0, 0, 0];
order.forEach((i, k) => { const o = k * STRIDE; buf.writeUInt16LE(q(P.x[i], bx), o); buf.writeUInt16LE(q(Math.max(0, P.y[i]), by), o + 2); buf.writeUInt16LE(q(P.z[i], bz), o + 4); buf[o + 6] = Math.round(P.l[i] * 255); buf[o + 7] = P.k[i]; buf[o + 8] = P.layer[i]; buf[o + 9] = P.g[i]; counts[P.k[i]]++; layers[P.layer[i]]++; });
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "moving-points.bin"), buf);
const header = {
  format: "assembl-points/2", count: N, stride: STRIDE,
  layout: "x:u16 y:u16 z:u16 light:u8 kind:u8 layer:u8 group:u8, little-endian, interleaved; weighted random order (any prefix is a fair sample of every layer)",
  bounds: { x: bx, y: by, z: bz }, kinds: { surface: counts[0], edge: counts[1], ground: counts[2], highlight: counts[3] },
  layers: { city: layers[0], old: layers[1], b: layers[2], a: layers[3] }, groups: { "1": "old street", "2": "street b", "3": "street a", "4": "old block", "5": "block b", "6": "block a" },
  units: "engine units: the larger of width and depth is 2.1; y = terrain × 5, buildings × 3", metresPerUnit: +(1 / S).toFixed(2), terrainExaggeration: VERT, buildingExaggeration: BLD,
  area: { ...BOUNDS, widthKm: +(WIDTH / 1000).toFixed(1), depthKm: +(DEPTH / 1000).toFixed(1) },
  streets, shortlistC, places, landmarks,
  distancesKm: { oldToB: km(STREETS.old.near, STREETS.b.near), oldToA: km(STREETS.old.near, STREETS.a.near) },
  rents: { quarterStart: latest, quarter: quarterLabel(latest), measure: "median weekly rent of new bonds lodged in the quarter, all dwelling types and bedroom counts", areas: rents,
    source: { name: "Tenancy Services (MBIE), rental bond data, detailed quarterly file by SA2", url: BOND_PAGE, file: csvUrl.split("?")[0], licence: "CC BY 3.0 NZ, credit the Ministry of Business, Innovation and Employment" } },
  sources: [
    { what: "terrain", source: "AWS Terrain Tiles (Terrarium), zoom 13", url: "https://registry.opendata.aws/terrain-tiles/", upstream: "LINZ NZ 8 m Digital Elevation Model", licence: "CC BY 4.0" },
    { what: "roads, buildings, coastline and lakes", source: "OpenFreeMap vector tiles (OpenMapTiles schema), zoom 14, " + VEC.split("/")[4], url: "https://openfreemap.org", upstream: "OpenStreetMap", licence: "ODbL 1.0 (© OpenStreetMap contributors); tiles © OpenMapTiles" },
    { what: "which area each street is in (code and name only)", source: "Stats NZ Statistical Area 2 2019 boundaries (generalised), via Eagle Technology's public ArcGIS layer", url: SA2_LAYER, licence: "CC BY 4.0, Stats NZ" },
    { what: "median weekly rents", source: "Tenancy Services (MBIE) rental bond data", url: BOND_PAGE, licence: "CC BY 3.0 NZ" },
  ],
  built: new Date().toISOString().slice(0, 10), script: "tools/pointcloud/bake-moving.mjs",
};
fs.writeFileSync(path.join(OUT, "moving-points.json"), JSON.stringify(header, null, 1) + "\n");
console.log(`wrote ${N} points (${(buf.length / 1048576).toFixed(2)} MB); layers`, header.layers, "kinds", header.kinds, "distances", header.distancesKm);
