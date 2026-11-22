// Part 7 (20261122120000_arch_files_bucket_limit.sql): the arch-files bucket takes files up to 1 GB, stays private, and
// nothing else changes. On PGlite with the stand-ins for Supabase's storage tables. Not Supabase, and no network.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';

const here = path.dirname(fileURLToPath(import.meta.url));
const migDir = path.resolve(here, '../../supabase/migrations');
const all = readdirSync(migDir).filter((f) => /^\d+_arch_.*\.sql$/.test(f)).sort();
const LIMIT = '20261122120000_arch_files_bucket_limit.sql';
const GB = 1073741824, MB50 = 52428800;

let db;
const q = (sql, params) => db.query(sql, params);
const run = async (files) => { for (const f of files) await db.exec(readFileSync(path.join(migDir, f), 'utf8')); };
const bucket = async () => (await q(`select id, public, file_size_limit from storage.buckets where id = 'arch-files'`)).rows[0] ?? null;
async function shape() {
  return (await q(`select
      (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname='arch' and c.relkind='r')::int as tables,
      (select count(*) from information_schema.columns where table_schema='arch')::int as columns,
      (select count(*) from pg_policies where schemaname='arch')::int as policies,
      (select count(*) from pg_policies where schemaname='storage')::int as storage_policies,
      (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='arch')::int as functions,
      (select count(*) from storage.buckets)::int as buckets`)).rows[0];
}
async function fresh() {
  if (db) await db.close();
  db = new PGlite();
  await db.exec(readFileSync(path.join(here, 'standins.sql'), 'utf8'));
}
before(fresh);
after(async () => { await db.close(); });

test('part 7 is there, and comes after the bucket was made', () => {
  assert.ok(all.includes(LIMIT));
  assert.ok(all.indexOf(LIMIT) > all.indexOf('20261122100200_arch_files_storage.sql'));
});

test('after part 6 the bucket takes 50 MB; part 7 raises it to 1 GB, keeps it private, and changes nothing else', async () => {
  const upTo6 = all.filter((f) => f < LIMIT);
  await run(upTo6);
  assert.deepEqual(await bucket(), { id: 'arch-files', public: false, file_size_limit: MB50 });
  const before = await shape();
  await run([LIMIT]);
  assert.deepEqual(await bucket(), { id: 'arch-files', public: false, file_size_limit: GB });
  assert.deepEqual(await shape(), before, 'no table, column, rule or function is added or removed');
});

test('run twice, and with every migration again: the same', async () => {
  const first = { b: await bucket(), s: await shape() };
  await run([LIMIT]);
  await run(all);
  assert.deepEqual({ b: await bucket(), s: await shape() }, first);
});

test('a bucket made public by hand is made private again', async () => {
  await q(`update storage.buckets set public = true, file_size_limit = 10 where id = 'arch-files'`);
  await run([LIMIT]);
  assert.deepEqual(await bucket(), { id: 'arch-files', public: false, file_size_limit: GB });
});

test('other buckets are left alone', async () => {
  await q(`insert into storage.buckets (id, name, public, file_size_limit) values ('someone-elses', 'someone-elses', true, 1000) on conflict do nothing`);
  await run([LIMIT]);
  assert.deepEqual((await q(`select public, file_size_limit from storage.buckets where id = 'someone-elses'`)).rows[0], { public: true, file_size_limit: 1000 });
  await q(`delete from storage.buckets where id = 'someone-elses'`);
});

test('applied before part 6 (out of order): the bucket is made with the new limit, and part 6 keeps it', async () => {
  await fresh();
  await run(all.filter((f) => f < '20261122100200'));
  await run([LIMIT]);
  assert.deepEqual(await bucket(), { id: 'arch-files', public: false, file_size_limit: GB });
  await run(all);
  assert.deepEqual(await bucket(), { id: 'arch-files', public: false, file_size_limit: GB });
});
