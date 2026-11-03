// assembl lab · twin stage v2
// v2 is v1 plus authored-asset loading: a twin can drop a Blender-authored GLB into the same stage, driven through a
// small rig adapter, and keep its procedural maquette as the fallback. Everything v1 exports is re-exported unchanged,
// so a twin opts in by changing its import path from /assets/twin/1/stage.js to /assets/twin/2/stage.js. The other
// stage twins stay on v1 until they choose to move. (STAGE.md: breaking stage changes go in a new folder.)
export * from '../1/stage.js';
import { THREE } from '../1/stage.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const STAGE_VERSION = 2;

// ms = 0: no deadline (a busy main thread must not turn a slow but healthy load into a failure)
const withTimeout = (p, ms, what) => !ms ? p : new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error(`${what}: timed out after ${ms} ms`)), ms);
  p.then(v => { clearTimeout(t); res(v); }, e => { clearTimeout(t); rej(e); });
});

/**
 * Load an authored GLB together with its rig contract, and refuse anything that is not what the twin asked for.
 * Rejects (never substitutes) when: the contract cannot be fetched, its id differs from `contract`, the GLB cannot be
 * parsed, the root node is missing, or any node listed in the contract's `required_nodes` is missing.
 * The caller keeps its procedural maquette on any rejection.
 *
 * @param {{url:string, contractUrl:string, contract:string, rootNode:string, timeoutMs?:number}} o  timeoutMs 0 = no deadline
 * @returns {Promise<{scene:THREE.Group, contract:object, gltf:object}>}
 */
export async function loadTwinAsset(o) {
  const { url, contractUrl, contract, rootNode, timeoutMs = 0 } = o;
  const spec = await withTimeout(fetch(contractUrl).then(r => { if (!r.ok) throw new Error(`rig contract ${r.status}`); return r.json(); }), timeoutMs, 'rig contract');
  if (!spec || spec.contract !== contract) throw new Error(`unsupported rig contract ${spec && spec.contract} (want ${contract})`);
  const gltf = await withTimeout(new GLTFLoader().loadAsync(url), timeoutMs, 'GLB');
  const scene = gltf.scene;
  const root = scene.getObjectByName(rootNode);
  if (!root) throw new Error(`GLB has no ${rootNode} node`);
  const missing = (spec.required_nodes || []).filter(n => !scene.getObjectByName(n));
  if (missing.length) throw new Error(`GLB is missing rig nodes: ${missing.slice(0, 6).join(', ')}${missing.length > 6 ? '…' : ''}`);
  prepareAsset(scene);
  return { scene, contract: spec, gltf };
}

/** Shadows on solid parts; simplified alpha glass neither casts shadows nor writes depth (and so stays out of AO). */
export function prepareAsset(scene) {
  scene.traverse(m => {
    if (!m.isMesh) return;
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    const clear = mats.some(x => x && x.transparent);
    m.castShadow = !clear; m.receiveShadow = true;
    if (clear) mats.forEach(x => { x.depthWrite = false; });
  });
  return scene;
}
