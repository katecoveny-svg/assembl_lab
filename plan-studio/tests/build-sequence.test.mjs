import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {calibration,depthOf,fromPdf,mmPerPoint,toViewport,twinEvidence,wallSpan} from "../js/build-sequence.js";
import {modelFromDrawing,toReal} from "../js/read.js";
const read = JSON.parse(fs.readFileSync(new URL("./fixtures/demo-plan.raw.json",import.meta.url)));
const P=modelFromDrawing(toReal(read,100)), k=mmPerPoint(100);
test("registered drawing and solid share corners and both edges of the first opening, not just the building centre",()=>{
 const w=P.walls[0], o=P.openings[0]; assert.deepEqual([w.id,o.wall,o.id,o.at,o.w],["W1","W1","N1",2600,2400]);
 for (const [x,y] of [w.a,w.b,[o.at-o.w/2,0],[o.at+o.w/2,0]]) {
   const a=(x+P.origin[0])/k,b=(y+P.origin[1])/k;
   const v=fromPdf([a,b],P.origin,100);
   assert(Math.abs(v[0]-x/1000)<1e-9 && Math.abs(v[1]+y/1000)<1e-9);
   // Non-zero crop origin and a rotated sheet.
   assert.deepEqual(toViewport([x,y],P.origin,100,[0,1,1,0,-20,-10]),[b-20,a-10]);
 }
 assert.equal(w.height_state,"assumed");assert.equal(o.height_state,"assumed");assert.equal(P.roof.state,"assumed");
});
test("known dimension takes priority over nominal scale; invalid/zero span never produces geometry",()=>{
 assert.equal(calibration(100,P.walls[0],18000),75);assert.equal(calibration(100,P.walls[0],0),null);
 assert.equal(calibration(100,{a:[0,0],b:[0,0]},1200),null);
 assert.equal(modelFromDrawing(toReal(read,75)).walls[0].b[0],18000);
});
test("build uses semantic groups on the model with unclassified detailing shown only at finishes",()=>{
 for(const [name,n] of [["SLAB",1],["WALLS",2],["OPENINGS",3],["ROOF",4],["",5]])assert.equal(depthOf({name,userData:{}}),n);
});

test("reviewed twins keep their separate schema and source notes",()=>{
  const p=JSON.parse(fs.readFileSync(new URL("../twins/src/twin/plan16a.json",import.meta.url)));
  const before=JSON.stringify(p), notes=twinEvidence(p);
  assert.equal(notes.buildings,2);assert(notes.written>0 && notes.scaled>0);assert(notes.openings>0);
  assert.equal(JSON.stringify(p),before);assert.equal(twinEvidence(P),null);
});

test("folio dimensions are actual wall centreline extents in metres",()=>{
  assert.deepEqual(wallSpan(P.walls),[24,15]);
  assert.deepEqual(wallSpan([{a:[-1000,-2000],b:[1000,5000]}]),[2,7]);
  assert.equal(wallSpan([]),null);
});
