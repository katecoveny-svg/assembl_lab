import test from 'node:test';
import assert from 'node:assert/strict';
import {PROJECT,CHAPTERS,OPTIONS,safeState,stateQuery,readState,packet,escapeHtml,validateGlb} from './data.js';
test('shared links only encode allowlisted presentation state',()=>{
 const q=stateQuery({chapter:'outside',option:'garden',roof:'off',light:'evening',privateNotes:'secret'});
 assert.equal(q.includes('secret'),false);assert.equal(readState('?'+q).chapter,'outside');assert.equal(readState('?'+q).option,'garden');assert.equal(readState('?'+q).roof,false);
 assert.equal(safeState({chapter:'<script>',option:'__proto__'}).chapter,'overview');assert.equal(safeState({option:'__proto__'}).option,'shelter');
});
test('a public packet never includes local questions unless deliberately requested',()=>{
 const p=packet({option:'garden'},['A private question']);assert.equal(JSON.stringify(p).includes('private question'),false);assert.equal(p.optionStatus,'Illustrative alternative, not approved');assert.equal(p.areas.covered,14);assert.equal(p.areas.planted,32);
 assert.equal(packet({},['A private question'],true).myQuestions[0],'A private question');assert.equal(p.chapters.length,CHAPTERS.length);assert.ok(p.truth.includes('not a Whaiao design'));
});
test('all chapter room anchors exist and option dimensions are finite positive values',()=>{
 const rooms=new Set(PROJECT.rooms.map(r=>r.id));
 for(const c of CHAPTERS){assert.ok(c.title&&c.story&&c.reason&&c.question);if(c.room)assert.ok(rooms.has(c.room));}
 for(const o of Object.values(OPTIONS))for(const key of ['canopyDepth','canopyWidth','gardenWidth','gardenDepth'])assert.ok(Number.isFinite(o[key])&&o[key]>0);
});
test('exported user text is escaped',()=>assert.equal(escapeHtml('<img onerror="x"> &'), '&lt;img onerror=&quot;x&quot;&gt; &amp;'));
test('GLB validation rejects malformed files and external resources',()=>{
 assert.throws(()=>validateGlb(new ArrayBuffer(20)));
 function glb(json){let text=JSON.stringify(json);while(text.length%4)text+=' ';const bytes=new TextEncoder().encode(text),buf=new ArrayBuffer(20+bytes.length),v=new DataView(buf);v.setUint32(0,0x46546c67,true);v.setUint32(4,2,true);v.setUint32(8,buf.byteLength,true);v.setUint32(12,bytes.length,true);v.setUint32(16,0x4e4f534a,true);new Uint8Array(buf,20).set(bytes);return buf;}
 assert.throws(()=>validateGlb(glb({images:[{uri:'https://example.com/private.png'}]})),/self-contained/);
 assert.throws(()=>validateGlb(glb({extensionsRequired:['KHR_draco_mesh_compression']})),/compression/);
 assert.equal(validateGlb(glb({asset:{version:'2.0'}})).asset.version,'2.0');
});