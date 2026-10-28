# Studio reuse audit and Pattern studio draft

28 October 2026. Source and limitations: [provenance](../study/patterns/provenance.md).

## Browser evidence

Actual Mac in-app-browser inspection. Chrome browser adapter was unavailable; the in-app browser worked. All 40 engines were selected through visible controls. Their post-click accessibility states and screenshots were captured. A failed first DOM-click sweep was rejected and replaced by native accessibility clicks with checked state transitions. The final captures were inspected in contact sheets; key screens also inspected at full size. Screenshots live in the task workspace `evidence/` and are not claimed as exhaustive long-duration tests.

1. Landing and Braid — working generative field; no learning goal, explanation or feedback.
2. Engine navigation — 40 entries reached; tiny menu text and long hidden-scroll list make discovery difficult.
3. Cymatic parameters — changing n from 3 to 5 updates the URL and pattern. Wave-like appearance does not establish a validated sound/plate simulation.
4. Remaining engine survey — controls enumerated below; successful appearance is a smoke check, not validation of every parameter or export.
5. Koru Cathedral, Chromatic Rain, Plum World — failed rendering; named errors below.
6. Current Lab Study — live page inspected; 35 existing machines and current rebuilt design retained.
7. Draft desktop — repeat count, angle step, comparison capture, incorrect/correct feedback and wave cancellation tested.
8. Draft mobile — 390px responsive layout and nearest-region controls/feedback checked; no horizontal overflow observed.

## What is worth carrying forward

Shared parameter exploration, reproducible settings, comparison, tasteful plum/rose/paper palette and exportable evidence are useful concepts. Educational value requires a truthful model, a visible rule, an intentional variable change and feedback derived from that model. Existing Lab already has substantial science, maths, geography and design coverage. Do not replace it with a gallery of effects.

## All 40 modules and current Study overlap

| # | Studio module / exposed controls | Study overlap and reuse judgement |
|---|---|---|
| 1 | Braid — particle count, turbulence, pull, trail, weight | Particle/AI machines. Potential algorithm investigation; not a physics model as labelled. Later, after provenance review. |
| 2 | Mahi fields — strokes, turbulence, striations | Maps/lines. Vector-field extension possible; needs direction vectors and step tracing. |
| 3 | Proof lattice — columns, density, tension, warp | Shapes/lines. Strong symmetry/transformation idea; original rotation investigation in draft. |
| 4 | Tīkapa tides — warp, striations | Sky/īnanga already teach tides. Decorative noise is not tidal science; do not reuse under that claim. |
| 5 | Glyph assembly — count, pull, swirl, word | Words/text/AI. Possible target-seeking algorithm lesson; low priority. |
| 6 | Attractor bloom — points, four coefficients | Lines/AI. Interesting iterative systems extension; needs equation, trajectory and sensitivity comparison. |
| 7 | Slime whakapapa — colony, sensitivity | Ecology/reactions. Emergent algorithms, not biological proof; terminology and provenance need review. |
| 8 | Cymatic whispers — n, m, warp | Vinyl waves. Strong interference idea; original superposition lesson complements vinyl. No plate simulation copied. |
| 9 | Ink rings — spacing, rate, wander | Shapes/ecology. Could investigate growth rules; do not infer tree age from artistic rings. |
| 10 | Coral proof — feed, kill | Reactions/ecology. Reaction–diffusion extension if numerically validated and explained; not a coral ecology model. |
| 11 | Liquid chrome — flow, satellites, gloss, scale, spin, finish/camera | Materials/print. Primarily visual material study; optional design lesson. |
| 12 | Ribbon knot — rings, gloss, twist, spin, camera | Shapes/print. Potential topology extension; needs clear crossings and manipulable views. |
| 13 | Orbital weave — rings, satellites, speed | Sky/space already stronger. Decorative orbits should not replace mechanics. |
| 14 | Crystal vessel — bands, heartbeat, gloss, opacity | Materials/print. Surface appearance, not molecular or optical evidence. |
| 15 | Plum shader — flow, finish | AI/design. Advanced graphics/programming extension, not core Study priority. |
| 16 | ASCII forge — word, glyph size | Digital technology/AI. Useful encoding and sampling lesson if underlying representation is exposed. |
| 17 | Kinetic type — word, orbit | Text/words. Motion typography/design extension; not reading comprehension. |
| 18 | Ferrofluid — magnetism, gloss, camera | Materials/phone. Needs validated magnetism model; current effect is not enough. |
| 19 | Kōwhaiwhai weave — speed | Shapes. Transformation connection, but cultural authority/attribution unresolved. Do not copy or label generic geometry as customary design. |
| 20 | Lenticular duel — strip width, warp | Fish/refraction, design. Sampling/optics extension with precise mechanism. |
| 21 | Murmuration — word, flock size | Ecology/AI. Boids/rule-based behaviour could add value with alignment/cohesion/separation made explicit. |
| 22 | Suminagashi — density, breath | Materials/art. Artistic marbling, not fluid dynamics; contextual attribution required. |
| 23 | Neon type melt — word, melt rate | Words/materials. Visual effect; no clear additional learning goal. |
| 24 | AI render — prompt, model, finish, render | Existing on-device AI machine is safer and more educational. External render not invoked; excluded. |
| 25 | Temporal echo — zoom, spin | Shapes/lines. Iterated transformations could support an extension; needs pause/step and matrix explanation. |
| 26 | Voronoi shatter — cells, crack, texture | Maps/shapes. Strong nearest-point idea; original two-site investigation in draft. |
| 27 | The assembly — count, pull | No clear learning gap; orchestration showcase, not a lesson. |
| 28 | Chromatic bloom — count, pull, glow | Materials/graphics. Lighting effect rather than scientific evidence. |
| 29 | Plum inferno — ribbons, pull, swirl | Fields/particles. Decorative vortex; do not imply fluid solver. |
| 30 | Rose nebula — stars, swirl, glow, camera | Space. Sparse initial display; decorative particles, not astronomical data or Gaussian splats. |
| 31 | Koru cathedral — density, curl | Shapes/design. Rendering fails with null stroke context; cultural provenance also unresolved. |
| 32 | Ferrofluid v2 — magnetism, gloss, spikes, camera | Materials/phone. Attractive form; scientific accuracy needs independent validation. |
| 33 | Chromatic rain — intensity, spread | Climate. Rendering fails with null noStroke context; not precipitation science. |
| 34 | The void — word, gloss, wobble, camera | Text/print. Chrome blocks observed, not a useful literacy lesson. |
| 35 | iPhone 17 wait — text, gloss, rotation, glow | Phone already teaches electricity. Branding mockup adds little learning value. |
| 36 | Portrait engine — upload | AI/art. Upload not invoked; no personal images used. Excluded from draft. |
| 37 | The duet — WASD/arrows, mouse/touch | Collaboration/algorithms potential; needs a shared task and accessible input. Only initial state surveyed. |
| 38 | Living brand kit — upload logo | Design/print. Asset production rather than core learning; upload not invoked. |
| 39 | Genesis drop — seed/drop, pull, paper size, PNG | Print Lab. Reproducible seeds and export metadata are useful concepts; print export not exhaustively tested. |
| 40 | Plum world — atmosphere, water, vegetation, orbit/camera | Maps/space. Build fails: CanvasGradient stop 1.001 is outside [0,1]. No spatial lesson established. |

## Confirmed failures and accessibility risks

- Startup `ReferenceError: p5 is not defined` at deployed line 7. Current repository orders this correctly.
- `drawKoru`: cannot read `stroke` of null; `drawRain`: cannot read `noStroke` of null.
- `buildWorld` / `makeRadialGradientSprite`: gradient stop 1.001 throws, leaves empty scene and stale footer.
- Live controls are very small, with low-contrast fine type and backgrounds that compete with labels. Slider accessibility names in the captured tree are missing meaningful labels. No obvious pause control in the default engine shell.
- 3D appearance is not evidence of scientific accuracy. The effects inspected are not Gaussian splats.
- Uploads, AI render, client packs, batches and live external submissions were not executed. No claim that all exports work.

## Draft acceptance and limits

Original implementation, no added dependencies, no animation loop, no data persistence/submission. A labelled canvas summary, native sliders/buttons/selects, live feedback and text explanations provide alternatives to the visual representation. Static rendering satisfies reduced-motion by construction; no full screen-reader certification is claimed.

Model tests check complete-turn invariance; constructive/destructive interference over the domain; analytic amplitude against sampled rendering; Voronoi ties at every height and moving boundary; current-state feedback and invalid input rejection.

No build/type/lint scripts exist in the baseline package.json. Node syntax checks and five node:test tests pass. Deployment build and final browser evidence recorded in the PR/handoff.

## Follow-up catalogue, palette and creation export

Based on main e1ae010c57bdb62975075c437332bfb99e2d9da5 after PRs 18/19 merged externally. Preserved local changes moved to a fresh follow-up branch; no existing machines or landing-page changes are included in this follow-up.

- Actual Study palette: paper #F7F3EC, navy #222A55, mint #2A7D63, sun #F7E7A6; Fredoka/Instrument Sans and existing Allen asset.
- Catalogue accounts for all 40 source engines once across eight families. Related original lessons are explicitly distinguished from unported source engines. Search includes planned learning actions (flocking regression fixed).
- PNG export rerenders geometry at 4×, with portrait 2160×3840, square 2400×2400 and wide 3200×2240 output. Artwork-only default; optional title/explanation; no default personal fields. Native file share only when supported and user-triggered, download fallback always available. No social/OAuth integration, uploads or video claims.
- Actual PNG files downloaded and dimensions verified; square caption output visually inspected. Browser-generated print PDF visually inspected: one A4 page, 12 mm CSS margins. No real printer or social account was used. These export/print rendering functions were unchanged during recovery except stale preview status text.
- Recovery browser verification at 390×844: symmetry answer 60 and challenge, waves 180-degree cancellation answer 0, nearest-site tie feedback, export invalidation on mode change, actual portrait PNG download. document scroll width equals viewport width (390). Desktop search for flocking returns the systems family. New screenshots saved in task evidence directory; earlier before/after and print evidence retained.
- Seven Node tests pass, including all-40 coverage and flocking search regression. JS syntax checks pass. No build, typecheck or lint script is declared; none is falsely reported as run.
- Native share-sheet delivery to another app and physical printing are intentionally untested. Protected deployment UI needs an authenticated Vercel session; local browser flows do not establish deployed UI verification.
