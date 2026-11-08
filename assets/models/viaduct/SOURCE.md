# Viaduct waterfront point cloud: provenance

`viaduct-points.bin` and `viaduct-points.json` are the waterfront in the lab sim "Friday night on the Viaduct" (`/viaduct/`): Viaduct
Harbour, Wynyard Quarter, the wharves and the city centre up to the Sky Tower, as 300,000 points plus 22,402 night lights, baked by
`tools/pointcloud/bake-viaduct.mjs` (`node tools/pointcloud/bake-viaduct.mjs`; Node 18+ and curl, no packages; it reuses
`tools/pointcloud/geo-tiles.mjs`). The JSON header holds the bounds, the landmark anchors, the drawn restaurant's outline, the guests'
walking routes, the counts and the sources. `viaduct/js/map.js` reads it.

| What | Source | Licence |
|---|---|---|
| Terrain (zoom 15, about 3.8 m here) | AWS Terrain Tiles, Terrarium PNGs (`s3.amazonaws.com/elevation-tiles-prod`). In New Zealand their source is LINZ's 8 m DEM. | CC BY 4.0, LINZ |
| Coastline and the marina basin, building footprints and heights, wharves and marina pontoons, pedestrian areas, footpaths, roads and bridges | OpenStreetMap, from OpenFreeMap's vector tiles (OpenMapTiles schema, zoom 14, release `20261101_080013_pt`) | ODbL 1.0, © OpenStreetMap contributors; tiles © OpenMapTiles |
| The Example restaurant (a pavilion and deck) | drawn by the bake script on an open stretch of the basin's southern promenade, where the map has no building | assembl |
| Window lights, street lights and their reflections | placed by the bake script on the map's own building walls (a lattice of floors) and roads; switched on through the evening by the page | assembl |

- **Area:** 174.7505 to 174.7700 E, 36.8372 to 36.8505 S (about 1.74 km by 1.47 km). The map dissolves at its edges into the plum ground.
- **Scale:** true scale, horizontally and vertically (the lab home's Auckland exaggerates heights 5×; this crop does not). Buildings with no
  mapped height or levels get the tiles' default (render_height), 3.5 m at least.
- **The marina basin:** OpenStreetMap maps the Viaduct basin as a body of water inside the coastline (class `lake` in the tiles). Any such
  water that touches the sea is treated as sea; water-to-water edges (the basin's mouth) are not drawn as shoreline.
- **No names:** the bake reads only geometry, classes and heights. No business, venue or place name is read or written. The restaurant is
  fictional and drawn; the page labels it "Example restaurant, drawn". Landmark labels on the page (Viaduct Harbour, Wynyard Quarter,
  Sky Tower) are written by hand, as facts.
- **Walking routes:** a shortest path over a 2 m walkability grid made from the same tiles (footpaths, pedestrian areas, wharves and
  footbridges cheap; other open land dearer; roads dearer still; buildings, the drawn restaurant and the water closed), from Quay Street
  at the foot of Princes Wharf, from Wynyard Quarter across the footbridge, and from the city centre, to the restaurant's door; plus six
  waterfront routes for the Friday crowd. Guests on the page are fictional and simulated.
- **Not used:** Overpass and Geofabrik (unreachable from the build machine), LINZ's own API (needs a key).
- **Built:** see `built` in the JSON header.
