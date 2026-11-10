// assembl AR worlds: the offline files. Used only by ar/tools/build_worlds.py (in a headless browser), never by visitors.
// Builds a world with the same code as the live version, freezes the model at its starting moment, and writes one GLB:
//   the still parts, merged by material (via the studio's snapshot, which bakes instances and keeps to a triangle budget)
//   the moving parts (a tanker, the claw, the heart's valves), each as its own node with a short looping animation
// The tool then turns the GLB into a USDZ for AR Quick Look (USD transform animation, which Quick Look plays) and keeps
// the GLB for Scene Viewer. Table and life size differ only in the scale on the top node.
import * as THREE from 'three';
import { buildWorld } from './scenes.js';
import { snapshot } from '../js/prepare.js';
import { GLTFExporter } from '../vendor/three/exporters/GLTFExporter.js';
import { mergeVertices } from '../vendor/three/utils/BufferGeometryUtils.js';
import { world as worldInfo, modeOf } from './worlds.js';

// Plain figures and some kit carry their colours per vertex. Quick Look's materials don't read vertex colours, so split
// each such mesh into one mesh per colour (people have five or six).
function splitVertexColours(root) {
  const todo = [];
  root.traverse(o => { if (o.isMesh && o.geometry && o.geometry.attributes.color && o.material && !Array.isArray(o.material) && o.material.vertexColors) todo.push(o); });
  for (const o of todo) {
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry, c = g.attributes.color, n = g.attributes.position.count / 3;
    const groups = new Map();
    for (let t = 0; t < n; t++) {
      const i = t * 3, key = [c.getX(i), c.getY(i), c.getZ(i)].map(v => Math.round(v * 40)).join(',');
      if (!groups.has(key)) groups.set(key, []); groups.get(key).push(t);
    }
    if (groups.size > 12) continue;
    const parent = o.parent, holder = new THREE.Group();
    holder.position.copy(o.position); holder.quaternion.copy(o.quaternion); holder.scale.copy(o.scale); holder.visible = o.visible; holder.name = o.name;
    for (const [key, tris] of groups) {
      const sub = new THREE.BufferGeometry();
      for (const name of ['position', 'normal', 'uv']) {
        const a = g.attributes[name]; if (!a) continue;
        // read through the accessors: SimReady meshes are quantised and interleaved (normalised Int16)
        const arr = new Float32Array(tris.length * 3 * a.itemSize), get = ['getX', 'getY', 'getZ', 'getW'];
        tris.forEach((t, k) => { for (let v = 0; v < 3; v++) for (let j = 0; j < a.itemSize; j++) arr[(k * 3 + v) * a.itemSize + j] = a[get[j]](t * 3 + v); });
        sub.setAttribute(name, new THREE.BufferAttribute(arr, a.itemSize));
      }
      const [r, gg, b] = key.split(',').map(v => +v / 40);
      const mat = o.material.clone(); mat.vertexColors = false; mat.color = new THREE.Color(r, gg, b).multiply(o.material.color || new THREE.Color(1, 1, 1));
      let m;
      if (o.isInstancedMesh) { m = new THREE.InstancedMesh(sub, mat, o.count); m.instanceMatrix.copy(o.instanceMatrix); m.count = o.count; }
      else m = new THREE.Mesh(sub, mat);
      holder.add(m);
    }
    const i = parent.children.indexOf(o); parent.children[i] = holder; holder.parent = parent; o.parent = null;
  }
}

// a node's transform relative to the world's root
function rootMatrix(root, node, out = new THREE.Matrix4()) {
  return out.multiplyMatrices(new THREE.Matrix4().copy(root.matrixWorld).invert(), node.matrixWorld);
}

export async function exportWorld(id, mode, { maxTriangles = 180000, fps = 20, renderer = null, maxTexture = 1024 } = {}) {
  mode = modeOf(mode);
  const info = worldInfo(id), k = mode === 'table' ? info.table.scale : info.inside.scale;
  const w = await buildWorld(id, { renderer, mode, scale: k });
  const root = w.root;
  const nodes = (w.anim && w.anim.nodes || []).filter(Boolean);
  const at = w.anim ? w.anim.at : () => { };
  at(0); root.updateMatrixWorld(true);
  splitVertexColours(root); root.updateMatrixWorld(true);
  // still parts: everything except the moving nodes
  const wasVisible = nodes.map(n => n.visible);
  nodes.forEach(n => { n.visible = false; });
  const stillBudget = Math.round(maxTriangles * (nodes.length ? 0.85 : 1));
  const still = snapshot(root, { scale: 1, unitsPerMetre: 1, keepOrigin: true, preservePBR: id === 'cafe', maxTriangles: stillBudget, maxBytes: 1e12, maxTexture, name: `${id} still` });
  nodes.forEach((n, i) => { n.visible = wasVisible[i]; });
  // the snapshot keeps every face's own corners; welding shared corners (same place, normal and texture point) roughly
  // halves the vertices, and with them the file
  const weld = grp => grp.traverse(o => { if (o.isMesh) { const g = mergeVertices(o.geometry, 1e-5); g.computeBoundingSphere(); o.geometry = g; } });
  weld(still.group);
  const out = new THREE.Group(); out.name = `assembl_${id}_${mode}`;
  out.scale.setScalar(k);
  // life-size places on iPhone: put the standing spot (the same one the Android doorway opens onto) at the origin, facing
  // into the world, because Quick Look sets the origin down just in front of you
  let base = out;
  if (mode === 'inside' && info.kind === 'place' && w.enter) {
    base = new THREE.Group(); base.name = 'standing_spot'; base.rotation.y = -w.enter.yaw; base.updateMatrixWorld(true);
    const p = new THREE.Vector3(w.enter.x, 0, w.enter.z).applyMatrix4(base.matrixWorld); base.position.set(-p.x, 0, -p.z);
    out.add(base);
  }
  const stillGroup = new THREE.Group(); stillGroup.name = 'still'; base.add(stillGroup);
  for (const m of [...still.group.children]) stillGroup.add(m);
  // moving parts: each in its own frame, without any moving parts inside it (they are exported on their own)
  const isMoving = new Set(nodes);
  const share = Math.max(2000, Math.round((maxTriangles - still.report.triangles) / Math.max(1, nodes.length)));
  const parts = [];
  nodes.forEach((n, i) => {
    const c = n.clone(true);
    // hide clones of moving descendants: walk both trees together
    (function pair(a, b) { for (let j = 0; j < a.children.length; j++) { const ca = a.children[j], cb = b.children[j]; if (!cb) continue; if (isMoving.has(ca)) cb.visible = false; else pair(ca, cb); } })(n, c);
    c.position.set(0, 0, 0); c.quaternion.identity(); c.scale.set(1, 1, 1); c.visible = true;
    const g = new THREE.Group(); g.add(c); g.updateMatrixWorld(true);
    const snap = snapshot(g, { scale: 1, unitsPerMetre: 1, keepOrigin: true, preservePBR: id === 'cafe', maxTriangles: share, maxBytes: 1e12, maxTexture, name: `moving ${i}` }); weld(snap.group);
    const node = new THREE.Group(); node.name = `moving_${i}`;
    for (const m of [...snap.group.children]) node.add(m);
    rootMatrix(root, n).decompose(node.position, node.quaternion, node.scale);
    base.add(node); parts.push({ src: n, node, triangles: snap.report.triangles });
  });
  // sample the loop
  const D = w.anim ? w.anim.duration : 0, tracks = [];
  if (D && parts.length) {
    const N = Math.max(2, Math.round(D * fps) + 1), times = new Float32Array(N);
    const P = parts.map(() => new Float32Array(N * 3)), Q = parts.map(() => new Float32Array(N * 4)), S = parts.map(() => new Float32Array(N * 3));
    const m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
    for (let f = 0; f < N; f++) {
      const t = (f / (N - 1)) * D; times[f] = t;
      at(t % D === 0 && f === N - 1 ? 0 : t); root.updateMatrixWorld(true);
      parts.forEach((pt, i) => {
        rootMatrix(root, pt.src, m).decompose(p, q, s);
        if (f > 0) { const pq = new THREE.Quaternion().fromArray(Q[i], (f - 1) * 4); if (pq.dot(q) < 0) q.set(-q.x, -q.y, -q.z, -q.w); }   // keep quaternions on one side, so the slerp takes the short way
        p.toArray(P[i], f * 3); q.toArray(Q[i], f * 4); s.toArray(S[i], f * 3);
      });
    }
    const still3 = (a, n) => { for (let f = 1; f < N; f++) for (let j = 0; j < n; j++) if (Math.abs(a[f * n + j] - a[j]) > 1e-5) return false; return true; };
    parts.forEach((pt, i) => {
      const nm = pt.node.name;
      if (!still3(P[i], 3)) tracks.push(new THREE.VectorKeyframeTrack(`${nm}.position`, times, P[i]));
      if (!still3(Q[i], 4)) tracks.push(new THREE.QuaternionKeyframeTrack(`${nm}.quaternion`, times, Q[i]));
      if (!still3(S[i], 3)) tracks.push(new THREE.VectorKeyframeTrack(`${nm}.scale`, times, S[i]));
    });
    at(0); root.updateMatrixWorld(true);
  }
  const clip = tracks.length ? new THREE.AnimationClip('loop', D, tracks) : null;
  out.updateMatrixWorld(true);
  // opaque surfaces don't need an alpha channel: JPEG pictures are a fraction of the size of PNG
  out.traverse(o => { if (o.isMesh && o.material.map && !o.material.transparent && !(o.material.alphaTest > 0)) o.material.map.userData.mimeType = 'image/jpeg'; });
  const box = new THREE.Box3().setFromObject(out, true), size = box.getSize(new THREE.Vector3());
  const glb = await new GLTFExporter().parseAsync(out, { binary: true, onlyVisible: true, maxTextureSize: maxTexture, animations: clip ? [clip] : [] });
  const triangles = still.report.triangles + parts.reduce((a, p) => a + p.triangles, 0);
  return {
    glb, report: {
      id, mode, scale: k, triangles, trianglesBefore: still.report.trianglesBefore, moving: parts.length, animated: tracks.length, duration: D,
      size: { x: +size.x.toFixed(3), y: +size.y.toFixed(3), z: +size.z.toFixed(3) }, dropped: still.report.dropped, simplified: still.report.simplified, skipped: still.report.skipped, warnings: still.report.warnings
    }
  };
}
