# Bike integration review · local only

Route: `/study/m/bike.html`. Branch: `codex/learning-machine-rollout`. Integration baseline: `6bbf37d` (which includes the separately committed phone/vinyl work and fresh vinyl portrait recheck). No push, merge or deployment was performed.

Preview: http://127.0.0.1:8795/study/m/bike.html#garage . The localhost-only server uses the normal approved escalation for the same port; no network/security configuration or browser permissions were changed. Vinyl's earlier sandbox browser-QA blocker is resolved; its separate result remains `6bbf37d` / [vinyl evidence](../vinyl/p2-followup.md).

## Result and scope

The corrected Blender v2 family replaces the procedural bike/rider and garage suspension demonstrator. FLOW, DROP and RIDGE use the original geometry and model state. Tyres, bar shape, crown/shock alternatives, rotors, extras, plate/tag, wheel angles, fork travel and rider contacts follow that state. One full bike or garage cutaway is visible at a time. Original forest, force/heat cues, charts, controls, saved garage build, eight challenges, sound implementation and previous-run comparison remain. The 13 topics and independent ski scenes/calculations are preserved.

The new garage has a compact labelled bike/cutaway selector, softer background and a readable static-render loading state. The dedicated catalogue image is a whole-object Blender card with the correct lesson link. The live scene never claims to be the offline render. Portrait cameras keep the moving rider in frame; duplicate 3D chart furniture/overlapping labels are hidden where the same chart remains readable below. Desktop teaching charts remain in place. Graphics switching transfers the entire experiment, not a reconstructed model.

## Automated checks

`node --test study/tests/*.test.mjs`: **75 passed, 0 failed** ([complete TAP output](tests.tap)). Fifteen bike checks cover:

- Source-identical scientific/geometry/audio code, controls, challenges and ski animation block against `6bbf37d`.
- Three builds × four tyres × three bars × all 13 topics × three surfaces, with variable timesteps and exact original state/readout/chart/check comparisons.
- Complete runs, gap outcomes, brake limits, previous-run comparison, restart, spring bottom-out and eight successful challenge fixtures with original feedback.
- Saved build/reload and one-use graphics transfer in both directions, including nondefault parameters, nested ski state, histories, running/paused state, invalid/replayed/wrong-topic payloads and blocked storage.
- Exact corrected GLB hash/size and 138 named nodes. Metre conversion, 144 build/bar/tyre/compression poses, wheel pivots, rotor scales, grip/foot contacts and repeated absolute poses.
- Capability selection before attachment, ordinary meshes without the extension, batch visibility, rollback after partial allocation and shared-resource disposal.
- Late asset arrival, import/load/build/pose/render failure, aborted pending work and prevention of false readiness.
- Projection of wheels/rider at 320/375 content widths across builds and steep trail pitches, including follow-camera lag allowance.

The asset and pure geometry map/contract remain exact; only controller/batching import paths use the repo vendor module. See [asset provenance](../../../assets/models/bike/README.md).

## Actual browser checks

Ordinary IAB on the connected Mac, at default 1280 × 720 and viewport emulations 320 × 800 / 375 × 812. Screenshots were inspected directly. This is not physical-phone or Safari testing.

- All three builds, extras, plate `42`, tag `RIDE`, air/coil cutaway alternatives and source-driven rider motion rendered. Garage and forest preserve the accepted pastel geometry; browser materials/reflections differ from Cycles.
- Traversed all 13 topics and invoked all eight Check buttons. Restart, camera arrow keys/zoom/Home, keyboard range controls, garage selection, suspension selector, repeated topic changes and sound toggle worked. No horizontal document overflow at 320/375.
- Paused stopping experiment at 60 km/h, 2.0 s reaction and mud retained all controls, `#stop`, 68.8 m result and pause after both graphics-switch directions. Build and personalized fields survived reload.
- Standard renderer exercised with `?bike-renderer=standard`; automatic multi-draw separately observed. Only one full bike reported visible; cutaway reported zero full bikes.
- Deliberately removed only the local GLB, observed 404 → original live SVG fallback, changed speed and restarted successfully, then restored the exact file/hash and loaded live 3D. The single warning in captured logs is that expected deliberate 404; no other captured warnings/errors.
- Catalogue image loaded at 1600 px, remained fully framed, displayed “Blender render · open 3D lesson”, and opened the actual bike route.

Machine-readable observations: [browser-checks.json](browser-checks.json). Representative screenshots:

| View | Evidence |
|---|---|
| FLOW / DROP / RIDGE desktop | [FLOW](flow-desktop.jpg), [DROP](drop-desktop.jpg), [RIDGE](ridge-desktop.jpg) |
| Phone-width builds | [FLOW standard 320](flow-standard-320.jpg), [RIDGE 320](ridge-320.jpg), [DROP 375](drop-375.jpg), [RIDGE 375](ridge-375.jpg) |
| Suspension construction | [Desktop](suspension-desktop.jpg), [320](suspension-320.jpg), [375](suspension-375.jpg) |
| Existing model in motion | [Trail 375](trail-375.jpg), [Energy 375](energy-375.jpg), [Stop 320](stop-320.jpg), [Fork 320](fork-320.jpg) |
| Standard renderer | [Garage](standard-desktop.jpg), [Forest desktop](standard-trail-desktop.jpg), [Moving rider 320](standard-trail-320.jpg) |
| Honest fallback and card | [Missing asset](missing-asset-320.jpg), [Simplified mode](simplified-375.jpg), [Catalogue](catalogue-desktop.jpg) |

## Performance and limits

Recorded samples are preceding rendered frames and a rolling 120-frame wall-time interval, not an isolated GPU benchmark. On this Mac: automatic multi-draw garage 21–22 calls / about 61–69k triangles, near 16.7 ms; standard DROP garage 100 calls / 69,308 triangles, about 16.7 ms; standard cutaway 27 calls / 14,216 triangles. Standard forest samples were 147–169 calls / about 264–664k triangles, around 16.8–22.1 ms after loading. Forest complexity changes with position/culling. These integrated counts include scenery and differ from asset-only 12–14 versus 87–135 call budgets. Standard rendering is materially more expensive; the visible simplified-view link remains available. No mobile performance parity claim is made.

Unchanged ski scenes still have crowded framing at narrow widths ([375 baseline-style view](ski-original-375.jpg)); their readable original diagrams/controls remain available in simplified view. This bike commit does not claim a Blender upgrade for skiing. The original simplified SVG helmet-camera illustration remains; live forest remains third-person. Physical device/Safari, audible speaker output, OS reduced-motion preference and long-session memory profiling were not measured. Existing reduced-motion branches were retained and the new exploded view honors that flag. Generic AR is disabled for this unvalidated multi-station scene. No new physics, manufacturing/contact validation or independent rider/chain solver is claimed.

No implementation blocker remains. Independent review and coordinator release are the next gates. Exact changed-file list: [FILES.txt](FILES.txt).
