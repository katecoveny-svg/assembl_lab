// The authored café venue (assets/models/cafe) against its contract, the page plan and the business model.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as THREE from '../../assets/vendor/three/three.module.min.js';
import { createCafeRig, visualStateFromModel, REQUIRED_NODES, CONTRACT, CAB_ITEMS } from '../../assets/models/cafe/cafe-rig-controller.mjs';
import { loadCafe, snapshot, PAGE } from './cafe-harness.mjs';

const dir = new URL('../../assets/models/cafe/', import.meta.url);
const contract = JSON.parse(readFileSync(new URL('cafe-rig-contract.json', dir), 'utf8'));
const bytes = readFileSync(new URL('cafe-venue.glb', dir));
const asset = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
const html = readFileSync(PAGE, 'utf8');
const K = loadCafe();

// A three.js hierarchy shaped like GLTFLoader's: one Mesh per primitive, materials shared per glTF material.
function hierarchy() {
  const mats = (asset.materials || []).map(m => { const x = new THREE.MeshStandardMaterial(); x.name = m.name; return x; });
  const nodes = asset.nodes.map(n => {
    let o;
    if (n.mesh === undefined) o = new THREE.Group();
    else { const prims = asset.meshes[n.mesh].primitives; const ms = prims.map(p => new THREE.Mesh(new THREE.BufferGeometry(), mats[p.material ?? 0]));
      if (ms.length === 1) o = ms[0]; else { o = new THREE.Group(); ms.forEach(m => o.add(m)); } }
    o.name = n.name || ''; o.userData = { ...n.extras };
    if (n.translation) o.position.fromArray(n.translation); if (n.rotation) o.quaternion.fromArray(n.rotation); if (n.scale) o.scale.fromArray(n.scale);
    return o; });
  asset.nodes.forEach((n, i) => n.children?.forEach(j => nodes[i].add(nodes[j])));
  const root = new THREE.Group(); asset.scenes[asset.scene || 0].nodes.forEach(i => root.add(nodes[i])); root.updateMatrixWorld(true); return root;
}
const wp = o => o.getWorldPosition(new THREE.Vector3());
const close = (a, b, eps = 1e-3) => a.length === b.length && a.every((x, i) => Math.abs(x - b[i]) < eps);

test('GLB matches its contract: id, every required node, measured pivots, bytes and hash', () => {
  assert.equal(contract.contract, CONTRACT);
  assert.equal(contract.contract, 'assembl.cafe.v1');
  assert.deepEqual(contract.required_nodes, REQUIRED_NODES);
  const root = hierarchy();
  for (const n of REQUIRED_NODES) assert.ok(root.getObjectByName(n), n);
  for (const [n, p] of Object.entries(contract.tables)) assert.ok(close(wp(root.getObjectByName(n)).toArray(), p), n);
  for (const [n, p] of Object.entries(contract.controls.umbrellas.pivots_gltf_m)) assert.ok(close(wp(root.getObjectByName(n)).toArray(), p), n);
  assert.ok(close(wp(root.getObjectByName('ESPRESSO_MAIN_PORTAFILTER_L')).toArray(), contract.controls.espresso.pivots_gltf_m.L));
  assert.ok(close(wp(root.getObjectByName('BIN_FOOD_LID')).toArray(), contract.controls.bin.pivots_gltf_m.lid_hinge));
  assert.equal(bytes.length, contract.actual.glb_bytes);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), contract.actual.glb_sha256);
});

test('budget: at most 8 MB, 150k rendered triangles, 26 materials, 16 PBR textures, no compression extensions', () => {
  const b = contract.budget, a = contract.actual;
  assert.ok(bytes.length <= b.glb_bytes_max, `${bytes.length} bytes`);
  assert.ok(a.triangles_rendered <= b.triangles_max, `${a.triangles_rendered} tris`);
  assert.ok((asset.materials || []).length <= b.materials_max);
  assert.ok((asset.textures || []).length > 0 && asset.textures.length <= b.textures_max);
  assert.ok(asset.materials.some(m => m.normalTexture));
  for (const mesh of asset.meshes) for (const p of mesh.primitives) {
    const m = asset.materials[p.material];
    if (m.normalTexture || m.pbrMetallicRoughness?.baseColorTexture) assert.ok(p.attributes.TEXCOORD_0 !== undefined, 'textured primitives need UVs');
  }
  assert.ok(!(asset.extensionsUsed || []).some(e => /draco|meshopt/i.test(e)), 'the twin stage loader has no Draco or meshopt decoder');
  assert.match(asset.asset.generator, /Blender|glTF-Transform/);
});

test('authored in the page plan: tables, queue spots and stations sit where the simulation puts people', () => {
  const root = hierarchy();
  const TPOS = JSON.parse(html.match(/const TPOS = (\[\[.*?\]\]);/)[1]);
  TPOS.forEach(([x, z], i) => { const p = wp(root.getObjectByName(`TABLE_${String(i).padStart(2, '0')}`)); assert.ok(Math.abs(p.x - x) < 1e-4 && Math.abs(p.z - z) < 1e-4, `table ${i}`); });
  const QPATH = JSON.parse(html.match(/const QPATH = (\[\[.*?\]\]);/)[1]);
  for (let i = 0; i < 6; i++) { const p = wp(root.getObjectByName(`QUEUE_SPOT_0${i}`)); assert.ok(Math.abs(p.x - QPATH[i][0]) < 1e-4 && Math.abs(p.z - QPATH[i][1]) < 1e-4, `spot ${i}`); }
  // floor level FY = 0.15: inside tables stand on it, footpath tables on the path (0.11)
  assert.ok(Math.abs(wp(root.getObjectByName('TABLE_05')).y - 0.15) < 1e-4); assert.ok(Math.abs(wp(root.getObjectByName('TABLE_12')).y - 0.11) < 1e-4);
  // the cabinet's portion slots are the maquette's instanced-food slots (x 4.7 + j*0.42 + (k%2)*0.17)
  CAB_ITEMS.forEach((k, j) => [0, 1, 5].forEach(s => { const p = wp(root.getObjectByName(`CAB_${k.toUpperCase()}_${s}`)); assert.ok(Math.abs(p.x - (4.7 + j * 0.42 + (s % 2) * 0.17)) < 1e-4, `${k} ${s}`); }));
  // every authored part names a group that the page makes pickable
  const groups = new Set([...html.matchAll(/part\("(\w+)"\)/g)].map(m => m[1]));
  root.traverse(o => { const p = o.userData.twin_part; if (p && p !== 'shell') assert.ok(groups.has(p), p); });
});

test('rig: each state lands on its node, repeated calls do not drift, and bad input cannot throw', () => {
  const root = hierarchy(), pfL0 = root.getObjectByName('ESPRESSO_MAIN_PORTAFILTER_L').rotation.y, rig = createCafeRig(root, THREE), n = rig.nodes;
  assert.equal(n.ESPRESSO_MAIN_PORTAFILTER_L.rotation.y, pfL0 + 0.7, 'idle on load: swung out');
  for (let i = 0; i < 50; i++) rig.setVisualState({ mode: 'cafe', queue: 3, drinksQueued: 4, binKg: 30, station: true, umbrellas: [1, 0, 0.5, 1], cabinet: { scone: 2, muffin: 8 }, specials: { brownie: true }, kitchenLoad: 0.5, platesAtPass: 2, trading: true });
  const spot = i => n[`QUEUE_SPOT_0${i}`].material.name;
  assert.equal(spot(0), 'cafe_blush'); assert.equal(spot(2), 'cafe_blush'); assert.notEqual(spot(3), 'cafe_blush');
  assert.equal(n.ESPRESSO_MAIN_PORTAFILTER_L.rotation.y, pfL0);
  assert.equal(n.STATION_2.visible, true); assert.equal(n.BAR.visible, false); assert.equal(n.TABLE_04_CANDLE.visible, false);
  assert.ok(Math.abs(n.BIN_FOOD_FILL.scale.y - 0.9) < 1e-9); assert.equal(n.BIN_FOOD_LID.rotation.x, -0.5);
  assert.ok(Math.abs(n.UMBRELLA_10_CANOPY.scale.x - 1) < 1e-9 && Math.abs(n.UMBRELLA_11_CANOPY.scale.x - 0.18) < 1e-9 && Math.abs(n.UMBRELLA_11_CANOPY.scale.y - 2) < 1e-9);
  assert.equal(n.CAB_SCONE_1.visible, true); assert.equal(n.CAB_SCONE_2.visible, false); assert.equal(n.CAB_MUFFIN_7.visible, true); assert.equal(n.CAB_SALAD_0.visible, false);
  assert.equal(n.CAB_BROWNIE_SPECIAL.visible, true); assert.equal(n.CAB_SCONE_SPECIAL.visible, false);
  assert.equal(n.RANGE_FLAME_L.visible, true); assert.ok(rig.mats.heat.emissiveIntensity > 1);
  rig.setVisualState({ mode: 'dinner', station: true, drinksQueued: 0, binKg: 1 });
  assert.equal(n.STATION_2.visible, false, 'the second station is a café lever'); assert.equal(n.BAR.visible, true); assert.equal(n.HOST_STAND.visible, true); assert.equal(n.TABLE_04_CANDLE.visible, true);
  assert.equal(n.CAB_SCONE_0.visible, false); assert.equal(n.ESPRESSO_MAIN_CUP_STACK.visible, false);
  assert.equal(n.ESPRESSO_MAIN_PORTAFILTER_L.rotation.y, pfL0 + 0.7); assert.equal(n.BIN_FOOD_LID.rotation.x, 0);
  assert.doesNotThrow(() => rig.setVisualState({ queue: NaN, binKg: Infinity, umbrellas: 'x', cabinet: null, lamps: -4 }));
  assert.doesNotThrow(() => rig.setVisualState());
  // shared GLB materials are untouched: only the cloned state materials change
  const white = []; root.traverse(o => { if (o.isMesh && o.material.name === 'cafe_white' && !/QUEUE_SPOT/.test(o.name)) white.push(o.material); });
  assert.ok(white.every(m => m.emissiveIntensity === 1 && m.emissive.getHex() === 0));
});

test('the rig refuses a GLB with missing nodes', () => {
  const root = hierarchy(); const pf = root.getObjectByName('ESPRESSO_MAIN_PORTAFILTER_L'); pf.parent.remove(pf);
  assert.throws(() => createCafeRig(root, THREE), /ESPRESSO_MAIN_PORTAFILTER_L/);
});

test('visualStateFromModel only reads the model, and shows what the maquette shows', () => {
  for (const [S, dow] of [[{ ...K.BASE }, 5], [{ ...K.BASE, ...K.PROPOSED, deposits: false }, 5], [{ ...K.BASE, mode: 'dinner' }, 4]]) {
    const d = K.newDay(S, dow), M = K.MODES[S.mode], S0 = JSON.stringify(S);
    while (d.t < M.end) {
      K.step(S, d);
      if (d.t % 7) continue;
      const before = JSON.stringify(snapshot(K, S, d)) + JSON.stringify(d.stock) + JSON.stringify(d.special) + d.parties.length + d.next;
      const v = visualStateFromModel(K, d, S, d.t, { lamps: 0.3 });
      assert.equal(JSON.stringify(snapshot(K, S, d)) + JSON.stringify(d.stock) + JSON.stringify(d.special) + d.parties.length + d.next, before);
      assert.equal(JSON.stringify(S), S0);
      const st = K.dayStats(S, d);
      assert.equal(v.platesAtPass, st.atPass);
      assert.equal(v.queue, S.mode === 'cafe' ? d.counterQ.length : 0);
      assert.equal(v.drinksQueued, st.drinksQ);
      for (const k of CAB_ITEMS) assert.equal(v.cabinet[k], S.mode === 'cafe' ? Math.min(8, Math.ceil(Math.max(0, d.stock[k] || 0) / 4)) : 0);
    }
  }
});

test('stage v2 is additive: v1 untouched, the café alone opts in, the other eight twins stay on v1', () => {
  const v2 = readFileSync(new URL('../../assets/twin/2/stage.js', import.meta.url), 'utf8');
  assert.match(v2, /export \* from '\.\.\/1\/stage\.js'/);
  assert.match(v2, /spec\.contract !== contract/);
  assert.ok(html.includes('from "/assets/twin/2/stage.js"') && !html.includes('from "/assets/twin/1/stage.js"'));
  for (const t of ['dairy', 'home', 'store', 'ed', 'office', 'tourism', 'stay', 'retail']) {
    const h = readFileSync(new URL(`../../${t}/index.html`, import.meta.url), 'utf8');
    assert.ok(h.includes('/assets/twin/1/stage.js') && !h.includes('/assets/twin/2/'), t);
  }
  // the maquette is still built in full and kept as the fallback
  assert.ok(html.includes('const MAQ = []') && html.includes('tw.setGraphics("maquette")'));
});
