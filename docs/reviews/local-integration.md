# Local integration review

Unpublished combined preview: http://127.0.0.1:8769/ . Branch codex/lab-local-integration. Base f3083289675e8fb4fb0ed74104e600c0f2042dcb. No push, merge, deployment or credential action performed.

## Integrated sources
- Catalogue 3135a76 plus phone Study refinement ae2e952 (local 80cd59e). Source branch codex/lab-coherent-catalogue remains separate.
- Shared learning b6571c80 -> c2ea381; final c770e5a2 -> b094561.
- Living Studio aeaad335 -> ea8f176; 2eea5d83 -> 54f3fe4; 2b31a8bb -> 4e5045f.
- Climate 44a9a48f -> 8b27261; df19422b -> 0569f15.
- All applied cleanly. Main-repository wrapper is not included.

## Checks on the combined source
- Node model suites: 31/31 (20 Studio, 6 Climate, 5 learning).
- Browser /study/tests/lesson-shell.html: PASS 19 checks, including dynamic explanation, independent stage/topic navigation, keyboard End and restart focus.
- Lines: A 3 L/min, 10 L initial, 10 min -> 40 L; B 6 L/min -> 70 L. Worked explanation updates to L = 6t + 10. Prediction accepts text and stage progression preserves model/topic.
- Particles: 60 mL/20 C -> 101.3 kPa; 30 mL/20 C -> 202.6 kPa. Both captured in Explain.
- Reactions: A 0.50 mol/L -> initial rate 0.96 mL/s; B 1.00 mol/L -> 1.92 mL/s, ratio 2.00. A preserved through B; captures occurred after 2 simulated seconds. These are initial rates, not a comparison of later collection times.
- Climate: dark and bright runs complete; bright model reaches about 2.9 C. Phone has visible More stages action; controls render with model. 375px no overflow.
- Studio: all three modes accessible, Liquid/Sculpture canvases report webgl, Garden canvas2d. Original eight worlds listed; Attractor bloom selected successfully. World selection automatically closes settings. 320px no overflow; 375px visual capture.
- Home: 60 rendered anchors; 29 unique local path destinations all exist; home Learn opens Study with all 35 cards. 320px no overflow.
- Study refinement: year choices begin at y=412 at375px and y=447 at320px, fully within first screen. Allen den link retained; exams/studios moved after the machine collection. Year10 navigation works. Both widths no horizontal page overflow.
- git diff --check passes.

## Evidence
Screenshots in output/integration/: home-desktop.jpg, study-375.jpg, study-320.jpg, particles-guided-desktop.jpg, lines-ab.jpg, climate-375.jpg, studio-liquid-desktop.jpg, studio-sculpture-desktop.jpg, studio-garden-desktop.jpg, studio-375.jpg.
Prior homepage before/after evidence remains in output/design-audit/ and its review.html.

## Remaining limits / review gate
- LOCAL ONLY, pending parent visual review.
- Studio Glass remains an unfinished material study; selected concept fidelity is not approved. Liquid lacks the selected wet pigment depth and Garden remains stylised. Do not label release-ready.
- Studio material-label regression fixed under bounded integration ownership: initial HTML and common controls synchronisation both match Chrome. Regression covers stale initial markup, all material switches, control refresh and reset; IAB verified initial Chrome, Glass surviving a mode round-trip, and reset returning Chrome. Evidence: output/integration/studio-material-fixed.jpg. Glass visual fidelity remains unfinished.
- Reduced-motion runtime emulation unverified: previous browser DevTools permission was dismissed/cancelled before approval. No retry or workaround. Static reduced-motion CSS exists.
- Desktop browser viewport testing is not real iPhone/touch/GPU performance certification. No claim all35 machine engines were upgraded.
