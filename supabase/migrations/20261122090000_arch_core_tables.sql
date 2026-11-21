-- arch schema, part 1 of 3: the tables.
-- Safe to run twice: every statement is "if not exists". Nothing is dropped.
-- Target: Supabase (Postgres 17). Uses auth.users and auth.uid().

create schema if not exists arch;

comment on schema arch is
  'Architecture practice operations system. Everything lives here so it cannot collide with other tables in a shared Supabase project.';

-- The firm ---------------------------------------------------------------
create table if not exists arch.practice (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(btrim(name)) > 0),
  created_by  uuid not null default auth.uid(),
  created_at  timestamptz not null default now()
);

create table if not exists arch.practice_member (
  practice_id uuid not null references arch.practice(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null check (role in ('owner', 'member', 'viewer')),
  created_at  timestamptz not null default now(),
  primary key (practice_id, user_id)
);
create index if not exists practice_member_user_idx on arch.practice_member (user_id);

-- Projects ---------------------------------------------------------------
create table if not exists arch.project (
  id                uuid primary key default gen_random_uuid(),
  practice_id       uuid not null references arch.practice(id) on delete restrict,
  name              text not null check (length(btrim(name)) > 0),
  client            text,
  stage             text not null default 'predesign'
                      check (stage in ('predesign','concept','developed','detailed','contract_admin','observation','completion')),
  created_by        uuid default auth.uid(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  -- site {lat, lon, facts, fetched_at}
  site_lat          double precision check (site_lat between -90 and 90),
  site_lon          double precision check (site_lon between -180 and 180),
  site_facts        jsonb not null default '{}'::jsonb,
  site_fetched_at   timestamptz,
  -- model {fingerprint, drawings, revision, file_name}
  model_fingerprint text,
  model_drawings    jsonb,
  model_revision    text,
  model_file_name   text
);
create index if not exists project_practice_idx on arch.project (practice_id);

comment on column arch.project.site_lat is
  'PRIVATE project data: the site latitude. Only members of the owning practice may read it (row level security). Never put it in public pages, logs or shared exports.';
comment on column arch.project.site_lon is
  'PRIVATE project data: the site longitude. Only members of the owning practice may read it (row level security). Never put it in public pages, logs or shared exports.';

create table if not exists arch.stage (
  project_id uuid not null references arch.project(id) on delete cascade,
  key        text not null
               check (key in ('predesign','concept','developed','detailed','contract_admin','observation','completion')),
  status     text not null default 'not_started'
               check (status in ('not_started','in_progress','awaiting_approval','done')),
  started_at timestamptz,
  done_at    timestamptz,
  primary key (project_id, key)
);

create table if not exists arch.task (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references arch.project(id) on delete cascade,
  stage      text check (stage in ('predesign','concept','developed','detailed','contract_admin','observation','completion')),
  title      text not null,
  owner      text,
  status     text not null default 'todo' check (status in ('todo','doing','done','blocked')),
  due        date,
  note       text
);

create table if not exists arch.document (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references arch.project(id) on delete cascade,
  stage      text check (stage in ('predesign','concept','developed','detailed','contract_admin','observation','completion')),
  title      text not null,
  kind       text,
  version    text,
  date       date,
  source     text,
  note       text
);

-- Approvals and activity are append-only (see the rules migration).
-- project_id is "restrict": a project with history cannot be deleted by accident.
create table if not exists arch.approval (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references arch.project(id) on delete restrict,
  stage       text not null
                check (stage in ('predesign','concept','developed','detailed','contract_admin','observation','completion')),
  who         text not null check (length(btrim(who)) > 0),   -- the typed name
  role        text,                                            -- the person's job title, not the access role
  what        text not null,
  note        text,
  at          timestamptz not null default now(),
  fingerprint text,
  user_id     uuid not null default auth.uid()                 -- the signed-in user; no foreign key so the record outlives the account
);

create table if not exists arch.rfi (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references arch.project(id) on delete cascade,
  received_at timestamptz not null default now(),
  from_party  text,
  question    text not null,
  response    text,
  status      text not null default 'open' check (status in ('open','drafted','sent','closed')),
  sent_at     timestamptz
);

create table if not exists arch.observation (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references arch.project(id) on delete cascade,
  date       date not null default current_date,
  by         text,
  note       text
);

create table if not exists arch.variation (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references arch.project(id) on delete cascade,
  title      text not null,
  status     text,
  note       text
);

create table if not exists arch.defect (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references arch.project(id) on delete cascade,
  title      text not null,
  status     text,
  note       text
);

create table if not exists arch.activity (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references arch.project(id) on delete restrict,
  at         timestamptz not null default now(),
  who        text,
  action     text not null,
  detail     text,
  user_id    uuid default auth.uid()
);

create index if not exists task_project_idx        on arch.task (project_id);
create index if not exists document_project_idx    on arch.document (project_id);
create index if not exists approval_project_idx    on arch.approval (project_id, stage);
create index if not exists rfi_project_idx         on arch.rfi (project_id);
create index if not exists observation_project_idx on arch.observation (project_id);
create index if not exists variation_project_idx   on arch.variation (project_id);
create index if not exists defect_project_idx      on arch.defect (project_id);
create index if not exists activity_project_idx    on arch.activity (project_id, at);
