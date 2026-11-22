-- Found work, "Leads to look into": a read-only window onto news stories the assembl radar has already collected
-- (public.kb_documents from four news sources in public.kb_sources). A story is a lead for a practice to look into, never a tender.
-- NOT APPLIED. Dry run on PGlite only (tests/architecture-db/hunt-leads.test.mjs). Apply to staging first, then production on Kate's word.
--
--   arch.hunt_leads(p_practice uuid, p_since timestamptz) -> up to 300 news stories, newest first
--
-- Who: signed-in members of that practice (owner, member or viewer). Anyone else gets a refusal; anon cannot run it.
-- What: the headline, the link, the day it was published, the source's name, and a snippet of at most 200 characters. The snippet
--       is for ranking in the browser only: the page never shows it (news is copyright). Never the full text.
-- Which sources: the active sources named below, confirmed by reading public.kb_sources (read only) on 22 Nov 2026:
--       'Stuff — Top stories', 'RNZ — Top stories', 'Newsroom NZ', 'The Daily Blog'.
-- Window: the last 30 days unless the caller asks for less or more, never more than 60 days, never more than 300 rows.
-- Writes nothing. search_path is empty, every name is schema-qualified. The practice's words are not sent here: ranking is done in
-- the browser (architecture/js/hunt-rank.js, rankLeads).
-- Reversible: drop function arch.hunt_leads(uuid, timestamptz);

create or replace function arch.hunt_leads(p_practice uuid, p_since timestamptz default null)
returns table (
  id uuid, source text, title text, url text, published_at timestamptz, snippet text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not arch.is_member(p_practice) then
    raise exception 'Only members of this practice can look at leads.' using errcode = '42501';
  end if;
  return query
    select d.id, s.name::text, left(btrim(d.title), 200), d.url::text, coalesce(d.published_at, d.inserted_at),
           left(btrim(regexp_replace(left(coalesce(d.content, ''), 1000), '\s+', ' ', 'g')), 200)
    from public.kb_documents d
    join public.kb_sources s on s.id = d.source_id
    where s.active
      and s.name in ('Stuff — Top stories', 'RNZ — Top stories', 'Newsroom NZ', 'The Daily Blog')
      and coalesce(d.published_at, d.inserted_at) >= greatest(coalesce(p_since, now() - interval '30 days'), now() - interval '60 days')
    order by coalesce(d.published_at, d.inserted_at) desc
    limit 300;
end
$$;

revoke all on function arch.hunt_leads(uuid, timestamptz) from public, anon, authenticated;
grant execute on function arch.hunt_leads(uuid, timestamptz) to authenticated;
