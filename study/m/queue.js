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
// figure materials: the shared bench recipe (StudyKit.figMat)
const FM=StudyKit.figMat,Q_COUNTER=FM("wood","#D9B48C"),Q_BELT=FM("rubber","#3C4557"),Q_RAIL=FM("metal","#B9C5D6"),Q_ARROW=FM("metal","#B9C5D6");
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
const INK="var(--ink)",ROSE="var(--rose)",HOT="var(--hot)",SEA="var(--sea)",SUN="var(--sun)",LINE="var(--line)",PAPER="var(--paper)",LAND="var(--land)";
const person=(x,y,c)=>{const m=FM("painted",c==="var(--hot)"?"#F2603F":"#2F8FD8");return `<g transform="translate(${x.toFixed(1)},${y.toFixed(1)})"><circle r="6" cy="-14" fill="${m.fill}" stroke="${m.stroke}" stroke-width="1"/><path d="M-7,10 C-7,-2 7,-2 7,10Z" fill="${m.fill}" stroke="${m.stroke}" stroke-width="1"/><circle r="2" cx="-2" cy="-16" fill="${m.hi}" opacity=".7"/></g>`};
function drawMain(st){const W=800,H=420;let o=`<rect width="${W}" height="${H}" fill="var(--case-soft,var(--chalk))"/>`;
  if(st.k==="arrivals")return o+drawArrivals();if(st.k==="service")return o+drawNormal();if(st.k==="ed")return o+drawED();if(st.k==="tree")return o+drawTree();return o+drawCheckout()}
function drawArrivals(){let o=`<text x="30" y="36" class="t-lab">SHOPPERS ARRIVING AT ${fmt(s.lam,1)} A MINUTE ON AVERAGE · ${fmt(s.t,1)} MIN</text>`;
  o+=`<rect x="40" y="160" width="720" height="8" rx="4" ${Q_RAIL.attrs}/><path d="M700,140 l40,24 -40,24" fill="none" stroke="${Q_ARROW.stroke}" stroke-width="2"/>`;
  (s.dots||[]).forEach(d=>{const age=s.t-d.t;o+=person(80+age/2.5*620,150,SEA)});
  o+=`<rect x="640" y="90" width="120" height="120" rx="12" fill="${PAPER}" stroke="${INK}"/><text x="700" y="118" text-anchor="middle" class="t-lab">THIS WINDOW</text><text x="700" y="160" text-anchor="middle" class="t-big" style="font-size:30px">${s.arrCount}</text><text x="700" y="190" text-anchor="middle" class="t-lab">${fmt(s.arrT,1)} OF ${s.win} MIN</text>`;
  o+=`<text x="40" y="240" class="t-lab">ARRIVALS PER ${s.win}-MINUTE WINDOW SO FAR (${s.wins.length} WINDOWS) · BARS = OBSERVED, DOTS = POISSON MODEL λ = ${fmt(s.lam*s.win,2)}</text>`;
  const lam=s.lam*s.win,K=Math.max(8,Math.ceil(lam+3*Math.sqrt(lam)));const cnt=Array(K+1).fill(0);s.wins.forEach(w=>{if(w<=K)cnt[w]++});const n=Math.max(1,s.wins.length);
  const bw=Math.min(50,680/(K+1)),x0=60,y0=400,hmax=120;let pmax=0.05;for(let k=0;k<=K;k++)pmax=Math.max(pmax,poisson(lam,k),cnt[k]/n);
  for(let k=0;k<=K;k++){const x=x0+k*bw;o+=`<rect x="${x+2}" y="${y0-cnt[k]/n/pmax*hmax}" width="${bw-4}" height="${cnt[k]/n/pmax*hmax}" fill="${SEA}" opacity=".7"/><circle cx="${x+bw/2}" cy="${y0-poisson(lam,k)/pmax*hmax}" r="4" fill="${HOT}" stroke="${INK}"/><text x="${x+bw/2}" y="${y0+14}" text-anchor="middle" class="t-lab">${k}</text>`}
  return o}
function drawNormal(){let o=`<text x="30" y="36" class="t-lab">CHECKOUT SERVICE TIME · NORMAL, μ = ${fmt(s.mu)} s, σ = ${fmt(s.sig)} s</text>`;
  const X=x=>60+(x-(s.mu-4*s.sig))/(8*s.sig)*680,Y=p=>360-p*280;const pdf=x=>Math.exp(-0.5*((x-s.mu)/s.sig)**2);
  let d="",a="";for(let i=0;i<=200;i++){const x=s.mu-4*s.sig+i/200*8*s.sig;d+=(i?"L":"M")+X(x).toFixed(1)+","+Y(pdf(x)).toFixed(1)}
  const lo=Math.max(s.lo,s.mu-4*s.sig),hi=Math.min(s.hi,s.mu+4*s.sig);if(hi>lo){for(let i=0;i<=100;i++){const x=lo+i/100*(hi-lo);a+=(i?"L":"M")+X(x).toFixed(1)+","+Y(pdf(x)).toFixed(1)}a+=` L${X(hi).toFixed(1)},360 L${X(lo).toFixed(1)},360Z`}
  o+=`<path d="${a}" fill="${SUN}" opacity=".7"/><path d="${d}" fill="none" stroke="${INK}" stroke-width="2.4"/><line x1="60" x2="740" y1="360" y2="360" stroke="${ROSE}"/>`;
  for(let z=-3;z<=3;z++){const x=s.mu+z*s.sig;o+=`<line x1="${X(x)}" x2="${X(x)}" y1="360" y2="368" stroke="${ROSE}"/><text x="${X(x)}" y="384" text-anchor="middle" class="t-lab">${fmt(x)}</text><text x="${X(x)}" y="400" text-anchor="middle" class="t-lab" style="fill:${ROSE}">z = ${z}</text>`}
  const zl=(s.lo-s.mu)/s.sig,zh=(s.hi-s.mu)/s.sig,p=Phi(zh)-Phi(zl);
  o+=`<g transform="translate(470,60)"><rect width="300" height="130" rx="14" fill="${PAPER}" stroke="${LINE}"/><text x="14" y="26" class="t-lab">P(${s.lo<=s.mu-4*s.sig?"X":fmt(s.lo)+" < X"} ${s.hi>=s.mu+4*s.sig?"":"< "+fmt(s.hi)}${s.lo<=s.mu-4*s.sig&&s.hi>=s.mu+4*s.sig?" anything":""})</text>`;
  o+=`<text x="14" y="54" class="t-ink">z = (x − μ) ÷ σ: ${s.lo<=s.mu-4*s.sig?"−∞":fmt(zl,2)} to ${s.hi>=s.mu+4*s.sig?"∞":fmt(zh,2)}</text><text x="14" y="78" class="t-ink">Φ(${fmt(zh,2)}) − Φ(${fmt(zl,2)}) = ${fmt(Phi(zh),3)} − ${fmt(Phi(zl),3)}</text><text x="14" y="114" class="t-big" style="font-size:22px">P = ${fmt(p,3)}</text></g>`;
  return o}
function drawCheckout(){const S=s.sim;let o=`<text x="30" y="36" class="t-lab">${s.c} CHECKOUT${s.c>1?"S":""} OPEN · ${fmt(s.rate,1)} ARRIVALS A MINUTE · ${S?fmt(s.t,1):0} OF 60 MIN</text>`;
  const cw=Math.min(110,600/s.c);
  for(let i=0;i<s.c;i++){const x=120+i*cw;o+=`<rect x="${x}" y="80" width="${cw-16}" height="56" rx="10" ${Q_COUNTER.attrs}/><path d="M${x+10},86 H${x+cw-30}" stroke="${Q_COUNTER.hi}" stroke-width="3" stroke-linecap="round"/><rect x="${x+8}" y="92" width="${cw-32}" height="14" rx="4" ${Q_BELT.attrs}/>`;
    const b=S&&S.busy[i];if(b)o+=person(x+(cw-16)/2,170,HOT)+`<text x="${x+(cw-16)/2}" y="196" text-anchor="middle" class="t-lab">${fmt((b.end-S.t)*60)} s</text>`}
  if(S){const q=S.queue;q.slice(0,40).forEach((p,i)=>{o+=person(120+(i%20)*32,250+Math.floor(i/20)*44,SEA)});if(q.length>40)o+=`<text x="120" y="340" class="t-ink">+ ${q.length-40} more</text>`;
    o+=`<text x="30" y="226" class="t-lab">WAITING: ${q.length}</text>`;
    const r=summarise(S,{rate:s.rate,c:s.c,minutes:s.t,seed:s.seed});
    o+=`<g transform="translate(30,360)"><rect width="740" height="44" rx="12" fill="${PAPER}" stroke="${LINE}"/><text x="14" y="28" class="t-ink">${r.n} served · mean wait ${fmt(r.mean,1)} min · median ${fmt(r.median,1)} · longest ${fmt(r.max,1)} · ${Math.round(r.over5*100)}% waited over 5 min · busy ${Math.round(Math.min(1,s.rate*s.mu/60/s.c)*100)}%</text></g>`}
  else o+=`<text x="120" y="280" class="t-ink">Press play to open the doors for a simulated hour (${s.speed}× real time).</text>`;
  return o}
function drawED(){let o=`<text x="30" y="36" class="t-lab">ED: ${fmt(s.edRate)} ARRIVALS AN HOUR, ${s.beds} BEDS, ${s.edHours} SIMULATED HOURS · TREATMENT 30 MIN TYPICAL, 12% COMPLEX CASES (ESTIMATE)</text>`;
  const show=(r,x,label,c)=>{if(!r){o+=`<g transform="translate(${x},70)"><rect width="340" height="200" rx="14" fill="${PAPER}" stroke="${LINE}" stroke-dasharray="6 4"/><text x="170" y="110" text-anchor="middle" class="t-ink">${label}: press Run, then Save as ${label}</text></g>`;return}
    o+=`<g transform="translate(${x},70)"><rect width="340" height="200" rx="14" fill="${PAPER}" stroke="${c}" stroke-width="2"/><text x="16" y="28" class="t-lab">RUN ${label} · ${r.c} BEDS · ${fmt(r.rate)}/h · ${fmt(r.minutes/60)} h</text>
      <text x="16" y="62" class="t-big" style="font-size:26px">${fmt(r.within6*100,1)}%</text><text x="150" y="62" class="t-ink">finished within 6 h</text>
      <text x="16" y="96" class="t-ink">${r.breaches} of ${r.nT} breached · risk ${fmt(r.breach,3)}</text><text x="16" y="120" class="t-ink">median wait for a bed ${fmt(r.median)} min</text><text x="16" y="144" class="t-ink">longest wait ${fmt(r.max)} min · ${r.left} still inside at the end</text>
      <text x="16" y="178" class="t-lab">SEED ${r.seed} · SAME SEED, SAME RESULT</text></g>`};
  show(s.runA,30,"A",HOT);show(s.runB,420,"B",SEA);
  if(s.runA&&s.runB){const rr=s.runB.breach>0?s.runA.breach/s.runB.breach:Infinity;o+=`<g transform="translate(30,290)"><rect width="740" height="110" rx="14" fill="${SUN}" opacity=".9"/><text x="16" y="30" class="t-lab">RELATIVE RISK OF BREACHING 6 HOURS, A ÷ B</text><text x="16" y="66" class="t-big" style="font-size:24px">${isFinite(rr)?fmt(rr,2):"∞ (B had no breaches)"}</text><text x="16" y="94" class="t-ink">${isFinite(rr)?(rr>=2?`Run A's risk is ${fmt(rr,1)} times B's: the claim "at least halves the risk" holds for these runs.`:rr>1?`Run A's risk is only ${fmt(rr,2)} times B's: less than halved.`:"B is no better than A here."):"B had zero breaches, so the ratio is undefined: say so, and run longer."} Sample sizes: ${s.runA.nT} and ${s.runB.nT}.</text></g>`}
  else o+=`<text x="30" y="330" class="t-ink">The pack's question: 14 an hour, 8 beds, then 12 beds. Does adding beds at least halve the risk of breaching 6 hours?</text>`;
  return o}
function drawTree(){const p=s.pSelf,a=s.pHelpSelf,b=s.pHelpStaff;const pH=p*a+(1-p)*b;let o=`<text x="30" y="36" class="t-lab">PROBABILITY TREE: WHICH CHECKOUT, THEN WHETHER THEY NEED HELP</text>`;
  const br=(x1,y1,x2,y2,lab,c)=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c||INK}" stroke-width="2"/><text x="${(x1+x2)/2-6}" y="${(y1+y2)/2-6}" class="t-ink" text-anchor="end">${lab}</text>`;
  o+=br(120,220,300,120,`self ${fmt(p,2)}`)+br(120,220,300,320,`staffed ${fmt(1-p,2)}`);
  o+=br(300,120,480,80,`help ${fmt(a,2)}`,HOT)+br(300,120,480,160,`no help ${fmt(1-a,2)}`)+br(300,320,480,280,`help ${fmt(b,2)}`,HOT)+br(300,320,480,360,`no help ${fmt(1-b,2)}`);
  const leaf=(y,txt,hot)=>`<rect x="490" y="${y-16}" width="280" height="32" rx="8" fill="${hot?SUN:PAPER}" stroke="${LINE}"/><text x="502" y="${y+5}" class="t-ink">${txt}</text>`;
  o+=leaf(80,`self AND help: ${fmt(p,2)} × ${fmt(a,2)} = ${fmt(p*a,3)}`,true)+leaf(160,`self, no help: ${fmt(p*(1-a),3)}`)+leaf(280,`staffed AND help: ${fmt(1-p,2)} × ${fmt(b,2)} = ${fmt((1-p)*b,3)}`,true)+leaf(360,`staffed, no help: ${fmt((1-p)*(1-b),3)}`);
  o+=`<circle cx="120" cy="220" r="8" fill="${INK}"/>`;
  o+=`<g transform="translate(30,380)"><text x="0" y="0" class="t-ink">P(help) = ${fmt(p*a,3)} + ${fmt((1-p)*b,3)} = ${fmt(pH,3)} · P(self | help) = ${fmt(p*a,3)} ÷ ${fmt(pH,3)} = ${fmt(pH?p*a/pH:0,3)}</text></g>`;
  return o}
function drawClose(st){const w=420;let o="";
  if(st.k==="arrivals"){const lam=s.lam*s.win;o+=`<text class="t-lab" x="14" y="22">POISSON: P(X = k) = e^(−λ) λ^k ÷ k!, λ = ${fmt(s.lam,1)} × ${s.win} = ${fmt(lam,2)}</text>`;
    [0,1,2,3,4,5].forEach((k,i)=>{o+=`<text class="t-lab" x="14" y="${54+i*26}">P(${k})</text><text class="t-ink" x="60" y="${54+i*26}">${fmt(poisson(lam,k),4)}</text>`});
    o+=`<text class="t-ink" x="200" y="54">P(0) = e^(−${fmt(lam,2)}) = ${fmt(poisson(lam,0),4)}</text><text class="t-ink" x="200" y="80">P(at least 1) = 1 − P(0) = ${fmt(1-poisson(lam,0),4)}</text><text class="t-ink" x="200" y="106">mean = variance = λ</text><text class="t-ink" x="200" y="132">observed mean: ${s.wins.length?fmt(s.wins.reduce((x,y)=>x+y,0)/s.wins.length,2):"–"}</text>`;
    o+=`<text class="t-lab" x="14" y="236">POISSON IS A LEVEL 3 TOPIC (AS91586); AT LEVEL 2 YOU COMPARE THE OBSERVED DISTRIBUTION</text>`;return o}
  if(st.k==="service"){o+=`<text class="t-lab" x="14" y="22">STANDARD NORMAL: AREA TO THE LEFT OF z</text>`;const X=z=>40+(z+3.5)/7*360,Y=p=>220-p*170;let d="";for(let i=0;i<=140;i++){const z=-3.5+i/20;d+=(i?"L":"M")+X(z).toFixed(1)+","+Y(Phi(z)).toFixed(1)}
    o+=`<line x1="40" x2="400" y1="220" y2="220" stroke="${ROSE}"/><path d="${d}" fill="none" stroke="${HOT}" stroke-width="2.4"/>`;const zl=(s.lo-s.mu)/s.sig,zh=(s.hi-s.mu)/s.sig;
    [[zl,SEA],[zh,SUN]].forEach(([z,c])=>{if(z>-3.5&&z<3.5)o+=`<line x1="${X(z)}" x2="${X(z)}" y1="${Y(Phi(z))}" y2="220" stroke="${c}" stroke-width="2" stroke-dasharray="4 3"/><circle cx="${X(z)}" cy="${Y(Phi(z))}" r="5" fill="${c}" stroke="${INK}"/>`});
    [-3,-2,-1,0,1,2,3].forEach(z=>o+=`<text class="t-lab" x="${X(z)}" y="238" text-anchor="middle">${z}</text>`);
    o+=`<text class="t-ink" x="48" y="48">Φ(${fmt(zl,2)}) = ${fmt(Phi(zl),4)} · Φ(${fmt(zh,2)}) = ${fmt(Phi(zh),4)}</text><text class="t-ink" x="48" y="70">P(X > 100) = 1 − Φ(−0.95) = ${fmt(1-Phi((100-s.mu)/s.sig),3)}</text>`;return o}
  if(st.k==="wait"||st.k==="test"){const r=s.lastRun||(s.sim?summarise(s.sim,{rate:s.rate,c:s.c,minutes:s.t,seed:s.seed}):null);o+=`<text class="t-lab" x="14" y="22">WAITING TIMES THIS HOUR: SHAPE, CENTRE, SPREAD</text>`;
    if(!r||!r.n){o+=`<text class="t-ink" x="14" y="60">Press play on the checkout, or Run an hour.</text>`;return o}
    const B=12,wmax=Math.max(10,Math.ceil(r.max)),bw=wmax/B,cnt=Array(B).fill(0);r.waits.forEach(x=>{cnt[Math.min(B-1,Math.floor(x/bw))]++});const m=Math.max(...cnt,1);
    for(let i=0;i<B;i++){const h=cnt[i]/m*150;o+=`<rect x="${40+i*28}" y="${210-h}" width="24" height="${h}" fill="${SEA}" opacity=".75"/><text class="t-lab" x="${52+i*28}" y="226" text-anchor="middle">${fmt(i*bw)}</text>`}
    o+=`<text class="t-lab" x="400" y="240" text-anchor="end">WAIT (MIN)</text><text class="t-ink" x="48" y="48">n = ${r.n} · mean ${fmt(r.mean,1)} · median ${fmt(r.median,1)} · IQR ${fmt(r.q1,1)}–${fmt(r.q3,1)} · max ${fmt(r.max,1)}</text><text class="t-ink" x="48" y="70">${r.mean>r.median*1.2?"Skewed right: a few long waits pull the mean up.":"Fairly symmetric."}</text>`;return o}
  if(st.k==="ed"){o+=`<text class="t-lab" x="14" y="22">RELATIVE RISK = P(breach | A) ÷ P(breach | B)</text><text class="t-ink" x="14" y="52">Above 1: A is riskier. Below 1: A is safer.</text><text class="t-ink" x="14" y="74">"At least halves the risk" means RR ≥ 2 (A = fewer beds).</text><text class="t-ink" x="14" y="110">Calculation AND interpretation earn the marks:</text><text class="t-ink" x="14" y="132">state the two risks, the ratio, what it means,</text><text class="t-ink" x="14" y="154">and the sample sizes behind them.</text>`;
    o+=`<text class="t-lab" x="14" y="196">THE FULL TWIN: ${LAB.replace("https://","")}ed</text><text class="t-lab" x="14" y="216">SUPERMARKET TWIN: ${LAB.replace("https://","")}store</text>`;return o}
  const p=s.pSelf,a=s.pHelpSelf,b=s.pHelpStaff;o+=`<text class="t-lab" x="14" y="22">THE SAME NUMBERS AS A TWO-WAY TABLE (OUT OF 1000 SHOPPERS)</text>`;
  const T=[["",`help`,`no help`,`total`],[`self`,fmt(1000*p*a),fmt(1000*p*(1-a)),fmt(1000*p)],[`staffed`,fmt(1000*(1-p)*b),fmt(1000*(1-p)*(1-b)),fmt(1000*(1-p))],[`total`,fmt(1000*(p*a+(1-p)*b)),fmt(1000*(1-p*a-(1-p)*b)),"1000"]];
  T.forEach((row,i)=>row.forEach((c,j)=>{o+=`<rect x="${14+j*96}" y="${40+i*34}" width="94" height="32" fill="${i===0||j===0?"var(--chalk)":PAPER}" stroke="${LINE}"/><text class="t-ink" x="${61+j*96}" y="${61+i*34}" text-anchor="middle">${esc(c)}</text>`}));
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
StudyKit.mount({kupu:KUPU,caseTint:"lavender",
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
