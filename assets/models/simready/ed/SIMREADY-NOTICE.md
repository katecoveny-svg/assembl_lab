# NVIDIA SimReady assets in this folder

3D models and textures by **NVIDIA**, from [nvidia/simready-assets](https://huggingface.co/datasets/nvidia/simready-assets),
licensed **CC BY 4.0** (https://creativecommons.org/licenses/by/4.0/). We used the web GLB copies made by
[codepawl/simready-glb](https://huggingface.co/datasets/codepawl/simready-glb) (also CC BY 4.0), then changed them for the
browser: parts regrouped, small parts removed, geometry simplified (the beds, monitors and IV poles very hard: about a
million triangles each in the source), draw calls joined, textures resized and re-encoded, meshopt compression
(`scripts/simready/pipeline.mjs`, the `ed` entries). The changes are ours; the models are NVIDIA's.

| File | SimReady asset |
|---|---|
| bed.glb | bed_hospital_standard_a01 |
| curtain.glb | screen_hospital_b01 |
| monitor.glb | monitor_patient_a01 |
| ivpole.glb | IV_pole_a01 |
| sofa.glb | sofa_visitor_a01 |
| desk.glb | desk_a01 |
| stool.glb | stool_mobile_padded_vinyl_a01 |
| crashcart.glb | trolley_emergency_a01 |
| surgicallight.glb | light_surgical_ceiling_mobile_a01 |
| wheelchair.glb | wheelChair_c01 |

Used by the emergency department floor at /ed/floor/, which credits NVIDIA SimReady on screen. That page also uses the
extinguisher and the floor texture from the folder above; their notice is ../SIMREADY-NOTICE.md.
