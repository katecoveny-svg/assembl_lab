# Blender slushie integration — local review

Preview: http://127.0.0.1:8794/study/m/slushie.html?review#machine

Checkout: `/Users/kateharland/Documents/Codex/2026-10-29/task-4/lab-claw`

Branch: `codex/claw-blender-learning`. This change is a child of reviewed claw commit `ecf6cdb92b9f4066891a4575786b6e0b01170a62`. No claw code/assets, other lesson models or shared kit changed. Production was not modified. No push, PR or deployment.

## What changed

- The existing slushie route loads the supplied Blender GLB, contract and visual rig. Scientific functions, constants, controls, topic scenarios and challenge definitions remain the original source. The body of the solver and controls are checked byte-for-byte against the reviewed parent commit, and numeric outputs are compared through complete runs.
- One uniform 25 scene-units/metre conversion. Stable auger/gear/pinion/fan pivots, nine original part identities and exported hotspot anchors. A keyboard-accessible part selector complements picking; selecting a part highlights its label.
- Actual compressor operation drives the fan. Vent blockage is a separate visual. Model ice fraction drives liquid tint/cloudiness; model shell mass drives the bounded shell overlay. No additional thermodynamics, jam decisions, fluid solver or dispensing simulation.
- The original refrigerant LOOP phases/colours/timing are mapped to the supplied pipe paths. Heat-direction arrows and rear-air indicators use the existing cooling/rear heat outputs. These remain illustrative.
- Suspended crystals retain the original model-owned population/size logic; geometry is clipped to the exported capsule, fill plane and fixed drum exclusion. The mechanism topic hides the liquid to reveal the scraper.
- Topic cameras expose the cutaway, scraper, rear vents and particle window. Phones retain a large machine view; existing SVG charts remain available below. The original cooling/freezing split and test energy-flow panel are also exposed as accessible SVG, reusing their original drawing functions.
- Pausing freezes decorative machinery but does not stop display-cache refreshes: paused Skip 5 min and reset redraw the 3D chart correctly. Resizing reframes the current topic.
- Loading shows the revised offline Blender hero. Failed loading and explicit `?lite` retain the original live diagram, controls, charts and challenges. Loading never claims a live scene before the rig builds and draws its first snapshot.
- The revised 4:3 Blender card is fitted to 800×500 by extending neutral side pixels, without cropping the machine. The study card says “Blender render · open 3D lesson” and links to the actual slushie route.

## Verification

`node --test study/tests/slushie*.test.mjs study/tests/claw*.test.mjs study/tests/lesson-models.test.mjs`

**23 tests passed**; output in [node-tests.txt](node-tests.txt). Includes:

- Every integer sugar setting 0–40%, each through eighteen five-minute integrations; enthalpy, temperatures, ice partition, thermostat and challenge results exactly equal the baseline.
- Auger/cooling/vent changes, repeated resets, topic initialisation, answer sliders and 60× playback equal the baseline.
- Actual GLB hierarchy matches all contracted pivots, metre-space transforms and the 25× conversion; non-accumulating rig poses, fan independence from blocked vents, shell/cutaway presentation and particle clipping.
- Deferred asset resolution after topic/reset changes uses the latest state; load rejection and first-frame failure retain the fallback. These race/error cases are unit tests with a deferred module, not simulated browser throttling.
- Existing claw and shared lesson-model tests pass unchanged.

Ordinary IAB verification (no raw CDP):

- Actual GLB loaded, materials and named parts rendered, desktop and 320×740 / 375×812 viewports inspected. No horizontal overflow at either phone size. These are emulated viewports, not physical-phone tests.
- Sugar keyboard Home/End changes 0%/40%, resets the current run and restores the unfrozen appearance. Pure water remains at 0 °C as ice forms. Paused five-minute jumps update the screen and SVG charts.
- Auger off + four five-minute jumps grew shell from 0 to 280.8 g while the paused auger angle stayed unchanged. The renderer used the model's jam flag without inventing a shell threshold.
- Blocked vents kept the fan advancing while the compressor ran; cooling off stopped compressor/fan operation. Rear heat/electrical labels and arrows followed those outputs.
- Keyboard arrows orbit, Home resets the view, focus remains on the canvas. Part selection exposes the same nine explanations. Repeated topic/reset/navigation and notes controls remained available.
- The heat-output challenge accepted 420 W for 292 W extracted + 128 W compressor/fan. No new scoring logic.
- Actual file-not-found check: temporarily withheld only the local slushie GLB, reloaded, observed the fallback and used Fresh drink/Skip 5 min successfully. Restored the unchanged GLB immediately. The only recorded warning was this deliberate 404.
- Explicit `?lite` has no 3D host and retains the current topic when returning to live 3D. Catalogue thumbnail loaded at 800×500; its link opened the correct lesson.

[Browser measurements](browser-metrics.json): desktop blocked-vent scene at DPR 2: median ~16.7 ms, p95 ~17.5 ms, 65 draw calls / 83,401 triangles. Mobile scene at DPR 1 was approximately 16.7 ms median and ~18 ms p95; topic-dependent runtime geometry reaches roughly 110,500 triangles with the original educational particles/screens. These are short observed frame samples on this Mac, not a physical-phone performance guarantee.

## Visual evidence

- [Desktop cutaway](desktop-machine.png)
- [Cooling curve and energy split](desktop-curve.png)
- [Rear vents and energy flow](desktop-energy.png)
- [375px machine](mobile-375.png)
- [320px sugar](mobile-320-sugar.png)
- [320px scraper detail](mobile-320-auger.png)
- [Actual load failure](load-failure-320.png)
- [Explicit low-graphics mode](lite-320.png)
- [Challenge feedback](challenge.png)
- [Catalogue](catalogue.png)

## Asset provenance and limits

Copied from `task-3/slushie`, without editing the author's Blender source, GLB or controller. Contract `assembl.slushie.v1`; GLB 2,323,864 bytes, SHA-256 `db983d88ed3a2770c67ef9d69bbdfdd70c76752ea28d6978236a7549a10aa061`. Revised posters are from `task-3/slushie/poster-revision-02`; reproduction: `python3 study/tools/prepare-slushie-posters.py /absolute/path/to/poster-revision-02`.

Browser glass uses the supplied alpha blending and neutral environment lighting; it does not reproduce offline Cycles refraction. The browser's cloudiness follows the current lesson state, whereas the offline hero depicts a chosen partly frozen pose. Crystal sizes, ice overlays, motor speeds and heat-flow particles are explanatory. Neither this integration nor the asset constitutes validated refrigeration hardware, collision/fluid simulation or manufacturing clearance validation.

No remaining integration blocker. Physical iOS/Android, actual AR launch and assistive-technology testing beyond keyboard/accessibility-tree inspection remain unverified. No new scope or learning route was introduced.
