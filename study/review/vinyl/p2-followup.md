# Vinyl P2 follow-up — browser recheck pending

Bounded follow-up to `5577f72c1341813e76dc0b8050f847cd206ca526`. Two review findings are addressed in source; the fresh visual check is blocked and this is **not a visually verified release candidate**.

## Changes

- Portrait deck, format comparison and belt-drive views use individual steeper side cameras. The deck's long axis extends up the portrait canvas instead of retaining the landscape angle and multiplying its distance. Canvas size, desktop camera choices, speaker cutaway, assets and scientific state are unchanged.
- The tonearm explanation now distinguishes the fixed pivot location from the counterweight moving with the arm, and explicitly states that balance forces are not simulated.

## Regression evidence

[p2-tests.tap](p2-tests.tap): **60 passed, 0 failed**, including the previous 58 checks and two new regressions. The model/topic/chart/control/challenge equivalence checks still pass. Syntax and whitespace checks pass.

The new rig test changes needle radius from 0.146 m to 0.060 m and confirms that the real GLB counterweight moves around a stationary pivot at a constant distance. It checks the explanation against that behaviour.

The framing test projects actual GLB primitive bounds through the new perspective camera at 260×410 and 315×410 canvas dimensions (the prior 320/375 layouts). It checks multiple needle positions, deck/drive/format apparatus bounds, and preservation of the desktop and other apparatus cameras. The retained format bars and crate are included in that comparison view's bounds.

| Projected apparatus height | 320 layout | 375 layout |
|---|---:|---:|
| Deck mechanism | 60.0% | 72.0% |
| Drive mechanism | 43.2% | 52.0% |
| Format comparison | 57.0% | 68.6% |

These are geometric projection measurements, **not rendered-browser screenshots**. They do not establish label legibility, final lighting or touch usability. All images in this directory still document the preceding commit; none is presented as proof of this framing revision.

Reproduce tests from the repository root:

```sh
node --test study/tests/vinyl*.test.mjs study/tests/phone*.test.mjs study/tests/claw*.test.mjs study/tests/slushie*.test.mjs study/tests/lesson-models.test.mjs
```

## Exact blocker and remaining check

The old preview server was no longer running. IAB opening `http://127.0.0.1:8795/study/m/vinyl.html?debug#spin` returned `net::ERR_CONNECTION_REFUSED`. Starting the same local-only preview using `python3 -m http.server 8795 --bind 127.0.0.1` from this repository failed at socket binding with `PermissionError: [Errno 1] Operation not permitted` under the current sandbox.

Status: server start **denied by the sandbox**, no server started; browser visual verification **pending**, not uncertain. No expanded permission was requested and no alternate execution surface was used to bypass the restriction.

Once an authorised preview is available, inspect deck, LP/single comparison and drive at both 320/375 widths; inspect tonearm wording and motion; confirm readable labels, no horizontal overflow and usable camera Home reset. Recheck desktop and the unchanged speaker cutaway. Save fresh screenshots before accepting the framing fix. Bike remains untouched and awaits its corrected asset package. No push, merge or deployment occurred.
