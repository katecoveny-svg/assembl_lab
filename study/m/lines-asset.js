import {createLinesRig,checkContract} from '../../assets/models/lines/lines-rig-controller.mjs';

// Browser glass, stated honestly: the GLB carries Cycles-style transmission for acrylic and water. In the browser those
// become alpha-blended clear-coat materials (no refraction, no transmission pass), so the live tanks will not match the
// offline render's refraction. Lesson colours for the water stay the existing ones.
export const BROWSER_WATER={A:'#7FB7E8',B:'#F2A7BE'};
export function prepareBrowserMaterials(root,THREE,water=BROWSER_WATER){
  const made=new Map();
  const make=name=>{
    if(made.has(name))return made.get(name);let m=null;
    if(name==='ACRYLIC_CLEAR')m=new THREE.MeshPhysicalMaterial({name,color:'#F6F4FF',roughness:.05,metalness:0,clearcoat:1,clearcoatRoughness:.04,transparent:true,opacity:.14,depthWrite:false,side:THREE.DoubleSide,specularIntensity:1});
    else{const w=/^(WATER|STREAM)_([AB])$/.exec(name);
      if(w)m=new THREE.MeshPhysicalMaterial({name,color:water[w[2]],roughness:.1,metalness:0,clearcoat:1,transparent:true,opacity:w[1]==='WATER'?.72:.75,depthWrite:w[1]==='WATER'});}
    made.set(name,m);return m};
  root.traverse(o=>{if(!o.isMesh)return;const list=Array.isArray(o.material)?o.material:[o.material];
    const next=list.map(m=>{const r=make(m.name);if(r){m.dispose?.();return r}
      // anything else that arrived with transmission is flattened to an opaque look rather than paying for a transmission pass
      if(m.transmission>0){m.transmission=0}return m});
    o.material=Array.isArray(o.material)?next:next[0];
    const transparent=next.some(m=>m.transparent);o.castShadow=!transparent;o.receiveShadow=true;
    o.renderOrder=next.some(m=>m.name==='ACRYLIC_CLEAR')?3:next.some(m=>/^STREAM_/.test(m.name))?2:next.some(m=>/^WATER_/.test(m.name))?1:0});
  return made;
}

export async function loadLinesTanks(S){
  const {THREE}=S;
  const {GLTFLoader}=await import('../../ar/vendor/three/loaders/GLTFLoader.js');
  const [gltf,contract]=await Promise.all([
    new GLTFLoader().loadAsync('/assets/models/lines/lines-tanks.glb'),
    fetch('/assets/models/lines/lines-rig-contract.json').then(r=>{if(!r.ok)throw new Error('Lines contract '+r.status);return r.json()})
  ]);
  checkContract(contract);
  const rig=createLinesRig(gltf.scene,contract);
  prepareBrowserMaterials(gltf.scene,THREE);
  const k=contract.coordinates.scene_units_per_metre,holders={};
  for(const key of ['A','B']){
    // one uniform scale per tank; the lesson places each tank along x, exactly as it placed the drawn tanks
    const root=rig.tanks[key].root,h=new THREE.Group();h.name='LINES_HOLDER_'+key;
    root.position.x=0;h.add(root);h.scale.setScalar(k);holders[key]=h;
  }
  return {holders,rig,contract,scale:k};
}
