(()=>{
const g=9.8, C_W=4200, L_V=2.26e6, VMAX=85/3.6;
const s={m:70,h:192,y:192,v:0,heat:0,mode:"free",lift:false,
  km:1.0,kP:2200,T:15,boiled:0,kt:0,
  tc:0, V:12,R:24, cq:0};
const fmt=(x,d=0)=>Number(x).toLocaleString("en-NZ",{maximumFractionDigits:d,minimumFractionDigits:d});
// figure parts: the shared bench look (StudyKit.fig), so these drawings match the 3D machines
const F=StudyKit.fig,PAL=F.palette,TINT="#BFDDF5";
const kJ=J=>J>=1e6?fmt(J/1e6,2)+" MJ":J>=1000?fmt(J/1000,1)+" kJ":fmt(J)+" J";
// ---------- tower
function resetTower(top=true){s.y=top?s.h:0;s.v=0;s.heat=0}
function tickTower(dt,st){
  if(st.k==="lift"){if(s.y<s.h){s.y=Math.min(s.h,s.y+12*dt)}else s.playing=false;return}
  if(s.y<=0){s.y=0;s.v=0;s.playing=false;return}
  const steps=10;for(let i=0;i<steps;i++){const d=dt/steps;
    if(st.k==="wire"){let a=g;if(s.v>=VMAX)a=0;const brakeZone=s.y<12;if(brakeZone)a=-Math.max(0,s.v*s.v/(2*Math.max(.5,s.y)));
      s.v=Math.max(0,Math.min(VMAX,s.v+a*d));const dy=s.v*d;s.y=Math.max(0,s.y-dy);
      // energy balance: heat = mg(h-y) - ½mv²
      s.heat=s.m*g*(s.h-s.y)-0.5*s.m*s.v*s.v; if(s.y<=0){s.heat=s.m*g*s.h;s.v=0}}
    else{s.v+=g*d;s.y=Math.max(0,s.y-s.v*d);if(s.y<=0){s.v=Math.sqrt(2*g*s.h);break}}}
}
function drawTower(st){
  let o=F.floor(640,330);
  const gy=300,top=40,Y=y=>gy-(y/192)*(gy-top),tx=210;
  // the tower: a steel shaft on a concrete base, a pod at the top
  o+=F.box(tx-46,gy-8,92,10,{colour:"#E3DCCF",kind:"painted",d:10});
  o+=F.cyl(tx,top-14,11,gy-top+6,{colour:PAL.steel,kind:"metal",shadowLen:60});
  o+=`<line x1="${tx}" x2="${tx}" y1="${top-44}" y2="${top-18}" stroke="#8F9BAA" stroke-width="2.4"/><circle cx="${tx}" cy="${top-46}" r="3" fill="#E8664A"/>`;
  o+=F.box(tx-36,Y(192)-12,72,22,{colour:PAL.case.sky,kind:"plastic",d:9,r:6,shadow:false});
  for(let k=0;k<=192;k+=48)o+=`<line x1="${tx-24}" x2="${tx-16}" y1="${Y(k)}" y2="${Y(k)}" stroke="#8F9BAA"/><text class="t-lab" x="${tx-28}" y="${Y(k)+3.5}" text-anchor="end">${k} m</text>`;
  if(st.k==="wire")o+=`<line x1="${tx+70}" x2="${tx+70}" y1="${Y(192)}" y2="${gy}" stroke="#8F9BAA" stroke-width="1.4" stroke-dasharray="3 3"/>`;
  if(st.k==="lift")o+=`<line x1="${tx+70}" x2="${tx+70}" y1="${Y(192)-12}" y2="${Y(s.y)}" stroke="#4E4868" stroke-width="1.6"/>`;
  // the jumper: a little painted figure
  const jy=Y(s.y);o+=`<g transform="translate(${tx+70},${jy-14})"><circle r="6.5" cy="-10" fill="#F2D0B4" stroke="#B88A6A"/><rect x="-6" y="-4" width="12" height="17" rx="5" fill="${PAL.product.strawberry}" stroke="#A8455E"/><path d="M-3,13 v6 M3,13 v6" stroke="#4E4868" stroke-width="2.4" stroke-linecap="round"/></g>`;
  if(s.v>2)o+=`<path d="M${tx+90},${jy-20} v${-Math.min(60,s.v*1.2)}" stroke="#8F9BAA" stroke-width="1.6" stroke-linecap="round"/>`;
  // energy stores as three frosted tubes, filled with product colours
  const Ep=s.m*g*s.y,Ek=0.5*s.m*s.v*s.v,H=st.k==="wire"?s.heat:0,Tot=s.m*g*s.h,bx=380,bw=50,bh=210,by=280;
  [["Potential",Ep,PAL.product.blueberry],["Kinetic",Ek,PAL.product.strawberry],["Heat",H,PAL.product.peach]].forEach(([n,E,c],i)=>{const x=bx+i*80,f=Tot?E/Tot:0;
    o+=F.tube(x,by-bh,bw,bh,f,{tint:TINT,fill:c});
    o+=`<text class="t-lab" x="${x+bw/2}" y="${by+20}" text-anchor="middle">${n.toUpperCase()}</text><text class="t-ink" x="${x+bw/2}" y="${by-bh*f-10}" text-anchor="middle">${kJ(E)}</text>`});
  o+=`<text class="t-lab" x="16" y="22">${st.k==="lift"?"LIFTING THE JUMPER UP THE TOWER":st.k==="wire"?"SKYJUMP: GUIDE WIRE AND BRAKE":"NO WIRE, NO AIR: AN IDEAL FALL"}</text><text class="t-ink" x="624" y="22" text-anchor="end">${fmt(s.v,1)} m/s · ${fmt(s.v*3.6)} km/h</text>`;
  return o;
}
// ---------- kettle
function tickKettle(dt,st){const P=s.kP;const SP=12;let E=P*dt*SP;s.kt+=dt*SP;
  if(s.T<100){const need=s.km*C_W*(100-s.T);if(E<need){s.T+=E/(s.km*C_W);E=0}else{E-=need;s.T=100}}
  if(E>0&&st.k==="boil"){s.boiled=Math.min(s.km,s.boiled+E/L_V)}
  if(st.k==="heat"&&s.T>=100)s.playing=false;
  if(s.boiled>=s.km*0.25)s.playing=false;}
function drawKettle(st){
  let o=F.floor(640,330);
  const x0=150,y0=90,W=170,H=170,lvl=(s.km-s.boiled)/1.7*H*0.9;
  // a jug of frosted acrylic on its powered base, the water inside warming from blue to peach
  o+=F.box(x0-30,y0+H,W+60,16,{colour:PAL.steel,kind:"metal",d:12,r:4});
  const warm=Math.max(0,Math.min(1,(s.T-15)/85)),water=warm<.5?"#8FB8EE":"#F6B384";
  o+=`<path d="M${x0-7},${y0+H-lvl} h${W+14} l${7*lvl/H},${lvl} h${-W-14-14*lvl/H}z" fill="${water}" opacity="${0.45+0.4*warm}"/>`;
  o+=F.acrylic(x0,y0,W,H,{tint:TINT,d:16,r:14,shadow:false});
  o+=`<path d="M${x0+W},${y0+30} q48,10 40,70 q-6,40 -40,52" fill="none" stroke="#A9CBE3" stroke-width="9" stroke-linecap="round"/><path d="M${x0+W},${y0+30} q48,10 40,70 q-6,40 -40,52" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="2.5"/>`;
  o+=`<path d="M${x0},${y0+20} l-40,-30" stroke="#A9CBE3" stroke-width="8" stroke-linecap="round"/>`;
  if(s.T>=100)for(let i=0;i<5;i++)o+=`<path d="M${x0-30-i*6},${y0-20-i*10} q-10,-12 0,-24 q10,-12 0,-24" fill="none" stroke="#C9CEDF" stroke-width="3" stroke-linecap="round" opacity="${.4+.1*i}"/>`;
  o+=F.plate(x0+W/2-44,y0+H/2-34,"Jug",{tint:TINT,size:11});
  o+=`<text class="t-big" x="${x0+W/2}" y="${y0+H/2+12}" text-anchor="middle">${fmt(s.T,1)}°C</text>`;
  const Eh=s.km*C_W*(s.T-15),Eb=s.boiled*L_V;
  o+=`<g class="t-ink"><text x="400" y="110">E = P × t</text><text x="400" y="130">= ${fmt(s.kP)} W × ${fmt(s.kt)} s = ${kJ(s.kP*s.kt)}</text>
    <text x="400" y="170">E = m c ΔT</text><text x="400" y="190">= ${fmt(s.km,1)} × 4200 × ${fmt(s.T-15,1)} = ${kJ(Eh)}</text>
    <text x="400" y="230">E = m L</text><text x="400" y="250">= ${fmt(s.boiled,3)} kg × 2.26 MJ/kg = ${kJ(Eb)}</text></g>`;
  o+=`<text class="t-lab" x="16" y="22">A ${fmt(s.kP)} W JUG WITH ${fmt(s.km,1)} kg OF WATER, STARTING AT 15°C</text>`;
  return o;
}
// ---------- flask vs mug
const kMug=0.045,kFlask=0.0035;const Tf=(k,t)=>18+(92-18)*Math.exp(-k*t);
function drawFlask(st){
  let o=F.floor(640,330);
  const t=s.tc,tea=T=>{const k=Math.max(0,Math.min(1,(T-18)/74));return k>.5?"#C98A5E":"#E2B48E"};
  // mug: painted ceramic, tea inside, heat leaving three ways
  o+=F.box(96,150,98,104,{colour:PAL.case.blush,kind:"painted",d:14,r:10});
  o+=`<path d="M194,170 q32,0 32,30 q0,30 -32,30" fill="none" stroke="${F.deep(PAL.case.blush)}" stroke-width="7" stroke-linecap="round"/>`;
  o+=`<path d="M96,150 l14,-7.7 h98 l-14,7.7z" fill="${tea(Tf(kMug,t))}" stroke="${F.deep(PAL.case.blush)}"/>`;
  [["CONDUCTION",14,186],["CONVECTION",150,92],["RADIATION",232,196]].forEach(([n,x,y])=>{o+=`<text class="t-lab" x="${x}" y="${y}">${n}</text>`});
  o+=`<path d="M150,138 q-10,-18 0,-36 q10,-18 0,-36" fill="none" stroke="#C9CEDF" stroke-width="3" stroke-linecap="round"/><path d="M232,204 h28" stroke="${PAL.product.peach}" stroke-width="2.4" stroke-dasharray="3 3"/><path d="M96,204 h-28" stroke="${PAL.product.peach}" stroke-width="2.4"/>`;
  o+=`<text class="t-big" x="152" y="292" text-anchor="middle">Open mug ${fmt(Tf(kMug,t),1)}°C</text>`;
  // flask: steel shell cut away to show the vacuum gap and the shiny inner wall
  const fx=290;o+=F.cyl(fx+55,74,55,186,{colour:PAL.steel,kind:"metal",shadowLen:70});
  o+=`<rect x="${fx+14}" y="92" width="82" height="160" rx="16" fill="${PAL.paper}" stroke="#8F9BAA" stroke-dasharray="3 3"/><rect x="${fx+22}" y="100" width="66" height="144" rx="12" fill="${tea(Tf(kFlask,t))}" stroke="#E7ECF2" stroke-width="4"/>`;
  o+=F.box(fx+28,52,54,20,{colour:PAL.case.sky,kind:"plastic",d:8,r:6,shadow:false});
  o+=F.pill(fx+122,54,"Lid",{sub:"stops convection",ax:fx+82,ay:62});
  o+=F.pill(fx+122,98,"Vacuum gap",{sub:"no particles: no conduction or convection",ax:fx+18,ay:120});
  o+=F.pill(fx+122,150,"Shiny walls",{sub:"reflect radiation back in",ax:fx+86,ay:170});
  o+=`<text class="t-big" x="${fx+55}" y="292" text-anchor="middle">Vacuum flask ${fmt(Tf(kFlask,t),1)}°C</text>`;
  o+=`<text class="t-lab" x="16" y="22">TWO CUPS OF TEA AT 92°C IN AN 18°C ROOM</text><text class="t-ink" x="624" y="22" text-anchor="end">${fmt(t)} minutes</text>`;
  return o;
}
// ---------- circuit
function drawCircuit(st){
  const I=s.V/s.R,P=s.V*I;let o=F.floor(640,330);
  const L=110,T=70,Rr=500,B=270;
  // copper wires on a frosted acrylic board
  o+=F.acrylic(L-46,T-38,Rr-L+92,B-T+68,{tint:TINT,d:12,r:16});
  o+=`<rect x="${L}" y="${T}" width="${Rr-L}" height="${B-T}" fill="none" stroke="${PAL.copper}" stroke-width="4" rx="6"/><rect x="${L}" y="${T}" width="${Rr-L}" height="${B-T}" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="1" rx="6"/>`;
  // moving charges (conventional current direction + to -)
  const per=2*((Rr-L)+(B-T)),n=24;
  for(let k=0;k<n;k++){let d=((k/n)*per+s.cq*60)%per;let x,y;
    if(d<(Rr-L)){x=L+d;y=T}else if((d-=Rr-L)<(B-T)){x=Rr;y=T+d}else if((d-=B-T)<(Rr-L)){x=Rr-d;y=B}else{d-=Rr-L;x=L;y=B-d}
    o+=`<circle cx="${x}" cy="${y}" r="3.4" fill="${PAL.product.strawberry}" stroke="#fff" stroke-width="1"/>`}
  // battery: a painted cell standing on the wire
  o+=F.cyl(L,138,15,62,{colour:PAL.product.lime,kind:"painted",shadow:false});
  o+=`<text class="t-ink" x="${L-24}" y="182" text-anchor="end">${fmt(s.V,1)} V</text><text class="t-lab" x="${L+6}" y="132" text-anchor="middle">+</text>`;
  // lamp: a glass bulb that glows with the power
  const bx=(L+Rr)/2,glow=Math.min(1,P/60);
  o+=`<circle cx="${bx}" cy="${T}" r="${26+glow*30}" fill="${PAL.product.butter}" opacity="${glow*.35}"/>`;
  o+=F.box(bx-12,T+16,24,14,{colour:PAL.steel,kind:"metal",d:6,shadow:false});
  o+=`<circle cx="${bx}" cy="${T}" r="22" fill="${glow>.05?"#FFF6D6":"#F2FAFD"}" fill-opacity=".9" stroke="#A9CBE3" stroke-width="2"/><path d="M${bx-12},${T+6} l6,-14 l6,14 l6,-14 l6,14" fill="none" stroke="${glow>.05?PAL.product.butter:"#8F9BAA"}" stroke-width="2.2"/><path d="M${bx-12},${T-12} q4,-6 10,-6" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
  o+=`<text class="t-ink" x="${bx}" y="${T+48}" text-anchor="middle">${fmt(s.R)} Ω</text>`;
  // ammeter: a meter case on the wire
  o+=F.box(Rr-20,152,40,36,{colour:"#FFFFFF",kind:"plastic",d:8,r:8,shadow:false});
  o+=`<text class="t-big" x="${Rr}" y="175" text-anchor="middle">A</text><text class="t-ink" x="${Rr+34}" y="175">${fmt(I,2)} A</text>`;
  o+=`<g class="t-ink"><text x="230" y="150">I = V ÷ R = ${fmt(s.V,1)} ÷ ${fmt(s.R)} = ${fmt(I,2)} A</text><text x="230" y="175">P = V × I = ${fmt(s.V,1)} × ${fmt(I,2)} = ${fmt(P,1)} W</text><text x="230" y="200">In 1 minute: E = P × t = ${kJ(P*60)}</text></g>`;
  o+=`<text class="t-lab" x="16" y="22">A SIMPLE CIRCUIT: BATTERY, LAMP AND AMMETER</text>`;
  return o;
}
function drawClose(st0,st){
  let o=`<rect width="420" height="260" fill="var(--chalk)"/>`;
  if(["lift","drop","wire"].includes(st.k)){
    const Tot=s.m*g*s.h,vi=Math.sqrt(2*g*s.h);
    o+=`<text class="t-lab" x="14" y="22">THE NUMBERS</text>`;
    const rows=[["Ep = m g h",`${s.m} × 9.8 × ${fmt(s.h)} = ${kJ(Tot)}`],["Speed with no losses",`v = √(2gh) = ${fmt(vi,1)} m/s (${fmt(vi*3.6)} km/h)`],["SkyJump top speed","about 85 km/h (23.6 m/s)"],["Ek at 85 km/h",`½ × ${s.m} × 23.6² = ${kJ(0.5*s.m*VMAX*VMAX)}`],["Energy to heat (brake)",`${kJ(Tot-0.5*s.m*VMAX*VMAX)} by the bottom of the fall, then the rest`],["Work to lift (W = F d)",`${fmt(s.m*g)} N × ${fmt(s.h)} m = ${kJ(Tot)}`]];
    rows.forEach((r,i)=>{o+=`<text class="t-lab" x="14" y="${50+i*34}">${r[0].toUpperCase()}</text><text class="t-ink" x="14" y="${65+i*34}">${r[1]}</text>`});
    return o;
  }
  if(["heat","boil"].includes(st.k)){
    o+=`<text class="t-lab" x="14" y="22">TEMPERATURE AGAINST TIME</text>`;
    const tEnd=Math.max(300,s.kt),X=t=>40+t/tEnd*360,Y=T=>210-(T)/110*180;
    o+=`<line x1="40" x2="400" y1="210" y2="210" stroke="var(--rose)"/><line x1="40" x2="40" y1="24" y2="210" stroke="var(--rose)"/>`;
    [0,50,100].forEach(T=>o+=`<text class="t-lab" x="34" y="${Y(T)+3.5}" text-anchor="end">${T}°</text>`);
    const tb=s.km*C_W*85/s.kP;o+=`<path d="M${X(0)},${Y(15)} L${X(Math.min(tb,tEnd))},${Y(100)} L${X(tEnd)},${Y(100)}" fill="none" stroke="var(--line)" stroke-width="3"/>`;
    o+=`<circle cx="${X(s.kt)}" cy="${Y(s.T)}" r="6" fill="var(--sun)" stroke="var(--ink)"/>`;
    o+=`<text class="t-lab" x="220" y="230" text-anchor="middle">TIME (s) · ${fmt(tEnd)} s SHOWN</text>`;
    o+=`<text class="t-big" x="14" y="252">Reaches 100°C after ${fmt(tb)} s (${fmt(tb/60,1)} min), if no heat is lost</text>`;
    return o;
  }
  if(st.k==="flask"){
    o+=`<text class="t-lab" x="14" y="22">COOLING CURVES</text>`;const X=t=>40+t/240*360,Y=T=>210-(T-10)/90*180;
    o+=`<line x1="40" x2="400" y1="210" y2="210" stroke="var(--rose)"/><line x1="40" x2="40" y1="24" y2="210" stroke="var(--rose)"/>`;
    [20,50,90].forEach(T=>o+=`<text class="t-lab" x="34" y="${Y(T)+3.5}" text-anchor="end">${T}°</text>`);
    [[kMug,"var(--hot)","mug"],[kFlask,"var(--earth)","flask"]].forEach(([k,c,n])=>{let d="";for(let t=0;t<=240;t+=4)d+=(t?"L":"M")+X(t)+","+Y(Tf(k,t));o+=`<path d="${d}" fill="none" stroke="${c}" stroke-width="2.2"/><circle cx="${X(Math.min(240,s.tc))}" cy="${Y(Tf(k,Math.min(240,s.tc)))}" r="5" fill="${c}" stroke="var(--ink)"/><text class="t-lab" x="${X(240)}" y="${Y(Tf(k,240))-8}" text-anchor="end">${n.toUpperCase()}</text>`});
    o+=`<text class="t-lab" x="220" y="230" text-anchor="middle">TIME (MINUTES)</text><text class="t-body" x="14" y="252">A hotter drink loses heat faster, so both curves are steepest at the start.</text>`;
    return o;
  }
  o+=`<text class="t-lab" x="14" y="22">VOLTAGE AGAINST CURRENT FOR THIS LAMP</text>`;
  const X=I=>40+I/2*360,Y=V=>210-V/24*180;o+=`<line x1="40" x2="400" y1="210" y2="210" stroke="var(--rose)"/><line x1="40" x2="40" y1="24" y2="210" stroke="var(--rose)"/>`;
  o+=`<path d="M${X(0)},${Y(0)} L${X(Math.min(2,24/s.R))},${Y(Math.min(24,2*s.R))}" stroke="var(--earth)" stroke-width="2.4"/><circle cx="${X(s.V/s.R)}" cy="${Y(s.V)}" r="6" fill="var(--sun)" stroke="var(--ink)"/>`;
  [0,1,2].forEach(I=>o+=`<text class="t-lab" x="${X(I)}" y="226" text-anchor="middle">${I} A</text>`);[0,12,24].forEach(V=>o+=`<text class="t-lab" x="34" y="${Y(V)+3.5}" text-anchor="end">${V} V</text>`);
  o+=`<text class="t-body" x="14" y="250">The gradient of V against I is the resistance: ${fmt(s.R)} Ω.</text>`;
  return o;
}
const steps=[
 {k:"lift",lab:"Lift it",cap:"Winch a 70 kg jumper 192 m up the Sky Tower. Every metre adds gravitational potential energy: work done against gravity.",speed:1,speedLabel:"real time",controls:["play","restart","m"],
  big:"<b>The big idea:</b> work done lifting something becomes stored gravitational potential energy, Ep = mgh.",
  exam:"Lifting the 70 kg jumper 192 m does work against gravity: W = Fd = (70 × 9.8) × 192 = 131,712 J, about 132 kJ. This work is stored as gravitational potential energy, Ep = mgh.",
  trap:"Using the mass as the force. The force is the weight: mass × 9.8.",chips:["ep","height"],onStep:()=>{resetTower(false)}},
 {k:"drop",lab:"Drop it",cap:"Imagine no wire and no air. All the potential energy turns into kinetic energy and the jumper hits about 220 km/h.",speed:1,speedLabel:"real time",controls:["play","restart","m","h"],
  big:"<b>The big idea:</b> energy is conserved. With no losses, Ep at the top equals Ek at the bottom, so ½mv² = mgh.",
  exam:"If no energy is lost, all the gravitational potential energy becomes kinetic energy: mgh = ½mv². The mass cancels, so v = √(2gh) = √(2 × 9.8 × 192) = 61.3 m/s, about 220 km/h.",
  trap:"Thinking a heavier jumper falls faster with no air. The mass cancels out, so the speed is the same.",chips:["ep","ek","speed"],onStep:()=>{resetTower(true)}},
 {k:"wire",lab:"SkyJump",cap:"The real SkyJump runs on a guide wire with a brake that holds the speed to about 85 km/h. The rest of the energy becomes heat in the brake.",speed:1,speedLabel:"real time",controls:["play","restart","m"],
  big:"<b>The big idea:</b> energy isn't lost, it's transformed. The brake turns most of the 132 kJ into heat, so only a little ends up as kinetic energy.",
  exam:"At 85 km/h (23.6 m/s) the 70 kg jumper has Ek = ½ × 70 × 23.6² = 19.5 kJ. The jumper started with 132 kJ of potential energy, so about 112 kJ has been transformed into heat in the brake and the surrounding air by then.",
  trap:"Saying energy is lost. Say it is transformed into heat (and some sound), which spreads into the surroundings.",chips:["ep","ek","heat","speed"],onStep:()=>{s.h=192;resetTower(true)}},
 {k:"heat",lab:"Heat it",cap:"A 2.2 kW jug heats 1 kg of water from 15°C. Watch the energy from E = Pt pour into the water as E = mcΔT.",speed:1,speedLabel:"12× real time",controls:["play","restart","km","kP"],
  big:"<b>The big idea:</b> power is energy per second. E = Pt tells you energy delivered; E = mcΔT tells you how far that energy heats the water.",
  exam:"To heat 1 kg of water from 15°C to 100°C needs E = mcΔT = 1 × 4200 × 85 = 357,000 J. A 2200 W jug supplies 2200 J each second, so t = E ÷ P = 357,000 ÷ 2200 = 162 s, about 2.7 minutes, if no heat is lost.",
  trap:"Mixing up c (specific heat, per °C) and L (latent heat, for a change of state).",chips:["temp","epower","time"],onStep:()=>{s.T=15;s.kt=0;s.boiled=0}},
 {k:"boil",lab:"Boil it",cap:"At 100°C the temperature stops rising. Now the energy boils water away instead: E = mL.",speed:1,speedLabel:"12× real time",controls:["play","restart","km","kP"],
  big:"<b>The big idea:</b> changing state takes latent heat without changing temperature. Boiling 1 kg of water takes 2.26 MJ, over six times the energy to heat it from 15°C.",
  exam:"Once the water reaches 100°C, the energy goes into changing its state, not raising its temperature. Boiling 0.1 kg of water needs E = mL = 0.1 × 2.26 × 10⁶ = 226,000 J, which takes 226,000 ÷ 2200 = 103 s.",
  trap:"Expecting the temperature to go above 100°C while water is boiling at sea level.",chips:["temp","boiled","time"],onStep:()=>{s.T=100;s.kt=0;s.boiled=0}},
 {k:"flask",lab:"Keep it warm",cap:"Two teas at 92°C. The open mug loses heat by conduction, convection and radiation. The vacuum flask blocks all three.",speed:1,speedLabel:"1 minute ≈ 0.2 s",controls:["play","restart"],
  big:"<b>The big idea:</b> to slow heat loss, block each way heat moves: conduction and convection need particles, radiation doesn't.",
  exam:"The vacuum flask keeps the tea hot because the vacuum between its walls has no particles, so heat cannot travel across it by conduction or convection. The shiny silver walls reflect infrared radiation back towards the tea, and the lid stops convection currents and evaporation from the surface.",
  trap:"Saying a vacuum stops radiation. Radiation can cross a vacuum; the shiny surfaces reduce it.",chips:["mug","flask"],onStep:()=>{s.tc=0}},
 {k:"circuit",lab:"Circuits",cap:"Turn up the voltage or change the lamp's resistance. The current, the power and the brightness follow V = IR and P = VI.",speed:1,speedLabel:"live",controls:["play","V","R"],
  big:"<b>The big idea:</b> voltage pushes, resistance resists, and current is the result. Power is the rate electrical energy is transformed.",
  exam:"With a 12 V battery and a 24 Ω lamp, the current is I = V ÷ R = 12 ÷ 24 = 0.5 A. The power is P = VI = 12 × 0.5 = 6 W, so the lamp transforms 6 joules of electrical energy into light and heat every second.",
  trap:"Writing the unit of power as J. Power is in watts: joules per second.",chips:["current","power"]},
 {k:"test",lab:"Test yourself",cap:"Use the sliders to set up each one, then press Check. The machine marks you with the same formulas it runs.",speed:0,controls:["m","h","km","kP","V","R"],
  big:"<b>Exam tip:</b> write the formula, substitute with units, give the answer with units, then say what it means in the context.",
  chips:["speed","current","power"]}
];
const set=k=>(x,v)=>{s[k]=v};
// ---- kupu Māori: te reo terms for this machine, each checked in Te Aka Māori Dictionary (ta = word id). Sources and notes: te-reo-notes.md
const KUPU=[
 {mi:"pūngao",en:"energy",ta:40075,chip:"epower"},
 {mi:"pūngao moe",en:"potential energy",ta:47720,chip:"ep"},
 {mi:"pūngao neke",en:"kinetic energy",ta:47721,chip:"ek"},
 {mi:"teitei",en:"height",ta:7895,chip:"height"},
 {mi:"wera",en:"heat",ta:9229,chip:"heat"},
 {mi:"paemahana",en:"temperature",ta:39927,chip:"temp"},
 {mi:"hiko",en:"electricity",ta:1171},
 {mi:"pūngao hiko",en:"electrical energy",ta:47713}];
Object.entries({"lift": ["pūngao moe", "teitei", "pūngao"], "drop": ["pūngao neke", "pūngao moe"], "wire": ["pūngao moe", "pūngao neke", "pūngao"], "heat": ["wera", "paemahana"], "boil": ["wera", "paemahana"], "flask": ["wera", "paemahana"], "circuit": ["hiko", "pūngao hiko"]}).forEach(([k,a])=>{const st=steps.find(x=>x.k===k);if(st)st.kupu=a});
// ---------- the 3D bench: one world, four scenes, and the camera flies between them (see ../kit3d.js)
// 1 unit = 40 m at the tower; the jug, flask and circuit are at bench scale. Every moving part reads the same state as the drawings.
function energy3d(S){const {THREE,mat,PAL}=S;const V3=(x,y,z)=>new THREE.Vector3(x,y,z);
  const ZT=V3(-9.5,0,-2.5),ZK=V3(-2.2,0,1.2),ZF=V3(3.8,0,1.6),ZC=V3(10,0,-.6);
  const plinth=(c,w,d,tint)=>{const p=S.rbox(w,.34,d,.14,mat("plastic",tint,{rough:.55,coat:.2}));p.position.set(c.x,.17,c.z);S.scene.add(p);return p};
  plinth(ZT,7.4,6.4,PAL.case.sky);plinth(ZK,5,4.6,PAL.case.mint);plinth(ZF,5.6,4.6,PAL.case.lavender);plinth(ZC,5.8,4.8,PAL.case.butter);
  const TOP=.34;
  // ---------------------------------------------------------------- tower zone: Sky Tower, guide wires, jumper, a tiny pastel city
  const tower=S.group();tower.position.set(ZT.x,TOP,ZT.z);
  const U=40,TH=192/U;
  const conc=mat("plastic","#EFEAE2",{rough:.6,coat:.15});
  const shaft=S.cyl(.17,.26,TH*.92,conc,{seg:48});shaft.position.y=TH*.46;tower.add(shaft);
  for(let i=0;i<6;i++){const a=i/6*Math.PI*2;const leg=S.cyl(.05,.09,1.05,conc,{seg:16});leg.position.set(Math.cos(a)*.34,.5,Math.sin(a)*.34);leg.rotation.set(Math.sin(a)*.32,0,-Math.cos(a)*.32);tower.add(leg)}
  const podY=TH*.9;
  const pod=S.group(tower);pod.position.y=podY;
  pod.add(S.cyl(.42,.3,.16,conc,{at:[0,-.16,0]}));
  pod.add(S.cyl(.56,.42,.12,mat("plastic",PAL.case.sky,{rough:.3}),{at:[0,-.02,0]}));
  const win=S.cyl(.56,.56,.2,mat("glass","#BFDDF5",{opacity:.5}),{at:[0,.14,0]});pod.add(win);
  pod.add(S.cyl(.5,.56,.08,conc,{at:[0,.28,0]}));pod.add(S.cyl(.3,.46,.14,conc,{at:[0,.39,0]}));
  const mast=S.cyl(.03,.07,1.7,mat("metal"),{at:[0,.46+.85,0]});pod.add(mast);
  const tip=S.sphere(.05,mat("glow","#FF5A5A",3),{at:[0,.46+1.72,0]});pod.add(tip);
  // the jump platform and the two guide wires down to a landing target
  const JX=.78;
  const plat=S.rbox(.36,.05,.24,.02,mat("plastic",PAL.product.butter,{rough:.4}),{at:[JX-.16,-.2,0]});pod.add(plat);
  const wireM=mat("metal",PAL.steelDark,{rough:.35});
  for(const dz of [-.08,.08]){const w=S.cyl(.008,.008,podY-.2,wireM,{seg:6});w.position.set(JX,(podY-.2)/2,dz);tower.add(w)}
  const target=S.group(tower);target.position.set(JX,.012,0);
  [[.34,"#ffffff"],[.25,PAL.product.strawberry],[.16,"#ffffff"],[.08,PAL.product.strawberry]].forEach(([r,c],i)=>target.add(S.cyl(r,r,.024+i*.004,mat("plastic",c,{rough:.5}),{seg:40})));
  // the jumper: a little helmeted figure in a harness (no face, as on every bench figure)
  const jumper=S.group(tower);
  const suit=mat("plastic",PAL.product.strawberry,{rough:.35});
  const body=S.mesh(new THREE.CapsuleGeometry(.055,.12,6,16),suit);jumper.add(body);
  const head=S.sphere(.05,mat("plastic","#ffffff",{rough:.2}),{at:[0,.13,0],seg:20});jumper.add(head);
  const visor=S.sphere(.051,mat("plastic",PAL.ink,{rough:.15}),{seg:20});visor.scale.set(1,.55,1);visor.position.set(.012,.128,0);jumper.add(visor);
  for(const dz of [-.035,.035]){const leg=S.cyl(.022,.02,.12,mat("plastic",PAL.ink,{rough:.4}),{seg:10});leg.position.set(0,-.14,dz);jumper.add(leg)}
  const harness=S.torus(.058,.012,mat("plastic",PAL.product.butter),{at:[0,.02,0],rot:[Math.PI/2,0,0]});jumper.add(harness);
  const brake=S.rbox(.07,.05,.2,.015,mat("metal",PAL.steel,{fresh:true}),{at:[0,.24,0]});jumper.add(brake);
  const brakeGlow=S.sphere(.06,new THREE.MeshBasicMaterial({color:PAL.hot,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}),{at:[0,.24,0],cast:false});jumper.add(brakeGlow);
  const winch=S.cyl(.004,.004,1,mat("plastic",PAL.ink),{seg:6,cast:false});tower.add(winch);
  S.pick(jumper,()=>{S.api.state.playing=!S.api.state.playing});
  // a pastel city around the base (instanced, so it costs one draw call)
  {const n=70,city=S.swarm(n,new S.RoundedBoxGeometry(1,1,1,2,.08),mat("plastic","#ffffff",{rough:.5}),{colors:true,cast:true});city.castShadow=true;city.receiveShadow=true;
    const cols=[PAL.case.peach,PAL.case.mint,PAL.case.blush,PAL.case.lavender,PAL.case.butter,"#ffffff","#E7EEF7"];let i=0,seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
    while(i<n){const x=(rnd()-.5)*6.6,z=(rnd()-.5)*5.6;const r=Math.hypot(x-.4,z);if(r<1.05||(Math.abs(x-JX)<.5&&Math.abs(z)<.5))continue;
      const w=.22+rnd()*.3,d=.22+rnd()*.3,h=.1+rnd()*rnd()*(r<2?.8:.4);city.putS(i,ZT.x+x,TOP+h/2,ZT.z+z,w,h,d);city.tint(i,cols[i%cols.length]);i++}
    city.done();S.scene.add(city)}
  // three frosted energy columns: potential, kinetic, heat (the same split as the chips)
  const cols3=[["Ep",PAL.product.blueberry],["Ek",PAL.product.strawberry],["Heat",PAL.product.peach]].map(([n,c],i)=>{const g=S.group();g.position.set(ZT.x-2.9+i*.75,TOP,ZT.z+1.9);
    const CH=2.6;g.add(S.cyl(.24,.24,.08,mat("plastic","#ffffff"),{at:[0,.04,0]}));
    const fillM=mat("liquid",c,{fresh:true,opacity:1});fillM.transparent=false;const fill=S.cyl(.19,.19,1,fillM,{seg:32});g.add(fill);
    const glass=S.cyl(.22,.22,CH,mat("acrylic","#ffffff",{opacity:.28}),{seg:32,cast:false});glass.position.y=.08+CH/2;glass.renderOrder=4;g.add(glass);
    g.add(S.torus(.22,.02,mat("plastic",PAL.case.sky),{at:[0,.08+CH,0],rot:[Math.PI/2,0,0]}));
    const lab=S.label({off:[[-26,-30],[0,-46],[26,-30]][i]});return {g,fill,CH,lab,n}});
  // streaks behind a fast jumper
  const streak=S.puffs(40,"#ffffff");S.scene.add(streak);const sp=[];for(let i=0;i<40;i++)sp.push({x:0,y:-9,z:0,a:0,life:0});
  const lHeight=S.label({off:[-22,-10]}),lSpeed=S.label({off:[22,-10],cls:"hot"});

  // ---------------------------------------------------------------- jug zone
  const jug=S.group();jug.position.set(ZK.x,TOP,ZK.z);
  const base=S.rbox(1.6,.18,1.6,.08,mat("plastic",PAL.product.peach,{rough:.3}),{at:[0,.09,0]});jug.add(base);
  const ring=S.torus(.55,.025,mat("glow","#ff6a3d",0),{at:[0,.19,0],rot:[Math.PI/2,0,0]});jug.add(ring);
  const prof=[];const JH=1.7;for(let i=0;i<=20;i++){const y=i/20*JH;prof.push(new THREE.Vector2(.62-.07*(y/JH)+.02*Math.sin(y/JH*Math.PI),y))}
  const shell=S.mesh(new THREE.LatheGeometry(prof,64),mat("acrylic",PAL.case.sky,{opacity:.3}),{cast:false});shell.position.y=.2;shell.renderOrder=4;jug.add(shell);
  const jbottom=S.cyl(.62,.62,.05,mat("plastic","#ffffff"),{at:[0,.22,0],seg:48});jug.add(jbottom);
  const lid=S.cyl(.5,.57,.1,mat("plastic","#ffffff",{rough:.3}),{at:[0,.2+JH+.05,0],seg:48});jug.add(lid);
  jug.add(S.sphere(.08,mat("plastic",PAL.case.sky),{at:[0,.2+JH+.13,0]}));
  jug.add(S.tube([[.55,1.55,0],[1.05,1.45,0],[1.12,.9,0],[1.0,.5,0],[.6,.45,0]],.07,mat("plastic","#ffffff",{rough:.3})));
  const spout=S.cyl(.08,.2,.4,mat("acrylic","#E9F4FC",{opacity:.3}),{at:[-.62,1.72,0],rot:[0,0,-.9],cast:false});jug.add(spout);
  const coil=S.tube(Array.from({length:60},(_,i)=>{const a=i/59*Math.PI*6;const r=.12+.3*(i/59);return [Math.cos(a)*r,.27,Math.sin(a)*r]}),.022,mat("glow","#ff7a45",0),{seg:200});jug.add(coil);
  const waterM=mat("liquid",PAL.water,{fresh:true,opacity:1});waterM.transparent=false;
  const water=S.mesh(new THREE.CylinderGeometry(.57,.59,1,56),waterM,{cast:false});jug.add(water);
  const surf=S.mesh(new THREE.CircleGeometry(.57,56),mat("liquid","#ffffff",{fresh:true,opacity:.35}),{cast:false,rot:[-Math.PI/2,0,0]});jug.add(surf);
  const bub=S.swarm(160,new THREE.SphereGeometry(1,10,8),mat("plastic","#ffffff",{rough:.05,coat:1}));jug.add(bub);
  const bubs=[];for(let i=0;i<160;i++)bubs.push({x:0,y:-1,z:0,v:0,r:0});
  const steam=S.puffs(90,"#ffffff");jug.add(steam);const sts=[];for(let i=0;i<90;i++)sts.push({x:0,y:0,z:0,vx:0,vy:0,a:0,life:0});
  // a thermometer beside the jug
  const thermo=S.group(jug);thermo.position.set(1.15,0,.55);
  thermo.add(S.cyl(.07,.07,1.6,mat("glass","#ffffff",{opacity:.3}),{at:[0,1.0,0],cast:false}));thermo.add(S.sphere(.11,mat("glow","#ff5a5a",.6),{at:[0,.22,0]}));
  const mercury=S.cyl(.035,.035,1,mat("glow","#ff5a5a",.6),{seg:12});thermo.add(mercury);thermo.add(S.rbox(.3,.08,.3,.03,mat("plastic","#ffffff"),{at:[0,.04,0]}));
  const lTemp=S.label({cls:"big",off:[24,-30]}),lJug=S.label({off:[-24,-20]});
  S.pick(base,()=>{S.api.state.playing=!S.api.state.playing});

  // ---------------------------------------------------------------- flask and mug zone
  const fz=S.group();fz.position.set(ZF.x,TOP,ZF.z);
  const ceramic=mat("plastic",PAL.case.blush,{rough:.35});
  const mprof=[new THREE.Vector2(0,0),new THREE.Vector2(.5,0),new THREE.Vector2(.55,.05),new THREE.Vector2(.58,1.1),new THREE.Vector2(.5,1.1),new THREE.Vector2(.47,.12),new THREE.Vector2(0,.12)];
  const mug=S.mesh(new THREE.LatheGeometry(mprof,64),ceramic);mug.position.set(-1.25,0,.3);fz.add(mug);
  mug.add(S.torus(.3,.07,ceramic,{at:[.62,.6,0],rot:[0,0,0],arc:Math.PI,ts:32}));mug.children[0].rotation.z=-Math.PI/2;
  const teaC=new THREE.Color();const teaM=mat("liquid","#C98A5E",{fresh:true,opacity:1});teaM.transparent=false;
  const mugTea=S.mesh(new THREE.CircleGeometry(.48,48),teaM,{rot:[-Math.PI/2,0,0],at:[0,.98,0]});mug.add(mugTea);
  const mugGlow=S.mesh(new THREE.LatheGeometry(mprof.slice(1,4),48),new THREE.MeshBasicMaterial({color:PAL.hot,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}),{cast:false});mugGlow.scale.setScalar(1.03);mug.add(mugGlow);
  const mugSteam=S.puffs(60,"#ffffff");fz.add(mugSteam);const ms=[];for(let i=0;i<60;i++)ms.push({x:0,y:0,z:0,a:0,life:Math.random()*3});
  const rings=[0,1,2].map(i=>{const r=S.torus(.62,.012,new THREE.MeshBasicMaterial({color:PAL.hot,transparent:true,opacity:0,depthWrite:false}),{rot:[Math.PI/2,0,0],cast:false});r.position.set(-1.25,.6,.3);fz.add(r);return r});
  // the flask, cut away so you can see the vacuum gap and the silvered walls
  const fl=S.group(fz);fl.position.set(.9,0,.1);
  const cut=Math.PI*.55;
  const outer=S.mesh(new THREE.CylinderGeometry(.55,.55,1.7,64,1,true,cut,Math.PI*2-cut),mat("metal",PAL.steel,{rough:.25,fresh:true}));outer.material.side=THREE.DoubleSide;outer.position.y=.85;fl.add(outer);
  const inner=S.mesh(new THREE.CylinderGeometry(.38,.38,1.5,64,1,true,cut,Math.PI*2-cut),mat("metal","#F4F7FA",{rough:.06,fresh:true}));inner.material.side=THREE.DoubleSide;inner.position.y=.92;fl.add(inner);
  fl.add(S.cyl(.55,.55,.06,mat("metal",PAL.steel),{at:[0,.03,0],seg:64}));
  const lipM=mat("plastic","#ffffff",{rough:.3});
  for(const [r,y] of [[.465,1.7],[.465,.17]]){const capR=S.mesh(new THREE.RingGeometry(.38,.55,64,1,cut,Math.PI*2-cut),lipM,{rot:[-Math.PI/2,0,0]});capR.material.side=THREE.DoubleSide;capR.position.y=y;fl.add(capR)}
  const flTea=S.mesh(new THREE.CylinderGeometry(.37,.37,1.2,64,1,false,cut,Math.PI*2-cut),teaM.clone(),{cast:false});flTea.position.y=.8;fl.add(flTea);
  const flLid=S.group(fl);flLid.position.y=1.7;flLid.add(S.cyl(.4,.4,.16,mat("plastic",PAL.case.sky,{rough:.3}),{at:[0,.08,0],seg:48}));flLid.add(S.cyl(.32,.4,.12,mat("plastic",PAL.case.sky,{rough:.3}),{at:[0,.22,0],seg:48}));
  // a little graph screen behind the two cups
  const graph=S.panel(640,360,2.6);graph.position.set(-.2,1.75,-1.4);fz.add(graph);
  const gFrame=S.rbox(2.78,1.62,.08,.06,mat("plastic","#ffffff",{rough:.3}),{at:[-.2,1.75,-1.46]});fz.add(gFrame);
  fz.add(S.cyl(.04,.06,.95,mat("metal"),{at:[-.2,.47,-1.5]}));
  let gLast=-1;
  const lMug=S.label({cls:"big",off:[-20,-34]}),lFlask=S.label({cls:"big",off:[22,-34]}),lGap=S.label({off:[30,6]}),lWall=S.label({off:[30,30]}),lLid=S.label({off:[30,-24]});
  lGap.set("Vacuum gap<small>no particles: no conduction or convection</small>");lWall.set("Shiny walls<small>reflect radiation back in</small>");lLid.set("Lid<small>stops convection</small>");
  const lConv=S.label({off:[-26,-10]}).set("Convection"),lRad=S.label({off:[-30,10]}).set("Radiation"),lCond=S.label({off:[-30,20]}).set("Conduction");

  // ---------------------------------------------------------------- circuit zone
  const cz=S.group();cz.position.set(ZC.x,TOP,ZC.z);
  const board=S.rbox(4.6,.12,3.4,.1,mat("acrylic",PAL.case.sky,{opacity:.55}),{at:[0,.06,0],cast:false});board.renderOrder=1;cz.add(board);
  for(const x of [-2.1,2.1])for(const z of [-1.5,1.5])cz.add(S.cyl(.07,.07,.2,mat("metal"),{at:[x,.1,z],seg:16}));
  const cw=1.7,cd=1.1,cy=.2,rr=.25;const loop=[];
  const corner=(cx,cz2,a0)=>{for(let i=0;i<=6;i++){const a=a0+i/6*Math.PI/2;loop.push(V3(cx+Math.cos(a)*rr,cy,cz2+Math.sin(a)*rr))}};
  corner(cw-rr,cd-rr,0);corner(-cw+rr,cd-rr,Math.PI/2);corner(-cw+rr,-cd+rr,Math.PI);corner(cw-rr,-cd+rr,Math.PI*1.5);
  const path=new THREE.CatmullRomCurve3(loop,true,"centripetal");
  const wire=S.tube(path,.045,mat("metal",PAL.copper,{rough:.3}),{seg:220,closed:true});cz.add(wire);
  // the battery on the left side, the lamp at the back, the ammeter on the right
  const batt=S.group(cz);batt.position.set(-cw,cy,0);batt.rotation.x=Math.PI/2;
  batt.add(S.cyl(.2,.2,.7,mat("plastic",PAL.product.lime,{rough:.35}),{seg:40}));batt.add(S.cyl(.2,.2,.12,mat("plastic",PAL.ink,{rough:.35}),{at:[0,-.4,0],seg:40}));
  batt.add(S.cyl(.07,.07,.08,mat("metal"),{at:[0,.39,0],seg:20}));
  const lamp=S.group(cz);lamp.position.set(0,cy,-cd);
  lamp.add(S.cyl(.16,.16,.22,mat("metal",PAL.steel,{rough:.2}),{at:[0,.12,0],seg:32}));
  const bulb=S.sphere(.34,mat("glass","#ffffff",{opacity:.25}),{at:[0,.55,0],cast:false,seg:40});bulb.renderOrder=6;lamp.add(bulb);
  const filM=mat("glow","#FFC24A",0,);const fil=S.tube([[-.1,.3,0],[-.1,.5,0],[-.05,.6,0],[0,.5,0],[.05,.6,0],[.1,.5,0],[.1,.3,0]],.012,filM,{seg:80,cast:false});lamp.add(fil);
  const halo=S.sphere(.5,new THREE.MeshBasicMaterial({color:"#FFD76A",transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}),{at:[0,.55,0],cast:false});lamp.add(halo);
  const lampLight=new THREE.PointLight("#FFC873",0,6,1.6);lampLight.position.set(0,.55,0);lamp.add(lampLight);
  const meter=S.group(cz);meter.position.set(cw,cy+.18,0);
  meter.add(S.rbox(.7,.42,.7,.08,mat("plastic","#ffffff",{rough:.3})));
  const dial=S.panel(256,160,.56);dial.rotation.x=-Math.PI/2;dial.position.set(0,.215,0);meter.add(dial);let dLast=-1;
  const charges=S.swarm(36,new THREE.SphereGeometry(.05,14,10),mat("glow",PAL.product.strawberry,1.2));cz.add(charges);
  const lV=S.label({off:[-26,-24]}),lR=S.label({off:[30,-30]}),lI=S.label({cls:"hot",off:[28,10]}),lP=S.label({cls:"big",off:[-30,-40]});
  S.pick(lamp,()=>{});

  // ---------------------------------------------------------------- views
  S.view("tower",[ZT.x+4.6,3.4,ZT.z+8.2],[ZT.x-.4,2.4,ZT.z],{min:3,max:24});
  S.view("jug",[ZK.x+2.8,2.9,ZK.z+5.4],[ZK.x+.2,1.05,ZK.z],{min:2.5,max:16});
  S.view("flask",[ZF.x+1.6,3.0,ZF.z+6.3],[ZF.x,1.1,ZF.z-.2],{min:2.5,max:16});
  S.view("circuit",[ZC.x+1.2,4.6,ZC.z+5.6],[ZC.x,.3,ZC.z],{min:2.5,max:16});
  S.view("all",[1.5,12,24],[0,1.4,0],{min:6,max:50});
  const zoneOf=k=>["lift","drop","wire"].includes(k)?"tower":["heat","boil"].includes(k)?"jug":k==="flask"?"flask":k==="circuit"?"circuit":"all";
  const centers={tower:[ZT.x,2,ZT.z],jug:[ZK.x,0,ZK.z],flask:[ZF.x,0,ZF.z],circuit:[ZC.x,0,ZC.z],all:[0,0,0]};
  const half={tower:6,jug:3,flask:3.5,circuit:3.5,all:15};
  let zone=null;S.goView("all",true);
  const allLabels=[...cols3.map(c=>c.lab),lHeight,lSpeed,lTemp,lJug,lMug,lFlask,lGap,lWall,lLid,lConv,lRad,lCond,lV,lR,lI,lP];
  const vis={tower:[...cols3.map(c=>c.lab),lHeight,lSpeed],jug:[lTemp,lJug],flask:[lMug,lFlask,lGap,lWall,lLid,lConv,lRad,lCond],circuit:[lV,lR,lI,lP],all:[]};

  const tmp=new THREE.Vector3(),wp=o=>o.getWorldPosition(new THREE.Vector3());
  return {
    step(st){zone=zoneOf(st.k);S.goView(zone);S.setShadowBox(half[zone],centers[zone]);allLabels.forEach(l=>l.hide());vis[zone].forEach(l=>l.show());
      winch.visible=st.k==="lift";brakeGlow.visible=brake.visible=st.k==="wire"},
    update(s,st,dt,t){
      // ---- tower
      const jy=s.y/U;jumper.position.set(JX,Math.max(.2,jy+.2),0);jumper.rotation.z=st.k==="lift"?0:Math.min(.5,s.v*.01);
      if(st.k==="lift"){const top=podY-.22,len=Math.max(.01,top-jumper.position.y-.25);winch.scale.y=len;winch.position.set(JX,jumper.position.y+.25+len/2,0)}
      const Ep=s.m*g*s.y,Ek=.5*s.m*s.v*s.v,Hh=st.k==="wire"?s.heat:0,Tot=Math.max(1,s.m*g*s.h);
      [Ep,Ek,Hh].forEach((E,i)=>{const c=cols3[i];const f=S.clamp(E/Tot,0,1);c.fill.scale.y=Math.max(.001,f*c.CH);c.fill.position.y=.08+f*c.CH/2;
        c.lab.at(tmp.set(c.g.position.x,TOP+.1+c.CH,c.g.position.z)).set(`${c.n}<b>${kJ(E)}</b>`)});
      if(st.k==="wire"){const rate=S.clamp(s.v/VMAX,0,1)*(s.y>0?1:0);brakeGlow.material.opacity=.15+.6*rate*(.7+.3*Math.sin(t*30));brake.material.emissive=new THREE.Color(PAL.hot);brake.material.emissiveIntensity=rate*1.5}
      lHeight.at(wp(jumper)).set(`Height<b>${fmt(s.y)} m</b>`);lSpeed.at(wp(jumper)).set(`Speed<b>${fmt(s.v*3.6)} km/h</b>`);
      const jw=wp(jumper);for(let i=0;i<sp.length;i++){const p=sp[i];p.life-=dt;if(p.life<=0&&s.v>4&&s.playing&&Math.random()<.5){p.x=jw.x+(Math.random()-.5)*.06;p.y=jw.y+.05;p.z=jw.z+(Math.random()-.5)*.06;p.life=.5;p.a=S.clamp(s.v/40,0,1)*.7}
        streak.put(i,p.x,p.y+(.5-p.life)*.3,p.z,p.life>0?p.a*p.life*2:0,60)}streak.done();
      tip.material.emissiveIntensity=2+Math.sin(t*3)*1.5;
      // ---- jug
      const lvl=S.clamp((s.km-s.boiled)/1.7*.9,.02,.95)*JH*.92;water.scale.y=lvl;water.position.y=.245+lvl/2;surf.position.y=.25+lvl;
      const warm=S.clamp((s.T-15)/85,0,1);waterM.color.set(PAL.water).lerp(new THREE.Color("#F6B384"),warm);
      const on=s.playing&&["heat","boil"].includes(st.k);const heatK=on?1:Math.max(0,ring.material.emissiveIntensity-dt*2)/3;
      ring.material.emissiveIntensity=coil.material.emissiveIntensity=on?2.4+Math.sin(t*12)*.3:Math.max(0,coil.material.emissiveIntensity-dt*2);
      const boiling=s.T>=99.9;const nuc=on?(boiling?1:S.clamp((s.T-60)/40,0,1)*.35):0;
      for(let i=0;i<bubs.length;i++){const b=bubs[i];if(b.y<0||b.y>lvl){if(Math.random()<nuc*.25){const a=Math.random()*6.28,r=Math.random()*.48;b.x=Math.cos(a)*r;b.z=Math.sin(a)*r;b.y=.02;b.v=.3+Math.random()*.5;b.r=.012+Math.random()*.02}else{b.y=-1}}
        if(b.y>=0){b.y+=b.v*dt*(boiling?1.8:1);b.r+=dt*.01*(boiling?2:.5);b.x+=Math.sin(t*5+i)*.002}bub.put(i,b.x,b.y<0?-50:.25+b.y,b.z,b.y<0?0:b.r)}bub.done();
      for(let i=0;i<sts.length;i++){const p=sts[i];p.life-=dt;if(p.life<=0){if(boiling&&on&&Math.random()<.6){p.x=-.95+(Math.random()-.5)*.08;p.y=1.95;p.z=(Math.random()-.5)*.08;p.vx=-.25-Math.random()*.2;p.vy=.5+Math.random()*.4;p.life=1.6+Math.random()}else p.life=0}
        else{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.98}steam.put(i,p.x,p.y,p.z,p.life>0?Math.min(.55,p.life*.4):0,(2.6-p.life)*260+80)}steam.done();
      mercury.scale.y=.1+1.3*S.clamp(s.T/105,0,1);mercury.position.y=.25+mercury.scale.y/2;
      lTemp.at(tmp.set(ZK.x+1.15,TOP+.3+mercury.scale.y,ZK.z+.55)).set(`Water<b>${fmt(s.T,1)}°C</b>`);
      lJug.at(tmp.set(ZK.x-.4,TOP+.25+lvl,ZK.z)).set(st.k==="boil"?`Boiled away<b>${fmt(s.boiled*1000)} g</b>`:`Energy in<b>${kJ(s.kP*s.kt)}</b>`);
      // ---- flask and mug
      const Tm=Tf(kMug,s.tc),Tk=Tf(kFlask,s.tc);const hot=T=>{const k=S.clamp((T-18)/74,0,1);return teaC.set("#E2B48E").lerp(new THREE.Color("#B8743F"),k).clone()};
      teaM.color.copy(hot(Tm));flTea.material.color.copy(hot(Tk));
      const loss=S.clamp((Tm-18)/74,0,1);mugGlow.material.opacity=.18*loss*(.75+.25*Math.sin(t*2));
      for(let i=0;i<ms.length;i++){const p=ms[i];p.life-=dt;if(p.life<=0){p.x=-1.25+(Math.random()-.5)*.6;p.y=1.15;p.z=.3+(Math.random()-.5)*.6;p.life=2+Math.random()*1.5;p.a=.5*loss}
        p.y+=dt*.35;p.x+=Math.sin(t+i)*dt*.05;mugSteam.put(i,p.x,p.y,p.z,p.a*Math.min(1,p.life*.6)*Math.min(1,(3.5-p.life)),(3.6-p.life)*180+60)}mugSteam.done();
      rings.forEach((r,i)=>{const ph=((t*.5+i/3)%1);r.scale.setScalar(1+ph*1.4);r.material.opacity=(1-ph)*.55*loss});
      if(Math.abs(s.tc-gLast)>.4||gLast<0){gLast=s.tc;graph.redraw((g2,w,h)=>{g2.fillStyle="#fff";g2.fillRect(0,0,w,h);const X=tt=>60+tt/240*(w-90),Y=T=>h-50-(T-10)/90*(h-90);
        g2.strokeStyle="#E3DEEE";g2.lineWidth=2;for(const T of [20,50,90]){g2.beginPath();g2.moveTo(60,Y(T));g2.lineTo(w-30,Y(T));g2.stroke();g2.fillStyle="#6E6A86";g2.font="600 20px Instrument Sans, system-ui";g2.textAlign="right";g2.fillText(T+"°",52,Y(T)+7)}
        g2.textAlign="left";g2.fillStyle="#222A55";g2.font="700 22px Instrument Sans, system-ui";g2.fillText("COOLING CURVES",60,34);g2.font="600 18px Instrument Sans, system-ui";g2.fillStyle="#6E6A86";g2.fillText(fmt(s.tc)+" min",w-120,34);
        [[kMug,PAL.deep.blush],[kFlask,PAL.deep.sky]].forEach(([k,c])=>{g2.strokeStyle=c;g2.lineWidth=6;g2.lineCap="round";g2.beginPath();for(let tt=0;tt<=s.tc;tt+=2)g2[tt?"lineTo":"moveTo"](X(tt),Y(Tf(k,tt)));g2.stroke();
          g2.fillStyle=c;g2.beginPath();g2.arc(X(s.tc),Y(Tf(k,s.tc)),9,0,7);g2.fill()})})}
      lMug.at(tmp.set(ZF.x-1.25,TOP+1.15,ZF.z+.3)).set(`Open mug<b>${fmt(Tm,1)}°C</b>`);lFlask.at(tmp.set(ZF.x+.9,TOP+1.95,ZF.z+.1)).set(`Flask<b>${fmt(Tk,1)}°C</b>`);
      lGap.at(tmp.set(ZF.x+.9+.47*Math.cos(-cut*.5-.2),TOP+1.0,ZF.z+.1+.47*Math.sin(cut*.5+.2)));lWall.at(tmp.set(ZF.x+.9+.38,TOP+.6,ZF.z+.25));lLid.at(tmp.set(ZF.x+.9+.4,TOP+1.85,ZF.z+.1));
      lConv.at(tmp.set(ZF.x-1.25,TOP+1.7,ZF.z+.3));lRad.at(tmp.set(ZF.x-1.25-.95,TOP+.6,ZF.z+.3));lCond.at(tmp.set(ZF.x-1.25-.5,TOP+.25,ZF.z+.6));
      // ---- circuit
      const I=s.V/s.R,P=s.V*I,glow=S.clamp(P/60,0,1);
      filM.emissiveIntensity=glow*9;halo.material.opacity=glow*.45;halo.scale.setScalar(.8+glow*.8);lampLight.intensity=glow*6;
      bulb.material.color.set(glow>.05?"#FFF4D6":"#ffffff");
      for(let i=0;i<36;i++){const u=((i/36)+s.cq*.06)%1;const p=path.getPointAt(u);charges.put(i,p.x,p.y+.02,p.z,1)}charges.done();
      if(Math.abs(I-dLast)>.004){dLast=I;dial.redraw((g2,w,h)=>{g2.fillStyle="#F7F3EC";g2.beginPath();g2.roundRect(4,4,w-8,h-8,22);g2.fill();const cx=w/2,cy2=h-26,R=h-52;
        g2.strokeStyle="#C9C2DC";g2.lineWidth=4;g2.beginPath();g2.arc(cx,cy2,R,Math.PI*1.1,Math.PI*1.9);g2.stroke();
        for(let k=0;k<=4;k++){const a=Math.PI*(1.1+.8*k/4);g2.beginPath();g2.moveTo(cx+Math.cos(a)*(R-14),cy2+Math.sin(a)*(R-14));g2.lineTo(cx+Math.cos(a)*R,cy2+Math.sin(a)*R);g2.stroke()}
        const a=Math.PI*(1.1+.8*S.clamp(I/2,0,1));g2.strokeStyle=PAL.deep.blush;g2.lineWidth=6;g2.lineCap="round";g2.beginPath();g2.moveTo(cx,cy2);g2.lineTo(cx+Math.cos(a)*(R-8),cy2+Math.sin(a)*(R-8));g2.stroke();
        g2.fillStyle="#222A55";g2.beginPath();g2.arc(cx,cy2,9,0,7);g2.fill();g2.font="700 26px Instrument Sans, system-ui";g2.textAlign="center";g2.fillText("A",cx,cy2-R*.38)})}
      lV.at(wp(batt)).set(`Battery<b>${fmt(s.V,1)} V</b>`);lR.at(tmp.set(ZC.x,TOP+cy+.9,ZC.z-cd)).set(`Lamp<b>${fmt(s.R)} Ω</b>`);
      lI.at(tmp.set(ZC.x+cw,TOP+cy+.45,ZC.z)).set(`Current<b>${fmt(I,2)} A</b>`);lP.at(tmp.set(ZC.x,TOP+cy+.55,ZC.z-cd)).set(`Power<b>${fmt(P,1)} W</b>`);
    }};
}
StudyKit.mount({kupu:KUPU,scene3d:energy3d,
  eyebrow:"Physics · Energy", title:"The energy machine", crumb:"NCEA Level 1 Physics, Earth and Space Science · energy in physical systems", homeHash:"l1",
  fig:"FIG. 05 · SKY TOWER, JUG, FLASK, CIRCUIT", railTitle:"Where the energy goes",
  badge:{label:"NCEA L1 PESS 92047",exam:"2026-11-12T14:00:00+13:00",examText:"Thu 12 Nov, 2pm"},
  mainBox:"0 0 640 330", mainPhoneBig:true, mainLabel:"Energy scenes: a jumper on the Sky Tower, a jug, a vacuum flask and a circuit", closeBox:"0 0 420 260",
  state:s, steps,
  controls:[{type:"play"},{type:"button",id:"restart",label:"Restart",onClick:(x,api)=>{const st=api.step;st.onStep&&st.onStep()}},
    {type:"range",id:"m",label:"Mass",min:40,max:120,step:5,get:()=>s.m,set:set("m"),fmt:()=>s.m+" kg"},
    {type:"range",id:"h",label:"Height",min:10,max:192,step:1,get:()=>s.h,set:(x,v)=>{s.h=v;resetTower(true)},fmt:()=>s.h+" m"},
    {type:"range",id:"km",label:"Water",min:0.5,max:1.7,step:0.1,get:()=>s.km,set:set("km"),fmt:()=>fmt(s.km,1)+" kg"},
    {type:"range",id:"kP",label:"Jug power",min:1000,max:3000,step:100,get:()=>s.kP,set:set("kP"),fmt:()=>fmt(s.kP)+" W"},
    {type:"range",id:"V",label:"Voltage",min:1.5,max:24,step:0.5,get:()=>s.V,set:set("V"),fmt:()=>fmt(s.V,1)+" V"},
    {type:"range",id:"R",label:"Resistance",min:2,max:100,step:1,get:()=>s.R,set:set("R"),fmt:()=>s.R+" Ω"}],
  tick:(x,dt,st)=>{if(["lift","drop","wire"].includes(st.k))tickTower(dt,st);else if(["heat","boil"].includes(st.k))tickKettle(dt,st);else if(st.k==="flask"){s.tc=Math.min(240,s.tc+dt*5);if(s.tc>=240)s.playing=false}else s.cq+=dt*(s.V/s.R)},
  drawMain:(x,st)=>["lift","drop","wire"].includes(st.k)?drawTower(st):["heat","boil"].includes(st.k)?drawKettle(st):st.k==="flask"?drawFlask(st):drawCircuit(st),
  drawClose,
  chips:()=>{const I=s.V/s.R;return{ep:["Ep",kJ(s.m*g*s.y),true],ek:["Ek",kJ(0.5*s.m*s.v*s.v)],heat:["HEAT",kJ(s.heat)],height:["HEIGHT",fmt(s.y)+" m"],speed:["SPEED",`${fmt(s.v,1)} m/s`],
    temp:["WATER",fmt(s.T,1)+"°C",true],epower:["ENERGY IN",kJ(s.kP*s.kt)],time:["TIME",fmt(s.kt)+" s"],boiled:["BOILED AWAY",fmt(s.boiled*1000)+" g"],
    mug:["MUG",fmt(Tf(kMug,s.tc),1)+"°C"],flask:["FLASK",fmt(Tf(kFlask,s.tc),1)+"°C",true],current:["CURRENT",fmt(I,2)+" A",true],power:["POWER",fmt(s.V*I,1)+" W"]}},
  challenges:[
    {q:"Set the height so a no-losses fall reaches 50 m/s at the bottom.",check:()=>Math.abs(Math.sqrt(2*g*s.h)-50)<0.6,ok:()=>`Yes: h = v² ÷ 2g = 2500 ÷ 19.6 ≈ 128 m. You set ${s.h} m.`,no:()=>`Not yet: from ${s.h} m the speed would be ${fmt(Math.sqrt(2*g*s.h),1)} m/s. Rearrange v = √(2gh) for h.`},
    {q:"Make the lamp use exactly 6 W from a 12 V battery.",check:()=>s.V===12&&s.R===24,ok:"Yes: I = 12 ÷ 24 = 0.5 A, and P = 12 × 0.5 = 6 W.",no:()=>`Not yet: ${fmt(s.V*s.V/s.R,1)} W. Use P = V²/R to find R.`},
    {q:"Set the jug so 1.5 kg of water heats from 15°C to 100°C in under 3 minutes.",check:()=>s.km===1.5&&1.5*C_W*85/s.kP<180,ok:()=>`Yes: ${fmt(1.5*C_W*85/s.kP)} s with a ${fmt(s.kP)} W jug.`,no:()=>s.km!==1.5?"Set the water to 1.5 kg first.":`Not yet: ${fmt(1.5*C_W*85/s.kP)} s. You need more power.`}],
  papers:[{label:"NZQA: Physics, Earth and Space Science",url:"https://www2.nzqa.govt.nz/ncea/subjects/past-exams-and-exemplars/physics-earth-and-space-science/"}],
  truth:"Uses g = 9.8 N/kg, c = 4200 J/kg°C and L = 2.26 × 10⁶ J/kg. SkyJump height (192 m) and top speed (about 85 km/h) are from the operator's published information; the braking profile is simplified. Cooling curves are illustrative.",
  footer:"Covers AS 92047: mechanical, thermal and electrical energy in physical systems, using Ek = ½mv², Ep = mgh, W = Fd, E = Pt, E = mcΔT, E = mL, P = VI and V = IR."
});
})();
