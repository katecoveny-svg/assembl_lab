import { GLASS, unalteredGlass, type GlassMode } from './modelReviewRules';
import * as THREE from 'three/webgpu';
import { luminance, materialColor, mix, mx_noise_float, normalWorld, positionWorld, smoothstep, vec3, vec4 } from 'three/tsl';
import { pbr, type PBRSet } from '../objects/tex';
import type { App, Layer } from './app';
import { twinMats } from './mats';
import { planting as tuftPlanting, type Placement as TuftPlacement } from './plants';
import { nativeBush } from './nativeTrees';
import {
  classify, FINISHES, fillFootprint, fillTri, glassTint, hexOf, ifcMaterialNames, inferIfcClassFromName, makeGrid, markDoor, markRect, markTriEdges,
  meaningfulColour, namedMaterial, needsFrame, normClass, planPlanting, refineByShape, refineElement, styleFor, type Classified, type Finish, type Grid, type PartInfo, type PlantPlan,
} from './dressRules';
import { scanSet } from './scanned';
import { anodised, brick, herringbone, mulch, powderCoat, render, satinSteel, standingSeam, stoneFlags, upholstery } from './dressTex';
import { buildPresentationDetail } from './presentationDetail';

// The finished look for an opened IFC or GLB (agent/model-dress-1123).
//
// A model from Revit or ArchiCAD arrives with flat colours, or none: on the 3D page it read as grey plastic beside the homes
// generated from plans. This step gives it the same surfaces, planting and light those homes have, without moving or adding
// a single building element:
//  - each part gets a finish from its IFC class and material name (the table in dressRules.ts): physically based tinted glass,
//    dark anodised mullions, standing-seam roofing, brick, timber, concrete or render walls, honed slabs, paving, upholstery…
//    every one a fine texture made in code, shared and generated once. The inspector card names each part's finish and why.
//  - "As it is", "Model's colours" (the model's own colours over the same fine surfaces) or "Finished look".
//  - native planting (harakeke, tussock, carex, ponga, tī kōuka, pōhutukawa, kānuka) in the model's own landscape areas, or a
//    ring on open ground round the footprint; never on paving, in a door's way or inside the footprint. Proposed, and said so.
//  - a soft contact shade where the building meets the ground, a light colour grade, and a finished still that averages
//    jittered frames.
// The hook in projectPlan.ts is two lines; the ground, the site and the camera path are other modules' work.

export type DressMode = 'asis' | 'model' | 'finished';
export interface DressOpts {
  kind: 'ifc' | 'glb';
  /** the IFC file, for its material and surface style names */
  bytes?: ArrayBuffer;
  quality: 'web' | 'hq';
  /** the opening eye-level view: no trees in front of it */
  view?: { eye: THREE.Vector3; look: THREE.Vector3 };
  /** the building's own bounds (modelBounds.ts), in the scene: planting and the shade go round this, not round far-off strays */
  bounds?: THREE.Box3;
}
export interface Dressed {
  layers: Layer[];
  mode: DressMode;
  glassCount: number;
  setGlass(mode: GlassMode): void;
  set(mode: DressMode): void;
  /** put the planting on new ground (the site's LiDAR, when it is read): ground level at a scene point */
  replant(yAt: ((x: number, z: number) => number) | null): Promise<void>;
  summary(): Record<string, unknown>;
  heroStill(frames?: number): Promise<Blob | null>;
  card: HTMLElement;
}

interface Part {
  mesh: THREE.Mesh;
  slot: number;
  orig: THREE.Material;
  info: PartInfo;
  c: Classified;
  el: THREE.Object3D;
  /** kept as the model has it: its own texture */
  keep?: string;
}

const SKIP = new Set(['IfcSpace', 'IfcOpeningElement', 'IfcAnnotation', 'IfcVirtualElement', 'IfcGrid']);
const SITE_FINISH = new Set<Finish>(['lawn', 'bed', 'paving']);

// --- finishes: one material per finish and colour, textures once per page ------------------------------------------------
const sets = new Map<string, PBRSet>();
const means = new Map<PBRSet, THREE.Color>();
function setFor(f: Finish, q: 'web' | 'hq'): PBRSet | null {
  const k = `${f}/${q}`;
  if (sets.has(k)) return sets.get(k)!;
  const M = twinMats(q), big = q === 'hq' ? 1024 : 512;
  const s: PBRSet | null =
    f === 'roof' ? standingSeam(big) : f === 'brick' ? brick(big) : f === 'paving' ? herringbone(big) : f === 'render' || f === 'neutral' ? render(big)
    : f === 'bed' ? mulch(big) : f === 'stone' ? stoneFlags(big) : f === 'fabric' ? upholstery(big) : f === 'mullion' || f === 'darkMetal' ? anodised(big / 2) : f === 'metal' ? satinSteel(big / 2)
    : f === 'timberCladding' ? M.sets.cedar : f === 'concrete' || f === 'slab' || f === 'asphalt' ? M.sets.concrete : f === 'plaster' ? M.sets.lining : f === 'decking' || f === 'frameTimber' ? M.sets.decking
    : f === 'frameMetal' ? powderCoat(big / 2) : f === 'timber' || f === 'door' ? M.sets.oak : f === 'tile' ? M.sets.tile : f === 'lawn' ? M.sets.lawn : null;
  sets.set(k, s!);
  return s;
}
/** a set's average base colour, linear: what its map multiplies a material's colour by on average */
function meanOf(s: PBRSet) {
  let c = means.get(s);
  if (c) return c;
  c = new THREE.Color(0.8, 0.8, 0.8);
  const img = s.map.image as CanvasImageSource | undefined;
  if (img && ((img as HTMLCanvasElement).width ?? 0) > 0) {
    const k = document.createElement('canvas'); k.width = k.height = 16;
    const g = k.getContext('2d')!; g.drawImage(img, 0, 0, 16, 16);
    const d = g.getImageData(0, 0, 16, 16).data, lin = (v: number) => new THREE.Color().setRGB(v, v, v, THREE.SRGBColorSpace).r;
    let r = 0, gg = 0, b = 0;
    for (let i = 0; i < d.length; i += 4) { r += lin(d[i] / 255); gg += lin(d[i + 1] / 255); b += lin(d[i + 2] / 255); }
    const n = d.length / 4; c.setRGB(r / n, gg / n, b / n);
  }
  means.set(s, c);
  return c;
}
/** finishes whose texture carries its own colours (brick, timber, pavers, lawn): in the finished look their colour is white */
const COLOURED = new Set<Finish>(['brick', 'timberCladding', 'decking', 'frameTimber', 'timber', 'lawn', 'bed', 'stone', 'tile']);
/** finishes that keep a model colour that means something (a coloured frame, a coloured panel) in the finished look */
const KEEP_HUE = new Set<Finish>(['frameMetal', 'neutral', 'fabric', 'metal']);

const mats = new Map<string, THREE.Material>();
const LAWN_TONE = new THREE.Color(0.9, 0.82, 0.58);   // a drier NZ summer green
function glassMat(rgb: [number, number, number], heavy: boolean) {
  const key = `glass/${hexOf(rgb)}/${heavy}`;
  let m = mats.get(key) as THREE.MeshPhysicalMaterial | undefined;
  if (m) return m;
  const tint = new THREE.Color().setRGB(rgb[0], rgb[1], rgb[2], THREE.SRGBColorSpace);
  m = heavy
    // see-through without refraction: a model this size stays smooth; still reflects the sky and carries the tint
    ? new THREE.MeshPhysicalMaterial({ name: 'dress_glass_tinted', color: tint.clone().lerp(new THREE.Color(0, 0, 0), 0.55), metalness: 0, roughness: 0.04, transparent: true, opacity: 0.42, specularIntensity: 1, envMapIntensity: 1.4, side: THREE.DoubleSide, depthWrite: false })
    // daylit glass seen from outside: dark, with the sky in it and a bright fresnel edge (clearcoat), the rooms faint behind it.
    // No transmission pass: it costs a second render of the scene, too much on a phone
    : new THREE.MeshPhysicalMaterial({ name: 'dress_glass_tinted', color: tint.clone().multiplyScalar(0.42), metalness: 0, roughness: 0.02, clearcoat: 1, clearcoatRoughness: 0.01, ior: 1.52, specularIntensity: 1, envMapIntensity: 3.2, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false });   // warm bronze-tinted glass: the lit rooms behind it, the sky in it at a glancing angle (fresnel, clearcoat)
  mats.set(key, m);
  return m;
}
function finishMat(f: Finish, q: 'web' | 'hq', colour: THREE.Color | null) {
  const s = setFor(f, q)!;
  const key = `${f}/${q}/${colour ? colour.getHexString() : '-'}`;
  let m = mats.get(key);
  if (m) return m;
  const extra: THREE.MeshPhysicalMaterialParameters =
    f === 'roof' ? { clearcoat: 0.15, clearcoatRoughness: 0.4, side: THREE.DoubleSide }
    : f === 'fabric' ? { sheen: 1, sheenRoughness: 0.6, sheenColor: new THREE.Color(0.6, 0.6, 0.6), specularIntensity: 0.25 }
    : f === 'frameMetal' || f === 'mullion' ? { clearcoat: 0.1 }
    : f === 'door' ? { clearcoat: 0.3, clearcoatRoughness: 0.35 }
    : f === 'tile' ? { clearcoat: 0.25, clearcoatRoughness: 0.2 }
    : {};
  const pm = pbr(s, `dress_${f}`, { side: THREE.DoubleSide, ...extra });
  // colour = wanted / the texture's own average, so the texture's detail stays and its average lands on the wanted colour
  const mean = meanOf(s);
  const want = colour ?? (f === 'lawn' ? LAWN_TONE.clone().multiply(mean) : COLOURED.has(f) ? null : new THREE.Color().setHex(FINISHES[f].colour, THREE.SRGBColorSpace));
  if (want) pm.color.setRGB(Math.min(4, want.r / Math.max(0.02, mean.r)), Math.min(4, want.g / Math.max(0.02, mean.g)), Math.min(4, want.b / Math.max(0.02, mean.b)));
  if (f === 'roof') {
    // the underside of a roof (eaves, a gateway's canopy) is a warm timber soffit, as architects' renders show it: chosen per
    // fragment by which way the surface faces, so no face of the model is split or moved
    const under = smoothstep(-0.25, -0.6, normalWorld.y);
    pm.colorNode = mix(materialColor.rgb, vec3(0.5, 0.33, 0.19).mul(luminance(materialColor.rgb).mul(1.6).add(0.55)), under);
  } else if (f === 'timber' || f === 'timberCladding' || f === 'decking' || f === 'brick' || f === 'paving' || f === 'concrete') {
    // subtle world-space colour micro-variation so large timber/brick/paving planes avoid uniform CG flatness
    const macro = mx_noise_float(positionWorld.mul(0.28)).mul(0.06).add(1.0);
    pm.colorNode = materialColor.rgb.mul(macro);
  }
  if (f === 'mullion' || f === 'darkMetal' || f === 'frameMetal') {
    // lift pure-black joinery slightly so frames catch sky specular and edge depth reads instead of crushing to black
    pm.color.r = Math.max(pm.color.r, 0.032);
    pm.color.g = Math.max(pm.color.g, 0.034);
    pm.color.b = Math.max(pm.color.b, 0.038);
  }
  pm.userData.dress = f;
  mats.set(key, pm);
  return pm;
}

// --- photographed surfaces (Poly Haven, CC0; plan-studio/twins/tex): laid at their real size over the drawn ones, once loaded ----
// brick (red_brick_03, 1 m), herringbone clay pavers (herringbone_brick_02, 1.84 m, toned pale), concrete (concrete_floor_02, 2 m), the box-profile
// steel roof scan and the timber board scan already used by the example homes. The drawn texture shows until the photo arrives.
const SCANS: Partial<Record<Finish, { set: string; size: number }>> = {
  brick: { set: 'brick', size: 1.0 }, paving: { set: 'pavers', size: 1.84 }, concrete: { set: 'concrete', size: 2.0 }, slab: { set: 'concrete', size: 2.0 },
  asphalt: { set: 'concrete', size: 2.0 }, roof: { set: 'roof', size: 2.0 }, timberCladding: { set: 'clad', size: 1.0 },
};
export const SCAN_CREDIT = 'Photographed surfaces: Poly Haven (CC0): red_brick_03, herringbone_brick_02, concrete_floor_02, and the roof and timber scans of the example homes.';
const scanned = new WeakSet<THREE.Material>();
async function photoSurfaces(q: 'web' | 'hq') {
  for (const [key, m] of mats) {
    const f = (m.userData?.dress as Finish | undefined), sc = f && SCANS[f];
    if (!sc || scanned.has(m)) continue;
    scanned.add(m);
    try {
      const tile = setFor(f!, q)?.tile ?? 1;
      const [col, nor, rgh] = await scanSet(sc.set, sc.size, tile, f === 'roof' || f === 'timberCladding');
      const pm = m as THREE.MeshPhysicalMaterial, want = new THREE.Color(pm.color).multiply(meanOf(setFor(f!, q)!));   // the colour the drawn set landed on
      pm.map = col; pm.normalMap = nor; pm.roughnessMap = rgh; pm.metalnessMap = null; pm.roughness = 1; pm.metalness = f === 'roof' ? 0.35 : 0;
      // the photo's own average, so its detail stays and its average lands where the finish asked (brick keeps its own colour)
      const mean = meanOf({ map: col } as unknown as PBRSet);
      if (f === 'brick') pm.color.setRGB(1, 1, 1);
      else pm.color.setRGB(Math.min(3, want.r / Math.max(0.02, mean.r)), Math.min(3, want.g / Math.max(0.02, mean.g)), Math.min(3, want.b / Math.max(0.02, mean.b)));
      pm.needsUpdate = true;
    } catch (e) { console.warn(`the photographed surface for ${key} did not load; the drawn one stays`, e); }
  }
}

// --- coordinates for the textures: box-projected in metres, roofs down the slope ---------------------------------------
const uvDone = new WeakMap<THREE.BufferGeometry, string>();
const _s = new THREE.Vector3(), _q = new THREE.Quaternion(), _p = new THREE.Vector3();
function ensureUV(mesh: THREE.Mesh, slope: boolean, tile: number, upright = false) {
  const g = mesh.geometry, tag = `${slope}/${tile}/${upright}`;
  if (uvDone.get(g) === tag) return;
  const pos = g.getAttribute('position');
  if (!pos) return;
  if (!g.getAttribute('normal')) g.computeVertexNormals();
  const nor = g.getAttribute('normal');
  mesh.updateWorldMatrix(true, false);
  mesh.matrixWorld.decompose(_p, _q, _s);
  const sx = Math.abs(_s.x) || 1, sy = Math.abs(_s.y) || 1, sz = Math.abs(_s.z) || 1;
  // the mesh's own turn, so a part placed at an angle keeps its courses level and its seams down the slope
  const rot = new THREE.Matrix3().setFromMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(_q));
  const uv = new Float32Array(pos.count * 2), n = new THREE.Vector3(), p = new THREE.Vector3(), t = new THREE.Vector3(), b = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.set(pos.getX(i) * sx, pos.getY(i) * sy, pos.getZ(i) * sz).applyMatrix3(rot);
    n.set(nor.getX(i) / sx, nor.getY(i) / sy, nor.getZ(i) / sz).applyMatrix3(rot).normalize();
    const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z);
    let u: number, v: number;
    if (slope && ay > 0.12 && ay < 0.985) {
      // down the slope, and across it: standing seams run down the roof
      t.set(n.x * n.y, n.y * n.y - 1, n.z * n.y).normalize(); b.crossVectors(n, t).normalize();
      u = p.dot(b); v = p.dot(t);
    } else if (ay >= ax && ay >= az) { u = p.x; v = p.z; }
    else if (ax >= az) { u = p.z; v = p.y; }
    else { u = p.x; v = p.y; }
    if (upright) { const t2 = u; u = v; v = t2; }   // a door: the grain runs up the leaf
    uv[i * 2] = u / tile; uv[i * 2 + 1] = v / tile;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  uvDone.set(g, tag);
}

// --- reading the model ---------------------------------------------------------------------------------------------------
function elementOf(o: THREE.Object3D, root: THREE.Object3D) {
  let t: THREE.Object3D | null = o;
  while (t && t !== root) {
    const u = t.userData ?? {};
    if (u.ifcClass || u.ifc_class || inferIfcClassFromName(t.name)) return t;
    t = t.parent;
  }
  return o;
}
/** the colour as the file writes it: web-ifc and the glTF loader both put the file's numbers straight into the colour */
function colourOf(m: THREE.Material): [number, number, number] | null {
  const c = (m as THREE.MeshStandardMaterial).color;
  return c ? [c.r, c.g, c.b] : null;
}

export async function dressModel(app: App, obj: THREE.Object3D, o: DressOpts): Promise<Dressed> {
  const t0 = performance.now();
  obj.updateMatrixWorld(true);
  const q = o.quality;
  // the IFC's own material and surface style names
  let ifcNames: ReturnType<typeof ifcMaterialNames> | null = null;
  if (o.kind === 'ifc' && o.bytes) { try { ifcNames = ifcMaterialNames(new TextDecoder().decode(new Uint8Array(o.bytes))); } catch (e) { console.warn('the IFC’s material names could not be read', e); } }

  const parts: Part[] = [];
  const elements = new Map<THREE.Object3D, Part[]>();
  let drawn = 0;
  obj.traverse((n) => {
    const mesh = n as THREE.Mesh;
    if (!mesh.isMesh || (mesh as unknown as { isLine?: boolean }).isLine || (mesh as unknown as { isPoints?: boolean }).isPoints) return;
    const el = elementOf(mesh, obj), u = el.userData ?? {};
    // a GLB from IfcOpenShell carries ifc_class, ifc_name and ifc_guid: the inspector reads ifcClass, name and globalId
    if (u.ifc_class && !u.ifcClass) { u.ifcClass = normClass(u.ifc_class); if (u.ifc_name && !u.name) u.name = u.ifc_name; if (u.ifc_guid && !u.globalId) u.globalId = u.ifc_guid; el.userData = u; }
    // class-batched browser-copy GLBs often name each node/mesh after its IFC class without userData extras
    let cls = normClass(u.ifcClass ?? '');
    if (!cls) {
      cls = inferIfcClassFromName(el.name) || inferIfcClassFromName(mesh.name);
      if (cls) { u.ifcClass = cls; el.userData = u; }
    }
    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const g = mesh.geometry, tri = (g.index ? g.index.count : g.getAttribute('position')?.count ?? 0) / 3;
    drawn += tri * ((mesh as THREE.InstancedMesh).isInstancedMesh ? (mesh as THREE.InstancedMesh).count : 1);
    if (SKIP.has(cls)) return;
    list.forEach((m, slot) => {
      if (!m) return;
      const partCls = cls || inferIfcClassFromName(m.name);
      const rgb = colourOf(m);
      let opacity = m.transparent ? m.opacity : (m as THREE.MeshPhysicalMaterial).transmission ? 0.3 : 1;
      let material = m.name ?? '';
      if (ifcNames) {
        const named = ifcNames.names.get(Number(u.expressID));
        material = named?.length ? named.join(', ') : (rgb && styleFor(ifcNames.styles, rgb)) || '';
      }
      // Class-batched IfcWindow meshes exported opaque with a cool glass tint colour read as glazing, not solid dark plates
      if (partCls === 'IfcWindow' && opacity >= 0.95 && !namedMaterial(material, partCls) && rgb && rgb[2] > rgb[1] && rgb[1] > rgb[0] && rgb[2] - rgb[0] > 0.08) {
        opacity = 0.45;
      }
      const info: PartInfo = { cls: partCls, name: String(u.name ?? el.name ?? ''), material, rgb, opacity };
      const p: Part = { mesh, slot: Array.isArray(mesh.material) ? slot : -1, orig: m, info, c: classify(info), el };
      if ((m as THREE.MeshStandardMaterial).map && g.getAttribute('uv')) p.keep = 'its own texture, from the file';
      parts.push(p);
      if (!elements.has(el)) elements.set(el, []);
      elements.get(el)!.push(p);
    });
  });
  const heavy = drawn > 4e6;
  // a part read by its shape when the model gives it no class (dressRules.ts refineByShape): site ground, roof
  {
    const B = o.bounds && !o.bounds.isEmpty() ? o.bounds : new THREE.Box3().setFromObject(obj);
    const span = Math.max(B.max.x - B.min.x, B.max.z - B.min.z, 1), H = Math.max(1, B.max.y - B.min.y);
    const pb = new THREE.Box3(), nm = new THREE.Matrix3(), nv = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    const shapeOf = new Map<THREE.Mesh, { across: number; span: number; slope: number; up: number; high: number; fill?: number }>();
    for (const p of parts) {
      if (normClass(p.info.cls) && p.info.cls !== 'IfcBuildingElementProxy') continue;
      let sh = shapeOf.get(p.mesh);
      if (!sh) {
        const g = p.mesh.geometry, pos = g.getAttribute('position');
        if (!g.boundingBox) g.computeBoundingBox();
        pb.copy(g.boundingBox!).applyMatrix4(p.mesh.matrixWorld);
        nm.getNormalMatrix(p.mesh.matrixWorld);
        // area-weighted: how much of it slopes (0.25 < |ny| < 0.97) and how much faces up
        let A = 0, slope = 0, up = 0, upA = 0;
        const idx = g.index, nt = (idx ? idx.count : pos.count) / 3, step = Math.max(1, Math.floor(nt / 400));
        for (let t = 0; t < nt; t += step) {
          const i0 = idx ? idx.getX(t * 3) : t * 3, i1 = idx ? idx.getX(t * 3 + 1) : t * 3 + 1, i2 = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
          a.fromBufferAttribute(pos, i0).applyMatrix4(p.mesh.matrixWorld); b.fromBufferAttribute(pos, i1).applyMatrix4(p.mesh.matrixWorld); c.fromBufferAttribute(pos, i2).applyMatrix4(p.mesh.matrixWorld);
          nv.subVectors(b, a).cross(c.sub(a)); const ar = nv.length(); if (ar < 1e-9) continue; nv.divideScalar(ar);
          const ny = Math.abs(nv.y); A += ar; if (ny > 0.25 && ny < 0.97) slope += ar; if (ny >= 0.6) { up += ar; upA += (ar / 2) * step; }
        }
        sh = { across: Math.max(pb.max.x - pb.min.x, pb.max.z - pb.min.z), span, slope: A ? slope / A : 0, up: A ? up / A : 0, high: ((pb.min.y + pb.max.y) / 2 - B.min.y) / H, fill: upA / Math.max(1, (pb.max.x - pb.min.x) * (pb.max.z - pb.min.z)) };
        shapeOf.set(p.mesh, sh);
      }
      p.c = refineByShape(p.c, p.info.cls, sh);
    }
  }
  // an element read whole: a door with no glass is its leaf (dressRules.ts refineElement)
  for (const [, ps] of elements) { const r = refineElement(ps[0]?.info.cls ?? '', ps.map((p) => p.c)); ps.forEach((p, i) => (p.c = r[i])); }
  const mark = (what: string) => console.info(`dress: ${what} ${Math.round(performance.now() - t0)} ms`);
  mark('read');

  // texture coordinates for every part that takes a textured finish
  for (const p of parts) {
    if (p.keep || p.c.finish === 'glass') continue;
    const s = setFor(p.c.finish, q);
    if (s) ensureUV(p.mesh, p.c.finish === 'roof', s.tile, p.c.finish === 'door');
  }

  mark('textures and coordinates');
  // what each element looked like before, so "As it is" can give it back
  const origNote = new Map<THREE.Object3D, { note: unknown; material: unknown }>();
  for (const el of elements.keys()) origNote.set(el, { note: el.userData.note, material: el.userData.material });
  // the page's lawn, a little less green and warmer, as grass reads in a photograph (given back in "As it is")
  const lawnM = twinMats(q).lawn, lawnWas = lawnM.color.clone(), lawnNodeWas = (lawnM as unknown as { colorNode: unknown }).colorNode ?? null;
  // a summer lawn is never one green: drier patches metres across and a finer mottle, worked on the lawn's own texture
  const lawnNode = (() => {
    const p = positionWorld.xz, big = smoothstep(-0.35, 0.55, mx_noise_float(p.mul(0.07))), fine = mx_noise_float(p.mul(0.55)).mul(0.5).add(0.5);
    const dry = vec3(1.18, 1.06, 0.66), lush = vec3(0.86, 0.98, 0.78);
    return materialColor.rgb.mul(mix(lush, dry, big)).mul(fine.mul(0.16).add(0.92));
  })();
  const origShadow = new Map<THREE.Mesh, boolean>();
  for (const p of parts) origShadow.set(p.mesh, p.mesh.castShadow);

  let glassMode: GlassMode = 'studio';
  const glassEligible = (p: Part) => p.c.finish === 'glass' && !p.keep && !unalteredGlass(p.info.material ?? '', p.info.name ?? '');
  const matFor = (p: Part, mode: DressMode): THREE.Material => {
    if (mode === 'asis' || p.keep) return p.orig;
    if (p.c.finish === 'glass') {
      const tint = glassMode === 'studio' ? glassTint(p.info).rgb : GLASS.find(k => k.id === glassMode)?.tint;
      return glassEligible(p) && tint ? glassMat(tint, heavy) : p.orig;
    }
    const f = p.c.finish, model = p.info.rgb ? new THREE.Color(p.info.rgb[0], p.info.rgb[1], p.info.rgb[2]) : null;   // as the model draws it
    if (mode === 'model') return finishMat(f, q, model);
    return finishMat(f, q, KEEP_HUE.has(f) && meaningfulColour(p.info) ? model : null);
  };
  const say = (p: Part, mode: DressMode) => {
    if (p.keep) return `kept as the file has it (${p.keep})`;
    const f = p.c.finish;
    if (f === 'glass') return glassEligible(p) && glassMode !== 'authored' ? 'glass appearance preview; not a specification' : 'glass as supplied in the model';
    const lab = mode === 'model' ? `${FINISHES[f].label} surface in the model’s own colour` : `${FINISHES[f].label}${KEEP_HUE.has(f) && meaningfulColour(p.info) ? ' in the model’s own colour' : ''}`;
    return `${lab}: ${p.c.why}`;
  };

  // --- the ground round it: footprint, paving, landscape, doors ------------------------------------------------------
  const bbox = new THREE.Box3();
  const site = new THREE.Box3();
  for (const p of parts) {
    const b = new THREE.Box3().setFromObject(p.mesh);
    if (b.isEmpty()) continue;
    (SITE_FINISH.has(p.c.finish) ? site : bbox).union(b);
  }
  if (bbox.isEmpty()) bbox.setFromObject(obj);
  if (o.bounds && !o.bounds.isEmpty()) bbox.copy(o.bounds);
  const baseY = bbox.min.y;
  const grid: Grid = makeGrid([bbox.min.x, bbox.min.z], [bbox.max.x, bbox.max.z], 26);
  {
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), m = new THREE.Matrix4(), im = new THREE.Matrix4(), gb = new THREE.Box3();
    const seen = new Set<THREE.Mesh>();
    for (const p of parts) {
      if (seen.has(p.mesh)) continue; seen.add(p.mesh);
      const g = p.mesh.geometry, pos = g.getAttribute('position'); if (!pos) continue;
      const f = p.c.finish, inst = (p.mesh as THREE.InstancedMesh).isInstancedMesh ? (p.mesh as THREE.InstancedMesh) : null;
      if (!g.boundingBox) g.computeBoundingBox();
      const count = inst ? inst.count : 1;
      for (let k = 0; k < count; k++) {
        m.copy(p.mesh.matrixWorld); if (inst) { inst.getMatrixAt(k, im); m.multiply(im); }
        gb.copy(g.boundingBox!).applyMatrix4(m);
        const small = gb.max.x - gb.min.x < 3 && gb.max.z - gb.min.z < 3;
        if (!SITE_FINISH.has(f) && small) { markRect(grid, grid.occ, gb.min.x, gb.min.z, gb.max.x, gb.max.z); continue; }
        const idx = g.index, nt = (idx ? idx.count : pos.count) / 3;
        for (let t = 0; t < nt; t++) {
          const i0 = idx ? idx.getX(t * 3) : t * 3, i1 = idx ? idx.getX(t * 3 + 1) : t * 3 + 1, i2 = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
          a.fromBufferAttribute(pos, i0).applyMatrix4(m); b.fromBufferAttribute(pos, i1).applyMatrix4(m); c.fromBufferAttribute(pos, i2).applyMatrix4(m);
          if (!SITE_FINISH.has(f)) { markTriEdges(grid, grid.occ, [a.x, a.z], [b.x, b.z], [c.x, c.z]); continue; }
          // the landscape surfaces: only their upward faces
          const ny = (b.z - a.z) * (c.x - a.x) - (b.x - a.x) * (c.z - a.z), area = Math.abs(ny);
          if (area < 1e-6) continue;
          const nn = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize();
          if (Math.abs(nn.y) < 0.5) continue;
          const layer = f === 'paving' ? grid.hard : grid.soft, v = f === 'bed' ? 2 : 1;
          fillTri(grid, layer, [a.x, a.z, a.y], [b.x, b.z, b.y], [c.x, c.z, c.y], v);
        }
      }
    }
    for (const [el, ps] of elements) if (ps[0]?.info.cls === 'IfcDoor') { const eb = new THREE.Box3().setFromObject(el); if (!eb.isEmpty()) markDoor(grid, { min: [eb.min.x, eb.min.z], max: [eb.max.x, eb.max.z] }); }
    fillFootprint(grid);
  }
  mark('footprint grid');
  const view = o.view ? { from: [o.view.eye.x, o.view.eye.z] as [number, number], at: [o.view.look.x, o.view.look.z] as [number, number] } : undefined;
  const span = Math.hypot(bbox.max.x - bbox.min.x, bbox.max.z - bbox.min.z);
  const plan: PlantPlan = planPlanting(grid, { seed: 11, view, baseY, maxShrubs: Math.round(Math.min(1400, 180 + span * 9)), maxTrees: Math.round(Math.min(16, 4 + span / 6)) });

  // --- planting, built in code (nativeTrees.ts, plants.ts) ---------------------------------------------------------------
  const plantRoot = new THREE.Group(); plantRoot.name = 'dress_planting';
  const plantNote = `Proposed native planting, ${plan.said}: harakeke, tussock (standing in for toetoe, which is not modelled yet), hebe, coprosma, carex, ponga, tī kōuka, with pōhutukawa and kānuka standing back. Placed by rule (never inside the footprint, on the model’s paving or paths, or in front of a door); not from the model or a planting plan. Modelled in code.`;
  plantRoot.userData = { kind: 'planting', name: 'Planting (proposed)', source: 'proposed', note: plantNote };
  let groundY: ((x: number, z: number) => number) | null = null;
  const yOf = (x: number, z: number, y0: number) => (groundY ? groundY(x, z) : y0);
  const build = async () => {
    plantRoot.clear();
    const atY = new Map<string, number>();
    for (const s of plan.shrubs) atY.set(`${s.x.toFixed(2)},${s.z.toFixed(2)}`, s.y);
    for (const t of plan.trees) atY.set(`${t.x.toFixed(2)},${t.z.toFixed(2)}`, t.y);
    const ground = (x: number, z: number) => {
      if (groundY) return groundY(x, z);
      const k = Math.floor((x - grid.x0) / grid.cell) + Math.floor((z - grid.z0) / grid.cell) * grid.nx, y = grid.y[k];
      return Number.isFinite(y) ? y : atY.get(`${x.toFixed(2)},${z.toFixed(2)}`) ?? baseY;
    };
    const trees = plan.trees.map((t) => [t.x, t.z, t.h, t.r, t.kind === 'pohutukawa' ? '4a5f36' : '6c7a4c'] as [number, number, number, number, string]);
    const by = (sp: string) => plan.shrubs.filter((s) => s.sp === sp);
    try {
      const bush = await nativeBush(trees, ground, [(bbox.min.x + bbox.max.x) / 2, (bbox.min.z + bbox.max.z) / 2], {
        clearing: {
          source: 'proposed',
          // the trees come from the bush's few modelled trees per species (instanced): a specimen grown on its own costs
          // several times the triangles, too many beside a big model
          planting: { ponga: by('ponga').map((s) => [s.x, s.z, s.s]), harakeke: by('harakeke').map((s) => [s.x, s.z, s.s]), tikouka: by('tikouka').map((s) => [s.x, s.z, s.s]) },
        },
      });
      bush.traverse((n) => { const u = n.userData; if (u?.kind === 'planting') { u.source = 'proposed'; u.note = plantNote; if (/kept/.test(String(u.name ?? ''))) u.name = String(u.name).replace(', kept', ''); } });
      bush.userData = { ...plantRoot.userData };
      plantRoot.add(bush);
    } catch (e) { console.warn('the proposed trees could not be grown', e); }
    const tufts: TuftPlacement[] = [...by('tussock'), ...by('carex'), ...by('hebe'), ...by('coprosma')].map((s) => ({ sp: s.sp as 'tussock' | 'carex' | 'hebe' | 'coprosma', x: s.x, y: yOf(s.x, s.z, s.y) - 0.03, z: s.z, s: s.s }));
    if (tufts.length) { const tg = tuftPlanting(tufts, plantNote); tg.name = 'dress_grasses'; tg.userData = { ...plantRoot.userData }; plantRoot.add(tg); }
  };
  mark('planting planned');
  await build();
  mark('planting built');

  // --- frames: drawn round the glass of a window, or a door's leaf, where the model carries no frame part of its own ------
  // Attached to the model (so they move with it), measured from the glass or leaf they surround; marked as drawn, not modelled.
  const frameRoot = new THREE.Group(); frameRoot.name = 'dress_frames';
  frameRoot.userData = { kind: 'context', name: 'Frames (drawn)', source: 'proposed', note: 'Dark aluminium frames drawn round glass and door leaves that the model carries without a frame: 60 mm face, set to the glass. Inferred from the opening, not from the model or a schedule.' };
  {
    const inv = new THREE.Matrix4().copy(obj.matrixWorld).invert(), v = new THREE.Vector3();
    const barGeo = new THREE.BoxGeometry(1, 1, 1);
    for (const [el, ps] of elements) {
      const cls = ps[0]?.info.cls ?? '';
      if (!needsFrame(cls, ps.map((p) => p.c.finish))) continue;
      const pts: number[][] = [];
      for (const p of ps) {
        if (p.c.finish !== 'glass' && p.c.finish !== 'door') continue;
        const pos = p.mesh.geometry.getAttribute('position'); if (!pos) continue;
        const step = Math.max(1, Math.floor(pos.count / 400));
        for (let i = 0; i < pos.count; i += step) { v.fromBufferAttribute(pos, i).applyMatrix4(p.mesh.matrixWorld); pts.push([v.x, v.y, v.z]); }
      }
      if (pts.length < 4) continue;
      // the opening's own axes on the ground: the long way across it (PCA of x, z), the thin way through it
      let cx = 0, cz = 0, y0 = Infinity, y1 = -Infinity;
      for (const q of pts) { cx += q[0]; cz += q[2]; y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }
      cx /= pts.length; cz /= pts.length;
      let sxx = 0, szz = 0, sxz = 0;
      for (const q of pts) { const dx = q[0] - cx, dz = q[2] - cz; sxx += dx * dx; szz += dz * dz; sxz += dx * dz; }
      const ang = 0.5 * Math.atan2(2 * sxz, sxx - szz), ux = Math.cos(ang), uz = Math.sin(ang);
      let a0 = Infinity, a1 = -Infinity, t0 = Infinity, t1 = -Infinity;
      for (const q of pts) { const dx = q[0] - cx, dz = q[2] - cz, a = dx * ux + dz * uz, t = -dx * uz + dz * ux; a0 = Math.min(a0, a); a1 = Math.max(a1, a); t0 = Math.min(t0, t); t1 = Math.max(t1, t); }
      const W = a1 - a0, H = y1 - y0;
      if (W < 0.25 || H < 0.25 || W > 8 || H > 6) continue;   // not an opening a frame belongs to
      const face = 0.06, depth = Math.max(0.09, t1 - t0 + 0.05), door = cls === 'IfcDoor';
      const mid = (a0 + a1) / 2, tm = (t0 + t1) / 2;
      const centre = new THREE.Vector3(cx + ux * mid - uz * tm, 0, cz + uz * mid + ux * tm);
      const g = new THREE.Group();
      const bar = (w: number, h: number, along: number, up: number) => { const m = new THREE.Mesh(barGeo, finishMat('mullion', q, null)); m.scale.set(w, h, depth); m.position.set(along, up, 0); m.castShadow = true; m.receiveShadow = true; g.add(m); };
      bar(W + face * 2, face, 0, y1 + face / 2);                       // head
      if (!door) bar(W + face * 2, face * 1.4, 0, y0 - face * 0.7);    // sill
      bar(face, H + (door ? face : face * 2.4), -W / 2 - face / 2, (y0 + y1) / 2 + (door ? face / 2 : -face * 0.2));   // jambs
      bar(face, H + (door ? face : face * 2.4), W / 2 + face / 2, (y0 + y1) / 2 + (door ? face / 2 : -face * 0.2));
      // world placement, then into the model's own frame so it moves with the model
      const world = new THREE.Matrix4().compose(centre, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -ang), new THREE.Vector3(1, 1, 1));
      g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, world));
      g.userData = { kind: 'context', name: `Frame (drawn) for ${String(el.userData?.name ?? cls)}`, source: 'proposed', note: frameRoot.userData.note };
      frameRoot.add(g);
    }
    obj.add(frameRoot);
  }
  mark('frames drawn');

  // --- the contact shade: soft darkening where the building meets the ground --------------------------------------------
  const shade = (() => {
    const W = grid.nx, H = grid.nz, c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d')!, img = g.createImageData(W, H), a = new Float32Array(W * H);
    for (let k = 0; k < a.length; k++) a[k] = grid.occ[k];
    // two passes of a box blur, about 1.5 m: a soft skirt
    const blur = (r: number) => { const b = new Float32Array(a.length); for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { let s = 0, n = 0; for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= W || jj >= H) continue; s += a[jj * W + ii]; n++; } b[j * W + i] = s / n; } a.set(b); };
    blur(2); blur(2);
    for (let k = 0; k < a.length; k++) { img.data[k * 4 + 3] = Math.round(Math.min(1, a[k] * 1.6) * 255 * (grid.occ[k] ? 1 : 0.55)); }
    g.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.NoColorSpace;
    const m = new THREE.MeshBasicMaterial({ color: 0x1a1612, alphaMap: tex, transparent: true, depthWrite: false, opacity: 0.68, name: 'dress_contact_shade' });
    // canvas row 0 is the grid's lowest z: with the texture's usual flip it lands at the plane's −z edge, where it belongs
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(W * grid.cell, H * grid.cell).rotateX(-Math.PI / 2), m);
    plane.position.set(grid.x0 + (W * grid.cell) / 2, baseY + 0.006, grid.z0 + (H * grid.cell) / 2);
    plane.renderOrder = 1; plane.receiveShadow = false; plane.castShadow = false; plane.name = 'dress_contact_shade';
    plane.userData = { kind: 'context', name: 'Contact shade', source: 'proposed', note: 'A soft shade on the ground round the building, drawn from its footprint, so it sits on the ground as it would in a photograph. Not a shadow calculation.' };
    return plane;
  })();

  // --- the rooms lit behind the glass, as the architect's renders show them: a few warm lights inside the building ---------
  // Proposed (the model has no lighting design in it), off on phones to keep them smooth.
  const roomLights = new THREE.Group(); roomLights.name = 'dress_room_lights';
  roomLights.userData = { kind: 'context', name: 'Rooms lit (proposed)', source: 'proposed', note: 'Warm light inside the building so the rooms read through the glass, as in the architect’s renders. Not a lighting design.' };
  if (parts.some((p) => p.c.finish === 'glass') && !(app as unknown as { phone?: boolean }).phone) {
    const B = bbox, W = B.max.x - B.min.x, D = B.max.z - B.min.z, H = Math.max(2.4, B.max.y - B.min.y);
    const nx = Math.max(1, Math.min(3, Math.round(W / 18))), nz = Math.max(1, Math.min(2, Math.round(D / 18)));
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      const l = new THREE.PointLight(0xffc07a, 80, Math.max(14, Math.min(W, D) * 0.8), 2);
      l.position.set(B.min.x + ((i + 0.5) / nx) * W, B.min.y + Math.min(3, H * 0.45), B.min.z + ((j + 0.5) / nz) * D); l.castShadow = false;
      roomLights.add(l);
    }
  }
  const presentationDetail = buildPresentationDetail(
    obj,
    [...elements.entries()].map(([el, ps]) => ({
      el,
      cls: ps[0]?.info.cls ?? '',
      meshes: ps.map((p) => ({ mesh: p.mesh, finish: p.c.finish })),
    })),
    { phone: !!(app as unknown as { phone?: boolean }).phone, lowTier: !!(app as unknown as { lowTier?: boolean }).lowTier },
  );
  if (presentationDetail.group.children.length) obj.add(presentationDetail.group);

  const layers: Layer[] = [
    { id: 'dress-planting', label: 'Planting (proposed)', note: `native planting ${plan.said}; proposed by rule, not from the model`, visible: true, object: plantRoot },
    { id: 'dress-rooms', label: 'Rooms lit (proposed)', note: 'warm light inside so the rooms read through the glass, as in the architect’s renders; not a lighting design', visible: true, object: roomLights },
    { id: 'dress-frames', label: 'Frames (drawn)', note: 'round glass and door leaves the model gives no frame; inferred from the opening', visible: true, object: frameRoot },
    { id: 'dress-presentation-detail', label: 'Edge depth, reveals & cladding (presentation)', note: 'reversible 115 mm reveals and cladding depth ribs kept out of geometry, measurement and clash checks', visible: true, object: presentationDetail.group },
    { id: 'dress-shade', label: 'Contact shade', note: 'soft shade where the building meets the ground, from its footprint', visible: true, object: shade, traced: false },
  ];

  // --- the light colour grade (warmer whites, a touch more colour), on the page's own post-processing ------------------
  let gradeFrom: unknown = null;
  const grade = (on: boolean) => {
    const rp = app.pipeline as unknown as { outputNode: unknown; needsUpdate: boolean } | null;
    if (!rp) return;
    try {
      if (on && !gradeFrom) {
        gradeFrom = rp.outputNode;
        const col = rp.outputNode as ReturnType<typeof vec4>;
        rp.outputNode = vec4(mix(vec3(luminance(col.rgb)), col.rgb, 1.07).mul(vec3(1.03, 1.0, 0.965)), col.a);
        rp.needsUpdate = true;
      } else if (!on && gradeFrom) { rp.outputNode = gradeFrom; gradeFrom = null; rp.needsUpdate = true; }
    } catch (e) { console.warn('colour grade unavailable', e); }
  };

  // --- modes -----------------------------------------------------------------------------------------------------------
  const D: Dressed = {
    layers, mode: 'finished', card: document.createElement('section'),
    glassCount: parts.filter(glassEligible).length,
    setGlass(mode) { glassMode = mode; D.set(D.mode === 'asis' && mode !== 'authored' ? 'model' : D.mode); },
    set(mode) {
      D.mode = mode;
      for (const p of parts) {
        const m = matFor(p, mode);
        if (p.slot < 0) p.mesh.material = m; else (p.mesh.material as THREE.Material[])[p.slot] = m;
        p.mesh.castShadow = mode !== 'asis' && glassMode !== 'authored' && glassEligible(p) ? false : origShadow.get(p.mesh)!;
      }
      for (const [el, ps] of elements) {
        const was = origNote.get(el)!;
        if (mode === 'asis') { el.userData.note = was.note; el.userData.material = was.material; continue; }
        const lines = [...new Set(ps.map((p) => say(p, mode)))];
        const matNames = [...new Set(ps.map((p) => p.info.material).filter(Boolean))];
        el.userData.material = matNames.length ? `${matNames.join(', ')} (as the model names it)` : 'none named in the model';
        el.userData.note = `${was.note ? `${was.note} ` : ''}Finish, interpreted from the model’s class and material name (proposed, not a specification): ${lines.join('; ')}.`;
      }
      for (const l of layers) if (l.object) l.object.visible = mode !== 'asis' && l.visible;
      if (mode === 'asis') { lawnM.color.copy(lawnWas); (lawnM as unknown as { colorNode: unknown }).colorNode = lawnNodeWas; }
      else { lawnM.color.copy(lawnWas).multiply(LAWN_TONE); (lawnM as unknown as { colorNode: unknown }).colorNode = lawnNode; }
      lawnM.needsUpdate = true;
      grade(mode !== 'asis');
      for (const b of D.card.querySelectorAll<HTMLButtonElement>('[data-dress]')) { const on = b.dataset.dress === mode; b.setAttribute('aria-pressed', String(on)); b.classList.toggle('solid', on); }
    },
    async replant(yAt) {
      groundY = yAt;
      await build();
      shade.visible = !yAt && D.mode !== 'asis';   // on real ground the platform is the site module's: the flat shade would float
    },
    summary() {
      const by: Record<string, number> = {}, rules: Record<string, number> = {};
      for (const p of parts) { by[p.keep ? 'kept' : p.c.finish] = (by[p.keep ? 'kept' : p.c.finish] ?? 0) + 1; rules[p.c.rule] = (rules[p.c.rule] ?? 0) + 1; }
      return { mode: D.mode, parts: parts.length, elements: elements.size, drawn, heavy, finishes: by, rules, shrubs: plan.shrubs.length, trees: plan.trees.length, where: plan.where, ms: Math.round(performance.now() - t0), textures: sets.size, materials: mats.size };
    },
    heroStill: (frames = 16) => heroStill(app, frames),
  };

  // --- the card ------------------------------------------------------------------------------------------------------
  const card = D.card;
  card.className = 'card'; card.id = 'dressCard';
  const counts = new Map<string, { n: number; why: string }>();
  for (const p of parts) { const k = p.keep ? 'kept as the file has it' : FINISHES[p.c.finish].label; const e = counts.get(k) ?? { n: 0, why: p.c.why.replace(/ \(“.*$/, '') }; e.n++; counts.set(k, e); }
  const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]!);
  card.innerHTML = `<h3>Finishes</h3>
    <div class="row wrap" role="group" aria-label="How the model is drawn">
      <button type="button" class="pill" data-dress="asis" aria-pressed="false">As it is</button>
      <button type="button" class="pill" data-dress="model" aria-pressed="false">Model’s colours</button>
      <button type="button" class="pill" data-dress="finished" aria-pressed="false">Finished look</button>
    </div>
    <p class="small">Finishes: interpreted from the model’s classes and material names. Click a part to see its finish and why. Planting is proposed ${esc(plan.said)}.</p>
    <details class="small"><summary>What each finish was read from</summary><table class="small"><tbody>${[...counts].sort((a, b) => b[1].n - a[1].n).map(([k, v]) => `<tr><td>${esc(k)}</td><td class="mono">${v.n}</td><td>${esc(v.why)}</td></tr>`).join('')}</tbody></table>
    <p class="small">Nothing is moved or added to the building. The table of rules is in the page’s code (dressRules.ts).</p><p class="small">${esc(SCAN_CREDIT)}</p></details>
    <div class="row wrap"><button type="button" class="pill" id="dressStill">Finished still</button></div>
    <p class="small mono" id="dressMsg">${frameNote}</p>`;
  for (const b of card.querySelectorAll<HTMLButtonElement>('[data-dress]')) b.addEventListener('click', () => D.set(b.dataset.dress as DressMode));
  card.querySelector('#dressStill')!.addEventListener('click', async () => { const msg = card.querySelector('#dressMsg')!; msg.textContent = 'Averaging 16 jittered frames…'; const blob = await D.heroStill(16); msg.textContent = blob ? 'Finished still: 16 jittered frames averaged, light grade.' : 'The still could not be made here.'; });
  // the card goes at the top of the side panel once the page has built it
  const mount = () => {
    const ex = document.getElementById('extra');
    if (!ex) return false;
    ex.prepend(card);
    return true;
  };
  const tick = () => { if (mount()) app.onFrame.splice(app.onFrame.indexOf(tick), 1); };
  app.onFrame.push(tick);

  const want = new URLSearchParams(location.search).get('dress');
  D.set(want === 'asis' || want === 'model' ? want : 'finished');
  void photoSurfaces(q);
  // the first frame after the page's post-processing exists: the grade goes on then
  const late = () => { if (app.pipeline) { grade(D.mode !== 'asis'); app.onFrame.splice(app.onFrame.indexOf(late), 1); } };
  app.onFrame.push(late);
  // the glass carries the sky as its own reflection map (stronger than the scene's light), kept up as the sun moves
  app.onFrame.push(() => {
    const env = app.scene.environment;
    if (!env) return;
    for (const m of mats.values()) if (m.name === 'dress_glass_tinted' && (m as THREE.MeshPhysicalMaterial).envMap !== env) { (m as THREE.MeshPhysicalMaterial).envMap = env; m.needsUpdate = true; }
  });
  (window as unknown as { __dress?: Dressed }).__dress = D;   // for checks from the console (this tab only)
  app.log(`Finishes interpreted for ${elements.size} elements; planting proposed.`);
  return D;
}
const frameNote = 'A still made from 16 frames, each shifted by part of a pixel, averaged and lightly graded.';

// --- a finished still: jittered frames averaged, then a light grade ---------------------------------------------------
const halton = (i: number, b: number) => { let f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; };
async function heroStill(app: App, frames: number): Promise<Blob | null> {
  const cv = app.canvas, w = cv.width, h = cv.height, cam = app.camera;
  const was = app.paused; app.paused = true;
  await new Promise((r) => requestAnimationFrame(() => r(null)));
  const acc = new Float32Array(w * h * 3), k = document.createElement('canvas'); k.width = w; k.height = h;
  const g = k.getContext('2d', { willReadFrequently: true })!;
  const lut = new Float32Array(256); for (let i = 0; i < 256; i++) { const v = i / 255; lut[i] = v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }
  try {
    for (let f = 0; f < frames; f++) {
      cam.setViewOffset(w, h, halton(f + 1, 2) - 0.5, halton(f + 1, 3) - 0.5, w, h);
      if (app.pipeline) app.pipeline.render(); else app.renderer.render(app.scene, cam);
      g.drawImage(cv, 0, 0);
      const d = g.getImageData(0, 0, w, h).data;
      for (let i = 0, j = 0; i < d.length; i += 4, j += 3) { acc[j] += lut[d[i]]; acc[j + 1] += lut[d[i + 1]]; acc[j + 2] += lut[d[i + 2]]; }
      await new Promise((r) => setTimeout(r, 0));
    }
  } finally { cam.clearViewOffset(); app.paused = was; }
  const out = g.createImageData(w, h), o = out.data, enc = (v: number) => (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055);
  for (let i = 0, j = 0; i < o.length; i += 4, j += 3) {
    let r = acc[j] / frames, gg = acc[j + 1] / frames, b = acc[j + 2] / frames;
    // the light grade: warm whites a little, a touch more colour, a soft S on the tones
    const l = 0.2126 * r + 0.7152 * gg + 0.0722 * b;
    r = (l + (r - l) * 1.05) * 1.015; gg = l + (gg - l) * 1.05; b = (l + (b - l) * 1.05) * 0.975;
    const s = (x: number) => { const e = enc(Math.max(0, Math.min(1, x))); return e + 0.08 * e * (1 - e) * (2 * e - 1); };
    o[i] = s(r) * 255; o[i + 1] = s(gg) * 255; o[i + 2] = s(b) * 255; o[i + 3] = 255;
  }
  g.putImageData(out, 0, 0);
  const blob = await new Promise<Blob | null>((r) => k.toBlob(r, 'image/png'));
  if (blob) { app.lastStill = blob; await app.save?.(`model-finished-still.png`, blob).catch(() => void 0); }
  return blob;
}
