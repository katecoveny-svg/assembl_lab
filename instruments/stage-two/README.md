# Stage two · assembl Lab

Dedicated routes:
- `/instruments/sonic-loom/` — original Web Audio synthesis coupled to deforming Three.js ribbons. Explicit Play, mute, interruption retry, pluck/drag, keys 1–8, orbit, tempo, tension and palette.
- `/instruments/time-sculpture/` — original 128×128×64 RGBA temporal volume and GLSL3 raymarcher. Original local orb/ribbon frame stack plus bounded local video import, orbit, time, slice thickness, threshold and sweep.
- `/instruments/liquid-playground/` — **experimental** original 640-particle position-based fluid with a connected smooth surface reconstructed from a 40³ density field. Real 3D spatial neighbours, density constraints, velocity blending, gravity, stirring, bounded recirculating pour and boundaries. A particle-view toggle exposes the underlying solver. This is not a Splash port.

All routes offer undo, reset, pause, local PNG, print and capability-detected file sharing. Sharing is invoked only by the user's Share button. No microphone/camera, accounts, uploads, sample recordings or network runtime dependencies. Video import accepts local clips up to 40 MiB / 12 seconds / 1920px longest edge and 1920×1080 total pixels. It extracts 64 letterboxed 128×128 frames with progress/cancel and releases its object URL. Clip recording is not implemented.

## Materials & credits

Three.js, OrbitControls and MarchingCubes: MIT, existing repository licence at [../licenses/three-MIT.txt](../licenses/three-MIT.txt). Bundled notices are also in [dist/app.js.LEGAL.txt](dist/app.js.LEGAL.txt). The shell and palette continue the existing assembl instruments design. Ribbons, notes, demo motion, volume shader, density deposition, procedural studio lighting and fluid solver implementation are original work for this addition.

Time volume API references: [Data3DTexture](https://threejs.org/docs/pages/Data3DTexture.html) and [official volume example](https://threejs.org/examples/webgl_texture3d.html). No Jingfu code or assets used.

Splash was inspected read-only at [`3df5d621e6f153d7269037cbd8606bd83796f3fd`](https://github.com/matsuoka-601/Splash/tree/3df5d621e6f153d7269037cbd8606bd83796f3fd). It is MIT, copyright 2025 matsuoka-601. Its source, assets, dependency installation and scripts are **not** included or executed. This is an independently implemented experimental alternative, not a port.
