# assembl lab · Plan Studio (plans in, a model you can trust out)

Public landing page at `/plan-studio/` (`index.html`, `css/landing.css`, images in `media/`); the working studio is at `/plan-studio/studio/`.
The landing page's project image is a real project shared with permission (credit line still to confirm); every other image on it is real output from the fictional demo hall. Static HTML, CSS and ES modules; three.js r170 from `/assets/vendor`, pdf.js 4.10.38 from cdnjs (pinned).
One project model (`js/model.js`, JSON) is the source of truth; the 3D scene, the code pre-check, the working drawings, the exports and
the client presentation are all derived from it and refresh on every edit.

| File | What it does |
|---|---|
| `js/model.js` | The schema, the fictional demo (Tōtara Grove community hall), geometry helpers, revision snapshots and diffs. Every element carries `ev` evidence: `src` drawing / text / ai / user / demo, `conf` 0–1, `note`. |
| `js/read.js` | Reading a plan. A CAD-exported PDF is measured, not guessed: pdf.js gives every path and text run; each path is tagged by how it is painted (dark poché, light room tone, coloured annotation, hairline, or a stroke with its weight). Walls are pairs of parallel wall-poché (or heavier-stroke) edges a wall-thickness apart, merged along their run; the building is the largest connected cluster; openings are gaps in a run (a door needs a leaf line or a true-radius swing from a gap end); rooms come from the labels in the text layer. The scale is read from the sheet ("1:100") and a person confirms it. |
| `js/code.js` | The NZ Building Code pre-check: deterministic rules, re-run on every edit. Each result has a status (pass, fail, needs info, out of scope), the clause, document, edition, measured value and limit. A rule whose figure was not confirmed against the current MBIE document (`verified: false`) can never pass. Advisory only. |
| `js/drawings.js` | Working drawings as SVG (A3): plan 1:100 with grids, dimensions, door swings and room tags; four elevations and a section, each at the largest standard scale that fits (decks, piles and any roof shape included; the section cuts across the roof's fall); the code schedule. Title blocks carry the MBIE minimum fields. Revisions cloud whatever changed since the last issue and fill the revision table from the model diff. |
| `js/scene.js` | The 3D model (walls cut around openings, glazed gable, roof, furniture), day / golden hour / dusk light, exact-size stills with the provenance label burned in, recorded flythroughs (MP4 or WebM), the depth pass that drives AI enhance. |
| `js/materials.js` | NZ materials. Only maker-published values, with sources; conflicting documents shown as a range; every screen colour marked approximate (COLORSTEEL publishes LRV and TSR, not RGB). Māori design is reserved for engagement with mana whenua and the artists, never a texture. |
| `js/exports.js` | IFC4 (validated with IfcOpenShell: 0 schema issues on the demo; evidence in `Pset_assemblEvidence`), DXF R12 with CAD layers, project JSON. |
| `js/present.js` | The 16:9 client presentation (cover, the building, approach, plan, elevations, materials board, pre-check summary, next steps). |
| `../api/plan-read.js` | A raster plan (scan, photo) read by Claude vision with structured output; everything it returns is `src: "ai"`. Needs `ANTHROPIC_API_KEY`. |
| `../api/plan-render.js` | The paid extras through fal.ai, always driven by the true model. Stills: photoreal edit or depth-locked. Hero clips: **Wan VACE depth** (geometry-locked: a 5 s guide clip is recorded through the model in the browser, uploaded straight to fal storage with a signed URL, and the AI follows its depth) or **Hailuo 02** (animates one still: cheaper, but the motion is invented, so the clip is labelled "illustrative motion"). Every preset shows its estimate first, needs `confirm: true`, forwards only allow-listed fields, and counts toward a daily cap. Results have "AI-enhanced visualisation" burned into every frame. Needs `FAL_KEY` (not set yet). |
| `../tools/plan-studio/render_blender.py` | Hero stills in Blender Cycles from the exported GLB: physical sky and sun, real-scale material shaders, day and dusk. |

Free first: stills, the client view set (street, two corners, rear and interior in one light), flythroughs and Blender hero stills cost
nothing. The AI step is for the occasional hero image or clip. Materials start from a look (Bach, Light weatherboard, Metal, Timber
shiplap): each look is a set of real product selections, never a style prompt.

Turning on hero clips: add `FAL_KEY` to the Vercel project (optional `PLANRENDER_DAILY_CAP`, default 60 jobs a day). Before a client job,
open each preset's fal.ai model page and confirm the endpoint id, its input fields and the price: they were gathered in Nov 2026 from
fal.ai and third-party listings, and they move.

Tests: `node --test plan-studio/tests/*.test.mjs` (the demo, the pre-check, the drawings, IFC/DXF, reading `tests/fixtures/demo-plan.pdf`:
12/12 walls, 9/9 rooms, openings at their exact positions; and the render route against a mocked fal: nothing is spent).

Honesty rules: the pre-check never says "compliant" or "approved"; renders say which model revision they show; AI output says so on the
image; screen colours are approximate. Client drawings uploaded for a pilot stay in the browser and are never committed to this public repo.
