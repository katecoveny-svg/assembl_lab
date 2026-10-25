# The 3D bench: turning a study machine into a real-time 3D simulator

Every study machine is a real-time three.js world that runs on the same model that marks its challenges. The SVG drawing
(`drawMain`) stays in the page underneath as the fallback: it shows when WebGL is missing, with `?lite`, or if the 3D import fails.

References, best first:
- `m/particles.js` (`particles3d`): 343 real 3D water molecules (instanced) melting from the outside in and boiling off, a gas syringe whose plunger you drag, a gauge drawn on a canvas panel, and a mountain that rises behind the bench.
- `m/energy.js` (`energy3d`): one world with four zones. The camera flies between them per step, and the overview is the test step.
- `m/sky.js` (`sky3d`): a custom per-pixel day/night shader, objects that move with the model's time, and a camera that follows a moving object.

## How it plugs in

```js
function mymachine3d(S){ /* build the world once */
  return {
    step(st, s){ /* called when the step changes: choose a view, show/hide groups and labels */ },
    update(s, st, dt, t){ /* called every frame: read the model state s and move things */ }
  };
}
StudyKit.mount({ ..., scene3d: mymachine3d, ... });
```

- Put the factory inside the machine's IIFE, just above `StudyKit.mount`, so it can read the model functions and state directly.
- `update` runs every frame, even while paused. Read the state, but never advance the model there; `cfg.tick` still owns time and physics.
  - Purely visual motion (idle bob, particles jiggling, glow pulse) is fine in `update`.
  - Gate it on `S.REDUCED` when it is large.
- Interaction in 3D:
  - `S.pick(obj, fn)` for taps.
  - `S.dragger(obj, {normal, move(p){...}})` for dragging along a plane.
  - Write to the state (for example `S.api.state.vol = ...`); the kit calls `api.redraw()` so the chips, controls and SVG update.
  - Keep every existing control, chip and challenge working. The sliders stay the accessible way in.
- SVG tap targets (`data-act`, `data-p`, `data-a` inside `drawMain`) are hidden under the 3D view. Any machine that has them must offer the same actions as 3D picks, or as `cfg.controls`.

## The S toolkit (study/kit3d.js)

| | |
|---|---|
| `S.THREE`, `S.scene`, `S.camera`, `S.controls`, `S.renderer` | the usual |
| `S.mat(kind, colour, opts)` | Cached materials. Kinds: `plastic` (clear-coated toy plastic), `matte`, `metal`, `acrylic` (frosted case), `glass`, `glow` (emissive; bloom picks up intensity > 1.2), `flat`, `liquid`. Pass `{fresh:true}` for a material you will mutate every frame. |
| `S.rbox(w,h,d,r,mat,{at,rot})`, `S.box`, `S.cyl(rt,rb,h)`, `S.sphere(r)`, `S.torus(r,t,{arc})`, `S.tube(points,r)`, `S.mesh(geo,mat)` | Meshes. Shadows are on by default and off for transparent materials. |
| `S.acrylicCase(w,h,d,tint)` | the signature frosted case with rails and corner balls |
| `S.arrow(colour)` → `a.set(fromV3, vecV3, scale)` | a force or velocity vector |
| `S.swarm(n, geo, mat, {colors:true})` → `put(i,x,y,z,s,rx,ry,rz)`, `putS(i,x,y,z,sx,sy,sz,q)`, `tint(i,c)`, `done()` | instanced crowds: molecules, cars, people, trees, coins |
| `S.puffs(n, colour, {additive})` → `put(i,x,y,z,alpha,size)`, `done()` | soft sprites: steam, sparks, glow, dust |
| `S.panel(wPx,hPx,widthUnits)` → `redraw((g,w,h)=>{...})` | A canvas-2D screen in the world, for graphs, gauges and dials. Only redraw when the numbers change. |
| `S.label({off:[dx,dy], cls:"hot"/"big"})` → `.at(v3).set(html).show(bool)` | Crisp HTML pills with a leader dot. Use `<b>` for the value and `<small>` for the second line. |
| `S.view(name, pos, target, {min,max,dur})`, `S.goView(name)` | Camera framing per step. The kit flies the camera between views. |
| `S.setFollow(fn, k, always)` | keeps a moving thing in frame |
| `S.setShadowBox(half, center)` | Tighten the shadow camera on the active zone so the shadows stay crisp. |
| `S.PAL` | Palette: `case.{sky,mint,lavender,butter,blush,peach}`, `deep.*` (≥ 4.5:1 on white), `product.*` (strawberry, blueberry, lime, butter, peach), `copper`, `steel`, `ink`, `water`, `hot` |
| `S.HQ`, `S.mobile`, `S.REDUCED`, `S.clamp`, `S.lerp`, `S.ease` | helpers |

## The look (non-negotiable)

- **Ground and light:** a paper-white cyclorama with one warm key from the upper left, so every object drops one soft navy shadow to the lower right. Neutral tone mapping keeps pastels pastel.
- **Plinths:** objects sit on rounded pastel plinths (`S.rbox(..., mat("plastic", PAL.case.X, {rough:.55, coat:.2}))`, top at y ≈ 0.3).
- **Palette:** use the machine's case tint plus one or two others. Never canary yellow; butter is `#F7E7A6` or `#F2C83C`.
- **Materials:** clear-coated toy plastics, real metal for metal, frosted acrylic and glass for containers. Keep `glass`/`acrylic` opacity low (0.1–0.3) or they wash out.
- **Things that work:**
  - Molecules move.
  - Liquids fill.
  - Wires carry glowing charges.
  - Springs compress.
  - Hot things glow and bloom.
  - Gauges have needles.
  - Things you can grab respond.

  Motion should show work happening, not decoration.
- **No faces** on figures (people, animals, toys): helmets, visors and simple bodies only.
- **No text baked into the 3D:** labels are `S.label` pills. Numbers on screens and dials are `S.panel`.
- **Honesty:** if a scale is exaggerated (molecules, planets), keep the existing `truth` line, or extend it to say so.
- **Camera:** each step frames what it teaches. The test step shows an overview of the whole world.

## Performance

- Hundreds of repeated things go in `S.swarm`, never separate meshes.
- One `S.panel` redraw per change, not per frame.
- Mutated materials need `{fresh:true}`, and you keep the reference.
- Keep transparent overdraw low.
- The kit already caps the pixel ratio, pauses when off screen, and skips bloom on phones.

## Checking

- `node --check m/<id>.js`.
- Serve the repo root (`python3 -m http.server 8123`) and screenshot each step headless with Chromium/SwiftShader:
  - flags: `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`;
  - screenshot `.playmain .canvas` after the hash changes to `#<step>`;
  - add `?lq` to the URL to skip bloom while testing.

  SwiftShader is slow (about 20 s a screenshot), so screenshot a handful of steps, not every step on every iteration.
- There must be no page errors or console errors, and the SVG fallback must still render with `?lite`.
