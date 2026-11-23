// assembl lab · bake the ground under /auckland/live/: a height grid and the shapes that colour the land.
//   node tools/transit/bake-ground.mjs [cacheDir]          then   python3 tools/transit/paint-ground.py
// Heights: AWS Terrain Tiles (Terrarium, zoom 13); in New Zealand their source is LINZ's 8 m DEM (CC BY 4.0), the same source as
// the lab's Auckland point cloud (assets/models/auckland/SOURCE.md). Land cover, water, roads, rail and building footprints:
// OpenStreetMap via OpenFreeMap vector tiles (OpenMapTiles schema, zoom 14), ODbL 1.0. Box: the lab's LINZ terrain NZTM box.
// Writes auckland/live/data/ground-height.bin (+ .json header) and a temporary draw list for paint-ground.py.
import fs from "node:fs";
import { fetchCached, decodePNG, decodeMVT, lon2x, lat2y, x2lon, y2lat } from "../pointcloud/geo-tiles.mjs";
import { AREA, ORIGIN, toNZTM, fromNZTM } from "../../auckland/live/transit.js";

const CACHE = process.argv[2] || "/tmp/assembl-tiles";
const OUT = new URL("../../auckland/live/data/", import.meta.url).pathname;
const STEP = 32, W = (AREA.maxX - AREA.minX) / STEP + 1, H = (AREA.maxY - AREA.minY) / STEP + 1;
const [nLat, wLon] = fromNZTM(AREA.minX, AREA.maxY), [sLat, eLon] = fromNZTM(AREA.maxX, AREA.minY);
const [nLat2, eLon2] = fromNZTM(AREA.maxX, AREA.maxY), [sLat2, wLon2] = fromNZTM(AREA.minX, AREA.minY);
const bbox = { n: Math.max(nLat, nLat2) + 0.002, s: Math.min(sLat, sLat2) - 0.002, w: Math.min(wLon, wLon2) - 0.002, e: Math.max(eLon, eLon2) + 0.002 };

// ---------------------------------------------------------------- heights
const TZ = 13, tiles = new Map();
function terr(px, py) { // global Terrarium pixel at zoom 13 → metres
  const tx = Math.floor(px / 256), ty = Math.floor(py / 256), k = tx + "/" + ty;
  if (!tiles.has(k)) tiles.set(k, decodePNG(fetchCached(`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${TZ}/${tx}/${ty}.png`, CACHE)));
  const t = tiles.get(k), x = Math.min(255, Math.max(0, Math.floor(px - tx * 256))), y = Math.min(255, Math.max(0, Math.floor(py - ty * 256))), i = (y * 256 + x) * 3;
  return t.rgb[i] * 256 + t.rgb[i + 1] + t.rgb[i + 2] / 256 - 32768;
}
function height(lat, lon) { // bilinear between pixel centres
  const px = lon2x(lon, TZ) * 256 - 0.5, py = lat2y(lat, TZ) * 256 - 0.5, x0 = Math.floor(px), y0 = Math.floor(py), fx = px - x0, fy = py - y0;
  return (terr(x0, y0) * (1 - fx) + terr(x0 + 1, y0) * fx) * (1 - fy) + (terr(x0, y0 + 1) * (1 - fx) + terr(x0 + 1, y0 + 1) * fx) * fy;
}
const grid = new Int16Array(W * H); let lo = 1e9, hi = -1e9;
for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
  const [la, lo2] = fromNZTM(AREA.minX + i * STEP, AREA.maxY - j * STEP), h = height(la, lo2);
  grid[j * W + i] = Math.max(-32768, Math.min(32767, Math.round(h * 10))); lo = Math.min(lo, h); hi = Math.max(hi, h);
}
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(OUT + "ground-height.bin", Buffer.from(grid.buffer));

// ---------------------------------------------------------------- land shapes, projected to NZTM metres in the box
const VZ = 14, tilejson = JSON.parse(fetchCached("https://tiles.openfreemap.org/planet", CACHE).toString()), VEC = tilejson.tiles[0];
const x0 = Math.floor(lon2x(bbox.w, VZ)), x1 = Math.floor(lon2x(bbox.e, VZ)), y0 = Math.floor(lat2y(bbox.n, VZ)), y1 = Math.floor(lat2y(bbox.s, VZ));
const ops = { water: [], landcover: [], landuse: [], park: [], aeroway: [], building: [], road: [], rail: [] };
const toBox = (tx, ty, ext, [x, y]) => { const lon = x2lon(tx + x / ext, VZ), lat = y2lat(ty + y / ext, VZ), [E, N] = toNZTM(lat, lon); return [Math.round((E - AREA.minX) * 10) / 10, Math.round((AREA.maxY - N) * 10) / 10]; };
let nt = 0;
for (let tx = x0; tx <= x1; tx++) for (let ty = y0; ty <= y1; ty++) {
  const t = decodeMVT(fetchCached(VEC.replace("{z}", VZ).replace("{x}", tx).replace("{y}", ty), CACHE), ["water", "landcover", "landuse", "park", "aeroway", "building", "transportation"]); nt++;
  for (const [layer, L] of Object.entries(t)) for (const f of L.features) {
    const parts = f.parts.map((p) => p.map((pt) => toBox(tx, ty, L.extent, pt)));
    const cls = f.props.class || f.props.subclass || "";
    if (layer === "transportation") { if (f.type !== 2) continue; (cls === "rail" || cls === "transit" ? ops.rail : ops.road).push({ c: cls, b: f.props.brunnel || "", s: f.props.service || "", p: parts }); }
    else if (f.type === 3) (ops[layer] ||= []).push({ c: cls, p: parts, h: f.props.render_height, mh: f.props.render_min_height });
  }
}
// ---------------------------------------------------------------- buildings to extrude (exterior outlines; courtyards are filled)
// Every building taller than 5 m across the box, plus all buildings within 2.5 km of the city centre (marked tier 1, desktop only).
// Heights are the tiles' render_height: OSM height or levels where mapped, otherwise the tile maker's 5 m default.
const SKY = { x: -2185, z: 219 }, CBD_R = 2500, ringArea = (r) => { let a = 0; for (let i = 0; i < r.length; i++) { const [x1, y1] = r[i], [x2, y2] = r[(i + 1) % r.length]; a += x1 * y2 - x2 * y1; } return a / 2; };
const hAt = (bx, by) => { const i = Math.min(W - 1, Math.max(0, Math.round(bx / STEP))), j = Math.min(H - 1, Math.max(0, Math.round(by / STEP))); return grid[j * W + i] / 10; };
const seen = new Set(), bld = []; let nb = [0, 0];
for (const f of ops.building) {
  const h = Number(f.h) || 5, mh = Number(f.mh) || 0; if (!f.p.length) continue;
  const sign = Math.sign(ringArea(f.p[0])) || 1;
  for (const r of f.p) {
    if (r.length < 4 || Math.sign(ringArea(r)) !== sign || Math.abs(ringArea(r)) < 12) continue;
    let cx = 0, cy = 0; for (const [x, y] of r) { cx += x; cy += y; } cx /= r.length; cy /= r.length;
    const wx = cx + AREA.minX - ORIGIN.E;
    const worldZ = cy - (AREA.maxY - ORIGIN.N);
    const near = Math.hypot(wx - SKY.x, worldZ - SKY.z) < CBD_R;
    if (h <= 5 && !near) continue;
    if (h > 250 && Math.hypot(wx - SKY.x, worldZ - SKY.z) < 80) continue; // the Sky Tower comes from skytower-parts.json
    const key = Math.round(cx) + "," + Math.round(cy) + "," + h; if (seen.has(key)) continue; seen.add(key); // outlines repeat across tile edges
    const pts = r[0][0] === r[r.length - 1][0] && r[0][1] === r[r.length - 1][1] ? r.slice(0, -1) : r;
    bld.push({ tier: h > 5 ? 0 : 1, h, mh, g: Math.max(0, hAt(cx, cy)), pts }); nb[h > 5 ? 0 : 1]++;
  }
}
bld.sort((a, b) => a.tier - b.tier);
// Int16 stream per outline: tier, height dm, min height dm, ground dm, n, then n × (x, z) in half metres, world frame
const words = []; for (const b of bld) { words.push(b.tier, Math.round(b.h * 10), Math.round(b.mh * 10), Math.round(b.g * 10), b.pts.length); for (const [x, y] of b.pts) words.push(Math.round((x + AREA.minX - ORIGIN.E) * 2), Math.round((y - (AREA.maxY - ORIGIN.N)) * 2)); }
fs.writeFileSync(OUT + "buildings.bin", Buffer.from(Int16Array.from(words).buffer));
const tmp = CACHE + "/ground-draw.json";
fs.writeFileSync(tmp, JSON.stringify({ box: AREA, ops }));
const header = { built: new Date().toISOString(), format: "int16 little-endian, decimetres above NZVD2016, rows north to south, columns west to east", width: W, height: H, stepMetres: STEP,
  nztmBox: AREA, origin: ORIGIN,
  buildings: { file: "buildings.bin", format: "int16 stream per outline: tier (0 taller than 5 m, 1 low building near the city centre), height dm, min height dm, ground dm, n, n × (x, z) half metres in the world frame", tall: nb[0], lowNearCentre: nb[1], heights: "OpenMapTiles render_height: OSM height or building:levels where mapped, otherwise a 5 m default; not measured", outlines: "exterior outlines only; courtyards are filled" },
  minMetres: Math.round(lo * 10) / 10, maxMetres: Math.round(hi * 10) / 10,
  sources: [
    { what: "ground heights", source: "AWS Terrain Tiles (Terrarium PNG, zoom 13, about 15 m), s3.amazonaws.com/elevation-tiles-prod; in New Zealand their source is the LINZ 8 m DEM", licence: "CC BY 4.0, Toitū Te Whenua Land Information New Zealand", note: "Copyright in the underlying dataset is owned by Regional Software Holdings Ltd (RSHL), as LINZ asks to be stated for the 8 m DEM. Heights over the sea are not used (the water mask decides land and sea)." },
    { what: "land cover, water, roads, rail and building footprints (ground colours)", source: "OpenFreeMap vector tiles, zoom 14, release " + VEC.split("/")[4], licence: "ODbL 1.0, © OpenStreetMap contributors; tiles © OpenMapTiles" },
  ] };
fs.writeFileSync(OUT + "ground-height.json", JSON.stringify(header, null, 1));
console.log({ W, H, lo, hi, vectorTiles: nt, terrTiles: tiles.size, draw: Object.fromEntries(Object.entries(ops).map(([k, v]) => [k, v.length])), tmp });
