# The vending machine: parts list (written before any 3D code)

A stylised, see-through figure of a spiral (coil) snack-and-drink vending machine, for the `vend` study machine
(NCEA Level 2 Physics AS91171, Mechanics). Every part below becomes one function in `m/vend3d.js`, placed at the
named position, and `m/vend3d.check.mjs` checks these boxes for clashes and clearance in Node before anything is drawn.

**Coordinates.** Millimetres, machine frame: origin at the centre of the floor under the cabinet; **x** to the right (as a
customer sees it), **y** up, **z** towards the customer. A part's *box* is its axis-aligned bounding box
`[x0, y0, z0] → [x1, y1, z1]`. Moving parts also list their *travel* (the range the box sweeps through).

**Truth labels.** *Stated* = a figure given in the NCEA Everyday-Engineering Practice Pack. *Standard* = a common
published size (e.g. a 330 ml can). *Estimate* = our assumption, chosen to be plausible for a real machine of this size.

## 1. Cabinet and envelope

| # | Part | Dimensions (mm) | Position (box) | Notes |
|---|---|---|---|---|
| 1 | Cabinet shell (steel, powder-coated) | 990 W × 1830 H × 850 D, walls 40 (incl. insulation) | [-495, 0, -425] → [495, 1830, 425] | 1830 × 990 × 850 Stated; 40 mm walls Estimate. Interior: [-455, 120, -385] → [455, 1790, 385] |
| 2 | Base / kick plate | 990 × 120 × 850 | part of #1 (y 0–120) | 120 mm plinth Estimate; holds the fridge deck |
| 3 | Service-column divider (steel, 2 mm) | 2 × 1670 × 765 | [309, 120, -385] → [311, 1790, 380] | Splits product bay (x -455…309) from service column (x 311…455). Estimate |
| 4 | Glass door (toughened, 6 mm) + frame | glass 750 × 1260 × 6; frame 35 wide | glass [-430, 410, 419] → [320, 1670, 425]; frame [-465, 375, 410] → [355, 1705, 425] | Hinged on the left. 6 mm glass Standard; window size Estimate |
| 5 | Front service panel | 144 × 1670 × 40 | [311, 120, 385] → [455, 1790, 425] | The steel face the coin slot, keypad and cup sit in. Estimate |

## 2. Coin mechanism and payment

| # | Part | Dimensions (mm) | Position (box) | Notes |
|---|---|---|---|---|
| 6 | Coin slot (in panel) | 32 × 4 slot, bezel 60 × 24 × 6 | [353, 1378, 425] → [413, 1402, 431] | Takes a $2 coin (Ø 26.5 mm, 2.2 mm thick, 10.0 g; RBNZ specification, Standard) |
| 7 | Coin validator (electronic) | 100 W × 230 H × 90 D | [333, 1130, 290] → [433, 1360, 380] | Coin free-falls ~150 mm past its sensors. Size Estimate |
| 8 | Coin return lever | 18 × 70 × 30 (knob) | [425, 1330, 425] → [443, 1400, 455] | Pivots at top; swings 25° outward. Estimate |
| 9 | Coin chute (to cash box) | 40 × 540 × 40 | [363, 580, 320] → [403, 1120, 360] | Estimate |
| 10 | Cash box | 120 × 110 × 80 | [323, 460, 290] → [443, 570, 370] | Estimate |
| 11 | Coin return cup | 90 × 70 × 60 | [338, 790, 395] → [428, 860, 455] | Recessed into the panel. Estimate |
| 12 | Bill validator (note reader) | 70 W × 120 H × 200 D | [348, 940, 180] → [418, 1060, 380] | Face flush with panel (bezel 80 × 130 × 6 at z 425–431). Estimate |
| 13 | Keypad + display | 90 W × 150 H × 15 D | [338, 1450, 425] → [428, 1600, 440] | 4 × 3 keys and a 2-line display, proud of the panel. Estimate |
| 14 | Controller board (VMC) | 160 × 220 × 30 | [320, 600, 160] → [440, 820, 190] | Vending machine controller, behind the cash box. Estimate |
| 15 | Power supply (24 V DC) | 120 × 60 × 180 | [325, 1620, 180] → [445, 1680, 360] | Estimate |

## 3. Product trays, coils and motors

Six trays, five coils each (Stated: 6 rows × 5 coils). Coil centre spacing (lateral pitch) 150 mm (Stated).

| # | Part | Dimensions (mm) | Position (box) | Notes |
|---|---|---|---|---|
| 16 | Tray plate, row k (k = 0…5) | 754 W × 4 × 540 D (steel) | x [-450, 304], y [Yk, Yk+4], z [-240, 300] where Yk = 416 + 200·k | Row pitch 200 mm Estimate (plate tops at 420, 620, 820, 1020, 1220, 1420). Tray 3 gives the pack's 0.80 m drop to the pad. The 113 mm gap between tray fronts (z = 300) and the glass (z = 413) is where a can falls |
| 17 | Tray back rail (holds the motors) | 754 × 60 × 10 | x [-450, 304], y [Yk+4, Yk+64], z [-240, -230] | Estimate |
| 18 | Spiral coil (helix), row k, column i (i = 0…4) | Ø 144 outer, 4 mm wire, 7 turns over 500 mm; helix pitch 70 mm | axis x = −372 + 150·i (−372, −222, −72, 78, 228), axis y = Yk + 81; box x [cx−72, cx+72], y [Yk+9, Yk+153], z [−230, 270] | Rotates about its own z axis. Ø 144 so an upright can (66 × 115, diagonal 133) clears the wire; 5 mm above the plate; 6 mm between neighbouring coils. Estimate |
| 19 | Coil drive motor (24 V DC gearmotor) + coupling | 50 W × 50 H × 60 D | box x [cx−25, cx+25], y [Yk+36, Yk+86], z [−300, −240] | One per coil, behind the back rail. Rated torque ≈ 0.5 N·m, ~30 rpm (Estimate) |
| 20 | Product: can, trays 0–3 | Ø 66 × 115 tall, 350 g | one per coil pocket, 7 per coil; standing on the tray plate inside the coil at z = 257 − 70j | 350 g Stated; Ø 66 × 115 Standard for a 330 ml can |
| 21 | Product: bar, trays 4–5 | 40 W × 110 H × 20 D, 40 g | one per pocket, 7 per coil, standing on end | Estimate (a small snack bar; a 130 × 160 bag would not fit inside a Ø 144 coil) |

Coil pockets: the coil holds one product between turns, so the front product's leading face sits 10 mm behind the tray front edge (z = 300) and each turn of the coil moves the row forward 70 mm. The front product leaves the tray when its centre of mass passes the edge, tips into the 113 mm gap in front of the trays (its path is checked as a box at z 323–389) and free-falls to the pad.

## 4. Delivery

| # | Part | Dimensions (mm) | Position (box) | Notes |
|---|---|---|---|---|
| 22 | Delivery bin (floor + sides) | 754 W × 196 H × 325 D, walls 4 mm | [-450, 204, 60] → [304, 400, 385] | Spans the whole product bay so a can from any coil lands in it. Pad top at y = 220, so drop heights from the tray plates (y = 420 + 200k) are 0.20, 0.40, 0.60, 0.80, 1.00, 1.20 m. Estimate |
| 23 | Rubber landing pad | 734 × 12 × 305 | [-440, 208, 70] → [294, 220, 375] | The soft pad that lengthens Δt on impact (Stated: 0.050 s stop) |
| 24 | Delivery flap (push door) | 700 W × 185 H × 5 D, hinged at the top | closed [-410, 205, 420] → [290, 390, 425]; travel: swings inward 0–35° about the hinge at y = 390, z = 422 | At 35° the bottom edge is at z ≈ 316, y ≈ 238. Hinge 10 mm below the door's bottom rail (y = 400). Estimate |
| 25 | Chute guide (sloped deflector above the bin) | 740 × 6 × 120 | [-440, 300, −30] → [300, 306, 90], tilted ~10° | Keeps a falling can off the back of the bin. Estimate |

## 5. Refrigeration deck (behind the bin, inside the plinth and lower cabinet)

| # | Part | Dimensions (mm) | Position (box) | Notes |
|---|---|---|---|---|
| 26 | Compressor (hermetic) | Ø 180 × 200 H | [-250, 130, −330] → [−70, 330, −150] | ~120 W running (Estimate); cycles on/off |
| 27 | Condenser coil + fins | 300 W × 200 H × 50 D | [−30, 130, −370] → [270, 330, −320] | Estimate |
| 28 | Condenser fan | Ø 200 × 30 | [20, 130, −310] → [220, 330, −280] | Spins ~1200 rpm when the compressor runs. Estimate |
| 29 | Evaporator (cold plate) in the rear duct | 600 W × 300 H × 50 D | [−400, 700, −385] → [200, 1000, −335] | Behind the trays (tray backs at z −240; motors to −300). Estimate |
| 30 | Evaporator fan | Ø 150 × 30 | [−175, 1020, −380] → [−25, 1170, −350] | Circulates cold air up the back and over the trays. Estimate |
| 31 | Capillary / suction lines | Ø 8 | runs from #26 up the back wall to #29 (z ≈ −380) | Drawn as one tube. Estimate |

## 6. Lighting

| # | Part | Dimensions (mm) | Position (box) | Notes |
|---|---|---|---|---|
| 32 | LED strip, left | Ø 25 × 1250 | [−455, 410, 330] → [−430, 1660, 355] | In the gap in front of the trays, at the window's left edge. ~10 W each (Estimate) |
| 33 | LED strip, right | Ø 25 × 1250 | [280, 410, 330] → [305, 1660, 355] | In front of the trays at the window's right edge, 4 mm clear of the divider; 19 mm clear of a can falling from coil 4 |

## 6b. Case frame, label bands and materials (added for the figure look, see refs/figure/README.md)

| # | Part | Dimensions (mm) | Position | Notes |
|---|---|---|---|---|
| 34 | Frame rails (12) | 28 × 28 section | along every edge of the outer box, inset 14 mm | Blush painted (#F2A9BF); meet the corner balls by design (the checker skips case-to-case pairs) |
| 35 | Corner balls (8) | Ø 40 | at the eight corners of the rail frame | Mint plastic (#9FDCC4) |
| 36 | Product label bands (210) | cans: sleeve Ø 69 × 34 tall; bars: slip 42 × 26 × 22 | around each product at mid-height | White, no text; the "label pill" of the reference figures |
| 37 | Case panes | 4 single planes (back, two sides, top) + door pane + service-column pane | on the cabinet faces | Frosted mint glass at opacity 0.16 (door 0.10, column blush 0.24): the contents are covered once |

Materials come from `StudyKit.figMat` (kit.js): copper for coils and refrigerant lines, brushed steel for trays, cash box, condenser and cooling unit, mint plastic for motor and coin-mech housings (with a green PCB), painted pastels for products, one soft LED indicator on the keypad. Annotations (part labels with leaders, callouts, vectors, the data card) are an SVG overlay projected from the model, not geometry.

## 7. What the clearance checker caught (first run, before any 3D code was drawn)

`node m/vend3d.check.mjs` on the first version of this table reported 249 failures. Real ones, now fixed:
- **Right LED strip through the divider** (12 mm overlap at x 296–321 vs the divider at x 309–311): moved to x 280–305.
- **Delivery flap swinging the wrong way** (outward, through the cabinet's front allowance) and **hinged too close to the door's bottom rail** (3.3 mm at full swing): the hinge dropped to y = 390 (10 mm below the rail) and the swing is inward.
- **Delivery bin poking 5 mm into the front wall** (z to 390 vs the wall's inner face at 385): bin depth trimmed to z = 385, pad to 375.
- **Front service panel** was declared as an interior part although it is the front wall of the column: declared as a front-face part.
Checker artefacts, fixed in the checker: a cylinder turning on its own axis (coil, fans) was being swept as a tumbling box, so coils "left the cabinet" and "clashed" with their neighbours at 30°. Parts now declare `cyl` and keep their box when rotating about that axis. The falling-product path was then defined for all 30 coils, not just the middle column.

Final run: 358 parts (with the 12 rails and 8 corner balls), 52 554 static pairs, 64 moving parts × 18 poses, no clashes, every moving part ≥ 5 mm; tightest is 6 mm between neighbouring coils, then 10 mm flap-to-door-rail. A first placement of the rails on the outer edges clashed with the door frame by 14 mm; they now sit inset 14 mm on the cabinet faces.

## 8. Clearance rules the checker enforces

1. No two parts' boxes may overlap, unless one is declared to sit *inside* the other (e.g. everything inside the cabinet; products inside their coil; the rubber pad inside the bin).
2. Every moving part (coil, flap, lever, fans, falling product) sweeps its full travel and must keep **≥ 5 mm** from every other part it is not attached to, at every sampled pose.
3. Every part must lie within the cabinet interior, except the parts declared on the front face (door frame, service panel and its fittings, flap, lever, keypad), which may protrude to z ≤ 455.
4. The falling product's path (from the tray front edge to the bin pad) must be clear of the trays below it and of the flap in its closed position.

## 9. Physics figures used by the steps

- Can: m = 0.350 kg (Stated). Drop from tray 3: h = 0.80 m (Stated) → v = √(2gh) = 3.96 m s⁻¹ (g = 9.8).
- Stop on the rubber pad: Δt = 0.050 s (Stated) → F = Δp/Δt = 1.39/0.050 ≈ 27.7 N.
- Doubling h to 1.60 m → v = 5.6 m s⁻¹ (×√2), momentum +41 %, kinetic energy ×2 (Stated reasoning).
- $2 coin: 10.0 g, falls 0.15 m through the validator (Estimate) → 0.175 s, 1.7 m s⁻¹.
- Coil motor: friction on n cans in the coil, F = μ n m g (μ ≈ 0.3 Estimate) at r = 0.072 m → τ = F r ≈ 0.52 N·m for 7 cans; P = τω at 30 rpm ≈ 1.6 W.
- Running cost (Estimate): compressor 120 W × 50 % duty + lights 20 W + standby 10 W = 90 W average = 2.16 kWh/day at $0.30/kWh ≈ $0.65/day; cost per vend = daily cost ÷ vends per day.
