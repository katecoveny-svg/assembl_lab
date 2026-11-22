-- Found work ("auto hunting the pipeline"): a read-only window onto the public tender notices the assembl radar has already collected
-- (public.kb_documents from public.kb_sources, for example "GETS — Government tenders").
-- NOT APPLIED. Dry run on PGlite only (tests/architecture-db/hunt.test.mjs). Apply to staging first, then production on Kate's word.
--
--   arch.hunt_signals(p_practice uuid, p_since timestamptz) -> up to 300 public notices, newest first
--
-- Who: signed-in members of that practice (owner, member or viewer). Anyone else gets a refusal; anon cannot run it.
-- What: only fields of the public notice: title, source name, link, published and collected dates, category, and four short pieces
--       read out of the notice's own text (buyer, closing date as GETS wrote it, region, UNSPSC categories), plus a snippet of at
--       most 200 characters of its overview. Never the full text, never anything about the practice or what it looks for.
-- Which sources: active sources in the categories 'tenders' and 'opportunity_horizon' only.
-- Writes nothing. search_path is empty, every name is schema-qualified. The practice's words are not sent here: scoring is done in
-- the browser (architecture/js/hunt-rank.js, ported from the radar's radar-rank.ts).
-- Reversible: drop function arch.hunt_signals(uuid, timestamptz);

create or replace function arch.hunt_signals(p_practice uuid, p_since timestamptz default null)
returns table (
  id uuid, source text, category text, tier integer, title text, url text,
  published_at timestamptz, inserted_at timestamptz, snippet text,
  buyer text, closes_text text, region text, categories text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not arch.is_member(p_practice) then
    raise exception 'Only members of this practice can look at found work.' using errcode = '42501';
  end if;
  return query
    select d.id, s.name::text, s.category::text, s.authority_tier::integer, left(d.title, 200), d.url::text,
           d.published_at, d.inserted_at,
           left(btrim(coalesce(substring(flat.t from 'Overview: (.*)$'), '')), 200),
           left(btrim(coalesce(substring(flat.t from 'Organisation: (.*?) (?:Open date|Close date|Categories|Region|Overview):'), '')), 200),
           left(btrim(coalesce(substring(flat.t from 'Close date: (.*?) (?:Categories|Region|Overview):'), '')), 80),
           left(btrim(coalesce(substring(flat.t from 'Region: (.*?) Overview:'), '')), 200),
           left(btrim(coalesce(substring(flat.t from 'Categories: (.*?) Region:'), '')), 200)
    from public.kb_documents d
    join public.kb_sources s on s.id = d.source_id
    cross join lateral (select regexp_replace(left(coalesce(d.content, ''), 8000), '\s+', ' ', 'g') as t) flat
    where s.active
      and s.category in ('tenders', 'opportunity_horizon')
      and d.inserted_at >= greatest(coalesce(p_since, now() - interval '14 days'), now() - interval '60 days')
    order by d.inserted_at desc
    limit 300;
end
$$;

revoke all on function arch.hunt_signals(uuid, timestamptz) from public, anon, authenticated;
grant execute on function arch.hunt_signals(uuid, timestamptz) to authenticated;
