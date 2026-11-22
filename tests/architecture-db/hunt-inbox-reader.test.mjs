// Local dry run of the Gmail reader's database side: tokens, the ingest function, its limits. PGlite, not Supabase.
// Random and hash are Postgres built-ins (gen_random_uuid, sha256), so no extension is needed here or in Supabase.
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
const ALICE = uid(1), BOB = uid(2), CAROL = uid(3), EVE = uid(5);
let db, A, B;
const q = (sql, params) => db.query(sql, params);
async function as(role, id, fn) {
  await db.exec(`set role ${role}`);
  if (id) await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [id]);
  try { return await fn(); } finally { await db.exec('reset role'); await db.query(`select set_config('request.jwt.claim.sub', '', false)`); }
}
const user = (id, fn) => as('authenticated', id, fn);
const L = (id, code = 'EX') => `https://www.gets.govt.nz/${code}/ExternalTenderDetails.htm?id=${id}`;
const item = (id, o = {}) => ({ rfx_id: id, ref: 'R', organisation: 'Example Council', name: `Tender ${id}`, closes_at: '2026-12-07T04:00:00.000Z', url: L(id), kind: 'current', ...o });
const ingest = (tok, items, role = 'anon', who = null) => as(role, who, () => q(`select arch.hunt_inbox_ingest($1, $2::jsonb) n`, [tok, JSON.stringify(items)])).then((r) => r.rows[0].n);
const token = async (who, practice) => (await user(who, () => q(`select arch.hunt_inbox_new_token($1) t`, [practice]))).rows[0].t;

before(async () => {
  db = new PGlite();
  await db.exec(readFileSync(path.join(here, 'standins.sql'), 'utf8'));
  await q(`insert into auth.users (id, email) values ($1,'a@x'),($2,'b@x'),($3,'c@x'),($4,'e@x')`, [ALICE, BOB, CAROL, EVE]);
  for (const f of migrations) await db.exec(readFileSync(path.join(migDir, f), 'utf8'));
  A = (await user(ALICE, () => q(`insert into arch.practice (name, created_by) values ('A', $1) returning id`, [ALICE]))).rows[0].id;
  B = (await user(EVE, () => q(`insert into arch.practice (name, created_by) values ('B', $1) returning id`, [EVE]))).rows[0].id;
  await user(ALICE, () => q(`insert into arch.practice_member (practice_id,user_id,role) values ($1,$2,'member'),($1,$3,'viewer')`, [A, BOB, CAROL]));
});
after(async () => { await db.close(); });

test('the migration applies a second time without error or change', async () => {
  const sql = readFileSync(path.join(migDir, '20261122142000_arch_hunt_inbox_reader.sql'), 'utf8');
  await db.exec(sql); await db.exec(sql);
});

test('only an owner makes a token; it is 64 hex characters, shown once, and only its sha256 is kept', async () => {
  for (const who of [BOB, CAROL, EVE]) await assert.rejects(token(who, A), /Only an owner/);
  await assert.rejects(as('anon', null, () => q(`select arch.hunt_inbox_new_token($1)`, [A])), /permission denied/);
  const t = await token(ALICE, A); assert.match(t, /^[0-9a-f]{64}$/);
  const stored = (await q(`select encode(token_hash,'hex') h, label from arch.hunt_inbox_route where practice_id=$1 and revoked_at is null`, [A])).rows;
  assert.equal(stored.length, 1); assert.notEqual(stored[0].h, t); assert.equal(stored[0].h, (await q(`select encode(sha256(convert_to($1,'UTF8')),'hex') h`, [t])).rows[0].h);
  assert.ok(!JSON.stringify((await q(`select * from arch.hunt_inbox_route`)).rows.map((r) => ({ ...r, token_hash: undefined }))).includes(t), 'the token is nowhere in the table');
});

test('a new token ends the old one; two tokens are never both live; the old one is refused', async () => {
  const t1 = await token(ALICE, A), t2 = await token(ALICE, A);
  assert.notEqual(t1, t2);
  assert.equal(await ingest(t2, [item('10000001')]), 1);
  await assert.rejects(ingest(t1, [item('10000002')]), /not on/);
  assert.equal((await q(`select count(*)::int n from arch.hunt_inbox_route where practice_id=$1 and revoked_at is null`, [A])).rows[0].n, 1);
});

test('owners see their route rows but never the hash; members and viewers see none; anon sees none', async () => {
  const cols = 'id, practice_id, label, last_used_at, last_count, revoked_at';
  assert.ok((await user(ALICE, () => q(`select ${cols} from arch.hunt_inbox_route`))).rows.length >= 1);
  await assert.rejects(user(ALICE, () => q(`select token_hash from arch.hunt_inbox_route`)), /permission denied/);
  await assert.rejects(user(ALICE, () => q(`select * from arch.hunt_inbox_route`)), /permission denied/, 'select * names the hash');
  for (const who of [BOB, CAROL, EVE]) assert.equal((await user(who, () => q(`select ${cols} from arch.hunt_inbox_route where practice_id=$1`, [A]))).rows.length, 0);
  await assert.rejects(as('anon', null, () => q(`select id from arch.hunt_inbox_route`)), /permission denied/);
  await assert.rejects(user(ALICE, () => q(`update arch.hunt_inbox_route set revoked_at = null`)), /permission denied/, 'no one revives a token by hand');
});

test('ingest files valid items into the practice\'s inbox, once per RFx ID, and returns the count', async () => {
  const t = await token(ALICE, A);
  assert.equal(await ingest(t, [item('20000001'), item('20000002', { kind: 'future' }), item('20000001', { name: 'Renamed', closes_at: '2026-12-21T04:00:00.000Z' })]), 3);
  const rows = (await q(`select rfx_id, name, kind, added_by, closes_at, extra from arch.hunt_inbox where practice_id=$1 and rfx_id like '2000000%' order by rfx_id`, [A])).rows;
  assert.equal(rows.length, 2); assert.equal(rows[0].name, 'Renamed'); assert.equal(rows[0].added_by, ALICE, 'filed as the person who made the reader'); assert.equal(new Date(rows[0].closes_at).toISOString(), '2026-12-21T04:00:00.000Z');
  assert.equal(rows[1].kind, 'future'); assert.deepEqual(rows[0].extra, { via: 'gmail reader' });
  assert.equal(await ingest(t, [item('20000002', { kind: 'current' })]), 1);
  assert.equal((await q(`select kind from arch.hunt_inbox where practice_id=$1 and rfx_id='20000002'`, [A])).rows[0].kind, 'current', 'an advance notice that opens becomes current');
  assert.equal(await ingest(t, [item('20000002', { kind: 'future' })]), 1);
  assert.equal((await q(`select kind from arch.hunt_inbox where practice_id=$1 and rfx_id='20000002'`, [A])).rows[0].kind, 'current', 'and never goes back');
  assert.equal((await q(`select count(*)::int n from arch.hunt_inbox where practice_id=$1`, [B])).rows[0].n, 0, 'nothing in another practice');
  const s = (await user(ALICE, () => q(`select * from arch.hunt_inbox_reader_status($1)`, [A]))).rows[0]; assert.equal(s.reader_on, true); assert.equal(s.last_count, 1); assert.ok(s.last_used_at);
});

test('each item is checked: bad RFx IDs, links not on www.gets.govt.nz, links that disagree with the ID, empty names and unknown kinds are skipped, not filed', async () => {
  const t = await token(ALICE, A);
  const bad = [item('abc'), item('123'), item('30000001', { url: 'https://evil.example/EX/ExternalTenderDetails.htm?id=30000001' }), item('30000002', { url: 'http://www.gets.govt.nz/EX/ExternalTenderDetails.htm?id=30000002' }),
    item('30000003', { url: 'https://www.gets.govt.nz.evil.example/EX/ExternalTenderDetails.htm?id=30000003' }), item('30000004', { url: L('39999999') }), item('30000005', { name: '   ' }), item('30000006', { kind: 'update' }), item('30000007', { kind: null }),
    item('30000008', { url: 'https://www.gets.govt.nz/EX/ExternalTenderDetails.htm?id=30000008&x=1' }), 5, null, 'x', [], { rfx_id: '30000009' }];
  assert.equal(await ingest(t, [...bad, item('30000010')]), 1);
  assert.deepEqual((await q(`select rfx_id from arch.hunt_inbox where rfx_id like '3000%' order by 1`)).rows.map((r) => r.rfx_id), ['30000010']);
});

test('strings are cut to their limits and an unreadable time becomes empty rather than failing the call', async () => {
  const t = await token(ALICE, A);
  assert.equal(await ingest(t, [item('40000001', { name: 'n'.repeat(500), organisation: 'o'.repeat(500), ref: 'r'.repeat(500), closes_at: 'next tuesday' })]), 1);
  const r = (await q(`select length(name) n, length(organisation) o, length(ref) r, closes_at from arch.hunt_inbox where rfx_id='40000001'`)).rows[0];
  assert.deepEqual([r.n, r.o, r.r, r.closes_at], [300, 200, 80, null]);
});

test('300 items a call and 48 calls a day; the 49th is refused; the count starts again on a new day', async () => {
  const t = await token(ALICE, A);
  await assert.rejects(ingest(t, Array.from({ length: 301 }, (_, i) => item(String(50000000 + i)))), /At most 300/);
  assert.equal(await ingest(t, Array.from({ length: 300 }, (_, i) => item(String(50000000 + i)))), 300);
  for (let i = 0; i < 47; i++) await ingest(t, []);
  await assert.rejects(ingest(t, [item('60000001')]), /48 times today/);
  await q(`update arch.hunt_inbox_route set calls_day = current_date - 1 where revoked_at is null and practice_id = $1`, [A]);
  assert.equal(await ingest(t, [item('60000001')]), 1);
});

test('a bad token, a short token, a made-up token, no token and a non-list are refused with the same plain sentence', async () => {
  for (const tok of ['', 'abc', 'f'.repeat(64), null, "' or 1=1 --", 'A'.repeat(64)]) await assert.rejects(ingest(tok, [item('70000001')]), /This reader is not on/);
  const t = await token(ALICE, A);
  await assert.rejects(ingest(t, { rfx_id: '70000001' }), /list of notices/);
  assert.equal((await q(`select count(*)::int n from arch.hunt_inbox where rfx_id like '7000%'`)).rows[0].n, 0);
});

test('stop: only an owner; after it the reader is refused and the status says off; members and viewers can read the status', async () => {
  const t = await token(ALICE, A);
  for (const who of [BOB, CAROL, EVE]) await assert.rejects(user(who, () => q(`select arch.hunt_inbox_stop_reader($1)`, [A])), /Only an owner/);
  for (const who of [BOB, CAROL]) assert.equal((await user(who, () => q(`select * from arch.hunt_inbox_reader_status($1)`, [A]))).rows[0].reader_on, true);
  await assert.rejects(user(EVE, () => q(`select * from arch.hunt_inbox_reader_status($1)`, [A])), /Only members/);
  await user(ALICE, () => q(`select arch.hunt_inbox_stop_reader($1)`, [A]));
  await assert.rejects(ingest(t, [item('80000001')]), /not on/);
  const s = (await user(CAROL, () => q(`select * from arch.hunt_inbox_reader_status($1)`, [A]))).rows[0]; assert.equal(s.reader_on, false); assert.equal(s.last_used_at, null);
});

test('the functions are security definers with an empty search path; ingest is open to anon and authenticated, the rest to authenticated only', async () => {
  const rows = (await q(`select proname, prosecdef, proconfig, has_function_privilege('anon', oid, 'execute') anon, has_function_privilege('authenticated', oid, 'execute') auth, has_function_privilege('public', oid, 'execute') pub from pg_proc where proname like 'hunt_inbox_%'`)).rows;
  assert.equal(rows.length, 4);
  for (const r of rows) { assert.equal(r.prosecdef, true); assert.deepEqual(r.proconfig, ['search_path=""']); assert.equal(r.pub, false); assert.equal(r.auth, true); assert.equal(r.anon, r.proname === 'hunt_inbox_ingest', r.proname); }
  assert.equal((await q(`select has_table_privilege('anon','arch.hunt_inbox','select') s, has_table_privilege('anon','arch.hunt_inbox_route','select') r`)).rows[0].s, false);
});
