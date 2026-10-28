# Shared learning shell review

Local branch: `codex/shared-learning-shell`. Base: main `f3083289675e8fb4fb0ed74104e600c0f2042dcb`.

## Scope

- `study/kit.js`: opt-in `cfg.lesson`, separate Explore / Predict / Investigate / Explain navigation, persistent page-local prediction and explanation, model-owned setup and capture callbacks, immutable A/B snapshots, explicit restart. Lesson stages never invoke model `onStep`, change topic hashes, or replace prediction inputs in the animation loop. Capturing A clears old B; capture B requires A. Topic tabs keep their existing behavior and carry a Guided badge only for an authored lesson.
- `study/kit.css`: cream/white, navy typography, mint readouts, lilac navigation and coral/mint evidence cards; wider useful canvas, compact controls, responsive layout. Rules target the shared `#app` shell.
- `study/m/reactions.js`, `particles.js`, `lines.js`: three original, bounded lesson configurations using existing model calculations. Quiet companion option suppresses the automatic streak nudge on these pages while keeping Allen interaction and existing help.
- No home/catalogue, climate, patterns, scene engine, security, account, upload or deployment changes. No third-party source/assets copied. No applicable repository AGENTS.md or .agents directory was present in this checkout.

## Authored routes and comparisons

| Route | Controlled comparison | Model evidence |
| --- | --- | --- |
| `/study/m/reactions.html#conc` | 0.50 → 1.00 mol/L, 20°C, same small chips, 0.40 g marble and 50 mL acid | Initial rates 0.96143856… → 1.92287712… mL/s, ratio 2. The displayed rates round to 0.96/1.92. A must have started and run ≥2 simulated seconds; B must preserve that captured A as the ghost and differ only in concentration. |
| `/study/m/particles.html#pressure` | 60 → 30 mL, same sealed gas at 20°C | 101.3 → 202.6 kPa; existing gauge rounds to 101/203. Random collision counter is excluded from the comparison. |
| `/study/m/lines.html#rate` | 3 → 6 L/min, initial 10 L, both at t=10 min | 40 → 70 L from the existing equation. Setup pauses the model at 10 min, safely within the visual 100 L tank. |

Captures store numeric model values, not parsed UI strings. Reaction run capture times may differ; instructions explicitly compare initial rates, not gas volume at unlike times. Lessons make no measured-data or mastery claims. Notes/captures are in memory only and disappear on reload or Restart investigation.

## Verification

- `node --test study/tests/lesson-models.test.mjs`: 4 passing tests of actual model files, including capture guards, ghost identity/fair-test constraints, snapshot stability, reset, existing reaction challenge compatibility and numeric outcomes.
- `node --check` on all four modified JavaScript files; `git diff --check` passed.
- Ordinary IAB at `http://127.0.0.1:8793` (no Chrome DevTools request): `/study/tests/lesson-shell.html` reports **PASS 15 checks**. Covers 24 stage transitions, unchanged model state and onStep count, independent topic hash, persistent textarea identity/draft, immutable capture, A invalidating B, topic return, stage End-key focus, reset and focus restoration.
- Actual IAB flows: particles prediction survives continuous redraw and stage changes; A/B capture; keyboard volume change rejects invalid capture; explicit restart returns 60 mL/20°C and focuses Explore. Lines A/B produces 40/70 L in UI. Reactions uses Play for A, preserved ghost for B, and shows 2.00× initial-rate ratio.
- Representative existing pages: Energy 3D scene, circuit topic, keyboard note tabs; English Words explicit SVG path, channel selection and Comparisons topic. No lesson appears on these pages.
- Responsive: particles at 320 and 375 CSS px, reactions at 320, Words at 320; each measured `documentElement.scrollWidth === innerWidth`. Actual saved screenshots inspected. The documented IAB viewport override applies to the selected tab; dimensions were checked before accepting evidence and overrides were reset afterwards.
- Reactions IAB error/warning log empty during the tested flow.

## Visual evidence

- [Before: particles desktop](before-particles-desktop.jpg)
- [After: particles with captured A/B](after-pressure-evidence.jpg)
- [After: particles 375 px](after-particles-375.jpg)
- [After: particles 320 px](after-particles-320.jpg)
- [After: lines, 40/70 L evidence](after-lines-desktop.jpg)
- [After: reactions evidence](after-reactions-desktop.jpg)
- [After: reactions 320 px](after-reactions-320.jpg)
- [Explicit SVG fallback](after-particles-svg.jpg)
- [Existing Energy](regression-energy.jpg)
- [Existing Words at 320 px](regression-words-320.jpg)

Screenshots before the final small Guided topic badge still represent the tested model/layout. The SVG screenshot includes that final badge.

## Limits

3D/WebGL scenes visibly rendered in ordinary IAB, separately from the explicit `?lite` SVG fallback. The graphics backend was not interrogated, so **physical GPU acceleration is unverified**; this is not a hardware certification. No AR/camera or real mobile-device check. Not every legacy machine was manually tested. Browser Back history semantics remain the existing replaceState behavior; lesson phase adds no history entries. The legacy per-topic onStep reset behavior remains intentionally unchanged. Existing exam copy, dates and quizzes were preserved, not re-audited. No deployment, push, merge or PR was performed.
