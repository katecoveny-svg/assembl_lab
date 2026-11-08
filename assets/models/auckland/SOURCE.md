# Auckland point cloud: provenance

`auckland-points.bin` and `auckland-points.json` are the lab home's hero: Tāmaki Makaurau Auckland as 300,000 points, baked by
`tools/pointcloud/bake-auckland.mjs` (`node tools/pointcloud/bake-auckland.mjs`; Node 18+ and curl, no packages). The JSON header
holds the bounds, the vertical exaggeration, the landmark anchors, the twin sites and the sources. `lab/pc/auckland.js` reads it.

| What | Source | Licence |
|---|---|---|
| Terrain (zoom 13, about 15 m) | AWS Terrain Tiles, Terrarium PNGs (`s3.amazonaws.com/elevation-tiles-prod`). In New Zealand their source is LINZ's 8 m DEM. | CC BY 4.0, LINZ |
| Coastline, lakes, building footprints and heights | OpenStreetMap, from OpenFreeMap's vector tiles (OpenMapTiles schema, zoom 14) | ODbL 1.0, © OpenStreetMap contributors; tiles © OpenMapTiles |
| Kinds of place, to choose twin sites | the same tiles' `poi` layer: category and position only, never a name | ODbL 1.0 |
| Harbour Bridge rise and truss | drawn for scale on the bridge's OpenStreetMap line | assembl |

- **Scale:** horizontal positions and footprints are true to scale. Heights are exaggerated 5× (terrain and buildings alike); the
  page says so. Buildings with no mapped height or levels get the tiles' default (about 5 m; 4 m minimum here).
- **Twin sites:** each twin with a real-world kind (car yard, supermarket, ED, café, trade yard, stay, office) is placed on a real
  site of that kind, chosen by category near a named part of the city. The header keeps only the twin id and coordinates. The
  page labels each one "Example, not a model of this site". Home and kitchen are not pinned: they would point at someone's house.
- **Not used:** LINZ's own API (needs a key), Overpass (unreachable from the build machine). Overture Maps would also work for
  buildings; OpenFreeMap was used because it carries the coastline, buildings and categories in one set of tiles.
- **Built:** see `built` in the JSON header and the tile release in its `sources`.
