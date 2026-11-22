// Storage for the architecture operations page. This is the only file that reads or writes saved records.
//
// The interface (every call returns a Promise, so a database can stand in later without changing the page):
//   store.list(kind, where?)        rows of one kind, optionally filtered, e.g. list('task', { project_id })
//   store.get(kind, id)             one row, or null
//   store.save(kind, row)           add or replace a row by its id; returns the row
//   store.remove(kind, id)          delete one row; returns true if it was there
//   store.loadProject(id)           a project with all of its rows (the "bundle"), or null
//   store.saveProject(bundle)       write a whole bundle
//   store.removeProject(id)         delete a project and everything under it
//   store.exportProject(id)         { file_name, text } for a project file
//   store.importProject(text)       read a project file in; returns { project_id, copied }
//   store.persistent                false when this browser will not keep anything (private mode, storage blocked)
//
// Files (added; the calls above are unchanged). A file belongs to one record: a document, or a project's plan model.
// The record keeps a small note of it (document.file / project.model.file = { id, name, type, size, kept_at });
// the contents are kept apart, so lists of records stay small.
//   store.putFile({ project_id, owner_kind, owner_id, name, type, data, id?, extra? })
//                                   keep a file; data is text, an ArrayBuffer or a Uint8Array. Returns the note.
//                                   extra (optional, a plain object) rides on the note: the Models section keeps a model's
//                                   version and summary there. A note without it has no extra field at all.
//                                   Throws a plain-worded Error when the file is over FILE_LIMIT or the browser refuses.
//   store.getFile(id)               the note plus { data: Uint8Array }, or null when the contents are not here
//   store.removeFile(id)            delete one file; returns true if it was there
//   store.listFiles(where?)         the notes only, e.g. listFiles({ project_id })
//   store.filesPersistent           false when this browser will not keep files past this tab
//   store.exportProject(id, now, { files: true })   the project file with the kept files inside it
//                                   (the answer also says files_included, file_count and file_bytes)
//   store.importProject(text)       also brings in any files the project file carries (the answer then adds files, files_failed)
//
// This version keeps the records in the browser's own storage (localStorage), one entry per kind of record, and the
// files in the browser's IndexedDB. It is one browser on one device: there is no sign-in, no sharing and no server copy.

import { emptyBundle, readBundle, writeBundle, copyBundle, fileSlug, newId } from './model.js';

export const KINDS = ['project', 'stage', 'task', 'document', 'approval', 'rfi', 'observation', 'variation', 'defect', 'checklist_item', 'activity', 'setting',
  // the Clients add-on (crm.js): practice-wide, not under a project. See crm-model.js for their shapes.
  'contact', 'enquiry', 'crm_activity'];
// where each kind of child row sits in a project bundle
const BUNDLE_LISTS = { stage: 'stages', task: 'tasks', document: 'documents', approval: 'approvals', rfi: 'rfis', observation: 'observations', variation: 'variations', defect: 'defects', checklist_item: 'checklist', activity: 'activity' };

/** localStorage if this browser allows it, otherwise null */
export function browserBackend() {
  try {
    const ls = globalThis.localStorage, probe = 'assembl.architecture.probe';
    ls.setItem(probe, '1'); ls.removeItem(probe);
    return ls;
  } catch {
    return null;
  }
}

/** an in-memory stand-in with the same three calls, for tests and for browsers that block storage */
export function memoryBackend() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => void m.set(k, String(v)), removeItem: (k) => void m.delete(k) };
}

// ---- files ------------------------------------------------------------------------------------------------------------
/** the most one kept file can be. Browser storage is shared with everything else this site keeps, so the limit is modest. */
export const FILE_LIMIT = 25 * 1024 * 1024;
export const OWNER_KINDS = ['document', 'model'];
/** "840 KB", "2.3 MB" */
export function sizeText(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} bytes`;
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / (1024 * 1024)).toFixed(n < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}
const toBytes = (data) => (typeof data === 'string' ? new TextEncoder().encode(data) : data instanceof Uint8Array ? data : data instanceof ArrayBuffer ? new Uint8Array(data) : ArrayBuffer.isView(data) ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength) : null);
export function bytesToBase64(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
export function base64ToBytes(text) {
  const bin = atob(text), out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** an in-memory place for files with the same four calls, for tests and for browsers with no IndexedDB */
export function memoryFiles({ quota = Infinity } = {}) {
  const m = new Map();
  const used = () => [...m.values()].reduce((n, r) => n + r.data.byteLength, 0);
  return {
    async put(meta, data) {
      const before = m.get(meta.id)?.data.byteLength ?? 0;
      if (used() - before + data.byteLength > quota) { const e = new Error('The quota has been exceeded.'); e.name = 'QuotaExceededError'; throw e; }
      m.set(meta.id, { meta: { ...meta }, data: data.slice() });
    },
    async get(id) { const r = m.get(id); return r ? { meta: { ...r.meta }, data: r.data.slice() } : null; },
    async delete(id) { return m.delete(id); },
    async list() { return [...m.values()].map((r) => ({ ...r.meta })); },
  };
}

/** the browser's IndexedDB as a place for files, or null when this browser has none */
export function browserFiles(name = 'assembl.architecture.files.v1') {
  const idb = globalThis.indexedDB;
  if (!idb) return null;
  let opening = null;
  const open = () => (opening ??= new Promise((resolve, reject) => {
    let rq;
    try { rq = idb.open(name, 1); } catch (err) { opening = null; return reject(err); }
    rq.onupgradeneeded = () => { const db = rq.result; if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'id' }); if (!db.objectStoreNames.contains('data')) db.createObjectStore('data'); };
    rq.onsuccess = () => { rq.result.onversionchange = () => { rq.result.close(); opening = null; }; resolve(rq.result); };
    rq.onerror = () => { opening = null; reject(rq.error ?? new Error('IndexedDB would not open')); };
    rq.onblocked = () => { opening = null; reject(new Error('IndexedDB is blocked by another tab')); };
  }));
  // one transaction over both stores: the note and the contents are written or removed together, or not at all
  const run = async (mode, work) => {
    const db = await open();
    return new Promise((resolve, reject) => {
      let out, t;
      try { t = db.transaction(['meta', 'data'], mode); } catch (err) { return reject(err); }
      t.oncomplete = () => resolve(out);
      t.onabort = t.onerror = () => reject(t.error ?? new Error('The browser stopped the write'));
      try { work(t.objectStore('meta'), t.objectStore('data'), (v) => { out = v; }); } catch (err) { try { t.abort(); } catch { /* already over */ } reject(err); }
    });
  };
  return {
    put: (meta, data) => run('readwrite', (M, D) => { M.put(meta); D.put(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength), meta.id); }),
    get: (id) => run('readonly', (M, D, set) => {
      let meta;
      M.get(id).onsuccess = (e) => { meta = e.target.result; };
      D.get(id).onsuccess = (e) => { const d = e.target.result; set(meta && d ? { meta, data: new Uint8Array(d) } : null); };
    }),
    delete: (id) => run('readwrite', (M, D, set) => { M.get(id).onsuccess = (e) => { set(!!e.target.result); M.delete(id); D.delete(id); }; }),
    list: () => run('readonly', (M, D, set) => { M.getAll().onsuccess = (e) => set(e.target.result ?? []); }),
  };
}

/** why a file could not be kept, in plain words */
function refusal(err, name) {
  const full = err?.name === 'QuotaExceededError' || /quota|full|space/i.test(String(err?.message ?? ''));
  return new Error(full
    ? `This browser is full, so “${name}” was not kept. Remove files you no longer need here, or keep the file where it is and record where.`
    : `This browser would not keep “${name}” (${String(err?.message ?? err ?? 'no reason given').slice(0, 120)}). Private windows and blocked site data stop files being kept. Keep the file where it is and record where.`);
}

export function createStore(backend, { prefix = 'assembl.architecture.v1.', files } = {}) {
  const persistent = !!backend;
  const real = backend ?? memoryBackend(), fallback = memoryBackend();
  // files go to the place given, else to the browser's IndexedDB, else (no IndexedDB: tests, old browsers) to memory
  const fileStore = files ?? browserFiles() ?? memoryFiles();
  let filesKept = files !== undefined ? !!files : !!globalThis.indexedDB;
  let failed = false; // set when a write is refused (storage full or closed): the page says so rather than losing work silently
  const check = (kind) => { if (!KINDS.includes(kind)) throw new Error(`Unknown kind of record: ${kind}`); };

  const read = (kind) => {
    check(kind);
    // after a refused write the newer copy is in memory, so look there first
    for (const b of failed ? [fallback, real] : [real, fallback]) {
      try {
        const raw = b.getItem(prefix + kind);
        if (raw) { const rows = JSON.parse(raw); if (rows && typeof rows === 'object') return rows; }
      } catch { /* unreadable: treat as empty rather than stopping the page */ }
    }
    return {};
  };
  const write = (kind, rows) => {
    const text = JSON.stringify(rows);
    try { real.setItem(prefix + kind, text); return; } catch { failed = true; }
    try { fallback.setItem(prefix + kind, text); } catch { /* nothing more can be done */ }
  };
  const copy = (row) => (row == null ? null : JSON.parse(JSON.stringify(row)));
  const matches = (row, where) => !where || Object.entries(where).every(([k, v]) => row?.[k] === v);

  const store = {
    get persistent() { return persistent && !failed; },

    async list(kind, where) {
      return Object.values(read(kind)).filter((r) => matches(r, where)).map(copy);
    },
    async get(kind, id) {
      return copy(read(kind)[id] ?? null);
    },
    async save(kind, row) {
      if (!row || typeof row.id !== 'string' || !row.id) throw new Error('A record needs an id before it can be saved.');
      const rows = read(kind); rows[row.id] = copy(row); write(kind, rows);
      return copy(row);
    },
    async remove(kind, id) {
      const rows = read(kind);
      if (!(id in rows)) return false;
      delete rows[id]; write(kind, rows);
      return true;
    },

    async loadProject(id) {
      const project = await store.get('project', id);
      if (!project) return null;
      const b = emptyBundle(); b.project = project;
      for (const [kind, list] of Object.entries(BUNDLE_LISTS)) b[list] = await store.list(kind, { project_id: id });
      b.activity.sort((x, y) => String(y.at).localeCompare(String(x.at)));
      b.approvals.sort((x, y) => String(x.at).localeCompare(String(y.at)));
      return b;
    },
    async saveProject(b) {
      if (!b?.project?.id) throw new Error('A project needs an id before it can be saved.');
      const id = b.project.id;
      // replace this project's rows of each kind, and leave every other project's rows alone
      for (const [kind, list] of Object.entries(BUNDLE_LISTS)) {
        const rows = read(kind);
        for (const k of Object.keys(rows)) if (rows[k]?.project_id === id) delete rows[k];
        for (const r of b[list] ?? []) rows[r.id] = copy({ ...r, project_id: id });
        write(kind, rows);
      }
      await store.save('project', b.project);
      return id;
    },
    // ---- files ----
    get filesPersistent() { return filesKept; },

    async putFile({ id, project_id, owner_kind, owner_id, name, type = '', data, extra } = {}) {
      const bytes = toBytes(data), label = String(name || 'file');
      if (!bytes) throw new Error('There is nothing in that file to keep.');
      if (!project_id || !owner_id || !OWNER_KINDS.includes(owner_kind)) throw new Error('A file needs the record it belongs to before it can be kept.');
      if (bytes.byteLength > FILE_LIMIT) throw new Error(`“${label}” is ${sizeText(bytes.byteLength)}. The limit is ${sizeText(FILE_LIMIT)} a file, because files are kept in this browser. Keep the file where it is and record where.`);
      const meta = { id: id || newId('file'), project_id, owner_kind, owner_id, name: label, type: String(type || ''), size: bytes.byteLength, kept_at: new Date().toISOString() };
      if (extra && typeof extra === 'object' && !Array.isArray(extra)) meta.extra = JSON.parse(JSON.stringify(extra)); // [models] what the page knows about the file (a model's version, its summary)
      try { await fileStore.put(meta, bytes); } catch (err) { throw refusal(err, label); }
      return { ...meta };
    },
    async getFile(id) {
      if (!id) return null;
      let r;
      try { r = await fileStore.get(id); } catch { return null; }
      return r ? { ...r.meta, data: r.data } : null;
    },
    async removeFile(id) {
      if (!id) return false;
      try { return !!(await fileStore.delete(id)); } catch { return false; }
    },
    async listFiles(where) {
      let all;
      try { all = await fileStore.list(); } catch { filesKept = false; return []; }
      return all.filter((r) => matches(r, where)).map(copy);
    },

    async removeProject(id) {
      for (const f of await store.listFiles({ project_id: id })) await store.removeFile(f.id);
      for (const kind of Object.keys(BUNDLE_LISTS)) {
        const rows = read(kind);
        for (const k of Object.keys(rows)) if (rows[k]?.project_id === id) delete rows[k];
        write(kind, rows);
      }
      return store.remove('project', id);
    },

    async exportProject(id, now, { files = false } = {}) {
      const b = await store.loadProject(id);
      if (!b) throw new Error('That project is not in this browser.');
      const d = new Date(now ?? Date.now()), day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; // the date where the person is
      const base = `${fileSlug(b.project.name)}-project-${day}`;
      // without files: the same file as before, plus a line saying the files are not in it
      if (!files) return { file_name: `${base}.json`, text: JSON.stringify(writeBundle(b, now), null, 2), files_included: false, file_count: 0, file_bytes: 0 };
      const out = [];
      let bytes = 0;
      for (const m of await store.listFiles({ project_id: id })) {
        const f = await store.getFile(m.id);
        if (!f) continue;
        bytes += f.size;
        out.push({ id: f.id, owner_kind: f.owner_kind, owner_id: f.owner_id, name: f.name, type: f.type, size: f.size, kept_at: f.kept_at, ...(f.extra ? { extra: f.extra } : {}), data_base64: bytesToBase64(f.data) });
      }
      return { file_name: `${base}-with-files.json`, text: JSON.stringify(writeBundle(b, now, out), null, 2), files_included: true, file_count: out.length, file_bytes: bytes };
    },
    async importProject(text, now) {
      let b = readBundle(text), copied = false;
      // a project already here is never overwritten: the file comes in beside it as a copy with ids of its own
      if (await store.get('project', b.project.id)) { b = copyBundle(b, now); copied = true; }
      await store.saveProject(b);
      // files the project file carries are kept here too; one the browser refuses is counted, not hidden
      let kept = 0, refused = 0;
      for (const f of b.files ?? []) {
        try { await store.putFile({ id: f.id, project_id: b.project.id, owner_kind: f.owner_kind, owner_id: f.owner_id, name: f.name, type: f.type, extra: f.extra, data: base64ToBytes(f.data_base64) }); kept++; } catch { refused++; }
      }
      // a project file with no files in it answers exactly as before; one that carries files also says how many were kept
      return Array.isArray(b.files) ? { project_id: b.project.id, copied, files: kept, files_failed: refused } : { project_id: b.project.id, copied };
    },
  };
  return store;
}

/**
 * Put one entry in this tab's session storage for another of the lab's pages to pick up (used to hand a plan model to
 * the 3D page). It is not a saved record: it lasts as long as the tab. Throws a plain-worded Error when the browser
 * refuses, which is what happens when the entry is bigger than the browser allows (about 5 MB).
 */
export function sessionHandoff(key, value) {
  let ss;
  try { ss = globalThis.sessionStorage; } catch { ss = null; }
  if (!ss) throw new Error('This browser is not letting the page pass the model to the 3D page.');
  try { ss.setItem(key, value); } catch { throw new Error(`The model is too big to pass to the 3D page from here (${sizeText(value.length)}; browsers allow about 5 MB).`); }
  return true;
}
