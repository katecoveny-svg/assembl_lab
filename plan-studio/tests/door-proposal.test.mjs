import test from "node:test";
import assert from "node:assert/strict";
import { demoProject, diffModels, snapshot } from "../js/model.js";
import { toIFC } from "../js/exports.js";
import { applyDoorMove, distanceMm, doorModelStamp, proposeDoorMove, undoDoorMove, wallPreviewSvg } from "../js/door-proposal.js";

const D=p=>p.openings.find(o=>o.id==="D4");
const fixed=new Date("2026-11-25T00:00:00Z");

function stepDoor(doc,id) {
  const entities=new Map(doc.split("\n").flatMap(s=>{const m=s.match(/^(#\d+)=(.+);$/);return m?[[m[1],m[2]]]:[];}));
  const door=[...entities.values()].find(s=>s.startsWith("IFCDOOR(")&&s.includes(",'"+id+"',"));
  const refs=s=>s.match(/#\d+/g)||[];
  const guid=door.match(/IFCDOOR\('([^']+)'/)[1];
  const fillPlacement=entities.get(refs(door)[1]);
  const voidPlacement=entities.get(refs(fillPlacement)[0]);
  const voidAx3=entities.get(refs(voidPlacement)[1]);
  const edge=Number(entities.get(refs(voidAx3)[0]).match(/\(\(([^,]+)/)[1]);
  return {guid,edge};
}
test("m and mm command units are explicit and bounded to integer mm",()=>{
  assert.equal(distanceMm("7.500","m"),7500);assert.equal(distanceMm("7500","mm"),7500);
  for(const val of ["","5e3","-3","9x","Infinity",".0001"])assert.equal(distanceMm(val,"m"),null);
  assert.equal(distanceMm("10","in"),null);
});
test("preview, approve, edit diff and undo affect just the chosen door position",()=>{
  const p=demoProject(), before=doorModelStamp(p), original=toIFC(p,fixed), draft=proposeDoorMove(p,"D4",7500);
  assert.equal(doorModelStamp(p),before);
  assert.equal(D(draft.before).at,7000);assert.equal(D(draft.after).at,7500);
  assert.match(wallPreviewSvg(draft.after,draft.edit,"After"),/D4 · 7500 mm/);
  assert.equal(toIFC(p,fixed),original);
  const receipt=applyDoorMove(p,draft);
  assert.equal(D(p).at,7500);assert.equal(D(p).position_ev.src,"user");assert.deepEqual(D(p).ev,D(draft.before).ev);
  assert.deepEqual(diffModels(draft.before,p).changed,[{id:"D4",key:"openings",kind:"changed",fields:["at"]}]);
  const a=stepDoor(original,"D4"),next=toIFC(p,fixed),b=stepDoor(next,"D4");
  assert.equal(a.guid,b.guid);assert.equal(a.edge,6.1);assert.equal(b.edge,6.6);
  assert.match(next,/PositionSource/);
  undoDoorMove(p,receipt);assert.equal(doorModelStamp(p),before);assert.equal(toIFC(p,fixed),original);
});
test("fit refuses wall ends, windows, existing openings, same position and wall junctions",()=>{
  const p=demoProject();
  assert.throws(()=>proposeDoorMove(p,"D4",600),/usable wall/);
  assert.throws(()=>proposeDoorMove(p,"N3",2100),/real door/);
  assert.throws(()=>proposeDoorMove(p,"D4",2600),/opening N3/);
  assert.throws(()=>proposeDoorMove(p,"D4",7000),/new position/);
  assert.throws(()=>proposeDoorMove(p,"D4",16000),/junction/);
});
test("approval is revision locked and revalidated; undo cannot overwrite a later edit",()=>{
  const p=demoProject();const old=proposeDoorMove(p,"D4",7500);
  p.revisions.push({rev:"A",model:snapshot(p)});
  assert.throws(()=>applyDoorMove(p,old),/revision changed/);
  const fresh=proposeDoorMove(p,"D4",7500);
  assert.throws(()=>applyDoorMove(p,{...fresh,edit:{...fresh.edit,to:2600}}),/opening N3/);
  const undo=applyDoorMove(p,fresh);D(p).w+=40;
  assert.throws(()=>undoDoorMove(p,undo),/cannot overwrite/);
  assert.equal(D(p).at,7500);
});
