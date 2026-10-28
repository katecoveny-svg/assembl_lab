# Living Studio three-mode draft — visual QA

**final result: blocked**

This is a working local draft, not a visually approved release. Nothing was pushed, merged or deployed.

## Evidence and normalization

- Source: `/workspace/scratch/e46202a82638/wow-feedback/concepts/assembl-living-studio-{liquid-atelier,sculptural-playground,luminous-type-garden}-concept.png`.
- Each source is **853 × 1844** pixels. Comparisons scale each to **393 × 852** (a minor 0.3% aspect normalization).
- Implementation: `study/patterns/review/redesign/{liquid,sculpture,garden}-phone-final.png`, each **393 × 852** pixels.
- Browser-rendered original captures: corresponding `*-phone-final-full.png` files. Normal desktop Chromium embeds the real route in a **393 × 852 CSS px iframe**, at 1× screenshot density. The iframe is a layout test, **not a touch-device emulator**. DOM measurement returned scrollWidth/clientWidth 393 and scrollHeight/clientHeight 852.
- Shared comparison inputs, opened and inspected together: `*-comparison-final.png`. Overview: `three-modes-working-draft.png`.
- State: light shared shell, seeded artwork, paused, default PLAY; Sculpture's Glass choice is the software approximation. The caption explicitly identifies software rendering.
- Focused regions: the full-height comparisons make controls and letter silhouettes readable; source/capture crops and pixel comparisons were additionally used for marbling detail, sculpture edges, Garden letter readability and dock fit.

## Findings

- **[P1 — verification blocker] Primary GPU artwork is not visually verified.**
  The cloud Chromium returns no WebGL/WebGL2 context. The real Liquid shader and Three.js mesh/material implementation are retained, but their shader compilation, lighting, glass transmission and GPU performance have not been executed here. All Liquid/Sculpture screenshots in this report use the genuine CPU drawing fallback, not the primary renderer and not static images. Next step: run this same local branch in an authorized GPU-capable browser; compare the primary paths before deciding on release.
- **[P2] Sculpture fallback is smooth but still not the target material quality.**
  It now uses per-pixel interpolated normals and depth buffering rather than faceted quadrilateral fills. It still has sharp sliced-looking ribbon edges, simpler reflections and no true refractive transparency. This is an explicit fallback, not proof of the target chrome/glass look.
- **[P2] Garden is readable but stylistically simpler than the source.**
  PLAY and twelve letters now fit safely above the dock. The actual art is layered stylized silk leaves, rather than the source's thick, translucent, deeply folded petals. This remaining art-direction gap is not marked passed.
- **[P2] Liquid has broad flowing coverage but simpler pigment detail.**
  Dense software marbling, fine bands and seeded droplets fill the phone, without the source's full wet-paint microtexture and broad S-shaped composition. The GPU path still requires its own visual review.

## Required fidelity surfaces

- **Typography:** existing Instrument Sans/Fredoka stack retained; brand corrected to `assembl`. Shared hierarchy is compact and readable. A single shared header differs intentionally from the three inconsistent generated mock headers. The Garden word is generated geometry, not a static lettering image.
- **Spacing/layout:** full-height artwork replaces the old heading/form-heavy layout. All core modes remain in a floating dock; advanced rules and original engines are in More. Garden reserves top/bottom safe space. No horizontal overflow at the checked 393px viewport. Source screenshots have “Visual concept” captions, which are correctly absent from the working tool.
- **Colors/tokens:** cream/light shell with navy, coral, lilac and mint; optional dark art background. The app remains light by default. Dark is disabled for Liquid because a full-bleed pigment field has no separate background.
- **Rendering/image quality:** no concept PNG is used as artwork. All thumbnails are actual renderer captures. CPU fallbacks are live procedural art; they do not establish primary WebGL fidelity. Remaining differences listed above.
- **Copy/content:** functional Pause/Play, Reset, Remix, Save, original-engine controls and optional learning remain. No signup, uploads, provider requests, keys or new personal-data storage.

## Comparison history

1. Initial actual captures: `*-phone-full.png`.
   - Liquid was too noisy/small-scale. Changed domain scale and field frequency to create larger calm sweeps, then added seeded pigment droplets.
   - Sculpture showed obvious checkerboard faceting. Replaced flat face fills with a real CPU z-buffer, interpolated normals and reflection maps.
   - Garden's letters were clipped and too sparse. Added safe margins/reserved dock space, continuous letter structure, larger petals and richer colors.
2. Second captures: `*-phone-v2-full.png`, `*-comparison-v2.png`.
   - Garden was readable, but bare backing caps and low letters needed another fix. Removed exposed underlayer ends and increased bottom reserve.
   - Enlarged pigment, material, reset and remix hit areas to 44px. Moved phone Liquid Flow into More to avoid crowded/overlapping hit areas.
3. Final captures: `*-phone-final-full.png`, normalized `*-phone-final.png`, `*-comparison-final.png`.
   - No longer clipped; broad liquid coverage and smooth fallback sculpture achieved. Remaining fidelity and GPU verification blockers above remain open.

## Functional evidence

- All **eight unchanged original engine implementations** were selected and rendered through the new shell, with keyboard manipulation: Attractor bloom, Braid, Glyph assembly, Murmuration, Ink rings, Suminagashi, ASCII forge, Proof lattice. See `original-engines-contact-sheet.png` and individual captures.
- Repeated modern/original mode changes and settings open/close worked without a blank canvas.
- Pause produced identical artwork pixels across separate captures (`liquid-phone-final-full.png` vs `liquid-paused-repeat.png`, interior crop difference mean **0**). Arrow-key interaction while paused changed the artwork (mean channel difference **45.44** in the same crop).
- Garden word editing checked with PLAY, LOVE and ABCDEFGHIJKL; twelve-letter evidence is `garden-12-letters.png`. Dark toggle, desktop pointer drag and Reset were exercised. `garden-dark.png` / `garden-pointer-drag.png` show changed pixels after drag.
- Sculpture material selection changed both the selected state and rendered pixels; `sculpture-chrome.png` differs from the default Glass fallback capture.
- Actual top-level **Download PNG** completed. `liquid-story-export.png` is a valid **2160 × 3840 PNG**. `liquid-wide-caption-export.png` is **3200 × 2240**, with title and complete two-line caption visually inspected. Square capture preview was verified at **2400 × 2400**. Frames preserve the current artwork aspect and may letterbox; larger export dimensions do not add render detail.
- An excessive twelve-line caption was rejected visibly, kept the entered text and left Download/Print disabled.
- Nineteen automated model/caption/wiring/runtime tests passed; module syntax checks passed. The six runtime regressions are persisted in `study/patterns/runtime.test.cjs`. Independent source review identified and verified fixes for legacy Tempo, single Step, Suminagashi frame clock, bfcache restoration, stale async captures and stale controls after drag. These checks are not visual approval.

## Restrictions / never-run checks

- Current managed Sites CLI returned `http://127.0.0.1:4173/`, which worked. Product Design's older `terminal.local` path returned an upstream connection error. No network policy or infrastructure was changed.
- Opening Chromium DevTools displayed **“DevTools not allowed on this page — Your organization has blocked the use of DevTools on this page.”** No retry/bypass was used. The iframe layout fixture does not emulate DevTools or grant access to browser internals.
- **Unverified:** primary WebGL output; real touch/pinch and physical iPhone; reduced-motion device emulation; runtime console inspection through DevTools; native share delivery; print dialog/physical A4; low-end GPU/phone performance; 375px browser layout.
- Reduced-motion matchMedia pause and page-visibility suspension are implemented, but no device-emulation pass is claimed.

## Next acceptance checklist

1. Open the local draft in a GPU-capable authorized browser; verify both shader and Three.js paths, touch drags, pause/reset/remix and exports.
2. Review actual primary sculpture against the target (especially ribbon continuity, glass transparency and chrome reflections).
3. Decide whether the remaining procedural Garden/Liquid art-direction difference is acceptable or warrants another art pass.
4. Run true phone/reduced-motion checks and console inspection in an environment that permits them.
5. Only then consider a draft PR/publication request. This report does not authorize push, merge or deploy.
