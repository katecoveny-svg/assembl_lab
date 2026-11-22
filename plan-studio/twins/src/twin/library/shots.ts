import * as THREE from 'three';
import { Studio, type ShotOpts } from './studio';
import { BUILDERS, triangles } from './pieces';
import { LIBRARY, libraryItem } from '../library';
import { CATALOGUE } from './catalogue';
import { texStats } from './mats';
import { interiorMats, toFinishes, sofa as oldSofa, armchair as oldArmchair, bed as oldBed, diningTable as oldTable, floorLamp as oldLamp } from '../furniture';
import { PRESETS, complete } from '../finishes';
import { buildRug } from '../scandiInteriors';

// The page tools/library-shots.py drives in a headless browser: it builds each catalogue piece (or loads its GLB),
// measures it, and renders its library picture in the studio. Not part of the deployed 3D page.

const canvas = document.getElementById('c') as HTMLCanvasElement;
const studio = new Studio(canvas, 800);
const M = () => interiorMats('hq', toFinishes(complete(PRESETS['cedar-charcoal'].s), 'Cedar and charcoal'));
// the pieces the fit-out drew before this library: for the before-and-after sheet
const OLD: Record<string, () => THREE.Object3D> = {
  'old:sofa': () => oldSofa(M(), 2.2), 'old:armchair': () => oldArmchair(M()), 'old:bed': () => oldBed(M(), 1.53), 'old:table': () => oldTable(M(), 2.0, 0.95),
  'old:rug': () => buildRug(2.4, 1.7) as unknown as THREE.Object3D, 'old:lamp': () => oldLamp(M()),
};

async function build(id: string): Promise<THREE.Object3D | null> {
  if (OLD[id]) return OLD[id]();
  const it = CATALOGUE.find((x) => x.id === id);
  if (BUILDERS[id]) return BUILDERS[id]();
  const glb = it?.glb ?? id;
  const lib = LIBRARY.find((x) => x.id === glb);
  if (!lib) return null;
  return (await libraryItem(lib.role)) as unknown as THREE.Object3D | null;
}

const api = {
  ids: () => CATALOGUE.map((x) => x.id),
  catalogue: () => CATALOGUE,
  /** the piece's bounds (mm), triangle count and how long it took to build */
  async measure(id: string) {
    const t0 = performance.now();
    const o = await build(id);
    if (!o) return { id, error: 'no such piece' };
    o.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(o), s = b.getSize(new THREE.Vector3());
    let meshes = 0; o.traverse((m) => { if ((m as THREE.Mesh).isMesh) meshes++; });
    return { id, w: Math.round(s.x * 1000), d: Math.round(s.z * 1000), h: Math.round(s.y * 1000), min: b.min.toArray().map((v) => +v.toFixed(3)), tris: triangles(o), meshes, buildMs: Math.round(performance.now() - t0) };
  },
  async shoot(id: string, opts: ShotOpts = {}) {
    const o = await build(id);
    if (!o) return { id, error: 'no such piece' };
    const it = CATALOGUE.find((x) => x.id === id);
    let subject = o;
    if (it?.fit === 'hang') {
      // a hanging piece is pictured hanging, its foot well clear of the studio floor
      const b = new THREE.Box3().setFromObject(o), g = new THREE.Group();
      o.position.y = -b.min.y + 0.45; g.add(o); subject = g;
    }
    const r = await studio.shoot(subject, { ...(it?.view ?? {}), ...opts });
    return { id, ...r, tris: triangles(o) };
  },
  texStats,
  studio,
  build,
};
(window as unknown as { __lib: typeof api }).__lib = api;
document.getElementById('status')!.textContent = 'Ready';
