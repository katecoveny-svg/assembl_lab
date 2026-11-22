// A practice's own artwork in its workspace: its logo in the header, a wide drawing behind the projects screen's
// heading, its drawings on project tiles that have no model yet and on empty screens, and the place in Settings (and the
// practice panel) where an owner puts the artwork in. The rules for reading a kit and choosing what shows are in
// artwork-kit.js; the practice's records are reached through cloud.js (createArtworkPlace).
//
// Where the artwork is kept, and who changes it:
//   signed in, with a practice in use   practice.extra.artwork and the practice's private bucket, <practice id>/artwork/.
//                                       Everyone in the practice sees it, through links that last an hour (kept in
//                                       memory for the visit). Only an owner puts it in, replaces it or removes it.
//   signed out, or browser only          this browser's IndexedDB, for this browser alone.
// Nothing is read until it is known whose artwork to show: signed out, nothing is asked of the shared records.
//
// From a script in the signed-in page (the same steps the Settings screen takes):
//   const { importArtworkKit } = await import('./js/artwork.js');
//   await importArtworkKit(zipFileOrBytesOrFiles, { onProgress: (p) => console.log(p) });
//
// Nothing here writes to the console.

import {
  KitError, readZip, looksLikeZip, pickKit, fitSize, encodeWithin, LIMITS, MIME, bleedOf, inkOf, groundOf, toMask,
  buildRecord, cleanRecord, recordPaths, newSet, drawingFor, logoFor, heroFor, inked, standalone, steady, partsText,
  recordParts, idbKv, createBrowserArtworkPlace, INK_ORDER,
} from './artwork-kit.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const day = (v) => { const d = new Date(v); return !v || Number.isNaN(d.getTime()) ? '' : `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };
const kb = (n) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
/** how long the first screen waits for the artwork before it draws without it (it is drawn again once it comes) */
export const FIRST_WAIT = 1500;

const st = {
  key: '', loadingKey: '', loading: null, loaded: false,
  place: null, practice: null,
  record: null, urls: new Map(), until: 0, local: false, error: '',
  // the uploader
  prepared: null, progress: null, busy: '', note: '', confirm: '', over: false,
};
let ctx = null;
let browserKv;

// ---- whose artwork, and reading it ----------------------------------------------------------------------------------
function scope() {
  const practice = ctx?.store?.shared ? ctx.account?.state?.practice ?? null : null;
  if (practice?.id) return { key: `p:${practice.id}:${practice.role}`, practice, place: () => ctx.account.artworkPlace?.() ?? null };
  return { key: 'browser', practice: null, place: () => { if (browserKv === undefined) browserKv = idbKv(); return browserKv ? createBrowserArtworkPlace(browserKv) : null; } };
}
function forget() {
  if (st.local) for (const u of st.urls.values()) { try { URL.revokeObjectURL(u); } catch { /* already gone */ } }
  st.record = null; st.urls = new Map(); st.until = 0; st.local = false; st.error = '';
}
const theme = () => (ctx?.doc?.documentElement?.dataset?.theme === 'sketch' ? 'sketch' : 'assembl');
const url = (path) => (path ? st.urls.get(path) ?? '' : '');

/**
 * Make sure the artwork on hand is the artwork of whoever's records are in use, and that its links are fresh.
 * Resolves true when it read something new (the page is drawn again if it came late).
 */
export function syncArtwork() {
  if (!ctx) return Promise.resolve(false);
  const s = scope(), fresh = st.key === s.key && st.loaded && !(st.record && !st.local && Date.now() > st.until - 5 * 60 * 1000);
  if (fresh) return Promise.resolve(false);
  if (st.loading && st.loadingKey === s.key) return st.loading;
  st.loadingKey = s.key;
  const run = (async () => {
    if (s.key !== st.key) { forget(); st.prepared = null; st.confirm = ''; st.note = ''; }
    st.key = s.key; st.practice = s.practice; st.place = s.place(); st.loaded = false;
    let changed = false;
    if (st.place) {
      try {
        const rec = cleanRecord(await st.place.read(), st.place.prefix);
        const links = rec ? await st.place.urls(recordPaths(rec)) : { urls: new Map(), until: Infinity, local: st.place.shared === false };
        if (st.key === s.key) { forget(); st.record = rec; st.urls = links.urls; st.until = links.until; st.local = !!links.local; changed = !!rec; }
      } catch (e) { if (st.key === s.key) { forget(); st.error = e?.message || 'The artwork could not be read.'; } }
    } else forget();
    if (st.key === s.key) st.loaded = true;
    header();
    return changed;
  })();
  st.loading = run;
  run.finally(() => { if (st.loading === run) st.loading = null; }).catch(() => {});
  return run;
}

/** what is on hand, for tests and for the Settings words */
export const artworkState = () => ({ key: st.key, record: st.record, links: st.urls.size, practice: st.practice?.name ?? '', canChange: !!st.place?.canChange, shared: !!st.place?.shared });

// ---- drawing it -------------------------------------------------------------------------------------------------------
let maskOk = null;
const masks = () => (maskOk ??= !!(globalThis.CSS?.supports?.('mask-mode', 'luminance') || globalThis.CSS?.supports?.('-webkit-mask-source-type', 'luminance')));

/** one drawing: a mask drawn in the look's ink, or (a drawing in its own colours) an image. lazy: drawn once near the screen. */
function drawingHtml(d, { cls = '', lazy = true } = {}) {
  const src = url(d?.path);
  if (!src) return '';
  if (d.mode === 'image') return `<img class="art-img ${cls}" src="${esc(src)}" alt="" ${lazy ? 'loading="lazy" ' : ''}decoding="async"${d.w ? ` width="${d.w}" height="${d.h}"` : ''} />`;
  const look = `--art-ink:${esc(d.colour)};`;
  return lazy
    ? `<span class="art-ink ${cls}" style="${look}" data-art-src="${esc(src)}"></span>`
    : `<span class="art-ink on ${cls}" style="${look}--art-src:url(&quot;${esc(src)}&quot;)"></span>`;
}
const canDraw = (d) => !!d && !!url(d.path) && (d.mode === 'image' || masks());

/**
 * A project's cover while it has no plan from a model: one of the practice's drawings, chosen from the project's id,
 * marked as decoration and never as the project's design. '' when the practice has no artwork (the page's own sketch shows).
 */
export function artCover(p, cls = '') {
  const d = st.record ? drawingFor(st.record, p?.id, theme()) : null;
  if (!canDraw(d)) return '';
  const note = p.model?.fingerprint ? 'Model attached' : 'No model yet';
  return `<div class="cover deco art-cover${cls ? ` ${cls}` : ''}">${drawingHtml(d, { lazy: !/\bbig\b/.test(cls) })}<span class="cover-note">${note}<span class="vh">. The drawing is from the practice’s artwork, shown as decoration. It is not this project’s design.</span></span></div>`;
}

/** the band behind the projects screen's heading and numbers: one wide picture, or '' */
export function artHero() {
  const h = st.record ? heroFor(st.record, theme()) : null;
  if (!h || !url(h.path)) return '';
  const inner = h.kind === 'pattern'
    ? `<img class="art-band-img" src="${esc(url(h.path))}" alt="" decoding="async" fetchpriority="high"${h.w ? ` width="${h.w}" height="${h.h}"` : ''} />`
    : canDraw(h) ? drawingHtml(h, { cls: 'art-band-ink', lazy: false }) : '';
  return inner ? `<div class="art-band${h.kind === 'pattern' ? ' is-pattern' : ''}" aria-hidden="true"><div class="art-band-in">${inner}</div></div>` : '';
}

/** the header: the practice's logo beside a small "with assembl." mark, or the page's own word mark */
function header() {
  const a = ctx?.doc?.querySelector?.('.top .word');
  if (!a) return;
  const logo = st.record ? logoFor(st.record, theme()) : null, src = logo ? url(logo.path) : '';
  const want = src ? `logo:${src}` : 'plain';
  if (a.dataset.art === want) return;
  a.dataset.art = want;
  if (src) {
    const name = st.practice?.name || 'Practice logo';
    a.removeAttribute('aria-label');
    a.classList.add('art-word');
    a.innerHTML = `<img class="art-logo" src="${esc(src)}" alt="${esc(name)}"${logo.w ? ` width="${logo.w}" height="${logo.h}"` : ''} /><span class="art-with">with assembl.</span><span class="vh"> architecture operations: all projects</span>`;
  } else {
    a.classList.remove('art-word');
    a.setAttribute('aria-label', 'assembl. architecture operations: all projects');
    a.textContent = 'assembl.';
  }
}

/** empty screens marked for it (no projects, no models, no clients) take a drawing; the page keeps its own words */
const EMPTY = '[data-art-empty], .mdl-empty, .crm-empty';
function dress(root) {
  if (!root?.querySelectorAll) return;
  const list = st.record ? standalone(st.record) : [];
  if (list.length) {
    for (const el of root.querySelectorAll(EMPTY)) {
      if (el.dataset.artDressed || el.closest('.art-sec')) continue;
      const key = (el.querySelector('h3, p')?.textContent || 'empty').trim();
      const d = inked(list[steady(key) % list.length], theme());
      if (!canDraw(d)) continue;
      el.dataset.artDressed = '1';
      el.classList.add('art-dressed');
      el.insertAdjacentHTML('afterbegin', `<span class="art-empty" aria-hidden="true">${drawingHtml(d)}</span>`);
    }
    // signed out or not in a practice yet, with artwork kept in this browser: the sign-in panel shows one too
    if (st.key === 'browser') for (const box of root.querySelectorAll('#account-panel .acct-in, .acct-in')) {
      if (box.dataset.artDressed || !box.children.length) continue;
      const d = inked(list[steady('sign-in') % list.length], theme());
      if (!canDraw(d)) continue;
      box.dataset.artDressed = '1';
      box.insertAdjacentHTML('afterbegin', `<span class="art-acct" aria-hidden="true">${drawingHtml(d)}</span>`);
    }
  }
  lazy(root);
}

let io = null;
function show(el) {
  const src = el.getAttribute('data-art-src');
  if (!src) return;
  el.style.setProperty('--art-src', `url("${src.replace(/"/g, '%22')}")`);
  el.removeAttribute('data-art-src');
  el.classList.add('on');
}
/** drawings below the fold are fetched when they come near the screen */
function lazy(root) {
  const els = root.querySelectorAll?.('[data-art-src]') ?? [];
  if (!els.length) return;
  if (!io && typeof IntersectionObserver === 'function') io = new IntersectionObserver((seen) => { for (const e of seen) if (e.isIntersecting) { io.unobserve(e.target); show(e.target); } }, { rootMargin: '320px 0px' });
  for (const el of els) if (io) io.observe(el); else show(el);
}

/** how far down the band the heading reaches: the scrim is solid to there, so the heading is always on the page's ground */
function measure() {
  const hero = ctx?.doc?.querySelector?.('.art-hero'), band = hero?.querySelector('.art-band'), h1 = hero?.querySelector('h1');
  if (!band || !h1) return;
  const at = Math.round(h1.getBoundingClientRect().bottom - band.getBoundingClientRect().top + 12);
  if (at > 0) band.style.setProperty('--art-head', `${at}px`);
}
/** the band drifts a little slower than the page as it scrolls; not at all when reduced motion is asked for */
function parallax() {
  const band = ctx?.doc?.querySelector('.art-band-in');
  if (!band) return;
  const still = ctx.win.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  band.style.transform = still ? '' : `translate3d(0, ${Math.round(Math.min(ctx.win.scrollY, 900) * 0.22)}px, 0)`;
}

// ---- reading a kit and converting it, in this browser ---------------------------------------------------------------------
const isZipName = (n) => /\.zip$/i.test(String(n ?? ''));
const extOf = (p) => (String(p).match(/\.([a-z0-9]+)$/i)?.[1] ?? '').toLowerCase();

/** what was given -> [{ path, size, load() -> Blob }], or { set } for a set already converted (a manifest.json with its files) */
async function sourcesOf(input) {
  let list = input;
  if (input instanceof ArrayBuffer || ArrayBuffer.isView(input)) list = [new Blob([input instanceof ArrayBuffer ? input : new Uint8Array(input.buffer, input.byteOffset, input.byteLength)])];
  else if (typeof Blob !== 'undefined' && input instanceof Blob) list = [input];
  list = Array.from(list ?? []);
  if (!list.length) throw new KitError('Nothing was given: drop the artwork kit (.zip) or its images.');
  const out = [];
  for (const f of list) {
    const name = f.webkitRelativePath || f.name || '';
    let zipped = isZipName(name);
    if (!zipped && !/\.(png|jpe?g|webp)$/i.test(name)) {
      try { zipped = await looksLikeZip(f); } catch { throw new KitError(`“${name || 'That'}” could not be read. A folder cannot be dropped here: zip it, or choose the images inside it.`); }
    }
    if (zipped) {
      const zip = await readZip(f);
      const man = zip.entries.find((e) => e.path === 'manifest.json' || e.path.endsWith('/manifest.json'));
      if (man) {
        const root = man.path.slice(0, -'manifest.json'.length);
        let record = null;
        try { record = cleanRecord(JSON.parse(new TextDecoder().decode(await zip.read(man))), 'artwork/'); } catch { record = null; }
        if (record) return { set: { record, root, zip } };
      }
      for (const e of zip.entries) out.push({ path: e.path, size: e.size, load: async () => new Blob([await zip.read(e)], { type: MIME[extOf(e.path)] ?? '' }) });
    } else out.push({ path: name, size: f.size, load: async () => f });
  }
  return out;
}

let webpOk = null;
async function canWebp() {
  if (webpOk !== null) return webpOk;
  try { const c = canvasOf(2, 2); c.getContext('2d').fillRect(0, 0, 1, 1); webpOk = (await toBlob(c, 'image/webp', 0.8))?.type === 'image/webp'; } catch { webpOk = false; }
  return webpOk;
}
function canvasOf(w, h) {
  if (typeof OffscreenCanvas === 'function') return new OffscreenCanvas(w, h);
  const c = ctx.doc.createElement('canvas'); c.width = w; c.height = h; return c;
}
function toBlob(c, type, q) {
  if (c.convertToBlob) return c.convertToBlob({ type, quality: q });
  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new KitError('This browser could not convert the image.'))), type, q));
}
async function decode(blob) {
  try { return await createImageBitmap(blob); } catch { throw new KitError('One image in the kit could not be opened.'); }
}
/** a small copy of an image, for what the pixels say */
function sample(bmp, side = 96) {
  const { w, h } = fitSize(bmp.width, bmp.height, side), c = canvasOf(w, h), g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(bmp, 0, 0, w, h);
  return { rgba: g.getImageData(0, 0, w, h).data, w, h };
}
/** draw at a size, as a mask or as it is, and encode under the kind's byte size */
async function encode(bmp, kind, { mask = false, alpha = true } = {}) {
  const { w, h } = fitSize(bmp.width, bmp.height, LIMITS[kind].side), webp = await canWebp();
  const type = webp ? 'image/webp' : mask || !alpha ? 'image/jpeg' : 'image/png';
  const drawn = new Map();
  const at = (cw, ch) => {
    const k = `${cw}x${ch}`;
    if (drawn.has(k)) return drawn.get(k);
    const c = canvasOf(cw, ch), g = c.getContext('2d', { willReadFrequently: mask });
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(bmp, 0, 0, cw, ch);
    if (mask) { const d = g.getImageData(0, 0, cw, ch); toMask(d.data); g.putImageData(d, 0, 0); }
    drawn.clear(); drawn.set(k, c);
    return c;
  };
  const out = await encodeWithin((cw, ch, q) => toBlob(at(cw, ch), type, q), w, h, { bytes: LIMITS[kind].bytes, ...(type === 'image/png' ? { qualities: [1] } : {}) });
  return { blob: out.blob, type: out.blob.type || type, w: out.w, h: out.h, over: out.over };
}

/** run fn over the list, n at a time. The first failure stops new work; it is thrown once the work already started has finished. */
async function pool(list, n, fn) {
  let i = 0, failed = null;
  await Promise.all(Array.from({ length: Math.min(n, list.length) }, async () => {
    while (!failed && i < list.length) { const k = i++; try { await fn(list[k], k); } catch (e) { failed ??= e; } }
  }));
  if (failed) throw failed;
}

/**
 * Read an artwork kit and convert what the workspace uses. Nothing is kept or sent: this is the preview.
 *   input   a .zip (File, Blob, ArrayBuffer or bytes), or images (a FileList or an array of Files), or a converted set (a .zip with manifest.json)
 *   onProgress({ stage: 'reading' | 'converting', done, total, label, items })
 * Returns { items, parts: { logos, drawings, patterns }, files, bytes, ignored, over, from }.
 */
export async function prepareArtworkKit(input, { onProgress = () => {} } = {}) {
  onProgress({ stage: 'reading', done: 0, total: 0, label: 'Reading the kit', items: [] });
  const src = await sourcesOf(input);
  if (src.set) return preparedFromSet(src.set, onProgress);
  const picked = pickKit(src);
  if (!picked.items.length) throw new KitError('Nothing in that is a logo, a transparent drawing or a pattern. A kit has logos/, drawings-transparent/ and patterns/ folders; loose images are read by their names.');
  // one job a logo ink, a drawing (all its inks: one mask), a pattern colourway
  const jobs = [], byName = new Map();
  for (const it of picked.items) {
    if (it.kind !== 'drawing') { jobs.push([it]); continue; }
    if (!byName.has(it.name)) { byName.set(it.name, []); jobs.push(byName.get(it.name)); }
    byName.get(it.name).push(it);
  }
  const items = new Array(jobs.length), problems = [];
  let done = 0;
  onProgress({ stage: 'converting', done, total: jobs.length, label: 'Converting', items: [] });
  await pool(jobs, 2, async (group, k) => {
    const it = group[0];
    try {
      let item;
      if (it.kind === 'drawing') {
        const inks = {};
        let single = true, first = null;
        for (const x of group) {
          const bmp = await decode(await x.load()), s = sample(bmp), ink = inkOf(s.rgba);
          inks[x.ink] = ink.colour; single = single && ink.single;
          if (!first) first = { bmp, s }; else bmp.close?.();
        }
        const out = await encode(first.bmp, 'drawing', { mask: single });
        item = { kind: 'drawing', name: it.name, mode: single ? 'mask' : 'image', inks: single ? inks : {}, bleed: bleedOf(first.s.rgba, first.s.w, first.s.h), source: group.length, ...out };
        first.bmp.close?.();
      } else {
        const bmp = await decode(await it.load());
        const extra = it.kind === 'pattern' ? (() => { const s = sample(bmp); return groundOf(s.rgba, s.w, s.h); })() : {};
        const out = await encode(bmp, it.kind, { alpha: it.kind === 'logo' });
        item = it.kind === 'logo' ? { kind: 'logo', name: it.name, ink: it.ink, ...out } : { kind: 'pattern', name: it.name, colourway: it.colourway, ...extra, ...out };
        bmp.close?.();
      }
      items[k] = item;
    } catch (e) { problems.push(`${it.name}: ${e?.message || 'could not be converted'}`); }
    done++;
    onProgress({ stage: 'converting', done, total: jobs.length, label: it.name, items: items.filter(Boolean) });
  });
  const kept = items.filter(Boolean);
  if (!kept.length) throw new KitError(`None of the kit’s images could be converted. ${problems[0] ?? ''}`.trim());
  return summarise(kept, { ignored: picked.ignored, over: picked.over, problems, from: 'kit' });
}

async function preparedFromSet({ record, root, zip }, onProgress) {
  const byPath = new Map(zip.entries.map((e) => [e.path.slice(root.length), e]));
  const items = [];
  const entries = [...Object.entries(record.logo).map(([ink, x]) => ({ kind: 'logo', ink, ...x })), ...record.drawings.map((d) => ({ kind: 'drawing', ...d })), ...record.patterns.map((p) => ({ kind: 'pattern', ...p }))];
  for (const [i, x] of entries.entries()) {
    const e = byPath.get(x.path);
    if (!e) throw new KitError(`The converted set names ${x.path}, but the file is not in it.`);
    if (e.size > LIMITS[x.kind].bytes * 2) throw new KitError(`${x.path} is larger than an artwork file should be.`);
    const bytes = await zip.read(e), type = MIME[extOf(x.path)] ?? 'image/webp';
    const webpOkay = type !== 'image/webp' || (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[8] === 0x57 && bytes[9] === 0x45);
    if (!webpOkay) throw new KitError(`${x.path} is not a WebP image.`);
    const { path, ...meta } = x;
    items.push({ ...meta, blob: new Blob([bytes], { type }), type });
    onProgress({ stage: 'converting', done: i + 1, total: entries.length, label: x.name ?? x.ink, items });
  }
  return summarise(items, { ignored: 0, over: 0, problems: [], from: 'set' });
}

function summarise(items, rest) {
  const parts = { logos: items.some((x) => x.kind === 'logo') ? 1 : 0, drawings: items.filter((x) => x.kind === 'drawing').length, patterns: items.filter((x) => x.kind === 'pattern').length };
  return { items, parts, files: items.length, bytes: items.reduce((n, x) => n + (x.blob?.size ?? 0), 0), heavy: items.filter((x) => x.over).length, ...rest };
}

/**
 * Keep prepared artwork where the records in use are kept, and use it. New files go up first; the record then names
 * them; the old files are removed last. If anything fails before the record changes, the new files are taken away again
 * and the artwork in use is as it was. In the shared records only an owner can do this, and it is refused before
 * anything is sent for anyone else.
 * Returns { files, bytes, removed, leftover, record }.
 */
export async function saveArtwork(prepared, { onProgress = () => {} } = {}) {
  if (!ctx) throw new Error('The workspace has not started yet.');
  await syncArtwork();
  const place = st.place, who = st.practice?.name ?? 'the practice';
  if (!place) throw new Error('This browser cannot keep artwork. Sign in with a practice to keep it in the practice’s records.');
  if (!place.canChange) throw new Error(`Only an owner of ${who} can change its artwork. Nothing was changed.`);
  const { record, files } = buildRecord(prepared?.items, { prefix: place.prefix, set: newSet() });
  if (!files.length) throw new KitError('There is nothing to keep.');
  const before = cleanRecord(await place.read(), place.prefix), sent = [];
  onProgress({ stage: 'saving', done: 0, total: files.length, label: 'Keeping the artwork' });
  try {
    await pool(files, 3, async (f) => { await place.upload(f.path, f.blob, f.type); sent.push(f.path); onProgress({ stage: 'saving', done: sent.length, total: files.length, label: 'Keeping the artwork' }); });
    await place.write(record);
  } catch (e) {
    try { await place.remove(sent); } catch { /* the new files stay behind, unused; removing the artwork again clears them */ }
    const said = String(e?.message || 'That did not work.');
    throw new Error(/Nothing was/.test(said) ? said : `${said} Nothing was changed: the artwork in use is as it was.`);
  }
  const old = recordPaths(before).filter((p) => !files.some((f) => f.path === p));
  let leftover = 0;
  try { await place.remove(old); } catch { leftover = old.length; }
  st.key = ''; await syncArtwork();
  return { files: files.length, bytes: record.bytes, removed: old.length - leftover, leftover, record };
}

/** Read a kit, convert it and use it, in one step: what a script in the signed-in page calls. */
export async function importArtworkKit(input, opts = {}) {
  return saveArtwork(await prepareArtworkKit(input, opts), opts);
}

/** Take the artwork away (an owner, in the shared records). The record goes first, then the files. */
export async function removeArtwork() {
  await syncArtwork();
  const place = st.place;
  if (!place) return { removed: 0, leftover: 0 };
  if (!place.canChange) throw new Error(`Only an owner of ${st.practice?.name ?? 'the practice'} can change its artwork. Nothing was changed.`);
  const before = cleanRecord(await place.read(), place.prefix), paths = recordPaths(before);
  await place.write(null);
  let leftover = 0;
  try { await place.remove(paths); } catch { leftover = paths.length; }
  st.key = ''; await syncArtwork();
  return { removed: paths.length - leftover, leftover };
}

/** A converted set as files: manifest.json (the record, with "artwork/" paths) and the images under the same names. */
export function preparedSetFiles(prepared, { set = 'prepared', now } = {}) {
  const { record, files } = buildRecord(prepared.items, { prefix: 'artwork/', set, ...(now ? { now } : {}) });
  return { manifest: record, files };
}

// ---- the Settings section (and the same in the practice panel) -------------------------------------------------------------
let shown = new Map(); // object links for the preview of a kit not yet kept
const previewUrl = (it) => { if (!shown.has(it)) shown.set(it, URL.createObjectURL(it.blob)); return shown.get(it); };
const dropPreview = () => { for (const u of shown.values()) { try { URL.revokeObjectURL(u); } catch { /* gone */ } } shown = new Map(); };

function tile(kind, label, inner, cls = '') { return `<li class="art-tile is-${kind}${cls}"><span class="art-tile-pic">${inner}</span><span class="art-tile-l">${esc(label)}</span></li>`; }
function recordGrid(r, most = Infinity) {
  const t = theme(), out = [], logo = logoFor(r, t), ground = t === 'sketch' ? 'dark' : 'light', tone = t === 'sketch' ? ['colour', 'mono'] : ['mono', 'colour'];
  if (logo && url(logo.path)) out.push(tile('logo', 'Logo', `<img src="${esc(url(logo.path))}" alt="" loading="lazy" />`));
  for (const d of r.drawings) { const x = inked(d, t); if (canDraw(x)) out.push(tile('drawing', d.name, drawingHtml(x))); }
  const seen = new Set();
  for (const p of r.patterns) {
    if (seen.has(p.name) || !url(p.path)) continue;
    seen.add(p.name);
    const fit = r.patterns.filter((q) => q.name === p.name && q.ground === ground).sort((a, b) => tone.indexOf(a.tone) - tone.indexOf(b.tone))[0] ?? p; // the colourway on the look's own ground
    out.push(tile('pattern', `${p.name} · pattern`, `<img src="${esc(url(fit.path))}" alt="" loading="lazy" />`));
  }
  return out.length ? `<ul class="art-grid" aria-label="The artwork in use">${out.slice(0, most).join('')}</ul>` : '';
}
function preparedGrid(items, most = Infinity) {
  const t = theme(), out = [], ink = INK_ORDER[t].line;
  const logos = items.filter((x) => x.kind === 'logo'), logo = INK_ORDER[t].logo.map((k) => logos.find((x) => x.ink === k)).find(Boolean) ?? logos[0];
  if (logo) out.push(tile('logo', `Logo · ${plural(logos.length, 'ink')}`, `<img src="${esc(previewUrl(logo))}" alt="" />`));
  for (const d of items.filter((x) => x.kind === 'drawing')) {
    const colour = d.mode === 'image' ? '' : ink.map((k) => d.inks[k]).find(Boolean) ?? Object.values(d.inks)[0];
    const pic = d.mode === 'image' ? `<img src="${esc(previewUrl(d))}" alt="" />` : `<span class="art-ink on" style="--art-ink:${esc(colour)};--art-src:url(&quot;${esc(previewUrl(d))}&quot;)"></span>`;
    out.push(tile('drawing', `${d.name} · ${kb(d.blob.size)}`, pic, d.over ? ' is-heavy' : ''));
  }
  for (const p of items.filter((x) => x.kind === 'pattern')) out.push(tile('pattern', `${p.name} ${p.colourway} · ${kb(p.blob.size)}`, `<img src="${esc(previewUrl(p))}" alt="" />`, p.over ? ' is-heavy' : ''));
  return out.length ? `<ul class="art-grid" aria-label="The kit, converted">${out.slice(0, most).join('')}</ul>` : '';
}

function sectionBody(where) {
  const most = where === 'panel' ? 4 : Infinity; // the practice panel shows a few; Settings shows all of it
  const s = scope(), r = st.record, canChange = st.key === s.key ? !!st.place?.canChange : s.key === 'browser';
  const name = s.practice?.name ?? '', busy = !!st.busy || !!st.progress;
  const whose = s.practice ? (canChange ? `■ For everyone in ${esc(name)}. Kept in its private records: nothing has a public address.` : `□ Chosen by an owner of ${esc(name)}.`) : '■ For this browser only. Kept in this browser.';
  const state = r ? `■ In use: ${esc(partsText(recordParts(r)))} · ${plural(r.files || recordPaths(r).length, 'file')}${r.bytes ? `, ${kb(r.bytes)}` : ''}${r.updated_at ? ` · put in ${esc(day(r.updated_at))}` : ''}` : st.error ? `□ ${esc(st.error)}` : '□ No artwork yet. The workspace uses its own line drawings.';
  const parts = [`<p class="st art-state">${state}</p>`, `<p class="small art-whose">${whose}</p>`];
  const p = st.progress, prep = st.prepared;
  if (p) {
    const label = p.stage === 'saving' ? `Keeping the artwork: ${p.done} of ${p.total} files` : p.stage === 'reading' ? 'Reading the kit…' : `Converting: ${p.done} of ${p.total}${p.label ? ` · ${esc(p.label)}` : ''}`;
    parts.push(`<div class="art-progress" role="status" aria-live="polite"><progress max="${Math.max(1, p.total)}" value="${p.done}"></progress><span class="st">${label}</span></div>`);
    if (p.items?.length) parts.push(preparedGrid(p.items, most));
  } else if (prep) {
    parts.push(`<div class="art-ready"><p><b>Ready:</b> ${esc(partsText(prep.parts))} · ${plural(prep.files, 'file')}, ${kb(prep.bytes)} in all, ${prep.from === 'set' ? 'converted already (a set made from the kit earlier)' : `each converted to ${prep.items.every((x) => x.type === 'image/webp') ? 'WebP' : 'a smaller image'} in this browser`}.</p>
      ${prep.ignored ? `<p class="small">${plural(prep.ignored, 'other file')} in the kit ${prep.ignored === 1 ? 'is' : 'are'} not used (social posts, slides and the like).</p>` : ''}
      ${prep.over ? `<p class="small">□ ${plural(prep.over, 'file')} left out: more than the workspace keeps, or too large.</p>` : ''}
      ${prep.heavy ? `<p class="small">□ ${plural(prep.heavy, 'file')} could not be brought under ${kb(LIMITS.drawing.bytes)} and ${prep.heavy === 1 ? 'is' : 'are'} kept as small as it would go.</p>` : ''}
      ${prep.problems?.length ? `<p class="small">□ Not converted: ${esc(prep.problems.join('; '))}</p>` : ''}
      <p class="small">Drawings are kept as line work and drawn in the ink that suits the look. Nothing is kept until you choose.</p></div>`);
    parts.push(preparedGrid(prep.items, most));
    if (canChange) parts.push(`<div class="acts"><button type="button" class="btn solid" data-art="use"${busy ? ' disabled' : ''}>${r ? 'Use this artwork instead' : 'Use this artwork'}</button><button type="button" class="link" data-art="cancel"${busy ? ' disabled' : ''}>Cancel</button></div>
      ${r ? `<p class="small">The new artwork goes in first; the artwork in use now is removed once it has.</p>` : ''}`);
  } else if (r) parts.push(recordGrid(r, most));
  if (where === 'panel' && (r || prep)) parts.push('<p class="small"><a href="#/settings">See all of it in Settings</a></p>');
  if (canChange && !p && !prep) {
    parts.push(`<label class="art-drop${st.over ? ' over' : ''}" data-art-drop><input class="vh" type="file" data-art-file multiple accept=".zip,application/zip,image/png,image/jpeg,image/webp" />
      <span class="art-drop-t">${r ? 'Drop a new kit here to replace it' : 'Drop the practice’s artwork kit here'}</span>
      <span class="small">One .zip, or its images. Logos, transparent drawings and patterns are picked out by their folders; nothing else is used. <span class="link">Or choose files</span></span></label>`);
    if (r) parts.push(`<div class="acts"><button type="button" class="link" data-art="remove"${busy ? ' disabled' : ''}>${st.confirm === 'remove' ? 'Remove the artwork for good' : 'Remove the artwork'}</button></div>`);
  }
  if (st.note) parts.push(`<p class="flash art-note" role="status">${esc(st.note)}</p>`);
  if (where === 'settings') parts.push(`<p class="small">The artwork dresses the workspace: the logo in the header, a wide drawing behind the projects, a drawing on each project that has no model yet, and the empty screens. A project’s drawing is decoration, never its design: a project with a model shows the plan drawn from it.</p>`);
  return parts.join('');
}

/** the section, for the Settings screen ('settings') or the practice panel ('panel') */
export function artSectionHtml(where = 'settings') {
  const body = `<div data-art-body="${where}">${sectionBody(where)}</div>`;
  return where === 'panel'
    ? `<section class="acct-sec art-sec"><p class="label">Artwork</p>${body}</section>`
    : `<section class="panel art-sec" aria-labelledby="arth"><h2 id="arth">Practice artwork</h2>${body}</section>`;
}
/** draw the section again where it is on screen, without drawing the page */
function refresh() {
  for (const el of ctx?.doc?.querySelectorAll?.('[data-art-body]') ?? []) el.innerHTML = sectionBody(el.dataset.artBody);
}

async function startPrepare(files) {
  if (st.busy || st.progress) return;
  dropPreview(); st.prepared = null; st.note = ''; st.confirm = ''; st.busy = 'prepare';
  try { st.prepared = await prepareArtworkKit(files, { onProgress: (p) => { st.progress = p; refresh(); } }); }
  catch (e) { st.note = e?.message || 'The kit could not be read.'; }
  finally { st.progress = null; st.busy = ''; refresh(); }
}
async function startSave() {
  if (!st.prepared || st.busy) return;
  st.busy = 'save'; st.note = '';
  try {
    const got = await saveArtwork(st.prepared, { onProgress: (p) => { st.progress = p; refresh(); } });
    dropPreview(); st.prepared = null; st.progress = null; st.busy = '';
    const where = st.place?.shared ? `in the private records of ${st.practice?.name ?? 'the practice'}` : 'in this browser';
    st.note = `The artwork is in use: ${plural(got.files, 'file')}, ${kb(got.bytes)}, kept ${where}.${got.removed ? ` The ${plural(got.removed, 'file')} it replaced ${got.removed === 1 ? 'was' : 'were'} removed.` : ''}${got.leftover ? ` ${plural(got.leftover, 'old file')} could not be removed; ${got.leftover === 1 ? 'it is' : 'they are'} not used.` : ''}`;
  } catch (e) { st.note = e?.message || 'The artwork was not kept.'; }
  finally { st.progress = null; st.busy = ''; }
  await ctx.redraw?.(); ctx.account?.redraw?.(); refresh();
}
async function startRemove() {
  if (st.busy) return;
  if (st.confirm !== 'remove') { st.confirm = 'remove'; refresh(); return; }
  st.confirm = ''; st.busy = 'remove'; st.note = '';
  try { const got = await removeArtwork(); st.note = `The artwork was removed${got.leftover ? `, but ${plural(got.leftover, 'file')} could not be cleared from storage` : ''}. The workspace uses its own line drawings again.`; }
  catch (e) { st.note = e?.message || 'The artwork was not removed.'; }
  finally { st.busy = ''; }
  await ctx.redraw?.(); ctx.account?.redraw?.(); refresh();
}

// ---- start ----------------------------------------------------------------------------------------------------------------
/**
 *   account   the page's account (account.js): whose records are in use, and the practice's artwork place
 *   store     the page's one store (cloud.js createSwitch): shared or not
 *   redraw    draws the page again
 */
export function mountArtwork({ account, store, redraw, doc = globalThis.document, win = globalThis.window } = {}) {
  ctx = { account, store, redraw, doc, win };
  if (!doc?.addEventListener) return { sync: syncArtwork };
  doc.addEventListener('click', (e) => {
    const el = e.target.closest?.('[data-art]');
    if (!el || el.disabled) return;
    const act = el.dataset.art;
    if (act === 'use') startSave();
    else if (act === 'cancel') { dropPreview(); st.prepared = null; st.note = ''; refresh(); }
    else if (act === 'remove') startRemove();
  });
  doc.addEventListener('change', (e) => {
    const input = e.target.closest?.('input[data-art-file]');
    if (!input?.files?.length) return;
    const files = [...input.files];
    input.value = '';
    startPrepare(files);
  });
  const zone = (e) => e.target.closest?.('[data-art-drop]');
  doc.addEventListener('dragover', (e) => { const z = zone(e); if (!z) return; e.preventDefault(); if (!z.classList.contains('over')) z.classList.add('over'); });
  doc.addEventListener('dragleave', (e) => { const z = zone(e); if (z && !z.contains(e.relatedTarget)) z.classList.remove('over'); });
  doc.addEventListener('drop', (e) => { const z = zone(e); if (!z) return; e.preventDefault(); z.classList.remove('over'); const files = [...(e.dataTransfer?.files ?? [])]; if (files.length) startPrepare(files); });
  const watch = (el) => { if (!el || typeof MutationObserver !== 'function') return; new MutationObserver(() => { dress(el); header(); }).observe(el, { childList: true, subtree: true }); };
  watch(doc.getElementById('app')); watch(doc.getElementById('account-panel'));
  let ticking = false;
  win?.addEventListener?.('scroll', () => { if (ticking) return; ticking = true; win.requestAnimationFrame(() => { ticking = false; parallax(); }); }, { passive: true });
  win?.addEventListener?.('resize', () => win.requestAnimationFrame(measure));
  doc.fonts?.ready?.then(() => measure()); // the heading's height changes once its typeface arrives
  return { sync: syncArtwork };
}

/** after the page draws: the header (the look may have changed), the empty screens, the band's place */
export function artAfterRender(root) { header(); dress(root); measure(); parallax(); }
