# Bike apparatus · Blender source and integration

Generic teaching construction for `/study/m/bike.html`, authored in Blender 5.1.1 and delivered 29 October 2026. The revised v2 asset retains the approved cream/lilac/mint palette, curved front chain wrap and ordinary-mesh rendering support. FLOW, DROP and RIDGE configure one assembly, with separate rider and schematic suspension components.

## Source provenance

Reproducible source (`bike_atelier.py`, `geometry.py`, `assembl_pastel.py`, `pose_blender.py`, `render_views.py`, `export_browser.py`), editable scene, source geometry fixtures and validation reports are preserved in the complete Library delivery. Fixture code is not imported by the lesson.

| Item | Library identity (version 1) |
|---|---|
| Complete source ZIP | `libfile_c21a680402d881918c7bda4af22d05f5` |
| Editable Blender scene | `libfile_0abee5fca1088191a5e5ec80ea44232b` |
| Web GLB | `libfile_09502b0538608191b441f59423b0958c` |
| Hero render | `libfile_2111094ff30c8191872e311d4ea54666` |
| Dedicated card | `libfile_7ec31f8e48048191bde090d62f476522` |

`assembl-bike-atelier-web.glb` is **2,345,060 bytes**, SHA-256 `80f731558e185c2322719535d4549f74c1c309f68d0633c7d4325ed17a3f6aa5`. All selectable alternatives total 99,528 triangles, 151 mesh/material primitives, 138 contracted rig nodes and 289 total nodes. A selected assembly uses fewer triangles and draw calls. There are 14 materials and no source textures.

The GLB, rig contract and pose map are exact copies. Controller and batching imports were changed from bare `three` to the repository's vendored Three r170 module; their algorithms are unchanged. Geometry, materials and transforms were not edited. Hero and dedicated catalogue card are JPEG derivatives of actual offline renders, resized to 1600 px at quality 85 using `sips`, with no crop. The catalogue explicitly labels the image as a Blender render.

## Integration

- The original lesson remains the only scientific state owner. Its `geoPts` and `riderPts` supply geometry; drafting anchors convert **once** as `(x*.025, -y*.025, 0)`. The metre-authored GLB is not scaled by .025. The existing stopping-view enlargement remains 1.5×.
- Wheel rotation reads `-dist/.375`, `-sx/.375`, `-gspin` or zero. Fork and shock endpoints, build choices, accessories, tag angle and rotor heat cue follow the original state. Plate/tag textures use the original sanitized strings.
- The chain coasts: no cadence/torque model. Construction offsets and contact positions are illustration checks, not collision physics or manufacturing validation. The suspension demo is enlarged 1.6× and uses explicitly schematic exploded spacing; its motion reuses the existing visual time and respects the existing reduced-motion flag.
- One full bike is visible per topic; the garage selector shows either the bike or the separate cutaway. Previous-run comparisons remain graphs. Portrait trail/stopping cameras follow the rider; full distance, force and energy diagrams remain below. Crowded duplicate 3D charts/labels are hidden on phone widths. Ski geometry and scientific code remain unchanged.
- The batching adapter chooses capability before attachment. `WEBGL_multi_draw` uses compact batches; otherwise configured ordinary meshes render. Partial batching allocation rolls back to ordinary meshes. Integration enables shadows on batches and updates absolute poses before initial rendering.
- The standard path costs materially more calls. Asset-only reference counts (12–14 versus 87–135) exclude the lesson/forest. Actual integrated measurements and limits are in the [review record](../../../study/review/bike/README.md). `?bike-renderer=standard` exercises the standard path; `?debug` exposes bounded frame/renderer counters in the canvas dataset.
- Pending loads abort on exit; late results and owned geometry/materials are disposed. Readiness requires a successful first pose and render. Failure restores the original live SVG lesson. Graphics changes carry the complete experiment in a one-use session transfer, including nested ski state, pause, previous runs and saved build.

The source SVG helmet-camera illustration remains available in simplified graphics. The live forest view retains its existing third-person camera. Generic AR export is disabled because this multi-station teaching scene is not validated for AR. Browser reflections differ from Cycles. No physical phone, Safari or manufacturing validation is claimed.
