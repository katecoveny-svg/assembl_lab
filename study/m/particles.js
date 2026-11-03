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
  // hotplate: a steel box with a heating coil on its top that warms in colour while it is on
  const heat=s.playing&&step.speed?Math.min(1,s.power/3):0.05,cx=(BX0+BX1)/2;
  o+=F.box(118,300,304,20,{colour:PAL.steel,kind:"metal",d:14,r:4,shadowLen:90});
  o+=`<ellipse cx="${cx+7}" cy="${296}" rx="128" ry="3.6" fill="${PAL.steelDark}" opacity=".5"/>`;
  for(let i=0;i<5;i++)o+=`<path d="M${154+i*50},298 q12,-4 24,0 t24,0" fill="none" stroke="${PAL.product.strawberry}" stroke-width="2.4" stroke-linecap="round" opacity="${0.2+0.8*heat}"/>`;
  o+=`<circle cx="396" cy="310" r="5.5" fill="${PAL.product.peach}" stroke="${F.mat("painted",PAL.product.peach).stroke}"/><circle cx="380" cy="310" r="2.6" fill="${PAL.product.strawberry}" opacity="${0.25+0.75*heat}"/>`;
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
    o+=`<text class="t-lab" x="220" y="252" text-anchor="middle">VOLUME (mL)</text><circle cx="${X(s.vol)}" cy="${Y(pressure())}" r="6" fill="${PAL.case.blush}" stroke="var(--ink)"/>`;
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
  o+=`<circle cx="${X(s.Q)}" cy="${Y(st.T)}" r="6" fill="${PAL.case.blush}" stroke="var(--ink)"/>`;
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
// ---------- the 3D bench (../kit3d.js) with the Blender apparatus (assets/models/particles, contract assembl.particles.v1):
// a hotplate, an 800 mL beaker with a spirit thermometer on a retort stand, and a sealed 100 mL glass syringe with a pressure
// gauge, all at real size. The GLB only DISPLAYS this lesson: the model above decides the temperature, the phase fractions,
// the volume and the pressure, and particles-rig-controller.mjs poses the plunger, the gauge needle, the thermometer spirit,
// the water level and the hotplate from those values. The molecules are still light instanced spheres driven by the same
// per-frame code as before (stateFrom(s.Q) decides how many are locked in the lattice, liquid or escaped as gas), now
// confined to the GLB's own beaker and syringe chambers. Aoraki for the mountain step stays a simple procedural backdrop.
const TOP3=.3,graphics={live:true},SRC=(document.currentScript&&document.currentScript.src)||location.href;
const STATUS3={loading:"Loading live 3D · offline Blender render shown while it loads",
  ready:"Live 3D · Blender apparatus; particles drawn far bigger than real; browser glass is simpler than the offline render",
  fallback:"3D unavailable · simplified live diagram; controls, readouts and the investigation are unchanged",
  drawing:"Simplified live diagram · same model, controls, readouts and investigation",
  nogl:"Simplified live diagram · this browser has no WebGL; controls, readouts and the investigation are unchanged"};
const announce=()=>{try{document.documentElement.dispatchEvent(new Event("particles-asset"))}catch(e){}};
function particles3d(S){
  let world=null,failed=false;const host=S.canvas.parentElement,figure=host.parentElement;
  const status=()=>document.getElementById("particles-load-status"),root=document.documentElement;
  host.style.visibility="hidden";figure.classList.remove("s3-on");if(graphics.live)figure.classList.add("particles-loading");
  root.dataset.particlesAsset="loading";if(status())status().textContent=STATUS3.loading;
  const fail=e=>{if(failed)return;failed=true;world=null;host.style.display="none";host.setAttribute("aria-hidden","true");figure.classList.remove("s3-on","particles-loading");
    document.getElementById("k-main").removeAttribute("aria-hidden");root.dataset.particlesAsset="fallback";
    if(status())status().textContent=STATUS3.fallback;S.api.redraw();announce();console.warn("Particle apparatus unavailable",e)};
  import("./particles-asset.js").then(async m=>{
    const asset=await m.loadParticles(S,TOP3);m.lightParticles(S);world=particlesBench(S,asset);
    world.step(S.api.step);world.update(s,S.api.step,0,0);
    figure.classList.remove("particles-loading");root.dataset.particlesAsset="ready";host.style.visibility="visible";
    host.querySelector(".s3-ov").setAttribute("aria-hidden","true");
    if(graphics.live){figure.classList.add("s3-on");document.getElementById("k-main").setAttribute("aria-hidden","true")}
    host.querySelector(".s3-hint").textContent="Drag to turn · + / − to zoom · Home to reset · drag the plunger in Gas pressure";announce();
  }).catch(fail);
  return {step(st){world?.step(st)},resize(w,h){world?.resize?.(w,h)},update(...args){if(world&&!failed)try{world.update(...args)}catch(e){fail(e)}}};
}
function particlesBench(S,asset){const {THREE,mat,PAL}=S;const V3=(x,y,z)=>new THREE.Vector3(x,y,z);const {root,rig,R}=asset;
  S.scene.add(root);
  S.canvas.setAttribute("aria-label","Live 3D model of the particle apparatus: a beaker of water molecules on a hotplate with a thermometer, and a sealed syringe with a pressure gauge. Drag or use the arrow keys to orbit, + and − to zoom, Home to reset the view. The controls below change the experiment.");
  const BX=R.beaker.x,BZ=R.beaker.z,SY=R.syringe;
  // one pale bench under both stations
  const deck=S.rbox(SY.x0+7-(BX-3.6),TOP3,9,.12,mat("plastic","#EFEAF4",{rough:.6,coat:.15}));deck.position.set((BX-3.6+SY.x0+7)/2,TOP3/2,(BZ+SY.z)/2-.4);S.scene.add(deck);
  // ---------------------------------------------------------------- the beaker chamber (molecules, steam)
  const bench=S.group();bench.position.set(BX,TOP3,BZ);
  const BR=R.beaker.r,BH=R.beaker.rim-R.beaker.floor,B0=R.beaker.floor-TOP3;   // inner radius, height and floor (bench space)
  const hot=n=>{const o=root.getObjectByName(n);return o?o.getWorldPosition(new THREE.Vector3()):null};
  // the molecules: a 7 × 7 × 7 ice lattice; oxygen blueberry, hydrogens white, bonds drawn while they're in the solid
  const NN=7,N=NN*NN*NN,SP=.19;
  const oGeo=new THREE.SphereGeometry(.072,16,12),hGeo=new THREE.SphereGeometry(.044,12,8);
  const O=S.swarm(N,oGeo,mat("plastic","#ffffff",{rough:.3}),{colors:true}),H1=S.swarm(N,hGeo,mat("plastic","#ffffff",{rough:.3})),H2=S.swarm(N,hGeo,mat("plastic","#ffffff",{rough:.3}));
  bench.add(O,H1,H2);
  const mol=[];const q=new THREE.Quaternion(),e=new THREE.Euler();
  for(let i=0;i<N;i++){const a=i%NN,b=Math.floor(i/NN)%NN,c=Math.floor(i/NN/NN);
    const lx=(a-(NN-1)/2)*SP,lz=(c-(NN-1)/2)*SP,ly=B0+.1+b*SP;
    mol.push({lx,ly,lz,x:lx,y:ly,z:lz,vx:0,vy:0,vz:0,kind:"solid",seed:Math.random()*100,rx:Math.random()*6,ry:Math.random()*6,rz:Math.random()*6,wx:0,wy:0,wz:0,d:Math.hypot(lx,(ly-B0-.1-(NN-1)*SP/2),lz)})}
  // melt order: the outside of the block first; boil order: random
  const meltOrder=mol.map((m,i)=>i).sort((i,j)=>mol[j].d-mol[i].d);const rank=new Int32Array(N);meltOrder.forEach((i,r)=>rank[i]=r);
  const boilRank=new Int32Array(N);mol.map((m,i)=>i).sort(()=>Math.random()-.5).forEach((i,r)=>boilRank[i]=r);
  const bondGeo=new THREE.BufferGeometry();const bondPos=new Float32Array(N*3*2*3);bondGeo.setAttribute("position",new THREE.BufferAttribute(bondPos,3));
  const bonds=new THREE.LineSegments(bondGeo,new THREE.LineBasicMaterial({color:PAL.deep.sky,transparent:true,opacity:.45}));bonds.frustumCulled=false;bench.add(bonds);
  const nb=[];for(let i=0;i<N;i++){const a=i%NN,b=Math.floor(i/NN)%NN,c=Math.floor(i/NN/NN);if(a<NN-1)nb.push([i,i+1]);if(b<NN-1)nb.push([i,i+NN]);if(c<NN-1)nb.push([i,i+NN*NN])}
  const steamP=S.puffs(70,"#ffffff");bench.add(steamP);const stp=[];for(let i=0;i<70;i++)stp.push({x:0,y:0,z:0,life:0});
  const Ty=T=>R.thermo.y0+(T-R.thermo.t0)/(R.thermo.t1-R.thermo.t0)*(R.thermo.y1-R.thermo.y0);
  const lTemp=S.label({cls:"big",off:[96,-6]}),lState=S.label({off:[-30,-30]}),lBoil=S.label({off:[22,0]}),lMelt=S.label({off:[22,0]});
  const lBeaker=S.label({off:[-30,-14]}).set("Beaker"),lPlate=S.label({off:[-34,10]}).set("Hotplate");
  const hpBeaker=hot("HOTSPOT_BEAKER")||V3(BX-BR,TOP3+B0+BH*.8,BZ),hpPlate=hot("HOTSPOT_HOTPLATE")||V3(BX-1.5,TOP3+1.6,BZ+2.8);
  S.pick(rig.nodes.HOTPLATE_TOP,()=>{S.api.state.playing=!S.api.state.playing});S.pick(rig.nodes.POWER_KNOB_PIVOT,()=>{S.api.state.playing=!S.api.state.playing});
  let heatK=0;
  // ---------------------------------------------------------------- Aoraki, rising behind the bench for the mountain step
  const mtn=S.group();mtn.position.set(BX-1,0,BZ-9);
  const rockM=mat("plastic","#C9C3D8",{rough:.7,coat:.1}),snowM=mat("plastic","#ffffff",{rough:.5});
  const peak=(x,z,h,r,seg)=>{const g=new THREE.ConeGeometry(r,h,seg,4);const pos=g.attributes.position;for(let i=0;i<pos.count;i++){const y=pos.getY(i);if(y>-h/2+.01&&y<h/2-.01){pos.setX(i,pos.getX(i)*(1+.12*Math.sin(i*1.7)));pos.setZ(i,pos.getZ(i)*(1+.12*Math.cos(i*2.3)))}}g.computeVertexNormals();
    const m=S.mesh(g,rockM);m.position.set(x,h/2,z);mtn.add(m);const cap=S.mesh(new THREE.ConeGeometry(r*.36,h*.36,seg,1),snowM);cap.position.set(x,h-h*.18+.01,z);mtn.add(cap);return m};
  peak(0,0,6.5,3.2,7);peak(-3.6,1,4.2,2.4,6);peak(3.4,.8,4.8,2.6,6);peak(6.5,1.6,3,2,6);peak(-6.6,1.8,2.8,1.8,6);
  const pin=S.group(mtn);pin.add(S.cyl(.03,.03,.9,mat("metal"),{at:[0,.45,0],seg:8}));const flag=S.box(.5,.3,.02,mat("plastic",PAL.product.strawberry),{at:[.26,.75,0]});pin.add(flag);
  mtn.scale.setScalar(.001);mtn.visible=false;let mtnK=0;
  const lPlace=S.label({cls:"hot",off:[24,-20]});
  // ---------------------------------------------------------------- the gas syringe chamber
  // Gas molecules live between the nozzle wall and the plunger face of the GLB syringe. They are a sketch of collisions;
  // the gauge and the readouts follow pressure() from the model, never these positions.
  const GN=60,GR=.062,gas=S.swarm(GN,new THREE.SphereGeometry(GR,16,12),mat("plastic",PAL.product.strawberry,{rough:.3}));S.scene.add(gas);
  const RR=SY.r-GR-.012,K=RR/.65;   // K rescales the original sketch speeds from its old 0.75-unit barrel to this one
  const gp=[];for(let i=0;i<GN;i++){const v=V3(Math.random()-.5,Math.random()-.5,Math.random()-.5).normalize();gp.push({u:Math.random(),y:(Math.random()-.5)*1.6*RR,z:(Math.random()-.5)*1.6*RR,v})}
  // wall hits on the plunger face: a soft blush mark, ordinary blending (no additive glow)
  const flashes=S.puffs(30,PAL.product.strawberry);S.scene.add(flashes);const fl=[];for(let i=0;i<30;i++)fl.push({y:0,z:0,life:0});let fi=0;
  const lPress=S.label({cls:"big",off:[30,-10]}),lVol=S.label({off:[0,-34]}),lDrag=S.label({cls:"hot",off:[24,24]}).set("Drag me");
  const syr=rig.nodes.SYRINGE,perM=asset.contract.rig.plunger.metres_per_mL,local=new THREE.Vector3();let grab=null;
  const dragVol={normal:V3(0,0,1),start:p=>{syr.worldToLocal(local.copy(p));grab={x:local.x,vol:s.vol}},
    move:p=>{if(!grab)return;syr.worldToLocal(local.copy(p));const v=grab.vol+(local.x-grab.x)/perM;S.api.state.vol=Math.round(S.clamp(v,20,100))},end:()=>{grab=null}};
  S.dragger(rig.nodes.THUMB_PLATE,dragVol);S.dragger(rig.nodes.PLUNGER_ROD,dragVol);
  // ---------------------------------------------------------------- views
  const SCX=SY.x0+50*SY.perML;
  S.view("beaker",[BX+4.6,8.8,BZ+19],[BX+.5,4.3,BZ],{min:4,max:34});
  S.view("close",[BX+2.2,6.2,BZ+10.8],[BX+.1,3.5,BZ],{min:2,max:26});
  S.view("mountain",[BX+5.5,9,BZ+24],[BX-.4,5,BZ-3],{min:4,max:44});
  S.view("syringe",[SCX+1.2,5.8,SY.z+12.5],[SCX-1.1,3.3,SY.z],{min:3,max:28});
  S.view("all",[(BX+SCX)/2,9,23.5],[(BX+SCX)/2,3.4,0],{min:6,max:52});
  const viewOf=k=>k==="particles"?"close":k==="mountain"?"mountain":k==="pressure"?"syringe":k==="test"?"all":"beaker";
  const benchL=[lTemp,lState,lBoil,lMelt,lBeaker,lPlate],syrL=[lPress,lVol,lDrag];
  S.goView("beaker",true);
  const tmp=new THREE.Vector3(),dir=new THREE.Vector3();
  return {
    step(st){const v=viewOf(st.k);S.goView(v);S.setShadowBox(v==="all"?16:8,v==="syringe"?[SCX,0,SY.z]:v==="all"?[(BX+SCX)/2,0,0]:[BX,0,BZ]);
      benchL.forEach(l=>l.show(v!=="syringe"));syrL.forEach(l=>l.show(v==="syringe"||v==="all"));lPlace.show(st.k==="mountain");if(v==="all"){benchL.slice(1).forEach(l=>l.hide());lDrag.hide()}
      // phones: keep the thermometer readable; the melting and boiling marks show on their own topics only
      if(S.canvas.clientWidth<520&&v!=="syringe"&&v!=="all"){lMelt.show(st.k==="melt");lBoil.show(st.k==="boil"||st.k==="mountain")}},
    update(s,st,dt,t){
      const Tbp=Tb(),stt=stateFrom(s.Q,Tbp),T=stt.T,sp=Math.sqrt((T+273)/273);
      const heating=s.playing&&st.speed&&st.k!=="pressure";
      heatK=S.lerp(heatK,heating?Math.min(1,(2+s.power*1.8)/7.4):0,S.REDUCED?1:.08);
      // ---- molecules
      const nS=Math.round(stt.solid*N),nG=Math.round(stt.gas*N);
      const liqTop=B0+.05+Math.max(.25,((N-nS-nG)/N)*1.0+(nS/N)*.35);
      const want=i=>rank[i]>=N-nS?"solid":boilRank[i]<nG&&stt.gas>0?"gas":"liquid";
      const amp=.008+.03*S.clamp((T+20)/20,0,1.2);const LS=s.playing||!S.REDUCED?1:0;
      const lim=1.1*sp,blockTop=B0+.1+(NN-1)*SP+.1,half=(NN-1)/2*SP+.1;
      for(let i=0;i<N;i++){const m=mol[i];const w=want(i);
        if(m.kind!==w){if(w==="gas"){m.vy=1.5+Math.random();m.vx=(Math.random()-.5)*2;m.vz=(Math.random()-.5)*2}if(w==="liquid"&&m.kind==="solid"){m.vx=m.vy=m.vz=0}
          if(w==="solid"){m.x=m.lx;m.y=m.ly;m.z=m.lz}m.kind=w}
        if(m.kind==="solid"){m.seed+=dt*22*LS;m.x=m.lx+Math.sin(m.seed*1.3)*amp;m.y=m.ly+Math.cos(m.seed*1.7)*amp;m.z=m.lz+Math.sin(m.seed*1.1+1)*amp}
        else if(m.kind==="liquid"){const k=3.2*sp*LS;m.vx+=(Math.random()-.5)*k*dt*8;m.vy+=(Math.random()-.5)*k*dt*8-.6*dt;m.vz+=(Math.random()-.5)*k*dt*8;
          m.vx=S.clamp(m.vx,-lim,lim);m.vy=S.clamp(m.vy,-lim,lim);m.vz=S.clamp(m.vz,-lim,lim);m.x+=m.vx*dt*.35;m.y+=m.vy*dt*.35;m.z+=m.vz*dt*.35;
          const r=Math.hypot(m.x,m.z),Rw=BR-.09;if(r>Rw){m.x*=Rw/r;m.z*=Rw/r;m.vx*=-.5;m.vz*=-.5}
          if(m.y<B0+.1){m.y=B0+.1;m.vy=Math.abs(m.vy)}if(m.y>liqTop){m.y=liqTop;m.vy=-Math.abs(m.vy)}
          if(nS>N*.2&&Math.abs(m.x)<half&&Math.abs(m.z)<half&&m.y<blockTop){const dx=half-Math.abs(m.x),dz=half-Math.abs(m.z),dy=blockTop-m.y;
            if(dy<dx&&dy<dz)m.y=blockTop;else if(dx<dz)m.x=Math.sign(m.x||1)*half;else m.z=Math.sign(m.z||1)*half}
          m.rx+=dt*2*sp;m.ry+=dt*1.6*sp}
        else{const v=2.4*sp*LS;const n=Math.hypot(m.vx,m.vy,m.vz)||1;m.vx=m.vx/n*v;m.vy=m.vy/n*v;m.vz=m.vz/n*v;m.x+=m.vx*dt;m.y+=m.vy*dt;m.z+=m.vz*dt;
          const r=Math.hypot(m.x,m.z),Rw=m.y<B0+BH?BR-.08:2.6;if(r>Rw){const nx=m.x/r,nz=m.z/r;const dot=m.vx*nx+m.vz*nz;m.vx-=2*dot*nx;m.vz-=2*dot*nz;m.x=nx*Rw;m.z=nz*Rw}
          if(m.y<liqTop+.1){m.y=liqTop+.1;m.vy=Math.abs(m.vy)}if(m.y>B0+BH+2.2){m.y=B0+BH+2.2;m.vy=-Math.abs(m.vy)}m.rx+=dt*6;m.rz+=dt*5}
        e.set(m.rx,m.ry,m.rz);q.setFromEuler(e);
        O.put(i,m.x,m.y,m.z,1);O.tint(i,m.kind==="solid"?"#9CC4F0":m.kind==="liquid"?PAL.product.blueberry:PAL.product.strawberry);
        dir.set(.068,.05,0).applyQuaternion(q);H1.put(i,m.x+dir.x,m.y+dir.y,m.z+dir.z,1);dir.set(-.068,.05,0).applyQuaternion(q);H2.put(i,m.x+dir.x,m.y+dir.y,m.z+dir.z,1)}
      O.done();H1.done();H2.done();
      let bi=0;for(const [a,b] of nb){const A=mol[a],B=mol[b];if(A.kind!=="solid"||B.kind!=="solid")continue;bondPos.set([A.x,A.y,A.z,B.x,B.y,B.z],bi*6);bi++}
      bondGeo.setDrawRange(0,bi*2);bondGeo.attributes.position.needsUpdate=true;
      const liqN=N-nS-nG,wh=Math.max(.01,liqTop-B0+.02);
      const boiling=stt.zone===3&&heating;for(let i=0;i<stp.length;i++){const p=stp[i];p.life-=dt;if(p.life<=0){if(boiling&&Math.random()<.3){const a=Math.random()*6.28,r=Math.random()*BR*.8;p.x=Math.cos(a)*r;p.z=Math.sin(a)*r;p.y=B0+BH-.2;p.life=2+Math.random()}else p.life=0}
        else{p.y+=dt*.5;p.x+=Math.sin(t+i)*dt*.1}steamP.put(i,p.x,p.y,p.z,p.life>0?Math.min(.5,p.life*.3):0,(3-p.life)*260+120)}steamP.done();
      // ---- the apparatus: one absolute snapshot of values the model has already calculated
      const Wd=s.vol*SY.perML,p=pressure();
      rig.setVisualState({volumeML:s.vol,pressureKPa:p,temperatureC:T,waterHeightM:wh/R.k,waterVisible:liqN>N*.08,heatLevel:heatK,heating,powerKW:s.power});
      lTemp.at(tmp.set(R.thermo.x,Ty(T),R.thermo.z)).set(`${T.toFixed(1)}°C<small>${stt.phase}</small>`);
      lBoil.at(tmp.set(R.thermo.x,Ty(Tbp),R.thermo.z)).set(`Boils<b>${Tbp.toFixed(0)}°C</b>`);lMelt.at(tmp.set(R.thermo.x,Ty(0),R.thermo.z)).set(`Melts<b>0°C</b>`);
      lState.at(tmp.set(BX-.5,TOP3+liqTop+.15,BZ)).set(`${Math.round(stt.solid*100)}% ice · ${Math.round(stt.liquid*100)}% water · ${Math.round(stt.gas*100)}% steam`);
      lBeaker.at(hpBeaker);lPlate.at(hpPlate);
      // ---- mountain
      const showM=st.k==="mountain";mtnK=S.lerp(mtnK,showM?1:0,S.REDUCED?1:.06);mtn.visible=mtnK>.01;mtn.scale.setScalar(Math.max(.001,mtnK));
      const altH=ALT[s.alt]/3724*6.5;pin.position.set(0,Math.min(6.5,altH),0);
      lPlace.at(tmp.set(mtn.position.x,mtnK*(Math.min(6.5,altH)+.9),mtn.position.z)).set(`${PLACES.find(p=>p[0]===s.alt)[1]}<small>air ${pressureAt(ALT[s.alt]).toFixed(0)} kPa · boils ${Tbp.toFixed(1)}°C</small>`);
      // ---- syringe gas (reduced motion: still unless the experiment is playing)
      const spd=1.6*Math.sqrt((s.gasT+273)/293),hx=SY.x0+Wd;
      const run=(st.k==="pressure"||st.k==="test")&&(s.playing||!S.REDUCED);
      for(let i=0;i<GN;i++){const g2=gp[i];if(run){g2.u+=g2.v.x*dt*spd*(100/Math.max(9.5,s.vol))*.25;g2.y+=g2.v.y*dt*spd*.45*K;g2.z+=g2.v.z*dt*spd*.45*K}
        if(g2.u<0){g2.u=0;g2.v.x=Math.abs(g2.v.x)}if(g2.u>1){g2.u=1;g2.v.x=-Math.abs(g2.v.x);if(run){const f=fl[fi=(fi+1)%30];f.y=g2.y;f.z=g2.z;f.life=.25}}
        const rr=Math.hypot(g2.y,g2.z);if(rr>RR){const ny=g2.y/rr,nz=g2.z/rr;const d=g2.v.y*ny+g2.v.z*nz;g2.v.y-=2*d*ny;g2.v.z-=2*d*nz;g2.y=ny*RR;g2.z=nz*RR}
        gas.put(i,SY.x0+GR+.01+g2.u*Math.max(0,Wd-2*GR-.02),SY.y+g2.y,SY.z+g2.z,.9)}gas.done();
      for(let i=0;i<30;i++){const f=fl[i];f.life-=dt;flashes.put(i,hx-.03,SY.y+f.y,SY.z+f.z,f.life>0?f.life*2:0,150)}flashes.done();
      lPress.at(tmp.set(R.gauge.x,R.gauge.y+R.gauge.r+.15,R.gauge.z)).set(`Pressure<b>${p.toFixed(0)} kPa</b>`);
      lVol.at(tmp.set(SY.x0+Wd/2,SY.y+SY.r+.12,SY.z)).set(`${s.vol} mL · ${s.gasT}°C<small>${hitRate.toFixed(0)} hits a second</small>`);
      lDrag.at(tmp.set(hx+SY.thumb+.06,SY.y+.6,SY.z));
    }};
}
const CFG={kupu:KUPU,scene3d:particles3d,postprocessing:false,
  eyebrow:"Science · Matter and particles", title:"The particle machine", crumb:"Year 9–10 science · foundation for NCEA Level 1 Chemistry and Biology", homeHash:"y9",
  fig:"FIG. 02 · KETTLE ON A HOTPLATE", railTitle:"What heat does to particles",
  mainBox:"0 0 640 330", mainPhoneBig:true, mainLabel:"Half a kilogram of ice in a beaker on a hotplate, shown as particles, with a thermometer", closeBox:"0 0 420 260",
  companion:"quiet",
  lesson:{step:"pressure",
    question:"What happens to pressure when the same air has half the space?",
    explore:"Move the syringe plunger and watch the pressure gauge. The particles are a sketch; the gauge follows this model’s gas law.",
    predict:"At 20°C, how will the pressure at 30 mL compare with the pressure at 60 mL?",
    investigate:"Set up A (60 mL), then capture. Set up B (30 mL), then capture. Both keep the same sealed air at 20°C. You can also use the controls to reach these settings.",
    explain:"Compare the two captured pressures and volumes. Explain why more frequent wall collisions matter. The gauge rounds to whole kPa; use the captured decimal values for the ratio, not the random collision counter.",
    prepare:(slot)=>{s.vol=slot==="A"?60:30;s.gasT=20;return "Syringe ready at "+s.vol+" mL and 20°C. Watch the gauge, then capture."},
    capture:(slot)=>{if(s.vol!==(slot==="A"?60:30)||s.gasT!==20)return {error:"Use "+(slot==="A"?60:30)+" mL at 20°C for observation "+slot+"."};
      return {raw:{volume:s.vol,temperature:s.gasT,pressure:pressure()},fields:{Volume:s.vol+" mL",Temperature:s.gasT+" °C",Pressure:pressure().toFixed(1)+" kPa",Gas:"Same sealed sample"}}},
    reset:()=>{s.vol=60;s.gasT=20;s.playing=false}},
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
};
const API=StudyKit.mount(CFG);
// ---------- graphics: live 3D or the simplified drawing, switched IN PAGE so nothing reloads. The model state, the topic,
// the guided investigation stage, captured A/B evidence and typed notes all stay exactly as they were. ?lite still opens the
// drawing directly (and no WebGL always does); the toggle keeps the address in step so a reload honours the choice.
const playmain=document.querySelector?.(".playmain");
if(playmain&&playmain.nodeType===1){
  const canvas=document.querySelector(".playmain .canvas"),main=document.getElementById("k-main"),root=document.documentElement;
  const poster=document.createElement("img");poster.className="particles-poster";poster.src="/assets/models/particles/particles-hero.webp";poster.alt="";poster.setAttribute("aria-hidden","true");canvas.append(poster);
  const note=document.createElement("p");note.className="particles-view-note";
  note.innerHTML='<span id="particles-load-status" role="status"></span><button type="button" class="particles-graphics" id="particles-graphics"></button>';
  canvas.after(note);
  const btn=note.querySelector("button"),status=note.querySelector("span");
  const webgl=(()=>{try{const c=document.createElement("canvas");return !!(c.getContext("webgl2")||c.getContext("webgl"))}catch(e){return false}})();
  graphics.live=webgl&&!/[?&]lite\b/.test(location.search);let attaching=false;
  function sync(){const host=canvas.querySelector(".s3-host"),state=root.dataset.particlesAsset;
    if(!webgl){btn.disabled=true;btn.textContent="Live 3D needs WebGL";status.textContent=STATUS3.nogl;return}
    if(graphics.live&&state==="fallback"){btn.disabled=true;btn.textContent="Live 3D unavailable";status.textContent=STATUS3.fallback;return}
    btn.disabled=false;btn.textContent=graphics.live?"Use simplified drawing":"Use live 3D";
    if(graphics.live){if(host){host.style.display="";if(state==="ready"){canvas.classList.add("s3-on");main.setAttribute("aria-hidden","true")}else canvas.classList.add("particles-loading")}
      status.textContent=STATUS3[state]||STATUS3.loading}
    else{if(host)host.style.display="none";canvas.classList.remove("s3-on","particles-loading");main.removeAttribute("aria-hidden");status.textContent=STATUS3.drawing}}
  btn.onclick=()=>{graphics.live=!graphics.live;
    try{const url=new URL(location.href);if(graphics.live)url.searchParams.delete("lite");else url.searchParams.set("lite","");history.replaceState(history.state,"",url.href)}catch(e){}
    if(graphics.live&&!canvas.querySelector(".s3-host")&&!attaching){attaching=true;status.textContent=STATUS3.loading;
      import(new URL("../kit3d.js",SRC).href).then(m=>{API.s3=m.attach(API,CFG,particles3d,window.StudyKit)}).catch(e=>{console.warn("3D bench unavailable",e);root.dataset.particlesAsset="fallback"}).finally(()=>{attaching=false;sync()})}
    sync();API.redraw()};
  root.addEventListener?.("particles-asset",sync);sync();
}
})();
