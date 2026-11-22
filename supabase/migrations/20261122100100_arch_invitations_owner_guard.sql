-- arch schema, part 5: invitations, the people list, leaving a practice, and the last-owner guard.
-- Additive only. Safe to run twice. Nothing is dropped.
-- Writes nothing outside the arch schema. Two functions READ Supabase's own sign-in tables:
--   arch.verified_email()   reads auth.identities (is this address verified by Google for this account?)
--   arch.practice_people()  reads auth.users      (the email and name of the people in your own practice)

-- 1. Invitations. An owner names an email address and a role. Nothing is emailed.
--    The invited person signs in with Google; they are added only when Google has verified that same address for them.
create table if not exists arch.invitation (
  id          uuid primary key default gen_random_uuid(),
  practice_id uuid not null references arch.practice(id) on delete cascade,
  email       text not null check (email = lower(btrim(email)) and email like '%_@_%'),
  role        text not null check (role in ('owner', 'member', 'viewer')),
  invited_by  uuid not null default auth.uid(),
  created_at  timestamptz not null default now(),
  accepted_at timestamptz,
  accepted_by uuid,
  extra       jsonb not null default '{}'::jsonb check (jsonb_typeof(extra) = 'object')
);
-- one open invitation per address per practice
create unique index if not exists invitation_open_idx on arch.invitation (practice_id, email) where accepted_at is null;
create index if not exists invitation_email_idx on arch.invitation (email) where accepted_at is null;

alter table arch.invitation enable row level security;
revoke all on arch.invitation from public, anon;
grant all on arch.invitation to service_role;
-- No update for signed-in people: an invitation is accepted only through arch.accept_invitation() below.
grant select, insert, delete on arch.invitation to authenticated;

do $policies$
begin
  if not exists (select 1 from pg_policies where schemaname = 'arch' and tablename = 'invitation' and policyname = 'invitation_select') then
    create policy invitation_select on arch.invitation for select to authenticated
      using (arch.is_owner(practice_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'arch' and tablename = 'invitation' and policyname = 'invitation_insert') then
    create policy invitation_insert on arch.invitation for insert to authenticated
      with check (arch.is_owner(practice_id) and invited_by = auth.uid() and accepted_at is null and accepted_by is null);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'arch' and tablename = 'invitation' and policyname = 'invitation_delete') then
    create policy invitation_delete on arch.invitation for delete to authenticated
      using (arch.is_owner(practice_id) and accepted_at is null);
  end if;
  -- A person may take themselves out of a practice. (Owners could already remove anyone.)
  if not exists (select 1 from pg_policies where schemaname = 'arch' and tablename = 'practice_member' and policyname = 'member_leave') then
    create policy member_leave on arch.practice_member for delete to authenticated
      using (user_id = auth.uid());
  end if;
end
$policies$;

-- 2. The signed-in person's email address, only if Google has verified it for this account. Otherwise null.
--    The address is read from the sign-in token, never from an argument. Three things must all be true:
--      a. the token carries an email, and is not an anonymous sign-in;
--      b. the token says this account signs in with Google (app_metadata, which a person cannot edit);
--      c. Supabase's own record of the Google identity for this account has the same address, marked verified by Google.
--    (c) is there because the "email_verified" flag inside a token's user_metadata can be edited by the person themselves.
create or replace function arch.verified_email()
returns text
language plpgsql stable security definer set search_path = ''
as $$
declare
  claims jsonb := auth.jwt();
  mail   text  := lower(btrim(coalesce(claims ->> 'email', '')));
begin
  if auth.uid() is null or mail = '' then return null; end if;
  if coalesce(claims ->> 'is_anonymous', 'false') = 'true' then return null; end if;
  if not (coalesce(claims -> 'app_metadata' -> 'providers', '[]'::jsonb) ? 'google') then return null; end if;
  if not exists (
    select 1 from auth.identities i
    where i.user_id = auth.uid()
      and i.provider = 'google'
      and lower(i.identity_data ->> 'email') = mail
      and coalesce(i.identity_data ->> 'email_verified', 'false') = 'true'
  ) then
    return null;
  end if;
  return mail;
end
$$;

-- 3. The open invitations for the signed-in person's verified address, with the practice's name.
create or replace function arch.my_invitations()
returns table (id uuid, practice_id uuid, practice_name text, role text, created_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select i.id, i.practice_id, p.name, i.role, i.created_at
  from arch.invitation i
  join arch.practice p on p.id = i.practice_id
  where i.accepted_at is null and i.email = arch.verified_email()
  order by i.created_at
$$;

-- 4. Accept one invitation. The argument is the invitation's id, not an address: the address comes from the token.
--    Someone already in the practice keeps the role they have. Returns the practice id.
create or replace function arch.accept_invitation(p_invitation uuid)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  mail text := arch.verified_email();
  inv  record;
begin
  if mail is null then
    raise exception 'Sign in with a Google account whose email Google has verified to accept an invitation'
      using errcode = '42501';
  end if;
  select i.id, i.practice_id, i.role into inv
  from arch.invitation i
  where i.id = p_invitation and i.accepted_at is null and i.email = mail
  for update;
  if not found then
    raise exception 'There is no open invitation for this account' using errcode = '42501';
  end if;
  insert into arch.practice_member (practice_id, user_id, role)
  values (inv.practice_id, auth.uid(), inv.role)
  on conflict (practice_id, user_id) do nothing;
  update arch.invitation set accepted_at = now(), accepted_by = auth.uid() where id = inv.id;
  return inv.practice_id;
end
$$;

-- 5. The people in a practice, with the email and name on their account. Only for members of that practice.
create or replace function arch.practice_people(p_practice uuid)
returns table (user_id uuid, email text, name text, role text, created_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select m.user_id, u.email::text,
         coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', '')::text,
         m.role, m.created_at
  from arch.practice_member m
  join auth.users u on u.id = m.user_id
  where m.practice_id = p_practice and arch.is_member(p_practice)
  order by m.created_at
$$;

-- 6. A practice always keeps at least one owner: the last owner cannot be removed, demoted or leave.
--    Applies to everyone, service_role included. Deleting the whole practice is still possible (for an administrator).
create or replace function arch.keep_one_owner()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  still_owner boolean := false;
begin
  if old.role = 'owner' then
    if tg_op = 'UPDATE' then
      still_owner := (new.role = 'owner' and new.practice_id = old.practice_id);
    end if;
    if not still_owner then
      -- Lock the practice so two owners cannot remove each other at the same moment.
      perform 1 from arch.practice p where p.id = old.practice_id for update;
      -- "found" is false when the practice itself is being deleted: then its members may go with it.
      if found and not exists (
        select 1 from arch.practice_member m
        where m.practice_id = old.practice_id and m.role = 'owner' and m.user_id <> old.user_id
      ) then
        raise exception 'A practice must keep at least one owner. Make someone else an owner first.'
          using errcode = '23514';
      end if;
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end
$$;

do $triggers$
begin
  if not exists (select 1 from pg_trigger g where g.tgname = 'practice_member_keep_owner_trg' and g.tgrelid = 'arch.practice_member'::regclass and not g.tgisinternal) then
    create trigger practice_member_keep_owner_trg before update or delete on arch.practice_member
      for each row execute function arch.keep_one_owner();
  end if;
end
$triggers$;

-- New functions are open to everyone by default in Postgres: close them, then open only what signed-in people need.
revoke all on function arch.verified_email(), arch.my_invitations(), arch.accept_invitation(uuid),
  arch.practice_people(uuid), arch.keep_one_owner() from public, anon;
grant execute on function arch.verified_email(), arch.my_invitations(), arch.accept_invitation(uuid),
  arch.practice_people(uuid) to authenticated, service_role;
