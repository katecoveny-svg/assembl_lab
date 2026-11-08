#!/usr/bin/env node
// assembl lab · bakes the lab home's hero: Tāmaki Makaurau Auckland as a point cloud, from open data, into a compact points file.
//
//   node tools/pointcloud/bake-auckland.mjs [--cache DIR]
//   → assets/models/auckland/auckland-points.bin (+ auckland-points.json, the header: bounds, anchors, sources, counts)
//
// Sources (all open, no API key; see assets/models/auckland/SOURCE.md):
//   Terrain     AWS Terrain Tiles (Terrarium PNG, zoom 13, ≈15 m), https://registry.opendata.aws/terrain-tiles/. In New Zealand
//               their source is LINZ's 8 m DEM, CC BY 4.0. height = R·256 + G + B/256 − 32768 metres.
//   Coastline   OpenStreetMap water polygons in OpenFreeMap's vector tiles (OpenMapTiles schema, zoom 14).
//   Buildings   OpenStreetMap building footprints and heights (render_height) from the same tiles. © OpenStreetMap
//               contributors, ODbL; tiles © OpenMapTiles, via OpenFreeMap.
//   Drawn       The Harbour Bridge's rise and truss are drawn on the bridge's real OpenStreetMap line, for scale (the tiles carry
//               its path, not its shape). Everything else is measured data.
//
// Heights are exaggerated VERTICAL = 5× (terrain and buildings alike) so the volcanic cones read: Maungawhau's 196 m stands
// as if 980 m, Rangitoto's 260 m as if 1,300 m, the Sky Tower's 328 m as if 1,640 m. Over a map 21 km wide that is still gentle.
// Horizontal positions and footprints are true to scale.
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
const SHARE = { land: 0.2, contour: 0.2, coast: 0.15, sea: 0.15, building: 0.258, bridge: 0.02, sky: 0.01, sites: 0.012 };
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

// ------------------------------------------------------------------------------------------------ the point set
const pts = { x: [], y: [], z: [], l: [], k: [], w: [] };
const KIND = { surface: 0, edge: 1, ground: 2, highlight: 3 };
// the map dissolves at its edges (no box): a soft rounded-rectangle falloff, so the gulf and the suburbs fade into the plum ground
const edgeFade = (x, z) => { const u = Math.abs(x) / (WIDTH / 2), v = Math.abs(z) / (DEPTH / 2), d = Math.pow(Math.pow(u, 5) + Math.pow(v, 5), 1 / 5); return 1 - smooth(0.84, 1.0, d); };
function put(xm, ym, zm, light, kind, weight = 1) {
  const f = edgeFade(xm, zm); if (f <= 0 || rnd() > Math.pow(f, 0.7)) return false;
  pts.x.push(xm * S); pts.y.push(ym * VERTICAL * S); pts.z.push(zm * S); pts.l.push(clamp(light * (0.55 + 0.45 * f))); pts.k.push(kind); pts.w.push(weight); return true;
}
const KEY = (() => { const v = [-0.45, 0.8, 0.55], n = Math.hypot(...v); return v.map((c) => c / n); })();
const randXZ = () => [(rnd() - 0.5) * WIDTH, (rnd() - 0.5) * DEPTH];
const landH = (lon, lat) => Math.max(0.6, demAt(lon, lat));

// land: area-weighted in 3D (slopes, so the cones, get more points), lit by the key light, higher ground a little brighter
{
  const want = Math.round(TOTAL * SHARE.land), e = 12; let n = 0, guard = 0;
  while (n < want && guard++ < want * 40) {
    const [x, z] = randXZ(), [lon, lat] = toLL(x, z), m = maskAt(lon, lat); if (m === 1) continue;
    const h = landH(lon, lat), [lx, la] = toLL(x + e, z), [, lb] = toLL(x, z + e);
    const gx = ((landH(lx, la) - h) / e) * VERTICAL, gz = ((landH(lon, lb) - h) / e) * VERTICAL, nl = Math.hypot(gx, 1, gz), nx = -gx / nl, ny = 1 / nl, nz = -gz / nl;
    if (rnd() > Math.min(1, (1 / ny) * 0.5)) continue;
    const lit = Math.max(0, nx * KEY[0] + ny * KEY[1] + nz * KEY[2]);
    const L = m === 2 ? 0.22 : 0.16 + 0.5 * Math.pow(lit, 1.4) + 0.32 * smooth(8, 170, h) + (rnd() < 0.015 ? 0.15 : 0);
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
  while (n < want && guard++ < want * 20 && cross.length) {
    const c = cross[Math.floor(rnd() * cross.length)], [lon, lat] = px2ll(c[0] + (rnd() - 0.5) * 0.9, c[1] + (rnd() - 0.5) * 0.9);
    if (maskAt(lon, lat) !== 0) continue; const [x, z] = toM(lon, lat);
    if (put(x, c[2] + 1, z, 0.44 + 0.32 * smooth(20, 190, c[2]) + 0.08 * rnd(), KIND.edge, 1.3)) n++;
  }
}
// the coastline: dense, bright points along every shore (lakes quieter), a whisker above the water
{
  const want = Math.round(TOTAL * SHARE.coast), segs = coastSegs.map((s) => { const [ax, az] = toM(...s.a), [bx, bz] = toM(...s.b); return { ...s, ax, az, bx, bz, L: Math.hypot(bx - ax, bz - az) * (s.lake ? 0.4 : 1) }; }).filter((s) => s.L > 0);
  const cum = new Float64Array(segs.length); let acc = 0; segs.forEach((s, i) => { acc += s.L; cum[i] = acc; });
  let n = 0, guard = 0;
  while (n < want && guard++ < want * 20) {
    let lo = 0, hi = cum.length - 1; const u = rnd() * acc; while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] < u) lo = mid + 1; else hi = mid; }
    const s = segs[lo], t = rnd(), tx = s.ta[0] + (s.tb[0] - s.ta[0]) * t, ty = s.ta[1] + (s.tb[1] - s.ta[1]) * t;
    if (tx < 0 || ty < 0 || tx >= s.ext || ty >= s.ext) continue;                // the tile buffer: that stretch belongs to the next tile
    const x = s.ax + (s.bx - s.ax) * t + (rnd() - 0.5) * 6, z = s.az + (s.bz - s.az) * t + (rnd() - 0.5) * 6, [lon, lat] = toLL(x, z);
    const y = s.lake ? landH(lon, lat) : 1.2;
    if (put(x, y, z, s.lake ? 0.5 + 0.1 * rnd() : 0.72 + 0.2 * rnd(), KIND.edge, s.lake ? 1.2 : 2.2)) n++;
  }
}
// the sea: a faint, level sheet with a slow swell of light (the engine's sparkles make it shimmer), brighter in the shallows
{
  const want = Math.round(TOTAL * SHARE.sea); let n = 0, guard = 0;
  while (n < want && guard++ < want * 30) {
    const [x, z] = randXZ(), [lon, lat] = toLL(x, z); if (maskAt(lon, lat) !== 1) continue;
    let shore = 0; for (const [ox, oz] of [[160, 0], [-160, 0], [0, 160], [0, -160]]) if (maskAt(...toLL(x + ox, z + oz)) !== 1) shore++;
    const swell = 0.5 + 0.5 * Math.sin(x / 420 + Math.sin(z / 900) * 2) * Math.sin(z / 610 - x / 1500);
    if (put(x, 0, z, 0.1 + 0.12 * swell + 0.07 * shore + (rnd() < 0.01 ? 0.3 : 0), KIND.surface, 0.55)) n++;
  }
}
// buildings: OpenStreetMap footprints at their mapped heights. Tall buildings: dense corner edges and roof outlines; houses: a few
// roof points, so the suburbs read as a fine grain and the city centre stands up out of it
const SKY = [174.7621, -36.8484];
{
  const want = Math.round(TOTAL * SHARE.building);
  const inPoly = (rings, x, z) => { let c = false; for (const r of rings) for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, zi] = r[i], [xj, zj] = r[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };
  const [skx, skz] = toM(...SKY);
  const items = buildings.map((b) => {
    const r0 = b.rings[0]; let per = 0, area = 0, cx = 0, cz = 0;
    for (let i = 0; i + 1 < r0.length; i++) { per += Math.hypot(r0[i + 1][0] - r0[i][0], r0[i + 1][1] - r0[i][1]); area += r0[i][0] * r0[i + 1][1] - r0[i + 1][0] * r0[i][1]; cx += r0[i][0]; cz += r0[i][1]; }
    cx /= Math.max(1, r0.length - 1); cz /= Math.max(1, r0.length - 1);
    const tall = smooth(12, 60, b.h), sky = Math.hypot(cx - skx, cz - skz) < 25;
    return { ...b, per, area: Math.abs(area) / 2, cx, cz, tall, sky, w: sky ? 0 : (0.25 + 4 * tall) * (per * Math.max(3, b.h - b.h0) * 0.02 + Math.abs(area) * 0.0015) };
  }).filter((b) => b.w > 0 && b.per > 0);
  const cum = new Float64Array(items.length); let acc = 0; items.forEach((b, i) => { acc += b.w; cum[i] = acc; });
  let n = 0, guard = 0;
  while (n < want && guard++ < want * 30) {
    let lo = 0, hi = cum.length - 1; const u = rnd() * acc; while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] < u) lo = mid + 1; else hi = mid; }
    const b = items[lo], [lon, lat] = toLL(b.cx, b.cz), g = landH(lon, lat), r0 = b.rings[0], pick = rnd();
    let x, z, y, L, kind;
    if (pick < 0.55 * b.tall + 0.1) {                                   // an outline point: a corner edge (vertical) or the roof's rim
      const i = Math.floor(rnd() * (r0.length - 1)), t = rnd(), corner = rnd() < 0.45, [ax, az] = r0[i], [bx, bz] = r0[i + 1];
      x = corner ? ax : ax + (bx - ax) * t; z = corner ? az : az + (bz - az) * t; y = corner ? b.h0 + rnd() * (b.h - b.h0) : b.h;
      // the tile's buffer again: keep only what lies inside this tile
      const tr = b.tileRings[0], tx = corner ? tr[i][0] : tr[i][0] + (tr[i + 1][0] - tr[i][0]) * t, ty = corner ? tr[i][1] : tr[i][1] + (tr[i + 1][1] - tr[i][1]) * t;
      if (tx < 0 || ty < 0 || tx >= b.ext || ty >= b.ext) continue;
      L = 0.42 + 0.38 * b.tall + 0.18 * (y - b.h0) / Math.max(1, b.h - b.h0); kind = KIND.edge;
    } else {                                                           // a roof or wall-face point
      const roof = rnd() < 0.6 || b.tall < 0.2;
      if (roof) { let ok = false; for (let tries = 0; tries < 12 && !ok; tries++) { const i = Math.floor(rnd() * (r0.length - 1)), j = Math.floor(rnd() * (r0.length - 1)), s = rnd(); x = r0[i][0] + (r0[j][0] - r0[i][0]) * s; z = r0[i][1] + (r0[j][1] - r0[i][1]) * s; ok = inPoly(b.rings, x, z); } if (!ok) continue; y = b.h; L = 0.26 + 0.4 * b.tall + 0.08 * rnd(); }
      else { const i = Math.floor(rnd() * (r0.length - 1)), t = rnd(), [ax, az] = r0[i], [bx, bz] = r0[i + 1]; x = ax + (bx - ax) * t; z = az + (bz - az) * t; y = b.h0 + rnd() * (b.h - b.h0); const nx = bz - az, nz = -(bx - ax), nl = Math.hypot(nx, nz) || 1; L = 0.2 + 0.3 * Math.abs((nx * KEY[0] + nz * KEY[2]) / nl) + 0.2 * b.tall; }
      kind = KIND.surface; if (maskAt(...toLL(x, z)) === 1) continue;
    }
    if (put(x, g + y, z, L, kind, 0.8 + 1.4 * b.tall)) n++;
  }
}
// the Sky Tower from its own OpenStreetMap parts (shaft, pod, mast), drawn as the brightest thing on the map
const skyParts = buildings.filter((b) => { const r = b.rings[0], c = r.reduce((s, p) => [s[0] + p[0], s[1] + p[1]], [0, 0]).map((v) => v / r.length), [sx, sz] = toM(...SKY); return Math.hypot(c[0] - sx, c[1] - sz) < 25; });
const skyTop = Math.max(328, ...skyParts.map((b) => b.h));
{
  const want = Math.round(TOTAL * SHARE.sky), [sx, sz] = toM(...SKY), g = landH(...SKY);
  // radius by height, from the parts (a wide pod, a slim shaft and mast); the fallback is the tower's published shape
  const radiusAt = (y) => { let r = 0; for (const b of skyParts) if (y >= b.h0 && y <= b.h) { const rr = Math.max(...b.rings[0].map(([x, z]) => Math.hypot(x - sx, z - sz))); r = Math.max(r, rr); } return r || (y < 186 ? 6 : y < 225 ? 18 : y < 300 ? 3.5 : 1.5); };
  for (let n = 0; n < want;) {
    const y = Math.pow(rnd(), 0.8) * skyTop, r = radiusAt(y), th = rnd() * Math.PI * 2, rim = rnd() < 0.4;   // true footprint, the same 5× height as everything else
    const L = 0.86 + 0.14 * rnd() + (y > 300 ? 0.1 : 0);
    if (put(sx + Math.cos(th) * r * (rim ? 1 : Math.sqrt(rnd())), g + y, sz + Math.sin(th) * r * (rim ? 1 : Math.sqrt(rnd())), L, KIND.highlight, 6)) n++;
  }
}
// the Auckland Harbour Bridge on its real line: deck rising to the navigation span (43 m clearance), the truss over the channel and
// the piers. Drawn for scale: the shape is approximate, the position is OpenStreetMap's.
const BRIDGE = bridgeLine || { a: [174.74234, -36.83565], b: [174.74832, -36.8266], len: 1137 };
const deckAt = (t) => 12 + 40 * Math.exp(-Math.pow((t - 0.66) / 0.2, 2)) + 10 * smooth(0.85, 1, t);   // metres above the water
const chordAt = (t) => deckAt(t) + (t > 0.36 && t < 0.97 ? 8 + 12 * Math.abs(Math.sin(((t - 0.36) / 0.61) * Math.PI * 2)) : 0);
{
  const want = Math.round(TOTAL * SHARE.bridge), [ax, az] = toM(...BRIDGE.a), [bx, bz] = toM(...BRIDGE.b), L = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / L, uz = (bz - az) / L, nx = -uz, nz = ux, half = 16;
  const piers = [0.12, 0.24, 0.36, 0.56, 0.77, 0.97];
  for (let n = 0; n < want;) {
    const pick = rnd(); let t = rnd(), side = rnd() < 0.5 ? -1 : 1, y, light = 0.78 + 0.18 * rnd(), off = side * half;
    if (pick < 0.45) y = deckAt(t);                                            // the deck's two edges
    else if (pick < 0.75) { if (t < 0.36 || t > 0.97) continue; y = chordAt(t); off = side * half * 0.8; }   // the truss's top chords
    else if (pick < 0.88) { if (t < 0.36 || t > 0.97) continue; const k = Math.floor(((t - 0.36) / 0.61) * 18), t0 = 0.36 + (k / 18) * 0.61, t1 = t0 + 0.61 / 18, s = rnd(); t = t0 + (t1 - t0) * s; y = deckAt(t) + (chordAt(t) - deckAt(t)) * (k % 2 ? s : 1 - s); off = side * half * 0.9; }   // diagonals
    else { const p = piers[Math.floor(rnd() * piers.length)]; t = p; y = rnd() * deckAt(p); off = (rnd() - 0.5) * half * 1.6; light = 0.6; }   // piers
    if (put(ax + ux * L * t + nx * off, y, az + uz * L * t + nz * off, light, KIND.edge, 4)) n++;
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
  s.blds.forEach((b) => (b.site = t.id));
  sites[t.id] = { x: cx, z: cz, top, blds: s.blds };
}
console.log("twin sites:", Object.fromEntries(Object.entries(sites).map(([k, s]) => [k, `${s.blds.length} building(s), ${Math.round(s.top)} m`])));
// their buildings, lit rose (the tone ramp's mid-light) and dense at the edges, so the page's leader lines land on something
{
  const list = Object.values(sites).flatMap((s) => s.blds), want = Math.round(TOTAL * SHARE.sites), perB = list.map((b) => Math.sqrt(fpArea(b)) * (b.h + 10)), tot = perB.reduce((a, b) => a + b, 0);
  list.forEach((b, bi) => {
    const r0 = b.rings[0], g = landH(...toLL(...b.c)), n = Math.max(40, Math.round((want * perB[bi]) / tot));
    for (let k = 0; k < n; k++) {
      const i = Math.floor(rnd() * (r0.length - 1)), t = rnd(), [ax, az] = r0[i], [bx, bz] = r0[i + 1], corner = rnd() < 0.35, roof = rnd() < 0.45;
      const x = corner ? ax : ax + (bx - ax) * t, z = corner ? az : az + (bz - az) * t, y = corner ? rnd() * b.h : roof ? b.h : rnd() * b.h;
      put(x, g + y, z, 0.56 + 0.1 * rnd(), KIND.edge, 5);
    }
  });
}

// ------------------------------------------------------------------------------------------------ anchors (real geography)
const peak = (lon, lat, rM) => { let best = [lon, lat, -1e9]; for (let k = 0; k < 4000; k++) { const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * rM, [x, z] = toM(lon, lat), ll = toLL(x + Math.cos(a) * r, z + Math.sin(a) * r), h = demAt(...ll); if (h > best[2]) best = [...ll, h]; } return best; };
const anchor = (lon, lat, hM) => { const [x, z] = toM(lon, lat); return [+(x * S).toFixed(4), +(hM * VERTICAL * S).toFixed(4), +(z * S).toFixed(4)]; };
const rangitoto = peak(174.861, -36.787, 1800), maungawhau = peak(174.7644, -36.8767, 500), maungakiekie = peak(174.783, -36.9, 600), maungauika = peak(174.8135, -36.8283, 350);
const [bax, baz] = toM(...BRIDGE.a), [bbx, bbz] = toM(...BRIDGE.b);
const anchors = {
  waitemata: anchor(174.8, -36.8405, 0),            // open water between Devonport and Ōkahu Bay
  rangitoto: anchor(rangitoto[0], rangitoto[1], rangitoto[2]),
  maungawhau: anchor(maungawhau[0], maungawhau[1], maungawhau[2]),
  maungakiekie: anchor(maungakiekie[0], maungakiekie[1], maungakiekie[2]),
  maungauika: anchor(maungauika[0], maungauika[1], maungauika[2]),
  skytower: anchor(SKY[0], SKY[1], landH(...SKY) + skyTop),
  bridge: anchor(...toLL(bax + (bbx - bax) * 0.66, baz + (bbz - baz) * 0.66), chordAt(0.66)),
};
console.log("peaks (m):", { rangitoto: rangitoto[2].toFixed(0), maungawhau: maungawhau[2].toFixed(0), maungakiekie: maungakiekie[2].toFixed(0), maungauika: maungauika[2].toFixed(0) });

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
  // twins on real sites of their kind, as examples: twin id → anchor (roof top) and the site's centre in lon/lat. No names.
  sites: Object.fromEntries(Object.entries(sites).map(([id, st]) => { const ll = toLL(st.x, st.z), g = landH(...ll); return [id, { anchor: [+(st.x * S).toFixed(4), +((g + st.top) * VERTICAL * S).toFixed(4), +(st.z * S).toFixed(4)], lonlat: [+ll[0].toFixed(5), +ll[1].toFixed(5)] }]; })),
  sources: [
    { what: "terrain", source: "AWS Terrain Tiles (Terrarium), zoom 13", url: "https://registry.opendata.aws/terrain-tiles/", upstream: "LINZ NZ 8 m Digital Elevation Model", licence: "CC BY 4.0" },
    { what: "coastline, lakes, buildings, and the kinds of place used to choose twin sites (category and position only)", source: "OpenFreeMap vector tiles (OpenMapTiles schema), zoom 14, " + VEC.split("/")[4], url: "https://openfreemap.org", upstream: "OpenStreetMap", licence: "ODbL 1.0 (© OpenStreetMap contributors); tiles © OpenMapTiles" },
    { what: "Harbour Bridge rise and truss", source: "drawn for scale on the bridge's OpenStreetMap line", licence: "assembl" },
  ],
  built: new Date().toISOString().slice(0, 10), script: "tools/pointcloud/bake-auckland.mjs",
};
fs.writeFileSync(path.join(OUT, "auckland-points.json"), JSON.stringify(header, null, 1) + "\n");
console.log(`wrote ${order.length} points (${(buf.length / 1048576).toFixed(2)} MB) of ${N} candidates; kinds`, header.kinds, "anchors", anchors);
