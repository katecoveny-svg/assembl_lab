# assembl lab: dealer twin (Harbour Lane Motors, demo)

Public build for the lab at /cars/dealer-twin/. All paths are relative; the car tools call /api/mcp/ on the same origin.
Built by /home/claude/dealer-twin-v2/build.py; do not edit here.

## Stock pictures: body-style drawings (stopgap, Nov 2026)

The 48 listings used to show one procedural car mesh, recoloured, under real model names ("Toyota Aqua" on a wagon). That is gone.
Each listing now shows a plum-ink drawing of its **body style** (hatch, sedan, wagon, SUV, ute, van), labelled "drawing, not this car",
with make, model, year, km and price as data. The AI-generated `assets/hero/sedan.glb` and the unused one-mesh spotlight kit
(`js/spot3d.js`, `js/vendor/kit3d.js`, `js/vendor/look3d.js`) are removed.

- Drawings: `python3 cars/dealer-twin/tools/body_drawings.py` writes `img/body/*.svg` (millimetre side elevations, one shared scale).
- Data: `python3 cars/dealer-twin/tools/apply_body_drawings.py` points `data/stock.json`, `js/agentdesk-data.js` and `js/variant.js` at them (idempotent).
- Tests: `node --test cars/dealer-twin/tests/*.test.mjs`; browser: `python3 cars/dealer-twin/tests/stock_browser.py` against a local server.

**Upstream:** this folder is still the output of `/home/claude/dealer-twin-v2/build.py`, which lives outside this repo. Until that
build makes the same change (or this folder becomes the source), a rebuild will bring the old renders back.
