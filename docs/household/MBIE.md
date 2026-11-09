# National fuel baseline — 9 November 2026

The published panel is deliberately unavailable. No dataset values or dates have been guessed. No station fields are populated and no visitor fetches occur. Google remains unrelated and disconnected.

Source: https://www.mbie.govt.nz/building-and-energy/energy-and-natural-resources/energy-statistics-and-modelling/energy-statistics/weekly-fuel-price-monitoring
Licence: https://creativecommons.org/licenses/by/4.0/
Attribution: Ministry of Business, Innovation and Employment (MBIE).

The indexed official page confirms previous-week national averages, CC BY 4.0 and a May 2025 format change. Direct page and dictionary retrieval returned HTTP 403. The indexed page date is not a price observation. No current CSV schema, unit/series mapping or dataset-level attribution has been verified; productionContract therefore remains null. Do not enable it from synthetic tests. The older indexed dictionary URL also returned 403: https://www.mbie.govt.nz/dmsdocument/139-weekely-fuel-price-monitoring-data-dictionary-pdf

Reuse review: Assembl lib/do/fuel/watch.ts separates dated national observations from station observations; that distinction is retained. Its fill/wait recommendations are not transplanted. The existing nz-fuel-prices edge function scrapes loose HTML price patterns, falls back to hardcoded figures, and can substitute fetch date for price date. None of that fetching or fallback code is reused.

scripts/household/mbie.mjs is a build-time adapter foundation, tested against a clearly synthetic CSV contract, not a claim that it parses the unverified current MBIE CSV. It validates exact headers, chosen grade and series, declared units, strict calendar dates, duplicates and ranges. It converts cents to NZD/L only explicitly. Old periods (>14 days) are stale. One official HTTPS request, 10-second timeout, 5MB maximum, no redirects/retries. Failure preserves last-known period/fetchedAt separately from attemptedAt and marks stale. No known observation is currently bundled. No scheduled fetch or CI network job has been enabled.

Before connecting: retrieve current official CSV and dictionary normally; verify actual headers, date convention, grade and Board versus adjusted-retail meanings, GST/discount treatment, units and dataset attribution. Adapt the strict parser to that reviewed schema and add authentic minimal regression fixtures where licensed. Store only validated output with source period, fetchedAt, attribution, licence and transformation note; never reinterpret fetch time as price date. Add a reviewed build step, never browser polling. National averages remain optional context; any later explicit driving-fuel selection must affect only that assumption, never regular/candidate pump prices. Publish a dated last-known/stale view if fetching subsequently fails.
