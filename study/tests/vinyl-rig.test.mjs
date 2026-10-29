import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import * as THREE from '../../assets/vendor/three/three.module.min.js';
import {createVinylRig} from '../../assets/models/vinyl/vinyl-rig-controller.mjs';
import {vinylPose,VINYL_UNITS,disposeVinyl} from '../m/vinyl-asset.js';
import vm from 'node:vm';
import {current} from './vinyl-harness.mjs';
const dir=new URL('../../assets/models/vinyl/',import.meta.url),contract=JSON.parse(readFileSync(new URL('vinyl-rig-contract.json',dir))),bytes=readFileSync(new URL('assembl-vinyl-atelier-web.glb',dir));
const asset=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
function hierarchy(){const nodes=asset.nodes.map(n=>{const o=new THREE.Group();o.name=n.name||'';if(n.matrix)o.applyMatrix4(new THREE.Matrix4().fromArray(n.matrix));else{if(n.translation)o.position.fromArray(n.translation);if(n.rotation)o.quaternion.fromArray(n.rotation);if(n.scale)o.scale.fromArray(n.scale)}return o});asset.nodes.forEach((n,i)=>n.children?.forEach(j=>nodes[i].add(nodes[j])));const root=new THREE.Group();asset.scenes[asset.scene||0].nodes.forEach(i=>root.add(nodes[i]));root.updateMatrixWorld(true);return root}
test('exact GLB, 53 named pivots and metre contract survive export',()=>{
 assert.equal(bytes.length,3488316);assert.equal(createHash('sha256').update(bytes).digest('hex'),'4946dcb27e96fa0bbdc8c4e80c579f9ca226ccddafa3d88aed458513b3aae490');assert.equal(Object.keys(contract.nodes).length,53);assert.equal(asset.nodes.length,132);
 const root=hierarchy();for(const [name,info]of Object.entries(contract.nodes)){const n=root.getObjectByName(name);assert.ok(n,name);assert.ok(n.getWorldPosition(new THREE.Vector3()).distanceTo(new THREE.Vector3(...info.world_pivot_gltf_m))<1e-6,name)}
});
test('integrated scale/reparenting keeps stylus on every playable radius and absolute model poses do not drift',()=>{
 const rig=createVinylRig(hierarchy()),deck=new THREE.Group(),air=new THREE.Group();deck.position.set(-1,.3,0);deck.add(rig.nodes.DECK_ASSEMBLY);rig.nodes.DECK_ASSEMBLY.scale.setScalar(VINYL_UNITS);air.add(rig.nodes.SPEAKER_ROOT);rig.nodes.SPEAKER_ROOT.scale.setScalar(VINYL_UNITS);rig.nodes.SPEAKER_ROOT.position.set(-5.75,0,0);
 const fixed=rig.nodes.TONEARM_YAW.position.toArray(),coneRest=rig.rest.SPEAKER_CONE.position.x;
 for(const format of ['lp','single'])for(let mm=60;mm<=(format==='lp'?146:88);mm++)for(const phase of [0,Math.PI/2,Math.PI*1.5]){
  const s={format,r:mm/1000,rpm:45,ang:123.456,amp:1,phase},before=JSON.stringify(s);
  for(let j=0;j<5;j++)rig.setVisualState(vinylPose(s));deck.updateMatrixWorld(true);air.updateMatrixWorld(true);
  const tip=deck.worldToLocal(rig.nodes.STYLUS.getWorldPosition(new THREE.Vector3()));assert.ok(Math.abs(Math.hypot(tip.x,tip.z)/VINYL_UNITS-s.r)<1e-7);assert.ok(Math.abs(tip.y/VINYL_UNITS-.0614)<1e-7);
  assert.equal(rig.nodes.PLATTER_PIVOT.rotation.y,-s.ang);assert.equal(rig.nodes.MOTOR_PULLEY_PIVOT.rotation.y,-s.ang*6.8);assert.ok(Math.abs((rig.nodes.SPEAKER_CONE.position.x-coneRest)*VINYL_UNITS-.08*Math.sin(phase))<1e-12);
  assert.deepEqual(rig.nodes.TONEARM_YAW.position.toArray(),fixed);assert.equal(JSON.stringify(s),before);assert.equal(rig.nodes.LP_DISC.visible,format==='lp');assert.equal(rig.nodes.SINGLE_DISC.visible,format==='single');
 }
});
test('cutaways preserve fixed drive construction and return to the current record format',()=>{
 const rig=createVinylRig(hierarchy()),fixed=['MOTOR_PULLEY_PIVOT','BELT','BEARING_HOUSING'].map(n=>rig.nodes[n].position.toArray());
 rig.setVisualState(vinylPose({format:'single',r:.088,rpm:45,ang:2,amp:.6,phase:1}));
 rig.setView({assembly:'deck',serviceCutaway:true});assert.equal(rig.nodes.SPEAKER_ROOT.visible,false);for(const n of ['LP_DISC','SINGLE_DISC','DECK_TOP','MAT','PLATTER'])assert.equal(rig.nodes[n].visible,false);
 assert.deepEqual(['MOTOR_PULLEY_PIVOT','BELT','BEARING_HOUSING'].map(n=>rig.nodes[n].position.toArray()),fixed);
 rig.setView({assembly:'speaker',speakerRearOpen:true});assert.equal(rig.nodes.DECK_ASSEMBLY.visible,false);assert.equal(rig.nodes.SPEAKER_BACK.visible,false);
 rig.setView({assembly:'deck'});assert.equal(rig.nodes.SINGLE_DISC.visible,true);assert.equal(rig.nodes.LP_DISC.visible,false);
});
test('resource cleanup deduplicates shared materials/textures across reparented roots',()=>{
 const a=new THREE.Group(),b=new THREE.Group(),geo=new THREE.BoxGeometry(),map=new THREE.Texture(),mat=new THREE.MeshBasicMaterial({map});let g=0,m=0,t=0;geo.addEventListener('dispose',()=>g++);mat.addEventListener('dispose',()=>m++);map.addEventListener('dispose',()=>t++);a.add(new THREE.Mesh(geo,mat));b.add(new THREE.Mesh(geo,mat));disposeVinyl([a,b]);assert.deepEqual([g,m,t],[1,1,1]);
});

test('counterweight follows the arm around a fixed pivot, matching the inspection explanation',()=>{
 const root=hierarchy(),rig=createVinylRig(root),point=name=>rig.nodes[name].getWorldPosition(new THREE.Vector3());
 rig.setVisualState(vinylPose({format:'lp',r:.146,rpm:100/3,ang:0,amp:.6,phase:0}));root.updateMatrixWorld(true);
 const pivot=point('TONEARM_YAW'),weight=point('COUNTERWEIGHT'),radius=weight.distanceTo(pivot);
 rig.setVisualState(vinylPose({format:'lp',r:.06,rpm:100/3,ang:0,amp:.6,phase:0}));root.updateMatrixWorld(true);
 assert.ok(point('TONEARM_YAW').distanceTo(pivot)<1e-12);
 assert.ok(point('COUNTERWEIGHT').distanceTo(weight)>.005);
 assert.ok(Math.abs(point('COUNTERWEIGHT').distanceTo(pivot)-radius)<1e-12);
 assert.match(current,/The pivot stays in place; the counterweight moves with the arm/);
 assert.match(current,/Balance forces are not simulated/);
 assert.doesNotMatch(current,/pivot and counterweight stay fixed/);
});

test('portrait deck framing uses canvas height without clipping the physical mechanism; other views keep their camera',()=>{
 const portrait=vm.runInNewContext('('+current.slice(current.indexOf('function vinylPortraitView('),current.indexOf('function vinyl3d('))+')'),root=hierarchy(),rig=createVinylRig(root),center=[-3.6,0,-.4];
 const deck=new THREE.Group();deck.position.set(center[0]-1,.3,center[2]);deck.add(rig.nodes.DECK_ASSEMBLY);rig.nodes.DECK_ASSEMBLY.scale.setScalar(VINYL_UNITS);
 const frame=(view,aspect)=>portrait(view,aspect,center);
 for(const view of ['deck','formats','arm','drive'])assert.equal(frame(view,1.8),null);
 for(const view of ['arm','speaker','air','groove','pitch'])assert.equal(frame(view,.64),null);
 // Project the real GLB primitive bounds, excluding the decorative supporting base.
 function points(names){const result=[];for(const name of names)rig.nodes[name].traverse(o=>{const n=asset.nodes.find(n=>n.name===o.name);if(n?.mesh===undefined)return;for(const p of asset.meshes[n.mesh].primitives){const a=asset.accessors[p.attributes.POSITION];for(const x of [a.min[0],a.max[0]])for(const y of [a.min[1],a.max[1]])for(const z of [a.min[2],a.max[2]])result.push(o.localToWorld(new THREE.Vector3(x,y,z)))}});return result}
 for(const aspect of [260/410,315/410])for(const view of ['deck','drive','formats'])for(const radius of view==='formats'?[.06,.088]:[.06,.088,.146]){
  rig.setVisualState(vinylPose({format:view==='formats'?'single':'lp',r:radius,rpm:45,ang:0,amp:.6,phase:0}));deck.updateMatrixWorld(true);
  const f=frame(view,aspect),camera=new THREE.PerspectiveCamera(32,aspect,.05,400);camera.position.fromArray(f.position);camera.lookAt(...f.target);camera.updateMatrixWorld(true);
  const names=view==='drive'?['BELT','MOTOR_PULLEY_PIVOT','DRIVE_PULLEY','BEARING_HOUSING']:['DECK_SHELL','PLATTER','TONEARM','COUNTERWEIGHT','HEADSHELL'];
  const physical=points(names);
  // The retained format comparison bars/crate sit beside the deck in scene units.
  if(view==='formats')for(const x of [2.9,4.9])for(const y of [.3,1.65])for(const z of [-2.2,2.2])physical.push(new THREE.Vector3(center[0]+x,y,center[2]+z));
  const projected=physical.map(p=>p.project(camera)),xs=projected.map(p=>p.x),ys=projected.map(p=>p.y);
  const bounds={left:Math.min(...xs),right:Math.max(...xs),bottom:Math.min(...ys),top:Math.max(...ys)};
  if(radius===.088)console.log('portrait projection',view,aspect,bounds);
  assert.ok(bounds.left>-.98&&bounds.right<.98,JSON.stringify({view,aspect,bounds}));
  assert.ok(bounds.bottom>-.95&&bounds.top<.95,JSON.stringify({view,aspect,bounds}));
  assert.ok((bounds.top-bounds.bottom)/2>(view==='drive'?.4:.55),JSON.stringify({view,aspect,bounds}));
 }
});
