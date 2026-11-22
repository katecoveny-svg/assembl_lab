// The practice's own artwork: reading a kit, picking its parts, sizes, the record in practice.extra.artwork (shared) or
// in this browser, owner-only changes, which drawing a project shows, and nothing asked of the shared records when
// signed out. The kit here is made in the test from coloured shapes: no real artwork is used or kept.
import test from 'node:test';
import assert from 'node:assert/strict';
import { deflateSync, deflateRawSync, crc32 } from 'node:zlib';
import { readFileSync } from 'node:fs';
import * as K from '../../architecture/js/artwork-kit.js';
import { createGateway, createArtworkPlace, createSwitch, ARTWORK_LINK_SECONDS } from '../../architecture/js/cloud.js';
import { mountArtwork, syncArtwork, saveArtwork, removeArtwork, importArtworkKit, artCover, artworkState, preparedSetFiles } from '../../architecture/js/artwork.js';
import { mountAccount } from '../../architecture/js/account.js';
import { createStore, memoryBackend, memoryFiles } from '../../architecture/js/store.js';
import { fakeSupabase } from './fake-supabase.mjs';

const ME = '00000000-0000-4000-8000-00000000a11c', PRACTICE = '11111111-1111-4111-8111-111111111111';
const tick = (ms = 10) => new Promise((r) => setTimeout(r, ms));

// ---- a tiny kit, made here -----------------------------------------------------------------------------------------------
/** a PNG of w x h from pixel(x, y) -> [r, g, b, a] */
function png(w, h, pixel) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) raw.set(pixel(x, y), y * (w * 4 + 1) + 1 + x * 4);
  const chunk = (type, data) => { const len = Buffer.alloc(4), crc = Buffer.alloc(4), td = Buffer.concat([Buffer.from(type), data]); len.writeUInt32BE(data.length); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
/** a .zip of [{ path, data, store? }]: deflated unless store */
function zip(files) {
  const locals = [], central = [];
  let at = 0;
  for (const f of files) {
    const name = Buffer.from(f.path), data = Buffer.from(f.data), packed = f.store ? data : deflateRawSync(data), method = f.store ? 0 : 8, crc = crc32(data);
    const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(f.flags ?? 0, 6); lh.writeUInt16LE(method, 8); lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(packed.length, 18); lh.writeUInt32LE(data.length, 22); lh.writeUInt16LE(name.length, 26);
    const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(f.flags ?? 0, 8); ch.writeUInt16LE(method, 10); ch.writeUInt32LE(f.badCrc ? (crc ^ 1) >>> 0 : crc, 16); ch.writeUInt32LE(packed.length, 20); ch.writeUInt32LE(data.length, 24); ch.writeUInt16LE(name.length, 28); ch.writeUInt32LE(at, 42);
    locals.push(lh, name, packed); central.push(ch, name);
    at += 30 + name.length + packed.length;
  }
  const cd = Buffer.concat(central), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(at, 16);
  return new Uint8Array(Buffer.concat([...locals, cd, end]));
}
const square = (rgb) => png(8, 6, (x, y) => (x > 1 && x < 6 && y > 1 && y < 5 ? [...rgb, 255] : [0, 0, 0, 0]));
const kitFiles = () => {
  const out = [{ path: 'README.txt', data: 'a kit' }, { path: 'overview.jpg', data: 'jpeg' }];
  for (const ink of ['white', 'black', 'blue']) out.push({ path: `logos/studio-logo-${ink}.png`, data: square([10, 20, 30]) });
  for (const d of ['house', 'bridge', 'panorama']) for (const ink of ['blue', 'white', 'black']) out.push({ path: `drawings-transparent/${d}-${ink}.png`, data: square([80, 118, 255]) });
  for (const p of ['panorama', 'toile']) for (const c of ['night', 'ink', 'paper', 'print', 'blue']) out.push({ path: `patterns/${p}-${c}.jpg`, data: `jpeg ${p} ${c}` });
  for (const extra of ['social-square/01-house-night.png', 'slides/night-01-title.png', 'teams-background/01.png', '__MACOSX/logos/._studio-logo-white.png', 'logos/.DS_Store']) out.push({ path: extra, data: 'x' });
  return out;
};

test('a .zip is read in parts: stored and deflated entries, folders left out, damage and encryption refused', async () => {
  const bytes = zip([{ path: 'logos/', data: '' }, { path: 'logos/a-white.png', data: square([1, 2, 3]) }, { path: 'notes.txt', data: 'kept as it is', store: true }]);
  for (const src of [bytes, new Blob([bytes])]) {
    const z = await K.readZip(src);
    assert.deepEqual(z.entries.map((e) => e.path), ['logos/a-white.png', 'notes.txt'], 'a folder entry is not an entry');
    assert.deepEqual(Buffer.from(await z.read(z.entries[0])), square([1, 2, 3]));
    assert.equal(new TextDecoder().decode(await z.read(z.entries[1])), 'kept as it is');
  }
  assert.equal(await K.looksLikeZip(bytes), true);
  assert.equal(await K.looksLikeZip(new Uint8Array(square([1, 1, 1]))), false);
  await assert.rejects(K.readZip(new Uint8Array(40)), /not a \.zip/);
  const bad = await K.readZip(zip([{ path: 'logos/a-white.png', data: square([1, 2, 3]), badCrc: true }]));
  await assert.rejects(bad.read(bad.entries[0]), /damaged/);
  const locked = await K.readZip(zip([{ path: 'logos/a-white.png', data: 'x', flags: 1 }]));
  await assert.rejects(locked.read(locked.entries[0]), /encrypted/);
});

test('the kit’s parts are picked by folder and name: logos, transparent drawings, patterns; nothing else', async () => {
  const z = await K.readZip(zip(kitFiles()));
  const got = K.pickKit(z.entries);
  assert.deepEqual(got.counts, { logo: 3, drawing: 9, pattern: 10 });
  assert.deepEqual(got.names, { drawing: 3, pattern: 2 });
  assert.equal(got.ignored, 7, 'the readme, the overview, social posts, slides, the Teams backgrounds and the system files are left out');
  assert.equal(got.over, 0);
  assert.deepEqual(got.items.filter((x) => x.kind === 'logo').map((x) => x.ink), ['blue', 'white', 'black']);
  assert.deepEqual(got.items.filter((x) => x.kind === 'drawing' && x.name === 'house').map((x) => x.ink), ['blue', 'white', 'black'], 'each drawing in its three inks, blue first');
  assert.deepEqual(K.classify('kit/patterns/panorama-night.jpg'), { kind: 'pattern', name: 'panorama', colourway: 'night', ext: 'jpg' }, 'a kit inside a top folder');
  assert.equal(K.classify('social-square/plain-01.png', { loose: false }), null);
  // loose images, no folders: read by their names
  const loose = K.pickKit([{ path: 'studio-logo-white.png', size: 9 }, { path: 'house-blue.png', size: 9 }, { path: 'house-black.png', size: 9 }, { path: 'wide-night.jpg', size: 9 }, { path: 'notes.pdf', size: 9 }]);
  assert.deepEqual(loose.counts, { logo: 1, drawing: 2, pattern: 1 });
  assert.equal(loose.ignored, 1);
  // more than a workspace keeps: whole drawings are left out, never some of a drawing's inks
  const many = Array.from({ length: 18 }, (_, i) => ['blue', 'white'].map((ink) => ({ path: `drawings-transparent/d${String(i).padStart(2, '0')}-${ink}.png`, size: 9 }))).flat();
  const capped = K.pickKit([...many, { path: 'drawings-transparent/huge-blue.png', size: K.SOURCE_LIMIT + 1 }]);
  assert.equal(capped.names.drawing, K.CAPS.drawing);
  assert.equal(capped.counts.drawing, K.CAPS.drawing * 2);
  assert.equal(capped.over, 2 * 2 + 1, 'two drawings over the cap (both inks) and one file too big');
  assert.deepEqual(K.pickKit([{ path: 'logos/a-white.png', size: 1 }, { path: 'logos/b-white.png', size: 1 }]).counts.logo, 1, 'one logo an ink');
});

test('sizes: drawings 1600, patterns 2400 and logos 600 pixels on the long side, never made bigger, about 250 KB each', async () => {
  assert.deepEqual([K.LIMITS.drawing.side, K.LIMITS.pattern.side, K.LIMITS.logo.side], [1600, 2400, 600]);
  assert.equal(K.LIMITS.drawing.bytes, 250 * 1024); assert.equal(K.LIMITS.pattern.bytes, 250 * 1024);
  assert.deepEqual(K.fitSize(2400, 900, 1600), { w: 1600, h: 600 });
  assert.deepEqual(K.fitSize(1500, 1000, 1600), { w: 1500, h: 1000 }, 'a smaller image is not enlarged');
  assert.deepEqual(K.fitSize(900, 3000, 600), { w: 180, h: 600 });
  // a stand-in encoder: bytes grow with the area and the quality
  const calls = [];
  const enc = async (w, h, q) => { calls.push([w, h, q]); return { size: Math.round(w * h * q * 0.3) }; };
  const easy = await K.encodeWithin(enc, 1000, 600, { bytes: 250 * 1024 });
  assert.deepEqual([easy.q, easy.w, easy.over], [0.86, 1000, false], 'the first quality that fits is kept');
  calls.length = 0;
  const hard = await K.encodeWithin(enc, 1600, 1066, { bytes: 250 * 1024 });
  assert.equal(hard.over, false);
  assert.ok(calls.length > 4 && hard.w < 1600, 'quality steps down first, then the image is made smaller');
  assert.ok(hard.blob.size <= 250 * 1024);
  const never = await K.encodeWithin(async () => ({ size: 10 ** 7 }), 1600, 900, { bytes: 1000 });
  assert.equal(never.over, true, 'when nothing fits, the smallest is kept and says so');
});

test('what the pixels say: a drawing that fills its frame, a one-ink drawing, a pattern’s ground, a mask', () => {
  const img = (w, h, f) => { const a = new Uint8ClampedArray(w * h * 4); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) a.set(f(x, y), (y * w + x) * 4); return a; };
  const lines = img(40, 20, (x, y) => ((x + y) % 3 === 0 ? [80, 118, 255, 255] : [0, 0, 0, 0]));
  const alone = img(40, 20, (x, y) => (x > 8 && x < 30 && y > 6 && y < 16 && (x + y) % 3 === 0 ? [80, 118, 255, 255] : [0, 0, 0, 0]));
  assert.equal(K.bleedOf(lines, 40, 20), true, 'line work to every edge: a panorama or pattern');
  assert.equal(K.bleedOf(alone, 40, 20), false, 'a drawing with clear space round it stands on its own');
  assert.deepEqual(K.inkOf(lines), { single: true, colour: '#5076ff' });
  const mixed = img(40, 20, (x) => (x < 20 ? [255, 0, 0, 255] : [0, 0, 255, 255]));
  assert.equal(K.inkOf(mixed).single, false, 'two colours: kept as an image, not a mask');
  const night = img(30, 20, (x, y) => ((x * y) % 7 === 0 ? [80, 118, 255, 255] : [0, 0, 0, 255]));
  const print = img(30, 20, (x, y) => ((x * y) % 7 === 0 ? [0, 0, 0, 255] : [255, 255, 255, 255]));
  const onBlue = img(30, 20, (x, y) => ((x * y) % 7 === 0 ? [255, 255, 255, 255] : [80, 118, 255, 255]));
  assert.deepEqual(K.groundOf(night, 30, 20), { ground: 'dark', tone: 'colour' });
  assert.deepEqual(K.groundOf(print, 30, 20), { ground: 'light', tone: 'mono' });
  assert.equal(K.groundOf(onBlue, 30, 20).ground, 'colour');
  const m = K.toMask(Uint8ClampedArray.from([80, 118, 255, 200, 9, 9, 9, 0]));
  assert.deepEqual([...m], [200, 200, 200, 255, 0, 0, 0, 255], 'the line’s cover becomes grey; the mask itself is solid');
});

// ---- the record --------------------------------------------------------------------------------------------------------------
const blob = (n) => new Blob([new Uint8Array(n)], { type: 'image/webp' });
const INKS = { blue: '#5076ff', white: '#ffffff', black: '#000000' };
const items = () => [
  { kind: 'logo', ink: 'white', blob: blob(10), type: 'image/webp', w: 500, h: 250 },
  { kind: 'logo', ink: 'black', blob: blob(10), type: 'image/webp', w: 500, h: 250 },
  ...['house', 'bridge', 'tower', 'garden'].map((name) => ({ kind: 'drawing', name, mode: 'mask', inks: INKS, bleed: false, blob: blob(100), type: 'image/webp', w: 1500, h: 1000 })),
  { kind: 'drawing', name: 'panorama', mode: 'mask', inks: INKS, bleed: true, blob: blob(100), type: 'image/webp', w: 1600, h: 900 },
  { kind: 'drawing', name: 'toile', mode: 'mask', inks: INKS, bleed: true, blob: blob(100), type: 'image/webp', w: 1400, h: 800 },
  { kind: 'pattern', name: 'toile', colourway: 'night', ground: 'dark', tone: 'colour', blob: blob(50), type: 'image/webp', w: 2000, h: 1100 },
  { kind: 'pattern', name: 'panorama', colourway: 'night', ground: 'dark', tone: 'colour', blob: blob(50), type: 'image/webp', w: 2000, h: 1100 },
  { kind: 'pattern', name: 'panorama', colourway: 'print', ground: 'light', tone: 'mono', blob: blob(50), type: 'image/webp', w: 2000, h: 1100 },
  { kind: 'pattern', name: 'panorama', colourway: 'blue', ground: 'colour', tone: 'mono', blob: blob(50), type: 'image/webp', w: 2000, h: 1100 },
];

test('the record: where each file is kept, what it is, and anything not as written left out when read back', () => {
  const { record, files } = K.buildRecord(items(), { prefix: `${PRACTICE}/artwork/`, set: 'abc123', now: '2026-11-22T01:00:00.000Z' });
  assert.equal(files.length, 12);
  assert.equal(record.logo.white.path, `${PRACTICE}/artwork/logo-1-abc123.webp`);
  assert.equal(record.drawings[0].path, `${PRACTICE}/artwork/drawing-1-abc123.webp`);
  assert.deepEqual(Object.keys(record.drawings[0]).sort(), ['bleed', 'h', 'inks', 'mode', 'name', 'path', 'w']);
  assert.equal(record.patterns.at(-1).path, `${PRACTICE}/artwork/pattern-4-abc123.webp`);
  assert.equal(record.bytes, 2 * 10 + 6 * 100 + 4 * 50);
  assert.equal(record.files, 12);
  assert.deepEqual(K.cleanRecord(JSON.parse(JSON.stringify(record)), `${PRACTICE}/artwork/`), record, 'what is written reads back the same');
  assert.throws(() => K.buildRecord(items(), { prefix: 'elsewhere/', set: 'abc123' }), /artwork folder/);
  const junk = { ...record, drawings: [...record.drawings, { path: `${PRACTICE}/artwork/../other/drawing-9-abc123.webp`, name: 'x', mode: 'mask', inks: INKS }, { path: `22222222-2222-4222-8222-222222222222/artwork/drawing-1-abc123.webp`, name: 'y', mode: 'mask', inks: INKS }, { path: `${PRACTICE}/artwork/drawing-8-abc123.webp`, name: 'no ink', mode: 'mask', inks: { blue: 'red' } }] };
  assert.equal(K.cleanRecord(junk, `${PRACTICE}/artwork/`).drawings.length, 6, 'a path out of the folder, another practice’s path, and a mask with no ink are left out');
  assert.equal(K.cleanRecord({ drawings: 'no' }, 'artwork/'), null);
  assert.equal(K.recordPaths(record).length, 12);
  assert.deepEqual(K.recordParts(record), { logos: 1, drawings: 6, patterns: 4 });
  assert.equal(K.partsText(K.recordParts(record)), '1 logo, 6 drawings, 4 patterns');
});

test('a project keeps the same drawing; the ink suits the look; panoramas and patterns are not put on tiles', () => {
  const { record } = K.buildRecord(items(), { prefix: 'artwork/', set: 'abc123' });
  const names = new Set(), ids = Array.from({ length: 40 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`);
  for (const id of ids) {
    const a = K.drawingFor(record, id, 'sketch'), b = K.drawingFor(record, id, 'sketch'), c = K.drawingFor(record, id, 'assembl');
    assert.equal(a.path, b.path, 'the same project, the same drawing, every time');
    assert.equal(a.path, c.path, 'and the same drawing in either look');
    assert.equal(a.colour, '#5076ff', 'blue on the sketch look’s black');
    assert.equal(c.colour, '#000000', 'black on the default look’s warm white');
    names.add(a.name);
  }
  assert.deepEqual([...names].sort(), ['bridge', 'garden', 'house', 'tower'], 'spread over the standalone drawings; never the panorama or the toile');
  assert.equal(K.drawingFor({ drawings: [] }, ids[0]), null);
  assert.equal(K.logoFor(record, 'sketch').ink, 'white');
  assert.equal(K.logoFor(record, 'assembl').ink, 'black');
  const dark = K.heroFor(record, 'sketch'), light = K.heroFor(record, 'assembl');
  assert.deepEqual([dark.kind, dark.name, dark.ground], ['pattern', 'panorama', 'dark'], 'a panorama on the look’s own ground, before the toile');
  assert.deepEqual([light.name, light.ground], ['panorama', 'light']);
  const noPatterns = { ...record, patterns: [] };
  assert.deepEqual([K.heroFor(noPatterns, 'sketch').kind, K.heroFor(noPatterns, 'sketch').name], ['drawing', 'panorama'], 'with no patterns, the full-bleed drawing');
});

// ---- where it is kept ------------------------------------------------------------------------------------------------------------
function practiceDb(role = 'owner') {
  const fake = fakeSupabase({ userId: ME });
  fake.db.practice = [{ id: PRACTICE, name: 'Tui Architects', created_by: ME, extra: { theme: 'sketch' } }];
  fake.db.practice_member = [{ practice_id: PRACTICE, user_id: ME, role }];
  return fake;
}

test('shared records: everyone reads it, an owner changes it, the look is kept, links last an hour', async () => {
  const fake = practiceDb(), place = createArtworkPlace(createGateway(fake), { id: PRACTICE, name: 'Tui Architects', role: 'owner' });
  assert.equal(place.prefix, `${PRACTICE}/artwork/`);
  assert.equal(await place.read(), null);
  const { record, files } = K.buildRecord(items().slice(0, 3), { prefix: place.prefix, set: 'abc123' });
  for (const f of files) await place.upload(f.path, f.blob, f.type);
  await place.write(record);
  assert.deepEqual(fake.db.practice[0].extra.theme, 'sketch', 'the look is kept');
  assert.equal(fake.db.practice[0].extra.artwork.drawings.length, 1);
  assert.deepEqual(K.cleanRecord(await place.read(), place.prefix), record);
  const up = fake.log.filter((o) => o.action === 'upload');
  assert.equal(up.length, 3);
  assert.ok(up.every((o) => o.path.startsWith(`${PRACTICE}/artwork/`) && o.opts.upsert === false), 'into the practice’s own folder, never over a file already there');
  const links = await place.urls(K.recordPaths(record));
  assert.equal(links.urls.size, 3);
  assert.ok([...links.urls.values()].every((u) => u.startsWith('https://storage.example.test/sign/arch-files/')), 'signed links, not public addresses');
  assert.equal(fake.log.filter((o) => o.action === 'sign').length, 1, 'one request for every link');
  assert.equal(fake.log.find((o) => o.action === 'sign').expiresIn, ARTWORK_LINK_SECONDS);
  assert.equal(ARTWORK_LINK_SECONDS, 3600);
  await assert.rejects(place.upload('22222222-2222-4222-8222-222222222222/artwork/logo-1-abc123.webp', blob(1)), /own artwork folder/);
  assert.equal((await place.urls(['elsewhere/x.webp'])).urls.size, 0, 'no link is made for a file outside the folder');
  await place.remove(K.recordPaths(record));
  assert.equal(fake.files.size, 0);
  await place.write(null);
  assert.deepEqual(fake.db.practice[0].extra, { theme: 'sketch' }, 'taking the artwork away leaves the look');
});

test('shared records: a member or viewer is refused before anything is sent, and the database refuses anyone but an owner', async () => {
  for (const role of ['member', 'viewer']) {
    const fake = practiceDb(role), place = createArtworkPlace(createGateway(fake), { id: PRACTICE, name: 'Tui Architects', role });
    assert.equal(place.canChange, false);
    await assert.rejects(place.write({ v: 1 }), (e) => e.code === 'read_only' && /Only an owner of Tui Architects/.test(e.message) && /Nothing was changed/.test(e.message));
    await assert.rejects(place.upload(`${PRACTICE}/artwork/logo-1-abc123.webp`, blob(1)), /Only an owner/);
    await assert.rejects(place.remove([`${PRACTICE}/artwork/logo-1-abc123.webp`]), /Only an owner/);
    assert.equal(fake.writes().length, 0, `${role}: nothing was sent`);
    assert.equal(fake.log.filter((o) => o.table.startsWith('storage/')).length, 0);
  }
  const fake = practiceDb('owner');
  fake.viewer = true; // the database changes nothing for someone who is not an owner, whatever the page thinks
  const place = createArtworkPlace(createGateway(fake), { id: PRACTICE, name: 'Tui Architects', role: 'owner' });
  await assert.rejects(place.write({ v: 1 }), (e) => e.code === 'refused' && /only an owner/.test(e.message));
  assert.equal(fake.db.practice[0].extra.artwork, undefined);
});

test('this browser: the same calls, kept in this browser, under its own artwork folder', async () => {
  const kv = K.memoryKv(), place = K.createBrowserArtworkPlace(kv);
  assert.equal(place.shared, false); assert.equal(place.canChange, true); assert.equal(place.prefix, 'artwork/');
  const { record, files } = K.buildRecord(items().slice(0, 4), { prefix: place.prefix, set: 'abc123' });
  for (const f of files) await place.upload(f.path, f.blob);
  await place.write(record);
  assert.deepEqual(await place.read(), record);
  const links = await place.urls(K.recordPaths(record));
  assert.equal(links.urls.size, 4); assert.equal(links.local, true);
  assert.ok([...links.urls.values()].every((u) => u.startsWith('blob:')), 'object links made in this browser');
  await assert.rejects(place.upload(`${PRACTICE}/artwork/logo-1-abc123.webp`, blob(1)), /this browser’s own artwork folder/);
  await place.remove(K.recordPaths(record)); await place.write(null);
  assert.deepEqual([...kv.m.keys()], [], 'nothing left behind');
  await kv.set('record', { drawings: 'broken' });
  assert.equal(await place.read(), null, 'a broken record reads as no artwork');
});

// ---- the page part, without a page ------------------------------------------------------------------------------------------------
function pagePart({ role = 'owner', shared = true, fake = practiceDb(role) } = {}) {
  const practice = { id: PRACTICE, name: 'Tui Architects', role };
  const account = { state: { practice: shared ? practice : null }, artworkPlace: () => (shared ? createArtworkPlace(createGateway(fake), practice) : null), redraw() {} };
  mountArtwork({ account, store: { shared }, redraw: async () => {}, doc: null, win: null });
  return { fake, account };
}

test('putting artwork in: new files first, then the record, then the old files go; a failure part-way changes nothing', async () => {
  const { fake } = pagePart();
  await syncArtwork();
  const first = await saveArtwork({ items: items() });
  assert.equal(first.files, 12); assert.equal(first.removed, 0);
  const set1 = K.recordPaths(fake.db.practice[0].extra.artwork);
  assert.equal(fake.files.size, 12);
  assert.equal(artworkState().record.drawings.length, 6, 'the page shows it straight away');
  // replace: the new set goes up beside the old, the record moves, then the old set is removed
  const order = [];
  const before = fake.log.length;
  const second = await saveArtwork({ items: items().slice(0, 5) });
  for (const o of fake.log.slice(before)) if (o.action === 'upload' || o.action === 'update' || o.action === 'remove') order.push(o.action);
  assert.deepEqual([order[0], order.at(-2), order.at(-1)], ['upload', 'update', 'remove']);
  assert.equal(second.removed, 12);
  assert.ok(set1.every((p) => !fake.files.has(`arch-files/${p}`)), 'the old files are gone');
  assert.equal(fake.files.size, 5);
  // a failure part-way: the new files are taken away again, and the record is as it was
  const kept = JSON.stringify(fake.db.practice[0].extra.artwork);
  let n = 0;
  fake.fail = (op) => (op.action === 'upload' && ++n === 3 ? { message: 'network down', statusCode: '0' } : null);
  await assert.rejects(saveArtwork({ items: items() }), /artwork in use is as it was|Nothing was/);
  fake.fail = null;
  assert.equal(JSON.stringify(fake.db.practice[0].extra.artwork), kept);
  assert.equal(fake.files.size, 5, 'only the artwork in use is in storage');
  // remove it: the record goes, then the files
  const gone = await removeArtwork();
  assert.equal(gone.removed, 5);
  assert.equal(fake.db.practice[0].extra.artwork, undefined); assert.equal(fake.files.size, 0);
  assert.equal(artworkState().record, null);
});

test('a member cannot put artwork in: refused before anything is sent', async () => {
  const { fake } = pagePart({ role: 'member' });
  fake.db.practice[0].extra.artwork = null;
  await syncArtwork();
  await assert.rejects(saveArtwork({ items: items() }), /Only an owner of Tui Architects/);
  await assert.rejects(removeArtwork(), /Only an owner/);
  assert.equal(fake.writes().length, 0);
  assert.equal(fake.log.filter((o) => o.action === 'upload').length, 0);
});

test('a converted set (manifest.json and its files) goes in as it is, from a script: importArtworkKit', async () => {
  const { fake } = pagePart();
  const set = preparedSetFiles({ items: items() }, { set: 'prepared', now: '2026-11-22T00:00:00.000Z' });
  const webp = (n) => { const b = Buffer.alloc(n); b.write('RIFF', 0); b.write('WEBP', 8); return b; };
  const bytes = zip([{ path: 'manifest.json', data: JSON.stringify(set.manifest) }, ...set.files.map((f) => ({ path: f.path, data: webp(f.size + 12), store: true }))]);
  const steps = [];
  const got = await importArtworkKit(new Blob([bytes]), { onProgress: (p) => steps.push(p.stage) });
  assert.equal(got.files, 12);
  assert.ok(steps.includes('converting') && steps.includes('saving'));
  const rec = fake.db.practice[0].extra.artwork;
  assert.ok(K.recordPaths(rec).every((p) => p.startsWith(`${PRACTICE}/artwork/`) && !p.includes('prepared')), 'kept under the practice, with a set name of its own');
  assert.deepEqual(rec.drawings.map((d) => d.name), set.manifest.drawings.map((d) => d.name));
  const broken = zip([{ path: 'manifest.json', data: JSON.stringify(set.manifest) }]);
  await assert.rejects(importArtworkKit(new Blob([broken])), /not in it/);
});

test('signed out: nothing is asked of the shared records for artwork, and the page keeps its own drawings', async () => {
  const fake = practiceDb();
  fake.db.practice[0].extra.artwork = K.buildRecord(items(), { prefix: `${PRACTICE}/artwork/`, set: 'abc123' }).record;
  fake.auth = { getSession: async () => ({ data: { session: null }, error: null }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }), signOut: async () => ({ error: null }) };
  const mem = new Map();
  const win = { location: { href: 'https://lab.assembl.co.nz/architecture/', hash: '' }, history: { state: null, replaceState() {} }, localStorage: { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, String(v)), removeItem: (k) => void mem.delete(k) } };
  const el = () => ({ innerHTML: '', hidden: false, addEventListener() {} });
  const local = createStore(memoryBackend(), { files: memoryFiles() }), store = createSwitch(local);
  const account = mountAccount({ store, local, slot: el(), panel: el(), nameLabel: el(), win, loadClient: async () => ({ createClient: () => fake }) });
  await account.ready; await tick(30);
  mountArtwork({ account, store, redraw: async () => {}, doc: null, win: null });
  const before = fake.log.length;
  await syncArtwork(); await syncArtwork();
  const asked = fake.log.slice(before);
  assert.deepEqual(asked, [], 'no request at all for artwork');
  assert.equal(fake.log.filter((o) => o.table.startsWith('storage/')).length, 0, 'no file and no link');
  assert.ok(!fake.log.some((o) => o.table === 'practice' && o.action === 'select' && JSON.stringify(o).includes('extra')), 'the practice’s record is never read');
  assert.equal(artworkState().record, null);
  assert.equal(artCover({ id: 'x', model: {} }), '', 'the page draws its own sketch');
});

test('signed in: the record is read once and the links made in one request, then kept for the visit', async () => {
  const { fake } = pagePart();
  const { record, files } = K.buildRecord(items(), { prefix: `${PRACTICE}/artwork/`, set: 'abc123' });
  fake.db.practice[0].extra.artwork = record;
  for (const f of files) fake.files.set(`arch-files/${f.path}`, f.blob);
  const before = fake.log.length;
  await syncArtwork(); await syncArtwork(); await syncArtwork();
  const asked = fake.log.slice(before);
  assert.equal(asked.filter((o) => o.table === 'practice').length, 1, 'the practice’s record, once');
  assert.equal(asked.filter((o) => o.action === 'sign').length, 1, 'links for every file, in one request');
  assert.equal(asked.filter((o) => o.action === 'download').length, 0, 'nothing is downloaded until it is shown');
  assert.equal(artworkState().links, 12);
});

test('the page links the artwork stylesheet, versioned by its content', () => {
  const html = readFileSync(new URL('../../architecture/index.html', import.meta.url), 'utf8');
  assert.match(html, /<link rel="stylesheet" href="\.\/artwork\.css\?v=[0-9a-f]{10}" \/>/);
});
