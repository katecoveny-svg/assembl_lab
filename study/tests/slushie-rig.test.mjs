import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from '../../assets/vendor/three/three.module.min.js';
import {createSlushieRig} from '../../assets/models/slushie/slushie-rig-controller.mjs';
import {insideDrink} from '../m/slushie-asset.js';
const dir=new URL('../../assets/models/slushie/',import.meta.url),contract=JSON.parse(readFileSync(new URL('slushie-rig-contract.json',dir))),bytes=readFileSync(new URL('slushie-atelier.glb',dir));
const asset=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
function hierarchy(){
 const nodes=asset.nodes.map(n=>{const o=n.mesh===undefined?new THREE.Group():new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshStandardMaterial());o.name=n.name||'';o.userData={...n.extras};if(n.matrix)o.applyMatrix4(new THREE.Matrix4().fromArray(n.matrix));else{if(n.translation)o.position.fromArray(n.translation);if(n.rotation)o.quaternion.fromArray(n.rotation);if(n.scale)o.scale.fromArray(n.scale)}return o});
 asset.nodes.forEach((n,i)=>n.children?.forEach(j=>nodes[i].add(nodes[j])));const root=new THREE.Group();asset.scenes[asset.scene||0].nodes.forEach(i=>root.add(nodes[i]));root.updateMatrixWorld(true);return root;
}
test('GLB matches every contracted node and metre-space pivot, with a single 25x scene conversion',()=>{
 const root=hierarchy();for(const [name,info] of Object.entries(contract.nodes)){const o=root.getObjectByName(name);assert.ok(o,name);const p=o.getWorldPosition(new THREE.Vector3());assert.ok(p.distanceTo(new THREE.Vector3(...info.world_pivot_gltf_m))<1e-6,name)}
 root.scale.setScalar(25);root.updateMatrixWorld(true);assert.ok(Math.abs(root.getObjectByName('AUGER_PIVOT').getWorldPosition(new THREE.Vector3()).y-5.9)<1e-5);
 assert.equal(bytes.length,2323864);assert.equal(contract.coordinates.legacy_scene_units_per_metre,25);
});
test('full snapshot sets rotations without drift; blockage never overrides the supplied fan angle',()=>{
 const root=hierarchy(),rig=createSlushieRig(root);for(let i=0;i<100;i++){rig.setVisualState({augerAngle:1.2,fanAngle:7,ventBlocked:true});assert.equal(rig.nodes.AUGER_PIVOT.rotation.z,1.2);assert.equal(rig.nodes.AUGER_GEAR.rotation.z,1.2);assert.equal(rig.nodes.MOTOR_PINION.rotation.z,-2.76);assert.equal(rig.nodes.FAN_PIVOT.rotation.z,7)}
 assert.equal(rig.nodes.VENT_OBSTRUCTION.visible,true);rig.setVisualState({fanAngle:8,ventBlocked:false});assert.equal(rig.nodes.FAN_PIVOT.rotation.z,8);assert.equal(rig.nodes.AUGER_PIVOT.rotation.z,0);
});
test('shell display clamp and cutaway change only geometry; machinery remains fixed',()=>{
 const root=hierarchy(),rig=createSlushieRig(root),p=rig.nodes.COMPRESSOR.position.clone();rig.setVisualState({shellVisible:true,shellRadialScale:99,shellAxialScale:99});assert.deepEqual(rig.nodes.ICE_SHELL.scale.toArray(),[1.98,1.98,1.04]);rig.setView({cutaway:true,mechanism:true,showCup:false});assert.equal(rig.nodes.SERVICE_PANEL.visible,false);assert.equal(rig.nodes.DRINK_VOLUME.visible,false);assert.equal(rig.nodes.SERVING_CUP.visible,false);assert.ok(rig.nodes.COMPRESSOR.position.equals(p));rig.setView();assert.equal(rig.nodes.SERVICE_PANEL.visible,true);assert.equal(rig.nodes.DRINK_VOLUME.visible,true);
});
test('crystal guard excludes rounded tank corners, fill-plane overshoot and the fixed drum',()=>{
 const r=contract.particle_region;assert.equal(insideDrink([.04,.236,.015],.001,r),true);assert.equal(insideDrink([.04,.236,.14],.001,r),false);assert.equal(insideDrink([0,.263,.1],.003,r),false);assert.equal(insideDrink([0,.236,.015],.001,r),false);assert.equal(insideDrink([0,.236,.11],.001,r),true);
});
test('every original lesson part has an exported hotspot and pickable geometry',()=>{
 for(const key of ['comp','cond','fan','valve','drum','aug','tap','probe','motor']){assert.ok(Object.entries(contract.hotspots).some(([name,n])=>n.extras.lesson_part_id===key),key);assert.ok(asset.nodes.some(n=>n.extras?.lesson_part_id===key&&!n.name.startsWith('HOTSPOT')),key)}
});
