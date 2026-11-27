import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeBed,decodeBed,restoreBed} from './public-bed.mjs';

function example() {
  const plant = {id:8,speciesId:'harakeke',bedId:null,x:1/3,z:-5.09,rotY:1.01,scale:.988,phase:.95,hue:-.85};
  const engine = {
    plants:[plant],beds:[{id:1}],speciesMeshes:new Map([['harakeke',true]]),
    splatDataA:Uint8Array.of(255,0,8,2),splatDataB:Uint8Array.of(1,2,3,4),splatDataC:Uint8Array.of(0,0,9,0)
  };
  return {engine,state:{selectedCompositionId:'coastal_native'},getQuote:()=>({grandTotalInclGst:1234.56}),privateNotes:'never transfer'};
}

test('exact placements, painted ground, age, season and estimate survive the fragment',async()=>{
  const s=example(),fragment=await encodeBed(s,6.4,12);
  assert(!fragment.includes('never transfer'));
  const saved=await decodeBed(fragment,s.engine);
  assert.deepEqual(saved.plants,s.engine.plants);
  assert.equal(saved.total,123456);
  assert.equal(saved.year,12);
  assert.equal(saved.month,6.4);
  assert.deepEqual([...saved.ground],[255,0,8,2,1,2,3,4,0,0,9,0]);
});

test('an invalid species or mismatched surface layout cannot enter the working scene',async()=>{
  const s=example(),fragment=await encodeBed(s,6.4,12);
  await assert.rejects(decodeBed(fragment.replace('harakeke','unknown_species'),s.engine));
  s.engine.splatDataC=new Uint8Array(3);
  await assert.rejects(decodeBed(fragment,s.engine));
});

test('a changed catalogue price restores the original plants and surfaces atomically',async()=>{
  const s=example(),fragment=await encodeBed(s,6.4,12);
  s.engine.splatDataA.fill(88);
  s.engine.plants=[];
  s.getQuote=()=>({grandTotalInclGst:1235.56});
  await assert.rejects(restoreBed(s,fragment));
  assert.deepEqual(s.engine.plants,[]);
  assert.deepEqual([...s.engine.splatDataA],[88,88,88,88]);
});
