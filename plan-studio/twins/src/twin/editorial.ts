// The editorial look for a dropped plan: a soft painted sky that lights the scene, warm haze,
// clear glass with the rooms lit behind it, a timber soffit with downlights, Scandinavian
// furniture built in code, and native planting set around whatever footprint the plan has.
// The furniture, material and planting builders come from the assembl WebGPU studio prototype.
import * as THREE from 'three/webgpu';
import {
  createBoucleFabricTextures,
  createHonedConcreteTextures,
  createNzHillsideTextures,
  createScandiOakTextures,
  createVeincutTravertineTextures,
  createZelligeTileTextures,
} from './pbrTextures';
import { addContactShadow, buildBarStool, createLatheVesselGeo, createRoundedBoxGeo, type InteriorMaterials } from './scandiInteriors';
import { buildNzNativeLandscape, type SwayNode } from './nzNativeFlora';

export type Mood = 'day' | 'golden' | 'dusk';

/** light, haze and exposure for each mood */
export const LOOK: Record<Mood, { sun: number; sunI: number; hemi: number; fill: number; fog: number; fogDensity: number; env: number; exposure: number; rooms: number }> = {
  day: { sun: 0xfff8ee, sunI: 3.4, hemi: 0.7, fill: 0.45, fog: 0xdfe6ec, fogDensity: 0.008, env: 0.62, exposure: 0.9, rooms: 0.16 },
  golden: { sun: 0xffd2a0, sunI: 3.6, hemi: 0.55, fill: 0.45, fog: 0xe2d3c6, fogDensity: 0.011, env: 0.6, exposure: 0.96, rooms: 0.26 },
  dusk: { sun: 0xff9b66, sunI: 0.9, hemi: 0.36, fill: 0.18, fog: 0x3a3144, fogDensity: 0.009, env: 0.5, exposure: 1.1, rooms: 0.8 },
};

/** an equirectangular sky gradient with the sun's glow at its centre column (u = 0.5) */
export function editorialSky(mood: Mood): THREE.CanvasTexture {
  const W = 1024, H = 512;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 0, H);
  const stops: [number, string][] =
    mood === 'dusk'
      ? [[0, '#1f1d30'], [0.28, '#473d5a'], [0.45, '#b98679'], [0.5, '#f1bd90'], [0.53, '#6d6470'], [0.62, '#3d3a40'], [1, '#1c1d20']]
      : mood === 'golden'
        ? [[0, '#55729a'], [0.3, '#a9b9cb'], [0.44, '#ecd5c2'], [0.5, '#fbe7d2'], [0.525, '#b8aa9a'], [0.62, '#77745f'], [1, '#3a4032']]
        : [[0, '#4d7db6'], [0.34, '#9fc2e3'], [0.5, '#e8f0f6'], [0.53, '#aab0a4'], [0.62, '#70755f'], [1, '#3a4433']];
  for (const [t, col] of stops) grad.addColorStop(t, col);
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  // the sun's glow, low for golden hour and dusk
  const sy = mood === 'day' ? 120 : mood === 'golden' ? 205 : 246;
  for (const dx of [-W, 0, W]) {
    const sg = g.createRadialGradient(W / 2 + dx, sy, 4, W / 2 + dx, sy, mood === 'day' ? 150 : 210);
    sg.addColorStop(0, 'rgba(255,246,226,0.95)');
    sg.addColorStop(0.22, mood === 'dusk' ? 'rgba(255,180,128,0.5)' : 'rgba(255,236,202,0.42)');
    sg.addColorStop(1, 'rgba(255,205,160,0)');
    g.fillStyle = sg;
    g.fillRect(0, 0, W, H / 2 + 14);
  }
  // long, thin cloud bands near the horizon
  let s = 7;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 26; i++) {
    const x = rnd() * W, y = H * (0.3 + rnd() * 0.17), w = 90 + rnd() * 240, h = 5 + rnd() * 10;
    const cg = g.createRadialGradient(x, y, 0, x, y, w);
    cg.addColorStop(0, mood === 'dusk' ? 'rgba(240,170,150,0.16)' : 'rgba(255,250,244,0.2)');
    cg.addColorStop(1, 'rgba(255,250,244,0)');
    g.save();
    g.translate(0, y); g.scale(1, h / w); g.translate(0, -y);
    g.fillStyle = cg;
    for (const dx of [-W, 0, W]) { g.beginPath(); g.arc(x + dx, y, w, 0, Math.PI * 2); g.fill(); }
    g.restore();
  }
  const t = new THREE.CanvasTexture(c);
  t.mapping = THREE.EquirectangularReflectionMapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

// --- interior materials --------------------------------------------------------------------------
let mats: InteriorMaterials | null = null;
export function scandiMats(): InteriorMaterials {
  if (mats) return mats;
  const oakTex = createScandiOakTextures();
  const oakMat = new THREE.MeshStandardMaterial({ name: 'european_oak_oiled', map: oakTex.map, roughnessMap: oakTex.roughnessMap, bumpMap: oakTex.bumpMap, bumpScale: 0.025, roughness: 0.4, envMapIntensity: 0.9 });
  const concreteTex = createHonedConcreteTextures();
  const boucleTex = createBoucleFabricTextures('#ebe4d8');
  const boucleMat = new THREE.MeshPhysicalMaterial({ name: 'boucle_wool', map: boucleTex.map, roughnessMap: boucleTex.roughnessMap, bumpMap: boucleTex.bumpMap, bumpScale: 0.032, roughness: 0.94, sheen: 0.65, sheenColor: new THREE.Color(0xf7f1e6), sheenRoughness: 0.82 });
  const linenMat = new THREE.MeshPhysicalMaterial({ name: 'linen', color: 0xe6dfd3, roughness: 0.92, sheen: 0.45, sheenColor: new THREE.Color(0xf5efe5), sheenRoughness: 0.85 });
  const terracottaMat = new THREE.MeshPhysicalMaterial({ name: 'terracotta_wool', color: 0x9f6448, roughness: 0.86, sheen: 0.35, sheenColor: new THREE.Color(0xc98b6c), sheenRoughness: 0.88 });
  const travertineTex = createVeincutTravertineTextures();
  const travertineMat = new THREE.MeshStandardMaterial({ name: 'veincut_travertine', map: travertineTex.map, roughnessMap: travertineTex.roughnessMap, bumpMap: travertineTex.bumpMap, bumpScale: 0.028, roughness: 0.36, envMapIntensity: 1.1 });
  const zelligeTex = createZelligeTileTextures();
  const zelligeMat = new THREE.MeshPhysicalMaterial({ name: 'zellige_tile', map: zelligeTex.map, roughnessMap: zelligeTex.roughnessMap, bumpMap: zelligeTex.bumpMap, bumpScale: 0.025, roughness: 0.22, clearcoat: 0.85, clearcoatRoughness: 0.14, envMapIntensity: 1.45 });
  mats = {
    oakMat,
    linenMat,
    boucleMat,
    terracottaMat,
    stoneMat: new THREE.MeshStandardMaterial({ name: 'honed_stone', map: concreteTex.map, color: 0xdfd8cc, roughness: 0.34, envMapIntensity: 1.05 }),
    travertineMat,
    zelligeMat,
    joineryMat: new THREE.MeshStandardMaterial({ name: 'matt_black_steel', color: 0x151619, roughness: 0.24, metalness: 0.88, envMapIntensity: 1.45 }),
    tapwareMat: new THREE.MeshStandardMaterial({ name: 'brushed_bronze', color: 0xa47a52, roughness: 0.2, metalness: 0.94, envMapIntensity: 1.6 }),
    plasterMat: new THREE.MeshStandardMaterial({ name: 'plaster', color: 0xf4f0ea, roughness: 0.84 }),
  };
  return mats;
}

/** tag a code-built suite so it can be picked, moved and listed like any other furniture */
export function suite(o: THREE.Object3D, name: string, material: string) {
  o.userData = { kind: 'furniture', name, source: 'proposed', material, note: 'Modelled in code; a proposal, not from the plan.' };
  o.traverse((c) => {
    const m = c as THREE.Mesh;
    if (m.isMesh && !(m.material as THREE.Material).transparent) m.receiveShadow = true;
  });
  return o;
}

// --- glass, soffit, ground -------------------------------------------------------------------------
/** clear glazing with sharp sky reflections, the rooms visible behind it; and a light timber soffit */
export function applyEditorial(model: THREE.Object3D) {
  const M = scandiMats();
  const seen = new Set<THREE.Material>();
  let soffits = 0;
  model.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    if (o.name === 'framing_core') { mesh.material = (core ??= new THREE.MeshStandardMaterial({ name: 'wall_core_shadow', color: 0x2a2b2d, roughness: 0.8 })); return; }
    if (o.name === 'soffit_and_underlay') {
      mesh.material = soffitMat(M);
      soffits++;
      return;
    }
    const m = mesh.material as THREE.MeshPhysicalMaterial;
    if (!m || Array.isArray(m) || seen.has(m)) return;
    seen.add(m);
    if (/decking/.test(m.name ?? '')) { m.color.set(0xa9805f); m.envMapIntensity = 0.4; m.needsUpdate = true; }
    if (/glass/.test(m.name ?? '')) {
      m.transmission = 0; m.transparent = true; m.opacity = 0.09; m.color.set(0xc9dde0); m.roughness = 0.03; m.metalness = 0;
      m.envMapIntensity = 1.0; m.clearcoat = 1; m.clearcoatRoughness = 0.04; m.depthWrite = false; m.side = THREE.DoubleSide; m.userData.day = true; m.needsUpdate = true;
    }
  });
  return soffits;
}
let soffit: THREE.MeshStandardMaterial | null = null;
let core: THREE.MeshStandardMaterial | null = null;
function soffitMat(M: InteriorMaterials) {
  if (soffit) return soffit;
  const t = createScandiOakTextures();
  for (const x of [t.map, t.roughnessMap, t.bumpMap]) x.repeat.set(0.5, 0.5);
  soffit = new THREE.MeshStandardMaterial({ name: 'timber_soffit_lining', map: t.map, roughnessMap: t.roughnessMap, bumpMap: t.bumpMap, bumpScale: 0.02, roughness: 0.55, color: 0xf2e6d6, envMapIntensity: 0.8 });
  void M;
  return soffit;
}

/** muted hillside ground: olive grass and leaf litter, quiet enough to sit behind the building */
export function hillsideMat(tileMetres: number) {
  const t = createNzHillsideTextures();
  // the caller's UVs count in `tileMetres`; one texture tile reads well at about 7.5 m
  const r = tileMetres / 17;
  for (const x of [t.map, t.roughnessMap, t.bumpMap]) x.repeat.set(r, r);
  const m = new THREE.MeshStandardMaterial({ name: 'hillside_grass', map: t.map, roughnessMap: t.roughnessMap, bumpMap: t.bumpMap, bumpScale: 0.35, roughness: 0.95, envMapIntensity: 0.5 });
  m.color.setRGB(1.42, 1.36, 1.06);
  return m;
}

// --- downlights under the eaves ----------------------------------------------------------------------
let poolTex: THREE.CanvasTexture | null = null;
function pool() {
  if (poolTex) return poolTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const r = g.createRadialGradient(64, 64, 2, 64, 64, 62);
  r.addColorStop(0, 'rgba(255,236,200,1)');
  r.addColorStop(0.18, 'rgba(255,214,160,0.55)');
  r.addColorStop(0.5, 'rgba(255,200,140,0.16)');
  r.addColorStop(1, 'rgba(255,200,140,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 128, 128);
  poolTex = new THREE.CanvasTexture(c);
  poolTex.colorSpace = THREE.SRGBColorSpace;
  return poolTex;
}
export interface EaveRun { a: THREE.Vector3; b: THREE.Vector3; out: THREE.Vector3 }
/**
 * Recessed downlights in the soffit along each glazed wall: a small lit lens, and the pool of light it
 * throws on the soffit and down the wall. `runs` are wall lines at floor level with their outward normal.
 */
export function eaveLights(model: THREE.Object3D, runs: EaveRun[]) {
  const g = new THREE.Group();
  g.name = 'eave_downlights';
  g.userData = { kind: 'lighting', name: 'Soffit downlights', source: 'proposed', note: 'Proposed: recessed LED downlights at about 1.5 m centres over the glazed walls.' };
  const soffits: THREE.Object3D[] = [];
  model.traverse((o) => { if (o.name === 'soffit_and_underlay') soffits.push(o); });
  if (!soffits.length) return g;
  const lens = new THREE.MeshStandardMaterial({ name: 'downlight_lens', color: 0xfff1d6, emissive: 0xffd9a0, emissiveIntensity: 5 });
  const glow = new THREE.MeshBasicMaterial({ name: 'downlight_pool', map: pool(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.9, side: THREE.DoubleSide, fog: false });
  const wash = glow.clone(); wash.opacity = 0.2;
  const ray = new THREE.Raycaster();
  const up = new THREE.Vector3(0, 1, 0);
  const lensGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.012, 20);
  const mats: THREE.MeshBasicMaterial[] = [glow, wash];
  for (const r of runs) {
    const len = r.a.distanceTo(r.b);
    const n = Math.max(1, Math.round(len / 1.5));
    for (let i = 0; i < n; i++) {
      const p = r.a.clone().lerp(r.b, (i + 0.5) / n).addScaledVector(r.out, 0.26);
      p.y += 1.2;
      ray.set(p, up);
      ray.far = 6;
      const hit = ray.intersectObjects(soffits, true)[0];
      if (!hit) continue;
      const y = hit.point.y;
      const d = new THREE.Mesh(lensGeo, lens);
      d.position.set(p.x, y - 0.008, p.z);
      g.add(d);
      const nrm = hit.face ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld) : up.clone();
      if (nrm.y > 0) nrm.negate();
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), glow);
      pl.position.set(p.x, y - 0.012, p.z).addScaledVector(nrm, 0.004);
      pl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), nrm);
      pl.renderOrder = 3;
      g.add(pl);
      // the wash down the wall below it
      const w = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.5), wash);
      w.position.set(p.x, y - 0.62, p.z).addScaledVector(r.out, -0.255 + 0.012);
      w.lookAt(w.position.clone().add(r.out));
      w.renderOrder = 3;
      g.add(w);
    }
  }
  g.userData.mats = mats;
  g.userData.lens = lens;
  return g;
}
/** brighter as the day fades */
export function setEaveLights(g: THREE.Object3D, night: number, mood: Mood) {
  const k = mood === 'dusk' ? 1 : mood === 'golden' ? 0.75 : 0.28;
  const [glow, wash] = (g.userData.mats ?? []) as THREE.MeshBasicMaterial[];
  if (glow) glow.opacity = 0.95 * Math.max(k, night);
  if (wash) wash.opacity = 0.2 * Math.max(k, night);
  const lens = g.userData.lens as THREE.MeshStandardMaterial | undefined;
  if (lens) lens.emissiveIntensity = 2 + 5 * Math.max(k, night);
}

// --- planting ------------------------------------------------------------------------------------------
/**
 * Native planting around a footprint: pōhutukawa behind, tī kōuka to one side, ponga, harakeke and
 * boulders in front. `front` and `along` are unit vectors on the ground; half-extents are the building's.
 */
export function nativePlanting(o: {
  centre: THREE.Vector3; front: THREE.Vector3; along: THREE.Vector3; halfAlong: number; halfDepth: number;
  groundAt: (x: number, z: number) => number; keepOut: (x: number, z: number) => boolean;
}): { group: THREE.Group; sway: SwayNode[] } {
  // the studio layout was drawn around a 12.4 × 7.4 m house with a deck in front: stretch it to this footprint,
  // keeping its clearances (about 5 m in front, 6 m behind, 9 m to the sides)
  const sx = Math.max(0.8, (o.halfAlong + 9) / 15.5), sf = Math.max(0.8, (o.halfDepth + 3.8) / 11.3), sb = Math.max(0.9, (o.halfDepth + 6.5) / 9.6);
  const remap = (x: number, z: number): [number, number] => {
    const dz = z * (z >= 0 ? sf : sb), dx = x * sx;
    return [o.centre.x + o.along.x * dx + o.front.x * dz, o.centre.z + o.along.z * dx + o.front.z * dz];
  };
  const { group, swayNodes } = buildNzNativeLandscape(o.groundAt, 1, o.keepOut, remap, 1.2);
  group.name = 'native_planting';
  group.userData = { kind: 'planting', name: 'Native planting', source: 'proposed', note: 'Proposed planting to frame the building: pōhutukawa, tī kōuka, ponga, harakeke. Not from the plan.' };
  return { group, sway: swayNodes };
}

// --- a kitchen island at the size the plan draws -----------------------------------------------------
/** fluted oak front, veincut travertine top with waterfall ends, bar stools on the long side at +z */
export function scandiIsland(len: number, dep: number, stools: number): THREE.Group {
  const M = scandiMats();
  const g = new THREE.Group();
  addContactShadow(g, len + 0.5, dep + 0.9, 0, 0.2);
  const toe = new THREE.Mesh(new THREE.BoxGeometry(len - 0.24, 0.1, dep - 0.24), M.joineryMat);
  toe.position.y = 0.05;
  const core = new THREE.Mesh(new THREE.BoxGeometry(len - 0.14, 0.78, dep - 0.14), M.oakMat);
  core.position.y = 0.49;
  core.castShadow = true;
  g.add(toe, core);
  const n = Math.max(6, Math.round((len - 0.18) / 0.058));
  const slatGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.77, 8);
  const slats = new THREE.InstancedMesh(slatGeo, M.oakMat, n * 2);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < n; i++) {
    const x = -(len - 0.18) / 2 + ((i + 0.5) / n) * (len - 0.18);
    slats.setMatrixAt(i * 2, m4.makeTranslation(x, 0.49, dep / 2 - 0.07 + 0.006));
    slats.setMatrixAt(i * 2 + 1, m4.makeTranslation(x, 0.49, -(dep / 2 - 0.07 + 0.006)));
  }
  slats.castShadow = true;
  g.add(slats);
  const top = new THREE.Mesh(createRoundedBoxGeo(len + 0.02, 0.06, dep + 0.02, 0.008, 3), M.travertineMat);
  top.position.y = 0.91;
  top.castShadow = true;
  top.receiveShadow = true;
  g.add(top);
  for (const s of [-1, 1]) {
    const wf = new THREE.Mesh(createRoundedBoxGeo(0.055, 0.91, dep + 0.01, 0.006, 2), M.travertineMat);
    wf.position.set(s * (len / 2 - 0.018), 0.455, 0);
    wf.castShadow = true;
    g.add(wf);
  }
  // a footed bowl of lemons and a turned jug
  const bowl = new THREE.Mesh(createLatheVesselGeo([[0, 0], [0.07, 0], [0.05, 0.03], [0.16, 0.085], [0.17, 0.1], [0.15, 0.1], [0.04, 0.045], [0, 0.045]]), M.travertineMat);
  bowl.position.set(len * 0.22, 0.94, -0.05);
  bowl.castShadow = true;
  g.add(bowl);
  const lemon = new THREE.MeshStandardMaterial({ name: 'lemon', color: 0xe9c53c, roughness: 0.55 });
  for (const [x, y, z] of [[0, 0.085, 0], [0.07, 0.08, 0.03], [-0.06, 0.08, 0.04], [0.01, 0.08, -0.07], [0.02, 0.13, 0.01]]) {
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.036, 12, 10), lemon);
    l.scale.set(1.25, 1, 1);
    l.position.set(len * 0.22 + x, 0.94 + y, -0.05 + z);
    g.add(l);
  }
  const jug = new THREE.Mesh(createLatheVesselGeo([[0, 0], [0.06, 0], [0.085, 0.08], [0.075, 0.2], [0.045, 0.27], [0.055, 0.31], [0.045, 0.31]]), M.terracottaMat);
  jug.position.set(-len * 0.26, 0.94, 0.08);
  jug.castShadow = true;
  g.add(jug);
  const k = Math.max(0, Math.min(stools, Math.floor((len - 0.2) / 0.6)));
  for (let i = 0; i < k; i++) {
    const st = buildBarStool(M);
    st.position.set((i - (k - 1) / 2) * Math.min(0.75, (len - 0.3) / Math.max(1, k)), 0, dep / 2 + 0.2);
    g.add(st);
  }
  return g;
}
