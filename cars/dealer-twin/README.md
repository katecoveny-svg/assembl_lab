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

## Stock pictures: generic Blender vehicles (PR B)

The drawings are replaced by a Blender-scripted set of six **generic, unbranded** vehicles (`/assets/models/vehicles/`, see its
`SOURCE-HANDOFF.md`). Each listing maps to the body of its real model (Aqua → hatch, Hilux → ute, HiAce → van) and shows an
offline Cycles still of that generic body in the listing's colour (`img/stock/<body>-<paint>.webp`), labelled
"Generic hatch render · not the actual vehicle". Only the car opened in the spotlight loads its GLB (`js/vehicle-stage.js`
through `vehicles-rig-controller.mjs`); the still stays for no WebGL, Save-Data, a failed load or a wrong contract.

- Stills: `tools/compose_vehicle_images.py <png dir>` then `tools/apply_vehicle_renders.py` (idempotent).
- Tests: `node --test cars/dealer-twin/tests/*.test.mjs`; browser: `tests/stock_browser.py`, `tests/vehicle_browser.py`;
  runtime-only look at each GLB: `tests/stage-harness.html?body=ute&paint=silver`.
