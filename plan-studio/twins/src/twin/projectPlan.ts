import * as THREE from 'three/webgpu';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { strToU8, zipSync } from 'fflate';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { buildHome, type BuildingSpec, type Placement } from './homes';
import { toFinishes } from './furniture';
import { complete, fromURL, PRESETS } from './finishes';
import { finishesPanel } from './finishesUI';
import { setInteriorLights } from './fitout';
import { fillSlots } from './library';
import { planting, type Species, type Placement as PlantPlacement } from './plants';
import { bedPlanting, mulchBed, pathRibbon } from './landscape';
import { twinMats } from './mats';
import { scanSet, scanTex, scannedFinishes } from './scanned';
import { applyEditorial, deckUplights, eaveLights, hillsideMat, nativePlanting, setEaveLights, LOOK, type DeckRect, type DeckWall, type EaveRun, type Mood } from './editorial';
import { scandi } from './fitout';
import { nativeBush } from './nativeTrees';
import { claddingRibs, type RibWall } from './fittings';
import { buildCar } from './car';
import { approvalPanel, modelFingerprint } from './approvals';
import { planRunPanel } from './planRunUI'; // the one-press full check (agent/pipeline-1122): this import and `topPanels` below
import { codeChecksPanel } from './codeChecksUI'; // code pre-check card (agent/code-1122): this import and one entry in `panels` below
import { scandiMats, suite } from './editorial';
import { furnishDecks, type DeckRect as DeckPlan } from './outdoor'; // deck furniture: the one import the deck block below needs
import { createArchedBladeGeometry } from './nzNativeFlora';
import { createPongaFrondTexture } from './pbrTextures';
import { exportIFC, loadIFC } from './ifc';
import { HANDOFF_PARAM, takeHandoff } from './handoff';
import { traceDrawing } from './traceUI';
import { applyGround, contourPhoto, groundPanel, loadGround, type Applied, type GroundStore } from './siteGround';
import type { App, Built, Key, Layer, Project } from './app';
import { buildFreeform, isFreeform } from './freeform'; // free-form buildings (agent/freeform-walk-1122): tapered and curved plans, mezzanines, gable roofs over any footprint
import { bbox as fpBox, inside as inPoly } from './freeformGeom';
import { navFromPlan } from './walkNav';
import { dressModel, type Dressed } from './dressModel'; // the finished look for an opened IFC or GLB (agent/model-dress-1123): this import and the lines marked model-dress

// The tool's front door: drop a plan model (assembl.plan-model.v1, as Plan to 4D saves it) and
// get a furnished, finished twin to render. An IFC or GLB (from Revit, ArchiCAD or Blender) is
// shown as it is, on the same stage, with the same sun, inspector, stills and fly-through.

const BASE = import.meta.env.BASE_URL;

interface PlanModel {
  schema?: string;
  job?: { title?: string; nickname?: string; what?: string };
  north?: { deg?: number };
  site?: { fall?: { at: [number, number]; y: number; slopeX: number; slopeZ: number; source?: string }; north?: [number, number]; sunHour?: number; features?: SiteFeature[]; terrain?: Terrain };
  buildings: (BuildingSpec & { origin: [number, number]; floorLevel?: number })[];
  planting?: Record<string, unknown>;
  views?: Terrain['views'];
  /** a finished model of the building (GLB, Y up, metres) shown instead of generating it from the walls: its floor level, and the colour for its metal cladding */
  asBuilt?: { glb: string; ffl: number; cladding?: string; note?: string };
  /** where walk mode starts and which way it looks (world x, z) */
  walk?: { start: [number, number]; look: [number, number] };
}

/** Real ground for the site, in the plan model's frame: a square grid of levels (rows along z, columns along x, relative to
 *  the model's own datum), an aerial photo over the same square, a coarser far field, and trees sized from a canopy survey. */
export interface Terrain {
  centre: [number, number]; size: number; n: number; heights: number[]; photo?: string;
  far?: { size: number; n: number; heights: number[]; photo?: string };
  sea?: number; sunHour?: number; north?: [number, number]; views?: { label: string; eye: [number, number, number]; look: [number, number, number] }[]; trees?: [number, number, number, number, string][]; source?: string;
  /** what the picture on the ground is, when it is not an aerial photo */
  photoKind?: 'contours';
  /** model level 0 as a height in NZVD2016, when the ground came from the national LiDAR */
  datum?: number;
  /** the wording for the site chip and the ground layer, saying exactly what was loaded */
  chip?: string; layerNote?: string;
  /** height of whatever stands above the ground (surface model less ground model), on a coarser square grid over the same square */
  tops?: { n: number; size: number; heights: number[]; note: string };
}
const gridAt = (t: { size: number; n: number; heights: number[] }, c: [number, number], x: number, z: number) => {
  const fx = Math.min(t.n - 1.001, Math.max(0, ((x - c[0]) / t.size + 0.5) * (t.n - 1))), fz = Math.min(t.n - 1.001, Math.max(0, ((z - c[1]) / t.size + 0.5) * (t.n - 1)));
  const i = Math.floor(fx), j = Math.floor(fz), a = fx - i, b = fz - j, H = t.heights, n = t.n;
  return (H[j * n + i] * (1 - a) + H[j * n + i + 1] * a) * (1 - b) + (H[(j + 1) * n + i] * (1 - a) + H[(j + 1) * n + i + 1] * a) * b;
};
const inside = (t: { size: number }, c: [number, number], x: number, z: number, m = 0) => Math.abs(x - c[0]) < t.size / 2 - m && Math.abs(z - c[1]) < t.size / 2 - m;
async function photoTex(url: string) {
  const t = await new THREE.TextureLoader().loadAsync(url);
  t.colorSpace = THREE.SRGBColorSpace; t.flipY = false; t.anisotropy = 8; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}
function sheet(c: [number, number], size: number, seg: number, y: (x: number, z: number) => number) {
  const pos = new Float32Array((seg + 1) * (seg + 1) * 3), uv = new Float32Array((seg + 1) * (seg + 1) * 2), idx: number[] = [];
  for (let j = 0; j <= seg; j++) for (let i = 0; i <= seg; i++) {
    const k = j * (seg + 1) + i, x = c[0] + (i / seg - 0.5) * size, z = c[1] + (j / seg - 0.5) * size;
    pos[k * 3] = x; pos[k * 3 + 1] = y(x, z); pos[k * 3 + 2] = z; uv[k * 2] = i / seg; uv[k * 2 + 1] = j / seg;
    if (i < seg && j < seg) idx.push(k, k + seg + 1, k + 1, k + 1, k + seg + 1, k + seg + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
/** bush from the canopy survey: one crown per tree top, its height and spread from the survey, its colour from the photo */
async function bush(trees: NonNullable<Terrain['trees']>, groundAt: (x: number, z: number) => number, centre: [number, number]) {
  const rnd = (i: number) => { const v = Math.sin(i * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
  // a crown: lumpy lobes, smooth, darker underneath and in the folds, so a lit canopy reads with depth
  const crownGeo = (detail: number, lobesN: number) => {
    const lobes: THREE.BufferGeometry[] = [];
    [[0, 0, 0, 1], [0.5, -0.2, 0.22, 0.74], [-0.42, -0.12, -0.34, 0.8], [0.1, -0.3, -0.52, 0.66]].slice(0, lobesN).forEach(([x, y, z, r], li) => {
      const g = mergeVertices(new THREE.IcosahedronGeometry(r, detail).deleteAttribute('uv').deleteAttribute('normal')), p = g.getAttribute('position'), col = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++) {
        const vx = p.getX(i), vy = p.getY(i), vz = p.getZ(i);
        const bump = Math.sin(vx * 9.1 + li * 3) * Math.cos(vz * 8.3 + li * 2) + 0.6 * Math.sin(vy * 13 + vx * 7 + vz * 5);
        const k = 1 + 0.13 * bump;
        p.setXYZ(i, vx * k + x, vy * k * 0.8 + y, vz * k + z);
        const sh = (0.42 + 0.7 * Math.max(0, Math.min(1, (vy / r + 0.95) / 1.9))) * (0.9 + 0.14 * bump);
        col[i * 3] = sh; col[i * 3 + 1] = sh * 1.02; col[i * 3 + 2] = sh * 0.9;
      }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); lobes.push(g);
    });
    return mergeGeometries(lobes)!;
  };
  const leaf = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0 });
  const [bc, bn, br] = await scanSet('bark', 1, 1);
  for (const t of [bc, bn, br]) t.repeat.set(2, 5);
  const bark = new THREE.MeshStandardMaterial({ color: 0x9a8f84, roughness: 1, map: bc, normalMap: bn, roughnessMap: br });
  // leaves: cards of scanned leaves standing off the crown, so the edge of a tree is leaves and sky, not a smooth lump
  const leafTex = await scanTex('leaves', true); leafTex.wrapS = leafTex.wrapT = THREE.ClampToEdgeWrapping;
  const cardM = new THREE.MeshStandardMaterial({ map: leafTex, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.62, metalness: 0 });
  const cardSpec: { x: number; y: number; z: number; s: number; nx: number; ny: number; nz: number; c: THREE.Color }[] = [];
  const g = new THREE.Group(); g.name = 'bush_from_survey';
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color(), up = new THREE.Vector3(0, 1, 0);
  const nearT = trees.filter(([x, z]) => Math.hypot(x - centre[0], z - centre[1]) < 48), farT = trees.filter(([x, z]) => Math.hypot(x - centre[0], z - centre[1]) >= 48);
  const lite = matchMedia('(max-width: 760px)').matches;   // phones get the same trees with fewer leaf cards
  const nearGeo = crownGeo(3, 4);
  for (const [list, geo, shadow] of [[nearT, nearGeo, true], [farT, crownGeo(1, 2), false]] as [typeof trees, THREE.BufferGeometry, boolean][]) {
    if (!list.length) continue;
    const crowns = new THREE.InstancedMesh(geo, leaf, list.length), trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.5, 0.7, 1, 7), bark, list.length);
    list.forEach(([x, z, h, r, hex], i) => {
      const gy = groundAt(x, z), rv = Math.max(r * 0.8, h * 0.3), cy = gy + h - rv * 0.8, s = i + x * 7.3;
      q.setFromAxisAngle(up, rnd(s) * 6.283);
      m.compose(new THREE.Vector3(x, cy, z), q, new THREE.Vector3(r * 0.86 * (0.9 + rnd(s + 9) * 0.25), rv * 0.86, r * 0.86 * (0.9 + rnd(s + 5) * 0.25))); crowns.setMatrixAt(i, m);
      // the photo sees the canopy from above in its own shade: lift it, keep its hue, vary tree to tree
      c.set(`#${hex}`); const lift = 1.55 + rnd(s + 3) * 0.6, warm = 0.95 + rnd(s + 1) * 0.22;
      c.setRGB(Math.min(0.9, c.r * lift * warm), Math.min(0.9, c.g * lift * 1.06), Math.min(0.9, c.b * lift * 0.62)); crowns.setColorAt(i, c.clone().multiplyScalar(0.55));
      const nearTree = geo === nearGeo, nc = lite ? (nearTree ? 36 : 6) : nearTree ? 110 : 14, rx = r * 1.02, c2 = c.clone();
      for (let k = 0; k < nc; k++) {
        const u = rnd(s + k * 3.1) * 2 - 1, ph = rnd(s + k * 7.7) * 6.283, sr = Math.sqrt(1 - u * u), dx = sr * Math.cos(ph), dz = sr * Math.sin(ph), dy = Math.max(-0.35, u);
        const tangent = rnd(s + k * 1.3) < 0.6, j = (a: number) => rnd(s + k * a) * 2 - 1;
        const n = tangent ? new THREE.Vector3(dx, dy * 0.8, dz) : new THREE.Vector3(j(2.3), j(4.1) * 0.6, j(5.9)); n.normalize();
        const shade = 0.72 + 0.5 * Math.max(0, dy) + 0.2 * rnd(s + k * 9.1);
        const bloom = r >= 4.2 && dy > 0.15 && rnd(s + k * 11.3) < 0.16;
        cardSpec.push({ x: x + dx * rx * 0.96, y: cy + dy * rv * 0.96, z: z + dz * rx * 0.96, s: r * (nearTree ? 0.36 + rnd(s + k) * 0.3 : 0.62 + rnd(s + k) * 0.5) * (bloom ? 0.55 : 1), nx: n.x, ny: n.y, nz: n.z, c: bloom ? new THREE.Color(0.34, 0.035, 0.05) : c2.clone().multiplyScalar(shade) });
      }
      const th = Math.max(0.6, cy - gy), tr = Math.max(0.06, Math.min(0.2, h * 0.013)) * (0.8 + rnd(s + 4) * 0.5);
      m.compose(new THREE.Vector3(x, gy + th / 2 - 0.1, z), q, new THREE.Vector3(tr, th, tr)); trunks.setMatrixAt(i, m);
    });
    crowns.instanceMatrix.needsUpdate = trunks.instanceMatrix.needsUpdate = true; if (crowns.instanceColor) crowns.instanceColor.needsUpdate = true;
    crowns.castShadow = shadow; crowns.receiveShadow = true; trunks.castShadow = shadow; crowns.frustumCulled = trunks.frustumCulled = false;
    g.add(crowns, trunks);
  }
  const cards = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), cardM, cardSpec.length), zAxis = new THREE.Vector3(0, 0, 1), v = new THREE.Vector3();
  cardSpec.forEach((k, i) => { q.setFromUnitVectors(zAxis, v.set(k.nx, k.ny, k.nz)); m.compose(new THREE.Vector3(k.x, k.y, k.z), q, new THREE.Vector3(k.s * 2, k.s * 2, 1)); cards.setMatrixAt(i, m); cards.setColorAt(i, k.c.multiplyScalar(2.4)); });
  cards.instanceMatrix.needsUpdate = true; if (cards.instanceColor) cards.instanceColor.needsUpdate = true; cards.frustumCulled = false; cards.receiveShadow = true; cards.name = 'leaves';
  g.add(cards);
  // ponga (tree ferns) under the canopy near the building, as in regenerating coastal bush: one beside most trees, clear of the open ground
  {
    const parts: THREE.BufferGeometry[] = [];
    const frond = createArchedBladeGeometry(0.95, 2.2, 0.95, false, 8), e = new THREE.Euler(), mm = new THREE.Matrix4(), one = new THREE.Vector3(1, 1, 1);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + (i % 2) * 0.22, tier = i % 2, f = frond.clone();
      f.applyMatrix4(mm.compose(new THREE.Vector3(0, 1, 0), new THREE.Quaternion().setFromEuler(e.set(0.58 + tier * 0.34, a, 0, 'YXZ')), one.clone().multiplyScalar(tier === 0 ? 1.05 : 0.82)));
      parts.push(f);
    }
    const crownG = mergeGeometries(parts)!;
    const fm = new THREE.MeshStandardMaterial({ map: createPongaFrondTexture(), alphaTest: 0.35, roughness: 0.68, side: THREE.DoubleSide, color: 0xd8e8c4 });
    const tm = new THREE.MeshStandardMaterial({ color: 0x3a2e26, roughness: 0.96 });
    const spots: [number, number, number, number][] = [];
    const open = (x: number, z: number) => nearT.every(([tx, tz, , tr]) => Math.hypot(tx - x, tz - z) > tr * 0.35) && Math.min(...nearT.map(([tx, tz]) => Math.hypot(tx - x, tz - z))) < 4.5;
    nearT.forEach(([x, z, h], i) => {
      if (h < 5 || rnd(i * 3.7) < 0.3) return;
      const a = rnd(i * 5.1) * 6.283, d = 1.6 + rnd(i * 2.3) * 1.6, px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
      if (open(px, pz)) spots.push([px, pz, 1.6 + rnd(i * 9.9) * 2.6, 0.95 + rnd(i * 4.4) * 0.5]);
    });
    if (spots.length) {
      const heads = new THREE.InstancedMesh(crownG, fm, spots.length), stems = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.09, 0.14, 1, 8).translate(0, 0.5, 0), tm, spots.length);
      spots.forEach(([x, z, th, sc], i) => {
        const gy = groundAt(x, z) - 0.2; q.setFromAxisAngle(up, rnd(i * 6.1) * 6.283);
        m.compose(new THREE.Vector3(x, gy + th - sc, z), q, new THREE.Vector3(sc, sc, sc)); heads.setMatrixAt(i, m);
        m.compose(new THREE.Vector3(x, gy, z), q, new THREE.Vector3(1, th, 1)); stems.setMatrixAt(i, m);
      });
      heads.castShadow = stems.castShadow = true; heads.receiveShadow = true; heads.frustumCulled = stems.frustumCulled = false; heads.name = 'ponga_fronds'; stems.name = 'ponga_trunks';
      g.add(heads, stems);
    }
  }
  g.userData = { kind: 'planting', name: 'Bush', source: 'survey', note: 'One crown per tree top in the LiDAR canopy; height and spread from the survey, colour from the aerial photo. Species are not identified by the survey: the forms shown (kānuka and broadleaf crowns, pōhutukawa in flower on the broadest, ponga beneath) are typical of regenerating coastal bush here and are proposed.' };
  return g;
}
/** a finished building model, set on the plan model's frame: the model's front runs along +Z, so it is turned to put the downhill wall at x = 0 */
async function asBuiltModel(a: NonNullable<PlanModel['asBuilt']>) {
  const gltf = await new GLTFLoader().loadAsync(a.glb), inner = gltf.scene, root = new THREE.Group();
  root.name = 'as_built'; inner.rotation.y = -Math.PI / 2; inner.position.y = -a.ffl; root.add(inner);
  const seen = new Set<THREE.Material>();
  inner.traverse((o) => {
    const m = o as THREE.Mesh; if (!m.isMesh) return;
    m.castShadow = m.receiveShadow = true;
    const nm = o.name.replace(/_/g, ' ').replace(/\s*\d{3}$/, '').trim(), [head, tail] = nm.split('|').map((x) => x.trim());
    const mat = m.material as THREE.MeshPhysicalMaterial;
    o.userData = { ...o.userData, kind: 'element', name: head || nm, material: (mat?.name ?? '').replace(/\s*\|\s*/, ', '), source: 'model', note: tail ? `${tail}; from the developed Blender model` : 'from the developed Blender model' };
    if (!mat || seen.has(mat)) return; seen.add(mat);
    if (/glass/i.test(mat.name)) { mat.transmission = 0; mat.transparent = true; mat.opacity = 0.2; mat.color.set(0xa9bcc0); mat.roughness = 0.02; mat.metalness = 0; mat.envMapIntensity = 2.2; mat.depthWrite = false; mat.side = THREE.DoubleSide; m.castShadow = false; }
    else if (/cladding/i.test(mat.name)) { mat.color.set(a.cladding ?? '#4a4d4f'); mat.metalness = 0.4; mat.roughness = 0.46; mat.clearcoat = 0.25; mat.clearcoatRoughness = 0.4; }
    else if (/concrete/i.test(mat.name)) { mat.color.set(0x8d8b85); mat.roughness = 0.92; mat.metalness = 0; }
    else if (/joinery/i.test(mat.name)) { mat.color.set(0x111213); mat.metalness = 0.35; mat.roughness = 0.36; }
    mat.needsUpdate = true;
  });
  inner.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && /glass/i.test((m.material as THREE.Material)?.name ?? '')) m.castShadow = false; });
  return root;
}

/** timber stairs down a line, from one level to another */
type StairBarrier = 'glass' | 'balusters';
interface StairMats { timber: THREE.Material; glass: THREE.Material; metal: THREE.Material }
/** a raking glass barrier along a line that falls from y0 to y1: 12 mm panels about 1.2 m long with 20 mm gaps, two fixings each, a slim cap rail */
function rakedGlass(a: [number, number], b: [number, number], y0: number, y1: number, panes: THREE.BufferGeometry[], trim: THREE.BufferGeometry[], foot = -0.06) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (L < 0.25) return;
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), pitch = Math.atan2(y1 - y0, L), n = Math.max(1, Math.round(L / 1.2)), pw = L / n;
  const P = (d: number) => [a[0] + ((b[0] - a[0]) * d) / L, y0 + ((y1 - y0) * d) / L, a[1] + ((b[1] - a[1]) * d) / L];
  for (let k = 0; k < n; k++) {
    const d0 = k * pw + 0.01, d1 = (k + 1) * pw - 0.01, A = P(d0), B = P(d1);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([A[0], A[1] + foot, A[2], B[0], B[1] + foot, B[2], B[0], B[1] + 1.0, B[2], A[0], A[1] + 1.0, A[2]], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
    g.setIndex([0, 1, 2, 0, 2, 3]); g.computeVertexNormals(); panes.push(g.toNonIndexed());
    for (const f of [0.22, 0.78]) { const C = P(d0 + (d1 - d0) * f); trim.push(new THREE.CylinderGeometry(0.022, 0.022, 0.16, 12).translate(C[0], C[1] + foot + 0.05, C[2])); }
  }
  const M = P(L / 2), rail = new THREE.BoxGeometry(Math.hypot(L, y1 - y0) + 0.02, 0.022, 0.042);
  rail.rotateZ(pitch); rail.rotateY(-ang); rail.translate(M[0], M[1] + 1.011, M[2]); trim.push(rail);
}
/** a flight of timber steps with stringers along a centre line: levels[0] at the first point, levels[1] at the last */
function flight(pts: [number, number][], levels: [number, number], w: number, groundAt: (x: number, z: number) => number, mats: StairMats, barrier: StairBarrier = 'glass') {
  const segs = pts.slice(1).map((b, i) => ({ a: pts[i], b, L: Math.hypot(b[0] - pts[i][0], b[1] - pts[i][1]) })), L = segs.reduce((t, s) => t + s.L, 0);
  const n = Math.max(2, Math.ceil(Math.abs(levels[0] - levels[1]) / 0.18)), rise = (levels[1] - levels[0]) / n, going = L / n, parts: THREE.BufferGeometry[] = [], panes: THREE.BufferGeometry[] = [], trim: THREE.BufferGeometry[] = [];
  const at = (d: number) => { let r = d; for (const s of segs) { if (r <= s.L) return { x: s.a[0] + ((s.b[0] - s.a[0]) * r) / s.L, z: s.a[1] + ((s.b[1] - s.a[1]) * r) / s.L, ang: Math.atan2(s.b[1] - s.a[1], s.b[0] - s.a[0]) }; r -= s.L; } const s = segs[segs.length - 1]; return { x: s.b[0], z: s.b[1], ang: Math.atan2(s.b[1] - s.a[1], s.b[0] - s.a[0]) }; };
  for (let k = 0; k < n; k++) {
    const p = at((k + 0.5) * going), y = levels[0] + (k + 1) * rise;
    const t = new THREE.BoxGeometry(going + 0.02, 0.045, w); t.rotateY(-p.ang); t.translate(p.x, y - 0.0225, p.z); parts.push(t);
    for (const side of [-1, 1]) { const sx = p.x + Math.sin(p.ang) * side * (w / 2 - 0.03), sz = p.z - Math.cos(p.ang) * side * (w / 2 - 0.03); const st = new THREE.BoxGeometry(going + 0.02, 0.24, 0.045); st.rotateY(-p.ang); st.translate(sx, y - 0.14, sz); parts.push(st); }
    if (barrier === 'balusters') for (const side of [-1, 1]) { const bx = p.x + Math.sin(p.ang) * side * (w / 2 - 0.02), bz = p.z - Math.cos(p.ang) * side * (w / 2 - 0.02); parts.push(new THREE.BoxGeometry(0.03, 0.95, 0.03).translate(bx, y + 0.475, bz)); const hr = new THREE.BoxGeometry(going + 0.04, 0.04, 0.06); hr.rotateY(-p.ang); hr.translate(bx, y + 0.97, bz); parts.push(hr); }
    if (k % 4 === 3) { const gy = groundAt(p.x, p.z), h = y - 0.3 - gy; if (h > 0.15) for (const side of [-1, 1]) { const po = new THREE.BoxGeometry(0.1, h, 0.1); po.translate(p.x + Math.sin(p.ang) * side * (w / 2 - 0.05), gy + h / 2, p.z - Math.cos(p.ang) * side * (w / 2 - 0.05)); parts.push(po); } }
  }
  const g = new THREE.Group(); g.name = 'stairs';
  const m = new THREE.Mesh(mergeGeometries(parts)!, mats.timber); m.castShadow = m.receiveShadow = true; m.name = 'stairs';
  m.userData = { kind: 'steps', name: 'Stairs', ifcClass: 'IfcStair', source: 'scaled', note: `${n} risers of ${Math.round(Math.abs(rise) * 1000)} mm; position from the layout plan, flights simplified` };
  g.add(m);
  if (barrier === 'glass') {
    // glass each side, raked with the flight, standing just outside the stringers
    let d = 0;
    for (const sg of segs) {
      const ang = Math.atan2(sg.b[1] - sg.a[1], sg.b[0] - sg.a[0]), ya = levels[0] + ((levels[1] - levels[0]) * d) / L, yb = levels[0] + ((levels[1] - levels[0]) * (d + sg.L)) / L;
      for (const side of [-1, 1]) { const ox = Math.sin(ang) * side * (w / 2 + 0.012), oz = -Math.cos(ang) * side * (w / 2 + 0.012); rakedGlass([sg.a[0] + ox, sg.a[1] + oz], [sg.b[0] + ox, sg.b[1] + oz], ya, yb, panes, trim); }
      d += sg.L;
    }
    addBarrier(g, panes, trim, mats, 'Stair balustrade');
  }
  return g;
}
function addBarrier(g: THREE.Object3D, panes: THREE.BufferGeometry[], trim: THREE.BufferGeometry[], mats: StairMats, name: string) {
  if (!panes.length) return;
  const note = 'glass to match the deck balustrade, at the owner’s request; the 17 November elevation draws baluster rails on the stair, so the barrier type is assumed';
  const gl = new THREE.Mesh(mergeGeometries(panes)!, mats.glass); gl.name = 'stair_balustrade_glass'; gl.renderOrder = 2;
  gl.userData = { kind: 'steps', name, ifcClass: 'IfcRailing', source: 'assumed', note };
  const tr = new THREE.Mesh(mergeGeometries(trim.map((q) => (q.index ? q.toNonIndexed() : q)))!, mats.metal); tr.name = 'stair_balustrade_rail'; tr.castShadow = true;
  tr.userData = { kind: 'steps', name, ifcClass: 'IfcRailing', source: 'assumed', note };
  g.add(gl, tr);
}

/** A deck as plain rectangles. An L-shaped or stepped deck (drawn as `poly`) is cut into slabs, so furniture and lights
 *  are placed on the boards that exist and never in the empty corner of its bounding box. */
function deckSlabs(d: { u0: number; u1: number; v0: number; v1: number; drop?: number; poly?: [number, number][] }) {
  if (!d.poly || d.poly.length < 4) return [{ u0: d.u0, u1: d.u1, v0: d.v0, v1: d.v1, drop: d.drop }];
  const us = [...new Set(d.poly.map((p) => Math.round(p[0] * 1000) / 1000))].sort((a, b) => a - b), out: { u0: number; u1: number; v0: number; v1: number; drop?: number }[] = [];
  for (let i = 0; i < us.length - 1; i++) {
    const mid = (us[i] + us[i + 1]) / 2, vs: number[] = [];
    d.poly.forEach((a, k) => { const b = d.poly![(k + 1) % d.poly!.length]; if ((a[0] < mid) !== (b[0] < mid)) vs.push(a[1] + ((b[1] - a[1]) * (mid - a[0])) / (b[0] - a[0])); });
    vs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < vs.length; k += 2) {
      const last = out[out.length - 1];
      if (last && Math.abs(last.u1 - us[i]) < 1e-6 && Math.abs(last.v0 - vs[k]) < 1e-3 && Math.abs(last.v1 - vs[k + 1]) < 1e-3) last.u1 = us[i + 1];
      else out.push({ u0: us[i], u1: us[i + 1], v0: vs[k], v1: vs[k + 1], drop: d.drop });
    }
  }
  return out.length ? out : [{ u0: d.u0, u1: d.u1, v0: d.v0, v1: d.v1, drop: d.drop }];
}

/** something drawn on the site plan, in the plan model's frame (x, z) */
export interface SiteFeature { kind: 'path' | 'driveway' | 'steps' | 'landing' | 'parking' | 'patio' | 'pad' | 'retaining' | 'bed' | 'lawn' | 'tree' | 'boundary'; pts: [number, number][]; width?: number; height?: number; r?: number; levels?: [number, number]; source?: string; car?: boolean; staging?: string; barrier?: 'glass' | 'balusters'; /** a boundary run that is not a closed loop (a parcel edge clipped to the ground shown) */ open?: boolean }

/** the site plan's paths, pads, walls, beds and trees on the ground */
function siteLayer(F: SiteFeature[], groundAt: (e: number, n: number) => number, q: App['quality']) {
  const land = new THREE.Group();
  land.name = 'site_from_plan';
  const en = (p: [number, number]): [number, number] => [p[0], -p[1]];
  const plants: PlantPlacement[] = [];
  const concrete = new THREE.MeshStandardMaterial({ color: 0xbcb6ad, roughness: 0.92 });
  const timber = new THREE.MeshStandardMaterial({ color: 0x6b5139, roughness: 0.82 }); timber.name = 'stair_hardwood';
  const stairMats: StairMats = { timber, glass: new THREE.MeshPhysicalMaterial({ color: 0xe6f0ee, transparent: true, opacity: 0.2, roughness: 0.04, metalness: 0, side: THREE.DoubleSide, depthWrite: false }), metal: new THREE.MeshStandardMaterial({ color: 0x1b1c1d, roughness: 0.5, metalness: 0.6 }) };
  stairMats.glass.name = 'balustrade_glass';
  const stairEnds: [number, number][] = F.filter((f) => f.kind === 'steps' && f.levels).flatMap((f) => [f.pts[0], f.pts[f.pts.length - 1]]);
  F.forEach((f, i) => {
    const pts = f.pts.map(en);
    if (f.kind === 'steps' && f.levels && f.pts.length >= 2) {
      land.add(flight(f.pts, f.levels, f.width ?? 1, (x, z) => groundAt(x, -z), stairMats, f.barrier ?? 'glass'));
    } else if (f.kind === 'boundary' && f.pts.length >= (f.open ? 2 : 3)) {
      const v: THREE.Vector3[] = [];
      f.pts.forEach((a, k) => { if (f.open && k === f.pts.length - 1) { v.push(new THREE.Vector3(a[0], groundAt(a[0], -a[1]) + 0.25, a[1])); return; } const b = f.pts[(k + 1) % f.pts.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L / 1.5)); for (let t = 0; t < n; t++) { const x = a[0] + ((b[0] - a[0]) * t) / n, z = a[1] + ((b[1] - a[1]) * t) / n; v.push(new THREE.Vector3(x, groundAt(x, -z) + 0.25, z)); } });
      if (!f.open) v.push(v[0].clone());
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(v), new THREE.LineBasicMaterial({ color: 0xfffdfb }));
      line.name = 'boundary'; line.userData = { kind: 'boundary', name: 'Boundary', source: f.source ?? 'ai', note: f.open ? 'legal parcel boundary from LINZ’s parcel map, drawn on the ground; a map of boundaries, not a survey' : 'legal boundary, drawn on the ground' }; land.add(line);
    } else if ((f.kind === 'path' || f.kind === 'driveway' || f.kind === 'steps') && pts.length >= 2) {
      land.add(pathRibbon(`${f.kind}_${i + 1}`, pts, f.width ?? (f.kind === 'driveway' ? 3 : 1.2), groundAt, q, `${f.kind} from the site plan`));
    } else if (f.kind === 'landing' && f.levels && f.pts.length >= 3) {
      // a timber landing between flights: boards on bearers, a post under each corner
      const y = f.levels[0], sh = new THREE.Shape(f.pts.map((q) => new THREE.Vector2(q[0], -q[1])));
      const top = new THREE.ExtrudeGeometry(sh, { depth: 0.045, bevelEnabled: false }); top.rotateX(-Math.PI / 2); top.translate(0, y - 0.045, 0);
      const parts: THREE.BufferGeometry[] = [top];
      const cx = f.pts.reduce((t, q) => t + q[0], 0) / f.pts.length, cz = f.pts.reduce((t, q) => t + q[1], 0) / f.pts.length;
      for (const q of f.pts) { const px = q[0] + Math.sign(cx - q[0]) * 0.07, pz = q[1] + Math.sign(cz - q[1]) * 0.07, gy = groundAt(px, -pz), h = y - 0.045 - gy; if (h > 0.1) parts.push(new THREE.BoxGeometry(0.1, h, 0.1).translate(px, gy + h / 2, pz)); }
      f.pts.forEach((a, k) => { const b2 = f.pts[(k + 1) % f.pts.length], L = Math.hypot(b2[0] - a[0], b2[1] - a[1]); const br = new THREE.BoxGeometry(L, 0.19, 0.045); br.rotateY(-Math.atan2(b2[1] - a[1], b2[0] - a[0])); br.translate((a[0] + b2[0]) / 2, y - 0.14, (a[1] + b2[1]) / 2); parts.push(br); });
      const m = new THREE.Mesh(mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)))!, timber); m.castShadow = m.receiveShadow = true; m.name = `landing_${i + 1}`;
      m.userData = { kind: 'steps', name: 'Stair landing', ifcClass: 'IfcSlab', source: f.source ?? 'scaled', note: 'landing level is assumed where the drawings do not write it' };
      land.add(m);
      if ((f.barrier ?? 'glass') === 'glass') {
        // glass along each edge of the landing, left open where a flight arrives or leaves
        const panes: THREE.BufferGeometry[] = [], trim: THREE.BufferGeometry[] = [];
        f.pts.forEach((a, k) => {
          const b2 = f.pts[(k + 1) % f.pts.length], L = Math.hypot(b2[0] - a[0], b2[1] - a[1]), nP = Math.max(1, Math.round(L / 0.2));
          const open = (t: number) => { const px = a[0] + (b2[0] - a[0]) * t, pz = a[1] + (b2[1] - a[1]) * t; return stairEnds.some((e) => Math.hypot(e[0] - px, e[1] - pz) < 0.62); };
          let run: number | null = null;
          for (let q = 0; q <= nP; q++) {
            const closed = q < nP && !open((q + 0.5) / nP);
            if (closed && run === null) run = q;
            if (!closed && run !== null) { const t0 = run / nP, t1 = q / nP; rakedGlass([a[0] + (b2[0] - a[0]) * t0, a[1] + (b2[1] - a[1]) * t0], [a[0] + (b2[0] - a[0]) * t1, a[1] + (b2[1] - a[1]) * t1], y, y, panes, trim, -0.1); run = null; }
          }
        });
        addBarrier(land, panes, trim, stairMats, 'Landing balustrade');
      }
    } else if ((f.kind === 'parking' || f.kind === 'patio' || f.kind === 'pad') && f.levels && f.pts.length >= 3) {
      // a level slab at a stated height, cut to its drawn outline, with a low wall where the ground stands above or below it
      const y = f.levels[0], sh = new THREE.Shape(f.pts.map((q) => new THREE.Vector2(q[0], -q[1])));
      const slab = new THREE.ExtrudeGeometry(sh, { depth: 0.2, bevelEnabled: false }); slab.rotateX(-Math.PI / 2); slab.translate(0, y - 0.2, 0);
      const parts: THREE.BufferGeometry[] = [slab];
      const cx = f.pts.reduce((t, q) => t + q[0], 0) / f.pts.length, cz = f.pts.reduce((t, q) => t + q[1], 0) / f.pts.length;
      f.pts.forEach((a, k) => {
        const b2 = f.pts[(k + 1) % f.pts.length], L = Math.hypot(b2[0] - a[0], b2[1] - a[1]), n = Math.max(1, Math.ceil(L / 0.8)), ang = Math.atan2(b2[1] - a[1], b2[0] - a[0]);
        let nx = -(b2[1] - a[1]) / L, nz = (b2[0] - a[0]) / L; if (nx * ((a[0] + b2[0]) / 2 - cx) + nz * ((a[1] + b2[1]) / 2 - cz) < 0) { nx = -nx; nz = -nz; }
        for (let t = 0; t < n; t++) {
          const mx = a[0] + ((b2[0] - a[0]) * (t + 0.5)) / n, mz = a[1] + ((b2[1] - a[1]) * (t + 0.5)) / n, top = groundAt(mx + nx * 0.9, -(mz + nz * 0.9)), h = top - y;
          if (Math.abs(h) < 0.15) continue;
          const w = new THREE.BoxGeometry(L / n + 0.02, Math.abs(h) + 0.25, 0.2); w.rotateY(-ang); w.translate(mx, y + h / 2 - 0.1, mz); parts.push(w);
        }
      });
      const m = new THREE.Mesh(mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)))!, concrete); m.castShadow = m.receiveShadow = true; m.name = `${f.kind}_${i + 1}`;
      m.userData = { kind: f.kind, name: f.kind === 'parking' ? 'Car bay' : 'Slab', ifcClass: 'IfcSlab', source: f.source ?? 'scaled', note: 'level slab at the stated height; walls where the ground stands above or below it are indicative' };
      if (f.staging) m.userData.staging = f.staging;   // for the photo-render prompt: wanted in the picture, not in the model
      land.add(m);
      if (f.kind === 'parking' && f.car) {
        // a car on the bay, along its longer side, for scale
        let best = 0, ang = 0; f.pts.forEach((a, k) => { const b2 = f.pts[(k + 1) % f.pts.length], L = Math.hypot(b2[0] - a[0], b2[1] - a[1]); if (L > best) { best = L; ang = Math.atan2(b2[1] - a[1], b2[0] - a[0]); } });
        const car = buildCar(); car.position.set(cx, y, cz); car.rotation.y = -ang; car.traverse((o) => { o.castShadow = true; o.receiveShadow = true; }); land.add(car);
      }
    } else if ((f.kind === 'parking' || f.kind === 'patio' || f.kind === 'pad') && pts.length >= 3) {
      // laid on the ground like a bed, in concrete
      const m = mulchBed(`${f.kind}_${i + 1}`, pts, (e, n) => groundAt(e, n) + 0.04, q);
      m.traverse((o) => { if ((o as THREE.Mesh).isMesh) { (o as THREE.Mesh).material = concrete; o.receiveShadow = true; } });
      m.userData = { kind: f.kind, name: f.kind === 'parking' ? 'Parking' : f.kind === 'patio' ? 'Patio' : 'Concrete pad', source: f.source ?? 'ai', note: 'outline from the site plan, laid on the ground' };
      land.add(m);
    } else if (f.kind === 'retaining' && pts.length >= 2) {
      const h = f.height ?? 1.2;
      for (let k = 0; k < pts.length - 1; k++) {
        const [a, b] = [pts[k], pts[k + 1]], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (L < 0.2) continue;
        const mid: [number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], y = groundAt(mid[0], mid[1]);
        const g = new THREE.BoxGeometry(L, h + 0.3, 0.2);
        g.rotateY(Math.atan2(b[1] - a[1], b[0] - a[0]));
        g.translate(mid[0], y + h / 2 - 0.15, -mid[1]);
        const m = new THREE.Mesh(g, timber);
        m.name = `retaining_${i + 1}_${k + 1}`; m.castShadow = m.receiveShadow = true;
        m.userData = { kind: 'retaining', name: 'Retaining wall', height: h, source: f.source ?? 'ai', note: f.height ? 'height from the drawing' : 'height assumed 1.2 m' };
        land.add(m);
      }
    } else if (f.kind === 'bed' && pts.length >= 3) {
      land.add(mulchBed(`bed_${i + 1}`, pts, groundAt, q));
      plants.push(...(bedPlanting(pts, groundAt, { density: 0.8, seed: 11 + i }) as PlantPlacement[]));
    } else if (f.kind === 'tree' && pts[0]) {
      const [e, n] = pts[0];
      plants.push({ sp: 'tikouka', x: e, y: groundAt(e, n), z: -n, s: Math.max(0.8, Math.min(2, (f.r ?? 2) / 2)) });
    }
  });
  if (plants.length) land.add(planting(plants, 'Planting from the site plan; species proposed.'));
  return land;
}

type Input = { kind: 'plan'; plan: PlanModel; name: string } | { kind: 'ifc' | 'glb'; bytes: ArrayBuffer; name: string };

const KEEP = 'assembl-twin-dropped-plan';

async function fromShare(id: string): Promise<{ plan: PlanModel; name: string } | null> {
  try {
    const m = await (await fetch(`https://lab.assembl.co.nz/api/twin-share?id=${encodeURIComponent(id)}`)).json();
    if (!m?.planUrl) return null;
    const plan = (await (await fetch(m.planUrl)).json()) as PlanModel;
    return plan?.buildings ? { plan, name: m.title ?? 'Shared plan' } : null;
  } catch {
    return null;
  }
}

// The biggest IFC or GLB this page reads in a browser. The same figure as BROWSER_3D_LIMIT in architecture/js/models-rules.js:
// cautious, not measured at its edge. In testing, an IFC of nearly 400 MB froze a browser while this page read it.
const BROWSER_3D_LIMIT = 100 * 1024 * 1024;
const mb = (n: number) => `${Math.round(n / (1024 * 1024))} MB`;

async function chooser(app: App): Promise<{ input: Input; palette: string }> {
  // a page that opens straight onto a plan model: ?plan=<a .json beside the lab's own pages>
  const qs = new URLSearchParams(location.search);
  // the page opens on a finished example, with the drop a tap away, rather than on a card of text
  const example = !qs.has('plan') && !qs.has('share') && !qs.has('fin') && !qs.has('drop') && !qs.has('ground');
  const pu = qs.get('plan') ?? (example ? 'hero.plan.json' : null);
  if (pu && /^[\w./-]+\.json$/.test(pu) && !pu.includes('//')) {
    try {
      app.log('Opening the model…');
      const base = new URL(pu, location.href), plan = (await (await fetch(base.href)).json()) as PlanModel;
      if (plan.asBuilt?.glb) plan.asBuilt.glb = new URL(plan.asBuilt.glb, base).href;
      if (plan.buildings) {
        if (example) {
          const a = document.createElement('a');
          a.className = 'pill solid';
          a.href = '?drop=1';
          a.textContent = 'Drop your own plan';
          a.style.cssText = 'position:absolute;left:12px;top:12px;z-index:6;text-decoration:none;box-shadow:0 6px 24px rgba(51,33,47,.18)';
          app.canvas.parentElement!.append(a);
        }
        return { input: { kind: 'plan', plan, name: plan.job?.title ?? 'Plan model' }, palette: 'cedar-charcoal' };
      }
    } catch (e) { console.warn('plan model could not be opened', e); app.log('That model could not be opened; drop a file instead.'); }
  }
  // a shared link: rebuild the plan that was shared
  const sid = new URLSearchParams(location.search).get('share');
  if (sid) {
    app.log('Opening the shared plan…');
    const got = await fromShare(sid);
    if (got) return { input: { kind: 'plan', plan: got.plan, name: got.name }, palette: 'cedar-charcoal' };
    app.log('That shared plan could not be loaded; drop a file instead.');
  }
  // applying a finishes schedule, or putting the house on real ground, reloads the page: reuse the plan model dropped before it
  if (new URLSearchParams(location.search).has('fin') || new URLSearchParams(location.search).has('ground')) {
    try {
      const kept = JSON.parse(sessionStorage.getItem(KEEP) ?? 'null') as { plan: PlanModel; name: string } | null;
      if (kept?.plan?.buildings) return Promise.resolve({ input: { kind: 'plan', plan: kept.plan, name: kept.name }, palette: 'cedar-charcoal' });
    } catch {
      /* storage unavailable: ask again */
    }
  }
  return new Promise((resolve) => {
    const stage = app.canvas.parentElement!;
    const o = document.createElement('div');
    o.className = 'dropzone';
    // the finished example sits behind the card, so the page is a picture first and words second
    // a model handed across from the workspace (?handoff=<id>): no example picture behind, so it is not taken for the model
    const hid = qs.get(HANDOFF_PARAM);
    o.style.cssText = hid
      ? 'background:#21121f;place-items:end start;padding:clamp(12px,3vw,28px)'
      : "background:linear-gradient(180deg,rgba(33,18,31,0) 35%,rgba(33,18,31,.5) 100%),url('hero.webp') center/cover no-repeat #21121f;place-items:end start;padding:clamp(12px,3vw,28px)";
    o.innerHTML = `<div class="card drop-card" style="max-width:440px;background:rgba(249,246,242,.94);backdrop-filter:blur(10px)">
      <h2>Drop your plan</h2>
      <p>A PDF, a picture of a plan, an IFC or a plan model. It comes back as a measured 3D home you can walk through, furnished and lit.</p>
      <div class="row wrap"><label class="pill solid" tabindex="0">Choose a file<input type="file" id="dropFile" accept=".pdf,.png,.jpg,.jpeg,.webp,.json,.ifc,.glb,.gltf" hidden></label><button class="pill" id="dropSample">Try the 16A plan model</button></div>
      <label class="slider">Finishes <select id="dropPalette">${Object.entries(PRESETS)
        .map(([k, v]) => `<option value="${k}">${v.name}</option>`)
        .join('')}</select></label>
      <details class="small" style="margin-top:10px"><summary>How it reads a plan, and what leaves your browser</summary><p class="small">Drop a <b>PDF</b> of the plans (or a picture of a plan) and the tool finds the floor plan, reads its walls, openings and rooms, checks them against the written dimensions and builds the homes. Drop a <b>plan model</b> (.json from Plan to 4D) to skip the reading. Every room is furnished from its name and finished in the palette you pick. An <b>IFC</b> or <b>GLB</b> from Revit, ArchiCAD or Blender is shown as it is.</p><p class="small">Plan models, IFC and GLB files never leave your browser. A PDF with real linework is measured in your browser too; if its plan is a picture (many CAD exports, all scans), you are asked before a crop goes to the lab’s AI plan reader, which does not keep it.</p></details>
      <p class="small" style="margin:10px 0 0"><a href="./">Back to the example</a> · The picture behind is the example: a rendering of a plan model, not a photograph.</p>
    </div>`;
    stage.append(o);
    const pal = () => (o.querySelector('#dropPalette') as HTMLSelectElement).value;
    let tracing = false;
    const done = (input: Input) => {
      o.remove();
      if (input.kind === 'plan')
        try {
          sessionStorage.setItem(KEEP, JSON.stringify({ plan: input.plan, name: input.name }));
        } catch {
          /* too big or blocked: finishes changes will ask for the file again */
        }
      resolve({ input, palette: pal() });
    };
    const read = async (f: File) => {
      const ext = f.name.toLowerCase().split('.').pop();
      if (ext === 'json') {
        try {
          const plan = JSON.parse(await f.text()) as PlanModel;
          if (!Array.isArray(plan.buildings)) throw new Error('no buildings in this file');
          done({ kind: 'plan', plan, name: f.name });
        } catch (e) {
          app.log(`That JSON isn't a plan model: ${(e as Error).message}`);
        }
      } else if (ext === 'ifc' || ext === 'glb') {
        if (f.size > BROWSER_3D_LIMIT) {
          const card = o.querySelector('.drop-card') as HTMLElement;
          card.querySelector('h2')!.textContent = 'Too big to open in a browser';
          card.querySelector('p')!.textContent = `${f.name} is ${mb(f.size)}. This page opens IFC and GLB files up to ${mb(BROWSER_3D_LIMIT)}: bigger ones can freeze the browser. An IFC exported without furniture, or a lighter copy, can open.`;
          app.log('Waiting for a smaller file.');
          return;
        }
        done({ kind: ext, bytes: await f.arrayBuffer(), name: f.name });
      }
      else if (ext === 'pdf' || ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'webp') {
        if (tracing) return;
        tracing = true;
        const got = await traceDrawing(app, f, o);
        tracing = false;
        if (got) done({ kind: 'plan', plan: got.plan as unknown as PlanModel, name: got.name });
        else app.log('Waiting for a plan.');
      } else app.log('Drop a PDF of the plans, a picture of a plan, a .json plan model, an .ifc or a .glb.');
    };
    (o.querySelector('#dropFile') as HTMLInputElement).addEventListener('change', (e) => {
      const f = (e.target as HTMLInputElement).files?.[0];
      if (f) void read(f);
    });
    o.querySelector('#dropSample')!.addEventListener('click', async () => {
      const plan = (await import('./plan16a.json')).default as unknown as PlanModel;
      done({ kind: 'plan', plan, name: '16A plan model (sample)' });
    });
    for (const ev of ['dragover', 'dragenter']) stage.addEventListener(ev, (e) => {
      e.preventDefault();
      o.classList.add('over');
    });
    stage.addEventListener('dragleave', () => o.classList.remove('over'));
    stage.addEventListener('drop', (e) => {
      e.preventDefault();
      const f = (e as DragEvent).dataTransfer?.files?.[0];
      if (f) void read(f);
    });
    if (hid) {
      const card = o.querySelector('.drop-card') as HTMLElement, h = card.querySelector('h2')!, say = card.querySelector('p')!;
      const caption = card.lastElementChild as HTMLElement; // "The picture behind is the example": there is no picture behind here
      const missing = (why: string) => {
        h.textContent = 'The model did not come across';
        say.textContent = `${why} Go back to the workspace and press Open in 3D again, or choose the file here.`;
        app.log('Waiting for a plan.');
      };
      h.textContent = 'Bringing your model across';
      say.textContent = 'From your workspace, inside this browser. It does not leave this device.';
      caption.hidden = true;
      app.log('Bringing the model across from your workspace…');
      takeHandoff(hid)
        .then((got) => {
          if (!got) return missing('It was opened here once already, or it was handed across more than an hour ago.');
          app.log(`Opening ${got.name}…`);
          return read(new File([got.blob], got.name, { type: got.type || 'application/octet-stream' }));
        })
        .catch((e: unknown) => missing(`This browser could not pass it across (${(e as Error)?.message ?? 'no reason given'}).`));
      return;
    }
    app.log('Waiting for a plan.');
  });
}

export const projectPlan: Project = {
  key: 'plan-to-twin',
  title: 'Drop a plan, get a twin',
  kicker: 'plan to twin',
  lat: -36.85,
  lon: 174.76,
  chips: [
    { text: 'Generated from your plan model', tone: 'ok' },
    { text: 'Site: from the model, no survey', tone: 'warn', title: 'Ground is the plan model’s own fall plane (or flat), not a survey' },
  ],
  async build(app: App): Promise<Built> {
    const { input, palette } = await chooser(app);
    // real ground fetched for this plan in this browser tab (siteGround.ts): built into a copy, so the dropped plan, the kept
    // copy and a share link never carry the site's position
    const asDropped = input.kind === 'plan' ? input.plan : null;
    let onGround: { store: GroundStore; applied: Applied } | null = null, groundFailed: string | undefined;
    if (input.kind === 'plan' && !input.plan.site?.terrain) {
      const st = loadGround(input.plan);
      if (st) try {
        const ap = applyGround(input.plan, st);
        input.plan = { ...input.plan, site: { ...(input.plan.site ?? {}), terrain: ap.terrain as unknown as Terrain, features: [...(input.plan.site?.features ?? []), ...ap.features] } };
        onGround = { store: st, applied: ap };
        (window as unknown as { __ground?: unknown }).__ground = onGround;   // for checks from the console: what was loaded and how it was placed (this tab only)
      } catch (e) { groundFailed = `The ground kept for this plan could not be used (${(e as Error).message}). The model is on its assumed ground.`; }
    }
    const fromQ = new URLSearchParams(location.search).has('fin') ? fromURL() : null;
    const sched = fromQ ?? { s: complete(PRESETS[palette]?.s ?? PRESETS['cedar-charcoal'].s), name: PRESETS[palette]?.name ?? 'Cedar and charcoal' };
    const fin = toFinishes(sched.s, sched.name);
    const q = app.quality;
    const M = twinMats(q);
    document.getElementById('title')!.textContent = input.kind === 'plan' ? input.plan.job?.title ?? input.name : input.name;
    const model = new THREE.Group();
    model.name = 'model';
    let centre = new THREE.Vector3();
    let radius = 20;
    let groundAt = (_e: number, _n: number) => 0;
    const fitouts: THREE.Object3D[] = [];
    let plantObj: THREE.Object3D | null = null;
    let landObj: THREE.Object3D | null = null;
    let lightObj: THREE.Object3D | null = null;
    let dressed: Dressed | null = null;   // model-dress
    let sunFace: THREE.Vector3 | undefined;
    let siteNorth: [number, number] | undefined;
    let terrain: Terrain | null = null;
    let bushObj: THREE.Object3D | null = null;
    const keys: Key[] = [];
    const layoutGroups: { building: string; name: string; group: THREE.Object3D; seats: number }[] = [];

    if (input.kind === 'plan') {
      const P = input.plan;
      const fall = P.site?.fall;
      const T = P.site?.terrain;
      terrain = T ?? null;
      const plane = (x: number, z: number) => (T ? (inside(T, T.centre, x, z) || !T.far ? gridAt(T, T.centre, x, z) : gridAt(T.far, T.centre, x, z)) : fall ? fall.y + fall.slopeX * (x - fall.at[0]) + fall.slopeZ * (z - fall.at[1]) : 0);
      // pads under each footprint and its decks
      const pads: { x0: number; x1: number; z0: number; z1: number; y: number; poly?: [number, number][] }[] = [];
      for (const b of P.buildings) {
        // a free-form building: the ground is cut to just under its floor inside its own outline (not a box round it)
        if (isFreeform(b)) { const bb = fpBox(b.footprint); pads.push({ x0: b.origin[0] + bb.u0, x1: b.origin[0] + bb.u1, z0: b.origin[1] + bb.v0, z1: b.origin[1] + bb.v1, y: (b.floorLevel ?? 0) - 0.05, poly: b.footprint.map(([u, v]) => [b.origin[0] + u, b.origin[1] + v] as [number, number]) }); continue; }
        const L = b.levels[0];
        const W = Math.max(...L.walls.filter((w) => w.axis === 'z').map((w) => w.at));
        const D = Math.max(...L.walls.filter((w) => w.axis === 'x').map((w) => w.at));
        const ds = (L as unknown as { decks?: { u0: number; u1: number; v0: number; v1: number }[] }).decks ?? [];
        const ffl = b.floorLevel ?? 0;
        const xs = [0, W, ...ds.flatMap((d) => [d.u0, d.u1])];
        const zs = [0, D, ...ds.flatMap((d) => [d.v0, d.v1])];
        pads.push({ x0: b.origin[0] + Math.min(...xs) - 0.6, x1: b.origin[0] + Math.max(...xs) + 0.6, z0: b.origin[1] + Math.min(...zs) - 0.6, z1: b.origin[1] + Math.max(...zs) + 0.6, y: ffl - 0.45 });
      }
      groundAt = (e: number, n: number) => {
        const x = e;
        const z = -n;
        let y = plane(x, z);
        for (const p of pads) if (x > p.x0 && x < p.x1 && z > p.z0 && z < p.z1 && (!p.poly || inPoly([x, z], p.poly))) y = Math.min(y, p.y);
        return y;
      };
      scandi.on = true;
      siteNorth = T?.north ?? P.site?.north;
      const box = new THREE.Box3();
      if (P.asBuilt) { app.log('Loading the building model…'); const h = await asBuiltModel(P.asBuilt); model.add(h); h.updateMatrixWorld(true); box.expandByObject(h); }
      else for (const b of P.buildings) {
        if (isFreeform(b)) {
          app.log(`Generating ${b.name ?? b.id}…`);
          // the ground under it, so its base reaches down to the ground where the site falls away
          const fb = buildFreeform(b, q, (u, v) => plane(b.origin[0] + u, b.origin[1] + v) - (b.floorLevel ?? 0));
          fb.group.position.set(b.origin[0], b.floorLevel ?? 0, b.origin[1]);
          model.add(fb.group); fb.group.updateMatrixWorld(true); box.expandByObject(fb.group);
          for (const [name, g] of Object.entries(fb.layouts)) layoutGroups.push({ building: b.name ?? b.id, name, group: g, seats: fb.seats[name] });
          continue;
        }
        const pl: Placement = { origin: [b.origin[0], -b.origin[1]], u: [1, 0], v: [0, -1], ffl: b.floorLevel ?? 0, bearing: 90 };
        app.log(`Generating ${b.name ?? b.id}…`);
        const h = buildHome({ key: b.id, spec: b, placement: pl, limits: [], ground: groundAt, quality: q, finishes: fin });
        model.add(h);
        h.updateMatrixWorld(true);
        box.expandByObject(h);
      }
      { app.log('Loading scanned materials…'); try { const fin0 = (P.buildings[0] as unknown as { finish?: { claddingProfile?: string; claddingColour?: string } }).finish; await scannedFinishes(model, M.sets, fin0?.claddingProfile === 'metal' ? { cladding: 'metal', claddingColour: fin0.claddingColour ? new THREE.Color(fin0.claddingColour).getHex() : undefined } : {}); } catch (e) { console.warn('scanned materials unavailable; keeping the drawn ones', e); } }
      app.log('Placing library pieces…');
      // a dropped plan is furnished entirely in code; only a finished building model still draws on the objects library
      if (P.asBuilt) await fillSlots(model);
      model.traverse((o) => {
        if (o.name === 'fit_out') fitouts.push(o);
      });
      // picks from the ops page's Library (?picks=<project id>): placed where they fit, the rest on a strip to drag in
      if (new URLSearchParams(location.search).has('picks')) {
        try { const { applyPicks } = await import('./library/picks'); await applyPicks(app as never, model, undefined, P); } catch (e) { console.warn('the picks could not be placed', e); }
      }
      // clear glass, a timber soffit, and the rooms lit by day as well so the interior reads from outside
      const ed = !P.asBuilt; // the editorial look, on a flat pad or on surveyed ground; a finished building model keeps its own
      if (ed) applyEditorial(model);
      const moodOf = (alt: number): Mood => (alt < 2 ? 'dusk' : alt < 26 ? 'golden' : 'day');
      app.onSun.push((night, alt) => setInteriorLights(fitouts, !ed ? Math.max(night, 0.42) : Math.max(night, LOOK[moodOf(alt)].rooms)));
      if (ed) {
        const runs: EaveRun[] = [];
        for (const b of P.buildings) {
          if (isFreeform(b)) continue;
          const y0 = b.floorLevel ?? 0;
          for (const w of b.levels[0].walls as unknown as { axis: 'x' | 'z'; at: number; out: number; openings: { a: number; b: number; kind: string }[] }[]) {
            for (const o of w.openings ?? []) {
              if (o.b - o.a < 1.1) continue;
              const pt = (t: number) => (w.axis === 'x' ? new THREE.Vector3(b.origin[0] + t, y0, b.origin[1] + w.at) : new THREE.Vector3(b.origin[0] + w.at, y0, b.origin[1] + t));
              runs.push({ a: pt(o.a + 0.1), b: pt(o.b - 0.1), out: w.axis === 'x' ? new THREE.Vector3(0, 0, w.out) : new THREE.Vector3(w.out, 0, 0) });
            }
          }
        }
        // profiled steel cladding as real ribs, in place of a picture of ribs
        {
          let clad: THREE.MeshPhysicalMaterial | null = null;
          model.traverse((o) => { const mm = (o as THREE.Mesh).material as THREE.MeshPhysicalMaterial | undefined; if (!clad && mm && !Array.isArray(mm) && /profiled steel sheet, ribs/.test(String(mm.userData?.scanned ?? ''))) clad = mm; });
          if (clad) {
            const cm = clad as THREE.MeshPhysicalMaterial;
            cm.map = null; cm.normalMap = null; cm.roughnessMap = null; cm.roughness = 0.5; cm.metalness = 0.45; cm.clearcoat = 0.2; cm.needsUpdate = true;
            const rw: RibWall[] = [];
            for (const b of P.buildings) {
              if (isFreeform(b)) continue;
              const y0 = b.floorLevel ?? 0;
              for (const w of b.levels[0].walls as unknown as { axis: 'x' | 'z'; at: number; from: number; to: number; out: number; openings: { a: number; b: number; sill: number; head: number }[] }[]) {
                const pt = (t: number) => (w.axis === 'x' ? new THREE.Vector3(b.origin[0] + t, y0, b.origin[1] + w.at) : new THREE.Vector3(b.origin[0] + w.at, y0, b.origin[1] + t));
                rw.push({ a: pt(w.from), b: pt(w.to), out: w.axis === 'x' ? new THREE.Vector3(0, 0, w.out) : new THREE.Vector3(w.out, 0, 0), openings: (w.openings ?? []).map((o) => ({ a: o.a - w.from, b: o.b - w.from, sill: o.sill, head: o.head })) });
              }
            }
            model.updateMatrixWorld(true);
            const ribs = claddingRibs(model, rw, cm);
            if (ribs) model.add(ribs);
          }
        }
        // a table and chairs on the largest deck: something of known size to read the building against,
        // with a lounge setting and planters where the deck is big enough (rules in outdoor.ts; all proposed)
        for (const b of P.buildings) {
          const L0 = b.levels[0] as unknown as { decks?: DeckPlan[]; walls: { axis: 'x' | 'z'; at: number }[] };
          if (!L0.decks?.length) continue;
          const hw = Math.max(...L0.walls.filter((w) => w.axis === 'z').map((w) => w.at)), hd = Math.max(...L0.walls.filter((w) => w.axis === 'x').map((w) => w.at));
          const df = furnishDecks(scandiMats(), L0.decks.flatMap((d) => deckSlabs(d as never)), hw, hd, b.floorLevel ?? 0);
          df.position.set(b.origin[0], 0, b.origin[1]);
          model.add(df);
        }
        model.updateMatrixWorld(true);
        lightObj = eaveLights(model, runs);
        // proposed deck uplights: along the open deck edges, and up the cladding between the openings where a wall stands over a deck
        {
          const dk: DeckRect[] = [], hs: { x0: number; x1: number; z0: number; z1: number }[] = [], dw: DeckWall[] = [];
          for (const b of P.buildings) {
            if (isFreeform(b)) continue;
            const y0 = b.floorLevel ?? 0, ox = b.origin[0], oz = b.origin[1], L0 = b.levels[0];
            const ws = L0.walls as unknown as { axis: 'x' | 'z'; at: number; from: number; to: number; out: number; openings: { a: number; b: number }[] }[];
            hs.push({ x0: ox, x1: ox + Math.max(...ws.filter((w) => w.axis === 'z').map((w) => w.at)), z0: oz, z1: oz + Math.max(...ws.filter((w) => w.axis === 'x').map((w) => w.at)) });
            for (const d of ((L0 as unknown as { decks?: { u0: number; u1: number; v0: number; v1: number; drop?: number; poly?: [number, number][] }[] }).decks ?? []).flatMap(deckSlabs)) dk.push({ x0: ox + d.u0, x1: ox + d.u1, z0: oz + d.v0, z1: oz + d.v1, y: y0 - (d.drop ?? 0.05) });
            for (const w of ws) {
              const pt = (t: number) => (w.axis === 'x' ? new THREE.Vector3(ox + t, y0, oz + w.at) : new THREE.Vector3(ox + w.at, y0, oz + t));
              dw.push({ a: pt(w.from), b: pt(w.to), out: w.axis === 'x' ? new THREE.Vector3(0, 0, w.out) : new THREE.Vector3(w.out, 0, 0), openings: (w.openings ?? []).map((o) => ({ a: o.a - w.from, b: o.b - w.from })) });
            }
          }
          deckUplights(lightObj, dk, hs, dw);
        }
        const lo = lightObj;
        app.onSun.push((night, alt) => setEaveLights(lo, night, moodOf(alt)));
      }
      centre = box.getCenter(new THREE.Vector3());
      radius = Math.max(14, box.getSize(new THREE.Vector3()).length() * 0.9);
      // planting from the plan model, in its own frame
      if (P.planting) {
        const list: { sp: Species; x: number; y: number; z: number; s?: number }[] = [];
        const map: Record<string, Species> = { harakeke: 'harakeke', tikouka: 'tikouka', tussock: 'tussock', hebe: 'hebe', toetoe: 'tussock', nikau: 'nikau', fern: 'fern', ponga: 'ponga', wheki: 'wheki' };
        for (const [k, arr] of Object.entries(P.planting)) {
          if (!Array.isArray(arr) || !map[k]) continue;
          for (const it of arr as unknown[]) {
            const at = Array.isArray(it) ? (it as [number, number]) : (it as { at: [number, number] }).at;
            const s = Array.isArray(it) ? 1 : (it as { s?: number }).s ?? 1;
            list.push({ sp: map[k], x: at[0], y: groundAt(at[0], -at[1]) - 0.02, z: at[1], s });
          }
        }
        plantObj = planting(list, 'Planting from the plan model (proposed).');
      }
      if (P.site?.features?.length) landObj = siteLayer(P.site.features, groundAt, q);
      if (T && landObj) {
        try { const [dc, dn, dr] = await scanSet('deck', 1.8, 1.8); const stairM = new THREE.MeshStandardMaterial({ color: 0xd9d2c6, map: dc, normalMap: dn, roughnessMap: dr, roughness: 1 }); landObj.traverse((o) => { if (o.name === 'stairs') (o as THREE.Mesh).material = stairM; }); } catch { /* keep the plain timber */ }
      }
      // keys: aerial, then each building's front and living space
      keys.push({ label: 'Aerial', eye: centre.clone().add(new THREE.Vector3(-radius * 0.7, radius * 0.8, radius * 0.9)), look: centre.clone() });
      if (T) {
        // on real ground: look back up the fall line, and stand where there is ground to stand on
        let gx = 0, gz = 0; for (const [dx, dz] of [[6, 0], [-6, 0], [0, 6], [0, -6]]) { const dh = plane(centre.x + dx, centre.z + dz) - plane(centre.x, centre.z); gx -= dh * dx; gz -= dh * dz; }
        const dl = Math.hypot(gx, gz) || 1, dn = new THREE.Vector3(gx / dl, 0, gz / dl), side = new THREE.Vector3(-dn.z, 0, dn.x);
        const stand = (v: THREE.Vector3, up: number) => { v.y = Math.max(v.y, plane(v.x, v.z) + up); return v; };
        keys.length = 0;
        keys.push({ label: 'From below', eye: stand(centre.clone().addScaledVector(dn, 24).addScaledVector(side, 13).setY(centre.y + 3), 6), look: centre.clone() });
        keys.push({ label: 'Aerial', eye: centre.clone().addScaledVector(dn, 34).addScaledVector(side, -20).setY(centre.y + 30), look: centre.clone() });
        keys.push({ label: 'Deck side', eye: stand(centre.clone().addScaledVector(side, 17).addScaledVector(dn, 9).setY(centre.y + 1), 2.5), look: centre.clone() });
        // the bush, thinned by the plan model's proposed clearing (site.terrain.clearing) and kept off the house and decks
        if (T.trees?.length) bushObj = P.asBuilt ? await bush(T.trees, plane, [centre.x, centre.z]) : await nativeBush(T.trees as [number, number, number, number, string][], plane, [centre.x, centre.z], { clearing: (T as unknown as NonNullable<Parameters<typeof nativeBush>[3]>).clearing, keepOut: pads });
      }
      { const V = T?.views ?? P.views;
        if (V?.length) { keys.length = 0; for (const v of V) keys.push({ label: v.label, eye: new THREE.Vector3(...v.eye), look: new THREE.Vector3(...v.look) }); }
      }
      let heroFront: { nrm: THREE.Vector3; along: THREE.Vector3 } | null = null;
      if (ed && P.buildings[0] && !isFreeform(P.buildings[0])) {
        // the opening view: eye height, square-on to the most glazed wall, a little off-centre
        const b0 = P.buildings[0], ws = b0.levels[0].walls as unknown as { axis: 'x' | 'z'; at: number; from: number; to: number; out: number; openings: { a: number; b: number }[] }[];
        const best = [...ws].sort((p1, p2) => p2.openings.reduce((t, o) => t + o.b - o.a, 0) - p1.openings.reduce((t, o) => t + o.b - o.a, 0))[0];
        if (best) {
          const mid = (best.from + best.to) / 2, len = best.to - best.from, dist = Math.max(10, len * 1.35), ox = b0.origin[0], oz = b0.origin[1], y0 = b0.floorLevel ?? 0;
          const wm = best.axis === 'x' ? new THREE.Vector3(ox + mid, y0, oz + best.at) : new THREE.Vector3(ox + best.at, y0, oz + mid);
          const nrm = best.axis === 'x' ? new THREE.Vector3(0, 0, best.out) : new THREE.Vector3(best.out, 0, 0), along = new THREE.Vector3(-nrm.z, 0, nrm.x);
          if (!(T?.views ?? P.views)?.length && !T) keys.unshift({ label: 'Hero', eye: wm.clone().addScaledVector(nrm, dist).addScaledVector(along, dist * 0.32).setY(y0 + 1.45), look: wm.clone().setY(y0 + 1.25) });
          heroFront = { nrm, along };
          sunFace = nrm;
        }
      }
      if (!T && !P.planting && heroFront) {
        const hf = heroFront, sz = box.getSize(new THREE.Vector3()), bx = box.clone().expandByScalar(1.3);
        const halfAlong = (Math.abs(hf.along.x) * sz.x + Math.abs(hf.along.z) * sz.z) / 2, halfDepth = (Math.abs(hf.nrm.x) * sz.x + Math.abs(hf.nrm.z) * sz.z) / 2;
        const np = nativePlanting({ centre, front: hf.nrm, along: hf.along, halfAlong, halfDepth, groundAt: (x, z) => groundAt(x, -z), keepOut: (x, z) => x > bx.min.x && x < bx.max.x && z > bx.min.z && z < bx.max.z });
        plantObj = np.group;
        let tt = 0;
        app.onFrame.push((dt) => { tt += dt; for (const n of np.sway) { n.node.rotation.z = Math.sin(tt * 0.9 + n.phase) * n.amp; n.node.rotation.x = Math.cos(tt * 0.7 + n.phase * 1.3) * n.amp * 0.6; } });
      }
      if (!(T?.views ?? P.views)?.length) for (const b of P.buildings) {
        const ffl = b.floorLevel ?? 0;
        const o = new THREE.Vector3(b.origin[0], ffl, b.origin[1]);
        keys.push({ label: `${b.name ?? b.id} outside`, eye: o.clone().add(new THREE.Vector3(-3, 1.6, 14)), look: o.clone().add(new THREE.Vector3(5.4, 1.2, 3)) });
        keys.push({ label: `${b.name ?? b.id} inside`, eye: o.clone().add(new THREE.Vector3(5, 1.6, 4.9)), look: o.clone().add(new THREE.Vector3(5.3, 1.4, -1.5)) });
      }
    } else {
      // IFC or GLB as it is
      let obj: THREE.Object3D;
      if (input.kind === 'ifc') {
        const res = await loadIFC(new Uint8Array(input.bytes), `${BASE}twin/web-ifc.wasm.b64.txt`, (d, t) => app.log(`Reading IFC… ${d} of ${t}`), true);
        obj = res.root;
        app.log(`IFC read: ${res.elements} elements, ${res.schema}.`);
      } else {
        // a browser copy of a big model is meshopt-compressed (docs/architecture/browser-copy.md)
        const gl = new GLTFLoader(); gl.setMeshoptDecoder(MeshoptDecoder);
        obj = (await gl.parseAsync(input.bytes, '')).scene;
      }
      obj.traverse((m) => {
        if ((m as THREE.Mesh).isMesh) m.castShadow = m.receiveShadow = true;
      });
      const b = new THREE.Box3().setFromObject(obj);
      obj.position.y -= b.min.y;
      model.add(obj);
      const b2 = new THREE.Box3().setFromObject(model);
      centre = b2.getCenter(new THREE.Vector3());
      radius = Math.max(10, b2.getSize(new THREE.Vector3()).length() * 0.9);
      keys.push({ label: 'Aerial', eye: centre.clone().add(new THREE.Vector3(-radius * 0.7, radius * 0.7, radius * 0.9)), look: centre.clone() });
      keys.push({ label: 'Eye level', eye: centre.clone().add(new THREE.Vector3(0, 1.6 - centre.y, radius * 0.8)), look: centre.clone() });
      dressed = await dressModel(app, obj, { kind: input.kind, bytes: input.kind === 'ifc' ? input.bytes : undefined, quality: q, view: keys[keys.length - 1] });   // model-dress: finishes, planting, light
    }

    // real ground where the model carries it: the survey grid with its aerial photo, a coarser far field, and the sea
    let realGround: THREE.Group | null = null;
    if (terrain) {
      const T = terrain; realGround = new THREE.Group(); realGround.name = 'ground';
      // no photo with the ground: colour it from its own heights (slope tint and a line each metre) rather than leave it blank
      const drawn = !T.photo || T.photoKind === 'contours';
      const nearM = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.96, metalness: 0, map: await photoTex(T.photo ?? contourPhoto(T.heights, T.n, T.datum ?? 0, T.size / (T.n - 1))) });
      // the photo's own shade is blue: warm it a little so open ground reads as grass and leaf litter
      if (input.kind === 'plan' && !input.plan.asBuilt && !drawn) nearM.color.setRGB(1.3, 1.16, 0.82);
      const ng = sheet(T.centre, T.size, Math.min(480, (T.n - 1) * 2), (x, z) => groundAt(x, -z) - 0.01);
      try {
        // forest-floor relief at its real size, on a second set of coordinates measured in metres
        const p = ng.getAttribute('position'), uv1 = new Float32Array(p.count * 2); for (let i = 0; i < p.count; i++) { uv1[i * 2] = p.getX(i) / 2.3; uv1[i * 2 + 1] = p.getZ(i) / 2.3; }
        ng.setAttribute('uv1', new THREE.BufferAttribute(uv1, 2));
        const [, fn, fr] = await scanSet('floor', 2.3, 2.3); fn.channel = fr.channel = 1; nearM.normalMap = fn; nearM.roughnessMap = fr; nearM.normalScale.set(1.4, 1.4); nearM.roughness = 1;
      } catch (e) { console.warn('forest floor relief unavailable', e); }
      const near = new THREE.Mesh(ng, nearM);
      near.receiveShadow = true; near.name = 'ground_survey'; realGround.add(near);
      if (T.far) {
        const F = T.far, farM = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0, map: F.photo ? await photoTex(F.photo) : null });
        const far = new THREE.Mesh(sheet(T.centre, F.size, F.n - 1, (x, z) => gridAt(F, T.centre, x, z) - (inside(T, T.centre, x, z, 4) ? 8 : 0.5)), farM);
        far.receiveShadow = true; far.name = 'ground_far'; realGround.add(far);
      }
      if (T.sea !== undefined) {
        const sea = new THREE.Mesh(new THREE.CircleGeometry(9000, 64).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: input.kind === 'plan' && !input.plan.asBuilt ? 0x2c86a0 : 0x4a6a78, roughness: 0.14, metalness: 0 }));
        sea.position.set(T.centre[0], T.sea + 0.35, T.centre[1]); sea.name = 'sea'; realGround.add(sea);
      }
      realGround.userData = { kind: 'terrain', name: 'Ground', source: 'survey', note: T.source ?? 'Ground from a survey grid.' };
    }
    // whatever stands above the ground in the surface model, as plain blocks: trees and buildings are not told apart
    let topsObj: THREE.Object3D | null = null;
    if (terrain?.tops && input.kind === 'plan') {
      const T = terrain, K = T.tops!, step = K.size / (K.n - 1), cells: [number, number, number][] = [];
      const padsNow = input.plan.buildings.map((b) => { if (isFreeform(b)) { const bb = fpBox(b.footprint); return { x0: b.origin[0] + bb.u0 - 4, x1: b.origin[0] + bb.u1 + 4, z0: b.origin[1] + bb.v0 - 4, z1: b.origin[1] + bb.v1 + 4 }; } const ws = b.levels[0].walls, W = Math.max(...ws.filter((w) => w.axis === 'z').map((w) => w.at)), D = Math.max(...ws.filter((w) => w.axis === 'x').map((w) => w.at)); return { x0: b.origin[0] - 4, x1: b.origin[0] + W + 4, z0: b.origin[1] - 4, z1: b.origin[1] + D + 4 }; });
      for (let j = 0; j < K.n; j++) for (let i = 0; i < K.n; i++) {
        const h = K.heights[j * K.n + i], x = T.centre[0] + i * step - K.size / 2, z = T.centre[1] + j * step - K.size / 2;
        if (h > 0 && !padsNow.some((q) => x > q.x0 && x < q.x1 && z > q.z0 && z < q.z1)) cells.push([x, z, h]);
      }
      if (cells.length) {
        const im = new THREE.InstancedMesh(new THREE.BoxGeometry(step, 1, step).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ color: 0x7d8672, roughness: 1, metalness: 0 }), cells.length), m4 = new THREE.Matrix4();
        cells.forEach(([x, z, h], k) => { const gy = groundAt(x, -z); im.setMatrixAt(k, m4.makeScale(1, h, 1).setPosition(x, gy, z)); });
        im.instanceMatrix.needsUpdate = true; im.frustumCulled = false; im.castShadow = false; im.receiveShadow = false; im.name = 'tops_from_surface_model';
        im.userData = { kind: 'context', name: 'Tree and building tops', source: 'survey', note: K.note + ' Hidden within 4 m of the house.' };
        topsObj = im;
      }
    }
    // ground: a lawn following the model's fall, cut to pads, fading to context
    const R = Math.max(40, radius * 2.2);
    const N = 160;
    const g = new THREE.PlaneGeometry(R * 2, R * 2, N, N);
    g.rotateX(-Math.PI / 2);
    g.translate(centre.x, 0, centre.z);
    const p = g.getAttribute('position');
    for (let i = 0; i < p.count; i++) p.setY(i, groundAt(p.getX(i), -p.getZ(i)) - 0.01);
    g.computeVertexNormals();
    const uv = g.getAttribute('uv');
    for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / M.sets.lawn.tile, -p.getZ(i) / M.sets.lawn.tile);
    const ground = new THREE.Mesh(g, input.kind === 'plan' && !terrain ? hillsideMat(M.sets.lawn.tile) : M.lawn);
    ground.name = 'ground';
    ground.receiveShadow = true;
    ground.userData = { kind: 'terrain', name: 'Ground', source: 'assumed', note: 'From the plan model’s fall plane, or flat; not a survey.' };

    // the Real ground card rests the 3D view while LINZ's files arrive, and gives it back as it found it
    let pausedBefore = false;
    const groundPause = (on: boolean) => { if (on) { pausedBefore = app.paused; app.paused = true; } else app.paused = pausedBefore; };
    if (input.kind === 'plan') void import('./photoUI').then((m) => m.mountPhoto(app));   // "Make it a photo" (agent/render-1122): card after Stills, button on the view, viewer
    const layers: Layer[] = [
      { id: 'model', label: input.kind === 'plan' ? 'Generated homes, fitted out' : 'Model', visible: true, object: model, model: true },
      realGround ? { id: 'ground', label: 'Ground', note: terrain?.layerNote ?? (terrain?.photo ? 'LiDAR ground and aerial photo; cut to a platform under the house' : 'surveyed ground with contour lines drawn from it; cut to a platform under the house'), visible: true, object: realGround } : { id: 'ground', label: 'Ground', note: 'model fall or flat; not surveyed', visible: true, object: ground },
    ];
    if (topsObj) layers.push({ id: 'tops', label: 'Tree and building tops', note: 'from LINZ’s surface model less its ground model, as plain blocks; trees and buildings are not told apart. Off to start with, so they do not hide the house', visible: false, object: topsObj });
    if (bushObj) layers.push({ id: 'bush', label: 'Bush', note: bushObj.userData.clearing ? 'tree tops from the LiDAR canopy; the clearing round the house, the kept specimens and the species are proposed, not surveyed' : 'tree tops from the LiDAR canopy; native species shown are typical, not surveyed', visible: true, object: bushObj });
    if (plantObj) layers.push({ id: 'planting', label: 'Planting', note: plantObj.name === 'native_planting' ? 'proposed, to frame the building; not from the plan' : 'from the plan model', visible: true, object: plantObj });
    // landscape: the layer now carries the proposed deck uplights as well as the soffit downlights
    if (lightObj) layers.push({ id: 'lights', label: 'Lights', note: 'proposed: soffit downlights over the glazed walls, deck uplights along the deck edges and up the cladding', visible: true, object: lightObj });
    if (landObj) layers.push({ id: 'site', label: 'Site from the drawings', note: 'paths, pads, walls and beds as drawn; species proposed', visible: true, object: landObj });
    if (dressed) layers.push(...dressed.layers);   // model-dress
    // a free-form building's furniture layouts (e.g. banquet and auditorium seating), one shown at a time
    for (const lg of layoutGroups) layers.push({ id: `layout-${lg.name}`, label: `Seating: ${lg.name} (${lg.seats})`, note: `${lg.building}: positions from the plan, furniture proposed`, visible: lg.group.visible, object: lg.group });

    const exports: Built['exports'] = [
      {
        label: 'Model (GLB)',
        run: async () => {
          const glb = (await new GLTFExporter().parseAsync(model, { binary: true, onlyVisible: true })) as ArrayBuffer;
          const z = zipSync({ 'twin.glb': new Uint8Array(glb), 'README.txt': strToU8(`Generated by assembl plan to twin from ${input.name}. Metres, Y up. Element data in glTF extras. Fit-out and finishes are proposed.`) }, { level: 6 });
          return { name: 'twin-glb.zip', blob: new Blob([z as BlobPart], { type: 'application/zip' }) };
        },
      },
      {
        label: 'Model (IFC)',
        run: async () => {
          const ifc = exportIFC(model, { project: document.getElementById('title')!.textContent ?? 'Twin', building: 'Generated', author: 'assembl' });
          const z = zipSync({ 'twin.ifc': strToU8(ifc) }, { level: 6 });
          return { name: 'twin-ifc.zip', blob: new Blob([z as BlobPart], { type: 'application/zip' }) };
        },
      },
    ];
    return {
      sharePlan: input.kind === 'plan' ? () => asDropped : undefined,   // the plan as dropped: ground fetched for a point is never part of a share
      // the approval record and the pre-check name the version of the plan as dropped, the same code the run report and the
      // ops page use; the pre-check still measures falls on whatever ground is showing
      panels: input.kind === 'plan' ? [finishesPanel(app, sched.s, input.plan.job?.title ?? input.name), approvalPanel(app, asDropped ?? input.plan), codeChecksPanel(app, input.plan, asDropped ? modelFingerprint(asDropped) : undefined), groundPanel((m) => app.log(m), asDropped, onGround, groundFailed, groundPause)] : [],
      topPanels: input.kind === 'plan' ? [planRunPanel(app, { plan: asDropped ?? input.plan, shown: input.plan, onGround, pause: groundPause })] : [],
      layers,
      focus: centre,
      ...(input.kind === 'plan' && !input.plan.asBuilt ? { look: 'editorial' as const, sunFace, sunHour: input.plan.site?.sunHour ?? terrain?.sunHour, fogScale: terrain ? 0.22 : 1, shade: terrain?.trees?.length ? ((terrain as unknown as { clearing?: unknown }).clearing ? 1.06 : 1.22) : 1 } : {}),
      ...(terrain ? { maxDistance: 600, shadowRadius: 42, siteChip: { text: terrain.chip ?? (terrain.photo && terrain.photoKind !== 'contours' ? 'Site: LINZ LiDAR and aerial photo' : 'Site: surveyed ground, no aerial photo'), title: terrain.source ?? '' } } : {}),
      ...(terrain && input.kind === 'plan' && input.plan.asBuilt ? { fog: [220, 2600] as [number, number], sunHour: terrain.sunHour ?? 10 } : {}),
      north: siteNorth ? new THREE.Vector2(siteNorth[0], siteNorth[1]) : undefined,
      radius,
      view: { eye: keys[0].eye, look: keys[0].look },
      path: keys,
      section: [centre.y - 3, centre.y + 6],
      support: (pt) => groundAt(pt.x, -pt.z),
      // walk mode stops at the plan's walls and climbs its stairs (walkNav.ts)
      walkNav: input.kind === 'plan' ? (() => { const nv = navFromPlan(input.plan as never); const ws = (input.plan as PlanModel).walk; if (ws) nv.start = { at: ws.start, y: groundAt(ws.start[0], -ws.start[1]), look: ws.look }; return nv; })() : undefined,
      exports,
      sources: [
        `Input: ${input.name}.`,
        input.kind === 'plan' ? 'Walls, openings, partitions, rooms, roof and decks from the plan model; fit-out from room names; finishes from the schedule. Everything not in the plan model is proposed.' : 'Shown as received; element data from the file.',
        'Furniture: Kōwhai Studio library pieces where available, otherwise assembl’s own procedural pieces.',
        ...(terrain?.source ? [`Site: ${terrain.source}`] : []),
      ],
    };
  },
};
