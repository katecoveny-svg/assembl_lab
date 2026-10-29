/** Absolute visual poses only. No scientific model, timer, RNG or play state. */
export function createPhoneRig(root) {
 const nodes={};root.traverse(o=>{if(o.name)nodes[o.name]=o;});
 const required=['PHONE_ROOT','PHONE_BACK','PHONE_BATTERY','PHONE_BOARD','PHONE_SCREEN','BATTERY_INDICATOR','SCREEN_SURFACE','QI_PHONE_ROOT','QI_RECEIVER','QI_TRANSMITTER','QI_END_LEAD','QI_RECEIVER_END','INTERNAL_RESISTOR','PLATE_POS','PLATE_NEG'];
 for(const n of required)if(!nodes[n])throw new Error('Missing phone rig node: '+n);
 const stations=['CHARGE_STATION','INTERNAL_STATION','PARALLEL_STATION','WIRELESS_STATION','CAPACITOR_STATION'];
 const rest=Object.fromEntries(Object.entries(nodes).map(([n,o])=>[n,{position:o.position.clone(),scale:o.scale.clone()}]));
 const heat=[];nodes.INTERNAL_RESISTOR.traverse(o=>{if(o.isMesh&&o.material.name==='HEAT_CUE_MAT'){o.material=o.material.clone();heat.push(o.material);}});const heatRest=heat.map(m=>m.color.clone());
 const clamp=(n,a,b,f)=>Number.isFinite(n)?Math.min(b,Math.max(a,n)):f;
 function setVisualState({explode=0,indicatorFraction=.2,receiverTurns=10,wirelessGapM=.002,heatColor=null}={}) {
  explode=clamp(explode,0,1,0);indicatorFraction=clamp(indicatorFraction,0,1,.2);receiverTurns=Math.round(clamp(receiverTurns,5,20,10));wirelessGapM=clamp(wirelessGapM,0,.008,.002);
  for(const [n,d]of Object.entries({PHONE_BATTERY:.025,PHONE_BOARD:.050,PHONE_SCREEN:.075})){nodes[n].position.copy(rest[n].position);nodes[n].position.y+=d*explode;}
  const ind=nodes.BATTERY_INDICATOR;ind.scale.copy(rest.BATTERY_INDICATOR.scale);ind.scale.x*=indicatorFraction;ind.visible=indicatorFraction>0;
  nodes.QI_PHONE_ROOT.position.copy(rest.QI_PHONE_ROOT.position);nodes.QI_PHONE_ROOT.position.y+=wirelessGapM;
  for(let i=1;i<=20;i++)nodes['QI_TURN_'+String(i).padStart(2,'0')].visible=i<=receiverTurns;
  const end=.008+receiverTurns*.0009;nodes.QI_RECEIVER_END.position.copy(rest.QI_RECEIVER_END.position);nodes.QI_RECEIVER_END.position.x=end;nodes.QI_END_LEAD.position.copy(rest.QI_END_LEAD.position);nodes.QI_END_LEAD.position.x=end;nodes.QI_END_LEAD.scale.copy(rest.QI_END_LEAD.scale);nodes.QI_END_LEAD.scale.x=(.034-end)/.008;
  heat.forEach((m,i)=>heatColor===null?m.color.copy(heatRest[i]):m.color.set(heatColor));
  root.updateMatrixWorld(true);return {explode,indicatorFraction,receiverTurns,wirelessGapM};
 }
 function setView({station='CHARGE_STATION',hidePhoneBack=false,wirelessCutaway=false}={}) {
  if(station!=='all'&&!stations.includes(station))throw new Error('Unknown station '+station);
  for(const n of stations)nodes[n].visible=station==='all'||n===station;
  nodes.PHONE_BACK.visible=!hidePhoneBack;nodes.QI_PHONE_SHELL.visible=!wirelessCutaway;nodes.QI_PHONE_SCREEN.visible=!wirelessCutaway;
 }
 setVisualState();setView();return {nodes,rest,setVisualState,setView};
}
