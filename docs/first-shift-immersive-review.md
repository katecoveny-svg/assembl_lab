# First Shift — authored café review

## Verified source and release boundary

Repository: `https://github.com/katecoveny-svg/assembl_lab.git`.
Baseline: **`6e653ee78be69ea82dde08fb295fe916b51e6155`**, verified independently with the connected GitHub commit API for `main` and successful `git fetch origin main` on 9 November 2026. This supersedes the earlier local-only baseline limitation. The live café's Detailed model / Simple maquette and tabletop / step-inside source are present here.

Branch: `prototype/first-shift-immersive`, independent task checkout `business-lab`. The earlier prototype remains on `prototype/first-shift` at `e4c2c90`. Integration preserves the fetched main source, including `assets/twin/2`, the authored café model/rig and `/ar/worlds/button.js`; it adds only the opt-in `/cafe/?shift` presentation and café-scoped adapter. No changes to shared AR/stage infrastructure, Auckland, NZ World, hospital, Study, main website or other workers' checkouts. Nothing pushed, deployed, installed or rendered in Blender. Latest main was verified at task time, not claimed immutable after that point.

## Concrete visual and interaction gains

- Uses existing authored **2,150,472-byte / 63,204-triangle** café GLB, with its original rig and material assets. Fluted oak counter, espresso machine/grinder, glass cabinet and stock, mint kitchen tiling, steel equipment, menu/roster boards, furniture, glazing and umbrellas replace the older prototype's simple venue meshes. Simulation still supplies people, orders, cups, plates and operating states. No asset regeneration or invented measured venue.
- Full-width venue with dedicated desktop/mobile hero compositions; 660px canvas at the verified 1440×1000 desktop viewport and 450px on the phone. A separate counter close-up makes equipment and queue context visible.
- Six persistent camera pills replaced with one accessible native selector. Hero has **zero** persistent operational labels; counter view has only the coffee label. Kitchen, roster and tables expose their relevant label. Existing scene hotspot picking remains available.
- Compact four-choice decision deck, two live/output measures, one line of guidance, replay/reset and in-scene pause. Assumptions and model downloads are secondary disclosures. Instrument Sans, plum/rose actions and editorial white retained.
- Phone full-page capture is **375×1290**, versus the previous **375×1959** evidence. No horizontal overflow. The model and decisions remain useful; text is not simply hidden without access.
- One prominent same-device **Place café in AR** entry with an adjacent “Static tabletop · simulation stays here” limitation. Existing full café route retains its separate tabletop/step-inside entry points; First Shift does not present those as interactive simulation transfer.

## Model and accessibility behaviour

All plans replay the same Tuesday customer cohort from opening to 10am. Baseline and station-only yield 12 walk-aways / NZ$539.96 estimated labour; roster and both yield 9 / NZ$588.50. These are deterministic illustrative outcomes, not savings guarantees. Equipment purchase cost is excluded, and the interface explicitly says so.

Completed runs show Replay rush and a disabled scene-pause control. Plan switches and reset restore the paused start; the chosen camera can be retained. Watch scrolls the scene into view on mobile because the shared stage suspends offscreen rendering. Reduced-motion uses immediate camera/figure placement, starts paused, and supports direct keyboard activation of outcomes without watching animation. Native buttons/select and visible focus styling are retained. Full tab-order/screen-reader and physical-device testing remain outstanding.

## AR integration and verified export

Read-only inspection of `ar/embed.js`, `ar/js/place.js` and `ar/js/prepare.js` confirmed the existing snapshot/export contract. No shared files changed. Source café units are metres, passed as `unitsPerMetre:1`; explicit `scale:'table'` then produces a 38cm-wide illustrative display model. Snapshot includes the current venue root, authored model and current people, excludes scene lights/table, and pauses the simulation before preparation. Cache key includes graphics mode, selected plan and model minute. GLB/USDZ export controls are within the disclosure. The exporter may simplify geometry, explicitly stated in the report.

Actual browser downloads verified:

- GLB v2, **3,918,308 bytes**, 70 merged meshes/materials. Authored oak, brushed steel and mint-tile material names present. Baked position bounds: **0.3800 × 0.05517 × 0.3800 metres**; minimum Y = 0. Confirms tabletop sizing/grounding and authored geometry, not survey accuracy.
- USDZ **11,988,207 bytes**, 73 archive entries; ZIP integrity test passed.
- Snapshot UI reported **70,404 triangles**, within the requested 90,000 snapshot budget.
- iPhone/iPad Safari uses existing Quick Look; supported Android Chrome uses existing WebXR over HTTPS. `qr:false` avoids a same-phone QR requirement. Unsupported devices receive existing no-AR feedback and can use downloads.
- **Not verified:** actual iPhone/iPad/Android camera placement, first-tap gesture handling, tracking, occlusion, native texture fidelity, placement performance. localhost is not a phone-accessible release. Static snapshots do not carry browser decisions/animations into native viewers. These are viable entry/export paths, not a claim of exceptional or perfect physical-device AR.

## Checks performed

1. `node --test cafe/tests/*.test.mjs`: **15 passed**. Includes byte-identical business-model script, golden operational/P&L/proof snapshots, deterministic customers, operating-state invariants, authority/honesty labels, GLB node/pivot/hash/budget contract, rig alignment and nonmutation, stage-v2 isolation, First Shift tradeoff test. Added inline-module syntax parsing to catch integration syntax errors.
2. `node --check cafe/first-shift.js` and `git diff --check`: passed.
3. Desktop browser: loaded authored model; Enter Watch → Enter outcome → Replay; Enter replay and Space scene pause; five successive plan selections reproduced expected values; repeated reset/outcome cycles passed. Counter selector exposed exactly one operational label and one visible AR entry.
4. Narrow/reduced-motion browser: 375×812 viewport, `prefers-reduced-motion:reduce` true, default low quality, scrollWidth=375. Enter selected staff plan and produced the 10am result while paused. Emulation cleared after test.
5. Existing `/cafe/?quality=low` smoke check: original heading and step-inside AR entry present; Simple maquette and Detailed model buttons both returned their expected status. No changes to the original engine.
6. Real GLB/USDZ button downloads and file inspection described above. Results saved in `output/playwright/first-shift/immersive-export-check.json`.

## Evidence

- `output/playwright/first-shift/immersive-desktop.jpg`: 1440×1199 full page, verified 1440×1000 viewport.
- `output/playwright/first-shift/immersive-mobile.jpg`: 375×1290 full page, verified 375×812 viewport and no overflow.
- `output/playwright/first-shift/immersive-counter.jpg`: authored counter close-up with contextual coffee state.
- `output/playwright/first-shift/immersive-tests.txt`: regression test output.
- `output/playwright/first-shift/immersive-export-check.json`: inspected export contents/bounds.

The earlier `desktop.jpg`/`mobile.jpg` and `first-shift-review.md` are historical prototype evidence, not this latest authored-scene presentation. The new desktop and mobile files are distinct and their pixel dimensions were independently checked with `sips`.

## Remaining limitations

This is a substantial presentation/integration improvement using existing authored assets, not a new photoreal venue or measured digital twin. The long café page still computes its hidden analytical sections; further extraction could reduce startup CPU. No new legal/safety curriculum, hotel scenario, whole-Lab browser regression, physical-phone performance profile or production release verification. The inherited shared AR layer may receive concurrent improvements elsewhere; recheck its final version during integration. Review before publication.
