// The rules behind "Site and sources", with no page in them, so they can be tested on their own: the five slots and what
// each takes, how a kept file is told to belong to a slot, version stacking, the project's site_sources record, and which
// model (or drawing set) goes to the 3D page.
//
// A kept source is a kept file (store.putFile) with owner_kind 'source' and owner_id the project's id. Its note carries
// extra.source = { slot, version, by, note }. Models use owner_kind 'model', so a source never shows in the Models section.
//
// The project record carries site_sources (the contract with the 3D page; keep it exactly):
//   { point: { lat, lng, source } | null,
//     camera_path: { pts: [[u, v, h], ...], sketch_file_id, traced_by: 'tool' | 'person', confirmed_by, confirmed_at } | null }
//   pts are metres in the model frame: u = x, south to north; v = z, west to east; h = y, up.
import * as MR from './models-rules.js';
import { AUTO_PREVIEW_LIMIT, isModel, kindOf, stacks as modelStacks } from './models-rules.js';

/** the contract's object, and what it is saved as on the project */
export const EMPTY = Object.freeze({ point: null, camera_path: null });

const IMG = ['png', 'jpg', 'jpeg', 'webp'];
/**
 *   id      the slot (also the key under site.files in the hand-over)   tag   the short mark
 *   word    what it is, in plain words                                    ext   the file endings it takes
 *   to3d    handed to the 3D page as a Blob (the page reads plans from PDFs, and the sketch from images or PDFs)
 */
export const SLOTS = [
  { id: 'drawing_set', word: 'Drawing set', tag: 'PDF', ext: ['pdf'], to3d: true, icon: 'sheet' },
  { id: 'site_plan', word: 'Site plan', tag: 'PDF · image', ext: ['pdf', ...IMG], to3d: true, icon: 'plan' },
  { id: 'camera_sketch', word: 'Camera path sketch', tag: 'PDF · image', ext: ['pdf', ...IMG], to3d: true, icon: 'path', hint: 'The site plan with the fly-through path drawn on it.' },
  { id: 'survey', word: 'Survey', tag: 'PDF · DWG · CSV · LandXML', ext: ['pdf', 'dwg', 'csv', 'xml', 'landxml'], to3d: false, icon: 'survey' },
  { id: 'other', word: 'Other', tag: 'any file', ext: null, to3d: false, icon: 'file' },
];
export const slotOf = (id) => SLOTS.find((s) => s.id === id) ?? null;
export const SLOT_IDS = SLOTS.map((s) => s.id);
export const acceptFor = (slot) => (slot?.ext ? slot.ext.map((e) => `.${e}`).join(',') : '');

export const ext = (name) => (String(name ?? '').toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? '');
const norm = (s) => String(s ?? '').trim().normalize('NFC').toLowerCase();
const ascii = (b, n = 1024) => String.fromCharCode(...b.subarray(0, Math.min(n, b.length)));
const starts = (b, sig) => sig.every((x, i) => b[i] === x);
const SNIFF = {
  pdf: (b) => ascii(b).includes('%PDF-'),
  png: (b) => starts(b, [0x89, 0x50, 0x4e, 0x47]),
  jpg: (b) => starts(b, [0xff, 0xd8, 0xff]),
  jpeg: (b) => starts(b, [0xff, 0xd8, 0xff]),
  webp: (b) => ascii(b, 12).startsWith('RIFF') && ascii(b, 12).slice(8, 12) === 'WEBP',
  dwg: (b) => /^AC10\d\d/.test(ascii(b, 6)),
  xml: (b) => /^\s*(<\?xml|<LandXML)/i.test(ascii(b, 200).replace(/^ï»¿/, '')),
  landxml: (b) => /^\s*(<\?xml|<LandXML)/i.test(ascii(b, 200).replace(/^ï»¿/, '')),
};

/** '' when the file can sit in this slot; otherwise a plain sentence. head: its first bytes. */
export function checkSource(slotId, name, head) {
  const slot = slotOf(slotId);
  if (!slot) return 'That is not a place a source can go.';
  const e = ext(name);
  if (!head?.length) return `“${name}” is empty, so there is nothing to keep.`;
  if (slot.ext && !slot.ext.includes(e)) return `“${name}” is not a kind this slot takes. ${slot.word} takes ${slot.ext.map((x) => x.toUpperCase()).join(', ')}.`;
  const sniff = SNIFF[e];
  if (sniff && !sniff(head)) return `“${name}” does not start the way a .${e} file does, so it was not kept. Check it opens where it was made.`;
  return '';
}

// ---- which kept files are sources, and their versions ---------------------------------------------------------------------
/** a kept file that "Site and sources" shows */
export const isSource = (note) => note?.owner_kind === 'source' && SLOT_IDS.includes(note?.extra?.source?.slot);
/** the fixed slots stack by slot (a new drawing set keeps the old one); "other" stacks by file name */
export const stackKey = (note) => { const s = note.extra?.source?.slot; return s === 'other' ? `other:${norm(note.name)}` : s; };
const byKept = (a, b) => String(a.kept_at).localeCompare(String(b.kept_at)) || String(a.id).localeCompare(String(b.id));
export function versionOf(note, all) {
  const v = Number(note?.extra?.source?.version);
  if (Number.isInteger(v) && v > 0) return v;
  return all.filter((f) => stackKey(f) === stackKey(note)).sort(byKept).findIndex((f) => f.id === note.id) + 1 || 1;
}
/** the version a new file in this slot becomes: one more than the highest kept, so removing v1 does not renumber v2 */
export function nextVersion(all, slotId, name) {
  const key = slotId === 'other' ? `other:${norm(name)}` : slotId;
  return all.filter((f) => isSource(f) && stackKey(f) === key).reduce((m, f) => Math.max(m, versionOf(f, all)), 0) + 1;
}
/** { slot, stacks: [{ name, latest, older }] } for each slot, in slot order; latest and older carry .version, newest first */
export function bySlot(files) {
  const mine = (files ?? []).filter(isSource);
  return SLOTS.map((slot) => {
    const groups = new Map();
    for (const f of mine.filter((x) => x.extra.source.slot === slot.id)) { const k = stackKey(f); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(f); }
    const st = [...groups.values()].map((list) => {
      const v = list.map((f) => ({ ...f, version: versionOf(f, mine) })).sort((a, b) => b.version - a.version || byKept(b, a));
      return { name: v[0].name, latest: v[0], older: v.slice(1) };
    }).sort((a, b) => byKept(b.latest, a.latest));
    return { slot, stacks: st };
  });
}
/** the note a new source is kept with */
export const sourceExtra = ({ slot, version, by = '', note = '' }) => ({ source: { slot, version, by: String(by ?? ''), note: String(note ?? '').trim().slice(0, 140) } });

// ---- the project's site_sources record ---------------------------------------------------------------------------------------
const num = (v) => typeof v === 'number' && Number.isFinite(v);
/** a point inside the NZ main islands, the same test as facts.js parseWhere */
const inNz = (lat, lng) => lat <= -34 && lat >= -47.5 && lng >= 166 && lng <= 179;
/** one path point [u, v, h] of three finite numbers, or null */
const pt = (p) => (Array.isArray(p) && p.length >= 3 && p.slice(0, 3).every(num) ? [p[0], p[1], p[2]] : null);

/** site_sources as the contract says, whatever was saved: anything that does not fit is dropped, never guessed at */
export function normalSiteSources(v) {
  const o = v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  let point = null;
  if (o.point && num(o.point.lat) && num(o.point.lng) && inNz(o.point.lat, o.point.lng)) point = { lat: o.point.lat, lng: o.point.lng, source: String(o.point.source ?? '') };
  let camera_path = null;
  const c = o.camera_path;
  if (c && Array.isArray(c.pts)) {
    const pts = c.pts.map(pt);
    if (pts.length && pts.every(Boolean)) {
      camera_path = {
        pts, sketch_file_id: c.sketch_file_id ?? null, traced_by: c.traced_by === 'person' ? 'person' : 'tool',
        confirmed_by: c.confirmed_by ? String(c.confirmed_by) : null, confirmed_at: c.confirmed_at ? String(c.confirmed_at) : null,
      };
    }
  }
  return { point, camera_path };
}
/** a path counts as confirmed only when a person is named and a time is kept; until then it is a proposal */
export const isConfirmed = (c) => !!c && !!c.confirmed_by && !!c.confirmed_at;
/** the path, drawn from above: points as 0-100 positions (v west to east across, u south to north up), or [] */
export function pathPoints(c, pad = 8) {
  const pts = c?.pts ?? [];
  if (!pts.length) return [];
  const us = pts.map((p) => p[0]), vs = pts.map((p) => p[1]);
  const [u0, u1, v0, v1] = [Math.min(...us), Math.max(...us), Math.min(...vs), Math.max(...vs)];
  const span = Math.max(u1 - u0, v1 - v0, 1e-6), span100 = 100 - 2 * pad;
  const cu = (u0 + u1) / 2, cv = (v0 + v1) / 2;
  return pts.map(([u, v]) => [50 + ((v - cv) / span) * span100, 50 - ((u - cu) / span) * span100]);
}
/** the project's site point, from what the Site tab saved (project.site: lat, lon, address) */
export function pointFromSite(site) {
  const lat = site?.lat, lng = site?.lon;
  if (!num(lat) || !num(lng) || !inNz(lat, lng)) return null;
  return { lat, lng, source: site.address?.address ? 'LINZ address, chosen on the Site tab' : 'a point typed on the Site tab' };
}
/** true when the saved point is not the Site tab's point (so the record should be brought into step) */
export const pointDiffers = (saved, site) => {
  const want = pointFromSite(site);
  return !!want !== !!saved || (!!want && (want.lat !== saved.lat || want.lng !== saved.lng || want.source !== saved.source));
};

/** the parcel line for the card: from the facts the Site tab saved (what existing code fetched), or why there is none */
export function parcelStatus(site) {
  const f = (site?.facts ?? []).find((x) => x.id === 'site.parcel');
  if (!site || site.lat == null) return { state: 'no-site', word: 'No site yet', says: 'Set the site address above to read the parcel.' };
  if (!f) return { state: 'none', word: 'Not read yet', says: 'Look the facts up again on the Site tab.' };
  if (f.status === 'live') return { state: 'live', word: 'Parcel found', says: f.value != null ? `${Number(f.value).toLocaleString('en-NZ')} ${f.unit || ''}`.trim() : 'Found at the point', from: f.source?.name || 'LINZ', asOf: f.asOf, note: f.note };
  if (f.status === 'not-wired') return { state: 'off', word: 'Not connected', says: f.reason || '', from: f.source?.name || '' };
  return { state: 'down', word: 'No answer', says: f.reason || 'The feed gave no answer when the facts were read.', from: f.source?.name || '' };
}
/** the ground source line. The ground itself is read on the 3D page from the site point; nothing is read for it here. */
export const GROUND = { word: 'LINZ 1 m LiDAR, existing ground', says: 'Read on the 3D page from the site point. It is existing ground, not finished ground.' };

// ---- what goes to the 3D page ------------------------------------------------------------------------------------------------
/** is this model too big to draw in a browser? main's tooBigFor3d when it is there; otherwise the page's own preview limit */
export const tooBig = (f) => (typeof MR.tooBigFor3d === 'function' ? !!MR.tooBigFor3d(f) : Number(f?.size) > AUTO_PREVIEW_LIMIT);

/**
 * The model to hand across: the project's latest model of a kind the 3D page opens (IFC, zipped IFC, GLB). A browser copy of it
 * (a file whose note has extra.browser_copy_of = that model's id) goes first; else the model itself when it is not too big to
 * draw. Returns { note, why } or null (no model, or only too-big ones with no browser copy).
 */
export function pickModel(files, project) {
  const models = (files ?? []).filter((f) => isModel(f, project) && MR.KINDS[kindOf(f.name)]?.to3d === 'model');
  const copies = models.filter((f) => f.extra?.browser_copy_of);
  const originals = models.filter((f) => !f.extra?.browser_copy_of);
  const latest = modelStacks(originals)[0]?.latest ?? null;
  const copyOf = (id) => copies.filter((c) => c.extra.browser_copy_of === id).sort((a, b) => String(b.kept_at).localeCompare(String(a.kept_at)))[0];
  if (latest) {
    const c = copyOf(latest.id);
    if (c) return { note: c, why: 'browser copy', of: latest };
    if (!tooBig(latest)) return { note: latest, why: 'model' };
  }
  // a browser copy whose original is gone is still a model the page can draw
  const orphan = copies.filter((c) => !originals.some((o) => o.id === c.extra.browser_copy_of)).sort((a, b) => String(b.kept_at).localeCompare(String(a.kept_at)))[0];
  return orphan ? { note: orphan, why: 'browser copy' } : null;
}

/** is there a model the 3D page opens at all (even one too big to draw)? */
export const hasModel = (files, project) => (files ?? []).some((f) => isModel(f, project) && MR.KINDS[kindOf(f.name)]?.to3d === 'model');

/** the list that goes in site.sources: the latest of every fixed slot, and each "other" */
export function sourceList(files) {
  const out = [];
  for (const { slot, stacks } of bySlot(files)) for (const s of stacks) out.push({ kind: slot.id, name: s.latest.name, file_id: s.latest.id });
  return out;
}
/** the slots whose latest file goes across as a Blob (site.files[kind]) */
export const blobSlots = () => SLOTS.filter((s) => s.to3d).map((s) => s.id);

/**
 * What the 3D page is given about the site, without the Blobs (the page adds those, fetched like models.js blobOf):
 * { point, camera_path, sources: [{ kind, name, file_id }] }
 */
export function siteHandoff(project, files) {
  const ss = normalSiteSources(project?.site_sources);
  const point = ss.point ?? pointFromSite(project?.site);
  return { point, camera_path: ss.camera_path, sources: sourceList(files) };
}

// ---- saving ---------------------------------------------------------------------------------------------------------------------
/**
 * Change the project's site_sources and save it the way every other project field is saved (store.save('project', ...)).
 * change gets the current record (already in the contract's shape) and returns the new one; it may be async.
 * Returns the saved record, or null when the project is not in the store.
 */
export async function withSiteSources(store, projectId, change, now = new Date().toISOString()) {
  const pr = await store.get('project', projectId);
  if (!pr) return null;
  const next = normalSiteSources(await change(normalSiteSources(pr.site_sources)));
  pr.site_sources = next;
  pr.updated_at = now;
  await store.save('project', pr);
  return next;
}
/** a camera path confirmed by a person: the tool (or the person) may have drawn it, but only a person's press makes it confirmed */
export const confirmPath = (c, who, now = new Date().toISOString()) => (c ? { ...c, confirmed_by: String(who || '').trim() || 'Someone in this practice', confirmed_at: now } : null);
