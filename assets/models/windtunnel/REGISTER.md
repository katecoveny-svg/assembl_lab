# Registering the wind tunnel machine

The machine's own files are committed (`study/m/windtunnel.*`, `study/tests/windtunnel.test.mjs`,
`study/thumbnails/windtunnel.jpg` and this folder). The shared registry files are **not** committed from this branch, because
other machines are being added in parallel. These are the exact entries used for local testing; add them when merging.

## `study/data.js`: `machines.windtunnel`

Inserted as the first key of `"machines": {`:

```json
"windtunnel": {"title": "The wind tunnel machine", "href": "m/windtunnel.html", "desc": "An open-wheel race car made in Blender, on a rolling road in a wind tunnel. Turn up the wind and read the drag from F = ½ρv²C_dA (double the speed, four times the drag); steepen the rear wing for downforce and grip; balance thrust against drag and find the power P = Fv; move a smoke wand to see the streamlines bunch up under the wing; and open the rear-wing flap to cut drag. Practice questions you can work through with Allen.", "blurb": "Drag, downforce, balanced forces, P = Fv and smoke lines on a single-seater.", "tags": ["NCEA L2 Physics", "Year 11", "Year 12", "Physics"], "icon": "fly", "years": [11, 12, 13], "level": "L2", "standards": []},
```

(`icon: "fly"` reuses an existing glyph; there is no wind tunnel glyph in `study/kit.js` yet.)

## `study/kit.js`: `MSUB`

After `earthspace:"science",` add:

```js
windtunnel:"science",
```

## `study/index.html`

1. `THREE_PREVIEWS`: add `"windtunnel"` to the set:

```js
const THREE_PREVIEWS=new Set(["windtunnel","engine","fly","socials","earthspace", … ]);
```

2. The Blender label list in the card template: add `||id==="windtunnel"` after `id==="earthspace"`:

```js
(id==="claw"||id==="slushie"||id==="phone"||id==="vinyl"||id==="bike"||id==="heart"||id==="socials"||id==="earthspace"||id==="windtunnel")?"Blender render · open 3D lesson":…
```

## Rebuild the model

```
python build_windtunnel.py --no-render      # windtunnel.glb only (bpy 5.x as a module)
PREVIEW=1 python build_windtunnel.py        # fast 640×400 hero preview
SAMPLES=48 python build_windtunnel.py       # windtunnel.glb + windtunnel-hero.png (1600×1000)
```

The hero PNG is converted to `windtunnel-hero.jpg` and resized to `study/thumbnails/windtunnel.jpg` (800×500).
