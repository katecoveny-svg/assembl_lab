import {createPhoneRig} from '../../assets/models/phone/phone-rig-controller.mjs';

export const UNITS=30, GAP_MAGNIFICATION=5;
export const stationFor=k=>({internal:'INTERNAL_STATION',circuit:'PARALLEL_STATION',wireless:'WIRELESS_STATION',capacitor:'CAPACITOR_STATION'}[k]||'CHARGE_STATION');
// Dispose owned GPU resources once, including shared materials and canvas maps.
export function disposePhone(root){
  const geometries=new Set(),materials=new Set(),textures=new Set();
  root?.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of (Array.isArray(o.material)?o.material:[o.material]))if(m){materials.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v)}});
  textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());geometries.forEach(g=>g.dispose());root?.removeFromParent();
}
// Physical input remains separate from the explicitly magnified teaching pose.
export function applyPhonePose(rig,v){
  rig.setVisualState({explode:v.explode,indicatorFraction:v.indicatorFraction,receiverTurns:v.receiverTurns,wirelessGapM:v.gapMm/1000,heatColor:null});
  rig.nodes.QI_PHONE_ROOT.position.y=rig.rest.QI_PHONE_ROOT.position.y+v.gapMm/1000*GAP_MAGNIFICATION;
}
const PARTS={
 CHARGE_STATION:[['PHONE_BATTERY','HOT_BATTERY','Battery',v=>`${v.chargeC.toFixed(0)} C stored at full capacity · ${(v.energyJ/1000).toFixed(1)} kJ. Only the indicator changes size; the cell casing stays fixed.`],['PHONE_SCREEN','HOT_BOARD','Screen and board',v=>`Average power ${v.averageW.toFixed(2)} W. The exploded layers reveal construction; separation is illustrative.`],['CHARGER_ROOT','HOT_CHARGER','USB-C charger',v=>`${v.chargerW} W charger · ${(v.efficiency*100).toFixed(0)}% efficiency. Current now ${v.currentA.toFixed(2)} A: ${v.phase}.`],['USB_CABLE','HOT_USB','Cable and connector',v=>`The markers illustrate current, not individual electrons. Charging current now ${v.currentA.toFixed(2)} A.`]],
 INTERNAL_STATION:[['INTERNAL_RESISTOR','HOT_INTERNAL_R','Internal resistance',v=>`Inside the cell model: ${v.lostW.toFixed(2)} W becomes heat. This colour cue is an estimate, not a measured temperature.`],['LOAD_DEMO',null,'External load',v=>`Outside the cell: draws ${v.loadA.toFixed(1)} A. Terminal voltage is ${v.terminalV.toFixed(2)} V after the internal voltage drop.`]],
 PARALLEL_STATION:[['PARALLEL_SCREEN','HOT_PARALLEL_SCREEN','Screen branch',v=>`${v.screenA.toFixed(1)} A at ${v.voltage.toFixed(2)} V. Each parallel branch has the same voltage.`],['PARALLEL_MODEM','HOT_MODEM','Modem branch',v=>`${v.modemA.toFixed(1)} A. Total current ${v.totalA.toFixed(2)} A; this battery lasts about ${v.hoursFlat.toFixed(1)} h in the model.`]],
 WIRELESS_STATION:[['QI_TRANSMITTER','HOT_TRANSMITTER','Transmitter · pad',v=>`Alternating current at ${v.frequencyKHz} kHz produces a changing magnetic field. Field markers are greatly slowed down.`],['QI_RECEIVER','HOT_RECEIVER','Receiver · phone',v=>`${v.receiverTurns} turns · induced emf ≈ ${v.inducedV.toFixed(1)} V (estimate). Gap ${v.gapMm.toFixed(1)} mm; displayed spacing is 5×.`]],
 CAPACITOR_STATION:[['SERIES_RESISTOR','HOT_SERIES_R','Series resistor',v=>`${v.resistanceOhm} Ω · time constant τ = RC = ${v.tauMs.toFixed(1)} ms. Changing R or C resets the capacitor.`],['CAPACITOR_DEMO','HOT_CAPACITOR','Capacitor plates',v=>`${v.capacitanceUF} μF · ${v.capacitorV.toFixed(2)} V now. Charge markers increase with the model voltage; plate size and separation stay fixed.`]]
};

export async function loadPhone(S,read){
 const {THREE}=S;
 const {GLTFLoader}=await import('../../ar/vendor/three/loaders/GLTFLoader.js');
 const results=await Promise.allSettled([
   new GLTFLoader().loadAsync('/assets/models/phone/assembl-phone-atelier-web.glb'),
   fetch('/assets/models/phone/phone-rig-contract.json').then(r=>{if(!r.ok)throw Error('Phone contract '+r.status);return r.json()})
 ]);
 const root=results[0].status==='fulfilled'?results[0].value.scene:null;
 if(results.some(r=>r.status==='rejected')){disposePhone(root);throw results.find(r=>r.status==='rejected').reason}
 const contract=results[1].value;
 try{
  if(contract.contract!=='assembl.phone.v1'||contract.units!=='metres'||contract.coordinates.legacy_scene_units_per_metre!==UNITS)throw Error('Unsupported phone rig');
  const rig=createPhoneRig(root),nodes=rig.nodes;
  for(const name of Object.keys(contract.nodes))if(!nodes[name])throw Error('Missing contracted node '+name);
  root.scale.setScalar(UNITS);S.scene.add(root);root.updateMatrixWorld(true);
  root.traverse(o=>{if(o.isMesh){o.castShadow=!o.material.transparent;o.receiveShadow=true}});
  S.renderer.toneMapping=THREE.ACESFilmicToneMapping;S.renderer.toneMappingExposure=1.12;S.scene.fog=null;S.scene.background=new THREE.Color('#f7f3ec');S.ground.material.opacity=.13;S.sun.intensity=2.1;
  const overlay=new THREE.Group();root.add(overlay);
  const partSelect=document.getElementById('phone-part'),description=document.getElementById('phone-part-description'),apparatusSelect=document.getElementById('phone-apparatus');
  const label=S.label({off:[12,-32]}),txLabel=S.label({off:[-15,30]}),rxLabel=S.label({off:[12,-28]});
  let activated=false,active='CHARGE_STATION',topic='charge',selected='',lastScreen='',disposed=false,lastFrame=performance.now();const timings=[];
  const screenCanvas=document.createElement('canvas');screenCanvas.width=768;screenCanvas.height=346;
  const screenTexture=new THREE.CanvasTexture(screenCanvas);screenTexture.colorSpace=THREE.SRGBColorSpace;screenTexture.flipY=false;
  const screenMaterial=new THREE.MeshBasicMaterial({map:screenTexture,toneMapped:false});
  nodes.SCREEN_SURFACE.traverse(o=>{if(o.isMesh)o.material=screenMaterial});
  // An unobtrusive receiver outline keeps the cutaway visibly part of a phone.
  const outlineGeo=new THREE.EdgesGeometry(new THREE.BoxGeometry(.147,.008,.072));
  const outline=new THREE.LineSegments(outlineGeo,new THREE.LineBasicMaterial({color:'#91afc5',transparent:true,opacity:.45}));
  const shellBounds=new THREE.Box3().setFromObject(nodes.QI_PHONE_SHELL),centre=shellBounds.getCenter(new THREE.Vector3());
  nodes.QI_PHONE_ROOT.worldToLocal(centre);outline.position.copy(centre);nodes.QI_PHONE_ROOT.add(outline);
  const beadGeo=new THREE.SphereGeometry(.0016,8,6),flowMat=new THREE.MeshBasicMaterial({color:'#c58668'}),blueMat=new THREE.MeshBasicMaterial({color:'#658cb9'});
  const flowDefs=[['USB_CHARGE_PATH','CHARGE_STATION',v=>v.currentA],['INTERNAL_FLOW','INTERNAL_STATION',v=>v.loadA],['PARALLEL_FLOW_SCREEN','PARALLEL_STATION',v=>v.screenA],['PARALLEL_FLOW_MODEM','PARALLEL_STATION',v=>v.modemA],['CAP_POS_PATH','CAPACITOR_STATION',v=>1-v.capacitorFraction],['CAP_RESISTOR_TO_PLATE','CAPACITOR_STATION',v=>1-v.capacitorFraction],['CAP_NEG_PATH','CAPACITOR_STATION',v=>1-v.capacitorFraction]];
  const flows=flowDefs.map(([name,station,current],index)=>{
    const p=contract.paths[name],points=p.points_gltf_local_m.map(a=>new THREE.Vector3(...a)),curve=new THREE.CurvePath();
    if(name==='USB_CHARGE_PATH')curve.add(new THREE.CatmullRomCurve3(points));else for(let i=1;i<points.length;i++)curve.add(new THREE.LineCurve3(points[i-1],points[i]));
    const mesh=S.swarm(14,beadGeo,index===3?blueMat:flowMat);nodes[p.parent].add(mesh);
    return {mesh,curve,station,current,phase:0};
  });
  const charges=['CAP_CHARGE_POS','CAP_CHARGE_NEG'].map((name,i)=>{const mesh=S.swarm(64,beadGeo,i?blueMat:flowMat);nodes[name].add(mesh);return mesh});
  // Slowed field cue joins the actual coil axes, without estimating a field solution.
  const field=new THREE.Group();overlay.add(field);
  const fieldLines=Array.from({length:6},(_,i)=>{
    const geometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]);
    const line=new THREE.Line(geometry,new THREE.LineBasicMaterial({color:'#bc9bbf',transparent:true,opacity:.45}));field.add(line);return line;
  });let fieldPhase=0;
  const gapLine=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]),new THREE.LineBasicMaterial({color:'#526982'}));overlay.add(gapLine);
  const point=(name)=>nodes[name].getWorldPosition(new THREE.Vector3());
  const labelsFor=()=>PARTS[active];
  function select(name){selected=name;partSelect.value=name;label.show(false);const part=labelsFor().find(p=>p[0]===name);if(part)description.textContent=part[3](read(S.api.step))}
  partSelect.onchange=()=>select(partSelect.value);
  for(const parts of Object.values(PARTS))for(const [name]of parts)if(nodes[name])S.pick(nodes[name],()=>select(name));
  function fit(){
    root.updateMatrixWorld(true);
    // Include maximum teaching poses so changing a gap or charge never pans the experiment.
    const framing=active==='CHARGE_STATION'?['PHONE_ROOT','CHARGER_ROOT','USB_CABLE']:active==='WIRELESS_STATION'?['QI_PAD_ROOT']:[active];
    const bounds=new THREE.Box3();
    for(const name of framing){const bb=contract.nodes[name].world_bounds_gltf_m;bounds.expandByPoint(new THREE.Vector3(...bb.min).multiplyScalar(UNITS));bounds.expandByPoint(new THREE.Vector3(...bb.max).multiplyScalar(UNITS))}
    if(active==='WIRELESS_STATION')bounds.max.y=2.0;
    if(active==='CHARGE_STATION')bounds.max.y=3.2;
    const target=bounds.getCenter(new THREE.Vector3()),portraitPhone=active==='CHARGE_STATION'&&S.camera.aspect<1.15;
    const dir=(portraitPhone?new THREE.Vector3(1.15,1.15,.45):new THREE.Vector3(active==='WIRELESS_STATION'?.32:.55,active==='WIRELESS_STATION'?.58:.95,1)).normalize();
    const aspect=Math.max(.3,S.camera.aspect),vf=THREE.MathUtils.degToRad(S.camera.fov/2),hf=Math.atan(Math.tan(vf)*aspect);
    const right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),dir).normalize(),up=new THREE.Vector3().crossVectors(dir,right);let distance=0;
    for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
      const d=new THREE.Vector3(x,y,z).sub(target);distance=Math.max(distance,d.dot(dir)+Math.max(Math.abs(d.dot(right))/Math.tan(hf),Math.abs(d.dot(up))/Math.tan(vf))*1.12);
    }
    S.view('phone-active',target.clone().addScaledVector(dir,distance).toArray(),target.toArray(),{min:distance*.45,max:distance*2.5});S.goView('phone-active',true);S.setShadowBox(8,[target.x,0,target.z]);
  }
  function activate(st){
    const next=st.k==='test'?apparatusSelect.value:stationFor(st.k);
    if(activated&&topic===st.k&&active===next)return;activated=true;topic=st.k;active=next;
    S.canvas.setAttribute('aria-label',({CHARGE_STATION:'Phone, battery layers and USB-C charger',INTERNAL_STATION:'Cell internal resistance and a separate external load',PARALLEL_STATION:'Screen and modem connected in parallel',WIRELESS_STATION:'Pad transmitter and phone receiver coils; spacing shown at five times actual gap',CAPACITOR_STATION:'Resistor and fixed capacitor plates'}[active])+'. Drag or use arrow keys to orbit, + and − to zoom, Home to reset. Component explanations are below.');
    rig.setView({station:active,wirelessCutaway:true});
    partSelect.replaceChildren(...labelsFor().map(([name,,title])=>{const o=document.createElement('option');o.value=name;o.textContent=title;return o}));select(labelsFor()[0][0]);
    document.getElementById('phone-test-view').hidden=st.k!=='test';document.getElementById('phone-spacing-note').hidden=active!=='WIRELESS_STATION';
    applyPhonePose(rig,read(st));root.updateMatrixWorld(true);fit();
  }
  apparatusSelect.onchange=()=>activate(S.api.step);
  function update(state,st,dt){
    if(disposed)return;const v=read(st);applyPhonePose(rig,v);root.updateMatrixWorld(true);
    const selectedPart=labelsFor().find(p=>p[0]===selected)||labelsFor()[0];const [name,anchor,title,explain]=selectedPart;
    description.textContent=explain(v);label.show(active!=='WIRELESS_STATION'&&active!=='INTERNAL_STATION');
    if(nodes[anchor||name])label.at(point(anchor||name)).set(title);
    if(active==='WIRELESS_STATION'){
      txLabel.show().at(point('HOT_TRANSMITTER')).set('Transmitter · pad');rxLabel.show().at(point('HOT_RECEIVER')).set(`Receiver · phone<b>${v.gapMm.toFixed(1)} mm · spacing 5×</b>`);
    }else if(active==='INTERNAL_STATION'){
      txLabel.show().at(point('HOT_INTERNAL_R')).set(`Internal resistance<b>${v.lostW.toFixed(2)} W heat</b>`);
      const load=nodes.LOAD_DEMO;rxLabel.show().at(load.getWorldPosition(new THREE.Vector3())).set(`External load<b>${v.terminalV.toFixed(2)} V · ${v.loadA.toFixed(1)} A</b>`);
    }else if(active==='PARALLEL_STATION'){label.hide();txLabel.show().at(point('HOT_PARALLEL_SCREEN')).set(`Screen branch<b>${v.screenA.toFixed(1)} A</b>`);rxLabel.show().at(point('HOT_MODEM')).set(`Modem branch<b>${v.modemA.toFixed(1)} A</b>`)}else{txLabel.hide();rxLabel.hide()}
    // Heat cue responds to the unchanged I²r output; it is deliberately labelled an estimate.
    nodes.INTERNAL_RESISTOR.traverse(o=>{if(o.isMesh&&o.material.name==='HEAT_CUE_MAT')o.material.color.set('#edc0bb').lerp(new THREE.Color('#cc8068'),Math.min(1,v.lostW/4.8))});
    const key=[Math.round(v.indicatorFraction*100),v.phase,st.k].join('|');
    if(key!==lastScreen){lastScreen=key;const c=screenCanvas.getContext('2d');c.fillStyle='#d6e6ed';c.fillRect(0,0,768,346);c.textAlign='center';c.fillStyle='#344668';c.font='600 80px system-ui';c.fillText(Math.round(v.indicatorFraction*100)+'%',384,168);c.font='28px system-ui';c.fillText(['fast','ccv','test'].includes(st.k)?v.phase:'charge indicator',384,230);screenTexture.needsUpdate=true}
    for(const f of flows){f.mesh.visible=f.station===active;const current=Math.max(0,f.current(v));if(v.playing&&!S.REDUCED)f.phase=(f.phase+dt*(.04+current*.035))%1;
      for(let i=0;i<14;i++){const p=f.curve.getPoint((i/14+f.phase)%1);f.mesh.put(i,p.x,p.y+.001,p.z,current>1e-5?1:0)}f.mesh.done();}
    charges.forEach(mesh=>{for(let i=0;i<64;i++)mesh.put(i,0,-.018+Math.floor(i/8)*.0051,-.018+(i%8)*.0051,i<Math.round(v.capacitorFraction*64)?1:0);mesh.done()});
    field.visible=gapLine.visible=active==='WIRELESS_STATION';
    if(field.visible){
      if(v.playing&&!S.REDUCED)fieldPhase=(fieldPhase+dt*v.frequencyKHz/140)%1;
      const a=overlay.worldToLocal(point('QI_TX_AXIS')),b=overlay.worldToLocal(point('QI_RX_AXIS'));
      const face=overlay.worldToLocal(nodes.QI_PHONE_ROOT.localToWorld(new THREE.Vector3(-.064,0,0)));const padY=face.y-v.gapMm/1000*GAP_MAGNIFICATION;
      fieldLines.forEach((line,i)=>{const angle=i/6*Math.PI*2,dx=Math.cos(angle)*.014,dz=Math.sin(angle)*.014;line.geometry.attributes.position.setXYZ(0,a.x+dx,a.y,a.z+dz);line.geometry.attributes.position.setXYZ(1,b.x+dx,b.y,b.z+dz);line.geometry.attributes.position.needsUpdate=true;line.material.opacity=S.REDUCED?.45:.3+.2*Math.sin(fieldPhase*Math.PI*2)});
      gapLine.geometry.attributes.position.setXYZ(0,face.x,padY,face.z);gapLine.geometry.attributes.position.setXYZ(1,face.x,face.y,face.z);gapLine.geometry.attributes.position.needsUpdate=true;
    }
    const now=performance.now();if(dt>0&&timings.length<600)timings.push(now-lastFrame);lastFrame=now;
    if(/[?&]debug\b/.test(location.search)){
      const times=timings.slice().sort((a,b)=>a-b);S.canvas.dataset.review=JSON.stringify({topic:st.k,station:active,unitsPerMetre:UNITS,gapMagnification:GAP_MAGNIFICATION,physicalGapMm:v.gapMm,receiverY:nodes.QI_PHONE_ROOT.position.y,turns:v.receiverTurns,phase:v.phase,currentA:v.currentA,charge:v.indicatorFraction,capacitorV:v.capacitorV,playing:v.playing,calls:S.renderer.info.render.calls,triangles:S.renderer.info.render.triangles,medianFrameMs:times[Math.floor(times.length*.5)]||0,p95FrameMs:times[Math.floor(times.length*.95)]||0,camera:S.camera.position.toArray()});
    }
  }
  return {step:activate,resize:fit,update,rig,dispose(){if(disposed)return;disposed=true;partSelect.onchange=apparatusSelect.onchange=null;label.hide();txLabel.hide();rxLabel.hide();disposePhone(root)}};
 }catch(error){disposePhone(root);throw error}
}
