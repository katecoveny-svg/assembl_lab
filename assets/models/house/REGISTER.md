# Registering the house design machine

The machine's own files are committed; the three shared catalogue files are not (several machines are being added at
once). These are the exact entries used to test it locally. Add them when merging.

1. `study/data.js`: inside `"machines": {`, before `"earthspace": {`, add

```
"house": {"title": "The house design machine", "href": "m/house.html", "desc": "An architect's white card model of a split-level house on a New Zealand hillside, made in Blender. Turn the house under a real sun path, step the form from bare site to finished house, read floor plans by room and by zone, slide a section line through the model, and switch the same house between plan, elevation, isometric and perspective. Practice questions you can work through with Allen.", "blurb": "Site, massing, plans, sections and drawing conventions on one card-model house.", "tags": ["NCEA DVC", "Year 9", "Year 10", "Year 11", "Technology"], "icon": "plan", "years": [9, 10, 11, 12, 13], "level": "junior", "standards": []},
```

2. `study/kit.js`: in the `MSUB` table, after `earthspace:"science",` add `house:"tech",` (butter tint, the technology colour).

3. `study/index.html`:
   - in `THREE_PREVIEWS`, after `"earthspace",` add `"house",`
   - in the card label test, change `||id==="earthspace")?"Blender render · open 3D lesson"` to
     `||id==="earthspace"||id==="house")?"Blender render · open 3D lesson"`

The card image is `study/thumbnails/house.jpg` (800 × 500, from `house-hero.jpg`). `study/tests/house.test.mjs` checks the
catalogue entry, the MSUB tint and the index listing once `machines.house` exists in `study/data.js`.

Rebuild the model and hero: `python build_house.py` with `bpy` 5.x (`PREVIEW=1` for a quick 640 × 400 render), then
convert `house-hero.png` to `house-hero.jpg` (1600 × 1000) and `study/thumbnails/house.jpg` (800 × 500).
