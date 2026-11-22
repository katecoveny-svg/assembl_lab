// The 3D page's side of a hand-over from the ops page (architecture/js/handoff.js keeps the file; this takes it).
// The ops page put the model in this browser's own storage under a one-off id and opened this page with ?handoff=<id>.
// Taking it deletes it. Keep these names the same as in architecture/js/handoff.js (tests/architecture/models-handoff.test.mjs checks).
export const HANDOFF_DB = 'assembl-handoff';
export const HANDOFF_STORE = 'files';
export const HANDOFF_PARAM = 'handoff';
export const HANDOFF_MAX_AGE = 60 * 60 * 1000;

type Kept = { id: string; name: string; type: string; blob: Blob; at: number };

const req = <T>(r: IDBRequest<T>) => new Promise<T>((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });

export async function takeHandoff(id: string, idb: IDBFactory | undefined = globalThis.indexedDB): Promise<{ name: string; type: string; blob: Blob } | null> {
  if (!id || !idb) return null;
  const open = idb.open(HANDOFF_DB, 1);
  open.onupgradeneeded = () => { if (!open.result.objectStoreNames.contains(HANDOFF_STORE)) open.result.createObjectStore(HANDOFF_STORE, { keyPath: 'id' }); };
  const db = await req(open);
  try {
    const tx = db.transaction(HANDOFF_STORE, 'readwrite'), st = tx.objectStore(HANDOFF_STORE);
    const got = (await req(st.get(String(id)))) as Kept | undefined;
    if (got) st.delete(got.id);
    await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error); });
    if (!got || !(Date.now() - (got.at ?? 0) < HANDOFF_MAX_AGE)) return null;
    return { name: got.name, type: got.type, blob: got.blob };
  } finally { db.close(); }
}
