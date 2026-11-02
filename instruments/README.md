# assembl lab — art instruments

Seven art studios for making your own pictures, on one shared kit (`kit/`). Plain ES modules, no build step, no runtime CDN apart from Google Fonts.

| Route | What you make | Engine (honest version) |
| --- | --- | --- |
| `/instruments/reality-remix/` | Push, swirl, scatter, mend, paint and tint thousands of soft colour splats | 2D Gaussian splats, WebGL2 instanced quads; Canvas 2D sprite fallback (`?mode=2d`) |
| `/instruments/impossible-objects/` | Isometric block builds, Penrose triangle, impossible frame, colouring-in pages | Canvas 2D isometric drawing; "Impossible" draws in placement order instead of depth order |
| `/instruments/soft-matter/` | Drop, stretch, squish, pop jelly shapes; Keep freezes them into the picture | Ring-of-points soft bodies: edge springs + 2D shape matching (`kit/jelly.js`) |
| `/instruments/squishy-lab/` | Design a squishy (shape, pattern, face, colour), squeeze it, stamp a sticker sheet | Same jelly engine, 44-point body, pattern clipped to the skin |
| `/instruments/time-sculpture/` | Strokes replayed as twisting, shrinking echoes with kaleidoscope mirrors | Recorded point lists redrawn with a turn/scale per echo |
| `/instruments/sonic-loom/` | Draw strings; a playhead plucks each bead and plays a note by height | Web Audio oscillator plucks (after you tap Sound); wiggle is a drawn fading sine, not a string simulation |
| `/instruments/liquid-playground/` | Pour, stir, push, sponge and Keep marbled liquid | 2D particles with double density relaxation (Clavet et al. 2005), metaball-style surface |

Every studio has: full-bleed canvas, thumb-sized tool tray (icon + one word), seven palettes (assembl pastel cubes, Sherbet, Pōhutukawa, Moana, Neon, Kōwhai, Plum) and four backgrounds, Surprise, a seed number, starting pictures, undo/redo (40 steps, Ctrl/Cmd+Z), one grab-me cue, and a short visual "How did that happen?".

Saving: **Download picture** (2× screen size PNG, re-rendered, not upscaled), **A4 poster file** (2480 × 3508 px, 300 dpi: artwork, title, optional first name, date, "made with assembl lab"), **Print my art** (A4 portrait print layout, `@media print`), **Share** (Web Share API with a PNG file; falls back to download), **Copy remix link** (seed, palette, background, start, tool, sliders and options in the URL; Impossible Objects also packs the blocks), **Record 5 s video** (MediaRecorder, screen size, MP4 or WebM). Title and name are never stored or put in links. Nothing is uploaded; no accounts.

`?thumb=1` hides the interface (used for hub thumbnails). `?mode=2d` forces the Reality Remix fallback. Reduced-motion preferences stop ambient shimmer, cue pulses, drop-in and replay animations.

### Older 3D versions

The earlier 3D engines (Spark Gaussian splats, Rapier soft bodies, Manifold solids with GLB export, the Squishy factory, and the stage-two Sonic Loom / Time Sculpture / Liquid Playground) are unchanged and live at `<route>-3d/`, linked from each studio's More sheet. Their Playwright suites now point at those routes. The notes below describe them.

### Checks

`npm run test:unit` runs the frame-clock tests and `unit/kit-core.test.js` (seed determinism, link round-trip and sanitising, base64url, export sizes, palettes). Browser checks are described in VALIDATION.md.

---

# Earlier 3D instruments (now at `-3d` routes)


Dedicated routes (no Study integration files changed):
- `/instruments/reality-remix/` — original synthetic Spark Gaussian scene; brush, dissolve, vortex, orbit, reassemble.
- `/instruments/soft-matter/` — Rapier deformable cage; grab/stretch, squash, impulse, material response, orbit.
- `/instruments/impossible-objects/` — Manifold union, subtraction, vertex twist, material preview, GLB art export with dimensions and explicit validation limits.

All have reset, undo where practical, freeze, PNG save, capability-detected file sharing with download fallback, and a print stylesheet with a captured still. Optional explanation is behind “How did that happen?”. No external runtime CDN request is needed.

## Run and reproduce

From `instruments/`:

```
npm ci
npm run build
npm run serve
```

Open `http://localhost:4173/instruments/reality-remix/`. Prebuilt `dist/` is committed because the parent project serves static files. Build cleans old chunks. No root package/build configuration is changed.

```
npx playwright install chromium webkit
npm run test:unit
npm test
```

Playwright starts or reuses a localhost test server. Tests exercise real rendering, gestures, undo, reassembly, deformation, finite physics states, geometry changes, PNG signature, GLB header/JSON/metre transform, responsive overflow, and the 2D/share fallbacks. Visual captures live under `output/playwright/`.

## Browser and performance boundaries

WebGL2 is detected before renderer creation. Without it, or at `?mode=2d`, a clearly labelled interactive 2D colour study remains available. A startup/rendering-context error offers that fallback. WebAssembly failure is caught by the startup handler. This fallback does not claim Gaussian rendering, physics or mesh export.

Reality Remix Auto conservatively renders 2,400 splats on **all** viewport widths. Full remains an explicit 5,600-splat option with an honest slower-browser warning. The complete 5,600-splat model is retained and edited in every quality mode; switching changes the visible count and pixel cap without rebuilding the sculpture or clearing history, camera or freeze state. Quality changes use the existing page, not navigation/reload.

Other instruments select their simulation/geometry resolution at startup: narrow viewports or `?mode=light` use 92 instead of 162 cage particles and 32 instead of 56 circular segments. Their live quality switches adjust pixel density while preserving the current cage/mesh resolution and all artwork. Pixel caps are 1.25 lighter / 1.75 full. The 2D fallback disables the inapp quality selector; its explicit “Try 3D” link remains available.

Physics runs at fixed 60 Hz with bounded catch-up. Offscreen documents stop simulation/rendering; no ambient animation is used by default. Native hardware still needs device testing; emulated mobile tests are not evidence of phone thermal/battery behavior. Both the app Print button and native beforeprint synchronously flush pending solid geometry; tests dispatch beforeprint without opening a physical printer dialog.

## Scope and integration

All changes are contained under `instruments/`. Parent can link the three routes from Study after reviewing release scope. Original `/study/patterns/`, Study thumbnails and Habitat files are untouched. Liquid Playground, Sonic Loom and Time Sculpture remain next-stage work; no placeholders for them were added.

See LICENSES.md for source licences and exact package versions. See VALIDATION.md for measured results and limitations.
