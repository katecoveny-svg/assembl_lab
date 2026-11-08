# NVIDIA SimReady assets in this folder

3D models and textures by **NVIDIA**, from [nvidia/simready-assets](https://huggingface.co/datasets/nvidia/simready-assets),
licensed **CC BY 4.0** (https://creativecommons.org/licenses/by/4.0/). We used the web GLB copies made by
[codepawl/simready-glb](https://huggingface.co/datasets/codepawl/simready-glb) (also CC BY 4.0), then changed them for the
browser: parts regrouped, small parts removed, geometry simplified, draw calls joined, textures resized and re-encoded,
meshopt compression (`scripts/simready/pipeline.mjs`). The changes are ours; the models are NVIDIA's.

| File | SimReady asset |
|---|---|
| forklift.glb | vehicle_forklift_blue_c01 |
| orderpicker.glb | vehicle_forklift_red_b01 |
| palletjack.glb | palletJack_lowProfile_a01 |
| rack.glb | rack_large_empty_a01 |
| pallet.glb | pallet_b01 |
| conveyor.glb | conveyor_belt_a05 |
| tote.glb | crate_blue_a08 |
| carton.glb | box_cardboard_b01 |
| dockgate.glb | barrier_gate_safetyDock_a02 |
| railguard.glb | rail_guard_a09 |
| machineguard.glb | machineGuard_a01 |
| cart.glb | cart_computer_a01 |
| printer.glb | computer_printer_barcode_a01 |
| extinguisher.glb | fireExtinguisher_stand_a01 |
| firstaid.glb | safety_firstAidCabinet_wallMounted_a01 |
| tex/floor_*.webp, tex/panel_*.webp | textures from modular_warehouse_h10m_straight_a04 |
| tex/carton_*.webp | textures from box_cardboard_c01 |

Used by the grocery distribution centre twin at /store/dc/, and in part by the dairy plant floor (/dairy/plant/) and the
emergency department floor (/ed/floor/), which all credit NVIDIA SimReady on screen. Their own models are in dairy/ and ed/,
each with its own notice.
