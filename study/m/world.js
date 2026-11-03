(()=>{
// The guess the world machine: guess first, then see the real data (after Gapminder's "what we mistakenly think").
// One data file, world-data.json, built by tools/world/build_world_data.py from Gapminder Fast Track and Our World in
// Data (both CC BY 4.0). Every number on screen is read or calculated from that file: no facts are typed in here.
// Five steps: the bubble chart 1800 to today, a guess-first quiz against a chimp, New Zealand against the world,
// reading the chart (log scale, bubble size, trend, outlier, variation, correlation and causation), and your own question.
const esc=t=>String(t??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]);
const FONT="'Instrument Sans',Helvetica,Arial,sans-serif",MONO="'IBM Plex Mono',Menlo,monospace";
const C={ink:"#240B21",muted:"#654A4E",rose:"#916A70",chalk:"#F5F1F2",paper:"#FFFDFB",line:"#E4D9DE",grid:"#EEE6E9",faint:"#B8A5AA",
  ok:"#2A7D63",okL:"#E2F2EA",no:"#B5466F",noL:"#F8E3E9"};
// six soft, colour-blind-aware region colours (none of them plum: plum is kept for Aotearoa New Zealand)
const REG={sub_saharan_africa:"#3E9E8E",south_asia:"#DDA23A",middle_east_north_africa:"#E07B4F",europe_central_asia:"#5B8FD0",america:"#D4677F",east_asia_pacific:"#9A7BC4"};
const REG_ORDER=["sub_saharan_africa","south_asia","middle_east_north_africa","europe_central_asia","america","east_asia_pacific"];
const T=(x,y,t,o={})=>`<text x="${x}" y="${y}" font-family="${o.mono?MONO:FONT}" font-size="${o.s||14}" font-weight="${o.w||400}" fill="${o.c||C.ink}" text-anchor="${o.a||"start"}"${o.op?` opacity="${o.op}"`:""}${o.halo?` stroke="${C.paper}" stroke-width="${o.halo}" stroke-linejoin="round" paint-order="stroke"`:""}${o.rot?` transform="rotate(${o.rot} ${x} ${y})"`:""}>${esc(t)}</text>`;
const lines=(text,per)=>{const out=[];let l="";for(const w of String(text).split(/\s+/)){if((l+" "+w).trim().length>per&&l){out.push(l.trim());l=w}else l+=" "+w}if(l.trim())out.push(l.trim());return out};
const TW=(x,y,text,per,o={})=>lines(text,per).map((ln,i)=>T(x,y+i*(o.lh||(o.s||14)*1.3),ln,o)).join("");
const RM=matchMedia("(prefers-reduced-motion: reduce)").matches;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// on a phone the 800-wide drawing shrinks to under half size, so its labels are drawn bigger there and the legend moves below the chart
const PHONE=matchMedia("(max-width: 820px)");const F=n=>PHONE.matches?Math.round(n*1.45):n;

// ---- core:start  (pure functions of the data file; study/tests/world.test.mjs runs this block on its own)
function worldCore(D){
  const Y=D.meta.years,Y0=Y[0],Y1=Y[Y.length-1],STEP=Y[1]-Y[0];
  const CS=D.countries,BY=Object.fromEntries(CS.map(c=>[c.id,c])),I=D.indicators;
  const LOG={gdp:true,pop:true,co2:true};
  const ser=(id,k)=>id==="world"?(D.world[k]||[]):((BY[id]&&BY[id].d[k])||[]);
  const at=(id,k,y)=>{const i=Y.indexOf(y);return i<0?null:(ser(id,k)[i]??null)};
  // the points for one series: the five-yearly grid, plus CO2's own latest year (its data stop before the last grid year)
  const PTS=new Map();
  function pts(id,k){const key=id+"|"+k;if(PTS.has(key))return PTS.get(key);const sr=ser(id,k);let P=Y.map((y,i)=>[y,sr[i]??null]);
    if(k==="co2"&&D.latest&&D.latest.co2){const L=D.latest.co2,lv=id==="world"?L.world:L.values[id];P=[...P.filter(p=>p[0]<L.year),[L.year,lv??null]]}
    PTS.set(key,P);return P}
  // a value for any year: straight-line between the estimates (along a log scale for income and population)
  function val(id,k,y){const P=pts(id,k),last=P[P.length-1];if(y<=P[0][0])return P[0][1];if(y>=last[0])return y===last[0]||k!=="co2"?last[1]:null;
    let i=0;while(i<P.length-2&&P[i+1][0]<=y)i++;const t=(y-P[i][0])/(P[i+1][0]-P[i][0]),a=P[i][1],b=P[i+1][1];
    if(a==null&&b==null)return null;if(a==null)return t>.5?b:null;if(b==null)return t<.5?a:null;
    if(LOG[k]&&a>0&&b>0)return a*Math.pow(b/a,t);return a+(b-a)*t}
  const lastYear=k=>{let m=Y0;CS.forEach(c=>{const P=pts(c.id,k);for(let i=P.length-1;i>=0;i--)if(P[i][1]!=null){m=Math.max(m,P[i][0]);break}});return m};
  // the newest real figure (CO2 has its own latest year, a year or two before the last population year)
  function latest(id,k){if(k==="co2"&&D.latest&&D.latest.co2){const L=D.latest.co2,v=id==="world"?L.world:L.values[id];if(v!=null)return {year:L.year,v}}
    const s=ser(id,k);for(let i=s.length-1;i>=0;i--)if(s[i]!=null)return {year:Y[i],v:s[i]};return null}
  const name=id=>id==="world"?"the world":BY[id]?BY[id].name:id;
  const nf=(x,d=0)=>Number(x).toLocaleString("en-NZ",{maximumFractionDigits:d,minimumFractionDigits:d});
  const people=k=>{const n=k*1000;return n>=1e9?`${nf(n/1e9,2)} billion`:n>=1e6?`${nf(n/1e6,n>=1e8?0:n>=1e7?1:2)} million`:nf(Math.round(n/1000)*1000)};
  function show(k,v){if(v==null||Number.isNaN(v))return "no data";
    if(k==="lex")return `${nf(v,1)} years`;
    if(k==="gdp")return `$${nf(v>=1000?Math.round(v/100)*100:Math.round(v))}`;
    if(k==="pop")return people(v);
    if(k==="cmu5")return `${nf(v/10,v<100?1:0)} in 100`;
    if(k==="tfr")return `${nf(v,1)} babies`;
    if(k==="co2")return `${nf(v,v<1?2:1)} t`;return nf(v,1)}
  // statistics on the countries: correlation (on a log scale where the axis is logged) and a least-squares trend line
  const tr=(k,v)=>LOG[k]?Math.log10(v):v;
  const pairs=(kx,ky,y)=>CS.map(c=>({id:c.id,x:val(c.id,kx,y),y:val(c.id,ky,y)})).filter(o=>o.x!=null&&o.y!=null&&(!LOG[kx]||o.x>0)&&(!LOG[ky]||o.y>0));
  function fit(kx,ky,y){const P=pairs(kx,ky,y),n=P.length;if(n<5||kx===ky)return null;
    const xs=P.map(o=>tr(kx,o.x)),ys=P.map(o=>tr(ky,o.y)),mx=xs.reduce((a,b)=>a+b)/n,my=ys.reduce((a,b)=>a+b)/n;
    let sxx=0,syy=0,sxy=0;for(let i=0;i<n;i++){sxx+=(xs[i]-mx)**2;syy+=(ys[i]-my)**2;sxy+=(xs[i]-mx)*(ys[i]-my)}
    if(!sxx||!syy)return null;const r=sxy/Math.sqrt(sxx*syy),b=sxy/sxx,a=my-b*mx;
    const res=P.map((o,i)=>({id:o.id,x:o.x,y:o.y,e:ys[i]-(a+b*xs[i])}));const sd=Math.sqrt(res.reduce((t,o)=>t+o.e*o.e,0)/n)||1;
    const lo=res.reduce((p,o)=>o.e<p.e?o:p),hi=res.reduce((p,o)=>o.e>p.e?o:p);
    return {n,r,a,b,sd,lo,hi,out:Math.abs(lo.e)>Math.abs(hi.e)?lo:hi,xmin:Math.min(...xs),xmax:Math.max(...xs)}}
  const strength=r=>{const a=Math.abs(r);return a>=.7?"strong":a>=.4?"moderate":a>=.2?"weak":"very weak"};
  const direction=r=>r>=0?"positive":"negative";
  function firstYear(id,k,thr){for(let y=Y0;y<=Y1;y++){const v=val(id,k,y);if(v!=null&&v>=thr)return y}return null}
  function regionPop(y){const t={};CS.forEach(c=>{const v=at(c.id,"pop",y);if(v!=null)t[c.region]=(t[c.region]||0)+v});return t}
  // ---- the guess-first quiz. Each answer and each wrong option is worked out from the data file.
  function quiz(){const Q=[];
    const opt=(vals,f)=>{const o=vals.map((v,i)=>({v,c:i===0})).sort((a,b)=>a.v-b.v);return {opts:o.map(x=>f(x.v)),optv:o.map(x=>x.v),ans:o.findIndex(x=>x.c)}};
    const r1=v=>Math.round(v*10)/10,src=k=>`${I[k].source}: ${I[k].name}${I[k].version?` (${I[k].version})`:""}`;
    {const v=at("world","lex",Y1),n=Math.round(v),o=opt([n,n-20,n-10],x=>`About ${x} years`);
      Q.push({id:"lex-now",k:"lex",q:`What is the life expectancy of the world's population today (${Y1})?`,...o,real:v,year:Y1,answer:`World life expectancy in ${Y1}: ${show("lex",v)}.`,
        why:`Most people guess lower. Since ${Y0} world life expectancy has gone from ${show("lex",at("world","lex",Y0))} to ${show("lex",v)}.`,source:src("lex"),viz:{type:"line",id:"world",k:"lex",year:Y1}})}
    {const v=at("world","tfr",Y1),o=opt([r1(v),r1(v*.6),r1(v*1.75)],x=>`About ${x.toFixed(1)} babies`);
      Q.push({id:"tfr-now",k:"tfr",q:`Across the whole world today (${Y1}), how many babies does a woman have, on average?`,...o,real:v,year:Y1,answer:`World average in ${Y1}: ${nf(v,2)} babies per woman.`,
        why:`In ${Y0} it was about ${nf(at("world","tfr",Y0),1)}. Families have become much smaller in most countries.`,source:src("tfr"),viz:{type:"line",id:"world",k:"tfr",year:Y1}})}
    {const then=at("world","cmu5",1900),v=at("world","cmu5",Y1),p=v/10,f=x=>`About ${x<10?nf(x,1):nf(x)} in 100`,o=opt([p,p*4,p*7],f);
      Q.push({id:"cmu5-now",k:"cmu5",q:`In 1900, about ${nf(then/10)} in every 100 children in the world died before their fifth birthday. About how many is it today (${Y1})?`,...o,optv:o.optv.map(x=>x*10),real:v,year:Y1,
        answer:`World child mortality in ${Y1}: ${show("cmu5",v)} children die before age 5 (${nf(v,0)} per 1,000 born).`,why:`Still too many, but about ${nf(then/v,0)} times fewer than in 1900.`,source:src("cmu5"),viz:{type:"line",id:"world",k:"cmu5",year:Y1}})}
    {const a=at("nzl","gdp",1950),b=at("chn","gdp",Y1),ans=Math.abs(a/b-1)<.1?2:a>b?0:1;
      Q.push({id:"nz1950-china",k:"gdp",q:`Which was richer per person: New Zealand in 1950, or China in ${Y1}?`,opts:["New Zealand in 1950",`China in ${Y1}`,"About the same (less than 10% apart)"],ans,real:b,year:Y1,
        answer:`Income per person: New Zealand in 1950 ${show("gdp",a)}; China in ${Y1} ${show("gdp",b)} (prices adjusted, so the dollars compare fairly).`,
        why:ans===1?`China today is ${nf(b/a,1)} times as rich per person as New Zealand was in 1950. Countries can change a lot in one lifetime.`:ans===0?`New Zealand in 1950 was ${nf(a/b,1)} times as rich per person as China is today.`:"They are within 10% of each other.",
        source:src("gdp"),viz:{type:"bars",k:"gdp",bars:[["New Zealand 1950",a,"nz"],[`China ${Y1}`,b,BY.chn.region],[`New Zealand ${Y1}`,at("nzl","gdp",Y1),"world"]]}})}
    {const v=at("world","pop",Y1),bn=v/1e6,o=opt([r1(bn),r1(bn*.75),r1(bn*1.25)],x=>`About ${x.toFixed(1)} billion`);
      Q.push({id:"pop-now",k:"pop",q:`How many people live in the world today (${Y1})?`,...o,optv:o.optv.map(x=>x*1e6),real:v,year:Y1,answer:`World population in ${Y1}: ${show("pop",v)}.`,
        why:`In ${Y0} it was ${show("pop",at("world","pop",Y0))}. Growth is now slowing as families get smaller.`,source:src("pop"),viz:{type:"line",id:"world",k:"pop",year:Y1}})}
    {const v=at("world","lex",Y0),n=Math.round(v),o=opt([n,n+15,n+30],x=>`About ${x} years`),cm=at("world","cmu5",Y0);
      Q.push({id:"lex-1800",k:"lex",q:`What was the life expectancy of the world's population in ${Y0}?`,...o,real:v,year:Y0,answer:`World life expectancy in ${Y0}: ${show("lex",v)}.`,
        why:`That does not mean most adults died at ${n}. About ${nf(cm/10)} in 100 children died before age 5, which pulls the average right down.`,source:src("lex"),viz:{type:"line",id:"world",k:"lex",year:Y0}})}
    {const n=latest("nzl","co2"),w=latest("world","co2"),ratio=n.v/w.v,ans=ratio<1?0:ratio<2?1:2;
      Q.push({id:"co2-nz",k:"co2",q:`How does New Zealand's CO₂ from fossil fuels and industry, per person, compare with the world average (${n.year})?`,opts:["Less than the world average","More, but less than twice as much","More than twice as much"],ans,real:n.v,year:n.year,
        answer:`CO₂ per person in ${n.year}: New Zealand ${show("co2",n.v)}, world ${show("co2",w.v)} (tonnes a year).`,why:`New Zealand's figure is ${nf(ratio,1)} times the world average. (This counts CO₂ only, not methane from farming.)`,
        source:src("co2"),viz:{type:"bars",k:"co2",bars:[["New Zealand",n.v,"nz"],["World average",w.v,"world"]]}})}
    {const t=regionPop(Y1),top=Object.entries(t).sort((a,b)=>b[1]-a[1]).slice(0,3),names=top.map(x=>D.meta.regions[x[0]]).sort(),best=D.meta.regions[top[0][0]];
      Q.push({id:"region-most",k:"pop",q:`Which of these world regions has the most people (${Y1})?`,opts:names,ans:names.indexOf(best),real:top[0][1],year:Y1,
        answer:`${best} has the most people: ${show("pop",top[0][1])} in ${Y1}.`,why:`Add up every country in each region and compare. ${top.map(x=>`${D.meta.regions[x[0]]}: ${show("pop",x[1])}`).join("; ")}.`,
        source:src("pop"),viz:{type:"bars",k:"pop",bars:Object.entries(t).sort((a,b)=>b[1]-a[1]).map(([r,v])=>[D.meta.regions[r],v,r])}})}
    return Q}
  return {Y,Y0,Y1,STEP,CS,BY,I,LOG,ser,pts,lastYear,at,val,latest,name,nf,show,tr,pairs,fit,strength,direction,firstYear,regionPop,quiz};
}
// ---- core:end

const app=document.getElementById("app");
fetch("world-data.json").then(r=>{if(!r.ok)throw new Error(r.status);return r.json()}).then(start).catch(e=>{console.error(e);
  app.innerHTML=`<div class="wrap"><div class="card" style="margin:40px auto;max-width:560px"><h3>The world data didn't load</h3><p>Check your connection and refresh the page. The machine needs its data file (world-data.json).</p></div></div>`});

function start(D){
const W=worldCore(D),{Y0,Y1,BY,I,val,at,latest,show,nf,fit}=W;
const NZ="nzl",IND=["lex","gdp","cmu5","tfr","pop","co2"];
const QZ=W.quiz(),N=QZ.length;
const s={year:Y0,playing:false,trail:true,pick:"",hover:null,qi:0,ans:[],ind:"lex",lens:"log",x:"gdp",y:"lex",view:"bubbles"};
const yr=()=>Math.round(s.year);
const CO2Y=W.lastYear("co2"),co2Year=()=>{if((s.x==="co2"||s.y==="co2")&&s.year>CO2Y)s.year=CO2Y};
const score=()=>s.ans.reduce((t,a,i)=>t+(a===QZ[i].ans?1:0),0),answered=()=>s.ans.filter(a=>a!=null).length;
const iname=k=>I[k].name;

// ---------- axes. Fixed ranges for each indicator, so bubbles move against a steady background as the years play.
const AX={lex:{lo:10,hi:90,t:"Life expectancy (years)"},gdp:{lo:300,hi:250000,t:"Income per person ($ a year, prices adjusted) · log scale"},
  pop:{lo:5,hi:2e6,t:"Population · log scale"},cmu5:{lo:0,hi:700,t:"Children dying before age 5 (per 1,000 born)"},tfr:{lo:0,hi:9,t:"Babies per woman"},co2:{lo:.01,hi:100,t:"CO₂ per person (tonnes a year) · log scale"}};
const UNIT={lex:"years",gdp:"$ per person a year, prices adjusted",pop:"people",cmu5:"deaths before age 5 per 1,000 born",tfr:"babies per woman",co2:"tonnes per person a year"};
const BOX={l:66,r:22,t:30,b:62,W:800,H:420};
const scale=(k,lo,hi,a,b)=>W.LOG[k]?(v=>a+(Math.log10(clamp(v,lo,hi))-Math.log10(lo))/(Math.log10(hi)-Math.log10(lo))*(b-a)):(v=>a+(clamp(v,lo,hi)-lo)/(hi-lo)*(b-a));
const logTicks=(lo,hi)=>{const t=[];for(let e=Math.floor(Math.log10(lo));e<=Math.ceil(Math.log10(hi));e++)for(const m of [1,2,5]){const v=m*10**e;if(v>=lo*.999&&v<=hi*1.001)t.push(v)}return t};
const niceTicks=(lo,hi,n=5)=>{const st0=(hi-lo)/n,mag=10**Math.floor(Math.log10(st0)),e=st0/mag,st=(e>=7.5?10:e>=3.5?5:e>=1.5?2:1)*mag,t=[];for(let v=Math.ceil(lo/st)*st;v<=hi+1e-9;v+=st)t.push(+v.toFixed(8));return t};
const tickLab=(k,v,short)=>k==="gdp"?(short?`$${v>=1000?nf(v/1000)+"k":nf(v)}`:`$${nf(v)}`):k==="pop"?(v>=1e6?`${nf(v/1e6)} bn`:v>=1e3?`${nf(v/1e3)} m`:`${nf(v)}k`):k==="co2"?nf(v,v<1?2:0):nf(v);
const rad=p=>p==null?0:Math.max(2.4,Math.sqrt(p/1.46e6)*40);
const isDecade=v=>Math.abs(Math.log10(v)-Math.round(Math.log10(v)))<1e-6;

// ---------- the bubble chart (also the scatter for "Your question"): x, y and bubble area = population
function scatter(kx,ky,y,o={}){const {l,r,t,W:w,H:h}=BOX,b=PHONE.matches?82:BOX.b,X=scale(kx,AX[kx].lo,AX[kx].hi,l,w-r),Yy=scale(ky,AX[ky].lo,AX[ky].hi,h-b,t);
  let g=`<rect width="800" height="420" rx="14" fill="${C.paper}"/>`;
  g+=T((l+w-r)/2,(t+h-b)/2+58,String(Math.round(y)),{s:178,w:600,a:"middle",c:C.rose,op:.12});
  const xt=W.LOG[kx]?logTicks(AX[kx].lo,AX[kx].hi):niceTicks(AX[kx].lo,AX[kx].hi,8),yt=W.LOG[ky]?logTicks(AX[ky].lo,AX[ky].hi):niceTicks(AX[ky].lo,AX[ky].hi,8);
  xt.forEach(v=>{const x=X(v),major=W.LOG[kx]&&isDecade(v);g+=`<line x1="${x}" y1="${t}" x2="${x}" y2="${h-b}" stroke="${major?C.line:C.grid}" stroke-width="${major&&o.lens==="log"?2.4:1}"/>`+(PHONE.matches&&!major&&W.LOG[kx]?"":T(x,h-b+F(18),tickLab(kx,v,kx==="gdp"&&xt.length>8&&!major),{s:F(12),a:"middle",c:major?C.muted:C.faint,w:major?600:400}))});
  yt.forEach(v=>{const yy=Yy(v);g+=`<line x1="${l}" y1="${yy}" x2="${w-r}" y2="${yy}" stroke="${C.grid}"/>`+T(l-8,yy+4,tickLab(ky,v),{s:F(12),a:"end",c:C.muted})});
  g+=T((l+w-r)/2,h-b+F(44),AX[kx].t,{s:F(13.5),w:600,a:"middle",c:C.muted})+T(F(18)-(PHONE.matches?6:0),(t+h-b)/2,AX[ky].t,{s:F(13.5),w:600,a:"middle",c:C.muted,rot:-90});
  g+=T(w-r,18,"Free data from Gapminder · Our World in Data (CC BY 4.0)",{s:11,a:"end",c:C.rose,mono:true});
  // bubbles, biggest first so small countries stay on top
  const pts=W.CS.map(c=>{const vx=val(c.id,kx,y),vy=val(c.id,ky,y),p=val(c.id,"pop",y);return vx==null||vy==null||(W.LOG[kx]&&vx<=0)||(W.LOG[ky]&&vy<=0)?null:{c,x:X(vx),y:Yy(vy),r:kx==="pop"||ky==="pop"?5:rad(p),vx,vy,p}}).filter(Boolean).sort((a,b)=>b.r-a.r);
  const P=Object.fromEntries(pts.map(q=>[q.c.id,q]));
  // the legend sits top-left, where (in every year) no country is
  if(o.legend!==false&&!PHONE.matches)REG_ORDER.forEach((k,i)=>{g+=`<circle cx="${l+16}" cy="${t+16+i*18}" r="6" fill="${REG[k]}"/>`+T(l+28,t+20.5+i*18,D.meta.regions[k],{s:12.5,c:C.muted})});
  if(o.legend!==false&&!PHONE.matches)g+=`<circle cx="${l+16}" cy="${t+16+6*18}" r="6" fill="${C.ink}"/>`+T(l+28,t+20.5+6*18,"Aotearoa New Zealand",{s:12.5,w:600});
  // trails: where New Zealand (and the country you picked) has been
  const trail=id=>{const q=[];for(let yy=Y0;yy<=y;yy+=W.STEP){const vx=val(id,kx,yy),vy=val(id,ky,yy);if(vx!=null&&vy!=null)q.push([X(vx),Yy(vy)])}if(P[id])q.push([P[id].x,P[id].y]);
    return q.length>1?`<polyline points="${q.map(p=>p.map(n=>n.toFixed(1)).join(",")).join(" ")}" fill="none" stroke="${id===NZ?C.ink:REG[BY[id].region]}" stroke-width="1.6" opacity=".45" stroke-linejoin="round"/>`+q.slice(0,-1).map(p=>`<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="1.6" fill="${id===NZ?C.ink:REG[BY[id].region]}" opacity=".5"/>`).join(""):""};
  if(o.trail){g+=trail(NZ);if(s.pick&&s.pick!==NZ)g+=trail(s.pick)}
  pts.forEach(q=>{const nz=q.c.id===NZ;g+=`<circle data-c="${q.c.id}" cx="${q.x.toFixed(1)}" cy="${q.y.toFixed(1)}" r="${q.r.toFixed(1)}" fill="${nz?C.ink:REG[q.c.region]}" fill-opacity="${nz?1:.8}" stroke="${nz?"#fff":"#fff"}" stroke-width="${nz?2:1}" style="cursor:pointer"><title>${esc(q.c.name)}</title></circle>`});
  g+=`<g pointer-events="none">`;
  const ring=(id,col)=>P[id]?`<circle cx="${P[id].x}" cy="${P[id].y}" r="${P[id].r+3.5}" fill="none" stroke="${col}" stroke-width="2"/>`:"";
  const label=(id,txt,o2={})=>{const q=P[id];if(!q)return "";const right=q.x<600,dx=right?q.r+7:-q.r-7;return T(q.x+dx,q.y+(o2.dy||4),txt,{s:o2.s||13.5,w:o2.w||600,a:right?"start":"end",c:o2.c||C.ink,halo:4})};
  if(s.pick&&s.pick!==NZ&&P[s.pick])g+=ring(s.pick,C.ink)+label(s.pick,BY[s.pick].name,{dy:-6,s:F(13.5)});
  g+=(o.extra?o.extra({X,Y:Yy,P,pts}):"");
  g+=ring(NZ,C.ink)+label(NZ,"New Zealand",{s:F(14.5),w:700});
  if(s.hover&&P[s.hover]){const q=P[s.hover],c=q.c,bx=clamp(q.x+14,l+4,w-r-224),by=clamp(q.y-78,t+4,h-b-80);
    g+=ring(s.hover,C.muted)+`<rect x="${bx}" y="${by}" width="220" height="74" rx="10" fill="#fff" stroke="${C.line}"/>`+T(bx+12,by+22,c.name,{s:14,w:700})+
      T(bx+12,by+42,`${iname(ky)}: ${show(ky,q.vy)}`,{s:12,c:C.muted})+T(bx+12,by+60,`${iname(kx)}: ${show(kx,q.vx)}`,{s:12,c:C.muted})}
  return g+`</g>`}

// ---------- lenses for "Reading the chart": each overlay is calculated from this year's data
function lensExtra(y){return ({X,Y,P,pts})=>{const {l,r,t,b,W:w,H:h}=BOX;let g="";const note=(head,body,tl)=>{const x=tl?l+10:482,y=tl?t+8:h-b-112;return `<rect x="${x}" y="${y}" width="290" height="100" rx="12" fill="#fff" stroke="${C.line}"/>`+T(x+16,y+24,head,{s:14,w:700})+TW(x+16,y+46,body,44,{s:12.5,c:C.muted,lh:16})};
  const f=fit("gdp","lex",y);
  if(s.lens==="log"){const yy=h-b-22;[[1000,10000],[10000,100000]].forEach(([a,c])=>{const x1=X(a),x2=X(c);g+=`<path d="M${x1},${yy} Q${(x1+x2)/2},${yy-34} ${x2},${yy}" fill="none" stroke="${C.ink}" stroke-width="1.8" marker-end="url(#ah)"/>`+T((x1+x2)/2,yy-26,"× 10",{s:15,w:700,a:"middle",halo:4})});
    g=`<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="${C.ink}"/></marker></defs>`+g;
    g+=note("Log scale: equal steps multiply","$1,000 to $10,000 is the same distance as $10,000 to $100,000. Each step is × 10, so poor and rich countries both fit.",true)}
  if(s.lens==="size"){const big=pts.slice(0,2),nz=P[NZ];big.forEach(q=>{g+=T(q.x,q.y+5,`${q.c.name}: ${show("pop",q.p)}`,{s:13,w:700,a:"middle",halo:4})});
    if(nz&&big[0])g+=note("Bubble area shows population",`${big[0].c.name} has ${nf(big[0].p/nz.p)} times as many people as New Zealand (${show("pop",nz.p)}), so its bubble has ${nf(big[0].p/nz.p)} times the area.`)}
  if(s.lens==="trend"&&f){const x1=Math.max(f.xmin,Math.log10(AX.gdp.lo)),x2=Math.min(f.xmax,Math.log10(AX.gdp.hi));
    g+=`<line x1="${X(10**x1)}" y1="${Y(f.a+f.b*x1)}" x2="${X(10**x2)}" y2="${Y(f.a+f.b*x2)}" stroke="${C.ink}" stroke-width="3" stroke-dasharray="10 6" opacity=".8"/>`;
    g+=note(`Trend: ${f.r>0?"up":"down"} to the right`,`Richer countries ${f.r>0?"tend to have longer":"tend to have shorter"} lives. Correlation r = ${nf(f.r,2)}: a ${W.strength(f.r)} ${W.direction(f.r)} relationship across ${f.n} countries.`)}
  if(s.lens==="outlier"&&f){const x1=Math.max(f.xmin,Math.log10(AX.gdp.lo)),x2=Math.min(f.xmax,Math.log10(AX.gdp.hi));
    g+=`<line x1="${X(10**x1)}" y1="${Y(f.a+f.b*x1)}" x2="${X(10**x2)}" y2="${Y(f.a+f.b*x2)}" stroke="${C.faint}" stroke-width="2" stroke-dasharray="6 6"/>`;
    [f.lo,f.hi].forEach(o=>{const q=P[o.id];if(!q)return;g+=`<circle cx="${q.x}" cy="${q.y}" r="${q.r+6}" fill="none" stroke="${C.no}" stroke-width="2.5"/>`+T(q.x+(q.x<560?q.r+10:-q.r-10),q.y-q.r-4,`${q.c.name} (${nf(o.e,1)} years)`,{s:13,w:700,a:q.x<560?"start":"end",halo:4,c:C.no})});
    g+=note("Outliers: far from the trend",`${BY[f.lo.id].name} lives ${nf(-f.lo.e,1)} years less than the trend predicts for its income; ${BY[f.hi.id].name} lives ${nf(f.hi.e,1)} years more.`)}
  if(s.lens==="variation"){const band=pts.filter(q=>q.vx>=10000&&q.vx<20000);if(band.length>1){const lo=band.reduce((a,c)=>c.vy<a.vy?c:a),hi=band.reduce((a,c)=>c.vy>a.vy?c:a),x1=X(10000),x2=X(20000);
      g=`<rect x="${x1}" y="${t}" width="${x2-x1}" height="${h-b-t}" fill="${C.rose}" opacity=".10"/>`+g+`<line x1="${x2+10}" y1="${hi.y}" x2="${x2+10}" y2="${lo.y}" stroke="${C.ink}" stroke-width="2"/><line x1="${x2+4}" y1="${hi.y}" x2="${x2+16}" y2="${hi.y}" stroke="${C.ink}" stroke-width="2"/><line x1="${x2+4}" y1="${lo.y}" x2="${x2+16}" y2="${lo.y}" stroke="${C.ink}" stroke-width="2"/>`;
      g+=note("Variation: same income, different lives",`${band.length} countries earn $10,000 to $20,000 per person. Their life expectancy runs from ${show("lex",lo.vy)} (${lo.c.name}) to ${show("lex",hi.vy)} (${hi.c.name}).`)}}
  if(s.lens==="cause")g+=note("Correlation is not causation","Income and long lives go together. But does money cause health, does health cause wealth, or do clean water, schools and peace cause both?");
  return g}}

// ---------- the line chart for "New Zealand vs the world"
function lineChart(k,ids,y){const l=74,r=170,t=44,b=56,w=800,h=420,X=v=>l+(v-Y0)/(Y1-Y0)*(w-l-r);
  const all=ids.flatMap(id=>W.pts(id,k).map(p=>p[1])).filter(v=>v!=null&&(!W.LOG[k]||v>0));if(!all.length)return "";
  let lo=Math.min(...all),hi=Math.max(...all);if(W.LOG[k]){lo=Math.max(k==="co2"?.01:0,10**Math.floor(Math.log10(lo)));hi=10**Math.ceil(Math.log10(hi))}else{lo=0;const top=niceTicks(0,hi*1.05,5).slice(-1)[0];hi=top>=hi?top:hi*1.05}
  const Yy=scale(k,lo,hi,h-b,t);let g=`<rect width="800" height="420" rx="14" fill="${C.paper}"/>`+T(l,26,`${iname(k)} (${UNIT[k]})`,{s:F(14),w:700})+T(w-20,h-10,`${I[k].source} (CC BY 4.0)`,{s:11,a:"end",c:C.rose,mono:true});
  (W.LOG[k]?logTicks(lo,hi):niceTicks(lo,hi,5)).forEach(v=>{const yy=Yy(v);g+=`<line x1="${l}" y1="${yy}" x2="${w-r}" y2="${yy}" stroke="${C.grid}"/>`+T(l-8,yy+4,tickLab(k,v,true),{s:F(12),a:"end",c:C.muted})});
  for(let x=1800;x<=Y1;x+=PHONE.matches?50:25)if(x>=Y0)g+=`<line x1="${X(x)}" y1="${h-b}" x2="${X(x)}" y2="${h-b+5}" stroke="${C.faint}"/>`+T(X(x),h-b+F(20),String(x),{s:F(12),a:"middle",c:C.muted});
  // honest shading: before 1950 the figures are reconstructions
  g+=`<rect x="${l}" y="${t}" width="${X(1950)-l}" height="${h-b-t}" fill="${C.chalk}" opacity=".7"/>`+T(l+8,h-b-10,"Before 1950: reconstructed, less certain",{s:11.5,c:C.rose,mono:true});
  const col=id=>id===NZ?C.ink:id==="world"?C.rose:REG[BY[id].region];
  const ends=[];ids.forEach(id=>{const P=W.pts(id,k).filter(p=>p[1]!=null&&(!W.LOG[k]||p[1]>0));if(!P.length)return;
    g+=`<path d="M${P.map(p=>`${X(p[0]).toFixed(1)},${Yy(p[1]).toFixed(1)}`).join(" L")}" fill="none" stroke="${col(id)}" stroke-width="${id===NZ?3.4:2.4}" ${id==="world"?`stroke-dasharray="7 5"`:""} stroke-linejoin="round" stroke-linecap="round"/>`;
    const L=P[P.length-1];ends.push({id,y:Yy(L[1]),v:L[1],yr:L[0]})});
  ends.sort((a,b)=>a.y-b.y);for(let i=1;i<ends.length;i++)if(ends[i].y-ends[i-1].y<F(34))ends[i].y=ends[i-1].y+F(34);
  ends.forEach(e=>{g+=T(w-r+10,e.y-2,e.id==="world"?"World":BY[e.id].name,{s:F(13),w:700,c:col(e.id)})+T(w-r+10,e.y+F(14),`${show(k,e.v)} (${e.yr})`,{s:F(12),c:C.muted})});
  const x=X(y);g+=`<line x1="${x}" y1="${t}" x2="${x}" y2="${h-b}" stroke="${C.ink}" stroke-width="1.2" stroke-dasharray="3 4"/>`+T(x,t-4,String(Math.round(y)),{s:12,w:700,a:"middle",mono:true});
  ids.forEach(id=>{const v=val(id,k,y);if(v!=null&&(!W.LOG[k]||v>0))g+=`<circle cx="${x}" cy="${Yy(v)}" r="5" fill="${col(id)}" stroke="#fff" stroke-width="1.5"/>`});
  return g}

// ---------- the guess-first quiz, drawn on the main card. Click an answer card (or use the buttons below).
function quizCard(){const q=QZ[s.qi],a=s.ans[s.qi],done=a!=null;let g=`<rect width="800" height="420" rx="14" fill="${C.paper}"/>`;
  g+=T(24,30,`QUESTION ${s.qi+1} OF ${N} · GUESS FIRST`,{s:12,c:C.rose,mono:true,w:500})+T(776,30,`You ${score()} · Chimp ${nf(answered()/3,1)}`,{s:12,a:"end",c:C.rose,mono:true,w:500});
  g+=TW(24,62,q.q,66,{s:20,w:600,lh:25});
  q.opts.forEach((t,i)=>{const x=24+i*256,y=118,right=i===q.ans,mine=i===a;const fill=!done?"#fff":right?C.okL:mine?C.noL:"#fff",st=!done?C.line:right?C.ok:mine?C.no:C.line;
    g+=`<g data-guess="${i}" style="cursor:${done?"default":"pointer"}"><rect x="${x}" y="${y}" width="240" height="82" rx="14" fill="${fill}" stroke="${st}" stroke-width="${done&&(right||mine)?2.5:1.5}"/>`+
      `<circle cx="${x+26}" cy="${y+41}" r="15" fill="${done&&right?C.ok:done&&mine?C.no:C.ink}"/>`+T(x+26,y+46.5,"ABC"[i],{s:15,w:700,a:"middle",c:"#fff"})+TW(x+52,y+(lines(t,21).length>1?36:47),t,21,{s:15.5,w:600,lh:19})+
      (done&&(right||mine)?T(x+232,y+16,right?(mine?"✓ your guess":"✓ real answer"):"✗ your guess",{s:11,a:"end",c:right?C.ok:C.no,mono:true,w:600}):"")+`</g>`});
  if(!done)return g+`<rect x="24" y="222" width="752" height="176" rx="14" fill="none" stroke="${C.faint}" stroke-dasharray="6 6"/>`+T(400,300,"Commit your guess first.",{s:20,w:600,a:"middle",c:C.muted})+T(400,328,"Then the real number appears here, with its year and where it comes from.",{s:14,a:"middle",c:C.muted});
  g+=viz(q.viz,24,222,440,176,q);
  g+=`<rect x="480" y="222" width="296" height="176" rx="14" fill="#fff" stroke="${C.line}"/>`+T(496,246,a===q.ans?"RIGHT":"NOT QUITE",{s:12,mono:true,w:600,c:a===q.ans?C.ok:C.no})+TW(496,268,q.answer,40,{s:13.5,w:600,lh:17})+TW(496,268+lines(q.answer,40).length*17+6,q.why,44,{s:12.5,c:C.muted,lh:15.5})+T(496,390,q.source,{s:10,c:C.rose,mono:true});
  return g}
function viz(v,x0,y0,w,h,q){let g=`<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="14" fill="#fff" stroke="${C.line}"/>`;
  if(v.type==="line"){const k=v.k,sr=W.ser(v.id,k),vals=[...sr,...(q.optv||[])].filter(x=>x!=null),lo=k==="pop"?0:Math.min(0,...vals),hi=Math.max(...vals)*1.08,l=x0+48,r=x0+w-16,t=y0+18,b=y0+h-28;
    const X=yy=>l+(yy-Y0)/(Y1-Y0)*(r-l),Yy=val2=>b-(val2-lo)/(hi-lo)*(b-t);
    niceTicks(lo,hi,4).forEach(tv=>{g+=`<line x1="${l}" y1="${Yy(tv)}" x2="${r}" y2="${Yy(tv)}" stroke="${C.grid}"/>`+T(l-6,Yy(tv)+4,k==="pop"?`${nf(tv/1e6)} bn`:k==="cmu5"?nf(tv/10):nf(tv),{s:10.5,a:"end",c:C.muted})});
    [Y0,1900,1950,2000].forEach(yy=>{if(yy>=Y0)g+=T(X(yy),b+16,String(yy),{s:10.5,a:"middle",c:C.muted})});
    (q.optv||[]).forEach((ov,i)=>{const yy=Yy(ov),mine=s.ans[s.qi]===i;g+=`<line x1="${l}" y1="${yy}" x2="${r}" y2="${yy}" stroke="${i===q.ans?C.ok:mine?C.no:C.faint}" stroke-dasharray="4 5" stroke-width="${mine||i===q.ans?1.6:1}"/>`+T(l+4,yy-4,"ABC"[i],{s:11,w:700,a:"start",c:i===q.ans?C.ok:mine?C.no:C.faint,halo:3})});
    const d="M"+W.pts(v.id,k).filter(p=>p[1]!=null).map(p=>`${X(p[0]).toFixed(1)},${Yy(p[1]).toFixed(1)}`).join(" L");
    g+=`<path d="${d}" fill="none" stroke="${C.ink}" stroke-width="2.6" stroke-linejoin="round"/>`;const py=at(v.id,k,v.year);
    g+=`<circle cx="${X(v.year)}" cy="${Yy(py)}" r="6" fill="${C.ink}" stroke="#fff" stroke-width="2"/>`+T(X(v.year)+(v.year>1950?-10:10),Yy(py)-12,`${v.year}: ${show(k,py)}`,{s:12.5,w:700,a:v.year>1950?"end":"start",halo:3})+T(l+20,y0+14,`World ${iname(k).toLowerCase()}, ${Y0} to ${Y1}`,{s:10.5,c:C.rose,mono:true});
    return g}
  const bars=v.bars,mx=Math.max(...bars.map(z=>z[1])),bh=Math.min(30,(h-30)/bars.length-6);
  bars.forEach(([lab,val2,col],i)=>{const y=y0+18+i*(bh+6),bw=(w-284)*val2/mx;g+=T(x0+14,y+bh/2+4.5,lab,{s:12,w:600})+`<rect x="${x0+192}" y="${y}" width="${Math.max(2,bw)}" height="${bh}" rx="5" fill="${col==="nz"?C.ink:col==="world"?C.rose:REG[col]||C.rose}"/>`+T(x0+198+bw,y+bh/2+4.5,show(v.k,val2),{s:12,c:C.muted})});
  return g}

// ---------- the close-up card (420 × 260)
function chimp(x,y){return `<g transform="translate(${x},${y})"><circle cx="-17" cy="-6" r="9" fill="#8A6A55"/><circle cx="17" cy="-6" r="9" fill="#8A6A55"/><circle cx="-17" cy="-6" r="5" fill="#D9B99B"/><circle cx="17" cy="-6" r="5" fill="#D9B99B"/><circle r="19" fill="#8A6A55"/><ellipse cy="5" rx="13" ry="11" fill="#D9B99B"/><ellipse cx="-6" cy="-6" rx="5" ry="5.5" fill="#D9B99B"/><ellipse cx="6" cy="-6" rx="5" ry="5.5" fill="#D9B99B"/><circle cx="-6" cy="-6" r="2" fill="${C.ink}"/><circle cx="6" cy="-6" r="2" fill="${C.ink}"/><path d="M-5,9 q5,4 10,0" stroke="${C.ink}" stroke-width="1.6" fill="none"/></g>`}
function drawClose(){let g=`<rect width="420" height="260" rx="14" fill="${C.paper}"/>`;const v=s.view==="test"?"bubbles":s.view,y=yr();
  if(v==="guess"){const n=answered(),sc=score();g+=chimp(380,36)+T(22,36,"Beat the chimp?",{s:20,w:700})+TW(22,66,`A chimp picking A, B or C at random gets about 1 in 3 right. Gapminder found many adults score worse than that on questions like these.`,58,{s:12.5,c:C.muted,lh:16});
    const row=(yy,lab,kind)=>{let r=T(22,yy+5,lab,{s:13,w:600});for(let i=0;i<N;i++){const x=150+i*30;const a=s.ans[i];const st=kind==="you"?(a==null?"#fff":a===QZ[i].ans?C.ok:C.no):(i<Math.round(n/3)?C.rose:"#fff");r+=`<circle cx="${x}" cy="${yy}" r="10" fill="${st}" stroke="${kind==="you"?(a==null?C.line:"none"):C.line}"/>`}return r};
    g+=row(136,"You","you")+row(176,"Chimp","chimp");
    return g+T(22,222,`You: ${sc} right of ${n} answered`,{s:15,w:700})+T(22,244,`Chimp, picking at random: about ${nf(n/3,1)} of ${n}`,{s:13,c:C.muted})}
  if(v==="nz"){const k=s.ind,ids=[NZ,"world",...(s.pick&&s.pick!==NZ?[s.pick]:[])];g+=T(22,36,`${iname(k)} in ${y}`,{s:18,w:700})+T(22,56,I[k].unit,{s:11.5,c:C.muted});
    ids.forEach((id,i)=>{const v2=val(id,k,y);g+=`<circle cx="30" cy="${92+i*40}" r="7" fill="${id===NZ?C.ink:id==="world"?C.rose:REG[BY[id].region]}"/>`+T(46,97+i*40,id==="world"?"World":BY[id].name,{s:14,w:600})+T(398,97+i*40,show(k,v2),{s:15,w:700,a:"end"})});
    const rk=rank(k,y);if(rk)g+=T(22,236,`New Zealand ranks ${rk.r} of ${rk.n} countries (${rk.word}) in ${y}`,{s:12.5,c:C.muted});
    return g}
  if(v==="your"){const f=fit(s.x,s.y,y);g+=T(22,36,`${iname(s.x)} and ${iname(s.y).toLowerCase()}, ${y}`,{s:16,w:700});
    if(!f)return g+TW(22,70,s.x===s.y?"Pick two different indicators to see a relationship.":(s.x==="co2"||s.y==="co2")&&y>CO2Y?`CO₂ figures end in ${CO2Y}. Move the year to ${CO2Y} or earlier.`:"Not enough countries have both figures for this year. Try a later year.",52,{s:14,c:C.muted});
    const pos=(f.r+1)/2*376+22;g+=`<defs><linearGradient id="rg"><stop offset="0" stop-color="${C.no}"/><stop offset=".5" stop-color="${C.line}"/><stop offset="1" stop-color="${C.ok}"/></linearGradient></defs><rect x="22" y="60" width="376" height="12" rx="6" fill="url(#rg)"/><circle cx="${pos}" cy="66" r="9" fill="#fff" stroke="${C.ink}" stroke-width="2.5"/>`+
      T(22,90,"−1 strong negative",{s:11,c:C.muted})+T(210,90,"0 none",{s:11,a:"middle",c:C.muted})+T(398,90,"strong positive +1",{s:11,a:"end",c:C.muted});
    return g+T(22,124,`r = ${nf(f.r,2)}: ${W.strength(f.r)}, ${W.direction(f.r)}`,{s:18,w:700})+T(22,148,`${f.n} countries · ${W.LOG[s.x]||W.LOG[s.y]?"log scale used for r where the axis is logged":"straight scales"}`,{s:12,c:C.muted})+
      T(22,180,"Furthest from the trend:",{s:13,w:600})+T(22,200,`${BY[f.out.id].name} (${iname(s.y).toLowerCase()} ${show(s.y,f.out.y)})`,{s:13,c:C.muted})+TW(22,230,"A correlation shows things go together, not that one causes the other.",60,{s:12,c:C.rose})}
  // bubbles, read, test: New Zealand and the world in this year
  g+=T(22,34,`Aotearoa New Zealand in ${y}`,{s:18,w:700})+T(278,60,"NZ",{s:12,w:700,a:"end",mono:true})+T(398,60,"WORLD",{s:12,w:700,a:"end",mono:true,c:C.rose});
  ["lex","gdp","tfr","cmu5","pop"].forEach((k,i)=>{const yy=88+i*30;g+=`<line x1="22" y1="${yy+10}" x2="398" y2="${yy+10}" stroke="${C.grid}"/>`+T(22,yy,iname(k),{s:13,c:C.muted})+T(278,yy,show(k,val(NZ,k,y)),{s:14,w:700,a:"end"})+T(398,yy,show(k,val("world",k,y)),{s:13,a:"end",c:C.rose})});
  return g+T(22,248,y<1950?"Before 1950 these are reconstructed estimates.":"Estimates from Gapminder (CC BY 4.0).",{s:11.5,c:C.rose,mono:true})}
function rank(k,y){const good={lex:1,gdp:1,tfr:0,cmu5:-1,pop:1,co2:-1}[k];const vs=W.CS.map(c=>({id:c.id,v:val(c.id,k,y)})).filter(o=>o.v!=null);if(!vs.find(o=>o.id===NZ))return null;
  vs.sort((a,b)=>good<0?a.v-b.v:b.v-a.v);const r=vs.findIndex(o=>o.id===NZ)+1;return {r,n:vs.length,word:k==="tfr"?"1 = most babies per woman":good<0?"1 = lowest":"1 = highest"}}

// ---------- steps
const VIEW={bubbles:()=>scatter("gdp","lex",s.year,{trail:s.trail}),guess:quizCard,nz:()=>lineChart(s.ind,[NZ,"world",...(s.pick&&s.pick!==NZ?[s.pick]:[])],s.year),
  read:()=>scatter("gdp","lex",s.year,{extra:lensExtra(s.year),lens:s.lens,legend:s.lens!=="log"}),your:()=>scatter(s.x,s.y,s.year,{trail:false})};
const LENS=[["log","Log scale (× 10 steps)"],["size","Bubble size = population"],["trend","Trend"],["outlier","Outliers"],["variation","Variation"],["cause","Correlation is not causation"]];
const lensLine=()=>{const y=yr(),f=fit("gdp","lex",y);return ({
  log:`The income axis is a log scale: each equal step multiplies income by 10, from $1,000 to $10,000 to $100,000.`,
  size:(()=>{const p=W.CS.map(c=>[c,val(c.id,"pop",y)]).filter(x=>x[1]!=null).sort((a,b)=>b[1]-a[1])[0];return `Bubble area shows population: in ${y} the biggest bubble is ${p[0].name}, with ${show("pop",p[1])}, and New Zealand has ${show("pop",val(NZ,"pop",y))}.`})(),
  trend:f?`In ${y} there is a ${W.strength(f.r)} ${W.direction(f.r)} trend: countries with higher income per person tend to have higher life expectancy (r = ${nf(f.r,2)}).`:"",
  outlier:f?`${BY[f.lo.id].name} is an outlier in ${y}: its life expectancy is ${nf(-f.lo.e,1)} years below the trend for its income.`:"",
  variation:"There is variation: countries with similar incomes can have quite different life expectancies, so income is not the only thing that matters.",
  cause:"Income and life expectancy are correlated, but correlation does not prove causation: a third factor, such as clean water, education or peace, could raise both."})[s.lens]};
const yourLine=()=>{const y=yr(),f=fit(s.x,s.y,y);if(!f)return "Pick two different indicators.";const a=iname(s.x).toLowerCase(),b=iname(s.y).toLowerCase();
  return `In ${y}, countries with higher ${a} tended to have ${f.r>=0?"higher":"lower"} ${b}: a ${W.strength(f.r)} ${W.direction(f.r)} relationship (r = ${nf(f.r,2)}, ${f.n} countries). One outlier is ${BY[f.out.id].name}. This shows a correlation, not that ${a} causes ${b}.`};
const steps=[
 {k:"bubbles",lab:"The world in bubbles",speed:1,cap:"Every bubble is a country: further right is richer, higher up lives longer, bigger has more people. Find New Zealand, then press ▶ to watch 1800 to today. Tap a bubble to see its name.",
  big:"Each bubble shows <b>three numbers at once</b>: income (across), life expectancy (up) and population (size). Colour shows the world region. Play the years and most bubbles move <b>up and to the right</b>.",
  trap:"Reading the income axis as evenly spaced. It is a log scale: each gridline step multiplies the income.",
  exam:()=>{const y=yr();return `In ${y}, New Zealand's life expectancy was ${show("lex",val(NZ,"lex",y))} and its income per person was ${show("gdp",val(NZ,"gdp",y))}, compared with a world average of ${show("lex",val("world","lex",y))}.`},
  chips:["year","nzlex","nzgdp","nzpop","wlex"],controls:["play","year","pick","trail"]},
 {k:"guess",lab:"Guess first",cap:"Guess first, then see the real data. Tap A, B or C. Once you've committed, the real number appears with its year and source. Can you beat a chimp picking at random?",
  big:"Our guesses about the world are often <b>out of date</b>. Gapminder found that people often guess worse than random, because they picture the world as it was decades ago. <b>Check the data</b> before you decide.",
  trap:"Assuming things have got worse everywhere. Many measures, like child deaths and life expectancy, have improved a lot, even though problems remain.",
  exam:()=>{const q=QZ[s.qi];return s.ans[s.qi]==null?"Make your guess first: the real figure and its source appear after you commit.":`${q.answer} Source: ${q.source}.`},
  chips:["qn","you","chimp"],controls:["a0","a1","a2","next","redo"]},
 {k:"nz",lab:"NZ vs the world",cap:"Pick an indicator and a country to compare. The plum line is New Zealand, the dashed line is the world average. Move the year to read the values.",
  big:"A <b>line graph</b> shows change over time. Describe the <b>trend</b> (overall direction), the <b>rate</b> (steep or gentle) and any <b>dips</b>, and quote values with years and units.",
  trap:"Comparing a single country with a world average as if the average were a country. The world line averages very different places.",
  exam:()=>{const k=s.ind,a=W.ser(NZ,k).findIndex(v=>v!=null),y0=W.Y[a],L=latest(NZ,k),wa=val("world",k,y0),wl=latest("world",k);
    return `Between ${y0} and ${L.year}, New Zealand's ${iname(k).toLowerCase()} changed from ${show(k,at(NZ,k,y0))} to ${show(k,L.v)}, while the world average changed from ${show(k,wa)} to ${show(k,wl.v)}.`},
  chips:["ind","year","nzv","wv","cv"],controls:["ind","pick","year"]},
 {k:"read",lab:"Reading the chart",speed:1,cap:"Turn on one lens at a time: the log scale, bubble size, the trend, the outliers, variation, and why correlation is not causation. Each one is worked out from this year's data.",
  big:"Statistics words for any graph: <b>trend</b> (the overall pattern), <b>outlier</b> (a point far from the pattern), <b>variation</b> (how spread out values are), and <b>correlation is not causation</b>.",
  trap:"Saying a correlation proves one thing causes the other. It only shows they go together.",exam:lensLine,chips:["lens","year","r"],controls:["lens","play","year"]},
 {k:"your",lab:"Your question",cap:"Choose any two indicators for the axes and a year. Describe the relationship with the sentence frame: direction, strength, an outlier, and a caution about cause.",
  big:"A good statistical statement names the <b>direction</b> (positive or negative), the <b>strength</b> (strong, moderate, weak), an <b>outlier</b>, and stays careful about <b>cause</b>.",
  trap:"Describing only one country. A relationship is about the whole pattern of countries, then you point out exceptions.",exam:yourLine,chips:["xy","year","r","str"],controls:["x","y","year"]},
 {k:"test",lab:"Test yourself",speed:1,cap:"Seven challenges across the whole machine. Use the controls (the guess-first quiz is in step 2), then press Check.",chips:["year","nzlex","wlex"],controls:["play","year","pick","ind","x","y"]}];

const KUPU=[{mi:"raraunga",en:"data",ta:6555},{mi:"tauanga",en:"statistics",ta:44587},{mi:"kauwhata",en:"graph",ta:2460},{mi:"kauwhata rārangi",en:"line graph",ta:45723},
  {mi:"taupori",en:"population",ta:38688},{mi:"toharite",en:"mean, average",ta:38680,note:"Te Aka also lists toharite for the median; check which your class uses."},{mi:"taurangi",en:"variable",ta:7765},
  {mi:"taunakitanga",en:"evidence",ta:14911},{mi:"ōhanga",en:"economy",ta:4704},{mi:"hauhā",en:"carbon dioxide",ta:38806}];
Object.entries({bubbles:["taupori","kauwhata","raraunga"],guess:["taunakitanga","raraunga"],nz:["kauwhata rārangi","toharite","hauhā"],read:["tauanga","taurangi","ōhanga"],your:["taurangi","tauanga","taunakitanga"]}).forEach(([k,a])=>{const st=steps.find(x=>x.k===k);if(st)st.kupu=a});

// ---------- practice questions: written for this machine in the style of Year 9 and 10 social studies and statistics, not real exam questions
const QUESTIONS=[
 {step:"bubbles",q:"Describe how New Zealand's position on the bubble chart changed between 1900 and today. Use life expectancy and income per person, with values and years."},
 {step:"bubbles",q:"Explain what the size and the colour of each bubble show on a Gapminder bubble chart."},
 {step:"guess",q:"In 1800 world life expectancy was only about 30 years. Does this mean most adults died at about 30? Explain, using child mortality."},
 {step:"guess",q:"Gapminder says many people think the world is worse than it is. Use two pieces of evidence from the data to argue whether the world has improved since 1950."},
 {step:"nz",q:"Compare babies per woman in New Zealand and the world average since 1900. Describe one similarity and one difference."},
 {step:"nz",q:"Describe how New Zealand's CO₂ per person compares with the world average, and explain one reason this matters for New Zealand's role in climate change."},
 {step:"read",q:"The income axis on the bubble chart is a log scale. Explain what a log scale is, and why it helps when countries' incomes are so different."},
 {step:"read",q:"Countries with higher income per person tend to have lower child mortality. Does this prove that money keeps children alive? Explain, using the idea that correlation is not causation."},
 {step:"read",q:"Choose one country that is an outlier on the bubble chart this year. Describe how it differs from the trend and suggest one possible reason."},
 {step:"read",q:"Figures from before 1950 are reconstructed estimates. Explain why this matters when we draw conclusions from them."},
 {step:"your",q:"Using a scatter graph of two indicators you chose, write a statistical statement about the relationship: its direction, its strength, one outlier, and a caution about cause."},
 {step:"your",q:"Pose your own investigative question that could be answered with this data (for example, comparing two indicators in one year). Explain what you would look for in the graph."}];
const QB_KEY="world-questions-v1";let ADDED=[];try{ADDED=JSON.parse(localStorage.getItem(QB_KEY)||"[]")}catch(e){}

// ---------- controls
const sel=(id,label,options,get,set)=>({type:"select",id,label,options,get,set});
const COUNTRIES=[...W.CS].sort((a,b)=>a.name.localeCompare(b.name)).map(c=>[c.id,c.name]);
const INDOPTS=IND.map(k=>[k,iname(k)]);
function answer(i){if(s.ans[s.qi]!=null)return;s.ans[s.qi]=i;try{StudyKit.sfx(i===QZ[s.qi].ans?"win":"buzz")}catch(e){}}
const ansCtl=i=>({type:"toggle",id:"a"+i,label:"ABC"[i],labelFn:()=>`${"ABC"[i]} · ${QZ[s.qi].opts[i]}`,get:()=>s.ans[s.qi]===i,set:()=>answer(i)});
let API;
API=StudyKit.mount({kupu:KUPU,
  eyebrow:"Social studies · Statistics", title:"The guess the world machine", crumb:"Guess first, then see the real data: life expectancy, income, population, child mortality and babies per woman for every country since 1800", homeHash:"y9",
  fig:"FIG. 23 · THE WORLD IN BUBBLES", railTitle:"Guess first, then see the data",
  badge:{label:"Year 9–10 social studies · statistics"},
  mainBox:"0 0 800 420", mainPhoneBig:true, mainLabel:"A Gapminder-style bubble chart of every country: income per person across, life expectancy up, population as bubble size, with New Zealand in plum", closeBox:"0 0 420 260",
  state:s, steps,
  onStep:(x,stp)=>{if(stp.k!=="test")s.view=stp.k;try{legShow()}catch(e){}s.hover=null;if((stp.k==="read"||stp.k==="your")&&s.year<1950)s.year=Y1;if(stp.k==="your")co2Year();if(stp.k==="nz"&&!s.pick)s.pick="aus"},
  tick:(x,dt)=>{if(s.year>=Y1){s.year=Y0;return}s.year=Math.min(Y1,s.year+dt*20);if(s.year>=Y1)s.playing=false},
  controls:[
    {type:"play"},
    {type:"range",id:"year",label:"Year",min:Y0,max:Y1,step:1,get:()=>yr(),set:(x,v)=>{s.year=v;s.playing=false},fmt:()=>String(yr())},
    sel("pick","Highlight a country",[["","None"],...COUNTRIES],()=>s.pick,(x,v)=>{s.pick=v}),
    {type:"toggle",id:"trail",label:"New Zealand's path",labelFn:()=>s.trail?"New Zealand's path: on":"New Zealand's path: off",get:()=>s.trail,set:(x,v)=>{s.trail=v}},
    ansCtl(0),ansCtl(1),ansCtl(2),
    {type:"button",id:"next",label:"Next question →",onClick:()=>{s.qi=(s.qi+1)%N}},
    {type:"button",id:"redo",label:"Start the quiz again",onClick:()=>{s.ans=[];s.qi=0}},
    sel("ind","Indicator",INDOPTS,()=>s.ind,(x,v)=>{s.ind=v;s.view="nz";if(!s.pick)s.pick="aus"}),
    sel("lens","Lens",LENS,()=>s.lens,(x,v)=>{s.lens=v}),
    sel("x","Across (x)",INDOPTS,()=>s.x,(x,v)=>{s.x=v;s.view="your";co2Year()}),
    sel("y","Up (y)",INDOPTS,()=>s.y,(x,v)=>{s.y=v;s.view="your";co2Year()})],
  drawMain:()=>{try{legShow()}catch(e){}return (VIEW[s.view==="test"?"bubbles":s.view]||VIEW.bubbles)()},
  drawClose,
  chips:()=>{const y=yr(),f=s.view==="your"?fit(s.x,s.y,y):fit("gdp","lex",y),pv=s.pick&&s.pick!==NZ?val(s.pick,s.ind,y):null;
    return {year:["YEAR",String(y),true],nzlex:["NZ LIFE EXPECTANCY",show("lex",val(NZ,"lex",y))],nzgdp:["NZ INCOME / PERSON",show("gdp",val(NZ,"gdp",y))],nzpop:["NZ POPULATION",show("pop",val(NZ,"pop",y))],wlex:["WORLD LIFE EXPECTANCY",show("lex",val("world","lex",y))],
      qn:PHONE.matches?[`QUESTION ${s.qi+1} OF ${N}`,QZ[s.qi].q]:["QUESTION",`${s.qi+1} of ${N}`],you:["YOU",`${score()} right of ${answered()}`,true],chimp:["CHIMP (RANDOM)",`about ${nf(answered()/3,1)} of ${answered()}`],
      ind:["INDICATOR",iname(s.ind)],nzv:["NEW ZEALAND",show(s.ind,val(NZ,s.ind,y)),true],wv:["WORLD",show(s.ind,val("world",s.ind,y))],cv:[s.pick&&s.pick!==NZ?BY[s.pick].name.toUpperCase():"COMPARE",pv==null?"pick a country":show(s.ind,pv)],
      lens:["LENS",LENS.find(l=>l[0]===s.lens)[1]],r:["CORRELATION",f?`r = ${nf(f.r,2)}`:"–",true],xy:["AXES",`${iname(s.x)} × ${iname(s.y)}`],str:["RELATIONSHIP",f?`${W.strength(f.r)} ${W.direction(f.r)}`:"–"]}},
  challenges:[
    (()=>{const y=W.firstYear(NZ,"lex",70);return {q:"Set the year when New Zealand's life expectancy first reached 70.",check:()=>Math.abs(yr()-y)<=2,ok:()=>`Yes: about ${y}, when it reached ${show("lex",val(NZ,"lex",y))}.`,no:()=>`In ${yr()} it was ${show("lex",val(NZ,"lex",yr()))}. ${val(NZ,"lex",yr())<70?"Go later.":"Go earlier."}`}})(),
    {q:`Beat the chimp: answer all ${N} guess-first questions (step 2) and get more right than random guessing would (more than ${nf(N/3,1)}).`,check:()=>answered()===N&&score()>N/3,ok:()=>`Yes: ${score()} of ${N}. The chimp would expect about ${nf(N/3,1)}.`,no:()=>answered()<N?`You've answered ${answered()} of ${N}. Finish the quiz in step 2.`:`${score()} of ${N}. The chimp expects about ${nf(N/3,1)}. Start the quiz again and use what you learned.`},
    (()=>{const y=W.firstYear("world","pop",3e6);return {q:"Set the year when the world's population first passed 3 billion.",check:()=>Math.abs(yr()-y)<=2,ok:()=>`Yes: about ${y}.`,no:()=>`In ${yr()} the world had ${show("pop",val("world","pop",yr()))}.`}})(),
    {q:"Choose child mortality as the indicator, then pick a country where it is still more than 10 times New Zealand's today.",check:()=>s.ind==="cmu5"&&s.pick&&s.pick!==NZ&&latest(s.pick,"cmu5").v>10*latest(NZ,"cmu5").v,
      ok:()=>`Yes: ${BY[s.pick].name}, ${show("cmu5",latest(s.pick,"cmu5").v)} children, against ${show("cmu5",latest(NZ,"cmu5").v)} in New Zealand.`,no:()=>s.ind!=="cmu5"?"Set the indicator to child mortality first.":!s.pick||s.pick===NZ?"Pick a country to compare.":`${BY[s.pick].name}: ${show("cmu5",latest(s.pick,"cmu5").v)}. Look for a higher one; the bubble chart's lower left is a good place to look.`},
    {q:"Pick a country whose life expectancy today is lower than New Zealand's was in 1950.",check:()=>s.pick&&s.pick!==NZ&&latest(s.pick,"lex").v<at(NZ,"lex",1950),
      ok:()=>`Yes: ${BY[s.pick].name}, ${show("lex",latest(s.pick,"lex").v)} today, against ${show("lex",at(NZ,"lex",1950))} in New Zealand in 1950.`,no:()=>!s.pick||s.pick===NZ?"Pick a country first.":`${BY[s.pick].name}: ${show("lex",latest(s.pick,"lex").v)} today. New Zealand had ${show("lex",at(NZ,"lex",1950))} in 1950.`},
    {q:"Find two indicators with a strong negative relationship (r below −0.7) in any year.",check:()=>{const f=fit(s.x,s.y,yr());return !!f&&f.r<-.7},ok:()=>`Yes: r = ${nf(fit(s.x,s.y,yr()).r,2)}. As one goes up, the other tends to go down.`,no:()=>{const f=fit(s.x,s.y,yr());return f?`r = ${nf(f.r,2)}. Try another pair: think about what goes down as countries get healthier.`:"Pick two different indicators."}},
    {q:`Set the year when New Zealand's income per person was about 10 times what it was in ${Y0} (between 9 and 11 times).`,check:()=>{const r=val(NZ,"gdp",yr())/at(NZ,"gdp",Y0);return r>=9&&r<=11},
      ok:()=>`Yes: ${show("gdp",val(NZ,"gdp",yr()))} against ${show("gdp",at(NZ,"gdp",Y0))}. On the log scale that is exactly one big gridline step.`,no:()=>`In ${yr()} it was ${nf(val(NZ,"gdp",yr())/at(NZ,"gdp",Y0),1)} times the ${Y0} figure.`}],
  truth:esc(`${D.meta.honesty} Life expectancy is how long a newborn would live, on average, if that year's death rates stayed the same. Income is GDP per person adjusted for prices (PPP, 2021 dollars): an average that hides how unequal incomes are inside a country. CO₂ counts fossil fuels and industry only. ${D.meta.sources.map(x=>x.credit).join(" · ")}. Retrieved ${D.meta.retrieved}.`),
  footer:"Covers Year 9 and 10 social studies and statistics (and NCEA Level 1 data literacy): reading a bubble chart and line graphs, log scales, trend, outliers, variation, correlation and causation, and comparing New Zealand with the world on life expectancy, income, population, child mortality, babies per woman and CO₂."
});
// honest footer: real data, with its limits (the kit's tag says "Simulated", which this machine is not)
try{document.querySelector("footer .truth").textContent="Real data"}catch(e){}
const leg=document.createElement("ul");leg.className="wlegend";leg.setAttribute("aria-label","Colours: world regions");
leg.innerHTML=[...REG_ORDER.map(k=>[REG[k],D.meta.regions[k]]),[C.ink,"Aotearoa New Zealand"]].map(([c,n])=>`<li><i style="background:${c}"></i>${esc(n)}</li>`).join("");
try{document.querySelector(".playmain .canvas").insertAdjacentElement("afterend",leg)}catch(e){}
const legShow=()=>{leg.hidden=!PHONE.matches||!["bubbles","read","your","test"].includes(s.view)};

// ---------- tap a bubble to name it and highlight it; tap an answer card to guess
const main=document.getElementById("k-main");
main.addEventListener("pointermove",e=>{const c=e.target.closest&&e.target.closest("[data-c]"),id=c?c.dataset.c:null;if(id!==s.hover){s.hover=id;API.redraw()}});
legShow();try{PHONE.addEventListener("change",()=>{legShow();API.redraw()})}catch(e){}
main.addEventListener("pointerleave",()=>{if(s.hover){s.hover=null;API.redraw()}});
main.addEventListener("click",e=>{const g=e.target.closest&&e.target.closest("[data-guess]");if(g&&s.view==="guess"){answer(+g.dataset.guess);API.redraw();return}
  const c=e.target.closest&&e.target.closest("[data-c]");if(c&&c.dataset.c!==NZ){s.pick=s.pick===c.dataset.c?"":c.dataset.c;s.hover=c.dataset.c;API.redraw()}});

// ---------- where the numbers come from (read from the data file's meta)
const css=document.createElement("style");css.textContent=`.qbank,.wsrc{margin-top:18px}.qbank h3,.wsrc h3{margin:0 0 4px}.qbank>p,.wsrc>p{margin:0 0 14px;color:var(--as-muted,#654A4E);font-size:14px}.qbank ol{list-style:none;margin:0;padding:0;display:grid;gap:10px}
.qbank li{border:1px solid var(--as-line,#E4D9DE);border-radius:14px;padding:12px 14px;display:grid;gap:8px}.qbank li b{font:600 11px "IBM Plex Mono",monospace;letter-spacing:.06em;color:#916A70;text-transform:uppercase}.qbank li .acts{display:flex;gap:8px;flex-wrap:wrap}
.qbank li.added{border-style:dashed}.qbank .q{font-size:15px;line-height:1.5}.wsrc ul{margin:0;padding-left:18px;display:grid;gap:8px;font-size:14px;line-height:1.5}.wsrc code{font:12px "IBM Plex Mono",monospace;overflow-wrap:anywhere}
.wlegend{list-style:none;margin:8px 2px 0;padding:0;display:flex;flex-wrap:wrap;gap:4px 12px;font-size:12.5px;color:var(--as-muted,#654A4E)}.wlegend li{display:flex;align-items:center;gap:5px}.wlegend i{width:10px;height:10px;border-radius:50%;flex:none}.wlegend[hidden]{display:none}`;document.head.appendChild(css);
const srcCard=document.createElement("section");srcCard.className="card wsrc";srcCard.setAttribute("aria-labelledby","ws-h");
srcCard.innerHTML=`<h3 id="ws-h">Where the numbers come from</h3><p>Every number in this machine is read or calculated from one data file, built from these open datasets on ${esc(D.meta.retrieved)}. ${esc(D.meta.honesty)}</p><ul>${D.meta.sources.map(x=>`<li><b>${esc(x.credit)}</b>: <a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.name)} ↗</a> · <a href="${esc(x.licence_url)}" target="_blank" rel="noopener">${esc(x.licence)}</a> · <code>${esc(x.repo.replace("https://github.com/",""))}@${esc(x.commit.slice(0,7))}</code></li>`).join("")}${IND.map(k=>`<li>${esc(iname(k))}: ${esc(I[k].unit)}${I[k].version?` · ${esc(I[k].source)} ${esc(I[k].version)}`:` · ${esc(I[k].source)}`}</li>`).join("")}</ul>`;

// ---------- the practice question bank. Allen can add to it (study/tutor.js, add_question).
const bank={list:()=>[...QUESTIONS,...ADDED.map(x=>({...x,added:true}))],
  add(q){const item={step:steps.some(x=>x.k===q.step&&x.k!=="test")?q.step:"",q:String(q.question||"").replace(/[<>]/g,"").slice(0,900)};if(item.q.length<10)return null;ADDED.push(item);ADDED=ADDED.slice(-30);try{localStorage.setItem(QB_KEY,JSON.stringify(ADDED))}catch(e){}paintBank();return item}};
try{window.StudyKit.current.cfg.questionBank=bank}catch(e){}
const host=document.createElement("section");host.className="card qbank";host.setAttribute("aria-labelledby","qb-h");
function paintBank(){const list=bank.list();host.innerHTML=`<h3 id="qb-h">Practice questions</h3><p>Written for this machine in the style of Year 9 and 10 social studies and statistics, not real exam questions. Open the tool for each one, or work through it with Allen. Ask Allen for more and he'll add them here.</p><ol>${list.map((x,i)=>`<li class="${x.added?"added":""}"><b>${esc((steps.find(st=>st.k===x.step)||{lab:"The world in data"}).lab)}${x.added?" · added by Allen":""}</b><span class="q">${esc(x.q)}</span><span class="acts">${x.step?`<button class="btn" type="button" data-qopen="${x.step}">Open the tool</button>`:""}<button class="btn primary" type="button" data-qallen="${i}">Work through it with Allen</button></span></li>`).join("")}</ol>`}
paintBank();
const after=document.querySelector(".card.practise")||document.querySelector(".bench");after.insertAdjacentElement("afterend",host);host.insertAdjacentElement("afterend",srcCard);
host.addEventListener("click",e=>{const o=e.target.closest("[data-qopen]"),a=e.target.closest("[data-qallen]");
  if(o){const i=steps.findIndex(x=>x.k===o.dataset.qopen);if(i>=0){API.setStep(i);try{document.querySelector(".bench").scrollIntoView({behavior:RM?"auto":"smooth",block:"start"})}catch(err){}}}
  if(a){const x=bank.list()[+a.dataset.qallen];dispatchEvent(new CustomEvent("allen:ask",{detail:{display:"Work through this practice question with me:\n\n"+x.q,
    text:`Here is a practice question for Year 9–10 social studies and statistics, using real Gapminder and Our World in Data figures. Work through it with me step by step, and use this machine to show each part (switch to the right step and move the controls: the year, the country, the indicator, the lens, the axes). Quote real values from the machine with their years. Let me try each part before you give the answer.\n\n---\n${x.q}`}}))}});
}
})();
