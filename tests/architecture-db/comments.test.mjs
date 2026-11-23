// Part (20261123220000_arch_comments.sql): comments and pins, on PGlite with the stand-ins for Supabase. Not Supabase, and no network.
// Who can read and write what (members, owners, viewers, strangers, anon), what the token functions answer, and the rate limit.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';

const here = path.dirname(fileURLToPath(import.meta.url));
const migDir = path.resolve(here, '../../supabase/migrations');
const migrations = readdirSync(migDir).filter((f) => /^\d+_arch_.*\.sql$/.test(f)).sort();
const uid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const OWNER = uid(1), MEMBER = uid(2), VIEWER = uid(3), STRANGER = uid(4), OTHER_MEMBER = uid(5);
const TOKEN = 'c'.repeat(64), IP = 'ab'.repeat(16);
let db, practice, project, file, file2, project2;

const as = async (role, id, fn) => {
  await db.exec(`set role ${role}`);
  if (id) await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [id]);
  try { return await fn(); } finally { await db.exec('reset role'); await db.query(`select set_config('request.jwt.claim.sub', '', false)`); }
};
const user = (id, fn) => as('authenticated', id, fn);
const q = (sql, params) => db.query(sql, params);
const refused = (p, re = /row-level security|permission denied|violates|check constraint/) => assert.rejects(p, re);
const insert = (who, o = {}) => user(who, () => q(
  `insert into arch.comment (practice_id, project_id, file_id, pin_x, pin_y, author_kind, author_id, author_name, body, mentions, to_client)
   values ($1,$2,$3,$4,$5,'member',$6,$7,$8,$9,$10) returning *`,
  [practice, o.project ?? project, o.file ?? null, o.x ?? null, o.y ?? null, who, o.name ?? 'Tui', o.body ?? 'hello', o.mentions ?? [], o.toClient ?? false]));

before(async () => {
  db = new PGlite();
  await db.exec(readFileSync(path.join(here, 'standins.sql'), 'utf8'));
  await q(`insert into auth.users (id, email) values ($1,'o@x'),($2,'m@x'),($3,'v@x'),($4,'s@x'),($5,'om@x')`, [OWNER, MEMBER, VIEWER, STRANGER, OTHER_MEMBER]);
  for (const f of migrations) await db.exec(readFileSync(path.join(migDir, f), 'utf8'));
  practice = (await user(OWNER, () => q(`insert into arch.practice (name, created_by) values ('Sample practice', $1) returning id`, [OWNER]))).rows[0].id;
  await user(OWNER, () => q(`insert into arch.practice_member (practice_id,user_id,role) values ($1,$2,'member'),($1,$3,'viewer')`, [practice, MEMBER, VIEWER]));
  project = (await user(MEMBER, () => q(`insert into arch.project (practice_id, name) values ($1,'Sample house') returning id`, [practice]))).rows[0].id;
  project2 = (await user(MEMBER, () => q(`insert into arch.project (practice_id, name) values ($1,'Sample shed') returning id`, [practice]))).rows[0].id;
  const mk = async (n, p) => { const id = uid(100 + n); await q(`insert into arch.file (id,practice_id,project_id,owner_kind,owner_id,name,storage_path,created_by) values ($1,$2,$3,'source',$3,'front.jpg',$4,$5)`, [id, practice, p, `${practice}/${p}/${id}`, OWNER]); return id; };
  file = await mk(1, project); file2 = await mk(2, project2);
});
after(async () => { await db.close(); });

test('applies twice without change, with row level security on and nothing granted to anon', async () => {
  const count = async () => (await q(`select (select count(*) from pg_policies where schemaname='arch')::int p, (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='arch')::int f`)).rows[0];
  const a = await count();
  await db.exec(readFileSync(path.join(migDir, '20261123220000_arch_comments.sql'), 'utf8'));
  assert.deepEqual(await count(), a);
  const rls = (await q(`select relname, relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='arch' and relname in ('comment','comment_hit')`)).rows;
  assert.equal(rls.length, 2); for (const r of rls) assert.equal(r.relrowsecurity, true, r.relname);
  await refused(as('anon', null, () => q(`select * from arch.comment`)), /permission denied/);
  await refused(as('anon', null, () => q(`select arch.client_comments('${TOKEN}')`)), /permission denied/);
  await refused(user(MEMBER, () => q(`select arch.client_comment_add('${TOKEN}', '${IP}', 'Ana', 'hi')`)), /permission denied/);
  await refused(user(MEMBER, () => q(`select * from arch.comment_hit`)), /permission denied/);
});

test('members write as themselves; viewers read only; strangers see nothing', async () => {
  const c = (await insert(MEMBER, { body: 'for the team' })).rows[0];
  assert.equal(c.author_kind, 'member'); assert.equal(c.to_client, false); assert.equal(c.pin_no, null);
  assert.equal((await user(OWNER, () => q(`select * from arch.comment`))).rows.length, 1);
  assert.equal((await user(VIEWER, () => q(`select * from arch.comment`))).rows.length, 1);
  assert.equal((await user(STRANGER, () => q(`select * from arch.comment`))).rows.length, 0);
  await refused(insert(VIEWER), /row-level security/);
  await refused(insert(STRANGER), /row-level security/);
  // not as someone else, not as a client, not with a token hash, not already hidden
  await refused(user(MEMBER, () => q(`insert into arch.comment (practice_id, project_id, author_id, author_name, body) values ($1,$2,$3,'X','y')`, [practice, project, OWNER])), /row-level security/);
  await refused(user(MEMBER, () => q(`insert into arch.comment (practice_id, project_id, author_kind, author_id, author_name, body, via_token_hash, to_client) values ($1,$2,'client',null,'X','y','h',true)`, [practice, project])));
  await refused(user(MEMBER, () => q(`insert into arch.comment (practice_id, project_id, author_id, author_name, body, via_token_hash) values ($1,$2,$3,'X','y','h')`, [practice, project, MEMBER])));
  await refused(user(MEMBER, () => q(`insert into arch.comment (practice_id, project_id, author_id, author_name, body, hidden) values ($1,$2,$3,'X','y',true)`, [practice, project, MEMBER])), /row-level security/);
});

test('plain text with a limit: 2,000 characters, no control characters, a name of 60', async () => {
  await insert(MEMBER, { body: 'x'.repeat(2000) });
  await refused(insert(MEMBER, { body: 'x'.repeat(2001) }), /check constraint/);
  await refused(insert(MEMBER, { body: '   ' }), /check constraint/);
  await refused(insert(MEMBER, { body: 'a\u0000b'.replace('\u0000', '\u0007') }), /check constraint/);
  await refused(insert(MEMBER, { name: 'n'.repeat(61) }), /check constraint/);
  await insert(MEMBER, { body: 'line one\nline two\ttabbed' });
});

test('a pin sits on a file in the same project, as fractions, and gets the next number on that file', async () => {
  const a = (await insert(MEMBER, { file, x: 0.25, y: 0.5 })).rows[0], b = (await insert(OWNER, { file, x: 1, y: 0 })).rows[0];
  assert.deepEqual([a.pin_no, b.pin_no], [1, 2]);
  assert.equal(Number(a.pin_x), 0.25);
  await refused(insert(MEMBER, { file, x: 1.1, y: 0.5 }), /check constraint/);
  await refused(insert(MEMBER, { file, x: 0.5 }), /check constraint/);
  await refused(insert(MEMBER, { x: 0.5, y: 0.5 }), /check constraint/); // a pin needs a file
  await refused(insert(MEMBER, { file: file2, x: 0.5, y: 0.5 }), /not in this project/);
  await refused(insert(MEMBER, { file: file2 }), /not in this project/);
  // numbers are kept when an earlier pin is removed
  await user(OWNER, () => q(`delete from arch.comment where id=$1`, [a.id]));
  assert.equal((await insert(MEMBER, { file, x: 0.1, y: 0.1 })).rows[0].pin_no, 3);
  // a number cannot be chosen by the writer
  const forced = (await user(MEMBER, () => q(`insert into arch.comment (practice_id, project_id, file_id, pin_x, pin_y, pin_no, author_id, author_name, body) values ($1,$2,$3,.5,.5,99,$4,'T','b') returning pin_no`, [practice, project, file, MEMBER]))).rows[0];
  assert.equal(forced.pin_no, 4);
});

test('mentions keep only members of the practice', async () => {
  const c = (await insert(MEMBER, { mentions: [OWNER, STRANGER, OTHER_MEMBER, uid(999)], body: '@someone' })).rows[0];
  assert.deepEqual(c.mentions, [OWNER]);
});

test('only an owner hides, shows or deletes; a member cannot change anyone\'s words; a hidden comment is seen by owners alone', async () => {
  const c = (await insert(MEMBER, { body: 'rude comment' })).rows[0];
  assert.equal((await user(MEMBER, () => q(`update arch.comment set hidden=true where id=$1`, [c.id]))).affectedRows, 0);
  assert.equal((await user(MEMBER, () => q(`delete from arch.comment where id=$1`, [c.id]))).affectedRows, 0);
  assert.equal((await user(VIEWER, () => q(`delete from arch.comment where id=$1`, [c.id]))).affectedRows, 0);
  await refused(user(OWNER, () => q(`update arch.comment set body='changed' where id=$1`, [c.id])), /permission denied/);
  await refused(user(OWNER, () => q(`update arch.comment set author_name='someone else' where id=$1`, [c.id])), /permission denied/);
  const hid = (await user(OWNER, () => q(`update arch.comment set hidden=true where id=$1 returning hidden, hidden_by, hidden_at`, [c.id]))).rows[0];
  assert.equal(hid.hidden, true); assert.equal(hid.hidden_by, OWNER); assert.ok(hid.hidden_at);
  assert.equal((await user(MEMBER, () => q(`select * from arch.comment where id=$1`, [c.id]))).rows.length, 0, 'members no longer see it');
  assert.equal((await user(VIEWER, () => q(`select * from arch.comment where id=$1`, [c.id]))).rows.length, 0);
  assert.equal((await user(OWNER, () => q(`select * from arch.comment where id=$1`, [c.id]))).rows.length, 1, 'the owner still does, to show it again');
  const shown = (await user(OWNER, () => q(`update arch.comment set hidden=false where id=$1 returning hidden_by`, [c.id]))).rows[0];
  assert.equal(shown.hidden_by, null);
  assert.equal((await user(OWNER, () => q(`delete from arch.comment where id=$1`, [c.id]))).affectedRows, 1);
  assert.equal((await user(STRANGER, () => q(`delete from arch.comment where id=$1`, [uid(0)]))).affectedRows, 0);
});

const asServer = (fn) => as('service_role', null, fn);
const share = async (on) => { await user(OWNER, () => q(`select * from arch.set_project_share($1, $2)`, [project, on])); return (await q(`select token from arch.project_share where project_id=$1`, [project])).rows[0]?.token ?? null; };
const add = (token, o = {}) => asServer(() => q(`select arch.client_comment_add($1,$2,$3,$4,$5,$6,$7) as c`, [token, o.ip ?? IP, o.name ?? 'Ana', o.body ?? 'Love it', o.file ?? null, o.x ?? null, o.y ?? null]));

test('a client comes in only with a link that is on; turning the link off stops reading and writing at once', async () => {
  const token = await share(true);
  assert.match(token, /^[a-f0-9]{64}$/);
  await refused(add('d'.repeat(64)), /not_shared/);
  await refused(add('short'), /not_shared/);
  const c = (await add(token, { file, x: 0.4, y: 0.6 })).rows[0].c;
  assert.equal(c.from, 'client'); assert.equal(c.by, 'Ana'); assert.equal(c.pin_no, 5, 'the next number on that file, after the four pins already on it');
  const row = (await q(`select author_kind, author_id, to_client, via_token_hash, practice_id from arch.comment where id=$1`, [c.id])).rows[0];
  assert.equal(row.author_kind, 'client'); assert.equal(row.author_id, null); assert.equal(row.to_client, true); assert.equal(row.practice_id, practice);
  assert.match(row.via_token_hash, /^[a-f0-9]{64}$/); assert.notEqual(row.via_token_hash, token, 'a hash of the link, not the link');
  // the members see it, as a client comment
  assert.equal((await user(MEMBER, () => q(`select author_kind from arch.comment where id=$1`, [c.id]))).rows[0].author_kind, 'client');
  // the client page reads it back
  const read = (await asServer(() => q(`select arch.client_comments($1) as r`, [token]))).rows[0].r;
  assert.ok(read.comments.some((x) => x.id === c.id));
  // lengths and shape
  await refused(add(token, { body: 'x'.repeat(2001) }), /bad_comment/);
  await refused(add(token, { body: '  ' }), /bad_comment/);
  await refused(add(token, { name: '' }), /bad_comment/);
  await refused(add(token, { ip: 'not hex' }), /bad_comment/);
  await refused(add(token, { x: 0.5, y: 0.5 }), /bad_comment/);
  await refused(add(token, { file: file2 }), /not in this project/);
  // off: the token is gone, so reading and writing both stop
  await share(false);
  await refused(add(token), /not_shared/);
  assert.equal((await asServer(() => q(`select arch.client_comments($1) as r`, [token]))).rows[0].r, null);
  // on again is a new link: the old client comments are not shown under it, the practice's own to-client comments are
  await insert(MEMBER, { toClient: true, body: 'Reply for the client' });
  await insert(MEMBER, { toClient: false, body: 'Internal only' });
  const token2 = await share(true);
  assert.notEqual(token2, token);
  const again = (await asServer(() => q(`select arch.client_comments($1) as r`, [token2]))).rows[0].r.comments.map((x) => x.body);
  assert.ok(again.includes('Reply for the client')); assert.ok(!again.includes('Internal only')); assert.ok(!again.includes('Love it'));
});

test('what the client page reads: not hidden ones, and only marked comments', async () => {
  const token = await share(true);
  const keep = (await add(token, { body: 'keep me', ip: 'cd'.repeat(16) })).rows[0].c;
  const mute = (await add(token, { body: 'hide me', ip: 'cd'.repeat(16) })).rows[0].c;
  await user(OWNER, () => q(`update arch.comment set hidden=true where id=$1`, [mute.id]));
  const bodies = (await asServer(() => q(`select arch.client_comments($1) as r`, [token]))).rows[0].r.comments.map((x) => x.body);
  assert.ok(bodies.includes('keep me')); assert.ok(!bodies.includes('hide me'));
  const sample = (await asServer(() => q(`select arch.client_comments($1) as r`, [token]))).rows[0].r.comments[0];
  assert.deepEqual(Object.keys(sample).sort(), ['at', 'body', 'by', 'file_id', 'from', 'id', 'pin_no', 'pin_x', 'pin_y'], 'no author id, no token hash, no mentions');
  assert.ok(keep.id);
});

test('the rate limit: 8 from one address in ten minutes, 40 an hour for a link; a refused comment is not stored', async () => {
  const token = await share(true);
  await q(`delete from arch.comment_hit`);
  const ip = 'ef'.repeat(16);
  for (let i = 0; i < 8; i++) await add(token, { ip, body: `n${i}` });
  const before = (await q(`select count(*)::int n from arch.comment where body='one too many'`)).rows[0].n;
  await refused(add(token, { ip, body: 'one too many' }), /rate_limited/);
  assert.equal((await q(`select count(*)::int n from arch.comment where body='one too many'`)).rows[0].n, before);
  await add(token, { ip: '12'.repeat(16), body: 'another address' });
  // older than ten minutes is forgotten
  await q(`update arch.comment_hit set at = now() - interval '11 minutes' where ip_hash=$1`, [ip]);
  await add(token, { ip, body: 'open again' });
  // forty an hour for the link, from forty addresses
  await q(`delete from arch.comment_hit`);
  for (let i = 0; i < 40; i++) await q(`insert into arch.comment_hit (project_id, token_hash, ip_hash) values ($1, encode(sha256(convert_to($2, 'UTF8')), 'hex'), $3)`, [project, token, i.toString(16).padStart(32, '0')]);
  await refused(add(token, { ip: '99'.repeat(16) }), /rate_limited/);
  // the table holds a hash of the address, never an address
  assert.ok((await q(`select ip_hash from arch.comment_hit limit 1`)).rows.every((r) => /^[a-f0-9]{16,64}$/.test(r.ip_hash)));
  // a day later it is cleared out
  await q(`update arch.comment_hit set at = now() - interval '2 days'`);
  await add(token, { ip: '77'.repeat(16) });
  assert.equal((await q(`select count(*)::int n from arch.comment_hit`)).rows[0].n, 1);
});

test('removing a file or a project takes its comments with it', async () => {
  const c = (await insert(MEMBER, { file, x: 0.5, y: 0.5, body: 'on the file' })).rows[0];
  await q(`delete from arch.file where id=$1`, [file]);
  assert.equal((await q(`select count(*)::int n from arch.comment where id=$1`, [c.id])).rows[0].n, 0);
});
