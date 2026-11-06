// node --test plan-studio/tests/*.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { demoProject, openingRooms, roomClear, snapshot, diffModels } from "../js/model.js";
import { runChecks, summarise } from "../js/code.js";
import { sheetSet, planSheet } from "../js/drawings.js";
import { toIFC, toDXF } from "../js/exports.js";
import { findScale, toReal, modelFromDrawing } from "../js/read.js";

test("demo: every door joins the rooms it should", () => {
  const P = demoProject(), name = (id) => openingRooms(P, P.openings.find((o) => o.id === id)).map((r) => r?.name ?? "outside").sort().join(" | ");
  assert.equal(name("D5"), "Foyer | Hall");
  assert.equal(name("D10"), "Accessible WC | Corridor");
  assert.equal(name("D1"), "Foyer | outside");
  assert.deepEqual(roomClear(P, P.rooms.find((r) => r.use === "wc-accessible")), { x: 2310, y: 2110, area: 5.28 });
});

test("code pre-check: measured fails, confirmed passes, unconfirmed figures never pass", () => {
  const R = runChecks(demoProject()), by = (id) => R.find((r) => r.id === id);
  assert.equal(by("g4-R1").status, "fail");                  // hall: 11.46 m² openable < 12 m²
  assert.equal(by("d1wc-R7").status, "pass");
  assert.equal(by("cexits-R1").status, "pass");
  for (const r of R.filter((x) => x.verified === false)) assert.notEqual(r.status, "pass", r.id + " passes on an unconfirmed figure");
  const s = summarise(R); assert.ok(s.pass > 0 && s.fail > 0 && s.info > 0 && s.out > 0);
});

test("code pre-check re-runs on an edit", () => {
  const P = demoProject(); P.openings.find((o) => o.id === "G1").openable = 0.12;
  assert.equal(runChecks(P).find((r) => r.id === "g4-R1").status, "pass");
});

test("drawings: four sheets, MBIE minimum title-block fields, revision clouds", () => {
  const P = demoProject(), set = sheetSet(P, runChecks(P));
  assert.deepEqual(set.map((s) => s.id), ["A101", "A201", "A301", "A901"]);
  for (const s of set) for (const field of ["PS-001-", "Tōtara Grove community hall", "12 Tōtara Grove", "Tōtara Grove Community Trust", "assembl Plan Studio demo", "Scale @ A3", "Date"]) assert.ok(s.svg.includes(field), `${s.id} lacks ${field}`);
  assert.ok(!planSheet(P).includes('stroke="#B0213A" stroke-width="0.35"/><polygon'), "no cloud before a revision");
  P.revisions.push({ rev: "A", date: "2026-11-06", desc: "Issued", model: snapshot(P) });
  P.openings.find((o) => o.id === "N1").w = 3000;
  P.revisions.push({ rev: "B", date: "2026-11-07", desc: diffModels(P.revisions[0].model, snapshot(P)).summary.join("; "), model: snapshot(P) });
  const svg = planSheet(P); assert.ok(svg.includes("A2.2,2.2 0 0 1"), "cloud drawn"); assert.ok(svg.includes("width 2400 → 3000 mm"));
});

test("exports: IFC4 and DXF", () => {
  const P = demoProject(), ifc = toIFC(P, new Date("2026-11-06T00:00:00Z"));
  assert.match(ifc, /FILE_SCHEMA\(\('IFC4'\)\)/);
  assert.equal((ifc.match(/=IFCWALL\(/g) || []).length, 12);
  assert.equal((ifc.match(/=IFCSPACE\(/g) || []).length, 9);
  assert.ok(ifc.includes("Pset_assemblEvidence"));
  const dxf = toDXF(P); assert.ok(dxf.includes("A-WALL") && dxf.trim().endsWith("EOF"));
});

test("reading a vector PDF: scale from the sheet, walls, rooms and openings measured", () => {
  const raw = JSON.parse(fs.readFileSync(new URL("./fixtures/demo-plan.raw.json", import.meta.url)));
  const sc = findScale(raw.items); assert.equal(sc.scale, 100);
  const P = modelFromDrawing(toReal(raw, sc.scale)), truth = demoProject();
  assert.equal(P.walls.length, 12);
  assert.deepEqual(P.walls.map((w) => w.t).sort((a, b) => a - b), truth.walls.map((w) => w.t).sort((a, b) => a - b));
  for (const w of truth.walls) assert.ok(P.walls.some((v) => [[v.a, v.b], [v.b, v.a]].some(([a, b]) => Math.hypot(a[0] - w.a[0], a[1] - w.a[1]) < 30 && Math.hypot(b[0] - w.b[0], b[1] - w.b[1]) < 30)), `wall ${w.id} not found`);
  assert.deepEqual(P.rooms.map((r) => r.name.toLowerCase()).sort(), truth.rooms.map((r) => r.name.toLowerCase()).sort());
  const doors = P.openings.filter((o) => o.kind.startsWith("door")).length; assert.ok(doors >= 11, `doors ${doors}`);   // the demo has 11 doors and one doorless opening
  assert.ok(P.openings.some((o) => o.kind === "glazing" && Math.abs(o.w - 14800) < 20));
  for (const e of [...P.walls, ...P.openings, ...P.rooms]) assert.ok(e.ev && e.ev.src && e.ev.conf > 0 && e.ev.note, "evidence on every element");
});
