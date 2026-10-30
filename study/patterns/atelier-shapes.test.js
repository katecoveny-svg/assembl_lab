import test from 'node:test';
import assert from 'node:assert/strict';
import {FORMS,shapePoint,cleanRecipe} from './atelier-shapes.js';

test('every form has a finite, closed centreline at seed boundaries',()=>{
  for(const form of FORMS)for(const seed of [0,42,99999]){
    const start=shapePoint(form,0,seed),end=shapePoint(form,1,seed);
    assert.ok(start.every((v,i)=>Math.abs(v-end[i])<1e-9));
    for(let i=0;i<=360;i++)assert.ok(shapePoint(form,i/360,seed).every(v=>Number.isFinite(v)&&Math.abs(v)<2));
  }
});
test('recipes reproduce shapes and different forms produce different geometry',()=>{
  const points=FORMS.map(form=>Array.from({length:20},(_,i)=>shapePoint(form,i/20,42)));
  assert.equal(new Set(points.map(p=>JSON.stringify(p))).size,FORMS.length);
  assert.deepEqual(shapePoint('halo',.2,78),shapePoint('halo',.2,78));
  assert.notDeepEqual(shapePoint('halo',.2,78),shapePoint('halo',.2,628));
});
test('untrusted recipes are restricted to supported geometry, materials and bounded values',()=>{
  const r=cleanRecipe({seed:Infinity,form:'<script>',material:'remote-url',thickness:-200,flutes:100000,zoom:NaN,energy:9,word:'<PLAY&>',dark:'yes'});
  assert.equal(r.seed,42);assert.equal(r.form,'knot');assert.equal(r.material,'porcelain');
  assert.equal(r.thickness,.25);assert.equal(r.flutes,14);assert.equal(r.zoom,1);assert.equal(r.energy,1);
  assert.equal(r.word,'PLAY');assert.equal(r.dark,false);
});

test('custom appearance survives recipe JSON and rejects invalid colour inputs', () => {
  const recipe = cleanRecipe({color:'#4263eb',background:'#e7edff',roughness:.38});
  assert.deepEqual(cleanRecipe(JSON.parse(JSON.stringify(recipe))), recipe);
  const invalid = cleanRecipe({color:'url(example)',background:'#fff',roughness:10});
  assert.equal(invalid.color, '#c9bcdf');
  assert.equal(invalid.background, '#fffdfb');
  assert.equal(invalid.roughness, .9);
});
