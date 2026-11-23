// A plain .zip writer for the client download package: files are stored as they are (pictures, films, PDFs and GLBs are
// already compressed, so squeezing them again saves little and costs time). No outside library. Zip64 is not written,
// so a package stays under 4 GB (share-rules.js PACKAGE_LIMIT keeps it far below that).
//
//   zipParts([{ path, data: Uint8Array }], { now }) -> [Uint8Array, ...]   the pieces of the .zip, in order
//   zipBlob(entries, opts)                          -> Blob                 the same as one Blob (browser)
import { crc32 } from './artwork-kit.js';

const enc = new TextEncoder();

/** DOS date and time for a JavaScript date */
function dosTime(d) {
  const y = Math.max(1980, d.getFullYear());
  return { time: (d.getHours() << 11) | (d.getMinutes() << 5) | (Math.floor(d.getSeconds() / 2)), date: ((y - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate() };
}

export function zipParts(entries, { now = new Date() } = {}) {
  const { time, date } = dosTime(now);
  const parts = [], central = [];
  let offset = 0;
  const seen = new Set();
  for (const e of entries) {
    const path = String(e.path).replace(/\\/g, '/').replace(/^\/+/, '');
    if (!path || path.includes('..')) throw new Error(`A file in the package has an unsafe name: ${e.path}`);
    if (seen.has(path)) throw new Error(`Two files in the package have the same name: ${path}`);
    seen.add(path);
    const name = enc.encode(path), data = e.data instanceof Uint8Array ? e.data : new Uint8Array(e.data ?? []);
    const crc = crc32(data) >>> 0, size = data.length;
    if (offset + size > 0xfffffff0) throw new Error('The package is too big for one .zip.');
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true); local.setUint16(4, 20, true); local.setUint16(6, 0x0800, true); local.setUint16(8, 0, true);
    local.setUint16(10, time, true); local.setUint16(12, date, true); local.setUint32(14, crc, true); local.setUint32(18, size, true); local.setUint32(22, size, true);
    local.setUint16(26, name.length, true); local.setUint16(28, 0, true);
    parts.push(new Uint8Array(local.buffer), name, data);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
    c.setUint16(12, time, true); c.setUint16(14, date, true); c.setUint32(16, crc, true); c.setUint32(20, size, true); c.setUint32(24, size, true);
    c.setUint16(28, name.length, true); c.setUint16(30, 0, true); c.setUint16(32, 0, true); c.setUint16(34, 0, true); c.setUint16(36, 0, true);
    c.setUint32(38, 0, true); c.setUint32(42, offset, true);
    central.push(new Uint8Array(c.buffer), name);
    offset += 30 + name.length + size;
  }
  const cdSize = central.reduce((n, p) => n + p.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, entries.length, true); end.setUint16(10, entries.length, true);
  end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
  return [...parts, ...central, new Uint8Array(end.buffer)];
}

export const zipBlob = (entries, opts) => new Blob(zipParts(entries, opts), { type: 'application/zip' });
