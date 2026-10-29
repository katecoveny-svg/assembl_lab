(()=>{
// The phone machine: NCEA Level 2 Physics AS91173 (electricity and electromagnetism) and Level 3 AS91526 (electrical
// systems), built around a phone battery of 3 349 mAh at 3.87 V and a 20 W charger, as the NCEA Everyday-Engineering
// Practice Pack frames it. Figures the pack states are kept; everything else is a labelled estimate.
const esc=StudyKit.esc;
const fmt=(x,d=0)=>{let v=Number(x);if(!isFinite(v))v=0;if(Math.abs(v)<0.5*Math.pow(10,-d))v=0;return v.toLocaleString("en-NZ",{maximumFractionDigits:d,minimumFractionDigits:d})};
const sci=(x,d=2)=>{if(!x)return "0";const e=Math.floor(Math.log10(Math.abs(x)));return `${fmt(x/Math.pow(10,e),d)} × 10${sup(e)}`};
const sup=n=>String(n).replace(/-/g,"⁻").replace(/\d/g,c=>"⁰¹²³⁴⁵⁶⁷⁸⁹"[c]);
const REDUCED=matchMedia("(prefers-reduced-motion: reduce)").matches;
const E_CHARGE=1.602e-19;
// the bench figure look (StudyKit.fig): a phone in a frosted sky case lying on the paper, a white plastic charger brick,
// a rubber cable, the cell as a frosted tube filling with lime; copper for wires and coils, steel for pins and plates
const F=StudyKit.fig,PAL=F.palette,SKY=PAL.case.sky,SKYD=F.deep(SKY),AXIS="#8F9BAA",NAVY="#262E5C",GREY="#6E6A86";
const LIME=PAL.product.lime,STRAW=PAL.product.strawberry,BLUE=PAL.product.blueberry,BUTTER=PAL.product.butter,PEACH=PAL.product.peach,COPPER=PAL.copper;
// a rounded solid with real thickness: front face, a lit top and shaded side running up and to the right, one floor shadow
function slab(x,y,w,h,r,d,c,kind,sh){const m=c==="#FFFFFF"?{hi:"#FFFFFF",shade:"#E3E8F0",stroke:"#C2CAD6"}:F.mat(kind||"plastic",c),dx=d,dy=-0.55*d,id="phs"+String(c).replace("#","")+(kind||"p");
  let g=`<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${m.hi}"/><stop offset=".7" stop-color="${m.shade}"/></linearGradient></defs>`;
  if(sh!==false)g+=F.shadow(x+r*0.4,y+h,w+dx-r*0.4,{len:sh&&sh.len||Math.min(60,Math.max(16,h*0.3)),opacity:sh&&sh.op||0.16});
  const n=Math.max(2,Math.ceil(d/1.4));for(let i=n;i>=1;i--){const k=i/n;g+=`<rect x="${(x+dx*k).toFixed(1)}" y="${(y+dy*k).toFixed(1)}" width="${w}" height="${h}" rx="${r}" fill="url(#${id})"${i===n?` stroke="${m.stroke}" stroke-width="1.1"`:""}/>`}
  return g+`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${c}" stroke="${m.stroke}" stroke-width="1.2"/>`}
// a white data card standing on the paper
const card=(x,y,w,h)=>slab(x,y,w,h,14,8,"#FFFFFF","plastic",{len:22,op:0.1});
// a frosted cell lying on its side, filled from the left with a product colour
function cellH(x,y,w,h,frac,fill){const rx=h*0.22,f=Math.max(0,Math.min(1,frac)),fw=(w-4)*f,m=F.mat("painted",fill),ry=h/2;
  let g=`<path d="M${x},${y} h${w} a${rx},${ry} 0 0 1 0,${h} h${-w} a${rx},${ry} 0 0 1 0,${-h}z" fill="${SKY}" fill-opacity=".35" stroke="${SKYD}" stroke-width="1.4"/>`;
  g+=F.box(x+w+rx-1,y+h*0.32,7,h*0.36,{colour:PAL.steel,kind:"metal",d:3,shadow:false});
  if(fw>0.5)g+=`<path d="M${x+2},${y+3} h${fw} a${rx-1},${ry-3} 0 0 1 0,${h-6} h${-fw} a${rx-1},${ry-3} 0 0 1 0,${-(h-6)}z" fill="${fill}" stroke="${m.stroke}" stroke-width="1"/><ellipse cx="${x+2+fw}" cy="${y+ry}" rx="${rx-1}" ry="${ry-3}" fill="${m.hi}" stroke="${m.stroke}" stroke-width="1"/><path d="M${x+4},${y+9} h${Math.max(0,fw-6)}" stroke="#fff" stroke-opacity=".55" stroke-width="3" stroke-linecap="round"/>`;
  g+=`<ellipse cx="${x+w}" cy="${y+ry}" rx="${rx}" ry="${ry}" fill="${SKY}" fill-opacity=".45" stroke="${SKYD}" stroke-width="1.2"/><path d="M${x+6},${y+5} h${w*0.55}" stroke="#fff" stroke-opacity=".85" stroke-width="2.2" stroke-linecap="round"/>`;
  return g}
// copper wire on the board (a lit hairline along it)
const wire=d=>`<path d="${d}" fill="none" stroke="${F.mat("metal",COPPER).stroke}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${COPPER}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="1" stroke-linejoin="round"/>`;
// an ammeter: a round white meter seen from above
const meter=(x,y)=>`<ellipse cx="${x+3}" cy="${y+5}" rx="17" ry="15" fill="${PAL.shadow}" opacity=".14"/><circle cx="${x}" cy="${y}" r="16" fill="#fff" stroke="#AEB6C4" stroke-width="1.6"/><path d="M${x-10},${y-7} a12,12 0 0 1 12,-5" fill="none" stroke="#fff" stroke-width="2"/><circle cx="${x}" cy="${y}" r="12.5" fill="none" stroke="#E3E8F0"/>`;
// a standing cell (the battery) on the wire
const cellV=(x,y1,y2)=>F.cyl(x,y1,13,y2-y1,{colour:LIME,kind:"painted",shadow:false})+F.cyl(x,y1-6,5,6,{colour:PAL.steel,kind:"metal",shadow:false});
const s={mAh:3349,V:3.87,hours:5,Pchg:20,eff:0.85,r:0.08,Iload:3,Iscreen:1.2,Imodem:0.5,C:1000,R:100,N:10,f:140,gap:2,
  soc:0.2,tchg:0,t:0,parts:[],socCC:0.2,vcap:0,tcap:0,playing:false};
// ---- physics
const Q=()=>s.mAh/1000*3600;                       // coulombs
const E=()=>s.V*Q();                                // joules
const Pavg=()=>E()/(s.hours*3600);
const t50=()=>0.5*E()/(s.Pchg*s.eff);               // seconds to half charge
const Ibatt=()=>s.Pchg*s.eff/s.V;                   // battery-side charging current
const emf=soc=>3.5+0.7*soc;                         // a simple cell model: 3.5 V flat … 4.2 V full (estimate)
const VCHG=4.2;
const Icc=soc=>Math.max(0,Math.min(Ibatt(),(VCHG-emf(soc))/s.r));
const Vterm=()=>s.V-s.Iload*s.r, Plost=()=>s.Iload*s.Iload*s.r, Pdel=()=>Vterm()*s.Iload;
const Itot=()=>s.Iscreen+s.Imodem, Ppar=()=>s.V*Itot(), hoursFlat=()=>s.mAh/1000/Itot();
const tau=()=>s.R*s.C*1e-6, Ecap=()=>0.5*s.C*1e-6*s.V*s.V, Qcap=()=>s.C*1e-6*s.V;
// wireless (indicative model, estimate): induced emf ∝ N f, falling with gap; efficiency falls with gap
const emfW=()=>0.0023*s.N*s.f*Math.exp(-s.gap/6), effW=()=>Math.max(0.3,0.78*Math.exp(-s.gap/9)), tW50=()=>0.5*E()/(Math.min(15,s.Pchg)*effW());
// ---- animation state
function tickCharge(dt){const k=250;s.t+=dt;
  if(s.soc<1){const I=Icc(s.soc);s.soc=Math.min(1,s.soc+I*dt*k/(s.mAh/1000*3600));s.tchg+=dt*k}
  const n=Math.round(2+Icc(s.soc)*3);s.parts=s.parts.filter(p=>(p.u+=dt*(0.25+Icc(s.soc)*0.08))<1);while(s.parts.length<n)s.parts.push({u:Math.random()*0.2,lane:Math.random()})}
function tickCap(dt){s.tcap+=dt*tau()*0.9;s.vcap=s.V*(1-Math.exp(-s.tcap/tau()))}
// ---- drawing
// ---- drawing
const LINE="#DCD6EA";
function phoneBody(x,y,w,h,soc,label){// the phone lying on the paper: a frosted sky case with real thickness, the screen inset, the cell showing through
  let o=slab(x,y,w,h,28,18,SKY,"plastic",{len:120,op:0.18});
  o+=`<rect x="${x+w-2}" y="${y+70}" width="5" height="34" rx="2" fill="${F.mat("plastic",SKY).shade}" stroke="${SKYD}" stroke-width=".8"/>`;
  o+=`<rect x="${x+10}" y="${y+12}" width="${w-20}" height="${h-24}" rx="20" fill="#F6FAFD" stroke="${SKYD}" stroke-width="1.2"/><path d="M${x+16},${y+44} Q${x+16},${y+18} ${x+42},${y+18}" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/><path d="M${x+24},${y+h-20} h${w-48}" stroke="${SKYD}" stroke-opacity=".25" stroke-width="1"/>`;
  o+=`<rect x="${x+w/2-24}" y="${y+18}" width="48" height="8" rx="4" fill="#3B4466"/><circle cx="${x+w/2+16}" cy="${y+22}" r="2" fill="${BLUE}"/>`;
  const bw=w-70,bx=x+35,by=y+h/2-26;
  o+=cellH(bx,by,bw,52,soc,soc>0.2?LIME:STRAW);
  o+=`<text x="${x+w/2}" y="${by+90}" text-anchor="middle" style="font:600 22px var(--display);fill:${NAVY}">${Math.round(soc*100)}%</text><text x="${x+w/2}" y="${by+112}" text-anchor="middle" style="font:500 12px var(--mono);fill:${GREY}">${esc(label||"")}</text>`;
  return o}
function cable(x0,y0,x1,y1,parts,on){const d=`M${x0},${y0} C${x0+80},${y0} ${x1-80},${y1} ${x1},${y1}`;
  // a rubber tube with its own faint floor shadow, a steel plug at the phone
  let o=`<path d="${d}" transform="translate(9,11)" fill="none" stroke="${PAL.shadow}" stroke-opacity=".1" stroke-width="8" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#8F9BAA" stroke-width="8.5" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#E9EDF4" stroke-width="5.5" stroke-linecap="round"/><path d="${d}" transform="translate(-.6,-1.4)" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round" opacity=".9"/>`;
  o+=F.box(x1-14,y1-6,14,12,{colour:PAL.steel,kind:"metal",d:4,r:2,shadow:false})+F.box(x0,y0-6,10,12,{colour:"#C9D0DB",kind:"rubber",d:4,r:2,shadow:false});
  if(on)parts.forEach(p=>{const t=p.u,mt=1-t;const X=mt*mt*mt*x0+3*mt*mt*t*(x0+80)+3*mt*t*t*(x1-80)+t*t*t*x1,Y=mt*mt*mt*y0+3*mt*mt*t*y0+3*mt*t*t*y1+t*t*t*y1;o+=`<circle cx="${X.toFixed(1)}" cy="${(Y+(p.lane-0.5)*4).toFixed(1)}" r="3.6" fill="${BUTTER}" stroke="${NAVY}" stroke-width=".8"/>`});
  return o}
function drawMain(st){const W=800,H=420;let o=F.floor(W,H);
  if(st.k==="internal")return o+drawInternal();if(st.k==="circuit")return o+drawParallel();if(st.k==="wireless")return o+drawWireless();if(st.k==="capacitor")return o+drawCap();
  const charging=["fast","ccv"].includes(st.k)||(st.k==="test");
  // the charger: a white plastic brick with steel pins
  o+=F.box(38,320,22,7,{colour:PAL.steel,kind:"metal",d:5,shadow:false})+F.box(38,340,22,7,{colour:PAL.steel,kind:"metal",d:5,shadow:false});
  o+=F.box(60,300,120,70,{colour:"#FFFFFF",kind:"plastic",d:16,r:8,shadowLen:56})+`<path d="M70,306 H130" stroke="#E3E8F0" stroke-width="2" stroke-linecap="round"/><text x="120" y="328" text-anchor="middle" class="t-lab">USB-C</text><text x="120" y="350" text-anchor="middle" class="t-big">${fmt(s.Pchg)} W</text>`;
  o+=cable(180,335,330,250,s.parts,charging&&s.playing);
  const soc=charging?s.soc:(st.k==="energy"?Math.max(0.02,1-Math.min(1,s.t/ (s.hours*0.6))):1);
  o+=phoneBody(330,40,200,340,soc,charging?(s.soc>=1?"full":chargePhase()):(st.k==="charge"?`${fmt(s.mAh)} mAh · ${fmt(s.V,2)} V`:`${fmt(Pavg(),1)} W average`));
  // readout card
  o+=card(560,50,220,st.k==="charge"?200:220)+`<g transform="translate(560,50)">`;
  if(st.k==="charge")o+=`<text x="16" y="30" class="t-lab">CHARGE STORED, Q = It</text><text x="16" y="58" class="t-ink">${fmt(s.mAh)} mAh = ${fmt(s.mAh/1000,3)} A h</text><text x="16" y="80" class="t-ink">× 3600 s</text><text x="16" y="112" class="t-big">Q = ${fmt(Q())} C</text><text x="16" y="136" class="t-ink">≈ ${sci(Q())} C</text><text x="16" y="168" class="t-ink">${sci(Q()/E_CHARGE,1)} electrons</text>`;
  else if(st.k==="energy")o+=`<text x="16" y="30" class="t-lab">ENERGY, E = VQ</text><text x="16" y="58" class="t-ink">${fmt(s.V,2)} V × ${fmt(Q())} C</text><text x="16" y="90" class="t-big">E = ${sci(E())} J</text><text x="16" y="120" class="t-lab">POWER, P = E ÷ t</text><text x="16" y="146" class="t-ink">${fmt(E()/1000,1)} kJ ÷ (${fmt(s.hours,1)} × 3600 s)</text><text x="16" y="176" class="t-big">P = ${fmt(Pavg(),2)} W</text><text x="16" y="200" class="t-ink">I = P ÷ V = ${fmt(Pavg()/s.V,2)} A</text>`;
  else if(st.k==="fast")o+=`<text x="16" y="30" class="t-lab">HALF A BATTERY, t = E ÷ P</text><text x="16" y="58" class="t-ink">½E = ${fmt(0.5*E()/1000,1)} kJ</text><text x="16" y="80" class="t-ink">P into the cell = ${fmt(s.Pchg)} W × ${Math.round(s.eff*100)}%</text><text x="16" y="112" class="t-big">t = ${fmt(t50()/60,1)} min</text><text x="16" y="140" class="t-ink">"50% in 30 min": ${t50()<=1800?"plausible":"not at this power"}</text><text x="16" y="176" class="t-ink">I into the cell ≈ ${fmt(Ibatt(),1)} A</text><text x="16" y="198" class="t-ink">(P ÷ V at ${fmt(s.V,2)} V)</text>`;
  else o+=`<text x="16" y="30" class="t-lab">CHARGING NOW</text><text x="16" y="58" class="t-ink">cell emf ε = ${fmt(emf(s.soc),2)} V</text><text x="16" y="80" class="t-ink">charger holds ${fmt(VCHG,1)} V</text><text x="16" y="102" class="t-ink">driving pd = ${fmt(VCHG-emf(s.soc),2)} V</text><text x="16" y="134" class="t-big">I = ${fmt(Icc(s.soc),2)} A</text><text x="16" y="160" class="t-ink">${Icc(s.soc)>=Ibatt()-1e-9?"limited by the charger (CC)":"= pd ÷ r, falling (CV)"}</text><text x="16" y="192" class="t-ink">${fmt(s.tchg/60)} min · ${Math.round(s.soc*100)}%</text>`;
  o+=`</g>`;return o}
function drawInternal(){const I=s.Iload;let o=`<text x="30" y="36" class="t-lab">THE CELL HAS INTERNAL RESISTANCE r. TERMINAL VOLTAGE V = ε − Ir</text>`;
  // copper wires on a frosted sky board: the cell, its internal resistance r, the load and an ammeter
  o+=F.acrylic(96,140,560,182,{tint:SKY,d:12,r:16});
  o+=wire("M340,200 H540 V300 H120 V200 H195")+wire("M221,200 H270");
  o+=cellV(208,178,222);
  o+=F.box(270,186,70,28,{colour:"#FFFFFF",kind:"plastic",d:8,r:4,shadow:false})+`<text x="305" y="205" text-anchor="middle" class="t-ink">r = ${fmt(s.r,2)} Ω</text>`;
  o+=F.box(523,213,34,80,{colour:BUTTER,kind:"painted",d:8,r:5,shadow:false})+`<path d="M529,220 v66" stroke="#fff" stroke-opacity=".55" stroke-width="2.4" stroke-linecap="round"/><text x="590" y="258" class="t-ink">load ${fmt(I,1)} A</text>`;
  o+=meter(330,300)+`<text x="330" y="305" text-anchor="middle" class="t-ink">A</text>`;
  o+=`<text x="208" y="160" text-anchor="middle" class="t-ink">ε = ${fmt(s.V,2)} V</text>`;
  o+=card(90,330,620,70)+`<g transform="translate(90,330)"><text x="16" y="28" class="t-ink">Lost volts Ir = ${fmt(I,1)} × ${fmt(s.r,2)} = ${fmt(I*s.r,2)} V → terminal V = ${fmt(s.V,2)} − ${fmt(I*s.r,2)} = ${fmt(Vterm(),2)} V</text><text x="16" y="54" class="t-ink">Heat in the cell P = I²r = ${fmt(Plost(),2)} W · delivered P = VI = ${fmt(Pdel(),1)} W · efficiency ${fmt(Pdel()/(s.V*I)*100,1)}%</text></g>`;
  // a thermometer for the phone: a frosted tube filling with strawberry
  const T=22+Plost()*6;o+=F.tube(690,80,18,150,Math.min(140,(T-20)*7)/150,{tint:SKY,fill:STRAW,shadowLen:22})+`<text x="699" y="260" text-anchor="middle" class="t-lab">${fmt(T)}°C</text><text x="699" y="66" text-anchor="middle" class="t-lab">PHONE (EST.)</text>`;
  return o}
function drawParallel(){let o=`<text x="30" y="36" class="t-lab">TWO LOADS IN PARALLEL ACROSS THE BATTERY: SAME V, CURRENTS ADD</text>`;
  o+=F.acrylic(84,106,690,210,{tint:SKY,d:12,r:16});
  o+=wire("M120,164 V120 H620 V300 H120 V210")+wire("M400,120 V300");
  o+=cellV(120,166,210);
  o+=F.box(380,180,40,60,{colour:BUTTER,kind:"painted",d:8,r:5,shadow:false})+`<text x="440" y="200" class="t-ink">screen</text><text x="440" y="222" class="t-ink">${fmt(s.Iscreen,2)} A · ${fmt(s.V/s.Iscreen,2)} Ω</text>`;
  o+=F.box(600,180,40,60,{colour:BLUE,kind:"painted",d:8,r:5,shadow:false})+`<text x="660" y="200" class="t-ink">modem</text><text x="660" y="222" class="t-ink">${fmt(s.Imodem,2)} A · ${fmt(s.V/s.Imodem,2)} Ω</text>`;
  o+=meter(260,120)+`<text x="260" y="125" text-anchor="middle" class="t-ink">A</text><text x="260" y="98" text-anchor="middle" class="t-ink">${fmt(Itot(),2)} A</text>`;
  o+=`<text x="60" y="190" text-anchor="end" class="t-ink">${fmt(s.V,2)} V</text>`;
  o+=card(90,330,620,70)+`<g transform="translate(90,330)"><text x="16" y="28" class="t-ink">I total = ${fmt(s.Iscreen,2)} + ${fmt(s.Imodem,2)} = ${fmt(Itot(),2)} A · P = VI = ${fmt(s.V,2)} × ${fmt(Itot(),2)} = ${fmt(Ppar(),2)} W</text><text x="16" y="54" class="t-ink">Combined R = V ÷ I = ${fmt(s.V/Itot(),2)} Ω (1/R = 1/R₁ + 1/R₂) · flat in ${fmt(s.mAh/1000,3)} A h ÷ ${fmt(Itot(),2)} A = ${fmt(hoursFlat(),1)} h</text></g>`;
  return o}
function drawWireless(){let o=`<text x="30" y="36" class="t-lab">A QI PAD: AN ALTERNATING CURRENT IN THE PAD COIL MAKES A CHANGING FIELD; THE PHONE COIL FEELS AN INDUCED EMF</text>`;
  const gapPx=12+s.gap*8,py=250-gapPx-110,CD=F.mat("metal",COPPER).stroke;
  // the pad: a white plastic puck with its copper coil; the phone hovers above it in its frosted sky case
  o+=slab(150,250,300,24,8,26,"#FFFFFF","plastic",{len:44,op:0.16});
  for(let i=0;i<6;i++)o+=`<ellipse cx="300" cy="262" rx="${40+i*18}" ry="${5+i*2}" fill="none" stroke="${CD}" stroke-width="3"/><ellipse cx="300" cy="262" rx="${40+i*18}" ry="${5+i*2}" fill="none" stroke="${COPPER}" stroke-width="1.6"/>`;
  o+=F.shadow(184,250,252,{len:Math.max(6,gapPx*0.5),h:2,opacity:0.08});
  o+=slab(170,py,260,110,20,12,SKY,"plastic",false)+`<rect x="180" y="${py+10}" width="240" height="90" rx="14" fill="#F6FAFD" fill-opacity=".7" stroke="${SKYD}" stroke-width="1"/><path d="M190,${py+16} h90" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>`;
  for(let i=0;i<Math.min(8,Math.round(s.N/2.5));i++)o+=`<ellipse cx="300" cy="${250-gapPx-18}" rx="${30+i*12}" ry="${4+i*1.4}" fill="none" stroke="${CD}" stroke-width="2.6"/><ellipse cx="300" cy="${250-gapPx-18}" rx="${30+i*12}" ry="${4+i*1.4}" fill="none" stroke="${F.mat("metal",COPPER).hi}" stroke-width="1.2"/>`;
  const ph=s.playing?s.t*s.f/20:0;for(let i=0;i<5;i++){const y=262-((i*22+ph*10)%110);o+=`<path d="M${240-i*8},${y} Q300,${y-14} ${360+i*8},${y}" fill="none" stroke="#D9A932" stroke-width="2.2" opacity="${0.9-i*0.15}"/>`}
  o+=`<text x="300" y="300" text-anchor="middle" class="t-ink">pad coil · ${fmt(s.f)} kHz</text><text x="470" y="${250-gapPx-50}" class="t-ink">phone coil · N = ${s.N}</text><text x="470" y="${250-gapPx/2+4}" class="t-ink">gap ${fmt(s.gap)} mm</text>`;
  o+=card(90,330,620,70)+`<g transform="translate(90,330)"><text x="16" y="28" class="t-ink">Faraday: ε = −N ΔΦ ÷ Δt. Model emf ≈ ${fmt(emfW(),1)} V (more turns, higher frequency, smaller gap → bigger)</text><text x="16" y="54" class="t-ink">Efficiency ≈ ${Math.round(effW()*100)}% (estimate) · 50% charge at ${fmt(Math.min(15,s.Pchg))} W pad: ${fmt(tW50()/60)} min</text></g>`;
  return o}
function drawCap(){let o=`<text x="30" y="36" class="t-lab">A CAPACITOR ON THE PHONE'S POWER RAIL CHARGES THROUGH R: V = V₀(1 − e^(−t/RC))</text>`;
  o+=F.acrylic(84,106,690,210,{tint:SKY,d:12,r:16});
  o+=wire("M120,164 V120 H330")+wire("M400,120 H620 V190")+wire("M620,230 V300 H120 V210");
  o+=cellV(120,166,210);
  o+=F.box(330,106,70,28,{colour:"#FFFFFF",kind:"plastic",d:8,r:4,shadow:false})+`<text x="365" y="125" text-anchor="middle" class="t-ink">${fmt(s.R)} Ω</text>`;
  // the capacitor: two steel plates, the charge between them shown in butter
  const frac=s.V?s.vcap/s.V:0;
  o+=F.box(602,185,36,6,{colour:PAL.steel,kind:"metal",d:6,shadow:false});
  o+=`<rect x="606" y="${230-36*frac}" width="28" height="${36*frac}" fill="${BUTTER}" opacity=".8"/>`;
  o+=F.box(602,229,36,6,{colour:PAL.steel,kind:"metal",d:6,shadow:false})+`<text x="660" y="214" class="t-ink">${fmt(s.C)} μF</text>`;
  o+=`<text x="60" y="190" text-anchor="end" class="t-ink">${fmt(s.V,2)} V</text>`;
  o+=card(90,330,620,70)+`<g transform="translate(90,330)"><text x="16" y="28" class="t-ink">τ = RC = ${fmt(s.R)} × ${sci(s.C*1e-6,2)} = ${fmt(tau()*1000,1)} ms · at t = τ the capacitor is at 63% · Q = CV = ${sci(Qcap(),2)} C</text><text x="16" y="54" class="t-ink">Energy stored E = ½CV² = ½ × ${sci(s.C*1e-6,2)} × ${fmt(s.V,2)}² = ${sci(Ecap(),2)} J · now ${fmt(s.vcap,2)} V at t = ${fmt(s.tcap*1000)} ms</text></g>`;
  return o}
function drawClose(st){const w=420,h=260;let o=F.floor(w,h);
  if(st.k==="ccv"||st.k==="fast"){// current and voltage against charge
    o+=`<text class="t-lab" x="14" y="22">CHARGING CURVE · CURRENT AND CELL VOLTAGE AGAINST CHARGE</text>`;
    const X=f=>46+f*340,Yi=i=>220-i/Math.max(1,Ibatt())*150,Yv=v=>220-(v-3.4)/0.9*150;
    o+=`<line x1="46" x2="386" y1="220" y2="220" stroke="${AXIS}"/><line x1="46" x2="46" y1="60" y2="220" stroke="${AXIS}"/>`;
    let di="",dv="";for(let i=0;i<=100;i++){const f=i/100;di+=(i?"L":"M")+X(f).toFixed(1)+","+Yi(Icc(f)).toFixed(1);dv+=(i?"L":"M")+X(f).toFixed(1)+","+Yv(emf(f)).toFixed(1)}
    o+=`<path d="${di}" fill="none" stroke="${STRAW}" stroke-width="2.4"/><path d="${dv}" fill="none" stroke="${BLUE}" stroke-width="2.4" stroke-dasharray="5 4"/>`;
    o+=`<circle cx="${X(s.soc)}" cy="${Yi(Icc(s.soc))}" r="6" fill="${BUTTER}" stroke="${NAVY}"/>`;
    o+=`<text class="t-lab" x="14" y="${Yi(Ibatt())+4}" fill="${STRAW}">I</text><text class="t-lab" x="14" y="${Yv(4.2)+4}">V</text><text class="t-lab" x="386" y="238" text-anchor="end">CHARGE (0 → 100%)</text>`;
    o+=`<text class="t-ink" x="54" y="46">current (solid) · cell emf (dashed) · r = ${fmt(s.r,2)} Ω</text>`;return o}
  if(st.k==="capacitor"){o+=`<text class="t-lab" x="14" y="22">CAPACITOR VOLTAGE AGAINST TIME</text>`;const T=tau()*5,X=t=>46+t/T*340,Y=v=>220-v/s.V*150;
    o+=`<line x1="46" x2="386" y1="220" y2="220" stroke="${AXIS}"/><line x1="46" x2="46" y1="60" y2="220" stroke="${AXIS}"/>`;let d="";for(let i=0;i<=100;i++){const t=i/100*T;d+=(i?"L":"M")+X(t).toFixed(1)+","+Y(s.V*(1-Math.exp(-t/tau()))).toFixed(1)}
    o+=`<path d="${d}" fill="none" stroke="${STRAW}" stroke-width="2.4"/><line x1="${X(tau())}" x2="${X(tau())}" y1="60" y2="220" stroke="${BLUE}" stroke-dasharray="4 4"/><text class="t-lab" x="${X(tau())+4}" y="74">τ = ${fmt(tau()*1000,1)} ms · 63%</text>`;
    o+=`<circle cx="${X(Math.min(T,s.tcap))}" cy="${Y(s.vcap)}" r="6" fill="${BUTTER}" stroke="${NAVY}"/><text class="t-lab" x="386" y="238" text-anchor="end">TIME · 5τ SHOWN</text>`;return o}
  if(st.k==="internal"){o+=`<text class="t-lab" x="14" y="22">TERMINAL VOLTAGE AGAINST CURRENT · V = ε − Ir</text>`;const X=i=>46+i/5*340,Y=v=>220-(v-2.5)/1.7*150;
    o+=`<line x1="46" x2="386" y1="220" y2="220" stroke="${AXIS}"/><line x1="46" x2="46" y1="60" y2="220" stroke="${AXIS}"/><line x1="${X(0)}" y1="${Y(s.V)}" x2="${X(5)}" y2="${Y(s.V-5*s.r)}" stroke="${STRAW}" stroke-width="2.4"/>`;
    o+=`<circle cx="${X(s.Iload)}" cy="${Y(Vterm())}" r="6" fill="${BUTTER}" stroke="${NAVY}"/><text class="t-lab" x="52" y="${Y(s.V)-8}">INTERCEPT = ε = ${fmt(s.V,2)} V</text><text class="t-lab" x="386" y="238" text-anchor="end">CURRENT (0–5 A)</text><text class="t-ink" x="200" y="160">gradient = −r = −${fmt(s.r,2)} Ω</text>`;return o}
  if(st.k==="wireless"){o+=`<text class="t-lab" x="14" y="22">INDUCED EMF AGAINST GAP (THIS MODEL)</text>`;const X=g=>46+g/8*340,Y=e=>220-e/8*150;let d="";for(let i=0;i<=80;i++){const g=i/10;d+=(i?"L":"M")+X(g).toFixed(1)+","+Y(0.0023*s.N*s.f*Math.exp(-g/6)).toFixed(1)}
    o+=`<line x1="46" x2="386" y1="220" y2="220" stroke="${AXIS}"/><line x1="46" x2="46" y1="60" y2="220" stroke="${AXIS}"/><path d="${d}" fill="none" stroke="${STRAW}" stroke-width="2.4"/><circle cx="${X(s.gap)}" cy="${Y(emfW())}" r="6" fill="${BUTTER}" stroke="${NAVY}"/><text class="t-lab" x="386" y="238" text-anchor="end">GAP (0–8 mm)</text>`;return o}
  // charge / energy / circuit: an energy ladder
  o+=`<text class="t-lab" x="14" y="22">${st.k==="circuit"?"HOURS TO FLAT AGAINST TOTAL CURRENT":"THE NUMBERS, IN ORDER"}</text>`;
  if(st.k==="circuit"){const X=i=>46+i/4*340,Y=h=>220-Math.min(1,h/10)*150;let d="";for(let i=1;i<=80;i++){const I=i/20;d+=(i>1?"L":"M")+X(I).toFixed(1)+","+Y(s.mAh/1000/I).toFixed(1)}
    o+=`<line x1="46" x2="386" y1="220" y2="220" stroke="${AXIS}"/><line x1="46" x2="46" y1="60" y2="220" stroke="${AXIS}"/><path d="${d}" fill="none" stroke="${STRAW}" stroke-width="2.4"/><circle cx="${X(Itot())}" cy="${Y(hoursFlat())}" r="6" fill="${BUTTER}" stroke="${NAVY}"/><text class="t-lab" x="386" y="238" text-anchor="end">CURRENT (0–4 A) · 10 h AT THE TOP</text>`;return o}
  const rows=[["Capacity",`${fmt(s.mAh)} mAh = ${fmt(s.mAh/1000,3)} A h`],["Charge Q = It",`${fmt(Q())} C`],["Voltage",`${fmt(s.V,2)} V`],["Energy E = VQ",`${fmt(E()/1000,1)} kJ (${sci(E())} J)`],["Screen-on time",`${fmt(s.hours,1)} h = ${fmt(s.hours*3600)} s`],["Average power P = E/t",`${fmt(Pavg(),2)} W`],["Average current I = P/V",`${fmt(Pavg()/s.V,2)} A`]];
  rows.forEach((r,i)=>{o+=`<text class="t-lab" x="14" y="${54+i*28}">${esc(r[0]).toUpperCase()}</text><text class="t-ink" x="400" y="${54+i*28}" text-anchor="end">${esc(r[1])}</text><line x1="14" x2="400" y1="${62+i*28}" y2="${62+i*28}" stroke="${LINE}"/>`});
  return o}
// ---- steps
const steps=[
 {k:"charge",lab:"Charge stored",cap:"A modern phone battery is about 3 349 mAh at 3.87 V. Milliamp-hours are a charge: current × time. Turn it into coulombs.",speed:0,controls:["mAh"],
  big:"<b>The big idea:</b> charge is current × time, Q = It. A battery's mAh rating is a charge in disguise: 1 mAh = 3.6 C.",
  exam:"Q = It = 3.349 A h × 3600 s = 12 056 C ≈ 1.21 × 10⁴ C. (3 349 mAh is 3.349 A for one hour, and one hour is 3600 s.)",
  trap:"Leaving mAh as mA (÷1000 to get amps) or hours as hours (×3600 to get seconds). Q must be in coulombs before it meets V.",chips:["mAh","Q","electrons"]},
 {k:"energy",lab:"Energy and power",cap:"Energy stored is voltage × charge. If a full battery lasts exactly 5.0 hours of screen-on time, what is the average power draw?",speed:1,speedLabel:"sped up",controls:["play","mAh","hours"],
  big:"<b>The big idea:</b> E = VQ (or E = VIt) and P = E ÷ t. A phone's whole day runs on a few watts.",
  exam:"E = VQ = 3.87 × 12 056 ≈ 4.67 × 10⁴ J. P = E ÷ t = 46 700 ÷ (5.0 × 3600) ≈ 2.6 W average. The average current is I = P ÷ V = 2.6 ÷ 3.87 ≈ 0.67 A.",
  trap:"Multiplying mAh by V and calling it joules. 3 349 mAh × 3.87 V = 12.96 Wh, which is 12.96 × 3600 = 46 700 J.",chips:["E","P","Iavg"],onStep:()=>{s.t=0}},
 {k:"fast",lab:"\"50% in 30 min\"",cap:"A 20 W USB-C charger claims 50% in 30 minutes. Half the battery's energy ÷ the power actually reaching the cell = the time. Try other chargers and efficiencies.",speed:1,speedLabel:"sped up",controls:["play","restart","Pchg","eff"],
  big:"<b>The big idea:</b> t = E ÷ P, but only the power that reaches the cell counts. State your efficiency assumption; examiners reward it.",
  exam:"Half of E is 23.3 kJ. At 20 W, t = E ÷ P = 23 300 ÷ 20 = 1167 s ≈ 19.4 min, so the claim is plausible only at ~100 % efficiency; at a realistic 85 % it takes about 23 min, still inside the \"about 30 minutes\" margin.",
  trap:"Using the charger's rated power as if all of it reached the battery. Heat in the cable, the converter and the cell takes 10–30 %.",chips:["half","t50","Ichg","claim"],onStep:()=>{s.soc=0;s.tchg=0;s.parts=[]}},
 {k:"ccv",lab:"Why charging slows",cap:"Watch the current. In this model it is limited by the charger or by the voltage difference across the internal resistance, whichever allows less current. As the cell emf rises, the driving pd shrinks and current tapers. The transition depends on charger power, efficiency and internal resistance.",speed:1,speedLabel:"sped up",controls:["play","restart","Pchg","r"],
  big:"<b>The big idea:</b> current is driven by a potential difference across a resistance. As the cell's emf rises toward the charger's voltage, the difference falls, so the current falls: the flat tail of every charging curve.",
  exam:"The model takes the smaller of the charger current limit and (V_charger − ε) ÷ r. As the cell emf rises toward the charger voltage, the driving potential difference falls and the current tapers. There is no fixed percentage for the transition: changing charger power, efficiency or internal resistance changes where it occurs.",
  trap:"Assuming tapering starts at one fixed percentage for every setting, or mixing up cell emf and charger voltage. At the default settings, the model current starts falling between 49% and 50% charge. Follow the current curve as you change the settings.",chips:["soc","emf","pd","Inow"],onStep:()=>{s.soc=0;s.tchg=0;s.parts=[]}},
 {k:"internal",lab:"Internal resistance",cap:"Level 3. A cell has internal resistance r. When a game pulls 3 A, some volts are lost inside the cell (Ir) and I²r of heat warms the phone. Change the load and r.",speed:0,controls:["Iload","r"],
  big:"<b>The big idea:</b> ε = V + Ir. The terminal voltage drops under load; the lost volts become heat inside the cell. A graph of V against I has intercept ε and gradient −r.",
  exam:"ε = V + Ir, so the terminal voltage is V = ε − Ir = 3.87 − 3.0 × 0.08 = 3.63 V. The power lost inside the cell is I²r = 3.0² × 0.08 = 0.72 W, which heats the phone; the power delivered is VI = 3.63 × 3.0 = 10.9 W.",
  trap:"Using ε as the voltage across the load. Under load the terminal voltage is lower by Ir; at no load (I = 0) the terminal voltage equals ε.",chips:["Vterm","lost","Plost","Pdel"]},
 {k:"circuit",lab:"Loads in parallel",cap:"The screen and the modem sit in parallel across the battery: each gets the full 3.87 V and the currents add. Set each load's current and see the total, the power and the time to flat.",speed:0,controls:["Iscreen","Imodem","mAh"],
  big:"<b>The big idea:</b> in parallel, every branch has the same voltage and the total current is the sum. The combined resistance is smaller than any branch: 1/R = 1/R₁ + 1/R₂.",
  exam:"In parallel each load has the full 3.87 V across it, so the currents add: I = 1.2 + 0.5 = 1.7 A. P = VI = 3.87 × 1.7 = 6.6 W. The battery lasts about 3.349 A h ÷ 1.7 A ≈ 2.0 h. The combined resistance is V ÷ I = 2.3 Ω, less than either branch (3.2 Ω and 7.7 Ω).",
  trap:"Adding resistances in parallel as if they were in series. Add the currents (or the reciprocals of the resistances), not the resistances.",chips:["Itot","Ppar","Rtot","flat"]},
 {k:"wireless",lab:"Wireless charging",cap:"A Qi pad is a transformer with an air gap. Alternating current in the pad's coil makes a changing magnetic field; the phone's coil sits in it and an emf is induced. Turns, frequency and the gap all matter.",speed:1,speedLabel:"field slowed",controls:["play","N","f","gap"],
  big:"<b>The big idea:</b> Faraday's law. An emf is induced only while the flux through the coil is changing: ε = −N ΔΦ ÷ Δt. More turns, faster change (higher frequency) or more flux (smaller gap) → bigger emf. Lenz's law gives the minus sign.",
  exam:"The alternating current in the pad coil produces a changing magnetic field. The flux through the phone's coil changes, so an emf is induced (ε = −N ΔΦ ÷ Δt, Faraday's law). Increasing the number of turns or the frequency increases the rate of change of flux linkage and so the emf; a larger gap reduces the flux and the efficiency.",
  trap:"Saying a steady field induces a voltage. Only a changing flux induces an emf; that is why the pad uses alternating current.",chips:["emfW","effW","tW"]},
 {k:"capacitor",lab:"A capacitor charges",cap:"Level 3. The phone's power rail uses capacitors to hold the voltage steady. Through a resistor, a capacitor charges exponentially with time constant τ = RC. Change C and R, then press play.",speed:1,speedLabel:"slowed",controls:["play","restart","C","R"],
  big:"<b>The big idea:</b> Q = CV, E = ½CV² and τ = RC. After one time constant the capacitor is at 63 % of the supply; after 5τ it is essentially full.",
  exam:"τ = RC = 100 × 1000 × 10⁻⁶ = 0.10 s. The capacitor reaches 63 % of 3.87 V after 0.10 s and is effectively full after 5τ = 0.5 s. Charge stored Q = CV = 1000 × 10⁻⁶ × 3.87 = 3.87 × 10⁻³ C; energy E = ½CV² = 0.5 × 10⁻³ × 3.87² = 7.5 × 10⁻³ J.",
  trap:"Forgetting the 10⁻⁶ on microfarads, and using ½QV with Q in mAh. Convert first; then E = ½CV² = ½QV.",chips:["tau","Qcap","Ecap","vcap"],onStep:()=>{s.tcap=0;s.vcap=0}},
 {k:"test",lab:"Test yourself",cap:"Five challenges, two of them Level 3. Use the controls from any step, then press Check.",controls:["mAh","hours","Pchg","eff","Iload","r","C","R"],chips:["Q","P","t50","Vterm","tau"],
  big:"<b>Exam tip:</b> convert every unit first (mAh → A, h → s, μF → F), write the equation, then substitute. Say what you assumed about efficiency."}];
// ---- kupu Māori: te reo terms for this machine, each checked in Te Aka Māori Dictionary (ta = word id). Sources and notes: te-reo-notes.md
const KUPU=[
 {mi:"hiko",en:"electricity",ta:1171},
 {mi:"iahiko",en:"electric current",ta:1648,chip:["Iavg","Inow","Itot","Ichg"]},
 {mi:"ngaohiko",en:"voltage",ta:40454,chip:["Vterm","pd"]},
 {mi:"ara iahiko",en:"electric circuit",ta:343},
 {mi:"pūhiko",en:"battery, electrical cell",ta:40049,chip:"mAh"},
 {mi:"whana hiko",en:"electric charge",ta:40518,chip:["Q","Qcap"]},
 {mi:"pūngao hiko",en:"electrical energy",ta:47713,chip:["E","Ecap"]},
 {mi:"parenga",en:"resistance, resistor",ta:5300,note:"Te Aka also lists parenga iahiko for a resistor."}];
Object.entries({"charge":["whana hiko","pūhiko","iahiko"],"energy":["pūngao hiko","ngaohiko"],"fast":["pūngao hiko","iahiko"],"ccv":["ngaohiko","iahiko","parenga"],"internal":["parenga","ngaohiko"],"circuit":["ara iahiko","iahiko","parenga"],"wireless":["hiko","ngaohiko"],"capacitor":["whana hiko","pūngao hiko","parenga"]}).forEach(([k,a])=>{const st=steps.find(x=>x.k===k);if(st)st.kupu=a});
const CH=[
  {q:"Choose a battery that stores about 1.8 × 10⁴ C.",check:()=>Math.abs(Q()-18000)<400,ok:()=>`Yes: ${fmt(s.mAh)} mAh = ${fmt(s.mAh/1000,3)} A h × 3600 = ${fmt(Q())} C.`,no:()=>`Not yet: ${fmt(s.mAh)} mAh stores ${fmt(Q())} C. Q = It, so you need 18 000 ÷ 3600 = 5 A h.`},
  {q:"With the 3 349 mAh battery, find a screen-on time that keeps the average power draw under 2 W.",check:()=>s.mAh===3349&&Pavg()<2,ok:()=>`Yes: ${fmt(E()/1000,1)} kJ over ${fmt(s.hours,1)} h is ${fmt(Pavg(),2)} W.`,no:()=>s.mAh!==3349?"Set the battery back to 3 349 mAh first.":`Not yet: ${fmt(Pavg(),2)} W. P = E ÷ t, so t must be more than 46 700 ÷ 2 = 23 350 s ≈ 6.5 h.`},
  {q:"Set a charger and efficiency so that 50% takes between 25 and 30 minutes (3 349 mAh).",check:()=>s.mAh===3349&&t50()>=1500&&t50()<=1800,ok:()=>`Yes: ${fmt(0.5*E()/1000,1)} kJ ÷ (${fmt(s.Pchg)} W × ${Math.round(s.eff*100)}%) = ${fmt(t50()/60,1)} min.`,no:()=>s.mAh!==3349?"Set the battery back to 3 349 mAh first.":`Not yet: ${fmt(t50()/60,1)} min. You need ${fmt(0.5*E()/1000,1)} kJ ÷ P_eff between 1500 and 1800 s, so P × efficiency between ${fmt(0.5*E()/1800,1)} and ${fmt(0.5*E()/1500,1)} W.`},
  {q:"Level 3: with a 3.0 A load, choose an internal resistance that keeps the lost volts under 0.10 V.",check:()=>s.Iload===3&&s.Iload*s.r<0.1,ok:()=>`Yes: Ir = 3.0 × ${fmt(s.r,2)} = ${fmt(3*s.r,2)} V, so the terminal voltage stays at ${fmt(Vterm(),2)} V and only ${fmt(Plost(),2)} W heats the cell.`,no:()=>s.Iload!==3?"Set the load to 3.0 A first.":`Not yet: Ir = ${fmt(3*s.r,2)} V. You need r < 0.10 ÷ 3.0 = 0.033 Ω.`},
  {q:"Level 3: set the capacitor and resistor so the time constant is about 0.10 s.",check:()=>Math.abs(tau()-0.1)<=0.01,ok:()=>`Yes: τ = RC = ${fmt(s.R)} × ${sci(s.C*1e-6,2)} = ${fmt(tau(),3)} s. After 0.10 s the capacitor is at 63%.`,no:()=>`Not yet: τ = ${fmt(tau()*1000,1)} ms. τ = RC with C in farads (${fmt(s.C)} μF = ${sci(s.C*1e-6,2)} F).`}];
// ---- the 3D bench (../kit3d.js): an exploded, see-through phone on a charger, plus four little circuit boards (internal
// resistance, parallel loads, a Qi pad, a capacitor). Charges are glowing beads whose speed follows the model's current;
// every number on a pill or a screen comes from the same functions the chips and challenges use.
// Presentation only: all scientific quantities come from the helpers above.
function chargePhase(){return s.soc>=1?"full":Icc(s.soc)>=Ibatt()-1e-9?"constant current":"current tapering"}
function phoneVisual(st){
  const k=st.k,charging=k==="fast"||k==="ccv"||k==="test";
  const fraction=charging?s.soc:k==="energy"?Math.max(.02,1-Math.min(1,s.t/(s.hours*.6))):1;
  return {topic:k,playing:s.playing,explode:k==="charge"?1:k==="energy"?.75:.3,indicatorFraction:fraction,
    phase:chargePhase(),chargeC:Q(),energyJ:E(),averageW:Pavg(),currentA:Icc(s.soc),chargerW:s.Pchg,efficiency:s.eff,
    terminalV:Vterm(),lostW:Plost(),loadA:s.Iload,voltage:s.V,screenA:s.Iscreen,modemA:s.Imodem,totalA:Itot(),hoursFlat:hoursFlat(),
    receiverTurns:s.N,frequencyKHz:s.f,gapMm:s.gap,inducedV:emfW(),wirelessEfficiency:effW(),wirelessHalfMin:tW50()/60,
    capacitanceUF:s.C,resistanceOhm:s.R,capacitorV:s.vcap,capacitorFraction:s.vcap/s.V,tauMs:tau()*1000};
}
function phone3d(S){
  let world=null,failed=false,disposed=false;
  const host=S.canvas.parentElement,figure=host.parentElement,status=()=>document.getElementById("phone-load-status");
  host.style.visibility="hidden";figure.classList.remove("s3-on");figure.classList.add("phone-loading");
  document.documentElement.dataset.phoneAsset="loading";
  if(status())status().textContent="Loading live 3D · static Blender render shown";
  function fail(error){
    if(failed||disposed)return;failed=true;world?.dispose();world=null;
    host.style.display="none";host.setAttribute("aria-hidden","true");figure.classList.remove("s3-on","phone-loading");
    document.getElementById("k-main").removeAttribute("aria-hidden");document.querySelector(".phone-parts").hidden=true;
    document.documentElement.dataset.phoneAsset="fallback";
    if(status())status().textContent="3D unavailable · simplified live diagram, controls and charts remain available";
    S.api.redraw();console.warn("Phone apparatus unavailable",error);
  }
  const leave=e=>{if(e.persisted)return;disposed=true;world?.dispose();world=null};
  window.addEventListener("pagehide",leave);
  import("./phone-asset.js").then(async m=>{
    const loaded=await m.loadPhone(S,phoneVisual);
    if(disposed||failed){loaded.dispose();return}world=loaded;
    world.step(S.api.step);world.update(s,S.api.step,0,0);
    S.renderer.render(S.scene,S.camera); // A real first render must succeed before claiming readiness.
    figure.classList.remove("phone-loading");figure.classList.add("s3-on");host.style.visibility="visible";
    document.getElementById("k-main").setAttribute("aria-hidden","true");host.querySelector(".s3-ov").setAttribute("aria-hidden","true");
    document.querySelector(".phone-parts").hidden=false;document.getElementById("phone-part").disabled=false;
    document.documentElement.dataset.phoneAsset="ready";
    if(status())status().textContent="Live 3D · illustrative charge and field markers · browser glass differs from the Blender render";
    host.querySelector(".s3-hint").textContent="Drag to turn · arrow keys · + / − to zoom · Home to reset";
  }).catch(fail);
  return {step(st){if(world&&!failed)try{world.step(st)}catch(e){fail(e)}},resize(w,h){world?.resize(w,h)},update(...args){if(world&&!failed)try{world.update(...args)}catch(e){fail(e)}}};
}
const CFG={postprocessing:false,ar:false,onStep:(state,st)=>{const link=document.getElementById?.("phone-graphics-link");if(link)link.href=(/[?&]lite\b/.test(location.search)?location.pathname:"?lite")+"#"+st.k},kupu:KUPU,caseTint:"sky",scene3d:phone3d,
  eyebrow:"Physics · Electricity and electrical systems", title:"The phone machine", crumb:"NCEA Level 2 Physics AS91173 and Level 3 AS91526", homeHash:"l2",
  fig:"FIG. 25 · A PHONE, ITS BATTERY AND A CHARGER", railTitle:"Charge, energy, current",
  badge:{label:"NCEA L2 91173 · L3 91526",exam:"2026-11-18T14:00:00+13:00",examText:"L2 Wed 18 Nov · L3 Thu 12 Nov"},
  mainBox:"0 0 800 420", mainPhoneBig:true, mainLabel:"An electrical learning apparatus: phone and charger, cell resistance, parallel loads, wireless coils or capacitor plates for the selected topic", closeBox:"0 0 420 260",
  state:s, steps,
  controls:[{type:"play"},{type:"button",id:"restart",label:"Restart",onClick:(x,api)=>{const st=api.step;st.onStep&&st.onStep();s.playing=true}},
    {type:"range",id:"mAh",label:"Battery",min:2000,max:5000,step:1,get:()=>s.mAh,set:(x,v)=>{s.mAh=v},fmt:()=>`${fmt(s.mAh)} mAh`},
    {type:"range",id:"hours",label:"Screen-on time",min:2,max:12,step:0.5,get:()=>s.hours,set:(x,v)=>{s.hours=v},fmt:()=>`${fmt(s.hours,1)} h`},
    {type:"range",id:"Pchg",label:"Charger",min:5,max:45,step:1,get:()=>s.Pchg,set:(x,v)=>{s.Pchg=v},fmt:()=>`${s.Pchg} W`},
    {type:"range",id:"eff",label:"Efficiency",min:0.6,max:1,step:0.05,get:()=>s.eff,set:(x,v)=>{s.eff=Math.round(v*100)/100},fmt:()=>`${Math.round(s.eff*100)}%`},
    {type:"range",id:"r",label:"Internal resistance",min:0.01,max:0.3,step:0.01,get:()=>s.r,set:(x,v)=>{s.r=Math.round(v*100)/100},fmt:()=>`${fmt(s.r,2)} Ω`},
    {type:"range",id:"Iload",label:"Load current",min:0.2,max:4,step:0.1,get:()=>s.Iload,set:(x,v)=>{s.Iload=Math.round(v*10)/10},fmt:()=>`${fmt(s.Iload,1)} A`},
    {type:"range",id:"Iscreen",label:"Screen",min:0.2,max:2,step:0.1,get:()=>s.Iscreen,set:(x,v)=>{s.Iscreen=Math.round(v*10)/10},fmt:()=>`${fmt(s.Iscreen,1)} A`},
    {type:"range",id:"Imodem",label:"Modem",min:0.1,max:1.5,step:0.1,get:()=>s.Imodem,set:(x,v)=>{s.Imodem=Math.round(v*10)/10},fmt:()=>`${fmt(s.Imodem,1)} A`},
    {type:"range",id:"N",label:"Coil turns",min:5,max:20,step:1,get:()=>s.N,set:(x,v)=>{s.N=v},fmt:()=>`${s.N}`},
    {type:"range",id:"f",label:"Frequency",min:100,max:200,step:5,get:()=>s.f,set:(x,v)=>{s.f=v},fmt:()=>`${s.f} kHz`},
    {type:"range",id:"gap",label:"Gap",min:0,max:8,step:0.5,get:()=>s.gap,set:(x,v)=>{s.gap=v},fmt:()=>`${fmt(s.gap,1)} mm`},
    {type:"select",id:"C",label:"Capacitor",options:[["100","100 μF"],["470","470 μF"],["1000","1000 μF"],["2200","2200 μF"],["4700","4700 μF"]],get:()=>String(s.C),set:(x,v)=>{s.C=+v;s.tcap=0;s.vcap=0}},
    {type:"select",id:"R",label:"Resistor",options:[["1","1 Ω"],["10","10 Ω"],["22","22 Ω"],["47","47 Ω"],["100","100 Ω"]],get:()=>String(s.R),set:(x,v)=>{s.R=+v;s.tcap=0;s.vcap=0}}],
  tick:(x,dt,st)=>{s.t+=dt;if(st.k==="fast"||st.k==="ccv"){tickCharge(dt);if(s.soc>=1)s.playing=false}else if(st.k==="capacitor"){tickCap(dt);if(s.tcap>5*tau())s.playing=false}else if(st.k==="energy"){if(s.t>s.hours*0.6)s.playing=false}},
  drawMain:(x,st)=>drawMain(st),
  drawClose:(x,st)=>drawClose(st),
  chips:()=>({mAh:["BATTERY",`${fmt(s.mAh)} mAh`],Q:["CHARGE",`${fmt(Q())} C`,true],electrons:["ELECTRONS",sci(Q()/E_CHARGE,1)],
    E:["ENERGY",`${fmt(E()/1000,1)} kJ`,true],P:["AVERAGE POWER",`${fmt(Pavg(),2)} W`],Iavg:["AVERAGE CURRENT",`${fmt(Pavg()/s.V,2)} A`],
    half:["HALF THE ENERGY",`${fmt(0.5*E()/1000,1)} kJ`],t50:["TIME TO 50%",`${fmt(t50()/60,1)} min`,true],Ichg:["INTO THE CELL",`${fmt(Ibatt(),1)} A`],claim:["\"30 MIN\" CLAIM",t50()<=1800?"plausible":"too slow"],
    soc:["CHARGE",`${Math.round(s.soc*100)}%`],emf:["CELL EMF",`${fmt(emf(s.soc),2)} V`],pd:["DRIVING PD",`${fmt(VCHG-emf(s.soc),2)} V`],Inow:["CURRENT",`${fmt(Icc(s.soc),2)} A`,true],
    Vterm:["TERMINAL V",`${fmt(Vterm(),2)} V`,true],lost:["LOST VOLTS",`${fmt(s.Iload*s.r,2)} V`],Plost:["HEAT IN CELL",`${fmt(Plost(),2)} W`],Pdel:["DELIVERED",`${fmt(Pdel(),1)} W`],
    Itot:["TOTAL CURRENT",`${fmt(Itot(),2)} A`,true],Ppar:["POWER",`${fmt(Ppar(),2)} W`],Rtot:["COMBINED R",`${fmt(s.V/Itot(),2)} Ω`],flat:["FLAT IN",`${fmt(hoursFlat(),1)} h`],
    emfW:["INDUCED EMF",`${fmt(emfW(),1)} V (model)`,true],effW:["EFFICIENCY",`${Math.round(effW()*100)}% (est.)`],tW:["50% CHARGE",`${fmt(tW50()/60)} min`],
    tau:["τ = RC",`${fmt(tau()*1000,1)} ms`,true],Qcap:["Q = CV",`${sci(Qcap(),2)} C`],Ecap:["E = ½CV²",`${sci(Ecap(),2)} J`],vcap:["NOW",`${fmt(s.vcap,2)} V`]}),
  challenges:CH,
  papers:[{label:"NZQA: Physics past exams and exemplars",url:"https://www2.nzqa.govt.nz/ncea/subjects/past-exams-and-exemplars/physics/"},{label:"NZQA: AS91173 (L2 electricity)",url:"https://www.nzqa.govt.nz/ncea/assessment/view-detailed.do?standardNumber=91173"},{label:"NZQA: AS91526 (L3 electrical systems)",url:"https://www.nzqa.govt.nz/ncea/assessment/view-detailed.do?standardNumber=91526"}],
  truth:"Battery 3 349 mAh at 3.87 V, a 20 W charger and 5.0 h of screen time are the practice pack's figures. The cell model (emf 3.5–4.2 V, internal resistance 0.08 Ω, charger at 4.2 V), the screen and modem currents, the wireless-charging emf and efficiency, and the phone temperature are estimates that show the shape of the physics, not measurements of any real phone. Charging is sped up and the capacitor is slowed down so you can watch them. The Blender-built apparatus is a generic educational design; circuit boards are enlarged diagrams. Live wireless spacing is shown at 5× for visibility; gap controls and calculations still use actual millimetres. Charge and field markers are illustrative, not measured electrons or a field simulation. Offline render glass and browser transparency differ.",
  footer:"Covers AS91173 (L2): charge, current, energy and power (Q = It, E = VQ, P = VI), DC circuits in parallel, and electromagnetic induction (Faraday and Lenz). AS91526 (L3): internal resistance (ε = V + Ir), capacitors (Q = CV, E = ½CV², τ = RC) and the charging curve."
};
// A one-use snapshot carries the existing experiment through a renderer reload.
function phoneViewTransfer(env){
  const param="phone-view",prefix="assembl.phone.view.",numbers="mAh V hours Pchg eff r Iload Iscreen Imodem C R N f gap soc tchg t socCC vcap tcap".split(" ");
  const finite=x=>typeof x==="number"&&Number.isFinite(x);
  function copy(state){
    if(!state||!numbers.every(k=>finite(state[k]))||typeof state.playing!=="boolean"||!Array.isArray(state.parts)||state.parts.length>200||!state.parts.every(p=>finite(p.u)&&finite(p.lane)))throw Error("Invalid experiment");
    const out={};for(const k of [...numbers,"playing"])out[k]=state[k];out.parts=state.parts.map(p=>({u:p.u,lane:p.lane}));return out;
  }
  return {
    take(topics){const url=new URL(env.location.href),token=url.searchParams.get(param);if(!token)return null;
      url.searchParams.delete(param);env.history.replaceState(null,"",url.href);
      try{const key=prefix+token,raw=env.storage().getItem(key);env.storage().removeItem(key);const v=JSON.parse(raw);
        if(v.version!==1||v.path!==url.pathname||v.topic!==url.hash.slice(1)||!topics.includes(v.topic))throw Error("Missing experiment");return {state:copy(v.state)};
      }catch(e){return {error:true}}
    },
    prepare(state,topic){const url=new URL(env.location.href);url.searchParams.has("lite")?url.searchParams.delete("lite"):url.searchParams.set("lite","");url.hash=topic;
      const token=env.nonce();env.storage().setItem(prefix+token,JSON.stringify({version:1,path:url.pathname,topic,state:copy(state)}));url.searchParams.set(param,token);return url.href}
  };
}
const viewTransfer=phoneViewTransfer({location,history:window.history,storage:()=>window.sessionStorage,nonce:()=>window.crypto.randomUUID()});
const savedView=viewTransfer.take(CFG.steps.map(st=>st.k));
const API=StudyKit.mount(CFG);
if(savedView&&!savedView.error){Object.assign(s,savedView.state);API.redraw()}
if(document.querySelector?.(".playmain")){
  const canvas=document.querySelector(".playmain .canvas"),poster=document.createElement("img");poster.className="phone-poster";poster.src="/assets/models/phone/phone-hero.jpg";poster.alt="Static Blender render of the pastel phone and charger";canvas.append(poster);
  const note=document.createElement("p");note.className="phone-view-note";note.innerHTML='<span id="phone-load-status" role="status">Simplified live diagram · controls and charts remain available</span><a id="phone-graphics-link" href="?lite">Use simplified view</a>';
  canvas.after(note);const parts=document.createElement("div");parts.className="phone-parts";parts.hidden=true;
  parts.innerHTML='<div id="phone-test-view" hidden><label for="phone-apparatus">Apparatus for your check</label><select id="phone-apparatus"><option value="CHARGE_STATION">Phone and charger</option><option value="INTERNAL_STATION">Internal resistance</option><option value="PARALLEL_STATION">Parallel loads</option><option value="WIRELESS_STATION">Wireless charging</option><option value="CAPACITOR_STATION">Capacitor</option></select></div><label for="phone-part">Inspect a component</label><select id="phone-part" disabled></select><p id="phone-part-description" aria-live="polite"></p><p id="phone-spacing-note" hidden>Wireless spacing is shown at 5× to make the coils and gap easier to inspect. The control and calculations use actual millimetres.</p>';
  note.after(parts);const link=note.querySelector("a"),lite=/[?&]lite\b/.test(location.search);
  link.textContent=lite?"Try live 3D":"Use simplified view";link.href=(lite?location.pathname:"?lite")+location.hash;
  const status=document.createElement("span");status.setAttribute("role","status");note.append(status);
  if(savedView?.error)status.textContent="The saved experiment was unavailable. This is a fresh experiment.";else if(savedView)status.textContent="Experiment preserved";
  link.onclick=e=>{e.preventDefault();try{location.assign(viewTransfer.prepare(s,API.step.k))}catch(error){status.textContent="Couldn’t preserve this experiment. Your view and settings are unchanged."}};
}
if(/[?&]debug\b/.test(location.search))window.__phone={s,API,phoneVisual,chargePhase};
})();
