# Registering "The guess the world machine"

These entries are NOT committed on `claude/guess-world` (the shared registry files are edited by several branches).
Add them when merging. They were used locally to test the machine.

## 1. `study/data.js`: add to `machines` (id `world`; no existing machine uses that id)

```json
"world": {"title": "The guess the world machine", "href": "m/world.html", "desc": "Guess first, then see the real data. A Gapminder-style bubble chart of every country from 1800 to today: income across, life expectancy up, population as bubble size, with New Zealand in plum. Guess-first questions against a chimp picking at random, New Zealand against the world on six indicators, reading log scales, trend, outliers, variation and correlation, and your own two-variable question. Real data from Gapminder and Our World in Data (CC BY 4.0). Practice questions you can work through with Allen.", "blurb": "Guess first, then see the real data: every country since 1800, with New Zealand in plum.", "tags": ["Year 9", "Year 10", "Social studies", "Statistics"], "icon": "data", "years": [9, 10, 11], "level": "junior", "standards": []}
```

## 2. `study/kit.js`: add to `MSUB` (puts it in the Social studies group, peach tint)

```js
world:"social",
```

(e.g. right after `socials:"social",`)

## 3. Optional: an icon in `study/kit.js` `GLYPH` (without it the kit falls back to the energy icon)

```js
  world:G(`<circle cx="12" cy="12" r="9.5"/><circle cx="8.5" cy="14.5" r="2.2"/><circle cx="14.5" cy="9" r="3"/><circle cx="16.5" cy="16" r="1.4"/>`),
```

## 4. `study/index.html`

No change needed: the hub builds its cards from `data.js` and shows `thumbnails/world.jpg` (committed). It is a 2D
machine, so it should NOT go in `THREE_PREVIEWS`; its card reads "Interactive activity".

## 5. Walkthrough video (not made on this branch)

Once `world` is in `data.js`, `study/tests/guide.test.mjs` ("every machine built on the kit has a walkthrough video")
expects `study/videos/world.mp4`, `study/videos/world.jpg` and a `world` entry in `study/videos/index.json`
(15 to 60 seconds). Videos are out of scope for this branch.
