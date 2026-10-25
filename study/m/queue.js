(()=>{
// The queue machine: NCEA Level 2 Mathematics and Statistics AS91267 (apply probability methods). Checkout and ED
// queues as the NCEA Everyday-Engineering Practice Pack frames them: Poisson-style arrivals, normally distributed
// service times (μ = 118 s, σ = 19 s), waiting-time distributions from a small discrete-event simulation you can run,
// relative risk of breaching the ED's 6-hour target, and a probability tree. Cross-links to the lab's ED and
// supermarket twins for the full simulations.
const esc=StudyKit.esc;
const fmt=(x,d=0)=>{let v=Number(x);if(!isFinite(v))v=0;if(Math.abs(v)<0.5*Math.pow(10,-d))v=0;return v.toLocaleString("en-NZ",{maximumFractionDigits:d,minimumFractionDigits:d})};
const REDUCED=matchMedia("(prefers-reduced-motion: reduce)").matches;
const LAB="https://assembl-lab.vercel.app/";
// the bench figure look (StudyKit.fig): a shop floor on paper, wood-and-steel checkouts with rubber belts, simple faceless
// shoppers, charts on frosted lavender screens, product colours for the data
const F=StudyKit.fig,PAL=F.palette,LAV=PAL.case.lavender,LAVD=F.deep(LAV),AXIS="#8F9BAA",NAVY="#262E5C",GREY="#6E6A86";
const STRAW=PAL.product.strawberry,BLUE=PAL.product.blueberry,BUTTER=PAL.product.butter,LIME=PAL.product.lime,WOOD="#D9B48C";
// ---- maths
function erf(x){const t=1/(1+0.3275911*Math.abs(x));const y=1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-0.284496736)*t+0.254829592)*t*Math.exp(-x*x);return x<0?-y:y}
const Phi=z=>0.5*(1+erf(z/Math.SQRT2));
const poisson=(lam,k)=>{let p=Math.exp(-lam);for(let i=1;i<=k;i++)p*=lam/i;return p};
// seeded random (mulberry32) so a run can be repeated
function rng(seed){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}}
function randn(r){let u=0,v=0;while(u===0)u=r();while(v===0)v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}
// ---- state
const s={lam:1.6,win:2,k:0, mu:118,sig:19,lo:100,hi:120, rate:3,c:6, edRate:14,beds:8,edHours:24, pSelf:0.4,pHelpSelf:0.3,pHelpStaff:0.1,
  seed:7,sim:null,lastRun:null,runA:null,runB:null,playing:false,speed:60,t:0,hist:[],arrCount:0,arrT:0,wins:[],mode:"checkout"};
// ---- the discrete-event simulation (FIFO, c identical servers)
function newSim(opts){const r=rng(opts.seed);return{r,rate:opts.rate,c:opts.c,service:opts.service,t:0,queue:[],busy:[],done:[],nextArr:-Math.log(1-r())/opts.rate,n:0,waits:[],totals:[]}}
function stepSim(S,until){while(S.t<until){const nextDep=S.busy.length?Math.min(...S.busy.map(b=>b.end)):Infinity;const nxt=Math.min(S.nextArr,nextDep,until);S.t=nxt;
    if(nxt===until)break;
    if(nextDep<=S.nextArr){const i=S.busy.findIndex(b=>b.end===nextDep);const b=S.busy.splice(i,1)[0];S.done.push(b);S.totals.push(b.end-b.arr);S.waits.push(b.start-b.arr)}
    else{S.queue.push({arr:S.t,id:S.n++});S.nextArr=S.t-Math.log(1-S.r())/S.rate}
    while(S.queue.length&&S.busy.length<S.c){const p=S.queue.shift();p.start=S.t;p.end=S.t+S.service(S.r);S.busy.push(p)}}}
const svcCheckout=r=>Math.max(20,s.mu+s.sig*randn(r))/60;                       // minutes
const svcED=r=>{const u=r();return Math.max(10,-Math.log(1-r())*(u<0.12?120:30))};      // minutes: 88% simple cases (mean 30 min), 12% complex (mean 120 min); overall mean ≈ 41 min (estimate)
function runFast(opts){const S=newSim(opts);stepSim(S,opts.minutes);return summarise(S,opts)}
function summarise(S,opts){const w=S.waits.slice().sort((a,b)=>a-b),tt=S.totals.slice();const q=(a,p)=>a.length?a[Math.min(a.length-1,Math.floor(p*a.length))]:0;
  // anyone still inside at the end who has already passed 6 hours has breached too (otherwise the longest waits would never be counted)
  const stuck=[...S.queue,...S.busy].filter(p=>S.t-p.arr>360).length;const n=w.length,nT=tt.length+stuck;
  const breach=tt.filter(x=>x>360).length+stuck;return{n,mean:n?w.reduce((a,b)=>a+b,0)/n:0,median:q(w,0.5),q1:q(w,0.25),q3:q(w,0.75),max:w.length?w[w.length-1]:0,over5:n?w.filter(x=>x>5).length/n:0,
    nT,within6:nT?1-breach/nT:1,breach:nT?breach/nT:0,breaches:breach,stuck,rate:opts.rate,c:opts.c,minutes:opts.minutes,seed:opts.seed,waits:w,served:S.done.length,left:S.queue.length+S.busy.length}}
function startLive(){s.sim=newSim({seed:s.seed,rate:s.rate,c:s.c,service:svcCheckout});s.t=0;s.lastRun=null}
function startArr(){s.hist=[];s.wins=[];s.arrCount=0;s.arrT=0;s.t=0;s.sim=null;s.arrR=rng(s.seed);s.nextA=-Math.log(1-s.arrR())/s.lam;s.dots=[]}
function tickArr(dt){const d=dt*s.speed/60;s.t+=d;s.arrT+=d;// simulated minutes
  while(s.nextA<=s.t){s.arrCount++;s.dots.push({t:s.nextA});s.nextA+=-Math.log(1-s.arrR())/s.lam}
  if(s.arrT>=s.win){s.wins.push(s.arrCount);s.arrCount=0;s.arrT-=s.win}
  s.dots=s.dots.filter(x=>s.t-x.t<2.5)}
function tickLive(dt){if(!s.sim)startLive();const d=dt*s.speed/60;stepSim(s.sim,s.t+d);s.t+=d;if(s.t>=60){s.lastRun=summarise(s.sim,{rate:s.rate,c:s.c,minutes:60,seed:s.seed});s.playing=false}}
// ---- drawing
const LINE="#DCD6EA",SKIN=["#F2D0B4","#D9A47E","#B07650","#E8B48A","#8D5A3B"];
// a simple painted figure (head, body, legs; no face), feet on the floor at y + 12
const person=(x,y,c,k)=>{const m=F.mat("painted",c),sk=SKIN[Math.abs(Math.floor(k||0))%SKIN.length];return `<g transform="translate(${x.toFixed(1)},${y.toFixed(1)})"><ellipse cx="5" cy="12.5" rx="10" ry="2.3" fill="${PAL.shadow}" opacity=".16"/><path d="M-3,5 v6.5 M3,5 v6.5" stroke="#4E4868" stroke-width="2.6" stroke-linecap="round"/><path d="M-8,7 v-6 q0,-9 8,-9 q8,0 8,9 v6z" fill="${c}" stroke="${m.stroke}" stroke-width="1"/><path d="M-5,1 q0.5,-4 4,-5.5" stroke="#fff" stroke-opacity=".55" stroke-width="1.6" fill="none" stroke-linecap="round"/><circle cy="-13.5" r="6" fill="${sk}" stroke="#A9805F" stroke-width=".8"/><path d="M-6,-14 a6,6 0 0 1 12,0 q-6,-3 -12,0z" fill="#4E4868"/></g>`};
// a rounded solid with a lit top and shaded side, for cards and panels standing on the paper
function slab(x,y,w,h,r,d,c,sh){const white=c==="#FFFFFF",m=white?{hi:"#FFFFFF",shade:"#E3E8F0",stroke:"#C2CAD6"}:F.mat("plastic",c),i=Math.min(r*0.35,w/4),dy=-0.55*d;
  return (sh===false?"":F.shadow(x+i,y+h,w-i+d,{opacity:.1,len:Math.min(26,Math.max(12,h*0.3))}))+`<path d="M${x+i},${y} l${d},${dy} h${w-2*i} l${-d},${-dy}z" fill="${m.hi}" stroke="${m.stroke}" stroke-linejoin="round"/><path d="M${x+w},${y+i} l${d},${dy} v${Math.max(0,h-2*i)} l${-d},${-dy}z" fill="${m.shade}" stroke="${m.stroke}" stroke-linejoin="round"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${c}" stroke="${m.stroke}" stroke-width="1.2"/>`}
function drawMain(st){const W=800,H=420;let o=F.floor(W,H);
  if(st.k==="arrivals")return o+drawArrivals();if(st.k==="service")return o+drawNormal();if(st.k==="ed")return o+drawED();if(st.k==="tree")return o+drawTree();return o+drawCheckout()}
function drawArrivals(){let o=`<text x="30" y="36" class="t-lab">SHOPPERS ARRIVING AT ${fmt(s.lam,1)} A MINUTE ON AVERAGE · ${fmt(s.t,1)} MIN</text>`;
  // the walkway into the shop: a low lavender platform; shoppers walk along it to the counter
  o+=F.box(40,164,600,8,{colour:LAV,kind:"plastic",d:26,r:2,shadowLen:30});
  (s.dots||[]).forEach(d=>{const age=s.t-d.t;o+=person(80+age/2.5*620,150,BLUE,d.t*7)});
  o+=F.acrylic(640,90,120,120,{tint:LAV,d:14,r:12})+`<rect x="650" y="100" width="100" height="100" rx="8" fill="#fff" fill-opacity=".72" stroke="${LAVD}" stroke-opacity=".6"/><text x="700" y="118" text-anchor="middle" class="t-lab">THIS WINDOW</text><text x="700" y="160" text-anchor="middle" class="t-big" style="font-size:30px">${s.arrCount}</text><text x="700" y="190" text-anchor="middle" class="t-lab">${fmt(s.arrT,1)} OF ${s.win} MIN</text>`;
  // the chart on a frosted lavender screen
  o+=F.acrylic(28,224,736,192,{tint:LAV,d:8,r:14,balls:false,shadow:false,opacity:.32});
  o+=`<text x="40" y="240" class="t-lab">ARRIVALS PER ${s.win}-MINUTE WINDOW SO FAR (${s.wins.length} WINDOWS) · BARS = OBSERVED, DOTS = POISSON MODEL λ = ${fmt(s.lam*s.win,2)}</text>`;
  const lam=s.lam*s.win,K=Math.max(8,Math.ceil(lam+3*Math.sqrt(lam)));const cnt=Array(K+1).fill(0);s.wins.forEach(w=>{if(w<=K)cnt[w]++});const n=Math.max(1,s.wins.length);
  const bw=Math.min(50,680/(K+1)),x0=60,y0=400,hmax=120;let pmax=0.05;for(let k=0;k<=K;k++)pmax=Math.max(pmax,poisson(lam,k),cnt[k]/n);
  o+=`<line x1="${x0}" x2="${x0+(K+1)*bw}" y1="${y0}" y2="${y0}" stroke="${AXIS}"/>`;
  for(let k=0;k<=K;k++){const x=x0+k*bw,bh=cnt[k]/n/pmax*hmax;o+=`<rect x="${x+2}" y="${y0-bh}" width="${bw-4}" height="${bh}" rx="3" fill="${BLUE}" fill-opacity=".85" stroke="${F.mat("painted",BLUE).stroke}" stroke-width="${bh>0?1:0}"/><circle cx="${x+bw/2}" cy="${y0-poisson(lam,k)/pmax*hmax}" r="4" fill="${STRAW}" stroke="${NAVY}"/><text x="${x+bw/2}" y="${y0+14}" text-anchor="middle" class="t-lab">${k}</text>`}
  return o}
function drawNormal(){let o=`<text x="30" y="36" class="t-lab">CHECKOUT SERVICE TIME · NORMAL, μ = ${fmt(s.mu)} s, σ = ${fmt(s.sig)} s</text>`;
  o+=F.acrylic(40,48,720,364,{tint:LAV,d:10,r:16,shadow:false,opacity:.3});
  const X=x=>60+(x-(s.mu-4*s.sig))/(8*s.sig)*680,Y=p=>360-p*280;const pdf=x=>Math.exp(-0.5*((x-s.mu)/s.sig)**2);
  let d="",a="";for(let i=0;i<=200;i++){const x=s.mu-4*s.sig+i/200*8*s.sig;d+=(i?"L":"M")+X(x).toFixed(1)+","+Y(pdf(x)).toFixed(1)}
  const lo=Math.max(s.lo,s.mu-4*s.sig),hi=Math.min(s.hi,s.mu+4*s.sig);if(hi>lo){for(let i=0;i<=100;i++){const x=lo+i/100*(hi-lo);a+=(i?"L":"M")+X(x).toFixed(1)+","+Y(pdf(x)).toFixed(1)}a+=` L${X(hi).toFixed(1)},360 L${X(lo).toFixed(1)},360Z`}
  o+=`<path d="${a}" fill="${BUTTER}" opacity=".75"/><path d="${d}" fill="none" stroke="${NAVY}" stroke-width="2.4"/><line x1="60" x2="740" y1="360" y2="360" stroke="${AXIS}"/>`;
  for(let z=-3;z<=3;z++){const x=s.mu+z*s.sig;o+=`<line x1="${X(x)}" x2="${X(x)}" y1="360" y2="368" stroke="${AXIS}"/><text x="${X(x)}" y="384" text-anchor="middle" class="t-lab">${fmt(x)}</text><text x="${X(x)}" y="400" text-anchor="middle" class="t-lab" style="fill:${GREY}">z = ${z}</text>`}
  const zl=(s.lo-s.mu)/s.sig,zh=(s.hi-s.mu)/s.sig,p=Phi(zh)-Phi(zl);
  o+=slab(470,60,300,130,14,8,"#FFFFFF")+`<g transform="translate(470,60)"><text x="14" y="26" class="t-lab">P(${s.lo<=s.mu-4*s.sig?"X":fmt(s.lo)+" < X"} ${s.hi>=s.mu+4*s.sig?"":"< "+fmt(s.hi)}${s.lo<=s.mu-4*s.sig&&s.hi>=s.mu+4*s.sig?" anything":""})</text>`;
  o+=`<text x="14" y="54" class="t-ink">z = (x − μ) ÷ σ: ${s.lo<=s.mu-4*s.sig?"−∞":fmt(zl,2)} to ${s.hi>=s.mu+4*s.sig?"∞":fmt(zh,2)}</text><text x="14" y="78" class="t-ink">Φ(${fmt(zh,2)}) − Φ(${fmt(zl,2)}) = ${fmt(Phi(zh),3)} − ${fmt(Phi(zl),3)}</text><text x="14" y="114" class="t-big" style="font-size:22px">P = ${fmt(p,3)}</text></g>`;
  return o}
function checkout(x,w,d,busy){// a wood counter with a steel edge and kick plate, a rubber belt along its top (goods on it when busy) and a steel till
  const dy=-0.55*d,t=f=>[x+f*d,80+f*dy],WM=F.mat("wood",WOOD);let o=F.box(x,80,w,56,{colour:WOOD,kind:"wood",d,r:3,shadowLen:24});
  const [ax,ay]=t(0.18),[bx,by]=t(0.78),bl=w*0.64;
  o+=`<path d="M${ax+2},${ay} L${bx+2},${by} h${bl} L${ax+2+bl},${ay}z" fill="#4A5366" stroke="#2F3646" stroke-width=".8" stroke-linejoin="round"/>`;
  for(let k=1;k<4;k++){const u=k/4;o+=`<path d="M${ax+2+bl*u},${ay} L${bx+2+bl*u},${by}" stroke="#fff" stroke-opacity=".18" stroke-width="1"/>`}
  if(busy)[[0.12,STRAW],[0.42,LIME],[0.7,BLUE]].forEach(([u,c],k)=>{if(u*bl+8<bl)o+=F.box((ax+bx)/2+2+u*bl-2,(ay+by)/2+2-6,Math.min(9,bl*0.18),6,{colour:c,kind:"painted",d:3,shadow:false})});
  o+=`<path d="M${x+3},80.5 H${x+w-3}" stroke="${PAL.steel}" stroke-width="3" stroke-linecap="round"/><path d="M${x+6},88 H${x+w-8}" stroke="${WM.hi}" stroke-width="2" stroke-linecap="round" opacity=".8"/><path d="M${x+w*0.5},92 V126" stroke="${WM.stroke}" stroke-opacity=".35"/><rect x="${x+1}" y="126" width="${w-2}" height="9" rx="2" fill="${PAL.steel}" stroke="${PAL.steelDark}" stroke-width=".8"/>`;
  const tw=Math.max(10,w*0.2),tx=x+w-tw-2+d*0.3,ty=80+dy*0.3;o+=F.box(tx,ty-11,tw,11,{colour:PAL.steel,kind:"metal",d:Math.min(7,d*0.35),r:2,shadow:false})+`<rect x="${tx+2}" y="${ty-9}" width="${tw-4}" height="5" rx="1" fill="#3B4466"/>`;
  return o}
function drawCheckout(){const S=s.sim;let o=`<text x="30" y="36" class="t-lab">${s.c} CHECKOUT${s.c>1?"S":""} OPEN · ${fmt(s.rate,1)} ARRIVALS A MINUTE · ${S?fmt(s.t,1):0} OF 60 MIN</text>`;
  const cw=Math.min(110,600/s.c),dd=Math.min(22,cw*0.28);
  for(let i=0;i<s.c;i++){const x=120+i*cw;const b=S&&S.busy[i];o+=checkout(x,cw-16,dd,!!b);
    if(b)o+=person(x+(cw-16)/2,170,STRAW,b.id)+`<text x="${x+(cw-16)/2}" y="196" text-anchor="middle" class="t-lab">${fmt((b.end-S.t)*60)} s</text>`}
  // the queue lane: steel posts with a lavender rope
  const posts=[116,276,436,596,756];
  posts.slice(0,-1).forEach((p,k)=>{o+=`<path d="M${p},209 Q${p+80},218 ${posts[k+1]},209" fill="none" stroke="${LAVD}" stroke-width="3" stroke-linecap="round"/>`});
  posts.forEach(p=>{o+=F.cyl(p,208,3.2,14,{colour:PAL.steel,kind:"metal",shadowLen:10})+`<ellipse cx="${p}" cy="222" rx="7" ry="2.4" fill="${PAL.steelDark}"/>`});
  if(S){const q=S.queue;q.slice(0,40).forEach((p,i)=>{o+=person(120+(i%20)*32,250+Math.floor(i/20)*44,BLUE,p.id)});if(q.length>40)o+=`<text x="120" y="340" class="t-ink">+ ${q.length-40} more</text>`;
    o+=`<text x="30" y="226" class="t-lab">WAITING: ${q.length}</text>`;
    const r=summarise(S,{rate:s.rate,c:s.c,minutes:s.t,seed:s.seed});
    o+=slab(30,360,740,44,12,7,"#FFFFFF",false)+`<g transform="translate(30,360)"><text x="14" y="28" class="t-ink">${r.n} served · mean wait ${fmt(r.mean,1)} min · median ${fmt(r.median,1)} · longest ${fmt(r.max,1)} · ${Math.round(r.over5*100)}% waited over 5 min · busy ${Math.round(Math.min(1,s.rate*s.mu/60/s.c)*100)}%</text></g>`}
  else o+=`<text x="120" y="280" class="t-ink">Press play to open the doors for a simulated hour (${s.speed}× real time).</text>`;
  return o}
function drawED(){let o=`<text x="30" y="36" class="t-lab">ED: ${fmt(s.edRate)} ARRIVALS AN HOUR, ${s.beds} BEDS, ${s.edHours} SIMULATED HOURS · TREATMENT 30 MIN TYPICAL, 12% COMPLEX CASES (ESTIMATE)</text>`;
  // each saved run is a frosted lavender screen with a white readout, keyed by a product colour (A strawberry, B blueberry)
  const show=(r,x,label,c)=>{if(!r){o+=`<g transform="translate(${x},70)"><rect width="340" height="200" rx="14" fill="#fff" fill-opacity=".55" stroke="#B9B3CF" stroke-dasharray="6 4"/><text x="170" y="110" text-anchor="middle" class="t-ink">${label}: press Run, then Save as ${label}</text></g>`;return}
    o+=F.acrylic(x,70,340,200,{tint:LAV,d:12,r:14,opacity:.4})+`<rect x="${x+7}" y="77" width="326" height="186" rx="10" fill="#fff" fill-opacity=".78" stroke="${c}" stroke-width="2"/>`;
    o+=`<g transform="translate(${x},70)"><text x="16" y="28" class="t-lab">RUN ${label} · ${r.c} BEDS · ${fmt(r.rate)}/h · ${fmt(r.minutes/60)} h</text>
      <text x="16" y="62" class="t-big" style="font-size:26px">${fmt(r.within6*100,1)}%</text><text x="150" y="62" class="t-ink">finished within 6 h</text>
      <text x="16" y="96" class="t-ink">${r.breaches} of ${r.nT} breached · risk ${fmt(r.breach,3)}</text><text x="16" y="120" class="t-ink">median wait for a bed ${fmt(r.median)} min</text><text x="16" y="144" class="t-ink">longest wait ${fmt(r.max)} min · ${r.left} still inside at the end</text>
      <text x="16" y="178" class="t-lab">SEED ${r.seed} · SAME SEED, SAME RESULT</text></g>`};
  show(s.runA,30,"A",STRAW);show(s.runB,420,"B",BLUE);
  if(s.runA&&s.runB){const rr=s.runB.breach>0?s.runA.breach/s.runB.breach:Infinity;o+=slab(30,290,740,110,14,10,PAL.case.butter,false)+`<g transform="translate(30,290)"><text x="16" y="30" class="t-lab">RELATIVE RISK OF BREACHING 6 HOURS, A ÷ B</text><text x="16" y="66" class="t-big" style="font-size:24px">${isFinite(rr)?fmt(rr,2):"∞ (B had no breaches)"}</text><text x="16" y="94" class="t-ink">${isFinite(rr)?(rr>=2?`Run A's risk is ${fmt(rr,1)} times B's: the claim "at least halves the risk" holds for these runs.`:rr>1?`Run A's risk is only ${fmt(rr,2)} times B's: less than halved.`:"B is no better than A here."):"B had zero breaches, so the ratio is undefined: say so, and run longer."} Sample sizes: ${s.runA.nT} and ${s.runB.nT}.</text></g>`}
  else o+=`<text x="30" y="330" class="t-ink">The pack's question: 14 an hour, 8 beds, then 12 beds. Does adding beds at least halve the risk of breaching 6 hours?</text>`;
  return o}
function drawTree(){const p=s.pSelf,a=s.pHelpSelf,b=s.pHelpStaff;const pH=p*a+(1-p)*b;let o=`<text x="30" y="36" class="t-lab">PROBABILITY TREE: WHICH CHECKOUT, THEN WHETHER THEY NEED HELP</text>`;
  const br=(x1,y1,x2,y2,lab,c)=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c||NAVY}" stroke-width="2.2" stroke-linecap="round"/><text x="${(x1+x2)/2-6}" y="${(y1+y2)/2-6}" class="t-ink" text-anchor="end">${lab}</text>`;
  o+=br(120,220,300,120,`self ${fmt(p,2)}`)+br(120,220,300,320,`staffed ${fmt(1-p,2)}`);
  o+=br(300,120,480,80,`help ${fmt(a,2)}`,STRAW)+br(300,120,480,160,`no help ${fmt(1-a,2)}`)+br(300,320,480,280,`help ${fmt(b,2)}`,STRAW)+br(300,320,480,360,`no help ${fmt(1-b,2)}`);
  // the leaves are little cards on the paper; the two "help" leaves are butter
  const leaf=(y,txt,hot)=>slab(490,y-16,280,32,8,6,hot?BUTTER:"#FFFFFF")+`<text x="502" y="${y+5}" class="t-ink">${txt}</text>`;
  o+=leaf(80,`self AND help: ${fmt(p,2)} × ${fmt(a,2)} = ${fmt(p*a,3)}`,true)+leaf(160,`self, no help: ${fmt(p*(1-a),3)}`)+leaf(280,`staffed AND help: ${fmt(1-p,2)} × ${fmt(b,2)} = ${fmt((1-p)*b,3)}`,true)+leaf(360,`staffed, no help: ${fmt((1-p)*(1-b),3)}`);
  [[300,120],[300,320]].forEach(([x,y])=>o+=`<circle cx="${x}" cy="${y}" r="4" fill="#fff" stroke="${NAVY}" stroke-width="1.6"/>`);
  o+=`<circle cx="122" cy="223" r="8" fill="${PAL.shadow}" opacity=".15"/><circle cx="120" cy="220" r="8" fill="${NAVY}"/><circle cx="117.5" cy="217.5" r="2.4" fill="#fff" opacity=".5"/>`;
  o+=`<g transform="translate(30,380)"><text x="0" y="0" class="t-ink">P(help) = ${fmt(p*a,3)} + ${fmt((1-p)*b,3)} = ${fmt(pH,3)} · P(self | help) = ${fmt(p*a,3)} ÷ ${fmt(pH,3)} = ${fmt(pH?p*a/pH:0,3)}</text></g>`;
  return o}
function drawClose(st){const w=420;let o=F.floor(420,260);
  if(st.k==="arrivals"){const lam=s.lam*s.win;o+=`<text class="t-lab" x="14" y="22">POISSON: P(X = k) = e^(−λ) λ^k ÷ k!, λ = ${fmt(s.lam,1)} × ${s.win} = ${fmt(lam,2)}</text>`;
    [0,1,2,3,4,5].forEach((k,i)=>{o+=`<text class="t-lab" x="14" y="${54+i*26}">P(${k})</text><text class="t-ink" x="60" y="${54+i*26}">${fmt(poisson(lam,k),4)}</text>`});
    o+=`<text class="t-ink" x="200" y="54">P(0) = e^(−${fmt(lam,2)}) = ${fmt(poisson(lam,0),4)}</text><text class="t-ink" x="200" y="80">P(at least 1) = 1 − P(0) = ${fmt(1-poisson(lam,0),4)}</text><text class="t-ink" x="200" y="106">mean = variance = λ</text><text class="t-ink" x="200" y="132">observed mean: ${s.wins.length?fmt(s.wins.reduce((x,y)=>x+y,0)/s.wins.length,2):"–"}</text>`;
    o+=`<text class="t-lab" x="14" y="236">POISSON IS A LEVEL 3 TOPIC (AS91586); AT LEVEL 2 YOU COMPARE THE OBSERVED DISTRIBUTION</text>`;return o}
  if(st.k==="service"){o+=`<text class="t-lab" x="14" y="22">STANDARD NORMAL: AREA TO THE LEFT OF z</text>`;const X=z=>40+(z+3.5)/7*360,Y=p=>220-p*170;let d="";for(let i=0;i<=140;i++){const z=-3.5+i/20;d+=(i?"L":"M")+X(z).toFixed(1)+","+Y(Phi(z)).toFixed(1)}
    o+=`<line x1="40" x2="400" y1="220" y2="220" stroke="${AXIS}"/><path d="${d}" fill="none" stroke="${STRAW}" stroke-width="2.4"/>`;const zl=(s.lo-s.mu)/s.sig,zh=(s.hi-s.mu)/s.sig;
    [[zl,BLUE],[zh,BUTTER]].forEach(([z,c])=>{if(z>-3.5&&z<3.5)o+=`<line x1="${X(z)}" x2="${X(z)}" y1="${Y(Phi(z))}" y2="220" stroke="${c}" stroke-width="2" stroke-dasharray="4 3"/><circle cx="${X(z)}" cy="${Y(Phi(z))}" r="5" fill="${c}" stroke="${NAVY}"/>`});
    [-3,-2,-1,0,1,2,3].forEach(z=>o+=`<text class="t-lab" x="${X(z)}" y="238" text-anchor="middle">${z}</text>`);
    o+=`<text class="t-ink" x="48" y="48">Φ(${fmt(zl,2)}) = ${fmt(Phi(zl),4)} · Φ(${fmt(zh,2)}) = ${fmt(Phi(zh),4)}</text><text class="t-ink" x="48" y="70">P(X > 100) = 1 − Φ(−0.95) = ${fmt(1-Phi((100-s.mu)/s.sig),3)}</text>`;return o}
  if(st.k==="wait"||st.k==="test"){const r=s.lastRun||(s.sim?summarise(s.sim,{rate:s.rate,c:s.c,minutes:s.t,seed:s.seed}):null);o+=`<text class="t-lab" x="14" y="22">WAITING TIMES THIS HOUR: SHAPE, CENTRE, SPREAD</text>`;
    if(!r||!r.n){o+=`<text class="t-ink" x="14" y="60">Press play on the checkout, or Run an hour.</text>`;return o}
    const B=12,wmax=Math.max(10,Math.ceil(r.max)),bw=wmax/B,cnt=Array(B).fill(0);r.waits.forEach(x=>{cnt[Math.min(B-1,Math.floor(x/bw))]++});const m=Math.max(...cnt,1);
    for(let i=0;i<B;i++){const h=cnt[i]/m*130;o+=`<rect x="${40+i*28}" y="${210-h}" width="24" height="${h}" fill="${BLUE}" opacity=".75"/><text class="t-lab" x="${52+i*28}" y="226" text-anchor="middle">${fmt(i*bw)}</text>`}
    o+=`<text class="t-lab" x="400" y="240" text-anchor="end">WAIT (MIN)</text><text class="t-ink" x="48" y="48">n = ${r.n} · mean ${fmt(r.mean,1)} · median ${fmt(r.median,1)} · IQR ${fmt(r.q1,1)}–${fmt(r.q3,1)} · max ${fmt(r.max,1)}</text><text class="t-ink" x="48" y="70">${r.mean>r.median*1.2?"Skewed right: a few long waits pull the mean up.":"Fairly symmetric."}</text>`;return o}
  if(st.k==="ed"){o+=`<text class="t-lab" x="14" y="22">RELATIVE RISK = P(breach | A) ÷ P(breach | B)</text><text class="t-ink" x="14" y="52">Above 1: A is riskier. Below 1: A is safer.</text><text class="t-ink" x="14" y="74">"At least halves the risk" means RR ≥ 2 (A = fewer beds).</text><text class="t-ink" x="14" y="110">Calculation AND interpretation earn the marks:</text><text class="t-ink" x="14" y="132">state the two risks, the ratio, what it means,</text><text class="t-ink" x="14" y="154">and the sample sizes behind them.</text>`;
    o+=`<text class="t-lab" x="14" y="196">THE FULL TWIN: ${LAB.replace("https://","")}ed</text><text class="t-lab" x="14" y="216">SUPERMARKET TWIN: ${LAB.replace("https://","")}store</text>`;return o}
  const p=s.pSelf,a=s.pHelpSelf,b=s.pHelpStaff;o+=`<text class="t-lab" x="14" y="22">THE SAME NUMBERS AS A TWO-WAY TABLE (OUT OF 1000 SHOPPERS)</text>`;
  const T=[["",`help`,`no help`,`total`],[`self`,fmt(1000*p*a),fmt(1000*p*(1-a)),fmt(1000*p)],[`staffed`,fmt(1000*(1-p)*b),fmt(1000*(1-p)*(1-b)),fmt(1000*(1-p))],[`total`,fmt(1000*(p*a+(1-p)*b)),fmt(1000*(1-p*a-(1-p)*b)),"1000"]];
  T.forEach((row,i)=>row.forEach((c,j)=>{o+=`<rect x="${14+j*96}" y="${40+i*34}" width="94" height="32" fill="${i===0||j===0?LAV:"#FFFFFF"}" stroke="${LINE}"/><text class="t-ink" x="${61+j*96}" y="${61+i*34}" text-anchor="middle">${esc(c)}</text>`}));
  o+=`<text class="t-ink" x="14" y="206">P(self | help) = ${fmt(1000*p*a)} ÷ ${fmt(1000*(p*a+(1-p)*b))} = ${fmt(p*a/(p*a+(1-p)*b),3)}</text><text class="t-ink" x="14" y="230">Risk of needing help: self ${fmt(a,2)} vs staffed ${fmt(b,2)} → relative risk ${fmt(a/b,2)}</text>`;
  return o}
// ---- steps
const steps=[
 {k:"arrivals",lab:"Arrivals",cap:"Shoppers arrive at random, 1.6 a minute on average. Press play and count how many arrive in each 2-minute window. How often does nobody arrive at all?",speed:1,speedLabel:"60× real time",controls:["play","restart","lam","win"],
  big:"<b>The big idea:</b> random arrivals at a steady average rate follow a Poisson distribution, with λ = rate × window. The no-arrivals probability is e^(−λ).",
  exam:"λ = 1.6 × 2 = 3.2 for a 2-minute window, so P(0) = e^(−3.2) = 0.0408 ≈ 0.04. (Poisson is formally a Level 3 distribution; at Level 2, compare the observed distribution's shape, centre and spread with the model.)",
  trap:"Using λ for one minute in a two-minute question. Scale the rate to the window first.",chips:["lam","p0","obs"],onStep:()=>{startArr()}},
 {k:"service",lab:"Service times",cap:"Checkout service times are normally distributed with μ = 118 s and σ = 19 s (the 2025 paper's style). Slide the bounds to shade a region and read the probability.",speed:0,controls:["lo","hi","mu","sig"],
  big:"<b>The big idea:</b> standardise with z = (x − μ) ÷ σ, then use the tables (or calculator) for the area. Draw the curve and shade it every time.",
  exam:"P(X > 100) = P(Z > (100 − 118) ÷ 19) = P(Z > −0.95) = 0.829. P(100 < X < 120) = P(−0.95 < Z < 0.11) = 0.829 − 0.456 = 0.373.",
  trap:"Forgetting that the tables give the area to the left. For P(Z > −0.95) you need 1 − Φ(−0.95), which equals Φ(0.95) by symmetry.",chips:["z","prob","sig"]},
 {k:"wait",lab:"Waiting times",cap:"Now put them together. Arrivals at random, service times normal, a few checkouts open. Press play for a simulated hour and watch the queue; the close-up builds the distribution of waiting times.",speed:1,speedLabel:"60× real time",controls:["play","restart","rate","c","seed"],
  big:"<b>The big idea:</b> an experimental distribution. Describe it the way the standard asks: shape (usually skewed right), centre (median and mean), spread (IQR, range), and any unusual values, then compare two settings.",
  exam:"With six checkouts and three arrivals a minute (one simulated hour, 180 shoppers), waits ran from 0 to 4.4 minutes with a median of 1.8 minutes and a middle half from 0.9 to 2.4 minutes. Opening a seventh checkout shifted the centre down to a median of 0.0 minutes (most shoppers were served at once) and narrowed the spread to a maximum of 2.3 minutes, with the distribution now strongly skewed to the right.",
  trap:"Comparing only the means. Say shape, centre AND spread, and note that a different random run gives slightly different numbers.",chips:["served","meanw","over5","busy"],onStep:()=>{s.sim=null;s.t=0;s.lastRun=null}},
 {k:"ed",lab:"The ED and relative risk",cap:"The pack's investigation: 14 arrivals an hour with 8 beds, then 12 beds. Run each for a day, save them as A and B, and compute the relative risk of breaching the 6-hour target. Your numbers will vary; that is the point.",speed:0,controls:["edRate","beds","edHours","seed","runED","saveA","saveB"],
  big:"<b>The big idea:</b> relative risk = risk in group A ÷ risk in group B. Say what it means in words, and give the sample sizes, because a ratio of small numbers is shaky.",
  exam:"With 8 beds, 6 of 271 patients breached 6 hours: risk 0.022. With 12 beds, 2 of 308 breached: risk 0.006. Relative risk = 0.022 ÷ 0.006 ≈ 3.4, so adding four beds cut the risk of a breach to about a third, which more than halves it. Both runs were 24 simulated hours, but the breach counts (6 and 2) are small, so another run could give a very different ratio; say so, and run longer before trusting it.",
  trap:"Reporting the difference in percentages as the relative risk, or quoting a ratio without the sample sizes behind it.",chips:["rrA","rrB","rr"]},
 {k:"tree",lab:"Tree and table",cap:"Two stages at the checkout: which lane a shopper chooses, then whether they need help. Multiply along the branches, add across the leaves, and turn it into a two-way table.",speed:0,controls:["pSelf","pHelpSelf","pHelpStaff"],
  big:"<b>The big idea:</b> P(A and B) = P(A) × P(B | A). To get P(B) add every route to B. Conditional probability runs backwards: P(A | B) = P(A and B) ÷ P(B).",
  exam:"P(help) = P(self) × P(help | self) + P(staffed) × P(help | staffed) = 0.4 × 0.3 + 0.6 × 0.1 = 0.12 + 0.06 = 0.18. P(self | help) = 0.12 ÷ 0.18 = 0.667: two-thirds of the shoppers who need help are at the self-checkouts.",
  trap:"Reading P(help | self) as P(self | help). The condition is the branch you are already on.",chips:["phelp","pself","rrhelp"]},
 {k:"test",lab:"Test yourself",cap:"Five challenges. Use the controls from any step; two need a simulation run. Then press Check.",controls:["lam","win","lo","hi","rate","c","edRate","beds","edHours","seed","runED","saveA","saveB","runHour","pSelf","pHelpSelf","pHelpStaff"],chips:["p0","prob","meanw","rr","phelp"],
  big:"<b>Exam tip:</b> write the probability statement first (P(X > 100)), then the working, then a sentence in context with the sample size when it comes from data."}];
// ---- kupu Māori: te reo terms for this machine, each checked in Te Aka Māori Dictionary (ta = word id). Sources and notes: te-reo-notes.md
const KUPU=[
 {mi:"tūponotanga",en:"probability, chance",ta:46069,chip:["p0","prob","phelp"]},
 {mi:"pāpono",en:"event (in probability)",ta:45828},
 {mi:"putanga",en:"outcome",ta:6346},
 {mi:"tūtira",en:"queue, row, file",ta:8821,note:"Te Aka also lists rārangi for a line or queue."},
 {mi:"toharite",en:"mean, average",ta:38680,chip:"meanw",note:"Te Aka also lists toharite for the median; check which your class uses."},
 {mi:"ine mahora",en:"standard deviation",ta:49898,chip:"sig"},
 {mi:"tauanga",en:"statistics",ta:44587},
 {mi:"raraunga",en:"data",ta:6555}];
Object.entries({"arrivals":["tūponotanga","pāpono","tūtira"],"service":["toharite","ine mahora","tūponotanga"],"wait":["tūtira","toharite","raraunga"],"ed":["tūponotanga","raraunga","tauanga"],"tree":["tūponotanga","pāpono","putanga"]}).forEach(([k,a])=>{const st=steps.find(x=>x.k===k);if(st)st.kupu=a});
const CH=[
  {q:"Set an arrival rate and window so the probability of no arrivals is about 0.05.",check:()=>Math.abs(poisson(s.lam*s.win,0)-0.05)<0.006,ok:()=>`Yes: λ = ${fmt(s.lam,1)} × ${s.win} = ${fmt(s.lam*s.win,2)}, so P(0) = e^(−${fmt(s.lam*s.win,2)}) = ${fmt(poisson(s.lam*s.win,0),3)}.`,no:()=>`Not yet: P(0) = ${fmt(poisson(s.lam*s.win,0),3)}. You need λ = −ln 0.05 ≈ 3.0.`},
  {q:"Service times (μ = 118 s, σ = 19 s): shade the region for P(X > 150) and read it off.",check:()=>s.mu===118&&s.sig===19&&s.lo===150&&s.hi>=s.mu+4*s.sig,ok:()=>`Yes: z = (150 − 118) ÷ 19 = ${fmt((150-118)/19,2)}, P = 1 − Φ(${fmt((150-118)/19,2)}) = ${fmt(1-Phi((150-118)/19),3)}.`,no:()=>s.mu!==118||s.sig!==19?"Set μ = 118 and σ = 19 first.":`Set the lower bound to 150 s and slide the upper bound all the way up. Now: ${fmt(s.lo)} to ${s.hi>=s.mu+4*s.sig?"∞":fmt(s.hi)}.`},
  {q:"Three arrivals a minute: open enough checkouts that the mean wait in a simulated hour is under 1 minute (run the hour, then check).",check:()=>!!(s.lastRun&&Math.abs(s.lastRun.rate-3)<1e-9&&s.lastRun.mean<1),ok:()=>`Yes: ${s.lastRun.c} checkouts, mean wait ${fmt(s.lastRun.mean,2)} min over ${s.lastRun.n} shoppers. Each checkout is busy about ${Math.round(3*s.mu/60/s.lastRun.c*100)}% of the time.`,no:()=>!s.lastRun?"No finished hour yet. Set 3 arrivals a minute and press Run an hour (or play the Waiting times step to the end).":Math.abs(s.lastRun.rate-3)>1e-9?"Set the arrival rate to 3.0 a minute and run again.":`Your run: ${s.lastRun.c} checkouts, mean wait ${fmt(s.lastRun.mean,2)} min. Each checkout can serve about ${fmt(60/s.mu*60,1)} an hour; 3 a minute is 180 an hour.`},
  {q:"ED: run 8 beds as A and 12 beds as B (14 an hour, at least 24 hours each) and find the relative risk of breaching 6 hours.",check:()=>!!(s.runA&&s.runB&&s.runA.c===8&&s.runB.c===12&&s.runA.rate===14&&s.runB.rate===14&&s.runA.minutes>=1440&&s.runB.minutes>=1440),
    ok:()=>{const rr=s.runB.breach>0?s.runA.breach/s.runB.breach:Infinity;return `Yes: risk ${fmt(s.runA.breach,3)} (${s.runA.breaches} of ${s.runA.nT}) with 8 beds against ${fmt(s.runB.breach,3)} (${s.runB.breaches} of ${s.runB.nT}) with 12. RR = ${isFinite(rr)?fmt(rr,2):"undefined (no breaches in B)"}${isFinite(rr)?(rr>=2?": more than halved.":": not halved."):"."}`},
    no:()=>`Not yet. Saved: A = ${s.runA?`${s.runA.c} beds, ${fmt(s.runA.rate)}/h, ${fmt(s.runA.minutes/60)} h`:"nothing"}; B = ${s.runB?`${s.runB.c} beds, ${fmt(s.runB.rate)}/h, ${fmt(s.runB.minutes/60)} h`:"nothing"}. Set 14 an hour, 24 hours, 8 beds → Run → Save as A; then 12 beds → Run → Save as B.`},
  {q:"Tree: set the three chances so that P(needs help) is exactly 0.25.",check:()=>Math.abs(s.pSelf*s.pHelpSelf+(1-s.pSelf)*s.pHelpStaff-0.25)<0.005,ok:()=>`Yes: ${fmt(s.pSelf,2)} × ${fmt(s.pHelpSelf,2)} + ${fmt(1-s.pSelf,2)} × ${fmt(s.pHelpStaff,2)} = ${fmt(s.pSelf*s.pHelpSelf+(1-s.pSelf)*s.pHelpStaff,3)}.`,no:()=>`Not yet: P(help) = ${fmt(s.pSelf*s.pHelpSelf+(1-s.pSelf)*s.pHelpStaff,3)}. Multiply along each branch and add the two "help" leaves.`}];
function runED(){const r=runFast({seed:s.seed,rate:s.edRate/60,c:s.beds,service:svcED,minutes:s.edHours*60});r.rate=s.edRate;s.edLast=r;s.lastED=r;StudyKit.sfx("ding");return r}
// ---------- the 3D bench: a walkway where shoppers arrive at the model's Poisson times, a normal curve with falling samples,
// a supermarket with c checkouts running the same discrete-event simulation, an ED ward replaying the current settings,
// and a 3D probability tree. Everything reads s (and the model's own functions); nothing here changes a result.
function queue3d(S){const {THREE,mat}=S;const P3=S.PAL;const V3=(x,y,z)=>new THREE.Vector3(x,y,z);
  const ZA=V3(-9.2,0,0),ZN=V3(0,0,0),ZW=V3(9.2,0,0),ZE=V3(-4.8,0,-10),ZT=V3(4.8,0,-10),TOP=.3;
  const plinth=(c,w,d,tint)=>{const p=S.rbox(w,.3,d,.12,mat("plastic",tint,{rough:.55,coat:.2}));p.position.set(c.x,.15,c.z);S.scene.add(p);return p};
  plinth(ZA,8.0,5.6,P3.case.lavender);plinth(ZN,8.0,5.6,P3.case.lavender);plinth(ZW,8.4,5.8,P3.case.lavender);plinth(ZE,8.4,5.4,P3.case.sky);plinth(ZT,8.0,5.4,P3.case.mint);
  const glowM=(c,i=0)=>new THREE.MeshStandardMaterial({color:new THREE.Color(c),emissive:new THREE.Color(c),emissiveIntensity:i,roughness:.4});
  const pm=(c,r=.35)=>mat("plastic",c,{rough:r});
  const LBL=[];const label=o=>{const l=S.label(o);LBL.push(l);return l};let overview=false;
  const tmp=V3(0,0,0);
  // an instanced crowd of faceless figures: hoodie, head, hair cap, two legs
  function crowd(n,parent,k=1){const b=S.swarm(n,new THREE.CapsuleGeometry(.08*k,.1*k,4,12),pm("#ffffff"),{colors:true,cast:true}),h=S.swarm(n,new THREE.SphereGeometry(.068*k,14,10),pm("#ffffff",.5),{colors:true}),
      hr=S.swarm(n,new THREE.SphereGeometry(.071*k,14,8),pm("#4E4868",.6)),lg=S.swarm(n*2,new THREE.CylinderGeometry(.024*k,.022*k,.16*k,8),pm("#4E4868",.5));
    [b,h,hr,lg].forEach(m=>{m.castShadow=true;(parent||S.scene).add(m)});
    return {n,put(i,x,y,z,c,sk,bob=0){b.put(i,x,y+.27*k+bob,z,1);h.put(i,x,y+.45*k+bob,z,1);hr.putS(i,x,y+.475*k+bob,z-.008,1,.6,1);lg.put(i*2,x-.04*k,y+.08*k,z,1);lg.put(i*2+1,x+.04*k,y+.08*k,z,1);b.tint(i,c);h.tint(i,sk)},
      hide(i){b.put(i,0,-9,0,0);h.put(i,0,-9,0,0);hr.put(i,0,-9,0,0);lg.put(i*2,0,-9,0,0);lg.put(i*2+1,0,-9,0,0)},done(){[b,h,hr,lg].forEach(m=>m.done())}}}
  // ---------------------------------------------------------------- arrivals: a walkway, a gate that flashes at each arrival, a counting window and the histogram
  const za=S.group();za.position.set(ZA.x,TOP,ZA.z);const WX0=-3.4,WL=5.6,WZ=1.2;
  za.add(S.rbox(WL+.4,.12,.9,.05,pm(P3.case.lavender,.45),{at:[WX0+WL/2,.06,WZ]}));
  const gateM=glowM(P3.product.butter,.3);za.add(S.torus(.55,.05,gateM,{at:[WX0+.1,.12,WZ],rot:[0,Math.PI/2,0],arc:Math.PI}));
  const door=S.group(za);door.position.set(WX0+WL+.35,0,WZ);door.add(S.rbox(.12,1.5,1.0,.04,pm("#ffffff"),{at:[0,.75,0]}));door.add(S.rbox(.5,1.2,.06,.03,mat("glass","#E6F2FC",{opacity:.25}),{at:[-.05,.6,0],rot:[0,Math.PI/2,0],cast:false}));
  door.add(S.rbox(1.0,.82,.06,.04,pm("#ffffff"),{at:[0,1.3,.56]}));const cnt=S.panel(256,200,.92);cnt.position.set(0,1.3,.595);door.add(cnt);
  const shop=crowd(40,za);
  const histB=S.panel(1100,480,6.8);histB.position.set(0,1.55,-1.6);za.add(histB);za.add(S.rbox(6.95,3.16,.06,.05,pm("#ffffff"),{at:[0,1.55,-1.64]}));
  const bars=S.swarm(40,new S.RoundedBoxGeometry(1,1,1,2,.08),pm(P3.product.blueberry,.3));za.add(bars);
  const pdots=S.swarm(40,new THREE.SphereGeometry(.07,14,10),pm(P3.product.strawberry,.3));za.add(pdots);
  const HX0=-3.0,HW=6.0,HY0=.55,HH=2.1;let histKey="";
  const lLam=label({cls:"hot big",off:[0,-30],lead:false}),lWin=label({off:[-26,-30]});
  // ---------------------------------------------------------------- service times: the normal curve as a solid, the shaded slice, and 100 samples falling into bins
  const zn=S.group();zn.position.set(ZN.x,TOP,ZN.z);const NX0=-3,NW=6,NH=2.0;const nx=x=>NX0+(x-(s.mu-4*s.sig))/(8*s.sig)*NW;
  const pdfU=u=>Math.exp(-.5*u*u);   // u in σ units
  {const sh=new THREE.Shape();sh.moveTo(NX0,0);for(let i=0;i<=160;i++){const u=-4+i/20;sh.lineTo(NX0+(u+4)/8*NW,pdfU(u)*NH)}sh.lineTo(NX0+NW,0);sh.lineTo(NX0,0);
    const g=new THREE.ExtrudeGeometry(sh,{depth:.3,bevelEnabled:false,curveSegments:4});zn.add(S.mesh(g,pm(P3.case.lavender,.4),{at:[0,.1,-.9]}))}
  zn.add(S.rbox(NW+.4,.1,2.4,.04,pm("#ffffff",.5),{at:[0,.05,-.2]}));
  const shadeM=pm(P3.product.butter,.35);let shadeMesh=null,shadeKey="";
  const NB=16,NBALL=100,balls=S.swarm(NBALL,new THREE.SphereGeometry(.055,14,10),pm("#ffffff",.25),{colors:true});zn.add(balls);
  const bin=Array(NB).fill(0),bl=[];let spawnT=0,ballR=null,ballKey="",nextBall=0,restT=0;
  for(let i=0;i<NB-1;i++)zn.add(S.box(.012,.5,.4,mat("acrylic","#ffffff",{opacity:.3}),{at:[NX0+(i+1)*NW/NB,.35,.3],cast:false}));
  const loH=S.group(zn),hiH=S.group(zn);[[loH,P3.product.blueberry],[hiH,P3.product.butter]].forEach(([g,c])=>{g.add(S.cyl(.018,.018,2.3,mat("metal",P3.steel),{at:[0,1.25,.65],seg:8}));g.add(S.sphere(.11,pm(c,.3),{at:[0,2.45,.65]}))});
  const setB=(which,p)=>{const l=zn.worldToLocal(p.clone());const x=Math.round(s.mu-4*s.sig+(l.x-NX0)/NW*8*s.sig);const v=S.clamp(x,40,200);if(which==="lo"){s.lo=v;if(s.hi<s.lo)s.hi=s.lo}else{s.hi=v;if(s.lo>s.hi)s.lo=s.hi}};
  S.dragger(loH.children[1],{normal:V3(0,0,1),move:p=>setB("lo",p)});S.dragger(hiH.children[1],{normal:V3(0,0,1),move:p=>setB("hi",p)});
  const axis=S.panel(1200,90,NW+.4);axis.rotation.x=-Math.PI/2;axis.position.set(0,.105,.95);zn.add(axis);let axisKey="";
  const readN=S.panel(620,300,2.4);readN.position.set(2.35,2.65,-1.1);zn.add(readN);zn.add(S.rbox(2.5,1.25,.06,.05,pm("#ffffff"),{at:[2.35,2.65,-1.14]}));let readKey="";
  const lBalls=label({off:[-30,-30]}),lLo=label({off:[-20,-24],lead:false}),lHi=label({off:[20,-24],lead:false});
  // ---------------------------------------------------------------- the checkout: c counters, servers behind, a roped snake queue, a screen with the wait readouts
  const zw=S.group();zw.position.set(ZW.x,TOP,ZW.z);
  const CK=8,ckX=(i,c)=>(i-(c-1)/2)*.9;const cks=[];
  for(let i=0;i<CK;i++){const g=S.group(zw);g.add(S.rbox(.72,.42,.4,.04,pm(WOOD,.55),{at:[0,.21,0]}));g.add(S.box(.46,.02,.3,pm("#4A5366",.5),{at:[-.08,.43,0]}));g.add(S.rbox(.14,.14,.14,.03,mat("metal",P3.steel),{at:[.26,.5,-.06]}));
    const goods=S.swarm(3,new THREE.BoxGeometry(.07,.05,.07),pm("#ffffff",.4),{colors:true});g.add(goods);[STRAW,LIME,BLUE].forEach((c,k)=>{goods.put(k,-.25+k*.14,.47,0,1);goods.tint(k,c)});goods.done();
    S.pick(g,()=>{s.playing=!s.playing});cks.push({g,goods})}
  const staff=crowd(CK,zw,1.1),cust=crowd(48,zw,1.1);
  const QX0=-3.3,QSP=.33,qPos=i=>{const row=Math.floor(i/20),k=i%20,x=row%2?QX0+(19-k)*QSP:QX0+k*QSP;return [x,.35+row*.55]};
  {const postM=mat("metal",P3.steel);for(const z of [.08,.62,1.17])for(let k=0;k<5;k++){zw.add(S.cyl(.03,.03,.36,postM,{at:[QX0-.15+k*1.65,.18,z],seg:10}));zw.add(S.cyl(.07,.07,.02,postM,{at:[QX0-.15+k*1.65,.01,z],seg:16}))}
    for(const z of [.08,.62,1.17])for(let k=0;k<4;k++){const a=QX0-.15+k*1.65,b=a+1.65;zw.add(S.tube([[a,.33,z],[(a+b)/2,.27,z],[b,.33,z]],.014,pm(P3.deep.lavender,.4),{seg:16,rs:5}))}}
  const scr=S.panel(1000,330,4.4);scr.position.set(0,2.15,-1.3);zw.add(scr);zw.add(S.rbox(4.56,1.6,.08,.06,pm("#3B4466",.4),{at:[0,2.15,-1.36]}));zw.add(S.cyl(.04,.05,1.4,mat("metal",P3.steel),{at:[0,.7,-1.4]}));let scrKey="";
  const pos={},slotOf={};const cLab=Array.from({length:CK},()=>label({off:[0,-30],lead:false}));const lWait=label({cls:"hot",off:[30,20]}),lPlay=label({cls:"hot",off:[0,-20]}).set("Press play to open the doors");
  // ---------------------------------------------------------------- the ED: beds, a waiting room, and screens for runs A and B
  const ze=S.group();ze.position.set(ZE.x,TOP,ZE.z);const NBED=16;
  const bedX=i=>-3.3+(i%8)*.94,bedZ=i=>i<8?-1.75:-.75;const beds=[];
  for(let i=0;i<NBED;i++){const g=S.group(ze);g.position.set(bedX(i),0,bedZ(i));g.add(S.rbox(.5,.18,.8,.05,pm("#ffffff",.4),{at:[0,.25,0]}));g.add(S.rbox(.36,.06,.16,.03,pm(P3.case.sky,.4),{at:[0,.37,-.28]}));
    for(const x of [-.2,.2])for(const z of [-.32,.32])g.add(S.cyl(.02,.02,.16,mat("metal",P3.steel),{at:[x,.08,z],seg:8}));beds.push(g)}
  const pats=S.swarm(NBED,new THREE.CapsuleGeometry(.08,.34,4,12),pm("#ffffff",.35),{colors:true});ze.add(pats);
  const patH=S.swarm(NBED,new THREE.SphereGeometry(.07,14,10),pm(SKIN[1],.5),{colors:true});ze.add(patH);
  const chairs=S.swarm(30,new S.RoundedBoxGeometry(.22,.06,.22,2,.03),pm(P3.case.lavender,.45));ze.add(chairs);for(let i=0;i<30;i++)chairs.put(i,-3.2+(i%10)*.36,.2,.35+Math.floor(i/10)*.4,1);chairs.done();
  const waitP=crowd(30,ze,.9);
  const edScr=S.panel(600,200,2.0);edScr.position.set(2.7,.95,1.5);edScr.rotation.y=-.3;ze.add(edScr);ze.add(S.rbox(2.1,.72,.06,.05,pm("#3B4466",.4),{at:[2.71,.95,1.47],rot:[0,-.3,0]}));ze.add(S.cyl(.03,.04,.6,mat("metal",P3.steel),{at:[2.7,.3,1.44]}));
  const runScr=[S.panel(560,330,2.2),S.panel(560,330,2.2),S.panel(560,330,2.2)];runScr.forEach((p,i)=>{p.position.set(-2.4+i*2.4,1.35,-2.45);ze.add(p);ze.add(S.rbox(2.3,1.42,.06,.05,pm("#ffffff"),{at:[-2.4+i*2.4,1.35,-2.49]}))});let runKey="";
  let edSim=null,edKey="",edClock=0;
  const lEd=label({cls:"hot",off:[0,-30]});
  // ---------------------------------------------------------------- the tree: branches as thick as their chances, leaves as columns, shoppers flowing down
  const zt=S.group();zt.position.set(ZT.x,TOP,ZT.z+.2);zt.rotation.y=-Math.PI/2;const R0=V3(-2.2,1.9,0),NS=V3(-.6,1.75,1.3),NT=V3(-.6,1.75,-1.3);const LF=[V3(.9,0,2.1),V3(.9,0,.7),V3(.9,0,-.7),V3(.9,0,-2.1)];
  zt.add(S.sphere(.14,pm(P3.ink,.3),{at:[R0.x,R0.y,R0.z]}));zt.add(S.sphere(.1,pm("#ffffff",.3),{at:[NS.x,NS.y,NS.z]}));zt.add(S.sphere(.1,pm("#ffffff",.3),{at:[NT.x,NT.y,NT.z]}));
  const branch=(a,b)=>{const m=S.mesh(new THREE.CylinderGeometry(1,1,1,16),pm(P3.ink,.35));zt.add(m);m.userData.a=a;m.userData.b=b;return m};
  const LTOP=i=>V3(LF[i].x,1.55,LF[i].z);
  const brs=[branch(R0,NS),branch(R0,NT),branch(NS,LTOP(0)),branch(NS,LTOP(1)),branch(NT,LTOP(2)),branch(NT,LTOP(3))];
  const setBranch=(m,r)=>{const a=m.userData.a,b=m.userData.b,d=b.clone().sub(a);m.position.copy(a).add(b).multiplyScalar(.5);m.scale.set(r,d.length(),r);m.quaternion.setFromUnitVectors(V3(0,1,0),d.normalize())};
  const leafM=[pm(P3.product.butter,.3),pm("#ffffff",.35),pm(P3.product.butter,.3),pm("#ffffff",.35)];
  const leaves=LF.map((p,i)=>{const m=S.rbox(.5,1,.5,.06,leafM[i]);m.position.set(p.x+.6,0,p.z);zt.add(m);return m});
  const flow=S.swarm(60,new THREE.SphereGeometry(.045,10,8),pm("#ffffff",.3),{colors:true});zt.add(flow);let flowR=rng(11);const fl=Array.from({length:60},()=>({u:Math.random()*3,a:0,b:0}));
  const table=S.panel(640,330,2.4);table.position.set(-2.0,1.55,-2.2);table.rotation.y=Math.PI/2-.5;zt.add(table);zt.add(S.rbox(2.52,1.34,.06,.05,pm("#ffffff"),{at:[-2.04,1.55,-2.24],rot:[0,Math.PI/2-.5,0]}));let tabKey="";
  const brL=[0,1,2,3,4,5].map(()=>label({off:[0,-18],lead:false})),lfL=[0,1,2,3].map(()=>label({off:[0,34],lead:false})),lPH=label({cls:"hot big",off:[0,40],lead:false});
  // ---------------------------------------------------------------- views
  S.view("arrivals",[ZA.x+.3,3.6,ZA.z+8.8],[ZA.x,1.25,ZA.z+.2],{min:2,max:30});
  S.view("service",[ZN.x+.3,4.0,ZN.z+8.4],[ZN.x,1.3,ZN.z-.2],{min:2,max:30});
  S.view("wait",[ZW.x+.2,5.4,ZW.z+8.6],[ZW.x,.9,ZW.z],{min:2,max:30});
  S.view("ed",[ZE.x+.4,4.4,ZE.z+7.4],[ZE.x,.8,ZE.z-.5],{min:2,max:30});
  S.view("tree",[ZT.x+.6,4.6,ZT.z+7.6],[ZT.x,1.1,ZT.z],{min:2,max:30});
  S.view("all",[0,19,26],[0,.5,-4.6],{min:6,max:70});
  const half={arrivals:4.5,service:4.5,wait:4.5,ed:4.5,tree:4.5,all:16},ctr={arrivals:[ZA.x,0,ZA.z],service:[ZN.x,0,ZN.z],wait:[ZW.x,0,ZW.z],ed:[ZE.x,0,ZE.z],tree:[ZT.x,0,ZT.z],all:[0,0,-4.6]};
  let first=true;
  const sk=i=>SKIN[Math.abs(i|0)%SKIN.length];
  const pdfN=x=>Math.exp(-.5*((x-s.mu)/s.sig)**2);
  return {
    step(st){const v=st.k==="test"?"all":st.k;overview=v==="all";S.goView(v,first);first=false;S.setShadowBox(half[v],ctr[v]);
      if(st.k==="service"){ballKey=""}},
    update(s3,st,dt,t){const k=st.k;
      // ---- arrivals
      const dots=s.dots||[];let newest=99;for(let i=0;i<40;i++){const d=dots[dots.length-1-i];if(d){const age=s.t-d.t;newest=Math.min(newest,age);const x=WX0+.2+age/2.5*WL;shop.put(i,x,.12,WZ+((d.t*7.3)%1-.5)*.35,BLUE,sk(d.t*7),S.REDUCED?0:Math.abs(Math.sin(age*14))*.02)}else shop.hide(i)}shop.done();
      gateM.emissiveIntensity=S.lerp(gateM.emissiveIntensity,newest<.12?3:.3,.3);
      const ck=s.arrCount+"|"+s.arrT.toFixed(1)+"|"+s.win;if(ck!==cntKeyA){cntKeyA=ck;cnt.redraw((g,w,h)=>{g.fillStyle="#fff";g.beginPath();g.roundRect(0,0,w,h,20);g.fill();g.fillStyle="#6E6A86";g.font="700 22px Instrument Sans, system-ui";g.textAlign="center";g.fillText("THIS WINDOW",w/2,36);
        g.fillStyle="#262E5C";g.font="700 84px Instrument Sans, system-ui";g.fillText(s.arrCount,w/2,122);g.fillStyle="#6E6A86";g.font="600 22px Instrument Sans, system-ui";g.fillText(`${fmt(s.arrT,1)} of ${s.win} min`,w/2,170)})}
      const lam=s.lam*s.win,K=Math.max(8,Math.ceil(lam+3*Math.sqrt(lam))),KK=Math.min(39,K);const cn=Array(K+1).fill(0);s.wins.forEach(w=>{if(w<=K)cn[w]++});const n=Math.max(1,s.wins.length);
      let pmax=.05;for(let q=0;q<=K;q++)pmax=Math.max(pmax,poisson(lam,q),cn[q]/n);const bw=HW/(KK+1);
      for(let q=0;q<40;q++){if(q<=KK){const x=HX0+(q+.5)*bw,bh=cn[q]/n/pmax*HH;bars.putS(q,x,HY0+bh/2,-1.3,bw*.72,Math.max(.001,bh),.3);pdots.put(q,x,HY0+poisson(lam,q)/pmax*HH,-1.1,Math.min(1,bw*3))}else{bars.put(q,0,-9,0,0);pdots.put(q,0,-9,0,0)}}bars.done();pdots.done();
      const hk=KK+"|"+pmax.toFixed(3)+"|"+s.wins.length;if(hk!==histKey){histKey=hk;histB.redraw((g,w,h)=>{g.fillStyle="#FFFDFB";g.fillRect(0,0,w,h);const X=x=>(x+3.4)/6.8*w,Y=y=>h-(y-.0)/3.1*h;
        g.font="700 24px Instrument Sans, system-ui";g.fillStyle="#262E5C";g.textAlign="left";g.fillText(`ARRIVALS PER ${s.win}-MINUTE WINDOW · ${s.wins.length} WINDOWS · BARS = OBSERVED, DOTS = POISSON λ = ${fmt(lam,2)}`,24,40);
        g.strokeStyle="#8F9BAA";g.lineWidth=3;g.beginPath();g.moveTo(X(HX0),Y(HY0));g.lineTo(X(HX0+HW),Y(HY0));g.stroke();g.font="600 22px Instrument Sans, system-ui";g.textAlign="center";g.fillStyle="#6E6A86";
        for(let q=0;q<=KK;q++)if(KK<20||q%2===0)g.fillText(q,X(HX0+(q+.5)*bw),Y(HY0)+30)})}
      const showA=k==="arrivals";lLam.at(tmp.set(ZA.x,TOP+3.4,ZA.z-1.6)).set(`λ = ${fmt(s.lam,1)} × ${s.win} = ${fmt(lam,2)}<small>P(no arrivals) = e^(−${fmt(lam,2)}) = ${fmt(poisson(lam,0),3)} · observed ${s.wins.length?fmt(s.wins.filter(w=>w===0).length/s.wins.length,3):"–"}</small>`).show(showA);
      lWin.at(tmp.set(ZA.x+WX0+.1,TOP+.7,ZA.z+WZ)).set(`${fmt(s.lam,1)} a minute<small>${fmt(s.t,1)} min so far</small>`).show(showA);
      // ---- service
      const sk2=s.lo+"|"+s.hi+"|"+s.mu+"|"+s.sig;
      if(sk2!==shadeKey){shadeKey=sk2;if(shadeMesh){zn.remove(shadeMesh);shadeMesh.geometry.dispose();shadeMesh=null}const lo=Math.max(s.lo,s.mu-4*s.sig),hi=Math.min(s.hi,s.mu+4*s.sig);
        if(hi>lo){const sh=new THREE.Shape();sh.moveTo(nx(lo),0);for(let i=0;i<=80;i++){const x=lo+i/80*(hi-lo);sh.lineTo(nx(x),pdfN(x)*NH+.01)}sh.lineTo(nx(hi),0);sh.lineTo(nx(lo),0);
          shadeMesh=S.mesh(new THREE.ExtrudeGeometry(sh,{depth:.42,bevelEnabled:false,curveSegments:4}),shadeM,{at:[0,.1,-.96]});zn.add(shadeMesh)}
        axis.redraw((g,w,h)=>{g.fillStyle="#fff";g.fillRect(0,0,w,h);g.textAlign="center";g.textBaseline="middle";for(let z=-3;z<=3;z++){const x=(z+4)/8*(NW/(NW+.4))*w+(.2/(NW+.4))*w;g.fillStyle="#262E5C";g.font="700 30px Instrument Sans, system-ui";g.fillText(fmt(s.mu+z*s.sig)+" s",x,30);g.fillStyle="#6E6A86";g.font="600 24px Instrument Sans, system-ui";g.fillText("z = "+z,x,66)}});
        const zl=(s.lo-s.mu)/s.sig,zh=(s.hi-s.mu)/s.sig,p=Phi(zh)-Phi(zl);readN.redraw((g,w,h)=>{g.fillStyle="#fff";g.fillRect(0,0,w,h);g.fillStyle="#6E6A86";g.font="700 24px Instrument Sans, system-ui";g.textAlign="left";
          g.fillText(`P(${s.lo<=s.mu-4*s.sig?"X":fmt(s.lo)+" < X"} ${s.hi>=s.mu+4*s.sig?"":"< "+fmt(s.hi)})`,24,44);g.fillStyle="#262E5C";g.font="500 26px Instrument Sans, system-ui";
          g.fillText(`z: ${s.lo<=s.mu-4*s.sig?"−∞":fmt(zl,2)} to ${s.hi>=s.mu+4*s.sig?"∞":fmt(zh,2)}`,24,98);g.fillText(`Φ(${fmt(zh,2)}) − Φ(${fmt(zl,2)})`,24,142);g.fillText(`= ${fmt(Phi(zh),3)} − ${fmt(Phi(zl),3)}`,24,184);g.font="700 54px Instrument Sans, system-ui";g.fillText(`P = ${fmt(p,3)}`,24,260)})}
      loH.position.x=nx(S.clamp(s.lo,s.mu-4*s.sig,s.mu+4*s.sig));hiH.position.x=nx(S.clamp(s.hi,s.mu-4*s.sig,s.mu+4*s.sig));
      // falling samples (a fresh batch of 100 each time; same seed, same batch)
      const bk=s.mu+"|"+s.sig+"|"+s.seed;if(bk!==ballKey){ballKey=bk;ballR=rng(s.seed);bin.fill(0);bl.length=0;nextBall=0;restT=0}
      if(k==="service"||k==="test"){spawnT+=dt;if(nextBall<NBALL&&spawnT>(S.REDUCED?0:.05)){spawnT=0;const x=s.mu+s.sig*randn(ballR);const b=Math.floor((x-(s.mu-4*s.sig))/(s.sig/2));const bi=S.clamp(b,0,NB-1);bl.push({x,bi,h:bin[bi]++,y:3.2,v:0,land:false});nextBall++}
        if(nextBall>=NBALL&&bl.every(b=>b.land)){restT+=dt;if(restT>4){ballR=rng(s.seed+Math.floor(t));bin.fill(0);bl.length=0;nextBall=0;restT=0}}}
      let inR=0;for(let i=0;i<NBALL;i++){const b=bl[i];if(!b){balls.put(i,0,-9,0,0);continue}const ty=.16+b.h*.1;if(!b.land){b.v-=9*dt;b.y+=b.v*dt;if(b.y<=ty||S.REDUCED){b.y=ty;b.land=true}}
        const inside=b.x>=s.lo&&b.x<=s.hi;if(inside&&b.land)inR++;balls.put(i,NX0+(b.bi+.5)*NW/NB,b.y,.3,1);balls.tint(i,inside?P3.product.butter:P3.product.blueberry)}balls.done();
      const showN=k==="service";const landed=bl.filter(b=>b.land).length;lBalls.at(tmp.set(ZN.x-2.4,TOP+1.6,ZN.z+.3)).set(`${inR} of ${landed} samples in the shaded range<small>model: P = ${fmt(Phi((s.hi-s.mu)/s.sig)-Phi((s.lo-s.mu)/s.sig),3)} · samples vary, the model doesn't</small>`).show(showN);
      lLo.at(tmp.set(ZN.x+loH.position.x,TOP+2.6,ZN.z+.65)).set(s.lo<=s.mu-4*s.sig?"from −∞":`from ${s.lo} s`).show(showN);lHi.at(tmp.set(ZN.x+hiH.position.x,TOP+2.6,ZN.z+.65)).set(s.hi>=s.mu+4*s.sig?"to ∞":`to ${s.hi} s`).show(showN);
      // ---- checkouts
      const Sm=s.sim,c=s.c;cks.forEach((o,i)=>{o.g.visible=i<c;o.g.position.set(ckX(i,c),0,-.55);o.goods.visible=false});
      for(let i=0;i<CK;i++){if(i<c)staff.put(i,ckX(i,c),0,-1.05,P3.product.lime,sk(i+2));else staff.hide(i)}staff.done();
      const live=new Set();let ci=0;
      if(Sm){Object.keys(slotOf).forEach(id=>{if(!Sm.busy.some(b=>b.id==id))delete slotOf[id]});
        const used=new Set(Object.values(slotOf));Sm.busy.forEach(b=>{if(slotOf[b.id]==null){let q=0;while(used.has(q))q++;slotOf[b.id]=q;used.add(q)}});
        Sm.busy.forEach(b=>{const q=slotOf[b.id];const tx=ckX(q,c),tz=-.1;const p=pos[b.id]||(pos[b.id]={x:tx,z:tz});p.x=S.lerp(p.x,tx,.15);p.z=S.lerp(p.z,tz,.15);live.add(b.id);if(ci<48){cust.put(ci++,p.x,0,p.z,STRAW,sk(b.id));}
          if(cks[q])cks[q].goods.visible=true;cLab[q]&&cLab[q].at(tmp.set(ZW.x+tx,TOP+.95,ZW.z+tz)).set(`${fmt((b.end-Sm.t)*60)} s`).show(k==="wait")});
        Sm.queue.slice(0,40).forEach((p0,i)=>{const [tx,tz]=qPos(i);const p=pos[p0.id]||(pos[p0.id]={x:QX0-1.2,z:.35});p.x=S.lerp(p.x,tx,.12);p.z=S.lerp(p.z,tz,.12);live.add(p0.id);if(ci<48)cust.put(ci++,p.x,0,p.z,BLUE,sk(p0.id),S.REDUCED?0:Math.abs(Math.sin(t*5+p0.id))*.01)})}
      for(;ci<48;ci++)cust.hide(ci);cust.done();Object.keys(pos).forEach(id=>{if(!live.has(+id))delete pos[id]});
      for(let q=0;q<CK;q++)if(!Sm||!Sm.busy.some(b=>slotOf[b.id]===q)||q>=c)cLab[q].show(false);
      const r=s.lastRun||(Sm?summarise(Sm,{rate:s.rate,c:s.c,minutes:s.t,seed:s.seed}):null);
      const sk3=(r?r.n+"|"+r.mean.toFixed(2):"x")+"|"+s.t.toFixed(1)+"|"+c+"|"+s.rate;if(sk3!==scrKey){scrKey=sk3;scr.redraw((g,w,h)=>{g.fillStyle="#262E5C";g.fillRect(0,0,w,h);g.fillStyle=P3.product.butter;g.font="700 30px Instrument Sans, system-ui";g.textAlign="left";
        g.fillText(`${c} CHECKOUT${c>1?"S":""} · ${fmt(s.rate,1)} ARRIVALS A MINUTE · ${fmt(Math.min(60,s.t),1)} OF 60 MIN`,24,44);
        g.fillStyle="rgba(255,255,255,.18)";g.fillRect(24,62,w-48,10);g.fillStyle=P3.product.butter;g.fillRect(24,62,(w-48)*Math.min(1,s.t/60),10);
        if(r&&r.n){g.fillStyle="#fff";g.font="600 28px Instrument Sans, system-ui";g.fillText(`${r.n} served · mean wait ${fmt(r.mean,1)} min · median ${fmt(r.median,1)}`,24,116);g.fillText(`longest ${fmt(r.max,1)} min · ${Math.round(r.over5*100)}% waited over 5 min · busy ${Math.round(Math.min(1,s.rate*s.mu/60/s.c)*100)}%`,24,156);
          const B=12,wmax=Math.max(10,Math.ceil(r.max)),bw2=wmax/B,cn2=Array(B).fill(0);r.waits.forEach(x=>{cn2[Math.min(B-1,Math.floor(x/bw2))]++});const m=Math.max(...cn2,1);
          for(let i=0;i<B;i++){const hh=cn2[i]/m*110;g.fillStyle=P3.product.blueberry;g.fillRect(24+i*44,300-hh,36,hh);}g.fillStyle="rgba(255,255,255,.7)";g.font="600 20px Instrument Sans, system-ui";g.fillText(`WAITS 0 → ${fmt(wmax)} MIN`,24+B*44+16,296)}
        else{g.fillStyle="#fff";g.font="600 28px Instrument Sans, system-ui";g.fillText(`Press play to open the doors for a simulated hour (${s.speed}× real time).`,24,130)}})}
      const showW=k==="wait";lPlay.at(tmp.set(ZW.x,TOP+.9,ZW.z+.6)).show(showW&&!Sm&&!s.lastRun);
      lWait.at(tmp.set(ZW.x+QX0,TOP+.7,ZW.z+.35)).set(Sm?`Waiting<b>${Sm.queue.length}</b>`:"Waiting<b>0</b>").show(showW);
      // ---- ED replay
      const ek=s.edRate+"|"+s.beds+"|"+s.seed+"|"+s.edHours;if(ek!==edKey){edKey=ek;edSim=newSim({seed:s.seed,rate:s.edRate/60,c:s.beds,service:svcED});edClock=0}
      if(k==="ed"||k==="test"){const step2=dt*(S.REDUCED?0:40);if(edSim.t+step2>=s.edHours*60){edSim=newSim({seed:s.seed,rate:s.edRate/60,c:s.beds,service:svcED})}else stepSim(edSim,edSim.t+step2)}
      beds.forEach((b,i)=>b.visible=i<s.beds);let breachNow=0;
      for(let i=0;i<NBED;i++){const p=i<s.beds?edSim.busy[i]:null;if(p){const late=edSim.t-p.arr>360;if(late)breachNow++;pats.putS(i,bedX(i),.43,bedZ(i)+.05,1,1,1,new THREE.Quaternion().setFromAxisAngle(V3(1,0,0),Math.PI/2));pats.tint(i,late?STRAW:BLUE);patH.put(i,bedX(i),.45,bedZ(i)-.27,1)}else{pats.put(i,0,-9,0,0);patH.put(i,0,-9,0,0)}}pats.done();patH.done();
      for(let i=0;i<30;i++){const p=edSim.queue[i];if(p){const late=edSim.t-p.arr>360;if(late)breachNow++;waitP.put(i,-3.2+(i%10)*.36,.15,.35+Math.floor(i/10)*.4,late?STRAW:BLUE,sk(p.id))}else waitP.hide(i)}waitP.done();
      const ek2=Math.floor(edSim.t/6)+"|"+edSim.queue.length;if(ek2!==edScrKey){edScrKey=ek2;edScr.redraw((g,w,h)=>{g.fillStyle="#262E5C";g.fillRect(0,0,w,h);g.fillStyle=P3.product.butter;g.font="700 26px Instrument Sans, system-ui";g.textAlign="left";g.fillText(`REPLAY · HOUR ${fmt(edSim.t/60,1)} OF ${s.edHours}`,20,40);
        g.fillStyle="#fff";g.font="600 24px Instrument Sans, system-ui";g.fillText(`${edSim.busy.length} of ${s.beds} beds busy · ${edSim.queue.length} waiting`,20,90);g.fillText(`${edSim.totals.filter(x=>x>360).length} of ${edSim.totals.length} left after 6 h so far`,20,130);g.fillStyle="rgba(255,255,255,.7)";g.font="600 20px Instrument Sans, system-ui";g.fillText(`${s.edRate} an hour · seed ${s.seed} · pink = past 6 hours`,20,172)})}
      const rk=JSON.stringify([s.runA&&[s.runA.c,s.runA.breaches,s.runA.nT,s.runA.seed,s.runA.minutes],s.runB&&[s.runB.c,s.runB.breaches,s.runB.nT,s.runB.seed,s.runB.minutes]]);
      if(rk!==runKey){runKey=rk;const draw=(p,r2,lab,col)=>p.redraw((g,w,h)=>{g.fillStyle="#fff";g.fillRect(0,0,w,h);g.strokeStyle=col;g.lineWidth=8;g.strokeRect(4,4,w-8,h-8);g.textAlign="left";
          if(!r2){g.fillStyle="#6E6A86";g.font="600 26px Instrument Sans, system-ui";g.fillText(`Run ${lab}: press Run the ED,`,24,140);g.fillText(`then Save as ${lab}`,24,176);return}
          g.fillStyle="#6E6A86";g.font="700 22px Instrument Sans, system-ui";g.fillText(`RUN ${lab} · ${r2.c} BEDS · ${fmt(r2.rate)}/h · ${fmt(r2.minutes/60)} h`,24,44);g.fillStyle="#262E5C";g.font="700 56px Instrument Sans, system-ui";g.fillText(`${fmt(r2.within6*100,1)}%`,24,116);
          g.font="500 24px Instrument Sans, system-ui";g.fillText("finished within 6 h",24,152);g.fillText(`${r2.breaches} of ${r2.nT} breached · risk ${fmt(r2.breach,3)}`,24,200);g.fillText(`median wait ${fmt(r2.median)} min · seed ${r2.seed}`,24,240);g.fillText(`${r2.left} still inside at the end`,24,280)});
        draw(runScr[0],s.runA,"A",STRAW);draw(runScr[2],s.runB,"B",BLUE);
        runScr[1].redraw((g,w,h)=>{g.fillStyle=P3.case.butter;g.fillRect(0,0,w,h);g.fillStyle="#6E6A86";g.font="700 22px Instrument Sans, system-ui";g.textAlign="left";g.fillText("RELATIVE RISK OF BREACHING, A ÷ B",24,44);g.fillStyle="#262E5C";
          if(s.runA&&s.runB){const rr=s.runB.breach>0?s.runA.breach/s.runB.breach:Infinity;g.font="700 72px Instrument Sans, system-ui";g.fillText(isFinite(rr)?fmt(rr,2):"∞",24,134);g.font="500 23px Instrument Sans, system-ui";
            g.fillText(`${fmt(s.runA.breach,3)} ÷ ${fmt(s.runB.breach,3)}`,24,180);g.fillText(isFinite(rr)?(rr>=2?"At least halves the risk (RR ≥ 2)":rr>1?"Less than halved":"B no better than A"):"B had no breaches: undefined",24,220);g.fillText(`samples: ${s.runA.nT} and ${s.runB.nT} patients`,24,260)}
          else{g.font="500 25px Instrument Sans, system-ui";g.fillText("14 an hour: 8 beds (A), then",24,120);g.fillText("12 beds (B). Does it at least",24,156);g.fillText("halve the risk?",24,192)}})}
      lEd.at(tmp.set(ZE.x,TOP+.6,ZE.z+1.6)).set(`Waiting room<small>${edSim.queue.length} waiting · ${breachNow} past 6 hours now</small>`).show(k==="ed");
      // ---- tree
      const p=s.pSelf,a=s.pHelpSelf,b=s.pHelpStaff,pr=[p,1-p,a,1-a,b,1-b],joint=[p*a,p*(1-a),(1-p)*b,(1-p)*(1-b)],pH=p*a+(1-p)*b;
      brs.forEach((m,i)=>setBranch(m,.015+.07*pr[i]));
      leaves.forEach((m,i)=>{const h=Math.max(.02,joint[i]*2.4);m.scale.y=h;m.position.y=h/2;lfL[i].at(zt.localToWorld(tmp.set(LF[i].x+.85,0,LF[i].z))).set(`${["self AND help","self, no help","staffed AND help","staffed, no help"][i]}<b>${fmt(joint[i],3)}</b>`).cls(i%2?"":"hot").show(k==="tree")});
      const mids=[[R0,NS],[R0,NT],[NS,LTOP(0)],[NS,LTOP(1)],[NT,LTOP(2)],[NT,LTOP(3)]];const names=["self","staffed","help","no help","help","no help"];
      mids.forEach(([u,w],i)=>brL[i].at(zt.localToWorld(tmp.copy(u).add(w).multiplyScalar(.5).add(V3(0,.12,0)))).set(`${names[i]} ${fmt(pr[i],2)}`).show(k==="tree"));
      // shoppers flow down the tree, choosing branches with the tree's own chances
      for(let i=0;i<60;i++){const f=fl[i];f.u+=dt*(S.REDUCED?0:.8);if(f.u>=3){f.u-=3;f.a=flowR()<p?0:1;f.b=flowR()<(f.a?b:a)?0:1}
        let P;if(f.u<1)P=R0.clone().lerp(f.a?NT:NS,f.u);else if(f.u<2){const nd=f.a?NT:NS,lf=LTOP(f.a*2+f.b);P=nd.clone().lerp(lf,f.u-1)}else{const lf=LTOP(f.a*2+f.b);P=lf.clone().add(V3(.6*(f.u-2)*2.5,-(f.u-2)*2.5*(1.55-Math.max(.02,joint[f.a*2+f.b]*2.4)),0))}
        if(f.u<2.4&&k==="tree"){flow.put(i,P.x,P.y+.08,P.z,1);flow.tint(i,f.u>1&&f.b===0?P3.product.butter:"#ffffff")}else flow.put(i,0,-9,0,0)}flow.done();
      const tk=[p,a,b].join();if(tk!==tabKey){tabKey=tk;table.redraw((g,w,h)=>{g.fillStyle="#fff";g.fillRect(0,0,w,h);const T=[["",`help`,`no help`,`total`],[`self`,fmt(1000*p*a),fmt(1000*p*(1-a)),fmt(1000*p)],[`staffed`,fmt(1000*(1-p)*b),fmt(1000*(1-p)*(1-b)),fmt(1000*(1-p))],[`total`,fmt(1000*pH),fmt(1000*(1-pH)),"1000"]];
        g.fillStyle="#6E6A86";g.font="700 20px Instrument Sans, system-ui";g.textAlign="left";g.fillText("OUT OF 1000 SHOPPERS",20,32);g.textAlign="center";g.textBaseline="middle";
        T.forEach((row,i)=>row.forEach((cc,j)=>{const x=20+j*150,y=50+i*66;g.fillStyle=i===0||j===0?P3.case.lavender:(i<3&&j===1?P3.case.butter:"#FBFAFE");g.fillRect(x,y,146,62);g.fillStyle="#262E5C";g.font=`${i===0||j===0?700:600} 28px Instrument Sans, system-ui`;g.fillText(cc,x+73,y+33)}));g.textBaseline="alphabetic"})}
      lPH.at(tmp.set(ZT.x+1.9,TOP,ZT.z+2.2)).set(`P(help) = ${fmt(p*a,3)} + ${fmt((1-p)*b,3)} = ${fmt(pH,3)}<small>P(self | help) = ${fmt(p*a,3)} ÷ ${fmt(pH,3)} = ${fmt(pH?p*a/pH:0,3)}</small>`).show(k==="tree");
      if(overview)LBL.forEach(l=>l.show(false));
    }};
}
let cntKeyA="",edScrKey="";
StudyKit.mount({kupu:KUPU,caseTint:"lavender",scene3d:queue3d,
  eyebrow:"Maths and statistics · Probability", title:"The queue machine", crumb:"NCEA Level 2 Mathematics and Statistics · AS91267 Apply probability methods in solving problems", homeHash:"l2",
  fig:"FIG. 26 · A CHECKOUT, AN ED AND A TREE", railTitle:"Arrive, wait, be served",
  badge:{label:"NCEA L2 Maths 91267",exam:"2026-11-19T09:30:00+13:00",examText:"Thu 19 Nov, 9:30am"},
  mainBox:"0 0 800 420", mainPhoneBig:true, mainLabel:"Shoppers arriving at checkouts, a normal curve of service times, two ED runs side by side, and a probability tree", closeBox:"0 0 420 260",
  state:s, steps,
  controls:[{type:"play"},{type:"button",id:"restart",label:"Restart",onClick:(x,api)=>{const st=api.step;st.onStep&&st.onStep();s.playing=true}},
    {type:"range",id:"lam",label:"Arrivals a minute",min:0.5,max:4,step:0.1,get:()=>s.lam,set:(x,v)=>{s.lam=Math.round(v*10)/10;startArr()},fmt:()=>fmt(s.lam,1)},
    {type:"range",id:"win",label:"Window",min:1,max:5,step:1,get:()=>s.win,set:(x,v)=>{s.win=v;startArr()},fmt:()=>`${s.win} min`},
    {type:"range",id:"lo",label:"Lower bound",min:40,max:200,step:1,get:()=>s.lo,set:(x,v)=>{s.lo=v;if(s.hi<s.lo)s.hi=s.lo},fmt:()=>s.lo<=s.mu-4*s.sig?"−∞":`${s.lo} s`},
    {type:"range",id:"hi",label:"Upper bound",min:40,max:200,step:1,get:()=>s.hi,set:(x,v)=>{s.hi=v;if(s.lo>s.hi)s.lo=s.hi},fmt:()=>s.hi>=s.mu+4*s.sig?"∞":`${s.hi} s`},
    {type:"range",id:"mu",label:"μ",min:60,max:180,step:1,get:()=>s.mu,set:(x,v)=>{s.mu=v},fmt:()=>`${s.mu} s`},
    {type:"range",id:"sig",label:"σ",min:5,max:40,step:1,get:()=>s.sig,set:(x,v)=>{s.sig=v},fmt:()=>`${s.sig} s`},
    {type:"range",id:"rate",label:"Arrivals a minute",min:0.5,max:5,step:0.5,get:()=>s.rate,set:(x,v)=>{s.rate=v;s.sim=null;s.t=0;s.lastRun=null},fmt:()=>fmt(s.rate,1)},
    {type:"range",id:"c",label:"Checkouts open",min:1,max:8,step:1,get:()=>s.c,set:(x,v)=>{s.c=v;s.sim=null;s.t=0;s.lastRun=null},fmt:()=>`${s.c}`},
    {type:"button",id:"runHour",label:"Run an hour",onClick:()=>{s.lastRun=runFast({seed:s.seed,rate:s.rate,c:s.c,service:svcCheckout,minutes:60});s.sim=null;s.t=60;StudyKit.sfx("ding")}},
    {type:"range",id:"edRate",label:"Arrivals an hour",min:6,max:24,step:1,get:()=>s.edRate,set:(x,v)=>{s.edRate=v},fmt:()=>`${s.edRate}`},
    {type:"range",id:"beds",label:"Beds",min:4,max:16,step:1,get:()=>s.beds,set:(x,v)=>{s.beds=v},fmt:()=>`${s.beds}`},
    {type:"range",id:"edHours",label:"Run for",min:1,max:72,step:1,get:()=>s.edHours,set:(x,v)=>{s.edHours=v},fmt:()=>`${s.edHours} h`},
    {type:"range",id:"seed",label:"Random seed",min:1,max:99,step:1,get:()=>s.seed,set:(x,v)=>{s.seed=v},fmt:()=>`${s.seed}`},
    {type:"button",id:"runED",label:"Run the ED",onClick:()=>{runED()}},
    {type:"button",id:"saveA",label:"Save as A",onClick:()=>{s.runA=s.lastED||runED()}},
    {type:"button",id:"saveB",label:"Save as B",onClick:()=>{s.runB=s.lastED||runED()}},
    {type:"range",id:"pSelf",label:"P(self-checkout)",min:0,max:1,step:0.05,get:()=>s.pSelf,set:(x,v)=>{s.pSelf=Math.round(v*100)/100},fmt:()=>fmt(s.pSelf,2)},
    {type:"range",id:"pHelpSelf",label:"P(help | self)",min:0,max:1,step:0.05,get:()=>s.pHelpSelf,set:(x,v)=>{s.pHelpSelf=Math.round(v*100)/100},fmt:()=>fmt(s.pHelpSelf,2)},
    {type:"range",id:"pHelpStaff",label:"P(help | staffed)",min:0,max:1,step:0.05,get:()=>s.pHelpStaff,set:(x,v)=>{s.pHelpStaff=Math.round(v*100)/100},fmt:()=>fmt(s.pHelpStaff,2)}],
  tick:(x,dt,st)=>{if(st.k==="arrivals"){if(!s.arrR)startArr();tickArr(dt)}else if(st.k==="wait")tickLive(dt)},
  drawMain:(x,st)=>drawMain(st),
  drawClose:(x,st)=>drawClose(st),
  chips:()=>{const lam=s.lam*s.win,zl=(s.lo-s.mu)/s.sig,zh=(s.hi-s.mu)/s.sig,r=s.lastRun||(s.sim?summarise(s.sim,{rate:s.rate,c:s.c,minutes:s.t,seed:s.seed}):null),pH=s.pSelf*s.pHelpSelf+(1-s.pSelf)*s.pHelpStaff;
    const rr=s.runA&&s.runB?(s.runB.breach>0?fmt(s.runA.breach/s.runB.breach,2):"∞"):"–";return{
    lam:["λ FOR THE WINDOW",fmt(lam,2)],p0:["P(NO ARRIVALS)",fmt(poisson(lam,0),3),true],obs:["OBSERVED P(0)",s.wins.length?fmt(s.wins.filter(w=>w===0).length/s.wins.length,3)+` (${s.wins.length} windows)`:"–"],
    z:["z",`${s.lo<=s.mu-4*s.sig?"−∞":fmt(zl,2)} to ${s.hi>=s.mu+4*s.sig?"∞":fmt(zh,2)}`],prob:["PROBABILITY",fmt(Phi(zh)-Phi(zl),3),true],sig:["σ",`${s.sig} s`],
    served:["SERVED",r?`${r.n}`:"–"],meanw:["MEAN WAIT",r?`${fmt(r.mean,1)} min`:"–",true],over5:["WAITED > 5 MIN",r?`${Math.round(r.over5*100)}%`:"–"],busy:["CHECKOUTS BUSY",`${Math.round(Math.min(1,s.rate*s.mu/60/s.c)*100)}%`],
    rrA:["RISK A",s.runA?fmt(s.runA.breach,3):"–"],rrB:["RISK B",s.runB?fmt(s.runB.breach,3):"–"],rr:["RELATIVE RISK",rr,true],
    phelp:["P(HELP)",fmt(pH,3),true],pself:["P(SELF | HELP)",fmt(pH?s.pSelf*s.pHelpSelf/pH:0,3)],rrhelp:["RR SELF vs STAFFED",s.pHelpStaff?fmt(s.pHelpSelf/s.pHelpStaff,2):"∞"]}},
  challenges:CH,
  papers:[{label:"NZQA: Mathematics and Statistics past exams",url:"https://www2.nzqa.govt.nz/ncea/subjects/past-exams-and-exemplars/mathematics-and-statistics/"},{label:"NZQA: AS91267 standard, papers and schedules",url:"https://www.nzqa.govt.nz/ncea/assessment/view-detailed.do?standardNumber=91267"},{label:"Lab: the ED twin",url:LAB+"ed/"},{label:"Lab: the supermarket twin",url:LAB+"store/"}],
  truth:"Arrivals are Poisson (random, steady average rate); checkout service times are normal with μ = 118 s, σ = 19 s (the practice pack's figures), clipped at 20 s; ED treatment times are a mix of simple cases (exponential, mean 30 min) and 12% complex cases (mean 120 min), about 41 minutes overall (an estimate chosen so that 8 beds at 14 an hour is overloaded and 12 copes). Queues are first come, first served; a patient still inside at the end of a run who has already passed 6 hours counts as a breach, and the rest of the unfinished are left out. A seed makes a run repeatable; change it for a new run. The lab's ED and supermarket twins are fuller models with real data behind them.",
  footer:"Covers AS91267 (L2 probability): normal distribution probabilities, experimental distributions (shape, centre, spread), probability trees, two-way tables and conditional probability, risk and relative risk. Poisson arrivals are shown as the model behind the simulation (formally AS91586 at Level 3)."
});
})();
