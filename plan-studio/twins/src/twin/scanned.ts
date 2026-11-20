import * as THREE from 'three/webgpu';

// Scanned surfaces. The twin's own textures are drawn in code; these are photographs of real timber, steel, bark and
// forest floor (Poly Haven, CC0) and scanned leaves (ambientCG, CC0), toned for this use. They load after the model is
// built and replace the drawn maps by material name, so a model that never asks for them is unchanged.

const BASE = import.meta.env.BASE_URL;
const cache = new Map<string, Promise<THREE.Texture>>();
export function scanTex(file: string, srgb: boolean) {
  let t = cache.get(file);
  if (!t) {
    t = new THREE.TextureLoader().loadAsync(`${BASE}../tex/${file}.webp`).then((x) => {
      x.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; x.wrapS = x.wrapT = THREE.RepeatWrapping; x.anisotropy = 8; return x;
    });
    cache.set(file, t);
  }
  return t;
}
/** one scanned set, repeated so it lies at its real size on UVs measured in `tile` metres */
export async function scanSet(name: string, size: number, tile: number, turn = false) {
  const [col, nor, rgh] = await Promise.all([scanTex(`${name}_col`, true), scanTex(`${name}_nor`, false), scanTex(`${name}_rgh`, false)]);
  return [col, nor, rgh].map((t) => { const c = t.clone(); c.repeat.set(tile / size, tile / size); if (turn) { c.rotation = Math.PI / 2; c.center.set(0, 0); } c.needsUpdate = true; return c; }) as [THREE.Texture, THREE.Texture, THREE.Texture];
}
const RULES: { re: RegExp; set: string; size: number; tileKey: string; colour: number; metal: number; turn?: boolean; label: string }[] = [
  { re: /decking/, set: 'deck', size: 1.8, tileKey: 'decking', colour: 0xd9d2c6, metal: 0, label: 'scanned hardwood deck boards, weathered' },
  { re: /roof_profiled_metal|flashing_steel/, set: 'roof', size: 2.0, tileKey: 'roof', colour: 0x34373b, metal: 0.35, label: 'scanned box-profile steel sheet, colour from the schedule family' },
  { re: /cedar_shiplap_black_stain/, set: 'clad', size: 1.0, tileKey: 'blackstain', colour: 0x413d3a, metal: 0, label: 'scanned timber boards, black stain' },
  { re: /treated_pine/, set: 'post', size: 1.8, tileKey: 'framing', colour: 0x8e8a84, metal: 0, label: 'scanned weathered timber' },
];
const done = new WeakSet<THREE.Material>();
export async function scannedFinishes(root: THREE.Object3D, tiles: Record<string, { tile: number }>) {
  const mats = new Set<THREE.MeshPhysicalMaterial>();
  root.traverse((o) => { const m = (o as THREE.Mesh).material as THREE.MeshPhysicalMaterial | undefined; if (m && !Array.isArray(m) && m.name) mats.add(m); });
  let n = 0;
  for (const m of mats) {
    const r = RULES.find((x) => x.re.test(m.name)); if (!r || done.has(m)) continue; done.add(m);
    const tile = tiles[m.name.includes('pile') || m.name.includes('h5') ? 'pile' : r.tileKey]?.tile ?? 1;
    const [col, nor, rgh] = await scanSet(r.set, r.size, tile, r.turn);
    m.map = col; m.normalMap = nor; m.roughnessMap = rgh; m.metalnessMap = null; m.aoMap = null; m.roughness = 1; m.metalness = r.metal; m.color.set(r.colour); m.normalScale.set(1, 1);
    m.userData.scanned = r.label; m.needsUpdate = true; n++;
  }
  return n;
}
