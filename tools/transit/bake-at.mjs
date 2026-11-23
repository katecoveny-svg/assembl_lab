// assembl lab · bake the small static index /auckland/live/ needs from Auckland Transport's public GTFS file.
//   curl -sSL -o /tmp/gtfs.zip https://gtfs.at.govt.nz/gtfs.zip && unzip -o /tmp/gtfs.zip -d /tmp/at-gtfs
//   node tools/transit/bake-at.mjs /tmp/at-gtfs
// Writes auckland/live/data/{routes,stops,shapes}.json. Licence: AT GTFS, Creative Commons Attribution 4.0 International
// (https://at.govt.nz/about-us/at-data-sources/general-transit-feed-specification). Node 18+, no packages.
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { toWorld, modeOf } from "../../auckland/live/transit.js";

const dir = process.argv[2];
if (!dir || !fs.existsSync(path.join(dir, "routes.txt"))) { console.error("usage: node tools/transit/bake-at.mjs <unzipped AT GTFS folder>"); process.exit(1); }
const OUT = new URL("../../auckland/live/data/", import.meta.url).pathname;

function splitCsv(line) { // GTFS CSV: commas, optional double quotes
  const out = []; let cur = "", q = false;
  for (let i = 0; i < line.length; i++) { const c = line[i]; if (q) { if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; } else if (c === '"') q = true; else if (c === ",") { out.push(cur); cur = ""; } else cur += c; }
  out.push(cur); return out;
}
async function each(file, fn) {
  const rl = readline.createInterface({ input: fs.createReadStream(path.join(dir, file)), crlfDelay: Infinity }); let head = null;
  for await (const raw of rl) { const line = raw.replace(/^﻿/, ""); if (!line) continue; const cells = splitCsv(line); if (!head) { head = Object.fromEntries(cells.map((h, i) => [h.trim(), i])); continue; } fn(cells, head); }
}
const feed = []; await each("feed_info.txt", (c, h) => feed.push({ version: c[h.feed_version], start: c[h.feed_start_date], end: c[h.feed_end_date] }));

// routes
const routes = [], routeIdx = new Map();
await each("routes.txt", (c, h) => { routeIdx.set(c[h.route_id], routes.length); routes.push({ id: c[h.route_id], short: c[h.route_short_name], type: Number(c[h.route_type]), color: c[h.route_color] || null, agency: c[h.agency_id], heads: [] }); });

// trips: route per trip, headsigns and shapes per direction (most used wins)
const tripRoute = new Map(), heads = new Map(), shapesUse = new Map();
await each("trips.txt", (c, h) => {
  const ri = routeIdx.get(c[h.route_id]); if (ri === undefined) return; tripRoute.set(c[h.trip_id], ri);
  const key = ri + "|" + (c[h.direction_id] || "0");
  const hm = heads.get(key) || heads.set(key, new Map()).get(key); const hs = c[h.trip_headsign]; if (hs) hm.set(hs, (hm.get(hs) || 0) + 1);
  const sm = shapesUse.get(key) || shapesUse.set(key, new Map()).get(key); const sh = c[h.shape_id]; if (sh) sm.set(sh, (sm.get(sh) || 0) + 1);
});
const top = (m) => [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
routes.forEach((r, i) => { r.heads = ["0", "1"].map((d) => heads.get(i + "|" + d)).filter(Boolean).map(top).filter(Boolean); });

// stops, and which routes serve each (from stop_times)
const stops = [], stopIdx = new Map();
await each("stops.txt", (c, h) => { stopIdx.set(c[h.stop_id], stops.length); stops.push([c[h.stop_id], c[h.stop_code] || "", c[h.stop_name], +(+c[h.stop_lat]).toFixed(6), +(+c[h.stop_lon]).toFixed(6), Number(c[h.location_type] || 0), c[h.parent_station] || "", new Set()]); });
await each("stop_times.txt", (c, h) => { const ri = tripRoute.get(c[h.trip_id]), si = stopIdx.get(c[h.stop_id]); if (ri !== undefined && si !== undefined) stops[si][7].add(ri); });
for (const s of stops) { s[6] = s[6] && stopIdx.has(s[6]) ? stopIdx.get(s[6]) : -1; s[7] = [...s[7]].sort((a, b) => a - b); }

// shapes: the most used shape per route and direction, in world metres, simplified to about 6 m, delta-encoded
const wantShape = new Map(); for (const [key, m] of shapesUse) wantShape.set(top(m), key);
const pts = new Map();
await each("shapes.txt", (c, h) => { const id = c[h.shape_id]; if (!wantShape.has(id)) return; (pts.get(id) || pts.set(id, []).get(id)).push([+c[h.shape_pt_sequence], +c[h.shape_pt_lat], +c[h.shape_pt_lon]]); });
function simplify(p, tol) { // Douglas-Peucker on [x, z]
  if (p.length < 3) return p; const keep = new Uint8Array(p.length); keep[0] = keep[p.length - 1] = 1; const st = [[0, p.length - 1]];
  while (st.length) { const [a, b] = st.pop(); let md = 0, mi = -1; const [ax, az] = p[a], [bx, bz] = p[b], dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz) || 1;
    for (let i = a + 1; i < b; i++) { const d = Math.abs((p[i][0] - ax) * dz - (p[i][1] - az) * dx) / L; if (d > md) { md = d; mi = i; } }
    if (md > tol) { keep[mi] = 1; st.push([a, mi], [mi, b]); } }
  return p.filter((_, i) => keep[i]);
}
const shapes = {};
for (const [id, list] of pts) {
  const key = wantShape.get(id), r = routes[+key.split("|")[0]];
  const w = simplify(list.sort((a, b) => a[0] - b[0]).map(([, la, lo]) => { const p = toWorld(la, lo); return [Math.round(p.x), Math.round(p.z)]; }), 6);
  const enc = []; let px = 0, pz = 0; for (const [x, z] of w) { enc.push(x - px, z - pz); px = x; pz = z; }
  (shapes[r.id] ||= []).push(enc);
}

const meta = { built: new Date().toISOString(), source: "Auckland Transport GTFS (static)", url: "https://gtfs.at.govt.nz/gtfs.zip", feedVersion: feed[0]?.version, feedStart: feed[0]?.start, feedEnd: feed[0]?.end,
  licence: { name: "Creative Commons Attribution 4.0 International", url: "https://creativecommons.org/licenses/by/4.0/", attribution: "Contains Auckland Transport data, CC BY 4.0", page: "https://at.govt.nz/about-us/at-data-sources/general-transit-feed-specification" } };
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(OUT + "routes.json", JSON.stringify({ ...meta, routes }));
fs.writeFileSync(OUT + "stops.json", JSON.stringify({ ...meta, note: "[stop_id, stop_code, stop_name, lat, lon, location_type, parent index or -1, route indexes]", stops }));
fs.writeFileSync(OUT + "shapes.json", JSON.stringify({ ...meta, note: "world metres from the NZTM box centre (see transit.js), delta-encoded [dx, dz, ...], most used shape per route and direction, simplified to 6 m", shapes }));
console.log({ routes: routes.length, stops: stops.length, shapes: Object.keys(shapes).length, modes: routes.reduce((m, r) => ((m[modeOf(r.type)] = (m[modeOf(r.type)] || 0) + 1), m), {}) });
