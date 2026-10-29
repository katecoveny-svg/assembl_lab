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
