// One library for a project's files, with no page in it, so it can be tested on its own.
//
// The workspace keeps files in three places that grew up separately: documents (owner_kind 'document', a record per
// document), the Models section (owner_kind 'model') and Site and sources (owner_kind 'source', a slot each). This file
// reads all three and gives back one list a person can look at: every file once, as a tile, grouped with its versions,
// and sorted into a few kinds a practice thinks in (drawings, models, site, photos, stills, films, other).
//
// It also settles "which model is the project's model": the uploaded IFC or GLB (wherever it was uploaded) is the model.
// The plan model (the JSON the plan reader writes, project.model) is an internal detail the 3D page reads plans from; it is
// only the model when nothing has been uploaded.
//
// Nothing here writes. Each function takes plain records and returns plain records.
import { isSource, sourceExtra } from './site-sources-rules.js';

/** the kinds of tile, in the order the filter chips show them: [key, label, icon] */
export const KINDS = [
  ['drawings', 'Drawings', 'drawings'],
  ['models', 'Models', 'cube'],
  ['site', 'Site', 'site'],
  ['photos', 'Photos', 'photo'],
  ['stills', 'Stills', 'photo'],
  ['films', 'Films', 'film'],
  ['other', 'Other', 'file'],
];
export const KIND_KEYS = KINDS.map((k) => k[0]);

export const ext = (name) => (String(name ?? '').toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? '');
const norm = (s) => String(s ?? '').trim().normalize('NFC').toLowerCase();
export const IMAGE = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'avif'];
export const VIDEO = ['mp4', 'webm', 'mov', 'm4v'];
export const MODEL = ['ifc', 'ifczip', 'glb', 'gltf', 'rvt', 'rfa', 'nwc', 'nwd'];
/** the model kinds the 3D page opens */
export const OPENS_IN_3D = ['ifc', 'ifczip', 'glb'];
export const SHEET = ['pdf', 'dwg', 'dxf'];
const SITE_SLOTS = ['site_plan', 'survey', 'camera_sketch', 'flythrough', 'walk_review', 'design_interior', 'design_exterior'];

/** what kind of tile a kept file is. doc is the document record that holds it, when it is a document's file. */
export function kindOf(note, doc = null) {
  const e = ext(note?.name);
  const slot = note?.owner_kind === 'source' ? note?.extra?.source?.slot : '';
  if (SITE_SLOTS.includes(slot)) return 'site';
  if (MODEL.includes(e)) return 'models';
  if (VIDEO.includes(e)) return 'films';
  if (IMAGE.includes(e)) {
    if (doc?.kind === 'Photo' || /photo/i.test(doc?.kind ?? '')) return 'photos';
    if (slot === 'films' || note?.extra?.still || note?.extra?.from_3d) return 'stills';
    return doc ? 'photos' : 'stills';
  }
  if (SHEET.includes(e)) return 'drawings';
  if (slot === 'drawing_set') return 'drawings';
  if (doc && /drawing|plan|consent|report|spec/i.test(doc.kind ?? '')) return 'drawings';
  return 'other';
}

/** the media a tile previews as: 'image', 'video', 'pdf', 'model' or 'file' */
export function mediaOf(name) {
  const e = ext(name);
  if (IMAGE.includes(e)) return 'image';
  if (VIDEO.includes(e)) return 'video';
  if (e === 'pdf') return 'pdf';
  if (MODEL.includes(e)) return 'model';
  return 'file';
}

const byKept = (a, b) => String(a.kept_at ?? '').localeCompare(String(b.kept_at ?? '')) || String(a.id).localeCompare(String(b.id));
const verOf = (n) => Number(n?.extra?.source?.version ?? n?.extra?.model?.version ?? n?.version ?? 0) || 0;

/**
 * Every kept file of a project as library items.
 *   project    the project record (its plan model's file, project.model.file, is left out: it is the internal plan model)
 *   files      the kept file notes (store.listFiles({ project_id }))
 *   documents  the project's document records (for titles, kinds and stages)
 * Returns [{ key, kind, name, title, media, latest, versions: [note, ...newest first], count, doc, stage, kept_at, size }],
 * newest first. Files of the same kind and name are versions of one item; a still or a film is never folded into another
 * still or film of a different name (each upload of a different picture is its own tile).
 */
export function libraryOf({ project = null, files = [], documents = [] } = {}) {
  const docByFile = new Map(), docById = new Map();
  for (const d of documents ?? []) { docById.set(d.id, d); if (d.file?.id) docByFile.set(d.file.id, d); }
  const planFile = project?.model?.file?.id ?? '';
  const groups = new Map();
  for (const f of files ?? []) {
    if (!f?.id || f.id === planFile) continue;
    if (f.owner_kind === 'source' && !isSource(f)) continue;
    if (f.extra?.browser_copy_of) continue; // a browser copy shows with the model it was made from
    const doc = f.owner_kind === 'document' ? (docByFile.get(f.id) ?? docById.get(f.owner_id) ?? null) : null;
    const kind = kindOf(f, doc);
    const key = `${kind}:${norm(f.name)}`;
    if (!groups.has(key)) groups.set(key, { key, kind, docs: [], list: [] });
    const g = groups.get(key);
    g.list.push(f);
    if (doc) g.docs.push(doc);
  }
  const items = [...groups.values()].map((g) => {
    const versions = [...g.list].sort((a, b) => verOf(b) - verOf(a) || byKept(b, a));
    const latest = versions[0], doc = g.docs.find((d) => d.file?.id === latest.id) ?? g.docs[0] ?? null;
    return {
      key: g.key, kind: g.kind, name: latest.name, title: doc?.title || latest.name, media: mediaOf(latest.name), latest, versions,
      count: versions.length, doc, stage: doc?.stage ?? '', kept_at: latest.kept_at ?? '', size: Number(latest.size) || 0,
      copy: (files ?? []).find((c) => c.extra?.browser_copy_of === latest.id) ?? null,
    };
  });
  return items.sort((a, b) => String(b.kept_at).localeCompare(String(a.kept_at)) || a.name.localeCompare(b.name));
}

/** documents that name no kept file: shown as empty tiles so a person can attach one */
export const docsWithoutFiles = (documents = [], files = []) => {
  const ids = new Set((files ?? []).map((f) => f.id));
  return (documents ?? []).filter((d) => !d.file?.id || !ids.has(d.file.id));
};

/** how many items of each kind: { all, drawings, models, ... } */
export function counts(items = []) {
  const c = Object.fromEntries([['all', items.length], ...KIND_KEYS.map((k) => [k, 0])]);
  for (const it of items) c[it.kind] = (c[it.kind] ?? 0) + 1;
  return c;
}

export const ofKind = (items, kind) => (!kind || kind === 'all' ? items : items.filter((i) => i.kind === kind));

/**
 * The project's one model.
 *   { kind: 'uploaded', note, opens: true|false, why }   an uploaded IFC or GLB (or a Revit file, which does not open in 3D)
 *   { kind: 'plan', model }                              no upload: the plan model the plan reader wrote
 *   null                                                 no model at all
 * An uploaded model wins wherever it was uploaded (the Models section or Site and sources). Of several, the newest of a
 * kind that opens in 3D wins; a browser copy of it is what opens.
 */
export function primaryModel(project, files = []) {
  const planFile = project?.model?.file?.id ?? '';
  const all = (files ?? []).filter((f) => f?.id && f.id !== planFile && !SITE_SLOTS.includes(f.extra?.source?.slot) && MODEL.includes(ext(f.name)) && (f.owner_kind === 'model' || f.owner_kind === 'source'));
  const originals = all.filter((f) => !f.extra?.browser_copy_of);
  const opens = originals.filter((f) => OPENS_IN_3D.includes(ext(f.name))).sort((a, b) => byKept(b, a));
  const pick = opens[0] ?? originals.sort((a, b) => byKept(b, a))[0] ?? all.sort((a, b) => byKept(b, a))[0] ?? null;
  if (pick) {
    const copy = all.filter((c) => c.extra?.browser_copy_of === pick.id).sort((a, b) => byKept(b, a))[0] ?? null;
    const openable = !!copy || OPENS_IN_3D.includes(ext(pick.name));
    return { kind: 'uploaded', note: pick, open: copy ?? (openable ? pick : null), opens: openable, why: openable ? '' : 'A Revit file does not open in a browser: export an IFC or a GLB.' };
  }
  if (project?.model?.fingerprint) return { kind: 'plan', model: project.model };
  return null;
}

/**
 * How a tile's thumbnail is made, or 'skip'. remote: a short-lived link to the file can be had (a practice's shared records),
 * so a PDF's first sheet is read by range and a film streams, without downloading the whole file.
 *   { how: 'url' | 'bytes' | 'skip', media }
 */
export const THUMB_LIMITS = {
  remote: { image: 80 * 1024 * 1024, pdf: 600 * 1024 * 1024, video: 4 * 1024 * 1024 * 1024, model: 60 * 1024 * 1024 },
  local: { image: 40 * 1024 * 1024, pdf: 80 * 1024 * 1024, video: 300 * 1024 * 1024, model: 60 * 1024 * 1024 },
};
export function thumbPlan(note, { remote = false } = {}) {
  const media = mediaOf(note?.name), size = Number(note?.size) || 0, lim = THUMB_LIMITS[remote ? 'remote' : 'local'];
  if (!lim[media]) return { how: 'skip', media };
  if (media === 'model' && !['glb', 'ifc'].includes(ext(note.name))) return { how: 'skip', media };
  if (size > lim[media]) return { how: 'skip', media };
  return { how: remote && media !== 'model' ? 'url' : 'bytes', media };
}
/** the key a drawn thumbnail is kept under in this browser: a new version of the file, or a new way of drawing, draws again */
export const THUMB_STYLE = 2;
export const thumbKey = (note) => `${note.id}:${Number(note.size) || 0}:${THUMB_STYLE}`;

/** the words on a project's cover: one model concept everywhere (the header, the wall tile, the practice-artwork cover) */
export const coverNote = (project, files) => (primaryModel(project, files) ? 'Model attached' : 'No model yet');

/** true when the project has any model (uploaded or the plan model) */
export const hasAnyModel = (project, files) => !!primaryModel(project, files);

/** the version a new upload of this name and kind becomes */
export function nextVersionFor(items, kind, name) {
  const it = items.find((i) => i.key === `${kind}:${norm(name)}`);
  return it ? Math.max(...it.versions.map((v) => verOf(v) || 1), it.versions.length) + 1 : 1;
}

/**
 * Where a file dropped on the library is kept. Everything dropped here is kept as a source (owner_kind 'source'): models
 * and drawing sets in the slot the 3D page reads them from, the rest as 'films' (pictures and films) or 'other'.
 */
export function slotForUpload(name) {
  const e = ext(name);
  if (e === 'pdf') return 'drawing_set';
  if (VIDEO.includes(e) || IMAGE.includes(e)) return 'films';
  if (e === 'json') return 'flythrough';
  return 'other';
}
export const uploadExtra = ({ name, version, by = '', still = false }) => {
  const extra = sourceExtra({ slot: slotForUpload(name), version, by });
  if (still || IMAGE.includes(ext(name))) extra.still = true;
  extra.library = true;
  return extra;
};

/** "3 Nov" from a date and time */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function shortDay(v) {
  const d = new Date(v);
  return !v || Number.isNaN(d.getTime()) ? '' : `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
