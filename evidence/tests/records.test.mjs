import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateRecord,freshness} from '../records.mjs';
import {quakeRecords,schoolRecords} from '../adapters/index.mjs';
const snapshot=JSON.parse(await readFile(new URL('../data/snapshot.json',import.meta.url)));
test('all fetched records have provenance and no personal or student fields',()=>{assert.ok(snapshot.records.length>5);for(const r of snapshot.records){validateRecord(r);assert.notEqual(r.value.quality,'deleted');assert.doesNotMatch(JSON.stringify(r),/Contact1_Name|Telephone|Email|Total_Roll/);}});
test('missing, stale, future and invalid records remain distinct',()=>{const r=snapshot.records[0],t=Date.parse(r.retrievedAt);assert.equal(freshness(null),'missing');assert.equal(freshness(r,t),'recently retrieved');assert.equal(freshness(r,t+r.maxAgeMs+1),'stale');assert.equal(freshness(r,t-1),'invalid');assert.equal(freshness({...r,retrievedAt:'bad'}),'invalid');});
test('schema changes fail closed rather than returning fake or silently partial records',()=>{assert.throws(()=>quakeRecords({},new Date().toISOString()));assert.throws(()=>quakeRecords({type:'FeatureCollection',features:[{properties:{}}]},new Date().toISOString()));assert.throws(()=>schoolRecords({success:true,result:{records:[]}}, {},{},new Date().toISOString()));});
test('valid empty earthquake feed is empty, not invented',()=>assert.deepEqual(quakeRecords({type:'FeatureCollection',features:[]},new Date().toISOString()),[]));
test('unknown classifications and missing reporting date explanation rejected',()=>{assert.throws(()=>validateRecord({...snapshot.records[0],classification:'verified'}));assert.throws(()=>validateRecord({...snapshot.records[0],observationBasis:''}));});

test('source context maps requested contract without keys or claiming continuous live',async()=>{
 const {toSourceContext,describe}=await import('../records.mjs');const r=snapshot.records[0],dto=toSourceContext(r,Date.parse(r.retrievedAt));
 for(const key of ['sourceUrl','licence','observedAt','retrievedAt','freshness','kind'])assert.ok(key in dto);
 assert.match(describe(r),/saved snapshot/);assert.equal(dto.freshness,'recently retrieved');
});
test('unavailable, interrupted and malformed snapshots reject without replacement records',async()=>{
 const {loadSnapshot}=await import('../load.mjs');
 await assert.rejects(loadSnapshot(async()=>({ok:false})));
 await assert.rejects(loadSnapshot(async()=>{throw new DOMException('Aborted','AbortError');}));
 await assert.rejects(loadSnapshot(async()=>({ok:true,json:async()=>({schemaVersion:2,records:[]})})));
 await assert.rejects(loadSnapshot(async()=>({ok:true,json:async()=>({...snapshot,records:[{...snapshot.records[0],value:{}}]})})));
 assert.deepEqual(await loadSnapshot(async()=>({ok:true,json:async()=>snapshot})),snapshot.records);
});
