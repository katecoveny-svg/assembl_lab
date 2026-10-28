# Local review evidence

28 October 2026. Tests run on the authorised Mac using the existing pinned Playwright installation: desktop Chromium, Pixel 7 Chromium emulation and desktop WebKit. These are real local browser executions, not physical-device tests.

- Main browser run: 28 passed, 2 expected skips (the CDP touch case runs only in mobile Chromium). Additional reset/look-state regression: 3 passed (one in each browser project).
- Schema unit test checks a valid clone plus 12 invalid-field/version/colour/range/geometry/view mutations.
- Browser suite covers explicit shape creation, real particle deformation and rebound, reset/undo state, native Home/End edits, held-key grouping, quality state preservation, four finite shape cages, project round-trip, unknown-field and oversized-file rejection.
- PNG and JPEG decode at all three advertised dimensions on all three browser projects. Transparent PNG has alpha 0 at the corner and alpha 255 on the sculpture. Capturing preserves current state. GLB magic/version/length are checked; exported POSITION values equal the current smooth mesh vertices exactly, including a wobble pose, and the node matrix carries the 0.03 scale.
- Web Share capability and correct file type are tested using browser API mocks; unsupported sharing downloads. No actual native share destination or external posting was invoked.
- Chromium touch events deform the shape; after choosing Scroll page, swiping the same canvas scrolls the document. The initial test exposed OrbitControls' inline `touch-action:none`; the mode now explicitly changes that inline rule to `pan-y`.
- WebGL2 failure gives a visible explanation and a link to the existing 2D material study. No fallback is described as full 3D physics.
- Desktop/mobile screenshots are in `output/`. The Mint ripple screenshots show the heavier 180-particle cage. Five one-second wall-clock FPS samples after warmup are recorded per browser in `output/*-performance.json` (desktop Chromium mean 58.04 FPS, mobile-emulated Chromium 60.00 FPS, WebKit 60.00 FPS). This is steady idle simulation/render evidence, not a sustained thermal benchmark or phone guarantee. Startup shader compilation can briefly lower FPS. Full pixels is explicitly optional.

The print stylesheet is provided but physical printing is untested. No physical iPhone/Android test, actual native share sheet, engineering simulation validation, printability validation or video export is claimed. Source/visual/browser review by the parent is still required before merge/publication.
