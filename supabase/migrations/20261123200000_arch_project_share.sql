-- arch schema: the client link for a project (the workspace redesign, phase 1: architecture/share/).
-- Additive only. Safe to run twice. Nothing is dropped. NOT APPLIED: an owner of the Supabase project applies it.
--
-- What it does
--   arch.project_share          one row per project that has ever been shared: whether the link is on, and its token.
--                               No row, or shared = false, means nobody outside the practice can see the project.
--   arch.set_project_share()    the only way to turn the link on or off. Owners of the project's practice only. Turning
--                               it on makes a new random token (64 hex characters); turning it off removes the token, so
--                               an old link never opens again.
--   arch.shared_project(token)  what the client page may show, for a token whose link is on: the project's name, the
--                               practice's name and look, and its kept files and documents (names, kinds, storage paths).
--                               Called only by the server (service_role), from functions/api/arch-share.js, which picks
--                               stills, films, drawings and the model (architecture/js/share-rules.js) and signs short-lived
--                               file links. Never the site point, the address, money, tasks, people or activity.
-- Reversible: drop function arch.shared_project(text), arch.set_project_share(uuid, boolean); drop table arch.project_share;

create table if not exists arch.project_share (
  project_id   uuid primary key references arch.project(id) on delete cascade,
  practice_id  uuid not null references arch.practice(id) on delete restrict,
  shared       boolean not null default false,
  token        text unique check (token is null or token ~ '^[a-f0-9]{64}$'),
  changed_by   uuid default auth.uid(),
  changed_at   timestamptz not null default now(),
  constraint project_share_token_when_on check (not shared or token is not null)
);
create index if not exists project_share_practice_idx on arch.project_share (practice_id);

alter table arch.project_share enable row level security;
revoke all on arch.project_share from public, anon, authenticated;
grant select on arch.project_share to authenticated;
grant all on arch.project_share to service_role;

do $policies$
begin
  -- members of the practice can see whether a project is shared (and copy its link); nobody writes the table directly
  if not exists (select 1 from pg_policies where schemaname = 'arch' and tablename = 'project_share' and policyname = 'project_share_select') then
    create policy project_share_select on arch.project_share for select to authenticated using (arch.is_member(practice_id));
  end if;
end
$policies$;

create or replace function arch.set_project_share(p_project uuid, p_on boolean)
returns table (shared boolean, token text)
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_practice uuid := arch.project_practice(p_project);
  v_token text;
begin
  if v_practice is null then raise exception 'no such project' using errcode = '42501'; end if;
  if not arch.is_owner(v_practice) then raise exception 'only an owner can share a project' using errcode = '42501'; end if;
  if p_on then
    select s.token into v_token from arch.project_share s where s.project_id = p_project and s.shared;
    v_token := coalesce(v_token, replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''));
    insert into arch.project_share as s (project_id, practice_id, shared, token, changed_by, changed_at)
      values (p_project, v_practice, true, v_token, auth.uid(), now())
      on conflict (project_id) do update set shared = true, token = excluded.token, changed_by = excluded.changed_by, changed_at = excluded.changed_at;
  else
    insert into arch.project_share as s (project_id, practice_id, shared, token, changed_by, changed_at)
      values (p_project, v_practice, false, null, auth.uid(), now())
      on conflict (project_id) do update set shared = false, token = null, changed_by = excluded.changed_by, changed_at = excluded.changed_at;
  end if;
  return query select s.shared, s.token from arch.project_share s where s.project_id = p_project;
end
$$;
revoke all on function arch.set_project_share(uuid, boolean) from public, anon;
grant execute on function arch.set_project_share(uuid, boolean) to authenticated, service_role;

create or replace function arch.shared_project(p_token text)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select case when s.project_id is null then null else jsonb_build_object(
    'project', jsonb_build_object('id', p.id, 'name', p.name,
      'model', jsonb_build_object('fingerprint', p.model_fingerprint, 'file_name', p.model_file_name, 'file', p.extra -> 'model' -> 'file')),
    'practice', jsonb_build_object('name', pr.name, 'theme', pr.extra -> 'theme'),
    'files', coalesce((select jsonb_agg(jsonb_build_object('id', f.id, 'name', f.name, 'type', f.mime, 'size', f.size, 'owner_kind', f.owner_kind,
        'owner_id', f.owner_id, 'kept_at', f.created_at, 'extra', f.extra, 'path', f.storage_path) order by f.seq)
      from arch.file f where f.project_id = p.id), '[]'::jsonb),
    'documents', coalesce((select jsonb_agg(jsonb_build_object('id', d.id, 'title', d.title, 'kind', d.kind, 'stage', d.stage, 'file', d.extra -> 'file'))
      from arch.document d where d.project_id = p.id), '[]'::jsonb)
  ) end
  from (select 1) one
  left join arch.project_share s on s.shared and s.token is not null and s.token = p_token and p_token ~ '^[a-f0-9]{64}$'
  left join arch.project p on p.id = s.project_id
  left join arch.practice pr on pr.id = p.practice_id
$$;
revoke all on function arch.shared_project(text) from public, anon, authenticated;
grant execute on function arch.shared_project(text) to service_role;
