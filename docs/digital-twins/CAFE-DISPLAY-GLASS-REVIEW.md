# Café display glass — 11 November 2026

Browser improvement, not photographic acceptance of the venue.

The source's `cafe_glass_simplified` material has full transmission. Several overlapping panes softened the display behind them in Three r170. The browser now clones only that named physical material and uses a thin-pane Fresnel-alpha approximation: low reflection when viewed straight on, stronger reflection at grazing angles, and no screen-space refraction buffer. Shared original materials remain unmodified; geometry, stock slots and simulation state are unchanged.

This also affects the venue's shopfront and thin-walled counter vessels using the same material. It is an approximation for clear thin glass, not a measured optical material or a solution for solid refractive objects. Master/Cycles glass remains transmissive. Prepared AR files retain their previously documented alpha glass and lighting; this runtime shader is not present in those files. No asset or AR rebuild was required.

## Verification

- All 24 café tests pass, including deterministic outcomes, stock visibility, rig pivots and existing asset/bake hashes.
- Browser module syntax and `git diff --check` pass. This static Lab repository has no package build script.
- Actual browser views inspected at 1280 × 800 and 375 × 812, including noon café, interior and evening restaurant views. No console errors were reported. Narrow viewport and document width both measured 375 px.
- Model remains 11,137,204 bytes, 352,087 rendered triangles, 28 materials and 23 textures. No new texture or model download is introduced.
- Physical-phone rendering, AR placement and photographic scene quality remain unverified.

Screenshots are actual browser captures: [clearer food display](cafe-display-glass/food-display.jpg), [narrow viewport](cafe-display-glass/food-display-375.jpg), [evening counter](cafe-display-glass/evening-counter.jpg). Source and test evidence remains in task outputs `scene-upgrade/cafe-cabinet-food/`.

## Food quality checkpoint

The existing muffin, cookie and croissant scans remain. The scone, toastie, salad and brownie are still authored approximations. A new original brownie study was built, baked and rendered twice; it was rejected because the crust looked tiled and the cut faces remained block-like. Its script, editable masters and renders are retained outside the repository in the task output folder. It was not integrated or described as a scan. Suitable menu-matched captures remain a separate open requirement.

Confidence: 0.95 in preserved model/state contracts, 0.85 in the inspected browser glass improvement. Those figures do not establish user acceptance or full scene realism.
