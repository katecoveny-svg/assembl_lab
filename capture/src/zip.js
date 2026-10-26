// assembl capture · minimal ZIP writer and reader (no dependencies; browsers and Node 18+).
// Writer: STORE only (JPEGs do not compress further; JSON is small) with CRC-32, plus ZIP64 when an
// archive passes 4 GB or 65,535 entries is not needed for phone captures and is not supported.
// Reader: STORE and DEFLATE (via DecompressionStream "deflate-raw"), so archives made by Finder,
// Windows Explorer or `zip` also load.

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(bytes, crc = 0) {
  let c = ~crc >>> 0;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return ~c >>> 0;
}

const enc = new TextEncoder();
const dec = new TextDecoder();

function dosTime(d) {
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { time, date };
}

/** Streaming-friendly writer: add entries, then `toBlob()` (browser) or `toUint8Array()`. */
export class ZipWriter {
  constructor() { this.entries = []; this.parts = []; this.offset = 0; }

  /**
   * data: Uint8Array | string, or a Blob together with its precomputed CRC-32 and size
   * ({ blob, crc, size }) so large photo sets are written without copying them into memory again.
   */
  add(name, data, when = new Date()) {
    const isBlob = data && typeof data === "object" && data.blob;
    const bytes = isBlob ? data.blob : typeof data === "string" ? enc.encode(data) : data;
    const length = isBlob ? data.size : bytes.length;
    if (this.offset + length > 0xfffffff0) throw new Error("Capture too large for a ZIP without ZIP64 (over 4 GB)");
    const nameBytes = enc.encode(name);
    const crc = isBlob ? data.crc >>> 0 : crc32(bytes);
    const { time, date } = dosTime(when);
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true);
    h.setUint16(4, 20, true);        // version needed
    h.setUint16(6, 0x0800, true);    // UTF-8 names
    h.setUint16(8, 0, true);         // STORE
    h.setUint16(10, time, true);
    h.setUint16(12, date, true);
    h.setUint32(14, crc, true);
    h.setUint32(18, length, true);
    h.setUint32(22, length, true);
    h.setUint16(26, nameBytes.length, true);
    h.setUint16(28, 0, true);
    this.entries.push({ nameBytes, crc, size: length, offset: this.offset, time, date });
    this.parts.push(new Uint8Array(h.buffer), nameBytes, bytes);
    this.offset += 30 + nameBytes.length + length;
    this.hasBlobs ||= !!isBlob;
    return this;
  }

  _central() {
    const out = [];
    let size = 0;
    for (const e of this.entries) {
      const c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true);
      c.setUint16(4, 20, true);
      c.setUint16(6, 20, true);
      c.setUint16(8, 0x0800, true);
      c.setUint16(10, 0, true);
      c.setUint16(12, e.time, true);
      c.setUint16(14, e.date, true);
      c.setUint32(16, e.crc, true);
      c.setUint32(20, e.size, true);
      c.setUint32(24, e.size, true);
      c.setUint16(28, e.nameBytes.length, true);
      c.setUint32(42, e.offset, true);
      out.push(new Uint8Array(c.buffer), e.nameBytes);
      size += 46 + e.nameBytes.length;
    }
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true);
    end.setUint16(8, this.entries.length, true);
    end.setUint16(10, this.entries.length, true);
    end.setUint32(12, size, true);
    end.setUint32(16, this.offset, true);
    out.push(new Uint8Array(end.buffer));
    return out;
  }

  toBlob(type = "application/zip") { return new Blob([...this.parts, ...this._central()], { type }); }

  toUint8Array() {
    if (this.hasBlobs) throw new Error("This archive holds Blobs: use toBlob()");
    const all = [...this.parts, ...this._central()];
    const n = all.reduce((s, p) => s + p.length, 0);
    const out = new Uint8Array(n);
    let o = 0;
    for (const p of all) { out.set(p, o); o += p.length; }
    return out;
  }

  get byteLength() { return this.offset; }
}

async function inflateRaw(bytes) {
  const ds = new DecompressionStream("deflate-raw");
  const stream = new Blob([bytes]).stream().pipeThrough(ds);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/**
 * Read a ZIP. `src`: Blob | ArrayBuffer | Uint8Array. Returns entries with lazy `bytes()`, `text()`, `json()`.
 * Directory entries and macOS resource forks (__MACOSX/, ._*) are skipped.
 */
export async function readZip(src) {
  const buf = src instanceof Uint8Array ? src : new Uint8Array(src instanceof ArrayBuffer ? src : await src.arrayBuffer());
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("Not a ZIP file (no end-of-directory record)");
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  if (p === 0xffffffff) throw new Error("ZIP64 archives are not supported");
  const entries = [];
  for (let i = 0; i < count; i++) {
    if (dv.getUint32(p, true) !== 0x02014b50) throw new Error("Corrupt ZIP central directory");
    const method = dv.getUint16(p + 10, true);
    const crc = dv.getUint32(p + 16, true);
    const csize = dv.getUint32(p + 20, true);
    const usize = dv.getUint32(p + 24, true);
    const nlen = dv.getUint16(p + 28, true);
    const xlen = dv.getUint16(p + 30, true);
    const clen = dv.getUint16(p + 32, true);
    const lho = dv.getUint32(p + 42, true);
    const name = dec.decode(buf.subarray(p + 46, p + 46 + nlen));
    p += 46 + nlen + xlen + clen;
    if (name.endsWith("/") || name.startsWith("__MACOSX/") || name.split("/").pop().startsWith("._")) continue;
    const lnl = dv.getUint16(lho + 26, true);
    const lxl = dv.getUint16(lho + 28, true);
    const start = lho + 30 + lnl + lxl;
    const raw = buf.subarray(start, start + csize);
    let cached = null;
    const bytes = async () => {
      if (cached) return cached;
      if (method === 0) cached = raw;
      else if (method === 8) cached = await inflateRaw(raw);
      else throw new Error(`ZIP entry ${name}: compression method ${method} not supported`);
      if (cached.length !== usize) throw new Error(`ZIP entry ${name}: size mismatch`);
      return cached;
    };
    entries.push({ name, size: usize, crc, method, bytes, text: async () => dec.decode(await bytes()), json: async () => JSON.parse(dec.decode(await bytes())) });
  }
  return entries;
}

/** Strip a single top-level folder that wraps everything (as Finder's "Compress" does). */
export function commonRoot(entries) {
  const names = entries.map((e) => e.name);
  const first = names[0]?.split("/")[0];
  if (first && names.every((n) => n.startsWith(first + "/"))) return first + "/";
  return "";
}
