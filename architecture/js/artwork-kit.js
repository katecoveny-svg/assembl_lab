// A practice's own artwork for its workspace: the parts that need no page. Reading an artwork kit (.zip or loose
// images), picking out its logos, drawings and patterns by the kit's folder and file names, the sizes each is kept at,
// the record kept in practice.extra.artwork, which drawing a project shows, and the place this browser keeps artwork
// when nothing is shared. artwork.js draws it and converts the images; cloud.js keeps it in the practice's records.
//
// The kit layout this reads (any practice's kit made to it):
//   logos/<name>-<white|black|blue>.png                 the logo on transparent, one file an ink
//   drawings-transparent/<drawing>-<blue|white|black>.png  each drawing on transparent, one file an ink
//   patterns/<pattern>-<colourway>.jpg                  full-bleed patterns and panoramas
// Anything else in the kit (social posts, slides, banners) is left out. Loose images dropped without folders are
// read by their names: "...logo...-<ink>" is a logo, a .jpg is a pattern, any other image a drawing.
//
// Nothing here writes to the console or sends anything anywhere.

export class KitError extends Error { constructor(message) { super(message); this.name = 'KitError'; } }

// ---- reading a .zip ----------------------------------------------------------------------------------------------------
// Only the parts of the zip that are asked for are read (Blob.slice), so a large kit is never held whole. Stored and
// deflated entries are read; deflate is undone by the browser's own DecompressionStream. ZIP64 is read. Encrypted
// entries are refused. Each entry's CRC-32 is checked, so a damaged kit says so instead of showing a broken picture.
const SIG = { eocd: 0x06054b50, z64loc: 0x07064b50, z64eocd: 0x06064b50, cen: 0x02014b50, loc: 0x04034b50 };
/** the most one entry may hold once unpacked: no image in a kit is near this */
export const ENTRY_LIMIT = 64 * 1024 * 1024;

const sizeOf = (src) => (src instanceof Uint8Array ? src.byteLength : src.size);
async function slice(src, start, end) {
  if (src instanceof Uint8Array) return src.subarray(start, end);
  return new Uint8Array(await src.slice(start, end).arrayBuffer());
}
const view = (u8) => new DataView(u8.buffer, u8.byteOffset, u8.byteLength);

let CRC_TABLE = null;
export function crc32(bytes) {
  if (!CRC_TABLE) {
    CRC_TABLE = new Uint32Array(256);
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; CRC_TABLE[n] = c >>> 0; }
  }
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

async function inflateRaw(bytes) {
  if (typeof DecompressionStream !== 'function') throw new KitError('This browser cannot open a .zip. Unzip the kit and drop its images instead.');
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** true when the bytes start like a zip ("PK\3\4", or an empty zip's "PK\5\6") */
export async function looksLikeZip(src) {
  if (!src || sizeOf(src) < 4) return false;
  const h = await slice(src, 0, 4);
  return h[0] === 0x50 && h[1] === 0x4b && (h[2] === 3 || h[2] === 5) && (h[3] === 4 || h[3] === 6);
}

/**
 * The entries of a zip, without reading their contents.
 *   src   a Blob or File (read in parts) or a Uint8Array
 * Returns { entries: [{ path, size, method, csize, offset, crc, flags }], read(entry) -> Promise<Uint8Array> }.
 */
export async function readZip(src) {
  const size = sizeOf(src);
  if (size < 22) throw new KitError('That file is not a .zip, or it is damaged.');
  const tailLen = Math.min(size, 65557), tail = await slice(src, size - tailLen, size), dv = view(tail);
  let at = -1;
  for (let i = tail.length - 22; i >= 0; i--) if (dv.getUint32(i, true) === SIG.eocd) { at = i; break; }
  if (at < 0) throw new KitError('That file is not a .zip, or it is damaged.');
  let count = dv.getUint16(at + 10, true), cdSize = dv.getUint32(at + 12, true), cdOff = dv.getUint32(at + 16, true);
  if (count === 0xffff || cdSize === 0xffffffff || cdOff === 0xffffffff) {
    const li = at - 20;
    if (li < 0 || dv.getUint32(li, true) !== SIG.z64loc) throw new KitError('That .zip could not be read.');
    const z64 = Number(dv.getBigUint64(li + 8, true)), rec = view(await slice(src, z64, z64 + 56));
    if (rec.getUint32(0, true) !== SIG.z64eocd) throw new KitError('That .zip could not be read.');
    count = Number(rec.getBigUint64(32, true)); cdSize = Number(rec.getBigUint64(40, true)); cdOff = Number(rec.getBigUint64(48, true));
  }
  if (cdOff + cdSize > size || count > 100000) throw new KitError('That .zip is damaged.');
  const cd = await slice(src, cdOff, cdOff + cdSize), cv = view(cd), utf8 = new TextDecoder('utf-8'), entries = [];
  for (let p = 0, n = 0; n < count; n++) {
    if (p + 46 > cd.length || cv.getUint32(p, true) !== SIG.cen) throw new KitError('That .zip is damaged.');
    const flags = cv.getUint16(p + 8, true), method = cv.getUint16(p + 10, true), crc = cv.getUint32(p + 16, true);
    let csize = cv.getUint32(p + 20, true), usize = cv.getUint32(p + 24, true);
    const nameLen = cv.getUint16(p + 28, true), extraLen = cv.getUint16(p + 30, true), commentLen = cv.getUint16(p + 32, true);
    let offset = cv.getUint32(p + 42, true);
    const path = utf8.decode(cd.subarray(p + 46, p + 46 + nameLen));
    for (let e = p + 46 + nameLen, end = e + extraLen; e + 4 <= end;) { // the ZIP64 extra field: only the values the header left at the maximum
      const id = cv.getUint16(e, true), len = cv.getUint16(e + 2, true);
      if (id === 0x0001) {
        let q = e + 4;
        if (usize === 0xffffffff) { usize = Number(cv.getBigUint64(q, true)); q += 8; }
        if (csize === 0xffffffff) { csize = Number(cv.getBigUint64(q, true)); q += 8; }
        if (offset === 0xffffffff) { offset = Number(cv.getBigUint64(q, true)); }
      }
      e += 4 + len;
    }
    p += 46 + nameLen + extraLen + commentLen;
    if (path.endsWith('/')) continue; // a folder
    entries.push({ path, size: usize, method, csize, offset, crc, flags });
  }
  async function read(entry) {
    if (entry.flags & 1) throw new KitError(`“${entry.path}” is encrypted, so it was left out.`);
    if (entry.size > ENTRY_LIMIT) throw new KitError(`“${entry.path}” is too large for an artwork image.`);
    const head = view(await slice(src, entry.offset, entry.offset + 30));
    if (head.getUint32(0, true) !== SIG.loc) throw new KitError('That .zip is damaged.');
    const start = entry.offset + 30 + head.getUint16(26, true) + head.getUint16(28, true);
    const raw = await slice(src, start, start + entry.csize);
    let out;
    if (entry.method === 0) out = raw;
    else if (entry.method === 8) out = await inflateRaw(raw);
    else throw new KitError(`“${entry.path}” is packed in a way this page cannot open.`);
    if (out.byteLength !== entry.size || crc32(out) !== entry.crc) throw new KitError(`“${entry.path}” is damaged in the .zip.`);
    return out;
  }
  return { entries, read };
}

// ---- picking the kit's parts by folder and file name --------------------------------------------------------------------
export const KINDS = ['logo', 'drawing', 'pattern'];
export const INKS = ['blue', 'white', 'black'];
const IMAGE = /\.(png|jpe?g|webp)$/i;
const SLUG = /[^a-z0-9]+/g;
const slug = (s) => String(s ?? '').toLowerCase().replace(SLUG, '-').replace(/^-+|-+$/g, '').slice(0, 40);
export const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' };

/**
 * What one file in a kit is, from its path: { kind, name, ink } for a logo or drawing, { kind, name, colourway } for a
 * pattern, or null for anything the workspace does not use. Paths can be nested ("kit/logos/x-white.png").
 */
export function classify(path, { loose = true } = {}) {
  const p = String(path ?? '').replace(/\\/g, '/');
  const parts = p.split('/').filter(Boolean), file = parts.at(-1) ?? '';
  if (!IMAGE.test(file) || parts.some((x) => x.startsWith('.') || x === '__MACOSX')) return null;
  const ext = file.match(IMAGE)[1].toLowerCase(), base = file.slice(0, -(ext.length + 1)).toLowerCase(), folder = (parts.at(-2) ?? '').toLowerCase();
  const inked = (b) => { const m = b.match(/^(.+?)[-_ ](blue|white|black)$/); return m ? { name: slug(m[1]), ink: m[2] } : { name: slug(b), ink: 'any' }; };
  const coloured = (b) => { const m = b.match(/^(.+?)[-_ ]([a-z0-9]+)$/); return m ? { name: slug(m[1]), colourway: slug(m[2]) } : { name: slug(b), colourway: 'plain' }; };
  if (/^logos?$/.test(folder)) return { kind: 'logo', ...inked(base), ext };
  if (/^drawings?([-_ ]?transparent)?$/.test(folder)) return { kind: 'drawing', ...inked(base), ext };
  if (/^patterns?$/.test(folder)) return { kind: 'pattern', ...coloured(base), ext };
  if (!loose) return null; // a kit with the folders above: anything outside them (social posts, slides, banners) is not used
  if (/logo/.test(base)) return { kind: 'logo', ...inked(base), ext };
  if (ext === 'jpg' || ext === 'jpeg') return { kind: 'pattern', ...coloured(base), ext };
  return { kind: 'drawing', ...inked(base), ext };
}

/** how many a workspace keeps, at most: logo inks, drawings and patterns (each drawing in up to four inks, each pattern in up to six colourways) */
export const CAPS = { logo: 4, drawing: 16, pattern: 6, colourways: 6 };
/** the most one source image may be before it is converted */
export const SOURCE_LIMIT = 40 * 1024 * 1024;
const INK_RANK = { blue: 0, white: 1, black: 2, any: 3 };

/**
 * Pick a kit's parts from a list of { path, size }. One of each logo ink, drawing and ink, pattern and colourway.
 * A kit with logos/, drawings-transparent/ or patterns/ folders is read by those folders only; loose images by their names.
 * Returns { items: [{ ...entry, kind, name, ink | colourway, ext }], counts: { logo, drawing, pattern }, ignored, over }.
 *   ignored  files the workspace does not use     over  files left out because a kind was full or a file too big
 */
export function pickKit(list) {
  const seen = new Set(), items = [], where = (e) => e?.path ?? e?.name;
  const loose = !(list ?? []).some((e) => classify(where(e), { loose: false }));
  let ignored = 0, over = 0;
  for (const entry of list ?? []) {
    const c = classify(where(entry), { loose });
    if (!c) { ignored++; continue; }
    if (Number(entry.size) > SOURCE_LIMIT) { over++; continue; }
    const key = c.kind === 'pattern' ? `${c.kind}:${c.name}:${c.colourway}` : c.kind === 'logo' ? `logo:${c.ink}` : `${c.kind}:${c.name}:${c.ink}`;
    if (seen.has(key)) { ignored++; continue; }
    seen.add(key);
    items.push({ ...entry, ...c });
  }
  const order = (a, b) => KINDS.indexOf(a.kind) - KINDS.indexOf(b.kind) || a.name.localeCompare(b.name) || (INK_RANK[a.ink] ?? 0) - (INK_RANK[b.ink] ?? 0) || String(a.colourway ?? '').localeCompare(String(b.colourway ?? ''));
  items.sort(order);
  // a cap counts drawings and patterns by name, so a drawing never arrives with only some of its inks
  const kept = [], names = { drawing: new Map(), pattern: new Map() }, counts = { logo: 0, drawing: 0, pattern: 0 };
  for (const it of items) {
    if (it.kind === 'logo') { if (counts.logo >= CAPS.logo) { over++; continue; } counts.logo++; kept.push(it); continue; }
    const seenNames = names[it.kind], had = seenNames.get(it.name) ?? 0;
    if ((!had && seenNames.size >= CAPS[it.kind]) || (it.kind === 'pattern' && had >= CAPS.colourways)) { over++; continue; }
    seenNames.set(it.name, had + 1); counts[it.kind]++; kept.push(it);
  }
  return { items: kept, counts, names: { drawing: names.drawing.size, pattern: names.pattern.size }, ignored, over };
}

// ---- sizes ------------------------------------------------------------------------------------------------------------
/** each kind's longest side and the size each file should come under (bytes) */
export const LIMITS = { logo: { side: 600, bytes: 60 * 1024 }, drawing: { side: 1600, bytes: 250 * 1024 }, pattern: { side: 2400, bytes: 250 * 1024 } };

/** the size to draw an image at: its longest side no more than `side`, never made bigger, proportions kept */
export function fitSize(w, h, side) {
  const W = Math.max(1, Math.round(Number(w) || 0)), H = Math.max(1, Math.round(Number(h) || 0)), s = Math.min(1, side / Math.max(W, H));
  return { w: Math.max(1, Math.round(W * s)), h: Math.max(1, Math.round(H * s)) };
}

/**
 * Encode an image to come under a byte size: quality steps down first, then the image is made smaller.
 *   encode(w, h, quality) -> Promise<Blob-like with .size>
 * Returns { blob, w, h, q, over } where over is true when even the last try was above the size (it is kept: it is the smallest).
 */
export async function encodeWithin(encode, w, h, { bytes, qualities = [0.86, 0.78, 0.7, 0.62], shrink = 0.84, minSide = 480, rounds = 3 } = {}) {
  let cw = w, ch = h, best = null;
  for (let round = 0; round <= rounds; round++) {
    for (const q of qualities) {
      const blob = await encode(cw, ch, q);
      if (!best || blob.size < best.blob.size) best = { blob, w: cw, h: ch, q };
      if (blob.size <= bytes) return { blob, w: cw, h: ch, q, over: false };
    }
    if (Math.max(cw, ch) * shrink < minSide) break;
    cw = Math.max(1, Math.round(cw * shrink)); ch = Math.max(1, Math.round(ch * shrink));
  }
  return { ...best, over: true };
}


// ---- what the pixels say (worked out on a small copy of each image) ------------------------------------------------------
/**
 * Does a transparent drawing fill its frame to every edge (a panorama, a pattern) rather than stand on its own?
 * rgba is a small copy of the image (Uint8ClampedArray, 4 bytes a pixel). True when line work reaches all four edges.
 */
export function bleedOf(rgba, w, h) {
  const band = Math.max(1, Math.round(Math.min(w, h) * 0.04)), alpha = (x, y) => rgba[(y * w + x) * 4 + 3];
  const share = (x0, x1, y0, y1) => { let on = 0, n = 0; for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { n++; if (alpha(x, y) > 24) on++; } return n ? on / n : 0; };
  return Math.min(share(0, w, 0, band), share(0, w, h - band, h), share(0, band, 0, h), share(w - band, w, 0, h)) > 0.12;
}

const hex = (c) => `#${c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
/**
 * A transparent drawing's ink: { single, colour }. single is true when the line work is all one colour (most line
 * drawings: the colour is the same and only the transparency changes), so the drawing can be kept as a mask and
 * drawn in any ink. colour is that ink, as #rrggbb.
 */
export function inkOf(rgba) {
  let n = 0;
  const sum = [0, 0, 0], sq = [0, 0, 0];
  for (let i = 0; i < rgba.length; i += 4) {
    if (rgba[i + 3] < 128) continue;
    n++;
    for (let k = 0; k < 3; k++) { sum[k] += rgba[i + k]; sq[k] += rgba[i + k] * rgba[i + k]; }
  }
  if (!n) return { single: false, colour: '#000000' };
  const mean = sum.map((v) => v / n), spread = Math.max(...sq.map((v, k) => Math.sqrt(Math.max(0, v / n - mean[k] * mean[k]))));
  return { single: spread < 40, colour: hex(mean) };
}

/** The ground of an opaque pattern: 'dark', 'light' or 'colour' (its commonest colour); and whether its lines are in colour ('colour') or not ('mono'). */
export function groundOf(rgba, w, h) {
  const lum = (r, g, b) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255, chroma = (r, g, b) => (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
  const boxes = new Map(), n = w * h;
  for (let i = 0; i < n * 4; i += 4) { const k = (rgba[i] >> 5) * 64 + (rgba[i + 1] >> 5) * 8 + (rgba[i + 2] >> 5); const b = boxes.get(k) ?? [0, 0, 0, 0]; b[0]++; b[1] += rgba[i]; b[2] += rgba[i + 1]; b[3] += rgba[i + 2]; boxes.set(k, b); }
  const top = [...boxes.values()].sort((a, b) => b[0] - a[0])[0], g = [top[1] / top[0], top[2] / top[0], top[3] / top[0]];
  const gl = lum(...g), gc = chroma(...g), ground = gc > 0.25 ? 'colour' : gl < 0.35 ? 'dark' : 'light';
  let lined = 0, inColour = 0;
  for (let i = 0; i < n * 4; i += 4) { const r = rgba[i], gg = rgba[i + 1], b = rgba[i + 2]; if (Math.abs(lum(r, gg, b) - gl) + Math.abs(chroma(r, gg, b) - gc) > 0.18) { lined++; if (chroma(r, gg, b) > 0.25) inColour++; } }
  return { ground, tone: lined && inColour / lined > 0.4 ? 'colour' : 'mono' };
}

/** A drawing kept as a mask: its transparency becomes grey (opaque line = white, clear = black). Changes rgba in place. */
export function toMask(rgba) {
  for (let i = 0; i < rgba.length; i += 4) { const a = rgba[i + 3]; rgba[i] = a; rgba[i + 1] = a; rgba[i + 2] = a; rgba[i + 3] = 255; }
  return rgba;
}

// ---- the record kept in practice.extra.artwork (or in this browser) --------------------------------------------------------
//   { v: 1,
//     logo:     { <ink>: { path, w, h } }                                   one file an ink, on transparent
//     drawings: [{ path, name, mode, inks: { <ink>: '#rrggbb' }, w, h, bleed }]
//               mode 'mask': the file is the drawing's line work as grey, drawn in whichever of its inks suits the look
//                            (one file serves every ink: a transparent WebP of a line drawing is three to four times larger)
//               mode 'image': a drawing in more than one colour, kept as it is, on transparent
//     patterns: [{ path, name, colourway, ground, tone, w, h }]           full-bleed, opaque
//     files, bytes, updated_at }
// Paths are where each file is kept: "<practice id>/artwork/<kind>-<n>-<set>.webp" in the shared records, and
// "artwork/<kind>-<n>-<set>.webp" in this browser. <set> is new each time artwork is put in, so new files go up beside
// the old ones and the old ones are removed only once the record names the new.
const PATH = /^(?:[0-9a-f-]{36}\/)?artwork\/(logo|drawing|pattern)-\d{1,3}-[a-z0-9]{4,24}\.(webp|png|jpg)$/;
const EXT = { 'image/webp': 'webp', 'image/png': 'png', 'image/jpeg': 'jpg' };
const COLOUR = /^#[0-9a-f]{6}$/;
const INK_KEYS = [...INKS, 'any'];
export const newSet = (now = Date.now(), rand = Math.random) => `${Math.floor(now).toString(36)}${Math.floor(rand() * 36 ** 4).toString(36).padStart(4, '0')}`;
const cleanInks = (v) => Object.fromEntries(Object.entries(v && typeof v === 'object' ? v : {}).filter(([k, c]) => INK_KEYS.includes(k) && COLOUR.test(String(c).toLowerCase())).map(([k, c]) => [k, String(c).toLowerCase()]));
const dimsOf = (x) => ({ w: Math.max(0, Math.round(Number(x?.w) || 0)), h: Math.max(0, Math.round(Number(x?.h) || 0)) });
const groundWord = (g) => (['dark', 'light', 'colour'].includes(g) ? g : 'light');

/**
 * The record and the files to keep, from converted items:
 *   { kind: 'logo', ink, blob, type, w, h }   { kind: 'drawing', name, mode, inks, bleed, blob, type, w, h }
 *   { kind: 'pattern', name, colourway, ground, tone, blob, type, w, h }
 * prefix is "<practice id>/artwork/" or "artwork/".
 */
export function buildRecord(items, { prefix, set, now = new Date().toISOString() }) {
  if (!/^(?:[0-9a-f-]{36}\/)?artwork\/$/.test(prefix ?? '')) throw new KitError('Artwork is kept under the practice’s own artwork folder.');
  if (!/^[a-z0-9]{4,24}$/.test(set ?? '')) throw new KitError('The artwork needs a set name.');
  const record = { v: 1, logo: {}, drawings: [], patterns: [], files: 0, bytes: 0, updated_at: now }, files = [], n = { logo: 0, drawing: 0, pattern: 0 };
  for (const it of items ?? []) {
    if (!KINDS.includes(it?.kind) || !it.blob) continue;
    const ext = EXT[it.type] ?? 'webp', path = `${prefix}${it.kind}-${++n[it.kind]}-${set}.${ext}`, size = Number(it.blob.size) || 0;
    files.push({ path, blob: it.blob, type: it.type || 'image/webp', size });
    record.files++; record.bytes += size;
    if (it.kind === 'logo') record.logo[INK_KEYS.includes(it.ink) ? it.ink : 'any'] = { path, ...dimsOf(it) };
    else if (it.kind === 'drawing') record.drawings.push({ path, name: slug(it.name) || 'drawing', mode: it.mode === 'image' ? 'image' : 'mask', inks: cleanInks(it.inks), ...dimsOf(it), bleed: !!it.bleed });
    else record.patterns.push({ path, name: slug(it.name) || 'pattern', colourway: slug(it.colourway) || 'plain', ground: groundWord(it.ground), tone: it.tone === 'colour' ? 'colour' : 'mono', ...dimsOf(it) });
  }
  return { record, files };
}

/** A record read back from storage, with anything that is not as written left out. null when there is no artwork. */
export function cleanRecord(raw, prefix) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const ok = (p) => typeof p === 'string' && PATH.test(p) && p.startsWith(prefix ?? '') && !p.includes('..');
  const logo = {};
  for (const [ink, v] of Object.entries(raw.logo && typeof raw.logo === 'object' ? raw.logo : {})) if (INK_KEYS.includes(ink) && ok(v?.path)) logo[ink] = { path: v.path, ...dimsOf(v) };
  const drawings = (Array.isArray(raw.drawings) ? raw.drawings : []).filter((d) => ok(d?.path))
    .map((d) => ({ path: d.path, name: slug(d.name) || 'drawing', mode: d.mode === 'image' ? 'image' : 'mask', inks: cleanInks(d.inks), ...dimsOf(d), bleed: d.bleed === true }))
    .filter((d) => d.mode === 'image' || Object.keys(d.inks).length); // a mask with no ink cannot be drawn
  const patterns = (Array.isArray(raw.patterns) ? raw.patterns : []).filter((d) => ok(d?.path))
    .map((d) => ({ path: d.path, name: slug(d.name) || 'pattern', colourway: slug(d.colourway) || 'plain', ground: groundWord(d.ground), tone: d.tone === 'colour' ? 'colour' : 'mono', ...dimsOf(d) }));
  if (!Object.keys(logo).length && !drawings.length && !patterns.length) return null;
  const at = typeof raw.updated_at === 'string' && !Number.isNaN(new Date(raw.updated_at).getTime()) ? raw.updated_at : '';
  return { v: 1, logo, drawings, patterns, files: Number(raw.files) || 0, bytes: Number(raw.bytes) || 0, updated_at: at };
}

/** every file a record names */
export const recordPaths = (r) => (r ? [...Object.values(r.logo ?? {}).map((x) => x.path), ...(r.drawings ?? []).map((x) => x.path), ...(r.patterns ?? []).map((x) => x.path)] : []);

// ---- choosing what to show ------------------------------------------------------------------------------------------------
/** which ink suits each look: blue or white on the sketch look's black; black or blue on the default look's warm white */
export const INK_ORDER = {
  sketch: { line: ['blue', 'white', 'any', 'black'], logo: ['white', 'blue', 'any', 'black'] },
  assembl: { line: ['black', 'blue', 'any', 'white'], logo: ['black', 'blue', 'any', 'white'] },
};
const looks = (theme) => INK_ORDER[theme] ?? INK_ORDER.assembl;

/** a steady number for a text: the same project id always gives the same number */
export function steady(text) {
  let h = 0x811c9dc5;
  const s = String(text ?? '');
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15;
  return h >>> 0;
}

/** a drawing with the ink that suits the look: { ...drawing, ink, colour } (an 'image' drawing keeps its own colours) */
export function inked(d, theme = 'assembl') {
  if (!d) return null;
  if (d.mode === 'image') return { ...d, ink: 'own', colour: '' };
  for (const ink of looks(theme).line) if (d.inks[ink]) return { ...d, ink, colour: d.inks[ink] };
  const [ink, colour] = Object.entries(d.inks)[0] ?? [];
  return ink ? { ...d, ink, colour } : null;
}
const PATTERNISH = /toile|pattern|repeat|tile/;

/** the drawings that stand on their own (not a full-bleed panorama or pattern), for project tiles and empty screens */
export function standalone(record) {
  const all = record?.drawings ?? [], alone = all.filter((d) => !d.bleed && !PATTERNISH.test(d.name));
  if (alone.length) return alone;
  const notPattern = all.filter((d) => !PATTERNISH.test(d.name));
  return notPattern.length ? notPattern : all;
}

/** The drawing a project shows while it has no model: chosen from its id, so it keeps the same one. null when there are none. */
export function drawingFor(record, id, theme = 'assembl') {
  const list = standalone(record);
  return list.length ? inked(list[steady(id) % list.length], theme) : null;
}

/** the logo in the ink that suits the look, or null */
export function logoFor(record, theme = 'assembl') {
  const l = record?.logo ?? {};
  for (const ink of looks(theme).logo) if (l[ink]) return { ...l[ink], ink };
  return null;
}

const WIDE = /pano|landscape|wide|banner|horizon/;
/**
 * The wide picture for the projects screen's band, suited to the look: a pattern on the look's own ground first (a
 * panorama before any other), then a full-bleed drawing, then the widest drawing. Returns { kind, ...entry } or null.
 */
export function heroFor(record, theme = 'assembl') {
  const ground = theme === 'sketch' ? 'dark' : 'light', tone = theme === 'sketch' ? ['colour', 'mono'] : ['mono', 'colour'];
  const rank = (name) => (WIDE.test(name) ? 0 : PATTERNISH.test(name) ? 2 : 1);
  const pats = (record?.patterns ?? []).filter((p) => p.ground === ground && p.w >= p.h * 1.4)
    .sort((a, b) => rank(a.name) - rank(b.name) || tone.indexOf(a.tone) - tone.indexOf(b.tone) || b.w / b.h - a.w / a.h);
  if (pats.length) return { kind: 'pattern', ...pats[0] };
  const wide = (record?.drawings ?? []).filter((d) => d.w >= d.h * 1.4);
  const pick = wide.filter((d) => d.bleed).sort((a, b) => rank(a.name) - rank(b.name) || b.w / b.h - a.w / a.h)[0] ?? wide.sort((a, b) => b.w / b.h - a.w / a.h)[0];
  const d = inked(pick, theme);
  return d ? { kind: 'drawing', ...d } : null;
}

/** "1 logo, 7 drawings, 10 patterns": a record's or a picked kit's parts in words */
export function partsText({ logos = 0, drawings = 0, patterns = 0 }) {
  const p = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
  return [logos && p(logos, 'logo'), drawings && p(drawings, 'drawing'), patterns && p(patterns, 'pattern')].filter(Boolean).join(', ') || 'nothing the workspace uses';
}
export const recordParts = (r) => ({ logos: Object.keys(r?.logo ?? {}).length ? 1 : 0, drawings: (r?.drawings ?? []).length, patterns: (r?.patterns ?? []).length });

// ---- where this browser keeps its artwork, when nothing is shared ----------------------------------------------------------
/** an in-memory key-value place, for tests and for browsers with no IndexedDB */
export function memoryKv() {
  const m = new Map();
  return { m, get: async (k) => m.get(k) ?? null, set: async (k, v) => void m.set(k, v), del: async (k) => void m.delete(k), keys: async () => [...m.keys()] };
}
/** IndexedDB as a key-value place, or null when this browser has none */
export function idbKv(name = 'assembl.architecture.artwork.v1') {
  const idb = globalThis.indexedDB;
  if (!idb) return null;
  let opening = null;
  const open = () => (opening ??= new Promise((resolve, reject) => {
    const rq = idb.open(name, 1);
    rq.onupgradeneeded = () => { if (!rq.result.objectStoreNames.contains('kv')) rq.result.createObjectStore('kv'); };
    rq.onsuccess = () => resolve(rq.result);
    rq.onerror = () => { opening = null; reject(rq.error ?? new Error('IndexedDB would not open')); };
    rq.onblocked = () => { opening = null; reject(new Error('IndexedDB is blocked by another tab')); };
  }));
  const run = async (mode, fn) => { const db = await open(); return new Promise((resolve, reject) => { const t = db.transaction('kv', mode), s = t.objectStore('kv'); let out; const rq = fn(s); if (rq) rq.onsuccess = () => { out = rq.result; }; t.oncomplete = () => resolve(out ?? null); t.onabort = t.onerror = () => reject(t.error ?? new Error('The browser stopped the write')); }); };
  return { get: (k) => run('readonly', (s) => s.get(k)), set: (k, v) => run('readwrite', (s) => s.put(v, k)), del: (k) => run('readwrite', (s) => s.delete(k)), keys: () => run('readonly', (s) => s.getAllKeys()) };
}

/**
 * This browser's artwork: the same calls as the practice's (cloud.js createArtworkPlace), kept in one browser.
 *   read() -> record | null     write(record | null)     upload(path, blob)     urls(paths) -> { urls: Map, until }     remove(paths)
 */
export function createBrowserArtworkPlace(kv) {
  const prefix = 'artwork/';
  return {
    shared: false, prefix, canChange: true,
    async read() { try { return cleanRecord(await kv.get('record'), prefix); } catch { return null; } },
    async write(record) { if (record) await kv.set('record', JSON.parse(JSON.stringify(record))); else await kv.del('record'); },
    async upload(path, blob) {
      if (!String(path).startsWith(prefix) || !PATH.test(path)) throw new KitError('Artwork is kept under this browser’s own artwork folder.');
      try { await kv.set(path, blob); } catch (e) { throw new KitError(e?.name === 'QuotaExceededError' ? 'This browser has no room left for the artwork. Nothing was changed.' : 'This browser would not keep the artwork. Nothing was changed.'); }
    },
    async urls(paths) {
      const urls = new Map();
      for (const p of paths ?? []) { const b = await kv.get(p).catch(() => null); if (b) urls.set(p, URL.createObjectURL(b)); }
      return { urls, until: Infinity, local: true };
    },
    async remove(paths) { for (const p of paths ?? []) if (String(p).startsWith(prefix)) await kv.del(p); },
  };
}
