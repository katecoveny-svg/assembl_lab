# assembl lab: trades twin (plan to quote with a person in the loop)

Public build at /trades/. Static HTML, CSS and ES modules; the only dependency is pdf.js 4.10.38 from cdnjs, pinned.
Everything is Simulated: a fictional house (Lot 12 Kōwhai Rise), a fictional builder, fictional rates. Not a quote.
The consent questions, Building Code checks, defect register and payment-claim guidance are Illustrative readings of public MBIE guidance
(building.govt.nz) and of the Construction Contracts Act 2002, not a compliance determination or legal advice.

- `js/plans-data.js`: the two sample sheets as data (real mm, paper origin and scale) plus the NZ condition library and rates.
- `js/nz-code.js`: NZ reference data. Building Code clauses (B1, B2, D1, E2, E3, F4, G4, G9, G12, G13, H1) with MBIE links, the
  H1/AS1 insulation schedule by climate zone, the Schedule 1 consent questions, the defect register (severity, photo check,
  fictional provisional sum), illustrative trade hourly rates and waste percentages, the quote exclusions and terms, and the
  two demo variations.
- `js/takeoff-core.js`: pure geometry, the quote maths (waste by trade, labour hours at trade rates, P&G, margin, provisional
  sums, GST at 15% on the whole, 30-day validity), the checks, and the ten tools `find_rooms`, `measure`, `consent_check`,
  `code_checks`, `defect_register`, `price`, `quote`, `variation`, `payment_claim`, `draft_bid`. Shared verbatim by the page and by
  `/api/takeoff.js`, the stateless MCP endpoint (resources: `takeoff://plans`, `conditions`, `nz-code`, `sheets`).
- `js/viewer.js`: pdf.js page on a canvas, SVG overlay, pan/zoom/pinch. `js/main.js`: the desk, the checks panels, the quote
  maths, the site diary and print. `js/desk.js`: the scripted agent with three decisions for a named person (scale, provisional
  sums, the quote), the chained SHA-256 receipts, withdrawal and the variation flow.
- `js/feeds-fallback.js`: last-known values for the Latest published chips, captured from the live sources by
  `/api/trades-feeds.js` (MBIE determinations via Building CodeHub, Stats NZ building consents issued). Shown, labelled
  "Last known" with its date, only when a live fetch fails. `/api/trades-feeds.js` is cached for six hours at the edge.
- Councils: `COUNCILS` in `js/nz-code.js` (Auckland, Wellington City, Christchurch City), keyed off the H1 zone selector,
  each link with how and when it was checked. `CCA` holds the Construction Contracts Act 2002 references (s 18, ss 20–23,
  subpart 2A retentions after the 2023 amendment) and `NZ_HOLIDAYS` the working-day calendar for 2026–27.
- Room names: `labelsFromTextItems` and `roomsFromLabels` in `js/takeoff-core.js` read room labels and written sizes
  (metres or mm) off any PDF's text layer; `find_rooms` takes them as `labels`. A scanned drawing says so.
- Site photos: attached in the provisional-sum gate, downscaled and SHA-256-hashed in the browser, never uploaded; the
  hash and a thumbnail ride on the chained receipt and the printed quote.
- `css/trades.css`: the assembl tokens (paper and plum, six pastel cubes with glows, Instrument Sans + IBM Plex Mono) in plain
  CSS, with print CSS for the client-ready quote only.
- `plans/*.pdf`: drawn by `src/build-plans.mjs` (SVG from the data) and printed by `src/print-plans.py` (headless Chromium).

Clean-room: the pattern (plan → confirmed scale → conditions → estimate → proposal, with an approval step) is borrowed from the
category; no code, geometry, assets or copy from any other takeoff product.
