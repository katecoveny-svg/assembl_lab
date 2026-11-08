# Current terrain revision

See [TERRAIN.md](TERRAIN.md) for the final terrain-only implementation, verified sources and completed fallback/reduced-motion QA. It supersedes the mixed-cloud and fallback limitations in the earlier implementation notes below.

# Auckland learning atlas — local review

Base: `katecoveny-svg/assembl_lab`, main commit `54594220352bc2853007c9949c9ed64ed2351654` (8 November 2026). Isolated local clone, branch `improve/auckland-learning-map`. No shared checkout edits, push, PR, deployment, credentials or paid APIs.

## Implementation

Reuses `tools/pointcloud/geo-tiles.mjs` (the existing Auckland point-cloud MVT decoder), existing geographic extent and site-v2 Instrument Sans / IBM Plex Mono palette. Adds `/auckland/` with fixed open-data atlas, three learning prompts, seven landmark stops, pan, bounded zoom, keyboard controls, layers, static fallback and sources. The homepage retains and refines the existing Auckland point-cloud engine: a framed harbour view, city-detail and overhead controls, calmer settled points, smaller sway, three landmark labels, 80k/180k mobile/desktop point budgets and a 1.5 device-pixel-ratio cap. The architecture hall motion is restored using the existing Plan Studio model. Reduced motion renders settled frames, with scroll/resize repositioning. Existing geographic and hall posters remain the WebGL/script fallback; the Auckland poster retains the previous visual tuning, so its transition is not pixel-identical. The separate learning map is linked from the navigation and cloud controls. All individual Three.js twins and shared stage assets are unchanged.

Reviewed `assets/twin/1/stage.js` and main app `lib/site-terrain/linz.ts`, `flow.ts`, and terrain component paths. The stage is a good existing 3D extension point. The main app LINZ reader already supports small georeferenced DEM extracts; its React/GeoTIFF stack is not duplicated into this static map. No elevation/flood surface is claimed here.

## Data and repeatability

`node tools/pointcloud/bake-learning-map.mjs` uses Node + curl, downloads 42 tiles sequentially with an identifying User-Agent and local cache (3 MB raw tiles). The manifest records the actual dated OpenFreeMap release, extent, layer path counts, build time and URL template. The download remains below OpenFreeMap's documented 3,000-tile / 50 MB offline limits. Cache is ignored, not published. The SVG is the inspectable derived geographic asset and is downloadable in the UI.

Source: OpenStreetMap via OpenFreeMap/OpenMapTiles, release `20261101_080013_pt`, zoom 13; https://openfreemap.org/ and https://www.openstreetmap.org/copyright. ODbL 1.0: https://opendatacommons.org/licenses/odbl/1-0/. Keep attribution on all map exports and views. Parks include mapped grass, wood/forest and selected recreational land uses; this is not a complete public-access inventory. Small footprint rings under 1.5 square map units are omitted. Other geometry vertices under 0.5 map units are simplified. Some merged polygon features contain many rings; manifest feature counts are path counts, not building counts. The map covers the central Auckland extent, not the entire Auckland Council region.

Coordinates: Web Mercator at Auckland latitude, north-up. Approximate scale only. Seven curated landmark coordinates identify areas/landmarks, not surveyed entrance locations. Prompts are authored educational observations, not historical, travel, hazard or planning determinations. The atlas has no Google content, height estimates, arbitrary buildings or claimed live data. The existing homepage point cloud does contain estimated building heights, height exaggeration ×5, and approximate tower/bridge geometry (tower also widened ×5); these limitations are explicitly labelled.

## Deployment / side effects — HOLD

`STAGE.md` records Vercel auto-deployment on main. `vercel.json` has existing serverless API functions and host redirects; package.json has no build script or dependencies, and no `.github` directory exists in this repo. This atlas requires static hosting only and has no Supabase calls. Local preview: `python3 -m http.server 4173`, then http://localhost:4173/auckland/ .

Read-only account audit: Vercel project `assembl-lab` (`prj_uVHs2NqkpS8Rm5gdtj3pBC0TLCV3`) links the distinct `assembl_lab` repo. Team integrations showed Upstash/Sanity, no Supabase integration. GitHub repository hooks and current-commit checks were empty. Supabase `assembl-prod` GitHub branching is linked to `katecoveny-svg/assemblnz-f0afd79d`, not `assembl_lab`; the locked-in project had no GitHub connection. Neither displayed a Vercel integration. No current Supabase preview trigger was found for this Lab repo. This is a point-in-time audit, not a guarantee against future integration changes or hosting/bandwidth costs. Main auto-deploys through Vercel; a push/PR can still create Vercel builds/previews. Keep publication on hold for explicit approval. Nothing was pushed or deployed.

## Google opportunities (not enabled)

- Maps/Places: optional on-demand place discovery and current place details. Billing and restricted credentials are required; costs depend on SKU, fields requested and request volume. Request only needed fields and use quotas/budget alerts; alerts alone are not hard cost caps. Places data has storage/display restrictions and Google attribution. Do not merge unrestricted-looking copies into this OSM asset. https://developers.google.com/maps/documentation/places/web-service/usage-and-billing and https://developers.google.com/maps/documentation/places/web-service/policies
- Photorealistic 3D Tiles: an optional separate visual view with Google and returned data attribution. Requires billing and API activation. Do not extract terrain, measurements, point clouds or derived geometry. Keep LINZ/open licensed data for educational models. https://developers.google.com/maps/documentation/tile/3d-tiles and https://developers.google.com/maps/documentation/tile/policies
- This version needs neither service. The existing LINZ open-data terrain reader is the preferred future terrain integration after verifying survey metadata and learning scope.

## Durable lesson

Keep geographic source geometry, rendering style and educational scenarios separate. Build one inspectable, attributed static extract for the actual area; reuse it for the homepage poster and interactive view. Never infer occupancy, safe routes or flood likelihood from footprints or a decorative terrain renderer.

## Verification evidence

- `node --check auckland/map.js`, `node --check tools/pointcloud/bake-learning-map.mjs`, `git diff --check`: passed.
- SVG XML parsing, required layer groups, 42-tile manifest and geographic viewBox: passed.
- Chromium at 1440×1000 and 375×812: screenshot inspection; no horizontal overflow.
- Explicit browser assertions: zoom changes viewBox; selecting Maungawhau updates content; Buildings checkbox hides the layer; Home restores the extent. Returned `errors: []` and `overflow: false`.
- Aborted SVG request: readable fallback message, WebP loaded, zoom controls disabled. Passed.
- Corrected issues found during visual checks: small labels, mobile collisions, zero-sized resize division, mobile hero order and desktop tag overlap.
- Local static server cannot execute the existing homepage `/api/live/` function (404 expected); no API code changed. Earlier browser log includes the deliberately aborted SVG and the resize error before its fix; final control run had no page errors.
- Screenshots live in the task workspace `output/playwright/`: `live-before.png`, `atlas-desktop-full.png`, `atlas-mobile.png`, `atlas-interaction.png`, `atlas-fallback.png`, `home-desktop.png`, `home-mobile.png`, `home-mobile-map.png`.
- Performance: preview WebP 217 KiB; geographic SVG about 5.0 MB uncompressed / 1.54 MB gzip. The atlas has no continuous animation, third-party map requests, WebGL or runtime tile decoding. The homepage retains its Three.js motion with reduced point budgets and visibility suspension. Fonts retain the site's existing Google Fonts delivery. Static hosting should enable compression. No low-end physical-device timing benchmark was performed.

## Motion and framing follow-up

- Desktop 1440×1000 and phone 375×812 cloud screenshots inspected in browser output. City detail selected and visibly changed framing. Phone overflow check returned false.
- Architecture chapter rendered live hall and callouts; final hall scale reduced slightly to keep it away from text (that final small scale adjustment was not recaptured).
- Reduced-motion media emulation produced the settled homepage screenshot; source stops continuous frames in this mode.
- Atlas screenshots at desktop and phone confirm the fixed 1200:1063 geographic aspect ratio eliminates blank letterboxing.
- Fixed a phone scroll-restoration alignment issue found during visual QA.
- Browser connection became unavailable during a new fallback-poster export. The attempted export was discarded; the existing original geographic poster is retained. The new `?poster` path skips WebGL but could not be visually recaptured after the disconnect. Existing atlas failure fallback was tested previously.
- No new screenshot Library uploads were made during this follow-up, as requested. Updated QA screenshots are in the tool outputs.
