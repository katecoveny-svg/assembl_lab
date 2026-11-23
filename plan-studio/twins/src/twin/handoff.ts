// The 3D page's side of a hand-over from the ops page (architecture/js/handoff.js keeps the file; this takes it).
// The ops page put the model in this browser's own storage under a one-off id and opened this page with ?handoff=<id>.
// Taking it deletes it. Keep these names the same as in architecture/js/handoff.js (tests/architecture/models-handoff.test.mjs checks).
export const HANDOFF_DB = 'assembl-handoff';
export const HANDOFF_STORE = 'files';
export const HANDOFF_PARAM = 'handoff';
export const HANDOFF_MAX_AGE = 60 * 60 * 1000;

/** what the ops page hands across about the site (architecture/js/site-sources-rules.js siteHandoff, plus the Blobs under files) */
export type HandoffSite = {
  point: { lat: number; lng: number; source: string } | null;
  camera_path: { pts: number[][]; sketch_file_id: string | null; traced_by: 'tool' | 'person'; confirmed_by: string | null; confirmed_at: string | null } | null;
  sources: { kind: string; name: string; file_id: string }[];
  files?: Record<string, Blob>;
  /** the project's latest saved fly-through (assembl.flight-path.v1), to carry on editing */
  flight?: unknown;
};
type Kept = { id: string; name: string; type: string; blob: Blob; at: number; site?: HandoffSite };

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

// ---- the way back, for everything else made here (agent/model-dress-1123): the fly-through, its film, shots and stills ---------
// Each is left in the same store as `${handoffId}:${kind}` (or `${handoffId}:${kind}:${part}` when there are several, such as the
// shots of a comparison), as { id, kind, handoff, name, type, data: Blob, meta, at }. The workspace takes them into the
// project's records when it next looks (architecture/js/handoff.js takeBacks), so nothing has to be downloaded and uploaded.
export type BackKind = 'flight' | 'film' | 'shot' | 'look';
export const backKey = (handoffId: string, kind: BackKind, part = '') => `${handoffId}:${kind}${part ? `:${part}` : ''}`;
export async function putBackRecord(handoffId: string, kind: BackKind, rec: { name: string; data: Blob; meta?: Record<string, unknown>; part?: string }, idb: IDBFactory | undefined = globalThis.indexedDB): Promise<string> {
  if (!handoffId) throw new Error('this page was not opened from a project, so there is nowhere to save it back to');
  if (!idb) throw new Error('this browser has no storage to pass it back in');
  const open = idb.open(HANDOFF_DB, 1);
  open.onupgradeneeded = () => { if (!open.result.objectStoreNames.contains(HANDOFF_STORE)) open.result.createObjectStore(HANDOFF_STORE, { keyPath: 'id' }); };
  const db = await req(open);
  try {
    const id = backKey(handoffId, kind, rec.part), tx = db.transaction(HANDOFF_STORE, 'readwrite');
    tx.objectStore(HANDOFF_STORE).put({ id, kind, handoff: handoffId, name: rec.name, type: rec.data.type, data: rec.data, meta: rec.meta ?? {}, at: Date.now() });
    await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error); });
    try { (globalThis as unknown as { opener?: Window | null }).opener?.postMessage({ type: 'assembl:back', handoff: handoffId, kind, id }, location.origin); } catch { /* no workspace window: the store has it */ }
    return id;
  } finally { db.close(); }
}
