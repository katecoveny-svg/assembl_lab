// Local dry run of arch.hunt_leads on PGlite, with stand-ins for Supabase's auth schema and the radar's kb tables. Not Supabase, no network.
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
let db, practiceA, practiceB;
const q = (sql, params) => db.query(sql, params);
async function as(role, id, fn) {
  await db.exec(`set role ${role}`);
  if (id) await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [id]);
  try { return await fn(); } finally { await db.exec('reset role'); await db.query(`select set_config('request.jwt.claim.sub', '', false)`); }
}
const user = (id, fn) => as('authenticated', id, fn);

before(async () => {
  db = new PGlite();
  await db.exec(readFileSync(path.join(here, 'standins.sql'), 'utf8'));
  await db.exec(`
    create table public.kb_sources (id uuid primary key default gen_random_uuid(), name text, category text, authority_tier smallint, active boolean default true);
    create table public.kb_documents (id uuid primary key default gen_random_uuid(), source_id uuid references public.kb_sources(id), title text, url text, content text, published_at timestamptz, inserted_at timestamptz default now());`);
  const src = async (name, category, active = true) => (await q(`insert into public.kb_sources (name, category, authority_tier, active) values ($1,$2,1,$3) returning id`, [name, category, active])).rows[0].id;
  const rnz = await src('RNZ — Top stories', 'news'), stuff = await src('Stuff — Top stories', 'news'), blog = await src('The Daily Blog', 'media'), room = await src('Newsroom NZ', 'media');
  const herald = await src('NZ Herald — Business', 'news'), gets = await src('GETS — Government tenders', 'tenders'), off = await src('Newsroom NZ', 'media', false);
  const doc = (s, title, content, ago = 1, pub = true) => q(`insert into public.kb_documents (source_id, title, url, content, published_at, inserted_at) values ($1,$2,$3,$4, ${pub ? `now() - ($5 || ' days')::interval` : 'null'}, now() - ($5 || ' days')::interval)`, [s, title, `https://www.rnz.co.nz/news/${Math.floor(Math.random() * 1e6)}`, content, String(ago)]);
  await doc(rnz, 'New library for Hamilton', 'S'.repeat(900), 2);
  await doc(stuff, 'Marae damaged by fire', 'short summary', 10);
  await doc(blog, 'Housing policy rant', 'x', 25);
  await doc(room, 'Hall to be rebuilt', 'y', 40, false);
  await doc(rnz, 'Old school hall reopens', 'z', 59);
  await doc(rnz, 'Far too old library story', 'z', 90);
  await doc(rnz, 'All Blacks lose in Dublin', 'z', 2); // no building or place in the headline: never returned
  await doc(herald, 'Not one of the four sources', 'x', 1);
  await doc(gets, 'A tender', 'x', 1);
  await doc(off, 'From a paused source', 'x', 1);
  await q(`insert into auth.users (id, email) values ($1,'alice@x'),($2,'carol@x'),($3,'eve@x')`, [ALICE, CAROL, EVE]);
  for (const f of migrations) await db.exec(readFileSync(path.join(migDir, f), 'utf8'));
  practiceA = (await user(ALICE, () => q(`insert into arch.practice (name, created_by) values ('A', $1) returning id`, [ALICE]))).rows[0].id;
  practiceB = (await user(EVE, () => q(`insert into arch.practice (name, created_by) values ('B', $1) returning id`, [EVE]))).rows[0].id;
  await user(ALICE, () => q(`insert into arch.practice_member (practice_id,user_id,role) values ($1,$2,'viewer')`, [practiceA, CAROL]));
});
after(async () => { await db.close(); });

test('the migration applies a second time without error or change', async () => {
  const sql = readFileSync(path.join(migDir, '20261122140000_arch_hunt_leads.sql'), 'utf8');
  await db.exec(sql); await db.exec(sql);
  assert.equal((await q(`select count(*)::int n from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='arch' and p.proname='hunt_leads'`)).rows[0].n, 1);
});

test('members, a viewer included, get stories from the four news sources in the last 30 days, newest first; nothing else', async () => {
  for (const who of [ALICE, CAROL]) {
    const r = (await user(who, () => q(`select * from arch.hunt_leads($1, null)`, [practiceA]))).rows;
    assert.deepEqual(r.map((x) => x.title), ['New library for Hamilton', 'Marae damaged by fire', 'Housing policy rant'], 'the Herald, the tender source, the paused source and the old ones are left out');
    assert.deepEqual([...new Set(r.map((x) => x.source))].sort(), ['RNZ — Top stories', 'Stuff — Top stories', 'The Daily Blog']);
  }
});

test('it returns an id, headline, link, published time, source name and a snippet of at most 200 characters: no other column, never the full text', async () => {
  const r = (await user(ALICE, () => q(`select * from arch.hunt_leads($1, null) where title = 'New library for Hamilton'`, [practiceA]))).rows[0];
  assert.deepEqual(Object.keys(r).sort(), ['id', 'published_at', 'snippet', 'source', 'title', 'url']);
  assert.equal(r.snippet.length, 200); assert.match(r.url, /^https:\/\/www\.rnz\.co\.nz\//);
  const withLong = (await user(ALICE, () => q(`select max(length(snippet))::int m from arch.hunt_leads($1, null)`, [practiceA]))).rows[0].m; assert.ok(withLong <= 200);
});

test('a longer window is capped at 60 days; a shorter one narrows; a story with no published time uses the day it was collected', async () => {
  const n = async (since) => (await user(ALICE, () => q(`select count(*)::int n from arch.hunt_leads($1, ${since})`, [practiceA]))).rows[0].n;
  assert.equal(await n(`now() - interval '400 days'`), 5, 'the 40-day story with no published time (collected 40 days ago) and the 59-day one come in; the 90-day one never does');
  assert.equal(await n(`now() - interval '1 hour'`), 0);
  assert.equal(await n('null'), 3, 'the default is 30 days');
});

test('someone outside the practice, a member of another, and anon are refused', async () => {
  await assert.rejects(user(EVE, () => q(`select * from arch.hunt_leads($1, null)`, [practiceA])), /Only members of this practice/);
  await assert.rejects(user(CAROL, () => q(`select * from arch.hunt_leads($1, null)`, [practiceB])), /Only members of this practice/);
  await assert.rejects(as('anon', null, () => q(`select * from arch.hunt_leads($1, null)`, [practiceA])), /permission denied/);
  await assert.rejects(as('authenticated', null, () => q(`select * from arch.hunt_leads($1, null)`, [practiceA])), /Only members/);
});

test('at most 500 rows, security definer with an empty search path, authenticated only, and it writes nothing', async () => {
  const s = (await q(`select id from public.kb_sources where name = 'Stuff — Top stories'`)).rows[0].id;
  await q(`insert into public.kb_documents (source_id, title, url, content, inserted_at, published_at) select $1, 'New school building ' || g, 'https://www.stuff.co.nz/' || g, 'x', now(), now() - (g || ' minutes')::interval from generate_series(1, 600) g`, [s]);
  assert.equal((await user(ALICE, () => q(`select count(*)::int n from arch.hunt_leads($1, null)`, [practiceA]))).rows[0].n, 500);
  const f = (await q(`select prosecdef, provolatile, proconfig, has_function_privilege('anon','arch.hunt_leads(uuid,timestamptz)','execute') anon, has_function_privilege('authenticated','arch.hunt_leads(uuid,timestamptz)','execute') auth, has_function_privilege('public','arch.hunt_leads(uuid,timestamptz)','execute') pub from pg_proc where proname='hunt_leads'`)).rows[0];
  assert.equal(f.prosecdef, true); assert.equal(f.provolatile, 's'); assert.deepEqual(f.proconfig, ['search_path=""']); assert.equal(f.anon, false); assert.equal(f.pub, false); assert.equal(f.auth, true);
});
