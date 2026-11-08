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

## Kit v3: NVIDIA SimReady twins (`assets/twin/3/`)

v3 is not a new version of the maquette stage. It's the shared base for twins built to the grocery DC standard
(`/store/dc/`, method and estimates in `docs/SIMREADY-PLAN.md`), pulled out of the DC so each SimReady twin starts from
the same renderer, overlays and controls:

- `kit.js`: renderer and light (PBR, room environment, one soft key light, GTAO and bloom by tier), quality tiers with a
  one-step drop below about 24 fps and `?quality=low|mid|high`, the meshopt GLB loader with one progress bar, `Instanced`,
  `Repeat`, `bake()` (now safe for quantised meshopt attributes), shadow stand-ins, plain figures in hi-vis, food-plant
  whites or scrubs, the guided tour, 3D tags, path lines and the focus ring, and the bottom bar (tour, speed, run or
  pause the model, the phone figures sheet). `?clean`, `?stop=N`, `?t=` and `?frames=N` work as on the DC.
- `path.js`: the DC's `Path` (jobs timed by distance over speed plus handling), with `back()` for trailers that follow
  their truck. No rendering, so a twin's `sim.js` imports it and runs in Node.
- `overlay.css`: the DC's site-v2 overlays (title card, figures panel, tour caption, bottom bar, tags, loader, still).

A twin brings `layout.js` (the plan, shared by model and scene), `sim.js` (the model, no rendering, tested headless),
`world.js` (the scene and a `sync()` that draws the model's state) and `main.js` (the wiring). Uses: `/dairy/plant/` and
`/ed/floor/`. The DC itself still has its own copies; moving it onto the kit is a small follow-up.
