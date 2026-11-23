-- arch schema: comments and pins (the workspace redesign, phase 2: collaboration).
-- Additive only. Safe to run twice. Nothing is dropped. NOT APPLIED: an owner of the Supabase project applies it.
-- Needs the earlier arch migrations (arch.is_member, arch.can_write, arch.is_owner, arch.project_practice, arch.file,
-- arch.project_share).
--
-- What it does
--   arch.comment               one row per comment. It belongs to a project, and may name one file (a still, film, drawing
--                              sheet or model) and, on a still, a point on it (pin_x, pin_y as 0 to 1 fractions of the
--                              picture; pin_no is its number on that file). Plain text only, at most 2,000 characters.
--     members                  read and write their own practice's comments through row level security (owners and members
--                              write; viewers read). They @mention other members of the practice (mentions).
--     owners                   alone can hide a comment (the only column anyone can update) or delete it.
--     clients                  never touch the table. A client comment comes in only through arch.client_comment_add(),
--                              which the server (service_role) calls with the share token; it is stored tied to that token
--                              (via_token_hash) and is read back only while a link with that token is on.
--   arch.comment_hit           one row per client comment, for the rate limit: by share token and by (hashed) address.
--                              Server only. Holds no raw address.
--   arch.client_comments(token)    what the client page shows: comments marked for the client (to_client), not hidden, and,
--                              of client comments, only those written under this token. Null for any other token.
--   arch.client_comment_add(...)   checks the token, the lengths and the rate limit, then writes. Raises 'not_shared',
--                              'bad_comment' or 'rate_limited'.
-- The limits below (8 comments in 10 minutes for one address on one link; 40 in an hour for one link) are the same numbers as
-- RATE in architecture/js/comments-rules.js; tests/architecture/comments.test.mjs reads this file to keep them in step.
-- Reversible: drop function arch.client_comment_add(text, text, text, text, uuid, numeric, numeric), arch.client_comments(text);
--   drop table arch.comment_hit; drop table arch.comment; drop function arch.comment_before_insert(), arch.comment_before_update();

create table if not exists arch.comment (
  id             uuid primary key default gen_random_uuid(),
  practice_id    uuid not null references arch.practice(id) on delete restrict,
  project_id     uuid not null references arch.project(id) on delete cascade,
  file_id        uuid references arch.file(id) on delete cascade,
  pin_x          numeric(5, 4) check (pin_x is null or (pin_x >= 0 and pin_x <= 1)),
  pin_y          numeric(5, 4) check (pin_y is null or (pin_y >= 0 and pin_y <= 1)),
  pin_no         integer check (pin_no is null or pin_no > 0),
  author_kind    text not null default 'member' check (author_kind in ('member', 'client')),
  author_id      uuid default auth.uid(),
  author_name    text not null check (length(btrim(author_name)) between 1 and 60 and author_name !~ '[\x01-\x08\x0b\x0c\x0e-\x1f\x7f]'),
  body           text not null check (length(btrim(body)) between 1 and 2000 and body !~ '[\x01-\x08\x0b\x0c\x0e-\x1f\x7f]'),
  mentions       uuid[] not null default '{}',
  to_client      boolean not null default false,
  via_token_hash text,
  hidden         boolean not null default false,
  hidden_by      uuid,
  hidden_at      timestamptz,
  created_at     timestamptz not null default now(),
  constraint comment_pin_whole check ((pin_x is null) = (pin_y is null)),
  constraint comment_pin_on_file check (pin_x is null or file_id is not null),
  constraint comment_member_has_author check (author_kind <> 'member' or (author_id is not null and via_token_hash is null)),
  constraint comment_client_has_token check (author_kind <> 'client' or (author_id is null and via_token_hash is not null and to_client))
);
create index if not exists comment_project_idx on arch.comment (project_id, created_at);
create index if not exists comment_file_idx on arch.comment (file_id) where file_id is not null;
create unique index if not exists comment_pin_no_idx on arch.comment (file_id, pin_no) where pin_no is not null;

-- A comment belongs to the practice of its project, a file it names belongs to the same project, and only people who are
-- members of the practice stay in mentions. A pin gets the next number on its file.
create or replace function arch.comment_before_insert()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_file_project uuid;
begin
  if arch.project_practice(new.project_id) is distinct from new.practice_id then
    raise exception 'comment: that project is not in this practice' using errcode = '23514';
  end if;
  if new.file_id is not null then
    select f.project_id into v_file_project from arch.file f where f.id = new.file_id;
    if v_file_project is distinct from new.project_id then
      raise exception 'comment: that file is not in this project' using errcode = '23514';
    end if;
  end if;
  new.mentions := coalesce(array(select m.user_id from arch.practice_member m where m.practice_id = new.practice_id and m.user_id = any(new.mentions)), '{}');
  if new.pin_x is not null then
    perform pg_advisory_xact_lock(hashtextextended(new.file_id::text, 0));
    select coalesce(max(c.pin_no), 0) + 1 into new.pin_no from arch.comment c where c.file_id = new.file_id and c.pin_no is not null;
  else
    new.pin_no := null;
  end if;
  return new;
end
$$;
drop trigger if exists comment_before_insert on arch.comment;
create trigger comment_before_insert before insert on arch.comment for each row execute function arch.comment_before_insert();

-- Hiding is the only change a comment takes; who hid it and when are filled in here, never sent.
create or replace function arch.comment_before_update()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.hidden then
    new.hidden_by := coalesce(old.hidden_by, auth.uid());
    new.hidden_at := coalesce(old.hidden_at, now());
  else
    new.hidden_by := null;
    new.hidden_at := null;
  end if;
  return new;
end
$$;
drop trigger if exists comment_before_update on arch.comment;
create trigger comment_before_update before update on arch.comment for each row execute function arch.comment_before_update();

-- trigger functions are not for anyone to call
revoke all on function arch.comment_before_insert() from public, anon, authenticated;
revoke all on function arch.comment_before_update() from public, anon, authenticated;

alter table arch.comment enable row level security;
revoke all on arch.comment from public, anon, authenticated;
grant all on arch.comment to service_role;
grant select, insert, delete on arch.comment to authenticated;
-- the only column a signed-in person can change: whether a comment is hidden (and the policy below limits that to owners)
grant update (hidden) on arch.comment to authenticated;

do $policies$
begin
  -- members read their practice's comments; a hidden one is read by owners only
  if not exists (select 1 from pg_policies where schemaname = 'arch' and tablename = 'comment' and policyname = 'comment_select') then
    create policy comment_select on arch.comment for select to authenticated
      using (arch.is_member(practice_id) and (not hidden or arch.is_owner(practice_id)));
  end if;
  -- owners and members write, as themselves, as a member comment, in the practice of the project
  if not exists (select 1 from pg_policies where schemaname = 'arch' and tablename = 'comment' and policyname = 'comment_insert') then
    create policy comment_insert on arch.comment for insert to authenticated
      with check (arch.can_write(practice_id) and author_kind = 'member' and author_id = auth.uid() and via_token_hash is null
        and not hidden and practice_id = arch.project_practice(project_id));
  end if;
  -- owners alone hide or show a comment
  if not exists (select 1 from pg_policies where schemaname = 'arch' and tablename = 'comment' and policyname = 'comment_hide') then
    create policy comment_hide on arch.comment for update to authenticated
      using (arch.is_owner(practice_id)) with check (arch.is_owner(practice_id));
  end if;
  -- owners alone delete
  if not exists (select 1 from pg_policies where schemaname = 'arch' and tablename = 'comment' and policyname = 'comment_delete') then
    create policy comment_delete on arch.comment for delete to authenticated
      using (arch.is_owner(practice_id));
  end if;
end
$policies$;

-- The rate limit's own table: server only (no grant, no policy). It keeps a hash of the address, never the address.
create table if not exists arch.comment_hit (
  id         bigint generated always as identity primary key,
  project_id uuid not null references arch.project(id) on delete cascade,
  token_hash text not null,
  ip_hash    text not null,
  at         timestamptz not null default now()
);
create index if not exists comment_hit_token_idx on arch.comment_hit (token_hash, at);
alter table arch.comment_hit enable row level security;
revoke all on arch.comment_hit from public, anon, authenticated;
grant all on arch.comment_hit to service_role;

create or replace function arch.client_comments(p_token text)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select case when s.project_id is null then null else jsonb_build_object(
    'project_id', s.project_id,
    'comments', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'file_id', c.file_id, 'pin_x', c.pin_x, 'pin_y', c.pin_y, 'pin_no', c.pin_no,
        'from', c.author_kind, 'by', c.author_name, 'body', c.body, 'at', c.created_at) order by c.created_at, c.id)
      from arch.comment c
      where c.project_id = s.project_id and c.to_client and not c.hidden
        and (c.author_kind = 'member' or c.via_token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex'))), '[]'::jsonb)
  ) end
  from (select 1) one
  left join arch.project_share s on s.shared and s.token is not null and s.token = p_token and p_token ~ '^[a-f0-9]{64}$'
$$;
revoke all on function arch.client_comments(text) from public, anon, authenticated;
grant execute on function arch.client_comments(text) to service_role;

create or replace function arch.client_comment_add(p_token text, p_ip_hash text, p_name text, p_body text,
  p_file uuid default null, p_pin_x numeric default null, p_pin_y numeric default null)
returns jsonb
language plpgsql volatile security definer set search_path = ''
as $$
declare
  s arch.project_share;
  v_hash text;
  v_name text := btrim(coalesce(p_name, ''));
  v_body text := btrim(coalesce(p_body, ''));
  c arch.comment;
begin
  select * into s from arch.project_share sh
    where sh.shared and sh.token is not null and sh.token = p_token and p_token ~ '^[a-f0-9]{64}$';
  if not found then raise exception 'not_shared' using errcode = '42501'; end if;
  if length(v_name) not between 1 and 60 or length(v_body) not between 1 and 2000
     or coalesce(p_ip_hash, '') !~ '^[a-f0-9]{16,64}$'
     or ((p_pin_x is null) <> (p_pin_y is null)) or (p_pin_x is not null and p_file is null) then
    raise exception 'bad_comment' using errcode = '22023';
  end if;
  v_hash := encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
  delete from arch.comment_hit h where h.at < now() - interval '1 day';
  if (select count(*) from arch.comment_hit h where h.token_hash = v_hash and h.ip_hash = p_ip_hash and h.at > now() - interval '10 minutes') >= 8
     or (select count(*) from arch.comment_hit h where h.token_hash = v_hash and h.at > now() - interval '1 hour') >= 40 then
    raise exception 'rate_limited' using errcode = '54000';
  end if;
  insert into arch.comment (practice_id, project_id, file_id, pin_x, pin_y, author_kind, author_id, author_name, body, to_client, via_token_hash)
    values (s.practice_id, s.project_id, p_file, p_pin_x, p_pin_y, 'client', null, v_name, v_body, true, v_hash)
    returning * into c;
  insert into arch.comment_hit (project_id, token_hash, ip_hash) values (s.project_id, v_hash, p_ip_hash);
  return jsonb_build_object('id', c.id, 'file_id', c.file_id, 'pin_x', c.pin_x, 'pin_y', c.pin_y, 'pin_no', c.pin_no,
    'from', c.author_kind, 'by', c.author_name, 'body', c.body, 'at', c.created_at);
end
$$;
revoke all on function arch.client_comment_add(text, text, text, text, uuid, numeric, numeric) from public, anon, authenticated;
grant execute on function arch.client_comment_add(text, text, text, text, uuid, numeric, numeric) to service_role;
