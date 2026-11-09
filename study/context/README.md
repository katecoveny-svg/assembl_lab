# Contextual weather panel — manual and synthetic data

Release route: `/study/m/energy.html#flask`. The reviewed increment is approved for the existing production workflow; the live Weather connection remains disabled. It adds no API key, Google call, server resource, billing change, map or native AR asset.

## Ranked candidates

| Rank | API / lesson | Educational use | Decision |
|---|---|---|---|
| 1 | Weather / Energy, Keep it warm | Contrast outdoor context with the fixed 18°C classroom assumption; reason about initial heat transfer and source/time uncertainty | Implemented a local, reusable panel with manual entry and synthetic fixtures. Live adapter disabled. |
| 2 | Maps JavaScript + Routes / Fly-over geography | Compare straight-line distance, map scale and a travel route at a named public location | Later, only with a defined distance question and supported server contract. No map is needed for the selected cooling task. Existing LINZ terrain and AR exports remain independent. |
| 3 | Weather / Air Quality / Climate environmental discussion | Distinguish modelled environmental conditions from observations, and short-term weather from climate | Later, after country/field coverage and attribution review. Air quality must not be treated as stream-water quality or a model of īnanga habitat. No health recommendations. |
| 4 | Existing Places / geography or civic field trips | Identify public landmarks as evidence sources | Optional discovery context; listings are not verified accessibility, provider consent or current availability. Reuse the owner's server, never duplicate credentials. |

## Contract audit — no credentials read

Read-only inspection of the nominated `auckland-match/server` source found `handleAPI(request, env={}, fetcher=fetch)`, routes `/api/connections`, `/api/places/search`, `/api/places/details`, and configuration names `GOOGLE_PLACES_API_KEY` / `PLACES_API_ENABLED`. No Weather/current-conditions route appeared in that checkout at audit time. The other task's files, environment and configuration were not changed. No key values were read or copied and no live Places request was made.

Study Lab already has `/api/live/?feeds=weather&place=...`, backed by Open-Meteo rather than Google. Its own source warns that the keyless tier is non-commercial. This increment does not silently select that service or assume its usage rights have been verified.

## Proposed shared contract — not an existing endpoint

`GET /api/context/weather?city=auckland` is a **proposed same-origin contract**, not a claim that the route exists. Accepted city IDs: `auckland`, `wellington`, `christchurch`, `dunedin`. The shared server owner should resolve those fixed public reference locations; do not accept client coordinates, addresses, student names or arbitrary URLs.

Successful body: `schema: "ContextWeatherV1"`, `city`, `kind: "current" | "forecast"`, `provider: "google-weather"`, `temperatureC` (number), `validAt` (RFC3339), `receivedAt` (RFC3339 server retrieval time), optional `issuedAt` (RFC3339 or null), `attributions` (required non-empty text array preserving applicable upstream attribution). All unknown fields are discarded by the client validator.

For Google current conditions, `currentTime` is the time associated with returned data: map it to `validAt`, not a fabricated observation or forecast-issue time. The API does not establish a separate issue timestamp in that response; leave `issuedAt` null and display “not provided”. A future forecast adapter must use the forecast validity time and preserve its forecast type. No upstream mapping or server endpoint is implemented here.

The client adapter remains `enabled:false`, `endpoint:null`, `serverCapsVerified:false`. It has no query-string/local-storage switch. Before activation, the shared owner must agree the contract, confirm permitted Weather access/coverage, existing server-only credentials, public terms/privacy requirements, attribution, request restrictions and server-enforced per-client/global limits. Do not enable it merely by changing the client flag. No separate credential or Google project is proposed.

## Cost, data and privacy boundaries

- Zero automatic requests: no polling, prefetch, city-search autocomplete or retry. The default disabled adapter performs zero fetches even if invoked directly.
- A future enabled adapter permits at most two explicit requests per page, at least 60 seconds apart, with an 8-second timeout. These are **client safeguards, not a billing hard cap**. Server enforcement is still required. The reported $300 credits are not verified as a hard spending limit.
- Requests send only a fixed city ID, omit cookies and use `cache:no-store`. No persistent/local/session storage, analytics payload or data export is added. Old values are cleared on city change, failed request and page exit; Google-display memory expires after five minutes without refetching.
- Manual entries are visibly unverified. Fixture values and relative timestamps are explicitly synthetic, never attributed to Google. A current-type example is not a live observation. Past forecasts and current values older than one hour are labelled distinctly.
- No GPS, address, name or precise location input. Device-timezone manual input is displayed with an explicit Pacific/Auckland timezone. No panel value changes the existing heating/cooling solver.
- Google content, if later connected, stays in the separate source-labelled panel. It is not baked into GLB/USDZ, QR files, downloadable terrain, Places-derived geometry or another map. Existing 33 native exports are unchanged.

## Attribution and terms review

Google Weather policy reviewed 9 November 2026: [Weather policies](https://developers.google.com/maps/documentation/weather/policies), [current-conditions reference](https://developers.google.com/maps/documentation/weather/reference/rest/v1/currentConditions/lookup), [FAQ](https://developers.google.com/maps/documentation/weather/faq). Current conditions are processed/modelled information and not necessarily a station reading. No Google content was fetched for this panel.

The future renderer keeps attribution inside the same bordered data block, includes the Weather-specific source wording and preserves supplied third-party text. Its compact Google Maps text styling uses the permitted sans-serif fallback, correct capitalization, nowrap and translate=no. An activated integration still requires the shared owner's full display/terms review, including logo preference, required public policies and service-specific storage permissions; this work does not assert blanket caching or export rights. No cached Google responses are included in fixtures or tests (protocol tests use invented data).

## Files and verification

`weather.mjs`: pure schema/freshness/manual/fixture helpers and disabled-by-default bounded adapter. `panel.mjs` + `panel.css`: reusable source-labelled UI. `energy.mjs`: only mounts in the cooling topic; the Energy hook dispatches a topic event and does not change physics. Existing native launchers and shared kit are untouched.

Run the full repository Node command from the science release: **222/222 passing**, including six contextual-data tests. `study/tests/context-browser.mjs` is a Playwright CLI run-code expression for the local server; create `output/playwright/context` first. Browser verification covers all fixture states, manual source/time, keyboard/reduced-motion, phone overflow, topic visibility, model-state equality, page-exit clearing and zero Weather/GPS calls. Phone and desktop screenshots were inspected. Physical native phone QA remains untested and is unrelated to this local data-panel increment.
