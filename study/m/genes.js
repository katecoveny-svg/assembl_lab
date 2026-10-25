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
// ---------- the 3D bench: a Punnett cross with real chicks, an island of birds whose colours are the gene pool, a DNA helix and a gel tank
function genes3d(S){const {THREE,mat,PAL}=S;const V3=(x,y,z)=>new THREE.Vector3(x,y,z);
  const TOP=.3,ZC=V3(-13.5,0,0),ZI=V3(0,0,0),ZM=V3(8.4,0,-2.6),ZG=V3(17,0,0);
  const plinth=(c,w,d,tint)=>{const p=S.rbox(w,.3,d,.12,mat("plastic",tint,{rough:.55,coat:.2}));p.position.set(c.x,.15,c.z);S.scene.add(p);return p};
  plinth(ZC,8.6,7.2,PAL.case.blush);plinth(ZI,12.4,9.2,PAL.case.mint);plinth(ZM,4.2,4.2,PAL.case.sky);plinth(ZG,7.4,6.2,PAL.case.lavender);
  const FONT="Instrument Sans, system-ui, sans-serif";
  const COLS={DD:DARK,Dd:DARK,dd:PALE};
  const tmp=new THREE.Vector3(),q0=new THREE.Quaternion(),eul=new THREE.Euler();
  let seed=99;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
  // ---------------------------------------------------------------- bird parts (simple pebble birds: body, head, tail; no faces). Dd carriers wear a butter dot
  const bodyGeo=new THREE.SphereGeometry(1,18,14),tailGeo=new THREE.ConeGeometry(.45,1,10);tailGeo.rotateZ(Math.PI/2);
  const plum=mat("plastic","#ffffff",{rough:.38});
  function flock(n,o={}){const b=S.swarm(n,bodyGeo,plum,{colors:true,cast:o.cast??true}),h=S.swarm(n,bodyGeo,plum,{colors:true,cast:o.cast??true}),t=S.swarm(n,tailGeo,plum,{colors:true}),d=S.swarm(n,bodyGeo,mat("plastic",PAL.product.butter,{rough:.3}));
    const par=o.parent||S.scene;par.add(b,h,t,d);
    return {n,put(i,x,y,z,sc,g,yaw=0,hop=0){if(sc<=0||!g){b.put(i,0,-9,0,.001);h.put(i,0,-9,0,.001);t.put(i,0,-9,0,.001);d.put(i,0,-9,0,.001);return}
        const c=Math.cos(yaw),s2=Math.sin(yaw);eul.set(0,yaw,0);q0.setFromEuler(eul);const Y=y+hop;
        b.putS(i,x,Y+sc*.9,z,sc*1.3,sc*.95,sc,q0);h.put(i,x+c*sc*1.05,Y+sc*1.75,z-s2*sc*1.05,sc*.62);t.putS(i,x-c*sc*1.35,Y+sc*1.1,z+s2*sc*1.35,sc*.8,sc*.4,sc*.5,q0);
        d.put(i,g==="Dd"?x-c*sc*.1:0,g==="Dd"?Y+sc*1.82:-9,g==="Dd"?z+s2*sc*.1:0,g==="Dd"?sc*.32:.001);
        const col=COLS[g];b.tint(i,col);h.tint(i,col);t.tint(i,g==="dd"?"#E8DFCC":"#2F3A66")},
      done(){b.done();h.done();t.done();d.done()},parts:[b,h,t,d]}}
  // ---------------------------------------------------------------- the cross: two parents, a 3D Punnett square, a brood tray of chicks
  const cz=S.group();cz.position.copy(ZC);
  const parentAt=[V3(-2.7,0,-1.9),V3(2.7,0,-1.9)];
  parentAt.forEach(p=>cz.add(S.rbox(1.6,.4,1.6,.12,mat("plastic","#ffffff",{rough:.4}),{at:[p.x,TOP+.2,p.z]})));
  const parents=flock(2,{parent:cz});
  const allele=S.swarm(8,bodyGeo,mat("plastic","#ffffff",{rough:.3}),{colors:true,cast:true});cz.add(allele);   // 4 parent alleles + 4 Punnett headers
  const PX=0,PZ=-1.2,PC=.95;
  cz.add(S.rbox(PC*2+.5,.16,PC*2+.5,.08,mat("acrylic",PAL.case.blush,{opacity:.3}),{at:[PX,TOP+.08,PZ],cast:false}));
  const tiles=[0,1,2,3].map(k=>{const i=k>>1,j=k&1;const m=mat("plastic","#ffffff",{rough:.35,fresh:true});const t=S.rbox(PC-.08,.22,PC-.08,.06,m,{at:[PX+(j-.5)*PC,TOP+.27,PZ+(i-.5)*PC]});cz.add(t);return {t,m,i,j}});
  const tileBirds=flock(4,{parent:cz});
  const tray=S.rbox(7.2,.22,1.9,.1,mat("plastic","#ffffff",{rough:.4}),{at:[0,TOP+.11,2.15]});cz.add(tray);
  const trayWall=S.rbox(7.4,.5,2.1,.12,mat("acrylic",PAL.case.blush,{opacity:.22}),{at:[0,TOP+.3,2.15],cast:false});trayWall.renderOrder=3;cz.add(trayWall);
  const chicks=flock(24,{parent:cz});let kidsRef=null,kidsT=0;
  // tap a parent to change its genotype, tap the tray to breed again (the same as the Mother, Father and Breed again controls)
  const cyc={DD:"Dd",Dd:"dd",dd:"DD"};
  const hitP=parentAt.map((p,i)=>{const m=S.cyl(.8,.8,1.6,mat("flat","#ffffff",{opacity:0,depthWrite:false}),{at:[p.x,TOP+1,p.z],cast:false});m.material.colorWrite=false;cz.add(m);
    S.pick(m,()=>{const s=S.api.state;if(i===0)s.pA=cyc[s.pA];else s.pB=cyc[s.pB];cross()});return m});
  S.pick(tray,()=>cross());
  const lMum=S.label({cls:"big",off:[-30,-40]}),lDad=S.label({cls:"big",off:[30,-40]});
  const lTile=[0,1,2,3].map(k=>S.label({off:[(k&1)?34:-34,(k>>1)?26:-26]}));
  const lBrood=S.label({cls:"hot",off:[30,34]});
  // ---------------------------------------------------------------- the island: sea, sand, grass, and up to 200 birds whose colours are the alleles they carry
  const iz=S.group();iz.position.copy(ZI);
  const sea=S.cyl(4.45,4.45,.34,mat("liquid",PAL.water,{opacity:.55,depthWrite:false}),{at:[0,TOP+.17,.3],seg:72,cast:false});sea.renderOrder=2;iz.add(sea);
  const ring=S.torus(4.45,.05,mat("plastic","#ffffff",{rough:.3}),{at:[0,TOP+.34,.3],rot:[Math.PI/2,0,0],ts:96});iz.add(ring);
  const sand=S.mesh(new THREE.CylinderGeometry(3.45,3.75,.42,64),mat("plastic","#F2E3C2",{rough:.7,coat:.1}),{at:[0,TOP+.25,.3]});iz.add(sand);
  const turf=S.mesh(new THREE.CylinderGeometry(3.0,3.3,.2,64),mat("plastic","#BFE3A6",{rough:.7,coat:.1}),{at:[0,TOP+.52,.3]});iz.add(turf);
  const IY=TOP+.62;
  // a few pastel bushes and rocks so it reads as a place
  {const bush=S.swarm(14,new THREE.IcosahedronGeometry(1,1),mat("plastic","#8FCB7A",{rough:.5}),{colors:true,cast:true});for(let i=0;i<14;i++){const a=i/14*Math.PI*2+.2,r=3.05+rnd()*.25,s2=.18+rnd()*.16;bush.putS(i,Math.cos(a)*r,IY-.05+s2*.5,.3+Math.sin(a)*r,s2*1.3,s2,s2*1.2);bush.tint(i,i%2?"#8FCB7A":"#A6D98F")}bush.done();iz.add(bush)}
  const birds=flock(200,{parent:iz});
  const home=[];for(let i=0;i<200;i++)home.push({ph:rnd()*6,sp:.6+rnd()*.8,yaw:rnd()*6,jx:rnd()-.5,jz:rnd()-.5});
  let lastGen=-1,genT=0,lastBirds=null;const eaten=new Set();
  const spot=(i,n,out)=>{const r=2.75*Math.sqrt((i+.5)/Math.max(n,1)),a=i*2.39996;return out.set(Math.cos(a)*r,IY,.3+Math.sin(a)*r)};
  // the gene pool jar: 120 allele beads, the dark share is the D frequency
  const jar=S.group(iz);jar.position.set(4.75,TOP,-3.15);
  jar.add(S.cyl(.62,.66,.12,mat("plastic","#ffffff",{rough:.4}),{at:[0,.06,0]}));
  const glass=S.cyl(.6,.6,1.9,mat("glass","#ffffff",{opacity:.16}),{at:[0,1.07,0],cast:false,open:true});glass.renderOrder=6;jar.add(glass);
  jar.add(S.torus(.6,.03,mat("plastic","#ffffff"),{at:[0,2.02,0],rot:[Math.PI/2,0,0]}));
  const NBd=120,beads=S.swarm(NBd,new THREE.SphereGeometry(.105,14,10),mat("plastic","#ffffff",{rough:.3}),{colors:true,cast:true});jar.add(beads);
  const bslot=[];for(let i=0;i<NBd;i++){const layer=Math.floor(i/12),k=i%12,a=k/12*Math.PI*2+layer*.5,r=k%3===0?.12:.4;bslot.push(V3(Math.cos(a)*r,.24+layer*.19,Math.sin(a)*r))}
  const border=[...Array(NBd).keys()].sort(()=>rnd()-.5);let beadKey="";const beadFlip=new Float32Array(NBd);
  // a graph screen: D frequency over the generations (the same line as the side graph)
  const gscr=S.group(iz);gscr.position.set(-4.7,TOP,-3.2);gscr.rotation.y=.35;
  gscr.add(S.cyl(.05,.07,1.1,mat("metal"),{at:[0,.55,0]}));gscr.add(S.rbox(.8,.1,.5,.04,mat("plastic","#ffffff"),{at:[0,.05,0]}));
  gscr.add(S.rbox(3.3,2.0,.08,.06,mat("plastic","#ffffff",{rough:.35}),{at:[0,2.05,-.05]}));
  const graph=S.panel(600,360,3.1);graph.position.set(0,2.05,0);gscr.add(graph);let graphKey="",graphT=0;
  // ---------------------------------------------------------------- the predator: circles overhead and swoops on pale birds (survival)
  const hawk=S.group(iz);
  {const hm=mat("plastic","#6E5A7E",{rough:.4});const hb=S.sphere(.22,hm);hb.scale.set(1.8,.7,.8);hawk.add(hb);hawk.add(S.sphere(.13,hm,{at:[.36,.06,0]}));
    const wingG=new THREE.BoxGeometry(.5,.04,1.5);const w=S.mesh(wingG,hm);hawk.add(w);hawk.userData.w=w;const tl=S.mesh(new THREE.BoxGeometry(.35,.03,.3),hm,{at:[-.45,0,0]});hawk.add(tl)}
  let swoop={i:-1,t:0},nextSwoop=1.5;
  const puffE=S.puffs(30,"#ffffff");iz.add(puffE);const pe=Array.from({length:30},()=>({p:V3(0,0,0),v:V3(0,0,0),life:0}));
  // ---------------------------------------------------------------- the migrants' island: nearly all D, birds fly across
  const mz=S.group();mz.position.copy(ZM);
  mz.add(S.cyl(1.75,1.75,.3,mat("liquid",PAL.water,{opacity:.55,depthWrite:false}),{at:[0,TOP+.15,0],cast:false,seg:48}));
  mz.add(S.mesh(new THREE.CylinderGeometry(1.25,1.45,.4,48),mat("plastic","#F2E3C2",{rough:.7,coat:.1}),{at:[0,TOP+.22,0]}));
  mz.add(S.mesh(new THREE.CylinderGeometry(1.05,1.2,.18,48),mat("plastic","#BFE3A6",{rough:.7,coat:.1}),{at:[0,TOP+.48,0]}));
  const mBirds=flock(12,{parent:mz});const mG=[];{let s0=5;const r=()=>(s0=(s0*16807)%2147483647)/2147483647;for(let i=0;i<12;i++){const a=r()<s.pm?"D":"d",b=r()<s.pm?"D":"d";mG.push(a+b==="DD"?"DD":a+b==="dd"?"dd":"Dd")}}
  const NF=10,fly=flock(NF,{cast:false});const wings=S.swarm(NF*2,new THREE.BoxGeometry(.5,.03,.22),mat("plastic","#2F3A66",{rough:.4}));S.scene.add(wings);
  const route=S.tube(Array.from({length:24},(_,i)=>{const u=i/23;return [S.lerp(ZM.x,1.6,u),TOP+.8+Math.sin(u*Math.PI)*2.2,S.lerp(ZM.z,-.6,u)]}),.025,mat("flat",PAL.deep.sky,{opacity:.35,depthWrite:false}),{seg:80,cast:false});S.scene.add(route);
  const fl=Array.from({length:NF},()=>({t:1,a:V3(0,0,0),b:V3(0,0,0),g:"DD"}));let flAcc=0;
  // ---------------------------------------------------------------- a DNA double helix that turns; in the mutation step one base pair changes
  const hz=S.group();hz.position.set(-5.05,TOP,3.3);
  hz.add(S.cyl(.6,.7,.3,mat("plastic","#ffffff",{rough:.4}),{at:[0,.15,0]}));
  const helix=S.group(hz);helix.position.y=.45;
  const HN=22,HH=2.7,HR=.42,turns=2;const strand=k=>Array.from({length:60},(_,i)=>{const u=i/59,a=u*turns*Math.PI*2+k*Math.PI;return [Math.cos(a)*HR,u*HH,Math.sin(a)*HR]});
  helix.add(S.tube(strand(0),.05,mat("plastic",PAL.product.strawberry,{rough:.3}),{seg:200}));helix.add(S.tube(strand(1),.05,mat("plastic",PAL.product.blueberry,{rough:.3}),{seg:200}));
  const rungGeo=new THREE.CylinderGeometry(.035,.035,1,8);rungGeo.rotateZ(Math.PI/2);
  const rungs=S.swarm(HN*2,rungGeo,mat("plastic","#ffffff",{rough:.35}),{colors:true,cast:true});helix.add(rungs);
  const BASE={A:PAL.product.lime,T:PAL.product.peach,G:PAL.product.butter,C:"#B9A3EA"},PAIR={A:"T",T:"A",G:"C",C:"G"};
  const seq=[...Array(HN)].map(()=>"ATGC"[Math.floor(rnd()*4)]);let mutI=-1,mutT=0;
  const mutGlow=S.puffs(1,PAL.product.butter,{additive:true});helix.add(mutGlow);
  const drawRungs=()=>{for(let i=0;i<HN;i++){const u=(i+.5)/HN,a=u*turns*Math.PI*2,y=u*HH;const cx=Math.cos(a)*HR/2,cz2=Math.sin(a)*HR/2;eul.set(0,-a,0);q0.setFromEuler(eul);
    rungs.putS(i*2,cx,y,cz2,HR,1,1,q0);rungs.putS(i*2+1,-cx,y,-cz2,HR,1,1,q0);rungs.tint(i*2,BASE[seq[i]]);rungs.tint(i*2+1,BASE[PAIR[seq[i]]])}rungs.done()};drawRungs();
  // ---------------------------------------------------------------- the gel tank: five lanes of glowing bands; tap a male's lane to pick him
  const gz=S.group();gz.position.copy(ZG);
  gz.add(S.rbox(6.0,.3,4.2,.1,mat("plastic","#ffffff",{rough:.4}),{at:[0,TOP+.15,0]}));
  const tank=S.acrylicCase(5.8,.7,4.0,PAL.case.mint,{opacity:.08});tank.position.y=TOP+.3;gz.add(tank);
  const gelM=mat("plastic","#E6F5EE",{rough:.25,coat:.6});gz.add(S.rbox(5.3,.18,3.5,.05,gelM,{at:[0,TOP+.42,0]}));
  gz.add(S.cyl(.06,.06,5.2,mat("metal",PAL.product.strawberry),{at:[0,TOP+.6,1.85],rot:[0,0,Math.PI/2]}));gz.add(S.cyl(.06,.06,5.2,mat("metal","#3E4262"),{at:[0,TOP+.6,-1.85],rot:[0,0,Math.PI/2]}));
  const LW=1.0,lx=i=>(i-2)*LW;
  for(let i=0;i<5;i++)gz.add(S.box(.62,.06,.12,mat("plastic","#CFE3D9"),{at:[lx(i),TOP+.5,-1.45]}));
  const NBand=5*4*2,bands=S.swarm(NBand,new S.RoundedBoxGeometry(.66,.07,.085,2,.02),mat("plastic","#ffffff",{rough:.3}),{colors:true});gz.add(bands);
  let gelRef=null,gelT=0;
  const laneHit=[0,1,2].map(m=>{const h=S.box(.9,.4,3.4,mat("flat","#ffffff",{opacity:0,depthWrite:false}),{at:[lx(m+2),TOP+.6,0],cast:false});h.material.colorWrite=false;gz.add(h);S.pick(h,()=>{S.api.state.gelPick=m});return h});
  const lLane=["Mother","Chick","Male 1","Male 2","Male 3"].map((n,i)=>S.label({off:[0,-34]}).set(n));
  const lGel=S.label({off:[40,40]}).set("Tap a male's lane<small>to pick the father</small>");
  // ---------------------------------------------------------------- island labels
  const lPop=S.label({cls:"big",off:[-40,-46]}),lPool=S.label({cls:"hot",off:[-30,-30]}),lMut=S.label({off:[30,-30]}),lLost=S.label({cls:"hot",off:[30,-40]});
  const lHawk=S.label({off:[30,-20]}),lMig=S.label({off:[0,-50]}),lHome=S.label({off:[40,30]}),lGraph=S.label({off:[0,-30]});
  // ---------------------------------------------------------------- views
  S.view("cross",[ZC.x+.6,6.6,ZC.z+9.4],[ZC.x,.9,ZC.z+.1],{min:4,max:24});
  S.view("pool",[1.2,8.4,12.6],[0,1.0,-.2],{min:4,max:30});
  S.view("mutation",[-2.4,6.2,11.8],[-1.6,1.4,.4],{min:4,max:30});
  S.view("small",[.8,4.6,8.2],[0,1.0,.3],{min:3,max:24});
  S.view("survival",[1.0,8.8,11.4],[0,1.6,0],{min:4,max:30});
  S.view("migration",[5.4,8.0,13.4],[3.6,1.1,-1],{min:4,max:30});
  S.view("dna",[ZG.x+.4,6.6,ZG.z+6.4],[ZG.x,.4,ZG.z+.2],{min:3,max:24});
  S.view("all",[1.8,11.5,28],[1.8,.8,0],{min:8,max:60});
  const islandL=[lPop,lPool,lMut,lLost,lHawk,lMig,lHome,lGraph],crossL=[lMum,lDad,...lTile,lBrood],gelL=[...lLane,lGel];
  const show={cross:crossL,pool:[lPop,lPool],mutation:[lPop,lPool,lMut],small:[lPop,lPool,lLost],survival:[lPop,lPool,lHawk],migration:[lPop,lPool,lMig,lHome],dna:gelL,test:[lPool]};
  S.goView("pool",true);
  return {
    step(st){const k=st.k,v=k==="test"?"all":k;S.goView(v);
      if(k==="cross")S.setShadowBox(6,[ZC.x,0,0]);else if(k==="dna")S.setShadowBox(5,[ZG.x,0,0]);else if(k==="test")S.setShadowBox(20,[2,0,0]);else S.setShadowBox(8,[2,0,-1]);
      [...islandL,...crossL,...gelL].forEach(l=>l.hide());(show[k]||[]).forEach(l=>l.show());if(k==="dna")gelT=0},
    update(s,st,dt,t){const k=st.k,R=S.REDUCED?0:1;const playing=s.playing&&st.speed;
      // ---- cross
      const P2=[s.pA,s.pB];
      parentAt.forEach((p,i)=>parents.put(i,p.x,TOP+.4,p.z,.42,P2[i],i?Math.PI-.5:.5,Math.abs(Math.sin(t*2+i))*.04*R));parents.done();
      // the four alleles each parent carries float above it; the Punnett headers repeat them along the square's edges
      for(let i=0;i<2;i++)for(let j=0;j<2;j++){const p=parentAt[i];const a=P2[i][j];allele.put(i*2+j,p.x+(j-.5)*.5,TOP+2.15+Math.sin(t*2+j)*.04*R,p.z,.15);allele.tint(i*2+j,a==="D"?DARK:PALE)}
      for(let j=0;j<2;j++){allele.put(4+j,PX+(j-.5)*PC,TOP+.42,PZ-PC-.2,.12);allele.tint(4+j,P2[1][j]==="D"?DARK:PALE);allele.put(6+j,PX-PC-.2,TOP+.42,PZ+(j-.5)*PC,.12);allele.tint(6+j,P2[0][j]==="D"?DARK:PALE)}allele.done();
      tiles.forEach((T,n)=>{const g=[P2[0][T.i],P2[1][T.j]].sort().join("").replace("dD","Dd");T.m.color.set(g==="dd"?"#FFF7E6":g==="DD"?"#DCD8EE":"#ECE8F7");
        tileBirds.put(n,PX+(T.j-.5)*PC,TOP+.38,PZ+(T.i-.5)*PC,.17,g,.6);lTile[n].at(tmp.set(ZC.x+PX+(T.j-.5)*PC,TOP+.7,PZ+(T.i-.5)*PC)).set(`<b>${g}</b>`)});tileBirds.done();
      if(s.kids!==kidsRef){kidsRef=s.kids;kidsT=0}kidsT+=dt;
      for(let i=0;i<24;i++){const g=s.kids[i];const pop=S.clamp((kidsT-i*.04)*4,0,1);const x=-3.2+(i%12)*.58,z=1.75+Math.floor(i/12)*.75;
        chicks.put(i,x,TOP+.22,z,g?.17*S.ease(pop):0,g,.4+Math.sin(i)*.4,Math.max(0,Math.sin(t*4+i))*.03*R)}chicks.done();
      const cnt={DD:0,Dd:0,dd:0};s.kids.forEach(g=>cnt[g]++);
      lMum.at(tmp.set(ZC.x+parentAt[0].x,TOP+1.5,parentAt[0].z)).set(`Mother<b>${s.pA}</b>`);lDad.at(tmp.set(ZC.x+parentAt[1].x,TOP+1.5,parentAt[1].z)).set(`Father<b>${s.pB}</b>`);
      lBrood.at(tmp.set(ZC.x+3.2,TOP+.5,2.5)).set(`Pale chicks<b>${cnt.dd} of ${s.kids.length}</b><small>the Punnett square predicts ${expPale()}</small>`);
      // ---- island birds
      const b=s.birds,n=b.length;if(s.gen!==lastGen||b!==lastBirds){lastGen=s.gen;lastBirds=b;genT=0;eaten.clear()}genT+=dt;
      const sc=S.clamp(.62/Math.sqrt(Math.max(n,1)),.075,.3);
      for(let i=0;i<200;i++){if(i>=n||eaten.has(i)){if(!(swoop.i===i&&swoop.t<.6))birds.put(i,0,0,0,0);continue}
        const h=home[i];spot(i,n,tmp);const w=Math.sin(t*h.sp*R+h.ph);const hop=(genT<.25?Math.sin(genT/.25*Math.PI)*sc*.8:0)*R+Math.max(0,w)*sc*.25*R;
        birds.put(i,tmp.x+h.jx*sc,tmp.y,tmp.z+h.jz*sc,sc,b[i],h.yaw+Math.sin(t*.3+h.ph)*.6*R,hop)}
      // predator: circles; every couple of seconds swoops on a pale bird, which is gone until the next generation is drawn
      const predOn=s.sel>0&&(k==="survival"||k==="test");hawk.visible=predOn;
      if(predOn){nextSwoop-=dt;if(swoop.i<0&&nextSwoop<=0&&!S.REDUCED){const pale=[];for(let i=0;i<n;i++)if(b[i]==="dd"&&!eaten.has(i))pale.push(i);if(pale.length){swoop={i:pale[Math.floor(rnd()*pale.length)],t:0}}nextSwoop=1.2+rnd()*1.5/(s.sel*3)}
        const ca=t*.6;let hx=Math.cos(ca)*3.0,hy=3.3,hz2=.3+Math.sin(ca)*3.3,yaw=-ca-Math.PI/2;
        if(swoop.i>=0){swoop.t+=dt*.8;spot(swoop.i,n,tmp);const u=swoop.t;const k2=u<.5?S.ease(u*2):S.ease((1-u)*2);hx=S.lerp(hx,tmp.x,k2);hy=S.lerp(hy,tmp.y+.3,k2);hz2=S.lerp(hz2,tmp.z,k2);
          if(u>=.5&&!eaten.has(swoop.i)){eaten.add(swoop.i);for(let m=0;m<6;m++){const e=pe.find(q=>q.life<=0);if(e){e.p.copy(tmp).setY(tmp.y+.15);e.v.set(rnd()-.5,.6+rnd()*.5,rnd()-.5);e.life=.8}}}if(u>=1)swoop={i:-1,t:0}}
        hawk.position.set(hx,hy,hz2);hawk.rotation.set(0,yaw,Math.sin(t*2)*.15);hawk.userData.w.rotation.x=Math.sin(t*6)*.25}
      pe.forEach((e,i)=>{if(e.life>0){e.life-=dt;e.p.addScaledVector(e.v,dt)}puffE.put(i,e.p.x,e.p.y,e.p.z,Math.max(0,e.life)*.8,90)});puffE.done();
      birds.done();
      // mutation sparks: a few birds glint each generation as a d allele turns into D
      // gene pool jar
      const nD=Math.round(s.p*NBd),bk=nD+"";if(bk!==beadKey){for(let i=0;i<NBd;i++){const wasD=beads.userData&&beads.userData.d&&beads.userData.d[i];const isD=border.indexOf(i)<nD;if(beads.userData.d&&wasD!==isD)beadFlip[i]=1}
        beads.userData.d=[...Array(NBd)].map((_,i)=>border.indexOf(i)<nD);beadKey=bk}
      for(let i=0;i<NBd;i++){const p=bslot[i];beadFlip[i]=Math.max(0,beadFlip[i]-dt*2.5);const j=Math.sin(t*3+i)*.01*R;beads.put(i,p.x+j,p.y+beadFlip[i]*.15,p.z,1+beadFlip[i]*.5);beads.tint(i,beads.userData.d[i]?DARK:PALE)}beads.done();
      // graph screen
      graphT-=dt;const gk=s.gen+"|"+s.hist.length+"|"+s.p;if(graphT<=0&&gk!==graphKey){graphKey=gk;graphT=.3;
        graph.redraw((g,w,h)=>{g.fillStyle="#fff";g.fillRect(0,0,w,h);g.fillStyle="#6E6A86";g.font=`600 22px ${FONT}`;g.textAlign="left";g.fillText("FREQUENCY OF D OVER GENERATIONS",22,36);
          const X0=70,X1=w-24,Y0=h-44,Y1=60,X=i=>X0+i/199*(X1-X0),Y=p=>Y0-p*(Y0-Y1);g.strokeStyle="#DCD6EA";g.lineWidth=2;g.font=`600 18px ${FONT}`;g.textAlign="right";
          [0,.5,1].forEach(p=>{g.beginPath();g.moveTo(X0,Y(p));g.lineTo(X1,Y(p));g.stroke();g.fillText(p*100+"%",X0-10,Y(p)+6)});
          g.strokeStyle=PAL.deep.sky;g.lineWidth=5;g.lineJoin="round";g.beginPath();s.hist.forEach((p,i)=>i?g.lineTo(X(i),Y(p)):g.moveTo(X(i),Y(p)));g.stroke();
          g.fillStyle=PAL.product.butter;g.strokeStyle="#3E4A7C";g.lineWidth=3;g.beginPath();g.arc(X(s.hist.length-1),Y(s.p),9,0,7);g.fill();g.stroke();
          g.fillStyle="#6E6A86";g.textAlign="center";g.fillText(`GENERATION ${s.gen}`,(X0+X1)/2,h-12)})}
      // migrants
      const migOn=s.mig>0&&(k==="migration"||k==="test");mz.visible=true;route.visible=migOn;
      for(let i=0;i<12;i++){const a=i/12*Math.PI*2+i,r=.35+(i%3)*.25;mBirds.put(i,Math.cos(a)*r,TOP+.57,Math.sin(a)*r,.13,mG[i],a+Math.sin(t*.5+i)*.5*R,Math.max(0,Math.sin(t*3+i))*.03*R)}mBirds.done();
      if(migOn&&playing){flAcc+=dt*s.mig*60;while(flAcc>=1){flAcc--;const f=fl.find(q=>q.t>=1);if(!f)break;const a=rnd()*6.28;f.a.set(ZM.x+Math.cos(a)*.6,TOP+.7,ZM.z+Math.sin(a)*.6);spot(Math.floor(rnd()*Math.max(1,n)),Math.max(1,n),f.b);f.b.add(ZI);f.t=0;f.g=mG[Math.floor(rnd()*12)]}}
      fl.forEach((f,i)=>{if(!migOn)f.t=1;if(f.t<1){f.t+=dt*.45;const u=Math.min(1,f.t);tmp.lerpVectors(f.a,f.b,u);tmp.y+=Math.sin(u*Math.PI)*2.2;const yaw=Math.atan2(-(f.b.z-f.a.z),f.b.x-f.a.x);fly.put(i,tmp.x,tmp.y,tmp.z,.2,f.g,yaw);
          const fl2=Math.sin(t*14+i)*.6;eul.set(fl2,yaw,0);q0.setFromEuler(eul);wings.putS(i*2,tmp.x+Math.sin(yaw)*.22,tmp.y+.3,tmp.z+Math.cos(yaw)*.22,1.5,1.5,1.5,q0);eul.set(-fl2,yaw,0);q0.setFromEuler(eul);wings.putS(i*2+1,tmp.x-Math.sin(yaw)*.22,tmp.y+.3,tmp.z-Math.cos(yaw)*.22,1.5,1.5,1.5,q0)}
        else{fly.put(i,0,0,0,0);wings.put(i*2,0,-9,0,.001);wings.put(i*2+1,0,-9,0,.001)}});fly.done();wings.done();
      // helix
      helix.rotation.y+=dt*.5*R;
      if(k==="mutation"||s.mu>0){mutT-=dt;if(mutT<=0&&playing){mutI=Math.floor(rnd()*HN);seq[mutI]="ATGC".replace(seq[mutI],"")[Math.floor(rnd()*3)];drawRungs();mutT=1.6}}
      if(mutI>=0){const u=(mutI+.5)/HN;mutGlow.put(0,0,u*HH,0,Math.max(0,mutT/1.6)*.9,500)}else mutGlow.put(0,0,0,0,0,1);mutGlow.done();
      // ---- gel: bands run down from the wells when the step opens or a new family is made
      if(G!==gelRef){gelRef=G;gelT=0}gelT+=dt;const run=S.ease(S.clamp(gelT/2.5,0,1));
      const lanes=[G.mum,G.chick,G.dads[0],G.dads[1],G.dads[2]];let bi=0;
      lanes.forEach((m,i)=>{const c=i===1?PAL.product.strawberry:i===0?PAL.product.blueberry:(s.gelPick===i-2?PAL.product.butter:"#5A6596");
        m.forEach((pair,mk)=>pair.forEach(bb=>{const zf=-1.05+mk*.72+bb*.1;bands.put(bi,lx(i),TOP+.55,S.lerp(-1.45,zf,run),1);bands.tint(bi,c);bi++}))});bands.done();
      lLane.forEach((L,i)=>L.at(tmp.set(ZG.x+lx(i),TOP+.75,-1.6)));lGel.at(tmp.set(ZG.x+lx(3),TOP+.6,1.3));
      // ---- island labels
      const dd=b.filter(g=>g==="dd").length;
      lPop.at(tmp.set(-2.6,IY+.4,-2.2)).set(`${s.N>200?"200 of ":""}${s.N} birds<small>generation ${s.gen} · ${Math.round(dd/Math.max(1,n)*100)}% pale</small>`);
      lPool.at(tmp.set(4.75,TOP+2.1,-3.15)).set(`Gene pool<b>D ${Math.round(s.p*100)}% · d ${Math.round((1-s.p)*100)}%</b>`);
      lMut.at(tmp.set(-5.05,TOP+2.6,3.3)).set(`Mutation<b>${(s.mu*100).toFixed(1)}% a generation</b><small>a random change in the DNA</small>`);
      lLost.at(tmp.set(0,IY+.6,.3)).set(s.p===0||s.p===1?`${s.p===1?"d":"D"} allele lost for good<small>only mutation or migration can bring it back</small>`:`Both alleles still here<small>chance decides who breeds</small>`);
      lHawk.at(hawk.position).set(`Predator<small>spots pale birds: ${Math.round(s.sel*100)}% eaten</small>`);lHawk.show(predOn&&k==="survival");
      lMig.at(tmp.set(ZM.x,TOP+1.2,ZM.z)).set(`Migrants' island<b>${Math.round(s.pm*100)}% D</b><small>${Math.round(s.mig*100)}% of birds arrive each generation</small>`);
      lHome.at(tmp.set(2.2,IY+.3,2.2)).set(`This island<b>D ${Math.round(s.p*100)}%</b>`);
      lGraph.at(tmp.set(-4.7,TOP+2.6,-3.2)).set("Allele frequency");
    }};
}
StudyKit.mount({kupu:KUPU,scene3d:genes3d,
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
