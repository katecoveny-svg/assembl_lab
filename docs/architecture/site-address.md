# Site address: a street address instead of coordinates

22 November 2026, branch `agent/address-1122`. Not merged or deployed.

Kate: "make sure the address can be entered as a physical street address to pull the site data. I don't know coordinates necessarily."

## What it does

On the project page's **Site** tab, type a New Zealand street address in **Site address**. Matches appear as you type (after a 300 ms pause, from 4 characters). Pick one: the page shows it with its suburb, town and council. **Use this site** saves the point and the address on the project and fetches the site facts, exactly as typing coordinates did. "Or enter coordinates" is still there, smaller. Typing a point replaces any saved address, because it would no longer match.

The 3D page's **Site facts** card has the same box (`plan-studio/twins/src/twin/siteAddress.ts`). Choosing a match fills the point and runs the lookup.

Flats work: `2/14 Ponsonby Road` and `Flat 2, 14 Ponsonby Road` both mean flat 2 at number 14. Common short forms are read: St, Rd, Ave, Pl, Cres, Tce, Dr, Hwy, Cl, Ct, Ln, Pde, and a few more. Macrons and capitals do not matter.

## Source and licence

| | |
|---|---|
| Source | LINZ NZ Addresses, from LINZ's own ArcGIS Online organisation: `services.arcgis.com/xdsHIIxuCWByZiCB/arcgis/rest/services/LINZ_NZ_Addresses/FeatureServer/0`. No key. LINZ's Data Service page for the layer is `data.linz.govt.nz/layer/123113-nz-addresses/`. |
| Licence | CC BY 4.0. The ArcGIS item's own licence text (read 22 Nov 2026) says "Creative Commons Attribution 4.0 International ... You may use this work for commercial purposes. You must attribute the creator". I could not read the licence line on the Data Service page itself (it is drawn by script), so that confirmation is the ArcGIS item's. |
| Credit shown | "Sourced from the LINZ Data Service and licensed for reuse under the CC BY 4.0 licence." (LINZ's wording on its attribution page.) It sits beside the chosen address, and in the client pack when an address is saved. |
| Only current | The layer's `address_lifecycle` is `Current` (2,432,249 on 22 Nov 2026) or `Proposed` (2,428). Only `Current` is searched. |
| Fresh as of | The layer's own edit date (2 Nov 2026 when read). It goes in the answer as `asOf`. |

The point is where LINZ places the address: usually at the building or its entrance, not on the boundary. The feed's note says so, and that the address does not say who owns the land or what can be built on it.

## What is sent, and what is kept

- **The words typed** go to `/api/live/?feeds=address&q=...` on the lab. The feed reduces them to letters, digits, spaces and apostrophes (nothing typed can change the query), asks LINZ, and gives back up to 8 matches. It does not log them or keep them in memory. The edge cache keeps an answer under its address for five minutes, as it does for the site feed. LINZ's service sees the question, as it sees any query.
- **The chosen address** is kept on the project as `site.address` = `{ id, address, suburb, town, council }`, beside `site.lat` and `site.lon`, and `site.print_address` (the setting below). In this browser's store it is part of the project. In the shared records it rides in the project's existing `extra` column (`extra.site`), so no new column and **no database migration**. The activity log says "Site set from a street address" and never holds the address.
- **Not in a share link.** The link to the 3D page and the model hand-over carry no site, address or point (a test reads the source to check).
- **The client pack** prints the suburb and town only ("Site: Ponsonby, Auckland"). A per-project setting on the Site tab, "Print the street address in the client pack", is off until someone turns it on. The pack always carries the LINZ credit when an address is saved. Project exports include the address with the point, and say so.
- **The 3D page** keeps the chosen address in this browser's local storage beside the point it already keeps there. Neither goes into the plan model or a share link.

## How matches are found and ranked

The service is fast on its number and road fields and slow on a leading wildcard (a test query with one took 9 s), so the question is built from the number (and letter, and unit) exactly, the road name from its start, and every other word anywhere in the address. A house number also finds the flats in that building. Matches are ranked: the exact address, then the house before its flats, the flat that was asked for, a word that opens the suburb ("Auckland" in Auckland Central) ahead of one that only matches the town, then the shorter address. If more than eight match, the box says to add the suburb or town.

Checked against the live service on 22 Nov 2026, with public addresses only: answers in 0.04 to 0.7 s when a number is typed, about 3 s without one.

## Tests

`node --test tests/live/address.test.mjs` (feed, network mocked), `node --test tests/architecture/address.test.mjs` (box rules, storage in both stores, privacy).
