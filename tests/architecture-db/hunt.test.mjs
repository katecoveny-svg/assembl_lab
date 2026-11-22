// Local dry run of arch.hunt_signals on PGlite, with stand-ins for Supabase's auth schema and for the radar's kb tables
// (only the columns the function reads). Not Supabase, no network. Nothing here touches the real database.
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
const ALICE = uid(1), CAROL = uid(3), EVE = uid(5); // owner of A, viewer in A, nobody's member
let db, practiceA, practiceB;
const q = (sql, params) => db.query(sql, params);
async function as(role, id, fn) {
  await db.exec(`set role ${role}`);
  if (id) await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [id]);
  try { return await fn(); } finally { await db.exec('reset role'); await db.query(`select set_config('request.jwt.claim.sub', '', false)`); }
}
const user = (id, fn) => as('authenticated', id, fn);
const body = (org, close, cats, region, overview) => `RFx ID: 1\nOrganisation: ${org}\nOpen date: Friday, 20 November 2026 11:00 AM +13:00\nClose date: ${close}\nCategories: ${cats}\nRegion: ${region}\nOverview: ${overview}`;

before(async () => {
  db = new PGlite();
  await db.exec(readFileSync(path.join(here, 'standins.sql'), 'utf8'));
  // the radar's tables, only the columns the function reads (the real ones have more)
  await db.exec(`
    create table public.kb_sources (id uuid primary key default gen_random_uuid(), name text, category text, authority_tier smallint, active boolean default true);
    create table public.kb_documents (id uuid primary key default gen_random_uuid(), source_id uuid references public.kb_sources(id), title text, url text, content text, published_at timestamptz, inserted_at timestamptz default now());
    create table public.law_notes (id int);`);
  const src = async (name, category, active = true) => (await q(`insert into public.kb_sources (name, category, authority_tier, active) values ($1,$2,1,$3) returning id`, [name, category, active])).rows[0].id;
  const tenders = await src('GETS — Government tenders', 'tenders'), horizon = await src('GETS — Future Procurement Opportunities', 'opportunity_horizon'), law = await src('Some regulator', 'law'), off = await src('Paused tenders', 'tenders', false);
  const doc = (s, title, content, ago = 1) => q(`insert into public.kb_documents (source_id, title, url, content, published_at, inserted_at) values ($1,$2,$3,$4, now() - ($5 || ' days')::interval, now() - ($5 || ' days')::interval)`, [s, title, `https://www.gets.govt.nz//X/ExternalTenderDetails.htm?id=${Math.floor(Math.random() * 1e6)}`, content, String(ago)]);
  await doc(tenders, 'Library Design Services', body('Hamilton City Council', 'Monday, 7 December 2026 5:00 PM +13:00', '81101500 - Civil engineering\n95121700 - Public buildings and structures', 'Waikato', 'Concept to developed design. ' + 'x'.repeat(400)));
  await doc(tenders, 'Old one', body('Old Council', 'Monday, 7 December 2026 5:00 PM +13:00', '72000000 - Building', 'Otago', 'Old.'), 30);
  await doc(tenders, 'Ancient one', 'x', 90);
  await doc(horizon, 'Forward plan', body('Kāinga Ora', 'Friday, 1 January 2027 5:00 PM +13:00', '72000000 - Building', 'Auckland\nWaikato', 'Planned panel.'));
  await doc(law, 'A regulation', 'Not a tender.');
  await doc(off, 'From a paused source', 'x');
  await q(`insert into auth.users (id, email) values ($1,'alice@x'),($2,'carol@x'),($3,'eve@x')`, [ALICE, CAROL, EVE]);
  for (const f of migrations) await db.exec(readFileSync(path.join(migDir, f), 'utf8'));
  practiceA = (await user(ALICE, () => q(`insert into arch.practice (name, created_by) values ('A', $1) returning id`, [ALICE]))).rows[0].id;
  practiceB = (await user(EVE, () => q(`insert into arch.practice (name, created_by) values ('B', $1) returning id`, [EVE]))).rows[0].id;
  await user(ALICE, () => q(`insert into arch.practice_member (practice_id,user_id,role) values ($1,$2,'viewer')`, [practiceA, CAROL]));
});
after(async () => { await db.close(); });

test('the migration applies a second time without error or change', async () => {
  const sql = readFileSync(path.join(migDir, '20261122130000_arch_hunt_signals.sql'), 'utf8');
  await db.exec(sql); await db.exec(sql);
  assert.equal((await q(`select count(*)::int n from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='arch' and p.proname='hunt_signals'`)).rows[0].n, 1);
});

test('members of the practice, a viewer included, get the public tender notices from the last 14 days', async () => {
  for (const who of [ALICE, CAROL]) {
    const r = (await user(who, () => q(`select * from arch.hunt_signals($1, null)`, [practiceA]))).rows;
    assert.deepEqual(r.map((x) => x.title).sort(), ['Forward plan', 'Library Design Services']);
    assert.equal(r.length, 2, 'the regulation, the paused source, and the notices older than 14 days are left out');
    assert.ok(r.every((x) => ['tenders', 'opportunity_horizon'].includes(x.category)));
  }
});

test('it returns the notice\'s buyer, closing date, region, categories and a snippet of at most 200 characters, and nothing longer', async () => {
  const r = (await user(ALICE, () => q(`select * from arch.hunt_signals($1, null) where title = 'Library Design Services'`, [practiceA]))).rows[0];
  assert.equal(r.buyer, 'Hamilton City Council'); assert.equal(r.closes_text, 'Monday, 7 December 2026 5:00 PM +13:00'); assert.equal(r.region, 'Waikato');
  assert.equal(r.categories, '81101500 - Civil engineering 95121700 - Public buildings and structures');
  assert.ok(r.snippet.startsWith('Concept to developed design.')); assert.equal(r.snippet.length, 200);
  assert.match(r.url, /^https:\/\/www\.gets\.govt\.nz\//); assert.equal(r.source, 'GETS — Government tenders');
  assert.deepEqual(Object.keys(r).sort(), ['buyer', 'categories', 'category', 'closes_text', 'id', 'inserted_at', 'published_at', 'region', 'snippet', 'source', 'tier', 'title', 'url']);
  const multi = (await user(ALICE, () => q(`select region from arch.hunt_signals($1, null) where title='Forward plan'`, [practiceA]))).rows[0];
  assert.equal(multi.region, 'Auckland Waikato', 'several regions, one per line in the notice');
});

test('a longer window is capped at 60 days; a shorter one narrows', async () => {
  assert.equal((await user(ALICE, () => q(`select count(*)::int n from arch.hunt_signals($1, now() - interval '400 days')`, [practiceA]))).rows[0].n, 3, 'the 30-day-old notice comes in; the 90-day-old one never does');
  assert.equal((await user(ALICE, () => q(`select count(*)::int n from arch.hunt_signals($1, now() - interval '1 hour')`, [practiceA]))).rows[0].n, 0);
});

test('someone outside the practice, a member of another, and anon are refused; nothing is returned', async () => {
  await assert.rejects(user(EVE, () => q(`select * from arch.hunt_signals($1, null)`, [practiceA])), /Only members of this practice/);
  await assert.rejects(user(CAROL, () => q(`select * from arch.hunt_signals($1, null)`, [practiceB])), /Only members of this practice/);
  await assert.rejects(user(ALICE, () => q(`select * from arch.hunt_signals($1, null)`, [uid(99)])), /Only members/);
  await assert.rejects(as('anon', null, () => q(`select * from arch.hunt_signals($1, null)`, [practiceA])), /permission denied/);
  await assert.rejects(as('authenticated', null, () => q(`select * from arch.hunt_signals($1, null)`, [practiceA])), /Only members/, 'signed in with no identity');
});

test('it is a security definer with an empty search path, executable by authenticated only, and it writes nothing', async () => {
  const f = (await q(`select prosecdef, provolatile, proconfig, has_function_privilege('anon','arch.hunt_signals(uuid,timestamptz)','execute') anon, has_function_privilege('authenticated','arch.hunt_signals(uuid,timestamptz)','execute') auth, has_function_privilege('public','arch.hunt_signals(uuid,timestamptz)','execute') pub from pg_proc where proname='hunt_signals'`)).rows[0];
  assert.equal(f.prosecdef, true); assert.equal(f.provolatile, 's', 'stable: it cannot write'); assert.deepEqual(f.proconfig, ['search_path=""']);
  assert.equal(f.anon, false); assert.equal(f.pub, false); assert.equal(f.auth, true);
  const before = (await q(`select (select count(*) from public.kb_documents) d, (select count(*) from public.kb_sources) s`)).rows[0];
  await user(ALICE, () => q(`select * from arch.hunt_signals($1, null)`, [practiceA]));
  assert.deepEqual((await q(`select (select count(*) from public.kb_documents) d, (select count(*) from public.kb_sources) s`)).rows[0], before);
});
