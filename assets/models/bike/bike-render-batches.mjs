/** Rigid-part GPU batching for Three r170. Keeps the named source rig for transforms/picking.
 * No model state or animation clock. Call sync after supplied poses or visibility changes.
 * WEBGL_multi_draw enables the compact path. Otherwise use ordinary configured meshes,
 * with a separately measured, higher draw-call budget and the same pose controls.
 */
import {BatchedMesh,Matrix4} from '../../vendor/three/three.module.min.js';
export function createBikeRenderBatches(root,{renderer,forceStandard=false,batchFactory=(...args)=>new BatchedMesh(...args)}={}){
 const standard=()=>({mode:'standard',batches:[],sync(){root.updateMatrixWorld(true);},dispose(){}});
 // Capability decision precedes any layer change, allocation or scene attachment.
 if(forceStandard||!renderer?.extensions.has('WEBGL_multi_draw'))return standard();
 const sources=[];root.traverse(o=>{if(o.isMesh&&!o.isBatchedMesh)sources.push(o);});const groups=new Map();for(const o of sources){if(!groups.has(o.material))groups.set(o.material,[]);groups.get(o.material).push(o);}
 const batches=[],inv=new Matrix4(),tmp=new Matrix4(),masks=new Map(sources.map(o=>[o,o.layers.mask]));
 function cleanup(){for(const {batch}of batches){root.remove(batch);batch.dispose();}for(const o of sources)o.layers.mask=masks.get(o);}
 try{for(const [material,objects]of groups){
  const unique=[...new Set(objects.map(o=>o.geometry))];const vertices=unique.reduce((a,g)=>a+g.attributes.position.count,0),indices=unique.reduce((a,g)=>a+(g.index?.count||g.attributes.position.count),0);
  const batch=batchFactory(objects.length,vertices,indices,material);batch.name='BATCH_'+material.name;batch.frustumCulled=false;batch.perObjectFrustumCulled=false;batch.sortObjects=false;root.add(batch);const entries=[];batches.push({batch,entries});const ids=new Map();
  for(const g of unique){const clean=g.clone();for(const k of Object.keys(clean.attributes))if(!['position','normal'].includes(k))clean.deleteAttribute(k);if(!clean.index)clean.setIndex(Array.from({length:clean.attributes.position.count},(_,i)=>i));ids.set(g,batch.addGeometry(clean));clean.dispose();}
  for(const o of objects){o.layers.disableAll();entries.push({source:o,id:batch.addInstance(ids.get(o.geometry))});}
 }}catch(error){cleanup();const fallback=standard();fallback.reason=String(error);return fallback;}
 function sync(){root.updateMatrixWorld(true);inv.copy(root.matrixWorld).invert();for(const {batch,entries}of batches){let active=0;for(const {source,id}of entries){let visible=true;for(let p=source;p;p=p.parent){if(!p.visible){visible=false;break;}if(p===root)break;}batch.setVisibleAt(id,visible);if(visible){active++;tmp.multiplyMatrices(inv,source.matrixWorld);batch.setMatrixAt(id,tmp);}}batch.visible=active>0;}}
 function dispose(){cleanup();}
 sync();return {mode:'multi-draw',batches,sync,dispose};
}
