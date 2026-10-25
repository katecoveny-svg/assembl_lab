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
StudyKit.mount({kupu:KUPU,
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
