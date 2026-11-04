# Generic vehicle set: source handoff

Six generic, unbranded vehicles for the dealer twin's stock (`/cars/dealer-twin/`): **hatch, sedan, wagon, SUV, ute, van**.
Built entirely by one Blender Python script. No generated imagery, no scans, no third-party models, no textures. All original.

## Rebuild

```sh
python3 -m venv .venv && .venv/bin/pip install bpy==5.1.2           # once, not committed (Blender 5.1.2 as a Python module)
.venv/bin/python assets/models/vehicles/source/build_vehicles.py     # .blend + 6 GLBs + rig contract + build report (about 1.5 min)
.venv/bin/python assets/models/vehicles/source/build_vehicles.py --render --which=hero,detail,stills \
    --samples=96 --still-samples=64 --out=<png dir>                  # Cycles renders (about an hour on 2 CPU cores)
.venv/bin/python assets/models/vehicles/source/build_vehicles.py --no-export --render --which=sheet \
    --sheet-views=front,side,rear --out=<png dir>                    # review contact-sheet views only
python3 cars/dealer-twin/tools/compose_vehicle_images.py <png dir>   # PNG -> WebP on assembl chalk (#F5F1F2); needs Pillow
python3 cars/dealer-twin/tools/apply_vehicle_models.py               # gives the 48 listings model3d {body, paint} (drawings stay)
node --test cars/dealer-twin/tests/*.test.mjs
```

Built here with bpy 5.1.2 (glTF exporter 5.1.20). Renders: **Cycles, CPU, OpenImageDenoise**. Hero 1200×750 and detail 800×600
at **96 samples**; optional listing stills 640×480 at **64 samples** (rendered for review, not used by the page). `--debug` prints every cutter and boolean; `--no-export` leaves the
committed GLBs alone while iterating.

## How the bodies are made (why they no longer read as game cars)

- **Feature curves, not boxes.** Each body is lofted from longitudinal curves measured from the front: `crest` (centre-line top:
  nose, bonnet, windscreen, roof, rear glass, boot/tailgate), `belt`, `rail` (roof side), `low` (bumper lips, sills), and a plan
  `setF`/`setR` that sets how far each part of the width is set back from the nose and tail (so fronts are curved in plan).
- **Real cross-sections.** Every section is a creased chain: underbody, rocker tuck, lower door, a slight door scallop, the
  **shoulder crease** (widest point), the shoulder, the **belt**, the greenhouse side with **tumblehome** (14–25° by class), the
  **roof rail**, and a crowned top. The creases are split normals in the GLB, so the shoulder line catches light.
- **Pillars from geometry.** The top surface is `crest(x ± sweep·η²) − crown·η²`: the windscreen and rear window wrap round the
  corners, and the A- and C-pillar lines fall out of the same surface. The sweep fades out over the bonnet and boot.
- **Openings are cut, not painted.** Each window, headlamp, grille and intake is an outline in 2D, ray-cast onto the body, turned
  into a closed cutter shell and subtracted with exact booleans. Glass sits **11–12 mm inside a 22–24 mm black seal**; fixed glass has
  a **dark frit band**. Headlamps sit in 50 mm housings with two projector modules, a DRL strip and a flush clear lens, wrapping the
  front corners under the bonnet edge (found by probing the body, then fitted with a smooth curve). Grilles and intakes are pockets
  with plain horizontal slats.
- **Proportions per class** (typical NZ used stock; not any one model): wheelbase, overhangs, beltline about 0.62–0.68 of height,
  roof and track below, tyre sizes in the table. Arch radius is tyre radius + 30–55 mm; cars get a 10 mm arch flare, the SUV and
  ute unpainted flares and lower cladding.
- **Wheels:** lathed tyre with sidewall bulge, rounded shoulders, two circumferential grooves and alternating shoulder blocks
  (deeper on the ute's all-terrain), rim lip and barrel, 5 twin / 6 / 10 spokes with real depth (concave to the hub), hub with blank
  cap and nuts, brake disc and caliper visible through the spokes. The van has a steel wheel and plain cover.
- **Hardware:** mirrors on arms, flush handles in recesses, B/C-pillar gloss-black appliques, wipers resting on the glass, tail
  lamps (flush, two-tone), blank plates, shut lines (doors, bonnet, boot lid, tailgate), SUV roof rails, ute tub/cab gap/side steps,
  van sliding-door track and rear-door split, a small roof antenna on the cars.

## Files

| File | What |
|---|---|
| `source/build_vehicles.py` | The only source. Dimensions, curves, construction, materials, rig, export, studio and cameras |
| `source/vehicles.blend` | The editable scene: one collection per vehicle, named parts, metres (compressed; not deployed) |
| `<body>.glb` | Web models, one per body style |
| `vehicles-rig-contract.json` | Generated from the real nodes: names, pivots (glTF metres), axes, colourways, dimensions, sha256, bytes |
| `vehicles-rig-controller.mjs` | The adapter: `setYaw`, `setWheelRotation`, `setSteer`, `setPaint`, `reset`. It refuses a wrong contract or a missing node |
| `build-report.json` | Triangles (total and BODY), bytes, measured BODY bounds and materials per vehicle |
| `renders/<body>-hero.webp`, `-detail.webp` | Offline Cycles renders. They are **not** the browser runtime |
| `renders/contact-sheet.webp` | Review sheet: all six, front three-quarter, side and rear three-quarter (Cycles, 64 samples) |

## Units, axes, pivots

- Metres. Blender is Z-up with the nose toward +X and the left side toward +Y. The glTF is Y-up: `(x, y, z) → (x, z, −y)`.
  In three.js that means +X is the nose, +Y is up and +Z is the vehicle's **right** side.
- `VEHICLE_ROOT` sits at ground level, at the centre of the body footprint. It is the turntable pivot.
- `STEER_FL`/`STEER_FR` are the front hub centres and steer about +Y. `HUB_RL`/`HUB_RR` are the rear hub centres and are fixed.
  `WHEEL_*` sits under each hub and spins about glTF Z. The tyre and rim spin with it; the brake disc and caliper stay with the hub.
- Paint is one material, `PAINT` (clearcoat 1.0); the adapter swaps colour, metalness and roughness. One mesh per body.

## Dimensions (typical New Zealand used stock; not any one model)

| Body | Length | Width | Height | Wheelbase | Track | Tyre |
|---|---|---|---|---|---|---|
| Small hybrid hatch | 4.050 | 1.695 | 1.455 | 2.550 | 1.470 | 175/65R15 |
| Sedan | 4.690 | 1.800 | 1.445 | 2.750 | 1.560 | 215/55R17 |
| Station wagon | 4.660 | 1.790 | 1.475 | 2.700 | 1.550 | 205/55R16 |
| Mid-size SUV | 4.600 | 1.855 | 1.690 | 2.690 | 1.600 | 225/65R17 |
| Double-cab ute | 5.330 | 1.860 | 1.815 | 3.220 | 1.570 | 265/65R17 (all-terrain tread) |
| Long-wheelbase van | 5.265 | 1.880 | 1.990 | 3.110 | 1.650 | 215/70R16C |

The tests check the BODY mesh against these figures to within 1% (mirrors, rails and steps sit outside it).

## Budgets vs actuals (per vehicle GLB)

Budget: **≤ 1.2 MB, ≤ 40,000 triangles, 0 textures**, no Draco/meshopt (the page's loader has no decoder configured).

| Body | Triangles | GLB bytes |
|---|---|---|
| hatch | 35,852 | 976,052 |
| sedan | 36,964 | 1,003,472 |
| wagon | 38,618 | 1,043,936 |
| SUV | 39,805 | 1,087,052 |
| ute | 39,043 | 1,060,760 |
| van | 37,940 | 990,388 |

All in budget, but the SUV and ute are within 1.2k triangles of the cap and the bytes rose from about 0.6 MB (the boolean-cut
openings and split crease normals add vertices).

**How the page uses them (Kate's "Drawings + 3D option", 3 Nov 2026):** the stock wall, lead cards and every listing keep PR A's
body-style drawings. In the spotlight, a **"View in 3D"** button loads only that listing's body GLB in its colour, labelled
"Generic <body> model · not the actual vehicle"; "Back to drawing" returns. Nothing is fetched until the button is pressed; each
body is fetched once. No WebGL or data saver: the button is disabled with a one-line note. A failed load keeps the drawing. The
offline listing stills (`--which=stills`) are not shown and not committed; the hero/detail renders and the contact sheet are for
review only.

## Honest limits

- These are **generic** vehicles, labelled "Generic hatch render · not the actual vehicle" wherever they are shown. They are not
  scans or replicas of any listed car or model. Believable placeholders, not product imagery.
- **Glass, web vs offline.** In the GLB the glass is opaque dark tinted (`GLASS`, `GLASS_DARK` for privacy glass), because the web
  model has no interior. The Cycles renders swap in a thin tinted glass (transparent + Fresnel gloss) and show a **render-only
  blockout interior** (dash, seats, headrests, right-hand-drive wheel) that is never exported. Paint flake, tyre and plastic
  micro-texture are also render-time only. The browser will look simpler than the renders.
- Lamps are shapes, not optics. No suspension, door or opening rig. Wheels spin and the fronts steer.
- **Offline vs runtime:** Cycles uses a graded overhead softbox, side strips and a studio gradient world with a shadow catcher; the
  browser uses three.js PBR with a RoomEnvironment map, one directional light and a painted contact shadow. A Cycles render is not
  proof of runtime quality; the runtime was checked separately (see the PR).
- **Known imperfections:** the SUV still leans crossover-wagon rather than a boxy SUV; noses are generic rounded shapes (no
  distinctive "face"); arch flares on the cars show a soft reflection kink above the front wheel; the van front grille reads
  slightly soft; panel gaps are 9 mm painted bands rather than modelled grooves.
- **Not verified:** real phones, Safari, AR, accuracy against any real vehicle's drawings.

## The /cars/ hero: a five-door Golf (`golf.glb`)

Not part of the generic set or its contract (the contract tests expect exactly six bodies). Built by `source/build_golf.py`,
which imports `build_vehicles.py` and reuses its loft, cutters, panels, wheels and studio, with Golf-specific curves and parts:
a crisper shoulder line, bonnet creases, a lower door feature line, slim LED headlamps joined by a light bar over a narrow upper
grille, a wide lower intake with corner air curtains, horizontal tail lamps split with the tailgate, a roof spoiler, the thick
forward-leaning C-pillar and five double-spoke 17" alloys. **No badges, logos or lettering; blank plates.** Original geometry.

```sh
/path/to/python-with-bpy assets/models/vehicles/source/build_golf.py                       # golf.glb + golf-build.json (~10 s)
/path/to/python-with-bpy assets/models/vehicles/source/build_golf.py --render --which=hero,sheet \
    --samples=96 --sheet-samples=64 --sheet-res=800x500 --out=<png dir>                    # Cycles: golf-hero + sheet views (~2 min)
node --test cars/tests/*.test.mjs
```

Real dimensions: 4.284 × 1.789 × 1.456 m, wheelbase 2.636, front overhang 0.86, track 1.55, 225/45R17. About 42k triangles and
1.17 MB (its own budget: 60k / 2 MB). The /cars/ stage loads it through `cars/glbkit.js`, which measures the windscreen, bonnet,
roof, doors and belt off the model by ray casts, so the notice parts land on the right panels; the kit3d hatch is the fallback.
`renders/golf-hero.webp` and `renders/golf-contact-sheet.webp` are offline Cycles renders (render-only: thin glass, interior
blockout, a faint glow in the lamp housings), not the browser runtime.

Known limits: the side glass in the rear three-quarter catches the studio's bright side strips; panel gaps are painted bands; the
lower door feature line is subtle. A likeness of the car's proportions and graphics, not a measured replica.

Note for `build_vehicles.py`: after the window caps are deleted it shifts face material indices by hand and `Mesh.materials.pop`
shifts them again, so faces after a removed slot move one material down (lamp housings come out as `SEAL`). `build_golf.py`
re-points faces by material name instead; the generic GLBs were left as they are (their contract pins their sha256).
