-- arch schema, part 8: money, time and people for each project (the Money add-on, architecture/js/money.js).
-- Additive only. Safe to run twice: every statement is "if not exists" or "create or replace". Nothing is dropped.
-- Touches nothing outside the arch schema. Needs the earlier arch migrations (practice, project, enquiry, the helpers).
--
-- What is new:
--   arch.time_entry   time a person logged on a project: who, which day, how many hours, which stage
--   arch.invoice      the practice's invoices for a project: number, amount, issued, due, paid. Voided, never deleted.
--   arch.allocation   who is planned on a project or an enquiry: hours a week, from a day to a day
--   a guard on arch.project: only an owner sets or changes a project's own hourly rate (project.extra.money.rate)
-- What is not new: the fee, budget hours, stage target dates and holds of a project live in project.extra.money, and the
-- practice's break-even, targets, labels, stage chances, team and default rate in practice.extra.money. The existing rules
-- already let only an owner change the practice row, so only an owner changes those.
--
-- The rules, in short:
--   * Every row belongs to one practice (practice_id). Members of that practice read it; nobody else sees it.
--   * Owners and members add and change rows. Viewers read only.
--   * A row can only point at a project or an enquiry of its own practice.
--   * Invoices are never deleted, by anyone, including through a policy added later: a person voids one instead, and a
--     void invoice cannot be changed again. Time entries and allocations can be corrected or removed by a writer.
--   * Every amount and every hour is what a person typed. Nothing here estimates or works anything out.
--   * The role "anon" gets nothing. Only "authenticated" is granted anything. No default privileges are set.

-- 1. Tables ----------------------------------------------------------------------------------------------------------
create table if not exists arch.time_entry (
  id           uuid primary key default gen_random_uuid(),
  practice_id  uuid not null references arch.practice(id) on delete restrict,
  project_id   uuid not null references arch.project(id) on delete restrict,
  person       text not null check (length(btrim(person)) > 0),   -- a name from the practice's team, as chosen
  on_date      date not null,
  hours        numeric(5, 2) not null check (hours > 0 and hours <= 24),
  stage        text check (stage is null or stage in ('predesign','concept','developed','detailed','contract_admin','observation','completion')),
  note         text,
  created_by   uuid not null default auth.uid(),
  created_at   timestamptz not null default now(),
  extra        jsonb not null default '{}'::jsonb check (jsonb_typeof(extra) = 'object'),
  seq          bigint generated always as identity
);

create table if not exists arch.invoice (
  id           uuid primary key default gen_random_uuid(),
  practice_id  uuid not null references arch.practice(id) on delete restrict,
  project_id   uuid not null references arch.project(id) on delete restrict,
  number       text not null check (length(btrim(number)) > 0),
  -- typed by a person, in New Zealand dollars. Never worked out by the page or the database.
  amount_nzd   numeric(14, 2) not null check (amount_nzd >= 0),
  issued_on    date,
  due_on       date,
  paid_on      date,
  void         boolean not null default false,
  void_reason  text,
  note         text,
  created_by   uuid not null default auth.uid(),
  created_at   timestamptz not null default now(),
  extra        jsonb not null default '{}'::jsonb check (jsonb_typeof(extra) = 'object'),
  seq          bigint generated always as identity,
  constraint invoice_due_after_issue check (due_on is null or issued_on is null or due_on >= issued_on),
  constraint invoice_paid_after_issue check (paid_on is null or (issued_on is not null and paid_on >= issued_on)),
  constraint invoice_void_has_reason check (not void or length(btrim(coalesce(void_reason, ''))) > 0)
);

create table if not exists arch.allocation (
  id           uuid primary key default gen_random_uuid(),
  practice_id  uuid not null references arch.practice(id) on delete restrict,
  person       text not null check (length(btrim(person)) > 0),
  project_id   uuid references arch.project(id) on delete cascade,
  enquiry_id   uuid references arch.enquiry(id) on delete restrict,
  hours_week   numeric(5, 2) not null check (hours_week > 0 and hours_week <= 80),
  from_on      date not null,
  to_on        date not null,
  note         text,
  created_by   uuid not null default auth.uid(),
  created_at   timestamptz not null default now(),
  extra        jsonb not null default '{}'::jsonb check (jsonb_typeof(extra) = 'object'),
  seq          bigint generated always as identity,
  constraint allocation_one_target check ((project_id is null) <> (enquiry_id is null)),
  constraint allocation_in_order check (to_on >= from_on)
);

-- 2. Indexes: the practice, every foreign key, and one invoice number a practice ------------------------------------------
create index if not exists time_entry_practice_idx  on arch.time_entry (practice_id);
create index if not exists time_entry_project_idx   on arch.time_entry (project_id, on_date);
create index if not exists invoice_practice_idx     on arch.invoice (practice_id);
create index if not exists invoice_project_idx      on arch.invoice (project_id);
create unique index if not exists invoice_number_idx on arch.invoice (practice_id, number);
create index if not exists allocation_practice_idx  on arch.allocation (practice_id);
create index if not exists allocation_project_idx   on arch.allocation (project_id);
create index if not exists allocation_enquiry_idx   on arch.allocation (enquiry_id);

-- 3. Row level security and grants -------------------------------------------------------------------------------------
alter table arch.time_entry enable row level security;
alter table arch.invoice    enable row level security;
alter table arch.allocation enable row level security;

revoke all on arch.time_entry, arch.invoice, arch.allocation from public, anon;
grant all on arch.time_entry, arch.invoice, arch.allocation to service_role;
grant select, insert, update, delete on arch.time_entry to authenticated;
grant select, insert, update         on arch.invoice    to authenticated;   -- no delete: void instead
grant select, insert, update, delete on arch.allocation to authenticated;

do $policies$
declare
  p record;
  same_project text := 'arch.project_practice(project_id) = practice_id';
  alloc_links  text := '(project_id is null or arch.project_practice(project_id) = practice_id)'
                    || ' and (enquiry_id is null or arch.enquiry_practice(enquiry_id) = practice_id)';
  specs jsonb := '[]'::jsonb;
  t text;
begin
  foreach t in array array['time_entry', 'invoice'] loop
    specs := specs || jsonb_build_array(
      jsonb_build_object('t', t, 'n', t || '_select', 'c', 'select', 'u', 'arch.is_member(practice_id)'),
      jsonb_build_object('t', t, 'n', t || '_insert', 'c', 'insert',
        'w', 'arch.can_write(practice_id) and created_by = auth.uid() and ' || same_project),
      jsonb_build_object('t', t, 'n', t || '_update', 'c', 'update',
        'u', 'arch.can_write(practice_id)', 'w', 'arch.can_write(practice_id) and ' || same_project)
    );
  end loop;
  specs := specs || jsonb_build_array(
    jsonb_build_object('t', 'time_entry', 'n', 'time_entry_delete', 'c', 'delete', 'u', 'arch.can_write(practice_id)'),
    jsonb_build_object('t', 'allocation', 'n', 'allocation_select', 'c', 'select', 'u', 'arch.is_member(practice_id)'),
    jsonb_build_object('t', 'allocation', 'n', 'allocation_insert', 'c', 'insert',
      'w', 'arch.can_write(practice_id) and created_by = auth.uid() and ' || alloc_links),
    jsonb_build_object('t', 'allocation', 'n', 'allocation_update', 'c', 'update',
      'u', 'arch.can_write(practice_id)', 'w', 'arch.can_write(practice_id) and ' || alloc_links),
    jsonb_build_object('t', 'allocation', 'n', 'allocation_delete', 'c', 'delete', 'u', 'arch.can_write(practice_id)')
  );
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

-- 4. Triggers ------------------------------------------------------------------------------------------------------------
-- A row cannot be moved to another practice, and the person who made it stays the one who made it.
create or replace function arch.money_row_keeps_practice()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if current_user <> 'service_role' and (new.practice_id is distinct from old.practice_id or new.created_by is distinct from old.created_by) then
    raise exception 'A % row keeps the practice and the person it was made by', tg_table_name using errcode = '42501';
  end if;
  return new;
end
$$;

-- A void invoice is final: it cannot be changed or un-voided (except by service_role).
create or replace function arch.invoice_void_is_final()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if current_user <> 'service_role' and old.void then
    raise exception 'A void invoice cannot be changed' using errcode = '42501';
  end if;
  return new;
end
$$;

-- Only an owner sets or changes a project's own hourly rate (project.extra -> money -> rate). Members change the rest.
create or replace function arch.project_rate_owner_only()
returns trigger
language plpgsql set search_path = ''
as $$
declare
  was jsonb := case when tg_op = 'UPDATE' then old.extra #> '{money,rate}' else null end;
begin
  if current_user <> 'service_role'
     and (new.extra #> '{money,rate}') is distinct from was
     and not arch.is_owner(new.practice_id) then
    raise exception 'Only an owner sets a project''s hourly rate' using errcode = '42501';
  end if;
  return new;
end
$$;

revoke all on function arch.money_row_keeps_practice(), arch.invoice_void_is_final(), arch.project_rate_owner_only() from public, anon;

do $triggers$
declare
  t text;
begin
  foreach t in array array['time_entry', 'invoice', 'allocation'] loop
    if not exists (select 1 from pg_trigger g where g.tgname = t || '_keeps_practice_trg' and g.tgrelid = ('arch.' || t)::regclass and not g.tgisinternal) then
      execute format('create trigger %I before update on arch.%I for each row execute function arch.money_row_keeps_practice()', t || '_keeps_practice_trg', t);
    end if;
  end loop;
  if not exists (select 1 from pg_trigger g where g.tgname = 'invoice_no_delete_trg' and g.tgrelid = 'arch.invoice'::regclass and not g.tgisinternal) then
    create trigger invoice_no_delete_trg before delete on arch.invoice
      for each row execute function arch.block_change_unless_service_role();
  end if;
  if not exists (select 1 from pg_trigger g where g.tgname = 'invoice_void_final_trg' and g.tgrelid = 'arch.invoice'::regclass and not g.tgisinternal) then
    create trigger invoice_void_final_trg before update on arch.invoice
      for each row execute function arch.invoice_void_is_final();
  end if;
  if not exists (select 1 from pg_trigger g where g.tgname = 'project_rate_owner_trg' and g.tgrelid = 'arch.project'::regclass and not g.tgisinternal) then
    create trigger project_rate_owner_trg before insert or update on arch.project
      for each row execute function arch.project_rate_owner_only();
  end if;
end
$triggers$;

comment on column arch.invoice.amount_nzd is 'New Zealand dollars, typed by a person. Never estimated.';
comment on column arch.time_entry.hours is 'Hours a person logged, as typed.';
comment on column arch.allocation.hours_week is 'Hours a week a person is planned on the work, as typed.';
