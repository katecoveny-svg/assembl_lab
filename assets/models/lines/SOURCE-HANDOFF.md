# Lines tanks: asset handoff (`assembl.lines.v1`)

Blender tanks for the existing straight-line machine, `/study/m/lines.html` (NCEA Level 1 Mathematics and Statistics 91947, linear relationships). The lesson, its units, steps, challenges, chips, exam notes and the A/B investigation are unchanged and remain authoritative in `study/m/lines.js`. This asset only replaces the drawn 3D tanks. The plotter board, table of values and scooter road are still procedural.

**Status:** Benchmark render → Rig and export → Model integration → Visual and functional QA are done on branch `claude/3d-lines`. Review and Approved release are Kate's. Nothing is merged or deployed.

## Files

| File | What it is |
|---|---|
| `source/build_lines.py` | The only source. One command rebuilds the `.blend`, the GLB, the contract, the validation report and the renders. Everything is modelled from primitives in code: no imported meshes, no textures, no generated imagery. |
| `source/lines.blend` | The editable scene (tanks plus a render-only stage, lights and three cameras). It opens posed on the lesson's A/B case (A 40 L, B 70 L). |
| `lines-tanks.glb` | Web asset, exported from the `LINES_TANKS` collection only and posed at rest (water full, 100 L). |
| `lines-rig-contract.json` | Contract: units, axes, scene scale, the litres → metres mapping, the tested cases, control mappings, required nodes and every exported pivot. It is written by the build script from the exported rest pose. |
| `lines-rig-controller.mjs` | Pure visual adapter (`createLinesRig`, `levelMetres`, `checkContract`). It has no timer, no flow integration, no random values and no state of its own. |
| `rig-validation.json` | Measured water heights at 0, 10, 40, 70 and 100 L, clearances, GLB stats and SHA-256, and render records (engine, samples, time, posed state). |
| `renders/*.png`, `lines-hero.webp` | **Offline Cycles renders.** They are not the browser view. `lines-hero.png` (1600×1100, 64 samples), `lines-detail-outlet.png` and `lines-detail-inlet.png` (1000×720, 32 samples). All use adaptive sampling (threshold 0.02), OpenImageDenoise and AgX Medium High Contrast at exposure −0.4, and are posed on the lesson's A 40 L / B 70 L case. The detail shots used 32 samples because the build machine's two CPU cores were shared with other jobs; rerun with `--samples=64` for parity. `lines-hero.webp` is a WebP copy of the hero for page use. |
| `../../study/m/lines-asset.js` | Loader. It refuses any contract other than `assembl.lines.v1` or other units, checks for missing nodes, swaps in the browser materials and returns one holder per tank. |

## Rebuild

```sh
python3 -m venv .venv && .venv/bin/pip install bpy==5.1.2       # headless Blender 5.1.2, glTF exporter 5.1.20
.venv/bin/python assets/models/lines/source/build_lines.py              # .blend + GLB + contract + validation + Cycles renders
.venv/bin/python assets/models/lines/source/build_lines.py --no-render  # everything except the renders (about 2 s; earlier render records are kept)
.venv/bin/python assets/models/lines/source/build_lines.py --preview --only=hero  # quick 24-sample, half-size check of a single shot
```

It also runs inside Blender 5.1: `blender -b -P assets/models/lines/source/build_lines.py -- --no-render`. The venv is not committed.

**Byte-level reproducibility:** geometry, node names, pivots and materials are identical on every run. GLB byte size can still vary by a few KB, because the Blender glTF exporter does not always de-duplicate accessors the same way (seen even with `PYTHONHASHSEED=0`). For that reason the tests check the budget, not an exact byte count. `rig-validation.json` records the SHA-256 of the GLB that was actually built, and each render records the GLB hash current when it was rendered.

## Units, axes and scale

- Metres throughout. Blender: +X right, +Y rear, +Z up, with tank fronts facing −Y. glTF: +X right, +Y up, +Z front. The mapping is `(x, y, z) → (x, z, −y)`.
- The browser applies **one uniform scale of 3 scene units per metre** to each tank root. The existing drawn tank showed 100 L as 3.0 scene units tall, so the lesson's camera, board and labels keep their proportions. Never scale individual parts.
- In the authored layout, `TANK_A` is at x = −0.31 m and `TANK_B` at +0.31 m. The lesson moves each tank root as a whole: A slides from −2.5 to −3.6 scene units when B appears, and B sits at −1.75, as before.

## Litres → metres (the level mapping)

The tank interior is **0.40 m × 0.25 m**, a plan area of 0.1 m². So:

> **level_m = clamp(litres, 0, 100) × 0.01**, that is, 1 L = 0.001 m³ ÷ 0.1 m² = **10 mm** of water.

- `TANK_<k>_WATER` is a prism authored as the full 100 L (1.00 m tall), with its **origin on the interior floor** (glTF y = 0.187 m above the bench). The adapter sets `scale.y = litres / 100`. Because the pivot is the floor and the top face is flat, this is exact. There is no bevel on the vertical axis, so scaling cannot distort it.
- The 0–100 L clamp is the same display clamp the existing drawing already used (`clamp(lev, 0, 100)`). Readouts, chips, labels and capture still show the lesson's unclamped value.
- **Tested cases** (the lesson's investigate case: 10 L start, t = 10 min, 3 vs 6 L/min):

| Litres (from `lev()`) | Water height | Water node scale.y | Top of water, glTF y | Above floor in scene units |
|---|---|---|---|---|
| 40 | 0.40 m | 0.40 | 0.587 m | 1.20 |
| 70 | 0.70 m | 0.70 | 0.887 m | 2.10 |

These are checked three ways:
1. In Blender, while building (`rig-validation.json`: error 0.0 mm at 10, 40, 70 and 100 L).
2. In Node, by running the real lesson model, capturing A and B, and feeding the captured levels into the rig built from the real GLB (`study/tests/lines-rig.test.mjs`).
3. In the browser, by reading the scene's `TANK_A_WATER` world matrix after **Set up A** and **Set up B** (see QA below).
- The water mesh is inset 0.5 mm from each wall and has 3 mm corner radii, so its own geometric volume is about 0.7 % under nominal. The level mapping is exact for the nominal 0.40 × 0.25 m interior. The scale ticks are printed at exactly `floor + L × 10 mm`.

## Named parts and pivots (per tank; `k` = A or B)

| Node | Pivot / role | Driven by |
|---|---|---|
| `TANK_k` | Footprint centre on the bench | Lesson layout (x only) |
| `TANK_k_WATER` | Interior floor | `scale.y = litres/100`; visible when litres > 0.2 |
| `TANK_k_FLOAT` | Float waterline, on a guide rod | `y = floor + max(level, 0.023 m)` (rests on its stop collar below 2.3 L). It is also the drag handle for the start level, as the drawn float was. |
| `TANK_k_INLET_STREAM` | Nozzle tip (y 1.300 m) | Length reaches the water surface. Visible when the lesson's own condition holds: `rate > 0 && t < 20 && litres < 100`. |
| `TANK_k_DRAIN_STREAM` | Drain spout tip | Visible when `rate < 0 && litres > 0` (the lesson's condition). |
| `TANK_k_INLET_HANDWHEEL` | Gate-valve stem axis, glTF +Y | Illustrative: `−min(1, rate/8) × 1.5π`. Tapping it still starts and pauses the clock. |
| `TANK_k_OUTLET_LEVER` | Ball-valve stem axis, glTF +Y | Illustrative: `−min(1, −rate/8) × π/2` (closed across the pipe, open along it) |
| `TANK_k_FLOOR`, `_LABEL_ANCHOR`, `_NOZZLE_TIP` | Empties | Anchors for the adapter and labels |

Fixed construction: the stand (30 mm square tube with gussets, lower braces and levelling feet), a white powder-coated base pan, a 10 mm acrylic box on a 15 mm floor, lilac aluminium corner angles with fasteners every 200 mm, and a 30 × 20 mm top rim. The supply riser runs behind the tank to an overhead gate valve and a downturned spout with a flow straightener. The bulkhead outlet with its quarter-turn ball valve drops into a mint trough on the bench. A white vinyl measuring strip on the front carries navy ticks every 5 L and numerals every 10 L (plus "LITRES"), and a navy-on-white "TANK A" / "TANK B" plate sits on the stand.

## Budgets vs actuals

| | Budget | Actual |
|---|---|---|
| GLB size | ≤ 2.5 MB | **0.88 MB** (881 232 B for the committed build; see `rig-validation.json`) |
| Triangles | ≤ 80 000 | **30 232** (both tanks) |
| Mesh primitives (draw-batch proxy) | ≤ 80 | **60** |
| Materials | (none set) | 16 in the GLB; acrylic, water and stream are replaced in the browser |
| Textures | 0 | **0** |
| Compression | Only what the loader supports | None. `GLTFLoader` from `/ar/vendor` is used without Draco or meshopt, as for slushie. |

## Browser simplifications (stated honestly)

- **Glass:** the GLB carries Principled transmission for the acrylic (IOR 1.49) and the water (IOR 1.333) for Cycles. In the browser, `prepareBrowserMaterials()` replaces both with **alpha-blended clear-coat materials**: acrylic opacity 0.14 with depthWrite off, water opacity 0.72 in the lesson's existing colours `#7FB7E8` / `#F2A7BE`. There is no refraction and no transmission pass. The live tanks therefore look flatter than the offline renders, and the renders do not prove runtime quality.
- Draw order is water, then streams, then acrylic, so the glass is drawn over the water.
- There is no surface wobble on the Blender tanks. The drawn tanks' falling drops are not reproduced: a continuous stream shows the tap state instead.

## Simulation limits

Idealised tanks: the inflow and outflow are whatever the lesson sets and stay constant. The model ignores pressure-dependent drain rate, fluid dynamics, sloshing, meniscus and valve hydraulics, and none of them are implied. The valve handle angles are illustrative readouts of the lesson rate. The outlet sits just above the floor, but the idealised model still empties to 0 L. These are teaching apparatus proportions, not a manufacturing drawing.

## Integration in `study/m/lines.js`

- `lines3d` still builds the drawn tanks first. It then imports `lines-asset.js`. Once the GLB and contract load **and the first rig frame succeeds**, it hides the drawn tanks and shows the Blender ones. If anything fails (fetch, contract, missing node, a throw in a frame), the drawn 3D tanks come back and the status line says so. `document.documentElement.dataset.linesTanks` reads `loading`, `blender` or `fallback`.
- Every frame passes `lev(m, c, t)` and the lesson's own tap and drain booleans to `rig.setTank`. There is no second model.
- **Graphics switch** (new, under the canvas): it switches between the 3D tanks and the flat drawing **inside the page**. Nothing reloads, so the experiment, topic, clock and captured A/B evidence are all kept. With `?lite`, or after a failed start, it can start the 3D bench in the page. Without WebGL it is disabled, with a reason.
- **Explicit reset:** **Reset** returns the clock to 0, and **Restart investigation** clears the evidence and notes, both as before. The graphics switch never resets anything. **Home** on the canvas resets the camera.
- **Palette (this machine's own files only):** the yellow 50 L band, its dashed line and the time-axis highlight (drawing and 3D) are now lavender with a navy line. Emissive "glow" materials on the lines, bead, rings and scooter gate are now matte. The gold unlock-fee coins on the scooter road are **kept**, because their on-screen key says "gold = unlock fee". This is flagged for review rather than silently changed.

## Provenance

All geometry, materials and renders are original and scripted in `build_lines.py`. They were authored for assembl on 3 November 2026 with headless Blender 5.1.2 (pip `bpy`) and glTF exporter 5.1.20. Nothing was imported or traced, and no generated imagery was used.

## Verification run on this branch (3 November 2026)

- **Tests:** `node --test study/tests/*.test.mjs` gives 111 tests, 108 passing. The 3 failures were already failing on `main` at `e372529` before this work, and are unrelated: two in `guide.test.mjs` (finder copy, and the missing walkthrough video for `quote`) and one in `phone.test.mjs` (the "Screen time" label). The 10 new tests in `lines-rig.test.mjs` and `lines-loading.test.mjs` pass. `lesson-models.test.mjs` still passes unchanged, including "tanks: … 40 and 70 L".
- **Browser QA** (Playwright, Chromium, **software WebGL via SwiftShader**, `?lq`):
  - Widths 320, 375 and 1440: the Blender tanks load, and there is no horizontal page scroll.
  - Investigate: in the scene, **Set up A** puts the top of `TANK_A_WATER` at 2.061 scene units, which is 0.3 plinth + (0.187 + 0.40) × 3. **Set up B** puts it at 2.961, which is 0.3 + (0.187 + 0.70) × 3.
  - Capture A and B, switch to the flat drawing and back: state and evidence are identical both ways.
  - Keyboard: canvas, Tab, Tab reaches the switch with a visible focus ring. Enter and Space toggle it, and focus stays on the button.
  - Reduced motion: the tanks load, and the tank slide and camera moves are instant.
  - GLB request blocked: the drawn 3D tanks are shown with an honest status.
  - `?lite`, then **Show the 3D tanks**: 3D starts in the page with the same state, at 40 L.
  - WebGL disabled: the drawing is shown, and the switch is disabled with a reason.
  - No console errors other than the deliberately blocked request.
  - Screenshots are kept outside the repo (QA scratch folder).

## Not verified

- Real devices, real GPUs, iOS/Android browsers and AR were not tested. The browser QA used Chromium with **software WebGL (SwiftShader)** at about 0.3 fps, so frame rate and visual parity on hardware GPUs are unknown.
- The offline renders and the browser output were reviewed separately. The renders show Cycles glass that the browser does not reproduce.
- Curriculum alignment was not re-checked; the lesson content is unchanged.
- Bloom: with emissive glows removed this machine no longer triggers bloom. QA ran with `?lq` (no post-processing), so the high-quality desktop path was only checked by code reading.
- At 320 px and 375 px the fixed 3D camera crops the right-hand edge of the graph board. This was already the case with the drawn tanks; the graph itself is complete in the flat drawing and in the chips. At 320 px the kit's "Drag to turn" hint overlaps the "View in AR" button. That is shared kit behaviour and was not changed here.
- Under software GL (about 0.3 fps), tank A's slide when tank B appears takes minutes rather than about half a second, so the two-tank screenshot catches it mid-slide. With reduced motion the slide is instant.
