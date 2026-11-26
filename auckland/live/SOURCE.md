# Auckland live: sources, licences and limits

`/auckland/live/` shows Auckland's buses, trains and ferries on a 3D city. What each part comes from:

| What | Source | Licence | How fresh |
|---|---|---|---|
| Vehicle positions | Auckland Transport realtime vehicle locations, through assembl's Supabase function `bus-positions` (the AT key stays server-side) | Contains Auckland Transport data, CC BY 4.0 | Live; the page asks every 15 s |
| Late, on time, alerts, next arrivals | AT realtime trip updates and service alerts, plus the AT GTFS API timetable at a stop, through `supabase/functions/at-live` | Same | **Not deployed yet.** Until it is, the page says delays are not connected and colours every vehicle grey |
| Routes, stops, route lines (`data/routes.json`, `stops.json`, `shapes.json`) | AT GTFS static, https://gtfs.at.govt.nz/gtfs.zip, baked by `tools/transit/bake-at.mjs` | CC BY 4.0 (https://at.govt.nz/about-us/at-data-sources/general-transit-feed-specification) | Timetable 12 Nov 2026 to 7 Feb 2027; rebake when AT publishes a new file |
| Streets near a chosen stop | [LINZ NZ Addresses: Roads, layer 123110](https://data.linz.govt.nz/layer/123110-nz-addresses-roads/), queried near that published stop | CC BY 4.0 | Queried on selection; street names are context, not directions or ETA. |
| Ground heights (`data/ground-height.bin`) | AWS Terrain Tiles (Terrarium, zoom 13, about 15 m), whose New Zealand source is the LINZ 8 m DEM; baked by `tools/transit/bake-ground.mjs` on the lab's LINZ terrain box | CC BY 4.0, Toitū Te Whenua LINZ; underlying data © Regional Software Holdings Ltd | Static |
| Ground colours, water, street lights (`data/ground-colour.webp`, `ground-lights.webp`) | OpenStreetMap via OpenFreeMap vector tiles (zoom 14), painted by `tools/transit/paint-ground.py` | ODbL 1.0, © OpenStreetMap contributors; tiles © OpenMapTiles | Static |
| Waterfront ground photography (`data/waterfront-aerial.webp`) | [Auckland 0.075 m Urban Aerial Photos (2024–2025)](https://data.linz.govt.nz/layer/121852-auckland-0075m-urban-aerial-photos-index-tiles-2024-2025/); six RGB COGs from [New Zealand Imagery](https://registry.opendata.aws/nz-imagery/) | Licensed by Auckland Council for re-use under CC BY 4.0; imagery captured by Aerial Surveys Ltd | Static; survey capture range Feb 2024 to Mar 2025. Accessed 25 Nov 2026. See bounds below. |
| Buildings (`data/buildings.bin`) | The same tiles' building outlines and `render_height` | ODbL 1.0 | Static |
| Sky Tower | `auckland/3d/skytower-parts.json` (OSM parts, heights unverified) | ODbL 1.0 | Static |
| Weather chip, cloud in the sky | Open-Meteo via the lab's `/api/live/?feeds=weather` (modelled) | Open-Meteo free tier, non-commercial | Hourly |
| Sun position | Computed in the browser (NOAA formula) for the real time in Auckland | n/a | Live; `?time=HH:MM` sets it for checking, and the page says so |

## Limits, said plainly

- **Delays are never guessed.** A vehicle is grey ("delay not known") unless a fresh AT trip update gives its delay. "On time" is our display band (up to 1 min early or 5 min late), not AT's punctuality measure.
- **Speed units.** AT's feed mixes units: whole numbers (buses) read as km/h, fractions (trains, ferries) as m/s. That is our reading of the data on 23 Nov 2026; the page says "about".
- **Without at-live**, a stop shows vehicles out on its routes by straight-line distance. It is not an arrival time, and the page says so.
- **The 3D area** is the lab's LINZ box (central isthmus, about 21 × 19 km). Vehicles outside it are listed, not drawn.
- **Vehicles** are built in code at typical sizes (12 m bus, three-car 72 m train, 34 m catamaran). No operator liveries or logos.
- **Buildings** use OSM height or levels where mapped, otherwise a 5 m default; courtyards are filled. Low buildings are drawn only within 2.5 km of the city centre, with phones additionally retaining the low buildings immediately around the downtown wharves.
- **Ground** colour is about 5 m a pixel and heights 32 m apart: fine from the air, soft at street level. The water shader varies wave direction, shoreline tint and reflections for presentation only; it does not model tidal depth or safety conditions. Bridges are not modelled; a vehicle over water stays at the ground line.
- `data/sample-positions.json` is a saved copy of a real `bus-positions` answer (23 Nov 2026, 1:10 pm). The page uses it only if the live feed cannot be reached, and labels it "saved sample, not live".

## Waterfront inset

Six EPSG:2193 RGB source tiles (BA32_1000_3503, 3504, 3505, 3603, 3604, 3605) are cropped, downsampled and feathered onto the existing terrain. NZTM bounds: E 1756960–1758400 and N 5920080–5921520. The initial export is 1536 × 1536 (about 0.94 m per pixel). A desktop camera below 620 m range around the waterfront can request a same-extent 3072 × 3072 (about 0.47 m per pixel) WebP; phones and reported constrained connections stay with the lighter map. Rebuild the close-up with `python tools/transit/bake-waterfront-aerial.py`. Neither imagery tier is a façade survey. The STAC items give the survey range, not individual flight dates. Neither vessel shapes visible in the archival photos nor the illustrative buildings are live. The Ferry Building shading references [Heritage New Zealand Listing 102](https://www.heritage.org.nz/list-details/102/Listing) and [Engineering New Zealand](https://www.engineeringnz.org/programmes/heritage/engineering-heritage-records/buildings/auckland-ferry-terminal-building/); no reference-photo pixels are reused on its façades.

## Rebuild

```
curl -sSL -o /tmp/gtfs.zip https://gtfs.at.govt.nz/gtfs.zip && unzip -o /tmp/gtfs.zip -d /tmp/at-gtfs
node tools/transit/bake-at.mjs /tmp/at-gtfs
node tools/transit/bake-ground.mjs /tmp/assembl-tiles && python3 tools/transit/paint-ground.py /tmp/assembl-tiles/ground-draw.json
```

## Optional camera flight

“Fly in” is an optional, cancellable camera move from the current map angle to a composed waterfront view. After choosing a mapped stop or ferry terminal, “Fly to stop” starts at the Waitematā Harbour view and moves to that target. When directly selecting a ferry with a fresh live fix inside the map, “Fly to ferry” aims at the position AT reported when you start the flight. Saved or stale ferry positions never offer this live-ferry flight. It does not move a vehicle marker, change the transit selection, simulate data or change the time of day. Chrome’s mobile view uses the same approach with a shorter duration; reduce-motion moves straight to the destination. The separate camera channels and log-distance approach were inspired by [Makio64’s Cinematic Zoom](https://github.com/Makio64/threejs-cinematic-world-zoom); the local implementation uses a minimal MIT-licensed easing extract from upstream commit [3db19b7](https://github.com/Makio64/threejs-cinematic-world-zoom/blob/3db19b77933ead8241b1fcaf31a5576670f631f3/src/camera/easing.js) (David Ronai, 2026; [full MIT notice](licenses/cinematic-world-zoom-MIT.txt)). It does not import Google tiles, Cesium or the token workflow. The closer view retains approximate building façades and terrain, not a textured scan.

## Ferry Building model

The downtown Ferry Building’s original handcrafted mesh is positioned on the existing mapped OSM long block and tower footprints (ODbL 1.0). [Heritage New Zealand Listing 102](https://www.heritage.org.nz/list-details/102/Listing) and [Engineering New Zealand](https://www.engineeringnz.org/programmes/heritage/engineering-heritage-records/buildings/auckland-ferry-terminal-building/) ground the architecture and materials. Façades, roof profile and clock are approximate, not a measured scan. The time on the model clock is decorative, not a live clock. The small repeating brick and terracotta textures are cropped, mirror-seamed, colour-adjusted and rescaled from [Auckland Ferry Terminal from Harbour, 17 March 2006](https://commons.wikimedia.org/wiki/File:Auckland_Ferry_Terminal_from_Harbour.jpg) by Alexander Klink, [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). [Paora’s 12 December 2025 photo](https://commons.wikimedia.org/wiki/File:Auckland_Ferry_Building_PA02.jpg), CC0, was used only as a visual reference. No city-wide 3D scan was used.

Height check: Auckland Part 1 1 m DSM (2024), NZTM 2000 EPSG:2193, NZVD2016 vertical; [registry object](https://nz-elevation.s3.ap-southeast-2.amazonaws.com/auckland/auckland-part-1_2024/dsm_1m/2193/BA32_10000_0401.tiff), accessed 25 Nov 2026. Sourced from the LINZ Data Service and licensed by Auckland Council for re-use under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), per [LINZ attribution guidance](https://www.linz.govt.nz/products-services/data/licensing-and-using-data/attributing-elevation-or-aerial-imagery-data). Samples in the OSM-aligned local frame: pavement ~3.1 m, eave band ~24.9 m, ridge band ~27.6 m, upper tower ~48.8 m (1 m cells, rounded). Only these summary dimensions inform the mesh; no raster duplicated here. DSM does not provide wall profiles, overhangs or glazing. Keep the RSHL notice above for the separate regional base DEM.
