# Slushie view switching follow-up

29 October 2026. Bounded P2 fix on top of `1a509e856a55e3a504875e64a2e3446ad4abc9f5`.

Switching between live 3D and the simplified diagram now carries the existing experiment through a one-use, tab-local sessionStorage snapshot. It restores after the shared shell's synchronous topic defaults, before animation or asynchronous GLB attachment. It preserves sugar, elapsed time, enthalpy, ice partition, thermostat, energy totals, sample history, prior run, equipment settings, answers and play/pause state. The topic and other query parameters remain intact. The transfer token and stored snapshot are consumed on arrival.

No alternate solver was introduced. If storage cannot save the snapshot, navigation is cancelled and an inline status explains that the current experiment remains unchanged. Missing or invalid incoming snapshots are explicitly identified as a fresh drink. Ordinary reloads and deliberate topic changes retain their existing behavior. Camera position and exact illustrative molecule positions are not experiment state; those visuals rebuild.

## Verification

- `node --test study/tests/slushie*.test.mjs study/tests/claw*.test.mjs study/tests/lesson-models.test.mjs`: **26/26 pass**. Full output: `switching-tests.txt`.
- New tests compare complete state before/after both renderer directions, including a paused 0% sugar run with elapsed time and ice, previous-run evidence, answers and equipment toggles. Running playback, run ID continuity after reset, one-use consumption, malformed/mismatched snapshots and blocked storage are covered.
- Existing scientific byte comparisons, all sugar values through the complete 90-minute simulation, equipment trajectories, topics, challenges, rigs, asynchronous loading and claw tests still pass.
- Ordinary IAB: 0% sugar, Fresh drink, four Skip 5 min actions, paused; live 3D → simplified → live 3D preserves topic #sugar, 0% sugar, 0 °C, 474.8654617025607 g ice (displayed 475 g), run ID and sample-history key. Both directions exercised repeatedly, including keyboard Enter on the link.
- Running playback also survives simplified → live 3D; subsequent Fresh drink retains 0% sugar and resets the drink, then a new four-skip experiment again survives both modes.
- 320×740 and 375×812 viewport emulation checked; status and links fit and controls remain usable. These are desktop browser emulations, not physical phones. The viewport override was reset afterward.
- Browser captured errors/warnings: none on the final page. `git diff --check` passed. No claw, shared shell, model assets or science definitions changed.

Preview: http://127.0.0.1:8794/study/m/slushie.html?review#sugar (local server only). The retained tab contains the paused, preserved pure-water experiment; opening the URL afresh starts the ordinary topic defaults.

## Files in this follow-up

- `study/m/slushie.js`
- `study/tests/slushie-view-state.test.mjs`
- `study/review/slushie/switching-review.md`
- `study/review/slushie/switching-tests.txt`
- `study/review/slushie/switching-browser.json`
- `study/review/slushie/switch-lite.png`
- `study/review/slushie/switch-live.png`
- `study/review/slushie/switch-lite-320.png`
- `study/review/slushie/switch-live-375.png`

The JSON records the first exact round trip and final UI evidence. The screenshots use the final status wording. No publication, push or deployment. No remaining blocker for this P2.
