-- arch schema, part 3 of 3: rules the database itself enforces.
-- Safe to run twice. Nothing is dropped.

-- 1. Whoever creates a practice becomes its owner.
create or replace function arch.practice_creator_becomes_owner()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into arch.practice_member (practice_id, user_id, role)
  values (new.id, new.created_by, 'owner')
  on conflict (practice_id, user_id) do nothing;
  return new;
end
$$;

-- 2. A new project gets its seven stages, all not started.
create or replace function arch.project_seed_stages()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into arch.stage (project_id, key)
  select new.id, k
  from unnest(array['predesign','concept','developed','detailed','contract_admin','observation','completion']) as k
  on conflict (project_id, key) do nothing;
  return new;
end
$$;

-- 3. updated_at moves on every project change.
create or replace function arch.touch_updated_at()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

-- 4. Append-only: approvals and activity cannot be changed or removed,
--    except by service_role. This holds even if someone adds a policy later.
create or replace function arch.block_change_unless_service_role()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if current_user = 'service_role' then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  raise exception '% on arch.% is not allowed: this record is append-only', tg_op, tg_table_name
    using errcode = '42501';
end
$$;

-- 5. A stage cannot be done without an approval for that project and stage.
--    Applies to everyone, service_role included.
create or replace function arch.stage_done_needs_approval()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.status = 'done' and not exists (
    select 1 from arch.approval a
    where a.project_id = new.project_id and a.stage = new.key
  ) then
    raise exception 'Stage % cannot be marked done: no approval recorded for it', new.key
      using errcode = '23514';
  end if;
  return new;
end
$$;

revoke all on function arch.practice_creator_becomes_owner(), arch.project_seed_stages(),
  arch.touch_updated_at(), arch.block_change_unless_service_role(),
  arch.stage_done_needs_approval() from public, anon;

-- Attach the triggers only if missing.
do $triggers$
declare
  t record;
begin
  for t in
    select * from (values
      ('practice','practice_owner_trg','after insert',
         'arch.practice_creator_becomes_owner()'),
      ('project','project_seed_stages_trg','after insert',
         'arch.project_seed_stages()'),
      ('project','project_touch_trg','before update',
         'arch.touch_updated_at()'),
      ('approval','approval_append_only_trg','before update or delete',
         'arch.block_change_unless_service_role()'),
      ('activity','activity_append_only_trg','before update or delete',
         'arch.block_change_unless_service_role()'),
      ('stage','stage_done_needs_approval_trg','before insert or update',
         'arch.stage_done_needs_approval()')
    ) as v(tbl, trg, timing, fn)
  loop
    if not exists (
      select 1 from pg_trigger g
      where g.tgname = t.trg and g.tgrelid = ('arch.' || t.tbl)::regclass and not g.tgisinternal
    ) then
      execute format('create trigger %I %s on arch.%I for each row execute function %s',
        t.trg, t.timing, t.tbl, t.fn);
    end if;
  end loop;
end
$triggers$;
