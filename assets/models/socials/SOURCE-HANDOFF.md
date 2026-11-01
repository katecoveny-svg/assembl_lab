# Social studies exam desk: Blender source and web handoff

`build_socials.py` builds the whole diorama from primitives in Blender 5.2 (the `bpy` module), exports `socials-desk.glb` (about 0.9 MB, no textures) and renders the study-card hero with Cycles. Run it with `python build_socials.py` (or `--no-render` for the GLB only). `board-sample.png` is a capture of the machine's own graph drawing, painted on the board for the hero only.

Metres. Blender is Z-up; the GLB is Y-up: Blender `(x, y, z)` is GLB `(x, z, -y)`.

## Nodes the lesson drives (`study/m/socials-scene.js`)

| Node | What the lesson does |
|---|---|
| `BOARD_FACE` | Gets the step's live drawing as a texture (800 × 420 proportions, glTF UVs). |
| `HAND_HOUR`, `HAND_MIN` | Turn about local Z: the hour hand marks where Section A ends. |
| `BAR_0` … `BAR_5` | Scale Y = value ÷ largest value × 0.34; hidden when there is no value. |
| `TOKEN_0` … `TOKEN_4`, `TOKEN_YOU` | Slide along local X (−0.6 to 0.6) to each person's position on the continuum. |
| `BRANCH_LEGISLATIVE`, `BRANCH_EXECUTIVE`, `BRANCH_JUDICIAL`, `BEEHIVE`, `PARLIAMENT_HOUSE` | Lift and glow for the chosen feature; tappable. |
| `JETBOAT`, `BULB_GLASS` | The boat runs on its water; the bulb glows for the "describe" and "why" lenses. |
| `BALANCE_BEAM`, `PAN_STRENGTHS`, `PAN_WEAKNESSES` | The beam tilts about Z by strengths − weaknesses; the pans counter-rotate to hang level; pans are tappable. |
| `CARD_FLIP` | Flips about X. |
| `BLOCK_0` … `BLOCK_5` | One block per paragraph part (4 peach for paragraph 1, 2 lilac for paragraph 2). |

This is an illustrative desk, not a model of any real building or product: the Beehive, Parliament House and the jet boat are stylised.
