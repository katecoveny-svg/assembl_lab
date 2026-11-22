-- Found work, "Add alert emails": tenders read out of GETS "Tender Subscription" alert emails that a person pasted or dropped on the page.
-- NOT APPLIED. Dry run on PGlite only (tests/architecture-db/hunt-inbox.test.mjs). Apply to staging first, then production on Kate's word.
--
-- One row per GETS RFx ID per practice. Only fields the alert itself states (reference, buyer, name, closing time, link) are kept,
-- never the email, its sender or its recipient. Members read; owners and members add and change; viewers read only; nothing is deleted.
-- Reversible: drop table arch.hunt_inbox;

create table if not exists arch.hunt_inbox (
  id           uuid primary key default gen_random_uuid(),
  practice_id  uuid not null references arch.practice(id) on delete restrict,
  rfx_id       text not null check (rfx_id ~ '^[0-9]{4,12}$'),
  ref          text check (ref is null or length(ref) <= 80),
  organisation text check (organisation is null or length(organisation) <= 200),
  name         text not null check (length(btrim(name)) > 0 and length(name) <= 300),
  closes_at    timestamptz,
  url          text not null check (url ~ '^https://www\.gets\.govt\.nz/' and length(url) <= 300),
  kind         text not null default 'current' check (kind in ('current', 'future')),
  added_by     uuid not null default auth.uid(),
  added_at     timestamptz not null default now(),
  extra        jsonb not null default '{}'::jsonb check (jsonb_typeof(extra) = 'object'),
  unique (practice_id, rfx_id)
);

create index if not exists hunt_inbox_practice_idx on arch.hunt_inbox (practice_id, added_at desc);

alter table arch.hunt_inbox enable row level security;
revoke all on arch.hunt_inbox from public, anon;
grant all on arch.hunt_inbox to service_role;
grant select, insert, update on arch.hunt_inbox to authenticated;   -- no delete

do $policies$
declare
  p record;
  specs jsonb := jsonb_build_array(
    jsonb_build_object('n', 'hunt_inbox_select', 'c', 'select', 'u', 'arch.is_member(practice_id)'),
    jsonb_build_object('n', 'hunt_inbox_insert', 'c', 'insert', 'w', 'arch.can_write(practice_id) and added_by = auth.uid()'),
    jsonb_build_object('n', 'hunt_inbox_update', 'c', 'update', 'u', 'arch.can_write(practice_id)', 'w', 'arch.can_write(practice_id)')
  );
begin
  for p in select * from jsonb_to_recordset(specs) as x(n text, c text, u text, w text) loop
    if not exists (select 1 from pg_policies where schemaname = 'arch' and tablename = 'hunt_inbox' and policyname = p.n) then
      execute format('create policy %I on arch.hunt_inbox for %s to authenticated %s %s',
        p.n, p.c,
        case when p.u is not null then 'using (' || p.u || ')' else '' end,
        case when p.w is not null then 'with check (' || p.w || ')' else '' end);
    end if;
  end loop;
end
$policies$;

comment on table arch.hunt_inbox is 'Tenders read from GETS alert emails that a person added. Public notice fields only.';
