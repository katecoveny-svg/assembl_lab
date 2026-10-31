import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
// Source-level checks only: GPU output, frame rate and mobile behaviour are reviewed in a browser, not here.
const studio=fs.readFileSync(new URL('./studio.js',import.meta.url),'utf8');
test('Pattern slides through the published Gray–Scott regimes without leaving them',async()=>{
 globalThis.matchMedia ??= ()=>({matches:false});
 const {regime}=await import('./turing.js');
 assert.equal(regime(0).name,'dividing cells');assert.equal(regime(1).name,'worms');
 for(let e=0;e<=1;e+=.05){const {F,K}=regime(e);assert.ok(F>=.029&&F<=.078,'F '+F);assert.ok(K>=.057&&K<=.0649,'K '+K);}
 assert.deepEqual(regime(-1),regime(0));assert.deepEqual(regime(2),regime(1));
});
test('each living system says what kind of model it is',()=>{
 for(const [id,claim] of [['fluid',/genuine \(if coarse\) fluid simulation/],['turing',/Gray–Scott reaction–diffusion model/],['slime',/simplified agent model/]]){
  const entry=studio.match(new RegExp(`\\b${id}:\\{[^\\n]*`))?.[0];assert.ok(entry,'missing '+id);assert.match(entry,claim);
 }
});
test('the simulation grid survives a resize, so exports keep the artwork',()=>{
 for(const file of ['fluid.js','turing.js','slime.js']){const src=fs.readFileSync(new URL(file,import.meta.url),'utf8');
  const resize=src.match(/resize\(w, h, dpr\) \{([^\n]*)\}/)?.[1];assert.ok(resize,file);assert.match(resize,/if \(!(sim|grid|world)\)/,file+' must only allocate once');}
});
