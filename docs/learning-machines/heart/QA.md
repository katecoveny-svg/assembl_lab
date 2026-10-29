# Heart module verification — 29 October 2026

## Automated tests

`node --test study/m/heart/tests/model.test.mjs` passes nine tests. Coverage: L/min conversion and numeric boundaries; 10,000 cycle samples; no AV/semilunar overlap; filling/ejection and both closed intervals; host bpm timing; immutable captures; repeated topic/mode/step state transfer; storage validation and blocked-storage behaviour; load cancellation, late resolution, error/retry and exact disposal; reduced-motion/hidden/disposed animation gates. Raw output: `unit-tests.tap`.

The optimized asset is the same 839,304-byte GLB previously validated by independent Blender reimport. Its 43,658 triangles, 132 nodes, 11 hinges and 13 labels are unchanged. Browser whole cutaway with route arrows rendered 33,302 visible triangles; one canvas was present after repeated graphics cycles. This is not a GPU memory or sustained-performance benchmark.

## Actual browser observations

Tested through the supported in-app browser, with real WebGL and DOM/keyboard actions; no extra Chrome permissions.

| Scenario | Observed result |
|---|---|
| Desktop 1280 px | Large pastel 3D heart, labelled chambers, visible controls and output; scroll width 1280; initial warning/error log empty |
| 375 px | Actual screenshot inspected; layout/labels fit; measured scroll width 375; all visible buttons at least 44 px high |
| 320 px | Actual whole-heart, outlet and diagram screenshots inspected; measured scroll width 320; all visible buttons at least 44 px high |
| Keyboard inputs | ArrowRight and End changed HR; sliders have stable accessible names and unit-bearing value descriptions; presets and other actions use native buttons/selects |
| Prediction and A/B | A at 75 bpm × 70 mL/beat = 5.25 L/min; B at 180 × 70 = 12.60 L/min; difference +7.35 L/min; cards retained original values and prediction |
| Graphics/topics | Three repeated diagram → 3D cycles plus topic changes retained inputs, A/B, prediction, reflection and phase; one canvas after final 3D completion |
| Valve states | Ejection preset shows AV closed / semilunar opening or open; 57% preset shows both groups closed; diagram and detailed rig share the same phase |
| Play/pause | User-started playback changed phase; pause and phase presets stopped continuous playback |
| Reload/history | Reload preserved notes/cards/settings and paused state; step Back restored the prior step; Back to Study then browser Back restored 180 bpm, original A/B and reflection with one canvas |
| Reset | Cancel retained 180 bpm and A; confirm then reload restored 75 bpm, 70 mL/beat, 25% phase, empty A/B and blank notes |
| GLB HTTP 503 | Functional diagram remained usable; HR changed to 180 and A captured 12.60 L/min; note and A survived retry; only 3D controls disabled; inspected page warning/error log empty |
| In-flight cancellation | On a 30-second delayed GLB, SV changed to 140 and A captured 10.50 L/min; switching to diagram aborted the request; after the original delay elapsed there were zero canvases and evidence remained |
| Navigation during load | Left for Study during another delayed load; returned with Back to the same 140 mL/beat / 10.50 L/min evidence, with a fresh functional loading state, then one canvas after successful completion |

The first narrow-screen outlet label covered the valve; it was moved aside and connected with a leader. The final outlet screenshot visibly exposes the aortic valve. Diagram label sizes were increased after the first small-screen inspection. The body-return path was moved into the space between pumps so it reaches the right atrium without crossing a ventricular box. Scope-specific content uses text and route arrows alongside colour.

The sparse checkout's existing Study hub is only a navigation reference; its omitted assets/scripts are outside this module's QA. An optional attempt to open the Markdown asset contract as a browser page was blocked by the browser client; it was not retried. The actual Back-to-Study HTML flow succeeded. This is not a module runtime blocker.

## Not tested / remaining review

Physical phones/tablets, screen readers, real GPU context loss/recovery, browser-level reduced-motion emulation, sustained FPS/GPU memory and production integration were not empirically tested. Reduced-motion policy and lifecycle cancellation/disposal are covered by unit tests and source inspection; no broader accessibility certification is claimed. Specialist anatomy and classroom review remain appropriate before educational publication. No curriculum or medical-grade claim is made.

Screenshots were inspected internally only. No browser screenshots, learner test notes or test session storage are included in the source package or Library delivery. No account, learner-text endpoint, paid API, credentials, push, merge, deployment or shared-file edit was introduced.

## Responsive review follow-up — 29 October 2026

The visual reviewer identified mobile control distance and 9–10 px anatomy tags as P2s. The responsive revision places the current activity prompt immediately above the scene, the existing phase controls directly below it, and the existing capture/clear controls beside pump settings. On mobile the scene stays visible while scrolling through those controls. A/B evidence cards stack at both 320 and 375 px. Desktop retains its two-column bench and card controls.

The same DOM controls are moved at the 760 px breakpoint, then restored on desktop or disposal. No second science state, clock or graphics engine was added. A compact native phase select dispatches into the existing reducer. Its preset matching tolerates floating-point phase normalization. In-page activity/evidence links preserve the selected learning step rather than treating their fragment as Explore.

Mobile 3D labels are now 13 px on opaque white backgrounds. Bounds use measured label dimensions; left/right placement, vertical separation and angled leaders prevent clipping and reduce overlap. The unchanged named GLB and rig remain authoritative.

Supported in-app browser checks at 320 × 900, 375 × 900 and 1280 × 900:

- Measured document scroll width equals viewport width at all three sizes. The current mobile task starts at approximately 327–332 px and phase controls at 790–795 px in the captured Investigate state.
- Viewed whole cutaway, aortic ejection reveal, diagram, current task and stacked evidence. Saved nine full-page screenshots plus four viewport screenshots outside the repository. The viewport captures show anatomy remaining visible while changing inputs and capturing evidence; they are more useful for judging the sticky scene than a full-page capture.
- Exercised all four mobile presets: filling opens AV only; contraction closes both; ejection opens semilunar only; relaxation closes both. Selected option remains correct after normalized phase updates.
- Keyboard input changed heart rate 180 → 179 bpm and output 12.60 → 12.53 L/min while saved A/B remained fixed. Clear/capture worked beside settings at both widths. Example A = 5.25 and B = 12.60 L/min.
- Repeated mobile/desktop transitions restored phase controls to the desktop dock and capture controls to their cards. One phase slider, rate slider, capture-A button and canvas remained; A/B and notes persisted.
- Graphics switching, reload, step Back navigation and both new in-page shortcuts preserved work/current activity. Mobile reset restored 75 bpm, 70 mL/beat, phase 0.25, empty notes/cards, enabled captures and 3D. Desktop restoration then succeeded.
- Final nine model/lifecycle tests pass; JS syntax checks and `git diff --check` pass. The earlier HTTP failure/cancellation scenarios were not repeated in this responsive-only follow-up; their existing lifecycle tests still pass.

Evidence directory: `/Users/kateharland/Documents/Codex/2026-10-29/task-5/heart-module-review-evidence-responsive/`. See its README, viewport screenshots, `responsive-metrics.json`, `reset-check.json` and `jump-checks.json`. Preview remains `http://127.0.0.1:8770/study/m/heart.html` using the local server. Browser screenshots remain local and are not included in Library or the commit.

No physical-device, screen-reader or OS reduced-motion browser verification was added in this follow-up. No publishing, shared-rollout edits or original asset/Library identity changes.
