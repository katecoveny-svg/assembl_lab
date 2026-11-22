-- arch schema, part 7: Clients (a small CRM for the practice): contacts, enquiries and the history of each.
-- Additive only. Safe to run twice: every statement is "if not exists" or "create or replace". Nothing is dropped.
-- Touches nothing outside the arch schema. Needs the earlier arch migrations (arch.practice, arch.project, the helpers).
--
-- The rules, in short:
--   * Every row belongs to one practice (practice_id). Members of that practice read it; nobody else sees it.
--   * Owners and members add and change contacts and enquiries. Viewers read only.
--   * Contacts and enquiries are never deleted: a person archives them (archived = true).
--   * crm_activity is the history (notes, calls, meetings, emails, stage moves). It is added to and never changed or
--     removed, by anyone, including through a policy added later (a trigger enforces it, as for arch.activity).
--   * The signed-in role "anon" gets nothing. Only "authenticated" is granted anything. No default privileges are set.

-- 1. Tables ----------------------------------------------------------------------------------------------------------
create table if not exists arch.contact (
  id           uuid primary key default gen_random_uuid(),
  practice_id  uuid not null references arch.practice(id) on delete restrict,
  name         text not null check (length(btrim(name)) > 0),
  email        text,
  phone        text,
  organisation text,
  role         text,
  notes        text,
  archived     boolean not null default false,
  created_by   uuid not null default auth.uid(),
  created_at   timestamptz not null default now(),
  extra        jsonb not null default '{}'::jsonb check (jsonb_typeof(extra) = 'object'),
  seq          bigint generated always as identity
);

create table if not exists arch.enquiry (
  id               uuid primary key default gen_random_uuid(),
  practice_id      uuid not null references arch.practice(id) on delete restrict,
  title            text not null check (length(btrim(title)) > 0),
  contact_id       uuid references arch.contact(id) on delete restrict,
  stage            text not null default 'new' check (stage in ('new', 'meeting', 'proposal', 'won', 'lost', 'paused')),
  -- typed by a person, in New Zealand dollars. Never worked out or estimated by the page or the database.
  value_nzd        numeric(14, 2) check (value_nzd is null or value_nzd >= 0),
  source           text,
  next_action      text,
  next_action_due  date,
  owner            text,       -- a person's name or user id, as typed
  project_id       uuid references arch.project(id) on delete set null,
  archived         boolean not null default false,
  created_by       uuid not null default auth.uid(),
  created_at       timestamptz not null default now(),
  extra            jsonb not null default '{}'::jsonb check (jsonb_typeof(extra) = 'object'),
  seq              bigint generated always as identity
);

create table if not exists arch.crm_activity (
  id           uuid primary key default gen_random_uuid(),
  practice_id  uuid not null references arch.practice(id) on delete restrict,
  enquiry_id   uuid references arch.enquiry(id) on delete restrict,
  contact_id   uuid references arch.contact(id) on delete restrict,
  kind         text not null check (kind in ('note', 'call', 'meeting', 'email', 'stage')),
  body         text not null check (length(btrim(body)) > 0),
  at           timestamptz not null default now(),   -- when it happened, as the person said: not when it was typed
  who          text,
  created_by   uuid not null default auth.uid(),
  created_at   timestamptz not null default now(),   -- when the database received it (stamped below; the sender cannot choose it)
  extra        jsonb not null default '{}'::jsonb check (jsonb_typeof(extra) = 'object'),
  seq          bigint generated always as identity,
  constraint crm_activity_has_a_subject check (enquiry_id is not null or contact_id is not null)
);

-- 2. Indexes: the practice, and every foreign key ---------------------------------------------------------------------
create index if not exists contact_practice_idx       on arch.contact (practice_id);
create index if not exists enquiry_practice_idx       on arch.enquiry (practice_id);
create index if not exists enquiry_contact_idx        on arch.enquiry (contact_id);
create index if not exists enquiry_project_idx        on arch.enquiry (project_id);
create index if not exists crm_activity_practice_idx  on arch.crm_activity (practice_id);
create index if not exists crm_activity_enquiry_idx   on arch.crm_activity (enquiry_id, at);
create index if not exists crm_activity_contact_idx   on arch.crm_activity (contact_id, at);

-- 3. Helpers: which practice a contact or an enquiry belongs to. Same shape as arch.project_practice, so a row cannot
--    point at a contact, enquiry or project of another practice. security definer, so they can read the row whoever asks.
create or replace function arch.contact_practice(p_contact uuid)
returns uuid
language sql stable security definer set search_path = ''
as $$ select c.practice_id from arch.contact c where c.id = p_contact $$;

create or replace function arch.enquiry_practice(p_enquiry uuid)
returns uuid
language sql stable security definer set search_path = ''
as $$ select e.practice_id from arch.enquiry e where e.id = p_enquiry $$;

revoke all on function arch.contact_practice(uuid), arch.enquiry_practice(uuid) from public, anon;
grant execute on function arch.contact_practice(uuid), arch.enquiry_practice(uuid) to authenticated, service_role;

-- 4. Row level security and grants -------------------------------------------------------------------------------------
alter table arch.contact      enable row level security;
alter table arch.enquiry      enable row level security;
alter table arch.crm_activity enable row level security;

revoke all on arch.contact, arch.enquiry, arch.crm_activity from public, anon;
grant all on arch.contact, arch.enquiry, arch.crm_activity to service_role;
grant select, insert, update on arch.contact      to authenticated;   -- no delete: archive instead
grant select, insert, update on arch.enquiry      to authenticated;   -- no delete: archive instead
grant select, insert         on arch.crm_activity to authenticated;   -- append-only

do $policies$
declare
  p record;
  specs jsonb := jsonb_build_array(
    -- contacts
    jsonb_build_object('t', 'contact', 'n', 'contact_select', 'c', 'select',
      'u', 'arch.is_member(practice_id)'),
    jsonb_build_object('t', 'contact', 'n', 'contact_insert', 'c', 'insert',
      'w', 'arch.can_write(practice_id) and created_by = auth.uid()'),
    jsonb_build_object('t', 'contact', 'n', 'contact_update', 'c', 'update',
      'u', 'arch.can_write(practice_id)', 'w', 'arch.can_write(practice_id)'),
    -- enquiries: the contact and the project, if named, must be the same practice's
    jsonb_build_object('t', 'enquiry', 'n', 'enquiry_select', 'c', 'select',
      'u', 'arch.is_member(practice_id)'),
    jsonb_build_object('t', 'enquiry', 'n', 'enquiry_insert', 'c', 'insert',
      'w', 'arch.can_write(practice_id) and created_by = auth.uid()'
        || ' and (contact_id is null or arch.contact_practice(contact_id) = practice_id)'
        || ' and (project_id is null or arch.project_practice(project_id) = practice_id)'),
    jsonb_build_object('t', 'enquiry', 'n', 'enquiry_update', 'c', 'update',
      'u', 'arch.can_write(practice_id)',
      'w', 'arch.can_write(practice_id)'
        || ' and (contact_id is null or arch.contact_practice(contact_id) = practice_id)'
        || ' and (project_id is null or arch.project_practice(project_id) = practice_id)'),
    -- history: read and insert only. No update or delete policy exists, and the trigger below refuses them anyway.
    jsonb_build_object('t', 'crm_activity', 'n', 'crm_activity_select', 'c', 'select',
      'u', 'arch.is_member(practice_id)'),
    jsonb_build_object('t', 'crm_activity', 'n', 'crm_activity_insert', 'c', 'insert',
      'w', 'arch.can_write(practice_id) and created_by = auth.uid()'
        || ' and (enquiry_id is null or arch.enquiry_practice(enquiry_id) = practice_id)'
        || ' and (contact_id is null or arch.contact_practice(contact_id) = practice_id)')
  );
begin
  for p in select * from jsonb_to_recordset(specs) as x(t text, n text, c text, u text, w text) loop
    if not exists (
      select 1 from pg_policies where schemaname = 'arch' and tablename = p.t and policyname = p.n
    ) then
      execute format('create policy %I on arch.%I for %s to authenticated %s %s',
        p.n, p.t, p.c,
        case when p.u is not null then 'using (' || p.u || ')' else '' end,
        case when p.w is not null then 'with check (' || p.w || ')' else '' end);
    end if;
  end loop;
end
$policies$;

-- 5. Triggers ------------------------------------------------------------------------------------------------------------
-- History cannot be changed or removed except by service_role (arch.block_change_unless_service_role, from part 3).
-- created_at on a history row is the time the database received it, whatever the sender said.
create or replace function arch.stamp_crm_created_at()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if current_user <> 'service_role' then
    new.created_at := now();
  end if;
  return new;
end
$$;
revoke all on function arch.stamp_crm_created_at() from public, anon;

do $triggers$
begin
  if not exists (select 1 from pg_trigger g where g.tgname = 'crm_activity_append_only_trg' and g.tgrelid = 'arch.crm_activity'::regclass and not g.tgisinternal) then
    create trigger crm_activity_append_only_trg before update or delete on arch.crm_activity
      for each row execute function arch.block_change_unless_service_role();
  end if;
  if not exists (select 1 from pg_trigger g where g.tgname = 'crm_activity_created_at_trg' and g.tgrelid = 'arch.crm_activity'::regclass and not g.tgisinternal) then
    create trigger crm_activity_created_at_trg before insert on arch.crm_activity
      for each row execute function arch.stamp_crm_created_at();
  end if;
end
$triggers$;

comment on column arch.enquiry.value_nzd is 'New Zealand dollars, typed by a person. Never estimated.';
comment on column arch.crm_activity.at is 'When it happened, as the person recorded it. created_at is when the database received it.';
