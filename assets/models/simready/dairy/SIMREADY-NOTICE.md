# NVIDIA SimReady assets in this folder

3D models and textures by **NVIDIA**, from [nvidia/simready-assets](https://huggingface.co/datasets/nvidia/simready-assets),
licensed **CC BY 4.0** (https://creativecommons.org/licenses/by/4.0/). We used the web GLB copies made by
[codepawl/simready-glb](https://huggingface.co/datasets/codepawl/simready-glb) (also CC BY 4.0), then changed them for the
browser: parts regrouped, small parts removed, geometry simplified, draw calls joined, textures resized and re-encoded,
meshopt compression (`scripts/simready/pipeline.mjs`, the `dairy` entries). The changes are ours; the models are NVIDIA's.

| File | SimReady asset |
|---|---|
| beltconveyor.glb | conveyor_belt_a08 |
| ibc.glb | ibcTank_steel_stainless_a01 |
| bench.glb | table_metal_stainless_a03 |

Used by the dairy plant floor at /dairy/plant/, which credits NVIDIA SimReady on screen. That page also uses the grocery
DC's SimReady models in the folder above (forklift, pallet, rack, conveyor, printer, rail and machine guards,
extinguisher, first-aid cabinet and the floor and wall textures); their notice is ../SIMREADY-NOTICE.md.
