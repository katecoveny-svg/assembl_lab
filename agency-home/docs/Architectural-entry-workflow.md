# Building an architectural entry for Assembl

A repeatable design and review method for the agency homepage and its on-page Lab. First used on **Wind through Waiheke**, 25 November 2026 NZDT. Kate’s first review camera is the living room. A believable room at human height is a prerequisite for further art direction.

## 1. Preserve the review that prompted the change

Keep the original standalone file, its hash, its camera source and the screenshot the reviewer actually saw. Record the browser, viewport, scroll position, selected chapter, device pixel ratio and the position of the first element below the controls. Start the next pass in a separate directory with a different port. This review uses `inlet/` and 8796. The previous standalone lives in `pavilion/review/Wind-through-Waiheke.html`. Treat the agency and Lab Cloudflare Direct Upload projects as separate destinations throughout.

Ask one precise visual question before editing. For this pass it was “Does a person seated here appear to share the light and scale of this room?” The cropped cushion, solid mustard upholstery, glossy chairs and nearly black wall in the previous frame gave four specific things to change.

## 2. Storyboard the scene and its exit

| Beat | Composition and movement | Acceptance evidence |
| --- | --- | --- |
| Approach | Frame the raised house between planted foreground and the distant coast. Reserve sky around the roof. Hold the opening composition before the camera advances. | Desktop and portrait captures show the building, veranda, piles and soil contact. |
| Garden | Move past a small cluster of seed heads. Let the viewer see two distances respond to one gust. Follow the path toward the opening. | A short reversible pass and one deliberate gust with the camera held still. |
| Living room | Finish at standing eye level. Include the glazing return, floor, table, upholstery and daylight gradient in one frame. | Original camera at 39° followed by the delivered wider 56° shot. |
| Published Waiheke work | Bring the upper edge of the actual film still into view below the chapter controls. Use pale space for the caption. | Screenshot at the visitor’s Living room button state, including the next image. |
| Inside the work | From the 16A drawing, change to the site model and exterior. Walk into the actual twin. Bring the selected plate back into the enquiry. | Click the link through the actual opening file, return, inspect the mail draft URL and follow “Return to 16A”. |

Unseen’s film holds attention on one subject before handing it to the next. Its published production notes show how to bind scenes to one reversible scroll path. Feather’s focal subject changes against a slower field of grass. Use these observations to set distance, focus and movement. Collect a short timed reference strip for internal review, and keep capture provenance alongside it. [Walk with Whales](https://unseen.co/projects/walk-with-whales/) · [Unseen’s production notes](https://unread.unseen.co/insights-convex-seascape-survey-4b64f2cff88b) · [Feather](https://mrdoob.github.io/codevember-2026/12/)

**Direction decision.** A film-led opening offers the clearest published image and little opportunity for discovery. A drawing folio makes the route into Plan Studio immediate but leaves the agency’s motion work largely unseen. The built option starts in the inhabitable pavilion, gives the film its own large image and uses one drawing from the next study inside the room. Keep the direct Lab link at the top for people arriving to use a tool.

## 3. Record provenance before modelling

Maintain a manifest with the source URL, author, original licence, modifications, SHA-256 of the delivered derivative and the intended use. Distinguish approved Assembl material, licensed scanned assets, authored approximations and geographic evidence. Keep the original notices and modified-data notices in both the page credits and the source package.

This pavilion develops the public brand longhouse. Its veranda, room, grade and garden are design studies. Label the public Waiheke film and the public 16A twin separately. The region uses Mapzen relief and georegistered Sentinel-2 land cover from eastern Waiheke; its compressed horizon and authored immediate ground cannot establish an individual property. The supporting plant scans are generic. The authored fans and plumes evoke coastal planting. Record uncertainty about species or location before any public claim. The source archive contains the full records. [Public agency work](https://www.assembl.co.nz/work/) · [Public 16A twin](https://lab.assembl.co.nz/plan-studio/twins/16a/)

## 4. Build the room at the camera’s scale

1. Block the deck, piles, door opening, seat, back and table in metres. Inspect the photographed sight line with the seated and standing viewpoints. Test glazing thickness, reveals and deck returns at that distance.
2. Build the edges light can catch. Give the sill, sash, reveal and soffit distinct profiles. Model board ends and fascia. Set each pile and plant root against the same grade used for the terrain. Inspect from below the veranda.
3. Set the wood grain in metres and orient end grain per face. Separate albedo, roughness and normals. Compare the apparent weave, board and aggregate sizes to a known seat or door. Turn off the normal map temporarily to locate over-sharp noise.
4. Give linen a loaded top, changing radii and seams that follow the cushion. Use seat compression and a supported back pillow. Give the table a leg/apron relationship; leave one object with a clear scale. Use neutral plaster to allow bounced light to read. Inspect contacts at table feet, chair feet, sofa frame, wall and floor.
5. Place sun, sky and reflections in a common coordinate system. In this study the main sun follows the HDR disc at about 36° azimuth and 38° elevation. Add window-shaped indirect fills and compare before/after against the dark end of the room. Review grazing and face-on reflections on the same pane.
6. Export the current room triangles before baking. Trace diffuse visibility over the floor and wall, store linear occlusion for the authored UV mapping, then check the direction and density in the actual browser. The review bake used 89,238 triangles and 42 cosine directions per sample. Re-bake after structural or furniture placement changes. Keep a shadow-only and material-only diagnostic available during development.

## 5. Animate the space the camera occupies

Paint zero displacement at the plant roots and increase the influence toward the tips. Vary curvature, maturity and heading across neighbouring stems. Propagate wind across space, with a slower base bend and faster fine detail. Separate one near-lens group, the middle bank and distant foliage by projected size, overlap and depth. Use the shared depth buffer and lighting for all three. Check a locked-camera gust before judging the camera movement; a rigidly rotating cluster is especially clear in this test.

Attach camera position, aim, field of view and focus to one native scroll fraction. Check half distance and reverse travel for clipping or sudden focus changes. On portrait screens move the starting camera far enough back to keep the architectural subject. Keep the grid and its round lens scene-local. Tap or drag to place it and use arrows when focused. A labelled button starts the gust. Keep sounds muted initially and allow a short click only on a deliberate action.

## 6. Build a page a visitor can complete

Use Instrument Sans, the supplied artwork, dusty rose `#E3D0D2`, pale rose `#FBF6F6` and plum `#654A4E`. Keep full-width project images in natural colour. Apply generous space to meaningful transitions, especially the film caption and the Lab introduction. On narrow screens keep the headline, direct Lab link, wide image, then controls in that order. Check 390 px and keyboard focus at 200% zoom before release.

Use semantic links to the full experiences. The two enhanced spreads in this prototype are 16A (three real project plates) and Waitematā (three published example dates). The full site model, Architecture, Plan Studio, Auckland Live and Roof Solar open their existing tools. In both enhanced spreads the contextual enquiry retains the plate or day. Use the full tide tool for dates outside the sample. Keep the same labels, navigation and tokens in both production projects and update their routes independently.

The renderer should start only when its entry intersects the viewport. Prefer WebGPU, then WebGL 2, then a meaningful poster. Keep the static page usable before graphics or JavaScript is available. Reduced motion pauses ambient wind and scroll-driven camera changes. Manual chapters and an explicitly requested gust remain available. Pause rendering offscreen. Provide an ordinary anchor around every immersive section. Do not trap touch scroll, Tab or browser Back.

## 7. Repeat the comparison through the delivered entry

From the extracted source directory, run the local site with:

```sh
python3 -m http.server 8796 --bind 127.0.0.1 --directory site
```

Open the standalone HTML directly in Chrome as the visitor would. With esbuild on PATH, regenerate it with `python3 process/package.py`. For the file-entry check, install Playwright in a local development environment, install Google Chrome and run `node process/path-evidence.cjs`. If Playwright lives elsewhere, set `PLAYWRIGHT_MODULE` to its installed module directory. The runner writes a 1440 × 960 evidence capture, frame-interval sample, room handoff, Lab model and enquiry into `review/`. The source package includes a second portable runner, `node process/compare.cjs previous.html review/The-Pavilion.html`, for camera-matched stills. The previous file is a separate review artefact.

Use the same viewport, DPR, renderer, camera position, target, FOV and hero aspect for both captures. Save complete uncropped images with the camera metadata. Record a separate delivery frame if the intended new composition changes. Compare the sequence at normal playback speed, including reverse, native scroll, optional controls and the actual next beat. A test passing cannot approve an image. Ask a reviewer which material, joint, contact or movement first breaks their sense of scale.

## 8. Acceptance and release gates

| Phase | Gate |
| --- | --- |
| Visual direction | Kate reviews matched room and exterior plus the wider delivered room, the gust and the uninterrupted journey. Record the verdict and the first remaining visual distraction. |
| Accessibility | Complete both featured enquiries by keyboard. Check touch movement still scrolls vertically. Test reduced motion, no script, graphics blocked and device loss. Verify contrast, labelled controls, visible focus and a physical screen-reader pass. |
| Performance | Proposed production targets: mobile initial shell and hero poster under 350 KB compressed, LCP ≤2.5 s and CLS ≤0.1 at the 75th percentile on the target audience. Target 30 fps sustained, p95 update interval ≤50 ms after warm-up, interactive 3D download ≤6 MB compressed and ≤500k visible mobile triangles. Measure on a representative physical phone before sign-off. Collect transfer, visible geometry, GPU memory pressure and frame intervals separately. |
| Lab and analytics | Verify every public destination’s rendered title. Check a chosen plate and a chosen day survive the external tab return. Validate only allow-listed local events: `pavilion_view`, `pavilion_grid`, `pavilion_gust`, `plate_selected`, `demo_launch`, `brief_selected`, `contact_open`. Use an adapter before sending; strip query strings and mail content, send only case/control IDs after consent. No collector is wired in this prototype. |
| Release | Keep the agency bundle and Lab build in their respective Direct Upload paths. Review the diff and asset notices, dry-run both independently, and record the last accepted version for rollback. Publishing requires a separate release decision. |

The review package is deliberately self-contained for local inspection. Its download size and desktop scene density exceed the intended production budget. Retain the static shell; split and compress assets, simplify off-camera planting and use distance-based detail before a real-device release comparison.

## Coastal interaction and data checks

Match the approach and living-room camera position, quaternion, lens and viewport between builds. Capture both before changing the tree or the still. Check low forks against the ridge, the canopy against the roof and leaf size against the deck boards. At a fixed camera, pause the wind, send a gust, then verify that the seed heads settle. Keep a screen recording of the actual browser interactions.

Enter Explore from a visible camera stop. Test look, dolly, pause, reset, Escape, the labelled exit and focus return. On a touch viewport, test one finger and pinch inside Explore, then scroll the document after exiting. Exercise native WebGPU, WebGL 2, graphics refusal and reduced motion. Mark emulation explicitly in the evidence.

Select an Auckland station 070 event on the in-page wharf. Compare local time, timezone, height, waterline and tide-staff contact with the published table. Follow the dated full-tool link and inspect the enquiry draft. Verify that both rendering loops sleep offscreen and that the dated offline sample works with the network disabled. Preserve a meaningful water still for every supported height.

Accept each Lab tile only when its linked public destination reproduces the captured browser angle, model and content. Record the two image hashes, the live URLs and date of verification. Keep solar exposure, energy yield and site identity distinct. Before release, check the homepage, work and legal routes, guide and contextual enquiries in the complete Pages preview.
