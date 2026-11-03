import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import * as THREE from '../../assets/vendor/three/three.module.min.js';
import {createLinesRig,levelMetres,checkContract,METRES_PER_LITRE} from '../../assets/models/lines/lines-rig-controller.mjs';
import {prepareBrowserMaterials} from '../m/lines-asset.js';
const dir=new URL('../../assets/models/lines/',import.meta.url),contract=JSON.parse(readFileSync(new URL('lines-rig-contract.json',dir))),bytes=readFileSync(new URL('lines-tanks.glb',dir));
const asset=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
// Rebuild the real GLB node hierarchy (transforms, names, extras, materials by name) without a browser.
function hierarchy(){
 const mats=(asset.materials||[]).map(m=>{const x=new THREE.MeshPhysicalMaterial({name:m.name});x.transmission=m.extensions?.KHR_materials_transmission?.transmissionFactor||0;return x});
 const nodes=asset.nodes.map(n=>{let o;
  if(n.mesh===undefined)o=new THREE.Group();
  else{const prims=asset.meshes[n.mesh].primitives;o=new THREE.Group();prims.forEach(p=>{const a=asset.accessors[p.attributes.POSITION],g=new THREE.BufferGeometry();
    g.boundingBox=new THREE.Box3(new THREE.Vector3(...a.min),new THREE.Vector3(...a.max));const mesh=new THREE.Mesh(g,mats[p.material]);o.add(mesh)});
    if(prims.length===1){const only=o.children[0];o=only}}
  o.name=n.name||'';o.userData={...n.extras};if(n.translation)o.position.fromArray(n.translation);if(n.rotation)o.quaternion.fromArray(n.rotation);if(n.scale)o.scale.fromArray(n.scale);return o});
 asset.nodes.forEach((n,i)=>n.children?.forEach(j=>nodes[i].add(nodes[j])));const root=new THREE.Group();asset.scenes[asset.scene||0].nodes.forEach(i=>root.add(nodes[i]));root.updateMatrixWorld(true);return root;
}
// the existing lesson, run exactly as study/tests/lesson-models.test.mjs runs it
function lesson(){
 const root=new URL('../',import.meta.url);
 const context=vm.createContext({console,URL,Math,Date,performance:{now:()=>0},setTimeout:()=>0,clearTimeout(){},addEventListener(){},location:{pathname:'/study/m/lines.html',href:'http://localhost/',search:''},document:{currentScript:null,documentElement:{setAttribute(){}},querySelector:()=>true},window:{}});
 vm.runInContext(readFileSync(new URL('kit.js',root),'utf8'),context);context.StudyKit=context.window.StudyKit;let cfg;
 context.StudyKit.mount=c=>{cfg=c;return{state:c.state,step:c.steps.find(x=>x.k===c.lesson.step),redraw(){}}};
 vm.runInContext(readFileSync(new URL('m/lines.js',root),'utf8'),context);
 const {lesson:L,state:s}=cfg,st=cfg.steps.find(x=>x.k===L.step),api={state:s,step:st},e={A:null,B:null};st.onStep?.(s,st,api);
 return {cfg,s,prepare:k=>L.prepare(k,s,api,e),capture:k=>L.capture(k,s,api,e)};
}
const waterTop=(rig,k)=>{const w=rig.tanks[k].water;w.updateWorldMatrix(true,false);return new THREE.Vector3(0,w.geometry.boundingBox.max.y,0).applyMatrix4(w.matrixWorld).y};

test('budget and contract: metres, assembl.lines.v1, every contracted node at its exported pivot',()=>{
 assert.ok(bytes.length<=contract.budget.glb_bytes_max,`GLB ${bytes.length} B`);
 let tris=0,prims=0;for(const m of asset.meshes)for(const p of m.primitives){prims++;tris+=asset.accessors[p.indices].count/3}
 assert.ok(tris<=contract.budget.triangles_max,`${tris} triangles`);assert.ok(prims<=contract.budget.primitives_max,`${prims} primitives`);
 assert.equal((asset.textures||[]).length,0);assert.equal(asset.asset.generator.startsWith('Khronos glTF Blender I/O'),true);
 const root=hierarchy();
 for(const name of contract.required_nodes)assert.ok(root.getObjectByName(name),name);
 for(const [name,info] of Object.entries(contract.nodes)){const o=root.getObjectByName(name);assert.ok(o,name);assert.ok(o.getWorldPosition(new THREE.Vector3()).distanceTo(new THREE.Vector3(...info.world_pivot_gltf_m))<1e-5,name)}
 assert.equal(contract.coordinates.scene_units_per_metre,3);assert.equal(contract.level_mapping.metres_per_litre,0.01);
});
test('the loader refuses any other contract or unit mapping',()=>{
 assert.throws(()=>checkContract({...contract,contract:'assembl.lines.v0'}),/Unsupported/);
 assert.throws(()=>checkContract({...contract,level_mapping:{...contract.level_mapping,metres_per_litre:.02}}),/units/);
 const root=hierarchy();root.getObjectByName('TANK_B_WATER').name='renamed';assert.throws(()=>createLinesRig(root,contract),/Missing lines rig node: TANK_B_WATER/);
});
test('water pivot sits on the tank floor and authored height is exactly 100 L',()=>{
 const root=hierarchy(),w=root.getObjectByName('TANK_A_WATER');
 assert.ok(Math.abs(w.position.y-contract.level_mapping.floor_y_gltf_m)<1e-6);assert.ok(Math.abs(w.geometry.boundingBox.min.y)<1e-6);assert.ok(Math.abs(w.geometry.boundingBox.max.y-1)<1e-6);
 const [x0,,z0]=w.geometry.boundingBox.min.toArray(),[x1,,z1]=w.geometry.boundingBox.max.toArray();
 assert.ok(Math.abs((x1-x0)*(z1-z0)*1000/100*METRES_PER_LITRE*100-1)<0.01,'plan area gives 1 L per 10 mm within 1 %');
});
test('lesson investigate case: the tested 40 L and 70 L drive the water to 0.40 m and 0.70 m (1.2 and 2.1 scene units)',()=>{
 const m=lesson();m.prepare('A');const a=m.capture('A');m.prepare('B');const b=m.capture('B');
 assert.equal(a.raw.level,40);assert.equal(b.raw.level,70); // the existing model, unchanged
 const root=hierarchy(),rig=createLinesRig(root,contract),floor=contract.level_mapping.floor_y_gltf_m;
 for(const [k,level] of [['A',a.raw.level],['B',b.raw.level]]){
  const r=rig.setTank(k,{litres:level,rate:k==='A'?3:6,filling:false});root.updateMatrixWorld(true);
  assert.ok(Math.abs(waterTop(rig,k)-(floor+level*.01))<1e-6,`${k} top`);assert.equal(r.level_m,levelMetres(level));
  const tc=contract.level_mapping.tested_cases.find(c=>c.litres===level);assert.ok(Math.abs(waterTop(rig,k)-tc.water_top_y_gltf_m)<1e-6);
  assert.ok(Math.abs(rig.tanks[k].water.scale.y-tc.water_node_scale_y)<1e-12);
  // one uniform scene scale of 3 (as the lesson's drawn tank: 100 L = 3.0 units)
  const holder=new THREE.Group();holder.scale.setScalar(3);holder.add(rig.tanks[k].root);holder.updateMatrixWorld(true);
  assert.ok(Math.abs(waterTop(rig,k)-3*floor-tc.scene_units_above_floor)<1e-5);
 }
 assert.ok(Math.abs(levelMetres(40)-.4)<1e-12);assert.ok(Math.abs(levelMetres(70)-.7)<1e-12);
});
test('adapter is a pure snapshot: display clamp only, no drift, streams follow the lesson-supplied conditions',()=>{
 const root=hierarchy(),rig=createLinesRig(root,contract),T=rig.tanks.A,floor=contract.level_mapping.floor_y_gltf_m;
 for(let i=0;i<50;i++)rig.setTank('A',{litres:40,rate:3,filling:true});
 assert.equal(T.water.scale.y,.4);assert.equal(T.inlet.visible,true);assert.equal(T.drain.visible,false);
 const nozzle=T.nozzleY;assert.ok(Math.abs(T.inlet.scale.y-(nozzle-(floor+.4))/(nozzle-floor))<1e-12,'stream ends at the surface');
 rig.setTank('A',{litres:140,rate:3,filling:false});assert.equal(T.water.scale.y,1);assert.equal(T.inlet.visible,false);
 rig.setTank('A',{litres:-12,rate:-4,draining:false});assert.equal(T.water.visible,false);assert.ok(Math.abs(T.float.position.y-(floor+.023))<1e-12);
 rig.setTank('A',{litres:NaN});assert.equal(T.water.visible,false);
 rig.setTank('A',{litres:30,rate:-8,draining:true});assert.equal(T.drain.visible,true);assert.ok(Math.abs(T.lever.rotation.y+Math.PI/2)<1e-12);
 rig.setTank('A',{litres:30,rate:0});assert.equal(T.lever.rotation.y,0);assert.equal(T.wheel.rotation.y,0);
 assert.throws(()=>rig.setTank('C',{}),/Unknown tank/);
});
test('browser glass is replaced honestly: no transmission left, lesson water colours, glass drawn after water',()=>{
 const root=hierarchy();let before=0;root.traverse(o=>{if(o.isMesh&&o.material.transmission>0)before++});assert.ok(before>0,'the GLB carries Cycles transmission');
 prepareBrowserMaterials(root,THREE);let after=0,glass=null,water=null;
 root.traverse(o=>{if(!o.isMesh)return;if(o.material.transmission>0)after++;if(o.name==='TANK_A_ACRYLIC')glass=o;if(o.name==='TANK_A_WATER')water=o});
 assert.equal(after,0);assert.equal(glass.material.transparent,true);assert.equal(glass.material.depthWrite,false);assert.ok(glass.renderOrder>water.renderOrder);
 assert.equal('#'+water.material.color.getHexString(),'#7fb7e8');
});
