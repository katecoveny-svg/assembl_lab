// Worker thread for tools/film/film.mjs bake: the same tracer the page's web workers run (bakeCore.ts).
import { parentPort } from 'node:worker_threads';
import { tracerFrom } from '../../plan-studio/twins/src/twin/photoreal/bakeRun.ts';

let T = null;
parentPort.on('message', (d) => {
  if (d.type === 'init') { T = tracerFrom(d.d); parentPort.postMessage({ type: 'ready' }); }
  else if (d.type === 'cache') { T.cache = d.cache; parentPort.postMessage({ type: 'cached' }); }
  else if (d.type === 'job') { const out = T.job(d.samples, d.first, d.spp, d.mode); parentPort.postMessage({ type: 'done', out }, [out.buffer]); }
});
