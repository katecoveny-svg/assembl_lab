import * as THREE from 'three/webgpu';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Kate's Kōwhai Studio asset library (CATEGORY-NN, WebOpt 512 px GLBs), used by the fit-out
// before it builds a piece itself. Files are served as base64 text so the same build works on
// the artifact host (which refuses .glb) and on the lab. Titles here leave out product and
// brand references; each item's licence note travels with it to the inspector.

export interface LibItem {
  id: string;
  /** false: kept out of public builds (e.g. a shape that is a third party's trademark) */
  public: boolean;
  role: string;
  file: string;
  title: string;
  dims: string;
  licence: string;
}

export const LIBRARY: LibItem[] = [
  {
    id: 'APPLIANCES-10',
    public: true,
    role: 'knife_block',
    file: 'APPLIANCES-10.glb.b64.txt',
    title: 'Knife block with four chef’s knives, weathered timber',
    dims: '260 × 115 × 340 mm',
    licence: 'CC BY 4.0 procedural mesh and PBR maps (Kōwhai Studio 3D); referenced products to be checked before commercial use',
  },
  {
    id: 'HERO-NZD-03',
    public: true,
    role: 'table_lamp',
    file: 'HERO-NZD-03.glb.b64.txt',
    title: 'Turned ash table lamp, brushed brass, opal glass',
    dims: '220 × 220 × 485 mm',
    licence: 'CC BY 4.0 procedural mesh and PBR maps (Kōwhai Studio 3D); an approximation inspired by NZ lighting design, not a maker’s product',
  },
];

/** public builds (the lab) leave out items that are not cleared for publication */
const PUBLIC_BUILD = import.meta.env.VITE_PUBLIC_BUILD === '1';
if (!PUBLIC_BUILD)
  LIBRARY.push({
    id: 'HERO-GTR-01',
    public: false,
    role: 'guitar',
    file: 'HERO-GTR-01.glb.b64.txt',
    title: 'Solid-body electric guitar',
    dims: '325 × 62 × 985 mm',
    licence: 'CC BY 4.0 procedural mesh and PBR maps (Kōwhai Studio 3D); approximates a trademarked body shape, so private builds only',
  });
const available = () => LIBRARY.filter((x) => !PUBLIC_BUILD || x.public);

const BASE = import.meta.env.BASE_URL;
const cache = new Map<string, Promise<THREE.Object3D | null>>();

async function fetchB64(url: string) {
  const txt = (await (await fetch(url)).text()).trim();
  const bin = atob(txt);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

export function libraryItem(role: string): Promise<THREE.Object3D | null> {
  const it = available().find((x) => x.role === role);
  if (!it) return Promise.resolve(null);
  let p = cache.get(it.id);
  if (!p) {
    p = fetchB64(`${BASE}twin/lib/${it.file}`)
      .then((buf) => new GLTFLoader().parseAsync(buf, ''))
      .then((gltf) => {
        const root = gltf.scene;
        root.traverse((o) => {
          if ((o as THREE.Mesh).isMesh) o.castShadow = o.receiveShadow = true;
        });
        root.name = it.id;
        root.userData = { kind: 'furniture', name: it.title, material: `Kōwhai Studio ${it.id}`, size: it.dims, source: 'library', note: it.licence };
        return root as THREE.Object3D;
      })
      .catch((e) => {
        console.warn('library item failed', it.id, e);
        return null;
      });
    cache.set(it.id, p);
  }
  return p.then((o) => {
    if (!o) return null;
    const c = o.clone(true);
    c.userData = { ...o.userData };
    return c;
  });
}

/** fill the library slots a fit-out left: { role, position, rotationY } on empty groups named slot_<role> */
export async function fillSlots(root: THREE.Object3D) {
  const slots: THREE.Object3D[] = [];
  root.traverse((o) => {
    if (o.name.startsWith('slot_')) slots.push(o);
  });
  for (const s of slots) {
    const item = await libraryItem(s.name.slice(5));
    if (item) s.add(item);
  }
  return slots.length;
}
