import test from 'node:test';
import assert from 'node:assert/strict';
import {compare,sceneAt} from './decision-model.js';
test('hand-calculated true alert: baseline 50,000; inspection 20,000',()=>{const r=compare();assert.equal(r.baseline.total,50000);assert.equal(r.supported.total,20000);assert.equal(r.net,30000);assert.deepEqual(r,compare());});
test('false alarm costs money; missed fault survives inspection',()=>{assert.equal(compare({trace:'B'}).net,-6000);const r=compare({trace:'C'});assert.equal(r.net,-6000);assert.equal(r.supported.missed,true);assert.equal(compare({trace:'B',action:'replace'}).net,-15200);});
test('same baseline for all policies and cost sensitivity',()=>{for(const trace of ['A','B','C']){const b=compare({trace}).baseline;for(const action of ['inspect','replace','defer'])assert.deepEqual(compare({trace,action}).baseline,b);}assert.equal(compare({hourlyCost:0}).net,10000);assert.equal(compare({action:'defer'}).net,-1200);});
test('invalid inputs fail instead of fabricating values',()=>{for(const hourlyCost of [NaN,Infinity,-1,20001])assert.throws(()=>compare({hourlyCost}),RangeError);assert.throws(()=>compare({trace:'__proto__'}));assert.throws(()=>compare({action:'bad'}));});
test('replay uses same result at service and failure boundaries',()=>{const r=compare({trace:'C'});assert.equal(sceneAt(r,8).stopped,true);assert.equal(sceneAt(r,9).stopped,false);assert.equal(sceneAt(r,30).state,'stop');assert.equal(sceneAt(r,38).stopped,false);assert.equal(sceneAt(compare(),30).stopped,false);assert.equal(sceneAt(null,30).stopped,false);});
