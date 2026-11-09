# Arrival Rush — local review, 9 November 2026

## Scope and provenance

Baseline: `10636b51fd7f3bd72f0ac42b5b0e052fd4944d12` from verified `origin/main` of `katecoveny-svg/assembl_lab`. Isolated branch `prototype/arrival-rush`. Opt-in route `/stay/?arrival`; original `/stay/` retains its analytical UI, lodge/motel/park choices, authority descriptions and local CSV behaviour. No shared stage, AR, Maps, Study, Auckland or main Assembl files changed. No publication in this handoff.

Inspected DESIGN.md, STAGE.md, existing accommodation engine and scene. No AGENTS.md found in this checkout/task tree. The only checkout skill concerns Study teardown and is outside this scope. The 3d-experience-brief skill informed this review structure, not permission to publish.

The venue is the existing procedural exterior maquette, with pitched roofs, verandas, room-state thresholds/windows, trees, car parks, guests and housekeeping trolleys. It is **not** an authored detailed GLB, building scan, furnished hotel interior or measured property. Arrival-specific furniture adds a timber reception counter, screen, signage and luggage bench at the existing reception position. Room geometry, guest paths and cleaning schedules are unchanged. Annual booking envelopes and commission jar are hidden only in this mode.

## Experience and actual consequences

A fictional 12-room Nelson lodge, 24 January 2026, deliberately selected as the baseline model's longest reception wait. This is a disclosed stress day, not typical trading or a prediction. All four plans retain the same five arrival parties, arrival times and assigned rooms. The original ACCOM engine remains byte-identical, including embedded benchmark data and CSV parsing/privacy functions.

| Plan | Longest desk wait | Rooms late for arrival | Estimated monthly tool cost |
|---|---:|---:|---:|
| Personal welcome | 43.4666 minutes | 0 | NZ$0 |
| Pre-arrival details | 41.9666 minutes | 0 | NZ$79 |
| Self check-in | 0 minutes | 0 | NZ$120 |
| Both tools | 0 minutes | 0 | NZ$199 |

Two of five parties use self check-in when enabled. The lesson is that ready rooms do not guarantee a quick welcome, and combining tools need not improve the selected afternoon. The long wait follows an unusually long check-in from the existing service-time distribution. This one-day result cannot establish annual savings or a product recommendation. Costs exclude setup, hardware and support.

Watch/pause, seek 1–6pm, jump to outcome, reset/replay, and a compact camera selector expose the same scene state. Time scrubber has human-readable aria-valuetext. Operational labels are concise; the explanatory placard hides on closer views. No sign-in, guest data or integration is added.

## Sources and integration boundaries

Embedded MBIE ADP slice covers September 2024–August 2026; model year September 2025–August 2026. Snapshot records retrieval 23 October 2026 and modification 19 October 2026. Source: https://teic.mbie.govt.nz/assets/adp/ADP_All_Measures.csv. This task audited the embedded provenance, not the latest remote release. Monthly occupancy calibrates booking demand; it is not a live arrival feed. Suppressed cells retain the engine's estimated flags.

Future Maps seam (documentation only): an optional adult-supplied journey context `{source, fetchedAt, travelSeconds, freshUntil}` could be displayed separately from authored arrival times. Validate non-negative finite duration and timestamp freshness; absent/stale input must leave this deterministic scenario unchanged. No guest identity, tracking, Google client/key, paid call or UI is implemented. Any Google map remains an attributed Google viewer and must never enter this scene or AR export.

## Verification actually performed

- `node --test stay/tests/*.test.mjs`: **9 passing**. Core/data byte identity against baseline; selected stress day; common booking cohort; costs and meaningful consequences; repeated deterministic comparisons; minute-by-minute finite counts; empty arrivals; suppressed benchmark flags; full outcome within stated time window; opt-in/privacy/AR contract checks.
- `node --check` for new JavaScript and every executable inline script (import-map JSON excluded); `git diff --check`.
- Browser: baseline 43.5-minute outcome; self 0 / NZ$120; both 0 / NZ$199; play, pause, replay then reset; keyboard Return on outcome and Space on plan buttons; scrub to 2:20pm shows one party waiting and zero rooms cleaning; reception camera shows corresponding guests.
- System light/dark crossed with absent, explicit light and explicit dark `data-theme`: sampled foreground/background contrast minimum 4.6:1 light, 7.26:1 dark. These are the explicit theme states used by page CSS, not a claim to have added a preference persistence mechanism. No forced-white surfaces. Heading uses solid inherited ink in this world.
- 375px and 320px: document width equals viewport, no horizontal overflow. Reduced-motion transition duration 0s. Fresh load does not autoplay. Screenshot desktop 1440px and mobile 375px.
- Original `/stay/`: original heading and all three property modes present, no Arrival controls, local-upload privacy text present, no console errors observed.
- `/stay/?arrival&still`: poster, disabled animation/camera, no AR entry; self-check-in comparison and outcome still work. Actual unavailable-WebGL hardware was **not** reproduced (browser CDP new-document override unsupported). The same adapter branch also handles `stage.ok === false`; hardware fallback remains a separate test.
- No error console entries observed in interactive prototype.

## AR inspected, not physically tested

Existing `/ar/embed.js` exporter reused without edits. `unitsPerMetre:1`, tabletop scale, QR disabled, 90k triangle ceiling. Export pauses the scenario and uses current plan/time; no claim that controls transfer into Quick Look/WebXR.

Final inspected files: Downloads/`arrival-rush-illustrative (1).glb` and `(1).usdz`.
- GLB 820,656 bytes; 44 meshes, two images; 10,792 triangles reported by exporter.
- Flattened exported accessor bounds: min (-0.19, 0, -0.17014925), max (0.19, 0.05201315, 0.17014925) metres. Largest dimension 0.38m; ground minimum Y=0. No residual node transform.
- USDZ 2,443,945 bytes, 47 archive entries; archive integrity passed.
- Export report is based on the static 1pm snapshot, not every possible minute or device.
- Intended coverage: supported iPhone/iPad Quick Look and Android Chrome WebXR over HTTPS. No physical-phone placement, tracking, scale retention or device performance test was run. Desktop native placement is not promised.

## Evidence and review gate

Local evidence directory: `/Users/kateharland/Documents/Codex/2026-11-09/task-14/arrival-evidence/` — desktop-light.jpg, desktop-dark.jpg, mobile-light.jpg, mobile-dark.jpg, reception.jpg, contrast.json, export.json. Exports remain outside the repository; no private assets uploaded.

This is a useful focused prototype over the real model, not the final exceptional architectural visual. The inherited maquette remains simplified and light-mode materials are pale. Independent review should assess venue/readability, whether the disclosed outlier is the right teaching case, and native AR on actual phones. Refresh current main and preserve concurrent work before any integration/publication. No production release has been attempted.

## Local review corrections — 9 November 2026

Independent review corrections are scoped to the opt-in adapter. Reception camera now uses position (6, 13, 18), target (-5, 1, 10.4), clearing the foreground tree from the desk and queue without changing geometry or paths. Original /stay/ camera is unchanged.

A persistent outcome-adjacent statement reads “Selected stress day, not typical trading or annual ROI.” Completed self-check-in outcomes explicitly say all rooms were ready for their arrivals, 2 of 5 parties use self check-in, and housekeeping is unchanged. These are results for the selected model day, not commercial recommendations.

Rechecked 9 model/regression tests, adapter syntax and whitespace checks. Browser inspection confirmed the clear reception view at 2:20pm and completed self-check-in facts. Corrected evidence: reception-revised-light.jpg and reception-revised-dark.jpg (1440px wide); outcome-revised-mobile-light.jpg and outcome-revised-mobile-dark.jpg (375px wide, reduced-motion emulation). These supersede reception.jpg. Previously recorded full theme-matrix, keyboard, original-route and static export checks remain applicable; these corrections do not modify the engine, geometry or exporter. Physical-device AR remains untested.

Refetched origin/main: still 10636b51fd7f3bd72f0ac42b5b0e052fd4944d12, already the prototype baseline; no concurrent changes to integrate. Publication is explicitly blocked pending specific stay-feature approval: the parent reports approval review denied publication because earlier permission covered First Shift only. No push or deployment was attempted for these corrections.
