// Handing a model from the ops page to the 3D page, inside one browser.
//
// The ops page puts the file in this browser's own storage (IndexedDB) under a one-off id, then opens the 3D page with
// ?handoff=<id>. The 3D page takes it out (which deletes it) and reads it as if it had been chosen there. Because
// nothing depends on the two pages talking to each other, it works whether the browser opens a new tab, replaces this
// page with the 3D one (the Claude app's browser pane does), or blocks the new tab until the person presses again.
//
// What it keeps, and for how long: one copy of the file, on this device only, until the 3D page takes it. Anything left
// for more than an hour (a 3D page that never opened) is cleared the next time a model is handed across.
//
// The 3D page has its own reader of the same store: plan-studio/twins/src/twin/handoff.ts. Keep the names below the
// same in both (tests/architecture/models-handoff.test.mjs checks).
export const HANDOFF_DB = 'assembl-handoff';
export const HANDOFF_STORE = 'files';
export const HANDOFF_PARAM = 'handoff';
export const HANDOFF_MAX_AGE = 60 * 60 * 1000;

const req = (r) => new Promise((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
const done = (tx) => new Promise((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error ?? new Error('stopped')); });

function openDb(idb) {
  if (!idb) return Promise.reject(new Error('This browser has no storage to pass the model across in. Open the 3D page and choose the file there.'));
  const r = idb.open(HANDOFF_DB, 1);
  r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(HANDOFF_STORE)) r.result.createObjectStore(HANDOFF_STORE, { keyPath: 'id' }); };
  return req(r);
}

const newId = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);

/**
 * keep a file for the 3D page; returns the id to put in its address. Clears hand-overs older than an hour first.
 * site (optional, from Site and sources): { point, camera_path, sources: [{ kind, name, file_id }], files: { <kind>: Blob } }, kept in the
 * same record, so the model and what the walkthrough needs about the site arrive together.
 */
export async function putHandoff(blob, name, { idb = globalThis.indexedDB, now = Date.now(), site = null } = {}) {
  const db = await openDb(idb);
  try {
    const id = newId();
    const tx = db.transaction(HANDOFF_STORE, 'readwrite'), st = tx.objectStore(HANDOFF_STORE);
    const all = await req(st.getAll());
    for (const x of all ?? []) if (!(now - (x?.at ?? 0) < HANDOFF_MAX_AGE)) st.delete(x.id);
    st.put({ id, name: String(name ?? 'model'), type: blob?.type ?? '', blob, at: now, ...(site ? { site } : {}) });
    await done(tx);
    return id;
  } catch (e) {
    throw /quota/i.test(`${e?.name} ${e?.message}`) ? new Error('This browser has no room to pass a model this big across. Download it, then choose it on the 3D page.') : e;
  } finally { db.close(); }
}

/** take a handed-over file out (it is deleted as it is taken): { name, type, blob, site }, or null when there is none. site is null when none was handed across. */
export async function takeHandoff(id, { idb = globalThis.indexedDB, now = Date.now() } = {}) {
  if (!id) return null;
  const db = await openDb(idb);
  try {
    const tx = db.transaction(HANDOFF_STORE, 'readwrite'), st = tx.objectStore(HANDOFF_STORE);
    const got = await req(st.get(String(id)));
    if (got) st.delete(got.id);
    await done(tx);
    if (!got || !(now - (got.at ?? 0) < HANDOFF_MAX_AGE)) return null;
    return { name: got.name, type: got.type, blob: got.blob, site: got.site ?? null };
  } finally { db.close(); }
}

/**
 * Everything the 3D page passed back for a hand-over (records with ids `${handoffId}:…`: the camera path, the fly-through, films,
 * shots, the look), taken out of the store: they are deleted as they are read, so each goes into the project once.
 */
export async function takeBacks(handoffId, { idb = globalThis.indexedDB } = {}) {
  if (!handoffId || !idb) return [];
  const db = await openDb(idb);
  try {
    const tx = db.transaction(HANDOFF_STORE, 'readwrite'), st = tx.objectStore(HANDOFF_STORE);
    const all = (await req(st.getAll())) ?? [], mine = all.filter((x) => String(x?.id ?? '').startsWith(`${handoffId}:`));
    for (const x of mine) st.delete(x.id);
    await done(tx);
    return mine.map((x) => (x.kind ? x : { ...x, kind: String(x.id).endsWith(':path') ? 'camera_path' : '' }));
  } finally { db.close(); }
}

// ---- the practice's brand, for the 3D page opened from its workspace ---------------------------------------------------------
// The 3D page (same origin, plan-studio/twins/src/twin/practiceLook.ts) shows the practice's display name and logo in its header in
// place of assembl's. Kept in this browser under BRAND_KEY as { name, logo, at }: logo is the header's own logo image as a data URL
// (small: a blob: address would not open in another tab), or ''. Never an id: a name that looks like one is left out.
export const BRAND_KEY = 'assembl.architecture.practice-brand';
const looksLikeId = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(s ?? '').trim());
export function brandRecord(name, logo = '') {
  const n = String(name ?? '').trim().slice(0, 60);
  return { name: n && !looksLikeId(n) ? n : '', logo: /^data:image\/(png|svg\+xml|webp|jpeg);base64,/.test(logo) && logo.length < 400_000 ? logo : '', at: Date.now() };
}
export async function keepBrand(name, { doc = globalThis.document, storage = globalThis.localStorage, fetcher = globalThis.fetch } = {}) {
  let logo = '';
  try {
    const src = doc?.querySelector?.('img.art-logo')?.src ?? '';
    if (src && fetcher) {
      const b = await (await fetcher(src)).blob();
      if (b.size < 300_000) logo = await new Promise((res) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => res(''); r.readAsDataURL(b); });
    }
  } catch { /* the name alone */ }
  const rec = brandRecord(name, logo);
  // one of the practice's line drawings, for the film's title card on the 3D page (feat/photoreal-render-button); left out when
  // there is none, or it cannot be made small enough to keep beside the logo
  try { const d = await drawingForBrand(doc, fetcher); if (d) rec.drawing = d; } catch { /* the title card draws the model's own lines */ }
  try { storage?.setItem(BRAND_KEY, JSON.stringify(rec)); } catch { /* the 3D page shows assembl's word mark */ }
  return rec;
}
/** the drawing as { src: data URL (PNG, at most 1200 px wide), mode: 'mask' | 'image', colour }, or null */
export const BRAND_DRAWING_MAX = 1_500_000;
async function drawingForBrand(doc, fetcher) {
  if (!doc?.createElement || !fetcher || typeof createImageBitmap !== 'function') return null;
  const { brandDrawing } = await import('./artwork.js');
  const d = brandDrawing?.();
  if (!d?.src) return null;
  const bmp = await createImageBitmap(await (await fetcher(d.src)).blob());
  const k = Math.min(1, 1200 / bmp.width), c = doc.createElement('canvas');
  c.width = Math.max(1, Math.round(bmp.width * k)); c.height = Math.max(1, Math.round(bmp.height * k));
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  const src = c.toDataURL('image/png');
  return brandDrawingRecord({ src, mode: d.mode, colour: d.colour });
}
/** a drawing record, checked: a PNG/WebP/JPEG data URL under BRAND_DRAWING_MAX, a known mode and a #rrggbb colour; else null */
export function brandDrawingRecord(d) {
  const src = String(d?.src ?? '');
  if (!/^data:image\/(png|webp|jpeg);base64,/.test(src) || src.length > BRAND_DRAWING_MAX) return null;
  return { src, mode: d.mode === 'image' ? 'image' : 'mask', colour: /^#[0-9a-f]{6}$/i.test(String(d.colour ?? '')) ? d.colour : '#8BA2FF' };
}
