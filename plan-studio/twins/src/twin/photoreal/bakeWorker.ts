// Web worker for the light bake: receives the scene once (the BVH arrays, materials, sky, sun), then traces runs of
// sample points on request. All the tracing is in bakeCore.ts; the passes are in bakeRun.ts.
import { tracerFrom } from './bakeRun.ts';
import type { Tracer } from './bakeCore.ts';

let T: Tracer | null = null;
const post = (m: unknown, t: Transferable[] = []) => (self as unknown as Worker).postMessage(m, t);
self.onmessage = (e: MessageEvent) => {
  const d = e.data;
  if (d.type === 'init') { T = tracerFrom(d.d); post({ type: 'ready' }); }
  else if (d.type === 'cache') { T!.cache = d.cache; post({ type: 'cached' }); }
  else if (d.type === 'job') { const out = T!.job(d.samples, d.first, d.spp, d.mode); post({ type: 'done', out }, [out.buffer]); }
};
