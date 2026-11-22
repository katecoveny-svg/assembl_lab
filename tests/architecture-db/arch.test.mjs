import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';

const here = path.dirname(fileURLToPath(import.meta.url));
const migDir = path.resolve(here, '../../supabase/migrations');
const migrations = readdirSync(migDir).filter((f) => /^\d+_arch_.*\.sql$/.test(f)).sort();

const ALICE = '00000000-0000-4000-8000-00000000a11c'; // owner of practice A
const BOB = '00000000-0000-4000-8000-0000000000b0';   // owner of practice B
const CAROL = '00000000-0000-4000-8000-00000000ca01'; // viewer in practice A
const DAN = '00000000-0000-4000-8000-0000000000d4';   // member in practice A

let db;
let practiceA, practiceB, projectA;

async function applyAll() {
  for (const f of migrations) await db.exec(readFileSync(path.join(migDir, f), 'utf8'));
}
async function as(role, uid, fn) {
  await db.exec(`set role ${role}`);
  if (uid) await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [uid]);
  try { return await fn(); }
  finally {
    await db.exec('reset role');
    await db.query(`select set_config('request.jwt.claim.sub', '', false)`);
  }
}
const user = (uid, fn) => as('authenticated', uid, fn);
const rejects = (p, re) => assert.rejects(p, re);
async function snapshot() {
  const r = await db.query(`
    select
      (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname='arch' and c.relkind='r')::int as tables,
      (select count(*) from pg_policies where schemaname='arch')::int as policies,
      (select count(*) from pg_trigger g join pg_class c on c.oid=g.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='arch' and not g.tgisinternal)::int as triggers,
      (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='arch')::int as functions`);
  return r.rows[0];
}

before(async () => {
  db = new PGlite(); // in memory, no network port
  await db.exec(readFileSync(path.join(here, 'standins.sql'), 'utf8'));
  await db.query(`insert into auth.users (id, email) values ($1,'alice@x'),($2,'bob@x'),($3,'carol@x'),($4,'dan@x')`, [ALICE, BOB, CAROL, DAN]);
});
after(async () => { await db.close(); });

test('migrations apply, then apply a second time without error or change', async () => {
  assert.ok(migrations.length >= 3, 'found migration files');
  await applyAll();
  const first = await snapshot();
  await applyAll();
  const second = await snapshot();
  assert.deepEqual(second, first);
  assert.equal(first.tables, 18); // 12 at first; checklist_item, invitation and file, then contact, enquiry and crm_activity, were added later
  assert.ok(first.policies >= 40);
});

test('row level security is switched on for every table in arch', async () => {
  const r = await db.query(`select c.relname, c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace
                            where n.nspname='arch' and c.relkind='r'`);
  assert.equal(r.rows.length, 18);
  for (const row of r.rows) assert.equal(row.relrowsecurity, true, row.relname);
});

test('security definer helpers have a fixed search_path', async () => {
  const r = await db.query(`select p.proname, p.prosecdef, p.proconfig from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                            where n.nspname='arch' and p.prosecdef`);
  assert.ok(r.rows.length >= 5);
  for (const row of r.rows) assert.ok((row.proconfig ?? []).some((c) => c.startsWith('search_path=')), row.proname);
});

test('site latitude and longitude are marked private in column comments', async () => {
  const r = await db.query(`select a.attname, d.description from pg_description d
    join pg_attribute a on a.attrelid=d.objoid and a.attnum=d.objsubid
    where d.objoid='arch.project'::regclass and a.attname in ('site_lat','site_lon')`);
  assert.equal(r.rows.length, 2);
  for (const row of r.rows) assert.match(row.description, /PRIVATE/);
});

test('a member can create a practice, create a project and read it back', async () => {
  practiceA = (await user(ALICE, () => db.query(`insert into arch.practice (name, created_by) values ('Practice A', $1) returning id`, [ALICE]))).rows[0].id;
  // creator became owner
  const role = await user(ALICE, () => db.query(`select role from arch.practice_member where practice_id=$1 and user_id=$2`, [practiceA, ALICE]));
  assert.equal(role.rows[0].role, 'owner');
  // owner adds a viewer and a member
  await user(ALICE, () => db.query(`insert into arch.practice_member (practice_id,user_id,role) values ($1,$2,'viewer'),($1,$3,'member')`, [practiceA, CAROL, DAN]));
  projectA = (await user(DAN, () => db.query(
    `insert into arch.project (practice_id,name,client,site_lat,site_lon,site_facts) values ($1,'16A','Client',-36.85,174.76,'{"zone":"x"}') returning id`, [practiceA]))).rows[0].id;
  const got = await user(ALICE, () => db.query(`select name, site_lat, site_lon, stage from arch.project where id=$1`, [projectA]));
  assert.equal(got.rows.length, 1);
  assert.equal(got.rows[0].name, '16A');
  assert.equal(got.rows[0].site_lat, -36.85);
  const stages = await user(ALICE, () => db.query(`select count(*)::int n from arch.stage where project_id=$1 and status='not_started'`, [projectA]));
  assert.equal(stages.rows[0].n, 7);
});

test('a member of another practice cannot see or change it', async () => {
  practiceB = (await user(BOB, () => db.query(`insert into arch.practice (name, created_by) values ('Practice B', $1) returning id`, [BOB]))).rows[0].id;
  const seen = await user(BOB, () => db.query(`select * from arch.project`));
  assert.equal(seen.rows.length, 0);
  assert.equal((await user(BOB, () => db.query(`select * from arch.practice`))).rows.length, 1);
  assert.equal((await user(BOB, () => db.query(`select * from arch.stage where project_id=$1`, [projectA]))).rows.length, 0);
  assert.equal((await user(BOB, () => db.query(`select * from arch.practice_member where practice_id=$1`, [practiceA]))).rows.length, 0);
  const upd = await user(BOB, () => db.query(`update arch.project set name='hijack' where id=$1`, [projectA]));
  assert.equal(upd.affectedRows, 0);
  const del = await user(BOB, () => db.query(`delete from arch.project where id=$1`, [projectA]));
  assert.equal(del.affectedRows, 0);
  await rejects(user(BOB, () => db.query(`insert into arch.task (project_id,title) values ($1,'sneaky')`, [projectA])), /row-level security/);
  await rejects(user(BOB, () => db.query(`insert into arch.project (practice_id,name) values ($1,'sneaky')`, [practiceA])), /row-level security/);
  await rejects(user(BOB, () => db.query(`insert into arch.practice_member (practice_id,user_id,role) values ($1,$2,'owner')`, [practiceA, BOB])), /row-level security/);
});

test('a viewer can read but cannot write', async () => {
  assert.equal((await user(CAROL, () => db.query(`select * from arch.project`))).rows.length, 1);
  assert.equal((await user(CAROL, () => db.query(`select * from arch.stage where project_id=$1`, [projectA]))).rows.length, 7);
  await rejects(user(CAROL, () => db.query(`insert into arch.task (project_id,title) values ($1,'x')`, [projectA])), /row-level security/);
  await rejects(user(CAROL, () => db.query(`insert into arch.project (practice_id,name) values ($1,'x')`, [practiceA])), /row-level security/);
  await rejects(user(CAROL, () => db.query(`insert into arch.approval (project_id,stage,who,what,user_id) values ($1,'concept','Carol','ok',$2)`, [projectA, CAROL])), /row-level security/);
  await rejects(user(CAROL, () => db.query(`insert into arch.activity (project_id,action) values ($1,'x')`, [projectA])), /row-level security/);
  assert.equal((await user(CAROL, () => db.query(`update arch.project set name='x' where id=$1`, [projectA]))).affectedRows, 0);
  assert.equal((await user(CAROL, () => db.query(`update arch.stage set status='in_progress' where project_id=$1`, [projectA]))).affectedRows, 0);
  assert.equal((await user(CAROL, () => db.query(`delete from arch.stage where project_id=$1`, [projectA]))).affectedRows, 0);
  await rejects(user(CAROL, () => db.query(`insert into arch.practice_member (practice_id,user_id,role) values ($1,$2,'owner')`, [practiceA, CAROL])), /row-level security/);
  // and a plain member cannot manage members either
  await rejects(user(DAN, () => db.query(`insert into arch.practice_member (practice_id,user_id,role) values ($1,$2,'owner')`, [practiceA, BOB])), /row-level security/);
});

test('anon sees nothing and writes nothing', async () => {
  for (const t of ['practice', 'practice_member', 'project', 'stage', 'task', 'document', 'approval', 'rfi', 'observation', 'variation', 'defect', 'activity']) {
    await rejects(as('anon', null, () => db.query(`select * from arch.${t}`)), /permission denied/, t);
  }
  await rejects(as('anon', null, () => db.query(`insert into arch.project (practice_id,name) values ($1,'x')`, [practiceA])), /permission denied/);
  await rejects(as('anon', null, () => db.query(`select arch.is_member($1)`, [practiceA])), /permission denied/);
});

test('a member can add project records; a creator cannot forge created_by', async () => {
  await user(DAN, () => db.query(`insert into arch.task (project_id,stage,title,status) values ($1,'concept','Draft plan','doing')`, [projectA]));
  await user(DAN, () => db.query(`insert into arch.rfi (project_id,question) values ($1,'What colour?')`, [projectA]));
  await user(DAN, () => db.query(`insert into arch.observation (project_id,by,note) values ($1,'Dan','site visit')`, [projectA]));
  await user(DAN, () => db.query(`insert into arch.activity (project_id,who,action,user_id) values ($1,'Dan','created task',$2)`, [projectA, DAN]));
  await rejects(user(DAN, () => db.query(`insert into arch.practice (name,created_by) values ('Forged',$1)`, [ALICE])), /row-level security/);
  await rejects(user(DAN, () => db.query(`insert into arch.task (project_id,stage,title,status) values ($1,'nonsense','x','todo')`, [projectA])), /check constraint/);
});

test('an approval records the signed-in user and cannot be changed or deleted', async () => {
  // the user id is required to match the signed-in user
  await rejects(user(DAN, () => db.query(`insert into arch.approval (project_id,stage,who,role,what,user_id) values ($1,'concept','Kate','Director','Concept',$2)`, [projectA, ALICE])), /row-level security/);
  // default fills the signed-in user's id
  const ins = await user(DAN, () => db.query(`insert into arch.approval (project_id,stage,who,role,what,fingerprint) values ($1,'concept','Dan Typed','Architect','Concept approved','fp1') returning id, user_id, who`, [projectA]));
  assert.equal(ins.rows[0].user_id, DAN);
  assert.equal(ins.rows[0].who, 'Dan Typed');
  const id = ins.rows[0].id;
  // no update or delete, even for the owner or the person who wrote it
  for (const who of [DAN, ALICE]) {
    await rejects(user(who, () => db.query(`update arch.approval set what='changed' where id=$1`, [id])), /permission denied/);
    await rejects(user(who, () => db.query(`delete from arch.approval where id=$1`, [id])), /permission denied/);
    await rejects(user(who, () => db.query(`update arch.activity set action='changed'`)), /permission denied/);
    await rejects(user(who, () => db.query(`delete from arch.activity`)), /permission denied/);
  }
  // the trigger blocks it too, for the table owner / superuser (not just missing grants)
  await rejects(db.query(`update arch.approval set what='changed' where id=$1`, [id]), /append-only/);
  await rejects(db.query(`delete from arch.approval where id=$1`, [id]), /append-only/);
  await rejects(db.query(`delete from arch.activity`), /append-only/);
  // only service_role may
  const sr = await as('service_role', null, () => db.query(`update arch.approval set note='service fix' where id=$1`, [id]));
  assert.equal(sr.affectedRows, 1);
  // a project with history cannot be deleted by an owner
  await rejects(user(ALICE, () => db.query(`delete from arch.project where id=$1`, [projectA])), /foreign key|violates/);
});

test('a stage cannot be marked done without an approval, and can with one', async () => {
  // no approval for "developed"
  await rejects(user(DAN, () => db.query(`update arch.stage set status='done' where project_id=$1 and key='developed'`, [projectA])), /no approval recorded/);
  // note: concept already has an approval from the previous test, so it does not count for developed
  // service_role is held to the same rule
  await rejects(as('service_role', null, () => db.query(`update arch.stage set status='done' where project_id=$1 and key='developed'`, [projectA])), /no approval recorded/);
  // concept has an approval from the previous test
  const ok = await user(DAN, () => db.query(`update arch.stage set status='done', done_at=now() where project_id=$1 and key='concept'`, [projectA]));
  assert.equal(ok.affectedRows, 1);
  // add the missing approval, then it works
  await user(ALICE, () => db.query(`insert into arch.approval (project_id,stage,who,what) values ($1,'developed','Alice','Developed design')`, [projectA]));
  const ok2 = await user(DAN, () => db.query(`update arch.stage set status='done' where project_id=$1 and key='developed'`, [projectA]));
  assert.equal(ok2.affectedRows, 1);
  // other statuses never need an approval
  const ok3 = await user(DAN, () => db.query(`update arch.stage set status='awaiting_approval' where project_id=$1 and key='detailed'`, [projectA]));
  assert.equal(ok3.affectedRows, 1);
});

test('project updated_at moves when the project changes', async () => {
  const before = (await db.query(`select updated_at from arch.project where id=$1`, [projectA])).rows[0].updated_at;
  await new Promise((r) => setTimeout(r, 15));
  await user(ALICE, () => db.query(`update arch.project set client='New client' where id=$1`, [projectA]));
  const after = (await db.query(`select updated_at from arch.project where id=$1`, [projectA])).rows[0].updated_at;
  assert.ok(after > before);
});

test('data survives a third run of the migrations', async () => {
  await applyAll();
  const n = (await db.query(`select count(*)::int n from arch.project`)).rows[0].n;
  assert.equal(n, 1);
});
