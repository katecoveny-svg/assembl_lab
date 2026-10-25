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
// figure materials: the shared bench recipe (StudyKit.figMat), so this drawing matches the 3D vending machine and the other machines
const FM=StudyKit.figMat,P_BODY=FM("plastic","#232838"),P_SCREEN=FM("glass","#0F1320",{opacity:0.92}),P_BATT=FM("painted","#58D68D"),P_LOW=FM("painted","#F2603F"),P_BRICK=FM("plastic","#E9EDF4"),P_CABLE=FM("rubber","#CDD5E3"),P_PLUG=FM("metal","#B9C5D6"),P_CELL=FM("metal","#AAB4C4"),P_COIL=FM("metal","#C98B63");
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
const INK="var(--ink)",ROSE="var(--rose)",HOT="var(--hot)",SEA="var(--sea)",SUN="var(--sun)",LINE="var(--line)",PAPER="var(--paper)";
function phoneBody(x,y,w,h,soc,label){let o=`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="26" ${P_BODY.attrs} stroke-width="2"/><rect x="${x+8}" y="${y+10}" width="${w-16}" height="${h-20}" rx="20" fill="${P_SCREEN.fill}" fill-opacity=".96"/><path d="M${x+14},${y+40} Q${x+14},${y+16} ${x+40},${y+16}" fill="none" stroke="${P_BODY.hi}" stroke-width="2" stroke-linecap="round" opacity=".7"/>`;
  o+=`<rect x="${x+w/2-24}" y="${y+16}" width="48" height="8" rx="4" fill="#2B3142"/>`;
  const bw=w-70,bx=x+35,by=y+h/2-26;
  o+=`<rect x="${bx}" y="${by}" width="${bw}" height="52" rx="12" fill="#1C2233" stroke="#55607A" stroke-width="2"/><rect x="${bx+bw}" y="${by+16}" width="8" height="20" rx="3" fill="#55607A"/>`;
  const bm=soc>0.2?P_BATT:P_LOW;o+=`<rect x="${bx+5}" y="${by+5}" width="${Math.max(0,(bw-10)*soc)}" height="42" rx="8" fill="${bm.fill}" stroke="${bm.stroke}" stroke-width="1"/><rect x="${bx+9}" y="${by+9}" width="${Math.max(0,(bw-18)*soc)}" height="8" rx="4" fill="${bm.hi}" opacity=".55"/>`;
  o+=`<text x="${x+w/2}" y="${by+90}" text-anchor="middle" style="font:600 22px var(--display);fill:#fff">${Math.round(soc*100)}%</text><text x="${x+w/2}" y="${by+112}" text-anchor="middle" style="font:500 12px var(--mono);fill:#8F9AB5">${esc(label||"")}</text>`;
  return o}
function cable(x0,y0,x1,y1,parts,on){let o=`<path d="M${x0},${y0} C${x0+80},${y0} ${x1-80},${y1} ${x1},${y1}" fill="none" stroke="${P_CABLE.stroke}" stroke-width="7" stroke-linecap="round"/><path d="M${x0},${y0} C${x0+80},${y0} ${x1-80},${y1} ${x1},${y1}" fill="none" stroke="${P_CABLE.fill}" stroke-width="3.5" stroke-linecap="round"/><path d="M${x0},${y0} C${x0+80},${y0} ${x1-80},${y1} ${x1},${y1}" fill="none" stroke="${P_CABLE.hi}" stroke-width="1" stroke-linecap="round" opacity=".7"/>`;
  if(on)parts.forEach(p=>{const t=p.u,mt=1-t;const X=mt*mt*mt*x0+3*mt*mt*t*(x0+80)+3*mt*t*t*(x1-80)+t*t*t*x1,Y=mt*mt*mt*y0+3*mt*mt*t*y0+3*mt*t*t*y1+t*t*t*y1;o+=`<circle cx="${X.toFixed(1)}" cy="${(Y+(p.lane-0.5)*4).toFixed(1)}" r="3.6" fill="${SUN}" stroke="${INK}" stroke-width=".8"/>`});
  return o}
function drawMain(st){const W=800,H=420;let o=`<rect width="${W}" height="${H}" fill="var(--case-soft,var(--chalk))"/>`;
  if(st.k==="internal")return o+drawInternal();if(st.k==="circuit")return o+drawParallel();if(st.k==="wireless")return o+drawWireless();if(st.k==="capacitor")return o+drawCap();
  const charging=["fast","ccv"].includes(st.k)||(st.k==="test");
  o+=`<rect x="60" y="300" width="120" height="70" rx="10" ${P_BRICK.attrs}/><path d="M72,308 H120" stroke="${P_BRICK.hi}" stroke-width="3" stroke-linecap="round"/><text x="120" y="328" text-anchor="middle" class="t-lab">USB-C</text><text x="120" y="350" text-anchor="middle" class="t-big">${fmt(s.Pchg)} W</text><rect x="36" y="318" width="24" height="34" rx="4" ${P_PLUG.attrs}/><path d="M40,322 V348" stroke="${P_PLUG.hi}" stroke-width="2"/>`;
  o+=cable(180,335,330,250,s.parts,charging&&s.playing);
  const soc=charging?s.soc:(st.k==="energy"?Math.max(0.02,1-Math.min(1,s.t/ (s.hours*0.6))):1);
  o+=phoneBody(330,40,200,340,soc,charging?(s.soc>=1?"full":s.soc>0.8?"constant voltage":"constant current"):(st.k==="charge"?`${fmt(s.mAh)} mAh · ${fmt(s.V,2)} V`:`${fmt(Pavg(),1)} W average`));
  // readout card
  o+=`<g transform="translate(560,50)"><rect width="220" height="${st.k==="charge"?200:220}" rx="16" fill="${PAPER}" stroke="${LINE}"/>`;
  if(st.k==="charge")o+=`<text x="16" y="30" class="t-lab">CHARGE STORED, Q = It</text><text x="16" y="58" class="t-ink">${fmt(s.mAh)} mAh = ${fmt(s.mAh/1000,3)} A h</text><text x="16" y="80" class="t-ink">× 3600 s</text><text x="16" y="112" class="t-big">Q = ${fmt(Q())} C</text><text x="16" y="136" class="t-ink">≈ ${sci(Q())} C</text><text x="16" y="168" class="t-ink">${sci(Q()/E_CHARGE,1)} electrons</text>`;
  else if(st.k==="energy")o+=`<text x="16" y="30" class="t-lab">ENERGY, E = VQ</text><text x="16" y="58" class="t-ink">${fmt(s.V,2)} V × ${fmt(Q())} C</text><text x="16" y="90" class="t-big">E = ${sci(E())} J</text><text x="16" y="120" class="t-lab">POWER, P = E ÷ t</text><text x="16" y="146" class="t-ink">${fmt(E()/1000,1)} kJ ÷ (${fmt(s.hours,1)} × 3600 s)</text><text x="16" y="176" class="t-big">P = ${fmt(Pavg(),2)} W</text><text x="16" y="200" class="t-ink">I = P ÷ V = ${fmt(Pavg()/s.V,2)} A</text>`;
  else if(st.k==="fast")o+=`<text x="16" y="30" class="t-lab">HALF A BATTERY, t = E ÷ P</text><text x="16" y="58" class="t-ink">½E = ${fmt(0.5*E()/1000,1)} kJ</text><text x="16" y="80" class="t-ink">P into the cell = ${fmt(s.Pchg)} W × ${Math.round(s.eff*100)}%</text><text x="16" y="112" class="t-big">t = ${fmt(t50()/60,1)} min</text><text x="16" y="140" class="t-ink">"50% in 30 min": ${t50()<=1800?"plausible":"not at this power"}</text><text x="16" y="176" class="t-ink">I into the cell ≈ ${fmt(Ibatt(),1)} A</text><text x="16" y="198" class="t-ink">(P ÷ V at ${fmt(s.V,2)} V)</text>`;
  else o+=`<text x="16" y="30" class="t-lab">CHARGING NOW</text><text x="16" y="58" class="t-ink">cell emf ε = ${fmt(emf(s.soc),2)} V</text><text x="16" y="80" class="t-ink">charger holds ${fmt(VCHG,1)} V</text><text x="16" y="102" class="t-ink">driving pd = ${fmt(VCHG-emf(s.soc),2)} V</text><text x="16" y="134" class="t-big">I = ${fmt(Icc(s.soc),2)} A</text><text x="16" y="160" class="t-ink">${Icc(s.soc)>=Ibatt()-0.01?"limited by the charger (CC)":"= pd ÷ r, falling (CV)"}</text><text x="16" y="192" class="t-ink">${fmt(s.tchg/60)} min · ${Math.round(s.soc*100)}%</text>`;
  o+=`</g>`;return o}
function drawInternal(){const I=s.Iload;let o=`<text x="30" y="36" class="t-lab">THE CELL HAS INTERNAL RESISTANCE r. TERMINAL VOLTAGE V = ε − Ir</text>`;
  // battery symbol with r, load resistor, ammeter
  o+=`<path d="M120,200 H200 M200,170 V230 M216,185 V215 M216,200 H270" stroke="${INK}" stroke-width="3" fill="none"/>`;
  o+=`<rect x="270" y="186" width="70" height="28" rx="4" fill="${PAPER}" stroke="${INK}" stroke-width="2"/><text x="305" y="205" text-anchor="middle" class="t-ink">r = ${fmt(s.r,2)} Ω</text>`;
  o+=`<path d="M340,200 H540 V300 H120 V200" stroke="${INK}" stroke-width="3" fill="none"/>`;
  o+=`<rect x="500" y="236" width="80" height="34" rx="6" fill="${SUN}" stroke="${INK}" stroke-width="2" transform="rotate(90 540 253)"/><text x="590" y="258" class="t-ink">load ${fmt(I,1)} A</text>`;
  o+=`<circle cx="330" cy="300" r="16" fill="${PAPER}" stroke="${INK}" stroke-width="2"/><text x="330" y="305" text-anchor="middle" class="t-ink">A</text>`;
  o+=`<text x="208" y="160" text-anchor="middle" class="t-ink">ε = ${fmt(s.V,2)} V</text>`;
  o+=`<g transform="translate(90,330)"><rect width="620" height="70" rx="14" fill="${PAPER}" stroke="${LINE}"/><text x="16" y="28" class="t-ink">Lost volts Ir = ${fmt(I,1)} × ${fmt(s.r,2)} = ${fmt(I*s.r,2)} V → terminal V = ${fmt(s.V,2)} − ${fmt(I*s.r,2)} = ${fmt(Vterm(),2)} V</text><text x="16" y="54" class="t-ink">Heat in the cell P = I²r = ${fmt(Plost(),2)} W · delivered P = VI = ${fmt(Pdel(),1)} W · efficiency ${fmt(Pdel()/(s.V*I)*100,1)}%</text></g>`;
  // a thermometer for the phone
  const T=22+Plost()*6;o+=`<rect x="690" y="80" width="18" height="150" rx="9" fill="${PAPER}" stroke="${INK}"/><rect x="694" y="${230-Math.min(140,(T-20)*7)}" width="10" height="${Math.min(140,(T-20)*7)}" rx="4" fill="${HOT}"/><text x="699" y="260" text-anchor="middle" class="t-lab">${fmt(T)}°C</text><text x="699" y="66" text-anchor="middle" class="t-lab">PHONE (EST.)</text>`;
  return o}
function drawParallel(){let o=`<text x="30" y="36" class="t-lab">TWO LOADS IN PARALLEL ACROSS THE BATTERY: SAME V, CURRENTS ADD</text>`;
  o+=`<path d="M120,120 V300 M110,180 H130 M114,196 H126 M120,120 H620 M120,300 H620 M400,120 V300 M620,120 V300" stroke="${INK}" stroke-width="3" fill="none"/>`;
  o+=`<rect x="380" y="180" width="40" height="60" rx="6" fill="${SUN}" stroke="${INK}" stroke-width="2"/><text x="440" y="200" class="t-ink">screen</text><text x="440" y="222" class="t-ink">${fmt(s.Iscreen,2)} A · ${fmt(s.V/s.Iscreen,2)} Ω</text>`;
  o+=`<rect x="600" y="180" width="40" height="60" rx="6" fill="${SEA}" stroke="${INK}" stroke-width="2"/><text x="660" y="200" class="t-ink">modem</text><text x="660" y="222" class="t-ink">${fmt(s.Imodem,2)} A · ${fmt(s.V/s.Imodem,2)} Ω</text>`;
  o+=`<circle cx="260" cy="120" r="16" fill="${PAPER}" stroke="${INK}" stroke-width="2"/><text x="260" y="125" text-anchor="middle" class="t-ink">A</text><text x="260" y="98" text-anchor="middle" class="t-ink">${fmt(Itot(),2)} A</text>`;
  o+=`<text x="60" y="190" text-anchor="end" class="t-ink">${fmt(s.V,2)} V</text>`;
  o+=`<g transform="translate(90,330)"><rect width="620" height="70" rx="14" fill="${PAPER}" stroke="${LINE}"/><text x="16" y="28" class="t-ink">I total = ${fmt(s.Iscreen,2)} + ${fmt(s.Imodem,2)} = ${fmt(Itot(),2)} A · P = VI = ${fmt(s.V,2)} × ${fmt(Itot(),2)} = ${fmt(Ppar(),2)} W</text><text x="16" y="54" class="t-ink">Combined R = V ÷ I = ${fmt(s.V/Itot(),2)} Ω (1/R = 1/R₁ + 1/R₂) · flat in ${fmt(s.mAh/1000,3)} A h ÷ ${fmt(Itot(),2)} A = ${fmt(hoursFlat(),1)} h</text></g>`;
  return o}
function drawWireless(){let o=`<text x="30" y="36" class="t-lab">A QI PAD: AN ALTERNATING CURRENT IN THE PAD COIL MAKES A CHANGING FIELD; THE PHONE COIL FEELS AN INDUCED EMF</text>`;
  const gapPx=12+s.gap*8;
  o+=`<rect x="150" y="${250}" width="300" height="24" rx="8" ${P_BRICK.attrs}/>`;
  for(let i=0;i<6;i++)o+=`<ellipse cx="300" cy="262" rx="${40+i*18}" ry="${5+i*2}" fill="none" stroke="${P_COIL.fill}" stroke-width="2.2"/>`;
  o+=`<rect x="170" y="${250-gapPx-110}" width="260" height="110" rx="20" ${P_BODY.attrs} stroke-width="2"/>`;
  for(let i=0;i<Math.min(8,Math.round(s.N/2.5));i++)o+=`<ellipse cx="300" cy="${250-gapPx-18}" rx="${30+i*12}" ry="${4+i*1.4}" fill="none" stroke="${P_COIL.hi}" stroke-width="2"/>`;
  const ph=s.playing?s.t*s.f/20:0;for(let i=0;i<5;i++){const y=262-((i*22+ph*10)%110);o+=`<path d="M${240-i*8},${y} Q300,${y-14} ${360+i*8},${y}" fill="none" stroke="${SUN}" stroke-width="2" opacity="${0.9-i*0.15}"/>`}
  o+=`<text x="300" y="300" text-anchor="middle" class="t-ink">pad coil · ${fmt(s.f)} kHz</text><text x="470" y="${250-gapPx-50}" class="t-ink">phone coil · N = ${s.N}</text><text x="470" y="${250-gapPx/2+4}" class="t-ink">gap ${fmt(s.gap)} mm</text>`;
  o+=`<g transform="translate(90,330)"><rect width="620" height="70" rx="14" fill="${PAPER}" stroke="${LINE}"/><text x="16" y="28" class="t-ink">Faraday: ε = −N ΔΦ ÷ Δt. Model emf ≈ ${fmt(emfW(),1)} V (more turns, higher frequency, smaller gap → bigger)</text><text x="16" y="54" class="t-ink">Efficiency ≈ ${Math.round(effW()*100)}% (estimate) · 50% charge at ${fmt(Math.min(15,s.Pchg))} W pad: ${fmt(tW50()/60)} min</text></g>`;
  return o}
function drawCap(){let o=`<text x="30" y="36" class="t-lab">A CAPACITOR ON THE PHONE'S POWER RAIL CHARGES THROUGH R: V = V₀(1 − e^(−t/RC))</text>`;
  o+=`<path d="M120,120 V300 M110,180 H130 M114,196 H126 M120,120 H330 M120,300 H620 M620,120 V300 M400,120 H620" stroke="${INK}" stroke-width="3" fill="none"/>`;
  o+=`<rect x="330" y="106" width="70" height="28" rx="4" fill="${PAPER}" stroke="${INK}" stroke-width="2"/><text x="365" y="125" text-anchor="middle" class="t-ink">${fmt(s.R)} Ω</text>`;
  o+=`<rect x="600" y="190" width="40" height="40" fill="var(--chalk)"/><path d="M606,190 H634 M606,230 H634" stroke="${P_CELL.stroke}" stroke-width="6"/><path d="M606,189 H634 M606,229 H634" stroke="${P_CELL.hi}" stroke-width="1.5"/><text x="660" y="214" class="t-ink">${fmt(s.C)} μF</text>`;
  const frac=s.V?s.vcap/s.V:0;o+=`<rect x="606" y="${230-36*frac}" width="28" height="${36*frac}" fill="${SUN}" opacity=".8"/>`;
  o+=`<text x="60" y="190" text-anchor="end" class="t-ink">${fmt(s.V,2)} V</text>`;
  o+=`<g transform="translate(90,330)"><rect width="620" height="70" rx="14" fill="${PAPER}" stroke="${LINE}"/><text x="16" y="28" class="t-ink">τ = RC = ${fmt(s.R)} × ${sci(s.C*1e-6,2)} = ${fmt(tau()*1000,1)} ms · at t = τ the capacitor is at 63% · Q = CV = ${sci(Qcap(),2)} C</text><text x="16" y="54" class="t-ink">Energy stored E = ½CV² = ½ × ${sci(s.C*1e-6,2)} × ${fmt(s.V,2)}² = ${sci(Ecap(),2)} J · now ${fmt(s.vcap,2)} V at t = ${fmt(s.tcap*1000)} ms</text></g>`;
  return o}
function drawClose(st){const w=420,h=260;let o="";
  if(st.k==="ccv"||st.k==="fast"){// current and voltage against charge
    o+=`<text class="t-lab" x="14" y="22">CHARGING CURVE · CURRENT AND CELL VOLTAGE AGAINST CHARGE</text>`;
    const X=f=>46+f*340,Yi=i=>220-i/Math.max(1,Ibatt())*150,Yv=v=>220-(v-3.4)/0.9*150;
    o+=`<line x1="46" x2="386" y1="220" y2="220" stroke="${ROSE}"/><line x1="46" x2="46" y1="60" y2="220" stroke="${ROSE}"/>`;
    let di="",dv="";for(let i=0;i<=100;i++){const f=i/100;di+=(i?"L":"M")+X(f).toFixed(1)+","+Yi(Icc(f)).toFixed(1);dv+=(i?"L":"M")+X(f).toFixed(1)+","+Yv(emf(f)).toFixed(1)}
    o+=`<path d="${di}" fill="none" stroke="${HOT}" stroke-width="2.4"/><path d="${dv}" fill="none" stroke="${SEA}" stroke-width="2.4" stroke-dasharray="5 4"/>`;
    o+=`<circle cx="${X(s.soc)}" cy="${Yi(Icc(s.soc))}" r="6" fill="${SUN}" stroke="${INK}"/>`;
    o+=`<text class="t-lab" x="14" y="${Yi(Ibatt())+4}" fill="${HOT}">I</text><text class="t-lab" x="14" y="${Yv(4.2)+4}">V</text><text class="t-lab" x="386" y="238" text-anchor="end">CHARGE (0 → 100%)</text>`;
    o+=`<text class="t-ink" x="54" y="46">current (solid) · cell emf (dashed) · r = ${fmt(s.r,2)} Ω</text>`;return o}
  if(st.k==="capacitor"){o+=`<text class="t-lab" x="14" y="22">CAPACITOR VOLTAGE AGAINST TIME</text>`;const T=tau()*5,X=t=>46+t/T*340,Y=v=>220-v/s.V*150;
    o+=`<line x1="46" x2="386" y1="220" y2="220" stroke="${ROSE}"/><line x1="46" x2="46" y1="60" y2="220" stroke="${ROSE}"/>`;let d="";for(let i=0;i<=100;i++){const t=i/100*T;d+=(i?"L":"M")+X(t).toFixed(1)+","+Y(s.V*(1-Math.exp(-t/tau()))).toFixed(1)}
    o+=`<path d="${d}" fill="none" stroke="${HOT}" stroke-width="2.4"/><line x1="${X(tau())}" x2="${X(tau())}" y1="60" y2="220" stroke="${SEA}" stroke-dasharray="4 4"/><text class="t-lab" x="${X(tau())+4}" y="74">τ = ${fmt(tau()*1000,1)} ms · 63%</text>`;
    o+=`<circle cx="${X(Math.min(T,s.tcap))}" cy="${Y(s.vcap)}" r="6" fill="${SUN}" stroke="${INK}"/><text class="t-lab" x="386" y="238" text-anchor="end">TIME · 5τ SHOWN</text>`;return o}
  if(st.k==="internal"){o+=`<text class="t-lab" x="14" y="22">TERMINAL VOLTAGE AGAINST CURRENT · V = ε − Ir</text>`;const X=i=>46+i/5*340,Y=v=>220-(v-2.5)/1.7*150;
    o+=`<line x1="46" x2="386" y1="220" y2="220" stroke="${ROSE}"/><line x1="46" x2="46" y1="60" y2="220" stroke="${ROSE}"/><line x1="${X(0)}" y1="${Y(s.V)}" x2="${X(5)}" y2="${Y(s.V-5*s.r)}" stroke="${HOT}" stroke-width="2.4"/>`;
    o+=`<circle cx="${X(s.Iload)}" cy="${Y(Vterm())}" r="6" fill="${SUN}" stroke="${INK}"/><text class="t-lab" x="52" y="${Y(s.V)-8}">INTERCEPT = ε = ${fmt(s.V,2)} V</text><text class="t-lab" x="386" y="238" text-anchor="end">CURRENT (0–5 A)</text><text class="t-ink" x="200" y="160">gradient = −r = −${fmt(s.r,2)} Ω</text>`;return o}
  if(st.k==="wireless"){o+=`<text class="t-lab" x="14" y="22">INDUCED EMF AGAINST GAP (THIS MODEL)</text>`;const X=g=>46+g/8*340,Y=e=>220-e/8*150;let d="";for(let i=0;i<=80;i++){const g=i/10;d+=(i?"L":"M")+X(g).toFixed(1)+","+Y(0.0023*s.N*s.f*Math.exp(-g/6)).toFixed(1)}
    o+=`<line x1="46" x2="386" y1="220" y2="220" stroke="${ROSE}"/><line x1="46" x2="46" y1="60" y2="220" stroke="${ROSE}"/><path d="${d}" fill="none" stroke="${HOT}" stroke-width="2.4"/><circle cx="${X(s.gap)}" cy="${Y(emfW())}" r="6" fill="${SUN}" stroke="${INK}"/><text class="t-lab" x="386" y="238" text-anchor="end">GAP (0–8 mm)</text>`;return o}
  // charge / energy / circuit: an energy ladder
  o+=`<text class="t-lab" x="14" y="22">${st.k==="circuit"?"HOURS TO FLAT AGAINST TOTAL CURRENT":"THE NUMBERS, IN ORDER"}</text>`;
  if(st.k==="circuit"){const X=i=>46+i/4*340,Y=h=>220-Math.min(1,h/10)*150;let d="";for(let i=1;i<=80;i++){const I=i/20;d+=(i>1?"L":"M")+X(I).toFixed(1)+","+Y(s.mAh/1000/I).toFixed(1)}
    o+=`<line x1="46" x2="386" y1="220" y2="220" stroke="${ROSE}"/><line x1="46" x2="46" y1="60" y2="220" stroke="${ROSE}"/><path d="${d}" fill="none" stroke="${HOT}" stroke-width="2.4"/><circle cx="${X(Itot())}" cy="${Y(hoursFlat())}" r="6" fill="${SUN}" stroke="${INK}"/><text class="t-lab" x="386" y="238" text-anchor="end">CURRENT (0–4 A) · 10 h AT THE TOP</text>`;return o}
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
StudyKit.mount({kupu:KUPU,caseTint:"sky",
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
