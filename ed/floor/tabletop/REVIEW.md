# Fictional ED tabletop — local review, 9 November 2026

Baseline: `0f035e39ced78bdcdd4973d0f21ca4acf50623e5` (current origin/main fetched before work). Branch: `prototype/ed-tabletop-ar`. No publication or original route changes.

## Run and inspect

From repository root: `python3 ed/floor/tabletop/serve.py`, then http://127.0.0.1:8766/ed/floor/tabletop/ . This loopback URL works only on this computer. Build/rebuild the checked-in artifacts at `/ed/floor/tabletop/build.html` using its button. The local server accepts bounded binary saves only from its own origin and only to the three model filenames. No private asset upload or paid calls.

## Selection and fidelity

Explicit assembly of CUBICLES 0 and 1 from the existing fictional ED layout, using the same bed, curtain, monitor and IV-pole assets and placement formulas as world.js. Semantic shell/equipment/provenance groups are constructed independently of World.root; exporters receive a flattened ordinary-mesh derivative. No 600m ground plane, road, ambulance, patient, Google geometry or live simulation state. The browser lesson remains untouched. The cutaway is an unoccupied venue snapshot, not a frozen current run.

Original source units: metres. Uniform 1:16 model scale; lowered curtains match the existing world’s illustrative cutaway treatment. Derived base is fitted to equipment bounds, with room for the baked attribution plate. Y-up, base minimum Y=0, horizontally centred. This is not a surveyed hospital or clinical decision support.

NVIDIA SimReady (https://huggingface.co/datasets/nvidia/simready-assets), via codepawl GLB conversion (https://huggingface.co/datasets/codepawl/simready-glb), CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Selected, converted and scaled by assembl. Base-colour maps retained; normal/ORM maps omitted and metalness capped at .25 for a lighter portable derivative. Front-side materials; no animation. Packed/interleaved geometry converted to explicit float attributes for consistent exporters. Original source files untouched.

## Measured artifacts

- Bounds: 0.5162905 × 0.1468749 × 0.3786744 metres (width/height/depth).
- 29,602 triangles; 89 meshes; 23 embedded textures, each at most 1024px. Not draw-call-merged; further batching is possible.
- GLB: 2,395,068 bytes. SHA256 `d50e301ceeca883f6c8cd407ebaf4d2380d4f21ffa56dd8d8518d99df6169324`.
- Explicit USDZ: 4,394,966 bytes. SHA256 `9d216545ae4622703f809ec2613fab21e4da006c2a6f9744ea926499dd33f6ac`.
- Local regression budgets: <35k triangles, GLB <3MB, USDZ <5MB, width <60cm, depth <40cm. These are this artifact’s regression ceilings, not measured universal phone performance targets.

## Verification

37 Node tests passed: 5 artifact tests plus 32 original ED/Winter Surge/café/stay tests. Artifact checks inspect GLB headers, actual transformed vertex bounds against manifest, finite position/normal attributes, triangle count, embedded images, USDZ archive/metre/Y-up metadata, unchanged lesson entry and native fallback constraints. Build gate checks normal lengths. Syntax and whitespace checks passed.

Browser: exported GLB renders detailed beds, monitors, curtain folds and readable baked plate. Hero/overhead controls work using Enter/Space. Reload works repeatedly; blocking the GLB produced an explanatory error and restoring it allowed retry. Portrait 375×812 has no horizontal overflow, all buttons 48px high. Dark system preference + reduced-motion media test preserves explicit white/plum contrast. No animation loop, damping or auto-rotation; render only on interaction/resize/load. Desktop and distinct mobile screenshots in sibling workspace `ed-ar-evidence/`. Camera fit corrected after detecting portrait cropping. Temporary media/network/device overrides restored.

Not tested: physical touch/pinch, sustained phone heat/frame rate, iPhone/iPad Safari Quick Look or Android Scene Viewer placement, native permission and native return navigation. In-app browser does not support Input.dispatchTouchEvent, so touch must not be reported as passed. USDZ archive inspected, but native pixels have not been inspected. No formal external glTF/USD compliance validator was installed.

## Same-device flow and release boundary

Direct same-device links are implemented for a future reachable HTTPS review: Safari rel=ar with explicit USDZ and fixed scale; Android Scene Viewer intent with GLB, ar_preferred, fixed scale and browser fallback. Native UI controls and simulation logic do not transfer. Desktop/loopback/unsupported devices retain browser 3D and download options. Links remain hidden on loopback; no attempt to launch an unreachable localhost model on a phone. No QR dependency. Close/Back returns from native viewer; persistent link returns to Winter Surge. The prototype is not linked from the public lesson or published.

Official capability references inspected 9 November 2026: https://developer.apple.com/quick-look-gallery/ ; https://developers.google.com/ar/develop/scene-viewer ; https://modelviewer.dev/examples/augmentedreality/ . Compatibility requires actual supported hardware/software; user-agent detection alone is not proof.

Before publication: independent artifact/visual review. Then, under an approved reachable HTTPS preview, test an actual iPhone/iPad Safari and supported Android Chrome: direct tap; camera permission accept/deny; tabletop grounding and ~51.6cm width measured against a ruler; material/curtain backs/plate; fixed scale; tracking after moving around a stationary clear table; native exit and lesson return; unsupported-device fallback and slow-network retry. Record hardware, OS, browser, artifact hashes and evidence. If placement or materials fail, keep AR withheld and fix the derivative. No claims of clinical validation or live AI training.
