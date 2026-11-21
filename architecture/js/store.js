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
// This version keeps everything in the browser's own storage (localStorage), one entry per kind of record.
// It is one browser on one device: there is no sign-in, no sharing and no server copy.

import { emptyBundle, readBundle, writeBundle, copyBundle, fileSlug } from './model.js';

export const KINDS = ['project', 'stage', 'task', 'document', 'approval', 'rfi', 'observation', 'variation', 'defect', 'checklist_item', 'activity', 'setting'];
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

export function createStore(backend, { prefix = 'assembl.architecture.v1.' } = {}) {
  const persistent = !!backend;
  const real = backend ?? memoryBackend(), fallback = memoryBackend();
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
    async removeProject(id) {
      for (const kind of Object.keys(BUNDLE_LISTS)) {
        const rows = read(kind);
        for (const k of Object.keys(rows)) if (rows[k]?.project_id === id) delete rows[k];
        write(kind, rows);
      }
      return store.remove('project', id);
    },

    async exportProject(id, now) {
      const b = await store.loadProject(id);
      if (!b) throw new Error('That project is not in this browser.');
      const d = new Date(now ?? Date.now()), day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; // the date where the person is
      return { file_name: `${fileSlug(b.project.name)}-project-${day}.json`, text: JSON.stringify(writeBundle(b, now), null, 2) };
    },
    async importProject(text, now) {
      let b = readBundle(text), copied = false;
      // a project already here is never overwritten: the file comes in beside it as a copy with ids of its own
      if (await store.get('project', b.project.id)) { b = copyBundle(b, now); copied = true; }
      await store.saveProject(b);
      return { project_id: b.project.id, copied };
    },
  };
  return store;
}
