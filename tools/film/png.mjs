// A small PNG writer and reader for film frames and passes (8 bits; grey, RGB or RGBA; filter "up", zlib level 3 on
// write; any filter on read, no interlacing): fast enough to keep up with rendering, and no dependencies.
import zlib from 'node:zlib';

const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc32 = (buf) => { let c = -1; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]), crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
const COLOR_TYPE = { 1: 0, 2: 4, 3: 2, 4: 6 };
/** px: Uint8Array of w*h*ch (ch 1 grey, 3 RGB, 4 RGBA; default 3) → PNG file bytes */
export function encodePNG(px, w, h, ch = 3) {
  const stride = w * ch, raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    const o = y * (stride + 1); raw[o] = y ? 2 : 0; // "up" filter after the first row
    for (let x = 0; x < stride; x++) raw[o + 1 + x] = y ? (px[y * stride + x] - px[(y - 1) * stride + x]) & 255 : px[x];
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = COLOR_TYPE[ch]; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 3 })), chunk('IEND', Buffer.alloc(0))]);
}

/** PNG file bytes → { w, h, ch, px } (8-bit grey, grey+alpha, RGB, RGBA or palette; not interlaced) */
export function decodePNG(buf) {
  const b = Buffer.from(buf);
  if (b.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
  let i = 8, w = 0, h = 0, depth = 0, ct = 0, inter = 0, pal = null, trns = null;
  const idat = [];
  while (i < b.length) {
    const len = b.readUInt32BE(i), type = b.toString('ascii', i + 4, i + 8), d = b.subarray(i + 8, i + 8 + len);
    if (type === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); depth = d[8]; ct = d[9]; inter = d[12]; }
    else if (type === 'PLTE') pal = d;
    else if (type === 'tRNS') trns = d;
    else if (type === 'IDAT') idat.push(d);
    else if (type === 'IEND') break;
    i += 12 + len;
  }
  if (depth !== 8 || inter) throw new Error(`PNG: only 8-bit, non-interlaced (got depth ${depth}, interlace ${inter})`);
  const src = { 0: 1, 4: 2, 2: 3, 6: 4, 3: 1 }[ct];
  if (!src) throw new Error('PNG: colour type ' + ct);
  const raw = zlib.inflateSync(Buffer.concat(idat)), stride = w * src, out = new Uint8Array(stride * h);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], o = y * (stride + 1) + 1, r = y * stride, p = (y - 1) * stride;
    for (let x = 0; x < stride; x++) {
      const v = raw[o + x], a = x >= src ? out[r + x - src] : 0, up = y ? out[p + x] : 0, c = y && x >= src ? out[p + x - src] : 0;
      let pr;
      if (f === 0) pr = 0; else if (f === 1) pr = a; else if (f === 2) pr = up; else if (f === 3) pr = (a + up) >> 1;
      else { const q = a + up - c, pa = Math.abs(q - a), pb = Math.abs(q - up), pc = Math.abs(q - c); pr = pa <= pb && pa <= pc ? a : pb <= pc ? up : c; }
      out[r + x] = (v + pr) & 255;
    }
  }
  if (ct === 3) { // palette → RGB(A)
    const ch = trns ? 4 : 3, px = new Uint8Array(w * h * ch);
    for (let k = 0; k < w * h; k++) { const e = out[k]; px[k * ch] = pal[e * 3]; px[k * ch + 1] = pal[e * 3 + 1]; px[k * ch + 2] = pal[e * 3 + 2]; if (ch === 4) px[k * ch + 3] = e < trns.length ? trns[e] : 255; }
    return { w, h, ch, px };
  }
  return { w, h, ch: src, px: out };
}
