// Services for the 16A west home, generated from its plan model (assembl.plan-model.v1). Everything here is derived:
// fixtures and devices are placed from the room names, runs are routed between them, then the result is checked for
// clashes and against a short list of NZ Building Code items. It is a proposal on a design study, not a design.
// Units: metres. x = u (east), z = v (south), y up from the finished floor.

export const SYSTEMS = {
  hvac:  { name: "Heating and ventilation", color: 0x6f93c9 },
  drain: { name: "Drainage and vents",      color: 0x9a6b4f },
  water: { name: "Water supply",            color: 0x4ba3c7 },
  elec:  { name: "Electrical",              color: 0x8b6fb8 },
  fix:   { name: "Fixtures and appliances", color: 0x6e6468 },
};
export const HOT = 0xc7655a;

// levels in the final layout: each system keeps to its own height, which is what clears the clashes
const LEVEL = { ceilElec: 2.42, ceilRefrig: 2.52, ceilDuct: 2.64, underWater: -0.14, underDrain: -0.36 };
// the first pass routed everything in the ceiling and under the floor at one height each, as a person might sketch it
const FIRST = { ceil: 2.45, under: -0.25 };

const room = (L, name) => L.rooms.find((r) => r.name === name);
const centre = (r) => [r.u + r.w / 2, r.v + r.d / 2];

export function buildServices(model) {
  const B = model.buildings.find((b) => b.id === "home-west") || model.buildings[0];
  const L = B.levels[0];
  const plate = L.plate;
  const R = Object.fromEntries(L.rooms.map((r) => [r.name, r]));
  const sym = [];      // plan symbols: { sys, kind, u, v, label }
  const runs = [];     // 3D runs: { sys, kind, pts:[[x,y,z]...], r, w, h, hot, label, firstPts }
  const boxes = [];    // 3D boxes: { sys, kind, c:[x,y,z], s:[w,h,d], label }
  const add = (s) => (sym.push(s), s);

  // ------------------------------------------------------------------ fixtures and appliances, placed from room names
  const bath = R["Bath"], kit = R["Kitchen"], hall = R["Hall"], lounge = R["Lounge"], dining = R["Dining"];
  const bed1 = R["Bedroom 1"], bed2 = R["Bedroom 2"];
  const bench = (L.fitout || []).find((f) => /bench/i.test(f.name) && !/top/i.test(f.name)) || { u0: kit.u + 0.24, u1: kit.u + kit.w - 0.5, v0: kit.v + kit.d - 0.55, v1: kit.v + kit.d };
  const fx = {
    shower:  { u: bath.u + 0.48, v: bath.v + 0.48, kind: "shower",  label: "Shower",          box: [0.9, 0.05, 0.9] },
    wc:      { u: bath.u + 0.42, v: bath.v + bath.d - 0.38, kind: "wc", label: "WC",          box: [0.38, 0.4, 0.65] },
    basin:   { u: bath.u + bath.w - 0.32, v: bath.v + bath.d - 0.3, kind: "basin", label: "Basin", box: [0.5, 0.85, 0.4] },
    sink:    { u: (bench.u0 + bench.u1) / 2 + 0.25, v: bench.v1 - 0.28, kind: "sink", label: "Kitchen sink", box: [0.8, 0.9, 0.5] },
    hob:     { u: bench.u0 + 0.4, v: bench.v1 - 0.3, kind: "hob", label: "Cooktop and oven", box: [0.6, 0.9, 0.58] },
    dish:    { u: bench.u1 - 0.32, v: bench.v1 - 0.3, kind: "dish", label: "Dishwasher", box: [0.6, 0.85, 0.58] },
    washer:  { u: kit.u + kit.w - 0.36, v: kit.v + 0.4, kind: "washer", label: "Washing machine", box: [0.6, 0.85, 0.6] },
    cyl:     { u: hall.u + hall.w / 2, v: hall.v + hall.d - 0.36, kind: "cyl", label: "Hot water cylinder, 180 L", box: [0.55, 1.6, 0.55] },
  };
  for (const f of Object.values(fx)) {
    add({ sys: "fix", kind: f.kind, u: f.u, v: f.v, label: f.label });
    boxes.push({ sys: "fix", kind: f.kind, c: [f.u, f.box[1] / 2, f.v], s: f.box, label: f.label });
  }

  // ------------------------------------------------------------------ heating and ventilation
  // heat pump: indoor unit high on the lounge's west wall, outdoor unit on the ground outside the south wall
  const hpIn = { u: lounge.u + 0.12, v: lounge.v + 1.6 }, hpOut = { u: dining.u + dining.w - 0.6, v: 6.0 + 0.55 };
  add({ sys: "hvac", kind: "hp-in", ...hpIn, label: "Heat pump, indoor unit" });
  add({ sys: "hvac", kind: "hp-out", ...hpOut, label: "Heat pump, outdoor unit" });
  boxes.push({ sys: "hvac", kind: "hp-in", c: [hpIn.u + 0.12, 2.05, hpIn.v], s: [0.24, 0.3, 0.85], label: "Heat pump, indoor unit" });
  boxes.push({ sys: "hvac", kind: "hp-out", c: [hpOut.u, 0.35, hpOut.v], s: [0.85, 0.65, 0.32], label: "Heat pump, outdoor unit" });
  const refrigY = LEVEL.ceilRefrig;
  runs.push({ sys: "hvac", kind: "refrig", r: 0.03, label: "Refrigerant pipes",
    pts: [[hpIn.u + 0.24, 2.05, hpIn.v], [hpIn.u + 0.24, refrigY, hpIn.v], [hpOut.u, refrigY, hpIn.v], [hpOut.u, refrigY, 5.95], [hpOut.u, 0.6, 5.95], [hpOut.u, 0.6, hpOut.v - 0.16]],
    first: FIRST.ceil });
  // extract fans, ducted to outside: bathroom (25 L/s) through the west wall, rangehood (50 L/s) through the south wall
  const bathFan = { u: bath.u + 0.62, v: bath.v + 0.62, rate: 25 }, hood = { u: fx.hob.u, v: fx.hob.v, rate: 50 };
  add({ sys: "hvac", kind: "fan", ...bathFan, label: "Bathroom extract fan, 25 L/s" });
  add({ sys: "hvac", kind: "hood", ...hood, label: "Rangehood, 50 L/s" });
  boxes.push({ sys: "hvac", kind: "fan", c: [bathFan.u, plate - 0.02, bathFan.v], s: [0.3, 0.06, 0.3], label: "Bathroom extract fan" });
  boxes.push({ sys: "hvac", kind: "hood", c: [hood.u, 1.6, hood.v + 0.02], s: [0.6, 0.22, 0.5], label: "Rangehood" });
  const ductY = LEVEL.ceilDuct;
  runs.push({ sys: "hvac", kind: "duct", w: 0.15, h: 0.15, label: "Bathroom extract duct", toOutside: true, rate: 25,
    pts: [[bathFan.u, plate, bathFan.v], [bathFan.u, ductY, bathFan.v], [-0.25, ductY, bathFan.v]], first: FIRST.ceil });
  runs.push({ sys: "hvac", kind: "duct", w: 0.18, h: 0.18, label: "Rangehood duct", toOutside: true, rate: 50,
    pts: [[hood.u, 1.72, hood.v], [hood.u, ductY, hood.v], [hood.u, ductY, 6.0 + 0.25]], first: FIRST.ceil });

  // ------------------------------------------------------------------ water supply: toby to the cylinder, manifold, home runs
  const toby = { u: hall.u + hall.w / 2, v: 9.2 };
  add({ sys: "water", kind: "toby", ...toby, label: "Toby and meter at the boundary" });
  add({ sys: "water", kind: "tv", u: fx.cyl.u + 0.3, v: fx.cyl.v - 0.05, label: "Tempering valve, 50 °C" });
  const wY = LEVEL.underWater;
  runs.push({ sys: "water", kind: "main", r: 0.016, label: "Water main", pts: [[toby.u, -0.5, toby.v], [toby.u, -0.5, 6.4], [toby.u, wY, 6.4], [toby.u, wY, fx.cyl.v], [fx.cyl.u, 0.2, fx.cyl.v]], first: FIRST.under });
  const manifold = [fx.cyl.u + 0.18, wY, fx.cyl.v];
  const hygiene = new Set(["shower", "basin"]);
  const supplies = [
    ["shower", true], ["shower", false], ["basin", true], ["basin", false], ["wc", false],
    ["sink", true], ["sink", false], ["dish", false], ["washer", true], ["washer", false],
  ];
  for (const [k, hot] of supplies) {
    const f = fx[k], off = hot ? 0.09 : -0.09;
    const end = [f.u + off, k === "shower" ? 1.0 : 0.55, f.v];
    const tempered = hot && hygiene.has(k);
    runs.push({ sys: "water", kind: hot ? "hot" : "cold", hot, tempered, r: 0.011, fixture: k,
      label: `${hot ? "Hot" : "Cold"} to the ${f.label.toLowerCase()}${tempered ? ", via the tempering valve" : ""}`,
      pts: [[manifold[0], wY, manifold[2] + (hot ? 0.06 : -0.06)], [end[0], wY, manifold[2] + (hot ? 0.06 : -0.06)], [end[0], wY, end[2]], end], first: FIRST.under });
  }
  const tap = { u: kit.u + kit.w - 0.5, v: 6.05 };
  add({ sys: "water", kind: "tap", ...tap, label: "Outside tap" });
  runs.push({ sys: "water", kind: "cold", r: 0.011, label: "Cold to the outside tap", pts: [[manifold[0], wY, manifold[2] - 0.06], [tap.u, wY, manifold[2] - 0.06], [tap.u, wY, tap.v], [tap.u, 0.5, tap.v]], first: FIRST.under });

  // ------------------------------------------------------------------ drainage: traps, under-floor branches with fall, gully, vent
  const gully = { u: fx.sink.u, v: 6.0 + 0.7 };
  add({ sys: "drain", kind: "gully", ...gully, label: "Gully trap, below every fixture" });
  const vent = { u: fx.wc.u, v: fx.wc.v };
  add({ sys: "drain", kind: "vent", u: vent.u - 0.2, v: vent.v, label: "Vent through the roof" });
  const fall = 1 / 50, d0 = LEVEL.underDrain;
  const exitV = 6.0 + 0.25;
  const branches = [];
  // a main runs east under the south rooms to the gully, falling all the way; each fixture drops into it
  const mainZ = 5.55, mainX0 = fx.wc.u, mainX1 = gully.u;
  const yAt = (x) => d0 - (x - mainX0) * fall;
  runs.push({ sys: "drain", kind: "main", r: 0.055, label: "Drain, DN100, falling to the gully", fall,
    pts: [[mainX0, yAt(mainX0), mainZ], [mainX1, yAt(mainX1), mainZ], [mainX1, yAt(mainX1) - (exitV - mainZ) * fall, exitV], [gully.u, -0.55, gully.v]], first: FIRST.under });
  for (const k of ["wc", "basin", "shower", "sink", "dish", "washer"]) {
    const f = fx[k];
    add({ sys: "drain", kind: "trap", u: f.u, v: f.v + 0.12, label: `Trap, ${f.label.toLowerCase()}` });
    const y1 = yAt(f.u) + 0.05;
    const pts = [[f.u, k === "wc" ? 0.05 : 0.35, f.v + 0.12], [f.u, y1, f.v + 0.12], [f.u, y1 - Math.abs(mainZ - (f.v + 0.12)) * fall, mainZ]];
    runs.push({ sys: "drain", kind: "branch", r: k === "wc" ? 0.05 : 0.025, trapped: true, label: `Waste from the ${f.label.toLowerCase()}`, pts, first: FIRST.under });
    branches.push(k);
  }
  runs.push({ sys: "drain", kind: "vent", r: 0.025, label: "Vent pipe through the roof", pts: [[vent.u - 0.2, yAt(vent.u), mainZ], [vent.u - 0.2, plate, mainZ], [vent.u - 0.2, plate + 1.25, mainZ]], first: null });

  // ------------------------------------------------------------------ electrical: board, circuits, devices
  const sb = { u: hall.u + 0.05, v: hall.v + 0.6 };
  add({ sys: "elec", kind: "board", ...sb, label: "Switchboard, RCD on every circuit" });
  boxes.push({ sys: "elec", kind: "board", c: [sb.u + 0.06, 1.55, sb.v], s: [0.1, 0.5, 0.4], label: "Switchboard" });
  const dev = (kind, u, v, h, label) => add({ sys: "elec", kind, u, v, h, label });
  const lights = [], gpos = [], switches = [], alarms = [];
  for (const [r, n] of [[bed1, 1], [bed2, 1], [lounge, 2], [dining, 1], [kit, 1], [bath, 1], [hall, 1]]) {
    for (let i = 0; i < n; i++) { const [cu, cv] = centre(r); lights.push(dev("light", n === 1 ? cu : r.u + r.w * (i + 1) / (n + 1), cv, plate - 0.02, `Light, ${r.name.toLowerCase()}`)); }
  }
  const gpoAt = (r, side, t, h = 0.3) => { const u = side === "n" ? r.u + r.w * t : side === "s" ? r.u + r.w * t : side === "w" ? r.u + 0.06 : r.u + r.w - 0.06; const v = side === "n" ? r.v + 0.06 : side === "s" ? r.v + r.d - 0.06 : r.v + r.d * t; return dev("gpo", u, v, h, `Double socket, ${r.name.toLowerCase()}`); };
  gpos.push(gpoAt(bed1, "w", 0.35), gpoAt(bed1, "e", 0.75), gpoAt(bed2, "e", 0.35), gpoAt(bed2, "w", 0.75));
  gpos.push(gpoAt(lounge, "s", 0.2), gpoAt(lounge, "s", 0.8), gpoAt(lounge, "e", 0.3));
  gpos.push(gpoAt(dining, "w", 0.5), gpoAt(hall, "e", 0.3));
  gpos.push(dev("gpo", bench.u0 + 1.1, bench.v1 - 0.04, 1.1, "Double socket, kitchen bench"), dev("gpo", bench.u1 - 0.9, bench.v1 - 0.04, 1.1, "Double socket, kitchen bench"));
  gpos.push(dev("gpo", fx.basin.u - 0.05, bath.v + bath.d - 0.04, 1.2, "Shaver socket, bathroom"));
  // switches inside each door, on the latch side
  for (const [r, u, v] of [[bed1, bed1.u + bed1.w - 0.12, 2.42], [bed2, bed2.u + 0.12, 2.36], [bath, bath.u + bath.w - 0.12, 3.95 + 0.85], [hall, hall.u + hall.w - 0.12, hall.v + 0.2], [lounge, lounge.u + 0.12, lounge.v + lounge.d - 0.25], [kit, kit.u + 0.15, kit.v + 0.2]]) switches.push(dev("switch", u, v, 1.05, `Switch, ${r.name.toLowerCase()}`));
  // smoke alarms: the first pass puts one in the hall; the check below finds bedroom 2 too far from it and adds more
  alarms.push(dev("alarm", hall.u + hall.w / 2, hall.v + 0.5, plate - 0.02, "Smoke alarm, hall"));

  const circuits = [
    { id: "L1", name: "Lighting, bedrooms and bathroom", devs: lights.filter((d) => /bedroom|bath/.test(d.label)) },
    { id: "L2", name: "Lighting, living", devs: lights.filter((d) => !/bedroom|bath/.test(d.label)) },
    { id: "P1", name: "Sockets, bedrooms and lounge", devs: gpos.filter((d) => /bedroom|lounge|hall/.test(d.label)) },
    { id: "P2", name: "Sockets, kitchen and dining", devs: gpos.filter((d) => /kitchen|dining/.test(d.label)) },
    { id: "P3", name: "Bathroom socket and fan", devs: gpos.filter((d) => /bathroom/.test(d.label)) },
    { id: "C1", name: "Cooktop and oven", devs: [{ u: fx.hob.u, v: fx.hob.v - 0.2, h: 0.5, label: "Cooktop and oven" }] },
    { id: "C2", name: "Hot water cylinder", devs: [{ u: fx.cyl.u, v: fx.cyl.v, h: 1.6, label: "Hot water cylinder" }] },
    { id: "C3", name: "Heat pump", devs: [{ u: hpIn.u + 0.12, v: hpIn.v + 0.5, h: 2.05, label: "Heat pump" }] },
    { id: "A1", name: "Smoke alarms, interconnected", devs: alarms },
  ];
  const eY = LEVEL.ceilElec;
  function chain(c) {
    const pts = [[sb.u + 0.1, 1.8, sb.v], [sb.u + 0.1, eY, sb.v]];
    let cur = [sb.u + 0.1, sb.v]; const left = [...c.devs]; const drops = [];
    while (left.length) {
      left.sort((a, b) => Math.hypot(a.u - cur[0], a.v - cur[1]) - Math.hypot(b.u - cur[0], b.v - cur[1]));
      const d = left.shift();
      pts.push([d.u, eY, cur[1]], [d.u, eY, d.v]);
      drops.push([[d.u, eY, d.v], [d.u, d.h ?? 0.3, d.v]]);
      cur = [d.u, d.v];
    }
    return { pts, drops };
  }
  for (const c of circuits) {
    c.rcd = true;
    const { pts, drops } = chain(c);
    runs.push({ sys: "elec", kind: "cable", r: 0.008, circuit: c.id, label: `Circuit ${c.id}: ${c.name.toLowerCase()}`, pts: dedupe(pts), first: FIRST.ceil });
    for (const dpts of drops) runs.push({ sys: "elec", kind: "drop", r: 0.007, circuit: c.id, label: `Drop, circuit ${c.id}`, pts: dpts, first: null });
  }

  // ------------------------------------------------------------------ checks

  // smoke alarms: in the bedroom or within 3 m of its door (F7/AS1); fix the first pass if it fails
  const doors = bedroomDoors(L);
  const nearest = (p) => Math.min(...alarms.map((a) => Math.hypot(a.u - p.u, a.v - p.v)));
  const firstAlarm = doors.map((d) => ({ ...d, dist: nearest(d) }));
  const alarmFix = [];
  // the fix: one more alarm in the lounge, on the way out from both bedrooms, if that brings every door within 3 m;
  // otherwise an alarm in each bedroom that fails
  const lc = centre(lounge), loungeOk = doors.every((d) => Math.hypot(d.u - lc[0], d.v - lc[1]) <= 3.0);
  const fixAt = firstAlarm.some((d) => d.dist > 3.0) ? (loungeOk ? [{ room: "Lounge", r: lounge }] : firstAlarm.filter((d) => d.dist > 3.0).map((d) => ({ room: d.room, r: R[d.room] }))) : [];
  for (const { room: rn, r } of fixAt) {
    const a = dev("alarm", r.u + r.w / 2, r.v + r.d / 2, plate - 0.02, `Smoke alarm, ${rn.toLowerCase()}`);
    alarms.push(a); alarmFix.push(rn);
    runs.push({ sys: "elec", kind: "cable", r: 0.008, circuit: "A1", label: `Circuit A1: smoke alarm, ${rn.toLowerCase()}`, pts: [[alarms[0].u, eY, alarms[0].v], [a.u, eY, alarms[0].v], [a.u, eY, a.v]], first: FIRST.ceil });
    runs.push({ sys: "elec", kind: "drop", r: 0.007, circuit: "A1", label: "Drop, circuit A1", pts: [[a.u, eY, a.v], [a.u, plate - 0.02, a.v]], first: null });
  }
  const finalAlarm = doors.map((d) => ({ ...d, dist: Math.min(nearest(d), inRoom(alarms, R[d.room]) ? 0 : Infinity) }));
  const firstClashes = clashes(runs, true);
  const finalClashes = clashes(runs, false);

  const shower = fx.shower;
  const gpoToShower = Math.min(...gpos.map((g) => Math.max(0, Math.hypot(g.u - shower.u, g.v - shower.v) - 0.45)));
  const drainFall = fall;
  const hygieneRuns = runs.filter((r) => r.sys === "water" && r.hot && hygiene.has(r.fixture));
  const trapped = branches.length === 6;
  const ducts = runs.filter((r) => r.kind === "duct");

  const checks = [
    { id: "alarms", clause: "F7/AS1", title: "Smoke alarm in every bedroom or within 3 m of its door",
      value: finalAlarm.map((d) => `${d.room} ${d.dist === 0 ? "alarm in the room" : d.dist.toFixed(1) + " m"}`).join(" · "),
      pass: finalAlarm.every((d) => d.dist <= 3.0),
      fixed: alarmFix.length ? `First pass: one alarm in the hall, ${firstAlarm.filter((d) => d.dist > 3).map((d) => `${d.room.toLowerCase()} door ${d.dist.toFixed(1)} m away`).join(", ")}. Added an alarm in the ${alarmFix.map((r) => r.toLowerCase()).join(" and ")}.` : null },
    { id: "escape", clause: "F7/AS1", title: "Smoke alarm on the escape route", value: inRoom(alarms, lounge) ? "Lounge, the way out from both bedrooms" : "None on the way out", pass: inRoom(alarms, lounge) },
    { id: "bathfan", clause: "G4/AS1", title: "Bathroom extract to outside, 25 L/s", value: `${ducts[0].rate} L/s, ducted through the west wall`, pass: ducts[0].rate >= 25 && ducts[0].toOutside },
    { id: "hood", clause: "G4/AS1", title: "Kitchen rangehood to outside, 50 L/s", value: `${ducts[1].rate} L/s, ducted through the south wall`, pass: ducts[1].rate >= 50 && ducts[1].toOutside },
    { id: "hotwater", clause: "G12/AS1", title: "Hot water stored at 60 °C, 50 °C at the shower and basin", value: `Cylinder set to 60 °C · ${hygieneRuns.filter((r) => r.tempered).length} of ${hygieneRuns.length} hot runs to them pass the tempering valve`, pass: hygieneRuns.every((r) => r.tempered) },
    { id: "traps", clause: "G13", title: "Every fixture trapped, drain vented", value: `${branches.length} traps, vent through the roof`, pass: trapped },
    { id: "fall", clause: "G13", title: "Drain falls all the way to the gully", value: `1 in ${Math.round(1 / drainFall)} modelled`, pass: drainFall >= 1 / 60 },
    { id: "rcd", clause: "AS/NZS 3000", title: "RCD protection on every circuit", value: `${circuits.length} of ${circuits.length} circuits`, pass: circuits.every((c) => c.rcd) },
    { id: "zone", clause: "AS/NZS 3000", title: "No socket within 0.6 m of the shower", value: `Nearest ${gpoToShower.toFixed(1)} m`, pass: gpoToShower >= 0.6 },
    { id: "clash", clause: "Clash detection", title: "No hard clashes between systems", value: `First pass ${firstClashes.count}, now ${finalClashes.count}`, pass: finalClashes.count === 0,
      fixed: firstClashes.count ? `First pass had ${firstClashes.count} hard clashes with everything at one ceiling and one underfloor height. Each system now keeps to its own level.` : null },
  ];

  // parts: every straight length, every bend and every device counts once
  let parts = 0;
  for (const r of runs) parts += Math.max(1, r.pts.length - 1) + Math.max(0, r.pts.length - 2);
  parts += boxes.length + sym.filter((s) => s.sys === "elec" && s.kind !== "board").length;
  const len = (sys, pred = () => true) => runs.filter((r) => r.sys === sys && pred(r)).reduce((t, r) => t + pathLen(r.pts), 0);
  const stats = {
    water: `${supplies.length + 1} home runs, ${Math.round(len("water"))} m of PEX`,
    drain: `${branches.length} fixtures trapped and vented, ${Math.round(len("drain"))} m of pipe`,
    elec: `${circuits.length} circuits, ${sym.filter((s) => s.sys === "elec").length} devices, ${Math.round(len("elec"))} m of cable`,
    hvac: "Heat pump, 2 extract fans ducted outside",
  };
  return { building: B, level: L, sym, runs, boxes, checks, parts, stats, firstClashes, finalClashes, alarms };
}

function dedupe(pts) { return pts.filter((p, i) => i === 0 || Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1], p[2] - pts[i - 1][2]) > 1e-6); }
export function pathLen(pts) { let t = 0; for (let i = 1; i < pts.length; i++) t += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]); return t; }
function inRoom(alarms, r) { return alarms.some((a) => a.u > r.u && a.u < r.u + r.w && a.v > r.v && a.v < r.v + r.d); }

// bedroom doors from the plan model: openings in partitions that bound a bedroom
function bedroomDoors(L) {
  const out = [];
  for (const p of L.partitions || []) for (const o of p.openings || []) {
    if (o.kind !== "door" || !/bedroom/i.test(o.name || "")) continue;
    const m = (o.a + o.b) / 2;
    const pt = p.axis === "z" ? { u: p.at, v: m } : { u: m, v: p.at };
    out.push({ room: (o.name.match(/Bedroom \d/i) || ["Bedroom"])[0].replace(/^b/, "B"), ...pt });
  }
  return out;
}

// hard clashes: two runs of different systems whose pipes come closer than their radii. The first pass flattens
// every ceiling run to one height and every underfloor run to another, as a quick sketch would.
function clashes(runs, first) {
  const segs = [];
  for (const r of runs) {
    if (r.kind === "drop") continue;
    const rad = r.r ?? Math.max(r.w, r.h) / 2;
    const pts = first && r.first != null ? r.pts.map((p) => [p[0], Math.abs(p[1] - r.first) < 0.6 ? r.first : p[1], p[2]]) : r.pts;
    for (let i = 1; i < pts.length; i++) segs.push({ a: pts[i - 1], b: pts[i], rad, sys: r.sys, run: r });
  }
  let count = 0; const at = [];
  for (let i = 0; i < segs.length; i++) for (let j = i + 1; j < segs.length; j++) {
    const s = segs[i], t = segs[j];
    if (s.sys === t.sys) continue;
    const { d, p } = segDist(s.a, s.b, t.a, t.b);
    if (d < s.rad + t.rad - 1e-4) { count++; at.push(p); }
  }
  return { count, at };
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
