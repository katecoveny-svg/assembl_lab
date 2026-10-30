/** Pure absolute pose application. Requires caller-supplied source geometry and visual state. */
import {Vector3,Quaternion,Color} from '../../vendor/three/three.module.min.js';
export function createBikeRig(root,contract){
 const nodes={};root.traverse(o=>{if(o.name)nodes[o.name]=o;});const rest=Object.fromEntries(Object.entries(nodes).map(([k,o])=>[k,{position:o.position.clone(),quaternion:o.quaternion.clone(),scale:o.scale.clone()}]));
 const materials=new Map();root.traverse(o=>{if(o.isMesh){if(!materials.has(o.material))materials.set(o.material,o.material.clone());o.material=materials.get(o.material);}});
 const Y=new Vector3(0,1,0),v=a=>new Vector3(...a);let lastPose;
 function setPose(p){
  if(!p?.configuration||!p.bones||!p.points||!p.anchors)throw new Error('Complete source pose required');const C=p.configuration;
  if(!['flow','drop','ridge'].includes(C.model)||!['fast','trail','mud','dh'].includes(C.tyres)||!['low','mid','high'].includes(C.bars)||!['red','black','teal'].includes(C.colour))throw new Error('Unknown bike configuration');
  for(const [name,{a,b}]of Object.entries(p.bones)){const o=nodes[name],meta=contract.bones[name];if(!o||!meta)throw new Error('Missing bone '+name);const d=v(b).sub(v(a)),L=d.length();if(!Number.isFinite(L)||L<1e-6)throw new Error('Invalid endpoint '+name);o.position.fromArray(a);o.quaternion.setFromUnitVectors(Y,d.divideScalar(L));o.scale.set(1,L/meta.rest_length_m,1);}
  for(const [name,point]of Object.entries(p.points)){if(!nodes[name])throw new Error('Missing point '+name);nodes[name].position.fromArray(point);}
  for(const [name,point]of Object.entries(p.anchors))nodes['ANCHOR_'+name].position.fromArray(point);
  for(const name of ['WHEEL_FRONT_PIVOT','WHEEL_REAR_PIVOT']){nodes[name].rotation.set(0,0,Number.isFinite(p.wheelAngle)?p.wheelAngle:0);for(const t of ['fast','trail','mud','dh'])nodes[name.replace('PIVOT','TYRE_'+t.toUpperCase())].visible=C.tyres===t;}
  for(const name of ['ROTOR_FRONT','ROTOR_REAR'])nodes[name].scale.set(C.rotorRadius/.1015,C.rotorRadius/.1015,1);
  for(const name of ['CROWN_LOWER','CROWN_UPPER'])nodes[name].quaternion.setFromUnitVectors(Y,v(C.forkAxis).normalize());
  nodes.CROWN_UPPER.visible=C.dual;nodes.SHOCK_COIL.visible=C.shock==='coil';nodes.SHOCK_AIR_CAN.visible=C.shock==='air';
  for(const b of ['low','mid','high'])nodes['BAR_'+b.toUpperCase()].visible=C.bars===b;
  for(const m of ['flow','drop','ridge'])nodes['BIKE_'+m.toUpperCase()].visible=C.model===m;
  nodes.RIDER_ROOT.visible=!!p.riderVisible;nodes.MUDGUARD.visible=!!p.guard;nodes.LIGHT_POD.visible=!!p.pod;nodes.TAG_SURFACE.rotation.set(0,0,Number.isFinite(p.tagAngle)?p.tagAngle:0);
  const colour={red:'#D9533F',black:'#353B4D',teal:'#3C9888'}[C.colour],hf=Math.max(0,Math.min(1,p.heatFraction||0));for(const m of materials.values()){if(m.name==='FRAME_COLOUR_ACCENT')m.color.set(colour);if(m.name==='ROTOR_HEAT_CUE')m.color.copy(new Color('#CCD4DC')).lerp(new Color('#E9A27A'),hf);}
  lastPose=p;root.updateMatrixWorld(true);return p;
 }
 function setView({bike=true,rider=lastPose?.riderVisible||false,demo=false,exploded=0}={}){nodes.BIKE_ASSEMBLY.visible=bike;nodes.RIDER_ROOT.visible=rider;nodes.FORK_DEMO_ROOT.visible=demo;const C=lastPose?.configuration,e=Math.max(0,Math.min(1,exploded));nodes.DEMO_SHOCK_COIL.visible=C?.shock==='coil';nodes.DEMO_SHOCK_AIR_CAN.visible=C?.shock==='air';
  for(const [name,w]of [['DEMO_CROWN',.35],['DEMO_STANCHION_L',.2],['DEMO_STANCHION_R',.2],['DEMO_SPRING',.1],['DEMO_SHOCK_COIL',.15],['DEMO_SHOCK_AIR_CAN',.1]]){nodes[name].position.copy(rest[name].position);nodes[name].position.y+=w*e;}
  root.updateMatrixWorld(true);
 }
 return {nodes,rest,setPose,setView,materials:[...materials.values()]};
}
