import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { onRequest } from "../../functions/api/live.js";
import { decodeLerc2, lercHeader, lercChecksum } from "../../plan-studio/twins/src/twin/linz/lerc.js";
import { openCog, fetchRange } from "../../plan-studio/twins/src/twin/linz/cog.js";
import { toNZTM, fromNZTM, sheetAt, tileAt, gridConvergence } from "../../plan-studio/twins/src/twin/linz/nztm.js";
import { fetchGround, readLayer, heightAt, packHeights, unpackHeights, clearKept, sameSurveys, VERTICAL, ELEVATION } from "../../plan-studio/twins/src/twin/linz/ground.js";
import { parcelAt, parcelQueryUrl, PARCEL_FIELDS as PAGE_PARCEL_FIELDS, PARCEL_CREDIT } from "../../plan-studio/twins/src/twin/linz/parcel.js";
import { arcQueryUrl, PARCEL_FIELDS } from "../../api/_feeds/site.js";
import { withStatus } from "../../api/_feeds/util.js";
import { groundTint, progressText, GENTLE, STEEP } from "../../plan-studio/twins/src/twin/groundLook.ts";
import { fx, replay, tileOf, withGlobalFetch } from "./helpers.mjs";

// Offline. The recordings are LINZ's real answers for two public points (see fixtures/README.md); the expected heights were read
// from the same LINZ file by GDAL, a different program from the decoder under test. The reader runs in the person's browser
// (the plan drop page); here it runs in Node with the recorded answers standing in for LINZ's bucket.
const CP = fx("castlepoint.ground.cassette"), EXPECT = fx("castlepoint.ground.expected"), SEA = fx("open-water.ground.cassette");
const LIVE_FX = (name) => JSON.parse(fs.readFileSync(new URL(`../live/fixtures/${name}.json`, import.meta.url), "utf8"));
test.beforeEach(() => clearKept());

// ---- where a point is ------------------------------------------------------------------------------------------------------------------
test("NZTM2000: matches PROJ to the centimetre across the country, and comes back again", () => {
  // latitude, longitude, easting, northing from PROJ (pyproj, EPSG:4167 to EPSG:2193), recorded 22 Nov 2026
  const ref = [[-36.877, 174.7644, 1757248.903, 5917319.049], [-41.2865, 174.7762, 1748735.553, 5427916.479], [-45.0312, 168.6626, 1258332.205, 5004425.269], [-34.4265, 172.6775, 1570367.437, 6190505.755], [-46.448, 169.8165, 1355497.484, 4851249.266], [-37.6878, 178.548, 2089351.576, 5814313.136], [-40.9, 176.231, 1872163.153, 5467316.528]];
  for (const [lat, lon, e, n] of ref) {
    const p = toNZTM(lat, lon);
    assert.ok(Math.hypot(p.e - e, p.n - n) < 0.02, `${lat},${lon}: ${p.e.toFixed(3)} ${p.n.toFixed(3)} against ${e} ${n}`);
    const q = fromNZTM(e, n); assert.ok(Math.abs(q.lat - lat) < 2e-6 && Math.abs(q.lon - lon) < 2e-6);
  }
  assert.ok(Math.abs(gridConvergence(-36.8, 173)) < 1e-12, "no convergence on the central meridian");
  assert.ok(gridConvergence(-36.8, 175.08) < -1.2 && gridConvergence(-36.8, 175.08) > -1.3, "east of it, in the south, grid north leans west of true north");
});

test("map sheet and tile names follow LINZ's rule, checked against names LINZ itself uses", () => {
  assert.equal(sheetAt(988000 + 1, 5982000 - 1).code, "AZ00"); // LINZ's own example: sheet AZ00 has its corner at 988000, 5982000
  assert.deepEqual(tileAt(1780001, 5924399, 10000), { name: "BA33_10000_0401", sheet: "BA33", left: 1780000, top: 5924400, width: 4800, height: 7200 }); // the corner written inside that LINZ file
  assert.equal(tileAt(1730081, 5987039, 1000).name, "AY30_1000_4447"); // an imagery tile whose file starts at 1730080, 5987040
  const cp = toNZTM(CP.point.lat, CP.point.lon); // the recorded Castlepoint point
  assert.equal(tileAt(cp.e, cp.n, 50000).name, "BP36"); // LINZ has a national sheet of that name there
  assert.equal(tileAt(cp.e, cp.n, 10000).name, "BP36_10000_0205"); // and its record names a survey tile of exactly this name
  assert.equal(sheetAt(988000 + 24000 * 30, 6234000 - 36000 * 16 - 1).code.slice(0, 2), "BJ", "there is no row BI");
  assert.equal(sheetAt(0, 0), null);
});

// ---- reading LINZ's files --------------------------------------------------------------------------------------------------------------
test("LERC: a real LINZ tile decodes to exactly the heights GDAL reads from it", () => {
  const tile = tileOf(CP), H = lercHeader(tile);
  assert.deepEqual({ v: H.version, w: H.width, h: H.height, mb: H.microBlock, type: H.dataType, maxZ: H.maxZError }, { v: 4, w: 512, h: 512, mb: 8, type: 6, maxZ: 0.001 });
  assert.equal(lercChecksum(tile, 0, H.blobSize), H.checksum);
  const full = decodeLerc2(tile, { verify: true });
  assert.equal(crypto.createHash("sha256").update(Buffer.from(full.data.buffer)).digest("hex"), EXPECT.tile.sha256OfFloat32LE, "all 262,144 cells, bit for bit");
  let nodata = 0, max = -Infinity; for (const v of full.data) { if (v === EXPECT.nodata) nodata++; else if (v > max) max = v; }
  assert.equal(nodata, EXPECT.tile.cellsWithNodata); assert.equal(+max.toFixed(3), EXPECT.tile.max);
});

test("LERC: asking for a window gives the same cells as cutting them from the whole tile, and reads fewer blocks", () => {
  const tile = tileOf(CP), full = decodeLerc2(tile);
  for (const w of [[0, 0, 512, 512], [100, 150, 141, 191], [505, 500, 512, 512], [0, 0, 1, 1], [37, 0, 300, 9]]) {
    const d = decodeLerc2(tile, { window: w });
    assert.equal(d.outWidth, w[2] - w[0]); assert.equal(d.outHeight, w[3] - w[1]);
    for (let r = 0; r < d.outHeight; r++) for (let c = 0; c < d.outWidth; c++) assert.ok(Object.is(d.data[r * d.outWidth + c], full.data[(r + w[1]) * 512 + c + w[0]]), `window ${w} at ${c},${r}`);
  }
  const small = decodeLerc2(tile, { window: [100, 150, 141, 191] });
  assert.ok(small.blocksRead <= 36 && small.blocksSkipped > 1000, `${small.blocksRead} read, ${small.blocksSkipped} stepped over`);
});

test("LERC: damage and unknown versions are refused, not read wrongly", () => {
  const tile = tileOf(CP);
  const bad = tile.slice(); bad[bad.length - 100] ^= 0x40;
  assert.throws(() => decodeLerc2(bad, { verify: true }), /checksum/);
  const v6 = tile.slice(); v6[6] = 6;
  assert.throws(() => decodeLerc2(v6), /not supported/);
  assert.throws(() => decodeLerc2(tile.slice(0, 40)), /too short/);
  assert.throws(() => decodeLerc2(new Uint8Array(100)), /not a Lerc2/);
  const cut = tile.slice(0, 5000); assert.throws(() => decodeLerc2(cut), /header out of range|past the end|Offset is outside/);
});

test("GeoTIFF: the front of LINZ's file says what and where it is", async () => {
  const r = replay(CP), cog = await openCog(`${ELEVATION}/new-zealand/new-zealand/dem_1m/2193/BP36.tiff`, { fetch: r.fetch });
  const L = cog.levels[0];
  assert.deepEqual({ w: L.width, h: L.height, tw: L.tileWidth, c: L.compression, bits: L.bits, fmt: L.sampleFormat, lerc: L.lerc }, { w: 24000, h: 36000, tw: 512, c: "lerc", bits: 32, fmt: 3, lerc: { version: 4, extra: 0 } });
  assert.equal(cog.epsg, 2193); assert.equal(cog.verticalEpsg, null, "the file records no vertical datum: it is quoted from LINZ's specification instead");
  assert.equal(cog.nodata, -9999); assert.deepEqual(cog.pixel, [1, 1]);
  const cp = toNZTM(CP.point.lat, CP.point.lon), s = tileAt(cp.e, cp.n, 50000); assert.deepEqual(cog.origin, [s.left, s.top], "the file's corner is the map sheet's corner");
  assert.equal(cog.levels.length, 8); assert.equal(r.asked.length, 1, "one request for the front of the file");
  const [outside, first] = await cog.tileRanges(0, [[-1, 0], [0, 0]]);
  assert.equal(outside, null, "outside the image"); assert.ok(first.offset > 65536 && first.length > 0 && first.offset + first.length < 2 ** 32);
});

// ---- the answer ------------------------------------------------------------------------------------------------------------------------
test("ground: heights for a real point equal GDAL's, with survey, dates, datum and credit", async () => {
  const r = replay(CP), f = await fetchGround({ ...CP.point, fetch: r.fetch });
  assert.equal(f.id, "ground"); assert.equal(f.status, "live"); assert.equal(f.truth, "Latest published");
  assert.equal(f.truthLabel, "Latest published · Wellington LiDAR 1m DEM (2013-2014)"); assert.equal(f.asOf, "2014-12-31"); assert.ok(Date.parse(f.fetchedAt));
  const v = f.values, g = unpackHeights(v.heights);
  assert.equal(g.n, 41); assert.equal(v.heights.cell, 1); assert.equal(v.radiusM, 20); assert.equal(v.resolutionM, 1);
  // every cell against GDAL's read of the same file: the only difference allowed is this answer's rounding to a centimetre
  assert.equal(EXPECT.window.n, 41); let worst = 0, empty = 0;
  EXPECT.window.values.forEach((want, k) => { if (want === EXPECT.nodata) { assert.ok(Number.isNaN(g.data[k])); empty++; } else worst = Math.max(worst, Math.abs(g.data[k] - want)); });
  assert.ok(worst <= 0.0051, `worst difference ${worst}`); assert.equal(v.heights.stats.cellsWithoutHeight, empty);
  // where the grid sits: whole-metre survey cells, the point inside the middle one
  assert.equal(g.originE % 1, 0.5); assert.equal(g.originN % 1, 0.5); assert.equal(g.originE, Math.floor(v.point.e) - 20 + 0.5); assert.equal(g.originN, Math.floor(v.point.n) + 20 + 0.5);
  assert.equal(f.value, v.heightAtPoint.value); assert.ok(Math.abs(f.value - heightAt(g, v.point.e, v.point.n)) < 0.006); assert.match(f.unit, /NZVD2016/);
  // provenance
  assert.deepEqual(v.verticalDatum, VERTICAL); assert.equal(v.verticalDatum.epsg, 7839); assert.match(v.verticalDatum.statedBy, /specification/);
  assert.equal(v.survey.title, "Wellington LiDAR 1m DEM (2013-2014)"); assert.deepEqual(v.survey.captured, { from: "2013-01-01", to: "2014-12-31" }, "LINZ's UTC instants read as New Zealand calendar days");
  assert.equal(v.survey.identified, "the only survey LINZ lists for this map tile"); assert.match(v.survey.file, /wellington_2013-2014\/dem_1m\/2193\/BP36_10000_0205\.tiff$/);
  assert.equal(v.nationalModel.sheet, "BP36"); assert.match(v.nationalModel.file, /new-zealand\/new-zealand\/dem_1m\/2193\/BP36\.tiff$/);
  assert.match(f.licence.name, /CC BY 4\.0/); assert.equal(f.licence.attribution, "Sourced from Toitū Te Whenua LINZ and licensed by Greater Wellington Regional Council, for re-use under the Creative Commons Attribution 4.0 International licence.");
  assert.match(f.source.name, /LINZ/); assert.equal(f.source.layer, "New Zealand LiDAR 1m DEM"); assert.match(f.note, /not a site survey/); assert.ok(f.limits);
  assert.equal(v.work.requests, 6); assert.equal(v.work.bytesDownloaded, CP.calls.reduce((a, c) => a + c.bytes, 0));
  // only LINZ's elevation bucket is asked, by byte range, and the answer never says "complies" or "safe"
  for (const a of r.asked) { assert.ok(a.url.startsWith(ELEVATION + "/"), a.url); assert.match(a.range, /^bytes=/); }
  assert.doesNotMatch(JSON.stringify({ ...f, values: { ...v, heights: null } }), /compli|approved|\bsafe\b/i);
});

test("ground: the recorded answer is still what the code gives (nothing drifts unnoticed)", async () => {
  const f = await fetchGround({ ...CP.point, fetch: replay(CP).fetch }), was = CP.answer;
  f.values.work = { ...f.values.work, decodeMs: 0, totalMs: 0 };
  assert.deepEqual({ ...f, fetchedAt: 0 }, { ...was, fetchedAt: 0 });
});

test("ground: open water answers unavailable with a reason, and guesses nothing", async () => {
  const r = replay(SEA), f = await fetchGround({ ...SEA.point, fetch: r.fetch });
  assert.equal(f.status, "unavailable"); assert.equal(f.truth, "Unavailable"); assert.equal(f.value, null);
  assert.match(f.reason, /no height at this point/); assert.match(f.reason, /Nothing is estimated/); assert.equal(f.values.heights, undefined);
  assert.ok(f.source && f.licence); assert.equal(withStatus(f).status, "unavailable", "the shared status helper leaves an honest no-data answer alone");
});

test("ground: no LINZ map sheet, a point outside New Zealand, and a missing point", async () => {
  const none = await fetchGround({ lat: -45.3, lon: 167.3, fetch: async () => new Response("", { status: 404 }) });
  assert.equal(none.status, "unavailable"); assert.match(none.reason, /has not published a 1 m LiDAR map sheet over this point \(CD06\)/);
  const out = await fetchGround({ lat: -33.86, lon: 151.2, fetch: async () => { throw new Error("must not be asked"); } });
  assert.equal(out.status, "unavailable"); assert.match(out.reason, /outside New Zealand/);
  await assert.rejects(fetchGround({}), /needs lat and lon/);
});

test("ground: a publisher failure is an error to retry, never an 'unavailable' and never a made-up height", async () => {
  await assert.rejects(fetchGround({ ...CP.point, fetch: async () => new Response("slow down", { status: 503 }) }), /HTTP 503/);
  await assert.rejects(fetchGround({ ...CP.point, fetch: async () => { throw new Error("network down"); } }), /network down/);
  // a file that is not what LINZ's specification says (here: a different pixel size) is refused
  const r = replay(CP, (url, range) => { if (!url.endsWith("BP36.tiff") || range !== "bytes=0-65535") return null; const c = CP.calls.find((x) => x.url === url && x.range === range), b = Uint8Array.from(Buffer.from(c.body, "base64")); const dv = new DataView(b.buffer); const n = dv.getUint16(dv.getUint32(4, true), true); for (let i = 0; i < n; i++) { const p = dv.getUint32(4, true) + 2 + i * 12; if (dv.getUint16(p, true) === 33550) dv.setFloat64(dv.getUint32(p + 8, true), 2, true); } return new Response(b, { status: 206 }); });
  await assert.rejects(fetchGround({ ...CP.point, fetch: r.fetch }), /not the 1 m NZTM2000 LERC float file expected/);
});

test("ground: the survey is still named honestly when its record cannot be read", async () => {
  const r = replay(CP, (url) => (url.endsWith("/BP36.json") ? new Response("", { status: 500 }) : null)), f = await fetchGround({ ...CP.point, fetch: r.fetch });
  assert.equal(f.status, "live"); assert.equal(f.values.survey.title, null); assert.match(f.values.survey.identified, /could not be read/);
  assert.equal(f.truthLabel, "Latest published · New Zealand LiDAR 1m DEM"); assert.match(f.licence.caveat, /licensor could not be read/);
});

test("overlapping surveys: named by the height at the point, and where two agree there, by the square round it", () => {
  const one = sameSurveys([{ at: 9.388, worst: 0.03, used: 81 }, { at: 9.379, worst: 0.012, used: 81 }, { at: 9.378, worst: 0.001, used: 81 }], 9.378);
  assert.deepEqual(one, { picked: [2], by: "square", cells: 81 }, "measured at Tauranga: the 2024 and 2025 surveys both match the point; only 2025 matches the square");
  assert.deepEqual(sameSurveys([{ at: 5.0, worst: 0, used: 81 }, { at: 9.0, worst: 0, used: 81 }], 5.001), { picked: [0], by: "point" });
  assert.deepEqual(sameSurveys([{ at: 5.0, worst: 0.001, used: 81 }, { at: 5.0, worst: 0.002, used: 81 }], 5.0).picked, [0, 1], "two that agree everywhere are not told apart, and the card says so");
  assert.deepEqual(sameSurveys([null, { at: NaN, worst: 0, used: 0 }], 5).picked, [], "unreadable files name nothing");
});

test("heights pack to centimetres and back, with empty cells kept empty", () => {
  const g = { n: 3, cell: 1, originE: 10.5, originN: 20.5, data: Float32Array.from([1.004, 2.006, NaN, 3, 4, 5, 6, 7, 600.2]) }, p = packHeights(g), u = unpackHeights(p);
  assert.equal(p.base, 1); assert.equal(p.scale, 0.01); assert.equal(p.stats.cellsWithoutHeight, 1); assert.deepEqual([p.stats.min, p.stats.max], [1, 600.2]);
  assert.deepEqual(Array.from(u.data).map((v) => (Number.isNaN(v) ? null : +v.toFixed(2))), [1, 2.01, null, 3, 4, 5, 6, 7, 600.2]);
  assert.equal(packHeights({ ...g, data: Float32Array.from([0, 700, 1, 1, 1, 1, 1, 1, 1]) }).scale, 0.1, "a taller range drops to decimetres and says so");
  assert.equal(+heightAt(u, 11, 20.5).toFixed(3), 1.505, "halfway between the first two cell centres"); assert.equal(+heightAt(u, 11, 20).toFixed(4), 2.5025, "the middle of four cells"); assert.ok(Number.isNaN(heightAt(u, 12, 20.5)), "beside an empty cell there is no height"); assert.ok(Number.isNaN(heightAt(u, 99, 20)));
});

// ---- reliability: what failed on Cloudflare, and what a failure must never become ------------------------------------------------------
test("a whole file offered for a range is refused without reading it (Cloudflare sent 1,243,832,160 bytes for 64 KB)", async () => {
  let cancelled = false, pulled = 0;
  const body = new ReadableStream({ pull(c) { pulled++; c.enqueue(new Uint8Array(65536)); }, cancel() { cancelled = true; } });
  const f = async () => new Response(body, { status: 200, headers: { "content-length": "1243832160" } });
  await assert.rejects(fetchRange(`${ELEVATION}/new-zealand/new-zealand/dem_1m/2193/BD33.tiff`, 0, 65535, { fetch: f }), /range not honoured: 1243832160 bytes offered for a 65536-byte range of BD33\.tiff/);
  assert.ok(cancelled, "the body is cancelled"); assert.ok(pulled <= 1, "and not read");
  // a small file sent whole is fine: the asked-for bytes are cut from it
  const small = await fetchRange("https://x.test/a.json", 2, 4, { fetch: async () => new Response(new Uint8Array([0, 1, 2, 3, 4, 5]), { status: 200 }) });
  assert.deepEqual(Array.from(small), [2, 3, 4]);
});

test("only a Range header goes to LINZ (a plain range needs no CORS preflight), and nothing but LINZ's bucket is asked", async () => {
  const seen = []; const r = replay(CP);
  await readLayer("ground", { ...CP.point, fetch: async (url, init) => { seen.push(Object.keys(init.headers || {})); return r.fetch(url, init); } });
  assert.ok(seen.length > 0 && seen.every((k) => k.length === 1 && k[0] === "range"), JSON.stringify(seen.slice(0, 3)));
  for (const a of r.asked) assert.ok(a.url.startsWith(ELEVATION + "/"), a.url);
});

test("a slow request stops at its own limit and says so; Stop stops the whole read; neither leaves an answer", async () => {
  const never = (url, init) => new Promise((_, no) => init.signal.addEventListener("abort", () => no(new Error("aborted"))));
  await assert.rejects(fetchRange("https://x.test/a.tiff", 0, 9, { fetch: never, ms: 30 }), /did not answer within 0 s/);
  const ac = new AbortController(); setTimeout(() => ac.abort(new Error("stopped by hand")), 20);
  await assert.rejects(readLayer("ground", { ...CP.point, fetch: never, signal: ac.signal }), /stopped by hand/);
  const done = new AbortController(); done.abort(new Error("stopped by hand"));
  await assert.rejects(readLayer("ground", { ...CP.point, fetch: replay(CP).fetch, signal: done.signal }), /stopped by hand/);
});

test("progress is reported as each answer arrives, and adds up to what was read", async () => {
  const ticks = []; const f = await readLayer("ground", { ...CP.point, fetch: replay(CP).fetch, onProgress: (s) => ticks.push([s.requests, s.bytes]) });
  assert.equal(ticks.length, f.values.work.requests); assert.deepEqual(ticks.at(-1), [f.values.work.requests, f.values.work.bytesDownloaded]);
  for (let i = 1; i < ticks.length; i++) assert.ok(ticks[i][0] === ticks[i - 1][0] + 1 && ticks[i][1] > ticks[i - 1][1]);
});

test("a failure is never kept: the next read asks LINZ again and gets the real answer", async () => {
  // the survey's collection record fails once; the heights still come, the survey is honestly unnamed
  let fail = true; const r = replay(CP, (url) => (fail && url.endsWith("/collection.json") ? new Response("", { status: 503 }) : null));
  const first = await readLayer("ground", { ...CP.point, fetch: r.fetch });
  assert.equal(first.status, "live"); assert.equal(first.values.survey.title, null);
  fail = false; const again = replay(CP), second = await readLayer("ground", { ...CP.point, fetch: again.fetch });
  assert.equal(second.values.survey.title, "Wellington LiDAR 1m DEM (2013-2014)");
  assert.ok(again.asked.some((a) => a.url.endsWith("/collection.json")), "the failed record was asked for again, not remembered");
  // and a good record is kept for the page's life: a third read does not ask for it
  const third = replay(CP); await readLayer("ground", { ...CP.point, fetch: third.fetch });
  assert.ok(!third.asked.some((a) => a.url.endsWith("/collection.json")));
});

test("the lab's server no longer offers ground or surface, and an answer with a failed feed is never cached", async () => {
  const puts = [], store = new Map();
  const cache = { match: async (k) => store.get(k.url), put: async (k, v) => { puts.push(k.url); store.set(k.url, v); } };
  const realCaches = globalThis.caches; globalThis.caches = { default: cache };
  try {
    const gone = await (await onRequest({ request: new Request(`https://lab.assembl.co.nz/api/live/?feeds=ground,surface&lat=${CP.point.lat}&lon=${CP.point.lon}`), env: {} })).json();
    assert.deepEqual(gone.unknown, ["ground", "surface"]); assert.ok(!gone.available.includes("ground"));
    // a feed that fails: no-store, and nothing written to the cache, so a second ask goes to the publisher again
    let asks = 0; const down = async () => { asks++; return new Response("", { status: 503 }); };
    const url = "https://lab.assembl.co.nz/api/live/?feeds=fx";
    const one = await withGlobalFetch(down, () => onRequest({ request: new Request(url), env: {} }));
    assert.equal(one.headers.get("cache-control"), "no-store"); assert.match((await one.json()).feeds.fx.error, /503/);
    const before = asks; await withGlobalFetch(down, () => onRequest({ request: new Request(url), env: {} }));
    assert.ok(asks > before, "the second ask went to the publisher"); assert.equal(puts.filter((u) => u === url).length, 0, "the failure was never stored");
  } finally { globalThis.caches = realCaches; }
});

// ---- the boundary: straight from LINZ's parcel map, with the same short field list as the site feed --------------------------------
test("parcel: the browser asks exactly what the site feed asks (no legal description, titles or surveys), and reads the outline", async () => {
  assert.equal(PAGE_PARCEL_FIELDS, PARCEL_FIELDS);
  assert.equal(parcelQueryUrl(-36.85, 174.76), arcQueryUrl("https://services.arcgis.com/xdsHIIxuCWByZiCB/arcgis/rest/services", "LINZ_NZ_Primary_Parcels", { lat: -36.85, lon: 174.76, geometry: true, outFields: PARCEL_FIELDS }));
  assert.doesNotMatch(parcelQueryUrl(-36.85, 174.76), /appellation|titles|affected/);
  const asked = []; const f = async (url) => { asked.push(String(url)); return new Response(JSON.stringify(String(url).includes("/query?") ? LIVE_FX("parcel") : LIVE_FX("layer-meta")), { status: 200 }); };
  const p = await parcelAt(-36.85, 174.76, { fetch: f });
  assert.equal(p.rings.length, 1); assert.ok(p.rings[0].length > 3 && p.rings[0].every((c) => c.length === 2)); assert.equal(p.calcAreaM2, 99289);
  assert.equal(p.asOf, new Date(1795180749232).toISOString().slice(0, 10)); assert.equal(p.credit, PARCEL_CREDIT);
  assert.equal(JSON.stringify(p).includes("redacted"), false, "nothing but the outline, area and date is kept");
  for (const u of asked) assert.ok(u.startsWith("https://services.arcgis.com/xdsHIIxuCWByZiCB/"), u);
  const none = await parcelAt(-36.6, 175.0, { fetch: async (url) => new Response(JSON.stringify(String(url).includes("/query?") ? { type: "FeatureCollection", features: [] } : {}), { status: 200 }) });
  assert.equal(none.none, true); assert.deepEqual(none.rings, []);
  await assert.rejects(parcelAt(-36.85, 174.76, { fetch: async () => new Response("", { status: 500 }) }), /HTTP 500/, "a failure is an error, never an empty boundary");
});

// ---- how it looks and what it says -------------------------------------------------------------------------------------------------
test("ground drawn from survey heights reads as land: green where gentle, brown where steep, darker on the metre lines", () => {
  const flat = groundTint(0, 0.5, 0), steep = groundTint(1, 0.5, 0), mid = groundTint(0.36, 0.5, 0);
  assert.ok(flat[1] > flat[0] && flat[1] > flat[2], `gentle ground is green: ${flat}`);
  assert.ok(steep[0] > steep[1] && steep[1] > steep[2], `steep ground is brown: ${steep}`);
  assert.ok(mid[0] > flat[0] && mid[0] < steep[0], "in between, in between");
  const sum = (c) => c[0] + c[1] + c[2]; assert.ok(sum(groundTint(0, 0.5, 1)) < sum(flat) && sum(groundTint(0, 0.5, 5)) < sum(groundTint(0, 0.5, 1)), "metre lines darker, 5 m lines darker still");
  for (const c of [flat, steep]) assert.ok(Math.max(...c) - Math.min(...c) < 50 && Math.max(...c) < 150, `muted, not bright: ${c}`);
  assert.deepEqual([GENTLE.length, STEEP.length], [3, 3]);
  // the old default was sand: warm, light and grey-yellow (red at least as high as green). The new gentle ground is not
  const sand = [151, 151, 121]; assert.ok(sand[0] >= sand[1] && flat[0] < flat[1]);
});

test("while LINZ's files arrive the card says how far it has got, and says plainly when it is slow", () => {
  assert.equal(progressText("Reading", 3, 1.5e6, 2.4), "Reading: 3 answers from LINZ, 1.5 MB, 2 s.");
  assert.equal(progressText("Reading", 1, 0, 0), "Reading: 1 answer from LINZ, 0.0 MB, 0 s.");
  assert.match(progressText("Reading", 9, 2e6, 8.2), /Slower than usual\. .*stops by itself at 60 s, and nothing is drawn until every part has arrived\./);
});

test("the reader runs in a browser: Web APIs only, no Node modules, no JSON imports, no lab address", () => {
  for (const f of ["lerc.js", "cog.js", "nztm.js", "ground.js", "parcel.js"]) {
    const s = fs.readFileSync(new URL(`../../plan-studio/twins/src/twin/linz/${f}`, import.meta.url), "utf8").replace(/\/\/.*$/gm, "");
    assert.doesNotMatch(s, /\bBuffer\b|\bprocess\.|\brequire\(|from "node:|import\.meta\.url|with\s*\{\s*type:|\/api\/live/, f);
    assert.doesNotMatch(s, /user-agent/i, f);
  }
  // and the page's card never sends the point to the lab's feed: no /api/live in it, and its words say so
  const card = fs.readFileSync(new URL("../../plan-studio/twins/src/twin/siteGround.ts", import.meta.url), "utf8");
  assert.doesNotMatch(card, /\/api\/live|lab’s feed|lab's feed/);
  assert.match(card, /the lab’s server is not asked and never receives the point/);
});
