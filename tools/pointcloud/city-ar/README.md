# Auckland city AR — local review

Unpublished prototype on review/auckland-city-ar. Shared `auckland/3d/city-model.js` supplies browser and native exporter; native model clips the same terrain triangles to the CBD and copies building vertex arrays unchanged. Uniform XYZ scale only, vertical exaggeration 1. Wider harbour remains in browser.

## Geometry and honesty

1,191 original features: 121 OSM tagged heights (unverified), 408 levels × 3m estimates, 662 unknown-height flat footprints. The model is simplified massing, not a survey or complete city. Building ground elevations use coarse LINZ terrain sampled at centroids; unresolved fine ground/roof accuracy remains.

Sky Tower was absent because the original importer selected closed building ways, whereas its principal object is relation 19745928. Existing licensed OSM XML also contains building parts: 16 explicitly height/min_height-tagged parts are now represented, including a tagged pyramidal roof; nine unsupported skillion or height-unknown parts are omitted. Maximum tagged height 328m is unverified. No external commercial/noncommercial model or invented interior was imported. The separate source extract records tags and geographic rings; projected `skytower-parts.json` is the browser/export input. https://www.openstreetmap.org/relation/19745928

## Scale

EPSG:2193 projected metres, NZVD2016 (EPSG:7839). Exact bounds, WGS84 corners, source provenance, geometry parity and ground-reference formula are in `city-ar-manifest.json`. Crop is about 1806.932 × 1667.128 real metres, presented 0.70 × 0.64584 metres, scale approximately 1:2581.331. Whole presentation including base measures 0.720 × 0.163925 × 0.713340 metres (XYZ). Native apps may let users resize uniformly. Presentation base and water backdrop are not geographic elevations/bathymetry.

## Reproduction and checks

Serve repo on loopback. Open `/tools/pointcloud/city-ar/export.html`; `window.exportCity()` produces base64 GLB/USDZ and manifest using vendored Three exporters, no dependencies installed. Save to `auckland/3d/auckland-city.{glb,usdz}` and `city-ar-manifest.json`, then:

```
node --experimental-strip-types tools/pointcloud/city-ar/finalize.mjs
/usr/bin/usdchecker --arkit auckland/3d/auckland-city.usdz
```

`review.html` loads actual exported GLB for visual inspection. Final checks: 26,215 triangles; finite positions; valid buffer ranges; uniform core scale; all four geometry parity groups identical; USDZ stored entries aligned to 64 bytes, Y up/metres. GLB 3,838,108 bytes; USDZ 8,702,715 bytes. Apple validator reports Success (system duplicate-plugin registration diagnostics also printed). Not a full Khronos validator. Actual GLB desktop rendering inspected, eight draw calls. Browser Sky Tower view inspected at 320px, no horizontal overflow. Earlier synthetic HTTPS browser check verified same-phone Quick Look and Scene Viewer targets; local HTTP correctly disables launch while downloads remain available. Physical iPhone/Android placement, camera permission and native materials are NOT tested. Native AR does not include browser selectors/quiz controls.

## Accurate future heights: bounded research, no replacement yet

Central Auckland / Sky Tower lies in Auckland Part1 2024 NIWE, not Part2. Official dataset: https://portal.opentopography.org/datasetMetadata?otCollectionID=OT.042025.2193.1 . Captured April–June 2024; classes 2 ground and 6 building, EPSG2193/NZVD2016, CC BY 4.0. The report's clear-ground RMS 0.035m / 95% 0.069m does not describe roof, derived mesh or AR accuracy.

Sky Tower tile: `CL2_BA32_2024_1000_3603.laz`, 5,056,994 points, 28,103,005 bytes. URL https://opentopography.s3.sdsc.edu/pc-bulk/NZ24_Auckland/CL2_BA32_2024_1000_3603.laz . HEAD supports byte ranges; only an 8KiB LAS header was read. Ordinary LAZ byte-range support alone does not establish spatial random access. Official tile-index ZIP is 626,255 bytes; `cbd-tiles.json` records 20 bounding-rectangle candidate tiles. No point classification processing performed.

Matching LINZ Part1 DSM COG: https://nz-elevation.s3.ap-southeast-2.amazonaws.com/auckland/auckland-part-1_2024/dsm_1m/2193/BA32_10000_0401.tiff . Verified HTTP206 for 8KiB range, total 43,235,618 bytes. Corresponding DEM path replaces `/dsm_1m/` with `/dem_1m/` (HEAD200). Source STAC and candidate metadata retained. No DSM/DEM pixel windows processed, no new measured building heights asserted. Next step is bounded COG windows and class6/ground validation against footprint parts; avoid conflating DSM maxima with verified roof height.

## Attribution

LINZ CC BY 4.0; © OpenStreetMap contributors, ODbL. Copyright in the underlying dataset from which this work has been derived is owned by Regional Software Holdings Ltd (RSHL). Attribution appears on the model plaque and page. Existing vendor Three modules retain their MIT notices.

No Google calls, new services, publication, large survey downloads, deletion or changes to `/nz-world/`.
