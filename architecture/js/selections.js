// A project's selections from the asset library: the furniture, lighting, planting and fittings a person has picked,
// each with a quantity and the room it is for. Pure functions and one save, shared by the Library section
// (library-view.js) and the tests. No three.js here: the pieces themselves live on the 3D page.
//
// Where they are kept. On the page, a project row carries `selections` (an array). The browser store keeps the row as it
// is; the shared records keep anything a project row has no column for in the row's "extra" column (cloud.js,
// projectUp), so there they are project.extra.selections, and they come back unchanged. Both stores refuse a viewer's
// write; the section also leaves out the buttons a viewer cannot use.
//
// Handing them to the 3D page. Like the plan model (model.js, twinHandoff), the picks go across in the tab's session
// storage under SELECTIONS_KEY, and the 3D page reads them only when its address has ?picks=<project id>. The 3D page's
// side is plan-studio/twins/src/twin/library/picks.ts; tests/architecture/library.test.mjs checks the two agree.

export const SELECTIONS_KEY = 'assembl-twin-selections';
export const SELECTIONS_TYPE = 'assembl.selections.v1';
export const MANIFEST_URL = '/plan-studio/twins/library/catalogue.json';
export const ROOM_CHOICES = ['Living', 'Dining', 'Kitchen', 'Bedroom', 'Bathroom', 'Study', 'Outdoor'];
export const MAX_QTY = 99;
export const MAX_PICKS = 200;

const clean = (s) => String(s ?? '').trim();
const newUid = () => `sel_${globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`}`;

/** one pick, made safe to keep: a known shape, a whole quantity from 1 to 99, a room from the list */
export function cleanPick(p) {
  if (!p || typeof p !== 'object') return null;
  const id = clean(p.id);
  if (!/^[A-Z0-9][A-Z0-9-]{1,40}$/.test(id)) return null;
  const qty = Math.max(1, Math.min(MAX_QTY, Math.round(Number(p.qty) || 1)));
  const room = ROOM_CHOICES.includes(p.room) ? p.room : '';
  const finish = /^[a-z0-9-]{1,24}$/.test(String(p.finish ?? '')) ? String(p.finish) : '';
  const uid = /^sel_[\w-]{4,60}$/.test(String(p.uid ?? '')) ? String(p.uid) : newUid();
  return { uid, id, qty, room, finish, added_at: clean(p.added_at), added_by: clean(p.added_by).slice(0, 60) };
}

/** the project's picks, cleaned (a project without any has an empty list) */
export function selectionsOf(project) {
  const list = Array.isArray(project?.selections) ? project.selections : [];
  return list.map(cleanPick).filter(Boolean).slice(0, MAX_PICKS);
}

/** add a piece; the same piece in the same finish for the same room adds to that pick's quantity */
export function addPick(list, { id, qty = 1, room = '', finish = '', who = '', now } = {}) {
  const pick = cleanPick({ id, qty, room, finish, added_by: who, added_at: (now instanceof Date ? now : new Date(now ?? Date.now())).toISOString() });
  if (!pick) throw new Error('That piece is not in the library, so it was not added.');
  const same = list.find((p) => p.id === pick.id && p.room === pick.room && p.finish === pick.finish);
  if (same) return list.map((p) => (p === same ? { ...p, qty: Math.min(MAX_QTY, p.qty + pick.qty) } : p));
  if (list.length >= MAX_PICKS) throw new Error(`A project keeps up to ${MAX_PICKS} picks.`);
  return [...list, pick];
}
/** change a pick's quantity or room */
export function setPick(list, uid, changes = {}) {
  return list.map((p) => (p.uid === uid ? cleanPick({ ...p, ...changes, uid: p.uid }) : p)).filter(Boolean);
}
export const removePick = (list, uid) => list.filter((p) => p.uid !== uid);
export const pickCount = (list) => list.reduce((n, p) => n + p.qty, 0);

/** can this person change the picks here: everyone but a viewer of the shared records (the Sample stays in the browser) */
export function canPick({ shared = false, sample = false, role = '' } = {}) {
  return !(shared && !sample && role === 'viewer');
}

/**
 * Keep a project's picks: read the project again (so nothing a colleague saved meanwhile is lost), set its selections,
 * and log what changed. Throws the store's own plain-worded error (a viewer's write is refused there too).
 */
export async function saveSelections(store, projectId, list, { who = '', action = 'Selections changed', detail = '', now } = {}) {
  const p = await store.get('project', projectId);
  if (!p) throw new Error('That project is not here any more.');
  const at = (now instanceof Date ? now : new Date(now ?? Date.now())).toISOString();
  p.selections = list.map(cleanPick).filter(Boolean).slice(0, MAX_PICKS);
  p.updated_at = at;
  await store.save('project', p);
  try { await store.save('activity', { id: `v_${newUid().slice(4)}`, project_id: projectId, at, who: clean(who) || 'Not named', action, detail: clean(detail) }); } catch { /* the picks are kept either way */ }
  return p.selections;
}

/** what to put in session storage so the 3D page places these picks (read there by library/picks.ts) */
export function selectionsHandoff(project, list) {
  const items = list.map(cleanPick).filter(Boolean).map(({ id, qty, room, finish }) => ({ id, qty, room, finish }));
  return { key: SELECTIONS_KEY, value: JSON.stringify({ type: SELECTIONS_TYPE, project_id: String(project?.id ?? ''), model: String(project?.model?.fingerprint ?? ''), items }) };
}
/** the address of the 3D page with ?picks for this project, from the model's own 3D link (model.js, twinLink) */
export function picksHref(link, projectId) {
  if (!link?.href) return null;
  const sep = link.href.includes('?') ? '&' : '?';
  return `${link.href}${sep}picks=${encodeURIComponent(projectId)}`;
}
