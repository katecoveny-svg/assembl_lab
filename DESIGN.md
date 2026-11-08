# assembl lab: DESIGN.md

The design system for the Lab home (`/`, built by `scripts/build-lab-home.cjs`), the shared Lab chrome on every
experiment page (`lab/navigation.js`), and anything new on this site.

**Since 8 Nov 2026 the Lab wears site-v2**, the look Kate locked for assembl.co.nz from her mockup: deep plum, dusty
rose, warm ivory; lots of negative space; large, thin, well-spaced type; modern pill buttons; scroll parallax and
motion text. The foundation is ported, not re-invented: see "Where this comes from".

Twin, machine and instrument pages keep their own artwork and interactions. They sit inside the site-v2 chrome (the
experiment nav) but their bodies are not covered by this file until someone moves them.

## Where this comes from

- **Foundation:** `katecoveny-svg/assemblnz-f0afd79d`, branch `feat/home-mockup-restyle`, commit
  `2fa1750d8a7823c05941a4c9837b9fce37fb147d` (PR #1785): `lib/brand/site-v2/tokens.ts`, `styles/site-v2.css`,
  `components/site-v2/*`, `docs/brand/site-v2.md`. Ported into `/site-v2/` here:
  - `site-v2/site-v2.css`: `styles/site-v2.css`, verbatim.
  - `site-v2/tokens.mjs`: `tokens.ts`, same values, types removed.
  - `site-v2/markup.cjs`: string twins of Button, Eyebrow/Brand, Wordmark/GlassA, SplitTextReveal, Reveal, Parallax,
    Ticker, GlassAssemble, SiteNav and SiteFooter, for the static build.
  - `site-v2/site-v2.js`: their client-side motion in plain JS (nav, reveals, split text, parallax, the mark assembling).
  - Headers, footers and the experiment nav show the wordmark text alone, `assembl.` (rose dot) + `lab`. Kate took the
    "a." mark off every page on 8 Nov 2026 ("terrible"), as on assembl.co.nz, until a new mark is chosen. `MARK_A` in
    `site-v2/markup.cjs` stays only for `wordmark({ showMark: true })`, the favicons (`lab/favicon.svg`,
    `site-v2/mark-a-{32,180,192}.png`) and share images, which keep it for now, as the main site's do. The glass "a" files are retired.
  - `site-v2/lab.css`: Lab-only rules (the "lab" suffix, truth chips, the experiment nav). No new colours.
  Each ported file names the source commit in its header. To sync: change the main repo first, re-copy, update the
  commit in each header.
- **Kate's notes on the old Lab (3 Nov 2026):** "repetitive, half the labs look like toys, no cohesive design";
  creative-instrument cards shown twice; big empty grey frames with Save pills; "Experiment NN" numbering and pastel
  icon-tile grids. Still true: none of those come back.

## Rules (from the foundation, non-negotiable)

1. The brand is always lowercase **assembl**, no e: copy, alt text, aria, titles. Inside uppercase labels the word
   sits in `.v2-brand` so it stays lowercase. "assembly" is the study app's own name and stays.
2. **No violet or lavender** anywhere: no `#C7B4F0`, `#D7B3F0`, `#6A50BE` or similar text, glows, rings or lights.
   (The old DO orb and its lilac light are gone from the home.)
3. **Logo: the wordmark only.** Lowercase `assembl` with the dusty-rose dot, ivory on dark, plum ink on light. No "a." mark in
   headers, footers or page furniture (8 Nov 2026), and no glass.
4. Negative space: one idea per screen, wide gutters (`--v2-gutter`), tall sections (`--v2-section`), hairlines.
5. Motion is transform and opacity only, and every effect has a static state for reduced motion and no JS.
6. Truth labels stay wherever they apply: Simulated, Live, Illustrative, Model/Shadow, "Fictional", draft notices.
   A reconstruction is never presented as a scan.

## Colour

The foundation palette, read through one tone class per section (`v2-tone-plum`, `-aubergine`, `-ivory`, `-blush`,
`-pale`, `-rose-mauve`); children use `--v2-fg`, `--v2-fg-2`, `--v2-accent`, `--v2-line`, `--v2-focus`. Values and AA
pairs: `site-v2/tokens.mjs` and the main repo's `docs/brand/site-v2.md`.

| Lab home section | Tone |
|---|---|
| Nav (floats over the hero, plum glass once scrolled), hero, ticker, footer | plum `#21121F` |
| Business twins | aubergine `#180B18` |
| Study machines, labels | warm ivory `#F9F6F2` (machine cards and study rows on soft blush `#F1EAE9`) |
| Playground | soft blush `#F1EAE9` |
| The close | rose mauve `#D4B6C7` |
| Experiment nav (every other page) | plum band, solid |

## Type

- **Instrument Sans** for everything people read. Display sizes at **400** (its lightest cut), tight tracking:
  `v2-display-xl` for the one hero line, `v2-h2` for chapter heads, 400 for tile titles at 22px and up, 500 for
  small titles.
- Eyebrows: 11.5px, uppercase, `.22em` tracking, a rose dot.
- **IBM Plex Mono** only for truth labels: the truth chip, the maturity stage and its source line.
- Accent (dusty rose on dark, rose ink on light) on at most one line per heading.

## Components

- **Chapter header:** eyebrow, a split-text H2 (second line in the accent), one lede, at most one row of actions.
- **Twin card:** a whole render on blush, then kind, title, one line, truth chip with maturity stage and source, a
  text link with an arrow. The whole card opens the twin; the link stays the one focus stop.
- **Row:** a small render (or words only), title, line, chip, an up-right arrow.
- **Index line (playground):** words only on a hairline.
- **Truth chip:** Simulated (filled rose dot), Live (filled dot in the text colour), Illustrative (hollow rose
  ring). The word carries the meaning; the mark is a second cue.
- **Buttons:** the foundation's pill (`v2-btn-primary`: ivory on plum, plum on light), text link with arrow
  (`v2-btn-secondary`), outlined pill (`v2-btn-ghost`). Sentence case, named for what happens.
- **Home nav:** the flat mark + "assembl." + "lab", four chapter links, an outlined pill back to assembl.co.nz; Menu
  below 880px.
- **Experiment nav (`lab/navigation.js`):** the same wordmark, The experiments, Playground, Study machines, About
  the lab, and "Build with assembl" back to assembl.co.nz; Menu below 880px. Solid plum, not sticky, so it never
  covers a twin. Inserted after a page's own skip link.
- **Footer:** the foundation's plum footer: Lab links, assembl.co.nz links, legal, and the disclaimer.
- **Never:** Save pills, "Experiment NN", empty frames, icon-tile grids standing in for a world.

## Motion

- **Hero:** the H1 rises word by word on load (CSS only). Since Nov 2026 the hero's picture is Tāmaki Makaurau Auckland as a
  point cloud (`lab/pc/auckland.js`, baked from open data by `tools/pointcloud/bake-auckland.mjs`; provenance in
  `assets/models/auckland/SOURCE.md`): true horizontal scale, heights ×5, most of the hero on the right. It assembles onto its
  own still (rendered on no ground, so no box edge), sways slowly, and a reading scan passes over it. Callouts name public
  landmarks with facts only; twins are pinned on real sites of their kind, each labelled "Example, not a model of this site",
  and no business or institution is ever named. Reduced motion: one still frame with every callout. No WebGL: the still,
  with the callouts and pins as lists.
- **Chapter heads:** words rise as they enter the screen. **The close:** words and the flat mark assemble with scroll.
- **Cards and rows:** fade and lift in, staggered (Reveal); lift 2 to 4px on hover.
- **Ticker:** a slow line of the twins under the hero; pauses on hover; a static wrapped row for reduced motion.
- **Reduced motion, no JS:** the complete static page, everything visible, nothing moves.

## Imagery

- Real renders: `assets/models/*/renders`, `lab/previews/*-blender.webp`, `assets/posters/`. Each shown whole, at its
  own proportions, rounded. Never cropped to fit, never a small picture in a big empty frame.
- No cartoon faces as a lead image. Alt text says what the render shows.

## Accessibility

- AA contrast for all text (foundation tone pairs only). One H1; chapters are H2 in order.
- Skip link first; every link and button keyboard-reachable with a visible ring in the tone's focus colour.
- Works at 320, 375, 390 and 1440 px with no horizontal scroll. Touch targets at least 44px.
- `scripts/check-lab-home.cjs` checks each world appears exactly once, the routes `#twins`, `#study`,
  `#playground`, `#about` and `#explore`, keyboard order, widths, no violet, lowercase brand, and that the hero's map
  is decorative, big, and clear of the headline, buttons and labels at 1440, 1024, 768, 390 and 320 px, that its callouts
  never cover the words, and that every twin pin carries its truth line and no name.
