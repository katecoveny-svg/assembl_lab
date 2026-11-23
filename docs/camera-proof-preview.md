# Assembl Lab: exact-model camera proof

## Try it safely

Only use a made-up fixture in the branch preview. This adds an opt-in panel in the existing renderer, not a new tool.
The Cloudflare endpoint is off by default and refuses production hosts. Enable the server binding only in a protected preview environment. The default view is unchanged; append `?camera-proof=1` to `/plan-studio/twins/drop/` to enable it.

1. Generate the synthetic model: `node tests/architecture/fixtures/make-synthetic-model.mjs /tmp/synthetic-camera.glb`. Drop it into the preview.
2. In **Fly-through**, place at least two shots several metres apart on clear external ground. Scrub near the beginning of the actual move, not a long dwell.
3. Select **Capture proof**. This uses the existing Three.js frame-by-frame renderer and the current flight path at 1280×720, 24 fps, for 3–5 seconds. It stays in this tab. Select **Download clip** and play it; confirm the camera moves and that the model and framing did not change. A browser without H.264 may make a local WebM. Only MP4 can be checked by the current cloud adapter.
4. In a protected preview with server binding `CAMERA_PROOF_PREVIEW=1`, select **Check in Cloudflare (free)** with an MP4. This explicitly sends the clip to the Lab server only. It validates the MP4 headers, prepares the existing Google request in memory and returns a receipt tied to the clip's SHA-256; it neither submits a provider request nor stores or retains the film server-side. A successful receipt is not a render or provider-availability test.
5. For the save test, open `/architecture/?camera-proof=1` and start a new **synthetic** browser-only project. Add the fixture model and choose **Open in 3D**. The preview flag follows the one-use model handoff on that first open. Capture and check the clip; select **Save privately to project**, then confirm it appears under **Site and sources → Private camera proofs**. Reload and confirm it still plays. Check the draft does not appear on the client link or in the client ZIP. Keep the downloaded clip until the workspace confirms the save. For preview QA, use a local-browser project, not a real project or the shared workspace.

The receipt records the actual captured bytes, clip offset/length, path version and adapter model if preflight passed. It does not certify path clearances, geometry, photorealism, or provider authorization. The normal film editor and still/film render flows are unchanged. This slice does not add paid dispatch, a persistent background provider queue, the full Weteriana sequence, or the two Weteriana fit-outs. Those are subsequent milestones.

## Build and test

Run from this repository on Node 22+:

```sh
node --test tests/architecture/*.test.mjs tests/photo-film/*.test.mjs tests/render/*.test.mjs
node tools/film/test-camera-proof.mjs /tmp/camera-proof-fixture.mp4
```

The latter generates a fully playable synthetic test-pattern MP4 with FFmpeg, sends those bytes through the Pages Function's request handler, and refuses any upstream request. It does not stand in for a real in-browser Three.js/GPU acceptance check.

The browser bundle follows [the existing Vite build recipe](../plan-studio/twins/SOURCE.md#rebuild) with Three.js 0.187, Vite 7.3.8 and PDF.js 4.10.38. Only the Drop bundle is rebuilt for this preview. Preserve its existing HTML/metadata and replace its generated entry hash and generated assets together. Publish only a branch preview of the existing Cloudflare Pages project; the dry check needs no Gemini secret, but does require its explicit preview binding and protected access. Do not use a production deploy to test this branch.
