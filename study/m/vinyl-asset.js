import {createVinylRig} from '../../assets/models/vinyl/vinyl-rig-controller.mjs';

export const VINYL_UNITS=2.2/.146;

// Absolute poses from the lesson's existing angle, radius and slowed phase.
// This is the original visual circle intersection, not a second physics model.
export function vinylPose(s){
  const r=s.r*VINYL_UNITS,px=2.75,pz=-1.75,length=3.05,d=Math.hypot(px,pz);
  const a=Math.atan2(pz,px)+Math.acos(Math.max(-1,Math.min(1,(d*d+r*r-length*length)/(2*d*r))));
  return {platterAngle:-s.ang,motorAngle:-s.ang*6.8,
    tonearmYaw:-Math.atan2(Math.sin(a)*r-pz,Math.cos(a)*r-px),armLift:0,
    speakerExcursionM:.08*s.amp*Math.sin(s.phase)/VINYL_UNITS,
    recordFormat:s.format,speed33Pressed:Math.abs(s.rpm-100/3)<.01,speed45Pressed:Math.abs(s.rpm-45)<.01};
}

export function disposeVinyl(roots){
  const geometries=new Set(),materials=new Set(),textures=new Set();
  for(const root of roots)root?.traverse(o=>{
    if(o.geometry)geometries.add(o.geometry);
    for(const m of Array.isArray(o.material)?o.material:[o.material])if(m){materials.add(m);for(const t of Object.values(m))if(t?.isTexture)textures.add(t)}
  });
  textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());geometries.forEach(g=>g.dispose());
  roots.forEach(r=>r?.removeFromParent());
}

export async function loadVinyl(S,signal){
  const {GLTFLoader}=await import('../../ar/vendor/three/loaders/GLTFLoader.js');
  const read=async(url,json=false)=>{const r=await fetch(url,{signal});if(!r.ok)throw Error('Vinyl asset '+r.status);return json?r.json():r.arrayBuffer()};
  const [bytes,contract]=await Promise.all([read('/assets/models/vinyl/assembl-vinyl-atelier-web.glb'),read('/assets/models/vinyl/vinyl-rig-contract.json',true)]);
  signal.throwIfAborted();
  const {scene:root}=await new GLTFLoader().parseAsync(bytes,'');
  try{
    signal.throwIfAborted();
    if(contract.contract!=='assembl.vinyl.v1'||contract.units!=='metres'||Math.abs(contract.coordinates.legacy_scene_units_per_metre-VINYL_UNITS)>1e-10)throw Error('Unsupported vinyl rig');
    const rig=createVinylRig(root);
    for(const name of Object.keys(contract.nodes))if(!rig.nodes[name])throw Error('Missing contracted node '+name);
    root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;for(const m of Array.isArray(o.material)?o.material:[o.material])if(m?.map)m.map.anisotropy=Math.min(8,S.renderer.capabilities.getMaxAnisotropy())}});
    // The two assemblies are reparented by the lesson; both remain owned here.
    let disposed=false;
    return {root,rig,contract,pose:vinylPose,dispose(){if(disposed)return;disposed=true;disposeVinyl([root,rig.nodes.DECK_ASSEMBLY,rig.nodes.SPEAKER_ROOT])},disposeRoots:disposeVinyl};
  }catch(error){disposeVinyl([root]);throw error}
}
