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
