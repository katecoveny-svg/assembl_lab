# Climate reflectivity lesson pilot

Lesson/model adapter version: `climate-reflectivity-1.0.0` · source review: **2026-10-28**.

## Scope and audit

Started from a freshly cloned main at `64da0c6f2e130bf283cf1fe0c71d61fc7d12592e`, isolated branch `feat/climate-guided-lesson`. No AGENTS.md or repository SKILL.md was present in the checkout. Original implementation only: no Tongjiang code, text, course files or artwork was copied. Study patterns, instruments, Study overview cards and Art Studio are untouched.

The original `study/m/climate.js` has one temperature and one heat capacity for all eight tiles. It cannot honestly answer which real material heats fastest: water, soil and ice differ in heat capacity, evaporation, phase change, mixing and other properties. The smallest adaptation exposes the existing model, SVG drawing and `climate3d` scene through a scoped adapter. There is no duplicate physics or viewer. The pilot compares different albedos at equal model heat capacity, cloud cover, CO₂, start temperature and elapsed time. Ice feedback and carbon cycling are off; the inherited temperature-dependent water-vapour feedback remains on. The whole dark slice warms; the bright slice cools from the common 15 °C start. “Warmer after the same time” is deliberately used rather than asserting both surfaces warm.

The original machine’s NCEA AS 91193 badge was **not inherited**. Its wider curriculum and data claims were not re-audited in this pilot; do not treat this work as endorsement of those labels. The legacy page only gains an entry link.

## Experience and privacy

- Full pilot: `/study/lessons/climate/`; public embed: `/study/lessons/climate/embed/`.
- Immediate Explore; optional Notice / Predict / Investigate / Explain / Transfer sequence; teacher presentation text sizing; reusable state shell in `study/lessons/shell.js`.
- Explicit one-model-year runs use 100 Euler steps of 0.01 model year. Graph/table samples every 0.1 year. The user can reset and reproduce each experiment.
- Two local snapshots store actual model inputs, outputs and sampled trajectory. Export includes fictional/user-entered explanations and separate explored / watched demonstration / independently attempted flags. No mastery score or AI grading.
- Independent attempt means two learner-generated, distinct-reflectivity runs plus a transfer explanation; it does **not** mean the explanation is correct. “Start independent attempt” clears assisted evidence and answers, while retaining demonstration history.
- State stays in memory and is cleared by reload/reopen. No names or accounts, no automatic uploads, no analytics script, no remote font dependency. Shared `kit.js` reads optional preferences defensively but the pilot does not call its mounting/progress logging functions. Ordinary hosting requests still occur.
- No error-report service was identified for this scoped lesson; none added or exercised. No offline claim: a cold offline open has not been certified.
- The same SVG/model and text/table controls work without WebGL. 3D orbit is opt-in to avoid touch scroll capture. It supports the shared viewer’s arrow keys, zoom keys and Home. Picking original model knobs is disabled so the held experiment variables cannot change behind the controls.

## Embedding and security

The copy control generates a user-visible snippet from the current origin. Its iframe has an accessible title, lazy loading, responsive width, fixed 850px height, no-referrer, a sandbox allowing scripts/same-origin/user downloads/popups, explicit denial of camera/microphone/geolocation/payment, and a normal full-experience link. It does not use `postMessage`, request fullscreen or access parent state. Copy and downloads are initiated only by button clicks. A denied clipboard operation selects the visible HTML for manual copy.

`vercel.json` adds only restrictive Permissions-Policy and Referrer-Policy headers on `/study/lessons/climate/embed/:path*`. No existing framing restriction needed relaxing; no global framing/header policy, private/account/admin route, authentication or credential was changed. Actual hosting header precedence should be checked after parent-approved deployment through ordinary public access. Local Python serves the real static content, not Vercel’s header engine.

Tested context: Chrome on macOS, including 320px/375px viewport emulation and a real different-origin fictional school page (`127.0.0.1:8766` embedding `127.0.0.1:8765`). No universal CMS/LMS claim. A school HTML sanitizer or frame policy may reject the embed; retain the normal link. Native iOS/Android assistive technology and a real school CMS still need teacher/device review. No real school was published.

## Sources and proposed curriculum mapping v1

- [NASA, Earth’s radiation budget](https://science.nasa.gov/ems/13_radiationbudget/) — conservation-based incoming/reflected/absorbed/emitted radiation framing; reviewed.
- [NASA Earth Observatory, Climate and Earth’s energy budget](https://science.nasa.gov/earth/earth-observatory/climate-and-earths-energy-budget/) — global-average incoming sunlight and energy balance; reviewed. This is a global-average model, not a roof-temperature calculator.
- [NASA Earthdata, Albedo](https://www.earthdata.nasa.gov/topics/land-surface/albedo) — definition supported by official search result; direct retrieval returned 403 during review. Preset values are explicitly illustrative, not certified values for particular materials.
- [IPCC AR6 WGI chapter 7 (2021)](https://www.ipcc.ch/report/ar6/wg1/chapter/chapter-7/) — source already cited by the original machine for forcing/feedback constants. Direct retrieval returned 403; constants were inherited unchanged, not newly independently validated in this pilot.
- [Ministry of Education, Science Years 0–10](https://newzealandcurriculum.tahurangi.education.govt.nz/new-zealand-curriculum-online/nzc---science-phases-1-4-years-0-10/5637290855.p) — page reviewed 2026-10-28; describes a proposed National Curriculum Statement intended for 1 January 2027 and replacement when gazetted. Purpose statement covers observation, prediction, testing and analysis; glossary defines modelling. The older [Phase 4 page](https://newzealandcurriculum.tahurangi.education.govt.nz/nzc---science-phase-4-years-9-10/5637290857.p) still says draft and links to the newer statement. We follow that link rather than presenting the older draft label as final policy.

**Proposed practice mapping only:** Notice → observation; Predict → prediction; Investigate → controlled comparison and model output; Explain → reasoning from evidence; Transfer → applying a model and identifying its limits. No claim of detailed year-level coverage, formal assessment alignment, Ministry endorsement, NCEA credit or learner proficiency. A NZ science teacher should review year placement and the current gazetted statement before classroom adoption.

## Reproduce validation

```sh
node --test study/lessons/tests/climate.test.mjs
python3 -m http.server 8765 --bind 127.0.0.1
# Another terminal, repository root:
python3 -m http.server 8766 --bind 127.0.0.1 --directory study/lessons/tests
# With Playwright and Chrome installed:
node study/lessons/tests/browser.mjs
# Or set PLAYWRIGHT_MODULE to an existing installed playwright module directory.
```

The browser script uses fictional learner text only, saves screenshots and JSON in `output/playwright/`, and does not submit forms or send reports. It tests the current pilot and the actual cross-origin iframe, not a mocked model. See `validation.md` for results and remaining review limits.
