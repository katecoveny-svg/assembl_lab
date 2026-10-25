# Drawing a machine in the bench figure look

Every drawn (SVG) machine should look like it belongs with the 3D figures (the vending machine, the pinball, the Shaky Isles
book): frosted pastel acrylic, painted and steel parts with a lit top and shaded side, paper ground, one long navy shadow to the
lower right, white label pills. `README.md` in this folder has the palette and the reasons; this file is the how.

The reference implementation is `m/energy.js` (tower, jug, flask, circuit).

## The helpers: `StudyKit.fig` (kit.js)

All return SVG strings. Colours are hexes (faces are mixed from them), so use `F.palette` rather than CSS variables for parts.

```js
const F=StudyKit.fig,PAL=F.palette;           // PAL.case.{blush,mint,lavender,butter,sky,peach}, PAL.product.{strawberry,blueberry,lime,butter,peach},
                                              // PAL.steel, PAL.steelDark, PAL.copper, PAL.mintPlastic, PAL.pcb, PAL.paper, PAL.shadow
F.floor(W,H)                                  // paper ground with a faint grid: replaces the old `<rect … fill="var(--chalk)"/>` background
F.box(x,y,w,h,{colour,kind,d,r,shadow})       // a solid part: front rect + lit top + shaded side (depth d up-right), navy floor shadow
F.acrylic(x,y,w,h,{tint,d,r,opacity,balls})   // a frosted case or panel (alias F.case): see-through, highlight streak, corner balls
F.cyl(cx,y,rx,h,{colour,kind})                // a cylinder standing on the floor (posts, cans, cells, towers)
F.tube(x,y,w,h,frac,{tint,fill})              // a frosted column filled to frac with a product colour (bars, levels, gauges)
F.pill(x,y,"Name",{sub,ax,ay,anchor,size})    // a white label pill; with ax,ay a thin leader runs to the part
F.plate(x,y,"NAME",{tint,size,rot})           // a name plate on a case front
F.shadow(x,y,w,{len,opacity})                 // a navy floor shadow from the footprint x..x+w at y, toward the lower right
F.mat(kind,colour)                            // = StudyKit.figMat: {fill,stroke,hi,shade} for drawing your own shapes
F.deep(tint)                                  // a darker line colour for a tint
```

Kinds: `painted` (products, bodies), `plastic` (housings, buttons), `metal` (steel, copper), `rubber` (belts, tyres), `wood`, `glass`.

## Rules

1. **Change the drawing only.** Never change the model, numbers, wording, step list, challenges, readout chips, kupu, `data-act`
   targets or their hit areas, keyboard handling or ARIA. Keep every coordinate that a tap or drag maps back to the model.
2. **Ground:** start each drawing with `F.floor(W,H)` instead of a flat `--chalk` or `--paper` rect (match the viewBox size).
3. **Objects become parts.** A rectangle that stands for a thing (a crate, a tank, a building, a battery) becomes `F.box` or `F.cyl`;
   a container you need to see into becomes `F.acrylic` or `F.tube`. Give each part one long floor shadow (the helpers do this;
   pass `shadow:false` for parts that do not touch the floor or that overlap another part's shadow).
4. **One case tint per machine** (see the table in README.md; otherwise the subject tint: science sky, chemistry and biology mint,
   maths lavender, English blush, social studies peach, digital blush). Use it for cases and panels. Use product colours
   (strawberry, blueberry, lime, butter, peach) for things inside and for data series. Steel and copper for mechanisms.
5. **Labels:** a label naming a part becomes `F.pill(…,{ax,ay})` with a leader to the part. Axis ticks, titles (`t-lab`) and live
   numbers (`t-ink`, `t-big`) stay as text.
6. **Charts and graphs** stay flat (they are instruments, not objects) but sit on the paper floor, use product colours for series,
   navy-grey (`#8F9BAA`) for axes, and may sit on an `F.acrylic` panel like a screen in a case.
7. **No characters with faces.** People are simple painted figures (head, body, legs), as in the energy jumper.
8. **Glow sparingly:** at most one or two soft highlight points per drawing.
9. **Draw order:** floor and shadows first, then parts back to front, moving things (particles, charges, balls), then pills and text.
10. **Contrast:** text on pastel stays navy ink; never put white text on a pastel.

## Check your work

Serve the repo root on port 8123 (`python3 -m http.server 8123` from the repo root), then run the step screenshotter
(`node steps.js <id>` in the session scratchpad) to get every step of a machine as PNGs plus a contact sheet. A machine is done
when every step renders with no console errors, nothing overlaps a live number, and it reads as one family with `m/energy.js`.
