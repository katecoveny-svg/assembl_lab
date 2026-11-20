// Services for any plan model (assembl.plan-model.v1), one building at a time. Everything here is derived from the plan:
// rooms are read from their names, fixtures and devices are placed from the rooms and their walls and doors, runs are
// routed between them, the result is checked for clashes (and nudged clear where it can be) and against a short list of
// NZ Building Code items. It is a proposal on a design study, not a design: no sizing, loads or heat loss.
// Units: metres. Inside a building: u east and v south of its north-west outside corner, y up from the finished floor.

export const SYSTEMS = {
  hvac:  { name: "Air", color: 0xb4bac1 },
  drain: { name: "Waste", color: 0x8d9498 },
  water: { name: "Water", color: 0x2f6fb5 },
  elec:  { name: "Power", color: 0xf1ece4 },
  fix:   { name: "Fixtures", color: 0x654a4e },
};
export const HOT = 0xc23b32;

// final layout: each system keeps to its own height, which is what clears most clashes
export const LEVEL = { ceilElec: 2.42, ceilRefrig: 2.52, ceilDuct: 2.64, underWater: -0.32, underDrain: -0.52 };
// the first pass routes everything in the ceiling at one height and under the floor at another, as a quick sketch would
export const FIRST = { ceil: 2.45, under: -0.42 };
const FALL = 1 / 50;
const PRI = { elec: 0, water: 1, hvac: 2, drain: 3 };   // who moves first when two runs clash

// ---------------------------------------------------------------------------------------------------- reading rooms
export function roomKind(name = "") {
  const n = name.toLowerCase();
  if (/en.?suite|bath|shower/.test(n)) return "bath";
  if (/\bwc\b|toilet|powder/.test(n)) return "wc";
  if (/laundry|ldry|utility/.test(n)) return "laundry";
  if (/kitchen|scullery|\bkit\b/.test(n)) return "kitchen";
  if (/bed|master|guest|nursery|sleep|bunk/.test(n)) return "bed";
  if (/garage|carport|workshop/.test(n)) return "garage";
  if (/hall|entry|corridor|passage|foyer|landing|lobby/.test(n)) return "hall";
  if (/cupboard|cpd|robe|wir\b|store|storage|linen|hwc|pantry|closet/.test(n)) return "store";
  if (/living|lounge|family|dining|rumpus|sitting|study|office|media|meals|sun/.test(n)) return "living";
  return "other";
}
const area = (r) => r.w * r.d;
const centre = (r) => ({ u: r.u + r.w / 2, v: r.v + r.d / 2 });
const dist = (a, b) => Math.hypot(a.u - b.u, a.v - b.v);
const lc = (s) => s.toLowerCase();

function footprint(L) {
  let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
  for (const w of L.walls || []) {
    if (w.axis === "x") { u0 = Math.min(u0, w.from); u1 = Math.max(u1, w.to); v0 = Math.min(v0, w.at); v1 = Math.max(v1, w.at); }
    else { v0 = Math.min(v0, w.from); v1 = Math.max(v1, w.to); u0 = Math.min(u0, w.at); u1 = Math.max(u1, w.at); }
  }
  if (!isFinite(u0)) for (const r of L.rooms) { u0 = Math.min(u0, r.u); v0 = Math.min(v0, r.v); u1 = Math.max(u1, r.u + r.w); v1 = Math.max(v1, r.v + r.d); }
  return { u0, u1, v0, v1 };
}

// room edges: n and s run along u, w and e run along v; inward points into the room
function edges(r) {
  return [
    { side: "n", axis: "x", c: r.v, a0: r.u, a1: r.u + r.w, inward: [0, 1] },
    { side: "s", axis: "x", c: r.v + r.d, a0: r.u, a1: r.u + r.w, inward: [0, -1] },
    { side: "w", axis: "z", c: r.u, a0: r.v, a1: r.v + r.d, inward: [1, 0] },
    { side: "e", axis: "z", c: r.u + r.w, a0: r.v, a1: r.v + r.d, inward: [-1, 0] },
  ].map((e) => ({ ...e, len: e.a1 - e.a0 }));
}
const onEdge = (e, s, t = 0) => (e.axis === "x" ? { u: s, v: e.c + e.inward[1] * t } : { u: e.c + e.inward[0] * t, v: s });
const alongOf = (e, p) => (e.axis === "x" ? p.u : p.v);
const overlap = (a0, a1, b0, b1) => Math.min(a1, b1) - Math.max(a0, b0);

// the wall (outside or inside) that runs along a room edge, and the openings in it within the edge
function wallOn(L, e) {
  for (const w of L.walls || []) {
    if (w.axis !== e.axis) continue;
    const inner = w.at - (w.out ?? 1) * w.thickness;
    if (Math.abs(e.c - inner) <= 0.1 + w.thickness * 0.15 && overlap(e.a0, e.a1, w.from, w.to) > 0.2) return { wall: w, outside: true, ops: (w.openings || []).filter((o) => overlap(o.a, o.b, e.a0, e.a1) > 0) };
  }
  for (const p of L.partitions || []) {
    if (p.axis !== e.axis) continue;
    if (Math.abs(e.c - p.at) <= p.thickness / 2 + 0.09 && overlap(e.a0, e.a1, p.from, p.to) > 0.2) return { wall: p, outside: false, ops: (p.openings || []).filter((o) => overlap(o.a, o.b, e.a0, e.a1) > 0) };
  }
  return null;
}
// free stretches of an edge, clear of its openings
function freeSpans(e, ops, pad = 0.1) {
  let spans = [[e.a0 + pad, e.a1 - pad]];
  for (const o of ops) spans = spans.flatMap(([a, b]) => (o.b + pad <= a || o.a - pad >= b ? [[a, b]] : [[a, o.a - pad], [o.b + pad, b]]));
  return spans.filter(([a, b]) => b - a > 0.05).sort((x, y) => y[1] - y[0] - (x[1] - x[0]));
}
// nearest free point to s on an edge
function freeNear(e, ops, s, half = 0.2) {
  let best = null;
  for (const [a, b] of freeSpans(e, ops)) { if (b - a < 2 * half) continue; const x = Math.max(a + half, Math.min(b - half, s)); if (!best || Math.abs(x - s) < Math.abs(best - s)) best = x; }
  return best;
}

// outside walls: a point at a distance off the outside face, the nearest wall to a point
const wallOut = (w, s, off) => (w.axis === "x" ? { u: s, v: w.at + (w.out ?? 1) * off } : { u: w.at + (w.out ?? 1) * off, v: s });
const wallAlong = (w, p) => (w.axis === "x" ? p.u : p.v);
function wallDist(w, p) { const s = Math.max(w.from, Math.min(w.to, wallAlong(w, p))); const q = wallOut(w, s, 0); return dist(p, q); }
const nearestWall = (L, p, ok = () => true) => [...L.walls].filter(ok).sort((a, b) => wallDist(a, p) - wallDist(b, p))[0];
const inDeck = (L, p) => (L.decks || []).some((d) => p.u > d.u0 - 0.3 && p.u < d.u1 + 0.3 && p.v > d.v0 - 0.3 && p.v < d.v1 + 0.3);
// a free spot on an outside wall near s: clear of its openings, and not on a deck
function wallSpot(L, w, s, half, off) {
  const tries = [0]; for (let k = 1; k < 60; k++) tries.push(k * 0.15, -k * 0.15);
  for (const d of tries) {
    const x = s + d; if (x - half < w.from + 0.2 || x + half > w.to - 0.2) continue;
    if ((w.openings || []).some((o) => x + half > o.a - 0.05 && x - half < o.b + 0.05)) continue;
    const p = wallOut(w, x, off); if (inDeck(L, p)) continue;
    return x;
  }
  return null;
}

// doors and openings, with the rooms either side of each
function openingsOf(L) {
  const out = [];
  const add = (w, o, inside) => {
    const s = (o.a + o.b) / 2, p = w.axis === "x" ? { u: s, v: inside ? w.at : w.at - (w.out ?? 1) * w.thickness } : { u: inside ? w.at : w.at - (w.out ?? 1) * w.thickness, v: s };
    const tol = inside ? w.thickness / 2 + 0.1 : 0.12;
    const rooms = L.rooms.filter((r) => edges(r).some((e) => e.axis === w.axis && Math.abs(e.c - (w.axis === "x" ? p.v : p.u)) <= tol && s > e.a0 - 0.05 && s < e.a1 + 0.05));
    out.push({ o, wall: w, inside, ...p, a: o.a, b: o.b, axis: w.axis, rooms });
  };
  for (const p of L.partitions || []) for (const o of p.openings || []) add(p, o, true);
  for (const w of L.walls || []) for (const o of w.openings || []) add(w, o, false);
  return out;
}

// ---------------------------------------------------------------------------------------------------- the services
export function buildServices(model, buildingId) {
  const B = model.buildings.find((b) => b.id === buildingId) || model.buildings[0];
  const L = B.levels[0];
  const plate = L.plate || 2.4;
  const F = footprint(L);
  const rooms = L.rooms.map((r) => ({ ...r, kind: roomKind(r.name) }));
  const of = (k) => rooms.filter((r) => r.kind === k);
  const OPS = openingsOf(L);
  const doorsOf = (r) => OPS.filter((d) => d.rooms.some((x) => x.id === r.id) && d.o.kind !== "window");
  const notes = [];
  const sym = [], runs = [], boxes = [], fixtures = [];
  const add = (s) => (sym.push(s), s);
  const fixture = (f) => {
    fixtures.push(f);
    add({ sys: "fix", kind: f.kind, u: f.u, v: f.v, label: f.label });
    // box: w along the wall, d out from it, h tall; face is the way the fixture looks into the room
    const along = Math.abs(f.face[0]) > 0.5 ? "z" : "x";
    const s = along === "x" ? [f.w, f.h, f.d] : [f.d, f.h, f.w];
    boxes.push({ sys: "fix", kind: f.kind, c: [f.u, (f.y ?? 0) + f.h / 2, f.v], s, face: f.face, label: f.label, room: f.room });
    return f;
  };
  // a fixture against a room edge: s along the edge, set out from it by half its depth (plus a gap)
  const against = (r, e, s, spec) => { const p = onEdge(e, s, spec.d / 2 + (spec.gap ?? 0.04)); return fixture({ ...spec, u: p.u, v: p.v, face: e.inward, room: r.name }); };

  // ------------------------------------------------------------------ wet rooms
  const wcs = [], showers = [], basins = [];
  for (const r of [...of("bath"), ...of("wc")]) {
    const E = edges(r), doors = doorsOf(r);
    const outs = E.filter((e) => wallOn(L, e)?.outside).sort((a, b) => b.len - a.len);
    const doorPt = doors[0] ? { u: doors[0].u, v: doors[0].v } : centre(r);
    const wet = outs[0] || [...E].sort((a, b) => dist(onEdge(b, (b.a0 + b.a1) / 2), doorPt) - dist(onEdge(a, (a.a0 + a.a1) / 2), doorPt))[0];
    // the shower goes at the end of the wet wall nearer the door, the WC at the other end, the basin across from the WC
    const dA = Math.abs(alongOf(wet, doorPt) - wet.a0), dB = Math.abs(alongOf(wet, doorPt) - wet.a1);
    const showerEnd = dA <= dB ? wet.a0 : wet.a1, otherEnd = showerEnd === wet.a0 ? wet.a1 : wet.a0;
    const dir = Math.sign(otherEnd - showerEnd) || 1;
    const endEdge = E.find((e) => e.axis !== wet.axis && Math.abs(e.c - otherEnd) < 1e-6);
    const across = E.find((e) => e.axis === wet.axis && e !== wet);
    const hasShower = r.kind === "bath" && area(r) >= 1.8 && Math.min(r.w, r.d) >= 0.95;
    if (hasShower) {
      const p = onEdge(wet, showerEnd + dir * 0.48, 0.48);
      showers.push(fixture({ kind: "shower", u: p.u, v: p.v, w: 0.9, d: 0.9, h: 0.05, face: wet.inward, label: "Shower", room: r.name, wall: wet }));
    }
    // WC against the end wall, 0.42 out from the wet wall
    const wcAt = wet.axis === "x" ? wet.c + wet.inward[1] * 0.42 : wet.c + wet.inward[0] * 0.42;
    wcs.push(against(r, endEdge, wcAt, { kind: "wc", w: 0.38, d: 0.65, h: 0.4, gap: 0.02, label: r.kind === "wc" ? "WC" : "WC", }));
    // basin against the end wall, near the far side
    const far = across ? across.c : wet.c + (wet.axis === "x" ? wet.inward[1] : wet.inward[0]) * (wet.axis === "x" ? r.d : r.w);
    const sgn = Math.sign(far - wcAt) || 1;
    const basinAt = far - sgn * 0.32;
    if (Math.abs(basinAt - wcAt) > 0.62) basins.push(against(r, endEdge, basinAt, { kind: "basin", w: 0.5, d: 0.4, h: 0.85, gap: 0.0, label: r.kind === "wc" ? "Hand basin" : "Basin" }));
    else notes.push(`${r.name}: too narrow for a basin beside the WC.`);
  }

  // ------------------------------------------------------------------ kitchen: bench, sink, cooktop, dishwasher
  const kit = of("kitchen").sort((a, b) => area(b) - area(a))[0];
  let sink = null, hob = null, dish = null, bench = null;
  if (kit) {
    const E = edges(kit);
    const fit = (L.fitout || []).find((f) => /bench/i.test(f.name) && !/top/i.test(f.name) && overlap(f.u0, f.u1, kit.u, kit.u + kit.w) > 0.3 && overlap(f.v0, f.v1, kit.v, kit.v + kit.d) > 0.2);
    let e;
    if (fit) {
      // the bench's back is the kitchen edge it sits against
      e = [...E].sort((a, b) => Math.abs(benchBack(a, fit) - a.c) - Math.abs(benchBack(b, fit) - b.c))[0];
      bench = { e, a0: e.axis === "x" ? fit.u0 : fit.v0, a1: e.axis === "x" ? fit.u1 : fit.v1, depth: e.axis === "x" ? fit.v1 - fit.v0 : fit.u1 - fit.u0, fitted: true };
    } else {
      const cands = E.map((x) => ({ x, w: wallOn(L, x) })).filter((c) => c.w && !c.w.ops.some((o) => o.kind !== "window" && o.kind !== undefined && o.kind !== "window"));
      cands.sort((a, b) => (b.w.outside - a.w.outside) || (b.x.len - a.x.len));
      e = (cands[0]?.x) || [...E].sort((a, b) => b.len - a.len)[0];
      const len = Math.min(e.len - 0.3, 3.2);
      const mid = (e.a0 + e.a1) / 2;
      bench = { e, a0: mid - len / 2, a1: mid + len / 2, depth: 0.6, fitted: false };
    }
    const be = bench.e, d2 = bench.depth / 2;
    const dirB = 1;
    const at = (s, h, label, kind, w, dd) => { const p = onEdge(be, s, d2); return fixture({ kind, u: p.u, v: p.v, w, d: dd, h, face: be.inward, label, room: kit.name }); };
    sink = at((bench.a0 + bench.a1) / 2 + 0.25 * dirB, 0.9, "Kitchen sink", "sink", 0.8, 0.5);
    hob = at(bench.a0 + 0.4, 0.9, "Cooktop and oven", "hob", 0.6, 0.58);
    dish = at(bench.a1 - 0.32, 0.85, "Dishwasher", "dish", 0.6, 0.58);
    if (!bench.fitted) notes.push(`${kit.name}: bench proposed along the ${({ n: "north", s: "south", w: "west", e: "east" })[be.side]} wall.`);
  }

  const isBench = (r, e) => !!bench && !!kit && r.id === kit.id && e.side === bench.e.side;

  // ------------------------------------------------------------------ laundry: washing machine (and a tub in a laundry)
  let washer = null, tub = null;
  const lau = of("laundry")[0];
  const washRoom = lau || kit || of("garage")[0] || of("bath")[0];
  if (washRoom) {
    const E = edges(washRoom);
    const corners = [[washRoom.u, washRoom.v], [washRoom.u + washRoom.w, washRoom.v], [washRoom.u, washRoom.v + washRoom.d], [washRoom.u + washRoom.w, washRoom.v + washRoom.d]];
    const from = hob || centre(washRoom);
    const [cu, cv] = corners.sort((a, b) => Math.hypot(b[0] - from.u, b[1] - from.v) - Math.hypot(a[0] - from.u, a[1] - from.v))[0];
    const ce = E.filter((e) => (e.axis === "x" ? Math.abs(e.c - cv) < 1e-6 : Math.abs(e.c - cu) < 1e-6) && !isBench(washRoom, e)).sort((a, b) => b.len - a.len)[0] || E[0];
    const s = alongOf(ce, { u: cu, v: cv }), inward = s === ce.a0 ? 1 : -1;
    washer = against(washRoom, ce, s + inward * 0.36, { kind: "washer", w: 0.6, d: 0.6, h: 0.85, gap: 0.1, label: "Washing machine" });
    if (lau && ce.len > 1.4) tub = against(washRoom, ce, s + inward * 1.02, { kind: "tub", w: 0.6, d: 0.5, h: 0.9, gap: 0.02, label: "Laundry tub" });
  }

  // ------------------------------------------------------------------ hot water cylinder
  const wetFx = fixtures.filter((f) => ["shower", "wc", "basin", "sink", "dish", "washer", "tub"].includes(f.kind));
  const wetC = wetFx.length ? { u: wetFx.reduce((t, f) => t + f.u, 0) / wetFx.length, v: wetFx.reduce((t, f) => t + f.v, 0) / wetFx.length } : centre(rooms[0]);
  let cyl = null;
  if (wetFx.length) {
    const hosts = [...rooms.filter((r) => r.kind === "store" && /hwc|cupboard|cpd|linen/i.test(r.name) && area(r) >= 0.5), ...of("hall"), ...of("laundry"), ...of("garage"), ...of("kitchen")];
    const host = hosts.sort((a, b) => (hosts.indexOf(a) < 0) - (hosts.indexOf(b) < 0) || 0)[0] && [...hosts].sort((a, b) => rankHost(a) - rankHost(b) || dist(centre(a), wetC) - dist(centre(b), wetC))[0];
    if (host) {
      const E = edges(host).filter((e) => wallOn(L, e)?.outside && !isBench(host, e));
      const e = E.sort((a, b) => dist(onEdge(a, (a.a0 + a.a1) / 2), wetC) - dist(onEdge(b, (b.a0 + b.a1) / 2), wetC))[0];
      if (e) { const ops = wallOn(L, e).ops; const s = freeNear(e, ops, (e.a0 + e.a1) / 2, 0.3) ?? (e.a0 + e.a1) / 2; cyl = against(host, e, s, { kind: "cyl", w: 0.55, d: 0.55, h: 1.6, gap: 0.08, label: "Hot water cylinder, 180 L" }); }
      else { const p = centre(host); cyl = fixture({ kind: "cyl", u: p.u, v: p.v, w: 0.55, d: 0.55, h: 1.6, face: [0, 1], label: "Hot water cylinder, 180 L", room: host.name }); }
    }
  }
  function rankHost(r) { return r.kind === "store" ? 0 : r.kind === "hall" ? 1 : r.kind === "laundry" ? 2 : r.kind === "garage" ? 3 : 4; }

  // ------------------------------------------------------------------ heating and ventilation
  const living = [...of("living")].sort((a, b) => area(b) - area(a))[0] || [...rooms].filter((r) => !["bath", "wc", "store"].includes(r.kind)).sort((a, b) => area(b) - area(a))[0];
  let hpIn = null, hpOut = null, hpRoom = null;
  const refrigY = LEVEL.ceilRefrig, ductY = LEVEL.ceilDuct;
  // indoor unit high on the longest clear inside wall of the main living room (or the next room that has one);
  // outdoor unit outside the nearest outside wall, clear of doors, windows and decks
  const hpRooms = [...of("living").sort((a, b) => area(b) - area(a)), ...of("kitchen"), ...rooms.filter((r) => !["living", "kitchen", "bath", "wc", "store", "garage"].includes(r.kind)).sort((a, b) => area(b) - area(a))];
  for (const room of hpRooms) {
    const E = edges(room).map((e) => ({ e, w: wallOn(L, e) })).filter((x) => x.w && !isBench(room, x.e));
    const pick = (inside) => E.filter((x) => x.w.outside !== inside).map((x) => ({ ...x, span: freeSpans(x.e, x.w.ops, 0.15)[0] })).filter((x) => x.span && x.span[1] - x.span[0] >= 0.95).sort((a, b) => b.span[1] - b.span[0] - (a.span[1] - a.span[0]))[0];
    const got = pick(true) || pick(false);
    if (!got) continue;
    const s = (got.span[0] + got.span[1]) / 2, p = onEdge(got.e, s, 0.12);
    hpIn = { u: p.u, v: p.v, face: got.e.inward, wallPt: onEdge(got.e, s, 0.02), side: got.e.side }; hpRoom = room;
    add({ sys: "hvac", kind: "hp-in", u: p.u, v: p.v, label: `Heat pump, indoor unit, ${lc(room.name)}` });
    boxes.push({ sys: "hvac", kind: "hp-in", c: [p.u, 2.05, p.v], s: got.e.axis === "x" ? [0.85, 0.3, 0.24] : [0.24, 0.3, 0.85], face: got.e.inward, label: "Heat pump, indoor unit" });
    break;
  }
  if (hpIn) {
    const ow = nearestWall(L, hpIn, (w) => wallSpot(L, w, Math.max(w.from, Math.min(w.to, wallAlong(w, hpIn))), 0.45, 0.55) != null);
    if (ow) {
      const s2 = wallSpot(L, ow, Math.max(ow.from, Math.min(ow.to, wallAlong(ow, hpIn))), 0.45, 0.55);
      const q = wallOut(ow, s2, 0.55);
      hpOut = { u: q.u, v: q.v, wall: ow, s: s2 };
      add({ sys: "hvac", kind: "hp-out", u: q.u, v: q.v, label: "Heat pump, outdoor unit" });
      const ox = ow.axis === "x";
      boxes.push({ sys: "hvac", kind: "hp-out", c: [q.u, 0.35, q.v], s: ox ? [0.85, 0.65, 0.32] : [0.32, 0.65, 0.85], face: ox ? [0, ow.out ?? 1] : [ow.out ?? 1, 0], label: "Heat pump, outdoor unit" });
      const inner = wallOut(ow, s2, -0.05), wallSide = wallOut(ow, s2, 0.55 - 0.16);
      runs.push({ sys: "hvac", kind: "refrig", r: 0.03, label: "Refrigerant pipes, insulated",
        pts: dedupe([[hpIn.wallPt.u, 2.05, hpIn.wallPt.v], [hpIn.wallPt.u, refrigY, hpIn.wallPt.v], [inner.u, refrigY, hpIn.wallPt.v], [inner.u, refrigY, inner.v], [inner.u, 0.6, inner.v], [wallSide.u, 0.6, wallSide.v]]), first: FIRST.ceil });
    } else notes.push("No clear outside wall for the heat pump's outdoor unit.");
  } else notes.push("No clear wall for a heat pump's indoor unit in the living rooms, so none is proposed.");
  // extract fans: every bathroom and WC (25 L/s) and the rangehood (50 L/s), ducted to the nearest outside wall
  const ducts = [];
  const ductOut = (from, h0, wFrom, rate, label, wd, toWall) => {
    const w = toWall || nearestWall(L, from);
    const s = Math.max(w.from + 0.2, Math.min(w.to - 0.2, wallAlong(w, from)));
    const end = wallOut(w, s, 0.25);
    const pts = w.axis === "x" ? [[from.u, h0, from.v], [from.u, ductY, from.v], [from.u, ductY, end.v]] : [[from.u, h0, from.v], [from.u, ductY, from.v], [end.u, ductY, from.v]];
    const run = { sys: "hvac", kind: "duct", w: wd, h: wd, label, toOutside: true, rate, wallName: w.name || "outside wall", pts: dedupe(pts), first: FIRST.ceil };
    runs.push(run); ducts.push(run); return run;
  };
  for (const r of [...of("bath"), ...of("wc")]) {
    const sh = showers.find((s) => s.room === r.name);
    const p = sh ? { u: sh.u + (sh.wall.axis === "x" ? 0.14 : 0.14 * sh.wall.inward[0]), v: sh.v + (sh.wall.axis === "x" ? 0.14 * sh.wall.inward[1] : 0.14) } : centre(r);
    add({ sys: "hvac", kind: "fan", u: p.u, v: p.v, label: `Extract fan, ${lc(r.name)}, 25 L/s` });
    boxes.push({ sys: "hvac", kind: "fan", c: [p.u, plate - 0.02, p.v], s: [0.3, 0.06, 0.3], label: `Extract fan, ${lc(r.name)}`, room: r.name });
    ductOut(p, plate, null, 25, `Extract duct, ${lc(r.name)}`, 0.15).room = r.name;
  }
  if (hob) {
    add({ sys: "hvac", kind: "hood", u: hob.u, v: hob.v, label: "Rangehood, 50 L/s" });
    const be = bench.e, hp = onEdge(be, alongOf(be, hob), 0.27);
    boxes.push({ sys: "hvac", kind: "hood", c: [hp.u, 1.62, hp.v], s: be.axis === "x" ? [0.6, 0.2, 0.5] : [0.5, 0.2, 0.6], face: be.inward, label: "Rangehood" });
    const bw = wallOn(L, be);
    ductOut(hp, 1.72, null, 50, "Rangehood duct", 0.18, bw?.outside ? bw.wall : null).kitchen = true;
  }

  // ------------------------------------------------------------------ water supply: toby to the cylinder, manifold, home runs
  const wY = LEVEL.underWater;
  const hygiene = new Set(["shower", "basin"]);
  const supplies = [];
  let toby = null, manifold = null;
  if (cyl) {
    const cw = nearestWall(L, cyl);
    const s = Math.max(cw.from + 0.3, Math.min(cw.to - 0.3, wallAlong(cw, cyl)));
    const t = wallOut(cw, s, 3.2), entry = wallOut(cw, s, 0.4);
    toby = { u: t.u, v: t.v };
    add({ sys: "water", kind: "toby", ...toby, label: "Toby and meter at the boundary" });
    add({ sys: "water", kind: "tv", u: cyl.u + 0.3 * (Math.abs(cyl.face[0]) > 0.5 ? 0 : 1), v: cyl.v + 0.3 * (Math.abs(cyl.face[0]) > 0.5 ? 1 : 0), label: "Tempering valve, 50 °C" });
    const mid = cw.axis === "x" ? [toby.u, wY, cyl.v] : [cyl.u, wY, toby.v];
    runs.push({ sys: "water", kind: "main", r: 0.016, label: "Water main", pts: dedupe([[toby.u, -0.9, toby.v], [entry.u, -0.9, entry.v], [entry.u, wY, entry.v], mid, [cyl.u, 0.2, cyl.v]]), first: FIRST.under });
    manifold = [cyl.u + 0.18, wY, cyl.v];
    for (const f of fixtures) {
      const need = { shower: [true, false], basin: [true, false], wc: [false], sink: [true, false], dish: [false], washer: [true, false], tub: [true, false] }[f.kind];
      if (!need) continue;
      for (const hot of need) supplies.push([f, hot]);
    }
    for (const [f, hot] of supplies) {
      const off = hot ? 0.09 : -0.09;
      const end = [f.u + off, f.kind === "shower" ? 1.0 : 0.55, f.v];
      const tempered = hot && hygiene.has(f.kind);
      const mz = manifold[2] + (hot ? 0.06 : -0.06);
      runs.push({ sys: "water", kind: hot ? "hot" : "cold", hot, tempered, r: 0.011, fixture: f.kind, room: f.room,
        label: `${hot ? "Hot" : "Cold"} to the ${lc(f.label)}${f.room ? ` (${lc(f.room)})` : ""}${tempered ? ", via the tempering valve" : ""}`,
        pts: dedupe([[manifold[0], wY, mz], [end[0], wY, mz], [end[0], wY, end[2]], end]), first: FIRST.under });
    }
    // an outside tap on the outside wall nearest the sink (or the cylinder)
    const tf = sink || cyl, tw = nearestWall(L, tf), ts = wallSpot(L, tw, wallAlong(tw, tf) - 0.6, 0.12, 0.05) ?? wallAlong(tw, tf);
    const tp = wallOut(tw, ts, 0.05);
    add({ sys: "water", kind: "tap", u: tp.u, v: tp.v, label: "Outside tap" });
    runs.push({ sys: "water", kind: "cold", r: 0.011, label: "Cold to the outside tap", pts: dedupe([[manifold[0], wY, manifold[2] - 0.06], [tp.u, wY, manifold[2] - 0.06], [tp.u, wY, tp.v], [tp.u, 0.5, tp.v]]), first: FIRST.under });
    supplies.push([{ kind: "tap" }, false]);
  }

  // ------------------------------------------------------------------ drainage: a main along the best outside wall, falling to a gully
  const wasteFx = fixtures.filter((f) => ["wc", "basin", "shower", "sink", "dish", "washer", "tub"].includes(f.kind));
  const branches = [];
  let gully = null, drainMain = null;
  if (wasteFx.length) {
    const cost = (w) => wasteFx.reduce((t, f) => t + Math.abs((w.axis === "x" ? f.v : f.u) - w.at), 0);
    const mw = [...L.walls].sort((a, b) => cost(a) - cost(b))[0];
    const line = mw.at - (mw.out ?? 1) * 0.45;            // the main runs 0.45 m inside the outside face
    const A = (f) => (mw.axis === "x" ? f.u : f.v);
    const aMin = Math.min(...wasteFx.map(A)), aMax = Math.max(...wasteFx.map(A));
    const toMax = sink ? Math.abs(A(sink) - aMax) <= Math.abs(A(sink) - aMin) : true;
    const aG = Math.max(mw.from + 0.3, Math.min(mw.to - 0.3, toMax ? aMax : aMin)), aUp0 = toMax ? aMin : aMax;
    const dir = Math.sign(aG - aUp0) || 1, aUp = aUp0 - dir * 0.2, d0 = LEVEL.underDrain;
    const yAt = (a) => d0 - Math.abs(a - aUp) * FALL;
    const P = (a, y, perp = line) => (mw.axis === "x" ? [a, y, perp] : [perp, y, a]);
    const g = wallOut(mw, aG, 0.7);
    gully = { u: g.u, v: g.v };
    add({ sys: "drain", kind: "gully", ...gully, label: "Gully trap, below every fixture" });
    const exit = mw.at + (mw.out ?? 1) * 0.25, yG = yAt(aG);
    drainMain = { sys: "drain", kind: "main", r: 0.055, label: "Drain, DN100, falling to the gully", fall: FALL,
      pts: dedupe([P(aUp, yAt(aUp)), P(aG, yG), P(aG, yG - Math.abs(exit - line) * FALL, exit), [gully.u, yG - Math.abs(exit - line) * FALL - 0.05, gully.v]]), first: FIRST.under };
    runs.push(drainMain);
    const vp = P(aUp, yAt(aUp));
    add({ sys: "drain", kind: "vent", u: vp[0], v: vp[2], label: "Vent through the roof" });
    runs.push({ sys: "drain", kind: "vent", r: 0.025, label: "Vent pipe through the roof", pts: [vp, [vp[0], plate, vp[2]], [vp[0], plate + 1.25, vp[2]]], first: null });
    for (const f of wasteFx) {
      const perp = mw.axis === "x" ? f.v : f.u, sg = Math.sign(line - perp) || 1, tp = perp + sg * 0.12;
      const a = A(f), y1 = yAt(a) + 0.05, top = f.kind === "wc" ? 0.05 : 0.35;
      add({ sys: "drain", kind: "trap", u: mw.axis === "x" ? a : tp, v: mw.axis === "x" ? tp : a, label: `Trap, ${lc(f.label)}` });
      runs.push({ sys: "drain", kind: "branch", r: f.kind === "wc" ? 0.05 : 0.025, trapped: true, room: f.room, label: `Waste from the ${lc(f.label)}${f.room ? ` (${lc(f.room)})` : ""}`,
        pts: dedupe([P(a, top, tp), P(a, y1, tp), P(a, y1 - Math.abs(line - tp) * FALL, line)]), first: FIRST.under });
      branches.push(f.kind);
    }
  }

  // ------------------------------------------------------------------ electrical: board, circuits, devices
  const eY = LEVEL.ceilElec;
  const boardHost = of("hall")[0] || of("garage")[0] || of("laundry")[0] || kit || living || rooms[0];
  let sb = null;
  {
    const E = edges(boardHost).map((e) => ({ e, w: wallOn(L, e) })).filter((x) => x.w && !isBench(boardHost, x.e) && !(hpRoom && hpRoom.id === boardHost.id && x.e.side === hpIn.side));
    const pick = (inside) => E.filter((x) => x.w.outside !== inside).map((x) => ({ ...x, span: freeSpans(x.e, x.w.ops)[0] })).filter((x) => x.span && x.span[1] - x.span[0] >= 0.5).sort((a, b) => b.span[1] - b.span[0] - (a.span[1] - a.span[0]))[0];
    const got = pick(true) || pick(false);
    const e = got?.e || edges(boardHost)[0], s = got ? (got.span[0] + got.span[1]) / 2 : (e.a0 + e.a1) / 2;
    const p = onEdge(e, s, 0.05), q = onEdge(e, s, 0.12);
    sb = { u: p.u, v: p.v, feed: q, face: e.inward, room: boardHost.name };
    add({ sys: "elec", kind: "board", u: p.u, v: p.v, label: "Switchboard, RCD on every circuit" });
    boxes.push({ sys: "elec", kind: "board", c: [p.u, 1.55, p.v], s: e.axis === "x" ? [0.4, 0.5, 0.1] : [0.1, 0.5, 0.4], face: e.inward, label: "Switchboard" });
  }
  const dev = (kind, u, v, h, label, room, face) => add({ sys: "elec", kind, u, v, h, label, room, face });
  const lights = [], gpos = [], switches = [], alarms = [];
  for (const r of rooms) {
    if (r.kind === "store" && area(r) < 1.5) continue;
    const n = Math.max(1, Math.round(area(r) / 9)), longU = r.w >= r.d;
    for (let i = 0; i < n; i++) {
      const t = (i + 1) / (n + 1);
      lights.push(dev("light", longU ? r.u + r.w * t : r.u + r.w / 2, longU ? r.v + r.d / 2 : r.v + r.d * t, plate - 0.02, `Light, ${lc(r.name)}`, r.name));
    }
  }
  const socketsIn = (r, n, h = 0.3) => {
    const E = edges(r).map((e) => ({ e, w: wallOn(L, e) })).filter((x) => x.w && !isBench(r, x.e)).sort((a, b) => b.e.len - a.e.len);
    for (let i = 0; i < n && E.length; i++) {
      const { e, w } = E[i % E.length], t = i < E.length ? 0.3 : 0.75;
      const s = freeNear(e, w.ops, e.a0 + e.len * t, 0.1); if (s == null) continue;
      const p = onEdge(e, s, 0.06);
      gpos.push(dev("gpo", p.u, p.v, h, `Double socket, ${lc(r.name)}`, r.name, e.inward));
    }
  };
  for (const r of rooms) {
    if (r.kind === "bed") socketsIn(r, 2);
    else if (r.kind === "living") socketsIn(r, area(r) < 10 ? 1 : area(r) < 14 ? 2 : 3);
    else if (r.kind === "hall" || r.kind === "garage") socketsIn(r, r.kind === "garage" ? 2 : 1);
    else if (r.kind === "laundry") socketsIn(r, 1, 1.1);
  }
  if (bench) for (const s of [bench.a0 + 1.1, bench.a1 - 0.9]) { const p = onEdge(bench.e, s, 0.04); gpos.push(dev("gpo", p.u, p.v, 1.1, "Double socket, kitchen bench", kit.name, bench.e.inward)); }
  for (const b of basins.filter((x) => /bath|ensuite/i.test(x.room) || of("bath").some((r) => r.name === x.room))) {
    // shaver socket beside the basin, on the side away from the shower
    const sh = showers.find((s) => s.room === b.room);
    const along = Math.abs(b.face[0]) > 0.5 ? [0, 1] : [1, 0];
    let k = 0.42; if (sh && (sh.u - b.u) * along[0] + (sh.v - b.v) * along[1] > 0) k = -0.42;
    const back = [-b.face[0] * (b.d / 2 - 0.02), -b.face[1] * (b.d / 2 - 0.02)];
    gpos.push(dev("gpo", b.u + along[0] * k + back[0], b.v + along[1] * k + back[1], 1.2, `Shaver socket, ${lc(b.room)}`, b.room, b.face));
  }
  // switches inside each room's door, on the latch side
  for (const r of rooms) {
    if (r.kind === "store" && area(r) < 1.5) continue;
    const d = doorsOf(r).sort((a, b) => b.inside - a.inside)[0];
    if (!d) continue;
    const e = edges(r).find((x) => x.axis === d.axis && Math.abs(x.c - (d.axis === "x" ? d.v : d.u)) < 0.3);
    if (!e) continue;
    let s = d.b + 0.12; if (s > e.a1 - 0.05) s = d.a - 0.12;
    if (s < e.a0 + 0.05) continue;
    const p = onEdge(e, s, 0.1);
    switches.push(dev("switch", p.u, p.v, 1.05, `Switch, ${lc(r.name)}`, r.name, e.inward));
  }
  // smoke alarms: the first pass puts one in the hall (or the main living room); the check below adds more where needed
  const beds = of("bed");
  const firstHost = of("hall").sort((a, b) => area(b) - area(a))[0] || living;
  if (firstHost && beds.length) { const c = centre(firstHost); alarms.push(dev("alarm", c.u, firstHost.kind === "hall" ? Math.min(c.v, firstHost.v + 0.5) : c.v, plate - 0.02, `Smoke alarm, ${lc(firstHost.name)}`, firstHost.name)); }

  const circuits = [
    { id: "L1", name: "Lighting, bedrooms and wet rooms", devs: lights.filter((d) => ["bed", "bath", "wc", "laundry"].includes(roomKindOf(d.room))) },
    { id: "L2", name: "Lighting, living", devs: lights.filter((d) => !["bed", "bath", "wc", "laundry"].includes(roomKindOf(d.room))) },
    { id: "P1", name: "Sockets, bedrooms and living", devs: gpos.filter((d) => !["kitchen", "laundry", "bath", "wc"].includes(roomKindOf(d.room))) },
    { id: "P2", name: "Sockets, kitchen and laundry", devs: gpos.filter((d) => ["kitchen", "laundry"].includes(roomKindOf(d.room))) },
    { id: "P3", name: "Bathroom sockets", devs: gpos.filter((d) => ["bath", "wc"].includes(roomKindOf(d.room))) },
    ...(hob ? [{ id: "C1", name: "Cooktop and oven", devs: [(() => { const p = onEdge(bench.e, alongOf(bench.e, hob) + 0.42, 0.08); return { u: p.u, v: p.v, h: 0.5 }; })()] }] : []),
    ...(cyl ? [{ id: "C2", name: "Hot water cylinder", devs: [{ u: cyl.u, v: cyl.v, h: 1.6 }] }] : []),
    ...(hpIn ? [{ id: "C3", name: "Heat pump", devs: [{ u: hpIn.u, v: hpIn.v, h: 2.05 }] }] : []),
    { id: "A1", name: "Smoke alarms, interconnected", devs: alarms },
  ].filter((c) => c.devs.length);
  function roomKindOf(name) { return rooms.find((r) => r.name === name)?.kind || "other"; }
  // a circuit with more than 12 points is split in two
  for (let i = 0; i < circuits.length; i++) {
    const c = circuits[i];
    if (c.devs.length > 12 && c.id !== "A1") { const half = Math.ceil(c.devs.length / 2); circuits.splice(i + 1, 0, { id: c.id + "b", name: c.name + " (second)", devs: c.devs.slice(half) }); c.devs = c.devs.slice(0, half); }
  }
  const chain = (c) => {
    const pts = [[sb.feed.u, 1.8, sb.feed.v], [sb.feed.u, eY, sb.feed.v]];
    let cur = [sb.feed.u, sb.feed.v]; const left = [...c.devs]; const drops = [];
    while (left.length) {
      left.sort((a, b) => Math.hypot(a.u - cur[0], a.v - cur[1]) - Math.hypot(b.u - cur[0], b.v - cur[1]));
      const d = left.shift();
      pts.push([d.u, eY, cur[1]], [d.u, eY, d.v]);
      drops.push([[d.u, eY, d.v], [d.u, d.h ?? 0.3, d.v]]);
      cur = [d.u, d.v];
    }
    return { pts, drops };
  };
  const cableFor = (c) => {
    c.rcd = true;
    const { pts, drops } = chain(c);
    runs.push({ sys: "elec", kind: "cable", r: 0.008, circuit: c.id, label: `Circuit ${c.id}: ${lc(c.name)}`, pts: dedupe(pts), first: FIRST.ceil });
    for (const dp of drops) if (Math.abs(dp[0][1] - dp[1][1]) > 0.01) runs.push({ sys: "elec", kind: "drop", r: 0.007, circuit: c.id, label: `Drop, circuit ${c.id}`, pts: dp, first: null });
  };
  for (const c of circuits.filter((c) => c.id !== "A1")) cableFor(c);

  // ------------------------------------------------------------------ smoke alarm check (F7/AS1), and the fix
  const bedDoors = beds.map((r) => {
    const ds = doorsOf(r).filter((d) => d.inside); const use = ds.length ? ds : doorsOf(r);
    return use.length ? use.map((d) => ({ room: r.name, u: d.u, v: d.v, r })) : [{ room: r.name, u: NaN, v: NaN, r, none: true }];
  }).flat();
  const inRoom = (list, r) => list.some((a) => a.u > r.u && a.u < r.u + r.w && a.v > r.v && a.v < r.v + r.d);
  const nearestAlarm = (d) => (d.none ? Infinity : Math.min(Infinity, ...alarms.map((a) => dist(a, d))));
  const firstAlarm = bedDoors.map((d) => ({ ...d, dist: nearestAlarm(d) }));
  const alarmFix = [];
  const failing = firstAlarm.filter((d) => d.dist > 3.0 && !inRoom(alarms, d.r));
  if (failing.length) {
    const cands = [...of("living"), ...of("hall")].filter((r) => !inRoom(alarms, r)).map((r) => ({ r, c: centre(r) }));
    const one = cands.find(({ c }) => failing.every((d) => !d.none && dist(c, d) <= 3.0));
    const at = one ? [one.r] : [...new Set(failing.map((d) => d.r))];
    for (const r of at) { const c = centre(r); alarms.push(dev("alarm", c.u, c.v, plate - 0.02, `Smoke alarm, ${lc(r.name)}`, r.name)); alarmFix.push(r.name); }
  }
  if (alarms.length) cableFor(circuits.find((c) => c.id === "A1") || (circuits.push({ id: "A1", name: "Smoke alarms, interconnected", devs: alarms }), circuits.at(-1)));
  const finalAlarm = bedDoors.map((d) => ({ ...d, dist: inRoom(alarms, d.r) ? 0 : nearestAlarm(d) }));
  const perBed = beds.map((r) => ({ room: r.name, dist: Math.min(...finalAlarm.filter((d) => d.room === r.name).map((d) => d.dist)) }));
  const firstPerBed = beds.map((r) => ({ room: r.name, dist: Math.min(...firstAlarm.filter((d) => d.room === r.name).map((d) => (inRoom(alarms.slice(0, 1), d.r) ? 0 : d.dist))) }));

  // ------------------------------------------------------------------ clashes: first pass, then each system on its own level, then nudge any left
  for (const r of runs) r.firstPts = r.first == null ? r.pts.map((p) => p.slice()) : r.pts.map((p) => [p[0], Math.abs(p[1] - r.first) < 0.6 ? r.first : p[1], p[2]]);
  const firstClashes = clashes(runs, true);
  const levelled = clashes(runs, false);
  const jogs = levelled.count ? resolve(runs) : 0;
  for (const r of runs) if (r.first != null) r.firstPts = r.pts.map((p) => [p[0], Math.abs(p[1] - r.first) < 0.6 ? r.first : p[1], p[2]]);
  const finalClashes = clashes(runs, false);

  // ------------------------------------------------------------------ checks
  const checks = [];
  const fmt = (d) => (d === 0 ? "alarm in the room" : isFinite(d) ? `${d.toFixed(1)} m` : "no door found");
  if (beds.length) {
    checks.push({ id: "alarms", clause: "F7/AS1", title: "Smoke alarm in every bedroom or within 3 m of its door",
      value: perBed.map((d) => `${d.room} ${fmt(d.dist)}`).join(" · "), pass: perBed.every((d) => d.dist <= 3.0),
      fixed: alarmFix.length ? `First pass: one alarm in the ${lc(firstHost.name)}${firstPerBed.filter((d) => d.dist > 3).length ? `, ${firstPerBed.filter((d) => d.dist > 3).map((d) => `${lc(d.room)} ${isFinite(d.dist) ? `door ${d.dist.toFixed(1)} m away` : "with no door found"}`).join(", ")}` : ""}. Added an alarm in the ${alarmFix.map(lc).join(" and ")}.` : null });
    const esc = alarms.find((a) => ["hall", "living"].includes(roomKindOf(a.room)));
    checks.push({ id: "escape", clause: "F7/AS1", title: "Smoke alarm on the escape route", value: esc ? `${esc.room}, on the way out` : "None on the way out", pass: !!esc });
  }
  for (const d of ducts.filter((x) => !x.kitchen)) checks.push({ id: "fan-" + d.room, clause: "G4/AS1", title: `${d.room}: extract to outside, 25 L/s`, value: `${d.rate} L/s, ducted through the ${lc(d.wallName)}`, pass: d.rate >= 25 && d.toOutside });
  const hoodRun = ducts.find((x) => x.kitchen);
  if (hoodRun) checks.push({ id: "hood", clause: "G4/AS1", title: "Kitchen rangehood to outside, 50 L/s", value: `${hoodRun.rate} L/s, ducted through the ${lc(hoodRun.wallName)}`, pass: hoodRun.rate >= 50 && hoodRun.toOutside });
  const hygieneRuns = runs.filter((r) => r.sys === "water" && r.hot && hygiene.has(r.fixture));
  if (cyl) checks.push({ id: "hotwater", clause: "G12/AS1", title: "Hot water stored at 60 °C, 50 °C at showers and basins", value: `Cylinder set to 60 °C · ${hygieneRuns.filter((r) => r.tempered).length} of ${hygieneRuns.length} hot runs to them pass the tempering valve`, pass: hygieneRuns.every((r) => r.tempered) });
  if (wasteFx.length) {
    checks.push({ id: "traps", clause: "G13", title: "Every fixture trapped, drain vented", value: `${branches.length} traps, vent through the roof`, pass: branches.length === wasteFx.length });
    checks.push({ id: "fall", clause: "G13", title: "Drain falls all the way to the gully", value: `1 in ${Math.round(1 / FALL)} modelled`, pass: FALL >= 1 / 60 });
  }
  checks.push({ id: "rcd", clause: "AS/NZS 3000", title: "RCD protection on every circuit", value: `${circuits.length} of ${circuits.length} circuits`, pass: circuits.every((c) => c.rcd) });
  if (showers.length) {
    const near = Math.min(...showers.map((sh) => Math.min(...gpos.map((g) => Math.max(0, dist(g, sh) - 0.45)))));
    checks.push({ id: "zone", clause: "AS/NZS 3000", title: "No socket within 0.6 m of a shower", value: `Nearest ${near.toFixed(1)} m`, pass: near >= 0.6 });
  }
  checks.push({ id: "clash", clause: "Clash detection", title: "No hard clashes between systems", value: `First pass ${firstClashes.count}, now ${finalClashes.count}`, pass: finalClashes.count === 0,
    fixed: firstClashes.count ? `First pass had ${firstClashes.count} hard clashes with everything at one ceiling and one underfloor height. Each system now keeps to its own level${jogs ? `, and ${jogs} run${jogs === 1 ? "" : "s"} stepped aside round a riser` : ""}.` : null });
  if (!wetFx.length) notes.push("No bathroom, WC, laundry or kitchen named on the plan, so no plumbing is proposed.");
  if (!beds.length) notes.push("No bedroom named on the plan, so the smoke alarm checks are left out.");

  // parts: every straight length, every bend and every device counts once
  let parts = 0;
  for (const r of runs) parts += Math.max(1, r.pts.length - 1) + Math.max(0, r.pts.length - 2);
  parts += boxes.length + sym.filter((s) => s.sys === "elec" && s.kind !== "board").length;
  const len = (sys) => runs.filter((r) => r.sys === sys).reduce((t, r) => t + pathLen(r.pts), 0);
  const stats = {};
  if (supplies.length) stats.water = `${supplies.length} home runs, ${Math.round(len("water"))} m of PEX`;
  if (branches.length) stats.drain = `${branches.length} fixtures trapped and vented, ${Math.round(len("drain"))} m of pipe`;
  stats.elec = `${circuits.length} circuits, ${sym.filter((s) => s.sys === "elec").length} devices, ${Math.round(len("elec"))} m of cable`;
  stats.hvac = `${hpOut ? "Heat pump" : "No heat pump"}, ${ducts.length ? `${ducts.length} extract fan${ducts.length === 1 ? "" : "s"} ducted outside` : "no extract fans"}`;
  let minY = 0; for (const r of runs) for (const p of r.pts) minY = Math.min(minY, p[1]);
  return { building: B, level: L, rooms, footprint: F, plate, sym, runs, boxes, fixtures, checks, parts, stats, firstClashes, finalClashes, alarms, circuits, notes, jogs,
    ground: Math.min(-0.64, minY - 0.1), bench, toby, gully, cyl, hpIn, hpOut, sb };
}

function benchBack(e, f) {
  // the bench edge furthest into the wall: for an edge at c, the bench side nearest c
  if (e.axis === "x") return Math.abs(f.v0 - e.c) < Math.abs(f.v1 - e.c) ? f.v0 : f.v1;
  return Math.abs(f.u0 - e.c) < Math.abs(f.u1 - e.c) ? f.u0 : f.u1;
}
function dedupe(pts) { return pts.filter((p, i) => i === 0 || Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1], p[2] - pts[i - 1][2]) > 1e-6).map((p) => p.slice()); }
export function pathLen(pts) { let t = 0; for (let i = 1; i < pts.length; i++) t += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]); return t; }

// ---------------------------------------------------------------------------------------------------- clash detection
// hard clashes: two runs of different systems whose pipes come closer than their radii. The first pass uses the
// flattened points (everything in the ceiling at one height, everything under the floor at another).
function segsOf(r, first) {
  if (r.kind === "drop") return [];
  const rad = r.r ?? Math.max(r.w, r.h) / 2, pts = first ? r.firstPts : r.pts, out = [];
  for (let i = 1; i < pts.length; i++) out.push({ a: pts[i - 1], b: pts[i], rad, sys: r.sys, run: r, i });
  return out;
}
function clashes(runs, first) {
  const segs = runs.flatMap((r) => segsOf(r, first));
  let count = 0; const at = [], pairs = [];
  for (let i = 0; i < segs.length; i++) for (let j = i + 1; j < segs.length; j++) {
    const s = segs[i], t = segs[j];
    if (s.sys === t.sys) continue;
    const { d, p } = segDist(s.a, s.b, t.a, t.b);
    if (d < s.rad + t.rad - 1e-4) { count++; at.push(p); pairs.push([s, t]); }
  }
  return { count, at, pairs };
}
function clashCountOf(run, runs) {
  const mine = segsOf(run, false), others = runs.filter((r) => r !== run && r.sys !== run.sys).flatMap((r) => segsOf(r, false));
  let n = 0;
  for (const s of mine) for (const t of others) if (segDist(s.a, s.b, t.a, t.b).d < s.rad + t.rad - 1e-4) n++;
  return n;
}
// step a run sideways until it clears (lowest-priority system moves first): a middle stretch moves on its own; an end
// stretch moves with a short dog-leg back to where the run starts or ends, so its ends stay put
function candidates(pts, i) {
  const out = [], n = pts.length, a = pts[i - 1], b = pts[i];
  if (Math.abs(a[1] - b[1]) > 1e-6) return out;
  const alongX = Math.abs(b[0] - a[0]) > Math.abs(b[2] - a[2]);
  const perp = (p, q) => (Math.abs(p[1] - q[1]) > 1e-6) || (alongX ? Math.abs(q[0] - p[0]) < 1e-6 : Math.abs(q[2] - p[2]) < 1e-6);
  const mv = (p, d) => (alongX ? [p[0], p[1], p[2] + d] : [p[0] + d, p[1], p[2]]);
  for (const d of [0.12, -0.12, 0.24, -0.24, 0.36, -0.36, 0.5, -0.5]) {
    if (i >= 2 && i <= n - 2 && perp(pts[i - 2], a) && perp(b, pts[i + 1])) out.push(pts.map((p, k) => (k === i - 1 || k === i ? mv(p, d) : p.slice())));
    else if (i === 1 && n >= 3 && perp(b, pts[2])) out.push([a.slice(), mv(a, d), mv(b, d), ...pts.slice(2).map((p) => p.slice())]);
    else if (i === n - 1 && n >= 3 && perp(pts[n - 3], a)) out.push([...pts.slice(0, n - 2).map((p) => p.slice()), mv(a, d), mv(b, d), b.slice()]);
  }
  return out;
}
function resolve(runs) {
  const jogged = new Set(); let guard = 0;
  let { pairs } = clashes(runs, false);
  while (pairs.length && guard++ < 80) {
    const [s, t] = pairs[0];
    let fixed = false;
    for (const sg of [s, t].sort((x, y) => PRI[x.sys] - PRI[y.sys])) {
      const r = sg.run; if (r.kind === "vent" || r.kind === "main" && r.sys === "drain") continue;
      const before = clashCountOf(r, runs), keep = r.pts;
      for (const i of [sg.i, sg.i - 1, sg.i + 1]) {
        if (i < 1 || i > keep.length - 1) continue;
        for (const c of candidates(keep, i)) {
          r.pts = c;
          if (clashCountOf(r, runs) < before) { fixed = true; break; }
        }
        if (fixed) break;
      }
      if (fixed) { jogged.add(r); break; }
      r.pts = keep;
    }
    if (!fixed) { pairs.shift(); continue; }
    pairs = clashes(runs, false).pairs;
  }
  return jogged.size;
}
function segDist(p1, q1, p2, q2) {
  const d1 = sub(q1, p1), d2 = sub(q2, p2), r = sub(p1, p2);
  const a = dot(d1, d1), e = dot(d2, d2), f = dot(d2, r);
  let s, t;
  if (a <= 1e-9 && e <= 1e-9) { s = t = 0; }
  else if (a <= 1e-9) { s = 0; t = clamp(f / e); }
  else { const c = dot(d1, r); if (e <= 1e-9) { t = 0; s = clamp(-c / a); } else { const b = dot(d1, d2), den = a * e - b * b; s = den !== 0 ? clamp((b * f - c * e) / den) : 0; t = (b * s + f) / e; if (t < 0) { t = 0; s = clamp(-c / a); } else if (t > 1) { t = 1; s = clamp((b - c) / a); } } }
  const c1 = add3(p1, mul(d1, s)), c2 = add3(p2, mul(d2, t));
  return { d: Math.hypot(...sub(c1, c2)), p: mul(add3(c1, c2), 0.5) };
}
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const clamp = (x) => Math.max(0, Math.min(1, x));
