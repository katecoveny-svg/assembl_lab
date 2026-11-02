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
// ================= the 3D bench (kit3d.js via l2-3d.js): algebra tiles you stretch, a parabola ribbon over a river, block towers, a savings jar
// The same state object that marks the challenges drives every object here; the SVG above stays as the no-WebGL / ?lite fallback.
const SUP={"0":"⁰","1":"¹","2":"²","3":"³","4":"⁴","5":"⁵","6":"⁶","7":"⁷","8":"⁸","9":"⁹","-":"⁻","−":"⁻",".":"·"};
const supN=n=>fmt(n).split("").map(ch=>SUP[ch]||ch).join("");
function algebra3d(S){const {THREE,mat}=S;const L=window.L2,K=L.C;const V3=(x,y,z)=>new THREE.Vector3(x,y,z);const FR=L.frames(S);
  const hitM=new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false});
  const glossy=c=>mat("plastic",c,{rough:.36}),rubber=c=>mat("plastic",c,{rough:.82,coat:.04}),cylGeo=new THREE.CylinderGeometry(1,1,1,18),UP=V3(0,1,0);
  const seg=(m,a,b,r)=>{const d=b.clone().sub(a),Ln=d.length();if(Ln<1e-4){m.visible=false;return}m.visible=true;m.position.copy(a).addScaledVector(d,.5);m.quaternion.setFromUnitVectors(UP,d.divideScalar(Ln));m.scale.set(r,Ln,r)};
  // a grab knob: a glossy ball in a plum collar with a generous invisible hit sphere (fingers are big)
  const knob=(col,r=.2)=>{const g=new THREE.Group();g.add(S.sphere(r,glossy(col)));g.add(S.torus(r*1.2,r*.22,glossy(K.plum),{rot:[Math.PI/2,0,0],cast:false}));g.add(S.mesh(new THREE.SphereGeometry(r*3,10,8),hitM,{cast:false}));S.scene.add(g);return g};
  const plinth=(x,z,w,d,tint,h=.24)=>S.scene.add(S.rbox(w,h,d,.12,mat("plastic",tint,{rough:.6,coat:.15}),{at:[x,h/2,z]}));
  const st=()=>S.api.state;let K0="area",dragged={};
  const lab=(o)=>S.label(o);

  // ================= AREA: algebra tiles. x² slabs, x bars, unit cubes; negatives are matte pink rubber laid on top (taken away)
  const AX=-26,TT=.16,XL=2.4,U=.42,TOP=.24,OX=AX-2.2,OZ=-2.2;
  plinth(AX,0,7.4,7.4,"#FFFFFF");
  {const mt=S.panel(900,900,7.2);mt.rotation.x=-Math.PI/2;mt.position.set(AX,TOP+.003,0);S.scene.add(mt);
    mt.redraw((g,w,h)=>{const px=v=>(v-(AX-3.6))/7.2*w,pz=v=>(v+3.6)/7.2*h;g.fillStyle="#FBF8F4";L.rr(g,6,6,w-12,h-12,26);g.fill();g.strokeStyle="#EDE4F2";g.lineWidth=2;
      for(let i=-3;i<=12;i++){g.beginPath();g.moveTo(px(OX+i*U),pz(-3.4));g.lineTo(px(OX+i*U),pz(3.4));g.stroke();g.beginPath();g.moveTo(px(AX-3.4),pz(OZ+i*U));g.lineTo(px(AX+3.4),pz(OZ+i*U));g.stroke()}
      g.strokeStyle="#C7B4F0";g.lineWidth=5;L.rr(g,10,10,w-20,h-20,24);g.stroke()})}
  const decal=(w,d,txt)=>{const s=Math.min(w,d)*.86;const m=new THREE.Mesh(new THREE.PlaneGeometry(s,s),new THREE.MeshBasicMaterial({map:L.glyphTex(S,txt,{size:txt.length>2?84:120}),transparent:true,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.y=TT/2+.003;m.renderOrder=3;return m};
  const TILEK={slab:[XL,XL],col:[U,XL],row:[XL,U],unit:[U,U]};
  const tiles=[];
  function tile(kind){const [w,d]=TILEK[kind];const m=S.rbox(w-.035,TT,d-.035,.035,glossy(K.lav));const pos=decal(w,d,kind==="slab"?"x²":kind==="unit"?"1":"x"),neg=decal(w,d,kind==="unit"?"−1":"−x");m.add(pos,neg);
    const T={m,pos,neg,kind,a:0,want:false,x:0,y:0,z:0,sign:1};m.visible=false;S.scene.add(m);tiles.push(T);return T}
  const slab=tile("slab"),cols=Array.from({length:6},()=>tile("col")),rows=Array.from({length:6},()=>tile("row")),units=Array.from({length:36},()=>tile("unit"));
  const tileCol={slab:K.lav,col:K.sky,row:K.mint,unit:K.butter};
  const putTile=(T,x0,z0,layer,sign)=>{const [w,d]=TILEK[T.kind];T.want=true;T.x=OX+x0+w/2;T.z=OZ+z0+d/2;T.y=TOP+layer*TT+TT/2;
    if(T.sign!==sign||!T.m.userData.c){T.sign=sign;T.m.material=sign>0?glossy(tileCol[T.kind]):rubber(K.pink);T.pos.visible=sign>0;T.neg.visible=sign<0;T.m.userData.c=1}};
  // rulers: the two side lengths, x + p along the top and x + q down the left, with a knob at each end you stretch
  const rulerM=glossy(K.plum),rTop=S.mesh(cylGeo,rulerM),rLeft=S.mesh(cylGeo,rulerM);S.scene.add(rTop,rLeft);
  const tick=()=>{const m=S.cyl(.07,.07,.3,rulerM,{seg:12});S.scene.add(m);return m};const tk=[tick(),tick(),tick(),tick()];
  const xMark=S.mesh(cylGeo,glossy(K.lav));S.scene.add(xMark);const xMark2=S.mesh(cylGeo,glossy(K.lav));S.scene.add(xMark2);
  const kp=knob(K.peach,.22),kq=knob(K.peach,.22);
  S.dragger(kp,{normal:UP,start:()=>{dragged.p=1},move:p=>{const v=Math.round((p.x-OX-XL)/U);if(v!==st().p){st().p=S.clamp(v,-6,6);sfx("tick")}}});
  S.dragger(kq,{normal:UP,start:()=>{dragged.q=1},move:p=>{const v=Math.round((p.z-OZ-XL)/U);if(v!==st().q){st().q=S.clamp(v,-6,6);sfx("tick")}}});
  const hud=L.hud(S);const lP=lab({off:[-30,-30],lead:false}),lQ=lab({off:[-14,0],lead:false}),lSum=lab({off:[16,30]}),lNeg=lab({cls:"warn",off:[-60,26],lead:false}),
    lDp=lab({cls:"drag",off:[18,-26]}).set("drag to stretch"),lDq=lab({cls:"drag",off:[18,24]}).set("drag");

  // ================= GRAPH: a parabola ribbon standing over a river (the x-axis), with a vertex you drag
  const GX=0,GU=.42,BY=.55,GZ=0,gw=x=>GX+x*GU,gh=y=>BY+(y+8)*GU,ux=w=>(w-GX)/GU,uy=w=>(w-BY)/GU-8,Y0=gh(0);
  {const W=12*GU,H=20*GU;plinth(GX,-.2,W+1.6,2.2,K.lav,.3);
    S.scene.add(S.rbox(W+.5,H+.5,.16,.1,mat("acrylic",K.lav,{opacity:.42}),{at:[GX,BY+H/2,-.62],cast:false}));
    S.scene.add(S.rbox(W+.18,H+.18,.05,.04,mat("plastic","#ffffff",{rough:.5}),{at:[GX,BY+H/2,-.53]}));
    for(const sx of[-1,1])S.scene.add(S.cyl(.07,.09,BY+.2,mat("metal"),{at:[GX+sx*(W/2-.4),(BY+.2)/2,-.62],seg:14}));
    const pan=S.panel(720,1200,W);pan.position.set(GX,BY+H/2,-.5);S.scene.add(pan);
    const draw=()=>pan.redraw((g,w,h)=>{const px=x=>(x+6)/12*w,py=y=>h-(y+8)/20*h;g.fillStyle="#fff";g.fillRect(0,0,w,h);
      g.strokeStyle="#EEE8F1";g.lineWidth=2;for(let x=-6;x<=6;x++){g.beginPath();g.moveTo(px(x),0);g.lineTo(px(x),h);g.stroke()}for(let y=-8;y<=12;y++){g.beginPath();g.moveTo(0,py(y));g.lineTo(w,py(y));g.stroke()}
      g.strokeStyle="#9C8EA0";g.lineWidth=4;g.beginPath();g.moveTo(px(0),0);g.lineTo(px(0),h);g.stroke();
      g.font=`600 34px ${L.MONO}`;g.fillStyle=K.muted;g.textAlign="center";for(let x=-6;x<=6;x+=2)if(x)g.fillText(fmt(x),px(x),py(0)-16);
      g.textAlign="right";for(let y=-8;y<=12;y+=4)if(y)g.fillText(fmt(y),px(0)-12,py(y)+12);g.textAlign="left";g.fillText("y",px(0)+12,40);g.fillText("x",w-34,py(0)-50)});
    draw();L.fontsReady(draw)}
  const river=S.mesh(new THREE.BoxGeometry(12*GU+.5,.07,1.5),mat("liquid","#8FC3EC",{opacity:.62}),{cast:false});river.position.set(GX,Y0,.2);river.renderOrder=2;S.scene.add(river);
  const riverEdge=S.mesh(new THREE.BoxGeometry(12*GU+.5,.02,.03),mat("glow",K.deepSky,.4),{cast:false});riverEdge.position.set(GX,Y0+.04,.95);S.scene.add(riverEdge);
  const ribbonM=mat("plastic",K.sky,{rough:.32,extra:{side:THREE.DoubleSide}}),edgeM=glossy(K.deepSky);
  const ribbons=[0,1].map(()=>{const m=new THREE.Mesh(new THREE.BufferGeometry(),ribbonM);m.castShadow=true;m.receiveShadow=true;S.scene.add(m);return m});
  const edges=[0,1].map(()=>{const m=new THREE.Mesh(new THREE.BufferGeometry(),edgeM);S.scene.add(m);return m});
  // the straight line for "line meets curve": a pink rod with a knob on its y-intercept
  const rod=S.mesh(cylGeo,mat("plastic",K.deepPink,{rough:.3}));S.scene.add(rod);
  const kLine=knob(K.pink,.2);S.dragger(kLine,{normal:V3(0,0,1),start:()=>{dragged.line=1},move:p=>{const v=S.clamp(Math.round(uy(p.y)*2)/2,-8,10);if(v!==st().k){st().k=v;sfx("tick")}}});
  const kV=knob(K.pink,.24);S.dragger(kV,{normal:V3(0,0,1),start:()=>{dragged.v=1},move:p=>{const sn=(v,s2)=>Math.round(v/s2)*s2,s0=st();const h=S.clamp(sn(ux(p.x),.5),-5,5),k=S.clamp(sn(uy(p.y),.5),-8,10);
    const b=S.clamp(sn(-2*s0.a*h,.5),-8,8),c=S.clamp(sn(k+s0.a*h*h,.5),-8,10);if(b!==s0.b||c!==s0.c){s0.b=b;s0.c=c;sfx("tick")}}});
  const axisSym=S.mesh(new THREE.BoxGeometry(.035,20*GU,.035),mat("flat",K.plum,{opacity:.28}),{cast:false});S.scene.add(axisSym);
  const yInt=S.sphere(.13,glossy(K.butter));S.scene.add(yInt);
  const splash=Array.from({length:2},()=>{const g=new THREE.Group();g.add(S.torus(.26,.045,mat("glow","#7FC4A8",1.1),{rot:[Math.PI/2,0,0],cast:false}));g.add(S.torus(.42,.025,mat("flat","#7FC4A8",{opacity:.5}),{rot:[Math.PI/2,0,0],cast:false}));S.scene.add(g);g.userData.a=0;return g});
  const meetB=Array.from({length:2},()=>{const m=S.sphere(.16,mat("glow","#7FC4A8",.9));S.scene.add(m);return m});
  // the discriminant gauge: a track in front of the river; the ball rolls to none / one / two
  const GZ2=2.5;plinth(GX,GZ2,5.8,1.2,"#ffffff",.3);
  [[-1,K.pink],[0,K.butter],[1,K.mint]].forEach(([i,c])=>S.scene.add(S.rbox(i?1.7:.7,.06,.7,.03,mat("plastic",c,{rough:.5}),{at:[GX+i*1.6,.33,GZ2]})));
  const ball=S.sphere(.22,glossy("#ffffff"));ball.position.set(GX,.55,GZ2);S.scene.add(ball);let ballX=0;
  const lVert=lab({off:[22,-26]}),lYint=lab({off:[20,22]}),lRoots=[lab({off:[-20,-34]}),lab({off:[20,-34]})],lDisc=lab({cls:"big",off:[-70,-60],lead:false}),
    lNone=lab({off:[0,30],lead:false}).set("none"),lOne=lab({off:[0,30],lead:false}).set("one"),lTwo=lab({off:[0,30],lead:false}).set("two"),lDv=lab({cls:"drag",off:[22,30]}).set("drag the vertex"),
    lDl=lab({cls:"drag",off:[-22,26]}).set("drag the line"),lMeet=[lab({off:[-20,-30]}),lab({off:[20,-30]})];

  // ================= INDEX: block towers on a glass shelf. Up is ×base, hanging below is ÷base; stacking adds the powers
  const IX=26,SH=3.3,CS=.46,GAP=.04;
  S.scene.add(S.rbox(7.2,.08,1.6,.03,mat("glass","#ffffff",{opacity:.22}),{at:[IX,SH,0],cast:false}));
  S.scene.add(S.rbox(7.2,.03,1.62,.012,mat("glow",K.lav,.25),{at:[IX,SH-.055,0],cast:false}));
  for(const sx of[-1,1])for(const sz of[-1,1])S.scene.add(S.cyl(.05,.05,SH,mat("metal"),{at:[IX+sx*3.4,SH/2,sz*.65],seg:12}));
  const blocks=Array.from({length:64},()=>{const m=S.rbox(CS,CS,CS,.05,glossy(K.sky));m.visible=false;S.scene.add(m);return{m,a:0,want:false,x:0,y:0,z:0,dy:0,c:""}});
  const blockMat={a:glossy(K.sky),b:glossy(K.mint),r:glossy(K.butter),n:rubber(K.pink),g:mat("acrylic",K.lav,{opacity:.3})};
  const lA=lab({off:[-18,-30],lead:false}),lB=lab({off:[-18,-30],lead:false}),lR=lab({cls:"big",off:[-30,-34],lead:false}),lOp1=lab({cls:"big",off:[0,0],lead:false}),lOp2=lab({cls:"big",off:[0,0],lead:false}),lShelf=lab({off:[-120,26],lead:false}),lMore=lab({cls:"sun",off:[-40,-24],lead:false});

  // ================= LOG: a savings jar you slide along the years; coins pile up as A = 1000(1 + r)ᵗ, a ring marks the target
  const LX=52,LB=.6,LW=7,LH=4.2,lw=t=>LX-LW/2+t/30*LW,lh=v=>LB+v/4*LH;
  {S.scene.add(S.rbox(LW+.6,LH+.7,.14,.1,mat("acrylic",K.lav,{opacity:.4}),{at:[LX,LB+LH/2+.1,-.9],cast:false}));
    const pan=S.panel(1200,Math.round(1200*(LH+.4)/(LW+.3)),LW+.3);pan.position.set(LX,LB+LH/2+.05,-.8);S.scene.add(pan);
    const draw=()=>pan.redraw((g,w,h)=>{const px=t=>(.15+t/30*LW)/(LW+.3)*w,py=v=>(LH+.25-v/4*LH)/(LH+.4)*h;g.fillStyle="rgba(255,255,255,.96)";L.rr(g,0,0,w,h,30);g.fill();
      g.strokeStyle="#EEE8F1";g.lineWidth=2;for(let t=0;t<=30;t+=5){g.beginPath();g.moveTo(px(t),py(0));g.lineTo(px(t),py(4));g.stroke()}for(let v=0;v<=4;v++){g.beginPath();g.moveTo(px(0),py(v));g.lineTo(px(30),py(v));g.stroke()}
      g.font=`600 40px ${L.MONO}`;g.fillStyle=K.muted;g.textAlign="center";for(let t=5;t<=30;t+=5)g.fillText(t,px(t),py(0)+44);g.textAlign="left";for(let v=1;v<=4;v++)g.fillText("$"+v*1000,px(0)+12,py(v)-12);g.textAlign="right";g.fillText("years →",px(30)-8,py(0)-16)});draw();L.fontsReady(draw)}
  plinth(LX,1.2,LW+1,1.6,"#ffffff",.12);
  const curveTube=new THREE.Mesh(new THREE.BufferGeometry(),glossy("#7FC4A8"));S.scene.add(curveTube);
  const targetRod=S.mesh(cylGeo,mat("glow",K.deepPink,.7),{cast:false});S.scene.add(targetRod);
  const jar=new THREE.Group();S.scene.add(jar);
  {const prof=[[0,0],[.5,0],[.56,.06],[.56,1.62],[.5,1.7],[.42,1.76],[.42,1.86]].map(([x,y])=>new THREE.Vector2(x,y));
    const glass=new THREE.Mesh(new THREE.LatheGeometry(prof,40),mat("glass","#ffffff",{opacity:.2}));glass.renderOrder=4;jar.add(glass);
    jar.add(S.cyl(.47,.47,.16,glossy(K.butter),{at:[0,1.9,0],seg:32}));jar.add(S.mesh(new THREE.SphereGeometry(1.1,10,8),hitM,{cast:false,at:[0,.9,0]}))}
  const coins=S.swarm(42,new THREE.CylinderGeometry(.4,.4,.036,24),mat("metal","#E9C866",{rough:.3}),{cast:true});jar.add(coins);
  const ring=S.torus(.62,.04,mat("glow",K.deepPink,.8),{rot:[Math.PI/2,0,0],cast:false});jar.add(ring);
  const dotC=S.sphere(.14,glossy(K.pink));S.scene.add(dotC);const drop=S.mesh(cylGeo,mat("flat",K.plum,{opacity:.35}),{cast:false});S.scene.add(drop);
  let jt=0,jKey="",jDrag=false;S.dragger(jar,{normal:UP,start:()=>{jDrag=true;dragged.jar=1},move:p=>{jt=S.clamp((p.x-(LX-LW/2))/LW*30,0,30)},end:()=>{jDrag=false}});
  const lJar=lab({cls:"big",off:[44,6]}),lT=lab({cls:"hot",off:[14,24]}),lTarget=lab({cls:"warn",off:[8,-22],lead:false}),lDj=lab({cls:"drag",off:[30,26]}).set("drag the jar");

  // ================= framing (fits the zone to a phone or a desktop canvas)
  FR.add("area",{c:[AX+.3,.3,-.1],w:6.4,h:6.4,dir:[.12,1.55,1],pad:1.1,shadow:5}).add("graph",{c:[GX,4.9,.4],w:7.2,h:9.8,dir:[.34,.2,1],pad:1.02,shadow:7})
    .add("roots",{c:[GX,4,1.2],w:7,h:11.8,dir:[.26,.42,1],pad:1.02,shadow:7}).add("index",{c:[IX,4.4,0],w:7.4,h:7.4,dir:[.18,.2,1],shadow:6.5})
    .add("log",{c:[LX,2.7,.8],w:9,h:7.2,dir:[0,.32,1],pw:7.8,ph:8,shadow:7});
  const zoneOf={area:"area",quad:"graph",roots:"roots",simul:"graph",index:"index",log:"log"};
  const all=[lP,lQ,lSum,lNeg,lDp,lDq,lVert,lYint,...lRoots,lDisc,lNone,lOne,lTwo,lDv,lDl,...lMeet,lA,lB,lR,lOp1,lOp2,lShelf,lMore,lJar,lT,lTarget,lDj];
  let zone="area",prev=null,gKey="",first=true;
  const grow=(o,dt)=>{o.a=L.approach(S,o.a,o.want?1:0,dt,14);o.m.visible=o.a>.02};
  return{
    resize(){FR.resize()},
    step(stp,s){K0=stp.k;zone=zoneOf[K0]||"area";FR.go(zone,first);first=false;all.forEach(l=>l.hide());prev=null},
    update(s,stp,dt,t){const k=stp.k;
      // in Test yourself, fly to whichever part of the machine the student last changed
      if(k==="test"){const sig={area:s.p+"|"+s.q,graph:[s.a,s.b,s.c,s.m,s.k].join("|"),index:[s.base,s.op,s.ia,s.ib].join("|")};
        if(prev)for(const z in sig)if(sig[z]!==prev[z]&&zone!==z){zone=z;FR.go(z)}prev=sig}
      all.forEach(l=>l.hide());hud.clear();
      // ---- area tiles
      tiles.forEach(T=>T.want=false);const p=s.p,q=s.q;
      putTile(slab,0,0,0,1);
      for(let i=0;i<Math.abs(p);i++)putTile(cols[i],p>0?XL+i*U:XL-(i+1)*U,0,p>0?0:1,p>0?1:-1);
      for(let j=0;j<Math.abs(q);j++)putTile(rows[j],0,q>0?XL+j*U:XL-(j+1)*U,q>0?0:(p<0?2:1),q>0?1:-1);
      let n=0;for(let i=0;i<Math.abs(p);i++)for(let j=0;j<Math.abs(q);j++){const x0=p>0?XL+i*U:XL-(i+1)*U,z0=q>0?XL+j*U:XL-(j+1)*U;
        const layer=p>0&&q>0?0:p<0&&q<0?3:1;putTile(units[n++],x0,z0,layer,p*q>0?1:-1)}
      tiles.forEach(T=>{grow(T,dt);if(T.m.visible){const a=T.a;T.m.position.set(T.x,T.y+(1-a)*.6,T.z);T.m.scale.set(.6+.4*a,a,.6+.4*a)}});
      const Wd=XL+p*U,Hd=XL+q*U,rz=OZ-.42,rx=OX-.42;
      seg(rTop,V3(OX,TOP+.08,rz),V3(OX+Wd,TOP+.08,rz),.05);seg(rLeft,V3(rx,TOP+.08,OZ),V3(rx,TOP+.08,OZ+Hd),.05);
      tk[0].position.set(OX,TOP+.08,rz);tk[1].position.set(OX+Wd,TOP+.08,rz);tk[2].position.set(rx,TOP+.08,OZ);tk[3].position.set(rx,TOP+.08,OZ+Hd);tk.forEach((m,i)=>m.rotation.set(Math.PI/2,0,i<2?0:Math.PI/2));
      seg(xMark,V3(OX,TOP+.03,rz+.2),V3(OX+XL,TOP+.03,rz+.2),.025);seg(xMark2,V3(rx+.2,TOP+.03,OZ),V3(rx+.2,TOP+.03,OZ+XL),.025);
      kp.position.set(OX+Wd+.05,TOP+.22,rz);kq.position.set(rx,TOP+.22,OZ+Hd+.05);
      const az=zone==="area";
      if(az){lP.show().at(V3(OX+Wd/2,TOP+.1,rz)).set(`<b>${bracket(p)}</b>`);lQ.off=[-16,0];lQ.show().at(V3(rx,TOP+.1,OZ+Hd/2)).set(`<b>${bracket(q)}</b>`);
        hud.set(`<b>${bracket(p)}${bracket(q)} = ${poly([1,p+q,p*q])}</b>`);
        lSum.show(k==="area").at(V3(OX+XL+Math.max(p,0)*U,TOP+.3,OZ+XL+Math.max(q,0)*U)).set(`sum ${fmt(p+q)} · product ${fmt(p*q)}`);
        lNeg.show(p<0||q<0).at(V3(AX+3.4,TOP,3.3)).set(p<0&&q<0?"pink is taken away · the corner is added back":"pink tiles are taken away");
        lDp.show(!dragged.p&&k==="area").at(kp.position);lDq.show(!dragged.q&&k==="area").at(kq.position)}
      // ---- the graph
      const a=s.a,b=s.b,c=s.c,f=x=>a*x*x+b*x+c,key=a+"|"+b+"|"+c;
      if(key!==gKey){gKey=key;const segs=[];let cur=[];for(let x=-6;x<=6.0001;x+=.08){const y=f(x);if(y>=-8&&y<=12)cur.push([gw(x),gh(y)]);else if(cur.length){segs.push(cur);cur=[]}}if(cur.length)segs.push(cur);
        ribbons.forEach((m,i)=>{m.geometry.dispose();const sg=segs[i];m.visible=!!(sg&&sg.length>1);if(m.visible){m.geometry=L.ribbonGeo(S,sg,.34,.09);m.position.z=GZ}});
        edges.forEach((m,i)=>{m.geometry.dispose();const sg=segs[i];m.visible=!!(sg&&sg.length>1);if(m.visible)m.geometry=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(sg.map(([x,y])=>V3(x,y,GZ+.35))),Math.max(8,sg.length),.05,8,false)})}
      const R=rootsOf(a,b,c),V=vertex(a,b,c),gz=zone==="graph"||zone==="roots";
      const vIn=V.k>=-8&&V.k<=10;kV.visible=vIn&&(k==="quad"||k==="roots"||k==="test");kV.position.set(gw(V.h),gh(V.k),GZ+.45);
      axisSym.position.set(gw(V.h),BY+10*GU,GZ);yInt.visible=c>=-8&&c<=12;yInt.position.set(gw(0),gh(c),GZ+.4);
      splash.forEach((g,i)=>{const r=R[i];const want=r!==undefined&&Math.abs(r)<=6;g.userData.a=L.approach(S,g.userData.a,want?1:0,dt,8);g.visible=g.userData.a>.02;if(want)g.position.set(gw(r),Y0+.05,GZ);g.scale.setScalar(.4+.6*g.userData.a)});
      const d=disc(a,b,c);ballX=L.approach(S,ballX,S.clamp(d===0?0:d<0?-1.6-Math.min(.6,-d/40):1.6+Math.min(.6,d/40),-2.3,2.3),dt,5);ball.position.x=GX+ballX;ball.rotation.z=-ballX/.22;
      // the line
      const showLine=k==="simul"||(k==="test"&&zone==="graph");rod.visible=kLine.visible=showLine;
      if(showLine){const m=s.m,kk=s.k;let x0=-6,x1=6;if(m!==0){const xa=(-8-kk)/m,xb=(12-kk)/m;x0=Math.max(-6,Math.min(xa,xb));x1=Math.min(6,Math.max(xa,xb))}
        if(x0<x1)seg(rod,V3(gw(x0),gh(m*x0+kk),GZ+.2),V3(gw(x1),gh(m*x1+kk),GZ+.2),.06);else rod.visible=false;kLine.visible=kk>=-8&&kk<=12;kLine.position.set(gw(0),gh(kk),GZ+.5)}
      const R2=showLine?rootsOf(a,b-s.m,c-s.k):[];meetB.forEach((m,i)=>{const x=R2[i];m.visible=x!==undefined&&Math.abs(x)<=6&&Math.abs(s.m*x+s.k-4)<=8;if(m.visible)m.position.set(gw(x),gh(s.m*x+s.k),GZ+.3)});
      if(gz){hud.set(`<b>y = ${poly([a,b,c])}</b>`+(showLine?`<b class="pk">y = ${poly([s.m,s.k])}</b>`:zone==="roots"?`<b class="${d<0?"warn":d===0?"sun":"ok"}">Δ = ${fmt(d)} → ${R.length===0?"no real roots":R.length===1?"one repeated root":"two real roots"}</b>`:""));
        if(kV.visible)lVert.show().at(kV.position).set(`vertex<b>(${fmt(V.h)}, ${fmt(V.k)})</b>`);lVert.off=[22,a>0?24:-30];
        lYint.show(yInt.visible&&k!=="simul"&&zone!=="roots").at(yInt.position).set(`<b>(0, ${fmt(c)})</b>`);
        R.forEach((r,i)=>{if(Math.abs(r)<=6&&k!=="simul")lRoots[i].show().at(V3(gw(r),Y0,GZ+.5)).set(`<b>x = ${fmt(r)}</b>`)});if(R.length===1)lRoots[0].off=[0,-38];else lRoots[0].off=[-20,-34];
        lDv.show(!dragged.v&&k==="quad"&&kV.visible).at(kV.position);
        if(showLine){lDl.show(!dragged.line&&kLine.visible).at(kLine.position);
          meetB.forEach((m,i)=>{if(m.visible)lMeet[i].show().at(m.position).set(`<b>(${fmt(R2[i])}, ${fmt(s.m*R2[i]+s.k)})</b>`)})}}
      if(zone==="roots"){lDisc.show().at(V3(GX+2.9,.6,GZ2)).set(`Δ = b² − 4ac<b>${fmt(d)}</b>`);
        lNone.show().at(V3(GX-1.6,.36,GZ2+.35));lOne.show().at(V3(GX,.36,GZ2+.35));lTwo.show().at(V3(GX+1.6,.36,GZ2+.35))}
      // ---- index towers
      blocks.forEach(B=>B.want=false);let bi=0;const {base:Bs,ia,ib,op}=s;const res=op==="mul"?ia+ib:op==="div"?ia-ib:ia*ib;
      const col=(x,n,m,from=0,ghost=false)=>{const cap=n>=0?10:6;let shown=0;for(let i=0;i<Math.abs(n)&&from+i<cap;i++){const B=blocks[bi++];if(!B)break;const up=n>=0;const lvl=from+i;
          B.want=true;B.x=IX+x;B.z=0;B.y=up?SH+.04+CS/2+lvl*(CS+GAP):SH-.04-CS/2-lvl*(CS+GAP);const mm=ghost?blockMat.g:up?m:blockMat.n;if(B.m.material!==mm)B.m.material=mm;shown++}return Math.abs(n)-shown};
      const xa=-2.6,xb=-.9,xr=1.5;let extra=0;
      col(xa,ia,blockMat.a);col(xb,ib,blockMat.b);
      if(op==="mul"){if(ia>=0&&ib>=0){col(xr,ia,blockMat.a);extra=col(xr,ib,blockMat.b,ia)}else if(ia<0&&ib<0){col(xr,ia,blockMat.a);extra=col(xr,ib,blockMat.b,-ia)}else extra=col(xr,res,res>=0?blockMat.r:blockMat.n)}
      else if(op==="div"){extra=col(xr,res,res>=0?blockMat.r:blockMat.n);if(ib>0&&ia>=ib)col(xr+.7,ib,blockMat.g,0,true)}
      else{extra=col(xr,res,res>=0?blockMat.r:blockMat.n)}
      blocks.forEach(B=>{const was=B.m.visible;grow(B,dt);if(B.m.visible){if(!was)B.dy=S.REDUCED?0:1.2;B.dy=L.approach(S,B.dy,0,dt,9);B.m.position.set(B.x,B.y+B.dy,B.z);B.m.scale.setScalar(.5+.5*B.a)}});
      if(zone==="index"){const hy=(n)=>n>=0?SH+.04+Math.min(n,10)*(CS+GAP)+.1:SH+.3;
        hud.set(`<b>${op==="mul"?`${Bs}${supN(ia)} × ${Bs}${supN(ib)}`:op==="div"?`${Bs}${supN(ia)} ÷ ${Bs}${supN(ib)}`:`(${Bs}${supN(ia)})${supN(ib)}`} = ${Bs}${supN(res)} = ${powTxt(Bs,res)}</b><i>${op==="mul"?"same base, multiply: stack them, add the powers":op==="div"?"same base, divide: take blocks off, subtract":"power of a power: repeat the stack, multiply"}</i>`);
        lA.show().at(V3(IX+xa,hy(Math.max(ia,0)),0)).set(`<b>${Bs}${supN(ia)}</b>`);lB.show().at(V3(IX+xb,hy(Math.max(ib,0)),0)).set(`<b>${Bs}${supN(ib)}</b>`);
        lR.show().at(V3(IX+xr,hy(Math.max(res,0)),0)).set(`<b>${Bs}${supN(res)}</b>`);
        lOp1.show().at(V3(IX+(xa+xb)/2,SH+.5,0)).set(`<b>${op==="mul"?"×":op==="div"?"÷":"^"+fmt(ib)}</b>`);lOp2.show().at(V3(IX+(xb+xr)/2,SH+.5,0)).set("<b>=</b>");
        lShelf.show().at(V3(IX+3.3,SH,.8)).set(`shelf = ${Bs}⁰ = 1 · below it, ÷${Bs}`);lMore.show(extra>0).at(V3(IX+xr,res>=0?SH+10*(CS+GAP)+.5:SH-6*(CS+GAP)-.3,0)).set(`+${extra} more blocks`);
}
      // ---- the savings jar
      const r=s.rate/100,tg=s.target,tStar=Math.log(tg)/Math.log(1+r),lk=r+"|"+tg;
      if(lk!==jKey){jKey=lk;if(!jDrag)jt=Math.min(30,tStar);const pts=[];for(let tt=0;tt<=30;tt+=.25){const v=Math.pow(1+r,tt);if(v>4.05)break;pts.push(V3(lw(tt),lh(v),-.66))}
        curveTube.geometry.dispose();curveTube.geometry=pts.length>1?new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),pts.length*2,.06,8,false):new THREE.BufferGeometry()}
      seg(targetRod,V3(lw(0),lh(tg),-.66),V3(lw(30),lh(tg),-.66),.035);
      const val=Math.pow(1+r,jt),nC=Math.min(42,Math.round(val*1000/100));jar.position.set(lw(jt),.12,1.2);
      for(let i=0;i<42;i++){if(i<nC)coins.put(i,((i*37)%7-3)*.006,.06+i*.04,((i*53)%7-3)*.006,1,0,i*.9,0);else coins.put(i,0,-9,0,.0001)}coins.done();
      ring.position.y=.06+tg*1000/100*.04;const hit=jt>=tStar-1e-6;ring.material=mat("glow",hit?"#7FC4A8":K.deepPink,hit?1.2:.8);
      dotC.visible=val<=4.05;dotC.position.set(lw(jt),lh(Math.min(val,4.05)),-.6);seg(drop,dotC.position,V3(lw(jt),2.1,1.2),.012);drop.visible=dotC.visible;
      if(zone==="log"){hud.set(`<b>A = ${P0}(${fmt(1+r)})ᵗ</b><i>when is A = $${(tg*P0).toLocaleString("en-NZ")}?</i>`);lTarget.show().at(V3(lw(0)+.2,lh(tg),-.66)).set(`target $${(tg*P0).toLocaleString("en-NZ")}`);
        if(tStar<=30)lT.show().at(V3(lw(tStar),lh(tg),-.6)).set(`<b>t = ${fmt(tStar)} years</b>`);else lT.show().at(V3(LX,LB+LH,-.6)).set(`<b>t = ${fmt(tStar)} years</b>off the board`);
        lJar.show().at(V3(lw(jt)+.5,1.2,1.2)).set(`year ${fmt(Math.round(jt*10)/10)}<b>$${Math.round(val*P0).toLocaleString("en-NZ")}</b>`);lJar.cls(hit?"ok big":"big");lDj.show(!dragged.jar).at(V3(lw(jt),.9,1.6))}
      hud.flush()}};
}
const api=StudyKit.mount({kupu:KUPU,scene3d:algebra3d,postprocessing:false,
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
