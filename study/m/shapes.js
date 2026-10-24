(()=>{
// ---------- shape workshop: every number is computed from the same dimensions that draw the shape
const s={b:8,h:5,sh:0,a:4,r:3,ang:62,len:10,unroll:0,pour:0,ta:3,tb:4};
const PX=18; // pixels per unit
const f=(x,d=1)=>{const r=Math.round(x*Math.pow(10,d))/Math.pow(10,d);return r.toLocaleString("en-NZ")};
function grid(){let o="";for(let x=20;x<=620;x+=PX)o+=`<line x1="${x}" x2="${x}" y1="20" y2="310" stroke="var(--line)" stroke-width=".6"/>`;for(let y=20;y<=310;y+=PX)o+=`<line x1="20" x2="620" y1="${y}" y2="${y}" stroke="var(--line)" stroke-width=".6"/>`;return o}
const X0=74,Y0=272;
function dimLabel(x1,y1,x2,y2,t,off=14){const mx=(x1+x2)/2,my=(y1+y2)/2;return `<text class="t-ink" x="${mx}" y="${my+off}" text-anchor="middle">${t}</text>`}
function drawMain(st0,st){
  let o=`<rect width="640" height="330" fill="var(--chalk)"/>`+grid();const B=s.b*PX,H=s.h*PX,SH=s.sh*PX;
  if(st.k==="para"){
    o+=`<path d="M${X0},${Y0} L${X0+B},${Y0} L${X0+B+SH},${Y0-H} L${X0+SH},${Y0-H}Z" fill="var(--sun)" fill-opacity=".35" stroke="var(--ink)" stroke-width="2"/>`;
    o+=`<line x1="${X0+SH}" x2="${X0+SH}" y1="${Y0-H}" y2="${Y0}" stroke="var(--hot)" stroke-dasharray="4 3" stroke-width="1.6"/><path d="M${X0+SH},${Y0-10} h10 v10" fill="none" stroke="var(--hot)"/>`;
    o+=dimLabel(X0,Y0,X0+B,Y0,`base ${s.b} m`)+`<text class="t-ink" x="${X0+SH+8}" y="${Y0-H/2}">height ${s.h} m</text>`;
    o+=`<text class="t-big" x="360" y="60">Area = base × height</text><text class="t-big" x="360" y="84">= ${s.b} × ${s.h} = ${s.b*s.h} m²</text><text class="t-body" x="360" y="112">Slide the top: the area stays the same.</text>`;return o}
  if(st.k==="tri"){
    o+=`<path d="M${X0},${Y0} L${X0+B},${Y0} L${X0+B+SH},${Y0-H} L${X0+SH},${Y0-H}Z" fill="none" stroke="var(--rose)" stroke-dasharray="4 3"/>`;
    o+=`<path d="M${X0},${Y0} L${X0+B},${Y0} L${X0+SH},${Y0-H}Z" fill="var(--sea)" fill-opacity=".35" stroke="var(--ink)" stroke-width="2"/>`;
    o+=`<line x1="${X0+SH}" x2="${X0+SH}" y1="${Y0-H}" y2="${Y0}" stroke="var(--hot)" stroke-dasharray="4 3" stroke-width="1.6"/>`+dimLabel(X0,Y0,X0+B,Y0,`base ${s.b} m`)+`<text class="t-ink" x="${X0+SH+8}" y="${Y0-H/2}">height ${s.h} m</text>`;
    o+=`<text class="t-big" x="360" y="60">Area = ½ × base × height</text><text class="t-big" x="360" y="84">= ½ × ${s.b} × ${s.h} = ${f(s.b*s.h/2)} m²</text><text class="t-body" x="360" y="112">Every triangle is half a parallelogram.</text>`;return o}
  if(st.k==="trap"){const A=s.a*PX;const off=(B-A)/2;
    o+=`<path d="M${X0},${Y0} L${X0+B},${Y0} L${X0+off+A},${Y0-H} L${X0+off},${Y0-H}Z" fill="var(--land)" fill-opacity=".35" stroke="var(--ink)" stroke-width="2"/>`;
    o+=dimLabel(X0,Y0,X0+B,Y0,`b = ${s.b} m`)+dimLabel(X0+off,Y0-H,X0+off+A,Y0-H,`a = ${s.a} m`,-8)+`<line x1="${X0+B/2}" x2="${X0+B/2}" y1="${Y0-H}" y2="${Y0}" stroke="var(--hot)" stroke-dasharray="4 3"/><text class="t-ink" x="${X0+B/2+8}" y="${Y0-H/2}">h = ${s.h} m</text>`;
    o+=`<text class="t-big" x="360" y="60">Area = ½ (a + b) h</text><text class="t-big" x="360" y="84">= ½ × (${s.a} + ${s.b}) × ${s.h} = ${f((s.a+s.b)*s.h/2)} m²</text><text class="t-body" x="360" y="112">The average of the parallel sides × height.</text>`;return o}
  if(st.k==="circle"){const R=s.r*PX,cx=170,cy=150,C=2*Math.PI*s.r;
    o+=`<circle cx="${cx}" cy="${cy}" r="${R}" fill="var(--sun)" fill-opacity="${.35*(1-s.unroll)}" stroke="var(--ink)" stroke-width="2" stroke-dasharray="${2*Math.PI*R*(1-s.unroll)} 9999"/>`;
    o+=`<line x1="${cx}" x2="${cx+R}" y1="${cy}" y2="${cy}" stroke="var(--hot)" stroke-width="1.6"/><text class="t-ink" x="${cx+R/2}" y="${cy-6}" text-anchor="middle">r = ${s.r} m</text>`;
    const L=Math.min(560,C*PX*0.5);o+=`<line x1="40" x2="${40+L*s.unroll}" y1="300" y2="300" stroke="var(--ink)" stroke-width="3"/><text class="t-lab" x="40" y="292">THE EDGE UNROLLED (HALF SCALE): ${f(C*s.unroll)} m</text>`;
    o+=`<text class="t-big" x="380" y="60">Circumference = 2πr = ${f(C)} m</text><text class="t-big" x="380" y="84">Area = πr² = ${f(Math.PI*s.r*s.r)} m²</text><text class="t-body" x="380" y="112">π ≈ 3.14: any circle's edge is about 3.14 diameters.</text>`;return o}
  if(st.k==="pyth"){const c=Math.hypot(s.ta,s.tb),S=Math.min(18,120/c),a=s.ta*S,b=s.tb*S,ox=230,oy=262;
    // right triangle with legs along axes; squares outward
    o+=`<path d="M${ox},${oy} h${a} v${-b}z" fill="var(--paper)" stroke="var(--ink)" stroke-width="2"/>`;
    o+=`<rect x="${ox}" y="${oy}" width="${a}" height="${a}" fill="var(--sea)" fill-opacity="${.45*(1-s.pour)}" stroke="var(--ink)"/>`;
    o+=`<rect x="${ox+a}" y="${oy-b}" width="${b}" height="${b}" fill="var(--hot)" fill-opacity="${.45*(1-s.pour)}" stroke="var(--ink)"/>`;
    // hypotenuse square: from (ox,oy) to (ox+a, oy-b); outward normal points up-left
    const dx=a,dy=-b,nx=dy,ny=-dx;const P1=[ox,oy],P2=[ox+dx,oy+dy],P3=[P2[0]+nx,P2[1]+ny],P4=[ox+nx,oy+ny];
    o+=`<path d="M${P1} L${P2} L${P3} L${P4}Z" fill="var(--sun)" fill-opacity="${.15+.4*s.pour}" stroke="var(--ink)"/>`;
    o+=`<text class="t-ink" x="${ox+a/2}" y="${oy+a/2+4}" text-anchor="middle">${s.ta*s.ta}</text><text class="t-ink" x="${ox+a+b/2}" y="${oy-b/2+4}" text-anchor="middle">${s.tb*s.tb}</text><text class="t-ink" x="${(P1[0]+P3[0])/2}" y="${(P1[1]+P3[1])/2+4}" text-anchor="middle">${f(c*c)}</text>`;
    o+=`<text class="t-big" x="440" y="236">a² + b² = c²</text><text class="t-big" x="440" y="260">${s.ta*s.ta} + ${s.tb*s.tb} = ${f(c*c)}</text><text class="t-big" x="440" y="284">c = √${f(c*c)} = ${f(c,2)} m</text>`;return o}
  if(st.k==="angles"){const a=s.ang*Math.PI/180;const y1=110,y2=230;
    o+=`<line x1="40" x2="600" y1="${y1}" y2="${y1}" stroke="var(--ink)" stroke-width="2"/><line x1="40" x2="600" y1="${y2}" y2="${y2}" stroke="var(--ink)" stroke-width="2"/>`;
    o+=`<path d="M300,${y1-6} l8,6 l-8,6 M500,${y1-6} l8,6 l-8,6" fill="none" stroke="var(--ink)"/><path d="M300,${y2-6} l8,6 l-8,6 M500,${y2-6} l8,6 l-8,6" fill="none" stroke="var(--ink)"/>`;
    const dx=(y2-y1)/Math.tan(a);const xA=300-dx/2,xB=300+dx/2;
    o+=`<line x1="${xB+60/Math.tan(a)}" y1="${y1-60}" x2="${xA-60/Math.tan(a)}" y2="${y2+60}" stroke="var(--hot)" stroke-width="2"/>`;
    const arc=(x,y,from,to,c)=>{const r=26,p1=[x+r*Math.cos(from),y-r*Math.sin(from)],p2=[x+r*Math.cos(to),y-r*Math.sin(to)];return `<path d="M${x},${y} L${p1} A${r},${r} 0 0,0 ${p2}Z" fill="${c}" fill-opacity=".45"/>`};
    o+=arc(xB,y1,0,a,"var(--sun)")+arc(xA,y2,0,a,"var(--sun)")+arc(xA,y2,a,Math.PI,"var(--sea)");
    o+=`<text class="t-ink" x="${xB+34}" y="${y1-8}">${s.ang}°</text><text class="t-ink" x="${xA+34}" y="${y2-8}">${s.ang}°</text><text class="t-ink" x="${xA-60}" y="${y2-8}">${180-s.ang}°</text>`;
    o+=`<text class="t-big" x="380" y="290">Corresponding angles are equal</text>`;return o}
  // prism volume
  const A=s.b*s.h/2,V=A*s.len;const fx=120,fy=250,bb=s.b*PX*0.8,hh=s.h*PX*0.8,d=s.len*PX*0.6,dx=d*0.7,dy=-d*0.45;
  o+=`<path d="M${fx},${fy} L${fx+bb},${fy} L${fx+bb/2},${fy-hh}Z" fill="var(--sun)" fill-opacity=".45" stroke="var(--ink)" stroke-width="2"/>`;
  o+=`<path d="M${fx+bb},${fy} L${fx+bb+dx},${fy+dy} L${fx+bb/2+dx},${fy-hh+dy} L${fx+bb/2},${fy-hh}Z" fill="var(--fill)" stroke="var(--ink)"/><path d="M${fx+bb/2},${fy-hh} L${fx+bb/2+dx},${fy-hh+dy}" stroke="var(--ink)"/>`;
  o+=`<path d="M${fx},${fy} L${fx+dx},${fy+dy} L${fx+bb+dx},${fy+dy}" fill="none" stroke="var(--ink)" stroke-dasharray="4 3"/><path d="M${fx+dx},${fy+dy} L${fx+bb/2+dx},${fy-hh+dy}" stroke="var(--ink)" stroke-dasharray="4 3"/>`;
  o+=`<text class="t-ink" x="${fx+bb+dx/2+8}" y="${fy+dy/2+4}">length ${s.len} m</text>`;
  o+=`<text class="t-big" x="400" y="60">Volume = area of cross-section × length</text><text class="t-big" x="400" y="84">= (½ × ${s.b} × ${s.h}) × ${s.len}</text><text class="t-big" x="400" y="108">= ${f(A)} × ${s.len} = ${f(V)} m³</text>`;
  return o;
}
function drawClose(st0,st){
  let o=`<rect width="420" height="260" fill="var(--chalk)"/><text class="t-lab" x="14" y="22">CHEAT SHEET · WHAT EACH FORMULA MEANS</text>`;
  const rows=[["Rectangle / parallelogram","A = b × h","h is the perpendicular height"],["Triangle","A = ½ b h","half a parallelogram"],["Trapezium","A = ½ (a + b) h","average of parallel sides × h"],["Circle","C = 2πr, A = πr²","units: m for C, m² for A"],["Pythagoras","a² + b² = c²","c is the longest side"],["Prism","V = area × length","units: m³"]];
  const cur={para:0,tri:1,trap:2,circle:3,pyth:4,prism:5}[st.k];
  rows.forEach((r,i)=>{const y=48+i*34,on=i===cur;o+=`<rect x="10" y="${y-16}" width="400" height="30" rx="6" fill="${on?"var(--sun)":"var(--paper)"}" fill-opacity="${on?.35:1}" stroke="${on?"var(--ink)":"var(--line)"}"/><text class="t-ink" x="20" y="${y+3}">${r[0]}</text><text class="t-ink" x="200" y="${y+3}" style="font-weight:600">${r[1]}</text><text class="t-lab" x="404" y="${y+3}" text-anchor="end"> </text>`});
  if(st.k==="angles")o+=`<text class="t-body" x="14" y="256">Corresponding equal · alternate equal · co-interior add to 180°</text>`;
  else{const r=rows[cur]||rows[0];o+=`<text class="t-body" x="14" y="256">${r[0]}: ${r[2]}.</text>`}
  return o;
}
const steps=[
 {k:"para",lab:"Parallelogram",cap:"Slide the top of the shape sideways. The area doesn't change, because the base and the perpendicular height don't change.",speed:0,controls:["b","h","sh"],
  big:"<b>The big idea:</b> area = base × perpendicular height, for rectangles and parallelograms alike. Use the height at right angles to the base, not the slanted side.",
  exam:"The area of the parallelogram is base × perpendicular height = 8 × 5 = 40 m². The slanted side isn't used because area depends on the height at right angles to the base.",
  trap:"Multiplying by the slanted side instead of the perpendicular height.",chips:["area"],onStep:()=>{s.b=8;s.h=5;s.sh=3}},
 {k:"tri",lab:"Triangle",cap:"A triangle is exactly half of a parallelogram with the same base and height.",speed:0,controls:["b","h","sh"],
  big:"<b>The big idea:</b> area of a triangle = ½ × base × perpendicular height.",
  exam:"The area of the triangle is ½ × base × height = ½ × 8 × 5 = 20 m², which is half the area of the parallelogram with the same base and height.",
  trap:"Forgetting the ½.",chips:["area"],onStep:()=>{s.b=8;s.h=5;s.sh=3}},
 {k:"trap",lab:"Trapezium",cap:"A trapezium has two parallel sides, a and b. Its area is the average of those sides times the height.",speed:0,controls:["a","b","h"],
  big:"<b>The big idea:</b> area = ½ (a + b) × h. Add the parallel sides first, then halve, then times the height.",
  exam:"The area of the trapezium is ½ × (a + b) × h = ½ × (4 + 8) × 5 = 30 m².",
  trap:"Using a slanted side as the height.",chips:["area"],onStep:()=>{s.a=4;s.b=8;s.h=5}},
 {k:"circle",lab:"Circle",cap:"Press Play to unroll the edge of the circle. Its length, the circumference, is 2πr, a little over 6 radiuses.",speed:1,speedLabel:"unrolling",controls:["play","r"],
  big:"<b>The big idea:</b> circumference = 2πr (a length, in m) and area = πr² (a space, in m²). Don't mix them up.",
  exam:"For a circle with radius 3 m, the circumference is 2πr = 2 × π × 3 = 18.8 m, and the area is πr² = π × 3² = 28.3 m² (1 dp).",
  trap:"Using the diameter in πr². Halve the diameter first.",chips:["circ","carea"],onStep:()=>{s.unroll=0}},
 {k:"pyth",lab:"Pythagoras",cap:"The two small squares on the short sides add up exactly to the big square on the longest side. Press Play to pour them in.",speed:1,speedLabel:"pouring",controls:["play","ta","tb"],
  big:"<b>The big idea:</b> in a right-angled triangle, a² + b² = c², where c is the hypotenuse, the longest side opposite the right angle.",
  exam:"Using Pythagoras' theorem, c² = a² + b² = 3² + 4² = 9 + 16 = 25, so c = √25 = 5 m.",
  trap:"Adding the sides before squaring. Square first, then add, then square-root.",chips:["hyp"],onStep:()=>{s.pour=0;s.ta=3;s.tb=4}},
 {k:"angles",lab:"Parallel lines",cap:"A line crossing two parallel lines makes matching angles. Change the angle and watch the others follow.",speed:0,controls:["ang"],
  big:"<b>The big idea:</b> corresponding angles are equal, alternate angles are equal, and co-interior angles add to 180°.",
  exam:"The two angles marked are corresponding angles on parallel lines, so they are equal: both are 62°. The angle next to it on the straight line is 180° − 62° = 118°.",
  trap:"Giving the angle without the reason. Geometry answers need the rule named.",chips:["angle"]},
 {k:"prism",lab:"Volume",cap:"A prism has the same shape all the way through. Its volume is the area of that shape times the length.",speed:0,controls:["b","h","len"],
  big:"<b>The big idea:</b> volume of any prism = area of cross-section × length. Units are cubed: m³.",
  exam:"The cross-section is a triangle with area ½ × 8 × 5 = 20 m². The prism is 10 m long, so its volume is 20 × 10 = 200 m³.",
  trap:"Writing m² for a volume. Volume is in cubic units.",chips:["vol"],onStep:()=>{s.b=8;s.h=5;s.len=10}},
 {k:"test",lab:"Test yourself",cap:"Set each shape up with the sliders, then press Check.",speed:0,controls:["b","h","a","r","ta","tb"],
  big:"<b>Exam tip:</b> write the formula, substitute, calculate, and give units. That earns the marks even if the arithmetic slips.",
  chips:["area","hyp"],onStep:()=>{}}
];
const set=k=>(x,v)=>{s[k]=v};
// ---- kupu Māori: te reo terms for this machine, each checked in Te Aka Māori Dictionary (ta = word id). Sources and notes: te-reo-notes.md
const KUPU=[
 {mi:"horahanga",en:"area",ta:45667,chip:["area", "carea"]},
 {mi:"tapawhā whakarara",en:"parallelogram",ta:45970},
 {mi:"tapatoru",en:"triangle",ta:7470},
 {mi:"porowhita",en:"circle",ta:5893},
 {mi:"pūtoro",en:"radius",ta:45887},
 {mi:"paenga",en:"circumference, perimeter",ta:4870,chip:"circ"},
 {mi:"tāroa",en:"hypotenuse",ta:7603,chip:"hyp"},
 {mi:"koki hāngai",en:"right angle",ta:45739}];
Object.entries({"para": ["tapawhā whakarara", "horahanga"], "tri": ["tapatoru", "horahanga"], "trap": ["horahanga"], "circle": ["porowhita", "pūtoro", "paenga"], "pyth": ["tāroa", "koki hāngai"], "prism": ["horahanga"]}).forEach(([k,a])=>{const st=steps.find(x=>x.k===k);if(st)st.kupu=a});
StudyKit.mount({kupu:KUPU,
  eyebrow:"Maths · Measurement and geometry", title:"The shape workshop", crumb:"Year 9–10 maths · area, circles, Pythagoras, angles and volume · also NCEA Level 1 91947", homeHash:"y9",
  fig:"FIG. 09 · GRID PAPER", railTitle:"Measure anything",
  mainBox:"0 0 640 330", mainPhoneBig:true, mainLabel:"Shapes drawn on grid paper with their measurements", closeBox:"0 0 420 260",
  state:s, steps,
  controls:[{type:"play"},
    {type:"range",id:"b",label:"Base",min:2,max:14,step:1,get:()=>s.b,set:set("b"),fmt:()=>s.b+" m"},
    {type:"range",id:"h",label:"Height",min:2,max:11,step:1,get:()=>s.h,set:set("h"),fmt:()=>s.h+" m"},
    {type:"range",id:"sh",label:"Slide top",min:-4,max:8,step:1,get:()=>s.sh,set:set("sh"),fmt:()=>s.sh+" m"},
    {type:"range",id:"a",label:"Top side a",min:1,max:12,step:1,get:()=>s.a,set:set("a"),fmt:()=>s.a+" m"},
    {type:"range",id:"r",label:"Radius",min:1,max:7,step:0.5,get:()=>s.r,set:(x,v)=>{s.r=v;s.unroll=0},fmt:()=>s.r+" m"},
    {type:"range",id:"ta",label:"Side a",min:1,max:8,step:1,get:()=>s.ta,set:(x,v)=>{s.ta=v;s.pour=0},fmt:()=>s.ta+" m"},
    {type:"range",id:"tb",label:"Side b",min:1,max:8,step:1,get:()=>s.tb,set:(x,v)=>{s.tb=v;s.pour=0},fmt:()=>s.tb+" m"},
    {type:"range",id:"ang",label:"Angle",min:30,max:150,step:1,get:()=>s.ang,set:set("ang"),fmt:()=>s.ang+"°"},
    {type:"range",id:"len",label:"Length",min:2,max:16,step:1,get:()=>s.len,set:set("len"),fmt:()=>s.len+" m"}],
  tick:(x,dt,st)=>{if(st.k==="circle"){s.unroll=Math.min(1,s.unroll+dt*0.4);if(s.unroll>=1)s.playing=false}else if(st.k==="pyth"){s.pour=Math.min(1,s.pour+dt*0.4);if(s.pour>=1)s.playing=false}},
  drawMain, drawClose,
  chips:(x,st)=>{const c=Math.hypot(s.ta,s.tb);const area={para:s.b*s.h,tri:s.b*s.h/2,trap:(s.a+s.b)*s.h/2}[st.k];return{
    area:["AREA",(area!==undefined?f(area):f(s.b*s.h))+" m²",true],circ:["CIRCUMFERENCE",f(2*Math.PI*s.r)+" m",true],carea:["AREA",f(Math.PI*s.r*s.r)+" m²"],
    hyp:["HYPOTENUSE",f(c,2)+" m",true],angle:["ANGLES",`${s.ang}° and ${180-s.ang}°`,true],vol:["VOLUME",f(s.b*s.h/2*s.len)+" m³",true]}},
  challenges:[
    {q:"Make a right-angled triangle whose longest side is exactly 10 m.",check:()=>Math.abs(Math.hypot(s.ta,s.tb)-10)<1e-9,ok:"Yes: 6² + 8² = 36 + 64 = 100, and √100 = 10.",no:()=>`Not yet: √(${s.ta}² + ${s.tb}²) = ${f(Math.hypot(s.ta,s.tb),2)} m. Hint: double a 3-4-5 triangle.`},
    {q:"Make a trapezium with an area of exactly 36 m².",check:()=>(s.a+s.b)*s.h/2===36,ok:()=>`Yes: ½ × (${s.a} + ${s.b}) × ${s.h} = 36 m².`,no:()=>`Not yet: ½ × (${s.a} + ${s.b}) × ${s.h} = ${f((s.a+s.b)*s.h/2)} m².`},
    {q:"Find a circle whose area is bigger than 100 m².",check:()=>Math.PI*s.r*s.r>100,ok:()=>`Yes: π × ${s.r}² = ${f(Math.PI*s.r*s.r)} m².`,no:()=>`Not yet: ${f(Math.PI*s.r*s.r)} m².`}],
  papers:[{label:"NZQA: Mathematics and Statistics",url:"https://www2.nzqa.govt.nz/ncea/subjects/past-exams-and-exemplars/mathematics-and-statistics/"}],
  truth:"Shapes are drawn to scale on the grid (one square = 1 m), except the unrolled circle edge, which is drawn at half scale.",
  footer:"Area, circles, Pythagoras, angles with parallel lines and volume are Year 9–10 maths and are examined in NCEA Level 1 standard 91947."
});
})();
