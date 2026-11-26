// roof-solar · the three.js view: the place as it stands, the roof's planes, panels, the sun and the year's sun paths.
// One rule: the sums use the measured LiDAR surface (plan.mjs, pv.mjs) and nothing drawn here changes them. The picture is built from the
// same LINZ data (look.mjs): buildings are LINZ outlines raised from the ground model to roofs read from the surface, trees are grown from
// the canopy height (surface minus ground) and sized to it, the ground is the ground model. Roof finishes, cladding, grass and paving are
// drawn for looks, not read: LINZ heights carry no materials. "Measured LiDAR surface" shows the surface the sums use, drawn as it is.
// The sun's position is the same astronomy the yield uses (sun.mjs).
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Sky } from "three/addons/objects/Sky.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { sunPosition, sunVector, daySteps } from "./sun.mjs";
import { heightAt, planeZ, inRings, cellIndex, PANEL } from "./roof.mjs";
import { drawCanopy } from "./foliage.mjs";
import { drawRoof, roofCap, nearestOnRings, ringsBox, canopyTrees } from "./look.mjs";

const UP = 2; // measured-surface view: each LiDAR cell is drawn as UP x UP quads, smoothly between the heights
const R_DRAW = 88; // metres round the point that are drawn; the ground fades out from 66 m
export const RAMP = ["#3a1536", "#654a4e", "#b0707f", "#e8c9dc", "#f6c453"]; // plum to gold, for yearly yield (a data layer, off by default)
export const rampColour = (t) => { const x = Math.max(0, Math.min(1, t)) * (RAMP.length - 1), i = Math.min(RAMP.length - 2, Math.floor(x)), a = new THREE.Color(RAMP[i]), b = new THREE.Color(RAMP[i + 1]); return a.lerp(b, x - i); };

// small value noise in the fragment shader so no surface is a flat colour
const NOISE_GLSL = `
float h31(vec3 p){ p = fract(p*vec3(.1031,.1030,.0973)); p += dot(p,p.yxz+33.33); return fract((p.x+p.y)*p.z); }
float vn3(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(mix(h31(i),h31(i+vec3(1,0,0)),f.x), mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x), f.y),
             mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x), mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),f.x), f.y), f.z); }
float fbm3(vec3 p){ float s=0., a=.5; for(int i=0;i<4;i++){ s+=a*vn3(p); p*=2.03; a*=.5; } return s; }`;
// bump from a scalar height field by screen derivatives (three's perturbNormalArb), used where no direction is known
const BUMP_GLSL = `{ vec2 dH = vec2(dFdx(bumpH), dFdy(bumpH)); vec3 sx = dFdx(-vViewPosition), sy = dFdy(-vViewPosition); vec3 R1 = cross(sy, normal), R2 = cross(normal, sx); float det = dot(sx, R1) * faceDirection;
  vec3 grad = sign(det) * (dH.x * R1 + dH.y * R2); normal = normalize(abs(det) * normal - grad); }`;

// a light grade after tone mapping: a touch of contrast and warmth, a soft vignette. Natural colour, no tint.
const GradeShader = {
  uniforms: { tDiffuse: { value: null }, uVig: { value: 0.2 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uVig; varying vec2 vUv;
    void main(){ vec4 c = texture2D(tDiffuse, vUv); vec3 x = clamp(c.rgb, 0.0, 1.0); float l = dot(x, vec3(.2126,.7152,.0722));
      x = mix(vec3(l), x, 1.12); x = mix(x, x*x*(3.0-2.0*x), 0.32); x *= vec3(1.012, 1.0, 0.988); vec2 d = vUv - 0.5; x *= 1.0 - uVig * dot(d, d) * 1.5;
      gl_FragColor = vec4(x, c.a); }`,
};

// a small deterministic random from a number, so the same building always gets the same finish
const hash = (x) => { const s = Math.sin(x * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
// finishes are drawn, not read: a palette of common New Zealand roofing and cladding colours
const ROOFS = ["#3b4448", "#454c4c", "#53595b", "#69625a", "#2e383a", "#6c5143", "#46514b", "#74797a", "#838681"];
const WALLS = ["#e9e5dc", "#d9d4c8", "#cfc8b9", "#bdb6a7", "#e3ddd2", "#a39a8a", "#c9c4bb", "#f0ece4"];

/** a box blur of a height grid, radius r cells: a cheap measure of how far below its surroundings a point sits (for contact shading) */
function blurGrid(g, r) {
  const N = g.n, a = new Float32Array(N * N), out = new Float32Array(N * N), v = (k) => (g.data[k] === g.data[k] ? g.data[k] : 0);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { let s = 0, c = 0; for (let d = -r; d <= r; d++) { const ii = i + d; if (ii >= 0 && ii < N) { s += v(j * N + ii); c++; } } a[j * N + i] = s / c; }
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { let s = 0, c = 0; for (let d = -r; d <= r; d++) { const jj = j + d; if (jj >= 0 && jj < N) { s += a[jj * N + i]; c++; } } out[j * N + i] = s / c; }
  return { n: N, originE: g.originE, originN: g.originN, data: out };
}
const nearB = (e, n, build, bb, d) => { for (let q = 0; q < build.length; q++) { const t = bb[q]; if (e < t[0] || e > t[2] || n < t[1] || n > t[3]) continue; for (const r of build[q].rings) for (let i = 0; i < r.length - 1; i++) { const [x1, y1] = r[i], [x2, y2] = r[i + 1], dx = x2 - x1, dy = y2 - y1, L = dx * dx + dy * dy, u = L ? Math.max(0, Math.min(1, ((e - x1) * dx + (n - y1) * dy) / L)) : 0; if (Math.hypot(e - (x1 + u * dx), n - (y1 + u * dy)) <= d) return true; } } return false; };

export class RoofScene {
  constructor(canvas, { tier = "high" } = {}) {
    this.canvas = canvas; this.tier = tier; this.site = null; this.sunDate = new Date(); this.heat = false; this.pathsOn = true; this.clayOn = false;
    const r = (this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true }));
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, tier === "high" ? 2 : 1.5));
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap; r.toneMapping = THREE.AgXToneMapping; r.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene(); this.scene.fog = new THREE.Fog(0xc9d3dc, 180, 900);
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.5, 9000);
    this.controls = new OrbitControls(this.camera, canvas); this.controls.enableDamping = true; this.controls.dampingFactor = 0.08; this.controls.maxPolarAngle = Math.PI * 0.485; this.controls.minDistance = 6; this.controls.maxDistance = 320;
    this.root = new THREE.Group(); this.scene.add(this.root); this.look = new THREE.Group(); this.root.add(this.look);
    // sky and light
    this.sky = new Sky(); this.sky.scale.setScalar(5000); this.scene.add(this.sky); this.sky.material.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace("gl_FragColor = vec4( retColor, 1.0 );", "gl_FragColor = vec4( retColor * 0.6, 1.0 );"); }; // the background sky a little under the light it gives, so AgX keeps its blue
    const u = this.sky.material.uniforms; u.turbidity.value = 2.2; u.rayleigh.value = 1.5; u.mieCoefficient.value = 0.004; u.mieDirectionalG.value = 0.8;
    this.sun = new THREE.DirectionalLight(0xfff1dd, 3); this.sun.castShadow = true; const S = tier === "high" ? 4096 : 2048; this.sun.shadow.mapSize.set(S, S);
    Object.assign(this.sun.shadow.camera, { left: -95, right: 95, top: 95, bottom: -95, near: 1, far: 900 }); this.sun.shadow.bias = -0.0003; this.sun.shadow.normalBias = 0.05;
    this.scene.add(this.sun, this.sun.target);
    this.hemi = new THREE.HemisphereLight(0xc4d6ec, 0x6b6450, 0.5); this.scene.add(this.hemi);
    this.pmrem = new THREE.PMREMGenerator(r); this.skyScene = new THREE.Scene(); this.skySky = new Sky(); this.skySky.scale.setScalar(5000); this.skyScene.add(this.skySky);
    // contact shading and a light grade on the high tier; phones draw straight to the screen
    if (tier === "high") {
      const c = (this.composer = new EffectComposer(r)); c.addPass(new RenderPass(this.scene, this.camera));
      this.gtao = new GTAOPass(this.scene, this.camera, 800, 600); this.gtao.updateGtaoMaterial({ radius: 0.6, distanceExponent: 1.4, thickness: 1.2, scale: 1, samples: 12 }); this.gtao.blendIntensity = 0.85; c.addPass(this.gtao);
      c.addPass(new OutputPass()); c.addPass(new ShaderPass(GradeShader));
    }
    this.pickables = []; this.ray = new THREE.Raycaster(); this.needs = true; this.resize();
    r.setAnimationLoop(() => { this.controls.update(); if (this.needs || this.controls._moved) { this.draw(); this.needs = false; } });
    this.controls.addEventListener("change", () => (this.needs = true));
    this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(canvas.parentElement);
  }
  draw() { if (this.composer) this.composer.render(); else this.renderer.render(this.scene, this.camera); }
  resize() { const p = this.canvas.parentElement, w = Math.max(200, p.clientWidth), h = Math.max(200, p.clientHeight); this.renderer.setSize(w, h, false); this.composer?.setPixelRatio(this.renderer.getPixelRatio()); this.composer?.setSize(w, h); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); this.needs = true; }
  // map (east, north, height) to scene
  toScene(e, n, z) { const s = this.site; return new THREE.Vector3(e - s.e0, z - s.z0, -(n - s.n0)); }
  fromScene(v) { const s = this.site; return { e: v.x + s.e0, n: -v.z + s.n0, z: v.y + s.z0 }; }

  clearSite() {
    for (const g of [this.root, this.look]) for (const o of [...g.children]) { if (o === this.look) continue; g.remove(o); o.traverse((c) => { c.geometry?.dispose?.(); c.customDepthMaterial?.dispose(); if (c.material) (Array.isArray(c.material) ? c.material : [c.material]).forEach((m) => { m.map?.dispose?.(); m.dispose(); }); }); }
    this.pickables = []; this.propertyLines=null; this.clay = null; this.panelMesh = this.frameMesh = this.heatMesh = this.railMesh = null;
  }

  /** draw a site. site: from loadSite; plan: { chosen planes (fitted), usable ids, panels[] with .year } */
  setSite(site, plan) {
    this.clearSite(); this.latlon = { lat: site.point.lat, lon: site.point.lon }; this.siteData = site; this.site = { e0: site.point.e, n0: site.point.n, z0: heightAt(site.dem, site.point.e, site.point.n) || site.dem.data.find((v) => v === v) || 0, dsm: site.dsm }; this.plan = plan;
    const t0 = performance.now();
    this.buildGround(site); this.buildBuildings(site, plan); this.buildTrees(site); this.buildPanels(plan.panels); this.buildPaths(site); this.buildProperty(site.property);
    this.stats = { ms: Math.round(performance.now() - t0), trees: this.trees?.length ?? 0, buildings: this.drawnBuildings ?? 0 };
    if (this.clayOn) this.setClay(true);
    const b = plan.bounds || { cx: 0, cz: 0, r: 14, top: 8 }, c = this.toScene(b.e, b.n, b.z);
    const dist = Math.max(30, b.r * 3.3), best = plan.planes.filter((p) => p.usable).sort((a, b2) => b2.panels.length - a.panels.length)[0], az = ((best ? best.azimuth : 0) + 22) * Math.PI / 180, dx = Math.sin(az), dz = -Math.cos(az); // the plane faces `az`; the camera stands out in front of it
    this.controls.target.copy(c); this.camera.position.set(c.x + dx * dist, c.y + dist * 0.55, c.z + dz * dist); this.controls.update();
    this.setSun(this.sunDate, true); this.needs = true;
  }

  buildProperty(property) {
    if(this.propertyLines){
      this.root.remove(this.propertyLines);this.propertyLines.geometry.dispose();this.propertyLines.material.dispose();
    }
    this.propertyLines=null; this.needs=true;
    if(!this.site||!property?.outlines?.length)return;
    const {e0,n0}=this.site,dem=this.siteData.dem, points=[];
    for(const g of property.outlines) {
      const rings=g.type==="Polygon"?g.coordinates:g.type==="MultiPolygon"?g.coordinates.flat():[];
      for(const ring of rings) for(let i=1;i<ring.length;i++) {
        const [e1,n1]=ring[i-1],[e2,n2]=ring[i],steps=Math.min(2000,Math.max(1,Math.ceil(Math.hypot(e1-e2,n1-n2))));
        // Large rural rings need not be sampled where the terrain isn't drawn.
        if(Math.max(e1,e2)<e0-R_DRAW||Math.min(e1,e2)>e0+R_DRAW||Math.max(n1,n2)<n0-R_DRAW||Math.min(n1,n2)>n0+R_DRAW)continue;
        let prev=null;
        for(let j=0;j<=steps;j++){
          const t=j/steps,e=e1+(e2-e1)*t,n=n1+(n2-n1)*t,z=heightAt(dem,e,n),visible=Math.hypot(e-e0,n-n0)<R_DRAW-4;
          const v=visible&&Number.isFinite(z)?this.toScene(e,n,z+.22):null;
          if(prev&&v)points.push(prev,v);
          prev=v;
        }
      }
    }
    if(!points.length)return;
    this.propertyLines=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:0xae4263}));
    this.propertyLines.name="LINZ Property Boundaries 122657"; this.root.add(this.propertyLines);
  }
  setPropertyVisible(on){
    if(this.propertyLines)this.propertyLines.visible=on;
    this.needs=true;
  }

  /** the measured surface, as the sums see it; built the first time it is asked for */
  setClay(on) {
    this.clayOn = on; if (!this.site) return;
    if (on && !this.clay) { this.clay = this.buildClay(this.siteData, this.plan); this.root.add(this.clay); }
    if (this.clay) this.clay.visible = on; this.look.visible = !on;
    this.pickables = on ? [this.clay] : this.lookPickables; this.needs = true;
  }

  // ---- ground: LINZ's ground model (DTM), drawn with grass and, round the walls, paving -----------------------------------------------------
  buildGround(site) {
    const { dem, dsm } = site, st = this.tier === "high" ? 0.5 : 1, M = Math.round((2 * R_DRAW) / st) + 1, e0 = this.site.e0, n0 = this.site.n0, z0 = this.site.z0;
    const pos = new Float32Array(M * M * 3), att = new Float32Array(M * M * 3), dist = new Float32Array(M * M).fill(99);
    const groundAt = (e, n) => { let z = heightAt(dem, e, n); if (z !== z) z = heightAt(dsm, e, n); return z === z ? z : z0; };
    // distance to the nearest wall, for paving round buildings and contact shading; worked building by building over its own window
    for (const b of site.buildings) {
      const [a, c, d, f] = ringsBox(b.rings), i0 = Math.max(0, Math.floor((a - 2.5 - (e0 - R_DRAW)) / st)), i1 = Math.min(M - 1, Math.ceil((d + 2.5 - (e0 - R_DRAW)) / st)), j0 = Math.max(0, Math.floor((n0 + R_DRAW - (f + 2.5)) / st)), j1 = Math.min(M - 1, Math.ceil((n0 + R_DRAW - (c - 2.5)) / st));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const e = e0 - R_DRAW + i * st, n = n0 + R_DRAW - j * st, k = j * M + i; const dd = inRings(e, n, b.rings) ? 0 : nearestOnRings(e, n, b.rings).d; if (dd < dist[k]) dist[k] = dd; }
    }
    for (let j = 0; j < M; j++) for (let i = 0; i < M; i++) {
      const e = e0 - R_DRAW + i * st, n = n0 + R_DRAW - j * st, k = j * M + i, z = groundAt(e, n), s = heightAt(dsm, e, n), d = dist[k];
      pos[k * 3] = e - e0; pos[k * 3 + 1] = z - z0; pos[k * 3 + 2] = -(n - n0);
      const canopy = d > 1.2 && s === s ? Math.max(0, s - z) : 0;
      att[k * 3] = d < 1.0 ? 1 : d < 1.6 ? (1.6 - d) / 0.6 : 0; // paving apron: drawn, not read
      att[k * 3 + 1] = Math.min(1, Math.max(0, (canopy - 1.5) / 3)); // under a canopy: leaf litter and shade
      att[k * 3 + 2] = 1 - 0.38 * Math.max(0, 1 - d / 2.4); // contact shading at the foot of walls
    }
    const idx = new Uint32Array((M - 1) * (M - 1) * 6); let t = 0;
    for (let j = 0; j < M - 1; j++) for (let i = 0; i < M - 1; i++) { const a = j * M + i, b = a + 1, c = a + M, d = c + 1; idx[t++] = a; idx[t++] = c; idx[t++] = b; idx[t++] = b; idx[t++] = c; idx[t++] = d; }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("aGrd", new THREE.BufferAttribute(att, 3)); g.setIndex(new THREE.BufferAttribute(idx, 1)); g.computeVertexNormals();
    const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, metalness: 0, transparent: true });
    m.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nattribute vec3 aGrd; varying vec3 vG; varying vec3 vW; varying float vUpN;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvG = aGrd; vW = (modelMatrix * vec4(position,1.)).xyz; vUpN = normal.y;");
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vG; varying vec3 vW; varying float vUpN; float bumpH;\n" + NOISE_GLSL)
        .replace("#include <color_fragment>", `#include <color_fragment>
          float big = fbm3(vW*0.045), mid = fbm3(vW*0.28), fine = vn3(vW*6.0), fine2 = vn3(vW*17.0), blade = vn3(vW*vec3(40.,4.,40.));
          vec3 g1 = vec3(0.108,0.160,0.057), g2 = vec3(0.185,0.230,0.083), dry = vec3(0.35,0.31,0.17), soil = vec3(0.30,0.24,0.16);
          vec3 grass = mix(g1, g2, smoothstep(0.3,0.7,mid)); grass = mix(grass, dry, smoothstep(0.58,0.8,big)*0.55);
          grass *= 0.82 + 0.3*fine + 0.14*(blade-0.5);
          float slope = 1.0 - clamp(vUpN, 0.0, 1.0); grass = mix(grass, soil, smoothstep(0.35,0.7,slope));
          vec3 litter = mix(vec3(0.14,0.12,0.07), vec3(0.22,0.19,0.11), fine); grass = mix(grass, litter, vG.y*0.7);
          vec2 jt = abs(fract(vW.xz/0.6) - 0.5); float joint = smoothstep(0.47, 0.495, max(jt.x, jt.y));
          vec3 pave = vec3(0.52,0.50,0.46) * (0.9 + 0.12*mid + 0.1*fine2 - 0.22*joint);
          diffuseColor.rgb = mix(grass, pave, vG.x) * vG.z;
          float rr = length(vW.xz); diffuseColor.a *= 1.0 - smoothstep(${R_DRAW - 22}.0, ${R_DRAW}.0, rr);
          bumpH = (1.0 - vG.x) * (0.02*fine + 0.012*fine2 + 0.006*blade) + vG.x * (0.004*fine2 - 0.004*joint);`)
        .replace("#include <normal_fragment_maps>", "#include <normal_fragment_maps>\n" + BUMP_GLSL);
    };
    const mesh = new THREE.Mesh(g, m); mesh.receiveShadow = true; mesh.renderOrder = -1; this.ground = mesh; this.look.add(mesh); this.lookPickables = [mesh]; this.pickables = this.lookPickables;
  }

  // ---- buildings: LINZ outlines raised to roofs read from the LiDAR surface -------------------------------------------------------------------
  buildBuildings(site, plan) {
    const { dsm, dem } = site, e0 = this.site.e0, n0 = this.site.n0, z0 = this.site.z0, hi = this.tier === "high";
    
    const edge = [], walls = { p: [], n: [], c: [], uv: [] }, roofs = { p: [], c: [], d: [], k: [] }, mine = { p: [], c: [], d: [], k: [] };
    let count = 0;
    for (const b of site.buildings) {
      const box = ringsBox(b.rings), cx = (box[0] + box[2]) / 2, cy = (box[1] + box[3]) / 2; if (Math.hypot(cx - e0, cy - n0) > R_DRAW - 6) continue;
      const isMine = b === site.chosen, rf = isMine ? drawRoof(dsm, b.rings, plan.planes, dsm) : drawRoof(dsm, b.rings), roofAt = rf.roofAt, cap = roofCap(dsm, b.rings, rf.planes, rf.grid), seed = typeof b.id === "number" ? b.id : [...String(b.id ?? cx)].reduce((s, ch) => s * 31 + ch.charCodeAt(0), 7) % 100003;
      // the foot of the walls: the lowest ground under the outline, less a little so no wall floats on a slope
      let base = Infinity; for (const r of b.rings) for (const [x, y] of r) { const z = heightAt(dem, x, y); if (z === z && z < base) base = z; } if (!isFinite(base)) base = z0; base -= 0.3;
      // LiDAR cells that straddle an eave can include the ground below it. Pull
      // a supported plane back to that edge only when the nearer return is lower.
      // The clamp and short reach keep this drawing-only repair from hiding a real
      // adjacent pitched plane. The raw switch and solar plan keep their inputs.
      const roofZ = (e, n) => {
        const q = nearestOnRings(e, n, b.rings);
        const point = (d) => [q.e + q.inE * d, q.n + q.inN * d];
        let [qe, qn] = q.d < 0.95 ? point(.95) : [e, n];
        let r = roofAt(e, n, qe, qn);
        if (q.d < 2.1 && !r.plane) {
          const [ie, inn] = point(2.1);
          if (inRings(ie, inn, b.rings)) {
            const v = roofAt(ie, inn);
            if (Number.isFinite(v.z)) {
              const proposed = v.plane ? planeZ(v.plane, e, n) : v.z;
              const dz = proposed - r.z;
              if (!Number.isFinite(r.z) || (dz > .48 && dz < 3.6)) {
                const edge = Math.max(0, Math.min(1, (2.1-q.d)/1.35));
                r = { z: Number.isFinite(r.z) ? r.z + dz * edge : proposed, plane: edge > .6 ? v.plane : null };
              }
            }
          }
        }
        return { z: Number.isFinite(r.z) ? Math.min(r.z, cap) : base + 3, plane: r.plane };
      };
      const wc = new THREE.Color(WALLS[Math.floor(hash(seed) * WALLS.length)]), rc = new THREE.Color(ROOFS[Math.floor(hash(seed + 1) * ROOFS.length)]);
      // walls: each edge in steps of at most a metre, from the foot to the roof's edge
      for (const ring of b.rings) for (let i = 0; i < ring.length - 1; i++) {
        const [x1, y1] = ring[i], [x2, y2] = ring[i + 1], L = Math.hypot(x2 - x1, y2 - y1); if (L < 0.05) continue;
        let nx = (y2 - y1) / L, ny = -(x2 - x1) / L; const mx = (x1 + x2) / 2, my = (y1 + y2) / 2; if (inRings(mx + nx * 0.05, my + ny * 0.05, b.rings)) { nx = -nx; ny = -ny; }
        const segs = Math.max(1, Math.ceil(L / 1)); let u0 = 0;
        for (let s = 0; s < segs; s++) {
          const ta = s / segs, tb = (s + 1) / segs, ea = x1 + (x2 - x1) * ta, na = y1 + (y2 - y1) * ta, eb = x1 + (x2 - x1) * tb, nb = y1 + (y2 - y1) * tb, za = roofZ(ea, na).z, zb = roofZ(eb, nb).z, u1 = u0 + L / segs;
          const A = [ea - e0, base - z0, -(na - n0)], B = [eb - e0, base - z0, -(nb - n0)], C = [eb - e0, zb - z0, -(nb - n0)], D = [ea - e0, za - z0, -(na - n0)];
          // Slim folded roof edge catches light and visually anchors the roof to the wall.
          // Do not add an overhang outside the recorded footprint.
          const oc = .013, dep = .11;
          const E = [D[0] + nx * oc, D[1] + .023, D[2] - ny * oc], F = [C[0] + nx * oc, C[1] + .023, C[2] - ny * oc];
          const G = [F[0], F[1] - dep, F[2]], H = [E[0], E[1] - dep, E[2]];
          edge.push(...E, ...F, ...G, ...E, ...G, ...H);
          for (const [P, uu, vv, top] of [[A, u0, 0, za], [B, u1, 0, zb], [C, u1, zb - base, zb], [A, u0, 0, za], [C, u1, zb - base, zb], [D, u0, za - base, za]]) { walls.p.push(...P); walls.n.push(nx, 0, -ny); walls.c.push(wc.r, wc.g, wc.b); walls.uv.push(uu, vv, top - z0); }
          u0 = u1;
        }
      }
      // roof: a grid over the outline, edge points pulled onto the outline, heights from the planes (or the surface)
      const gs = isMine ? 0.25 : hi ? 0.5 : 0.75, nx = Math.max(2, Math.ceil((box[2] - box[0]) / gs) + 1), ny = Math.max(2, Math.ceil((box[3] - box[1]) / gs) + 1);
      const vx = new Float32Array(nx * ny * 3), done = new Uint8Array(nx * ny), dir = new Float32Array(nx * ny * 2), flat = new Uint8Array(nx * ny), tgt = isMine ? mine : roofs;
      const vert = (ix, iy) => {
        const k = iy * nx + ix; if (done[k]) return k; done[k] = 1; let e = box[0] + ix * gs, n = box[1] + iy * gs;
        if (!inRings(e, n, b.rings)) { const q = nearestOnRings(e, n, b.rings); e = q.e; n = q.n; }
        const r = roofZ(e, n); vx[k * 3] = e - e0; vx[k * 3 + 1] = r.z - z0 + 0.02; vx[k * 3 + 2] = -(n - n0);
        if (r.plane) { const g = Math.hypot(r.plane.a, r.plane.b); if (g > 0.09) { dir[k * 2] = r.plane.a / g; dir[k * 2 + 1] = -r.plane.b / g; } else flat[k] = 1; } else flat[k] = 1;
        return k;
      };
      for (let iy = 0; iy < ny - 1; iy++) for (let ix = 0; ix < nx - 1; ix++) {
        const ea = box[0] + ix * gs, na = box[1] + iy * gs;
        for (const tri of [[[0, 0], [1, 0], [1, 1]], [[0, 0], [1, 1], [0, 1]]]) {
          const ce = ea + gs * (tri[0][0] + tri[1][0] + tri[2][0]) / 3, cn = na + gs * (tri[0][1] + tri[1][1] + tri[2][1]) / 3; if (!inRings(ce, cn, b.rings)) continue;
          // (e, n, z) to scene is a proper rotation, so this order faces up
          for (const [di, dj] of tri) { const k = vert(ix + di, iy + dj); tgt.p.push(vx[k * 3], vx[k * 3 + 1], vx[k * 3 + 2]); tgt.c.push(rc.r, rc.g, rc.b); tgt.d.push(dir[k * 2], dir[k * 2 + 1]); tgt.k.push(flat[k] ? 2 : hash(seed + 2) < 0.72 ? 0 : 1); }
        }
      }
      count++;
    }
    this.drawnBuildings = count;
    if (edge.length) {
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(edge,3)); g.computeVertexNormals();
      const m = new THREE.MeshStandardMaterial({color:0x505351, roughness:.72, metalness:.17, side:THREE.DoubleSide});
      const trim = new THREE.Mesh(g,m); trim.receiveShadow = true; this.look.add(trim);
    }
    const wg = new THREE.BufferGeometry(); wg.setAttribute("position", new THREE.Float32BufferAttribute(walls.p, 3)); wg.setAttribute("normal", new THREE.Float32BufferAttribute(walls.n, 3)); wg.setAttribute("color", new THREE.Float32BufferAttribute(walls.c, 3)); wg.setAttribute("aWall", new THREE.Float32BufferAttribute(walls.uv, 3));
    const wm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0, side: THREE.DoubleSide });
    wm.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nattribute vec3 aWall; varying vec3 vWall; varying float vWy;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvWall = aWall; vWy = (modelMatrix * vec4(position,1.)).y;");
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vWall; varying float vWy;\n" + NOISE_GLSL)
        .replace("#include <color_fragment>", `#include <color_fragment>
          float below = vWall.z - vWy; float fascia = 1.0 - smoothstep(0.18, 0.24, below); float foot = 1.0 - smoothstep(0.25, 0.45, vWall.y);
          float board = fract(vWy / 0.18); float lap = smoothstep(0.0, 0.08, board) * (1.0 - 0.18*smoothstep(0.75, 1.0, board));
          vec3 wc = diffuseColor.rgb * (0.86 + 0.16*lap + 0.06*vn3(vec3(vWall.x*3.0, vWy*0.5, 1.0)));
          wc *= 1.0 - 0.25*(1.0 - smoothstep(0.0, 1.4, vWall.y));
          wc = mix(wc, vec3(0.86,0.85,0.82), fascia); wc = mix(wc, vec3(0.36,0.35,0.33), foot);
          diffuseColor.rgb = wc;`)
        .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
          { float bb = fract(vWy / 0.18); float sl = (1.0 - fascia) * (1.0 - foot) * (bb < 0.08 ? -2.2 : 0.18); vec3 upV = normalize((viewMatrix * vec4(0.,1.,0.,0.)).xyz); normal = normalize(normal + upV * sl * 0.35); }`);
    };
    const wmesh = new THREE.Mesh(wg, wm); wmesh.castShadow = true; wmesh.receiveShadow = true; this.look.add(wmesh); this.lookPickables.push(wmesh);
    for (const [R, chosen] of [[roofs, false], [mine, true]]) {
      if (!R.p.length) continue;
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(R.p, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(R.c, 3)); g.setAttribute("aDir", new THREE.Float32BufferAttribute(R.d, 2)); g.setAttribute("aKind", new THREE.Float32BufferAttribute(R.k, 1)); g.computeVertexNormals();
      const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.15, side: THREE.DoubleSide, shadowSide: THREE.BackSide, envMapIntensity: 0.8 });
      m.onBeforeCompile = (sh) => {
        sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nattribute vec2 aDir; attribute float aKind; varying vec2 vDir; varying float vKind; varying vec3 vW;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvDir = aDir; vKind = aKind; vW = (modelMatrix * vec4(position,1.)).xyz;");
        sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec2 vDir; varying float vKind; varying vec3 vW; float rSlope;\n" + NOISE_GLSL)
          .replace("#include <color_fragment>", `#include <color_fragment>
            vec2 dn = length(vDir) > 0.1 ? normalize(vDir) : vec2(0.,1.); vec2 ac = vec2(-dn.y, dn.x);
            float s = dot(vW.xz, ac), t = dot(vW.xz, dn); float w = fwidth(s);
            float kTile = step(0.5, vKind) * (1.0 - step(1.5, vKind)), kFlat = step(1.5, vKind), kIron = 1.0 - kTile - kFlat;
            float corr = sin(s * 6.2832 / 0.076); float fadeC = 1.0 - smoothstep(0.016, 0.040, w);
            float row = fract(t / 0.34 + 0.5*step(0.5, fract(s / 0.42))); float tileCol = fract(s / 0.21); float fadeTile = 1.0 - smoothstep(.025, .12, fwidth(t));
            vec3 rc = diffuseColor.rgb * (0.92 + 0.1*vn3(vW*1.5) + 0.06*vn3(vW*9.0));
            rc *= mix(1.0, 0.88 + 0.12*smoothstep(0.0, 0.25, row), kTile);
            rc = mix(rc, diffuseColor.rgb * (0.8 + 0.25*fbm3(vW*2.0)), kFlat);
            rc *= 1.0 + kIron * 0.05 * corr * fadeC;
            diffuseColor.rgb = rc; rSlope = kIron * cos(s * 6.2832 / 0.076) * 0.9 * fadeC + kTile * fadeTile * (-1.2 * (1.0 - smoothstep(.04,.14,row)) + .12);`)
          .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.85, kTile + kFlat);")
          .replace("#include <metalnessmap_fragment>", "#include <metalnessmap_fragment>\nmetalnessFactor = mix(metalnessFactor, 0.0, kTile + kFlat);")
          .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
            { vec3 acV = normalize((viewMatrix * vec4(ac.x, 0., ac.y, 0.)).xyz), dnV = normalize((viewMatrix * vec4(dn.x, 0., dn.y, 0.)).xyz);
              normal = normalize(normal + (kIron * acV + kTile * dnV) * rSlope * 0.35); }`);
      };
      const mesh = new THREE.Mesh(g, m); mesh.castShadow = true; mesh.receiveShadow = true; this.look.add(mesh); this.lookPickables.push(mesh); if (chosen) this.chosenRoof = mesh;
    }
  }

  // ---- trees: grown from the canopy height, one instanced shape each, top at the measured top ---------------------------------------------
  buildTrees(site) {
    const hi = this.tier === "high", trees = canopyTrees(site.dsm, site.dem, site.buildings, { maxTrees: hi ? 700 : 280, centre: { e: this.site.e0, n: this.site.n0 }, radius: R_DRAW - 8 });
    this.trees = trees; if (!trees.length) return;
    this.look.add(drawCanopy(trees, hi, this.siteData.point, this.toScene.bind(this)));
  }

  // ---- panels: frame, glass over 108 half-cut cells, and rails at the stated stand-off ---------------------------------------------------------
  buildPanels(panels) {
    this.panelData = panels; const n = panels.length; for (const m of [this.panelMesh, this.frameMesh, this.heatMesh, this.railMesh]) if (m) this.root.remove(m);
    if (!n) { this.panelMesh = this.frameMesh = this.heatMesh = this.railMesh = null; return; }
    const W = PANEL.w, L = PANEL.l, T = 0.035, F = 0.028;
    // the cell face: 6 x 18 half-cut mono cells with bus bars on a white back sheet, drawn once (the common 430 W layout; an assumption)
    const cv = document.createElement("canvas"); cv.width = 512; cv.height = 800; const x = cv.getContext("2d"); x.fillStyle = "#d9dce0"; x.fillRect(0, 0, 512, 800);
    const cw = (512 - 16) / 6, ch = (800 - 16) / 18;
    for (let cx = 0; cx < 6; cx++) for (let cy = 0; cy < 18; cy++) {
      const px = 8 + cx * cw + 1.5, py = 8 + cy * ch + (cy === 9 ? 3 : 1), w = cw - 3, h = ch - 2.5, g = x.createLinearGradient(px, py, px + w, py + h); g.addColorStop(0, "#151a24"); g.addColorStop(1, "#0b0f17");
      x.fillStyle = g; x.beginPath(); x.roundRect(px, py, w, h, cy % 2 ? [0, 0, 6, 6] : [6, 6, 0, 0]); x.fill();
      x.strokeStyle = "rgba(205,210,220,.42)"; x.lineWidth = 1; for (let f = 1; f < 10; f++) { x.beginPath(); x.moveTo(px + (w * f) / 10, py); x.lineTo(px + (w * f) / 10, py + h); x.stroke(); }
      x.strokeStyle = "rgba(160,170,190,.08)"; for (let f = 0.15; f < 1; f += 0.15) { x.beginPath(); x.moveTo(px, py + h * f); x.lineTo(px + w, py + h * f); x.stroke(); }
    }
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const face = new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.14, metalness: 0.0, clearcoat: 1, clearcoatRoughness: 0.04, specularIntensity: 1, ior: 1.5, envMapIntensity: 1.6 });
    const glassG = new THREE.PlaneGeometry(W - 2 * F, L - 2 * F); glassG.rotateX(-Math.PI / 2); glassG.translate(0, T / 2 - 0.004, 0);
    // a hollow aluminium frame: four bars with a lip over the glass, and a back
    const bars = [new THREE.BoxGeometry(W, T, F), new THREE.BoxGeometry(W, T, F), new THREE.BoxGeometry(F, T, L - 2 * F), new THREE.BoxGeometry(F, T, L - 2 * F), new THREE.BoxGeometry(W - 2 * F, 0.004, L - 2 * F)];
    bars[0].translate(0, 0, L / 2 - F / 2); bars[1].translate(0, 0, -L / 2 + F / 2); bars[2].translate(W / 2 - F / 2, 0, 0); bars[3].translate(-W / 2 + F / 2, 0, 0); bars[4].translate(0, -T / 2 + 0.002, 0);
    const frameG = mergeGeometries(bars), frame = new THREE.MeshStandardMaterial({ color: 0xb9bec4, roughness: 0.32, metalness: 0.9 });
    this.panelMesh = new THREE.InstancedMesh(glassG, face, n); this.frameMesh = new THREE.InstancedMesh(frameG, frame, n);
    // two rails under each panel, from the roof up to the panel (the stand-off the sums assume)
    const so = PANEL.standoff, railG = mergeGeometries([new THREE.BoxGeometry(W + PANEL.gap, 0.04, 0.04).translate(0, -T / 2 - 0.02, L * 0.25), new THREE.BoxGeometry(W + PANEL.gap, 0.04, 0.04).translate(0, -T / 2 - 0.02, -L * 0.25),
      new THREE.BoxGeometry(0.05, so, 0.05).translate(-W * 0.3, -T / 2 - so / 2, L * 0.25), new THREE.BoxGeometry(0.05, so, 0.05).translate(W * 0.3, -T / 2 - so / 2, L * 0.25), new THREE.BoxGeometry(0.05, so, 0.05).translate(-W * 0.3, -T / 2 - so / 2, -L * 0.25), new THREE.BoxGeometry(0.05, so, 0.05).translate(W * 0.3, -T / 2 - so / 2, -L * 0.25)]);
    this.railMesh = new THREE.InstancedMesh(railG, new THREE.MeshStandardMaterial({ color: 0x9ea4aa, roughness: 0.4, metalness: 0.85 }), n);
    const heatG = new THREE.PlaneGeometry(W - 0.03, L - 0.03); heatG.rotateX(-Math.PI / 2); heatG.translate(0, T / 2 + 0.006, 0);
    this.heatMesh = new THREE.InstancedMesh(heatG, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.72, toneMapped: false, depthWrite: false }), n); this.heatMesh.visible = this.heat;
    const M4 = new THREE.Matrix4(), X = new THREE.Vector3(), Y = new THREE.Vector3(), Z = new THREE.Vector3();
    panels.forEach((p, i) => {
      const az = (p.azimuth * Math.PI) / 180; X.set(Math.cos(az), 0, Math.sin(az)); Y.set(p.normal[0], p.normal[2], -p.normal[1]); Z.crossVectors(X, Y).normalize(); X.crossVectors(Y, Z).normalize();
      if (p.landscape) { const t = X.clone(); X.copy(Z); Z.copy(t).negate(); }
      M4.makeBasis(X, Y, Z); M4.setPosition(this.toScene(p.e, p.n, p.z + T / 2)); for (const m of [this.panelMesh, this.frameMesh, this.heatMesh, this.railMesh]) m.setMatrixAt(i, M4);
      this.heatMesh.setColorAt(i, rampColour(p.year ? p.year.share : 0.5));
    });
    for (const m of [this.panelMesh, this.frameMesh, this.heatMesh, this.railMesh]) { m.instanceMatrix.needsUpdate = true; m.castShadow = m !== this.heatMesh; m.receiveShadow = true; m.frustumCulled = false; this.root.add(m); }
    this.heatMesh.castShadow = false; this.heatMesh.receiveShadow = false; if (this.heatMesh.instanceColor) this.heatMesh.instanceColor.needsUpdate = true;
  }
  setHeat(on) { this.heat = on; if (this.heatMesh) this.heatMesh.visible = on; this.needs = true; }
  setPaths(on) { this.pathsOn = on; if (this.paths) this.paths.visible = on; this.needs = true; }

  /** the sun's arcs over the site on the solstices and an equinox, an hourly dot on each, and the sun itself */
  buildPaths(site) {
    if (this.paths) this.root.remove(this.paths); const g = new THREE.Group(), R = 78, { lat, lon } = site.point, year = new Date().getFullYear();
    const days = [[12, 21, "#f6c453", "21 Dec"], [3, 20, "#f1e6d6", "20 Mar · 23 Sep"], [6, 21, "#7fb2d6", "21 Jun"]]; this.pathPoints = [];
    for (const [mo, d, colr, label] of days) {
      const steps = daySteps(year, mo, d, lat, lon, 10), pts = steps.map((s) => new THREE.Vector3(s.vec[0] * R, s.vec[2] * R, -s.vec[1] * R));
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: colr, transparent: true, opacity: 0.85, fog: false })); g.add(line);
      const dots = steps.filter((s, i) => i % 6 === 0).map((s) => new THREE.Vector3(s.vec[0] * R, s.vec[2] * R, -s.vec[1] * R)); const pg = new THREE.BufferGeometry().setFromPoints(dots);
      g.add(new THREE.Points(pg, new THREE.PointsMaterial({ color: colr, size: 2.2, sizeAttenuation: true, fog: false })));
      const top = pts.reduce((a, b) => (b.y > a.y ? b : a), pts[0]); g.add(this.label(label, colr, top));
    }
    this.sunBall = new THREE.Mesh(new THREE.SphereGeometry(2.6, 24, 16), new THREE.MeshBasicMaterial({ color: 0xfff3c4, fog: false, toneMapped: false })); g.add(this.sunBall);
    g.position.copy(this.toScene(this.site.e0, this.site.n0, this.site.z0 + 4)); this.paths = g; g.visible = this.pathsOn; this.root.add(g);
  }
  label(text, color, at) {
    const cv = document.createElement("canvas"); cv.width = 256; cv.height = 64; const x = cv.getContext("2d"); x.font = "500 26px 'IBM Plex Mono', monospace"; x.fillStyle = color; x.textAlign = "center"; x.fillText(text, 128, 40);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthTest: false, fog: false })); sp.scale.set(15, 3.75, 1); sp.position.copy(at).add(new THREE.Vector3(0, 5, 0)); return sp;
  }

  /** put the sun where it really is at `date`; light, sky and shadows follow */
  setSun(date, force) {
    this.sunDate = date; if (!this.site || !this.latlon) return; const ll = this.latlon;
    const p = sunPosition(date, ll.lat, ll.lon), v = sunVector(p), up = p.elevation > 0;
    this.sunPos = p; const dir = new THREE.Vector3(v[0], v[2], -v[1]);
    const c = this.controls.target; this.sun.position.copy(c).addScaledVector(dir, 400); this.sun.target.position.copy(c); this.sun.target.updateMatrixWorld();
    const k = Math.max(0, Math.min(1, p.elevation / 12)), warm = new THREE.Color(0xff9a52).lerp(new THREE.Color(0xfff4e6), Math.min(1, p.elevation / 30));
    this.sun.color.copy(warm); this.sun.intensity = up ? 3.6 * Math.pow(k, 0.6) : 0; this.sun.castShadow = up && k > 0.01;
    for (const s of [this.sky, this.skySky]) { s.material.uniforms.sunPosition.value.copy(dir); s.material.uniforms.rayleigh.value = 1.5 + (p.elevation < 8 ? 1.2 : 0); s.material.uniforms.turbidity.value = 2.2; }
    const dusk = Math.max(0, Math.min(1, (p.elevation + 6) / 12)); this.renderer.toneMappingExposure = 0.24 + 0.48 * dusk; this.hemi.intensity = 0.09 + 0.49 * dusk;
    this.scene.fog.color.setRGB(0.6 * dusk + 0.03, 0.68 * dusk + 0.04, 0.78 * dusk + 0.07);
    if (this.sunBall) this.sunBall.position.set(v[0] * 78, v[2] * 78, -v[1] * 78), (this.sunBall.visible = up);
    clearTimeout(this._env); this._env = setTimeout(() => { const old = this.envRT; this.envRT = this.pmrem.fromScene(this.skyScene, 0.02); this.scene.environment = this.envRT.texture; this.scene.environmentIntensity = 0.17 + 0.45 * dusk; old?.dispose(); this.needs = true; }, force ? 0 : 140);
    this.needs = true;
  }
  /** the point on the drawn place under a pointer, as east and north, or null */
  pick(clientX, clientY) {
    const r = this.canvas.getBoundingClientRect(); this.ray.setFromCamera(new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1), this.camera);
    const hit = this.ray.intersectObjects(this.pickables, false)[0]; return hit ? this.fromScene(hit.point) : null;
  }
  dispose() { this.renderer.setAnimationLoop(null); this.observer?.disconnect(); this.controls.dispose(); clearTimeout(this._env); this.clearSite(); this.envRT?.dispose(); this.pmrem.dispose(); this.renderer.dispose(); }
  /** the measured surface (DSM) as one clay sheet, as the page drew it before: what the shade sums walk across */
  buildClay(site, plan) {
    const { dsm, dem } = site, N = dsm.n, M = (N - 1) * UP + 1, pos = new Float32Array(M * M * 3), col = new Float32Array(M * M * 3), wr = new Float32Array(M * M), wv = new Float32Array(M * M), agl = new Float32Array(M * M), aoA = new Float32Array(M * M), blur = blurGrid(dsm, 3);
    const build = site.buildings, chosen = site.chosen, planeMask = new Map(); for (const p of plan.planes) for (const k of p.cells) planeMask.set(k, p);
    const bb = build.map((b) => { let a = 1e9, c = 1e9, d = -1e9, e = -1e9; for (const r of b.rings) for (const [x, y] of r) { if (x < a) a = x; if (x > d) d = x; if (y < c) c = y; if (y > e) e = y; } return [a - 1.5, c - 1.5, d + 1.5, e + 1.5]; });
    const ground = new THREE.Color("#8a8a70"), veg = new THREE.Color("#8a8a70"), roof = new THREE.Color("#7b7e84"), mine = new THREE.Color("#53575d");
    for (let j = 0; j < M; j++) for (let i = 0; i < M; i++) {
      const e = dsm.originE + i / UP, n = dsm.originN - j / UP, k = j * M + i; let z = heightAt(dsm, e, n), zg = heightAt(dem, e, n);
      if (z !== z) z = zg === zg ? zg : this.site.z0; if (zg !== zg) zg = z;
      let inB = false, isChosen = false;
      for (let q = 0; q < build.length; q++) { const t = bb[q]; if (e < t[0] || e > t[2] || n < t[1] || n > t[3]) continue; if (inRings(e, n, build[q].rings)) { inB = true; if (build[q] === chosen) isChosen = true; break; } }
      const diff = z - zg; let c = ground, kd = 0;
      if (inB && diff > 0.8) { c = isChosen ? mine : roof; kd = 1;
        if (isChosen) { const ci = cellIndex(dsm, e, n), p = ci >= 0 ? planeMask.get(ci) : null; if (p) z = planeZ(p, e, n); } }
      else if (diff > 0.6) { if (nearB(e, n, build, bb, 1.6) && diff > 1.5) { c = roof; kd = 1; } else { c = veg; kd = 2; } }
      pos[k * 3] = e - this.site.e0; pos[k * 3 + 1] = z - this.site.z0; pos[k * 3 + 2] = -(n - this.site.n0); col[k * 3] = c.r; col[k * 3 + 1] = c.g; col[k * 3 + 2] = c.b; wr[k] = kd === 1 ? 1 : 0; wv[k] = kd === 2 ? 1 : 0; agl[k] = Math.max(0, diff); { const bz = heightAt(blur, e, n); aoA[k] = bz === bz ? 1 - Math.max(0, Math.min(0.75, (bz - z) * 0.1)) : 1; }
    }
    const idx = new Uint32Array((M - 1) * (M - 1) * 6); let t = 0;
    for (let j = 0; j < M - 1; j++) for (let i = 0; i < M - 1; i++) { const a = j * M + i, b = a + 1, c = a + M, d = c + 1; idx[t++] = a; idx[t++] = c; idx[t++] = b; idx[t++] = b; idx[t++] = c; idx[t++] = d; }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.BufferAttribute(col, 3)); g.setAttribute("wRoof", new THREE.BufferAttribute(wr, 1)); g.setAttribute("wVeg", new THREE.BufferAttribute(wv, 1)); g.setAttribute("agl", new THREE.BufferAttribute(agl, 1)); g.setAttribute("ao", new THREE.BufferAttribute(aoA, 1)); g.setIndex(new THREE.BufferAttribute(idx, 1)); g.computeVertexNormals();
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0, side: THREE.FrontSide });
    m.transparent = true;
    m.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nattribute float wRoof; attribute float wVeg; attribute float agl; attribute float ao; varying float vR; varying float vV; varying float vAgl; varying float vAo; varying vec3 vW;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvR = wRoof; vV = wVeg; vAgl = agl; vAo = ao; vW = (modelMatrix * vec4(position,1.)).xyz;");
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying float vR; varying float vV; varying float vAgl; varying float vAo; varying vec3 vW; float bumpH;\n" + NOISE_GLSL)
        .replace("#include <color_fragment>", `#include <color_fragment>
          float big = fbm3(vW*0.22), mid = fbm3(vW*1.3), fine = vn3(vW*7.0), fine2 = vn3(vW*11.0);
          vec3 gc = diffuseColor.rgb * (0.74 + 0.55*big + 0.2*(mid-0.5) + 0.16*(fine-0.5) + 0.1*(fine2-0.5));
          vec3 rc = diffuseColor.rgb * (0.88 + 0.18*vn3(vW*3.0) + 0.14*(fine-0.5) + 0.08*(fine2-0.5));
          float leaf = 0.55*mid + 0.3*fine + 0.15*fine2; vec3 dark = vec3(0.075,0.13,0.055), light = vec3(0.27,0.38,0.12);
          vec3 lc = mix(dark, light, clamp(0.25 + vAgl*0.035 + (leaf-0.5)*1.1, 0.0, 1.0)); lc += vec3(0.05,0.03,-0.01)*(big-0.5);
          diffuseColor.rgb = mix(mix(gc, rc, clamp(vR,0.,1.)), lc, clamp(vV,0.,1.)) * mix(0.55, 1.0, vAo);
          float rr = length(vW.xz); diffuseColor.a *= 1.0 - smoothstep(66.0, 88.0, rr);
          bumpH = clamp(vV,0.,1.) * (0.9*mid + 0.5*fine + 0.15*fine2) * 0.9 + clamp(vR,0.,1.) * (0.4*fine + 0.25*fine2) * 0.25 + (1.0 - max(clamp(vV,0.,1.), clamp(vR,0.,1.))) * (0.5*fine + 0.4*fine2) * 0.18;`)
        .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
          { vec2 dH = vec2(dFdx(bumpH), dFdy(bumpH)); vec3 sx = dFdx(-vViewPosition), sy = dFdy(-vViewPosition); vec3 R1 = cross(sy, normal), R2 = cross(normal, sx); float det = dot(sx, R1) * faceDirection;
            vec3 grad = sign(det) * (dH.x * R1 + dH.y * R2); normal = normalize(abs(det) * normal - grad); }`)
    };
    const mesh = new THREE.Mesh(g, m); mesh.castShadow = true; mesh.receiveShadow = true; return mesh;
  }

}
