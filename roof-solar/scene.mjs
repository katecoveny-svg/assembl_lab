// roof-solar · the three.js view: the LiDAR surface as a landscape, the roof's planes, panels, the sun and the year's sun paths.
// One rule: what is drawn is what the sums used. The land is the LINZ 1 m surface, drawn as it is; the chosen roof is the planes fitted
// to it. Nothing here adds a tree, a wall or a window. The sun's position is the same astronomy the yield uses (sun.mjs).
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Sky } from "three/addons/objects/Sky.js";
import { sunPosition, sunVector, daySteps } from "./sun.mjs";
import { heightAt, planeZ, inRings, cellIndex, PANEL } from "./roof.mjs";

const UP = 2; // each LiDAR cell is drawn as UP x UP quads, smoothly between the heights
export const RAMP = ["#3a1536", "#654a4e", "#b0707f", "#e8c9dc", "#f6c453"]; // plum to gold, for yearly yield
export const rampColour = (t) => { const x = Math.max(0, Math.min(1, t)) * (RAMP.length - 1), i = Math.min(RAMP.length - 2, Math.floor(x)), a = new THREE.Color(RAMP[i]), b = new THREE.Color(RAMP[i + 1]); return a.lerp(b, x - i); };

// small value noise in the fragment shader so no surface is a flat colour: leaf, grass, slate, paving all break up
const NOISE_GLSL = `
float h31(vec3 p){ p = fract(p*vec3(.1031,.1030,.0973)); p += dot(p,p.yxz+33.33); return fract((p.x+p.y)*p.z); }
float vn3(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(mix(h31(i),h31(i+vec3(1,0,0)),f.x), mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x), f.y),
             mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x), mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),f.x), f.y), f.z); }
float fbm3(vec3 p){ float s=0., a=.5; for(int i=0;i<4;i++){ s+=a*vn3(p); p*=2.03; a*=.5; } return s; }`;

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
    this.canvas = canvas; this.tier = tier; this.site = null; this.sunDate = new Date(); this.heat = false; this.pathsOn = true;
    const r = (this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true }));
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, tier === "high" ? 2 : 1.5));
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap; r.toneMapping = THREE.ACESFilmicToneMapping; r.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene(); this.scene.fog = new THREE.Fog(0xb9c6d4, 260, 900);
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.5, 9000);
    this.controls = new OrbitControls(this.camera, canvas); this.controls.enableDamping = true; this.controls.dampingFactor = 0.08; this.controls.maxPolarAngle = Math.PI * 0.485; this.controls.minDistance = 6; this.controls.maxDistance = 320;
    this.root = new THREE.Group(); this.scene.add(this.root);
    // sky and light
    this.sky = new Sky(); this.sky.scale.setScalar(5000); this.scene.add(this.sky);
    const u = this.sky.material.uniforms; u.turbidity.value = 4; u.rayleigh.value = 1.1; u.mieCoefficient.value = 0.004; u.mieDirectionalG.value = 0.8;
    this.sun = new THREE.DirectionalLight(0xfff1dd, 3); this.sun.castShadow = true; const S = tier === "high" ? 4096 : 2048; this.sun.shadow.mapSize.set(S, S);
    Object.assign(this.sun.shadow.camera, { left: -110, right: 110, top: 110, bottom: -110, near: 1, far: 900 }); this.sun.shadow.bias = -0.0004; this.sun.shadow.normalBias = 0.07; this.sun.shadow.radius = 2.5;
    this.scene.add(this.sun, this.sun.target);
    this.hemi = new THREE.HemisphereLight(0xaec6e6, 0x5a5547, 0.5); this.scene.add(this.hemi);
    this.pmrem = new THREE.PMREMGenerator(r); this.skyScene = new THREE.Scene(); this.skySky = new Sky(); this.skySky.scale.setScalar(5000); this.skyScene.add(this.skySky);
    this.pickables = []; this.ray = new THREE.Raycaster(); this.needs = true; this.resize();
    r.setAnimationLoop(() => { this.controls.update(); if (this.needs || this.controls._moved) { r.render(this.scene, this.camera); this.needs = false; } });
    this.controls.addEventListener("change", () => (this.needs = true));
    new ResizeObserver(() => this.resize()).observe(canvas.parentElement);
  }
  resize() { const p = this.canvas.parentElement, w = Math.max(200, p.clientWidth), h = Math.max(200, p.clientHeight); this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); this.needs = true; }
  // map (east, north, height) to scene
  toScene(e, n, z) { const s = this.site; return new THREE.Vector3(e - s.e0, z - s.z0, -(n - s.n0)); }
  fromScene(v) { const s = this.site; return { e: v.x + s.e0, n: -v.z + s.n0, z: v.y + s.z0 }; }

  clearSite() { for (const o of [...this.root.children]) { this.root.remove(o); o.traverse((c) => { c.geometry?.dispose?.(); if (c.material) (Array.isArray(c.material) ? c.material : [c.material]).forEach((m) => { m.map?.dispose?.(); m.dispose(); }); }); } this.pickables = []; }

  /** draw a site. site: from loadSite; plan: { chosen planes (fitted), usable ids, panels[] with .year } */
  setSite(site, plan) {
    this.clearSite(); this.latlon = { lat: site.point.lat, lon: site.point.lon }; this.site = { e0: site.point.e, n0: site.point.n, z0: heightAt(site.dem, site.point.e, site.point.n) || site.dem.data.find((v) => v === v) || 0, dsm: site.dsm }; this.plan = plan;
    this.buildTerrain(site, plan); this.buildPanels(plan.panels); this.buildPaths(site);
    const b = plan.bounds || { cx: 0, cz: 0, r: 14, top: 8 }, c = this.toScene(b.e, b.n, b.z);
    const dist = Math.max(30, b.r * 3.3), best = plan.planes.filter((p) => p.usable).sort((a, b2) => b2.panels.length - a.panels.length)[0], az = ((best ? best.azimuth : 0) + 22) * Math.PI / 180, dx = Math.sin(az), dz = -Math.cos(az); // the plane faces `az`; the camera stands out in front of it
    this.controls.target.copy(c); this.camera.position.set(c.x + dx * dist, c.y + dist * 0.55, c.z + dz * dist); this.controls.update();
    this.setSun(this.sunDate, true); this.needs = true;
  }

  buildTerrain(site, plan) {
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
    const mesh = new THREE.Mesh(g, m); mesh.castShadow = true; mesh.receiveShadow = true; this.terrain = mesh; this.root.add(mesh); this.pickables.push(mesh);
  }

  buildPanels(panels) {
    this.panelData = panels; const n = panels.length; if (this.panelMesh) { this.root.remove(this.panelMesh, this.frameMesh, this.heatMesh); }
    if (!n) { this.panelMesh = this.frameMesh = this.heatMesh = null; return; }
    const W = PANEL.w, L = PANEL.l, T = 0.04;
    // the cell face: 6 x 10 mono-crystalline cells with bus bars, drawn once
    const cv = document.createElement("canvas"); cv.width = 384; cv.height = 640; const x = cv.getContext("2d"); x.fillStyle = "#0b1226"; x.fillRect(0, 0, 384, 640);
    for (let cx = 0; cx < 6; cx++) for (let cy = 0; cy < 10; cy++) { const px = 6 + cx * 62, py = 6 + cy * 62, g = x.createLinearGradient(px, py, px + 58, py + 58); g.addColorStop(0, "#1b2f5f"); g.addColorStop(1, "#101c3e"); x.fillStyle = g; x.fillRect(px, py, 58, 58);
      x.strokeStyle = "rgba(190,205,235,.35)"; x.lineWidth = 1; for (const f of [0.33, 0.66]) { x.beginPath(); x.moveTo(px + 58 * f, py); x.lineTo(px + 58 * f, py + 58); x.stroke(); } for (let f = 0.1; f < 1; f += 0.2) { x.strokeStyle = "rgba(160,175,205,.10)"; x.beginPath(); x.moveTo(px, py + 58 * f); x.lineTo(px + 58, py + 58 * f); x.stroke(); } }
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const face = new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.22, metalness: 0.35, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.4 });
    const glassG = new THREE.PlaneGeometry(W - 0.03, L - 0.03); glassG.rotateX(-Math.PI / 2); glassG.translate(0, T / 2 + 0.002, 0);
    const frameG = new THREE.BoxGeometry(W, T, L); const frame = new THREE.MeshStandardMaterial({ color: 0xaeb4bd, roughness: 0.38, metalness: 0.85 });
    this.panelMesh = new THREE.InstancedMesh(glassG, face, n); this.frameMesh = new THREE.InstancedMesh(frameG, frame, n);
    const heatG = new THREE.PlaneGeometry(W - 0.03, L - 0.03); heatG.rotateX(-Math.PI / 2); heatG.translate(0, T / 2 + 0.006, 0);
    this.heatMesh = new THREE.InstancedMesh(heatG, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.72, toneMapped: false, depthWrite: false }), n); this.heatMesh.visible = this.heat;
    const M4 = new THREE.Matrix4(), X = new THREE.Vector3(), Y = new THREE.Vector3(), Z = new THREE.Vector3();
    panels.forEach((p, i) => {
      const az = (p.azimuth * Math.PI) / 180; X.set(Math.cos(az), 0, Math.sin(az)); Y.set(p.normal[0], p.normal[2], -p.normal[1]); Z.crossVectors(X, Y).normalize(); X.crossVectors(Y, Z).normalize();
      if (p.landscape) { const t = X.clone(); X.copy(Z); Z.copy(t).negate(); }
      M4.makeBasis(X, Y, Z); M4.setPosition(this.toScene(p.e, p.n, p.z + T / 2)); for (const m of [this.panelMesh, this.frameMesh, this.heatMesh]) m.setMatrixAt(i, M4);
      this.heatMesh.setColorAt(i, rampColour(p.year ? p.year.share : 0.5));
    });
    for (const m of [this.panelMesh, this.frameMesh, this.heatMesh]) { m.instanceMatrix.needsUpdate = true; m.castShadow = m !== this.heatMesh; m.receiveShadow = true; m.frustumCulled = false; this.root.add(m); }
    this.heatMesh.castShadow = false; this.heatMesh.receiveShadow = false; if (this.heatMesh.instanceColor) this.heatMesh.instanceColor.needsUpdate = true;
  }
  setHeat(on) { this.heat = on; if (this.heatMesh) this.heatMesh.visible = on; this.needs = true; }
  setPaths(on) { this.pathsOn = on; if (this.paths) this.paths.visible = on; this.needs = true; }

  /** the sun's arcs over the site on the solstices and an equinox, an hourly dot on each, and the sun itself */
  buildPaths(site) {
    if (this.paths) this.root.remove(this.paths); const g = new THREE.Group(), R = 78, { lat, lon } = site.point, year = new Date().getFullYear();
    const days = [[12, 21, "#f6c453", "21 Dec"], [3, 20, "#e8c9dc", "20 Mar · 23 Sep"], [6, 21, "#7fb2d6", "21 Jun"]]; this.pathPoints = [];
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
    const p = sunPosition(date, ll.lat, ll.lon), v = sunVector(p), el = Math.max(p.elevation, -6), up = p.elevation > 0;
    this.sunPos = p; const dir = new THREE.Vector3(v[0], v[2], -v[1]);
    const c = this.controls.target; this.sun.position.copy(c).addScaledVector(dir, 400); this.sun.target.position.copy(c); this.sun.target.updateMatrixWorld();
    const k = Math.max(0, Math.min(1, p.elevation / 12)), warm = new THREE.Color(0xff9a52).lerp(new THREE.Color(0xfff1dd), Math.min(1, p.elevation / 30));
    this.sun.color.copy(warm); this.sun.intensity = up ? 4.2 * Math.pow(k, 0.6) : 0; this.sun.castShadow = up && k > 0.01;
    for (const s of [this.sky, this.skySky]) { s.material.uniforms.sunPosition.value.copy(dir); s.material.uniforms.rayleigh.value = 1.1 + (p.elevation < 8 ? 1.4 : 0); }
    const dusk = Math.max(0, Math.min(1, (p.elevation + 6) / 12)); this.renderer.toneMappingExposure = 0.18 + 0.42 * dusk; this.hemi.intensity = 0.1 + 0.3 * dusk;
    this.scene.fog.color.setRGB(0.55 * dusk + 0.03, 0.62 * dusk + 0.04, 0.72 * dusk + 0.07);
    if (this.sunBall) this.sunBall.position.set(v[0] * 78, v[2] * 78, -v[1] * 78), (this.sunBall.visible = up);
    clearTimeout(this._env); this._env = setTimeout(() => { const old = this.envRT; this.envRT = this.pmrem.fromScene(this.skyScene, 0.02); this.scene.environment = this.envRT.texture; this.scene.environmentIntensity = 0.12 + 0.34 * dusk; old?.dispose(); this.needs = true; }, force ? 0 : 140);
    this.needs = true;
  }
  /** the point on the surface under a pointer, as east and north, or null */
  pick(clientX, clientY) {
    const r = this.canvas.getBoundingClientRect(); this.ray.setFromCamera(new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1), this.camera);
    const hit = this.ray.intersectObjects(this.pickables, false)[0]; return hit ? this.fromScene(hit.point) : null;
  }
  dispose() { this.renderer.setAnimationLoop(null); this.clearSite(); this.renderer.dispose(); }
}
