# Four-stroke engine teardown: parts list

A single-cylinder four-stroke engine at real size (1 unit = 1 cm in the scene). One input, the crank angle θ over 720°, poses every part and drives every number (`model.js`). Labels: **Stated** (published spec), **Exact** (geometry or a law, exact for these numbers), **Assumed** (picked, not published), **Simplified** (a model that leaves something out), **Illustrative** (a teaching value).

Reference engine: the published specification of a common 163 cm³ single-cylinder garden and generator engine (bore 68 × stroke 45 mm, 9.0 : 1, rated at 3,600 rpm). Only its dimensions are used; no design, shape or brand is copied.

| # | Part | Real size / value | Colour | Label |
|---|---|---|---|---|
| 1 | Cylinder bore | 68 mm | pale rose `#EADCDF` liner, ten cooling fins | Stated |
| 2 | Stroke | 45 mm (crank radius 22.5 mm) | — | Stated |
| 3 | Swept volume | π/4 × 68² × 45 = 163.4 cm³ (spec sheet: 163) | — | Exact, checked on the page |
| 4 | Compression ratio | 9.0 : 1, so a 20.4 cm³ clearance (a 5.6 mm gap above the piston at TDC) | — | Stated; the gap as a flat head is Simplified |
| 5 | Connecting rod | 75 mm centres | mist `#B8A8B2` | Assumed |
| 6 | Piston | 68 mm, 40 mm tall, pin 18 mm below the crown, three rings | rose mauve `#D4B6C7`, rings plum ink | Assumed sizes |
| 7 | Crankshaft and flywheel | journal Ø 19 mm, pin Ø 16.4 mm, counterweight R 28 mm, flywheel R 37 mm | mauve `#756771`, flywheel blush | Assumed; counterweight sized to clear the skirt at BDC by 2.5 mm |
| 8 | Valves | heads Ø 25 mm, 6 mm lift, open dead centre to dead centre | mist | Lift Assumed, timing Simplified |
| 9 | Camshaft | turns at half crank speed; lobes are a 6 mm sin² nose on a 6 mm base circle | mauve | Half speed Exact; direct-acting overhead cam Simplified (the reference engine uses pushrods) |
| 10 | Spark plug | fires at TDC between compression and power | ivory with an ink outline | Simplified (real ignition is before TDC) |
| 11 | The charge | colour by stroke: air and fuel, compressed, burning, exhaust | pale rose, rose, rose ink, mist | Simplified |
| 12 | Gas pressure | ideal air-standard Otto cycle, γ = 1.4, p₁ = 1 bar, T₁ = 300 K; 21.7 bar after compression, 55.1 bar after the burn | — | Simplified |
| 13 | Heat added | 800 kJ per kg of air (slider 200–1,500) | — | Illustrative |
| 14 | Crank torque | τ = F r sin(θ + φ) / cos φ, gas force only; peaks near 135 N·m about 25° after TDC | — | Exact for the gas force; no friction or inertia (Simplified) |
| 15 | Work per cycle | ∮p dV = ∫τ dθ = 99.9 J; efficiency 1 − 1/9^0.4 = 58.5% | — | Exact for the ideal cycle, checked three ways |

Animation: one cycle takes 6 s on screen (slow motion). At the rated 3,600 rpm a real cycle takes 33.3 ms.
