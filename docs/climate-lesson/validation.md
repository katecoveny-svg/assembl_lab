# Validation — 2026-10-28

All checks below ran locally against this branch. No production or protected deployment was queried. No Vercel CLI, automation-bypass key, new account, paid provider, report submission or real learner content was used.

| Check | Result / evidence |
| --- | --- |
| Production-model determinism, baseline balance, energy accounting and trend | PASS, `node --test study/lessons/tests/climate.test.mjs` (5 tests total). At t=1: dark 17.370661701655685 °C; bright 2.9240307756514303 °C from identical 15 °C starts. Absorbed + reflected = 340 W/m². CO₂ unchanged. |
| Snapshot separation and repeatable reset | PASS; saved state is a copy; thermal restart retains chosen tiles; full reset restores baseline. |
| Demonstration versus independent work | PASS; two assisted states do not mark independent work; B-only sparse array rejected; fresh distinct learner runs plus transfer response record an attempt, never correctness. |
| Guided Back, reset, reopen | PASS; Back preserves prediction; reset clears evidence/activity; reload opens fresh Explore. Guided-step heading receives focus. |
| Browser model/UI response | PASS; actual interface yields 17.37 °C and 2.92 °C in the A/B comparison. |
| Evidence export | PASS; actual browser download parsed, includes two inputs/outputs/series, fictional explanation and distinct activity flags. |
| Copy embed / denied clipboard | PASS; actual clipboard success after granting test permission; simulated clipboard rejection selects visible HTML and shows manual-copy guidance. |
| 320 / 375px portrait | PASS in Chrome viewport emulation, no horizontal document overflow, controls wrap. Visually reviewed 320px screenshot. Native touch-device review still pending. |
| 3D and keyboard | PASS; actual shared WebGL scene loaded, opt-in interaction accepts ArrowRight and Home. Native accessible preset controls provide an equivalent experiment path. |
| Reduced motion | PASS; actual 3D page loaded with reduced-motion media setting; teacher presentation mode toggled. No animation is required to run the model. |
| WebGL unavailable + blocked storage | PASS; both storage getters throw before scripts load, WebGL contexts disabled, SVG/model/controls still yield correct result. |
| Cross-origin school embed | PASS; fictional school page on port 8766 embeds lesson on 8765. Model control works within frame; full-experience link opens. No copy widget or ask script in frame. |
| Data minimisation | PASS; browser-request assertion found no non-local outbound request from full pilot/embed flow. No lesson persistence or upload. |
| Scoped security configuration | Reviewed diff: only restrictive headers for the public embed path. Production header precedence remains unverified until approved public deployment. |
| Syntax/diff | PASS; `node --check` and `git diff --check`. |

Screenshots: [desktop](../../output/playwright/climate-desktop.png), [comparison](../../output/playwright/climate-comparison.png), [320px](../../output/playwright/climate-320.png), [375px](../../output/playwright/climate-375.png), [fallback](../../output/playwright/climate-fallback.png), [cross-origin school](../../output/playwright/climate-cross-origin.png), [presentation](../../output/playwright/climate-presentation.png). [Fictional evidence export](../../output/playwright/fictional-climate-evidence.json).

Remaining limits: no real school CMS or mobile device certification; no screen-reader user study; no detailed curriculum or NCEA alignment; no independent science peer review of inherited greenhouse equations; no offline certification; no production header verification. These are review limits, not claims that tests passed. Two source pages returned 403 as documented in README. No work is blocked by a denied action.
