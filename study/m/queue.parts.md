# The queue machine: parts list

Drawn parts of the `queue` study machine (NCEA L2 AS91267) and the simulation behind them. Case tint: **lavender**.

| # | Part | Size / value | Material kind, colour | Label |
|---|---|---|---|---|
| 1 | Arrivals rail and arrow | 720 units long | metal, `#B9C5D6` | Visual |
| 2 | Shoppers (arriving, waiting) | head Ø 12, body 14 × 12 units | painted, `#2F8FD8` (waiting) / `#F2603F` (being served), with a highlight dot | Visual: no faces |
| 3 | Checkout counters | 1–8 lanes, each 94 × 56 units | wood, `#D9B48C` with a lighter top edge; belt rubber `#3C4557` | Estimate |
| 4 | Arrival process | Poisson, 0.5–5 a minute (1.6 for the Poisson step, 3 for the checkout) | — | Stated (1.6/min) |
| 5 | Checkout service time | normal, μ = 118 s, σ = 19 s, clipped at 20 s | — | Stated (2025 paper style) |
| 6 | Normal curve panel | μ ± 4σ across 680 units; shaded region between the bounds | painted (sun) on paper | Exact |
| 7 | ED run cards (A and B) | 340 × 200 units each | paper card with hot/sea outline | Visual |
| 8 | ED arrivals | 14 an hour (6–24), Poisson | — | Stated |
| 9 | ED beds | 8 or 12 (4–16) identical servers, first come first served | — | Stated |
| 10 | ED treatment time | 88 % exponential mean 30 min, 12 % complex mean 120 min (≈ 41 min overall) | — | Estimate, chosen so 8 beds is overloaded and 12 copes |
| 11 | Breach rule | total time in the department > 360 min; a patient still inside at the end who is already past 6 h counts as a breach | — | Target Standard (Shorter Stays in ED, 95 % within 6 h) |
| 12 | Random seed | 1–99, mulberry32 | — | Same seed, same run |
| 13 | Probability tree | two stages, three sliders (P(self), P(help | self), P(help | staffed)) = 0.4, 0.3, 0.1 | leaves on paper, "help" leaves in sun | Pack-style example; values Estimate |
| 14 | Two-way table | out of 1000 shoppers | paper grid | Exact from the tree |

Cross-links: the lab's ED twin (assembl-lab.vercel.app/ed/) and supermarket twin (/store/) for the fuller simulations and screenshots as evidence.
