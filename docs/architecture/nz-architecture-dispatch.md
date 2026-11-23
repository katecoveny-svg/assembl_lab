# NZ Architecture Workflow & Cloudflare Render Dispatch

Unified Plan → Editable 3D → Photoreal Browser workflow built into the existing Assembl Lab (`plan-studio/twins/drop/`) and Architecture Operations workspace (`architecture/`).

## 1. Geometry Intake & Provenance

- **IFC is the geometry source of truth** when supplied (Revit-exported IFC2x3 / IFC4 in metres). Element IDs (`GlobalId`), units, orientation and SHA-256 revision fingerprints are retained.
- **Native `.rvt` files are never claimed parsed** — the intake guard explicitly instructs users to export IFC from Revit.
- **PDF drawing intake** (`plan-studio/twins/src/twin/planread.ts`, `plan-studio/js/read.js`, `architecture/js/agents/plan-bim-rules.js`) produces editable walls, openings and levels carrying:
  - `sheet_ref` (sheet number/page)
  - `scale_check` (printed vs calibrated scale delta)
  - explicit `state`: `'measured' | 'traced' | 'assumed'`
  - `conflicts[]` flagging printed-vs-measured or cross-sheet dimension disagreements instead of silently guessing.

## 2. Reversible Entry Realism in Three.js r187 WebGPU

- Built directly in `plan-studio/twins/src/twin/dressModel.ts` and `presentationDetail.ts` alongside PR #263's `modelReviewUI.ts`.
- Presentation detail meshes (`dress_presentation_detail`: 115 mm window/door reveals, 38 mm non-crushed charcoal-bronze frames, vertical cladding depth ribs) are strictly **separate, reversible meshes** tagged `presentationOnly: true` and `excludeFromClash: true`, and skipped by `exportIFC` and measurement/clash routines.
- Metre-scaled CC0 PBR textures (Poly Haven: `red_brick_03`, `herringbone_brick_02`, `concrete_floor_02`, roof, timber), directional timber grain, world-space micro-variation, clear/bronze/smoke glazing, PMREM HDR lighting, soft contact shadows and AgX tone mapping.
- Phone tier (`tier=phone`) caps pixel ratio at 1.75 and skips heavy cladding rib instancing to maintain smooth mobile rendering.

## 3. Five Narrow Specialist Agents (Stored Against Revision)

Coordinated through `architecture/js/conductor.js` and `architecture/js/agents/revision-review.js`:

1. **Plan / BIM** (`architecture/js/agents/plan-bim-rules.js`): IFC provenance, units, GlobalIds, PDF states, scale check, dimension conflicts.
2. **Site** (`architecture/js/agents/site-brief-rules.js` + `revision-review.js`): NZTM/WGS84 georeferencing, LINZ terrain & building outlines, unverified facades/parcels.
3. **Materials / Interiors** (`architecture/js/agents/interior-rules.js` + `revision-review.js`): licence/scale-checked PBR register, finishes and reversible fit-out variants (e.g. Banquet 420 vs Conference 312 + 4 accessible places).
4. **Camera** (`architecture/js/agents/camera-rules.js`): repeatable 16:9 timeline, sampled clearances, clean editorial cuts where opening traversal is unverified, placeholder upper-level endings, and identical camera/lens/lighting/pace checks across fit-out variants.
5. **Independent Reviewer** (`architecture/js/agents/reviewer-rules.js`): compares Track A and optional Track B outputs against drawings and exact model; checks first, middle and last frames for drift across rooflines, openings, mullions, furniture and planting; enforces AI footage labels, approved wordmarks and blocks unapproved inferred cultural artwork. Never auto-approves.

Structured findings are stored in `project.agents.revisions[revision_sha256]`. People approve changes and paid renders.

## 4. Track A (Exact-Model Master) & Track B (Optional AI Look Study)

- **Track A** (`filmRender.ts`, `flightUI.ts`): 16:9 exact-model Three.js playable MP4/WebM master, exported locally in the browser with paired `first`/`middle`/`last` review frames and `camera-metadata.json`. Works 100% even when AI generation is disabled (`?ai=0` or `RENDER_AI_DISABLED=true`).
- **Track B** (`photoFinish.ts`, `functions/api/render-jobs.js`, `workers/render-dispatch/`): starts from the Track A motion clip and reference stills (never text-only), defaults to **Dry run / Mock (US$0.00)**, checks **first, middle and last frames** against Track A, rejects or trims drifting clips back to Track A, and labels AI footage throughout.

## 5. Persistent Cloudflare Dispatch & Security Boundaries

- **Ledger**: `supabase/migrations/20261124090000_arch_render_jobs.sql` (`arch.render_job`) with unique `job_key = sha256(project_id|revision_sha256|shot_id|variant|provider|mode)` and strict Row Level Security (`arch.is_member` / `arch.can_write`).
- **Cloudflare Workflow Worker**: `workers/render-dispatch/` (`RenderDispatchWorkflow extends WorkflowEntrypoint`):
  `quote & approve → create job (202 + job_id) → mint short-lived input URLs → submit provider job (retries: 0) → bounded poll / resume from saved provider_request_id → validate drift → store in private storage → show in private project Films view`.
- **Pages Bridge**: `functions/api/render-jobs.js` proxies to `env.RENDER_DISPATCH` if bound or executes the same membership-checked, reconcile-first logic directly.
- **No Double-Charging**: Uncertain or failed live jobs return `409 needs_reconcile` on retry and must be reconciled from their saved `provider_request_id` rather than auto-resubmitted.
- **Server-Side Secrets Only**: `GET /api/render-jobs?status=1` reports binding names and boolean readiness (`GEMINI_API_KEY`, `FAL_KEY`, `FAL_VIDEO_ENDPOINT`, `RENDER_DISPATCH`, `RENDER_WORKFLOW`, `RENDER_BUCKET`, `ARCH_SHARE_SERVICE_KEY`, `RENDER_WEBHOOK_SECRET`), never values.
- **Provider Policy**: Reuses Google Gemini image adapter (`/api/render`) for stills. For video, prefers configured fal 3D-to-video adapter if `FAL_KEY` + `FAL_VIDEO_ENDPOINT` are bound, else Google's `gemini-omni-1.2-flash` (`/api/film`, 3–10 s parts, 24 fps, US$0.0695/s at 720p). Never hardcodes deprecated Veo preview IDs or silently switches providers.

## 6. User Steps: Upload to Finished Film in Private Project

1. Sign in to the private workspace at `/architecture/` and open your project.
2. Open **Model** → drop your Revit-exported **IFC** (or paired browser **GLB**). Verify the SHA-256 fingerprint, element counts and metre units.
3. Open **Site → Site and sources**:
   - Confirm the site point (NZTM/LINZ parcel & terrain context).
   - Upload reference drawings (PDF) and, if applicable, the model-fingerprinted **Walkthrough setup** JSON (`assembl.model-review.v1`) matching your exact model SHA-256.
4. Click **Open in 3D** to launch the exact model in `/plan-studio/twins/drop/` (private IndexedDB hand-off — never public).
5. In the 3D viewer:
   - Inspect **Finishes** and **Layers** (toggle **Edge depth, reveals & cladding** or **As it is** to verify reversible presentation layers).
   - Inspect **Model review** (glazing previews, walkthrough stops, approved design layers).
   - Open **Fly-through** → place/verify stops (or import shot list), select fit-out mode (`banquet` / `conference`), preview and **Confirm the path** with your initials, then click **Save to the project**.
6. Export **Track A (Exact-Model Master)**: click **Render film** (16:9, 720p/1080p) to produce the playable MP4 + paired `first`/`middle`/`last` review frames + `camera-metadata.json`. A copy passes straight back to the private project.
7. Optional **Track B (Photoreal AI Look Study)**: keep Dispatch on **Dry run / Mock (US$0.00)** to rehearse, or select **Paid live shot**, review the native confirmation modal showing exact provider, model, inputs and USD estimate, and explicitly approve one short proof shot.
8. Return to `/architecture/` → **Model → Agents** to run the **5-specialist revision check** and record human approval, then open **Site → Site and sources → Films and stills** to watch, compare and download the finished film inside your private project.
