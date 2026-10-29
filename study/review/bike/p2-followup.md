# Bike stopping-view P2 follow-up

Baseline: `43e2a3c47274cf7a3c8d88ba517eaf24c6573f01`. This is a scoped camera/label fix, separate from the original bike integration. No scientific state, controls, assets, other topics or ski lessons changed.

## Correction

- Portrait stopping camera now centres the full 1.5× bike/rider, with enough distance for both wheels and a stronger follow response. The outcome follows the rider instead of an off-screen fixed track position.
- Outcome pills allow wrapping, have a bounded width and retain the shared on-canvas label clamp. The duplicate “Stopped” phase label is hidden once the complete outcome appears. The stylesheet URL is versioned so an older cached stylesheet cannot suppress this fix.
- The required desktop minimum-control check reproduced an off-screen bike at the start of the track. The desktop stopping camera now includes the whole start-to-log extent, with aspect-aware distance. Other desktop cameras remain unchanged.

## Verification

`node --test study/tests/*.test.mjs`: **77 passed, 0 failed**. [Full output](p2-tests.tap).

New projection regression checks the actual active GLB primitive bounds, including both wheels, rider and extras, for all three builds, rest/braking compression, three pitch poses, five positions (including collision clamping), and 320/375 content widths plus two wider aspect ratios: 360 configurations. New model-equivalence regression completes minimum/maximum speed and reaction-time cases for every build and surface against the original model. All earlier 75 checks still pass.

Ordinary IAB on the connected Mac, 1280 × 720 default and 320 × 800 / 375 × 812 viewport emulation. Nine completed-stop captures were inspected. Every outcome's bounding box is within the canvas, its text scroll width is no greater than its client width, and there is no horizontal document overflow. No captured browser warnings/errors. [Measured DOM bounds and controls](p2-browser-checks.json).

| RIDGE case | 320 | 375 | Desktop |
|---|---|---|---|
| Success: 40 km/h, 0.8 s, dry; **17.9 m** | [Capture](p2-success-320.jpg) | [Capture](p2-success-375.jpg) | [Capture](p2-success-desktop.jpg) |
| Minimum controls: 10 km/h, 0.3 s, dry; **1.4 m** | [Capture](p2-minimum-320.jpg) | [Capture](p2-minimum-375.jpg) | [Capture](p2-minimum-desktop.jpg) |
| Failure: 60 km/h, 2.0 s, wet roots; **83.9 m required** | [Capture](p2-failure-320.jpg) | [Capture](p2-failure-375.jpg) | [Capture](p2-failure-desktop.jpg) |

These supersede the initial `stop-320.jpg` for acceptance. The failure distance is the unchanged model's required stopping distance; the visible bike remains clamped at the log. Physical-phone/Safari testing remains outside this local check. No blocker remains; independent bounded recheck and coordinator release are pending. No push or publication performed.

[Exact follow-up file list](p2-files.txt). Preview: http://127.0.0.1:8795/study/m/bike.html#stop .
