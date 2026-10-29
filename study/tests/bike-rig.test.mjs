import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import * as T from '../../assets/vendor/three/three.module.min.js';
import {createBikeRig} from '../../assets/models/bike/bike-rig-controller.mjs';
import {createBikeRenderBatches} from '../../assets/models/bike/bike-render-batches.mjs';
import {bikePose,disposeBikeRoots} from '../m/bike-asset.js';import {mount,json} from './bike-harness.mjs';
const dir=new URL('../../assets/models/bike/',import.meta.url),contract=JSON.parse(readFileSync(new URL('bike-rig-contract.json',dir))),bytes=readFileSync(new URL('assembl-bike-atelier-web.glb',dir));
const asset=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
function hierarchy(){const nodes=asset.nodes.map(n=>{const o=new T.Group();o.name=n.name||'';if(n.matrix)o.applyMatrix4(new T.Matrix4().fromArray(n.matrix));else{if(n.translation)o.position.fromArray(n.translation);if(n.rotation)o.quaternion.fromArray(n.rotation);if(n.scale)o.scale.fromArray(n.scale)}return o});asset.nodes.forEach((n,i)=>n.children?.forEach(j=>nodes[i].add(nodes[j])));const root=new T.Group();asset.scenes[asset.scene||0].nodes.forEach(i=>root.add(nodes[i]));root.updateMatrixWorld(true);return root}
test('exact corrected GLB retains 138 named metre pivots and curved chain wrap',()=>{
 assert.equal(bytes.length,2345060);assert.equal(createHash('sha256').update(bytes).digest('hex'),'80f731558e185c2322719535d4549f74c1c309f68d0633c7d4325ed17a3f6aa5');assert.equal(Object.keys(contract.nodes).length,138);assert.equal(asset.nodes.length,289);assert.equal(contract.units,'metres');assert.equal(contract.version,2);
 const root=hierarchy();for(const name of Object.keys(contract.nodes))assert.ok(root.getObjectByName(name),name);
 const front=root.getObjectByName('CHAIN_FRONT');assert.ok(front.children.length>0);assert.match(JSON.stringify(contract),/curved|wrap/);
});
test('all builds, bars, tyres and full fork travel map existing anchors exactly once with absolute wheel/contact poses',()=>{
 const app=mount(),root=hierarchy(),rig=createBikeRig(root,contract),point=n=>rig.nodes[n].getWorldPosition(new T.Vector3());
 for(const model of ['flow','drop','ridge'])for(const bars of ['low','mid','high'])for(const wheels of ['fast','trail','mud','dh'])for(const fraction of [0,.08,.5,1]){
  const b={...app.model.STOCK(model),bars,wheels,guard:true,pod:true},m=app.model.MODELS[model],P=app.model.geoPts(b,fraction*m.travel/.025),R=app.model.riderPts(P,{pose:0,crouch:fraction*1.2}),before=json([P,R,b]);
  const p=bikePose(P,R,m,app.model.BARS[bars],b,{spin:123.456,rider:true,heat:400,tag:12});for(let i=0;i<3;i++)rig.setPose(p);rig.setView({bike:true,rider:true,demo:false});root.updateMatrixWorld(true);
  for(const n of ['RA','FA','BB','GR'])assert.ok(point('ANCHOR_'+n).distanceTo(new T.Vector3(P[n][0]*.025,-P[n][1]*.025,0))<1e-9,n);
  assert.ok(point('WHEEL_FRONT_PIVOT').distanceTo(point('ANCHOR_FA'))<1e-9);assert.equal(rig.nodes.WHEEL_FRONT_PIVOT.rotation.z,-123.456);
  assert.equal(rig.nodes.CROWN_UPPER.visible,m.fork==='dual');assert.equal(rig.nodes.SHOCK_COIL.visible,m.shock==='coil');assert.equal(rig.nodes.ROTOR_FRONT.scale.x,(m.rotor/2000)/.1015);
  for(const t of ['fast','trail','mud','dh'])assert.equal(rig.nodes['WHEEL_FRONT_TYRE_'+t.toUpperCase()].visible,t===wheels);
  for(const side of ['L','R']){assert.ok(point('RIDER_HAND_'+side).distanceTo(point('GRIP_'+side))<.006);const gap=point('RIDER_SHOE_'+side).clone().sub(point('PEDAL_'+side));assert.ok(Math.abs(gap.y-.0305)<1e-8);assert.ok(Math.abs(gap.z)<1e-8)}
  assert.deepEqual(json([P,R,b]),before);assert.equal(rig.nodes.FORK_DEMO_ROOT.visible,false);
 }
 rig.setView({bike:false,rider:false,demo:true,exploded:1});const y=rig.nodes.DEMO_CROWN.position.y;for(let i=0;i<10;i++)rig.setView({bike:false,rider:false,demo:true,exploded:1});assert.equal(rig.nodes.DEMO_CROWN.position.y,y);rig.setView({demo:false});assert.equal(rig.nodes.DEMO_CROWN.position.y,rig.rest.DEMO_CROWN.position.y);
});
test('capability selection precedes batching; standard path and partial allocation failure retain visible configured geometry',()=>{
 const make=()=>{const root=new T.Group(),hidden=new T.Group(),g=new T.BoxGeometry(),m=new T.MeshStandardMaterial();root.add(new T.Mesh(g,m));hidden.add(new T.Mesh(g,m));root.add(hidden);hidden.visible=false;return root};
 for(const forceStandard of [true,false]){const root=make();let queries=0,allocations=0;const r=createBikeRenderBatches(root,{forceStandard,renderer:{extensions:{has(){queries++;return false}}},batchFactory(){allocations++;throw Error('unexpected')}});assert.equal(r.mode,'standard');assert.equal(allocations,0);assert.equal(queries,forceStandard?0:1);assert.equal(root.children[0].layers.mask,1);disposeBikeRoots([root])}
 const root=make(),r=createBikeRenderBatches(root,{renderer:{extensions:{has:()=>true}}});assert.equal(r.mode,'multi-draw');assert.equal(root.children[0].layers.mask,0);assert.equal(r.batches[0].batch.getVisibleAt(0),true);assert.equal(r.batches[0].batch.getVisibleAt(1),false);root.visible=false;r.sync();assert.equal(r.batches[0].batch.visible,false);r.dispose();assert.equal(root.children[0].layers.mask,1);disposeBikeRoots([root]);
 const fail=make();fail.add(new T.Mesh(new T.BoxGeometry(),new T.MeshStandardMaterial()));let n=0;const fallback=createBikeRenderBatches(fail,{renderer:{extensions:{has:()=>true}},batchFactory(...args){if(++n===2)throw Error('allocation');return new T.BatchedMesh(...args)}});assert.equal(fallback.mode,'standard');assert.match(fallback.reason,/allocation/);fail.traverse(o=>{if(o.isMesh){assert.equal(o.layers.mask,1);assert.equal(o.isBatchedMesh,undefined)}});disposeBikeRoots([fail]);
});
test('shared geometry/material/texture cleanup runs once across instances',()=>{const a=new T.Group(),b=new T.Group(),geo=new T.BoxGeometry(),map=new T.Texture(),mat=new T.MeshBasicMaterial({map});let g=0,m=0,t=0;geo.addEventListener('dispose',()=>g++);mat.addEventListener('dispose',()=>m++);map.addEventListener('dispose',()=>t++);a.add(new T.Mesh(geo,mat));b.add(new T.Mesh(geo,mat));disposeBikeRoots([a,b]);assert.deepEqual([g,m,t],[1,1,1]);});
test('portrait trail camera keeps wheels and rider in frame on steep sections at both phone widths',async()=>{
 const vm=await import('node:vm'),{current}=await import('./bike-harness.mjs'),app=mount();
 const body=current.slice(current.indexOf('  function trailView('),current.indexOf('  inspectSelect.onchange='));
 for(const aspect of [260/350,315/350]){let frame,follow;const S={camera:{aspect},view(n,p,target){frame={p,target}},goView(){},setFollow(fn,k){follow={fn,k}}};vm.runInNewContext(body+';trailView({k:"drop"},true)',{S,riderW:()=>new T.Vector3(),V3:(...v)=>new T.Vector3(...v)});
  assert.ok(follow.k>=.8);const camera=new T.PerspectiveCamera(32,aspect,.05,400);camera.position.fromArray(frame.p);camera.lookAt(...frame.target);camera.updateMatrixWorld(true);
  for(const model of ['flow','drop','ridge'])for(const pitch of [-.55,0,.4]){const b=app.model.STOCK(model),P=app.model.geoPts(b,0),R=app.model.riderPts(P,{pose:0,crouch:0}),points=[];
   for(const name of ['RA','FA'])for(let i=0;i<24;i++){const a=i*Math.PI/12;points.push(new T.Vector3(P[name][0]*.025+.405*Math.cos(a),-P[name][1]*.025+.405*Math.sin(a),.1))}points.push(new T.Vector3(R.head[0]*.025,-R.head[1]*.025+.13,0));
   for(const p of points){p.applyAxisAngle(new T.Vector3(0,0,1),pitch);p.x+=.12;const q=p.project(camera);assert.ok(q.x>-.99&&q.x<.99&&q.y>-.99&&q.y<.99,JSON.stringify({aspect,model,pitch,q}))}
  }
 }
});
