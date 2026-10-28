# Stage-two validation · 28 October 2026

Isolated checkout/branch `codex/stage-two-instruments`; refreshed main base `cb0d83351d6cb783a398c6069e09e6859e6a6d44`. Existing instrument code/build outputs, patterns and Study overview are untouched. No production merge, provider spending, uploads or credential changes.

## Sonic Loom

Verified with actual UI gestures: AudioContext absent before Play, running after Play; original oscillator events and a non-zero analyser signal; mute gain approaches zero; Pause suspends audio; Play resumes. Injected rejected resume recovers on retry. Synthetic interruption/visibility changes stop audio, and visibility recovery does not automatically start sound. Three real route exits close the audio context, and browser Back reconstructs a silent instrument. Voice count is bounded at 16. These are signal/state checks, not a subjective listening assessment.

Keyboard 1–8 and pointer drag produce visibly changed ribbon pixels. Rhythm changes the rendered mesh; keyboard orbit changes the view. Reduced-motion preference now starts paused and removes idle drift. Explicit Play/pluck can resume motion. Tempo/tension and undo/reset remain available.

## Time Sculpture

Actual `texSubImage3D` upload verified: 128×128×64, 4,194,304 source bytes. The RGBA8 GPU allocation is nominally another 4 MiB; whole-process/GPU resident memory is not measured. Regeneration briefly retains old/new CPU arrays until GC. No decoder or user video is present.

Orbit/drag and keyboard orbit expose actual 3D depth. Time, slice thickness and background threshold each change canvas pixels; Home/End slider edits are undoable. PNG and print snapshots verified. Idle volumes now redraw only for changes. Active sweeps use 96 ray samples at a bounded 0.65 render pixel ratio; the full 128×128×64 data texture is retained. This reduced the software-rendered sweep from approximately 128 ms mean frame spacing to approximately 21 ms in short samples.

## Liquid Playground

The particle-only first draft has been replaced by a **connected smooth 3D density surface**. Actual solver positions are deposited into a 40³ scalar field. Marching cubes from the existing pinned Three 0.186.1 package extracts the surface; original procedural studio light boxes supply reflections. No image-based lighting assets or new software dependency.

The original solver has 640 particles, 3D spatial hashing, three density-projection iterations, gravity/bounds and bounded XSPH-style neighbour velocity blending. Stir works by button or drag. Pour recirculates 160 existing particles through a controlled top emitter without expanding allocation. Reset restores the original block; pause/undo work; particle view allows inspection of the same underlying simulation. Surface/pour/stir/reset and narrow-screen rendering are browser-tested. It remains **experimental**: low resolution, approximate viscosity, no calibrated surface tension or validated real-world fluid parameters. It resembles a paint-like liquid rather than physically accurate clear water.

The density compression test reduces mean positive error from 1.6329 to 0 after eight steps. Another 240 steps with stirring remain finite and inside every tank bound. Updated Node mean step was about 16.2 ms in one run (timing varies with system load). Simulation typed arrays total 33,280 bytes; surface field/cache/palette and bounded triangle arrays total about 3.52 MB, excluding JS/hash overhead, environment textures, GPU copies and driver overhead. Maximum surface capacity is 24,000 triangles; observed checks stayed below the cap.

## Browser / frame evidence

Tests run sequentially, one active art scene at a time. Installed headed Google Chrome reports `ANGLE Metal Renderer: Apple M5`. Short 2.5–4 second samples at 1280×1000, DPR 1:

| Scene | Mean frame spacing | Median | p95 |
| --- | ---: | ---: | ---: |
| Sonic, playing | 16.7 ms | 16.7 ms | 17.8 ms |
| Time, active sweep | 16.7 ms | 16.7 ms | 18.5 ms |
| Liquid, simulating surface | 16.7 ms | 16.7 ms | 18.3 ms |

These are animation-frame timestamps, not GPU execution timings or thermal guarantees. The latest fluid CPU readout was 10.8 ms (an earlier run showed 22.9 ms); do not infer a constant per-frame cost. Separate headless Chromium used **SwiftShader software rendering** and measured fluid mean ~47.6 ms, p95 ~66.8 ms. ReadPixels performance warnings appeared during software screenshots; hardware run had no warnings. Raw timing JSON is retained in `evidence/`.

Final installed-Chrome result: **11 passed, 1 explicitly skipped**. Expanded suite: audio lifecycle/rejection, direct pluck/drag, orbit/slices, local exports, share fallbacks, repeated route transitions, mobile portrait/landscape, reduced-motion and smooth-fluid interactions. The actual native-visibility test is explicitly **skipped with a recorded environment limitation**: both automation browsers kept `document.hidden=false` after attempted tab changes and native minimization, even with background-suppression flags removed. Synthetic visibility handler checks pass, but actual background-tab suspension still needs an ordinary manual browser check. No denial or uncertain external action occurred.

390×844 portrait and 844×390 landscape are desktop viewport emulation, **not physical iPhone tests**. Sharing cancellation/unavailability were injected to exercise fallback UI; no OS share submission occurred. PNG signatures/extension and print snapshot presence were checked. No local video importer or clip recorder is included, so no codec/cancellation/recording claims are made.

## Source review and remaining work

Splash was reviewed read-only at `3df5d621e6f153d7269037cbd8606bd83796f3fd`: MIT, max-tier allocations even for Small, six cube-map PNGs with individually unverified rights. No upstream source/assets/scripts were copied or executed. The current smooth-surface path uses only existing approved Three code plus original implementation. A future Splash replacement still requires action-time upstream execution approval and low-tier allocation/asset/device-loss adaptations; it is not required to run this draft.

Remaining: manual real tab-background verification, subjective audio balance, Safari and physical iPhone testing, sustained thermal performance, native sharing flow, and visual approval of the experimental liquid. No smooth-water realism or full physical accuracy claim.

See `evidence/sonic-drag.png`, `evidence/time-orbit.png`, `evidence/time-slice.png`, `evidence/liquid-surface-default.png`, `evidence/liquid-surface-pour.png`, `evidence/liquid-surface-stir.png` and the portrait/landscape captures.
