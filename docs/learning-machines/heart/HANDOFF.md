# Heart Pump Lab — interactive module handoff

Local integration candidate. No push, merge, deployment or catalogue edit.

## Checkout and scope

- Isolated checkout: `/Users/kateharland/Documents/Codex/2026-10-29/task-5/heart-module`
- Branch: `heart-pump-module`
- Base: `5577f72c1341813e76dc0b8050f847cd206ca526`
- Read-only reference checkout: `/Users/kateharland/Documents/Codex/2026-10-29/task-4/lab-rollout`
- New files only: `study/m/heart.html`, `study/m/heart/**`, `docs/learning-machines/heart/**`.
- The isolated clone uses a read-only Git object alternate; the binary patch and source overlay ZIP provide portable handoff independent of that alternate.

Read references: shared `docs/learning-machines/assembl-3d-design-brief.md`, StudyKit `study/kit.js` and `study/kit.css`, `study/index.html`, `study/data.js`, and the phone module's HTML/source. Followed the large bench, pastel tokens, compact controls, step navigation and open Study route. This module has its own heart-specific shell: it deliberately does not mount StudyKit's grading, study-log, sound, companion or AR systems. It uses local system fonts and has no third-party runtime requests.

## Run and test

From this checkout (or after overlaying the new files on the integration repository):

```sh
python3 study/m/heart/tests/serve.py --port 8770
# Open http://127.0.0.1:8770/study/m/heart.html
node --test study/m/heart/tests/model.test.mjs
```

No package install or build step. Three.js r170, required addons and their MIT licence are vendored in the heart directory. A static HTTP server is sufficient; opening `file://` is not supported by module loading/fetch.

Failure/cancellation checks:

```sh
python3 study/m/heart/tests/serve.py --port 8771 --mode fail
python3 study/m/heart/tests/serve.py --port 8772 --mode delay --delay 30
```

Both affect only the GLB GET; there are no fault switches in production module code. Servers bind to 127.0.0.1.

## One authoritative model

`model.js` owns serializable experiment state, cardiac output, immutable A/B captures, validation, state transfer and phase advancement. It imports the unchanged `phase-pose.js` from the reviewed asset package. `heart-rig.js` is also unchanged; the host provides phase. Neither graphics implementation owns another clock or output model. `scene.js` applies the named rig; `diagram.js` consumes the same state and phase function. The host requests animation frames only while playback is permitted.

Heart rate is 40–180 bpm; forward stroke volume is 20–140 mL/beat. These are bounded independent teaching controls, not normal/abnormal ranges. Forward output is `bpm × mL/beat / 1000` L/min from one ventricle. The two sides are pumps in series, so outputs are not added. No valve-efficiency factor, diagnosis, regurgitation or homeostasis simulation is implemented. All physics and anatomical limits are visible in the page and detailed in `ASSET_CONTRACT.md`.

## Learning flow and continuity

- Explore: route, named structures, valve phase presets, cutaway and posterior aortic reveal.
- Predict: a learner-authored, ungraded prediction.
- Investigate: independently set heart rate/SV; capture fixed A/B records. Clearing a slot explicitly allows a new capture; changing controls never overwrites a card.
- Explain: retain the prediction, compare L/min and write an ungraded reflection. Two changed inputs trigger an honest comparison limitation.
- Topic, step and graphics changes retain inputs, phase, captures and both notes. Step history supports browser Back. Reload and leaving/returning in the same tab restore validated state paused.
- Session storage key: `assembl-heart-session-v1`. No account, cookies, logging, learner-text submission or external model service. Storage denial falls back to memory with a visible explanation. Browser session restoration can retain session storage, which the privacy note explains. Reset touches only this key and requires an in-page confirmation to avoid accidental loss of notes.
- Reduced-motion system preference disables continuous playback; phase scrubbing/presets remain usable. Preference changes pause playback. Hidden pages and page disposal stop the clock. No autoplay, sound or motion effects.

## Graphics and lifecycle

The original optimized GLB, reviewed rig and phase source are copied unchanged; asset Library identities are not replaced. Four chamber labels use short leader lines. The aortic reveal hides occluders without moving retained geometry. Because vessels are batched, higher-oxygen pulmonary veins remain visible beside the aorta; the view explains this explicitly. It is not a new anatomical arrangement.

The simplified diagram is a functional circuit, explicitly labelled as such. It is available while loading and after load/graphics failure; calculation, phase, captures and notes continue working. Only 3D-specific controls are disabled. A retry does not reset the experiment.

`lifecycle.js` aborts fetches, rejects stale completions and disposes late scenes. Scene cleanup removes the ResizeObserver, OrbitControls, canvas, label leaders, context listener, geometries/materials and renderer. Pagehide saves paused state and disposes; a persisted pageshow mounts from session state. Context loss routes through the same functional fallback. No additional WebGL permissions or Chrome access were requested.

## Review and integration gates

See `QA.md`, `unit-tests.tap` and `provenance.json`. Actual browser screenshots were inspected internally and are not delivered or saved to Library. Physical devices, sustained GPU memory/FPS, screen-reader traversal, OS-level reduced-motion emulation and actual GPU context loss were not tested. The reduced-motion gate and lifecycle disposal are unit tested; DOM keyboard behaviour, normal load, model failure, cancellation and navigation were exercised in the real browser.

Review the module and reconcile catalogue changes separately using `CATALOGUE_INTEGRATION.md`. This is a teaching prototype, with no unsupported NZQA alignment or specialist endorsement. Original inputs and the existing asset package remain intact.
