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
