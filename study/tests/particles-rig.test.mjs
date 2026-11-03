import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from '../../assets/vendor/three/three.module.min.js';
import {createParticlesRig,REQUIRED_NODES,PARTICLES_CONTRACT} from '../../assets/models/particles/particles-rig-controller.mjs';
import {checkContract,benchRegions} from '../m/particles-asset.js';
const dir=new URL('../../assets/models/particles/',import.meta.url),contract=JSON.parse(readFileSync(new URL('particles-rig-contract.json',dir)));
const bytes=readFileSync(new URL(contract.asset,dir)),asset=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
// Rebuild the real GLB node hierarchy (names, extras, rest transforms) with the vendored three.js.
function hierarchy(){
 const nodes=asset.nodes.map(n=>{const o=n.mesh===undefined?new THREE.Group():new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshStandardMaterial({transparent:asset.materials[asset.meshes[n.mesh].primitives[0].material]?.alphaMode==='BLEND'}));
  o.name=n.name||'';o.userData={...n.extras};if(n.translation)o.position.fromArray(n.translation);if(n.rotation)o.quaternion.fromArray(n.rotation);if(n.scale)o.scale.fromArray(n.scale);return o});
 asset.nodes.forEach((n,i)=>n.children?.forEach(j=>nodes[i].add(nodes[j])));const root=new THREE.Group();asset.scenes[asset.scene||0].nodes.forEach(i=>root.add(nodes[i]));root.updateMatrixWorld(true);return root;
}
const wp=(root,name)=>root.getObjectByName(name).getWorldPosition(new THREE.Vector3());
const near=(a,b,eps=1e-6)=>Math.abs(a-b)<eps;

test('GLB is the contracted file: size, hash, budgets, no textures, no emission and no saturated yellow',()=>{
 const st=contract.asset_stats;assert.equal(bytes.length,st.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),st.sha256);
 let tris=0;for(const m of asset.meshes)for(const p of m.primitives)tris+=asset.accessors[p.indices].count/3;
 assert.equal(tris,st.triangles);assert.ok(tris<=80000,'triangles '+tris);assert.ok(bytes.length<=2500000,'bytes '+bytes.length);
 assert.ok(asset.meshes.reduce((n,m)=>n+m.primitives.length,0)<=80);assert.equal((asset.textures||[]).length,0);assert.equal((asset.images||[]).length,0);
 assert.ok(!(asset.extensionsUsed||[]).includes('KHR_materials_emissive_strength'));
 for(const m of asset.materials){assert.ok(!m.emissiveFactor||m.emissiveFactor.every(x=>x===0),m.name+' emits');
  const [r,g,b]=m.pbrMetallicRoughness.baseColorFactor||[1,1,1];const toS=x=>x<=.0031308?x*12.92:1.055*x**(1/2.4)-.055;const [R,G,B]=[r,g,b].map(toS);
  const max=Math.max(R,G,B),min=Math.min(R,G,B),sat=max?(max-min)/max:0;let hue=0;if(max!==min){hue=max===R?60*(((G-B)/(max-min))%6):max===G?60*((B-R)/(max-min)+2):60*((R-G)/(max-min)+4)}if(hue<0)hue+=360;
  assert.ok(!(hue>=40&&hue<=70&&sat>.35),m.name+' is a saturated yellow')}
 const glass=asset.materials.filter(m=>m.alphaMode==='BLEND').map(m=>m.name).sort();assert.deepEqual(glass,['lab_glass_web','water_volume_web']);
 assert.ok(asset.materials.length<=20);
});

test('GLB matches every contracted node and metre-space pivot; moving parts have identity rest rotations',()=>{
 const root=hierarchy();
 for(const [name,info] of Object.entries({...contract.nodes,...contract.hotspots})){const o=root.getObjectByName(name);assert.ok(o,name);assert.ok(wp(root,name).distanceTo(new THREE.Vector3(...info.world_pivot_gltf_m))<1e-6,name)}
 for(const n of REQUIRED_NODES)assert.ok(root.getObjectByName(n),n);
 for(const n of ['PLUNGER_SLIDE','GAUGE_NEEDLE_PIVOT','THERMO_SPIRIT_PIVOT','WATER_PIVOT','POWER_KNOB_PIVOT']){const o=root.getObjectByName(n);assert.ok(o.quaternion.equals(new THREE.Quaternion()),n);assert.deepEqual(o.scale.toArray(),[1,1,1],n)}
 // the rest plunger face sits at the lesson's default 60 mL
 const c=contract.regions.syringe_chamber;assert.ok(near(wp(root,'PLUNGER_SLIDE').x,c.nozzle_inner_x_m+60*contract.rig.plunger.metres_per_mL));
 assert.ok(near(contract.rig.plunger.metres_per_mL,1e-6/(Math.PI*c.inner_radius_m**2),1e-12));
 // apparatus sits on the floor, metres, real-world scale: a 100 mL syringe and an 800 mL beaker
 const box=new THREE.Box3();root.traverse(o=>{if(o.isMesh)box.expandByPoint(o.getWorldPosition(new THREE.Vector3()))});assert.ok(box.max.x<1&&box.max.y<.5);
 assert.ok(near(100*contract.rig.plunger.metres_per_mL,.110,.002));
});

test('plunger, needle, spirit, water and knob follow absolute snapshots without drift',()=>{
 const root=hierarchy(),rig=createParticlesRig(root,contract),c=contract.regions.syringe_chamber,per=contract.rig.plunger.metres_per_mL;
 for(let i=0;i<50;i++){const r=rig.setVisualState({volumeML:30,pressureKPa:202.6,temperatureC:100,waterHeightM:.02,powerKW:3});
  assert.ok(near(wp(root,'PLUNGER_SLIDE').x,c.nozzle_inner_x_m+30*per));assert.ok(near(rig.nodes.GAUGE_NEEDLE_PIVOT.rotation.z,-202.6/400*1.5*Math.PI,1e-12));
  assert.ok(near(rig.nodes.THERMO_SPIRIT_PIVOT.scale.y,130/170,1e-12));assert.ok(near(rig.nodes.WATER_PIVOT.scale.y,.5,1e-12));assert.ok(near(rig.nodes.POWER_KNOB_PIVOT.rotation.z,-1.5*Math.PI,1e-12));
  assert.equal(r.volumeML,30)}
 // half the volume halves the chamber length from the nozzle wall to the plunger face
 rig.setVisualState({volumeML:60});const L60=wp(root,'PLUNGER_SLIDE').x-c.nozzle_inner_x_m;rig.setVisualState({volumeML:30});const L30=wp(root,'PLUNGER_SLIDE').x-c.nozzle_inner_x_m;
 assert.ok(near(L30/L60,.5,1e-6));
 // defaults restore the rest pose; the needle axis is the dial normal
 rig.setVisualState();assert.ok(near(wp(root,'PLUNGER_SLIDE').x,contract.nodes.PLUNGER_SLIDE.world_pivot_gltf_m[0]));assert.equal(rig.nodes.GAUGE_NEEDLE_PIVOT.rotation.z,0);
 assert.equal(rig.nodes.GAUGE_NEEDLE_PIVOT.rotation.x,0);assert.equal(rig.nodes.GAUGE_NEEDLE_PIVOT.rotation.y,0);
});

test('display clamps never change the values the lesson reports',()=>{
 const root=hierarchy(),rig=createParticlesRig(root,contract);
 const r=rig.setVisualState({volumeML:250,pressureKPa:900,temperatureC:400,waterHeightM:9,powerKW:99,heatLevel:7});
 assert.equal(r.volumeML,100);assert.equal(r.pressureKPa,400);assert.equal(r.thermoFraction,1);assert.equal(r.waterScale,2.5);assert.equal(r.heatLevel,1);
 const z=rig.setVisualState({volumeML:NaN,pressureKPa:-5,temperatureC:-273,waterHeightM:0,waterVisible:false});
 assert.equal(z.volumeML,60);assert.equal(z.pressureKPa,0);assert.equal(z.thermoFraction,.01);assert.equal(rig.nodes.WATER_PIVOT.visible,false);
 // heat is a colour change on a cloned material: no emission, and the shared materials are untouched
 rig.setVisualState({heatLevel:1,heating:true});const coil=rig.nodes.HEAT_COIL.material;assert.equal(coil.emissive.getHex(),0);assert.equal(coil.color.getHexString(),new THREE.Color('#E58A9E').getHexString());
 assert.equal(rig.nodes.STATUS_LED.material.color.getHexString(),new THREE.Color('#E8688A').getHexString());
 // the drag inverse matches the plunger pose (thumb x in SYRINGE metres → mL)
 rig.setVisualState({volumeML:45});const t=rig.nodes.THUMB_PLATE.parent;const thumbX=rig.nodes.PLUNGER_SLIDE.position.x+contract.regions.syringe_chamber.thumb_offset_from_face_m;
 assert.ok(near(rig.volumeFromThumb(thumbX),45,1e-4));assert.equal(t.name,'PLUNGER_SLIDE');
});

test('loader refuses a wrong or changed contract and converts regions with one uniform scale',()=>{
 assert.throws(()=>checkContract({...contract,contract:'assembl.particles.v0'}),/Unsupported/);
 assert.throws(()=>checkContract({...contract,coordinates:{...contract.coordinates,legacy_scene_units_per_metre:30}}),/units/);
 assert.throws(()=>createParticlesRig(hierarchy(),{...contract,contract:'other'}),/Unsupported/);
 const broken=hierarchy();broken.getObjectByName('GAUGE_NEEDLE_PIVOT').name='X';assert.throws(()=>createParticlesRig(broken,contract),/GAUGE_NEEDLE_PIVOT/);
 assert.equal(checkContract(contract).contract,PARTICLES_CONTRACT);
 const R=benchRegions(contract,.3);assert.equal(R.k,25);assert.ok(near(R.beaker.r,contract.regions.beaker_inner.inner_radius_m*25));assert.ok(near(R.beaker.floor,contract.regions.beaker_inner.floor_y_m*25+.3));
 assert.ok(near(R.syringe.perML*100,100*contract.rig.plunger.metres_per_mL*25));
 // molecules fit their chambers: the 7×7×7 lattice (spacing .19, radius .072) inside the beaker, gas spheres inside the barrel
 assert.ok(Math.hypot(3*.19+.072,3*.19+.072)<R.beaker.r);assert.ok(.062+.012<R.syringe.r);
 assert.ok(R.thermo.y1>R.thermo.y0&&R.thermo.t0===-30&&R.thermo.t1===140);
 // the thermometer clears the ice lattice footprint inside the beaker
 assert.ok(Math.abs(R.thermo.x-R.beaker.x)-.0047*25>3*.19+.072);
});
