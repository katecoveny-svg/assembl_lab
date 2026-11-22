-- Found work, "Read GETS alerts from Gmail": a small Google Apps Script in the practice's own Gmail reads the daily GETS alert emails, parses them
-- (the same parser as the page: architecture/js/gets-alert.js) and files the tenders it found through arch.hunt_inbox_ingest. There is no forwarding
-- address and nothing is sent to the practice's mail domain: the script only reads, and only posts public notice fields.
-- NOT APPLIED. Dry run on PGlite only (tests/architecture-db/hunt-inbox-reader.test.mjs). Apply to staging first, then production on Kate's word.
--
--   arch.hunt_inbox_route                         one row per reader token: only the sha256 of the token is kept; the hash is never selectable
--   arch.hunt_inbox_new_token(practice) -> text   owner only: ends the old token, makes a new one, returns it once
--   arch.hunt_inbox_stop_reader(practice)         owner only: ends the token
--   arch.hunt_inbox_reader_status(practice)       any member: is a reader on, when it last filed and how many notices
--   arch.hunt_inbox_ingest(token, items) -> int   the token is the credential, so anon may call it. At most 48 calls a day (UTC) per token, 300 items a call.
--
-- Random and hash: both are built into Postgres (gen_random_uuid(), sha256(bytea)), so no extension is needed in Supabase or in the dry run.
-- The token is two random UUIDs without dashes: 64 hex characters, 244 random bits. If pgcrypto is preferred, extensions.gen_random_bytes(32) is a one-line swap.
-- Reversible: drop function arch.hunt_inbox_ingest(text, jsonb), arch.hunt_inbox_reader_status(uuid), arch.hunt_inbox_stop_reader(uuid), arch.hunt_inbox_new_token(uuid); drop table arch.hunt_inbox_route;

create table if not exists arch.hunt_inbox_route (
  id           uuid primary key default gen_random_uuid(),
  practice_id  uuid not null references arch.practice(id) on delete restrict,
  token_hash   bytea not null unique check (octet_length(token_hash) = 32),
  label        text not null default 'Gmail reader' check (length(label) <= 80),
  created_by   uuid not null default auth.uid(),
  created_at   timestamptz not null default now(),
  last_used_at timestamptz,
  last_count   integer not null default 0,
  calls_day    date,
  calls_count  integer not null default 0,
  revoked_at   timestamptz,
  extra        jsonb not null default '{}'::jsonb check (jsonb_typeof(extra) = 'object')
);
create unique index if not exists hunt_inbox_route_one_live on arch.hunt_inbox_route (practice_id) where revoked_at is null;

alter table arch.hunt_inbox_route enable row level security;
revoke all on arch.hunt_inbox_route from public, anon, authenticated;
grant all on arch.hunt_inbox_route to service_role;
-- owners read their practice's rows, and only these columns: token_hash is not among them
grant select (id, practice_id, label, created_by, created_at, last_used_at, last_count, calls_day, calls_count, revoked_at, extra) on arch.hunt_inbox_route to authenticated;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname = 'arch' and tablename = 'hunt_inbox_route' and policyname = 'hunt_inbox_route_select') then
    create policy hunt_inbox_route_select on arch.hunt_inbox_route for select to authenticated using (arch.is_owner(practice_id));
  end if;
end $p$;

create or replace function arch.hunt_inbox_new_token(p_practice uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare tok text;
begin
  if auth.uid() is null or not arch.is_owner(p_practice) then
    raise exception 'Only an owner of this practice can make a reader.' using errcode = '42501';
  end if;
  update arch.hunt_inbox_route set revoked_at = now() where practice_id = p_practice and revoked_at is null;
  tok := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  insert into arch.hunt_inbox_route (practice_id, token_hash, created_by) values (p_practice, sha256(convert_to(tok, 'UTF8')), auth.uid());
  return tok;
end
$$;

create or replace function arch.hunt_inbox_stop_reader(p_practice uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not arch.is_owner(p_practice) then
    raise exception 'Only an owner of this practice can stop a reader.' using errcode = '42501';
  end if;
  update arch.hunt_inbox_route set revoked_at = now() where practice_id = p_practice and revoked_at is null;
end
$$;

create or replace function arch.hunt_inbox_reader_status(p_practice uuid)
returns table (reader_on boolean, since timestamptz, last_used_at timestamptz, last_count integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not arch.is_member(p_practice) then
    raise exception 'Only members of this practice can look at its reader.' using errcode = '42501';
  end if;
  return query
    select r.id is not null, r.created_at, r.last_used_at, coalesce(r.last_count, 0)
    from (select 1) one left join arch.hunt_inbox_route r on r.practice_id = p_practice and r.revoked_at is null;
end
$$;

create or replace function arch.hunt_inbox_ingest(p_token text, p_items jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  route arch.hunt_inbox_route%rowtype;
  it jsonb; n integer := 0; rfx text; link text; nm text; closes timestamptz; kd text;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    raise exception 'This reader is not on.' using errcode = '42501';
  end if;
  select * into route from arch.hunt_inbox_route r where r.token_hash = sha256(convert_to(p_token, 'UTF8')) and r.revoked_at is null for update;
  if not found then
    raise exception 'This reader is not on.' using errcode = '42501';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'Send a list of notices.' using errcode = '22023';
  end if;
  if jsonb_array_length(p_items) > 300 then
    raise exception 'At most 300 notices in one call.' using errcode = '54000';
  end if;
  if route.calls_day = current_date and route.calls_count >= 48 then
    raise exception 'This reader has called 48 times today. It can call again tomorrow.' using errcode = '54000';
  end if;
  update arch.hunt_inbox_route set calls_day = current_date, calls_count = case when calls_day = current_date then calls_count + 1 else 1 end where id = route.id;

  for it in select * from jsonb_array_elements(p_items) loop
    if jsonb_typeof(it) <> 'object' then continue; end if;
    rfx := it ->> 'rfx_id'; link := it ->> 'url'; nm := left(btrim(coalesce(it ->> 'name', '')), 300); kd := it ->> 'kind';
    if rfx is null or rfx !~ '^[0-9]{4,12}$' then continue; end if;
    if link is null or length(link) > 300 or link !~ '^https://www\.gets\.govt\.nz/[A-Za-z0-9_-]{1,40}/ExternalTenderDetails\.htm\?id=[0-9]{4,12}$' or right(link, length(rfx)) <> rfx then continue; end if;
    if nm = '' or kd is null or kd not in ('current', 'future') then continue; end if;
    begin closes := (it ->> 'closes_at')::timestamptz; exception when others then closes := null; end;
    insert into arch.hunt_inbox (practice_id, rfx_id, ref, organisation, name, closes_at, url, kind, added_by, extra)
    values (route.practice_id, rfx, nullif(left(btrim(coalesce(it ->> 'ref', '')), 80), ''), nullif(left(btrim(coalesce(it ->> 'organisation', '')), 200), ''), nm, closes, link, kd, route.created_by, jsonb_build_object('via', 'gmail reader'))
    on conflict (practice_id, rfx_id) do update
      set name = excluded.name,
          closes_at = coalesce(excluded.closes_at, arch.hunt_inbox.closes_at),
          ref = coalesce(excluded.ref, arch.hunt_inbox.ref),
          organisation = coalesce(excluded.organisation, arch.hunt_inbox.organisation),
          kind = case when arch.hunt_inbox.kind = 'current' then 'current' else excluded.kind end;
    n := n + 1;
  end loop;

  update arch.hunt_inbox_route set last_used_at = now(), last_count = n where id = route.id;
  return n;
end
$$;

revoke all on function arch.hunt_inbox_new_token(uuid), arch.hunt_inbox_stop_reader(uuid), arch.hunt_inbox_reader_status(uuid), arch.hunt_inbox_ingest(text, jsonb) from public, anon, authenticated;
grant execute on function arch.hunt_inbox_new_token(uuid), arch.hunt_inbox_stop_reader(uuid), arch.hunt_inbox_reader_status(uuid) to authenticated;
grant execute on function arch.hunt_inbox_ingest(text, jsonb) to anon, authenticated;

-- The reader is not signed in: the token is its credential. For the API to find the function at all, anon needs to see the schema. That is all it gets:
-- no table in arch is granted to anon, and every function but the one above stays closed to it.
grant usage on schema arch to anon;
