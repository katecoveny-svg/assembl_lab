-- arch schema, part 2 of 3: membership helpers, row level security, grants, policies.
-- Safe to run twice. Nothing is dropped.

-- Helpers. security definer so they can read practice_member without
-- being blocked by its own policies; search_path is fixed to empty so
-- every name below is fully qualified.
create or replace function arch.member_role(p_practice uuid)
returns text
language sql stable security definer set search_path = ''
as $$
  select m.role from arch.practice_member m
  where m.practice_id = p_practice and m.user_id = auth.uid()
$$;

create or replace function arch.is_member(p_practice uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$ select arch.member_role(p_practice) is not null $$;

create or replace function arch.can_write(p_practice uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce(arch.member_role(p_practice) in ('owner','member'), false) $$;

create or replace function arch.is_owner(p_practice uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce(arch.member_role(p_practice) = 'owner', false) $$;

create or replace function arch.project_practice(p_project uuid)
returns uuid
language sql stable security definer set search_path = ''
as $$ select p.practice_id from arch.project p where p.id = p_project $$;

revoke all on function arch.member_role(uuid), arch.is_member(uuid), arch.can_write(uuid),
  arch.is_owner(uuid), arch.project_practice(uuid) from public, anon;
grant execute on function arch.member_role(uuid), arch.is_member(uuid), arch.can_write(uuid),
  arch.is_owner(uuid), arch.project_practice(uuid) to authenticated, service_role;

-- Row level security on every table.
alter table arch.practice        enable row level security;
alter table arch.practice_member enable row level security;
alter table arch.project         enable row level security;
alter table arch.stage           enable row level security;
alter table arch.task            enable row level security;
alter table arch.document        enable row level security;
alter table arch.approval        enable row level security;
alter table arch.rfi             enable row level security;
alter table arch.observation     enable row level security;
alter table arch.variation       enable row level security;
alter table arch.defect          enable row level security;
alter table arch.activity        enable row level security;

-- Grants: anon gets nothing at all. Signed-in users get only what the policies then narrow.
revoke all on schema arch from public, anon;
revoke all on all tables in schema arch from public, anon;
revoke all on all functions in schema arch from public, anon;
grant usage on schema arch to authenticated, service_role;
grant all on all tables in schema arch to service_role;

grant select, insert, update          on arch.practice        to authenticated;
grant select, insert, update, delete  on arch.practice_member to authenticated;
grant select, insert, update, delete  on arch.project         to authenticated;
grant select, insert, update, delete  on arch.stage           to authenticated;
grant select, insert, update, delete  on arch.task            to authenticated;
grant select, insert, update, delete  on arch.document        to authenticated;
grant select, insert, update, delete  on arch.rfi             to authenticated;
grant select, insert, update, delete  on arch.observation     to authenticated;
grant select, insert, update, delete  on arch.variation       to authenticated;
grant select, insert, update, delete  on arch.defect          to authenticated;
grant select, insert                  on arch.approval        to authenticated;  -- append-only
grant select, insert                  on arch.activity        to authenticated;  -- append-only

-- Policies. Created only if missing, so a second run changes nothing.
-- (To change a policy later, add a new migration; this one never rewrites them.)
do $policies$
declare
  p record;
  child text;
  specs jsonb := '[]'::jsonb;
begin
  specs := specs || jsonb_build_array(
    jsonb_build_object('t','practice','n','practice_select','c','select',
      'u','arch.is_member(id) or created_by = auth.uid()'),
    jsonb_build_object('t','practice','n','practice_insert','c','insert',
      'w','created_by = auth.uid()'),
    jsonb_build_object('t','practice','n','practice_update','c','update',
      'u','arch.is_owner(id)','w','arch.is_owner(id)'),
    jsonb_build_object('t','practice_member','n','member_select','c','select',
      'u','arch.is_member(practice_id)'),
    jsonb_build_object('t','practice_member','n','member_insert','c','insert',
      'w','arch.is_owner(practice_id)'),
    jsonb_build_object('t','practice_member','n','member_update','c','update',
      'u','arch.is_owner(practice_id)','w','arch.is_owner(practice_id)'),
    jsonb_build_object('t','practice_member','n','member_delete','c','delete',
      'u','arch.is_owner(practice_id)'),
    jsonb_build_object('t','project','n','project_select','c','select',
      'u','arch.is_member(practice_id)'),
    jsonb_build_object('t','project','n','project_insert','c','insert',
      'w','arch.can_write(practice_id)'),
    jsonb_build_object('t','project','n','project_update','c','update',
      'u','arch.can_write(practice_id)','w','arch.can_write(practice_id)'),
    jsonb_build_object('t','project','n','project_delete','c','delete',
      'u','arch.is_owner(practice_id)')
  );

  -- Tables that belong to a project: access follows the project's practice.
  foreach child in array array['stage','task','document','rfi','observation','variation','defect'] loop
    specs := specs || jsonb_build_array(
      jsonb_build_object('t',child,'n',child||'_select','c','select',
        'u','arch.is_member(arch.project_practice(project_id))'),
      jsonb_build_object('t',child,'n',child||'_insert','c','insert',
        'w','arch.can_write(arch.project_practice(project_id))'),
      jsonb_build_object('t',child,'n',child||'_update','c','update',
        'u','arch.can_write(arch.project_practice(project_id))',
        'w','arch.can_write(arch.project_practice(project_id))'),
      jsonb_build_object('t',child,'n',child||'_delete','c','delete',
        'u','arch.can_write(arch.project_practice(project_id))')
    );
  end loop;

  -- Append-only tables: read and insert only. No update or delete policy exists.
  -- The signed-in user's id must be the one stored.
  foreach child in array array['approval','activity'] loop
    specs := specs || jsonb_build_array(
      jsonb_build_object('t',child,'n',child||'_select','c','select',
        'u','arch.is_member(arch.project_practice(project_id))'),
      jsonb_build_object('t',child,'n',child||'_insert','c','insert',
        'w','arch.can_write(arch.project_practice(project_id)) and user_id = auth.uid()')
    );
  end loop;

  for p in select * from jsonb_to_recordset(specs) as x(t text, n text, c text, u text, w text) loop
    if not exists (
      select 1 from pg_policies
      where schemaname = 'arch' and tablename = p.t and policyname = p.n
    ) then
      execute format('create policy %I on arch.%I for %s to authenticated %s %s',
        p.n, p.t, p.c,
        case when p.u is not null then 'using (' || p.u || ')' else '' end,
        case when p.w is not null then 'with check (' || p.w || ')' else '' end);
    end if;
  end loop;
end
$policies$;
