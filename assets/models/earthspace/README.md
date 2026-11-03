# Earth & Space machine model

`earthspace.glb` is the Earth (with clouds, a tilted axis and a pin on Wellington), the Moon, the Sun and six star types,
used by `study/m/earthspace-scene.js`. `earthspace-hero.jpg` is the Cycles render used for the study card.

Rebuild:

1. Download Natural Earth 1:50m land and lakes (public domain, naturalearthdata.com), e.g. from
   `github.com/nvkelso/natural-earth-vector/geojson/ne_50m_land.geojson` and `ne_50m_lakes.geojson`.
2. `python make_textures.py ne_50m_land.geojson ne_50m_lakes.geojson <texdir>` (numpy + Pillow): Earth colour and
   roughness from the coastlines, with deserts placed where the real ones are; procedural clouds, Moon and Sun.
3. Photo-real Earth: download NASA Blue Marble and Black Marble (public domain) as equirectangular images, e.g. the copies in
   `github.com/vasturiano/three-globe/example/img/earth-blue-marble.jpg` and `earth-night.jpg`, then
   `python make_nasa_textures.py earth-blue-marble.jpg earth-night.jpg <texdir>`. This replaces the painted `earth.jpg`
   and adds `earth-lights.jpg` (city lights, shown on the night side only).
4. `python build_earthspace.py <texdir> <outdir>` with `bpy` 5.x: builds the scene, exports the GLB, renders the hero
   (`PREVIEW=1` for a fast low-resolution test render).

The Earth and its city lights are NASA imagery; the clouds, Moon and Sun are generated, and the machine says so.
