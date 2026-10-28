# Study thumbnails and the Habitat designer

Draft based on main `fc7eb93`, 28 October 2026. No production merge requested.

## What was actually there

- Inspected both user-supplied screenshots as local image files and the live Study, Year 9 and Next Lab pages.
- `/study/` used inline hand-drawn SVG icons for all 35 machine cards, even where the machine already had a real Three.js scene.
- `/study/year9/` has four tools: study sprint, app builder, vision detective and AI judgement. It does not contain the pictured habitat.
- The screenshot is `/next/#zoo`. Next Lab is an existing collection of fourteen making studios, not a roadmap or an upcoming release. Its Habitat designer used a flat SVG.
- Existing Three.js, OrbitControls and rounded-box geometry are vendored locally. The phone machine and 26 other Study modules declare `scene3d`; Shaky Isles, vending and pinball use their own 3D viewers. Reading, words, paragraph, text and claim-checking activities are not represented as 3D.

## Changes

- `/study/`: 35 JPEG captures of the actual linked experiences, consistent 8:5 card windows, capability labels, retained subject/exam hierarchy and Allen identity. Removed the obsolete icon illustrations. Sorted year ranges numerically.
- Added a captured Habitat feature and a plain-language explanation of Next Lab.
- `/next/#zoo`: an original synthetic Three.js diorama, with spatial terrain, dimensional trees, shelter, basin, enrichment features, quiet planting and three stylised animal models. This is not a scan or a scientifically validated animal habitat.
- Space changes the model footprint; shade changes tree count and shelter size; water changes basin size; enrichment changes logs/rocks; quiet changes the retreat zone and screen. Existing educational controls and model-fit calculation are retained. Changing a design clears the old score.
- Desktop drag, camera buttons and keyboard controls. Touch uses explicit rotate/zoom buttons and leaves vertical scrolling available. No automatic motion or continuous render loop, including reduced-motion mode. DPR capped at 1.5; `?quality=low#zoo` disables shadows/antialiasing and caps DPR at 1. `?lite#zoo` and WebGL failure preserve the interactive SVG drawing. A visible drawing-mode link is provided.
- The Habitat integration in `next/index.html` and the Habitat-only input listener in `next/app.js` changed. Rendering and styling are dedicated files in `next/habitat/`. No Pattern studio, Year 9, shared kit, shared navigation or catalogue changes.

## Evidence and checks

Browser checks passed in desktop Chromium and emulated 390px mobile/touch contexts:

- 19 Habitat assertions: WebGL active; pixel differences for all five sliders; assessment and stale-score reset; keyboard and pointer orbit; all three species; narrow-screen overflow; reduced-motion top-view control; explicit drawing fallback and working controls; no JS errors.
- 6 touch/failure assertions: coarse-pointer instructions, `pan-y`, tapped camera controls, Study mobile fit, simulated unavailable WebGL and working fallback assessment.
- 7 Study/audit assertions: all 35 captures present and decoded, Allen preserved, mobile fit, keyboard navigation to a real machine, live Year 9's four tabs and absent Habitat tab.
- Low-quality DPR cap and visible drawing-mode link also checked.
- `node --check` for both new modules; `git diff --check`.
- A local favicon 404 is pre-existing and is not a JavaScript error.

Review images are in `output/playwright/`: `live-study.png`, `live-habitat.png`, `live-year9.png`, `study-desktop.png`, `study-mobile.png`, `study-habitat-entry.png`, `habitat-desktop.png`, `habitat-mobile.png`, `habitat-touch.png`, and `habitat-fallback.png`. Machine source captures are retained locally in `output/playwright/source-thumbnails/`. The production images and provenance manifest are in `study/thumbnails/`.

## Reproduce

Serve the repository at `http://127.0.0.1:8341`. The `scripts/*habitat*.cjs` and `scripts/check-study-cards.cjs` files are async functions for `playwright-cli run-code`; pass the file contents as its argument. `scripts/capture-study-thumbnails.cjs` captures the actual machine panels and hides only annotation overlays for small-card legibility; it does not change scene geometry. Resize resulting PNGs to max 800px and encode JPEG at quality 80 for the production assets.

## Limits

This upgrades one Habitat experience and the catalogue previews, not all 35 machines. Existing machine visuals and physics are unchanged. Animal models and model-fit numbers remain educational simplifications, not husbandry guidance or welfare measures. Validation used Chromium and mobile emulation; physical iPhone/Safari testing remains desirable before production. The preview needs visual review before any merge.

## Review delivery

Draft PR: https://github.com/katecoveny-svg/assembl_lab/pull/22

Branch preview: https://assembl-lab-git-codex-study-habitat-3d-katecoveny-svgs-projects.vercel.app/study/

The assembl-lab deployment check succeeds. Browser access to the preview redirects to Vercel authentication, so rendered interaction evidence was captured from the local branch build. The separate `Vercel – colmap-wasm` check fails on both this branch and baseline main `fc7eb93`; this draft changes no colmap files. Nothing was merged to production.


## Parent-review fixes

- Water now maps 0–100 linearly into the available space instead of clamping an independently growing radius. Its outer rim remains 0.07 model units inside the land edge at maximum water, for every space setting. The 3×3 rendered matrix covers space 0/70/100 against water 10/50/100; the formerly flat ranges (space 0: water 45→100; space 70: water 72→100) also produce different rendered pixels.
- Score/meter invalidation now belongs to the existing base Habitat input listener in `next/app.js`, not the optional renderer. Tests block `scene.js` and Three.js separately and verify all five drawing controls clear a previously computed assessment.
- Explicit `?lite` exits the dedicated loader before importing the renderer. Network-observed regression verifies zero scene/Three.js/addon requests and working drawing controls/assessment.
- 44 targeted regression assertions passed, plus reruns of the 19 Habitat and 6 touch/fallback checks. See `output/playwright/habitat-regressions.json` and `habitat-water-matrix.png`.
- These fixes were QA'd only against the local preview. No protected-preview access or credential operation was performed. Merge remains on hold.
