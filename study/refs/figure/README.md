# Figure look: reference notes

Kate's four reference images set the look for every figure on the assembly bench (the 3D vending machine first, then the
drawn machines). This file records what each one contributes and the palette we settled on. The recipe lives in one place,
`StudyKit.figMat` in `kit.js` (`figMat(kind, colour)` for SVG drawings, `figMat.three(THREE, kind, colour)` for three.js;
kinds: metal, plastic, glass, rubber, painted, wood; `figMat.palette` holds the hexes below).

## The references

| File | What it contributes |
|---|---|
| `ref-nine-machines.webp` | Nine pastel isometric machines (snacks, soda, claw, gacha, gumball, soft serve, coffee, ramen, prize locker). Each case is one pastel tint of frosted acrylic with the mechanism readable through a see-through side; three-quarter isometric from slightly above; one long navy drop shadow to the lower right on paper white; small readable label pills (SNACKS, SODA) rather than baked-in copy. |
| `ref-snack-soda-tall.webp` | A tall translucent "Snack & Soda" machine: blush front frame and mint side case with visible frame rails and corner balls; copper spiral coils and refrigerant pipe, finned condenser and a cylindrical cooling unit at the back; pale-mint plastic housings for the drive motors and coin mech with a small green PCB; a keypad with SELECT › PAY › COLLECT; products in saturated pastels (strawberry, blueberry, lime) with label bands. We keep everything except the faces on the products (no characters: the appeal comes from palette and proportion, which keeps it credible for senior students). |
| `ref-six-learning-machines.webp` | Six translucent learning machines, each tinted one pastel and keyed to one topic: physics lab (mint), soda chemistry mixer (peach), donut conveyor (blush), drum machine (sky), solar crane (butter), coin sorter (lavender). Rule adopted: **one case tint per machine**, which also keys the machine's subject chip, so the set reads as a family at a glance. |
| `ref-physics-lab-pinball-annotated.webp` | The annotation style: part labels in small caps with thin leader lines (CIRCUIT BOARD · sensor inputs; BALL LAUNCHER · spring compression), concept callouts beside the part they explain (BUMPER — elastic collision), vectors and paths drawn on the surface where the physics happens (velocity vector, trajectory, acceleration arrow) in the machine's accent colour, a small in-world PHYSICS DATA card with the live numbers, and glowing indicators used sparingly (one or two soft points, never a glow wash). |

## The palette we settled on

| Role | Hex | Where |
|---|---|---|
| Paper-white ground | `#F7F3EC` | renderer clear colour and the drawing backdrops |
| Drop shadow | `#1B2452` at 62 % | one long navy shadow to the lower right (key light upper-left-behind, soft front fill) |
| Case tints | blush `#F3B8C8` · mint `#BFE8D6` · lavender `#D9CBF2` · butter `#F7E7A6` · sky `#BFDDF5` · peach `#F9D2B8` | frosted acrylic cases (glass kind, opacity 0.3, roughness 0.3); frame rails and corner balls in the case's second tint |
| Products | strawberry `#EE8FA6` · blueberry `#8FB8EE` · lime `#AFD873` · butter `#F3D56E` · peach `#F6B384` | painted kind, roughness 0.28 for one clear highlight; a white label band on every product, no text or faces |
| Copper | `#D59A6A` | coils, refrigerant lines (metal kind, metalness 0.9) |
| Brushed steel | `#CBD3DD` (dark `#8F9BAA`) | trays, cash box, condenser fins, cooling unit |
| Mint plastic | `#CFECDD` | motor and coin-mech housings, fans |
| PCB green | `#5FA87A` | the small board on the coin mech, the controller |
| Label pills | white `#FFFFFF`, ink `#4E4868`, line `#DCD6EA` | in-scene labels and the data card (HTML/SVG overlay projected from the model, never baked into it) |

Edges: every opaque material carries a view-dependent rim darkening (`figMat.three`, FIG_RIM 0.35–0.55) so silhouettes stay crisp without an outline pass.

## Case tint per machine

| Machine | Tint | Subject chip |
|---|---|---|
| vend (vending machine) | mint case, blush frame | Physics |
| phone | sky | Physics (electricity) |
| queue | lavender | Maths and statistics |
| plan (floor-plan studio) | butter | Design and visual communication |
| bike (downhill, NCEA ski run) | peach | Physics (mechanics) |
| vinyl | blush | Physics (circular motion) and waves |
| pinball | sky | Physics (mechanics) |
| shaky (Shaky Isles book) | peach | Earth and Space Science |

## The shell uses the same palette (25 Oct 2026)

The kit chrome around every machine now follows the figures, so the bench reads as one family:

- Ground is paper white (`--as-bg:#F7F3EC`), ink is navy (`--as-ink:#222A55`, drawing ink `--ink:#262E5C`), shadows are navy-tinted.
- Every machine has a case tint even without `caseTint`: the table above, otherwise its subject's tint (science sky, chemistry and biology mint,
  maths lavender, English blush, social studies peach, digital technologies blush, technology butter). `StudyKit.tintFor(id)` returns it.
- The tint is a surface colour with navy text on it: the app icon, the current step, the exam countdown, picked options and the canvas wash.
- `--acc` (and `StudyKit.accentFor(id)`) is the tint's deep shade (sky `#3A6FB8`, mint `#2A7D63`, lavender `#6A50BE`, blush `#B5466F`,
  butter `#8A6510`, peach `#B2552D`), at least 4.5:1 on white, for lines, highlights and the places that put white text on the accent.
- Primary and check buttons are navy on every machine. The yellow highlight (`--as-sun`) is the butter pastel.
- The drawing palette (`--sun`, `--earth`, `--land`, `--hot`, `--cold`) uses the product pastels, slightly deepened so thin lines still read.

## Candidates (from the six-machine reference; noted, not built)

- Pinball physics lab → momentum, elastic collisions and projectiles (AS91171 / AS91524)
- Coin sorter math vault → sorting, counting and the sort algorithm (digital technologies, statistics)
- Donut conveyor factory → motion and automation
- Solar power crane → energy conversion: solar → motor → kinetic (AS92047 / AS91171)
- Soda chemistry mixer → molecular mixing and pH (chemistry)
- Beat box drum machine → sound waves, rhythm and frequency (waves, the vinyl machine's cousin)

## Allen in the same palette

Kate chose the pared-back Allen on a mint disc (25 Oct 2026). `StudyKit.allen.svg(look, opt)` now defaults to `style:"pastel", disc:"mint"`:
no sun ring, no gold tag (the name is a small lavender pill in ink), a 6-unit outline, no sheen strokes, tan softened toward peach
(`#E8B28C`). `opt.disc` picks another pastel or `"none"`; with `opt.scene` the unlocked place fills the circle instead of the disc.
The old plum badge is reachable only as `style:"badge"` for comparison, and it too has lost the ring and tag. Scene suns, the helmet
stripe, goggles and the "Butter" collar use the butter pastel (`#F7E7A6`). Rendered exports for pages that use an image rather than the
kit: `allen/pastel-mint.webp` (700 × 490) and `allen/pastel-mint-bust.webp` (240 × 240); the earlier `coat-*.webp` renders are untouched.
