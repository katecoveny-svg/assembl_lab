// Local dry run of the Clients migration (contacts, enquiries, history) on PGlite with stand-ins for Supabase's auth
// schema and its roles. Not Supabase, and no network. Nothing here touches the real database.
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
const ALICE = uid(1), BOB = uid(2), CAROL = uid(3), DAN = uid(4); // A owner, B owner, viewer in A, member in A
let db, practiceA, practiceB, projectA, projectB, contactA, contactB, enquiryA, enquiryB;

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
  await q(`insert into auth.users (id, email) values ($1,'alice@x'),($2,'bob@x'),($3,'carol@x'),($4,'dan@x')`, [ALICE, BOB, CAROL, DAN]);
  await applyAll();
  practiceA = (await user(ALICE, () => q(`insert into arch.practice (name, created_by) values ('Practice A', $1) returning id`, [ALICE]))).rows[0].id;
  practiceB = (await user(BOB, () => q(`insert into arch.practice (name, created_by) values ('Practice B', $1) returning id`, [BOB]))).rows[0].id;
  await user(ALICE, () => q(`insert into arch.practice_member (practice_id,user_id,role) values ($1,$2,'viewer'),($1,$3,'member')`, [practiceA, CAROL, DAN]));
  projectA = (await user(DAN, () => q(`insert into arch.project (practice_id,name) values ($1,'Hill house') returning id`, [practiceA]))).rows[0].id;
  projectB = (await user(BOB, () => q(`insert into arch.project (practice_id,name) values ($1,'B house') returning id`, [practiceB]))).rows[0].id;
  contactA = (await user(DAN, () => q(`insert into arch.contact (practice_id, name, organisation) values ($1,'A. Client','Hill Trust') returning id`, [practiceA]))).rows[0].id;
  contactB = (await user(BOB, () => q(`insert into arch.contact (practice_id, name) values ($1,'B. Client') returning id`, [practiceB]))).rows[0].id;
  enquiryA = (await user(DAN, () => q(`insert into arch.enquiry (practice_id, title, contact_id, value_nzd, next_action_due) values ($1,'Hill house',$2, 85000, '2026-12-01') returning id`, [practiceA, contactA]))).rows[0].id;
  enquiryB = (await user(BOB, () => q(`insert into arch.enquiry (practice_id, title, contact_id) values ($1,'B house',$2) returning id`, [practiceB, contactB]))).rows[0].id;
});
after(async () => { await db.close(); });

test('the migration applies a second time without error or change, and with data in', async () => {
  const first = await snapshot();
  await applyAll();
  assert.deepEqual(await snapshot(), first);
  assert.equal((await q(`select count(*)::int n from arch.contact`)).rows[0].n, 2, 'data is untouched');
});

test('every table has the standard columns, row level security, and an index on practice_id and each foreign key', async () => {
  for (const t of ['contact', 'enquiry', 'crm_activity']) {
    const cols = (await q(`select column_name, data_type, is_nullable from information_schema.columns where table_schema='arch' and table_name=$1`, [t])).rows;
    const by = Object.fromEntries(cols.map((c) => [c.column_name, c]));
    for (const c of ['id', 'practice_id', 'created_by', 'created_at', 'seq', 'extra']) assert.ok(by[c], `${t}.${c}`);
    assert.equal(by.practice_id.is_nullable, 'NO', t);
    assert.equal(by.extra.data_type, 'jsonb', t);
    const rls = (await q(`select relrowsecurity from pg_class where oid = $1::regclass`, [`arch.${t}`])).rows[0];
    assert.equal(rls.relrowsecurity, true, t);
  }
  const fks = (await q(`select c.conrelid::regclass::text as tbl, a.attname as col from pg_constraint c join pg_attribute a on a.attrelid=c.conrelid and a.attnum = any(c.conkey)
                        where c.contype='f' and c.conrelid in ('arch.contact'::regclass,'arch.enquiry'::regclass,'arch.crm_activity'::regclass)`)).rows;
  assert.ok(fks.length >= 7);
  const idx = (await q(`select tablename, indexdef from pg_indexes where schemaname='arch' and tablename in ('contact','enquiry','crm_activity')`)).rows;
  for (const f of fks) assert.ok(idx.some((i) => `arch.${i.tablename}` === f.tbl && new RegExp(`\\(${f.col}[,)]`).test(i.indexdef)), `an index starts with ${f.tbl}.${f.col}`);
});

test('a member reads their own practice and nothing else', async () => {
  const mine = await user(DAN, () => q(`select title from arch.enquiry`));
  assert.deepEqual(mine.rows.map((r) => r.title), ['Hill house']);
  assert.equal((await user(DAN, () => q(`select * from arch.contact`))).rows.length, 1);
  assert.equal((await user(ALICE, () => q(`select * from arch.contact where practice_id = $1`, [practiceB]))).rows.length, 0);
  // history: a member writes it, and every member of the practice reads it
  await user(DAN, () => q(`insert into arch.crm_activity (practice_id, enquiry_id, contact_id, kind, body, who, at) values ($1,$2,$3,'call','Talked about the site','Dan','2026-11-20T01:00:00Z')`, [practiceA, enquiryA, contactA]));
  assert.equal((await user(ALICE, () => q(`select * from arch.crm_activity`))).rows.length, 1);
  assert.equal((await user(BOB, () => q(`select * from arch.crm_activity`))).rows.length, 0);
});

test('a member adds and changes contacts and enquiries, and archives them', async () => {
  const ok = await user(DAN, () => q(`update arch.enquiry set stage='meeting', next_action='Visit the site' where id=$1`, [enquiryA]));
  assert.equal(ok.affectedRows, 1);
  await user(DAN, () => q(`update arch.contact set archived = true where id=$1`, [contactA]));
  assert.equal((await q(`select archived from arch.contact where id=$1`, [contactA])).rows[0].archived, true);
  await user(DAN, () => q(`update arch.contact set archived = false where id=$1`, [contactA]));
});

test('a viewer reads and cannot write anything', async () => {
  assert.equal((await user(CAROL, () => q(`select * from arch.enquiry`))).rows.length, 1);
  assert.equal((await user(CAROL, () => q(`select * from arch.contact`))).rows.length, 1);
  assert.equal((await user(CAROL, () => q(`select * from arch.crm_activity`))).rows.length, 1);
  await refused(user(CAROL, () => q(`insert into arch.contact (practice_id, name) values ($1,'x')`, [practiceA])), /row-level security/);
  await refused(user(CAROL, () => q(`insert into arch.enquiry (practice_id, title) values ($1,'x')`, [practiceA])), /row-level security/);
  await refused(user(CAROL, () => q(`insert into arch.crm_activity (practice_id, contact_id, kind, body) values ($1,$2,'note','x')`, [practiceA, contactA])), /row-level security/);
  assert.equal((await user(CAROL, () => q(`update arch.enquiry set stage='won' where id=$1`, [enquiryA]))).affectedRows, 0);
  assert.equal((await user(CAROL, () => q(`update arch.contact set name='x' where id=$1`, [contactA]))).affectedRows, 0);
  assert.notEqual((await q(`select stage from arch.enquiry where id=$1`, [enquiryA])).rows[0].stage, 'won');
});

test('someone outside the practice sees nothing and changes nothing', async () => {
  assert.equal((await user(BOB, () => q(`select * from arch.enquiry where id=$1`, [enquiryA]))).rows.length, 0);
  assert.equal((await user(BOB, () => q(`select * from arch.contact where id=$1`, [contactA]))).rows.length, 0);
  assert.equal((await user(BOB, () => q(`update arch.enquiry set title='hijack' where id=$1`, [enquiryA]))).affectedRows, 0);
  assert.equal((await user(BOB, () => q(`update arch.contact set name='hijack' where id=$1`, [contactA]))).affectedRows, 0);
  await refused(user(BOB, () => q(`insert into arch.contact (practice_id, name) values ($1,'sneaky')`, [practiceA])), /row-level security/);
  await refused(user(BOB, () => q(`insert into arch.enquiry (practice_id, title) values ($1,'sneaky')`, [practiceA])), /row-level security/);
  await refused(user(BOB, () => q(`insert into arch.crm_activity (practice_id, enquiry_id, kind, body) values ($1,$2,'note','sneaky')`, [practiceA, enquiryA])), /row-level security/);
  assert.equal((await q(`select title from arch.enquiry where id=$1`, [enquiryA])).rows[0].title, 'Hill house');
});

test('a row cannot point at another practice’s contact, enquiry or project', async () => {
  await refused(user(DAN, () => q(`insert into arch.enquiry (practice_id, title, contact_id) values ($1,'x',$2)`, [practiceA, contactB])), /row-level security/);
  await refused(user(DAN, () => q(`insert into arch.enquiry (practice_id, title, project_id) values ($1,'x',$2)`, [practiceA, projectB])), /row-level security/);
  await refused(user(DAN, () => q(`update arch.enquiry set contact_id=$2 where id=$1`, [enquiryA, contactB])), /row-level security/);
  await refused(user(DAN, () => q(`update arch.enquiry set project_id=$2 where id=$1`, [enquiryA, projectB])), /row-level security/);
  await refused(user(DAN, () => q(`insert into arch.crm_activity (practice_id, enquiry_id, kind, body) values ($1,$2,'note','x')`, [practiceA, enquiryB])), /row-level security/);
  // and the same practice’s project can be linked
  assert.equal((await user(DAN, () => q(`update arch.enquiry set project_id=$2, stage='won' where id=$1`, [enquiryA, projectA]))).affectedRows, 1);
});

test('history cannot be changed or removed: not by a member, an owner, or a policy added later', async () => {
  const id = (await q(`select id from arch.crm_activity limit 1`)).rows[0].id;
  for (const who of [DAN, ALICE]) {
    await refused(user(who, () => q(`update arch.crm_activity set body='changed' where id=$1`, [id])), /permission denied/);
    await refused(user(who, () => q(`delete from arch.crm_activity where id=$1`, [id])), /permission denied/);
  }
  // even if a later migration granted the rights and added policies, the trigger still refuses
  await q(`grant update, delete on arch.crm_activity to authenticated`);
  await q(`create policy tmp_upd on arch.crm_activity for update to authenticated using (true) with check (true)`);
  await q(`create policy tmp_del on arch.crm_activity for delete to authenticated using (true)`);
  try {
    await refused(user(DAN, () => q(`update arch.crm_activity set body='changed' where id=$1`, [id])), /append-only/);
    await refused(user(DAN, () => q(`delete from arch.crm_activity where id=$1`, [id])), /append-only/);
  } finally {
    await q(`drop policy tmp_upd on arch.crm_activity`); await q(`drop policy tmp_del on arch.crm_activity`);
    await q(`revoke update, delete on arch.crm_activity from authenticated`);
  }
  assert.equal((await q(`select body from arch.crm_activity where id=$1`, [id])).rows[0].body, 'Talked about the site');
});

test('contacts and enquiries cannot be deleted: they are archived', async () => {
  await refused(user(ALICE, () => q(`delete from arch.contact where id=$1`, [contactA])), /permission denied/);
  await refused(user(ALICE, () => q(`delete from arch.enquiry where id=$1`, [enquiryA])), /permission denied/);
  const g = (await q(`select table_name, privilege_type from information_schema.role_table_grants where table_schema='arch' and grantee='authenticated' and table_name in ('contact','enquiry','crm_activity')`)).rows;
  assert.deepEqual(g.filter((r) => r.privilege_type === 'DELETE'), []);
  assert.deepEqual(g.filter((r) => r.table_name === 'crm_activity').map((r) => r.privilege_type).sort(), ['INSERT', 'SELECT']);
});

test('the database keeps to the words the page uses', async () => {
  await refused(user(DAN, () => q(`insert into arch.enquiry (practice_id, title, stage) values ($1,'x','maybe')`, [practiceA])), /check constraint/);
  await refused(user(DAN, () => q(`insert into arch.enquiry (practice_id, title, value_nzd) values ($1,'x',-5)`, [practiceA])), /check constraint/);
  await refused(user(DAN, () => q(`insert into arch.contact (practice_id, name) values ($1,'  ')`, [practiceA])), /check constraint/);
  await refused(user(DAN, () => q(`insert into arch.crm_activity (practice_id, enquiry_id, kind, body) values ($1,$2,'text','x')`, [practiceA, enquiryA])), /check constraint/);
  await refused(user(DAN, () => q(`insert into arch.crm_activity (practice_id, kind, body) values ($1,'note','about nothing')`, [practiceA])), /check constraint/);
  await refused(user(DAN, () => q(`insert into arch.crm_activity (practice_id, contact_id, kind, body) values ($1,$2,'note','')`, [practiceA, contactA])), /check constraint/);
  for (const stage of ['new', 'meeting', 'proposal', 'won', 'lost', 'paused']) {
    await user(DAN, () => q(`insert into arch.enquiry (practice_id, title, stage) values ($1,$2,$3)`, [practiceA, `s ${stage}`, stage]));
  }
  for (const kind of ['note', 'call', 'meeting', 'email', 'stage']) {
    await user(DAN, () => q(`insert into arch.crm_activity (practice_id, enquiry_id, kind, body) values ($1,$2,$3,'ok')`, [practiceA, enquiryA, kind]));
  }
});

test('the time a history row was recorded is the database’s, while "at" is the person’s', async () => {
  const r = await user(DAN, () => q(`insert into arch.crm_activity (practice_id, enquiry_id, kind, body, at, created_at) values ($1,$2,'meeting','Met on site','2020-01-02T03:04:05Z','2001-01-01T00:00:00Z') returning at, created_at`, [practiceA, enquiryA]));
  assert.equal(new Date(r.rows[0].at).toISOString(), '2020-01-02T03:04:05.000Z');
  assert.ok(new Date(r.rows[0].created_at).getFullYear() >= 2026, 'created_at was stamped by the database');
  // a record can only be made under the signed-in person’s own id
  await refused(user(DAN, () => q(`insert into arch.contact (practice_id, name, created_by) values ($1,'x',$2)`, [practiceA, ALICE])), /row-level security/);
});

test('anon has nothing: no tables, no helper functions', async () => {
  for (const t of ['contact', 'enquiry', 'crm_activity']) {
    await refused(as('anon', null, () => q(`select * from arch.${t}`)), /permission denied/);
    await refused(as('anon', null, () => q(`insert into arch.${t} (practice_id) values ($1)`, [practiceA])), /permission denied/);
  }
  await refused(as('anon', null, () => q(`select arch.contact_practice($1)`, [contactA])), /permission denied/);
  await refused(as('anon', null, () => q(`select arch.enquiry_practice($1)`, [enquiryA])), /permission denied/);
  const g = (await q(`select grantee, table_name from information_schema.role_table_grants where table_schema='arch' and table_name in ('contact','enquiry','crm_activity') and grantee in ('anon','public','PUBLIC')`)).rows;
  assert.deepEqual(g, []);
  // and no default privileges were set for anyone
  assert.equal((await q(`select count(*)::int n from pg_default_acl d join pg_namespace n on n.oid = d.defaclnamespace where n.nspname = 'arch'`)).rows[0].n, 0);
});

test('the security definer helpers fix their search_path', async () => {
  const r = (await q(`select p.proname, p.proconfig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='arch' and p.proname in ('contact_practice','enquiry_practice')`)).rows;
  assert.equal(r.length, 2);
  for (const row of r) assert.ok((row.proconfig ?? []).some((c) => c.startsWith('search_path=')), row.proname);
});
