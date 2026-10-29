import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import * as THREE from '../../assets/vendor/three/three.module.min.js';
import {createVinylRig} from '../../assets/models/vinyl/vinyl-rig-controller.mjs';
import {vinylPose,VINYL_UNITS,disposeVinyl} from '../m/vinyl-asset.js';
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
