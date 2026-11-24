-- arch schema: persistent render dispatch job ledger (Cloudflare Workflow + Pages Functions).
-- Safe to run twice. Nothing is dropped.
-- Enforces project membership via arch.is_member / arch.can_write and prevents double-charging
-- via a unique idempotency job_key per (project_id, revision_sha256, shot_id, variant, provider, mode).

create table if not exists arch.render_job (
  id                   uuid primary key default gen_random_uuid(),
  project_id           uuid not null references arch.project(id) on delete cascade,
  practice_id          uuid not null references arch.practice(id) on delete cascade,
  job_key              text not null unique,
  revision_sha256      text not null check (revision_sha256 ~ '^[a-f0-9]{64}$'),
  shot_id              text not null check (length(trim(shot_id)) between 1 and 80),
  variant              text not null default 'default' check (length(trim(variant)) between 1 and 80),
  provider             text not null check (provider in ('mock', 'gemini-image', 'gemini-omni', 'fal-video')),
  model                text not null default '',
  mode                 text not null default 'mock' check (mode in ('mock', 'dry_run', 'live')),
  status               text not null default 'quoted' check (
    status in ('quoted', 'queued', 'submitting', 'uncertain', 'running', 'validating', 'completed', 'failed', 'rejected_drift', 'cancelled')
  ),
  provider_request_id  text,
  workflow_instance_id text,
  estimated_usd        numeric(8,4) not null default 0 check (estimated_usd >= 0),
  approved_by          text,
  approved_at          timestamptz,
  input_manifest       jsonb not null default '{}'::jsonb,
  drift_report         jsonb,
  output_file_id       uuid,
  output_storage_path  text,
  error_code           text,
  error_message        text,
  attempts             integer not null default 0 check (attempts >= 0),
  reconciled_at        timestamptz,
  created_by           uuid references auth.users(id),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists render_job_project_idx
  on arch.render_job (project_id, created_at desc);

create index if not exists render_job_provider_req_idx
  on arch.render_job (provider_request_id)
  where provider_request_id is not null;

alter table arch.render_job enable row level security;

revoke all on table arch.render_job from public, anon;
grant select, insert, update on table arch.render_job to authenticated;
grant all on table arch.render_job to service_role;

do $policies$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'arch' and tablename = 'render_job' and policyname = 'render_job_select'
  ) then
    create policy render_job_select on arch.render_job
      for select to authenticated
      using (arch.is_member(practice_id) and arch.project_practice(project_id) = practice_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'arch' and tablename = 'render_job' and policyname = 'render_job_insert'
  ) then
    create policy render_job_insert on arch.render_job
      for insert to authenticated
      with check (arch.can_write(practice_id) and arch.project_practice(project_id) = practice_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'arch' and tablename = 'render_job' and policyname = 'render_job_update'
  ) then
    create policy render_job_update on arch.render_job
      for update to authenticated
      using (arch.can_write(practice_id) and arch.project_practice(project_id) = practice_id)
      with check (arch.can_write(practice_id) and arch.project_practice(project_id) = practice_id);
  end if;
end
$policies$;
