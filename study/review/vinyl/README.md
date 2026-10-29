# Vinyl integration review

**Follow-up:** [P2 framing and counterweight corrections](p2-followup.md) have 60 passing tests; fresh browser verification is pending because the local preview server could not bind under the current sandbox. The screenshots below document the original integration checkpoint.

Local review checkpoint, 29 October 2026. Branch `codex/learning-machine-rollout`, directly after phone fix `1bc6eea115f02bd533ccb1bca7de3db47517e977`. No publication or release is implied.

Preview: <http://127.0.0.1:8795/study/m/vinyl.html?debug#spin>. Serve the repository root; `?debug` adds read-only render diagnostics. [Exact changed files](files.txt), [asset provenance and rig contract](../../../assets/models/vinyl/README.md), [design brief](../../../docs/learning-machines/assembl-3d-design-brief.md).

## Delivered behaviour

The approved pastel Blender deck and speaker replace the rough apparatus. Record rotation, contact-correct tonearm, speed buttons and speaker cone read the original lesson state. The original groove magnifier, pitch keyboard, pressure particles, circular-motion vectors, format bars and explanatory diagrams remain teaching apparatus. Only the relevant zone is visible. Tonearm, belt-drive and speaker cutaways have restrained component labels; cutaways do not introduce another solver or clock.

The nine topics, eight original controls, scientific helpers, tick, charts and six challenge definitions remain unchanged. Audio retains its original frequency and short triangle-tone envelope, with explicit stop, overlap replacement and stop-on-topic/exit behaviour. It starts only from Hear it. Device volume is explicitly separate from the simulated decibel control.

Both graphics directions transfer the complete experiment state and pause setting once. A poster remains visible until the first successful pose and render. Aborted/failed loads cannot publish a false ready state; owned GPU resources are disposed. Simplified diagrams and controls remain usable when the GLB fails. The catalogue uses the supplied properly framed offline render and names it accurately.

## Automated evidence

[tests.tap](tests.tap): **58 passed, 0 failed**. Reproduce from the repository root:

```sh
node --test study/tests/vinyl*.test.mjs study/tests/phone*.test.mjs study/tests/claw*.test.mjs study/tests/slushie*.test.mjs study/tests/lesson-models.test.mjs
```

Thirteen vinyl tests cover:

- Source and output equivalence to `1bc6eea` across all topics, both formats, four speeds, frequency/radius/amplitude/decibel bounds and varied time steps; six success/failure fixtures and repeated topic changes.
- Exact GLB bytes, 53 contracted rig nodes, 132 total nodes, the once-only metre conversion, absolute repeated poses, fixed parts and format switching. Stylus contact is checked at 87 LP and 29 single radii through three phases and repeated updates.
- Paused/running graphics transfer, topic/path validation, replay rejection and blocked storage; no substitute state model.
- Gesture-only audio, original frequency/envelope, repeated Hear, topic/exit stopping and natural completion.
- Late loading uses current state; import/fetch/build/pose/render failures, exit cancellation, late disposal and deduplicated geometry/material/texture cleanup.

The remaining 45 tests protect phone, claw, slushie and shared lesson behaviour. Their sources and assets were not edited. All 35 Study registry entries and routes remain intact. `git diff --check` and JavaScript syntax checks pass.

## Ordinary browser evidence

Inspected actual IAB rendering at desktop 1280×720 and emulated 375×812 / 320×740. These are browser viewport checks, not physical phone tests. All nine topic views were visited. Checks included repeated format/topic/control changes, reload defaults, camera Home reset, keyboard orbit/zoom and range changes, headshell dragging, both graphics directions, audio activation/status/Stop sound, and challenge 1 plus challenge 6 through the UI. All six challenges also have automated fixtures.

- [Desktop deck](turntable-desktop.jpg), [tonearm](tonearm-desktop.jpg), [drive](drive-desktop.jpg), [speaker cutaway](speaker-cutaway-desktop.jpg).
- [320 px deck](turntable-320.jpg), [320 px drive](drive-320.jpg), [375 px air](air-375.jpg), [375 px speaker](speaker-375.jpg), [375 px single](single-375.jpg). The 320 px page measured `scrollWidth === innerWidth === 320`.
- [Pitch](pitch-desktop.jpg), [angular velocity](angular-desktop.jpg), [centripetal acceleration](centripetal-desktop.jpg), [loudness](loud-desktop.jpg), [challenge six](challenge-six.jpg), [catalogue card](catalogue-card.jpg).
- [Forced GLB 404](load-failure.jpg): simplified controls and challenge 1 remained usable. The original GLB was restored and its exact hash rechecked; live rendering then loaded successfully. [Captured console](browser-console.json) contains only the expected warning from this forced failure, with no captured errors.

[Observed render/state values](browser-checks.json) include a paused single record preserved exactly across both graphics directions: 45 rpm, radius 0.060 m, angle 0.9600881682 and phase 1.4977228817. Actual headshell dragging changed radius to 0.075 m while the tip stayed at 0.0614 m height.

Observed renderer work varies with teaching overlays: deck 72 calls / 62,300 triangles, drive 52 / 31,956, single-format comparison 86 / 70,402, pitch 12 / 28,620, and air 35 / 213,630. The air count includes the existing instanced particle apparatus, not additional Blender geometry. Median frame intervals were about 16.7 ms and recorded p95 values 17.3–19 ms in this browser session. These short samples are not device performance guarantees or GPU timings.

## Limits and review status

Browser reflections differ from the offline Cycles render. Belt rotation, enlarged groove and slowed speaker/air motion are educational illustrations; no slip, torque, acoustic pressure or manufacturing simulation is claimed. Existing curriculum and safe-listening text was preserved, not independently revalidated by this visual integration.

Physical-device performance, hardware audio audibility and OS reduced-motion behaviour were not tested. The shared reduced-motion handling remains in place. AR is disabled for this multi-scale apparatus because it has not been validated. The integrated result still needs independent review and a separately authorised release. No remaining implementation blocker is known. Bike and ski files are untouched.
