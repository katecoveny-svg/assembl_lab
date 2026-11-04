// The /cars/ hero: the Blender-built Golf GLB (assets/models/vehicles/golf.glb, source/build_golf.py) and the hl-014 record it
// stands for. Run: node --test cars/tests/*.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { REQUIRED_NODES } from "../../assets/models/vehicles/vehicles-rig-controller.mjs";

const dir = new URL("../../assets/models/vehicles/", import.meta.url);
const report = JSON.parse(readFileSync(new URL("golf-build.json", dir)));
const bytes = readFileSync(new URL("golf.glb", dir));
const json = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
const feed = JSON.parse(readFileSync(new URL("../feed.json", import.meta.url)));
const car = feed.cars.find((c) => c.id === "hl-014");

test("golf.glb: in budget, untextured, the rig nodes, one clearcoated PAINT, matches its build report", () => {
  assert.equal(bytes.readUInt32LE(0), 0x46546c67, "glTF magic");
  assert.equal(bytes.length, report.bytes); assert.equal(createHash("sha256").update(bytes).digest("hex"), report.sha256);
  assert.ok(bytes.length <= 2_000_000, `${bytes.length} bytes`);
  const tris = json.meshes.reduce((s, m) => s + m.primitives.reduce((t, p) => t + (p.indices !== undefined ? json.accessors[p.indices].count : json.accessors[p.attributes.POSITION].count) / 3, 0), 0);
  assert.ok(tris <= 60000, `${tris} triangles`);
  assert.ok(!json.images && !json.textures, "no textures");
  assert.ok(!(json.extensionsUsed || []).some((e) => /draco|meshopt/i.test(e)), "no compression the page cannot decode");
  const names = json.nodes.map((n) => n.name);
  for (const n of REQUIRED_NODES) assert.equal(names.filter((x) => x === n).length, 1, n);
  const paints = json.materials.filter((m) => m.name === "PAINT");
  assert.equal(paints.length, 1); assert.ok(paints[0].extensions && paints[0].extensions.KHR_materials_clearcoat, "PAINT has clearcoat");
  // no maker's names or marks anywhere in the file's names (the model carries no badges or lettering either)
  for (const s of [...names, ...json.materials.map((m) => m.name), ...json.meshes.map((m) => m.name)]) assert.ok(!/volkswagen|\bvw\b|golf|logo|badge/i.test(s), `name ${s}`);
});

test("golf.glb: real dimensions (4.284 × 1.789 × 1.456 m, 2.636 m wheelbase, 225/45R17)", () => {
  const D = report.dimensions_m, M = report.measured_body;
  assert.deepEqual([D.length, D.width, D.height, D.wheelbase, D.tyre], [4.284, 1.789, 1.456, 2.636, "225/45R17"]);
  for (const k of ["length", "width", "height"]) assert.ok(Math.abs(M[k] - D[k]) / D[k] < 0.01, `${k} ${M[k]}`);
  const p = (n) => report.nodes[n].pivot_gltf_m;
  assert.ok(Math.abs(p("STEER_FL")[0] - p("HUB_RL")[0] - D.wheelbase) < 1e-3, "wheelbase");
  assert.ok(Math.abs(D.length / 2 - p("STEER_FL")[0] - D.front_overhang) < 1e-3, "front overhang");
});

test("hl-014 is the Golf on the stage, the same in the feed, the MCP stock and the page's JSON-LD", async () => {
  assert.equal(car.title, "2021 Volkswagen Golf Life 1.4 TSI"); assert.equal(car.body, "hatch"); assert.equal(car.fuel, "petrol"); assert.equal(car.featured, true);
  assert.equal(car.render.glb, "/assets/models/vehicles/golf.glb"); assert.ok(existsSync(new URL("../.." + car.render.glb, import.meta.url)));
  assert.equal(car.render.kind, "hatch", "the drawing and the maquette fallback use the hatch");
  assert.equal(car.economy.truth, "Estimate"); assert.match(car.economy.basis, /Golf/);
  assert.equal(car.imported, false); assert.equal(car.cin["import.countryLastRegistered"].value, null); assert.equal(car.cin["import.countryLastRegistered"].note, "Not applicable: NZ-new");
  assert.ok(Object.values(car.cin).every((f) => f.truth === "Simulated"));
  const stock = (await import("../../api/_cars/stock.js")).default;
  assert.deepEqual(stock, feed, "api/_cars/stock.js is the feed");
  const { toJsonLd } = await import("../tools.js");
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const ld = html.match(/<script type="application\/ld\+json" id="ld-hl-014">(.*?)<\/script>/)[1];
  assert.equal(ld, JSON.stringify(toJsonLd(car)));
  assert.match(html, /<span id="cap-title">2021 Volkswagen Golf Life 1\.4 TSI<\/span>/);
  assert.ok(!/RAV4 Hybrid GX AWD/.test(html.replace(/<script type="application\/ld\+json"[^>]*>.*?<\/script>/g, "")), "no RAV4 left in the page copy");
});
