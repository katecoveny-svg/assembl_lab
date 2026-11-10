# Café counter detail — 11 November 2026

Local architectural review candidate. This is a material and geometry improvement, **not yet photorealistic reference quality**, a measured equipment specification or a deployed release.

The coffee camera now looks across the working side of the counter at eye level. Cups have hollow interiors, rolled rims, feet and handles; milk pitchers have thin walls, pouring lips and handles. The knock box is open, a tamper sits beside it, and the generic two-group machine has removable panels, rear ventilation, screw heads and marked pressure gauges. The existing portafilter pivots, second-station control and café/dinner cup visibility are preserved.

Five chocolate cookies share one ambientCG `3DCookie001` mesh inside a hollow glass jar. Two `3DPastry001` croissants share another mesh on a ceramic platter. They are static styling, explicitly separate from simulated stock and menu identities. The existing eight muffin stock slots remain linked to their own scan; scone, toastie, salad and brownie stock are still authored approximations. There is no claim of NZ food origin or a named equipment supplier.

The legacy rounded street trees and planter shrubs now appear only in the simple maquette. They were surviving outside the authored-model replacement and visibly undermining its close-up views. Detailed Poly Haven plants in the venue remain. This removes placeholders; a realistic exterior landscape is still an open task.

## Sources and reproducibility

- [ambientCG 3DCookie001](https://ambientcg.com/view?id=3DCookie001): 50,000 triangles in the separate 2K master; 13,282 in the 1K browser copy. Placed at an illustrative 62 mm width.
- [ambientCG 3DPastry001](https://ambientcg.com/view?id=3DPastry001): 49,999 triangles in the separate 2K master; 11,751 in the 1K browser copy. Placed at 180 mm width.
- Both are [CC0](https://docs.ambientcg.com/license/); original archives are unchanged. Source/derivative hashes and changes are recorded in `assets/models/cafe/source/counter-scans-source.json`. Original dimensional metadata is approximate; it is not a measured café portion specification.
- Colour, OpenGL normal, occlusion and UVs survive the conversion. Neutral side-by-side renders compare unchanged geometry on the left with the browser derivative on the right. Fine texture is softer at 1K, while cracks, pastry layers and silhouette remain legible at the counter distance.

Run `prepare-counter-scans.py` in Blender with source/output directories, then `prepare-counter-scans.mjs` with the original-GLB/download directories. `counter_detail.py` is called by `build_cafe.py`; follow the build with `optimise.mjs` and `write_contract.mjs`. Re-run the three daylight bake/denoise/pack steps documented in `CAFE-DAYLIGHT-REVIEW.md`. `review-counter.py` uses `CAFE_COUNTER_REVIEW` for an evidence directory outside the repository and reopens the actual venue master.

## Measured delivery and verification

| Measure | This candidate |
|---|---:|
| Browser venue GLB | 11,137,204 bytes |
| Rendered triangles before runtime visibility | 352,087 |
| Unique-mesh triangles | 120,931 |
| Materials / textures | 28 / 23 |
| Seven rebuilt sky-transport maps | 2,086,060 bytes |
| Table / full-size AR GLB | 18,706,220 / 18,706,316 bytes |
| Table / full-size USDZ | 19,144,156 / 19,144,233 bytes |
| AR triangles, with hidden optional kit excluded | 341,717 |

The venue allowance increases from 8 MB / 250k triangles to 12 MB / 380k to retain the scanned food and hollow vessels. This is an explicit quality tradeoff, not a phone-performance claim. No geometry was dropped or simplified by the AR snapshot. No Draco or meshopt decoder is required by this venue loader.

The browser had cached the old GLB during review. The contract is now revalidated, its measured hash versions the GLB URL, and map hashes version daylight textures. A mismatched lighting manifest falls back to live lighting instead of applying a bake from another model. The new URLs and 11,137,204-byte asset were observed in the browser. The page versions its updated loader/daylight imports as well.

24 tests pass: unchanged simulation golden outcomes, full stock/station/portafilter rig, source and bake hashes, scan maps/scale/shared geometry, ceiling/floor geometry and decision/serving behaviour. Inline scripts parse and `git diff --check` passes. Desktop and 375 × 812 browser views were inspected; document width was 375 px at the narrow viewport. Detailed/simple switching worked and no console errors were observed. A five-second local scheduling sample gave 301 rAF intervals, median 16.7 ms and p95 17.1 ms at 1280 × 720, DPR 2; this is not GPU timing or a physical-phone benchmark.

Both USDZ files pass OpenUSD validators and ARKit compliance with no reported errors or warnings. The tabletop USDZ was reopened and rendered in Blender with explicit review lighting. Its floor bounds reach zero; the full-size origin retains the existing doorway orientation. This is file validation, **not physical iPhone/Android placement validation**. AR includes the ceiling and floor infill, but uses the viewer's lighting and an alpha approximation for glass; the browser's sky-transport shader is not baked into these packages.

Evidence lives in the task output directory `outputs/scene-upgrade/cafe-counter-detail/`: source comparisons, editable review master, browser desktop/mobile captures, bake masters, test output, export reports and USD checks. The screenshot `counter-browser.jpg` is the actual interactive browser, not the Cycles still.

Next fidelity gaps: menu-matched scanned food, richer furniture/upholstery and glazing detail, actual landscape assets, spatial reflections and practical-light bounce. The homepage's NZ planting and architectural material brief remain separate unfinished work. Confidence is high in source/rig preservation (0.97), moderate in cross-viewer appearance (0.75) until device review; the complete photorealism target is not accepted by these technical checks.
