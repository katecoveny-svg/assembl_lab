# Waiheke scene workbench

The public pavilion has two small generated modules. One describes three original profiles. The other carries camera timing sampled from a Theatre.js project. The homepage reads the generated numbers directly, including on WebGL 2.

## Rehearse and edit the camera

In this folder run `npm ci --ignore-scripts` and `npm start`. Open the printed loopback editor address. The rehearsal iframe runs a temporary copy of the public homepage and the actual pavilion renderer. Choose the Camera object in Theatre. The travel track follows the path across the threshold and through the room. Dining controls the final camera blend overlooking the table. Drag the playhead or use the Scrub control. Alt + backslash toggles the Theatre panels.

Export edits to a file, replace `waiheke.theatre.json` with the saved version, then run `npm run bake` and `python3 update-versions.py`. Restart the editor to rehearse the new starting state. Play the release from a fresh visit as well. The bake checks the path endpoints, range and forward direction.

## Rebuild the sculpted surfaces

Clone https://github.com/img2threejs/img2threejs and check out `0c0c49bc168e648dbaf9c8c080474de0b3a941b6`. Run `python3.11 profiles.py /path/to/img2threejs`, then `python3 update-versions.py`. The wrapper calls the upstream geometry derivation on each PNG. It normalises the sampled widths and writes a small module used directly by Three.js. The editable SVG elevations in `references/` are original assembl. designs. On the Mac, regenerate the matching PNG with `sips -s format png references/pendant.svg --out references/pendant.png` and likewise for the other two profiles.

The turned leg and ceramic pendant revolve the sampled sections. The harakeke uses the blade width along a folded, bent strip. Its wind displacement increases with height and keeps the base fixed. Dimensions and finishes are authored scene choices. These drawings describe designed objects and provide no survey or botanical measurements.

## Tool boundaries and checks

Theatre Core 0.7.2 is Apache-2.0. Theatre Studio 0.7.2 is AGPL-3.0-only. The editor uses the upstream packages locally through the lockfile. The public build allowlist contains the baked outputs and scene code. Neither Theatre package nor the img2threejs authoring checkout is included in the published assets.

After changing a drawing or timeline, check the entrance, inside handoff and final dining shot at desktop and phone widths. Check direct camera takeover, garden painting and furniture drag, then test reduced motion and forced WebGL 2. A replay should finish on the dining composition without taking control from someone who has already started walking or editing.
