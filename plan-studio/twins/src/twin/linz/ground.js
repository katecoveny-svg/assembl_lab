// Real heights around one point of land, read by the browser from LINZ's open 1 m LiDAR. Key-less, no server of ours.
//
//   await readLayer("ground", { lat, lon, radius, signal, onProgress })    bare ground (LINZ "DEM")
//   await readLayer("surface", { lat, lon, radius, signal, onProgress })   tops of trees and buildings (LINZ "DSM")
//   → one envelope: { id, label, truth, truthLabel, status, fetchedAt, asOf, cadence, value, unit, values, source, licence, note, limits }
//   values.heights is a square grid of survey cells, north-up, one cell per metre, exactly as LINZ published them (no resampling):
//     { n, cell, originE, originN (the centre of the north-west cell, NZTM2000), base, scale, nodata, encoding, data }
//     height of cell (row, col) in metres = base + scale × uint16 at index row × n + col; rows run north to south, columns west to east.
//   Where LINZ has no 1 m cover: { id, label, truth:"Unavailable", status:"unavailable", reason, source, licence }. Nothing is estimated.
//   A failure (LINZ not answering, a file that is not what LINZ's specification says) throws: it is never an answer.
//
// The page calls this from the person's browser, straight to LINZ's bucket on Amazon S3, so the site point never reaches the
// lab's server. Until 22 Nov 2026 the same code ran as the lab's /api/live/?feeds=ground on Cloudflare, where Cloudflare's cache
// dropped the byte ranges on a cold file and the answers failed (docs/architecture/site-ground.md says how that was measured).
//
// How the right file is found, with no list to keep up to date: LINZ joins every 1 m survey into one national model, one file
// per Topo50 map sheet (new-zealand/new-zealand/dem_1m/2193/<sheet>.tiff). The sheet over a point is arithmetic (nztm.js).
// Each sheet's own record names the survey tiles it was made from; the survey at the point is then confirmed by reading that
// survey's own file at the point and checking the height is the same.
//
// Vertical datum: NZVD2016 (EPSG:7839). LINZ states this in its elevation TIFF specification and says the files themselves
// record only the horizontal system, so the files are checked for NZTM2000 and the datum is quoted from the specification.
// Sources read on 22 Nov 2026: github.com/linz/elevation (README, docs/tiff-specification.md, docs/naming.md), the bucket's
// catalog.json and collection.json files, and LINZ's page on attributing elevation data.
import { toNZTM, tileAt } from "./nztm.js";
import { openCog, fetchRange } from "./cog.js";
import { decodeLerc2 } from "./lerc.js";

export const round = (x, d = 1) => (x == null || !isFinite(x) ? null : +(+x).toFixed(d));
// survey records change rarely: a finished answer is kept for this page's life. A failure is never kept.
const KEPT = new Map();
export const clearKept = () => KEPT.clear();
const memo = (key, fn) => { if (KEPT.has(key)) return Promise.resolve(KEPT.get(key)); return Promise.resolve().then(fn).then((v) => { KEPT.set(key, v); return v; }); };
export const ELEVATION = "https://nz-elevation.s3.ap-southeast-2.amazonaws.com";
const NATIONAL = "new-zealand/new-zealand";
const KINDS = {
  ground: { dir: "dem_1m", label: "Ground heights around the point (LINZ 1 m LiDAR)", layer: "New Zealand LiDAR 1m DEM", what: "bare ground with buildings and plants taken off" },
  surface: { dir: "dsm_1m", label: "Tops of trees and buildings around the point (LINZ 1 m LiDAR)", layer: "New Zealand LiDAR 1m DSM", what: "the highest thing the laser met: tree tops, roofs, or open ground" },
};
const SPEC = "https://github.com/linz/elevation/blob/master/docs/tiff-specification.md";
const ATTRIBUTION = "https://www.linz.govt.nz/products-services/data/licensing-and-using-data/attributing-elevation-or-aerial-imagery-data";
export const VERTICAL = { name: "New Zealand Vertical Datum 2016 (NZVD2016)", epsg: 7839, statedBy: "LINZ elevation TIFF specification (the files record only NZTM2000)", url: SPEC };
const inNZ = (lat, lon) => isFinite(lat) && isFinite(lon) && lat <= -34 && lat >= -47.5 && lon >= 166 && lon <= 179;
const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
const text = async (url, start, end, o) => new TextDecoder().decode(await fetchRange(url, start, end, o));
// LINZ writes capture dates as the UTC instant of midnight in New Zealand, so the calendar day is read in New Zealand time
const nzDay = (iso) => { const t = Date.parse(iso || ""); if (!isFinite(t)) return null; try { return new Intl.DateTimeFormat("en-CA", { timeZone: "Pacific/Auckland", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(t)); } catch (e) { return String(iso).slice(0, 10); } };

// ---- one layer's cells around a point: exactly LINZ's cells, NaN where there is no height -----------------------------------------
// Returns null when LINZ has no sheet over the point. A neighbouring sheet that does not exist just leaves its cells empty.
export async function readHeights(kind, e, n, half, o = {}) {
  const N = 2 * half + 1, data = new Float32Array(N * N).fill(NaN), col0 = Math.floor(e) - half, rowTop = Math.floor(n) + half; // whole-metre cells
  const centre = tileAt(e, n, 50000), sheets = new Map();
  for (const [x, y] of [[col0 + 0.5, rowTop + 0.5], [col0 + N - 0.5, rowTop + 0.5], [col0 + 0.5, rowTop - N + 1.5], [col0 + N - 0.5, rowTop - N + 1.5]]) { const s = tileAt(x, y, 50000); if (s) sheets.set(s.name, s); }
  if (!centre) return null;
  const files = [];
  const one = async (s) => {
    const url = `${ELEVATION}/${NATIONAL}/${KINDS[kind].dir}/2193/${s.name}.tiff`;
    let cog;
    try { cog = await openCog(url, o); } catch (err) { if (err.notFound) { if (s.name === centre.name) throw err; return; } throw err; }
    const L = cog.levels[0];
    // the file must be what LINZ's specification says it is; anything else is refused rather than read wrongly
    if (cog.epsg !== 2193 || !cog.pixel || cog.pixel[0] !== 1 || cog.pixel[1] !== 1 || L.compression !== "lerc" || (L.lerc && L.lerc.extra) || L.bits !== 32 || L.sampleFormat !== 3 || L.samples !== 1)
      throw new Error(`${s.name}: not the 1 m NZTM2000 LERC float file expected (EPSG ${cog.epsg}, pixel ${cog.pixel}, ${L.compression})`);
    if (cog.origin[0] !== s.left || cog.origin[1] !== s.top) throw new Error(`${s.name}: the file's corner (${cog.origin}) is not the map sheet's corner (${s.left}, ${s.top})`);
    // the part of this sheet inside the window, in the sheet's own pixels
    const c0 = Math.max(0, col0 - s.left), c1 = Math.min(L.width, col0 + N - s.left), r0 = Math.max(0, s.top - 1 - rowTop), r1 = Math.min(L.height, s.top - 1 - rowTop + N);
    if (c1 <= c0 || r1 <= r0) return;
    const want = [];
    for (let ty = Math.floor(r0 / L.tileHeight); ty <= Math.floor((r1 - 1) / L.tileHeight); ty++) for (let tx = Math.floor(c0 / L.tileWidth); tx <= Math.floor((c1 - 1) / L.tileWidth); tx++) want.push([tx, ty]);
    const ranges = await cog.tileRanges(0, want);
    await Promise.all(ranges.map(async (r) => {
      if (!r) return; // LINZ leaves wholly empty tiles out of the file
      const bytes = await cog.tileBytes(r), t0 = now();
      const ox = r.tx * L.tileWidth, oy = r.ty * L.tileHeight, w = [Math.max(c0, ox) - ox, Math.max(r0, oy) - oy, Math.min(c1, ox + L.tileWidth) - ox, Math.min(r1, oy + L.tileHeight) - oy];
      const d = decodeLerc2(bytes, { window: w, verify: !!o.verify });
      for (let rr = 0; rr < d.outHeight; rr++) {
        const row = oy + w[1] + rr - (s.top - 1 - rowTop), base = row * N + (s.left + ox + w[0] - col0);
        for (let cc = 0; cc < d.outWidth; cc++) { const v = d.data[rr * d.outWidth + cc]; if (v !== cog.nodata && v > -1000) data[base + cc] = v; }
      }
      if (o.stats) o.stats.decodeMs += now() - t0;
    }));
    files.push({ sheet: s.name, url, nodata: cog.nodata, lercMaxError: null });
  };
  try { await Promise.all([...sheets.values()].map(one)); } catch (err) { if (err.notFound) return null; throw err; }
  return { n: N, half, cell: 1, originE: col0 + 0.5, originN: rowTop + 0.5, data, files, sheet: centre.name };
}

/** bilinear height at a map point from a grid of cell-centre values; NaN if any of the four cells has no height */
export function heightAt(g, e, n) {
  const fx = e - g.originE, fy = g.originN - n, i = Math.floor(fx), j = Math.floor(fy);
  if (i < 0 || j < 0 || i >= g.n - 1 || j >= g.n - 1) return NaN;
  const a = fx - i, b = fy - j, H = g.data, k = j * g.n + i;
  return (H[k] * (1 - a) + H[k + 1] * a) * (1 - b) + (H[k + g.n] * (1 - a) + H[k + g.n + 1] * a) * b;
}

// ---- which survey: the sheet's record lists the survey tiles it was made from; the one at the point is confirmed by its own height
const head = (url, o) => memo("head:" + url, () => text(url, 0, 699, o));
const tail = (url, o) => memo("tail:" + url, async () => { const b = await fetchRange(url, 0, 0, { ...o, suffix: 9000 }); return new TextDecoder().decode(b); });
const pick = (s, key) => { const m = s.match(new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`)); return m ? JSON.parse(`"${m[1]}"`) : null; };
export async function surveysAt(kind, sheet, e, n, o = {}) {
  const dir = KINDS[kind].dir, itemUrl = `${ELEVATION}/${NATIONAL}/${dir}/2193/${sheet}.json`;
  const item = JSON.parse(new TextDecoder().decode(await fetchRange(itemUrl, 0, 262143, o)));
  const tile = tileAt(e, n, 10000), re = new RegExp(`^s3://nz-elevation/(.+)/${dir}/2193/${tile.name}\\.json$`);
  const paths = (item.links || []).filter((l) => l.rel === "derived_from").map((l) => (l.href || "").match(re)).filter(Boolean).map((m) => m[1]);
  const out = await Promise.all(paths.slice(0, 4).map(async (path) => {
    const base = `${ELEVATION}/${path}/${dir}/2193`, s = { path, tile: tile.name, file: `${base}/${tile.name}.tiff`, record: `${base}/${tile.name}.json`, collection: `${base}/collection.json` };
    try {
      const [h, t, rec] = await Promise.all([head(s.collection, o), tail(s.collection, o), fetchRange(s.record, 0, 65535, o).then((b) => JSON.parse(new TextDecoder().decode(b)))]);
      s.title = pick(h, "title"); s.licence = pick(h, "license");
      const pv = t.match(/"providers"\s*:\s*(\[[\s\S]*?\])\s*,\s*"linz:/); s.providers = pv ? JSON.parse(pv[1]) : [];
      s.licensors = s.providers.filter((p) => (p.roles || []).includes("licensor")).map((p) => p.name);
      s.captured = { from: nzDay(rec.properties?.start_datetime), to: nzDay(rec.properties?.end_datetime) };
    } catch (err) { s.metadataError = String(err?.message || err).slice(0, 120); }
    return s;
  }));
  return { sheetRecord: itemUrl, sheetUpdated: nzDay(item.properties?.updated), sheetSpan: { from: nzDay(item.properties?.start_datetime), to: nzDay(item.properties?.end_datetime) }, tile: tile.name, surveys: out };
}
// read a survey's own cells round the point, to compare with the national model: { at: its height at the point, worst, used },
// worst being the largest difference from the national model over the cells within R m of the point that both have.
// The tile is the one already needed for the point, so the square costs no extra request.
async function surveyCells(s, e, n, g, o, R = 4) {
  const cog = await openCog(s.file, { ...o, headBytes: 16384 }), L = cog.levels[0];
  if (cog.epsg !== 2193 || !cog.pixel || cog.pixel[0] !== 1 || L.compression !== "lerc") return null;
  const c = Math.floor(e - cog.origin[0]), r = Math.floor(cog.origin[1] - n), tx = Math.floor(c / L.tileWidth), ty = Math.floor(r / L.tileHeight);
  const [rg] = await cog.tileRanges(0, [[tx, ty]]); if (!rg) return null;
  const lc = c - tx * L.tileWidth, lr = r - ty * L.tileHeight, w = [Math.max(0, lc - R), Math.max(0, lr - R), Math.min(L.tileWidth, lc + R + 1), Math.min(L.tileHeight, lr + R + 1)];
  const d = decodeLerc2(await cog.tileBytes(rg), { window: w });
  let at = NaN, worst = 0, used = 0;
  for (let rr = 0; rr < d.outHeight; rr++) for (let cc = 0; cc < d.outWidth; cc++) {
    const v = d.data[rr * d.outWidth + cc]; if (!(v === v) || v === cog.nodata) continue;
    const col = tx * L.tileWidth + w[0] + cc, row = ty * L.tileHeight + w[1] + rr; // in the survey file
    if (col === c && row === r) at = v;
    const gi = cog.origin[0] + col + 0.5 - g.originE, gj = g.originN - (cog.origin[1] - row - 0.5); // the same cell in the national square
    if (gi < 0 || gj < 0 || gi >= g.n || gj >= g.n) continue;
    const gv = g.data[gj * g.n + gi]; if (!(gv === gv)) continue;
    worst = Math.max(worst, Math.abs(v - gv)); used++;
  }
  return { at, worst, used };
}
/** which surveys made the national model at the point: those whose own height there is the same (LINZ stores each to within
 *  1 mm, so 2.5 mm allows for both); where more than one is, those that also agree over the square round the point */
export function sameSurveys(found, cell, tol = 0.0025) {
  const atPoint = found.map((f, i) => (f && Math.abs(f.at - cell) <= tol ? i : -1)).filter((i) => i >= 0);
  if (atPoint.length <= 1) return { picked: atPoint, by: "point" };
  const square = atPoint.filter((i) => found[i].used > 1 && found[i].worst <= tol);
  return { picked: square, by: "square", cells: square.length === 1 ? found[square[0]].used : null };
}

// ---- the envelope ------------------------------------------------------------------------------------------------------------------
const b64 = (u8) => { let s = ""; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
export function packHeights(g) {
  let lo = Infinity, hi = -Infinity, sum = 0, valid = 0;
  for (let i = 0; i < g.data.length; i++) { const v = g.data[i]; if (v === v) { if (v < lo) lo = v; if (v > hi) hi = v; sum += v; valid++; } }
  const base = Math.floor(lo), scale = (hi - base) * 100 < 65000 ? 0.01 : 0.1, u = new Uint16Array(g.data.length), inv = 1 / scale;
  for (let i = 0; i < u.length; i++) { const v = g.data[i]; u[i] = v === v ? Math.round((v - base) * inv) : 65535; }
  const bytes = new Uint8Array(u.length * 2); for (let i = 0; i < u.length; i++) { bytes[2 * i] = u[i] & 255; bytes[2 * i + 1] = u[i] >> 8; } // little-endian whatever the machine
  return { n: g.n, cell: g.cell, originE: g.originE, originN: g.originN, base, scale, nodata: 65535, encoding: "base64 of little-endian uint16, row by row from the north-west cell", data: b64(bytes),
    stats: { min: round(lo, 2), max: round(hi, 2), mean: round(sum / valid, 2), cells: g.data.length, cellsWithoutHeight: g.data.length - valid } };
}
/** the reverse of packHeights, for tests and for the page */
export function unpackHeights(h) {
  const s = atob(h.data), out = new Float32Array(h.n * h.n);
  for (let i = 0; i < out.length; i++) { const v = s.charCodeAt(2 * i) | (s.charCodeAt(2 * i + 1) << 8); out[i] = v === h.nodata ? NaN : h.base + v * h.scale; }
  return { n: h.n, cell: h.cell, originE: h.originE, originN: h.originN, data: out };
}

const src = (kind, extra = {}) => ({ name: "Toitū Te Whenua LINZ, New Zealand Elevation open data (Registry of Open Data on AWS)", url: "https://github.com/linz/elevation", service: `${ELEVATION}/catalog.json`, layer: KINDS[kind].layer, ...extra });
const licence = (licensors) => ({ name: "CC BY 4.0 (Creative Commons Attribution 4.0 International)", url: ATTRIBUTION,
  attribution: `Sourced from Toitū Te Whenua LINZ${licensors?.length ? ` and licensed by ${licensors.join(", ")}` : ""}, for re-use under the Creative Commons Attribution 4.0 International licence.`,
  ...(licensors?.length ? {} : { caveat: "The survey's licensor could not be read, so the credit names LINZ only. LINZ asks that the licensor be named too." }) });
const unavailable = (kind, reason, extra = {}) => ({ id: kind, label: KINDS[kind].label, truth: "Unavailable", truthLabel: "Unavailable", status: "unavailable", fetchedAt: new Date().toISOString(), reason, value: null, values: null, source: src(kind), licence: licence(null), ...extra });

export async function readLayer(kind, { lat, lon, radius, fetch: f, signal, onProgress, ms } = {}) {
  if (!Object.prototype.hasOwnProperty.call(KINDS, kind)) throw new Error(`unknown layer ${kind}`);
  if (lat == null || lon == null) throw new Error(`${kind} needs lat and lon`);
  if (!inNZ(lat, lon)) return unavailable(kind, "The point is outside New Zealand's main islands. Nothing is estimated.");
  const half = Math.max(20, Math.min(160, Math.round(radius || 100))), t0 = now(), stats = { requests: 0, bytes: 0, decodeMs: 0, onProgress }, o = { stats, fetch: f || ((...a) => fetch(...a)), signal, ...(ms ? { ms } : {}) };
  const { e, n } = toNZTM(lat, lon), point = { lat, lon, e: round(e, 2), n: round(n, 2), crs: "EPSG:2193 (NZGD2000 / NZTM2000); the latitude and longitude are taken as NZGD2000, which is within about a metre of WGS84" };
  // the heights, and the map sheet's own record of which surveys it was made from, are asked for together
  const sheetName = tileAt(e, n, 50000)?.name ?? null;
  const svP = sheetName ? surveysAt(kind, sheetName, e, n, o).then((v) => ({ v }), (err) => ({ err })) : Promise.resolve({ err: new Error("outside the map sheet grid") });
  const g = await readHeights(kind, e, n, half, o);
  if (!g) return unavailable(kind, `LINZ has not published a 1 m LiDAR map sheet over this point (${sheetName ?? "outside the map sheet grid"}). Nothing is estimated.`, { values: { point } });
  const cell = g.data[half * g.n + half], atPoint = heightAt(g, e, n);
  if (!(cell === cell)) return unavailable(kind, `LINZ's 1 m LiDAR has no height at this point (map sheet ${g.sheet}: open water, or outside the surveyed area). Nothing is estimated.`, { values: { point, sheet: g.sheet } });
  const tEnc = now(), heights = packHeights(g); stats.decodeMs += now() - tEnc;
  // the survey at the point
  let sv = null, survey = null, how = "not identified";
  const got = await svP;
  if (got.err) how = "the survey record could not be read: " + String(got.err?.message || got.err).slice(0, 100);
  else {
    sv = got.v;
    if (sv.surveys.length === 1) { survey = sv.surveys[0]; how = "the only survey LINZ lists for this map tile"; }
    else if (sv.surveys.length > 1) {
      const found = await Promise.all(sv.surveys.map((s) => surveyCells(s, e, n, g, o).catch(() => null)));
      const m = sameSurveys(found, cell), k = sv.surveys.length;
      if (m.picked.length === 1) { survey = sv.surveys[m.picked[0]]; how = m.by === "point" ? `${k} surveys overlap this map tile; this one's own file has the same height at the point` : `${k} surveys overlap this map tile; more than one has the same height at the point, and only this one also matches all ${m.cells} cells round it`; }
      else how = `${k} surveys overlap this map tile and the one used at the point could not be told apart`;
    } else how = "the map sheet's record lists no survey for this map tile";
  }
  const brief = (s) => ({ title: s.title ?? null, path: s.path, captured: s.captured ?? null, licensors: s.licensors ?? [], file: s.file, record: s.record });
  const asOf = survey?.captured?.to ?? sv?.sheetSpan?.to ?? null;
  return {
    id: kind, label: KINDS[kind].label, truth: "Latest published", truthLabel: `Latest published · ${survey?.title ?? KINDS[kind].layer}`, status: "live", fetchedAt: new Date().toISOString(),
    asOf, period: survey?.captured ? `${survey.captured.from} to ${survey.captured.to}` : null, cadence: "as LINZ adds surveys to the national 1 m model",
    value: atPoint === atPoint ? round(atPoint, 2) : round(cell, 2), unit: "m above NZVD2016 at the point",
    values: {
      point, heightAtPoint: { value: atPoint === atPoint ? round(atPoint, 2) : null, method: "bilinear between the four nearest 1 m cell centres", nearestCell: round(cell, 3) },
      what: KINDS[kind].what, resolutionM: 1, radiusM: half, verticalDatum: VERTICAL,
      survey: survey ? { ...brief(survey), identified: how } : { title: null, identified: how, candidates: (sv?.surveys || []).map(brief) },
      nationalModel: { sheet: g.sheet, file: g.files.find((x) => x.sheet === g.sheet)?.url, record: sv?.sheetRecord ?? null, updated: sv?.sheetUpdated ?? null, sheetsRead: g.files.map((x) => x.sheet), surveyTile: sv?.tile ?? null },
      accuracy: { stored: "LINZ stores each height to within 1 mm of the supplied value (LERC, MAX_Z_ERROR 0.001); this answer rounds to " + (heights.scale === 0.01 ? "1 cm" : "10 cm"), survey: "LINZ describes these LiDAR datasets as generally about 20 cm vertical accuracy", url: SPEC },
      heights, work: { requests: stats.requests, bytesDownloaded: stats.bytes, decodeMs: round(stats.decodeMs, 1), totalMs: Math.round(now() - t0) },
    },
    source: src(kind, { file: g.files.find((x) => x.sheet === g.sheet)?.url }), licence: licence(survey?.licensors ?? [...new Set((sv?.surveys || []).flatMap((s) => s.licensors || []))]),
    note: `Heights are LINZ's own 1 m cells, not resampled: ${KINDS[kind].what}. They are a survey from the air, not a site survey by a licensed surveyor. ${heights.stats.cellsWithoutHeight ? heights.stats.cellsWithoutHeight + " cells in the square have no height (water, or gaps in the survey) and are left empty. " : ""}Levels are in NZVD2016, which is not the same as a council's older local datum.`,
    limits: "One square of up to 321 m by 321 m per request. Only the national 1 m LiDAR model is read; land LINZ has not flown at 1 m answers unavailable.",
  };
}
export const fetchGround = (p) => readLayer("ground", p);
export const fetchSurface = (p) => readLayer("surface", p);
