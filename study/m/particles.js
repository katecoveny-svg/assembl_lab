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

// ---------- drawing: the bench figure look (StudyKit.fig): frosted sky glassware on a steel hotplate, painted particles
const F=StudyKit.fig,PAL=F.palette,TINT=PAL.case.sky,GD=F.deep(TINT),AXIS="#8F9BAA";
const PC={solid:"#FFFFFF",liquid:PAL.product.blueberry,gas:PAL.product.strawberry},PS={solid:"#6E9FD0",liquid:F.mat("painted",PAL.product.blueberry).stroke,gas:F.mat("painted",PAL.product.strawberry).stroke};
function ball(x,y,r,kind,op){return `<g opacity="${op==null?1:op}"><circle cx="${x}" cy="${y}" r="${r}" fill="${PC[kind]}" stroke="${PS[kind]}" stroke-width="${kind==="solid"?1.5:.9}"/><circle cx="${(+x-r*0.34).toFixed(1)}" cy="${(+y-r*0.36).toFixed(1)}" r="${(r*0.32).toFixed(1)}" fill="#fff" opacity="${kind==="solid"?.9:.75}"/></g>`}
function drawMain(st0,step){
  if(step.k==="pressure")return drawSyringe();
  const st=stateFrom(s.Q,Tb());
  let o=F.floor(640,330);
  // hotplate: a steel box with a glowing coil on its top
  const glow=s.playing&&step.speed?Math.min(1,s.power/3):0.05,cx=(BX0+BX1)/2;
  o+=F.box(118,300,304,20,{colour:PAL.steel,kind:"metal",d:14,r:4,shadowLen:90});
  o+=`<ellipse cx="${cx+7}" cy="${296}" rx="128" ry="3.6" fill="${PAL.steelDark}" opacity=".5"/>`;
  for(let i=0;i<5;i++)o+=`<path d="M${154+i*50},298 q12,-4 24,0 t24,0" fill="none" stroke="${PAL.product.strawberry}" stroke-width="2.4" stroke-linecap="round" opacity="${0.2+0.8*glow}"/>`;
  o+=`<circle cx="396" cy="310" r="5.5" fill="${PAL.product.peach}" stroke="${F.mat("painted",PAL.product.peach).stroke}"/><circle cx="380" cy="310" r="2.6" fill="${PAL.product.strawberry}" opacity="${0.25+0.75*glow}"/>`;
  // beaker: frosted glass, back wall first
  const L=BX0-6,R=BX1+6,bt=40,bb=BY1+3,ry=5;
  o+=`<path d="M${L},${bt} V${bb} A${(R-L)/2},${ry} 0 0 0 ${R},${bb} V${bt}" fill="${TINT}" fill-opacity=".22"/><ellipse cx="${cx}" cy="${bt}" rx="${(R-L)/2}" ry="${ry}" fill="${TINT}" fill-opacity=".35" stroke="${GD}" stroke-width="1.2"/>`;
  // water: a blueberry body with a lit surface
  if(st.liquid>0.02){const top=BY1-Math.max(26,(1-st.gas)*112);o+=`<path d="M${BX0-4},${top} V${bb} A${(R-L)/2-2},${ry-1} 0 0 0 ${BX1+4},${bb} V${top}z" fill="${PAL.product.blueberry}" opacity=".24"/><ellipse cx="${cx}" cy="${top}" rx="${(R-L)/2-2}" ry="${ry-1}" fill="#DCEBFB" opacity=".7" stroke="${PS.liquid}" stroke-opacity=".4"/>`}
  // bonds in solid, then the particles
  P.forEach(p=>{if(p.kind!=="solid")return;const q=P[p.r*8+p.c+1];if(p.c<7&&q.kind==="solid")o+=`<line x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}" stroke="${GD}" stroke-width=".9" opacity=".6"/>`});
  P.forEach(p=>{o+=ball(p.x.toFixed(1),p.y.toFixed(1),5.2,p.kind,p.kind==="gas"?0.9:1)});
  // beaker front: rim, wall line, highlight streak, graduations
  o+=`<path d="M${L},${bt} V${bb} A${(R-L)/2},${ry} 0 0 0 ${R},${bb} V${bt}" fill="none" stroke="${GD}" stroke-width="1.6"/><path d="M${L},${bt} A${(R-L)/2},${ry} 0 0 0 ${R},${bt}" fill="none" stroke="${GD}" stroke-width="1.6"/>`;
  o+=`<path d="M${L+12},${bt+18} V${bb-14}" stroke="#fff" stroke-opacity=".8" stroke-width="3" stroke-linecap="round"/><path d="M${L+22},${bt+18} V${bt+90}" stroke="#fff" stroke-opacity=".55" stroke-width="1.6" stroke-linecap="round"/>`;
  for(let k=1;k<=4;k++)o+=`<line x1="${BX1-10}" y1="${BY1-k*45}" x2="${BX1+4}" y2="${BY1-k*45}" stroke="${GD}"/>`;
  o+=F.pill(20,92,"Beaker",{ax:L+2,ay:120})+F.pill(20,262,"Hotplate",{ax:126,ay:306});
  // thermometer: a frosted tube on a steel stand, strawberry spirit
  const tx=500,ty0=50,ty1=270,Tmin=-30,Tmax=140,Y=T=>ty1-(T-Tmin)/(Tmax-Tmin)*(ty1-ty0);
  o+=F.box(tx-26,304,52,8,{colour:PAL.steel,kind:"metal",d:10,r:3});
  const th=ty1-ty0+20,fr=Math.max(0,Math.min(1,(ty1+10-Y(st.T))/th));
  o+=F.tube(tx-9,ty0-10,18,th,fr,{tint:TINT,fill:PAL.product.strawberry,shadow:false});
  const bm=F.mat("painted",PAL.product.strawberry);o+=`<circle cx="${tx}" cy="${ty1+22}" r="15" fill="${bm.fill}" stroke="${bm.stroke}" stroke-width="1.3"/><circle cx="${tx-5}" cy="${ty1+17}" r="4.5" fill="#fff" opacity=".7"/>`;
  for(let T=-20;T<=140;T+=20)o+=`<line x1="${tx+10}" x2="${tx+18}" y1="${Y(T)}" y2="${Y(T)}" stroke="${AXIS}"/><text class="t-lab" x="${tx+22}" y="${Y(T)+3.5}">${T}°</text>`;
  o+=`<line x1="${tx-16}" x2="${tx+10}" y1="${Y(Tb())}" y2="${Y(Tb())}" stroke="${PS.gas}" stroke-dasharray="3 3"/><text class="t-lab" x="${tx-20}" y="${Y(Tb())+3.5}" text-anchor="end">BOILS ${Tb().toFixed(0)}°</text>`;
  o+=`<line x1="${tx-16}" x2="${tx+10}" y1="${Y(0)}" y2="${Y(0)}" stroke="${PS.liquid}" stroke-dasharray="3 3"/><text class="t-lab" x="${tx-20}" y="${Y(0)+3.5}" text-anchor="end">MELTS 0°</text>`;
  o+=`<text class="t-big" x="${tx+48}" y="${Y(st.T)+5}">${st.T.toFixed(1)}°C</text>`;
  // key
  o+=`<g class="t-lab">${ball(24,24,5,"solid")}<text x="34" y="27">ICE</text>${ball(72,24,5,"liquid")}<text x="82" y="27">WATER</text>${ball(134,24,5,"gas")}<text x="144" y="27">STEAM</text></g>`;
  o+=`<text class="t-ink" x="616" y="24" text-anchor="end">${st.phase}</text>`;
  return o;
}
function drawSyringe(){
  let o=F.floor(640,330);
  const x0=90,y0=110,H=120,Wfull=360,W=Wfull*s.vol/100,ry=10;
  // the barrel lies on the bench: frosted acrylic, a nozzle at the left end
  o+=F.shadow(x0,y0+H,Wfull+40,{len:36,opacity:.14});
  o+=`<path d="M${x0-16},${y0+H/2-9} h16 v18 h-16z" fill="${TINT}" fill-opacity=".55" stroke="${GD}" stroke-width="1.2"/><ellipse cx="${x0-16}" cy="${y0+H/2}" rx="3" ry="9" fill="${TINT}" stroke="${GD}"/>`;
  o+=`<rect x="${x0}" y="${y0}" width="${Wfull+40}" height="${H}" rx="${ry}" fill="${TINT}" fill-opacity=".26" stroke="${GD}" stroke-width="1.4"/>`;
  o+=`<ellipse cx="${x0+4}" cy="${y0+H/2}" rx="${ry}" ry="${H/2-1}" fill="${TINT}" fill-opacity=".35" stroke="${GD}" stroke-width="1.1"/>`;
  for(let k=0;k<=10;k++)o+=`<line x1="${x0+k*Wfull/10}" x2="${x0+k*Wfull/10}" y1="${y0}" y2="${y0+(k%5?8:14)}" stroke="${GD}"/>`;
  o+=`<rect x="${x0}" y="${y0+4}" width="${W}" height="${H-8}" fill="${PAL.product.strawberry}" opacity=".1"/>`;
  G.forEach(g=>{o+=ball((x0+6+g.x*(W-12)).toFixed(1),(y0+8+g.y*(H-16)).toFixed(1),5,"gas")});
  // plunger: a rubber head, a steel rod and a thumb plate
  const rod=Wfull+40-W+30,rm=F.mat("rubber","#4E5468");
  o+=`<rect x="${x0+W+12}" y="${y0+H/2-6}" width="${rod}" height="12" fill="${PAL.steel}" stroke="${PAL.steelDark}"/><path d="M${x0+W+14},${y0+H/2-3} h${rod-4}" stroke="#fff" stroke-width="2" opacity=".8"/>`;
  o+=`<rect x="${x0+W}" y="${y0+2}" width="12" height="${H-4}" rx="3" fill="${rm.fill}" stroke="${rm.stroke}"/><path d="M${x0+W+3},${y0+8} v${H-16}" stroke="${rm.hi}" stroke-width="2" stroke-linecap="round"/>`;
  o+=`<rect x="${x0+Wfull+82}" y="${y0+20}" width="12" height="${H-40}" rx="3" fill="${PAL.steel}" stroke="${PAL.steelDark}"/><path d="M${x0+Wfull+85},${y0+26} v${H-52}" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".8"/>`;
  // the highlight streak on the barrel, drawn over the gas
  o+=`<path d="M${x0+16},${y0+7} H${x0+Math.min(Wfull,240)}" stroke="#fff" stroke-opacity=".85" stroke-width="2.4" stroke-linecap="round"/>`;
  // gauge: a steel-cased dial joined by a copper pipe
  const p=pressure(),a=-210+Math.min(240,p/400*240);const gx=560,gy=60;
  o+=`<path d="M${gx},${gy+34} L${gx},${y0} L${x0+6},${y0}" fill="none" stroke="${PAL.copper}" stroke-width="3.4" stroke-linejoin="round"/><path d="M${gx-1},${gy+36} V${y0-1}" stroke="#fff" stroke-width="1" opacity=".55"/>`;
  o+=`<circle cx="${gx+5}" cy="${gy-3}" r="36" fill="${PAL.steelDark}"/><circle cx="${gx}" cy="${gy}" r="36" fill="${PAL.steel}" stroke="${PAL.steelDark}" stroke-width="1.2"/><circle cx="${gx}" cy="${gy}" r="29" fill="#fff" stroke="${PAL.steelDark}" stroke-width="1"/>`;
  for(let k=0;k<=8;k++){const aa=(-210+k*30)*Math.PI/180;o+=`<line x1="${gx+22*Math.cos(aa)}" y1="${gy+22*Math.sin(aa)}" x2="${gx+27*Math.cos(aa)}" y2="${gy+27*Math.sin(aa)}" stroke="${AXIS}" stroke-width="1.2"/>`}
  o+=`<line x1="${gx}" y1="${gy}" x2="${gx+26*Math.cos(a*Math.PI/180)}" y2="${gy+26*Math.sin(a*Math.PI/180)}" stroke="${PS.gas}" stroke-width="2.6" stroke-linecap="round"/><circle cx="${gx}" cy="${gy}" r="3.4" fill="#4E5468"/>`;
  o+=`<text class="t-big" x="${gx-44}" y="${gy+5}" text-anchor="end">${p.toFixed(0)} kPa</text>`;
  o+=`<text class="t-lab" x="${x0}" y="${y0+H+26}">SEALED SYRINGE OF AIR · ${s.vol} mL · ${s.gasT}°C · ${hitRate.toFixed(0)} HITS A SECOND ON THE PLUNGER</text>`;
  return o;
}
function drawClose(st0,step){
  let o=F.floor(420,260);
  if(step.k==="pressure"){
    o+=`<text class="t-lab" x="14" y="22">PRESSURE AGAINST VOLUME (SAME TEMPERATURE)</text>`;
    const X=v=>50+(v-20)/80*340,Y=p=>220-p/320*180;let d="";for(let v=20;v<=100;v+=2)d+=(v>20?"L":"M")+X(v)+","+Y(101.3*60/v*((s.gasT+273)/293));
    o+=`<line x1="50" y1="220" x2="390" y2="220" stroke="${AXIS}"/><line x1="50" y1="40" x2="50" y2="220" stroke="${AXIS}"/><path d="${d}" fill="none" stroke="${PS.gas}" stroke-width="2.4"/>`;
    [20,40,60,80,100].forEach(v=>o+=`<text class="t-lab" x="${X(v)}" y="236" text-anchor="middle">${v}</text>`);
    [0,100,200,300].forEach(p=>o+=`<text class="t-lab" x="44" y="${Y(p)+3.5}" text-anchor="end">${p}</text>`);
    o+=`<text class="t-lab" x="220" y="252" text-anchor="middle">VOLUME (mL)</text><circle cx="${X(s.vol)}" cy="${Y(pressure())}" r="6" fill="${PAL.product.butter}" stroke="var(--ink)"/>`;
    return o;
  }
  const S=stages(Tb()),st=stateFrom(s.Q,Tb());
  o+=`<text class="t-lab" x="14" y="22">HEATING CURVE · TEMPERATURE AGAINST HEAT ADDED</text>`;
  const X=q=>50+q/S.q5*350,Y=T=>210-(T+30)/170*170;
  const pts=[[0,-20],[S.q1,0],[S.q2,0],[S.q3,Tb()],[S.q4,Tb()],[S.q5,Tb()+30]];
  o+=`<line x1="50" y1="210" x2="400" y2="210" stroke="${AXIS}"/><line x1="50" y1="36" x2="50" y2="210" stroke="${AXIS}"/>`;
  [-20,0,50,100].forEach(T=>o+=`<text class="t-lab" x="44" y="${Y(T)+3.5}" text-anchor="end">${T}°</text>`);
  o+=`<path d="${pts.map((p,i)=>(i?"L":"M")+X(p[0])+","+Y(p[1])).join("")}" fill="none" stroke="#DCD6EA" stroke-width="3"/>`;
  // progress so far
  const done=pts.filter(p=>p[0]<=s.Q);done.push([s.Q,st.T]);
  o+=`<path d="${done.map((p,i)=>(i?"L":"M")+X(p[0])+","+Y(p[1])).join("")}" fill="none" stroke="${PS.liquid}" stroke-width="2.6" stroke-linejoin="round"/>`;
  o+=`<circle cx="${X(s.Q)}" cy="${Y(st.T)}" r="6" fill="${PAL.product.butter}" stroke="var(--ink)"/>`;
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
