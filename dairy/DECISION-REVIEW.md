# Dairy maintenance decision lab — draft review

Scope: existing `/dairy/`, with `/dairy/plant/` preserved. No production deployment or merge. No dependencies, paid model calls or live plant data added.

## Model

A pure 48-hour model compares scheduled checks against the learner response using one of three fixed traces. A is a confirmed defect, B a benign alert, C a defect missed at inspection. These are curated teaching cases, not estimated probabilities. All costs and timings are explicit assumptions. Baseline has no actionable finding in this window; this is not a claim that conventional maintenance never detects defects. No annualisation or aggregation with the other seven tools.

At NZ$4,000/hour: A + inspection costs $20,000 versus $50,000 baseline (net +$30,000); B + replacement costs $15,200 versus $0 (net -$15,200); C + inspection costs $56,000 versus $50,000 (net -$6,000). Defer pays the support allocation and therefore loses $1,200. This intentionally makes support costs visible even without intervention.

The original maintenance annual saving and guaranteed AI-off failure cycle were removed. Toggling maintenance no longer clears a stop. The selected scenario replay drives the existing fan warning / dryer stop. Other plant figures and random decorative activity are contextual and do not enter the deterministic comparison. The wider explorer remains a legacy gross-benefit illustration; it is now labelled as unresolved for overlaps and costs, not ROI.

## Evidence

Verified 9 November 2026: Siemens primary press release, 4 June 2025:
https://press.siemens.com/global/en/pressrelease/siemens-advances-predictive-maintenance-artificial-intelligence-sachsenmilch

The Sachsenmilch pump example supports the condition-monitoring / planner workflow. It does not validate this dryer fan, NZ costs, false-alarm rates, inspection accuracy or a guaranteed return. The report is vendor/customer evidence, not an independent controlled trial. Existing unrelated case-study claims have not all been re-audited in this focused change.

## Verification

`node --test dairy/decision.test.mjs dairy/plant/tests/*.test.mjs tools/study-teardown/tests/*.test.mjs`: 51 passing. Initial sandbox run failed temporary-file creation; rerun with authorised writable execution passed. Five new tests cover hand arithmetic, negative outcomes, identical baselines, input validation and replay boundaries.

Actual cloud Chromium UI checks passed: identical repeat; pack B replacement loss; pack C inspection loss and hour-30 stop readout; back; reset; blank-cost error; keyboard range input; existing plant-floor link and browser back; desktop and narrow layout; 390px iframe viewport (375px content plus scrollbar) has equal clientWidth and scrollWidth. Screenshot evidence appears in the task's tool output. Local narrow-layout artifact: ../dairy-qa/phone.png outside this repository (desktop capture, not a 390px device screenshot).

Limitations / merge gates: WebGL failed in this cloud browser and the existing still-image fallback appeared. Actual 3D orbit / movement and the visual replay integration remain unverified. The Locate button now explicitly reports this fallback. Device emulation is unavailable by browser policy; the phone CSS check used a real 390px iframe viewport, not a physical phone. Reduced-motion browser behaviour has not been verified. Local static server has no `/api/live/`, so contextual feeds return 404 and are absent; the exercise is independent of them. No full production backend check was performed.

Before merge, verify interactive 3D and reduced motion on a WebGL-capable desktop and a physical phone. Review model assumptions with a dairy maintenance practitioner before presenting this as anything beyond a judgement exercise.

## Follow-up WebGL and reduced-motion verification

The initial browser limitation was resolved using a separate normal Chromium window launched with `--use-angle=swiftshader --force-prefers-reduced-motion` and an isolated temporary profile. No sandbox-disabling flag, unsafe SwiftShader flag, DevTools override or managed-policy change was used. A local-only QA frame visibly reported `Reduced motion: true` and `WebGL stage: true`.

Observed in the actual rendered scene: camera navigation to the dryer and fan; manual orbit changes the viewing angle; pack C at hour 30 shows a red warning ring and failed / unplanned-stop callout; moving to hour 38 clears the warning and resumes the contextual flow. Pack A at hour 8 shows planned inspection / service. QA found and fixed a red planned-service ring and vague available-state callout: planned service is now amber, and the fan callout reads the replay state directly. Keyboard comparison, slider stepping and reset also worked with reduced motion enabled. Existing ambient plant animation slows in reduced-motion mode; it is not fully static. The new exercise has no automatic replay or animated result transitions.

Saved evidence outside the repository:
- `../dairy-qa/results-reduced-motion.png`: pack C cost comparison ($50,000 versus $56,000).
- `../dairy-qa/replay-stop.png`: WebGL fan failure and red ring.
- `../dairy-qa/replay-service.png`: corrected amber planned-service ring and callout.

This supersedes the earlier unverified-WebGL and unverified-reduced-motion notes. Physical iPhone / Safari and the production backend are still not tested. Current main was re-fetched and remains `48605a51b4095d0677c64f24aabc861ae44aa068`, the PR base; no other work is displaced. Ten focused dairy model/plant tests passed again after the display correction.
