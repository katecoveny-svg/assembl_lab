# Study teardown kit

Build a study machine students can take apart. The real mechanism runs in the middle; every panel around it reads the same model that moves the parts; one button opens the part doing the work; the parts assemble and come apart as the assembl signature.

The first one is the **four-stroke engine** at `/study/teardown/four-stroke/`.

This kit is for **new** machines. It never edits the existing study machines in `study/m/`.

## What is where

| Path | Deployed? | What it is |
|---|---|---|
| `study/teardown/kit/teardown.js` | yes | The runtime: three.js studio, the console, the frame loop, keyboard, reduced motion, the `window.STUDY_TEARDOWN` handle. |
| `study/teardown/kit/teardown.css` | yes | The console layout and the assembl look: ivory studio or aubergine night, plum ink, dusty rose, Instrument Sans and IBM Plex Mono. |
| `study/teardown/<slug>/` | yes | One machine: `index.html`, `model.js` (the maths), `machine.js` (the geometry), `main.js` (the console config) and `<slug>.parts.md`. |
| `tools/study-teardown/template/` | no | The starter files the scaffolder copies. It is an exact crank and slider that runs as it is. |
| `tools/study-teardown/new-machine.cjs` | no | `node tools/study-teardown/new-machine.cjs <slug> "<Title>"` starts a machine from the template. |
| `tools/study-teardown/verify.cjs` | no | The verify loop: real frames, the still-frame count, checks, screenshots. |
| `tools/study-teardown/tests/` | no | `node --test tools/study-teardown/tests/*.test.mjs` |

`.vercelignore` already keeps `tools/`, `tests/` and `*.md` (except `*.parts.md`) off the live site.

## The loop

1. **Find the reference first.** Use a video of the real machine, a cutaway drawing or a spec sheet. Without one you get a generic toy. Write the real dimensions down with their source.
2. **Scaffold the machine:** `node tools/study-teardown/new-machine.cjs bike-drivetrain "Bicycle drivetrain"`.
3. **Write `model.js`.** It takes one input, the phase of the cycle (a crank angle, a stroke, a time), and returns the whole state. There is no three.js in it. Add `checks()`: numbers you worked out by hand that the model must match.
4. **Write `machine.js`.** Build the parts from code at real size (1 unit = 1 cm). Register each one with `kit.part(name, obj, {sub, explode, order, cut})`, add anchors for the callouts with `kit.anchor()`, and pose everything in `pose(state)`. Mark the part doing the work with `kit.hot()`.
5. **Write `main.js`.** It sets the title, the live number, readouts, charts (a `sweep` against the phase, or a `loop` of two values), the schematic, callouts, subsystems, views, the four learn steps, sources and truth labels.
6. **Verify, look, fix, repeat:**
   ```
   flock /dev/shm/heavy.lock node tools/study-teardown/verify.cjs /study/teardown/<slug>/
   ```
   Read every screenshot it writes. Stop when the run passes and the frames show nothing wrong.
7. **On the Vercel preview:** get a share link (Vercel MCP `get_access_to_vercel_url`), then:
   ```
   flock /dev/shm/heavy.lock node tools/study-teardown/verify.cjs https://<preview>/study/teardown/<slug>/ --share '<share link>' --out <dir>
   ```

## What verify.cjs checks

- **Motion.** It records real frames (8 s by default) and compares each one with the last at 160 × 90. It reports "stood still for N of M frames" and the longest still run, and fails above 20% (`--max-still`). A machine that freezes, stutters or never starts shows up here.
- **The console follows the state.** It reports how many frames the `[data-live]` panels went unchanged, and it seeks to two phases to confirm the console redraws.
- **Model checks.** Every `checks()` entry must agree with its hand calculation.
- **Phone width.** At 390 px there must be no sideways scroll; it names the elements that stick out.
- **Reduced motion.** With `prefers-reduced-motion`, the page should hold still until the student presses Play.
- **Errors.** Any page error or console error fails the run.
- **Screenshots.** `<id>-1440.png`, `-1440-apart.png`, `-1440-isolate.png`, `-1440-night-closed.png`, `-1440-reduced.png`, `-390.png`, `-390-full.png`, plus `-sheet.png`: exact frames through one cycle, each labelled with its phase.

## Rules the kit enforces, and the ones you must keep

- Every number on screen comes from `model.at()`. Never type a number into a label.
- Label anything simplified as **Simplified** and any teaching value as **Illustrative**. Put a source on every physical claim, and list them in `sources` with the date you checked them.
- Use the palette in `COLOURS` only, with one accent (`#7E5570`) for the part doing the work. No violet, no glow, no glass, no cartoon.
- Use your own designs. Take dimensions from a real machine, but never copy a brand's design, logo or a character.
- Keys: Space to play, ← → to step, 1–9 for views, A to assemble, I to isolate, C to cut, X to explode, [ ] to change part, L for labels, N for night. While the 3D view has focus, the arrows turn it.

## Credit

The approach (a reference first, one source for every number, a console around the machine, review by frames) is adapted from [elvarofficial/teardown](https://github.com/elvarofficial/teardown) (MIT licence). The code here is written for assembl; none of it is copied from that project.
