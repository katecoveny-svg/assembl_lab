# Verified Auckland terrain — final local revision

Homepage now loads `linz-terrain.bin`, not the older mixed city asset. The latter remains in the repository for existing consumers; it is not the homepage source.

## What is real

145,087 display points are sampled from the LINZ national LiDAR-derived bare-earth 1 m DEM mosaic, using Cloud Optimised GeoTIFF overviews from sheets BA31 and BA32. Runtime binary: 1,160,696 bytes. Offline sampling is approximately 64 m, with a 16 m detail window around Rangitoto, with bilinear interpolation within each cell for irregular point spacing that avoids moiré. This is a resampled DEM visualisation, not raw LiDAR returns and not 1 m display detail. No buildings, invented tower, or approximate bridge are included.

Source: https://data.linz.govt.nz/layer/121859-new-zealand-lidar-1m-dem/
Public COG/STAC prefix: https://nz-elevation.s3.ap-southeast-2.amazonaws.com/new-zealand/new-zealand/dem_1m/2193/
Licence: CC BY 4.0, Toitū Te Whenua Land Information New Zealand.
Horizontal: NZTM2000 / NZGD2000 (EPSG:2193). Vertical: NZVD2016 (EPSG:7839), verified in LINZ dataset documentation.
Geographic extent: 174.668–174.905 E, 36.762–36.930 S; transformed NZTM bounds and source checksums are in `linz-terrain.json`.
BA31 sheet acquisition envelope: August 2016–June 2024. BA32: August 2016–November 2024. These are sheet-wide envelopes, not a claim that every displayed cell was captured in 2024. Contributing surveys include Auckland North 2016–2018, Auckland South 2016–2017, and Auckland 2024 parts 1/2. Exact per-point acquisition dates are not resolved. Source sheet properties, checksums and survey names are retained in the manifest.

## Presentation and limitations

Heights are exaggerated 5×, explicitly labelled. The original raster sampling accuracy does not carry through to this coarse educational display. Nodata cells are omitted, never filled with invented terrain. Water values are not bathymetry. Negative source elevations remain; visual light is subdued near sea level. Landmark labels anchor to nearby sampled ground, not surveyed entrances or exact summits. No flood, safety or current-condition conclusions.

The existing shared engine, loaders and still renderer are reused. The NZTM/sheet helpers are copied from the existing main-app site-terrain library. Only the offline bake requires geotiff (already installed in the main checkout); no browser GeoTIFF dependency or runtime source-tile downloads are added. Rerun with Node 22 `--experimental-strip-types` and an explicit existing geotiff module path as documented in the bake script. The live source mosaic can change; retained asset checksums identify this bake.

## Verification

Desktop 1440×1000 and phone 375×812 inspected. Irregular sampling fixed the phone grid moiré. Standard Playwright media emulation verified reduced motion, camera buttons, fallback image loading, skipped WebGL in `?poster`, and no horizontal overflow. Result: errors=[], pressed=true, overflow=false, fallback=true, webglSkipped=true. No raw-CDP request was made in this follow-up. Expected static-server `/api/live/` 404 is unrelated to terrain; API code unchanged.

Screenshots remain local in `output/playwright/`: linz-terrain-desktop.png, linz-terrain-mobile-reduced.png, linz-terrain-mobile-fallback.png. Poster is generated from the same new terrain, with tuned point size for image downsampling; it is not pixel-identical to the live view. No physical low-end device timing benchmark. The final asset contains ~145k points; mobile requests at most 80k.

The separate attributed OSM atlas and its corrected fixed-extent frame remain available. No paid services, deployment, push or PR. Deployment audit remains unchanged.

## Water mask and visual refinement

Mapped water is omitted using even-odd containment in the existing OSM/OpenFreeMap vector polygons, fixed release 20261101_080013_pt, zoom 13. No elevation threshold is used to decide land versus water; low-lying land is preserved. Marine areas appear as the dark background, not an invented sea floor. Source attribution and ODbL licence are shown on-page and in the manifest. The derived point dataset and bake recipe are supplied for inspection and reuse under ODbL with underlying LINZ CC BY attribution retained. Coastline and DEM vintages can differ; this is not a surveyed shoreline.

Slope-directed lighting, a lower viewing angle and quieter point sizes improve relief. A Rangitoto camera view uses the finer source-derived samples; its brightness is balanced separately in the overview. All camera modes preserve the same elevations and the labelled 5× vertical exaggeration. Desktop, phone overview and phone cone screenshots inspected after the change. Fallback poster regenerated from the same masked source. No screenshots uploaded to Library.
