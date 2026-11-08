// assembl lab · small, dependency-free readers for open map tiles, used by the point-cloud bake scripts (bake-auckland.mjs).
// Fetches with curl (it honours HTTPS_PROXY and decompresses), caches every tile on disk, decodes 8-bit PNGs with node:zlib and
// Mapbox Vector Tiles (protobuf) by hand, so a bake needs nothing beyond Node 18+ and curl.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

// ------------------------------------------------------------------------------------------------ Web Mercator
export const lon2x = (lon, z) => ((lon + 180) / 360) * 2 ** z;
export const lat2y = (lat, z) => { const r = (lat * Math.PI) / 180; return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z; };
export const x2lon = (x, z) => (x / 2 ** z) * 360 - 180;
export const y2lat = (y, z) => { const n = Math.PI - (2 * Math.PI * y) / 2 ** z; return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))); };

// ------------------------------------------------------------------------------------------------ fetch with a disk cache
export function fetchCached(url, cacheDir) {
  const file = path.join(cacheDir, url.replace(/^https?:\/\//, "").replace(/[^a-z0-9._-]+/gi, "_"));
  if (fs.existsSync(file) && fs.statSync(file).size > 0) return fs.readFileSync(file);
  fs.mkdirSync(cacheDir, { recursive: true });
  let buf;
  for (let attempt = 0; attempt < 4; attempt++) {
    try { buf = execFileSync("curl", ["-sSfL", "--compressed", "--max-time", "60", url], { maxBuffer: 64 << 20 }); break; }
    catch (e) { if (attempt === 3) throw new Error(`fetch failed: ${url}: ${e.message}`); }
  }
  fs.writeFileSync(file, buf); return buf;
}

// ------------------------------------------------------------------------------------------------ PNG (8-bit grey, RGB, RGBA, palette)
export function decodePNG(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error("not a PNG");
  let p = 8, w = 0, h = 0, depth = 0, ctype = 0, inter = 0, pal = null; const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString("ascii", p + 4, p + 8), d = buf.subarray(p + 8, p + 8 + len); p += 12 + len;
    if (type === "IHDR") { w = d.readUInt32BE(0); h = d.readUInt32BE(4); depth = d[8]; ctype = d[9]; inter = d[12]; }
    else if (type === "PLTE") pal = d; else if (type === "IDAT") idat.push(d); else if (type === "IEND") break;
  }
  if (depth !== 8 || inter) throw new Error(`unsupported PNG (depth ${depth}, interlace ${inter})`);
  const ch = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ctype], raw = zlib.inflateSync(Buffer.concat(idat)), stride = w * ch, out = Buffer.alloc(w * h * ch);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)), row = out.subarray(y * stride, (y + 1) * stride), up = y ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let i = 0; i < stride; i++) {
      const a = i >= ch ? row[i - ch] : 0, b = up ? up[i] : 0, c = up && i >= ch ? up[i - ch] : 0; let v = src[i];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      row[i] = v & 255;
    }
  }
  // always hand back RGB
  const rgb = Buffer.alloc(w * h * 3);
  for (let i = 0; i < w * h; i++) {
    if (ctype === 3) { const k = out[i] * 3; rgb[i * 3] = pal[k]; rgb[i * 3 + 1] = pal[k + 1]; rgb[i * 3 + 2] = pal[k + 2]; }
    else if (ch <= 2) rgb[i * 3] = rgb[i * 3 + 1] = rgb[i * 3 + 2] = out[i * ch];
    else { rgb[i * 3] = out[i * ch]; rgb[i * 3 + 1] = out[i * ch + 1]; rgb[i * 3 + 2] = out[i * ch + 2]; }
  }
  return { w, h, rgb };
}

// ------------------------------------------------------------------------------------------------ Mapbox Vector Tile (spec 2.1)
function reader(buf) {
  let p = 0;
  const varint = () => { let r = 0, s = 0, b; do { b = buf[p++]; r += (b & 0x7f) * 2 ** s; s += 7; } while (b & 0x80); return r; };
  return {
    get pos() { return p; }, end: () => p >= buf.length, varint,
    field() { const k = varint(); return [Math.floor(k / 8), k & 7]; },
    bytes() { const n = varint(), b = buf.subarray(p, p + n); p += n; return b; },
    skip(wt) { if (wt === 0) varint(); else if (wt === 1) p += 8; else if (wt === 2) p += varint(); else if (wt === 5) p += 4; else throw new Error("wire type " + wt); },
    double() { const v = buf.readDoubleLE(p); p += 8; return v; }, float() { const v = buf.readFloatLE(p); p += 4; return v; },
  };
}
const packed = (b) => { const r = reader(b), out = []; while (!r.end()) out.push(r.varint()); return out; };
const zz = (n) => (n % 2 ? -(n + 1) / 2 : n / 2);
function value(b) {
  const r = reader(b); let v = null;
  while (!r.end()) { const [f, wt] = r.field(); if (f === 1) v = r.bytes().toString("utf8"); else if (f === 2) v = r.float(); else if (f === 3) v = r.double(); else if (f === 4 || f === 5) v = r.varint(); else if (f === 6) v = zz(r.varint()); else if (f === 7) v = !!r.varint(); else r.skip(wt); }
  return v;
}
// geometry → rings / lines: arrays of [x, y] in tile units (0..extent)
function geometry(cmds) {
  const parts = []; let x = 0, y = 0, cur = null;
  for (let i = 0; i < cmds.length;) {
    const c = cmds[i++], id = c & 7, n = c >> 3;
    if (id === 7) { if (cur && cur.length) cur.push(cur[0]); continue; }
    for (let k = 0; k < n; k++) { x += zz(cmds[i++]); y += zz(cmds[i++]); if (id === 1) { cur = []; parts.push(cur); } cur.push([x, y]); }
  }
  return parts;
}
// decode the named layers of a tile: { layer: { extent, features: [{ type, props, parts }] } }
export function decodeMVT(buf, want) {
  const r = reader(buf), out = {};
  while (!r.end()) {
    const [f, wt] = r.field(); if (f !== 3) { r.skip(wt); continue; }
    const lr = reader(r.bytes()); let name = "", extent = 4096; const feats = [], keys = [], vals = [];
    while (!lr.end()) { const [lf, lwt] = lr.field(); if (lf === 1) name = lr.bytes().toString("utf8"); else if (lf === 2) feats.push(lr.bytes()); else if (lf === 3) keys.push(lr.bytes().toString("utf8")); else if (lf === 4) vals.push(value(lr.bytes())); else if (lf === 5) extent = lr.varint(); else lr.skip(lwt); }
    if (want && !want.includes(name)) continue;
    out[name] = { extent, features: feats.map((fb) => {
      const fr = reader(fb); let type = 0, tags = [], geom = [];
      while (!fr.end()) { const [ff, fwt] = fr.field(); if (ff === 2) tags = packed(fr.bytes()); else if (ff === 3) type = fr.varint(); else if (ff === 4) geom = packed(fr.bytes()); else fr.skip(fwt); }
      const props = {}; for (let i = 0; i < tags.length; i += 2) props[keys[tags[i]]] = vals[tags[i + 1]];
      return { type, props, parts: geometry(geom) };
    }) };
  }
  return out;
}
