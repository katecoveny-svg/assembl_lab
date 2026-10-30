# Validation — 28 October 2026

Isolated clone: `/Users/kateharland/Documents/Codex/2026-10-28/task-4/assembl_lab`.
Initial implementation: `feat/playable-art-instruments`, based on `fc7eb93abe0ea80a4ea0b448b0b622581108b5bf`.
Review follow-up: `fix/art-instrument-review`, based on current main `cb0d83351d6cb783a398c6069e09e6859e6a6d44` after PR #24 was merged externally. Git confirms the merge; the parent reported production READY on that baseline. This follow-up has not been merged or deployed by this agent.
Original checkout was read only; all implementation paths are under `instruments/`.

## Executed checks

`npm run build` passes. The initial browser suite passed **19 tests; 2 intentionally skipped** (CDP touch is specific to the mobile Chromium project). The complete follow-up suite passed **61 browser tests; 2 platform-specific skips**, plus **6 deterministic unit tests**. This includes 12 control/export regression cases, 15 Auto/state-preservation/native-print cases, and 15 independent measurement runs.

| Environment | Reality Remix | Soft Matter | Impossible Objects |
| --- | --- | --- | --- |
| Chromium 156 desktop, 1440×1000 | Spark Gaussian render, brush/dissolve/vortex, undo, reassemble, freeze | Real Rapier cage deformation, reset, finite state | Manifold geometry, slider change, undo, GLB |
| Chromium Pixel 7 emulation, 393×727 CSS viewport | 2,400 Gaussian lighter mode, same controls | 92-particle cage; actual CDP touch drag and two-finger gesture | 32-segment lighter geometry, GLB |
| Playwright WebKit 27.2 desktop | Spark render and gestures pass | Rapier WASM and live deformation pass | Manifold WASM and GLB pass |

All three environments: rendered-colour pixel check, PNG signature and nontrivial image size, no horizontal page overflow, and no uncaught page errors in normal flows. Save/export tests operate through the visible UI. Explicit 2D fallback and file-share download fallback pass. Blocking the Manifold WASM request yields a clear error and a working link to the 2D study. Print media hides controls and displays a captured PNG; Chromium generated print PDFs locally.

This is **WebKit engine evidence, not a test on physical iOS Safari**. Native sharing UI and print dialogs are not automated; capability detection/download fallback and the print document are verified. Two-finger touch events were exercised without a crash; camera-motion equivalence to every physical device is not claimed.

## Performance observations

The original ~29 FPS desktop splat claim is **withdrawn**. Its counter accumulated the simulation timestep capped at 34 ms, which inflated slow frame rates. The counter now uses uncapped wall time; simulation retains the 34 ms cap and Rapier's bounded fixed-step catch-up. Hidden-tab time resets the measurement window.

Six deterministic unit tests cover 5, 10, 15 and 60 FPS, a two-second active stall, and visibility reset. Slow frames now report their actual rates rather than approximately 29 FPS.

Independent measurements count requestAnimationFrame callbacks over five wall-clock seconds after two seconds of warm-up. These are **idle-scene measurements**, not interaction-latency or physical-device benchmarks. The instrument's one-second readings are recorded alongside the independent counts in `output/performance/*.json`.

| Headless environment | Reality Auto | Reality lighter | Reality manual Full | Soft Matter | Impossible Objects |
| --- | ---: | ---: | ---: | ---: | ---: |
| Chromium desktop 1440×1000 | 27.9 FPS | 26.9 FPS | 13.5 FPS | 38.9 FPS | 27.4 FPS |
| Chromium Pixel 7 emulation | 28.8 FPS | 29.4 FPS | 10.1 FPS | 60.2 FPS | 59.0 FPS |
| WebKit desktop | 60.1 FPS | 60.0 FPS | 60.1 FPS | 60.1 FPS | 60.1 FPS |

**Default corrected:** Reality Remix Auto now conservatively renders 2,400 splats on every viewport, avoiding the slow Full first experience in Chromium. Full (5,600) remains an explicit choice and is slow in the Chromium measurements above. The UI warns that it can be slower. The complete 5,600-splat model remains resident and receives every edit, so changing visible density never reconstructs or resets the artwork. Removing MSAA, as Spark recommends for Gaussian rendering, did not eliminate the bottleneck: before/after full-quality samples were 14.1 and 15.4 FPS, too small a change to claim a substantial improvement. Those historical raw results are preserved in `before-msaa/` and `pre-auto/`. Current files explicitly distinguish `-auto`, `-light` and `-full`; the table above uses the fresh Auto-correction run. Host background load was not controlled, so small differences across runs are not attributed solely to code changes. The UI reports low rates honestly; full quality is not described as universally smooth. Geometry rebuilding and shader warm-up can also briefly stall rendering; five-second idle rates do not hide those costs.

Pixel caps: 1.75 full, 1.25 lighter. Gaussian counts: 5,600 / 2,400. Cage counts: 162 / 92. The 90° test solid has 8,688 / 3,522 triangles. Hidden documents stop active updates. These observations do not predict physical phone thermal/battery behavior.

## Review corrections

Quality controls now update rendering in place rather than navigating/reloading. Tests compare the complete frozen edited sculpture before/after Auto → Full → Lighter → Auto, verify visible coloured pixels after each switch, preserve freeze/undo state and exercise Undo afterwards. The other two instruments also preserve current state across quality switches; their cage/mesh resolution remains fixed at startup while live pixel density changes. The 2D fallback disables this selector.

The native `beforeprint` path synchronously flushes pending solid geometry, sharing the same flush as image/mesh capture. A paused-clock test edits Carve then dispatches `beforeprint` before the 70 ms timer; dimensions update immediately and the still is generated. No physical printer dialog is opened by this test.

Four focused visible-control tests failed on the initial implementation and passed after correction: Home undo, End undo, pending-edit GLB export, and preset highlight after Undo/Reset. A paused browser clock keeps the 70 ms geometry update pending while the user activates Export; the saved GLB now matches the current dimensions and triangle count. Export/capture flush pending geometry; failed geometry cannot silently export the prior design. Preset highlights are derived from the actual parameters, including no selected preset for custom edits.

Crease-aware normals smooth shared curved surfaces while retaining edges over 60 degrees. Only normal/index packing changes; positions, triangle count and the 0.03 metre export transform remain unchanged. The original physical print and device limitations still apply.

## Export results

- PNG: signature checked (`89504e470d0a1a0a`), >10 KB and visible artwork captured.
- GLB: `glTF` magic, version 2, exact declared byte length, valid JSON mesh/node structure, and 0.03 metre transform verified. Dimensions shown in millimetres. Example test solid: 66 × 69 × 64 mm, one connected component, Manifold status `NoError`.
- GLB is an art mesh without `EXT_mesh_manifold`; no STL/3MF or animation loop export is claimed.
- Wall thickness, post-warp self-intersections, supports, print tolerances and physical strength are not checked. No physical output tested.

## Evidence

Committed screenshots in `output/playwright/`: desktop, emulated mobile and WebKit for all three instruments; the 2D fallback; and `mobile-touch-stretch.png` during a real touch drag. Local generated GLB/PDF files and detailed JSON results are ignored build/test artifacts.

## Remaining limits / release gates

- Parent must integrate entry links and confirm release scope. No Study navigation/overview file changed.
- Initial PR #24 was merged externally. This agent performed no merge, deployment or rollback. The review follow-up remains separate from that production baseline. Protected preview authentication remains unverified; no Vercel CLI, bypass token, deployment-protection changes or credentials were used.
- No physical phone testing; Reality Remix “Auto” chooses lighter rendering on every screen; other instruments use lighter startup detail on narrow screens. Low-end WebGL2 support still varies; a labelled 2D study remains available.
- Soft Matter has an anchored boundary cage, not arbitrary volumetric FEM, tear/plasticity or self-collision. No claims of those features appear in the UI.
- Reality Remix is original synthetic Gaussian artwork, never labelled a captured scan.
- Next-stage Liquid Playground, Sonic Loom and Time Sculpture are not included or represented by placeholders.
