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
  o+=phoneBody(330,40,200,340,soc,charging?(s.soc>=1?"full":s.soc>0.8?"constant voltage":"constant current"):(st.k==="charge"?`${fmt(s.mAh)} mAh · ${fmt(s.V,2)} V`:`${fmt(Pavg(),1)} W average`));
  // readout card
  o+=card(560,50,220,st.k==="charge"?200:220)+`<g transform="translate(560,50)">`;
  if(st.k==="charge")o+=`<text x="16" y="30" class="t-lab">CHARGE STORED, Q = It</text><text x="16" y="58" class="t-ink">${fmt(s.mAh)} mAh = ${fmt(s.mAh/1000,3)} A h</text><text x="16" y="80" class="t-ink">× 3600 s</text><text x="16" y="112" class="t-big">Q = ${fmt(Q())} C</text><text x="16" y="136" class="t-ink">≈ ${sci(Q())} C</text><text x="16" y="168" class="t-ink">${sci(Q()/E_CHARGE,1)} electrons</text>`;
  else if(st.k==="energy")o+=`<text x="16" y="30" class="t-lab">ENERGY, E = VQ</text><text x="16" y="58" class="t-ink">${fmt(s.V,2)} V × ${fmt(Q())} C</text><text x="16" y="90" class="t-big">E = ${sci(E())} J</text><text x="16" y="120" class="t-lab">POWER, P = E ÷ t</text><text x="16" y="146" class="t-ink">${fmt(E()/1000,1)} kJ ÷ (${fmt(s.hours,1)} × 3600 s)</text><text x="16" y="176" class="t-big">P = ${fmt(Pavg(),2)} W</text><text x="16" y="200" class="t-ink">I = P ÷ V = ${fmt(Pavg()/s.V,2)} A</text>`;
  else if(st.k==="fast")o+=`<text x="16" y="30" class="t-lab">HALF A BATTERY, t = E ÷ P</text><text x="16" y="58" class="t-ink">½E = ${fmt(0.5*E()/1000,1)} kJ</text><text x="16" y="80" class="t-ink">P into the cell = ${fmt(s.Pchg)} W × ${Math.round(s.eff*100)}%</text><text x="16" y="112" class="t-big">t = ${fmt(t50()/60,1)} min</text><text x="16" y="140" class="t-ink">"50% in 30 min": ${t50()<=1800?"plausible":"not at this power"}</text><text x="16" y="176" class="t-ink">I into the cell ≈ ${fmt(Ibatt(),1)} A</text><text x="16" y="198" class="t-ink">(P ÷ V at ${fmt(s.V,2)} V)</text>`;
  else o+=`<text x="16" y="30" class="t-lab">CHARGING NOW</text><text x="16" y="58" class="t-ink">cell emf ε = ${fmt(emf(s.soc),2)} V</text><text x="16" y="80" class="t-ink">charger holds ${fmt(VCHG,1)} V</text><text x="16" y="102" class="t-ink">driving pd = ${fmt(VCHG-emf(s.soc),2)} V</text><text x="16" y="134" class="t-big">I = ${fmt(Icc(s.soc),2)} A</text><text x="16" y="160" class="t-ink">${Icc(s.soc)>=Ibatt()-0.01?"limited by the charger (CC)":"= pd ÷ r, falling (CV)"}</text><text x="16" y="192" class="t-ink">${fmt(s.tchg/60)} min · ${Math.round(s.soc*100)}%</text>`;
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
 {k:"ccv",lab:"Why it slows above 80%",cap:"Watch the current. Up to about 80% the charger pushes its maximum (constant current). Then the cell's emf gets close to the charger's voltage, the driving pd shrinks, and I = pd ÷ r falls (constant voltage).",speed:1,speedLabel:"sped up",controls:["play","restart","Pchg","r"],
  big:"<b>The big idea:</b> current is driven by a potential difference across a resistance. As the cell's emf rises toward the charger's voltage, the difference falls, so the current falls: the flat tail of every charging curve.",
  exam:"Above about 80 % the battery management system switches from constant current to constant voltage. As the cell's emf rises toward the charger's voltage, the driving potential difference (V_charger − ε) falls, so the current I = (V_charger − ε) ÷ r falls, and the last 20 % takes much longer.",
  trap:"Saying the battery is 'full' at 80 %, or mixing up the cell's emf with the charger's voltage. The current depends on the difference between them.",chips:["soc","emf","pd","Inow"],onStep:()=>{s.soc=0;s.tchg=0;s.parts=[]}},
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
function phone3d(S){const {THREE,mat,PAL}=S;const V3=(x,y,z)=>new THREE.Vector3(x,y,z);
  const TOP=.3,tmp=new THREE.Vector3(),UP=V3(0,1,0),qq=new THREE.Quaternion();
  const ZP=V3(-4.6,0,3.6),ZW=V3(8.2,0,3.6),ZI=V3(-10,0,-6),ZR=V3(0,0,-6),ZK=V3(10,0,-6);
  const plinth=(c,w,d,tint)=>{const p=S.rbox(w,.3,d,.12,mat("plastic",tint,{rough:.55,coat:.2}));p.position.set(c.x,.15,c.z);S.scene.add(p);return p};
  plinth(ZP,12.4,7.6,PAL.case.sky);plinth(ZW,7.6,7.6,PAL.case.lavender);plinth(ZI,8.6,5.8,PAL.case.mint);plinth(ZR,8.6,5.8,PAL.case.lavender);plinth(ZK,8.6,5.8,PAL.case.mint);
  const zoneG=c=>{const g=S.group();g.position.set(c.x,TOP,c.z);return g};
  const white=mat("plastic","#ffffff",{rough:.35}),ink=mat("plastic",PAL.ink,{rough:.4}),steel=mat("metal",PAL.steel,{rough:.3}),steelD=mat("metal",PAL.steelDark,{rough:.35}),copperM=mat("metal",PAL.copper,{rough:.28});
  const limeM=mat("plastic",LIME,{rough:.35}),butterM=mat("plastic",BUTTER,{rough:.35});
  const addGlowM=(c,o)=>new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:o??0,depthWrite:false,blending:THREE.AdditiveBlending});
  const beadGeo=new THREE.SphereGeometry(1,12,10);
  // a wire with glowing charges riding along it; the phase advances at a speed set by the current, so changes never jump
  function wireRun(parent,pts,n,o={}){const curve=pts instanceof THREE.Curve?pts:new THREE.CatmullRomCurve3(pts.map(p=>V3(...p)),!!o.closed,"centripetal");
    if(o.draw!==false)parent.add(S.tube(curve,o.r??.04,o.mat||copperM,{seg:o.seg??160,closed:!!o.closed}));
    const sw=S.swarm(n,beadGeo,mat("glow",o.col||"#FFD76A",2.2));parent.add(sw);
    return {curve,sw,ph:0,upd(dt,speed,on){if(on&&!S.REDUCED)this.ph=(this.ph+dt*speed)%1;for(let i=0;i<n;i++){let u=(i/n+this.ph)%1;if(!o.closed)u=Math.min(.999,u);curve.getPointAt(u,tmp);sw.put(i,tmp.x,tmp.y,tmp.z,on?(o.br??.05):0)}sw.done()}}}
  // a canvas graph on a white stand
  function graphStand(parent,at,wU){const g=S.group(parent);g.position.set(...at);const p=S.panel(640,400,wU);p.position.set(0,.35+p.hU/2+.08,.03);g.add(p);
    g.add(S.rbox(wU+.18,p.hU+.18,.08,.05,white,{at:[0,.35+p.hU/2+.08,-.03]}));g.add(S.cyl(.05,.07,.5,steel,{at:[0,.25,-.05],seg:12}));g.add(S.cyl(.3,.34,.06,white,{at:[0,.03,-.05],seg:24}));return p}
  function plot(g,w,h,o){g.fillStyle="#ffffff";g.fillRect(0,0,w,h);const L=70,R=w-30,T=46,B=h-56;g.strokeStyle="#8F9BAA";g.lineWidth=2;g.beginPath();g.moveTo(L,T-10);g.lineTo(L,B);g.lineTo(R+10,B);g.stroke();
    g.font="600 22px Instrument Sans, system-ui";g.fillStyle="#6E6A86";g.textAlign="left";g.fillText(o.title,L,30);g.textAlign="right";g.fillText(o.xlab,R,h-18);
    const X=x=>L+(x-o.x0)/(o.x1-o.x0)*(R-L),Y=y=>B-(y-o.y0)/(o.y1-o.y0)*(B-T);
    (o.marks||[]).forEach(mk=>{g.strokeStyle=mk.col;g.setLineDash([8,8]);g.lineWidth=2;g.beginPath();g.moveTo(X(mk.x),T);g.lineTo(X(mk.x),B);g.stroke();g.setLineDash([]);g.fillStyle=mk.col;g.textAlign="left";g.fillText(mk.t,X(mk.x)+8,T+20)});
    o.curves.forEach(c=>{g.strokeStyle=c.col;g.lineWidth=5;g.setLineDash(c.dash?[14,10]:[]);g.beginPath();for(let i=0;i<=120;i++){const x=o.x0+(o.x1-o.x0)*i/120,y=c.f(x);const px=X(x),py=Math.max(T-10,Math.min(B,Y(y)));i?g.lineTo(px,py):g.moveTo(px,py)}g.stroke();g.setLineDash([]);
      if(c.lab){g.fillStyle=c.col;g.textAlign="left";g.fillText(c.lab,14,Math.max(T,Math.min(B,Y(c.f(o.x0))))+8)}});
    if(o.dot){const px=X(o.dot[0]),py=Math.max(T-10,Math.min(B,Y(o.dot[1])));g.fillStyle=BUTTER;g.strokeStyle=NAVY;g.lineWidth=3;g.beginPath();g.arc(px,py,12,0,7);g.fill();g.stroke()}}
  const cell=(parent,at,rot)=>{const g=S.group(parent);g.position.set(...at);if(rot)g.rotation.set(...rot);g.add(S.cyl(.32,.32,1.0,limeM,{seg:32}));g.add(S.cyl(.33,.33,.12,ink,{at:[0,-.5,0],seg:32}));g.add(S.cyl(.1,.1,.1,steel,{at:[0,.55,0],seg:16}));return g};
  const meterDial=(parent,at,max)=>{const g=S.group(parent);g.position.set(...at);g.add(S.cyl(.42,.46,.22,white,{at:[0,.11,0],seg:36}));const p=S.panel(256,256,.74);p.rotation.x=-Math.PI/2;p.position.y=.225;g.add(p);
    let last=-1;g.set=v=>{if(Math.abs(v-last)<.005)return;last=v;p.redraw((c,w,h)=>{c.fillStyle="#fff";c.beginPath();c.arc(w/2,h/2,w/2-4,0,7);c.fill();c.strokeStyle="#C9C2DC";c.lineWidth=6;c.beginPath();c.arc(w/2,h/2+30,90,Math.PI*1.15,Math.PI*1.85);c.stroke();
      for(let k=0;k<=5;k++){const a=Math.PI*(1.15+.7*k/5);c.lineWidth=4;c.beginPath();c.moveTo(w/2+Math.cos(a)*90,h/2+30+Math.sin(a)*90);c.lineTo(w/2+Math.cos(a)*72,h/2+30+Math.sin(a)*72);c.stroke()}
      const a=Math.PI*(1.15+.7*Math.max(0,Math.min(1,v/max)));c.strokeStyle=PAL.deep.blush;c.lineWidth=7;c.lineCap="round";c.beginPath();c.moveTo(w/2,h/2+30);c.lineTo(w/2+Math.cos(a)*88,h/2+30+Math.sin(a)*88);c.stroke();
      c.fillStyle=NAVY;c.beginPath();c.arc(w/2,h/2+30,10,0,7);c.fill();c.fillStyle="#6E6A86";c.font="700 30px Instrument Sans, system-ui";c.textAlign="center";c.fillText("A",w/2,h/2+86)})};return g};

  // ================================================================ ZONE 1: the exploded phone on its charger
  const gP=zoneG(ZP);const PXc=1.3;
  const phone=S.group(gP);phone.position.set(PXc,0,-.2);
  const back=S.group(phone);back.add(S.rbox(4.4,.18,2.2,.09,mat("plastic",PAL.case.sky,{rough:.4}),{at:[0,.09,0]}));
  back.add(S.rbox(.9,.1,.9,.12,mat("plastic",PAL.case.sky,{rough:.3}),{at:[1.55,.22,-.55]}));for(const [x,z] of [[1.4,-.7],[1.7,-.4],[1.4,-.4]])back.add(S.cyl(.12,.12,.06,ink,{at:[x,.29,z],seg:24}));
  back.add(S.rbox(.18,.1,.3,.03,steel,{at:[-2.18,.1,0]}));
  const bat=S.group(phone);
  const batCase=S.rbox(2.9,.34,1.7,.08,mat("acrylic",PAL.case.sky,{opacity:.22}),{cast:false});batCase.position.y=.17;batCase.renderOrder=3;bat.add(batCase);
  const fillM=mat("plastic",LIME,{rough:.35,fresh:true});const batFill=S.rbox(2.76,.26,1.56,.06,fillM);bat.add(batFill);
  bat.add(S.rbox(.2,.1,.5,.03,steel,{at:[1.55,.17,0]}));
  const beads=S.swarm(320,beadGeo,mat("glow","#FFD24A",2.2));bat.add(beads);
  const board=S.group(phone);board.add(S.rbox(3.9,.06,2.0,.04,mat("plastic","#9ED6C2",{rough:.5}),{at:[0,.03,0]}));
  board.add(S.rbox(.7,.08,.7,.04,ink,{at:[.6,.1,.2]}));board.add(S.rbox(.5,.06,.35,.03,mat("plastic","#3B4466"),{at:[-.5,.09,-.5]}));board.add(S.rbox(.35,.06,.5,.03,steel,{at:[1.4,.09,.5]}));
  for(let i=0;i<5;i++)board.add(S.box(.02,.01,1.2,copperM,{at:[-1.3+i*.12,.065,.2]}));
  const scr=S.group(phone);scr.add(S.rbox(4.3,.08,2.12,.08,mat("plastic","#1B2238",{rough:.15,coat:1}),{at:[0,.04,0]}));
  const screen=S.panel(760,370,4.0);screen.rotation.x=-Math.PI/2;screen.position.y=.085;scr.add(screen);
  const glowScr=S.mesh(new THREE.PlaneGeometry(4.2,2.0),addGlowM("#BFDDF5"),{rot:[-Math.PI/2,0,0],at:[0,.1,0],cast:false});scr.add(glowScr);
  const upStream=wireRun(phone,[[-.3,.4,.3],[-.3,2.6,.3]],12,{draw:false,col:"#FFD24A",br:.045}),upStream2=wireRun(phone,[[.5,.4,-.3],[.5,2.6,-.3]],12,{draw:false,col:"#FFD24A",br:.045});
  // the charger brick, its pins, and the cable with charges riding along it
  const brick=S.group(gP);brick.position.set(-4.0,0,1.7);brick.add(S.rbox(1.15,.85,.95,.14,white,{at:[0,.425,0]}));
  for(const z of [-.2,.2])brick.add(S.box(.35,.06,.1,steel,{at:[-.72,.42,z]}));brick.add(S.rbox(.06,.16,.3,.03,ink,{at:[.58,.42,0]}));
  const cable=wireRun(gP,[[-3.42,.42,1.7],[-2.8,.16,1.8],[-2.1,.14,1.2],[-1.6,.16,.2],[-1.05,.16,-.2],[PXc-2.3,.12,-.2]],28,{r:.07,mat:mat("plastic","#E9EDF4",{rough:.45}),seg:120});
  const haze=S.puffs(30,"#FFB27A",{additive:true});gP.add(haze);const hz=[];for(let i=0;i<30;i++)hz.push({x:0,y:0,z:0,life:Math.random()*2});
  const gr=graphStand(gP,[4.6,0,-1.9],2.8);gr.parent.rotation.y=-.45;let grKey="";
  const lBat=S.label({off:[-30,-40]}),lQ=S.label({cls:"big",off:[34,-20]}),lScr=S.label({cls:"big",off:[30,-30]}),lChg=S.label({off:[-20,-46]}),lCab=S.label({cls:"hot",off:[-30,30]}),lCell=S.label({off:[40,30]});
  let scrKey="",explode=1;

  // ================================================================ ZONE 2: internal resistance
  const gI=zoneG(ZI);gI.add(S.rbox(7.6,.08,4.6,.05,mat("acrylic",PAL.case.sky,{opacity:.3}),{at:[0,.04,0],cast:false}));
  const cellI=cell(gI,[-2.6,.62,-.6],[0,0,0]);
  const insideCell=S.rbox(2.9,1.5,1.3,.1,mat("acrylic","#ffffff",{opacity:.12}),{at:[-1.9,.8,-.6],cast:false});insideCell.renderOrder=3;gI.add(insideCell);
  const rM=new THREE.MeshPhysicalMaterial({color:"#F4F1EA",roughness:.5,clearcoat:.3,emissive:"#FF5A2A",emissiveIntensity:0});
  const rBlock=S.rbox(.9,.36,.36,.08,rM,{at:[-1.25,.5,-.6]});gI.add(rBlock);for(const x of [-1.5,-1.25,-1.0])gI.add(S.box(.06,.37,.37,mat("plastic",PAL.product.peach),{at:[x,.5,-.6]}));
  const load=S.rbox(.6,.9,.6,.1,butterM,{at:[2.4,.55,.4]});gI.add(load);
  const loopI=wireRun(gI,[[-2.6,.32,-.1],[-2.6,.32,1.5],[0,.32,1.5],[2.4,.32,1.5],[2.4,.32,.4],[2.4,.32,-.6],[0,.5,-.6],[-.8,.5,-.6],[-1.7,.5,-.6],[-2.2,.5,-.6],[-2.6,1.2,-.6]],36,{closed:true});
  const amI=meterDial(gI,[0,.08,1.5],5);
  const thI=S.group(gI);thI.position.set(3.2,0,-1.5);thI.add(S.cyl(.09,.09,1.8,mat("glass","#ffffff",{opacity:.3}),{at:[0,1.05,0],cast:false}));thI.add(S.sphere(.14,mat("glow",STRAW,.6),{at:[0,.16,0]}));
  const spI=S.cyl(.05,.05,1,mat("glow",STRAW,.6),{seg:10});thI.add(spI);thI.add(S.cyl(.22,.25,.06,white,{at:[0,.03,0],seg:20}));
  const heatI=S.puffs(30,"#FF9A5A",{additive:true});gI.add(heatI);const hi=[];for(let i=0;i<30;i++)hi.push({x:0,y:0,z:0,life:Math.random()});
  const grI=graphStand(gI,[1.0,0,-1.7],2.6);let grIKey="";
  const lEmf=S.label({off:[-30,-40]}),lR=S.label({cls:"hot",off:[10,-56]}),lVt=S.label({cls:"big",off:[34,34]}),lLoad=S.label({off:[30,0]}),lTemp=S.label({off:[24,-10]});

  // ================================================================ ZONE 3: loads in parallel
  const gR=zoneG(ZR);gR.add(S.rbox(7.6,.08,4.6,.05,mat("acrylic",PAL.case.sky,{opacity:.3}),{at:[0,.04,0],cast:false}));
  cell(gR,[-2.9,.42,0],[Math.PI/2,0,0]);
  const scrL=S.group(gR);scrL.position.set(-.1,0,0);scrL.add(S.rbox(.9,.9,.3,.08,butterM,{at:[0,.55,0]}));const scrGlowM=S.M.glow("#DDEBFF",0);scrL.add(S.rbox(.72,.66,.02,.04,scrGlowM,{at:[0,.58,.16]}));
  const modem=S.group(gR);modem.position.set(2.3,0,0);modem.add(S.rbox(.7,.6,.5,.08,mat("plastic",BLUE,{rough:.35}),{at:[0,.4,0]}));modem.add(S.cyl(.03,.03,.8,steel,{at:[.2,1.0,0],seg:8}));
  const rings=[0,1,2].map(()=>{const r=S.torus(.2,.015,addGlowM(BLUE,0),{rot:[Math.PI/2,0,0],cast:false});r.position.set(.2,1.4,0);modem.add(r);return r});
  const railS=[[-2.9,.32,-.4],[-2.9,.32,-1.5],[-.1,.32,-1.5],[-.1,.32,-.3],[-.1,.32,.3],[-.1,.32,1.5],[-2.9,.32,1.5],[-2.9,.32,.4]];
  const railM=[[-2.9,.32,-.4],[-2.9,.32,-1.5],[-.1,.32,-1.5],[2.3,.32,-1.5],[2.3,.32,-.3],[2.3,.32,.3],[2.3,.32,1.5],[-.1,.32,1.5],[-2.9,.32,1.5],[-2.9,.32,.4]];
  const lineRun=(pts)=>{const path=new THREE.CurvePath();for(let i=0;i<pts.length-1;i++)path.add(new THREE.LineCurve3(V3(...pts[i]),V3(...pts[i+1])));return path};
  const loopS=wireRun(gR,lineRun(railS),40,{r:.045}),loopMo=wireRun(gR,lineRun(railM),60,{r:.045,col:"#BFE0FF"});
  const amR=meterDial(gR,[-1.6,.08,-1.5],4);
  const lVp=S.label({off:[-30,-30]}),lIs=S.label({off:[24,-56]}),lIm=S.label({off:[30,-40]}),lIt=S.label({cls:"big",off:[-50,-40]}),lFlat=S.label({off:[30,30]});

  // ================================================================ ZONE 4: the Qi pad
  const gW=zoneG(ZW);
  gW.add(S.cyl(1.7,1.8,.26,white,{at:[0,.13,0],seg:64}));
  const padCoilM=S.M.glow(PAL.copper,0);padCoilM.color.set(PAL.copper);
  gW.add(S.tube(Array.from({length:140},(_,i)=>{const a=i/139*Math.PI*12;const r=.25+1.2*(i/139);return [Math.cos(a)*r,.28,Math.sin(a)*r]}),.035,padCoilM,{seg:600,cast:false}));
  const hov=S.group(gW);hov.add(S.rbox(3.4,.22,1.7,.1,mat("acrylic",PAL.case.sky,{opacity:.35}),{at:[0,.11,0],cast:false}));hov.children[0].renderOrder=3;
  hov.add(S.rbox(3.2,.04,1.55,.06,mat("plastic","#1B2238",{rough:.15}),{at:[0,.23,0]}));
  const pCoils=[];for(let i=0;i<8;i++){const r=S.torus(.18+i*.085,.022,copperM,{rot:[Math.PI/2,0,0]});r.position.y=-.02;hov.add(r);pCoils.push(r)}
  const coilRun=wireRun(hov,new THREE.CatmullRomCurve3(Array.from({length:24},(_,i)=>V3(Math.cos(i/24*6.283)*.52,-.02,Math.sin(i/24*6.283)*.52)),true),20,{draw:false,closed:true,br:.04});
  const fieldRings=[];for(let i=0;i<8;i++){const r=S.torus(1,.03,addGlowM("#FFD76A",0),{rot:[Math.PI/2,0,0],cast:false,ts:72});gW.add(r);fieldRings.push(r)}
  const fluxLines=[];for(let i=0;i<12;i++){const a=i/12*Math.PI*2;const ln=S.cyl(.012,.012,1,addGlowM("#FFC84A",0),{seg:6,cast:false});ln.position.set(Math.cos(a)*.6,0,Math.sin(a)*.6);gW.add(ln);fluxLines.push({ln})}
  const emfBar=S.group(gW);emfBar.position.set(2.7,0,-1.6);emfBar.add(S.cyl(.14,.14,2.4,mat("glass","#ffffff",{opacity:.25}),{at:[0,1.35,0],cast:false}));emfBar.add(S.cyl(.26,.3,.1,white,{at:[0,.05,0],seg:24}));
  const emfFillM=S.M.glow(LIME,1.2);const emfFill=S.cyl(.1,.1,1,emfFillM,{seg:16});emfBar.add(emfFill);
  let wph=0;
  const lPad=S.label({off:[-30,30]}),lCoil=S.label({off:[30,-40]}),lGap=S.label({off:[-40,-10]}),lEmfW=S.label({cls:"big",off:[24,-20]});

  // ================================================================ ZONE 5: a capacitor charging through a resistor
  const gK=zoneG(ZK);gK.add(S.rbox(7.6,.08,4.6,.05,mat("acrylic",PAL.case.sky,{opacity:.3}),{at:[0,.04,0],cast:false}));
  cell(gK,[-2.9,.42,0],[Math.PI/2,0,0]);
  const res=S.group(gK);res.position.set(-1.1,.42,-1.5);res.add(S.cyl(.16,.16,.8,mat("plastic","#F4F1EA",{rough:.5}),{rot:[0,0,Math.PI/2],seg:20}));
  [PAL.product.peach,PAL.ink,PAL.product.strawberry].forEach((c,i)=>res.add(S.cyl(.165,.165,.07,mat("plastic",c),{at:[-.2+i*.17,0,0],rot:[0,0,Math.PI/2],seg:20})));
  const PLX=[1.55,2.15];const plates=PLX.map(x=>{const p=S.rbox(.08,1.5,1.5,.03,steel,{at:[x,1.1,0]});gK.add(p);gK.add(S.cyl(.04,.04,.4,steelD,{at:[x,.2,0],seg:8}));return p});
  const kRun=wireRun(gK,lineRun([[-2.9,.32,-.45],[-2.9,.32,-1.5],[-1.5,.42,-1.5],[-.7,.42,-1.5],[1.2,.42,-1.5],[1.2,1.1,-1.5],[1.2,1.1,0],[1.51,1.1,0]]),26,{r:.04});
  const kRun2=wireRun(gK,lineRun([[2.19,1.1,0],[2.6,1.1,0],[2.6,1.1,1.5],[2.6,.32,1.5],[-2.9,.32,1.5],[-2.9,.32,.45]]),26,{r:.04});
  const qPlus=S.swarm(100,beadGeo,mat("glow",STRAW,2)),qMinus=S.swarm(100,beadGeo,mat("glow","#7FB2F0",2));gK.add(qPlus,qMinus);
  const fLines=S.swarm(25,new THREE.CylinderGeometry(1,1,1,6),addGlowM("#FFD76A",.5));gK.add(fLines);
  const grK=graphStand(gK,[-.6,0,-.2],2.4);grK.parent.position.set(-.4,0,.3);let grKKey="";
  const lTau=S.label({cls:"big",off:[-20,-40]}),lCap=S.label({off:[30,-40]}),lRes=S.label({off:[-20,-34]}),lQc=S.label({off:[30,30]});

  // ---------------------------------------------------------------- views
  S.view("battery",[ZP.x+PXc+.5,8.0,ZP.z+8.6],[ZP.x+PXc,1.7,ZP.z-.2],{min:3,max:24});
  S.view("phone",[ZP.x+PXc-1.0,6.8,ZP.z+5.6],[ZP.x+PXc,1.2,ZP.z-.3],{min:3,max:24});
  S.view("charger",[ZP.x+.4,6.2,ZP.z+9.4],[ZP.x+.1,1.2,ZP.z-.4],{min:3,max:26});
  S.view("internal",[ZI.x+.6,5.0,ZI.z+7.4],[ZI.x+.2,.9,ZI.z],{min:3,max:22});
  S.view("circuit",[ZR.x+.3,5.6,ZR.z+6.8],[ZR.x,.7,ZR.z],{min:3,max:22});
  S.view("wireless",[ZW.x+.6,2.6,ZW.z+7.4],[ZW.x+.3,.9,ZW.z],{min:3,max:22});
  S.view("capacitor",[ZK.x+.6,5.0,ZK.z+7.2],[ZK.x+.2,.9,ZK.z],{min:3,max:22});
  S.view("all",[0,17,22],[0,.3,-.8],{min:6,max:60});
  const viewOf=k=>k==="charge"?"battery":k==="energy"?"phone":k==="fast"||k==="ccv"?"charger":k==="test"?"all":k;
  const zoneOf=v=>v==="battery"||v==="phone"||v==="charger"?"P":v==="internal"?"I":v==="circuit"?"R":v==="wireless"?"W":v==="capacitor"?"K":"all";
  const centers={P:ZP,I:ZI,R:ZR,W:ZW,K:ZK};
  const LP=[lBat,lQ,lScr,lChg,lCab,lCell],LI=[lEmf,lR,lVt,lLoad,lTemp],LR=[lVp,lIs,lIm,lIt,lFlat],LW=[lPad,lCoil,lGap,lEmfW],LK=[lTau,lCap,lRes,lQc];
  const lAll=[S.label({off:[0,-40]}),S.label({off:[0,-40]}),S.label({off:[0,-40]}),S.label({off:[0,-40]}),S.label({off:[0,-40]})];
  let zone="P",first=true;S.goView("battery",true);
  return {
    step(st){const v=viewOf(st.k);zone=zoneOf(v);S.goView(v,first);first=false;const c=centers[zone];S.setShadowBox(zone==="all"?20:6.5,c?[c.x,0,c.z]:[0,0,0]);
      [[LP,"P"],[LI,"I"],[LR,"R"],[LW,"W"],[LK,"K"]].forEach(([a,z])=>a.forEach(l=>l.show(zone===z)));lAll.forEach(l=>l.show(zone==="all"));
      [lQ,lScr,lChg,lCab,lCell].forEach(l=>l.hide());
      if(st.k==="charge")lQ.show();else if(st.k==="energy")lScr.show();else if(zone==="P"){lChg.show();lCab.show();lCell.show()}},
    update(s,st,dt,t){const k=st.k,run=s.playing;
      // ---- phone zone
      const charging=k==="fast"||k==="ccv"||k==="test";
      const soc=charging?s.soc:(k==="energy"?Math.max(.02,1-Math.min(1,s.t/(s.hours*.6))):1);
      const ex=k==="charge"?1:k==="energy"?.75:.3;explode=S.lerp(explode,ex,S.REDUCED?1:.06);
      back.position.y=0;bat.position.y=.2+explode*.9;board.position.y=.45+explode*1.85;scr.position.y=.6+explode*2.7;
      batFill.scale.x=Math.max(.01,soc);batFill.position.set(-1.38+1.38*soc,.17,0);fillM.color.set(soc>.2?LIME:STRAW);
      const showBeads=k==="charge";const nB=showBeads?Math.min(320,Math.round(Q()/60)):0;
      for(let i=0;i<320;i++){const a=i%20,b=Math.floor(i/20)%8,c=Math.floor(i/160);const j=S.REDUCED?0:.012;beads.put(i,-1.3+a*.137+Math.sin(t*5+i)*j,.42+c*.1+Math.cos(t*4+i*1.3)*j,-.7+b*.2,i<nB?.045:0)}beads.done();
      const P=Pavg(),usingE=k==="energy";upStream.upd(dt,.1+P*.06,usingE&&run);upStream2.upd(dt,.1+P*.06,usingE&&run);
      glowScr.material.opacity=usingE?.12+.05*Math.sin(t*2):0;
      const I=k==="ccv"?Icc(s.soc):Ibatt();const flowing=charging&&s.soc<1&&run;cable.upd(dt,.04+I*.035,charging&&s.soc<1);
      for(let i=0;i<hz.length;i++){const p=hz[i];p.life-=dt;if(p.life<=0){p.life=1.2+Math.random();p.x=-4.0+(Math.random()-.5)*.8;p.z=1.7+(Math.random()-.5)*.6;p.y=.9}p.y+=dt*.45;
        haze.put(i,p.x,p.y,p.z,k==="fast"&&flowing?(1-s.eff)*2.2*Math.min(1,p.life):0,120)}haze.done();
      const sk=`${Math.round(soc*100)}|${k}|${charging&&s.soc<1}`;if(sk!==scrKey){scrKey=sk;screen.redraw((g,w,h)=>{const grd=g.createLinearGradient(0,0,w,h);grd.addColorStop(0,"#26305A");grd.addColorStop(1,"#1A2142");g.fillStyle=grd;g.fillRect(0,0,w,h);
        const bx=w/2-170,by=h/2-60,bw=320,bh=120;g.strokeStyle="#E9EDF4";g.lineWidth=8;g.beginPath();g.roundRect(bx,by,bw,bh,22);g.stroke();g.fillStyle="#E9EDF4";g.fillRect(bx+bw+6,by+38,16,44);
        g.fillStyle=soc>.2?LIME:STRAW;g.beginPath();g.roundRect(bx+12,by+12,Math.max(8,(bw-24)*soc),bh-24,14);g.fill();
        g.fillStyle="#ffffff";g.font="600 64px Instrument Sans, system-ui";g.textAlign="center";g.fillText(Math.round(soc*100)+"%",w/2,by+bh+84);
        if(charging&&s.soc<1){g.fillStyle=BUTTER;g.beginPath();g.moveTo(w/2+12,by+18);g.lineTo(w/2-26,by+66);g.lineTo(w/2,by+66);g.lineTo(w/2-12,by+102);g.lineTo(w/2+26,by+54);g.lineTo(w/2,by+54);g.closePath();g.fill()}})}
      if(k==="fast"||k==="ccv"){const gk=`${Math.round(s.soc*200)}|${s.Pchg}|${s.r}|${s.eff}|${s.mAh}`;if(gk!==grKey){grKey=gk;gr.redraw((g,w,h)=>plot(g,w,h,{title:"Current (solid) and cell emf (dashed)",xlab:"charge 0 → 100%",x0:0,x1:1,y0:0,y1:1.08,
        curves:[{f:x=>Icc(x)/Math.max(1,Ibatt()),col:STRAW,lab:"I"},{f:x=>(emf(x)-3.4)/.9,col:BLUE,dash:true,lab:"V"}],marks:[{x:.8,t:"CV",col:"#B5A9D6"}],dot:[s.soc,Icc(s.soc)/Math.max(1,Ibatt())]}))}}
      gr.parent.visible=zone!=="P"||k==="fast"||k==="ccv"||k==="test";
      const pw=(x,y,z)=>tmp.set(ZP.x+PXc+x,TOP+y,ZP.z-.2+z);
      lBat.at(pw(-1.4,bat.position.y+.35,.8)).set(`Battery<b>${fmt(s.mAh)} mAh · ${fmt(s.V,2)} V</b>`);
      lQ.at(pw(1.2,bat.position.y+.4,0)).set(`Charge stored<b>Q = It = ${fmt(Q())} C</b><small>${fmt(s.mAh/1000,3)} A h × 3600 s · 1 bead ≈ 60 C</small>`);
      lScr.at(pw(1.6,scr.position.y,.6)).set(`Average power<b>P = E ÷ t = ${fmt(Pavg(),2)} W</b><small>E = ${fmt(E()/1000,1)} kJ over ${fmt(s.hours,1)} h · I = ${fmt(Pavg()/s.V,2)} A</small>`);
      lChg.at(tmp.set(ZP.x-4.0,TOP+.95,ZP.z+1.7)).set(k==="fast"?`Charger ${fmt(s.Pchg)} W<small>${Math.round(s.eff*100)}% reaches the cell</small>`:`Charger holds ${fmt(VCHG,1)} V<small>cell emf ε = ${fmt(emf(s.soc),2)} V</small>`);
      cable.curve.getPointAt(.45,tmp);tmp.add(gP.position);lCab.at(tmp).set(k==="fast"?`I into the cell<b>${fmt(Ibatt(),1)} A</b>`:`I = ${fmt(Icc(s.soc),2)} A<small>${Icc(s.soc)>=Ibatt()-.01?"limited by the charger (CC)":"= pd ÷ r, falling (CV)"}</small>`);
      lCell.at(pw(1.45,bat.position.y+.2,.85)).set(k==="fast"?`50% in<b>${fmt(t50()/60,1)} min</b><small>½E = ${fmt(.5*E()/1000,1)} kJ</small>`:`${Math.round(s.soc*100)}%<small>driving pd ${fmt(VCHG-emf(s.soc),2)} V · ${fmt(s.tchg/60)} min</small>`);
      // ---- internal resistance
      const IL=s.Iload,Pl=Plost();loopI.upd(dt,.03+IL*.03,true);amI.set(IL);rM.emissiveIntensity=Math.min(4.5,Pl*1.6);rM.emissive.set(Pl>1.5?"#FF7A3A":"#FF5A2A");
      const Tph=22+Pl*6;spI.scale.y=Math.max(.02,Math.min(1.55,(Tph-20)*.06));spI.position.y=.22+spI.scale.y/2;
      for(let i=0;i<hi.length;i++){const p=hi[i];p.life-=dt*.8;if(p.life<=0){p.life=1;p.x=-1.25+(Math.random()-.5)*.7;p.z=-.6+(Math.random()-.5)*.3;p.y=.75}p.y+=dt*.5;heatI.put(i,p.x,p.y,p.z,Math.min(1,Pl/2)*.6*p.life,110)}heatI.done();
      const gik=`${s.r}|${s.Iload}|${s.V}`;if(gik!==grIKey){grIKey=gik;grI.redraw((g,w,h)=>plot(g,w,h,{title:"Terminal V against current",xlab:"current 0–5 A",x0:0,x1:5,y0:2.5,y1:4.2,curves:[{f:x=>s.V-x*s.r,col:STRAW}],dot:[s.Iload,Vterm()]}))}
      const ip=(x,y,z)=>tmp.set(ZI.x+x,TOP+y,ZI.z+z);
      lEmf.at(ip(-2.6,1.25,-.6)).set(`Cell emf<b>ε = ${fmt(s.V,2)} V</b>`);lR.at(ip(-1.25,.7,-.6)).set(`Internal resistance<b>r = ${fmt(s.r,2)} Ω</b><small>heat I²r = ${fmt(Pl,2)} W</small>`);
      lVt.at(ip(2.4,1.0,.4)).set(`Terminal V<b>${fmt(Vterm(),2)} V</b><small>lost volts Ir = ${fmt(IL*s.r,2)} V</small>`);lLoad.at(ip(0,.4,1.5)).set(`Load ${fmt(IL,1)} A<small>delivered ${fmt(Pdel(),1)} W</small>`);
      lTemp.at(ip(3.2,.22+spI.scale.y,-1.5)).set(`${fmt(Tph)}°C<small>phone (est.)</small>`);
      // ---- parallel
      loopS.upd(dt,.03+s.Iscreen*.035,true);loopMo.upd(dt,(.03+s.Imodem*.035)*40/60*1.3,true);amR.set(Itot());scrGlowM.emissiveIntensity=.6+s.Iscreen*2.2;
      rings.forEach((r,i)=>{const ph=((t*(.4+s.Imodem*.8)+i/3)%1);r.scale.setScalar(.5+ph*2.2);r.material.opacity=(1-ph)*.6});
      const rp=(x,y,z)=>tmp.set(ZR.x+x,TOP+y,ZR.z+z);
      lVp.at(rp(-2.9,.9,0)).set(`${fmt(s.V,2)} V<small>across each branch</small>`);lIs.at(rp(-.1,1.1,0)).set(`Screen ${fmt(s.Iscreen,2)} A<small>${fmt(s.V/s.Iscreen,2)} Ω</small>`);
      lIm.at(rp(2.3,1.5,0)).set(`Modem ${fmt(s.Imodem,2)} A<small>${fmt(s.V/s.Imodem,2)} Ω</small>`);lIt.at(rp(-1.6,.4,-1.5)).set(`I total = ${fmt(Itot(),2)} A<small>P = ${fmt(Ppar(),2)} W · R = ${fmt(s.V/Itot(),2)} Ω</small>`);
      lFlat.at(rp(-1.5,.32,1.5)).set(`Flat in<b>${fmt(hoursFlat(),1)} h</b>`);
      // ---- wireless
      if(run&&k==="wireless"&&!S.REDUCED)wph+=dt*s.f/140*.5;const ew=emfW(),fall=Math.exp(-s.gap/6);
      const gapY=.28+.2+s.gap*.15;hov.position.y=gapY;
      pCoils.forEach((r,i)=>r.visible=i<Math.min(8,Math.round(s.N/2.5)));
      padCoilM.emissiveIntensity=.6+.6*Math.sin(wph*Math.PI*2*3);
      fieldRings.forEach((r,i)=>{const u=((wph+i/8)%1);r.position.y=.3+u*(gapY-.3);r.scale.setScalar(1.25-u*.55);r.material.opacity=Math.sin(u*Math.PI)*(.35+.65*fall)});
      fluxLines.forEach((f,i)=>{f.ln.scale.y=gapY-.3;f.ln.position.y=.3+(gapY-.3)/2;f.ln.material.opacity=(.2+.5*fall)*(.5+.5*Math.sin(wph*Math.PI*2*3))});
      coilRun.upd(dt,ew*.06,k==="wireless"?run:true);
      const eh=Math.min(2.3,ew/9.2*2.3);emfFill.scale.y=Math.max(.02,eh);emfFill.position.y=.15+eh/2;
      const wp=(x,y,z)=>tmp.set(ZW.x+x,TOP+y,ZW.z+z);
      lPad.at(wp(1.3,.28,.9)).set(`Pad coil<b>${fmt(s.f)} kHz AC</b>`);lCoil.at(wp(-1.2,gapY+.2,0)).set(`Phone coil<b>N = ${s.N}</b>`);
      lGap.at(wp(-1.65,(gapY+.28)/2,.8)).set(`Gap<b>${fmt(s.gap,1)} mm</b><small>drawn bigger than life</small>`);lEmfW.at(wp(2.7,.15+eh,-1.6)).set(`Induced emf<b>≈ ${fmt(ew,1)} V</b><small>efficiency ${Math.round(effW()*100)}% · 50% in ${fmt(tW50()/60)} min</small>`);
      // ---- capacitor
      const frac=s.V?s.vcap/s.V:0,Ik=1-frac;kRun.upd(dt,.02+Ik*.25,k==="capacitor"?run&&frac<.995:false);kRun2.upd(dt,.02+Ik*.25,k==="capacitor"?run&&frac<.995:false);
      const nq=Math.round(frac*100);for(let i=0;i<100;i++){const a=i%10,b=Math.floor(i/10);const y=1.1-.63+b*.14,z=-.63+a*.14;qPlus.put(i,PLX[0]+.07,y,z,i<nq?.045:0);qMinus.put(i,PLX[1]-.07,y,z,i<nq?.045:0)}qPlus.done();qMinus.done();
      for(let i=0;i<25;i++){const a=i%5,b=Math.floor(i/5);const y=1.1-.5+b*.25,z=-.5+a*.25;fLines.putS(i,(PLX[0]+PLX[1])/2,y,z,.008,frac>.02?PLX[1]-PLX[0]-.16:0,.008,qq.setFromUnitVectors(UP,V3(1,0,0)))}fLines.done();fLines.material.opacity=.15+.6*frac;
      const gkk=`${s.C}|${s.R}|${Math.round(s.tcap/tau()*40)}`;if(gkk!==grKKey){grKKey=gkk;const T5=tau()*5;grK.redraw((g,w,h)=>plot(g,w,h,{title:"Capacitor V against time",xlab:"time · 5τ shown",x0:0,x1:T5,y0:0,y1:s.V*1.05,curves:[{f:x=>s.V*(1-Math.exp(-x/tau())),col:STRAW}],marks:[{x:tau(),t:"τ · 63%",col:BLUE}],dot:[Math.min(T5,s.tcap),s.vcap]}))}
      const kp=(x,y,z)=>tmp.set(ZK.x+x,TOP+y,ZK.z+z);
      lTau.at(kp(-1.1,.6,-1.5)).set(`Time constant<b>τ = RC = ${fmt(tau()*1000,1)} ms</b><small>${fmt(s.R)} Ω × ${fmt(s.C)} μF</small>`);lRes.hide();
      lCap.at(kp(1.85,1.95,0)).set(`Capacitor<b>${fmt(s.C)} μF · ${fmt(s.vcap,2)} V now</b>`);lQc.at(kp(1.85,.4,.75)).set(`Q = CV = ${sci(Qcap(),2)} C<small>E = ½CV² = ${sci(Ecap(),2)} J</small>`);
      // ---- test overview
      if(zone==="all"){const items=[[ZP,`Charge Q<b>${fmt(Q())} C</b><small>average P ${fmt(Pavg(),2)} W</small>`,[PXc,2.2,0]],[ZP,`Time to 50%<b>${fmt(t50()/60,1)} min</b>`,[-4,1.2,1.7]],[ZI,`Terminal V<b>${fmt(Vterm(),2)} V</b>`,[0,1.6,0]],[ZK,`Time constant<b>τ = ${fmt(tau()*1000,1)} ms</b>`,[1.8,2,0]],[ZW,`Induced emf<b>${fmt(emfW(),1)} V</b>`,[0,1.4,0]]];
        items.forEach((it,i)=>lAll[i].at(tmp.set(it[0].x+it[2][0],TOP+it[2][1],it[0].z+it[2][2])).set(it[1]))}
    }};
}
StudyKit.mount({kupu:KUPU,caseTint:"sky",scene3d:phone3d,
  eyebrow:"Physics · Electricity and electrical systems", title:"The phone machine", crumb:"NCEA Level 2 Physics AS91173 and Level 3 AS91526", homeHash:"l2",
  fig:"FIG. 25 · A PHONE, ITS BATTERY AND A CHARGER", railTitle:"Charge, energy, current",
  badge:{label:"NCEA L2 91173 · L3 91526",exam:"2026-11-18T14:00:00+13:00",examText:"L2 Wed 18 Nov · L3 Thu 12 Nov"},
  mainBox:"0 0 800 420", mainPhoneBig:true, mainLabel:"A phone on charge: a USB-C charger, a cable with moving charge, a battery bar on the screen and a readout card", closeBox:"0 0 420 260",
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
  truth:"Battery 3 349 mAh at 3.87 V, a 20 W charger and 5.0 h of screen time are the practice pack's figures. The cell model (emf 3.5–4.2 V, internal resistance 0.08 Ω, charger at 4.2 V), the screen and modem currents, the wireless-charging emf and efficiency, and the phone temperature are estimates that show the shape of the physics, not measurements of any real phone. Charging is sped up and the capacitor is slowed down so you can watch them.",
  footer:"Covers AS91173 (L2): charge, current, energy and power (Q = It, E = VQ, P = VI), DC circuits in parallel, and electromagnetic induction (Faraday and Lenz). AS91526 (L3): internal resistance (ε = V + Ir), capacitors (Q = CV, E = ½CV², τ = RC) and the charging curve."
});
})();
