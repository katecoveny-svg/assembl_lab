# Vinyl apparatus · original Blender source

Generic, unbranded teaching geometry by the Assembl Blender asset task, delivered 29 October 2026. The softer pastel deck and speaker use cream, blush, mint, powder blue and lilac, with dark vinyl/rubber and metal accents. Source authoring used Blender 5.1.1. The learning route is `/study/m/vinyl.html`.

## Reproducible source and provenance

The authoritative source family is in the original source archive: `vinyl_atelier.py`, `geometry.py`, `assembl_pastel.py`, `export_browser.py`, `render_views.py`, `HANDOFF.md`, the editable `.blend`, seven renders and browser proof. These source records are retained in the project archive.


The repo GLB and pure pose controller are byte-for-byte copies of that delivery. The contract's four source paths were made repository-relative; its source hashes describe the pre-integration inputs. No geometry, rig values, material colours or transforms were edited.

`assembl-vinyl-atelier-web.glb`: **3,488,316 bytes**, SHA-256 `4946dcb27e96fa0bbdc8c4e80c579f9ca226ccddafa3d88aed458513b3aae490`. 65,256 triangles; 79 mesh/material primitives; 53 contracted named rig nodes, 132 total GLB nodes; 13 materials; two shared 1024 px textures.

The local hero and `study/thumbnails/vinyl.jpg` are JPEG derivatives of the actual offline renders, resized to 1600 px width at quality 85 using macOS `sips`, with no crop. The catalogue labels the thumbnail as an offline Blender render. Browser PBR reflections and the tiny stylus-tip material differ from Cycles.

## Integration contract

- Asset coordinates remain metres, glTF +Y up. The lesson applies **2.2 / 0.146 = 15.0684931506849 scene units/metre once** to each reparented assembly.
- Deck placement remains the existing `gT` offset `(-1,0,0)`. Speaker hero placement is replaced by the existing air-zone location; it is not added twice.
- `vinyl-asset.js` maps the original model angle, radius and slowed phase to absolute rig poses. The circle-intersection visual placement is unchanged. The stylus origin is the contact tip; actual record top is 0.0614 m. Motion is illustrative, not contact mechanics or manufacturing validation.
- The platter and motor read the original angle; speaker excursion reads the original phase/amplitude. No additional physics, timer, audio generation or inertia calculation lives in the rig.
- Cutaways hide covers only. The belt's fixed 6.8 visual ratio is not a torque/slip solver. The speaker magnet label uses the fixed authoring location `(0.008, 1.25/K, 0)` inside `SPEAKER_CABINET`; no fabricated moving magnet is added.
- Existing analytic groove, keyboard, air particles, dust/vectors, decibel scale and format bars remain frontend apparatus. One zone is visible at a time, including Test yourself.
- GPU resources owned by the asset and lesson apparatus are disposed on failure/exit; pending fetches are aborted. Live readiness requires a successful first pose and actual render.

See local QA record (not published) for tests, screenshots and limits. The generic AR export is disabled because the multi-scale teaching apparatus has not been validated as an AR scene.
