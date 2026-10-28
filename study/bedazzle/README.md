# Bedazzle Studio

Standalone original instrument at `/study/bedazzle/`. No build step; serve the repository root. Uses the existing local Three.js module and OrbitControls. No network-loaded art, accounts, analytics, uploads or project-resource fetching. Study/navigation integration is intentionally left to the parent task.

## Features

- Original procedural ellipsoid brush back, capsule handle, collar and instanced bristles; separate flat board.
- Three faceted stone geometries, six colours, three sizes and three finishes; single, mirror-pair and three-stone row placement.
- Raycast pointer/touch placement; analytic ellipsoid normals orient stones onto the curved surface. Conservative circular footprints enforce edge margins and reject overlaps (including elongated stones). The usable brush-back area intentionally excludes the handle.
- Orbit/zoom mode, visible keyboard placement cursor, erase, reversible clear, 80-step undo/redo. Changing surface starts a blank surface and can be undone.
- 350-stone cap; stones instanced by geometry/colour/finish; render on changes, no animation loop. Device pixel ratio capped at two. Design uses `pan-y` touch action; orbit reserves canvas gestures and page scroll remains available outside it.
- Local JSON round-trip, 100 KB file limit, version/schema/enum/number/geometry/count validation. Known fields are reconstructed; imported content is never executed or used as a URL.
- Current-view 1200×1200, 1200×1600 or 1600×1200 PNG/JPEG export; optional transparent PNG. Native file-share sheet when supported, download fallback otherwise. No automatic posting.
- Editable polygon SVG for board placements only. Print preview plus browser print stylesheet; clicking preview never sends a print job.

Layouts are decorative, not verified physical fitting templates. No GLB or manufacturing export is offered. Camera framing is retained for images, including deliberate zoom/crop.

## Project schema (version 1)

`{version: 1, mode: 'brush' | 'board', stones: Stone[]}`

A Stone contains finite `x`/`y` surface coordinates, `size` in `[0.11, 0.16, 0.23]`, `shape` in `round | square | marquise`, `finish` in `crystal | metal | pearl`, and `color` in `#cf9aff | #ef74b6 | #74cbd1 | #edbf66 | #96b8ef | #f6f0ff`. At most 350 stones; every stone must pass surface boundary and pairwise footprint checks. Unsupported versions and invalid/oversized projects leave the current design unchanged.

## Validation evidence

Browser: installed Playwright Chromium, one scene at a time. Phone checks are **390×844 emulation, not physical iPhone testing**.

- Pointer: clear → click gives 1 stone; repeat click stays at 1; erase gives 0.
- Keyboard: Enter gives 10 from default 9; change shape and colour, undo gives 9 and redo gives 10.
- Project: save 10 stones, clear to 0, load restores 10; invalid x=99 rejected; 100001-byte project rejected; original state retained.
- Row gives 3 stones; mirror pair gives 2; SVG contains independently editable polygon elements.
- Orbit screenshot shows gems aligned to curved brush back. Front and side views inspected visually.
- Six image exports checked with file signatures and Pillow: PNG/JPEG at 1200×1200, 1200×1600, 1600×1200. Transparent PNG corner is RGBA (0,0,0,0); opaque PNG corner alpha is 255.
- Current-state comparison: decorated vs cleared export differs within image bounding box (441,266,755,709).
- Native share flow opened and was dismissed without selecting a destination. Unsupported-sharing simulation downloaded a valid PNG; actual third-party delivery was not tested.
- Print preview displayed image/count; print-media main controls were hidden. No printer was invoked.
- Touch tap gives 1 stone. Swipe moved page scrollY from 124.5 to 271.5. No horizontal overflow; computed touch action `pan-y`. Reduced-motion preference tested; no continuous animation exists.
- Simulated unavailable WebGL displays recovery guidance and disables controls.
- `node --check study/bedazzle/studio.js` passed.

Review screenshots in `evidence/`: `desktop.png`, `orbit.png`, `phone.png`, `board.png`, `print.png`. Export sample files were generated locally in `/tmp/bedazzle-*`; these are not dependencies.

## Licences

Three.js and its OrbitControls use the repository's existing MIT licence at `assets/vendor/three/LICENSE`. No new third-party library, model, image, font or trademarked artwork was added. All geometry, layout, material choices and starter placements are original procedural work for this instrument.
