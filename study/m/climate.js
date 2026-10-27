(()=>{
// The climate machine: Years 9–10 science (Earth systems, energy, the carbon cycle and human impacts), with a bridge to
// NCEA Level 2 Earth and Space Science AS 91193. Two rigs on one bench, run by one small illustrative model:
//  - an Earth energy rig: a lamp (the Sun), a slice of planet in a frosted case with eight surface tiles you can swap
//    (ice, ocean, forest, farmland, city), clouds, a greenhouse-gas blanket on steel posts, and a thermometer;
//  - a carbon rig: four linked tanks (atmosphere, ocean, plants and soil, fossil carbon) with copper pipes and valves.
// The atmosphere tank sets the CO₂ in the blanket, so burning fossil fuels warms the slice. It is a teaching model and
// never a forecast: TRUTH (the footer) says what is simplified, and every real number below carries its source.

// ---------------------------------------------------------------- constants (sources in TRUTH)
const SIG=5.670374e-8, TK=273.15;
const S0=340;                       // NASA Earth Observatory: about 340 W/m² of sunlight arrives, averaged over the planet
const A_CLOUD=0.5;                  // a cloud reflects half the light that hits it (Penn State EARTH 103 lists clouds at 0.5 to 0.9)
const ALB={ice:0.70,ocean:0.06,forest:0.12,farm:0.20,city:0.18}; // Penn State EARTH 103 and CU Boulder MOSAiC; city 0.01–0.02 below cropland (Ouyang et al. 2022)
const TYPES=["ice","ocean","forest","farm","city"];
const NAME={ice:"Ice",ocean:"Ocean",forest:"Forest",farm:"Farmland",city:"City"};
const DEF_TILES=["ice","ocean","ocean","forest","ocean","farm","ocean","ocean"];
const PPM_GTC=2.124;                // Global Carbon Budget 2025: 1 ppm of CO₂ = 2.124 GtC
const PPM0=425.6;                   // Global Carbon Budget 2025: global CO₂ in 2025 (preliminary)
const A0=PPM0*PPM_GTC;              // ≈ 904 GtC in the air at the start
const A_PRE=591;                    // IPCC AR6 WG1 Fig 5.12: pre-industrial atmosphere store
const F2X=3.93, FLN=F2X/Math.LN2;   // IPCC AR6 WG1 ch 7: forcing from doubled CO₂ 3.93 W/m², scaled with the usual log rule
const T_REF=15;                     // NASA: Earth's surface is about 15 °C on average; the default slice is tuned to settle there
const HALF_OUT=SIG*Math.pow(T_REF+TK,4)/2;   // 195 W/m²: how much outgoing infrared one unit of blanket blocks
const KWV=1.30/HALF_OUT;            // water-vapour (+ lapse-rate) feedback, IPCC AR6 Table 7.10: 1.30 W/m² per °C
const CH=8;                         // heat capacity of the slice, W·yr/m² per °C (illustrative: it settles in a few model years)
const MELT_W=16;                    // with the feedback on, the ice tile melts between 15 and 31 °C (exaggerated so you can see it)
const K_OC=3.2/(A0-A_PRE), K_LD=2.4/(A0-A_PRE);  // GCB 2025, 2015–2024: ocean sink 3.2, land sink 2.4 GtC a year
const DEF={cloud:0.4,f:10,c:1.3,p:0,q:0,O:38000,L:2150,F:928};
// DEF: fossil 10 (GCB 2025: 10.3 GtC in 2024), clearing 1.3 (GCB 2025: land-use change 1.3 GtC in 2024);
// stores from IPCC AR6 WG1 Fig 5.12: ocean 900 + 37,100, vegetation 450 + soils 1,700, fossil reserves 580 + 230 + 118
const SPEED=5;                      // model years a second while playing
const TILE_N=8;
// NOAA GML Mauna Loa annual mean CO₂ (ppm), 1959–2025 (data from 1958 to 1974 by C. D. Keeling, Scripps)
const MLO=[315.98,316.91,317.64,318.45,318.99,319.62,320.04,321.37,322.18,323.05,324.62,325.68,326.32,327.46,329.68,330.19,331.13,332.03,333.84,335.41,336.84,338.76,340.12,341.48,343.15,344.87,346.35,347.61,349.31,351.69,353.2,354.45,355.7,356.54,357.21,358.96,360.97,362.74,363.88,366.84,368.54,369.71,371.32,373.45,375.98,377.7,379.98,382.09,384.02,385.83,387.64,390.1,391.85,394.06,396.74,398.81,401.01,404.41,406.76,408.72,411.65,414.21,416.41,418.53,421.08,424.61,427.35];
// Ministry for the Environment, New Zealand's Greenhouse Gas Inventory 1990–2024 (April 2026), Snapshot
const NZ={gross:75.8,net:54.8,forest:21.0,forestPct:28,
  sector:[["Agriculture",53,"#96C94E"],["Energy (incl. transport)",38,"#F49A5E"],["Industry and waste (the rest)",9,"#B9A3EA"]],
  gas:[["Methane",48,"#7FC4A8"],["Carbon dioxide",41,"#5A6596"],["Nitrous oxide",9,"#E8688A"],["Other gases (the rest)",2,"#CBD3DD"]]};

// ---------------------------------------------------------------- model state
const s={tiles:DEF_TILES.slice(),ic:[],tsel:0,cloud:DEF.cloud,gh:true,fb:false,A:A0,O:DEF.O,L:DEF.L,F:DEF.F,f:DEF.f,c:DEF.c,p:DEF.p,q:DEF.q,
  T:T_REF,yr:0,hist:[],histAcc:0,nzv:"sector"};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const icFixed=t=>t==="ice"?1:0;
function setTile(i,t){s.tiles[i]=t;s.ic[i]=icFixed(t)}
function tileAlb(i){const t=s.tiles[i],ic=s.ic[i]||0;const under=(t==="ice"||t==="ocean")?ALB.ocean:ALB[t];return ic*ALB.ice+(1-ic)*under}
const surfAlb=()=>{let a=0;for(let i=0;i<TILE_N;i++)a+=tileAlb(i);return a/TILE_N};
const alb=()=>s.cloud*A_CLOUD+(1-s.cloud)*surfAlb();
const ppm=()=>s.A/PPM_GTC;
const surfIR=T=>SIG*Math.pow(T+TK,4);
let EPS0=0.78;
function eps(T){if(!s.gh)return 0;return clamp(EPS0+FLN*Math.log(Math.max(ppm(),1)/PPM0)/HALF_OUT+KWV*(T-T_REF),0,0.97)}
function flows(){const T=s.T,e=eps(T),ir=surfIR(T),a=alb(),abs=S0*(1-a),out=(1-e/2)*ir;
  return {alb:a,refl:S0*a,abs,ir,eps:e,gas:e*ir,back:e*ir/2,win:(1-e)*ir,up:e*ir/2,out,N:abs-out}}
const sinkO=()=>K_OC*(s.A-A_PRE), sinkL=()=>K_LD*(s.A-A_PRE);
const fos=()=>s.F>0?s.f:0;
const netA=()=>fos()+s.c-s.p-s.q-sinkO()-sinkL();
function iceLeft(){let n=0,v=0;for(let i=0;i<TILE_N;i++)if(s.tiles[i]==="ice"){n++;v+=s.ic[i]}return n?v/n:null}
function resetAll(){s.tiles=DEF_TILES.slice();s.ic=s.tiles.map(icFixed);s.tsel=0;s.cloud=DEF.cloud;s.gh=true;s.fb=false;
  s.A=A0;s.O=DEF.O;s.L=DEF.L;s.F=DEF.F;s.f=DEF.f;s.c=DEF.c;s.p=DEF.p;s.q=DEF.q;s.T=T_REF;s.yr=0;s.hist=[];s.histAcc=0}
resetAll();
EPS0=2*(1-S0*(1-alb())/surfIR(T_REF));   // tune the blanket so today's slice is in balance at 15 °C
// one model step of h years: the surface warms or cools by the energy imbalance; ice follows temperature (feedback on);
// the carbon flows move carbon between the four stores (only when the carbon rig is running)
function advance(h,runC){
  const fl=flows();s.T=clamp(s.T+fl.N/CH*h,-80,80);
  const k=Math.min(1,h/6);
  for(let i=0;i<TILE_N;i++){const t=s.tiles[i];let tg=icFixed(t);
    if(s.fb){if(t==="ice")tg=clamp(1-(s.T-T_REF)/MELT_W,0,1);else if(t==="ocean")tg=clamp(-s.T/12,0,1)}
    s.ic[i]+=(tg-s.ic[i])*k}
  if(runC){const fo=fos(),so=sinkO(),sl=sinkL();
    s.A=Math.max(1,s.A+(fo+s.c-s.p-s.q-so-sl)*h);s.O+=so*h;s.L+=(sl-s.c+s.p)*h;s.F=Math.max(0,s.F+(s.q-fo)*h);s.yr+=h}
  s.histAcc+=h;if(s.histAcc>=1){s.histAcc-=1;s.hist.push({T:s.T,A:s.A});if(s.hist.length>160)s.hist.shift()}
}
// ---------------------------------------------------------------- formatting
const fmt=(x,d=0)=>{let v=Number(x);if(!isFinite(v))v=0;if(Math.abs(v)<0.5*Math.pow(10,-d))v=0;return v.toLocaleString("en-NZ",{maximumFractionDigits:d,minimumFractionDigits:d})};
const sg=(x,d=1)=>{const m=Math.pow(10,d),v=Math.round(x*m)/m;return (v>0?"+":v<0?"−":"")+fmt(Math.abs(v),d)};
const balWord=N=>Math.abs(N)<0.3?"balanced":N>0?"warming":"cooling";
const pct=x=>Math.round(x*100)+"%";
const esc=StudyKit.esc;

// ---------------------------------------------------------------- the drawings (SVG fallback, the bench figure look)
const F=StudyKit.fig,PAL=F.palette,TINT=PAL.case.sky,INK="#3E4A7C";
const SUNC="#F2C83C",IRC=PAL.product.strawberry,GASC="#B9A3EA",AIRC="#8E8AB8";
const TCOL={ice:"#F4FAFF",ocean:"#7FB7E8",forest:"#6FB36A",farm:"#BFE3A6",city:"#C9C3D8"};
function arw(x1,y1,x2,y2,w,c,wavy){const dx=x2-x1,dy=y2-y1,L=Math.hypot(dx,dy)||1,ux=dx/L,uy=dy/L,hl=Math.max(9,w*1.5),hx=x2-ux*hl,hy=y2-uy*hl,nx=-uy,ny=ux,hw=Math.max(6,w*1.05);
  let d=`M${x1.toFixed(1)},${y1.toFixed(1)}`;
  if(wavy){const n=Math.max(3,Math.round(L/16));for(let k=1;k<=n;k++){const t=k/n,tm=(k-.5)/n,a=(k%2?1:-1)*5;d+=` Q${(x1+(hx-x1)*tm+nx*a).toFixed(1)},${(y1+(hy-y1)*tm+ny*a).toFixed(1)} ${(x1+(hx-x1)*t).toFixed(1)},${(y1+(hy-y1)*t).toFixed(1)}`}}
  else d+=` L${hx.toFixed(1)},${hy.toFixed(1)}`;
  return `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w.toFixed(1)}" stroke-linecap="round" opacity=".92"/><path d="M${x2.toFixed(1)},${y2.toFixed(1)} L${(hx+nx*hw).toFixed(1)},${(hy+ny*hw).toFixed(1)} L${(hx-nx*hw).toFixed(1)},${(hy-ny*hw).toFixed(1)}Z" fill="${c}"/>`}
const Wd=x=>Math.max(2,x/340*15);
function tag(x,y,t,anchor){return `<text class="t-ink" x="${x}" y="${y}"${anchor?` text-anchor="${anchor}"`:""}>${t}</text>`}
function drawEnergy(st){
  const fl=flows();let o=F.floor(640,330);
  const x0=150,cw=320,cy=238,chh=54,tw=cw/TILE_N;
  // the slice of planet: a frosted case with crust, mantle and a warm core band inside
  o+=F.acrylic(x0,cy,cw,chh,{tint:TINT,d:14,r:8,shadowLen:26});
  [["#E8899A",cy+38,10],["#F4B9A0",cy+22,16],["#C9C3D8",cy+8,14]].forEach(([c,y,h])=>o+=`<rect x="${x0+6}" y="${y}" width="${cw-12}" height="${h}" rx="3" fill="${c}" opacity=".85"/>`);
  for(let i=0;i<TILE_N;i++){const x=x0+i*tw,t=s.tiles[i],ic=s.ic[i]||0,base=(t==="ice"||t==="ocean")?TCOL.ocean:TCOL[t];
    o+=F.box(x+2,cy-12,tw-4,10,{colour:base,kind:"plastic",d:7,r:2,shadow:false});
    if(ic>0.01){const w=(tw-4)*ic;o+=`<rect x="${(x+2+(tw-4-w)/2).toFixed(1)}" y="${cy-14}" width="${w.toFixed(1)}" height="10" rx="2" fill="#fff" stroke="#AFC6DA" stroke-width=".9"/>`}
    if(t==="forest")for(let k=0;k<3;k++)o+=`<path d="M${x+9+k*10},${cy-12} l5,-13 l5,13z" fill="#4E9A58" stroke="#3B7A45" stroke-width=".8"/>`;
    if(t==="city")for(let k=0;k<3;k++){const h=8+((k*7+i)%3)*5;o+=`<rect x="${x+7+k*10}" y="${cy-12-h}" width="8" height="${h}" fill="#B3ADC8" stroke="#8E88A8" stroke-width=".8"/>`}
    if(t==="farm")o+=`<rect x="${x+12}" y="${cy-18}" width="12" height="6" rx="2" fill="#fff" stroke="#8F9BAA" stroke-width=".8"/>`;
    if(i===s.tsel&&st.k!=="infrared"&&st.k!=="blanket")o+=`<rect x="${x+1}" y="${cy-16}" width="${tw-2}" height="16" rx="3" fill="none" stroke="var(--acc)" stroke-width="2"/>`;
    o+=`<text class="t-lab" x="${(x+tw/2).toFixed(1)}" y="${cy+chh+16}" text-anchor="middle">${i+1}</text>`}
  // the lamp (the Sun)
  o+=`<path d="M58,300 V88" stroke="#8F9BAA" stroke-width="4"/><ellipse cx="58" cy="302" rx="22" ry="6" fill="#CBD3DD" stroke="#8F9BAA"/>`;
  o+=`<circle cx="66" cy="70" r="34" fill="${SUNC}" opacity=".22"/><circle cx="66" cy="70" r="20" fill="${SUNC}" stroke="#C9A12A"/>`;
  // clouds
  const nC=Math.round(s.cloud*5),cx=[200,262,324,386,448];
  for(let k=0;k<nC;k++)o+=`<g fill="#fff" stroke="#C9D4E3" stroke-width="1"><ellipse cx="${cx[k]}" cy="178" rx="22" ry="9"/><ellipse cx="${cx[k]-10}" cy="172" rx="11" ry="8"/><ellipse cx="${cx[k]+8}" cy="170" rx="13" ry="9"/></g>`;
  // the greenhouse-gas blanket
  const bt=s.gh?6+70*Math.max(0,fl.eps-.6):0,by=104;
  if(s.gh){o+=`<rect x="128" y="${by}" width="364" height="${bt.toFixed(1)}" rx="5" fill="${GASC}" fill-opacity=".38" stroke="#8C76C9" stroke-width="1.1"/>`;
    const nm=Math.round(ppm()/30);for(let k=0;k<nm;k++){const mx=136+((k*53)%348),my=by+3+((k*29)%Math.max(2,bt-6));o+=`<circle cx="${mx}" cy="${my.toFixed(1)}" r="1.8" fill="#4A4F6A"/>`}
    o+=`<text class="t-lab" x="134" y="${by-6}">GREENHOUSE GASES · CO₂ ${fmt(ppm())} ppm</text>`}
  else o+=`<text class="t-lab" x="134" y="${by-6}">NO GREENHOUSE GASES</text>`;
  // the flows, drawn to scale (width ∝ W/m²)
  o+=arw(92,86,244,cy-18,Wd(S0),SUNC)+tag(98,126,`${S0} in`,"end");
  o+=arw(286,cy-18,330,24,Wd(fl.refl),"#C9CEDF")+tag(322,40,`${fmt(fl.refl)} reflected`,"end");
  const top=s.gh?by:24;
  o+=arw(400,cy-18,400,s.gh?by+bt+4:24,Wd(fl.ir),IRC,true)+tag(410,cy-46,`${fmt(fl.ir)} infrared`);
  if(s.gh){o+=arw(440,by-2,440,24,Wd(fl.out),IRC,true)+tag(450,40,`${fmt(fl.out)} to space`);
    o+=arw(360,by+bt+4,360,cy-18,Wd(fl.back),IRC,true)+tag(352,by+bt+30,`${fmt(fl.back)} back down`,"end")}
  // the thermometer
  const tf=clamp((s.T+40)/85,0,1);o+=F.tube(548,48,22,232,tf,{tint:TINT,fill:IRC,shadow:false});
  for(let T=-40;T<=40;T+=20){const y=280-(T+40)/85*232;o+=`<path d="M572,${y.toFixed(1)} h7" stroke="#8F9BAA"/><text class="t-lab" x="583" y="${(y+3.5).toFixed(1)}">${T}°</text>`}
  o+=`<text class="t-big" x="559" y="40" text-anchor="middle">${fmt(s.T,1)}°C</text>`;
  if(st.k==="test"||st.k==="feedback"){const il=iceLeft();o+=`<text class="t-ink" x="624" y="312" text-anchor="end">${il==null?"no ice tiles":"ice left "+pct(il)}${st.k==="test"?` · air ${fmt(ppm())} ppm`:""}</text>`}
  o+=`<text class="t-lab" x="16" y="22">A SLICE OF PLANET UNDER A LAMP · W/m²</text><text class="t-ink" x="624" y="22" text-anchor="end">IN − OUT ${sg(fl.N)} W/m² · ${balWord(fl.N)}</text>`;
  return o}
function drawCarbon(){let o=F.floor(640,330);
  // [name, x, y, w, h, fill, colour, value, label x, label y, anchor]
  const T=[["ATMOSPHERE",272,66,92,80,clamp(s.A/2400,0,1),AIRC,s.A,374,86,"start"],["OCEAN",40,176,116,92,.82,PAL.product.blueberry,s.O,98,306,"middle"],
    ["PLANTS AND SOIL",482,178,104,90,clamp(s.L/DEF.L*.75,0,1),"#B98A5A",s.L,534,306,"middle"],["FOSSIL CARBON",276,240,84,34,clamp(s.F/DEF.F*.9,0,1),"#4A4F6A",s.F,318,306,"middle"]];
  const so=sinkO(),sl=sinkL();
  // the flows first, so the tanks sit over them (arrow width ∝ GtC a year)
  if(fos()>0)o+=arw(300,224,300,170,Wd(fos()*18),"#4A4F6A")+tag(292,206,`burn ${fmt(fos(),1)}`,"end");
  if(s.q>0)o+=arw(340,170,340,224,Wd(s.q*18),GASC)+tag(348,206,`capture ${fmt(s.q,1)}`);
  if(so>0)o+=arw(270,126,150,188,Wd(so*18),PAL.product.blueberry)+tag(196,138,`ocean ${fmt(so,1)}`,"end");
  o+=arw(366,132,490,196,Wd((sl+s.p)*18),"#7DB55A")+tag(430,178,`plants ${fmt(sl+s.p,1)}`,"end");
  if(s.c>0)o+=arw(552,172,374,112,Wd(s.c*18),PAL.product.peach)+tag(482,118,`clearing ${fmt(s.c,1)}`);
  T.forEach(([n,x,y,w,h,f,c,v,lx,ly,an])=>{o+=F.tube(x,y,w,h,f,{tint:PAL.case.mint,fill:c});o+=`<text class="t-lab" x="${lx}" y="${ly}" text-anchor="${an}">${n}</text><text class="t-ink" x="${lx}" y="${ly+14}" text-anchor="${an}">${fmt(v)} GtC</text>`});
  const yPre=66+80-80*(A_PRE/2400);o+=`<path d="M268,${yPre.toFixed(1)} h100" stroke="#8F9BAA" stroke-dasharray="3 3"/><text class="t-lab" x="374" y="${(yPre+3.5).toFixed(1)}">1750 LEVEL</text>`;
  o+=`<text class="t-lab" x="16" y="22">CARBON STORES (GtC) AND FLOWS (GtC A YEAR) · MODEL YEAR ${sg(s.yr,0)}</text><text class="t-ink" x="624" y="22" text-anchor="end">air ${fmt(ppm())} ppm · ${sg(netA())} GtC a year</text>`;
  o+=`<text class="t-lab" x="16" y="38">TANKS NOT TO SCALE: THE OCEAN HOLDS ABOUT 40 TIMES THE AIR'S CARBON</text>`;
  return o}
function drawNZ(){let o=F.floor(640,330);
  const bar=(y,rows,title,on)=>{let x=40,small=0,g=`<text class="t-lab" x="40" y="${y-12}">${title}</text>`;
    rows.forEach(([n,v,c],i)=>{const w=560*v/100;g+=F.box(x,y,w-2,26,{colour:c,kind:"painted",d:8,r:2,shadow:i===rows.length-1});
      if(w>70)g+=`<text class="t-ink" x="${(x+6).toFixed(1)}" y="${y+46}">${esc(n)}</text><text class="t-big" x="${(x+6).toFixed(1)}" y="${y+18}" style="fill:#222A55">${v}%</text>`;
      else{g+=`<text class="t-ink" x="${(x+w-2).toFixed(1)}" y="${y+62+small*14}" text-anchor="end">${esc(n)} ${v}%</text>`;small++}x+=w});
    if(on)g+=`<rect x="34" y="${y-6}" width="574" height="38" rx="8" fill="none" stroke="var(--acc)" stroke-width="1.6"/>`;return g};
  o+=bar(78,NZ.sector,"BY SECTOR",s.nzv==="sector")+bar(184,NZ.gas,"BY GAS",s.nzv==="gas");
  o+=`<text class="t-lab" x="16" y="22">AOTEAROA, 2024 · GROSS EMISSIONS ${NZ.gross} Mt CO₂-e</text><text class="t-body" x="40" y="286">Forests took up ${fmt(NZ.forest,1)} Mt (${NZ.forestPct}% of gross), so net emissions were ${NZ.net} Mt.</text><text class="t-lab" x="40" y="312">SOURCE: MINISTRY FOR THE ENVIRONMENT, GREENHOUSE GAS INVENTORY 1990–2024</text>`;
  return o}
function drawMain(st0,st){if(st.k==="carbon")return drawCarbon();if(st.k==="nz")return drawNZ();return drawEnergy(st)}
// the close-up: the energy books, real CO₂ measurements, or the gases' lifetimes
function books(o,y0){const fl=flows(),sc=280/400;
  o+=`<text class="t-lab" x="14" y="${y0}">THE ENERGY BOOKS (MODEL, W/m²)</text>`;
  const row=(y,lab,v,c)=>`<text class="t-ink" x="14" y="${y+12}">${lab}</text><rect x="120" y="${y}" width="280" height="16" rx="4" fill="#fff" stroke="#DCD6EA"/><rect x="120" y="${y}" width="${Math.max(1,v*sc).toFixed(1)}" height="16" rx="4" fill="${c}" stroke="${F.mat("painted",c).stroke}" stroke-width=".8"/><text class="t-ink" x="${(126+Math.min(270,v*sc)).toFixed(1)}" y="${y+12}">${fmt(v)}</text>`;
  o+=row(y0+12,"Sunlight in",S0,"#FBE6A0")+row(y0+34,"Absorbed",fl.abs,SUNC)+row(y0+56,"Infrared out",fl.out,IRC);
  o+=`<text class="t-big" x="14" y="${y0+96}">In − out: ${sg(fl.N)} W/m² · ${balWord(fl.N)}</text>`;return o}
function spark(o,y0,h){const H=s.hist.slice(-80);o+=`<text class="t-lab" x="14" y="${y0}">SURFACE TEMPERATURE, LAST ${Math.max(H.length,1)} MODEL YEARS</text>`;
  if(H.length<2)return o+`<text class="t-body" x="14" y="${y0+24}">Press Play to see it change.</text>`;
  let lo=Math.min(...H.map(p=>p.T)),hi=Math.max(...H.map(p=>p.T));if(hi-lo<2){const m=(hi+lo)/2;lo=m-1;hi=m+1}
  const X=i=>40+i/(H.length-1)*360,Y=T=>y0+10+(1-(T-lo)/(hi-lo))*h;
  o+=`<text class="t-lab" x="34" y="${(Y(hi)+4).toFixed(1)}" text-anchor="end">${fmt(hi,0)}°</text><text class="t-lab" x="34" y="${(Y(lo)+4).toFixed(1)}" text-anchor="end">${fmt(lo,0)}°</text><line x1="40" x2="400" y1="${Y(lo).toFixed(1)}" y2="${Y(lo).toFixed(1)}" stroke="#DCD6EA"/>`;
  return o+`<path d="${H.map((p,i)=>(i?"L":"M")+X(i).toFixed(1)+","+Y(p.T).toFixed(1)).join("")}" fill="none" stroke="${F.mat("painted",IRC).stroke}" stroke-width="2.4" stroke-linejoin="round"/>`}
function drawClose(st0,st){let o=F.floor(420,260);
  if(st.k==="carbon"){const X=i=>44+i/(MLO.length-1)*350,Y=v=>220-(v-310)/(430-310)*180;
    o+=`<text class="t-lab" x="14" y="22">REAL DATA · CO₂ AT MAUNA LOA, HAWAI'I (ppm)</text>`;
    [320,360,400,430].forEach(v=>o+=`<line x1="44" x2="394" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" stroke="#DCD6EA"/><text class="t-lab" x="38" y="${(Y(v)+3.5).toFixed(1)}" text-anchor="end">${v}</text>`);
    [1960,1980,2000,2020].forEach(y=>{const i=y-1959;o+=`<text class="t-lab" x="${X(i).toFixed(1)}" y="236" text-anchor="middle">${y}</text>`});
    o+=`<path d="${MLO.map((v,i)=>(i?"L":"M")+X(i).toFixed(1)+","+Y(v).toFixed(1)).join("")}" fill="none" stroke="${PAL.product.blueberry}" stroke-width="2.6" stroke-linejoin="round"/><circle cx="${X(MLO.length-1).toFixed(1)}" cy="${Y(MLO[MLO.length-1]).toFixed(1)}" r="4.5" fill="${SUNC}" stroke="${INK}"/>`;
    o+=`<text class="t-ink" x="390" y="${(Y(427.35)+20).toFixed(1)}" text-anchor="end">2025: ${fmt(427.35,1)}</text><text class="t-ink" x="60" y="${(Y(316)-10).toFixed(1)}">1959: ${fmt(315.98,1)}</text>`;
    o+=`<text class="t-body" x="14" y="254">Yearly means from NOAA GML and Scripps. Measured, not modelled.</text>`;return o}
  if(st.k==="nz"){o+=`<text class="t-lab" x="14" y="22">HOW LONG EACH GAS LASTS IN THE AIR</text>`;
    [["Methane","a couple of decades",PAL.product.lime,.12],["Nitrous oxide","hundreds of years",IRC,1],["Carbon dioxide","hundreds of years","#5A6596",1]].forEach(([n,t,c,w],i)=>{const y=46+i*44;
      o+=`<text class="t-ink" x="14" y="${y+12}">${n}</text><rect x="130" y="${y}" width="270" height="16" rx="4" fill="#fff" stroke="#DCD6EA"/><rect x="130" y="${y}" width="${(270*w).toFixed(0)}" height="16" rx="4" fill="${c}" opacity=".85"/><text class="t-body" x="130" y="${y+32}">${t}</text>`});
    o+=`<text class="t-body" x="14" y="196">Most of the methane comes from cattle, sheep and other</text><text class="t-body" x="14" y="212">ruminant farm animals. Bars show order, not exact years.</text><text class="t-lab" x="14" y="240">SOURCE: HE POU A RANGI CLIMATE CHANGE COMMISSION</text>`;return o}
  o=books(o,22);
  if(st.k==="test"){o+=`<text class="t-lab" x="14" y="150">THE CARBON RIG</text><text class="t-ink" x="14" y="172">Air: ${fmt(s.A)} GtC · ${fmt(ppm())} ppm · ${sg(netA())} GtC a year</text><text class="t-ink" x="14" y="192">Fossil ${fmt(s.f,1)} · clearing ${fmt(s.c,1)} · planting ${fmt(s.p,1)} · capture ${fmt(s.q,1)}</text><text class="t-ink" x="14" y="212">Model year ${sg(s.yr,0)} · surface ${fmt(s.T,1)} °C${iceLeft()!=null?` · ice left ${pct(iceLeft())}`:""}</text>`;return o}
  return spark(o,150,80)}

// ---------------------------------------------------------------- steps
const ESPEED={speed:1,speedLabel:"≈ 5 model years a second"};
const steps=[
 {k:"sun",lab:"Sunlight in",...ESPEED,controls:["play","cloud","tile","surf","reset"],chips:["sun","refl","abs","temp"],
  cap:"The lamp is the Sun. Averaged over the whole planet, about 340 watts of sunlight arrive on every square metre. Some bounces straight back to space. The rest is absorbed and warms the surface.",
  big:"<b>The big idea:</b> energy arrives as sunlight, mostly visible light. Whatever isn't reflected is absorbed, and that absorbed energy is what warms the land, the ocean and the air.",
  exam:"Energy from the Sun arrives mainly as visible light. About 30% of it is reflected back to space by clouds, ice and other bright surfaces. The rest is absorbed by the land, ocean and air, which raises their temperature.",
  trap:"Saying all the sunlight that reaches Earth warms it. About 30% is reflected straight back to space and never heats anything.",
  onStep:()=>resetAll()},
 {k:"albedo",lab:"Albedo",...ESPEED,controls:["play","tile","surf","cloud","reset"],chips:["alb","tile","abs","temp"],
  cap:"Albedo is the share of sunlight a surface reflects. Pick a tile (or tap one on the bench) and change what it's made of. Ice reflects most of the light. Dark ocean absorbs almost all of it.",
  big:"<b>The big idea:</b> light, bright surfaces have a high albedo and absorb less energy; dark surfaces have a low albedo and absorb more. Albedo runs from 0 (absorbs everything) to 1 (reflects everything). Earth as a whole is about 0.3.",
  exam:"Albedo is the fraction of incoming sunlight that a surface reflects. Ice and snow have a high albedo (about 0.7 to 0.9), so they reflect most sunlight, while open ocean has a low albedo (about 0.06) and absorbs most of it. If ice is replaced by ocean, more sunlight is absorbed, so the surface warms.",
  trap:"Mixing up reflect and absorb. A high albedo means more is reflected and less is absorbed, so there is less warming.",
  onStep:()=>{resetAll()}},
 {k:"infrared",lab:"Infrared out",...ESPEED,controls:["play","gh","reset"],chips:["ir","out","bal","temp"],
  cap:"A warm surface gives off energy as infrared, which we can't see. The hotter it is, the more it gives off. Here the greenhouse gases are taken away as a thought experiment. Press Play: the infrared escapes straight to space, and the surface cools until energy out matches energy in.",
  big:"<b>The big idea:</b> everything gives off infrared, and the amount rises steeply with temperature (with the fourth power of the absolute temperature). That's why a planet doesn't heat up forever: it settles where energy out equals energy in.",
  exam:"The surface absorbs sunlight and radiates energy as infrared. A warmer surface radiates more infrared, so the temperature rises or falls until the energy radiated away equals the energy absorbed. Without greenhouse gases, the infrared would escape straight to space and Earth's surface would be more than 30 °C colder than it is.",
  trap:"Thinking Earth sends the sunlight itself back out. The surface absorbs mostly visible light and gives off a different kind of radiation, infrared.",
  onStep:()=>{resetAll();s.gh=false}},
 {k:"blanket",lab:"Greenhouse gases",...ESPEED,controls:["play","co2","gh","reset"],chips:["co2","back","out","bal","temp"],
  cap:"Greenhouse gases such as carbon dioxide, water vapour and methane let sunlight through but absorb infrared. They give that energy off again in every direction, so some comes back down. Add CO₂ and watch the surface warm until energy out matches energy in again.",
  big:"<b>The big idea:</b> greenhouse gases don't trap heat for good; they slow down how fast infrared escapes to space. Adding more (the enhanced greenhouse effect) means the surface must get warmer before it sends out as much energy as it absorbs.",
  exam:"Greenhouse gases such as carbon dioxide absorb infrared radiated by the surface and re-emit it in all directions, including back towards the surface, which warms it. Adding more carbon dioxide increases this effect, so the surface warms until it radiates enough infrared to balance the energy it absorbs again.",
  trap:"Saying greenhouse gases reflect heat like a mirror, or that the greenhouse effect is caused by the ozone hole. The gases absorb infrared and re-emit it.",
  onStep:()=>{resetAll()}},
 {k:"carbon",lab:"Carbon stores",...ESPEED,controls:["play","fossil","clear","plant","capture","reset"],chips:["co2","atm","net","fos","yr"],
  cap:"Carbon moves between four stores. Every year plants and the ocean take up some of the carbon dioxide we add. Burning fossil fuels and clearing forest add it faster than those sinks remove it, so the air's store keeps growing. The graph below is real: CO₂ measured at Mauna Loa since 1959.",
  big:"<b>The big idea:</b> the natural flows are huge, about 140 GtC a year into plants and back out and about 80 GtC a year each way between air and ocean, and they nearly balance. The extra flow from fossil fuels and clearing doesn't. From 2015 to 2024 about half of it stayed in the air, 29% went into the ocean and 21% into plants and soil.",
  exam:"Burning fossil fuels releases carbon that was stored underground for millions of years into the atmosphere as carbon dioxide, and clearing forest releases carbon stored in plants and soil. Plants (through photosynthesis) and the ocean take up about half of the extra carbon dioxide, but the rest stays in the air, so the concentration of carbon dioxide in the atmosphere keeps rising.",
  trap:"Blaming the natural flows because they're bigger. They nearly balance each other; the extra human flow is what tips the balance.",
  onStep:()=>{resetAll()}},
 {k:"feedback",lab:"Feedbacks",...ESPEED,controls:["play","fb","co2","cloud","reset"],chips:["temp","ice","alb","co2"],
  cap:"A feedback is when a change causes more change. With the ice–albedo feedback on, add CO₂ and press Play. As the slice warms, the ice tile shrinks, dark ocean shows through, more sunlight is absorbed and it warms even more.",
  big:"<b>The big idea:</b> reinforcing (positive) feedbacks amplify a change. Ice–albedo is one; warmer air holding more water vapour is another (always on in this model). The extra infrared a warmer surface gives off is a balancing feedback. Climate change and natural swings also weakened the carbon sinks, by about 25% on land and 7% in the ocean over 2015 to 2024 (not in this model).",
  exam:"The ice–albedo feedback is a reinforcing (positive) feedback. Warming melts ice and snow, exposing darker ocean or land with a lower albedo. The darker surface absorbs more sunlight, which causes more warming and more melting.",
  trap:"Thinking a 'positive' feedback is a good thing. In science it means the change is reinforced, which here means more warming.",
  onStep:()=>{resetAll();s.fb=true}},
 {k:"nz",lab:"Aotearoa",speed:0,controls:["nzv"],chips:["gross","agri","meth","forest"],
  cap:"In 2024 New Zealand's gross emissions were 75.8 million tonnes of CO₂-equivalent. About 53% came from agriculture, mostly methane and nitrous oxide from farming. Energy, including transport and electricity, made about 38%.",
  big:"<b>The big idea:</b> not every greenhouse gas lasts as long. Methane stays in the air for a couple of decades; carbon dioxide and nitrous oxide stay for hundreds of years. So the mix of gases a country emits changes how its emissions affect warming over time.",
  exam:"In 2024 about 53% of New Zealand's gross greenhouse gas emissions came from agriculture, mainly methane from ruminant animals such as cattle and sheep, and nitrous oxide. Methane is short-lived and breaks down within a couple of decades, while carbon dioxide and nitrous oxide stay in the atmosphere for hundreds of years.",
  trap:"Saying transport or electricity is New Zealand's biggest source. Agriculture is the largest share of gross emissions; energy, including transport, is second."},
 {k:"test",lab:"Test yourself",...ESPEED,controls:["play","tile","surf","cloud","fb","fossil","clear","plant","capture","reset"],chips:["temp","bal","alb","ice","co2","net"],
  cap:"Use the controls to answer each one, then press Check. The machine marks you with the same model it runs.",
  big:"<b>Exam tip:</b> follow the energy. Say where it comes in (sunlight), what is reflected (albedo), what goes out (infrared) and what greenhouse gases do to it. For carbon, name the stores and the flows between them."}
];
// ---------------------------------------------------------------- kupu Māori (each opened on Te Aka Māori Dictionary; ta = word id)
const KUPU=[
 {mi:"āhuarangi",en:"climate",ta:11736},
 {mi:"kōhauhau",en:"atmosphere",ta:39948,chip:"atm"},
 {mi:"hihi pōkākā",en:"infrared radiation",ta:47296,chip:"ir"},
 {mi:"paemahana",en:"temperature",ta:39927,chip:"temp",note:"Te Aka also lists pāmahana."},
 {mi:"tio",en:"ice",ta:8127,chip:"ice",note:"This is the third sense in the Te Aka entry: ice, freezing cold."},
 {mi:"hauhā",en:"carbon dioxide",ta:38806,chip:"co2"},
 {mi:"mahana haere o te ao",en:"global warming",ta:39815,note:"The entry's example sentence (from Te Reo Pūtaiao) calls the greenhouse effect te kati mahana."},
 {mi:"koranehe",en:"fossil fuel",ta:40187,chip:"fos"},
 {mi:"ahotakakame",en:"photosynthesis",ta:38805},
 {mi:"mewaro",en:"methane",ta:40472,chip:"meth",note:"A loanword."}];
Object.entries({sun:["āhuarangi","paemahana"],albedo:["tio","āhuarangi"],infrared:["hihi pōkākā","paemahana"],blanket:["kōhauhau","hauhā","mahana haere o te ao"],
  carbon:["hauhā","koranehe","ahotakakame","kōhauhau"],feedback:["tio","mahana haere o te ao","paemahana"],nz:["mewaro","āhuarangi"]}).forEach(([k,a])=>{const st=steps.find(x=>x.k===k);if(st)st.kupu=a});

// ---------------------------------------------------------------- the 3D bench
function climate3d(S){const {THREE,mat}=S,P=S.PAL;const V3=(x,y,z)=>new THREE.Vector3(x,y,z);
  const TOP=.3,ZC=V3(14,0,0),ZN=V3(-13,0,0);
  const plinth=(x,z,w,d,tint)=>{const p=S.rbox(w,.3,d,.12,mat("plastic",tint,{rough:.55,coat:.2}));p.position.set(x,.15,z);S.scene.add(p);return p};
  plinth(0,0,11.2,7.6,P.case.sky);plinth(ZC.x,0,11.2,7.8,P.case.mint);plinth(ZN.x,0,9.6,6.8,P.case.peach);
  const tmp=V3(0,0,0),tmp2=V3(0,0,0),q0=new THREE.Quaternion(),e0=new THREE.Euler(),Y1=V3(0,1,0);
  let seed=11;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
  const R=()=>S.REDUCED?0:1;
  const white=mat("plastic","#ffffff",{rough:.4});
  // ================================================================ the Earth energy rig
  const DX=.4,DZ=.2,CW=5.0,CHt=1.0,CD=2.7;
  const box3=S.acrylicCase(CW,CHt,CD,P.case.sky,{opacity:.2});box3.position.set(DX,TOP,DZ);S.scene.add(box3);
  // inside the case: a slice through the planet (crust, mantle, a warm band of core)
  [[.22,"#E8899A"],[.36,"#F4B9A0"],[.34,"#C9C3D8"]].reduce((y,[h,c])=>{S.scene.add(S.rbox(CW-.12,h,CD-.12,.04,mat("plastic",c,{rough:.6,coat:.2}),{at:[DX,y+h/2,DZ]}));return y+h},TOP+.04);
  const TY=TOP+.96,TS=1.12;const tileX=i=>DX+((i%4)-1.5)*1.2,tileZ=i=>DZ+(Math.floor(i/4)-.5)*1.26;
  const tileM=[],tileMesh=[],iceMesh=[];
  for(let i=0;i<TILE_N;i++){const m=mat("plastic","#ffffff",{rough:.5,coat:.4,fresh:true});const t=S.rbox(TS,.14,TS,.04,m,{at:[tileX(i),TY+.07,tileZ(i)]});S.scene.add(t);tileM.push(m);tileMesh.push(t);
    const im=S.rbox(TS-.06,.1,TS-.06,.045,mat("plastic","#F6FBFF",{rough:.3,coat:.9}),{at:[tileX(i),TY+.17,tileZ(i)]});S.scene.add(im);iceMesh.push(im);
    S.pick(t,()=>{const s=S.api.state;if(s.tsel!==i)s.tsel=i;else setTile(i,TYPES[(TYPES.indexOf(s.tiles[i])+1)%TYPES.length])});S.pick(im,()=>{const s=S.api.state;if(s.tsel!==i)s.tsel=i;else setTile(i,TYPES[(TYPES.indexOf(s.tiles[i])+1)%TYPES.length])})}
  // ice floes on the ice tiles, trees on forest tiles, buildings on city tiles, cattle on farmland (instanced)
  const NTR=7,trees=S.swarm(TILE_N*NTR,new THREE.ConeGeometry(.13,.42,9),mat("plastic","#5DAA62",{rough:.5}),{cast:true}),trunks=S.swarm(TILE_N*NTR,new THREE.CylinderGeometry(.03,.035,.12,6),mat("plastic","#A8784E",{rough:.6}),{cast:true});
  const NBL=6,blds=S.swarm(TILE_N*NBL,new S.RoundedBoxGeometry(.22,1,.22,2,.03),mat("plastic","#ffffff",{rough:.45}),{colors:true,cast:true});
  const NCW=3,cowB=S.swarm(TILE_N*NCW,new S.RoundedBoxGeometry(.24,.13,.12,2,.03),mat("plastic","#FBF8F2",{rough:.5}),{cast:true}),cowH=S.swarm(TILE_N*NCW,new S.RoundedBoxGeometry(.08,.08,.08,2,.02),mat("plastic","#4A4F6A",{rough:.5}),{cast:true});
  const NFL=4,floes=S.swarm(TILE_N*NFL,new THREE.IcosahedronGeometry(.1,0),mat("plastic","#F6FBFF",{rough:.3}),{cast:true});
  S.scene.add(trees,trunks,blds,cowB,cowH,floes);
  const tp=[];for(let k=0;k<NTR;k++){const a=k*2.4+.3,r=.16+.3*((k*37)%10)/10;tp.push([Math.cos(a)*r,Math.sin(a)*r,.8+.4*((k*13)%7)/7])}
  const bp=[[-.3,-.28,.55],[.05,-.3,.8],[.32,-.22,.4],[-.28,.12,.35],[.1,.1,.62],[.33,.28,.3]];
  const cp=[[-.25,-.2,.4],[.2,.05,2.3],[-.1,.3,4]];
  const fp=[[-.36,-.36],[.36,-.32],[-.34,.36],[.38,.36]];
  // the selected tile: a thin glowing frame
  const selF=S.group();{const fm=mat("glow",P.deep.sky,.9);[[0,-.6,1.24,.05],[0,.6,1.24,.05],[-.6,0,.05,1.24],[.6,0,.05,1.24]].forEach(([x,z,w,d])=>selF.add(S.box(w,.05,d,fm,{at:[x,0,z],cast:false})))}
  // clouds: ten soft puffy clusters between the tiles and the blanket
  const CY=TOP+2.2,cloudAt=[];for(let k=0;k<10;k++)cloudAt.push([DX+((k%5)-2)*1.0+(Math.floor(k/5)?.45:-.1),CY+(k%3)*.12,DZ+(Math.floor(k/5)-.5)*1.1]);
  const cOrder=[0,7,3,5,1,8,4,9,2,6];
  const clouds=S.swarm(50,new THREE.SphereGeometry(1,16,12),mat("plastic","#ffffff",{rough:.95,coat:0}),{cast:true});S.scene.add(clouds);
  const cPuff=[[0,0,0,.26],[.24,.02,.05,.2],[-.22,-.02,.02,.19],[.08,.12,-.06,.18],[-.06,.06,.16,.16]];
  // the greenhouse-gas blanket: a frosted lavender sheet on four steel posts, with CO₂ and water molecules in it
  const BY=TOP+3.3,BW=5.3,BD=2.9;
  const postM=mat("metal",P.steel,{rough:.3});
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,b])=>{const x=DX+a*(CW/2),z=DZ+b*(CD/2);S.scene.add(S.cyl(.045,.045,BY+.35-(TOP+CHt),postM,{at:[x,(BY+.35+TOP+CHt)/2,z],seg:12}));S.scene.add(S.sphere(.07,mat("plastic","#ffffff",{rough:.25}),{at:[x,BY+.38,z],seg:14}))});
  const sheetM=mat("acrylic",P.case.lavender,{opacity:.3,fresh:true});const sheet=S.rbox(BW,1,BD,.03,sheetM,{cast:false});sheet.position.set(DX,BY,DZ);sheet.renderOrder=4;S.scene.add(sheet);
  const NCO=56,NWV=44;const molC=S.swarm(NCO,new THREE.SphereGeometry(.05,10,8),mat("plastic","#4A4F6A",{rough:.35})),molO=S.swarm(NCO*2,new THREE.SphereGeometry(.042,10,8),mat("plastic",P.product.strawberry,{rough:.35}));
  const wvO=S.swarm(NWV,new THREE.SphereGeometry(.046,10,8),mat("plastic",P.product.blueberry,{rough:.35})),wvH=S.swarm(NWV*2,new THREE.SphereGeometry(.028,8,6),white);
  S.scene.add(molC,molO,wvO,wvH);
  const mp=[];for(let k=0;k<NCO+NWV;k++)mp.push({x:(rnd()-.5)*(BW-.4),y:rnd()-.5,z:(rnd()-.5)*(BD-.4),a:rnd()*6,b:rnd()*6,fl:0});
  // the lamp: a weighted base, a steel pole, an arm and a peach housing with a glowing face
  const LB=V3(-4.5,TOP,-2.1),LH=V3(-3.35,TOP+5.05,-1.45),AIM=V3(DX,TY,DZ);const ldir=AIM.clone().sub(LH).normalize();
  S.scene.add(S.cyl(.5,.56,.18,mat("metal","#8F9BAA",{rough:.35}),{at:[LB.x,TOP+.09,LB.z],seg:40}));
  S.scene.add(S.cyl(.055,.055,4.95,postM,{at:[LB.x,TOP+2.6,LB.z],seg:14}));
  S.scene.add(S.tube([[LB.x,TOP+5.0,LB.z],[LB.x+.05,TOP+5.35,LB.z+.05],[(LB.x+LH.x)/2,TOP+5.5,(LB.z+LH.z)/2],[LH.x-ldir.x*.5,LH.y-ldir.y*.5+.15,LH.z-ldir.z*.5]],.05,postM,{seg:40}));
  const head=S.group();head.position.copy(LH);head.quaternion.setFromUnitVectors(V3(0,-1,0),ldir);
  head.add(S.cyl(.34,.62,.72,mat("plastic",P.case.peach,{rough:.35}),{seg:40}));head.add(S.cyl(.18,.34,.2,mat("plastic","#E8B28C",{rough:.35}),{at:[0,.45,0],seg:30}));
  head.add(S.cyl(.56,.56,.04,mat("glow",SUNC,2.2),{at:[0,-.37,0],seg:40,cast:false}));head.add(S.torus(.6,.04,mat("metal",P.steel),{at:[0,-.37,0],rot:[Math.PI/2,0,0],ts:48}));
  const glowP=S.puffs(1,"#FFE9A8",{additive:true});glowP.put(0,LH.x+ldir.x*.45,LH.y+ldir.y*.45,LH.z+ldir.z*.45,.55,900);glowP.done();S.scene.add(glowP);
  const lp1=V3(0,0,0).crossVectors(ldir,Y1).normalize(),lp2=V3(0,0,0).crossVectors(ldir,lp1).normalize();
  // the thermometer
  const TH=V3(DX+3.35,TOP,DZ+1.05);const th=S.group();th.position.copy(TH);
  th.add(S.rbox(.62,.12,.5,.04,mat("metal",P.steel),{at:[0,.06,0]}));th.add(S.rbox(.5,3.15,.06,.04,white,{at:[0,1.7,-.12]}));
  const tg=S.cyl(.075,.075,2.85,mat("glass","#ffffff",{opacity:.28}),{at:[0,1.78,0],cast:false});tg.renderOrder=6;th.add(tg);
  th.add(S.sphere(.14,mat("glow",P.product.strawberry,.6),{at:[0,.36,0]}));const spirit=S.cyl(.045,.045,1,mat("glow",P.product.strawberry,.6),{seg:12});th.add(spirit);
  const Ty=T=>.45+(clamp(T,-40,45)+40)/85*2.6;const tickM=mat("flat",P.ink,{opacity:.55});
  for(let T=-40;T<=40;T+=10){th.add(S.box(T%20?.08:.14,.012,.01,tickM,{at:[-.16,Ty(T),-.085],cast:false}))}
  th.add(S.box(.2,.02,.012,mat("flat",P.deep.sky),{at:[-.14,Ty(15),-.085],cast:false}));
  // the energy books screen
  const scr=S.group();scr.position.set(-3.85,TOP,1.75);scr.rotation.y=.38;
  scr.add(S.cyl(.05,.07,.55,mat("metal"),{at:[0,.28,0]}));scr.add(S.rbox(.8,.1,.5,.04,white,{at:[0,.05,0]}));
  scr.add(S.rbox(2.5,1.62,.08,.06,mat("plastic","#ffffff",{rough:.35}),{at:[0,1.32,-.05]}));
  const book=S.panel(640,400,2.34);book.position.set(0,1.32,0);scr.add(book);let bookKey="";
  // particles: sunlight in, light reflected, infrared up, infrared re-emitted
  const capG=new THREE.CylinderGeometry(.028,.028,.26,8);
  const NPH=110,phIn=S.swarm(NPH,capG,mat("glow",SUNC,1.5)),phOut=S.swarm(NPH,capG,mat("glow","#FFF2C8",1.1));
  const NIR=170,irM=S.swarm(NIR,new THREE.SphereGeometry(.045,10,8),mat("glow",P.product.strawberry,1.3));
  const warm=S.puffs(30,P.product.peach,{additive:true});S.scene.add(phIn,phOut,irM,warm);
  const PI_=[],PO=[],IR=[],WP=[];for(let i=0;i<NPH;i++){PI_.push({on:false,p:V3(0,0,0),v:V3(0,0,0),tgt:V3(0,0,0),tile:0,cloud:-1});PO.push({on:false,p:V3(0,0,0),v:V3(0,0,0)})}
  for(let i=0;i<NIR;i++)IR.push({on:false,x:0,y:0,z:0,dir:1,ph:0,stage:0});for(let i=0;i<30;i++)WP.push({x:0,y:0,z:0,life:0});
  let accPh=0,accIR=0;
  const spawnOut=(p,v)=>{const o=PO.find(q=>!q.on);if(!o)return;o.on=true;o.p.copy(p);o.v.copy(v)};
  const glint=(x,y,z)=>{const w=WP.find(q=>q.life<=0);if(w){w.x=x;w.y=y;w.z=z;w.life=.5}};
  // ================================================================ the carbon rig: four tanks, copper pipes, valves
  const cz=S.group();cz.position.copy(ZC);
  const rimM=mat("metal",P.steel,{rough:.3}),glassM=mat("glass","#ffffff",{opacity:.16});
  function tank(x,z,y0,r,h,fillC){const g=S.group(cz);g.position.set(x,y0,z);
    g.add(S.cyl(r+.1,r+.14,.14,white,{at:[0,.07,0],seg:48}));
    const gl=S.cyl(r,r,h,glassM,{at:[0,.14+h/2,0],cast:false,open:true,seg:48});gl.renderOrder=6;g.add(gl);
    g.add(S.torus(r,.035,rimM,{at:[0,.16,0],rot:[Math.PI/2,0,0],ts:64}));g.add(S.torus(r,.035,rimM,{at:[0,.14+h,0],rot:[Math.PI/2,0,0],ts:64}));
    const fm=mat("liquid",fillC,{opacity:.88,fresh:true});const fill=S.cyl(r-.03,r-.03,1,fm,{seg:48});g.add(fill);
    const sl=S.cyl(r-.03,r-.03,.012,mat("plastic","#ffffff",{rough:.3,fresh:true}),{seg:48,cast:false});sl.material.color.set(fillC).lerp(new THREE.Color("#ffffff"),.35);g.add(sl);
    return {g,fill,sl,r,h,y0,set(f){f=clamp(f,.01,1);const H=f*h;fill.scale.y=H;fill.position.y=.16+H/2;sl.position.y=.16+H+.006}}}
  // the atmosphere tank sits up on a steel stand, so every pipe climbs to it
  const AY=1.5;[[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,b])=>cz.add(S.cyl(.05,.05,AY,rimM,{at:[a*.7,TOP+AY/2,-1.9+b*.7],seg:12})));
  cz.add(S.rbox(1.9,.1,1.9,.04,mat("metal","#B9C2CF"),{at:[0,TOP+AY-.03,-1.9]}));
  const tA=tank(0,-1.9,TOP+AY,.95,2.0,AIRC),tO=tank(-3.6,1.25,TOP,1.3,1.7,P.water),tL=tank(3.5,1.3,TOP,1.05,1.35,"#B98A5A");
  // fossil carbon: a squat tank in a rock vault
  cz.add(S.rbox(2.2,.62,2.0,.12,mat("plastic","#B7B1C9",{rough:.8,coat:.1}),{at:[3.8,TOP+.31,-2.15]}));
  const tF=tank(3.8,-2.15,TOP+.3,.8,1.0,"#4A4F6A");
  const preRing=S.torus(.97,.02,mat("flat","#8F9BAA"),{rot:[Math.PI/2,0,0],ts:64,cast:false});tA.g.add(preRing);preRing.position.y=.16+A_PRE/2400*2.0;
  const nowRing=S.torus(.97,.02,mat("flat",P.deep.sky),{rot:[Math.PI/2,0,0],ts:64,cast:false});tA.g.add(nowRing);nowRing.position.y=.16+A0/2400*2.0;
  // land tank lid: a little forest; cleared trees become stumps, planted saplings appear
  const NLT=14,lTree=S.swarm(NLT+6,new THREE.ConeGeometry(.12,.4,9),mat("plastic","#5DAA62",{rough:.5}),{cast:true}),lTrunk=S.swarm(NLT+6,new THREE.CylinderGeometry(.035,.04,1,6),mat("plastic","#A8784E",{rough:.6}),{cast:true});cz.add(lTree,lTrunk);
  const ltp=[];for(let k=0;k<NLT;k++){const a=k/NLT*Math.PI*2,r=k%2?.75:.45;ltp.push([3.5+Math.cos(a)*r,1.3+Math.sin(a)*r])}for(let k=0;k<6;k++){const a=k/6*Math.PI*2+.4;ltp.push([3.5+Math.cos(a)*.2,1.3+Math.sin(a)*.2])}
  // the pipes (curves in rig space) and the carbon beads that travel them
  const L=(x,y,z)=>V3(x,TOP+y,z);
  const pipeDefs={
    fossil:{pts:[L(3.8,1.38,-2.15),L(3.8,2.3,-2.15),L(2.6,3.25,-2.05),L(.98,3.1,-1.9)],valve:P.product.strawberry,rate:()=>fos()},
    ocean:{pts:[L(-.98,3.0,-1.9),L(-2.0,3.2,-1.4),L(-3.3,2.6,.4),L(-3.6,1.95,1.25)],rate:()=>Math.max(0,sinkO())},
    uptake:{pts:[L(.5,1.6,-1.25),L(1.6,1.3,-.2),L(2.9,1.75,.9),L(3.3,1.58,1.2)],valve:P.product.lime,rate:()=>Math.max(0,sinkL())+s.p},
    clear:{pts:[L(3.75,1.58,1.55),L(4.0,2.7,.8),L(2.3,3.75,-1.0),L(.7,3.55,-1.65)],valve:P.product.peach,rate:()=>s.c},
    capture:{pts:[L(-.3,3.65,-2.05),L(.2,4.45,-2.6),L(2.6,4.1,-2.9),L(3.6,1.4,-2.45)],valve:"#B9A3EA",rate:()=>s.q}};
  const copper=mat("metal",P.copper,{rough:.3});const pipes={};
  Object.entries(pipeDefs).forEach(([k,d])=>{const m=S.tube(d.pts,.06,copper,{seg:80});cz.add(m);const c=m.userData.curve;const pp={c,len:c.getLength(),b:[],acc:0,d};
    if(d.valve){const u=.5,pt=c.getPointAt(u),tn=c.getTangentAt(u);const w=S.group(cz);w.position.copy(pt);const base=new THREE.Quaternion().setFromUnitVectors(V3(0,0,1),tn);w.quaternion.copy(base);
      const vm=mat("plastic",d.valve,{rough:.3});w.add(S.torus(.22,.035,vm,{ts:40}));for(let a=0;a<3;a++){const sp=S.cyl(.018,.018,.44,vm,{seg:8});sp.rotation.z=a*Math.PI/3;w.add(sp)}w.add(S.cyl(.06,.06,.12,mat("metal",P.steel),{rot:[Math.PI/2,0,0],seg:16}));
      cz.add(S.cyl(.1,.1,.16,mat("metal","#B9C2CF"),{at:[pt.x,pt.y,pt.z],rot:[0,0,0],seg:16}));pp.w=w;pp.base=base;pp.wq=new THREE.Quaternion();
      S.pick(w.children[0],()=>{const st=S.api.state;if(k==="fossil")st.f=st.f>0?0:DEF.f;else if(k==="clear")st.c=st.c>0?0:DEF.c;else if(k==="uptake")st.p=st.p>0?0:2;else if(k==="capture")st.q=st.q>0?0:2})}
    pipes[k]=pp});
  const NB=320,beads=S.swarm(NB,new THREE.SphereGeometry(.075,12,9),mat("plastic","#5A6596",{rough:.3}),{cast:false});cz.add(beads);
  // ================================================================ Aotearoa: two sorting columns, a paddock and a road
  const nz=S.group();nz.position.copy(ZN);
  const colX=[-1.25,1.25];const colSeg=[[],[]];
  colX.forEach((x,ci)=>{const cs=S.acrylicCase(1.42,3.45,1.42,P.case.peach,{opacity:.16});cs.position.set(x,TOP,-1.15);nz.add(cs);
    let y=TOP+.06;(ci?NZ.gas:NZ.sector).forEach(([n,v,c])=>{const h=3.2*v/100;const m=S.rbox(1.18,Math.max(.03,h-.03),1.18,.04,mat("plastic",c,{rough:.4,coat:.6}),{at:[x,y+h/2,-1.15]});nz.add(m);colSeg[ci].push({m,y:y+h/2,h,n,v});y+=h});
    S.pick(cs.userData.body,()=>{S.api.state.nzv=ci?"gas":"sector"})});
  const pad=S.rbox(3.4,.16,2.1,.06,mat("plastic","#BFE3A6",{rough:.7,coat:.1}),{at:[-2.2,TOP+.08,1.75]});nz.add(pad);
  const fenceM=mat("plastic","#F7F3EC",{rough:.5});
  [[-2.2,.75,3.3,.03],[-2.2,2.75,3.3,.03],[-3.85,1.75,.03,2.0],[-.55,1.75,.03,2.0]].forEach(([x,z,w,d])=>nz.add(S.box(w,.04,d,fenceM,{at:[x,TOP+.36,z]})));
  for(let k=0;k<10;k++){const t=k/9;nz.add(S.cyl(.03,.03,.32,fenceM,{at:[-3.85+t*3.3,TOP+.32,.75],seg:8}))}
  const cows=[];[[-3.1,1.35,.4],[-2.3,2.2,2.6],[-1.4,1.5,-.6],[-2.8,2.35,1.4]].forEach(([x,z,yaw])=>{const g=S.group(nz);g.position.set(x,TOP+.16,z);g.rotation.y=yaw;
    g.add(S.rbox(.52,.26,.26,.07,mat("plastic","#FBF8F2",{rough:.5}),{at:[0,.36,0]}));g.add(S.rbox(.2,.14,.27,.04,mat("plastic","#4A4F6A",{rough:.5}),{at:[-.06,.44,0]}));
    g.add(S.rbox(.17,.17,.15,.04,mat("plastic","#4A4F6A",{rough:.5}),{at:[.33,.44,0]}));[[-.17,-.08],[-.17,.08],[.17,-.08],[.17,.08]].forEach(([a,b])=>g.add(S.cyl(.03,.03,.24,mat("plastic","#4A4F6A"),{at:[a,.12,b],seg:8})));cows.push(g)});
  const road=S.rbox(3.0,.16,2.1,.06,mat("plastic","#E3DFEA",{rough:.7,coat:.1}),{at:[2.0,TOP+.08,1.75]});nz.add(road);
  nz.add(S.box(3.0,.02,.6,mat("plastic","#8F9BAA",{rough:.6}),{at:[2.0,TOP+.17,1.75]}));for(let k=0;k<5;k++)nz.add(S.box(.24,.022,.05,mat("plastic","#ffffff"),{at:[.85+k*.55,TOP+.18,1.75]}));
  const cars=[0,1].map(k=>{const g=S.group(nz);const c=k?P.product.blueberry:P.product.strawberry;g.add(S.rbox(.5,.16,.26,.06,mat("plastic",c,{rough:.3}),{at:[0,.12,0]}));g.add(S.rbox(.26,.13,.22,.05,mat("glass","#DDEBFA",{opacity:.6}),{at:[-.04,.25,0],cast:false}));
    [[-.15,-.13],[.15,-.13],[-.15,.13],[.15,.13]].forEach(([a,b])=>g.add(S.cyl(.06,.06,.04,mat("plastic","#3E4262"),{at:[a,.06,b],rot:[Math.PI/2,0,0],seg:12})));return g});
  const grove=[];for(let k=0;k<7;k++){const a=k*2.1,r=.25+.25*(k%3);grove.push([3.6+Math.cos(a)*r,-1.7+Math.sin(a)*r])}
  grove.forEach(([x,z],k)=>{nz.add(S.cyl(.03,.035,.16,mat("plastic","#A8784E"),{at:[x,TOP+.08,z],seg:6}));nz.add(S.mesh(new THREE.ConeGeometry(.16,.5,9),mat("plastic","#4E9A58",{rough:.5}),{at:[x,TOP+.4,z]}))});
  const meth=S.puffs(36,"#BFE8A0"),exh=S.puffs(24,"#C9CEDF");nz.add(meth,exh);
  const MP=Array.from({length:36},()=>({x:0,y:0,z:0,life:0})),EP=Array.from({length:24},()=>({x:0,y:0,z:0,life:0}));let mAcc=0,eAcc=0;
  // ================================================================ labels
  const lSun=S.label({cls:"big",off:[24,-34]}),lRefl=S.label({off:[26,-10]}),lAbs=S.label({off:[-30,30]}),lTile=S.label({cls:"hot",off:[-34,24]});
  const lIR=S.label({off:[30,30]}),lGas=S.label({off:[-36,-26]}),lBack=S.label({off:[-36,16]}),lSpace=S.label({off:[30,-8]}),lTemp=S.label({cls:"big",off:[26,-8]}),lBal=S.label({off:[30,-30]}),lCloud=S.label({off:[-30,-22]}),lIce=S.label({cls:"hot",off:[-36,-30]});
  const lAtm=S.label({cls:"big",off:[-40,-34]}),lOcean=S.label({off:[-36,-30]}),lLand=S.label({off:[28,16]}),lFossil=S.label({off:[30,-34]}),lNet=S.label({cls:"hot",off:[-40,24]});
  const lVF=S.label({off:[30,-26]}),lVC=S.label({off:[30,-14]}),lVP=S.label({off:[30,24]}),lVQ=S.label({off:[30,-20]});
  const lNZ=S.label({cls:"big",off:[34,-40]}),lSeg=[0,1,2,3].map(i=>S.label({off:[-44,0]})),lOther=S.label({off:[30,0]}),lCows=S.label({off:[-30,-34]}),lCars=S.label({off:[30,-30]}),lGrove=S.label({off:[30,-24]});
  const lSlice=S.label({off:[30,26]});
  const ENER=[lSun,lRefl,lAbs,lTile,lIR,lGas,lBack,lSpace,lTemp,lBal,lCloud,lIce,lSlice],CARB=[lAtm,lOcean,lLand,lFossil,lNet,lVF,lVC,lVP,lVQ],NZL=[lNZ,...lSeg,lOther,lCows,lCars,lGrove];
  const SHOW={sun:[lSun,lRefl,lAbs,lTemp,lCloud,lSlice],albedo:[lTile,lRefl,lAbs,lTemp],infrared:[lIR,lSpace,lTemp,lGas],blanket:[lGas,lBack,lSpace,lIR,lTemp],
    carbon:[lAtm,lOcean,lLand,lFossil,lNet,lVF,lVC,lVP,lVQ],feedback:[lIce,lTemp,lGas],nz:NZL,test:[lTemp,lBal,lAtm,lNet]};
  // ================================================================ views
  // each view has a wider twin for narrow (phone) screens, pulled back so the whole rig fits
  const VIEW=(n,pos,tg,o)=>{S.view(n,pos,tg,o);S.view(n+"_n",pos.map((v,i)=>tg[i]+(v-tg[i])*1.4),tg,Object.assign({},o,{max:(o.max||40)*1.4}))};
  VIEW("sun",[-1.2,6.3,11.8],[-.2,2.3,0],{min:4,max:30});
  VIEW("albedo",[1.4,4.7,8.4],[.5,1.1,.3],{min:3,max:24});
  VIEW("infrared",[3.6,4.6,10.6],[.6,2.7,.2],{min:4,max:30});
  VIEW("blanket",[-2.8,5.0,10.8],[.4,2.9,0],{min:4,max:30});
  VIEW("carbon",[ZC.x+.4,7.4,11.8],[ZC.x,2.0,-.3],{min:4,max:30});
  VIEW("feedback",[1.0,7.8,8.8],[.6,1.3,.2],{min:3,max:26});
  VIEW("nz",[ZN.x+.6,5.8,9.6],[ZN.x,1.7,0],{min:4,max:28});
  VIEW("all",[7.2,12.6,24.5],[7.2,1.9,0],{min:8,max:60});
  // on narrow screens some pills step aside (the sliders and chips carry the same numbers)
  const NARROW_HIDE=new Set([lVF,lVC,lVP,lVQ,lCows,lCars,lGrove,lCloud,lSlice,lRefl,lNet,lBal]);
  let narrow=false;const isNarrow=()=>{const w=S.canvas.clientWidth||800;return w<620};
  const vname=k=>(k==="test"?"all":k)+(narrow?"_n":"");
  narrow=isNarrow();S.goView(vname("sun"),true);
  let curK="sun",first=true;
  function showLabels(k){[...ENER,...CARB,...NZL].forEach(l=>l.hide());(SHOW[k]||[]).forEach(l=>{if(!(narrow&&NARROW_HIDE.has(l)))l.show()})}
  return {
    resize(){const n=isNarrow();if(n!==narrow){narrow=n;S.goView(vname(curK),true);showLabels(curK)}},
    step(st){const k=st.k;curK=k;narrow=isNarrow();S.goView(vname(k),first);first=false;showLabels(k);
      if(k==="carbon")S.setShadowBox(7,[ZC.x,0,0]);else if(k==="nz")S.setShadowBox(6,[ZN.x,0,0]);else if(k==="test")S.setShadowBox(19,[7,0,0]);else S.setShadowBox(7,[-.3,0,0]);
      },
    update(s,st,dt,t){const k=st.k,run=s.playing&&st.speed,fl=flows(),r=R();
      // ---- tiles
      for(let i=0;i<TILE_N;i++){const ty=s.tiles[i],ic=s.ic[i]||0,m=tileM[i];const base=(ty==="ice"||ty==="ocean")?"ocean":ty;
        m.color.set(TCOL[base]);m.roughness=base==="ocean"?.12:base==="city"?.55:.7;m.clearcoat=base==="ocean"?1:.3;
        const im=iceMesh[i],f=Math.sqrt(ic);im.visible=ic>.01;im.scale.set(Math.max(.001,f),1,Math.max(.001,f));
        for(let n=0;n<NFL;n++){const on=ic>.01&&ty==="ice";const a=fp[n];floes.put(i*NFL+n,tileX(i)+a[0]*f,TY+.24,tileZ(i)+a[1]*f,on?(.6+.4*((n*7)%3)/2)*f:0,n,n*2,0)}
        for(let n=0;n<NTR;n++){const on=ty==="forest",a=tp[n];trees.putS(i*NTR+n,tileX(i)+a[0],TY+.14+.12+.2*a[2],tileZ(i)+a[1],on?a[2]:.001,on?a[2]:.001,on?a[2]:.001);trunks.put(i*NTR+n,tileX(i)+a[0],TY+.2,tileZ(i)+a[1],on?1:0)}
        for(let n=0;n<NBL;n++){const on=ty==="city",a=bp[n];const h=on?a[2]:.001;blds.putS(i*NBL+n,tileX(i)+a[0],TY+.14+h/2,tileZ(i)+a[1],on?1:.001,h,on?1:.001);blds.tint(i*NBL+n,["#D9CBF2","#ECE7F6","#C9C3D8","#BFDDF5"][(n+i)%4])}
        for(let n=0;n<NCW;n++){const on=ty==="farm",a=cp[n];e0.set(0,a[2],0);q0.setFromEuler(e0);const x=tileX(i)+a[0],z=tileZ(i)+a[1];
          cowB.putS(i*NCW+n,x,TY+.22,z,on?1:.001,on?1:.001,on?1:.001,q0);cowH.put(i*NCW+n,x+Math.cos(a[2])*.15,TY+.26,z-Math.sin(a[2])*.15,on?1:0)}}
      floes.done();trees.done();trunks.done();blds.done();cowB.done();cowH.done();
      const showSel=k==="sun"||k==="albedo"||k==="test";selF.visible=showSel;selF.position.set(tileX(s.tsel),TY+.15,tileZ(s.tsel));
      // ---- clouds
      const nC=Math.round(s.cloud*10),vis=[];for(let j=0;j<10;j++){const kk=cOrder[j],on=j<nC,c=cloudAt[kk];if(on)vis.push(kk);
        cPuff.forEach((p,m)=>clouds.put(kk*5+m,c[0]+p[0]*1.6,c[1]+p[1],c[2]+p[2]*1.6,on?p[3]*1.25:0))}clouds.done();
      // ---- blanket and molecules
      const thk=s.gh?.04+1.5*Math.max(0,fl.eps-.6):0;sheet.visible=s.gh;sheet.scale.y=Math.max(.001,thk);sheetM.opacity=.18+.25*fl.eps;
      const nCO=s.gh?clamp(Math.round(ppm()/27),2,NCO):0,nWV=s.gh?clamp(Math.round(18+(s.T-T_REF)*1.6),4,NWV):0;
      for(let j=0;j<NCO;j++){const m=mp[j],on=j<nCO;m.fl=Math.max(0,m.fl-dt*3);const sc=on?1+m.fl*.8:0;const x=DX+m.x,y=BY+m.y*thk*.7,z=DZ+m.z;
        molC.put(j,x,y,z,sc);const ax=Math.cos(m.a)*.09*sc,az=Math.sin(m.a)*.09*sc;molO.put(j*2,x+ax,y,z+az,sc);molO.put(j*2+1,x-ax,y,z-az,sc)}
      for(let j=0;j<NWV;j++){const m=mp[NCO+j],on=j<nWV;m.fl=Math.max(0,m.fl-dt*3);const sc=on?1+m.fl*.8:0;const x=DX+m.x,y=BY+m.y*thk*.7,z=DZ+m.z;
        wvO.put(j,x,y,z,sc);wvH.put(j*2,x+Math.cos(m.a)*.06*sc,y+.035*sc,z+Math.sin(m.a)*.06*sc,sc);wvH.put(j*2+1,x+Math.cos(m.a+1.8)*.06*sc,y+.035*sc,z+Math.sin(m.a+1.8)*.06*sc,sc)}
      molC.done();molO.done();wvO.done();wvH.done();
      // ---- the thermometer
      const sy=Ty(s.T);spirit.scale.y=Math.max(.01,sy-.36);spirit.position.y=(sy+.36)/2;
      // ---- particles (they move only while the model runs, so a paused bench is a still photo)
      const ePart=k!=="carbon"&&k!=="nz";
      if(run&&ePart&&r){
        accPh+=dt*S0*.085;while(accPh>=1){accPh--;const ph=PI_.find(q=>!q.on);if(!ph)break;ph.on=true;
          const a=rnd()*6.28,rr=Math.sqrt(rnd())*.45;ph.p.copy(LH).addScaledVector(ldir,.45).addScaledVector(lp1,Math.cos(a)*rr).addScaledVector(lp2,Math.sin(a)*rr);
          ph.tile=Math.floor(rnd()*TILE_N);ph.cloud=-1;
          if(vis.length&&rnd()<s.cloud){const c=cloudAt[vis[Math.floor(rnd()*vis.length)]];ph.cloud=1;ph.tgt.set(c[0]+(rnd()-.5)*.5,c[1],c[2]+(rnd()-.5)*.5)}
          else ph.tgt.set(tileX(ph.tile)+(rnd()-.5)*.95,TY+.16,tileZ(ph.tile)+(rnd()-.5)*.95);
          ph.v.copy(ph.tgt).sub(ph.p).normalize().multiplyScalar(4.6)}
        if(k!=="sun"&&k!=="albedo")accIR+=dt*fl.ir*.065;while(accIR>=1){accIR--;const q=IR.find(z=>!z.on);if(!q)break;const i=Math.floor(rnd()*TILE_N);q.on=true;q.x=tileX(i)+(rnd()-.5)*.95;q.z=tileZ(i)+(rnd()-.5)*.95;q.y=TY+.2;q.dir=1;q.stage=0;q.ph=rnd()*6}}
      const bBot=BY-thk/2,bTop=BY+thk/2;
      for(let i=0;i<NPH;i++){const ph=PI_[i];
        if(ph.on&&run){ph.p.addScaledVector(ph.v,dt);
          if(ph.p.y<=ph.tgt.y){ph.p.y=ph.tgt.y;
            if(ph.cloud>=0){if(rnd()<A_CLOUD){ph.on=false;spawnOut(ph.p,tmp.copy(ph.v).setY(-ph.v.y))}else{ph.cloud=-1;ph.tgt.set(ph.p.x+(rnd()-.5)*.3,TY+.16,ph.p.z+(rnd()-.5)*.3);ph.tgt.x=clamp(ph.tgt.x,DX-2.3,DX+2.3);ph.tgt.z=clamp(ph.tgt.z,DZ-1.15,DZ+1.15);ph.v.copy(ph.tgt).sub(ph.p).normalize().multiplyScalar(4.6)}}
            else{ph.on=false;const ti=clamp(Math.floor((ph.p.x-DX)/1.2+2),0,3)+(ph.p.z>DZ?4:0);if(rnd()<tileAlb(ti))spawnOut(ph.p,tmp.copy(ph.v).setY(-ph.v.y));else glint(ph.p.x,ph.p.y+.03,ph.p.z)}}}
        if(ph.on){q0.setFromUnitVectors(Y1,tmp2.copy(ph.v).normalize());phIn.putS(i,ph.p.x,ph.p.y,ph.p.z,1,1,1,q0)}else phIn.put(i,0,-20,0,.001)}
      for(let i=0;i<NPH;i++){const o=PO[i];if(o.on&&run){o.p.addScaledVector(o.v,dt);if(o.p.y>TOP+7.5)o.on=false}
        if(o.on){q0.setFromUnitVectors(Y1,tmp2.copy(o.v).normalize());phOut.putS(i,o.p.x,o.p.y,o.p.z,1,1,1,q0)}else phOut.put(i,0,-20,0,.001)}
      phIn.done();phOut.done();
      for(let i=0;i<NIR;i++){const q=IR[i];
        if(q.on&&run){q.y+=q.dir*dt*1.7;q.ph+=dt*9;
          if(q.dir>0&&q.stage===0&&s.gh&&q.y>=bBot){if(rnd()<fl.eps){const j=Math.floor(rnd()*Math.max(1,nCO+nWV));const m=j<nCO?mp[j]:mp[NCO+j-nCO];if(m)m.fl=1;
              if(rnd()<.5){q.y=bTop;q.stage=1}else{q.dir=-1;q.y=bBot;q.stage=2}}else q.stage=1}
          if(q.dir>0&&q.y>TOP+7.2)q.on=false;if(q.dir<0&&q.y<=TY+.2){q.on=false;glint(q.x,TY+.2,q.z)}}
        if(q.on)irM.put(i,q.x+Math.sin(q.ph)*.06,q.y,q.z+Math.cos(q.ph*.7)*.03,1);else irM.put(i,0,-20,0,.001)}
      irM.done();
      WP.forEach((w,i)=>{if(run)w.life-=dt;warm.put(i,w.x,w.y,w.z,Math.max(0,w.life)*1.2,120)});warm.done();
      // ---- energy books screen
      const bk=[Math.round(fl.abs),Math.round(fl.out),fl.N.toFixed(1),Math.round(fl.refl)].join("|");
      if(bk!==bookKey){bookKey=bk;book.redraw((g,w,h)=>{const FONT="Instrument Sans, system-ui, sans-serif";g.fillStyle="#fff";g.fillRect(0,0,w,h);
        g.fillStyle="#6E6A86";g.font=`600 24px ${FONT}`;g.fillText("THE ENERGY BOOKS · MODEL · W/m²",28,44);
        const row=(y,lab,v,c)=>{g.fillStyle="#222A55";g.font=`600 24px ${FONT}`;g.fillText(lab,28,y-12);g.fillStyle="#F1EEF7";g.fillRect(28,y,584,36);g.fillStyle=c;g.fillRect(28,y,Math.max(2,584*v/400),36);g.fillStyle="#222A55";g.font=`600 26px ${FONT}`;g.fillText(fmt(v),Math.min(540,40+584*v/400),y+27)};
        row(100,"Sunlight absorbed",fl.abs,SUNC);row(190,"Infrared out to space",fl.out,P.product.strawberry);
        const N=fl.N;g.fillStyle=Math.abs(N)<.3?P.deep.mint:N>0?P.deep.blush:P.deep.sky;g.font=`700 40px ${FONT}`;g.fillText(`In − out: ${sg(N)}`,28,300);
        g.font=`600 26px ${FONT}`;g.fillStyle="#6E6A86";g.fillText(balWord(N)==="balanced"?"Balanced: the temperature holds steady":N>0?"More in than out: the surface is warming":"More out than in: the surface is cooling",28,350)})}
      // ---- carbon rig: tank levels, valve wheels and beads
      tA.set(s.A/2400);tO.set(s.O/DEF.O*.82);tL.set(s.L/DEF.L*.75);tF.set(s.F/DEF.F*.9);
      const nCut=Math.round(s.c/3*8),nSap=Math.round(s.p/3*6);
      for(let j=0;j<NLT+6;j++){const a=ltp[j],sap=j>=NLT,on=sap?(j-NLT)<nSap:true,stump=!sap&&j<nCut;const top=TOP+.16+1.35*clamp(s.L/DEF.L*.75,0,1)+.02;
        const sc=sap?.55:1;lTrunk.putS(j,a[0],top+(stump?.04:.08*sc),a[1],on?sc:.001,on?(stump?.08:.16*sc):.001,on?sc:.001);
        lTree.put(j,a[0],top+.16*sc+.2*sc,a[1],on&&!stump?sc:0)}lTree.done();lTrunk.done();
      let bi=0;const cRun=run&&(k==="carbon"||k==="test");
      Object.entries(pipes).forEach(([key,pp])=>{const rate=Math.max(0,pp.d.rate());
        if(pp.w){const val=key==="fossil"?s.f/20:key==="clear"?s.c/3:key==="uptake"?s.p/3:s.q/3;pp.wq.setFromAxisAngle(V3(0,0,1),val*Math.PI*3);pp.w.quaternion.copy(pp.base).multiply(pp.wq)}
        if(cRun&&r){pp.acc+=dt*rate*1.5;while(pp.acc>=1){pp.acc--;if(pp.b.length<120)pp.b.push(0)}
          for(let j=pp.b.length-1;j>=0;j--){pp.b[j]+=dt*1.6/pp.len;if(pp.b[j]>=1)pp.b.splice(j,1)}}
        for(const u of pp.b){if(bi>=NB)break;const pt=pp.c.getPointAt(Math.min(1,u));beads.put(bi++,pt.x,pt.y,pt.z,1)}});
      for(;bi<NB;bi++)beads.put(bi,0,-20,0,.001);beads.done();
      // ---- Aotearoa: cows breathe out methane, cars puff exhaust (the processes behind the columns)
      if(k==="nz"&&r){mAcc+=dt*5;while(mAcc>=1){mAcc--;const p=MP.find(z=>z.life<=0);if(!p)break;const c=cows[Math.floor(rnd()*cows.length)];c.getWorldPosition(tmp);p.x=tmp.x+Math.cos(-c.rotation.y)*.34;p.y=TOP+.66;p.z=tmp.z+Math.sin(-c.rotation.y)*.34;p.life=2.4}
        eAcc+=dt*4;while(eAcc>=1){eAcc--;const p=EP.find(z=>z.life<=0);if(!p)break;const c=cars[Math.floor(rnd()*2)];c.getWorldPosition(tmp);p.x=tmp.x-.3;p.y=TOP+.3;p.z=tmp.z;p.life=1.6}}
      MP.forEach((p,i)=>{if(p.life>0){p.life-=dt;p.y+=dt*.55;p.x+=dt*.12}meth.put(i,p.x-ZN.x,p.y,p.z-ZN.z,Math.max(0,Math.min(1,p.life))*.7,260)});meth.done();
      EP.forEach((p,i)=>{if(p.life>0){p.life-=dt;p.y+=dt*.35;p.x-=dt*.2}exh.put(i,p.x-ZN.x,p.y,p.z-ZN.z,Math.max(0,Math.min(1,p.life))*.6,200)});exh.done();
      cars.forEach((c,j)=>{const u=((t*.18*r+j*.5)%1);c.position.set(.65+u*2.7,TOP+.17,1.75+(j?.15:-.15));c.rotation.y=0});
      colSeg.forEach((col,ci)=>{const on=(ci?"gas":"sector")===s.nzv;col.forEach(sg2=>{sg2.m.scale.set(on?1.04:.96,1,on?1.04:.96)})});
      // ---- labels
      if(curK!==k)return;
      const AIMs=tmp;
      lSun.at(AIMs.copy(LH).addScaledVector(ldir,.5)).set(`Sunlight in<b>${S0} W/m²</b><small>the lamp is the Sun</small>`);
      lRefl.at(tmp.set(DX+1.4,TOP+4.6,DZ-.2)).set(`Reflected<b>${pct(fl.alb)}</b><small>${fmt(fl.refl)} W/m² back to space</small>`);
      lSlice.at(tmp.set(DX+1.6,TOP+.4,DZ+CD/2)).set(`A slice of planet<small>crust, mantle, core · not to scale</small>`);
      lAbs.at(tmp.set(DX-1.6,TY+.2,DZ+.9)).set(`Absorbed<b>${fmt(fl.abs)} W/m²</b>`);
      lTile.at(tmp.set(tileX(s.tsel),TY+.3,tileZ(s.tsel))).set(`Tile ${s.tsel+1}: ${NAME[s.tiles[s.tsel]].toLowerCase()}<small>reflects ${pct(tileAlb(s.tsel))} · tap again to change</small>`);
      lIR.at(tmp.set(DX+1.1,TY+1.1,DZ+.9)).set(`Infrared from the surface<b>${fmt(fl.ir)} W/m²</b>`);
      lGas.at(tmp.set(DX-2.5,s.gh?BY:BY+.3,DZ+1.35)).set(s.gh?`Greenhouse gases<b>CO₂ ${fmt(ppm())} ppm</b><small>absorb ${pct(fl.eps)} of the infrared</small>`:`No greenhouse gases<small>a thought experiment</small>`);
      lBack.at(tmp.set(DX-1.3,BY-.75,DZ+1.3)).set(`Back down to the surface<b>${fmt(fl.back)} W/m²</b>`);
      lSpace.at(tmp.set(DX+.6,TOP+5.4,DZ)).set(`Infrared to space<b>${fmt(fl.out)} W/m²</b>`);
      lTemp.at(tmp.set(TH.x,TOP+Ty(s.T),TH.z)).set(`Surface<b>${fmt(s.T,1)} °C</b>`);
      lBal.at(tmp.set(scr.position.x+.6,TOP+2.2,scr.position.z)).set(`Energy in − out<b>${sg(fl.N)} W/m²</b><small>${balWord(fl.N)}</small>`).cls(Math.abs(fl.N)>=.3?"hot":"");
      const vc=vis.length?cloudAt[vis[0]]:cloudAt[0];lCloud.at(tmp.set(vc[0],vc[1]+.2,vc[2])).set(`Clouds ${pct(s.cloud)}<small>reflect half the light that hits them</small>`);
      const ii=s.tiles.indexOf("ice"),il=iceLeft();lIce.at(tmp.set(ii>=0?tileX(ii):DX,TY+.3,ii>=0?tileZ(ii):DZ)).set(il==null?`No ice tiles<small>set a tile to ice</small>`:`Ice left<b>${pct(il)}</b><small>feedback ${s.fb?"on":"off"}</small>`);
      lAtm.at(tmp.set(ZC.x,TOP+AY+2.2,-1.9)).set(`Atmosphere<b>${fmt(s.A)} GtC</b><small>${fmt(ppm())} ppm CO₂</small>`);
      lOcean.at(tmp.set(ZC.x-3.6,TOP+1.9,1.25)).set(`Ocean<b>${fmt(s.O)} GtC</b>${narrow?"":`<small>takes up ${fmt(sinkO(),1)} a year</small>`}`);
      lLand.at(tmp.set(ZC.x+4.4,TOP+.8,1.7)).set(`Plants and soil<b>${fmt(s.L)} GtC</b>${narrow?"":`<small>take up ${fmt(sinkL()+s.p,1)} a year</small>`}`);
      lFossil.at(tmp.set(ZC.x+4.5,TOP+1.0,-2.15)).set(`Fossil carbon<b>${fmt(s.F)} GtC</b>${narrow?"":"<small>known coal, oil and gas reserves</small>"}`);
      lNet.at(tmp.set(ZC.x-.95,TOP+AY+.9,-1.9)).set(`Into the air<b>${sg(netA())} GtC a year</b><small>model year ${sg(s.yr,0)}</small>`);
      const vp=(key)=>pipes[key].w.getWorldPosition(tmp2);
      lVF.at(vp("fossil")).set(`Burn fossil fuels<b>${fmt(fos(),1)}</b>`);lVC.at(vp("clear")).set(`Clear forest<b>${fmt(s.c,1)}</b>`);
      lVP.at(vp("uptake")).set(`Plant forest<b>${fmt(s.p,1)}</b>`);lVQ.at(vp("capture")).set(`Capture and store<b>${fmt(s.q,1)}</b>`);
      lNZ.at(tmp.set(ZN.x+colX[0],TOP+3.5,-1.15)).set(`Aotearoa, 2024<b>${NZ.gross} Mt CO₂-e gross</b><small>Ministry for the Environment</small>`);
      const ci=s.nzv==="gas"?1:0,col=colSeg[ci];lSeg.forEach((l,j)=>{const g=col[j];if(!g||k!=="nz"){l.hide();return}l.show();l.at(tmp.set(ZN.x+colX[ci]-.6,g.y,-1.15+.6)).set(narrow?`${esc(g.n.split(" (")[0])} · ${g.v}%`:`${esc(g.n)}<b>${g.v}%</b>`)});
      lOther.at(tmp.set(ZN.x+colX[1-ci]+.7,TOP+2.2,-.45)).set(ci?"By sector<small>tap to sort by sector</small>":"By gas<small>tap to sort by gas</small>");
      lCows.at(tmp.set(ZN.x-2.6,TOP+.9,1.8)).set(`Cattle and sheep<small>methane from digesting grass</small>`);
      lCars.at(tmp.set(ZN.x+2.4,TOP+.5,1.75)).set(`Road transport<small>carbon dioxide</small>`);
      lGrove.at(tmp.set(ZN.x+3.6,TOP+.7,-1.7)).set(`Forests took up<b>${fmt(NZ.forest,1)} Mt</b><small>${NZ.forestPct}% of gross</small>`);
    }};
}

// ---------------------------------------------------------------- mount
const set=k=>(x,v)=>{s[k]=v};
StudyKit.mount({kupu:KUPU,caseTint:"sky",scene3d:climate3d,
  eyebrow:"Science · Earth systems and climate", title:"The climate machine", crumb:"Year 9–10 science · Earth systems, the carbon cycle and climate change", homeHash:"y10",
  fig:"FIG. 19 · AN EARTH ENERGY RIG", railTitle:"How energy and carbon set the climate",
  badge:{label:"Years 9–10 · NCEA L2 ESS 91193"},
  mainBox:"0 0 640 330", mainPhoneBig:true, mainLabel:"A lamp shining on a slice of planet with eight surface tiles, clouds, a greenhouse-gas blanket and a thermometer, beside four linked carbon tanks", closeBox:"0 0 420 260",
  state:s, steps,
  controls:[{type:"play"},
    {type:"button",id:"reset",label:"Reset to today",onClick:(x,api)=>{resetAll();const st=api.step;if(st&&st.k!=="test"&&st.onStep)st.onStep()}},
    {type:"select",id:"tile",label:"Tile",options:Array.from({length:TILE_N},(_,i)=>[String(i),String(i+1)]),get:()=>String(s.tsel),set:(x,v)=>{s.tsel=+v}},
    {type:"select",id:"surf",label:"Make it",options:TYPES.map(t=>[t,`${NAME[t]} (albedo ${fmt(ALB[t],2)})`]),get:()=>s.tiles[s.tsel],set:(x,v)=>setTile(s.tsel,v)},
    {type:"range",id:"cloud",label:"Cloud cover",min:0,max:1,step:0.05,get:()=>s.cloud,set:set("cloud"),fmt:()=>pct(s.cloud)},
    {type:"toggle",id:"gh",label:"Greenhouse gases",get:()=>s.gh,set:set("gh"),labelFn:()=>s.gh?"Greenhouse gases: on":"Greenhouse gases: off"},
    {type:"range",id:"co2",label:"CO₂ in the air",min:180,max:1500,step:5,get:()=>Math.round(ppm()),set:(x,v)=>{s.A=v*PPM_GTC},fmt:()=>fmt(ppm())+" ppm"},
    {type:"toggle",id:"fb",label:"Ice–albedo feedback",get:()=>s.fb,set:(x,v)=>{s.fb=v;if(!v)s.ic=s.tiles.map(icFixed)},labelFn:()=>s.fb?"Ice–albedo feedback: on":"Ice–albedo feedback: off"},
    {type:"range",id:"fossil",label:"Burn fossil fuels",min:0,max:20,step:0.5,get:()=>s.f,set:set("f"),fmt:()=>fmt(s.f,1)+" GtC/yr"},
    {type:"range",id:"clear",label:"Clear forest",min:0,max:3,step:0.1,get:()=>s.c,set:set("c"),fmt:()=>fmt(s.c,1)+" GtC/yr"},
    {type:"range",id:"plant",label:"Plant forest",min:0,max:3,step:0.1,get:()=>s.p,set:set("p"),fmt:()=>fmt(s.p,1)+" GtC/yr"},
    {type:"range",id:"capture",label:"Capture and store",min:0,max:3,step:0.1,get:()=>s.q,set:set("q"),fmt:()=>fmt(s.q,1)+" GtC/yr"},
    {type:"select",id:"nzv",label:"Sort by",options:[["sector","Sector"],["gas","Gas"]],get:()=>s.nzv,set:set("nzv")}],
  tick:(x,dt,st)=>{const runC=st.k==="carbon"||st.k==="test";let yrs=dt*SPEED;while(yrs>1e-9){const h=Math.min(.1,yrs);advance(h,runC);yrs-=h}},
  drawMain, drawClose,
  chips:()=>{const fl=flows(),il=iceLeft();return{
    sun:["SUNLIGHT IN",S0+" W/m²"],refl:["REFLECTED",pct(fl.alb)],abs:["ABSORBED",fmt(fl.abs)+" W/m²"],alb:["ALBEDO",fmt(fl.alb,2),true],
    tile:["TILE "+(s.tsel+1),`${NAME[s.tiles[s.tsel]]} · reflects ${pct(tileAlb(s.tsel))}`],temp:["SURFACE TEMPERATURE",fmt(s.T,1)+" °C",true],
    ir:["INFRARED FROM SURFACE",fmt(fl.ir)+" W/m²"],out:["INFRARED TO SPACE",fmt(fl.out)+" W/m²"],back:["BACK DOWN TO SURFACE",fmt(fl.back)+" W/m²"],
    bal:["ENERGY IN − OUT",`${sg(fl.N)} W/m² · ${balWord(fl.N)}`],co2:["CO₂ IN THE AIR",fmt(ppm())+" ppm"],atm:["ATMOSPHERE STORE",fmt(s.A)+" GtC"],
    net:["INTO THE AIR",sg(netA())+" GtC a year",true],fos:["FOSSIL FUELS BURNED",fmt(fos(),1)+" GtC a year"],yr:["MODEL YEAR",sg(s.yr,0)],
    ice:["ICE LEFT",il==null?"no ice tiles":pct(il),s.fb],
    gross:["GROSS EMISSIONS 2024",NZ.gross+" Mt CO₂-e"],agri:["AGRICULTURE","about 53%",true],meth:["METHANE","48% of gross"],forest:["FORESTS TOOK UP",fmt(NZ.forest,1)+" Mt CO₂-e"]}},
  challenges:[
    {q:"Make the slice reflect at least 40% of the sunlight using only the tiles (keep cloud cover at 40%).",
     check:()=>Math.abs(s.cloud-DEF.cloud)<1e-6&&alb()>=0.40,
     ok:"Yes: ice reflects about 70% of the light that hits it, ocean only about 6%. A brighter surface absorbs less sunlight.",
     no:()=>Math.abs(s.cloud-DEF.cloud)>1e-6?"Put cloud cover back to 40% and use the tiles.":`Reflecting ${pct(alb())} now. Swap dark tiles for bright ones: which surface has the highest albedo?`},
    {q:"Balance the energy books at a warmer surface: energy in and out within 0.5 W/m², with the surface at 20 °C or more.",
     check:()=>s.T>=20&&Math.abs(flows().N)<=0.5,
     ok:"Balanced: the warmer surface gives off more infrared, until energy out matches energy in again.",
     no:()=>{const N=flows().N;return s.T<20?`The surface is ${fmt(s.T,1)} °C. Make the slice absorb more (fewer clouds, darker tiles), then press Play and wait.`:`Warm enough, but in − out is ${sg(N)} W/m². Press Play and let it settle.`}},
    {q:"Show the ice–albedo feedback: with the feedback on, warm the slice until at least a quarter of the ice has melted.",
     check:()=>{const il=iceLeft();return s.fb&&il!=null&&il<=0.75},
     ok:"Yes: melting ice uncovered dark ocean, which absorbs more sunlight, which warmed the slice more. A reinforcing feedback.",
     no:()=>{const il=iceLeft();return il==null?"There's no ice left to melt. Set a tile to ice first.":!s.fb?"Turn the ice–albedo feedback on first.":`Ice left: ${pct(il)}. Warm the slice more and press Play.`}},
    {q:"Make the air's carbon go down without changing fossil emissions (keep burning 10 GtC a year).",
     check:()=>s.f===DEF.f&&netA()<0&&s.A<=A0+1,
     ok:"Yes: with no clearing, plenty of planting and capture, the sinks beat the fossil flow. It took the land and capture valves near full. Real forests and capture have limits, which is why cutting fossil emissions matters most.",
     no:()=>s.f!==DEF.f?"Put the fossil fuel valve back to 10 GtC a year.":s.A>A0+1?`The air holds ${fmt(s.A)} GtC, more than today's ${fmt(A0)}. Press Reset to today and try again.`:`Carbon is still going into the air (${sg(netA())} GtC a year). Use the other valves.`}],
  papers:[{label:"NZQA: Earth and Space Science",url:"https://www2.nzqa.govt.nz/ncea/subjects/past-exams-and-exemplars/earth-and-space-science/"},
    {label:"MfE: Greenhouse Gas Inventory 1990–2024",url:"https://environment.govt.nz/publications/new-zealands-greenhouse-gas-inventory-19902024-snapshot/"},
    {label:"NOAA: CO₂ trends",url:"https://gml.noaa.gov/ccgg/trends/"}],
  truth:"An illustrative model, not a forecast. The slice is one well-mixed surface under one greenhouse 'blanket': it leaves out convection, evaporation, the deep ocean and clouds trapping infrared, and it is tuned so today's slice settles at 15 °C. The ice tile's feedback is stronger than the real global one (IPCC AR6 puts surface albedo at about 0.35 W/m² per °C), so you can see it. The carbon sinks simply grow with the extra CO₂. Tiles, clouds, blanket thickness, tank sizes and particle numbers are drawn for clarity, not to scale. Sources: sunlight (340 W/m²), about 29% reflected, about 15 °C average and 'more than 30 degrees' of natural greenhouse warming from NASA Earth Observatory; albedo values from Penn State EARTH 103 and CU Boulder MOSAiC, cities vs cropland from Ouyang et al. (2022, Nature Communications); CO₂ forcing (3.93 W/m² for doubling) and the water-vapour feedback (1.30 W/m² per °C) from IPCC AR6 WG1 chapter 7; carbon stores and natural flows from IPCC AR6 WG1 Figure 5.12; fossil and land-use emissions, ocean and land sinks, shares 50/29/21%, sink weakening and CO₂ in 2025 (425.6 ppm; 1 ppm = 2.124 GtC) from the Global Carbon Budget 2025 (Friedlingstein et al., ESSD); Mauna Loa yearly means from NOAA GML and Scripps; New Zealand figures from the Ministry for the Environment's Greenhouse Gas Inventory 1990–2024 Snapshot (April 2026); gas lifetimes and methane sources from He Pou a Rangi Climate Change Commission.",
  footer:"Covers Years 9–10 science: Earth systems (energy transfers through the atmosphere, hydrosphere, biosphere and lithosphere, and the carbon cycle) and climate change (CO₂ data trends, human sources, mitigation such as reforestation and cutting fossil fuel use). The radiation steps also support NCEA Level 2 Earth and Space Science AS 91193 (reflection, absorption and transmission of visible and infrared radiation, and links to climate change)."
});
})();
