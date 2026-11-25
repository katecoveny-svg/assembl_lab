import test from 'node:test';
import assert from 'node:assert/strict';
import {lawnColor,noise} from '../../roof-solar/study-finish.mjs';

test('Solar study lawn is deterministic in metres, not a short repeating texture',()=>{
 for(const [x,z] of [[0,0],[4,16],[-63,-21],[213,190]]){
  const a=lawnColor(x,z);assert.deepEqual(a,lawnColor(x,z));
  assert.notDeepEqual(a,lawnColor(x+8,z));
  assert(a.every(v=>v>=0&&v<=255));
 }
});
test('Study noise does not jump across a world-coordinate grid seam',()=>{
 assert(Math.abs(noise(-12.00001,4.2)-noise(-11.99999,4.2))<1e-6);
 assert(Math.abs(noise(15.82,4.99999)-noise(15.82,5.00001))<1e-6);
});
