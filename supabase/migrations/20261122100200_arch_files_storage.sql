-- arch schema, part 6: a practice's files.
-- Additive only. Safe to run twice. Nothing is dropped.
--
-- THIS FILE TOUCHES TWO THINGS OUTSIDE THE arch SCHEMA, because Supabase keeps files there:
--   a. one row in storage.buckets: the private bucket "arch-files";
--   b. four access rules (policies) on storage.objects, each limited to that one bucket.
-- Everything else is in arch.

-- 1. A record for each file: which practice and project it belongs to, the record it is kept for, its name, and where
--    the bytes are kept. The same shape as the page's file note (architecture/js/store.js):
--      owner_kind 'document' (owner_id is the document's id) or 'model' (the project's plan model: owner_id is the project's id).
--    owner_id has no foreign key on purpose: the page keeps a file first and then saves the record that points at it, so
--    a document can still be on its way when its file arrives. created_at is the page's "kept_at".
--    The path is <practice id>/<project id>/<file id>. The file's own name is never part of the path.
create table if not exists arch.file (
  id           uuid primary key default gen_random_uuid(),
  practice_id  uuid not null references arch.practice(id) on delete restrict,
  project_id   uuid not null references arch.project(id) on delete restrict,
  owner_kind   text not null check (owner_kind in ('document', 'model')),
  owner_id     uuid not null,
  name         text not null check (length(btrim(name)) > 0),
  mime         text,
  size         bigint check (size is null or size >= 0),
  storage_path text not null unique,
  created_by   uuid not null default auth.uid(),
  created_at   timestamptz not null default now(),
  extra        jsonb not null default '{}'::jsonb check (jsonb_typeof(extra) = 'object'),
  seq          bigint generated always as identity,
  constraint file_path_in_practice check (storage_path like practice_id::text || '/%'),
  constraint file_path_is_ids check (storage_path = practice_id::text || '/' || project_id::text || '/' || id::text),
  constraint file_model_is_project check (owner_kind <> 'model' or owner_id = project_id)
);
create index if not exists file_practice_idx on arch.file (practice_id);
create index if not exists file_project_idx on arch.file (project_id);
create index if not exists file_owner_idx on arch.file (owner_kind, owner_id);

alter table arch.file enable row level security;
revoke all on arch.file from public, anon;
grant all on arch.file to service_role;
grant select, insert, update, delete on arch.file to authenticated;

-- 2. The practice a storage path belongs to: its first folder, if that is a uuid. Otherwise null (so: no access).
--    Never raises an error, whatever the path, so it is safe inside a rule that Postgres may test against any object.
create or replace function arch.path_practice(p_name text)
returns uuid
language sql immutable set search_path = ''
as $$
  select case
    when split_part(p_name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then split_part(p_name, '/', 1)::uuid
  end
$$;
revoke all on function arch.path_practice(text) from public, anon;
grant execute on function arch.path_practice(text) to authenticated, service_role;

do $policies$
begin
  -- File records: members read; owners and members write; a file's project must be in the same practice.
  if not exists (select 1 from pg_policies where schemaname = 'arch' and tablename = 'file' and policyname = 'file_select') then
    create policy file_select on arch.file for select to authenticated
      using (arch.is_member(practice_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'arch' and tablename = 'file' and policyname = 'file_insert') then
    create policy file_insert on arch.file for insert to authenticated
      with check (arch.can_write(practice_id) and created_by = auth.uid()
                  and arch.project_practice(project_id) = practice_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'arch' and tablename = 'file' and policyname = 'file_update') then
    create policy file_update on arch.file for update to authenticated
      using (arch.can_write(practice_id))
      with check (arch.can_write(practice_id)
                  and arch.project_practice(project_id) = practice_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'arch' and tablename = 'file' and policyname = 'file_delete') then
    create policy file_delete on arch.file for delete to authenticated
      using (arch.can_write(practice_id));
  end if;
end
$policies$;

-- 3. OUTSIDE arch (a): the bucket. Private: nothing in it has a public address.
--    If a bucket of this name already exists it is kept, and made private.
insert into storage.buckets (id, name, public, file_size_limit)
values ('arch-files', 'arch-files', false, 52428800)   -- 50 MB a file
on conflict (id) do update set public = false;

-- 4. OUTSIDE arch (b): who may touch objects in that bucket. Access follows practice membership:
--    the first folder of the path is the practice id; members read; owners and members add, replace and remove;
--    viewers read only; anyone else, and anyone not signed in, gets nothing.
--    Every rule starts with the bucket name, so no other bucket in this Supabase project is affected.
do $storage$
begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'arch_files_read') then
    create policy arch_files_read on storage.objects for select to authenticated
      using (bucket_id = 'arch-files' and arch.is_member(arch.path_practice(name)));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'arch_files_add') then
    create policy arch_files_add on storage.objects for insert to authenticated
      with check (bucket_id = 'arch-files' and arch.can_write(arch.path_practice(name)));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'arch_files_change') then
    create policy arch_files_change on storage.objects for update to authenticated
      using (bucket_id = 'arch-files' and arch.can_write(arch.path_practice(name)))
      with check (bucket_id = 'arch-files' and arch.can_write(arch.path_practice(name)));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'arch_files_remove') then
    create policy arch_files_remove on storage.objects for delete to authenticated
      using (bucket_id = 'arch-files' and arch.can_write(arch.path_practice(name)));
  end if;
end
$storage$;
