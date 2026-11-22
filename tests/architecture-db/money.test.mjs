// Local dry run of the Money migration (time entries, invoices, allocations, the project rate guard) on PGlite with
// stand-ins for Supabase's auth schema and its roles. Not Supabase, and no network. Nothing here touches the real database.
// All names and figures are invented.
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
const OWNER = uid(1), OTHER = uid(2), VIEWER = uid(3), MEMBER = uid(4); // owner of A, owner of B, viewer in A, member in A
let db, practiceA, practiceB, projectA, projectB, enquiryA, enquiryB, invoiceA;

async function applyAll() { for (const f of migrations) await db.exec(readFileSync(path.join(migDir, f), 'utf8')); }
async function reset() { await db.exec('reset role'); await db.query(`select set_config('request.jwt.claim.sub', '', false)`); }
async function as(role, id, fn) {
  await db.exec(`set role ${role}`);
  if (id) await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [id]);
  try { return await fn(); } finally { await reset(); }
}
const user = (id, fn) => as('authenticated', id, fn);
const q = (sql, params) => db.query(sql, params);
const refused = (p, re) => assert.rejects(p, re);
async function snapshot() {
  const r = await q(`select
    (select count(*) from pg_policies where schemaname='arch')::int as policies,
    (select count(*) from pg_trigger g join pg_class c on c.oid=g.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='arch' and not g.tgisinternal)::int as triggers,
    (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='arch')::int as functions,
    (select count(*) from pg_indexes where schemaname='arch')::int as indexes`);
  return r.rows[0];
}

before(async () => {
  db = new PGlite();
  await db.exec(readFileSync(path.join(here, 'standins.sql'), 'utf8'));
  await q(`insert into auth.users (id, email) values ($1,'owner@x'),($2,'other@x'),($3,'viewer@x'),($4,'member@x')`, [OWNER, OTHER, VIEWER, MEMBER]);
  await applyAll();
  practiceA = (await user(OWNER, () => q(`insert into arch.practice (name, created_by) values ('Practice A', $1) returning id`, [OWNER]))).rows[0].id;
  practiceB = (await user(OTHER, () => q(`insert into arch.practice (name, created_by) values ('Practice B', $1) returning id`, [OTHER]))).rows[0].id;
  await user(OWNER, () => q(`insert into arch.practice_member (practice_id,user_id,role) values ($1,$2,'viewer'),($1,$3,'member')`, [practiceA, VIEWER, MEMBER]));
  projectA = (await user(MEMBER, () => q(`insert into arch.project (practice_id,name) values ($1,'Ridge house') returning id`, [practiceA]))).rows[0].id;
  projectB = (await user(OTHER, () => q(`insert into arch.project (practice_id,name) values ($1,'Other house') returning id`, [practiceB]))).rows[0].id;
  enquiryA = (await user(MEMBER, () => q(`insert into arch.enquiry (practice_id, title, value_nzd) values ($1,'Bay studio', 40000) returning id`, [practiceA]))).rows[0].id;
  enquiryB = (await user(OTHER, () => q(`insert into arch.enquiry (practice_id, title) values ($1,'Other studio') returning id`, [practiceB]))).rows[0].id;
});
after(async () => { await db.close(); });

test('the migrations apply a second time without error or change, and with data in', async () => {
  await user(MEMBER, () => q(`insert into arch.time_entry (practice_id, project_id, person, on_date, hours, stage) values ($1,$2,'A. Person','2026-11-20',6.5,'predesign')`, [practiceA, projectA]));
  const first = await snapshot();
  await applyAll();
  assert.deepEqual(await snapshot(), first);
  assert.equal((await q(`select count(*)::int n from arch.time_entry`)).rows[0].n, 1, 'data is untouched');
});

test('every new table has the standard columns, row level security, and an index on practice_id and each foreign key', async () => {
  for (const t of ['time_entry', 'invoice', 'allocation']) {
    const cols = (await q(`select column_name, data_type, is_nullable from information_schema.columns where table_schema='arch' and table_name=$1`, [t])).rows;
    const by = Object.fromEntries(cols.map((c) => [c.column_name, c]));
    for (const c of ['id', 'practice_id', 'created_by', 'created_at', 'seq', 'extra']) assert.ok(by[c], `${t}.${c}`);
    assert.equal(by.practice_id.is_nullable, 'NO', t);
    assert.equal((await q(`select relrowsecurity from pg_class where oid = $1::regclass`, [`arch.${t}`])).rows[0].relrowsecurity, true, t);
  }
  const fks = (await q(`select c.conrelid::regclass::text as tbl, a.attname as col from pg_constraint c join pg_attribute a on a.attrelid=c.conrelid and a.attnum = any(c.conkey)
                        where c.contype='f' and c.conrelid in ('arch.time_entry'::regclass,'arch.invoice'::regclass,'arch.allocation'::regclass)`)).rows;
  assert.equal(fks.length, 7);
  const idx = (await q(`select tablename, indexdef from pg_indexes where schemaname='arch' and tablename in ('time_entry','invoice','allocation')`)).rows;
  for (const f of fks) assert.ok(idx.some((i) => `arch.${i.tablename}` === f.tbl && new RegExp(`\\(${f.col}[,)]`).test(i.indexdef)), `an index starts with ${f.tbl}.${f.col}`);
});

test('a member logs time, raises an invoice and plans people; every member of the practice reads them', async () => {
  invoiceA = (await user(MEMBER, () => q(`insert into arch.invoice (practice_id, project_id, number, amount_nzd, issued_on, due_on) values ($1,$2,'1001', 9000, '2026-11-01', '2026-11-20') returning id`, [practiceA, projectA]))).rows[0].id;
  await user(MEMBER, () => q(`insert into arch.allocation (practice_id, person, project_id, hours_week, from_on, to_on) values ($1,'A. Person',$2,20,'2026-11-23','2027-01-29')`, [practiceA, projectA]));
  await user(MEMBER, () => q(`insert into arch.allocation (practice_id, person, enquiry_id, hours_week, from_on, to_on) values ($1,'B. Person',$2,8,'2027-02-01','2027-03-26')`, [practiceA, enquiryA]));
  for (const who of [OWNER, MEMBER, VIEWER]) {
    assert.equal((await user(who, () => q(`select * from arch.invoice`))).rows.length, 1, who);
    assert.equal((await user(who, () => q(`select * from arch.allocation`))).rows.length, 2, who);
    assert.equal((await user(who, () => q(`select * from arch.time_entry`))).rows.length, 1, who);
  }
  // corrections: a member changes a time entry and an allocation, and removes one
  assert.equal((await user(MEMBER, () => q(`update arch.time_entry set hours = 7 where practice_id = $1`, [practiceA]))).affectedRows, 1);
  const tmp = (await user(MEMBER, () => q(`insert into arch.time_entry (practice_id, project_id, person, on_date, hours) values ($1,$2,'A. Person','2026-11-21',1) returning id`, [practiceA, projectA]))).rows[0].id;
  assert.equal((await user(MEMBER, () => q(`delete from arch.time_entry where id = $1`, [tmp]))).affectedRows, 1);
  // and marks the invoice paid
  assert.equal((await user(MEMBER, () => q(`update arch.invoice set paid_on = '2026-11-25' where id = $1`, [invoiceA]))).affectedRows, 1);
});

test('a viewer reads and cannot write anything', async () => {
  await refused(user(VIEWER, () => q(`insert into arch.time_entry (practice_id, project_id, person, on_date, hours) values ($1,$2,'x','2026-11-20',1)`, [practiceA, projectA])), /row-level security/);
  await refused(user(VIEWER, () => q(`insert into arch.invoice (practice_id, project_id, number, amount_nzd) values ($1,$2,'x',1)`, [practiceA, projectA])), /row-level security/);
  await refused(user(VIEWER, () => q(`insert into arch.allocation (practice_id, person, project_id, hours_week, from_on, to_on) values ($1,'x',$2,1,'2026-11-20','2026-11-21')`, [practiceA, projectA])), /row-level security/);
  assert.equal((await user(VIEWER, () => q(`update arch.time_entry set hours = 1 where practice_id = $1`, [practiceA]))).affectedRows, 0);
  assert.equal((await user(VIEWER, () => q(`update arch.invoice set amount_nzd = 1 where id = $1`, [invoiceA]))).affectedRows, 0);
  assert.equal((await user(VIEWER, () => q(`delete from arch.allocation where practice_id = $1`, [practiceA]))).affectedRows, 0);
  assert.equal((await q(`select amount_nzd::int n from arch.invoice where id = $1`, [invoiceA])).rows[0].n, 9000);
});

test('someone outside the practice sees nothing and changes nothing', async () => {
  for (const t of ['time_entry', 'invoice', 'allocation']) assert.equal((await user(OTHER, () => q(`select * from arch.${t} where practice_id = $1`, [practiceA]))).rows.length, 0, t);
  assert.equal((await user(OTHER, () => q(`update arch.invoice set amount_nzd = 1 where id = $1`, [invoiceA]))).affectedRows, 0);
  assert.equal((await user(OTHER, () => q(`delete from arch.time_entry where practice_id = $1`, [practiceA]))).affectedRows, 0);
  await refused(user(OTHER, () => q(`insert into arch.invoice (practice_id, project_id, number, amount_nzd) values ($1,$2,'sneaky',1)`, [practiceA, projectA])), /row-level security/);
  await refused(user(OTHER, () => q(`insert into arch.time_entry (practice_id, project_id, person, on_date, hours) values ($1,$2,'x','2026-11-20',1)`, [practiceA, projectA])), /row-level security/);
});

test('a row cannot point at another practice’s project or enquiry, or be moved to another practice', async () => {
  await refused(user(MEMBER, () => q(`insert into arch.time_entry (practice_id, project_id, person, on_date, hours) values ($1,$2,'x','2026-11-20',1)`, [practiceA, projectB])), /row-level security/);
  await refused(user(MEMBER, () => q(`insert into arch.invoice (practice_id, project_id, number, amount_nzd) values ($1,$2,'x9',1)`, [practiceA, projectB])), /row-level security/);
  await refused(user(MEMBER, () => q(`insert into arch.allocation (practice_id, person, project_id, hours_week, from_on, to_on) values ($1,'x',$2,1,'2026-11-20','2026-11-21')`, [practiceA, projectB])), /row-level security/);
  await refused(user(MEMBER, () => q(`insert into arch.allocation (practice_id, person, enquiry_id, hours_week, from_on, to_on) values ($1,'x',$2,1,'2026-11-20','2026-11-21')`, [practiceA, enquiryB])), /row-level security/);
  await refused(user(MEMBER, () => q(`update arch.invoice set project_id = $2 where id = $1`, [invoiceA, projectB])), /row-level security/);
  // an owner of both could still not move a row across: the practice it was made in is kept
  await q(`insert into arch.practice_member (practice_id, user_id, role) values ($1, $2, 'owner')`, [practiceB, OWNER]);
  try { await refused(user(OWNER, () => q(`update arch.time_entry set practice_id = $1, project_id = $2 where practice_id = $3`, [practiceB, projectB, practiceA])), /keeps the practice/); }
  finally { await q(`delete from arch.practice_member where practice_id = $1 and user_id = $2`, [practiceB, OWNER]); }
});

test('invoices are never deleted: not by a member, an owner, or a policy added later; a void one is final', async () => {
  for (const who of [MEMBER, OWNER]) await refused(user(who, () => q(`delete from arch.invoice where id = $1`, [invoiceA])), /permission denied/);
  await q(`grant delete on arch.invoice to authenticated`);
  await q(`create policy tmp_del on arch.invoice for delete to authenticated using (true)`);
  try { await refused(user(OWNER, () => q(`delete from arch.invoice where id = $1`, [invoiceA])), /append-only/); }
  finally { await q(`drop policy tmp_del on arch.invoice`); await q(`revoke delete on arch.invoice from authenticated`); }
  // a void needs a reason, and then it cannot be changed or un-voided
  await refused(user(MEMBER, () => q(`update arch.invoice set void = true where id = $1`, [invoiceA])), /check constraint/);
  assert.equal((await user(MEMBER, () => q(`update arch.invoice set void = true, void_reason = 'Raised twice' where id = $1`, [invoiceA]))).affectedRows, 1);
  await refused(user(MEMBER, () => q(`update arch.invoice set void = false where id = $1`, [invoiceA])), /void invoice cannot be changed/);
  await refused(user(OWNER, () => q(`update arch.invoice set amount_nzd = 1 where id = $1`, [invoiceA])), /void invoice cannot be changed/);
  const g = (await q(`select privilege_type from information_schema.role_table_grants where table_schema='arch' and grantee='authenticated' and table_name='invoice'`)).rows.map((r) => r.privilege_type).sort();
  assert.deepEqual(g, ['INSERT', 'SELECT', 'UPDATE']);
});

test('the database keeps to the figures and words the page uses', async () => {
  const bad = [
    [`insert into arch.time_entry (practice_id, project_id, person, on_date, hours) values ($1,$2,'x','2026-11-20',0)`, /check constraint/],
    [`insert into arch.time_entry (practice_id, project_id, person, on_date, hours) values ($1,$2,'x','2026-11-20',25)`, /check constraint/],
    [`insert into arch.time_entry (practice_id, project_id, person, on_date, hours, stage) values ($1,$2,'x','2026-11-20',1,'contract')`, /check constraint/],
    [`insert into arch.time_entry (practice_id, project_id, person, on_date, hours) values ($1,$2,'  ','2026-11-20',1)`, /check constraint/],
    [`insert into arch.invoice (practice_id, project_id, number, amount_nzd) values ($1,$2,'n1',-1)`, /check constraint/],
    [`insert into arch.invoice (practice_id, project_id, number, amount_nzd, issued_on, due_on) values ($1,$2,'n2',1,'2026-11-20','2026-11-01')`, /check constraint/],
    [`insert into arch.invoice (practice_id, project_id, number, amount_nzd, paid_on) values ($1,$2,'n3',1,'2026-11-20')`, /check constraint/],
    [`insert into arch.invoice (practice_id, project_id, number, amount_nzd) values ($1,$2,'1001',1)`, /duplicate key|unique/],
    [`insert into arch.allocation (practice_id, person, hours_week, from_on, to_on) values ($1,'x',1,'2026-11-20','2026-11-21')`, /check constraint/],
    [`insert into arch.allocation (practice_id, person, project_id, hours_week, from_on, to_on) values ($1,'x',$2,81,'2026-11-20','2026-11-21')`, /check constraint/],
    [`insert into arch.allocation (practice_id, person, project_id, hours_week, from_on, to_on) values ($1,'x',$2,1,'2026-11-21','2026-11-20')`, /check constraint/],
  ];
  for (const [sql, re] of bad) await refused(user(MEMBER, () => q(sql, sql.includes('$2') ? [practiceA, projectA] : [practiceA])), re);
  // both targets at once is refused too
  await refused(user(MEMBER, () => q(`insert into arch.allocation (practice_id, person, project_id, enquiry_id, hours_week, from_on, to_on) values ($1,'x',$2,$3,1,'2026-11-20','2026-11-21')`, [practiceA, projectA, enquiryA])), /check constraint/);
  for (const stage of ['predesign', 'concept', 'developed', 'detailed', 'contract_admin', 'observation', 'completion']) {
    await user(MEMBER, () => q(`insert into arch.time_entry (practice_id, project_id, person, on_date, hours, stage) values ($1,$2,'x','2026-11-20',1,$3)`, [practiceA, projectA, stage]));
  }
  // a record is only made under the signed-in person's own id
  await refused(user(MEMBER, () => q(`insert into arch.time_entry (practice_id, project_id, person, on_date, hours, created_by) values ($1,$2,'x','2026-11-20',1,$3)`, [practiceA, projectA, OWNER])), /row-level security/);
});

test('only an owner sets or changes a project’s own hourly rate; a member changes the rest of its money', async () => {
  const money = (o) => JSON.stringify({ money: o });
  assert.equal((await user(MEMBER, () => q(`update arch.project set extra = $2::jsonb where id = $1`, [projectA, money({ fee: 60000, hours: 400 })]))).affectedRows, 1, 'fee and hours: a member may');
  await refused(user(MEMBER, () => q(`update arch.project set extra = $2::jsonb where id = $1`, [projectA, money({ fee: 60000, hours: 400, rate: 150 })])), /hourly rate/);
  assert.equal((await user(OWNER, () => q(`update arch.project set extra = $2::jsonb where id = $1`, [projectA, money({ fee: 60000, hours: 400, rate: 150 })]))).affectedRows, 1);
  // once set, a member saving the project unchanged is fine; changing or clearing the rate is not
  assert.equal((await user(MEMBER, () => q(`update arch.project set name = 'Ridge house 2' where id = $1`, [projectA]))).affectedRows, 1);
  assert.equal((await user(MEMBER, () => q(`update arch.project set extra = $2::jsonb where id = $1`, [projectA, money({ fee: 65000, hours: 400, rate: 150 })]))).affectedRows, 1);
  await refused(user(MEMBER, () => q(`update arch.project set extra = $2::jsonb where id = $1`, [projectA, money({ fee: 65000, hours: 400 })])), /hourly rate/);
  await refused(user(MEMBER, () => q(`insert into arch.project (practice_id, name, extra) values ($1, 'New', $2::jsonb)`, [practiceA, money({ rate: 99 })])), /hourly rate/);
  assert.equal((await q(`select (extra #>> '{money,rate}')::int r from arch.project where id = $1`, [projectA])).rows[0].r, 150);
  // the practice's own money settings: only an owner changes the practice row (the earlier rules)
  assert.equal((await user(MEMBER, () => q(`update arch.practice set extra = '{"money":{"break_even":1}}'::jsonb where id = $1`, [practiceA]))).affectedRows, 0);
  assert.equal((await user(OWNER, () => q(`update arch.practice set extra = '{"money":{"break_even":1}}'::jsonb where id = $1`, [practiceA]))).affectedRows, 1);
});

test('anon has nothing: no tables, no rows', async () => {
  for (const t of ['time_entry', 'invoice', 'allocation']) {
    await refused(as('anon', null, () => q(`select * from arch.${t}`)), /permission denied/);
    await refused(as('anon', null, () => q(`insert into arch.${t} (practice_id) values ($1)`, [practiceA])), /permission denied/);
  }
  const g = (await q(`select grantee, table_name from information_schema.role_table_grants where table_schema='arch' and table_name in ('time_entry','invoice','allocation') and grantee in ('anon','public','PUBLIC')`)).rows;
  assert.deepEqual(g, []);
  assert.equal((await q(`select count(*)::int n from pg_default_acl d join pg_namespace n on n.oid = d.defaclnamespace where n.nspname = 'arch'`)).rows[0].n, 0);
});

test('the new functions fix their search_path and are not open to anon', async () => {
  const r = (await q(`select p.proname, p.proconfig, has_function_privilege('anon', p.oid, 'execute') anon from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='arch' and p.proname in ('money_row_keeps_practice','invoice_void_is_final','project_rate_owner_only')`)).rows;
  assert.equal(r.length, 3);
  for (const row of r) { assert.ok((row.proconfig ?? []).some((c) => c.startsWith('search_path=')), row.proname); assert.equal(row.anon, false, row.proname); }
});
