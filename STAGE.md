# The twin stage

Nine 3D twins run on one shared rendering and interaction base, the twin stage in `assets/twin/1/` (`stage.js`, `stage.css`). It uses three.js 0.170, vendored in `assets/vendor/three/` and loaded through an import map in each page.

The nine twins are dairy, home, cafe, store, ed, office, tourism, stay and retail. Each page imports `createStage` from `/assets/twin/1/stage.js`. The stage gives every twin:

- a maquette look under the real sun for the twin's place and clock, plus weather
- GPU flows
- parts you can hover or pin, each showing its number and source
- a guided tour, Compare ghosts and optional ambient sound
- a season and time dial
- quality tiers (`?quality=low|mid|high`)
- a still image from `assets/posters/<id>.webp` when WebGL can't start (`?poster=1` renders that still)

## Keep these paths when syncing a bundle

This repo is the source of truth for the paths below. Pull, edit them here, and push; Vercel deploys `main` automatically. Don't copy a bundle built elsewhere over them, because it will put the old r128 pages back.

- `assets/twin/**`, `assets/vendor/three/**`, `assets/posters/**`
- `dairy/`, `home/`, `cafe/`, `store/`, `ed/`, `office/`, `tourism/`, `stay/`, `retail/` (each `index.html`)

Breaking changes to the stage go in a new folder (`assets/twin/2/`), so existing twins keep working.

## Stage v2: authored GLB venues (`assets/twin/2/`)

`assets/twin/2/stage.js` re-exports everything in v1 unchanged and adds `loadTwinAsset()` (GLTFLoader from the vendored three 0.170, no Draco or meshopt) and `prepareAsset()`. A twin opts in by importing from `/assets/twin/2/stage.js` instead of `/assets/twin/1/stage.js`; `stage.css` stays at v1. Only the café uses v2 so far; the other eight twins are untouched.

`loadTwinAsset({ url, contractUrl, contract, rootNode })` fetches the rig contract first and refuses a different contract id, a GLB without the root node, or a GLB missing any `required_nodes`. It never substitutes: the twin keeps its procedural maquette when the load is refused or fails. The pattern for a twin:

- Author the GLB in the twin's own plan coordinates (metres, glTF +Y up), so it drops in at identity and the page's people, plates and flows stay aligned.
- Tag nodes with `extras.twin_part` = the page's pickable group, so hover, pin, Explore and the tour work unchanged.
- Drive it through a small rig adapter that only reads the twin's existing state model. The twin's model stays the single source of every number.
- Keep the procedural maquette as the fallback (no WebGL still shows the poster, as in v1).

The café's asset, contract, adapter and rebuild script are in `assets/models/cafe/` (see its `SOURCE-HANDOFF.md`).
