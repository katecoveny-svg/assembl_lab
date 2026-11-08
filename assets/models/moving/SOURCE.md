# Moving house point cloud: provenance

`moving-points.bin` and `moving-points.json` are the map in the Moving house sim (`/moving/`): the inner isthmus of Tāmaki Makaurau
Auckland as 292,000 points, from Sandringham to Ellerslie and Royal Oak, plus three street-level crops. They are baked by
`tools/pointcloud/bake-moving.mjs` (`node tools/pointcloud/bake-moving.mjs`; Node 18+ and curl, no packages; it reuses
`tools/pointcloud/geo-tiles.mjs`). The JSON header holds the bounds, the layers, the streets, the generic business locations,
the published rents and the sources. `moving/scene.js` reads it; `moving/journey.js` reads the rents from it.

| What | Source | Licence |
|---|---|---|
| Terrain (zoom 13, about 15 m) | AWS Terrain Tiles, Terrarium PNGs (`s3.amazonaws.com/elevation-tiles-prod`). In New Zealand their source is LINZ's 8 m DEM. | CC BY 4.0, LINZ |
| Roads, building footprints and heights, coastline and lakes | OpenStreetMap, from OpenFreeMap's vector tiles (OpenMapTiles schema, zoom 14) | ODbL 1.0, © OpenStreetMap contributors; tiles © OpenMapTiles |
| Which area each street is in (code and name only) | Stats NZ Statistical Area 2 2019 boundaries (generalised), queried by point from Eagle Technology's public ArcGIS layer | CC BY 4.0, Stats NZ |
| Median weekly rents | Tenancy Services (MBIE) rental bond data, detailed quarterly file by SA2 (2019), newest quarter in the file (starting 1 April 2026, so April to June 2026): median rent of new bonds, all dwelling types and bedroom counts | CC BY 3.0 NZ, credit MBIE |

Rents baked on 8 November 2026:

| Street in the sim | SA2 area | Median weekly rent | New bonds in the quarter |
|---|---|---|---|
| Calgary Street, Sandringham (the flat being left) | Sandringham East (138200) | $570 | 15 |
| Lonsdale Street, Ellerslie (shortlist 1) | Ellerslie Central (143300) | $650 | 33 |
| Haydn Avenue, Royal Oak (shortlist 2, used when "Make it go wrong" is on) | Royal Oak East (Auckland) (143400) | $600 | 39 |

These are small areas with few bonds a quarter, so the medians move a lot from one quarter to the next (Ellerslie Central was
$740 the quarter before). The page says which quarter and links the source.

- **Privacy:** the streets are ordinary residential streets. They are shown as whole blocks (a ring about 240 m across, and the
  houses within 70 m of the street lit together), never one house. House numbers in the tiles (`housenumber` layer) are never
  read, and no place or point-of-interest name is read: the only names matched are the three street names, to find their lines.
  The page draws its own "Example house, drawn" floating over the new street, not on any real lot.
- **Businesses:** the property manager, movers, power retailer and internet provider stand at generic locations chosen by hand
  in commercial and industrial parts of the isthmus (`places` in the header). They are not any business's site, and no business
  is named, read from the tiles or modelled.
- **Scale:** horizontal positions and footprints are true to scale. Terrain is exaggerated 5× (as on the lab home's map) and
  buildings 3×, so the cones read from above and a house stays a low box beside its street. The page says so in its credits.
- **Layers and order:** layer 0 is the city (196,000 points), layers 1 to 3 the three street crops (32,000 each, a 330 m radius
  dissolving at the rim). Points are written in one weighted random order, so a phone reads only the first 80,000-odd (an HTTP
  Range request) and still gets a fair sample of every layer.
- **Not used:** Overpass and Geofabrik (unreachable from the build machine), LINZ's own API (needs a key), the Tenancy Services
  market rent API (needs a key; the open quarterly file carries the same bond medians).
- **Power figures** are not baked: the page reads the lab's feeds (`/feeds.js`: `power`, the Electricity Authority EMI wholesale
  price, and `tariffs`, MBIE's Quarterly Survey of Domestic Electricity Prices) and falls back to a snapshot built into
  `moving/journey.js`.
- **Stills:** `moving/still.webp` and `moving/still-sm.webp` (the first paint and the no-WebGL picture) are rendered from the page
  itself by `moving/render-stills.cjs`.
