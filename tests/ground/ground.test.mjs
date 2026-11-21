import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { onRequest } from "../../functions/api/live.js";
import { decodeLerc2, lercHeader, lercChecksum } from "../../api/_feeds/lerc.js";
import { openCog } from "../../api/_feeds/cog.js";
import { toNZTM, fromNZTM, sheetAt, tileAt, gridConvergence } from "../../api/_feeds/nztm.js";
import { fetchGround, readHeights, heightAt, packHeights, unpackHeights, VERTICAL, ELEVATION } from "../../api/_feeds/ground.js";
import { clearMemo, withStatus } from "../../api/_feeds/util.js";
import { fx, replay, tileOf, withGlobalFetch } from "./helpers.mjs";

// Offline. The recordings are LINZ's real answers for two public points (see fixtures/README.md); the expected heights were read
// from the same LINZ file by GDAL, a different program from the decoder under test.
const CP = fx("castlepoint.ground.cassette"), EXPECT = fx("castlepoint.ground.expected"), SEA = fx("open-water.ground.cassette");
test.beforeEach(() => clearMemo());

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

test("heights pack to centimetres and back, with empty cells kept empty", () => {
  const g = { n: 3, cell: 1, originE: 10.5, originN: 20.5, data: Float32Array.from([1.004, 2.006, NaN, 3, 4, 5, 6, 7, 600.2]) }, p = packHeights(g), u = unpackHeights(p);
  assert.equal(p.base, 1); assert.equal(p.scale, 0.01); assert.equal(p.stats.cellsWithoutHeight, 1); assert.deepEqual([p.stats.min, p.stats.max], [1, 600.2]);
  assert.deepEqual(Array.from(u.data).map((v) => (Number.isNaN(v) ? null : +v.toFixed(2))), [1, 2.01, null, 3, 4, 5, 6, 7, 600.2]);
  assert.equal(packHeights({ ...g, data: Float32Array.from([0, 700, 1, 1, 1, 1, 1, 1, 1]) }).scale, 0.1, "a taller range drops to decimetres and says so");
  assert.equal(+heightAt(u, 11, 20.5).toFixed(3), 1.505, "halfway between the first two cell centres"); assert.equal(+heightAt(u, 11, 20).toFixed(4), 2.5025, "the middle of four cells"); assert.ok(Number.isNaN(heightAt(u, 12, 20.5)), "beside an empty cell there is no height"); assert.ok(Number.isNaN(heightAt(u, 99, 20)));
});

test("through the lab's own address: /api/live/?feeds=ground, cached for hours, and briefly when a publisher fails", async () => {
  const url = `https://lab.assembl.co.nz/api/live/?feeds=ground&lat=${CP.point.lat}&lon=${CP.point.lon}&radius=${CP.point.radius}`;
  const ok = await withGlobalFetch(replay(CP).fetch, async () => { const res = await onRequest({ request: new Request(url), env: {} }); return { res, body: await res.json() }; });
  assert.equal(ok.res.status, 200); assert.equal(ok.body.feeds.ground.status, "live"); assert.equal(ok.body.feeds.ground.values.heights.n, 41);
  assert.match(ok.res.headers.get("cache-control"), /s-maxage=21600/);
  clearMemo();
  const down = await withGlobalFetch(async () => new Response("", { status: 503 }), async () => { const res = await onRequest({ request: new Request(url), env: {} }); return { res, body: await res.json() }; });
  assert.equal(down.res.status, 200); assert.match(down.body.feeds.ground.error, /HTTP 503/); assert.match(down.res.headers.get("cache-control"), /s-maxage=300/);
  const sea = await withGlobalFetch(replay(SEA).fetch, async () => (await (await onRequest({ request: new Request(`https://lab.assembl.co.nz/api/live/?feeds=ground&lat=${SEA.point.lat}&lon=${SEA.point.lon}&radius=20`), env: {} })).json()).feeds.ground);
  assert.equal(sea.status, "unavailable"); assert.equal(sea.statusLabel, undefined);
});

test("the feed's code can run on Cloudflare: Web APIs only, no JSON imports", () => {
  for (const f of ["lerc.js", "cog.js", "nztm.js", "ground.js"]) {
    const s = fs.readFileSync(new URL(`../../api/_feeds/${f}`, import.meta.url), "utf8").replace(/\/\/.*$/gm, "");
    assert.doesNotMatch(s, /\bBuffer\b|\bprocess\.|\brequire\(|from "node:|import\.meta\.url|with\s*\{\s*type:/, f);
  }
});
