# assembl design inventory

The 3D asset library for Plan Studio, live at `/plan-studio/library/` on lab.assembl.co.nz. One shelf and one searchable
inventory over a merged `catalogue.json`, with an orbitable three.js viewer and the real GLB download for every piece.
This folder (`plan-studio/library/src/` in the lab repo) is the editable source; it is not deployed (`.vercelignore`).

## What is in it

78 real items, one entry each, from four sources (snapshot 17 Nov 2026):

| Source | Items | Notes |
|---|---|---|
| Kate’s curated asset site (`assets.json`) | 35 | 9 owner-supplied refined pieces, 15 procedural objects, 11 birds and sprigs |
| Kōwhai Studio (Kate’s generator) | 33 | CC BY 4.0; the same compressed files the twin loads |
| Twin library (`LIBRARY` in `src/twin/library.ts`) | 39 | 33 Kōwhai + 6 curated; merged into those entries, with `twinRole` |
| assembl objects library (`src/objects`) | 25 | 15 are the curated site’s procedural objects (merged), 10 are newer NZ exports |

Rights on every item: “Cleared for use by Kate Hudson (owner); not independently verified”. Commercial use is never
claimed; photorealism and dimensional accuracy are never claimed. Titles are neutral, with no brand or product names.

## Files

- `index.html`, `src/`: the page (Vite + TypeScript, three.js r187 WebGLRenderer). `main.ts` boots, `shelf.ts` is the
  CSS 3D shelf, `detail.ts` the modal detail view, `inventory.ts` search and filters, `viewer.ts` the three.js viewer
  (loaded on demand), `ink.ts` the line drawings, `types.ts` the catalogue types.
- `public/catalogue.json`, `public/catalogue.schema.json`: the catalogue and its JSON Schema (field notes inside).
  Built output only; the deployed copy sits beside `index.html` in the parent folder.
- `public/glb/<id>.glb`, `public/previews/<id>.webp`: compressed GLBs and preview stills. Not duplicated in this
  source folder; they are the deployed files in the parent folder.
- `scripts/build_catalogue.py`: stages GLBs from the sources and writes `catalogue.json`. `scripts/inventory_data.py`
  holds the hand-checked titles, categories and materials. `scripts/render_previews.py` + `tools/render/` render the
  stills and measure model bounds in headless Chrome. `scripts/test_page.py` is the Playwright check.
  `scripts/stage_lab.py` copies `dist/` into the lab folder and adds the lab navigation script.

## Rebuild

```sh
npm install
node scripts/dump-objects-info.mjs                 # objects' info blocks from src/objects (read only)
python3 -I scripts/build_catalogue.py files        # stage GLBs (glTF-Transform for the few that need compressing)
node tools/render/build.mjs && python3 -I scripts/render_previews.py
python3 -I scripts/build_catalogue.py catalogue
npm run build && python3 -I scripts/stage_lab.py ../   # into plan-studio/library/
python3 -I scripts/test_page.py http://127.0.0.1:PORT/plan-studio/library/ OUT_DIR
```

Source paths are constants at the top of `build_catalogue.py`.

## Linking from the twin

- `/plan-studio/library/?item=<inventory id>` opens a piece, e.g. `?item=kowhai-hero-liv-01`.
- `/plan-studio/library/?twin=<twin library id>` opens the piece the twin uses, e.g. `?twin=HERO-LIV-01`.
- `/plan-studio/library/?category=<id>` picks a shelf tab (architecture, furniture, lighting, kitchen, bathroom,
  objects, outdoor, nature).

## Limits

- Only compressed GLBs (Meshopt geometry, WebP textures; 27.8 MB in all) are deployed. Blender masters (1.4–4.9 MB
  each, 28.8 MB together), uncompressed GLBs and the objects’ high-quality GLBs exist and are listed per item under
  `notDeployed` (text, never links), but would take the deploy past about 40 MB.
- Model bounds are measured from each file; stated sizes are copied from the source and can differ.
- The birds and sprigs are drawn at a common field-guide size, not life size.
- Tested in headless Chrome with SwiftShader WebGL at desktop and phone widths; not yet on a physical phone or in
  Safari.

## Next steps for the architecture platform

1. Have `src/twin/library.ts` read `catalogue.json`: filter items with `twin`, load `files[0].url` (binary GLB, no
   base64 needed on the lab), and use `twin.role`, `twin.fit` and `twin.turnRadians` as it does today.
2. Add pieces to slots by `category`/`type` beyond the 39 twin roles (the procedural NZ objects have no role yet).
3. If masters or full GLBs should be downloadable, host them where size is not a constraint and add them to `files`
   with `role: "master"` or `"full"`.
4. Saved collections, upload and review, and material variants need a backend and permissions; they are shown on the
   page as not built yet.
