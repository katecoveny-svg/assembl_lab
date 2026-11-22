// The rules behind the Models section, with no page in them, so they can be tested on their own: which files it keeps,
// how to tell them apart, how big each may be where it is kept (and what to say when one is too big), and version numbers.
//
// A kept model is a kept file (store.putFile) with owner_kind 'model' and owner_id the project's id, the same as the
// plan model the 3D tile keeps. Models are told apart from that plan model by their kind: the plan model is a .json.
// Its note carries extra.model = { kind, version, by, thumb? } and, for an IFC, extra.ifc = the summary (ifc-summary.js).
import { FILE_LIMIT as BROWSER_LIMIT, sizeText as storeSize } from './store.js';

export { BROWSER_LIMIT };
/** "840 KB", "180 MB", "1 GB", "1.5 GB" */
export function sizeText(bytes) {
  const n = Number(bytes) || 0, g = 1024 ** 3;
  return n >= g ? `${(n / g).toFixed(1).replace(/\.0$/, '')} GB` : storeSize(n);
}
/** the most one model can be in a practice's shared records (the bucket's limit: supabase/migrations/20261122120000_arch_files_bucket_limit.sql) */
export const SHARED_MODEL_LIMIT = 1024 * 1024 * 1024;
/** a shared file bigger than this goes up in 6 MB parts that can pause and pick up again (Supabase's resumable uploads) */
export const PART_SIZE = 6 * 1024 * 1024;
/** an IFC bigger than this is not drawn in the page by itself: it is drawn when someone asks */
export const AUTO_PREVIEW_LIMIT = 60 * 1024 * 1024;
/** the biggest IFC or GLB this browser is asked to draw in 3D: the small view on a model's card and the 3D page. A cautious
 * figure, not measured at its edge: in testing, an IFC of nearly 400 MB froze a browser while the 3D page read it. A bigger model stays kept, counted and downloadable; it is not drawn here.
 * The 3D page holds the same figure (plan-studio/twins/src/twin/projectPlan.ts, BROWSER_3D_LIMIT). */
export const BROWSER_3D_LIMIT = 100 * 1024 * 1024;
export const tooBigFor3d = (size) => Number(size) > BROWSER_3D_LIMIT;

// ---- kinds ---------------------------------------------------------------------------------------------------------
const OLE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
const starts = (b, sig) => sig.every((x, i) => b[i] === x);
const ascii = (b, n = 1024) => String.fromCharCode(...b.subarray(0, Math.min(n, b.length)));
/**
 *   tag     the short mark on the card          word   what it is, in plain words
 *   family  revit | ifc | navis | drawing | glb  look   'model' or 'sheet' (the line icon)
 *   read    the page reads it (counts, 3D)       to3d   the 3D page opens it: 'model' (IFC, GLB) or 'plan' (a plan PDF)
 *   sniff   how the first bytes of a real one look (null: not checked)
 */
export const KINDS = {
  rvt: { tag: 'RVT', word: 'Revit model', family: 'revit', look: 'model', sniff: (b) => starts(b, OLE) },
  rfa: { tag: 'RFA', word: 'Revit family', family: 'revit', look: 'model', sniff: (b) => starts(b, OLE) },
  ifc: { tag: 'IFC', word: 'IFC model', family: 'ifc', look: 'model', read: true, to3d: 'model', sniff: (b) => /^\s*ISO-10303-21\s*;/.test(ascii(b, 64).replace(/^ï»¿/, '')) || starts(b, [0x50, 0x4b, 3, 4]) },
  ifczip: { tag: 'IFCZIP', word: 'IFC model, zipped', family: 'ifc', look: 'model', read: true, to3d: 'model', sniff: (b) => starts(b, [0x50, 0x4b, 3, 4]) },
  nwc: { tag: 'NWC', word: 'Navisworks cache', family: 'navis', look: 'model', sniff: null },
  nwd: { tag: 'NWD', word: 'Navisworks model', family: 'navis', look: 'model', sniff: null },
  dwg: { tag: 'DWG', word: 'CAD drawing', family: 'drawing', look: 'sheet', sniff: (b) => /^AC10\d\d/.test(ascii(b, 6)) },
  pdf: { tag: 'PDF', word: 'Drawing set', family: 'drawing', look: 'sheet', to3d: 'plan', sniff: (b) => ascii(b).includes('%PDF-') },
  glb: { tag: 'GLB', word: '3D model', family: 'glb', look: 'model', read: true, to3d: 'model', sniff: (b) => starts(b, [0x67, 0x6c, 0x54, 0x46]) },
};
export const ACCEPT = Object.keys(KINDS).map((k) => `.${k}`).join(',');
export const ext = (name) => (String(name ?? '').toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? '');
export const kindOf = (name) => (KINDS[ext(name)] ? ext(name) : null);

/** Is this file what its name says? Returns '' when it is, or a plain sentence when it is not. head: its first bytes. */
export function checkKind(name, head) {
  const k = kindOf(name);
  if (!k) return `“${name}” is not a kind of model this keeps. It keeps ${Object.values(KINDS).map((x) => x.tag).join(', ')}.`;
  const sniff = KINDS[k].sniff;
  if (!sniff || !head?.length) return head?.length === 0 ? `“${name}” is empty.` : '';
  return sniff(head) ? '' : `“${name}” does not start the way a ${KINDS[k].tag} file does, so it was not kept. Check it opens where it was made.`;
}

// ---- where a model is kept, and how big it may be --------------------------------------------------------------------
/**
 * Where a new model for this project would go, and its limit.
 *   shared   the page is using a practice's shared records       sample  the project is the Sample (always in this browser)
 *   viewer   the person is a viewer in the practice (adds nothing) signIn  account.state: { phase, shared, practice }
 */
export function placeFor({ shared = false, sample = false, viewer = false, practice = '', signIn = {} } = {}) {
  if (shared && !sample) return { where: 'shared', limit: SHARED_MODEL_LIMIT, viewer, line: `Kept in the shared records of ${practice || 'your practice'}, up to ${sizeText(SHARED_MODEL_LIMIT)} a file.` };
  const why = sample && shared ? 'sample' : signIn.phase === 'in' ? (signIn.shared === 'ready' ? 'no_practice' : 'not_on') : signIn.shared === 'ready' ? 'signed_out' : 'not_on';
  return { where: 'browser', limit: BROWSER_LIMIT, viewer: false, why, line: `Kept in this browser, up to ${sizeText(BROWSER_LIMIT)} a file.` };
}

/** '' when the file can be kept where the project is kept; otherwise what to say, with its size */
export function sizeProblem({ name, size }, place) {
  const label = `“${name}” is ${sizeText(size)}.`;
  if (!size) return `“${name}” is empty, so there is nothing to keep.`;
  if (size <= place.limit) return '';
  if (place.where === 'shared') return `${label} The shared records take models up to ${sizeText(SHARED_MODEL_LIMIT)} a file. Keep the file where it is, and note where.`;
  const big = `${label} This browser keeps models up to ${sizeText(BROWSER_LIMIT)}.`;
  return {
    signed_out: `${big} Sign in to keep big models in your practice’s shared records, up to ${sizeText(SHARED_MODEL_LIMIT)} a file.`,
    no_practice: `${big} Start or join a practice (Practice, at the top) to keep big models in its shared records, up to ${sizeText(SHARED_MODEL_LIMIT)} a file.`,
    sample: `${big} The Sample stays in this browser. Open one of your practice’s projects to keep a big model in its shared records.`,
    not_on: `${big} Shared records are not switched on yet, so big models cannot be kept here yet. Keep the file where it is.`,
  }[place.why] ?? big;
}

// ---- which kept files are models, and their versions ---------------------------------------------------------------------
const norm = (s) => String(s ?? '').trim().normalize('NFC').toLowerCase();
export const sameName = (a, b) => norm(a) === norm(b);
/** a kept file that the Models section shows: a model of a kind it keeps, and not the 3D tile's plan model */
export const isModel = (note, project) => note?.owner_kind === 'model' && !!kindOf(note.name) && note.id !== project?.model?.file?.id;

const byKept = (a, b) => String(a.kept_at).localeCompare(String(b.kept_at)) || String(a.id).localeCompare(String(b.id));
/** a note's version: the number it was kept with, else its place among files of the same name, oldest first */
export function versionOf(note, all) {
  const v = Number(note?.extra?.model?.version);
  if (Number.isInteger(v) && v > 0) return v;
  return all.filter((f) => sameName(f.name, note.name)).sort(byKept).findIndex((f) => f.id === note.id) + 1 || 1;
}
/** the version a new file of this name becomes: one more than the highest kept, so removing v1 does not renumber v2 */
export function nextVersion(all, name) {
  return all.filter((f) => sameName(f.name, name)).reduce((m, f) => Math.max(m, versionOf(f, all)), 0) + 1;
}
// ---- browser copies ---------------------------------------------------------------------------------------------------------
// A browser copy is a light GLB made from a model too big for a browser (docs/architecture/browser-copy.md). It is kept
// like any model, with extra.browser_copy_of = the id of the kept file it was made from. It is shown under that model,
// not as a model of its own, and Open in 3D hands it over instead. The model's own counts still come from the model.
/** the id of the kept model this file is a browser copy of, or '' */
export const copyOf = (note) => (kindOf(note?.name) === 'glb' && typeof note?.extra?.browser_copy_of === 'string' ? note.extra.browser_copy_of : '');
/** the newest browser copy of this kept model that a browser can open, or null */
export function browserCopyFor(note, models) {
  if (!note?.id) return null;
  return models.filter((f) => copyOf(f) === note.id && !tooBigFor3d(f.size)).sort((a, b) => byKept(b, a))[0] ?? null;
}
/** what Open in 3D hands to the 3D page: the browser copy when there is one, else the model itself when a browser can
 *  open it, else null (too big, and no copy) */
export function handoverFor(note, models) {
  const copy = browserCopyFor(note, models);
  if (copy) return copy;
  return KINDS[kindOf(note?.name)]?.to3d === 'model' && tooBigFor3d(note?.size) ? null : note;
}
/** '' when this file can be kept as a browser copy of that model; otherwise what to say */
export function copyProblem({ name, size }, source) {
  if (kindOf(name) !== 'glb') return `A browser copy is a .glb file. “${name}” is not one.`;
  if (!source?.id) return 'The model it is a copy of is not kept here any more.';
  if (tooBigFor3d(size)) return `“${name}” is ${sizeText(size)}, too big to open in 3D in a browser as well: the most is ${sizeText(BROWSER_3D_LIMIT)}. It needs to be lighter.`;
  return '';
}

/** files of the same name together, newest version first; the stacks with the newest file first. A browser copy goes with
 *  the model it was made from (browserCopyFor), not in a stack of its own, unless that model is no longer kept. */
export function stacks(models) {
  const groups = new Map(), ids = new Set(models.map((f) => f.id));
  for (const f of models) {
    if (ids.has(copyOf(f))) continue; const k = norm(f.name); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(f); }
  return [...groups.values()].map((list) => {
    const versions = list.map((f) => ({ ...f, version: versionOf(f, models) })).sort((a, b) => b.version - a.version || byKept(b, a));
    return { name: versions[0].name, latest: versions[0], older: versions.slice(1) };
  }).sort((a, b) => byKept(b.latest, a.latest));
}

// ---- what a card shows ------------------------------------------------------------------------------------------------------
const nz = (v, d = 0) => Number(v).toLocaleString('en-NZ', { maximumFractionDigits: d, minimumFractionDigits: d });
/** the big numbers on an IFC card, always the same six, in the same order */
export const FACTS = [['walls', 'Walls'], ['doors', 'Doors'], ['windows', 'Windows'], ['slabs', 'Slabs'], ['roofs', 'Roofs'], ['spaces', 'Spaces']];
export function factsOf(summary) {
  const c = summary?.counts ?? {};
  const cw = Number(c.curtain_walls ?? 0);
  // Revit exports curtain-wall glazing as curtain walls, not windows: show them on the windows tile so glazing is not missed
  return FACTS.map(([key, label]) => ({ key, label, n: Number(c[key] ?? 0) + (key === 'windows' ? cw : 0), text: nz(c[key] ?? 0), also: key === 'windows' && cw ? `+ ${nz(cw)} curtain wall${cw === 1 ? '' : 's'}` : '' }));
}
/** the floor area line, only when the file's spaces carry one: { value, label, from }; else null */
export function areaOf(summary) {
  const s = summary?.spaces;
  if (!s) return null;
  if (s.net_m2 != null) return { value: `${nz(s.net_m2, 1)} m²`, label: 'Floor area, net', from: `Sum of NetFloorArea on ${s.with_net} of ${s.count} spaces, from the file’s ${s.set || 'quantity sets'}` };
  if (s.gross_m2 != null) return { value: `${nz(s.gross_m2, 1)} m²`, label: 'Floor area, gross', from: `Sum of GrossFloorArea on ${s.with_gross} of ${s.count} spaces, from the file’s ${s.set || 'quantity sets'}` };
  return null;
}
/** storeys, lowest first, as short lines: "Ground floor · 0.00 m · 14" */
export function storeysOf(summary) {
  return (summary?.storeys ?? []).map((s) => ({ name: s.name, level: s.elevation_m == null ? '' : `${s.elevation_m < 0 ? '−' : ''}${nz(Math.abs(s.elevation_m), 2)} m`, elements: s.elements }));
}

// ---- the 3D page --------------------------------------------------------------------------------------------------------------
/** the 3D page's own chooser, and the id of its file input (plan-studio/twins/src/twin/projectPlan.ts) */
export const TWIN_DROP = '/plan-studio/twins/drop/?drop=1';
export const TWIN_FILE_INPUT = 'dropFile';
