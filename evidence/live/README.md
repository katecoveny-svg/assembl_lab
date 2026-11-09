# GeoNet context in actual tools

Routes: `/study/m/shaky/` and `/auckland/3d/`. Both use the same independent `geonet-context` component. Model engines and existing controls are unchanged. National observations are context for comparison, never local hazard/occupancy measurements or simulation outputs.

Manual public GET to `https://api.geonet.org.nz/quake?MMI=3`, versioned Accept, 12-second timeout, max 100 provider features validated then existing parser's max 20 recent records, deleted records excluded. Three newest shown. No geolocation, keys, persistence, scheduled jobs or automatic network polling. Minimum one minute between attempts. Visibility change aborts pending work and stops the display clock; late results cannot commit. Five-minute retrieval freshness is separate from event time. Error preserves only an explicitly labelled previous successful in-memory response, never saved mock data. Empty valid response is not interpreted as no seismic activity.

Reuses `/evidence/adapters/index.mjs` and the existing NZ World parser. Official API and GeoNet CC BY 3.0 NZ policy rechecked 9 November 2026. Node live fetch at 08:40 UTC returned 19 non-deleted records. Browser fetch inside Shaky Isles succeeded as well.

`node --test evidence/tests/*.test.mjs`: parser/HTTP/quality changes, deleted events, overlapping requests, cooldown, cancellation, late responses, missing data, stale retrieval, previous-response error labelling, source contract. All 11 pass.

## Sector increment and boundaries

`../sector-sources.json` is a source registry, not an ingested data feed. LCDB6 metadata and CC BY4 commercial reuse were verified on its official page; latest mapped epoch is summer 2023/24. No polygons downloaded. Current S-map listings are NC-ND and excluded. NZTA direct page returned 403; CSV/licence remain unverified and no fleet values are included. Building Code Schedule 1 is separately identified from AS/VM; MBIE's AS/VM copyright restricts redistribution, so link-only pending document/version/rights checks.

No agriculture/LiDAR farming route was found among current Lab main's HTML routes. The separate main-site checkout contains a legacy `iot-agri-satellite` handler with a no-key hardcoded demo response. Its handler has no visible authentication/ownership check and accepts polygon creation; `legacy-vite/src/components/kete/LiveDataTiles.tsx` consumes NDVI without preserving `demo`. This integration is bypassed entirely, not repaired or activated here. An owner should audit gateway JWT configuration, per-user polygon ownership and logging before any keyed invocation. No main-site files changed.

Freight/Customs, Household, Study Energy weather, matching and Audience/RAG remain with their owners. No EA feed or blanket business-dashboard connection claimed.
