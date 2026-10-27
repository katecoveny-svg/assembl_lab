// assembl AR: turn any three.js content into a clean snapshot that USDZ (AR Quick Look) and GLB (WebXR, Scene Viewer)
// both show the same way.
//   - reads the live object without changing it; the snapshot has its own geometry, materials and textures
//   - bakes world transforms and InstancedMesh instances (each instance's matrix and colour) into plain meshes
//   - skips Points, Sprites, lines, ShaderMaterials, shadow catchers, invisible things, HTML labels and helpers
//   - converts every material to MeshStandardMaterial (colour, map, roughness, metalness, opacity, emissive)
//   - copies canvas, video and 8-bit data textures at the moment of the snapshot
//   - keeps to a triangle budget: lowers segment counts first, then drops the smallest instanced items,
//     then rounds off rounded boxes, then drops the smallest remaining parts, and reports what it did
//   - centres the result on its base (y = 0) and scales it to real metres or a tabletop size
import * as THREE from 'three';
import { mergeGeometries } from '../vendor/three/utils/BufferGeometryUtils.js';

const DEFAULTS = { unitsPerMetre: 1, scale: 'real', tableSize: 0.38, tableMaxHeight: 0.5, maxTriangles: 150000, maxTexture: 2048, name: 'assembl AR snapshot' };

// constructor parameter order for geometries we can rebuild with fewer segments: [name, min] for the ones we lower
const SIMPLIFY = {
  SphereGeometry: { args: ['radius', 'widthSegments', 'heightSegments', 'phiStart', 'phiLength', 'thetaStart', 'thetaLength'], lower: { widthSegments: 8, heightSegments: 6 } },
  CylinderGeometry: { args: ['radiusTop', 'radiusBottom', 'height', 'radialSegments', 'heightSegments', 'openEnded', 'thetaStart', 'thetaLength'], lower: { radialSegments: 8, heightSegments: 1 } },
  ConeGeometry: { args: ['radius', 'height', 'radialSegments', 'heightSegments', 'openEnded', 'thetaStart', 'thetaLength'], lower: { radialSegments: 8, heightSegments: 1 } },
  TorusGeometry: { args: ['radius', 'tube', 'radialSegments', 'tubularSegments', 'arc'], lower: { radialSegments: 6, tubularSegments: 12 } },
  TorusKnotGeometry: { args: ['radius', 'tube', 'tubularSegments', 'radialSegments', 'p', 'q'], lower: { tubularSegments: 32, radialSegments: 6 } },
  CapsuleGeometry: { args: ['radius', 'length', 'capSegments', 'radialSegments'], lower: { capSegments: 2, radialSegments: 8 } },
  CircleGeometry: { args: ['radius', 'segments', 'thetaStart', 'thetaLength'], lower: { segments: 12 } },
  RingGeometry: { args: ['innerRadius', 'outerRadius', 'thetaSegments', 'phiSegments', 'thetaStart', 'thetaLength'], lower: { thetaSegments: 12, phiSegments: 1 } },
  TubeGeometry: { args: ['path', 'tubularSegments', 'radius', 'radialSegments', 'closed'], lower: { tubularSegments: 8, radialSegments: 5 } },
  LatheGeometry: { args: ['points', 'segments', 'phiStart', 'phiLength'], lower: { segments: 8 } },
  PlaneGeometry: { args: ['width', 'height', 'widthSegments', 'heightSegments'], lower: { widthSegments: 1, heightSegments: 1 } },
  IcosahedronGeometry: { args: ['radius', 'detail'], lower: { detail: 0 } },
  OctahedronGeometry: { args: ['radius', 'detail'], lower: { detail: 0 } },
  DodecahedronGeometry: { args: ['radius', 'detail'], lower: { detail: 0 } }
};
const FLAT_TYPES = new Set(['PlaneGeometry', 'CircleGeometry', 'RingGeometry', 'ShapeGeometry']);

const triCount = g => (g.index ? g.index.count : g.attributes.position.count) / 3;

function lowerGeometry(g) {
  const T = SIMPLIFY[g.type], p = g.parameters;
  if (g.type === 'ExtrudeGeometry' && p && p.options) {
    const o = p.options, cs = o.curveSegments ?? 12, bs = o.bevelSegments ?? 3;
    if (cs <= 3 && bs <= 1) return null;
    const n = new THREE.ExtrudeGeometry(p.shapes, { ...o, curveSegments: Math.max(3, Math.floor(cs / 2)), bevelSegments: Math.max(1, Math.floor(bs / 2)) });
    return n;
  }
  if (!T || !p) return null;
  let changed = false;
  const args = T.args.map(name => {
    let v = p[name];
    if (name in T.lower && typeof v === 'number') {
      const nv = Math.max(T.lower[name], name === 'detail' ? v - 1 : Math.floor(v / 2));
      if (nv < v) { changed = true; v = nv; }
    }
    return v;
  });
  if (!changed) return null;
  try { return new THREE[g.type](...args); } catch (e) { return null; }
}
// RoundedBoxGeometry is a unit BoxGeometry with many segments, reshaped: a plain box of the same size replaces it
function isRoundedBox(g) {
  if (g.type !== 'BoxGeometry' || !g.parameters) return false;
  const p = g.parameters;
  return p.widthSegments > 1 && p.width === 1 && p.height === 1 && p.depth === 1 && g.attributes.position.count > 24;
}
function plainBox(g) {
  g.computeBoundingBox();
  const s = g.boundingBox.getSize(new THREE.Vector3()), c = g.boundingBox.getCenter(new THREE.Vector3());
  const b = new THREE.BoxGeometry(s.x, s.y, s.z); b.translate(c.x, c.y, c.z); return b;
}

// ---------------------------------------------------------------- textures
function copyTexture(t, cache, maxSize, report) {
  if (!t) return null;
  if (cache.has(t)) return cache.get(t);
  let out = null;
  try {
    const img = t.image;
    if (t.isCompressedTexture || t.isCubeTexture || t.isDataArrayTexture || t.isData3DTexture || t.isDepthTexture || t.isRenderTargetTexture) throw new Error('unsupported texture');
    let w = 0, h = 0, draw = null;
    if (t.isDataTexture) {
      const d = img && img.data;
      if (!d || !(d instanceof Uint8Array || d instanceof Uint8ClampedArray)) throw new Error('float data texture');
      w = img.width; h = img.height;
      const rgba = new Uint8ClampedArray(w * h * 4), ch = d.length / (w * h);
      for (let i = 0; i < w * h; i++) {
        rgba[i * 4] = d[i * ch]; rgba[i * 4 + 1] = ch > 1 ? d[i * ch + 1] : d[i * ch]; rgba[i * 4 + 2] = ch > 2 ? d[i * ch + 2] : d[i * ch];
        rgba[i * 4 + 3] = ch > 3 ? d[i * ch + 3] : 255;
      }
      draw = ctx => { const tmp = document.createElement('canvas'); tmp.width = w; tmp.height = h; tmp.getContext('2d').putImageData(new ImageData(rgba, w, h), 0, 0); ctx.drawImage(tmp, 0, 0, ctx.canvas.width, ctx.canvas.height); };
    } else if (img && (img.videoWidth || img.width)) {
      w = img.videoWidth || img.naturalWidth || img.width; h = img.videoHeight || img.naturalHeight || img.height;
      draw = ctx => ctx.drawImage(img, 0, 0, ctx.canvas.width, ctx.canvas.height);
    } else throw new Error('no image');
    if (!(w > 0 && h > 0)) throw new Error('empty image');
    const k = Math.min(1, maxSize / Math.max(w, h));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
    draw(c.getContext('2d'));
    out = new THREE.CanvasTexture(c);
    out.colorSpace = t.colorSpace; out.flipY = t.flipY;
    out.wrapS = t.wrapS; out.wrapT = t.wrapT;
    out.repeat.copy(t.repeat); out.offset.copy(t.offset); out.rotation = t.rotation; out.center.copy(t.center);
    out.userData.mimeType = (t.userData && t.userData.mimeType) === 'image/jpeg' ? 'image/jpeg' : 'image/png';
    out.name = t.name || '';
  } catch (e) {
    report.warnings.push('A texture was left off (' + e.message + ').');
    out = null;
  }
  cache.set(t, out);
  return out;
}

// ---------------------------------------------------------------- materials
function skipReason(m) {
  if (!m) return 'no material';
  if (m.visible === false || m.colorWrite === false) return 'invisible material';
  if (m.isShadowMaterial) return 'shadow catcher';
  if (m.isShaderMaterial || m.isRawShaderMaterial) return 'custom shader';
  if (m.isMeshDepthMaterial || m.isMeshDistanceMaterial || m.isMeshNormalMaterial) return 'utility material';
  if (m.wireframe) return 'wireframe';
  if ((m.transparent || m.opacity < 1) && m.opacity < 0.02) return 'fully transparent';
  return null;
}
function convertMaterial(m, tint, ctx) {
  const key = m.uuid + '|' + (tint ? tint.getHexString() : '');
  if (ctx.materials.has(key)) return ctx.materials.get(key);
  const o = new THREE.MeshStandardMaterial({ name: m.name || m.type });
  o.color.copy(m.color || new THREE.Color(1, 1, 1));
  if (tint) o.color.multiply(tint);
  o.map = copyTexture(m.map, ctx.textures, ctx.opts.maxTexture, ctx.report);
  if (m.isMeshStandardMaterial) { o.roughness = m.roughness; o.metalness = m.metalness; }
  else if (m.isMeshPhongMaterial) { o.roughness = THREE.MathUtils.clamp(1 - (m.shininess || 30) / 120, 0.15, 0.9); o.metalness = 0; }
  else { o.roughness = 0.85; o.metalness = 0; }
  o.opacity = m.opacity;
  o.transparent = !!m.transparent || m.opacity < 1;
  o.alphaTest = m.alphaTest || 0;
  if (m.isMeshPhysicalMaterial && m.transmission > 0) {
    // glass: USDZ and GLB viewers don't agree on transmission, so show it as a light, see-through surface
    o.transparent = true; o.opacity = Math.min(o.opacity, 0.3); o.roughness = Math.min(o.roughness, 0.15);
  }
  if (m.emissive && (m.emissive.r + m.emissive.g + m.emissive.b) > 0.001) {
    const k = Math.min(1, m.emissiveIntensity ?? 1);
    o.emissive.copy(m.emissive).multiplyScalar(k);
    if (tint && m.emissive.equals(m.color || m.emissive)) o.emissive.multiply(tint);
  }
  o.emissiveMap = copyTexture(m.emissiveMap, ctx.textures, ctx.opts.maxTexture, ctx.report);
  if (m.isMeshBasicMaterial) {
    // unlit in the source: give it a little glow so screens and labels stay readable under room light
    o.roughness = 0.9;
    if (o.map) { o.emissiveMap = o.map; o.emissive.setRGB(0.45, 0.45, 0.45); }
    else o.emissive.copy(o.color).multiplyScalar(0.35);
  }
  o.side = THREE.FrontSide;
  o.userData.wasDoubleSided = m.side === THREE.DoubleSide || m.side === THREE.BackSide;
  o.userData.needsUV = !!(o.map || o.emissiveMap);
  ctx.materials.set(key, o);
  return o;
}

// ---------------------------------------------------------------- geometry
function cleanGeometry(src, needsUV, matrix, positionsOverride) {
  const g = new THREE.BufferGeometry();
  const pos = src.attributes.position, n = pos.count;
  const P = new Float32Array(n * 3);
  if (positionsOverride) P.set(positionsOverride);
  else for (let i = 0; i < n; i++) { P[i * 3] = pos.getX(i); P[i * 3 + 1] = pos.getY(i); P[i * 3 + 2] = pos.getZ(i); }
  g.setAttribute('position', new THREE.BufferAttribute(P, 3));
  const nor = src.attributes.normal;
  if (nor && !positionsOverride) {
    const N = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { N[i * 3] = nor.getX(i); N[i * 3 + 1] = nor.getY(i); N[i * 3 + 2] = nor.getZ(i); }
    g.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  }
  if (needsUV) {
    const uv = src.attributes.uv, U = new Float32Array(n * 2);
    if (uv) for (let i = 0; i < n; i++) { U[i * 2] = uv.getX(i); U[i * 2 + 1] = uv.getY(i); }
    g.setAttribute('uv', new THREE.BufferAttribute(U, 2));
  }
  let idx;
  if (src.index) { idx = new Uint32Array(src.index.count); for (let i = 0; i < idx.length; i++) idx[i] = src.index.getX(i); }
  else { idx = new Uint32Array(n); for (let i = 0; i < n; i++) idx[i] = i; }
  idx = idx.slice(0, idx.length - (idx.length % 3));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  if (!g.attributes.normal) g.computeVertexNormals();
  g.applyMatrix4(matrix);
  if (matrix.determinant() < 0) for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
  return g;
}
function withBackFaces(g) {
  const b = g.clone();
  const idx = b.index.array;
  for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
  const nor = b.attributes.normal.array;
  for (let i = 0; i < nor.length; i++) nor[i] = -nor[i];
  return mergeGeometries([g, b], false) || g;
}
// split a multi-material geometry into one geometry per group
function groupsOf(geo, materials) {
  if (!Array.isArray(materials)) return [{ geometry: geo, material: materials }];
  if (!geo.groups.length) return [{ geometry: geo, material: materials[0] }];
  return geo.groups.map(gr => {
    const g = new THREE.BufferGeometry();
    for (const k in geo.attributes) g.setAttribute(k, geo.attributes[k]);
    const count = geo.index ? geo.index.count : geo.attributes.position.count;
    const start = gr.start, end = Math.min(count, gr.start + gr.count);
    const idx = new Uint32Array(Math.max(0, end - start));
    for (let i = start; i < end; i++) idx[i - start] = geo.index ? geo.index.getX(i) : i;
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.type = geo.type;
    return { geometry: g, material: materials[gr.materialIndex] };
  }).filter(x => x.material);
}

// ---------------------------------------------------------------- the snapshot
export function snapshot(root, options = {}) {
  const opts = { ...DEFAULTS, ...options };
  const report = { trianglesBefore: 0, triangles: 0, meshes: 0, instances: 0, skipped: {}, simplified: [], dropped: [], warnings: [], size: null, scale: 1 };
  const skip = why => { report.skipped[why] = (report.skipped[why] || 0) + 1; };
  const ctx = { opts, report, materials: new Map(), textures: new Map() };
  root.updateMatrixWorld(true);
  const items = [];
  const m4 = new THREE.Matrix4(), sph = new THREE.Sphere(), col = new THREE.Color();

  function addMesh(mesh) {
    const geo = mesh.geometry;
    if (!geo || !geo.attributes || !geo.attributes.position || !geo.attributes.position.count) { skip('empty geometry'); return; }
    if (geo.attributes.position.itemSize !== 3) { skip('unusual geometry'); return; }
    let baked = null;
    const morph = mesh.morphTargetInfluences && geo.morphAttributes && geo.morphAttributes.position && mesh.morphTargetInfluences.some(v => v);
    if (mesh.isSkinnedMesh || morph) {
      // pose the vertices now (skinning and morph targets), in the mesh's own space
      const n = geo.attributes.position.count, v = new THREE.Vector3();
      baked = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { mesh.getVertexPosition(i, v); baked[i * 3] = v.x; baked[i * 3 + 1] = v.y; baked[i * 3 + 2] = v.z; }
    }
    if (!geo.boundingSphere) geo.computeBoundingSphere();
    for (const { geometry, material } of groupsOf(geo, mesh.material)) {
      const why = skipReason(material);
      if (why) { skip(why); continue; }
      let vtint = null;
      if (material.vertexColors && geo.attributes.color) {
        const c = geo.attributes.color, n = Math.min(c.count, 4000), step = Math.max(1, Math.floor(c.count / n));
        let r = 0, g = 0, b = 0, k = 0;
        for (let i = 0; i < c.count; i += step) { r += c.getX(i); g += c.getY(i); b += c.getZ(i); k++; }
        vtint = new THREE.Color(r / k, g / k, b / k);
      }
      const tris = triCount(geometry);
      if (mesh.isInstancedMesh) {
        for (let i = 0; i < mesh.count; i++) {
          mesh.getMatrixAt(i, m4);
          const world = new THREE.Matrix4().multiplyMatrices(mesh.matrixWorld, m4);
          if (Math.abs(world.determinant()) < 1e-15) { skip('empty instance'); continue; }
          let tint = vtint ? vtint.clone() : null;
          if (mesh.instanceColor) { mesh.getColorAt(i, col); tint = tint ? tint.multiply(col) : col.clone(); }
          if (tint) tint.setRGB(Math.round(tint.r * 64) / 64, Math.round(tint.g * 64) / 64, Math.round(tint.b * 64) / 64);
          sph.copy(geo.boundingSphere).applyMatrix4(world);
          items.push({ src: geometry, matrix: world, material, tint, tris, radius: sph.radius, instanced: true, name: mesh.name || 'instanced parts' });
          report.instances++;
        }
      } else {
        sph.copy(geo.boundingSphere).applyMatrix4(mesh.matrixWorld);
        items.push({ src: geometry, matrix: mesh.matrixWorld.clone(), material, tint: vtint, tris, radius: sph.radius, instanced: false, baked, name: mesh.name || 'part' });
      }
    }
  }
  (function walk(o) {
    if (!o.visible) { skip('hidden'); return; }
    if (o.userData && (o.userData.arSkip || o.userData.noExport)) { skip('marked to skip'); return; }
    if (o.isCSS2DObject || o.isCSS3DObject) { skip('HTML label'); return; }
    if (/Helper$/.test(o.type || '')) { skip('helper'); return; }
    if (o.isLight || o.isCamera) { /* not exported */ }
    else if (o.isPoints) skip('points');
    else if (o.isSprite) skip('sprite');
    else if (o.isLine) skip('line');
    else if (o.isMesh) addMesh(o);
    for (const c of o.children) walk(c);
  })(root);

  report.trianglesBefore = items.reduce((s, it) => s + it.tris, 0);
  let total = report.trianglesBefore;
  const budget = opts.maxTriangles;

  // 1. lower segment counts where the geometry knows how it was made
  if (total > budget) {
    const replaced = new Map();
    for (let pass = 0; pass < 4 && total > budget; pass++) {
      const uses = new Map();
      for (const it of items) if (!it.baked) uses.set(it.src, (uses.get(it.src) || 0) + 1);
      const order = [...uses.entries()].map(([g, n]) => ({ g, n, cost: triCount(g) * n })).sort((a, b) => b.cost - a.cost);
      let changed = false;
      for (const { g, n } of order) {
        if (total <= budget) break;
        const ng = lowerGeometry(g);
        if (!ng) continue;
        const saved = (triCount(g) - triCount(ng)) * n;
        if (saved <= 0) continue;
        for (const it of items) if (it.src === g) { it.src = ng; it.tris = triCount(ng); }
        const first = replaced.get(g) || g;
        replaced.set(ng, first); total -= saved; changed = true;
        report.simplified.push({ type: g.type, uses: n, trianglesSaved: saved });
      }
      if (!changed) break;
    }
  }
  // 2. drop the smallest instanced items
  if (total > budget) {
    const inst = items.filter(it => it.instanced).sort((a, b) => a.radius - b.radius);
    const dropped = new Map();
    for (const it of inst) {
      if (total <= budget) break;
      it.drop = true; total -= it.tris;
      dropped.set(it.name, (dropped.get(it.name) || 0) + 1);
    }
    for (const [name, count] of dropped) report.dropped.push({ name, count, reason: 'smallest repeated items, over the triangle budget' });
  }
  // 3. rounded boxes become plain boxes
  if (total > budget) {
    const done = new Map();
    for (const it of items) {
      if (it.drop || it.baked || !isRoundedBox(it.src)) continue;
      if (!done.has(it.src)) done.set(it.src, plainBox(it.src));
      const ng = done.get(it.src); total -= it.tris - triCount(ng); it.src = ng; it.tris = triCount(ng);
    }
    if (done.size) report.simplified.push({ type: 'RoundedBoxGeometry → box', uses: done.size, trianglesSaved: null });
  }
  // 4. still over: drop the smallest remaining parts
  if (total > budget) {
    const rest = items.filter(it => !it.drop).sort((a, b) => a.radius - b.radius);
    const dropped = new Map();
    for (const it of rest) {
      if (total <= budget) break;
      it.drop = true; total -= it.tris;
      dropped.set(it.name, (dropped.get(it.name) || 0) + 1);
    }
    for (const [name, count] of dropped) report.dropped.push({ name, count, reason: 'smallest parts, over the triangle budget' });
  }

  // bake, group by material, merge
  const byMat = new Map();
  for (const it of items) {
    if (it.drop) continue;
    const mat = convertMaterial(it.material, it.tint, ctx);
    let g = cleanGeometry(it.src, mat.userData.needsUV, it.matrix, it.baked);
    if (mat.userData.wasDoubleSided && FLAT_TYPES.has(it.src.type)) g = withBackFaces(g);
    if (!byMat.has(mat)) byMat.set(mat, []);
    byMat.get(mat).push(g);
  }
  const out = new THREE.Group(); out.name = opts.name;
  const box = new THREE.Box3();
  for (const [mat, geos] of byMat) {
    for (const g of geos) { g.computeBoundingBox(); box.union(g.boundingBox); }
  }
  if (box.isEmpty()) { report.warnings.push('Nothing visible to export.'); report.size = { x: 0, y: 0, z: 0 }; return { group: out, report }; }
  const size = box.getSize(new THREE.Vector3()), centre = box.getCenter(new THREE.Vector3());
  const toM = 1 / (opts.unitsPerMetre || 1);
  let k = toM;
  if (opts.scale === 'table') {
    const across = Math.max(size.x, size.z) * toM, tall = size.y * toM;
    k = toM * Math.min(opts.tableSize / Math.max(across, 1e-6), opts.tableMaxHeight / Math.max(tall, 1e-6));
  } else if (typeof opts.scale === 'number' && opts.scale > 0) k = toM * opts.scale;
  const final = new THREE.Matrix4().makeScale(k, k, k).multiply(new THREE.Matrix4().makeTranslation(-centre.x, -box.min.y, -centre.z));
  let n = 0;
  for (const [mat, geos] of byMat) {
    const merged = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
    if (!merged) { report.warnings.push('Some parts could not be merged and were left off.'); continue; }
    merged.applyMatrix4(final);
    merged.computeBoundingBox(); merged.computeBoundingSphere();
    const mesh = new THREE.Mesh(merged, mat);
    mesh.name = (mat.name || 'part') + ' ' + (++n);
    out.add(mesh);
    report.triangles += triCount(merged);
  }
  report.meshes = out.children.length;
  report.scale = k;
  report.size = { x: size.x * k, y: size.y * k, z: size.z * k };
  out.updateMatrixWorld(true);
  return { group: out, report };
}

// A cheap fingerprint of what a snapshot would contain, so an unchanged scene reuses its files.
export function fingerprint(root) {
  let h = 2166136261;
  const add = v => { h ^= (Math.round(v * 1000) | 0); h = Math.imul(h, 16777619); };
  root.updateMatrixWorld(true);
  (function walk(o) {
    if (!o.visible) return;
    add(o.id);
    if (o.isMesh) {
      const e = o.matrixWorld.elements; for (let i = 0; i < 16; i++) add(e[i]);
      add(o.geometry.id); add(o.geometry.attributes.position ? o.geometry.attributes.position.count : 0);
      for (const m of [].concat(o.material)) { if (!m) continue; add(m.id); if (m.color) { add(m.color.r); add(m.color.g); add(m.color.b); } add(m.opacity ?? 1); }
      if (o.isInstancedMesh) {
        add(o.count); const a = o.instanceMatrix.array, step = Math.max(1, Math.floor(a.length / 4096));
        for (let i = 0; i < a.length; i += step) add(a[i]);
        if (o.instanceColor) { const c = o.instanceColor.array, s2 = Math.max(1, Math.floor(c.length / 1024)); for (let i = 0; i < c.length; i += s2) add(c[i]); }
      }
    }
    for (const c of o.children) walk(c);
  })(root);
  return (h >>> 0).toString(36);
}

// Where to hang an object on a wall: its back on the wall (z = 0), facing out (+z), centred on the tap.
export function wallPose(group) {
  group.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(group, true);
  const holder = new THREE.Group(); holder.name = group.name;
  const inner = group.clone(); inner.position.set(-(b.min.x + b.max.x) / 2, -(b.min.y + b.max.y) / 2, -b.min.z);
  holder.add(inner); holder.updateMatrixWorld(true);
  return holder;
}
