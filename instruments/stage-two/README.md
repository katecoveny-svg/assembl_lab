# Stage two · assembl Lab

Dedicated routes:
- `/instruments/sonic-loom/` — original Web Audio synthesis coupled to deforming Three.js ribbons. Explicit Play, mute, interruption retry, pluck/drag, keys 1–8, orbit, tempo, tension and palette.
- `/instruments/time-sculpture/` — original 128×128×64 RGBA temporal volume and GLSL3 raymarcher. Original local orb/ribbon frame stack, orbit, time, slice thickness, threshold and sweep.
- `/instruments/liquid-playground/` — **experimental** original 640-particle position-based fluid with a connected smooth surface reconstructed from a 40³ density field. Real 3D spatial neighbours, density constraints, velocity blending, gravity, stirring, bounded recirculating pour and boundaries. A particle-view toggle exposes the underlying solver. This is not a Splash port.

All routes offer undo, reset, pause, local PNG, print and capability-detected file sharing. Sharing is invoked only by the user's Share button. No microphone/camera, accounts, uploads, sample recordings or network runtime dependencies. Optional video import and clip recording are not implemented.

Shared navigation outside these three new routes is deliberately left to the parent task. Existing `instruments/src`, `instruments/dist`, the original patterns studio and Study overview are untouched.

## Build / run

Dependencies are the repository's existing exact pins in `../package-lock.json`: Three 0.186.1, esbuild 0.28.2 and Playwright 1.64.1. No additional dependencies.

With the existing `instruments/node_modules` installed:

```sh
cd instruments/stage-two
node build.mjs
node --test tests/fluid.test.js
# Serve repository root on localhost:4185 in another terminal:
# python3 -m http.server 4185 --bind 127.0.0.1
node ../node_modules/@playwright/test/cli.js test
# Installed Chrome / hardware verification:
STAGE_TWO_HEADED=1 node ../node_modules/@playwright/test/cli.js test
```

`build.mjs` writes only `stage-two/dist`; it never deletes or writes the first-stage bundle. The generated route HTML and bundle are committed for the static host.

## Materials & credits

Three.js, OrbitControls and MarchingCubes: MIT, existing repository licence at [../licenses/three-MIT.txt](../licenses/three-MIT.txt). Bundled notices are also in [dist/app.js.LEGAL.txt](dist/app.js.LEGAL.txt). The shell and palette continue the existing assembl instruments design. Ribbons, notes, demo motion, volume shader, density deposition, procedural studio lighting and fluid solver implementation are original work for this addition.

Time volume API references: [Data3DTexture](https://threejs.org/docs/pages/Data3DTexture.html) and [official volume example](https://threejs.org/examples/webgl_texture3d.html). No Jingfu code or assets used.

Splash was inspected read-only at [`3df5d621e6f153d7269037cbd8606bd83796f3fd`](https://github.com/matsuoka-601/Splash/tree/3df5d621e6f153d7269037cbd8606bd83796f3fd). It is MIT, copyright 2025 matsuoka-601. Its source, assets, dependency installation and scripts are **not** included or executed. See [VALIDATION.md](VALIDATION.md) for the allocation review and limits of this alternative.
