// Procedural Aotearoa foliage study. Original geometry and shading, no external texture fetch.
// Coordinates are in metres; the renderer supplies Three.js constructors and instancing.
const PI=Math.PI, TAU=2*PI;
const palette={
  hydrangea:['#233c23','#45683a','#6e8b53'],
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
  hydrangea:'mophead',
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
 const d=[],rgb=[],uv=[],tip=[],part=[],idx=[];
 const vertex=(p,col,u,v,flex,tag)=>{d.push(...p);rgb.push(...col);uv.push(u,v);tip.push(flex);part.push(tag);};
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
    vertex(add(p,mul(v,radius*rough)),mul(col,(.76+.27*t)*(.83+.16*Math.sin(a*3+1)+.13*Math.sin(a*5+.6))),k/sides,t,t*bend,tag);
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
  const flax=clan==='fan', fans= id==='silver_spear'?5:flax?5:7;
  for(let group=0;group<fans;group++){
   const heading=group*2.39996+random(-.35,.35), cx=point(heading,spread*random(.013,.115),random(.005,.048));
   const n=flax?8:id==='rengarenga'?5:7;
   for(let j=0;j<n;j++){
    const side=j%2?1:-1, opening=j/(n-1), az=heading+(flax?side*PI*.5+random(-.18,.18):j*2.39996+random(-.25,.25));
    const reachable=spread*(.07+.47*opening)*random(.78,1.19);
    const height=h*(flax?.93:.85)*(1-.86*opening)*random(.65,1.11);
    const width=Math.min(flax?.049:.044,spread*(flax?.045:.046))*random(.62,1.24);
    blade(az,cx,reachable,height,width,h*(.15+.3*opening),opening<.4);
   }
  }
  if(id==='harakeke'||id==='rengarenga'||id==='libertia') {
   const count=id==='harakeke'?3:4;
   for(let i=0;i<count;i++){
    const a=i*2.4,p=point(a,spread*.035,0),q=point(a,spread*.13,h*(id==='harakeke'?1.19:1.02));
    tube([p,lerp(p,q,.43),lerp(p,q,.78),q],id==='harakeke'?.014:.004,.002,lerp(bark,middle,.3),5,.48,2);
    for(let j=0;j<(id==='harakeke'?5:4);j++){
     const x=lerp(p,q,.59+j*.066), az=j*2.4;
     const far=add(x,point(az,spread*.083,h*.032));
     tube([x,far],.005,.002,middle,4,.7,2);
     for(let k=0;k<(id==='rengarenga'?4:3);k++)bladeFlower(add(far,point(k*TAU/3,.022,0)),az+k*2.1,id==='harakeke'?.045:.038,flower);
    }
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
  const tones=['#344c8c','#4b69af','#6886cf','#8397d8','#a7adde','#9c88c1'].map(color);
  const count=compact?8:11, flecks=compact?18:27;
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
    tube([head,start],len*.035,len*.021,middle,4,.34,1);
    const fn=v=>add(start,add(mul(rad,len*v),[0,len*(.28*Math.sin(PI*v)-.23*v),0]));
    ribbon(fn,()=>across,v=>len*.43*Math.pow(Math.max(0,Math.sin(PI*v)),.76)*(1-.10*Math.cos(v*PI*12)),
      10,mul(dark,random(.86,1.15)),lerp(middle,light,random(.11,.49)),v=>.26+.28*v,1,.25);
   }
   const radiusHead=spread*random(.066,.106);
   for(let k=0;k<flecks;k++){
    const az2=k*2.399963+random(-.16,.16), u=(k+.43)/flecks, lift=.12+.86*u;
    const c=add(crown,point(az2,radiusHead*Math.sqrt(1-lift*lift),radiusHead*lift*.89));
    const normal=unit(point(az2,Math.sqrt(1-lift*lift),lift));
    const x=point(az2+PI/2,1,0), z=unit(cross(normal,x));
    const scale=radiusHead*random(compact?.29:.23,compact?.40:.32);
    const base=tones[(i+Math.floor(random(0,tones.length)))%tones.length];
    for(let j=0;j<4;j++){
     const a=j*PI/2+i*.38+k*.63, out=add(mul(x,Math.cos(a)),mul(z,Math.sin(a))), side=unit(cross(normal,out));
     const get=(u,v,up)=>add(c,add(mul(out,u*scale),add(mul(side,v*scale),mul(normal,up*scale))));
     const n=d.length/3, flex=.33+(i%4)*.035;
     for(const [u,v,z,tint] of [[.05,0,0,.74],[.42,-.31,.075,.87],[.95,-.24,.10,1.01],[1.18,0,.19,1.16],[.95,.26,.11,1.00],[.42,.31,.068,.91],[.64,0,.21,1.07]]){
      vertex(get(u,v,z),mul(base,tint),u,.5+v,flex,2);
     }
     idx.push(n,n+1,n+6,n+1,n+2,n+6,n+2,n+3,n+6,n+3,n+4,n+6,n+4,n+5,n+6,n+5,n,n+6);
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
 g.setAttribute('aPartType',new Attribute(part,1));g.setIndex(idx);g.computeVertexNormals();
 return g;
}
