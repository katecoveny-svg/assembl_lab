// Writes cafe-rig-contract.json from the built GLB (run after build_cafe.py):
//   node assets/models/cafe/source/write_contract.mjs
// Pivots and budget actuals are measured from the GLB itself, so the contract cannot drift from the asset.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as THREE from '../../../vendor/three/three.module.min.js';
import { CONTRACT, REQUIRED_NODES, CAB_ITEMS, OUT_TABLES } from '../cafe-rig-controller.mjs';

const dir = new URL('../', import.meta.url);
const bytes = readFileSync(new URL('cafe-venue.glb', dir));
const json = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());

export function hierarchy(asset) {
  const nodes = asset.nodes.map(n => { const o = new THREE.Group(); o.name = n.name || ''; o.userData = { ...n.extras, mesh: n.mesh };
    if (n.translation) o.position.fromArray(n.translation); if (n.rotation) o.quaternion.fromArray(n.rotation); if (n.scale) o.scale.fromArray(n.scale); return o; });
  asset.nodes.forEach((n, i) => n.children?.forEach(j => nodes[i].add(nodes[j])));
  const root = new THREE.Group(); asset.scenes[asset.scene || 0].nodes.forEach(i => root.add(nodes[i])); root.updateMatrixWorld(true); return root;
}

// rendered triangles: every node that references a mesh counts that mesh's triangles once
const meshTris = json.meshes.map(m => m.primitives.reduce((a, p) => a + (p.indices != null ? json.accessors[p.indices].count : json.accessors[p.attributes.POSITION].count) / 3, 0));
const tris = json.nodes.reduce((a, n) => a + (n.mesh != null ? meshTris[n.mesh] : 0), 0);
const uniqueTris = meshTris.reduce((a, b) => a + b, 0);
const root = hierarchy(json);
const r4 = v => v.toArray().map(x => Math.round(x * 1e4) / 1e4);
const pivot = n => { const o = root.getObjectByName(n); if (!o) throw new Error('missing ' + n); return r4(o.getWorldPosition(new THREE.Vector3())); };
const P = n => String(n).padStart(2, '0');

const contract = {
  contract: CONTRACT,
  asset: 'cafe-venue.glb',
  route: '/cafe/',
  stage: '/assets/twin/2/stage.js (v2 = v1 + loadTwinAsset); the other stage twins stay on v1',
  units: 'metres',
  coordinates: {
    authoring: 'Blender +X right, +Y away from the street, +Z up',
    gltf: 'glTF/three.js +X right, +Y up, +Z towards the street',
    map: '(x, y, z) -> (x, z, -y)',
    plan: 'Identical to the page plan in cafe/index.html createCafeScene (FY = 0.15 m finished floor). The GLB is added at identity: no scale, no offset.',
  },
  state_owner: 'The CAFE model in cafe/index.html owns every queue, order, ticket, plate, table, stock level, special, roster and number. The GLB has no state, timer or logic. visualStateFromModel() only reads the model; setVisualState() only sets visibility, pivots, one scale and emissive levels.',
  required_nodes: REQUIRED_NODES,
  part_groups: 'Node extras.twin_part names the page pickable group (G[...]) each authored part joins: counter, coffee, cabinet, app, door, kitchen, pass, office, board, bin, tables, out, footpath. Nodes without one (walls) are not pickable but still block picks.',
  controls: {
    mode: { nodes: ['ESPRESSO_MAIN_CUP_STACK', 'BAR', 'HOST_STAND', 'TABLE_xx_CANDLE'], source: 'S.mode', rule: 'café: cup stack; dinner: bar shelves and taps, host stand, candles' },
    station: { node: 'STATION_2', source: 'S.station (Proposed lever "Second grinder and station")', rule: 'visible in café mode while the lever is on; it is a proposal, not equipment the venue has' },
    queue: { nodes: [0, 1, 2, 3, 4, 5].map(i => 'QUEUE_SPOT_' + P(i)), source: 'd.counterQ.length', rule: 'spot i shows the occupied (blush) material while i < queue length; people themselves are the page instanced figures', pivots_gltf_m: Object.fromEntries([0, 1, 2, 3, 4, 5].map(i => ['QUEUE_SPOT_' + P(i), pivot('QUEUE_SPOT_' + P(i))])) },
    espresso: { nodes: ['ESPRESSO_MAIN_PORTAFILTER_L', 'ESPRESSO_MAIN_PORTAFILTER_R'], axis_gltf: 'local +Y', source: 'd.espQ.length > 0', rule: 'angle 0 (locked in) while coffees are queued; L +0.7 rad, R -0.7 rad (swung out) when idle', pivots_gltf_m: { L: pivot('ESPRESSO_MAIN_PORTAFILTER_L'), R: pivot('ESPRESSO_MAIN_PORTAFILTER_R') } },
    kitchen: { nodes: ['RANGE_FLAME_L', 'RANGE_FLAME_R'], source: 'min(1, d.kitQ.length / 6)', rule: 'visible when load > 0; emissive 0.6 + 0.8 x load (blue gas flame)' },
    pass: { nodes: ['PASS_LAMP_BULB_1', 'PASS_LAMP_BULB_2', 'PASS_LAMP_BULB_3'], source: 'plates at the pass: d.pass with out < 0 and not app (-2)', rule: 'emissive 1.4 while plates wait; 0.25 during trading hours; 0 closed' },
    app: { node: 'APP_TABLET_SCREEN', source: 'an app order placed in the last 1.5 simulated minutes', rule: 'emissive 1.2, else 0.15' },
    bin: { nodes: ['BIN_FOOD_FILL', 'BIN_FOOD_LID'], source: 'd.binKg', rule: 'fill scale Y = clamp(binKg / 28, 0.02, 1) x 0.9 about its base; lid -0.5 rad about local X (hinge) above 22 kg', pivots_gltf_m: { fill: pivot('BIN_FOOD_FILL'), lid_hinge: pivot('BIN_FOOD_LID') } },
    umbrellas: { nodes: OUT_TABLES.map(i => `UMBRELLA_${P(i)}_CANOPY`), source: 'K.outdoorOK(d.wx, t, mode) during trading hours, smoothed by the page (instant under reduced motion)', rule: 'u in 0..1: radial scale 0.18 + 0.82u, axial 2 - u, about the apex', pivots_gltf_m: Object.fromEntries(OUT_TABLES.map(i => [`UMBRELLA_${P(i)}_CANOPY`, pivot(`UMBRELLA_${P(i)}_CANOPY`)])) },
    lamps: { nodes: [0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => `PENDANT_${i}_BULB`), source: 'page lamp level (dark and open), the same value that drives the maquette lights', rule: 'emissive 1.6 x level' },
    street_view: { node: 'AWNING', rule: 'visible only in the street view (as the maquette)' },
    cabinet: { nodes: CAB_ITEMS.map(k => `CAB_${k.toUpperCase()}_0..7`), source: 'd.stock[item]', rule: 'portion k visible while k < min(8, ceil(stock / 4)) (the maquette rule); CAB_ITEM_SPECIAL visible while d.special[item]' },
    boards: { nodes: ['MENU_BOARD_FACE', 'ROSTER_BOARD_FACE'], rule: 'UV 0..1 faces; the page draws both live (menu: items on the menu, current price, sold out, on special; roster: rostered vs needed). glTF UVs: canvas textures need flipY = false.' },
  },
  tables: Object.fromEntries(Array.from({ length: 14 }, (_, i) => [`TABLE_${P(i)}`, pivot(`TABLE_${P(i)}`)])),
  defaults: { hidden_by_rig_on_load: ['STATION_2', 'BAR', 'HOST_STAND', 'TABLE_xx_CANDLE', 'CAB_ITEM_SPECIAL', 'AWNING', 'RANGE_FLAME_L/R'] },
  browser_simplifications: ['Glass uses glTF transmission; mobile AR may simplify it. Browser and Cycles lighting differ.',
    'Lamp, heat-lamp, flame and screen light is emissive material only; the page keeps its own warm point lights.',
    'ambientCG timber, fabric and terrazzo PBR textures; both boards are live canvases drawn by the page.',
    'Materials do not switch with the page dark theme (the maquette card does).'],
  limits: ['Kinematic display geometry, not a fit-out drawing, an equipment spec or a measured venue.', 'The venue is fictional. Equipment is generic and unbranded.', 'Nothing in the model is live data; everything it shows is the simulation\'s state.'],
  budget: { glb_bytes_max: 8000000, triangles_max: 150000, materials_max: 26, textures_max: 16 },
  actual: { glb_bytes: bytes.length, glb_sha256: createHash('sha256').update(bytes).digest('hex'), triangles_rendered: tris, triangles_unique_meshes: uniqueTris, nodes: json.nodes.length,
    meshes: json.meshes.length, primitives: json.meshes.reduce((a, m) => a + m.primitives.length, 0), materials: (json.materials || []).length, textures: (json.textures || []).length,
    extensions_used: json.extensionsUsed || [], generator: json.asset.generator },
};
writeFileSync(new URL('cafe-rig-contract.json', dir), JSON.stringify(contract, null, 1) + '\n');
console.log(JSON.stringify(contract.actual));
