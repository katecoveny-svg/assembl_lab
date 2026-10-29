# Assembl claw v2 — frontend asset handoff

Status: GLB and transform contract exported and re-imported successfully. Four numerical pose checks pass. Browser pickup, chute travel, jaw opening and prize detachment have been exercised and visually inspected. Final detail/rear rendering is in progress; asset and adapter are ready for frontend consumption.

Do not read/replace the approved v1 assets while integrating this revision. All revised files are under the local `revision-02/` authoring handoff.

## Files to consume together

- `deliverables/assembl-claw-atelier-web.glb` — contract `assembl.claw.v2`.
- `claw-rig-controller.mjs` — dependency-injected pose adapter; pass your existing `THREE` module.
- `deliverables/claw-rig-contract.json` — exact node hierarchy, exported local transforms, world pivots and semantic ranges.
- `deliverables/rig-validation.json` and `clearance-report.json` — measured geometry checks.
- `deliverables/claw-hero.png` and `claw-detail.png` — use after rendering completes; approved direction is preserved.

Asset size is approximately 3.17 MB, 99,146 triangles, 59 mesh batches and 31 rig nodes. No texture downloads are needed. Do not merge the movable node hierarchy or bake its transforms.

## Consumer example

```js
import { createClawRig } from './claw-rig-controller.mjs';
const rig = createClawRig(gltf.scene, THREE);
rig.setPose({x: .125, depth: -.035, drop: 0, open: 1, holdPrize: false});
// Existing lesson owns t, grab, win and all probability/score calculations.
// Pickup position: x=.125, depth=-.035, drop=.23.
// Carry high; chute position: x=-.32, depth=-.27, drop=0.
// Opening at the front automatically clamps to .55 to clear the glazing.
// To release, clone the currently held geometry with its world transform:
const fallingPrize = rig.spawnReleasedPrize(scene);
rig.setPose({x: -.32, depth: -.27, open: 1, holdPrize: false});
// Animate fallingPrize from the lesson's existing state. No RNG in the adapter.
// Remove the clone when done; its geometry/materials are shared with the model.
```

Metres throughout. Blender is Z-up; GLB is Y-up. Blender `(x,y,z)` maps to GLB `(x,z,-y)`. Semantic `depth` is positive toward the rear and maps to `GANTRY_Y.position.z = -depth`. `drop` is positive downward and subtracts from `CLAW_HOIST`'s rest local Y. The adapter also stretches the cable/cord and updates linkage rods so they remain connected.

Stable moving nodes: `GANTRY_X`, `GANTRY_Y`, `CLAW_HOIST`, `HOIST_CABLE`, `HOIST_CORD`, `ACTUATOR_SLIDER`, `HELD_CAPSULE`, `FINGER_0_SHOULDER` through `FINGER_2_SHOULDER`, and independent `FINGER_n_TIP` pivots. `JOYSTICK_PIVOT`, `DROP_BUTTON` and `RETRIEVAL_FLAP` are available for visual feedback. `CHUTE_TARGET` and `PICKUP_TARGET` are marker nodes. Finger rotation is about local +X. Prefer the adapter over hand-coded coordinate offsets.

The original piston extended 19 mm into the capsule's bounding volume. It is now shorter, with a measured 18 mm rest gap; opening the jaws increases that gap. The detail camera is more frontal to clear the pillar. The claw's azimuth is aligned to leave room for release over the front chute.

This is kinematic geometry, not simulated mechanics. Existing learning state remains authoritative. The static prize pool is designed; runtime prize-pool collision and a physical grip solver are not implemented. Use the supplied travel envelope and opening clamp, and do not claim manufacturing-ready CAD. The GLB uses simpler alpha glass; final WebGL environment and sorting still need the frontend's visual QA.
