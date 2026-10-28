# Habitat active-tab follow-up

Reconciled against main `cb0d83351d6cb783a398c6069e09e6859e6a6d44` on 28 October 2026.

PR #22 merged externally at 08:21:58 UTC. PR #23 merged externally at 08:31:05 UTC with head `720bee8696acd64a32e8b3bbcc74185ce694dcf3`. Main already contains the water-range correction, authoritative drawing score invalidation, and the lite-loader early exit. No replay of those changes is needed.

The remaining commit `7e242b2e2b9e07e9f6803cd8ae71f19021939651` only existed on the closed branch. This follow-up cherry-picks it onto current main: the dedicated Habitat loader reveals its selected tab in the horizontal tab strip after layout/font changes. It does not scroll the document or change other studios.

Local checks on this current-main base: four fresh-page scenarios (375px/320px × normal/lite) verify a visible selected Habitat tab, zero document scroll and no horizontal page overflow. The 44 water-range/import-failure/lite-network regression assertions were also rerun. Syntax and diff checks pass. Evidence is in `output/playwright/habitat-followup-checks.json`.

Local preview: http://127.0.0.1:8341/next/#zoo (restart the repository's local HTTP server if the execution session ends).

No protected-preview access, bypass credential use/change, merge or rollback was performed during reconciliation. This follow-up is a draft for review.
