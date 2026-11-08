# SimReady plan: bringing the Lab's 3D sims up to the grocery DC standard

Kate, 8 Nov 2026: "I want our 3d sims to be this level. Use the nvidia sim ready assets and make our sims quality
quality quality, not basic like we have." The reference was Konstantin Saifoulline's NVIDIA SimReady factory twins:
real equipment, PBR materials, believable light and scale, things that move for a reason, and clear overlays.

The first sim built to that standard is the **grocery distribution centre twin** at `/store/dc/`. This file says what
it established, then how long each other Lab sim would take to reach the same bar.

**The study machines stay exactly as they are, by Kate's decision.** They are not in this plan.

## What the DC twin established

- **Assets.** NVIDIA SimReady models (CC BY 4.0) from the web copies in
  [`codepawl/simready-glb`](https://huggingface.co/datasets/codepawl/simready-glb), derived from
  [`nvidia/simready-assets`](https://huggingface.co/datasets/nvidia/simready-assets). Every sim credits them on screen:
  "3D assets: NVIDIA SimReady (CC BY 4.0)", linked to both datasets.
- **Pipeline** (`scripts/simready/pipeline.mjs`, run with `@gltf-transform/cli` 4 installed somewhere outside the repo):
  it groups the parts that move (forklift mast and carriage, order picker cab, dock gate arm), drops tiny parts nobody
  sees (buttons, pedals, seatbelts), simplifies with meshoptimizer, joins draw calls, shrinks textures to 256–512 px
  WebP and writes meshopt-compressed GLBs. Results for the DC: 15 models, 4.2 MB in all.

  | Model | SimReady source | Triangles before → after | Size |
  |---|---|---|---|
  | Counterbalance forklift | `vehicle_forklift_blue_c01` | 997,893 → 53,144 | 1.1 MB |
  | Order picker | `vehicle_forklift_red_b01` | 872,884 → 51,452 | 0.97 MB |
  | Pallet racking bay | `rack_large_empty_a01` | 44,104 → 7,000 | 258 KB |
  | Roller conveyor | `conveyor_belt_a05` | 228,964 → 14,288 | 374 KB |
  | Hand pallet jack | `palletJack_lowProfile_a01` | 180,737 → 14,985 | 291 KB |
  | Pallet | `pallet_b01` | 2,160 → 756 | 74 KB |
  | Dock safety gate | `barrier_gate_safetyDock_a02` | 74,600 → 5,971 | 91 KB |
  | Tote | `crate_blue_a08` | 48,140 → 6,448 | 81 KB |
  | Others: rail guard, upright guard, computer cart, label printer, extinguisher, first-aid cabinet, carton | | | 0.9 MB |

  Floor, wall-panel and carton textures are SimReady textures too (pulled from `modular_warehouse_h10m_straight_a04`
  and `box_cardboard_c01`). The rack deck heights in `store/dc/layout.js` were measured from the model.
- **Rendering** (three.js 0.170, vendored): PBR materials, image-based light from a room environment, one soft
  shadow-casting key light, GTAO ambient occlusion on capable machines, bloom only on things that emit light (high-bay
  LEDs, skylights, forklift beacons, charger lamps), ACES tone mapping. Repeated things are instanced: 84 racking bays,
  up to 1,100 pallets with their loads, wrap film and labels, 220 totes. Cartons are one box per load whose UVs follow
  its real size, so the SimReady carton texture tiles as a stack of cartons in one draw call.
- **Quality tiers:** high (GTAO, bloom, 2048 shadows, MSAA), mid (bloom, 1024 shadows), low for phones (no post,
  no shadows, pixel ratio 1). The page drops a tier if it cannot hold about 24 fps. `?quality=low|mid|high` forces one.
- **Honest simulation:** a plain agent model (`store/dc/sim.js`, no rendering) drives everything. Every job lasts
  as long as its route over its speed plus handling times, and the same path drives what you see. All figures are
  labelled Simulated and every assumption is listed on the page. It runs a 6-hour shift in under a second in Node,
  so it can be tested headless.
- **Overlays** in the site-v2 look: aubergine panels, ivory text, dusty-rose accents, Instrument Sans and IBM Plex
  Mono labels, no violet, no glass. A guided tour (8 stops, two follow a working vehicle or person), free orbit,
  clickable zone tags, live door tags, path lines (people rose, vehicles ivory), reduced-motion cuts and a paused
  model, a bottom sheet on phones, a progress bar while the models load, and a still image if WebGL will not start.

## The standard, as a checklist

1. Real SimReady equipment for everything a visitor would name (no grey boxes standing in for machines).
2. Under 6 MB of models, lazy-loaded with a progress state; meshopt everywhere; textures at 512 px or less.
3. Under about 1.5 M triangles and 400 draw calls on screen at the overview; instancing for anything repeated.
4. PBR plus environment light, soft shadows, AO where the machine allows, bloom only on real light sources.
5. Motion comes from a model with stated assumptions; every number on screen is labelled and comes from it.
6. Overlays in site-v2 style, a guided tour plus free orbit, reduced motion, phone layout, no-WebGL still.
7. Visible credit to NVIDIA SimReady (CC BY 4.0) on the page and in a `SIMREADY-NOTICE.md` next to the assets.

## The other Lab sims

Times are for one builder, including the asset pass, scene, model hook-up, overlays and checking on a preview.
Most twins already have a working model and figures, so the work is the scene and its link to that model.

| Sim (route) | SimReady assets that fit | Scenes to build | Estimate |
|---|---|---|---|
| **Shared kit** (`assets/twin/3/`) | — | Pull the DC's loader, instancing helper, carton shader, people, tiers, tour and overlay CSS into a versioned stage, so each twin below starts from it | 1 day, first |
| **Supermarket** (`/store/`) | `refrigerator_*`, `facilityEquipment_beverageFridge_display_a01`, `storage_shelf_basic_*`, `food_*` (531 grocery items), `box_*`, `cart_mobile_*`, `sign_wetFloor_*`, `trashCan_*` | Shop floor with gondola aisles, chiller wall, checkouts (made for the page; SimReady has none), back dock fed by the DC's trucks | 2 days |
| **Dairy plant** (`/dairy/`) | `conveyor_belt_a08`/`a47`/`a61`, `pallet_*`, `ibcTank_*`, `drum_steel_*`, `hopper_*`, `pail_*`, the DC forklift and racking | Tanker bay, silo farm and dryer tower (made for the page), packing hall with conveyors and palletising, finished-goods store | 2.5 days |
| **Emergency department** (`/ed/`) | `bed_hospital_standard_*`, `IV_pole_*`, `chair_hospital_*`, `trolley_emergency_a01`, `cart_medical_utility_*`, `screen_hospital_*`, `sign_hospital_*`, `light_surgical_*` | Waiting room, triage, resus and treatment bays. Beds are about 1 M triangles each, so they need the hardest simplification pass. No patients shown, only simple figures | 3 days |
| **Café** (`/cafe/`) | `facilitySystem_kitchenette_module_a01`, `refrigerator_*`, `appliance_dishwasher_a01`, `appliance_extractor_a01`, `furniture_counter_coffeeStation_a01`, `dishware_*`, `kitchenware_*`, `food_beverage_coffeeCup_*` | Dress the existing authored café GLB with SimReady kitchen and counter kit. Keep its rig contract (stage v2) so the twin's numbers stay wired | 1.5 days |
| **Trade yard** (`/retail/`) | The DC's racking, pallets and forklifts, plus `ladder_*`, `handTruck_*`, `storage_toolbox_*`, `scaffold_rolling_steel_*`, `pallet_assembly_*` | Yard racking, drive-through timber store, trade counter, loading bay. Reuses most of the DC kit | 1.5 days |
| **Office** (`/office/`) | `desk_a01`, `chair_office_*`, `computer_monitor_office_a01`, `computer_desktop_tower_a01`, `lamp_ceiling_*`, `blinds_window_*`, `hvac_vent_system_*`, `trashCan_office_*` | Three floors of desks (heavily instanced), meeting rooms, plant room | 2 days |
| **Accommodation** (`/stay/`) | `bedding_a01`, `table_bedside_b01`, `appliance_*`, `trolley_cleaning_*`, `cart_luggage_platform_a01`, `bucket_mop_*` | Rooms, housekeeping trolley runs, reception and luggage | 1.5 days |
| **Home energy** (`/home/`) | `refrigerator_*`, `appliance_dishwasher_a01`, `climate_heater_*`, `electrical_*`, `lamp_ceiling_*` | The house interior's appliances, so each load in the energy model is a real object | 1 day |
| **Energy street** (`/energy/`) | `electrical_*`, `climate_heater_*` | Little fits: the houses and network stay made for the page. Add appliances seen through windows only | 0.5 day |
| **Agent-ready cars** (`/cars/`) | `vehicleSupport_*` (lifts, jacks, dollies), `wheelAssembly_tire_*`, `serviceTool_*`, `testingTool_*` | A workshop scene for the service journey around the existing hero car | 1 day |
| **Trades** (`/trades/`) | `handTool_*`, `powerTool_*`, `ladder_*`, `scaffold_*`, `storage_toolbox_*`, `ppe_*` | A ute and site-shed scene for the measure and price tools (the tools stay 2D) | 1 day |
| **Kitchen machine** (`/kitchen/`) | `food_*`, `kitchenware_*`, `utensil_*`, `appliance_*`, `refrigerator_*` | The week's meals as real food on a bench and in a fridge | 1 day |
| **Food flow** (`/food/`) | The DC and supermarket kits, `food_*` | Shop to plate to bin, reusing the DC and the new supermarket | 1 day |
| **Tourism flows** (`/tourism/`) | Nothing that fits | Map-based; leave as is | – |
| **Study machines** (`/study/`) | – | **Kept as is, by Kate's decision** | – |

Total for everything above: about 21 builder-days, or about a week with three builders after the shared kit lands.

## Progress

- 8 Nov 2026: shared kit (`assets/twin/3/`), the dairy plant floor (`/dairy/plant/`) and the emergency department floor
  (`/ed/floor/`), in one draft PR. Scores against this standard for every twin are in `docs/twins-standard.md`.

## Order

1. Shared kit (needed by everything else).
2. Supermarket and dairy: they sit next to the DC in the grocery and food stories, and reuse the most.
3. ED and café: high-visibility twins with good SimReady coverage.
4. The rest, in any order.

## Things to keep in mind

- **Licence:** CC BY 4.0 lets us copy, change and use the models commercially, with credit. Keep the on-screen credit
  and a `SIMREADY-NOTICE.md` beside every asset folder. NVIDIA is the author, codepawl made the web copies.
- **Repo size:** commit only processed models (a few MB a sim). Never commit raw SimReady files; the raw forklift
  alone is 7.8 MB as a web copy and 400+ MB as OpenUSD.
- **Honesty:** a SimReady model is real equipment, not a real site. Scenes stay fictional and labelled Example, and
  every figure stays Simulated unless a live source feeds it (then the maturity ladder in `lab/maturity.json` applies).
- **People:** SimReady has no people. The DC uses plain figures in hi-vis made for the page; never a likeness.
- **Performance:** measure on a real mid laptop and a phone before calling a sim done. Headless Chromium on a build
  machine renders in software, so its frame rate is only a rough floor.
