# Browser copies: owner note

## What it is
A browser copy is a light `.glb` made from a model that is too big to open in 3D in a browser. The workspace and the 3D page draw nothing over 100 MB (`BROWSER_3D_LIMIT` in `architecture/js/models-rules.js`). A Revit IFC with its furniture is often several times that.

The copy is a picture of the model for looking at. It is not the record. The full IFC stays kept, counted and downloadable, and every count on the card still comes from the IFC. Nobody should measure from the copy: its furniture is simplified and every position is rounded to the grid described below.

## In the workspace
- A kept GLB whose note has `extra.browser_copy_of` = the id of a kept model is that model's browser copy.
- It sits under its model's card: "■ Browser copy · size", its name, who kept it and when, Download and Remove. It is not a model stack of its own. If its model is removed, it shows on its own again so it can be found.
- Open in 3D hands the copy to the 3D page in the model's place (`handoverFor`). Turn it on the card draws the copy when the model itself is too big.
- A too-big model with no copy shows the "Too big" line and **Add a browser copy**: a chooser for one `.glb`, kept through the same path as any model (in parts, for the shared records). A copy must be a `.glb` and itself under the limit.
- Only the newest version of a model shows its copy. A new version needs its own copy.
- The card view (`architecture/js/model-view.js`) and the 3D page (`projectPlan.ts`) read meshopt-compressed, quantized GLBs. The card view loads the meshopt decoder that ships with the lab's three.js only when a file needs it.

## Making one
The script runs on the practice's own machine. Model files are not sent anywhere.

```
node tools/browser-copy/make-browser-copy.mjs IN.glb OUT.glb [--instanced FURNITURE.glb] [--classes elements.json]
```

It needs Node 20+ and `@gltf-transform/core`, `functions`, `extensions` 4.5 and `meshoptimizer` (`npm install` beside it). It writes `OUT.glb` and `OUT.report.json`: sizes, counts before and after, settings and time per step.

Input: a GLB from IfcOpenShell (`ifc2glb.py`: world coordinates, y-up, one node per element named by its IFC GUID; spaces, openings and annotations left out). Optional:
- `--instanced`: a GLB of the furniture made with each element's own placement (`ifc2glb_instanced.py`), so chairs of one type share one mesh. Its elements replace the same GUIDs in the input. The script first checks the two line up (it stops if any element's box differs by more than 50 mm).
- `--classes`: a list of `{ guid, cls, name }` for every element. It decides what may be simplified, and puts `ifc_guid`, `ifc_class` and `ifc_name` on each node's extras.

What it does, in order:
1. Swaps in the instanced furniture, if given.
2. Shares repeated shapes placed in world coordinates (mullions, fins, panels). Each one moves to its own origin, and its place goes into its node's matrix. The shape is not changed.
3. Merges each element's parts by material (one element stays one node, so picking still works), welds, and removes duplicates.
4. Simplifies only furniture and fixtures (`IfcFurnishingElement`, `IfcFurniture`, `IfcFlowTerminal`, `IfcSanitaryTerminal`, `IfcLightFixture`, and whatever is in the instanced furniture file, so choose that list with care). It never simplifies walls, slabs, roofs, curtain walls, plates, members, windows, doors, stairs, ramps, railings, columns, beams, coverings or footings, even when one shares a mesh with furniture.
5. Quantizes and meshopt-compresses (`EXT_meshopt_compression`, `KHR_mesh_quantization`). three.js loads it with `MeshoptDecoder`.

## Settings
| Setting | Default | What it means |
|---|---|---|
| `--ratio` | 0.25 | Furniture keeps about a quarter of its triangles, if the error limit allows |
| `--error` | 0.01 | The simplifier stops before any change of 1% of that piece's size |
| `--position-bits` | 16 | Positions snap to 1/65,536 of each mesh's own size: under 1 mm on a 50 m slab |
| normals | 10 bits | |
| meshopt | medium | |

## Measured on a big model
An IFC of about 400 MB from Revit 2024, IFC2X3, with a few thousand elements. IfcOpenShell 0.8.4 turned it into a GLB of about 900 MB in about 25 minutes. Furniture was nearly all of it: about 99% of the triangles.

| | Before | Browser copy |
|---|---|---|
| File | about 900 MB | about 5 MB |
| Triangles drawn | about 48 million | about 10 million |
| Triangles stored | about 48 million | under 1 million |
| Draw calls | about 50,000 | about 6,000 |
| Elements, each its own node | all | all |

On an Apple M5 laptop with 16 GB the script took under 10 seconds and used under 5 GB of memory. Instanced furniture lined up with the full model to 0 mm on the 200 elements checked. Only furniture and fixtures were simplified (furnishing elements, flow terminals, and generic proxies that had been listed as loose furniture for the instanced file): about 48 million drawn triangles of them became about 10 million. Repeated shapes in world coordinates, mostly curtain-wall mullions, were shared unchanged.

## Does it still look right
`tools/browser-copy/compare-still.mjs A.glb B.glb OUT` draws the full GLB and its copy from the same camera with a small software rasteriser: no browser and no GPU, so a 900 MB file never goes near a browser. A plain GLB is read from disk piece by piece (under 300 MB of memory for the 900 MB file). It writes both pictures and a difference picture, and prints how many pixels differ (macOS: it uses `sips` for the PNGs).

On the model above, at 1600 × 1000:
- Whole site, from above: 0.08% of pixels differ visibly (mean colour difference 0.09 of 255). Nothing is drawn in one and not the other.
- Closer, over a floor full of furniture: 0.66% differ (mean 0.96 of 255). The difference is on the rims of round tables and the edges of chair backs, where the furniture was simplified. Walls, glazing, mullions, slabs and stairs are the same.

Self-check: the same file against itself gives 0.

## What is still uncertain
- The furniture's simplified look has been compared in stills only, not walked through at eye level.
- The copy is about 10 times smaller than the 100 MB limit, so `--ratio` can go up if furniture looks too coarse.
- A copy has no IFC properties beyond the GUID, class and name on each node. Anything else is read from the IFC.

## Files
- `tools/browser-copy/make-browser-copy.mjs`: the script.
- `tools/browser-copy/compare-still.mjs`: the same-camera comparison.
- `architecture/js/models-rules.js`: `copyOf`, `browserCopyFor`, `handoverFor`, `copyProblem`, and `stacks` grouping copies under their model.
- `architecture/js/models.js`, `architecture/models.css`: the card's copy line and chooser.
- `architecture/js/model-view.js`: reads meshopt and quantized GLBs.
- `plan-studio/twins/src/twin/projectPlan.ts`: the 3D page sets the meshopt decoder.
- `tests/architecture/models-browser-copy.test.mjs`, `tests/architecture/fixtures/browser-copy-sample.glb` (an invented building, made by the script).
