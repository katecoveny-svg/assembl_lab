# Local validation · 28 October 2026

Base: refreshed `origin/main` at `cb0d83351d6cb783a398c6069e09e6859e6a6d44`. Isolated checkout/branch `codex/stage-two-instruments`.

## Verified

- Build with existing pinned esbuild/Three dependencies succeeds; output is isolated under `stage-two/dist`.
- Four sequential Chromium Playwright tests pass. No app console errors in the volume or fluid checks. Initial shader compile defects were fixed before final checks.
- Sonic: no AudioContext before Play; context runs after Play; original oscillator events occur; analyser detects a non-zero waveform. Mute lowers master gain; Pause suspends the context; Play resumes animation and sound. Injected rejected resume recovers on a second Play. Simulated interruption and hidden-state change suspend sound, becoming visible does not restart it. `pagehide` closes the context. Voice ceiling is 16. These checks verify signals/state, not a subjective listening assessment.
- Time: intercepted actual `texSubImage3D` call is 128×128×64 with 4,194,304 source bytes. One RGBA8 GPU texture is nominally another 4 MiB, excluding framebuffer, driver and browser overhead. Whole-process/GPU resident memory was not measured. Source data is retained by the texture; regenerating a motion briefly retains old and new CPU arrays until GC. Orbit uses actual 3D rays. Slice depth, time and threshold each produce different canvas pixels. Undo/reset exercised. PNG downloaded as `.png`. Print snapshot loaded, print media shows it, PDF generated locally.
- Fluid: original CPU position-based solver uses 640 particles, three 3D density-projection iterations per step, spatial hashing and bounded catch-up (two 1/60 steps per frame). Typed simulation arrays total 33,280 bytes; hash lists and rendering resources add overhead. Compression test reduced mean positive density error from 1.6329 to 0 after eight steps; 240 subsequent steps with stirring stayed finite and within all tank bounds. Recorded Node mean step approximately 7.6–9.5 ms on this Mac. A browser screenshot showed approximately 16.9 ms CPU for a frame; this is not a sustained frame-rate guarantee. Stir visibly changes the scene; undo stores bounded particle snapshots (maximum 30 actions).
- Narrow 390px viewport has no horizontal overflow in the liquid test. This is desktop emulation, **not physical iPhone testing**.
- PNG/print are local. Native file sharing button is hidden unless `canShare({files})` succeeds. The OS share sheet was not submitted. No recording feature or MP4 promise.

## Liquid scope and reviewed alternative

Liquid is an **experimental 3D particle-fluid view**, not the requested high-fidelity smooth surface. Its density projection prevents excessive compression; it has damping rather than a full viscosity model, and no surface tension or continuous surface reconstruction. This materially limits the water-like appearance. No 2D fallback is misrepresented as 3D.

Splash review at commit `3df5d621e6f153d7269037cbd8606bd83796f3fd`:
- MIT licence verified; `package.json` scripts invoke Vite through npx.
- `main.ts` uses maximum tier counts for particle, posvel, cell and density allocations, including the 180,000-particle tier even for smaller UI choices.
- Six `public/cubemap` PNGs are fetched; individual image rights were not established.
- A future Splash adaptation must allocate only a selected low tier, destroy/rebuild all buffers and textures on changes, replace cube maps with original procedural lighting, and test compute pipelines, limits and device-loss handling.
- Current Chromium reported a WebGPU adapter with maxBufferSize/maxStorageBufferBindingSize 4,294,967,292. No Splash pipeline/device-loss test was run. This does not validate the solver on Chromium, Safari 26 or iPhone.
- **No upstream software execution was attempted or denied.** Action-time approval to execute unrecognised upstream software remains pending if that route is chosen. The original implementation avoids that dependency; it does not claim equivalent visual quality.

## Remaining validation

Physical iPhone and Safari testing, sustained thermal/performance measurements, subjective sound balance, OS sharing flow, and a smooth fluid surface remain open. There is no video importer or clip recorder to validate. No production merge or credential/protection changes were made.

Screenshots: `evidence/sonic-final.png`, `evidence/time-sculpture-final.png`, `evidence/liquid-final.png`, `evidence/liquid-mobile.png`.
