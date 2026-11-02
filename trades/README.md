# assembl lab: trades twin (plan takeoff with a person in the loop)

Public build at /trades/. Static HTML, CSS and ES modules; the only dependency is pdf.js 4.10.38 from cdnjs, pinned.
Everything is Simulated: a fictional house (Lot 12 Kōwhai Rise), a fictional builder, fictional rates. Not a quote.

- `js/plans-data.js`: the two sample sheets as data (real mm, paper origin and scale) plus the NZ condition library and rates.
- `js/takeoff-core.js`: pure geometry, pricing (GST 15% separate, markup on cost) and the four tools `find_rooms`, `measure`,
  `price`, `draft_bid`. Shared verbatim by the page and by `/api/takeoff.js`, the stateless MCP endpoint.
- `js/viewer.js`: pdf.js page on a canvas, SVG overlay, pan/zoom/pinch. `js/main.js`: the desk. `js/desk.js`: the scripted agent.
- `plans/*.pdf`: drawn by `src/build-plans.mjs` (SVG from the data) and printed by `src/print-plans.py` (headless Chromium).

Clean-room: the pattern (plan → confirmed scale → conditions → estimate → proposal, with an approval step) is borrowed from the
category; no code, geometry, assets or copy from any other takeoff product.
