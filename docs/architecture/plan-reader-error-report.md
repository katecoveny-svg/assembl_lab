# Plan reader error report: in-browser trace of the 17 November floor plan

Measured 21 November 2026. Tool: `plan-studio/twins/drop/`, branch `twin-interiors-landscape`. Test sheet: RC-031, sheet 7 of 13. Answer key: `hero.plan.json`. Only the in-browser part was measured. The AI plan reader was not called.

## Headline

**First-time accuracy: 0 of 45 building elements traced.** The tool picked the right sheet and read the right scale. Then it stopped: "Sheet 7 has no linework to measure: its plan is a picture inside the PDF." No twin can be built from this sheet in the browser alone.

## The numbers

| Item | Key | Found | Matched | Missed | Extra |
|---|---|---|---|---|---|
| Floor plan sheet | sheet 7 | sheet 7 | 1 of 1 | 0 | 0 |
| Scale | 1:50 | 1:50 | 1 of 1 | 0 | 0 |
| Outer walls | 4 | 0 | 0 of 4 | 4 | 0 |
| Partitions (within 100 mm) | 10 | 0 | 0 of 10 | 10 | 0 |
| Openings, south wall (within 150 mm) | 3 | 0 | 0 of 3 | 3 | 0 |
| Openings, west wall | 3 | 0 | 0 of 3 | 3 | 0 |
| Openings, east wall | 3 | 0 | 0 of 3 | 3 | 0 |
| Openings, north wall | 4 | 0 | 0 of 4 | 4 | 0 |
| Inside doors and openings | 8 | 0 | 0 of 8 | 8 | 0 |
| Rooms | 10 | 0 | 0 of 10 | 10 | 0 |
| Room names | 10 | 0 | 0 of 10 | 10 | 0 |

The 45 elements: 4 outer walls, 10 partitions, 13 outside openings, 8 inside openings, 10 rooms.

**Errors in millimetres** (wall position and length, opening width, room area): none to report, because nothing was traced.

**Scale.** The tool read "1:25 at A1" and worked out 1:50 for this A3 page. Correct. Independent check: the drawn outside walls measure 153.6 × 228.1 mm on the page. That is 7.68 × 11.41 m at 1:50. The key says 7.70 × 11.42 m.

**Time.** 2.0 to 2.7 seconds from choosing the file to the message (4 runs).

**Hand steps: 1.** I chose the file, the same as dropping it. The tool picked the sheet and the scale itself and asked for no confirmations. The only button then offered was "Read it with the AI plan reader". I did not press it.

## Worst three errors

1. **Nothing traced (0 of 45).** Cause, confirmed: the plan on this sheet is 13 picture tiles at 300 dpi, not linework. The in-browser reader only measures linework. It found 175 line segments on the sheet, none drawing a wall (the only ones inside the house are one section-cut line and its tag). Its only two wall candidates sat in the title block. Its own check rejected them (it needs 4 walls and a 3 m footprint: `planTrace.ts`, line 356).
2. **Room names (0 of 10).** Confirmed: the room tags print as "?" (16 "?" text runs, no room names, no written dimensions). Guess: the tags were empty when the sheet was exported.
3. **A false building from the wrong sheet.** Outside the floor plan sheet, measured once. If a person picks sheet 2 (the site plan) by hand, the tool returns a "building" of 7.50 × 0.11 m, labelled "measured from linework", with the Build button on. Guess: the tool checks how far the wall lines spread, not the final footprint.

## Not read (not errors)

The in-browser part reads none of these. It fills in defaults (confirmed in the code and on the page).

| Item | Tool default | Key |
|---|---|---|
| Ceiling height | 2.40 m | 2.42 m |
| Opening heads | 2.10 m | 2.00 to 2.20 m |
| Window sills | 0.9 m (0.5 m if wide) | 0 to 1.0 m |
| Roof | gable, 15° | skillion, 8° |
| Floor above ground | 0.60 m | site model |
| Decks | none | 3 |
| Stair | none | none (drawn on the site layout sheet) |
| North | up the sheet | 26.4° |

## AI reader, measured 21 November

**Not measured: 0 of 45 elements scored.** The session's permission check stopped the live read before the sheet was sent (reason given: sensitive information leaving the machine). No drawing left the machine and no money was spent. Endpoint calls: 1 of the 3 allowed, the free status check.

Measured without sending the drawing (a dry run of the real page, with a made-up reply in place of the AI):

| Item | Result |
|---|---|
| Endpoint status (1.7 s) | set up; default model OpenAI `gpt-6.2-astra` |
| Picture the page sends for sheet 7 | one, 1,241 × 1,568 pixels: the plan only, no title block |
| Scale the page would use | 1:50 from the title block, unchecked |
| Hand steps to a built twin | 5: choose the file, set sheets 4 and 6 to "Skip", press the AI button, press "Build the twin" |
| Confirmations asked for | 0. A box for the long side is offered, not required |

Two things to know:

- The page pre-selects sheet 6 (site layout) and sheet 4 (elevations) as well. Left alone, the code sends them with the floor plan (`traceUI.ts` line 219; not run). Three sheets would go out, not one.
- The page's message says the reader is "Claude, by Anthropic". The live endpoint's default is OpenAI.

Measured the next day (see the section below). The method: `python3 run_page_ai.py`, then `python3 compare.py out/ai.traced.plan.json`. The script sends sheet 7 only and stops at 3 calls.

## AI reader, measured 22 November

Kate approved sending the 17 November sheets. One read was run through the real drop page. Only sheet 7 (the floor plan, as one picture of 1,241 × 1,568 pixels, no title block) was sent; sheets 4 and 6 were set to "Skip" first. Reader: OpenAI `gpt-6.2-astra`. Read time: 21 seconds. Endpoint calls used: 2 of the 3 allowed (one status check, one read).

Scored against the same answer key (`hero.plan.json`, sizes scaled by hand from the 17 November sheets, not confirmed by the architect):

| Item | Key | Found | Right | Worst error |
|---|---|---|---|---|
| Footprint | 11.42 × 7.70 m | 11.38 × 7.68 m | yes | 40 mm on the long side |
| Outside walls | 4 | 4 | 4 | 40 mm |
| Inside walls | 10 | 9 | 9, none invented | 26 mm (mean 17 mm) |
| Outside doors and windows | 13 | 13 | 12 | 19 mm centre, 16 mm width |
| Inside doors and openings | 8 | 9 | 6, plus 3 extra | 20 mm centre, 63 mm width |
| Rooms | 10 | 6 | 6 | areas within 2% for four rooms |

What it got wrong:

- **The living room bi-fold doors** on the deck side were not matched; one opening on that wall is in the wrong place or of the wrong width.
- **Both wardrobes and the hall** were not read as rooms, and both wardrobe doors were missed. The two bedrooms came out about 2 m² (20%) too large because they swallowed their wardrobes. One inside wall (P7) was missed.
- **Three inside openings that are not in the key** were added.
- **Names.** Bedrooms came back as "Bedroom" with no number, the ensuite as "Bathroom", the study with no name, and kitchen, living and dining as one open room.
- **One kind wrong.** The study's glazed door was read as a window.
- **Scale** was taken from the title block (1:50) with nothing on the sheet to check it against. The page says so and offers a box for the long side.

What this does and does not show:

- One read, of one sheet, of one house. AI reads vary from run to run; consistency has not been measured.
- The site plan and elevation reads have not been measured.
- Heights, sills, roof form and floor level are assumed by the page, not read (it says so in its report).
- Result: connected and measured once. Not yet verified across drawings.

Run again with `python3 run_page_ai.py`, then `python3 compare.py out/ai.traced.plan.json` (scripts kept outside the repository).

Consistency, the site plan and the elevations were measured later the same day: see the next section.

## AI reader, measured again 22 November: consistency, site, elevations, and the fix

Same drawing set, same answer key, same scoring rules. Reader: OpenAI `gpt-6.2-astra` on the live lab. Every read went through the real drop page, one sheet per call.

### Headline

- **Consistent.** Three reads of the floor plan scored the same 37 of 45 elements, with the same misses every time. Sizes moved by 10 mm or less between reads.
- **Most misses were the page, not the AI.** In all three replies the AI had found both wardrobes, both wardrobe sliders and the 3.6 m bi-fold. The page threw them away: it dropped rooms under 0.8 m, cut doors to 1.0 m (inside) or 1.2 m (outside) from one end, and joined two walls across the hall, inventing an opening.
- **Page fixed, measured on the same three replies:** 43 of 45 in every run, no extra elements, and bedroom areas within 2.2% (they were 21% too big).
- **New reader prompts: not measured.** The branch preview runs the new reader (its status reports prompt revision `2026-11-22b`), but no reader keys are set for preview builds (`configured: false` for all three providers). No read was made there. Adding keys is a credentialed change for Kate to approve.

### Floor plan, before and after

Before: three live reads (the 22 November morning read and two more), through the page as it was on `main`. After (page fix): the same three replies, saved, fed back through the new page with no network. The page's handling is fixed code, so the replies stand in for live reads exactly. The new prompts are not in this column.

| Item (key) | Before: 3 live reads, mean (worst) | After, page fix: same 3 replies, mean (worst) | After, new reader on the preview |
|---|---|---|---|
| Elements right (of 45) | 37 (37) | **43 (43)** | not measured |
| Footprint (11.42 × 7.70 m) | 11.38 × 7.68, 11.38 × 7.68, 11.37 × 7.67; worst 50 mm | same | not measured |
| Inside walls (10) | 9 (9); error 19 mm mean, 31 mm worst | **10 (10)**; 18 mm mean, 31 mm worst | not measured |
| Outside doors and windows (13) | 12 (12), plus 1 extra | **13 (13)**, none extra | not measured |
| Outside kinds right | 11 of 12 matched | 12 of 13 (the study's glazed door reads as a window) | not measured |
| Outside positions | 24 mm centre, 24 mm width (worst) | same | not measured |
| Inside doors and openings (8) | 6 (6), plus 3 extra | **8 (8)**, none extra | not measured |
| Inside positions | 29 mm centre, 81 mm width (worst) | same | not measured |
| Rooms (10) | 6 (6) | **8 (8)** | not measured |
| Rooms as drawn (9: the open-plan kitchen, dining and living has one tag) | 6 (6) | **8 (8)**; only the hall missing | not measured |
| Room area error, rooms matched as drawn | 7.7% mean; bedrooms +21% | **2.0% mean; bedrooms 2.2% worst** | not measured |
| Room names (the sheet prints none: every tag is "?") | 5 to 6 rooms given made-up names; one read called the study "Living" | unchanged (names come from the prompt) | not measured |
| Names right after suggestion, against the key's names | 1 of 6 matched rooms (only "Bathroom") | as recorded: 1 of 8 (the old prompt's names, unnumbered). With every name set to "?" and the fixtures stood in (see below): **5 of 8 in all three runs** (5 of the key's 10) | not measured |
| Floor plan read time | 22.1 s mean (21.3, 22.2, 22.8) | page work under 1 s | not measured |

**Room names, since the coordinator's review.** The page keeps the printed name exactly ("?" stays the printed name), suggests a name from what is drawn in the room, and uses the suggestion for the fit-out and the 3D room tags, marked "named from what is drawn: check" (never as printed). Before "Build the twin" every room is listed with a name box, prefilled with the printed name or the suggestion and a tag saying which; a person's edit wins and is recorded as "named by a person". The rules (`roomNames.ts`): a bed gives Bedroom (numbered in sheet reading order when there are several); a toilet with no shower or bath gives WC; a toilet, shower, bath or basin gives Bathroom, or Ensuite when every door of the room opens off a bedroom; a hob, or a bench with a sink, gives Kitchen; washing machine or tub gives Laundry; a hanging rail, or a small room off a bedroom with nothing drawn, gives Wardrobe; a corridor shape with two or more doors off it gives Hall; anything else is Room. WC and Laundry go beyond the brief: a WC named Bathroom would get a shower in the fit-out.

How "5 of 8" was measured: the three recorded replies come from the old prompt, which made names up and has no `fixtures` field. For this count every room name was set to "?" (all this sheet prints) and its fixtures were stood in from that reply's own name (bed for a bedroom, toilet, basin and shower for a bathroom, bench, hob and sink for the kitchen, nothing for the rest). Right: both bedrooms, both wardrobes, the kitchen. Wrong: the narrow wet room became "Bathroom 1" (its door opens to the hall, so the rule does not call it an ensuite, and the stand-in cannot tell a WC from a bathroom), the bathroom "Bathroom 2", the study "Room". The hall is not in these replies. The real count needs a read with the new prompt, which returns fixtures.

### Site layout (sheet 6, mode `site`, one read)

| Item | Result | Scored against |
|---|---|---|
| House drawn on the site sheet | 11.41 × 7.66 m (−10, −40 mm); the page lined the site up on it | key footprint |
| Decks | 61.1 m² read in 3 pieces; 60.3 m² of it on the key's decks, 0.8 m² off them. The key's decks total 76.8 m² because the key draws the narrow strip beside the study and bedroom 2 at the full deck width; the drawings' area schedule gives about 61 m² | key decks |
| Entry stair | found; 97% overlap with the key's flights and landings; centre 0.02 m off | key steps and landings |
| Upper retaining wall | the whole key line has a read wall within 0.3 m (median 0.2 m). The reader also drew 19.7 m the key does not have: an arm down the east side and the lower curved wall. Both appear on the sheet, so they are not counted as errors | key retaining |
| Car parking bay | **missed** | key parking |
| Trees, planting | none read; none in the key | counted only |
| Time | 16.7 s | |

Not scored: the boundary (the page does not use it, and the key's boundary is the LINZ parcel), north (the north point sits in the title band, which the page crops off before the read), step and wall heights (not asked for).

### Elevations (sheet 4, mode `elevation`, one read)

| Item | Result |
|---|---|
| Views found | 4 of 4 |
| Roof form, slope or band, high side in each view | all right (4 of 4 each) |
| Pitch | 8.0° and 8.1° on the two views that show it (key 8°); the page used 8° |
| Building length in each view | −19, −16, +34 and −16 mm (key 7.68 m and 11.40 m) |
| Eave height above the floor | within 9 to 36 mm in three views; the west view 90 mm low |
| View titles | 1 of 4 right (on this sheet the titles sit away from their views); the page does not use them |
| Plate height | 2.42 m, exact, but from the levels written on the sheet, not from the AI |
| Roof high side on the twin | wrong before (the page guesses it from the glazing on the plan, and had cut the bi-fold to 1.2 m); right after the page fix |
| Floor above the ground | 0.15 m uphill (the page's minimum: the drawing shows the ground above the floor there) and 4.4 m downhill. Not scored: the key's ground is the LiDAR survey, and the drawings say their ground line is not verified |
| Time | 19.2 s |

The whole set (three reads, one after another) took 60.4 s on the page.

### What was changed

The reader (`functions/api/plan-read.js`, prompt revision `2026-11-22b`). Nothing in the prompts is about this house:

- Every enclosed space is a room, however small: halls, wardrobes, pantries, linen cupboards, WCs. Room boxes do not overlap; an L-shaped room gives its main rectangle.
- Room names are copied exactly as printed, numbers kept ("Bedroom 2"). A blank or "?" tag stays "?". Rooms are never named from their furniture. A new room field, `fixtures`, records what is drawn in the room as an observation, not a name.
- Opening kinds: `door` is one leaf; `door-double` is the whole set of two or more leaves (sliders, stackers, bi-folds, wardrobe sliders) at its full width; a glazed door has a swing, a leaf or a sliding track; `glazing` is fixed full-height glass.
- Short walls that close small rooms are asked for; walls on either side of a hall are kept as two walls.
- Site plans: parking bays drawn only as a labelled outline; rows of circles as pole retaining walls.
- Every reply and the status check carry the prompt revision, so the page knows what each field means and a preview can be checked without a paid read.

The page (`planTrace.ts`, `traceUI.ts`, bundles rebuilt):

- Rooms down to 0.45 m are kept. A small room inside a bigger room's box, along one side, cuts the bigger room back to its wall.
- Two wall pieces in line stay apart unless the reader put an opening in the gap.
- Doors of two or more leaves keep their full width: outside, 1.6 m and wider is a sliding or folding door; inside, wider than 1.25 m is an opening. A single leaf is capped about its centre, not from one end.
- "Glazing" from a stamped reply is a fixed window to the floor. Older replies and linework reads keep the old meaning (a sliding door).
- Rooms whose tag prints "?" get a suggested name, marked "named from what is drawn: check", and a name box each before building (see Room names above). The report says how many tags print "?".
- The site plan and elevation reads now go at the same time as the floor plan read, not after it: the same three calls. Measured with simulated 8-second replies: 29.2 s down to 12.5 s for the set. With the real read times above that should be about 26 s instead of 60 s. Not measured live.

A second, focused look at the busiest part of the plan was considered and not added. The numbers do not call for it: the small rooms and doors were already in the AI's replies, and positions were within 31 mm. It would double the cost and add about 20 seconds.

Tests: 94 pass (`node --test tests/plan-read/*.test.mjs tests/live/*.test.mjs tests/code-checks/*.test.mjs`), including new tests of the schema, the prompts, the revision stamp, the naming rules, a person's edit winning, and the page's handling on a made-up 8 × 6 m box. The functions still bundle (`wrangler pages functions build`).

### Still weak

Measured:

- **The hall** (no tag) was not returned as a room in any of the three reads. The new prompt asks for it; not measured.
- **Names.** The old prompt made names up when the tag showed "?". The new prompt keeps "?" and reports what is drawn; the page then suggests a name, marked for checking. Measured on stand-in fixtures only: 5 of 8 right. The study and the narrow wet room are not named right by the rules.
- **The study's glazed door** read as a window in all three reads. On the floor plan it is drawn without a swing; only the elevation shows it reaches the floor. A plan-only reader cannot tell.
- **The car parking bay** was missed on the site sheet (one read). The new site prompt asks for it; not measured.
- **The west elevation's eave** came out 90 mm low (one read).
- **One inside door** was 81 mm too narrow.

Not yet known:

- How close the new prompts get. The most this sheet allows is 44 of 45: the open plan has one tag, and the key splits it in two. Run 3 floor plan reads and one each of the site and elevations on the preview once it has a reader key.
- Any drawing but this one. One house, one drawing set, one model.

### What a person must still check by eye

- The overall size against a written dimension. This sheet has none, so the scale comes from the title block alone.
- Every room name. On this sheet every tag prints "?". The page suggests names from what is drawn and tags them "named from what is drawn: check"; correct them in the list before building.
- Doors against windows wherever the plan shows no swing or track.
- Heights, sills and door heads: assumed by the page, not read.
- The roof's high side: the page guesses it from the glazing on the plan.
- The floor height above the ground: the drawings and the survey disagree.
- On the site: the parking bay, north, the boundary and retaining wall heights.

### Endpoint calls

This round: 4 paid reads on the live lab (sheet 7 twice, sheets 6 and 4 once each) and 1 free status check of the preview. Running total: 7 calls, against a limit of 16 kept by the script.

### Run it again

From `/home/claude/prove` (scripts kept outside the repository):

- `TAG=b1 MODES=plan,site,elevation python3 run_page_ai.py` (3 calls), or `TAG=b2 MODES=plan python3 run_page_ai.py` (1 call)
- With `LIVE=https://agent-reader2-1122.assembl-lab.pages.dev/api/plan-read/` it sends to the branch preview. That only works once the preview has a reader key and has been redeployed.
- `REPLAY=out/runs/b1 TAG=r_b1 MODES=plan,site,elevation python3 run_page_ai.py` feeds saved replies through the page, with no network and no cost.
- `python3 compare.py out/runs/<tag>.traced.plan.json --site out/runs/<tag>_site.json --elev out/runs/<tag>_elevation.json --out out/runs/<tag>_score.json`, then `python3 summarise.py b0,b1,b2 r_b0,r_b1,r_b2` for the table.

## Live, new prompts (22 November, evening)

Measured on the live lab after the merge (bundle `twin-CbJNWISH.js`, prompt revision `2026-11-22b` in every reply, OpenAI `gpt-6.2-astra`), through the real drop page. Two full sets (floor plan, site plan and elevations sent together, as the page now does) and one more floor plan read. Same answer key and scoring. "Old prompts" are the three recorded replies from before, fed through the same fixed page.

| Item (key) | Old prompts, fixed page (3 replies) | New prompts, live (3 reads) |
|---|---|---|
| Elements right (of 45) | 43, 43, 43 | **44, 44, 44** |
| Rooms as drawn (9) | 8 (the hall missing) | **9** (the hall found every time) |
| Inside walls (10) | 10; 18 mm mean, 31 mm worst | 10; 18 mm mean, 31 mm worst |
| Outside doors and windows (13) | 13, kinds right 12 | 13, kinds right 12 (the study's glazed door still reads as a window) |
| Outside positions, worst | centre 24 mm, width 24 mm | centre 28 mm, width 32 mm (worse, see below) |
| Inside doors and openings (8) | 8, none extra; worst 29 mm centre, 81 mm width | 8, none extra; worst 29 mm centre, 72 mm width |
| Room area error, mean (as drawn) | 2.0% | 1.9% |
| Rooms returned with a made-up name (the sheet prints only "?") | 7 to 8 per read | **0 of 9**; all returned as "?", with fixtures for the 6 rooms that have any drawn |
| Names right after suggestion (key names) | 1 of 8 as recorded | **7 of 9 in all three** (7 of the key's 10) |
| Floor plan read | 21.3 to 22.8 s | 22.1 to 23.6 s |
| Whole set on the page | 60.4 s (old page, one sheet after another) | **24.7 s and 24.2 s** (sent together) |

Names right: both bedrooms, both wardrobes, the hall, the bathroom and the kitchen. Wrong: the narrow wet room came out "WC" (the reader saw a toilet and basin, and its door opens to the hall; the key calls it Ensuite, and earlier sheets of the same design tag it WC), and the study came out "Room" (a chair outline is all that is drawn).

Site plan (2 reads, against 1 old read): the house drawn on the site sheet came out 63 and 66 mm, then 63 and 39 mm, short (old: 10 and 40 mm). That is 1 to 2 pixels of the site crop (27 mm a pixel). Decks: 60.5 and 60.6 m² on the key's decks (old 60.3). Stair overlap: 94% and 95% (old 97%). Retaining: the whole key line within 0.3 m both times. **The car parking bay was still missed both times**: the new parking line in the prompt did not help.

Elevations (2 reads, prompt unchanged): the same as before within 30 mm. All four views, roof form, slope or band and high side right; pitch 8.0° and 8.1°; the west eave is still 90 mm low.

Where the new prompts score worse:

- **Outside opening positions**: worst width error 32 mm against 24 mm, worst centre 28 mm against 24 mm. Both are the two bedroom sliders, by about one pixel of the plan image (8 mm). I believe the cause is the new opening rule: the sliders are now read as `door-double`, "from the outer end of the first leaf to the outer end of the last", where the old prompt called them `glazing`. Within the ± 150 mm the page states.
- **Site sheet outline**: up to 66 mm short against 40 mm. I believe this is run-to-run noise at the pixel limit: the outline instruction did not change, and there is only one old read to compare with.
- **Stair overlap**: 2 to 3 points lower, also within a pixel or two.

Calls this pass: 7 paid reads (sheet 7 three times, sheets 6 and 4 twice each). Running total: 14 of the 16 the script allows.

## Not measured

Accuracy of traced walls, openings and rooms. That needs a floor plan with real linework and an answer key, or the AI plan reader (costs money, sends the drawing out, needs Kate's say-so).

## How it was run

Two routes, same result: the real page in headless Chrome (`/api/` blocked and never requested), and the tool's own functions bundled with esbuild and called directly.

Run again from `/home/claude/prove`: `python3 run_page.py`, `node build.mjs && python3 run_probe.py`, `python3 -I measure_true_scale.py`, `python3 -I vector_in_plan.py`, `python3 compare.py`. Results land in `out/`. `compare.py` was self-tested: the key against itself scores 45 of 45.

## Since this report

The false building from the site plan sheet is fixed (merged 21 November): the reader also checks that the outside walls on their own enclose a real footprint. The consent wording before an AI read now names the provider the lab is actually set to and says how many sheets will be sent.
