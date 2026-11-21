-- arch schema, part 4: room for fields the database does not know yet, the checklists, and a server-stamped time.
-- Additive only. Safe to run twice: every statement is "if not exists" or "create or replace". Nothing is dropped.
-- Touches nothing outside the arch schema.

-- 1. "extra": a place for fields the page has and the database does not know yet, so they survive a round trip.
--    Always a JSON object. The check is created with the column, so a second run skips both.
alter table arch.practice        add column if not exists extra jsonb not null default '{}'::jsonb check (jsonb_typeof(extra) = 'object');
alter table arch.practice_member add column if not exists extra jsonb not null default '{}'::jsonb check (jsonb_typeof(extra) = 'object');
alter table arch.project         add column if not exists extra jsonb not null default '{}'::jsonb check (jsonb_typeof(extra) = 'object');
alter table arch.stage           add column if not exists extra jsonb not null default '{}'::jsonb check (jsonb_typeof(extra) = 'object');
alter table arch.task            add column if not exists extra jsonb not null default '{}'::jsonb check (jsonb_typeof(extra) = 'object');
alter table arch.document        add column if not exists extra jsonb not null default '{}'::jsonb check (jsonb_typeof(extra) = 'object');
alter table arch.approval        add column if not exists extra jsonb not null default '{}'::jsonb check (jsonb_typeof(extra) = 'object');
alter table arch.rfi             add column if not exists extra jsonb not null default '{}'::jsonb check (jsonb_typeof(extra) = 'object');
alter table arch.observation     add column if not exists extra jsonb not null default '{}'::jsonb check (jsonb_typeof(extra) = 'object');
alter table arch.variation       add column if not exists extra jsonb not null default '{}'::jsonb check (jsonb_typeof(extra) = 'object');
alter table arch.defect          add column if not exists extra jsonb not null default '{}'::jsonb check (jsonb_typeof(extra) = 'object');
alter table arch.activity        add column if not exists extra jsonb not null default '{}'::jsonb check (jsonb_typeof(extra) = 'object');

-- 2. Tasks can name where their wording came from, and whether a person has edited it since.
--    source is { name, clause, url, read_on }.
alter table arch.task add column if not exists source jsonb;
alter table arch.task add column if not exists edited boolean not null default false;

-- 3. Checklists: the consent bundle and the completion checklist.
--    list and status are free text on purpose, like variation and defect, so the page can add a list without a new migration.
create table if not exists arch.checklist_item (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references arch.project(id) on delete cascade,
  stage       text check (stage in ('predesign','concept','developed','detailed','contract_admin','observation','completion')),
  list        text not null,
  title       text not null,
  status      text not null default 'needed',
  document_id uuid references arch.document(id) on delete set null,
  note        text,
  source      jsonb,
  edited      boolean not null default false,
  extra       jsonb not null default '{}'::jsonb check (jsonb_typeof(extra) = 'object')
);
create index if not exists checklist_item_project_idx on arch.checklist_item (project_id);

alter table arch.checklist_item enable row level security;
revoke all on arch.checklist_item from public, anon;
grant all on arch.checklist_item to service_role;
grant select, insert, update, delete on arch.checklist_item to authenticated;

-- Same rules as the other tables that belong to a project: members read, owners and members write.
do $policies$
begin
  if not exists (select 1 from pg_policies where schemaname = 'arch' and tablename = 'checklist_item' and policyname = 'checklist_item_select') then
    create policy checklist_item_select on arch.checklist_item for select to authenticated
      using (arch.is_member(arch.project_practice(project_id)));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'arch' and tablename = 'checklist_item' and policyname = 'checklist_item_insert') then
    create policy checklist_item_insert on arch.checklist_item for insert to authenticated
      with check (arch.can_write(arch.project_practice(project_id)));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'arch' and tablename = 'checklist_item' and policyname = 'checklist_item_update') then
    create policy checklist_item_update on arch.checklist_item for update to authenticated
      using (arch.can_write(arch.project_practice(project_id)))
      with check (arch.can_write(arch.project_practice(project_id)));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'arch' and tablename = 'checklist_item' and policyname = 'checklist_item_delete') then
    create policy checklist_item_delete on arch.checklist_item for delete to authenticated
      using (arch.can_write(arch.project_practice(project_id)));
  end if;
end
$policies$;

-- 4. The time the database received an approval or an activity entry.
--    "at" is the time the page sent, and a page can send any time. recorded_at is set here and cannot be chosen by the sender.
alter table arch.approval add column if not exists recorded_at timestamptz not null default now();
alter table arch.activity add column if not exists recorded_at timestamptz not null default now();

create or replace function arch.stamp_recorded_at()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if current_user <> 'service_role' then
    new.recorded_at := now();
  end if;
  return new;
end
$$;
revoke all on function arch.stamp_recorded_at() from public, anon;

do $triggers$
begin
  if not exists (select 1 from pg_trigger g where g.tgname = 'approval_recorded_at_trg' and g.tgrelid = 'arch.approval'::regclass and not g.tgisinternal) then
    create trigger approval_recorded_at_trg before insert on arch.approval for each row execute function arch.stamp_recorded_at();
  end if;
  if not exists (select 1 from pg_trigger g where g.tgname = 'activity_recorded_at_trg' and g.tgrelid = 'arch.activity'::regclass and not g.tgisinternal) then
    create trigger activity_recorded_at_trg before insert on arch.activity for each row execute function arch.stamp_recorded_at();
  end if;
end
$triggers$;

comment on column arch.approval.recorded_at is 'When the database received this approval. Set by the database; the sender cannot choose it. "at" is the time the page sent.';
comment on column arch.activity.recorded_at is 'When the database received this entry. Set by the database; the sender cannot choose it. "at" is the time the page sent.';
