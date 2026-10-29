import {createSlushieRig} from '../../assets/models/slushie/slushie-rig-controller.mjs';

// Geometry guards only. They do not change the lesson's ice mass or thermodynamics.
export function insideDrink(p, radius, region) {
  const [cx,cy,cz]=region.gltf_centre_m, [x,y,z]=p;
  const end=Math.max(0,Math.abs(z-cz)-region.cylinder_length_m/2);
  if(y+radius>region.fill_plane_y_m || Math.hypot(x-cx,y-cy,end)>region.radius_m-radius)return false;
  const d=region.exclude_drum;
  return Math.abs(z-d.centre_m[2])>d.cylinder_length_m/2+radius || Math.hypot(x-d.centre_m[0],y-d.centre_m[1])>d.radius_m+radius;
}

export async function loadSlushie(S){
  const {THREE,mat}=S;
  const {GLTFLoader}=await import("../../ar/vendor/three/loaders/GLTFLoader.js");
  const [gltf,contract]=await Promise.all([
    new GLTFLoader().loadAsync('/assets/models/slushie/slushie-atelier.glb'),
    fetch('/assets/models/slushie/slushie-rig-contract.json').then(r=>{if(!r.ok)throw new Error('Slushie contract '+r.status);return r.json()})
  ]);
  if(contract.contract!=='assembl.slushie.v1')throw new Error('Unsupported slushie rig');
  const rig=createSlushieRig(gltf.scene),g=new THREE.Group();
  gltf.scene.scale.setScalar(contract.coordinates.legacy_scene_units_per_metre);g.add(gltf.scene);
  const assetBounds=new THREE.Box3().setFromObject(gltf.scene,true);
  const framingPoints=[];
  gltf.scene.traverse(o=>{if(o.isMesh){let prop=false;o.traverseAncestors(a=>{if(a.name==='SERVING_CUP')prop=true});if(prop)return;
    o.geometry.computeBoundingBox();const b=o.geometry.boundingBox;for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z])framingPoints.push(new THREE.Vector3(x,y,z).applyMatrix4(o.matrixWorld));
  }});
  const parts={},hotspots={};
  gltf.scene.traverse(o=>{
    if(o.isMesh){o.castShadow=!o.material.transparent;o.receiveShadow=true;}
    const key=o.userData.lesson_part_id;
    if(key){if(o.name.startsWith('HOTSPOT_'))hotspots[key]=o;else if(!parts[key])parts[key]=o;}
  });
  // Named mesh groups ensure all nine original part explanations remain pickable.
  for(const [key,name] of Object.entries({comp:'COMPRESSOR',cond:'CONDENSER',fan:'FAN_PIVOT',valve:'EXPANSION_VALVE',drum:'EVAPORATOR_DRUM',aug:'AUGER_PIVOT',tap:'TAP_BODY',probe:'TEMPERATURE_PROBE',motor:'AUGER_MOTOR'}))parts[key]=rig.nodes[name]||parts[key];
  parts.handle=rig.nodes.TAP_HANDLE;
  const iceGeo=new THREE.CylinderGeometry(1,1,.34,6),iceMat=mat('plastic','#F7FBFF',{rough:.32,coat:.6});
  parts.drumIce=S.swarm(240,iceGeo,iceMat);parts.susIce=S.swarm(420,iceGeo,iceMat);
  parts.refr=S.swarm(170,new THREE.SphereGeometry(1,8,6),mat('plastic','#ffffff',{rough:.4}),{colors:true});
  g.add(parts.drumIce,parts.susIce,parts.refr);
  // Keep original LOOP phases, colours and timings; only its spatial path changes.
  const curves={};
  for(const [key,name] of Object.entries({hot:'PIPE_HOT',cond:'PIPE_CONDENSER',cold:'PIPE_COLD',suct:'PIPE_SUCTION'}))curves[key]=new THREE.CatmullRomCurve3(contract.pipe_paths[name].centreline_gltf_m.map(p=>new THREE.Vector3(...p)));
  curves.liq=new THREE.CatmullRomCurve3([...contract.pipe_paths.PIPE_LIQUID.centreline_gltf_m,...contract.pipe_paths.PIPE_DRYER.centreline_gltf_m].map(p=>new THREE.Vector3(...p)));
  const flowPoint=p=>{const curve=curves[p.a.type];if(!curve||p.a.type!==p.b.type)return null;const u=THREE.MathUtils.clamp(p.a.u+(p.b.u-p.a.u)*p.u,0,1);return curve.getPoint(u).multiplyScalar(25)};
  const putCrystal=(i,x,y,z,size,rx,ry,rz)=>{
    // The original visual population and size still come from r.sus and r.size.
    if(!insideDrink([x/25,y/25,z/25],size/25*1.05,contract.particle_region))parts.susIce.put(i,0,-99,0,.0001);
    else parts.susIce.put(i,x,y,z,size,rx,ry,rz);
  };
  const heatIn=S.arrow('#619bc4',{r:.035}),heatOut=S.arrow('#dd987e',{r:.05});g.add(heatIn,heatOut);
  const setHeat=(coolingW,backW,show)=>{
    heatIn.set(new THREE.Vector3(1.35,6.65,.5),new THREE.Vector3(-.85,-.6,0),coolingW>0?1:0);
    heatOut.set(new THREE.Vector3(.5,2.5,-3.3),new THREE.Vector3(0,.8,-1.5),backW>0?1:0);
    heatIn.visible=show&&coolingW>0;heatOut.visible=show&&backW>0;
  };
  rig.setView({cutaway:true,showCup:false});
  return {g,parts,S,rig,assetBounds,framingPoints,contract,hotspots,flowPoint,putCrystal,setHeat};
}

export function lightSlushie(S){
  const {THREE,scene,renderer}=S;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;scene.background=new THREE.Color('#f5f1eb');scene.fog=null;scene.environmentIntensity=.5;
  const env=new THREE.Scene();env.background=new THREE.Color('#d9d7d3');
  for(const [x,y,z,sx,sy,sz,c] of [[-4,3,0,.1,6,7,0xffffff],[4,3,-2,.1,6,4,0xd6d7e8],[0,7,0,8,.1,8,0xffffff],[0,2,-5,6,5,.1,0x595b71]]){
    const o=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),new THREE.MeshBasicMaterial({color:c}));o.position.set(x,y,z);env.add(o);
  }
  const pm=new THREE.PMREMGenerator(renderer),map=pm.fromScene(env,.04);scene.environment.dispose();scene.environment=map.texture;pm.dispose();env.traverse(o=>{o.geometry?.dispose();o.material?.dispose()});
  S.sun.intensity=2;S.ground.material.opacity=.15;
}
