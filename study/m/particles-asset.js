import {createParticlesRig,PARTICLES_CONTRACT} from '../../assets/models/particles/particles-rig-controller.mjs';

// Loads the Blender apparatus and its rig contract. It owns no lesson state: the page passes values it has already
// calculated, and this module only converts the contract's metre-space regions into the bench's scene units.
export function checkContract(c){
  if(!c||c.contract!==PARTICLES_CONTRACT)throw new Error('Unsupported particles rig contract');
  if(c.units!=='metres'||c.coordinates?.legacy_scene_units_per_metre!==25)throw new Error('Particles contract units changed');
  const r=c.regions||{},need=[r.beaker_inner?.inner_radius_m,r.syringe_chamber?.inner_radius_m,c.rig?.plunger?.metres_per_mL,c.rig?.thermometer?.world_y_at_max_m];
  if(need.some(x=>!Number.isFinite(x)))throw new Error('Particles contract regions missing');
  return c;
}

// Bench regions in scene units (one uniform scale k; glTF metres in the contract).
export function benchRegions(c,top=0){
  const k=c.coordinates.legacy_scene_units_per_metre,b=c.regions.beaker_inner,s=c.regions.syringe_chamber,t=c.rig.thermometer,gz=c.regions.gauge;
  return {k,
    beaker:{x:b.centre_xz_m[0]*k,z:b.centre_xz_m[1]*k,floor:b.floor_y_m*k+top,rim:b.rim_y_m*k+top,r:b.inner_radius_m*k},
    syringe:{x0:s.nozzle_inner_x_m*k,y:s.axis_y_m*k+top,z:s.axis_z_m*k,r:s.inner_radius_m*k,perML:c.rig.plunger.metres_per_mL*k,thumb:s.thumb_offset_from_face_m*k,open:s.barrel_open_end_x_m*k},
    thermo:{x:t.world_xz_m[0]*k,z:t.world_xz_m[1]*k,y0:t.world_y_at_min_m*k+top,y1:t.world_y_at_max_m*k+top,t0:t.scale_min_C,t1:t.scale_max_C},
    gauge:{x:gz.centre_m[0]*k,y:gz.centre_m[1]*k+top,z:gz.centre_m[2]*k,r:gz.radius_m*k}};
}

export async function loadParticles(S,top=0){
  const {GLTFLoader}=await import('../../ar/vendor/three/loaders/GLTFLoader.js');
  // The contract is fetched first so a wrong or changed contract is refused before the model downloads.
  const contract=checkContract(await fetch('/assets/models/particles/particles-rig-contract.json').then(r=>{if(!r.ok)throw new Error('Particles contract '+r.status);return r.json()}));
  const gltf=await new GLTFLoader().loadAsync('/assets/models/particles/'+contract.asset);
  if(!gltf.scene.getObjectByName('PARTICLES_APPARATUS'))throw new Error('Particles apparatus root missing');
  const rig=createParticlesRig(gltf.scene,contract),R=benchRegions(contract,top);
  gltf.scene.scale.setScalar(R.k);gltf.scene.position.y=top;
  gltf.scene.traverse(o=>{if(o.isMesh){o.castShadow=!o.material.transparent;o.receiveShadow=true}});
  return {root:gltf.scene,rig,contract,R};
}

// Neutral studio cards so the steel and glass read without a downloaded HDR. No bloom; tone mapping stays neutral
// so the pastels stay pastel.
export function lightParticles(S){
  const {THREE,scene,renderer}=S;
  scene.background=new THREE.Color('#f5f1eb');scene.fog=null;scene.environmentIntensity=.55;
  const env=new THREE.Scene();env.background=new THREE.Color('#d9d7d3');
  for(const [x,y,z,sx,sy,sz,c] of [[-4,3,0,.1,6,7,0xffffff],[4,3,-2,.1,6,4,0xd6d7e8],[0,7,0,8,.1,8,0xffffff],[0,2,-5,6,5,.1,0x595b71]]){
    const o=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),new THREE.MeshBasicMaterial({color:c}));o.position.set(x,y,z);env.add(o);
  }
  const pm=new THREE.PMREMGenerator(renderer),map=pm.fromScene(env,.04);scene.environment.dispose();scene.environment=map.texture;pm.dispose();env.traverse(o=>{o.geometry?.dispose();o.material?.dispose()});
  S.sun.intensity=2.1;S.ground.material.opacity=.16;if(S.bloom)S.bloom.strength=0;
}
