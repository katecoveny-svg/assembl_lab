// Pure presentation adapter. Host supplies normalized phase; owns all experiment state.
// No clock, cardiac-output calculation, physiological integration or animation loop here.
import {Quaternion,Vector3} from 'three';
const X=new Vector3(1,0,0),Y=new Vector3(0,1,0);
const converted=a=>new Vector3(a[0],a[2],-a[1]);
import {phasePose} from './phase-pose.js';
export {phasePose} from './phase-pose.js';
export function createHeartRig(root){
 const hinges=[],chambers=[],chords=[],covers=[];const names=new Map();
 root.traverse(o=>{names.set(o.name,o);if(o.name.startsWith('Hinge_'))hinges.push({o,closed:o.quaternion.clone()});if(o.name.startsWith('Chamber_'))chambers.push(o);if(o.name.startsWith('Chord_'))chords.push(o);if(o.userData.cutaway_cover)covers.push(o)});
 for(const n of ['HeartRoot','Valve_Mitral','Valve_Tricuspid','Valve_Aortic','Valve_Pulmonary'])if(!names.has(n))throw Error('Missing rig node '+n);
 if(hinges.length!==11)throw Error('Expected eleven valve hinges');
 const arrowRoot=names.get('FlowArrows');
 return {
  names,
  applyPhase(phase){
   const v=phasePose(phase);
   for(const {o,closed} of hinges){const av=/Mitral|Tricuspid/.test(o.name);o.quaternion.copy(closed).multiply(new Quaternion().setFromAxisAngle(X,o.userData.open_angle_rad*(av?v.av:v.semilunar)))}
   for(const o of chambers){const s=o.name.includes('Ventricle')?1-.035*v.contraction:1-.025*Math.sin(Math.PI*Math.max(0,Math.min(1,(v.phase-.43)/.12)));o.scale.set(s,1,s)}
   root.updateMatrixWorld(true);
   for(const o of chords){const a=converted(o.userData.anchor),h=names.get(o.userData.hinge);const tip=h.localToWorld(converted(o.userData.tip));root.worldToLocal(tip);const d=tip.sub(a);o.position.copy(a);o.quaternion.setFromUnitVectors(Y,d.clone().normalize());o.scale.set(.00035,d.length(),.00035)}
   root.updateMatrixWorld(true);return v;
  },
  setCutaway(value){for(const o of covers)o.visible=!value},
  setArrows(value){if(arrowRoot)arrowRoot.visible=value},
  labels:[...names.values()].filter(o=>o.name.startsWith('Labels_')).map(o=>({name:o.name,text:o.userData.label,node:o})),
  summary(){return {hinges:hinges.length,covers:covers.length,chords:chords.length}}
 };
}
