# Slushie asset handoff — assembl.slushie.v1

This is the Blender asset for the existing `/study/m/slushie.html` lesson. The website has not been changed. The authoritative scientific state remains in `study/m/slushie.js`.

## Integration files

- `deliverables/assembl-slushie-atelier-web.glb` — optimized geometry, stable parts and semantic anchors.
- `deliverables/slushie-rig-contract.json` — actual exported rest transforms, pivots, hotspot anchors, pipe centreline waypoints, particle bounds and camera targets.
- `slushie-rig-controller.mjs` — a pure visual adapter. No timer, thermodynamics, random particle generator, freeze threshold or independent scientific state.
- `deliverables/slushie-hero.png` — final portrait thumbnail/hero source.
- `deliverables/slushie-detail.png` — liquid hidden to expose the scraper and drum.
- `deliverables/slushie-service.png` — open cabinet, viewed from the right/front to expose refrigeration components.
- `deliverables/slushie-rear.png` — rear gearbox and condenser construction.

## Coordinate contract

Metres throughout. Blender: X right, Y rear, Z up. glTF: X right, Y up, Z front. Mapping is `(x, y, z) -> (x, z, -y)`. Existing lesson uses `CM=.25`, or **25 scene units per metre**, including its AR scene. Either use a metre-based scene or apply a uniform root scale of 25. Do not scale individual parts or bake their pivots away.

`AUGER_PIVOT`, `AUGER_GEAR` and `MOTOR_PINION` rotate around local glTF **+Z**. Feed the existing `augRot` directly to the first two; the pinion uses `-2.3 * augRot`. `FAN_PIVOT` also rotates around local +Z. Pass the lesson's accumulated fan angle. A jam stops the lesson's auger advance; the asset does not decide that. Blocked vents only display `VENT_OBSTRUCTION`; they do not stop the fan independently of the existing compressor/thermostat state.

`EVAPORATOR_DRUM` is fixed. `ICE_SHELL` shares its axis, with radial X/Y scale and axial Z scale. The adapter accepts already-calculated visual scales, clamped to the documented geometry limits (1–1.98 radial; 1–1.04 axial). This is a display guard, not a cap on scientific ice mass. An ice overlay can envelop a stalled scraper during a jam; it is not collision simulation.

`DRINK_VOLUME` accepts tint/opacity; the parent lesson decides the visual mapping. `r.mi / 1000` is the **fraction of total drink mass that is ice**, not the fraction of water frozen. Sugar is a percentage of total drink mass. The existing model owns the 1000 g / 20 °C starting state, −3 °C thermostat target and reset on sugar changes. Do not duplicate any of those calculations in the adapter.

## Minimal adapter use

```js
import { createSlushieRig } from './slushie-rig-controller.mjs';
const rig = createSlushieRig(gltf.scene);
// During the existing lesson's visual update, pass values it already computed:
rig.setVisualState({
  augerAngle: augRot,
  fanAngle: existingFanAngle,
  ventBlocked: !s.vents,
  shellVisible: showExistingShell,
  shellRadialScale: existingShellRadialScale,
  shellAxialScale: existingShellAxialScale,
  drinkColor: existingDrinkTint,
  drinkOpacity: existingDrinkOpacity,
  drumColor: existingDrumTint,
  statusColor: existingStatusTint
});
rig.setView({ cutaway: true, mechanism: false, showCup: false });
```

Names beginning `existing...` and `showExisting...` above are integration placeholders, not new solver variables or formulas. The frontend owner should connect its current visual update. `setVisualState` is a full snapshot with defaults; pass a complete snapshot each frame. `setView` changes presentation only. The tap remains static by default because the lesson does not model dispensing.

## Picking and overlays

The original `PARTS` keys are preserved in `lesson_part_id` extras: `comp`, `cond`, `fan`, `valve`, `drum`, `aug`, `tap`, `probe`, `motor`. Bind source picking to these existing keys. `HOTSPOT_BOWL` is an optional presentation anchor with no existing `PARTS` key. The JSON includes every hotspot's rest transform and world pivot.

`PIPE_HOT`, `PIPE_CONDENSER`, `PIPE_LIQUID`, `PIPE_DRYER`, `PIPE_COLD`, `PIPE_SUCTION` contain distinct pipe geometry. Their JSON waypoints follow the modeled Bezier centreline. They are **not a replacement heat-flow solver or source timing path**. Retain the source `LOOP` semantics and timings when adapting refrigerant indicators to this geometry. The barrel's internal evaporator coil is represented by the drum, not an exposed coil mesh.

Suspended crystals should remain lightweight browser instances. The contract supplies the clipped capsule bounds, fill plane and fixed-drum exclusion; clip to the actual capsule, not only its AABB. It does not prescribe physically exact particle dimensions or populations. Because construction clearances changed, do not reuse the original world coordinates without mapping them into the new bounds.

Hide `SERVICE_PANEL`, `LEFT_PANEL`, `FRONT_PANEL`, `REAR_PANEL`, `DRIVE_HOUSING`, `DRIVE_GUARD` for a full cutaway. Front controls travel with the removable front fascia. Refrigeration machinery stays fixed. `SERVING_CUP` is a removable presentation prop. `ICE_SHELL` and `VENT_OBSTRUCTION` start hidden through the adapter; glTF itself has no portable node-visibility field.

## Construction adjustments and validation

The simplified source geometry placed the rear scraper outside the rounded tank. This asset shortens its axial span from 190 to 165 mm while keeping 3.45 turns. The drum cylinder is 130 mm long, centred with the tank, so rear spokes clear its end by 9 mm. The temperature probe is forward of the scraper sweep. These are construction corrections, not changes to lesson physics.

Evaluated Blender geometry measured a 1.78 mm minimum scraper-to-inner-tank gap through full rotation, a 2.3 mm inner rim-to-drum gap, and a 33.2 mm axial probe-to-scraper gap. Exact results are in `clearance-report.json`. Browser export and real Blender glTF re-import verify finite geometry and stable node names. The isolated browser preview verifies the adapter and actual appearance; it does not establish that the lesson integration is complete.

Browser glass is alpha-blended for legibility and cost; it will not reproduce Cycles refraction. Materials need the site's environment lighting. Use the mechanism view to remove the drink visually when teaching scraper action. Preserve the lighter palette. This is an editable visual study machine, not manufacturing-ready CAD or a validated physical refrigeration design.
