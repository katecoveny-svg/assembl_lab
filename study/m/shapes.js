(()=>{
// ---------- shape workshop: every number is computed from the same dimensions that draw the shape
const s={b:8,h:5,sh:0,a:4,r:3,ang:62,len:10,unroll:0,pour:0,ta:3,tb:4};
const PX=18; // pixels per unit
const f=(x,d=1)=>{const r=Math.round(x*Math.pow(10,d))/Math.pow(10,d);return r.toLocaleString("en-NZ")};
// bench figure look (StudyKit.fig): the grid paper is a frosted lavender cutting mat on the paper floor; each shape is a cut acrylic
// tile with a little thickness, so the top face keeps exactly the measured outline
const F=StudyKit.fig,PAL=F.palette,TINT=PAL.case.lavender,TD=F.deep(TINT),PR=PAL.product,HOT="#D2557A",RAIL="#6E7A8C";
function grid(){let o="";for(let x=20;x<=620;x+=PX)o+=`<line x1="${x}" x2="${x}" y1="20" y2="310" stroke="${TD}" stroke-opacity=".32" stroke-width=".6"/>`;for(let y=20;y<=310;y+=PX)o+=`<line x1="20" x2="620" y1="${y}" y2="${y}" stroke="${TD}" stroke-opacity=".32" stroke-width=".6"/>`;return o}
function mat(){return F.floor(640,330,{grid:false})+F.acrylic(12,14,612,302,{tint:TINT,d:8,r:12,opacity:.32,shadowLen:30})+`<rect x="20" y="20" width="600" height="290" fill="#fff" fill-opacity=".45"/>`}
// a cut tile: floor shadow, the edge (thickness) and the top face; op is the top face's fill opacity
function slab(d,col,op,extra){const m=F.mat("painted",col);extra=extra||"";
  return `<path d="${d}" transform="translate(5,6)" fill="${PAL.shadow}" opacity=".12"/><path d="${d}" transform="translate(2.5,3)" fill="${m.shade}" fill-opacity="${Math.min(1,op+.35)}" stroke="${m.stroke}" stroke-width="1.2" stroke-linejoin="round"/><path d="${d}" fill="${col}" fill-opacity="${op}" stroke="${m.stroke}" stroke-width="2" stroke-linejoin="round" ${extra}/>`}
const X0=74,Y0=272;
function dimLabel(x1,y1,x2,y2,t,off=14){const mx=(x1+x2)/2,my=(y1+y2)/2;return `<text class="t-ink" x="${mx}" y="${my+off}" text-anchor="middle">${t}</text>`}
function drawMain(st0,st){
  let o=mat()+grid();const B=s.b*PX,H=s.h*PX,SH=s.sh*PX;
  if(st.k==="para"){
    o+=slab(`M${X0},${Y0} L${X0+B},${Y0} L${X0+B+SH},${Y0-H} L${X0+SH},${Y0-H}Z`,PR.butter,.8);
    o+=`<line x1="${X0+SH}" x2="${X0+SH}" y1="${Y0-H}" y2="${Y0}" stroke="${HOT}" stroke-dasharray="4 3" stroke-width="1.6"/><path d="M${X0+SH},${Y0-10} h10 v10" fill="none" stroke="${HOT}"/>`;
    o+=dimLabel(X0,Y0,X0+B,Y0,`base ${s.b} m`)+`<text class="t-ink" x="${X0+SH+8}" y="${Y0-H/2}">height ${s.h} m</text>`;
    o+=`<text class="t-big" x="360" y="60">Area = base × height</text><text class="t-big" x="360" y="84">= ${s.b} × ${s.h} = ${s.b*s.h} m²</text><text class="t-body" x="360" y="112">Slide the top: the area stays the same.</text>`;return o}
  if(st.k==="tri"){
    o+=`<path d="M${X0},${Y0} L${X0+B},${Y0} L${X0+B+SH},${Y0-H} L${X0+SH},${Y0-H}Z" fill="#fff" fill-opacity=".4" stroke="${TD}" stroke-width="1.2" stroke-dasharray="4 3"/>`;
    o+=slab(`M${X0},${Y0} L${X0+B},${Y0} L${X0+SH},${Y0-H}Z`,PR.blueberry,.75);
    o+=`<line x1="${X0+SH}" x2="${X0+SH}" y1="${Y0-H}" y2="${Y0}" stroke="${HOT}" stroke-dasharray="4 3" stroke-width="1.6"/>`+dimLabel(X0,Y0,X0+B,Y0,`base ${s.b} m`)+`<text class="t-ink" x="${X0+SH+8}" y="${Y0-H/2}">height ${s.h} m</text>`;
    o+=`<text class="t-big" x="360" y="60">Area = ½ × base × height</text><text class="t-big" x="360" y="84">= ½ × ${s.b} × ${s.h} = ${f(s.b*s.h/2)} m²</text><text class="t-body" x="360" y="112">Every triangle is half a parallelogram.</text>`;return o}
  if(st.k==="trap"){const A=s.a*PX;const off=(B-A)/2;
    o+=slab(`M${X0},${Y0} L${X0+B},${Y0} L${X0+off+A},${Y0-H} L${X0+off},${Y0-H}Z`,PR.lime,.8);
    o+=dimLabel(X0,Y0,X0+B,Y0,`b = ${s.b} m`)+dimLabel(X0+off,Y0-H,X0+off+A,Y0-H,`a = ${s.a} m`,-8)+`<line x1="${X0+B/2}" x2="${X0+B/2}" y1="${Y0-H}" y2="${Y0}" stroke="${HOT}" stroke-dasharray="4 3"/><text class="t-ink" x="${X0+B/2+8}" y="${Y0-H/2}">h = ${s.h} m</text>`;
    o+=`<text class="t-big" x="360" y="60">Area = ½ (a + b) h</text><text class="t-big" x="360" y="84">= ½ × (${s.a} + ${s.b}) × ${s.h} = ${f((s.a+s.b)*s.h/2)} m²</text><text class="t-body" x="360" y="112">The average of the parallel sides × height.</text>`;return o}
  if(st.k==="circle"){const R=s.r*PX,cx=170,cy=150,C=2*Math.PI*s.r,m=F.mat("painted",PR.peach),k=1-s.unroll;
    // a round tile; as the edge unrolls the tile empties and its rim is peeled off onto the tape below
    if(k>0.01)o+=`<circle cx="${cx+5}" cy="${cy+6}" r="${R}" fill="${PAL.shadow}" opacity="${.12*k}"/><circle cx="${cx+2.5}" cy="${cy+3}" r="${R}" fill="${m.shade}" fill-opacity="${.9*k}" stroke="${m.stroke}" stroke-opacity="${k}" stroke-width="1.2"/>`;
    o+=`<circle cx="${cx}" cy="${cy}" r="${R}" fill="${PR.peach}" fill-opacity="${.8*k}" stroke="${m.stroke}" stroke-width="2.4" stroke-dasharray="${2*Math.PI*R*(1-s.unroll)} 9999"/>`;
    if(s.unroll<1)o+=`<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="1" stroke-dasharray="${2*Math.PI*R*(1-s.unroll)} 9999" transform="translate(-1.5,-1.5)"/>`;
    o+=`<line x1="${cx}" x2="${cx+R}" y1="${cy}" y2="${cy}" stroke="${HOT}" stroke-width="1.6"/><text class="t-ink" x="${cx+R/2}" y="${cy-6}" text-anchor="middle">r = ${s.r} m</text>`;
    const L=Math.min(560,C*PX*0.5);if(s.unroll>0)o+=`<path d="M40,${305} h${L*s.unroll}" stroke="${PAL.shadow}" stroke-opacity=".12" stroke-width="4" stroke-linecap="round"/><line x1="40" x2="${40+L*s.unroll}" y1="300" y2="300" stroke="${m.stroke}" stroke-width="4.5" stroke-linecap="round"/><line x1="40" x2="${40+L*s.unroll}" y1="300" y2="300" stroke="${PR.peach}" stroke-width="2.4" stroke-linecap="round"/>`;
    o+=`<text class="t-lab" x="40" y="292">THE EDGE UNROLLED (HALF SCALE): ${f(C*s.unroll)} m</text>`;
    o+=`<text class="t-big" x="380" y="60">Circumference = 2πr = ${f(C)} m</text><text class="t-big" x="380" y="84">Area = πr² = ${f(Math.PI*s.r*s.r)} m²</text><text class="t-body" x="380" y="112">π ≈ 3.14: any circle's edge is about 3.14 diameters.</text>`;return o}
  if(st.k==="pyth"){const c=Math.hypot(s.ta,s.tb),S=Math.min(18,120/c),a=s.ta*S,b=s.tb*S,ox=230,oy=262;
    // three acrylic trays: the two small squares pour into the square on the hypotenuse
    const tray=(d,col,frac)=>{const m=F.mat("painted",col);return `<path d="${d}" transform="translate(4,5)" fill="${PAL.shadow}" opacity=".1"/><path d="${d}" transform="translate(2.5,3)" fill="${TD}" fill-opacity=".35" stroke="${TD}" stroke-width="1"/><path d="${d}" fill="#fff" fill-opacity=".55" stroke="${m.stroke}" stroke-width="1.6" stroke-linejoin="round"/><path d="${d}" fill="${col}" fill-opacity="${r2(.85*frac)}"/>`};
    const r2=v=>Math.round(v*100)/100;
    const dx=a,dy=-b,nx=dy,ny=-dx;const P1=[ox,oy],P2=[ox+dx,oy+dy],P3=[P2[0]+nx,P2[1]+ny],P4=[ox+nx,oy+ny];
    o+=tray(`M${P1} L${P2} L${P3} L${P4}Z`,PR.butter,.18+.82*s.pour);
    o+=tray(`M${ox},${oy} h${a} v${a} h${-a}z`,PR.blueberry,1-s.pour);
    o+=tray(`M${ox+a},${oy-b} h${b} v${b} h${-b}z`,PR.strawberry,1-s.pour);
    o+=slab(`M${ox},${oy} h${a} v${-b}z`,"#FFFFFF",1);
    o+=`<path d="M${ox+a-9},${oy} v-9 h9" fill="none" stroke="${RAIL}" stroke-width="1.2"/>`;
    o+=`<text class="t-ink" x="${ox+a/2}" y="${oy+a/2+4}" text-anchor="middle">${s.ta*s.ta}</text><text class="t-ink" x="${ox+a+b/2}" y="${oy-b/2+4}" text-anchor="middle">${s.tb*s.tb}</text><text class="t-ink" x="${(P1[0]+P3[0])/2}" y="${(P1[1]+P3[1])/2+4}" text-anchor="middle">${f(c*c)}</text>`;
    o+=`<text class="t-big" x="440" y="236">a² + b² = c²</text><text class="t-big" x="440" y="260">${s.ta*s.ta} + ${s.tb*s.tb} = ${f(c*c)}</text><text class="t-big" x="440" y="284">c = √${f(c*c)} = ${f(c,2)} m</text>`;return o}
  if(st.k==="angles"){const a=s.ang*Math.PI/180;const y1=110,y2=230;
    // two steel rails and a strawberry rod crossing them
    const rod=(x1,yA,x2,yB,c,lo,hi,w)=>`<line x1="${x1+3}" y1="${yA+4}" x2="${x2+3}" y2="${yB+4}" stroke="${PAL.shadow}" stroke-opacity=".12" stroke-width="${w+1}" stroke-linecap="round"/><line x1="${x1}" y1="${yA}" x2="${x2}" y2="${yB}" stroke="${lo}" stroke-width="${w}" stroke-linecap="round"/><line x1="${x1}" y1="${yA-1.2}" x2="${x2}" y2="${yB-1.2}" stroke="${hi}" stroke-width="${w*.35}" stroke-linecap="round"/>`;
    o+=rod(40,y1,600,y1,0,RAIL,PAL.steel,6)+rod(40,y2,600,y2,0,RAIL,PAL.steel,6);
    o+=`<path d="M300,${y1-12} l8,6 l-8,6 M500,${y1-12} l8,6 l-8,6" fill="none" stroke="var(--ink)" stroke-width="1.4"/><path d="M300,${y2-12} l8,6 l-8,6 M500,${y2-12} l8,6 l-8,6" fill="none" stroke="var(--ink)" stroke-width="1.4"/>`;
    const dx=(y2-y1)/Math.tan(a);const xA=300-dx/2,xB=300+dx/2;
    const arc=(x,y,from,to,c)=>{const r=26,p1=[x+r*Math.cos(from),y-r*Math.sin(from)],p2=[x+r*Math.cos(to),y-r*Math.sin(to)];return `<path d="M${x},${y} L${p1} A${r},${r} 0 0,0 ${p2}Z" fill="${c}" fill-opacity=".7" stroke="${F.mat("painted",c).stroke}" stroke-width="1"/>`};
    o+=arc(xB,y1,0,a,PR.butter)+arc(xA,y2,0,a,PR.butter)+arc(xA,y2,a,Math.PI,PR.blueberry);
    o+=rod(xB+60/Math.tan(a),y1-60,xA-60/Math.tan(a),y2+60,0,"#C2456A",PR.strawberry,4.5);
    o+=`<text class="t-ink" x="${xB+34}" y="${y1-8}">${s.ang}°</text><text class="t-ink" x="${xA+34}" y="${y2-8}">${s.ang}°</text><text class="t-ink" x="${xA-60}" y="${y2-8}">${180-s.ang}°</text>`;
    o+=`<text class="t-big" x="380" y="290">Corresponding angles are equal</text>`;return o}
  // prism volume: a solid painted block with a lit sloping face and a shaded side, hidden edges dashed
  const A=s.b*s.h/2,V=A*s.len;const fx=120,fy=250,bb=s.b*PX*0.8,hh=s.h*PX*0.8,d=s.len*PX*0.6,dx=d*0.7,dy=-d*0.45,m=F.mat("painted",PR.peach);
  o+=F.shadow(fx+4,fy,bb+dx*.7,{len:56,opacity:.14});
  o+=`<path d="M${fx},${fy} L${fx+dx},${fy+dy} L${fx+bb+dx},${fy+dy}" fill="none" stroke="${m.stroke}" stroke-opacity=".6" stroke-dasharray="4 3"/><path d="M${fx+dx},${fy+dy} L${fx+bb/2+dx},${fy-hh+dy}" stroke="${m.stroke}" stroke-opacity=".6" stroke-dasharray="4 3"/>`;
  o+=`<path d="M${fx+bb},${fy} L${fx+bb+dx},${fy+dy} L${fx+bb/2+dx},${fy-hh+dy} L${fx+bb/2},${fy-hh}Z" fill="${m.hi}" fill-opacity=".92" stroke="${m.stroke}" stroke-width="1.6" stroke-linejoin="round"/><path d="M${fx+bb/2},${fy-hh} L${fx+bb/2+dx},${fy-hh+dy}" stroke="${m.stroke}" stroke-width="1.6"/>`;
  o+=`<path d="M${fx},${fy} L${fx+bb},${fy} L${fx+bb/2},${fy-hh}Z" fill="${PR.peach}" stroke="${m.stroke}" stroke-width="2" stroke-linejoin="round"/><path d="M${fx+bb*.18},${fy-hh*.2} L${fx+bb*.44},${fy-hh*.78}" stroke="#fff" stroke-opacity=".7" stroke-width="2.4" stroke-linecap="round"/>`;
  o+=`<text class="t-ink" x="${fx+bb+dx/2+8}" y="${fy+dy/2+4}">length ${s.len} m</text>`;
  o+=`<text class="t-big" x="400" y="60">Volume = area of cross-section × length</text><text class="t-big" x="400" y="84">= (½ × ${s.b} × ${s.h}) × ${s.len}</text><text class="t-big" x="400" y="108">= ${f(A)} × ${s.len} = ${f(V)} m³</text>`;
  return o;
}
function drawClose(st0,st){
  let o=F.floor(420,260)+`<text class="t-lab" x="14" y="22">CHEAT SHEET · WHAT EACH FORMULA MEANS</text>`;
  const rows=[["Rectangle / parallelogram","A = b × h","h is the perpendicular height"],["Triangle","A = ½ b h","half a parallelogram"],["Trapezium","A = ½ (a + b) h","average of parallel sides × h"],["Circle","C = 2πr, A = πr²","units: m for C, m² for A"],["Pythagoras","a² + b² = c²","c is the longest side"],["Prism","V = area × length","units: m³"]];
  const cur={para:0,tri:1,trap:2,circle:3,pyth:4,prism:5}[st.k],sw=[PR.butter,PR.blueberry,PR.lime,PR.peach,PR.strawberry,PR.peach];
  rows.forEach((r,i)=>{const y=48+i*34,on=i===cur;o+=`<rect x="13" y="${y-13}" width="400" height="30" rx="10" fill="${PAL.shadow}" opacity=".07"/><rect x="10" y="${y-16}" width="400" height="30" rx="10" fill="${on?TINT:"#FFFFFF"}" stroke="${on?TD:PAL.pill.line}" stroke-width="${on?1.6:1}"/><rect x="${on?16:18}" y="${y-8}" width="10" height="14" rx="3" fill="${sw[i]}" stroke="${F.mat("painted",sw[i]).stroke}" stroke-width=".8"/><text class="t-ink" x="32" y="${y+3}">${r[0]}</text><text class="t-ink" x="200" y="${y+3}" style="font-weight:600">${r[1]}</text><text class="t-lab" x="404" y="${y+3}" text-anchor="end"> </text>`});
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
// ---------- the 3D bench: a workshop of cutting mats. Shapes are cut tiles that really move: the parallelogram's corner slides
// across to make a rectangle, a second triangle or trapezium spins in to show the "half", the circle's rim peels off onto a tape,
// liquid pours from the two small squares into the big one, and a prism stacks up slice by slice on a turntable.
function shapes3d(S){const {THREE,mat,PAL:P}=S;const V3=(x,y,z)=>new THREE.Vector3(x,y,z);const TOP=.3,MT=TOP+.012;
  const ZA=V3(0,0,0),ZC=V3(-11,0,.4),ZP=V3(10.5,0,.2),ZG=V3(-5.6,0,-9),ZV=V3(6,0,-9.2);
  const plinth=(c,w,d,tint)=>{const p=S.rbox(w,.3,d,.12,mat("plastic",tint,{rough:.55,coat:.2}));p.position.set(c.x,.15,c.z);S.scene.add(p);return p};
  // a white cutting mat with an exact 1 m grid, lying flat on a plinth
  function gridMat(c,u0,u1,v0,v1,k,tint){plinth(c,(u1-u0)*k+.8,(v1-v0)*k+.8,tint);const W=(u1-u0)*k,PW=1024,PH=Math.round(PW*(v1-v0)/(u1-u0));
    const p=S.panel(PW,PH,W);p.rotation.x=-Math.PI/2;p.position.set(c.x+(u0+u1)/2*k,MT-.004,c.z-(v0+v1)/2*k);S.scene.add(p);
    p.redraw((g,w,h)=>{g.fillStyle="rgba(255,255,255,.97)";g.beginPath();g.roundRect(0,0,w,h,16);g.fill();const sx=w/(u1-u0);
      for(let i=0;i<=u1-u0;i++){g.strokeStyle=(i+u0)%5?"rgba(106,80,190,.16)":"rgba(106,80,190,.34)";g.lineWidth=(i+u0)%5?1.5:2.5;g.beginPath();g.moveTo(i*sx,0);g.lineTo(i*sx,h);g.stroke()}
      for(let j=0;j<=v1-v0;j++){g.strokeStyle=(j+v0)%5?"rgba(106,80,190,.16)":"rgba(106,80,190,.34)";g.lineWidth=(j+v0)%5?1.5:2.5;g.beginPath();g.moveTo(0,h-j*sx);g.lineTo(w,h-j*sx);g.stroke()}});return p}
  // a cut tile from a polygon in metres; the mesh's own origin is the polygon origin, lying on the mat
  const TH=.13;
  function tileGeo(pts,k,th=TH){const sh=new THREE.Shape();pts.forEach(([u,v],i)=>i?sh.lineTo(u*k,v*k):sh.moveTo(u*k,v*k));sh.closePath();
    const g=new THREE.ExtrudeGeometry(sh,{depth:th,bevelEnabled:true,bevelThickness:.015,bevelSize:.015,bevelSegments:2});g.rotateX(-Math.PI/2);return g}
  function tile(parent,col){const pivot=S.group(parent);const m=S.mesh(new THREE.BufferGeometry(),mat("plastic",col,{rough:.35}));pivot.add(m);
    return {pivot,m,set(pts,k,th){m.geometry.dispose();m.geometry=tileGeo(pts,k,th)}}}
  // dashed glowing lines (heights, radii): instanced dashes
  function dashes(parent,n,col){const sw=S.swarm(n,new THREE.BoxGeometry(1,1,1),mat("plastic",col,{rough:.35}));parent.add(sw);const q=new THREE.Quaternion(),X=V3(1,0,0);
    sw.line=(a,b,y)=>{const d=b.clone().sub(a),L=d.length(),cnt=Math.min(n,Math.max(1,Math.floor(L/.14)));q.setFromUnitVectors(X,d.clone().normalize());
      for(let i=0;i<n;i++){if(i<cnt){const p=a.clone().addScaledVector(d,(i+.5)/cnt);sw.putS(i,p.x,y,p.z,L/cnt*.55,.03,.045,q)}else sw.put(i,0,-9,0,.0001)}sw.done()};
    sw.off=()=>{for(let i=0;i<n;i++)sw.put(i,0,-9,0,.0001);sw.done()};return sw}
  const hitM=new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false});
  const handle=(parent,col)=>{const h=S.sphere(.11,mat("plastic","#ffffff",{rough:.3}));h.add(S.torus(.12,.035,mat("plastic",col,{rough:.3}),{rot:[Math.PI/2,0,0],cast:false}));
    h.add(S.mesh(new THREE.SphereGeometry(.34,10,8),hitM,{cast:false}));parent.add(h);return h};

  // ---------------------------------------------------------------- area station: parallelogram, triangle, trapezium
  const KA=.28,U0=-9,V0=-6;gridMat(ZA,-13,13,-7,7,KA,P.case.lavender);
  const area=S.group();area.position.set(ZA.x+U0*KA,MT,ZA.z-V0*KA);   // local origin = the shape's bottom-left base corner
  const L=(u,v,y=0)=>V3(u*KA,y,-v*KA);
  const tA=tile(area,P.product.butter),tB=tile(area,P.product.butter),ghost=S.mesh(new THREE.BufferGeometry(),mat("flat",P.case.lavender,{opacity:.55,depthWrite:false}),{cast:false});ghost.renderOrder=1;area.add(ghost);
  const ghostEdge=dashes(area,90,P.deep.lavender);const hDash=dashes(area,40,"#D2557A");const corner=S.group(area);
  corner.add(S.box(.16,.03,.03,mat("plastic","#D2557A"),{at:[.08,0,0]}));corner.add(S.box(.03,.03,.16,mat("plastic","#D2557A"),{at:[.16,0,-.08]}));
  const hSh=handle(area,P.deep.butter),hB=handle(area,P.deep.lavender),hH=handle(area,"#D2557A");
  S.dragger(hSh,{normal:V3(0,1,0),move:p=>{const q=area.worldToLocal(p.clone());const st=S.api.state;const u=q.x/KA;if(curK==="trap"||curK==="test")st.a=S.clamp(Math.round(2*(u-(st.b/2))),1,12);else st.sh=S.clamp(Math.round(u-st.b/2),-4,8)}});
  S.dragger(hB,{normal:V3(0,1,0),move:p=>{const q=area.worldToLocal(p.clone());S.api.state.b=S.clamp(Math.round(q.x/KA),2,14)}});
  S.dragger(hH,{normal:V3(0,1,0),move:p=>{const q=area.worldToLocal(p.clone());S.api.state.h=S.clamp(Math.round(-q.z/KA),2,11)}});
  const lBase=S.label({off:[0,34]}),lH=S.label({off:[20,0]}),lA2=S.label({off:[0,-40]}),lFA=S.label({cls:"hot big",off:[0,-30],lead:false}),lHow=S.label({off:[0,-24],lead:false});
  let aKey="",cyc=0,curK="para",pOX=0,pOY=0;

  // ---------------------------------------------------------------- circle station: a peach disc whose rim peels off onto a tape (tape at half scale)
  const KC=.3;gridMat(ZC,-12,12,-6,6,KC,P.case.peach);
  const circ=S.group();circ.position.set(ZC.x-6*KC,MT,ZC.z-1*KC);
  const disc=S.mesh(new THREE.CylinderGeometry(1,1,TH,72),mat("plastic",P.product.peach,{rough:.35}));circ.add(disc);
  const rimM=mat("plastic","#E57E45",{rough:.3});const rim=S.mesh(new THREE.BufferGeometry(),rimM);circ.add(rim);
  const tape=S.mesh(new THREE.BoxGeometry(1,1,1),rimM);circ.add(tape);const ticks=S.swarm(8,new THREE.BoxGeometry(1,1,1),mat("plastic",P.ink,{rough:.4}));circ.add(ticks);
  const rad=S.mesh(new THREE.BoxGeometry(1,1,1),mat("plastic","#D2557A",{rough:.35}));circ.add(rad);const ctr=S.sphere(.05,mat("plastic",P.ink));circ.add(ctr);
  const hR=handle(circ,"#D2557A");S.dragger(hR,{normal:V3(0,1,0),move:p=>{const q=circ.worldToLocal(p.clone());const st=S.api.state;const r=S.clamp(Math.round(Math.hypot(q.x,q.z)/KC*2)/2,1,7);if(r!==st.r){st.r=r;st.unroll=0}}});
  let rimKey="";const lR=S.label({off:[0,-26]}),lTape=S.label({off:[0,34]}),lFC=S.label({cls:"hot big",off:[0,-30],lead:false}),lPi=S.label({off:[0,-30]});

  // ---------------------------------------------------------------- Pythagoras station: three square trays on the sides of a right-angled triangle
  plinth(ZP,7.4,7.4,P.case.blush);const py=S.group();py.position.set(ZP.x,MT,ZP.z);
  const triT=tile(py,"#ffffff");const pyM=S.group(py);const pyLiq=[0,1,2].map(i=>{const m=S.mesh(new THREE.BufferGeometry(),mat("liquid",[P.product.blueberry,P.product.strawberry,P.product.butter][i],{fresh:true,opacity:.85}),{cast:false});m.renderOrder=3;py.add(m);return m});
  const pyGrid=S.swarm(90,new THREE.BoxGeometry(1,1,1),mat("flat",P.deep.lavender,{opacity:.4}));py.add(pyGrid);
  const pours=S.puffs(60,"#ffffff");py.add(pours);const pp=Array.from({length:60},(_,i)=>({u:Math.random(),src:i%2}));
  const rAng=S.group(py);rAng.add(S.box(.18,.03,.03,mat("plastic",P.ink),{at:[-.09,TH+.02,0]}));rAng.add(S.box(.03,.03,.18,mat("plastic",P.ink),{at:[-.18,TH+.02,-.09]}));
  let pyKey="",KP=.4,sq=[];const lSa=S.label({off:[0,0],lead:false}),lSb=S.label({off:[0,0],lead:false}),lSc=S.label({off:[0,0],lead:false}),lFP=S.label({cls:"hot big",off:[0,-30],lead:false});
  const hA=handle(py,P.product.blueberry),hBt=handle(py,P.product.strawberry);
  S.dragger(hA,{normal:V3(0,1,0),move:p=>{const q=py.worldToLocal(p.clone());const st=S.api.state;const a=S.clamp(Math.round(q.x/KP-pOX),1,8);if(a!==st.ta){st.ta=a;st.pour=0}}});
  S.dragger(hBt,{normal:V3(0,1,0),move:p=>{const q=py.worldToLocal(p.clone());const st=S.api.state;const b=S.clamp(Math.round(-q.z/KP-pOY),1,8);if(b!==st.tb){st.tb=b;st.pour=0}}});
  function trayAt(c,col,out){const n=c.length,g=S.group(pyM);const wallM=mat("acrylic",col,{opacity:.35}),floorM=mat("plastic","#ffffff",{rough:.5});
    g.add(S.mesh(tileGeo(c,KP,.04),floorM));
    for(let i=0;i<n;i++){const a=c[i],b=c[(i+1)%n],dx=(b[0]-a[0])*KP,dz=-(b[1]-a[1])*KP,Lw=Math.hypot(dx,dz);const w=S.box(Lw+.04,.3,.04,wallM,{cast:false});
      w.position.set((a[0]+b[0])/2*KP,.15,-(a[1]+b[1])/2*KP);w.rotation.y=-Math.atan2(dz,dx);w.renderOrder=4;g.add(w)}
    out.push(c);return g}

  // ---------------------------------------------------------------- parallel lines station: two steel rails and a strawberry rod you can turn
  plinth(ZG,8.4,4.6,P.case.mint);const ag=S.group();ag.position.set(ZG.x,MT,ZG.z);const GAP=1.0;
  for(const z of [-GAP,GAP]){ag.add(S.cyl(.06,.06,7.6,mat("metal",P.steel,{rough:.25}),{rot:[0,0,Math.PI/2],at:[0,.07,z]}));
    for(const x of [0,2.2]){const ch=S.cyl(0,.09,.22,mat("plastic",P.ink,{rough:.4}),{rot:[0,0,-Math.PI/2],at:[x,.07,z-.22],seg:3});ag.add(ch)}}
  const rod=S.cyl(.055,.055,1,mat("plastic",P.product.strawberry,{rough:.3}),{seg:20});ag.add(rod);
  const wedge=c=>{const m=S.mesh(new THREE.BufferGeometry(),mat("plastic",c,{rough:.4}));ag.add(m);return m};
  const wU=wedge(P.product.butter),wL=wedge(P.product.butter),wL2=wedge(P.product.blueberry);let angKey=-1;
  const sector=(t0,t1,r)=>{const sh=new THREE.Shape();sh.moveTo(0,0);sh.absarc(0,0,r,t0,t1,false);sh.lineTo(0,0);const g=new THREE.ExtrudeGeometry(sh,{depth:.04,bevelEnabled:false,curveSegments:32});g.rotateX(-Math.PI/2);return g};
  const hG=handle(ag,P.product.strawberry);S.dragger(hG,{normal:V3(0,1,0),move:p=>{const q=ag.worldToLocal(p.clone());S.api.state.ang=S.clamp(Math.round(Math.atan2(-q.z,q.x)*180/Math.PI),30,150)}});
  const lAu=S.label({off:[30,-20]}),lAl=S.label({off:[30,-20]}),lAl2=S.label({off:[-30,-20]}),lFG=S.label({cls:"hot big",off:[0,-30],lead:false});

  // ---------------------------------------------------------------- prism station: a turntable; the prism builds up one 1 m slice at a time
  const KV=.24;plinth(ZV,6.6,5.6,P.case.butter);const tt=S.group();tt.position.set(ZV.x,TOP,ZV.z);
  tt.add(S.cyl(2.5,2.6,.12,mat("plastic","#ffffff",{rough:.4}),{at:[0,.06,0],seg:64}));const spin=S.group(tt);spin.position.y=.12;
  spin.add(S.cyl(2.35,2.35,.03,mat("plastic",P.case.lavender,{rough:.4}),{at:[0,.015,0],seg:64}));
  const slices=S.swarm(16,new THREE.BufferGeometry(),mat("plastic",P.product.peach,{rough:.35}),{colors:true,cast:true});slices.castShadow=true;slices.receiveShadow=true;spin.add(slices);
  const face=S.mesh(new THREE.BufferGeometry(),mat("glow",P.product.peach,.5),{cast:false});spin.add(face);let pKey="",pClock=0;
  const lCross=S.label({off:[-30,-20]}),lLen=S.label({off:[30,20]}),lFV=S.label({cls:"hot big",off:[0,-30],lead:false}),lSl=S.label({off:[0,-30],lead:false});

  // ---------------------------------------------------------------- views
  S.view("area",[ZA.x-.7,5.0,ZA.z+6.6],[ZA.x-.9,.3,ZA.z+.6],{min:3,max:24});
  S.view("circle",[ZC.x+.4,6.0,ZC.z+7.0],[ZC.x,.4,ZC.z-.2],{min:3,max:24});
  S.view("pyth",[ZP.x+.3,8.6,ZP.z+7.4],[ZP.x,.3,ZP.z-.3],{min:3,max:24});
  S.view("angles",[ZG.x+.4,6.0,ZG.z+6.8],[ZG.x,.3,ZG.z],{min:3,max:24});
  S.view("prism",[ZV.x+3.4,5.8,ZV.z+8.8],[ZV.x+.3,.9,ZV.z+.4],{min:3,max:24});
  S.view("all",[0,21,21],[0,0,-3.8],{min:6,max:60});
  const zoneOf=k=>["para","tri","trap"].includes(k)?"area":k==="circle"?"circle":k==="pyth"?"pyth":k==="angles"?"angles":k==="prism"?"prism":"all";
  const C={area:ZA,circle:ZC,pyth:ZP,angles:ZG,prism:ZV,all:V3(0,0,-3.5)};
  const LAB={area:[lBase,lH,lA2,lFA,lHow],circle:[lR,lTape,lFC,lPi],pyth:[lSa,lSb,lSc,lFP],angles:[lAu,lAl,lAl2,lFG],prism:[lCross,lLen,lFV,lSl]};
  S.goView("area",true);const tmp=V3(0,0,0),wp=(g,v)=>g.localToWorld(v.clone());let zone="area";
  return {
    step(st){zone=zoneOf(st.k);S.goView(zone);const c=C[zone];S.setShadowBox(zone==="all"?20:zone==="pyth"?5:6,[c.x,0,c.z]);cyc=0;pClock=0;
      Object.values(LAB).flat().forEach(l=>l.hide())},
    update(s,st,dt,t){const k=st.k;curK=k;const all=zone==="all",showL=z=>zone===z;cyc+=dt;pClock+=dt;
      // ---- area station
      {const mode=k==="para"||k==="tri"?k:"trap",b=s.b,h=s.h,sh=s.sh,a=s.a,off=(b-a)/2;const key=[mode,b,h,sh,a].join("|");
        const par=[[0,0],[b,0],[b+sh,h],[sh,h]];
        if(key!==aKey){aKey=key;
          if(mode==="para"){const cut=sh>=0?[[0,0],[sh,0],[sh,h]]:[[b+sh,0],[b,0],[b+sh,h]],rest=sh>=0?[[sh,0],[b,0],[b+sh,h],[sh,h]]:[[0,0],[b+sh,0],[b+sh,h],[sh,h]];
            if(sh===0){tA.set(par,KA);tB.m.visible=false}else{tA.set(rest,KA);tB.set(cut,KA);tB.m.visible=true}tA.m.material=tB.m.material=mat("plastic",P.product.butter,{rough:.35});
            ghost.geometry.dispose();ghost.geometry=tileGeo([[sh,0],[sh+b,0],[sh+b,h],[sh,h]],KA,.01)}
          else if(mode==="tri"){tA.set([[0,0],[b,0],[sh,h]],KA);tB.set([[0,0],[b,0],[sh,h]],KA);tB.m.visible=true;tA.m.material=mat("plastic",P.product.blueberry,{rough:.35});tB.m.material=mat("plastic","#C9DCF6",{rough:.35});
            ghost.geometry.dispose();ghost.geometry=tileGeo(par,KA,.01)}
          else{const tr=[[0,0],[b,0],[off+a,h],[off,h]];tA.set(tr,KA);tB.set(tr,KA);tB.m.visible=true;tA.m.material=mat("plastic",P.product.lime,{rough:.35});tB.m.material=mat("plastic","#D6EDB8",{rough:.35});
            ghost.geometry.dispose();ghost.geometry=tileGeo([[0,0],[a+b,0],[a+b+off,h],[off,h]],KA,.01)}}
        // the motion: one 7-second cycle (rest, move, hold, back)
        const ph=S.REDUCED?0:(cyc%7)/7;const d=ph<.18?0:ph<.5?S.ease((ph-.18)/.32):ph<.85?1:1-S.ease((ph-.85)/.15);const lift=Math.sin(d*Math.PI)*.5;
        tA.pivot.position.set(0,0,0);tA.pivot.rotation.y=0;tA.m.position.set(0,0,0);
        if(mode==="para"){tB.m.position.set(0,0,0);tB.pivot.position.set((sh>=0?b:-b)*KA*d,lift,0);tB.pivot.rotation.y=0}
        else{const M=mode==="tri"?[(b+sh)/2,h/2]:[(b+off+a)/2,h/2];tB.pivot.position.set(M[0]*KA,lift+.002,-M[1]*KA);tB.m.position.set(-M[0]*KA,0,M[1]*KA);tB.pivot.rotation.y=Math.PI*d;tB.m.visible=d>.01}
        ghost.visible=mode!=="para"||sh!==0;
        hDash.line(L(mode==="trap"?b/2:sh,0),L(mode==="trap"?b/2:sh,h),TH+.03);corner.position.copy(L(mode==="trap"?b/2:sh,0,TH+.03));corner.rotation.y=0;ghostEdge.off();
        hSh.position.copy(mode==="trap"?L(off+a,h,TH+.12):L(sh+b/2,h,TH+.12));hB.position.copy(L(b,0,TH+.12));hH.position.copy(L(mode==="trap"?b/2:sh,h,TH+.12));
        [hSh,hB,hH].forEach(o=>o.visible=!all);
        const ar=mode==="para"?b*h:mode==="tri"?b*h/2:(a+b)*h/2;
        lBase.show(showL("area")).at(wp(area,L(b/2,0,TH))).set(mode==="trap"?`b = ${b} m`:`base ${b} m`);
        lH.show(showL("area")).at(wp(area,L(mode==="trap"?b/2:sh,h/2,TH))).set(mode==="trap"?`h = ${h} m`:`height ${h} m`);
        lA2.show(showL("area")&&mode==="trap").at(wp(area,L(off+a/2,h,TH))).set(`a = ${a} m`);
        lFA.cls(all?"":"hot big").show(showL("area")||all).at(V3(ZA.x,MT+.1,ZA.z-7*KA)).set(mode==="para"?`<b>Area = base × height</b><small>= ${b} × ${h} = ${b*h} m²</small>`:mode==="tri"?`<b>Area = ½ × base × height</b><small>= ½ × ${b} × ${h} = ${f(b*h/2)} m²</small>`:`<b>Area = ½ (a + b) h</b><small>= ½ × (${a} + ${b}) × ${h} = ${f((a+b)*h/2)} m²</small>`);
        lHow.show(showL("area")).at(V3(ZA.x,MT,ZA.z+7*KA+.2)).set(mode==="para"?(sh===0?"Already a rectangle":"Cut the corner off, slide it across: a rectangle, same area"):mode==="tri"?"Two copies make the parallelogram: one is half":"Two copies make a parallelogram, base a + b: one is half");lHow.off=[0,30];}
      // ---- circle station
      {const r=s.r,R=r*KC,u=s.unroll,C2=2*Math.PI*r;disc.scale.set(R,1,R);disc.position.y=TH/2;
        const rk=r+"|"+Math.round(u*200);if(rk!==rimKey){rimKey=rk;rim.geometry.dispose();const arc=Math.max(.001,(1-u)*Math.PI*2);rim.geometry=new THREE.TorusGeometry(R,.05,10,96,arc).rotateX(-Math.PI/2);rim.visible=u<.999;rim.rotation.set(0,-Math.PI/2-arc,0)}
        rim.position.y=TH+.02;   // the peeling end always sits at the front of the disc, where the tape starts
        const LT=C2*KC*.5;tape.visible=u>0;tape.scale.set(Math.max(.001,LT*u),.06,.1);tape.position.set(LT*u/2,.03,R+.06);
        const dD=2*r*KC*.5;for(let i=0;i<8;i++){const x=(i+1)*dD;if(i<3&&x<=LT*u+1e-6)ticks.putS(i,x,.08,R+.06,.025,.12,.2);else ticks.put(i,0,-9,0,.0001)}ticks.done();
        rad.scale.set(R,.03,.05);rad.position.set(R/2,TH+.03,0);ctr.position.set(0,TH+.03,0);hR.position.set(R,TH+.12,0);hR.visible=!all;
        lR.show(showL("circle")).at(wp(circ,V3(R/2,TH,0))).set(`r = ${r} m`);
        lTape.show(showL("circle")&&u>0).at(wp(circ,V3(LT*u,.1,R+.06))).set(`edge unrolled<b>${f(C2*u)} m</b><small>half scale</small>`);
        lPi.show(showL("circle")&&u>=1).at(wp(circ,V3(3*dD,.1,R+.06))).set(`3 diameters and a bit: π ≈ 3.14`);lPi.off=[0,-34];lTape.off=[20,30];
        lFC.cls(all?"":"hot big").show(showL("circle")||all).at(V3(ZC.x,MT+.1,ZC.z-6*KC-.2)).set(`<b>Circumference = 2πr = ${f(C2)} m</b><small>Area = πr² = ${f(Math.PI*r*r)} m²</small>`)}
      // ---- Pythagoras station
      {const a=s.ta,b=s.tb,c=Math.hypot(a,b);const key=a+"|"+b;
        if(key!==pyKey){pyKey=key;KP=Math.min(.42,6.2/Math.max(a+2*b,2*a+b));const ox=-(a+2*b)/2+b,oy=-(2*a+b)/2+a;pOX=ox;pOY=oy;
          const sh=(pts)=>pts.map(([u,v])=>[u+ox,v+oy]);triT.set(sh([[0,0],[a,0],[a,b]]),KP);triT.m.material=mat("plastic","#ffffff",{rough:.35});
          while(pyM.children.length)pyM.remove(pyM.children[0]);sq=[];
          const SA=sh([[0,0],[a,0],[a,-a],[0,-a]]),SB=sh([[a,0],[a+b,0],[a+b,b],[a,b]]),SC=sh([[0,0],[a,b],[a-b,b+a],[-b,a]]);
          trayAt(SA,P.product.blueberry,sq);trayAt(SB,P.product.strawberry,sq);trayAt(SC,P.product.butter,sq);
          sq.forEach((c4,i)=>{const ins=c4;pyLiq[i].geometry.dispose();pyLiq[i].geometry=tileGeo(ins,KP,1)});
          let gi=0;const q=new THREE.Quaternion();sq.forEach(c4=>{const e1=[c4[1][0]-c4[0][0],c4[1][1]-c4[0][1]],e2=[c4[3][0]-c4[0][0],c4[3][1]-c4[0][1]],side=Math.hypot(...e1);
            for(const [ea,eb] of [[e1,e2],[e2,e1]]){q.setFromUnitVectors(V3(1,0,0),V3(eb[0],0,-eb[1]).normalize());for(let i=1;i<side-1e-6&&gi<90;i++){const f0=i/side;const px=(c4[0][0]+ea[0]*f0+eb[0]/2)*KP,pz=-(c4[0][1]+ea[1]*f0+eb[1]/2)*KP;pyGrid.putS(gi++,px,.05,pz,side*KP,.006,.012,q)}}});
          for(;gi<90;gi++)pyGrid.put(gi,0,-9,0,.0001);pyGrid.done();rAng.position.set((a+ox)*KP,0,-(oy)*KP)}
        const fr=[1-s.pour,1-s.pour,.18+.82*s.pour];pyLiq.forEach((m,i)=>{m.visible=fr[i]>.005;m.scale.y=Math.max(.001,.24*fr[i]);m.position.y=.04});
        const cen=c4=>{let x=0,z=0;c4.forEach(([u,v])=>{x+=u*KP;z-=v*KP});return V3(x/4,0,z/4)};const cA=cen(sq[0]),cB=cen(sq[1]),cC=cen(sq[2]);
        const flowing=s.playing&&st.speed&&s.pour>0&&s.pour<1&&k==="pyth";for(let i=0;i<60;i++){const p=pp[i];if(flowing)p.u=(p.u+dt*.8)%1;const src=p.src?cB:cA;const x=S.lerp(src.x,cC.x,p.u),z=S.lerp(src.z,cC.z,p.u),y=.3+Math.sin(p.u*Math.PI)*1.2;
          pours.put(i,x,y,z,flowing?.8:0,90)}pours.done();
        hA.position.set((pOX+a)*KP,.45,-(pOY-a/2)*KP);hBt.position.set((pOX+a+b/2)*KP,.45,-(pOY+b)*KP);hA.visible=hBt.visible=!all;
        lSa.show(showL("pyth")||all).at(wp(py,cA.setY(.3))).set(`<b>a² = ${a*a} m²</b>`);lSb.show(showL("pyth")||all).at(wp(py,cB.setY(.3))).set(`<b>b² = ${b*b} m²</b>`);lSc.show(showL("pyth")||all).at(wp(py,cC.setY(.3))).set(`<b>c² = ${f(c*c)} m²</b>`);
        lFP.show(showL("pyth")).at(V3(ZP.x,MT+.1,ZP.z-3.4)).set(`<b>a² + b² = c²</b><small>${a*a} + ${b*b} = ${f(c*c)} · c = √${f(c*c)} = ${f(c,2)} m</small>`)}
      // ---- parallel lines station
      {const A=s.ang*Math.PI/180,dx=2*GAP/Math.tan(A),xA=-dx/2,xB=dx/2,dir=V3(Math.cos(A),0,-Math.sin(A));
        const ext=(GAP+.55)/Math.sin(A),p0=V3(0,.1,0).addScaledVector(dir,-ext),p1=V3(0,.1,0).addScaledVector(dir,ext);
        rod.position.set(0,.1,0);rod.quaternion.setFromUnitVectors(V3(0,1,0),dir);rod.scale.set(1,ext*2,1);hG.position.copy(p1).setY(.2);hG.visible=!all;
        if(angKey!==s.ang){angKey=s.ang;for(const [m,t0,t1] of [[wU,0,A],[wL,0,A],[wL2,A,Math.PI]]){m.geometry.dispose();m.geometry=sector(t0,t1,.5)}}
        wU.position.set(xB,.02,-GAP);wL.position.set(xA,.02,GAP);wL2.position.set(xA,.025,GAP);
        lAu.show(showL("angles")).at(wp(ag,V3(xB+.45*Math.cos(A/2),.1,-GAP-.45*Math.sin(A/2)))).set(`<b>${s.ang}°</b>`);
        lAl.show(showL("angles")).at(wp(ag,V3(xA+.45*Math.cos(A/2),.1,GAP-.45*Math.sin(A/2)))).set(`<b>${s.ang}°</b><small>corresponding</small>`);
        lAl2.show(showL("angles")).at(wp(ag,V3(xA+.45*Math.cos((A+Math.PI)/2),.1,GAP-.45*Math.sin((A+Math.PI)/2)))).set(`<b>${180-s.ang}°</b>`);
        lFG.show(showL("angles")).at(V3(ZG.x,MT+.1,ZG.z-2.1)).set("<b>Corresponding angles are equal</b>")}
      // ---- prism station
      {const b=s.b,h=s.h,n=s.len,key=b+"|"+h;if(key!==pKey){pKey=key;const sh=new THREE.Shape();sh.moveTo(-b/2*KV,0);sh.lineTo(b/2*KV,0);sh.lineTo(0,h*KV);sh.closePath();
          slices.geometry.dispose();slices.geometry=new THREE.ExtrudeGeometry(sh,{depth:KV*.94,bevelEnabled:true,bevelThickness:.006,bevelSize:.006,bevelSegments:1});
          face.geometry.dispose();face.geometry=new THREE.ShapeGeometry(sh)}
        const per=.45,shown=S.REDUCED||k!=="prism"?n:Math.min(n,pClock/per),z0=n*KV/2;
        for(let i=0;i<16;i++){if(i<n&&i<shown+1){const fall=S.clamp(shown-i,0,1),y=(1-S.ease(fall))*1.6;slices.put(i,0,.03+y,z0-(i+1)*KV);slices.tint(i,i%2?P.product.peach:"#F7B48A")}else slices.put(i,0,-9,0,.0001)}slices.done();
        face.position.set(0,.03,z0+.004);spin.rotation.y=S.REDUCED?-.5:-.5+Math.sin(t*.35)*.35;
        const Ar=b*h/2,done=Math.min(n,Math.floor(shown+1e-6));
        lCross.show(showL("prism")).at(wp(spin,V3(-b/6*KV,h*KV/3,z0))).set(`cross-section<b>½ × ${b} × ${h} = ${f(Ar)} m²</b>`);
        lLen.show(showL("prism")).at(wp(spin,V3(b/2*KV,0,0))).set(`length <b>${n} m</b>`);
        lSl.show(showL("prism")).at(V3(ZV.x,MT+.1,ZV.z+2.2)).set(`<b>${done} slice${done===1?"":"s"} × ${f(Ar)} m³ = ${f(done*Ar)} m³</b>`);lSl.off=[0,22];
        lFV.show(showL("prism")).at(V3(ZV.x-.6,MT+.1,ZV.z-2.7)).set(`<b>Volume = area of cross-section × length</b><small>= ${f(Ar)} × ${n} = ${f(Ar*n)} m³</small>`)}
    }};
}
StudyKit.mount({kupu:KUPU,scene3d:shapes3d,
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
