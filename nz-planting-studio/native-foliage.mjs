// Procedural Aotearoa foliage study. Original geometry and shading, no external texture fetch.
// Coordinates are in metres; the renderer supplies Three.js constructors and instancing.
const PI=Math.PI, TAU=2*PI;
const palette={
  oioi:['#424735','#85815a','#bd955f'],
  hydrangea:['#263929','#456244','#83916a'], agapanthus:['#24392e','#4d6b46','#89966b'], echinacea:['#30422e','#516746','#8c9163'],
  harakeke:['#244326','#567047','#a2a16d'], platts_black:['#332323','#693f42','#ae7266'],
  silver_spear:['#476158','#7f9a84','#bcc7a1'], rengarenga:['#306132','#5c884a','#c3cc98'],
  libertia:['#546329','#929345','#d7a75a'],
  toetoe:['#465c3b','#7c8a56','#b5a885'], red_tussock:['#77643b','#a18a54','#ceaf70'],
  carex_testacea:['#515637','#96804b','#c89964'], poa_cita:['#535f39','#8d915e','#a9a16c'],
  ponga:['#244e2d','#557d42','#a3a977'], tikouka:['#344b32','#668152','#a8a567'],
  nikau:['#345738','#587e49','#b4be88'], pohutukawa:['#304a32','#668355','#a5b29b'],
  manuka:['#374735','#678363','#b1bb94'], kowhai:['#314831','#708955','#a4a572'],
  koromiko:['#314330','#58764d','#9cab7b'], kakabeak:['#2a482e','#5f8043','#a4a06b'], panakenake:['#395b28','#5a7835','#a3a46b'],
};
const clans={
  oioi:'wire-rush',
  hydrangea:'mophead',agapanthus:'umbel',echinacea:'cone',
  harakeke:'fan',platts_black:'fan',silver_spear:'fan',rengarenga:'straps',libertia:'straps',
  toetoe:'grass',red_tussock:'grass',carex_testacea:'grass',poa_cita:'grass',
  ponga:'fern',tikouka:'cabbage',nikau:'palm',pohutukawa:'canopy',manuka:'canopy',kowhai:'canopy',koromiko:'shrub',kakabeak:'shrub',panakenake:'mat',
};
function rand(seed){return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^(seed>>>15),1|seed);t=t+Math.imul(t^(t>>>7),61|t)^t;return ((t^(t>>>14))>>>0)/4294967296;};}
const add=(p,q)=>p.map((v,i)=>v+q[i]);
const mul=(v,s)=>v.map(n=>n*s);
const lerp=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const unit=v=>mul(v,1/(Math.hypot(...v)||1));
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const point=(az,r,y)=>[Math.cos(az)*r,y,Math.sin(az)*r];
const quad=(a,b,c,t)=>lerp(lerp(a,b,t),lerp(b,c,t),t);

export function makeNativeFoliage(species, three,{compact=false}={}){
 const {Geometry,Attribute,Color}=three;
 const id=species.id, clan=clans[id];
 if(!clan)return null;
 const colorCache=new Map();
 const color=hex=>{if(!colorCache.has(hex)){const c=new Color(hex);colorCache.set(hex,[c.r,c.g,c.b]);}return colorCache.get(hex);};
 const [dark,middle,light]=palette[id].map(color);
 const bark=lerp(color(species.trunkColor||'#685445'),color('#817265'),id==='pohutukawa'?.47:.23);
 const flower=color(species.flowerColor||'#d1bf92');
 const r=rand([...id].reduce((seed,c)=>Math.imul(seed,31)+c.charCodeAt(0),48271));
 const random=(a,b)=>a+(b-a)*r();
 const h=species.matureHeight, spread=species.matureSpread;
 const localBloom=['hydrangea','harakeke','rengarenga','libertia','agapanthus','echinacea'].includes(id);
 const d=[],rgb=[],uv=[],tip=[],part=[],idx=[],petalOffsets=[];
 const vertex=(p,col,u,v,flex,tag,attachment)=>{
  d.push(...p);rgb.push(...col);uv.push(u,v);tip.push(flex);part.push(tag);
  if(localBloom){
   if(attachment)petalOffsets.push(p[0]-attachment[0],p[1]-attachment[1],p[2]-attachment[2]);
   else petalOffsets.push(0,0,0);
  }
 };
 function ribbon(fn, axis, width, steps, base, end, flex=1, tag=1, fold=.17){
  if(compact)steps=Math.max(2,Math.ceil(steps*.58));
  const start=d.length/3;
  for(let j=0;j<=steps;j++){
   const t=j/steps, p=fn(t), tangent=unit(add(fn(Math.min(1,t+.005)),mul(fn(Math.max(0,t-.005)),-1))), side=unit(axis(t)), normal=unit(cross(tangent,side));
   const w=Math.max(.0005,width(t)), tint=lerp(base,end,Math.pow(t,.65));
   for(let k=0;k<3;k++){
    const s=k-1, pos=add(add(p,mul(side,w*s)),mul(normal,Math.abs(s)*w*fold));
    vertex(pos,mul(tint,k===1?1.055:(k===0?.96:.91)),k/2,t,clamp(typeof flex==='function'?flex(t):t*flex,0,1),tag);
   }
   if(j){const a=start+(j-1)*3,b=a+3;idx.push(a,b,a+1,a+1,b,b+1,a+1,b+1,a+2,a+2,b+1,b+2);}
  }
 }
 function tube(points, from,to,col,sides=7,bend=0,tag=0){
  if(compact)sides=Math.max(4,Math.ceil(sides*.68));
  const start=d.length/3, phase=random(0,TAU);
  for(let j=0;j<points.length;j++){
   const t=j/(points.length-1), p=points[j], up=unit(add(points[Math.min(j+1,points.length-1)],mul(points[Math.max(0,j-1)],-1)));
   const radial=unit(cross(up,Math.abs(up[1])>.88?[1,0,0]:[0,1,0])), binormal=unit(cross(up,radial));
   const radius=from*(1-t)+to*t;
   for(let k=0;k<=sides;k++){
    const a=phase+k*TAU/sides, rough=1+.10*Math.sin(a*5+j*.45)+.04*Math.sin(a*3-j*.8);
    const v=add(mul(radial,Math.cos(a)),mul(binormal,Math.sin(a)));
    vertex(add(p,mul(v,radius*rough)),mul(col,(.76+.27*t)*(.83+.16*Math.sin(a*3+1)+.13*Math.sin(a*5+.6))),k/sides,t,typeof bend==='function'?bend(t):t*bend,tag);
   }
   if(j)for(let k=0;k<sides;k++){const a=start+(j-1)*(sides+1)+k,b=a+sides+1;idx.push(a,a+1,b,a+1,b+1,b);}
  }
 }
 function blade(az,start, radial,rise,width, droop, inner=false,col=middle){
  const x=t=>radial*Math.pow(t,1.08), y=t=>rise*t+droop*Math.sin(PI*t)*.69;
  const aim=point(az,1,0), side=point(az+.5*PI,1,0);
  ribbon(t=>add(start,add(mul(aim,x(t)),[0,y(t),Math.sin(t*3)*radial*.11])),()=>side,
    t=>width*Math.pow(Math.max(0,Math.sin(PI*(.07+.93*t))),inner?.56:.78),7,
    lerp(dark,col,.13),lerp(col,light,random(.14,.63)),inner?.64:.98,1,inner?.29:.17);
 }
 // A folded leaf opens progressively from its basal sheath and twists at the tip.
 function strap(az, root, reach, rise, halfWidth, arch, opening) {
  const heading=point(az,1,0), across=point(az+PI/2,1,0);
  const lean=random(-.11,.11)*reach, roll=random(-.57,.57), n=compact?6:clan==='fan'?10:7;
  const sections=compact||id==='silver_spear'||id==='platts_black'||clan==='umbel'?[-1,0,1]:[-1,-.48,0,.48,1];
  const base=lerp(dark,middle,random(.12,.32)), body=lerp(middle,light,random(.08,.37));
  const tipTint=opening>.74?lerp(body,color('#a49b73'),random(.23,.55)):lerp(body,light,.15);
  const edge=id==='harakeke'?lerp(base,color('#8d6450'),.25):lerp(base,body,.76);
  const fn=t=>add(root,add(mul(heading,reach*t**1.62),add(mul(across,lean*t*t),[0,rise*t+arch*Math.sin(PI*t),0])));
  const start=d.length/3;
  for(let j=0;j<=n;j++){
   const t=j/n, centre=fn(t), tangent=unit(add(fn(Math.min(1,t+.001)),mul(fn(Math.max(0,t-.001)),-1)));
   const normal=unit(cross(across,tangent)), twist=roll*t*t;
   const side=add(mul(across,Math.cos(twist)),mul(normal,Math.sin(twist)));
   const lift=unit(cross(side,tangent));
   const width=halfWidth*Math.max(.007,Math.sin(PI*(.13+.87*t))**.63)*(1-.22*t);
   const leafTone=lerp(lerp(base,body,Math.min(1,t*2.5)),tipTint,t**5);
   for(const offset of sections){
    const edgeDistance=Math.abs(offset);
    const keel=width*edgeDistance**1.45*(.58-.39*t);
    const position=add(centre,add(mul(side,width*offset),mul(lift,keel)));
    const tint=offset===0?lerp(leafTone,light,.13):lerp(leafTone,edge,.14*edgeDistance);
    vertex(position,mul(tint,1+.05*offset),offset*.5+.5,t,t*t*(.70+.24*opening),1);
   }
   if(j)for(let k=1;k<sections.length;k++){
    const a=start+(j-1)*sections.length+k-1,b=a+sections.length;
    idx.push(a,a+1,b,a+1,b+1,b);
   }
  }
 }
 // Joined pedicels end in a trumpet or an open flower, with each vertex inheriting
 // its stalk's wind weight. The rim has one curve per tepal instead of a flat cap.
 function trumpet(base, direction, length, mouth, lobes, basal, end, weight) {
  const axis=unit(direction),side=unit(cross(axis,Math.abs(axis[1])>.88?[1,0,0]:[0,1,0])),up=cross(axis,side);
  const phase=random(0,TAU), slices=lobes*2, start=d.length/3;
  for(let ring=0;ring<3;ring++){
   for(let i=0;i<slices;i++){
    const a=phase+TAU*i/slices, lip=i%2===0;
    const radius=mouth*(ring===0?.14:ring===1?.46:lip?1:.76);
    const dist=length*(ring===0?0:ring===1?.62:lip?1:.84);
    const p=add(base,add(mul(axis,dist),add(mul(side,radius*Math.cos(a)),mul(up,radius*Math.sin(a)))));
    vertex(p,lerp(basal,end,ring===0?.06:ring===1?.36:lip?.95:.70),i/slices,ring*.5,weight,2,base);
    if(ring>0){
     const k=start+(ring-1)*slices+i,next=start+(ring-1)*slices+(i+1)%slices;
     idx.push(k,next,k+slices,next,next+slices,k+slices);
    }
   }
  }
 }
 function openFlower(centre, normal, size, petals, colour, weight) {
  const axis=unit(normal), side=unit(cross(axis,Math.abs(axis[1])>.88?[1,0,0]:[0,1,0])),up=cross(axis,side);
  const phase=random(0,TAU), centreColour=color('#cfaa67'), first=d.length/3;
  vertex(centre,centreColour,.5,.5,weight,2,centre);
  for(let j=0;j<petals;j++){
   const a=phase+TAU*j/petals, reach=mul(add(mul(side,Math.cos(a)),mul(up,Math.sin(a))),size*random(.90,1.06));
   const span=mul(unit(cross(axis,reach)),size*(petals===3?.56:.28));
   const n=d.length/3;
   for(const [along,across,height,tint] of [[.11,0,.01,.39],[.49,-.72,.04,.76],[.84,-.64,.18,.94],[1,0,.19,1],[.8,.68,.13,.91],[.43,.64,.06,.73],[.62,0,.09,.93]]){
    vertex(add(centre,add(mul(reach,along),add(mul(span,across),mul(axis,size*height)))),lerp(centreColour,colour,tint),.5+across*.5,along,weight,2,centre);
   }
   idx.push(n,n+1,n+6,n+1,n+2,n+6,n+2,n+3,n+6,n+3,n+4,n+6,n+4,n+5,n+6,n+5,n,n+6);
   if(j)idx.push(first,n,n-7);
  }
  idx.push(first,first+1,first+1+7*(petals-1));
 }
 // Two narrow crossed profiles are enough for the sub-millimetre flower stalks.
 function pedicel(start,end,width,baseTone,baseWind,tipWind){
  const axis=unit(add(end,mul(start,-1))),across=unit(cross(axis,Math.abs(axis[1])>.88?[1,0,0]:[0,1,0]));
  for(const side of (compact?[across]:[across,cross(axis,across)])){
   const n=d.length/3;
   for(const [p,r,t,w] of [[start,width,0,baseWind],[end,width*.60,1,tipWind]]){
    vertex(add(p,mul(side,-r)),baseTone,0,t,w,0);
    vertex(add(p,mul(side,r)),baseTone,1,t,w,0);
   }
   idx.push(n,n+1,n+2,n+1,n+3,n+2);
  }
 }
 function frond(az,start,length,rise,pairs,pinLength,kind){
  const along=point(az,1,0), side=point(az+.5*PI,1,0), palm=kind==='palm';
  const fn=t=>add(start,add(mul(along,length*t),[0,rise*Math.sin(PI*(t*.79))-(palm?.42:.35)*rise*t,0]));
  tube(Array.from({length:10},(_,j)=>fn(j/9)),length*.009,length*.0008,lerp(dark,light,.32),4,.74,1);
  for(let i=0;i<pairs;i++)for(let sign of [-1,1]){
   const t=.11+.84*(i+random(.05,.42))/pairs,p=fn(t);
   const fl=pinLength*Math.pow(Math.sin(PI*t),palm?.62:.86)*random(.82,1.15);
   const end=add(p,add(mul(side,fl*sign),add(mul(along,fl*(palm?.22:.49)),[0,(palm?-.46:-.14)*fl,0])));
   const fac=random(.71,1.12);
   ribbon(s=>quad(p,add(lerp(p,end,.46),[0,fl*.11,0]),end,s),()=>along,
    s=>fl*(palm?.074:.119)*Math.pow(Math.sin(PI*s),.7),palm?3:2,
    mul(lerp(dark,middle,.3),fac),mul(lerp(middle,light,.23),fac),s=>t*.63+s*.3,1,palm?.13:.21);
  }
 }
 if(clan==='fan'||clan==='straps'){
  const flax=clan==='fan', fans=flax?5:compact?3:4;
  for(let group=0;group<fans;group++){
   const heading=group*2.39996+random(-.35,.35), cx=point(heading,spread*random(.013,.115),0);
   const n=flax?8:id==='rengarenga'?4:5;
   for(let j=0;j<n;j++){
    const side=j%2?1:-1, opening=j/(n-1), az=heading+(flax?side*PI*.5+random(-.18,.18):j*2.39996+random(-.25,.25));
    const reachable=spread*(.07+.47*opening)*random(.78,1.19);
    const height=h*(flax?.95:.67)*(1-(flax?.75:.82)*opening)*random(.75,1.05);
    const width=Math.min(flax?.052:.030,spread*(flax?.039:.036))*random(.68,1.19);
    strap(az,cx,reachable,height,width,h*(.10+.27*opening),opening);
   }
  }
  if(id==='harakeke'||id==='rengarenga'||id==='libertia'){
   const flaxFlower=id==='harakeke', iris=id==='libertia', count=flaxFlower?2:compact?2:3;
   const stemTone=flaxFlower?color('#584637'):lerp(middle,dark,.35);
   const florets=flaxFlower?4:2;
   for(let i=0;i<count;i++){
    const a=i*2.4+random(-.38,.38),p=point(a,spread*.053,0);
    const top=point(a,spread*random(.10,.26),h*random(flaxFlower?1.03:.84,flaxFlower?1.29:1.06));
    const stem=t=>quad(p,lerp(p,top,.55),top,t);
    tube([p,stem(.36),stem(.72),top],flaxFlower?.014:.0038,flaxFlower?.003:.0011,stemTone,6,.49,2);
    for(let j=0;j<(flaxFlower?5:3);j++){
     const t=.60+j*(flaxFlower?.078:.108),root=stem(t),w=t*.49,az=a+PI*j+random(-.31,.31);
     const end=add(root,point(az,spread*random(.077,.15),h*random(.036,.08)));
     tube([root,lerp(root,end,.50),end],flaxFlower?.007:.0024,flaxFlower?.0022:.0008,stemTone,4,v=>w+.055*v,2);
     for(let k=0;k<florets;k++){
      const v=(k+.72)/florets,node=lerp(root,end,v),phi=az+(k%2?-.71:.82);
      const base=add(node,point(phi,flaxFlower?.014:.011,flaxFlower?.005:-.006)),weight=w+.055*v;
      tube([node,base],flaxFlower?.0026:.0011,flaxFlower?.0023:.0007,stemTone,4,()=>weight,2);
      if(flaxFlower){
       const tone=lerp(color('#873a34'),color('#b15b3a'),random(.05,.53));
       trumpet(base,point(phi,.35,1),random(.027,.050),random(.0045,.007),3,lerp(tone,bark,.36),tone,weight);
      }else{
       openFlower(base,point(phi,1,iris?.45:-.53),random(iris?.008:.012,iris?.014:.019),iris?3:6,lerp(color('#d4d0bb'),color('#f3efdf'),r()),weight);
      }
     }
    }
   }
  }
 }else if(clan==='umbel'){
  // Agapanthus is a cultivated ornamental in the existing mixes, separate from the NZ natives.
  const heads=compact?2:3, flowers=compact?9:11;
  for(let i=0;i<(compact?12:15);i++){
   const az=i*2.39996+random(-.18,.18),f=r();
   strap(az,point(az,.018,0),spread*random(.20,.48),h*(.18+.33*f),random(.009,.017),h*random(.13,.25),f);
  }
  const stemTone=color('#5c744c');
  for(let i=0;i<heads;i++){
   const az=i*2.39996+random(-.14,.14),root=point(az,spread*.04,0);
   const crown=point(az,spread*random(.09,.27),h*random(.74,.91)),mid=lerp(root,crown,.48);
   tube([root,mid,crown],.0052,.0037,stemTone,6,.51,2);
   const radius=spread*random(.105,.145);
   const violet=lerp(color('#6075ad'),color('#999bc6'),random(.07,.67));
   for(let j=0;j<flowers;j++){
    const a=az+j*2.39996+random(-.17,.17),y=-.25+1.23*(j+.5)/flowers;
    const axis=point(a,Math.sqrt(1-y*y),y),base=add(crown,mul(axis,radius*random(.77,1.05)));
    const bend=add(lerp(crown,base,.50),[0,.003,0]);
    pedicel(crown,bend,.0013,stemTone,.51,.545);
    pedicel(bend,base,.0010,stemTone,.545,.58);
    trumpet(base,axis,random(.019,.028),random(.007,.0105),6,lerp(violet,dark,.23),lerp(violet,light,.07),.58);
   }
  }
 }else if(clan==='cone'){
  // Echinacea is another ornamental in the planted border. Rays hang below
  // a raised copper receptacle on leafy, irregularly spaced stems.
  const heads=compact?3:4, rays=compact?11:15;
  for(let j=0;j<heads;j++){
   const az=j*2.4+random(-.3,.3),root=point(az,spread*.04,0),head=point(az,spread*random(.18,.36),h*random(.73,.97));
   const mid=add(lerp(root,head,.54),point(az+.8,.015,0)),fn=t=>quad(root,mid,head,t);
   tube([root,fn(.42),fn(.72),head],.0045,.0023,middle,5,.46,0);
   for(let i=0;i<5;i++){
    const t=.14+.13*i,dir=az+i*2.4,len=spread*(.23-.016*i)*random(.80,1.05),start=fn(t);
    const end=add(start,point(dir,len,len*.32));
    ribbon(v=>quad(start,add(lerp(start,end,.53),[0,len*.17,0]),end,v),()=>point(dir+PI/2,1,0),
      v=>len*.24*Math.sin(PI*v)**.78,4,dark,lerp(middle,light,.24),v=>.46*t+.12*v,1,.31);
   }
   const coneR=random(.012,.017),coneH=coneR*1.45,sections=compact?9:13;
   const base=d.length/3, bronze=color('#754f33'),pollen=color('#b68346');
   for(let j=0;j<4;j++){
    const y=[0,.34,.75,.99][j],w=[.84,1,.61,.09][j];
    for(let i=0;i<sections;i++){
     const a=TAU*(i+.16*j)/sections;
     vertex(add(head,point(a,coneR*w,coneH*y)),lerp(bronze,pollen,clamp(.16+.16*j+.10*Math.sin(i*3+j),0,1)),i/sections,y,.46,2,head);
     if(j){const k=base+(j-1)*sections+i,l=base+(j-1)*sections+(i+1)%sections;
      idx.push(k,l,k+sections,l,l+sections,k+sections);}
    }
   }
   const rose=lerp(color('#ad7082'),color('#bc8293'),r());
   for(let i=0;i<rays;i++){
    const a=az+i*TAU/rays+random(-.07,.07),out=point(a,1,0),side=point(a+PI/2,1,0);
    const root=add(head,mul(out,coneR*.84)),len=random(.026,.044),drop=random(.46,.97),n=d.length/3;
    for(const [t,v] of [[0,0],[.48,-.16],[.87,-.16],[1,.01],[.84,.18],[.43,.17],[.56,0]]){
     const y=len*(.20*Math.sin(PI*t)-drop*t**1.4+.13*Math.abs(v));
     vertex(add(root,add(mul(out,len*t),add(mul(side,len*v),[0,y,0]))),
      lerp(mul(rose,.64),rose,.28+.64*t+.05*v),.5+v,t,.46,2,head);
    }
    idx.push(n,n+1,n+6,n+1,n+2,n+6,n+2,n+3,n+6,n+3,n+4,n+6,n+4,n+5,n+6,n+5,n,n+6);
   }
  }
 }else if(clan==='wire-rush'){
  // Jointed oioi culms rise in uneven fans, with dark sheaths at staggered nodes.
  const stems=compact?26:47;
  for(let i=0;i<stems;i++){
   const a=i*2.39996+random(-.24,.24), radius=random(.07,.49)*spread;
   const base=point(a,radius*.35,0),height=h*random(.45,1.04),lean=point(a,radius*.63,0);
   const curl=point(a+PI/2,random(-.033,.033)*spread,0);
   const path=t=>add(base,add(mul(lean,t*t),add(mul(curl,Math.sin(PI*t)),[0,t*height,0])));
   const width=random(.0019,.0032),tone=lerp(middle,light,random(.15,.79));
   tube(Array.from({length:6},(_,j)=>path(j/5)),width,width*.58,tone,5,.70,1);
   // Joint details share the stalk's wind weight so the russet sheaths stay attached.
   for(const t of [.29,.53,.76]){
    const p=path(t),q=path(t+.022),side=point(a+PI/2,1,0);
    ribbon(v=>lerp(p,add(q,point(a,.006,.008)),v),()=>side,v=>width*(1.4-v),2,
      bark,lerp(bark,light,.39),v=>(t+v*.022)*.7,0,.24);
   }
  }
 }else if(clan==='grass'){
  const n=id==='toetoe'?61:72;
  for(let i=0;i<n;i++){
   const az=i*2.39996+random(-.24,.24), outer=random(.1,1);
   const size=id==='toetoe'?.56:.82;
   blade(az,point(az,spread*random(.007,.103),.01),spread*(.16+.38*outer),h*size*random(.14,.79)*(1-.32*outer),
     Math.min(.012,spread*.011)*random(.28,1.17),h*size*random(.17,.41),outer<.36,lerp(middle,light,r()*.59));
  }
  if(id==='toetoe')for(let j=0;j<8;j++){
   const a=j*2.39996+random(-.25,.25), outer=spread*random(.24,.54), peak=h*random(.7,1.02);
   const p=point(a,spread*random(.025,.09),0),q=point(a,outer*.57,peak*.91),end=point(a,outer,peak);
   const fn=t=>quad(p,q,end,t);
   tube(Array.from({length:10},(_,i)=>fn(i/9)),.014,.002,lerp(middle,light,.52),5,.76,2);
   for(let k=0;k<13;k++)for(let k2=0;k2<4;k2++){
    const t=.70+k*.023+random(-.011,.011), x=fn(t), az=k2*TAU/4+k*.5;
    const len=h*.105*Math.max(.12,Math.sin((t-.69)/.33*PI))*random(.67,1.06);
    const y=add(x,point(az,len,len*.57)), side=point(az+PI/2,1,0);
    ribbon(v=>quad(x,lerp(x,y,.55),y,v),()=>side,v=>len*.15*Math.sin(PI*v),2,light,mul(color('#d7cda8'),random(.85,1.05)),.9,2,.10);
   }
  }
 }else if(clan==='fern'||clan==='palm'||clan==='cabbage'){
  const base=clan==='fern'?h*.60:clan==='palm'?h*.73:h*.65, crown=[0,base,0];
  const steps=clan==='palm'?21:11, thick=clan==='fern'?.074:clan==='palm'?.12:.085;
  const stem=t=>[Math.sin(t*1.78)*base*.04,base*t,Math.sin(t*1.23)*base*.018];
  tube(Array.from({length:steps},(_,j)=>stem(j/(steps-1))),thick*1.32,thick*.57,bark,clan==='palm'?10:7);
  if(clan==='palm'){
   const root=stem(.84),top=add(stem(1),[0,h*.07,0]);
   tube([root,lerp(root,top,.24),lerp(root,top,.53),top],.103,.08,lerp(middle,light,.22),10,.05,1);
   for(let j=2;j<steps-3;j++){
    const t=j/(steps-1), c=stem(t), rad=thick*1.32*(1-t)+thick*.57*t;
    tube([c,add(c,[0,h*.004,0])],rad*1.04,rad*1.025,mul(bark,1.29),10);
   }
  }
  for(let j=0;j<(clan==='cabbage'?60:clan==='palm'?16:13);j++){
   const az=j*2.39996+random(-.12,.12), p=add(crown,point(az,random(.01,.11),h*random(-.020,.023)));
   if(clan==='cabbage')blade(az,p,spread*random(.16,.55),h*random(-.086,.21),random(.014,.026),h*random(.07,.18),j%3===0);
   else frond(az,p,spread*random(.37,.61),h*random(.15,.29),clan==='palm'?20:15,spread*(clan==='palm'?.161:.151),clan);
  }
 }else if(clan==='mophead'){
  // Separate woody canes and individual florets; no crossing atlas cards.
  const tones=['#536996','#7b8fb4','#9c9cba','#adabc3'].map(color);
  const count=compact?7:8, flecks=compact?20:22;
  const rim = compact
   ? [[.05,0,0],[.45,-.67,.07],[.94,-.48,.05],[1.09,.04,.20],[.86,.58,.10],[.40,.68,.07]]
   : [[.06,0,.02],[.32,-.42,.07],[.60,-.68,.12],[.94,-.59,.10],[1.09,-.23,.13],[1.08,.18,.18],[.87,.60,.14],[.63,.66,.09],[.30,.37,.06]];

  for(let i=0;i<count;i++){
   const az=i*2.399963+random(-.18,.18), inner=i%4===0;
   const radius=spread*(inner?random(.064,.15):random(.21,.36));
   const crown=point(az,radius,h*(inner?random(.78,.91):random(.57,.79)));
   const root=point(az,spread*random(.008,.056),0);
   const control=point(az,radius*.70,crown[1]*.48);
   const stem=t=>quad(root,control,crown,t);
   tube(Array.from({length:5},(_,j)=>stem(j/4)),spread*.009,spread*.0024,bark,6,.32,0);
   for(let j=0;j<(compact?3:4);j++)for(const sign of [-1,1]){
    const t=.28+j*.165+random(-.047,.045), head=stem(t), a=az+sign*random(.62,1.58)+j*.91;
    const len=spread*random(.105,.202)*(1.04-.13*t), rad=point(a,1,0), across=point(a+PI/2,1,0);
    const start=add(head,mul(rad,len*.17));
    const leafWeight=t*.32+.04;
    tube([head,start],len*.035,len*.021,middle,4,v=>t*.32+v*.04,1);
    const fn=v=>add(start,add(mul(rad,len*v),[0,len*(.28*Math.sin(PI*v)-.23*v),0]));
    ribbon(fn,()=>across,v=>len*.43*Math.pow(Math.max(0,Math.sin(PI*v)),.76)*(1-.10*Math.cos(v*PI*12)),
      7,mul(dark,random(.86,1.15)),lerp(middle,light,random(.11,.49)),v=>leafWeight+.26*v,1,.25);
   }
   const radiusHead=spread*random(.070,.104), hue=tones[i%tones.length];
   const forks=Array.from({length:4},(_,j)=>{
    const a=j*PI/2+az;
    const end=add(crown,point(a,radiusHead*.46,radiusHead*.18));
    tube([crown,end],.0021,.0013,middle,4,t=>.32+.025*t,0);
    return end;
   });
   for(let k=0;k<flecks;k++){
    const az2=k*2.399963+random(-.16,.16), u=(k+.43)/flecks, lift=.11+.85*u;
    const radius=radiusHead*Math.sqrt(1-lift*lift);
    const c=add(crown,point(az2,radius,radiusHead*lift*.84));
    const fork=forks[(Math.round((az2-az)/(.5*PI))%4+4)%4];
    pedicel(fork,c,.0012,lerp(middle,hue,.38),.345,.385);
    const normal=unit(point(az2+random(-.13,.13),Math.sqrt(1-lift*lift),lift+random(-.12,.12)));
    const x=point(az2+PI/2,1,0), z=unit(cross(normal,x));
    const scale=radiusHead*random(compact?.28:.24,compact?.41:.34);
    const base=lerp(hue,tones[Math.floor(r()*tones.length)],random(.07,.27));
    const flex=.385,eye=d.length/3;
    vertex(add(c,mul(normal,scale*.13)),lerp(base,color('#cec5a7'),.51),.5,.5,flex,2,c);
    for(let j=0;j<5;j++){
     const phase=j*TAU/5;
     vertex(add(c,add(mul(x,Math.cos(phase)*.16*scale),mul(z,Math.sin(phase)*.16*scale))),
       lerp(base,dark,.18),.5,.5,flex,2,c);
     idx.push(eye,eye+1+j,eye+1+(j+1)%5);
    }
    for(let j=0;j<4;j++){
     const a=j*PI/2+i*.38+k*.63+random(-.07,.07), out=add(mul(x,Math.cos(a)),mul(z,Math.sin(a))), side=unit(cross(normal,out));
     const width=random(.58,.72),curl=random(.72,1.28);
     const get=(u,v,up)=>add(c,add(mul(out,u*scale),add(mul(side,v*width*scale),mul(normal,up*scale*curl))));
     const n=d.length/3, faded=lerp(base,color('#d9cfd1'),random(.06,.26));
     vertex(get(.63,0,.10),base,.6,.5,flex,2,c);
     for(const [v,w,z] of rim){
      vertex(get(v,w,z),lerp(mul(base,.69),faded,v*.83),v,.5+w*.5,flex,2,c);
     }
     for(let k=0;k<rim.length;k++)idx.push(n,n+1+k,n+1+(k+1)%rim.length);
    }
   }
  }
 }else if(clan==='shrub'||clan==='mat'){
  const mat=clan==='mat', beak=id==='kakabeak', stems=mat?9:beak?12:14;
  for(let i=0;i<stems;i++){
   const az=i*2.39996, p=point(az,spread*.05,.005),q=point(az,spread*random(.19,.40),h*random(.34,.87)),y=point(az,spread*random(.28,.49),h*random(.31,.83));
   const stem=t=>quad(p,q,y,t);tube(Array.from({length:5},(_,k)=>stem(k/4)),mat?.0015:spread*.009,.001,bark,4,.47,1);
   for(let j=0;j<9;j++) {
    const at=(j+.5)/9, t=stem(at), a=az+(j%2?-1:1)*random(.72,1.24);
    if(beak)for(let k=0;k<6;k++){const piece=add(t,point(a,(.014+.016*k),k*.009));canopyLeaf(piece,a+(k%2?.84:-.84),random(.028,.056),.31,.60);}
    else canopyLeaf(t,a,spread*random(mat?.036:.092,mat?.095:.164),random(.37,.49),.64);
   }
   if(mat||beak){
    const c=add(y,[0,beak?-.027:.012,0]);
    for(let j=0;j<5;j++)bladeFlower(add(c,point(j*TAU/5,.010,0)),j*TAU/5,beak?-.064:.014,flower);
   }else{
    for(let j=0;j<12;j++){
     const a=j*2.39996,c=add(y,point(a,spread*.017,h*.25*j/12));
     bladeFlower(c,a,.023,lerp(flower,color('#c4b7ce'),r()*.3));
    }
   }
  }
 }else{
  const manuka=id==='manuka', kowhai=id==='kowhai';
  const b=[0,h*.43,0], axis=[random(-.13,.13)*spread,h*.66,random(-.08,.08)*spread];
  tube([[0,0,0],[h*.013,h*.16,.01],b,axis],spread*(manuka?.028:.063),spread*.013, bark,8);
  if(!manuka)for(let i=0;i<5;i++){
   const a=i*TAU/5;
   tube([point(a,spread*.19,.012),point(a,spread*.075,h*.032),[0,h*.08,0]],spread*.009,spread*.022,bark,5);
  }
  const branches=manuka?9:kowhai?10:12;
  for(let i=0;i<branches;i++){
   const az=i*2.39996+random(-.17,.17), ratio=i/(branches-1);
   const root=[axis[0]*(.2+.8*ratio),h*(.20+.42*ratio),axis[2]*ratio];
   const tip=point(az,spread*random(.24,.45)*(1-.33*ratio),h*(.57+.28*ratio)+h*random(-.05,.105));
   const mid=lerp(root,tip,.6);mid[1]-=h*random(.01,.10);
   tube([root,lerp(root,mid,.50),mid,tip], spread*(manuka?.020:.028)*(1-.53*ratio),spread*.0025,bark,6,.13);
   for(let k=0;k<6;k++){
    const at=k/6, q=lerp(mid,tip,at*.92);
    const phi=az+(k%2?-.87:.73)+random(-.59,.64), span=spread*random(.074,.171);
    const end=add(q,point(phi,span,h*random(.036,.151))), twig=lerp(q,end,.49);
    tube([q,twig,end],spread*.004,spread*.0013,lerp(bark,middle,.17),4,.39);
    const count=manuka?24:kowhai?8:24;
    for(let m=0;m<count;m++){
     const ang=m*2.39996+az, t=(m+.4)/(count+1), rd=span*random(.15,.99), leafBase=add(lerp(q,end,t),point(ang,rd,random(-.07,.097)*h));
     if(kowhai){
      const len=spread*random(.029,.065), y=add(leafBase,point(ang,len,-len*.26));
      for(let j=0;j<3;j++)for(let side of [-1,1]){
       const x=lerp(leafBase,y,(j+.4)/3), dir=ang+side*.88;
       canopyLeaf(x,dir,spread*random(.013,.027),random(.37,.52),.46);
      }
     }else canopyLeaf(leafBase,ang,spread*random(manuka?.023:.033,manuka?.044:.079),manuka?.26:.43,.61);
     if(m%6===0&&k%3!==0){
      const q=add(leafBase,[0,spread*.013,0]);
      if(id==='pohutukawa')for(let g=0;g<7;g++)bladeFlower(q,ang+g*2.4,spread*random(.018,.046),lerp(flower,color('#e36846'),r()*.41));
      else if(manuka)for(let g=0;g<5;g++)bladeFlower(q,g*TAU/5,spread*.013,color('#ede2cc'));
      else for(let g=0;g<4;g++)bladeFlower(add(q,point(g*TAU/4,.02,0)),ang+g*2.4,-spread*.038,flower);
     }
    }
   }
  }
 }
 function canopyLeaf(p,az,len,width,w){
  const side=point(az+PI/2,1,0), tip=add(p,point(az,len,len*random(-.40,.59))), mid=add(lerp(p,tip,.47),[0,len*.27,0]);
  ribbon(t=>quad(p,mid,tip,t),()=>side,t=>len*width*Math.pow(Math.sin(PI*t),.85),id==='kowhai'?2:3,
    lerp(dark,middle,random(.13,.75)),lerp(middle,light,random(.03,.59)),t=>w*(.77+.23*t),1,.22);
 }
 function bladeFlower(p,az,len,col){
  const q=add(p,point(az,Math.abs(len)*.53,len*.78)), side=point(az+PI/2,1,0);
  const shrink=id==='pohutukawa'?.105:.348;
  ribbon(t=>lerp(p,q,t),()=>side,t=>Math.abs(len)*shrink*Math.sin(t*.88*PI),2,mul(col,.54),col,.71,2,.14);
 }
 const g=new Geometry();
 g.setAttribute('position',new Attribute(d,3));g.setAttribute('uv',new Attribute(uv,2));
 g.setAttribute('color',new Attribute(rgb,3));g.setAttribute('aTipness',new Attribute(tip,1));
 g.setAttribute('aPartType',new Attribute(part,1));
 if(localBloom)g.setAttribute('aPetalOffset',new Attribute(petalOffsets,3));
 g.setIndex(idx);g.computeVertexNormals();
 return g;
}
