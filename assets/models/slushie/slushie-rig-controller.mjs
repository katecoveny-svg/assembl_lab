/** Pure visual adapter. No timer, thermodynamics, random values or independent lesson state.
 * Inputs are already-calculated visual values supplied by slushie.js.
 */
export function createSlushieRig(root) {
  const required=['SLUSHIE_MACHINE','AUGER_PIVOT','AUGER_GEAR','MOTOR_PINION','FAN_PIVOT','EVAPORATOR_DRUM','ICE_SHELL','DRINK_VOLUME','VENT_OBSTRUCTION','TAP_HANDLE'];
  const nodes={}; root.traverse(o=>{if(o.name)nodes[o.name]=o;});
  for(const n of required)if(!nodes[n])throw new Error('Missing slush rig node: '+n);
  const initial={};for(const [n,o] of Object.entries(nodes))initial[n]={rotation:o.rotation.clone(),scale:o.scale.clone()};
  // GLTF loader can share materials across parts. Clone only the two state-driven appearances.
  for(const n of ['DRINK_VOLUME','ICE_SHELL','EVAPORATOR_DRUM','STATUS_LED'])nodes[n]?.traverse(o=>{if(o.isMesh)o.material=o.material.clone();});
  const panels=['SERVICE_PANEL','LEFT_PANEL','FRONT_PANEL','REAR_PANEL','DRIVE_HOUSING','DRIVE_GUARD'];
  const finite=(x,fallback)=>Number.isFinite(x)?x:fallback;
  const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
  function appearance(name,color,opacity){nodes[name].traverse(o=>{if(!o.isMesh)return;if(color!==undefined)o.material.color.set(color);if(opacity!==undefined){o.material.opacity=opacity;o.material.transparent=opacity<1;o.material.depthWrite=opacity>=1;o.material.needsUpdate=true;}});}
  function setVisualState({augerAngle=0,fanAngle=0,ventBlocked=false,shellVisible=false,shellRadialScale=1,shellAxialScale=1,drinkColor='#f2b6a9',drinkOpacity=.24,drumColor='#bac2cb',statusColor='#90c7b4',tapAngle=0}={}){
    const aa=finite(augerAngle,0),fa=finite(fanAngle,0);
    nodes.AUGER_PIVOT.rotation.z=initial.AUGER_PIVOT.rotation.z+aa;
    nodes.AUGER_GEAR.rotation.z=initial.AUGER_GEAR.rotation.z+aa;
    nodes.MOTOR_PINION.rotation.z=initial.MOTOR_PINION.rotation.z-aa*2.3;
    nodes.FAN_PIVOT.rotation.z=initial.FAN_PIVOT.rotation.z+fa;
    nodes.TAP_HANDLE.rotation.x=initial.TAP_HANDLE.rotation.x+clamp(finite(tapAngle,0),0,.4);
    nodes.VENT_OBSTRUCTION.visible=!!ventBlocked;nodes.ICE_SHELL.visible=!!shellVisible;
    const radial=clamp(finite(shellRadialScale,1),1,1.98),axial=clamp(finite(shellAxialScale,1),1,1.04);
    nodes.ICE_SHELL.scale.copy(initial.ICE_SHELL.scale).multiply({x:radial,y:radial,z:axial});
    appearance('DRINK_VOLUME',drinkColor,clamp(finite(drinkOpacity,.24),0,.85));
    appearance('EVAPORATOR_DRUM',drumColor);appearance('STATUS_LED',statusColor);
    return {augerAngle:aa,fanAngle:fa,ventBlocked:!!ventBlocked,shellVisible:!!shellVisible,shellRadialScale:radial,shellAxialScale:axial};
  }
  function setView({cutaway=false,mechanism=false,showCup=true}={}){
    for(const n of panels)nodes[n].visible=!cutaway;
    nodes.REAR_VENTS.visible=!cutaway;nodes.DRINK_VOLUME.visible=!mechanism;nodes.SERVING_CUP.visible=showCup;
  }
  root.traverse(o=>{if(o.isMesh&&o.material.transparent){o.material.depthWrite=false;o.renderOrder=o.name.includes('BOWL')?3:o.name.includes('DRINK')?2:1;}});
  setVisualState();setView();
  return {nodes,setVisualState,setView};
}
