// Where comments are kept. Two places with the same calls, so the screens do not care which:
//
//   local    this browser (localStorage). For the Sample project and for anyone signed out: comments can be tried without the
//            database. Nobody else sees them. Here the person using the page is the owner, so they may hide and delete.
//   shared   the practice's records (arch.comment, supabase/migrations/20261123220000_arch_comments.sql). Row level security
//            decides: members read and write, owners alone hide or delete. A viewer's write is refused by the database.
//
//   list(projectId) -> [comment]    add(draft) -> comment    setHidden(id, hidden) -> comment    remove(id) -> true
//   people() -> [{ user_id, name, email }]    (shared: the practice's members, for @mentions; local: none)
//
// A comment: { id, project_id, file_id, pin: { x, y } | null, pin_no, author_kind: 'member' | 'client', author_id, author_name,
// body, mentions: [user id], to_client, hidden, created_at }. Words are cleaned (comments-rules.js) before anything is kept.
import { cleanBody, cleanName, pinOf, mentionsIn, nextPinNo, byWhen } from './comments-rules.js';
import { dbId } from './cloud.js';

export const KEY = 'assembl.architecture.comments.v1';
const newId = () => `cm_${globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`}`;
const copy = (v) => JSON.parse(JSON.stringify(v));

/** a draft made safe, or an Error in plain words. file_id and pin are optional; a pin needs a file. */
export function draftOf(d, { people = [] } = {}) {
  const body = cleanBody(d?.body), name = cleanName(d?.author_name);
  if (!body.ok) throw new Error(body.why);
  if (!name.ok) throw new Error(name.why);
  const pin = d?.pin ? pinOf(d.pin.x, d.pin.y) : null;
  if (d?.pin && !pin) throw new Error('That point is not on the picture.');
  if (pin && !d.file_id) throw new Error('A pin needs a picture to sit on.');
  return {
    project_id: String(d.project_id ?? ''), file_id: d.file_id ? String(d.file_id) : null, pin,
    author_kind: d.author_kind === 'client' ? 'client' : 'member', author_name: name.text, body: body.text,
    mentions: d.author_kind === 'client' ? [] : mentionsIn(body.text, people), to_client: d.author_kind === 'client' ? true : !!d.to_client,
  };
}

/** the browser's own place: backend is localStorage (or any getItem/setItem/removeItem) */
export function createLocalComments(backend = (() => { try { return globalThis.localStorage ?? null; } catch { return null; } })(), { now = null } = {}) {
  let memory = {}, last = 0;
  // each comment is stamped later than the one before it, so two made in the same millisecond keep their order
  const stamp = now ?? (() => { let t = Date.now(); if (t <= last) t = last + 1; last = t; return new Date(t).toISOString(); });
  const read = () => { try { const raw = backend?.getItem(KEY); const v = raw ? JSON.parse(raw) : null; return v && typeof v === 'object' ? v : memory; } catch { return memory; } };
  const write = (rows) => { memory = rows; try { backend?.setItem(KEY, JSON.stringify(rows)); } catch { /* kept for this visit only */ } };
  return {
    place: 'browser', canModerate: true, persistent: !!backend,
    async list(projectId) { return Object.values(read()).filter((c) => c.project_id === projectId).sort(byWhen).map(copy); },
    async add(d) {
      const row = draftOf(d), rows = read();
      if (!row.project_id) throw new Error('A comment belongs to a project.');
      const mine = Object.values(rows).filter((c) => c.project_id === row.project_id);
      const c = { id: newId(), ...row, pin_no: row.pin ? nextPinNo(mine, row.file_id) : null, author_id: row.author_kind === 'client' ? null : 'me', hidden: false, created_at: stamp() };
      rows[c.id] = c; write(rows);
      return copy(c);
    },
    async setHidden(id, hidden) { const rows = read(); if (!rows[id]) throw new Error('That comment is not here any more.'); rows[id].hidden = !!hidden; write(rows); return copy(rows[id]); },
    async remove(id) { const rows = read(); if (!(id in rows)) return false; delete rows[id]; write(rows); return true; },
    async people() { return []; },
    /** the comments a client sees on a preview of the client page: marked for the client and not hidden */
    async forClient(projectId) { return (await this.list(projectId)).filter((c) => c.to_client && !c.hidden); },
  };
}

const fromRow = (r) => ({
  id: r.id, project_id: r.project_id, file_id: r.file_id ?? null,
  pin: r.pin_x != null && r.pin_y != null ? { x: Number(r.pin_x), y: Number(r.pin_y) } : null, pin_no: r.pin_no ?? null,
  author_kind: r.author_kind, author_id: r.author_id ?? null, author_name: r.author_name, body: r.body, mentions: r.mentions ?? [],
  to_client: !!r.to_client, hidden: !!r.hidden, created_at: r.created_at,
});

/**
 * A practice's comments through the gateway (cloud.js createGateway). practice { id, role }, user { id } the signed-in person,
 * team: createTeam(gateway), for the members to @mention.
 */
export function createSharedComments(gateway, practice, user, team = null) {
  const g = gateway, owner = practice?.role === 'owner', cols = 'id,project_id,file_id,pin_x,pin_y,pin_no,author_kind,author_id,author_name,body,mentions,to_client,hidden,created_at';
  let peopleCache = null;
  return {
    place: 'shared', canModerate: owner, practice: practice?.id ?? null,
    async list(projectId) {
      const rows = await g.all(() => g.from('comment').select(cols).eq('project_id', dbId(projectId)), ['created_at', 'id']);
      return rows.map(fromRow);
    },
    async people() {
      if (peopleCache) return peopleCache;
      try { peopleCache = ((await team?.people?.(practice.id)) ?? []).map((p) => ({ user_id: p.user_id, name: p.name || '', email: p.email || '' })); } catch { peopleCache = []; }
      return peopleCache;
    },
    async add(d) {
      const row = draftOf({ ...d, author_kind: 'member' }, { people: await this.people() });
      if (!row.project_id) throw new Error('A comment belongs to a project.');
      const rec = { practice_id: practice.id, project_id: dbId(row.project_id), file_id: row.file_id ? dbId(row.file_id) : null, pin_x: row.pin?.x ?? null, pin_y: row.pin?.y ?? null,
        author_kind: 'member', author_id: user?.id, author_name: row.author_name, body: row.body, mentions: row.mentions, to_client: row.to_client };
      const rows = await g.ask(() => g.from('comment').insert(rec).select(cols));
      if (!rows?.[0]) throw new Error('The shared records did not keep that comment. Nothing was changed.');
      return fromRow(rows[0]);
    },
    async setHidden(id, hidden) {
      if (!owner) throw new Error('Only an owner of the practice can hide a comment.');
      const rows = await g.ask(() => g.from('comment').update({ hidden: !!hidden }).eq('id', dbId(id)).select(cols));
      if (!rows?.[0]) throw new Error('The shared records refused that: only an owner can hide a comment. Nothing was changed.');
      return fromRow(rows[0]);
    },
    async remove(id) {
      if (!owner) throw new Error('Only an owner of the practice can delete a comment.');
      return ((await g.ask(() => g.from('comment').delete().eq('id', dbId(id)).select('id')))?.length ?? 0) > 0;
    },
  };
}
