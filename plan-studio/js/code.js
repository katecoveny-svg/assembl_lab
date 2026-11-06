// assembl Plan Studio · the NZ Building Code pre-check. Deterministic rules over the project model, re-run on every edit.
// ADVISORY ONLY. The Acceptable Solutions are one way to comply, not the only way; only a building consent authority grants
// consent. Each result says which document and edition its number comes from and whether that number was confirmed against the
// current MBIE publication (`verified`). Unconfirmed numbers never produce a "pass": they produce "needs info" with the measurement.
//
// status: "pass" | "fail" | "info" (needs information or a confirmed figure) | "out" (out of scope for this pre-check)
import { polyArea, roomClear, openingRooms, openingSpan, isDoor, isGlazed, wallFacing } from "./model.js";

export const DISCLAIMER = "Advisory pre-check against selected NZ Building Code Acceptable Solutions. Not a compliance determination: the Acceptable Solutions are one way to comply, and only a building consent authority grants consent. Confirm every figure against the current MBIE document before relying on it.";
export const RULESET = { id: "nzbc-precheck", version: "0.1.0", checked: "2026-11-06",
  note: "Figures gathered by desk research on 6 Nov 2026; building.govt.nz could not be opened directly, so every figure marked verified:false must be confirmed against the current MBIE PDF." };

const OCCUPIED = new Set(["assembly", "foyer", "meeting", "kitchen", "living", "bedroom", "stage"]);
const clearWidth = (o) => Math.max(0, o.w - (o.kind === "door-double" ? 120 : o.kind === "opening" ? 0 : 90));   // leaf width minus stops / leaf thickness (estimate)

function R(o) { return { verified: true, elements: [], ...o }; }

export function runChecks(P) {
  const out = [], use = P.meta.use || "CS", housing = use === "SH";
  const rooms = P.rooms, ops = P.openings;
  const outsideDoors = ops.filter((o) => isDoor(o) && openingRooms(P, o).some((r) => r === null));

  // ---------------------------------------------------------------- G4 ventilation: openable area ≥ 5% of floor area
  for (const r of rooms) {
    const area = polyArea(r.poly) / 1e6;
    const wins = ops.filter((o) => isGlazed(o) && openingRooms(P, o).includes(r));
    const openable = wins.reduce((s, o) => s + (o.w * o.h * (o.openable || 0)) / 1e6, 0);
    if (OCCUPIED.has(r.use)) {
      const need = 0.05 * area;
      out.push(R({ id: `g4-${r.id}`, clause: "G4", title: `Natural ventilation · ${r.name}`, doc: "G4/AS1", edition: "as researched Nov 2026",
        status: openable >= need ? "pass" : "fail", measured: `${openable.toFixed(2)} m² openable`, limit: `≥ ${need.toFixed(2)} m² (5% of ${area.toFixed(1)} m²)`,
        elements: [r.id, ...wins.map((w) => w.id)], why: "Openable window area of at least 5% of the floor area, or mechanical ventilation. Not for a unit with opening windows on one external wall only." }));
    } else if (r.use === "wc" || r.use === "wc-accessible" || r.use === "kitchen" || r.use === "bathroom" || r.use === "laundry") {
      if (!wins.length) out.push(R({ id: `g4x-${r.id}`, clause: "G4", title: `Extract ventilation · ${r.name}`, doc: "G4/AS1", status: "info", measured: "no window in the model",
        limit: "mechanical extract to outside", elements: [r.id], why: "No opening window, so the space needs a mechanical extract. Add the fan and its rate to the model to clear this." }));
    }
  }

  // ---------------------------------------------------------------- D1 accessible WC compartment (NZS 4121 via D1/AS1)
  for (const r of rooms.filter((x) => x.use === "wc-accessible")) {
    const c = roomClear(P, r), a = Math.max(c.x, c.y), b = Math.min(c.x, c.y), ok = a >= 1900 && b >= 1600;
    out.push(R({ id: `d1wc-${r.id}`, clause: "D1", title: `Accessible WC size · ${r.name}`, doc: "NZS 4121 (cited by D1/AS1)", edition: "NZS 4121:2001",
      status: ok ? "pass" : "fail", measured: `${a} × ${b} mm clear`, limit: "≥ 1900 × 1600 mm (2100 × 1900 with a shower)", elements: [r.id],
      why: "Clear internal size of an accessible WC compartment. Fixture positions (pan 450–460 mm from wall to centreline, grab rails, basin at least 300 mm from the pan) are not in the model yet." }));
  }
  if (["CS", "WL", "SR"].includes(use) && !rooms.some((x) => x.use === "wc-accessible") && rooms.some((x) => x.use === "wc"))
    out.push(R({ id: "d1wc-none", clause: "D1", title: "Accessible WC provided", doc: "D1/AS1 · NZS 4121", status: "fail", measured: "none in the model", limit: "at least one accessible WC where WCs are provided for the public", why: "Buildings with public WCs need an accessible one." }));

  // ---------------------------------------------------------------- C/AS2 means of escape: occupant load, exits, widths
  for (const r of rooms.filter((x) => x.use === "assembly" || (x.occupants || 0) > 50)) {
    if (!r.occupants) { out.push(R({ id: `cload-${r.id}`, clause: "C", title: `Occupant load · ${r.name}`, doc: "C/AS2", status: "info", measured: "not set", limit: "design occupant load", elements: [r.id], why: "Set the design occupant load (seating plan, or the C/AS2 occupant density for the use) so the escape checks can run." })); continue; }
    const exits = ops.filter((o) => isDoor(o) && openingRooms(P, o).includes(r) && o.kind !== "opening");
    const external = exits.filter((o) => openingRooms(P, o).includes(null));
    const viaFoyer = exits.filter((o) => openingRooms(P, o).some((x) => x && x.use === "foyer"));
    const routes = [...external, ...viaFoyer];
    out.push(R({ id: `cexits-${r.id}`, clause: "C", title: `Number of escape routes · ${r.name}`, doc: "C/AS2 (2nd edition)", edition: "2nd edition",
      status: r.occupants > 50 ? (routes.length >= 2 ? "pass" : "fail") : "pass", measured: `${routes.length} exits for ${r.occupants} people`,
      limit: r.occupants > 50 ? "≥ 2 (a dead end may serve no more than 50 people)" : "1 allowed (50 people or fewer)", elements: [r.id, ...routes.map((o) => o.id)],
      why: "More than 50 occupants need at least two escape routes; a dead end may serve no more than 50 people." }));
    const narrow = routes.filter((o) => clearWidth(o) < 850);
    const total = routes.reduce((s, o) => s + clearWidth(o), 0), need = Math.max(850, 7 * r.occupants);
    out.push(R({ id: `cwidth-${r.id}`, clause: "C", title: `Escape width · ${r.name}`, doc: "C/AS2", edition: "figure from an older edition", verified: false,
      status: "info", measured: `${total} mm total clear width${narrow.length ? `; ${narrow.map((o) => o.id).join(", ")} under 850 mm` : ""}`, limit: `7 mm per person = ${need} mm; 850 mm minimum per exit (older edition: confirm)`,
      elements: [r.id, ...routes.map((o) => o.id)], why: "The 7 mm per person and 850 mm minimum come from a 2013 commentary on an older C/AS edition, so this stays 'needs info' until the current C/AS2 figure is confirmed." }));
    out.push(R({ id: `ctravel-${r.id}`, clause: "C", title: `Travel distance · ${r.name}`, doc: "C/AS2", status: "info", verified: false, measured: "not measured", limit: "C/AS2 table for the risk group and sprinklers", elements: [r.id], why: "Travel distances depend on the risk group and on sprinklers; the table was not confirmed in research, so this needs the fire engineer." }));
  }

  // ---------------------------------------------------------------- D1 door widths on the accessible route (number unconfirmed)
  const routeDoors = ops.filter((o) => isDoor(o) && o.kind !== "opening");
  if (routeDoors.length && !housing) {
    const min = routeDoors.reduce((m, o) => (clearWidth(o) < clearWidth(m) ? o : m), routeDoors[0]);
    out.push(R({ id: "d1door", clause: "D1", title: "Door clear widths on the accessible route", doc: "D1/AS1 · NZS 4121", verified: false, status: "info",
      measured: `narrowest ${clearWidth(min)} mm (${min.id}${min.note ? ", " + min.note : ""})`, limit: "NZS 4121 clear opening (figure to confirm)", elements: [min.id],
      why: "The minimum clear opening was not confirmed in research, so the measurement is shown without a pass or fail." }));
  }

  // ---------------------------------------------------------------- G1 sanitary fixtures (ratios unconfirmed)
  const people = rooms.reduce((s, r) => s + (r.occupants || 0), 0), fx = rooms.reduce((acc, r) => { for (const [k, v] of Object.entries(r.fixtures || {})) acc[k] = (acc[k] || 0) + v; return acc; }, {});
  if (housing) {
    const has = (re) => rooms.some((r) => re.test(r.name) || re.test(r.use));
    out.push(R({ id: "g1", clause: "G1", title: "Household fixtures", doc: "G1/AS1", status: has(/wc/i) && has(/bath|shower|ensuite/i) && has(/kitchen/i) ? "pass" : "info",
      measured: ["WC", "bath or shower", "kitchen"].filter((k, i) => !has([/wc/i, /bath|shower|ensuite/i, /kitchen/i][i])).map((k) => `no ${k} identified`).join(", ") || "WC, bath or shower and kitchen identified",
      limit: "a WC, a basin, a bath or shower, a kitchen sink and laundry facilities", why: "Read from room names; a fixture plan confirms it." }));
  } else out.push(R({ id: "g1", clause: "G1", title: "Sanitary fixtures", doc: "G1/AS1", verified: false, status: "info", measured: `${fx.pan || 0} pans, ${fx.urinal || 0} urinals, ${fx.basin || 0} basins for ${people} people`,
    limit: "G1/AS1 ratios for the use (to confirm)", elements: rooms.filter((r) => r.fixtures).map((r) => r.id), why: "Fixture ratios for assembly occupancies were not confirmed in research." }));

  // ---------------------------------------------------------------- G7 natural light (housing) / H1 glazing (housing, 6th edition)
  if (housing) {
    for (const r of rooms.filter((x) => ["living", "bedroom"].includes(x.use))) {
      const area = polyArea(r.poly) / 1e6, glaz = ops.filter((o) => isGlazed(o) && openingRooms(P, o).includes(r)).reduce((s, o) => s + (o.w * o.h) / 1e6, 0);
      out.push(R({ id: `g7-${r.id}`, clause: "G7", title: `Natural light · ${r.name}`, doc: "G7/AS1", verified: false, status: "info", measured: `${glaz.toFixed(2)} m² glazing`, limit: `10% of ${area.toFixed(1)} m² = ${(area * 0.1).toFixed(2)} m² (figure to confirm)`, elements: [r.id] }));
    }
    const ext = P.walls.filter((w) => w.kind === "ext"), wallA = ext.reduce((s, w) => s + (Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]) * w.h) / 1e6, 0);
    const glA = ops.filter((o) => isGlazed(o) && ext.some((w) => w.id === o.wall)).reduce((s, o) => s + (o.w * o.h) / 1e6, 0), ratio = glA / wallA;
    out.push(R({ id: "h1-glazing", clause: "H1", title: "Glazing share of wall area", doc: "H1/AS1 6th edition", edition: "6th edition (27 Nov 2025; 5th edition accepted until about 26–27 Nov 2026)",
      status: ratio <= 0.4 ? "pass" : "fail", measured: `${(ratio * 100).toFixed(0)}% (${glA.toFixed(1)} of ${wallA.toFixed(1)} m²)`, limit: "≤ 40% of wall area", why: "Which H1 edition applies depends on the lodgement date." }));
  } else {
    out.push(R({ id: "g7", clause: "G7", title: "Natural light", doc: "G7/AS1", status: "out", measured: "—", limit: "—", why: "G7 applies to housing and some care and early-childhood spaces; check whether any space here falls under it." }));
    const ext = P.walls.filter((w) => w.kind === "ext"), byFace = {};
    for (const w of ext) { const f = wallFacing(P, w).face, wa = (Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]) * w.h) / 1e6; const g = ops.filter((o) => o.wall === w.id && isGlazed(o)).reduce((s, o) => s + (o.w * o.h) / 1e6, 0); byFace[f] = byFace[f] || [0, 0]; byFace[f][0] += g; byFace[f][1] += wa; }
    out.push(R({ id: "h1-ns", clause: "H1", title: "Energy efficiency (non-housing)", doc: "H1/AS2 · NZS 4243", verified: false, status: "info",
      measured: Object.entries(byFace).map(([f, [g, a]]) => `${f} ${(100 * g / a).toFixed(0)}%`).join(" · ") + " glazing by face", limit: "calculation or schedule method for the building's use", why: "Non-housing H1 needs a calculation; the glazing share by face is shown to inform it." }));
  }

  // ---------------------------------------------------------------- E2 scope; F4 barriers; B1 structure
  const ridge = P.roof?.ridgeH || Math.max(...P.walls.map((w) => w.h));
  out.push(R({ id: "e2-scope", clause: "E2", title: "Within E2/AS1 scope", doc: "E2/AS1", status: ridge <= 10000 && (P.meta.storeys || 1) <= 3 ? "pass" : "fail", measured: `${(ridge / 1000).toFixed(1)} m high, ${P.meta.storeys || 1} storey`, limit: "≤ 10 m and ≤ 3 storeys",
    why: "Inside the scope, the E2/AS1 risk matrix still has to be scored (wind zone, eaves, envelope complexity, decks); those inputs are not in the model yet." }));
  // F4: every deck or level edge with a fall of 1 m or more needs a barrier (1000 mm in housing, 1100 mm in other buildings)
  const need = housing ? 1000 : 1100, edges = [...(P.decks || []).map((d) => ({ id: d.id, name: d.name || d.id, fall: d.fall ?? (P.site?.floorAboveGround || 0), barrier: d.barrier || 0 })), ...(P.levels || []).filter((l) => l.fall).map((l) => ({ id: l.id, name: l.name, fall: l.fall, barrier: l.barrier || 0 }))];
  const high = edges.filter((e) => e.fall >= 1000);
  if (!high.length) out.push(R({ id: "f4", clause: "F4", title: "Barriers where a fall is 1 m or more", doc: "F4/AS1", status: "pass", measured: "no edge with a fall of 1 m or more in the model", limit: `barrier ${need} mm where the fall is 1 m or more`, why: "Add decks, mezzanines and stairs to the model and this check measures their edges." }));
  for (const e of high) out.push(R({ id: `f4-${e.id}`, clause: "F4", title: `Barrier height · ${e.name}`, doc: "F4/AS1", edition: "as researched Nov 2026",
    status: e.barrier >= need ? "pass" : "fail", measured: e.barrier ? `${e.barrier} mm barrier, ${e.fall} mm fall` : `no barrier, ${e.fall} mm fall`, limit: `≥ ${need} mm${housing ? " (900 mm on stairs)" : ""}; no opening a 100 mm sphere passes; no toeholds 150–760 mm`, elements: [e.id],
    why: "The barrier height is measured from the model; openings and climbability depend on the balustrade product, so confirm those on its drawing." }));
  for (const st of P.stairs || []) out.push(R({ id: `d1st-${st.id}`, clause: "D1", title: `Stair geometry · ${st.name || st.id}`, doc: "D1/AS1", verified: false, status: "info",
    measured: st.rise && st.going ? `rise ${st.rise} mm, going ${st.going} mm` : "riser and going not in the model", limit: "older edition: rise ≤ 190, going ≥ 280 (private stairs differ; confirm)", elements: [st.id],
    why: "Stair limits came from an older amendment in research, so this shows the measurement until the current D1/AS1 table is confirmed." }));
  out.push(R({ id: "b1", clause: "B1", title: "Structure", doc: "B1 · NZS 3604", status: "out", measured: "—", limit: "—", why: "Structural design (spans, bracing, foundations) is out of scope for this pre-check; an engineer or NZS 3604 designer confirms it." }));
  return out;
}

export function summarise(results) {
  const s = { pass: 0, fail: 0, info: 0, out: 0 };
  for (const r of results) s[r.status]++;
  return s;
}
