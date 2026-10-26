// assembl capture · SPZ v3 (Niantic's open splat format, MIT) writer and reader, in plain JS.
// Follows nianticlabs/spz src/cc/load-spz.cc (packGaussians / serializePackedGaussians): a 16-byte header
// (magic "NGSP", version, count, SH degree, fractional bits, flags), then positions (24-bit fixed point,
// 12 fractional bits), alphas, colours, scales, rotations (v3 "smallest three", 4 bytes), SH, all gzipped.
// Coordinates are written as given (no axis conversion), like splat-transform does for prepare_splat.py,
// so the file is in the same frame as the PLY. gzip uses the platform CompressionStream.

import { Splats } from "./ply.js";

const MAGIC = 0x5053474e;
const COLOR_SCALE = 0.15;
const SQRT1_2 = Math.SQRT1_2;
const DIM = [0, 3, 8, 15];

const toU8 = (x) => Math.max(0, Math.min(255, Math.round(x)));
const quantizeSH = (x, bucket) => { let q = Math.round(x * 128) + 128; q = Math.floor((q + bucket / 2) / bucket) * bucket; return Math.max(0, Math.min(255, q)); };

async function gzip(bytes) {
  const s = new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip"));
  return new Uint8Array(await new Response(s).arrayBuffer());
}
async function gunzip(bytes) {
  const s = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Uint8Array(await new Response(s).arrayBuffer());
}

/** Pack splats (see ply.js) into the uncompressed SPZ v3 byte stream. */
export function packSpz(s, { sh1Bits = 5, shRestBits = 4, antialiased = false } = {}) {
  const n = s.n, deg = s.shDegree, dim = DIM[deg];
  const size = 16 + n * (9 + 1 + 3 + 3 + 4 + dim * 3);
  const out = new Uint8Array(size);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, MAGIC, true); dv.setUint32(4, 3, true); dv.setUint32(8, n, true);
  out[12] = deg; out[13] = 12; out[14] = antialiased ? 1 : 0; out[15] = 0;
  let o = 16;
  const fix = 1 << 12;
  for (let i = 0; i < n * 3; i++) {
    const v = Math.round(s.pos[i] * fix);
    out[o++] = v & 0xff; out[o++] = (v >> 8) & 0xff; out[o++] = (v >> 16) & 0xff;
  }
  for (let i = 0; i < n; i++) out[o++] = toU8((1 / (1 + Math.exp(-s.opacity[i]))) * 255);
  for (let i = 0; i < n * 3; i++) out[o++] = toU8(s.fdc[i] * (COLOR_SCALE * 255) + 0.5 * 255);
  for (let i = 0; i < n * 3; i++) out[o++] = toU8((s.scale[i] + 10) * 16);
  for (let i = 0; i < n; i++) {
    // ply rot is (w, x, y, z); spz works in (x, y, z, w)
    const w = s.rot[i * 4], x = s.rot[i * 4 + 1], y = s.rot[i * 4 + 2], z = s.rot[i * 4 + 3];
    const nn = Math.hypot(x, y, z, w) || 1;
    const q = [x / nn, y / nn, z / nn, w / nn];
    let L = 0;
    for (let k = 1; k < 4; k++) if (Math.abs(q[k]) > Math.abs(q[L])) L = k;
    const negate = q[L] < 0 ? 1 : 0;
    let comp = L;
    for (let k = 0; k < 4; k++) {
      if (k === L) continue;
      const negbit = (q[k] < 0 ? 1 : 0) ^ negate;
      const mag = Math.floor(511 * (Math.abs(q[k]) / SQRT1_2) + 0.5);
      comp = ((comp << 10) | (negbit << 9) | mag) >>> 0;
    }
    out[o++] = comp & 0xff; out[o++] = (comp >>> 8) & 0xff; out[o++] = (comp >>> 16) & 0xff; out[o++] = (comp >>> 24) & 0xff;
  }
  if (dim) {
    const b1 = 1 << (8 - sh1Bits), bR = 1 << (8 - shRestBits), K = s.K;
    for (let i = 0; i < n; i++) {
      for (let k = 0; k < dim; k++) for (let c = 0; c < 3; c++) {
        out[o++] = quantizeSH(s.frest[i * 3 * K + c * K + k], k < 3 ? b1 : bR);
      }
    }
  }
  return out;
}

/** Gzipped SPZ v3 bytes. */
export async function encodeSpz(s, opts) { return gzip(packSpz(s, opts)); }

/** Decode SPZ v2/v3 (gzip). For tests and for loading phone-app exports into prepare. */
export async function decodeSpz(bytes) {
  const raw = await gunzip(bytes);
  const dv = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  if (dv.getUint32(0, true) !== MAGIC) throw new Error("Not an SPZ file");
  const version = dv.getUint32(4, true), n = dv.getUint32(8, true), deg = raw[12], fb = raw[13];
  if (version < 2 || version > 3) throw new Error(`SPZ version ${version} not supported here (v4 uses zstd)`);
  const dim = DIM[deg];
  const s = new Splats(n, dim);
  let o = 16;
  const sc = 1 / (1 << fb);
  for (let i = 0; i < n * 3; i++) {
    let v = raw[o] | (raw[o + 1] << 8) | (raw[o + 2] << 16);
    if (v & 0x800000) v |= ~0xffffff;
    s.pos[i] = v * sc; o += 3;
  }
  for (let i = 0; i < n; i++) { const a = Math.min(0.9999, Math.max(1e-4, raw[o++] / 255)); s.opacity[i] = Math.log(a / (1 - a)); }
  for (let i = 0; i < n * 3; i++) s.fdc[i] = (raw[o++] / 255 - 0.5) / COLOR_SCALE;
  for (let i = 0; i < n * 3; i++) s.scale[i] = raw[o++] / 16 - 10;
  for (let i = 0; i < n; i++) {
    const q = [0, 0, 0, 0];
    if (version >= 3) {
      let comp = (raw[o] | (raw[o + 1] << 8) | (raw[o + 2] << 16) | (raw[o + 3] << 24)) >>> 0; o += 4;
      const L = comp >>> 30;
      let sum = 0;
      for (let k = 3; k >= 0; k--) {
        if (k === L) continue;
        const mag = comp & 511, neg = (comp >>> 9) & 1;
        comp >>>= 10;
        q[k] = SQRT1_2 * (mag / 511) * (neg ? -1 : 1);
        sum += q[k] * q[k];
      }
      q[L] = Math.sqrt(Math.max(0, 1 - sum));
    } else {
      for (let k = 0; k < 3; k++) q[k] = raw[o++] / 127.5 - 1;
      q[3] = Math.sqrt(Math.max(0, 1 - q[0] * q[0] - q[1] * q[1] - q[2] * q[2]));
    }
    s.rot[i * 4] = q[3]; s.rot[i * 4 + 1] = q[0]; s.rot[i * 4 + 2] = q[1]; s.rot[i * 4 + 3] = q[2];
  }
  for (let i = 0; i < n; i++) for (let k = 0; k < dim; k++) for (let c = 0; c < 3; c++) s.frest[i * 3 * dim + c * dim + k] = (raw[o++] - 128) / 128;
  return s;
}
