import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import * as THREE from '../../assets/vendor/three/three.module.min.js';
import {createPhoneRig} from '../../assets/models/phone/phone-rig-controller.mjs';
import {applyPhonePose,stationFor,disposePhone} from '../m/phone-asset.js';
const dir=new URL('../../assets/models/phone/',import.meta.url),contract=JSON.parse(readFileSync(new URL('phone-rig-contract.json',dir))),bytes=readFileSync(new URL('assembl-phone-atelier-web.glb',dir));
const asset=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
function hierarchy(){const nodes=asset.nodes.map(n=>{const o=new THREE.Group();o.name=n.name||'';if(n.matrix)o.applyMatrix4(new THREE.Matrix4().fromArray(n.matrix));else{if(n.translation)o.position.fromArray(n.translation);if(n.rotation)o.quaternion.fromArray(n.rotation);if(n.scale)o.scale.fromArray(n.scale)}return o});asset.nodes.forEach((n,i)=>n.children?.forEach(j=>nodes[i].add(nodes[j])));const root=new THREE.Group();asset.scenes[asset.scene||0].nodes.forEach(i=>root.add(nodes[i]));root.updateMatrixWorld(true);return root}
test('delivered GLB bytes, 95 nodes and metre pivots match contract; only one 30x conversion',()=>{
 assert.equal(bytes.length,1404456);assert.equal(createHash('sha256').update(bytes).digest('hex'),contract.export.sha256);assert.equal(Object.keys(contract.nodes).length,95);
 const root=hierarchy();for(const [name,info]of Object.entries(contract.nodes)){const n=root.getObjectByName(name);assert.ok(n,name);assert.ok(n.getWorldPosition(new THREE.Vector3()).distanceTo(new THREE.Vector3(...info.world_pivot_gltf_m))<1e-6,name)}
 root.scale.setScalar(30);assert.ok(Math.abs(root.getObjectByName('CHARGE_STATION').getWorldPosition(new THREE.Vector3()).x+4.6)<1e-5);
 for(const p of Object.values(contract.paths))assert.ok(root.getObjectByName(p.parent));
});
test('absolute snapshots preserve fixed battery casing/plates and true input with separate 5x display gap',()=>{
 const root=hierarchy(),rig=createPhoneRig(root),fixed=['PHONE_BATTERY','PLATE_POS','PLATE_NEG'].map(n=>rig.nodes[n].scale.toArray());
 for(const gapMm of [0,2,8])for(const fraction of [0,.2,.8,1]){
  const v={explode:.75,indicatorFraction:fraction,receiverTurns:20,gapMm},before=JSON.stringify(v);
  for(let n=0;n<100;n++)applyPhonePose(rig,v);
  assert.equal(JSON.stringify(v),before);assert.equal(rig.nodes.QI_PHONE_ROOT.position.y,rig.rest.QI_PHONE_ROOT.position.y+gapMm/1000*5);
  assert.deepEqual(['PHONE_BATTERY','PLATE_POS','PLATE_NEG'].map(n=>rig.nodes[n].scale.toArray()),fixed);assert.equal(rig.nodes.BATTERY_INDICATOR.visible,fraction>0);
  assert.equal(rig.nodes.PHONE_BATTERY.position.y,rig.rest.PHONE_BATTERY.position.y+.025*.75);
 }
});
test('all 5–20 turn settings and one-station topic views preserve coaxial coils and bounded batches',()=>{
 const root=hierarchy(),rig=createPhoneRig(root);
 for(let N=5;N<=20;N++){applyPhonePose(rig,{receiverTurns:N,gapMm:8});root.updateMatrixWorld(true);assert.equal(Array.from({length:20},(_,i)=>rig.nodes['QI_TURN_'+String(i+1).padStart(2,'0')].visible).filter(Boolean).length,N);
 const a=rig.nodes.QI_TX_AXIS.getWorldPosition(new THREE.Vector3()),b=rig.nodes.QI_RX_AXIS.getWorldPosition(new THREE.Vector3());assert.ok(Math.abs(a.x-b.x)<1e-6&&Math.abs(a.z-b.z)<1e-6)}
 for(const k of ['charge','energy','fast','ccv','internal','circuit','wireless','capacitor','test']){const station=stationFor(k);rig.setView({station,wirelessCutaway:true});assert.deepEqual(Object.keys(contract.export.active_station_budgets).filter(n=>rig.nodes[n].visible),[station]);assert.ok(contract.export.active_station_budgets[station].mesh_batches<=80)}
});
test('resource disposal is deduplicated for shared GPU objects',()=>{
 const root=new THREE.Group(),geo=new THREE.BoxGeometry(),map=new THREE.Texture(),mat=new THREE.MeshBasicMaterial({map});let g=0,m=0,t=0;geo.addEventListener('dispose',()=>g++);mat.addEventListener('dispose',()=>m++);map.addEventListener('dispose',()=>t++);root.add(new THREE.Mesh(geo,mat),new THREE.Mesh(geo,mat));disposePhone(root);assert.deepEqual([g,m,t],[1,1,1]);
});
