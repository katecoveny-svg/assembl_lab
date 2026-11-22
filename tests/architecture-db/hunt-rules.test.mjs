// Local dry run of arch.hunt_rules on PGlite, with stand-ins for Supabase's auth schema and the radar's kb tables. Not Supabase, no network.
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
const ALICE = uid(1), CAROL = uid(3), EVE = uid(5);
const SRC = 'NZ Parliament — Bills API';
let db, practiceA, practiceB;
const q = (sql, params) => db.query(sql, params);
async function as(role, id, fn) {
  await db.exec(`set role ${role}`);
  if (id) await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [id]);
  try { return await fn(); } finally { await db.exec('reset role'); await db.query(`select set_config('request.jwt.claim.sub', '', false)`); }
}
const user = (id, fn) => as('authenticated', id, fn);
const uuidN = (n) => `${String(n).padStart(8, '0')}-0000-4000-8000-000000000000`;

before(async () => {
  db = new PGlite();
  await db.exec(readFileSync(path.join(here, 'standins.sql'), 'utf8'));
  await db.exec(`
    create table public.kb_sources (id uuid primary key default gen_random_uuid(), name text, category text, authority_tier smallint, active boolean default true);
    create table public.kb_documents (id uuid primary key default gen_random_uuid(), source_id uuid references public.kb_sources(id), title text, url text, content text, metadata jsonb, published_at timestamptz, inserted_at timestamptz default now());`);
  const src = async (name, category, active = true) => (await q(`insert into public.kb_sources (name, category, authority_tier, active) values ($1,$2,1,$3) returning id`, [name, category, active])).rows[0].id;
  const bills = await src(SRC, 'regulatory_horizon'), members = await src('NZ Parliament — Proposed Members Bills', 'regulatory_signal'), news = await src('RNZ — Top stories', 'news'), off = await src(SRC, 'regulatory_horizon', false);
  let n = 0;
  const doc = (s, title, ago, stage = 'Select Committee', status = 'Active', url = null) => q(`insert into public.kb_documents (source_id, title, url, content, metadata, published_at, inserted_at) values ($1,$2,$3,$4,$5, now() - ($6 || ' days')::interval, now())`,
    [s, title, url ?? `https://bills.parliament.nz/v/6/${uuidN(++n)}`, '{\n  "title": "' + 'S'.repeat(900), JSON.stringify({ bill_status: status, current_stage: stage, secret_note: 'x' }), String(ago)]);
  await doc(bills, 'Building Amendment Bill', 20);
  await doc(bills, 'Planning Bill', 40, 'Royal Assent', 'Terminated');
  await doc(bills, 'Resource Management (Duration of Consents) Amendment Bill', 300, 'Royal Assent', 'Terminated');
  await doc(bills, 'Local Government (Rates Capping) Amendment Bill', 5);
  await doc(bills, 'Post-settlement Governance Entities (Exemption from Jurisdiction of Māori Land Court) Bill', 9, 'First Reading');
  await doc(bills, 'Summary Offences (Move-on Orders) Amendment Bill', 3); // not the built environment: never returned
  await doc(bills, 'Education and Training Amendment Bill (No 2)', 500, 'Royal Assent', 'Terminated'); // a year and a half old
  await doc(bills, 'Planning (Very Old) Bill', 900); // beyond 730 days: never
  await doc(bills, 'Building Elsewhere Bill', 2, 'Select Committee', 'Active', 'https://evil.example/v/6/x'); // not a bills.parliament.nz link
  await doc(members, 'Housing Members Bill', 2); await doc(news, 'New school building opens', 1); await doc(off, 'Heritage Paused Bill', 1);
  await q(`insert into auth.users (id, email) values ($1,'alice@x'),($2,'carol@x'),($3,'eve@x')`, [ALICE, CAROL, EVE]);
  for (const f of migrations) await db.exec(readFileSync(path.join(migDir, f), 'utf8'));
  practiceA = (await user(ALICE, () => q(`insert into arch.practice (name, created_by) values ('A', $1) returning id`, [ALICE]))).rows[0].id;
  practiceB = (await user(EVE, () => q(`insert into arch.practice (name, created_by) values ('B', $1) returning id`, [EVE]))).rows[0].id;
  await user(ALICE, () => q(`insert into arch.practice_member (practice_id,user_id,role) values ($1,$2,'viewer')`, [practiceA, CAROL]));
});
after(async () => { await db.close(); });

test('the migration is present, and applies a second time without error or change', async () => {
  assert.ok(migrations.includes('20261122150000_arch_hunt_rules.sql'));
  const sql = readFileSync(path.join(migDir, '20261122150000_arch_hunt_rules.sql'), 'utf8');
  await db.exec(sql); await db.exec(sql);
  assert.equal((await q(`select count(*)::int n from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='arch' and p.proname='hunt_rules'`)).rows[0].n, 1);
});
test('members, a viewer included, get built-environment bills from the Bills API source in the last year, newest first; nothing else', async () => {
  for (const who of [ALICE, CAROL]) {
    const r = (await user(who, () => q(`select * from arch.hunt_rules($1, null)`, [practiceA]))).rows;
    assert.deepEqual(r.map((x) => x.title), ['Local Government (Rates Capping) Amendment Bill', 'Post-settlement Governance Entities (Exemption from Jurisdiction of Māori Land Court) Bill', 'Building Amendment Bill', 'Planning Bill', 'Resource Management (Duration of Consents) Amendment Bill'],
      'the unrelated bill, the members\' source, news, the paused source, the 500-day-old and 900-day-old ones and the off-site link are left out');
    assert.deepEqual([...new Set(r.map((x) => x.source))], [SRC]); assert.ok(r.every((x) => x.url.startsWith('https://bills.parliament.nz/')));
  }
});
test('it returns the title, link, day, source, status and stage, and a snippet of at most 200 characters for ranking: no other column, never the full text or other metadata', async () => {
  const r = (await user(ALICE, () => q(`select * from arch.hunt_rules($1, null) where title = 'Planning Bill'`, [practiceA]))).rows[0];
  assert.deepEqual(Object.keys(r).sort(), ['bill_status', 'current_stage', 'id', 'published_at', 'snippet', 'source', 'title', 'url']);
  assert.equal(r.bill_status, 'Terminated'); assert.equal(r.current_stage, 'Royal Assent'); assert.equal(r.snippet.length, 200); assert.ok(!JSON.stringify(r).includes('secret_note'));
  assert.ok((await user(ALICE, () => q(`select max(length(snippet))::int m from arch.hunt_rules($1, null)`, [practiceA]))).rows[0].m <= 200);
});
test('a longer window is capped at 730 days; a shorter one narrows', async () => {
  const n = async (since) => (await user(ALICE, () => q(`select count(*)::int n from arch.hunt_rules($1, ${since})`, [practiceA]))).rows[0].n;
  assert.equal(await n(`now() - interval '2000 days'`), 6, 'the 500-day bill comes in too; the 900-day one never does');
  assert.equal(await n(`now() - interval '1 hour'`), 0); assert.equal(await n('null'), 5, 'the default is a year');
});
test('someone outside the practice, a member of another, and anon are refused', async () => {
  await assert.rejects(user(EVE, () => q(`select * from arch.hunt_rules($1, null)`, [practiceA])), /Only members of this practice/);
  await assert.rejects(user(CAROL, () => q(`select * from arch.hunt_rules($1, null)`, [practiceB])), /Only members of this practice/);
  await assert.rejects(as('anon', null, () => q(`select * from arch.hunt_rules($1, null)`, [practiceA])), /permission denied/);
  await assert.rejects(as('authenticated', null, () => q(`select * from arch.hunt_rules($1, null)`, [practiceA])), /Only members/);
});
test('at most 200 rows, security definer with an empty search path, authenticated only, and it writes nothing', async () => {
  const s = (await q(`select id from public.kb_sources where name = $1 and active`, [SRC])).rows[0].id;
  await q(`insert into public.kb_documents (source_id, title, url, content, metadata, inserted_at, published_at) select $1, 'Building Bill ' || g, 'https://bills.parliament.nz/v/6/' || lpad(g::text, 8, '0') || '-1111-4111-8111-111111111111', 'x', '{}', now(), now() - (g || ' minutes')::interval from generate_series(1, 300) g`, [s]);
  assert.equal((await user(ALICE, () => q(`select count(*)::int n from arch.hunt_rules($1, null)`, [practiceA]))).rows[0].n, 200);
  const before = (await q(`select count(*)::int n from public.kb_documents`)).rows[0].n; await user(ALICE, () => q(`select * from arch.hunt_rules($1, null)`, [practiceA]));
  assert.equal((await q(`select count(*)::int n from public.kb_documents`)).rows[0].n, before);
  const f = (await q(`select prosecdef, provolatile, proconfig, has_function_privilege('anon','arch.hunt_rules(uuid,timestamptz)','execute') anon, has_function_privilege('authenticated','arch.hunt_rules(uuid,timestamptz)','execute') auth, has_function_privilege('public','arch.hunt_rules(uuid,timestamptz)','execute') pub from pg_proc where proname='hunt_rules'`)).rows[0];
  assert.equal(f.prosecdef, true); assert.equal(f.provolatile, 's'); assert.deepEqual(f.proconfig, ['search_path=""']); assert.equal(f.anon, false); assert.equal(f.pub, false); assert.equal(f.auth, true);
});
test('its security is the same as hunt_leads: same checks, same grants, same settings', () => {
  const a = readFileSync(path.join(migDir, '20261122140000_arch_hunt_leads.sql'), 'utf8'), b = readFileSync(path.join(migDir, '20261122150000_arch_hunt_rules.sql'), 'utf8');
  for (const line of ['language plpgsql', 'stable', 'security definer', "set search_path = ''", 'if auth.uid() is null or not arch.is_member(p_practice) then', "using errcode = '42501';"]) { assert.ok(a.includes(line), `leads: ${line}`); assert.ok(b.includes(line), `rules: ${line}`); }
  assert.ok(b.includes('revoke all on function arch.hunt_rules(uuid, timestamptz) from public, anon, authenticated;')); assert.ok(b.includes('grant execute on function arch.hunt_rules(uuid, timestamptz) to authenticated;'));
  assert.ok(!/\b(insert|update|delete)\b\s+(into|from)?\s*public/i.test(b.split('as $$')[1] ?? ''), 'it writes nothing');
});
