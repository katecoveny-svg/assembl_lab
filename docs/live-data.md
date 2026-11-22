# Live data on the lab

Written 21 November 2026, on the branch `lab-site-data`. For Kate.

## What this fixes

Every "live and latest" strip on the lab (the top-of-page strip, and the cafe, stay, energy and tourism pages) asks `/api/live/` for its numbers. That address was written for Vercel, which no longer serves the lab, so on the live site it answers "not found" and the strips are empty.

This change puts the same feeds on Cloudflare, at the same address, giving the same answers. It also adds a new `site` feed for Plan Studio: facts about the real piece of land a house sits on.

## What you need to do to make it live

1. Merge the branch. That is all.
2. No keys, no settings, no new accounts. Every source is free and open.
3. After it deploys, open `https://lab.assembl.co.nz/api/live/?feeds=weather&place=auckland`. You should see a block of text with a temperature in it, not "not found".

Nothing was pushed, merged or deployed in making this.

## What is live once it is deployed

"Verified" means I saw a real answer from the publisher on 21 November 2026, from this machine, and the main feeds also answered inside Cloudflare's own local test runtime. I could not test from Cloudflare's real network before deploy. If a publisher blocks Cloudflare's servers, that one feed shows an error and the rest carry on, so look at the strips once after the merge.

| Feed | What it is | Source | Status |
|---|---|---|---|
| weather | Weather now, Auckland, Wellington, Hamilton, Christchurch | Open-Meteo | Verified |
| air | Air quality | Open-Meteo (modelled) | Verified |
| power | Wholesale power price, yesterday | Electricity Authority | Verified |
| genmix | Generation by fuel, latest month | Electricity Authority | Verified |
| retailers | Power retailers' connections | Electricity Authority | Verified |
| tariffs | Household power price | MBIE survey, copied in (a snapshot) | Verified (built in, not fetched) |
| fuel | Weekly fuel prices | MBIE | Verified |
| fpi, foodprices | Price indexes, food prices | Stats NZ | Verified |
| rts | Supermarket and hardware sales | Stats NZ | Verified |
| fx | NZ dollar exchange rates | Frankfurter (European Central Bank) | Verified |
| gdt | Global Dairy Trade | Global Dairy Trade | Verified |
| calendar | Public holidays, school terms | Nager.Date, Ministry of Education | Verified |
| ed, edhistory | Emergency department waits | Health NZ, DPMC | Verified |
| urgentcare | Christchurch after-hours wait | Pegasus Health | Verified |
| wastewater | COVID in wastewater | PHF Science | Verified |
| attendance | School attendance | Ministry of Education via Figure.NZ | Verified |
| vehicles | New car registrations | NZ Transport Agency | Verified |
| footprint | Building outlines | LINZ | Verified |
| grocery | Grocery report figures | Commerce Commission, copied in (a snapshot) | Verified (built in, not fetched) |
| trades-feeds | Building determinations, consents | MBIE CodeHub, Stats NZ | Verified |
| site | Facts about a piece of land (new) | LINZ, Auckland Council, Open-Meteo | See below |
| address | Find a street address and its point (`?feeds=address&q=`) | LINZ NZ Addresses (CC BY 4.0) | Verified: see `docs/architecture/site-address.md` |

Nothing here is "unavailable" or "connected-unverified" at the feed level. Each answer says whether it is "Live" (fetched from the publisher just now) or "Latest published" (the publisher's newest release), and when it was fetched.

## The new `site` feed

Ask for it with `/api/live/?feeds=site&lat=-36.80&lon=175.08` (latitude and longitude of the section, inside New Zealand). It returns one entry per fact under `feeds.site.facts`. Each fact names its own source, licence, date and truth label. These are facts to read. None of them says a site meets a rule, and none is a planning, hazard or Building Code assessment.

Checked on the test point (a rural section on Waiheke; no address, owner or legal description was looked up or saved):

| Fact | Source | Status | What the test point returned |
|---|---|---|---|
| parcel | LINZ Primary Parcels | Verified | A parcel of about 9.9 ha, with its outline. The legal description and titles are never returned. |
| zone | Auckland Council, Unitary Plan base zone | Verified | "Hauraki Gulf Islands" only. See the questions below. |
| overlays | Auckland Council, 14 Unitary Plan overlay layers | Verified | None at the point |
| floodPlain | Auckland Council Healthy Waters | Verified | Not inside a mapped flood plain; one is mapped within 50 m |
| floodProne | Auckland Council Healthy Waters | Verified | Not inside; one mapped within 50 m |
| overlandFlow | Auckland Council Healthy Waters | Verified | 5 mapped flow-path segments within 25 m |
| coastalInundation | Auckland Council (NIWA models) | Verified | Outside the mapped 1% storm-tide extent, with and without 1 m of sea-level rise |
| tsunami | Auckland Emergency Management | Verified | Not in a mapped evacuation zone |
| landslideShallow | Auckland Council, 2025 | Verified | Low |
| landslideLarge | Auckland Council, 2025 | Verified | Very High, but the mapped unit is a whole slope, so it is coarse |
| liquefaction | Auckland Council, University of Auckland | Verified | Very Low (a desktop study) |
| weather | Open-Meteo | Verified | Temperature, wind, today's sunrise and sunset |
| nzs3604Zones | BRANZ Maps (wind, earthquake, exposure, snow) | Not wired: terms | BRANZ Maps is a website for people with no open service |
| elevation | LINZ LiDAR | In the model already | The 3D twin already holds the 1 m height grid |
| coastalErosion | Auckland Council ASCIE layer | Not wired | The open layer is lines, not areas; a point answer would be guesswork |

"Not inside a mapped area" is not the same as "safe". Each hazard fact says so.

## Real ground (LINZ 1 m LiDAR): read in the browser, not served here

Until 22 November 2026 the branch `agent/ground-1122` had `/api/live/?feeds=ground` and `feeds=surface`. They are removed. The plan drop page now reads LINZ's elevation files and parcel map straight from the person's browser (`plan-studio/twins/src/twin/linz/`), so the site point never reaches the lab's server. Asking the feed for `ground` or `surface` now lists them under `unknown`.

| Check | Result |
|---|---|
| Source | LINZ New Zealand Elevation open data on AWS (`nz-elevation`, Sydney), the national 1 m DEM and DSM; LINZ NZ Primary Parcels for the boundary. No key. |
| Browser access | LINZ's bucket allows byte-range reads from any web page (CORS checked with a real preflight on 22 November 2026: `Access-Control-Allow-Origin: *`, `range` allowed). LINZ's parcel service also allows any origin. |
| Licence | CC BY 4.0. The survey's licensor is read from its own record and put in the credit line the page shows. |
| Status | Verified in Chrome on 22 November 2026: 12 public points across the country, each read twice in a fresh browser, 22 of 22 answered in 2.2 to 5.0 s, and one point in Fiordland answered "unavailable" with the reason. Accuracy as before: every cell within 0.005 m of GDAL. |
| Why it left the server | On Cloudflare the reads failed at some points. Cloudflare treats `.tiff` as cacheable and, on a cold file, drops the byte range: it handed the function a whole 1.2 GB file for a 64 KB request, or made it wait while the whole file streamed in, past the feed’s own 8 s limit per request. Details in `docs/architecture/site-ground.md`. |

The owner note for the page is `docs/architecture/site-ground.md`. The tests are `node --test tests/ground/*.test.mjs` (offline, with LINZ's recorded answers).

## Questions about terms (please decide or ask)

1. **Open-Meteo (weather, air, and the site weather).** The free service is for non-commercial use only. The lab's strips and the Plan Studio weather are fine while the lab is a free demonstration. Before this sits in something people pay for, assembl needs a paid Open-Meteo plan or another weather source.
2. **Auckland Council data.** Council says its open data is Creative Commons Attribution 4.0 unless an item says otherwise, and asks you not to copy or republish "any substantial amount". We ask for one point at a time and keep nothing, which looks fine, but it has not been confirmed with them. Four items (flood prone areas, overland flow paths, coastal inundation, flood plains) say only "Creative Commons", "refer to Healthy Waters" or "internal and external use", and the tsunami item says nothing. Worth one email to Auckland Council Healthy Waters and the geospatial team asking them to confirm this use. Council also says its information may not be used in legal disputes, so keep these as information, not evidence.
3. **Waiheke's own zones.** The Unitary Plan layer only says "Hauraki Gulf Islands" for Waiheke. The island's real zones and rules are in the Hauraki Gulf Islands section of the District Plan, which Council does not publish as an open map that I could find. Ask Council whether one exists. Until then the page should say so, and it does.
4. **BRANZ Maps.** No open service and no terms that allow automated use. A written yes from BRANZ, or an architect reading the zones off BRANZ Maps by hand, are the two routes.
5. **LINZ parcels.** CC BY 4.0, which is fine. Plan Studio must show "Sourced from the LINZ Data Service and licensed for reuse under CC BY 4.0" and Auckland Council's credit wherever the facts appear. Each fact carries its own credit line to copy.

## Things to know

- The old Vercel address ("DEPLOYMENT_DISABLED") can stay as it is. Nothing points at it now.
- `api/mcp.js` (the car app server) was left alone. It is still written for Vercel and is not served by this change.
- The `site` feed makes 28 calls to publishers for each new point (38 the very first time, while it also looks up each layer's update date). Cloudflare's free plan allows 50 calls per request, so that fits, but a paid plan has more room if more facts are added.
- Answers are cached for the time suited to each feed (15 minutes for weather, a day or more for quarterly figures), so the publishers are not asked again and again. A page that asks for `site` next to `weather` gets the shorter time.
- An answer in which any feed failed outright is sent with `Cache-Control: no-store` and is not kept in the edge cache, so the next ask tries the publisher again. (Before 22 November 2026 such an answer was cached for five minutes; on the preview the same failure came back as a cache hit.) An answer that is only partial or stale says so and may still be cached briefly.
- The tests run offline: `node --test tests/live/live.test.mjs tests/live/site.test.mjs`. The live check is `node tests/live/smoke.mjs`; it uses the real internet and is not part of the tests.
