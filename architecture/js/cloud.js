// Shared team records for the architecture operations page: the same storage interface as store.js, kept in the
// practice's database (Supabase, schema "arch") instead of one browser. This is the only file that reads or writes it.
//
//   createCloudStore({ client, practice, local })   list, get, save, remove, loadProject, saveProject, removeProject,
//                                                   exportProject, importProject, persistent  (as in store.js), and
//                                                   putFile, getFile, removeFile, listFiles    (files, see below)
//   createSwitch(local)                             one store object for the page, which hands each call to the browser
//                                                   store or the shared store. The page does not know which.
//   createTeam(gateway)                             practices, people, invitations
//   moveProjects({ local, cloud, ids })             copy chosen browser projects up; the browser copy is left alone
//
// What stays in the browser, always: the Sample project and everything under it (never uploaded), and settings.
//
// Shapes. The page nests (project.site.lat, project.model.fingerprint); the tables are flat (site_lat,
// model_fingerprint). The page calls stage five "contract"; the tables call it "contract_admin". The page writes empty
// text as ''; the tables keep null. Ids here are database uuids: a page id such as "t_<uuid>" becomes "<uuid>".
// Anything on a row that the tables have no column for goes into the row's "extra" column and comes back unchanged.
//
// Private data. The site point (latitude and longitude) travels only inside request bodies, never in an address, and
// nothing here writes to the console. Database error text is never shown or kept: it can quote a row's values.
//
// Files (the four names are agreed with the browser store; the shapes below are this file's):
//   putFile({ project_id, document_id?, name, type?, blob })  -> { id, project_id, document_id, name, type, size, created_at }
//   getFile(id)                                               -> the same, with blob; or null
//   removeFile(id)                                            -> true if it was there
//   listFiles({ project_id?, document_id? })                  -> records, without the bytes
// putFile also accepts (blob, { ... }) and a File in place of blob.

import { emptyBundle, readBundle, writeBundle, copyBundle, fileSlug, SAMPLE_ID, STAGE_KEYS } from './model.js';

// ---- ids ---------------------------------------------------------------------------------------------------------------
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PREFIXED = /^[a-z]{1,3}_([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

/** a spread-out 128-bit number for an id that is not a uuid, written as a uuid. The same id always gives the same one. */
function hashedUuid(text) {
  let hex = '';
  for (let seed = 0; seed < 4; seed++) {
    let h = (0x811c9dc5 ^ Math.imul(seed + 1, 0x9e3779b1)) >>> 0;
    for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; h = Math.imul(h, 0x297a2d39); h ^= h >>> 15;
    hex += (h >>> 0).toString(16).padStart(8, '0');
  }
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-8${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

/** the database id for a page id: "<uuid>" stays, "t_<uuid>" loses its prefix, anything else gets a steady uuid of its own */
export function dbId(id) {
  const s = String(id ?? '').trim();
  if (!s) throw new Error('A record needs an id before it can be saved.');
  if (UUID.test(s)) return s.toLowerCase();
  const m = s.match(PREFIXED);
  return m ? m[1].toLowerCase() : hashedUuid(s);
}
const newUuid = () => globalThis.crypto?.randomUUID?.() ?? hashedUuid(`${Date.now()}:${Math.random()}:${Math.random()}`);

// ---- the stage names ---------------------------------------------------------------------------------------------------
const STAGE_UP = { contract: 'contract_admin' }, STAGE_DOWN = { contract_admin: 'contract' };
const stageUp = (k) => STAGE_UP[k] ?? k, stageDown = (k) => STAGE_DOWN[k] ?? k;

// ---- one row, page shape to table shape and back -------------------------------------------------------------------------
// [page field, table column, type, empty value on the page]
//   must  text that is always there        text  '' on the page, null in the table       flag  true or false
//   date  'YYYY-MM-DD'                      day   'YYYY-MM-DD' on the page, a time in the table (midnight UTC)
//   time  a full date and time              now   a time; the present moment if the page sent none
//   stage a stage key                       ref   the id of another row                    json  anything; left off the row when null
const FIELDS = {
  stage: [['status', 'status', 'must', 'not_started'], ['started_at', 'started_at', 'time', null], ['done_at', 'done_at', 'time', null]],
  task: [['stage', 'stage', 'stage', ''], ['title', 'title', 'must', ''], ['owner', 'owner', 'text', ''], ['status', 'status', 'must', 'todo'], ['due', 'due', 'date', ''], ['note', 'note', 'text', ''], ['source', 'source', 'json'], ['edited', 'edited', 'flag']],
  document: [['stage', 'stage', 'stage', ''], ['title', 'title', 'must', ''], ['kind', 'kind', 'text', ''], ['version', 'version', 'text', ''], ['date', 'date', 'date', ''], ['source', 'source', 'text', ''], ['note', 'note', 'text', '']],
  approval: [['stage', 'stage', 'stage', ''], ['who', 'who', 'must', ''], ['role', 'role', 'text', ''], ['what', 'what', 'must', ''], ['note', 'note', 'text', ''], ['at', 'at', 'now', ''], ['fingerprint', 'fingerprint', 'text', '']],
  rfi: [['received_at', 'received_at', 'day', ''], ['from', 'from_party', 'text', ''], ['question', 'question', 'must', ''], ['response', 'response', 'text', ''], ['status', 'status', 'must', 'open'], ['sent_at', 'sent_at', 'day', '']],
  observation: [['date', 'date', 'date', ''], ['by', 'by', 'text', ''], ['note', 'note', 'text', '']],
  variation: [['title', 'title', 'must', ''], ['status', 'status', 'text', ''], ['note', 'note', 'text', '']],
  defect: [['title', 'title', 'must', ''], ['status', 'status', 'text', ''], ['note', 'note', 'text', '']],
  checklist_item: [['stage', 'stage', 'stage', ''], ['list', 'list', 'must', ''], ['title', 'title', 'must', ''], ['status', 'status', 'must', 'needed'], ['document_id', 'document_id', 'ref', ''], ['note', 'note', 'text', ''], ['source', 'source', 'json'], ['edited', 'edited', 'flag']],
  activity: [['at', 'at', 'now', ''], ['who', 'who', 'text', ''], ['action', 'action', 'must', ''], ['detail', 'detail', 'text', '']],
};
/** the kinds of record under a project, and where each sits in a project bundle */
const LISTS = { stage: 'stages', task: 'tasks', document: 'documents', approval: 'approvals', rfi: 'rfis', observation: 'observations', variation: 'variations', defect: 'defects', checklist_item: 'checklist', activity: 'activity' };
export const SHARED_KINDS = ['project', ...Object.keys(LISTS)];
const APPEND_ONLY = new Set(['approval', 'activity']);
// columns the database fills in itself: never sent, and never mistaken for an unknown field
const DATABASE_OWN = new Set(['user_id', 'recorded_at', 'seq', 'created_by', 'practice_id', 'extra']);

const DAY = /^\d{4}-\d{2}-\d{2}$/, MIDNIGHT = /^(\d{4}-\d{2}-\d{2})T00:00:00(?:\.0+)?(?:Z|\+00(?::?00)?)$/;
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const obj = (v) => (isObj(v) ? v : {});
const iso = (v) => { const d = new Date(v); return Number.isNaN(d.getTime()) ? null : d.toISOString(); };

/** one value, page to table. Returns [value, fits]: when it does not fit its column the original is kept in "extra". */
function up(type, v, fallback) {
  const none = v === undefined || v === null || v === '';
  switch (type) {
    case 'must': return typeof v === 'string' && v !== '' ? [v, true] : none ? [fallback ?? '', true] : [String(v), true];
    case 'text': return none ? [null, true] : typeof v === 'string' ? [v, true] : [null, false];
    case 'flag': return typeof v === 'boolean' ? [v, true] : [false, none];
    case 'date': return none ? [null, true] : DAY.test(v) ? [v, true] : [null, false];
    case 'day': if (none) return [null, true]; if (DAY.test(v)) return [`${v}T00:00:00Z`, true]; // falls through to a full time
    case 'time': { if (none) return [null, true]; const t = typeof v === 'string' ? iso(v) : null; return t ? [t, true] : [null, false]; }
    case 'now': { const t = typeof v === 'string' && v ? iso(v) : null; return t ? [t, true] : [new Date().toISOString(), none]; }
    case 'stage': return none ? [null, true] : [stageUp(String(v)), true];
    case 'ref': return none ? [null, true] : [dbId(v), true];
    default: return [v === undefined ? null : v, true]; // json
  }
}
/** one value, table to page */
function down(type, v, empty) {
  if (v === null || v === undefined) return empty;
  switch (type) {
    case 'day': { const m = String(v).match(MIDNIGHT); return m ? m[1] : iso(v) ?? empty; }
    case 'time': case 'now': return iso(v) ?? empty;
    case 'stage': return stageDown(v);
    case 'flag': return v === true;
    default: return v;
  }
}

function projectUp(p, practiceId) {
  const site = obj(p.site), model = obj(p.model), extra = {};
  const { lat, lon, facts, fetched_at, ...siteRest } = site, { fingerprint, drawings, revision, file_name, ...modelRest } = model;
  for (const [k, v] of Object.entries(p)) if (!['id', 'name', 'client', 'stage', 'created_at', 'updated_at', 'site', 'model', 'sample'].includes(k) && !DATABASE_OWN.has(k) && v !== undefined) extra[k] = v;
  if (Object.keys(siteRest).length) extra.site = siteRest;
  if (Object.keys(modelRest).length) extra.model = modelRest;
  const num = (v, lim) => (typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= lim ? v : null), text = (v) => up('text', v)[0];
  return {
    id: dbId(p.id), practice_id: practiceId, name: String(p.name ?? ''), client: text(p.client), stage: stageUp(p.stage ?? 'predesign'),
    created_at: up('now', p.created_at)[0], updated_at: up('now', p.updated_at)[0],
    site_lat: num(lat, 90), site_lon: num(lon, 180), site_facts: Array.isArray(facts) ? facts : [], site_fetched_at: up('time', fetched_at)[0],
    model_fingerprint: text(fingerprint), model_drawings: drawings === undefined || drawings === '' ? null : drawings, model_revision: text(revision), model_file_name: text(file_name),
    extra,
  };
}
function projectDown(r) {
  const { site, model, ...rest } = obj(r.extra);
  const drawings = r.model_drawings;
  return {
    ...rest, id: r.id, name: r.name ?? '', client: r.client ?? '', stage: stageDown(r.stage), created_at: iso(r.created_at) ?? '', updated_at: iso(r.updated_at) ?? '',
    site: { ...obj(site), lat: r.site_lat ?? null, lon: r.site_lon ?? null, facts: Array.isArray(r.site_facts) ? r.site_facts : [], fetched_at: r.site_fetched_at ? iso(r.site_fetched_at) : null },
    model: { ...obj(model), fingerprint: r.model_fingerprint ?? '', drawings: typeof drawings === 'string' ? drawings : drawings == null ? '' : JSON.stringify(drawings), revision: r.model_revision ?? '', file_name: r.model_file_name ?? '' },
  };
}

/** a row as the page holds it -> the row the table takes */
export function toRecord(kind, row, { practice_id = null } = {}) {
  if (kind === 'project') return projectUp(row, practice_id);
  const fields = FIELDS[kind];
  if (!fields) throw new Error(`Unknown kind of record: ${kind}`);
  const names = new Set(fields.map((f) => f[0])), extra = {};
  const rec = kind === 'stage' ? { project_id: dbId(row.project_id), key: stageUp(row.key) } : { id: dbId(row.id), project_id: dbId(row.project_id) };
  for (const [name, column, type, empty] of fields) {
    const [value, fits] = up(type, row[name], empty);
    rec[column] = value;
    if (!fits) extra[name] = row[name];
  }
  for (const [k, v] of Object.entries(row)) if (!names.has(k) && !['id', 'project_id', 'key'].includes(k) && !DATABASE_OWN.has(k) && v !== undefined) extra[k] = v;
  rec.extra = extra;
  return rec;
}
/** a row from the table -> the row as the page holds it */
export function fromRecord(kind, r) {
  if (kind === 'project') return projectDown(r);
  const fields = FIELDS[kind], extra = obj(r.extra);
  const row = kind === 'stage' ? { ...extra, id: `${r.project_id}:${stageDown(r.key)}`, project_id: r.project_id, key: stageDown(r.key) } : { ...extra, id: r.id, project_id: r.project_id };
  for (const [name, column, type, empty] of fields) {
    if (name in extra && (r[column] === null || r[column] === undefined || (type === 'flag' && r[column] === false))) continue; // it did not fit the column: the original is in extra
    const v = down(type, r[column], empty);
    if (type === 'json' && v === undefined) continue;
    row[name] = v;
  }
  return row;
}

// ---- plain words for what went wrong -----------------------------------------------------------------------------------
/** code is one of: not_switched_on, out_of_date, signed_out, refused, read_only, append_only, kept, offline, failed */
export class CloudError extends Error {
  constructor(message, code = 'failed') { super(message); this.name = 'CloudError'; this.code = code; }
}
export const NOT_ON = 'Shared records are not switched on yet.';

/** Turn a database or network answer into a plain sentence. The database's own text is never passed on. */
export function explain(err) {
  if (err instanceof CloudError) return err;
  const code = String(err?.code ?? ''), msg = String(err?.message ?? ''), status = Number(err?.status ?? err?.statusCode ?? 0);
  if (code === 'PGRST106') return new CloudError(NOT_ON, 'not_switched_on');
  // the schema is reachable, but a table, column or function this page needs is not there: a migration is still to apply
  if (['PGRST202', 'PGRST204', 'PGRST205', '42703', '42P01', '42883'].includes(code)) return new CloudError('The shared records are not up to date with this page yet: a database update still has to be applied.', 'out_of_date');
  if (code === 'PGRST301' || code === 'PGRST303' || (/jwt/i.test(msg) && /expired|invalid/i.test(msg))) return new CloudError('Your sign-in has expired. Sign in again.', 'signed_out');
  if (code === '42501') {
    // two refusals are written by this project's own database functions, in plain words, and say nothing about any row
    if (/^Sign in with a Google account/.test(msg)) return new CloudError('Google has not verified an email address for this account, so it cannot accept an invitation.', 'refused');
    if (/^There is no open invitation/.test(msg)) return new CloudError('There is no open invitation for this account.', 'refused');
    return new CloudError('The shared records refused that: your role in the practice does not allow it.', 'refused');
  }
  if (code === '23514' && /at least one owner/.test(msg)) return new CloudError('A practice must keep at least one owner. Make someone else an owner first.', 'refused');
  if (code === '23514' && /no approval recorded/.test(msg)) return new CloudError('The shared records refused that: a stage cannot be marked done until an approval for it is on record.', 'refused');
  if (code === '23514' || code === '23502' || code.startsWith('22')) return new CloudError('The shared records refused that: something in it is empty or is not a value they accept.', 'failed');
  if (code === '23503') return new CloudError('The shared records refused that: it points at a record that is not there, or one that other records still rest on.', 'failed');
  if (code === '23505') return new CloudError('That is already in the shared records.', 'failed');
  if (!code && (status === 0 || /fetch|network|load failed/i.test(msg))) return new CloudError('The shared records could not be reached just now.', 'offline');
  return new CloudError(`The shared records gave an error${code ? ` (code ${code.replace(/[^\w-]/g, '').slice(0, 12)})` : ''}.`, 'failed');
}
function explainStorage(err) {
  if (err instanceof CloudError) return err;
  const msg = String(err?.message ?? ''), status = Number(err?.statusCode ?? err?.status ?? 0);
  if (/jwt/i.test(msg) && /expired|invalid/i.test(msg)) return new CloudError('Your sign-in has expired. Sign in again.', 'signed_out');
  if (/bucket not found/i.test(msg)) return new CloudError('Keeping files in the shared records is not switched on yet.', 'not_switched_on');
  if (status === 403 || status === 401 || /row-level security|unauthori[sz]ed|not allowed/i.test(msg)) return new CloudError('The shared records refused that file: your role in the practice does not allow it.', 'refused');
  if (status === 404 || /not found/i.test(msg)) return new CloudError('That file is not in the shared records.', 'failed');
  if (status === 409 || /already exists/i.test(msg)) return new CloudError('A file is already kept under that id.', 'failed');
  if (status === 413 || /too large|maximum allowed size/i.test(msg)) return new CloudError('That file is larger than the shared records accept.', 'failed');
  if (!status || /fetch|network/i.test(msg)) return new CloudError('The shared records could not be reached just now.', 'offline');
  return new CloudError(`The file store gave an error (${status}).`, 'failed');
}

// ---- one way in to the database ----------------------------------------------------------------------------------------
const PAGE = 1000; // the API hands back at most this many rows at once: longer lists are read in pages
const chunks = (list, n) => Array.from({ length: Math.ceil(list.length / n) }, (_, i) => list.slice(i * n, i * n + n));

/**
 * Wraps Supabase's client: every answer is either data or a CloudError in plain words.
 *   refresh()        optional: try to renew an expired sign-in; resolve true if it worked (the call is then made once more)
 *   onTrouble(code)  optional: told when the answer is "not switched on" or "signed out", so the page can say so
 */
export function createGateway(client, { schema = 'arch', bucket = 'arch-files', refresh = null, onTrouble = null } = {}) {
  const db = () => client.schema(schema);
  const attempt = async (build) => { try { return await build(); } catch (e) { return { data: null, error: { message: `network: ${e?.name ?? 'error'}` } }; } };
  async function ask(build) {
    let r = await attempt(build);
    if (r?.error && explain(r.error).code === 'signed_out' && refresh) {
      const renewed = await Promise.resolve().then(refresh).catch(() => false);
      if (renewed) r = await attempt(build);
    }
    if (r?.error) { const e = explain(r.error); if (e.code === 'not_switched_on' || e.code === 'signed_out') onTrouble?.(e.code); throw e; }
    return r?.data ?? null;
  }
  return {
    from: (table) => db().from(table),
    ask,
    /** every row a query matches, a page at a time. build() must return a fresh query; order is the column(s) to page by. */
    async all(build, order = ['id']) {
      const out = [];
      for (let from = 0; ; from += PAGE) {
        const rows = (await ask(() => order.reduce((q, col) => q.order(col), build()).range(from, from + PAGE - 1))) ?? [];
        out.push(...rows);
        if (rows.length < PAGE) return out;
      }
    },
    rpc: (name, args) => ask(() => db().rpc(name, args)),
    async file(run) {
      let r = await attempt(() => run(client.storage.from(bucket)));
      if (r?.error && explainStorage(r.error).code === 'signed_out' && refresh) {
        const renewed = await Promise.resolve().then(refresh).catch(() => false);
        if (renewed) r = await attempt(() => run(client.storage.from(bucket)));
      }
      if (r?.error) { const e = explainStorage(r.error); if (e.code === 'signed_out') onTrouble?.(e.code); throw e; }
      return r?.data ?? null;
    },
  };
}

/** Is the arch schema reachable from a browser? 'ready', 'not_switched_on' or 'unreachable'. Works signed out as well. */
export async function probeShared(gateway) {
  try { await gateway.ask(() => gateway.from('practice').select('id').limit(1)); return 'ready'; } catch (e) {
    return e.code === 'not_switched_on' ? 'not_switched_on' : e.code === 'offline' ? 'unreachable' : 'ready'; // signed out, the database answers "no": that still means it is switched on
  }
}

// ---- the shared store ------------------------------------------------------------------------------------------------------
const ORDER = { project: ['id'], stage: ['project_id', 'key'] }; // every other kind is read in the order it was added
const FILE_LIMIT = 50 * 1024 * 1024;
const isSample = (p) => !!p && (p.sample === true || p.id === SAMPLE_ID);
const matches = (row, where) => !where || Object.entries(where).every(([k, v]) => row?.[k] === v);
const copy = (v) => (v == null ? null : JSON.parse(JSON.stringify(v)));

/**
 *   client     Supabase's client, signed in (or a gateway made by createGateway)
 *   practice   { id, name, role }   role is 'owner', 'member' or 'viewer'
 *   local      the browser store: the Sample project and settings stay there
 */
export function createCloudStore({ client = null, gateway = null, practice, local, schema, bucket, refresh, onTrouble } = {}) {
  if (!practice?.id || !UUID.test(practice.id)) throw new Error('The shared store needs a practice.');
  if (!local) throw new Error('The shared store needs the browser store beside it.');
  const g = gateway ?? createGateway(client, { schema, bucket, refresh, onTrouble });
  const role = () => practice.role;
  const who = practice.name ? `in ${practice.name}` : 'in this practice';
  const snaps = new Map(); // project id -> what each of its rows looked like when last read, so a save writes only what changed

  const check = (kind) => { if (!SHARED_KINDS.includes(kind) && kind !== 'setting') throw new Error(`Unknown kind of record: ${kind}`); };
  const mustWrite = (kind) => {
    if (role() !== 'viewer') return;
    if (kind === 'activity') throw new CloudError('You are a viewer, and viewers cannot add to the activity log, so this was not logged.', 'read_only');
    throw new CloudError(`You are a viewer ${who}: you can read everything and change nothing. Nothing was changed.`, 'read_only');
  };
  const nothing = (e, text = ' Nothing was saved.') => { if (e instanceof CloudError && !/Nothing was|not logged/.test(e.message)) e.message += text; return e; };
  const localProject = async (pid) => !!pid && (pid === SAMPLE_ID || isSample(await local.get('project', pid)));
  const sampleIds = async () => (await local.list('project')).filter(isSample).map((p) => p.id);
  const ctx = { practice_id: practice.id };
  const sig = (rec) => JSON.stringify(rec);
  const rowKey = (kind, rec) => `${kind}:${kind === 'stage' ? rec.key : rec.id}`;
  const stageParts = (id) => { const s = String(id), i = s.lastIndexOf(':'); return i < 1 ? null : { project_id: dbId(s.slice(0, i)), key: stageUp(s.slice(i + 1)) }; };
  const projectIds = async () => (await g.all(() => g.from('project').select('id').eq('practice_id', practice.id))).map((r) => r.id);
  const upsert = async (kind, recs) => {
    for (const part of chunks(recs, 500)) {
      if (APPEND_ONLY.has(kind)) await g.ask(() => g.from(kind).upsert(part, { onConflict: 'id', ignoreDuplicates: true }));
      else await g.ask(() => g.from(kind).upsert(part, { onConflict: kind === 'stage' ? 'project_id,key' : 'id' }));
    }
  };

  const store = {
    persistent: true,
    shared: true,
    practice,

    async list(kind, where) {
      check(kind);
      if (kind === 'setting') return local.list(kind, where);
      const samples = await sampleIds();
      if (kind === 'project') {
        const mine = (await g.all(() => g.from('project').select('*').eq('practice_id', practice.id))).map(projectDown);
        const here = (await local.list('project')).filter(isSample);
        return [...mine, ...here].filter((r) => matches(r, where)).map(copy);
      }
      const pid = where?.project_id;
      if (pid && samples.includes(pid)) return local.list(kind, where);
      let recs;
      if (pid) recs = await g.all(() => g.from(kind).select('*').eq('project_id', dbId(pid)), ORDER[kind] ?? ['seq']);
      else {
        recs = [];
        for (const part of chunks(await projectIds(), 100)) recs.push(...await g.all(() => g.from(kind).select('*').in('project_id', part), ORDER[kind] ?? ['seq']));
      }
      const rest = where ? Object.fromEntries(Object.entries(where).filter(([k]) => k !== 'project_id')) : null;
      const shared = recs.map((r) => fromRecord(kind, r)).filter((r) => matches(r, rest));
      const here = pid ? [] : (await local.list(kind, where)).filter((r) => samples.includes(r.project_id));
      return [...shared, ...here];
    },

    async get(kind, id) {
      check(kind);
      if (kind === 'setting') return local.get(kind, id);
      const here = await local.get(kind, id);
      if (here && (kind === 'project' ? isSample(here) : await localProject(here.project_id))) return here;
      if (id === SAMPLE_ID) return null;
      if (kind === 'stage') {
        const k = stageParts(id);
        if (!k) return null;
        const rows = await g.ask(() => g.from('stage').select('*').eq('project_id', k.project_id).eq('key', k.key).limit(1));
        return rows?.[0] ? fromRecord('stage', rows[0]) : null;
      }
      const q = () => { const s = g.from(kind).select('*').eq('id', dbId(id)); return (kind === 'project' ? s.eq('practice_id', practice.id) : s).limit(1); };
      const rows = await g.ask(q);
      return rows?.[0] ? fromRecord(kind, rows[0]) : null;
    },

    async save(kind, row) {
      check(kind);
      if (kind === 'setting') return local.save(kind, row);
      if (!row || typeof row.id !== 'string' || !row.id) throw new Error('A record needs an id before it can be saved.');
      if (kind === 'project' ? isSample(row) : await localProject(row.project_id)) return local.save(kind, row);
      mustWrite(kind);
      const rec = toRecord(kind, row, ctx);
      try {
        if (APPEND_ONLY.has(kind)) {
          const got = await g.ask(() => g.from(kind).upsert(rec, { onConflict: 'id', ignoreDuplicates: true }).select());
          if (!got?.length) throw new CloudError('That entry is already on the shared record, and entries there cannot be changed.', 'append_only');
          return fromRecord(kind, got[0]);
        }
        const got = await g.ask(() => g.from(kind).upsert(rec, { onConflict: kind === 'stage' ? 'project_id,key' : 'id' }).select());
        return got?.[0] ? fromRecord(kind, got[0]) : fromRecord(kind, rec);
      } catch (e) { throw nothing(e); }
    },

    async remove(kind, id) {
      check(kind);
      if (kind === 'setting') return local.remove(kind, id);
      if (kind === 'project') return store.removeProject(id);
      const here = await local.get(kind, id);
      if (here && await localProject(here.project_id)) return local.remove(kind, id);
      mustWrite(kind);
      if (APPEND_ONLY.has(kind)) throw new CloudError('Approvals and activity are a permanent record once they are shared. They cannot be removed.', 'append_only');
      try {
        if (kind === 'stage') {
          const k = stageParts(id);
          return !!k && ((await g.ask(() => g.from('stage').delete().eq('project_id', k.project_id).eq('key', k.key).select('key')))?.length ?? 0) > 0;
        }
        return ((await g.ask(() => g.from(kind).delete().eq('id', dbId(id)).select('id')))?.length ?? 0) > 0;
      } catch (e) { throw nothing(e, ' Nothing was removed.'); }
    },

    async loadProject(id) {
      if (await localProject(id)) return local.loadProject(id);
      if (id === SAMPLE_ID) return null;
      const pid = dbId(id);
      const found = await g.ask(() => g.from('project').select('*').eq('id', pid).eq('practice_id', practice.id).limit(1));
      if (!found?.[0]) return null;
      const b = emptyBundle(), seen = new Map();
      b.project = projectDown(found[0]);
      seen.set(`project:${pid}`, sig(projectUp(b.project, practice.id)));
      await Promise.all(Object.entries(LISTS).map(async ([kind, list]) => {
        const recs = await g.all(() => g.from(kind).select('*').eq('project_id', pid), ORDER[kind] ?? ['seq']);
        b[list] = recs.map((r) => fromRecord(kind, r));
        for (const row of b[list]) { const rec = toRecord(kind, row); seen.set(rowKey(kind, rec), sig(rec)); }
      }));
      b.stages.sort((x, y) => STAGE_KEYS.indexOf(x.key) - STAGE_KEYS.indexOf(y.key));
      b.activity.sort((x, y) => String(y.at).localeCompare(String(x.at)));
      b.approvals.sort((x, y) => String(x.at).localeCompare(String(y.at)));
      snaps.set(pid, seen);
      return b;
    },

    /**
     * Write a whole project. Only what changed since this project was last read is written, and only rows that were
     * there when it was read can be removed: a colleague's row added in between is left alone.
     * Approvals and activity are only ever added. It is several requests, not one: if one fails part-way, the error says so.
     */
    async saveProject(b) {
      if (!b?.project?.id) throw new Error('A project needs an id before it can be saved.');
      if (isSample(b.project)) return local.saveProject(b);
      mustWrite('project');
      const pid = dbId(b.project.id), seen = snaps.get(pid) ?? null, next = new Map();
      // work out everything first, so nothing is written if the bundle asks for something that cannot be done
      const project = projectUp(b.project, practice.id), plan = [];
      next.set(`project:${pid}`, sig(project));
      for (const kind of ['document', 'task', 'rfi', 'observation', 'variation', 'defect', 'checklist_item', 'approval', 'stage', 'activity']) {
        const recs = (b[LISTS[kind]] ?? []).map((row) => toRecord(kind, { ...row, project_id: pid }));
        const write = [], keys = new Set();
        for (const rec of recs) {
          const key = rowKey(kind, rec), s = sig(rec);
          keys.add(key); next.set(key, s);
          if (seen?.get(key) === s) continue;
          if (APPEND_ONLY.has(kind) && seen?.has(key)) throw new CloudError('An approval or an activity entry already on the shared record cannot be changed. Nothing was saved.', 'append_only');
          write.push(rec);
        }
        const gone = [];
        if (seen && !APPEND_ONLY.has(kind) && kind !== 'stage') for (const key of seen.keys()) if (key.startsWith(`${kind}:`) && !keys.has(key)) gone.push(key.slice(kind.length + 1));
        if (APPEND_ONLY.has(kind) && seen) for (const [key, s] of seen) if (key.startsWith(`${kind}:`) && !keys.has(key)) next.set(key, s); // still on record
        plan.push({ kind, write, gone });
      }
      let wrote = false;
      try {
        if (seen?.get(`project:${pid}`) !== sig(project)) { await g.ask(() => g.from('project').upsert(project, { onConflict: 'id' })); wrote = true; }
        for (const { kind, write, gone } of plan) {
          if (write.length) { await upsert(kind, write); wrote = true; }
          for (const part of chunks(gone, 100)) { await g.ask(() => g.from(kind).delete().in('id', part)); wrote = true; }
        }
      } catch (e) {
        snaps.delete(pid);
        throw nothing(e, wrote ? ' Part of this project may already be saved: open it again to see what the shared records hold.' : ' Nothing was saved.');
      }
      snaps.set(pid, next);
      return pid;
    },

    async removeProject(id) {
      if (await localProject(id)) return local.removeProject(id);
      if (role() !== 'owner') throw new CloudError('Only an owner can remove a project from the shared records. Nothing was removed.', 'read_only');
      const pid = dbId(id);
      try {
        const on = (table) => g.ask(() => g.from(table).select('id').eq('project_id', pid).limit(1));
        if ((await on('approval'))?.length || (await on('activity'))?.length) {
          throw new CloudError('This project has approvals or activity on the shared record, so the record is kept. Nothing was removed.', 'kept');
        }
        for (const f of await store.listFiles({ project_id: pid })) await store.removeFile(f.id);
        const gone = await g.ask(() => g.from('project').delete().eq('id', pid).eq('practice_id', practice.id).select('id'));
        snaps.delete(pid);
        return (gone?.length ?? 0) > 0;
      } catch (e) { throw nothing(e, ' Nothing more was removed.'); }
    },

    async exportProject(id, now) {
      const b = await store.loadProject(id);
      if (!b) throw new Error('That project is not in the shared records.');
      const d = new Date(now ?? Date.now()), day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return { file_name: `${fileSlug(b.project.name)}-project-${day}.json`, text: JSON.stringify(writeBundle(b, now), null, 2) };
    },

    async importProject(text, now) {
      let b = readBundle(text), copied = false;
      if (isSample(b.project)) return local.importProject(text, now); // a sample stays in the browser
      mustWrite('project');
      // a project already here is never overwritten: the file comes in beside it as a copy with ids of its own
      if (await store.get('project', b.project.id)) { b = copyBundle(b, now); copied = true; }
      markBroughtIn(b, 'file', now);
      try { await store.saveProject(b); } catch (e) {
        // the id may belong to a project in another practice, which this person cannot see: bring it in as a copy instead
        if (copied || e.code !== 'refused' || /may already be saved/.test(e.message)) throw e;
        b = copyBundle(b, now); copied = true;
        await store.saveProject(b);
      }
      return { project_id: dbId(b.project.id), copied };
    },

    // ---- files: the bytes go to the practice's private bucket, a record of each goes in the "file" table ----
    async putFile(input, more) {
      const meta = isObj(more) ? { ...more } : isObj(input) && !isBlob(input) ? { ...input } : {};
      const blob = isBlob(input) ? input : meta.blob ?? meta.file ?? meta.data ?? (isBlob(more) ? more : null);
      if (meta.project_id && await localProject(meta.project_id)) {
        if (typeof local.putFile !== 'function') throw new Error('Keeping files for the Sample project is not built yet.');
        return local.putFile(input, more);
      }
      mustWrite('file');
      if (!isBlob(blob)) throw new Error('Choose a file to keep.');
      if (blob.size > FILE_LIMIT) throw new CloudError('That file is over 50 MB, which is more than the shared records accept. It was not kept.', 'failed');
      const name = String(meta.name ?? blob.name ?? '').trim();
      if (!name) throw new Error('A file needs a name before it can be kept.');
      const id = meta.id ? dbId(meta.id) : newUuid(), project = meta.project_id ? dbId(meta.project_id) : null;
      const path = `${practice.id}/${project ?? 'practice'}/${id}`; // ids only: a file's own name can say where a site is
      const type = String(meta.type ?? meta.mime ?? blob.type ?? '') || 'application/octet-stream';
      const { blob: _b, file: _f, data: _d, id: _i, project_id: _p, document_id: _doc, name: _n, type: _t, mime: _m, size: _s, created_at: _c, ...extra } = meta;
      try {
        await g.file((s) => s.upload(path, blob, { contentType: type, upsert: false }));
      } catch (e) { throw nothing(e, ' The file was not kept.'); }
      try {
        const rec = { id, practice_id: practice.id, project_id: project, document_id: meta.document_id ? dbId(meta.document_id) : null, name, mime: type, size: blob.size, storage_path: path, extra };
        const got = await g.ask(() => g.from('file').insert(rec).select());
        return fileDown(got?.[0] ?? rec);
      } catch (e) {
        try { await g.file((s) => s.remove([path])); } catch { /* the record was refused; the bytes may be left behind for an owner to clear */ }
        throw nothing(e, ' The file was not kept.');
      }
    },
    async getFile(id) {
      if (typeof local.getFile === 'function') { const here = await local.getFile(id).catch(() => null); if (here && await localProject(here.project_id)) return here; }
      const rows = await g.ask(() => g.from('file').select('*').eq('id', dbId(id)).eq('practice_id', practice.id).limit(1));
      if (!rows?.[0]) return null;
      const blob = await g.file((s) => s.download(rows[0].storage_path));
      return { ...fileDown(rows[0]), blob };
    },
    async removeFile(id) {
      if (typeof local.getFile === 'function') { const here = await local.getFile(id).catch(() => null); if (here && await localProject(here.project_id)) return local.removeFile(id); }
      mustWrite('file');
      try {
        const rows = await g.ask(() => g.from('file').select('id, storage_path').eq('id', dbId(id)).eq('practice_id', practice.id).limit(1));
        if (!rows?.[0]) return false;
        await g.file((s) => s.remove([rows[0].storage_path]));
        return ((await g.ask(() => g.from('file').delete().eq('id', rows[0].id).select('id')))?.length ?? 0) > 0;
      } catch (e) { throw nothing(e, ' The file was not removed.'); }
    },
    async listFiles(where = {}) {
      const pid = where?.project_id;
      if (pid && await localProject(pid)) return typeof local.listFiles === 'function' ? local.listFiles(where) : [];
      const recs = await g.all(() => {
        let q = g.from('file').select('*').eq('practice_id', practice.id);
        if (pid) q = q.eq('project_id', dbId(pid));
        if (where?.document_id) q = q.eq('document_id', dbId(where.document_id));
        return q;
      }, ['seq']);
      return recs.map(fileDown);
    },
  };
  return store;
}

const isBlob = (v) => typeof Blob !== 'undefined' && v instanceof Blob;
const fileDown = (r) => ({ ...obj(r.extra), id: r.id, project_id: r.project_id ?? '', document_id: r.document_id ?? '', name: r.name ?? '', type: r.mime ?? '', size: Number(r.size ?? 0), created_at: iso(r.created_at ?? Date.now()) ?? '' });

/**
 * Approvals and activity that come up from a browser or a file were not recorded under a sign-in.
 * The database will file them under the account that brought them in, so each one is marked to say so.
 */
function markBroughtIn(b, from, now) {
  const at = new Date(now ?? Date.now()).toISOString();
  for (const list of ['approvals', 'activity']) for (const r of b[list] ?? []) if (!r.brought_in) r.brought_in = { from, at };
  return b;
}

// ---- one store for the page ------------------------------------------------------------------------------------------------
/** The page keeps this one object. use(store) points it at the shared store; use(null) points it back at the browser. */
export function createSwitch(local) {
  let current = local;
  const s = {
    local,
    use(store) { current = store ?? local; return s; },
    get current() { return current; },
    get shared() { return current !== local; },
    get persistent() { return current.persistent; },
  };
  for (const name of ['list', 'get', 'save', 'remove', 'loadProject', 'saveProject', 'removeProject', 'exportProject', 'importProject']) s[name] = (...args) => current[name](...args);
  for (const name of ['putFile', 'getFile', 'removeFile', 'listFiles']) {
    s[name] = (...args) => (typeof current[name] === 'function' ? current[name](...args) : Promise.reject(new Error('Keeping files in this browser is not built yet.')));
  }
  return s;
}

// ---- move this browser's projects to the practice ------------------------------------------------------------------------
/**
 * Copy chosen browser projects up to the shared records. Never automatic: the page calls this when a person asks.
 * The browser copy is left exactly as it was. A project already in the shared records is not copied over.
 * Returns one line per project: { id, name, outcome: 'copied' | 'already' | 'skipped' | 'failed', reason, counts }.
 * counts are read back from the shared records after the copy, not assumed.
 */
export async function moveProjects({ local, cloud, ids, now }) {
  const out = [], moved = (await local.get('setting', 'moved'))?.value ?? {};
  const note = async (id, state) => { moved[id] = { state, at: new Date(now ?? Date.now()).toISOString(), practice_id: cloud.practice?.id ?? '', practice: cloud.practice?.name ?? '' }; await local.save('setting', { id: 'moved', value: moved }); };
  for (const id of ids ?? []) {
    const b = await local.loadProject(id);
    if (!b) { out.push({ id, name: '', outcome: 'failed', reason: 'That project is not in this browser.' }); continue; }
    const name = b.project.name;
    if (isSample(b.project)) { out.push({ id, name, outcome: 'skipped', reason: 'The Sample stays in this browser.' }); continue; }
    try {
      const there = await cloud.get('project', id), retry = moved[id]?.state === 'failed' && moved[id]?.practice_id === cloud.practice?.id;
      if (there && !retry) { out.push({ id, name, outcome: 'already', reason: 'It is already in the shared records, so it was not copied again.' }); continue; }
      await note(id, 'failed'); // until the whole copy has been read back
      await cloud.saveProject(markBroughtIn(copy(b), 'browser', now));
      let files = 0;
      if (typeof local.listFiles === 'function' && typeof local.getFile === 'function') {
        const kept = new Set((await cloud.listFiles({ project_id: id })).map((f) => f.id));
        for (const f of await local.listFiles({ project_id: id })) {
          if (kept.has(dbId(f.id))) { files++; continue; }
          const full = await local.getFile(f.id);
          if (!full?.blob) continue;
          await cloud.putFile({ ...f, blob: full.blob, project_id: id });
          files++;
        }
      }
      const back = await cloud.loadProject(id);
      if (!back) throw new CloudError('The copy could not be read back from the shared records.', 'failed');
      const counts = Object.fromEntries(Object.values(LISTS).map((list) => [list, back[list].length]));
      const short = Object.values(LISTS).filter((list) => list !== 'activity' && back[list].length < b[list].length);
      if (short.length) throw new CloudError('The copy read back from the shared records is missing some rows.', 'failed');
      counts.files = files;
      await note(id, 'copied');
      out.push({ id, name, outcome: 'copied', reason: '', counts });
    } catch (e) {
      out.push({ id, name, outcome: 'failed', reason: e instanceof CloudError || e instanceof Error ? e.message : 'It could not be copied.' });
      if (e?.code === 'signed_out' || e?.code === 'not_switched_on' || e?.code === 'offline') break; // the rest would fail the same way
    }
  }
  return out;
}

// ---- practices, people and invitations ----------------------------------------------------------------------------------
const ROLES = ['owner', 'member', 'viewer'];
const cleanEmail = (v) => String(v ?? '').trim().toLowerCase();

export function createTeam(g) {
  const one = (rows) => rows?.[0] ?? null;
  return {
    /** the practices this person belongs to: [{ id, name, role }] */
    async myPractices(userId) {
      const mine = (await g.all(() => g.from('practice_member').select('practice_id, role').eq('user_id', userId), ['practice_id'])) ?? [];
      if (!mine.length) return [];
      const names = await g.ask(() => g.from('practice').select('id, name').in('id', mine.map((m) => m.practice_id)));
      return mine.map((m) => ({ id: m.practice_id, role: m.role, name: names?.find((p) => p.id === m.practice_id)?.name ?? '' })).sort((a, b) => a.name.localeCompare(b.name));
    },
    /** the person who creates a practice becomes its owner (the database does that) */
    async createPractice(name) {
      const title = String(name ?? '').trim();
      if (title.length < 2) throw new Error('Give the practice a name.');
      const row = one(await g.ask(() => g.from('practice').insert({ name: title }).select('id, name')));
      if (!row) throw new CloudError('The practice could not be read back after it was made.', 'failed');
      return { id: row.id, name: row.name, role: 'owner' };
    },
    /** open invitations for this person's own Google-verified address. The database works out the address from the sign-in. */
    myInvitations: async () => (await g.rpc('my_invitations')) ?? [],
    acceptInvitation: (id) => g.rpc('accept_invitation', { p_invitation: id }),
    people: async (practiceId) => (await g.rpc('practice_people', { p_practice: practiceId })) ?? [],
    /** open invitations for a practice (owners only: the database shows them to nobody else) */
    invitations: async (practiceId) => (await g.all(() => g.from('invitation').select('id, email, role, created_at').eq('practice_id', practiceId).is('accepted_at', null), ['created_at', 'id'])) ?? [],
    async invite(practiceId, email, role) {
      const mail = cleanEmail(email);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) throw new Error('That does not look like an email address.');
      if (!ROLES.includes(role)) throw new Error('Choose a role: owner, member or viewer.');
      const row = one(await g.ask(() => g.from('invitation').insert({ practice_id: practiceId, email: mail, role }).select('id, email, role, created_at')));
      if (!row) throw new CloudError('The invitation could not be read back after it was made.', 'failed');
      return row;
    },
    cancelInvitation: async (id) => ((await g.ask(() => g.from('invitation').delete().eq('id', id).select('id')))?.length ?? 0) > 0,
    /** the database refuses this for anyone but an owner, and refuses to leave a practice with no owner */
    async setRole(practiceId, userId, role) {
      if (!ROLES.includes(role)) throw new Error('Choose a role: owner, member or viewer.');
      const rows = await g.ask(() => g.from('practice_member').update({ role }).eq('practice_id', practiceId).eq('user_id', userId).select('user_id, role'));
      if (!rows?.length) throw new CloudError('The shared records refused that: only an owner can change roles. Nothing was changed.', 'refused');
      return rows[0];
    },
    /** remove someone, or leave (your own id) */
    async removePerson(practiceId, userId) {
      const rows = await g.ask(() => g.from('practice_member').delete().eq('practice_id', practiceId).eq('user_id', userId).select('user_id'));
      if (!rows?.length) throw new CloudError('The shared records refused that: only an owner can remove someone else. Nothing was changed.', 'refused');
      return true;
    },
  };
}
