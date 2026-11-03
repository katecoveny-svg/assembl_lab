# Earth & Space machine model

`earthspace.glb` is the Earth (with clouds, a tilted axis and a pin on Wellington), the Moon, the Sun and six star types,
used by `study/m/earthspace-scene.js`. `earthspace-hero.jpg` is the Cycles render used for the study card.

Rebuild:

1. Download Natural Earth 1:50m land and lakes (public domain, naturalearthdata.com), e.g. from
   `github.com/nvkelso/natural-earth-vector/geojson/ne_50m_land.geojson` and `ne_50m_lakes.geojson`.
2. `python make_textures.py ne_50m_land.geojson ne_50m_lakes.geojson <texdir>` (numpy + Pillow): Earth colour and
   roughness from the coastlines, with deserts placed where the real ones are; procedural clouds, Moon and Sun.
3. `python build_earthspace.py <texdir> <outdir>` with `bpy` 5.x: builds the scene, exports the GLB, renders the hero
   (`PREVIEW=1` for a fast low-resolution test render).

The surfaces are painted from data and noise, not photographs, and the machine says so.
