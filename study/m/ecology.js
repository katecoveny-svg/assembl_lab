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
StudyKit.mount({kupu:KUPU,
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
