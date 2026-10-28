# Pattern studio: provenance and scope

Prepared 28 October 2026 as an isolated draft from `katecoveny-svg/assembl_lab` main `328bf97da8124405956a4b973e698297bcba375a`.

Rebased onto fresh main `a1c83556536271549b83d491fa7a6277267bdb95` before publication; the concurrent catalogue apostrophe fix is preserved. No `.agents/skills` or `AGENTS.md` exists in this fresh Lab checkout. Product Design index/audit and Vercel deployment guidance were read.

## Source investigation

Reference: https://assembl-studio.pages.dev/#braid

The connected GitHub search located `katecoveny-svg/assemblnz-f0afd79d/public/generative-studio/index.html` (file blob `13867b18b6a2e5bc4be482cf8890d8da6af3f226`, indexed commit `76dfab4272e56393962aaab05b891fc9c5284bf1`). Both repositories belong to the same GitHub owner; the connected account reports administrative access. This is ownership evidence for the repository, not a warranty of authorship for every embedded algorithm or dependency.

The deployed HTML differs from current source: it calls p5 before loading p5 and lacks later mobile fixes. Root `LICENSE` lookup returned 404; no licence/credit banner was found in the HTML. Studio loads p5, Three.js, gif.js.optimized, Puter and remote fonts. Their separate licences and the provenance of embedded algorithms would require review before extracting code. No licence has been invented or applied to the original Studio.

**No Studio implementation, shader, third-party bundle, uploaded image, asset or external service is copied into this draft.** All new JavaScript, styles, teaching text and canvas diagrams are original implementation of elementary mathematics. Conceptual inspiration comes from Studio's broad parametric exploration, comparison and visual generation. This resolves the draft's reuse risk without asserting a licence for Studio.

## Bounded integration

Only one link is added to the current Study landing page. Existing machines, their shared kit, Allen, exam data and all other worlds remain unchanged. The new route is `/study/patterns/`.

- Rotation: identical repeated geometric petals, angle `360 / count`.
- Waves: two equal-amplitude sine waves, their displacement sum and analytic peak amplitude. This is not the Studio Chladni-style equation or a physical plate simulation.
- Regions: exact two-site nearest-point regions on a flat square. Distance uses `hypot`; a tie is explicitly represented.

No Gaussian splats, 3D claim, paid provider, new credentials, student data, persistence or network submission. Rendering is static and event-driven, with no animation loop. Comparisons are an in-memory PNG and text that disappear on reload.

## Curriculum connections

Suggested Years 9–10 exploration, with interference and Voronoi regions explicitly marked as extensions. Rotation supports spatial reasoning; arbitrary-angle symmetry extends beyond the specific multiples-of-90° example in the Phase 4 teaching sequence. This does not cover or assess an entire NZQA achievement standard. No mandatory-curriculum claim is made for the added activities.

Sources inspected 28 October 2026:
- https://newzealandcurriculum.tahurangi.education.govt.nz/nzc---mathematics-and-statistics-phase-4-years-9-10/5637291579.p
- https://newzealandcurriculum.tahurangi.education.govt.nz/transforming-shapes/5637187370.p
- https://tahurangi.education.govt.nz/our-story

Geometric patterns are not presented as customary kōwhaiwhai. Cultural contexts need appropriate consultation and attribution before inclusion.

## Checks

Run `node --test study/patterns/model.test.js` and `node --check study/patterns/app.js`.
The repository is plain static HTML/JavaScript with no build, typecheck or lint scripts/dependencies declared in package.json. Syntax checks and mathematical tests are applicable; do not report nonexistent compiler/lint runs as passed. Browser checks and deployment status are documented in `docs/studio-reuse-audit.md`.
