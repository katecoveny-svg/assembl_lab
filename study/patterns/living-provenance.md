# Living Studio — how it is made

Living Studio combines three creative modes with eight original generative drawing worlds. [Optional learning investigations](lessons.html) remain separate. This is not a forty-tool collection or a Gaussian-splat renderer.

## Original artwork and owner source

The eight drawing worlds adapt assembl's owner-authored generative Studio: Braid, Proof Lattice, Glyph Assembly, Attractor Bloom, Ink Rings, Murmuration, Suminagashi and ASCII Forge. The source is `engines.js`, adapted from `assemblnz-f0afd79d/public/generative-studio/index.html` (source blob `13867b18b6a2e5bc4be482cf8890d8da6af3f226`, owner import `f911ad7a2a28c7008a8cdd7598a23e5774e5ef78`). No new licence is asserted for that owner code.

Liquid Atelier uses procedural marbling, not a physical fluid simulation. Sculptural Playground uses Three.js geometry and reflective materials. Luminous Type Garden grows stylised petals around editable letters. Liquid and Sculpture offer software fallbacks when GPU rendering is unavailable. Thumbnails are captures of the actual renderers.

Murmuration is choreographed particle artwork, not measured flocking. Ink Rings and Suminagashi are procedural art, not biological or fluid measurements. Proof Lattice shows generated data. Glass remains an unfinished material study; photoreal material fidelity is not claimed.

## Dependencies and licences

- p5 **1.11.3**, an unmodified, replaceable distribution: [local library](vendor/p5-1.11.3.min.js), [LGPL 2.1 notice](vendor/p5-LICENSE.txt), [corresponding upstream source](https://github.com/processing/p5.js/tree/v1.11.3), [unminified distribution](https://cdn.jsdelivr.net/npm/p5@1.11.3/lib/p5.js).
- Three.js **0.170**, locally vendored: [MIT licence](../../assets/vendor/three/LICENSE).
- Instrument Sans and Fredoka are Google Fonts distributed under the Open Font License.

## Interaction and export boundaries

Artwork is generated in your browser. No account or paid generation service is needed. Pause, reset, pointer and keyboard controls are provided. Reduced-motion preferences select a paused starting state.

Exports are PNG still captures with square, portrait or wide framing. The interface reports both captured and output dimensions: a larger export can upscale the canvas and does not promise extra detail. Optional text stays local. Native sharing is feature-detected and user-triggered. A4 printing uses 12 mm margins.

Desktop browser checks do not certify physical phone performance, AR, native sharing delivery or physical printing. These are creative and educational models, not scientific measurements.

## Sculpture Atelier · 30 October 2026

The studio opens on real parametric sculpture geometry: continuous knot, ripple halo, five-petal bloom and woven orbit. Seed, body thickness and rib count change the generated mesh. Porcelain, glass, chrome and blush resin are artistic materials; browser glass is a simplified real-time treatment and does not claim offline Cycles fidelity. Daylight, gallery and rose lighting are creative setups.

The WebGL and software renderers share `atelier-shapes.js` for their centreline. WebGL uses higher mesh resolution and physical materials. The explicitly labelled software 3D path projects actual mesh geometry with simplified reflective materials; its output is not a Blender render. Saved variations remain on this device, up to eight. JSON recipes and recipe URLs preserve supported parameters, camera turn and artwork time; they do not upload anything.

Modern worlds re-render at the requested PNG output dimensions before composition. Legacy drawing worlds retain canvas capture. Square output is 2400 × 2400, story 2160 × 3840 and wide 3200 × 2240. Larger pixel counts do not increase geometric detail. All outputs carry an assembl wordmark. OBJ exports contain artwork mesh geometry only; no manufacturing, collision, watertightness, physical material, metre-scale or printability claim is made.

Checks: `node --test study/patterns/atelier-shapes.test.js study/patterns/atelier-mesh.test.js study/patterns/studio.test.js study/patterns/runtime.test.cjs study/patterns/caption.test.cjs` (18 passing). Browser review exercised the software path, preset changes, saved variation restoration, a 2400-square PNG download and 375px-frame layout. GPU materials and physical-device performance remain unverified in this environment. The OBJ was prepared in the UI and its generated vertices/faces were validated by tests; automated browser file transfer timed out for OBJ.
