# Winter Surge — local review prototype

Source baseline: `d5e4d8345ee3553f0c3fc1a6ca8e0062c967f2c6` (refetched origin/main). Branch `prototype/winter-surge`. Local route `/ed/floor/?winter`; static fallback `/ed/floor/?winter&still`. No publication attempted or authorised before independent review.

## Actual reuse and boundaries

The adapter calls the unchanged `ed/sim.js` minute engine. The original `ed/index.html`, `ed/floor/main.js`, `world.js` and `layout.js` remain byte-identical. Only the floor HTML entry selects a separate opt-in module; normal route retains its original engine and AR script. World reuses actual SimReady bed, curtain, monitor, IV pole, sofa, desk, stool, crash cart, surgical light, wheelchair and extinguisher GLBs plus existing textures, people, staff movement, cutaway walls and boarding lights. No hospital geometry from another task is modified.

Layout is fictional: 44 cubicles, 4 resus bays, 14 minors chairs, 40 seats. Metres are authored source units, not surveyed accuracy. No named hospital, partnership, certification, patient records, clinical recommendations or autonomous care. No LLM calls, new services, private uploads or paid calls.

Four plans: existing 6-doctor team; 8 doctors (48 extra doctor-hours over the exercise); earlier ward releases with unchanged nominal daily allowance; 28 assumed staffed ward beds (engine translation: +7 nominal releases/day and +4 buffer). Added ward staffing, roster feasibility, costs and implementation lead time are not simulated. No fast-track duration reductions, diversion or selectable triage policy in this exercise.

## Fair cohort and metrics

All plans share two normal warm-up days beginning Saturday, then a Monday 00:00–24:00 stress day at +25% demand. Monday's existing 1.06 multiplier also applies: 371 new arrivals at default settings. Arrival times use the engine's deterministic hourly accumulator; seeds vary categories/ambulance/admission/service attributes, not arrival timing. Randomness occurs only on arrival creation for these plans. Tests compare every generated ID, arrival time, category, ambulance flag, admission flag and initial service/observation duration across all four plans and five seeds.

Carry-in, arrivals, exits and remaining patients conserve at every minute. Exits include home and ward transfers, including carry-in; new-arrival exits have their own denominator. Pending visits and unseen arrivals remain visible. Waiting means arrival to first doctor (including triage and waiting in a space). The reported lower bound sums observed waits and accrued unseen waits over *all* new arrivals, including patients still in ED. It is not the completed-patient median from the original page. Mean boarding occupancy averages minute-end boarding counts over elapsed minutes. No six-hour completion percentage or health outcome is inferred.

The engine's finite floating-point arrival accumulator can leave one fractional arrival just below its threshold; the extreme test allows the corresponding one-person rounding boundary. No core correction is introduced.

## Source and assumption inventory

- [Ministry of Health, Emergency department use 2014/15](https://www.health.govt.nz/publications/emergency-department-use-201415), published 25 August 2016: historical national context for category/weekday patterns. Official page verified this task. This is not current telemetry; no claim it remains the latest detailed source. Exact embedded mix inherited from the engine, not recalibrated here.
- Hourly arrival curve, category-specific doctor/observation times, admission probabilities, staffing, release curves and buffers: existing authored estimates in `ed/sim.js`.
- +25% winter load: scenario assumption, not a measured NZ winter forecast.
- [NVIDIA SimReady](https://huggingface.co/datasets/nvidia/simready-assets), CC BY 4.0, via [codepawl/simready-glb](https://huggingface.co/datasets/codepawl/simready-glb): existing local geometry inventory declared in `world.js`; attribution retained in the focused mode.
- No current national performance percentage is shown in focused mode. Existing original routes and their older labels are intentionally unchanged.

## Robustness results

Across seeds 7, 11, 23, 41, 73, against same-seed base:

| Plan | Change in exits /24h | Change mean boarding occupancy | Change waiting lower bound |
|---|---:|---:|---:|
| Two extra doctors | +50 to +70 | +0.2 to +0.9 patients | −88.4 to −62.7 min |
| Earlier releases | −9 to −4 | −2.9 to −1.4 patients | −0.5 to +19.3 min |
| 28 staffed beds | −5 to +4 | −1.4 to −0.9 patients | −1.3 to +3.2 min |

These mixed consequences are displayed without declaring a winning policy. Extra doctors move work to later queues; lowering boarding does not guarantee increased throughput within this horizon. Full per-seed output is in the local evidence `robustness.json`.

## Verification

`node --test ed/floor/tests/model.test.mjs ed/floor/winter/tests/model.test.mjs`: 8 passing. Includes original golden weeks; original file identity; five seeds × four policies checked minute-by-minute for finite metrics, conservation and zone capacity; complete arrival identities; repeated replay/seek; empty/extreme/invalid inputs; independent hand-built censoring example. Syntax and `git diff --check` pass.

Browser: actual floor assets load; no error logs observed. Enter activates outcome; Space activates a plan. Staff plan yields 351 exits vs281 baseline for seed7, with91 carry-in+371 new arrivals. Replay then reset works; seek to15:00 matches model. 375px document width equals viewport; reduced-motion transitions0s, fresh load paused. System light/dark × absent/explicit light/explicit dark theme sampled with selected control colors; all coherent, including corrected disclosure heading. No persistent browser theme mutation left in place. Original `/ed/floor/?frames=2` loads original controls/metrics and AR entries, no error logs; original `/ed/` retains its heading and no winter controls, no errors. Original-floor test initially timed out in automation; subsequent state confirmed successful load.

Static fallback was visually/AX verified with disabled view selector and available simulation controls. No physically unavailable-WebGL device test. Distinct desktop1440px and mobile375px light/dark screenshots are under `/Users/kateharland/Documents/Codex/2026-11-09/task-14/winter-evidence/`.

## Remaining limits / review questions

No AR enabled: the current world root includes a600m ground plane and the full instanced floor; a scoped export budget/grounding check is needed before exposing placement. No physical phone tests. Existing normal route's separate AR catalogue remains untouched. Nursing beyond triage, diagnostics capacity, breaks, changing acuity and clinical outcomes are not represented. Figures/ambulances have renderer caps (10 ambulances); numeric counts are authoritative. Five deterministic seeds are sensitivity checks, not statistical validation. Physical mobile frame rate/battery use remains unmeasured. No AI agent or AI Forum report capability claim is made; future bounded role-play can consume these scenario metrics without controlling clinical choices.
