(()=>{
// ---------- model: tanks filled by taps. level = m × time + c
const s={mA:3,cA:10,mB:-2,cB:80,t:0,B:false,shade:false,feeA:1,rateA:0.4,feeB:0,rateB:0.6};
const TMAX=20;
const lev=(m,c,t)=>m*t+c;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const fmtN=v=>{const r=Math.round(v*100)/100;return(Object.is(r,-0)?0:r).toString()};
function rule(m,c,x="t",y="L"){const ms=m===0?"":m===1?x:m===-1?"−"+x:fmtN(m).replace("-","−")+x;const cs=c===0?(m===0?"0":""):(c>0?(ms?" + ":"")+fmtN(c):" − "+fmtN(-c));return `${y} = ${ms}${cs}`}
function meet(m1,c1,m2,c2){if(m1===m2)return null;const t=(c2-c1)/(m1-m2);return{t,y:m1*t+c1}}
function emptyAt(m,c){if(m>=0)return null;return -c/m}

// ---------- drawing: figure parts from the shared bench look (StudyKit.fig), lavender for maths
const FG=StudyKit.fig,PAL=FG.palette,TINT=PAL.case.lavender,AX="#8F9BAA",STEEL=PAL.steel,STEELD=PAL.steelDark||"#8F9BAA";
const COLA=PAL.product.blueberry,COLB=PAL.product.strawberry,DEEP={[COLA]:"#4F7FC0",[COLB]:"#C2587A"};
// a series line: a deep edge under the product colour, so pastel lines stay crisp on white
const series=(d,col,w)=>d?`<path d="${d}" fill="none" stroke="${DEEP[col]||FG.deep(col)}" stroke-width="${w+2}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`:"";
// a steel pipe (taps and drains)
const pipe=d=>`<path d="${d}" fill="none" stroke="${STEELD}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${STEEL}" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" transform="translate(-.8,-.8)"/>`;
const GX0=330,GX1=620,GY0=30,GY1=290;
function gx(t){return GX0+t/TMAX*(GX1-GX0)}
function gy(v,max=100){return GY1-v/max*(GY1-GY0)}
function axes(max,ylab,xlab,step){
  // the plotter: a white screen in a frosted lavender case; the grid itself stays flat and exact
  let o=FG.acrylic(300,27,326,299,{tint:TINT,d:12,r:14,shadowLen:40,balls:false});
  o+=`<rect x="${GX0}" y="${GY0}" width="${GX1-GX0}" height="${GY1-GY0}" fill="var(--paper)" stroke="${AX}" stroke-width="1.2"/>`;
  for(let t=0;t<=TMAX;t+=5)o+=`<line x1="${gx(t)}" x2="${gx(t)}" y1="${GY0}" y2="${GY1}" stroke="var(--line)"/><text class="t-lab" x="${gx(t)}" y="${GY1+14}" text-anchor="middle">${t}</text>`;
  for(let v=0;v<=max;v+=step)o+=`<line x1="${GX0}" x2="${GX1}" y1="${gy(v,max)}" y2="${gy(v,max)}" stroke="var(--line)"/><text class="t-lab" x="${GX0-6}" y="${gy(v,max)+3.5}" text-anchor="end">${v}</text>`;
  o+=`<text class="t-lab" x="${(GX0+GX1)/2}" y="${GY1+30}" text-anchor="middle">${xlab}</text><text class="t-lab" x="${GX0}" y="${GY0-10}">${ylab}</text>`;
  return o;
}
function linePath(m,c,max,tEnd){const pts=[];for(let t=0;t<=tEnd+1e-9;t+=0.25){const v=m*t+c;if(v<0||v>max){if(pts.length&&v<0)break;continue}pts.push(gx(t).toFixed(1)+","+gy(v,max).toFixed(1))}return pts.length?"M"+pts.join("L"):""}
function tank(x,label,m,c,col){
  const W=86,H=200,y0=60,v=clamp(lev(m,c,s.t),0,100),h=v/100*H;
  let o=`<text class="t-ink" x="${x+W/2}" y="${y0-34}" text-anchor="middle">${label}</text>`;
  // tap
  const flow=m>0?Math.min(1,m/8):0;
  // the tank: water in a product colour behind a frosted lavender case, a steel tap above
  const D=10;
  if(h>0.5)o+=`<rect x="${x+2}" y="${y0+H-h}" width="${W-4}" height="${h}" rx="4" fill="${col}" opacity=".62"/><path d="M${x+2},${y0+H-h} l${D-2},${-(D-2)*.55} h${W-4} l${-(D-2)},${(D-2)*.55}z" fill="${col}" opacity=".4"/>`;
  if(flow>0&&s.t<TMAX&&v<100)o+=`<rect x="${x+W/2-10}" y="${y0-12}" width="${2+flow*5}" height="${H+12-h}" fill="${col}" opacity=".7"/>`;
  o+=FG.acrylic(x,y0,W,H,{tint:TINT,d:D,r:6,balls:false,shadowLen:30});
  o+=pipe(`M${x+W/2-30},${y0-22} h22 v10`);
  for(let k=0;k<=10;k++)o+=`<line x1="${x+W+D}" x2="${x+W+D+(k%5?5:9)}" y1="${y0+H-k*H/10}" y2="${y0+H-k*H/10}" stroke="${AX}"/>`;
  [0,50,100].forEach(k=>o+=`<text class="t-lab" x="${x+W+D+12}" y="${y0+H-k*H/100+3.5}">${k}</text>`);
  // drain
  if(m<0){if(v>0)o+=`<rect x="${x+W+4}" y="${y0+H+12}" width="${3+Math.min(1,-m/8)*4}" height="26" fill="${col}" opacity=".7"/>`;o+=pipe(`M${x+W-14},${y0+H} v14 h18`)}
  o+=`<text class="t-big" x="${x+W/2}" y="${y0+H+44}" text-anchor="middle">${fmtN(Math.round(v*10)/10)} L</text>`;
  return o;
}
function meter(x,label,fee,rate,col){
  const cost=fee+rate*s.t;
  let o=`<text class="t-ink" x="${x+60}" y="40" text-anchor="middle">${label}</text>`;
  // the hire meter: a lavender plastic housing with a navy display
  o+=FG.box(x,52,120,150,{colour:TINT,kind:"plastic",d:10,r:16,shadowLen:34});
  o+=`<rect x="${x+12}" y="66" width="96" height="40" rx="6" fill="var(--ink)"/><text x="${x+60}" y="94" text-anchor="middle" style="font:500 20px var(--mono);fill:var(--paper)">$${cost.toFixed(2)}</text>`;
  o+=`<text class="t-lab" x="${x+60}" y="128" text-anchor="middle">UNLOCK $${fee.toFixed(2)}</text><text class="t-lab" x="${x+60}" y="146" text-anchor="middle">${Math.round(rate*100)}c A MINUTE</text>`;
  o+=`<circle cx="${x+60}" cy="178" r="12" fill="${col}" stroke="${DEEP[col]||FG.deep(col)}" stroke-width="1.4"/><circle cx="${x+56}" cy="174" r="3.5" fill="#fff" opacity=".6"/>`;
  return o;
}
function drawMain(st0,st){
  let o=FG.floor(640,330);
  const both=s.B;
  if(st.k==="scooter"){
    o+=meter(30,"Scooter A",s.feeA,s.rateA,COLA)+meter(166,"Scooter B",s.feeB,s.rateB,COLB);
    o+=axes(15,"COST ($)","MINUTES RIDDEN",5);
    const max=15;
    [[s.feeA,s.rateA,COLA],[s.feeB,s.rateB,COLB]].forEach(([c,m,col])=>{o+=`<path d="${linePath(m,c,max,TMAX)}" fill="none" stroke="${DEEP[col]}" stroke-width="1.4" opacity=".35"/>`+series(linePath(m,c,max,s.t),col,2.6);
      const v=m*s.t+c;if(v<=max)o+=`<circle cx="${gx(s.t)}" cy="${gy(v,max)}" r="5" fill="${col}" stroke="var(--ink)"/>`});
    const X=meet(s.rateA,s.feeA,s.rateB,s.feeB);
    if(X&&X.t>0&&X.t<=TMAX&&X.y<=max)o+=`<circle cx="${gx(X.t)}" cy="${gy(X.y,max)}" r="7" fill="none" stroke="var(--ink)" stroke-width="1.6"/><text class="t-ink" x="${gx(X.t)+(gx(X.t)>520?-10:10)}" y="${gy(X.y,max)-10}" text-anchor="${gx(X.t)>520?"end":"start"}">same price at ${fmtN(Math.round(X.t*10)/10)} min</text>`;
    return o;
  }
  o+=tank(both?24:80,"Tank A",s.mA,s.cA,COLA);
  if(both)o+=tank(158,"Tank B",s.mB,s.cB,COLB);
  o+=axes(100,"WATER (L)","TIME (MINUTES)",20);
  if(st.k==="ineq"||s.shade){o+=`<rect x="${GX0}" y="${GY0}" width="${GX1-GX0}" height="${gy(50)-GY0}" fill="${PAL.product.butter}" opacity=".22"/><line x1="${GX0}" x2="${GX1}" y1="${gy(50)}" y2="${gy(50)}" stroke="#C9A227" stroke-width="1.6" stroke-dasharray="4 3"/><text class="t-lab" x="${GX1-4}" y="${gy(50)-6}" text-anchor="end">L ≥ 50</text>`;
    // highlight times where A above 50
    let a=null,b=null;for(let t=0;t<=TMAX;t+=0.05){const v=lev(s.mA,s.cA,t);if(v>=50&&v<=100){if(a===null)a=t;b=t}}
    if(a!==null)o+=`<line x1="${gx(a)}" x2="${gx(b)}" y1="${GY1-2}" y2="${GY1-2}" stroke="${PAL.product.butter}" stroke-width="5"/><line x1="${gx(a)}" x2="${gx(b)}" y1="${GY1-2}" y2="${GY1-2}" stroke="#C9A227" stroke-width="1"/>`}
  const lines=[[s.mA,s.cA,COLA]];if(both)lines.push([s.mB,s.cB,COLB]);
  lines.forEach(([m,c,col])=>{o+=`<path d="${linePath(m,c,100,TMAX)}" fill="none" stroke="${DEEP[col]}" stroke-width="1.4" opacity=".35"/>`+series(linePath(m,c,100,s.t),col,2.6);
    const v=lev(m,c,s.t);if(v>=0&&v<=100)o+=`<circle cx="${gx(s.t)}" cy="${gy(v)}" r="5" fill="${col}" stroke="var(--ink)"/>`});
  // gradient triangle on A
  if(["rate","rule","drain"].includes(st.k)){const t1=4,t2=9,v1=lev(s.mA,s.cA,t1),v2=lev(s.mA,s.cA,t2);
    if(v1>=0&&v1<=100&&v2>=0&&v2<=100){o+=`<path d="M${gx(t1)},${gy(v1)} H${gx(t2)} V${gy(v2)}" fill="none" stroke="var(--ink)" stroke-width="1.4" stroke-dasharray="3 3"/><text class="t-ink" x="${(gx(t1)+gx(t2))/2}" y="${gy(v1)+(v2>=v1?14:-6)}" text-anchor="middle">run 5</text><text class="t-ink" x="${gx(t2)+6}" y="${(gy(v1)+gy(v2))/2+4}">rise ${fmtN(v2-v1)}</text>`}}
  if(st.k==="start"||st.k==="rule")o+=`<circle cx="${gx(0)}" cy="${gy(clamp(s.cA,0,100))}" r="7" fill="none" stroke="var(--ink)" stroke-width="1.6"/><text class="t-ink" x="${gx(0)+10}" y="${gy(clamp(s.cA,0,100))-8}">starts at ${fmtN(s.cA)} L</text>`;
  if(both){const X=meet(s.mA,s.cA,s.mB,s.cB);if(X&&X.t>=0&&X.t<=TMAX&&X.y>=0&&X.y<=100)o+=`<circle cx="${gx(X.t)}" cy="${gy(X.y)}" r="7" fill="none" stroke="var(--ink)" stroke-width="1.6"/><text class="t-ink" x="${gx(X.t)+(gx(X.t)>520?-10:10)}" y="${gy(X.y)-10}" text-anchor="${gx(X.t)>520?"end":"start"}">level at ${fmtN(Math.round(X.t*10)/10)} min</text>`}
  const e=emptyAt(s.mA,s.cA);if(st.k==="drain"&&e!==null&&e<=TMAX)o+=`<circle cx="${gx(e)}" cy="${gy(0)}" r="7" fill="none" stroke="var(--ink)" stroke-width="1.6"/><text class="t-ink" x="${gx(e)}" y="${gy(0)-12}" text-anchor="middle">empty at ${fmtN(Math.round(e*10)/10)} min</text>`;
  return o;
}
function drawClose(st0,st){
  let o=FG.floor(420,260);
  const isS=st.k==="scooter";
  const rows=[0,1,2,3,4,5,10];
  o+=`<text class="t-lab" x="14" y="22">TABLE OF VALUES</text>`;
  const cols=isS?[["MIN",t=>t],["A ($)",t=>(s.feeA+s.rateA*t).toFixed(2)],["B ($)",t=>(s.feeB+s.rateB*t).toFixed(2)]]:[["TIME",t=>t],["TANK A",t=>fmtN(lev(s.mA,s.cA,t))]].concat(s.B?[["TANK B",t=>fmtN(lev(s.mB,s.cB,t))]]:[]);
  // the table on a frosted lavender card
  o+=FG.acrylic(10,32,cols.length>2?250:196,158,{tint:TINT,d:10,r:12,balls:false,shadowLen:30});
  cols.forEach((c,i)=>{const x=24+i*90;o+=`<text class="t-lab" x="${x}" y="46">${c[0]}</text>`;rows.forEach((t,j)=>{o+=`<text class="t-ink" x="${x}" y="${66+j*19}">${c[1](t)}</text>`})});
  if(!isS){const d=s.mA;o+=`<text class="t-lab" x="${24+90}" y="${66+6*19+20}">${d>=0?"+":"−"}${fmtN(Math.abs(d))} EVERY MINUTE</text>`}
  // rule card
  const R=isS?[rule(s.rateA,s.feeA,"t","A"),rule(s.rateB,s.feeB,"t","B")]:[rule(s.mA,s.cA,"t","A")].concat(s.B?[rule(s.mB,s.cB,"t","B")]:[]);
  o+=FG.box(isS||s.B?290:220,40,isS||s.B?112:180,R.length*44+22,{colour:"#FFFFFF",kind:"plastic",d:8,r:8,stroke:FG.deep(TINT),shadowLen:28});
  o+=`<text class="t-lab" x="${(isS||s.B?290:220)+12}" y="58">THE RULE</text>`;
  R.forEach((r,i)=>o+=`<text x="${(isS||s.B?290:220)+12}" y="${84+i*40}" style="font:500 ${isS||s.B?13:17}px var(--mono);fill:var(--ink)">${r}</text>`);
  o+=`<text class="t-body" x="14" y="${H0}">${isS?"c = unlock fee (where the line starts), m = price per minute (how steep)":"c = starting water (y-intercept), m = litres per minute (gradient)"}</text>`;
  return o;
}
const H0=248;
const set=(k)=>(x,v)=>{s[k]=v};
const steps=[
 {k:"start",lab:"Start level",cap:"Set how much water is in the tank before the tap opens. On the graph, that's where the line starts: the y-intercept.",speed:1.2,speedLabel:"1 minute ≈ 0.8 s",controls:["play","reset","cA","mA"],
  big:"<b>The big idea:</b> in y = mx + c, c is the value when x is 0, the starting amount. It's where the line crosses the vertical axis.",
  exam:"The y-intercept is 10, which means the tank starts with 10 litres of water before any time has passed.",
  trap:"Reading the intercept off the horizontal axis. The y-intercept is on the vertical axis, where time = 0.",chips:["rule","now","c"],onStep:()=>{s.B=false;s.mA=3;s.cA=10;s.t=0}},
 {k:"rate",lab:"Gradient",cap:"Open the tap wider. More litres every minute makes a steeper line. The gradient is rise over run.",speed:1.2,speedLabel:"1 minute ≈ 0.8 s",controls:["play","reset","cA","mA"],
  big:"<b>The big idea:</b> the gradient m is the rate of change: how much y goes up for every 1 that x goes up.",
  exam:"The gradient is 3 because the water rises by 15 litres over 5 minutes, and 15 ÷ 5 = 3. This means the tank fills at 3 litres per minute.",
  trap:"Giving the gradient without units or meaning. Say what it is in context: \"3 litres per minute\".",chips:["rule","m","now"],onStep:()=>{s.B=false;s.t=0}},
 {k:"drain",lab:"Draining",cap:"Make the rate negative and the tank drains. The line slopes down, and where it hits zero is when the tank is empty.",speed:1.2,speedLabel:"1 minute ≈ 0.8 s",controls:["play","reset","cA","mA"],
  big:"<b>The big idea:</b> a negative gradient means y goes down as x goes up. Solve mx + c = 0 to find when it runs out.",
  exam:"The rule is L = −4t + 80. The tank is empty when L = 0, so −4t + 80 = 0, which gives t = 20. The tank is empty after 20 minutes.",
  trap:"Dropping the negative sign. A draining tank must have a negative gradient.",chips:["rule","m","empty"],onStep:()=>{s.B=false;s.mA=-4;s.cA=80;s.t=0}},
 {k:"rule",lab:"Find the rule",cap:"Work backwards. Read the start from the table at t = 0 and the gradient from how much it changes each minute.",speed:0,controls:["reset","cA","mA"],
  big:"<b>The big idea:</b> a table of values gives you the rule: the constant difference is m, the value at x = 0 is c.",
  exam:"From the table, the water increases by 5 litres every minute, so m = 5. At t = 0 there are 20 litres, so c = 20. The rule is L = 5t + 20.",
  trap:"Using the first value in the table as c when the table doesn't start at x = 0. Work back to x = 0 first.",chips:["rule","m","c"],onStep:()=>{s.B=false;s.mA=5;s.cA=20;s.t=10}},
 {k:"meet",lab:"Two tanks",cap:"Tank A fills while tank B drains. Where the lines cross, both tanks hold the same amount: the solution to both equations at once.",speed:1.2,speedLabel:"1 minute ≈ 0.8 s",controls:["play","reset","cA","mA","cB","mB"],
  big:"<b>The big idea (Merit and Excellence):</b> the point where two lines cross solves both equations at once. Set them equal and solve.",
  exam:"The tanks hold the same amount when 3t + 10 = −2t + 80. Adding 2t and subtracting 10 gives 5t = 70, so t = 14. At 14 minutes both tanks hold 52 litres.",
  trap:"Stopping at t = 14. Finish the answer: substitute back to get the amount, and say what it means.",chips:["ruleA","ruleB","meet"],onStep:()=>{s.B=true;s.mA=3;s.cA=10;s.mB=-2;s.cB=80;s.t=0}},
 {k:"scooter",lab:"Scooter hire",cap:"Two made-up scooter companies. A charges $1 to unlock plus 40c a minute; B has no unlock fee but 60c a minute. Which is cheaper?",speed:1.2,speedLabel:"1 minute ≈ 0.8 s",controls:["play","reset","feeA","rateA","feeB","rateB"],
  big:"<b>The big idea:</b> the unlock fee is the intercept and the per-minute price is the gradient. The cheaper option flips where the lines cross.",
  exam:"Scooter A costs C = 0.4t + 1 and scooter B costs C = 0.6t. They cost the same when 0.4t + 1 = 0.6t, so 0.2t = 1 and t = 5. For rides shorter than 5 minutes B is cheaper; for longer rides A is cheaper.",
  trap:"Answering \"A is cheaper\" without saying when. The answer depends on the length of the ride.",chips:["costA","costB","meetS"],onStep:()=>{s.t=0}},
 {k:"ineq",lab:"Inequalities",cap:"When does the tank hold at least 50 litres? Solve the inequality, and watch the shaded band on the time axis.",speed:1.2,speedLabel:"1 minute ≈ 0.8 s",controls:["play","reset","cA","mA"],
  big:"<b>The big idea:</b> an inequality has a range of answers. Solve it like an equation, then describe the range.",
  exam:"The tank holds at least 50 litres when 3t + 10 ≥ 50. Subtracting 10 gives 3t ≥ 40, so t ≥ 13⅓. From about 13.3 minutes on, the tank holds 50 litres or more.",
  trap:"Forgetting to flip the inequality sign when you divide by a negative number.",chips:["rule","above"],onStep:()=>{s.B=false;s.mA=3;s.cA=10;s.t=0}},
 {k:"test",lab:"Test yourself",cap:"Set the controls to answer each one, then press Check. The machine marks you with the same rules that draw the lines.",speed:0,controls:["reset","cA","mA","cB","mB"],
  big:"<b>Exam tip:</b> for Merit, show each step in order. For Excellence, explain what your answer means and check it makes sense.",
  chips:["ruleA","ruleB","meet"],onStep:()=>{s.B=true;s.t=0}}
];
// ---- kupu Māori: te reo terms for this machine, each checked in Te Aka Māori Dictionary (ta = word id). Sources and notes: te-reo-notes.md
const KUPU=[
 {mi:"kauwhata",en:"graph",ta:2460},
 {mi:"kauwhata rārangi",en:"line graph",ta:45723},
 {mi:"rārangi torotika",en:"straight line",ta:45905},
 {mi:"pānga rārangi",en:"linear relationship",ta:45815},
 {mi:"rōnaki",en:"gradient, slope",ta:13240,chip:"m"},
 {mi:"haukotinga",en:"intercept",ta:45643,chip:"c"},
 {mi:"taurangi",en:"variable",ta:7765},
 {mi:"whārite",en:"equation",ta:10185}];
Object.entries({"start": ["kauwhata", "haukotinga"], "rate": ["rōnaki", "pānga rārangi"], "drain": ["rōnaki"], "rule": ["whārite", "taurangi"], "meet": ["whārite", "kauwhata rārangi"], "scooter": ["pānga rārangi"]}).forEach(([k,a])=>{const st=steps.find(x=>x.k===k);if(st)st.kupu=a});
// ---------- the 3D bench: two real tanks on a lavender plinth with a frosted graph board, and a scooter road behind
function lines3d(S){const {THREE,mat,PAL:P}=S;const V3=(x,y,z)=>new THREE.Vector3(x,y,z);const TOP=.3;
  const plinth=(x,z,w,d,tint)=>{const p=S.rbox(w,.3,d,.12,mat("plastic",tint,{rough:.55,coat:.2}));p.position.set(x,.15,z);S.scene.add(p);return p};
  const ZS=-2,SX=-16.5;plinth(.6,0,13.4,5.4,P.case.lavender);plinth(SX+.4,ZS,13.8,6.6,P.case.sky);
  const UP=V3(0,1,0),cylGeo=new THREE.CylinderGeometry(1,1,1,16),boxGeo=new THREE.BoxGeometry(1,1,1);
  // a straight segment between two points: a cylinder stretched and turned (a line on the board is exactly this)
  const seg=(m,a,b,r)=>{const d=b.clone().sub(a),L=d.length();if(L<1e-4){m.visible=false;return}m.visible=true;m.position.copy(a).addScaledVector(d,.5);m.quaternion.setFromUnitVectors(UP,d.divideScalar(L));m.scale.set(r,L,r)};
  const bar=(m,x0,y0,x1,y1,z,th,dp)=>{m.visible=true;m.position.set((x0+x1)/2,(y0+y1)/2,z);m.scale.set(Math.max(th,Math.abs(x1-x0)),Math.max(th,Math.abs(y1-y0)),dp)};
  const clipT=(m,c,max,t0,t1)=>{let a=t0,b=t1;if(m===0){if(c<0||c>max)return null}else{const u=-c/m,v=(max-c)/m;a=Math.max(t0,Math.min(u,v));b=Math.min(t1,Math.max(u,v))}return a<=b?[a,b]:null};
  const COL={A:P.product.blueberry,B:P.product.strawberry},DEEPC={A:"#4F7FC0",B:"#C2587A"},WATER={A:P.water,B:"#F2A7BE"};
  const hitM=new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false});
  // ---------------------------------------------------------------- a frosted graph board: exact grid on a canvas panel, 3D lines in front of it
  function board(x,y,z,W,H){const g=S.group();g.position.set(x,y,z);
    g.add(S.rbox(W+.36,H+.36,.14,.1,mat("acrylic",P.case.lavender,{opacity:.4}),{at:[0,0,-.1],cast:false}));
    g.add(S.rbox(W+.2,H+.2,.04,.04,mat("plastic","#ffffff",{rough:.4}),{at:[0,0,-.16]}));
    const PL=y-TOP-H/2;for(const sx of [-1,1])g.add(S.cyl(.06,.08,PL,mat("metal"),{at:[sx*(W/2-.5),-H/2-PL/2,-.16],seg:16}));
    const PW=1024,PH=Math.round(1024*H/W),pan=S.panel(PW,PH,W);g.add(pan);
    const X0=96,X1=PW-34,Y0=46,Y1=PH-86;const B={g,pan,W,H,max:100};
    B.at=(t,v)=>V3(((X0+t/TMAX*(X1-X0))/PW-.5)*W,(.5-(Y1-v/B.max*(Y1-Y0))/PH)*H,.07);
    B.inv=p=>({t:((p.x/W+.5)*PW-X0)/(X1-X0)*TMAX,v:(Y1-(.5-p.y/H)*PH)/(Y1-Y0)*B.max});
    B.draw=(max,step,ylab,xlab)=>{B.max=max;pan.redraw((c,w,h)=>{c.fillStyle="rgba(255,255,255,.95)";c.beginPath();c.roundRect(4,4,w-8,h-8,22);c.fill();
      const gx=t=>X0+t/TMAX*(X1-X0),gy=v=>Y1-v/max*(Y1-Y0);c.lineWidth=1;c.strokeStyle="#EFEBF6";
      for(let t=0;t<=TMAX;t++){c.beginPath();c.moveTo(gx(t),Y0);c.lineTo(gx(t),Y1);c.stroke()}for(let v=0;v<=max;v+=step/4){c.beginPath();c.moveTo(X0,gy(v));c.lineTo(X1,gy(v));c.stroke()}
      c.strokeStyle="#D6CFE6";c.lineWidth=2;c.font="600 24px 'Instrument Sans',system-ui";c.fillStyle="#6E6A86";
      for(let t=0;t<=TMAX;t+=5){c.beginPath();c.moveTo(gx(t),Y0);c.lineTo(gx(t),Y1);c.stroke();c.textAlign="center";c.fillText(t,gx(t),Y1+30)}
      for(let v=0;v<=max;v+=step){c.beginPath();c.moveTo(X0,gy(v));c.lineTo(X1,gy(v));c.stroke();c.textAlign="right";c.fillText(v,X0-12,gy(v)+8)}
      c.strokeStyle="#8F9BAA";c.lineWidth=3;c.strokeRect(X0,Y0,X1-X0,Y1-Y0);
      c.font="600 22px 'Instrument Sans',system-ui";c.fillStyle="#222A55";c.textAlign="center";c.fillText(xlab,(X0+X1)/2,Y1+68);c.textAlign="left";c.fillText(ylab,X0,Y0-14)})};
    return B}
  // a series on a board: ghost line, glowing drawn-so-far tube, live bead, and two grab handles (start and slope)
  function series(B,col,deep){const o={};
    o.ghost=S.mesh(cylGeo,mat("flat",deep,{opacity:.35}),{cast:false});o.line=S.mesh(cylGeo,mat("glow",deep,.7),{cast:false});
    o.bead=S.sphere(.11,mat("glow",col,.9));o.h0=S.sphere(.12,mat("plastic","#ffffff",{rough:.3}));o.h1=S.sphere(.12,mat("plastic","#ffffff",{rough:.3}));
    for(const h of [o.h0,o.h1]){h.add(S.torus(.13,.035,mat("plastic",col,{rough:.3}),{cast:false}));h.add(S.mesh(new THREE.SphereGeometry(.34,10,8),hitM,{cast:false}))}
    B.g.add(o.ghost,o.line,o.bead,o.h0,o.h1);
    o.set=(m,c,t,showH)=>{const full=clipT(m,c,B.max,0,TMAX),done=clipT(m,c,B.max,0,t);
      if(full)seg(o.ghost,B.at(full[0],m*full[0]+c),B.at(full[1],m*full[1]+c),.02);else o.ghost.visible=false;
      if(done&&t>0)seg(o.line,B.at(done[0],m*done[0]+c),B.at(done[1],m*done[1]+c),.065);else o.line.visible=false;
      const v=m*t+c;o.bead.visible=v>=0&&v<=B.max;o.bead.position.copy(B.at(t,S.clamp(v,0,B.max)));
      o.h0.visible=showH&&c>=0&&c<=B.max;o.h0.position.copy(B.at(0,S.clamp(c,0,B.max)));
      const v10=m*10+c;o.h1.visible=showH&&v10>=0&&v10<=B.max;o.h1.position.copy(B.at(10,S.clamp(v10,0,B.max)))};
    return o}
  const nrm=B=>V3(0,0,1).applyQuaternion(B.g.getWorldQuaternion(new THREE.Quaternion()));
  const grab=(B,h,fn)=>S.dragger(h,{normal:nrm(B),move:p=>{fn(B.inv(B.g.worldToLocal(p.clone())))}});

  // ---------------------------------------------------------------- tank zone
  const TW=1.3,TH=3.0,TB=TOP+.14;const Ly=v=>TB+S.clamp(v,0,100)/100*TH;
  function tank(key){const g=S.group();
    g.add(S.rbox(TW+.3,.14,TW+.3,.05,mat("plastic","#ffffff",{rough:.4}),{at:[0,TOP+.07,0]}));
    const cs=S.acrylicCase(TW,TH,TW,P.case.lavender,{opacity:.16});cs.position.y=TB;g.add(cs);
    const wm=mat("liquid",WATER[key],{fresh:true,opacity:.72});const water=S.mesh(boxGeo,wm,{cast:false});water.renderOrder=1;g.add(water);
    const surf=S.mesh(new THREE.PlaneGeometry(TW-.04,TW-.04),mat("liquid","#ffffff",{fresh:true,opacity:.35}),{rot:[-Math.PI/2,0,0],cast:false});surf.renderOrder=2;g.add(surf);
    const ticks=S.swarm(11,boxGeo,mat("flat",P.ink,{opacity:.55}));for(let k=0;k<=10;k++)ticks.putS(k,TW/2+.06+(k%5?.06:.1),Ly(k*10),TW/2+.02,k%5?.12:.2,.014,.01);ticks.done();g.add(ticks);
    // the tap: a steel pipe over the back, a faucet over the middle, a peach wheel you can tap to run the clock
    g.add(S.tube([[-.4,TOP,-TW/2-.3],[-.4,TB+TH+.5,-TW/2-.3],[-.4,TB+TH+.55,-.2],[-.1,TB+TH+.55,0],[0,TB+TH+.4,0]],.06,mat("metal")));
    const wheel=S.torus(.16,.04,mat("plastic",P.product.peach,{rough:.35}),{at:[-.4,TB+TH+.75,-TW/2-.3],rot:[0,0,0]});g.add(wheel);g.add(S.cyl(.03,.03,.25,mat("metal"),{at:[-.4,TB+TH+.63,-TW/2-.3]}));
    S.pick(wheel,()=>{S.api.state.playing=!S.api.state.playing});
    const stream=S.mesh(cylGeo,mat("liquid",WATER[key],{fresh:true,opacity:.75}),{cast:false});g.add(stream);
    // the drain: a pipe out of the bottom corner into a little trough
    const drain=S.group(g);drain.add(S.tube([[TW/2-.25,TB+.08,.2],[TW/2+.25,TB+.08,.2],[TW/2+.45,TB+.02,.2],[TW/2+.5,TB-.05,.2]],.05,mat("metal")));
    drain.add(S.rbox(.5,.16,.6,.05,mat("plastic","#ffffff",{rough:.4}),{at:[TW/2+.5,TOP+.08,.2]}));
    const out=S.mesh(cylGeo,mat("liquid",WATER[key],{fresh:true,opacity:.75}),{cast:false});drain.add(out);
    const drops=S.swarm(24,new THREE.SphereGeometry(1,8,6),mat("liquid","#ffffff",{opacity:.8}));g.add(drops);const dr=Array.from({length:24},()=>({y:Math.random(),x:0,z:0}));
    // a float you can grab: drag it up or down to change how much water the tank started with
    const float=S.sphere(.13,mat("plastic",COL[key],{rough:.3}));float.add(S.mesh(new THREE.SphereGeometry(.32,10,8),hitM,{cast:false}));g.add(float);
    const lab=S.label({off:[-26,-30]});
    return {g,key,water,wm,surf,stream,drain,out,drops,dr,float,lab,x:0}}
  const TA=tank("A"),TBk=tank("B");
  // ring marks drawn round a tank at a level (50 L line, meeting level)
  const ringAt=(col,w)=>{const g=S.group();const m=mat("glow",col,1.1);
    for(const [sx,sz,rx,rz] of [[0,1,w,.04],[0,-1,w,.04],[1,0,.04,w],[-1,0,.04,w]])g.add(S.box(rx,.035,rz,m,{at:[sx*w/2,0,sz*w/2],cast:false}));return g};
  const ring50=ringAt(P.product.butter,TW+.08),ringMeetA=ringAt(P.deep.lavender,TW+.08),ringMeetB=ringAt(P.deep.lavender,TW+.08);
  const tb=board(3.25,TOP+.55+2.15,-.6,6,4.3);tb.draw(100,20,"WATER (L)","TIME (MINUTES)");
  const serA=series(tb,COL.A,DEEPC.A),serB=series(tb,COL.B,DEEPC.B);
  const setC=k=>q=>{S.api.state["c"+k]=S.clamp(Math.round(q.v/5)*5,0,100)};
  const setM=k=>q=>{const st=S.api.state;st["m"+k]=S.clamp(Math.round((q.v-st["c"+k])/10*2)/2,-8,8)};
  grab(tb,serA.h0,setC("A"));grab(tb,serA.h1,setM("A"));grab(tb,serB.h0,setC("B"));grab(tb,serB.h1,setM("B"));
  for(const T of [TA,TBk])S.dragger(T.float,{normal:V3(0,0,1),move:p=>{const st=S.api.state,k=T.key;const v=(p.y-TB)/TH*100;st["c"+k]=S.clamp(Math.round((v-st["m"+k]*st.t)/5)*5,0,100)}});
  // rise and run blocks, the staircase, the ineq band, the marker rings on the board
  const blocks=Array.from({length:10},(_,i)=>{const b=S.mesh(boxGeo,mat("plastic",i%2?P.case.blush:P.case.mint,{rough:.4}));b.visible=false;tb.g.add(b);return b});
  const runM=mat("plastic","#9ED9BF",{rough:.4}),riseM=mat("plastic","#E8A0B8",{rough:.4});blocks.forEach((b,i)=>b.material=i%2?riseM:runM);
  const band=S.mesh(boxGeo,mat("flat",P.product.butter,{opacity:.24,depthWrite:false}),{cast:false});band.renderOrder=4;tb.g.add(band);
  const tAxis=S.mesh(boxGeo,mat("glow",P.product.butter,1.3),{cast:false});tb.g.add(tAxis);
  const dash50=S.swarm(40,boxGeo,mat("plastic","#C9A227",{rough:.4}));tb.g.add(dash50);
  const mk=()=>{const r=S.torus(.2,.035,mat("plastic",P.ink,{rough:.3}),{cast:false});tb.g.add(r);return r};
  const mkStart=mk(),mkMeet=mk(),mkEmpty=mk();const drop=S.mesh(cylGeo,mat("flat",P.ink,{opacity:.4}),{cast:false});tb.g.add(drop);
  // the table of values card for "Find the rule"
  const table=S.group();table.position.set(-4.55,TOP,.5);table.rotation.y=.35;
  table.add(S.rbox(1.9,2.5,.1,.06,mat("acrylic",P.case.lavender,{opacity:.4}),{at:[0,1.55,-.06],cast:false}));table.add(S.cyl(.05,.07,.35,mat("metal"),{at:[0,.17,-.08]}));
  const tpan=S.panel(400,520,1.75);tpan.position.set(0,1.55,.01);table.add(tpan);let tKey="";
  const lRule=S.label({cls:"hot",off:[0,-30],lead:false}),lRuleB=S.label({cls:"hot",off:[0,-30],lead:false}),lNow=S.label({off:[22,-26]}),lStart=S.label({off:[22,-18]}),lRun=S.label({off:[0,30]}),lRise=S.label({off:[24,0]}),
    lMeet=S.label({off:[20,-30]}),lEmpty=S.label({off:[20,-34]}),l50=S.label({off:[-20,-24]}),lBand=S.label({off:[0,32],cls:"hot"}),lDrag=S.label({off:[22,22],cls:"hot"}).set("Drag to tilt"),lStair=S.label({off:[26,24]});

  // ---------------------------------------------------------------- scooter road: two helmeted riders, minute posts, coins for every 10 cents
  const R0=SX-5.6,RL=6.4,rx=t=>R0+t/TMAX*RL,LZ={A:ZS+1.5,B:ZS+.55};
  S.scene.add(S.rbox(RL+1.2,.06,2.1,.03,mat("plastic","#E9E6F0",{rough:.8,coat:0}),{at:[R0+RL/2,TOP+.03,ZS+1.02]}));
  {const dashes=S.swarm(20,boxGeo,mat("plastic","#ffffff",{rough:.6}));for(let i=0;i<20;i++)dashes.putS(i,R0+.16+i*RL/20,TOP+.065,ZS+1.02,.18,.01,.04);dashes.done();S.scene.add(dashes);
    const posts=S.swarm(21,new S.RoundedBoxGeometry(1,1,1,2,.3),mat("plastic","#ffffff",{rough:.4}),{colors:true,cast:true});
    for(let i=0;i<=20;i++){const h=i%5?.16:.34;posts.putS(i,rx(i),TOP+h/2,ZS+2.2,.07,h,.07);posts.tint(i,i%5?"#ffffff":P.case.lavender)}posts.done();S.scene.add(posts)}
  function rider(key){const g=S.group();const c=COL[key],pl=mat("plastic",c,{rough:.35}),dk=mat("plastic",P.ink,{rough:.45}),wh=mat("plastic","#ffffff",{rough:.3});
    g.add(S.rbox(.86,.05,.2,.02,dk,{at:[0,.17,0]}));const wheels=[-.36,.36].map(x=>{const w=S.cyl(.1,.1,.06,mat("plastic","#3B4262",{rough:.6}),{rot:[Math.PI/2,0,0],at:[x,.1,0],seg:24});g.add(w);
      w.add(S.cyl(.045,.045,.07,mat("metal"),{seg:12}));return w});
    g.add(S.cyl(.022,.022,.86,mat("metal"),{at:[.4,.58,0],rot:[0,0,-.12]}));g.add(S.cyl(.02,.02,.44,mat("metal"),{at:[.45,1.0,0],rot:[Math.PI/2,0,0]}));
    for(const z of [-.06,.06]){g.add(S.cyl(.035,.03,.42,dk,{at:[-.04,.4,z],rot:[0,0,.12]}))}
    g.add(S.mesh(new THREE.CapsuleGeometry(.12,.26,6,14),pl,{at:[.02,.8,0],rot:[0,0,-.28]}));
    for(const z of [-.13,.13])g.add(S.tube([[.06,.92,z*.7],[.28,.9,z*1.2],[.44,1.0,z*1.4]],.03,pl,{seg:12}));
    const helm=S.sphere(.13,wh,{at:[.1,1.13,0],seg:22});helm.scale.set(1,.92,.95);g.add(helm);
    const visor=S.sphere(.132,mat("plastic",P.ink,{rough:.15}),{at:[.12,1.11,0],seg:22});visor.scale.set(.9,.5,.9);g.add(visor);
    g.add(S.sphere(.08,pl,{at:[.07,1.2,0]}));g.scale.setScalar(.9);S.scene.add(g);return {g,wheels}}
  const RA=rider("A"),RB=rider("B");
  const coinGeo=new THREE.CylinderGeometry(.1,.1,.028,22);const coins={A:S.swarm(240,coinGeo,mat("metal","#ffffff",{rough:.3}),{colors:true,cast:true}),B:S.swarm(240,coinGeo,mat("metal","#ffffff",{rough:.3}),{colors:true,cast:true})};
  coins.A.castShadow=coins.B.castShadow=true;S.scene.add(coins.A,coins.B);const CZ={A:ZS+2.75,B:ZS-.45};
  const gate=S.group();for(const z of [ZS+.05,ZS+2])gate.add(S.cyl(.04,.04,1.6,mat("glow",P.product.butter,1.3),{at:[0,TOP+.8,z],seg:12,cast:false}));
  gate.add(S.cyl(.04,.04,1.95,mat("glow",P.product.butter,1.3),{at:[0,TOP+1.6,ZS+1.02],rot:[Math.PI/2,0,0],seg:12,cast:false}));S.scene.add(gate);
  const sb=board(SX+3.45,TOP+.55+2.0,ZS-.9,5.6,4);sb.draw(15,5,"COST ($)","MINUTES RIDDEN");
  const scA=series(sb,COL.A,DEEPC.A),scB=series(sb,COL.B,DEEPC.B);
  const mkS=S.torus(.2,.035,mat("plastic",P.ink,{rough:.3}),{cast:false});sb.g.add(mkS);
  grab(sb,scA.h0,q=>{S.api.state.feeA=S.clamp(Math.round(q.v*2)/2,0,3)});grab(sb,scB.h0,q=>{S.api.state.feeB=S.clamp(Math.round(q.v*2)/2,0,3)});
  grab(sb,scA.h1,q=>{const st=S.api.state;st.rateA=S.clamp(Math.round((q.v-st.feeA)/10*20)/20,.1,1)});grab(sb,scB.h1,q=>{const st=S.api.state;st.rateB=S.clamp(Math.round((q.v-st.feeB)/10*20)/20,.1,1)});
  const lCA=S.label({off:[-30,-44],cls:"big"}),lCB=S.label({off:[30,-60],cls:"big"}),lCoinA=S.label({off:[70,26]}),lGate=S.label({off:[16,-26],cls:"hot"}),lSRule=S.label({cls:"hot",off:[0,-30],lead:false}),lSMeet=S.label({off:[20,-30]});

  // ---------------------------------------------------------------- views
  S.view("tank",[1.4,4.2,12.6],[.9,2.35,0],{min:4,max:28});
  S.view("rule",[-.6,4.0,12.2],[-.3,2.3,0],{min:4,max:28});
  S.view("two",[1.0,4.3,12.8],[.6,2.35,0],{min:4,max:28});
  S.view("scooter",[SX+.4,6.8,ZS+13.8],[SX+.3,1.7,ZS+.3],{min:4,max:28});
  S.view("all",[-8,17,28],[-8,1,-1.5],{min:6,max:60});
  const tankL=[TA.lab,TBk.lab,lRule,lRuleB,lNow,lStart,lRun,lRise,lMeet,lEmpty,l50,lBand,lDrag,lStair],scL=[lCA,lCB,lCoinA,lGate,lSRule,lSMeet];
  let K="start";S.goView("tank",true);const tmp=V3(0,0,0),wp=(B,v)=>B.g.localToWorld(v.clone());
  return {
    step(st,s){K=st.k;const v=K==="scooter"?"scooter":K==="test"?"all":K==="rule"?"rule":K==="meet"?"two":"tank";S.goView(v);
      S.setShadowBox(v==="all"?20:7.5,v==="scooter"?[SX,0,ZS]:v==="all"?[-9,0,-1]:[.6,0,0]);
      [...tankL,...scL].forEach(l=>l.hide())},
    update(s,st,dt,t){const k=st.k,both=s.B,run=s.playing&&st.speed;
      // ---- tanks
      TA.x=S.lerp(TA.x,both?-3.6:-2.5,S.REDUCED?1:.08);TA.g.position.x=TA.x;TBk.g.position.x=-1.75;TBk.g.visible=both;
      for(const T of k==="scooter"?[]:both?[TA,TBk]:[TA]){const m=s["m"+T.key],c=s["c"+T.key],v=S.clamp(lev(m,c,s.t),0,100),h=Math.max(.002,v/100*TH);
        T.water.visible=v>.2;T.water.scale.set(TW-.04,h,TW-.04);T.water.position.y=TB+h/2;T.surf.visible=v>.2;T.surf.position.y=TB+h+.002+(run?Math.sin(t*9)*.004:0);
        const tap=m>0&&s.t<TMAX&&v<100,yTap=TB+TH+.4;T.stream.visible=tap;if(tap){const r=.025+.06*Math.min(1,m/8);T.stream.scale.set(r,yTap-(TB+h),r);T.stream.position.set(0,(yTap+TB+h)/2,0)}
        T.drain.visible=m<0;const dOn=m<0&&v>0;T.out.visible=dOn;if(dOn){const r=.02+.04*Math.min(1,-m/8);T.out.scale.set(r,TB-.05-(TOP+.16),r);T.out.position.set(TW/2+.5,(TB-.05+TOP+.16)/2,.2)}
        for(let i=0;i<24;i++){const d=T.dr[i];if(run)d.y=(d.y+dt*(1.3+i%3*.2))%1;const on=(i<12?tap:dOn);
          if(i<12)T.drops.put(i,(i%3-1)*.02,yTap-d.y*(yTap-TB-h),((i>>2)%3-1)*.02,on?.03:0);else T.drops.put(i,TW/2+.5,TB-.05-d.y*(TB-.05-TOP-.16),.2,on?.025:0)}T.drops.done();
        T.float.position.set(-TW/2+.25,TB+h+.06,TW/2-.25);
        T.lab.show(k!=="scooter").at(tmp.set(T.g.position.x-TW/2,TB+TH,0)).set(`Tank ${T.key}<b>${fmtN(Math.round(lev(m,c,s.t)*10)/10)} L</b>`)}
      ring50.visible=k==="ineq"||s.shade;ring50.position.set(TA.x,Ly(50),0);
      // ---- tank board
      const showH=k!=="test"&&k!=="scooter";serA.set(s.mA,s.cA,s.t,showH);[serB.ghost,serB.line,serB.bead,serB.h0,serB.h1].forEach(o=>o.visible=false);if(both)serB.set(s.mB,s.cB,s.t,showH);
      lRule.show(k!=="scooter").at(wp(tb,V3(-tb.W/2+1.2,tb.H/2,0))).set(`<b>${rule(s.mA,s.cA,"t",both?"A":"L")}</b>`);lRule.el.style.setProperty("--acc",DEEPC.A);
      lRuleB.show(both&&k!=="scooter").at(wp(tb,V3(tb.W/2-1.4,tb.H/2,0))).set(`<b>${rule(s.mB,s.cB,"t","B")}</b>`);lRuleB.el.style.setProperty("--acc",DEEPC.B);
      lNow.show(k!=="scooter"&&k!=="test"&&serA.bead.visible).at(wp(tb,serA.bead.position)).set(`${fmtN(Math.round(s.t*10)/10)} min<b>${fmtN(Math.round(lev(s.mA,s.cA,s.t)*10)/10)} L</b>`);
      const sStart=k==="start"||k==="rule";mkStart.visible=sStart;mkStart.position.copy(tb.at(0,S.clamp(s.cA,0,100)));lStart.show(sStart).at(wp(tb,mkStart.position)).set(`starts at <b>${fmtN(s.cA)} L</b>`);
      lDrag.show((k==="start"||k==="rate")&&serA.h1.visible).at(wp(tb,serA.h1.position));
      blocks.forEach(b=>b.visible=false);lRun.hide();lRise.hide();lStair.hide();
      const BX=(x0,y0,x1,y1,i)=>bar(blocks[i],x0,y0,x1,y1,.13,.1,.2);
      if(k==="rate"||k==="drain"){const v1=lev(s.mA,s.cA,4),v2=lev(s.mA,s.cA,9);if(v1>=0&&v1<=100&&v2>=0&&v2<=100){const a=tb.at(4,v1),b=tb.at(9,v1),c2=tb.at(9,v2);BX(a.x,a.y,b.x,b.y,0);BX(b.x,b.y,c2.x,c2.y,1);
        lRun.show().at(wp(tb,V3((a.x+b.x)/2,a.y,0))).set("run <b>5</b>");lRise.show().at(wp(tb,V3(b.x,(b.y+c2.y)/2,0))).set(`rise <b>${fmtN(v2-v1)}</b>`);lRun.off=[0,v2>=v1?30:-34]}}
      if(k==="rule"){let ok=true;for(let i=0;i<5;i++){const v1=lev(s.mA,s.cA,i),v2=lev(s.mA,s.cA,i+1);if(v1<0||v2>100||v2<0||v1>100){ok=false;break}const a=tb.at(i,v1),b=tb.at(i+1,v1),c2=tb.at(i+1,v2);BX(a.x,a.y,b.x,b.y,i*2);BX(b.x,b.y,c2.x,c2.y,i*2+1)}
        if(ok)lStair.show().at(wp(tb,tb.at(3,lev(s.mA,s.cA,3)))).set(`${s.mA>=0?"+":"−"}${fmtN(Math.abs(s.mA))} L <small>every minute</small>`)}
      const X=both?meet(s.mA,s.cA,s.mB,s.cB):null,xOk=X&&X.t>=0&&X.t<=TMAX&&X.y>=0&&X.y<=100;mkMeet.visible=!!xOk&&k!=="scooter";
      if(xOk){mkMeet.position.copy(tb.at(X.t,X.y));const lv=Math.abs(s.t-X.t)<.4;mkMeet.scale.setScalar(lv?1.35+Math.sin(t*8)*.1:1);seg(drop,tb.at(X.t,X.y),tb.at(X.t,0),.012);
        lMeet.show(k!=="scooter").at(wp(tb,mkMeet.position)).set(`level at <b>${fmtN(Math.round(X.t*10)/10)} min</b>`)}else{drop.visible=false;lMeet.hide()}
      ringMeetA.visible=ringMeetB.visible=!!xOk&&k!=="scooter";if(xOk){ringMeetA.position.set(TA.x,Ly(X.y),0);ringMeetB.position.set(-1.75,Ly(X.y),0)}
      const e=emptyAt(s.mA,s.cA),eOk=k==="drain"&&e!==null&&e<=TMAX;mkEmpty.visible=eOk;if(eOk){mkEmpty.position.copy(tb.at(e,0));lEmpty.show().at(wp(tb,mkEmpty.position)).set(`empty at <b>${fmtN(Math.round(e*10)/10)} min</b>`)}else lEmpty.hide();
      const ineq=k==="ineq"||s.shade;band.visible=tAxis.visible=dash50.visible=ineq;l50.show(ineq);lBand.hide();
      if(ineq){const a=tb.at(0,50),b=tb.at(TMAX,100);bar(band,a.x,a.y,b.x,b.y,.04,.01,.02);for(let i=0;i<40;i++){const p=tb.at(i/40*TMAX+.12,50);dash50.putS(i,p.x,p.y,.08,.13,.03,.04)}dash50.done();
        l50.at(wp(tb,tb.at(TMAX-1,50))).set("<b>L ≥ 50</b>");let a0=null,b0=null;for(let q=0;q<=TMAX;q+=.05){const v=lev(s.mA,s.cA,q);if(v>=50&&v<=100){if(a0===null)a0=q;b0=q}}
        if(a0!==null){const p=tb.at(a0,0),p2=tb.at(b0,0);bar(tAxis,p.x,p.y,p2.x,p2.y,.09,.07,.1);lBand.show().at(wp(tb,V3((p.x+p2.x)/2,p.y,0))).set(`<b>t ≥ ${fmtN(Math.round(a0*10)/10)} min</b>`)}else tAxis.visible=false}
      table.visible=k==="rule";if(k==="rule"){const key=s.mA+"|"+s.cA;if(key!==tKey){tKey=key;tpan.redraw((c,w,h)=>{c.fillStyle="rgba(255,255,255,.96)";c.beginPath();c.roundRect(4,4,w-8,h-8,20);c.fill();
        c.font="600 22px 'Instrument Sans',system-ui";c.fillStyle="#6E6A86";c.fillText("TIME",34,52);c.fillText("TANK A",160,52);c.fillText("CHANGE",286,52);
        const rows=[0,1,2,3,4,5,10];rows.forEach((tt,j)=>{const y=100+j*56;if(j%2===0){c.fillStyle="#F4F1FA";c.fillRect(16,y-36,w-32,52)}c.font="500 30px 'IBM Plex Mono',monospace";c.fillStyle=tt===0?"#6A50BE":"#222A55";
          c.fillText(tt,40,y);c.fillText(fmtN(lev(s.mA,s.cA,tt)),160,y);if(j>0&&j<6){c.fillStyle="#2A7D63";c.fillText((s.mA>=0?"+":"−")+fmtN(Math.abs(s.mA)),286,y)}})})}}
      // ---- scooters
      const sc=k==="scooter"||k==="test";const tt=s.t;
      for(const [Rd,key] of [[RA,"A"],[RB,"B"]]){const x=rx(tt);Rd.g.position.set(x,TOP+.06+(run&&k==="scooter"?Math.abs(Math.sin(t*12+(key==="A"?0:1)))*.012:0),LZ[key]);Rd.wheels.forEach(w=>w.rotation.y=-tt*6);
        const fee=s["fee"+key],rate=s["rate"+key],nF=Math.round(fee*10),nM=Math.floor(rate*tt*10+1e-6),cs=coins[key];
        for(let i=0;i<240;i++){const tw=Math.floor(i/10),j=i%10;if(i<nF+nM){cs.put(i,R0+.1+tw*.27,TOP+.02+j*.03,CZ[key],1,0,(i*.7)%3,0);cs.tint(i,i<nF?P.product.butter:"#DCE3EC")}else cs.put(i,0,-5,0,.0001)}cs.done()}
      const XS=meet(s.rateA,s.feeA,s.rateB,s.feeB),xs=XS&&XS.t>0&&XS.t<=TMAX;gate.visible=!!xs;if(xs)gate.position.x=rx(XS.t);
      scA.set(s.rateA,s.feeA,tt,k==="scooter");scB.set(s.rateB,s.feeB,tt,k==="scooter");const xsOk=xs&&XS.y<=15;mkS.visible=!!xsOk;if(xsOk)mkS.position.copy(sb.at(XS.t,XS.y));
      lCA.show(sc).at(tmp.set(rx(tt),TOP+1.3,LZ.A)).set(`A<b>$${(s.feeA+s.rateA*tt).toFixed(2)}</b>`);lCB.show(sc).at(tmp.set(rx(tt),TOP+1.3,LZ.B)).set(`B<b>$${(s.feeB+s.rateB*tt).toFixed(2)}</b>`);lCB.el.style.setProperty("--acc",DEEPC.B);
      lCoinA.show(k==="scooter").at(tmp.set(R0+.1,TOP+.3,CZ.A)).set(`gold = unlock fee<small>silver = 10c of riding each</small>`);
      lGate.show(k==="scooter"&&!!xs).at(tmp.set(xs?rx(XS.t):0,TOP+1.6,ZS+1.02)).set(xs?`same price at ${fmtN(Math.round(XS.t*10)/10)} min`:"");
      lSRule.show(k==="scooter").at(wp(sb,V3(-sb.W/2+1.6,sb.H/2,0))).set(`<b>${rule(s.rateA,s.feeA,"t","A")}</b><small>${rule(s.rateB,s.feeB,"t","B")}</small>`);
      lSMeet.show(k==="scooter"&&!!xsOk).at(wp(sb,mkS.position)).set(xsOk?`same price<b>$${XS.y.toFixed(2)}</b>`:"")}};
}
StudyKit.mount({kupu:KUPU,scene3d:lines3d,
  eyebrow:"Maths · Linear relationships", title:"The straight-line machine", crumb:"Year 9–10 maths · NCEA Level 1 Mathematics and Statistics", homeHash:"y9",
  fig:"FIG. 03 · TWO TANKS AND A PLOTTER", railTitle:"What y = mx + c really means",
  badge:{label:"NCEA L1 Maths 91947", exam:"2026-11-10T09:30:00+13:00", examText:"Tue 10 Nov, 9:30am"},
  mainBox:"0 0 640 330", mainPhoneBig:true, mainLabel:"Water tanks filling and draining, with a graph of water against time", closeBox:"0 0 420 260",
  state:s, steps,
  controls:[{type:"play"},{type:"button",id:"reset",label:"Back to 0 min",onClick:()=>{s.t=0}},
    {type:"range",id:"cA",label:"A starts",min:0,max:100,step:5,get:()=>s.cA,set:set("cA"),fmt:()=>s.cA+" L"},
    {type:"range",id:"mA",label:"A rate",min:-8,max:8,step:0.5,get:()=>s.mA,set:set("mA"),fmt:()=>fmtN(s.mA)+" L/min"},
    {type:"range",id:"cB",label:"B starts",min:0,max:100,step:5,get:()=>s.cB,set:set("cB"),fmt:()=>s.cB+" L"},
    {type:"range",id:"mB",label:"B rate",min:-8,max:8,step:0.5,get:()=>s.mB,set:set("mB"),fmt:()=>fmtN(s.mB)+" L/min"},
    {type:"range",id:"feeA",label:"A unlock",min:0,max:3,step:0.5,get:()=>s.feeA,set:set("feeA"),fmt:()=>"$"+s.feeA.toFixed(2)},
    {type:"range",id:"rateA",label:"A per min",min:0.1,max:1,step:0.05,get:()=>s.rateA,set:set("rateA"),fmt:()=>Math.round(s.rateA*100)+"c"},
    {type:"range",id:"feeB",label:"B unlock",min:0,max:3,step:0.5,get:()=>s.feeB,set:set("feeB"),fmt:()=>"$"+s.feeB.toFixed(2)},
    {type:"range",id:"rateB",label:"B per min",min:0.1,max:1,step:0.05,get:()=>s.rateB,set:set("rateB"),fmt:()=>Math.round(s.rateB*100)+"c"}],
  tick:(x,dt,st)=>{s.t+=dt*st.speed;if(s.t>TMAX){s.t=TMAX;s.playing=false}},
  drawMain, drawClose,
  chips:()=>{const X=meet(s.mA,s.cA,s.mB,s.cB),XS=meet(s.rateA,s.feeA,s.rateB,s.feeB),e=emptyAt(s.mA,s.cA);
    let above="never";{let a=null;for(let t=0;t<=TMAX;t+=0.05){if(lev(s.mA,s.cA,t)>=50){a=t;break}}if(a!==null)above=a===0?"from the start":"from "+fmtN(Math.round(a*10)/10)+" min"}
    return{rule:["RULE",rule(s.mA,s.cA),true],ruleA:["A",rule(s.mA,s.cA)],ruleB:["B",rule(s.mB,s.cB)],now:["AT "+fmtN(Math.round(s.t*10)/10)+" MIN",fmtN(Math.round(lev(s.mA,s.cA,s.t)*10)/10)+" L"],
      m:["GRADIENT m",fmtN(s.mA)+" L per min"],c:["INTERCEPT c",fmtN(s.cA)+" L"],empty:["EMPTY AT",e===null?"never":fmtN(Math.round(e*10)/10)+" min",true],
      meet:["SAME LEVEL",X&&X.t>=0?`${fmtN(Math.round(X.t*10)/10)} min, ${fmtN(Math.round(X.y*10)/10)} L`:"never",true],
      costA:["A NOW","$"+(s.feeA+s.rateA*s.t).toFixed(2)],costB:["B NOW","$"+(s.feeB+s.rateB*s.t).toFixed(2)],
      meetS:["SAME PRICE",XS&&XS.t>0?`at ${fmtN(Math.round(XS.t*10)/10)} min`:"never",true],above:["AT LEAST 50 L",above,true]}},
  challenges:[
    {q:"Make tank A's line pass through (0, 10) and (10, 30).",check:()=>s.cA===10&&s.mA===2,ok:"Yes: it rises 20 litres in 10 minutes, so m = 2, and starts at 10. L = 2t + 10.",no:()=>`Not yet: your line is ${rule(s.mA,s.cA)}. Work out the rise over the run first.`},
    {q:"Make the two tanks hold the same amount at exactly 8 minutes.",check:()=>{const X=meet(s.mA,s.cA,s.mB,s.cB);return X&&Math.abs(X.t-8)<0.01},ok:()=>{const X=meet(s.mA,s.cA,s.mB,s.cB);return`Yes: both hold ${fmtN(Math.round(X.y*10)/10)} L at 8 minutes.`},no:()=>{const X=meet(s.mA,s.cA,s.mB,s.cB);return X?`Not yet: they meet at ${fmtN(Math.round(X.t*100)/100)} min.`:"Not yet: parallel lines never meet. Give them different rates."}},
    {q:"Make tank A run empty at exactly 12 minutes.",check:()=>{const e=emptyAt(s.mA,s.cA);return e!==null&&Math.abs(e-12)<0.01},ok:"Yes: c ÷ (rate) = 12. For example 60 L draining at 5 L a minute.",no:"Not yet. The rate must be negative, and the start divided by the drain rate must be 12."}],
  papers:[{label:"NZQA: Mathematics and Statistics",url:"https://www2.nzqa.govt.nz/ncea/subjects/subject/mathematics-and-statistics"}],
  truth:"The scooter companies and their prices are made up for practice. Tanks are idealised: the flow rate never changes.",
  footer:"Linear relationships (y = mx + c, rules from tables, simultaneous equations, inequalities) are Year 9–10 maths content and are examined through reasoning in NCEA Level 1 standard 91947."
});
})();
