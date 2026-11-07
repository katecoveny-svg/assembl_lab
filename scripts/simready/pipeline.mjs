// Asset pipeline for the SimReady grocery DC twin (store/dc/). Not served (scripts/ is in .vercelignore).
// Run it outside the repo, with the tools installed there, never committed:
//   npm i @gltf-transform/cli@4      (brings @gltf-transform/core, functions, extensions, meshoptimizer, sharp)
//   cp scripts/simready/pipeline.mjs <tooldir>/ && cd <tooldir>
//   node pipeline.mjs <dir of raw SimReady GLBs from codepawl/simready-glb glb/> <out dir> [key,key]
// then copy <out dir>/*.glb to assets/models/simready/ and update ASSET_FILES sizes in store/dc/world.js.
// It reads NVIDIA SimReady GLBs (via codepawl/simready-glb, CC BY 4.0), groups the parts the twin animates,
// simplifies geometry to a browser budget, joins draw calls, shrinks textures, and writes meshopt-compressed GLBs.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import { dedup, prune, weld, simplify, textureCompress, join, meshopt, dequantize, flatten, compactPrimitive, palette } from '@gltf-transform/functions';
import sharp from 'sharp';
import fs from 'fs';

await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready, MeshoptSimplifier.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder,
});

const RAW = process.argv[2], OUT = process.argv[3];
const only = process.argv[4] ? process.argv[4].split(',') : null;
fs.mkdirSync(OUT, { recursive: true });

// key: output name; src: SimReady asset; ratio/error: simplifier; tex: max texture edge;
// groups: regex → group name for parts that move (everything else → "body"); drop: regex of parts to remove.
const ASSETS = [
  { key: 'forklift', src: 'vehicle_forklift_blue_c01', ratio: 0.028, error: 0.02, tex: 512,
    groups: [[/mast_stage2/, 'mast2'], [/mast_stage3|mast_stage4|fork1|fork2/, 'carriage']],
    drop: /button|seatbelt|pedal|gearstick|controlstick|handle\d|brake|seat_head/, minPart: 0.16 },
  { key: 'orderpicker', src: 'vehicle_forklift_red_b01', ratio: 0.03, error: 0.02, tex: 512,
    groups: [[/sm_lift_/, 'mast2'], [/cabine|glass_b01|knob|lever/, 'carriage']],
    drop: /button|switch|pedal/, minPart: 0.16 },
  { key: 'palletjack', src: 'palletJack_lowProfile_a01', ratio: 0.04, error: 0.02, tex: 512, groups: [] },
  { key: 'conveyor', src: 'conveyor_belt_a05', ratio: 0.03, error: 0.02, tex: 512, groups: [] },
  { key: 'rack', src: 'rack_large_empty_a01', ratio: 0.06, error: 0.012, tex: 512, groups: [], sloppy: 2400 },
  { key: 'pallet', src: 'pallet_b01', ratio: 0.15, error: 0.025, tex: 512, groups: [] },
  { key: 'dockgate', src: 'barrier_gate_safetyDock_a02', ratio: 0.04, error: 0.02, tex: 256,
    groups: [[/barrier_gate|wheel/, 'arm']] },
  { key: 'railguard', src: 'rail_guard_a09', ratio: 0.02, error: 0.02, tex: 256, groups: [], sloppy: 900 },
  { key: 'machineguard', src: 'machineGuard_a01', ratio: 0.06, error: 0.02, tex: 256, groups: [] },
  { key: 'cart', src: 'cart_computer_a01', ratio: 0.03, error: 0.02, tex: 256, groups: [], minPart: 0.1 },
  { key: 'printer', src: 'computer_printer_barcode_a01', ratio: 0.1, error: 0.02, tex: 256, groups: [], minPart: 0.08 },
  { key: 'extinguisher', src: 'fireExtinguisher_stand_a01', ratio: 0.03, error: 0.03, tex: 256, groups: [] },
  { key: 'firstaid', src: 'safety_firstAidCabinet_wallMounted_a01', ratio: 0.1, error: 0.02, tex: 256, groups: [] },
  { key: 'tote', src: 'crate_blue_a08', ratio: 0.015, error: 0.06, tex: 256, groups: [], sloppy: 700 },
  { key: 'carton', src: 'box_cardboard_b01', ratio: 1, error: 0, tex: 256, groups: [] },
];


// Sloppy simplification to a fixed triangle budget, for perforated or repeated parts (totes, rack frames) where the
// regular simplifier stops early to keep holes. It drops the holes; at DC viewing distance they read the same.
function sloppy(doc, budget) {
  const prims = []; for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) prims.push(p);
  const tot = prims.reduce((s, p) => s + p.getIndices().getCount() / 3, 0);
  for (const p of prims) {
    const idx = p.getIndices(), pos = p.getAttribute('POSITION');
    const target = Math.max(12, Math.floor(budget * (idx.getCount() / 3) / tot)) * 3;
    if (idx.getCount() <= target) continue;
    const src = new Uint32Array(idx.getArray()), P = new Float32Array(pos.getArray());
    const [out] = MeshoptSimplifier.simplifySloppy(src, P, 3, null, target, 0.05);
    idx.setArray(out.length < 65536 * 3 && pos.getCount() < 65536 ? new Uint16Array(out) : new Uint32Array(out));
    compactPrimitive(p);
  }
}


// Remove parts smaller than minPart metres across (knobs, bolts, labels): unseen at DC distance, one draw each.
// Runs before join, while every part is still its own node; sizes are measured in world units.
function dropSmall(doc, minPart) {
  let n = 0;
  for (const node of doc.getRoot().listNodes()) {
    const m = node.getMesh(); if (!m) continue;
    const W = node.getWorldMatrix(); const sc = Math.max(Math.hypot(W[0], W[1], W[2]), Math.hypot(W[4], W[5], W[6]), Math.hypot(W[8], W[9], W[10]));
    const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9], v = [0, 0, 0];
    for (const p of m.listPrimitives()) { const pos = p.getAttribute('POSITION'); for (let i = 0; i < pos.getCount(); i++) { pos.getElement(i, v); for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], v[k]); mx[k] = Math.max(mx[k], v[k]); } } }
    if (Math.hypot(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]) * sc < minPart) { node.setMesh(null); n++; }
  }
  return n;
}

function triCount(doc) {
  let t = 0;
  for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) {
    const i = p.getIndices(); t += (i ? i.getCount() : p.getAttribute('POSITION').getCount()) / 3;
  }
  return t | 0;
}

for (const a of ASSETS) {
  if (only && !only.includes(a.key)) continue;
  const doc = await io.read(`${RAW}/${a.src}.glb`);
  const root = doc.getRoot();
  const scene = root.getDefaultScene() || root.listScenes()[0];
  const top = scene.listChildren()[0]; // "Geometry"
  const before = triCount(doc);

  // Strip physics extras and joint frames; regroup the parts.
  const groups = new Map();
  const groupNode = name => {
    if (!groups.has(name)) { const g = doc.createNode(name); top.addChild(g); groups.set(name, g); }
    return groups.get(name);
  };
  for (const n of root.listNodes()) n.setExtras({});
  for (const part of [...top.listChildren()]) {
    const name = part.getName();
    if (a.drop && a.drop.test(name)) { part.traverse(n => n.dispose()); continue; }
    let g = 'body';
    for (const [re, gname] of a.groups) if (re.test(name)) { g = gname; break; }
    const gn = groupNode(g);
    // move mesh-bearing descendants under the group, unnamed, keeping world transforms
    part.traverse(n => {
      if (n.getMesh()) {
        const m = doc.createNode('').setMesh(n.getMesh()).setMatrix(n.getWorldMatrix());
        n.getMesh().setName('');
        gn.addChild(m);
      }
    });
    part.traverse(n => n.dispose());
  }
  // groups were created after "Geometry" got its transform; Geometry is identity in these files.
  for (const m of root.listMeshes()) m.setName('');

  await doc.transform(
    dequantize(),
    ...(a.minPart ? [d => { const n = dropSmall(d, a.minPart); console.log(`  dropped ${n} small parts`); }] : []),
    dedup(),
    weld({}),
    ...(a.ratio < 1 ? [simplify({ simplifier: MeshoptSimplifier, ratio: a.ratio, error: a.error, lockBorder: false })] : []),
    palette({ min: 2, keepAttributes: false }),
    join({ keepNamed: false, keepMeshes: false }),
    ...(a.sloppy ? [d => sloppy(d, a.sloppy)] : []),
    prune({ keepLeaves: false, keepAttributes: false }),
    dedup(),
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [a.tex, a.tex], quality: 82 }),
    meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
  );
  // join() drops group nodes' names? keep them; report structure
  const names = root.listNodes().map(n => n.getName()).filter(Boolean);
  const after = triCount(doc);
  const draws = root.listMeshes().reduce((s, m) => s + m.listPrimitives().length, 0);
  await io.write(`${OUT}/${a.key}.glb`, doc);
  const kb = (fs.statSync(`${OUT}/${a.key}.glb`).size / 1024).toFixed(0);
  console.log(`${a.key.padEnd(13)} ${String(before).padStart(8)} → ${String(after).padStart(7)} tris, ${draws} draws, ${kb} KB, nodes: ${names.join(',')}`);
}
