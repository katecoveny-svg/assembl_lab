# A project, opened up — Whaiao conversation demonstrator

An independent assembl demonstrator. It is not a Whaiao commission, approved design, cultural narrative, funding assessment or construction model.

## Working experience
- Five guided chapters with named viewpoints and keyboard-accessible room navigation.
- A real-time, generated 3D pavilion study with timber cladding, glazing, gabled roofs, furniture, courtyard and planting. The roof can be removed; daylight and evening lighting are illustrative.
- Two model alternatives with explicitly illustrative covered/planted area calculations.
- A plan-view fallback if WebGL is unavailable. The story, comparisons, local questions and text pack still work.
- Local questions, deliberately excluded from URL state and public packets by default.
- A local HTML discussion pack, native print/PDF route and JSON handoff.
- A self-contained GLB may be opened in the tab. It is never uploaded. Demonstration room anchors and comparative areas are hidden for a user model because they do not describe it.

## Assets and truth
The pavilion is schematic geometry authored in viewer.js. It is not a Blender scene and does not claim the detailed asset quality of an approved commissioned architectural model. No Whaiao project image, model, mark or cultural story was copied. The supplied practice description informed the workflow, not an invented client claim.

A real project requires the approved model, source revision, narrative, relevant knowledge-holder permissions, audience and review. This build has no real publishing or access-control system. Confidential content must not be embedded in a public client bundle.

Three.js 0.170 is reused from the repository's vendored MIT-licensed distribution. OrbitControls is vendored. GLTFLoader is loaded on demand from the pinned official Three package distribution on jsDelivr, only when a user chooses a GLB. No analytics or external model-generation service is used. Google Fonts supplies Instrument Sans and IBM Plex Mono.

## Model budget
Self-contained GLB 2.0, under 25 MB, <=600,000 referenced POSITION vertices, <=800 mesh primitives and <=32 embedded images. No external textures/buffers; Draco and Meshopt compression are rejected. This is not a model security certification, metre-scale check, accessibility assessment, building-compliance review, cost estimate or manufacturing validation.

## Checks
From the repository root:
node --test whaiao-story/validate.mjs
node --check whaiao-story/app.js
node --check whaiao-story/viewer.js

Tests cover allowlisted share state, exclusion of local questions, option arithmetic, chapter anchors, export text escaping, malformed GLB input and external-resource rejection. They do not prove browser rendering, GPU performance, keyboard interaction or native print/download delivery.

The normal execution workspace and browser controls were unavailable when this demonstrator was authored. Browser visual and functional QA therefore remain outstanding. Review desktop, 375px and 320px, reduced motion, no-WebGL fallback, custom GLB, snapshot pack and camera transitions before any client release.

## Start a real project
1. Have Whaiao nominate an agreed project and intended audience.
2. Confirm permission to use the model and imagery, including texture/asset rights.
3. Replace the illustrative narrative and viewpoint anchors with reviewed project-specific data.
4. Keep public, hui-only and restricted material in separately permissioned deployments. A client-side toggle is not access control.
5. Record approved options and design/model revisions in the actual source manifest.
6. Review the browser experience with the design team and relevant knowledge holders.
