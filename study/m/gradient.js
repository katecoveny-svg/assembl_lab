(()=>{
// The gradient machine (NCEA Level 2 Mathematics 91262; ?level=3 switches to Level 3 Calculus 91578): drag a tangent along a
// curve and read its gradient, watch the derivative graph assemble underneath, find turning points, read rates of change in
// two New Zealand contexts (a kōwhai seedling, a draining fuel tank), and see the anti-derivative as area under the rate graph.
const esc=StudyKit.esc,sfx=n=>{try{StudyKit.sfx(n)}catch(e){}};
const LEVEL=(()=>{try{return new URLSearchParams(location.search).get("level")==="3"?3:2}catch(e){return 2}})();
const F=StudyKit.fig,PAL=F.palette,TINT=PAL.case.lavender,PR=PAL.product,AX="#8F9BAA",INK="#262E5C",ROSE="#6E6A86";
const DEEP=c=>F.deep(c);
const r2=v=>Math.round(v*100)/100,fmt=v=>{const r=r2(v);return (Object.is(r,-0)?0:r).toString().replace("-","−")};
const sgn=(v,first)=>v<0?" − ":first?"":" + ";
function poly(co,x="x"){const n=co.length-1;let o="",first=true;co.forEach((v,i)=>{if(Math.abs(v)<1e-12)return;const pw=n-i,av=Math.abs(v);const cs=(av===1&&pw>0)?"":fmt(av);o+=sgn(v,first)+cs+(pw===0?"":pw===1?x:x+(pw===2?"²":"³"));first=false});return o||"0"}
// ---- the curves. Each has f, f', f'' and a worked derivation for the close-up panel
const CURVES={
  cubic:{lab:"x³ − 6x² + 9x + 1",eq:"f(x) = x³ − 6x² + 9x + 1",f:x=>x*x*x-6*x*x+9*x+1,df:x=>3*x*x-12*x+9,d2:x=>6*x-12,deq:"f′(x) = 3x² − 12x + 9",ym:-6,yM:12,dm:-6,dM:12,
    rule:["power rule, term by term:","x³ → 3x²,  −6x² → −12x,  9x → 9,  1 → 0","f′(x) = 3x² − 12x + 9 = 3(x − 1)(x − 3)"]},
  quad:{lab:"−x² + 4x + 1",eq:"f(x) = −x² + 4x + 1",f:x=>-x*x+4*x+1,df:x=>-2*x+4,d2:()=>-2,deq:"f′(x) = −2x + 4",ym:-6,yM:12,dm:-6,dM:12,
    rule:["power rule, term by term:","−x² → −2x,  4x → 4,  1 → 0","f′(x) = −2x + 4"]},
  prod:{lab:"5x e⁻ˣ",eq:"f(x) = 5x e⁻ˣ",f:x=>5*x*Math.exp(-x),df:x=>5*Math.exp(-x)*(1-x),d2:x=>5*Math.exp(-x)*(x-2),deq:"f′(x) = 5e⁻ˣ(1 − x)",ym:-3,yM:4,dm:-3,dM:8,
    rule:["product rule: (uv)′ = u′v + uv′","u = 5x, u′ = 5;  v = e⁻ˣ, v′ = −e⁻ˣ","f′(x) = 5e⁻ˣ − 5x e⁻ˣ = 5e⁻ˣ(1 − x)"]},
  sin:{lab:"3 sin x + 1",eq:"f(x) = 3 sin x + 1",f:x=>3*Math.sin(x)+1,df:x=>3*Math.cos(x),d2:x=>-3*Math.sin(x),deq:"f′(x) = 3 cos x",ym:-3,yM:5,dm:-4,dM:4,
    rule:["trig: (sin x)′ = cos x","constant multiple stays, constant drops","f′(x) = 3 cos x"]},
  ln:{lab:"4 ln(x + 1) − x",eq:"f(x) = 4 ln(x + 1) − x",f:x=>4*Math.log(x+1)-x,df:x=>4/(x+1)-1,d2:x=>-4/((x+1)*(x+1)),deq:"f′(x) = 4/(x + 1) − 1",ym:-3,yM:5,dm:-2,dM:8,
    rule:["chain rule on ln(x + 1): 1/(x + 1) × 1","then −x → −1","f′(x) = 4/(x + 1) − 1"]}};
const XM=-0.5,XX=4.5;
const CTX={kowhai:{name:"Kōwhai seedling",unit:"cm",tunit:"weeks",tM:24,f:t=>-0.05*t*t+3*t+8,df:t=>-0.1*t+3,eq:"h(t) = −0.05t² + 3t + 8",deq:"h′(t) = −0.1t + 3",qm:0,qM:60,rm:-2,rM:4,col:PR.lime},
  fuel:{name:"Fuel tank draining",unit:"L",tunit:"min",tM:30,f:t=>0.5*t*t-30*t+450,df:t=>t-30,eq:"V(t) = 0.5t² − 30t + 450",deq:"V′(t) = t − 30",qm:0,qM:500,rm:-35,rM:5,col:PR.peach}};
const s={curve:"cubic",x:2.5,showD:false,visited:[],ctx:"kowhai",t:6,c:8,showAll:false};let api=null;const stepK=()=>api&&api.step?api.step.k:"";
const C=()=>CURVES[s.curve],X=()=>CTX[s.ctx];
const mq=matchMedia("(max-width:820px)");const Zs=()=>mq.matches?1.3:1;
const T=(x,y,t,size,o={})=>`<text x="${x}" y="${y}"${o.a?` text-anchor="${o.a}"`:""} style="font:${o.wt||500} ${size*Zs()}px ${o.mono?"var(--mono)":"var(--display)"};fill:${o.fill||INK}${o.ls?`;letter-spacing:${o.ls}px`:""}">${esc(t)}</text>`;
const tagAt=(px,py,t,o={})=>{const w=t.length*6.6*Zs()+14,h=18*Zs();const x=o.a==="end"?px-w:o.a==="middle"?px-w/2:px;return `<rect x="${x}" y="${py-h+4}" width="${w}" height="${h}" rx="${h/2}" fill="#fff" stroke="${PAL.pill.line}"/>`+T(x+7,py-h*0.28,t,10.5,{wt:600,mono:true,fill:o.fill||INK})};
// a graph panel: {x0,x1,y0,y1} pixels, {xm,xM,ym,yM} units
function panel(P,o={}){const gx=x=>P.x0+(x-P.xm)/(P.xM-P.xm)*(P.x1-P.x0),gy=y=>P.y1-(y-P.ym)/(P.yM-P.ym)*(P.y1-P.y0);
  let g=`<rect x="${P.x0}" y="${P.y0}" width="${P.x1-P.x0}" height="${P.y1-P.y0}" fill="#fff" stroke="${AX}" stroke-width="1.2"/>`;
  const xs=o.xs||1,ys=o.ys||2;
  for(let x=Math.ceil(P.xm/xs)*xs;x<=P.xM+1e-9;x+=xs)g+=`<line x1="${gx(x)}" x2="${gx(x)}" y1="${P.y0}" y2="${P.y1}" stroke="var(--line)"/>`;
  for(let y=Math.ceil(P.ym/ys)*ys;y<=P.yM+1e-9;y+=ys)g+=`<line x1="${P.x0}" x2="${P.x1}" y1="${gy(y)}" y2="${gy(y)}" stroke="var(--line)"/>`;
  if(P.ym<=0&&P.yM>=0)g+=`<line x1="${P.x0}" x2="${P.x1}" y1="${gy(0)}" y2="${gy(0)}" stroke="${AX}" stroke-width="1.4"/>`;
  if(P.xm<=0&&P.xM>=0)g+=`<line x1="${gx(0)}" x2="${gx(0)}" y1="${P.y0}" y2="${P.y1}" stroke="${AX}" stroke-width="1.4"/>`;
  for(let x=Math.ceil(P.xm/xs)*xs;x<=P.xM+1e-9;x+=xs)if(x||!(P.ym<=0&&P.yM>=0))g+=`<text class="t-lab" x="${gx(x)}" y="${P.y1+12}" text-anchor="middle">${fmt(x)}</text>`;
  for(let y=Math.ceil(P.ym/ys)*ys;y<=P.yM+1e-9;y+=ys)if(y)g+=`<text class="t-lab" x="${P.x0-5}" y="${gy(y)+3.5}" text-anchor="end">${fmt(y)}</text>`;
  if(o.ylab)g+=`<text class="t-lab" x="${P.x0+4}" y="${P.y0+12}">${esc(o.ylab)}</text>`;if(o.xlab)g+=`<text class="t-lab" x="${P.x1-4}" y="${P.y1-5}" text-anchor="end">${esc(o.xlab)}</text>`;
  return {g,gx,gy}}
function curvePath(P,f,col,w=2.6,dash=""){const gx=P.gx,gy=P.gy,B=P.P;let d="",open=false;for(let px=B.x0;px<=B.x1;px+=2){const x=B.xm+(px-B.x0)/(B.x1-B.x0)*(B.xM-B.xm),y=f(x);const ok=isFinite(y)&&y>=B.ym-4&&y<=B.yM+4;if(!ok){open=false;continue}d+=(open?"L":"M")+px.toFixed(1)+","+gy(Math.max(B.ym-4,Math.min(B.yM+4,y))).toFixed(1);open=true}
  if(!d)return "";return `<path d="${d}" fill="none" stroke="${DEEP(col)}" stroke-width="${w+2}" stroke-linecap="round" stroke-linejoin="round" opacity=".9"${dash?` stroke-dasharray="${dash}"`:""}/><path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${dash?` stroke-dasharray="${dash}"`:""}/>`}
const pin=(gx,gy,x,y,col,r=6,extra="")=>`<circle cx="${gx(x)}" cy="${gy(y)}" r="${r}" fill="${col}" stroke="${INK}" stroke-width="1.4"${extra}/>`;
const clipTo=(P,id)=>`<clipPath id="${id}"><rect x="${P.x0}" y="${P.y0}" width="${P.x1-P.x0}" height="${P.y1-P.y0}"/></clipPath>`;
const simLabel=(x,y)=>`<rect x="${x}" y="${y}" width="84" height="18" rx="9" fill="#fff" stroke="${PAL.pill.line}"/>`+T(x+42,y+13,"SIMULATED",9,{a:"middle",mono:true,fill:ROSE,ls:1});
const turningPoints=c=>{const out=[];let prev=c.df(XM);for(let x=XM+0.005;x<=XX;x+=0.005){const v=c.df(x);if((prev<0&&v>=0)||(prev>0&&v<=0))out.push({x:Math.round(x*100)/100,kind:prev<0?"min":"max"});prev=v}return out};
const inflections=c=>{const out=[];let prev=c.d2(XM);for(let x=XM+0.005;x<=XX;x+=0.005){const v=c.d2(x);if((prev<0&&v>=0)||(prev>0&&v<=0))out.push(Math.round(x*100)/100);prev=v}return out};

// ---------- the curve bench: f on top, f′ assembling underneath
function curveScene(st){const c=C();let o=F.floor(640,420);const k=st.k;
  const U={x0:70,x1:600,y0:26,y1:228,xm:XM,xM:XX,ym:c.ym,yM:c.yM},L={x0:70,x1:600,y0:262,y1:396,xm:XM,xM:XX,ym:k==="inflect"?-8:c.dm,yM:k==="inflect"?8:c.dM};
  o+=F.acrylic(30,10,596,400,{tint:TINT,d:12,r:14,shadowLen:34,balls:false});
  const up=panel(U,{ylab:"y = f(x)",ys:c.yM-c.ym>10?4:2}),lo=panel(L,{ylab:k==="inflect"?"y = f″(x)":"y = f′(x)  gradient",ys:L.yM-L.ym>10?4:2});o+=up.g+lo.g;
  o+=`<defs>${clipTo(U,"cu")}${clipTo(L,"cl")}</defs>`;
  o+=`<g clip-path="url(#cu)">`+curvePath({gx:up.gx,gy:up.gy,P:U},c.f,PR.blueberry)+`</g>`;
  const x=s.x,y=c.f(x),m=c.df(x);
  // the tangent, drawn across the whole panel and clipped
  o+=`<g clip-path="url(#cu)"><line x1="${up.gx(XM)}" x2="${up.gx(XX)}" y1="${up.gy(y+m*(XM-x))}" y2="${up.gy(y+m*(XX-x))}" stroke="${DEEP(PR.strawberry)}" stroke-width="2.4"/>`;
  // rise and run triangle (run 1)
  const x2=x+1<=XX?x+1:x-1,dir=x2>x?1:-1;o+=`<path d="M${up.gx(x)},${up.gy(y)} H${up.gx(x2)} V${up.gy(y+m*dir)}" fill="none" stroke="${INK}" stroke-width="1.3" stroke-dasharray="3 3"/>`;
  o+=T((up.gx(x)+up.gx(x2))/2,up.gy(y)+(m*dir>=0?14:-6),"run 1",9.5,{a:"middle",mono:true,fill:ROSE})+T(up.gx(x2)+(dir>0?5:-5),(up.gy(y)+up.gy(y+m*dir))/2+3.5,`rise ${fmt(m)}`,9.5,{a:dir>0?"start":"end",mono:true,fill:ROSE})+`</g>`;
  // turning points and inflections when found
  if(k==="turn"||k==="test"||k==="inflect")turningPoints(c).forEach(tp=>{const near=Math.abs(tp.x-x)<0.06;o+=pin(up.gx,up.gy,tp.x,c.f(tp.x),near?PR.lime:"#fff",near?7:4.5)+(near?tagAt(up.gx(tp.x)+10,up.gy(c.f(tp.x))+(tp.kind==="max"?-8:24),`${tp.kind==="max"?"maximum":"minimum"} (${fmt(tp.x)}, ${fmt(c.f(tp.x))})`):"")});
  if(k==="inflect")inflections(c).forEach(ix=>{const near=Math.abs(ix-x)<0.06;o+=pin(up.gx,up.gy,ix,c.f(ix),near?PR.butter:"#fff",near?7:4.5)+(near?tagAt(up.gx(ix)+10,up.gy(c.f(ix))+24,`inflection (${fmt(ix)}, ${fmt(c.f(ix))})`):"")});
  // the grab point
  o+=`<g data-drag="x" style="cursor:grab"><circle cx="${up.gx(x)}" cy="${up.gy(y)}" r="18" fill="transparent"/>${pin(up.gx,up.gy,x,y,PR.strawberry,7.5)}</g>`;
  o+=tagAt(up.gx(x)+(x>3?-12:12),up.gy(y)-12,`gradient ${fmt(m)}`,{a:x>3?"end":"start"});
  if(k==="tangent")o+=tagAt(up.gx(x)+(x>3?-12:12),up.gy(y)+46,"← drag me along",{a:x>3?"end":"start",fill:"#B5466F"});
  // the lower panel: visited gradients, or the whole derivative
  const lf=k==="inflect"?c.d2:c.df;
  if(s.showD||k==="deriv"||k==="turn"||k==="inflect"||k==="test")o+=`<g clip-path="url(#cl)">`+curvePath({gx:lo.gx,gy:lo.gy,P:L},lf,PR.lime)+`</g>`;
  else s.visited.forEach(v=>{const d=c.df(v);if(d>=L.ym&&d<=L.yM)o+=`<circle cx="${lo.gx(v)}" cy="${lo.gy(d)}" r="2.6" fill="${DEEP(PR.lime)}"/>`});
  const lv=lf(x);if(lv>=L.ym&&lv<=L.yM){o+=`<line x1="${up.gx(x)}" x2="${up.gx(x)}" y1="${up.gy(Math.max(U.ym,Math.min(U.yM,y)))}" y2="${lo.gy(lv)}" stroke="${INK}" stroke-dasharray="3 4" opacity=".35"/>`;o+=pin(lo.gx,lo.gy,x,lv,PR.strawberry,6)+tagAt(lo.gx(x)+(x>3?-10:10),lo.gy(lv)-8,`${k==="inflect"?"f″":"f′"}(${fmt(x)}) = ${fmt(lv)}`,{a:x>3?"end":"start"})}
  if(k==="turn"||k==="inflect")o+=`<line x1="${L.x0}" x2="${L.x1}" y1="${lo.gy(0)}" y2="${lo.gy(0)}" stroke="#B5466F" stroke-width="1.6" stroke-dasharray="5 4"/>`+tagAt(L.x1-4,lo.gy(0)-6,k==="inflect"?"f″ = 0 here":"f′ = 0 here",{a:"end",fill:"#B5466F"});
  o+=T(40,418,c.eq,10,{mono:true,fill:ROSE});
  return o}
// ---------- rates of change in context
function rateScene(){const X0=X();let o=F.floor(640,420);const t=s.t,q=X0.f(t),r=X0.df(t);
  // the thing itself, left: a seedling in a pot, or a tank with a level
  o+=F.acrylic(14,14,196,392,{tint:TINT,d:12,r:14,shadowLen:30,balls:false});o+=simLabel(30,24);
  if(s.ctx==="kowhai"){const h=q,base=360,top=base-h*4.6;o+=F.box(62,base,100,28,{colour:PR.peach,kind:"plastic",d:8,r:6,shadowLen:24});o+=`<rect x="58" y="${base-10}" width="108" height="12" rx="3" fill="${PR.peach}" stroke="${DEEP(PR.peach)}"/>`;
    o+=`<path d="M112,${base-8} C${110},${base-40} ${116},${base-80} ${112},${top}" fill="none" stroke="#4E8F58" stroke-width="5" stroke-linecap="round"/>`;
    const n=Math.max(2,Math.round(h/6));for(let i=1;i<=n;i++){const yy=base-10-(i/(n+1))*(base-10-top),sx=i%2?-1:1;o+=`<path d="M112,${yy} q${sx*14},-8 ${sx*28},0 q${-sx*14},8 ${-sx*28},0z" fill="#86C35E" stroke="#4E8F58" stroke-width="1.2"/>`}
    o+=`<line x1="178" x2="178" y1="${base-10}" y2="${top}" stroke="${INK}" stroke-width="1.2"/><path d="M174,${base-10} h8 M174,${top} h8" stroke="${INK}" stroke-width="1.2"/>`+T(184,(base-10+top)/2+4,`${fmt(q)} cm`,10,{mono:true,wt:600});
    o+=T(30,64,"KŌWHAI SEEDLING",10,{mono:true,fill:ROSE,ls:1})+T(30,84,`week ${fmt(t)}`,13,{wt:600,mono:true})}
  else{const frac=q/450,x0=52,y0=120,W=120,H=240;o+=F.acrylic(x0,y0,W,H,{tint:PAL.case.sky,d:10,r:10,shadowLen:24,balls:false});
    if(frac>0.002)o+=`<rect x="${x0+3}" y="${y0+H-frac*H}" width="${W-6}" height="${frac*H}" rx="4" fill="${PR.peach}" opacity=".75"/>`;
    o+=`<path d="M${x0+W-16},${y0+H} v14 h22" fill="none" stroke="${PAL.steelDark}" stroke-width="6" stroke-linecap="round"/><path d="M${x0+W-16},${y0+H} v14 h22" fill="none" stroke="${PAL.steel}" stroke-width="3.6" stroke-linecap="round"/>`;
    if(q>0&&r<0)o+=`<rect x="${x0+W+8}" y="${y0+H+12}" width="${2+Math.min(5,-r/6)}" height="${22}" fill="${PR.peach}" opacity=".8"/>`;
    for(let i=0;i<=10;i++)o+=`<line x1="${x0+W+10}" x2="${x0+W+10+(i%5?5:9)}" y1="${y0+H-i*H/10}" y2="${y0+H-i*H/10}" stroke="${AX}"/>`;
    o+=T(30,64,"FUEL TANK",10,{mono:true,fill:ROSE,ls:1})+T(30,84,`minute ${fmt(t)}`,13,{wt:600,mono:true})+T(30,104,`${fmt(q)} L left`,12,{mono:true})}
  // right: quantity against time with the tangent, rate underneath
  const Q={x0:270,x1:606,y0:26,y1:222,xm:0,xM:X0.tM,ym:X0.qm,yM:X0.qM},R={x0:270,x1:606,y0:258,y1:396,xm:0,xM:X0.tM,ym:X0.rm,rM:0,yM:X0.rM};
  o+=F.acrylic(226,14,400,392,{tint:TINT,d:12,r:14,shadowLen:30,balls:false});
  const up=panel(Q,{ylab:`${X0.unit} against ${X0.tunit}`,xs:X0.tM/6,ys:(X0.qM-X0.qm)/5}),lo=panel(R,{ylab:`rate, ${X0.unit}/${X0.tunit.replace(/s$/,"")}`,xs:X0.tM/6,ys:s.ctx==="fuel"?10:1});o+=up.g+lo.g;
  o+=`<defs>${clipTo(Q,"cq")}${clipTo(R,"cr")}</defs>`;
  o+=`<g clip-path="url(#cq)">`+curvePath({gx:up.gx,gy:up.gy,P:Q},X0.f,X0.col)+`<line x1="${up.gx(0)}" x2="${up.gx(X0.tM)}" y1="${up.gy(q+r*(0-t))}" y2="${up.gy(q+r*(X0.tM-t))}" stroke="${DEEP(PR.strawberry)}" stroke-width="2.2"/></g>`;
  o+=`<g data-drag="t" style="cursor:grab"><circle cx="${up.gx(t)}" cy="${up.gy(q)}" r="18" fill="transparent"/>${pin(up.gx,up.gy,t,q,PR.strawberry,7.5)}</g>`;
  o+=tagAt(up.gx(t)+(t>X0.tM*0.6?-12:12),up.gy(q)-12,`${fmt(q)} ${X0.unit} at ${fmt(t)} ${X0.tunit.replace(/s$/,"")}${t===1?"":"s"}`,{a:t>X0.tM*0.6?"end":"start"});
  o+=`<g clip-path="url(#cr)">`+curvePath({gx:lo.gx,gy:lo.gy,P:R},X0.df,PR.lime)+`</g>`;
  o+=`<line x1="${up.gx(t)}" x2="${up.gx(t)}" y1="${up.gy(Math.max(Q.ym,Math.min(Q.yM,q)))}" y2="${lo.gy(Math.max(R.ym,Math.min(R.yM,r)))}" stroke="${INK}" stroke-dasharray="3 4" opacity=".35"/>`;
  o+=pin(lo.gx,lo.gy,t,r,PR.strawberry,6)+tagAt(lo.gx(t)+(t>X0.tM*0.6?-10:10),lo.gy(r)-8,`rate ${fmt(r)} ${X0.unit}/${X0.tunit.replace(/s$/,"")}`,{a:t>X0.tM*0.6?"end":"start",fill:r<0?"#B5466F":"#2A7D63"});
  o+=T(236,418,X0.eq+"   "+X0.deq,10,{mono:true,fill:ROSE});
  return o}
// ---------- anti-derivative: area under the rate graph is the height gained; +c is where you started
function antiScene(){let o=F.floor(640,420);const X0=CTX.kowhai,t=s.t,c=s.c,area=-0.05*t*t+3*t;
  const R={x0:70,x1:600,y0:26,y1:170,xm:0,xM:24,ym:0,yM:4},H={x0:70,x1:600,y0:206,y1:396,xm:0,xM:24,ym:0,yM:70};
  o+=F.acrylic(30,10,596,400,{tint:TINT,d:12,r:14,shadowLen:34,balls:false});o+=simLabel(40,16);
  const up=panel(R,{ylab:"growth rate, cm/week",xs:4,ys:1}),lo=panel(H,{ylab:"height, cm",xs:4,ys:10});o+=up.g+lo.g;
  // shaded area 0..t under the rate line
  let d=`M${up.gx(0)},${up.gy(0)}`;for(let u=0;u<=t+1e-9;u+=0.25)d+=`L${up.gx(u).toFixed(1)},${up.gy(X0.df(u)).toFixed(1)}`;d+=`L${up.gx(t)},${up.gy(0)}Z`;
  o+=`<path d="${d}" fill="${PR.lime}" opacity=".35"/>`;
  for(let u=0;u<t;u+=2)o+=`<rect x="${up.gx(u)}" y="${up.gy(X0.df(u+1))}" width="${up.gx(u+Math.min(2,t-u))-up.gx(u)}" height="${up.gy(0)-up.gy(X0.df(u+1))}" fill="none" stroke="${DEEP(PR.lime)}" stroke-opacity=".5"/>`;
  o+=`<defs>${clipTo(R,"ca")}</defs><g clip-path="url(#ca)">`+curvePath({gx:up.gx,gy:up.gy,P:R},X0.df,PR.lime)+`</g>`;
  o+=`<g data-drag="t" style="cursor:grab"><circle cx="${up.gx(t)}" cy="${up.gy(X0.df(t))}" r="18" fill="transparent"/>${pin(up.gx,up.gy,t,X0.df(t),PR.strawberry,7.5)}</g>`;
  o+=tagAt(up.gx(t)+(t>14?-12:12),up.gy(X0.df(t))-12,`area so far ${fmt(area)} cm`,{a:t>14?"end":"start"});
  // the family of anti-derivatives, with the chosen c solid
  const hf=cc=>u=>-0.05*u*u+3*u+cc;
  o+=`<defs>${clipTo(H,"ch")}</defs><g clip-path="url(#ch)">`;
  if(s.showAll)[0,4,12,16,20].filter(v=>v!==c).forEach(v=>o+=curvePath({gx:lo.gx,gy:lo.gy,P:H},hf(v),"#DCD6EA",1.8,"4 4"));
  o+=curvePath({gx:lo.gx,gy:lo.gy,P:H},hf(c),PR.blueberry)+`</g>`;
  o+=`<line x1="${lo.gx(t)}" x2="${lo.gx(t)}" y1="${lo.gy(c)}" y2="${lo.gy(c+area)}" stroke="${DEEP(PR.lime)}" stroke-width="5" stroke-linecap="round"/>`;
  o+=pin(lo.gx,lo.gy,0,c,PR.butter,6)+tagAt(lo.gx(0)+10,lo.gy(c)+(c>50?24:-8),`starts at c = ${fmt(c)} cm`);
  o+=pin(lo.gx,lo.gy,t,c+area,PR.strawberry,6)+tagAt(lo.gx(t)+(t>14?-10:10),lo.gy(c+area)-8,`${fmt(c)} + ${fmt(area)} = ${fmt(c+area)} cm`,{a:t>14?"end":"start"});
  o+=`<line x1="${up.gx(t)}" x2="${up.gx(t)}" y1="${up.gy(0)}" y2="${lo.gy(c+area)}" stroke="${INK}" stroke-dasharray="3 4" opacity=".3"/>`;
  o+=T(40,418,"h′(t) = −0.1t + 3   →   h(t) = −0.05t² + 3t + c",10,{mono:true,fill:ROSE});
  return o}
// ---------- the worked path (close-up)
function lines(rows){let o="",y=18;rows.forEach(([t,kind])=>{if(kind==="h")o+=`<text class="t-lab" x="14" y="${y+2}">${esc(t)}</text>`;else if(kind==="turn"){o+=`<rect x="10" y="${y-13}" width="400" height="30" rx="8" fill="${PAL.case.butter}"/><text x="20" y="${y+6}" style="font:600 12px var(--display);fill:${INK}">${esc(t)}</text>`;y+=8}
  else o+=`<text x="14" y="${y+2}" style="font:${kind==="b"?600:500} ${kind==="b"?13.5:12}px var(--mono);fill:${kind==="r"?ROSE:INK}">${esc(t)}</text>`;y+=kind==="h"?20:kind==="turn"?28:22});return o}
function drawClose(x,st){const k=st.k,c=C(),xx=s.x,m=c.df(xx),y=c.f(xx);
  if(k==="tangent")return lines([["WORKED PATH · GRADIENT AT A POINT","h"],[c.deq,"b"],[`at x = ${fmt(xx)}: f′(${fmt(xx)}) = ${fmt(m)}`,"r"],[`point (${fmt(xx)}, ${fmt(y)}), gradient ${fmt(m)}`,"r"],[`tangent: y − ${fmt(y)} = ${fmt(m)}(x − ${fmt(xx)})`,"b"],[`y = ${poly([m,y-m*xx])}`,"r"],["Your turn: drag to x = 2. What is the gradient?","turn"]]);
  if(k==="deriv"||k==="rules")return lines([["WORKED PATH · THE GRADIENT FUNCTION","h"],[c.eq,"b"],[c.rule[0],"r"],[c.rule[1],"r"],[c.rule[2],"b"],["the lower graph is f′: height there = gradient here","r"],["Your turn: where is the lower graph below zero?","turn"]]);
  if(k==="turn"){const tps=turningPoints(c);return lines([["WORKED PATH · TURNING POINTS","h"],[`solve f′(x) = 0:  ${c.deq.replace("f′(x) = ","")} = 0`,"b"],[tps.length?`x = ${tps.map(t=>fmt(t.x)).join(" or x = ")}`:"no turning points in view","r"],[`f′ just left: ${fmt(c.df(xx-0.2))}, just right: ${fmt(c.df(xx+0.2))}`,"r"],[`f″(${fmt(xx)}) = ${fmt(c.d2(xx))} → ${c.d2(xx)<0?"concave down, maximum":c.d2(xx)>0?"concave up, minimum":"test either side"}`,"b"],["Your turn: drag until the gradient reads 0.","turn"]])}
  if(k==="inflect"){const ix=inflections(c);return lines([["WORKED PATH · POINT OF INFLECTION","h"],[`f″(x) = 0 and f″ changes sign`,"b"],[`f″(${fmt(xx)}) = ${fmt(c.d2(xx))}`,"r"],[ix.length?`inflection at x = ${ix.map(fmt).join(", ")}`:"no inflection in view","r"],[`concavity ${c.d2(xx)<0?"down (frown)":"up (smile)"} at x = ${fmt(xx)}`,"b"],["Your turn: find where the curve changes bend.","turn"]])}
  if(k==="rates"){const X0=X(),t=s.t,r=X0.df(t);return lines([["WORKED PATH · RATE OF CHANGE","h"],[X0.eq,"b"],[X0.deq,"r"],[`at t = ${fmt(t)}: ${fmt(r)} ${X0.unit} per ${X0.tunit.replace(/s$/,"")}`,"b"],[r<0?`negative: the ${X0.unit==="L"?"fuel":"height"} is decreasing`:`positive: the ${X0.unit==="L"?"fuel":"height"} is increasing`,"r"],[`second derivative ${fmt(s.ctx==="fuel"?1:-0.1)}: the rate is ${s.ctx==="fuel"?"rising toward 0, so draining slows":"falling, so growth slows"}`,"r"],[s.ctx==="fuel"?"Your turn: when is it draining at 15 L/min?":"Your turn: when does it grow at 1 cm a week?","turn"]])}
  if(k==="anti"){const t=s.t;return lines([["WORKED PATH · ANTI-DIFFERENTIATE","h"],["h′(t) = −0.1t + 3","b"],["reverse the power rule: raise the power, divide by it","r"],["h(t) = −0.05t² + 3t + c","b"],[`c is the start height: h(0) = ${fmt(s.c)} so c = ${fmt(s.c)}`,"r"],[`h(${fmt(t)}) = ${fmt(-0.05*t*t+3*t)} + ${fmt(s.c)} = ${fmt(-0.05*t*t+3*t+s.c)} cm`,"b"],["Your turn: a seedling that starts at 12 cm. Find h(10).","turn"]])}
  return lines([["HOW THE EXAM MARKS IT","h"],["Achieved: differentiate and read a gradient.","r"],["Merit: connect f′ = 0 to a turning point, say which.","r"],["Excellence: a rate in context, with units and meaning.","r"],["Your turn: the challenges below. Check each one.","turn"]])}
function drawMain(x,st){const k=st.k;return k==="rates"?rateScene():k==="anti"?antiScene():curveScene(st)}

const L2STEPS=[
 {k:"tangent",lab:"Tangent",cap:"<b>Drag the point</b> along the curve. The pink line is the tangent there, and its gradient is the number the whole topic is about. Each spot you visit leaves a dot on the lower graph.",controls:["curve","x"],
  big:"<b>The big idea:</b> the gradient of a curve at a point is the gradient of its tangent there. Differentiating gives you a formula, f′(x), that hands you that gradient for any x.",
  exam:()=>{const c=C(),m=c.df(s.x);return `${c.deq}. At x = ${fmt(s.x)}, f′(${fmt(s.x)}) = ${fmt(m)}, so the gradient of the tangent is ${fmt(m)} and its equation is y = ${poly([m,c.f(s.x)-m*s.x])}.`},
  trap:"Substituting into f(x) instead of f′(x) for the gradient. f(x) gives the height; f′(x) gives the slope.",chips:["fx","at","grad"],onStep:()=>{s.showD=false}},
 {k:"deriv",lab:"Gradient function",cap:"The dots join up: the lower graph <i>is</i> f′(x), the gradient function. Where the curve climbs, f′ is above zero; where it falls, f′ is below. Switch curves to compare.",controls:["curve","x"],
  big:"<b>The big idea:</b> the power rule: xⁿ → nxⁿ⁻¹, term by term. Constants vanish because a flat line has gradient 0.",
  exam:()=>{const c=C();return `Differentiating term by term, ${c.deq}. The gradient function is positive where the curve is increasing and negative where it is decreasing.`},
  trap:"Forgetting to drop the power by one: x³ differentiates to 3x², not 3x³.",chips:["fx","dfx","grad"],onStep:()=>{s.showD=true}},
 {k:"turn",lab:"Turning points",cap:"Where the gradient is exactly 0 the curve turns. <b>Drag to a turning point</b>, then look either side: gradient from + to − is a maximum, − to + is a minimum.",controls:["curve","x"],
  big:"<b>The big idea (Merit):</b> solve f′(x) = 0 to find turning points, then decide their nature: check the sign of f′ either side, or the sign of f″.",
  exam:()=>{const c=C(),tps=turningPoints(c);return `Turning points occur where f′(x) = 0. ${tps.length?tps.map(t=>`At x = ${fmt(t.x)}, f″(${fmt(t.x)}) = ${fmt(c.d2(t.x))} ${c.d2(t.x)<0?"< 0, so (" + fmt(t.x) + ", " + fmt(c.f(t.x)) + ") is a maximum":"> 0, so (" + fmt(t.x) + ", " + fmt(c.f(t.x)) + ") is a minimum"}.`).join(" "):"This curve has no turning points in view."}`},
  trap:"Finding x and stopping. A turning point is a point: give the y-value too, and say maximum or minimum.",chips:["fx","dfx","grad","tps"],onStep:()=>{s.showD=true}},
 {k:"rates",lab:"Rates of change",cap:"Two things that change over time. The gradient of the quantity graph is the rate: cm a week for a seedling, litres a minute for a tank. <b>Drag along</b> and read the rate underneath.",controls:["ctx","t"],
  big:"<b>The big idea (Excellence):</b> a rate of change is a derivative with units. Negative means decreasing. Say what the number means in the situation.",
  exam:()=>{const X0=X(),r=X0.df(s.t);return `${X0.deq}. At t = ${fmt(s.t)}, the rate is ${fmt(r)} ${X0.unit}/${X0.tunit.replace(/s$/,"")}, so the ${X0.unit==="L"?"fuel is draining at " + fmt(-r) + " litres a minute":"seedling is growing " + fmt(r) + " cm a week"} at that moment, and the rate is ${s.ctx==="fuel"?"getting smaller as the tank empties":"slowing as the plant matures"}.`},
  trap:"Quoting the rate with no units. 3 what, per what? Cm per week and litres per minute are part of the answer.",chips:["ctxeq","q","rate"],onStep:()=>{s.t=6}},
 {k:"anti",lab:"Anti-derivative",cap:"Reverse it. The area under the rate graph up to week t is the height gained, and the height graph is the anti-derivative. One missing piece: where did it start? That's c.",controls:["t","c","showAll"],
  big:"<b>The big idea:</b> anti-differentiating raises each power by one and divides by the new power, plus a constant c. You need one known point to find c.",
  exam:()=>`Anti-differentiating h′(t) = −0.1t + 3 gives h(t) = −0.05t² + 3t + c. Since the seedling is ${fmt(s.c)} cm at t = 0, c = ${fmt(s.c)}, so h(t) = −0.05t² + 3t + ${fmt(s.c)} and h(${fmt(s.t)}) = ${fmt(-0.05*s.t*s.t+3*s.t+s.c)} cm.`,
  trap:"Leaving out + c, or leaving c in when the question gives you a starting value to find it.",chips:["area","start","height"],onStep:()=>{s.t=10;s.c=8}},
 {k:"test",lab:"Test yourself",cap:"Set the controls to answer each one, then press Check. Finish with the one-question check from memory.",controls:["curve","x","ctx","t"],
  big:"<b>Exam tip:</b> write the derivative first, every time. For Merit, say what f′ = 0 tells you. For Excellence, give the rate with units and what it means.",chips:["dfx","grad","rate"]}];
const L3STEPS=[
 {k:"tangent",lab:"Tangent",cap:"<b>Drag the point</b> along the curve. The pink line is the tangent and its gradient is f′ there. Switch to the product, trig and log curves: the same idea, harder derivatives.",controls:["curve","x"],
  big:"<b>The big idea:</b> the gradient at a point is f′(x) there, whatever rule produced f′. Differentiate first, substitute second.",
  exam:()=>{const c=C(),m=c.df(s.x);return `${c.deq}. At x = ${fmt(s.x)}, f′(${fmt(s.x)}) = ${fmt(m)}, so the tangent has gradient ${fmt(m)} and equation y = ${poly([m,c.f(s.x)-m*s.x])}.`},
  trap:"Substituting into f(x) instead of f′(x). The height is not the slope.",chips:["fx","at","grad"],onStep:()=>{s.showD=false}},
 {k:"rules",lab:"Rules",cap:"Product, chain, trig and log derivatives, one curve each. The worked path on the right shows the rule; the lower graph is the f′ it produces.",controls:["curve","x"],
  big:"<b>The big idea:</b> product rule (uv)′ = u′v + uv′; chain rule: differentiate the outside, multiply by the derivative of the inside; (sin x)′ = cos x, (eˣ)′ = eˣ, (ln x)′ = 1/x.",
  exam:()=>{const c=C();return `${c.rule[0].replace(/:$/,"")}. ${c.rule[2]}.`},
  trap:"Differentiating a product term by term: (5x·e⁻ˣ)′ is not 5·(−e⁻ˣ). Use the product rule.",chips:["fx","dfx","grad"],onStep:()=>{s.showD=true;if(s.curve==="cubic"||s.curve==="quad")s.curve="prod"}},
 {k:"turn",lab:"Turning points",cap:"Where f′ = 0 the curve turns. <b>Drag to a turning point</b> and check the nature with f″: negative means a maximum, positive a minimum.",controls:["curve","x"],
  big:"<b>The big idea:</b> solve f′(x) = 0, then use the second derivative (or the sign of f′ either side) to say maximum or minimum.",
  exam:()=>{const c=C(),tps=turningPoints(c);return `Turning points occur where f′(x) = 0. ${tps.length?tps.map(t=>`At x = ${fmt(t.x)}, f″ = ${fmt(c.d2(t.x))}, so (${fmt(t.x)}, ${fmt(c.f(t.x))}) is a ${c.d2(t.x)<0?"maximum":"minimum"}.`).join(" "):"No turning points in view."}`},
  trap:"Stopping at x. Give the point and its nature, with a reason.",chips:["fx","dfx","grad","tps"],onStep:()=>{s.showD=true}},
 {k:"inflect",lab:"Inflection",cap:"The lower graph is now f″, the second derivative. Where it crosses zero and changes sign, the curve changes from bending one way to the other: a point of inflection.",controls:["curve","x"],
  big:"<b>The big idea (Merit):</b> f″ > 0 means concave up (a smile), f″ < 0 concave down (a frown). A point of inflection has f″ = 0 <i>and</i> a sign change.",
  exam:()=>{const c=C(),ix=inflections(c);return `f″(x) ${c.d2(2)!==undefined?"":""}changes sign ${ix.length?`at x = ${ix.map(fmt).join(", ")}, so the point${ix.length>1?"s":""} of inflection ${ix.length>1?"are":"is"} ${ix.map(v=>`(${fmt(v)}, ${fmt(c.f(v))})`).join(" and ")}`:"nowhere in view, so there is no point of inflection here"}.`},
  trap:"Calling every f″ = 0 an inflection. It must change sign there: check either side.",chips:["fx","d2fx","grad"],onStep:()=>{s.showD=true}},
 {k:"rates",lab:"Rates of change",cap:"Two things that change over time. The derivative is the rate, with units. <b>Drag along</b> and read the rate underneath; the sign of the second derivative says whether the rate is speeding up or slowing.",controls:["ctx","t"],
  big:"<b>The big idea (Excellence):</b> a rate is a derivative with units and meaning. For related rates, chain them: dV/dt = dV/dh × dh/dt.",
  exam:()=>{const X0=X(),r=X0.df(s.t);return `${X0.deq}. At t = ${fmt(s.t)}, the rate is ${fmt(r)} ${X0.unit}/${X0.tunit.replace(/s$/,"")}: ${X0.unit==="L"?"the tank is draining at " + fmt(-r) + " L/min and the draining is slowing":"the seedling grows " + fmt(r) + " cm/week and growth is slowing"}.`},
  trap:"Quoting the rate with no units or sign. Negative is part of the answer.",chips:["ctxeq","q","rate"],onStep:()=>{s.t=6}},
 {k:"test",lab:"Test yourself",cap:"Set the controls to answer each one, then press Check. Finish with the one-question check from memory.",controls:["curve","x","ctx","t"],
  big:"<b>Exam tip:</b> name the rule you used. For Merit, justify the nature of each point. For Excellence, link the derivative to the situation.",chips:["dfx","grad","rate"]}];
const steps=LEVEL===3?L3STEPS:L2STEPS;
const KUPU=[{mi:"rōnaki",en:"gradient, slope",ta:13240,chip:"grad"},{mi:"pākiri",en:"tangent",ta:45822},{mi:"whakapā",en:"derivative",ta:45959},{mi:"pāpātanga",en:"rate",ta:45823},{mi:"kauwhata",en:"graph",ta:2460},{mi:"horahanga",en:"area",ta:45656}];
Object.entries({tangent:["rōnaki","pākiri"],deriv:["whakapā","kauwhata"],rules:["whakapā"],turn:["rōnaki","whakapā"],inflect:["whakapā"],rates:["pāpātanga"],anti:["horahanga","whakapā"]}).forEach(([k,a])=>{const st=steps.find(x=>x.k===k);if(st)st.kupu=a});
const near=(a,b,tol=0.03)=>Math.abs(a-b)<=tol+1e-9;
const L2CH=[
  {q:"On the cubic, put the point where the gradient is 0 at the <b>maximum</b>.",check:()=>s.curve==="cubic"&&near(s.x,1),ok:"Yes: f′(1) = 3 − 12 + 9 = 0 and f″(1) = −6 < 0, so (1, 5) is the maximum.",no:()=>s.curve!=="cubic"?"Not yet: choose the cubic curve first.":`Not yet: at x = ${fmt(s.x)} the gradient is ${fmt(C().df(s.x))}. Hint: solve 3x² − 12x + 9 = 0 and pick the one where the curve peaks.`},
  {q:"On the cubic, find where the gradient is exactly −3.",check:()=>s.curve==="cubic"&&near(s.x,2),ok:"Yes: 3x² − 12x + 9 = −3 gives 3(x − 2)² = 0, so x = 2.",no:()=>s.curve!=="cubic"?"Not yet: choose the cubic curve first.":`Not yet: the gradient at x = ${fmt(s.x)} is ${fmt(C().df(s.x))}. Hint: set f′(x) = −3 and solve; it is between the two turning points.`},
  {q:"Fuel tank: find the moment it is draining at 15 litres a minute.",check:()=>s.ctx==="fuel"&&near(s.t,15,0.26),ok:"Yes: V′(t) = t − 30 = −15 when t = 15. Draining at 15 L/min means a rate of −15.",no:()=>s.ctx!=="fuel"?"Not yet: switch the context to the fuel tank.":`Not yet: at t = ${fmt(s.t)} the rate is ${fmt(CTX.fuel.df(s.t))} L/min. Hint: draining at 15 means V′ = −15.`},
];
const L3CH=[
  {q:"On 5x e⁻ˣ, put the point at the <b>maximum</b>.",check:()=>s.curve==="prod"&&near(s.x,1),ok:"Yes: f′(x) = 5e⁻ˣ(1 − x) = 0 when x = 1, and f″(1) < 0, so (1, 1.84) is the maximum.",no:()=>s.curve!=="prod"?"Not yet: choose the 5x e⁻ˣ curve first.":`Not yet: f′(${fmt(s.x)}) = ${fmt(C().df(s.x))}. Hint: e⁻ˣ is never 0, so solve the bracket.`},
  {q:"On 5x e⁻ˣ, find the <b>point of inflection</b>.",check:()=>s.curve==="prod"&&near(s.x,2),ok:"Yes: f″(x) = 5e⁻ˣ(x − 2) changes sign at x = 2, so (2, 1.35) is the point of inflection.",no:()=>s.curve!=="prod"?"Not yet: choose the 5x e⁻ˣ curve first.":`Not yet: f″(${fmt(s.x)}) = ${fmt(C().d2(s.x))}. Hint: differentiate f′ again and solve the bracket.`},
  {q:"On 4 ln(x + 1) − x, find the turning point.",check:()=>s.curve==="ln"&&near(s.x,3),ok:"Yes: 4/(x + 1) − 1 = 0 gives x + 1 = 4, so x = 3, and f″ < 0 makes it a maximum.",no:()=>s.curve!=="ln"?"Not yet: choose the ln curve first.":`Not yet: f′(${fmt(s.x)}) = ${fmt(C().df(s.x))}. Hint: set 4/(x + 1) = 1.`},
];
const curveOpts=(LEVEL===3?["cubic","quad","prod","sin","ln"]:["cubic","quad"]).map(k=>[k,CURVES[k].lab]);
// ================= the 3D bench (kit3d.js via l2-3d.js): a cyclist on a glass hill whose tilt is the tangent, a kōwhai that grows,
// a fuel tank that drains, and water filling the area under a rate graph. The state that marks the challenges drives all of it.
function gradient3d(S){const {THREE,mat}=S;const L=window.L2,K=L.C;const V3=(x,y,z)=>new THREE.Vector3(x,y,z);const FR=L.frames(S),hud=L.hud(S);
  const hitM=new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false});
  const glossy=c=>mat("plastic",c,{rough:.36}),cylGeo=new THREE.CylinderGeometry(1,1,1,16),UP=V3(0,1,0);
  const seg=(m,a,b,r)=>{const d=b.clone().sub(a),Ln=d.length();if(Ln<1e-4){m.visible=false;return}m.visible=true;m.position.copy(a).addScaledVector(d,.5);m.quaternion.setFromUnitVectors(UP,d.divideScalar(Ln));m.scale.set(r,Ln,r)};
  const rodM=(c,i)=>{const m=S.mesh(cylGeo,i?mat("glow",c,i):glossy(c),{cast:!i});S.scene.add(m);return m};
  const lab=o=>S.label(o);const st=()=>S.api.state;const dragged={};
  const GL="assets/l2/";
  // ================= CURVE ZONE: f on top as a glass hill with a rider, f′ (or f″) printed underneath
  const CX=0,BW=7,BH=9.4;
  const B=L.board(S,{x:CX,y:.45,w:BW,h:BH,panels:[{x0:.12,x1:.96,y0:.43,y1:.97,xm:XM,xM:XX,ym:-6,yM:12,xs:1,ys:2,ylab:"y = f(x)"},{x0:.12,x1:.96,y0:.05,y1:.34,xm:XM,xM:XX,ym:-6,yM:12,xs:1,ys:2,ylab:"y = f′(x)  gradient"}]});
  const hillCap=mat("acrylic","#BFE8D6",{opacity:.62}),hillTop=mat("plastic",K.mint,{rough:.55,coat:.2});
  const hill=new THREE.Mesh(new THREE.BufferGeometry(),[hillCap,hillTop]);hill.castShadow=true;hill.receiveShadow=true;S.scene.add(hill);
  const ridge=L.tubes(S,glossy(K.deepMint),2,.05);
  const HZ=.05,HD=1.3;// hill z from HZ to HZ+HD; the rider rides the middle
  // the rider: a cyclist modelled in Blender (assets/l2/cyclist.glb), with a simple stand-in until it loads
  const rider=new THREE.Group();S.scene.add(rider);const lean=new THREE.Group();lean.position.set(-.22,.95,0);
  {const sb=new THREE.Group();sb.add(S.torus(.3,.03,glossy(K.plum),{at:[-.5,.33,0]}),S.torus(.3,.03,glossy(K.plum),{at:[.5,.33,0]}),S.rbox(1,.06,.06,.02,glossy(K.mint),{at:[0,.55,0],rot:[0,0,.1]}),S.sphere(.16,glossy(K.lav),{at:[-.05,1.15,0]}));sb.name="standin";rider.add(sb)}
  rider.add(S.mesh(new THREE.SphereGeometry(1.1,10,8),hitM,{cast:false,at:[0,.7,0]}));rider.scale.setScalar(.8);
  let wheels=[];L.glb(GL+"cyclist.glb").then(g=>{if(!g)return;const sb=rider.getObjectByName("standin");if(sb)rider.remove(sb);
    g.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});
    const r=g.scene.getObjectByName("rider");["wheel_r","wheel_f","bike"].forEach(n=>{const o=g.scene.getObjectByName(n);if(o)rider.add(o)});
    if(r){r.position.sub(lean.position);lean.add(r)}rider.add(lean);wheels=["wheel_r","wheel_f"].map(n=>rider.getObjectByName(n)).filter(Boolean)});
  S.dragger(rider,{normal:V3(0,0,1),start:()=>{dragged.x=1},move:p=>{const v=Math.round(S.clamp(B.inv(0,p).x,XM,XX)*20)/20;if(v!==st().x){st().x=v;visit(v);sfx("tick")}}});
  const tangent=rodM(K.deepPink),runBar=rodM(K.butter),riseBar=rodM(K.pink),conn=S.mesh(cylGeo,mat("flat",K.plum,{opacity:.3}),{cast:false});S.scene.add(conn);
  const dTube=L.tubes(S,glossy("#7FC4A8"),2,.05),zeroRod=rodM(K.deepPink,.6);
  const vis=S.swarm(120,new THREE.SphereGeometry(.07,10,8),glossy(K.deepMint));S.scene.add(vis);
  const bead=S.sphere(.13,glossy(K.pink));S.scene.add(bead);
  // flags on the hill: lime at a turning point, butter at a point of inflection
  const flag=col=>{const g=new THREE.Group();g.add(S.cyl(.025,.025,.7,mat("metal"),{at:[0,.35,0],seg:8}));const sh=new THREE.Shape();sh.moveTo(0,0);sh.lineTo(.42,-.13);sh.lineTo(0,-.26);
    const pn=new THREE.Mesh(new THREE.ShapeGeometry(sh),mat("plastic",col,{rough:.5,extra:{side:THREE.DoubleSide}}));pn.position.y=.7;g.add(pn);g.userData.pn=pn;S.scene.add(g);return g};
  const tFlags=[flag("#ffffff"),flag("#ffffff")],iFlags=[flag(K.butter),flag(K.butter)];
  // concavity arc: a smile or a frown over the rider, flat at an inflection
  const arc=new THREE.Mesh(new THREE.BufferGeometry(),mat("glow",K.butter,.9));S.scene.add(arc);let arcK=null;
  // the grade gauge: a dial whose needle is the rider's tilt
  const gauge=new THREE.Group();S.scene.add(gauge);const gp=S.panel(512,300,1.9);gp.position.y=1.8;gauge.add(gp);gauge.add(S.cyl(.05,.07,1.3,mat("metal"),{at:[0,.65,-.05],seg:12}));
  gauge.add(S.rbox(2.1,1.3,.08,.06,mat("acrylic",K.lav,{opacity:.5}),{at:[0,1.8,-.06],cast:false}));
  const needle=new THREE.Group();needle.position.set(0,1.42,.03);gauge.add(needle);needle.add(S.rbox(.06,.78,.03,.012,glossy(K.deepPink),{at:[0,.39,0]}));needle.add(S.cyl(.07,.07,.04,glossy(K.plum),{rot:[Math.PI/2,0,0]}));
  const drawGauge=()=>gp.redraw((g,w,h)=>{g.fillStyle="#fff";L.rr(g,8,8,w-16,h-16,26);g.fill();const cx=w/2,cy=h-46;g.lineWidth=16;g.lineCap="round";
    [[-Math.PI,-Math.PI*.62,K.pink],[-Math.PI*.6,-Math.PI*.4,K.butter],[-Math.PI*.38,0,K.mint]].forEach(([a,b,c])=>{g.strokeStyle=c;g.beginPath();g.arc(cx,cy,180,a,b);g.stroke()});
    g.font=`600 26px ${L.SANS}`;g.fillStyle=K.ink;g.textAlign="center";g.fillText("down",cx-160,cy+30);g.fillText("flat",cx,cy-200+60);g.fillText("up",cx+165,cy+30);g.font=`600 22px ${L.MONO}`;g.fillStyle=K.muted;g.fillText("GRADE",cx,cy+34)});
  drawGauge();L.fontsReady(drawGauge);
  const lRide=lab({cls:"big",off:[24,-40]}),lTP=lab({cls:"ok",off:[16,-30]}),lIF=lab({cls:"sun",off:[16,-30]}),lRun=lab({off:[0,22],lead:false}),lRise=lab({off:[10,0],lead:false}),lD=lab({off:[16,-24]}),lDrag=lab({cls:"drag",off:[22,30]}).set("drag the rider"),lZero=lab({cls:"warn",off:[-80,-22],lead:false});
  let cKey="";
  // ================= RATES ZONE: a kōwhai seedling (Blender) beside a ruler, or a fuel tank that drains; quantity and rate graphs
  const RX=26;const RB=L.board(S,{x:RX+2.3,y:.45,w:6.2,h:6.8,panels:[{x0:.15,x1:.96,y0:.47,y1:.96,xm:0,xM:24,ym:0,yM:60,xs:4,ys:10},{x0:.15,x1:.96,y0:.06,y1:.37,xm:0,xM:24,ym:-2,yM:4,xs:4,ys:1}]});
  const qTube=L.tubes(S,glossy(PR.lime),2,.055),rTube=L.tubes(S,glossy("#7FC4A8"),2,.05),qTan=rodM(K.deepPink),rConn=S.mesh(cylGeo,mat("flat",K.plum,{opacity:.3}),{cast:false});S.scene.add(rConn);
  const qBead=new THREE.Group();qBead.add(S.sphere(.17,glossy(K.pink)),S.torus(.21,.04,glossy(K.plum),{cast:false}),S.mesh(new THREE.SphereGeometry(.55,10,8),hitM,{cast:false}));S.scene.add(qBead);
  const rBead=S.sphere(.12,glossy(K.pink));S.scene.add(rBead);
  S.dragger(qBead,{normal:V3(0,0,1),start:()=>{dragged.t=1},move:p=>{const tm=X().tM;const v=Math.round(S.clamp(RB.inv(0,p).x,0,tm)*2)/2;if(v!==st().t){st().t=v;sfx("tick")}}});
  const PX=RX-2.7;plinthAt(PX,0,3.2,2.6,"#ffffff",.12);
  function plinthAt(x,z,w,d,tint,h){S.scene.add(S.rbox(w,h,d,.06,mat("plastic",tint,{rough:.6,coat:.15}),{at:[x,h/2,z]}))}
  const plant=new THREE.Group();plant.position.set(PX-.35,.12,.2);S.scene.add(plant);const CM=.085,PS=2;// world units per cm of height
  let stem=null,leafProto=null;const leaves=[];const SOIL=.44*PS;
  const potStand=S.cyl(.38*PS,.26*PS,.5*PS,glossy(K.peach),{at:[0,.25*PS,0],seg:28});plant.add(potStand);
  L.glb(GL+"kowhai.glb").then(g=>{if(!g)return;g.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});plant.remove(potStand);
    const pot=g.scene.getObjectByName("pot"),soil=g.scene.getObjectByName("soil");stem=g.scene.getObjectByName("stem");leafProto=g.scene.getObjectByName("leaf");
    [pot,soil].forEach(o=>{if(o){o.position.set(0,0,0);o.scale.setScalar(PS);plant.add(o)}});if(soil)soil.position.y=0;
    if(stem){stem.position.set(0,SOIL,0);plant.add(stem)}
    if(leafProto)for(let i=0;i<14;i++){const lf=leafProto.clone();lf.visible=false;plant.add(lf);leaves.push(lf)}});
  const ruler=S.panel(160,1000,.5);ruler.position.set(PX+.95,SOIL+.12+60*CM/2,.2);S.scene.add(ruler);
  {const drawR=()=>ruler.redraw((g,w,h)=>{g.fillStyle="#FBF3D6";L.rr(g,0,0,w,h,16);g.fill();const y=cm=>h-6-(cm/60)*(h-12);g.fillStyle=K.ink;g.strokeStyle=K.ink;
      for(let c=0;c<=60;c++){const L5=c%10===0?60:c%5===0?40:22;g.lineWidth=c%10===0?4:2;g.beginPath();g.moveTo(0,y(c));g.lineTo(L5,y(c));g.stroke();if(c%10===0&&c){g.font=`600 34px ${L.MONO}`;g.fillText(c,70,y(c)+12)}}});drawR();L.fontsReady(drawR)}
  ruler.scale.y=(60*CM)/ruler.hU;
  const hMark=S.rbox(.62,.05,.12,.02,glossy(K.deepPink));S.scene.add(hMark);const rateArrow=S.arrow(K.deepMint,{r:.05});S.scene.add(rateArrow);
  // the fuel tank: an acrylic cylinder, peach fuel, a tap underneath whose stream thins as the rate falls
  const tank=new THREE.Group();tank.position.set(PX,.12,.1);S.scene.add(tank);const TR=.95,TH=3.6;
  {const body=S.cyl(TR,TR,TH,mat("acrylic",K.sky,{opacity:.24}),{at:[0,TH/2+.2,0],seg:40,cast:false});body.renderOrder=3;tank.add(body);
    tank.add(S.cyl(TR+.05,TR+.05,.08,glossy("#ffffff"),{at:[0,.2,0],seg:40}),S.cyl(TR+.05,TR+.05,.08,glossy("#ffffff"),{at:[0,TH+.2,0],seg:40}));
    for(let i=0;i<=9;i++)tank.add(S.box(i%3===0?.22:.12,.025,.02,mat("flat",K.ink,{opacity:.5}),{at:[TR-.02-(i%3===0?.11:.06),.2+i/9*TH,TR*.35],cast:false}))
    tank.add(S.tube([[TR*.6,.35,0],[TR+.25,.35,0],[TR+.4,.3,0],[TR+.42,.15,0]],.06,mat("metal")))}
  const fuel=S.mesh(new THREE.CylinderGeometry(1,1,1,40),mat("liquid",PR.peach,{opacity:.85}),{cast:false});fuel.renderOrder=2;tank.add(fuel);
  const stream=S.mesh(cylGeo,mat("liquid",PR.peach,{opacity:.85}),{cast:false});tank.add(stream);
  const lQ=lab({cls:"big",off:[-30,-30]}),lRate=lab({off:[-30,30]}),lQb=lab({off:[18,-30]}),lRb=lab({off:[18,-24]}),lDt=lab({cls:"drag",off:[22,28]}).set("drag along time");
  let rKey="";
  // ================= ANTI ZONE: the area under the rate graph fills with water; the height graph builds from it, + c
  const AXc=52,AB=L.board(S,{x:AXc,y:.45,w:7.4,h:8.6,panels:[{x0:.13,x1:.96,y0:.62,y1:.97,xm:0,xM:24,ym:0,yM:4,xs:4,ys:1,ylab:"growth rate, cm/week"},{x0:.13,x1:.96,y0:.05,y1:.53,xm:0,xM:24,ym:0,yM:70,xs:4,ys:10,ylab:"height, cm"}]});
  const water=new THREE.Mesh(new THREE.BufferGeometry(),mat("liquid","#8FC3EC",{opacity:.72}));water.renderOrder=2;S.scene.add(water);let wKey="";
  const aRate=L.tubes(S,glossy("#7FC4A8"),1,.055),aH=L.tubes(S,glossy(K.deepSky),1,.06),fam=[0,1,2,3].map(()=>L.tubes(S,mat("plastic","#D9CFE3",{rough:.6}),1,.03));
  const col=S.mesh(new THREE.BoxGeometry(1,1,1),mat("liquid","#8FC3EC",{opacity:.8}),{cast:false});col.renderOrder=2;S.scene.add(col);const cBlock=S.mesh(new THREE.BoxGeometry(1,1,1),glossy(K.butter));S.scene.add(cBlock);
  const aBead=new THREE.Group();aBead.add(S.sphere(.16,glossy(K.pink)),S.torus(.2,.04,glossy(K.plum),{cast:false}),S.mesh(new THREE.SphereGeometry(.55,10,8),hitM,{cast:false}));S.scene.add(aBead);
  S.dragger(aBead,{normal:V3(0,0,1),start:()=>{dragged.a=1},move:p=>{const v=Math.round(S.clamp(AB.inv(0,p).x,0,24)*2)/2;if(v!==st().t){st().t=v;sfx("tick")}}});
  const lArea=lab({cls:"big",off:[20,-34]}),lC=lab({cls:"sun",off:[18,20]}),lH=lab({cls:"big",off:[18,-30]}),lDa=lab({cls:"drag",off:[22,28]}).set("drag along time");
  // ================= framing
  FR.add("curve",{c:[CX,5,.6],w:8.2,h:10.4,dir:[.3,.36,1],pad:1.02,shadow:7}).add("curveW",{c:[CX+1.4,5,.6],w:11.2,h:10.2,dir:[.3,.36,1],pad:1.02,shadow:8})
    .add("rates",{c:[RX+.8,3.6,.4],w:11,h:7.8,dir:[.12,.24,1],pw:10,ph:10,pad:1.04,shadow:7})
    .add("anti",{c:[AXc,4.8,.4],w:8.4,h:9.6,dir:[.18,.18,1],pad:1.02,shadow:7});
  const zoneOf={tangent:"curve",deriv:"curve",rules:"curve",turn:"curve",inflect:"curve",rates:"rates",anti:"anti"};
  const all=[lRide,lTP,lIF,lRun,lRise,lD,lDrag,lZero,lQ,lRate,lQb,lRb,lDt,lArea,lC,lH,lDa];
  let zone="curve",first=true,prev=null;const zname=z=>z==="curve"&&S.camera.aspect>1.15?"curveW":z;
  S.l2={rider,B,qBead,aBead};// handles for automated checks
  return{
    resize(){if(zone==="curve"){const n=zname(zone);FR.go(n,true)}else FR.resize()},
    step(stp){zone=zoneOf[stp.k]||"curve";FR.go(zname(zone),first);first=false;prev=null},
    update(s,stp,dt,t){const k=stp.k;all.forEach(l=>l.hide());hud.clear();
      if(k==="test"){const sig={curve:s.curve+"|"+s.x,rates:s.ctx+"|"+s.t};if(prev)for(const z in sig)if(sig[z]!==prev[z]&&zone!==z){zone=z;FR.go(zname(z))}prev=sig}
      // ---- the curve zone
      const c=C(),inflect=k==="inflect",ck=s.curve+"|"+inflect;
      if(ck!==cKey){cKey=ck;const P0=B.P[0],P1=B.P[1];P0.ym=c.ym;P0.yM=c.yM;P0.ys=c.yM-c.ym>10?4:2;P1.ym=inflect?-8:c.dm;P1.yM=inflect?8:c.dM;P1.ys=P1.yM-P1.ym>10?4:2;P1.ylab=inflect?"y = f″(x)  bend":"y = f′(x)  gradient";B.draw();
        const sh=new THREE.Shape(),n=120;const base=B.at(0,XM,c.ym);sh.moveTo(base.x,base.y);for(let i=0;i<=n;i++){const x=XM+(XX-XM)*i/n,p=B.at(0,x,S.clamp(c.f(x),c.ym,c.yM));sh.lineTo(p.x,p.y)}const end=B.at(0,XX,c.ym);sh.lineTo(end.x,end.y);sh.lineTo(base.x,base.y);
        hill.geometry.dispose();hill.geometry=new THREE.ExtrudeGeometry(sh,{depth:HD,bevelEnabled:false,curveSegments:4});hill.position.z=HZ;
        ridge.set(B.runs(0,c.f,HZ+HD+.01));dTube.set(B.runs(1,inflect?c.d2:c.df,.08))}
      const x=s.x,y=c.f(x),m=c.df(x),cz=zone==="curve";
      const kx=B.at(0,1,0).x-B.at(0,0,0).x,ky=B.at(0,0,1).y-B.at(0,0,0).y,th=Math.atan2(m*ky,kx);
      const pf=B.at(0,x,S.clamp(y,c.ym,c.yM));rider.position.set(pf.x,pf.y,HZ+HD/2);rider.rotation.z=th;rider.visible=y>=c.ym&&y<=c.yM;
      wheels.forEach(w=>w.rotation.z=-x*6);const lv=inflect||k==="test"?S.clamp(-c.d2(x)*.06,-.35,.35):0;lean.rotation.z=L.approach(S,lean.rotation.z,lv,dt,6);
      const dir=V3(Math.cos(th),Math.sin(th),0),front=V3(pf.x,pf.y,HZ+HD+.12);seg(tangent,front.clone().addScaledVector(dir,-2.4),front.clone().addScaledVector(dir,2.4),.045);
      const sx=x+1<=XX?1:-1,pr=B.at(0,x+sx,y,HZ+HD+.12),pq=B.at(0,x+sx,y+m*sx,HZ+HD+.12);seg(runBar,front,pr,.035);seg(riseBar,pr,pq,.035);runBar.visible=riseBar.visible=cz&&Math.abs(m*sx)<(c.yM-c.ym)&&pq.y>B.at(0,0,c.ym).y-.1&&pq.y<B.at(0,0,c.yM).y+.1;
      const lf=inflect?c.d2:c.df,lvv=lf(x),showFull=s.showD||k!=="tangent";dTube.show(showFull);
      if(k==="tangent"){let i=0;for(const v of s.visited){const d=c.df(v);if(i<120&&B.inside(1,v,d)){const p=B.at(1,v,d,.08);vis.put(i++,p.x,p.y,p.z)}}for(;i<120;i++)vis.put(i,0,-20,0,.0001);vis.done();vis.visible=true}else vis.visible=false;
      bead.visible=B.inside(1,x,lvv);if(bead.visible){bead.position.copy(B.at(1,x,lvv,.12));seg(conn,front,bead.position,.012)}else conn.visible=false;
      zeroRod.visible=(k==="turn"||inflect)&&B.inside(1,XM,0);if(zeroRod.visible)seg(zeroRod,B.at(1,XM,0,.06),B.at(1,XX,0,.06),.025);
      const tps=(k==="turn"||k==="test"||inflect)?turningPoints(c):[],ifs=inflect?inflections(c):[];
      tFlags.forEach((g,i)=>{const tp=tps[i];g.visible=!!tp&&tp.x>=XM&&tp.x<=XX;if(g.visible){const p=B.at(0,tp.x,c.f(tp.x));g.position.set(p.x,p.y,HZ+.2);const near=Math.abs(tp.x-x)<.06;g.userData.pn.material=mat("plastic",near?"#7FC4A8":"#ffffff",{rough:.5,extra:{side:THREE.DoubleSide}});
        if(near&&cz)lTP.show().at(V3(p.x,p.y+.7,HZ+.2)).set(`${tp.kind==="max"?"maximum":"minimum"}<b>(${fmt(tp.x)}, ${fmt(c.f(tp.x))})</b>`)}});
      iFlags.forEach((g,i)=>{const v=ifs[i];g.visible=v!==undefined;if(g.visible){const p=B.at(0,v,c.f(v));g.position.set(p.x,p.y,HZ+.2);if(Math.abs(v-x)<.06&&cz)lIF.show().at(V3(p.x,p.y+.7,HZ+.2)).set(`inflection<b>(${fmt(v)}, ${fmt(c.f(v))})</b>`)}});
      // the bend arc over the rider (Level 3): curvature sign drawn as a smile or frown
      const showArc=inflect;arc.visible=showArc;if(showArc){const ak=Math.round(S.clamp(c.d2(x),-6,6)*4)/4;if(ak!==arcK){arcK=ak;const pts=[];for(let i=-10;i<=10;i++){const u=i/10*.7;pts.push(V3(u,ak*.06*u*u*2,0))}arc.geometry.dispose();arc.geometry=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),24,.035,8,false);
          arc.material=mat("glow",ak>0?"#7FC4A8":ak<0?K.deepPink:K.butter,1)}arc.position.set(pf.x,pf.y+1.25,HZ+HD/2)}
      gauge.visible=S.camera.aspect>1.15;gauge.position.set(B.at(0,XX,0).x+1.9,.0,1.2);needle.rotation.z=L.approach(S,needle.rotation.z,-th,dt,10);
      if(cz){const dl=inflect?"f″":"f′";hud.set(`<b>${c.eq}</b><b class="ok">${dl}(${fmt(x)}) = ${fmt(lvv)}</b>`);
        lRide.show(rider.visible).at(V3(pf.x,pf.y+.9,HZ+HD/2)).set(`gradient<b>${fmt(m)}</b>`);lRide.off=[x>3?-24:24,-44];
        if(runBar.visible){lRun.show().at(pr.clone().lerp(front,.5)).set("run 1");lRise.show().at(pr.clone().lerp(pq,.5)).set(`rise ${fmt(m*sx)}`);lRun.off=[-20,m*sx>0?18:-34]}
        lDrag.show(!dragged.x&&k===steps[0].k).at(V3(pf.x,pf.y+.3,HZ+HD/2));
        if(zeroRod.visible)lZero.show().at(B.at(1,XX,0,.06)).set(inflect?"f″ = 0 here":"f′ = 0 here")}
      // ---- rates
      const X0=X(),fuelOn=s.ctx==="fuel",rk=s.ctx;
      if(rk!==rKey){rKey=rk;const P0=RB.P[0],P1=RB.P[1];P0.xM=P1.xM=X0.tM;P0.xs=P1.xs=X0.tM/6;P0.ym=X0.qm;P0.yM=X0.qM;P0.ys=(X0.qM-X0.qm)/5;P1.ym=X0.rm;P1.yM=X0.rM;P1.ys=fuelOn?10:1;
        P0.ylab=`${X0.unit} against ${X0.tunit}`;P1.ylab=`rate, ${X0.unit}/${X0.tunit.replace(/s$/,"")}`;RB.draw();
        qTube.ms.forEach(mm=>mm.material=glossy(fuelOn?PR.peach:PR.lime));qTube.set(RB.runs(0,X0.f,.1));rTube.set(RB.runs(1,X0.df,.1))}
      const tt=Math.min(s.t,X0.tM),q=X0.f(tt),r=X0.df(tt);plant.visible=!fuelOn;tank.visible=fuelOn;
      const qp=RB.at(0,tt,S.clamp(q,X0.qm,X0.qM),.12);qBead.position.copy(qp);
      const kx2=RB.at(0,1,0).x-RB.at(0,0,0).x,ky2=RB.at(0,0,1).y-RB.at(0,0,0).y,th2=Math.atan2(r*ky2,kx2),d2=V3(Math.cos(th2),Math.sin(th2),0);seg(qTan,qp.clone().addScaledVector(d2,-1.6),qp.clone().addScaledVector(d2,1.6),.04);
      rBead.visible=RB.inside(1,tt,r);if(rBead.visible){rBead.position.copy(RB.at(1,tt,r,.12));seg(rConn,qp,rBead.position,.012)}else rConn.visible=false;
      if(!fuelOn){const h=q;if(stem){stem.scale.set(PS,h*CM,PS)}const top=V3(plant.position.x,plant.position.y+SOIL+h*CM,plant.position.z);
        const nL=Math.min(leaves.length,Math.max(2,Math.floor(h/4.2)));const pts=[[0,0,0],[.02,.2,0],[-.03,.42,-.01],[.03,.64,.01],[-.02,.84,-.01],[0,1,0]];
        leaves.forEach((lf,i)=>{lf.visible=i<nL;if(!lf.visible)return;const u=(i+1)/(nL+1),j=Math.min(4,Math.floor(u*5)),f=u*5-j,a=pts[j],b=pts[j+1];
          lf.position.set((a[0]+(b[0]-a[0])*f)*PS,SOIL+u*h*CM,(a[2]+(b[2]-a[2])*f)*PS);lf.rotation.set(0,i*2.4,.5+(1-u)*.3);lf.scale.setScalar(S.clamp(.4+h*.02*(1-u*.5),.35,1.4))});
        hMark.visible=true;hMark.position.set(ruler.position.x-.05,plant.position.y+SOIL+.12+Math.min(60,h)*CM-.12,ruler.position.z+.06);
        rateArrow.set(top.clone().add(V3(0,.08,0)),V3(0,r,0),.35);
        if(zone==="rates"){lQ.show().at(top).set(`week ${fmt(tt)}<b>${fmt(q)} cm</b>`);lRate.show().at(top.clone().add(V3(0,Math.max(.1,r*.35),0))).set(`<b>${r>=0?"+":""}${fmt(r)} cm/week</b>`)}}
      else{hMark.visible=false;rateArrow.visible=false;const lvF=S.clamp(q/450,0,1)*TH;fuel.visible=lvF>.01;fuel.scale.set(TR-.04,Math.max(.001,lvF),TR-.04);fuel.position.y=.2+lvF/2;
        const on=q>0&&r<0;stream.visible=on;if(on){const rr2=.02+.07*Math.min(1,-r/30);stream.scale.set(rr2,.3,rr2);stream.position.set(TR+.42,0,0)}
        if(zone==="rates"){lQ.show().at(V3(tank.position.x,tank.position.y+.2+lvF,tank.position.z)).set(`minute ${fmt(tt)}<b>${fmt(q)} L</b>`);lRate.show(on).at(V3(tank.position.x+TR+.42,.15,tank.position.z)).set(`<b>${fmt(r)} L/min</b>`)}}
      if(zone==="rates"){hud.set(`<b>${X0.eq}</b><b class="${r<0?"warn":"ok"}">${X0.deq.split(" = ")[0]} = ${fmt(r)} ${X0.unit}/${X0.tunit.replace(/s$/,"")}</b>`);lDt.show(!dragged.t).at(qp)}
      // ---- anti-derivative
      const at=Math.min(s.t,24),area=-.05*at*at+3*at,cc=s.c,wk=at.toFixed(2);
      if(wk!==wKey){wKey=wk;const sh=new THREE.Shape();const o=AB.at(0,0,0);sh.moveTo(o.x,o.y);for(let u=0;u<=at+1e-9;u+=.25){const p=AB.at(0,Math.min(u,at),CTX.kowhai.df(Math.min(u,at)));sh.lineTo(p.x,p.y)}const e=AB.at(0,at,0);sh.lineTo(e.x,e.y);sh.lineTo(o.x,o.y);
        water.geometry.dispose();water.geometry=at>.05?new THREE.ExtrudeGeometry(sh,{depth:.5,bevelEnabled:false,curveSegments:2}):new THREE.BufferGeometry();water.position.z=.02}
      aRate.set(AB.runs(0,CTX.kowhai.df,.56));aH.set(AB.runs(1,u=>-.05*u*u+3*u+cc,.1));
      fam.forEach((F2,i)=>{const v=[0,4,12,16,20].filter(z=>z!==cc)[i];if(s.showAll&&v!==undefined)F2.set(AB.runs(1,u=>-.05*u*u+3*u+v,.08));else F2.show(false)});
      const b0=AB.at(1,at,0,.3),bc=AB.at(1,at,cc,.3),bt=AB.at(1,at,Math.min(70,cc+area),.3);cBlock.visible=cc>0;cBlock.scale.set(.26,Math.max(.001,bc.y-b0.y),.26);cBlock.position.set(b0.x,(b0.y+bc.y)/2,.3);
      col.visible=area>.05;col.scale.set(.24,Math.max(.001,bt.y-bc.y),.24);col.position.set(b0.x,(bc.y+bt.y)/2,.3);
      aBead.position.copy(AB.at(0,at,CTX.kowhai.df(at),.6));
      if(zone==="anti"){hud.set(`<b>h′(t) = −0.1t + 3</b><b class="ok">h(t) = −0.05t² + 3t + ${fmt(cc)}</b>`);const wa=AB.at(0,at/2,CTX.kowhai.df(at/2)/2,.5);
        lArea.show(area>.05).at(wa).set(`area so far<b>${fmt(area)} cm</b>`);lC.show().at(bc.clone().lerp(b0,.5)).set(`start c = ${fmt(cc)} cm`);lH.show().at(bt).set(`<b>${fmt(cc)} + ${fmt(area)} = ${fmt(cc+area)} cm</b>`);lH.off=[at>14?-24:18,-30];lDa.show(!dragged.a).at(aBead.position)}
      hud.flush()}};
}
api=StudyKit.mount({kupu:KUPU,scene3d:gradient3d,postprocessing:false,
  eyebrow:LEVEL===3?"Maths · Differentiation":"Maths · Calculus methods",title:"The gradient machine",homeHash:LEVEL===3?"l3":"l2",
  fig:"FIG. 42 · A TANGENT ON A RAIL, A SEEDLING AND A TANK",railTitle:"Gradients you can feel",
  badge:LEVEL===3?{label:"NCEA L3 Calculus 91578",exam:"2026-11-16T09:30:00+13:00",examText:"Mon 16 Nov, 9:30am"}:{label:"NCEA L2 Maths 91262",exam:"2026-11-19T09:30:00+13:00",examText:"Thu 19 Nov, 9:30am"},
  mainBox:"0 0 640 420",mainPhoneBig:true,mainLabel:"A curve with a draggable tangent point and the gradient function graph assembling underneath; a kōwhai seedling and a fuel tank with their rate graphs; the area under a rate graph building a height graph",closeBox:"0 0 420 260",
  companion:"quiet",state:s,steps,
  controls:[
    {type:"select",id:"curve",label:"Curve",options:curveOpts,get:()=>s.curve,set:(x,v)=>{s.curve=v;s.visited=[]}},
    {type:"range",id:"x",label:"x",min:XM,max:XX,step:0.05,get:()=>s.x,set:(x,v)=>{s.x=v;visit(v)},fmt:()=>fmt(s.x)},
    {type:"select",id:"ctx",label:"Context",options:[["kowhai","Kōwhai seedling (cm, weeks)"],["fuel","Fuel tank (L, minutes)"]],get:()=>s.ctx,set:(x,v)=>{s.ctx=v;s.t=Math.min(s.t,CTX[v].tM)}},
    {type:"range",id:"t",label:"t",min:0,max:30,step:0.5,get:()=>s.t,set:(x,v)=>{s.t=Math.min(v,stepK()==="anti"?24:X().tM)},fmt:()=>fmt(s.t)+(stepK()==="anti"?" wk":s.ctx==="fuel"?" min":" wk")},
    {type:"range",id:"c",label:"c (start)",min:0,max:20,step:1,get:()=>s.c,set:(x,v)=>{s.c=v},fmt:()=>fmt(s.c)+" cm"},
    {type:"toggle",id:"showAll",label:"Show the family",get:()=>s.showAll,set:(x,v)=>{s.showAll=v}}],
  drawMain,drawClose,
  chips:()=>{const c=C(),m=c.df(s.x),X0=X(),tps=turningPoints(c);return{fx:["f(x)",c.lab,true],at:["POINT",`(${fmt(s.x)}, ${fmt(c.f(s.x))})`],grad:["GRADIENT",fmt(m),true],dfx:["f′(x)",c.deq.replace("f′(x) = ",""),true],d2fx:["f″(x)",fmt(c.d2(s.x))],
    tps:["TURNING POINTS",tps.length?tps.map(t=>`${fmt(t.x)} ${t.kind}`).join(", "):"none"],ctxeq:["MODEL",X0.eq,true],q:[X0.unit==="L"?"FUEL":"HEIGHT",`${fmt(X0.f(s.t))} ${X0.unit}`],rate:["RATE",`${fmt(X0.df(s.t))} ${X0.unit}/${X0.tunit.replace(/s$/,"")}`,true],
    area:["AREA 0 → t",`${fmt(-0.05*s.t*s.t+3*s.t)} cm`,true],start:["c",`${fmt(s.c)} cm`],height:["h(t)",`${fmt(-0.05*s.t*s.t+3*s.t+s.c)} cm`]}},
  challenges:LEVEL===3?L3CH:L2CH,
  retrieval:LEVEL===3?{q:"What is the derivative of e²ˣ?",options:["2e²ˣ","e²ˣ","2xe²ˣ","e²ˣ ÷ 2"],answer:0,why:"Chain rule: eᵘ differentiates to eᵘ × u′, and the inside u = 2x has u′ = 2."}:{q:"f(x) = x³ − 6x² + 9x + 1. What is f′(x)?",options:["3x² − 12x + 9","3x² − 6x + 9","x² − 12x + 9","3x³ − 12x² + 9x"],answer:0,why:"Power rule term by term: each power drops by one and multiplies out front, and the constant 1 disappears."},
  papers:[{label:"NZQA: Mathematics and Statistics",url:"https://www2.nzqa.govt.nz/ncea/subjects/past-exams-and-exemplars/mathematics-and-statistics/"}],
  truth:"The seedling and the fuel tank are simplified models chosen so the derivatives are tidy; real kōwhai and real tanks do not follow a quadratic exactly. Curves are plotted numerically.",
  footer:LEVEL===3?"Covers NCEA Level 3 Calculus 91578 (Apply differentiation methods in solving problems): product, chain, trig, exponential and log derivatives, tangents, turning points and their nature, points of inflection and concavity, and rates of change in context. Add ?level=3 to the address for this mode; without it the machine covers Level 2 91262.":"Covers NCEA Level 2 Mathematics and Statistics 91262 (Apply calculus methods in solving problems): gradient at a point and the tangent, differentiating polynomials, gradient functions, turning points and their nature, rates of change in context, and anti-differentiation with a constant found from a known point. Level 3 Calculus 91578 students can add ?level=3 to the address for product, chain, trig and log rules and points of inflection."});
function visit(v){const r=Math.round(v*20)/20;if(!s.visited.includes(r))s.visited.push(r)}
visit(s.x);
// ---- dragging the point along the curve, and the time marker on the rate graphs
const svg=document.getElementById("k-main");let drag=null;
svg.addEventListener("pointerdown",e=>{const g=e.target.closest&&e.target.closest("[data-drag]");if(!g)return;drag=g.dataset.drag;svg.setPointerCapture(e.pointerId);e.preventDefault()});
svg.addEventListener("pointermove",e=>{if(!drag)return;const r=svg.getBoundingClientRect(),px=(e.clientX-r.left)/r.width*640;const k=stepK();
  if(drag==="x"){const v=Math.round(Math.max(XM,Math.min(XX,XM+(px-70)/(600-70)*(XX-XM)))*20)/20;if(v!==s.x){s.x=v;visit(v);sfx("tick")}}
  else if(drag==="t"){const tm=k==="anti"?24:X().tM,x0=k==="anti"?70:270,x1=k==="anti"?600:606;const v=Math.round(Math.max(0,Math.min(tm,(px-x0)/(x1-x0)*tm))*2)/2;if(v!==s.t){s.t=v;sfx("tick")}}
  api.redraw()});
const stop=()=>{if(drag){drag=null;sfx("pop")}};svg.addEventListener("pointerup",stop);svg.addEventListener("pointercancel",stop);
const css=document.createElement("style");css.textContent=`.gr-sel{margin:4px 0 0 4px;max-width:100%}#k-main [data-drag]{touch-action:none}`;document.head.appendChild(css);
try{mq.addEventListener("change",()=>api.redraw())}catch(e){}
})();
