# Study Reels

`node tools/reels/reel.cjs <baseUrl> <machineId> [outDir]` makes a 9:16 short (1080×1920, about 17 seconds) for any study
machine: a hook card from the machine's Blender thumbnail, one card per step captured from the real page, and an end card
with `assembl.co.nz/study/<id>`. Captions are burnt in for sound-off viewing and also written as `<id>.srt`; `<id>.png` is
a cover image.

The pipeline follows the topic → script → clips → subtitles → video shape popularised by open-source tools like
MoneyPrinterTurbo, built only on Playwright and ffmpeg. Nothing third-party is installed, and the script comes from
the machine's own catalogue entry and steps, so nothing is invented. There's no voiceover yet: there is no open NZ-accented voice we can use.

Serve the site first (e.g. `python3 -m http.server 8123` from the repo root). Output defaults to `study/share/reels/`,
which is not committed (videos are about 10 MB each); upload them straight to the platforms.
