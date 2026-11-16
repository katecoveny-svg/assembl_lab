import * as THREE from 'three/webgpu';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

// Kate's asset library, used by the fit-out before it builds a piece itself: the Kōwhai Studio
// pieces (exported from her generator, CC BY 4.0) and the curated pieces from her asset site.
// Files are meshopt + WebP GLBs served as base64 text, so the same build works on the artifact
// host (which refuses .glb) and on the lab. Titles here leave out product and brand references;
// each item's licence note travels with it to the inspector.
//
// A fit-out leaves empty groups named slot_<role>, optionally holding a procedural fallback
// (children with userData.fallback). fillSlots() swaps in the library piece when there is one and
// it fits the slot's limits.

/** how a piece sits on its slot: floor (centred, base at 0), wall (centred, base at 0, back at z 0), hang (centred, top at 0) */
type Fit = 'floor' | 'wall' | 'hang';

export interface LibItem {
  id: string;
  role: string;
  title: string;
  dims: string;
  licence: string;
  fit?: Fit;
  /** extra turn about y so the piece's front faces +z */
  turn?: number;
}

const KS = 'CC BY 4.0 procedural mesh and PBR maps, Kōwhai Studio 3D generator (Kate Hudson, assembl)';
const CUR = 'assembl curated library (owner supplied, cleared for use by Kate Hudson)';

export const LIBRARY: LibItem[] = [
  // living
  { id: 'HERO-LIV-01', role: 'sofa', title: 'Three-seater sofa, wool bouclé on a beech plinth', dims: '2360 × 940 × 760 mm', licence: KS },
  { id: 'HERO-LIV-02', role: 'armchair', title: 'Beech armchair with linen cushions', dims: '740 × 780 × 760 mm', licence: KS },
  { id: 'HERO-LIV-03', role: 'coffee_table', title: 'Oak coffee table with travertine side table', dims: '1380 × 860 × 380 mm', licence: KS },
  { id: 'HERO-LIV-04', role: 'rug', title: 'Hand-knotted wool and jute rug', dims: '2300 × 1580 × 18 mm', licence: KS, turn: Math.PI / 2 },
  { id: 'HERO-LIV-05', role: 'floor_lamp', title: 'Arc floor lamp, brushed brass on travertine, flax shade', dims: '460 × 920 × 1680 mm', licence: KS },
  { id: 'HERO-LIV-06', role: 'table_lamp', title: 'Turned ash table lamp, brushed brass, opal glass', dims: '220 × 220 × 485 mm', licence: KS },
  { id: 'HERO-SPK-02', role: 'speaker', title: 'Pale ash bookshelf speaker', dims: '240 × 420 × 349 mm', licence: CUR },
  { id: 'HERO-GTR-01', role: 'guitar', title: 'Solid-body electric guitar, black', dims: '334 × 986 × 79 mm', licence: CUR, fit: 'wall' },
  { id: 'LIVING-34', role: 'lounge_chair', title: 'Oak lounge chair, oatmeal upholstery', dims: '680 × 680 × 784 mm', licence: CUR },
  { id: 'WINDOW-37', role: 'curtain', title: 'S-fold sheer curtain on a ceiling track', dims: '1820 × 2390 × 88 mm (scaled to the opening)', licence: CUR, fit: 'wall' },
  // bedroom
  { id: 'HERO-BED-01', role: 'bed', title: 'Ash bed with layered flax linen', dims: '1960 × 2140 × 1010 mm', licence: KS },
  { id: 'HERO-BED-02', role: 'bedside', title: 'Two-drawer ash bedside table', dims: '520 × 420 × 540 mm', licence: KS },
  { id: 'HERO-BED-03', role: 'wardrobe', title: 'Fluted ash double wardrobe', dims: '1240 × 600 × 2200 mm', licence: KS },
  // dining
  { id: 'HERO-DIN-01', role: 'dining_table', title: 'Whitewashed ash dining table', dims: '2400 × 1040 × 750 mm', licence: KS },
  { id: 'HERO-DIN-02', role: 'dining_chair', title: 'Steam-bent beech dining chair, bouclé seat', dims: '510 × 490 × 770 mm', licence: KS },
  { id: 'HERO-DIN-03', role: 'pendant', title: 'Hoop-pine polyhedron pendant', dims: '720 × 720 × 1080 mm', licence: KS, fit: 'hang' },
  { id: 'HERO-DIN-04', role: 'pendant_linear', title: 'Linear pendant, brushed brass and alabaster', dims: '1600 × 80 × 950 mm', licence: KS, fit: 'hang' },
  // kitchen
  { id: 'HERO-KIT-01', role: 'oven', title: '600 mm wall oven', dims: '596 × 565 × 598 mm', licence: KS },
  { id: 'HERO-KIT-02', role: 'cooktop', title: '900 mm induction cooktop', dims: '900 × 520 × 54 mm', licence: KS },
  { id: 'HERO-KIT-03', role: 'rangehood', title: '900 mm canopy rangehood', dims: '900 × 500 × 820 mm', licence: KS },
  { id: 'HERO-KIT-04', role: 'fridge', title: '900 mm integrated fridge', dims: '900 × 610 × 2030 mm', licence: KS },
  { id: 'HERO-KIT-05', role: 'espresso', title: 'Espresso machine, brushed steel and ash', dims: '290 × 390 × 340 mm', licence: KS },
  { id: 'HERO-KIT-06', role: 'kettle', title: 'Pour-over kettle, brushed brass and ash', dims: '290 × 175 × 215 mm', licence: KS },
  { id: 'HERO-KIT-07', role: 'toaster', title: 'Two-slice toaster, stainless and ash', dims: '295 × 195 × 205 mm', licence: KS },
  { id: 'HERO-KIT-08', role: 'tap', title: 'Gooseneck pull-out kitchen mixer', dims: '54 × 245 × 432 mm', licence: KS },
  { id: 'HERO-KIT-09', role: 'stool', title: 'Beech and leather counter stool', dims: '450 × 460 × 780 mm', licence: KS },
  { id: 'APPLIANCES-10', role: 'knife_block', title: 'Knife block with four chef’s knives, weathered timber', dims: '240 × 322 × 136 mm', licence: CUR },
  // bathroom
  { id: 'HERO-BTH-01', role: 'vanity_wide', title: '1200 mm fluted ash vanity, marble top', dims: '1200 × 460 × 540 mm', licence: KS, fit: 'wall' },
  { id: 'HERO-BTH-02', role: 'toilet', title: 'Back-to-wall toilet with flush plate', dims: '365 × 560 × 420 mm', licence: KS, fit: 'wall' },
  { id: 'HERO-BTH-03', role: 'shower_screen', title: 'Frameless walk-in shower screen and rail', dims: '1000 × 420 × 2050 mm', licence: KS },
  { id: 'HERO-BTH-04', role: 'towel_rail', title: 'Heated ladder towel rail with flax towel', dims: '550 × 115 × 900 mm', licence: KS, fit: 'wall' },
  { id: 'ABI-MIR-08', role: 'mirror', title: 'Arched mirror, satin brass frame', dims: '448 × 788 × 31 mm', licence: CUR, fit: 'wall' },
  // outdoors
  { id: 'HERO-OUT-01', role: 'deck_lounge', title: 'Slatted outdoor sofa and low table', dims: '2150 × 1450 × 720 mm', licence: KS },
  { id: 'HERO-OUT-02', role: 'planters', title: 'Concrete and steel planter trio', dims: '1180 × 540 × 680 mm', licence: KS },
  { id: 'HERO-OUT-03', role: 'bbq', title: 'Four-burner hooded barbecue', dims: '1480 × 620 × 1180 mm', licence: KS },
  { id: 'HERO-NAT-01', role: 'nikau', title: 'Nīkau palm', dims: '1480 × 1480 × 2620 mm', licence: KS },
  { id: 'HERO-NAT-02', role: 'pohutukawa', title: 'Pōhutukawa, multi-stemmed', dims: '1500 × 1400 × 1680 mm', licence: KS },
  { id: 'HERO-NAT-03', role: 'silver_fern', title: 'Ponga (silver fern)', dims: '1300 × 1300 × 1180 mm', licence: KS },
  { id: 'HERO-CAR-01', role: 'car', title: 'Electric SUV (generic, unbranded)', dims: '1920 × 4680 × 1580 mm', licence: KS, turn: 0 },
];

const BASE = import.meta.env.BASE_URL;
const cache = new Map<string, Promise<THREE.Object3D | null>>();
let loader: GLTFLoader | null = null;

async function fetchB64(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const txt = (await res.text()).trim();
  const bin = atob(txt);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

export const hasRole = (role: string) => LIBRARY.some((x) => x.role === role);

/** the piece for a role, normalised to its fit (see Fit), or null */
export function libraryItem(role: string): Promise<THREE.Object3D | null> {
  const it = LIBRARY.find((x) => x.role === role);
  if (!it) return Promise.resolve(null);
  let p = cache.get(it.id);
  if (!p) {
    if (!loader) {
      loader = new GLTFLoader();
      loader.setMeshoptDecoder(MeshoptDecoder);
    }
    const L = loader;
    p = fetchB64(`${BASE}twin/lib/${it.id}.glb.b64.txt`)
      .then((buf) => L.parseAsync(buf, ''))
      .then((gltf) => {
        const inner = gltf.scene;
        inner.rotation.y = it.turn ?? 0;
        inner.updateMatrixWorld(true);
        inner.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.isMesh) {
            m.castShadow = m.receiveShadow = true;
            for (const mat of Array.isArray(m.material) ? m.material : [m.material]) {
              const s = mat as THREE.MeshStandardMaterial;
              // the generator exports every material double-sided; single-sided shades and casts better
              if (s.side === THREE.DoubleSide && !/curtain|leaf|frond|foliage|towel|fern|nikau|pohutukawa/i.test(`${s.name} ${it.role}`)) s.side = THREE.FrontSide;
            }
          }
        });
        const box = new THREE.Box3().setFromObject(inner);
        const c = box.getCenter(new THREE.Vector3());
        const fit = it.fit ?? 'floor';
        inner.position.set(-c.x, fit === 'hang' ? -box.max.y : -box.min.y, fit === 'wall' ? -box.min.z : -c.z);
        const root = new THREE.Group();
        root.add(inner);
        root.name = it.id;
        const size = box.getSize(new THREE.Vector3());
        root.userData = { kind: 'furniture', name: it.title, material: `library ${it.id}`, size: it.dims, source: 'library', note: it.licence, w: size.x, h: size.y, d: size.z };
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

export interface SlotOpts {
  /** largest footprint the room allows (m); a bigger piece leaves the fallback in place */
  maxW?: number;
  maxD?: number;
  maxH?: number;
  /** scale the piece to this width / height (curtains to their opening) */
  fitW?: number;
  fitH?: number;
}

/** an empty slot for a library role, holding an optional procedural fallback */
export function slot(role: string, fallback?: THREE.Object3D | null, opts: SlotOpts = {}) {
  const g = new THREE.Group();
  g.name = `slot_${role}`;
  g.userData = { slot: role, ...opts };
  if (fallback) {
    fallback.userData = { ...fallback.userData, fallback: true };
    g.add(fallback);
  }
  return g;
}

/** fill every slot_<role> group under root with its library piece (when one exists and fits) */
export async function fillSlots(root: THREE.Object3D) {
  const slots: THREE.Object3D[] = [];
  root.traverse((o) => {
    if (o.name.startsWith('slot_')) slots.push(o);
  });
  let filled = 0;
  await Promise.all(
    slots.map(async (s) => {
      const role = s.name.slice(5);
      const item = await libraryItem(role);
      if (!item) return;
      const u = s.userData as SlotOpts;
      const { w, h, d } = item.userData as { w: number; h: number; d: number };
      if ((u.maxW && w > u.maxW + 0.02) || (u.maxD && d > u.maxD + 0.02) || (u.maxH && h > u.maxH + 0.02)) return;
      if (u.fitW || u.fitH) item.scale.set(u.fitW ? u.fitW / w : 1, u.fitH ? u.fitH / h : 1, 1);
      for (const c of [...s.children]) if (c.userData.fallback) s.remove(c);
      s.add(item);
      filled++;
    }),
  );
  return filled;
}
