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
StudyKit.mount({kupu:KUPU,
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
