// Local dry run of arch.hunt_inbox (alert emails a person added): who reads, who writes, what the table refuses. PGlite, not Supabase.
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
const ALICE = uid(1), BOB = uid(2), CAROL = uid(3), EVE = uid(5); // owner, member, viewer of A; nobody's
let db, A, B;
const q = (sql, params) => db.query(sql, params);
async function as(role, id, fn) {
  await db.exec(`set role ${role}`);
  if (id) await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [id]);
  try { return await fn(); } finally { await db.exec('reset role'); await db.query(`select set_config('request.jwt.claim.sub', '', false)`); }
}
const user = (id, fn) => as('authenticated', id, fn);
const URL_ = (id) => `https://www.gets.govt.nz/EX/ExternalTenderDetails.htm?id=${id}`;
const add = (who, practice, id = '10000001', o = {}) => user(who, () => q(`insert into arch.hunt_inbox (practice_id, rfx_id, ref, organisation, name, closes_at, url, kind) values ($1,$2,$3,$4,$5,$6,$7,$8) returning *`,
  [practice, id, o.ref ?? 'R1', o.org ?? 'Example Council', o.name ?? 'Library design services', o.closes ?? '2026-12-07T04:00:00Z', o.url ?? URL_(id), o.kind ?? 'current']));

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
  const sql = readFileSync(path.join(migDir, '20261122141000_arch_hunt_inbox.sql'), 'utf8');
  await db.exec(sql); await db.exec(sql);
  assert.equal((await q(`select count(*)::int n from pg_policies where schemaname='arch' and tablename='hunt_inbox'`)).rows[0].n, 3);
});

test('an owner and a member add; added_by is the signed-in person; a viewer and an outsider are refused', async () => {
  const r = (await add(ALICE, A, '10000001')).rows[0]; assert.equal(r.added_by, ALICE); assert.equal(r.kind, 'current');
  await add(BOB, A, '10000002', { kind: 'future' });
  await assert.rejects(add(CAROL, A, '10000003'), /row-level security/); await assert.rejects(add(EVE, A, '10000003'), /row-level security/);
  await assert.rejects(user(ALICE, () => q(`insert into arch.hunt_inbox (practice_id, rfx_id, name, url, added_by) values ($1,'10000004','x',$2,$3)`, [A, URL_('10000004'), BOB])), /row-level security/, 'added_by cannot be someone else');
});

test('every member reads their practice\'s rows; an outsider reads none; another practice\'s rows stay apart', async () => {
  await add(EVE, B, '10000001', { name: 'Same RFx ID in another practice' });
  for (const who of [ALICE, BOB, CAROL]) assert.deepEqual((await user(who, () => q(`select rfx_id from arch.hunt_inbox order by rfx_id`))).rows.map((x) => x.rfx_id), ['10000001', '10000002']);
  assert.deepEqual((await user(EVE, () => q(`select name from arch.hunt_inbox`))).rows.map((x) => x.name), ['Same RFx ID in another practice']);
});

test('one row per RFx ID per practice; writers change a row, viewers cannot; nothing is deleted', async () => {
  await assert.rejects(add(ALICE, A, '10000001'), /duplicate key|unique/);
  assert.equal((await user(BOB, () => q(`update arch.hunt_inbox set closes_at = '2026-12-21T04:00:00Z' where practice_id=$1 and rfx_id='10000001' returning 1`, [A]))).rows.length, 1);
  assert.equal((await user(CAROL, () => q(`update arch.hunt_inbox set name = 'x' where practice_id=$1 returning 1`, [A]))).rows.length, 0, 'a viewer changes nothing');
  await assert.rejects(user(ALICE, () => q(`delete from arch.hunt_inbox where practice_id=$1`, [A])), /permission denied/);
});

test('the table refuses a link that is not a gets.govt.nz tender page, a bad RFx ID, an empty name, an unknown kind and a long name', async () => {
  for (const [id, o] of [['10000010', { url: 'https://evil.example/ExternalTenderDetails.htm?id=10000010' }], ['10000011', { url: 'http://www.gets.govt.nz/EX/x' }], ['10000012', { url: 'https://www.gets.govt.nz.evil.example/EX/x' }], ['abc', {}], ['10000013', { name: '  ' }], ['10000014', { kind: 'update' }], ['10000015', { name: 'n'.repeat(301) }]]) await assert.rejects(add(ALICE, A, id, o), /check constraint/, JSON.stringify([id, o]).slice(0, 60));
});

test('anon has no access at all; authenticated has select, insert and update only', async () => {
  await assert.rejects(as('anon', null, () => q(`select * from arch.hunt_inbox`)), /permission denied/);
  const g = (await q(`select has_table_privilege('authenticated','arch.hunt_inbox','delete') d, has_table_privilege('authenticated','arch.hunt_inbox','update') u, has_table_privilege('anon','arch.hunt_inbox','select') a, has_table_privilege('anon','arch.hunt_inbox','insert') ai`)).rows[0];
  assert.deepEqual(g, { d: false, u: true, a: false, ai: false });
});
