# The Physics Lab pinball: parts list and physics sheet

A playable, see-through tabletop pinball machine for the `pinball` study machine (NCEA Level 2 Physics AS91171,
Mechanics). Everything below is one entry in `Pinball3D.TABLE` or `Pinball3D.PARTS` in `m/pinball3d.js`: the same
numbers drive the 2D physics (`Pinball3D.Sim`), the three.js figure (`Pinball3D.create`) and the Node checks
(`m/pinball.check.mjs`). The page (`m/pinball.js`) only reads them.

**Coordinates.** Millimetres, table frame: origin at the bottom-left corner of the playfield (the drain end, the
player's left); **x** across the playfield to the right; **y** up the table, away from the player; **z** height above
the playfield. The playfield is tilted 6.5° towards the player, so a free ball accelerates down the table (−y) at
g sin 6.5° = 1.109 m s⁻². In the figure the table group is rotated by that tilt and the back legs are taller.

**Truth labels.** *Standard* = a published pinball size. *Estimate* = our assumption, chosen to be plausible for a
small tabletop machine and to give round numbers a Year 12 student can check.

## 1. Table and cabinet

| # | Part | Size / position | Notes |
|---|---|---|---|
| 1 | Playfield | 520 × 800 mm interior; straight sides to y = 540, then a semicircular arch of radius 260 centred (260, 540), top at y = 800 | Tabletop scale, Estimate. Painted cool off-white plastic |
| 2 | Playfield slope | 6.5° towards the player | Real machines run 6–7°. Standard |
| 3 | Acrylic case | walls 12 mm, 105 mm above the playfield, cabinet 70 mm below it; sky acrylic (`figMat.palette.case.sky`, glass kind, opacity 0.42); rails and corner balls in a deeper sky `#9CC4EC` | One case tint per machine: sky. Frosted panes carry the tint, the rails the frame |
| 4 | Backbox | 544 × 50 × 150 mm behind the table, sky acrylic; a dark display slab 220 × 64 mm on its front | The scoreboard lives here; score, ball and streak are drawn by the page as an overlay pill, never baked into the model |
| 5 | Legs | four steel cylinders Ø 18, front 40 mm, back 131 mm | The height difference is what tilts the table |
| 6 | Shooter lane | x 480…520, from y = 0 to 540; steel lane wall at x = 480, 28 mm tall | Standard layout, right-hand lane |
| 7 | One-way gate | a steel wire from (480, 556) to (520, 572), hinged at the lane wall | Lets the ball up into the arch; shut on the way down, and sloped so a ball that lands on it rolls off into play. Arms only once the ball is clear above it |
| 8 | Top arch rail | the semicircle as a steel wire at z = 4 and 13 | e = 0.55 (steel rail) |
| 9 | Orbit deflector | rubber rail (0, 575) → (60, 535) with a post at its end | Turns a ball coming off the arch into play instead of straight down the left outlane. e = 0.7 |
| 10 | Outlanes | x 0…40 (left) and 440…480 (right), below y = 300 | No way back: a ball here drains |
| 11 | Inlane guides | polylines (40, 300) → (40, 200) → (58, 165) → (95, 142) → (150, 108), mirrored on the right about x = 240, with posts at both ends | The curve flattens to the flipper's rest angle so a ball rolls onto the bat rather than bouncing. e = 0.6 |
| 12 | Drain (outhole) | the ball is gone once y < −25; a dark slot 80 × 22 at the front centre, trough under the playfield to the lane | |

## 2. The ball

| # | Part | Size | Notes |
|---|---|---|---|
| 13 | Steel ball | Ø 27 mm, 80 g | Standard pinball. Treated as a sliding point mass: no rolling kinetic energy, so ½kx² = ½mv² holds as taught at Level 2 (a rolling ball would keep 2/7 of its energy in spin) |
| | Rolling resistance | μ = 0.001 | Steel on a waxed playfield, Estimate. Deceleration μ g cos 6.5° = 0.0097 m s⁻², about 0.9 % of the slope's pull |
| | Speed cap | 6.0 m s⁻¹ | A pinch between moving parts can pump a rigid ball; anything above the cap is bled off and booked as a loss. Never reached in normal play |

## 3. Launch

| # | Part | Size / position | Notes |
|---|---|---|---|
| 14 | Plunger | rod Ø 9, tip plate Ø 22 at y = 70 (rest), knob Ø 26 outside the front wall; the ball rests at (501, 83.5) | The rod is taken as light: all the spring's energy goes to the ball |
| 15 | Spring | k = 400 N m⁻¹, free length 70 mm, compression x up to 60 mm; drawn as a 9-turn helix that shortens with x | Estimate. ½kx² = 0.32 J at 40 mm → 2.8 m s⁻¹; the sim gives 2.81 because the ball climbs x along the slope during the 25 ms stroke (the stroke is solved exactly as simple harmonic motion about the shifted equilibrium) |

## 4. Flippers

| # | Part | Size / position | Notes |
|---|---|---|---|
| 16 | Left flipper | pivot (158, 92), bat 66 mm, capsule radius 8; rest −32°, up +28° | Standard 3-inch bat. Angular speed 28 rad s⁻¹ up, 18 down (Estimate). Rubber edge e = 0.6 |
| 17 | Right flipper | pivot (322, 92); rest 212°, up 152° | Mirror of the left. The gap between the tips at rest is 36 mm, so a 27 mm ball drains between them |
| 18 | Solenoids and links | copper coil Ø 24 × 42 under each pivot at z = −36, steel plunger and link | Visible through the case; the link is what the coil pulls |
| | Contact model | the bat is a driven capsule; the bat's surface speed ω × r is used in the bounce, so a moving bat does work on the ball | Impulse meter: J accumulates m·Δv over one contact episode, counted from the moment the flipper is pressed; Δt is the contact time; F = J/Δt. Checked against the ball's Δv to within 5 % |

## 5. Pop bumpers and slingshots

| # | Part | Size / position | Notes |
|---|---|---|---|
| 19–21 | Pop bumpers 1, 2, 3 | caps Ø 64 at (170, 630), (330, 640), (250, 715); ring, skirt, steel body, copper coil, painted cap (strawberry, butter, lime) with a white button | e = 1.0 plus a 1.0 m s⁻¹ kick along the normal when the coil fires; the coil needs 0.15 s to reset, so a second touch inside that window is a plain elastic bounce. 100 points. The cap flashes (emissive) for 0.3 s on a hit |
| 22, 23 | Slingshots | left triangle (85, 200), (85, 285), (145, 215); right mirrored; 18 mm mint prism, peach cap, rubber on the long face, posts at the corners | The long face is the kicker: e = 1.1 plus a 0.45 m s⁻¹ kick. The other faces are rubber, e = 0.7. 50 points |

## 6. Ramp, lock and kicker

| # | Part | Size / position | Notes |
|---|---|---|---|
| 24 | Wire ramp | mouth at y = 330 between x = 70 and 114; two steel wires 20 mm apart rising as h = 24 sin(πs/L) over L = 117 mm to y = 447, with cross ties and two posts; mint entry flap | On the ramp the ball is a 1D body: s̈ = −(g sin 6.5° + g cos 6.5° · dh/ds) − friction. It needs about 0.77 m s⁻¹ at the mouth to clear the crest; slower balls roll back out. 500 points for the crest |
| 25 | Lock bay | walls x = 70 (y 330…515), x = 114 (y 330…447), back wall y = 515; open to the right between y = 447 and 515 | The bay keeps the lock off the left orbit; the kicker's whole 20°–45° range leaves through the opening |
| 26 | Lock and kicker | cup Ø 34 at (92, 470), copper kicker coil below | Captures a ball within 16 mm; holds 0.6 s (or until the round fires it); ejects at v (0.3–0.6 m s⁻¹) and θ (20°–45° to the +x line). 250 points |
| 27 | Lock LED | one soft mint indicator at (128, 480) | The machine's one standing glow; bumper caps and inserts only flash |
| 28 | Rollover lane | seven wire rollovers with lavender inserts at y = 470, x = 150 … 450 | The landing line for the kicker's projectile: the ball leaves the lock at y = 470 and lands back on y = 470 a distance R = v² sin 2θ / g_eff along it. 25 points each; an insert stays lit once passed |

## 7. Targets and electronics

| # | Part | Size / position | Notes |
|---|---|---|---|
| 29 | Standup target | 56 × 26 mm lime face on a steel bracket at (272…328, 420), facing the flippers | e = 0.5; 300 points; flashes on a hit. Off the centre line so the bumper test shot (straight up x = 250) has a clear run |
| 30 | Circuit board | 150 × 90 mm PCB green at z = −52 under the front left, with chips, a connector and a copper harness to the flipper coils | Sensor inputs and LED driver, drawn not simulated |
| 31 | Scoreboard | in the backbox (part 4) | Score = table points + call points |

## 8. Restitution and energy, in one place

| Surface | e | Kick | Energy booked as |
|---|---|---|---|
| Steel rails, arch, lane wall | 0.55 | — | rails & rubber (loss) |
| Inlane guides, ramp walls, lock bay | 0.6 | — | rails & rubber |
| Rubber posts, deflector, slingshot short faces, target sides | 0.7 | — | rails & rubber |
| Flipper rubber | 0.6 | bat speed ω × r | flippers (gain or loss) |
| Pop bumper cap | 1.0 | +1.0 m s⁻¹ (0.15 s reset) | bumpers (gain) |
| Slingshot kicker face | 1.1 | +0.45 m s⁻¹ | slingshots (gain) |
| Standup target face | 0.5 | — | rails & rubber |
| Gate wire | 0.3 | — | rails & rubber |
| Lock capture | — | KE → 0 | lock (loss); the kicker's eject is a gain under kicker |

Energy is kept as E = ½mv² + m g sin 6.5° · y + m g cos 6.5° · h (+ ½kc² while the plunger is mid-stroke). Between
kicks it never rises; the check script verifies that over twenty played balls, and that the ledger
(spring + bumpers + slingshots + flippers + kicker + rails + friction + lock) balances what the ball had at the drain.

## 9. Integration

Fixed step 1/240 s, with sub-steps so the ball never moves more than 6 mm (2 mm on the ramp) per collision pass.
Free flight uses a velocity-Verlet step (exact for the parabola under constant g_eff); rolling resistance is applied
as a speed reduction that never reverses the motion; contacts push the ball out along the normal and reflect the
approaching part of its velocity with the part's e. The page accumulates frame time and runs whole steps, so the
same inputs give the same game on every device; rendering is decoupled and only draws when asked.
