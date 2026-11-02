// assembl lab · trades twin. The two sample sheets, as data. Everything here is Simulated: a fictional house and a fictional deck,
// drawn by the lab (trades/src/build-plans.mjs turns this file into the SVG sheets, then Playwright prints them to PDF).
// Coordinates are real millimetres with y increasing down the page; `origin` is where real (0,0) sits on the paper, in mm;
// `scale` is the drawing scale (100 means 1:100). Paper points = paper mm × 72 / 25.4, which is what pdf.js hands back.
// The same file feeds the browser (trades/js/*.js) and the stateless endpoint (api/takeoff.js), so the agent, the person at the
// desk and any MCP client all measure the same geometry. No code or geometry here comes from any other takeoff product.

export const MM_PER_PT = 25.4 / 72;

const rect = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];

export const PLANS = {
  truth: "Simulated",
  project: { name: "Lot 12 Kōwhai Rise (demo)", client: "Ana and Josh Peterson (fictional)", suburb: "Te Atatū Peninsula, Tāmaki Makaurau", builder: "Harbourside Builders (demo)" },
  sheets: [
    {
      id: "A101", title: "Floor plan", subtitle: "Three-bedroom house · 133 m² footprint", file: "plans/a101-floor-plan.pdf", paper: "A3", scale: 50,
      origin: { x: 25, y: 42 }, extent: { w: 14000, h: 9500 },
      // the dimension a person can use to confirm the scale with two points
      dimension: { a: [0, -1000], b: [14000, -1000], mm: 14000, label: "14 000" },
      rooms: [
        { id: "living", name: "Living · dining", finish: "carpet", poly: rect(0, 0, 5500, 5000) },
        { id: "kitchen", name: "Kitchen", finish: "tiles", poly: rect(5500, 0, 4000, 5000) },
        { id: "bed3", name: "Bed 3", finish: "carpet", poly: rect(9500, 0, 4500, 3500) },
        { id: "laundry", name: "Laundry", finish: "vinyl", poly: rect(9500, 3500, 2000, 1500) },
        { id: "wc", name: "WC", finish: "tiles", poly: rect(11500, 3500, 1000, 1500) },
        { id: "linen", name: "Linen", finish: "carpet", poly: rect(12500, 3500, 1500, 1500) },
        { id: "entry", name: "Entry", finish: "tiles", poly: rect(0, 5000, 1500, 1200) },
        { id: "hall", name: "Hall", finish: "carpet", poly: rect(1500, 5000, 12500, 1200) },
        { id: "bed1", name: "Bed 1", finish: "carpet", poly: rect(0, 6200, 4200, 3300) },
        { id: "ensuite", name: "Ensuite", finish: "tiles", poly: rect(4200, 6200, 1800, 3300) },
        { id: "bath", name: "Bathroom", finish: "tiles", poly: rect(6000, 6200, 2000, 3300) },
        { id: "bed2", name: "Bed 2", finish: "carpet", poly: rect(8000, 6200, 3200, 3300) },
        { id: "study", name: "Study", finish: "carpet", poly: rect(11200, 6200, 2800, 3300) },
      ],
      // internal walls (centre lines) for linings; the external wall is the footprint
      walls: [
        [[5500, 0], [5500, 5000]], [[9500, 0], [9500, 5000]], [[9500, 3500], [14000, 3500]], [[11500, 3500], [11500, 5000]], [[12500, 3500], [12500, 5000]],
        [[0, 5000], [14000, 5000]], [[1500, 5000], [1500, 6200]], [[0, 6200], [14000, 6200]],
        [[4200, 6200], [4200, 9500]], [[6000, 6200], [6000, 9500]], [[8000, 6200], [8000, 9500]], [[11200, 6200], [11200, 9500]],
      ],
      doors: [[700, 5000], [5500, 2500], [7500, 5000], [9500, 1750], [10500, 5000], [12000, 5000], [13200, 5000], [2100, 6200], [5100, 6200], [7000, 6200], [9600, 6200], [12600, 6200]],
      windows: [[2750, 0], [7500, 0], [11750, 0], [14000, 1750], [14000, 7850], [12600, 9500], [9600, 9500], [7000, 9500], [2100, 9500], [0, 7850], [0, 2500]],
      fixtures: [{ at: [12000, 3800], k: "wc" }, { at: [4600, 6600], k: "shower" }, { at: [5600, 8900], k: "wc" }, { at: [4600, 9000], k: "basin" }, { at: [6400, 6600], k: "shower" }, { at: [7600, 8900], k: "wc" }, { at: [6400, 9000], k: "basin" }, { at: [7450, 6800], k: "bath" }, { at: [11100, 4600], k: "tub" }],
      title_block: ["Lot 12 Kōwhai Rise (demo)", "Floor plan · ground", "A101 · 1:50 at A3", "Simulated · fictional plan, drawn by the assembl lab"],
    },
    {
      id: "A201", title: "Deck and pergola", subtitle: "6.0 × 4.0 m deck, 4.0 × 3.0 m pergola", file: "plans/a201-deck-pergola.pdf", paper: "A3", scale: 25,
      origin: { x: 30, y: 50 }, extent: { w: 6000, h: 4000 },
      dimension: { a: [0, -600], b: [6000, -600], mm: 6000, label: "6 000" },
      rooms: [
        { id: "deck", name: "Deck", finish: "decking", poly: rect(0, 0, 6000, 4000) },
        { id: "pergola", name: "Pergola", finish: "pergola", poly: rect(1000, 0, 4000, 3000) },
      ],
      // framing, as lines (centre lines) and points, labelled with NZS 3604 sizes as names only
      joists: Array.from({ length: 14 }, (_, i) => [[75 + i * 450, 0], [75 + i * 450, 4000]]),   // 140×45 H3.2 at 450 crs
      bearers: [[[0, 200], [6000, 200]], [[0, 2000], [6000, 2000]], [[0, 3800], [6000, 3800]]],  // 190×45 H3.2 at 1800 crs
      posts: [300, 2100, 3900, 5700].flatMap((x) => [200, 2000, 3800].map((y) => [x, y])),       // 125×125 H5, 12 of them
      pergolaPosts: [[1000, 0], [5000, 0], [1000, 3000], [5000, 3000]],
      beams: [[[1000, 0], [5000, 0]], [[1000, 3000], [5000, 3000]]],                             // 190×45 H3.2
      rafters: Array.from({ length: 8 }, (_, i) => [[1000 + i * 571.4, 0], [1000 + i * 571.4, 3000]]), // 140×45 H3.2 at ~570 crs
      handrail: [[[0, 4000], [0, 0]], [[0, 0], [6000, 0]], [[6000, 0], [6000, 4000]]],
      steps: rect(2400, 4000, 1200, 900),
      title_block: ["Lot 12 Kōwhai Rise (demo)", "Deck and pergola · framing plan", "A201 · 1:25 at A3", "Simulated · fictional plan, drawn by the assembl lab"],
    },
  ],
};

// ---------------------------------------------------------------- conditions: a small NZ library, metric, fictional indicative rates
// `measure` is what the person draws (count, length, area); `factor` turns the drawn quantity into the priced unit (a wall drawn
// as a length becomes lining area at 2.4 m stud height, both faces). Timber sizes are NZS 3604 names used as labels only: no span
// tables or design here. Rates are made up for the demo and are editable on the desk; they are not a quote.
export const TRADES = ["Carpentry", "Linings", "Flooring", "Painting", "Plumbing", "Electrical", "Joinery"];
export const CONDITIONS = [
  { id: "floor-tiles", name: "Floor tiles 300×300 porcelain", trade: "Flooring", measure: "area", unit: "m²", material: 68, labour: 85, colour: "#A9C9F2" },
  { id: "carpet", name: "Carpet and underlay", trade: "Flooring", measure: "area", unit: "m²", material: 52, labour: 18, colour: "#C7B4F0" },
  { id: "vinyl", name: "Vinyl plank", trade: "Flooring", measure: "area", unit: "m²", material: 58, labour: 32, colour: "#F2DC7C" },
  { id: "skirting", name: "Skirting 60×18 FJ pine", trade: "Carpentry", measure: "length", unit: "m", material: 6.5, labour: 9, colour: "#F6B48E" },
  { id: "gib-wall", name: "GIB 10 mm wall lining", trade: "Linings", measure: "length", unit: "m²", factor: 4.8, factorNote: "2.4 m stud, both faces", material: 14, labour: 22, colour: "#A7DEC7" },
  { id: "paint-walls", name: "Paint walls, two coats", trade: "Painting", measure: "length", unit: "m²", factor: 4.8, factorNote: "2.4 m stud, both faces", material: 4.5, labour: 12, colour: "#F3A5BE" },
  { id: "int-door", name: "Internal door 1980×810, hung", trade: "Joinery", measure: "count", unit: "EA", material: 420, labour: 180, colour: "#F6B48E" },
  { id: "window", name: "Aluminium window, installed", trade: "Joinery", measure: "count", unit: "EA", material: 1150, labour: 220, colour: "#A9C9F2" },
  { id: "fixture", name: "Sanitary fixture (WC, basin, shower)", trade: "Plumbing", measure: "count", unit: "EA", material: 640, labour: 380, colour: "#C7B4F0" },
  { id: "downlight", name: "LED downlight", trade: "Electrical", measure: "count", unit: "EA", material: 38, labour: 45, colour: "#F2DC7C" },
  { id: "power-point", name: "Double power point", trade: "Electrical", measure: "count", unit: "EA", material: 22, labour: 55, colour: "#A7DEC7" },
  { id: "decking", name: "Decking 140×32 pine H3.2, fixed", trade: "Carpentry", measure: "area", unit: "m²", material: 96, labour: 70, colour: "#F6B48E" },
  { id: "deck-joist", name: "Deck joists 140×45 H3.2", trade: "Carpentry", measure: "length", unit: "m", material: 11.8, labour: 9.5, colour: "#A7DEC7" },
  { id: "bearer", name: "Bearers 190×45 H3.2", trade: "Carpentry", measure: "length", unit: "m", material: 16.4, labour: 11, colour: "#C7B4F0" },
  { id: "post", name: "Post 125×125 H5, footing and fix", trade: "Carpentry", measure: "count", unit: "EA", material: 118, labour: 145, colour: "#F3A5BE" },
  { id: "handrail", name: "Handrail and balustrade 1.0 m", trade: "Carpentry", measure: "length", unit: "m", material: 210, labour: 95, colour: "#F2DC7C" },
  { id: "rafter", name: "Pergola rafters 140×45 H3.2", trade: "Carpentry", measure: "length", unit: "m", material: 11.8, labour: 10.5, colour: "#A9C9F2" },
  { id: "beam", name: "Pergola beams 190×45 H3.2", trade: "Carpentry", measure: "length", unit: "m", material: 16.4, labour: 12, colour: "#C7B4F0" },
];
export const GST = 0.15;
