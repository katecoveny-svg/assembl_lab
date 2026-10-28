# assembl Lab — playable art instruments

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

The test server must be running. Tests exercise real rendering, gestures, undo, reassembly, deformation, finite physics states, geometry changes, PNG signature, GLB header/JSON/metre transform, responsive overflow, and the 2D/share fallbacks. Visual captures live under `output/playwright/`.

## Browser and performance boundaries

WebGL2 is detected before renderer creation. Without it, or at `?mode=2d`, a clearly labelled interactive 2D colour study remains available. A startup/rendering-context error offers that fallback. WebAssembly failure is caught by the startup handler. This fallback does not claim Gaussian rendering, physics or mesh export.

At narrow viewport widths or `?mode=light`, Reality Remix uses 2,400 instead of 5,600 splats, Soft Matter uses 92 instead of 162 cage particles, Manifold uses 32 instead of 56 circular segments, and device pixel ratio is capped at 1.25 instead of 1.75. Physics runs at fixed 60 Hz with bounded catch-up. Offscreen documents stop simulation/rendering; reduced-motion settings receive no ambient animation (none is used by default). Native hardware still needs device testing; emulated mobile tests are not evidence of phone thermal/battery behavior.

## Scope and integration

All changes are contained under `instruments/`. Parent can link the three routes from Study after reviewing release scope. Original `/study/patterns/`, Study thumbnails and Habitat files are untouched. Liquid Playground, Sonic Loom and Time Sculpture remain next-stage work; no placeholders for them were added.

See LICENSES.md for source licences and exact package versions. See VALIDATION.md for measured results and limitations.
