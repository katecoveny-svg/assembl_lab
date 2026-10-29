# Phone Blender integration · local review

Follow-up: [topic-aware current inspector and cable cues](current-cues-fix.md), verified with 45 passing tests and ordinary browser reproduction. The evidence below records the initial integration.

29 October 2026. Branch `codex/learning-machine-rollout`, based on the clean planning checkpoint `712ae214` and main `a482fc5`. This is a local integration, not a published release. Preview: http://127.0.0.1:8795/study/m/phone.html?debug#charge

## What changed

The approved Blender family replaces the procedural apparatus geometry for all nine phone topics: handset/charger, cell internal resistance/external load, parallel screen/modem branches, wireless transmitter/receiver and capacitor. One apparatus is visible at a time, including in Test yourself. Controls, authoritative calculations, time semantics, five challenges and lower charts are retained. The current/field/charge markers read the original outputs; there is no additional solver.

The softer asset palette is retained. Component inspection has a native keyboard-accessible selector and plain-language descriptions. Wireless has a faint phone outline, separate transmitter/receiver labels and a gap marker. Internal resistance and the external load have separate persistent labels; parallel branch labels show their own current. The physical GLB stays in metres. A single 30× scene conversion and separately labelled 5× wireless display gap preserve the units contract. Battery casing and capacitor plates remain fixed.

The fixed 80% taper claim is removed from explanation and phase labels. The current function is unchanged: default current equals the charger limit at 49%, is lower at 50%, and falls further at 80%. The explanation describes dependence on power, efficiency and internal resistance. The lower current curve is unchanged.

Loading shows an explicitly static Blender poster; failure restores the working live SVG. Graphics switches carry a one-use, tab-local snapshot of settings, time, charge/voltage, particles, topic and playing flag, restored after mount defaults. Storage failure leaves the experiment in place. Asset resources are disposed on failure or document exit; a late completion after exit is discarded.

The actual offline card render replaces the phone thumbnail, with its complete phone/charger framing. Home alt text, Study card mode and thumbnail provenance distinguish an offline render from live 3D. The generic AR export button is disabled on this route: hidden stations and teaching magnifications are not a verified real-scale AR deliverable.

## Verification

`node --test study/tests/phone*.test.mjs study/tests/claw*.test.mjs study/tests/slushie*.test.mjs study/tests/lesson-models.test.mjs` — **43/43 passed**; output in [tests.tap](tests.tap).

The 17 phone tests cover source guards and original-vs-new execution: all 15 controls, nine topic transitions, 81 charging parameter combinations and variable time steps, seeded particle trajectories, current near taper/full states, energy/internal/parallel endpoints, every 5–20 coil turn count, wireless frequency/gap endpoints, all 25 capacitor C/R combinations, repeated resets and five challenge wins/failures. GLB tests verify SHA-256, all 95 node pivots, metre scaling, absolute poses, fixed casing/plates, exact turn visibility, coaxial coils and single active apparatus. Loading tests cover late settings/topic changes, import/load/first-pose failure and exit during loading. Transfer tests cover both directions for paused and running experiments, malformed/mismatched/replayed snapshots and blocked storage.

Ordinary IAB on the connected Mac:

- Actual GLB loads and all nine topic destinations render. Desktop, 320×740 and 375×812 layouts inspected. Phone framing focuses on the whole handset and charger; the supporting plinth may extend beyond the live canvas. No horizontal document overflow at 375 px. These are emulated layouts, not physical phone tests.
- Keyboard slider endpoints, arrow-key orbit, Home camera reset, component selectors, topic navigation, repeated restart/play/pause and challenge feedback exercised. Native focus styling remains visible. Reduced-motion branches are retained in the adapter, but an OS-level reduced-motion browser session was not performed.
- At 4700 μF / 47 Ω, a paused 0.83 V capacitor experiment survived simplified → live 3D and the reverse direction. A paused 45 W charging experiment at 5%, 8.34 A likewise preserved its controls/readings and topic in both directions. Unit tests compare the complete state, including time and particles.
- A deliberate missing-GLB HTTP 404 produced “3D unavailable” and the live SVG, with controls/challenge checks still functional. The file was restored and its original SHA-256 verified. No ready claim appeared for the failed load.
- Representative steady wireless rendering: 28 calls / 9,850 triangles at 10 turns, 38 calls / 13,290 triangles at 20 turns, including field cues and floor. Representative phone: 39 calls / 18,874 triangles; internal: 15 / 4,973; capacitor: 23 / 17,981 including instanced charge markers. Median visible-frame interval was about 16.7 ms, representative p95 about 17–32 ms. This is a modest local observation, not a device performance guarantee; first-load, tab switching and offscreen suspension can produce longer intervals. See [browser measurements](browser-measurements.json).
- No unexpected errors were captured during the inspected normal interactions. The deliberate 404 test produces the expected loader warning; see [console log](browser-console.json). Both home thumbnail instances loaded at 1600×1000 and linked to the correct phone route.

## Visual evidence

- [Desktop phone](phone-desktop.jpg), [320 px phone](phone-320.jpg), [home thumbnail](home-card.jpg)
- [Desktop wireless](wireless-desktop.jpg), [375 px wireless](wireless-375.jpg), [320 px wireless](wireless-320.jpg)
- [Internal resistance, 375 px](internal-375.jpg), [parallel branches, 375 px](parallel-375.jpg)
- [Capacitor, 375 px](capacitor-375.jpg), [capacitor controls and graph](capacitor-controls-375.jpg)
- [Failed-load control/check evidence](failed-load.jpg)

## Limits and release status

No push, merge, deployment or production changes. Independent integration review/release remains with the coordinating parent. Browser alpha glass differs from offline Cycles; markers and thermal colour are illustrative. No physical phone, AR, electromagnetic-field solver or manufacturing validation is claimed. Some original exam paragraphs outside the corrected taper topic use fixed practice-pack examples; their original content and scientific outputs were deliberately retained. Claw/slushie source and assets, all 35 Study routes, the inventory and the exact reusable design brief remain present.
