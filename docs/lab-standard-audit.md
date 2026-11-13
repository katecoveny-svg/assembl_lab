# assembl lab: audit against the standard of assembl.co.nz's new home page

13 November 2026. Branch `claude/lab-standard`. Kate: "I need the lab.assembl page brought up to the same standard."

This file records what serves the Lab, what the Lab is, what each top-level page looked like before this branch, what
was changed, what was not reached, and what is broken. It is internal (`/docs/` is not deployed).

## Which code serves lab.assembl.co.nz

This repository, `katecoveny-svg/assembl_lab`, branch `main`, deployed by Vercel as static files plus `api/` functions.

How we know (checked 13 November 2026):

- `https://lab.assembl.co.nz/` and `https://assembl-lab.vercel.app/` returned the same ETag, length and last-modified.
- The live page was byte-identical to `index.html` on `main` at `1e25422` (sha256 `f490c4b6…e33ccf`, 58,669 bytes).
- The response has no `/_next/` assets. The main site is a Next.js app; this is not.
- In the main repository, `app/lab/route.ts` only redirects `/lab` to `https://lab.assembl.co.nz/` (307). The main
  repository does not serve the Lab.

## What the Lab is, and who it is for

A set of small working models of New Zealand places and systems, built by assembl in Tāmaki Makaurau Auckland. Since
ADR-015 (13 November) assembl is a New Zealand marketing and advertising agency for the AI era; the Lab is its workshop
for the third outcome it sells, "show what's possible".

| Part | What it is | Who it is for |
|---|---|---|
| Business twins | A café, supermarket, emergency department, dairy plant, energy retailer, car yard and others you can run for a day. Invented businesses fed by named public figures. | Business owners and prospects: "what would a twin of my place look like?" |
| Study machines (`/study/`, "assembly") | One curriculum idea per 3D machine, Years 7 to 13 and NCEA, with a tutor. | Students, whānau and teachers. Exam season is on now. |
| Plan Studio, Auckland in 3D, AR, capture | Plans to a measured model; a sourced city model; models you can place in a room. | Architects, builders, property people; the agency's 3D practice. |
| Playground | Small instruments for making things. Nothing leaves the device. | Anyone. |

Every world carries a truth label: Simulated, Live, Illustrative, with a maturity stage (Model, Shadow) and a source
line. That labelling is the Lab's best habit and this branch keeps all of it.

## Rights to fix

**For Kate to decide. Nothing here was deleted or changed, and no new use of any car model was added.**

A bought or downloaded 3D model can usually be shown as a rendered picture, but putting its geometry before the public
in three dimensions, or passing its files on, needs a licence that says so. This section lists every car-shaped 3D file
the Lab serves and the source the repository records for it, so each can be confirmed. The fuller note, with the
detail that does not belong in a public repository, went to Kate directly on 13 November 2026.

### What was looked for, and the answer

**No showroom scene and no bought car model was found being served by the Lab as 3D geometry.** Established by:

- No file in this repository matches the showroom deliverables Kate's asset record lists, by name, byte size or SHA-256.
- No Draco-compressed car or showroom package, and no zipped model package, is in the repository. (The only Draco
  files are the Lab's own AR worlds; the only zips are made in the visitor's browser by the capture tool.)
- On the live site, `/showroom/`, `/cars/showroom/` and six guessed showroom file paths all answer 404, as do the
  dealer twin's two retired car paths (`assets/cars/hatch.glb`, `assets/hero/sedan.glb`).
- Loaded in a browser, `/cars/dealer-twin/` requests no 3D model file at all. Its generic car model is fetched only when a
  visitor presses "View in 3D" on a listing.

**Limit of this check:** the original bought files were not available to compare against, so the cars below are cleared
by their documented source and by what the files contain, not by a file match. Kate should confirm each.

### Car-shaped 3D geometry the Lab does serve publicly (confirm the source of each)

| Files (all answer 200 on lab.assembl.co.nz) | Used by | Source as recorded in the repository | Confidence |
|---|---|---|---|
| `/assets/models/vehicles/hatch.glb`, `sedan.glb`, `wagon.glb`, `suv.glb`, `ute.glb`, `van.glb` (about 1 MB each, 36,000 to 40,000 triangles, no textures) | `/cars/dealer-twin/` ("View in 3D" in the stock spotlight, `js/vehicle-stage.js`). This is the "fictional dealer demo" the main site's `/dealers` page links to. Also `api/_cars/stock.js`. | `SOURCE-HANDOFF.md`: "Built entirely by one Blender Python script. No generated imagery, no scans, no third-party models". `source/build_vehicles.py` has no import or append call. Part names are the script's rig (BODY, WHEEL_RL). | High that these are scripted, not bought. Worth Kate's explicit yes for `hatch` and `suv`. |
| `/assets/models/vehicles/golf.glb` (1.1 MB, 42,173 triangles) | `/cars/` (the hero car, `cars/feed.json`, `cars/glbkit.js`) | `source/build_golf.py`: "All geometry is original: no downloaded models, scans or textures." | High. Separate question for Kate: it is described publicly as a "Simulated 2021 Volkswagen Golf", a real maker's design drawn by script. |
| `/ar/models/car_hatch.glb`, `car_sedan.glb`, `car_suv.glb`, `car_ute.glb`, `car_van.glb` and a `_table` copy of each (10 files, 73 to 80 KB, about 4,300 to 4,600 triangles, seven flat materials) | `/ar/` (`ar/js/builders.js`) | Only a docstring in `ar/tools/build_models.py`: "assembl's five Blender cars", copied from a folder outside this repository. | **Weakest paper trail.** The geometry is far too simple to be a bought showroom model, and there are five body styles, but no source file or script is in the repository. Needs Kate's confirmation. |
| `/capture/example/mx5-rf-sample.spz` (7.8 MB Gaussian splat of a Mazda MX-5) | `/capture/` and `/cars/` "3D capture" | Credited on the page: "Mazda MX5 remastered" by Goran (gorank) on SuperSplat, CC BY 4.0, superspl.at/scene/4271aa24. | Third-party under CC BY, with the attribution shown. Confirm it is the file that credit describes. |
| `/ar/worlds/files/f1-table.glb`, `f1-inside.glb` and their `.usdz`; `/assets/models/windtunnel/cad/race-car.obj`, `race-car-1to20.stl` | `/ar/`, `/study/m/windtunnel.html` | The study wind tunnel's own race car (`assets/models/windtunnel/build_windtunnel.py`, `REGISTER.md`). | Not dealership work. Listed so the car list is complete. |

Not served: `assets/models/vehicles/source/vehicles.blend` (404 live; excluded by `.vercelignore`).

### Two-dimensional only: the credit line needs checking

- `/cars/dealer-twin/`: the hero is 72 turntable frames (`assets/hero/tt_1600/f000.webp` to `f071.webp`, and
  `tt_900/`), `assets/hero/hero-wide.webp`, `assets/hero/maquette-2560.webp`, and the films in `assets/film/`
  (`poweron/`, `bricks/`, `parts/`). These are rendered pictures and video, not geometry.
- The page credits them: "AI-generated 3D model made by Kate Hudson, illustrative, not a vehicle in stock. Car and
  showroom rendered in Blender by assembl, 72 frames a turn." Kate should confirm that line says where the car and the
  room really came from, and correct it if not. The name "Kate Hudson" looks like an error.

### Linked from the Lab, not hosted by it

- `/audience-studio/` links to the assembl asset library ("Private library · login required"). Signed out, that site
  answered 401 on 13 November. What it holds, and who it is shared with, is outside this repository.

### Suggested order, for Kate

1. Confirm the source of the five `/ar/models/car_*` cars (the only ones without a script or source in the repository).
2. Confirm what the dealer twin's turntable car and room are, and correct the credit line if needed.
3. Say yes or no to the scripted `hatch` and `suv` being the Lab's own.

## The standard

`components/site/reconciled-home/` in `katecoveny-svg/assemblnz-f0afd79d` at `bd88e93` (13 November), with ADR-015 and
`docs/assembl-brand-system.md`:

- Inky plum ground `#180B18`; warm ivory `#F6F1ED` surfaces; paper `#FFFDFB`, chalk `#F5F1F2`; deep plum `#240B21`,
  mulberry `#654A4E` and heather `#916A70` (large type and marks only) on light surfaces; rose `#D9BACB` labels and
  petal `#E8C9DC` accents on plum.
- Instrument Sans 400 and 500. IBM Plex Mono for labels, sources, dates and status only. Lowercase `assembl`.
- A first screen that says what the place is within ten seconds; a finished picture first, live 3D behind it.
- Staged entrances, lift and glow on hover, reduced motion resting on the finished frame. No spinners, no fake waits.
- Liquid chrome, sparingly. A footer with depth. Plain New Zealand English. Truth labels wherever they apply.

## How the audit was done

- Every top-level page was loaded at 1440×900 and 375×812 in headless Chromium (Playwright with the cached build;
  software WebGL) from a local static server, with first-screen captures and measured facts: ground colour, font
  families, horizontal overflow, shared nav, footer, a link back to assembl.co.nz, truth-label words, bare "AI",
  capitalised brand, console and page errors. The home page was also walked screen by screen at both widths.
- The home page and its hover states were checked again in a real browser tab at 1440 and 375.
- Limits: a static server has no `api/` functions, so every `/api/live/`, `/api/mcp/` and `/api/trades-feeds/` call
  answered 404 locally. Live labels, "Ask about this" answers and the car tools were not exercised. Only first screens
  of the twins were looked at; their simulations were not driven.

## Page by page, before this branch

No page overflowed sideways at 375. No page logged a script error at load beyond the missing local API.

| Page | What it is | Works | Departs from the standard |
|---|---|---|---|
| `/` | The Lab home: hero, doors, Plan Studio, twins, study machines, playground, labels. | Everything listed once; live 3D city; point-cloud stage. | Ground `#21121F`; display type at 400; eyebrows in Instrument Sans; every section dark, no ivory surface; flat footer; 1px hover lift, no glow; on a phone the picture came first and the headline was below the fold; a stray source line sat under the nav on the second screen; a sparkle glyph in the ticker; Instrument Sans 600 loaded. See "Broken". |
| `/ar/` | assembl AR: place a model in your room. | Works; own dark hero. | Own palette close to plum; shared nav only. |
| `/auckland/` | 2D open-data atlas of Auckland. | Works. | No way back to assembl.co.nz; ground `#21121F`; type at 400. |
| `/auckland/3d/` | The sourced 3D city, with AR downloads. | Works. | No footer, no way back; ground `#21121F`. |
| `/audience-studio/` | Entry page to the private Audience Studio on assembl.co.nz. | Links work; says plainly what is private. | **No web font loaded at all** (fell back to Arial and system mono); no shared nav; light page with one dark panel; flat. |
| `/cafe/`, `/store/`, `/ed/`, `/dairy/`, `/office/`, `/home/`, `/stay/`, `/retail/`, `/tourism/` | The nine twins on the shared twin stage. | Load, run and label themselves. | Paper pages with their own "editorial" look and orange or green accents in controls; `/retail/`, `/stay/` print the brand in capitals inside an uppercase label ("INDEPENDENT ASSEMBL CONCEPT"); the shared nav sits inside each page's margin. |
| `/energy/` | Energy retailer journey twin (a generic retailer, not a real one). | Loads and runs. | Blue-grey palette of its own; brand in capitals in a label. |
| `/cars/` | Agent-ready cars: how an agent reads a listing; car check; capture. | Loads. `/api/mcp/` not testable locally. | Brand in capitals in a label; see "Rights to fix". |
| `/cars/dealer-twin/` | Fictional dealer group twin (Harbour Lane Motors, demo). Linked from the main site's `/dealers`. | Loads. | See "Rights to fix" for its credit line. |
| `/capture/` | Make a 3D capture with a phone. | Loads. | No footer. |
| `/delivery/`, `/moving/`, `/viaduct/` | Point-cloud journey sims. | Load and play. | Ground `#21121F` (the point-cloud engine paints it); `/moving/` and `/viaduct/` have no footer. |
| `/discover/` | Redirect to the home's playground. | Redirects. | None that shows. |
| `/everyday/`, `/food/`, `/kitchen/` | Household machines. | Load. | Heavy black outlines and 700-weight headings: the "toy" look Kate named on 3 November. |
| `/evidence/` | Saved public records behind the simulations, with source and freshness. | Loads 24 records. | No nav, no footer, no way back; weight 300 asked for but not loaded; no mono; plain. Depth printed unrounded ("8.589152336120605 km"). |
| `/household/` | Household Edit: bills, food, school costs, trip cost. | Loads. | Its own wordmark and header; no shared nav; no way back to assembl.co.nz. |
| `/matariki-sky/` | Matariki sky explorer, labelled "Cultural layer: draft, pending cultural review". | Loads. | Ground `#240B21`; otherwise close. |
| `/plan-studio/` | Plan Studio landing. | Loads. | Own header; eight bare "AI" in copy. |
| `/sea/` | Sea State: a boat on a sea made of code. | Loads full screen. | No way back to the Lab home or assembl.co.nz from the app frame. |
| `/study/` | assembly, the study app. | Loads; exam banner. | Its own identity (pastel illustration). Left alone on purpose. |
| `/trades/` | Trades twin: plan to quote. | Loads. | **Two navs stacked** (the shared one and its own); **pastel cubes** (retired 4 November); a yellow "SIMULATED" tag; 700-weight headings. |

## Broken or wrong, found on `main`

1. **The home page and its build script were out of step.** `index.html` was edited by hand on 9 November (the
   Auckland 3D city hero) without changing `scripts/build-lab-home.cjs`. Running the script would have silently put the
   older point-cloud hero back.
2. **The home page's own check failed on `main`** (`scripts/check-lab-home.cjs`: "the hero picture is decorative"),
   for the same reason. It has presumably been failing since 9 November.
3. Three other page checks fail on `main` and still fail, unchanged by this branch: `check-study-cards.cjs` ("Allen
   identity retained"), `check-matariki-sky.cjs` ("the view says how far from the Sun you are"),
   `check-study-instruments.cjs` ("35 curriculum cards unchanged"). Not investigated.
4. The hero's 3D city sat at fixed pixel offsets (`auckland/home.css`: `top:145px; height:510px; top:676px`), which
   is why its source line slid under the nav on the second screen.
5. The poster image declared `width="1280" height="960"` for a 976×561 file.
6. Hidden, unreachable markup on the home: three landmark notes always `display:none`.
7. `/audience-studio/` loaded no fonts.
8. `/cars/dealer-twin/` credits "Kate Hudson" for a 3D model. Probably an error. Not changed; see "Rights to fix".
9. `/trades/` shows two navigation bars and the retired pastel cubes.
10. No GitHub Actions workflow covers the home page or the shared chrome. The two workflows only run for `household/`
    and `evidence/` paths, so nothing automatic would have caught items 1 and 2.
11. The "Ask about this" button covered the footer's copyright line at 1440.

## What this branch changed

Shared layer (every page that opts in with `lab-std`):

- `site-v2/standard.css` (new): tokens, type, buttons, truth chips, nav, the footer with depth, the chrome utilities.
  Values adapted from the main repository at `bd88e93`, named in the file's header.
- `site-v2/markup.cjs`: `outcomes()` and `deepFooter()`.
- `lab/navigation.js`: the experiment nav on every page that loads it is now the inky band with links that light up,
  and its way back reads "assembl.co.nz". 24 pages get this; their bodies are untouched.

Brought up to the standard:

- **`/` (the home).** Rebuilt from the script, which now reproduces the 9 November city hero. First screen: label,
  headline, one sentence saying what the Lab is, three doors, the three truth labels, and the city (a still first; the
  live city says "Live 3D" once it is). On a phone the words come first. Ivory panels for the study machines and the
  labels; paper cards with plum render windows; lift and glow on every card, row, door and button; a staged entrance;
  the footer with depth and the wordmark in liquid chrome; a still chrome form at the close; a pill back to
  assembl.co.nz in the nav and four links in the footer. The point-cloud stage now draws on the page's own ground.
- **`/evidence/`**: shared nav, mono labels, records as paper cards, a footer with the way back.
- **`/audience-studio/`**: fonts load; shared nav; the private workspace as one ivory panel; two quiet cards; a
  footer with the way back. Every link and every statement about what is private is unchanged.
- **`/auckland/` and `/auckland/3d/`** (a light pass): inky ground, ivory workspace, display type at 500, controls
  that lift, and a footer with links to the Lab home and assembl.co.nz.
- `/discover/`: the redirect stub's ground.

Removed: `auckland/home.css` (its rules are carried in `lab/home.css`; nothing else referenced it).

## Not reached

These keep their own bodies and get only the shared nav where they load it:

`/cafe/`, `/store/`, `/ed/`, `/dairy/`, `/office/`, `/home/`, `/stay/`, `/retail/`, `/tourism/`, `/energy/`, `/cars/`,
`/cars/dealer-twin/`, `/capture/`, `/delivery/`, `/moving/`, `/viaduct/`, `/everyday/`, `/food/`, `/kitchen/`,
`/matariki-sky/`, `/ar/`, `/trades/`, `/study/` and every study machine.

No shared nav and not changed: `/household/`, `/plan-studio/`, `/sea/`.

Why not: each is a bespoke working model with its own stylesheet and controls. Moving one well means reading its
simulation and checking it by hand, which is a page at a time, not a sweep. `DESIGN.md` says the same. The point-cloud
pages also carry `#21121F` in the shared engine and in every rendered still, so their ground cannot move to `#180B18`
without re-rendering the stills.

Suggested next, in order: `/trades/` (two navs, cubes, yellow); the brand in capitals on `/retail/`, `/stay/`,
`/energy/`, `/cars/`; a way back from `/sea/`, `/household/`; then the twin stage's shared `editorial.css`, which would
move nine twins at once.

## Copy

- New copy on the home is plain New Zealand English. Macrons are in place (Tāmaki Makaurau, Waitematā, Toitū Te
  Whenua). No "seamless", "leverage" or "supercharge" anywhere on the home (now checked by the script).
- Bare "AI" was not added. It remains in existing catalogue copy shown on the home ("eight proposed AI tools", "the way
  an AI assistant does", "an AI judgement check") and on `/dairy/`, `/plan-studio/`, `/retail/`, `/energy/`. Left for
  the owners of those pages.
- The Plan Studio note now ends "The pre-check is advisory, not a statement of compliance."
- No concept on a page changed here names a real organisation. The footer keeps: "Independent assembl concepts.
  Simulated data unless marked live with a named source."

## Checks

| Check | On `main` | On this branch |
|---|---|---|
| `scripts/check-lab-home.cjs` (Playwright page function) | **Fails** | Passes every check, including the new standard checks, six widths and reduced motion |
| `node --test evidence/tests/*.test.mjs tools/nz-data-mcp/service.test.mjs` | 23 pass | 23 pass |
| `node --test tests/household/*.test.mjs tests/household/test.mjs` | 40 pass | 40 pass |
| `scripts/check-habitat.cjs` | Not run | Passes |
| `check-study-cards`, `check-matariki-sky`, `check-study-instruments` | Fail | Fail, unchanged |
| `git diff --check` | | Clean |

There is no typecheck, lint or build step in this repository: it is static files with no dependencies.

Not verified: the pages on a real phone; the deploy preview's `api/` functions; any simulation beyond its first screen.

Note on the harness: the checks were run with a Playwright already cached on this machine, pointed at its cached
Chromium. That browser cache was cleared by another job late in the session, after the last passing run of every
check above and after the last change to any served file. Later looks (the dealer twin, the home again) used a real
browser tab. To rerun the page checks, serve the repository on port 8341 and run each `scripts/check-*.cjs` as a
Playwright page function.
