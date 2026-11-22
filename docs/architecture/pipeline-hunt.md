# Found work: owner note

## What it is
A strip of cards above the pipeline board on the Clients screen. Each card is a public tender notice that looks like work for the practice: who is buying, what for, where, when it closes, and how well it fits.

The workspace looks when the Clients screen opens, at most once a day per browser. A person presses "Add to pipeline" for the good ones. Nothing is contacted, registered for, sent or submitted, and nothing is added without a press.

A fit is a reading of the notice, not a promise. Read the tender documents before deciding.

## What a card does
- Buyer initials, title, a ring counting the days to close, a fit meter (strong, good or possible), a region chip and a source chip.
- "Why this" lists the reasons in plain words (matches "library", education work, in Waikato, closes in 15 days).
- "Add to pipeline" makes an enquiry in New. It carries the notice link and buyer in its source line, the closing day as the next action date, and "Read the tender documents" as the next action. The owner is left unset. No person is created for the buyer, and no value is entered: a value is only what a person types.
- "Not for us" hides the card. It is remembered for the practice in this browser. "Hidden" can be opened to bring one back.
- A notice already in the pipeline shows as added, so it cannot be added twice.
- "Looked at <time>" says when the list was fetched. If a source is down the page says so in plain words and keeps showing the last good list, marked as possibly out of date.

## What to look for
Set in "What to look for" on the strip. Keywords, regions, sectors, a usual value range, which sources are on, and the "Always show kaupapa Māori and Indigenous work" switch. Empty by default, and nothing is looked up until at least one keyword or sector is set (regions and a range alone find nothing).

- Signed in with a practice in use: kept in `practice.extra.hunt`, every member reads it, only an owner changes it (the database refuses anyone else).
- Signed out: kept as a setting in this browser.
- Viewers see cards but no buttons.

## Sources
Only public sources, read as published, with their terms respected. Nothing behind a login is ever read.

### 1. The radar (notices already collected)
- What: public tender notices the assembl radar already collects each day into `public.kb_documents`, from sources of the categories `tenders` and `opportunity_horizon` (for example the GETS tender list).
- How it is read: through `arch.hunt_signals(p_practice, p_since)`, a read-only function for signed-in members of the practice. It returns only public fields: title, source name, link, published and collected dates, category, buyer, closing date as GETS wrote it, region, UNSPSC categories, and a snippet of at most 200 characters. Not the full text. It takes nothing about the practice, so what the practice looks for never leaves the browser.
- Scoring happens in the browser (`architecture/js/hunt-rank.js`), against the practice's own words.
- Terms: it reads the assembl radar's own store, so no new third party is contacted. The radar's reading of GETS is covered by the same GETS terms as source 2.
- Cadence: as often as the radar runs. The page asks once a day.
- Status: the migration `supabase/migrations/20261122130000_arch_hunt_signals.sql` is written and tested on a local database only (`tests/architecture-db/hunt.test.mjs`). It is not applied. Until it is, the radar source reports "could not be read" and the page falls back to source 2.

### 2. GETS, read directly
- What: GETS, the NZ Government Electronic Tenders Service run by MBIE. Councils, the Ministry of Education, Health NZ, universities and most other public buyers post here.
- URL: the RSS feed linked from the public index page as "Current tenders", https://www.gets.govt.nz/ExternalRSSFeed.htm (index: https://www.gets.govt.nz/ExternalIndex.htm).
- Terms: https://www.gets.govt.nz/GetsTermsAndConditions.htm. Clause 3.5 makes GETS content Crown copyright (MBIE) and available for reuse under NZGOAL (CC BY 4.0) with attribution to MBIE; the strip carries that credit. Clause 3.2(e) forbids registered users from using spiders or robots. Only the published RSS feed is read, as a public feed intended for reuse. GETS pages, tender detail pages and anything behind sign-in are never read. This reading of the clauses is ours, not legal advice: if MBIE says otherwise, switch the source off in `api/_feeds/index.js` (one line) and keep the radar.
- Cadence: the feed is about 1 MB. The lab reads it at most once an hour per warm instance (`/api/live/?feeds=hunt`), and each browser asks once a day.
- Live check on 22 November 2026: answered, 362 open tenders, about 12 seconds.
- Failure: a plain message, and the other source's findings still show (the answer is marked partial).

### Looked at and left out
- Kāinga Ora tender pages: behind bot protection, so automated reading is not appropriate. Its tenders are also posted on GETS.
- Councils, the Ministry of Education, Health NZ and universities: they post on GETS, so they are covered by it. No separate page is read.
- Any page needing a login: never.

## The kaupapa Māori and Indigenous lens
Added 22 November 2026. A sector ("Kaupapa Māori and Indigenous"), a flag on every finding, a filter chip and one setting.

- What it is: a finding aid. It reads the words in a public notice (title, buyer and overview) and says which listed words it found. It does not judge cultural fit, it does not know whose rohe a place is in, and nobody is contacted. Cultural fit, tikanga and engagement with mana whenua are for people, not for this lens.
- The words: `CULTURAL_PLACES`, `CULTURAL_DESIGN`, `CULTURAL_BUYERS` and `CULTURAL_BUYER_PREFIXES` in `architecture/js/hunt-rank.js`, written with macrons. Matching is whole-word and macron-insensitive (`fold()`), so GETS notices that drop macrons still match. Bare "te", "whare" and "trust" never match, and a place name that only contains a Māori word ("Te Atatu", "Pouakai", "Whare Ra") does not. "Indigenous" does not count when it is followed by a planting word ("Indigenous planting"). A buyer whose name starts with Ngāti, Ngāi or Ngā counts.
- On every finding: `cultural: { on, why: [words] }`. The strip shows a small "Kaupapa Māori" badge (text and a line icon, no cultural imagery) on matched cards, and the matched words in "Why this".
- The chip: "Cultural work" with a count, at the top of the strip. It filters what is shown; it is not remembered and changes nothing that was found or hidden.
- The setting: the sector chip, and a checkbox "Always show kaupapa Māori and Indigenous work, whatever the other words", kept in `practice.extra.hunt` as `cultural: true`. When it is on, a cultural match is kept even if it misses the practice's words and sectors, and it gets a modest boost (+8). It must still be about buildings (the built, infrastructure and works rules apply) and must still be in the practice's regions. Cultural building words ("wharekura", "papakāinga", "fale" and so on) count as building words.
- Sector scoring: choosing the sector adds the same +12 as any other sector, found by the cultural words.
- The feed takes `cultural=1` and answers `values.signals[].cultural`. The radar path scores rows in the browser with the same rules.
- The day's kept answer is keyed with `lens=2`, so answers kept before the flag existed are not reused.
- Tests: `tests/live/hunt-cultural.test.mjs` (words, negatives, buyers, the setting, the boost) and the last block of `tests/architecture/hunt.test.mjs` (badge, chip, form, saving).
- Review: the lists should be read by a reo speaker before the lens is sold to anyone. The most ambiguous entries are "cultural centre", "cultural landscape", "carving", "pou", "taonga", "trust board" and "Indigenous".
- Where else this work is published: `docs/architecture/pipeline-hunt-cultural-sources.md`.

## How a fit is worked out
The same every time for the same notice, words and day.

- Starts at 18 for a real, dated tender.
- Plus 12 for each of the practice's keywords in the title (6 if only in the overview), up to 36. Plus 12 for each chosen sector found, up to 24.
- Plus 10 for a chosen region, 3 for a national notice.
- Plus 24 when the notice asks for design or advice.
- Minus 20 for infrastructure or equipment wording, and minus 20 for building works or supply with no design sought.
- A value the notice itself states, against the usual range: plus 8 inside, minus 15 outside. Most notices state none.
- Closing within 2 days minus 12, no closing date minus 8. Newer notices score a little higher (the radar's 14-day freshness).
- Plus 8 for a notice with kaupapa Māori or Indigenous words, only when the practice turned on "Always show" (see the lens above).
- Left out altogether: closed notices, other regions, software and equipment categories, and notices not about buildings or places.
- Only 45 and above is shown. At most 12 cards show; the rest say how many more fit.

Ported from the radar's `radar-rank` (terms, freshness, base weight) and `whaiao-hunt` (works and supply are not a fit unless design is sought). Nothing is ranked by a model: it is plain rules, so the reasons are the real ones.

## Where the code is
- `api/_feeds/hunt.js`: the feed and the GETS reader. `api/_feeds/hunt.js` re-exports the rules.
- `architecture/js/hunt-rank.js`: lens, GETS parsing, scoring, and `tenderFromKb` for radar rows. No network.
- `architecture/js/hunt-model.js`: settings, query, the enquiry made by "Add to pipeline", dismissals, the day's cache.
- `architecture/js/hunt.js` and `architecture/hunt.css`: the strip. `crm.js` draws it in the board.
- `architecture/js/cloud.js`, `account.js`: `hunt`, `setHunt`, `huntSignals`.
- Tests: `tests/live/hunt.test.mjs`, `tests/architecture/hunt.test.mjs`, `tests/architecture-db/hunt.test.mjs`.

## Privacy
- The practice's words go to the lab's own feed as query text and are not stored there. They are also never sent to the radar function.
- No client names, figures or addresses are in the code or fixtures. The sample feed is public tender text.
- "Not for us" and the day's list are kept in this browser only.

## Limits to know
- "Not for us" is per browser, not shared across a practice's devices, because members cannot write the practice record. Sharing it would need a small members-writable table.
- A notice marked "New Zealand" can really be local (for example one in Queenstown). It shows as national and is scored as a possible match.
- GETS shows a value rarely, so the value range seldom counts.
- Many councils also use other portals. They are not read.
- The radar function is not applied to any database yet. Apply it to staging first, then production on the owner's word.

## Leads and early signals (22 Nov 2026)

Found work now has three kinds of item, each marked on its card: a **tender** (a public notice), a **lead** ("News, not a tender") and an **early signal** ("Early signal: work that may come"). Leads and signals sit in their own lane, "Leads and early signals", under the tenders, and never mix with them.

**News leads.** `arch.hunt_leads` (migration `20261122140000_arch_hunt_leads.sql`, not applied) gives members the headline, link, published time, source name and a snippet of at most 200 characters from four news sources: Stuff, RNZ, Newsroom and The Daily Blog (confirmed by reading `public.kb_sources`, read only). The window is 30 days by default, 60 at most, 300 rows at most. The page ranks them in `hunt-rank.js` (`rankLeads`) and **never shows or keeps the snippet**: a card shows the headline, source, day, a link and one reason in assembl's words. News is copyright.

A lead counts only when the headline names a place or building a practice could design or improve (school, marae, library, hall, pool, fire station, housing and so on) and says what is happening to it close by (new, upgrade, rebuild, fire-damaged, funding for, takes over). Kept: "Marae wharenui badly damaged by fire", "New Hamilton library to be built", "Cyclone-hit community gets revamped fire station". Dropped: politics, sport results, crime and opinion unless the headline is plainly a building project; hospital patients ("airlifted to hospital"); school gossip ("school wag", "school fees"); "building" as a verb ("building his dream catamaran"); stories from world, sport, crime, opinion and entertainment pages; stories about somewhere outside the practice's regions; foreign stories. The practice's words, sectors and the kaupapa Māori lens raise a lead's score; they do not decide whether it is one. Signed out there are no leads, and the page says so.

"Add to pipeline" makes an enquiry marked "news lead, not a tender" whose next step is "Check the story before acting". "Not for us" works as for tenders.

**Early signals.** The signal feeds (`api/_feeds/signals*.js`, owned by another helper) hand over items shaped `{ id, kind:'signal', title, source, sourceUrl, day, region, why, horizon, evidence:[{label,url}], cultural }`. `cleanEarlySignal` bounds them. The page's call to the feed is `readEarlySignals()` in `hunt.js`; it returns nothing until the feed exists.

## Alert emails

GETS sends a daily "GETS: Tender Subscription" email, with advance notices (which the RSS does not carry) under "Future Procurement Opportunities". "Add alert emails" on the strip takes pasted text or dropped `.eml` and `.txt` files. `gets-alert.js` reads them (strict, at most 500 items, only `https://www.gets.govt.nz/.../ExternalTenderDetails.htm?id=` links count, closing times read as New Zealand time). Items are kept (one row per RFx ID in `arch.hunt_inbox`, or in this browser when signed out), ranked exactly as GETS findings are, and shown from "GETS alert email". A tender also in the RSS shows once. Advance notices carry an "Advance notice" badge. An alert has no region, so a regional lens does not rule it out. The email itself is never kept. How alerts arrive without pasting is in `pipeline-hunt-email.md`.

Migrations, none applied: `20261122141000_arch_hunt_inbox.sql` (the table), `20261122142000_arch_hunt_inbox_reader.sql` (the Gmail reader's token and ingest).
