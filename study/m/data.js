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
// ---------- the 3D bench: the case file as four evidence tables. Survey answers are real beads that stack, drop into a box plot
// and line up for a comparison; the newspaper chart has a false floor you can drag down; the town is 400 little figures you
// can sample; the two towns' injuries are piles of blocks that turn into rates per 1000 cyclists.
function data3d(S){const {THREE,mat,PAL:P}=S;const V3=(x,y,z)=>new THREE.Vector3(x,y,z);const PT=.3;
  const ZR=V3(0,0,0),ZM=V3(-11.5,0,-.6),ZN=V3(11.5,0,-.6),ZT=V3(0,0,-15);
  const plinth=(c,w,d,tint)=>{const p=S.rbox(w,.3,d,.12,mat("plastic",tint,{rough:.55,coat:.2}));p.position.set(c.x,.15,c.z);S.scene.add(p);return p};
  const BLUEc=P.product.blueberry,PINKc=P.product.strawberry,DB="#3F6FB0",DP="#B5466F";const hitM=new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false});
  // ---------------------------------------------------------------- survey bench: the 0–12 h axis, bead stacks, box plots
  plinth(ZR,10.4,5.2,P.case.lavender);const sv=S.group();sv.position.set(ZR.x,PT,ZR.z);
  const SC=.68,hx=h=>(h-6)*SC,BR=.14,ROWZ=-.35;
  sv.add(S.rbox(9.4,.06,3.6,.04,mat("plastic","#ffffff",{rough:.5}),{at:[0,.03,-.3]}));
  sv.add(S.cyl(.035,.035,9,mat("metal"),{rot:[0,0,Math.PI/2],at:[0,.1,1.62],seg:12}));
  const axP=S.panel(1024,120,9.2);axP.rotation.x=-Math.PI/2;axP.position.set(0,.065,1.95);sv.add(axP);
  axP.redraw((g,w,h)=>{const X=v=>w/2+(v-6)*SC/9.2*w;g.fillStyle="#6E6A86";g.strokeStyle="#8F9BAA";g.lineWidth=3;g.font="600 30px 'Instrument Sans',system-ui";g.textAlign="center";
    for(let v=0;v<=12;v++){g.beginPath();g.moveTo(X(v),0);g.lineTo(X(v),18);g.stroke();g.fillText(v,X(v),52)}g.font="600 22px 'Instrument Sans',system-ui";g.textAlign="right";g.fillText("HOURS A DAY",w-16,100)});
  const beadGeo=new THREE.SphereGeometry(BR,20,14);
  const beads=S.swarm(30,beadGeo,mat("plastic","#ffffff",{rough:.3}),{colors:true,cast:true});beads.castShadow=true;sv.add(beads);
  const beadsW=S.swarm(30,beadGeo,mat("plastic","#ffffff",{rough:.3}),{colors:true}),beadsE=S.swarm(30,beadGeo,mat("plastic","#ffffff",{rough:.3}),{colors:true});sv.add(beadsW,beadsE);
  const STW=stacks(WD),STE=stacks(FW.a);
  // the reading line: a frosted blade with a knob on top that you drag along the axis
  const blade=S.group(sv);blade.add(S.box(.03,2.2,3.2,mat("acrylic",P.ink,{opacity:.14}),{at:[0,1.1,-.3],cast:false}));blade.add(S.box(.05,.05,3.2,mat("plastic",P.ink,{rough:.3}),{at:[0,2.2,-.3]}));
  const knob=S.sphere(.16,mat("plastic",P.product.butter,{rough:.3}),{at:[0,2.3,-.3]});knob.add(S.mesh(new THREE.SphereGeometry(.4,10,8),hitM,{cast:false}));blade.add(knob);
  const shadeB=S.mesh(new THREE.BoxGeometry(1,1,1),mat("flat",BLUEc,{opacity:.22,depthWrite:false}),{cast:false});shadeB.renderOrder=2;sv.add(shadeB);
  S.dragger(knob,{normal:V3(0,0,1),move:p=>{const q=sv.worldToLocal(p.clone());S.api.state.line=S.clamp(Math.round((q.x/SC+6)*4)/4,0,12)}});
  S.dragger(blade.children[0],{normal:V3(0,0,1),move:p=>{const q=sv.worldToLocal(p.clone());S.api.state.line=S.clamp(Math.round((q.x/SC+6)*4)/4,0,12)}});
  function boxPlot(col,deep){const g=S.group(sv);
    const box=S.rbox(1,1,1,.06,mat("acrylic",col,{opacity:.32}),{cast:false});box.renderOrder=3;g.add(box);
    const top=S.rbox(1,.04,1,.02,mat("plastic",col,{rough:.35}));g.add(top);
    const med=S.rbox(.09,1,1,.03,mat("plastic",PINKc,{rough:.3}));g.add(med);
    const wL=S.cyl(.03,.03,1,mat("plastic",P.ink,{rough:.4}),{rot:[0,0,Math.PI/2],seg:10}),wR=wL.clone();g.add(wL,wR);
    const cL=S.box(.04,.04,.5,mat("plastic",P.ink,{rough:.4})),cR=cL.clone();g.add(cL,cR);
    g.set=(f,z,o,a)=>{g.visible=a>.01;const H=.55*a,D=.95;const x1=hx(f.q1),x3=hx(f.q3),wHi=o.out?f.wHi:f.max,wLo=o.out?f.wLo:f.min;
      box.visible=top.visible=!!o.box;box.scale.set(x3-x1,Math.max(.01,H),D);box.position.set((x1+x3)/2,H/2+.06,z);top.scale.set(x3-x1,1,D);top.position.set((x1+x3)/2,H+.08,z);
      med.visible=!!o.med;med.scale.set(1,Math.max(.01,H+.25*a),D+.15);med.position.set(hx(f.med),(H+.25*a)/2+.06,z);
      const wy=.06+H/2;wL.visible=wR.visible=cL.visible=cR.visible=!!o.wh;
      if(o.box){const l1=x1-hx(wLo),l2=hx(wHi)-x3;wL.scale.set(1,Math.max(.001,l1),1);wL.position.set(hx(wLo)+l1/2,wy,z);wR.scale.set(1,Math.max(.001,l2),1);wR.position.set(x3+l2/2,wy,z)}
      else{const l=hx(wHi)-hx(wLo);wL.scale.set(1,l,1);wL.position.set((hx(wLo)+hx(wHi))/2,wy,z);wR.visible=false}
      cL.position.set(hx(wLo),wy,z);cR.position.set(hx(wHi),wy,z);cL.scale.y=cR.scale.y=Math.max(.01,a)};return g}
  const bpW=boxPlot(BLUEc,DB),bpE=boxPlot(PINKc,DP);
  const olap=S.mesh(new THREE.BoxGeometry(1,1,1),mat("flat",P.product.butter,{opacity:.3,depthWrite:false}),{cast:false});olap.renderOrder=2;sv.add(olap);
  const medLines=[0,1].map(()=>{const m=S.mesh(new THREE.BoxGeometry(1,1,1),mat("plastic",DP,{rough:.4}),{cast:false});sv.add(m);return m});
  const shift=S.arrow(P.ink);sv.add(shift);
  const lLine=S.label({cls:"big",off:[0,-30],lead:false}),lBelow=S.label({cls:"hot",off:[-24,30]}),lAbove=S.label({off:[24,30]}),lMed=S.label({off:[0,-38],cls:"hot"}),lQ1=S.label({off:[-16,34]}),lQ3=S.label({off:[16,34]}),
    lIqr=S.label({off:[30,-26]}),lRange=S.label({off:[0,40]}),lOut=S.label({off:[10,-34]}),lRowW=S.label({off:[-30,-10]}),lRowE=S.label({off:[-30,-10]}),lOlap=S.label({off:[0,-40],cls:"hot"}),lShift=S.label({off:[22,-24]}),lTitleR=S.label({off:[0,-20],lead:false});
  lBelow.el.style.setProperty("--acc",DB);lRowE.el.style.setProperty("--acc",DP);

  // ---------------------------------------------------------------- the newspaper chart: true-height bars, a false floor at the axis start
  plinth(ZM,6.8,5.2,P.case.butter);const nm=S.group();nm.position.set(ZM.x,PT,ZM.z);
  const BH=v=>v/TOP*3.4;
  const bars=SL.map((d,i)=>{const b=S.rbox(1.05,1,1.05,.08,mat("plastic",d.c,{rough:.35}));b.position.x=-1.0+i*1.7;b.scale.y=BH(d.v);b.position.y=BH(d.v)/2;nm.add(b);return b});
  const floor=S.group(nm);const fl=S.rbox(4.4,.07,2.6,.03,mat("acrylic",P.case.lavender,{opacity:.5}),{cast:false});fl.renderOrder=4;floor.add(fl);
  
  const fHandle=S.sphere(.15,mat("plastic","#D2557A",{rough:.3}),{at:[2.35,0,.9]});fHandle.add(S.mesh(new THREE.SphereGeometry(.42,10,8),hitM,{cast:false}));floor.add(fHandle);
  S.dragger(fHandle,{normal:V3(0,0,1),move:p=>{const q=nm.worldToLocal(p.clone());S.api.state.axis=S.clamp(Math.round(q.y/3.4*TOP),0,47)}});
  S.dragger(fl,{normal:V3(0,0,1),move:p=>{const q=nm.worldToLocal(p.clone());S.api.state.axis=S.clamp(Math.round(q.y/3.4*TOP),0,47)}});
  const scale=S.panel(220,700,.66);scale.position.set(-2.35,3.6/2+.02,0);nm.add(scale);nm.add(S.rbox(.74,3.75,.06,.03,mat("plastic","#ffffff",{rough:.4}),{at:[-2.35,1.82,-.05]}));let scKey="";
  const gauge=S.panel(400,420,1.5);gauge.position.set(2.75,1.6,-.6);gauge.rotation.y=-.35;nm.add(gauge);nm.add(S.cyl(.04,.06,.9,mat("metal"),{at:[2.75,.45,-.66]}));let gKey="";
  const lBarA=S.label({off:[0,-30]}),lBarB=S.label({off:[0,-30]}),lAxis=S.label({cls:"hot",off:[30,20]}),lTrick=S.label({off:[0,-26],lead:false});

  // ---------------------------------------------------------------- the town: 400 figures, school on the left, bus stop on the right
  plinth(ZN,9.6,6.6,P.case.mint);const tn=S.group();tn.position.set(ZN.x,PT,ZN.z);const GS=.3,gxp=c=>(c-(COLS-1)/2)*GS+.35,gzp=r=>(r-(ROWS-1)/2)*GS+.35;
  tn.add(S.rbox(8.1,.05,5.4,.04,mat("plastic","#ffffff",{rough:.5}),{at:[.35,.025,.35]}));
  const body=S.swarm(400,new THREE.CapsuleGeometry(.055,.1,4,10),mat("plastic","#ffffff",{rough:.4}),{colors:true,cast:true}),head=S.swarm(400,new THREE.SphereGeometry(.055,12,8),mat("plastic","#ffffff",{rough:.3}),{colors:true});
  body.castShadow=true;tn.add(body,head);const rings=S.swarm(200,new THREE.TorusGeometry(.11,.02,6,20),mat("plastic",P.ink,{rough:.4}));tn.add(rings);
  {const sch=S.group(tn);sch.position.set(gxp(0)-.75,0,gzp(7));sch.add(S.rbox(.6,.45,.7,.04,mat("plastic",P.case.blush,{rough:.4}),{at:[0,.25,0]}));
    const roof=S.mesh(new THREE.CylinderGeometry(.45,.45,.78,3,1),mat("plastic",PINKc,{rough:.4}),{rot:[Math.PI/2,0,Math.PI/2],at:[0,.6,0]});roof.scale.set(1,1,.6);sch.add(roof);
    sch.add(S.cyl(.012,.012,.5,mat("metal"),{at:[.1,.95,0]}));sch.add(S.box(.18,.1,.01,mat("plastic",P.product.butter),{at:[.19,1.14,0]}));sch.add(S.box(.14,.22,.02,mat("plastic","#ffffff"),{at:[0,.14,.36]}))}
  {const bs=S.group(tn);bs.position.set(gxp(COLS-1)+.6,0,gzp(STOP.row));bs.add(S.cyl(.03,.03,.9,mat("metal"),{at:[0,.45,0]}));bs.add(S.rbox(.3,.22,.04,.04,mat("plastic",BLUEc,{rough:.35}),{at:[0,.85,0]}));
    bs.add(S.rbox(.7,.04,.2,.02,mat("plastic","#ffffff"),{at:[-.3,.2,.3]}))}
  const you=S.torus(.17,.035,mat("glow",DP,1),{rot:[Math.PI/2,0,0],cast:false});tn.add(you);
  const gaugeBar=(z,col)=>{const g=S.group(tn);g.position.set(.35,.25,-2.55+z);g.add(S.cyl(.12,.12,4,mat("glass","#ffffff",{opacity:.22}),{rot:[0,0,Math.PI/2],cast:false}));
    const fillM=mat("plastic",col,{rough:.3});const fill=S.cyl(.1,.1,1,fillM,{rot:[0,0,Math.PI/2]});g.add(fill);return {g,fill}};
  const gTrue=gaugeBar(-.35,P.product.lime),gSamp=gaugeBar(0,P.product.butter);
  const die=S.rbox(.36,.36,.36,.07,mat("plastic","#ffffff",{rough:.3}),{at:[-3.7,.18,-2.7]});tn.add(die);
  for(const [x,y,z] of [[0,.181,0],[.09,.181,.09],[-.09,.181,-.09],[.181,.09,0],[.181,-.09,0],[0,0,.181]])die.add(S.sphere(.03,mat("plastic",P.ink),{at:[x,y,z],seg:10}));
  S.pick(die,()=>{const st=S.api.state;st.seed++;takeSample()});
  let sampKey="",hop=9;const lTrue=S.label({off:[-20,-22]}),lSamp=S.label({off:[-20,22],cls:"hot"}),lYou=S.label({off:[0,-26]}),lDie=S.label({off:[0,-26]}).set("Tap: new sample"),lHow=S.label({off:[0,30],lead:false});

  // ---------------------------------------------------------------- two towns: injury blocks (counts) or 1000 cyclists as 100 figures (rates)
  plinth(ZT,9.6,5.2,P.case.sky);const towns={};
  ["A","B"].forEach((k,i)=>{const g=S.group();g.position.set(ZT.x-2.4+i*4.8,PT,ZT.z);const cs=S.acrylicCase(3.9,2.3,3.4,P.case.lavender,{opacity:.14});g.add(cs);
    const base=S.rbox(3.8,.06,3.3,.03,mat("plastic","#ffffff",{rough:.5}),{at:[0,.03,0]});g.add(base);
    const bar=S.rbox(1,.12,.16,.05,mat("plastic",BLUEc,{rough:.35}));const L=2.8*TOWNS[k].cyc/4000;bar.scale.x=L;bar.position.set(-1.4+L/2,.12,1.45);g.add(bar);
    const glowM=mat("glow",P.product.butter,1.2);const frame=S.group(g);for(const [x,z,w,d] of [[0,1.72,4,.06],[0,-1.72,4,.06],[1.97,0,.06,3.5],[-1.97,0,.06,3.5]])frame.add(S.box(w,.06,d,glowM,{at:[x,.05,z],cast:false}));
    const blocks=S.swarm(120,new S.RoundedBoxGeometry(.22,.22,.22,2,.04),mat("plastic",PINKc,{rough:.35}),{cast:true});blocks.castShadow=true;g.add(blocks);
    const ppl=S.swarm(100,new THREE.CapsuleGeometry(.06,.12,4,10),mat("plastic","#ffffff",{rough:.4}),{colors:true,cast:true}),hd=S.swarm(100,new THREE.SphereGeometry(.06,12,8),mat("plastic","#ffffff",{rough:.3}));ppl.castShadow=true;g.add(ppl,hd);
    S.pick(cs.userData.body,()=>{S.api.state.pick=k});S.pick(base,()=>{S.api.state.pick=k});S.scene.add(g);
    towns[k]={g,frame,blocks,ppl,hd,mix:0,lab:S.label({off:[0,-30]}),num:S.label({cls:"big",off:[0,30]}),cyc:S.label({off:[0,26]})}});
  const lPick=S.label({cls:"hot",off:[0,-30]});

  // ---------------------------------------------------------------- views
  S.view("read",[ZR.x,5.0,ZR.z+7.2],[ZR.x,.7,ZR.z-.3],{min:3,max:26});
  S.view("compare",[ZR.x,6.4,ZR.z+8.2],[ZR.x,.4,ZR.z-.3],{min:3,max:26});
  S.view("news",[ZM.x-.2,3.5,ZM.z+6.2],[ZM.x+.1,3.0,ZM.z],{min:3,max:26,dur:1.4});
  S.view("reveal",[ZM.x+2.4,4.6,ZM.z+9.2],[ZM.x-.3,1.7,ZM.z],{min:3,max:26,dur:2.2});
  S.view("sample",[ZN.x+.2,8.8,ZN.z+7.8],[ZN.x+.2,.1,ZN.z+.1],{min:3,max:26});
  S.view("rates",[ZT.x,6.6,ZT.z+11.6],[ZT.x,.9,ZT.z],{min:3,max:26});
  S.view("all",[0,24,20],[0,0,-6],{min:6,max:70});
  const zoneOf=k=>k==="read"||k==="spread"?"read":k==="compare"?"compare":k==="mislead"?"news":k==="sample"?"sample":k==="rates"?"rates":"all";
  const CEN={read:ZR,compare:ZR,news:ZM,sample:ZN,rates:ZT,all:V3(0,0,-6)};
  const caseL=[1,2,3,4].map(()=>S.label({off:[0,-36],lead:false}));
  const ALL=[lLine,lBelow,lAbove,lMed,lQ1,lQ3,lIqr,lRange,lOut,lRowW,lRowE,lOlap,lShift,lTitleR,lBarA,lBarB,lAxis,lTrick,lTrue,lSamp,lYou,lDie,lHow,lPick,...caseL,...Object.values(towns).flatMap(T=>[T.lab,T.num,T.cyc])];
  let zone="read",since=0,revealed=false;S.goView("read",true);const tmp=V3(0,0,0),W2=(g,x,y,z)=>g.localToWorld(V3(x,y,z));
  return {
    step(st){zone=zoneOf(st.k);S.goView(zone);since=0;revealed=false;const c=CEN[zone];S.setShadowBox(zone==="all"?22:6.5,[c.x,0,c.z]);ALL.forEach(l=>l.hide())},
    update(s,st,dt,t){const k=st.k,test=k==="test";since+=dt;
      if(k==="mislead"&&!revealed&&since>(S.REDUCED?.5:4.2)){revealed=true;S.goView("reveal")}
      // ---- survey bench
      const mode=k==="spread"?"spread":k==="compare"?"compare":"read";const onR=zone==="read"||zone==="compare";
      const e=mode==="spread"?(s.t<.5?2*s.t*s.t:1-Math.pow(-2*s.t+2,2)/2):mode==="compare"?1:0,a=mode==="spread"?S.clamp((s.t-.5)/.5,0,1):0;
      beads.visible=mode!=="compare";beadsW.visible=beadsE.visible=mode==="compare";
      if(mode!=="compare"){STW.forEach(({v,j},i)=>{const isOut=s.out&&F.out.includes(v),b=v<s.line,on=v===s.line;
        const y0=BR+.06+j*2*BR,z1=ROWZ+(j%2?1:-1)*Math.ceil(j/2)*.13,sc=1-.35*e,y1=.06+BR*.65;
        beads.put(i,hx(v),S.lerp(y0,y1,e)+Math.sin(e*Math.PI)*.4,S.lerp(ROWZ,z1,e),sc);
        beads.tint(i,mode==="spread"?(isOut&&a>0?PINKc:BLUEc):b?BLUEc:on?P.product.butter:"#F4F2F8")});beads.done()}
      else{[[STW,beadsW,BLUEc,-1.05],[STE,beadsE,PINKc,.55]].forEach(([stk,sw,c,z])=>{stk.forEach(({v,j},i)=>{sw.put(i,hx(v),.06+BR*.55,z+(j%2?1:-1)*Math.ceil(j/2)*.08,.55);sw.tint(i,c)});sw.done()})}
      blade.visible=mode==="read";blade.position.x=hx(s.line);shadeB.visible=mode==="read"&&s.line>0;shadeB.scale.set(Math.max(.01,hx(s.line)-hx(0)+.3),.01,3.2);shadeB.position.set((hx(0)-.3+hx(s.line))/2,.07,-.3);
      bpW.set(F,mode==="compare"?-1.05:ROWZ,mode==="compare"?{box:1,med:1,wh:1,out:1}:{box:s.box,med:s.med,wh:s.wh,out:s.out},mode==="compare"?1:a);bpE.set(FW,.55,{box:1,med:1,wh:1,out:1},mode==="compare"?1:0);
      const cmp=mode==="compare"&&s.shade;olap.visible=cmp&&OLAP>0;if(olap.visible){const x1=hx(Math.max(F.q1,FW.q1)),x2=hx(Math.min(F.q3,FW.q3));olap.scale.set(x2-x1,.9,2.8);olap.position.set((x1+x2)/2,.5,-.25)}
      medLines.forEach((m,i)=>{m.visible=cmp;const f=i?FW:F;m.scale.set(.03,.03,2.9);m.position.set(hx(f.med),.1,-.25)});
      shift.visible=false;if(cmp)shift.set(V3(hx(F.med),1.1,-.25),V3(hx(FW.med)-hx(F.med),0,0),1);
      const b=below(s.line),o=onL(s.line);
      lLine.show(onR&&mode==="read").at(W2(sv,hx(s.line),2.45,-.3)).set(`<b>${fh(s.line)} h</b>`);
      lBelow.show(onR&&mode==="read").at(W2(sv,hx(Math.max(0,s.line-1)),.1,1)).set(`<b>← ${b} below</b>`);lAbove.show(onR&&mode==="read").at(W2(sv,hx(Math.min(12,s.line+1)),.1,1)).set(`<b>${30-b-o} above →</b>`);
      const sa=mode==="spread"&&a>.05&&onR;
      lMed.show(sa&&s.med).at(W2(sv,hx(F.med),.9,ROWZ)).set(`median <b>${fh(F.med)} h</b>`);lQ1.show(sa&&s.box).at(W2(sv,hx(F.q1),.06,ROWZ+.5)).set(`Q1 ${fh(F.q1)}`);lQ3.show(sa&&s.box).at(W2(sv,hx(F.q3),.06,ROWZ+.5)).set(`Q3 ${fh(F.q3)}`);
      lIqr.show(sa&&s.box).at(W2(sv,hx(F.q3),.65,ROWZ-.4)).set(`middle half<b>IQR ${fh(F.iqr)} h</b>`);lRange.show(sa&&s.wh).at(W2(sv,hx((F.min+F.max)/2),.1,1.2)).set(`range <b>${fh(F.range)} h</b>`);
      lOut.show(sa&&s.out&&F.out.length>0).at(W2(sv,hx(F.out[0]),.3,ROWZ)).set(`${fh(F.out[0])} h · unusual`);
      lTitleR.show(onR&&mode==="read").at(W2(sv,0,.1,-2.2)).set(mode==="read"?"Hours on screens on a school day<small>30 Year 11s · Kōwhai College · made-up data</small>":"From dots to a box plot<small>same 30 students · school days · made-up data</small>");
      lRowW.show(mode==="compare"&&onR).at(W2(sv,hx(0),.2,-1.05)).set(`School day<small>median ${fh(F.med)} h</small>`);lRowE.show(mode==="compare"&&onR).at(W2(sv,hx(0),.2,.55)).set(`Weekend<small>median ${fh(FW.med)} h</small>`);
      lOlap.show(cmp&&OLAP>0&&onR).at(W2(sv,hx((Math.max(F.q1,FW.q1)+Math.min(F.q3,FW.q3))/2),.95,-1.6)).set(`boxes overlap <b>${fh(OLAP)} h</b>`);lShift.show(cmp&&onR).at(W2(sv,hx(FW.med),1.1,-.25)).set(`<b>+${fh(FW.med-F.med)} h</b>`);
      // ---- newspaper chart
      const ax=s.axis,fy=BH(ax);floor.position.y=S.lerp(floor.position.y,fy,S.REDUCED?1:.15);fl.visible=true;
      const sk=ax+"|"+s.brk;if(sk!==scKey){scKey=sk;scale.redraw((g,w,h)=>{g.fillStyle="#fff";g.fillRect(0,0,w,h);const Y=v=>h-(v/TOP)*(h*3.4/3.6)-6;
        g.fillStyle="rgba(143,155,170,.18)";g.fillRect(0,Y(ax),w,h-Y(ax));g.strokeStyle="#8F9BAA";g.lineWidth=4;g.beginPath();g.moveTo(w-30,Y(TOP));g.lineTo(w-30,Y(ax));g.stroke();
        g.font="600 34px 'Instrument Sans',system-ui";g.textAlign="right";g.fillStyle="#222A55";
        for(let v=Math.ceil((ax+.001)/5)*5;v<=TOP;v+=5){g.fillRect(w-46,Y(v)-2,16,4);g.fillText(v+"%",w-54,Y(v)+12)}
        g.fillStyle=ax>0?"#C2410C":"#222A55";g.font="700 36px 'Instrument Sans',system-ui";g.fillText(ax+"%",w-54,Y(ax)+12);
        if(ax>0&&s.brk){g.strokeStyle="#C2410C";g.lineWidth=5;g.beginPath();for(const dy of [36,52]){g.moveTo(w-46,Y(ax)-dy+8);g.lineTo(w-30,Y(ax)-dy);g.lineTo(w-14,Y(ax)-dy+8)}g.stroke()}})}
      const L=looks(ax),gk=L.toFixed(2);if(gk!==gKey){gKey=gk;gauge.redraw((g,w,h)=>{g.fillStyle="#fff";g.beginPath();g.roundRect(4,4,w-8,h-8,30);g.fill();g.strokeStyle="#D9CBF2";g.lineWidth=4;g.stroke();
        g.fillStyle="#6E6A86";g.font="600 26px 'Instrument Sans',system-ui";g.fillText("BARS LOOK",36,70);g.fillText("REALLY",36,232);
        g.font="600 86px 'Instrument Sans',system-ui";g.fillStyle=L>1.25?"#C2410C":"#222A55";g.fillText(L.toFixed(L<10?1:0)+"×",36,160);g.fillStyle="#2A7D63";g.fillText(really.toFixed(2)+"×",36,322);
        g.fillStyle="#6E6A86";g.font="600 26px 'Instrument Sans',system-ui";g.fillText("52 ÷ 48",36,376)})}
      const onM=zone==="news"||zone==="reveal";
      bars.forEach((bb,i)=>{const lab=i?lBarB:lBarA;lab.show(onM||test).at(W2(nm,bb.position.x,BH(SL[i].v)+.05,0)).set(`${SL[i].nm}<b>${SL[i].v}%</b>`)});
      lAxis.show(onM&&ax>0).at(W2(nm,2.2,floor.position.y,1.2)).set(`<b>axis starts at ${ax}%, not 0</b>`);
      lTrick.show(onM&&revealed&&ax>0).at(W2(nm,0,.05,1.6)).set("Under the floor: the hidden part of both bars");lTrick.off=[0,34];
      // ---- the town
      const key=s.sample.join(",");if(key!==sampKey){sampKey=key;hop=0}hop+=dt;const SS=new Set(s.sample);let ri=0;
      POP.forEach(p=>{const inS=SS.has(p.i),x=gxp(p.c),z=gzp(p.row);const d=S.clamp(hop-(p.c*.025),0,.5)/.5,jump=inS&&!S.REDUCED?Math.sin(d*Math.PI)*.35:0;const sc=inS?1.15:.85;
        const col=p.act?P.product.lime:"#B9C3CF",pale=inS?col:(p.act?"#CFE6AE":"#DCE2E9");body.put(p.i,x,.05+.11*sc+jump,z,sc);body.tint(p.i,pale);head.put(p.i,x,.05+.27*sc+jump,z,sc);head.tint(p.i,inS?"#ffffff":"#F1F1F4");
        if(inS&&ri<200)rings.put(ri++,x,.06,z,1,Math.PI/2,0,0)});for(;ri<200;ri++)rings.put(ri,0,-9,0,.0001);body.done();head.done();rings.done();
      you.visible=s.method==="friends";you.position.set(gxp(YOU.c),.07,gzp(YOU.row));
      const sp=sampPct();gTrue.fill.scale.y=Math.max(.01,4*TRUE/100);gTrue.fill.position.x=-2+2*TRUE/100;gSamp.fill.scale.y=Math.max(.01,4*sp/100);gSamp.fill.position.x=-2+2*sp/100;
      const onN=zone==="sample";
      lTrue.show(onN||test).at(W2(tn,.35-2+4*TRUE/100,.35,-2.9)).set(`Everyone<b>${pc(TRUE)}%</b>`);lSamp.show(onN||test).at(W2(tn,.35-2+4*sp/100,.35,-2.55)).set(`Sample says<b>${pc(sp)}%</b>`);
      lYou.show(onN&&s.method==="friends").at(W2(tn,gxp(YOU.c),.3,gzp(YOU.row))).set("You");lDie.show(onN&&(s.method==="random"||s.method==="online")).at(W2(tn,-3.7,.4,-2.7));
      lHow.show(onN).at(W2(tn,.35,.05,3.05)).set(`${mName(s.method)} · ${s.sample.length} asked<small>green = walks or bikes · grey = bus or car · ringed = asked</small>`);
      // ---- towns
      const rates=s.view==="rates";["A","B"].forEach(k2=>{const T=towns[k2],tw=TOWNS[k2];T.mix=S.lerp(T.mix,rates?1:0,S.REDUCED?1:.08);const m=T.mix;
        for(let n=0;n<120;n++){if(n<tw.inj){const c=n%6,r=Math.floor(n/6)%5,l=Math.floor(n/30);const sc=Math.max(.0001,1-m*1.6);T.blocks.put(n,-.6+c*.24,.17+l*.24,-.9+r*.24,sc)}else T.blocks.put(n,0,-9,0,.0001)}T.blocks.done();
        const lit=Math.round(per1000(tw)/10),ps=Math.max(.0001,m*1.6-.6);
        for(let n=0;n<100;n++){const c=n%10,r=Math.floor(n/10);const x=-1.35+c*.3,z=-1.35+r*.27;T.ppl.put(n,x,.06+.12*ps,z,ps);T.ppl.tint(n,n<lit?PINKc:"#E3E7EE");T.hd.put(n,x,.06+.28*ps,z,ps)}T.ppl.done();T.hd.done();
        T.frame.visible=s.pick===k2;const onT=zone==="rates";
        T.lab.show(onT||test).at(W2(T.g,0,2.35,0)).set(`${tw.nm}<small>${tw.cyc.toLocaleString("en-NZ")} cyclists</small>`);
        T.num.show(onT).at(W2(T.g,0,.1,1.7)).set(rates?`<b>${fh(per1000(tw))}</b>per 1000 cyclists`:`<b>${tw.inj}</b>injuries`);
        T.cyc.show(onT&&rates).at(W2(T.g,1.4,.1,-1.6)).set("1 figure = 10 cyclists");T.cyc.off=[0,-30]});
      lPick.show((zone==="rates"||test)&&!!s.pick).at(s.pick?W2(towns[s.pick].g,1.9,.1,1.7):tmp).set("your pick");
      // ---- the test: four cases on the board
      [[lineOk,"Median",W2(sv,0,2.6,0)],[axisOk,"Fair graph",W2(nm,0,4.2,0)],[sampOk,"Good sample",W2(tn,.35,1.0,-3)],[rateOk,"Safer town",W2(towns.A.g,2.4,3.1,0)]].forEach(([ok,l,p],i)=>{
        caseL[i].show(test).at(p).set(`${ok()?"✓":i+1} · ${l}`).cls(ok()?"hot":"")})}};
}
const api=K.mount({scene3d:data3d,
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
