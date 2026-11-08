import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'../../..');
test('hub and original energy keep discoverable companion routes',()=>{
 const hub=fs.readFileSync(path.join(root,'study/index.html'),'utf8');
 const energy=fs.readFileSync(path.join(root,'study/m/energy.html'),'utf8');
 for(const name of ['pendulum','generator']){
  assert.ok(hub.includes(`teardown/${name}/`));assert.ok(energy.includes(`teardown/${name}/`));
  assert.ok(fs.existsSync(path.join(root,'study/teardown',name,'index.html')));
 }
 assert.ok(energy.includes('src="energy.js"'));
});
test('offscreen investigation input redraws its live console',()=>{
 const kit=fs.readFileSync(path.join(root,'study/teardown/kit/teardown.js'),'utf8');
 assert.match(kit,/resample\(\);\s+step\(0\); \/\/ Keep below-stage mobile readouts/);
});
