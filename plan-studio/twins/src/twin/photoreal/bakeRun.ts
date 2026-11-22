// The bake's passes, shared by every place it runs (web workers on the page, worker threads under node, one thread in
// the tests): build the BVH, a first pass of full paths, smoothing, the light cache, the final gather, smoothing again.
// A "pool" runs jobs; this file decides what the jobs are. Pure: no three.js, no DOM.
import { BVH } from './bvh.ts';
import { OUT, Tracer, smooth, type BakeScene, type SkyMap, type Sun } from './bakeCore.ts';

/** everything a bake needs, as plain arrays (what the page exports to a scene file) */
export interface BakeInput {
  samples: Float32Array; // px py pz nx ny nz per sample
  ea: Uint32Array; eb: Uint32Array; // mesh-graph edges between samples (for smoothing)
  tri: Float32Array; mat: Uint16Array; // occluder soup
  triSample: Int32Array; triSampleB: Int32Array; // per soup triangle corner
  mats: Float32Array;
  sky: SkyMap;
  sun: Sun;
  focus: [number, number, number];
  hash: string;
}
/** what a worker is initialised with */
export interface WorkerInit {
  box: Float32Array; link: Int32Array; pre: Float32Array; mat: Uint16Array; nodes: number;
  mats: Float32Array; sky: SkyMap; sun: Sun; triSample: Int32Array; triSampleB: Int32Array; maxDepth: number; seed: number;
}
export interface Pool {
  size: number;
  init(w: number, d: WorkerInit): Promise<void>;
  cache(w: number, c: Float32Array): Promise<void>;
  job(w: number, j: { first: number; spp: number; mode: 0 | 1; samples: Float32Array }): Promise<Float32Array>;
  close(): void;
}
export const SEED = 20261122;
export const MAX_DEPTH = 5;

/** a tracer from worker-init arrays (the worker side of any pool) */
export function tracerFrom(d: WorkerInit): Tracer {
  const bvh = Object.create(BVH.prototype) as BVH;
  Object.assign(bvh, { box: d.box, link: d.link, pre: d.pre, mat: d.mat, nodes: d.nodes, order: new Uint32Array(0), st: new Int32Array(128) });
  const S: BakeScene = { bvh, mats: d.mats, sky: d.sky, sun: d.sun, triSample: d.triSample, triSampleB: d.triSampleB, maxDepth: d.maxDepth, seed: d.seed };
  return new Tracer(S);
}

/** a pool that runs on the calling thread (tests, and pages without workers) */
export function inlinePool(): Pool {
  let T: Tracer | null = null;
  return {
    size: 1,
    async init(_w, d) { T = tracerFrom(d); },
    async cache(_w, c) { T!.cache = c; },
    async job(_w, j) { return T!.job(j.samples, j.first, j.spp, j.mode); },
    close() { T = null; },
  };
}

export interface RunOpts { spp: number; chunk?: number; log?: (m: string) => void; progress?: (f: number, label: string) => void; now?: () => number }

export async function bakeWithPool(I: BakeInput, pool: Pool, o: RunOpts): Promise<{ E: Float32Array; D: Float32Array; timing: Record<string, number> }> {
  const now = o.now ?? (() => Date.now()), log = o.log ?? (() => void 0);
  const t0 = now();
  const bvh = new BVH({ tri: I.tri, mat: I.mat });
  const tS = new Int32Array(I.triSample.length), tSB = new Int32Array(I.triSampleB.length);
  for (let i = 0; i < bvh.order.length; i++) { const s = bvh.order[i]; for (let c = 0; c < 3; c++) { tS[i * 3 + c] = I.triSample[s * 3 + c]; tSB[i * 3 + c] = I.triSampleB[s * 3 + c]; } }
  const tBvh = now();
  const nS = I.samples.length / 6, spp = o.spp;
  log(`[bake] BVH: ${I.mat.length} triangles, ${bvh.nodes} nodes, ${((tBvh - t0) / 1000).toFixed(1)} s; ${nS} samples, ${spp} spp, ${pool.size} workers`);
  const init: WorkerInit = { box: bvh.box, link: bvh.link, pre: bvh.pre, mat: bvh.mat, nodes: bvh.nodes, mats: I.mats, sky: I.sky, sun: I.sun, triSample: tS, triSampleB: tSB, maxDepth: MAX_DEPTH, seed: SEED };
  await Promise.all(Array.from({ length: pool.size }, (_, w) => pool.init(w, init)));
  const CH = o.chunk ?? 1500, jobs: [number, number][] = [];
  for (let s = 0; s < nS; s += CH) jobs.push([s, Math.min(nS, s + CH)]);
  // ground far from the house needs few samples: its light is nearly open sky
  const mult = jobs.map(([a, b]) => {
    let far = 0;
    for (let i = a; i < b; i++) { const dx = I.samples[i * 6] - I.focus[0], dz = I.samples[i * 6 + 2] - I.focus[2]; if (dx * dx + dz * dz > 22 * 22) far++; }
    return far > (b - a) * 0.6 ? 0.2 : 1;
  });
  const pass = async (mode: 0 | 1, n: number, label: string) => {
    const R = new Float32Array(nS * OUT);
    let next = 0, done = 0;
    await Promise.all(Array.from({ length: pool.size }, async (_, w) => {
      while (next < jobs.length) {
        const id = next++, [a, b] = jobs[id];
        const out = await pool.job(w, { first: a, spp: Math.max(4, Math.round(n * mult[id])), mode, samples: I.samples.slice(a * 6, b * 6) });
        R.set(out, a * OUT); done++;
        o.progress?.(done / jobs.length, label);
        if (done % 40 === 0 || done === jobs.length) log(`[bake] ${label} ${Math.round((100 * done) / jobs.length)}% ${((now() - t0) / 1000).toFixed(0)} s`);
      }
    }));
    return R;
  };
  const E = new Float32Array(nS * 3), D = new Float32Array(nS * 3), ok = new Uint8Array(nS), Sun3 = new Float32Array(nS * 3), N = new Float32Array(nS * 3);
  for (let i = 0; i < nS; i++) for (let c = 0; c < 3; c++) N[i * 3 + c] = I.samples[i * 6 + 3 + c];
  const unpack = (R: Float32Array, keepSun: boolean) => {
    for (let i = 0; i < nS; i++) {
      for (let c = 0; c < 3; c++) { E[i * 3 + c] = R[i * OUT + c]; D[i * 3 + c] = R[i * OUT + 3 + c]; if (keepSun) Sun3[i * 3 + c] = R[i * OUT + 7 + c]; }
      ok[i] = R[i * OUT + 6];
    }
  };
  const spp1 = Math.max(8, Math.min(32, Math.round(spp / 4)));
  unpack(await pass(0, spp1, 'paths'), true);
  smooth(E, D, ok, N, I.ea, I.eb, 3);
  const tP1 = now();
  const cache = new Float32Array(nS * 3);
  for (let i = 0; i < cache.length; i++) cache[i] = E[i] + Sun3[i];
  await Promise.all(Array.from({ length: pool.size }, (_, w) => pool.cache(w, cache)));
  unpack(await pass(1, spp, 'gather'), false);
  smooth(E, D, ok, N, I.ea, I.eb, 2);
  pool.close();
  const t1 = now();
  const timing = { bvh: +((tBvh - t0) / 1000).toFixed(1), paths: +((tP1 - tBvh) / 1000).toFixed(1), gather: +((t1 - tP1) / 1000).toFixed(1), total: +((t1 - t0) / 1000).toFixed(1) };
  log(`[bake] done in ${timing.total} s ${JSON.stringify(timing)}`);
  return { E, D, timing };
}

// ---- scene file: the page writes it, node bakes it (tools/film/bake.mjs) ----
const SCENE_MAGIC = 0x31535241; // 'ARS1'
export function packScene(I: BakeInput): ArrayBuffer {
  const parts: [string, ArrayBufferView][] = [['samples', I.samples], ['ea', I.ea], ['eb', I.eb], ['tri', I.tri], ['mat', I.mat], ['triSample', I.triSample], ['triSampleB', I.triSampleB], ['mats', I.mats], ['sky', I.sky.data]];
  const meta = { sky: { w: I.sky.w, h: I.sky.h }, sun: I.sun, focus: I.focus, hash: I.hash, parts: [] as [string, number, number][] };
  let off = 0;
  for (const [k, v] of parts) { meta.parts.push([k, off, v.byteLength]); off += Math.ceil(v.byteLength / 8) * 8; }
  const json = new TextEncoder().encode(JSON.stringify(meta));
  const head = Math.ceil((8 + json.length) / 8) * 8;
  const buf = new ArrayBuffer(head + off), dv = new DataView(buf);
  dv.setUint32(0, SCENE_MAGIC, true); dv.setUint32(4, json.length, true);
  new Uint8Array(buf, 8, json.length).set(json);
  for (let i = 0; i < parts.length; i++) new Uint8Array(buf, head + meta.parts[i][1], parts[i][1].byteLength).set(new Uint8Array(parts[i][1].buffer, parts[i][1].byteOffset, parts[i][1].byteLength));
  return buf;
}
export function unpackScene(buf: ArrayBuffer): BakeInput {
  const dv = new DataView(buf);
  if (dv.getUint32(0, true) !== SCENE_MAGIC) throw new Error('not a bake scene file');
  const jl = dv.getUint32(4, true), meta = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 8, jl)));
  const head = Math.ceil((8 + jl) / 8) * 8;
  const get = (k: string) => { const p = (meta.parts as [string, number, number][]).find((x) => x[0] === k)!; return buf.slice(head + p[1], head + p[1] + p[2]); };
  return {
    samples: new Float32Array(get('samples')), ea: new Uint32Array(get('ea')), eb: new Uint32Array(get('eb')), tri: new Float32Array(get('tri')), mat: new Uint16Array(get('mat')),
    triSample: new Int32Array(get('triSample')), triSampleB: new Int32Array(get('triSampleB')), mats: new Float32Array(get('mats')),
    sky: { w: meta.sky.w, h: meta.sky.h, data: new Float32Array(get('sky')) }, sun: meta.sun, focus: meta.focus, hash: meta.hash,
  };
}
