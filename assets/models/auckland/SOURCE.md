# Auckland point cloud: provenance

`auckland-points.bin` and `auckland-points.json` are the lab home's hero: Tāmaki Makaurau Auckland as 300,000 points, baked by
`tools/pointcloud/bake-auckland.mjs` (`node tools/pointcloud/bake-auckland.mjs`; Node 18+ and curl, no packages). The JSON header
holds the bounds, the vertical exaggeration, the landmark anchors, the twin sites and the sources. `lab/pc/auckland.js` reads it.

| What | Source | Licence |
|---|---|---|
| Terrain (zoom 13, about 15 m; zoom 15, about 3.8 m, on eight volcanic cones for their craters and rims) | AWS Terrain Tiles, Terrarium PNGs (`s3.amazonaws.com/elevation-tiles-prod`). In New Zealand their source is LINZ's 8 m DEM. | CC BY 4.0, LINZ |
| Coastline, lakes, building footprints and heights | OpenStreetMap, from OpenFreeMap's vector tiles (OpenMapTiles schema, zoom 14) | ODbL 1.0, © OpenStreetMap contributors; tiles © OpenMapTiles |
| Kinds of place, to choose twin sites | the same tiles' `poi` layer: category and position only, never a name | ODbL 1.0 |
| Sky Tower and Harbour Bridge shapes | modelled from their published dimensions (approximate) at their real positions: the tower's legs, shaft, pod (about 182–226 m) and mast to 328 m; the bridge's approach spans, through-truss, clip-ons and piers on its OpenStreetMap line | assembl |

- **Scale:** horizontal positions and footprints are true to scale. Heights are exaggerated 5× (terrain and buildings alike); the
  page says so. The Sky Tower is drawn 5× in all directions so its shape reads at map scale.
- **Budget:** 300,000 points, spent where the camera looks (the city centre and the harbour); the sea and the far suburbs are
  thinned. Buildings are outlines and vertical corners, few surface points, so towers read one by one. Buildings with no mapped height or levels get the tiles' default (about 5 m; 4 m minimum here).
- **Twin sites:** each twin with a real-world kind (car yard, supermarket, ED, café, trade yard, stay, office) is placed on a real
  site of that kind, chosen by category near a named part of the city. The header keeps only the twin id and coordinates. The
  page labels each one "Example, not a model of this site". Home and kitchen are not pinned: they would point at someone's house.
  The supermarket site also carries the delivery sim (one numbered pin, two links). Two sims sit on fixed spots given to the bake
  (`FIXED_SITES`), not buildings found by kind: the moving-house sim's street (the middle of a residential street in Ellerslie,
  no house) and the Viaduct sim's drawn restaurant (a spot on the open promenade, no building). They are marked `fixed` in the
  header and get a plot ring only.
- **Not used:** LINZ's own API (needs a key), Overpass (unreachable from the build machine). Overture Maps would also work for
  buildings; OpenFreeMap was used because it carries the coastline, buildings and categories in one set of tiles.
- **Built:** see `built` in the JSON header and the tile release in its `sources`.
