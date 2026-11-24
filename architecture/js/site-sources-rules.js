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
//   placement (optional, from the 3D page's Place the building card; plan-studio/twins/src/twin/placeFit.ts has the same shape):
//     { east, north, turn_deg, status: 'assumed' | 'set by a person', method: 'matched' | 'by hand' | 'site point', residual_m,
//       matched_to, site_point: { lat, lng }, model, confirmed_by, confirmed_at }   east / north: metres on the NZTM grid from the
//     site point to the building's middle. Only "set by a person" with a name and a time counts as confirmed.
import * as MR from './models-rules.js';
import { AUTO_PREVIEW_LIMIT, isModel, kindOf, stacks as modelStacks } from './models-rules.js';

/** the contract's object, and what it is saved as on the project */
export const EMPTY = Object.freeze({ point: null, camera_path: null, placement: null });

export const REVIEW_SLOTS = ['walk_review', 'design_interior', 'design_exterior'];
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
  { id: 'flythrough', word: 'Fly-through path', tag: 'JSON', ext: ['json'], to3d: false, icon: 'path', hint: 'Saved from the 3D page: the shots, versioned; proposed until a person confirms it.' },
  { id: 'films', word: 'Films and stills', tag: 'MP4 · WebM · PNG · JPEG', ext: ['mp4', 'webm', 'png', 'jpg', 'jpeg'], to3d: false, icon: 'file', hint: 'Made on the 3D page and saved back here: fly-through films, comparison shots, the approved look.' },
  { id: 'camera_proofs', word: 'Private camera proofs', tag: 'MP4 · WebM', ext: ['mp4', 'webm'], to3d: false, icon: 'file', hint: 'Internal exact-model motion tests. Never included on the client link.' },
  { id: 'walk_review', word: 'Walkthrough setup', tag: 'JSON', ext: ['json'], to3d: true, icon: 'path', hint: 'Private camera stops tied to the exact model file. Also records separate artwork file checksums, sources and approvals.' },
  { id: 'design_interior', word: 'Māori design · interior', tag: 'GLB', ext: ['glb'], to3d: true, icon: 'file', hint: 'Only a registered, architect-supplied and authorised layer in the model’s own axes. It stays off until selected in 3D.' },
  { id: 'design_exterior', word: 'Māori design · exterior', tag: 'GLB', ext: ['glb'], to3d: true, icon: 'file', hint: 'Only a registered, architect-supplied and authorised layer in the model’s own axes. It stays off until selected in 3D.' },
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
  json: (b) => /^\s*\{/.test(new TextDecoder().decode(b)),
  glb: (b) => starts(b, [0x67, 0x6c, 0x54, 0x46, 2, 0, 0, 0]),
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
/** the fixed slots stack by slot (a new drawing set keeps the old one); "other" stacks by file name; every film and still is its own item */
export const stackKey = (note) => { const s = note.extra?.source?.slot; return s === 'other' ? `other:${norm(note.name)}` : GALLERY.has(s) ? `${s}:${note.id}` : s; };
/** slots shown as a gallery of their files, each its own item, newest first */
export const GALLERY = new Set(['films', 'camera_proofs']);
/** how a gallery item is shown: an image inline, a film with its first frame and a play control, else a plain card */
export const mediaOf = (note) => { const e = ext(note?.name), t = String(note?.type ?? ''); return /^image\//.test(t) || IMG.includes(e) ? 'image' : /^video\//.test(t) || ['mp4', 'webm', 'mov'].includes(e) ? 'video' : 'file'; };
const byKept = (a, b) => String(a.kept_at).localeCompare(String(b.kept_at)) || String(a.id).localeCompare(String(b.id));
export function versionOf(note, all) {
  const v = Number(note?.extra?.source?.version);
  if (Number.isInteger(v) && v > 0) return v;
  return all.filter((f) => stackKey(f) === stackKey(note)).sort(byKept).findIndex((f) => f.id === note.id) + 1 || 1;
}
/** the version a new file in this slot becomes: one more than the highest kept, so removing v1 does not renumber v2 */
export function nextVersion(all, slotId, name) {
  if (GALLERY.has(slotId)) return 1;   // each film and still is its own item, not a version of the last
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
export const sourceExtra = ({ slot, version, by = '', note = '', proof = null }) => ({ source: { slot, version, by: String(by ?? ''), note: String(note ?? '').trim().slice(0, 140), ...(slot === 'camera_proofs' && proof ? { proof } : {}) } });

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
  return { point, camera_path, placement: normalPlacement(o.placement) };
}
/** the placement as the contract says, or null (keep in step with placeFit.ts normalPlacement) */
export function normalPlacement(v) {
  const o = v && typeof v === 'object' ? v : null;
  if (!o || !num(o.east) || !num(o.north) || !num(o.turn_deg) || !o.site_point || !num(o.site_point.lat) || !num(o.site_point.lng) || Math.hypot(o.east, o.north) > 2000) return null;
  const by = o.confirmed_by ? String(o.confirmed_by) : null, at = o.confirmed_at ? String(o.confirmed_at) : null;
  return { east: o.east, north: o.north, turn_deg: o.turn_deg, status: by && at && o.status === 'set by a person' ? 'set by a person' : 'assumed',
    method: o.method === 'matched' ? 'matched' : o.method === 'by hand' ? 'by hand' : 'site point', residual_m: num(o.residual_m) ? o.residual_m : null,
    matched_to: o.matched_to ? String(o.matched_to).slice(0, 120) : null, site_point: { lat: o.site_point.lat, lng: o.site_point.lng }, model: String(o.model ?? '').slice(0, 200), confirmed_by: by, confirmed_at: at };
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
export const tooBig = (f) => (typeof MR.tooBigFor3d === 'function' ? !!MR.tooBigFor3d(f?.size) : Number(f?.size) > AUTO_PREVIEW_LIMIT);

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
  return { point, camera_path: ss.camera_path, placement: ss.placement, sources: sourceList(files) };
}

/** Collect project-authorised sources using the same resolved project record and authenticated storage.
 * Ordinary model open avoids fetching the full drawings/sketch; the site action already expressly loads those. */
export async function readSiteHandoff(project, files, read, full = false) {
  const site = siteHandoff(project, files), slots = bySlot(files);
  const latest = (id) => slots.find((s) => s.slot.id === id)?.stacks[0]?.latest;
  site.files = {};
  const allowed = (f) => !Number.isFinite(f?.size) || f.size <= (f.extra?.source?.slot === 'walk_review' ? 65536 : 24 * 1024 * 1024);
  let recordedLayers = null;
  for (const id of blobSlots()) {
    if (!full && !REVIEW_SLOTS.includes(id)) continue;
    const f = latest(id);
    if (!f || (id.startsWith('design_') && !recordedLayers?.[id.slice('design_'.length)]) || (REVIEW_SLOTS.includes(id) && !allowed(f))) continue;
    try {
      const b = await read(f);
      if (id === 'walk_review' && b.size <= 65536) {
        site.files[id] = b;
        const parsed = JSON.parse(await b.text());
        if (parsed?.schema === 'assembl.model-review.v1') recordedLayers = parsed.layers;
      } else if (id !== 'walk_review' && (!REVIEW_SLOTS.includes(id) || b.size <= 24 * 1024 * 1024)) site.files[id] = b;
    } catch (e) { if (!REVIEW_SLOTS.includes(id)) throw e; }
  }
  const flight = latest('flythrough');
  if (flight && (!Number.isFinite(flight.size) || flight.size <= 256 * 1024)) {
    try {
      const b = await read(flight);
      if (b.size <= 256 * 1024) site.flight = JSON.parse(await b.text());
    } catch { /* malformed or missing optional path does not block the model */ }
  }
  return site;
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

// ---- what the 3D page passes back (plan-studio/twins/src/twin/handoff.ts putBackRecord, putPathBack) ----------------------------
/**
 * Where a record passed back from the 3D page goes in the project: { slot, name, note, path } for a file kept in Site and sources,
 * or { path } for a camera path (it becomes the project's camera_path, proposed until confirmed), or { placement } for where the
 * building stands (it becomes site_sources.placement). null for anything unknown.
 */
export function backToSource(rec) {
  if (!rec || typeof rec !== 'object') return null;
  if (rec.kind === 'camera_path' && rec.path) return { path: rec.path };
  if (rec.kind === 'placement') { const pl = normalPlacement(rec.meta?.placement); return pl ? { placement: pl } : null; }
  const m = rec.meta ?? {}, name = String(rec.name ?? 'from the 3D page').slice(0, 160);
  const status = m.status === 'confirmed' ? `confirmed by ${String(m.confirmed_by ?? 'a person')}` : 'proposed';
  if (rec.kind === 'flight') return { slot: 'flythrough', name, note: `From the 3D page: v${Number(m.version) || 1}, ${status}${m.shots ? `, ${m.shots} shots` : ''}` };
  if (rec.kind === 'film_proof') {
    const sha256 = m.sha256, checked = m.status === 'validated';
    if (!/^[a-f0-9]{64}$/.test(sha256) || !Number.isFinite(m.secs) || m.secs < 3 || m.secs > 5
      || !Number.isFinite(m.start) || m.start < 0 || !Number.isInteger(m.version) || m.version < 0
      || !/\.(mp4|webm)$/i.test(name)) return null;
    return { slot: 'camera_proofs', name, note: checked ? 'Exact model. Cloudflare preflight passed; no provider call.' : 'Exact model. No Cloudflare preflight receipt.',
      proof: { sha256, status: checked ? 'validated' : 'capture-only', secs: m.secs, start: m.start, path_version: m.version,
        ...(checked && typeof m.model === 'string' ? { model: m.model.slice(0, 80) } : {}) } };
  }
  if (rec.kind === 'film') return { slot: 'films', name, note: `Film from the 3D page: ${m.secs ? `${m.secs} s, ` : ''}${m.size ?? ''}${m.quality === 'draft' ? ', draft' : ''}, path ${status}` };
  if (rec.kind === 'shot') return { slot: 'films', name, note: `Comparison shot ${String(m.shot ?? '')} from the 3D page`.trim() };
  if (rec.kind === 'look') return { slot: 'films', name, note: `Look from the 3D page: ${m.approved_by ? `approved by ${m.approved_by}` : 'proposed, waiting for a person'}` };
  return null;
}
