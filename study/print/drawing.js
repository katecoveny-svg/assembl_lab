// Orthographic drawing of the Print Lab bike, generated from the same layout as the 3D model (model.js bikeLayout).
// One A4 landscape sheet in millimetres (297 × 210). Views are drawn at 1:2, so printing at 100% gives true scale.
// Third-angle layout: the plan (top) view sits above the side view and the front view sits to its right.
import {bikeLayout,HEAD_ANGLE} from './model.js';

let count=0;
const INK='#222A55',THIN='#8F9BAA',DIM='#4A5070',SOFT='#EEF0F6';
const f1=n=>(Math.round(n*10)/10).toLocaleString('en-NZ',{maximumFractionDigits:1});
const r2=n=>Math.round(n*100)/100;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));

export function drawingSVG(options,stats){
 const uid=`pl-dwg-${++count}`,L=bikeLayout(options),{o,s,P,dims:D,plinth}=L,mm=v=>v*s,u=L.u;
 const R=D.R,T=plinth?plinth.thick:0;
 const xMin=plinth?plinth.x0:P.RA[0]-R,xMax=plinth?plinth.x1:P.FA[0]+R;
 const topY=stats.height-T;                       // highest point above the plinth top
 const planHalf=stats.width/2;
 const barOuter=D.barHalf+mm(.2)+D.gripR*.4;
 // ---------- sheet layout: the largest standard-looking scale that fits the views between the border and the title block
 // vertical budget: plan label 6, plan, 12 gap (room for the bar-width dimension), side view, 21 for the dimensions and label
 const fixedV=6+12+21,availV=157,fixedH=22,availH=245;
 const SCALES=[[.5,'1:2'],[.4,'1:2.5'],[1/3,'1:3'],[.25,'1:4']];
 const [k,scaleLabel]=SCALES.find(([kk])=>fixedV+(stats.width+topY+T)*kk<=availV&&fixedH+(xMax-xMin+stats.width)*kk<=availH)||SCALES[SCALES.length-1];
 const sideW=(xMax-xMin)*k,sideH=(topY+T)*k,planH=stats.width*k;
 const total=fixedV+planH+sideH,yTop=14+Math.max(0,(availV-total)/2);
 const frontW=stats.width*k,yP=yTop+6+planH/2,yG=yTop+6+planH+12+topY*k,sx0=Math.max(30,8+(281-(sideW+fixedH+frontW))/2);
 const ex=sx0+sideW+fixedH+frontW/2;
 const X=x=>r2(sx0+(x-xMin)*k),Y=y=>r2(yG-y*k),PY=z=>r2(yP+z*k),EX=z=>r2(ex-z*k);
 // ---------- drawing helpers
 let out='';
 const tubes=(list)=>{ // list of [x1,y1,x2,y2,r] in sheet units: an ink outline under a white body, so joins merge cleanly
  let a='',b='';for(const [x1,y1,x2,y2,r] of list){const w=r2(2*r);a+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke-width="${r2(w+.6)}"/>`;b+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke-width="${w}"/>`}
  return`<g stroke="${INK}" stroke-linecap="round">${a}</g><g stroke="#fff" stroke-linecap="round">${b}</g>`};
 const sideTube=(p,q,r)=>[X(p[0]),Y(p[1]),X(q[0]),Y(q[1]),r*k];
 const along=(p,d,t)=>[p[0]+d[0]*t,p[1]+d[1]*t];
 const shape=(pts,cls='o')=>`<path class="${cls}" d="M${pts.map(p=>p.map(r2).join(',')).join('L')}Z"/>`;
 const rect=(x,y,w,h,rx=0,cls='o')=>`<rect class="${cls}" x="${r2(x)}" y="${r2(y)}" width="${r2(w)}" height="${r2(h)}" rx="${r2(rx)}"/>`;
 const circ=(cx,cy,r,cls='o')=>`<circle class="${cls}" cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(r)}"/>`;
 const line=(x1,y1,x2,y2,cls='o')=>`<line class="${cls}" x1="${r2(x1)}" y1="${r2(y1)}" x2="${r2(x2)}" y2="${r2(y2)}"/>`;
 const rot=(cx,cy,w,h,ang)=>{const c=Math.cos(ang),sn=Math.sin(ang);return[[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2]].map(([x,y])=>[cx+x*c-y*sn,cy+x*sn+y*c])};
 const arrowHead=(x,y,dx,dy)=>{const l=Math.hypot(dx,dy)||1,ux=dx/l,uy=dy/l,a=2.6,b=.9;return`<path class="ah" d="M${r2(x)},${r2(y)}L${r2(x-ux*a-uy*b)},${r2(y-uy*a+ux*b)}L${r2(x-ux*a+uy*b)},${r2(y-uy*a-ux*b)}Z"/>`};
 // a dimension between two sheet points, offset along its normal, with extension lines and a label
 // (the normal points down for a left-to-right line and left for a bottom-to-top line; off moves along it)
 const dimLine=(x1,y1,x2,y2,label,off)=>{const dx=x2-x1,dy=y2-y1,l=Math.hypot(dx,dy)||1,nx=-dy/l,ny=dx/l,sg=Math.sign(off)||1;
  const a=[x1+nx*off,y1+ny*off],b=[x2+nx*off,y2+ny*off],gap=1,over=1.4,mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2;
  const text=Math.abs(dx)<Math.abs(dy)?`<text class="dt" transform="translate(${r2(mx-1.2)},${r2(my)}) rotate(-90)" text-anchor="middle">${label}</text>`:`<text class="dt" x="${r2(mx)}" y="${r2(my-1.2)}" text-anchor="middle">${label}</text>`;
  return`<g class="dim">${line(x1+nx*gap*sg,y1+ny*gap*sg,a[0]+nx*over*sg,a[1]+ny*over*sg,'ext')}${line(x2+nx*gap*sg,y2+ny*gap*sg,b[0]+nx*over*sg,b[1]+ny*over*sg,'ext')}${line(a[0],a[1],b[0],b[1],'dl')}${arrowHead(a[0],a[1],a[0]-b[0],a[1]-b[1])}${arrowHead(b[0],b[1],b[0]-a[0],b[1]-a[1])}${text}</g>`};

 // ================= SIDE ELEVATION (seen from the drive side, front to the right)
 let side='';
 if(plinth){const b=1.2*k;side+=shape([[X(xMin)+b,Y(0)],[X(xMax)-b,Y(0)],[X(xMax),Y(0)+b],[X(xMax),Y(-T)-b],[X(xMax)-b,Y(-T)],[X(xMin)+b,Y(-T)],[X(xMin),Y(-T)-b],[X(xMin),Y(0)+b]]);
  for(const ax of [P.RA[0],P.FA[0]]){const w=mm(8),rp=mm(14.6),yr=R-Math.sqrt(rp*rp-w*w),a0=Math.atan2(-Math.sqrt(rp*rp-w*w),w),a1=Math.atan2(-Math.sqrt(rp*rp-w*w),-w);
   side+=`<path class="o" d="M${X(ax-w)},${Y(0)}L${X(ax+w)},${Y(0)}L${X(ax+w)},${Y(yr)}A${r2(rp*k)},${r2(rp*k)} 0 0 1 ${X(ax-w)},${Y(yr)}Z"/>`}}
 const wheelSide=(c,front)=>{let g='';const cx=X(c[0]),cy=Y(c[1]),n=o.detail==='fine'?36:30;
  for(let i=0;i<n;i++){const a=-Math.PI/2+i*2*Math.PI/n,rr=mm(15.5)*k;g+=shape(rot(cx+Math.cos(a)*rr,cy-Math.sin(a)*rr,mm(1.1)*k,mm(1.0)*k,-a+Math.PI/2))}
  g+=circ(cx,cy,mm(15.2)*k)+circ(cx,cy,mm(12.3)*k,'t')+circ(cx,cy,mm(11.2)*k,'t');
  const ns=o.detail==='fine'?24:16;for(let i=0;i<ns;i++){const a=i*Math.PI*2/ns,a2=a+(i%2?.42:-.42);g+=line(cx+Math.cos(a)*mm(1.35)*k,cy-Math.sin(a)*mm(1.35)*k,cx+Math.cos(a2)*mm(11.2)*k,cy-Math.sin(a2)*mm(11.2)*k,'sp')}
  g+=circ(cx,cy,mm(3.7)*k,'hid')+circ(cx,cy,mm(1.55)*k)+circ(cx,cy,mm(.5)*k,'t');
  if(!front)g+=circ(cx,cy,mm(2.7)*k,'t');
  return g};
 side+=wheelSide(P.RA,false)+wheelSide(P.FA,true);
 // rear triangle, rocker and shock
 side+=tubes([sideTube(P.RA,P.K1,D.chain),sideTube(P.K1,P.MP,D.chain),sideTube(P.RA,P.K2,D.sstay),sideTube(P.K2,P.RK,D.sstay)]);
 let rocker='';
 {const pts=[],add=(p,r)=>{for(let i=0;i<14;i++){const a=i/14*Math.PI*2;pts.push([p[0]+Math.cos(a)*r,p[1]+Math.sin(a)*r])}};add(P.RK,mm(.72));add(P.RP,mm(.85));add(P.SH1,mm(.72));
  // convex hull for the link plate, as in the model
  pts.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);const cr=(O,A,B)=>(A[0]-O[0])*(B[1]-O[1])-(A[1]-O[1])*(B[0]-O[0]);const lo=[],hi=[];
  for(const p of pts){while(lo.length>1&&cr(lo[lo.length-2],lo[lo.length-1],p)<=0)lo.pop();lo.push(p)}for(let i=pts.length-1;i>=0;i--){const p=pts[i];while(hi.length>1&&cr(hi[hi.length-2],hi[hi.length-1],p)<=0)hi.pop();hi.push(p)}
  hi.pop();lo.pop();rocker=shape(lo.concat(hi).map(p=>[X(p[0]),Y(p[1])]))}
 const d=[P.SH1[0]-P.SH0[0],P.SH1[1]-P.SH0[1]],dl=Math.hypot(...d),dn=[d[0]/dl,d[1]/dl],fw=[-dn[1],dn[0]][0]>0?[-dn[1],dn[0]]:[dn[1],-dn[0]];
 const sp=t=>along(P.SH0,dn,dl*t);
 side+=tubes([sideTube(sp(.02),sp(.6),mm(.58)),sideTube(sp(.55),sp(.97),mm(.3)),sideTube(along(sp(.32),fw,mm(1.0)),along(sp(.62),fw,mm(1.0)),mm(.48))]);
 {const turns=Math.max(6,Math.min(9,Math.round(o.suspension/25))),a=sp(.19),b=sp(.83),w=mm(.95);let z='';const steps=turns*2;
  for(let i=0;i<=steps;i++){const t=i/steps,p=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t],sg=i%2?1:-1;z+=(i?'L':'M')+X(p[0]-dn[1]*w*sg)+','+Y(p[1]+dn[0]*w*sg)}
  side+=`<path class="coil" d="${z}"/>`;for(const t of [.17,.85]){const p=sp(t);side+=shape(rot(X(p[0]),Y(p[1]),mm(2.36)*k,mm(.5)*k,-Math.atan2(dn[1],dn[0])+Math.PI/2))}}
 side+=rocker;
 // front triangle
 const dtTop=along(P.HB,u,mm(1.1)),ttFront=along(P.HT,u,-mm(.95));
 side+=tubes([sideTube(dtTop,P.BB,(D.down[0]+D.down[1])/2),sideTube(ttFront,P.TT,D.top),sideTube(P.BB,P.ST,D.seat),sideTube(along(P.HB,u,-mm(.25)),along(P.HT,u,mm(.2)),D.head)]);
 {const td=[P.TT[0]-ttFront[0],P.TT[1]-ttFront[1]],tl=Math.hypot(...td),bd=[P.BB[0]-dtTop[0],P.BB[1]-dtTop[1]],bl=Math.hypot(...bd);
  const g1=along(ttFront,[td[0]/tl,td[1]/tl],mm(3.4)),g2=along(dtTop,[bd[0]/bl,bd[1]/bl],mm(4.2));
  side+=`<path class="o" d="M${X(ttFront[0])},${Y(ttFront[1])}L${X(g1[0])},${Y(g1[1])}L${X(g2[0])},${Y(g2[1])}L${X(dtTop[0])},${Y(dtTop[1])}Z" fill="${SOFT}"/>`}
 side+=circ(X(P.BB[0]),Y(P.BB[1]),mm(1.35)*k)+circ(X(P.MP[0]),Y(P.MP[1]),mm(.78)*k,'t');
 for(const p of [P.RK,P.RP,P.SH1,P.SH0])side+=circ(X(p[0]),Y(p[1]),mm(.42)*k,'t');
 // fork, crowns and cockpit
 const fTop=along(P.FA,u,mm(13.8));
 side+=tubes([sideTube(along(P.FA,u,mm(12.6)),along(P.UC,u,mm(.55)),D.stanchion)]);
 side+=tubes([sideTube(along(P.FA,u,-mm(.9)),fTop,D.lower)]);
 const ang=-Math.atan2(u[1],u[0])+Math.PI/2;
 side+=shape(rot(X(P.LC[0]),Y(P.LC[1]),mm(2.7)*k,mm(1.5)*k,ang))+shape(rot(X(P.UC[0]),Y(P.UC[1]),mm(2.2)*k,mm(1.1)*k,ang));
 side+=circ(X(P.FA[0]),Y(P.FA[1]),mm(.5)*k,'t');
 // chainring, chain, cranks and pedals (drive side)
 side+=`<circle class="ring" cx="${X(P.BB[0])}" cy="${Y(P.BB[1])}" r="${r2(mm(3.45)*k)}"/>`;
 side+=line(X(P.BB[0]),Y(P.BB[1]+mm(3.3)),X(P.RA[0]),Y(P.RA[1]+mm(2.35)),'t')+line(X(P.BB[0]),Y(P.BB[1]-mm(3.3)),X(P.RA[0]+mm(.2)),Y(P.RA[1]-mm(3.95)),'t');
 side+=tubes([sideTube(P.BB,P.PF,mm(.5))])+shape([[X(P.PF[0]-mm(1.7)),Y(P.PF[1]+mm(.31))],[X(P.PF[0]+mm(1.7)),Y(P.PF[1]+mm(.31))],[X(P.PF[0]+mm(1.7)),Y(P.PF[1]-mm(.31))],[X(P.PF[0]-mm(1.7)),Y(P.PF[1]-mm(.31))]]);
 // seat post and saddle
 side+=tubes([sideTube(P.ST,[P.SEAT[0],P.SEAT[1]+mm(.45)],mm(.62))]);
 side+=shape(rot(X(P.SEAT[0]+mm(.35)),Y(P.SEAT[1]+mm(.65)),D.saddleLen*k,mm(1.3)*k,-4*Math.PI/180));
 // stem, bar and grip (the bar runs towards you, so the grip is seen end-on)
 {const sa=along(P.UC,u,mm(.35));side+=tubes([sideTube(sa,P.CL,mm(.6))]);
  const grip=[P.CL[0]-D.barSweep,P.CL[1]+D.barRise];side+=tubes([sideTube(P.CL,grip,D.barR)])+circ(X(grip[0]),Y(grip[1]),D.gripR*k)+circ(X(P.CL[0]),Y(P.CL[1]),mm(.85)*k);
  side+=line(X(grip[0]+mm(.3)),Y(grip[1]),X(grip[0]+mm(2.4)),Y(grip[1]-mm(.9)))}
 // centre lines and the steering axis
 for(const c of [P.RA,P.FA]){const cx=X(c[0]),cy=Y(c[1]),e=R*k+2;side+=line(cx-e,cy,cx+e,cy,'cl')+line(cx,cy-e,cx,cy+e,'cl')}
 const gT=P.FA[1]/u[1],G=[P.FA[0]-u[0]*gT,0],HTop=along(P.UC,u,mm(3));side+=line(X(G[0]),Y(G[1]),X(HTop[0]),Y(HTop[1]),'cl');
 // dimensions
 const below=Y(-T);
 let dims='';
 dims+=dimLine(X(P.RA[0]),Y(P.RA[1]),X(P.FA[0]),Y(P.FA[1]),`${f1(o.wheelbase)} wheelbase`,below-Y(P.RA[1])+6);
 dims+=dimLine(X(xMin),below,X(xMax),below,`${f1(stats.length)} overall`,12.5);
 dims+=dimLine(X(xMin),below,X(xMin),Y(topY),`${f1(stats.height)} high`,-7);
 {const a=Math.PI/4,cx=X(P.FA[0]),cy=Y(P.FA[1]),r=R*k,px=cx+Math.cos(a)*r,py=cy-Math.sin(a)*r,qx=px+7,qy=py-7;
  dims+=`<g class="dim">${line(cx,cy,px,py,'dl')}${arrowHead(px,py,px-cx,py-cy)}${line(px,py,qx,qy,'dl')}${line(qx,qy,qx+12,qy,'dl')}<text class="dt" x="${r2(qx+1)}" y="${r2(qy-1.2)}">Ø${f1(o.wheelDiameter)} wheel</text></g>`}
 {const hx=X(P.HB[0]),hy=Y(P.HB[1]),rr=7,a=HEAD_ANGLE*Math.PI/180,px=hx+Math.cos(a)*rr*(-u[0]/Math.cos(a)),py=hy+Math.sin(a)*rr;
  dims+=`<g class="dim">${line(hx,hy,hx+rr+4,hy,'ext')}<path class="dl" d="M${r2(hx+rr)},${r2(hy)}A${rr},${rr} 0 0 1 ${r2(px)},${r2(py)}"/><text class="dt" x="${r2(hx+rr+1.2)}" y="${r2(hy+3.6)}">${HEAD_ANGLE}° head</text></g>`}

 // ================= PLAN (seen from above, front to the right, drive side towards the side view)
 let plan='';
 if(plinth){const W=plinth.width;plan+=rect(X(xMin),PY(-W/2),(xMax-xMin)*k,W*k,7*k);
  for(const ax of [P.RA[0],P.FA[0]])plan+=rect(X(ax-mm(8)),PY(-mm(3.1)),mm(16)*k,mm(6.2)*k,mm(.45)*k)}
 for(const ax of [P.RA[0],P.FA[0]]){plan+=rect(X(ax-mm(15.2)),PY(-D.tyreHalf),mm(30.4)*k,2*D.tyreHalf*k,D.tyreHalf*k);
  plan+=line(X(ax-mm(15.2)),PY(0),X(ax+mm(15.2)),PY(0),'t');
  for(let i=-6;i<=6;i++)plan+=line(X(ax+i*mm(2.2)),PY(-D.tyreHalf*.8),X(ax+i*mm(2.2)),PY(D.tyreHalf*.8),'t')}
 const pz=(p,z)=>[X(p[0]),PY(z)];
 const planTube=(a,za,b,zb,r)=>[...pz(a,za),...pz(b,zb),r*k];
 plan+=tubes([planTube(P.RA,D.stayZ,P.K1,D.stayZ,D.chain),planTube(P.K1,D.stayZ,P.MP,mm(1.05),D.chain),planTube(P.RA,-D.stayZ,P.K1,-D.stayZ,D.chain),planTube(P.K1,-D.stayZ,P.MP,-mm(1.05),D.chain),
  planTube(P.RA,D.stayZ,P.K2,D.stayZ,D.sstay),planTube(P.RA,-D.stayZ,P.K2,-D.stayZ,D.sstay)]);
 plan+=rect(X(P.BB[0]-mm(3.6)),PY(mm(1.6)-mm(.2)),mm(7.2)*k,Math.max(.8,mm(.4))*k,0);
 plan+=tubes([planTube(dtTop,0,P.BB,0,D.down[0]),planTube(ttFront,0,P.TT,0,D.top),planTube(P.BB,-mm(1.75),P.BB,mm(1.75),mm(1.35))]);
 for(const sg of [-1,1])plan+=tubes([planTube(along(P.FA,u,-mm(.9)),sg*D.forkZ,along(P.UC,u,mm(.55)),sg*D.forkZ,D.lower*.85)]);
 plan+=rect(X(P.LC[0]-mm(1.3)),PY(-(D.forkZ+D.lower+mm(.3))),mm(2.6)*k,2*(D.forkZ+D.lower+mm(.3))*k,mm(.45)*k);
 plan+=rect(X(P.UC[0]-mm(1.1)),PY(-(D.forkZ+D.stanchion+mm(.35))),mm(2.2)*k,2*(D.forkZ+D.stanchion+mm(.35))*k,mm(.4)*k);
 for(const [p,sg] of [[P.PF,1],[P.PR,-1]]){plan+=tubes([planTube(P.BB,sg*mm(3.0),p,sg*mm(3.0),mm(.3))]);plan+=rect(X(p[0]-mm(1.7)),PY(sg*D.pedalZ-mm(1.5)),mm(3.4)*k,mm(3.0)*k,mm(.25)*k)}
 {const pts=[[4.8,.35],[4.1,.72],[1.6,.9],[-1.3,1.55],[-3.7,2.05],[-4.6,1.55],[-4.75,0],[-4.6,-1.55],[-3.7,-2.05],[-1.3,-1.55],[1.6,-.9],[4.1,-.72],[4.8,-.35]];
  plan+=`<path class="o" d="M${pts.map(([x,z])=>`${X(P.SEAT[0]+mm(.35)+mm(x))},${PY(mm(z))}`).join('L')}Z"/>`}
 plan+=tubes([planTube(along(P.UC,u,mm(.35)),0,P.CL,0,mm(.8))]);
 {const bx=P.CL,ends=[];for(const sg of [-1,1])ends.push(planTube(bx,sg*mm(1.9),[bx[0]-D.barSweep*.45,0],sg*mm(5),D.barR),planTube([bx[0]-D.barSweep*.45,0],sg*mm(5),[bx[0]-D.barSweep,0],sg*(D.barHalf-mm(1)),D.barR));
  plan+=tubes([planTube(bx,-mm(1.9),bx,mm(1.9),D.barR),...ends]);
  for(const sg of [-1,1])plan+=tubes([planTube([bx[0]-D.barSweep,0],sg*(D.barHalf-mm(4.3)),[bx[0]-D.barSweep,0],sg*(D.barHalf+mm(.2)),D.gripR)])}
 plan+=line(X(xMin)-3,PY(0),X(xMax)+3,PY(0),'cl');
 dims+=dimLine(X(xMin),PY(-planHalf),X(xMin),PY(planHalf),`${f1(stats.width)} wide`,7);

 // ================= FRONT VIEW (seen from the front of the bike)
 let front='';
 const ez=(z,y)=>[EX(z),Y(y)];
 front+=rect(EX(D.saddleHalf),Y(P.SEAT[1]+mm(1.3)),2*D.saddleHalf*k,mm(1.3)*k,mm(.4)*k);
 for(const [p,sg] of [[P.PF,1],[P.PR,-1]])front+=rect(EX(sg*D.pedalZ+mm(1.5)),Y(p[1]+mm(.31)),mm(3.0)*k,mm(.62)*k,0);
 front+=tubes([[...ez(-mm(3.0),P.BB[1]),...ez(mm(3.0),P.BB[1]),mm(.5)*k]]);
 front+=rect(EX(D.tyreHalf),Y(2*R),2*D.tyreHalf*k,2*R*k,D.tyreHalf*k);
 for(let i=1;i<10;i++)front+=line(EX(D.tyreHalf*.8),Y(i*R/5),EX(-D.tyreHalf*.8),Y(i*R/5),'t');
 if(plinth){const W=plinth.width;front+=shape([[EX(W/2),Y(0)],[EX(-W/2),Y(0)],[EX(-W/2),Y(-T)],[EX(W/2),Y(-T)]]);
  front+=rect(EX(mm(3.1)),Y(R-Math.sqrt(mm(14.6)**2-mm(8)**2)),mm(6.2)*k,(R-Math.sqrt(mm(14.6)**2-mm(8)**2))*k,mm(.45)*k)}
 for(const sg of [-1,1])front+=tubes([[...ez(sg*D.forkZ,P.FA[1]-mm(.9)*u[1]),...ez(sg*D.forkZ,fTop[1]),D.lower*k]])+tubes([[...ez(sg*D.forkZ,fTop[1]),...ez(sg*D.forkZ,P.UC[1]+mm(.55)*u[1]),D.stanchion*k]]);
 front+=tubes([[...ez(-mm(3.5),P.FA[1]),...ez(mm(3.5),P.FA[1]),mm(.5)*k]]);
 for(const [p,hw,h] of [[P.LC,D.forkZ+D.lower+mm(.3),mm(1.5)],[P.UC,D.forkZ+D.stanchion+mm(.35),mm(1.1)]])front+=rect(EX(hw),Y(p[1]+h/2),2*hw*k,h*k,mm(.4)*k);
 front+=rect(EX(mm(.8)),Y(P.CL[1]+mm(.6)),mm(1.6)*k,(P.CL[1]-P.UC[1]+mm(1.2))*k,0);
 {const y0=P.CL[1],y1=P.CL[1]+D.barRise,l=[];for(const sg of [-1,1])l.push([...ez(0,y0),...ez(sg*mm(1.9),y0),D.barR*k],[...ez(sg*mm(1.9),y0),...ez(sg*mm(5),y1),D.barR*k],[...ez(sg*mm(5),y1),...ez(sg*(D.barHalf-mm(1)),y1),D.barR*k]);
  front+=tubes(l);for(const sg of [-1,1])front+=tubes([[...ez(sg*(D.barHalf-mm(4.3)),y1),...ez(sg*(D.barHalf+mm(.2)),y1),D.gripR*k]]);
  const bw=D.barHalf+mm(.2);dims+=dimLine(EX(bw),Y(y1),EX(-bw),Y(y1),`${f1(2*bw)} bars`,-(Y(y1)-Y(topY))-7)}
 front+=line(EX(0),Y(-T)+3,EX(0),Y(topY)-4,'cl');

 // ================= sheet, labels and title block
 const label=(x,y,t)=>`<text class="vl" x="${r2(x)}" y="${r2(y)}">${t}</text>`;
 const vSide=label(X(xMin),Y(-T)+21.5,'SIDE VIEW (DRIVE SIDE)'),vPlan=label(X(xMin),PY(-planHalf)-3,'PLAN (FROM ABOVE)'),vFront=label(EX(planHalf)-2,Y(-T)+21.5,'FRONT VIEW');
 const tb=178,cell=(x,w,head,body,cls='tv')=>`<line class="tb" x1="${x}" y1="${tb}" x2="${x}" y2="200"/><text class="th" x="${x+2}" y="${tb+5}">${head}</text><text class="${cls}" x="${x+2}" y="${tb+13.5}">${body}</text>`;
 const symbol=`<g transform="translate(236 ${tb+11})" class="sym"><path d="M0,-3.2L8,-5L8,5L0,3.2Z"/><line x1="-2" y1="0" x2="10" y2="0" class="cl"/><circle cx="16" cy="0" r="3.2"/><circle cx="16" cy="0" r="5"/><line x1="9.5" y1="0" x2="22.5" y2="0" class="cl"/><line x1="16" y1="-6.5" x2="16" y2="6.5" class="cl"/></g>`;
 return`<svg xmlns="http://www.w3.org/2000/svg" width="297mm" height="210mm" viewBox="0 0 297 210" role="img" aria-labelledby="${uid}-t ${uid}-d"><title id="${uid}-t">${esc(o.name)}: orthographic drawing</title><desc id="${uid}-d">Plan, side and front views of a downhill bike display model at ${scaleLabel} on A4. Wheelbase ${f1(o.wheelbase)} mm, wheel diameter ${f1(o.wheelDiameter)} mm, overall ${f1(stats.length)} by ${f1(stats.width)} by ${f1(stats.height)} mm.</desc>
<style>text{font-family:"IBM Plex Mono",ui-monospace,Menlo,monospace;fill:${INK}}.o{fill:#fff;stroke:${INK};stroke-width:.3;stroke-linejoin:round}.t{fill:none;stroke:${INK};stroke-width:.18}.sp{stroke:${THIN};stroke-width:.12}.hid{fill:none;stroke:${THIN};stroke-width:.18;stroke-dasharray:1.2 .8}.cl{stroke:${THIN};stroke-width:.15;stroke-dasharray:5 1 1 1;fill:none}.coil{fill:none;stroke:${INK};stroke-width:.3;stroke-linejoin:round}.ring{fill:#fff;stroke:${INK};stroke-width:.3;stroke-dasharray:.55 .3}.dim .dl,.dim .ext{stroke:${DIM};stroke-width:.15;fill:none}.ah{fill:${DIM}}.dt{font-size:2.9px;fill:${DIM}}.vl{font-size:2.9px;font-weight:600;letter-spacing:.3px}.tb{stroke:${INK};stroke-width:.3}.th{font-size:2.2px;fill:${DIM};letter-spacing:.25px}.tv{font-size:3.4px;font-weight:600}.tn{font-size:4.6px;font-weight:600}.note{font-size:2.5px;fill:${DIM}}.sym path,.sym circle{fill:none;stroke:${INK};stroke-width:.3}</style>
<rect width="297" height="210" fill="#fff"/><rect x="8" y="8" width="281" height="194" fill="none" stroke="${INK}" stroke-width=".5"/>
${plan}${side}${front}${dims}${vSide}${vPlan}${vFront}
<text class="note" x="12" y="${tb-3}">Display model only, not rideable. All sizes in millimetres. Generated from the same settings as the 3D model and print files. Check supports in your slicer.</text>
<line class="tb" x1="8" y1="${tb}" x2="289" y2="${tb}"/>
<text class="th" x="10" y="${tb+5}">TITLE</text><text class="tn" x="10" y="${tb+12.5}">${esc(o.name)}</text><text class="note" x="10" y="${tb+18.5}">Downhill bike display model · assembly Print Lab</text>
${cell(96,0,'SCALE',`${scaleLabel} on A4`)}${cell(124,0,'UNITS','mm')}${cell(142,0,'ENVELOPE',`${f1(stats.length)} × ${f1(stats.width)} × ${f1(stats.height)}`)}${cell(190,0,'DRAWN BY','')}${cell(226,0,'PROJECTION','')}${cell(262,0,'SHEET','1 of 1')}
<text class="note" x="192" y="${tb+18.5}">Date:</text>${symbol}
</svg>`;
}
