import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from '../../assets/vendor/three/three.module.min.js';
import {createClawMotion} from '../m/claw-motion.js';
const bytes=readFileSync(new URL('../../assets/models/claw/claw-atelier.glb',import.meta.url));
const asset=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
// Reconstruct the actual GLB hierarchy and mesh accessor bounds without a browser,
// texture loaders or an extra dependency. Browser QA separately loads GLTFLoader.
function hierarchy(){
 const nodes=asset.nodes.map(n=>{const o=new THREE.Group();o.name=n.name||'';o.userData={...n.extras};if(n.matrix)o.applyMatrix4(new THREE.Matrix4().fromArray(n.matrix));else{if(n.translation)o.position.fromArray(n.translation);if(n.rotation)o.quaternion.fromArray(n.rotation);if(n.scale)o.scale.fromArray(n.scale)}
  if(n.mesh!==undefined){let box=new THREE.Box3();for(const p of asset.meshes[n.mesh].primitives){const a=asset.accessors[p.attributes.POSITION];box.union(new THREE.Box3(new THREE.Vector3().fromArray(a.min),new THREE.Vector3().fromArray(a.max)))}o.userData.testBounds=box}
  return o});
 asset.nodes.forEach((n,i)=>n.children?.forEach(k=>nodes[i].add(nodes[k])));const scene=new THREE.Group();asset.scenes[asset.scene||0].nodes.forEach(i=>scene.add(nodes[i]));scene.updateMatrixWorld(true);return scene;
}
function bounds(root){const b=new THREE.Box3();root.traverse(o=>{if(o.userData.testBounds)b.union(o.userData.testBounds.clone().applyMatrix4(o.matrixWorld))});return b}
function count(root){let n=0;root.traverse(()=>n++);return n}
test('actual v2 hierarchy follows sampled win, drop and miss timelines inside travel envelope',()=>{
 const root=hierarchy(),motion=createClawMotion(root,THREE),countBefore=count(root);
 for(const outcome of [{grab:false,win:false},{grab:true,win:false},{grab:true,win:true}])for(let i=0;i<=120;i++){
   motion.update({anim:{t:i/100,...outcome},plays:1,lastWin:outcome.win});const p=motion.inspect();assert.ok(p.pose.drop>=0&&p.pose.drop<=.30);assert.ok(p.pose.x>=-.35&&p.pose.x<=.33);assert.ok(p.pose.depth>=-.27&&p.pose.depth<=.24);assert.ok(p.linkLengths.every(Number.isFinite));
   const piston=bounds(root.getObjectByName('ACTUATOR_SLIDER')),capsule=bounds(root.getObjectByName('HELD_CAPSULE'));
   assert.ok(piston.min.y-capsule.max.y>.017,'piston stays clear of the held capsule');
   for(let k=0;k<3;k++){const finger=bounds(root.getObjectByName(`FINGER_${k}_SHOULDER`));assert.ok(finger.min.x>-.55&&finger.max.x<.55);assert.ok(finger.max.z<.438&&finger.min.z>-.438)}
 }
 assert.equal(count(root),countBefore,'reuse one shared-resource released capsule');
 motion.update({anim:{t:.5,grab:true,win:true},plays:1,lastWin:true});assert.equal(motion.inspect().held,true);assert.equal(motion.inspect().loose,false);
 motion.update({anim:{t:.8,grab:true,win:false},plays:1,lastWin:false});assert.equal(motion.inspect().held,false);assert.equal(motion.inspect().loose,true);
 motion.update({anim:null,plays:0,lastWin:null});assert.equal(motion.inspect().pose.drop,0);assert.equal(motion.inspect().pose.x,.125);assert.ok(Math.abs(motion.inspect().loosePosition[1]-1.02)<1e-6);
});
test('reduced motion stays static and never changes the model-owned result',()=>{
 const root=hierarchy(),motion=createClawMotion(root,THREE),state={anim:{t:.5,grab:true,win:true},plays:1,lastWin:true};const original=JSON.stringify(state);
 motion.update(state,true);assert.equal(motion.inspect().pose.drop,0);assert.equal(motion.inspect().held,false);assert.equal(JSON.stringify(state),original);
});
