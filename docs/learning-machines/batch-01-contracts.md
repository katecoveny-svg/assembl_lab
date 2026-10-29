> Phone handoff correction: the verified legacy wireless displacement is **0.15 scene units/mm**, or **5×** at 30 units/metre. The delivered asset uses true metres; the local frontend applies and labels the 5× teaching pose. The proposed legacy figure below has been corrected. Phone integration evidence: [local review](../../study/review/phone/README.md).

# Batch 01 — Blender asset requests

Implementation baseline: `a482fc56ab49dc7c40d39b3ef20c7f3614226dde`. These are **proposed production contracts**, grounded in existing source; they do not claim that new assets have been built or tested. Parent coordinates Blender production. Do not create placeholder substitutes or begin a second model implementation.

Read the [product brief](assembl-3d-design-brief.md) and [rollout tracker](README.md). Suggested integration order: **phone, vinyl, bike**. Each route can be reviewed independently. The bike asset family is the largest; its ski lessons stay intact.

## Common deliverable and rig contract

- Deliver reproducible Blender Python, editable `.blend`, hero/detail/cutaway PNGs, browser GLB, and a versioned JSON manifest. Include tool versions, export settings, SHA-256, actual bytes/triangles/meshes/materials/draw batches, bounding boxes, source/provenance and reproduction commands. No proprietary brand replica or unsupported manufacturing claim.
- Author dimensions in metres. Manifest must report **exported glTF coordinates**, not only Blender Z-up coordinates. Request glTF Y-up, +X along the object's primary working direction, +Z toward its front/viewer unless overridden below. Transform scale must be applied once; document each root placement and every deliberate diagram magnification separately from physical dimensions.
- Name stable roots, moving groups, materials, screen planes, connectors and hotspot empties. Record each parent, rest position/quaternion/scale, pivot, local motion axis, bounds, and allowed range. Integration uses absolute poses relative to rest; repeated updates must not accumulate offsets. Supply representative pose fixtures and check export → reimport.
- Asset controller consumes **provided pose/readout values only**. It must not create a timer, RNG, force/charging/thermal/audio solver, scoring system, challenge result or independent play state. Existing models own all of those. Numbers on textures/labels are runtime-owned, not baked into geometry.
- Hotspots must have stable IDs, a physical anchor and label offset; frontend supplies existing explanatory copy and keyboard-accessible alternatives. Hiding shell parts must not hide the explanatory mechanism, controls or readouts. Avoid selectable microgeometry that cannot be used on a phone.
- Proposed budget per loaded lesson asset: target ≤3.5 MB GLB, ≤100k triangles and ≤80 mesh/material batches for the active apparatus; budget repeated bike instances together, not per clone. These are starting ceilings, not current measurements. Detail should come from meaningful construction and shared materials/instances, not huge bevel subdivision. Negotiate exceptions using measured browser evidence before acceptance. Preserve existing graph/particle rendering budgets too.
- Cream/white structural surfaces, soft lilac, blush, mint and powder blue. Suggested existing-token starting swatches: cream `#F7F3EC`, lilac `#D9CBF2`, blush `#F3B8C8`, mint `#BFE8D6`, powder blue `#BFDDF5`. Navy `#222A55` is restrained text/detail; retain real copper, rubber, steel and glass cues. Use sufficient label contrast; no saturated yellow or emissive glow as the main material treatment. Existing named colour controls must remain truthful.
- Poster: a generous machine view, complete silhouette, readable material separation, cream ground, no webpage chrome or baked live numbers. Supply 4:3 composition and safe 8:5 card framing without clipping. Offline reflections and browser glass are reviewed separately.
- Acceptance requires original model/challenge equivalence, exact unit/pivot tests, control limits, repeated reset/topic changes, pause/resume, graphics changes without state loss, late loading and failed loading, keyboard/focus, reduced motion, 320/375 viewport checks and actual browser captures. No physical phone/AR/physics validation claims unless performed.

## 1. Phone / electronics

Route: `/study/m/phone.html`. Source: [phone.js](../../study/m/phone.js), especially state/model at lines 36–56, topics at 167–199, `phone3d` at 221 and controls at 433. The [existing parts list](../../study/m/phone.parts.md) is context; its 800×420 drawing units are **not metres**.

### Learning and immutable model

Nine topics: charge, energy, fast charge, constant-current/constant-voltage, internal resistance, parallel loads, wireless induction, capacitor, test. Preserve all five challenges. The phone scene already has five stations; a beautiful handset alone is insufficient.

| Inputs / state | Unit / range | Existing authority and what visuals may show |
|---|---|---|
| `mAh`, `V`, `hours` | 2000–5000 mAh; V=3.87; 2–12 h | `Q`, `E`, `Pavg`; battery/readout and energy use. Capacity changes are not permission to resize a real battery claim |
| `Pchg`, `eff`, `r`, `soc`, `tchg` | 5–45 W; 0.60–1; 0.01–0.30 Ω; fraction; seconds | `Ibatt`, `emf`, `Icc`, `tickCharge`, `t50`; current-limited charging and 250× model animation. Preserve model timing, including current existing tick semantics |
| `Iload`, `Iscreen`, `Imodem` | 0.2–4 A; 0.2–2 A; 0.1–1.5 A | `Vterm`, `Plost`, `Pdel`, `Itot`, `Ppar`, `hoursFlat`; flows and labels. Internal-resistance heating is an estimate, not measured phone temperature |
| `N`, `f`, `gap` | 5–20 turns; 100–200 kHz; 0–8 mm | `emfW`, `effW`, `tW50`; existing indicative induction model, no field solver or efficiency prediction substituted |
| `C`, `R`, `vcap`, `tcap` | 100/470/1000/2200/4700 μF; 1/10/22/47/100 Ω; V; s | `tau`, `Ecap`, `Qcap`, `tickCap`; plate charge and voltage curve from model |
| `playing`, active topic | boolean / existing key | Motion obeys play/reduced-motion state; topic reset/restart remains explicit |

### Asset family and coordinates

`PHONE_ROOT`: handset on its back, screen facing +Y, long dimension +X, side width Z; author approximately **0.147×0.008×0.072 m** (L×thickness×width). This is a generic practice handset, not a particular certified device. Request adapter scale **30 scene units/metre**: 4.41-unit length closely matches existing 4.4. It is a proposed explicit conversion for this asset, not a claim that all five existing diagram stations share real-world scale.

| Stable node / material | Pivot and required detail | Existing-state mapping |
|---|---|---|
| `PHONE_BACK`, `PHONE_BATTERY`, `PHONE_BOARD`, `PHONE_SCREEN` | Separate +Y explode groups, assembled rest offsets in manifest; retain back camera stack, bevels, fasteners, USB-C aperture, side buttons, battery connector and PCB components | Topic selects assembled/exploded display. Keep an unambiguous rest pose and bounded offsets; no explosion tied to voltage as though physical |
| `BATTERY_INDICATOR`, `SCREEN_SURFACE` | Separate non-structural indicator/screen plane; authored UVs and bounds | Adapter supplies charge fraction and text from current topic (`soc` for charging, existing energy depiction for energy). Never shrink the actual battery casing to imply charge volume |
| `CHARGER_ROOT`, `USB_CABLE`, `USB_PHONE_PORT`, `USB_BRICK_PORT` | Generic 20 W practice brick approx .046×.028×.040 m; coherent connectors and bend radius; cable path sampled in manifest | Labels use actual `Pchg`, `eff`, `Ibatt`/`Icc`. Moving charge markers are illustrative and current-driven; cable geometry itself does not pump |
| `QI_PAD_ROOT`, `QI_TRANSMITTER`, `QI_PHONE_ROOT`, `QI_RECEIVER` | Coaxial coil centres along +Y; open/cutaway shell; receiver group has visible turns 01–20 or a documented equivalent | Select exactly `N` receiver turns; height input is `gap/1000` m. If retaining the existing exaggerated gap view, record/display its magnification explicitly (verified legacy .15 scene units/mm is 5× at scale 30); never call that measured separation |
| `CELL_DEMO`, `INTERNAL_RESISTOR`, `LOAD_DEMO`, `AMMETER_ANCHOR` | Separate teaching-board subassembly; named terminal anchors and closed path | Same existing load/current/heat functions. Material heat cue and thermometer annotation remain labelled estimated |
| `PARALLEL_SCREEN`, `PARALLEL_MODEM`, `RAIL_POS`, `RAIL_NEG` | Two clearly connected branches, terminal anchors and separate supplied path arrays | Branch marker speed from respective model currents; total readout from `Itot`, no duplicated circuit solver |
| `CAPACITOR_DEMO`, `PLATE_POS`, `PLATE_NEG`, `SERIES_RESISTOR` | Explicit enlarged teaching component, fixed plate geometry and charge bounds; not a literal phone-scale capacitor cutaway | Markers/field overlay use `vcap/V`, `Qcap`, `tau`; no recomputation of voltage by asset controller |
| `SHELL_MAT`, `BATTERY_CASE_MAT`, `PCB_MAT`, `COPPER_MAT`, `SCREEN_MAT`, `HEAT_CUE_MAT` | Matte powder-blue/cream handset, lilac detail, mint PCB, blush restrained emphasis; subtle glass | Clone only truly stateful materials so one station cannot recolour another |

Hotspots: `HOT_BATTERY`, `HOT_USB`, `HOT_CHARGER`, `HOT_BOARD`, `HOT_RECEIVER`, `HOT_TRANSMITTER`, `HOT_INTERNAL_R`, `HOT_PARALLEL_SCREEN`, `HOT_MODEM`, `HOT_CAPACITOR`, `HOT_SERIES_R`. Keep charts, legends and educational particles frontend-owned. Enlarged resistor/capacitor stations should be marked “diagram / enlarged,” not packed into misleading literal handset positions.

Pose fixtures: assembled; charge exploded; 20% and 100% indicator; 5/20 turns and 0/8 mm gaps; capacitor empty/full; lowest/highest load heat cue. Verify no case/coil collisions and readable charge state without over-bright transparent surfaces. In browser compare `Icc` around 80%, full-charge pause, capacitor restart on R/C change and all five challenge outputs with baseline.

## 2. Vinyl / turntable and sound

Route: `/study/m/vinyl.html`. Source: [vinyl.js](../../study/m/vinyl.js): state/functions at 5–17, topics 152–184, `vinyl3d` at 199, controls/tick 397–405 and six challenges. [Parts context](../../study/m/vinyl.parts.md).

### Learning and immutable model

Keep spin, groove, pitch, air, loudness, angular velocity, centripetal acceleration, format comparison and test. A stylus must visibly stay at the **selected radius**, not follow a decorative loop. Physical radius, rotational phase and slowed wave phase are different quantities.

| State / helper | Unit / range | Asset / overlay mapping |
|---|---|---|
| `rpm`, `ang`, `rps`, `omega` | 25, 33⅓, 45, 78 rpm; angle rad | Platter rotation exactly from `s.ang`; do not integrate another motor clock |
| `format`, `disc`, `r` | LP/single; recorded rpm; .060–.146 m clamped to .088 m for single | Select LP/single group; stylus follows existing circle-intersection solution. Format changes retain existing rpm/disc behavior |
| `f`, `amp`, `heard`, `pitchRatio` | 55–1760 Hz; .1–1; Hz / ratio | Existing audio and model-driven groove/speaker indicators; all sound stays user-triggered |
| `phase`, `speedAt`, `vlin`, `acen` | slowed visual phase, m/s, m/s² | Magnified groove, air motion, tangent velocity and inward acceleration remain frontend-generated from same helpers |
| `db`, `hours` | 30–110 dB; existing exposure state | Keep existing educational reference/readouts; geometry cannot claim to measure actual output SPL. Any new health/source wording is separate review |

### Asset and rig

Use `VINYL_ROOT` with +Y up, platter in XZ plane. Export metres; adapter scale **K=2.2/.146=15.0684931506849 scene units/metre**, preserving the current groove-radius conversion. LP outer/inner groove radii **.146/.060 m**; single outer groove **.088 m**. Preserve .15 m / 1.5 kg as the existing **estimated** inertia inputs; do not calculate inertia from mesh mass/volume. Physical disc outside diameter and groove radius are distinct: do not mistake the .146 m outer groove for a full 12-inch diameter.

| Stable node | Pivot / detail | Mapping |
|---|---|---|
| `DECK_SHELL`, `DECK_TOP`, `FEET`, `SERVICE_CUTAWAY` | Cream/lilac or blush plinth; rounded joins, feet, switch/recess detail, controlled cutaway | Topic camera/cutaway only; no independent mechanics |
| `PLATTER_PIVOT` → `PLATTER`, `MAT`, `LP_DISC`, `SINGLE_DISC` | Spindle centre; local +Y rotation; genuine edge thickness, shared groove texture, label tick | Absolute Y rotation `-s.ang`; select one disc; still lighting/reflection must not rotate as a painted shine |
| `MOTOR_PULLEY_PIVOT`, `BELT`, `SPINDLE` | Pulley Y-axis and coherent belt path with manifest pulley radii | Existing adapter uses `-s.ang*6.8` for pulley; preserve ratio visually or explicitly flag compatibility change. Belt motion is illustrative, not a torque/motor solver |
| `TONEARM_YAW` → `TONEARM`, `COUNTERWEIGHT`, `HEADSHELL`, `STYLUS` | Y-axis at `(2.75/K, .86/K, -1.75/K)` metres in deck coordinates; pivot-to-stylus horizontal length `3.05/K` m, matching source `PV`, `ARM_L`, `YP` | Existing circle-circle intersection drives yaw. Manifest gives exact stylus tip; verify it reaches every allowed radius and sits on the disc without stretching the arm |
| `ARM_LIFT` | Optional separate pitch hinge at arm bearing, rest contact pose | View-only lift if explicitly requested; no new learner control required |
| `SPEED_33`, `SPEED_45`, `SCREEN_LABEL_ANCHOR` | Button/hotspot IDs and tiny bounded press translation | Existing click action updates same rpm control; no hidden second speed |
| `SPEAKER_ROOT`, `SPEAKER_CONE` | Cream/mint cabinet, rubber surround, cone separate; local +X translation normal to diaphragm | Existing slowed `s.phase` and amplitude drive illustrative excursion; no actual-frequency geometry oscillation or audio generation in rig |
| `GROOVE_WINDOW_ANCHOR`, `AIR_COLUMN_ANCHOR`, `DUST_MARKER_ANCHOR` | Named reference frames, not baked waves/arrows | Keep procedural magnifier, air particles, dust/vector overlays and keyboard piano tied to model |

Hotspots: platter/spindle, motor, belt, tonearm pivot, counterweight, cartridge/stylus, outer/inner groove, speaker cone and speed buttons. Provide a touch-friendly stylus selection target plus the existing needle slider/keyboard fallback. Navy can remain on the actual vinyl/rubber; pastel structure should dominate the scene, not recolour the record so its function becomes unclear.

Pose fixtures: LP at .146/.060 m, single at .088/.060 m, each at 0 and π/2 phase; speaker minimum/maximum visual excursion; assembled and cutaway. Browser must show equal angular speed/different tangential speed, pitch ratio 45/(100/3)=1.35, stylus radius under drag and slider, 78/25 rpm, all six challenges, muted initial audio and reduced motion. Do not bake numbers, waves or challenge answers into the asset.

## 3. Downhill bike / mechanics

Route: `/study/m/bike.html`. Source: [bike.js](../../study/m/bike.js): garage definitions at 13–40, SI state/physics at 50–130, `geoPts` at 165, topics 701–749, garage UI at 791 onward, `bike3d` at 842, controls at 1169. [Existing parts file](../../study/m/bike.parts.md) covers **ski steps only**; it is not a complete bicycle rig specification.

### Learning and bounded scope

Retain all 13 topics and eight challenges. Upgrade bicycle construction, its rider and the fork teaching subassembly in garage/trail/stop/fork views. Keep forest/trail, graphs, force and energy overlays, helmet camera, previous-run comparison and the **separate NCEA ski run/work/frictionless/check-turn scenes**. Do not replace the ski model with cycling formulas or represent a new real trail.

The garage has **three meaningful models**: FLOW (single crown, .16 m travel, air shock), DROP (dual crown, .20 m, coil shock), RIDGE (single crown, .17 m, air shock). It also has four tyre sets, three handlebar choices, colour, guard/light, plate/tag and rider mass. A single immutable downhill mesh would misrepresent those controls. Supply three compatible variant roots or equivalent manifest-driven components before claiming the bike lesson upgraded. DROP can be the first benchmark render, but does not complete the route alone.

| State / helper | Units / meaning | Visual authority |
|---|---|---|
| `s.b`, `MODELS`, `WHEELS`, `BARS`, `bikeMass`, `M`, `MU`, `CDA`, `TRAVEL` | kg, friction/rolling coefficients, m², travel m; bar width/rise mm | Existing garage selection owns both configuration and physical values. Asset must never alter them |
| `x,y,v,t,dist`, `air`, `crash`, `finished` | m, m, m/s, s, m and trajectory state | `tickTrail` controls root position/pitch and event state; existing trail presentation scaling retained |
| `fc`, `rotorT`, `heatB`, `heatF`, `attack` | normalized visual fork compression; °C estimate; J; rider pose | Existing body/fork/heat/rider mapping, not a new suspension or thermal solver |
| `v0,tr,grip,sx,sv,sphase` | km/h input; s; surface; m/m·s⁻¹; stop phase | `tickStop`/`stopNums` own reaction and braking. Preserve real/schematic distinctions |
| `k,fh,fy,fx,fphase`, `forkNums` | N/mm UI (×1000 to N/m), drop/height/compression m, phase | `tickFork` drives landing pose; front mass is existing 45% of total model mass. Display spring and model/leg approximation honestly |
| `s.ski`, `SK`, `tickSki` | existing ski SI quantities / 3× animation | Unchanged separate branch; no bicycle asset should own or overwrite it |

### Geometry and pose contract

Author Y-up metres; +X forward, +Z toward viewer/axle direction. The source's 2D geometry points map as **`(x*.025, -y*.025, z)`**, not 25 units/metre. Existing `U=.025` converts arbitrary drafting coordinates to scene metres; do not apply it again to an already metre-authored GLB. Rest axles are at y=.375 m and an illustrative rolling radius .375 m is used for spin; preserve the existing model mapping, not an inferred tyre diameter from a mesh.

Uncompressed axle pairs (x,y,z=0) from source: FLOW rear (-.650,.375), front (.6625,.375); DROP rear (-.675,.375), front (.7125,.375); RIDGE rear (-.6625,.375), front (.6875,.375). Head angles are 65°/63°/64°. Exact rest anchors and variants must be generated from the existing `MODELS.*.geo` and `geoPts` conversion, not traced from a screenshot. Document runtime presentation enlargement relative to the trail separately.

| Stable node family | Required construction and pivot contract | Existing mapping |
|---|---|---|
| `BIKE_FLOW`, `BIKE_DROP`, `BIKE_RIDGE` under `BIKE_ROOT` | Only selected variant visible; stable compatible anchors, reusable materials | `s.b.model`; reuse complete asset instances for garage/trail/stop/fork without a new simulation |
| `ANCHOR_RA/FA/HB/HT/BB/ST/SEAT/TT/MP/RP/RK/SH0/SH1/UC/SB/CL/GR/PF/PR` | Named empties corresponding to source `geoPts`; rest pose and per-variant mappings | Frontend computes P from authoritative function; supplies transformed anchors. **Do not invent a physical four-bar linkage solver**: existing pose deformation is an illustrative geometry model |
| `FRAME_DOWN/TOP/SEAT/HEAD`, `REAR_STAY_L/R` | Detailed but separately poseable tube/joint components, endpoint anchors and local longitudinal axis; no welded one-piece mesh that cannot follow P | Fit to current P endpoints with documented transforms/limited axial scaling. If a skinned alternative is used, demonstrate its exported poses reproduce these anchors at 0, .5 and 1 compression |
| `WHEEL_FRONT_PIVOT`, `WHEEL_REAR_PIVOT` → tyre/rim/spokes/rotor | +Z axle rotations, hubs, spoke lacing, tread variants, rim and valve detail; rotor separate material | Source trail spin `-dist/.375`, stopping spin `-sx/.375`, garage `-gspin`, fork 0. Keep same physical trajectory even if rim thickness improves |
| `FORK_LOWERS`, `STANCHION_L/R`, `CROWN_LOWER/UPPER`, `FORK_STEER` | Lower ends remain at front axle; upper parts follow P and declared fork axis `[-cos(ha), sin(ha),0]`; single/dual crown visibility | `fc`/travel or `min(fx,TRAVEL)/TRAVEL` through existing pose mapping. Ensure no floating crown, inverted seal, overlap at full travel |
| `SHOCK_BODY`, `SHOCK_SHAFT`, `SHOCK_COIL`, `SHOCK_AIR_CAN` | Eyelets at SH0/SH1, named longitudinal axis, rest length and allowed compression | Distance/orientation from supplied anchors; coil vs air from selected model. Visual spring squashes; no independently computed rebound |
| `BAR`, `GRIP_L/R`, `SADDLE`, `CRANK`, `PEDAL_L/R`, `CHAIN`, `CASSETTE` | Bar width .760/.780/.800 m and rise .010/.025/.040 m; accurate joints, brake lines, chain path | Existing bars and anchor selection. Downhill coast has no cadence state: do not add fictitious pedalling or chain-drive forces |
| `ROTOR_FRONT/REAR`, `CALIPER_FRONT/REAR` | 180/203/200 mm variant rotor diameters; calipers outside rotating group | `rotorT()` heat cue only; current all-heat-in-rotor assumption stays labelled upper estimate. No smoke/fire threshold invented |
| `MUDGUARD`, `LIGHT_POD`, `NUMBER_PLATE`, `TAG_SURFACE` | Visibility groups and UV surfaces with safe margins | Existing `guard/pod/plate/tag`, generated runtime text, no personal name baked into deliverable |
| `RIDER_ROOT` + hip/shoulder/head/hands/feet and limb endpoint anchors | Neutral age-appropriate helmeted rider; visible hand/grip and foot/pedal contact | Reuse existing rider point/attack/crouch mapping. Asset accepts pose; no balance/biomechanics agent. Preserve keyboard control |
| `FORK_DEMO_ROOT` | Separate enlarged exploded fork/shock teaching parts, same part nomenclature | Garage explanation and spring view only; don't confuse display magnification with real travel |

Materials: cream/light structure, powder-blue/mint/lilac detail, subdued steel and restrained navy rubber. **Existing colour control labels are Red/Black/Teal**: keep recognizable corresponding colour accents/material slots and the saved selection; do not silently label lilac as Black. A future expanded pastel colour selector is a separately reviewed UI change. Use `FRAME_COLOUR_ACCENT` separate from `STRUCTURE_CREAM` so the current build identity can survive a lighter design. Material state must not bleed between ghost/current bike instances.

Hotspots: fork crown/seals/lowers, front/rear rotor, caliper, rear shock/spring/damper, tyre tread, bar/grip, crank/pedal, light and build plate. Label with existing mass, travel, grip, rotor-temperature and force values only. Camera/labels must distinguish complete bike, full fork stroke, rotor detail and rider stance without shrinking the playable trail.

Pose fixtures: all three builds; each at 0/.5/full travel, four tyre choices, three bars; rider attack/upright and landing crouch; guard/pod on/off; stationary and quarter-turn wheels; hottest supplied heat cue; reset pose. Inspect chain/frame/tyre/crown clearances and hand/foot contact. Browser acceptance additionally compares braking, jump landing, fork-bottom-out, mass/tyre/bar changes and previous-run outputs with baseline, and checks every ski topic and challenge remains unchanged.

## First implementation boundary

Asset creation may begin from these contracts once assigned by the parent. Frontend integration starts only after validated assets are ready. If an asset cannot represent an existing control, resolve that contract mismatch before replacing the current renderer; never hide the control or fake an effect to make a preview appear complete.
