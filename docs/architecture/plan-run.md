# The full check of a plan set

The plan drop page (`plan-studio/twins/drop/`) opens its panel with **check this plan set**. **Run the full check** runs the same steps in the same order every time. It starts by itself when a dropped PDF or picture is built, and runs on any plan already open.

## In order

1. **Drawings read**: sheets, reader (linework in the browser, or the AI plan reader and its model), scale and how it was confirmed, counts of walls, openings and rooms, and what to check (assumed heights, sheets not read, parking the reader often misses).
2. **Room names**: printed, suggested from what is drawn, or set by a person.
3. **Real ground**: with a site point, the browser reads LINZ's 1 m LiDAR straight from LINZ, names the survey, dates and floor rule, and rebuilds with the house on it. Without a point, it asks for one.
4. **Site facts** for the same point: which are live, which are not connected.
5. **Building Code pre-check**: counts of each result, every "does not meet" line first with its citation.
6. **What a person must check**: one list, gathered from every step.

## Statuses

- **■ done**: it ran and finished.
- **□ needs a person**: it ran; a person must act or check first.
- **□ not run**: it could not run, and says why.
- **□ failed**: it broke, and says why. The other steps still run.

Each step shows how long it took.

## The run report

One screen, printable, downloadable as a dated text or JSON file (`assembl.plan-run.v1`), with the model's version code (the one the approval record and ops page use). It says: "A pre-check prepared by software for a person to review. It is not a compliance decision or a professional sign-off."

**Send to a project** opens the ops page (`/architecture/`) in a new tab, where a person chooses the project. The report becomes a document there; the model is attached only if the project has none.

## What it does not do

It approves, lodges and sends nothing; no agent drafts replies. The only AI is the plan reader on the lab's server, used only when you say yes. The site point stays in the browser: never in the model, a share link or the report. Facts that would point to the site (parcel, overlay names, weather cell) stay out of the report.
