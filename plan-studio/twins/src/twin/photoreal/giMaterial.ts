// Materials that read the baked light. A receiver's material becomes a node material whose environment lighting
// keeps the sky's reflections (specular) but takes its diffuse light from the bake: the per-vertex irradiance `gi`,
// steered by `gd` (the mean direction the light came from) so normal-mapped detail still shades, and `giB` on the
// back of two-sided surfaces. The baked irradiance goes into the same slot the sky's diffuse light used, so the
// lighting model's energy balance between diffuse and specular is kept. Idea after room-at-dawn's core/gi.js (MIT,
// Leon Lin), rebuilt for three.js's node materials (WebGPU and its WebGL 2 fallback).
import * as THREE from 'three/webgpu';
import { attribute, frontFacing, normalWorld, normalWorldGeometry, uniform, vec3 } from 'three/tsl';

/** shader options (fewer varyings for small GPUs) */
export const giMode = { dir: true, back: true };

export const giUniforms = {
  /** overall scale on the baked light (1 = as traced) */
  scale: uniform(1),
  /** how strongly normal maps steer the baked light (room-at-dawn's giK) */
  k: uniform(1.6),
};

type Builder = { context: Record<string, unknown> };

class BakedEnvironmentNode extends THREE.EnvironmentNode {
  baked: unknown;
  constructor(envNode: THREE.Node | null, baked: unknown) {
    super(envNode as THREE.Node);
    this.baked = baked;
  }
  setup(builder: THREE.NodeBuilder) {
    const ctx = (builder as unknown as Builder).context;
    const real = ctx.iblIrradiance as { addAssign: (n: unknown) => void };
    if (this.envNode) {
      // the sky's own diffuse goes to a sink; its reflections stay
      ctx.iblIrradiance = vec3().toVar('skyDiffuseUnused');
      super.setup(builder);
      ctx.iblIrradiance = real;
    }
    real.addAssign(this.baked);
  }
}

const cache = new Map<string, THREE.Material>();

function px(r: number, g: number, b: number, srgb: boolean) {
  const t = new THREE.DataTexture(new Uint8Array([r, g, b, 255]), 1, 1);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.needsUpdate = true;
  return t;
}
let WHITE: THREE.DataTexture | null = null, FLAT: THREE.DataTexture | null = null, ONE: THREE.DataTexture | null = null;

export interface Detail { map?: THREE.Texture | null; normal?: THREE.Texture | null; rough?: THREE.Texture | null; normalScale?: number; roughness?: number; tint?: THREE.Color }

/**
 * The baked twin of a mesh material. Every receiver gets the same material shape (a standard node material with a
 * colour map, a normal map and a roughness map: neutral one-pixel maps where the original had none, or the procedural
 * detail maps passed in), so a whole house compiles to a handful of shader programs. That matters on small GPUs and
 * in software rendering, where each program costs memory. Clearcoat and sheen are folded into roughness.
 */
export function bakedMaterial(_renderer: THREE.WebGPURenderer, src: THREE.Material, back: boolean, detail: Detail | null = null, key = ''): THREE.Material {
  const k = `${src.uuid}|${back ? 1 : 0}|${key}`;
  const hit = cache.get(k);
  if (hit) return hit;
  WHITE ??= px(255, 255, 255, true); FLAT ??= px(128, 128, 255, false); ONE ??= px(255, 255, 255, false);
  const o = src as THREE.MeshPhysicalMaterial;
  const nm = new THREE.MeshStandardNodeMaterial();
  nm.name = src.name;
  nm.color.copy(o.color ?? new THREE.Color(1, 1, 1));
  if (detail?.tint) nm.color.multiply(detail.tint);
  nm.map = o.map ?? detail?.map ?? WHITE;
  nm.normalMap = o.normalMap ?? detail?.normal ?? FLAT;
  const ns = o.normalMap ? o.normalScale : null;
  nm.normalScale.set(ns ? ns.x : detail?.normalScale ?? 1, ns ? ns.y : detail?.normalScale ?? 1);
  nm.roughnessMap = o.roughnessMap ?? detail?.rough ?? ONE;
  let r = o.roughness ?? 1;
  if (!o.roughnessMap && detail?.roughness !== undefined) r = detail.roughness;
  if ((o.clearcoat ?? 0) > 0) r = Math.min(r, 0.35 + 0.5 * (o.clearcoatRoughness ?? 0.1));
  if ((o.sheen ?? 0) > 0) r = Math.max(r, 0.8);
  nm.roughness = r;
  nm.metalness = o.metalness ?? 0;
  nm.metalnessMap = o.metalnessMap ?? null;
  nm.emissive.copy(o.emissive ?? new THREE.Color(0, 0, 0));
  nm.emissiveIntensity = o.emissiveIntensity ?? 1;
  nm.emissiveMap = o.emissiveMap ?? null;
  nm.envMapIntensity = o.envMapIntensity ?? 1;
  nm.side = src.side;
  nm.vertexColors = src.vertexColors;
  nm.flatShading = !!o.flatShading;
  const gi = attribute('gi', 'vec3'), gd = attribute('gd', 'vec3');
  const ratio = normalWorld.dot(gd).mul(giUniforms.k).add(1).div(normalWorldGeometry.dot(gd).mul(giUniforms.k).add(1).max(0.3)).clamp(0, 2.5);
  let baked = giMode.dir ? gi.mul(ratio) : gi;
  if (back && giMode.back) baked = frontFacing.select(baked, attribute('giB', 'vec3')) as typeof baked;
  baked = baked.mul(giUniforms.scale);
  const proto = Object.getPrototypeOf(nm) as { setupEnvironment: (b: THREE.NodeBuilder) => THREE.EnvironmentNode | null };
  (nm as unknown as { setupEnvironment: (b: THREE.NodeBuilder) => THREE.Node }).setupEnvironment = function (this: unknown, builder: THREE.NodeBuilder) {
    const env = proto.setupEnvironment.call(this, builder);
    return new BakedEnvironmentNode(env ? (env as unknown as { envNode: THREE.Node }).envNode : null, baked);
  };
  const base = nm.customProgramCacheKey.bind(nm);
  nm.customProgramCacheKey = () => base() + (back ? '|baked2' : '|baked');
  nm.userData = { ...src.userData, bakedFrom: src.uuid };
  cache.set(k, nm);
  return nm;
}

export function clearBakedMaterials() {
  for (const m of cache.values()) m.dispose();
  cache.clear();
}
