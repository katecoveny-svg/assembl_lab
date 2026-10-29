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
