import {createBikeRig} from '../../assets/models/bike/bike-rig-controller.mjs';
import {createBikeRenderBatches} from '../../assets/models/bike/bike-render-batches.mjs';
import {mapBikePose} from '../../assets/models/bike/bike-pose-map.mjs';

// Geometry conversion only: the lesson supplies its authoritative geoPts/riderPts.
export function bikePose(P,R,model,bars,build,visual){
 const convert=p=>[p[0]*.025,-p[1]*.025,0];
 return mapBikePose({anchors:Object.fromEntries(Object.entries(P).filter(([k])=>!['u','ha'].includes(k)).map(([k,p])=>[k,convert(p)])),
  rider:R?Object.fromEntries(Object.entries(R).filter(([,p])=>Array.isArray(p)).map(([k,p])=>[k,convert(p)])):null,
  configuration:{model:build.model,tyres:build.wheels,bars:build.bars,colour:build.colour,dual:model.fork==='dual',shock:model.shock,forkLength:model.geo.fl*.025,forkAxis:[P.u[0],-P.u[1],0],rotorRadius:model.rotor/2000,barWidth:bars.w/1000},
  wheelAngle:-(visual.spin||0),riderVisible:!!visual.rider,guard:!!build.guard,pod:!!build.pod,tagAngle:(visual.tag||0)*Math.PI/180,heatFraction:Math.max(0,Math.min(1,((visual.heat||0)-70)/330))});
}
export function disposeBikeRoots(roots){
 const geometry=new Set(),materials=new Set(),textures=new Set();
 roots.forEach(r=>r?.traverse(o=>{if(o.geometry)geometry.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])if(m){materials.add(m);Object.values(m).forEach(t=>{if(t?.isTexture)textures.add(t)})}}));
 textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());geometry.forEach(g=>g.dispose());roots.forEach(r=>r?.removeFromParent());
}
export async function loadBike(S,signal){
 const {GLTFLoader}=await import('../../ar/vendor/three/loaders/GLTFLoader.js');
 const read=async(name,json=false)=>{const r=await fetch('/assets/models/bike/'+name,{signal});if(!r.ok)throw Error('Bike asset '+r.status);return json?r.json():r.arrayBuffer()};
 const [bytes,contract]=await Promise.all([read('assembl-bike-atelier-web.glb'),read('bike-rig-contract.json',true)]);signal.throwIfAborted();
 const {scene:source}=await new GLTFLoader().parseAsync(bytes,'');const instances=[];let disposed=false;
 try{signal.throwIfAborted();if(contract.version!==2||contract.units!=='metres')throw Error('Unsupported bike contract');for(const name of Object.keys(contract.nodes))if(!source.getObjectByName(name))throw Error('Missing bike node '+name)}catch(error){disposeBikeRoots([source]);throw error}
 return {pose:bikePose,disposeRoots:disposeBikeRoots,instances,
  create(pose,{demo=false}={}){
   if(disposed)throw Error('Bike asset disposed');const root=source.clone(true);let rig,batches;
   try{
    rig=createBikeRig(root,contract);rig.setPose(pose);rig.setView({bike:!demo,rider:!demo&&pose.riderVisible,demo,exploded:0});
    root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});
    batches=createBikeRenderBatches(root,{renderer:S.renderer,forceStandard:new URLSearchParams(location.search).get('bike-renderer')==='standard'});
    batches.batches.forEach(({batch})=>{batch.castShadow=true;batch.receiveShadow=true});
    batches.sync(); // configured before the caller may attach it
    const instance={g:root,rig,batches,update(p,exploded=0){rig.setPose(p);rig.setView({bike:!demo,rider:!demo&&p.riderVisible,demo,exploded});batches.sync()}};instances.push(instance);return instance;
   }catch(error){batches?.dispose();rig?.materials.forEach(m=>m.dispose());root.removeFromParent();throw error}
  },
  dispose(){if(disposed)return;disposed=true;instances.forEach(i=>i.batches.dispose());disposeBikeRoots([source,...instances.map(i=>i.g)])}
 };
}
