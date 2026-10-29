/** Provided visual snapshots only: no rpm, phase, physics, audio, timer or RNG. */
export function createVinylRig(root){
 const nodes={};root.traverse(o=>{if(o.name)nodes[o.name]=o;});for(const n of ['DECK_ASSEMBLY','PLATTER_PIVOT','MOTOR_PULLEY_PIVOT','TONEARM_YAW','ARM_LIFT','STYLUS','LP_DISC','SINGLE_DISC','SPEAKER_CONE','SPEED_33','SPEED_45'])if(!nodes[n])throw new Error('Missing vinyl node '+n);
 const rest=Object.fromEntries(Object.entries(nodes).map(([n,o])=>[n,{position:o.position.clone(),scale:o.scale.clone(),quaternion:o.quaternion.clone()}]));
 const K=2.2/.146,outer=-1.865524188401192,inner=-2.2950227777618233;let format='lp',cutaway=false;
 const clamp=(v,a,b,f)=>Number.isFinite(v)?Math.max(a,Math.min(b,v)):f;
 function visibility(){nodes.LP_DISC.visible=!cutaway&&format==='lp';nodes.SINGLE_DISC.visible=!cutaway&&format==='single';for(const n of ['DECK_TOP','PLATTER','MAT'])nodes[n].visible=!cutaway;}
 function setVisualState({platterAngle=0,motorAngle=0,tonearmYaw=outer,armLift=0,speakerExcursionM=0,recordFormat='lp',speed33Pressed=false,speed45Pressed=false}={}){
  if(!['lp','single'].includes(recordFormat))throw new Error('Unknown record format '+recordFormat);format=recordFormat;
  nodes.PLATTER_PIVOT.rotation.set(0,Number.isFinite(platterAngle)?platterAngle:0,0);nodes.MOTOR_PULLEY_PIVOT.rotation.set(0,Number.isFinite(motorAngle)?motorAngle:0,0);
  tonearmYaw=clamp(tonearmYaw,inner,outer,outer);armLift=clamp(armLift,0,.12,0);speakerExcursionM=clamp(speakerExcursionM,-.08/K,.08/K,0);
  nodes.TONEARM_YAW.rotation.set(0,tonearmYaw,0);nodes.ARM_LIFT.rotation.set(0,0,armLift);nodes.SPEAKER_CONE.position.copy(rest.SPEAKER_CONE.position);nodes.SPEAKER_CONE.position.x+=speakerExcursionM;
  for(const [n,pressed]of [['SPEED_33',speed33Pressed],['SPEED_45',speed45Pressed]]){nodes[n].position.copy(rest[n].position);nodes[n].position.y-=pressed?.002:0;}
  visibility();root.updateMatrixWorld(true);return {tonearmYaw,armLift,speakerExcursionM,recordFormat:format};
 }
 function setView({assembly='both',serviceCutaway=false,speakerRearOpen=false}={}){if(!['both','deck','speaker'].includes(assembly))throw new Error('Unknown assembly');nodes.DECK_ASSEMBLY.visible=assembly!=='speaker';nodes.SPEAKER_ROOT.visible=assembly!=='deck';cutaway=serviceCutaway;visibility();nodes.SPEAKER_BACK.visible=!speakerRearOpen;}
 setVisualState();setView();return {nodes,rest,setVisualState,setView};
}
