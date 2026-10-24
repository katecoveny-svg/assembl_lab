(()=>{
// ---------- model: 0.5 kg of water from -20°C ice, heated at a set power
const MASS=0.5, C_ICE=2.1, C_WATER=4.18, C_STEAM=2.0, L_F=334, L_V=2260; // kJ/kg·K and kJ/kg
const PLACES=[["0","Auckland (sea level)"],["1130","Arthur's Pass village (740 m)"],["2797","Ruapehu summit (2,797 m)"],["3724","Aoraki / Mt Cook summit (3,724 m)"],["8849","Everest summit (8,849 m)"]];
function boilPoint(h){const P=101.325*Math.pow(1-2.25577e-5*h,5.25588);const T=1/(1/373.15-8.314/40660*Math.log(P/101.325));return T-273.15}
function pressureAt(h){return 101.325*Math.pow(1-2.25577e-5*h,5.25588)}
const ALT={"0":0,"1130":740,"2797":2797,"3724":3724,"8849":8849};
function stages(Tb){
  const q1=MASS*C_ICE*20, q2=q1+MASS*L_F, q3=q2+MASS*C_WATER*Tb, q4=q3+MASS*L_V, q5=q4+MASS*C_STEAM*30;
  return{q1,q2,q3,q4,q5};
}
function stateFrom(Q,Tb){const S=stages(Tb);
  if(Q<S.q1)return{T:-20+Q/(MASS*C_ICE),solid:1,liquid:0,gas:0,phase:"Solid ice",zone:0};
  if(Q<S.q2){const f=(Q-S.q1)/(MASS*L_F);return{T:0,solid:1-f,liquid:f,gas:0,phase:"Melting",zone:1}}
  if(Q<S.q3)return{T:(Q-S.q2)/(MASS*C_WATER),solid:0,liquid:1,gas:0,phase:"Liquid water",zone:2};
  if(Q<S.q4){const f=(Q-S.q3)/(MASS*L_V);return{T:Tb,solid:0,liquid:1-f,gas:f,phase:"Boiling",zone:3}}
  return{T:Tb+Math.min(30,(Q-S.q4)/(MASS*C_STEAM)),solid:0,liquid:0,gas:1,phase:"Steam",zone:4};
}
const s={Q:0,power:2.0,alt:"0",time:0,vol:60,gasT:20};
const Tb=()=>boilPoint(ALT[s.alt]);

// ---------- particles
const N=64, P=[];
for(let i=0;i<N;i++){const c=i%8,r=Math.floor(i/8);P.push({lx:0,ly:0,x:0,y:0,vx:0,vy:0,c,r,kind:"solid",seed:Math.random()*6.28})}
// beaker interior: x 150..390, y 70..290 (bottom)
const BX0=150,BX1=390,BY0=70,BY1=290;
function lattice(p){return{x:BX0+30+p.c*25,y:BY1-14-p.r*13}}
function updateParticles(dt){
  const st=stateFrom(s.Q,Tb()), T=st.T+273.15, nS=Math.round(st.solid*N), nG=Math.round(st.gas*N);
  P.forEach((p,i)=>{const want=i<nS&&st.solid>0?"solid":i>=N-nG?"gas":"liquid";
    if(p.kind!==want){if(want==="gas"){p.vy=-60-Math.random()*40;p.vx=(Math.random()-.5)*120}p.kind=want}
    const sp=Math.sqrt(T/273);
    if(p.kind==="solid"){const L=lattice(p);const a=1.2+2.2*Math.max(0,(st.T+20)/20);p.seed+=dt*18;p.x=L.x+Math.sin(p.seed*1.3)*a;p.y=L.y+Math.cos(p.seed*1.7)*a}
    else if(p.kind==="liquid"){const top=BY1-Math.max(26,(1-st.gas)*112);
      p.vx+=(Math.random()-.5)*600*sp*dt;p.vy+=(Math.random()-.5)*600*sp*dt+40*dt;
      const lim=70*sp;p.vx=Math.max(-lim,Math.min(lim,p.vx));p.vy=Math.max(-lim,Math.min(lim,p.vy));
      p.x+=p.vx*dt;p.y+=p.vy*dt;
      if(p.x<BX0+6){p.x=BX0+6;p.vx=Math.abs(p.vx)}if(p.x>BX1-6){p.x=BX1-6;p.vx=-Math.abs(p.vx)}
      if(p.y>BY1-6){p.y=BY1-6;p.vy=-Math.abs(p.vy)}if(p.y<top){p.y=top;p.vy=Math.abs(p.vy)}}
    else{const v=170*sp;const m=Math.hypot(p.vx,p.vy)||1;p.vx=p.vx/m*v;p.vy=p.vy/m*v;p.x+=p.vx*dt;p.y+=p.vy*dt;
      if(p.x<BX0+6){p.x=BX0+6;p.vx=Math.abs(p.vx)}if(p.x>BX1-6){p.x=BX1-6;p.vx=-Math.abs(p.vx)}
      if(p.y>BY1-6){p.y=BY1-6;p.vy=-Math.abs(p.vy)}if(p.y<BY0-40){p.y=BY0-40;p.vy=Math.abs(p.vy)}}
  });
}
// syringe gas (pressure step)
const G=[];for(let i=0;i<26;i++)G.push({x:Math.random(),y:Math.random(),vx:Math.random()-.5,vy:Math.random()-.5});
let hits=0,hitRate=0,hitClock=0;
function updateGas(dt){const sp=0.9*Math.sqrt((s.gasT+273)/293);
  G.forEach(g=>{const m=Math.hypot(g.vx,g.vy)||1;g.vx=g.vx/m*sp;g.vy=g.vy/m*sp;g.x+=g.vx*dt*(100/s.vol);g.y+=g.vy*dt;
    if(g.x<0){g.x=0;g.vx=Math.abs(g.vx)}if(g.x>1){g.x=1;g.vx=-Math.abs(g.vx);hits++}if(g.y<0){g.y=0;g.vy=Math.abs(g.vy)}if(g.y>1){g.y=1;g.vy=-Math.abs(g.vy)}});
  hitClock+=dt;if(hitClock>1){hitRate=hits/hitClock;hits=0;hitClock=0}}
const pressure=()=>101.3*(60/s.vol)*((s.gasT+273)/293);

// ---------- drawing
function drawMain(st0,step){
  if(step.k==="pressure")return drawSyringe();
  const st=stateFrom(s.Q,Tb());
  let o=`<rect width="640" height="330" fill="var(--chalk)"/>`;
  // hotplate
  const glow=s.playing&&step.speed?Math.min(1,s.power/3):0.05;
  o+=`<rect x="130" y="296" width="280" height="16" rx="4" fill="var(--fill)" stroke="var(--ink)"/>`;
  for(let i=0;i<5;i++)o+=`<path d="M${160+i*50},304 q12,-6 24,0 t24,0" fill="none" stroke="var(--hot)" stroke-width="2.4" opacity="${0.2+0.8*glow}"/>`;
  o+=`<rect x="120" y="312" width="300" height="10" rx="3" fill="var(--ink)"/>`;
  // beaker
  o+=`<path d="M${BX0-6},40 L${BX0-6},${BY1+4} Q${BX0-6},${BY1+6} ${BX0},${BY1+6} L${BX1},${BY1+6} Q${BX1+6},${BY1+6} ${BX1+6},${BY1+4} L${BX1+6},40" fill="none" stroke="var(--ink)" stroke-width="2"/>`;
  for(let k=1;k<=4;k++)o+=`<line x1="${BX1-10}" y1="${BY1-k*45}" x2="${BX1+4}" y2="${BY1-k*45}" stroke="var(--rose)"/>`;
  // water surface
  if(st.liquid>0.02){const top=BY1-Math.max(26,(1-st.gas)*112);o+=`<rect x="${BX0}" y="${top}" width="${BX1-BX0}" height="${BY1-top+4}" fill="var(--sea)" opacity="0.14"/>`}
  P.forEach(p=>{const c=p.kind==="solid"?"var(--paper)":p.kind==="liquid"?"var(--sea)":"var(--hot)";
    o+=`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="5.2" fill="${c}" stroke="${p.kind==="solid"?"var(--cold)":"var(--ink)"}" stroke-width="${p.kind==="solid"?1.6:.6}" opacity="${p.kind==="gas"?0.85:1}"/>`;
    if(p.kind==="solid")o+=``});
  // bonds in solid
  P.forEach(p=>{if(p.kind!=="solid")return;const q=P[p.r*8+p.c+1];if(p.c<7&&q.kind==="solid")o+=`<line x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}" stroke="var(--cold)" stroke-width=".8" opacity=".5"/>`});
  // thermometer
  const tx=500,ty0=50,ty1=270,Tmin=-30,Tmax=140,Y=T=>ty1-(T-Tmin)/(Tmax-Tmin)*(ty1-ty0);
  o+=`<rect x="${tx-9}" y="${ty0-10}" width="18" height="${ty1-ty0+20}" rx="9" fill="var(--paper)" stroke="var(--ink)" stroke-width="1.4"/>`;
  o+=`<circle cx="${tx}" cy="${ty1+22}" r="15" fill="var(--hot)" stroke="var(--ink)" stroke-width="1.4"/>`;
  o+=`<rect x="${tx-4}" y="${Y(st.T)}" width="8" height="${ty1+10-Y(st.T)}" fill="var(--hot)"/>`;
  for(let T=-20;T<=140;T+=20)o+=`<line x1="${tx+10}" x2="${tx+18}" y1="${Y(T)}" y2="${Y(T)}" stroke="var(--rose)"/><text class="t-lab" x="${tx+22}" y="${Y(T)+3.5}">${T}°</text>`;
  o+=`<line x1="${tx-16}" x2="${tx+10}" y1="${Y(Tb())}" y2="${Y(Tb())}" stroke="var(--hot)" stroke-dasharray="3 3"/><text class="t-lab" x="${tx-20}" y="${Y(Tb())+3.5}" text-anchor="end">BOILS ${Tb().toFixed(0)}°</text>`;
  o+=`<line x1="${tx-16}" x2="${tx+10}" y1="${Y(0)}" y2="${Y(0)}" stroke="var(--cold)" stroke-dasharray="3 3"/><text class="t-lab" x="${tx-20}" y="${Y(0)+3.5}" text-anchor="end">MELTS 0°</text>`;
  o+=`<text class="t-big" x="${tx+48}" y="${Y(st.T)+5}">${st.T.toFixed(1)}°C</text>`;
  // key
  o+=`<g class="t-lab"><circle cx="24" cy="24" r="5" fill="var(--paper)" stroke="var(--cold)" stroke-width="1.6"/><text x="34" y="27">ICE</text><circle cx="72" cy="24" r="5" fill="var(--sea)"/><text x="82" y="27">WATER</text><circle cx="134" cy="24" r="5" fill="var(--hot)"/><text x="144" y="27">STEAM</text></g>`;
  o+=`<text class="t-ink" x="616" y="24" text-anchor="end">${st.phase}</text>`;
  return o;
}
function drawSyringe(){
  let o=`<rect width="640" height="330" fill="var(--chalk)"/>`;
  const x0=90,y0=110,H=120,Wfull=360,W=Wfull*s.vol/100;
  o+=`<rect x="${x0}" y="${y0}" width="${Wfull+40}" height="${H}" rx="8" fill="var(--paper)" stroke="var(--ink)" stroke-width="1.6"/>`;
  for(let k=0;k<=10;k++)o+=`<line x1="${x0+k*Wfull/10}" x2="${x0+k*Wfull/10}" y1="${y0}" y2="${y0+(k%5?8:14)}" stroke="var(--rose)"/>`;
  o+=`<rect x="${x0}" y="${y0+4}" width="${W}" height="${H-8}" fill="var(--hot)" opacity=".08"/>`;
  G.forEach(g=>{o+=`<circle cx="${(x0+6+g.x*(W-12)).toFixed(1)}" cy="${(y0+8+g.y*(H-16)).toFixed(1)}" r="5" fill="var(--hot)" stroke="var(--ink)" stroke-width=".6"/>`});
  o+=`<rect x="${x0+W}" y="${y0+2}" width="12" height="${H-4}" rx="3" fill="var(--ink)"/><rect x="${x0+W+12}" y="${y0+H/2-6}" width="${Wfull+40-W+30}" height="12" fill="var(--rose)"/><rect x="${x0+Wfull+82}" y="${y0+20}" width="12" height="${H-40}" rx="3" fill="var(--ink)"/>`;
  // gauge
  const p=pressure(),a=-210+Math.min(240,p/400*240);const gx=560,gy=60;
  o+=`<circle cx="${gx}" cy="${gy}" r="34" fill="var(--paper)" stroke="var(--ink)" stroke-width="1.4"/><line x1="${gx}" y1="${gy}" x2="${gx+26*Math.cos(a*Math.PI/180)}" y2="${gy+26*Math.sin(a*Math.PI/180)}" stroke="var(--hot)" stroke-width="2.4"/><circle cx="${gx}" cy="${gy}" r="3" fill="var(--ink)"/>`;
  o+=`<path d="M${gx},${gy+34} L${gx},${y0} L${x0+6},${y0}" fill="none" stroke="var(--ink)" stroke-width="1.2"/>`;
  o+=`<text class="t-big" x="${gx-44}" y="${gy+5}" text-anchor="end">${p.toFixed(0)} kPa</text>`;
  o+=`<text class="t-lab" x="${x0}" y="${y0+H+26}">SEALED SYRINGE OF AIR · ${s.vol} mL · ${s.gasT}°C · ${hitRate.toFixed(0)} HITS A SECOND ON THE PLUNGER</text>`;
  return o;
}
function drawClose(st0,step){
  let o=`<rect width="420" height="260" fill="var(--chalk)"/>`;
  if(step.k==="pressure"){
    o+=`<text class="t-lab" x="14" y="22">PRESSURE AGAINST VOLUME (SAME TEMPERATURE)</text>`;
    const X=v=>50+(v-20)/80*340,Y=p=>220-p/320*180;let d="";for(let v=20;v<=100;v+=2)d+=(v>20?"L":"M")+X(v)+","+Y(101.3*60/v*((s.gasT+273)/293));
    o+=`<line x1="50" y1="220" x2="390" y2="220" stroke="var(--rose)"/><line x1="50" y1="40" x2="50" y2="220" stroke="var(--rose)"/><path d="${d}" fill="none" stroke="var(--hot)" stroke-width="2"/>`;
    [20,40,60,80,100].forEach(v=>o+=`<text class="t-lab" x="${X(v)}" y="236" text-anchor="middle">${v}</text>`);
    [0,100,200,300].forEach(p=>o+=`<text class="t-lab" x="44" y="${Y(p)+3.5}" text-anchor="end">${p}</text>`);
    o+=`<text class="t-lab" x="220" y="252" text-anchor="middle">VOLUME (mL)</text><circle cx="${X(s.vol)}" cy="${Y(pressure())}" r="6" fill="var(--sun)" stroke="var(--ink)"/>`;
    return o;
  }
  const S=stages(Tb()),st=stateFrom(s.Q,Tb());
  o+=`<text class="t-lab" x="14" y="22">HEATING CURVE · TEMPERATURE AGAINST HEAT ADDED</text>`;
  const X=q=>50+q/S.q5*350,Y=T=>210-(T+30)/170*170;
  const pts=[[0,-20],[S.q1,0],[S.q2,0],[S.q3,Tb()],[S.q4,Tb()],[S.q5,Tb()+30]];
  o+=`<line x1="50" y1="210" x2="400" y2="210" stroke="var(--rose)"/><line x1="50" y1="36" x2="50" y2="210" stroke="var(--rose)"/>`;
  [-20,0,50,100].forEach(T=>o+=`<text class="t-lab" x="44" y="${Y(T)+3.5}" text-anchor="end">${T}°</text>`);
  o+=`<path d="${pts.map((p,i)=>(i?"L":"M")+X(p[0])+","+Y(p[1])).join("")}" fill="none" stroke="var(--line)" stroke-width="3"/>`;
  // progress so far
  const done=pts.filter(p=>p[0]<=s.Q);done.push([s.Q,st.T]);
  o+=`<path d="${done.map((p,i)=>(i?"L":"M")+X(p[0])+","+Y(p[1])).join("")}" fill="none" stroke="var(--ink)" stroke-width="2.4"/>`;
  o+=`<circle cx="${X(s.Q)}" cy="${Y(st.T)}" r="6" fill="var(--sun)" stroke="var(--ink)"/>`;
  o+=`<text class="t-lab" x="${X(S.q1)+4}" y="${Y(0)-8}">MELTING</text><text class="t-lab" x="${(X(S.q3)+X(S.q4))/2}" y="${Y(Tb())-8}" text-anchor="middle">BOILING: TEMPERATURE STAYS FLAT</text>`;
  o+=`<text class="t-lab" x="225" y="232" text-anchor="middle">HEAT ADDED (kJ) →</text><text class="t-lab" x="400" y="232" text-anchor="end">${Math.round(S.q5)}</text>`;
  o+=`<text class="t-big" x="14" y="252">${Math.round(s.Q)} kJ added · ${Math.floor(s.time/60)} min ${Math.round(s.time%60)} s at ${s.power.toFixed(1)} kW</text>`;
  return o;
}
function jump(zone){const S=stages(Tb());s.Q=[0,S.q1+1,S.q2+1,S.q3+1,S.q3+1][zone];s.time=s.Q/s.power}
const SPEED=24;
const steps=[
 {k:"particles",lab:"Particles",cap:"Everything is made of tiny particles that never stop moving. In ice they are locked in place and can only vibrate.",speed:0,
  big:"<b>The big idea:</b> solids, liquids and gases are the same particles. What changes is how much they move and how tightly they hold on to each other.",
  exam:"In a solid the particles are held tightly in a fixed pattern by strong forces of attraction, so they can only vibrate on the spot. This is why a solid keeps its shape.",
  trap:"Saying the particles in a solid don't move. They do: they vibrate in fixed positions.",chips:["temp","state","energy"],onStep:()=>{s.Q=0;s.time=0}},
 {k:"heat",lab:"Heat it",cap:"Turn on the hotplate. Heat energy makes the ice particles vibrate faster, so the temperature rises.",speed:SPEED,speedLabel:"24× real time",
  big:"<b>The big idea:</b> temperature measures how fast the particles are moving on average. Adding heat speeds them up.",
  exam:"When the ice is heated, its particles gain kinetic energy and vibrate faster, so the temperature of the ice rises.",
  trap:"Mixing up heat and temperature. Heat is energy going in; temperature is how fast the particles are moving.",chips:["temp","state","energy","time"],onStep:()=>{s.Q=0;s.time=0}},
 {k:"melt",lab:"Melting",cap:"At 0°C the temperature stops rising even though heat keeps going in. The energy is breaking the ice's hold on its particles.",speed:SPEED,speedLabel:"24× real time",
  big:"<b>The big idea:</b> during a change of state, heat breaks the forces between particles instead of speeding them up, so the temperature stays flat.",
  exam:"While the ice melts, the temperature stays at 0°C. The heat energy is used to overcome the forces of attraction holding the particles in their fixed positions, not to make them move faster.",
  trap:"Expecting the thermometer to keep climbing during melting. Look for the flat part of the heating curve.",chips:["temp","state","melted","energy"],onStep:()=>jump(1)},
 {k:"warm",lab:"Warming water",cap:"Now it's all liquid. The particles slide past each other and move faster as the water heats up.",speed:SPEED,speedLabel:"24× real time",
  big:"<b>The big idea:</b> in a liquid the particles are still close together but can move past each other, so a liquid flows and takes the shape of its container.",
  exam:"In a liquid the particles are close together but not in fixed positions, so they can slide past each other. As the water is heated, the particles move faster and the temperature rises.",
  trap:"Drawing liquid particles spread far apart. They stay almost as close as in a solid.",chips:["temp","state","energy"],onStep:()=>jump(2)},
 {k:"boil",lab:"Boiling",cap:"At boiling point the temperature goes flat again. Particles gain enough energy to escape as a gas.",speed:SPEED,speedLabel:"24× real time",
  big:"<b>The big idea:</b> boiling takes far more energy than melting: 2,260 kJ for each kilogram, nearly seven times more.",
  exam:"At 100°C the water boils and the temperature stays the same. The heat energy is used to overcome the forces between the particles so they can escape and spread out as a gas.",
  trap:"Thinking the bubbles in boiling water are air. They are water vapour.",chips:["temp","state","boiled","energy"],onStep:()=>jump(3)},
 {k:"mountain",lab:"Up a mountain",cap:"Take the experiment up Ruapehu or Aoraki. Lower air pressure lets particles escape more easily, so water boils at a lower temperature.",speed:SPEED,speedLabel:"24× real time",controls:["play","restart","power","alt"],
  big:"<b>The big idea:</b> boiling point depends on the air pressure pushing on the water. On the summit of Aoraki / Mt Cook water boils at about 87°C.",
  exam:"At high altitude the air pressure is lower, so the water particles need less energy to escape from the liquid. This means water boils at a lower temperature, about 87°C on the summit of Aoraki / Mt Cook.",
  trap:"Thinking water always boils at 100°C. That is only at sea-level pressure.",chips:["place","boilpt","airp","temp"],onStep:()=>{if(s.alt==="0")s.alt="3724";jump(2)}},
 {k:"pressure",lab:"Gas pressure",cap:"Push the plunger in. The same gas particles hit the walls more often in a smaller space, so the pressure goes up.",speed:1,speedLabel:"real time",controls:["play","vol","gasT"],
  big:"<b>The big idea:</b> gas pressure is particles hitting the walls. Halve the volume and the pressure doubles; heat the gas and the hits get harder and more frequent.",
  exam:"Gas pressure is caused by particles colliding with the walls of their container. When the volume is made smaller, the particles hit the walls more often, so the pressure increases.",
  trap:"Saying the particles get smaller when a gas is squashed. The particles stay the same size; the spaces between them shrink.",chips:["vol","press","hits"]},
 {k:"test",lab:"Test yourself",cap:"Use the controls to set up each one, then press Check. The machine marks you using the same model that moves it.",speed:0,controls:["restart","power","alt","vol","gasT"],
  big:"<b>Exam tip:</b> name the particles, say what they're doing, then link it to what you can see: \"the particles…, so…\".",
  chips:["temp","state","place","press"]}
];
steps.forEach(st=>{if(!st.controls)st.controls=st.speed?["play","restart","power","alt"]:["restart","power","alt"]});
// ---- kupu Māori: te reo terms for this machine, each checked in Te Aka Māori Dictionary (ta = word id). Sources and notes: te-reo-notes.md
const KUPU=[
 {mi:"matūriki",en:"particle",ta:50542},
 {mi:"totoka",en:"solid",ta:8538},
 {mi:"wē",en:"liquid",ta:13057},
 {mi:"haurehu",en:"gas",ta:39276},
 {mi:"paemahana",en:"temperature",ta:39927,chip:["temp", "boilpt"]},
 {mi:"rewa",en:"to melt",ta:6746},
 {mi:"pae rewa",en:"melting point",ta:40108},
 {mi:"koropupū",en:"to boil, bubble up",ta:3056}];
Object.entries({"particles": ["matūriki", "totoka", "wē", "haurehu"], "heat": ["paemahana", "matūriki"], "melt": ["rewa", "pae rewa", "totoka", "wē"], "warm": ["paemahana"], "boil": ["koropupū", "haurehu"], "mountain": ["koropupū"], "pressure": ["haurehu"]}).forEach(([k,a])=>{const st=steps.find(x=>x.k===k);if(st)st.kupu=a});
StudyKit.mount({kupu:KUPU,
  eyebrow:"Science · Matter and particles", title:"The particle machine", crumb:"Year 9–10 science · foundation for NCEA Level 1 Chemistry and Biology", homeHash:"y9",
  fig:"FIG. 02 · KETTLE ON A HOTPLATE", railTitle:"What heat does to particles",
  mainBox:"0 0 640 330", mainPhoneBig:true, mainLabel:"Half a kilogram of ice in a beaker on a hotplate, shown as particles, with a thermometer", closeBox:"0 0 420 260",
  state:s, steps,
  controls:[{type:"play"},{type:"button",id:"restart",label:"Restart",onClick:()=>{s.Q=0;s.time=0}},
    {type:"range",id:"power",label:"Hotplate",min:0.5,max:3,step:0.1,get:()=>s.power,set:(x,v)=>{s.power=v},fmt:()=>s.power.toFixed(1)+" kW"},
    {type:"select",id:"alt",label:"Where",options:PLACES,get:()=>s.alt,set:(x,v)=>{s.alt=v}},
    {type:"range",id:"vol",label:"Volume",min:20,max:100,step:1,get:()=>s.vol,set:(x,v)=>{s.vol=v},fmt:()=>s.vol+" mL"},
    {type:"range",id:"gasT",label:"Gas temp",min:0,max:100,step:1,get:()=>s.gasT,set:(x,v)=>{s.gasT=v},fmt:()=>s.gasT+"°C"}],
  tick:(x,dt,st)=>{if(st.k==="pressure"){updateGas(dt);return}
    const S=stages(Tb());s.Q=Math.min(S.q5,s.Q+s.power*dt*st.speed);s.time+=dt*st.speed;updateParticles(dt);if(s.Q>=S.q5)s.playing=false},
  drawMain:(x,st)=>{if(!s.playing&&st.k!=="pressure")updateParticles(0.016);return drawMain(x,st)},
  drawClose,
  chips:(x,st)=>{const S=stateFrom(s.Q,Tb());return{
    temp:["TEMPERATURE",S.T.toFixed(1)+"°C",true],state:["STATE",S.phase],energy:["HEAT ADDED",Math.round(s.Q)+" kJ"],time:["TIME",`${Math.floor(s.time/60)} min ${Math.round(s.time%60)} s`],
    melted:["MELTED",Math.round(S.liquid*100+(S.zone>1?100:0))%101+"%"],boiled:["BOILED AWAY",Math.round(S.gas*100)+"%"],
    place:["WHERE",PLACES.find(p=>p[0]===s.alt)[1]],boilpt:["BOILS AT",Tb().toFixed(1)+"°C",true],airp:["AIR PRESSURE",pressureAt(ALT[s.alt]).toFixed(0)+" kPa"],
    vol:["VOLUME",s.vol+" mL"],press:["PRESSURE",pressure().toFixed(0)+" kPa",true],hits:["HITS A SECOND",hitRate.toFixed(0)]}},
  challenges:[
    {q:"Get the water boiling on Aoraki / Mt Cook. What temperature does the thermometer show?",check:()=>s.alt==="3724"&&stateFrom(s.Q,Tb()).zone===3,ok:()=>`Yes: it boils at ${Tb().toFixed(1)}°C because the air pressure up there is only about ${pressureAt(3724).toFixed(0)} kPa.`,no:"Not yet. Set Where to Aoraki / Mt Cook, then heat until the water boils."},
    {q:"Set the syringe so the pressure is double normal air pressure (about 200 kPa) at 20°C.",check:()=>Math.abs(pressure()-202.6)<12&&s.gasT===20,ok:"Yes. Halving the volume from 60 mL to 30 mL doubles the pressure.",no:()=>`Not yet: ${pressure().toFixed(0)} kPa. Keep the gas at 20°C and change the volume.`},
    {q:"Stop the experiment while the ice is exactly half melted.",check:()=>{const S=stateFrom(s.Q,Tb());return S.zone===1&&Math.abs(S.liquid-0.5)<0.08},ok:"Yes. Notice the thermometer: still 0°C, even though heat has been going in the whole time.",no:"Not yet. Go back to Melting, press Play, and pause when the chip shows about 50% melted."}],
  truth:"A simplified model: 0.5 kg of water, standard textbook values for specific heat and latent heat, no heat lost to the room, and particles drawn far bigger than they are. Boiling points use the standard atmosphere and are close to real values.",
  footer:"Matter and the particle model is core Year 9–10 science and underpins NCEA Level 1 Chemistry and Biology."
});
})();
