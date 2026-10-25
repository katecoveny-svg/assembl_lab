(()=>{
/* The data detective: NCEA Level 1 Mathematics and Statistics, AS 91946.
   Every number here is made up (a fictional Kōwhai College and two fictional towns). All the statistics
   shown are computed from the arrays below, so the drawings, readouts and exam lines always agree. */
const K=window.StudyKit;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const fh=v=>String(Math.round(v*100)/100);            // 3.75, 3, 9.5
const pc=v=>String(Math.round(v));
function rng(seed){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}}

// ---------- the survey: hours of screen time a day for the same 30 Year 11s, school day and weekend (made up)
const WD=[1.5,2,2,2.5,2.5,2.5,3,3,3,3,3,3.5,3.5,3.5,3.5,4,4,4,4,4.5,4.5,4.5,5,5,5.5,5.5,6,6.5,7,11];
const WE=[2,3,3.5,4,4,4.5,4.5,4.5,5,5,5,5.5,5.5,5.5,5.5,6,6,6,6.5,6.5,7,7,7,7.5,7.5,8,8.5,9,9.5,12];
// five-number summary, quartiles as the medians of the lower and upper halves; outliers beyond 1.5 × IQR
function five(arr){const a=[...arr].sort((x,y)=>x-y),n=a.length;
  const med=v=>{const m=v.length;return m%2?v[(m-1)/2]:(v[m/2-1]+v[m/2])/2};
  const q1=med(a.slice(0,Math.floor(n/2))),q3=med(a.slice(Math.ceil(n/2))),iqr=q3-q1;
  const hiF=q3+1.5*iqr,loF=q1-1.5*iqr,inl=a.filter(v=>v<=hiF&&v>=loF);
  return {a,n,min:a[0],max:a[n-1],med:med(a),q1,q3,iqr,range:a[n-1]-a[0],out:a.filter(v=>v>hiF||v<loF),wLo:inl[0],wHi:inl[inl.length-1]}}
const F=five(WD),FW=five(WE);
const below=L=>WD.filter(v=>v<L).length, onL=L=>WD.filter(v=>v===L).length;
const OLAP=Math.max(0,Math.min(F.q3,FW.q3)-Math.max(F.q1,FW.q1));

// ---------- sleep: two schools (made up)
const SL=[{nm:"Kōwhai",v:52,c:"#6FA3E8"},{nm:"Harbour",v:48,c:"#F2C83C"}],TOP=55;
const looks=a=>(SL[0].v-a)/Math.max(.0001,SL[1].v-a),really=SL[0].v/SL[1].v;

// ---------- the town: 400 students on a map, school on the left, the bus stop on the right (made up)
const COLS=25,ROWS=16,NACT=152;
const POP=(()=>{const r=rng(11),P=[];for(let i=0;i<COLS*ROWS;i++){const c=i%COLS,row=Math.floor(i/COLS);P.push({i,c,row,score:(1-c/(COLS-1))*0.9+r()*0.55,act:false})}
  [...P].sort((x,y)=>y.score-x.score).slice(0,NACT).forEach(p=>p.act=true);return P})();
const TRUE=NACT/POP.length*100;
const YOU={c:3,row:7},STOP={c:24,row:8};
const near=(o,set)=>[...set].sort((p,q)=>((p.c-o.c)**2+(p.row-o.row)**2)-((q.c-o.c)**2+(q.row-o.row)**2)||p.i-q.i);
const FRIENDS=near(YOU,POP.filter(p=>!(p.c===YOU.c&&p.row===YOU.row))).slice(0,30);
const BUS=near(STOP,POP.filter(p=>!p.act)).slice(0,30);
const METHODS=[["random","Random"],["friends","Your friends"],["online","Online poll"],["bus","At the bus stop"]];
const mName=m=>(METHODS.find(x=>x[0]===m)||METHODS[0])[1];

// ---------- two towns (made up)
const TOWNS={A:{nm:"Town A",inj:120,cyc:4000},B:{nm:"Town B",inj:60,cyc:1000}};
const per1000=t=>t.inj/t.cyc*1000;
const SAFER=per1000(TOWNS.A)<per1000(TOWNS.B)?"A":"B";

// ---------- state
const s={line:2.5,t:1,med:true,box:true,wh:true,out:true,shade:true,axis:46,brk:false,method:"random",n:40,seed:1,view:"counts",pick:"",playing:false,sample:[]};
function takeSample(){const r=rng(1000+s.seed*7919);
  if(s.method==="random"){const idx=POP.map(p=>p.i);for(let i=idx.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[idx[i],idx[j]]=[idx[j],idx[i]]}s.sample=idx.slice(0,s.n)}
  else if(s.method==="friends")s.sample=FRIENDS.map(p=>p.i);
  else if(s.method==="bus")s.sample=BUS.map(p=>p.i);
  else s.sample=POP.filter(p=>r()<(p.act?0.35:0.08)).map(p=>p.i)}
takeSample();
const sampPct=()=>s.sample.length?s.sample.filter(i=>POP[i].act).length/s.sample.length*100:0;
const calmMQ=()=>{try{return matchMedia("(prefers-reduced-motion: reduce)").matches}catch(e){return false}};

// ---------- drawing helpers: figure parts from the shared bench look (StudyKit.fig), lavender for maths
const FG=K.fig,PAL=FG.palette,TINT=PAL.case.lavender,AX="#8F9BAA";
const BLUE=PAL.product.blueberry,PINKP=PAL.product.strawberry,BUTTER=PAL.product.butter,LIME=PAL.product.lime;
const DBLUE="#3F6FB0",DPINK="#B5466F";   // deep shades for strokes and coloured text on paper
const W=640,H=390;
const bg=()=>FG.floor(W,H);
// a graph screen: a frosted lavender case, the plot itself stays flat and exact
const screen=(x,y,w,h,o)=>FG.acrylic(x,y,w,h,Object.assign({tint:TINT,d:10,r:16,balls:false,shadowLen:40,opacity:.22},o||{}));
const title=(t,sub)=>`<text class="t-big" x="22" y="34" style="font-size:17px">${t}</text><text class="t-lab" x="22" y="53">${sub}</text>`;
// phones get bigger drawing text (kit: .phone-big), so pills size themselves for the screen they're on
const PH=()=>{try{return matchMedia("(max-width:820px)").matches}catch(e){return false}};
const pill=(x,y,txt,fill,ink,anchor)=>{const fs=PH()?17:12.5,h=PH()?32:24,w=txt.length*fs*.56+fs*1.5,x0=anchor==="end"?x-w:anchor==="middle"?x-w/2:x;
  return `<g><rect x="${x0.toFixed(1)}" y="${(y-h/2-1).toFixed(1)}" width="${w.toFixed(1)}" height="${h}" rx="${h/2}" fill="${fill}"/><text x="${(x0+w/2).toFixed(1)}" y="${(y+fs*.36).toFixed(1)}" text-anchor="middle" style="font:600 ${fs}px var(--display);fill:${ink}">${txt}</text></g>`};
const X0=66,SC=44,hx=h=>X0+h*SC;             // hours → x (0 to 12 h)
function hAxis(y,x0,sc){const X=h=>x0+h*sc;let o=`<line x1="${X(0)-8}" x2="${X(12)+8}" y1="${y}" y2="${y}" stroke="${AX}" stroke-width="2" stroke-linecap="round"/>`;
  for(let h=0;h<=12;h++)o+=`<line x1="${X(h)}" x2="${X(h)}" y1="${y}" y2="${y+6}" stroke="${AX}" stroke-width="1.5"/><text class="t-ink" x="${X(h)}" y="${y+22}" text-anchor="middle">${h}</text>`;
  return o+`<text class="t-lab" x="${X(12)+8}" y="${y+40}" text-anchor="end">HOURS A DAY</text>`}
function dot(x,y,r,fill,stroke,extra){return `<circle class="dd-dot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${fill}" stroke="${stroke}" stroke-width="1.6"${extra||""}/>`+
  (r>6?`<circle cx="${(x-r*.32).toFixed(1)}" cy="${(y-r*.34).toFixed(1)}" r="${(r*.26).toFixed(1)}" fill="#fff" opacity=".55"/>`:"")}
function stacks(arr){const cnt={};return arr.map(v=>{const j=cnt[v]=(cnt[v]||0)+1;return {v,j:j-1}})}

// ---------- 1 · read it
const RAX=294,SAX=322;
function sceneRead(mini){
  let o=bg()+title("Hours on screens on a school day","30 YEAR 11s · KŌWHAI COLLEGE · MADE-UP DATA");
  const lx=hx(s.line);
  o+=screen(30,62,584,RAX+50-62);
  o+=`<rect x="${hx(0)-12}" y="74" width="${Math.max(0,lx-hx(0)+12)}" height="${RAX-74}" rx="14" fill="${BLUE}" fill-opacity=".14"/>`;
  o+=hAxis(RAX,X0,SC);
  stacks(WD).forEach(({v,j})=>{const b=v<s.line,on=v===s.line;
    o+=dot(hx(v),RAX-13-j*22,10.4,b?BLUE:on?BUTTER:"var(--paper)",b?DBLUE:on?"#B08A10":AX)});
  o+=`<line x1="${lx}" x2="${lx}" y1="84" y2="${RAX+8}" stroke="var(--ink)" stroke-width="3" stroke-linecap="round"/>`;
  o+=`<g transform="translate(${lx},76)"><rect x="-34" y="-17" width="68" height="28" rx="14" fill="var(--ink)"/><text class="t-ink" y="2" text-anchor="middle" style="fill:#fff;font-weight:600">${fh(s.line)} h</text></g>`;
  const b=below(s.line),r=WD.length-b-onL(s.line);
  if(!mini){o+=pill(clamp(lx-10,96,620),RAX+66,`← ${b} below`,BLUE,"var(--ink)","end")+pill(clamp(lx+10,20,544),RAX+66,`${r} above →`,"var(--paper)","var(--ink)","start");
    o+=`<rect data-hit="axis" x="${hx(0)-24}" y="62" width="${hx(12)-hx(0)+48}" height="${RAX-30}" fill="transparent"/>`}
  return o}

// ---------- 2 · middle and spread (the dots drop into a box plot)
function boxPlot(f,y,hh,col,opt,X){opt=opt||{};let o="";const a=opt.alpha==null?1:opt.alpha;if(a<=0)return "";
  const wHi=opt.out?f.wHi:f.max,wLo=opt.out?f.wLo:f.min;
  o+=`<g opacity="${a.toFixed(2)}">`;
  if(opt.wh){if(opt.box)o+=`<line x1="${X(wLo)}" x2="${X(f.q1)}" y1="${y}" y2="${y}" stroke="var(--ink)" stroke-width="2.5"/><line x1="${X(f.q3)}" x2="${X(wHi)}" y1="${y}" y2="${y}" stroke="var(--ink)" stroke-width="2.5"/>`;
    else o+=`<line x1="${X(wLo)}" x2="${X(wHi)}" y1="${y}" y2="${y}" stroke="var(--ink)" stroke-width="2.5"/>`;
    o+=[wLo,wHi].map(v=>`<line x1="${X(v)}" x2="${X(v)}" y1="${y-hh*.28}" y2="${y+hh*.28}" stroke="var(--ink)" stroke-width="2.5" stroke-linecap="round"/>`).join("")}
  // the box: a frosted block in the series colour (its front face is the exact Q1 to Q3 span)
  if(opt.box){const bx=X(f.q1),bw=X(f.q3)-X(f.q1),dk=col===BLUE?DBLUE:DPINK;o+=`<path d="M${bx+4},${y-hh/2} l7,-4 h${bw-8} l-7,4z" fill="${col}" fill-opacity=".35" stroke="${dk}" stroke-width="1.2"/><rect x="${bx}" y="${y-hh/2}" width="${bw}" height="${hh}" rx="9" fill="${col}" fill-opacity=".26" stroke="${dk}" stroke-width="2.5"/><path d="M${bx+9},${y-hh/2+5} h${Math.min(bw*.4,40)}" stroke="#fff" stroke-opacity=".8" stroke-width="2" stroke-linecap="round"/>`}
  if(opt.med)o+=`<line x1="${X(f.med)}" x2="${X(f.med)}" y1="${y-hh/2-7}" y2="${y+hh/2+7}" stroke="${DPINK}" stroke-width="6" stroke-linecap="round"/><line x1="${X(f.med)}" x2="${X(f.med)}" y1="${y-hh/2-6}" y2="${y+hh/2+6}" stroke="${PINKP}" stroke-width="3.5" stroke-linecap="round"/>`;
  return o+`</g>`}
function sceneSpread(mini){
  let o=bg()+title("From dots to a box plot","SAME 30 STUDENTS · SCHOOL DAYS · MADE-UP DATA");
  const t=s.t,e=t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2,SY=208,a=clamp((t-.5)/.5,0,1);
  o+=screen(30,62,584,SAX+50-62);
  o+=hAxis(SAX,X0,SC);
  o+=boxPlot(F,SY,78,BLUE,{box:s.box,med:s.med,wh:s.wh,out:s.out,alpha:a},hx);
  stacks(WD).forEach(({v,j})=>{const y0=SAX-13-j*22,y1=SY+(j%2?1:-1)*Math.ceil(j/2)*9,isOut=s.out&&F.out.includes(v);
    o+=dot(hx(v),y0+(y1-y0)*e,10.4+(6.4-10.4)*e,isOut&&a>0?PINKP:BLUE,isOut&&a>0?DPINK:"var(--paper)",` fill-opacity="${(1-.35*e).toFixed(2)}"`)});
  if(a>0&&!mini){o+=`<g opacity="${a.toFixed(2)}">`;
    if(s.med)o+=pill(hx(F.med),128,`median ${fh(F.med)} h`,PINKP,"var(--ink)","middle");
    if(s.box){o+=`<text class="t-lab" x="${hx(F.q1)}" y="${SY+62}" text-anchor="middle">Q1 ${fh(F.q1)}</text><text class="t-lab" x="${hx(F.q3)}" y="${SY+62}" text-anchor="middle">Q3 ${fh(F.q3)}</text>`;
      o+=`<path d="M${hx(F.q1)},${SY-50} v-6 H${hx(F.q3)} v6" fill="none" stroke="${DBLUE}" stroke-width="2"/><text class="t-lab" x="${hx(F.q3)+8}" y="${SY-50}" style="fill:${DBLUE}">MIDDLE HALF · IQR ${fh(F.iqr)} h</text>`}
    if(s.wh){const y=SY+100;o+=`<path d="M${hx(F.min)},${y-6} v6 H${hx(F.max)} v-6" fill="none" stroke="${AX}" stroke-width="2"/><text class="t-lab" x="${(hx(F.min)+hx(F.max))/2}" y="${y-8}" text-anchor="middle">RANGE ${fh(F.range)} h</text>`}
    if(s.out&&F.out.length)o+=pill(hx(F.out[0])+16,SY+34,`${fh(F.out[0])} h · unusual`,"var(--paper)",DPINK,"end");
    o+=`</g>`}
  return o}

// ---------- 3 · compare school days with weekends
const CX0=126,CSC=39,cx=h=>CX0+h*CSC,CAX=338;
function sceneCompare(mini){
  let o=bg()+title("School days vs weekends","SAME 30 STUDENTS · HOURS ON SCREENS · MADE-UP DATA");
  const rows=[[F,"School day",BLUE,140],[FW,"Weekend",PINKP,254]];
  o+=screen(12,66,606,CAX+50-66);
  if(s.shade&&OLAP>0){const x1=cx(Math.max(F.q1,FW.q1)),x2=cx(Math.min(F.q3,FW.q3));
    o+=`<rect x="${x1}" y="96" width="${x2-x1}" height="196" rx="6" fill="${BUTTER}" fill-opacity=".32"/>`;
    if(!mini)o+=pill((x1+x2)/2,84,`boxes overlap ${fh(OLAP)} h`,BUTTER,"var(--ink)","middle")}
  o+=hAxis(CAX,CX0,CSC);
  rows.forEach(([f,nm,col,y])=>{const st=stacks(f.a);
    st.forEach(({v,j})=>{o+=`<circle cx="${cx(v)}" cy="${y+(j%2?1:-1)*Math.ceil(j/2)*6}" r="4.6" fill="${col}" fill-opacity=".38"/>`});
    o+=boxPlot(f,y,58,col,{box:true,med:true,wh:true,out:true},cx);
    o+=`<text class="t-big" x="20" y="${y-4}" style="fill:${col===BLUE?DBLUE:DPINK};font-size:15px">${nm}</text><text class="t-lab" x="20" y="${y+15}">MEDIAN ${fh(f.med)} h</text>`});
  if(s.shade){o+=[F,FW].map(f=>`<line x1="${cx(f.med)}" x2="${cx(f.med)}" y1="100" y2="${CAX}" stroke="${DPINK}" stroke-width="1.5" stroke-dasharray="4 4" opacity=".7"/>`).join("");
    const y=197,x1=cx(F.med),x2=cx(FW.med);o+=`<path d="M${x1},${y} H${x2-8}" stroke="var(--ink)" stroke-width="2.5"/><path d="M${x2-10},${y-6} L${x2},${y} L${x2-10},${y+6}" fill="none" stroke="var(--ink)" stroke-width="2.5" stroke-linejoin="round"/>`;
    if(!mini)o+=pill(x2+8,y,`+${fh(FW.med-F.med)} h`,"var(--ink)","#fff","start")}
  return o}

// ---------- 4 · sneaky graphs
function sceneMislead(mini){
  let o=bg()+title("Students who sleep 8+ hours","TWO SCHOOLS · AS A NEWSPAPER MIGHT DRAW IT · MADE-UP DATA");
  const a=s.axis,B=318,T=96,yv=v=>B-(v-a)/(TOP-a)*(B-T),x0=96;
  o+=screen(24,70,404,B+40-70);
  for(let v=Math.ceil((a+.001)/5)*5;v<=TOP;v+=5)o+=`<line x1="${x0}" x2="${x0+306}" y1="${yv(v)}" y2="${yv(v)}" stroke="var(--line)" stroke-width="1.2"/><text class="t-ink" x="${x0-10}" y="${yv(v)+4}" text-anchor="end">${v}%</text>`;
  o+=`<text class="t-ink" x="${x0-10}" y="${B+4}" text-anchor="end" style="font-weight:700;fill:${a>0?"var(--warn)":"var(--ink)"}">${a}%</text>`;
  SL.forEach((d,i)=>{const x=x0+40+i*140,y=yv(d.v);
    o+=`<rect x="${x}" y="${y}" width="96" height="${B-y}" rx="10" fill="${d.c}"/><rect x="${x}" y="${B-12}" width="96" height="12" fill="${d.c}"/><path d="M${x+12},${y+8} v${Math.max(0,B-y-20)}" stroke="#fff" stroke-opacity=".45" stroke-width="5" stroke-linecap="round"/>`;
    o+=`<text class="t-big" x="${x+48}" y="${y-10}" text-anchor="middle" style="font-size:17px">${d.v}%</text><text class="t-lab" x="${x+48}" y="${B+22}" text-anchor="middle">${d.nm.toUpperCase()}</text>`});
  o+=`<line x1="${x0}" x2="${x0}" y1="${T-12}" y2="${B}" stroke="${AX}" stroke-width="2"/><line x1="${x0}" x2="${x0+306}" y1="${B}" y2="${B}" stroke="${AX}" stroke-width="2"/>`;
  if(a>0&&s.brk)o+=`<path d="M${x0-9},${B-30} l9,-6 l9,6 M${x0-9},${B-21} l9,-6 l9,6" fill="none" stroke="var(--warn)" stroke-width="2.5" stroke-linejoin="round"/>`;
  if(a>0&&!mini)o+=pill(x0+150,B+50,`axis starts at ${a}%, not 0`,"var(--warn)","#fff","middle");
  const L=looks(a),px=470;
  o+=FG.box(px-24,88,174,236,{colour:"#FFFFFF",kind:"plastic",d:10,r:20,stroke:FG.deep(TINT),shadowLen:40});
  o+=`<text class="t-lab" x="${px}" y="122">BARS LOOK</text><text x="${px}" y="172" style="font:600 46px var(--as-display);fill:${L>1.25?"var(--warn)":"var(--ink)"}">${L.toFixed(L<10?1:0)}×</text>`;
  o+=`<text class="t-lab" x="${px}" y="226">REALLY</text><text x="${px}" y="276" style="font:600 46px var(--as-display);fill:var(--good)">${really.toFixed(2)}×</text>`;
  o+=`<text class="t-lab" x="${px}" y="302">52 ÷ 48</text>`;
  return o}

// ---------- 5 · who did they ask?
const GX0=104,GDX=19.4,GY0=106,GDY=15.4;
const gx=c=>GX0+c*GDX,gy=r=>GY0+r*GDY;
function sceneSample(mini){
  let o=bg()+title("Walk or bike to school?","400 STUDENTS · MADE-UP DATA");
  const S=new Set(s.sample),sp=sampPct();
  // the true and sample bars
  const bx=400,bw=210;
  [["EVERYONE",TRUE,LIME,30],["SAMPLE",sp,BUTTER,62]].forEach(([l,v,c,y])=>{
    o+=`<text class="t-lab" x="${bx-10}" y="${y+6}" text-anchor="end">${l}</text><rect x="${bx}" y="${y-7}" width="${bw}" height="16" rx="8" fill="${TINT}" fill-opacity=".45" stroke="${FG.deep(TINT)}" stroke-width="1"/><rect x="${bx}" y="${y-7}" width="${Math.max(8,bw*v/100)}" height="16" rx="8" fill="${c}"/><text class="t-ink" x="${bx+Math.max(8,bw*v/100)+6}" y="${y+5}" style="font-weight:700">${pc(v)}%</text>`});
  // the town: a frosted lavender board with the 400 students on it
  o+=FG.acrylic(gx(0)-14,gy(0)-14,gx(COLS-1)-gx(0)+28,gy(ROWS-1)-gy(0)+28,{tint:TINT,d:10,r:16,balls:false,shadowLen:36,opacity:.22});
  o+=`<rect x="${gx(0)-8}" y="${gy(0)-8}" width="${gx(COLS-1)-gx(0)+16}" height="${gy(ROWS-1)-gy(0)+16}" rx="12" fill="#fff" fill-opacity=".72"/>`;
  POP.forEach(p=>{const inS=S.has(p.i),x=gx(p.c),y=gy(p.row);
    o+=`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${inS?6.6:5.4}" fill="${p.act?LIME:PAL.steel}" fill-opacity="${inS?1:.5}"${inS?` stroke="var(--ink)" stroke-width="2"`:""}/>`});
  // school and bus stop
  // the school: a painted block with a pitched roof and a flag; the bus stop: a steel post and a sign
  {const sx=46,sy=gy(7);o+=FG.box(sx-22,sy-6,40,28,{colour:PAL.case.blush,kind:"painted",d:8,r:2,shadowLen:22});
    o+=`<path d="M${sx-25},${sy-6} L${sx-2},${sy-24} L${sx+21},${sy-6}z" fill="${PINKP}" stroke="${DPINK}" stroke-width="1.4" stroke-linejoin="round"/><path d="M${sx-2},${sy-24} l8,-4.4 l23,18 l-8,4.4z" fill="#C95A79" stroke="${DPINK}" stroke-width="1.2" stroke-linejoin="round"/>`;
    o+=`<rect x="${sx-8}" y="${sy+6}" width="12" height="16" fill="#fff" stroke="${DPINK}" stroke-width="1.2"/><path d="M${sx-2},${sy-24} V${sy-40}" stroke="${AX}" stroke-width="1.8"/><path d="M${sx-2},${sy-40} l12,4 l-12,4z" fill="${BUTTER}" stroke="#B08A10" stroke-width="1"/><text class="t-lab" x="${sx}" y="${sy+42}" text-anchor="middle">SCHOOL</text>`}
  {const bx2=gx(COLS-1)+40,by2=gy(STOP.row);o+=FG.cyl(bx2,by2-30,2.2,56,{colour:PAL.steel,kind:"metal",shadowLen:20});
    o+=FG.box(bx2-13,by2-40,26,20,{colour:BLUE,kind:"painted",d:5,r:5,stroke:DBLUE,shadow:false})+`<text x="${bx2}" y="${by2-26}" text-anchor="middle" style="font:700 11px var(--as-font);fill:var(--ink)">BUS</text>`}
  if(s.method==="friends")o+=`<g transform="translate(${gx(YOU.c)},${gy(YOU.row)})"><circle r="11" fill="none" stroke="${DPINK}" stroke-width="3"/><text class="t-lab" y="-16" text-anchor="middle" style="fill:${DPINK}">YOU</text></g>`;
  if(!mini){const ly=gy(ROWS-1)+36;o+=`<circle cx="${gx(0)}" cy="${ly}" r="6" fill="${LIME}"/><text class="t-lab" x="${gx(0)+12}" y="${ly+4}">WALKS OR BIKES</text><circle cx="${gx(9)}" cy="${ly}" r="6" fill="${PAL.steel}"/><text class="t-lab" x="${gx(9)+12}" y="${ly+4}">BUS OR CAR</text><circle cx="${gx(16)}" cy="${ly}" r="6.4" fill="var(--paper)" stroke="var(--ink)" stroke-width="2"/><text class="t-lab" x="${gx(16)+12}" y="${ly+4}">ASKED</text>`}
  return o}

// ---------- 6 · counts or rates?
function sceneRates(mini){
  let o=bg()+title("Which town is riskier for cyclists?","CYCLING INJURIES IN ONE YEAR · MADE-UP DATA");
  ["A","B"].forEach((k,i)=>{const t=TOWNS[k],x=18+i*312,w=292,picked=s.pick===k;
    // each town is a frosted lavender case standing on the floor (the case is the tap target)
    o+=`<g data-hit="pick" data-v="${k}">`+FG.acrylic(x,70,w-10,304,{tint:TINT,d:10,r:22,balls:false,shadowLen:34,opacity:.22})+`<rect x="${x}" y="70" width="${w-10}" height="304" rx="22" fill="#fff" fill-opacity=".55" stroke="${picked?"#D9A91C":"none"}" stroke-width="${picked?5:0}"/><rect x="${x}" y="70" width="${w}" height="304" rx="22" fill="transparent"/>`;
    o+=`<text class="t-big" x="${x+20}" y="104" style="font-size:19px">${t.nm}</text><text class="t-lab" x="${x+20}" y="124">${t.cyc.toLocaleString("en-NZ")} CYCLISTS</text>`;
    o+=`<rect x="${x+150}" y="96" width="${120}" height="12" rx="6" fill="#fff" stroke="${FG.deep(TINT)}" stroke-width="1"/><rect x="${x+150}" y="96" width="${120*t.cyc/4000}" height="12" rx="6" fill="${BLUE}"/>`;
    if(picked&&!mini)o+=pill(x+w-26,72,"your pick",BUTTER,"var(--ink)","end");
    if(s.view==="counts"){const cols=12,sz=13,gap=3,gw=cols*(sz+gap)-gap,gx0=x+(w-gw)/2;
      for(let n=0;n<t.inj;n++){const c=n%cols,r=Math.floor(n/cols);o+=`<rect x="${gx0+c*(sz+gap)}" y="${152+r*(sz+gap)}" width="${sz}" height="${sz}" rx="3.5" fill="${PINKP}"/><rect x="${gx0+c*(sz+gap)+2}" y="${152+r*(sz+gap)+2}" width="${sz*.38}" height="2.4" rx="1.2" fill="#fff" opacity=".55"/>`}
      o+=`<text x="${x+w/2}" y="346" text-anchor="middle" style="font:600 30px var(--as-display);fill:var(--ink)">${t.inj}</text><text class="t-lab" x="${x+w/2}" y="364" text-anchor="middle">INJURIES</text>`}
    else{const lit=Math.round(per1000(t)/10),gx0=x+(w-9*19)/2;   // 100 dots, each one 10 cyclists: the grid is 1000 cyclists
      if(!mini)o+=`<text class="t-lab" x="${x+w/2}" y="150" text-anchor="middle">1 DOT = 10 CYCLISTS</text>`;
      for(let n=0;n<100;n++){const c=n%10,r=Math.floor(n/10);o+=`<circle cx="${gx0+c*19}" cy="${168+r*15.6}" r="6.4" fill="${n<lit?PINKP:"#fff"}" stroke="${n<lit?DPINK:"#D6D0E6"}" stroke-width="1"/>`}
      o+=`<text x="${x+w/2}" y="346" text-anchor="middle" style="font:600 30px var(--as-display);fill:var(--ink)">${fh(per1000(t))}</text><text class="t-lab" x="${x+w/2}" y="364" text-anchor="middle">PER 1000 CYCLISTS</text>`}
    o+=`</g>`});
  return o}

// ---------- the case board for the test step
const lineOk=()=>s.line===F.med, axisOk=()=>s.axis===0, sampOk=()=>s.method==="random"&&s.n>=100&&Math.abs(sampPct()-TRUE)<=5, rateOk=()=>s.view==="rates"&&s.pick===SAFER;
function sceneTest(){
  let o=FG.floor(W,H);
  [[sceneRead,lineOk,"Median"],[sceneMislead,axisOk,"Fair graph"],[sceneSample,sampOk,"Good sample"],[sceneRates,rateOk,"Safer town"]].forEach(([f,ok,l],i)=>{
    const x=(i%2)*322,y=Math.floor(i/2)*197,done=ok();
    o+=`<g transform="translate(${x+2},${y+2}) scale(.49)"><g clip-path="url(#dd-cl)">${f(true)}</g></g>`;
    o+=`<rect x="${x+2}" y="${y+2}" width="${W*.49}" height="${H*.49}" rx="12" fill="none" stroke="${done?"var(--good)":"var(--line)"}" stroke-width="${done?3:1.5}"/>`;
    o+=`<g transform="translate(${x+W*.49-14},${y+18})"><circle r="15" fill="${done?"var(--good)":"var(--paper)"}" stroke="${done?"var(--good)":"var(--line)"}" stroke-width="2"/>${done?`<path d="M-6,0 l4,4 l8,-8" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`:`<text y="5" text-anchor="middle" style="font:600 14px var(--as-display);fill:var(--ink)">${i+1}</text>`}</g>`;
    o+=pill(x+12,y+H*.49-14,l,done?"var(--good)":"var(--ink)","#fff","start")});
  return `<defs><clipPath id="dd-cl"><rect width="${W}" height="${H}" rx="24"/></clipPath></defs>`+o}

function drawMain(st,step){return ({read:sceneRead,spread:sceneSpread,compare:sceneCompare,mislead:sceneMislead,sample:sceneSample,rates:sceneRates,test:sceneTest}[step.k]||sceneRead)(false)}

// ---------- steps
const MEDtxt=fh(F.med),A=TOWNS.A,B=TOWNS.B;
const steps=[
 {k:"read",lab:"Read it",cap:"Thirty Year 11s logged their school-day screen time. Drag the line and count who is below it.",
  controls:["line"],chips:["line","below","above"],
  exam:`Half of the 30 students spent less than ${MEDtxt} hours a day on screens on a school day, and half spent more.`,
  trap:"A stack's height is how many students; its position along the axis is how many hours.",
  big:"Read the title, the axis and the units before you read a single dot."},
 {k:"spread",lab:"Middle and spread",cap:"Watch the dots drop into a box plot, then switch each part on and off.",speed:1,
  controls:["replay","tMed","tBox","tWh","tOut"],chips:["med","iqr","range","out"],
  onStep:()=>{s.t=calmMQ()?1:0;s.playing=!calmMQ()},
  exam:`The median school-day screen time was ${MEDtxt} hours, and the middle half of students used screens for between ${fh(F.q1)} and ${fh(F.q3)} hours (IQR ${fh(F.iqr)} hours). One student's ${fh(F.out[0])} hours is unusually high, which stretches the range to ${fh(F.range)} hours.`,
  trap:"The median is the middle student's value, not the middle of the axis or the mean.",
  big:"Five numbers (minimum, Q1, median, Q3, maximum) sum up a whole pile of dots."},
 {k:"compare",lab:"Compare",cap:"Same students, school days vs weekends. Compare the middles, then the overlap.",
  controls:["tShade"],chips:["wdm","wem","shift","olap"],
  exam:`For these students, weekend screen time tends to be higher than school-day screen time: the median is ${fh(FW.med)} hours compared with ${fh(F.med)} hours. The weekend median is above the whole school-day box and the boxes overlap by only ${fh(OLAP)} hours, so the shift is clear.`,
  trap:"Don't write \"always higher\": some students use screens more on a school day than others do at the weekend.",
  big:"Look for shift (the medians) and overlap (the boxes) before you make a call."},
 {k:"mislead",lab:"Sneaky graphs",cap:"A newspaper drew this chart. Slide the axis start back to 0 and watch the gap shrink.",
  controls:["axis","tBrk"],chips:["axis","looks","really"],
  exam:`The vertical axis starts at 46%, not 0, so Kōwhai College's bar looks about ${looks(46).toFixed(0)} times taller, but ${SL[0].v}% is only ${really.toFixed(2)} times ${SL[1].v}%. The difference is small and the graph exaggerates it.`,
  trap:"Comparing bar heights without checking where the vertical axis starts.",
  big:"The same numbers can tell a different story depending on how they're drawn."},
 {k:"sample",lab:"Who did they ask?",cap:"400 students, and 38% walk or bike. Choose who to ask and see what your sample says.",
  controls:["method","n","resample"],chips:["method","n","samp","truth"],
  exam:"Asking friends or people at a bus stop isn't random: friends often live near each other and everyone at a bus stop is catching the bus, so these samples give a biased answer. A random sample of 100 or more is much more likely to be close to the true proportion.",
  trap:"A bigger sample doesn't fix a biased one: a thousand people at the bus stop still miss the walkers.",
  big:"Who you ask matters more than how many you ask."},
 {k:"rates",lab:"Counts or rates?",cap:"Town A has twice as many injuries. Is it riskier? Switch to rates and decide.",
  controls:["view","pick"],chips:["ra","rb","view"],
  exam:`Town A had more injuries (${A.inj} vs ${B.inj}), but it also had ${A.cyc/B.cyc} times as many cyclists. Per 1000 cyclists, Town A had ${fh(per1000(A))} injuries and Town B had ${fh(per1000(B))}, so a cyclist was less likely to be hurt in Town A.`,
  trap:"Comparing raw counts when the groups are different sizes.",
  big:"Rates (per 100, per 1000) let you compare groups of different sizes fairly."},
 {k:"test",lab:"Test yourself",cap:"Four cases on the board. Use the controls to crack each one.",
  controls:["line","axis","method","n","resample","view","pick"],chips:["solved"],
  exam:"Back every judgement with a number from the data and a reason about how the data were collected or drawn.",
  big:"Read it, sum it up, compare it, then question it."}];

const pct=(n,d)=>Math.round(n/d*100);
const s2=v=>v===1?"":"s";
const api=K.mount({
  eyebrow:"Maths and stats · Data", title:"The data detective", crumb:"NCEA Level 1 Mathematics and Statistics · interpreting data", homeHash:"l1",
  fig:"CASE FILE", railTitle:"Read it, sum it up, question it",
  badge:{label:"NCEA L1 Maths 91946",exam:"2026-11-10T09:30:00+13:00",examText:"Tue 10 Nov, 9:30am"},
  mainBox:`0 0 ${W} ${H}`, mainPhoneBig:true, mainLabel:"Interactive graphs of made-up survey data",
  state:s, steps,
  controls:[
    {type:"range",id:"line",label:"Line",min:0,max:12,step:0.25,get:()=>s.line,set:(x,v)=>{s.line=v},fmt:()=>fh(s.line)+" h"},
    {type:"button",id:"replay",label:"Drop the dots again",onClick:()=>{s.t=0;s.playing=!calmMQ();if(calmMQ())s.t=1}},
    {type:"toggle",id:"tMed",label:"Median",get:()=>s.med,set:(x,v)=>{s.med=v}},
    {type:"toggle",id:"tBox",label:"Middle half (IQR)",get:()=>s.box,set:(x,v)=>{s.box=v}},
    {type:"toggle",id:"tWh",label:"Range",get:()=>s.wh,set:(x,v)=>{s.wh=v}},
    {type:"toggle",id:"tOut",label:"Outlier",get:()=>s.out,set:(x,v)=>{s.out=v}},
    {type:"toggle",id:"tShade",label:"Medians and overlap",get:()=>s.shade,set:(x,v)=>{s.shade=v}},
    {type:"range",id:"axis",label:"Axis starts at",min:0,max:47,step:1,get:()=>s.axis,set:(x,v)=>{s.axis=v},fmt:()=>s.axis+"%"},
    {type:"toggle",id:"tBrk",label:"Show the axis break",get:()=>s.brk,set:(x,v)=>{s.brk=v}},
    {type:"select",id:"method",label:"Ask",options:METHODS,get:()=>s.method,set:(x,v)=>{s.method=v;takeSample()}},
    {type:"range",id:"n",label:"Random sample",min:10,max:200,step:10,get:()=>s.n,set:(x,v)=>{s.n=v;if(s.method==="random")takeSample()},fmt:()=>String(s.n)},
    {type:"button",id:"resample",label:"Take a new sample",onClick:()=>{s.seed++;takeSample()}},
    {type:"select",id:"view",label:"Show",options:[["counts","Counts"],["rates","Rates per 1000"]],get:()=>s.view,set:(x,v)=>{s.view=v}},
    {type:"select",id:"pick",label:"Less risky",options:[["","Choose a town"],["A","Town A"],["B","Town B"]],get:()=>s.pick,set:(x,v)=>{s.pick=v}}],
  tick:(x,dt)=>{s.t=Math.min(1,s.t+dt*.75);if(s.t>=1)s.playing=false},
  drawMain:(x,st)=>drawMain(x,st),
  chips:()=>{const b=below(s.line),o=onL(s.line),sp=sampPct();return{
    line:["Line at",fh(s.line)+" h"],below:["Below the line",`${b} of 30 · ${pct(b,30)}%`,b===15&&o===0],above:["Above the line",`${30-b-o} of 30${o?` · ${o} on it`:""}`],
    med:["Median",fh(F.med)+" h",true],iqr:["IQR",`${fh(F.iqr)} h (${fh(F.q1)} to ${fh(F.q3)})`],range:["Range",fh(F.range)+" h"],out:["Outlier",fh(F.out[0])+" h"],
    wdm:["School-day median",fh(F.med)+" h"],wem:["Weekend median",fh(FW.med)+" h"],shift:["Shift",`+${fh(FW.med-F.med)} h`,true],olap:["Box overlap",fh(OLAP)+" h"],
    axis:["Axis starts at",s.axis+"%",s.axis>0],looks:["Bars look",looks(s.axis).toFixed(1)+"× taller",looks(s.axis)>1.25],really:["Really",really.toFixed(2)+"×"],
    method:["Asked",mName(s.method)],n:["People asked",String(s.sample.length)],samp:["Sample says",pc(sp)+"%",Math.abs(sp-TRUE)<=5],truth:["Truth",pc(TRUE)+"%"],
    ra:["Town A",`${fh(per1000(A))} per 1000`,s.view==="rates"],rb:["Town B",`${fh(per1000(B))} per 1000`,s.view==="rates"],view:["Showing",s.view==="rates"?"Rates":"Counts"],
    solved:["Cases solved",`${[lineOk(),axisOk(),sampOk(),rateOk()].filter(Boolean).length} of 4`]}},
  challenges:[
    {q:"Move the line to the median, so exactly half the students are below it.",check:lineOk,ok:`Yes: ${MEDtxt} hours. 15 students are below it and 15 above.`,
      no:()=>{const b=below(s.line);return b<15?`Only ${b} are below ${fh(s.line)} h. Move the line right.`:b>15?`${b} are below ${fh(s.line)} h. Move it left.`:`15 are below, but ${onL(s.line)} sit on the line. Nudge it a quarter-hour.`}},
    {q:"Make the newspaper's bar chart fair.",check:axisOk,ok:"Fair: with the axis at 0, 52% and 48% look almost the same, because they are.",no:()=>`The axis still starts at ${s.axis}%. Slide it down to 0.`},
    {q:"Take a random sample of at least 100 students that lands within 5 points of the true 38%.",check:sampOk,ok:()=>`Nice: ${pc(sampPct())}% from ${s.sample.length} random students.`,
      no:()=>s.method!=="random"?`${{friends:"Asking your friends",online:"An online poll",bus:"Asking at the bus stop"}[s.method]} isn't a random sample. Switch to Random.`:s.n<100?`Only ${s.n} students. Ask at least 100.`:`${pc(sampPct())}% this time. Take a new sample: random samples wobble.`},
    {q:"Show the rates and pick the town where a cyclist is less likely to be hurt.",check:rateOk,ok:`Yes: Town A has ${fh(per1000(A))} injuries per 1000 cyclists, Town B has ${fh(per1000(B))}.`,
      no:()=>s.view!=="rates"?"Switch the view to rates first.":s.pick?"Look again at the rate per 1000, not the pile of injuries.":"Pick a town."}],
  papers:[{label:"NZQA: Mathematics and Statistics",url:"https://www2.nzqa.govt.nz/ncea/subjects/past-exams-and-exemplars/mathematics-and-statistics/"}],
  truth:"Every number here is made up: the Kōwhai College screen-time survey, the two schools' sleep figures, the 400 students on the map and the two towns' cycling injuries. Quartiles use the medians of the lower and upper halves; outliers are more than 1.5 × IQR beyond the box. Your teacher may use a slightly different quartile method.",
  footer:"Covers AS 91946: extracting information from unseen graphs and tables, explaining variation, comparing groups, critiquing misleading graphs and biased samples, and using rates to make informed judgements."
});

// drag the reading line, or tap a town, right on the drawing
const svg=document.getElementById("k-main");let drag=false;
const toLine=e=>{try{const pt=svg.createSVGPoint();pt.x=e.clientX;pt.y=e.clientY;const p=pt.matrixTransform(svg.getScreenCTM().inverse());
  const v=clamp(Math.round((p.x-X0)/SC*4)/4,0,12);if(v!==s.line){s.line=v;K.sfx("tick");api.redraw()}}catch(err){}};
svg.addEventListener("pointerdown",e=>{const h=e.target.closest&&e.target.closest("[data-hit]");if(!h)return;
  if(h.dataset.hit==="axis"&&api.step.k==="read"){drag=true;try{svg.setPointerCapture(e.pointerId)}catch(err){}toLine(e);e.preventDefault()}
  else if(h.dataset.hit==="pick"&&api.step.k==="rates"){s.pick=h.dataset.v;K.sfx("pop");api.redraw()}});
svg.addEventListener("pointermove",e=>{if(drag)toLine(e)});
["pointerup","pointercancel","lostpointercapture"].forEach(ev=>svg.addEventListener(ev,()=>{drag=false}));
try{matchMedia("(max-width:820px)").addEventListener("change",()=>api.redraw())}catch(e){}
})();
