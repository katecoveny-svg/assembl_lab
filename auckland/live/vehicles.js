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
export function busGeometry(detail = false) { // a representative 12 m low-floor city bus, not an operator model
  const P = [
    part(rbox(2.5, 2.75, 11.9, 0.2), detail ? '#344b61' : '#e8eae7', { at: [0, 1.73, 0], rough: 0.34 }),
    part(box(2.522, 0.77, 10.6), detail ? '#141d25' : '#1a2228', { at: [0, 2.23, 0.35], rough: detail ? 0.34 : 0.12 }),
    part(box(2.28, 1.55, 0.08), '#1a2228', { at: [0, 1.95, -5.95], rough: 0.06 }), // windscreen
    part(box(1.7, 0.26, 0.06), detail ? '#13191c' : '#f6b73c', { at: [0, 3.0, -5.95], rough: 0.3 }), // destination sign (lit amber; no text)
    part(box(2.54, detail ? .045 : .22, 11.4), '#c3c7cc', { at: [0, 1.32, 0], band: 1, rough: 0.3 }), // status band
    part(rbox(2.0, 0.32, 3.8, .10), detail ? '#bac0c2' : '#cfd2cf', { at: [0, 3.25, 1.6], rough: 0.5 }), // roof air-con pod
    part(box(2.4, 0.42, 0.1), '#2b2e31', { at: [0, 0.62, -5.96], rough: 0.6 }), // bumper
    part(box(0.34, 0.16, 0.06), '#fff6dc', { at: [0.85, 0.95, -5.97], rough: 0.1 }), part(box(0.34, 0.16, 0.06), '#fff6dc', { at: [-0.85, 0.95, -5.97], rough: 0.1 }),
    wheel(0.5, 0.32, [1.12, 0.5, -3.7]), wheel(0.5, 0.32, [-1.12, 0.5, -3.7]), wheel(0.5, 0.32, [1.12, 0.5, 2.9]), wheel(0.5, 0.32, [-1.12, 0.5, 2.9]),
  ];
  if (!detail) return mergeGeometries(P);
  for (const side of [-1,1]) {
    const x = side * 1.270;
    // Sculpted sill and separate access panels, without copying official logos or fleet marks.
    for (const [z, width] of [[-2.22,1.7],[.05,2.05],[4.58,1.72]]) {
      P.push(part(rbox(.055,.58,width,.025),'#576474',{at:[side*1.23,.94,z],rough:.52}));
      P.push(part(box(.036,.049,.14),'#202a31',{at:[side*1.272,1.13,z-.47],rough:.45}));
    }
    for (const z of [-3.7,2.9]) {
      const rim = new T.CylinderGeometry(.28,.29,.036,20); rim.rotateZ(Math.PI/2);
      const hub = new T.CylinderGeometry(.12,.14,.043,14); hub.rotateZ(Math.PI/2);
      P.push(part(rim,'#899091',{at:[side*1.29,.5,z],rough:.38}),part(hub,'#363e43',{at:[side*1.316,.5,z],rough:.5}));
    }
    for (const z of (side < 0 ? [-2.97,-1.49,2.28,3.70,5.0] : [-3.9,-2.38,-.86,.66,2.18,3.70,5.0])) {
      P.push(part(box(.035,.68,1.35),'#253846',{at:[x,2.24,z],rough:.17}));
      P.push(part(box(.05,.025,1.38),'#535f69',{at:[x,1.902,z],rough:.46}));
    }
    P.push(part(rbox(.13,.24,.42,.055),'#242c30',{at:[side*1.40,2.18,-5.1],rough:.43}));
    P.push(part(box(.12,.045,.14),'#3b4143',{at:[side*1.30,2.18,-5.1],rough:.48}));
    for (const z of [-5.65,5.62]) P.push(part(box(.045,.12,.26),'#da933b',{at:[x,.82,z],rough:.31}));
    P.push(part(box(.19,.44,.065),'#b82a22',{at:[side*.95,1.08,5.97],rough:.37}));
  }
  // Auckland left-side kerb doors. Dark perimeter, separate tall glazing and shut line.
  for (const z of [-4.79,.86]) {
    P.push(part(box(.042,1.78,1.32),'#272e31',{at:[-1.288,1.68,z],rough:.42}));
    for (const dz of [-.31,.31]) P.push(part(box(.036,1.01,.53),'#21353e',{at:[-1.314,1.91,z+dz],rough:.13}));
    P.push(part(box(.041,.12,1.18),'#747e80',{at:[-1.310,.85,z],rough:.55}));
  }
  for (let i=0;i<7;i++) P.push(part(box(1.65,.035,.047),'#6c7374',{at:[0,3.425,1+i*.23],rough:.53}));
  P.push(part(box(1.95,1.01,.065),'#24333b',{at:[0,2.27,5.94],rough:.18}));
  P.push(part(box(1.22,.28,.05),'#111719',{at:[0,2.23,5.985],rough:.48}));
  for (const x of [-.65,.65]) P.push(part(box(.32,.035,.07),'#f4e8cc',{at:[x,1.03,-6.0],rough:.21}));
  for (let row=0;row<5;row++) P.push(part(box(1.46,.035,.05),'#47515a',{at:[0,.78+row*.052,5.96],rough:.59}));
  return mergeGeometries(P);
}

// Two small signs on the single close-up bus. Route only: the feed does not identify the vehicle's display or direction.
function makeBusSigns(scene) {
  const group = new T.Group(); group.name = 'fleet_bus_route_signs'; group.visible = false;
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace;
  const mat = new T.MeshBasicMaterial({map,toneMapped:false});
  for (const [w,h,y,z,front] of [[1.65,.235,3,-6.004,true],[1.16,.25,2.23,6.015,false]]) {
    const sign = new T.Mesh(new T.PlaneGeometry(w,h),mat);
    sign.position.set(0,y,z); if (front) sign.rotation.y = Math.PI;
    group.add(sign);
  }
  scene.add(group);
  return {group, set(route) {
    const label = typeof route === 'string' && /^[A-Z0-9 -]{1,10}$/i.test(route) ? route.toUpperCase() : '';
    if (group.userData.route === label) return;
    group.userData.route = label;
    ctx.fillStyle='#111719'; ctx.fillRect(0,0,256,64);
    ctx.fillStyle='#ffd077'; ctx.font='bold 49px monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(label,128,34,240); map.needsUpdate=true;
  }};
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
  for (const side of [-1,1]) {
    for (let z=-7.4; z<12; z+=1.9) {
      P.push(part(box(.075,1.15,.11),'#b8c4c6',{at:[side*4.64,3.75,z],rough:.38}));
    }
    for (let z=-1.7; z<8.4; z+=1.64) {
      P.push(part(box(.08,.94,.095),'#ccd7d5',{at:[side*3.63,6.1,z],rough:.4}));
    }
    for (const z of [-12.1,-8.6,-4.4,1.3,7.4,12.9]) {
      P.push(part(rbox(.26,.40,1.34,.12),'#253239',{at:[side*4.88,1.85,z],rough:.80}));
    }
    for (const [z0,z1] of [[-14.4,-9.5],[12.4,15.3]]) {
      for(let z=z0;z<=z1;z+=.96)P.push(part(box(.056,.90,.056),'#aeb9b6',{at:[side*4.54,2.63,z],rough:.42}));
      for(const y of [2.58,3.04])P.push(part(box(.056,.06,z1-z0),'#c6d0cd',{at:[side*4.54,y,(z0+z1)/2],rough:.34}));
    }
    P.push(part(rbox(.21,.16,.32,.045),side<0?'#913d35':'#43785f',{at:[side*2.22,8.38,-1.7]}));
  }
  P.push(part(box(1.45,.08,.13),'#e7eae0',{at:[0,10.81,-.6]}));
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
  // A single near-detail instance. Never multiply the close-up geometry by the whole live fleet.
  let closeBus = null, signs = null;
  const dummy = new T.Object3D(), col = new T.Color();
  return {
    meshes, material: mat,
    // list: [{mode, x, y, z, heading (radians, 0 = north), colour}]
    update(list, selectedId = null, cameraDistance = Infinity) {
      let featured = false;
      const n = { bus: 0, train: 0, ferry: 0 };
      for (const v of list) {
        const high = v.mode === 'bus' && v.id === selectedId && cameraDistance < 210;
        if (high && !closeBus) {
          closeBus = new T.InstancedMesh(busGeometry(true), mat, 1);
          closeBus.instanceColor = new T.InstancedBufferAttribute(new Float32Array(3), 3);
          closeBus.frustumCulled = false; closeBus.castShadow = closeBus.receiveShadow = true;
          closeBus.name = 'fleet_bus_closeup'; scene.add(closeBus); signs = makeBusSigns(scene);
        }
        const m = high ? closeBus : meshes[v.mode]; if (!m || (!high && n[v.mode] >= m.instanceMatrix.count)) continue;
        dummy.position.set(v.x, v.y, v.z); dummy.rotation.set(0, -v.heading, 0); dummy.updateMatrix();
        const slot = high ? 0 : n[v.mode]++;
        m.setMatrixAt(slot, dummy.matrix); m.setColorAt(slot, col.set(v.colour));
        if (high) {
          featured = true; m.instanceMatrix.needsUpdate = m.instanceColor.needsUpdate = true;
          signs.group.position.copy(dummy.position); signs.group.rotation.copy(dummy.rotation); signs.set(v.route);
        }
      }
      if (closeBus) { closeBus.count = featured ? 1 : 0; signs.group.visible = featured && !!signs.group.userData.route; }
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
    uniforms: { uSize: { value: phone ? 12 : 11 }, uPR: { value: 1 } },
    vertexShader: `attribute vec3 color; attribute float kind; attribute float sel; varying vec3 vC; varying float vK; varying float vS; varying float vFade; uniform float uSize; uniform float uPR;
      void main(){ vC=color; vK=kind; vS=sel; vec4 mv=modelViewMatrix*vec4(position,1.0); float d=-mv.z; vFade=smoothstep(250.0,700.0,d) * mix(.84,.23,smoothstep(1350.0,3650.0,d));
        vFade=max(vFade, sel); gl_Position=projectionMatrix*mv; gl_PointSize=uSize*uPR*(1.0+0.6*sel)*mix(1.0,0.66,smoothstep(1800.0,6500.0,d)); }`,
    fragmentShader: `varying vec3 vC; varying float vK; varying float vS; varying float vFade;
      void main(){ if(vK<0.0) discard; vec2 p=gl_PointCoord*2.0-1.0; float r = vK<0.5 ? length(p) : (vK<1.5 ? max(abs(p.x),abs(p.y))*1.05 : (abs(p.x)+abs(p.y))*0.85);
        if(r>1.0) discard; float ring=smoothstep(0.74,0.82,r); vec3 c=mix(vC, vec3(0.1,0.12,0.14), ring*0.8); float a=(1.0-smoothstep(0.92,1.0,r))*vFade; gl_FragColor=vec4(c,a); }`,
  });
  const pts = new T.Points(g, mat); pts.frustumCulled = false; pts.renderOrder = 10; scene.add(pts);
  const c = new T.Color();
  return {
    points: pts, material: mat,
    update(list, selectedId, suppressSelected = false) {
      const n = Math.min(max, list.length);
      for (let i = 0; i < n; i++) { const v = list[i]; pos.set([v.x, v.y + (v.mode === 'train' ? 16 : v.mode === 'ferry' ? 18 : 14), v.z], i * 3); c.set(v.colour); col.set([c.r, c.g, c.b], i * 3); kind[i] = suppressSelected && v.id === selectedId ? -1 : v.mode === 'bus' ? 0 : v.mode === 'train' ? 1 : 2; sel[i] = v.id === selectedId ? 1 : 0; }
      g.setDrawRange(0, n); for (const k of ['position', 'color', 'kind', 'sel']) g.attributes[k].needsUpdate = true;
    },
  };
}
