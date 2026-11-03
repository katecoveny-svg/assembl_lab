/** Pure visual adapter for the particle machine apparatus (assembl.particles.v1).
 * No timer, gas law, heating model, random values or independent lesson state. Every input is a value that
 * study/m/particles.js has already calculated (s.vol, pressure(), stateFrom(...).T, s.power and its own visual
 * water level). setVisualState is an absolute snapshot: repeated calls never accumulate offsets.
 */
export const PARTICLES_CONTRACT='assembl.particles.v1';
export const REQUIRED_NODES=['PARTICLES_APPARATUS','HEAT_STATION','GAS_STATION','BEAKER','WATER_PIVOT','WATER_VOLUME','THERMOMETER','THERMO_SPIRIT_PIVOT',
  'HEAT_COIL','STATUS_LED','POWER_KNOB_PIVOT','HOTPLATE_TOP','SYRINGE','BARREL_GLASS','PLUNGER_SLIDE','PLUNGER_ROD','THUMB_PLATE','GAUGE','GAUGE_NEEDLE_PIVOT'];
const COIL_COOL='#D9CCD3',COIL_WARM='#E58A9E',LED_IDLE='#BFE8D6',LED_ON='#E8688A';
const finite=(x,f)=>Number.isFinite(x)?x:f;
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));

export function createParticlesRig(root,contract){
  if(!contract||contract.contract!==PARTICLES_CONTRACT)throw new Error('Unsupported particles rig contract');
  const R=contract.rig,nodes={};root.traverse(o=>{if(o.name)nodes[o.name]=o});
  for(const n of REQUIRED_NODES)if(!nodes[n])throw new Error('Missing particles rig node: '+n);
  const rest={};for(const n of REQUIRED_NODES)rest[n]={position:nodes[n].position.clone(),rotation:nodes[n].rotation.clone(),scale:nodes[n].scale.clone()};
  // The loader may share materials between parts. Clone only the two state-tinted appearances.
  const tinted={};for(const n of ['HEAT_COIL','STATUS_LED']){nodes[n].traverse(o=>{if(o.isMesh){o.material=o.material.clone();tinted[n]=o.material}})}
  const coil=tinted.HEAT_COIL,led=tinted.STATUS_LED,cool=coil.color.clone().set(COIL_COOL),warm=coil.color.clone().set(COIL_WARM);
  // Alpha glass and water: no depth writes, water drawn before glass so both stay visible.
  root.traverse(o=>{if(o.isMesh&&o.material.transparent){o.material.depthWrite=false;o.renderOrder=o.name==='WATER_VOLUME'?1:2}});
  const restML=R.plunger.rest_volume_mL,perML=R.plunger.metres_per_mL,[gMin,gMax]=R.plunger.geometry_range_mL;
  const fullKPa=R.gauge_needle.full_scale_kPa,sweep=R.gauge_needle.sweep_deg*Math.PI/180;
  const tMin=R.thermometer.scale_min_C,tMax=R.thermometer.scale_max_C,[kMin,kMax]=R.power_knob.range_kW;
  function setVisualState({volumeML=restML,pressureKPa=0,temperatureC=tMin,waterHeightM=R.water.rest_height_m,waterVisible=true,heatLevel=0,heating=false,powerKW=kMin}={}){
    const vol=clamp(finite(volumeML,restML),gMin,gMax);
    nodes.PLUNGER_SLIDE.position.x=rest.PLUNGER_SLIDE.position.x+(vol-restML)*perML;
    const kPa=clamp(finite(pressureKPa,0),0,fullKPa);
    nodes.GAUGE_NEEDLE_PIVOT.rotation.z=rest.GAUGE_NEEDLE_PIVOT.rotation.z-kPa/fullKPa*sweep;
    const thermo=clamp((finite(temperatureC,tMin)-tMin)/(tMax-tMin),.01,1);
    nodes.THERMO_SPIRIT_PIVOT.scale.y=rest.THERMO_SPIRIT_PIVOT.scale.y*thermo;
    const water=clamp(finite(waterHeightM,R.water.rest_height_m)/R.water.rest_height_m,.02,2.5);
    nodes.WATER_PIVOT.scale.y=rest.WATER_PIVOT.scale.y*water;nodes.WATER_PIVOT.visible=!!waterVisible;
    const heat=clamp(finite(heatLevel,0),0,1);coil.color.lerpColors(cool,warm,heat);led.color.set(heating?LED_ON:LED_IDLE);
    const kw=clamp(finite(powerKW,kMin),kMin,kMax),knob=-(kw-kMin)/(kMax-kMin)*1.5*Math.PI;
    nodes.POWER_KNOB_PIVOT.rotation.z=rest.POWER_KNOB_PIVOT.rotation.z+knob;
    return {volumeML:vol,pressureKPa:kPa,thermoFraction:thermo,waterScale:water,heatLevel:heat,knobAngle:knob};
  }
  // Inverse of the plunger pose for the existing drag interaction: x is a point on the thumb plate in SYRINGE space
  // (metres; 0 = inner nozzle wall). The lesson still rounds and clamps to its own 20–100 mL range.
  const thumbOffset=contract.regions.syringe_chamber.thumb_offset_from_face_m;
  setVisualState();
  return {nodes,contract,setVisualState,volumeFromThumb:x=>(x-thumbOffset)/perML};
}
