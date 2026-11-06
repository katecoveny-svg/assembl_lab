// assembl Plan Studio · the project model. One plain JSON object is the single source of truth: the 3D scene, the working
// drawings, the code pre-check, the IFC/DXF/GLB exports and the client presentation are all derived from it, so they
// cannot drift apart. Units: millimetres, plan origin bottom-left, +x east, +y north, z up from finished floor level.
//
// Every element carries `ev` (evidence): where it came from and how sure we are.
//   src: "drawing" (measured from the PDF's linework) | "text" (read from the PDF text layer) | "ai" (inferred by a vision
//        model) | "user" (typed or confirmed by a person) | "demo" (the fictional sample)
//   conf: 0..1, note: a short human reason. Nothing inferred is ever shown as measured.

export const SCHEMA = "assembl.planstudio.v1";

export const OPENING_KINDS = ["door", "door-double", "window", "glazing", "opening"];
export const ROOM_USES = ["assembly", "foyer", "meeting", "kitchen", "wc", "wc-accessible", "corridor", "store", "plant", "stage", "living", "bedroom", "bathroom", "laundry", "garage", "deck"];
export const BUILDING_USES = { CS: "Communal non-residential (assembly)", SH: "Detached dwelling", SR: "Residential, other", WL: "Working / low risk" };

const ev = (src, conf, note = "") => ({ src, conf, note });

// ------------------------------------------------------------------------------------------------ the demo: fictional
// Tōtara Grove community hall: a gable hall with a glazed north end, a service strip on the east side (foyer, corridor,
// meeting room, three WCs, kitchen). Invented for this demonstration; it is not any real project.
export function demoProject() {
  const D = ev("demo", 1, "Fictional sample building");
  const W = 24000, Hn = 15000, X = 16000;       // footprint 24 m × 15 m; the hall/service split at x = 16 m
  const T = 190, t = 90;                         // external / internal wall thickness
  const wall = (id, a, b, kind = "ext", extra = {}) => ({ id, a, b, t: kind === "ext" ? T : t, h: kind === "ext" ? 4200 : 3000, kind, mat: kind === "ext" ? "cladding-vertical" : "lining-plasterboard", ev: D, ...extra });
  const walls = [
    wall("W1", [0, 0], [W, 0]), wall("W2", [W, 0], [W, Hn]), wall("W3", [W, Hn], [0, Hn], "ext", { mat: "glass-curtain" }), wall("W4", [0, Hn], [0, 0]),
    wall("W5", [X, 0], [X, Hn], "int", { h: 4200 }),
    wall("W6", [X, 10000], [W, 10000], "int"),          // foyer and meeting | WCs and corridor
    wall("W7", [17600, 3500], [17600, 10000], "int"),   // corridor | WCs
    wall("W8", [X, 3500], [W, 3500], "int"),            // kitchen | corridor, accessible WC, store
    wall("W9", [17600, 5700], [W, 5700], "int"),        // accessible WC and store | women
    wall("W10", [20000, 3500], [20000, 5700], "int"),   // accessible WC | store
    wall("W11", [17600, 7850], [W, 7850], "int"),       // women | men
    wall("W12", [21000, 10000], [21000, Hn], "int"),    // foyer | meeting
  ];
  const op = (id, wallId, at, w, h, kind, extra = {}) => ({ id, wall: wallId, at, w, h, sill: kind.startsWith("door") || kind === "opening" ? 0 : (extra.sill ?? 900), kind, mat: kind.startsWith("door") ? "door-timber" : "window-thermal", openable: extra.openable ?? (kind === "window" ? 0.5 : 0), ev: D, ...extra });
  const openings = [
    op("D1", "W3", 5300, 1800, 2400, "door-double", { mat: "door-glazed", note: "Main entry" }),   // W3 runs east→west: at is from x = 24 m
    op("G1", "W3", 16000, 14800, 3600, "glazing", { sill: 300, openable: 0.08, note: "Glazed north end to the hall (top-hung vents)" }),
    op("D2", "W4", 2500, 1200, 2200, "door", { note: "Hall exit, west" }),                          // W4 runs north→south
    op("D3", "W4", 11500, 1200, 2200, "door", { note: "Hall exit, west" }),
    op("D4", "W1", 7000, 1800, 2400, "door-double", { note: "Hall exit, south" }),
    op("D5", "W5", 12000, 1800, 2400, "door-double", { mat: "door-glazed", note: "Foyer to hall" }),
    op("D6", "W6", 800, 1000, 2100, "opening", { note: "Foyer to corridor" }),
    op("D7", "W12", 2500, 920, 2100, "door", { note: "Meeting room" }),
    op("D8", "W7", 5400, 920, 2100, "door", { note: "WC (men)" }),
    op("D9", "W7", 3300, 920, 2100, "door", { note: "WC (women)" }),
    op("D10", "W7", 1100, 1000, 2100, "door", { note: "Accessible WC" }),
    op("D11", "W8", 800, 1000, 2100, "door", { note: "Corridor to kitchen" }),
    op("D12", "W5", 1800, 1200, 2100, "door", { note: "Kitchen to hall (servery side)" }),
    op("N1", "W4", 6800, 2400, 1800, "window", {}), op("N2", "W4", 9300, 2400, 1800, "window", {}),
    op("N3", "W1", 2600, 2400, 1200, "window", { sill: 2400, openable: 0.5, note: "High-level vent window" }),
    op("N4", "W1", 11600, 2400, 1200, "window", { sill: 2400, openable: 0.5, note: "High-level vent window" }),
    op("N5", "W2", 12500, 2400, 1500, "window", { note: "Meeting room" }),
    op("N6", "W1", 20000, 1800, 1200, "window", { sill: 1050, note: "Kitchen" }),
  ];
  const room = (id, name, use, poly, extra = {}) => ({ id, name, use, poly, ev: D, ...extra });
  const rooms = [
    room("R1", "Hall", "assembly", [[0, 0], [X, 0], [X, Hn], [0, Hn]], { occupants: 420, occNote: "Banquet seating, 42 tables of 10" }),
    room("R2", "Foyer", "foyer", [[X, 10000], [21000, 10000], [21000, Hn], [X, Hn]]),
    room("R3", "Corridor", "corridor", [[X, 3500], [17600, 3500], [17600, 10000], [X, 10000]]),
    room("R4", "Meeting", "meeting", [[21000, 10000], [W, 10000], [W, Hn], [21000, Hn]], { occupants: 16 }),
    room("R5", "WC men", "wc", [[17600, 7850], [W, 7850], [W, 10000], [17600, 10000]], { fixtures: { pan: 2, urinal: 3, basin: 2 } }),
    room("R6", "WC women", "wc", [[17600, 5700], [W, 5700], [W, 7850], [17600, 7850]], { fixtures: { pan: 4, basin: 2 } }),
    room("R7", "Accessible WC", "wc-accessible", [[17600, 3500], [20000, 3500], [20000, 5700], [17600, 5700]], { fixtures: { pan: 1, basin: 1 } }),
    room("R8", "Store", "store", [[20000, 3500], [W, 3500], [W, 5700], [20000, 5700]]),
    room("R9", "Kitchen", "kitchen", [[X, 0], [W, 0], [W, 3500], [X, 3500]]),
  ];
  return {
    schema: SCHEMA,
    meta: { name: "Tōtara Grove community hall", address: "12 Tōtara Grove (fictional)", owner: "Tōtara Grove Community Trust (fictional)", designer: "assembl Plan Studio demo",
      number: "PS-001", status: "Demonstration · fictional", truth: "Simulated", use: "CS", storeys: 1, climateZone: 1, windZone: "high", units: "mm" },
    levels: [{ id: "L0", name: "Ground floor", z: 0 }],
    walls, openings, rooms,
    slab: { t: 150, mat: "slab-concrete", ev: D },
    roof: { type: "gable", ridge: "y", eaves: 4200, ridgeH: 8200, overhang: 600, mat: "roof-standing-seam", ev: D },
    site: { north: 0, ground: "grass" },
    revisions: [],
    inputs: { occupantDensityNote: "Occupants as designed (seating plan). Confirm the design occupant load with the fire engineer.", sanitaryRatioVerified: false },
  };
}

// ------------------------------------------------------------------------------------------------ geometry helpers
export const len = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
export const dir = (a, b) => { const L = len(a, b) || 1; return [(b[0] - a[0]) / L, (b[1] - a[1]) / L]; };
export const wallById = (P, id) => P.walls.find((w) => w.id === id);

export function polyArea(poly) {
  let s = 0;
  for (let i = 0; i < poly.length; i++) { const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % poly.length]; s += x1 * y2 - x2 * y1; }
  return Math.abs(s) / 2;
}
export function polyBox(poly) {
  const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}
export function pointInPoly(pt, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi + 1e-12) + xi) c = !c;
  }
  return c;
}
// net room size: the room polygon is drawn on wall centrelines, so the clear internal size subtracts half a wall each side
export function roomClear(P, room) {
  const b = polyBox(room.poly), half = (x) => x / 2;
  const tAt = (test) => { const w = P.walls.filter(test); return w.length ? Math.max(...w.map((v) => v.t)) : 90; };
  const onX = (x) => (w) => Math.abs(w.a[0] - x) < 1 && Math.abs(w.b[0] - x) < 1, onY = (y) => (w) => Math.abs(w.a[1] - y) < 1 && Math.abs(w.b[1] - y) < 1;
  const cx = b.x1 - b.x0 - half(tAt(onX(b.x0))) - half(tAt(onX(b.x1))), cy = b.y1 - b.y0 - half(tAt(onY(b.y0))) - half(tAt(onY(b.y1)));
  return { x: Math.round(cx), y: Math.round(cy), area: polyArea(room.poly) / 1e6 };
}
// an opening's two ends in plan, and the point at its middle
export function openingSpan(P, o) {
  const w = wallById(P, o.wall); if (!w) return null;
  const d = dir(w.a, w.b), s = o.at - o.w / 2, e = o.at + o.w / 2;
  return { a: [w.a[0] + d[0] * s, w.a[1] + d[1] * s], b: [w.a[0] + d[0] * e, w.a[1] + d[1] * e], mid: [w.a[0] + d[0] * o.at, w.a[1] + d[1] * o.at], d, w };
}
// which rooms an opening connects (probe a little either side of the wall)
export function openingRooms(P, o) {
  const s = openingSpan(P, o); if (!s) return [];
  const n = [-s.d[1], s.d[0]], k = s.w.t / 2 + 200;
  return [1, -1].map((sg) => P.rooms.find((r) => pointInPoly([s.mid[0] + n[0] * k * sg, s.mid[1] + n[1] * k * sg], r.poly)) || null);
}
// the outward normal of an external wall (which way it faces), and its compass orientation
export function wallFacing(P, w) {
  const d = dir(w.a, w.b), n = [d[1], -d[0]];            // right-hand normal
  const mid = [(w.a[0] + w.b[0]) / 2, (w.a[1] + w.b[1]) / 2], probe = [mid[0] + n[0] * 400, mid[1] + n[1] * 400];
  const inside = P.rooms.some((r) => pointInPoly(probe, r.poly));
  const out = inside ? [-n[0], -n[1]] : n;
  const ang = (Math.atan2(out[0], out[1]) * 180) / Math.PI + (P.site?.north || 0);
  const a = ((ang % 360) + 360) % 360;
  return { out, deg: a, face: ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(a / 45) % 8] };
}
export const isDoor = (o) => o.kind === "door" || o.kind === "door-double" || o.kind === "opening";
export const isGlazed = (o) => o.kind === "window" || o.kind === "glazing" || o.mat === "door-glazed";

// ------------------------------------------------------------------------------------------------ revisions: diff two models
// A revision snapshot holds the model as it was; the drawings cloud anything that changed since the previous snapshot.
export function snapshot(P) { const { revisions, ...rest } = P; return JSON.parse(JSON.stringify(rest)); }
export function diffModels(prev, next) {
  if (!prev) return { changed: [], summary: [] };
  const out = [], summary = [];
  for (const key of ["walls", "openings", "rooms"]) {
    const A = new Map((prev[key] || []).map((e) => [e.id, e])), B = new Map((next[key] || []).map((e) => [e.id, e]));
    for (const [id, e] of B) {
      if (!A.has(id)) { out.push({ id, key, kind: "added" }); summary.push(`${label(key, e)} added`); continue; }
      const a = A.get(id), fields = Object.keys({ ...a, ...e }).filter((f) => f !== "ev" && JSON.stringify(a[f]) !== JSON.stringify(e[f]));
      if (fields.length) { out.push({ id, key, kind: "changed", fields }); summary.push(`${label(key, e)}: ${fields.map((f) => describe(f, a[f], e[f])).join(", ")}`); }
    }
    for (const [id, e] of A) if (!B.has(id)) { out.push({ id, key, kind: "removed", was: e }); summary.push(`${label(key, e)} removed`); }
  }
  return { changed: out, summary };
}
const label = (key, e) => ({ walls: "Wall", openings: "Opening", rooms: "Room" }[key]) + " " + e.id + (e.name ? ` (${e.name})` : "");
function describe(f, a, b) {
  const nice = { w: "width", h: "height", t: "thickness", at: "position", sill: "sill", mat: "material", kind: "type", use: "use", occupants: "occupants" }[f] || f;
  if (typeof a === "number" && typeof b === "number") return `${nice} ${a} → ${b}${["w", "h", "t", "at", "sill"].includes(f) ? " mm" : ""}`;
  if (typeof a === "string" || typeof b === "string") return `${nice} ${a ?? "–"} → ${b ?? "–"}`;
  return `${nice} changed`;
}
export const revLetter = (i) => String.fromCharCode(65 + (i % 26)) + (i >= 26 ? Math.floor(i / 26) : "");
