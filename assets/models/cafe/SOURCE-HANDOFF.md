# Café twin venue: source handoff

## 11 November counter detail — current local candidate

The current venue is **11,137,204 bytes / 352,087 rendered triangles**, with 28 materials and 23 textures. It adds hollow cups, pouring pitchers, an open knock box, machine-panel/gauge details and licensed ambientCG cookie/croissant scans. The original scans and editable venue remain separate from browser derivatives. See [the counter review](../../../docs/digital-twins/CAFE-COUNTER-REVIEW.md) for sources, measured budgets, 24 passing checks and actual browser captures. Sky transport was rebaked (2,086,060 bytes). GLB/map URLs now carry version hashes to prevent stale assets. The schematic street planting is confined to maquette mode.

Both prepared AR packages include the detail, ceiling and floor infill, retain all 341,717 visible triangles and pass OpenUSD/ARKit file validation. Their USDZ files are 19.14 MB each. Browser shader lighting is not included, glass is approximated and real-device placement remains unverified. Overall photographic quality and deployment remain open.

The dated entries below record earlier passes; their counts and release statements are historical.

## 11 November sky transport and enclosure — local review

The browser adds a cutaway ceiling, counter-floor infill, seven Cycles sky-transport maps (2,081,976 bytes), pendant-aligned downlights and ceiling rain occlusion. The GLB/master remain unchanged. See [the review](../../../docs/digital-twins/CAFE-DAYLIGHT-REVIEW.md) for reproduction, source hashes, 23 passing tests, browser evidence and limitations. This browser-only lighting layer is not in the prepared AR snapshot. Overall photorealism is still unfinished.

## 10 November scanned food and decision workbench — review candidate

The current branch adds an ambientCG 3DCake001 photogrammetry muffin to the earlier Wood041, Fabric041 and Terrazzo019L material pass. The 49,861-triangle master with 2K maps remains separate from the 13,373-triangle browser derivative with 1K colour, normal and AO maps. Eight stocked positions reuse one mesh and keep the existing stock/depletion rig. Provenance, source hashes and transformation details are in `source/muffin-source.json` and `textures/NOTICE.md`.

Current optimised venue: **6,941,244 bytes, 241,461 rendered triangles, 26 materials, 17 textures**. The geometry budget is now 250k to retain scanned silhouette and seams across eight reused portions; it is not a claim of measured phone performance. Other foods remain authored approximations. The scene still falls short of the supplied photographic reference.

Rebuild with Blender 5.1.x using `source/build_cafe.py`, then `source/optimise.mjs` and `source/write_contract.mjs`. `source/prepare-food.mjs` recreates the master/browser scan pair from the original uncompressed input; dependencies are named in its header. `source/review-food.py` renders each derivative under the same studio lighting. Source scans are not overwritten.

The main browser retains physical glass with reduced roughness and excludes transmissive panes from opaque shadow/ambient-occlusion treatment. Static AR files approximate transmission with alpha 0.06: cabinet food is clearer, but USDZ and GLB glass are not visually identical. Fresh tabletop/full-size files retain all 234,089 export triangles, with no dropped or simplified meshes. Both pass OpenUSD validators and ARKit compliance; both were reopened and the tabletop cabinet was rendered in Blender. Physical iOS/Android placement remains unverified. AR stays an architectural snapshot; simulation decisions and activity stay in the browser.

The café page now opens with three reversible experiments and a comparison of the active selection against the original setup under the same demand, season, costs and weather. It shows weekly EBITDA, waste, walk-aways and staff-hours. A text decision brief records inputs, changes, results and the manager-review boundary. Full settings, accounts, data comparison, sources and proposed AI authority remain available under Go deeper. Imported data is explicitly a separate comparison, not a calibrated or connected simulation. First Shift remains independent.

PRs #127 and #128 were verified merged before this pass. This branch is a new review candidate; its changes are not claimed deployed. Desktop/mobile browser checks and model tests are recorded in `docs/digital-twins/CAFE-DECISION-REVIEW.md`.

The sections below describe the **3 November baseline**, retained to explain its rig and original tradeoffs; its zero-texture and size statements are historical.


**Contract:** `assembl.cafe.v1` · **Route:** `/cafe/` · **Stage:** `/assets/twin/2/stage.js` (v1 + `loadTwinAsset`) · **Status:** integrated on branch `claude/3d-cafe`, awaiting Kate's review. Not released.

## What it is

A Blender-authored GLB of the fictional neighbourhood café the twin already simulates: shell and shopfront, the fluted counter with a two-group espresso machine and grinder, the food cabinet, the pick-up shelf and delivery tablet, the queue zone, the menu board, the kitchen line and pass, the office with the roster board, the back-yard bins, 14 tables with chairs, the banquette, pendants and the four footpath tables with umbrellas. It is authored in the page's own plan (`cafe/index.html`, `createCafeScene`), so it drops into the existing twin stage at identity. The people, plates, cups, dockets, table-state rings, rain, steam, lights and the sun stay exactly as before, and land in the right places.

It replaces only the procedural maquette's venue meshes, and only after the GLB and contract load and pass their checks. The maquette is still built in full and remains the fallback: for a failed or refused load, and on demand ("Simple maquette" button, or `?model=maquette`). With no WebGL, the v1 poster still appears.

## Rebuild

```
python3 -m venv .venv && .venv/bin/pip install bpy==5.1.2          # not committed
.venv/bin/python assets/models/cafe/source/build_cafe.py           # .blend + Cycles renders + GLB + build-report.json
.venv/bin/python assets/models/cafe/source/build_cafe.py --no-render   # .blend + GLB only
node assets/models/cafe/source/write_contract.mjs                  # contract: pivots and actuals measured from the GLB
node --test cafe/tests/*.test.mjs                                   # model harness + GLB/contract/rig tests
```

Env: `CAFE_SAMPLES` (default 64), `CAFE_RES_X`/`CAFE_RES_Y` (default 1600 × 1000), `CAFE_SHOTS` (comma list of stills). `--no-export` renders stills without touching the committed `.blend` or GLB. The committed stills used Cycles on CPU, 64 samples, OpenImageDenoise, 1440 × 900, AgX (`renders/renders.json`); WebP q90 is committed, PNG originals are git-ignored.

Reproducibility: the geometry, node tree, names, materials and triangle count rebuild identically. The GLB bytes do not: the Blender glTF exporter shares identical index buffers in a run-dependent order, so size and SHA-256 move by a few KB between builds (seen: 2,150,472 to 2,155,292 bytes). After a rebuild, run `write_contract.mjs` so the contract records the new hash.

Blender: `bpy` 5.1.2 from pip, headless; glTF exporter "Khronos glTF Blender I/O v5.1.20". (The benchmark claw and slushie used v5.1.19.) The build runs from a factory-empty scene; nothing is downloaded and no AI-generated imagery or mesh is used. Every part is scripted geometry in `source/build_cafe.py`.

## Units, axes, placement

- Metres. Blender authoring is Z-up; a page plan point (x, y, z) is authored at Blender (x, −z, y). The glTF exporter's +Y-up conversion maps it back, so the GLB is in the page's plan: +X right, +Y up, +Z towards the street, finished floor `FY = 0.15`.
- No scale and no offset at load. `cafe/tests/cafe-rig.test.mjs` checks the 14 table positions against the page's `TPOS`, the six queue spots against `QPATH`, and the cabinet's portion slots against the maquette's instanced-food slots.

## Interaction contract (summary; full detail in `cafe-rig-contract.json`)

The CAFE model in `cafe/index.html` owns every number. `visualStateFromModel(K, d, S, t, view)` in `cafe-rig-controller.mjs` reads it, using the maquette's own rules, and `createCafeRig(root, THREE).setVisualState(v)` applies the result. The rig has no timer, no randomness and no business logic. A test checks that `visualStateFromModel` leaves the model unchanged through whole café, all-levers and dinner days.

| State (source) | Node(s) | What changes |
|---|---|---|
| Queue to order (`d.counterQ.length`) | `QUEUE_SPOT_00…05` | spot material: blush while occupied |
| Coffees queued (`d.espQ`) | `ESPRESSO_MAIN_PORTAFILTER_L/R` (pivot at the group head, local Y) | 0 rad locked in while busy; ±0.7 rad swung out when idle |
| Open tickets (`d.kitQ`/6) | `RANGE_FLAME_L/R` | visible + blue emissive with load |
| Plates at the pass (`d.pass`) | `PASS_LAMP_BULB_1…3` | heat-lamp emissive on |
| New app order | `APP_TABLET_SCREEN` | screen emissive |
| Food bin (`d.binKg`) | `BIN_FOOD_FILL` (base pivot), `BIN_FOOD_LID` (hinge, local X) | fill scale; lid −0.5 rad over 22 kg |
| Footpath open (`K.outdoorOK`, trading hours) | `UMBRELLA_10…13_CANOPY` (apex pivot) | radial 0.18 + 0.82u, axial 2 − u |
| Cabinet stock and specials (`d.stock`, `d.special`) | `CAB_<ITEM>_0…7`, `CAB_<ITEM>_SPECIAL` | portions = min(8, ceil(stock/4)); navy tag while on special |
| Mode (`S.mode`) | `ESPRESSO_MAIN_CUP_STACK`, `BAR`, `HOST_STAND`, `TABLE_xx_CANDLE` | café vs dinner props |
| Proposed lever "Second grinder and station" (`S.station`) | `STATION_2` | shown only while the lever is on (it is a proposal) |
| Evening lamp level (page) | `PENDANT_0…8_BULB` | emissive |
| Street view (page) | `AWNING` | shown only in the street view, as the maquette does |
| Menu and roster | `MENU_BOARD_FACE`, `ROSTER_BOARD_FACE` (UV 0..1) | live canvases drawn by the page. The menu shows items on the menu, the current price (menu-engineering lever included), sold out and on special, with a "Simulated menu · fictional venue" line |

`extras.twin_part` on each node names the page's pickable group (`counter`, `coffee`, `cabinet`, `app`, `door`, `kitchen`, `pass`, `office`, `board`, `bin`, `tables`, `out`, `footpath`). The page attaches the authored parts to those groups, so hover cards, pins, Explore, the tour and Compare work unchanged. Walls carry no part and are not pickable, but they still block picks behind them.

## Budgets and actuals

Budget set for this scene (a whole venue, so larger than a single learning machine): GLB ≤ 4 MB, ≤ 150k rendered triangles, ≤ 26 materials, 0 textures, no Draco or meshopt (the stage loader has no decoders).

See `cafe-rig-contract.json` → `actual` and `build-report.json` (both measured from the files). Committed GLB: **2,150,472 bytes (2.05 MiB), 63,204 rendered triangles (36,356 in unique meshes; chairs, bottles, candles and cabinet portions are shared meshes), 313 nodes, 143 meshes / 265 primitives, 23 materials, 0 textures**, extension `KHR_materials_clearcoat`. `.blend` ≈ 0.56 MB (compressed), so it is committed.

## Palette

Cream plaster, white, terrazzo, light oak, honey floor, mint tile, soft lilac (banquette, office chair), blush (awning stripes, umbrellas, pendant shades, occupied queue spots), mint (food bin, pots), powder blue (espresso machine and grinder, recycling bin, queue belt), brushed steel, a little charcoal, and navy only for labels ("ORDER HERE", "PICK UP", the special tags, menu text). No yellow. In the browser the authored scene drops the maquette's orange sprite glows for the kitchen, pass, espresso and tablet: those states are carried by the model's own restrained emissive materials. The warm pendant and candle light pools stay.

## Simplified for the browser (and so not shown by the offline renders)

- Glass (shopfront, door, cabinet, hopper, bottles) is flat alpha with no refraction; it does not cast shadows or write depth. Cycles glass in the renders is the same simple material, but lit by the path tracer.
- Light from lamps, heat lamps, flames and the tablet is emissive material only in the browser. The page keeps its own warm point lights and the stage sun.
- No textures. Floor boards are shallow geometry seams. Both boards are canvases drawn at runtime.
- GLB materials do not change with the page's dark theme (the maquette's card materials do).
- The offline stills show an illustrative moment: three people's spots taken in the queue, heat lamps on, plates and dockets at the pass. The plates, dockets, menu text, ground and footpath in the stills are **render-only** objects (collection `RENDER_ONLY_not_exported`). They are not in the GLB; in the browser those things come from the simulation.

## Limits (stated honestly)

- This is display geometry for a fictional venue: not a fit-out drawing, an equipment specification or a measured site. The equipment is generic and unbranded.
- The rig is kinematic and visual. It does not model espresso extraction, gas, heat, refrigeration or waste chemistry, and it adds no behaviour to the simulation.
- Nothing in the model is live. Everything it shows is the simulation's state, under the page's existing Simulated / Live / Proposed / Estimate / Source labels.

## Provenance

All original and scripted (`source/build_cafe.py`) by Claude for assembl on 3 November 2026. No third-party models, textures, fonts in the GLB (the stills' menu text uses Blender's built-in font in render-only objects), scans or generated imagery. SHA-256 of the GLB and `.blend` are in `build-report.json`; the GLB hash is also in the contract and checked by a test.

## Verification and what was NOT verified

Run here, in a cloud container with software GL only (SwiftShader), under heavy shared CPU load:

- `node --test cafe/tests/*.test.mjs`: the state-model harness, written and committed **before** any 3D change, pins the CAFE script's SHA-256 and compares per-minute queue, till, takeaway wait, door, tickets, pass, drinks, table states, stock, specials, bin and app orders, plus week P&L and proof ledger, with a golden baseline. It also checks honesty labels and authority levels. The GLB, contract, plan-alignment, rig and read-only tests are in the same folder.
- Playwright (Chromium headless, SwiftShader): 1440, 375 and 320 widths; keyboard focus and Enter on the 3D-detail buttons; reduced motion; no WebGL (poster); GLB 404 and wrong contract id (maquette fallback, honest note); state kept across the model/maquette switch; café, dinner and station-lever states. See the PR for results and screenshot paths.

Not verified: any real GPU, phone, tablet or browser other than headless Chromium; frame rate or memory on real devices; AR (none is offered); visual parity between the Cycles stills and the browser (they are reviewed separately and differ by design, see above); screen-reader output beyond the existing labels and live region.

## 10 November follow-up: presentation and activity view

The current local browser defaults to the architectural venue without primitive people. `Show simulated activity` restores the customer, staff and comparison figures; this is a visual toggle only, and does not alter the underlying simulated day. The camera blur is off. The nine stage-based twins share an opt-in editorial stylesheet. See `docs/digital-twins/UPGRADE-REGISTER.md` for current evidence and remaining fidelity work; the historical verification sections above do not describe this new pass's deployment or device status.

## Cabinet and AR follow-up — 10 November

The detailed browser view now hides the fallback cabinet cubes. They previously obscured the authored portions even when Detailed model was selected. Food display is a new close-up camera; toasties now have layered bread and filling. Stock depletion remains controlled by the same rig. Fifteen café tests pass; browser detailed/fallback switching was exercised.

The AR world now uses the rig's actual `cafe` mode and explicit illustrative stock, instead of an unsupported `day` mode that emptied the cabinet. Architectural AR defaults to no activity figures. The shared placement animation preserves hidden objects (two regression tests).

The USDZ converter now carries normal maps and packed roughness/metallic channels, each with independent UV transforms. Non-unit normal strength is baked into a separate PNG for ARKit-compatible decoding. Two Python regression tests cover the channels, transformed UVs, normal strength and missing-UV rejection.

Both current café GLB/USDZ pairs are rebuilt in `ar/worlds/files`; 130,369 triangles, approximately 7.9 MB GLB and 10.4 MB USDZ per mode, without Draco. Both pass ARKit ComplianceChecker and OpenUSD validators. Tabletop GLB and USDZ were reopened/rendered in Blender and visually compared. Manifest stores hashes and distinguishes file validation from physical-device validation. Phone placement/performance remains unverified; this branch has not been deployed.
