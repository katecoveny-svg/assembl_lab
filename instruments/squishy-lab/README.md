# Squishy Lab

An original, local create-then-play studio at `/instruments/squishy-lab/`. Existing `/instruments/soft-matter/` stays compatible.

Four original forms, two-colour procedural patterns, three visual finishes, qualitative feel controls, live squeeze/stretch/rotate, page-scroll mode, pause, wobble, reset and 20-step undo. Choosing **Make this shape** explicitly starts a fresh shape while retaining colours and feel; a recipe starts a new design. Both are undoable. Changing pixel quality keeps the current pose, camera and history.

## What is simulated

Rapier's actual soft-body solver runs a welded 92-particle cage (pebble, cloud, star) or 180-particle cage (halo), with elastic edges, volume preservation and shape matching. A smooth surface follows weighted cage displacement. A small bottom patch is anchored; dragging temporarily pins a local patch and moves its kinematic target. Springiness changes edge frequency, Squish changes volume softness and squeeze depth, Rebound changes shape-matching frequency and damping. These are qualitative play controls, not measurements of a physical material. No self-collision, tearing, manufacturing accuracy or toy replication is claimed. Extreme pulls may fold the skin. Reset and Undo are provided.

Physics catches up by at most three 1/60-second steps per frame. FPS uses actual wall time. Default rendering caps device pixel ratio at 1.25, with explicit Full pixels capped at 1.75. Both keep the same conservative cage. WebGL2 and WebAssembly are required; failed startup offers the existing clearly labelled 2D study. No camera or microphone.

## Files you can keep

- PNG/JPEG: square 1080×1080, portrait 1080×1350, landscape 1600×900. Renders the current geometry and camera into the requested frame. PNG can have actual alpha transparency with the plinth omitted. JPEG is opaque.
- Editable project JSON: exact versioned schema, local-only file loading, 256 KiB input limit, strict fields/enums/hex colours, finite bounded settings/positions and exact cage count. Invalid files leave the current design untouched. Loaded poses start paused and can be undone. Saved projects retain design, current particle positions and camera; they deliberately omit transient velocities and previous undo history.
- GLB: current skinned geometry, vertex colours and material. A scene unit is scaled to 30 mm; actual dimensions depend on form and deformation. **Art mesh only, not print-validated.** No guarantee of manifold topology, connectedness, wall thickness or physical output. Nothing here is for safety-critical parts.
- Share: user-initiated Web Share file capability check, with local download fallback. Cancelling the share sheet does not post anything. Actual native destinations depend on the device. No automatic social posting.
- Print: simplified browser print layout. No physical printer test. Video recording/export is not implemented.

## Licences and attribution

No external scans, photos, product designs or textures are used. Shapes, procedural colour patterns and interface are original code for assembl Lab. No NeeDoh branding or distinctive product replicas.

Existing pinned dependencies: Three.js **0.186.1, MIT** (including OrbitControls, RoomEnvironment, GLTFExporter and mergeVertices); Rapier JS compat **0.21.0, Apache-2.0**. Build tooling: esbuild **0.28.2, MIT**; tests: Playwright **1.64.1, Apache-2.0**. No new packages or services. See the repository's `instruments/LICENSES/` notices and bundled `dist/main.js.LEGAL.txt`; original upstream licences remain applicable. Rapier APIs were checked against the installed `dist/dynamics/soft_body.d.ts` including `volumeSoftness`, `shapeMatchingSoftness`, pinned particles and kinematic targets.

Sources: https://rapier.rs/ · https://github.com/dimforge/rapier.js · https://threejs.org/ · https://github.com/mrdoob/three.js
