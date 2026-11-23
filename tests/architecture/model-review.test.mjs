import test from 'node:test';
import assert from 'node:assert/strict';
import { readReview, REVIEW_SCHEMA, safeLayer, sha256, unalteredGlass } from '../../plan-studio/twins/src/twin/modelReviewRules.ts';
import { readSiteHandoff, sourceExtra } from '../../architecture/js/site-sources-rules.js';
import { kindOf, primaryModel } from '../../architecture/js/file-library-rules.js';
const hashA = 'a'.repeat(64), hashB = 'b'.repeat(64);
const p = {id:'entry',label:'Front entry',eye:[20,1.6,20],look:[0,1.6,0],note:'A view from the courtyard.'};
const manifest = {schema:REVIEW_SCHEMA,modelSha256:hashA,points:[p]};
const glb = obj => {
  const j=JSON.stringify({asset:{version:'2.0'},meshes:[{}],...obj}).padEnd(Math.ceil(JSON.stringify({asset:{version:'2.0'},meshes:[{}],...obj}).length/4)*4);
  const bytes=new TextEncoder().encode(j), buf=new ArrayBuffer(20+bytes.length), v=new DataView(buf);
  [0x46546c67,2,buf.byteLength,bytes.length,0x4e4f534a].forEach((n,i)=>v.setUint32(i*4,n,true));
  new Uint8Array(buf,20).set(bytes);return buf;
};
test('matching model only; refuses duplicate, coincident and nonfinite points', () => {
  assert.deepEqual(readReview(manifest,hashA).points,[p]);
  assert.throws(()=>readReview(manifest,hashB),/different model/);
  assert.throws(()=>readReview({...manifest,points:[p,p]},hashA),/duplicate/);
  assert.throws(()=>readReview({...manifest,points:[{...p,look:p.eye}]},hashA),/duplicate/);
  assert.throws(()=>readReview({...manifest,points:[{...p,eye:[Infinity,0,0]}]},hashA),/duplicate/);
});
test('design layers require both attribution and a named approval, never replace glazing',()=>{
  const interior={sha256:hashB,credit:'Designer supplied',approvedBy:'Named authoriser'};
  assert.deepEqual(readReview({...manifest,layers:{interior}},hashA).layers,{interior});
  assert.throws(()=>readReview({...manifest,layers:{exterior:{...interior,approvedBy:''}}},hashA),/approval/);
  assert(unalteredGlass('Frosted Glass', 'Door'));
  assert(unalteredGlass('Glass purple with pattern', 'Panel'));
  assert(!unalteredGlass('Glass bronze no pattern', 'Pane'));
  assert(!unalteredGlass('Bronze clear', 'Clear glazing'));
});
test('GLB layers cannot fetch external or arbitrary dependencies',async()=>{
  assert(safeLayer(glb({})));
  assert(!safeLayer(glb({images:[{uri:'https://outside.invalid/x.png'}]})));
  assert(!safeLayer(glb({extensionsUsed:['EXT_unsupported']})));
  assert(!safeLayer(glb({buffers:[{uri:'//outside.invalid/x.bin'}]})));
  assert.match(await sha256(glb({})),/^[a-f\d]{64}$/);
});
const file=(slot,name,size)=>({id:slot,name,owner_kind:'source',size,extra:sourceExtra({slot,version:1,by:'Editor'})});
test('plain Model open adds only named project sources, avoids reading unapproved artwork or full drawings',async()=>{
  const files=[file('walk_review','Review.json',500),file('design_interior','Authorised.glb',200),file('design_exterior','Not approved.glb',200),file('drawing_set','Set.pdf',200),file('flythrough','flight.json',200)];
  const read=[];
  const h=await readSiteHandoff({id:'project'},files,async f=>{
    read.push(f.id);
    return new Blob([f.id==='walk_review'?JSON.stringify({...manifest,layers:{interior:{sha256:hashB,credit:'Test',approvedBy:'Test'}}}):'{}']);
  });
  assert.deepEqual(read,['walk_review','design_interior','flythrough']);
  assert.deepEqual(Object.keys(h.files),['walk_review','design_interior']);
  assert.deepEqual(h.flight,{});
  assert.equal(kindOf(files[1]),'site');
  assert.equal(primaryModel({id:'project'},files),null,'overlay GLBs must never become primary model or enter the client share as such');
});
