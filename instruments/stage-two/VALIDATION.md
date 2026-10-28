# Stage-two validation · 28 October 2026

Isolated checkout/branch `codex/stage-two-instruments`; refreshed main base `cb0d83351d6cb783a398c6069e09e6859e6a6d44`. Existing instrument code/build outputs, patterns and Study overview are untouched. No production merge, provider spending, uploads or credential changes.

## Sonic Loom

Verified with actual UI gestures: AudioContext absent before Play, running after Play; original oscillator events and a non-zero analyser signal; mute gain approaches zero; Pause suspends audio; Play resumes. Injected rejected resume recovers on retry. Synthetic interruption/visibility changes stop audio, and visibility recovery does not automatically start sound. Three real route exits close the audio context, and browser Back reconstructs a silent instrument. Voice count is bounded at 16. These are signal/state checks, not a subjective listening assessment.

Keyboard 1–8 and pointer drag produce visibly changed ribbon pixels. Rhythm changes the rendered mesh; keyboard orbit changes the view. Reduced-motion preference now starts paused and removes idle drift. Explicit Play/pluck can resume motion. Tempo/tension and undo/reset remain available.

## Time Sculpture

Actual `texSubImage3D` upload verified: 128×128×64, 4,194,304 source bytes. The RGBA8 GPU allocation is nominally another 4 MiB; whole-process/GPU resident memory is not measured. Regeneration briefly retains old/new CPU arrays until GC. The generated demo remains immediately available; a bounded local-only video importer is now present.

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

Expanded installed-Chrome result: **19 passed, 1 explicitly skipped**. Two Node video-limit tests also pass; the earlier fluid numerical test remains passing. Expanded suite: audio lifecycle/rejection, direct pluck/drag, orbit/slices, local exports, share fallbacks, repeated route transitions, mobile portrait/landscape, reduced-motion and smooth-fluid interactions. The actual native-visibility test is explicitly **skipped with a recorded environment limitation**: both automation browsers kept `document.hidden=false` after attempted tab changes and native minimization, even with background-suppression flags removed. Synthetic visibility handler checks pass, but actual background-tab suspension still needs an ordinary manual browser check. No denial or uncertain external action occurred.

390×844 portrait and 844×390 landscape are desktop viewport emulation, **not physical iPhone tests**. Sharing cancellation/unavailability were injected to exercise fallback UI; no OS share submission occurred. PNG signatures/extension and print snapshot presence were checked. Local video importer checks are detailed below. No clip recorder is included and no MP4/export-recording claim is made.

## Source review and remaining work

Splash was reviewed read-only at `3df5d621e6f153d7269037cbd8606bd83796f3fd`: MIT, max-tier allocations even for Small, six cube-map PNGs with individually unverified rights. No upstream source/assets/scripts were copied or executed. The current smooth-surface path uses only existing approved Three code plus original implementation. A future Splash replacement still requires action-time upstream execution approval and low-tier allocation/asset/device-loss adaptations; it is not required to run this draft.

Remaining: manual real tab-background verification, subjective audio balance, Safari and physical iPhone testing, sustained thermal performance, native sharing flow, and visual approval of the experimental liquid. No smooth-water realism or full physical accuracy claim.

See `evidence/sonic-drag.png`, `evidence/time-orbit.png`, `evidence/time-slice.png`, `evidence/liquid-surface-default.png`, `evidence/liquid-surface-pour.png`, `evidence/liquid-surface-stir.png` and the portrait/landscape captures.

## Local video importer and reviewer fixes

Time accepts one local clip up to 40 MiB, 12 seconds, 1920px on its longest side, and at most 1920×1080 source pixels. Invalid/unbounded metadata is rejected. Extraction samples 64 frames into one 128×128 RGBA stack (4 MiB); aspect ratio is preserved with transparent letterboxing and correct vertical orientation. Brightness becomes density, allowing dark backgrounds to be thresholded. The previous 4 MiB stack stays usable during extraction; output replaces it only on success. Thus source-stack allocations can temporarily total 8 MiB, plus small canvas/readbacks, browser decoder/source buffers, and GPU/driver memory. Browser decoder overhead is not claimed as exactly measured. No all-frames-at-source-resolution buffer is retained.

Progress and Cancel are visible during extraction. Metadata is loaded and checked before seeking frames. Per-media-event timeouts are at most 8 seconds; the job has a one-minute deadline. Replacing/cancelling an import, Reset, hidden-state cancellation and route exit abort it; the local object URL is synchronously revoked and the video is paused, detached and unloaded. Successful completion also releases the video/URL. Source changes clear source history to avoid retaining clip stacks in Undo; numeric controls remain undoable. Use generated demo and Reset release the imported texture/data. No frame, filename or file contents are sent to a server.

Tests use an original 160×90 animated orb/ribbon fixture created locally by `tests/make-video-fixture.py` with already-installed ffmpeg. Actual import/re-import, 4,194,304-byte GPU upload, zero-alpha letterbox borders, different frame-0/frame-32 pixel hashes, cancellation, unsupported fake WebM, 13-second rejection, over-wide source rejection, injected decode interruption, Reset, synthetic hidden-state cancellation and real route-exit revocation are covered. A request observer detected no external HTTP requests during import. There is no recording feature or blanket codec-support promise.

Reviewer P2 fixes: Time's explicit Sweep now synchronises the slice and resumes shared animation from reduced-motion initial pause or manual Pause; both have regressions. Sonic uses a generation guard so pending `AudioContext.resume()` cannot override a later Pause/Reset. Delayed-resume → stop → resolve tests verify silence, then a fresh explicit Play successfully retries.

The final metadata-first importer rerun passed all six importer/Sweep tests. Screenshot: `evidence/time-local-video.png`. The exact non-personal synthetic input is `evidence/original-motion.webm`; its generator is included under `tests/`.
