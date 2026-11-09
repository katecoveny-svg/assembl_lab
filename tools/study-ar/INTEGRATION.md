# Study AR integrated release candidate v4

Repository: https://github.com/katecoveny-svg/assembl_lab.git . Isolated branch `integration/study-ar-suite`, originally based on `9507e794b77266ecd60ec1ef50394b15f80e1a7d`, now merged with origin/main `e173fc4705cad36dcfac2a30b16aa5ec7099ab1f`. Reviewed slushie commits were cherry-picked as `7868f19` and `673b081`; shared AR landed in `b453c92`, followed by the first expansion in `2e5cd65`. The non-overlapping remote Playground update is preserved unchanged (zero instrument diff against current main). No push, PR, deployment, paid resources or Google Maps activation. Auckland and concurrent hub styling are untouched.

## Boundaries and coverage

`study/ar/**` provides the manifest, local font/CSS, native launcher, preview and 54 QR cards. `tools/study-ar/**` contains reproducible exports, decisions, tests and documentation. `study/kit.js` routes managed lessons through one shared mount before legacy snapshot controls. Vending, pinball, Shaky Isles, heart and four teardown pages use explicit mounts. Slushie retains its reviewed student-first layout and dedicated slot; its obsolete `CFG.ar` control is disabled. The original AR Worlds delivery remains unchanged outside these routes. Heart, claw, windtunnel and earthspace reuse its existing assets rather than maintaining duplicate exports.

32 prepared GLB/USDZ pairs; 21 web-first reasoning/text/chart lessons; Fly-over is the sole remaining spatial export candidate. See COVERAGE.md for every route and its exact learning boundary. This is not a claim that the whole suite simulates in AR. All newly exported geometry is static; existing AR Worlds animations, where present, are prerecorded. Browser controls, answers, graphs and simulations do not travel into native viewers. Legacy dynamic controls outside the managed routes are not certified here.

The twelve newest selections are recorded in `selected-scenes.json`: restored īnanga bank; low-water kōkopu habitat; 0–40 m beach transect; 1 kg/15°C heating jug; initial solid-water lattice/heating station; marble/acid flask before mixing; 2 kg rod-lever investigation; copper conductivity circuit; initial ED layout with room labels; albedo surface tiles; Earth–Moon tilt/orbit geometry; Saturn and rings. Scale, selected settings and interpretive plaques are retained. Sky lighting explicitly does not represent phases/seasons; the ED starting layout is not an approved design. Molecular and landscape scales are explicitly schematic. Fly-over streams attributed LINZ tiles and still needs a bounded local extract, declared scales and chosen location; no streamed-tile dump was attempted.

## Guide fixes and palette

The finder test now checks the current Every machine link and accessible finder instead of obsolete Pick your subject markup; no hub source/style change. Walkthrough validation exposed five missing recordings: quote, unseen, algebra, gradient and engine. Each now has an explicit written walkthrough in the existing index and a Read walkthrough button. Real video entries still require actual MP4, poster and captions; no recording is fabricated and no missing entry is skipped. Quote opens/closes in browser QA. The phone fixture retains its narrow approved Screen time copy correction.

Only derivative cabinet appearances were recoloured: pinball rails/floor/panes/playfield, heating-jug base and kōkopu case/plinth. Water, biological colours, chemical particles, force arrows and room-zone colours remain meaningful. Source edits to geometry are semantic export names/tags and cloned material names, not scientific calculations. Plan room labels become native plaques. The new source hook in Shaky remains query-gated and read-only.

## Export pipeline and provenance

Run `python3 tools/study-ar/serve.py` at repository root (localhost 8882). Open `/tools/study-ar/export-assets.html`. `exportAsset(id)` handles existing authored GLB rigs, including engine; `exportLesson(id)` loads a same-origin lesson, selects the configured scene and state, and exports it. POST returned JSON to `/export`. Run `python3 tools/study-ar/update-manifest.py` afterward. The earlier procedural teardown harness remains `export.html`.

Only visible mesh geometry is copied, world transforms baked, normalized attributes read correctly, instance colours preserved and hidden tiny dummy instances omitted. Cross-frame textures are copied to local canvases. Native PBR is an approximation of browser materials; shader-only effects are excluded. Sky and Saturn maps are explicitly converted from their authored procedural textures; solar lighting is not claimed. Thin Saturn rings have explicit reverse faces because USDZ does not support double-sided materials.

Engine uses the committed NVIDIA SimReady piston, converted by CodePawl, CC BY 4.0 (`study/refs/simready/CREDITS.md`). Sources: https://huggingface.co/datasets/nvidia/simready-assets and https://huggingface.co/datasets/codepawl/simready-glb . Native plaque and source link retain attribution and disclose the modified teaching display. Meshoptimizer v0.25 (MIT, vendored only in developer tooling) reduces 175,022 to 78,758 triangles with relative error limit 0.002 and LockBorder; original source asset is untouched. USDZ falls from 19,755,227 to 10,045,692 bytes; GLB from 7,628,764 to 4,380,176. Visual silhouette and piston/rod details were inspected. No runtime simplifier, paid service or AI call is needed.

Other procedural scenes and textures are the repository’s authored lesson geometry. Authored bike/phone/slushie/vinyl/particles source handoffs are under `assets/models/`; house includes its generator. Existing Three.js/exporters and QR generator retain repository licences. Local Instrument Sans is OFL-1.1. Test-only jsQR 1.4.0 is Apache-2.0. Newly vendored meshoptimizer has its adjacent MIT licence.

## Validation and release gates

Full suite: 210/210 passed, including the selected-state and engine-budget regression. No package build/lint script exists; this is static delivery. Changed JS syntax and diff whitespace checked. All 32 native archives pass ZIP CRC, stored-entry and 64-byte-alignment checks; individual assets remain below 20 MB. Exact sizes and bounds are captured in manifest and QA evidence.

All twelve newest lesson mounts were checked for one shared launcher and zero legacy duplicates. Rendered GLBs were inspected at phone viewport, including the reduced piston, recoloured pinball, selected ecological scenes and plaques. Quote’s written walkthrough open/close works. Earlier browser tests covered iPhone capability/rel=ar/IMG handoff, Android intent/fallback, repeat gestures, Back, failed manifest and desktop/web-first fallbacks. These are browser emulation checks, not OS-level placement/cancel tests.

All 54 QR cards decoded independently at 100% and 65% (108 payload checks). Payloads and quiet zones are unchanged: high-contrast square modules, H error correction and four-module white quiet zones; decoration outside. QR is secondary cross-device sharing, never the same-phone AR requirement.

Physical iPhone Safari and Android placement/materials/scale/cancel/relaunch/Back remain NOT TESTED. Production HTTPS MIME/rewrites and physical-camera QR checks are also pending. FIELD-QA.md describes tests only after an explicitly approved release. No native QA pass or publication is claimed.
