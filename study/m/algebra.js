(()=>{
// The algebra machine (NCEA Level 2 Mathematics 91261): factorising as an area model, a quadratic whose roots, vertex and
// discriminant move with the graph, a line meeting a parabola, index laws as stacked bars, and a log solving a growth question.
// Every parameter change redraws; every step carries a worked path and a "your turn".
const esc=StudyKit.esc,sfx=n=>{try{StudyKit.sfx(n)}catch(e){}};
const F=StudyKit.fig,PAL=F.palette,TINT=PAL.case.lavender,PR=PAL.product,AX="#8F9BAA",INK="#262E5C",ROSE="#6E6A86";
const COLS={x2:PAL.case.lavender,px:PAL.case.sky,qx:PAL.case.mint,pq:PAL.case.butter,neg:"#F3B8C8"};
const DEEP=c=>F.deep(c);
const s={p:2,q:3,a:1,b:-2,c:-3,m:1,k:1,base:2,ia:3,ib:2,op:"mul",rate:5,target:2,drag:null,visited:[]};
const r2=v=>Math.round(v*100)/100,fmt=v=>{const r=r2(v);return (Object.is(r,-0)?0:r).toString().replace("-","−")};
const sgn=(v,first)=>v<0?" − ":first?"":" + ";
// a polynomial as text: coefficient list high to low, variable x
function poly(co,x="x"){const n=co.length-1;let o="",first=true;co.forEach((v,i)=>{if(Math.abs(v)<1e-12)return;const pw=n-i,av=Math.abs(v);const cs=(av===1&&pw>0)?"":fmt(av);o+=sgn(v,first)+cs+(pw===0?"":pw===1?x:x+"²");first=false});return o||"0"}
const bracket=(v,x="x")=>v===0?x:`(${x}${v<0?" − ":" + "}${fmt(Math.abs(v))})`;
const disc=(a,b,c)=>b*b-4*a*c;
function rootsOf(a,b,c){if(Math.abs(a)<1e-12)return Math.abs(b)<1e-12?[]:[-c/b];const d=disc(a,b,c);if(d<0)return[];if(d===0)return[-b/(2*a)];const r=Math.sqrt(d);return[(-b-r)/(2*a),(-b+r)/(2*a)].sort((u,v)=>u-v)}
const vertex=(a,b,c)=>{const h=-b/(2*a);return{h,k:a*h*h+b*h+c}};
const mq=matchMedia("(max-width:820px)");const Zs=()=>mq.matches?1.3:1;
const T=(x,y,t,size,o={})=>`<text x="${x}" y="${y}"${o.a?` text-anchor="${o.a}"`:""} style="font:${o.wt||500} ${size*Zs()}px ${o.mono?"var(--mono)":"var(--display)"};fill:${o.fill||INK}${o.ls?`;letter-spacing:${o.ls}px`:""}">${esc(t)}</text>`;

// ---------- the graph board: a white screen in a frosted lavender case
const G={x0:250,x1:598,y0:26,y1:326,xm:-6,xM:6,ym:-8,yM:12};
const gx=x=>G.x0+(x-G.xm)/(G.xM-G.xm)*(G.x1-G.x0),gy=y=>G.y1-(y-G.ym)/(G.yM-G.ym)*(G.y1-G.y0);
const ux=px=>G.xm+(px-G.x0)/(G.x1-G.x0)*(G.xM-G.xm),uy=py=>G.ym+(G.y1-py)/(G.y1-G.y0)*(G.yM-G.ym);
function board(){let o=F.acrylic(G.x0-28,G.y0-10,G.x1-G.x0+48,G.y1-G.y0+30,{tint:TINT,d:12,r:14,shadowLen:40,balls:false});
  o+=`<rect x="${G.x0}" y="${G.y0}" width="${G.x1-G.x0}" height="${G.y1-G.y0}" fill="#fff" stroke="${AX}" stroke-width="1.2"/>`;
  for(let x=G.xm;x<=G.xM;x++)o+=`<line x1="${gx(x)}" x2="${gx(x)}" y1="${G.y0}" y2="${G.y1}" stroke="var(--line)"/>`;
  for(let y=G.ym;y<=G.yM;y+=2)o+=`<line x1="${G.x0}" x2="${G.x1}" y1="${gy(y)}" y2="${gy(y)}" stroke="var(--line)"/>`;
  o+=`<line x1="${gx(0)}" x2="${gx(0)}" y1="${G.y0}" y2="${G.y1}" stroke="${AX}" stroke-width="1.4"/><line x1="${G.x0}" x2="${G.x1}" y1="${gy(0)}" y2="${gy(0)}" stroke="${AX}" stroke-width="1.4"/>`;
  for(let x=G.xm;x<=G.xM;x+=2)if(x)o+=`<text class="t-lab" x="${gx(x)}" y="${gy(0)+12}" text-anchor="middle">${fmt(x)}</text>`;
  for(let y=G.ym;y<=G.yM;y+=4)if(y)o+=`<text class="t-lab" x="${gx(0)-5}" y="${gy(y)+3.5}" text-anchor="end">${fmt(y)}</text>`;
  return o}
function curve(f,col,w=2.6,dash=""){const pts=[];let d="";for(let px=G.x0;px<=G.x1;px+=2){const x=ux(px),y=f(x);if(y<G.ym-6||y>G.yM+6){if(pts.length){d+=(d?" ":"")+"M"+pts.join("L");pts.length=0}continue}pts.push(px.toFixed(1)+","+gy(y).toFixed(1))}if(pts.length)d+=(d?" ":"")+"M"+pts.join("L");
  if(!d)return "";return `<path d="${d}" fill="none" stroke="${DEEP(col)}" stroke-width="${w+2}" stroke-linecap="round" stroke-linejoin="round" opacity=".9"${dash?` stroke-dasharray="${dash}"`:""}/><path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${dash?` stroke-dasharray="${dash}"`:""}/>`}
const dot=(x,y,col,r=5,extra="")=>`<circle cx="${gx(x)}" cy="${gy(y)}" r="${r}" fill="${col}" stroke="${INK}" stroke-width="1.4"${extra}/>`;
const tagAt=(px,py,t,o={})=>{const w=t.length*6.6*Zs()+14,h=18*Zs();const x=o.a==="end"?px-w:o.a==="middle"?px-w/2:px;return `<rect x="${x}" y="${py-h+4}" width="${w}" height="${h}" rx="${h/2}" fill="#fff" stroke="${PAL.pill.line}"/>`+T(x+7,py-h*0.28,t,10.5,{wt:600,mono:true,fill:o.fill||INK})};
// a plastic plinth with a title plate, left of the board, for the "machine" part of each step
const plinth=(title)=>F.box(14,296,210,40,{colour:TINT,kind:"plastic",d:10,r:12,shadowLen:30})+F.plate(26,304,title,{tint:TINT,size:11});

// ---------- step 1: the area model
function areaScene(){let o=F.floor(640,360);const X=116,U=18,ox=52,oy=58;
  const p=s.p,q=s.q,W=X+Math.abs(p)*U,H=X+Math.abs(q)*U;
  const tile=(x,y,w,h,col,neg,lab)=>{const c=neg?COLS.neg:col;let g=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}" stroke="${DEEP(c)}" stroke-width="1.2"/>`;
    if(neg)g+=`<path d="M${x},${y} l${w},${h} M${x+w},${y} l${-w},${h}" stroke="${DEEP(c)}" stroke-width="1" opacity=".5"/>`;
    if(lab&&w>18&&h>14)g+=T(x+w/2,y+h/2+4,lab,w<40||h<40?9:12,{a:"middle",wt:600,mono:true});return g};
  // the four regions: x², px, qx, pq (negative parts hatched pink)
  o+=tile(ox,oy,X,X,COLS.x2,false,"x²");
  if(p)o+=tile(ox+X,oy,Math.abs(p)*U,X,COLS.px,p<0,`${fmt(p)}x`);
  if(q)o+=tile(ox,oy+X,X,Math.abs(q)*U,COLS.qx,q<0,`${fmt(q)}x`);
  if(p&&q)o+=tile(ox+X,oy+X,Math.abs(p)*U,Math.abs(q)*U,COLS.pq,p*q<0,fmt(p*q));
  // unit ticks on the strips
  for(let i=1;i<Math.abs(p);i++)o+=`<line x1="${ox+X+i*U}" x2="${ox+X+i*U}" y1="${oy}" y2="${oy+H}" stroke="${INK}" stroke-opacity=".18"/>`;
  for(let i=1;i<Math.abs(q);i++)o+=`<line x1="${ox}" x2="${ox+W}" y1="${oy+X+i*U}" y2="${oy+X+i*U}" stroke="${INK}" stroke-opacity=".18"/>`;
  // side labels: the two factors
  o+=`<path d="M${ox},${oy-14} h${W}" stroke="${INK}" stroke-width="1.2"/>`+T(ox+W/2,oy-20,bracket(p),12,{a:"middle",wt:600,mono:true});
  o+=`<path d="M${ox-14},${oy} v${H}" stroke="${INK}" stroke-width="1.2"/>`+`<g transform="rotate(-90 ${ox-22} ${oy+H/2})">${T(ox-22,oy+H/2+4,bracket(q),12,{a:"middle",wt:600,mono:true})}</g>`;
  if(p<0||q<0)o+=T(ox,oy+H+22,"HATCHED = TAKEN AWAY",9.5,{mono:true,fill:ROSE,ls:1});
  // the result plate on the right
  o+=F.acrylic(336,40,262,200,{tint:TINT,d:12,r:14,shadowLen:22,balls:false});
  o+=T(350,72,"AREA = LENGTH × WIDTH",10,{mono:true,fill:ROSE,ls:1});
  o+=T(350,104,`${bracket(p)}${bracket(q)}`,19,{wt:600,mono:true});
  o+=T(350,134,"= x² "+(p?sgn(p)+fmt(Math.abs(p))+"x ":"")+(q?sgn(q)+fmt(Math.abs(q))+"x ":"")+(p*q?sgn(p*q)+fmt(Math.abs(p*q)):""),13,{mono:true,fill:ROSE});
  o+=T(350,168,"= "+poly([1,p+q,p*q]),19,{wt:600,mono:true});
  o+=T(350,206,`sum ${fmt(p+q)} · product ${fmt(p*q)}`,11,{mono:true,fill:ROSE});
  o+=plinth("AREA MODEL");o+=T(240,322,"◀ drag the sliders",10.5,{mono:true,fill:ROSE});
  return o}
// ---------- steps 2 and 3: a quadratic and its graph
function quadScene(st){let o=F.floor(640,360)+board();const {a,b,c}=s,d=disc(a,b,c),R=rootsOf(a,b,c),V=vertex(a,b,c);
  o+=curve(x=>a*x*x+b*x+c,PR.blueberry);
  // axis of symmetry and the vertex, draggable
  o+=`<line x1="${gx(V.h)}" x2="${gx(V.h)}" y1="${G.y0}" y2="${G.y1}" stroke="${INK}" stroke-dasharray="3 4" opacity=".4"/>`;
  R.forEach(r=>{o+=dot(r,0,PR.lime,6);o+=tagAt(gx(r),gy(0)-10,`x = ${fmt(r)}`,{a:"middle"})});
  if(V.k>=G.ym&&V.k<=G.yM){o+=`<g data-drag="vertex" style="cursor:grab"><circle cx="${gx(V.h)}" cy="${gy(V.k)}" r="16" fill="transparent"/>${dot(V.h,V.k,PR.strawberry,7)}<circle cx="${gx(V.h)}" cy="${gy(V.k)}" r="11" fill="none" stroke="${INK}" stroke-opacity=".35" stroke-dasharray="2 3"/></g>`;
    o+=tagAt(gx(V.h)+14,gy(V.k)+(a>0?22:-6),`vertex (${fmt(V.h)}, ${fmt(V.k)})`)}
  if(st.k==="quad")o+=tagAt(gx(V.h)+14,gy(V.k)+(a>0?40:-24),"← drag me",{fill:"#B5466F"});
  // y-intercept
  if(c>=G.ym&&c<=G.yM)o+=dot(0,c,PR.butter,5)+tagAt(gx(0)+8,gy(c)-6,`(0, ${fmt(c)})`);
  // the equation plate
  o+=F.acrylic(14,26,214,118,{tint:TINT,d:10,r:12,shadowLen:30,balls:false});
  o+=T(28,52,"y = "+poly([a,b,c]),15,{wt:600,mono:true});
  o+=T(28,80,"Δ = b² − 4ac",10.5,{mono:true,fill:ROSE});
  o+=T(28,100,`= (${fmt(b)})² − 4(${fmt(a)})(${fmt(c)})`,11,{mono:true,fill:ROSE});
  o+=T(28,126,`= ${fmt(d)}`,15,{wt:600,mono:true,fill:d<0?"#B5466F":d===0?"#8A6510":"#2A7D63"});
  // a gauge for the discriminant: left of zero, no roots; zero, one; right, two
  o+=F.acrylic(14,160,214,110,{tint:TINT,d:10,r:12,shadowLen:30,balls:false});
  o+=T(28,184,"NATURE OF ROOTS",10,{mono:true,fill:ROSE,ls:1});
  const gxp=v=>121+Math.max(-90,Math.min(90,v*2.2));
  o+=`<line x1="31" x2="211" y1="222" y2="222" stroke="${AX}" stroke-width="3" stroke-linecap="round"/><line x1="121" x2="121" y1="212" y2="232" stroke="${INK}" stroke-width="2"/>`;
  o+=`<circle cx="${gxp(d)}" cy="222" r="8" fill="${d<0?COLS.neg:d===0?COLS.pq:COLS.qx}" stroke="${INK}" stroke-width="1.4"/>`;
  o+=T(31,250,"none",9.5,{mono:true,wt:600,fill:d<0?INK:ROSE})+T(121,250,"one",9.5,{a:"middle",mono:true,wt:600,fill:d===0?INK:ROSE})+T(211,250,"two",9.5,{a:"end",mono:true,wt:600,fill:d>0?INK:ROSE})+T(31,206,"Δ < 0",8.5,{mono:true,fill:ROSE})+T(121,206,"Δ = 0",8.5,{a:"middle",mono:true,fill:ROSE})+T(211,206,"Δ > 0",8.5,{a:"end",mono:true,fill:ROSE});
  o+=plinth(st.k==="roots"?"DISCRIMINANT":"QUADRATIC");
  return o}
// ---------- step 4: a line meets the parabola
function simulScene(){let o=F.floor(640,360)+board();const {a,b,c,m,k}=s;
  o+=curve(x=>a*x*x+b*x+c,PR.blueberry);o+=curve(x=>m*x+k,PR.strawberry,2.2);
  const A=a,B=b-m,C=c-k,d=disc(A,B,C),R=rootsOf(A,B,C);
  R.forEach(x=>{const y=m*x+k;o+=dot(x,y,PR.lime,6.5);o+=tagAt(gx(x)+10,gy(y)-8,`(${fmt(x)}, ${fmt(y)})`)});
  // grab handle on the line's intercept
  if(k>=G.ym&&k<=G.yM)o+=`<g data-drag="line" style="cursor:grab"><circle cx="${gx(0)}" cy="${gy(k)}" r="16" fill="transparent"/>${dot(0,k,PR.strawberry,7)}</g>`+tagAt(gx(0)+12,gy(k)+24,"← drag the line",{fill:"#B5466F"});
  o+=F.acrylic(14,26,214,150,{tint:TINT,d:10,r:12,shadowLen:30,balls:false});
  o+=T(28,50,"y = "+poly([a,b,c]),13,{wt:600,mono:true,fill:"#3A6FB8"});
  o+=T(28,72,"y = "+poly([m,k]),13,{wt:600,mono:true,fill:"#B5466F"});
  o+=T(28,98,"SET THEM EQUAL",10,{mono:true,fill:ROSE,ls:1});
  o+=T(28,120,poly([A,B,C])+" = 0",13,{wt:600,mono:true});
  o+=T(28,146,`Δ = ${fmt(d)} → ${R.length===0?"no":R.length===1?"one":"two"} point${R.length===1?"":"s"}`,12,{mono:true,fill:d<0?"#B5466F":d===0?"#8A6510":"#2A7D63"});
  o+=F.acrylic(14,190,214,80,{tint:TINT,d:10,r:12,shadowLen:30,balls:false});
  o+=T(28,214,"MEETING POINTS",10,{mono:true,fill:ROSE,ls:1});
  o+=T(28,240,R.length?R.map(x=>`(${fmt(x)}, ${fmt(m*x+k)})`).join("  "):"the line misses the curve",12,{wt:600,mono:true});
  o+=plinth("SIMULTANEOUS");
  return o}
// ---------- step 5: index laws as stacked bars (log scale: adding exponents is stacking)
const powTxt=(b,n)=>n>=0?fmt(Math.pow(b,n)):`1/${fmt(Math.pow(b,-n))}`;
function indexScene(){let o=F.floor(640,360);const {base:B,ia,ib,op}=s,U=22,Y0=200;
  const bar=(x,n,col,lab)=>{const h=Math.abs(n)*U,y=n>=0?Y0-h:Y0;let g="";if(n!==0)g+=`<rect x="${x}" y="${y}" width="54" height="${h}" rx="4" fill="${n>=0?col:COLS.neg}" stroke="${DEEP(col)}" stroke-width="1.2"/>`;
    for(let i=1;i<Math.abs(n);i++)g+=`<line x1="${x}" x2="${x+54}" y1="${n>=0?Y0-i*U:Y0+i*U}" y2="${n>=0?Y0-i*U:Y0+i*U}" stroke="${INK}" stroke-opacity=".2"/>`;
    g+=T(x+27,n>=0?y-8:Y0+h+14,lab,11.5,{a:"middle",wt:600,mono:true});return g};
  o+=F.acrylic(14,26,420,310,{tint:TINT,d:12,r:14,shadowLen:40,balls:false});
  o+=`<line x1="30" x2="420" y1="${Y0}" y2="${Y0}" stroke="${AX}" stroke-width="1.4"/>`+T(34,Y0+14,`${B}⁰ = 1`,9.5,{mono:true,fill:ROSE});
  o+=T(30,52,"EACH BLOCK IS ONE MORE ×"+B,10,{mono:true,fill:ROSE,ls:1});
  const sup=n=>fmt(n);
  let res,law,lawN;
  if(op==="mul"){res=ia+ib;law=`${B}ᵃ × ${B}ᵇ = ${B}ᵃ⁺ᵇ`;lawN=`${B}^${sup(ia)} × ${B}^${sup(ib)} = ${B}^${sup(res)}`;
    o+=bar(60,ia,COLS.px,`${B}^${sup(ia)}`)+T(142,Y0-4,"×",18,{a:"middle",wt:600})+bar(170,ib,COLS.qx,`${B}^${sup(ib)}`)+T(252,Y0-4,"=",18,{a:"middle",wt:600});
    // the stack: bar a with bar b on top
    const h1=Math.abs(ia)*U,y1=ia>=0?Y0-h1:Y0;o+=`<rect x="290" y="${y1}" width="54" height="${h1}" rx="4" fill="${ia>=0?COLS.px:COLS.neg}" stroke="${DEEP(COLS.px)}" stroke-width="1.2"/>`;
    const top=ia>=0?Y0-h1:Y0-h1;const h2=Math.abs(ib)*U;const y2=ib>=0?(Y0-ia*U)-h2:(Y0-ia*U);o+=`<rect x="290" y="${y2}" width="54" height="${h2}" rx="4" fill="${ib>=0?COLS.qx:COLS.neg}" stroke="${DEEP(COLS.qx)}" stroke-width="1.2" opacity=".92"/>`;
    o+=T(317,(res>=0?Y0-res*U:Y0)-8,`${B}^${sup(res)}`,11.5,{a:"middle",wt:600,mono:true});void top}
  else if(op==="div"){res=ia-ib;law=`${B}ᵃ ÷ ${B}ᵇ = ${B}ᵃ⁻ᵇ`;lawN=`${B}^${sup(ia)} ÷ ${B}^${sup(ib)} = ${B}^${sup(res)}`;
    o+=bar(60,ia,COLS.px,`${B}^${sup(ia)}`)+T(142,Y0-4,"÷",18,{a:"middle",wt:600})+bar(170,ib,COLS.qx,`${B}^${sup(ib)}`)+T(252,Y0-4,"=",18,{a:"middle",wt:600});
    o+=bar(290,res,COLS.pq,`${B}^${sup(res)}`);o+=`<rect x="290" y="${Math.min(Y0-ia*U,Y0-res*U)}" width="54" height="${Math.abs(ib)*U}" fill="none" stroke="${DEEP(COLS.qx)}" stroke-dasharray="3 3"/>`}
  else{res=ia*ib;law=`(${B}ᵃ)ᵇ = ${B}ᵃᵇ`;lawN=`(${B}^${sup(ia)})^${sup(ib)} = ${B}^${sup(res)}`;
    o+=bar(60,ia,COLS.px,`${B}^${sup(ia)}`)+T(142,Y0-4,`^${sup(ib)}`,15,{a:"middle",wt:600,mono:true})+T(200,Y0-4,"=",18,{a:"middle",wt:600});
    const n=Math.abs(ib),hh=Math.abs(ia)*U;for(let i=0;i<Math.min(n,6);i++){const y=ia*ib>=0?Y0-(i+1)*hh:Y0+i*hh;o+=`<rect x="236" y="${y}" width="54" height="${hh}" rx="3" fill="${ia*ib>=0?COLS.px:COLS.neg}" stroke="${DEEP(COLS.px)}" stroke-width="1.2" opacity="${1-i*.08}"/>`}
    o+=T(263,(res>=0?Y0-Math.min(n,6)*hh:Y0)-8,`${B}^${sup(res)}`,11.5,{a:"middle",wt:600,mono:true});if(n>6)o+=T(263,Y0+16,"…",14,{a:"middle"})}
  o+=F.acrylic(450,26,176,310,{tint:TINT,d:12,r:14,shadowLen:40,balls:false});
  o+=T(464,52,"THE LAW",10,{mono:true,fill:ROSE,ls:1})+T(464,78,law,13,{wt:600,mono:true});
  o+=T(464,112,"WITH NUMBERS",10,{mono:true,fill:ROSE,ls:1})+T(464,138,lawN,11,{wt:600,mono:true});
  o+=T(464,172,"VALUE",10,{mono:true,fill:ROSE,ls:1})+T(464,198,powTxt(B,res),15,{wt:600,mono:true});
  o+=T(464,232,"NEGATIVE POWER",10,{mono:true,fill:ROSE,ls:1})+T(464,256,`${B}⁻ⁿ = 1/${B}ⁿ`,12,{mono:true});
  o+=T(464,290,"FRACTION POWER",10,{mono:true,fill:ROSE,ls:1})+T(464,314,`${B}^(1/2) = √${B}`,12,{mono:true});
  return o}
// ---------- step 6: logs undo powers: how long until the balance doubles?
const P0=1000;
function logScene(){let o=F.floor(640,360);const r=s.rate/100,tg=s.target,tStar=Math.log(tg)/Math.log(1+r);
  const LG={x0:70,x1:420,y0:34,y1:290,tM:30,yM:4};const lx=t=>LG.x0+t/LG.tM*(LG.x1-LG.x0),ly=v=>LG.y1-(v/LG.yM)*(LG.y1-LG.y0);
  o+=F.acrylic(LG.x0-44,LG.y0-14,LG.x1-LG.x0+74,LG.y1-LG.y0+56,{tint:TINT,d:12,r:14,shadowLen:40,balls:false});
  o+=`<rect x="${LG.x0}" y="${LG.y0}" width="${LG.x1-LG.x0}" height="${LG.y1-LG.y0}" fill="#fff" stroke="${AX}" stroke-width="1.2"/>`;
  for(let t=0;t<=LG.tM;t+=5)o+=`<line x1="${lx(t)}" x2="${lx(t)}" y1="${LG.y0}" y2="${LG.y1}" stroke="var(--line)"/><text class="t-lab" x="${lx(t)}" y="${LG.y1+13}" text-anchor="middle">${t}</text>`;
  for(let v=0;v<=LG.yM;v++)o+=`<line x1="${LG.x0}" x2="${LG.x1}" y1="${ly(v)}" y2="${ly(v)}" stroke="var(--line)"/><text class="t-lab" x="${LG.x0-5}" y="${ly(v)+3.5}" text-anchor="end">$${v*P0}</text>`;
  o+=`<text class="t-lab" x="${(LG.x0+LG.x1)/2}" y="${LG.y1+30}" text-anchor="middle">YEARS</text>`;
  let d="";for(let t=0;t<=LG.tM;t+=.25){const v=Math.pow(1+r,t);if(v>LG.yM)break;d+=(d?"L":"M")+lx(t).toFixed(1)+","+ly(v).toFixed(1)}
  o+=`<path d="${d}" fill="none" stroke="${DEEP(PR.lime)}" stroke-width="4.4" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${PR.lime}" stroke-width="2.6" stroke-linecap="round"/>`;
  o+=`<line x1="${LG.x0}" x2="${LG.x1}" y1="${ly(tg)}" y2="${ly(tg)}" stroke="#B5466F" stroke-width="1.6" stroke-dasharray="5 4"/>`+tagAt(LG.x1-4,ly(tg)-6,`target $${fmt(tg*P0)}`,{a:"end",fill:"#B5466F"});
  if(tStar<=LG.tM){o+=`<line x1="${lx(tStar)}" x2="${lx(tStar)}" y1="${ly(tg)}" y2="${LG.y1}" stroke="${INK}" stroke-dasharray="3 3" opacity=".5"/>`;
    o+=`<circle cx="${lx(tStar)}" cy="${ly(tg)}" r="6.5" fill="${PR.strawberry}" stroke="${INK}" stroke-width="1.4"/>`+tagAt(lx(tStar)+10,ly(tg)+26,`t = ${fmt(tStar)} years`)}
  else o+=T(LG.x0+10,LG.y0+22,`t = ${fmt(tStar)} years (off the graph)`,11,{mono:true,fill:ROSE});
  o+=F.acrylic(458,26,168,310,{tint:TINT,d:12,r:14,shadowLen:40,balls:false});
  o+=T(472,52,"THE MODEL",10,{mono:true,fill:ROSE,ls:1})+T(472,76,`A = ${P0}(${fmt(1+r)})ᵗ`,12,{wt:600,mono:true});
  o+=T(472,108,"THE QUESTION",10,{mono:true,fill:ROSE,ls:1})+T(472,130,`when is A = ${fmt(tg*P0)}?`,11,{mono:true});
  o+=T(472,162,"UNDO THE POWER",10,{mono:true,fill:ROSE,ls:1})+T(472,184,`${fmt(1+r)}ᵗ = ${fmt(tg)}`,12,{wt:600,mono:true})+T(472,206,`t·log ${fmt(1+r)} = log ${fmt(tg)}`,11,{mono:true});
  o+=T(472,228,`t = log ${fmt(tg)} ÷ log ${fmt(1+r)}`,11,{mono:true});
  o+=T(472,262,"ANSWER",10,{mono:true,fill:ROSE,ls:1})+T(472,286,`${fmt(tStar)} years`,15,{wt:600,mono:true})+T(472,308,`so ${Math.ceil(tStar-1e-9)} full years`,11,{mono:true,fill:ROSE});
  o+=`<rect x="26" y="300" width="84" height="18" rx="9" fill="#fff" stroke="${PAL.pill.line}"/>`+T(68,313,"SIMULATED",9,{a:"middle",mono:true,fill:ROSE,ls:1});
  return o}
// ---------- the worked path (close-up panel): the algebra written out from the live state, ending with "your turn"
function lines(rows){let o="",y=18;rows.forEach(([t,kind])=>{if(kind==="h")o+=`<text class="t-lab" x="14" y="${y+2}">${esc(t)}</text>`;else if(kind==="turn"){o+=`<rect x="10" y="${y-13}" width="400" height="30" rx="8" fill="${COLS.pq}"/><text x="20" y="${y+6}" style="font:600 12px var(--display);fill:${INK}">${esc(t)}</text>`;y+=8}
  else o+=`<text x="14" y="${y+2}" style="font:${kind==="b"?600:500} ${kind==="b"?13.5:12}px var(--mono);fill:${kind==="r"?ROSE:INK}">${esc(t)}</text>`;y+=kind==="h"?20:kind==="turn"?28:22});return o}
function drawClose(x,st){const k=st.k;const {a,b,c,p,q,m,kk}=s;
  if(k==="area")return lines([["WORKED PATH · FACTORISE","h"],[`x² ${sgn(p+q)}${fmt(Math.abs(p+q))}x ${sgn(p*q)}${fmt(Math.abs(p*q))}`,"b"],[`two numbers that multiply to ${fmt(p*q)}`,"r"],[`and add to ${fmt(p+q)}:  ${fmt(p)} and ${fmt(q)}`,"r"],[`= ${bracket(p)}${bracket(q)}`,"b"],["check: expand the brackets, area adds up","r"],["Your turn: set p and q so the area is x² − x − 12.","turn"]]);
  if(k==="quad"){const V=vertex(a,b,c);return lines([["WORKED PATH · VERTEX","h"],["y = "+poly([a,b,c]),"b"],[`axis of symmetry x = −b/2a = ${fmt(-b)}/${fmt(2*a)} = ${fmt(V.h)}`,"r"],[`y at x = ${fmt(V.h)}: ${fmt(V.k)}`,"r"],[`vertex (${fmt(V.h)}, ${fmt(V.k)}), ${a>0?"a minimum":"a maximum"}`,"b"],[`y-intercept (0, ${fmt(c)}) when x = 0`,"r"],["Your turn: drag the vertex to (2, −1). Read b and c.","turn"]])}
  if(k==="roots"){const d=disc(a,b,c),R=rootsOf(a,b,c);return lines([["WORKED PATH · SOLVE WITH THE FORMULA","h"],[poly([a,b,c])+" = 0","b"],[`x = (−b ± √Δ) / 2a,  Δ = ${fmt(d)}`,"r"],[d<0?"√Δ is not real: no real roots":`x = (${fmt(-b)} ± √${fmt(d)}) / ${fmt(2*a)}`,"r"],[R.length?`x = ${R.map(fmt).join(" or x = ")}`:"the graph never reaches y = 0","b"],["Your turn: change c until the graph just touches the axis.","turn"]])}
  if(k==="simul"){const A=a,B=b-s.m,C=c-s.k,R=rootsOf(A,B,C);return lines([["WORKED PATH · LINE MEETS CURVE","h"],[`${poly([a,b,c])} = ${poly([s.m,s.k])}`,"b"],[`${poly([A,B,C])} = 0`,"r"],[`Δ = ${fmt(disc(A,B,C))}`,"r"],[R.length?`x = ${R.map(fmt).join(", ")}; sub back for y`:"no solutions: the line misses","b"],[R.length?R.map(x=>`(${fmt(x)}, ${fmt(s.m*x+s.k)})`).join("  "):"","r"],["Your turn: make the line a tangent (one meeting point).","turn"]])}
  if(k==="index"){const {base:B,ia,ib,op}=s;const res=op==="mul"?ia+ib:op==="div"?ia-ib:ia*ib;return lines([["WORKED PATH · INDEX LAWS","h"],[op==="mul"?`${B}^${fmt(ia)} × ${B}^${fmt(ib)}`:op==="div"?`${B}^${fmt(ia)} ÷ ${B}^${fmt(ib)}`:`(${B}^${fmt(ia)})^${fmt(ib)}`,"b"],[op==="mul"?"same base, multiplying: add the powers":op==="div"?"same base, dividing: subtract the powers":"a power of a power: multiply the powers","r"],[`= ${B}^${fmt(res)} = ${powTxt(B,res)}`,"b"],["negative power: reciprocal. half power: root","r"],["Your turn: with base 2, divide to get 1/8.","turn"]])}
  if(k==="log"){const r=s.rate/100,tg=s.target,t=Math.log(tg)/Math.log(1+r);return lines([["WORKED PATH · SOLVE FOR THE POWER","h"],[`${P0}(${fmt(1+r)})ᵗ = ${fmt(tg*P0)}`,"b"],[`(${fmt(1+r)})ᵗ = ${fmt(tg)}`,"r"],[`log both sides: t log ${fmt(1+r)} = log ${fmt(tg)}`,"r"],[`t = ${fmt(Math.log10(tg))} ÷ ${fmt(Math.log10(1+r))} = ${fmt(t)}`,"b"],[`so the balance ${tg>=2?"reaches ×"+fmt(tg):"grows ×"+fmt(tg)} after ${Math.ceil(t-1e-9)} full years`,"r"],["Your turn: at 3%, how long to double?","turn"]])}
  return lines([["HOW THE EXAM MARKS IT","h"],["Achieved: carry out a method correctly.","r"],["Merit: connect ideas (Δ says how many roots).","r"],["Excellence: form a model from words, solve it.","r"],["Your turn: the challenges below. Check each one.","turn"]]);
  void kk}
function drawMain(x,st){const k=st.k;return k==="area"?areaScene():k==="quad"||k==="roots"?quadScene(st):k==="simul"?simulScene():k==="index"?indexScene():k==="log"?logScene():quadScene(st)}

const set=k=>(x,v)=>{s[k]=v};
const steps=[
 {k:"area",lab:"Area model",cap:"A rectangle with sides (x + p) and (x + q). Slide p and q and watch the four pieces of area add up to the expanded quadratic. Factorising is finding the sides from the area.",controls:["p","q"],
  big:"<b>The big idea:</b> (x + p)(x + q) = x² + (p + q)x + pq. To factorise, find two numbers that <i>multiply</i> to the constant and <i>add</i> to the x coefficient.",
  exam:()=>`x² ${sgn(s.p+s.q)}${fmt(Math.abs(s.p+s.q))}x ${sgn(s.p*s.q)}${fmt(Math.abs(s.p*s.q))} = ${bracket(s.p)}${bracket(s.q)}, since ${fmt(s.p)} × ${fmt(s.q)} = ${fmt(s.p*s.q)} and ${fmt(s.p)} + ${fmt(s.q)} = ${fmt(s.p+s.q)}.`,
  trap:"Getting the signs backwards: x² − x − 12 = (x − 4)(x + 3), not (x + 4)(x − 3). Check the middle term by expanding.",chips:["factors","expanded","sumprod"],onStep:()=>{s.p=2;s.q=3}},
 {k:"quad",lab:"Quadratic graph",cap:"y = ax² + bx + c drawn live. <b>Drag the vertex</b> and watch b and c change; slide a to open or flip the parabola. The roots, vertex and y-intercept all move together.",controls:["a","b","c"],
  big:"<b>The big idea:</b> a sets the shape, c is the y-intercept, and the vertex sits on x = −b/2a. Every feature of the graph is a number you can calculate from a, b and c.",
  exam:()=>{const V=vertex(s.a,s.b,s.c);return `The parabola y = ${poly([s.a,s.b,s.c])} has its vertex at (${fmt(V.h)}, ${fmt(V.k)}), which is a ${s.a>0?"minimum because a > 0":"maximum because a < 0"}, and crosses the y-axis at (0, ${fmt(s.c)}).`},
  trap:"Reading the vertex x-value as b/2a. It is −b/2a: the sign matters.",chips:["eq","vertex","yint"],onStep:()=>{s.a=1;s.b=-2;s.c=-3}},
 {k:"roots",lab:"Nature of roots",cap:"Slide c up and down. The discriminant Δ = b² − 4ac tells you before you solve whether the graph crosses the x-axis twice, touches once, or misses it.",controls:["a","b","c"],
  big:"<b>The big idea (Merit):</b> Δ > 0 means two real roots, Δ = 0 means one repeated root (the vertex sits on the axis), Δ < 0 means no real roots. Say which and why.",
  exam:()=>{const d=disc(s.a,s.b,s.c);return `For ${poly([s.a,s.b,s.c])} = 0, Δ = (${fmt(s.b)})² − 4(${fmt(s.a)})(${fmt(s.c)}) = ${fmt(d)}. ${d<0?"Δ < 0, so there are no real roots and the graph does not cross the x-axis.":d===0?"Δ = 0, so there is one repeated root and the graph touches the x-axis.":"Δ > 0, so there are two real roots and the graph crosses the x-axis twice."}`},
  trap:"Writing Δ = b² − 4ac but substituting a negative c as if it were positive. −4(1)(−3) = +12.",chips:["eq","disc","roots"],onStep:()=>{s.a=1;s.b=-2;s.c=1}},
 {k:"simul",lab:"Line meets curve",cap:"A line and a parabola. <b>Drag the line</b> up and down: the meeting points are where both equations are true at once. Set them equal and you get a new quadratic to solve.",controls:["m","k","a","b","c"],
  big:"<b>The big idea:</b> to solve a line and a curve simultaneously, set the two y's equal, rearrange to = 0, and solve. The discriminant of <i>that</i> quadratic says how many meeting points there are.",
  exam:()=>{const A=s.a,B=s.b-s.m,C=s.c-s.k,R=rootsOf(A,B,C);return `Setting ${poly([s.a,s.b,s.c])} = ${poly([s.m,s.k])} gives ${poly([A,B,C])} = 0. ${R.length?`Solving, x = ${R.map(fmt).join(" or x = ")}, so the line meets the curve at ${R.map(x=>`(${fmt(x)}, ${fmt(s.m*x+s.k)})`).join(" and ")}.`:"Δ < 0, so the line does not meet the curve."}`},
  trap:"Finding x and stopping. Substitute back into the line to find y, and give the points.",chips:["combined","disc2","points"],onStep:()=>{s.a=1;s.b=-2;s.c=-3;s.m=1;s.k=1}},
 {k:"index",lab:"Index laws",cap:"Each block is one more multiply by the base. Multiplying powers stacks the blocks (add the exponents); dividing removes them (subtract); a power of a power repeats the stack (multiply).",controls:["base","op","ia","ib"],
  big:"<b>The big idea:</b> aᵐ × aⁿ = aᵐ⁺ⁿ, aᵐ ÷ aⁿ = aᵐ⁻ⁿ, (aᵐ)ⁿ = aᵐⁿ. A negative exponent means a reciprocal (a⁻ⁿ = 1/aⁿ) and a fraction exponent means a root (a^½ = √a).",
  exam:()=>{const {base:B,ia,ib,op}=s;const res=op==="mul"?ia+ib:op==="div"?ia-ib:ia*ib;return `${op==="mul"?`${B}^${fmt(ia)} × ${B}^${fmt(ib)} = ${B}^(${fmt(ia)} + ${fmt(ib)})`:op==="div"?`${B}^${fmt(ia)} ÷ ${B}^${fmt(ib)} = ${B}^(${fmt(ia)} − ${fmt(ib)})`:`(${B}^${fmt(ia)})^${fmt(ib)} = ${B}^(${fmt(ia)} × ${fmt(ib)})`} = ${B}^${fmt(res)} = ${powTxt(B,res)}.`},
  trap:"Multiplying the bases: 2³ × 2² is 2⁵ = 32, not 4⁵. The base stays; only the exponents combine.",chips:["law","value"],onStep:()=>{s.base=2;s.ia=3;s.ib=2;s.op="mul"}},
 {k:"log",lab:"Logs and growth",cap:"A savings balance grows by a fixed percentage each year. When does it reach the target? The unknown is the <i>power</i>, so logs undo it. Slide the rate and the target.",controls:["rate","target"],
  big:"<b>The big idea (Excellence):</b> form the model A = P(1 + r)ᵗ from the context, set it equal to the target, and take logs of both sides to bring the exponent down: t = log(target ÷ P) ÷ log(1 + r).",
  exam:()=>{const r=s.rate/100,tg=s.target,t=Math.log(tg)/Math.log(1+r);return `The balance is A = ${P0}(${fmt(1+r)})ᵗ. Setting A = ${fmt(tg*P0)} gives (${fmt(1+r)})ᵗ = ${fmt(tg)}, so t = log ${fmt(tg)} ÷ log ${fmt(1+r)} = ${fmt(t)}. The balance reaches $${fmt(tg*P0)} during year ${Math.ceil(t-1e-9)}.`},
  trap:"Dividing the exponent out: 1.05ᵗ = 2 does not give t = 2/1.05. You need logs, or trial and improvement.",chips:["model","tstar"],onStep:()=>{s.rate=5;s.target=2}},
 {k:"test",lab:"Test yourself",cap:"Set the controls to answer each one, then press Check. Finish with the one-question check from memory.",controls:["p","q","a","b","c","m","k","base","op","ia","ib"],
  big:"<b>Exam tip:</b> show the method even when you can see the answer. For Merit, link two steps (Δ → number of roots). For Excellence, build the model from the words first.",chips:["factors","disc","disc2","law"]}
];
const KUPU=[{mi:"taurangi",en:"variable",ta:7765},{mi:"whārite",en:"equation",ta:10185},{mi:"pūtake",en:"root (of an equation)",ta:6650},{mi:"kauwhata",en:"graph",ta:2460},{mi:"tauoti",en:"integer",ta:7596},{mi:"taupū",en:"index, exponent, power",ta:44680}];
Object.entries({area:["taurangi","whārite"],quad:["kauwhata","whārite"],roots:["pūtake"],simul:["whārite","kauwhata"],index:["taupū"],log:["taupū"]}).forEach(([k,a])=>{const st=steps.find(x=>x.k===k);if(st)st.kupu=a});
const api=StudyKit.mount({kupu:KUPU,
  eyebrow:"Maths · Algebraic methods",title:"The algebra machine",homeHash:"l2",
  fig:"FIG. 41 · AN AREA MODEL, A PLOTTER AND A STACK OF POWERS",railTitle:"Algebra you can see",
  badge:{label:"NCEA L2 Maths 91261",exam:"2026-11-19T09:30:00+13:00",examText:"Thu 19 Nov, 9:30am"},
  mainBox:"0 0 640 360",mainPhoneBig:true,mainLabel:"An area model for factorising, a parabola with its vertex and roots, a line crossing it, stacked bars for index laws and an exponential growth graph",closeBox:"0 0 420 260",
  companion:"quiet",state:s,steps,
  controls:[
    {type:"range",id:"p",label:"p",min:-6,max:6,step:1,get:()=>s.p,set:set("p"),fmt:()=>fmt(s.p)},
    {type:"range",id:"q",label:"q",min:-6,max:6,step:1,get:()=>s.q,set:set("q"),fmt:()=>fmt(s.q)},
    {type:"range",id:"a",label:"a",min:-3,max:3,step:0.5,get:()=>s.a,set:(x,v)=>{s.a=v===0?(s.a>0?-0.5:0.5):v},fmt:()=>fmt(s.a)},
    {type:"range",id:"b",label:"b",min:-8,max:8,step:0.5,get:()=>s.b,set:set("b"),fmt:()=>fmt(s.b)},
    {type:"range",id:"c",label:"c",min:-8,max:10,step:0.5,get:()=>s.c,set:set("c"),fmt:()=>fmt(s.c)},
    {type:"range",id:"m",label:"line m",min:-4,max:4,step:0.5,get:()=>s.m,set:set("m"),fmt:()=>fmt(s.m)},
    {type:"range",id:"k",label:"line c",min:-8,max:10,step:0.5,get:()=>s.k,set:set("k"),fmt:()=>fmt(s.k)},
    {type:"select",id:"base",label:"Base",options:[["2","2"],["3","3"],["10","10"]],get:()=>String(s.base),set:(x,v)=>{s.base=+v}},
    {type:"select",id:"op",label:"Law",options:[["mul","Multiply"],["div","Divide"],["pow","Power of a power"]],get:()=>s.op,set:(x,v)=>{s.op=v}},
    {type:"range",id:"ia",label:"a",min:-3,max:5,step:1,get:()=>s.ia,set:set("ia"),fmt:()=>fmt(s.ia)},
    {type:"range",id:"ib",label:"b",min:-3,max:5,step:1,get:()=>s.ib,set:set("ib"),fmt:()=>fmt(s.ib)},
    {type:"range",id:"rate",label:"Rate",min:1,max:15,step:0.5,get:()=>s.rate,set:set("rate"),fmt:()=>fmt(s.rate)+"% a year"},
    {type:"range",id:"target",label:"Target",min:1.5,max:4,step:0.5,get:()=>s.target,set:set("target"),fmt:()=>"×"+fmt(s.target)}],
  drawMain,drawClose,
  chips:()=>{const d=disc(s.a,s.b,s.c),R=rootsOf(s.a,s.b,s.c),V=vertex(s.a,s.b,s.c),A=s.a,B=s.b-s.m,C=s.c-s.k,R2=rootsOf(A,B,C),res=s.op==="mul"?s.ia+s.ib:s.op==="div"?s.ia-s.ib:s.ia*s.ib,t=Math.log(s.target)/Math.log(1+s.rate/100);
    return{factors:["FACTORS",`${bracket(s.p)}${bracket(s.q)}`,true],expanded:["EXPANDED",poly([1,s.p+s.q,s.p*s.q])],sumprod:["SUM · PRODUCT",`${fmt(s.p+s.q)} · ${fmt(s.p*s.q)}`],
      eq:["EQUATION","y = "+poly([s.a,s.b,s.c]),true],vertex:["VERTEX",`(${fmt(V.h)}, ${fmt(V.k)})`],yint:["Y-INTERCEPT",`(0, ${fmt(s.c)})`],disc:["Δ = b² − 4ac",fmt(d),true],roots:["REAL ROOTS",R.length?R.map(fmt).join(", "):"none"],
      combined:["SET EQUAL",poly([A,B,C])+" = 0",true],disc2:["Δ",fmt(disc(A,B,C))],points:["MEETING POINTS",R2.length?R2.map(x=>`(${fmt(x)}, ${fmt(s.m*x+s.k)})`).join(" "):"none"],
      law:["LAW",`${s.base}^${fmt(res)}`,true],value:["VALUE",powTxt(s.base,res)],model:["MODEL",`A = ${P0}(${fmt(1+s.rate/100)})ᵗ`,true],tstar:["YEARS TO TARGET",fmt(t)]}},
  challenges:[
    {q:"Factorise x² − x − 12: set p and q so the area model shows it.",check:()=>s.p+s.q===-1&&s.p*s.q===-12,ok:"Yes: 3 and −4 multiply to −12 and add to −1, so x² − x − 12 = (x + 3)(x − 4).",no:()=>`Not yet: your model is ${poly([1,s.p+s.q,s.p*s.q])}. Hint: which pair multiplies to −12 and adds to −1?`},
    {q:"Make the parabola touch the x-axis exactly once.",check:()=>Math.abs(disc(s.a,s.b,s.c))<1e-9,ok:()=>`Yes: Δ = ${fmt(disc(s.a,s.b,s.c))}, one repeated root at x = ${fmt(-s.b/(2*s.a))}, and the vertex sits on the axis.`,no:()=>`Not yet: Δ = ${fmt(disc(s.a,s.b,s.c))}. Hint: you need b² = 4ac. Try moving c until the vertex lands on the axis.`},
    {q:"Make the line a tangent to the parabola: exactly one meeting point.",check:()=>Math.abs(disc(s.a,s.b-s.m,s.c-s.k))<1e-9,ok:"Yes: the combined quadratic has Δ = 0, so the line just touches the curve.",no:()=>{const d=disc(s.a,s.b-s.m,s.c-s.k);return `Not yet: the combined Δ is ${fmt(d)}, so ${d>0?"the line cuts twice":"the line misses"}. Hint: slide the line's c until Δ hits 0.`}},
    {q:"With base 2, divide two powers to get a value of 1/8.",check:()=>s.base===2&&s.op==="div"&&s.ia-s.ib===-3,ok:()=>`Yes: 2^${fmt(s.ia)} ÷ 2^${fmt(s.ib)} = 2⁻³ = 1/8.`,no:()=>s.op!=="div"?"Not yet: choose the Divide law first.":s.base!==2?"Not yet: set the base to 2.":`Not yet: 2^${fmt(s.ia-s.ib)} is ${powTxt(2,s.ia-s.ib)}. Hint: 1/8 is 2 to what power?`},
  ],
  retrieval:{q:"A quadratic has b² − 4ac < 0. How many times does its graph cross the x-axis?",options:["Never","Once","Twice","It depends on a"],answer:0,why:"A negative discriminant means no real roots, so the graph never reaches the x-axis. Δ = 0 touches once; Δ > 0 crosses twice."},
  papers:[{label:"NZQA: Mathematics and Statistics",url:"https://www2.nzqa.govt.nz/ncea/subjects/past-exams-and-exemplars/mathematics-and-statistics/"}],
  truth:"The savings example is made up for practice and compounds once a year. The area model shows negative terms as hatched tiles, a picture to help, not a proof.",
  footer:"Covers NCEA Level 2 Mathematics and Statistics 91261 (Apply algebraic methods in solving problems): factorising and expanding quadratics, the quadratic formula and discriminant, simultaneous equations with a line and a curve, index laws including negative and fractional exponents, and solving exponential equations with logarithms in a growth context."});
// ---- dragging the vertex and the line on the board
const svg=document.getElementById("k-main");let drag=null;
const toUser=e=>{const r=svg.getBoundingClientRect();return{x:ux((e.clientX-r.left)/r.width*640),y:uy((e.clientY-r.top)/r.height*360)}};
svg.addEventListener("pointerdown",e=>{const g=e.target.closest&&e.target.closest("[data-drag]");if(!g)return;drag=g.dataset.drag;svg.setPointerCapture(e.pointerId);e.preventDefault()});
svg.addEventListener("pointermove",e=>{if(!drag)return;const u=toUser(e);const snap=(v,st)=>Math.round(v/st)*st;
  if(drag==="vertex"){const h=Math.max(-5,Math.min(5,snap(u.x,0.5))),k=Math.max(-8,Math.min(10,snap(u.y,0.5)));s.b=Math.max(-8,Math.min(8,snap(-2*s.a*h,0.5)));s.c=Math.max(-8,Math.min(10,snap(k+s.a*h*h,0.5)))}
  else if(drag==="line"){s.k=Math.max(-8,Math.min(10,snap(u.y,0.5)))}
  sfx("tick");api.redraw()});
const stop=()=>{if(drag){drag=null;sfx("pop")}};svg.addEventListener("pointerup",stop);svg.addEventListener("pointercancel",stop);
const css=document.createElement("style");css.textContent=`.ax-sel{margin:4px 0 0 4px;max-width:100%}#k-main [data-drag]{touch-action:none}`;document.head.appendChild(css);
try{mq.addEventListener("change",()=>api.redraw())}catch(e){}
})();
