# Science investigation batch — 9 November 2026

Scope: reviewed the live manifest and route/source inventory for all 54 experiences (33 exported, 21 intentionally web-first), then deeply reviewed and improved three science lessons. This is not a complete curriculum or exam-coverage audit. No native assets or QR destinations changed.

## Selected lessons

- `/study/m/energy.html#heat`: a fair comparison of 0.5 kg and 1.0 kg water at 2100 W for 60 s from 15°C. The deterministic Observe 60 s control uses the existing heating solver without requiring animation timing. Captures show equal 126 kJ and rises of 60°C/30°C, distinguishing rise from final temperature. Explicit ideal/no-loss assumption.
- `/study/m/reactions.html#conc`: retained the existing concentration A/B experiment and added misconception-specific feedback about collision frequency, temperature, initial rate and limiting reactant. The 2× initial-rate ratio is an illustrative model rule, not a universal rate law. Early captures do not prove final yield; the feedback says to complete both runs to observe that. Topic setup now honours reduced motion instead of silently starting playback.
- `/study/m/genes.html#cross`: compares Dd × Dd and Dd × dd with 24 simulated chicks each. Captures include actual offspring counts and separate per-chick probabilities (25%/50%). Feedback addresses dominant phenotype versus carried allele and expected versus guaranteed counts. The existing one-gene birds are invented; this is not a claim about real black-robin feather inheritance. Reduced motion removes the chick entrance growth.

Each uses Try → Predict → Investigate → Explain → Check. Written explanations remain ungraded and local to the page; no AI request is required. Check requires both captures, supports keyboard-native radio controls, explains every answer choice and clears stale feedback when evidence changes. Existing four-stage investigations retain their navigation and behaviour.

The new panels use white, pale rose/plum and Instrument Sans. Scientific scene colours remain intact. Existing standard references and past-paper links were not expanded into new alignment claims; footer claims of comprehensive coverage were replaced with selected-practice limitations.

## Shared AR boundary

Web-first previews now explain the browser task and hide their canvas correctly, including without WebGL. Their lack of a native model is intentional. The three investigation explanations state that native AR is a static reference: close it and return to the browser for controls, runs and captures. Native assets, launch protocol and 54 QR files are unchanged.

Physical iPhone/Android placement, native cancellation/relaunch, scale and materials remain untested. Browser capabilities and intercepted links cannot certify those behaviours. Reloading a browser page clears unsaved notes/captures, as the notebook explicitly states.

## Validation and reproduction

- `node --test tools/study-teardown/tests/*.test.mjs study/tests/*.test.mjs study/m/heart/tests/*.test.mjs tools/study-ar/tests.mjs`: 216 passing.
- Open `study/tests/lesson-shell.html` and `lesson-check-shell.html` on the local test server: 19 + 25 browser assertions.
- `study/tests/science-browser.mjs` is a Playwright CLI `run-code` expression. Start `tools/study-ar/serve.py`, create `output/playwright/science`, then pass the file text as the run-code argument. It exercises complete phone/reduced-motion/keyboard flows, wrong and correct feedback, captured evidence, reset, all 21 web-first entries and the no-WebGL path. Browser screenshots require visual inspection.
- Static repository: no package build/lint scripts. Changed JavaScript syntax and git diff checks passed. No Slushie, Playground, Auckland or deployment-setting edits.

## Scientific references

Linked in the lessons: OpenStax [specific heat](https://openstax.org/books/physics/pages/11-2-heat-specific-heat-and-heat-transfer), [collision theory](https://openstax.org/books/chemistry/pages/12-5-collision-theory), and [inheritance probabilities](https://openstax.org/books/concepts-biology/pages/8-2-laws-of-inheritance). These support the concepts, not a claim that the models reproduce a measured experiment or cover an assessment standard completely.
