# Catalogue preview provenance

`year9-builder.jpg`: ordinary IAB screenshot, 2026-10-28, local draft based on f308328. Route `/study/year9/`, App builder tab, default Trail Kai checklist with “Phone and jacket” checked. Screenshot clip x50/y90, 800×500 from a 1280×900 viewport. No invented artwork or private input.

Other homepage images reuse existing actual model captures in study/thumbnails, study/instrument-previews and assets/posters. The Next catalogue card uses the Habitat scene rather than its old icon collage. Original files are preserved.


## Atelier refresh · 30 October 2026

The phone, bike, vinyl, claw and slushie `*-blender.webp` files are proportion-preserving derivatives of the existing offline Blender renders under `assets/models`. No model geometry, background or lighting was invented for these thumbnails. The heart derivative comes from the existing `study/m/heart/assets/heart_hero.png`.

`particles-blender.webp` (updated 3 November 2026) is a 1400×1050 WebP of `assets/models/particles/renders/particles-hero.png`, the offline Cycles render (64 samples, OpenImageDenoise) of the scripted apparatus that `/study/m/particles.html` now loads as its 3D (`particles-apparatus.glb`, contract `assembl.particles.v1`). It replaces the earlier supplied `particles-overview.png` render (SHA-256 0dfacf879c61860110b020ecd6c52867af1be0e1a37aa9b4fff4213fd3745729), whose apparatus the page never loaded. It is an offline render, not a browser screenshot; browser glass is simpler.

`sculpture-atelier.webp` is the actual 2400-square PNG export from Living Studio, preset Coral ripple, resized without cropping. It is a software 3D runtime render, not Blender imagery. Existing browser scene captures remain in use for worlds that have no verified offline render.
