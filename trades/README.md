# assembl lab: trades twin (plan to quote with a person in the loop)

Public build at /trades/. Static HTML, CSS and ES modules; the only dependency is pdf.js 4.10.38 from cdnjs, pinned.
Everything is Simulated: a fictional house (Lot 12 Kōwhai Rise), a fictional builder, fictional rates. Not a quote.
The consent questions, Building Code checks and defect register are Illustrative readings of public MBIE guidance
(building.govt.nz), not a compliance determination.

- `js/plans-data.js`: the two sample sheets as data (real mm, paper origin and scale) plus the NZ condition library and rates.
- `js/nz-code.js`: NZ reference data. Building Code clauses (B1, B2, D1, E2, E3, F4, G4, G9, G12, G13, H1) with MBIE links, the
  H1/AS1 insulation schedule by climate zone, the Schedule 1 consent questions, the defect register (severity, photo check,
  fictional provisional sum), illustrative trade hourly rates and waste percentages, the quote exclusions and terms, and the
  two demo variations.
- `js/takeoff-core.js`: pure geometry, the quote maths (waste by trade, labour hours at trade rates, P&G, margin, provisional
  sums, GST at 15% on the whole, 30-day validity), the checks, and the nine tools `find_rooms`, `measure`, `consent_check`,
  `code_checks`, `defect_register`, `price`, `quote`, `variation`, `draft_bid`. Shared verbatim by the page and by
  `/api/takeoff.js`, the stateless MCP endpoint (resources: `takeoff://plans`, `conditions`, `nz-code`, `sheets`).
- `js/viewer.js`: pdf.js page on a canvas, SVG overlay, pan/zoom/pinch. `js/main.js`: the desk, the checks panels, the quote
  maths, the site diary and print. `js/desk.js`: the scripted agent with three decisions for a named person (scale, provisional
  sums, the quote), the chained SHA-256 receipts, withdrawal and the variation flow.
- `css/trades.css`: the assembl tokens (paper and plum, six pastel cubes with glows, Instrument Sans + IBM Plex Mono) in plain
  CSS, with print CSS for the client-ready quote only.
- `plans/*.pdf`: drawn by `src/build-plans.mjs` (SVG from the data) and printed by `src/print-plans.py` (headless Chromium).

Clean-room: the pattern (plan → confirmed scale → conditions → estimate → proposal, with an approval step) is borrowed from the
category; no code, geometry, assets or copy from any other takeoff product.
