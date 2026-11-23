# Manu birds: measured proportions

The body of every bird on lab.assembl.co.nz/manu/ is a measured shell (code:
`manu/src/src/engine/nz/shell.ts`, numbers: `manu/src/src/engine/nz/measured.ts`, per-bird
photo proportions: `SHELL` in `manu/src/src/engine/nz/species.ts`). Shape first, detail after:
the feather tracts, wing, tail, legs, bill and eye are attached to the shell and sized from the
same measurements.

All birds are drawn at one on-screen length (1.75 model units for the published total length),
so the scale is k = 1.75 / length (model units per mm).

## Published measurements (adult males where the sexes differ; mm, g)

| Bird | Length (cm) | Mass | Wing | Tail | Bill F (exposed) | Bill S (skull) | THL | Tarsus | Form measured |
|---|---|---|---|---|---|---|---|---|---|
| Tūī | 30 | 125 | 154.5 | 119.9 | 24.5 | 33.5 | 63.3 | 38.3 | nominate, NZ skins; THL live (Tiritiri Matangi) |
| Korimako | 20 | 34 | 90.5 | 86.2 | 14.2 | 20.8 | 41.1 | 26.4 | nominate melanura, NI/SI skins; bill F, THL live |
| Pīwakawaka | 16 | 8 | 74.9 | 95.5 | 7.6 * | 11.4 | 24.5 * | 19.2 | nominate fuliginosa, SI skins |
| Tauhou | 12 | 13 | 61.4 | 46.2 | 9.9 | 13.0 | 28.0 | 17.5 | nominate lateralis, NZ skins; bill F, THL live NZ birds |
| Miromiro | 13 | 11 | 73.1 | 52.3 | 10.2 | 13.7 | 31.4 | 22.5 | nominate macrocephala, SI skins |
| Toutouwai | 18 | 35 | 93.3 | 66.2 | 13.8 * | 19.8 | 41.9 | 35.4 | longipes, NI skins; THL live (Pureora) |
| Hihi | 18 | 36.5 | 103.0 | 73.9 | 14.8 * | 21.5 | 43.6 | 28.2 | NZ skins; THL live (Little Barrier I.) |
| Kererū | 50 | 630 | 262.8 | 193.6 | 17.0 | 20.5 * | 62 * | 34.8 | nominate novaeseelandiae, skins |

\* stand-ins, not measured for this form: pīwakawaka bill F from NI live birds and THL from
Tasmanian birds; toutouwai bill F is the South Island robin's; hihi bill F = bill S x 0.69 (the
korimako's ratio); kererū bill S and THL scaled from photographs (HANZAB gives neither).

Sources
- Wing, tail, bill, THL, tarsus: Higgins, P.J. et al. (eds), *Handbook of Australian, New Zealand
  and Antarctic Birds* (HANZAB), species accounts for tūī, bellbird, New Zealand fantail,
  silvereye, tomtit, North Island robin, stitchbird and New Zealand pigeon, as reproduced on
  NZ Birds Online (nzbirdsonline.org.nz, "Literature" PDFs on each species page).
- Total length and weight: NZ Birds Online species pages (rounded field-guide figures).

## Derived lengths used by the shell (model units)

- head = (THL - bill F) x k, the feathered head from the nape to the bill feathers
- torso = (length - bill F - tail) x k - head (pīwakawaka x 1.3: its rounded 16 cm total gives
  too short a body against its wing and the photographs)
- visible bill = bill F x k; tail = tail x k; folded wing chord = wing x k (sets where the
  wingtips meet over the tail); tarsus = tarsus x k (foot on the perch to the heel under the belly)

## Proportions read off photographs

Side-on photographs (iNaturalist, NZ observations, study only: not committed, not shipped) give
what the measurements cannot: posture of the torso, its depth and width, head height, where the
head sits on the shoulders, tail angle, heel angle and how much of the tarsus the belly hides.
Values are in `SHELL` (species.ts); for example tūī torso 58 degrees above horizontal, tail 70
degrees below; korimako 30 and 15; toutouwai 60 and 62 on long legs (only a quarter of the
tarsus hidden).

## Silhouette check

`manu/src/scripts/shape_check.py` renders each bird orthographic (side, front, top) from
`manu/src/harness/shape.html`, legs left out of the side comparison, and overlays the side
silhouette on an outline traced from one side-on photograph (GrabCut with hand hints; perch and
feet removed). The fit allows scale, small shifts and up to 10 degrees of camera tilt, so posture
errors still count. IoU = overlap / union (1 = identical).

| Bird | IoU before (hummingbird template) | IoU after (measured shell) |
|---|---|---|
| Tūī | 0.638 | 0.801 |
| Korimako | 0.384 | 0.800 |
| Pīwakawaka | 0.613 | 0.761 |
| Tauhou | 0.600 | 0.781 |
| Miromiro | 0.504 | 0.794 |
| Toutouwai | 0.769 | 0.873 |
| Hihi | 0.505 | 0.762 |
| Kererū | 0.691 | 0.741 |

Limits: one reference photograph per bird, in one pose (the tūī photograph is a rear
three-quarter view, the kererū's has its neck stretched up, the hihi's tail is cocked); front and
top views are checked by eye only (no reference outlines). The reference photographs and their
masks are kept out of the repo.
