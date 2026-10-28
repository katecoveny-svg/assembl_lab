# Validation — 28 October 2026

Isolated clone: `/Users/kateharland/Documents/Codex/2026-10-28/task-4/assembl_lab`.
Branch: `feat/playable-art-instruments`; base current `origin/main` at `fc7eb93abe0ea80a4ea0b448b0b622581108b5bf`.
Original checkout was read only; all implementation paths are under `instruments/`.

## Executed checks

`npm run build` passes. The browser suite passed **19 tests; 2 intentionally skipped** (CDP touch is specific to the mobile Chromium project).

| Environment | Reality Remix | Soft Matter | Impossible Objects |
| --- | --- | --- | --- |
| Chromium 156 desktop, 1440×1000 | Spark Gaussian render, brush/dissolve/vortex, undo, reassemble, freeze | Real Rapier cage deformation, reset, finite state | Manifold geometry, slider change, undo, GLB |
| Chromium Pixel 7 emulation, 393×727 CSS viewport | 2,400 Gaussian lighter mode, same controls | 92-particle cage; actual CDP touch drag and two-finger gesture | 32-segment lighter geometry, GLB |
| Playwright WebKit 27.2 desktop | Spark render and gestures pass | Rapier WASM and live deformation pass | Manifold WASM and GLB pass |

All three environments: rendered-colour pixel check, PNG signature and nontrivial image size, no horizontal page overflow, and no uncaught page errors in normal flows. Save/export tests operate through the visible UI. Explicit 2D fallback and file-share download fallback pass. Blocking the Manifold WASM request yields a clear error and a working link to the 2D study. Print media hides controls and displays a captured PNG; Chromium generated print PDFs locally.

This is **WebKit engine evidence, not a test on physical iOS Safari**. Native sharing UI and print dialogs are not automated; capability detection/download fallback and the print document are verified. Two-finger touch events were exercised without a crash; camera-motion equivalence to every physical device is not claimed.

## Performance observations

On Kate's Mac during headless browser interaction, representative in-app measurements:
- Chromium desktop: splats ~29 FPS, soft cage ~53 FPS, refined solid ~31 FPS.
- Mobile Chromium emulation: splats ~34 FPS, soft cage ~58 FPS.
- WebKit desktop: splats ~60 FPS.
- Other brief tests completed before the one-second FPS window: a displayed zero is **not** a measured zero-FPS result and is omitted.

These are observations, not calibrated benchmarks or promises for phones. Pixel caps: 1.75 full, 1.25 lighter. Gaussian counts: 5,600 / 2,400. Cage counts: 162 / 92. The 90° test solid had 8,688 / 3,522 triangles after refinement. Fixed physics steps and bounded catch-up prevent a stalled tab from simulating an unbounded backlog. Hidden documents stop active updates.

## Export results

- PNG: signature checked (`89504e470d0a1a0a`), >10 KB and visible artwork captured.
- GLB: `glTF` magic, version 2, exact declared byte length, valid JSON mesh/node structure, and 0.03 metre transform verified. Dimensions shown in millimetres. Example test solid: 66 × 69 × 64 mm, one connected component, Manifold status `NoError`.
- GLB is an art mesh without `EXT_mesh_manifold`; no STL/3MF or animation loop export is claimed.
- Wall thickness, post-warp self-intersections, supports, print tolerances and physical strength are not checked. No physical output tested.

## Evidence

Committed screenshots in `output/playwright/`: desktop, emulated mobile and WebKit for all three instruments; the 2D fallback; and `mobile-touch-stretch.png` during a real touch drag. Local generated GLB/PDF files and detailed JSON results are ignored build/test artifacts.

## Remaining limits / release gates

- Parent must integrate entry links and confirm release scope. No Study navigation/overview file changed.
- No production deployment or merge. Protected preview authentication remains unverified; no Vercel CLI, bypass token, deployment-protection changes or credentials were used.
- No physical phone testing; default “Auto” chooses lighter quality on narrow screens. Low-end WebGL2 support still varies; a labelled 2D study remains available.
- Soft Matter has an anchored boundary cage, not arbitrary volumetric FEM, tear/plasticity or self-collision. No claims of those features appear in the UI.
- Reality Remix is original synthetic Gaussian artwork, never labelled a captured scan.
- Next-stage Liquid Playground, Sonic Loom and Time Sculpture are not included or represented by placeholders.
