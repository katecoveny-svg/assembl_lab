(()=>{
// ---------- a made-up survey of a shingle beach, from the top of the beach (0 m) down to the sea (40 m)
const D=[0,5,10,15,20,25,30,35,40];
const SOIL=[18,15,13,9,6,3,1,0,0];      // cm
const HEIGHT=[42,36,30,21,12,7,3,0,0];  // average plant height, cm
const COUNT=[14,13,11,8,5,3,1,0,0];     // plants in the quadrat
const s={walk:0,factor:"shelter",stoats:4,show:"height"};
const FACTORS={
  shelter:["Shelter and nesting sites","Banded dotterels nest on open shingle above the high-tide line, away from waves; seabirds and lizards shelter among the plants at the top of the beach.","Where there is shelter, animals that need protection from wind, waves and predators are found."],
  nutrients:["Nutrients","Plants grow best at the top of the beach, where dead plant material has built up into soil that holds nutrients. Near the sea there is bare shingle and almost no soil.","Plants need nutrients from soil, so they are found where soil is deeper."],
  temperature:["Temperature","Bare shingle heats up in the sun and cools quickly at night; plant cover keeps the ground cooler and damper.","Organisms are found where the temperature suits them; some can't survive extremes."],
  light:["Light","Out on the open beach there's plenty of light. Under tall plants it is shaded, so only shade-tolerant plants grow underneath.","Plants need light to photosynthesise, so they're found where there's enough light."],
  water:["Water and salt","Near the sea, salt spray and waves dry out and damage plants, and water drains straight through shingle.","Few plants can survive salt spray and dry, loose shingle, so plants are spread unevenly."]};
// food chain populations respond to predators (illustrative)
function pops(){const st=s.stoats;const dot=Math.max(4,Math.round(60*(1-0.085*st)));const ins=Math.round(900*(1+0.004*(60-dot)));return{plants:12000,ins,dot,st}}
const X=d=>60+d/40*520;
// ---------- drawing (the bench figure look: StudyKit.fig): the beach as a cut-away diorama in a frosted mint case
const F=StudyKit.fig,PAL=F.palette,TINT=PAL.case.mint,AX="#8F9BAA";
const SHINGLE="#DCD5C8",SOILC="#C9A27C",LEAF="#7FB65A",LEAFD="#4F8A3A",SEA=PAL.product.blueberry;
const DD=14,DDY=-DD*0.55;  // diorama depth: the top surface runs back up and to the right
function figure(x,y,c){return `<g transform="translate(${x},${y})"><circle r="5.5" cy="-10" fill="#F2D0B4" stroke="#B88A6A"/><rect x="-5" y="-4" width="10" height="15" rx="4" fill="${c}" stroke="${F.mat("painted",c).stroke}"/><path d="M-2.5,11 v6 M2.5,11 v6" stroke="#4E4868" stroke-width="2.2" stroke-linecap="round"/></g>`}
function bird(x,y,r){return `<g transform="translate(${x},${y})"><path d="M${-r*1.6},${r*0.4} l${r*1.4},${r*0.75} h${r*2.6}" fill="none" stroke="${PAL.shadow}" stroke-opacity=".18" stroke-width="${r*0.9}" stroke-linecap="round"/><ellipse rx="${r*1.5}" ry="${r*1.1}" fill="#FBF6EC" stroke="#A89A86"/><path d="M${-r*1.1},${-r*0.5} a${r*1.5},${r*1.1} 0 0 1 ${r*2.2},0" fill="none" stroke="#C9B89E" stroke-width="${r*0.5}" opacity=".7"/><rect x="${-r}" y="${-r*0.15}" width="${r*2}" height="${r*0.4}" rx="${r*0.2}" fill="${PAL.product.strawberry}"/><circle cx="${r*1.3}" cy="${-r}" r="${r*0.62}" fill="#FBF6EC" stroke="#A89A86"/></g>`}
function drawMain(st0,st){
  let o=F.floor(640,330);
  // sky labels
  o+=`<text class="t-lab" x="60" y="22">TOP OF BEACH · 0 m</text><text class="t-lab" x="580" y="22" text-anchor="end">SEA · 40 m</text>`;
  // ground profile: slopes down to the sea
  const gy=d=>150+d*2.3,L=24,R=616,B=300,CT=38;
  // the case sits on the floor: back panel and floor shadow first
  o+=F.shadow(L,B,R-L+DD,{len:70,opacity:.16});
  o+=`<rect x="${L+DD}" y="${CT+DDY}" width="${R-L}" height="${B-CT}" rx="10" fill="${TINT}" fill-opacity=".22" stroke="${F.deep(TINT)}" stroke-opacity=".5"/>`;
  // top surface of the ground (seen from slightly above), then the cut face
  let top=`M${L},${gy(0)}`;D.forEach(d=>top+=` L${X(d)},${gy(d)}`);top+=` L${R},${gy(40)+8} l${DD},${DDY} `;[...D].reverse().forEach(d=>top+=` L${X(d)+DD},${gy(d)+DDY}`);top+=` L${L+DD},${gy(0)+DDY}Z`;
  o+=`<path d="${top}" fill="#EEE8DC" stroke="#B9AE9C" stroke-width="1"/>`;
  let topSoil=`M${L},${gy(0)}`;D.forEach((d,i)=>{if(SOIL[i]>0)topSoil+=` L${X(d)},${gy(d)}`});const lastSoil=D[SOIL.findIndex(v=>v===0)-1]??0;
  topSoil+=` L${X(lastSoil)+6},${gy(lastSoil)+3} l${DD},${DDY}`;[...D].filter((d,i)=>SOIL[i]>0).reverse().forEach(d=>topSoil+=` L${X(d)+DD},${gy(d)+DDY}`);topSoil+=` L${L+DD},${gy(0)+DDY}Z`;
  o+=`<path d="${topSoil}" fill="#B5CF8E" opacity=".75"/>`;
  let ground=`M${L},${gy(0)}`;D.forEach(d=>ground+=` L${X(d)},${gy(d)}`);ground+=` L${R},${gy(40)+8} L${R},${B} L${L},${B}Z`;
  o+=`<path d="${ground}" fill="${SHINGLE}" stroke="#A89E8C" stroke-width="1.2"/>`;
  // soil layer on top of shingle
  let soil="";D.forEach((d,i)=>soil+=(i?"L":"M")+X(d)+","+(gy(d)-0));for(let i=D.length-1;i>=0;i--)soil+=` L${X(D[i])},${gy(D[i])+SOIL[i]*1.6}`;
  o+=`<path d="${soil}Z" fill="${SOILC}" opacity=".85"/>`;
  // shingle pebbles in the cut face
  for(let i=0;i<70;i++){const d=(i*37%40),dy=(i*13%30),px=X(d)+((i*7)%9),py=gy(d)+20+dy,r=2+(i%3);if(py+r<B-2)o+=`<ellipse cx="${px}" cy="${py}" rx="${r*1.25}" ry="${r}" fill="${["#B8AE9E","#A99F90","#C6BDAE"][i%3]}" stroke="#8C8273" stroke-width=".6"/><path d="M${px-r*0.8},${py-r*0.3} q${r*0.6},${-r*0.6} ${r*1.2},${-r*0.5}" fill="none" stroke="#fff" stroke-width=".9" opacity=".6"/>`}
  // sea: translucent water with a lit surface
  const wave=Math.sin(Date.now()/600)*3;
  o+=`<path d="M${X(36)},${gy(36)+6+wave} Q${X(40)},${gy(40)-6+wave} ${R},${gy(40)+wave} L${R},${B} L${X(36)},${B}Z" fill="${SEA}" opacity=".5"/>`;
  o+=`<path d="M${X(36)},${gy(36)+6+wave} Q${X(40)},${gy(40)-6+wave} ${R},${gy(40)+wave}" fill="none" stroke="#fff" stroke-width="2" opacity=".85"/>`;
  // plants
  D.forEach((d,i)=>{const h=HEIGHT[i]*1.6,n=Math.min(5,Math.ceil(COUNT[i]/3));for(let k=0;k<n;k++){const x=X(d)-14+k*7+DD*0.4,y=gy(d)+DDY*0.4;if(h>0)o+=`<path d="M${x},${y} q-4,${-h*0.6} 0,${-h} M${x},${y} q5,${-h*0.5} 6,${-h*0.8}" fill="none" stroke="${LEAFD}" stroke-width="3.4" stroke-linecap="round"/><path d="M${x},${y} q-4,${-h*0.6} 0,${-h} M${x},${y} q5,${-h*0.5} 6,${-h*0.8}" fill="none" stroke="${LEAF}" stroke-width="1.8" stroke-linecap="round"/>`}});
  // the frosted front of the case over the diorama
  o+=F.acrylic(L,CT,R-L,B-CT,{tint:TINT,d:DD,r:10,opacity:.1,shadow:false});
  // dotterel nest on open shingle
  if(st.k==="factors"&&s.factor==="shelter")o+=bird(X(24),gy(24)-8,6)+F.pill(X(24)-52,gy(24)-52,"Dotterel nest",{ax:X(24),ay:gy(24)-16});
  if(st.k==="factors"){const f=s.factor;
    const band={shelter:[0,12],nutrients:[0,15],temperature:[18,34],light:[20,40],water:[28,40]}[f];
    o+=`<rect x="${X(band[0])}" y="40" width="${X(band[1])-X(band[0])}" height="60" rx="10" fill="${PAL.product.butter}" opacity=".3" stroke="${PAL.product.butter}"/><text class="t-ink" x="${(X(band[0])+X(band[1]))/2}" y="74" text-anchor="middle">${FACTORS[f][0]}</text>`}
  // transect line and quadrats
  if(["transect","soil","test"].includes(st.k)){o+=`<line x1="${X(0)}" x2="${X(40)}" y1="118" y2="118" stroke="#4E4868" stroke-width="1.2" stroke-dasharray="4 3"/>`;
    D.forEach((d,i)=>{const done=d<=s.walk,qx=X(d)-12,qy=gy(d)-2;o+=`<path d="M${qx},${qy} l${DD*0.6},${DDY*0.6} h24 l${-DD*0.6},${-DDY*0.6}z" fill="${done?PAL.product.butter:"none"}" fill-opacity=".45" stroke="${done?"#B08A2E":AX}" stroke-width="${done?2:1.2}"/><text class="t-lab" x="${X(d)}" y="112" text-anchor="middle">${d}</text>`});
    const wx=X(Math.min(40,s.walk));o+=figure(wx+4,gy(Math.min(40,s.walk))-20,PAL.product.strawberry)}
  if(st.k==="chain"||st.k==="pyramid"){const P=pops();
    o+=`<text class="t-ink" x="320" y="60" text-anchor="middle">${P.st} stoats hunting this beach</text>`;
    for(let k=0;k<P.st;k++){const m=F.mat("painted","#C98F62");o+=`<g transform="translate(${80+k*36},96)"><path d="M-12,4 l10,5 h24 l-10,-5z" fill="${PAL.shadow}" opacity=".14"/><path d="M-12,0 q12,-9 24,0 q-12,7 -24,0z" fill="#C98F62" stroke="${m.stroke}"/><path d="M-8,-2 q8,-5 16,0" fill="none" stroke="${m.hi}" stroke-width="2" stroke-linecap="round"/><path d="M-10,1 q8,4 18,1" fill="none" stroke="#F4E6D2" stroke-width="2"/><path d="M12,0 l8,-3" stroke="${m.stroke}" stroke-width="1.6" stroke-linecap="round"/><path d="M-12,0 l-8,2" stroke="#4E4868" stroke-width="2" stroke-linecap="round"/></g>`}
    const nd=Math.round(P.dot/10);for(let k=0;k<nd;k++)o+=bird(X(14+k*3),gy(14+k*3)-6,4.2)}
  return o;
}
function drawClose(st0,st){
  let o=F.floor(420,260);
  if(["transect","soil","test","habitat"].includes(st.k)){
    const which=st.k==="soil"?"soil":"height";const vals=which==="soil"?SOIL:HEIGHT,max=which==="soil"?20:50,lab=which==="soil"?"SOIL DEPTH (cm)":"AVERAGE PLANT HEIGHT (cm)";
    o+=`<text class="t-lab" x="14" y="22">${lab} ALONG THE TRANSECT</text>`;
    const XX=d=>44+d/40*350,YY=v=>200-v/max*160;o+=`<line x1="44" x2="394" y1="200" y2="200" stroke="${AX}"/><line x1="44" x2="44" y1="34" y2="200" stroke="${AX}"/>`;
    [0,max/2,max].forEach(v=>o+=`<text class="t-lab" x="38" y="${YY(v)+3.5}" text-anchor="end">${v}</text>`);
    const c=which==="soil"?PAL.product.peach:PAL.product.lime,m=F.mat("painted",c);
    D.forEach((d,i)=>{o+=`<text class="t-lab" x="${XX(d)}" y="214" text-anchor="middle">${d}</text>`;if(st.k==="habitat"||d<=s.walk||st.k==="soil")o+=`<rect x="${XX(d)-12}" y="${YY(vals[i])}" width="24" height="${200-YY(vals[i])}" rx="3" fill="${c}" stroke="${m.stroke}" stroke-width=".9"/><rect x="${XX(d)-8}" y="${YY(vals[i])+3}" width="3" height="${Math.max(0,200-YY(vals[i])-6)}" rx="1.5" fill="#fff" opacity=".55"/>`});
    o+=`<text class="t-lab" x="220" y="230" text-anchor="middle">DISTANCE FROM TOP OF BEACH (m)</text>`;
    if(st.k==="soil")o+=`<text class="t-body" x="14" y="252">Soil gets shallower towards the sea, and so do the plants.</text>`;
    else o+=`<text class="t-body" x="14" y="252">${s.walk>=40?"Plants get shorter, then disappear, towards the sea.":"Press Play to walk the transect, one quadrat every 5 m."}</text>`;
    return o;}
  if(st.k==="factors"){const f=FACTORS[s.factor];o+=`<text class="t-lab" x="14" y="22">${f[0].toUpperCase()}</text>`;
    const wrap=(t,y)=>{const words=t.split(" ");let line="",out="",yy=y;words.forEach(w=>{if((line+w).length>58){out+=`<text class="t-body" x="14" y="${yy}">${line}</text>`;yy+=17;line=""}line+=w+" "});return out+`<text class="t-body" x="14" y="${yy}">${line}</text>`};
    o+=wrap(f[1],50)+`<text class="t-lab" x="14" y="168">THE RULE</text>`+wrap(f[2],188);return o;}
  // food chain and pyramid
  const P=pops();const chain=[["Plants (pōhuehue, grasses)","Producer",P.plants],["Insects and sandhoppers","Primary consumer",P.ins],["Banded dotterel","Secondary consumer",P.dot],["Stoat","Tertiary consumer",P.st]];
  const LV=[PAL.product.lime,PAL.product.butter,PAL.product.blueberry,PAL.product.peach];
  if(st.k==="chain"){o+=`<text class="t-lab" x="14" y="22">FOOD CHAIN: ARROWS SHOW WHERE ENERGY GOES</text>`;
    chain.forEach((c,i)=>{const y=40+i*52;o+=`<rect x="14" y="${y}" width="250" height="38" rx="8" fill="#fff" stroke="#DCD6EA"/><rect x="14" y="${y}" width="7" height="38" rx="3.5" fill="${LV[i]}"/><text class="t-ink" x="26" y="${y+16}">${c[0]}</text><text class="t-lab" x="26" y="${y+31}">${c[1].toUpperCase()} · LEVEL ${i+1}</text><text class="t-ink" x="390" y="${y+24}" text-anchor="end">≈ ${c[2].toLocaleString("en-NZ")}</text>`;
      if(i<3)o+=`<path d="M139,${y+38} v12" stroke="#4E4868" stroke-width="1.6"/><path d="M134,${y+44} l5,6 l5,-6" fill="none" stroke="#4E4868" stroke-width="1.6"/>`});
    return o;}
  o+=`<text class="t-lab" x="14" y="22">ENERGY PYRAMID: ABOUT 10% PASSES UP EACH LEVEL</text>`;
  const E=[10000,1000,100,10];E.forEach((e,i)=>{const w=360*Math.pow(e/10000,0.38),y=196-i*44,c=LV[i];o+=`<rect x="${210-w/2}" y="${y}" width="${w}" height="36" rx="4" fill="${c}" stroke="${F.mat("painted",c).stroke}"/><text class="t-ink" x="210" y="${y+22}" text-anchor="middle">${chain[i][0].split(" (")[0]} · ${e.toLocaleString("en-NZ")} kJ</text>`});
  o+=`<text class="t-body" x="14" y="250">The rest is used for living (respiration) and lost as heat.</text>`;return o;
}
const steps=[
 {k:"habitat",lab:"The beach",cap:"A shingle beach from the top (0 m) down to the sea (40 m). The plants change along the way. Your job: work out why.",speed:0,controls:[],
  big:"<b>The big idea:</b> organisms are found where the conditions suit them. Abiotic factors (non-living: soil, water, light, temperature, salt) and biotic factors (living: food, predators, competition) decide the distribution.",
  exam:"The distribution of an organism is where it is found in an environment. It depends on abiotic factors, such as soil depth, light, temperature and salt spray, and biotic factors, such as food, predators and competition.",
  trap:"Calling soil or temperature biotic. Biotic means living things; abiotic means non-living conditions.",chips:["zone"]},
 {k:"transect",lab:"Walk a transect",cap:"Lay a tape from the top of the beach to the sea and place a quadrat every 5 m. Press Play to walk it and record the plant height in each quadrat.",speed:1,speedLabel:"one quadrat ≈ every 0.6 s",controls:["play","restart"],
  big:"<b>The big idea:</b> a line transect with quadrats at regular intervals shows how organisms change across an environment.",
  exam:"The students used a line transect, measuring the height of the plants in a quadrat every 5 metres from the top of the beach towards the sea. The average plant height decreased from 42 cm at the top of the beach to 0 cm at 35 m, where no plants were found.",
  trap:"Describing the trend without numbers. Quote values from the data, with units.",chips:["at","height","count"],onStep:()=>{s.walk=0}},
 {k:"soil",lab:"Soil depth",cap:"The same transect, now measuring soil depth. Compare the two graphs: where the soil is deep, the plants are tall.",speed:0,controls:[],
  big:"<b>The big idea (Merit and Excellence):</b> link two sets of data and explain the link with science, not just describe it.",
  exam:"As the distance from the top of the beach increases, the soil gets shallower, from 18 cm at 0 m to 0 cm at 35 m. The plants also get shorter and fewer. This suggests deeper soil helps plants grow, because it holds more water and nutrients and gives roots something to anchor in.",
  trap:"Saying soil depth definitely causes the change. Other factors, like salt spray, also change along the beach, so say \"suggests\".",chips:["soilTop","soilSea"],onStep:()=>{s.walk=40}},
 {k:"factors",lab:"Why there?",cap:"Pick a factor to see how it shapes where things live on this beach. Each one is a classic exam question.",speed:0,controls:["factor"],
  big:"<b>The big idea:</b> for each factor, say what it is, how it changes across the environment, and give a real plant or animal example.",
  exam:"Availability of nesting sites affects distribution because animals can only breed where there is a safe place to nest. For example, banded dotterels nest on open shingle above the high-tide line, so they are found at the upper part of shingle beaches.",
  trap:"Giving a factor without an example. These questions ask for a plant or animal each time.",chips:["factorc"]},
 {k:"chain",lab:"Food chain",cap:"Who eats whom on the beach. Add stoats and watch the dotterels drop, and the insects they eat increase.",speed:0,controls:["stoats"],
  big:"<b>The big idea:</b> a food chain shows the flow of energy. Change one level and the levels around it change too.",
  exam:"In the food chain plants → insects → banded dotterel → stoat, the plants are producers because they make their own food by photosynthesis. When stoats increase, they eat more dotterels and their eggs, so the dotterel population falls, and with fewer dotterels eating them, the insect population can increase.",
  trap:"Drawing arrows the wrong way. Arrows point to the eater: they show which way the energy goes.",chips:["stoats","dot","ins"]},
 {k:"pyramid",lab:"Trophic levels",cap:"Each step up the food chain is a trophic level. Only about a tenth of the energy makes it to the next level.",speed:0,controls:["stoats"],
  big:"<b>The big idea:</b> energy is lost at every trophic level, mostly as heat from respiration, which is why there are far fewer top predators than plants.",
  exam:"Only about 10% of the energy at one trophic level is passed on to the next. The rest is used by the organisms for respiration and movement and is lost as heat. This is why food chains rarely have more than four or five levels.",
  trap:"Saying energy is recycled. Nutrients are recycled; energy flows through and is lost as heat.",chips:["dot","stoats"]},
 {k:"test",lab:"Test yourself",cap:"Use the controls to answer each one, then press Check.",speed:1,speedLabel:"walk the transect",controls:["play","restart","factor","stoats"],
  big:"<b>Exam tip:</b> describe the pattern with numbers, explain it with a factor, and give a named example.",
  chips:["at","stoats","factorc"],onStep:()=>{s.walk=40}}
];
// ---- kupu Māori: te reo terms for this machine, each checked in Te Aka Māori Dictionary (ta = word id). Sources and notes: te-reo-notes.md
const KUPU=[
 {mi:"pūnaha hauropi",en:"ecosystem",ta:40334},
 {mi:"nōhanga",en:"habitat",ta:4432},
 {mi:"rauropi",en:"organism",ta:38797},
 {mi:"momo",en:"type, kind, species",ta:4184},
 {mi:"taupori",en:"population",ta:38688},
 {mi:"oneone",en:"soil",ta:4770},
 {mi:"urutau",en:"to adapt",ta:40435},
 {mi:"raupapa kame",en:"food chain",ta:40170}];
Object.entries({"habitat": ["nōhanga", "pūnaha hauropi"], "transect": ["momo", "taupori"], "soil": ["oneone"], "factors": ["urutau", "nōhanga"], "chain": ["raupapa kame", "rauropi"], "pyramid": ["raupapa kame", "taupori"]}).forEach(([k,a])=>{const st=steps.find(x=>x.k===k);if(st)st.kupu=a});
// ---------- the 3D bench: the shingle beach as a cut-away diorama, plus an energy pyramid
function ecology3d(S){window.__S=S;const {THREE,mat,PAL}=S;const V3=(x,y,z)=>new THREE.Vector3(x,y,z);
  const TOP=.3,ZP=V3(15.5,0,0),HD=2.2;   // beach half-depth
  const plinth=(c,w,d,tint)=>{const p=S.rbox(w,.3,d,.12,mat("plastic",tint,{rough:.55,coat:.2}));p.position.set(c.x,.15,c.z);S.scene.add(p);return p};
  plinth(V3(0,0,0),19.4,6.4,PAL.case.mint);plinth(ZP,7.4,6.2,PAL.case.lavender);
  const FONT="Instrument Sans, system-ui, sans-serif";
  const lerpA=(A,d)=>{const f=S.clamp(d/5,0,8),i=Math.min(7,Math.floor(f));return S.lerp(A[i],A[i+1],f-i)};
  const X=d=>-8.4+d*.4;                                  // metres along the transect → world x
  const SF=d=>.85+1.45*(1-d/40);                          // ground surface height
  const ST=d=>lerpA(SOIL,d)*.042;                         // soil thickness (exaggerated)
  const tmp=new THREE.Vector3();
  const rnd=(()=>{let x=12345;return()=>(x=(x*16807)%2147483647)/2147483647})();
  // ---------------------------------------------------------------- the ground: shingle with a soil layer on top, cut away at the front
  const ext=(pts,m)=>{const sh=new THREE.Shape(pts.map(p=>new THREE.Vector2(p[0],p[1])));const g=new THREE.ExtrudeGeometry(sh,{depth:HD*2,bevelEnabled:false,curveSegments:4});g.translate(0,0,-HD);return S.mesh(g,m)};
  const shP=[[X(0),TOP]];for(let d=0;d<=40;d+=1)shP.push([X(d),SF(d)-ST(d)]);shP.push([X(40)+.8,SF(40)-.08],[X(40)+.8,TOP]);
  S.scene.add(ext(shP,mat("matte","#DCD5C8",{rough:.9})));
  const soP=[];for(let d=0;d<=28;d+=1)soP.push([X(d),SF(d)+.005]);for(let d=28;d>=0;d-=1)soP.push([X(d),SF(d)-ST(d)]);
  S.scene.add(ext(soP,mat("matte","#C9A27C",{rough:.85})));
  const mossP=[];for(let d=0;d<=24;d+=1)mossP.push([X(d),SF(d)+.03]);mossP.push([X(26),SF(26)+.005]);for(let d=24;d>=0;d-=1)mossP.push([X(d),SF(d)]);
  S.scene.add(ext(mossP,mat("matte","#B5CF8E",{rough:.8})));
  // pebbles: on the open shingle and studded in the cut face
  {const n=420,peb=S.swarm(n,new THREE.SphereGeometry(1,10,8),mat("matte","#ffffff",{rough:.7}),{colors:true});const pc=["#B8AE9E","#A99F90","#C6BDAE","#D8D0C2","#9C9384"];
    for(let i=0;i<n;i++){let x,y,z,r=.05+rnd()*.07;if(i<260){const d=27+rnd()*14;x=X(d);z=(rnd()-.5)*HD*1.9;y=SF(d)+r*.2}
      else{const d=rnd()*41;x=X(d);z=HD+r*.2;const top=SF(d)-ST(d);y=TOP+.06+rnd()*Math.max(0,top-TOP-.12)}
      peb.putS(i,x,y,z,r*1.3,r*.7,r,new THREE.Quaternion().setFromEuler(new THREE.Euler(rnd(),rnd()*6,rnd()*.4)));peb.tint(i,pc[i%5])}
    peb.done();peb.castShadow=true;S.scene.add(peb)}
  // ---------------------------------------------------------------- the sea: a translucent block with a moving surface
  const SX0=X(33.5),SX1=X(40)+1.4,WL=SF(37)+.05;
  const seaBody=S.box(SX1-SX0,WL-TOP,HD*2,mat("liquid",PAL.water,{opacity:.42,depthWrite:false}),{at:[(SX0+SX1)/2,TOP+(WL-TOP)/2,0],cast:false});seaBody.renderOrder=3;S.scene.add(seaBody);
  const wg=new THREE.PlaneGeometry(SX1-SX0,HD*2,36,12);wg.rotateX(-Math.PI/2);
  const wave=S.mesh(wg,mat("liquid","#CFE6FA",{opacity:.6,fresh:true}),{at:[(SX0+SX1)/2,WL,0],cast:false});wave.renderOrder=4;S.scene.add(wave);const wbase=wg.attributes.position.array.slice();
  const foam=S.puffs(60,"#ffffff");S.scene.add(foam);const fo=Array.from({length:60},()=>({x:0,y:0,z:0,life:0}));
  // ---------------------------------------------------------------- plants: grass and pōhuehue tufts, tall where the soil is deep
  const bladeGeo=new THREE.ConeGeometry(.035,1,5);bladeGeo.translate(0,.5,0);
  const blades=[];for(let d=0;d<34;d+=.3){const c=lerpA(COUNT,d),h=lerpA(HEIGHT,d)*.032;const n=Math.round(c/3);for(let k=0;k<n;k++)blades.push({x:X(d+rnd()*.3),z:(rnd()-.5)*HD*1.85,h:h*(.6+rnd()*.6),ax:(rnd()-.5)*.5,az:(rnd()-.5)*.5,ph:rnd()*6})}
  blades.forEach(b=>b.y=SF((b.x+8.4)/.4)+.02);
  const grass=S.swarm(blades.length,bladeGeo,mat("matte","#ffffff",{rough:.6}),{colors:true,cast:true});const gc=["#7FB65A","#96C94E","#4F8A3A","#A9D47A"];
  blades.forEach((b,i)=>grass.tint(i,gc[i%4]));S.scene.add(grass);
  const tufts=[];for(let d=0;d<26;d+=.7){const c=lerpA(COUNT,d);if(rnd()*14<c)tufts.push({x:X(d+rnd()*.6),z:(rnd()-.5)*HD*1.7,r:.12+lerpA(HEIGHT,d)*.006*rnd()+.04})}
  const tuft=S.swarm(tufts.length,new THREE.IcosahedronGeometry(1,1),mat("matte","#5E9A48",{rough:.6}),{colors:true,cast:true});
  tufts.forEach((t,i)=>{tuft.putS(i,t.x,SF((t.x+8.4)/.4)+t.r*.35,t.z,t.r*1.3,t.r*1.05,t.r*1.2);tuft.tint(i,["#6FAE52","#7FBF5E","#5E9A48"][i%3])});tuft.done();S.scene.add(tuft);
  // ---------------------------------------------------------------- transect tape, quadrats, the surveyor and height poles
  const tape=S.tube(Array.from({length:21},(_,i)=>[X(i*2),SF(i*2)+.06,-.0]),.02,mat("plastic",PAL.product.butter,{rough:.35}),{seg:120,cast:false});S.scene.add(tape);
  for(const d of [0,40])S.scene.add(S.cyl(.04,.04,.6,mat("metal"),{at:[X(d),SF(d)+.25,0],seg:10}));
  const quads=D.map((d,i)=>{const m=mat("plastic","#ffffff",{rough:.4,fresh:true});m.emissive=new THREE.Color(0);const q=S.mesh(new THREE.TorusGeometry(.42,.05,6,4),m,{cast:true});q.rotation.set(Math.PI/2,0,Math.PI/4);
    q.position.set(X(d),SF(d)+.05,.55);S.scene.add(q);
    const pole=S.group();pole.position.set(X(d)+.36,SF(d),.9);S.scene.add(pole);const ph=HEIGHT[i]*.032;
    if(ph>0){pole.add(S.cyl(.025,.025,ph,mat("plastic","#ffffff"),{at:[0,ph/2,0],seg:8}));pole.add(S.sphere(.06,mat("plastic",PAL.product.strawberry),{at:[0,ph,0],seg:12}))}
    else pole.add(S.cyl(.07,.07,.02,mat("plastic",PAL.product.strawberry),{at:[0,.02,0]}));
    pole.scale.setScalar(.001);return {q,m,pole,k:0}});
  const walker=S.group();
  {const suit=mat("plastic",PAL.product.strawberry,{rough:.35});walker.add(S.mesh(new THREE.CapsuleGeometry(.13,.28,6,16),suit,{at:[0,.5,0]}));
    walker.add(S.sphere(.12,mat("plastic","#ffffff",{rough:.2}),{at:[0,.86,0],seg:20}));const vis=S.sphere(.122,mat("plastic",PAL.ink,{rough:.15}),{at:[.03,.85,0],seg:20});vis.scale.set(1,.5,1);walker.add(vis);
    for(const z of [-.07,.07])walker.add(S.cyl(.05,.045,.3,mat("plastic",PAL.ink),{at:[0,.15,z],seg:10}));
    walker.add(S.rbox(.03,.24,.18,.01,mat("plastic","#ffffff"),{at:[.18,.55,.05],rot:[0,0,-.3]}))}
  S.scene.add(walker);S.pick(walker,()=>{S.api.state.playing=!S.api.state.playing});
  // ---------------------------------------------------------------- animals for the food chain (no faces: simple bodies only)
  const bodyGeo=new THREE.SphereGeometry(1,16,12);
  const NI=40,insects=S.swarm(NI,bodyGeo,mat("plastic","#C98F62",{rough:.4}),{cast:true});S.scene.add(insects);
  const ins=Array.from({length:NI},()=>{const d=2+rnd()*26;return {d,z:(rnd()-.5)*HD*1.7,ph:rnd()*6}});
  const ND=8,dotB=S.swarm(ND,bodyGeo,mat("plastic","#FBF6EC",{rough:.35}),{cast:true}),dotH=S.swarm(ND,bodyGeo,mat("plastic","#FBF6EC",{rough:.35}),{cast:true}),dotBand=S.swarm(ND,new THREE.TorusGeometry(1,.25,8,20),mat("plastic","#9A6A4A",{rough:.4}));
  S.scene.add(dotB,dotH,dotBand);const dots=Array.from({length:ND},(_,i)=>({d:15+i*2.2+rnd(),z:(rnd()-.5)*3,ph:rnd()*6}));
  const NS=10,stB=S.swarm(NS,new THREE.CapsuleGeometry(.13,.6,6,12),mat("plastic","#8A5A3A",{rough:.4}),{cast:true}),stT=S.swarm(NS,new THREE.CapsuleGeometry(.05,.42,4,8),mat("plastic","#3E3A4E",{rough:.4}),{cast:true});
  S.scene.add(stB,stT);const sts=Array.from({length:NS},(_,i)=>({d:9+i*2.0+rnd(),z:(rnd()-.5)*3.2,ph:rnd()*6}));
  // energy moving up the chain: glowing beads hop from food to eater
  const NE=90,energy=S.swarm(NE,new THREE.SphereGeometry(.1,12,10),S.M.glow("#ffffff",4.5),{colors:true});S.scene.add(energy);
  const ep=Array.from({length:NE},()=>({a:V3(0,0,0),b:V3(0,0,0),t:1,dur:1}));let eAcc=[0,0,0];
  const LV=[PAL.product.lime,PAL.product.butter,PAL.product.blueberry,PAL.product.peach];
  // ---------------------------------------------------------------- factor props: highlight band, dotterel nest, sun, heat shimmer, salt spray, nutrients
  const bandM=mat("acrylic",PAL.product.butter,{opacity:.18,fresh:true});const band=S.box(1,2.4,HD*2+.1,bandM,{cast:false});band.renderOrder=5;S.scene.add(band);
  const nest=S.group();nest.position.set(X(24),SF(24),-.6);nest.scale.setScalar(1.6);S.scene.add(nest);
  {const bm=mat("plastic","#FBF6EC",{rough:.35});const bb=S.sphere(.16,bm,{at:[.42,.16,.1]});bb.scale.set(1.5,1,1);nest.add(bb);nest.add(S.sphere(.09,bm,{at:[.6,.3,.1]}));nest.add(S.torus(.08,.025,mat("plastic","#9A6A4A"),{at:[.57,.22,.1],rot:[Math.PI/2,0,0]}));for(const z of [.05,.15])nest.add(S.cyl(.012,.012,.12,mat("plastic","#3E3A4E"),{at:[.42,.03,z],seg:6}))}
  nest.add(S.torus(.22,.05,mat("plastic","#C6BDAE",{rough:.8}),{rot:[Math.PI/2,0,0],at:[0,.03,0]}));
  [[-.06,.02],[.07,.03],[0,-.07]].forEach(([x,z])=>{const e=S.sphere(.06,mat("plastic","#E8DCC4",{rough:.5}),{at:[x,.07,z],seg:12});e.scale.set(1,.8,1.25);nest.add(e)});
  const sun=S.sphere(.5,S.M.glow(PAL.product.butter,5),{at:[4,6.4,-3.2],cast:false});S.scene.add(sun);
  const heat=S.puffs(60,PAL.hot,{additive:true});S.scene.add(heat);const hp=Array.from({length:60},()=>({x:0,y:0,z:0,life:0}));
  const spray=S.puffs(80,"#ffffff");S.scene.add(spray);const sp=Array.from({length:80},()=>({x:0,y:0,z:0,vx:0,vy:0,life:0}));
  const nutr=S.puffs(70,PAL.product.lime,{additive:true});S.scene.add(nutr);const np=Array.from({length:70},()=>({d:rnd()*16,z:(rnd()-.5)*HD*1.9,f:rnd(),ph:rnd()*6}));
  // ---------------------------------------------------------------- the energy pyramid: stacked blocks, ~10% passing up each level
  const EN=[10000,1000,100,10],PH=.62;
  const pyr=S.group();pyr.position.set(ZP.x,TOP,ZP.z);
  const blocks=EN.map((e,i)=>{const w=3.9*Math.pow(e/10000,.38);const b=S.rbox(w,PH,w,.08,mat("acrylic",LV[i],{opacity:.5}),{at:[0,PH/2+i*PH,0],cast:false});b.renderOrder=2;pyr.add(b);pyr.add(S.rbox(w-.04,.04,w-.04,.02,mat("plastic",LV[i],{rough:.4}),{at:[0,i*PH+.02,0]}));return {w,b,y:PH/2+i*PH}});
  // little figurines on each level's ledge
  {const lv=pyr;const g1=S.swarm(24,bladeGeo,mat("plastic","#4F8A3A",{rough:.5}),{cast:true});for(let i=0;i<24;i++){const a=i/24*Math.PI*2;g1.putS(i,Math.cos(a)*1.75,PH,Math.sin(a)*1.75,1,.35+.2*(i%3),1)}g1.done();lv.add(g1);
    const g2=S.swarm(6,bodyGeo,mat("plastic","#C98F62"),{cast:true});for(let i=0;i<6;i++){const a=i/6*Math.PI*2+.3;g2.putS(i,Math.cos(a)*.62,PH*2+.05,Math.sin(a)*.62,.08,.05,.05)}g2.done();lv.add(g2);
    const db=S.sphere(.13,mat("plastic","#FBF6EC"),{at:[.3,PH*3+.13,.05]});db.scale.set(1.3,.9,1);lv.add(db);lv.add(S.sphere(.08,mat("plastic","#FBF6EC"),{at:[.45,PH*3+.27,.05]}));
    const stm=S.mesh(new THREE.CapsuleGeometry(.05,.22,4,10),mat("plastic","#B67E52"),{at:[0,PH*4+.06,0],rot:[0,0,Math.PI/2]});lv.add(stm)}
  const NB=120,pb=S.swarm(NB,new THREE.SphereGeometry(.05,10,8),S.M.glow("#FFE7A0",4.5),{colors:true});pyr.add(pb);
  const pp=Array.from({length:NB},()=>({on:false,lv:0,x:0,y:0,z:0,vx:0,vy:0,vz:0,heat:false,life:0}));let pAcc=0;
  const heatP=S.puffs(120,PAL.hot,{additive:true});pyr.add(heatP);const hq=Array.from({length:120},()=>({x:0,y:0,z:0,vx:0,vy:0,vz:0,life:0}));let hqi=0;
  // ---------------------------------------------------------------- labels
  const lTop=S.label({off:[-20,-40]}).set("Top of beach<b>0 m</b>"),lSeaE=S.label({off:[20,-40]}).set("Sea<b>40 m</b>");
  const lZone1=S.label({off:[0,-50]}).set("Soil and plants<small>tall, many</small>"),lZone2=S.label({off:[0,-50]}).set("Bare shingle<small>no soil, salt spray</small>");
  const lQ=S.label({cls:"hot",off:[30,-50]}),lWalk=S.label({off:[-30,30]});
  const lSoil=[0,15,35].map(d=>S.label({off:[d===35?30:-30,40]}));const lCut=S.label({off:[30,-30]}).set("Cut-away<small>soil (brown) on shingle (grey)</small>");
  const lFac=S.label({cls:"hot",off:[0,-40]}),lNest=S.label({off:[30,-30]}).set("Dotterel nest<small>on open shingle</small>");
  const lPl=S.label({off:[-30,-40]}),lIn=S.label({off:[-30,30]}),lDo=S.label({off:[30,-40]}),lSt=S.label({cls:"hot",off:[-30,-40]});
  const lLv=blocks.map((b,i)=>S.label({off:[i%2?-36:36,0]}));const lHeat=S.label({off:[-36,34]}).set("Lost as heat<small>respiration, movement</small>");
  // ---------------------------------------------------------------- views
  S.view("habitat",[-.4,8.4,19.5],[0,1.0,0],{min:5,max:34});
  S.view("transect",[-.8,7.6,15.8],[-.6,1.1,0],{min:3,max:30});
  S.view("soil",[-4.2,2.4,11.2],[-3.6,1.2,1.4],{min:3,max:24});
  S.view("factors",[0,8.2,18.6],[0,1.2,0],{min:5,max:34});
  S.view("chain",[-1.2,7.2,13.6],[-1.6,1.3,-.2],{min:4,max:28});
  S.view("pyramid",[ZP.x+.8,4.4,8.4],[ZP.x,1.35,0],{min:3,max:24});
  S.view("all",[5.5,11.5,25],[5.5,1,0],{min:6,max:50});
  const all=[lTop,lSeaE,lZone1,lZone2,lQ,lWalk,...lSoil,lCut,lFac,lNest,lPl,lIn,lDo,lSt,...lLv,lHeat];
  const show={habitat:[lTop,lSeaE,lZone1,lZone2],transect:[lQ,lWalk,lTop,lSeaE],soil:[...lSoil,lCut],factors:[lFac],chain:[lPl,lIn,lDo,lSt],pyramid:[...lLv,lHeat],test:[lQ]};
  S.goView("habitat",true);
  const walkPos=()=>{const w=Math.min(40,S.api.state.walk);return V3(X(w),SF(w)+.6,0)};
  let K="";
  const hopPos=(i,t,out)=>{const o=ins[i];const x=X(o.d)+Math.sin(t*.7+o.ph)*.3;const hop=Math.max(0,Math.sin(t*5+o.ph*3))*.18;return out.set(x,SF(o.d)+.06+hop,o.z)};
  return {
    step(st){K=st.k;const v=st.k==="test"?"all":st.k;S.goView(v);
      if(v==="pyramid")S.setShadowBox(5,[ZP.x,0,0]);else if(v==="all")S.setShadowBox(16,[5,0,0]);else S.setShadowBox(10.5,[0,0,0]);
      S.setFollow(null);all.forEach(l=>l.hide());(show[st.k]||[]).forEach(l=>l.show())},
    update(s,st,dt,t){const k=st.k,P=pops();const R=S.REDUCED?0:1;
      // wind in the grass
      blades.forEach((b,i)=>{const w=Math.sin(t*1.6+b.x*.8+b.ph*.3)*.12*R;grass.putS(i,b.x,b.y,b.z,1,b.h,1,new THREE.Quaternion().setFromEuler(new THREE.Euler(b.ax+w*.4,0,b.az+w)))});grass.done();
      // waves and foam
      const a=wave.geometry.attributes.position;for(let i=0;i<a.count;i++){const x=wbase[i*3],z=wbase[i*3+2];a.array[i*3+1]=(Math.sin(x*2.2-t*2.2*R+z*.6)*.04+Math.sin(z*1.7+t*1.3*R)*.02)}a.needsUpdate=true;wave.geometry.computeVertexNormals();
      fo.forEach((f,i)=>{f.life-=dt;if(f.life<=0){f.x=SX0+.1+rnd()*.5;f.z=(rnd()-.5)*HD*2;f.y=WL+.03;f.life=1+rnd()*1.5}f.x+=dt*.1;foam.put(i,f.x,f.y,f.z,Math.min(.7,f.life*.5),70)});foam.done();
      // transect: quadrats light up when walked; the surveyor walks with the model's walk
      const tr=["transect","soil","test"].includes(k),w=Math.min(40,s.walk);
      quads.forEach((q,i)=>{const done=tr&&D[i]<=w;q.q.visible=tr;q.m.color.set(done?PAL.product.butter:"#ffffff");q.m.emissive.set(done?PAL.product.butter:"#000000");q.m.emissiveIntensity=done?.5:0;
        q.k+=(((done&&k!=="soil")?1:0)-q.k)*.1;q.pole.scale.setScalar(Math.max(.001,q.k));q.pole.visible=q.k>.01});
      tape.visible=tr;walker.visible=tr&&k!=="soil";
      const moving=s.playing&&st.speed&&w<40;walker.position.set(X(w),SF(w)+(moving?Math.abs(Math.sin(t*9))*.05:0),0);walker.rotation.y=-.6;
      const qi=Math.min(8,Math.floor(w/5));
      lQ.at(tmp.set(X(D[qi]),SF(D[qi])+.1,.55)).set(`Quadrat at ${D[qi]} m<b>${HEIGHT[qi]} cm tall</b><small>${COUNT[qi]} plants</small>`);
      lWalk.at(tmp.set(X(w),SF(w)+.9,0)).set(w>=40?"Walk done":"Walking the tape");
      // soil depths on the cut face
      [0,15,35].forEach((d,j)=>{const i=D.indexOf(d);lSoil[j].at(tmp.set(X(d),SF(d)-ST(d)/2,HD)).set(`Soil at ${d} m<b>${SOIL[i]} cm</b>`)});lCut.at(tmp.set(X(26),SF(26)-.4,HD));
      lTop.at(tmp.set(X(0),SF(0)+.2,-HD+.3));lSeaE.at(tmp.set(X(40),WL,-HD+.3));lZone1.at(tmp.set(X(7),SF(7)+1.1,-.6));lZone2.at(tmp.set(X(28),SF(28)+.15,-.6));
      // factors
      const fk=s.factor,fon=k==="factors";const bandR={shelter:[0,12],nutrients:[0,15],temperature:[18,34],light:[20,40],water:[28,40]}[fk];
      band.visible=fon;if(fon){const x0=X(bandR[0]),x1=X(bandR[1]);band.scale.x=x1-x0;band.position.set((x0+x1)/2,SF((bandR[0]+bandR[1])/2)+1.2,0);lFac.at(tmp.set((x0+x1)/2,SF((bandR[0]+bandR[1])/2)+2.4,0)).set(`${FACTORS[fk][0]}<small>${bandR[0]}–${bandR[1]} m</small>`)}
      nest.visible=fon&&fk==="shelter";lNest.show(fon&&fk==="shelter");lNest.at(tmp.set(X(24),SF(24),-.6));
      sun.visible=fon&&(fk==="light"||fk==="temperature");
      hp.forEach((h,i)=>{h.life-=dt;if(h.life<=0){const d=18+rnd()*16;h.x=X(d);h.z=(rnd()-.5)*HD*1.8;h.y=SF(d)+.05;h.life=1.5+rnd()}h.y+=dt*.5;heat.put(i,h.x+Math.sin(t*3+i)*.05,h.y,h.z,fon&&fk==="temperature"?Math.min(.35,h.life*.25):0,140)});heat.done();
      sp.forEach((p,i)=>{p.life-=dt;if(p.life<=0){p.x=SX0+rnd()*.6;p.y=WL+.05;p.z=(rnd()-.5)*HD*1.8;p.vx=-(1.2+rnd()*1.6);p.vy=.9+rnd()*.8;p.life=1.4+rnd()}p.vy-=dt*.9;p.x+=p.vx*dt;p.y+=p.vy*dt;
        spray.put(i,p.x,Math.max(p.y,TOP),p.z,fon&&fk==="water"?Math.min(.6,p.life*.5):0,110)});spray.done();
      np.forEach((n,i)=>{const d=n.d,top=SF(d),bot=top-ST(d);nutr.put(i,X(d),S.lerp(bot,top,(n.f+Math.sin(t+n.ph)*.1+1)%1),HD+.02,fon&&fk==="nutrients"?.7:0,90)});nutr.done();
      // food chain animals
      const ch=k==="chain"||k==="pyramid"||k==="test",chainOn=k==="chain";
      const nIns=ch?Math.min(NI,Math.round(P.ins/25)):0,nDot=ch?Math.min(ND,Math.round(P.dot/10)):0,nSt=ch?Math.min(NS,P.st):0;
      for(let i=0;i<NI;i++){if(i<nIns){hopPos(i,t*R,tmp);insects.putS(i,tmp.x,tmp.y+.03,tmp.z,.1,.065,.065)}else insects.put(i,0,-5,0,.001)}insects.done();
      for(let i=0;i<ND;i++){if(i<nDot){const o=dots[i];const x=X(o.d)+Math.sin(t*.5*R+o.ph)*.6,y=SF(o.d);const dir=Math.cos(t*.5*R+o.ph)>0?0:Math.PI;const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(0,dir,0));
          dotB.putS(i,x,y+.24,o.z,.25,.17,.17,q);const hx=x+(dir?-.19:.19);dotH.put(i,hx,y+.43,o.z,.12);dotBand.putS(i,hx-(dir?-.03:.03),y+.34,o.z,.11,.11,.11,new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI/2,0,0)))}
        else{dotB.put(i,0,-5,0,.001);dotH.put(i,0,-5,0,.001);dotBand.put(i,0,-5,0,.001)}}dotB.done();dotH.done();dotBand.done();
      for(let i=0;i<NS;i++){if(i<nSt){const o=sts[i];const x=X(o.d)+Math.sin(t*.8*R+o.ph)*.8,y=SF(o.d)+.16;const dir=Math.cos(t*.8*R+o.ph)>0?0:Math.PI;
          const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(0,dir,Math.PI/2));stB.putS(i,x,y,o.z,1,1,1,q);const q2=new THREE.Quaternion().setFromEuler(new THREE.Euler(0,dir,Math.PI/2+.5));stT.putS(i,x+(dir?.52:-.52),y+.08,o.z,1,1,1,q2)}
        else{stB.put(i,0,-5,0,.001);stT.put(i,0,-5,0,.001)}}stB.done();stT.done();
      // energy hops: plants → insects → dotterels → stoats, fewer beads each level up
      const rates=[6,1.8,.7];const pos=[(j,o)=>{const b=blades[(j*37)%blades.length];return o.set(b.x,b.y+b.h*.8,b.z)},(j,o)=>hopPos(j%Math.max(1,nIns),t*R,o),(j,o)=>{const d=dots[j%Math.max(1,nDot)];return o.set(X(d.d),SF(d.d)+.25,d.z)},(j,o)=>{const d=sts[j%Math.max(1,nSt)];return o.set(X(d.d),SF(d.d)+.15,d.z)}];
      const counts=[blades.length,nIns,nDot,nSt];
      if(chainOn&&s.playing!==null){for(let L=0;L<3;L++){if(!counts[L]||!counts[L+1])continue;eAcc[L]+=dt*rates[L]*R;while(eAcc[L]>=1){eAcc[L]--;const e=ep.find(q=>q.t>=1);if(!e)break;pos[L](Math.floor(rnd()*1e4),e.a);pos[L+1](Math.floor(rnd()*1e4),e.b);e.t=0;e.dur=1.2;e.L=L}}}
      ep.forEach((e,i)=>{if(e.t<1&&chainOn){e.t+=dt/e.dur;const u=Math.min(1,e.t);tmp.lerpVectors(e.a,e.b,u);tmp.y+=Math.sin(u*Math.PI)*.8;energy.put(i,tmp.x,tmp.y,tmp.z,1);energy.tint(i,LV[e.L+1])}else{e.t=1;energy.put(i,0,-5,0,.001)}});energy.done();
      lPl.at(tmp.set(X(4),SF(4)+1.4,-1)).set(`Plants · producers<b>≈ ${P.plants.toLocaleString("en-NZ")}</b>`);
      lIn.at(tmp.set(X(10),SF(10)+.1,1.2)).set(`Insects, sandhoppers<b>≈ ${P.ins.toLocaleString("en-NZ")}</b>`);
      lDo.at(tmp.set(X(dots[0].d),SF(dots[0].d)+.4,dots[0].z)).set(`Banded dotterels<b>≈ ${P.dot}</b>`);
      lSt.at(tmp.set(X(6),SF(6)+.4,sts[0].z)).set(`Stoats<b>${P.st}</b><small>${P.st?"hunting this beach":"none: dotterels do best"}</small>`);
      // pyramid: beads rise; at each level about 90% leave as heat
      const pyOn=k==="pyramid"||k==="test";
      pAcc+=dt*(pyOn?14:0)*R;while(pAcc>=1){pAcc--;const p=pp.find(q=>!q.on);if(!p)break;const a2=rnd()*Math.PI*2,r2=rnd()*1.4;p.on=true;p.lv=0;p.x=Math.cos(a2)*r2;p.z=Math.sin(a2)*r2;p.y=.1;p.vy=.9;p.life=0}
      pp.forEach((p,i)=>{if(!p.on){pb.put(i,0,-5,0,.001);return}p.y+=p.vy*dt;const top=(p.lv+1)*PH;
        if(p.y>=top){if(p.lv<3&&rnd()<.1){p.lv++;const w2=blocks[p.lv].w*.4;p.x=S.clamp(p.x,-w2,w2);p.z=S.clamp(p.z,-w2,w2)}
          else{const h=hq[hqi=(hqi+1)%hq.length];const d=Math.hypot(p.x,p.z)||1;h.x=p.x;h.y=p.y-.05;h.z=p.z;h.vx=p.x/d*1.2;h.vz=p.z/d*1.2;h.vy=.5;h.life=1.2;p.on=false;pb.put(i,0,-5,0,.001);return}}
        pb.put(i,p.x,p.y,p.z,1);pb.tint(i,LV[p.lv])});pb.done();
      hq.forEach((h,i)=>{if(h.life>0){h.life-=dt;h.x+=h.vx*dt;h.y+=h.vy*dt;h.z+=h.vz*dt}heatP.put(i,h.x,h.y,h.z,Math.max(0,h.life)*.4,180)});heatP.done();
      const names=["Plants","Insects","Dotterels","Stoats"];
      blocks.forEach((b,i)=>lLv[i].at(tmp.set(ZP.x+(i%2?-1:1)*b.w/2,TOP+b.y,ZP.z+b.w/2)).set(`${names[i]} · level ${i+1}<b>${EN[i].toLocaleString("en-NZ")} kJ</b>`));
      lHeat.at(tmp.set(ZP.x-1.9,TOP+.35,1.6));
      sun.material.emissiveIntensity=4.5+Math.sin(t*2)*.5;
    }};
}
StudyKit.mount({kupu:KUPU,scene3d:ecology3d,
  eyebrow:"Science · Ecology", title:"The ecology machine", crumb:"Year 9–10 science · ecosystems, distribution, food chains", homeHash:"y9",
  fig:"FIG. 07 · A SHINGLE BEACH", railTitle:"Why things live where they do",
  mainBox:"0 0 640 330", mainPhoneBig:true, mainLabel:"Cross-section of a shingle beach with plants, soil and the sea", closeBox:"0 0 420 260",
  state:s, steps,
  controls:[{type:"play"},{type:"button",id:"restart",label:"Restart walk",onClick:()=>{s.walk=0}},
    {type:"select",id:"factor",label:"Factor",options:Object.entries(FACTORS).map(([k,v])=>[k,v[0]]),get:()=>s.factor,set:(x,v)=>{s.factor=v}},
    {type:"range",id:"stoats",label:"Stoats",min:0,max:10,step:1,get:()=>s.stoats,set:(x,v)=>{s.stoats=v},fmt:()=>String(s.stoats)}],
  tick:(x,dt)=>{s.walk=Math.min(40,s.walk+dt*8);if(s.walk>=40)s.playing=false},
  drawMain, drawClose,
  chips:()=>{const i=Math.min(8,Math.floor(s.walk/5)),P=pops();return{zone:["ZONES","soil · plants · bare shingle · sea"],at:["QUADRAT",D[i]+" m"],height:["HEIGHT",HEIGHT[i]+" cm",true],count:["PLANTS",String(COUNT[i])],
    soilTop:["SOIL AT 0 m","18 cm"],soilSea:["SOIL AT 35 m","0 cm",true],factorc:["FACTOR",FACTORS[s.factor][0],true],stoats:["STOATS",String(s.stoats)],dot:["DOTTERELS","≈ "+P.dot,true],ins:["INSECTS","≈ "+P.ins.toLocaleString("en-NZ")]}},
  challenges:[
    {q:"Walk the transect to the first quadrat with no plants. How far from the top is it?",check:()=>s.walk>=35&&s.walk<40,ok:"Yes: 35 m. Past here it is bare shingle with no soil, and salt spray from the waves.",no:()=>`Not yet: you're at ${Math.floor(s.walk/5)*5} m. Press Play and pause at the first empty quadrat.`},
    {q:"Set the number of stoats that gives the dotterels the best chance.",check:()=>s.stoats===0,ok:"Yes: with no stoats the dotterel population is at its highest. That's why DOC and community groups trap predators around nesting beaches.",no:"Not yet. Which number of predators lets the most dotterels survive?"},
    {q:"Choose the factor that best explains why plants are tallest at the top of the beach.",check:()=>s.factor==="nutrients",ok:"Yes: deeper soil holds more nutrients and water, so plants grow taller.",no:"Not quite. Look back at the soil-depth data."}],
  papers:[{label:"DOC: banded dotterels on shingle beaches",url:"https://www.doc.govt.nz/news/media-releases/2021-media-releases/banding-together-for-the-banded-dotterel/"}],
  truth:"The transect data are made up for practice, following the pattern found on real shingle beaches. Population numbers in the food chain are illustrative, not survey counts.",
  footer:"Ecosystems, distribution of organisms and food chains are Year 9–10 science topics in the New Zealand Curriculum."
});
})();
