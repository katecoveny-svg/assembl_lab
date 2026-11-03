# Particle apparatus handoff · assembl.particles.v1

The Blender apparatus for the existing `/study/m/particles.html` lesson. The page now loads this GLB as its 3D bench.
The authoritative science stays in `study/m/particles.js`: `stateFrom`, `stages`, `boilPoint`, `pressureAt`, `pressure()`,
the timer, controls, chips, the three challenges and the Explore → Predict → Investigate → Explain lesson with its A/B
capture. Those sections are byte-identical to the pre-GLB file (SHA-256 checked in `study/tests/particles-loading.test.mjs`).

Status: **built and QA'd locally, awaiting Kate's review. Not approved, not released.**

## Files

| File | What it is |
|---|---|
| `source/build_particles.py` | The only source. Pure bpy: every part is generated in Python (lathes, swept tubes, bevelled boxes, Blender's built-in font for scale numerals). No imported meshes, scans, textures or generated imagery. |
| `source/particles.blend` | Editable scene saved by the script (Cycles materials, studio, three cameras). See "Checksums" for its size and SHA-256. |
| `particles-apparatus.glb` | Browser asset (web glass/water swapped in, see below). |
| `particles-rig-contract.json` | Written by the script from the actual objects: units, axes, every node's parent and world pivot, rig mappings, chamber regions, budgets, measured stats and tool versions. |
| `particles-rig-controller.mjs` | Pure visual adapter (`createParticlesRig(root, contract)`). |
| `renders/particles-hero.png`, `renders/particles-detail-syringe.png`, `renders/particles-detail-heat.png` | **Offline Cycles renders** of this asset (not browser captures). |
| `particles-hero.webp` | 1400 px WebP derivative of the hero render: the page's loading poster and the `/discover/` card (`lab/previews/particles-blender.webp`). |

## Rebuild

```sh
python3 -m venv .venv && .venv/bin/pip install bpy==5.1.2      # not committed; no other dependency
.venv/bin/python assets/models/particles/source/build_particles.py              # .blend, 3 Cycles renders, GLB, contract
.venv/bin/python assets/models/particles/source/build_particles.py --no-render  # .blend, GLB, contract only (~3 s)
# --preview renders at 16 samples / half size for framing checks
python3 -c "from PIL import Image; Image.open('assets/models/particles/renders/particles-hero.png').save('assets/models/particles/particles-hero.webp',quality=86)"
cp assets/models/particles/particles-hero.webp lab/previews/particles-blender.webp
node --test study/tests/particles-rig.test.mjs study/tests/particles-loading.test.mjs study/tests/lesson-models.test.mjs
```

The tests pin the GLB's byte size and SHA-256 to the contract, so a rebuild must commit the GLB and contract together.
Built with bpy 5.1.2 (Blender 5.1.2) and the bundled glTF exporter 5.1.20.

## Renders

Cycles on CPU, **64 samples + OpenImageDenoise**, AgX view transform, 1400×1050 hero and 1000×750
details. A cream cyclorama and three area lights; the cyclorama, lights and cameras live in `STUDIO_RENDER_ONLY` and are not
exported. Poses: hero at the lesson defaults (60 mL, 101.3 kPa, 20 °C); syringe detail at observation B (30 mL, 202.6 kPa);
heat detail at 62 °C. Particles are runtime instances and are **not** in the renders or the GLB.

Offline product-render convention: clear glass and water let shadow rays through (no caustic solve), so the plate under the
beaker is not falsely darkened. This affects the renders only.

## Units, axes and scale

Metres throughout, real sizes: hotplate 190 × 210 mm, 800 mL low-form beaker (Ø100 mm × 130 mm), −30…140 °C spirit
thermometer (300 mm) on a retort stand, 100 mL glass syringe (bore Ø34 mm, so 1 mL = 1.1014 mm of plunger travel),
Ø92 mm 0–400 kPa gauge. Blender +X right, +Y rear, +Z up; glTF +X right, +Y up, +Z front: `(x, y, z) → (x, z, −y)`.
The lesson bench uses **25 scene units per metre**: `loadParticles` applies one uniform scale to the GLB root and never
scales parts individually. The heat station sits at the origin, the gas station at x = 0.40 m.

## Rig contract (all inputs are values `particles.js` already calculates)

| Node (identity rest rotation) | Input | Pose |
|---|---|---|
| `PLUNGER_SLIDE` (child of `SYRINGE`; x = 0 is the inner nozzle wall, i.e. 0 mL) | `s.vol` mL | `x = rest + (mL − 60) × 0.0011014 m`; display range 0–100 mL (lesson 20–100) |
| `GAUGE_NEEDLE_PIVOT` | `pressure()` kPa | `rotation.z = −kPa/400 × 270°` (clockwise from 0 kPa at the lower left, seen from the front); display clamp 0–400 |
| `THERMO_SPIRIT_PIVOT` | `stateFrom(...).T` °C | `scale.y = (T + 30)/170`, clamped 0.01–1 |
| `WATER_PIVOT` / `WATER_VOLUME` | the page's existing liquid-height mapping | `scale.y = height / 0.040 m`; visible flag from the page |
| `HEAT_COIL` | heat level 0–1, smoothed by the page | colour `#D9CCD3 → #E58A9E` on a cloned material. **No emission, no bloom.** |
| `STATUS_LED` | heating flag | mint `#BFE8D6` idle, `#E8688A` heating; colour only |
| `POWER_KNOB_PIVOT` | `s.power` kW | `rotation.z = −(kW − 0.5)/2.5 × 270°` |

`setVisualState` is a full, absolute snapshot with defaults; repeated calls never drift (tested 50×). Clamps are display
guards only: the chips, labels, gauge readout and A/B evidence keep the model's own numbers. `volumeFromThumb(x)` inverts
the plunger pose for the existing drag interaction; the page still rounds and clamps to its own 20–100 mL.

Regions for the instanced particles (`regions` in the contract): `beaker_inner` (floor, rim, inner radius 48.5 mm) and
`syringe_chamber` (axis, nozzle wall, bore radius 17 mm, plunger face and thumb offset). Hotspot empties anchor the existing
labels: `HOTSPOT_BEAKER`, `HOTSPOT_HOTPLATE`, `HOTSPOT_THERMOMETER`, `HOTSPOT_GAUGE`, `HOTSPOT_CHAMBER`, `HOTSPOT_PLUNGER`.
`HOTPLATE_TOP` and `POWER_KNOB_PIVOT` keep the old "tap the hotplate to start/stop" pick; `THUMB_PLATE` and `PLUNGER_ROD`
are the drag handles.

## What the page does (study/m/particles.js, particles-asset.js)

- `particles3d` hides the 3D host and shows the offline poster while loading. It refuses any contract other than
  `assembl.particles.v1` (checked before the GLB downloads) and any GLB missing a required node. Failure at any point
  (import, contract, GLB, first frame) falls back to the existing live SVG drawing with an honest status line.
- The molecules are **still instanced procedural spheres** (343 water molecules as O + 2 H instances; 60 gas spheres),
  driven by the same per-frame code as before. Only their chamber bounds now come from the GLB. The gas spheres are a
  sketch of collisions: the gauge and readouts follow `pressure()`, never sphere positions. Steam stays soft white points.
- Aoraki (mountain step) stays a simple procedural backdrop; it is scenery, not apparatus.
- Graphics switch: **in page**, no reload. Model state, topic, investigation stage, captured A/B evidence and typed notes
  are untouched; `?lite` is written to the address so a reload honours the choice. `?lite` or no WebGL opens the drawing;
  "Use live 3D" from `?lite` attaches the bench in page. Explicit reset is the lesson's existing Restart investigation
  (60 mL, 20 °C, paused) and the topic Restart button.
- Reduced motion: camera moves are instant (kit), the ice lattice and gas spheres hold still unless the experiment is playing.

## Palette fix on this machine

Removed: the additive `#FFD76A` "hit flash" sprites (now small blush points with normal blending), all `mat("glow")`
emissive materials (coil, lamp, thermometer bulb and spirit), the butter-yellow `#F2C83C` thumb plate (now lilac in the GLB)
and the two butter chart markers in the drawing (now blush). Bloom is off for this page (`postprocessing:false`).
The shared `kit.js` `FIG_PALETTE.butter` entries and confetti colour are **not** changed here (shared by other machines).

## Budgets vs actuals (GLB)

| | Budget | Actual |
|---|---|---|
| File size | ≤ 2.5 MB | 929,636 B |
| Triangles | ≤ 80,000 | 29,004 |
| Mesh primitives (draw-batch proxy) | ≤ 80 | 54 (74 nodes) |
| Materials | ≤ 20 | 18 |
| Textures | 0 | 0 |
| Compression | none (the page's GLTFLoader path has no Draco/meshopt decoder wired) | none |

The browser adds the existing instanced molecules (3 instanced meshes × 343, 1 × 60) and two point sprites, as before.

## Checksums (SHA-256 at commit time)

| File | Bytes | SHA-256 |
|---|---|---|
| `particles-apparatus.glb` | 929,636 | `f970eb5ac07cbc61ccf1c54b91a77586887ebcfc0433f03585763a5dcae42d27` (also pinned in the contract and tests; the export is deterministic and rebuilt to the same hash) |
| `source/particles.blend` | 394,834 (compressed; well under the 15 MB limit, so it is committed) | `e984afe2918fbc40ef0782d9ade09c05944db115ba55dbda0f1762496bdcdfac` (a re-save may differ byte-wise) |
| `renders/particles-hero.png` | 1,428,808 | `eaafcf1aeaf9a604f337891027e6950a60e43ece11a6a2b70a563145762fe951` |
| `renders/particles-detail-syringe.png` | 775,809 | `b22fe08515c8beb55167df0bf01d15d15d455c6898e58d141398fe08fb021671` |
| `renders/particles-detail-heat.png` | 788,302 | `6234b1a88cec4743496cac0085db5ca603836e16a6b76809f08d6da74cfece28` |
| `particles-hero.webp` (= `lab/previews/particles-blender.webp`) | 16,532 | `e9ba5f5abc4f5dfbdd7609a30d639f24808f5a757995f858e4c6bfcee3f0c3b8` |

The three renders took 39 minutes on a shared 2-core CPU. In Cycles the thick syringe barrel reflects the dark rubber
head and reads darker than the browser's alpha glass; that is an offline-render look, not a geometry difference.

## Simplified for the browser, and simulation limits

- Glass and water are alpha-blended (`lab_glass_web` α 0.16, `water_volume_web` α 0.34) with no refraction. Cycles uses
  real transmission. **The offline renders do not show browser quality; review them separately.**
- The water body tracks the particle sample (≈ 13–45 mm deep), not the true depth of 500 mL in this beaker (≈ 68 mm). The
  particle count is a teaching sample, and the existing trap text depends on liquid particles staying close.
- Particles are drawn far bigger than real and are not a physical population. Liquid molecules can pass through the
  thermometer stem; there is no contact physics. The gas spheres do not compute pressure.
- This is a visual study apparatus: not a validated laboratory design, not manufacturing CAD, and the gauge, thermometer
  and syringe scales are display scales, not calibrated instruments.

## Provenance

All geometry, materials and renders are original and generated by `build_particles.py` in this repository. The earlier
supplied render (`particles-overview.png`, SHA-256 0dfacf87…) was used only as a visual reference for layout and palette;
none of its pixels or geometry are used. `lab/previews/particles-blender.webp` now derives from this asset's own hero render
so the `/discover/` card shows what the page loads.

## Not verified

- Real devices, GPUs, iOS/Android browsers, AR ("View in your space" uses the kit's existing AR path and was not tested).
- Browser QA used headless Chromium with **software WebGL (SwiftShader)** only, on a heavily shared machine: frame rate and
  real-GPU appearance are not measured.
- Curriculum alignment and the lesson copy were not reviewed (unchanged).
- Screen readers were not run; only DOM roles, labels, focus order and visible focus were checked.
