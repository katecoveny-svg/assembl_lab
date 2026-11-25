import test from "node:test";
import assert from "node:assert/strict";
import {demoProject,snapshot} from "../js/model.js";
import {toIFC} from "../js/exports.js";
import {frame,empty,setArea,paint,allowed,importPlanting,MAX_PLANTS,ring} from "../js/planting/model.js";
const R=(x,z,a,b)=>[[x,z],[a,z],[a,b],[x,b]];
test("fictional sample has design metres; uncalibrated vector plans are blocked until written-span verification",()=>{
 const p=demoProject();assert.equal(frame(p).calibrated,true);
 p.meta.status="Imported · check every element";p.provenance={scale_check:{status:"user-scale"}};
 assert.equal(frame(p).calibrated,false);
 p.provenance.scale_check.status="user-calibrated";
 assert.equal(frame(p).calibrated,true);
});
test("polygon limits and proposed bed do not change any architectural model data",()=>{
 const p=demoProject(), f=frame(p), a=snapshot(p), ifc=toIFC(p,new Date(0));
 assert.throws(()=>ring(R(-60,0,-59,1),f),/32 m/);
 assert.throws(()=>ring([[0,0],[5,8],[0,5],[8,0]],f),/cross/);
 const model=setArea(empty(f),f,"bed",R(-5,-9,6,4)), tracks=[[-3,-6],[-1,-5],[3,-3]];
 const planted=paint(model,f,tracks,{species:"harakeke",radius:2});
 assert(planted.plants.length>3);
 assert(planted.plants.every(p=>allowed(planted,f,[p.x,p.z],p.species)));
 assert(planted.plants.every(p=>!(p.x>=-.2&&p.z<=.2)));
 assert.deepEqual(snapshot(p),a);assert.equal(toIFC(p,new Date(0)),ifc);
});
test("metric sweep is deterministic with differently spaced pointer events, prevents duplicates and erases by area",()=>{
 const f=frame(demoProject()), src=setArea(empty(f),f,"bed",R(-6,-12,-1,-2)), opt={species:"toetoe",radius:1.9};
 const a=paint(src,f,[[-4,-10],[-3,-4]],opt);
 assert.deepEqual(a,paint(src,f,[[-4,-10],[-3.5,-7],[-3,-4]],opt));
 assert(a.plants.length>5&&a.plants.length<MAX_PLANTS);
 const cut=setArea(a,f,"exclude",R(-5,-8,-2,-7));
 assert(cut.plants.length<a.plants.length);
 assert(cut.plants.every(p=>allowed(cut,f,[p.x,p.z],p.species)));
 const erase=paint(cut,f,[[-4,-10],[-3,-4]],{...opt,erase:true});
 assert(erase.plants.length<cut.plants.length);
 assert.equal(paint(a,f,[],opt),a);
});
test("detached planting JSON only fits matching calibrated frame and can't import an invented collision",()=>{
 const p=demoProject(),f=frame(p), base=setArea(empty(f),f,"bed",R(-6,-12,-1,-2)), saved=paint(base,f,[[-4,-9],[-3,-5]],{species:"ti-kouka",radius:2});
 assert.deepEqual(importPlanting(JSON.parse(JSON.stringify(saved)),f),saved);
 assert.throws(()=>importPlanting({...saved,plants:[{...saved.plants[0],x:5,z:-1}]},f),/outside/);
 assert.throws(()=>importPlanting(saved,{...f,key:"other"}),/does not match/);
});
