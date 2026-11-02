# Generic vehicle set: source handoff

Six generic, unbranded vehicles for the dealer twin's stock (`/cars/dealer-twin/`): **hatch, sedan, wagon, SUV, ute, van**.
Built entirely by one Blender Python script. No generated imagery, no scans, no third-party models, no textures. All original.

## Rebuild

```sh
python3 -m venv .venv && .venv/bin/pip install bpy==5.1.2           # once, not committed (Blender 5.1.2 as a Python module)
.venv/bin/python assets/models/vehicles/source/build_vehicles.py     # .blend + 6 GLBs + rig contract + build report (about 1 min)
.venv/bin/python assets/models/vehicles/source/build_vehicles.py --render --which=stills --still-samples=10 --out=<png dir>
.venv/bin/python assets/models/vehicles/source/build_vehicles.py --render --which=hero,detail --samples=16 --out=<png dir>
python3 cars/dealer-twin/tools/compose_vehicle_images.py <png dir>   # PNG -> WebP on assembl chalk (#F5F1F2); needs Pillow
python3 cars/dealer-twin/tools/apply_vehicle_renders.py              # points the 48 listings at their stills
node --test cars/dealer-twin/tests/*.test.mjs
```

Built here with bpy 5.1.2 (glTF exporter 5.1.20). Renders: **Cycles, CPU**, OpenImageDenoise. Listing stills are 640×480 at
10 samples; hero renders are 1200×750 and detail renders 800×600, both at 16 samples. Samples are low because the build machine
was shared (2 CPUs, load average around 18). A quieter machine should re-render at 64–128 samples using the same commands.

## Files

| File | What |
|---|---|
| `source/build_vehicles.py` | The only source. Dimensions, profiles, construction, materials, rig, export, studio and cameras |
| `source/vehicles.blend` | The editable scene: one collection per vehicle, named parts, metres (compressed; not deployed) |
| `<body>.glb` | Web models, one per body style |
| `vehicles-rig-contract.json` | Generated from the real nodes: names, pivots (glTF metres), axes, colourways, dimensions, sha256, bytes |
| `vehicles-rig-controller.mjs` | The adapter: `setYaw`, `setWheelRotation`, `setSteer`, `setPaint`, `reset`. It refuses a wrong contract or a missing node |
| `build-report.json` | Triangles, bytes, measured bounds and materials per vehicle |
| `renders/<body>-hero.webp`, `-detail.webp` | Offline Cycles renders. They are **not** the browser runtime |

## Units, axes, pivots

- Metres. Blender is Z-up with the nose toward +X and the left side toward +Y. The glTF is Y-up: `(x, y, z) → (x, z, −y)`.
  In three.js that means +X is the nose, +Y is up and +Z is the vehicle's **right** side.
- `VEHICLE_ROOT` sits at ground level, at the centre of the body footprint. It is the turntable pivot.
- `STEER_FL`/`STEER_FR` are the front hub centres and steer about +Y. `HUB_RL`/`HUB_RR` are the rear hub centres and are fixed.
  `WHEEL_*` sits under each hub and spins about glTF Z. The tyre and rim spin with it; the brake disc and caliper stay with the hub.
  Positive `setWheelRotation` means rolling forward.
- Paint is one material, `PAINT` (clearcoat 1.0). The nine colourways in the contract are the nine colours on the yard. The adapter swaps
  colour, metalness and roughness, so there is **one mesh per body and no duplicated meshes per colour**. `KHR_materials_variants`
  was not used because three.js's core GLTFLoader does not apply it.

## Dimensions (typical New Zealand used stock; not any one model)

| Body | Length | Width | Height | Wheelbase | Track | Tyre |
|---|---|---|---|---|---|---|
| Small hybrid hatch | 4.050 | 1.695 | 1.455 | 2.550 | 1.470 | 175/65R15 |
| Sedan | 4.690 | 1.800 | 1.445 | 2.750 | 1.560 | 215/55R17 |
| Station wagon | 4.660 | 1.790 | 1.475 | 2.700 | 1.550 | 205/55R16 |
| Mid-size SUV | 4.600 | 1.855 | 1.690 | 2.690 | 1.600 | 225/60R18 |
| Double-cab ute | 5.330 | 1.860 | 1.815 | 3.220 | 1.570 | 265/65R17 |
| Long-wheelbase van | 5.265 | 1.880 | 1.990 | 3.110 | 1.650 | 215/70R15C |

Measured bounds include plates, mirrors and steps, so the overall length is up to about 5 cm longer than the body length (the ute's
rear step). The tests check the BODY mesh against these figures to within 1%.

## Construction (what is modelled)

- **Body:** a lofted shell from side profiles (roofline, beltline, sill) and plan taper, sampled every L/128. Cross-sections carry
  tumblehome, shoulder and roof crown. The ends are rounded, not flat caps.
- **Panel gaps:** door shut lines, bonnet and tailgate or boot lines, and the bonnet leading edge and bumper top across the nose.
- **Glazing:** flush side glass with a black B-pillar (and rear-door frame where real), painted A and C/D pillars, windscreen and rear
  window, and a black belt seal.
- **Wheel wells:** boolean pockets lined dark. Arch flares and lower cladding on the SUV and ute. A dark rocker on every body.
- **Wheels:** lathed tyre with shoulder, sidewall bulge and two tread grooves at the real outside diameter. Rim with lip, barrel,
  5/6/10-spoke face, hub and five nuts. Brake disc and caliper. The van has a steel wheel with a plain cover.
- **Front:** headlamps with a DRL strip and a projector, a slim upper grille opening, a lower intake and a blank plate. **Rear:** tail
  lamps, a diffuser band and a blank plate.
- **Body hardware:** mirrors on arms with mirror glass, and flush door handles.
- **Body-specific:** SUV roof rails. Ute open tub (lined), cab-to-tub gap, side steps and rear step. Van sliding-door track, rear-door
  split and rear windows.
- **IP:** no logos, badges, lettering, plate characters, grille patterns or signature lamp graphics. Shapes are generic, and node,
  mesh and material names are checked in tests for brand words.

## Budgets vs actuals (per vehicle GLB)

Budget: **≤ 1.2 MB, ≤ 40,000 triangles, 0 textures**, no Draco/meshopt (the page's loader has no decoder configured).
Actuals are in `build-report.json` and in the PR. Each vehicle is about 26–27k triangles and 0.56–0.62 MB.
Loading: the stock wall shows only WebP stills. **Only the car opened in the spotlight fetches a GLB**, after the click, only where
WebGL works and Save-Data is off. Each body is fetched once per page.

## Honest limits

- These are **generic** vehicles, labelled "Generic hatch render · not the actual vehicle" wherever they are shown. They are not
  scans or replicas of any listed car or model. Use them as believable placeholders, not as product imagery.
- **Glass is opaque tinted.** There is no interior, so it is not transparent in either renderer. Lamps are lens shapes, not optics.
- **No suspension, door or opening rig.** Doors were not split: not cheap enough for this pass. Wheels spin and the fronts steer.
- **Offline vs runtime:** the Cycles renders use area lights and a shadow catcher. The browser uses three.js PBR with a
  RoomEnvironment map, one directional light and a painted contact shadow. They will not match, and a Cycles render is not proof of
  runtime quality. The runtime was checked separately (see the PR).
- **Not verified:** real phones, Safari, AR, accuracy against any real vehicle's drawings, and Cycles at production sample counts.
