# Supermarket order to doorstep: map provenance

`delivery-points.bin` and `delivery-points.json` are the map of the lab's "Supermarket order to doorstep" sim (`/delivery/`):
about 7.4 km of Auckland's eastern suburbs around the supermarket twin's example site, as 297,000 points, plus the van's route.
Baked by `tools/pointcloud/bake-delivery.mjs` (`node tools/pointcloud/bake-delivery.mjs`; Node 18+ and curl, no packages), with
the tile readers in `tools/pointcloud/geo-tiles.mjs`. The JSON header holds the bounds, the store and household anchors, the
route, the sources and the build date. `delivery/delivery.js` reads it.

| What | Source | Licence |
|---|---|---|
| Terrain (zoom 14, about 7.6 m) | AWS Terrain Tiles, Terrarium PNGs (`s3.amazonaws.com/elevation-tiles-prod`). In New Zealand their source is LINZ's 8 m DEM. | CC BY 4.0, LINZ |
| Streets, rail, coastline, lakes, building footprints and heights | OpenStreetMap, from OpenFreeMap's vector tiles (OpenMapTiles schema, zoom 14) | ODbL 1.0, © OpenStreetMap contributors; tiles © OpenMapTiles |
| The store site | the lab home's supermarket twin pin, `assets/models/auckland/auckland-points.json` → `sites.store` (coordinates only) | as above |
| The households and the route | drawn by the bake on the street graph above | assembl |

Credit line on the page: "Elevation: LINZ (CC BY 4.0) via AWS Terrain Tiles. Map data © OpenStreetMap contributors, via OpenFreeMap."

- **No names.** The bake decodes only geometry, road and building classes and heights. It never reads a name, a house number or a
  point of interest, and it refuses to write a header with a `name` field in it. The page labels the store "Supermarket twin ·
  Example, not a model of this site" and names no business.
- **The households are fictional.** Each is a point part-way along a real local street (OpenMapTiles class `minor`), 0.9 to 3.1 km
  from the store, spread around it. It is never a house and never an address. The header keeps only a letter, the anchor, the
  distance and the compass direction from the store.
- **The route is illustrative.** The shortest drive over the street graph (no motorways, no car parks or service lanes) from the
  store through all six in the best of the 720 orders and back. It ignores one-way rules and turn restrictions.
- **Scale.** Horizontal positions and footprints are true to scale; heights are exaggerated 3× (terrain and buildings alike). On the
  page the van and the households are drawn larger than life so they can be seen.
- **Not used.** Overpass and Geofabrik (unreachable from the build machine), LINZ's own API (needs a key).
- **Still.** `delivery/still.webp` (first paint and the picture without WebGL) is rendered from the page itself by
  `delivery/still.cjs`.
