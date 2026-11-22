# Early signals: owner note

Written 22 November 2026. Part of Found work, shown in the "Leads and early signals" lane of the ops page. Sources, licences and decisions: `docs/architecture/pipeline-signals-sources.md`.

## What early signals are
Public records that can come months or years before an architect is hired: land bought or set aside for a school, hospital or state housing; money announced for classrooms, a marae or an aged care wing; a new school established. They are not tenders and not opportunities. They say "something may be designed here later". A practice uses them to start a conversation early, by hand.

Each signal says, in our own words:
- what happened, with its source, date and link (`title`, `source`, `day`, `sourceUrl`, `evidence`);
- why it may lead to design work (`why`, always "may", never "usually": no source we read says how often or how soon);
- the likely buyer (`buyer`, with `buyerBasis` "stated" when the record names the body, "likely" when it comes from the kind of record);
- a rough horizon (`horizon`, always marked "(estimate)", `horizonBasis: "estimate"`);
- whether it carries kaupapa Māori or Indigenous words (`cultural: { on, why }`, from the Found work lens);
- other signals about the same place, street or facility (`links`).

## What they are not
- Not a promise of work, and not a judgement of fit. Read the source before acting.
- Not a list of every project: most design work is never announced this way, and iwi and marae work is mostly by relationship.
- Not the record's text. Only the title, date and link are kept. A Beehive summary is read to classify the release and is never shown or stored. Gazette notice text is never asked for (it names the officials who signed it).
- Nothing is contacted, registered for or submitted.

## How to ask for them
`GET /api/live/?feeds=signals&keywords=&regions=&sectors=&cultural=1&sources=` with the same lens as `feeds=hunt` (keywords, regions, sectors, the "always show kaupapa Māori" switch). `sources` is `beehive`, `gazette` or both (default). With no keywords, no sectors and the switch off, nothing is looked up. The answer is described at the top of `api/_feeds/signals.js`. The leads lane reads it through `readEarlySignals()` and `cleanEarlySignal()` (leads helper, `architecture/js/hunt.js` and `hunt-model.js`), which accept this shape.

## Sources wired
| Source | What is read | Licence | Status on 22 Nov 2026 |
|---|---|---|---|
| Beehive ministerial releases (`api/_feeds/signals-beehive.js`) | 13 portfolio RSS feeds (Education, Tertiary Education, Health, Housing, Building and Construction, Arts, Culture and Heritage, Māori Development, Treaty of Waitangi Negotiations, Pacific Peoples, Regional Development, Sport and Recreation, Courts, Police), only those the lens needs | Crown copyright, reproduction permitted with acknowledgement (not a named CC licence: Kate to confirm) | **Connected, unreliable.** On the preview one call read 6 of 8 feeds; later calls got Incapsula bot-check pages. Never worked around |
| New Zealand Gazette, through DigitalNZ (`api/_feeds/signals-gazette.js`) | Public Works Act land notices (newest 200) and school establishment notices (newest 40): title, date, link, subjects, rights only | CC BY 3.0 NZ (DIA); DigitalNZ needs an API key for commercial use | **Built, off.** Switches on when Kate adds the free key as the Pages secret `DIGITALNZ_API_KEY` |

Reading is light: Beehive feeds are kept for three hours and read two at a time; after a bot-check page an instance asks nothing for 20 minutes and uses its last good copies. Gazette searches are kept for six hours. An answer makes at most 16 calls. One source failing leaves the other in (truth "Partial"). The edge keeps a full answer for 15 minutes.

## The rules (`architecture/js/signals-rank.js`)
Plain rules, the same every time for the same records, lens and day. No model.

**Is it about a building?** A record is kept only if it names a building or place an architect designs (school, classrooms, kura, wharekura, hospital, ward, aged care, marae, wharenui, papakāinga, housing, library, community centre, hall, museum, pool, stadium, courthouse, police or fire station, a heritage place) and says something is being built, changed, bought or planned. Left out, with the reason kept for the answer's `dropped` examples:
- construction started or finished ("sod turned", "under construction", "complete", "opened"): the design team is already in place;
- roads, rail, pipes, water, energy kit, farms, cemeteries and reserves for open space;
- medicines, screening, results, appointments, honours, and organisations ("agency begins operations");
- rule and policy changes with no money for a project;
- Gazette corrections, amendments, schools converting type, and land no longer needed.

**What stage is it?** land (bought or set apart), planning (business case, design work, masterplan), funded (money announced), school (a new school established), settlement (a Treaty settlement step). Horizons, all estimates: land 2 years or more; planning 6 to 24 months; funded 6 to 18 months; new school 1 to 3 years; settlement years, if at all.

**Score** (shown at 40 and over):
- base: land 24, planning 26, funded 22, school 26, settlement 18;
- each keyword in the title +12 (+6 elsewhere), up to 36; each chosen sector found +12, up to 24;
- in a chosen region +10, nationwide +2, no place named 0 (kept, and it says so), another region: left out;
- published in the last 30 days +10, 90 days +6, 180 days +2, over a year −10, over 18 months: left out;
- a stated amount of $1 million or more +4 (shown as stated, never worked out);
- linked to another signal +6;
- kaupapa Māori or Indigenous words with "always show" on: +8 and kept under the bar (still about a building, in the regions and recent);
- Treaty settlements are shown only with the kaupapa Māori lens, and say that whether anything is built is for the iwi to decide.

**Reading across signals.** Two signals link when they name the same facility ("Kumeū Secondary School"), the same street in a Gazette title ("Freeland Avenue"), or the same town. A big city alone (Auckland, Christchurch and others) links only when the two share a sector or come from different sources. Region names never link.

### Examples (from the offline tests)
Kept:
- "Drury gets land for a new primary school" (land, Auckland, likely buyer the New Zealand School Property Agency), linked to "Land secured for South Auckland hospital" (same place: Drury).
- "Funding approved for Kumeū secondary school" (planning), linked to the Gazette "Notice of Intention to Take Land for Education Purposes—Kumeū Secondary School Project".
- Gazette "Land Acquired for Education Purposes—Freeland Avenue, Mount Roskill" linked to "Land Set Apart for State Housing Purposes—Freeland Avenue" (same street).
- "$8.6m brings marae into heart of New Plymouth" (funded, Taranaki, kaupapa Māori: "marae").
- "New School Establishment Te Wharekura o Tāmaki ki te Tonga" (new school, kaupapa Māori: "wharekura").

Left out:
- "Sod turned on Whangārei Hospital redevelopment": construction has started.
- "Energy resilience for Far North marae": energy kit, not buildings.
- "Unlocking papakāinga across New Zealand": a rule change, not a project.
- "New school property agency begins operations": an organisation, not a building.
- "Land Declared Road—Great South Road, Drury": a road.

## Privacy and the public repo
- No client names in code, fixtures or docs. Fixtures are written for the tests in each source's shape and name no person.
- Gazette land notices can describe private land, and their text names officials: only titles are read. Registers that name private individuals (Overseas Investment Office) are not read.
- The practice's words go to the lab's feed as query text and are not stored.
- The DigitalNZ key is read only by `functions/api/live.js`, sent only in a request header and never returned (tested).

## A possible "Read the signals" summary (not built)
A model could write two or three sentences across the day's signals ("three records point at Drury: land for a school, land for a hospital and a road; worth one call to the School Property Agency"). The rules already do the linking, so the gain is wording, not finding. Cost estimate: about 20 signals of 300 characters is roughly 2,000 input tokens and 200 output tokens a run, a fraction of a cent on a small model, once a day per practice. It would need Kate's yes (a paid call), a cache of one run a day, the same evidence links, and a label saying a model wrote it. Not in this branch.

## Where the code is
- `api/_feeds/signals.js`: the combined feed, the list of sources looked at and not wired (`NOT_WIRED`).
- `api/_feeds/signals-beehive.js`, `api/_feeds/signals-gazette.js`: the readers.
- `architecture/js/signals-rank.js`: places, rules, scoring, linking, the strict parsers. Reuses `fold`, `SECTORS`, `culturalMatch`, `REGIONS` and `parseLens` from `hunt-rank.js`, which it does not change.
- Tests: `tests/live/signals.test.mjs` (`node --test tests/live/*.test.mjs`).

## Limits to know
- Beehive challenges Cloudflare's servers with a bot check some of the time. When it does, the lane shows no Beehive signals and says why. The fix is a person's: ask the Beehive's operator whether the lab's reader (`assembl-lab/1.0`) may read the portfolio feeds, or accept that the lane fills only when the check lets it through.
- Places come from a list of 263 towns, suburbs, districts and regions. A release that names a place not on it shows "no place named". A school named after a town elsewhere ("Nelson Park School" in Napier) can show two regions.
- Ministerial releases often come after a design team is chosen; land notices and new school notices are likely earlier. This is our estimate, not measured.
- The Gazette searches cover about the last two to four months of land notices.
