(()=>{
// ---------- model: one gene, two alleles. D = dark feathers (dominant), d = pale feathers (recessive)
const s={N:200,p:0.5,sel:0,mig:0,pm:0.9,mu:0,gen:0,hist:[0.5],birds:[],lost:false,
  pA:"Dd",pB:"Dd",kids:[],gelPick:-1,gelSeed:7,seed:11};
function rnd(){let t=s.seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}
function binom(n,p){if(n<=60){let k=0;for(let i=0;i<n;i++)if(rnd()<p)k++;return k}const m=n*p,sd=Math.sqrt(n*p*(1-p));let u=0;for(let i=0;i<6;i++)u+=rnd();return Math.max(0,Math.min(n,Math.round(m+sd*(u-3)*1.414)))}
function sampleBirds(){const n=Math.min(s.N,200),b=[];for(let i=0;i<n;i++){const a=rnd()<s.p?"D":"d",c=rnd()<s.p?"D":"d";b.push(a==="D"&&c==="D"?"DD":a==="d"&&c==="d"?"dd":"Dd")}s.birds=b}
function generation(){
  let p=s.p,q=1-p;
  if(s.mu>0){p=p+s.mu*q;q=1-p}                              // mutation d -> D
  if(s.sel>0){const w=1-s.sel*q*q;p=(p*p+p*q)/w;q=1-p}       // pale birds survive less
  if(s.mig>0){p=(1-s.mig)*p+s.mig*s.pm}                       // migrants arrive
  p=binom(2*s.N,p)/(2*s.N);                                   // random chance in who breeds
  s.p=p;s.gen++;s.hist.push(p);if(s.hist.length>200)s.hist.shift();sampleBirds();
}
function resetPop(N,p){s.N=N;s.p=p;s.gen=0;s.hist=[p];sampleBirds()}
// cross
function cross(n=24){const out=[];for(let i=0;i<n;i++){const a=s.pA[rnd()<.5?0:1],b=s.pB[rnd()<.5?0:1];out.push(a==="D"||b==="D"?(a===b?"DD":"Dd"):"dd")}s.kids=out}
// gel: 8 band positions; each parent has 2 alleles per marker
function gel(){let x=s.gelSeed*9301+49297;const r=()=>{x=(x*9301+49297)%233280;return x/233280};
  const markers=4,lanes=[];const mk=()=>[...Array(markers)].map(()=>[Math.floor(r()*6),Math.floor(r()*6)]);
  const mum=mk(),dads=[mk(),mk(),mk()],real=Math.floor(r()*3);const chick=mum.map((m,i)=>[m[r()<.5?0:1],dads[real][i][r()<.5?0:1]]);
  return{mum,dads,chick,real};}
let G=gel();
// ---------- drawing: the bench figure look (StudyKit.fig): birds as painted pebbles in a frosted mint island case
const F=StudyKit.fig,PAL=F.palette,TINT=PAL.case.mint,DARK="#3E4A7C",PALE="#FBF6EA";
const BM={DD:F.mat("painted",DARK),Dd:F.mat("painted",DARK),dd:F.mat("painted",PALE)},BEAK=F.mat("painted",PAL.product.peach),DOT=F.mat("painted",PAL.product.butter);
function bird(x,y,g,r=7,sh=true){const m=BM[g];
  return `<g transform="translate(${x},${y})">${sh?`<ellipse cx="${r*0.55}" cy="${r*0.8}" rx="${r*1.15}" ry="${r*0.3}" fill="${PAL.shadow}" opacity=".16"/>`:""}<path d="M${-r},0 a${r},${r*0.85} 0 1,0 ${2*r},0 a${r},${r*0.85} 0 1,0 ${-2*r},0" fill="${m.fill}" stroke="${g==="dd"?"#8F9BAA":m.stroke}" stroke-width="1"/><ellipse cx="${-r*0.32}" cy="${-r*0.4}" rx="${r*0.42}" ry="${r*0.2}" fill="${g==="dd"?"#fff":m.hi}" opacity="${g==="dd"?1:.55}"/>${g==="Dd"?`<circle r="${r*0.32}" fill="${DOT.fill}" stroke="${DOT.stroke}" stroke-width=".6"/>`:""}<path d="M${r*0.9},${-r*0.3} l${r*0.6},${r*0.2} l${-r*0.6},${r*0.2}z" fill="${BEAK.fill}" stroke="${BEAK.stroke}" stroke-width=".6"/></g>`}
function drawMain(st0,st){
  let o=F.floor(640,330);
  if(st.k==="cross")return o+drawCross();
  if(st.k==="dna")return o+drawGel();
  const b=s.birds,n=b.length,cols=Math.ceil(Math.sqrt(n*2.2)),rows=Math.ceil(n/cols);
  // the island: a mint plinth with a frosted acrylic case on it
  o+=F.box(10,284,606,8,{colour:PAL.mintPlastic,kind:"plastic",d:14,r:3,shadowLen:22});
  o+=F.acrylic(14,38,598,246,{tint:TINT,d:14,r:12,shadow:false});
  const W=578,H=230,cw=W/cols,ch=Math.min(26,H/rows),r=Math.max(3.2,Math.min(n<20?20:9,cw*0.32,ch*0.4));
  b.forEach((g,i)=>{const c=i%cols,rr=Math.floor(i/cols);o+=bird(24+c*cw+cw/2,52+rr*ch+ch/2,g,r,r>=4)});
  const cnt={DD:0,Dd:0,dd:0};b.forEach(g=>cnt[g]++);
  o+=`<text class="t-lab" x="16" y="24">${s.N>200?"200 OF ":""}${s.N} BIRDS · GENERATION ${s.gen}</text><text class="t-ink" x="624" y="24" text-anchor="end">D ${Math.round(s.p*100)}% · d ${Math.round((1-s.p)*100)}%</text>`;
  o+=`<g class="t-lab">${bird(24,314,"DD",6,false)}<text x="36" y="318">DD DARK</text>${bird(124,314,"Dd",6,false)}<text x="136" y="318">Dd DARK, CARRIES PALE</text>${bird(304,314,"dd",6,false)}<text x="316" y="318">dd PALE</text></g>`;
  if(st.k==="small")o+=`<text class="t-ink" x="624" y="318" text-anchor="end">${s.p===0||s.p===1?"An allele has been lost for good":""}</text>`;
  return o;
}
function drawCross(){
  let o="";const P=[s.pA,s.pB];
  o+=`<text class="t-lab" x="16" y="24">TWO PARENTS · ${s.kids.length} CHICKS</text>`;
  // the parents stand on mint plinths
  o+=F.box(118,84,64,10,{colour:PAL.mintPlastic,kind:"plastic",d:9,r:3,shadowLen:26})+F.box(458,84,64,10,{colour:PAL.mintPlastic,kind:"plastic",d:9,r:3,shadowLen:26});
  o+=bird(150,70,P[0],16,false)+bird(490,70,P[1],16,false);
  o+=`<text class="t-big" x="150" y="116" text-anchor="middle">${P[0]}</text><text class="t-big" x="490" y="116" text-anchor="middle">${P[1]}</text><text class="t-big" x="320" y="76" text-anchor="middle">×</text>`;
  // punnett: a flat chart on a frosted panel
  const x0=250,y0=126,c=46;
  o+=F.acrylic(x0-34,y0-26,c*2+52,c*2+36,{tint:TINT,d:10,r:10,balls:false,shadow:false});
  o+=`<text class="t-ink" x="${x0-14}" y="${y0+c/2+4}" text-anchor="end">${P[0][0]}</text><text class="t-ink" x="${x0-14}" y="${y0+c*1.5+4}" text-anchor="end">${P[0][1]}</text><text class="t-ink" x="${x0+c/2}" y="${y0-6}" text-anchor="middle">${P[1][0]}</text><text class="t-ink" x="${x0+c*1.5}" y="${y0-6}" text-anchor="middle">${P[1][1]}</text>`;
  for(let i=0;i<2;i++)for(let j=0;j<2;j++){const g=[P[0][i],P[1][j]].sort().join("").replace("dD","Dd");const gg=g==="Dd"||g==="dD"?"Dd":g;
    o+=`<rect x="${x0+j*c}" y="${y0+i*c}" width="${c}" height="${c}" fill="#fff" stroke="${F.deep(TINT)}"/><text class="t-ink" x="${x0+j*c+c/2}" y="${y0+i*c+c/2+4}" text-anchor="middle">${gg}</text>`}
  // kids, in a frosted brood tray
  o+=F.acrylic(30,236,584,68,{tint:TINT,d:12,r:12,shadowLen:30});
  s.kids.forEach((g,i)=>{o+=bird(60+(i%12)*46,252+Math.floor(i/12)*30,g,9)});
  return o;
}
function drawGel(){
  let o=`<text class="t-lab" x="16" y="24">DNA PROFILE: WHICH MALE IS THE CHICK'S FATHER?</text>`;
  const lanes=[["Mother",G.mum],["Chick",G.chick],["Male 1",G.dads[0]],["Male 2",G.dads[1]],["Male 3",G.dads[2]]];
  const x0=80,lw=96,top=50,bh=240;
  // the gel tank: frosted acrylic with a pale gel slab and two electrodes
  o+=F.acrylic(x0-20,top,lanes.length*lw+10,bh,{tint:TINT,d:14,r:10});
  o+=`<rect x="${x0-10}" y="${top+22}" width="${lanes.length*lw-10}" height="${bh-30}" rx="6" fill="#F4FBF7" fill-opacity=".85" stroke="${F.deep(TINT)}" stroke-opacity=".5"/>`;
  o+=F.cyl(x0-4,top-14,5,12,{colour:PAL.product.strawberry,kind:"painted",shadow:false})+F.cyl(x0+lanes.length*lw-24,top-14,5,12,{colour:DARK,kind:"painted",shadow:false});
  const BC=i=>i===1?PAL.product.strawberry:i===0?PAL.product.blueberry:(s.gelPick===i-2?PAL.product.butter:DARK);
  lanes.forEach(([n,m],i)=>{const x=x0+i*lw;o+=`<text class="t-ink" x="${x+30}" y="${top+16}" text-anchor="middle">${n}</text><rect x="${x+8}" y="${top+24}" width="44" height="8" rx="2" fill="#CFE3D9" stroke="${F.deep(TINT)}" stroke-width=".8"/>`;
    m.forEach((pair,k)=>pair.forEach(b=>{const y=top+44+k*48+b*7,c=BC(i);o+=`<rect x="${x+6}" y="${y}" width="48" height="4.4" rx="2" fill="${c}" stroke="${F.mat("painted",c).stroke}" stroke-width=".6"/>`}))});
  o+=`<text class="t-lab" x="16" y="318">EACH BAND IS ONE ALLELE AT A MARKER. A CHICK GETS ONE FROM EACH PARENT.</text>`;
  return o;
}
function drawClose(st0,st){
  let o=F.floor(420,260);
  if(st.k==="cross"){const c={DD:0,Dd:0,dd:0};s.kids.forEach(g=>c[g]++);const n=s.kids.length||1;
    o+=`<text class="t-lab" x="14" y="22">WHAT THE CHICKS GOT</text>`;
    ["DD","Dd","dd"].forEach((g,i)=>{const w=c[g]/n*300,col=g==="dd"?PAL.product.strawberry:g==="Dd"?PAL.product.blueberry:DARK;o+=`<text class="t-ink" x="14" y="${60+i*36}">${g}</text><rect x="54" y="${48+i*36}" width="300" height="16" rx="4" fill="#fff" stroke="#DCD6EA"/><rect x="54" y="${48+i*36}" width="${w}" height="16" rx="4" fill="${col}" stroke="${F.mat("painted",col).stroke}" stroke-width=".8"/><text class="t-ink" x="362" y="${60+i*36}">${c[g]}</text>`});
    const pale=c.dd/n;o+=`<text class="t-body" x="14" y="190">Pale chicks: ${c.dd} of ${s.kids.length} (${Math.round(pale*100)}%).</text><text class="t-body" x="14" y="210">The Punnett square predicts ${expPale()}.</text><text class="t-body" x="14" y="236">Small broods rarely match the prediction exactly: chance.</text>`;return o}
  if(st.k==="dna"){o+=`<text class="t-lab" x="14" y="22">HOW TO READ IT</text>`;
    ["Every band in the chick must come from the mother or the father.","Cross off the chick's bands that match the mother.","The father must have every band that's left.","Tap a male below, then press Check in Test yourself."].forEach((t,i)=>o+=`<text class="t-body" x="14" y="${54+i*26}">${i+1}. ${t}</text>`);
    o+=`<text class="t-ink" x="14" y="200">${s.gelPick>=0?`You picked Male ${s.gelPick+1}.`:"No male picked yet."}</text>`;return o}
  o+=`<text class="t-lab" x="14" y="22">ALLELE FREQUENCY OF D OVER GENERATIONS</text>`;
  const X=i=>40+i/199*360,Y=p=>210-p*180;
  [0,.5,1].forEach(p=>o+=`<text class="t-lab" x="34" y="${Y(p)+3.5}" text-anchor="end">${p*100}%</text><line x1="40" x2="400" y1="${Y(p)}" y2="${Y(p)}" stroke="#DCD6EA"/>`);
  o+=`<line x1="40" x2="400" y1="210" y2="210" stroke="#8F9BAA"/><line x1="40" x2="40" y1="30" y2="210" stroke="#8F9BAA"/>`;
  o+=`<path d="${s.hist.map((p,i)=>(i?"L":"M")+X(i).toFixed(1)+","+Y(p).toFixed(1)).join("")}" fill="none" stroke="${F.mat("painted",PAL.product.blueberry).stroke}" stroke-width="2.4" stroke-linejoin="round"/>`;
  o+=`<circle cx="${X(s.hist.length-1)}" cy="${Y(s.p)}" r="5" fill="${PAL.product.butter}" stroke="${DARK}"/>`;
  o+=`<text class="t-lab" x="220" y="230" text-anchor="middle">GENERATIONS (LAST 200)</text>`;
  const why=s.N<=20?"Small population: chance alone swings the frequency.":s.sel>0?"Pale birds survive less, so d falls each generation.":s.mig>0?"Migrants keep bringing D in.":s.mu>0?"Mutation slowly turns d into D.":"Big population, no pressures: the frequency barely moves.";
  o+=`<text class="t-body" x="14" y="250">${why}</text>`;return o;
}
function expPale(){const a=s.pA.split("").filter(x=>x==="d").length/2,b=s.pB.split("").filter(x=>x==="d").length/2;return Math.round(a*b*100)+"% pale"}
const POP=["play","restart","N","sel","mig","mu"];
const steps=[
 {k:"cross",lab:"Variation",cap:"Two dark parents can have a pale chick. Each parent passes on one of its two alleles at random, so sexual reproduction reshuffles variation every generation.",speed:0,controls:["pA","pB","breed"],
  big:"<b>The big idea:</b> meiosis and random fertilisation create new combinations of alleles, so siblings differ. That's variation from sexual reproduction.",
  exam:"Each parent has two alleles for feather colour and passes one on, chosen at random during meiosis. Two Dd parents can both pass on d, giving a dd chick with pale feathers. The Punnett square predicts 25% pale chicks, but in a small brood the actual number varies by chance.",
  trap:"Treating the Punnett square as a guarantee. It gives probabilities, not exact counts.",chips:["pA","pB"],onStep:()=>{if(!s.kids.length)cross()}},
 {k:"pool",lab:"Gene pool",cap:"A big population of 500 birds. Every bird carries two alleles; together they make the gene pool. With nothing pushing it, the allele frequency stays steady.",speed:1,speedLabel:"≈ 4 generations a second",controls:POP,
  big:"<b>The big idea:</b> allele frequency is the share of all the alleles in a population that are one type. It changes only when something changes who survives or breeds.",
  exam:"The allele frequency of d is the proportion of all the feather-colour alleles in the population that are d. In a large population with no selection, migration or mutation, it stays about the same from one generation to the next.",
  trap:"Confusing allele frequency with the share of pale birds. Many d alleles are hidden in dark Dd carriers.",chips:["N","freq","pale"],onStep:()=>{s.sel=0;s.mig=0;s.mu=0;resetPop(500,0.5)}},
 {k:"mutation",lab:"Mutation",cap:"Mutation is the only source of brand-new alleles. Here a small mutation rate slowly turns d alleles into D.",speed:1,speedLabel:"≈ 4 generations a second",controls:POP,
  big:"<b>The big idea:</b> mutations are random changes in DNA. Most do nothing, some harm, a few help. They're the original source of all variation.",
  exam:"A mutation is a permanent change in the DNA sequence of a gene. Mutations create new alleles, which is the original source of genetic variation. A mutation is only passed on if it happens in the cells that make gametes.",
  trap:"Saying mutations happen because an animal needs them. They're random.",chips:["freq","mu"],onStep:()=>{s.sel=0;s.mig=0;s.mu=0.01;resetPop(500,0.05)}},
 {k:"small",lab:"Small populations",cap:"In 1980 only five Chatham Island black robins were left. In a tiny population, chance decides which alleles get passed on, and alleles can vanish forever.",speed:1,speedLabel:"≈ 4 generations a second",controls:POP,
  big:"<b>The big idea:</b> in small populations allele frequencies drift by chance, and alleles get lost. Every black robin alive today descends from one female, Old Blue.",
  exam:"In a small population, chance events decide which individuals breed, so allele frequencies can change a lot between generations and alleles can be lost completely. The black robin fell to five birds in 1980, so today's population of about 445 has very little genetic variation, which makes it more vulnerable to disease.",
  trap:"Thinking a population that grows back also gets its variation back. Lost alleles only return through mutation or migration.",chips:["N","freq","lost"],onStep:()=>{s.sel=0;s.mig=0;s.mu=0;resetPop(5,0.5)}},
 {k:"survival",lab:"Survival",cap:"A new predator spots pale birds more easily. Fewer pale birds survive to breed, so the d allele gets rarer, but never quite vanishes, because carriers hide it.",speed:1,speedLabel:"≈ 4 generations a second",controls:POP,
  big:"<b>The big idea:</b> when one phenotype survives better, its alleles are passed on more. That's natural selection changing allele frequency.",
  exam:"Pale dd birds are more likely to be eaten, so fewer survive to breed and pass on the d allele. Over generations the frequency of d falls. It falls slowly once it's rare, because most d alleles are in dark Dd carriers that aren't selected against.",
  trap:"Saying the birds change colour to survive. Individuals don't change; the population's allele frequencies do.",chips:["freq","pale","sel"],onStep:()=>{s.mig=0;s.mu=0;s.sel=0.3;resetPop(500,0.3)}},
 {k:"migration",lab:"Migration",cap:"Birds fly in from another island where nearly all carry D. Gene flow pulls this population's frequency towards theirs.",speed:1,speedLabel:"≈ 4 generations a second",controls:POP,
  big:"<b>The big idea:</b> migration moves alleles between populations: it can add new variation and makes populations more alike.",
  exam:"Migration brings new individuals into the population, and they breed and add their alleles to the gene pool. Because the migrants mostly carry D, the frequency of D increases. Migration can also bring in alleles that had been lost, increasing variation.",
  trap:"Forgetting that migrants must breed to change the gene pool.",chips:["freq","mig"],onStep:()=>{s.sel=0;s.mu=0;s.mig=0.05;resetPop(300,0.1)}},
 {k:"dna",lab:"DNA profiling",cap:"Gene tracking: compare the chick's DNA bands with its mother and three possible fathers. Every band must come from one parent.",speed:0,controls:["pick0","pick1","pick2","newgel"],
  big:"<b>The big idea:</b> DNA profiling, sequencing and pedigrees let scientists track alleles through families, which is how conservation teams manage breeding in tiny populations.",
  exam:"In a DNA profile each band is an allele at a marker. A chick inherits one allele per marker from each parent, so every band in its profile must match either the mother or the father. The male whose bands account for all of the chick's remaining bands is the father.",
  trap:"Looking for the male with the most matching bands overall. He must match every band the mother can't explain.",chips:["pick"]},
 {k:"test",lab:"Test yourself",cap:"Use the controls to answer each one, then press Check. The machine marks you with the same model it runs.",speed:1,speedLabel:"≈ 4 generations a second",controls:["play","restart","N","sel","mig","pA","pB","breed","pick0","pick1","pick2"],
  big:"<b>Exam tip:</b> name the source of variation (mutation, sexual reproduction) or the cause of change (small population, survival, migration), then explain how it changes the allele frequency.",
  chips:["freq","N","pick"],onStep:()=>{s.mu=0}}
];
const set=k=>(x,v)=>{s[k]=v};
// ---- kupu Māori: te reo terms for this machine, each checked in Te Aka Māori Dictionary (ta = word id). Sources and notes: te-reo-notes.md
const KUPU=[
 {mi:"ira",en:"gene",ta:1778},
 {mi:"pītau ira",en:"DNA",ta:50987},
 {mi:"pūira",en:"chromosome",ta:40067},
 {mi:"mātāira",en:"gene pool",ta:50460},
 {mi:"mātai iranga",en:"genetics",ta:39853},
 {mi:"taupori",en:"population",ta:38688,chip:"N"},
 {mi:"momo",en:"type, kind, species",ta:4184},
 {mi:"rauropi",en:"organism",ta:38797}];
Object.entries({"cross": ["ira", "pūira", "mātai iranga"], "pool": ["mātāira", "ira", "taupori"], "mutation": ["ira", "pītau ira"], "small": ["taupori", "mātāira"], "survival": ["rauropi"], "migration": ["taupori", "mātāira"]}).forEach(([k,a])=>{const st=steps.find(x=>x.k===k);if(st)st.kupu=a});
StudyKit.mount({kupu:KUPU,
  eyebrow:"Biology · Genetic variation", title:"The gene pool machine", crumb:"NCEA Level 1 Chemistry and Biology · genetic variation · also Year 9–10 genetics", homeHash:"l1",
  fig:"FIG. 06 · AN ISLAND OF BIRDS", railTitle:"How variation is made and changed",
  badge:{label:"NCEA L1 Chem & Bio 92022",exam:"2026-11-19T14:00:00+13:00",examText:"Thu 19 Nov, 2pm"},
  mainBox:"0 0 640 330", mainPhoneBig:true, mainLabel:"A population of birds with dark and pale feathers", closeBox:"0 0 420 260",
  state:s, steps,
  controls:[{type:"play"},{type:"button",id:"restart",label:"Restart",onClick:(x,api)=>{api.step.onStep&&api.step.onStep()}},
    {type:"range",id:"N",label:"Birds",min:5,max:500,step:5,get:()=>s.N,set:(x,v)=>{s.N=v;sampleBirds()},fmt:()=>String(s.N)},
    {type:"range",id:"sel",label:"Pale birds eaten",min:0,max:0.6,step:0.05,get:()=>s.sel,set:set("sel"),fmt:()=>Math.round(s.sel*100)+"%"},
    {type:"range",id:"mig",label:"Migrants",min:0,max:0.2,step:0.01,get:()=>s.mig,set:set("mig"),fmt:()=>Math.round(s.mig*100)+"% a gen"},
    {type:"range",id:"mu",label:"Mutation",min:0,max:0.03,step:0.005,get:()=>s.mu,set:set("mu"),fmt:()=>(s.mu*100).toFixed(1)+"%"},
    {type:"select",id:"pA",label:"Mother",options:[["DD","DD"],["Dd","Dd"],["dd","dd"]],get:()=>s.pA,set:(x,v)=>{s.pA=v;cross()}},
    {type:"select",id:"pB",label:"Father",options:[["DD","DD"],["Dd","Dd"],["dd","dd"]],get:()=>s.pB,set:(x,v)=>{s.pB=v;cross()}},
    {type:"button",id:"breed",label:"Breed again",onClick:()=>cross()},
    {type:"toggle",id:"pick0",label:"Male 1",get:()=>s.gelPick===0,set:()=>{s.gelPick=0}},
    {type:"toggle",id:"pick1",label:"Male 2",get:()=>s.gelPick===1,set:()=>{s.gelPick=1}},
    {type:"toggle",id:"pick2",label:"Male 3",get:()=>s.gelPick===2,set:()=>{s.gelPick=2}},
    {type:"button",id:"newgel",label:"New family",onClick:()=>{s.gelSeed++;G=gel();s.gelPick=-1}}],
  tick:(()=>{let acc=0;return(x,dt)=>{acc+=dt*4;while(acc>=1){acc--;generation()}}})(),
  drawMain, drawClose,
  chips:()=>{const c={dd:0};s.birds.forEach(g=>{if(g==="dd")c.dd++});return{
    freq:["d FREQUENCY",Math.round((1-s.p)*100)+"%",true],N:["POPULATION",String(s.N)],pale:["PALE BIRDS",Math.round(c.dd/Math.max(1,s.birds.length)*100)+"%"],
    lost:["ALLELES LEFT",s.p===0||s.p===1?"1 (one lost)":"2"],sel:["PALE EATEN",Math.round(s.sel*100)+"%"],mig:["MIGRANTS",Math.round(s.mig*100)+"% a generation"],mu:["MUTATION",(s.mu*100).toFixed(1)+"% a generation"],
    pA:["MOTHER",s.pA],pB:["FATHER",s.pB],pick:["YOUR PICK",s.gelPick<0?"none":"Male "+(s.gelPick+1)]}},
  challenges:[
    {q:"Pick the chick's real father from the DNA profile.",check:()=>s.gelPick===G.real,ok:"Yes: he carries every band the chick didn't get from its mother.",no:"Not that one. Find a chick band the mother doesn't have, then find the male who does."},
    {q:"Choose two parents that can never have a pale chick, but can have chicks that carry pale.",check:()=>{const set=[s.pA,s.pB].sort().join();return set==="DD,Dd"||set==="Dd,DD"||set==="DD,dd"||set==="dd,DD"},ok:"Yes: with one DD parent every chick gets a D, so all are dark, but some carry d.",no:()=>`Not yet: ${s.pA} × ${s.pB} gives ${expPale()}. One parent must be DD and the other must carry d.`},
    {q:"Run a population until one allele is lost completely.",check:()=>s.p===0||s.p===1,ok:"Yes: with so few birds, chance alone removed an allele. Only mutation or migration can bring it back.",no:"Not yet. Make the population very small, press Play and watch the graph."}],
  papers:[{label:"NZQA: Chemistry and Biology",url:"https://www2.nzqa.govt.nz/ncea/subjects/past-exams-and-exemplars/chemistry-and-biology/"},{label:"DOC: black robin",url:"https://www.doc.govt.nz/news/media-releases/2025-media-releases/more-habitat-needed-for-black-robins/"}],
  truth:"The birds and their feather gene are invented to show the ideas; real traits often involve many genes. Black robin facts (five birds in 1980, all descended from Old Blue, about 445 today) are from the Department of Conservation.",
  footer:"Covers AS 92022: sources of variation (mutation, sexual reproduction), what changes it in populations (small populations, survival, migration), allele frequency, and gene tracking with DNA profiles."
});
})();
