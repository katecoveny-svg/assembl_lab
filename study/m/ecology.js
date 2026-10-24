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
function drawMain(st0,st){
  let o=`<rect width="640" height="330" fill="var(--chalk)"/>`;
  // sky labels
  o+=`<text class="t-lab" x="60" y="22">TOP OF BEACH · 0 m</text><text class="t-lab" x="580" y="22" text-anchor="end">SEA · 40 m</text>`;
  // ground profile: slopes down to the sea
  const gy=d=>150+d*2.3;
  let ground=`M0,${gy(0)} L${X(0)},${gy(0)}`;D.forEach(d=>ground+=` L${X(d)},${gy(d)}`);ground+=` L640,${gy(40)+8} L640,330 L0,330Z`;
  o+=`<path d="${ground}" fill="var(--fill)" stroke="var(--ink)" stroke-width="1.2"/>`;
  // soil layer on top of shingle
  let soil="";D.forEach((d,i)=>soil+=(i?"L":"M")+X(d)+","+(gy(d)-0));for(let i=D.length-1;i>=0;i--)soil+=` L${X(D[i])},${gy(D[i])+SOIL[i]*1.6}`;
  o+=`<path d="${soil}Z" fill="var(--land)" opacity=".45"/>`;
  // shingle dots
  for(let i=0;i<70;i++){const d=(i*37%40),dy=(i*13%30);o+=`<circle cx="${X(d)+((i*7)%9)}" cy="${gy(d)+20+dy}" r="${2+(i%3)}" fill="var(--moon)" stroke="var(--ink)" stroke-width=".5"/>`}
  // sea
  const wave=Math.sin(Date.now()/600)*3;o+=`<path d="M${X(36)},${gy(36)+6+wave} Q${X(40)},${gy(40)-6+wave} 640,${gy(40)+wave} L640,330 L${X(36)},330Z" fill="var(--sea)" opacity=".35"/>`;
  // plants
  D.forEach((d,i)=>{const h=HEIGHT[i]*1.6,n=Math.min(5,Math.ceil(COUNT[i]/3));for(let k=0;k<n;k++){const x=X(d)-14+k*7,y=gy(d);if(h>0)o+=`<path d="M${x},${y} q-4,${-h*0.6} 0,${-h} M${x},${y} q5,${-h*0.5} 6,${-h*0.8}" fill="none" stroke="var(--land)" stroke-width="2.4"/>`}});
  // dotterel nest on open shingle
  if(st.k==="factors"&&s.factor==="shelter")o+=`<g transform="translate(${X(24)},${gy(24)-8})"><ellipse rx="9" ry="7" fill="var(--paper)" stroke="var(--ink)"/><circle cx="8" cy="-6" r="3.5" fill="var(--paper)" stroke="var(--ink)"/><rect x="-6" y="-1" width="12" height="2.4" fill="var(--hot)"/></g><text class="t-lab" x="${X(24)}" y="${gy(24)-24}" text-anchor="middle">DOTTEREL NEST</text>`;
  if(st.k==="factors"){const f=s.factor;
    const band={shelter:[0,12],nutrients:[0,15],temperature:[18,34],light:[20,40],water:[28,40]}[f];
    o+=`<rect x="${X(band[0])}" y="40" width="${X(band[1])-X(band[0])}" height="60" rx="8" fill="var(--sun)" opacity=".18"/><text class="t-ink" x="${(X(band[0])+X(band[1]))/2}" y="74" text-anchor="middle">${FACTORS[f][0]}</text>`}
  // transect line and quadrats
  if(["transect","soil","test"].includes(st.k)){o+=`<line x1="${X(0)}" x2="${X(40)}" y1="118" y2="118" stroke="var(--ink)" stroke-dasharray="4 3"/>`;
    D.forEach((d,i)=>{const done=d<=s.walk;o+=`<rect x="${X(d)-12}" y="${gy(d)-8}" width="24" height="8" fill="none" stroke="${done?"var(--sun)":"var(--rose)"}" stroke-width="${done?2:1}"/><text class="t-lab" x="${X(d)}" y="112" text-anchor="middle">${d}</text>`});
    const wx=X(Math.min(40,s.walk));o+=`<g transform="translate(${wx},${gy(Math.min(40,s.walk))-30})"><circle cy="-10" r="5" fill="var(--sun)" stroke="var(--ink)"/><rect x="-4" y="-5" width="8" height="16" rx="3" fill="var(--ink)"/></g>`}
  if(st.k==="chain"||st.k==="pyramid"){const P=pops();
    o+=`<text class="t-ink" x="320" y="60" text-anchor="middle">${P.st} stoats hunting this beach</text>`;
    for(let k=0;k<P.st;k++)o+=`<g transform="translate(${80+k*36},96)"><path d="M-12,0 q12,-8 24,0 q-12,6 -24,0z" fill="var(--hot)" stroke="var(--ink)"/><path d="M12,0 l8,-3" stroke="var(--ink)"/></g>`;
    const nd=Math.round(P.dot/10);for(let k=0;k<nd;k++)o+=`<g transform="translate(${X(14+k*3)},${gy(14+k*3)-8})"><ellipse rx="6" ry="4.5" fill="var(--paper)" stroke="var(--ink)"/><rect x="-4" y="-1" width="8" height="2" fill="var(--hot)"/></g>`}
  return o;
}
function drawClose(st0,st){
  let o=`<rect width="420" height="260" fill="var(--chalk)"/>`;
  if(["transect","soil","test","habitat"].includes(st.k)){
    const which=st.k==="soil"?"soil":"height";const vals=which==="soil"?SOIL:HEIGHT,max=which==="soil"?20:50,lab=which==="soil"?"SOIL DEPTH (cm)":"AVERAGE PLANT HEIGHT (cm)";
    o+=`<text class="t-lab" x="14" y="22">${lab} ALONG THE TRANSECT</text>`;
    const XX=d=>44+d/40*350,YY=v=>200-v/max*160;o+=`<line x1="44" x2="394" y1="200" y2="200" stroke="var(--rose)"/><line x1="44" x2="44" y1="34" y2="200" stroke="var(--rose)"/>`;
    [0,max/2,max].forEach(v=>o+=`<text class="t-lab" x="38" y="${YY(v)+3.5}" text-anchor="end">${v}</text>`);
    D.forEach((d,i)=>{o+=`<text class="t-lab" x="${XX(d)}" y="214" text-anchor="middle">${d}</text>`;if(st.k==="habitat"||d<=s.walk||st.k==="soil")o+=`<rect x="${XX(d)-12}" y="${YY(vals[i])}" width="24" height="${200-YY(vals[i])}" fill="${which==="soil"?"var(--land)":"var(--ink)"}" opacity="${which==="soil"?.7:1}"/>`});
    o+=`<text class="t-lab" x="220" y="230" text-anchor="middle">DISTANCE FROM TOP OF BEACH (m)</text>`;
    if(st.k==="soil")o+=`<text class="t-body" x="14" y="252">Soil gets shallower towards the sea, and so do the plants.</text>`;
    else o+=`<text class="t-body" x="14" y="252">${s.walk>=40?"Plants get shorter, then disappear, towards the sea.":"Press Play to walk the transect, one quadrat every 5 m."}</text>`;
    return o;}
  if(st.k==="factors"){const f=FACTORS[s.factor];o+=`<text class="t-lab" x="14" y="22">${f[0].toUpperCase()}</text>`;
    const wrap=(t,y)=>{const words=t.split(" ");let line="",out="",yy=y;words.forEach(w=>{if((line+w).length>58){out+=`<text class="t-body" x="14" y="${yy}">${line}</text>`;yy+=17;line=""}line+=w+" "});return out+`<text class="t-body" x="14" y="${yy}">${line}</text>`};
    o+=wrap(f[1],50)+`<text class="t-lab" x="14" y="168">THE RULE</text>`+wrap(f[2],188);return o;}
  // food chain and pyramid
  const P=pops();const chain=[["Plants (pōhuehue, grasses)","Producer",P.plants],["Insects and sandhoppers","Primary consumer",P.ins],["Banded dotterel","Secondary consumer",P.dot],["Stoat","Tertiary consumer",P.st]];
  if(st.k==="chain"){o+=`<text class="t-lab" x="14" y="22">FOOD CHAIN: ARROWS SHOW WHERE ENERGY GOES</text>`;
    chain.forEach((c,i)=>{const y=40+i*52;o+=`<rect x="14" y="${y}" width="250" height="38" rx="8" fill="var(--paper)" stroke="var(--ink)"/><text class="t-ink" x="26" y="${y+16}">${c[0]}</text><text class="t-lab" x="26" y="${y+31}">${c[1].toUpperCase()} · LEVEL ${i+1}</text><text class="t-ink" x="390" y="${y+24}" text-anchor="end">≈ ${c[2].toLocaleString("en-NZ")}</text>`;
      if(i<3)o+=`<path d="M139,${y+38} v12" stroke="var(--ink)" stroke-width="1.6"/><path d="M134,${y+44} l5,6 l5,-6" fill="none" stroke="var(--ink)" stroke-width="1.6"/>`});
    return o;}
  o+=`<text class="t-lab" x="14" y="22">ENERGY PYRAMID: ABOUT 10% PASSES UP EACH LEVEL</text>`;
  const E=[10000,1000,100,10];E.forEach((e,i)=>{const w=360*Math.pow(e/10000,0.38),y=196-i*44;o+=`<rect x="${210-w/2}" y="${y}" width="${w}" height="36" fill="${["var(--land)","var(--sun)","var(--paper)","var(--hot)"][i]}" stroke="var(--ink)"/><text class="t-ink" x="210" y="${y+22}" text-anchor="middle">${chain[i][0].split(" (")[0]} · ${e.toLocaleString("en-NZ")} kJ</text>`});
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
