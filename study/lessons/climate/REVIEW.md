# Climate learning workspace — visual refinement for review

This is a **reviewable draft**, not visual acceptance or release approval. PR #30 was already merged when this work resumed. New work starts from freshly fetched main `f308328` on `feat/climate-lesson-visual-refinement`.

## Direction

The local Mac IAB showed the previous page as a scene beside a stack of generic panels, with controls and readings lower down. This revision gives the model most of the workspace, keeps it mounted across Explore / Notice / Predict / Investigate / Explain / Transfer, and brings the current question and four tactile surface choices together. A compact scene readout shows temperature, change from the common start, model time, reflected/absorbed sunlight and the live energy balance. The notebook below holds the graph, table and A/B evidence. Phone layouts use normal vertical flow so a pinned scene cannot obscure controls or trap scrolling. Desktop retains the scene alongside the investigation.

The reference `https://lab.tongjiang.app/` and its linked atmospheric-heating lesson were inspected in ordinary IAB for the general pattern of a persistent interactive world and contextual progression. No source code, art, copy, course files or textbook content was copied. Original English copy and the cream/navy/coral/lilac/mint assembl palette are used here.

## Behaviour

- One model year still uses the original model's 100 steps of 0.01 year. The ten sampled updates are now presented over roughly 1.1 seconds, with live readings and scene particles; reduced motion produces the result immediately. This is presentation pacing, not a changed physical timescale.
- Restart cancels an in-flight run. Old callbacks cannot overwrite the reset state. Surface changes and independent-attempt controls are disabled during a run; restart remains available.
- Stage navigation does not rebuild the scene or clear explanations. Back preserves answers. Reset clears the session and reopening starts fresh.
- The two source-review fixes remain: current-submission feedback is independent of historical activity, and async 3D attachment respects the latest drawing preference.
- Evidence export is user initiated. No scoring, account, student-name field, persistence, telemetry or upload was added. The same public embed has no navigation/account widgets. Route-scoped security headers and authentication are unchanged.
- Model/lesson version `climate-reflectivity-1.1.0`. Equations, assumptions, source review date (2026-10-28) and proposed curriculum mapping v1 are unchanged. Shared temperature/heat capacity limitations remain explicit.

## Validation and review artifacts

- `node --test study/lessons/tests/climate.test.mjs`: six tests pass.
- Existing browser regression updated for the four surface buttons and paced runs; desktop, 320/375px, independent/assisted/repeated submissions, reset/back/reopen, interrupted run, persistent canvas identity, download, clipboard fallback, reduced motion, blocked storage/no-WebGL, delayed module/view preference and actual cross-origin school fixture all pass.
- Ordinary Mac IAB inspected the original and refined desktop rendering and stage navigation. The viewport override did not affect the selected preview. A request for raw CDP emulation was cancelled without access; it was not retried. Phone layout evidence uses the already-authorised local Chrome regression at 320/375px. No expanded DevTools permission is required or held.
- Screenshots: `output/playwright/climate-desktop.png`, `climate-comparison.png`, `climate-320.png`, `climate-375.png`, `climate-320-viewport.png`, `climate-375-viewport.png`, `climate-cross-origin.png`, `climate-fallback.png`, `climate-presentation.png`.
- Local lesson: `http://127.0.0.1:8765/study/lessons/climate/`; embed: `http://127.0.0.1:8765/study/lessons/climate/embed/`; different-origin school fixture: `http://127.0.0.1:8766/school.html`.

Remaining limits: parent/Kate visual acceptance; actual touch-device and screen-reader testing; teacher review of year placement/curriculum and the model's scientific simplifications; real school CMS validation; ordinary public production-header checks after an approved deployment. No offline certification, school publication, merge or deployment. No provider spend or credentials. No shared `kit.js`, `kit.css`, model configuration, navigation, header policy or homepage edits in this refinement.
