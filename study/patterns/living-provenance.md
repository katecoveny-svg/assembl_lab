# Living Studio — source and boundaries

This draft restores the animated creative experience as the main route. The earlier three original investigations remain at [optional lessons](lessons.html). The original restoration included **eight working 2D generative art engines**. The current local three-mode draft retains those eight and adds Liquid Atelier, Sculptural Playground and Luminous Type Garden. It is not an all-forty port and does not include Gaussian splats.

## Owner source reused

`engines.js` adapts boot/draw functions and rgba/fbm helpers from Kate's `assemblnz-f0afd79d/public/generative-studio/index.html`, file blob `13867b18b6a2e5bc4be482cf8890d8da6af3f226`. Source history traces to owner import `f911ad7a2a28c7008a8cdd7598a23e5774e5ef78`. The user expressly requested reuse of useful owner code. No new licence is invented for that code.

Reused engines: Braid, Proof Lattice, Glyph Assembly, Attractor Bloom, Ink Rings, Murmuration, Suminagashi and ASCII Forge. Changes: Study palettes; pointer/keyboard interactions; bounded particle counts; warm-up frames for immediate output; pause/step and reduced-motion default; local capture UI; glyph sampling uses fixed black/white independently of palette; attractor uses points rather than crossing lines and bounded starting coefficients. Proof Lattice's misleading “live/measured” caption now identifies generated data. Murmuration is a choreographed particle artwork, not a flocking simulation. Ink Rings and Suminagashi are procedural art, not biological/fluid measurements. Source-internal descriptive comments are not scientific claims.

Deferred specifically: Mahi/Fidenza-referencing code, unattributed QR/shader chunks, externally hosted AI generation, uploads, and the previously broken Koru/Rain/World modules. This is a narrow extraction decision, not a claim that missing root LICENSE blocks Kate's own code. No all-forty-complete claim is made. Existing optional lessons retain the broader coverage audit.

## Dependency

p5 **1.11.3**, unmodified distribution, vendored locally in `vendor/p5-1.11.3.min.js`. [LGPL 2.1 notice](vendor/p5-LICENSE.txt); [corresponding upstream source](https://github.com/processing/p5.js/tree/v1.11.3), [unminified distribution](https://cdn.jsdelivr.net/npm/p5@1.11.3/lib/p5.js). It remains a separate replaceable script. Google Fonts Instrument Sans/Fredoka are the existing Study font choices and use OFL. The three-mode draft reuses the repository’s already-vendored Three.js 0.170 module and MIT notice at `../../assets/vendor/three/LICENSE`. Its original geometry/materials and local shader are new code, not an external rendering service. No GIF encoder or paid provider is added.

## Mobile evidence and export limits

The supplied IMG_9028.png was materialized through Library to the Mac and its pixels inspected before edits. It shows severe magnification/clipping. Actual public HTML had width=device-width and initial-scale=1; IAB 375px measured scrollWidth=375 but filter text was 12px. That did **not reproduce or explain** the iPhone failure. The corrected stylesheet uses 16px form controls, explicit 100% text-size-adjust, shrinkable layout tracks and no fixed page width, while retaining user zoom. Real iPhone acceptance is still required; desktop viewport emulation is not equivalent.

All exports are PNG still captures of the current rendered pixels, with square/portrait/wide framing. The UI reports output and captured canvas dimensions. Higher output dimensions may upscale the captured image; they are not promised additional detail. Optional text is local and excluded by default. Native share is feature-detected and user-triggered, never automatic social posting. A4 print uses 12 mm margins; no printer jobs are submitted by tests.

No names, student identifiers, account connections, paid providers, uploads, persistence, or production release is introduced.

## Draft verification

Ordinary IAB checked all eight engines at 375×812: attractor drag/reset, Braid Gather, readable Glyph PLAY, Murmuration word formation, Ink centre placement, Suminagashi drops, ASCII PLAY and lattice columns. Pause/reset and repeated switching passed without blank canvas, crash or horizontal overflow. Independent QA confirmed these results. Canvas-only screenshots also established live frames change, pause frames are identical and Step changes pixels. A real square PNG was downloaded and inspected by independent QA. Optional lesson model/catalogue tests remain green (seven tests); they are not tests of the animation engines.

Follow-up polish formats control outputs to two decimal places and increases Murmuration point size/opacity for the default light palette. Original full Studio remains a clearly separate external link. No new instruments owned by the separate task are duplicated.

The developer-tools print/reduced-motion inspection was cancelled before permission was granted. No retry or bypass was used. Reduced-motion defaults and A4 CSS are implemented but this draft's reduced-motion emulation and new print PDF were not browser-verified. The previous lesson print proof does not certify the new Studio output. Real iPhone acceptance, physical printing and native share delivery remain unverified. No production merge is authorised for this reworked draft before review.


## Three-mode local draft — 28 October 2026

The three approved visual concepts guided a shared cream/navy shell. The concepts are references, never canvas substitutes. Liquid uses a seeded domain-warped shader with a genuine CPU fallback; Sculpture uses real Three.js ribbon geometry, procedural environment lighting and physical materials, with an explicitly identified CPU depth-buffered fallback; Garden uses editable procedural glyph skeletons and shaded silk-petal surfaces. All mode thumbnails come from actual renderer output. The existing eight-engine source file `engines.js` is unchanged.

The cloud browser has no WebGL context. Thus the primary Liquid GPU shader and Three.js material/lighting paths are **not browser-verified**. Screenshots document the software fallbacks and Canvas2D Garden. Real phone touch/reduced-motion verification is also pending after the organization blocked DevTools. See the root `design-qa.md` for exact evidence, residual visual gaps, and the **blocked** visual gate.

No production publication, repository push, account collection, provider credentials, API spend, media upload or unrelated draft edits were made. Export wording still distinguishes captured resolution from output framing. Local capture now discards stale asynchronous results after settings change.
