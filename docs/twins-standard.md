# The twins standard: an audit against the grocery DC

Kate, 8 Nov 2026: "can we up the standard of the sims?" The standard is the NVIDIA SimReady grocery distribution centre at
`/store/dc/` (PR #82, method in `docs/SIMREADY-PLAN.md`). This file scores every business sim in the Lab against it, says
why, and names the fix. Scored by reading each page's code and screenshotting it at 1440 and 390 wide in headless Chromium
(SwiftShader, so light, shadows and bloom are approximate and frame rates are only a floor). Audited 8 Nov 2026.

## What counts as a business twin

| Kind | Folders |
|---|---|
| Business twins (the Lab home's "Business sims" and "More twins") | `cafe/`, `store/` (supermarket) and `store/dc/` (DC), `ed/`, `dairy/`, `energy/`, `retail/`, `stay/`, `office/`, `tourism/`, `trades/`, and `cars/` (on the home, outside this pass) |
| Household sims, not business twins | `home/`, `kitchen/`, `food/`, `everyday/` |
| Shared code, not twins | `assets/twin/1` and `2` (the maquette stage), `assets/twin/3` (the SimReady kit, new in this pass), `lab/`, `kitchen/kitchen3d.js` is part of the kitchen page |

## The criteria (0, 1 or 2 each, 22 in all)

1. **Real 3D of the place.** SimReady equipment for everything a visitor would name, PBR light, credible proportions. Grey boxes standing in for machines score 0; a hand-made maquette scores 1.
2. **Moving parts driven by the sim's own state:** queues, trucks, beds, people, machines.
3. **A real running sim:** stations, cycle times and queues building up, in a model with no rendering code that can run headless.
4. **Run one for a day:** change one thing and follow where it goes.
5. **Real NZ public figures,** each with its source and date.
6. **Truth labels on everything:** Simulated, Shadow, Live or Latest published, Example and fictional.
7. **Works on a phone at 390 wide,** no sideways scroll.
8. **Performance:** under 6 MB of models, about 1.5 M triangles and 400 draw calls at the overview, quality tiers.
9. **Reduced motion:** a still, paused model, with the controls to run or pause it.
10. **Real DOM text** for tags, figures and captions.
11. **Licence and copy:** SimReady credit and notice where used; lowercase assembl, NZ English, no em dashes.

## Headline scores

| Twin | Score | One line |
|---|---|---|
| **Grocery DC** `store/dc/` (the bar) | **19 / 22** | SimReady, PBR, honest agent model, tour. No levers to change, and no NZ public figures. |
| **Emergency department floor** `ed/floor/` (new) | **21 / 22** | The ED page's own model, unchanged, on SimReady beds, curtains, monitors and resus kit. |
| **Dairy plant floor** `dairy/plant/` (new) | **20 / 22** | New agent model from the season page's figures; tankers, silos, dryer, bagging, forklifts, containers. |
| Emergency department `ed/` (before) | 17 / 22 | Strong model, levers and Health NZ figures; maquette drawing. Now links to its floor. |
| Café `cafe/` | 16 / 22 | Authored Blender venue on stage v2 with a tested model; maquette look, no SimReady kit yet. |
| Supermarket `store/` | 16 / 22 | Good model and public data; maquette aisles. Next to the DC, it shows the gap most. |
| Trade yard `retail/` | 16 / 22 | Good data and levers; maquette yard; two em dashes. |
| Dairy plant `dairy/` (before) | 15 / 22 | Season arithmetic and an AI ledger with good sources; maquette plant, no running queues. Now links to its floor. |
| Accommodation `stay/` | 15 / 22 | Year-at-once booking model; maquette lodge; two em dashes. |
| Office `office/` | 15 / 22 | Three floors and a commute model; maquette floors. |
| Energy retailer `energy/` | 14 / 22 | Four customer journeys on a 2D canvas street; strong sources; four em dashes. |
| Tourism flows `tourism/` | 13 / 22 | Map-based by design (the plan leaves it); thirty em dashes; no Shadow labels where feeds would apply. |
| Trades `trades/` | 12 / 22 | A plan-to-quote tool, not a running sim; 2D by design. |

Household sims (not scored against the business bar): Kiwi home `home/` uses the maquette stage and would take the
SimReady appliance pass in the plan; kitchen, food flow and every day counts are 2D pages with good sourcing.

## Each twin: score, why, fix

Scores are in criteria order (1 to 11).

### Grocery DC `store/dc/`: 2 2 2 1 0 2 2 2 2 2 2 = 19
- **Why:** everything a visitor would name is SimReady; PBR with GTAO and emitter-only bloom; `sim.js` has no rendering and runs a shift headless; tour, tags, path lines, phone sheet, reduced-motion pause, no-WebGL still, credit and notice. The only control is speed, so there's no "change one thing"; no NZ figure appears.
- **Fix:** add two or three levers (pickers, wrappers, truck gap) with a whole-shift comparison, as the dairy floor now has; cite one public figure (the supermarket page's Retail Trade Survey or food price index) beside the simulated ones. Move it onto `assets/twin/3/` so it shares the kit (it was the source of the kit, so this is a small change).

### Emergency department floor `ed/floor/` (new): 2 2 2 2 2 2 2 1 2 2 2 = 21
- **Why:** SimReady beds, cubicle curtains, monitors, IV poles, sofas, desks, stools, crash cart, surgical lights and wheelchairs; patients are drawn from `ed/sim.js`, which is the department page's model moved out unchanged (a test pins its weekly results to the original's); the page's levers apply live, and a week-per-change comparison runs headless; Health NZ's national 6-hour figure with period; 111 notice. About 2.3 M triangles and 330 to 390 draw calls at mid tier, counting the shadow pass, so the triangle budget is over.
- **Fix:** an LOD for beds and curtains at the overview, or shadows from a proxy; show a six-hour ring or colour per patient (the department page's signature) as a toggle.

### Dairy plant floor `dairy/plant/` (new): 2 2 2 2 1 2 2 1 2 2 2 = 20
- **Why:** SimReady forklifts, pallets, racking, belt conveyors, roller outfeeds, label printer, stainless IBC, QA bench and guards; silos, evaporator, dryer tower, tankers and palletisers made for the page; a new agent model (`dairy/plant/sim.js`) built on the season page's own figures (4.4 M litres at peak, DCANZ 2022/23 monthly shares, 28,000 L a tanker, 7.5 L a kg, 30 t/h, 22 t a container, 20 h runs and 4 h cleans), with a tested day; levers for month, bays and forklifts, and a whole-day comparison. Live feeds (GDT, exchange rate, power) stay on `/dairy/`, so the floor itself carries the season figures but no live chip. Draw calls are 470 to 570 at the overview with shadows, over the 400 target.
- **Fix:** bake the tankers and people further (instanced figures like the ED floor), and bring the GDT chip across from `/dairy/`.

### Emergency department `ed/` (before): 1 2 2 2 2 2 2 1 1 2 2 = 17
- **Why:** the best model and data in the Lab (minute-by-minute patients, a week per change, Health NZ quarterly results, wastewater, weather), drawn as a card maquette on stage v1. Reduced motion is respected but there's no explicit run or pause of the model beyond the clock's Pause.
- **Fix:** done in this pass as `ed/floor/`, linked from the page; next, embed the floor's view in place of the maquette.

### Café `cafe/`: 1 2 2 2 1 2 2 1 1 2 0 = 16
- **Why:** an authored Blender venue (stage v2) with a rig contract and a golden-tested model, levers and compare; it's still the maquette look, and nothing in it is SimReady (so no credit is due, but the bar asks for real equipment).
- **Fix:** the plan's 1.5 days: dress the authored venue with SimReady coffee station, fridges, dishwasher and dishware, keeping its rig contract and tests.

### Supermarket `store/`: 1 2 1 2 2 2 2 1 1 2 1 = 16
- **Why:** a live-feeling maquette with food price indexes, Commerce Commission structure and the Retail Trade Survey; model inline in the page; one em dash.
- **Fix:** the plan's 2 days: gondola aisles, chillers and checkouts on the kit, fed by the DC's trucks.

### Trade yard `retail/`: 1 2 1 2 2 2 2 1 1 2 1 = 16
- **Why:** Retail Trade Survey hardware figures, MBIE diesel, a Saturday queue; maquette yard; two em dashes.
- **Fix:** the DC kit fits almost entirely (racking, pallets, forklifts): 1.5 days.

### Dairy plant `dairy/` (before): 1 1 1 2 2 2 2 1 1 2 1 = 15
- **Why:** strong sourcing (DCANZ, DairyNZ, EA, Waikato research, GDT live) and a season and AI ledger, but the 3D is a maquette and the "day" is arithmetic, not queues.
- **Fix:** done in this pass as `dairy/plant/`, linked from the page.

### Accommodation `stay/`: 1 2 1 2 1 2 2 1 1 2 1 = 15
- **Why:** bookings, cleaning and commissions as estimates with exchange rates and holidays as context; maquette lodge; two em dashes.
- **Fix:** SimReady bedding, cleaning trolleys and luggage carts on the kit, 1.5 days; fix the dashes.

### Office `office/`: 1 2 1 2 1 2 2 1 1 2 2 = 15
- **Why:** three fictional floors, 120 desks, fuel and power feeds; maquette.
- **Fix:** instanced SimReady desks, chairs and monitors, 2 days.

### Energy retailer `energy/`: 0 1 1 2 2 2 2 2 1 2 1 = 14
- **Why:** four journeys through one power company on a 2D street; very good sources; little in SimReady fits; four em dashes.
- **Fix:** keep it 2D (the plan gives it half a day for appliances through windows); fix the dashes.

### Tourism flows `tourism/`: 1 1 1 1 2 1 2 1 1 2 0 = 13
- **Why:** map-based flows on Stats NZ and MBIE tables; thirty em dashes in its copy; no feed reaches it, which is labelled.
- **Fix:** leave the map (nothing in SimReady fits); a copy pass to remove the dashes.

### Trades `trades/`: 0 0 1 2 2 2 1 2 1 2 1 = 12
- **Why:** a plan-to-quote tool with a person in the loop, Building Code checks and fictional plans; 2D by design, not a running sim.
- **Fix:** optional ute and site-shed scene (1 day); the tools stay 2D.

## What changed in this pass

- `assets/twin/3/`: the shared SimReady kit, pulled from the DC (renderer and light, tiers with a frame-rate drop, meshopt loader with progress, instancing, baking, shadow stand-ins, people, tour, tags, path lines, bottom bar) and `overlay.css` (the DC's overlays). A path helper with no rendering, so models import it in Node.
- `dairy/plant/` and `ed/floor/`: two new twins on the kit, linked from `/dairy/` and `/ed/`. `ed/sim.js` is the ED model moved out of `ed/index.html` unchanged, so both pages share it.
- Thirteen SimReady models processed with `scripts/simready/pipeline.mjs` (now able to write to subfolders and handle multi-root files): 0.8 MB for the dairy, 1.2 MB for the ED, each folder with its `SIMREADY-NOTICE.md`.
- Headless tests: `dairy/plant/tests/` and `ed/floor/tests/` (run with `node --test <folder>/*.test.mjs`).
- No farm sim, as asked.
