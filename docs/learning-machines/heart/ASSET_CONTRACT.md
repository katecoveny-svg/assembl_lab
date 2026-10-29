# Heart Pump Lab — science and rig contract

Version `assembl.heart.v1`, authored 29 October 2026. Editable Blender teaching asset and standalone browser review. No shared-site integration or deployment. This is a stylised, spatially opened anatomy model for exploratory biology, not a scan, clinical reference, diagnosis, CFD calculation or closed-loop model of cardiovascular regulation.

## Corrected science

The route is body → superior/inferior vena cava → right atrium → tricuspid valve → right ventricle → pulmonary valve → pulmonary trunk/arteries → lungs → four pulmonary veins → left atrium → mitral valve → left ventricle → aortic valve → aorta → body. The mitral valve has two leaflets; the other three valves have three. Artery/vein names describe direction relative to the heart, not oxygen content. Blood remains red; blue is only a teaching symbol. [American Heart Association, reviewed 13 April 2026](https://www.heart.org/en/health-topics/congenital-heart-defects/about-congenital-heart-defects/how-the-healthy-heart-works).

The model exposes hollow chambers and their separating septum. Ventricular walls contain muscle; the left-ventricular wall is represented as thicker. The lining, cut muscle and outer skin are distinct surfaces, with simplified trabeculae, papillary supports and chordae. [NHLBI anatomy](https://www.nhlbi.nih.gov/health/heart/anatomy) and [OpenStax heart anatomy](https://openstax.org/books/anatomy-and-physiology-2e/pages/19-1-heart-anatomy).

Valve state follows the direction of the pressure difference. AV valves open during filling and close before ventricular ejection; semilunar valves open during ejection. Both groups are closed during the two isovolumetric intervals. Papillary muscles/chordae help restrain AV leaflets; they do not actively pull valves open. No pressures are calculated by this asset. [OpenStax cardiac cycle](https://openstax.org/books/anatomy-and-physiology-2e/pages/19-3-cardiac-cycle).

## Single state model for the future lesson

The frontend owns `{heart_rate_bpm, forward_stroke_volume_ml, phase, playing, cutaway, selected_structure, prediction, captures}`. Suggested independent illustration controls: heart rate 40–200 bpm and forward stroke volume 40–130 mL/beat. These are experiment bounds, not age-specific healthy ranges or exercise prescriptions. State constraints do not imply that every combination occurs physiologically.

**Forward stroke volume** means the net volume delivered forward into the systemic circulation by the left ventricle per beat. In the baseline with no regurgitation, it equals the ejected volume. `cardiac_output_l_min = heart_rate_bpm * forward_stroke_volume_ml / 1000`. Report output for one pump; do not add right and left ventricular outputs. Example: 70 × 70 / 1000 = 4.9 L/min; doubling heart rate at fixed forward stroke volume gives 9.8 L/min. [OpenStax cardiac physiology](https://openstax.org/books/anatomy-and-physiology-2e/pages/19-4-cardiac-physiology).

The initial lesson omits disease/leak controls. The draft's fixed `valve_efficiency=0.8` is removed. If a later lesson adds regurgitation, separately name gross ejected volume and illustrative regurgitant fraction `r`, define net forward volume as gross × (1 − r), and disclose that this is a bookkeeping example with no compensatory physiology. Never multiply an already-defined forward stroke volume by an efficiency again.

The adapter does not calculate cardiac output or run time. Host advances `phase` from its own clock and heart rate; readouts, SVG fallback, CSV and 3D must consume the same state. The asset reviewer contains only a display clock at 0.8 cycles/s, with no heart-rate/SV calculator or experiment store. Do not copy that review clock into the lesson.

## Geometry and orientation

One Blender unit = one metre. In Blender, anatomical left is +X, superior +Z, anterior −Y. In glTF, +X remains anatomical left, +Y is superior, +Z is anterior. Thus the heart's right side appears on the viewer's left in a frontal view. `HeartRoot` is an identity transform at (0,0,0). The muscular body is about 12 cm tall; the full asset includes extended vessel stubs and arch branches and is taller. Do not frame from label geometry.

The chamber section is deliberately opened for visibility: atria are moved into a more readable frontal arrangement than an intact heart; the left atrium is normally posterior. The anterior ventricular mantle is one removable surface. Great-vessel lumens, posterior pulmonary venous ports, muscular section edges and valve reveal windows are actual geometry. Tubular joins overlap at branch junctions; they are not a single watertight anatomical lumen. Coronary surface detail is illustrative, not a complete coronary vascular tree. Pectinate detail is confined to the right atrium’s removable anterior surface; the left atrial chamber remains smooth around its four pulmonary-vein ports. Trabecular ridges are representative, not a map of every real muscle bundle. The conspicuous lilac septum is a teaching highlight.

Do not use these meshes to infer chamber volume, myocardial mass, ejection fraction, exact wall thickness ratios, haemodynamic resistance, pressure or surgical geometry. Small chamber scaling communicates timing only; it is not quantitatively coupled to stroke volume. AV hinges and semilunar cup movement approximate flexible tissue with rigid hinges. Valve opening area is illustrative.

## Named hierarchy and pivots

| Nodes | Contract |
|---|---|
| `HeartRoot` | Parent of all exported content. Identity, metres; no lights, camera or floor. |
| `Chamber_L_Atrium`, `Chamber_R_Atrium`, `Chamber_L_Ventricle`, `Chamber_R_Ventricle` | Local origin at each chamber centre. Walls and ridges follow this origin. |
| `Wall_*`, `Cover_*` | Opaque walls and removable panels. `extras.cutaway_cover=true` controls covers, including vessel windows and exterior coronary details. |
| `Valve_Mitral`, `Valve_Tricuspid`, `Valve_Aortic`, `Valve_Pulmonary` | Annulus origins. `extras.kind` identifies AV/semilunar. Do not spin these roots to open leaflets. |
| `Annulus_*` | Local ring geometry, correctly parented to its valve. |
| `Hinge_<valve>_<index>` → `Leaflet_<valve>_<index>` | Tangent pivots. Apply local X rotation from the exported closed quaternion. Open angle −1.05 rad for AV and +1.05 rad for semilunar. Mitral count 2; others 3. |
| `Papillary_*`, `Chord_*` | Chord metadata stores Blender-space anchor, target hinge name and hinge-local tip. Adapter converts coordinates and updates direction/length after leaflet motion. |
| `Vessel_*` | Named anchors preserved in GLB. Authoring .blend keeps separately editable vessel meshes. |
| `Vessels_OxygenPoor`, `Vessels_OxygenRich` | Export-only static batches: two material groups. Covers remain independent. |
| `Labels_*` | Empty anchor nodes with `extras.label`. Use DOM labels, not mesh text. |
| `FlowArrows` | Static route annotation; toggle separately. These show the complete route, not simultaneous flow through all valves. |

GLB stores closed valves and no animation clips. `createHeartRig(gltf.scene)` is in `viewer/heart-rig.js`. Its public methods are `applyPhase(phase)`, `setCutaway(boolean)`, `setArrows(boolean)`, `labels`, `names`, and `summary()`.

`phasePose(phase)` is a pure display mapping. It accepts any finite phase and wraps modulo 1. It returns `{phase, av, semilunar, contraction, phaseName}`. Use phase 0.25 for filling and 0.73 for ejection. The nominal intervals are filling 0–0.55 (late atrial contribution 0.43–0.55), isovolumetric contraction 0.55–0.60, ejection 0.60–0.88, isovolumetric relaxation 0.88–1.00. Smooth gates operate inside these intervals, never simultaneously opening AV and semilunar valves. These fixed fractions are an editorial timing convention, not an ECG or age/exercise-dependent model.

## Learning flow and accessible text

Open access; no login, analytics requirement or grade. **Explore:** trace the route and inspect valves, septum and wall thickness. **Predict:** record “At fixed forward stroke volume, what happens to output if heart rate doubles?” **Investigate:** vary one quantity, capture A, change it, capture B. **Explain:** compare evidence with the original prediction and describe what the model leaves out. A/B captures are immutable snapshots containing model version, assumptions, input values, output with units, timestamp and prediction. Changing live controls must not mutate a saved capture.

Use the complete written route beside arrow direction and the oxygen legend. Structural pastel colours are not an oxygen map of tissues. Accessible label copy: “Mitral valve: two leaflets between left atrium and left ventricle”; “Pulmonary valve: three leaflets, outflow from right ventricle”; “Aortic valve: three leaflets, outflow from left ventricle”; “Tricuspid valve: three leaflets between right atrium and right ventricle.” Avoid judging learner predictions. Reflection remains local unless the learner explicitly exports it.

Integration still owes 320/375 px layouts, at least 44 px controls, keyboard structure selection, visible focus, user-controlled motion, reduced-motion default pause, state-preserving graphics fallback and navigation, a clear reset, printable evidence/CSV and teacher embed. A static render is not a substitute for the final lesson's state-driven accessible fallback. The included viewer is an asset inspection harness only.

## Curriculum correction

This package claims exploratory biology coverage only. Remove the draft AS90927/AS91156 mapping. AS91156 explicitly covers cellular life processes, including photosynthesis and cellular respiration, rather than this organ-level pump lesson. [NZQA 2026 specifications](https://www.nzqa.govt.nz/nqfdocs/ncea-resource/specifications/2026/91156-spc-2026.pdf).

The parent curriculum audit identifies AS90927 as expired and about microorganisms, and AS91604 as internal regulation. The AS91604 clarification URL returned HTTP 403 in this executor, so that current page was not independently verified here. A pump-output calculator alone does not teach the sensor, control centre, effector, regulated variable and feedback loop needed for homeostasis. No AS91604 alignment is claimed. Mapping to NZC levels or NCEA standards remains a teacher-review task, with dated official evidence and explicit lesson coverage. Te reo Māori glossary terms require kaiako review before publication.

## Provenance and rebuilding

The two supplied drafts are preserved unchanged in `../inputs` with their Library identity. They were inspected as untrusted drafts; the original Python was not executed. This builder replaces their ellipsoid blockout, faulty parenting, all-three-leaflet design, common timing, annulus-normal spin, misleading efficiency constant and unverified curriculum claims.

Run installed Blender 5.1.1: `blender -b --python build_heart_pump_lab.py`. Add `-- --quick` for 60% resolution/32 samples. Full output: 1600×1400, Cycles 96 samples with denoising. No external textures, image assets or atlas are needed; flat Principled materials reduce texture memory. Palette follows the read-only Assembl pastel reference. Geometry and procedural code are original; educational sources were consulted for facts, not copied imagery or meshes. The local viewer vendors Three.js r170 under its included MIT licence.

Run `python3 -m http.server 8765 --bind 127.0.0.1` from this directory and open `http://127.0.0.1:8765/viewer/`. Run `blender -b --python qa/validate_blender.py` for structural/round-trip evidence. Review `qa/verification.json` and `qa/build_metrics.json`; observed values are separate from intended budgets. No frame-rate, physical-phone, AR, medical-review or production integration claim is made.

## Review corrections — 29 October 2026

The ejection detail is an in-context left-ventricular outflow reveal: left ventricle, mitral inlet, aortic valve and aorta retain their model positions. Atria, right ventricle and pulmonary route are hidden to expose the posterior outlet. Its labels identify the ventricular outflow tract and three aortic leaflets; the whole-heart cutaway directs readers to this dedicated view rather than pointing through the left atrium. This is a visibility choice, not a separate anatomical arrangement.

The standalone viewer starts with all eight rig-dependent controls disabled. They enable only after the GLB and rig initialize; handlers also guard readiness. A loader or rig initialization failure disables controls and orbit interaction, stops playback and shows the static anatomy image with reload guidance. The included local QA server can delay or reject only the GLB request to reproduce these states.
