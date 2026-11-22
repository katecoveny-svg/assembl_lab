# The asset library

An architect or client scrolls through furniture, lighting, planting, fittings and finishes shown as studio pictures,
picks what they like for a project, and sees it placed in the 3D model. Everything in it is a proposal: the pictures are
renders of the models themselves, not photographs, and a placed piece stays labelled proposed.

## What is in it

One catalogue, `plan-studio/twins/src/twin/library/catalogue.ts` (pure data, no imports), lists every pickable piece:
id, category, title (what it is, never a brand or product), the model's own size in millimetres, what it is made of,
finish options where the piece supports them, the rooms it suits, its fit (floor, wall, hang, surface), its licence and
credit, and its picture. Ten categories: seating, tables, beds, storage, lighting, rugs and textiles, decor and sculpture,
kitchen and bath fittings, native planting, outdoor.

- **Twenty-four pieces built in code** for this library (`library/pieces.ts`, ids `LIB-…`): a bouclé sofa, a knitted
  armchair, a dining chair with a woven cord seat, a counter stool, a solid oak dining table, a travertine coffee table,
  an oak bedside table, a queen bed with washed linen and a knitted throw, a fluted oak sideboard, a fluted ash wardrobe,
  a pleated linen pendant, a tripod floor lamp, a turned ash table lamp, a hand-knotted rug, a folded chunky-knit throw,
  an S-fold linen curtain, two sculptures (a pierced stone form and a twisted bronze ring), a thrown stoneware vase, an
  arched mirror, harakeke, tī kōuka, a ground fern with koru and a ponga. Licence: assembl's own.
- **Thirty-eight legacy GLB pieces** from Kate's library (`library.ts`): the Kōwhai Studio pieces (CC BY 4.0, Kōwhai
  Studio 3D generator, Kate Hudson, assembl) and the curated pieces (owner supplied, cleared for use by Kate Hudson, not
  independently verified). Kate, 22 Nov 2026: "procedural is key". They stay working and credited, marked
  `status: 'legacy'`, and seventeen of them name the piece built in code that now stands in for them (`replacedBy`).
  The rest (kitchen appliances and tapware, the bathroom set, the speaker, the guitar, the linear pendant, nīkau,
  pōhutukawa and the outdoor set) are to be rebuilt in code next; until then they keep their licence notes. The generic
  electric car in `library.ts` is left out: it is not a fit-out piece.

`plan-studio/library/` (the design inventory page) is a separate, older snapshot and is not read by any of this.

## How the pieces are made (Kate's photoreal standard)

The reference is room-at-dawn (MIT), a photoreal bedroom built entirely in three.js code.

1. **Every surface has a fine texture made in code** (`library/ptex.ts`): plain and twill weaves with slubbed threads,
   stockinette and chunky knit, bouclé loops, knotted rug pile, flat-sawn and end-grain timber with rays and pores,
   travertine, limestone, marble and basalt, trowelled plaster, brushed metal, crackle glaze, corky bark and leaf veins.
   Each is pure, seeded and deterministic and tiles without a seam; each gives a normal map, a roughness map and a colour
   map at true scale (geometry UVs are in metres). Cloth gets sheen. No downloaded textures or HDRIs.
2. **Shapes and folds are built in code** (`library/geo.ts`): cushions are rounded boxes pushed out by height fields
   (crown, bowed sides, a rolled front, fill lumps, wrinkles pulled in from the corners) with welts along the seams; the
   duvet is a sheet laid over the mattress that rolls over the edge, hangs and pleats; pillows have corner creases; the
   throw is folded in layers. The two sculptures are signed-distance sculpting (`library/sdf.ts`: smooth unions and cuts,
   a twist of space, chisel noise) turned into closed meshes by marching cubes, with its case table worked out in code.
3. **Contact shadows, soft shadows, AgX and a light grade**, and 4. **many jittered frames averaged** for the pictures:
   see below. On the 3D page the pieces use the page's own lighting, with a soft contact shadow under each floor piece.

## How the pictures are made

`tools/library-shots.py --tb <build dir>` (a folder with three r187 and vite installed) builds the tool page
`plan-studio/twins/src/library-shots.html` (not deployed), opens it in headless Chromium (software rendering), and for
every catalogue piece measures the built model (bounds in mm, triangles) and renders its picture in the studio
(`library/studio.ts`): a seamless plaster sweep, a soft key light that moves within its softbox from frame to frame, a
fill light from a different part of the sky each frame (each with its own shadow, so together they make soft contact
shadows), a dim studio environment for reflections, AgX tone mapping, and a light grade (a touch of warmth in the
shadows, slightly less saturation, a soft vignette). Each picture is 32 frames averaged, each frame moved by a fraction
of a pixel (clean edges) and through a small lens aperture (a little depth of field). Out: 800 × 800 WebP, at most
60 KB, in `plan-studio/twins/library/pics/`, and the manifest `plan-studio/twins/library/catalogue.json`. Frames are
averaged in memory; nothing else is written. Options: `--ids A,B` (only some), `--measure-only`, `--frames N`,
`--still out.png --id ID --opts '{"dist":0.9,"at":[x,y,z]}'` (one close-up).

## Picking and placing

- **Ops page** (`architecture/js/library.js`, `library-view.js`, `selections.js`, `architecture/library.css`): a Library
  section in each project's Presentation tab (add-on sections may now name their tab: `registerProjectPanel({ tab })`).
  One horizontal scroller per category with snap, or a grid, and a category filter; big pictures, a title and a size;
  tap for a detail card (size, material, finishes, credit). "Add to this project" puts the piece on the selection board
  with a quantity and a room. The board is a visual strip and can remove picks. Picks are kept on the project as
  `selections` (in the shared records: the project row's `extra.selections`). Viewers of the shared records can look,
  not change. Only `library.js` loads with the page; the rest loads when the Presentation tab is first shown.
- **3D page** (`library/picks.ts`, `library/fit.ts`): "See them in 3D" writes the picks to the tab's session storage
  (`assembl-twin-selections`, type `assembl.selections.v1`) and opens the 3D page with `?picks=<project id>`, the same
  way the plan model is handed over. Each piece goes into a fit-out place for its role (`slot_<role>`, or the sofa, bed
  or dining table of a code-built suite) in the room it was picked for, when it fits; the rest wait on a "To place"
  strip and are dragged into a room. A piece is never placed through a wall: its turned footprint is checked against the
  walls, the rooms and the pieces already placed, and a drop that does not fit is moved to the nearest clear spot or
  refused. The move tool (arrange.ts) asks the same question before it lets go of a piece.

## Adding a piece

1. Build it in `library/pieces.ts` (centred on its footprint, base at y = 0, front facing +z; materials from
   `library/mats.ts`) and add it to `BUILDERS`, or put its GLB in the library (`library.ts`).
2. Add its entry to `CATALOGUE` in `catalogue.ts` (title without brand names, rooms, fit, finishes, licence via `own()`
   or `glb()`).
3. Run `python3 -I tools/library-shots.py --tb <build dir> --ids <id>`, then set its `dims` to the measured size the
   script prints, and run the script again (or `--measure-only`) so the manifest matches.
4. `node --test tests/architecture/library*.test.mjs` checks ids, sizes against the model, pictures (present, WebP, at
   most 60 KB), licences, picks in both stores, viewers, the hand-over and wall-safe placement.
