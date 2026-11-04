// The generic vehicle set (assets/models/vehicles): the real GLBs against their contract, budgets, real-world dimensions and
// pivots, the rig controller, and the stock's mapping of each listing to the body of its real model. Run:
//   node --test cars/dealer-twin/tests/*.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import * as THREE from "../../../assets/vendor/three/three.module.min.js";
import { createVehicleRig, checkContract, paintForColour, REQUIRED_NODES, VEHICLE_CONTRACT } from "../../../assets/models/vehicles/vehicles-rig-controller.mjs";

const dir = new URL("../../../assets/models/vehicles/", import.meta.url);
const contract = JSON.parse(readFileSync(new URL("vehicles-rig-contract.json", dir)));
const stock = JSON.parse(readFileSync(new URL("../data/stock.json", import.meta.url)));
const BODIES = ["hatch", "sedan", "wagon", "suv", "ute", "van"];
const BRANDS = /toyota|mazda|kia|hyundai|suzuki|honda|nissan|mitsubishi|ford|tesla|byd|mg\b|aqua|hilux|ranger|hiace|rav4|corolla/i;

function glb(body) {
  const bytes = readFileSync(new URL(contract.vehicles[body].file, dir));
  assert.equal(bytes.readUInt32LE(0), 0x46546c67, "glTF magic");
  const json = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
  return { bytes, json };
}
// the node tree as three.js objects with each mesh's accessor bounds, so world-space bounds and pivots can be measured
function hierarchy(asset) {
  const nodes = asset.nodes.map((n) => {
    const o = n.mesh === undefined ? new THREE.Group() : new THREE.Mesh(new THREE.BufferGeometry(), asset.meshes[n.mesh].primitives.map((p) => { const m = new THREE.MeshStandardMaterial(); m.name = asset.materials[p.material].name; return m; }));
    o.name = n.name || "";
    if (n.translation) o.position.fromArray(n.translation); if (n.rotation) o.quaternion.fromArray(n.rotation); if (n.scale) o.scale.fromArray(n.scale);
    if (n.mesh !== undefined) {
      const box = new THREE.Box3();
      for (const p of asset.meshes[n.mesh].primitives) { const a = asset.accessors[p.attributes.POSITION]; box.union(new THREE.Box3(new THREE.Vector3(...a.min), new THREE.Vector3(...a.max))); }
      o.userData.box = box;
    }
    return o;
  });
  asset.nodes.forEach((n, i) => n.children?.forEach((j) => nodes[i].add(nodes[j])));
  const root = new THREE.Group(); asset.scenes[asset.scene || 0].nodes.forEach((i) => root.add(nodes[i])); root.updateMatrixWorld(true);
  return root;
}
const worldBox = (o) => o.userData.box.clone().applyMatrix4(o.matrixWorld);
const tris = (asset) => asset.meshes.reduce((s, m) => s + m.primitives.reduce((t, p) => t + (p.indices !== undefined ? asset.accessors[p.indices].count : asset.accessors[p.attributes.POSITION].count) / 3, 0), 0);

test("contract: six generic vehicles, metres, Y-up, paint colourways, budgets stated", () => {
  checkContract(contract);
  assert.equal(contract.contract, VEHICLE_CONTRACT);
  assert.deepEqual(Object.keys(contract.vehicles).sort(), [...BODIES].sort());
  assert.equal(contract.units, "metres");
  assert.deepEqual(contract.budget_per_vehicle, { tris: 40000, bytes: 1200000, textures: 0 });
  assert.ok(Object.keys(contract.paints).length >= 8);
  assert.throws(() => checkContract({ ...contract, contract: "assembl.vehicles.v0" }));
  assert.throws(() => checkContract(contract, "limo"));
});

for (const body of BODIES) test(`${body}: the real GLB is in budget, unbranded, untextured, clearcoated, and matches its contract`, () => {
  const { bytes, json } = glb(body), v = contract.vehicles[body];
  assert.equal(bytes.length, v.bytes);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), v.sha256);
  assert.ok(bytes.length <= 1_200_000, `${bytes.length} bytes`);
  const t = tris(json); assert.ok(t <= 40000, `${t} triangles`);
  assert.ok(!json.images && !json.textures, "no textures");
  assert.ok(!(json.extensionsUsed || []).some((e) => /draco|meshopt/i.test(e)), "no compression the page cannot decode");
  const paint = json.materials.find((m) => m.name === "PAINT");
  assert.ok(paint && paint.extensions && paint.extensions.KHR_materials_clearcoat, "PAINT has clearcoat");
  const names = json.nodes.map((n) => n.name);
  for (const n of REQUIRED_NODES) assert.equal(names.filter((x) => x === n).length, 1, n);
  for (const s of [...names, ...json.materials.map((m) => m.name), ...json.meshes.map((m) => m.name)]) assert.ok(!BRANDS.test(s), `brand-like name ${s}`);
});

for (const body of BODIES) test(`${body}: real-world size in metres, origin at ground centre, wheels where the contract says`, () => {
  const { json } = glb(body), v = contract.vehicles[body], D = v.dimensions_m, root = hierarchy(json);
  const b = worldBox(root.getObjectByName("BODY")), size = b.getSize(new THREE.Vector3());
  assert.ok(Math.abs(size.x - D.length) / D.length < .01, `length ${size.x}`);
  assert.ok(Math.abs(size.z - D.width) / D.width < .01, `width ${size.z}`);
  assert.ok(Math.abs(b.max.y - D.height) / D.height < .01, `roof height above the ground ${b.max.y}`);
  assert.ok(Math.abs((b.min.x + b.max.x) / 2) < .01 && Math.abs((b.min.z + b.max.z) / 2) < .01, "footprint centred on the origin");
  assert.ok(b.min.y > .1 && b.min.y < .5, `body clears the ground (${b.min.y})`);
  const p = (n) => root.getObjectByName(n).getWorldPosition(new THREE.Vector3());
  for (const [name, info] of Object.entries(v.nodes)) assert.ok(p(name).distanceTo(new THREE.Vector3(...info.pivot_gltf_m)) < 1e-4, name);
  assert.ok(p("VEHICLE_ROOT").length() < 1e-6, "turntable pivot at ground centre");
  assert.ok(Math.abs(p("STEER_FL").x - p("HUB_RL").x - D.wheelbase) < 1e-3, "wheelbase");
  assert.ok(Math.abs(p("STEER_FL").z - p("STEER_FR").z + D.track) < 1e-3, "track (left is -Z in glTF)");
  for (const w of ["STEER_FL", "STEER_FR", "HUB_RL", "HUB_RR"]) assert.ok(Math.abs(p(w).y - v.wheel_radius_m) < 1e-3, `${w} at wheel-radius height`);
  const tyre = worldBox(root.getObjectByName("WHEEL_MESH_FL")).getSize(new THREE.Vector3());
  assert.ok(Math.abs(tyre.y - D.tyre_diameter) < .01, `tyre diameter ${tyre.y} vs ${D.tyre_diameter}`);
  assert.ok(D.length > 3.9 && D.length < 5.4 && D.height > 1.4 && D.height < 2.05, "plausible road-vehicle size");
});

// the cutter walls keep their own materials once the window caps are dropped (a by-hand index shift on top of
// Mesh.materials.pop used to turn the headlamp pockets into SEAL and the ute's tub floor into HOUSING)
for (const body of BODIES) test(`${body}: BODY keeps its cut-opening materials: lamp housings are HOUSING, no build-time caps`, () => {
  const { json } = glb(body), node = json.nodes.find((n) => n.name === "BODY");
  const mats = json.meshes[node.mesh].primitives.map((p) => json.materials[p.material].name);
  for (const m of ["PAINT", "SEAL", "HOUSING", "TRIM_BLACK", "UNDER"]) assert.ok(mats.includes(m), `BODY has ${m} (has ${mats})`);
  assert.ok(!json.materials.some((m) => m.name === "CAP_OPEN"), "no CAP_OPEN material exported");
  assert.equal(mats.includes("TRAY"), body === "ute", "only the ute's tub uses TRAY");
});

test("tyre and proportion sanity: a small hatch is ~4.05 m, a ute is the longest, a van the tallest", () => {
  const d = (b) => contract.vehicles[b].dimensions_m;
  assert.ok(Math.abs(d("hatch").length - 4.05) < .02);
  assert.equal(BODIES.reduce((a, b) => (d(b).length > d(a).length ? b : a)), "ute");
  assert.equal(BODIES.reduce((a, b) => (d(b).height > d(a).height ? b : a)), "van");
  assert.ok(d("suv").tyre_diameter > d("hatch").tyre_diameter && d("ute").tyre_diameter > d("suv").tyre_diameter);
});

test("rig controller: spins wheels, steers within limits, repaints one material, resets, refuses a bad model", () => {
  const root = hierarchy(glb("hatch").json), rig = createVehicleRig(root, contract);
  rig.setWheelRotation(1.5);
  for (const w of ["WHEEL_FL", "WHEEL_FR", "WHEEL_RL", "WHEEL_RR"]) assert.equal(rig.nodes[w].rotation.z, -1.5);
  rig.setSteer(2); assert.equal(rig.nodes.STEER_FL.rotation.y, .6); assert.equal(rig.nodes.STEER_FR.rotation.y, .6);
  const before = rig.nodes.HUB_RL.position.clone();
  rig.setPaint("red-mica");
  const hex = rig.paintMaterials[0].color.getHexString(THREE.SRGBColorSpace);
  assert.equal(hex, contract.paints["red-mica"].hex.slice(1).toLowerCase());
  assert.ok(rig.paintMaterials.length >= 1 && rig.paintMaterials.every((m) => m.name === "PAINT"));
  assert.throws(() => rig.setPaint("canary"));
  rig.setYaw(1); rig.reset();
  assert.equal(rig.nodes.VEHICLE_ROOT.rotation.y, 0); assert.equal(rig.nodes.WHEEL_FL.rotation.z, -0); assert.equal(rig.nodes.STEER_FL.rotation.y, 0);
  assert.ok(rig.nodes.HUB_RL.position.equals(before), "repaint and pose never move the rig");
  root.getObjectByName("WHEEL_RR").name = "x";
  assert.throws(() => createVehicleRig(root, contract), /WHEEL_RR/);
  assert.throws(() => createVehicleRig(hierarchy(glb("van").json), { ...contract, contract: "nope" }));
});

test("every listing keeps its drawing; the generic 3D model of its real body, in its own colour, is opt-in only", () => {
  for (const c of stock.cars) {
    assert.equal(c.img.kind, "drawing", c.id);
    assert.equal(c.img.card, `img/body/${c.body}.svg`, c.id);
    assert.ok(!/img\/stock\//.test(JSON.stringify(c)), `${c.id} references no rendered still`);
    assert.deepEqual(c.model3d, { body: c.body, paint: paintForColour(contract, c.colour) }, c.id);
    assert.equal(contract.paints[c.model3d.paint].label.toLowerCase(), c.colour.toLowerCase(), c.id);
    assert.ok(contract.vehicles[c.model3d.body], c.id);
  }
});

test("the spotlight loads a GLB only from the 'View in 3D' button, labels it generic, and keeps the drawing as the fallback", () => {
  const js = readFileSync(new URL("../js/stock.js", import.meta.url), "utf8"), page = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.match(js, />View in 3D</); assert.match(js, /Back to drawing/); assert.match(js, /Reset view/);
  assert.match(js, /Generic \$\{WORD\[sel\.body\] \|\| sel\.body\} model · not the actual vehicle/);
  assert.equal((js.match(/import\("\.\/vehicle-stage\.js"\)/g) || []).length, 1, "one lazy import of the 3D stage");
  const go = js.slice(js.indexOf("function pick("), js.indexOf("function show3d("));
  assert.ok(!/go3d\(/.test(go), "opening a listing never starts the 3D load");
  assert.match(js, /btn3\.onclick = \(\) => \{[^\n]*go3d\(sel\)/, "only the button starts it");
  assert.match(js, /WebGL, which is off/); assert.match(js, /data saver/); assert.match(js, /didn't load, so the drawing stays/);
  assert.ok(!/img\/stock\//.test(page) && !/img\/stock\//.test(js), "no rendered stills on the page");
  assert.ok(!existsSync(new URL("../img/stock/", import.meta.url)), "rendered stills are not committed");
});
