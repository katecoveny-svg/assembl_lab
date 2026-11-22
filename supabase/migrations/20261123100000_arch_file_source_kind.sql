-- arch schema: a practice's files can now be a site source ("Site and sources" on a project: drawing set, site plan,
-- camera path sketch, survey, other). owner_kind 'source'; owner_id is the project's id, as for a model.
-- Additive. Safe to run twice. Existing rows are untouched. NOT YET APPLIED: the main session applies it.
-- The page's own list is OWNER_KINDS in architecture/js/store.js: keep the two in step (tests/architecture-db/file-source-kind.test.mjs).
do $$
declare c text;
begin
  -- the owner_kind check was written inline, so its name is Postgres's own: find it by what it says
  for c in
    select con.conname from pg_constraint con
    where con.conrelid = 'arch.file'::regclass and con.contype = 'c'
      and pg_get_constraintdef(con.oid) like '%owner_kind%' and con.conname not in ('file_model_is_project', 'file_source_is_project', 'file_owner_kind_ok')
      and pg_get_constraintdef(con.oid) not like '%owner_kind <>%'
  loop
    execute format('alter table arch.file drop constraint %I', c);
  end loop;
  if not exists (select 1 from pg_constraint where conrelid = 'arch.file'::regclass and conname = 'file_owner_kind_ok') then
    alter table arch.file add constraint file_owner_kind_ok check (owner_kind in ('document', 'model', 'source'));
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'arch.file'::regclass and conname = 'file_source_is_project') then
    alter table arch.file add constraint file_source_is_project check (owner_kind <> 'source' or owner_id = project_id);
  end if;
end
$$;
