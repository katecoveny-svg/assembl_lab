# Café material sources

ambientCG (Lennart Demes), CC0 1.0, https://docs.ambientcg.com/license/ . Retrieved 10 November 2026.

- Wood041: https://ambientcg.com/view?id=Wood041 — lime-wood surface used as generic pale timber, not verified oak. Colour, OpenGL normal and roughness.
- Fabric041: https://ambientcg.com/view?id=Fabric041 — normal and roughness only, authored colour retained.
- Terrazzo019L: https://ambientcg.com/view?id=Terrazzo019L — colour, OpenGL normal and roughness; re-encoded from the assembl asset library. Roughness extracted from the packed G channel.

The original downloaded Wood041/Fabric041 archive checksums are in sources.json (which also records Fabric030; Fabric030 is not included here).

Plant source (`../source/potted-plant-cc0.glb`): Poly Haven potted_plant_02, https://polyhaven.com/a/potted_plant_02 , CC0. Decoded from the homepage's existing licensed model, simplified to reduce triangles, textures re-encoded to PNG for Blender. Generic supporting plant, not identified as a New Zealand native.

Behance and the supplied video are references only; no media or models were copied from them.

Food scan (`../source/muffin-master.glb`, `muffin-browser.glb`): ambientCG **3DCake001**, Lennart Demes, https://ambientcg.com/view?id=3DCake001 , CC0 1.0. Asset and licence rechecked 10 November 2026. The master retains all 49,861 source triangles with 2K maps. The browser candidate has 13,373 triangles and 1K colour, normal and occlusion maps. The same mesh is reused in the eight muffin stock slots at an illustrative 100 mm width. No supplier or NZ origin is asserted. Original source archive and derived hashes are recorded in `../source/muffin-source.json`; `prepare-food.mjs` records the conversion.

Countertop scans: ambientCG **3DCookie001** and **3DPastry001**, https://ambientcg.com/view?id=3DCookie001 and https://ambientcg.com/view?id=3DPastry001, CC0 1.0 (https://docs.ambientcg.com/license/), checked 11 November 2026. Separate 2K masters retain 50,000 / 49,999 source triangles. 1K browser derivatives retain 13,282 / 11,751 triangles with colour, normal and occlusion maps, reused across five cookies and two pastries. They are architectural display props, not changes to the simulated menu or stock. Original archives and all derivative hashes are in `../source/counter-scans-source.json`. Cups, pitchers, jar, platter and machine refinements are original assembl generic geometry; no manufacturer product is claimed.
