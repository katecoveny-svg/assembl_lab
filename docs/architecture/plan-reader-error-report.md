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

Still not measured for the AI reader: wall, partition, opening and room errors, and read time. Once the send is allowed: `python3 run_page_ai.py`, then `python3 compare.py out/ai.traced.plan.json`. The script sends sheet 7 only and stops at 3 calls.

## Not measured

Accuracy of traced walls, openings and rooms. That needs a floor plan with real linework and an answer key, or the AI plan reader (costs money, sends the drawing out, needs Kate's say-so).

## How it was run

Two routes, same result: the real page in headless Chrome (`/api/` blocked and never requested), and the tool's own functions bundled with esbuild and called directly.

Run again from `/home/claude/prove`: `python3 run_page.py`, `node build.mjs && python3 run_probe.py`, `python3 -I measure_true_scale.py`, `python3 -I vector_in_plan.py`, `python3 compare.py`. Results land in `out/`. `compare.py` was self-tested: the key against itself scores 45 of 45.

## Since this report

The false building from the site plan sheet is fixed (merged 21 November): the reader also checks that the outside walls on their own enclose a real footprint. The consent wording before an AI read now names the provider the lab is actually set to and says how many sheets will be sent.
