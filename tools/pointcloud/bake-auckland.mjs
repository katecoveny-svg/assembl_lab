#!/usr/bin/env node
// assembl lab · bakes the lab home's hero: Tāmaki Makaurau Auckland as a point cloud, from open data, into a compact points file.
//
//   node tools/pointcloud/bake-auckland.mjs [--cache DIR]
//   → assets/models/auckland/auckland-points.bin (+ auckland-points.json, the header: bounds, anchors, sources, counts)
//
// Sources (all open, no API key; see assets/models/auckland/SOURCE.md):
//   Terrain     AWS Terrain Tiles (Terrarium PNG, zoom 13, ≈15 m; zoom 15, ≈3.8 m, on the volcanic cones), https://registry.opendata.aws/terrain-tiles/. In New Zealand
//               their source is LINZ's 8 m DEM, CC BY 4.0. height = R·256 + G + B/256 − 32768 metres.
//   Coastline   OpenStreetMap water polygons in OpenFreeMap's vector tiles (OpenMapTiles schema, zoom 14).
//   Buildings   OpenStreetMap building footprints and heights (render_height) from the same tiles. © OpenStreetMap
//               contributors, ODbL; tiles © OpenMapTiles, via OpenFreeMap.
//   Drawn       The Sky Tower and the Harbour Bridge are modelled from their published dimensions (approximate) at their real
//               positions; the tiles carry their footprint and line, not their shape. Everything else is measured data.
//
// Heights are exaggerated VERTICAL = 5× (terrain and buildings alike) so the volcanic cones read: Maungawhau's 196 m stands
// as if 980 m, Rangitoto's 260 m as if 1,300 m, the Sky Tower's 328 m as if 1,640 m. Over a map 21 km wide that is still gentle.
// Horizontal positions and footprints are true to scale, except the Sky Tower, drawn 5× in all directions so its shape reads.
//
// Per point (8 bytes, little-endian, interleaved so any prefix is a fair sample): x, y, z as uint16 over the header's bounds,
// light (0–255 → 0–1) and kind (0 surface, 1 edge, 2 ground, 3 highlight), as the shared engine's forms (lab/pc/engine.js).
// Points are written in a weighted random order (coastline, towers and the bridge earlier than open sea), so a phone can read
// just the first 80,000 and still get the whole map.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fetchCached, decodePNG, decodeMVT, lon2x, lat2y } from "./geo-tiles.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, "../..");
const OUT = path.join(ROOT, "assets/models/auckland");
const argCache = process.argv.indexOf("--cache");
const CACHE = argCache > 0 ? process.argv[argCache + 1] : path.join(HERE, ".cache");

// ------------------------------------------------------------------------------------------------ the area and the budget
// the isthmus from the Whau to the Tāmaki estuary, the Waitematā from Herne Bay to the gulf, Rangitoto, and Manukau's north shore
const BOUNDS = { west: 174.668, east: 174.905, south: -36.93, north: -36.762 };
const VERTICAL = 5;                     // vertical exaggeration, terrain and buildings
const SIZE = 2.1;                       // the larger of width and depth, in engine units (as the engine's normalise())
const TOTAL = 300000;
// spent where the camera looks: crisp coast, contours and silhouettes; the sea and the far suburbs thinned (see focus())
const SHARE = { land: 0.16, contour: 0.14, cones: 0.045, coast: 0.15, sea: 0.08, building: 0.30, sites: 0.05, bridge: 0.04, sky: 0.035 };
const DEM_Z = 13, VEC_Z = 14, MASK_RES = 256;   // mask: 256 px per zoom-14 tile, about 7.6 m
const TERRARIUM = (z, x, y) => `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;

const lat0 = (BOUNDS.south + BOUNDS.north) / 2, lon0 = (BOUNDS.west + BOUNDS.east) / 2;
const M_LON = 111320 * Math.cos((lat0 * Math.PI) / 180), M_LAT = 110574;
const WIDTH = (BOUNDS.east - BOUNDS.west) * M_LON, DEPTH = (BOUNDS.north - BOUNDS.south) * M_LAT, S = SIZE / Math.max(WIDTH, DEPTH);
// local metres: x east, z south (three.js: −z is north), y up
const toM = (lon, lat) => [(lon - lon0) * M_LON, (lat0 - lat) * M_LAT];
const toLL = (x, z) => [lon0 + x / M_LON, lat0 - z / M_LAT];

let seed = 20261108;
const rnd = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };

// ------------------------------------------------------------------------------------------------ terrain (Terrarium, zoom 13)
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

// ------------------------------------------------------------------------------------------------ vector tiles (OpenFreeMap, zoom 14)
const tilejson = JSON.parse(fetchCached("https://tiles.openfreemap.org/planet", CACHE).toString());
const VEC = tilejson.tiles[0];
const vx0 = Math.floor(lon2x(BOUNDS.west, VEC_Z)), vx1 = Math.floor(lon2x(BOUNDS.east, VEC_Z)), vy0 = Math.floor(lat2y(BOUNDS.north, VEC_Z)), vy1 = Math.floor(lat2y(BOUNDS.south, VEC_Z));
const MW = (vx1 - vx0 + 1) * MASK_RES, MH = (vy1 - vy0 + 1) * MASK_RES, MASK = new Uint8Array(MW * MH);   // 0 land, 1 sea (tidal), 2 lake
const coastSegs = [], buildings = [], pois = []; let bridgeLine = null;
const tileLL = (tx, ty, ext, x, y) => { const X = tx + x / ext, Y = ty + y / ext, n = Math.PI - (2 * Math.PI * Y) / 2 ** VEC_Z; return [(X / 2 ** VEC_Z) * 360 - 180, (180 / Math.PI) * Math.atan(Math.sinh(n))]; };
for (let tx = vx0; tx <= vx1; tx++) for (let ty = vy0; ty <= vy1; ty++) {
  const t = decodeMVT(fetchCached(VEC.replace("{z}", VEC_Z).replace("{x}", tx).replace("{y}", ty), CACHE), ["water", "building", "transportation", "poi"]);
  // water: fill the mask (even–odd, only this tile's own pixels, so the tile buffer never counts twice) and keep the shore edges
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
    // shore edges: drop the straight cuts the tiler makes at (and beyond) the tile's edge
    const onCut = (x, y) => x <= 0 || y <= 0 || x >= ext || y >= ext;
    for (const r of f.parts) for (let k = 0; k + 1 < r.length; k++) {
      const [ax, ay] = r[k], [bx, by] = r[k + 1]; if (onCut(ax, ay) && onCut(bx, by)) continue;
      coastSegs.push({ a: tileLL(tx, ty, ext, ax, ay), b: tileLL(tx, ty, ext, bx, by), lake: v === 2, cut: [onCut(ax, ay), onCut(bx, by)], ext, ta: [ax, ay], tb: [bx, by], tile: [tx, ty] });
    }
  }
  for (const f of t.building?.features || []) {
    if (f.type !== 3 || f.props.hide_3d) continue;
    // the tiler merges buildings with the same attributes into one multipolygon: split it back into footprints (an exterior ring
    // has the first ring's winding; the rings after it with the other winding are its courtyards)
    const ext = t.building.extent, area = (r) => { let a = 0; for (let i = 0; i + 1 < r.length; i++) a += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]; return a; };
    const sign = Math.sign(area(f.parts[0] || [])) || 1; let cur = null;
    for (const r of f.parts) {
      if (r.length < 4) continue;
      if (Math.sign(area(r)) === sign || !cur) { cur = { rings: [], tileRings: [], ext, tile: [tx, ty], h: Math.max(4, f.props.render_height ?? 6), h0: f.props.render_min_height ?? 0 }; buildings.push(cur); }
      cur.rings.push(r.map(([x, y]) => toM(...tileLL(tx, ty, ext, x, y)))); cur.tileRings.push(r);
    }
  }
  // points of interest: only the kind and the position are read (never a name), to find real sites of each twin's kind
  for (const f of t.poi?.features || []) if (f.type === 1 && f.parts[0]?.[0]) { const [x, y] = f.parts[0][0]; if (x >= 0 && y >= 0 && x < t.poi.extent && y < t.poi.extent) pois.push({ kind: `${f.props.class}/${f.props.subclass}`, ll: tileLL(tx, ty, t.poi.extent, x, y) }); }
  // the Harbour Bridge's line (the long motorway bridge between St Marys Bay and Northcote Point)
  for (const f of t.transportation?.features || []) {
    if (f.props.brunnel !== "bridge" || f.props.class !== "motorway") continue;
    const ll = f.parts.flat().map(([x, y]) => tileLL(tx, ty, t.transportation.extent, x, y)), a = ll[0], b = ll[ll.length - 1];
    const len = Math.hypot((b[0] - a[0]) * M_LON, (b[1] - a[1]) * M_LAT);
    if (len > 900 && Math.abs((a[0] + b[0]) / 2 - 174.745) < 0.01 && Math.abs((a[1] + b[1]) / 2 + 36.831) < 0.01 && (!bridgeLine || len > bridgeLine.len)) bridgeLine = { a, b, len };
  }
}
console.log(`vector tiles: ${(vx1 - vx0 + 1) * (vy1 - vy0 + 1)}, ${coastSegs.length} shore segments, ${buildings.length} buildings, bridge ${bridgeLine ? Math.round(bridgeLine.len) + " m" : "not found"}`);
const maskAt = (lon, lat) => { const i = Math.floor((lon2x(lon, VEC_Z) - vx0) * MASK_RES), j = Math.floor((lat2y(lat, VEC_Z) - vy0) * MASK_RES); return i < 0 || j < 0 || i >= MW || j >= MH ? 1 : MASK[j * MW + i]; };

// ------------------------------------------------------------------------------------------------ finer terrain on the cones
// AWS Terrain Tiles at zoom 15 (about 3.8 m, from the same LINZ DEM) around the volcanic cones, so their craters and rims come
// through: Rangitoto's summit crater, Maungawhau's 50 m deep crater, and the other cones of the isthmus. Approximate centres; the
// summit is found in the data.
const HI_Z = 15, hiTiles = new Map();
const CONES = [
  { id: "rangitoto", c: [174.861, -36.787], r: 1100, step: 5, depth: 70 },
  { id: "maungawhau", c: [174.7644, -36.8767], r: 520, step: 4, depth: 70 },
  { id: "maungakiekie", c: [174.783, -36.9], r: 560, step: 5, depth: 45 },
  { id: "maungauika", c: [174.8135, -36.8283], r: 360, step: 4, depth: 35 },
  { id: "owairaka", c: [174.7195, -36.8895], r: 460, step: 5, depth: 45 },
  { id: "maungarei", c: [174.8445, -36.8935], r: 520, step: 5, depth: 45 },
  { id: "ohinerau", c: [174.7905, -36.8805], r: 320, step: 4, depth: 35 },
  { id: "takarunga", c: [174.7982, -36.8264], r: 320, step: 4, depth: 35 },
];
for (const cn of CONES) {
  const [x, z] = toM(...cn.c), [w, n] = toLL(x - cn.r, z - cn.r), [e, s] = toLL(x + cn.r, z + cn.r);
  for (let tx = Math.floor(lon2x(w, HI_Z)); tx <= Math.floor(lon2x(e, HI_Z)); tx++) for (let ty = Math.floor(lat2y(n, HI_Z)); ty <= Math.floor(lat2y(s, HI_Z)); ty++) {
    const key = `${tx},${ty}`; if (hiTiles.has(key)) continue;
    const { w: tw, h: th, rgb } = decodePNG(fetchCached(TERRARIUM(HI_Z, tx, ty), CACHE)), a = new Float32Array(tw * th);
    for (let i = 0; i < tw * th; i++) a[i] = rgb[i * 3] * 256 + rgb[i * 3 + 1] + rgb[i * 3 + 2] / 256 - 32768;
    hiTiles.set(key, a);
  }
}
console.log(`fine terrain: ${hiTiles.size} zoom-${HI_Z} tiles on ${CONES.length} cones`);
const hiPx = (gx, gy) => { const a = hiTiles.get(`${Math.floor(gx / 256)},${Math.floor(gy / 256)}`); return a ? a[(gy & 255) * 256 + (gx & 255)] : null; };
const demHi = (lon, lat) => {
  const gx = lon2x(lon, HI_Z) * 256 - 0.5, gy = lat2y(lat, HI_Z) * 256 - 0.5, x = Math.floor(gx), y = Math.floor(gy), fx = gx - x, fy = gy - y;
  const a = hiPx(x, y), b = hiPx(x + 1, y), c = hiPx(x, y + 1), d = hiPx(x + 1, y + 1);
  if (a === null || b === null || c === null || d === null) return demAt(lon, lat);
  return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
};

// ------------------------------------------------------------------------------------------------ the point set
const pts = { x: [], y: [], z: [], l: [], k: [], w: [] };
const KIND = { surface: 0, edge: 1, ground: 2, highlight: 3 };
// the map dissolves at its edges (no box): a soft rounded-rectangle falloff, so the gulf and the suburbs fade into the plum ground
const edgeFade = (x, z) => { const u = Math.abs(x) / (WIDTH / 2), v = Math.abs(z) / (DEPTH / 2), d = Math.pow(Math.pow(u, 5) + Math.pow(v, 5), 1 / 5); return 1 - smooth(0.84, 1.0, d); };
// where the eye lands: the city centre, the harbour and the inner isthmus get the points; far suburbs and open sea get fewer
const [FX, FZ] = toM(174.775, -36.85);
const focus = (x, z) => 0.2 + 0.8 * Math.exp(-((x - FX) ** 2 + (z - FZ) ** 2) / 6200 ** 2);
function put(xm, ym, zm, light, kind, weight = 1) {
  const f = edgeFade(xm, zm); if (f <= 0 || rnd() > Math.pow(f, 0.7)) return false;
  pts.x.push(xm * S); pts.y.push(ym * VERTICAL * S); pts.z.push(zm * S); pts.l.push(clamp(light * (0.55 + 0.45 * f))); pts.k.push(kind); pts.w.push(weight); return true;
}
const KEY = (() => { const v = [-0.45, 0.8, 0.55], n = Math.hypot(...v); return v.map((c) => c / n); })();
const randXZ = () => [(rnd() - 0.5) * WIDTH, (rnd() - 0.5) * DEPTH];
const landH = (lon, lat) => Math.max(0.6, demHi(lon, lat));

// land: area-weighted in 3D (slopes, so the cones, get more points), lit by the key light, higher ground a little brighter
{
  const want = Math.round(TOTAL * SHARE.land), e = 8; let n = 0, guard = 0;
  while (n < want && guard++ < want * 60) {
    const [x, z] = randXZ(), [lon, lat] = toLL(x, z); if (rnd() > focus(x, z)) continue;
    const m = maskAt(lon, lat); if (m === 1) continue;
    const h = landH(lon, lat), [lx, la] = toLL(x + e, z), [, lb] = toLL(x, z + e);
    const gx = ((landH(lx, la) - h) / e) * VERTICAL, gz = ((landH(lon, lb) - h) / e) * VERTICAL, nl = Math.hypot(gx, 1, gz), nx = -gx / nl, ny = 1 / nl, nz = -gz / nl;
    if (rnd() > Math.min(1, (1 / ny) * 0.5)) continue;
    const lit = Math.max(0, nx * KEY[0] + ny * KEY[1] + nz * KEY[2]);
    const L = m === 2 ? 0.22 : 0.15 + 0.5 * Math.pow(lit, 1.4) + 0.3 * smooth(8, 170, h) + (rnd() < 0.012 ? 0.15 : 0);
    if (put(x, m === 2 ? h - 0.5 : h, z, L, KIND.surface, 1)) n++;
  }
}
// contours every 20 m: the topographic map's rings (crossings found along the terrain grid, placed at the contour's own height)
{
  const want = Math.round(TOTAL * SHARE.contour), cross = [], STEP = 20;
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
    if (maskAt(lon, lat) !== 0) continue; const [x, z] = toM(lon, lat); if (rnd() > 0.35 + 0.65 * focus(x, z)) continue;
    if (put(x, c[2] + 1, z, 0.44 + 0.32 * smooth(20, 190, c[2]) + 0.08 * rnd(), KIND.edge, 1.3)) n++;
  }
}
// the cones up close: contours every 4–5 m over the fine terrain near each summit, brightest at the rim, so a crater reads as a ring
// inside a ring. Summits (for the page's anchors) come from the same data.
const summits = {};
{
  const want = Math.round(TOTAL * SHARE.cones), share = CONES.map((c) => c.r * (c.depth / 40)), tot = share.reduce((a, b) => a + b, 0);
  CONES.forEach((cn, ci) => {
    const [cx, cz] = toM(...cn.c), G = 3.5, R = cn.r, N = Math.ceil((2 * R) / G), H = new Float32Array((N + 1) * (N + 1));
    let top = -1e9, tx = cx, tz = cz;
    for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) { const x = cx - R + i * G, z = cz - R + j * G, h = demHi(...toLL(x, z)); H[j * (N + 1) + i] = h; if (Math.hypot(x - cx, z - cz) < R * 0.8 && h > top) { top = h; tx = x; tz = z; } }
    summits[cn.id] = [tx, tz, top];
    const cross = [];
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const a = H[j * (N + 1) + i];
      for (const [di, dj] of [[1, 0], [0, 1]]) {
        const b = H[(j + dj) * (N + 1) + i + di], la = Math.floor(a / cn.step), lb = Math.floor(b / cn.step); if (la === lb) continue;
        const lev = Math.max(la, lb) * cn.step; if (lev < top - cn.depth) continue;
        const t = (lev - a) / (b - a), x = cx - R + (i + di * t) * G, z = cz - R + (j + dj * t) * G; if (Math.hypot(x - cx, z - cz) > R) continue;
        cross.push([x, z, lev]);
      }
    }
    const n = Math.round((want * share[ci]) / tot);
    for (let k = 0, guard = 0; k < n && cross.length && guard++ < n * 10;) {
      const c = cross[Math.floor(rnd() * cross.length)], rim = smooth(top - cn.depth, top - 1, c[2]);
      if (maskAt(...toLL(c[0], c[1])) === 1) continue;
      if (put(c[0] + (rnd() - 0.5) * 1.2, c[2] + 0.8, c[1] + (rnd() - 0.5) * 1.2, 0.46 + 0.3 * rim + 0.04 * rnd(), KIND.edge, 2)) k++;
    }
  });
}
// the coastline: dense, bright points along every shore (lakes quieter), a whisker above the water, held tight to the line
{
  const want = Math.round(TOTAL * SHARE.coast), segs = coastSegs.map((s) => { const [ax, az] = toM(...s.a), [bx, bz] = toM(...s.b); return { ...s, ax, az, bx, bz, L: Math.hypot(bx - ax, bz - az) * (s.lake ? 0.4 : 1) * (0.45 + 0.55 * focus((ax + bx) / 2, (az + bz) / 2)) }; }).filter((s) => s.L > 0);
  const cum = new Float64Array(segs.length); let acc = 0; segs.forEach((s, i) => { acc += s.L; cum[i] = acc; });
  let n = 0, guard = 0;
  while (n < want && guard++ < want * 20) {
    let lo = 0, hi = cum.length - 1; const u = rnd() * acc; while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] < u) lo = mid + 1; else hi = mid; }
    const s = segs[lo], t = rnd(), tx = s.ta[0] + (s.tb[0] - s.ta[0]) * t, ty = s.ta[1] + (s.tb[1] - s.ta[1]) * t;
    if (tx < 0 || ty < 0 || tx >= s.ext || ty >= s.ext) continue;                // the tile buffer: that stretch belongs to the next tile
    const x = s.ax + (s.bx - s.ax) * t + (rnd() - 0.5) * 2.5, z = s.az + (s.bz - s.az) * t + (rnd() - 0.5) * 2.5, [lon, lat] = toLL(x, z);
    const y = s.lake ? landH(lon, lat) : 1.2;
    if (put(x, y, z, s.lake ? 0.5 + 0.1 * rnd() : 0.74 + 0.2 * rnd(), KIND.edge, s.lake ? 1.2 : 2.2)) n++;
  }
}
// the sea: a faint, level sheet with a slow swell of light (the engine's sparkles make it shimmer), thinner far out
{
  const want = Math.round(TOTAL * SHARE.sea); let n = 0, guard = 0;
  while (n < want && guard++ < want * 40) {
    const [x, z] = randXZ(), [lon, lat] = toLL(x, z); if (maskAt(lon, lat) !== 1 || rnd() > focus(x, z)) continue;
    let shore = 0; for (const [ox, oz] of [[160, 0], [-160, 0], [0, 160], [0, -160]]) if (maskAt(...toLL(x + ox, z + oz)) !== 1) shore++;
    const swell = 0.5 + 0.5 * Math.sin(x / 420 + Math.sin(z / 900) * 2) * Math.sin(z / 610 - x / 1500);
    if (put(x, 0, z, 0.1 + 0.12 * swell + 0.07 * shore + (rnd() < 0.01 ? 0.3 : 0), KIND.surface, 0.5)) n++;
  }
}

// ------------------------------------------------------------------------------------------------ twins on real sites (examples)
// Each twin with a real-world kind stands on a real site of that kind, found by OpenStreetMap category near a part of the city
// (spread so the labels don't crowd). Only the twin id and coordinates are kept: no business or institution name is read or
// written. The page says each one is an example, not a model of that site. Home and kitchen are not pinned (they would point at
// someone's house); dairy and energy have no site of their kind on the isthmus; study, AR and the like are not places.
const TWIN_SITES = [
  { id: "cars", kinds: /^car\/car$/, near: [174.733, -36.866], r: 1400, pick: "near" },          // the dealer strip on Great North Road
  { id: "store", kinds: /\/supermarket$/, near: [174.81, -36.875], r: 2600, pick: "big" },         // the eastern suburbs
  { id: "ed", kinds: /^hospital\/hospital$/, near: [174.7698, -36.8597], r: 500, pick: "big", campus: 140 },   // Grafton
  { id: "cafe", kinds: /^cafe\/cafe$/, near: [174.797, -36.831], r: 600, pick: "near" },           // Devonport, across the harbour
  { id: "retail", kinds: /\/(doityourself|hardware)$/, near: [174.825, -36.9], r: 3200, pick: "big" },   // the yards of Penrose and Mt Wellington
  { id: "stay", kinds: /^lodging\/(motel|hotel)$/, near: [174.768, -36.789], r: 900, pick: "near" },     // Takapuna
  { id: "office", kinds: /^office\//, near: [174.746, -36.858], r: 700, pick: "near", maxH: 24 },        // Ponsonby and Freemans Bay
];
const fpArea = (b) => { const r = b.rings[0]; let a = 0; for (let i = 0; i + 1 < r.length; i++) a += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]; return Math.abs(a) / 2; };
const centroid = (b) => { const r = b.rings[0]; let x = 0, z = 0; for (let i = 0; i + 1 < r.length; i++) { x += r[i][0]; z += r[i][1]; } return [x / (r.length - 1), z / (r.length - 1)]; };
const inRing = (r, x, z) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, zi] = r[i], [xj, zj] = r[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };
const inPoly = (rings, x, z) => { let c = false; for (const r of rings) if (inRing(r, x, z)) c = !c; return c; };
const grid = new Map(), cell = 200;   // buildings by 200 m cell, for lookups
buildings.forEach((b) => { const [x, z] = centroid(b); b.c = [x, z]; const k = `${Math.floor(x / cell)},${Math.floor(z / cell)}`; if (!grid.has(k)) grid.set(k, []); grid.get(k).push(b); });
const near = (x, z, r) => { const out = []; for (let i = Math.floor((x - r) / cell); i <= Math.floor((x + r) / cell); i++) for (let j = Math.floor((z - r) / cell); j <= Math.floor((z + r) / cell); j++) for (const b of grid.get(`${i},${j}`) || []) if (Math.hypot(b.c[0] - x, b.c[1] - z) < r) out.push(b); return out; };
const sites = {};
for (const t of TWIN_SITES) {
  const [nx, nz] = toM(...t.near);
  const cands = pois.filter((p) => t.kinds.test(p.kind)).map((p) => {
    const [x, z] = toM(...p.ll); if (Math.hypot(x - nx, z - nz) > t.r || edgeFade(x, z) < 1) return null;
    // the building it stands in, or the nearest within 60 m; a campus takes every building of some size around it
    const around = near(x, z, t.campus || 60), home = around.find((b) => inRing(b.rings[0], x, z)) || around.sort((a, b) => Math.hypot(a.c[0] - x, a.c[1] - z) - Math.hypot(b.c[0] - x, b.c[1] - z))[0];
    if (!home || (t.maxH && home.h > t.maxH)) return null;
    const blds = t.campus ? around.filter((b) => fpArea(b) > 400) : [home];
    return { x, z, blds, area: blds.reduce((s, b) => s + fpArea(b), 0), d: Math.hypot(x - nx, z - nz) };
  }).filter(Boolean);
  if (!cands.length) { console.warn("no site for", t.id); continue; }
  const s = t.pick === "big" ? cands.sort((a, b) => b.area - a.area)[0] : cands.sort((a, b) => a.d - b.d)[0];
  const top = s.blds.reduce((m, b) => Math.max(m, b.h), 0), [cx, cz] = s.blds.length > 1 ? s.blds.reduce((m, b) => [m[0] + b.c[0] / s.blds.length, m[1] + b.c[1] / s.blds.length], [0, 0]) : s.blds[0].c;
  // the plot: a ring just outside the site's footprint(s)
  const plotR = Math.max(28, ...s.blds.flatMap((b) => b.rings[0].map(([x, z]) => Math.hypot(x - cx, z - cz)))) + 22;
  s.blds.forEach((b) => (b.site = t.id));
  sites[t.id] = { x: cx, z: cz, top, plotR, blds: s.blds };
}
// sims on a fixed spot rather than a building of a kind: the moving-house sim's street (the middle of a residential street in
// Ellerslie, not any house) and the Viaduct sim's drawn restaurant (a spot on the open promenade, not a building). Coordinates only;
// the page says each is an example. A fixed site gets its ground height from the terrain and a plot ring, no building points.
const FIXED_SITES = [
  { id: "moving", lonlat: [174.81007, -36.89272], plotR: 70, top: 6 },
  { id: "viaduct", lonlat: [174.76058, -36.84302], plotR: 40, top: 6 },
];
for (const f of FIXED_SITES) { const [x, z] = toM(...f.lonlat); sites[f.id] = { x, z, top: f.top, plotR: f.plotR, blds: [], fixed: true }; }
console.log("twin sites:", Object.fromEntries(Object.entries(sites).map(([k, s]) => [k, s.fixed ? `fixed spot, plot ${Math.round(s.plotR)} m` : `${s.blds.length} building(s), ${Math.round(s.top)} m, plot ${Math.round(s.plotR)} m`])));
// each site as a place, not a dot: its real footprint and walls in bright edges, a lit roof, and a rose ring around the plot
{
  const ids = Object.keys(sites), perSite = Math.round((TOTAL * SHARE.sites) / Math.max(1, ids.length));
  for (const id of ids) {
    const st = sites[id], g0 = landH(...toLL(st.x, st.z)), lens = st.blds.map((b) => { let p = 0; const r = b.rings[0]; for (let i = 0; i + 1 < r.length; i++) p += Math.hypot(r[i + 1][0] - r[i][0], r[i + 1][1] - r[i][1]); return p * (1 + b.h / 12); });
    const tot = lens.reduce((a, b) => a + b, 0), nRing = Math.round(perSite * (st.fixed ? 0.5 : 0.2)), nB = perSite - nRing;
    st.blds.forEach((b, bi) => {
      const r0 = b.rings[0], g = landH(...toLL(...b.c)), n = Math.max(60, Math.round((nB * lens[bi]) / tot));
      for (let k = 0; k < n;) {
        const p = rnd(), i = Math.floor(rnd() * (r0.length - 1)), t = rnd(), [ax, az] = r0[i], [bx, bz] = r0[i + 1];
        let x, z, y, L, kind = KIND.edge;
        if (p < 0.3) { x = ax + (bx - ax) * t; z = az + (bz - az) * t; y = b.h; L = 0.86 + 0.1 * rnd(); }                       // the roof's rim
        else if (p < 0.5) { x = ax + (bx - ax) * t; z = az + (bz - az) * t; y = b.h0 + 0.4; L = 0.72; }                       // the footprint on the ground
        else if (p < 0.68) { x = ax; z = az; y = b.h0 + rnd() * (b.h - b.h0); L = 0.66 + 0.24 * ((y - b.h0) / Math.max(1, b.h - b.h0)); }   // corners
        else if (p < 0.8) { x = ax + (bx - ax) * t; z = az + (bz - az) * t; y = b.h0 + rnd() * (b.h - b.h0); const nx = bz - az, nz = -(bx - ax), nl = Math.hypot(nx, nz) || 1; L = 0.42 + 0.25 * Math.abs((nx * KEY[0] + nz * KEY[2]) / nl); kind = KIND.surface; }   // walls
        else { let ok = false; for (let tries = 0; tries < 16 && !ok; tries++) { const ii = Math.floor(rnd() * (r0.length - 1)), jj = Math.floor(rnd() * (r0.length - 1)), s = rnd(); x = r0[ii][0] + (r0[jj][0] - r0[ii][0]) * s; z = r0[ii][1] + (r0[jj][1] - r0[ii][1]) * s; ok = inPoly(b.rings, x, z); } if (!ok) { k++; continue; } y = b.h; L = 0.6 + 0.06 * rnd(); kind = KIND.surface; }   // the lit roof
        put(x, g + y, z, L, kind, 6); k++;
      }
    });
    for (let k = 0; k < nRing; k++) { const th = rnd() * Math.PI * 2, x = st.x + Math.cos(th) * st.plotR, z = st.z + Math.sin(th) * st.plotR; put(x, landH(...toLL(x, z)) + 0.6, z, 0.6 + 0.05 * rnd(), KIND.edge, 6); }
    st.g0 = g0;
  }
}

// buildings: OpenStreetMap footprints at their mapped heights, as crisp silhouettes. Taller buildings get their vertical corners and
// roof outlines (few surface points, so the city centre's towers read one by one); houses a point or two on their roof's outline,
// a fine grain that thins toward the far suburbs
const SKY = [174.7621, -36.8484];
{
  const want = Math.round(TOTAL * SHARE.building), [skx, skz] = toM(...SKY);
  const items = buildings.map((b) => {
    if (b.site) return null;
    const r0 = b.rings[0]; let per = 0;
    for (let i = 0; i + 1 < r0.length; i++) per += Math.hypot(r0[i + 1][0] - r0[i][0], r0[i + 1][1] - r0[i][1]);
    const [cx, cz] = b.c, tall = smooth(12, 60, b.h), sky = Math.hypot(cx - skx, cz - skz) < 25;
    if (sky || per <= 0) return null;
    // by outline and the square root of height, so the towers stay a few clean lines each instead of piling into one bright block
    return { ...b, per, cx, cz, tall, w: (0.3 + 2 * tall) * per * Math.sqrt(Math.max(3, b.h - b.h0)) * 0.1 * focus(cx, cz) };
  }).filter(Boolean);
  const cum = new Float64Array(items.length); let acc = 0; items.forEach((b, i) => { acc += b.w; cum[i] = acc; });
  let n = 0, guard = 0;
  while (n < want && guard++ < want * 30) {
    let lo = 0, hi = cum.length - 1; const u = rnd() * acc; while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] < u) lo = mid + 1; else hi = mid; }
    const b = items[lo], g = landH(...toLL(b.cx, b.cz)), r0 = b.rings[0], tr = b.tileRings[0], p = rnd(), i = Math.floor(rnd() * (r0.length - 1)), t = rnd(), [ax, az] = r0[i], [bx, bz] = r0[i + 1];
    let x, z, y, L, kind = KIND.edge, onTile;
    if (b.h >= 12 && p < 0.45) { const f = 1 - Math.pow(rnd(), 1.8); x = ax; z = az; y = b.h0 + f * (b.h - b.h0); L = 0.3 + 0.18 * b.tall + 0.34 * f; onTile = tr[i]; }   // a vertical corner, thinning and darkening toward its foot so the towers' tops read one by one
    else if (b.h < 12 || p < 0.86) { x = ax + (bx - ax) * t; z = az + (bz - az) * t; y = b.h; L = b.h < 12 ? 0.3 + 0.1 * rnd() : 0.6 + 0.18 * b.tall; onTile = [tr[i][0] + (tr[i + 1][0] - tr[i][0]) * t, tr[i][1] + (tr[i + 1][1] - tr[i][1]) * t]; }   // the roof's outline
    else { x = ax + (bx - ax) * t; z = az + (bz - az) * t; y = b.h0 + rnd() * (b.h - b.h0); const nx = bz - az, nz = -(bx - ax), nl = Math.hypot(nx, nz) || 1; L = 0.24 + 0.3 * Math.abs((nx * KEY[0] + nz * KEY[2]) / nl) + 0.16 * b.tall; kind = KIND.surface; onTile = [tr[i][0] + (tr[i + 1][0] - tr[i][0]) * t, tr[i][1] + (tr[i + 1][1] - tr[i][1]) * t]; }   // a wall
    if (onTile[0] < 0 || onTile[1] < 0 || onTile[0] >= b.ext || onTile[1] >= b.ext) continue;   // the tile buffer: it belongs to the next tile
    if (put(x, g + y, z, L, kind, 0.7 + 1.6 * b.tall)) n++;
  }
}
// the Sky Tower, modelled from its published dimensions (approximate): eight legs to about 35 m, a 12 m shaft, the pod from about
// 182 to 200 m (main observation level 186 m, the revolving restaurant 190 m), the Sky Deck at about 220 m, then the mast to 328 m.
// It is drawn at its real proportions but 5× in all directions (like the map's heights), so its shape reads; the brightest thing here.
const SKY_X = 5, SKY_PROFILE = [[0, 13], [35, 6.6], [182, 6], [186, 18], [188, 20.5], [194, 21], [198, 18], [201, 7], [216, 7], [217, 11], [222, 11], [226, 3.4], [300, 2.1], [328, 0.4]];
const skyR = (y) => { for (let i = 0; i + 1 < SKY_PROFILE.length; i++) { const [y0, r0] = SKY_PROFILE[i], [y1, r1] = SKY_PROFILE[i + 1]; if (y <= y1) return r0 + (r1 - r0) * ((y - y0) / (y1 - y0)); } return 0.3; };
const skyTop = 328;
{
  const want = Math.round(TOTAL * SHARE.sky), [sx, sz] = toM(...SKY), g = landH(...SKY);
  const rings = [186, 190, 194, 198, 182, 201, 216, 217, 222, 226, 300, 35], pod = (y) => (y > 180 && y < 228 ? 1 : 0);
  for (let n = 0; n < want;) {
    const p = rnd(); let y, th, r, L = 0.88 + 0.1 * rnd();
    if (p < 0.12) { const leg = Math.floor(rnd() * 8), s = rnd(); th = (leg / 8) * Math.PI * 2; y = s * 35; r = 13 + (6.6 - 13) * s; }         // the legs
    else if (p < 0.52) { y = Math.pow(rnd(), 0.9) * skyTop; th = (Math.floor(rnd() * 12) / 12) * Math.PI * 2; r = skyR(y); if (y > 226) L = 0.94 + 0.06 * rnd(); }   // vertical lines down the shaft and mast
    else if (p < 0.88) { const ry = rings[Math.floor(rnd() * rings.length)] + (rnd() - 0.5) * 0.6; y = ry; th = rnd() * Math.PI * 2; r = skyR(y); L = 0.92 + 0.08 * rnd(); }   // the pod's decks and the mast's collars
    else { y = 180 + rnd() * 48; th = rnd() * Math.PI * 2; r = skyR(y) * Math.sqrt(rnd()) * pod(y); L = 0.8; }                                 // the pod, filled
    if (put(sx + Math.cos(th) * r * SKY_X, g + y, sz + Math.sin(th) * r * SKY_X, L, KIND.highlight, 6)) n++;
  }
}
// the Auckland Harbour Bridge on its real OpenStreetMap line, its shape from its published form (approximate): approach spans from
// St Marys Bay, then the steel through-truss over three spans with the 243.8 m navigation span in the middle (43 m clearance), the
// clip-on box girders either side, twin piers. The truss has panel verticals, alternating diagonals and top bracing.
const BRIDGE = bridgeLine || { a: [174.74234, -36.83565], b: [174.74832, -36.8266], len: 1137 };
const TRUSS = [0.4, 0.56, 0.78, 0.94];                        // piers that carry the truss (fractions along the line)
const deckAt = (t) => 11 + 38 * Math.exp(-Math.pow((t - 0.67) / 0.21, 2)) + 12 * smooth(0.86, 1, t);   // metres above the water
const trussDepth = (t) => { if (t < TRUSS[0] || t > TRUSS[3]) return 0; for (let i = 0; i < 3; i++) if (t <= TRUSS[i + 1]) { const u = (t - TRUSS[i]) / (TRUSS[i + 1] - TRUSS[i]); return i === 1 ? 9 + 13 * Math.sin(Math.PI * u) : 9 + 4 * Math.sin(Math.PI * u); } return 0; };
const chordAt = (t) => deckAt(t) + trussDepth(t);
{
  const want = Math.round(TOTAL * SHARE.bridge), [ax, az] = toM(...BRIDGE.a), [bx, bz] = toM(...BRIDGE.b), L = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / L, uz = (bz - az) / L, nx = -uz, nz = ux;
  const TW = 7, CLIP = 13, panel = 18 / L, approach = [0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35];
  const at = (t, off, y, light, w = 4) => put(ax + ux * L * t + nx * off, y, az + uz * L * t + nz * off, light, KIND.edge, w);
  for (let n = 0; n < want;) {
    const p = rnd(), side = rnd() < 0.5 ? -1 : 1; let ok = true;
    if (p < 0.2) { const t = rnd(); ok = at(t, side * (t > TRUSS[0] && t < TRUSS[3] ? CLIP : TW), deckAt(t) - (t > TRUSS[0] && t < TRUSS[3] ? 1.5 : 0), 0.8 + 0.12 * rnd()); }   // deck and clip-on edges
    else if (p < 0.42) { const t = TRUSS[0] + rnd() * (TRUSS[3] - TRUSS[0]); ok = at(t, side * TW, chordAt(t), 0.9 + 0.1 * rnd()); }                                     // top chords
    else if (p < 0.52) { const t = TRUSS[0] + rnd() * (TRUSS[3] - TRUSS[0]); ok = at(t, side * TW, deckAt(t) + 0.5, 0.82); }                                            // bottom chords
    else if (p < 0.64) { const k = Math.floor(rnd() * Math.floor((TRUSS[3] - TRUSS[0]) / panel)), t = TRUSS[0] + k * panel; ok = at(t, side * TW, deckAt(t) + rnd() * trussDepth(t), 0.84); }   // panel verticals
    else if (p < 0.84) { const k = Math.floor(rnd() * Math.floor((TRUSS[3] - TRUSS[0]) / panel)), s = rnd(), t = TRUSS[0] + (k + s) * panel, up = k % 2 ? s : 1 - s; ok = at(t, side * TW, deckAt(t) + up * trussDepth(t), 0.84); }   // diagonals
    else if (p < 0.9) { const k = Math.floor(rnd() * Math.floor((TRUSS[3] - TRUSS[0]) / panel)), s = rnd(), t = TRUSS[0] + (k + s) * panel; ok = at(t, (k % 2 ? s : 1 - s) * 2 * TW - TW, chordAt(t), 0.8); }   // top bracing
    else { const piers = [...approach, ...TRUSS], t = piers[Math.floor(rnd() * piers.length)], y = rnd() * deckAt(t); ok = at(t, side * (TRUSS.includes(t) ? TW : 4), y, 0.62); }   // piers
    if (ok !== false) n++;
  }
}

// ------------------------------------------------------------------------------------------------ anchors (real geography)
const anchor = (x, z, hM) => [+(x * S).toFixed(4), +(hM * VERTICAL * S).toFixed(4), +(z * S).toFixed(4)];
const [bax, baz] = toM(...BRIDGE.a), [bbx, bbz] = toM(...BRIDGE.b), [skx0, skz0] = toM(...SKY);
const anchors = {
  waitemata: anchor(...toM(174.818, -36.838), 0),           // open water at the harbour mouth, between Devonport and Mission Bay
  skytower: anchor(skx0, skz0, landH(...SKY) + skyTop),
  bridge: anchor(bax + (bbx - bax) * 0.67, baz + (bbz - baz) * 0.67, chordAt(0.67)),
};
for (const id of ["rangitoto", "maungawhau", "maungakiekie", "maungauika"]) { const [x, z, h] = summits[id]; anchors[id] = anchor(x, z, h); }
console.log("summits (m):", Object.fromEntries(Object.entries(summits).map(([k, v]) => [k, Math.round(v[2])])));

// ------------------------------------------------------------------------------------------------ order, quantise, write
const N = pts.x.length, order = Array.from({ length: N }, (_, i) => [Math.pow(rnd(), 1 / pts.w[i]), i]).sort((a, b) => b[0] - a[0]).slice(0, TOTAL).map((o) => o[1]);
const rng3 = (arr) => { let a = Infinity, b = -Infinity; for (const v of arr) { if (v < a) a = v; if (v > b) b = v; } return [a, b]; };
const bx = rng3(pts.x), by = [0, rng3(pts.y)[1]], bz = rng3(pts.z), q = (v, [a, b]) => Math.round(clamp((v - a) / (b - a)) * 65535);
const buf = Buffer.alloc(order.length * 8), counts = [0, 0, 0, 0];
order.forEach((i, k) => { buf.writeUInt16LE(q(pts.x[i], bx), k * 8); buf.writeUInt16LE(q(Math.max(0, pts.y[i]), by), k * 8 + 2); buf.writeUInt16LE(q(pts.z[i], bz), k * 8 + 4); buf[k * 8 + 6] = Math.round(pts.l[i] * 255); buf[k * 8 + 7] = pts.k[i]; counts[pts.k[i]]++; });
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "auckland-points.bin"), buf);
const header = {
  format: "assembl-points/1", count: order.length, stride: 8, layout: "x:u16 y:u16 z:u16 light:u8 kind:u8, little-endian, interleaved; weighted random order (any prefix is a fair sample)",
  bounds: { x: bx, y: by, z: bz }, kinds: { surface: counts[0], edge: counts[1], ground: counts[2], highlight: counts[3] },
  units: "engine units: the larger of width and depth is 2.1; y = height × vertical exaggeration", metresPerUnit: +(1 / S).toFixed(2), verticalExaggeration: VERTICAL,
  area: { ...BOUNDS, widthKm: +(WIDTH / 1000).toFixed(1), depthKm: +(DEPTH / 1000).toFixed(1) },
  anchors,
  // twins on real sites of their kind, as examples: twin id → anchor (roof top), ground (the plot's centre on the ground), plot
  // radius (engine units) and the site's centre in lon/lat; `fixed` marks a sim placed on a given spot (a street, a promenade),
  // not a building found by kind. No names.
  sites: Object.fromEntries(Object.entries(sites).map(([id, st]) => { const ll = toLL(st.x, st.z); return [id, { anchor: anchor(st.x, st.z, st.g0 + st.top), ground: anchor(st.x, st.z, st.g0), plot: +(st.plotR * S).toFixed(5), lonlat: [+ll[0].toFixed(5), +ll[1].toFixed(5)], ...(st.fixed ? { fixed: true } : {}) }]; })),
  sources: [
    { what: "terrain", source: "AWS Terrain Tiles (Terrarium), zoom 13, and zoom 15 on the volcanic cones", url: "https://registry.opendata.aws/terrain-tiles/", upstream: "LINZ NZ 8 m Digital Elevation Model", licence: "CC BY 4.0" },
    { what: "coastline, lakes, buildings, and the kinds of place used to choose twin sites (category and position only)", source: "OpenFreeMap vector tiles (OpenMapTiles schema), zoom 14, " + VEC.split("/")[4], url: "https://openfreemap.org", upstream: "OpenStreetMap", licence: "ODbL 1.0 (© OpenStreetMap contributors); tiles © OpenMapTiles" },
    { what: "Sky Tower and Harbour Bridge shapes", source: "drawn from their published dimensions (approximate) at their real positions; the tower 5× in all directions", licence: "assembl" },
  ],
  built: new Date().toISOString().slice(0, 10), script: "tools/pointcloud/bake-auckland.mjs",
};
fs.writeFileSync(path.join(OUT, "auckland-points.json"), JSON.stringify(header, null, 1) + "\n");
console.log(`wrote ${order.length} points (${(buf.length / 1048576).toFixed(2)} MB) of ${N} candidates; kinds`, header.kinds, "anchors", anchors);
