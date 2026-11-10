# Café sky transport and enclosure — 11 November 2026

Local review candidate. This improves spatial lighting; the café remains below the user's photoreal reference. No deployment or physical-device AR validation is implied.

## Changed experience

- An inward-facing ceiling closes the eye-level interior. The overhead cutaway remains visible from above, while the ceiling still blocks sunlight. Its height follows the existing 3.1 m walls and 0.15 m floor; this is a fictional fit-out assumption, not a verified construction dimension.
- Blender Cycles bakes diffuse sky transport for the floor, ceiling, two side walls, kitchen back wall and two counter faces. Direct sunlight is excluded from the bake and remains driven by the simulator's Auckland clock and weather.
- Seven lossless WebP RGBM maps add **2,081,976 bytes**. Packing verifies every decoded byte against the linear RGBM input. GPU upload uses no sRGB decoding, premultiplication or mip generation.
- The missing floor strip beneath/in front of the counter uses the existing Wood041 finish and 3 m UV scale. Wood041 remains generic lime wood, not verified oak.
- Nine downward spotlights line up with the authored pendants, replacing four broad point lights that created orange pools on the ceiling and wall. This is an appearance model, not a lux-compliant lighting design.
- Rain stops at the ceiling above the enclosed floor. Business weather effects are unchanged.
- Cloud reduces sunlight energy without fading the ceiling's opaque shadow. This removes direct-light leakage and the speckled floor shadows it caused under overcast conditions.

The state model, stock rig, operating modes, cameras and evidence labels remain intact. The existing GLB and original `cafe.blend` are read-only inputs. The two extra browser meshes add four triangles.

## Reproduce

Use Blender 5.1.1 and the existing Node dependencies (sharp). Set `CAFE_DAYLIGHT_OUT` to an absolute evidence folder outside the source directory:

```sh
blender --background --python-exit-code 1 --python assets/models/cafe/source/bake_daylight.py
blender --background --factory-startup --python-exit-code 1 --python assets/models/cafe/source/denoise_daylight.py
node assets/models/cafe/source/pack_daylight.mjs "$CAFE_DAYLIGHT_OUT"
node --test cafe/tests/*.test.mjs
```

The first step preserves linear EXR masters and a packed editable `cafe-daylight.blend`. The second uses OpenImageDenoise on lighting only. The third writes browser maps and source/file hashes to `assets/models/cafe/daylight/manifest.json`.

## Verification and limits

23 tests pass, including the unchanged simulation golden baseline, GLB rig, ceiling ray direction/cutaway behaviour, physical floor bounds and bake-source/map hashes. Desktop noon, 22:00 restaurant mode, overview and 375 × 812 layouts were inspected. The narrow layout measured 375 px document width with no horizontal overflow. No browser console errors were observed. Viewport emulation does not establish phone performance.

A five-second local browser scheduling sample at 1280 × 720, DPR 2, document visibility `visible` recorded 300 requestAnimationFrame intervals, median 16.7 ms and p95 16.8 ms. This is browser scheduling evidence, not GPU timings or a physical-phone benchmark.

Evidence is in the task's `outputs/scene-upgrade/cafe-daylight/`: browser captures, raw/denoised maps, packed Blender study and logs. The Blender image is a sky-only transport study with dynamic stock and table objects hidden for baking, not a final café hero render.

At dusk, sky transport fades into the previous live indirect-light approximation. A practical-light bounce bake and spatial reflection probes remain open. Furniture/stock are excluded from fixed shadows so operating changes do not leave stale baked silhouettes. Rebake if fixed geometry or material reflectance changes. Shader lighting is browser-only: prepared AR files retain their existing snapshot and do not include this pass.

The supplied [Carine Moreira reference](https://www.behance.net/gallery/211935453/CGI-COFFEE-SHOP) was inspected directly. Its equipment, layered displays, glazing, shelving and close-up materials establish the higher remaining target; the author also identifies AI enhancement on some food close-ups. Reference imagery has not been incorporated or treated as asset permission.

Next: richer equipment/countertop objects, menu-matched food, furnishing detail and reflected light. Homepage vegetation/material work remains a separate unfinished part of the active task.
