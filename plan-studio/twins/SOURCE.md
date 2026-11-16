# Plan to twin

Twins generated in three.js r187 from architectural drawings, on the WebGPU renderer (`three/webgpu`, with its WebGL 2
fallback shown as such). Built output lives in `plan-studio/twins/<name>/`; the editable source is `plan-studio/twins/src/`
(not deployed, see `.vercelignore`).

## 16A: two timber homes

`/plan-studio/twins/16a/`

- **Inputs.** Draft resource-consent set, issue A, 12 May 2025 (RC-02 survey, RC-04 site plan, RC-05 area plan, RC-06
  plans, RC-07 sections, RC-08/09 elevations), used with the owner's permission (Kate, 17 Nov 2026: "TOA is fine to use
  this is my house"). The plan model `src/twin/plan16a.json` (assembl.plan-model.v1) from Plan to 4D for walls,
  openings, partitions and rooms.
- **Survey.** Boundary computed from the surveyed bearings and distances; the printed survey fits them within 0.011 m at
  true 1:200 and 0.02° of north. Ground from traced 1 m contours plus 12 spot levels (0.5 m grid in `site16a.json`).
  Not survey-grade.
- **Placement.** Unit footprints segmented from the RC-05 coverage fill (10.75 × 5.95 and 10.72 × 5.96 m measured
  against 10.8 × 6.0 drawn); long sides at bearings 62.0° and 61.9°. The Plan to 4D model's sheet-up north is about
  28° off true north.
- **Levels.** Drawing RLs are on the architect's own datum: 456.99 m above the survey datum, fitted from four boundary
  ground levels on RC-07 (sd 0.22 m). A fifth (section C) is 2 m off and excluded. To be confirmed by the architect.
- **Generated, scaled, assumed.** Every part carries `source` (written, scaled, assumed, proposed, survey) in the
  inspector, glTF extras and IFC. Earthworks (pads 0.45 m below floor, retaining where cut > 150 mm), subfloor framing,
  finishes and planting are assumptions or proposals, labelled as such.

## Drop a plan

`/plan-studio/twins/drop/`

The tool's front door. Drop a plan model (assembl.plan-model.v1, as Plan to 4D saves it) and the houses are generated
from it, every room furnished from its name, and finished in the chosen palette; or drop an IFC or GLB and it is shown as
it is. Raster PDFs are calibrated and traced in Plan to 4D first. Nothing dropped leaves the browser.

## Fit-out and finishes

- `src/twin/fitout.ts`: rooms furnished from their names (bedroom, lounge, dining, kitchen, bath, laundry, WC, study,
  wardrobe) by simple placement rules. All fit-out is labelled proposed.
- `src/twin/furniture.ts`: assembl's own pieces at real sizes, and the finishes palettes (cladding, floor, benchtop,
  cabinetry, fabric, trims).
- `src/twin/library.ts`: Kate's Kōwhai Studio library (WebOpt 512 px GLBs, CC BY 4.0) fills matching slots first.
  Items that approximate a third party's trademarked shape are marked `public: false` and are compiled out of public
  builds (`VITE_PUBLIC_BUILD=1`); their files are not copied here.
- `src/twin/plants.ts`: native planting as geometry (harakeke, nīkau, tree ferns, ground ferns, tussock, tī kōuka,
  shrubs), so it casts real shadows and path-traces.

## Rebuild

The source builds with Vite inside a project that has `three@0.187`, `three-gpu-pathtracer@0.0.28`, `web-ifc@0.0.79`
and `fflate`: put `src/twin` and `src/objects` under `src/`, `twin.html` at the root, add it to Vite's
`rollupOptions.input`, and serve `web-ifc.wasm` as base64 text at `twin/web-ifc.wasm.b64.txt` and library GLBs as `twin/lib/<ID>.glb.b64.txt`. Build with `VITE_PUBLIC_BUILD=1` for this site. Then copy the page and
the assets it loads into `plan-studio/twins/<name>/` and add `<script src="/lab/navigation.js" defer>` before `</body>`; the drop page is the same build with `<body data-project="plan">`.
