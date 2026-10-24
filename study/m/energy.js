(()=>{
const g=9.8, C_W=4200, L_V=2.26e6, VMAX=85/3.6;
const s={m:70,h:192,y:192,v:0,heat:0,mode:"free",lift:false,
  km:1.0,kP:2200,T:15,boiled:0,kt:0,
  tc:0, V:12,R:24, cq:0};
const fmt=(x,d=0)=>Number(x).toLocaleString("en-NZ",{maximumFractionDigits:d,minimumFractionDigits:d});
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
  let o=`<rect width="640" height="330" fill="var(--chalk)"/>`;
  const gy=300,top=40,Y=y=>gy-(y/192)*(gy-top),tx=210;
  // Sky Tower-ish column
  o+=`<rect x="${tx-10}" y="${top-20}" width="20" height="${gy-top+20}" fill="var(--fill)" stroke="var(--ink)"/>`;
  o+=`<rect x="${tx-34}" y="${Y(192)-10}" width="68" height="22" rx="8" fill="var(--paper)" stroke="var(--ink)"/><line x1="${tx}" x2="${tx}" y1="${top-40}" y2="${top-20}" stroke="var(--ink)" stroke-width="2"/>`;
  o+=`<line x1="0" x2="640" y1="${gy}" y2="${gy}" stroke="var(--ink)" stroke-width="1.4"/>`;
  for(let k=0;k<=192;k+=48)o+=`<line x1="${tx-22}" x2="${tx-14}" y1="${Y(k)}" y2="${Y(k)}" stroke="var(--rose)"/><text class="t-lab" x="${tx-26}" y="${Y(k)+3.5}" text-anchor="end">${k} m</text>`;
  if(st.k==="wire")o+=`<line x1="${tx+70}" x2="${tx+70}" y1="${Y(192)}" y2="${gy}" stroke="var(--rose)" stroke-dasharray="2 3"/>`;
  if(st.k==="lift")o+=`<line x1="${tx+70}" x2="${tx+70}" y1="${Y(192)-12}" y2="${Y(s.y)}" stroke="var(--ink)" stroke-width="1.6"/>`;
  // jumper
  const jy=Y(s.y);o+=`<g transform="translate(${tx+70},${jy-14})"><circle r="6" cy="-10" fill="var(--sun)" stroke="var(--ink)"/><rect x="-5" y="-4" width="10" height="16" rx="4" fill="var(--hot)" stroke="var(--ink)"/></g>`;
  if(s.v>2)o+=`<path d="M${tx+88},${jy-20} v${-Math.min(60,s.v*1.2)}" stroke="var(--rose)" stroke-width="1.4"/>`;
  // energy bars
  const Ep=s.m*g*s.y,Ek=0.5*s.m*s.v*s.v,H=st.k==="wire"?s.heat:0,Tot=s.m*g*s.h,bx=380,bw=50,bh=210,by=280;
  [["Potential",Ep,"var(--earth)"],["Kinetic",Ek,"var(--hot)"],["Heat",H,"var(--sun)"]].forEach(([n,E,c],i)=>{const x=bx+i*80,hh=Tot?E/Tot*bh:0;
    o+=`<rect x="${x}" y="${by-bh}" width="${bw}" height="${bh}" fill="var(--paper)" stroke="var(--line)"/><rect x="${x}" y="${by-hh}" width="${bw}" height="${hh}" fill="${c}"/>
    <text class="t-lab" x="${x+bw/2}" y="${by+16}" text-anchor="middle">${n.toUpperCase()}</text><text class="t-ink" x="${x+bw/2}" y="${by-hh-6}" text-anchor="middle">${kJ(E)}</text>`});
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
  let o=`<rect width="640" height="330" fill="var(--chalk)"/>`;
  const x0=150,y0=90,W=170,H=170,lvl=(s.km-s.boiled)/1.7*H*0.9;
  o+=`<path d="M${x0},${y0} h${W} l14,${H} h${-W-28}z" fill="var(--paper)" stroke="var(--ink)" stroke-width="1.6"/>`;
  o+=`<path d="M${x0-7},${y0+H-lvl} h${W+14} l${7*lvl/H},${lvl} h${-W-14-14*lvl/H}z" fill="var(--sea)" opacity="${0.25+0.35*(s.T-15)/85}"/>`;
  o+=`<path d="M${x0+W},${y0+30} q48,10 40,70 q-6,40 -40,52" fill="none" stroke="var(--ink)" stroke-width="6"/><path d="M${x0},${y0+20} l-40,-30" stroke="var(--ink)" stroke-width="5"/>`;
  o+=`<rect x="${x0-30}" y="${y0+H}" width="${W+60}" height="14" rx="4" fill="var(--ink)"/>`;
  if(s.T>=100)for(let i=0;i<5;i++)o+=`<path d="M${x0-30-i*6},${y0-20-i*10} q-10,-12 0,-24 q10,-12 0,-24" fill="none" stroke="var(--rose)" stroke-width="2" opacity="${.3+.1*i}"/>`;
  o+=`<text class="t-big" x="${x0+W/2}" y="${y0+H/2}" text-anchor="middle">${fmt(s.T,1)}°C</text>`;
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
  let o=`<rect width="640" height="330" fill="var(--chalk)"/>`;
  const t=s.tc;
  // mug
  o+=`<rect x="100" y="150" width="90" height="100" rx="10" fill="var(--paper)" stroke="var(--ink)" stroke-width="1.6"/><path d="M190,170 q30,0 30,30 q0,30 -30,30" fill="none" stroke="var(--ink)" stroke-width="5"/>`;
  o+=`<rect x="104" y="160" width="82" height="86" rx="6" fill="var(--hot)" opacity="${.15+.6*(Tf(kMug,t)-18)/74}"/>`;
  [["CONDUCTION",14,186],["CONVECTION",150,92],["RADIATION",228,196]].forEach(([n,x,y],i)=>{o+=`<text class="t-lab" x="${x}" y="${y}">${n}</text>`});
  o+=`<path d="M145,145 q-10,-20 0,-40 q10,-20 0,-40" fill="none" stroke="var(--rose)" stroke-width="2"/><path d="M222,200 h30" stroke="var(--sun)" stroke-width="2" stroke-dasharray="3 3"/><path d="M100,200 h-30" stroke="var(--sun)" stroke-width="2"/>`;
  o+=`<text class="t-big" x="145" y="280" text-anchor="middle">Open mug ${fmt(Tf(kMug,t),1)}°C</text>`;
  // flask cutaway
  const fx=290;o+=`<rect x="${fx}" y="70" width="110" height="190" rx="22" fill="var(--paper)" stroke="var(--ink)" stroke-width="1.6"/>`;
  o+=`<rect x="${fx+14}" y="84" width="82" height="162" rx="16" fill="none" stroke="var(--rose)" stroke-dasharray="3 3"/><rect x="${fx+22}" y="92" width="66" height="146" rx="12" fill="var(--hot)" opacity="${.15+.6*(Tf(kFlask,t)-18)/74}" stroke="var(--moon)" stroke-width="3"/>`;
  o+=`<rect x="${fx+30}" y="54" width="50" height="22" rx="6" fill="var(--ink)"/>`;
  o+=`<g class="t-lab"><text x="${fx+122}" y="66">LID: STOPS CONVECTION</text><text x="${fx+122}" y="90">VACUUM GAP: NO PARTICLES,</text><text x="${fx+122}" y="104">SO NO CONDUCTION OR CONVECTION</text><text x="${fx+122}" y="130">SHINY WALLS: REFLECT</text><text x="${fx+122}" y="144">RADIATION BACK IN</text></g>`;
  o+=`<text class="t-big" x="${fx+55}" y="280" text-anchor="middle">Vacuum flask ${fmt(Tf(kFlask,t),1)}°C</text>`;
  o+=`<text class="t-lab" x="16" y="22">TWO CUPS OF TEA AT 92°C IN AN 18°C ROOM</text><text class="t-ink" x="624" y="22" text-anchor="end">${fmt(t)} minutes</text>`;
  return o;
}
// ---------- circuit
function drawCircuit(st){
  const I=s.V/s.R,P=s.V*I;let o=`<rect width="640" height="330" fill="var(--chalk)"/>`;
  const L=110,T=70,Rr=500,B=270;
  o+=`<rect x="${L}" y="${T}" width="${Rr-L}" height="${B-T}" fill="none" stroke="var(--ink)" stroke-width="3" rx="6"/>`;
  // battery
  o+=`<rect x="${L-14}" y="140" width="28" height="70" fill="var(--chalk)"/><line x1="${L-16}" x2="${L+16}" y1="160" y2="160" stroke="var(--ink)" stroke-width="3"/><line x1="${L-9}" x2="${L+9}" y1="172" y2="172" stroke="var(--ink)" stroke-width="5"/><line x1="${L-16}" x2="${L+16}" y1="184" y2="184" stroke="var(--ink)" stroke-width="3"/><line x1="${L-9}" x2="${L+9}" y1="196" y2="196" stroke="var(--ink)" stroke-width="5"/>`;
  o+=`<text class="t-ink" x="${L-24}" y="182" text-anchor="end">${fmt(s.V,1)} V</text>`;
  // bulb
  const bx=(L+Rr)/2,glow=Math.min(1,P/60);
  o+=`<circle cx="${bx}" cy="${T}" r="${26+glow*30}" fill="var(--sun)" opacity="${glow*.35}"/><circle cx="${bx}" cy="${T}" r="22" fill="var(--paper)" stroke="var(--ink)" stroke-width="2"/><path d="M${bx-12},${T+6} l6,-14 l6,14 l6,-14 l6,14" fill="none" stroke="${glow>.05?"var(--sun)":"var(--rose)"}" stroke-width="2"/>`;
  o+=`<text class="t-ink" x="${bx}" y="${T+46}" text-anchor="middle">${fmt(s.R)} Ω</text>`;
  // ammeter
  o+=`<circle cx="${Rr}" cy="170" r="18" fill="var(--paper)" stroke="var(--ink)" stroke-width="2"/><text class="t-big" x="${Rr}" y="175" text-anchor="middle">A</text><text class="t-ink" x="${Rr+26}" y="175">${fmt(I,2)} A</text>`;
  // moving charges (conventional current direction + to -)
  const per=2*((Rr-L)+(B-T)),n=24;
  for(let k=0;k<n;k++){let d=((k/n)*per+s.cq*60)%per;let x,y;
    if(d<(Rr-L)){x=L+d;y=T}else if((d-=Rr-L)<(B-T)){x=Rr;y=T+d}else if((d-=B-T)<(Rr-L)){x=Rr-d;y=B}else{d-=Rr-L;x=L;y=B-d}
    o+=`<circle cx="${x}" cy="${y}" r="3.2" fill="var(--hot)"/>`}
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
