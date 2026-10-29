# Blender claw learning integration

Local preview: http://127.0.0.1:8794/study/m/claw.html
Guided investigation: http://127.0.0.1:8794/study/m/claw.html#long

Isolated checkout: `/Users/kateharland/Documents/Codex/2026-10-29/task-4/lab-claw`
Branch: `codex/claw-blender-learning`.

The local integration base is merge `b9df151`, preserving both the unpublished integrated Lab (`956fe3a63ddbceee178bee81c8419aac37e2301a`) and fetched main/Squishy (`198a556108b366d90074cb3aa485e4b93c1b9220`). No other checkout was edited. No remote push, PR, deployment or production promotion was performed.

## What changed

The existing `/study/m/claw.html` route keeps its probability model and six topics: trials, long-run frequency, the conditional probability tree, expected value, idealised scheduled payout, and the existing challenges. Its procedural cabinet/3D teaching props were replaced with the artist's detailed Blender v2 asset. The same model-owned `anim`, `grab`, `win`, `plays`, `wins` and probabilities drive the named gantry, hoist, cable, fingers, linkage, button and capsule. One shared-resource capsule clone is reused for pickup, drop and retrieval; there is no second RNG or outcome system.

The whole-machine camera fits the actual asset bounds; the frontal detail camera reveals the finger links. Orbit, keyboard arrows, +/− and Home are retained. An in-scene Run one trial button calls the same action as the standard lesson control. The scene uses the current Three.js vendor and GLTFLoader already in the repository. The only shared-engine change is an opt-in `postprocessing:false`; other lessons retain their existing defaults.

A graph/tree and live readouts sit beside the scene on desktop and below it on phones. An accessible outcome strip and last-40-trials tape expose results without relying on canvas. Idle lesson state stops rebuilding its SVG/readout DOM. Probability or value setting changes start a fresh sample, avoiding mixed-parameter results; the expected-value explanation follows the current controls. Leaving scheduled mode for other topics explicitly returns to independent random trials.

The shared Explore → Predict → Investigate → Explain shell adds a controlled comparison on the Long run topic. Set up A runs 10 trials with P(grab)=0.60 and P(hold given grab)=0.25. Set up B continues that same seeded run to 1,000. Captures store model values and reject wrong counts, changed chances or unrelated resets. Default results: A = 0/10, frequency 0.000, absolute error 0.150; B = 154/1000, frequency 0.154, error 0.004. The explanation explicitly distinguishes typical convergence from guaranteed improvement on every trial. Notes are ungraded and page-local.

The original Blender hero direction is used for the lesson's static reference and catalogue/home card. Card images preserve the complete cabinet; only neutral edge background pixels are extended into a landscape frame. They are labelled as renders, not screenshots of a live simulation. `/assets/posters/m-claw.webp` is also updated.

## Asset provenance and budget

Consumed the ready-for-frontend v2 handoff from `/Users/kateharland/Documents/Codex/2026-10-29/task-3/revision-02/`. The approved v1 originals and Blender authoring files were not edited.

- GLB: 3,174,148 bytes; SHA-256 `c2e1ad74020e7bba794de5137049c277c0add100ea7d2f2fa3d6d40866c54f5a`.
- Original v2: 59 mesh batches, 31 rig nodes, 99,146 triangles, no image textures.
- Browser scene including the reused capsule clone: 63 mesh objects; observed main render 65 calls / 104,550 triangles / 61 geometry resources. No geometry is regenerated during a trial.
- Pose adapter, contract, export budget and artist clearance reports are retained in `assets/models/claw/`.
- The 18mm rest clearance and checked motion envelopes concern this digital model; they are not manufacturing validation.

## Verification

`node --test study/tests/claw.test.mjs study/tests/claw-motion.test.mjs study/tests/lesson-models.test.mjs`: **11 passed**. Tests exercise the real lesson config, immutable A/B data, capture guards, changed-parameter resets, seeded RNG/formula compatibility, original challenges, rapid-repeat protection and reduced motion. The motion tests reconstruct the actual GLB hierarchy and accessor bounds, sweep miss/drop/win timelines, check finite connected link lengths, piston/capsule separation, front/side pane envelopes and constant node count. The actual GLB was also separately parsed with the repository's GLTFLoader in Node.

The original unmodified model was executed for comparison: seed 11 produces exactly 154 wins/1,000, P(win)=0.150 and EV=−$0.80. Those results are retained.

Ordinary IAB, no raw CDP or DevTools permission:

- Actual GLB/material rendering inspected on desktop and 320/375 CSS-pixel viewport overrides. All measured `documentElement.scrollWidth === innerWidth`. Whole and detail camera views inspected, full cabinet/plinth framing checked.
- Run one trial exercised for a default miss, guaranteed win using the existing probability sliders at 1/1, and a grabbed-then-dropped outcome at 1/0.05. Reset clears the result and restores the pickup pose. Arrow orbit and + zoom changed the camera; Home restored the selected view. Keyboard focus stayed on the canvas.
- A/B UI captured the values above. Prediction survived stage/topic changes; stage Home focused Explore; stages did not alter the topic hash. Existing shared-shell browser fixture reports **PASS 19 checks**.
- Explicit `?lite` static mode retained working controls. An uncached GLB 404 was then induced in the isolated checkout: UI correctly reported “3D unavailable · static Blender render, live probability controls”, the actual render remained visible, and Play 10 produced ten live trials. Asset and source were restored immediately; the final preview again reports live animated 3D. Expected 404 warnings during this deliberate failure are not production errors.
- Existing Energy scene still rendered and updated with the shared engine default. Home card image decoded at 800×500 and links to `/study/m/claw.html`. Squishy/main and the integrated preview remain ancestors of the local branch.
- Representative visible-scene frame intervals on this Mac: desktop median 16.7ms / p95 19.6ms at DPR 2; 375px override median 16.6ms / p95 19.3ms at DPR 1. These are requestAnimationFrame intervals from a recent 180-frame window, **not GPU timings or physical-phone results**. Browser viewport overrides were reset after testing.
- JS syntax checks and `git diff --check` passed.

## Visual evidence

- [Desktop whole machine](desktop-machine.jpg)
- [Desktop linkage detail](desktop-detail.jpg)
- [375px whole machine](mobile-375.jpg)
- [320px whole machine](mobile-320.jpg)
- [Captured A/B evidence](evidence-ab.jpg)
- [Intentional missing-GLB fallback at 320px](load-failure-320.jpg)
- [Existing Energy regression](regression-energy.jpg)
- [Home card with actual Blender render](home-card.jpg)
- [Explicit static mode at 320px](fallback-320.jpg)

## Reproduce

From the isolated checkout:

```sh
python3 -m http.server 8794 --bind 127.0.0.1
node --test study/tests/claw.test.mjs study/tests/claw-motion.test.mjs study/tests/lesson-models.test.mjs
```

Open the preview URL above. Add `?review` before the topic hash for read-only frame/pose diagnostics in the canvas `data-review` attribute. Add `?lite` for the static-render mode. To reproduce posters from the artist's render:

```sh
python3 study/tools/prepare-claw-posters.py /absolute/path/to/claw-hero.png
```

## Limits

The animation illustrates outcomes sampled by the probability model. It does not calculate contact forces, friction, physical skill, prize-pool collisions or a validated gravity/chute simulation. Released-capsule travel is illustrative. Alpha glass and real-time lighting differ from the offline Cycles render. No physical phone, AR, WebGL context-loss event, screen-reader application or full-site exhaustive regression suite was tested. The reduced-motion adapter is covered by a model test; the OS preference was not changed. Publication is left to the parent task.
