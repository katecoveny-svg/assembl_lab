# The phone machine: parts list

The live scene now uses the five-apparatus Blender family described in [the asset source notes](../../assets/models/phone/README.md). Scientific values remain owned by `phone.js`. The legacy table below records the original SVG drawing, which remains the functional fallback; its material colours and drawing units do not specify the new metre-scale asset. The supplied handset is 147 × 8 × 72 mm with a 133 × 60 mm screen surface. Live wireless spacing is explicitly magnified 5×.

## Original SVG drawing reference

Drawn parts of the `phone` study machine (NCEA L2 AS91173, L3 AS91526), with the figure material each uses
(`StudyKit.figMat` kind) and the truth label for every figure. Case tint: **sky** (see refs/figure/README.md).
Drawing frame 800 × 420 units; the phone is drawn at about 1:1.4 of a real 147 × 72 mm handset so it fills the bench.

| # | Part | Real size / value | Material kind, colour | Label |
|---|---|---|---|---|
| 1 | Phone body | 147 × 72 × 8 mm, rounded corners | plastic, `#232838`, highlight on the top-left corner | Standard (a 6.1-inch handset) |
| 2 | Screen | 139 × 64 mm | glass, `#0F1320`, opacity 0.96 | Standard |
| 3 | Battery icon and bar | shows state of charge; green above 20 %, coral below | painted, `#58D68D` / `#F2603F` | Visual only |
| 4 | Battery (the model behind the bar) | 3 349 mAh at 3.87 V = 12 056 C, 46.7 kJ | — | Stated (practice pack) |
| 5 | USB-C charger brick | 20 W (5–45 W slider); 46 × 40 × 28 mm | plastic, `#E9EDF4` | 20 W Stated; size Estimate |
| 6 | Wall plug | 24 × 34 units | metal, `#B9C5D6` | Visual |
| 7 | Cable | ~1 m; drawn as a bezier | rubber, `#CDD5E3` with a white sheen | Estimate |
| 8 | Charge carriers in the cable | gold dots moving at a rate set by the current | painted (accent sun) | Visual: particles, not to scale |
| 9 | Cell model | emf 3.5 V flat → 4.2 V full; r = 0.08 Ω (0.01–0.30); charger holds 4.2 V | — | Estimate |
| 10 | Load resistor (internal-resistance step) | 0.2–4.0 A | painted (accent sun) | Estimate |
| 11 | Screen and modem loads (parallel step) | 1.2 A and 0.5 A | painted (sun, sea) | Estimate |
| 12 | Qi pad coil and phone coil | pad 300 × 24 units; phone coil N = 5–20 turns; f = 100–200 kHz; gap 0–8 mm | metal copper `#C98B63` (pad windings), copper highlight (phone coil) | Qi frequency band Standard; emf model Estimate |
| 13 | Smoothing capacitor | 100–4700 μF through 1–100 Ω | metal plates `#AAB4C4`, sun fill for charge | Estimate |
| 14 | Phone thermometer | 22 °C + 6 °C per watt lost in the cell | painted hot | Estimate, labelled "(est.)" in the drawing |

Physics used: Q = It, E = VQ, P = E/t, I = (V_charger − ε)/r, ε = V + Ir, P = I²r, parallel currents add, ε = −N ΔΦ/Δt (indicative model), Q = CV, E = ½CV², τ = RC.
