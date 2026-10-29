# Learning machine rollout tracker

Source baseline: `a482fc56ab49dc7c40d39b3ef20c7f3614226dde` (PR 38), fetched and verified 29 October 2026. Isolated branch: `codex/learning-machine-rollout`. The original planning checkpoint is `712ae214`. Phone, vinyl and bike now have bounded local Blender integrations awaiting independent review and release; claw/slushie implementation and assets remain intact.

## Scope and accounting

- **35 Study registry entries**, matching `study/data.js`: **2 accepted**, **3 locally integrated awaiting review**, **0 awaiting assets in Batch 01**, **22 queued**, **8 retain/review without a Blender replacement**. There are 34 `m/*.html` routes plus the `m/shaky/` book. No route is counted twice.
- **14 separate Next panels**: tracked below, not added to the 35 Study count. Habitat is one of these panels, even where it has another catalogue card.
- Additional Study/creative tools and **14 system/everyday catalogue worlds** are separated below. Business simulator work is a reusable brief only; this tracker does not authorize business builds.
- “Accepted” refers to the completed claw/slushie work. Other rows are source-grounded upgrade plans, not claims of browser defects or completed visual review. Existing “3D” catalogue badges do not mean an asset meets the approved Blender standard.
- Difficulty: L = content/interaction review, M = contained asset/adapter work, H = multiple scenes, articulation, stochastic models or precise contracts. No completion dates are implied.

## Next batch

[Batch 01 asset contracts](batch-01-contracts.md): **phone → vinyl → bike**, all three on existing routes. Phone is already prominent on the home page and connects everyday battery use to electricity. Vinyl directly relates visible rotation and groove radius to pitch/circular motion. Bike connects construction choices to forces, stopping and suspension, but has the highest compatibility cost. Production can be coordinated separately; this order minimizes integration risk.

Future assets should favour **cream, soft lilac, blush, mint and powder blue**, with lighter structural surfaces and restrained navy. Current claw/slushie are accepted as-is. Construction detail, scientifically useful interactions, open access, compact phone-first controls, keyboard access and truthful fallbacks are required. The [reusable product brief](assembl-3d-design-brief.md) is saved verbatim alongside this tracker. The tracker and contracts are implementation context, not a substitute for that brief.

## All Study routes

State owners below remain authoritative. Scene work must never introduce a second scientific model or replace challenge calculations. Source links identify the existing implementation; the machine-readable companion is [study-inventory.json](study-inventory.json).

| Route / source | Current scene | Model/state owner | Planned scope / explicit decision | Difficulty · status |
|---|---|---|---|---|
| [inanga](/study/m/inanga.html) · [source](../../study/m/inanga.js) | inanga3d; estuary, tide and fish | s; sync, layEggs, eggStatus | Bank cross-section, native fish and culvert detail; retain tide timing, egg and restoration outcomes | H · queued |
| [reactions](/study/m/reactions.html) · [source](../../study/m/reactions.js) | reactions3d; reaction bench | s.run; dxdt, integrate, predict, eqCounts | Flasks, syringe piston, balance and bath; retain collision/energy diagrams and rate curves | H · queued |
| [slushie](/study/m/slushie.html) · [source](../../study/m/slushie.js) | Blender slushie3d + slushie-asset.js | s.run; solve, powers, step1, integrate | Accepted GLB and state-preserving view switch; maintain regression coverage | done · accepted |
| [climate](/study/m/climate.html) · [source](../../study/m/climate.js) | climate3d; energy/carbon bench | s; advance, flows, eps, setTile | Bench apparatus/cross-section details only after preserving shared lesson evidence and live-data labels | H · queued |
| [shaky](/study/m/shaky/) · [source](../../study/m/shaky/lessons.js) | Custom Three.js pop-up book | shaky/lessons.js lesson build state; shaky/book.js lesson/prediction/evidence lifecycle | Targeted plate/fault/magma sections; retain the book and Predict/Test/Prove interactions | H · queued |
| [fish](/study/m/fish.html) · [source](../../study/m/fish.js) | fish3d; fishing rock and teaching stations | s; cast state, refractPath, catchSample | Rod/reel/float/lens anchors and fish anatomy; retain levers, projectile, density, refraction and samples | H · queued |
| [read](/study/m/read.html) · [source](../../study/m/read.js) | Text reading window and evidence questions | read.js load/save, adapt, skillTotals and session state | Retain 2D text: reading focus, timing and evidence selection gain nothing from an object viewer | L · retain-review |
| [words](/study/m/words.html) · [source](../../study/m/words.js) | SVG word/audio mixing desk | s; padWords, playLine, soundScene and challenges | Retain readable words and audio controls; decorative 3D faders would obscure language evidence | L · retain-review |
| [essay](/study/m/essay.html) · [source](../../study/m/essay.js) | SVG/HTML paragraph and planning boards | s; question selections, order, dials, thesis, solved | Retain text-first TEEL/evidence interaction; no Blender replacement | L · retain-review |
| [maps](/study/m/maps.html) · [source](../../study/m/maps.js) | maps3d; Kōwhai Bay terrain/map table | s; H, trailAt, cr, bearings/grid/section state | Terrain and survey-tool detail; exact scale, section, bearings and map overlay stay model-owned | M · queued |
| [market](/study/m/market.html) · [source](../../study/m/market.js) | market3d; stall, choice and market stations | s; supply/demand helpers, price, budget, rank and settle | Recognisable stall/vending props tied to quantities; keep graph and perspective evidence primary | M · queued |
| [claw](/study/m/claw.html) · [source](../../study/m/claw.js) | Blender claw3d + claw-scene.js/claw-motion.js | s; playOnce, playAnimated, outcomes and RNG | Accepted rig, probability lesson and evidence; maintain unchanged | done · accepted |
| [ai](/study/m/ai.html) · [source](../../study/m/ai.js) | ai3d data/training visualization plus drawing canvas | s.ex, strokes, pred; raster, dist, predict, accuracy, pca | Retain actual classifier/data view; no decorative AI robot or claimed replacement of local model | M · retain-review |
| [vinyl](/study/m/vinyl.html) · [source](../../study/m/vinyl.js) | Blender vinylWorld + vinyl-asset.js; retained teaching apparatus | Original s; rps, omega, heard, speedAt, acen and tick | Local integration; contact-correct stylus, labelled drive/speaker views, original six checks and state-preserving graphics; [evidence](../../study/review/vinyl/README.md) | M · local-review |
| [bike](/study/m/bike.html) · [source](../../study/m/bike.js) | Blender bikeWorld + bike-asset.js; retained forest/charts/ski stations | Original s/b/s.ski; tickTrail, tickStop, tickFork, SK, geoPts/riderPts | Local integration; FLOW/DROP/RIDGE, labelled suspension, standard/multi-draw paths and state-preserving fallback; [evidence](../../study/review/bike/README.md). Independent ski visuals unchanged | H · local-review |
| [lines](/study/m/lines.html) · [source](../../study/m/lines.js) | lines3d; tanks and plotter | s; rule, meet, emptyAt | Tank/valve/plotter construction; values, inequalities and line/fee comparisons remain live | M · queued |
| [particles](/study/m/particles.html) · [source](../../study/m/particles.js) | particles3d; hotplate, vessel and syringe | s; stages, stateFrom, boilPoint, pressureAt | Detailed vessel/heater and piston; retain schematic particles, altitude and heating/gas plots | M · queued |
| [energy](/study/m/energy.html) · [source](../../study/m/energy.js) | energy3d; tower, kettle, flask and circuit | s; tickTower, tickKettle and electrical/thermal helpers | Four purposeful apparatus assets with isolated units; retain energy balances and graphs | H · queued |
| [genes](/study/m/genes.html) · [source](../../study/m/genes.js) | genes3d; bird island, cross and gel stations | s; generation, binom, cross, gel | Bird/island/lab props; stochastic counts, allele state and gel evidence must remain legible | H · queued |
| [kokopu](/study/m/kokopu.html) · [source](../../study/m/kokopu.js) | kokopu3d; stream, rhythm, hatch and choice chamber | s; clockTick, fishTick, floodTick, mazeTick | Recognisable banded kōkopu/stream and chamber detail; preserve illustrative behavioral limits | H · queued |
| [ecology](/study/m/ecology.html) · [source](../../study/m/ecology.js) | ecology3d; beach, transect and food chain | s; pops and transect/factor state | Shingle-beach habitat, plants, quadrat and birds; retain measured/example data distinctions | M · queued |
| [atoms](/study/m/atoms.html) · [source](../../study/m/atoms.js) | atoms3d; atom builder and gold-foil apparatus | s; shells, setEl, fire, tickFoil | Improve apparatus and manipulable models; do not turn shell diagrams into literal electron orbits | M · queued |
| [shapes](/study/m/shapes.html) · [source](../../study/m/shapes.js) | shapes3d; parameter-driven tiles, trays and prisms | s; dimensions, unroll/pour and geometry builders | Detailed teaching mechanisms only; keep variable geometry analytic, not fixed Blender solids | M · queued |
| [civics](/study/m/civics.html) · [source](../../study/m/civics.js) | civics3d; seats/chamber and bill path | s; allocate, gov, seatPositions | Retain countable seats and explicit rules; no realistic parliament replacement needed for learning | M · retain-review |
| [sky](/study/m/sky.html) · [source](../../study/m/sky.js) | sky3d; orrery, globe and tide/eclipse stations | sky.js state; dayLen, season, phaseName, eclipse | Orrery mechanics/materials; preserve astronomical orientations and explicit scale exaggerations | M · queued |
| [space](/study/m/space.html) · [source](../../study/m/space.js) | space3d; solar system, star/HR/lifecycle scenes | s; kepler, helio, ephem, mapAU, msMag | Improve explanatory objects selectively; retain ephemerides, true/display scales and plots | H · queued |
| [data](/study/m/data.html) · [source](../../study/m/data.js) | data3d; plots and sample-comparison stations | s; five, sampling RNG and fictional WD/WE arrays | Retain quantitative charts/data manipulatives; no Blender props competing with accurate plots | M · retain-review |
| [text](/study/m/text.html) · [source](../../study/m/text.js) | SVG poem lightbox and annotation boards | s; technique selections, connotations, theme/aspect answers | Retain readable poem and selected evidence; no Blender replacement | L · retain-review |
| [materials](/study/m/materials.html) · [source](../../study/m/materials.js) | materials3d; testing bench and particle zoom | s; material tables, stCircuit, stHeat, stHammer, stWater | Detailed samples, hammer, circuit and water test; keep particle models and choice rationale | M · queued |
| [claims](/study/m/claims.html) · [source](../../study/m/claims.js) | SVG/HTML claim/evidence boards | s; runStudy, mulberry, gauss and source/fair-test questions | Retain source/evidence and trial charts; no 3D can/phone replacing critical-reading tasks | L · retain-review |
| [vend](/study/m/vend.html) · [source](../../study/m/vend.js) | Custom Vend3D renderer in vend3d.js | vend.js s; tickVend/tickCoin, poseNow, fall/torque/cost helpers | Blender cabinet, coils, coin mechanism and delivery flap; preserve pose contract and displayed physics | H · queued |
| [pinball](/study/m/pinball.html) · [source](../../study/m/pinball.js) | Custom Pinball3D table/renderer | Pinball3D.Sim in pinball3d.js; pinball.js s and challenge events | Detailed table/parts mapped to current colliders; preserve physics, input timing and shot evidence | H · queued |
| [phone](/study/m/phone.html) · [source](../../study/m/phone.js) | Blender phone3d + phone-asset.js; five focused apparatuses | Original s and charge/current/induction/capacitor helpers; nine topics, 15 controls, five checks | Local integration verified; corrected taper explanation, labelled wireless spacing, state-preserving graphics switch; [evidence](../../study/review/phone/README.md) | H · local-review |
| [queue](/study/m/queue.html) · [source](../../study/m/queue.js) | queue3d; arrival/checkout/ED/tree stations | s; newSim, stepSim, runFast, summarise and seeded RNG | Checkout/ED component detail; keep distributions and fictional service assumptions visible | H · queued |
| [plan](/study/m/plan.html) · [source](../../study/m/plan.js) | plan3d; editable floor-plan and option models | s.zones/options; evalZones, move, resize, saveOption | Modular walls/furniture with exact snap/dimension anchors; preserve three options and scale export | H · queued |

## Next Lab: 14 separate panels

Routes are fragments of `/next/`. These are not additional Study registry machines. Source owner is `next/app.js` unless stated. “Candidate” means suitable for a later bounded design review, not accepted or already commissioned.

| Panel | Existing model / state owner and scene | Decision / next scope | Difficulty · status |
|---|---|---|---|
| `#history` | `historyIndex`, `inquiry`; sourced timeline and schematic Aotearoa map | Keep map, text, source links and inquiry notes; no 3D requirement | L · retain |
| `#pinhole` | `drawPinhole`; aperture mm and screen-distance mm from controls; Canvas ray construction | Candidate: cutaway camera box, aperture and screen, with the existing rays/readouts retained | M · candidate |
| `#flatpack` | `next/flatpack.js`: `PARTS`, `parseManual`, current assembly step, `layout`; procedural Three.js birdhouse | Candidate: detailed joints, dowels and assembly parts; preserve recognised manual steps and warnings | M · candidate |
| `#collage` | `collageItems`, drag/size/colour state; SVG composition/export | Art editing needs direct selection, not a Blender scene | L · retain |
| `#zoo` | `species`, `zv`, `drawZoo` in app; `next/habitat/loader.js` and `scene.js` render same controls | Candidate review of species/habitat detail; preserve comparison state and illustrative needs, not welfare certification | H · candidate; existing 3D retained |
| `#weather` | `weather` observation array; entered observations/chart/export | Data collection, not a forecasting or cloud-physics model; no 3D requirement | L · retain |
| `#commerce` | `market`, `prices`, `transactions`, `renderMarket`, `renderTransactions`; SVG charts and ledger | Preserve fictional prices, transactions and arithmetic; optional stall asset only with clear learning benefit | M · retain pending learning case |
| `#media` | `clips`, `selectedClip`, `editRun`; local video trim/sequence/export | Preserve editing controls; no Blender requirement | L · retain |
| `#sport` | `reactionState`, timer/start/times and movement planning | Keep reaction measurement and planning; no invented biomechanics model | L · retain |
| `#music` | `musicRows`, `musicStep`, `tickMusic`; Web Audio sequencer | Keep playable grid/timing/audio. Instrument housing is optional and must not reduce grid usability | M · retain |
| `#wardrobe` | `wardrobe`, `outfit`, filters and browser storage | Keep garment organization; no body or cloth simulation implied | L · retain |
| `#agents` | `lastAgent`; bounded agent sketch, no AI call | Keep explicit simulation/approval wording; no robot prop as a substitute for a working agent | L · retain |
| `#body` | `organs`, `bodySequence`, `chooseOrgan`, `bodyFlow`; SVG anatomy/flow | Optional anatomy cutaway candidate after subject review; keep readable connections, no medical simulation claim | H · candidate review |
| `#game` | `next/game.js`: seeded game state, `START`, `PROJECTS`, goals, turn transitions; island strategy view | Retain game model; later terrain/asset review must preserve eight-turn trade-offs and labelled invented metrics | H · candidate review |

## Other learning/making surfaces

| Surface | Existing owner / what it is | Decision |
|---|---|---|
| `/study/lessons/climate/` and `/study/lessons/climate/embed/` | `study/lessons/climate/lesson.js` + shared `shell.js`; guided wrapper around the climate machine | Same model as Study climate, not a 36th machine. Preserve phase/state/evidence and embed access; review alongside climate |
| `/study/year9/` | `app.js` has `study`, `code`, `vision`, `ai` tools: sprint, app builder, pixel analysis and AI judgement | Four panels, not four machine assets. Preserve worked examples, local inputs and source judgement; no forced 3D |
| `/study/junior/` | Year-group entry page | Navigation/content, not a simulator |
| `/study/print/` | `model.js` owns mm dimensions, normalisation and `bikeLayout`; `drawing.js`/`app.js` export/view | Genuine parametric design model; later asset review must preserve technical drawings, dimensions and STL/3MF. Do not substitute the Study riding bike GLB for printable geometry |
| `/study/patterns/` and `/study/patterns/lessons.html` | Living Studio plus written lessons; `living.js`, `engines.js`, `model.js` and individual engines | Generative art/learning, not another mechanical model. Keep engines editable; assess only purposeful physical apparatus |
| `/study/bedazzle/` | `studio.js` and `boundaries.js`; stones/surface design and print workflow | Creative tool, no blanket Blender rebuild; preserve surface placement/export |
| `/instruments/reality-remix/` | `instruments/src/reality-remix.js`; synthetic Gaussian art | Preserve direct manipulation and explicit synthetic provenance; not a physical machine |
| `/instruments/soft-matter/` | `instruments/src/soft-matter.js`; interactive soft-body experiment | Keep deformation solver; a rigid asset swap would lose the purpose. Separate visual/material review only |
| `/instruments/impossible-objects/` | `instruments/src/impossible-objects.js`; editable solid operations/export | Keep constructive geometry; optional material polish, no frozen mesh replacement |
| `/instruments/liquid-playground/`, `/instruments/sonic-loom/`, `/instruments/time-sculpture/` | `instruments/stage-two/` application; additional creative instrument routes | Record as existing sibling tools, outside the initial home-page three. Separate source/visual audit before any scope; no “upgraded” claim |
| `/instruments/squishy-lab/` | Existing Squishy Lab application merged through PR 35 | Preserve existing work; separate app, not a Study route or batch-01 target |
| `/ar/` and `/ar/v/` | Making/placement shell and viewer | Keep its source models and supported export paths; asset viewing is not itself a new learning model. AR verification is separate |

## Business and everyday demos: brief only

`lab/catalogue.js` contains 14 system/everyday worlds distinct from the learning/making entries: `/home/`, `/kitchen/`, `/cafe/`, `/store/`, `/ed/`, `/office/`, `/tourism/`, `/dairy/`, `/stay/`, `/retail/`, `/energy/`, `/food/`, `/cars/`, `/everyday/`. Cars also exposes `/cars/dealer-twin/` and `/cars/check/`; these are not Study machines. System state/data belongs to each existing application and its documented feed boundary, not to new Blender scripts. The maturity catalogue distinguishes model/shadow from a genuine synchronized twin despite some legacy titles using “twin.” No business builds are commissioned by this inventory.

Apply the reusable brief to a future separately scoped business assignment: clarify its decision, existing state owner, authorized data, human gate and evidence before specifying an asset. Do not infer health, safety, ROI, partner access or real operational action from a rendered scene.

## Working and release gates

1. Select an existing route and inspect its model, controls, unit conversions, resets, topics and challenges. Specify the contract before asset production.
2. Review a reproducible Blender render; then verify exported names, bounds, pivots, materials and resource counts. Asset owner supplies actual export facts; proposed budgets are not measurements.
3. Integrate from existing state; keep math, units, challenges, charts, open access and meaningful fallbacks. Preserve state during graphics changes; make explicit resets deliberate. Retain existing phase semantics unless a separately scoped lesson change is reviewed.
4. Compare model outputs before/after; inspect actual desktop and 320/375 browser views, controls, keyboard/focus, reduced motion, reset/topic/view changes, loading/failure, performance and A/B evidence where present.
5. Record evidence and exact local head. Review and a specifically approved release are separate gates. No pushes, merges, deployments, paid services or new credentials are included here.

## Context and provenance

Read the unchanged [Assembl 3D experience design brief](assembl-3d-design-brief.md) first for user-facing design intent. Read this tracker and [batch-01-contracts.md](batch-01-contracts.md) for implementation scope. They deliberately remain separate.

The brief was materialized from the supplied Library file into this repository on 29 October 2026, version 0, 4,356 UTF-8 bytes. SHA-256: `8a52ba48d986734e4fe274b13366f1d0d3fed92f52bb131b0b0bc523c5aa4489`. No wording or link/path adjustments were made. Its published claw/slushie references are preserved verbatim. No repository `AGENTS.md` or `.agents` guidance convention was found, so none was created or overwritten; this docs index is the discovery point.

## Inventory validation

Planning-only checks on 29 October 2026: all 35 inventory IDs exactly match `study/data.js`; every route and source file exists; all 14 Next panel IDs match `next/index.html`; relative documentation links resolve; the supplied brief's byte count and SHA-256 match the downloaded original; `git diff --check` passes. No runtime code/assets changed, so no new browser quality, scientific-regression or physical-device result is claimed for this documentation batch.
