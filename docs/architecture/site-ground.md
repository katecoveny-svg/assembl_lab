# Real ground under a dropped plan

22 November 2026. Not deployed.

## What it does

Drop a plan. Type the site's latitude and longitude in the **Real ground** card. The house is rebuilt on LINZ's surveyed ground, with the legal boundary. It works anywhere LINZ has flown at 1 m.

You can turn the house, move it up to 10 m, and set the floor level. Each is tagged "from the plan", "assumed" or "set by hand".

## Where the data comes from

- **Ground and tree tops:** LINZ's national 1 m LiDAR, through the lab's feed (`/api/live/?feeds=ground`, `feeds=surface`). No key.
- **Licence:** CC BY 4.0. Each answer names the survey, its flight dates and the credit LINZ asks for.
- **Levels:** NZVD2016, as LINZ's file specification states. The files do not record it.
- **Boundary:** LINZ's parcel map. Not a survey.

## How accurate it measured

- Against GDAL on the example site: 90,601 cells, worst difference 0.005 m.
- Against the example's hand-built grid: mean 0.016 m, 95% within 0.048 m, worst 1.08 m, 5 m in front of the house. Not explained.
- Against published summits: Mount Eden 196 m, read 195.74. Mount Richmond 48 m, read 48.20. Hamlin Hill 65 m, read 59.03. Not explained.
- The page's placing of the house, checked at 285 points: worst 0.005 m.
- LINZ says this LiDAR is good to about 0.2 m.
- Time from this machine: 1 to 4 seconds; 1.5 to 1.8 MB read, 134 KB sent.

## What is assumed

- The point is the middle of the house.
- North is as the plan says. With no north point, north is up the sheet.
- The floor is 0.45 m above the highest ground under the house, until you set it.
- The point is treated as NZGD2000. A phone's point can be a metre off.

## What it cannot do

- No aerial photo yet. The ground shows 1 m contour lines drawn from the survey. LINZ's 900 photo surveys need an index first.
- Trees and buildings are not told apart. They are plain blocks, in a layer that starts off.
- Anything built or cleared since the flight is missing. It is not a site survey.
- No 1 m cover: the page says so and keeps the assumed ground.
- Not yet run on Cloudflare. Its free plan allows 10 ms a request; this took 3 to 4 ms warm, 16 to 42 ms cold. Check on a preview.
- Not tried on a real graphics card, a phone, or a dropped PDF.

The point and the ground stay in the browser tab, not in a share link.
