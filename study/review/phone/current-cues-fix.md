# Topic-aware phone current · review follow-up

29 October 2026. Bounded P2 correction on top of phone integration `aced571bb51f98d2801ddaf2d50c6e373a7c75b1`. Local only; no publication.

The Energy and power cable inspector previously displayed the charging formula's 4.39 A even when the model's average battery discharge was 0.40 A. The scene adapter now exposes separate authoritative average-discharge and charging values. Both cable and charger descriptions select the active topic. Energy explains that discharge flows from battery to phone; charging markers are hidden outside the two charging topics. Fast charging and Why charging slows retain the original charging-current value and phase. Zero-current cues do not advance. No scientific functions, state, controls, challenges, assets or other machines changed.

## Verification

`node --test study/tests/phone*.test.mjs study/tests/claw*.test.mjs study/tests/slushie*.test.mjs study/tests/lesson-models.test.mjs` — **45/45 passed**. [Full output](current-cues-fix-tests.tap).

Two added regression tests cover the reported 2000 mAh / 5 h case, nine capacity/time combinations against the authoritative displayed current, independence from charger settings, all seven noncharging topics, and both charging topics at restart, taper and full charge while paused and running. Existing original-versus-new scientific equivalence tests also pass.

Ordinary IAB verification on the connected Mac confirmed:

- Energy, 2000 mAh / 5 h: cable and charger inspectors both report average discharge **0.40 A**, matching the authoritative chip; cable cue current is zero.
- Fast charging: cable inspector **4.39 A**, matching the charging model (chip rounds to 4.4 A); cable cue uses that same value.
- Why charging slows: charger inspector and authoritative current chip both **4.39 A**, phase constant current at restart.
- Charge stored: inspector explicitly says cable charging is inactive; cable cue current is zero.
- Returning to Energy preserves 2000 mAh / 5 h. No warnings or errors captured in this check.

[Actual DOM and render observations](current-cues-fix-browser.json), [scene and inspector capture](energy-current-fix-scene.jpg), [inspector and control capture](energy-current-fix.jpg). The original full integration evidence remains in [README.md](README.md); responsive layout, load-failure and graphics-transfer checks were not repeated for this presentation-only correction.

Preview: http://127.0.0.1:8795/study/m/phone.html?debug#energy . The retained browser tab has the reported settings and cable selected; a fresh load starts with the lesson defaults.

## Exact follow-up files

- `study/m/phone.js`
- `study/m/phone-asset.js`
- `study/tests/phone.test.mjs`
- `study/review/phone/README.md`
- `study/review/phone/current-cues-fix.md`
- `study/review/phone/current-cues-fix-tests.tap`
- `study/review/phone/current-cues-fix-browser.json`
- `study/review/phone/energy-current-fix.jpg`
- `study/review/phone/energy-current-fix-scene.jpg`

No blocker. Vinyl integration has not started.
