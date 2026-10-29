# Vinyl P2 follow-up — browser recheck completed

Bounded follow-up to `5577f72c1341813e76dc0b8050f847cd206ca526`. Two review findings are addressed in source. The preview blocker was subsequently resolved through the normal approval mechanism, and fresh ordinary IAB captures were inspected at desktop and 320/375 widths. Independent acceptance and release remain coordinator-owned.

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

These are geometric projection measurements, **not rendered-browser screenshots**. They do not establish label legibility, final lighting or touch usability. The `p2-*.jpg` images listed below are fresh rendered-browser evidence for this revision. Other images document the preceding integration checkpoint.

Reproduce tests from the repository root:

```sh
node --test study/tests/vinyl*.test.mjs study/tests/phone*.test.mjs study/tests/claw*.test.mjs study/tests/slushie*.test.mjs study/tests/lesson-models.test.mjs
```

## Initial blocker and approved resolution

The old preview server was no longer running. IAB opening `http://127.0.0.1:8795/study/m/vinyl.html?debug#spin` returned `net::ERR_CONNECTION_REFUSED`. Starting the same local-only preview using `python3 -m http.server 8795 --bind 127.0.0.1` from this repository failed at socket binding with `PermissionError: [Errno 1] Operation not permitted` under the current sandbox.

The coordinator subsequently authorised requesting this exact localhost-only server through the normal escalation approval mechanism. That request succeeded, starting the same command on the same port; no persistent network/security settings or browser permissions changed. The initial denial is resolved.

Fresh checks confirmed readable mechanism labels, a substantially taller deck/drive composition, camera Home reset and no horizontal overflow at 375 px. The actual counterweight moves between 6.0 and 14.6 cm needle positions while the pivot remains in place; the corrected explanation is rendered in the page. Desktop composition and speaker cutaway remain intact. No browser warnings or errors were captured during this recheck. These are emulated viewport checks, not physical phone tests.

Fresh evidence: [deck 320](p2-deck-320.jpg), [drive 320](p2-drive-320.jpg), [single 320](p2-single-320.jpg), [deck 375](p2-deck-375.jpg), [drive 375](p2-drive-375.jpg), [single 375](p2-single-375.jpg), [LP 375](p2-lp-375.jpg), [inner arm](p2-arm-375.jpg), [outer arm](p2-arm-outer-375.jpg), [desktop deck](p2-deck-desktop.jpg), [desktop speaker](p2-speaker-desktop.jpg).

No push, merge or deployment occurred.
