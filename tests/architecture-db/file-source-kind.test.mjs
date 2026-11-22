// Part (20261123100000_arch_file_source_kind.sql): a file can be owned as a site source. owner_kind 'source' is allowed,
// its owner must be the project itself (as for a model), and everything that was allowed before still is. On PGlite with the
// stand-ins for Supabase. Not Supabase, and no network.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';

const here = path.dirname(fileURLToPath(import.meta.url));
const migDir = path.resolve(here, '../../supabase/migrations');
const all = readdirSync(migDir).filter((f) => /^\d+_arch_.*\.sql$/.test(f)).sort();
const SRC = '20261123100000_arch_file_source_kind.sql';
const uid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

let db;
const q = (sql, params) => db.query(sql, params);
const run = async (files) => { for (const f of files) await db.exec(readFileSync(path.join(migDir, f), 'utf8')); };
before(async () => {
  db = new PGlite();
  await db.exec(readFileSync(path.join(here, 'standins.sql'), 'utf8'));
  await run(all.filter((f) => f < SRC));
});
after(async () => { await db.close(); });

const practice = uid(1), project = uid(2);
const add = `insert into arch.file (id,practice_id,project_id,owner_kind,owner_id,name,storage_path,created_by) values ($1,$2,$3,$4,$5,'x',$6,$7)`;
const put = (n, kind, owner) => q(add, [uid(n), practice, project, kind, owner, `${practice}/${project}/${uid(n)}`, uid(9)]);
async function seed() {
  await q(`insert into auth.users (id) values ($1) on conflict do nothing`, [uid(9)]).catch(() => {});
  await q(`insert into arch.practice (id, name, created_by) values ($1, 'P', $2) on conflict do nothing`, [practice, uid(9)]).catch(async () => { await q(`insert into arch.practice (id, name) values ($1, 'P') on conflict do nothing`, [practice]); });
  await q(`insert into arch.project (id, practice_id, name) values ($1, $2, 'J') on conflict do nothing`, [project, practice]);
}

test('it comes after the files table was made', () => {
  assert.ok(all.includes(SRC));
  assert.ok(all.indexOf(SRC) > all.indexOf('20261122100200_arch_files_storage.sql'));
});

test('before it, a source is refused; after it, a source owned by its project is kept, and a stranger-owned one is not', async () => {
  await seed();
  await assert.rejects(put(10, 'source', project), /check constraint/);
  await run([SRC]);
  await put(11, 'source', project);
  await assert.rejects(put(12, 'source', uid(77)), /file_source_is_project|check constraint/);
  await assert.rejects(put(13, 'invoice', project), /check constraint/);
});

test('what was allowed before still is, with its own rule', async () => {
  await put(14, 'document', uid(78));
  await put(15, 'model', project);
  await assert.rejects(put(16, 'model', uid(78)), /file_model_is_project|check constraint/);
});

test('run twice: one owner_kind rule, one source rule, no errors', async () => {
  await run([SRC]);
  const rows = (await q(`select conname from pg_constraint where conrelid = 'arch.file'::regclass and contype = 'c' and conname like 'file_%' order by 1`)).rows.map((r) => r.conname);
  assert.deepEqual(rows.filter((n) => /owner_kind|source|model/.test(n)), ['file_model_is_project', 'file_owner_kind_ok', 'file_source_is_project']);
  await put(17, 'source', project);
});
