# assembl lab: DESIGN.md

The design system for the Lab home (`/`, built by `scripts/build-lab-home.cjs`) and anything new on this site.
The values below are the CSS variables in `lab/story.css`; pages use the names, never raw values.

Twin and machine pages keep their own look for now. They are not covered by this file until someone moves them.

## Where this comes from

- **Canon:** the assembl company site (`assemblnz-site`): `docs/assembl-brand-system.md`, `DESIGN.md`,
  `docs/design/3d-production-standard.md`, and the plum home page that went live on 3 November 2026
  (`components/site/home-directions/PlumHome.tsx`, `plum/plum-home.css`, `wow/`). The Lab is a door from that
  home ("Step inside the Lab"), so it is the same plum world, not a separate brand.
- **Kate's notes on the old Lab (3 Nov 2026):** "repetitive, half the labs look like toys, no cohesive design";
  creative-instrument cards shown twice; big empty grey frames with Save pills and a small picture floating in
  the middle; "Experiment NN" numbering and pastel icon-tile grids that read as a kids' app.
- **Not from real-site comparisons.** The UXKIN design-system library was not connected for this work, so no
  outside sites were compared. The direction rests on the assembl canon and the live plum home only.

## The idea

One plum world, told in chapters. A deep plum stage with rose and lilac light holds the hero, the twins and the
close; one chalk sheet slides over it for the study machines, the playground and the labels. The page reads as
a story: what the Lab is, then the business twins, then the study machines, then a calm index of everything
smaller, then a way back to assembl.

The hero holds one DO glass orb, the same orb as the live assembl.co.nz home (Kate, 3 Nov 2026: one glowing orb
instead of the pastel cubes), so the Lab reads as a room in that home. The twins chapter keeps one render on a
stage while you read about it.

## Colour

| Token | Value | Role |
|---|---|---|
| `--deep` | `#240B21` | The stage field. Plum buttons on chalk. Text on paper buttons. |
| `--plum` | `#3A1536` | The raised close band and the page's last field. |
| `--paper` | `#FFFDFB` | Text on plum. Tiles, paper buttons. |
| `--chalk` | `#F5F1F2` | The sheet. Fill behind renders. Truth chip on paper. |
| `--ink` | `#492B3E` | Headings and body on paper and chalk (11:1 on chalk). |
| `--muted` | `#654A4E` | Secondary text on paper and chalk (7.1:1 on chalk). |
| `--rose` | `#916A70` | Focus ring on light fields; state detail. |
| `--on` | `rgba(255,253,251,.78)` | Secondary text on plum (11.2:1 on `--deep`). |
| `--glass`, `--glass-line` | paper at 7% / 16% | Secondary buttons and hairlines on plum. |
| `--glow-rose` | `#F3A5BE` at 30% | Light on the stage (top right), glow behind the twin render. |
| `--glow-lilac` | `#C7B4F0` at 24% | Light on the stage (lower left). |
| `--do-lilac`, `--do-rose`, `--do-pearl`, `--do-spine` | `#D7B3F0`, `#E59AA2`, `#FFF3F6`, `#4A1735` | The DO mark's glass (the company site's `--as-do-*`): the hero orb only. |

Two pastels, **small accents only**: `--lilac` `#C7B4F0` and `--pink` `#F3A5BE`. They colour the dot in a truth
chip, the stage progress line, focus rings and light. Never a section field or a card background. No pastel
cubes, no yellow and no neon anywhere on the home.

No dark/light toggle: the plum stage and chalk sheet are the page's two fields in every colour scheme.

## Type

- **Instrument Sans** for everything people read: headings, body, navigation, buttons.
- **IBM Plex Mono** only for truth labels: the truth chip, the maturity stage (Model, Shadow) and the source
  line beside it, and the stage counter. Nothing else is monospace. No all-caps labels.

| Token | Size | Line height | Weight | Use |
|---|---|---|---|---|
| `--t-h1` | clamp(46px, 6.6vw, 96px) | .96 | 600, −.045em | The one hero line |
| `--t-h2` | clamp(32px, 3.8vw, 54px) | 1.04 | 600, −.035em | Chapter headers, max 18ch |
| twin title | clamp(26px, 2.4vw, 34px) | 1.15 | 600 | The twin in view |
| `--t-h3` | clamp(21px, 1.7vw, 25px) | 1.15 | 600 | Machine tiles, sub-heads |
| `--t-lede` | clamp(17px, 1.3vw, 20px) | 1.5 | 400 | One paragraph under each header, max 46ch |
| `--t-body` | 16px (tile titles 17px) | 1.5 | 400 / 600 | Tile lines, labels |
| `--t-small` | 14px | 1.3 | 500 | Kind lines ("Hospitality"), year links |
| `--t-mono` | 11.5px | 1.2–1.4 | 500 | Truth chip and source line only |

## Space, shape, depth

- Spacing steps: 4, 8, 12, 16, 24, 32, 40, 56, 72 px.
- `--gutter` clamp(16px, 5vw, 64px); `--max` 1240px content width; `--gap` clamp(88px, 10vw, 152px) between chapters.
- Radius: `--r-frame` 28px for renders and machine tiles; `--r-tile` 22px for index rows; the sheet 44px
  (28px on phones); pills 999px.
- Two shadows: `--sh-tile` (a hairline ring plus a soft drop) on paper tiles; `--sh-lift` (a deep drop) under
  a render on plum. Glow is rose or lilac light, used once per chapter.

## Components

- **Chapter header:** an H2 (a plain sentence that ends in a full stop), one lede paragraph, and at most one
  row of actions. No eyebrow, no number.
- **World tile, one style everywhere:** paper, rounded, a whole render, then the words: a kind line, the
  title, one line, a truth chip with its source line, and the link. Three sizes of the same tile:
  - *stage step* (the twins): render on the sticky stage, words in the reading column;
  - *machine tile* (study): render on top, words below;
  - *row* (more twins, closer to home, also in assembly): a small render on the left, or words only when the
    world has no real render (Year 9 studio, Print Lab, Next Lab).
  - *index line* (playground): words only on a hairline; no thumbnails, no frames.
- **Truth chip:** `Simulated` (a model of a place or system), `Live` (a working tool that makes a real file or
  object), `Illustrative` (art, no claim about the world). Beside it, for twins, the maturity stage from
  `lab/maturity.json` (Model or Shadow, with the reason in its title) and the named public source. Every tile
  has one; the hero lists all three; the labels section explains them.
- **Buttons:** paper (primary on plum), glass (secondary on plum), plum (primary on chalk). 48px tall,
  pill-shaped, sentence case, named for what happens ("Talk to assembl", "Open assembly"). Text links use an
  arrow icon, not a typed "→".
- **Header:** brand, three chapter links, and one link back to assembl.co.nz. Not sticky (the company site's
  frame already has a bar).
- **Ask about this:** kept, restyled as a quiet plum pill to match the company site's Ask DO.
- **Never:** Save pills or bookmarks, filters and search over a dozen-odd items, "Experiment NN" numbering,
  empty frames waiting for an image, icon-tile grids standing in for a world.

## Motion

Motion explains something or shows a change of state; otherwise nothing moves.

- **The DO glass orb (hero):** raw WebGL2 (`lab/orb.js`, no dependencies), ported from the company site's
  `components/site/home-directions/wow/orb.ts`: one quad, the sphere shaded in the fragment shader (lilac above,
  rose below, a see-through plum core, two slow inner lights, a pearl highlight, a thin rim, a soft bloom).
  Loaded after first paint. It breathes (about 6.5 s) and drifts a few pixels; its inner light quickens and
  brightens as the page opens and while a hero action is hovered or focused, then settles. It stops drawing
  when off screen or in a hidden tab, and drops to the still orb on a slow device. It is decorative
  (`aria-hidden`) and not a link: the Lab does not link DO, so the orb carries the family look, not a door.
- **The twin stage:** on screens 960px and wider, one sticky frame shows the render of the twin you are
  reading; the step in view is full strength and the others step back. A counter and a line show where you
  are (3 of 6). IntersectionObserver, no scroll hijacking.
- **Tiles:** lift 2–3px on hover. No entrance animations, no tilt.
- **Reduced motion, no JS, no WebGL:** the complete static story. The orb is a CSS still (`.orb-still`, the
  company site's `.as-orb`), which floats slowly when motion is allowed and stands still for reduced motion;
  every twin shows its own render beside its words; nothing fades.

## Imagery

- Use real renders of the worlds: offline renders in `assets/models/*/renders` and `lab/previews/*-blender.webp`,
  and the twin posters in `assets/posters/` (captures of the twins' own 3D scenes).
- Show each render **whole, at its own proportions**, with rounded corners. Never crop to fit a box, never
  float a small picture in a big empty frame, never use a cropped web page as a picture.
- No cartoon faces as a lead image. Instruments whose only preview is a face (Soft Matter, Squishy Lab) are
  listed in words.
- Alt text says what the render shows ("Offline render of the claw machine cabinet").

## Accessibility

- AA contrast or better for all text (ratios in the colour table).
- One H1; chapters are H2 in order.
- Skip link first; every link and button reachable by keyboard with a visible ring (lilac on plum, rose on chalk).
- Works at 320, 375 and 1440 px with no horizontal scroll. Touch targets at least 40px.
- `scripts/check-lab-home.cjs` checks each world appears exactly once, the routes `#twins`, `#study`,
  `#playground`, `#about` and `#explore`, keyboard order, widths, and that the hero orb is decorative and clear
  of the headline, buttons and labels at 1440, 1024, 768, 390 and 320 px.
