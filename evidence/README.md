# NZ public evidence layer

Local review branch `codex/nz-public-evidence`, based on fetched main `f09eacdc52f7f8e9dedb232991ec570292f984b1`. Only `evidence/` is changed. No publish, push, deployment, other worker file edits, accounts or paid APIs.

## Contracts

Import `validateRecord`, `freshness`, `describe` from `/evidence/records.mjs`; fetch `/evidence/data/snapshot.json`. Schema v1 records include source URL/endpoint, licence URL/name, attribution, observedAt (nullable), observationBasis, retrievedAt, scope, units, classification, maxAgeMs and value. Freshness is computed at render time, not stored as a permanently fresh assertion. `live` means origin is a live source: a saved file is always labelled “live source / saved snapshot”. `published benchmark` is the contract category for published reference material; directory UI explicitly says “published reference / directory sample”, not statistical benchmark. Estimates/simulated inputs must retain their own classification; derived model results must not inherit live classification.

Five-minute GeoNet and one-day directory TTLs are application retrieval policies, not provider update guarantees. Missing/invalid inputs cannot be used. Stale inputs should be visibly marked and require an explicit historical-use decision. Event origin time is not retrieval time. School resource last-modified is not an observation date for an individual institution.

`node evidence/refresh.mjs` (Node 20+) performs four bounded public GETs, validates before atomic replacement, and records URL/time/SHA-256 receipts. Failed refresh leaves the previous file unchanged: its original retrieval time will age normally. This is manual refresh, not a scheduled service. No browser API keys or private credentials. Future authenticated adapters belong server-side. No silent mock fallback.

## Source and licence verification — 9 November 2026

- https://api.geonet.org.nz/ documents the quake endpoint, versioned Accept header, units and quality. https://www.geonet.org.nz/policy declares CC BY 3.0 NZ and the attribution/disclaimer. Existing `nz-world/data.mjs` parser reused verbatim from NZ World checkout commit `683bbcd`; it is vendored here because NZ World is not on current main. Strict wrapper rejects malformed rows and excludes provider-deleted events. Consolidate parser imports when NZ World is separately approved; do not import its entire branch.
- https://www.educationcounts.govt.nz/directories/school-directory-api identifies resource `4b292323-9fcc-41f8-814b-3c7b19cf14b3` and API schema. CKAN package `c1923d33-e781-46c9-9ea1-d9b850082be4` returned `license_id: CC-BY-4.0`. Resource last_modified: `2026-11-08T18:45:32.802845`. Adapter gates licence and resource membership on every refresh. Only five API-returned institution identities/type/region/status included. Sample is neither representative nor complete. No contacts, ethnicity, student counts, eligibility, occupancy or patient information.
- Latest snapshot: 19 valid/non-deleted earthquake events plus five schools, retrieved 2026-11-09 around 08:24 UTC; exact times and response hashes in snapshot receipts. One deleted quake excluded from original 20-item parser output.
- EA/MBIE/Stats NZ not ingested in this batch; no claims of connected feeds for them. Fuel and all other worker integrations untouched.

## Verification / safe handoff

`node --test evidence/tests/*.test.mjs` passes provenance, stale/missing/future/invalid timestamps, schema-change rejection, empty feed and classification checks. `git diff --check` passes. Local browser loaded records and source filter returned five school cards. Desktop visual inspected; mobile-specific testing remains outstanding.

Parent can review/cherry-pick this one local commit onto a fresh main branch, rerun tests/refresh, then review `/evidence/` preview before any separately authorised publication. Do not push unrelated pending branches or retry the denied Arrival Rush publication. Consumers may adopt these imports independently; no simulation inputs elsewhere have been silently changed.
