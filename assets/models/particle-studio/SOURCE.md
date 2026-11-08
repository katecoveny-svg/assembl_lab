# Particle Studio bakes

Designs exported from the lab's Particle Studio (`/instruments/particle-studio/`) land here when they are brought into the site:
one `<name>-points.bin` + `<name>-points.json` pair per baked frame (two pairs, `<name>` and `<name>-b`, for a morph pair), read by the
form module the studio writes (`<name>-form.js`, which calls `makeForm` from `lab/pc/engine.js` and belongs beside `lab/pc/forms.js`).

The file is the same compact points format `lab/pc/auckland.js` reads: little-endian, interleaved, `stride` bytes a point, in a fair
random order so any prefix is a fair sample. The studio's layout is `x:u16 y:u16 z:u16 light:u8 kind:u8 part:u8 phase:u8` (stride 10);
the header carries `bounds`, `kinds`, `anchors` (the emitters' and fields' named points) and `source` (the design's name, seed and
the timeline frame). A bake is one frame of a simulation, never the live system; the header says so.

Nothing is baked here yet. Everything the studio makes is the maker's own, made in their browser; a bake is added by hand, with
this file updated to say what it is and where its inputs came from.
