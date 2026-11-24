// assembl lab · Auckland live: buses, trains and ferries built in code (no brand marks, no operator liveries).
// One InstancedMesh per kind. Each vehicle has a status band whose colour comes only from real data (at-live trip updates);
// with no delay data the band is neutral grey. Sizes are typical for the fleet type, not measured from a particular vehicle.
import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export { STATUS_COLOURS, statusColour } from './status.js';

// part(geometry, colour, {band, rough}) → geometry with color, band and rough attributes, ready to merge
function part(g, colour, { band = 0, rough = 0.42, at = [0, 0, 0] } = {}) {
  g = g.index ? g.toNonIndexed() : g; g.translate(...at);
  const n = g.attributes.position.count, c = new T.Color(colour), col = new Float32Array(n * 3), b = new Float32Array(n).fill(band), r = new Float32Array(n).fill(rough);
  for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
  g.setAttribute('color', new T.BufferAttribute(col, 3)); g.setAttribute('band', new T.BufferAttribute(b, 1)); g.setAttribute('rough', new T.BufferAttribute(r, 1));
  if (g.attributes.uv) g.deleteAttribute('uv');
  return g;
}
const box = (w, h, d) => new T.BoxGeometry(w, h, d);
const rbox = (w, h, d, r) => new RoundedBoxGeometry(w, h, d, 2, r);
const wheel = (r, w, at) => { const g = new T.CylinderGeometry(r, r, w, 14); g.rotateZ(Math.PI / 2); return part(g, '#161718', { rough: 0.8, at }); };

// Forward is -z (north at bearing 0). y = 0 is the road, rail or water surface.
export function busGeometry() { // a 12 m low-floor city bus
  const P = [
    part(rbox(2.5, 2.75, 11.9, 0.2), '#e8eae7', { at: [0, 1.73, 0], rough: 0.34 }),
    part(box(2.53, 0.95, 10.6), '#1a2228', { at: [0, 2.2, 0.35], rough: 0.08 }), // side glass
    part(box(2.28, 1.55, 0.08), '#1a2228', { at: [0, 1.95, -5.95], rough: 0.06 }), // windscreen
    part(box(1.7, 0.26, 0.06), '#f6b73c', { at: [0, 3.0, -5.95], rough: 0.3 }), // destination sign (lit amber; no text)
    part(box(2.54, 0.22, 11.4), '#c3c7cc', { at: [0, 1.32, 0], band: 1, rough: 0.3 }), // status band
    part(box(2.0, 0.32, 3.8), '#cfd2cf', { at: [0, 3.25, 1.6], rough: 0.5 }), // roof air-con pod
    part(box(2.4, 0.42, 0.1), '#2b2e31', { at: [0, 0.62, -5.96], rough: 0.6 }), // bumper
    part(box(0.34, 0.16, 0.06), '#fff6dc', { at: [0.85, 0.95, -5.97], rough: 0.1 }), part(box(0.34, 0.16, 0.06), '#fff6dc', { at: [-0.85, 0.95, -5.97], rough: 0.1 }),
    wheel(0.5, 0.32, [1.12, 0.5, -3.7]), wheel(0.5, 0.32, [-1.12, 0.5, -3.7]), wheel(0.5, 0.32, [1.12, 0.5, 2.9]), wheel(0.5, 0.32, [-1.12, 0.5, 2.9]),
  ];
  return mergeGeometries(P);
}
export function trainGeometry() { // a three-car electric multiple unit, about 72 m
  const P = [];
  for (let k = 0; k < 3; k++) {
    const z = (k - 1) * 24.2;
    P.push(part(rbox(2.85, 3.5, 23.6, 0.3), '#e4e6e3', { at: [0, 2.1, z], rough: 0.32 }));
    P.push(part(box(2.88, 1.05, 21.2), '#182026', { at: [0, 2.55, z], rough: 0.07 }));
    P.push(part(box(2.89, 0.24, 22.8), '#c3c7cc', { at: [0, 1.62, z], band: 1, rough: 0.3 }));
    P.push(part(box(2.6, 0.55, 22.6), '#3a3e42', { at: [0, 0.62, z], rough: 0.7 })); // skirt
    for (const bz of [-8.2, 8.2]) P.push(part(box(2.2, 0.6, 3.0), '#202224', { at: [0, 0.42, z + bz], rough: 0.85 })); // bogies
    P.push(part(box(1.9, 0.3, 6), '#b9bcbc', { at: [0, 4.0, z], rough: 0.5 }));
  }
  P.push(part(box(2.4, 1.4, 0.08), '#182026', { at: [0, 2.6, -36.05], rough: 0.06 }), part(box(2.4, 1.4, 0.08), '#182026', { at: [0, 2.6, 36.05], rough: 0.06 }));
  P.push(part(box(0.1, 1.2, 0.1), '#2a2a2a', { at: [0, 4.75, 0.5], rough: 0.6 }), part(box(1.6, 0.06, 0.1), '#2a2a2a', { at: [0, 5.35, 0.5], rough: 0.6 })); // pantograph
  return mergeGeometries(P);
}
// Elliptical sections taper into the two fine bows; the stern stays broad at the waterline.
function hull(width, height, length) {
  const sections = [[-0.50, 0.035], [-0.43, 0.50], [-0.30, 0.92], [-0.14, 1], [0.42, 1], [0.50, 0.85]];
  const points = [], indices = [];
  for (const [z, beam] of sections) {
    for (let side = 0; side < 8; side++) {
      const angle = Math.PI * 2 * side / 8;
      points.push(Math.cos(angle) * width * beam / 2, Math.sin(angle) * height / 2, length * z);
    }
  }
  for (let row = 0; row < sections.length - 1; row++) {
    for (let i = 0; i < 8; i++) {
      const a = row * 8 + i, b = row * 8 + (i + 1) % 8;
      indices.push(a, b, a + 8, b, b + 8, a + 8);
    }
  }
  const end = (sections.length - 1) * 8;
  for (let i = 1; i < 7; i++) indices.push(0, i + 1, i, end, end + i, end + i + 1);
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(points, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
export function ferryGeometry() { // a passenger catamaran, about 34 m
  const P = [];
  for (const x of [-3.5, 3.5]) {
    P.push(part(hull(2.6, 1.6, 33.5), '#e9ecec', { at: [x, 0.9, 0], rough: 0.3 }));
    P.push(part(hull(2.62, 0.9, 33.0), '#23292e', { at: [x, 0.05, 0], rough: 0.5 })); // below the boot line
  }
  P.push(part(box(9.8, 0.5, 31), '#dfe2e2', { at: [0, 1.95, 0.6], rough: 0.4 })); // deck
  P.push(part(rbox(9.2, 2.6, 21.5, 0.6), '#f1f3f2', { at: [0, 3.5, 1.5], rough: 0.3 })); // main cabin
  P.push(part(box(9.24, 1.15, 19.5), '#172027', { at: [0, 3.75, 1.6], rough: 0.06 }));
  P.push(part(box(9.26, 0.26, 21.0), '#c3c7cc', { at: [0, 2.55, 1.5], band: 1, rough: 0.3 }));
  P.push(part(rbox(7.2, 2.2, 11.5, 0.5), '#f1f3f2', { at: [0, 5.9, 2.5], rough: 0.3 })); // upper deck
  P.push(part(box(7.24, 0.9, 10.0), '#172027', { at: [0, 6.1, 2.6], rough: 0.06 }));
  P.push(part(rbox(4.4, 1.6, 3.6, 0.4), '#f1f3f2', { at: [0, 7.7, -1.2], rough: 0.3 }), part(box(4.45, 0.7, 3.65), '#172027', { at: [0, 7.9, -1.2], rough: 0.06 })); // wheelhouse
  P.push(part(box(0.15, 2.6, 0.15), '#9aa0a3', { at: [0, 9.6, -0.6], rough: 0.4 })); // mast
  return mergeGeometries(P);
}

function vehicleMaterial() {
  const m = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.05, envMapIntensity: 1 });
  m.onBeforeCompile = (s) => {
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nattribute float band;\nattribute float rough;\nvarying float vBand;\nvarying float vRough;')
      .replace('#include <color_vertex>', 'vColor = color;\n#ifdef USE_INSTANCING_COLOR\nvColor = mix(vColor, instanceColor, band);\n#endif\nvBand = band; vRough = rough;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vBand;\nvarying float vRough;\nuniform float uNight;')
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = vRough;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vColor * vBand * (0.15 + 0.6 * uNight);');
    s.uniforms.uNight = m.userData.uNight;
  };
  m.userData.uNight = { value: 0 };
  return m;
}

export function createFleet(scene, { max = { bus: 1400, train: 80, ferry: 60 } } = {}) {
  const mat = vehicleMaterial(), geo = { bus: busGeometry(), train: trainGeometry(), ferry: ferryGeometry() };
  const meshes = {};
  for (const k of Object.keys(geo)) {
    const m = new T.InstancedMesh(geo[k], mat, max[k]); m.count = 0; m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false;
    m.instanceColor = new T.InstancedBufferAttribute(new Float32Array(max[k] * 3), 3); m.name = 'fleet_' + k; scene.add(m); meshes[k] = m;
  }
  const dummy = new T.Object3D(), col = new T.Color();
  return {
    meshes, material: mat,
    // list: [{mode, x, y, z, heading (radians, 0 = north), colour}]
    update(list) {
      const n = { bus: 0, train: 0, ferry: 0 };
      for (const v of list) {
        const m = meshes[v.mode]; if (!m || n[v.mode] >= m.instanceMatrix.count) continue;
        dummy.position.set(v.x, v.y, v.z); dummy.rotation.set(0, -v.heading, 0); dummy.updateMatrix();
        m.setMatrixAt(n[v.mode], dummy.matrix); m.setColorAt(n[v.mode], col.set(v.colour)); n[v.mode]++;
      }
      for (const k of Object.keys(meshes)) { meshes[k].count = n[k]; meshes[k].instanceMatrix.needsUpdate = true; if (meshes[k].instanceColor) meshes[k].instanceColor.needsUpdate = true; }
    },
    setNight(f) { mat.userData.uNight.value = f; },
  };
}

// Beacons: one round marker per vehicle that stays readable from across the city (fixed pixel size), coloured like the band.
export function createBeacons(scene, max = 1600, phone = false) {
  const g = new T.BufferGeometry(), pos = new Float32Array(max * 3), col = new Float32Array(max * 3), kind = new Float32Array(max), sel = new Float32Array(max);
  g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('color', new T.BufferAttribute(col, 3)); g.setAttribute('kind', new T.BufferAttribute(kind, 1)); g.setAttribute('sel', new T.BufferAttribute(sel, 1));
  const mat = new T.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uSize: { value: phone ? 15 : 13 }, uPR: { value: 1 } },
    vertexShader: `attribute vec3 color; attribute float kind; attribute float sel; varying vec3 vC; varying float vK; varying float vS; varying float vFade; uniform float uSize; uniform float uPR;
      void main(){ vC=color; vK=kind; vS=sel; vec4 mv=modelViewMatrix*vec4(position,1.0); float d=-mv.z; vFade=smoothstep(250.0,700.0,d)*0.9+0.1*sel+sel*0.0;
        vFade=max(vFade, sel); gl_Position=projectionMatrix*mv; gl_PointSize=uSize*uPR*(1.0+0.6*sel)*mix(1.0,0.8,smoothstep(4000.0,15000.0,d)); }`,
    fragmentShader: `varying vec3 vC; varying float vK; varying float vS; varying float vFade;
      void main(){ vec2 p=gl_PointCoord*2.0-1.0; float r = vK<0.5 ? length(p) : (vK<1.5 ? max(abs(p.x),abs(p.y))*1.05 : (abs(p.x)+abs(p.y))*0.85);
        if(r>1.0) discard; float ring=smoothstep(0.74,0.82,r); vec3 c=mix(vC, vec3(0.1,0.12,0.14), ring*0.8); float a=(1.0-smoothstep(0.92,1.0,r))*vFade; gl_FragColor=vec4(c,a); }`,
  });
  const pts = new T.Points(g, mat); pts.frustumCulled = false; pts.renderOrder = 10; scene.add(pts);
  const c = new T.Color();
  return {
    points: pts, material: mat,
    update(list, selectedId) {
      const n = Math.min(max, list.length);
      for (let i = 0; i < n; i++) { const v = list[i]; pos.set([v.x, v.y + (v.mode === 'train' ? 16 : v.mode === 'ferry' ? 18 : 14), v.z], i * 3); c.set(v.colour); col.set([c.r, c.g, c.b], i * 3); kind[i] = v.mode === 'bus' ? 0 : v.mode === 'train' ? 1 : 2; sel[i] = v.id === selectedId ? 1 : 0; }
      g.setDrawRange(0, n); for (const k of ['position', 'color', 'kind', 'sel']) g.attributes[k].needsUpdate = true;
    },
  };
}
