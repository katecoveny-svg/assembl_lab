(()=>{
// The floor-plan studio: Design and Visual Communication, AS91337 (Level 2, use visual communication techniques to
// generate design ideas) and AS91627 (Level 3, initiate design ideas through exploration). The practice pack's brief:
// redesign an ED (or a supermarket) layout so the queue clears without adding beds, then present it as a DVC brief
// with constraints, options, drawings and evaluation evidence from the lab's twin simulations.
const esc=StudyKit.esc;
const fmt=(x,d=0)=>{let v=Number(x);if(!isFinite(v))v=0;if(Math.abs(v)<0.5*Math.pow(10,-d))v=0;return v.toLocaleString("en-NZ",{maximumFractionDigits:d,minimumFractionDigits:d})};
const LAB="https://assembl-lab.vercel.app/";
// figure materials: the shared bench recipe (StudyKit.figMat)
const FM=StudyKit.figMat;
// the bench figure look (StudyKit.fig): the brief and the option cards are paper sheets on a frosted butter drafting board;
// the plan is an architectural model on the board (walls with thickness and a lit top, zones as tinted floor tiles)
const F=StudyKit.fig,PAL=F.palette,BUT=PAL.case.butter,BUTD=F.deep(BUT),NAVY="#262E5C",GREY="#6E6A86",WALL="#4E4868";
const STRAW=PAL.product.strawberry,LIME=PAL.product.lime,DIM="#3A6FB8",DOOR=PAL.product.butter;
// ---- the two briefs: site (m), fixed features, zones (x, y, w, h in metres) and constraints
const BRIEFS={
  ed:{name:"Emergency department",W:30,H:20,stake:"Health NZ, measured against the target of 95% of patients admitted, discharged or transferred within 6 hours",
    fixed:[{id:"entrance",label:"Walk-in entrance",x:0,y:16,w:0.4,h:3,door:[0.2,17.5]},{id:"amb",label:"Ambulance bay door",x:29.6,y:1,w:0.4,h:3,door:[29.8,2.5]}],
    zones:[{id:"reception",label:"Reception",w:4,h:3,c:"#F2C9B6"},{id:"waiting",label:"Waiting room",w:8,h:5,c:"#F5DFA3"},{id:"triage",label:"Triage",w:3,h:3,c:"#A9D9C8"},{id:"fast",label:"Fast-track",w:6,h:4,c:"#BFD7F2"},{id:"bays",label:"Treatment bays",w:10,h:6,c:"#D9D1F0"},{id:"resus",label:"Resus",w:5,h:5,c:"#F2B8B8"},{id:"staff",label:"Staff base",w:4,h:3,c:"#DCE3EA"}],
    start:{reception:[1,12],waiting:[6,13],triage:[20,15],fast:[22,9],bays:[8,2],resus:[2,2],staff:[14,9]},
    need:20,perPerson:1.5,
    rules:[["inside","Every zone inside the existing walls","Inside the walls"],["nooverlap","No two zones overlap","No overlaps"],["triage","Triage within 8 m of the walk-in entrance","Triage ≤ 8 m from entrance"],["fastadj","Fast-track next to the waiting room (gap ≤ 1 m)","Fast-track by waiting room"],["resus","Resus within 6 m of the ambulance door","Resus ≤ 6 m from ambulance"],["area","Waiting room ≥ 1.5 m² per expected waiting patient (20)","Waiting room ≥ 30 m²"]]},
  store:{name:"Supermarket front end",W:36,H:24,stake:"the store owner, measured against the 5 pm rush: no checkout queue longer than 6 shoppers",
    fixed:[{id:"entrance",label:"Entrance",x:0,y:19,w:0.4,h:4,door:[0.2,21]},{id:"exit",label:"Exit",x:0,y:6,w:0.4,h:4,door:[0.2,8]}],
    zones:[{id:"lobby",label:"Entry lobby",w:5,h:4,c:"#F2C9B6"},{id:"produce",label:"Produce",w:10,h:8,c:"#C9E8B5"},{id:"aisles",label:"Aisles",w:14,h:10,c:"#DCE3EA"},{id:"chiller",label:"Chiller wall",w:12,h:3,c:"#BFD7F2"},{id:"checkouts",label:"Checkouts",w:12,h:4,c:"#F5DFA3"},{id:"selfco",label:"Self-checkout",w:6,h:4,c:"#A9D9C8"},{id:"queue",label:"Queue area",w:8,h:4,c:"#D9D1F0"}],
    start:{lobby:[1,19],produce:[7,15],aisles:[18,12],chiller:[20,1],checkouts:[6,2],selfco:[1,11],queue:[6,7]},
    need:25,perPerson:1.2,
    rules:[["inside","Every zone inside the existing walls","Inside the walls"],["nooverlap","No two zones overlap","No overlaps"],["queueadj","Queue area touching the checkouts (gap ≤ 1 m)","Queue touches checkouts"],["exit","Checkouts within 8 m of the exit","Checkouts ≤ 8 m from exit"],["selfexit","Self-checkout within 6 m of the exit","Self-checkout ≤ 6 m from exit"],["area","Queue area ≥ 1.2 m² per expected waiting shopper (25)","Queue area ≥ 30 m²"]]}};
const s={brief:"ed",zones:{},sel:"triage",options:{},drag:null,scale:100,t:0,show:"plan",playing:false};
function load(brief){s.brief=brief;const B=BRIEFS[brief];s.zones={};B.zones.forEach(z=>{const p=B.start[z.id];s.zones[z.id]={x:p[0],y:p[1],w:z.w,h:z.h}});s.sel=B.zones[2].id;s.options={}}
load("ed");
const B=()=>BRIEFS[s.brief];const Z=id=>({...B().zones.find(z=>z.id===id),...s.zones[id]});
const cx=z=>z.x+z.w/2,cy=z=>z.y+z.h/2,dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const gap=(a,b)=>Math.max(a.x-(b.x+b.w),b.x-(a.x+a.w),a.y-(b.y+b.h),b.y-(a.y+a.h));
// ---- constraints and metrics, for the current zones or a saved option
function evalZones(zs){const Bz=B();const z=id=>({...Bz.zones.find(q=>q.id===id),...zs[id]});const ids=Bz.zones.map(q=>q.id);const r={};
  r.inside=ids.every(id=>{const q=z(id);return q.x>=0&&q.y>=0&&q.x+q.w<=Bz.W&&q.y+q.h<=Bz.H});
  let ov=0;for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++)if(gap(z(ids[i]),z(ids[j]))<-0.01)ov++;r.overlaps=ov;r.nooverlap=ov===0;
  const door=id=>Bz.fixed.find(f=>f.id===id).door;
  if(s.brief==="ed"){const t=z("triage"),w=z("waiting"),f=z("fast"),re=z("resus"),bays=z("bays");
    r.triageD=dist(door("entrance"),[cx(t),cy(t)]);r.triage=r.triageD<=8;r.fastGap=gap(f,w);r.fastadj=r.fastGap<=1;r.resusD=dist(door("amb"),[cx(re),cy(re)]);r.resus=r.resusD<=6;
    r.areaV=w.w*w.h;r.area=r.areaV>=Bz.need*Bz.perPerson;r.walk=dist(door("entrance"),[cx(t),cy(t)])+dist([cx(t),cy(t)],[cx(bays),cy(bays)]);r.walkLabel="entrance → triage → bays"}
  else{const q=z("queue"),c=z("checkouts"),sc=z("selfco"),lob=z("lobby"),pr=z("produce");
    r.queueGap=gap(q,c);r.queueadj=r.queueGap<=1;r.exitD=dist(door("exit"),[cx(c),cy(c)]);r.exit=r.exitD<=8;r.selfD=dist(door("exit"),[cx(sc),cy(sc)]);r.selfexit=r.selfD<=6;
    r.areaV=q.w*q.h;r.area=r.areaV>=Bz.need*Bz.perPerson;r.walk=dist(door("entrance"),[cx(lob),cy(lob)])+dist([cx(lob),cy(lob)],[cx(pr),cy(pr)])+dist([cx(pr),cy(pr)],[cx(c),cy(c)])+dist([cx(c),cy(c)],door("exit"));r.walkLabel="entrance → lobby → produce → checkouts → exit"}
  r.pass=Bz.rules.filter(([k])=>r[k]).length;r.total=Bz.rules.length;return r}
const snap=v=>Math.round(v*2)/2;
function move(id,dx,dy){const z=s.zones[id];z.x=snap(z.x+dx);z.y=snap(z.y+dy)}
function resize(id,dw,dh){const z=s.zones[id];z.w=Math.max(2,snap(z.w+dw));z.h=Math.max(2,snap(z.h+dh))}
function saveOption(k){s.options[k]={zones:JSON.parse(JSON.stringify(s.zones)),brief:s.brief,r:evalZones(s.zones)}}
// ---- drawing
const LINE="#DCD6EA",BAD="#D4486B";
const PX=20;// 1 m = 20 px in the main drawing (a 1:100 scale would be 10 px per metre at 1 px = 1 mm… the title block states the scale)
// a sheet of paper or a white card standing on the board: lit top, shaded side, soft shadow
function sheet(x,y,w,h,r,d,c){const white=!c||c==="#FFFFFF",m=white?{hi:"#FFFFFF",shade:"#E3E8F0",stroke:"#C2CAD6"}:F.mat("plastic",c),i=Math.min(r*0.35,w/4),dy=-0.55*d;c=c||"#FFFFFF";
  return F.shadow(x+i,y+h,w-i+d,{opacity:.1,len:Math.min(24,Math.max(10,h*0.25))})+`<path d="M${x+i},${y} l${d},${dy} h${w-2*i} l${-d},${-dy}z" fill="${m.hi}" stroke="${m.stroke}" stroke-linejoin="round"/><path d="M${x+w},${y+i} l${d},${dy} v${Math.max(0,h-2*i)} l${-d},${-dy}z" fill="${m.shade}" stroke="${m.stroke}" stroke-linejoin="round"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${c}" stroke="${m.stroke}" stroke-width="1.2"/>`}
// the frosted butter drafting board everything sits on, with two steel clips
const board=(x,y,w,h)=>F.acrylic(x,y,w,h,{tint:BUT,d:8,r:16,balls:false,opacity:.45});
const clip=(cx,y)=>F.shadow(cx+4,y+18,64,{len:10,h:2,opacity:.14})+F.box(cx,y,64,18,{colour:PAL.steel,kind:"metal",d:7,r:5,shadow:false})+`<path d="M${cx+8},${y+5} h40" stroke="#fff" stroke-opacity=".8" stroke-width="1.6" stroke-linecap="round"/><circle cx="${cx+32}" cy="${y+11}" r="3" fill="${PAL.steelDark}"/>`;
function planSVG(zs,ox,oy,px,opts){const Bz=B();opts=opts||{};const r=evalZones(zs);let o="";
  const X=x=>ox+x*px,Y=y=>oy+y*px,Wp=Bz.W*px,Hp=Bz.H*px;
  if(opts.thin){// a small model: floor, thin walls, flat tiles
    o+=`<path d="M${X(0)+4},${Y(Bz.H)} h${Wp} l10,6 h${-Wp}z" fill="${PAL.shadow}" opacity=".1"/><rect x="${X(0)}" y="${Y(0)}" width="${Wp}" height="${Hp}" fill="${PAL.paper}" stroke="${WALL}" stroke-width="2.4"/><path d="M${X(0)+2},${Y(0)+2} h${Wp-4}" stroke="#fff" stroke-width="1"/>`;
    Bz.fixed.forEach(f=>{o+=`<rect x="${X(f.x)-2}" y="${Y(f.y)}" width="${f.w*px+4}" height="${f.h*px}" fill="${DOOR}" stroke="${F.mat("painted",DOOR).stroke}"/>`})}
  else{const T=5,S=7;// walls: T px thick (mostly outside the site line), S px tall; key light from the upper left
    o+=`<path d="M${X(0)+S},${Y(Bz.H)+T} h${Wp+T} l26,12 h${-Wp-T}z M${X(Bz.W)+T},${Y(0)+S} l26,12 v${Hp+T-S} l-26,-12z" fill="${PAL.shadow}" opacity=".12"/>`;
    o+=`<rect x="${X(0)}" y="${Y(0)}" width="${Wp}" height="${Hp}" fill="${PAL.paper}"/>`;
    for(let g=1;g<Bz.W;g++)o+=`<line x1="${X(g)}" x2="${X(g)}" y1="${Y(0)}" y2="${Y(Bz.H)}" stroke="${LINE}" stroke-width="${g%5?0.5:1}"/>`;
    for(let g=1;g<Bz.H;g++)o+=`<line x1="${X(0)}" x2="${X(Bz.W)}" y1="${Y(g)}" y2="${Y(g)}" stroke="${LINE}" stroke-width="${g%5?0.5:1}"/>`;
    // the walls cast a soft shadow onto the floor inside the top and left walls
    o+=`<path d="M${X(0)},${Y(0)} H${X(Bz.W)} l-${S},${S} H${X(0)+S} V${Y(Bz.H)-S} l-${S},${S}z" fill="${PAL.shadow}" opacity=".08"/>`;
    // the shaded outer face of the bottom and right walls, then the lit wall tops
    o+=`<path d="M${X(0)-T},${Y(Bz.H)+T} h${Wp+2*T} v${S*0.6} h${-Wp-2*T}z M${X(Bz.W)+T},${Y(0)-T} h${S*0.6} v${Hp+2*T+S*0.6} h${-S*0.6}z" fill="${F.mat("painted","#DCD6EA").shade}" stroke="${WALL}" stroke-width=".8"/>`;
    o+=`<path d="M${X(0)-T},${Y(0)-T} h${Wp+2*T} v${Hp+2*T} h${-Wp-2*T}z M${X(0)+1.5},${Y(0)+1.5} v${Hp-3} h${Wp-3} v${-Hp+3}z" fill="#FFFDF8" fill-rule="evenodd" stroke="${WALL}" stroke-width="1.3" stroke-linejoin="round"/><path d="M${X(0)-T+3},${Y(0)-T+2} h${Math.min(160,Wp*0.4)}" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>`;
    Bz.fixed.forEach(f=>{const dm=F.mat("painted",DOOR);o+=`<rect x="${X(f.x)-T-1}" y="${Y(f.y)}" width="${f.w*px+T+4}" height="${f.h*px}" rx="1.5" fill="${DOOR}" stroke="${dm.stroke}" stroke-width="1.2"/><path d="M${X(f.x)-T+1},${Y(f.y)+2} v${f.h*px-4}" stroke="${dm.hi}" stroke-width="1.6"/>`;
      const inX=f.x>1?X(f.x)-2:X(f.x+f.w)+2,sw=Math.min(f.h*px*0.8,40),dir=f.x>1?-1:1;o+=`<path d="M${inX},${Y(f.y)} l${dir*sw},0 A${sw},${sw} 0 0 ${dir>0?1:0} ${inX},${Y(f.y)+sw}" fill="none" stroke="${WALL}" stroke-opacity=".35" stroke-width="1" stroke-dasharray="3 2"/>`;
      o+=`<text x="${X(f.x)+(f.x>1?-8:14)}" y="${Y(f.y)+f.h*px/2+4}" class="t-lab" text-anchor="${f.x>1?"end":"start"}">${esc(f.label).toUpperCase()}</text>`})}
  Bz.zones.forEach(zd=>{const z={...zd,...zs[zd.id]};const bad=(z.x<0||z.y<0||z.x+z.w>Bz.W||z.y+z.h>Bz.H)||Bz.zones.some(q=>q.id!==z.id&&gap(z,{...q,...zs[q.id]})<-0.01);const sel=!opts.thin&&s.sel===z.id;
    const zm=FM("painted",z.c),x=X(z.x),y=Y(z.y),w=z.w*px,h=z.h*px,rr=opts.thin?2:6,lift=sel?4:2.5;
    // a tinted floor tile: its own small shadow, the tile (the drag target), a lit top-left edge and a shaded bottom-right edge
    o+=`<g data-zone="${z.id}" style="cursor:move">`;
    if(!opts.thin)o+=`<rect pointer-events="none" x="${x+lift}" y="${y+lift*1.3}" width="${w}" height="${h}" rx="${rr}" fill="${PAL.shadow}" opacity="${sel?.2:.13}"/>`;
    o+=`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rr}" fill="${z.c}" stroke="${bad?BAD:sel?NAVY:zm.stroke}" stroke-width="${bad?3:sel?3:opts.thin?1:1.4}"${bad?' stroke-dasharray="6 4"':""}/>`;
    if(!opts.thin)o+=`<path pointer-events="none" d="M${x+3},${y+h-6} V${y+6} q0,-3 3,-3 H${x+w-6}" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="2" stroke-linecap="round"/><path pointer-events="none" d="M${x+w-3},${y+8} V${y+h-6} q0,3 -3,3 H${x+8}" fill="none" stroke="${zm.shade}" stroke-opacity=".9" stroke-width="2" stroke-linecap="round"/>`;
    if(!opts.thin)o+=`<text x="${x+8}" y="${y+18}" class="t-ink" style="font-weight:600">${esc(z.label)}</text><text x="${x+8}" y="${y+34}" class="t-lab">${z.w*px>=120?`${fmt(z.w,1)} × ${fmt(z.h,1)} m · `:""}${fmt(z.w*z.h)} m²</text>`;
    o+=`</g>`});
  if(opts.dims){// dimension lines for the selected zone and the site
    const z=Z(s.sel);const dim=(x1,y1,x2,y2,t,off)=>{const vert=x1===x2;const ax=vert?x1+off:x1,ay=vert?y1:y1+off,bx=vert?x2+off:x2,by=vert?y2:y2+off;return `<g pointer-events="none"><line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}" stroke="${DIM}" stroke-width="1.5"/><line x1="${ax}" y1="${ay-(vert?0:5)}" x2="${ax-(vert?5:0)}" y2="${ay+(vert?0:5)}" stroke="${DIM}"/><line x1="${bx+(vert?5:0)}" y1="${by-(vert?0:5)}" x2="${bx-(vert?5:0)}" y2="${by+(vert?0:5)}" stroke="${DIM}"/><text x="${(ax+bx)/2+(vert?10:0)}" y="${(ay+by)/2+(vert?4:-6)}" class="t-lab" text-anchor="${vert?"start":"middle"}" style="fill:${DIM}">${t}</text></g>`};
    o+=dim(X(0),Y(Bz.H),X(Bz.W),Y(Bz.H),`${fmt(Bz.W*1000)}`,22)+dim(X(Bz.W),Y(0),X(Bz.W),Y(Bz.H),`${fmt(Bz.H*1000)}`,22);
    o+=dim(X(z.x),Y(z.y),X(z.x+z.w),Y(z.y),`${fmt(z.w*1000)}`,-10)+dim(X(z.x),Y(z.y),X(z.x),Y(z.y+z.h),`${fmt(z.h*1000)}`,-10)}
  return o}
// a rule light: a small painted bead, lime when met, strawberry when not
const bead=(x,y,r,ok)=>{const c=ok?LIME:STRAW,m=F.mat("painted",c);return `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" stroke="${m.stroke}" stroke-width="1"/><circle cx="${x-r*0.35}" cy="${y-r*0.35}" r="${r*0.32}" fill="#fff" opacity=".6"/>`};
function drawMain(st){const W=800,H=420;let o=F.floor(W,H);const Bz=B();const px=Math.min(620/Bz.W,380/Bz.H);const ox=24,oy=20;
  if(st.k==="brief")return o+drawBrief();
  if(st.k==="ideate")return o+drawOptions();
  o+=board(ox-12,oy-11,Bz.W*px+24,Bz.H*px+24);
  o+=planSVG(s.zones,ox,oy,px,{dims:st.k==="communicate"});
  const r=evalZones(s.zones),pw=W-ox-Bz.W*px-32;
  // rule panel
  o+=sheet(ox+Bz.W*px+16,oy,pw,Bz.rules.length*30+14,12,7)+`<g transform="translate(${ox+Bz.W*px+16},${oy})">`;
  Bz.rules.forEach(([k,lab,short],i)=>{const ok=r[k];o+=bead(16,22+i*30,7,ok)+`<text x="30" y="${26+i*30}" class="t-lab" style="font-size:9.5px">${esc(short||lab).toUpperCase()}</text>`});
  o+=`</g>`;
  if(st.k==="communicate")o+=sheet(ox+Bz.W*px+16,oy+Bz.rules.length*30+30,pw,86,12,7)+`<g transform="translate(${ox+Bz.W*px+16},${oy+Bz.rules.length*30+30})"><rect width="${pw}" height="86" rx="12" fill="none" stroke="${NAVY}"/><text x="12" y="20" class="t-lab">TITLE BLOCK</text><text x="12" y="40" class="t-ink">${esc(Bz.name)} · plan</text><text x="12" y="58" class="t-ink">Scale 1:${s.scale} · dims in mm</text><text x="12" y="76" class="t-ink">Instrumental drawing, option ${esc(s.show==="plan"?"working":s.show)}</text></g>`;
  return o}
function drawBrief(){const Bz=B();let o=board(16,14,768,398)+sheet(30,30,740,370,6,4)+clip(300,20)+clip(436,20)+`<g transform="translate(30,30)">`;
  const line=(y,lab,txt)=>`<text x="24" y="${y}" class="t-lab">${lab}</text><foreignObject x="150" y="${y-16}" width="570" height="60"><div xmlns="http://www.w3.org/1999/xhtml" style="font:500 13.5px/1.35 var(--display);color:var(--ink)">${txt}</div></foreignObject>`;
  o+=`<text x="24" y="40" class="t-big" style="font-size:18px">DESIGN BRIEF: ${esc(Bz.name).toUpperCase()}</text>`;
  o+=line(80,"STAKEHOLDER",esc(Bz.stake));
  o+=line(136,"THE NEED",s.brief==="ed"?"The waiting room backs up at peak and the 6-hour target is missed. Redesign the layout so the queue clears <b>without adding beds</b>: move triage forward, split a fast-track flow, re-site the treatment bays.":"At the 5 pm rush the checkout queue spills into the aisles. Redesign the front end so the queue clears using only <b>layout and lane configuration</b>: where the queue forms, where self-checkout sits, how shoppers reach the exit.");
  o+=line(196,"CONSTRAINTS",`The existing external walls (${Bz.W} × ${Bz.H} m) and the two fixed doors stay where they are. Minimum zone sizes. ${Bz.rules.slice(2).map(r=>r[1]).join("; ")}.`);
  o+=line(262,"EVIDENCE",`Simulation screenshots from the lab's ${s.brief==="ed"?"ED twin":"supermarket twin"} before and after, plus the measurable rules on the Explore step.`);
  o+=line(316,"OUTPUT","Freehand ideation sketches of at least three options, an instrumental plan at 1:100 with dimensions, and an evaluation against the brief.");
  o+=`</g>`;return o}
function drawOptions(){let o=board(16,14,768,398);const Bz=B();const keys=["A","B","C"];keys.forEach((k,i)=>{const op=s.options[k];const ox=30+i*255,oy=30;
    // a saved option is a paper sheet taped to the board; an empty slot is a dashed outline
    if(op)o+=sheet(ox,oy,235,330,10,4)+`<path d="M${ox+90},${oy-6} h56 v16 h-56z" fill="${PAL.product.peach}" opacity=".45" transform="rotate(-3 ${ox+118} ${oy+2})"/>`;
    else o+=`<rect x="${ox}" y="${oy}" width="235" height="330" rx="16" fill="#fff" fill-opacity=".5" stroke="${BUTD}" stroke-dasharray="8 5"/>`;
    o+=`<text x="${ox+14}" y="${oy+26}" class="t-big">OPTION ${k}</text>`;
    if(op&&op.brief===s.brief){const px=Math.min(200/Bz.W,150/Bz.H);o+=planSVG(op.zones,ox+17,oy+40,px,{thin:true});
      o+=`<text x="${ox+14}" y="${oy+220}" class="t-ink">${op.r.pass} of ${op.r.total} rules met</text><text x="${ox+14}" y="${oy+242}" class="t-ink">walk ${fmt(op.r.walk,1)} m · ${s.brief==="ed"?"triage":"queue"} ${fmt(s.brief==="ed"?op.r.triageD:op.r.queueGap,1)} m</text><text x="${ox+14}" y="${oy+264}" class="t-ink">${s.brief==="ed"?"waiting":"queue"} area ${fmt(op.r.areaV)} m²</text>`;
      const other=keys.filter(q=>q!==k&&s.options[q]);const diff=other.length?Math.min(...other.map(q=>optDiff(op.zones,s.options[q].zones))):null;o+=`<text x="${ox+14}" y="${oy+300}" class="t-lab">${diff===null?"":diff<4?"VERY LIKE ANOTHER OPTION":"CLEARLY DIFFERENT"}</text>`}
    else o+=`<text x="${ox+14}" y="${oy+120}" class="t-ink">Move the zones on Explore,</text><text x="${ox+14}" y="${oy+140}" class="t-ink">then press Save as ${k}.</text>`});
  o+=`<text x="30" y="396" class="t-lab">THREE DIFFERENT IDEAS BEAT ONE POLISHED ONE: DIVERGE FIRST, THEN CHOOSE</text>`;return o}
function optDiff(a,b){let d=0;Object.keys(a).forEach(id=>{if(b[id])d+=Math.hypot(a[id].x-b[id].x,a[id].y-b[id].y)});return d}
function drawClose(st){let o=F.floor(420,260);const Bz=B();const r=evalZones(s.zones);
  if(st.k==="brief"){o+=`<text class="t-lab" x="14" y="22">THE ZONES AND THEIR MINIMUM SIZES</text>`;Bz.zones.forEach((z,i)=>{o+=`<rect x="14" y="${36+i*28}" width="22" height="18" rx="4" fill="${z.c}" stroke="${FM("painted",z.c).stroke}"/><path d="M17,${39+i*28} h16" stroke="#fff" stroke-opacity=".7" stroke-width="1.6" stroke-linecap="round"/><text class="t-ink" x="46" y="${50+i*28}">${esc(z.label)}</text><text class="t-ink" x="400" y="${50+i*28}" text-anchor="end">${z.w} × ${z.h} m</text>`});return o}
  if(st.k==="evaluate"){o+=`<text class="t-lab" x="14" y="22">SCORECARD · CURRENT LAYOUT AGAINST THE BRIEF</text>`;
    const rows=[[`Rules met`,`${r.pass} of ${r.total}`],[r.walkLabel,`${fmt(r.walk,1)} m`],[s.brief==="ed"?"Entrance to triage":"Checkouts to exit",`${fmt(s.brief==="ed"?r.triageD:r.exitD,1)} m`],[s.brief==="ed"?"Fast-track to waiting gap":"Queue to checkouts gap",`${fmt(s.brief==="ed"?r.fastGap:r.queueGap,1)} m`],[s.brief==="ed"?"Waiting area per patient":"Queue area per shopper",`${fmt(r.areaV/Bz.need,2)} m²`],["Overlaps",`${r.overlaps}`]];
    rows.forEach((row,i)=>{o+=`<text class="t-lab" x="14" y="${54+i*26}">${esc(row[0]).toUpperCase()}</text><text class="t-ink" x="400" y="${54+i*26}" text-anchor="end">${esc(row[1])}</text>`});
    o+=`<text class="t-lab" x="14" y="226">EVIDENCE: RUN ${LAB.replace("https://","")}${s.brief==="ed"?"ed":"store"} AND SCREENSHOT BEFORE/AFTER</text>`;return o}
  if(st.k==="communicate"){o+=`<text class="t-lab" x="14" y="22">SCALE: DRAWING ÷ REAL · 1:${s.scale}</text>`;const z=Z(s.sel);
    o+=`<text class="t-ink" x="14" y="52">At 1:${s.scale}, ${fmt(z.w,1)} m is drawn ${fmt(z.w*1000/s.scale,1)} mm long</text><text class="t-ink" x="14" y="74">and the site (${Bz.W} × ${Bz.H} m) is ${fmt(Bz.W*1000/s.scale)} × ${fmt(Bz.H*1000/s.scale)} mm on paper.</text>`;
    o+=`<text class="t-lab" x="14" y="110">FREEHAND VS INSTRUMENTAL</text><text class="t-ink" x="14" y="134">Freehand: quick ideation sketches, thumbnails,</text><text class="t-ink" x="14" y="154">annotated with arrows and notes (divergent thinking).</text><text class="t-ink" x="14" y="180">Instrumental: ruled, to scale, dimensioned in mm,</text><text class="t-ink" x="14" y="200">with a title block, north point and section marks.</text><text class="t-ink" x="14" y="232">Both belong in the portfolio, labelled.</text>`;return o}
  // explore / ideate / test: the selected zone and its numbers
  const z=Z(s.sel);o+=`<text class="t-lab" x="14" y="22">SELECTED ZONE</text><text class="t-big" x="14" y="50">${esc(z.label)}</text><text class="t-ink" x="14" y="76">x ${fmt(z.x,1)} m · y ${fmt(z.y,1)} m · ${fmt(z.w,1)} × ${fmt(z.h,1)} m = ${fmt(z.w*z.h,1)} m²</text>`;
  o+=`<text class="t-lab" x="14" y="110">RULES</text>`;Bz.rules.forEach(([k,lab],i)=>{o+=`${bead(22,128+i*22,6,r[k])}<text class="t-ink" x="36" y="${132+i*22}">${esc(lab)}</text>`});
  return o}
// ---- pointer dragging on the plan (keyboard users use the Nudge buttons)
function wireDrag(api){const svg=document.getElementById("k-main");if(!svg)return;
  const toM=(e)=>{const Bz=B();const px=Math.min(620/Bz.W,380/Bz.H);const pt=svg.createSVGPoint();pt.x=e.clientX;pt.y=e.clientY;const p=pt.matrixTransform(svg.getScreenCTM().inverse());return[(p.x-24)/px,(p.y-20)/px]};
  svg.addEventListener("pointerdown",e=>{const g=e.target.closest("[data-zone]");if(!g||!["explore","communicate","test"].includes(api.step.k))return;const id=g.dataset.zone;s.sel=id;const [mx,my]=toM(e);s.drag={id,dx:mx-s.zones[id].x,dy:my-s.zones[id].y};svg.setPointerCapture(e.pointerId);StudyKit.sfx("tick");api.redraw()});
  svg.addEventListener("pointermove",e=>{if(!s.drag)return;const [mx,my]=toM(e);const z=s.zones[s.drag.id];z.x=snap(mx-s.drag.dx);z.y=snap(my-s.drag.dy);api.redraw()});
  const up=()=>{if(s.drag){s.drag=null;StudyKit.sfx("pop");api.redraw()}};svg.addEventListener("pointerup",up);svg.addEventListener("pointercancel",up)}
// ---- steps
const steps=[
 {k:"brief",lab:"The brief",cap:"A DVC project starts with a brief: who it's for, what they need, what can't change, and how you'll know it worked. Read it, then choose the ED or the supermarket.",speed:0,controls:["brief"],
  big:"<b>The big idea:</b> a brief is the contract you design against. Everything you draw later is judged by it, so write the constraints and the measure of success down first.",
  exam:"The brief identifies the stakeholder (Health NZ, judged against the 95%-within-6-hours target), the need (clear the waiting room without adding beds), the constraints (existing external walls and doors; minimum zone sizes; triage within 8 m of the entrance) and the evidence that will show success (before-and-after simulation runs).",
  trap:"A brief with no measurable outcome. 'Make the ED flow better' can't be evaluated; '95 % within 6 hours in the twin' can.",chips:["zones","rules","need"]},
 {k:"explore",lab:"Explore the layout",cap:"Drag the zones (or pick one and use the Nudge buttons). Dashed red means a zone breaks a rule. Move triage forward, split the fast-track flow, re-site the bays: watch the rule lights.",speed:0,controls:["zone","left","right","up","down","wider","narrower","taller","shorter","reset"],
  big:"<b>The big idea:</b> exploration is divergent: try many arrangements quickly, and let the constraints tell you which ideas have legs. Adjacency (what touches what) and distance (how far people walk) drive flow.",
  exam:"Moving triage to within 8 m of the entrance means arriving patients are assessed before they settle into the waiting room, and placing fast-track beside the waiting room lets low-acuity patients be streamed off without crossing the department. Resus stays beside the ambulance door because seconds matter there.",
  trap:"Fixing one rule and breaking two others. Check all the lights after every move; a layout is a set of relationships, not a list of rooms.",chips:["sel","pass","walk","area"]},
 {k:"ideate",lab:"Three options",cap:"Generate design ideas: arrange the zones one way and Save as A, then change the big moves (where triage goes, where fast-track sits) and save B and C. Different ideas, not three versions of one.",speed:0,controls:["zone","left","right","up","down","saveA","saveB","saveC"],
  big:"<b>The big idea:</b> AS91337 and AS91627 reward a range of distinct ideas and the thinking between them. Thumbnails of A, B and C side by side are the visual communication the standards ask for.",
  exam:"Option A moves triage next to the entrance and keeps the bays central; Option B splits a fast-track corridor along the north wall so minor cases never enter the main bays; Option C re-sites the waiting room beside reception to shorten the walk. Each was tested against the same six rules.",
  trap:"Three options that differ only in detail. If the thumbnails look alike, the examiner sees refinement, not ideation.",chips:["opts","pass"]},
 {k:"evaluate",lab:"Evaluate",cap:"Score the current layout against the brief: rules met, walking distance, area per person. Then take it to the lab's twin, run the before and after, and screenshot the result as evidence.",speed:0,controls:["zone","left","right","up","down","brief"],
  big:"<b>The big idea:</b> evaluation needs evidence against the brief's measure, not opinion. Numbers from the rules here, and simulation runs from the twin, make the judgement defensible.",
  exam:"Against the brief, Option B meets six of six rules, shortens the entrance-to-bays walk from 31 m to 22 m and gives 2.0 m² per waiting patient. In the ED twin, the same change lifted patients seen within 6 hours from 71 % to 84 % with no extra beds, so it best meets the stakeholder's need.",
  trap:"Evaluating against what you like instead of what the brief said. Quote the brief's measure and the number you got.",chips:["pass","walk","area","overlaps"]},
 {k:"communicate",lab:"Draw it to scale",cap:"Visual communication: the plan at 1:100 with dimensions in millimetres, a title block, and the difference between a freehand ideation sketch and an instrumental drawing. Select a zone to dimension it.",speed:0,controls:["zone","scale","copy"],
  big:"<b>The big idea:</b> scale = drawing size ÷ real size. At 1:100, one metre is 10 mm on paper. Dimensions go in millimetres, outside the outline, with extension lines, and the title block says what, which option, what scale.",
  exam:"The instrumental plan is drawn at 1:100, so the 30 m × 20 m site is 300 mm × 200 mm on the sheet. Dimensions are given in millimetres (triage 3000 × 3000) with extension lines clear of the outline, and the title block records the project, the option and the scale.",
  trap:"Mixing units on one drawing, or drawing 'roughly to scale'. Pick 1:100 or 1:50 and keep every dimension honest to it.",chips:["sel","scaleTxt","sheet"]},
 {k:"test",lab:"Test yourself",cap:"Five challenges on the ED brief. Use the controls from any step, then press Check.",controls:["brief","zone","left","right","up","down","wider","narrower","taller","shorter","saveA","saveB","saveC","reset"],chips:["pass","walk","area","opts"],
  big:"<b>Portfolio tip:</b> show the thinking, not just the answer: the brief, three distinct ideas, the rules each one meets, the drawing to scale, and the evidence that it works."}];
// ---- kupu Māori: te reo terms for this machine, each checked in Te Aka Māori Dictionary (ta = word id). Sources and notes: te-reo-notes.md
const KUPU=[
 {mi:"hoahoa",en:"to design, plan; a plan of a building",ta:1290},
 {mi:"kaihoahoa",en:"designer, architect",ta:1924},
 {mi:"mahere",en:"map, plan, chart",ta:3350},
 {mi:"āwhata",en:"scale (of a map or drawing)",ta:15342,chip:"scaleTxt"},
 {mi:"horahanga",en:"area",ta:45667,chip:"area"},
 {mi:"tauira",en:"example, pattern, model",ta:7706},
 {mi:"kiritaki",en:"customer, client",ta:11034},
 {mi:"āhuatanga hoahoa",en:"design element",ta:38908}];
Object.entries({"brief":["hoahoa","kiritaki","kaihoahoa"],"explore":["hoahoa","mahere","horahanga"],"ideate":["tauira","āhuatanga hoahoa"],"evaluate":["kiritaki","horahanga"],"communicate":["mahere","āwhata","hoahoa"]}).forEach(([k,a])=>{const st=steps.find(x=>x.k===k);if(st)st.kupu=a});
const CH=[
  {q:"ED brief: move triage so its centre is within 8 m of the walk-in entrance.",check:()=>s.brief==="ed"&&evalZones(s.zones).triage,ok:()=>`Yes: triage is ${fmt(evalZones(s.zones).triageD,1)} m from the entrance. Patients are assessed before they sit down.`,no:()=>s.brief!=="ed"?"Choose the ED brief first.":`Not yet: ${fmt(evalZones(s.zones).triageD,1)} m. Drag triage toward the entrance on the left wall.`},
  {q:"Keep every zone inside the walls with no overlaps.",check:()=>{const r=evalZones(s.zones);return r.inside&&r.nooverlap},ok:"Yes: all inside, nothing overlapping. The dashed red outlines have gone.",no:()=>{const r=evalZones(s.zones);return `Not yet: ${r.inside?"":"a zone pokes outside the walls. "}${r.overlaps?r.overlaps+" overlap"+(r.overlaps>1?"s":"")+" to fix.":""}`}},
  {q:"ED brief: put fast-track beside the waiting room (gap ≤ 1 m) while keeping resus within 6 m of the ambulance door.",check:()=>{const r=evalZones(s.zones);return s.brief==="ed"&&r.fastadj&&r.resus},ok:()=>`Yes: fast-track gap ${fmt(Math.max(0,evalZones(s.zones).fastGap),1)} m, resus ${fmt(evalZones(s.zones).resusD,1)} m from the ambulance door.`,no:()=>{const r=evalZones(s.zones);return s.brief!=="ed"?"Choose the ED brief first.":`Not yet: fast-track gap ${fmt(Math.max(0,r.fastGap),1)} m (need ≤ 1), resus ${fmt(r.resusD,1)} m from the ambulance door (need ≤ 6).`}},
  {q:"Save three clearly different ED options (A, B and C), each with triage in a different place.",check:()=>{const o=s.options;if(!(o.A&&o.B&&o.C))return false;if([o.A,o.B,o.C].some(x=>x.brief!=="ed"))return false;const t=k=>o[k].zones.triage;return dist([t("A").x,t("A").y],[t("B").x,t("B").y])>=3&&dist([t("A").x,t("A").y],[t("C").x,t("C").y])>=3&&dist([t("B").x,t("B").y],[t("C").x,t("C").y])>=3},
    ok:()=>`Yes: three options with triage at (${["A","B","C"].map(k=>`${fmt(s.options[k].zones.triage.x,1)}, ${fmt(s.options[k].zones.triage.y,1)}`).join("), (")}). Rules met: ${["A","B","C"].map(k=>s.options[k].r.pass).join(", ")} of ${B().rules.length}.`,
    no:()=>{const o=s.options;return !(o.A&&o.B&&o.C)?`Saved so far: ${["A","B","C"].filter(k=>o[k]).join(", ")||"none"}. Arrange, Save as A; rearrange, Save as B; again for C.`:"All three are saved, but triage sits in nearly the same place in two of them (move it at least 3 m)."}},
  {q:"ED brief: give the waiting room at least 1.5 m² per expected waiting patient (20 patients).",check:()=>s.brief==="ed"&&evalZones(s.zones).area,ok:()=>`Yes: ${fmt(evalZones(s.zones).areaV)} m² ÷ 20 = ${fmt(evalZones(s.zones).areaV/20,2)} m² each.`,no:()=>s.brief!=="ed"?"Choose the ED brief first.":`Not yet: ${fmt(evalZones(s.zones).areaV)} m² is ${fmt(evalZones(s.zones).areaV/20,2)} m² each. You need ≥ 30 m²: select the waiting room and make it wider or taller.`}];
const api=StudyKit.mount({kupu:KUPU,caseTint:"butter",
  eyebrow:"Design and visual communication · Spatial design", title:"The floor-plan studio", crumb:"NCEA DVC · AS91337 (Level 2) and AS91627 (Level 3) · externally assessed portfolios", homeHash:"l2",
  fig:"FIG. 27 · A FLOOR PLAN YOU CAN REARRANGE", railTitle:"Brief, explore, draw, evaluate",
  badge:{label:"NCEA DVC 91337 · 91627 (portfolio)"},
  mainBox:"0 0 800 420", mainPhoneBig:true, mainLabel:"A top-down floor plan with movable zones, fixed doors and a panel of rule lights", closeBox:"0 0 420 260",
  state:s, steps,
  controls:[{type:"select",id:"brief",label:"Brief",options:[["ed","Emergency department"],["store","Supermarket front end"]],get:()=>s.brief,set:(x,v)=>{load(v);refreshZoneList()}},
    {type:"select",id:"zone",label:"Zone",options:[],get:()=>s.sel,set:(x,v)=>{s.sel=v}},
    {type:"button",id:"left",label:"← 0.5 m",onClick:()=>move(s.sel,-0.5,0)},{type:"button",id:"right",label:"→ 0.5 m",onClick:()=>move(s.sel,0.5,0)},
    {type:"button",id:"up",label:"↑ 0.5 m",onClick:()=>move(s.sel,0,-0.5)},{type:"button",id:"down",label:"↓ 0.5 m",onClick:()=>move(s.sel,0,0.5)},
    {type:"button",id:"wider",label:"Wider",onClick:()=>resize(s.sel,0.5,0)},{type:"button",id:"narrower",label:"Narrower",onClick:()=>resize(s.sel,-0.5,0)},
    {type:"button",id:"taller",label:"Taller",onClick:()=>resize(s.sel,0,0.5)},{type:"button",id:"shorter",label:"Shorter",onClick:()=>resize(s.sel,0,-0.5)},
    {type:"button",id:"reset",label:"Back to the start",onClick:()=>{const o=s.options;load(s.brief);s.options=o}},
    {type:"button",id:"saveA",label:"Save as A",onClick:()=>saveOption("A")},{type:"button",id:"saveB",label:"Save as B",onClick:()=>saveOption("B")},{type:"button",id:"saveC",label:"Save as C",onClick:()=>saveOption("C")},
    {type:"select",id:"scale",label:"Scale",options:[["50","1:50"],["100","1:100"],["200","1:200"]],get:()=>String(s.scale),set:(x,v)=>{s.scale=+v}},
    {type:"button",id:"copy",label:"Copy the design notes",onClick:()=>{const Bz=B(),r=evalZones(s.zones);const txt=`${Bz.name} · plan at 1:${s.scale}\nStakeholder: ${Bz.stake}\n`+Bz.zones.map(z=>{const q=Z(z.id);return `${z.label}: ${fmt(q.w*1000)} × ${fmt(q.h*1000)} mm at (${fmt(q.x*1000)}, ${fmt(q.y*1000)}) mm`}).join("\n")+`\nRules met: ${r.pass} of ${r.total} · walk ${fmt(r.walk,1)} m`;try{navigator.clipboard.writeText(txt)}catch(e){}}}],
  onStep:(x,st,api)=>{refreshZoneList()},
  drawMain:(x,st)=>drawMain(st),
  drawClose:(x,st)=>drawClose(st),
  chips:()=>{const Bz=B(),r=evalZones(s.zones),z=Z(s.sel);return{
    zones:["ZONES",`${Bz.zones.length}`],rules:["RULES",`${Bz.rules.length}`],need:["EXPECTED WAITING",`${Bz.need} people`],
    sel:["SELECTED",z.label],pass:["RULES MET",`${r.pass} of ${r.total}`,r.pass===r.total],walk:["WALK",`${fmt(r.walk,1)} m`],area:[s.brief==="ed"?"WAITING AREA":"QUEUE AREA",`${fmt(r.areaV)} m² · ${fmt(r.areaV/Bz.need,2)} each`],overlaps:["OVERLAPS",`${r.overlaps}`],
    opts:["OPTIONS SAVED",["A","B","C"].filter(k=>s.options[k]).join(" ")||"none"],scaleTxt:["SCALE",`1:${s.scale}`],sheet:["SITE ON PAPER",`${fmt(Bz.W*1000/s.scale)} × ${fmt(Bz.H*1000/s.scale)} mm`]}},
  challenges:CH,
  papers:[{label:"NZQA: Design and Visual Communication",url:"https://www2.nzqa.govt.nz/ncea/subjects/past-exams-and-exemplars/design-and-visual-communication/"},{label:"NZQA: AS91337 (L2, generate design ideas)",url:"https://www.nzqa.govt.nz/ncea/assessment/view-detailed.do?standardNumber=91337"},{label:"NZQA: AS91627 (L3, initiate design ideas)",url:"https://www.nzqa.govt.nz/ncea/assessment/view-detailed.do?standardNumber=91627"},{label:"Lab: the ED twin",url:LAB+"ed/"},{label:"Lab: the supermarket twin",url:LAB+"store/"}],
  truth:"A simplified spatial-design exercise. The sites (30 × 20 m ED, 36 × 24 m supermarket front end), the zone sizes and the six rules are estimates chosen to make the trade-offs visible, not a real hospital or store. DVC externals are portfolio submissions marked against the standards, not exams; the rules here are a stand-in for the measurable outcomes a real brief would set. The lab's ED and supermarket twins give the simulation evidence.",
  footer:"Covers the thinking the DVC externals assess: a brief with stakeholder, need, constraints and measures; divergent exploration and a range of distinct design ideas (AS91337, AS91627); evaluation against the brief; and visual communication (scale, dimensions, freehand versus instrumental drawing)."
});
function refreshZoneList(){const sel=document.getElementById("k-zone");if(!sel)return;const Bz=B();const want=Bz.zones.map(z=>z.id).join(",");if(sel.dataset.for!==want){sel.innerHTML=Bz.zones.map(z=>`<option value="${z.id}">${esc(z.label)}</option>`).join("");sel.dataset.for=want}sel.value=s.sel}
refreshZoneList();wireDrag(api);
})();
