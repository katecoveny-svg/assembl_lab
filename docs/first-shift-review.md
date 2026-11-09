> Historical prototype record. For the verified current-main integration and new authored-scene evidence, see [First Shift immersive review](first-shift-immersive-review.md).

# First Shift: café morning-rush prototype

## Delivery boundary

Local-only review branch `prototype/first-shift`. Open `/cafe/?shift` (server: `python3 -m http.server 8764 --bind 127.0.0.1` from this checkout). No deployment, push, main-site change, service installation or paid service. This extends the existing café engine and scene, and uses existing `/ar/embed.js`; no shared renderer/AR infrastructure files were changed.

Source remote verified: `https://github.com/katecoveny-svg/assembl_lab.git`. Initial supplied checkout `/Users/kateharland/tmp-assembl/lab/site` was clean at `27ed869`. A newer local repository at `/Users/kateharland/Documents/Codex/2026-10-29/task-6/assembl_lab` supplied committed baseline `655f94a`; its uncommitted Study work was neither copied nor modified. Prototype was rebased onto that committed baseline in this independent clone. GitHub HEAD verification failed because shell DNS could not resolve github.com. This is not claimed to be current production HEAD.

## Audit findings and reuse

- `assets/twin/1/stage.js`: vendored Three.js 0.170 shared stage, quality tiers, adaptive rendering, camera travel, hotspots, Explore, Compare, clock/weather, sound, poster fallback. Kept intact.
- `cafe/index.html`: substantial deterministic engine, instanced customers, detailed procedural counter/machine/cups/tables/kitchen, source classifications, roster and station levers. Best focused improvement: expose a small decision loop over this existing world instead of adding a parallel renderer. The original long analytical page remains at `/cafe/`.
- `stay/index.html`: existing shared-stage accommodation venue; potential future reception/housekeeping scenario. Not modified.
- `home`, `office`, `dairy`, `tourism`, `store`, `retail`: source inspection confirms shared-stage consumers. Home/office cover building energy; dairy has process flows; store/retail have shopper and operations models. Good reuse candidates, but not scenario-tested here.
- `energy/index.html`: independent energy retailer journey page, with its own visual/operating treatment; not an obvious reason to replace the café's established engine.
- `food/index.html`: Food Flow Aotearoa household/national flow explainer. No dedicated freight simulator established from the inspected files. Do not describe it as a verified freight world.
- `/Users/kateharland/assembl-3d-gallery/demo-energy.html`: older green-brand editorial energy demonstrator; avoid inheriting its obsolete type/colour canon.
- `/Users/kateharland/assembl-demonstrators/scripts/scene.js`: Summerset villa assembly treatment using a published-plan concept, not a café operation engine. Read-only reference; client imagery/claims not reused.
- Main repo `AGENTS.md` and `docs/integrations/assembl-lab.md`: preserve separate Lab ownership, illustrative maturity and stage version boundaries. Current task's plum/Instrument Sans direction overrides obsolete green canon in the older tmp checkout. No main-repo files touched.

### Live inspection

Browser opened `https://lab.assembl.co.nz/cafe/` successfully on 9 November 2026, after remote web fetch failed. It shows café/restaurant modes, a running model, levers and a long analytical page; it also already has tabletop and step-inside AR plus Detailed model/Simple maquette controls. A live-weather-unavailable fallback was visible. These production enhancements are newer than this prototype baseline. **Integrate the small First Shift adapter into current production source after review; do not replace production with this whole checkout.** Other live worlds were not individually exercised.

## Implemented interaction

`/cafe/?shift` opens paused at 8am on an illustrative October Tuesday in Auckland. Four choices replay from opening with an identical customer cohort: existing setup, second station, forecast roster, both. Watch, pause (including an in-scene pause), jump to 10am, reset and replay. Changing a plan resets the run. Outcomes compare walk-aways and estimated labour through 10am. All figures are model output, not real savings, payroll guidance or certification. Equipment purchase costs explicitly excluded.

The supplied model returns 12 walk-aways / NZ$539.96 labour for baseline and station-only; 9 / NZ$588.50 for roster and both. The useful lesson in this particular rush is that adding a machine alone does not fix staffing. These choices are pre-shift planning comparisons, not retroactive mid-shift actions.

Phone mode uses a 400px scene, stacked controls, native buttons, visible text outcomes and low rendering quality by default unless a quality query is supplied. Watch brings the scene into view, because the shared stage suspends offscreen animation. Reduced-motion starts paused, suppresses CSS transitions and uses immediate figure placement; users can advance to the outcome without animation. The shared stage's camera reduced-motion support is reused.

## AR scope

Uses existing `assemblAR.button`, snapshot conversion and GLB/USDZ exporters, `qr:false`, budget 60,000 triangles. The root venue is exported, not stage lights/table. Original café source explicitly says its plan units are metres; `unitsPerMetre:1` preserves that conversion before the explicit `scale:'table'` resizes the illustrative maquette. No survey/real-venue accuracy claim.

- iPhone/iPad Safari: existing capability routes to USDZ Quick Look, same-device tap.
- ARCore-capable Android Chrome over HTTPS: existing capability routes to WebXR hit-test placement.
- Unsupported devices: explanatory fallback and explicit GLB/USDZ download controls. No same-phone QR requirement.
- Placement is a static snapshot. Simulation state, decision controls and moving customers do not transfer.
- Physical iPhone/iPad/Android placement, tracking, occlusion, permissions, first-tap Quick Look and texture fidelity were **not tested**. Localhost on the Mac is not a phone-accessible deployment.

## Verification and evidence

- `node cafe/tests/first-shift.test.mjs`: PASS — deterministic replay, identical customer arrival/type/size cohort, exact 10am endpoint, finite labour, meaningful staffing tradeoff.
- `node --check cafe/first-shift.js`, `git diff --check`: PASS.
- Browser: baseline and roster/combined outcomes, plan reset, Watch/Pause, in-page controls and desktop WebGL rendered. No console errors observed in the checked run.
- Corrected evidence after independent review: the original desktop file was mistakenly identical to the mobile capture. Both files have been recaptured and checked on disk. Desktop viewport verified at 1440 × 1000; full-page image is 1440 × 1351 (SHA1 `6dbd8621225e64fa136b871850d15b3751c998bd`). Mobile viewport 375 × 812, scroll width 375; full-page image is 375 × 1959 (SHA1 `bbfaf4913f5f3958459200dc236a009a08fa1323`). Files: `output/playwright/first-shift/desktop.jpg` and `mobile.jpg`.
- Reduced-motion emulation: page loaded paused and click-to-outcome worked. The initial keyboard automation timed out. Follow-up native keyboard checks passed: Enter on Watch starts the run; Enter on Jump while running completes it with Replay rush and disabled Rush paused scene control; Enter on Replay starts again; Space on scene Pause stops it. Complete tab-order and assistive-technology QA remain unverified. Browser emulation/viewport overrides cleared afterwards.
- Downloaded GLB and USDZ via actual buttons. USDZ was approximately 8.9 MB and `unzip -t` passed. Desktop no-AR fallback worked. Native camera session not exercised.

## Limitations / next review

This is a focused useful interaction improvement over existing geometry, not a new photoreal café or a hotel experience. The underlying page still computes its legacy analytical sections even though First Shift hides them; further extraction could reduce startup work. No physical-phone performance measurements, whole-Lab regression suite, all-world live audit or production release test was performed. Do not conflate browser screenshots with physical-device AR proof. No safety/allergen curriculum was added; a future such scenario must use the venue's Food Control Plan and verified NZ guidance.

## Scoped review correction

Run and scene-pause labels/disabled state now derive together from the same running flag and completion time. Jump-to-end and automatic completion both produce Replay rush; reset returns Watch the rush; scene pause is disabled whenever paused. The fix changes only `cafe/first-shift.js`, this review and the two evidence images. Model tests, module syntax and whitespace checks passed again. No publication or changes to the newer production baseline.
