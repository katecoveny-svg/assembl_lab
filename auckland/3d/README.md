# Auckland tabletop — local prototype

Branch: prototype/auckland-tabletop-ar. Base: e2ce89b3aaf4a0add2ddce9fd306291a03ecf127. Not published; existing homepage and atlas remain untouched.

This is an additive change bundle for assembl_lab at the base commit above, not a standalone site. It reuses that repository’s vendored Three.js, Auckland atlas texture and source datasets. Unzip over that checkout.

Serve the repository root with `python3 -m http.server 4174`, then open http://localhost:4174/auckland/3d/. Drag to orbit, scroll/pinch to zoom, use Harbour/Rangitoto/From above or Reset. Rendering is event-driven with no automatic motion. Static poster and model downloads remain available without WebGL. `?poster` tests that path.

## Actual data and scale

Uses the existing attributed LINZ bare-earth sample asset and OSM atlas texture/water polygons, not replacement geometry. See linked terrain provenance and map sources on the page. LINZ CC BY 4.0; OSM-derived data ODbL 1.0. This distribution retains the underlying source asset and map-data provenance. Data dates vary by survey; manifest dataDate is the sample asset generation date, not the survey date.

Ground is interpolated from up to four existing samples within 110 m, on an approximately 112 m grid. Water is masked by mapped polygons; it is not inferred from height. Coastline is therefore discretised; this is not original LiDAR resolution. No building heights or bathymetry are modeled. Presentation plinth and flat water are explicitly illustrative surfaces. Educational only, not survey, navigation, flood or hazard assessment.

Map width 0.70 m, depth 0.620833 m, horizontal scale 1:30,720. Heights exaggerated 5× (vertical scale 1:6,144), NZVD2016. Model units metres, Y up; north towards the back of the board. Presentation base is wider than the map. Embedded plaque carries attribution and scale into native AR.

## AR

USDZ uses Safari Quick Look; GLB uses Android Scene Viewer intent with a browser fallback. Native AR shows the static model: browser lesson text and view controls do not travel with it. Links require a phone-accessible HTTPS host and compatible device/services. They are intentionally disabled on localhost, with downloads available. Initial scale is locked where supported; platform behaviour needs device testing. No paid service, new credentials or Google Maps API is used. Android Scene Viewer is a native Google viewer, not a Google geographic-data source.

Actual iPhone/iPad and Android placement, physical dimensions, material appearance and device performance remain untested. No public HTTPS AR preview has been deployed.

## Export and validation

Existing vendored Three.js MIT GLTFExporter and USDZExporter are reused, without new dependencies. Run `node --experimental-strip-types tools/pointcloud/build-tabletop.mjs`, serve the root and open `tools/pointcloud/tabletop/export.html`; `window.exportTerrain()` produces GLB/USDZ base64. Save decoded files, then run `python3 tools/pointcloud/tabletop/fix-usdz.py auckland/3d/auckland-tabletop.usdz`. The latter corrects two exporter USD shader socket types and preserves uncompressed 64-byte ZIP alignment.

Apple `/usr/bin/usdchecker --arkit` reports Success. GLB v2 header, buffer-view bounds, mesh counts and rendering checked; USDZ unit/up-axis, storage and alignment checked. This is not a full Khronos glTF-validator run. `validation.json` records exact bytes and SHA-256. 37,316 total triangles; GLB 3,208,408 bytes; USDZ 6,166,880 bytes. Budgets: GLB <5 MiB, USDZ <10 MiB, <50,000 triangles.

Desktop and 375 px phone rendering visually inspected; 320 px reduced-motion layout has no horizontal overflow. Named views/reset and static fallback checked with standard Playwright APIs. Synthetic HTTPS routing checks AR link construction only; it does not emulate native AR. Browser 3D relies on existing vendored Three.js and the same typography as Lab.
