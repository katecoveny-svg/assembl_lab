// assembl lab · read part of a Cloud-Optimised GeoTIFF over HTTP range requests, without downloading the file.
// Written for LINZ's open elevation and imagery TIFFs (classic TIFF, little-endian, 512-pixel tiles, every directory at the
// front of the file). Web APIs only, so it runs unchanged on Cloudflare and in Node. No key is needed for the LINZ buckets.
//
//   const cog = await openCog(url, { fetch, stats })      one request for the front of the file
//   cog.levels[0] = { width, height, tileWidth, tileHeight, compression, ... }   full size first, then the smaller overviews
//   cog.origin, cog.pixel                                  where the top-left corner is, and the size of a pixel, in map units
//   await cog.tileRanges(level, [[tx, ty], ...])           where each tile's bytes are (null for a tile LINZ left empty)
//   await cog.tileBytes(range)                             those bytes
// What a tile holds (LERC heights, a WebP picture) is for the caller to decode; this file only finds the bytes.
import { UA, TIMEOUT_MS } from "./util.js";

const HEAD_BYTES = 65536; // LINZ's largest sheets keep their directories and tile index within the first 40 KB or so
const TYPE_SIZE = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 6: 1, 7: 1, 8: 2, 9: 4, 10: 8, 11: 4, 12: 8 };
export const COMPRESSION = { 1: "none", 5: "lzw", 7: "jpeg", 8: "deflate", 32946: "deflate", 34887: "lerc", 50000: "zstd", 50001: "webp" };

export class NotFound extends Error { constructor(m) { super(m); this.name = "NotFound"; this.notFound = true; } }

// One range request. 404 or 403 from the bucket means "no such file": the caller decides what that means.
// With { suffix: n } the last n bytes of the file are asked for instead (start and end are ignored).
export async function fetchRange(url, start, end, { fetch: f = fetch, stats, ms = TIMEOUT_MS, suffix } = {}) {
  const c = new AbortController(), t = setTimeout(() => c.abort(), ms), want = suffix || end - start + 1;
  const t0 = Date.now(), row = stats?.log ? { file: String(url).replace(/^https:\/\/[^/]+\//, ""), range: suffix ? `-${suffix}` : `${start}-${end}`, startedMs: t0 - (stats.t0 || t0) } : null;
  if (row) stats.log.push(row);
  try {
    const r = await f(url, { signal: c.signal, headers: { "user-agent": UA, range: suffix ? `bytes=-${suffix}` : `bytes=${start}-${end}` } });
    if (row) { row.status = r.status; row.headersMs = Date.now() - t0; row.contentLength = r.headers.get("content-length"); row.contentRange = r.headers.get("content-range"); row.encoding = r.headers.get("content-encoding"); }
    if (r.status === 404 || r.status === 403) throw new NotFound(`HTTP ${r.status} for ${url}`);
    if (r.status !== 206 && r.status !== 200) throw new Error(`HTTP ${r.status} from ${new URL(url).host}`);
    // a 200 means the range was not honoured and the whole file is on offer: never read a body far bigger than was asked for
    const len = Number(r.headers.get("content-length"));
    if (r.status === 200 && isFinite(len) && len > want + 65536) { try { await r.body?.cancel(); } catch (e) { /* nothing to cancel */ } throw new Error(`range not honoured: ${len} bytes offered for a ${want}-byte range of ${String(url).split("/").pop()}`); }
    let b = new Uint8Array(await r.arrayBuffer());
    if (r.status === 200 && !suffix && b.length > end - start + 1) b = b.subarray(start, end + 1); // a small file sent whole
    if (r.status === 200 && suffix && b.length > suffix) b = b.subarray(b.length - suffix);
    if (stats) { stats.requests++; stats.bytes += b.length; }
    if (row) { row.bytes = b.length; row.totalMs = Date.now() - t0; }
    return b;
  } catch (e) { if (row) { row.error = String(e?.message || e).slice(0, 120); row.totalMs = Date.now() - t0; } throw e; } finally { clearTimeout(t); }
}

export async function openCog(url, opts = {}) {
  let head = await fetchRange(url, 0, (opts.headBytes || HEAD_BYTES) - 1, opts);
  let dv = new DataView(head.buffer, head.byteOffset, head.byteLength);
  if (head.length < 8 || dv.getUint16(0, true) !== 0x4949) throw new Error("tiff: not a little-endian TIFF");
  const magic = dv.getUint16(2, true);
  if (magic === 43) throw new Error("tiff: BigTIFF is not supported");
  if (magic !== 42) throw new Error("tiff: not a TIFF");
  const need = async (to) => { // make sure bytes [0, to) are in hand
    if (to <= head.length) return;
    if (to > 4 << 20) throw new Error("tiff: the directories reach further into the file than this reader allows");
    const more = await fetchRange(url, head.length, to - 1, opts), all = new Uint8Array(head.length + more.length);
    all.set(head); all.set(more, head.length); head = all; dv = new DataView(head.buffer, head.byteOffset, head.byteLength);
  };
  const levels = [];
  let geo = {}, ifd = dv.getUint32(4, true);
  for (let guard = 0; ifd && guard < 24; guard++) {
    await need(ifd + 2); const n = dv.getUint16(ifd, true); await need(ifd + 2 + n * 12 + 4);
    const tag = {};
    for (let i = 0; i < n; i++) {
      const p = ifd + 2 + i * 12, id = dv.getUint16(p, true), type = dv.getUint16(p + 2, true), count = dv.getUint32(p + 4, true), size = (TYPE_SIZE[type] || 1) * count;
      tag[id] = { type, count, at: size <= 4 ? p + 8 : dv.getUint32(p + 8, true), size };
    }
    const num = async (id, i = 0) => { const t = tag[id]; if (!t) return undefined; const q = t.at + i * TYPE_SIZE[t.type]; await need(q + TYPE_SIZE[t.type]); return t.type === 3 ? dv.getUint16(q, true) : t.type === 4 ? dv.getUint32(q, true) : t.type === 12 ? dv.getFloat64(q, true) : t.type === 11 ? dv.getFloat32(q, true) : dv.getUint8(q); };
    const text = async (id) => { const t = tag[id]; if (!t) return undefined; await need(t.at + t.size); return new TextDecoder().decode(head.subarray(t.at, t.at + t.size)).replace(/\0+$/, ""); };
    const L = { width: await num(256), height: await num(257), tileWidth: await num(322), tileHeight: await num(323), samples: (await num(277)) ?? 1, bits: (await num(258)) ?? 8, sampleFormat: (await num(339)) ?? 1,
      compressionCode: (await num(259)) ?? 1, subfile: (await num(254)) ?? 0, offsets: tag[324], counts: tag[325] };
    L.compression = COMPRESSION[L.compressionCode] || `code ${L.compressionCode}`;
    if (tag[50674]) L.lerc = { version: await num(50674, 0), extra: await num(50674, 1) }; // extra: 0 none, 1 deflate, 2 zstd
    if (!L.tileWidth || !L.offsets || !L.counts) throw new Error("tiff: not a tiled TIFF");
    L.across = Math.ceil(L.width / L.tileWidth); L.down = Math.ceil(L.height / L.tileHeight);
    if (!levels.length) { // the georeference, nodata and metadata live with the full-size image
      if (tag[33550] && tag[33922]) geo = { pixel: [await num(33550, 0), await num(33550, 1)], tie: [await num(33922, 0), await num(33922, 1), await num(33922, 3), await num(33922, 4)] };
      if (tag[34735]) { const k = []; for (let i = 0; i < tag[34735].count; i++) k.push(await num(34735, i)); geo.keys = k; }
      geo.nodata = tag[42113] ? Number(await text(42113)) : null;
      geo.metadata = tag[42112] ? await text(42112) : "";
    }
    if (!(L.subfile & 4)) levels.push(L); // bit 4 marks a transparency mask, which is not an image level
    ifd = dv.getUint32(ifd + 2 + n * 12, true);
  }
  if (!levels.length) throw new Error("tiff: no image in the file");
  levels.sort((a, b) => b.width - a.width);
  const full = levels[0];
  for (const L of levels) L.factor = full.width / L.width;
  // GeoKeys: 3072 is the projected CRS (2193 for NZTM2000), 4096 would be a vertical CRS; 1025 is 1 for "pixel is area"
  const key = (id) => { const k = geo.keys || []; for (let i = 4; i + 3 < k.length; i += 4) if (k[i] === id && k[i + 1] === 0) return k[i + 3]; return null; };
  const cog = {
    url, levels, nodata: geo.nodata, metadata: geo.metadata, epsg: key(3072), verticalEpsg: key(4096), pixelIsArea: key(1025) !== 2,
    pixel: geo.pixel || null, origin: geo.pixel ? [geo.tie[2] - geo.tie[0] * geo.pixel[0], geo.tie[3] + geo.tie[1] * geo.pixel[1]] : null,
    headBytes: () => head.length,
    // byte ranges of tiles at one level; a tile LINZ left out (SPARSE_OK) has length 0 and comes back as null
    async tileRanges(level, tiles) {
      const L = levels[level], out = [];
      const read = async (t, i) => {
        const q = t.at + i * TYPE_SIZE[t.type];
        if (q + 4 <= head.length) return t.type === 3 ? dv.getUint16(q, true) : dv.getUint32(q, true);
        const b = await fetchRange(url, q, q + TYPE_SIZE[t.type] - 1, opts); return t.type === 3 ? b[0] | (b[1] << 8) : (b[0] | (b[1] << 8) | (b[2] << 16) | (b[3] << 24)) >>> 0;
      };
      for (const [tx, ty] of tiles) {
        if (tx < 0 || ty < 0 || tx >= L.across || ty >= L.down) { out.push(null); continue; }
        const i = ty * L.across + tx, offset = await read(L.offsets, i), length = await read(L.counts, i);
        out.push(length > 0 && offset > 0 ? { tx, ty, offset, length } : null);
      }
      return out;
    },
    tileBytes: (r) => fetchRange(url, r.offset, r.offset + r.length - 1, opts),
  };
  return cog;
}
