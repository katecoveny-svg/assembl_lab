import * as THREE from 'three/webgpu';
import { IfcAPI } from 'web-ifc';

// IFC in and out.
//
// Export: any three.js object tree → an IFC4 file. Parts tagged with userData.ifcClass become
// that class (IfcWall, IfcWindow, IfcRoof…); untagged parts become IfcBuildingElementProxy.
// Geometry is written as IfcTriangulatedFaceSet (exact triangles, no reinterpretation), placed in
// IfcProject → IfcSite → IfcBuilding → IfcBuildingStorey, coloured with IfcSurfaceStyle.
// three.js is Y-up in metres; IFC here is Z-up in metres: (x, y, z) → (x, -z, y).
//
// Load: an IFC file → three.js meshes via web-ifc (WASM), one mesh per element, with the
// element's IFC class, Name and GlobalId on userData for the inspector.

// --- GlobalId: 128 bits written in IFC's 22-character base-64 -------------------------------------
const IFC64 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$';
function fnv(s: string, seed: number) {
  let h = seed >>> 0;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return h >>> 0;
}
export function ifcGuid(key: string) {
  const words = [fnv(key, 0x811c9dc5), fnv(key, 0x01000193), fnv(key, 0x9e3779b9), fnv(key, 0x85ebca6b)];
  const bytes: number[] = [];
  for (const w of words) bytes.push((w >>> 24) & 255, (w >>> 16) & 255, (w >>> 8) & 255, w & 255);
  // 2 bits, then 21 groups of 6 bits (the standard IFC compression of a 128-bit GUID)
  let bits = '';
  for (const b of bytes) bits += b.toString(2).padStart(8, '0');
  let out = IFC64[parseInt(bits.slice(0, 2), 2)];
  for (let i = 2; i < 128; i += 6) out += IFC64[parseInt(bits.slice(i, i + 6), 2)];
  return out;
}

// predefined types IFC4 accepts per class; anything else is written as NOTDEFINED
const PREDEFINED: Record<string, string[]> = {
  IfcWall: ['STANDARD', 'POLYGONAL', 'SOLIDWALL', 'PARTITIONING', 'SHEAR', 'PARAPET', 'PLUMBINGWALL', 'MOVABLE', 'ELEMENTEDWALL', 'SHEAR'],
  IfcSlab: ['FLOOR', 'ROOF', 'LANDING', 'BASESLAB'],
  IfcRoof: ['FLAT_ROOF', 'SHED_ROOF', 'GABLE_ROOF', 'HIP_ROOF', 'HIPPED_GABLE_ROOF', 'GAMBREL_ROOF', 'MANSARD_ROOF', 'BARREL_ROOF', 'RAINBOW_ROOF', 'BUTTERFLY_ROOF', 'PAVILION_ROOF', 'DOME_ROOF', 'FREEFORM'],
  IfcCovering: ['CEILING', 'FLOORING', 'CLADDING', 'ROOFING', 'MOLDING', 'SKIRTINGBOARD', 'INSULATION', 'MEMBRANE', 'SLEEVING', 'WRAPPING'],
  IfcBeam: ['BEAM', 'JOIST', 'HOLLOWCORE', 'LINTEL', 'SPANDREL', 'T_BEAM'],
  IfcMember: ['BRACE', 'CHORD', 'COLLAR', 'MEMBER', 'MULLION', 'PLATE', 'POST', 'PURLIN', 'RAFTER', 'STRINGER', 'STRUT', 'STUD'],
  IfcColumn: ['COLUMN'],
  IfcPile: ['BORED', 'DRIVEN', 'JETGROUTING', 'COHESION', 'FRICTION', 'SUPPORT'],
  IfcStair: ['STRAIGHT_RUN_STAIR', 'TWO_STRAIGHT_RUN_STAIR', 'QUARTER_WINDING_STAIR', 'QUARTER_TURN_STAIR', 'HALF_WINDING_STAIR', 'HALF_TURN_STAIR', 'SPIRAL_STAIR'],
  IfcRailing: ['HANDRAIL', 'GUARDRAIL', 'BALUSTRADE'],
  IfcPipeSegment: ['CULVERT', 'FLEXIBLESEGMENT', 'RIGIDSEGMENT', 'GUTTER', 'SPOOL'],
  IfcTank: ['BASIN', 'BREAKPRESSURE', 'EXPANSION', 'FEEDANDEXPANSION', 'PRESSUREVESSEL', 'STORAGE', 'VESSEL'],
  IfcFooting: ['CAISSON_FOOTING', 'FOOTING_BEAM', 'PAD_FOOTING', 'PILE_CAP', 'STRIP_FOOTING'],
  IfcWindow: ['WINDOW', 'SKYLIGHT', 'LIGHTDOME'],
  IfcDoor: ['DOOR', 'GATE', 'TRAPDOOR'],
  IfcPlate: ['CURTAIN_PANEL', 'SHEET'],
  IfcFastener: ['GLUE', 'MORTAR', 'WELD'],
};
const KNOWN = new Set([...Object.keys(PREDEFINED), 'IfcChimney', 'IfcDiscreteAccessory', 'IfcBuildingElementProxy']);

const num = (v: number) => {
  const s = (Math.abs(v) < 1e-9 ? 0 : v).toFixed(5).replace(/0+$/, '');
  return s.endsWith('.') ? s : s;
};
const str = (s: string) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "''").replace(/[^\x20-\x7e]/g, (c) => `\\X2\\${c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}\\X0\\`)}'`;

/** an average base colour for a material: its colour times its map's mean, if it has one */
function baseColour(m: THREE.Material) {
  const mat = m as THREE.MeshStandardMaterial;
  const c = mat.color ? mat.color.clone() : new THREE.Color(0.8, 0.8, 0.8);
  const img = mat.map?.image as HTMLCanvasElement | undefined;
  if (img && 'getContext' in img) {
    const small = document.createElement('canvas');
    small.width = small.height = 8;
    const g = small.getContext('2d')!;
    g.drawImage(img, 0, 0, 8, 8);
    const d = g.getImageData(0, 0, 8, 8).data;
    let r = 0, gg = 0, b = 0;
    for (let i = 0; i < d.length; i += 4) (r += d[i]), (gg += d[i + 1]), (b += d[i + 2]);
    const n = d.length / 4;
    c.multiply(new THREE.Color().setRGB(r / n / 255, gg / n / 255, b / n / 255, THREE.SRGBColorSpace));
  }
  return { c, transparency: (mat as THREE.MeshPhysicalMaterial).transmission ? 0.7 : mat.transparent ? 1 - mat.opacity : 0 };
}

export interface IfcExportOptions {
  project: string;
  building: string;
  author?: string;
}

/** Write an IFC4 file for everything visible under `root`. */
export function exportIFC(root: THREE.Object3D, opts: IfcExportOptions) {
  root.updateMatrixWorld(true);
  const lines: string[] = [];
  let id = 0;
  const add = (s: string) => {
    id++;
    lines.push(`#${id}=${s};`);
    return `#${id}`;
  };
  const now = Math.floor(Date.now() / 1000);
  const person = add(`IFCPERSON($,$,${str(opts.author ?? 'assembl Lab')},$,$,$,$,$)`);
  const org = add(`IFCORGANIZATION($,'assembl',$,$,$)`);
  const pando = add(`IFCPERSONANDORGANIZATION(${person},${org},$)`);
  const app = add(`IFCAPPLICATION(${org},'0.1','assembl Twin','assembl-twin')`);
  const owner = add(`IFCOWNERHISTORY(${pando},${app},$,.ADDED.,$,$,$,${now})`);
  const units = [add(`IFCSIUNIT(*,.LENGTHUNIT.,$,.METRE.)`), add(`IFCSIUNIT(*,.AREAUNIT.,$,.SQUARE_METRE.)`), add(`IFCSIUNIT(*,.VOLUMEUNIT.,$,.CUBIC_METRE.)`), add(`IFCSIUNIT(*,.PLANEANGLEUNIT.,$,.RADIAN.)`)];
  const ua = add(`IFCUNITASSIGNMENT((${units.join(',')}))`);
  const origin = add(`IFCCARTESIANPOINT((0.,0.,0.))`);
  const zDir = add(`IFCDIRECTION((0.,0.,1.))`);
  const xDir = add(`IFCDIRECTION((1.,0.,0.))`);
  const axis = add(`IFCAXIS2PLACEMENT3D(${origin},${zDir},${xDir})`);
  const ctx = add(`IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-05,${axis},$)`);
  const body = add(`IFCGEOMETRICREPRESENTATIONSUBCONTEXT('Body','Model',*,*,*,*,${ctx},$,.MODEL_VIEW.,$)`);
  const project = add(`IFCPROJECT(${str(ifcGuid(opts.project + '/project'))},${owner},${str(opts.project)},$,$,$,$,(${ctx}),${ua})`);
  const sitePl = add(`IFCLOCALPLACEMENT($,${axis})`);
  const site = add(`IFCSITE(${str(ifcGuid(opts.project + '/site'))},${owner},'Site',$,$,${sitePl},$,$,.ELEMENT.,$,$,$,$,$)`);
  const bldPl = add(`IFCLOCALPLACEMENT(${sitePl},${axis})`);
  const building = add(`IFCBUILDING(${str(ifcGuid(opts.project + '/building'))},${owner},${str(opts.building)},$,$,${bldPl},$,$,.ELEMENT.,$,$,$)`);
  const stPl = add(`IFCLOCALPLACEMENT(${bldPl},${axis})`);
  const storey = add(`IFCBUILDINGSTOREY(${str(ifcGuid(opts.project + '/storey'))},${owner},'Ground floor',$,$,${stPl},$,$,.ELEMENT.,0.)`);
  add(`IFCRELAGGREGATES(${str(ifcGuid(opts.project + '/agg1'))},${owner},$,$,${project},(${site}))`);
  add(`IFCRELAGGREGATES(${str(ifcGuid(opts.project + '/agg2'))},${owner},$,$,${site},(${building}))`);
  add(`IFCRELAGGREGATES(${str(ifcGuid(opts.project + '/agg3'))},${owner},$,$,${building},(${storey}))`);

  // styles, one per material
  const styles = new Map<THREE.Material, string>();
  const styleFor = (m: THREE.Material) => {
    let s = styles.get(m);
    if (s) return s;
    const { c, transparency } = baseColour(m);
    const rgb = add(`IFCCOLOURRGB($,${num(c.r)},${num(c.g)},${num(c.b)})`);
    const shade = add(`IFCSURFACESTYLERENDERING(${rgb},${num(transparency)},$,$,$,$,$,$,.NOTDEFINED.)`);
    s = add(`IFCSURFACESTYLE(${str(m.name || 'material')},.BOTH.,(${shade}))`);
    styles.set(m, s);
    return s;
  };

  // group meshes by element: the nearest ancestor (or self) tagged with an IFC class
  const elements = new Map<THREE.Object3D, THREE.Mesh[]>();
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !m.visible) return;
    let el: THREE.Object3D | null = m;
    while (el && el !== root && !el.userData?.ifcClass) el = el.parent;
    const key = el && el !== root ? el : m;
    // a window/door groups its frame, glass and fittings; anything nested under an element joins it
    let top: THREE.Object3D = key;
    let p = key.parent;
    while (p && p !== root) {
      if (p.userData?.ifcClass && ['IfcWindow', 'IfcDoor', 'IfcStair', 'IfcRailing'].includes(p.userData.ifcClass)) top = p;
      p = p.parent;
    }
    if (!elements.has(top)) elements.set(top, []);
    elements.get(top)!.push(m);
  });

  const contained: string[] = [];
  const v = new THREE.Vector3();
  const im = new THREE.Matrix4();
  const wm = new THREE.Matrix4();
  for (const [el, meshes] of elements) {
    const items: string[] = [];
    for (const m of meshes) {
      const g = m.geometry;
      const pos = g.getAttribute('position');
      const idx = g.index;
      const count = (m as THREE.InstancedMesh).isInstancedMesh ? (m as THREE.InstancedMesh).count : 1;
      for (let k = 0; k < count; k++) {
        wm.copy(m.matrixWorld);
        if ((m as THREE.InstancedMesh).isInstancedMesh) {
          (m as THREE.InstancedMesh).getMatrixAt(k, im);
          wm.multiply(im);
        }
        const pts: string[] = [];
        for (let i = 0; i < pos.count; i++) {
          v.fromBufferAttribute(pos, i).applyMatrix4(wm);
          pts.push(`(${num(v.x)},${num(-v.z)},${num(v.y)})`);
        }
        const tris: string[] = [];
        const n = idx ? idx.count : pos.count;
        for (let t = 0; t + 2 < n; t += 3) {
          const a = (idx ? idx.getX(t) : t) + 1;
          const b = (idx ? idx.getX(t + 1) : t + 1) + 1;
          const c = (idx ? idx.getX(t + 2) : t + 2) + 1;
          if (a === b || b === c || a === c) continue;
          tris.push(`(${a},${b},${c})`);
        }
        if (!tris.length) continue;
        const list = add(`IFCCARTESIANPOINTLIST3D((${pts.join(',')}),$)`);
        const fs = add(`IFCTRIANGULATEDFACESET(${list},$,$,(${tris.join(',')}),$)`);
        add(`IFCSTYLEDITEM(${fs},(${styleFor(Array.isArray(m.material) ? m.material[0] : m.material)}),$)`);
        items.push(fs);
      }
    }
    if (!items.length) continue;
    const rep = add(`IFCSHAPEREPRESENTATION(${body},'Body','Tessellation',(${items.join(',')}))`);
    const pds = add(`IFCPRODUCTDEFINITIONSHAPE($,$,(${rep}))`);
    const pl = add(`IFCLOCALPLACEMENT(${stPl},${axis})`);
    const u = el.userData ?? {};
    let cls = typeof u.ifcClass === 'string' && KNOWN.has(u.ifcClass) ? u.ifcClass : 'IfcBuildingElementProxy';
    const pre = typeof u.predefinedType === 'string' && PREDEFINED[cls]?.includes(u.predefinedType) ? u.predefinedType : 'NOTDEFINED';
    const guid = str(ifcGuid(`${opts.project}/${u.globalId ?? el.uuid}`));
    const name = str((el.name || cls).replace(/_/g, ' '));
    const desc = u.material ? str(String(u.material)) : '$';
    let line: string;
    if (cls === 'IfcWindow' || cls === 'IfcDoor') {
      const h = u.overallHeight ? num(Number(u.overallHeight) / 1000) : '$';
      const w = u.overallWidth ? num(Number(u.overallWidth) / 1000) : '$';
      line = `${cls.toUpperCase()}(${guid},${owner},${name},${desc},$,${pl},${pds},$,${h},${w},.${pre}.,.NOTDEFINED.,$)`;
    } else if (cls === 'IfcPile') {
      line = `IFCPILE(${guid},${owner},${name},${desc},$,${pl},${pds},$,.${pre}.,$)`;
    } else if (cls === 'IfcBuildingElementProxy') {
      line = `IFCBUILDINGELEMENTPROXY(${guid},${owner},${name},${desc},$,${pl},${pds},$,.NOTDEFINED.)`;
    } else {
      if (!PREDEFINED[cls] && cls !== 'IfcChimney' && cls !== 'IfcDiscreteAccessory') cls = 'IfcBuildingElementProxy';
      line = `${cls.toUpperCase()}(${guid},${owner},${name},${desc},$,${pl},${pds},$,.${cls === 'IfcBuildingElementProxy' ? 'NOTDEFINED' : pre}.)`;
    }
    contained.push(add(line));
  }
  add(`IFCRELCONTAINEDINSPATIALSTRUCTURE(${str(ifcGuid(opts.project + '/contains'))},${owner},$,$,(${contained.join(',')}),${storey})`);
  const header = [
    'ISO-10303-21;',
    'HEADER;',
    "FILE_DESCRIPTION(('ViewDefinition [ReferenceView_V1.2]'),'2;1');",
    `FILE_NAME(${str(opts.project + '.ifc')},${str(new Date().toISOString().slice(0, 19))},(${str(opts.author ?? 'assembl Lab')}),('assembl'),'assembl Twin','assembl Twin','');`,
    "FILE_SCHEMA(('IFC4'));",
    'ENDSEC;',
    'DATA;',
  ];
  return [...header, ...lines, 'ENDSEC;', 'END-ISO-10303-21;', ''].join('\n');
}

// --- loading ----------------------------------------------------------------------------------------
let api: IfcAPI | null = null;

/** web-ifc's WASM: from a URL serving the .wasm, or base64 text when the host only serves text */
async function ifcApi(wasmUrl: string) {
  if (api) return api;
  const a = new IfcAPI();
  let url = wasmUrl;
  if (wasmUrl.endsWith('.txt')) {
    const text = (await (await fetch(wasmUrl)).text()).trim();
    const bin = atob(text);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    url = URL.createObjectURL(new Blob([bytes], { type: 'application/wasm' }));
  }
  await a.Init(() => url, true);
  api = a;
  return a;
}

export interface LoadedIfc {
  root: THREE.Group;
  elements: number;
  schema: string;
}

export async function loadIFC(data: Uint8Array, wasmUrl: string, onProgress?: (done: number, total: number) => void, toOrigin = true): Promise<LoadedIfc> {
  const ifc = await ifcApi(wasmUrl);
  const model = ifc.OpenModel(data, { COORDINATE_TO_ORIGIN: toOrigin });
  const root = new THREE.Group();
  root.name = 'ifc_model';
  const mats = new Map<string, THREE.MeshStandardMaterial>();
  const matFor = (r: number, g: number, b: number, a: number) => {
    const key = `${r.toFixed(3)},${g.toFixed(3)},${b.toFixed(3)},${a.toFixed(2)}`;
    let m = mats.get(key);
    if (!m) {
      m = new THREE.MeshStandardMaterial({ color: new THREE.Color(r, g, b), roughness: 0.75, metalness: 0, transparent: a < 0.99, opacity: a, side: THREE.DoubleSide, depthWrite: a >= 0.99 });
      m.name = `ifc_${key}`;
      mats.set(key, m);
    }
    return m;
  };
  let elements = 0;
  const mtx = new THREE.Matrix4();
  ifc.StreamAllMeshes(model, (mesh, index, total) => {
    const pgs = mesh.geometries;
    const group = new THREE.Group();
    for (let i = 0; i < pgs.size(); i++) {
      const pg = pgs.get(i);
      const geo = ifc.GetGeometry(model, pg.geometryExpressID);
      const verts = ifc.GetVertexArray(geo.GetVertexData(), geo.GetVertexDataSize());
      const idx = ifc.GetIndexArray(geo.GetIndexData(), geo.GetIndexDataSize());
      const pos = new Float32Array(verts.length / 2);
      const nor = new Float32Array(verts.length / 2);
      for (let k = 0, j = 0; k < verts.length; k += 6, j += 3) {
        pos[j] = verts[k];
        pos[j + 1] = verts[k + 1];
        pos[j + 2] = verts[k + 2];
        nor[j] = verts[k + 3];
        nor[j + 1] = verts[k + 4];
        nor[j + 2] = verts[k + 5];
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      g.setIndex(new THREE.BufferAttribute(new Uint32Array(idx), 1));
      mtx.fromArray(pg.flatTransformation);
      g.applyMatrix4(mtx);
      const m = new THREE.Mesh(g, matFor(pg.color.x, pg.color.y, pg.color.z, pg.color.w));
      m.castShadow = m.receiveShadow = true;
      group.add(m);
      geo.delete();
    }
    let type = 'IFC';
    let name = '';
    let guid = '';
    try {
      type = ifc.GetNameFromTypeCode(ifc.GetLineType(model, mesh.expressID));
      const line = ifc.GetLine(model, mesh.expressID);
      name = line?.Name?.value ?? '';
      guid = line?.GlobalId?.value ?? '';
    } catch {
      /* a line web-ifc can't describe: keep the geometry */
    }
    const cls = type.replace(/^IFC/, 'Ifc').replace(/(^Ifc)([A-Z]+)$/, (_, p: string, rest: string) => p + rest.charAt(0) + rest.slice(1).toLowerCase());
    group.name = name || `${cls} #${mesh.expressID}`;
    group.userData = { ifcClass: cls, ifcType: type, expressID: mesh.expressID, globalId: guid, name };
    for (const c of group.children) c.userData = { ...group.userData };
    root.add(group);
    elements++;
    onProgress?.(index + 1, total);
  });
  const schema = ifc.GetModelSchema(model) ?? 'IFC';
  ifc.CloseModel(model);
  return { root, elements, schema };
}
