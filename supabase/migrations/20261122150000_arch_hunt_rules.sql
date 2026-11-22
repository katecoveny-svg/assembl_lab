-- Found work, "Rule changes coming": a read-only window onto the Parliament bills the assembl radar has already collected
-- (public.kb_documents from the source 'NZ Parliament — Bills API' in public.kb_sources). A bill is a rule that may change, never a tender or a lead.
-- NOT APPLIED. Dry run on PGlite only (tests/architecture-db/hunt-rules.test.mjs). Apply to staging first, then production on Kate's word.
--
--   arch.hunt_rules(p_practice uuid, p_since timestamptz) -> up to 200 bills, newest first
--
-- Who: signed-in members of that practice (owner, member or viewer). Anyone else gets a refusal; anon cannot run it.
-- What: the title, the bill page link (bills.parliament.nz), the day it was last updated, the source's name, the bill's status and current stage
--       (short public words such as 'Active' and 'Select Committee', read from the document's metadata), and a snippet of at most 200
--       characters for ranking only (the page never shows it). Never the full text.
-- Which source: the active source named below, confirmed by reading public.kb_sources (read only) on 22 Nov 2026: 166 bills, refreshed that day.
-- Window: the last 365 days unless the caller asks for less or more, never more than 730 days, never more than 200 rows, and only titles that
--         name the built environment (a broad word list; the page's rules, architecture/js/rules-rank.js, decide what is shown).
-- Writes nothing. search_path is empty, every name is schema-qualified. The practice's words are not sent here.
-- Reversible: drop function arch.hunt_rules(uuid, timestamptz);

create or replace function arch.hunt_rules(p_practice uuid, p_since timestamptz default null)
returns table (
  id uuid, source text, title text, url text, published_at timestamptz, bill_status text, current_stage text, snippet text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not arch.is_member(p_practice) then
    raise exception 'Only members of this practice can look at rule changes.' using errcode = '42501';
  end if;
  return query
    select d.id, s.name::text, left(btrim(d.title), 300), d.url::text, coalesce(d.published_at, d.inserted_at),
           left(btrim(coalesce(d.metadata ->> 'bill_status', '')), 40), left(btrim(coalesce(d.metadata ->> 'current_stage', '')), 40),
           left(btrim(regexp_replace(left(coalesce(d.content, ''), 1000), '\s+', ' ', 'g')), 200)
    from public.kb_documents d
    join public.kb_sources s on s.id = d.source_id
    where s.active
      and s.name = 'NZ Parliament — Bills API'
      and d.url like 'https://bills.parliament.nz/%'
      and coalesce(d.published_at, d.inserted_at) >= greatest(coalesce(p_since, now() - interval '365 days'), now() - interval '730 days')
      -- only titles that name the built environment: the source carries every bill, and without this the cap would hold bills about other things.
      -- The page's own rules (rules-rank.js) then decide, and drop the near misses (building societies, capacity building).
      and d.title ~* '(building|construction|resource management|planning|housing|heritage|historic places|local government|infrastructure|unit title|māori land|maori land|te ture whenua|fire and emergency|natural hazard|public works|urban development|water services|school|education and training|accessibility|kāinga|kainga|earthquake|fast-track|occupational licensing|architect|engineer|plumb|drainlay|electrical|health and safety at work|climate)'
    order by coalesce(d.published_at, d.inserted_at) desc
    limit 200;
end
$$;

revoke all on function arch.hunt_rules(uuid, timestamptz) from public, anon, authenticated;
grant execute on function arch.hunt_rules(uuid, timestamptz) to authenticated;
