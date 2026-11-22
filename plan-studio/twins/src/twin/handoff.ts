// The 3D page's side of a hand-over from the ops page (architecture/js/handoff.js keeps the file; this takes it).
// The ops page put the model in this browser's own storage under a one-off id and opened this page with ?handoff=<id>.
// Taking it deletes it. Keep these names the same as in architecture/js/handoff.js (tests/architecture/models-handoff.test.mjs checks).
export const HANDOFF_DB = 'assembl-handoff';
export const HANDOFF_STORE = 'files';
export const HANDOFF_PARAM = 'handoff';
export const HANDOFF_MAX_AGE = 60 * 60 * 1000;

/** What the workspace knows about the project's site, handed across with the model (optional: older hand-overs have none). */
export interface HandoffSite {
  point: { lat: number; lng: number; source: string } | null;
  camera_path: Record<string, unknown> | null;
  sources: unknown[];
  files: { drawing_set?: Blob; site_plan?: Blob; camera_sketch?: Blob };
}
type Kept = { id: string; name: string; type: string; blob: Blob; at: number; site?: HandoffSite | null };

const req = <T>(r: IDBRequest<T>) => new Promise<T>((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });

export async function takeHandoff(id: string, idb: IDBFactory | undefined = globalThis.indexedDB): Promise<{ name: string; type: string; blob: Blob; site: HandoffSite | null } | null> {
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
    return { name: got.name, type: got.type, blob: got.blob, site: got.site ?? null };
  } finally { db.close(); }
}

// ---- the way back: a confirmed camera path for the workspace to save into the project ---------------------------------------
// The 3D page cannot write the project's records. It leaves the path in the same store, under `${handoffId}:path`, as
//   { id: `${handoffId}:path`, kind: 'camera_path', handoff: handoffId, name: <model file name>, path: <CameraPath, camPath.ts>, at: <ms> }
// and, when the workspace opened this page, also posts it to that window as
//   { type: 'assembl:camera-path', handoff: handoffId, path }   (target origin: this page's own origin)
// The workspace's helper takes it from the store (and deletes it) when it next looks. Note that the workspace's putHandoff clears
// every record in the store older than HANDOFF_MAX_AGE (one hour), this one included, so it should be read within the hour.
export const pathKey = (handoffId: string) => `${handoffId}:path`;
export async function putPathBack(handoffId: string, name: string, path: unknown, idb: IDBFactory | undefined = globalThis.indexedDB): Promise<string> {
  if (!handoffId) throw new Error('this page was not opened from a workspace, so there is no project to save the path to');
  if (!idb) throw new Error('this browser has no storage to pass the path back in');
  const open = idb.open(HANDOFF_DB, 1);
  open.onupgradeneeded = () => { if (!open.result.objectStoreNames.contains(HANDOFF_STORE)) open.result.createObjectStore(HANDOFF_STORE, { keyPath: 'id' }); };
  const db = await req(open);
  try {
    const tx = db.transaction(HANDOFF_STORE, 'readwrite'), id = pathKey(handoffId);
    tx.objectStore(HANDOFF_STORE).put({ id, kind: 'camera_path', handoff: handoffId, name, path, at: Date.now() });
    await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error); });
    try { (globalThis as unknown as { opener?: Window | null }).opener?.postMessage({ type: 'assembl:camera-path', handoff: handoffId, path }, location.origin); } catch { /* no workspace window: the store has it */ }
    return id;
  } finally { db.close(); }
}
