# Study: creative instruments discovery

Separate draft from current main `cb0d83351d6cb783a398c6069e09e6859e6a6d44`, 28 October 2026. **Hold merge until PR #26's instrument corrections are cleared and parent approves.** PR #26 was OPEN when checked. PR #25's active-tab fix stays on its own branch and is not included.

## Scope

Adds a hero anchor and a clearly grouped, open-ended creative-instruments section on `/study/` linking to:

- `/instruments/reality-remix/`
- `/instruments/soft-matter/`
- `/instruments/impossible-objects/`

Each thumbnail is a crop of that actual instrument's initial rendered canvas, captured locally from the current-main build. Labels were hidden for the crop; scene geometry and state were not edited. Captures use the Gaussian, Rapier and Manifold renderers, not the 2D fallback. Provenance is in `study/instrument-previews/manifest.json`. The three JPEGs total about 100 KB and load lazily; static thumbnails add no rendering runtime to Study.

The new cards are outside `#machines`, carry no curriculum/exam badges, and do not change `study/data.js`, the 35-machine grouping/count, Allen, or the original Pattern Studio link. No instrument, Habitat, shared kit, navigation or Pattern Studio source is changed.

## Local verification

23 checks passed: exact destinations, three decoded images, all three keyboard links reaching loaded canvases and Back restoring the catalogue, unchanged curriculum count, separate grouping, retained Allen and Pattern link, reduced motion, and stacked layouts without overflow at 375px and 320px.

Evidence: `output/playwright/study-creative-desktop.png`, `study-creative-mobile-375.png`, `study-creative-mobile-320.png`, and `study-creative-checks.json`. Reproduce with a local server on port 8341 and `scripts/check-study-instruments.cjs` passed to Playwright CLI `run-code`. The source captures can be refreshed with `scripts/capture-study-instruments.cjs`.

Local review URL: http://127.0.0.1:8341/study/#h-creative

No conflicts were found with current main. This draft touches Study integration and dedicated assets only. Since the instrument corrections are pending, captures and link smoke checks should be rechecked after PR #26 lands if its initial composition changes. No protected-preview access, credential use/change, paid tools, social sending or production merge occurred.
