// A small stand-in for Supabase's JavaScript client, for tests. In memory, no network.
// It speaks the part of the client the page uses (schema().from().select/insert/upsert/update/delete with eq, in, is,
// order, range, limit; rpc; storage upload, download, remove) and imitates the database rules that matter to the page:
//   the seven stages seeded with a new project; approvals and activity append-only; a stage not done without an approval;
//   a project with history not deletable; at most 1000 rows per request; a viewer's writes refused.
// It is not the database. The real rules are tested in tests/architecture-db on Postgres.

const STAGES = ['predesign', 'concept', 'developed', 'detailed', 'contract_admin', 'observation', 'completion'];
const APPEND_ONLY = ['approval', 'activity', 'crm_activity'];
const copy = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
const err = (code, message, status = 400) => ({ code, message, details: null, hint: null, status });

export function fakeSupabase({ userId = '00000000-0000-4000-8000-00000000a11c', rpc = {} } = {}) {
  const db = {}; // table -> rows
  const files = new Map(); // "bucket/path" -> Blob
  const log = []; // every request: { table, action, filters, rows }
  let seq = 0;
  const rows = (t) => (db[t] ??= []);
  const fake = {
    db, files, log, userId, rpcHandlers: rpc,
    /** set to a function (op) => error | null to make chosen requests fail */
    fail: null,
    /** true: the database treats this person as a viewer (inserts refused, updates and deletes touch nothing) */
    viewer: false,
    writes: () => log.filter((o) => o.action !== 'select' && o.action !== 'rpc'),
    schema: () => fake,
    from: (table) => new Query(table),
    rpc: (name, args) => ({ then: (res, rej) => Promise.resolve(runRpc(name, args)).then(res, rej) }),
    storage: { from: (bucket) => bucketApi(bucket) },
  };

  function runRpc(name, args) {
    const op = { table: `rpc/${name}`, action: 'rpc', args: copy(args) };
    log.push(op);
    const failed = fake.fail?.(op);
    if (failed) return { data: null, error: failed };
    const h = fake.rpcHandlers[name];
    if (!h) return { data: null, error: err('PGRST202', `Could not find the function arch.${name} in the schema cache`, 404) };
    try { return { data: copy(h(args ?? {})), error: null }; } catch (e) { return { data: null, error: e }; }
  }

  class Query {
    constructor(table) { this.table = table; this.action = 'select'; this.filters = []; this.orders = []; this.from = 0; this.to = null; this.returning = false; }
    select(cols = '*') { if (this.action === 'select') this.cols = cols; else this.returning = cols || '*'; return this; }
    insert(r) { this.action = 'insert'; this.rows = [].concat(copy(r)); return this; }
    upsert(r, o = {}) { this.action = 'upsert'; this.rows = [].concat(copy(r)); this.conflict = (o.onConflict ?? 'id').split(','); this.ignore = !!o.ignoreDuplicates; return this; }
    update(v) { this.action = 'update'; this.values = copy(v); return this; }
    delete() { this.action = 'delete'; return this; }
    eq(c, v) { this.filters.push(['eq', c, v]); return this; }
    in(c, v) { this.filters.push(['in', c, [...v]]); return this; }
    is(c, v) { this.filters.push(['is', c, v]); return this; }
    order(c, o = {}) { this.orders.push([c, o.ascending !== false]); return this; }
    range(a, b) { this.from = a; this.to = b; return this; }
    limit(n) { this.to = this.from + n - 1; return this; }
    then(res, rej) { return Promise.resolve().then(() => this.run()).then(res, rej); }

    match(r) { return this.filters.every(([op, c, v]) => (op === 'eq' ? r[c] === v : op === 'in' ? v.includes(r[c]) : (r[c] ?? null) === v)); }
    pick(list) {
      if (!this.returning && this.action !== 'select') return null;
      const cols = this.action === 'select' ? this.cols ?? '*' : this.returning;
      const names = cols === '*' ? null : cols.split(',').map((s) => s.trim());
      return list.map((r) => (names ? Object.fromEntries(names.map((n) => [n, copy(r[n]) ?? null])) : copy(r)));
    }
    run() {
      const op = { table: this.table, action: this.action, filters: copy(this.filters), rows: copy(this.rows ?? (this.values ? [this.values] : [])) };
      log.push(op);
      const failed = fake.fail?.(op);
      if (failed) return { data: null, error: failed };
      const t = rows(this.table), rls = err('42501', `new row violates row-level security policy for table "${this.table}"`, 403);

      if (this.action === 'select') {
        let out = t.filter((r) => this.match(r));
        for (const [c, asc] of [...this.orders].reverse()) out = [...out].sort((a, b) => (a[c] === b[c] ? 0 : (a[c] > b[c] ? 1 : -1) * (asc ? 1 : -1)));
        const to = Math.min(this.to ?? this.from + 999, this.from + 999); // the API never hands back more than 1000 rows
        return { data: this.pick(out.slice(this.from, to + 1)), error: null };
      }
      if (this.action === 'insert' || this.action === 'upsert') {
        if (fake.viewer) return { data: null, error: rls };
        const keys = this.conflict ?? (this.table === 'stage' ? ['project_id', 'key'] : this.table === 'practice_member' ? ['practice_id', 'user_id'] : ['id']);
        const first = Object.keys(this.rows[0] ?? {}).sort().join();
        if (this.rows.some((r) => Object.keys(r).sort().join() !== first)) return { data: null, error: err('PGRST102', 'All object keys must match') };
        const touched = [];
        for (const r of this.rows) {
          const old = t.find((x) => keys.every((k) => x[k] === r[k]));
          if (this.table === 'stage' && r.status === 'done' && !rows('approval').some((a) => a.project_id === r.project_id && a.stage === r.key)) {
            return { data: null, error: err('23514', `Stage ${r.key} cannot be marked done: no approval recorded for it`) };
          }
          if (this.table === 'project' && r.stage && !STAGES.includes(r.stage)) return { data: null, error: err('23514', 'new row for relation "project" violates check constraint "project_stage_check"') };
          if (old) {
            if (this.action === 'insert') return { data: null, error: err('23505', 'duplicate key value violates unique constraint', 409) };
            if (this.ignore) continue;
            if (APPEND_ONLY.includes(this.table)) return { data: null, error: err('42501', `permission denied for table ${this.table}`, 403) };
            Object.assign(old, r);
            if (this.table === 'project') old.updated_at = new Date().toISOString();
            touched.push(old);
            continue;
          }
          const row = { extra: {}, ...r };
          if (!('id' in row) && this.table !== 'stage' && this.table !== 'practice_member') row.id = crypto.randomUUID();
          if (!['stage', 'project', 'practice', 'practice_member'].includes(this.table)) row.seq = ++seq;
          if (this.table === 'practice') row.created_by = userId;
          if (this.table === 'invitation') { row.accepted_at ??= null; row.created_at ??= new Date().toISOString(); }
          if (this.table === 'file') row.created_at ??= new Date().toISOString();
          t.push(row); touched.push(row);
          if (this.table === 'project') for (const key of STAGES) if (!rows('stage').some((s) => s.project_id === row.id && s.key === key)) rows('stage').push({ project_id: row.id, key, status: 'not_started', started_at: null, done_at: null, extra: {} });
          if (this.table === 'practice') rows('practice_member').push({ practice_id: row.id, user_id: userId, role: 'owner' });
        }
        return { data: this.pick(touched), error: null };
      }
      const hit = fake.viewer ? [] : t.filter((r) => this.match(r));
      if (this.action === 'update') {
        if (APPEND_ONLY.includes(this.table)) return { data: null, error: err('42501', `permission denied for table ${this.table}`, 403) };
        for (const r of hit) Object.assign(r, this.values);
        return { data: this.pick(hit), error: null };
      }
      // delete
      if (APPEND_ONLY.includes(this.table)) return { data: null, error: err('42501', `permission denied for table ${this.table}`, 403) };
      if (this.table === 'project') {
        for (const p of hit) if (APPEND_ONLY.some((k) => rows(k).some((x) => x.project_id === p.id))) return { data: null, error: err('23503', 'update or delete on table "project" violates foreign key constraint', 409) };
        for (const p of hit) for (const k of Object.keys(db)) if (k !== 'project') db[k] = db[k].filter((x) => x.project_id !== p.id);
      }
      if (this.table === 'document') for (const d of hit) for (const c of rows('checklist_item')) if (c.document_id === d.id) c.document_id = null;
      db[this.table] = rows(this.table).filter((r) => !hit.includes(r));
      return { data: this.pick(hit), error: null };
    }
  }

  function bucketApi(bucket) {
    const key = (p) => `${bucket}/${p}`, refuse = { message: 'new row violates row-level security policy', statusCode: '403' };
    const done = (op, answer) => { log.push(op); const failed = fake.fail?.(op); return Promise.resolve(failed ? { data: null, error: failed } : answer()); };
    return {
      upload: (path, blob, opts = {}) => done({ table: `storage/${bucket}`, action: 'upload', path, opts }, () => {
        if (fake.viewer) return { data: null, error: refuse };
        if (files.has(key(path)) && !opts.upsert) return { data: null, error: { message: 'The resource already exists', statusCode: '409' } };
        files.set(key(path), blob);
        return { data: { path }, error: null };
      }),
      download: (path) => done({ table: `storage/${bucket}`, action: 'download', path }, () => (files.has(key(path)) ? { data: files.get(key(path)), error: null } : { data: null, error: { message: 'Object not found', statusCode: '404' } })),
      /** links that last a while, for files that are there (the page's practice artwork) */
      createSignedUrls: (paths, expiresIn) => done({ table: `storage/${bucket}`, action: 'sign', paths, expiresIn }, () => ({
        data: paths.map((p) => (files.has(key(p)) ? { path: p, signedUrl: `https://storage.example.test/sign/${bucket}/${p}?token=t${expiresIn}`, error: null } : { path: p, signedUrl: null, error: 'Object not found' })), error: null,
      })),
      remove: (paths) => done({ table: `storage/${bucket}`, action: 'remove', paths }, () => {
        if (fake.viewer) return { data: [], error: null };
        const gone = paths.filter((p) => files.delete(key(p)));
        return { data: gone.map((name) => ({ name })), error: null };
      }),
    };
  }
  return fake;
}

/** the answer the real API gives until the owner exposes the arch schema: code PGRST106, wording as reported on 22 November 2026.
 *  The page goes by the code alone, so a change of wording does not matter. */
export const PGRST106 = { code: 'PGRST106', details: null, hint: 'Only the following schemas are exposed: public, graphql_public', message: 'Invalid schema: arch' };
export const JWT_EXPIRED = { code: 'PGRST303', details: null, hint: null, message: 'JWT expired' };
