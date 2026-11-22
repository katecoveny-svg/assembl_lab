// Local dry run of the team, invitation, checklist, "extra" and file rules, on PGlite with stand-ins for Supabase's
// auth schema, its three roles, and the two Storage tables the access rules sit on. Not Supabase, and no network.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';

const here = path.dirname(fileURLToPath(import.meta.url));
const migDir = process.env.ARCH_MIGRATIONS_DIR ? path.resolve(process.env.ARCH_MIGRATIONS_DIR) : path.resolve(here, '../../supabase/migrations');
const migrations = readdirSync(migDir).filter((f) => /^\d+_arch_.*\.sql$/.test(f)).sort();

const uid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
// who is who. "token" is what the sign-in token claims; "identity" is Supabase's own record of the Google sign-in.
const P = {
  alice: { id: uid(1), email: 'alice@a.example' },                       // owner of practice A
  bob: { id: uid(2), email: 'bob@b.example' },                           // owner of practice B
  carol: { id: uid(3), email: 'carol@a.example' },                       // viewer in A
  dan: { id: uid(4), email: 'dan@a.example' },                           // member in A
  eve: { id: uid(5), email: 'eve@a.example' },                           // invited to A, verified by Google
  mal: { id: uid(6), email: 'mal@elsewhere.example' },                   // a different verified Google address
  fay: { id: uid(7), email: 'frank@a.example', verified: false },        // Google has NOT verified the address
  gus: { id: uid(8), email: 'frank@a.example', provider: 'email' },      // right address, but not a Google sign-in
  hal: { id: uid(9), email: 'hal@elsewhere.example', tokenEmail: 'frank@a.example' }, // token address changed; Google's record differs
  ivy: { id: uid(10), email: 'frank@a.example', provider: 'email', forgeMeta: true }, // sets email_verified in the part of the token a person can edit
  jo: { id: uid(11), email: 'frank@a.example', anonymous: true },
  kim: { id: uid(12), email: 'kim@a.example' },                          // second owner for the last-owner checks
};
for (const p of Object.values(P)) {
  const provider = p.provider ?? 'google';
  p.claims = {
    sub: p.id, role: 'authenticated', email: p.tokenEmail ?? p.email, is_anonymous: !!p.anonymous,
    app_metadata: { provider, providers: [provider] },
    user_metadata: p.forgeMeta ? { email: p.email, email_verified: true } : { email: p.email, email_verified: p.verified !== false },
  };
}

let db, practiceA, practiceB, projectA, docA;

async function applyAll() {
  for (const f of migrations) await db.exec(readFileSync(path.join(migDir, f), 'utf8'));
}
async function reset() {
  await db.exec('reset role');
  await db.query(`select set_config('request.jwt.claims', '', false), set_config('request.jwt.claim.sub', '', false)`);
}
/** run as a signed-in person, with their whole token in place */
async function signed(p, fn) {
  await db.exec('set role authenticated');
  await db.query(`select set_config('request.jwt.claims', $1, false), set_config('request.jwt.claim.sub', $2, false)`, [JSON.stringify(p.claims), p.id]);
  try { return await fn(); } finally { await reset(); }
}
async function asRole(role, fn) {
  await db.exec(`set role ${role}`);
  try { return await fn(); } finally { await reset(); }
}
const q = (sql, params) => db.query(sql, params);
const rows = async (p, sql, params) => (await signed(p, () => q(sql, params))).rows;
const changed = async (p, sql, params) => (await signed(p, () => q(sql, params))).affectedRows;
const refused = (promise, re) => assert.rejects(promise, re);
const roleOf = async (p, practice) => (await q(`select role from arch.practice_member where practice_id=$1 and user_id=$2`, [practice, p.id])).rows[0]?.role ?? null;

async function snapshot() {
  const r = await q(`
    select
      (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname='arch' and c.relkind='r')::int as tables,
      (select count(*) from information_schema.columns where table_schema='arch')::int as columns,
      (select count(*) from pg_policies where schemaname='arch')::int as policies,
      (select count(*) from pg_policies where schemaname='storage')::int as storage_policies,
      (select count(*) from pg_trigger g join pg_class c on c.oid=g.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='arch' and not g.tgisinternal)::int as triggers,
      (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='arch')::int as functions,
      (select count(*) from pg_indexes where schemaname='arch')::int as indexes,
      (select count(*) from pg_constraint c join pg_namespace n on n.oid=c.connamespace where n.nspname='arch')::int as constraints,
      (select count(*) from storage.buckets)::int as buckets`);
  return r.rows[0];
}

before(async () => {
  db = new PGlite();
  await db.exec(readFileSync(path.join(here, 'standins.sql'), 'utf8'));
  for (const p of Object.values(P)) {
    await q(`insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)`, [p.id, p.tokenEmail ?? p.email, JSON.stringify({ full_name: p.email.split('@')[0] })]);
    await q(`insert into auth.identities (user_id, provider, identity_data) values ($1, $2, $3)`,
      [p.id, p.provider ?? 'google', JSON.stringify({ email: p.email, email_verified: p.verified !== false, sub: p.id })]);
  }
});
after(async () => { await db.close(); });

test('all the migrations apply, then apply a second time without error or change', async () => {
  assert.equal(migrations.length, 8, 'six applied files, the bucket limit and the clients tables');
  await applyAll();
  const first = await snapshot();
  await applyAll();
  assert.deepEqual(await snapshot(), first);
  assert.equal(first.tables, 18);
  assert.equal(first.storage_policies, 4);
  assert.equal(first.buckets, 1);
  const b = (await q(`select id, public, file_size_limit from storage.buckets`)).rows[0];
  assert.deepEqual(b, { id: 'arch-files', public: false, file_size_limit: 1073741824 }); // part 6 made it 50 MB; part 7 raises it to 1 GB (files-limit.test.mjs)
});

test('a bucket of that name that was public is made private, not left open', async () => {
  await q(`update storage.buckets set public = true where id = 'arch-files'`);
  await applyAll();
  assert.equal((await q(`select public from storage.buckets where id = 'arch-files'`)).rows[0].public, false);
});

test('every arch table has row level security, an extra column, and nothing for anon', async () => {
  const t = (await q(`select c.relname, c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='arch' and c.relkind='r'`)).rows;
  assert.equal(t.length, 18);
  for (const r of t) assert.equal(r.relrowsecurity, true, r.relname);
  const extra = (await q(`select table_name from information_schema.columns where table_schema='arch' and column_name='extra' and data_type='jsonb' and is_nullable='NO'`)).rows.map((r) => r.table_name);
  assert.equal(extra.length, 18, 'every table has extra jsonb not null');
  for (const name of ['checklist_item', 'invitation', 'file']) {
    await refused(asRole('anon', () => q(`select * from arch.${name}`)), /permission denied/);
  }
  for (const call of ['arch.verified_email()', 'arch.my_invitations()', `arch.accept_invitation('${uid(99)}')`, `arch.practice_people('${uid(99)}')`, `arch.path_practice('x')`]) {
    await refused(asRole('anon', () => q(`select ${call}`)), /permission denied/);
  }
});

test('every security definer function has a fixed search_path, and none is open to everyone', async () => {
  const f = (await q(`select p.proname, p.prosecdef, p.proconfig, p.proacl::text as acl from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='arch'`)).rows;
  for (const r of f) {
    if (r.prosecdef) assert.ok((r.proconfig ?? []).some((c) => c === 'search_path=""' || c === 'search_path='), `${r.proname} has an empty search_path`);
    assert.ok(r.acl && !/(^|[{,])=X?\w*\//.test(r.acl), `${r.proname} is not granted to PUBLIC (${r.acl})`);
    assert.ok(!/anon=/.test(r.acl), `${r.proname} is not granted to anon`);
  }
  for (const name of ['verified_email', 'my_invitations', 'accept_invitation', 'practice_people', 'keep_one_owner']) {
    assert.equal(f.find((r) => r.proname === name)?.prosecdef, true, `${name} is security definer`);
  }
});

test('set up: two practices, a viewer and a member, a project', async () => {
  practiceA = (await rows(P.alice, `insert into arch.practice (name) values ('Practice A') returning id`))[0].id;
  practiceB = (await rows(P.bob, `insert into arch.practice (name) values ('Practice B') returning id`))[0].id;
  await signed(P.alice, () => q(`insert into arch.practice_member (practice_id,user_id,role) values ($1,$2,'viewer'),($1,$3,'member')`, [practiceA, P.carol.id, P.dan.id]));
  projectA = (await rows(P.dan, `insert into arch.project (practice_id,name) values ($1,'House') returning id`, [practiceA]))[0].id;
  docA = (await rows(P.dan, `insert into arch.document (project_id,title) values ($1,'Drawings') returning id`, [projectA]))[0].id;
  assert.equal(await roleOf(P.alice, practiceA), 'owner');
});

// ---- invitations ------------------------------------------------------------------------------------------------------
test('only an owner can invite, and only into their own practice', async () => {
  await signed(P.alice, () => q(`insert into arch.invitation (practice_id,email,role) values ($1,'eve@a.example','member'),($1,'frank@a.example','owner'),($1,'carol@a.example','owner')`, [practiceA]));
  await refused(signed(P.dan, () => q(`insert into arch.invitation (practice_id,email,role) values ($1,'x@a.example','owner')`, [practiceA])), /row-level security/);
  await refused(signed(P.carol, () => q(`insert into arch.invitation (practice_id,email,role) values ($1,'x@a.example','owner')`, [practiceA])), /row-level security/);
  await refused(signed(P.bob, () => q(`insert into arch.invitation (practice_id,email,role) values ($1,'bob@b.example','owner')`, [practiceA])), /row-level security/);
  // an owner cannot write an invitation in someone else's name, or one that is already "accepted"
  await refused(signed(P.alice, () => q(`insert into arch.invitation (practice_id,email,role,invited_by) values ($1,'y@a.example','member',$2)`, [practiceA, P.bob.id])), /row-level security/);
  await refused(signed(P.alice, () => q(`insert into arch.invitation (practice_id,email,role,accepted_at) values ($1,'y@a.example','member',now())`, [practiceA])), /row-level security/);
  // the address is kept in lower case, the role is one of the three, and there is one open invitation per address
  await refused(signed(P.alice, () => q(`insert into arch.invitation (practice_id,email,role) values ($1,'Mixed@A.example','member')`, [practiceA])), /check constraint/);
  await refused(signed(P.alice, () => q(`insert into arch.invitation (practice_id,email,role) values ($1,'z@a.example','admin')`, [practiceA])), /check constraint/);
  await refused(signed(P.alice, () => q(`insert into arch.invitation (practice_id,email,role) values ($1,'eve@a.example','viewer')`, [practiceA])), /duplicate key|unique/);
  // who can read the list: owners of that practice only
  assert.equal((await rows(P.alice, `select * from arch.invitation`)).length, 3);
  for (const p of [P.dan, P.carol, P.bob, P.eve, P.mal]) assert.equal((await rows(p, `select * from arch.invitation`)).length, 0, p.email);
});

test('an invitation is claimed only by the signed-in person whose Google-verified email matches', async () => {
  // Eve sees her own invitation, with the practice's name, and nobody else's
  const mine = await rows(P.eve, `select * from arch.my_invitations()`);
  assert.equal(mine.length, 1);
  assert.equal(mine[0].practice_name, 'Practice A');
  assert.equal(mine[0].role, 'member');
  assert.equal((await rows(P.eve, `select arch.verified_email() as e`))[0].e, 'eve@a.example');
  // before accepting she is not a member and sees none of the practice's work
  assert.equal((await rows(P.eve, `select * from arch.project`)).length, 0);
  const got = await rows(P.eve, `select arch.accept_invitation($1) as practice`, [mine[0].id]);
  assert.equal(got[0].practice, practiceA);
  assert.equal(await roleOf(P.eve, practiceA), 'member');
  assert.equal((await rows(P.eve, `select * from arch.project`)).length, 1);
  const inv = (await q(`select accepted_at, accepted_by from arch.invitation where id=$1`, [mine[0].id])).rows[0];
  assert.ok(inv.accepted_at);
  assert.equal(inv.accepted_by, P.eve.id);
  // used once
  await refused(signed(P.eve, () => q(`select arch.accept_invitation($1)`, [mine[0].id])), /no open invitation/);
  assert.equal((await rows(P.eve, `select * from arch.my_invitations()`)).length, 0);
});

test('a different, unverified, non-Google, edited or anonymous sign-in gets nothing, even knowing the invitation id', async () => {
  const frank = (await q(`select id from arch.invitation where email='frank@a.example'`)).rows[0].id; // an invitation to be an OWNER
  const cases = [
    [P.mal, 'a different verified address'],
    [P.fay, 'the right address, not verified by Google'],
    [P.gus, 'the right address, signed in by email not Google'],
    [P.hal, 'the token address was changed to the invited one; Google’s record says otherwise'],
    [P.ivy, 'email_verified set by the person in the editable part of the token'],
    [P.jo, 'an anonymous sign-in'],
  ];
  for (const [p, why] of cases) {
    assert.equal((await rows(p, `select * from arch.my_invitations()`)).length, 0, why);
    await refused(signed(p, () => q(`select arch.accept_invitation($1)`, [frank])), /verified|no open invitation/);
    assert.equal(await roleOf(p, practiceA), null, why);
    // and they cannot simply add themselves, or rewrite the invitation to their own address
    await refused(signed(p, () => q(`insert into arch.practice_member (practice_id,user_id,role) values ($1,$2,'owner')`, [practiceA, p.id])), /row-level security/);
    await refused(signed(p, () => q(`update arch.invitation set email=$2 where id=$1`, [frank, p.email])), /permission denied/);
  }
  // mal has a verified address: it just is not the invited one
  assert.equal((await rows(P.mal, `select arch.verified_email() as e`))[0].e, 'mal@elsewhere.example');
  for (const p of [P.fay, P.gus, P.hal, P.ivy, P.jo]) assert.equal((await rows(p, `select arch.verified_email() as e`))[0].e, null, p.email);
  // no token at all
  await refused(asRole('authenticated', () => q(`select arch.accept_invitation($1)`, [frank])), /verified/);
  // the invitation is still open and untouched
  const inv = (await q(`select accepted_at, email, role from arch.invitation where id=$1`, [frank])).rows[0];
  assert.deepEqual(inv, { accepted_at: null, email: 'frank@a.example', role: 'owner' });
  assert.equal((await q(`select count(*)::int n from arch.practice_member where practice_id=$1`, [practiceA])).rows[0].n, 4); // alice, carol, dan, eve
});

test('someone already in the practice keeps their role; an owner can cancel an open invitation', async () => {
  const mine = await rows(P.carol, `select * from arch.my_invitations()`); // carol is a viewer, invited as owner
  assert.equal(mine.length, 1);
  await signed(P.carol, () => q(`select arch.accept_invitation($1)`, [mine[0].id]));
  assert.equal(await roleOf(P.carol, practiceA), 'viewer', 'an invitation does not raise an existing person’s role');
  // cancel: owners only, open invitations only
  assert.equal(await changed(P.dan, `delete from arch.invitation where email='frank@a.example'`), 0);
  assert.equal(await changed(P.alice, `delete from arch.invitation where id=$1`, [mine[0].id]), 0, 'an accepted invitation stays on record');
  assert.equal(await changed(P.alice, `delete from arch.invitation where email='frank@a.example'`), 1);
});

test('the people list shows the practice’s own people, and nobody else’s', async () => {
  const people = await rows(P.carol, `select * from arch.practice_people($1)`, [practiceA]);
  assert.deepEqual(people.map((r) => `${r.email}:${r.role}`).sort(), ['alice@a.example:owner', 'carol@a.example:viewer', 'dan@a.example:member', 'eve@a.example:member']);
  assert.equal(people.find((r) => r.email === 'dan@a.example').name, 'dan');
  assert.equal((await rows(P.bob, `select * from arch.practice_people($1)`, [practiceA])).length, 0);
  assert.equal((await rows(P.mal, `select * from arch.practice_people($1)`, [practiceA])).length, 0);
});

// ---- roles, leaving, and the last owner ------------------------------------------------------------------------------
test('only owners change roles or remove people; anyone may leave', async () => {
  assert.equal(await changed(P.dan, `update arch.practice_member set role='owner' where practice_id=$1 and user_id=$2`, [practiceA, P.dan.id]), 0);
  assert.equal(await changed(P.carol, `update arch.practice_member set role='member' where practice_id=$1 and user_id=$2`, [practiceA, P.carol.id]), 0);
  assert.equal(await changed(P.dan, `delete from arch.practice_member where practice_id=$1 and user_id=$2`, [practiceA, P.carol.id]), 0, 'a member cannot remove someone else');
  assert.equal(await changed(P.bob, `delete from arch.practice_member where practice_id=$1`, [practiceA]), 0);
  assert.equal(await changed(P.alice, `update arch.practice_member set role='viewer' where practice_id=$1 and user_id=$2`, [practiceA, P.eve.id]), 1);
  assert.equal(await roleOf(P.eve, practiceA), 'viewer');
  assert.equal(await changed(P.eve, `delete from arch.practice_member where practice_id=$1 and user_id=$2`, [practiceA, P.eve.id]), 1, 'eve leaves');
  assert.equal(await roleOf(P.eve, practiceA), null);
});

test('the last owner cannot be removed, demoted or leave; with a second owner, the first can', async () => {
  const own = [practiceA, P.alice.id];
  await refused(signed(P.alice, () => q(`delete from arch.practice_member where practice_id=$1 and user_id=$2`, own)), /at least one owner/);
  await refused(signed(P.alice, () => q(`update arch.practice_member set role='member' where practice_id=$1 and user_id=$2`, own)), /at least one owner/);
  await refused(signed(P.alice, () => q(`update arch.practice_member set role='viewer' where practice_id=$1 and user_id=$2`, own)), /at least one owner/);
  // moving the owner row to another practice is also a way of leaving
  await refused(q(`update arch.practice_member set practice_id=$3 where practice_id=$1 and user_id=$2`, [...own, practiceB]), /at least one owner/);
  // nobody is exempt: the server-side key and the database owner are held to it too
  await refused(asRole('service_role', () => q(`delete from arch.practice_member where practice_id=$1 and user_id=$2`, own)), /at least one owner/);
  await refused(q(`update arch.practice_member set role='member' where practice_id=$1 and user_id=$2`, own), /at least one owner/);
  // deleting the account of a practice's only owner is refused as well (the row would go with it)
  await refused(q(`delete from auth.users where id=$1`, [P.alice.id]), /at least one owner/);
  assert.equal(await roleOf(P.alice, practiceA), 'owner');

  // name a second owner; now the first may step down, and then the second is the last
  await signed(P.alice, () => q(`insert into arch.practice_member (practice_id,user_id,role) values ($1,$2,'owner')`, [practiceA, P.kim.id]));
  assert.equal(await changed(P.alice, `update arch.practice_member set role='member' where practice_id=$1 and user_id=$2`, own), 1);
  await refused(signed(P.kim, () => q(`delete from arch.practice_member where practice_id=$1 and user_id=$2`, [practiceA, P.kim.id])), /at least one owner/);
  await refused(signed(P.kim, () => q(`update arch.practice_member set role='viewer' where practice_id=$1 and user_id=$2`, [practiceA, P.kim.id])), /at least one owner/);
  // put alice back as owner for the rest of the checks; kim steps down to member
  await signed(P.kim, () => q(`update arch.practice_member set role='owner' where practice_id=$1 and user_id=$2`, own));
  assert.equal(await changed(P.alice, `update arch.practice_member set role='member' where practice_id=$1 and user_id=$2`, [practiceA, P.kim.id]), 1);
  // changing a non-owner is never blocked
  assert.equal(await changed(P.alice, `update arch.practice_member set role='viewer' where practice_id=$1 and user_id=$2`, [practiceA, P.kim.id]), 1);
  assert.equal(await changed(P.alice, `delete from arch.practice_member where practice_id=$1 and user_id=$2`, [practiceA, P.kim.id]), 1);
});

test('an administrator can still delete a whole practice that has no projects', async () => {
  const tmp = (await rows(P.mal, `insert into arch.practice (name) values ('Short lived') returning id`))[0].id;
  assert.equal(await roleOf(P.mal, tmp), 'owner');
  await refused(signed(P.mal, () => q(`delete from arch.practice where id=$1`, [tmp])), /permission denied/); // people cannot
  const r = await q(`delete from arch.practice where id=$1`, [tmp]);
  assert.equal(r.affectedRows, 1);
  assert.equal(await roleOf(P.mal, tmp), null);
});

// the page's source_ref for a sourced item (architecture/js/model.js sourceRef), kept in the source column
const REF = { id: 'ac1011.title', key: 'ac1011', name: 'AC1011 (v23) Lodgement Checklist: Residential', clause: '“General items”', url: 'https://example.org/ac1011.pdf', version: 'December 2025', read: '2026-11-22', council: 'Auckland Council', title: 'Record of title no older than 90 days' };

// ---- checklists, extra, recorded_at -----------------------------------------------------------------------------------
test('checklist items: members write, viewers read only, another practice sees nothing', async () => {
  const id = (await rows(P.dan, `insert into arch.checklist_item (project_id,stage,list,title,document_id,source,edited) values ($1,'detailed','consent','Drawings',$2,$3,true) returning id`,
    [projectA, docA, JSON.stringify(REF)]))[0].id;
  const seen = await rows(P.carol, `select * from arch.checklist_item where id=$1`, [id]);
  assert.equal(seen.length, 1);
  assert.equal(seen[0].status, 'needed');
  assert.equal(seen[0].edited, true);
  assert.deepEqual(seen[0].source, REF, 'the page’s source_ref comes back as it was sent');
  await refused(signed(P.carol, () => q(`insert into arch.checklist_item (project_id,list,title) values ($1,'consent','x')`, [projectA])), /row-level security/);
  assert.equal(await changed(P.carol, `update arch.checklist_item set status='gathered' where id=$1`, [id]), 0);
  assert.equal(await changed(P.carol, `delete from arch.checklist_item where id=$1`, [id]), 0);
  assert.equal((await rows(P.bob, `select * from arch.checklist_item`)).length, 0);
  await refused(signed(P.bob, () => q(`insert into arch.checklist_item (project_id,list,title) values ($1,'consent','x')`, [projectA])), /row-level security/);
  assert.equal(await changed(P.bob, `update arch.checklist_item set title='hijack' where id=$1`, [id]), 0);
  assert.equal(await changed(P.dan, `update arch.checklist_item set status='gathered' where id=$1`, [id]), 1);
  // removing the document clears the link and keeps the item
  await signed(P.dan, () => q(`delete from arch.document where id=$1`, [docA]));
  assert.equal((await rows(P.dan, `select document_id from arch.checklist_item where id=$1`, [id]))[0].document_id, null);
});

test('extra survives a round trip on every kind of record, and must be an object', async () => {
  const extra = { sample: false, source: { name: 'NZIA', clause: '2', url: 'https://example.org', read_on: '2026-11-21' }, edited: true, nested: { a: [1, 2, { b: null }] }, text: 'macrons: Tāmaki' };
  const j = JSON.stringify(extra);
  await signed(P.dan, () => q(`update arch.project set extra=$2 where id=$1`, [projectA, j]));
  const t = (await rows(P.dan, `insert into arch.task (project_id,stage,title,extra,source,edited) values ($1,'concept','Sketch',$2,$3,true) returning id`, [projectA, j, JSON.stringify(extra.source)]))[0].id;
  const c = (await rows(P.dan, `insert into arch.checklist_item (project_id,list,title,extra) values ($1,'completion','Manuals',$2) returning id`, [projectA, j]))[0].id;
  const a = (await rows(P.dan, `insert into arch.approval (project_id,stage,who,what,extra) values ($1,'predesign','Dan','Closes Predesign.',$2) returning id`, [projectA, j]))[0].id;
  await signed(P.dan, () => q(`update arch.stage set extra=$2 where project_id=$1 and key='predesign'`, [projectA, j]));
  for (const [table, where, param] of [['project', 'id=$1', projectA], ['task', 'id=$1', t], ['checklist_item', 'id=$1', c], ['approval', 'id=$1', a], ['stage', `project_id=$1 and key='predesign'`, projectA]]) {
    const back = (await rows(P.carol, `select extra from arch.${table} where ${where}`, [param]))[0].extra; // read by a different person
    assert.deepEqual(back, extra, table);
  }
  const task = (await rows(P.carol, `select source, edited from arch.task where id=$1`, [t]))[0];
  assert.deepEqual(task, { source: extra.source, edited: true });
  // rows that never set it get an empty object, not null
  assert.deepEqual((await q(`select extra from arch.practice where id=$1`, [practiceA])).rows[0].extra, {});
  for (const bad of ['[1,2]', '"text"', '5']) {
    await refused(signed(P.dan, () => q(`update arch.task set extra=$2 where id=$1`, [t, bad])), /check constraint/);
  }
  await refused(signed(P.dan, () => q(`update arch.task set extra=null where id=$1`, [t])), /not-null|null value/);
});

test('recorded_at is the database’s own clock, whatever the sender says; approvals stay append-only', async () => {
  const r = (await rows(P.dan, `insert into arch.approval (project_id,stage,who,what,at,recorded_at) values ($1,'concept','Dan','Closes Concept design.','2020-01-01T00:00:00Z','2020-01-01T00:00:00Z') returning id, at, recorded_at`, [projectA]))[0];
  assert.equal(new Date(r.at).getUTCFullYear(), 2020, 'the time the page sent is kept as sent');
  assert.ok(Date.now() - new Date(r.recorded_at).getTime() < 60000, 'the database stamped its own time');
  const v = (await rows(P.dan, `insert into arch.activity (project_id,action,recorded_at) values ($1,'x','2020-01-01T00:00:00Z') returning recorded_at`, [projectA]))[0];
  assert.ok(Date.now() - new Date(v.recorded_at).getTime() < 60000);
  await refused(signed(P.dan, () => q(`update arch.approval set recorded_at=now() where id=$1`, [r.id])), /permission denied/);
  await refused(q(`update arch.approval set extra='{"x":1}' where id=$1`, [r.id]), /append-only/);
  // adding the same entry twice is harmless and changes nothing (the page relies on this when it saves a whole project)
  await signed(P.dan, () => q(`insert into arch.approval (id,project_id,stage,who,what) values ($1,$2,'concept','Someone else','changed') on conflict (id) do nothing`, [r.id, projectA]));
  assert.equal((await q(`select who from arch.approval where id=$1`, [r.id])).rows[0].who, 'Dan');
});

// ---- files -------------------------------------------------------------------------------------------------------------
const put = (p, name) => signed(p, () => q(`insert into storage.objects (bucket_id, name, owner_id) values ('arch-files', $1, $2) returning id`, [name, p.id]));

test('files: members add and read, viewers read only, another practice and anon get nothing', async () => {
  const key = `${practiceA}/${projectA}/${uid(500)}`;
  assert.equal((await put(P.dan, key)).rows.length, 1, 'a member adds a file');
  assert.equal((await put(P.alice, `${practiceA}/practice/${uid(501)}`)).rows.length, 1, 'an owner adds a file');
  // read
  for (const p of [P.alice, P.dan, P.carol]) assert.equal((await rows(p, `select name from storage.objects where bucket_id='arch-files'`)).length, 2, p.email);
  for (const p of [P.bob, P.mal, P.eve]) assert.equal((await rows(p, `select name from storage.objects`)).length, 0, `${p.email} sees no files`);
  assert.equal((await asRole('anon', () => q(`select name from storage.objects`))).rows.length, 0, 'anon sees no files');
  // a viewer cannot add, replace or remove
  await refused(put(P.carol, `${practiceA}/${projectA}/${uid(502)}`), /row-level security/);
  assert.equal(await changed(P.carol, `update storage.objects set metadata='{"x":1}' where name=$1`, [key]), 0);
  assert.equal(await changed(P.carol, `delete from storage.objects where name=$1`, [key]), 0);
  // another practice cannot add into this practice's folder, move a file out of it, or remove one
  await refused(put(P.bob, `${practiceA}/${projectA}/${uid(503)}`), /row-level security/);
  assert.equal(await changed(P.bob, `update storage.objects set name=$2 where name=$1`, [key, `${practiceB}/stolen`]), 0);
  assert.equal(await changed(P.bob, `delete from storage.objects where name=$1`, [key]), 0);
  await refused(asRole('anon', () => q(`insert into storage.objects (bucket_id, name) values ('arch-files', $1)`, [`${practiceA}/x`])), /row-level security/);
  // a member cannot move a file into another practice's folder, or into another bucket
  await refused(signed(P.dan, () => q(`update storage.objects set name=$2 where name=$1`, [key, `${practiceB}/dumped`])), /row-level security/);
  await q(`insert into storage.buckets (id, name) values ('someone-elses', 'someone-elses') on conflict do nothing`);
  await refused(signed(P.dan, () => q(`update storage.objects set bucket_id='someone-elses' where name=$1`, [key])), /row-level security/);
  // bob can use his own practice's folder
  assert.equal((await put(P.bob, `${practiceB}/practice/${uid(504)}`)).rows.length, 1);
  assert.equal((await rows(P.bob, `select name from storage.objects`)).length, 1);
  assert.equal((await rows(P.dan, `select name from storage.objects`)).length, 2);
  // a member replaces and removes
  assert.equal(await changed(P.dan, `update storage.objects set metadata='{"size":3}' where name=$1`, [key]), 1);
  assert.equal(await changed(P.dan, `delete from storage.objects where name=$1`, [key]), 1);
});

test('a path that does not begin with a practice id gives nobody access, and never raises an error', async () => {
  for (const name of ['loose.pdf', 'not-a-uuid/file', '', `${practiceA.toUpperCase()}/x`, `/${practiceA}/x`, `${practiceA}`.slice(0, 35) + '/x', '../' + practiceA + '/x']) {
    await refused(put(P.alice, name), /row-level security/);
  }
  assert.equal((await q(`select arch.path_practice($1) as p`, [`${practiceA}/a/b`])).rows[0].p, practiceA);
  assert.equal((await q(`select arch.path_practice('nonsense/a') as p`)).rows[0].p, null);
  assert.equal((await q(`select arch.path_practice(null) as p`)).rows[0].p, null);
  // objects in other buckets are not opened up by these rules, and reading across buckets does not fail
  await q(`insert into storage.objects (bucket_id, name) values ('someone-elses', 'odd name with no folder'), ('someone-elses', $1)`, [`${practiceA}/looks-like-ours`]);
  assert.equal((await rows(P.alice, `select name from storage.objects where bucket_id='someone-elses'`)).length, 0);
  await refused(signed(P.alice, () => q(`insert into storage.objects (bucket_id, name) values ('someone-elses', $1)`, [`${practiceA}/x`])), /row-level security/);
  assert.ok((await rows(P.alice, `select name from storage.objects`)).length >= 1);
});

test('file records follow the same rules, and must sit inside their own practice', async () => {
  // the shape the page sends (architecture/js/cloud.js putFile): the note's owner_kind and owner_id, the path made of ids only
  const add = `insert into arch.file (id,practice_id,project_id,owner_kind,owner_id,name,mime,size,storage_path) values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id`;
  const path = (pr, pj, f) => `${pr}/${pj}/${f}`, doc = uid(700);
  const id = (await rows(P.dan, add, [uid(600), practiceA, projectA, 'document', doc, 'Plans.pdf', 'application/pdf', 1234, path(practiceA, projectA, uid(600))]))[0].id;
  const seen = (await rows(P.carol, `select name, size, owner_kind, owner_id, created_by, extra from arch.file where id=$1`, [id]))[0];
  assert.deepEqual(seen, { name: 'Plans.pdf', size: 1234, owner_kind: 'document', owner_id: doc, created_by: P.dan.id, extra: {} });
  // a project's plan model: its owner is the project itself
  assert.equal((await rows(P.dan, add, [uid(610), practiceA, projectA, 'model', projectA, 'house.plan.json', 'application/json', 16, path(practiceA, projectA, uid(610))])).length, 1);
  await refused(signed(P.dan, () => q(add, [uid(611), practiceA, projectA, 'model', doc, 'x.json', null, 1, path(practiceA, projectA, uid(611))])), /file_model_is_project|check constraint/);
  await refused(signed(P.dan, () => q(add, [uid(612), practiceA, projectA, 'invoice', doc, 'x', null, 1, path(practiceA, projectA, uid(612))])), /check constraint/);
  await refused(signed(P.dan, () => q(add, [uid(613), practiceA, null, 'document', doc, 'x', null, 1, `${practiceA}/practice/${uid(613)}`])), /row-level security|null value/);
  await refused(q(add, [uid(613), practiceA, null, 'document', doc, 'x', null, 1, `${practiceA}/practice/${uid(613)}`]), /null value/); // every file belongs to a project, even when written by the database owner
  // the path is exactly <practice>/<project>/<file id>: no file name, no other folder
  await refused(signed(P.dan, () => q(add, [uid(614), practiceA, projectA, 'document', doc, 'x', null, 1, `${practiceA}/${projectA}/Plans.pdf`])), /file_path_is_ids|check constraint/);
  await refused(signed(P.dan, () => q(add, [uid(615), practiceA, projectA, 'document', doc, 'x', null, 1, path(practiceA, projectA, uid(699))])), /file_path_is_ids|check constraint/);
  assert.equal((await rows(P.bob, `select * from arch.file`)).length, 0);
  await refused(signed(P.carol, () => q(add, [uid(601), practiceA, projectA, 'document', doc, 'x', null, 1, path(practiceA, projectA, uid(601))])), /row-level security/);
  assert.equal(await changed(P.carol, `delete from arch.file where id=$1`, [id]), 0);
  await refused(signed(P.bob, () => q(add, [uid(602), practiceA, projectA, 'document', doc, 'x', null, 1, path(practiceA, projectA, uid(602))])), /row-level security/);
  // the path must begin with the record's own practice; the project must belong to it; the uploader is the signed-in person
  await refused(signed(P.dan, () => q(add, [uid(603), practiceA, projectA, 'document', doc, 'x', null, 1, path(practiceB, projectA, uid(603))])), /file_path_in_practice|check constraint/);
  await refused(signed(P.bob, () => q(add, [uid(604), practiceB, projectA, 'document', doc, 'x', null, 1, path(practiceB, projectA, uid(604))])), /row-level security/);
  await refused(signed(P.dan, () => q(`insert into arch.file (id,practice_id,project_id,owner_kind,owner_id,name,storage_path,created_by) values ($1,$2,$3,'document',$4,'x',$5,$6)`, [uid(605), practiceA, projectA, doc, path(practiceA, projectA, uid(605)), P.alice.id])), /row-level security/);
  assert.equal(await changed(P.dan, `delete from arch.file where id=$1`, [id]), 1);
  assert.equal(await changed(P.dan, `delete from arch.file where id=$1`, [uid(610)]), 1);
  // a project with files cannot be deleted until its files are removed (the page removes them first)
  const spare = (await rows(P.dan, `insert into arch.project (practice_id,name) values ($1,'Spare') returning id`, [practiceA]))[0].id;
  await rows(P.dan, add, [uid(620), practiceA, spare, 'model', spare, 'm.json', null, 1, path(practiceA, spare, uid(620))]);
  await refused(signed(P.alice, () => q(`delete from arch.project where id=$1`, [spare])), /foreign key|violates/);
  assert.equal(await changed(P.dan, `delete from arch.file where id=$1`, [uid(620)]), 1);
  assert.equal(await changed(P.alice, `delete from arch.project where id=$1`, [spare]), 1);
});

test('data survives a third run of the migrations', async () => {
  const before = (await q(`select (select count(*) from arch.practice_member)::int m, (select count(*) from arch.invitation)::int i, (select count(*) from arch.checklist_item)::int c, (select count(*) from storage.objects)::int o`)).rows[0];
  await applyAll();
  const after = (await q(`select (select count(*) from arch.practice_member)::int m, (select count(*) from arch.invitation)::int i, (select count(*) from arch.checklist_item)::int c, (select count(*) from storage.objects)::int o`)).rows[0];
  assert.deepEqual(after, before);
  assert.ok(before.m >= 4 && before.c >= 2);
});

test('rows read back in the order they were added, also when many arrive in one request', async () => {
  // the API adds many rows with one statement that reads them from a JSON list: do the same here
  const titles = Array.from({ length: 40 }, (_, i) => `Step ${String(i).padStart(2, '0')}`);
  const body = JSON.stringify(titles.map((title) => ({ project_id: projectA, stage: 'concept', title })));
  await signed(P.dan, () => q(`insert into arch.task (project_id, stage, title) select project_id, stage, title from json_populate_recordset(null::arch.task, $1::json)`, [body]));
  const back = (await rows(P.carol, `select title from arch.task where project_id=$1 and title like 'Step %' order by seq`, [projectA])).map((r) => r.title);
  assert.deepEqual(back, titles);
  // changing a row does not move it, and the sender cannot choose the number
  await signed(P.dan, () => q(`update arch.task set status='done' where title='Step 03'`));
  assert.deepEqual((await rows(P.carol, `select title from arch.task where project_id=$1 and title like 'Step %' order by seq`, [projectA])).map((r) => r.title), titles);
  await refused(signed(P.dan, () => q(`insert into arch.task (project_id, title, seq) values ($1, 'first in line', 0)`, [projectA])), /generated always|cannot insert/);
});
