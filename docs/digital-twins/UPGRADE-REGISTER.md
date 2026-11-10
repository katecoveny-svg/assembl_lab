# Digital twin upgrade register — 10 November 2026

## 11 November — café counter detail, local checkpoint

[Counter review](CAFE-COUNTER-REVIEW.md): ambientCG cookie/croissant scans, hollow vessels, machine detail, eye-level coffee camera and legacy planting confined to the maquette. Current browser GLB 11.14 MB / 352,087 rendered triangles; sky maps rebaked. 24 tests pass; desktop/mobile viewport reviewed. Fresh table/full-size AR files retain 341,717 triangles, pass USD/ARKit file checks and remain physically untested. Source-versioned URLs fix stale model/map loading. Not deployed; the full photorealism target remains open.


Workflow: installed Codex skill `digital-twin-upgrade`; portable source also in the main assembl repository at `docs/factory/digital-twin-upgrade/SKILL.md`.

## Current pass

11 November follow-up: [sky transport and enclosure](CAFE-DAYLIGHT-REVIEW.md). Local only; 23 tests pass. Prepared AR files retain their earlier snapshot and do not contain the browser lighting layer.

Latest café follow-up: [decision workbench, scanned food and daylight review](CAFE-DECISION-REVIEW.md). This supersedes the older 5.66 MB café size below: the current local venue is 6.94 MB. The user has rejected overall café realism, so passing code/asset checks are not visual acceptance. The homepage Blender room-master-v3 was also rejected and must not be propagated to other twins. Finish the reference scene before multiplying its furnishing or planting choices.

The nine stage-based twins now opt into `assets/twin/editorial.css`: clearer typography, calmer panels, more deliberate spacing and mobile controls. Their camera blur is disabled so detail remains readable. This is a presentation improvement, not a claim of photorealistic replacement geometry.

Café additionally has the locally refined 5.66 MB authored venue, ambientCG materials and an explicit optional activity-figure view. The existing simulated customers, staffing, queues, profits, levers and evidence are preserved; figures are not presented as realistic people. Default architectural view hides only their visual meshes. Fifteen café model/rig/first-shift tests pass.

All nine pages passed inline-module syntax checks and browser checks at 375 × 812: the stage canvas and stylesheet were present with no horizontal overflow. Café scene, interior camera and activity toggles were exercised. Desktop and deeper interaction review of the other eight remains open. No real-phone performance or AR placement is claimed. This pass is local until a release entry below records a commit and deployment.

| Surface | Current change | Next fidelity pass |
|---|---|---|
| Café `/cafe/` | Detailed venue/materials, optional activity figures, editorial presentation | Detailed menu-matched food, equipment close-ups, indoor rain occlusion, realistic rigged people if licensed; verify current versus prepared AR |
| Supermarket `/store/` | Presentation and sharp camera | Shelving/product detail, floor material scale, checkout lighting; compare existing `/store/dc/` separately |
| Emergency department `/ed/` | Presentation and sharp camera; public safety notice preserved | Audit existing `/ed/floor/` SimReady assets; improve surface detail without changing patient-flow assumptions |
| Dairy `/dairy/` | Presentation and sharp camera | Audit existing `/dairy/plant/`; pipe joins, stainless roughness and signage; retain operational colours |
| Home-energy `/home/` | Presentation and sharp camera | Insulation/roof cutaway, furnishings and landscape; preserve energy controls |
| Office `/office/` | Presentation, sharp camera and 120 detailed instanced workstations with oak tops, metal legs, monitor stands, keyboards and upholstered task chairs | Glazing, ceiling lighting and scanned interior material scale |
| Lodge `/stay/` | Presentation and sharp camera | Guest-room furnishings, breakfast deck and lighting; preserve room-state visibility |
| Hardware retail `/retail/` | Presentation and sharp camera | Timber racks, shelves, packaged goods and yard surfaces |
| Tourism `/tourism/` | Presentation and sharp camera | Terrain, regional landmark fidelity and readable geographic scale; keep data map clear |

Additional twins linked by the Lab home are `/energy/`, `/cars/`, `/delivery/`, `/moving/`, `/viaduct/`, `/trades/`, `/household/`, `/kitchen/`, `/food/` and `/everyday/`. They are queued for source/renderer classification before modification. Not all are the same kind of 3D scene. Study machines and other independently owned surfaces are not silently included.

## Release evidence

No Lab deployment yet for this pass. The main-site homepage release is separate: assemblnz-f0afd79d PR #1864, production merge fa9bb187c16d53a31a424511e725b4e3525ecb8e. Its live media-path correction is tracked separately. Do not infer that a homepage release publishes this Lab repository.

## Additional source classification

Inspected the remaining routes before applying a generic scene upgrade:

- Energy uses a Three.js r128 street renderer with cohort, tariff and CSV controls.
- Cars has a dedicated GLB stage and poster fallback; retain its records and annotations.
- Delivery combines a point-cloud map with a separate floor canvas.
- Moving uses a geographic scene and fictional tenant journey.
- Viaduct separates its waterfront map from restaurant-plan canvas and simulated agent states.
- Trades is a PDF.js plan viewer with SVG measurement overlays, not a 3D room.
- Household is a local browser editor with strict CSP, not a stage-based twin.
- Kitchen has its own Three.js interactive fridge, food selection and door control.
- Food and Everyday are explanatory interactive calculations, not building scenes.

These are classified, not visually upgraded. Office Level 1 camera and detailed workstation geometry were reviewed in the browser without console errors; inline module syntax passed. Screenshot: task outputs `scene-upgrade/office-workstations.png`. Changes are pushed to draft Lab PR #127, not deployed.
