// assembl lab · a small LERC2 decoder, written for LINZ's elevation GeoTIFFs (float32 tiles, "LERC_VERSION 2.4", no extra
// deflate or zstd). Web APIs only (DataView, typed arrays): it runs unchanged on Cloudflare and in Node.
//
// It follows Esri's published format (https://github.com/Esri/lerc, Lerc2.cpp and BitStuffer2.cpp, Apache-2.0): a 66-byte
// header, an optional run-length coded validity mask, then the image as micro-blocks, each either raw, constant, or
// "bit-stuffed" integers that turn back into heights as  offset + n × 2 × maxZError.
// Covered: LERC 2.3 and 2.4, one value per pixel, every numeric type. Not covered (it throws, it never guesses): other
// versions, more than one value per pixel, and the Huffman mode that LERC only uses for 8-bit data.
//
// decodeLerc2(bytes, { window:[c0,r0,c1,r1] }) reads only the micro-blocks that touch the window and steps over the rest by
// their byte length, so a part of a tile costs a part of the time. Pixels outside the window, and masked pixels, are NaN.

const DT_SIZE = [1, 1, 2, 2, 4, 4, 4, 8]; // char, byte, short, ushort, int, uint, float, double

export function lercHeader(u8, at = 0) {
  const dv = new DataView(u8.buffer, u8.byteOffset + at, u8.byteLength - at);
  if (dv.byteLength < 66) throw new Error("lerc: blob too short");
  for (let i = 0; i < 6; i++) if (dv.getUint8(i) !== "Lerc2 ".charCodeAt(i)) throw new Error("lerc: not a Lerc2 blob");
  const version = dv.getInt32(6, true);
  if (version !== 3 && version !== 4) throw new Error(`lerc: version 2.${version} is not supported (2.3 and 2.4 are)`);
  let p = 10;
  const checksum = version >= 3 ? dv.getUint32(p, true) : null; if (version >= 3) p += 4;
  const height = dv.getInt32(p, true), width = dv.getInt32(p + 4, true); p += 8;
  const depth = version >= 4 ? dv.getInt32(p, true) : 1; if (version >= 4) p += 4;
  const numValid = dv.getInt32(p, true), microBlock = dv.getInt32(p + 4, true), blobSize = dv.getInt32(p + 8, true), dataType = dv.getInt32(p + 12, true); p += 16;
  const maxZError = dv.getFloat64(p, true), zMin = dv.getFloat64(p + 8, true), zMax = dv.getFloat64(p + 16, true); p += 24;
  if (!(width > 0 && height > 0 && width * height <= 1 << 26) || microBlock < 1 || dataType < 0 || dataType > 7 || blobSize > dv.byteLength) throw new Error("lerc: header out of range");
  if (depth !== 1) throw new Error("lerc: more than one value per pixel is not supported");
  return { version, checksum, width, height, depth, numValid, microBlock, blobSize, dataType, maxZError, zMin, zMax, headerBytes: p };
}

// Fletcher-32 as LERC computes it, over everything after the checksum field
export function lercChecksum(u8, at, blobSize) {
  let s1 = 0xffff, s2 = 0xffff, i = at + 14, words = (blobSize - 14) >> 1;
  while (words) {
    let t = words >= 359 ? 359 : words; words -= t;
    do { s1 += (u8[i] << 8) + u8[i + 1]; s2 += s1; i += 2; } while (--t);
    s1 = (s1 & 0xffff) + (s1 >>> 16); s2 = (s2 & 0xffff) + (s2 >>> 16);
  }
  if ((blobSize - 14) & 1) { s1 += u8[i] << 8; s2 += s1; }
  s1 = (s1 & 0xffff) + (s1 >>> 16); s2 = (s2 & 0xffff) + (s2 >>> 16);
  return ((s2 << 16) | s1) >>> 0;
}

const stuffedBytes = (n, bits) => { const total = n * bits, tail = total & 31, tb = (tail + 7) >> 3; return ((total + 31) >>> 5) * 4 - (tb > 0 ? 4 - tb : 0); };

export function decodeLerc2(u8, opts = {}) {
  const at = opts.at || 0, H = lercHeader(u8, at), { width, height, version } = H;
  if (opts.verify && version >= 3 && lercChecksum(u8, at, H.blobSize) !== H.checksum) throw new Error("lerc: checksum does not match");
  const [c0, r0, c1, r1] = opts.window ? [Math.max(0, opts.window[0]), Math.max(0, opts.window[1]), Math.min(width, opts.window[2]), Math.min(height, opts.window[3])] : [0, 0, width, height];
  const ow = Math.max(0, c1 - c0), oh = Math.max(0, r1 - r0), out = new Float32Array(ow * oh).fill(NaN);
  const res = { ...H, window: [c0, r0, c1, r1], outWidth: ow, outHeight: oh, data: out, blocksRead: 0, blocksSkipped: 0 };
  const dv = new DataView(u8.buffer, u8.byteOffset + at, H.blobSize);
  let p = H.headerBytes;

  // ---- validity mask: nothing stored when every pixel is valid, or none is
  const maskBytes = dv.getInt32(p, true); p += 4;
  let mask = null;
  if (H.numValid === 0) return res;
  if (H.numValid !== width * height) {
    if (maskBytes <= 0) throw new Error("lerc: a mask is needed and none is stored");
    mask = new Uint8Array((width * height + 7) >> 3);
    let q = p, o = 0;
    for (;;) { // run-length coded bytes: a count, then that many bytes, or one byte repeated; -32768 ends it
      const cnt = dv.getInt16(q, true); q += 2;
      if (cnt === -32768) break;
      if (cnt > 0) { for (let k = 0; k < cnt; k++) mask[o++] = dv.getUint8(q++); } else { const v = dv.getUint8(q++); for (let k = 0; k < -cnt; k++) mask[o++] = v; }
      if (o > mask.length) throw new Error("lerc: mask overruns");
    }
  }
  p += Math.max(0, maskBytes);
  const valid = mask ? (k) => (mask[k >> 3] & (128 >> (k & 7))) !== 0 : null;
  const put = (col, row, v) => { if (col >= c0 && col < c1 && row >= r0 && row < r1) out[(row - r0) * ow + (col - c0)] = v; };
  const fillConst = (v) => { for (let r = r0; r < r1; r++) for (let c = c0; c < c1; c++) if (!valid || valid(r * width + c)) out[(r - r0) * ow + (c - c0)] = v; };

  if (H.zMin === H.zMax) { fillConst(H.zMin); return res; }
  const size = DT_SIZE[H.dataType];
  const readT = (q, dt) => (dt === 0 ? dv.getInt8(q) : dt === 1 ? dv.getUint8(q) : dt === 2 ? dv.getInt16(q, true) : dt === 3 ? dv.getUint16(q, true) : dt === 4 ? dv.getInt32(q, true) : dt === 5 ? dv.getUint32(q, true) : dt === 6 ? dv.getFloat32(q, true) : dv.getFloat64(q, true));
  if (version >= 4) { // the range of each value in a pixel: one pair here
    const lo = readT(p, H.dataType), hi = readT(p + size, H.dataType); p += 2 * size;
    if (lo === hi) { fillConst(lo); return res; }
  }
  const oneSweep = dv.getUint8(p++);
  if (oneSweep) { // every valid pixel written out raw, row by row
    for (let r = 0; r < height; r++) for (let c = 0; c < width; c++) if (!valid || valid(r * width + c)) { put(c, r, readT(p, H.dataType)); p += size; }
    return res;
  }
  if (H.dataType <= 1 && H.maxZError === 0.5) throw new Error("lerc: 8-bit Huffman mode is not supported"); // would start with a mode byte
  const usedType = (tc) => { const dt = H.dataType; return dt === 2 || dt === 4 ? dt - tc : dt === 3 || dt === 5 ? dt - 2 * tc : dt === 6 ? (tc === 0 ? 6 : tc === 1 ? 2 : 1) : dt === 7 ? (tc === 0 ? 7 : dt - 2 * tc + 1) : dt; };
  const mb = H.microBlock, scale = 2 * H.maxZError, zMax = H.zMax;
  const buf = new Uint32Array(mb * mb), lut = new Uint32Array(256), vals = new Float64Array(mb * mb);
  // LERC 2.3 and later pack the integers lowest bit first, in little-endian 32-bit words with the unused tail bytes left off
  const B = u8.subarray(at, at + H.blobSize); // plain byte indexing: the inner loops below are where the time goes
  const unstuff = (q, n, bits, dst) => {
    if (bits <= 24) { let acc = 0, have = 0; const m = (1 << bits) - 1; for (let i = 0; i < n; i++) { while (have < bits) { acc |= B[q++] << have; have += 8; } dst[i] = acc & m; acc >>>= bits; have -= bits; } }
    else { let bitPos = 0; for (let i = 0; i < n; i++) { let v = 0; for (let b = 0; b < bits; b++, bitPos++) if (B[q + (bitPos >> 3)] & (1 << (bitPos & 7))) v += 2 ** b; dst[i] = v; } }
  };
  const tilesV = Math.ceil(height / mb), tilesH = Math.ceil(width / mb);
  for (let ti = 0; ti < tilesV; ti++) {
    const i0 = ti * mb, i1 = Math.min(height, i0 + mb);
    if (i0 >= r1) break; // nothing below the window is wanted
    for (let tj = 0; tj < tilesH; tj++) {
      const j0 = tj * mb, j1 = Math.min(width, j0 + mb), wanted = i1 > r0 && j1 > c0 && j0 < c1;
      const flag = B[p++], tc = flag >> 6, kind = flag & 3;
      if (((flag >> 2) & 15) !== ((j0 >> 3) & 15)) throw new Error("lerc: block check failed");
      let n = (i1 - i0) * (j1 - j0);
      if (valid) { n = 0; for (let r = i0; r < i1; r++) for (let c = j0; c < j1; c++) if (valid(r * width + c)) n++; }
      if (wanted) res.blocksRead++; else res.blocksSkipped++;
      // 1. the block's values, one per valid pixel, in reading order
      if (kind === 2) { if (wanted) vals.fill(0, 0, n); }
      else if (kind === 0) { if (wanted) for (let k = 0; k < n; k++) vals[k] = readT(p + k * size, H.dataType); p += n * size; }
      else {
        const dt = usedType(tc), offset = dt === 1 ? B[p] : readT(p, dt); p += DT_SIZE[dt];
        if (kind === 3) { if (wanted) vals.fill(offset, 0, n); }
        else { // bit-stuffed integers, perhaps through a small look-up table
          const b0 = B[p++], nb = b0 >> 6 === 0 ? 4 : 3 - (b0 >> 6), doLut = (b0 & 32) !== 0, bits = b0 & 31;
          const count = nb === 1 ? B[p] : nb === 2 ? B[p] | (B[p + 1] << 8) : dv.getUint32(p, true); p += nb;
          if (count !== n) throw new Error("lerc: block count does not match");
          if (!doLut) {
            if (bits > 0) { if (wanted) unstuff(p, count, bits, buf); p += stuffedBytes(count, bits); } else if (wanted) buf.fill(0, 0, count);
          } else {
            if (bits === 0) throw new Error("lerc: bad look-up table");
            const nLut = B[p++] - 1; let lutBits = 0; while (nLut >> lutBits) lutBits++;
            if (lutBits === 0) throw new Error("lerc: bad look-up table");
            const q = p; p += stuffedBytes(nLut, bits); const q2 = p; p += stuffedBytes(count, lutBits);
            if (wanted) { lut[0] = 0; unstuff(q, nLut, bits, lut.subarray(1)); unstuff(q2, count, lutBits, buf); for (let k = 0; k < count; k++) buf[k] = lut[buf[k]]; }
          }
          if (wanted) for (let k = 0; k < n; k++) { const z = offset + buf[k] * scale; vals[k] = z < zMax ? z : zMax; }
        }
      }
      if (p > H.blobSize) throw new Error("lerc: block runs past the end of the blob");
      if (!wanted) continue;
      // 2. put them where they belong in the window
      let k = 0;
      for (let r = i0; r < i1; r++) {
        const inRow = r >= r0 && r < r1, base = (r - r0) * ow - c0;
        if (!valid) { if (inRow) { for (let c = j0 > c0 ? j0 : c0, e = j1 < c1 ? j1 : c1; c < e; c++) out[base + c] = vals[k + c - j0]; } k += j1 - j0; }
        else for (let c = j0; c < j1; c++) if (valid(r * width + c)) { if (inRow && c >= c0 && c < c1) out[base + c] = vals[k]; k++; }
      }
    }
  }
  return res;
}
