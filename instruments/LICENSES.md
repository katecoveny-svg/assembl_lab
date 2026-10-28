# Materials and credits

All three compositions are original procedural artwork created for assembl Lab in this implementation. Reality Remix uses synthetic oriented Gaussian ellipsoids, not captured/trained scan data. No external scenes, photographs, textures, fonts, audio or personal data are included. Soft Matter and Impossible Objects use original parameterised geometry. No asset licence is inferred from a renderer's code licence.

Pinned runtime foundations:

| Package | Version | Licence | Source |
| --- | --- | --- | --- |
| Three.js | 0.186.1 | MIT | https://github.com/mrdoob/three.js |
| Spark | 2.4.0 | MIT | https://github.com/sparkjsdev/spark |
| @dimforge/rapier3d-compat | 0.21.0 | Apache-2.0 | https://github.com/dimforge/rapier.js |
| manifold-3d | 3.5.4 | Apache-2.0 | https://github.com/elalish/manifold |

Full upstream licence texts are in `licenses/`. JavaScript legal comments are retained beside the committed bundles. Spark's distribution contains its bundled worker/WASM infrastructure; Rapier compat embeds its WASM. Manifold's WASM is copied unchanged. Three's RoomEnvironment, OrbitControls, BufferGeometryUtils and GLTFExporter are MIT components of Three.js. Source packages are unmodified; our application is bundled against them.

Build/test tools: esbuild 0.28.2 (MIT), @playwright/test 1.64.1 (Apache-2.0), Prettier 3.9.10 (MIT). Exact dependency graph and integrity hashes: package-lock.json. `npm audit` reported zero vulnerabilities on installation (2026-10-28); this is not a guarantee of future security.

API references checked 2026-10-28:
- https://sparkjs.dev/examples/ and https://sparkjs.dev/docs/packed-splats/
- https://dimforge.com/blog/2026/09/25/advanced-soft-bodies-for-games-in-the-rapier-physics-engine/
- Installed Rapier `dist/dynamics/soft_body.d.ts`, `dist/pipeline/world.d.ts`. The Rust release described in the article is 0.36.0; the verified browser package is 0.21.0. These version numbers are intentionally different.
- https://manifoldcad.org/ and the installed manifold.d.ts / WASM API.

No animation-loop export, camera capture, training, accounts, paid services, sound, microphone access or automatic social posting is implemented.
