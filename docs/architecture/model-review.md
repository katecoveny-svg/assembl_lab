# Private model review

Model review is part of the existing Plan Studio 3D drop viewer, opened from the Lab project. No customer files need to be published. This change does not create a client link, invoke a model provider or change the project geometry.

## In the signed-in project

1. Verify the exact model revision in **Model** (or **Files**). Upload the private JSON to **Site → Site and sources → Walkthrough setup**. Use the JSON prepared for this exact file, not another export of the same design.
2. Only when the design team and rights-holder have expressly authorised the relevant artwork, attach the separately registered, self-contained binary glTFs to **Māori design · interior** and/or **Māori design · exterior**. Do not upload a presentation PDF, redraw a motif, or treat a coloured IFC material as evidence of an artwork approval. Keep in the private workspace.
3. Open the matching file again with **Open in 3D**. The **Model review** card lets you choose a glass finish and jump to a point of interest. Press **Walk** to use keys/drag or the touch joystick; numbered points also appear in the viewport in Walk. Opened IFC/GLB exploration does not stop at walls and is not evidence of a cleared route.
4. Without a matching setup, only already-placed fly-through stops are available. A named design overlay stays hidden until intentionally checked. Fix a mismatch in the project at source; don't strip its checksum.

## Private setup JSON

`assembl.model-review.v1` binds the setup to `modelSha256` (lowercase SHA-256 of the raw opened file; unzipped IFC bytes for IFC ZIP input). Each of up to 32 points has `id`, `label`, `eye`, `look`, and optional `note`. Positions must be in the uncentred input file’s own metres, y-up. The viewer follows its existing recentering and placed-model transforms for these points. No private coordinates are baked into the code.

Optional `layers.interior` and `layers.exterior` each contain `sha256` of a registered GLB plus `credit` and `approvedBy`, recording actual human approval. These are recorded statements, not signatures, clearance or proof of legal permission. The layers use the file coordinate frame and remain separate from the source file. No external resource references are accepted. Site records use the existing authenticated project store; same-browser IDB carries the explicitly assigned setup to the viewer, and the client share projection does not include these slots.

The default remains the **Studio finish** except for a model with a matching private setup, where **As authored** is selected. Plain identified glazing can be previewed as Clear daylight, Warm bronze or Soft smoke. Authored textured, patterned or frosted glazing is left alone. Appearance previews are not a finish specification or a revision.
