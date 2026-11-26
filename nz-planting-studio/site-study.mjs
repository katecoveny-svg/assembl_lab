import {houseParts} from './study-assets/house-parts.js';
import {outcome,finishes} from './outcomes.mjs';
const $=id=>document.getElementById(id);
const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
const area=r=>Math.abs(r.reduce((a,p,i)=>{let q=r[(i+1)%r.length];return a+p[0]*q[1]-q[0]*p[1]},0)*.5);
const inside=(x,y,r)=>{let ok=false;for(let i=0,j=r.length-1;i<r.length;j=i++){let [u,v]=r[i],[s,t]=r[j];if((v>y)!==(t>y)&&x<(s-u)*(y-v)/(t-v)+u)ok=!ok}return ok;};
function clippedRing(source,half){
 const rules=[[0,half,1],[0,-half,-1],[1,half,1],[1,-half,-1]];
 let poly=source.slice(0,source.length>1&&source[0][0]===source.at(-1)[0]&&source[0][1]===source.at(-1)[1]?-1:undefined);
 for(const [axis,edge,sign] of rules){
  const next=[];
  for(let i=0;i<poly.length;i++){
   const a=poly[(i+poly.length-1)%poly.length],b=poly[i],ina=(a[axis]-edge)*sign<=0,inb=(b[axis]-edge)*sign<=0;
   if(ina!==inb){const k=(edge-a[axis])/(b[axis]-a[axis]);const c=[a[0]+(b[0]-a[0])*k,a[1]+(b[1]-a[1])*k];c[axis]=edge;next.push(c);}
   if(inb)next.push(b);
  }
  poly=next;
 }
 return poly;
}
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const on=(a,b,c)=>Math.abs(cross(a,b,c))<1e-6&&[0,1].every(i=>c[i]>=Math.min(a[i],b[i])-1e-6&&c[i]<=Math.max(a[i],b[i])+1e-6);
const hits=(a,b,c,d)=>on(a,b,c)||on(a,b,d)||on(c,d,a)||on(c,d,b)||(cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0);
const edges=r=>r.map((a,i)=>[a,r[(i+1)%r.length]]).filter(([a,b])=>a[0]!==b[0]||a[1]!==b[1]);
const cuts=(a,b)=>a.some(([c,d])=>b.some(([e,f])=>hits(c,d,e,f)));
const fitPts=Array.from({length:9},(_,i)=>Array.from({length:10},(_,j)=>[-4.12+8.24*i/8,-2.6+7.32*j/9])).flat();
function siting(parcel,roof,terrain){
 const half=terrain.terrainSize/2, candidates=[];
 const rings=parcel.filter(r=>r.length>3&&area(r)>24);
 for(const ring of rings){
  const xs=ring.map(p=>p[0]),zs=ring.map(p=>p[1]);
  for(let x=Math.ceil(Math.max(-half+3,Math.min(...xs)));x<=Math.min(half-3,Math.max(...xs));x+=1.5)
  for(let z=Math.ceil(Math.max(-half+3,Math.min(...zs)));z<=Math.min(half-3,Math.max(...zs));z+=1.5)
  if(inside(x,z,ring))candidates.push({x,z,ring,score:x*x+z*z});
 }
 candidates.sort((a,b)=>a.score-b.score);
 for(const {x,z,ring} of candidates)for(const angle of [0,Math.PI/2,Math.PI,Math.PI/3,Math.PI/6,-Math.PI/3,-Math.PI/6]){
  const c=Math.cos(angle),s=Math.sin(angle),tx=(u,v)=>[x+u*c+v*s,z-u*s+v*c];
  const world=fitPts.map(([u,v])=>tx(u,v));
  const sides=edges([tx(-4.12,-2.6),tx(4.12,-2.6),tx(4.12,4.72),tx(-4.12,4.72)]);
  if(!world.every(([e,n])=>Math.abs(e)<half-.4&&Math.abs(n)<half-.4&&inside(e,n,ring)&&!roof.some(f=>inside(e,n,f))))continue;
  if(cuts(sides,edges(ring))||roof.some(f=>cuts(sides,edges(f))))continue;
  if(roof.some(f=>f.some(([e,n])=>{const u=(e-x)*c-(n-z)*s,v=(e-x)*s+(n-z)*c;return u>-4.12&&u<4.12&&v>-2.6&&v<4.72})))continue;
  return {x,z,angle};
 }
 return null;
}
const money=n=>new Intl.NumberFormat('en-NZ',{style:'currency',currency:'NZD',maximumFractionDigits:0}).format(n);
const signed=(n,format)=>Math.abs(n)<.05?'No change':(n>0?'+':'−')+format(Math.abs(n));
export function mountSiteStudy({T,scene,terrain,engine,camera,setCamera,readStats,look}){
 const base=new T.Group();base.name='Public timber pavilion · landscape study';scene.add(base);
 const cube=new T.BoxGeometry(), maps={};
 function texture(name){
  if(maps[name])return maps[name];
  const c=document.createElement('canvas');c.width=c.height=256;
  const ctx=c.getContext('2d');ctx.fillStyle='#a58d75';ctx.fillRect(0,0,256,256);
  const tex=new T.CanvasTexture(c);tex.colorSpace='srgb';tex.anisotropy=4;maps[name]=tex;
  const pic=new Image();pic.onload=()=>{ctx.drawImage(pic,0,0,256,256);tex.needsUpdate=true};
  pic.src=new URL('./study-assets/'+name,import.meta.url).href;return tex;
 }
 function material(color,roughness=.8,map=null,other={}){const m=new T.MeshStandardMaterial({color,roughness,map,...other});if(map)map.colorSpace='srgb';return m;}
 const cladding=material(0xffffff,.75);
 const mats={
  pine:material(0x826f5e),pile:material(0x82796d),deck:material(0xe2c9af,.83,texture('deck.webp')),ply:material(0xd5b491,.8,texture('cedar.webp')),
  clad:cladding,cedar:cladding,trim:material(0x292624,.55),lining:material(0xb88d66,.82,texture('cedar.webp')),
  steel:material(0x514d47,.69,null,{metalness:.18}),alu:material(0x282722,.47,null,{metalness:.45}),glass:material(0xb9d7dd,.31,null,{transparent:true,opacity:.19,depthWrite:false}),
  door:material(0xaf7e52,.76,texture('cedar.webp')),stone:material(0xafaaa2,.9,texture('sandy_gravel.webp'))
 };
 const {kinds}=houseParts(T), local=[];
 for(const [kind,parts] of Object.entries(kinds)){
  const materialKind=kind==='cedar'?cladding:(mats[kind]??(kind.toLowerCase().includes('clad')?cladding:mats.lining));
  const inst=new T.InstancedMesh(cube,materialKind,parts.length);inst.name=kind;inst.castShadow=kind!=='glass';inst.receiveShadow=true;
  const matrices=[];
  parts.forEach((part,j)=>{const transform=new T.Matrix4().compose(part.pc.p,part.pc.q,new T.Vector3(1,1,1)).multiply(part.m); matrices.push(transform);
   inst.setMatrixAt(j,transform);

  });
  inst.computeBoundingSphere();base.add(inst);if(kind==='pile')local.push([inst,matrices]);
 }
 const siteMasses=new T.Group();siteMasses.name='LINZ roof outline · indicative heights';scene.add(siteMasses);
 const wall=material(0xb1a99a),roofMat=material(0x5c605f);
 const userRates={};
 let address=false, place={x:-6.4,z:-8.1,angle:.13}, stats=readStats(), finish='cedar', baseline=null, data=null;
 function ground(){
  if(!place){base.visible=false;return}
  base.visible=true;base.rotation.y=place.angle;base.position.x=place.x;base.position.z=place.z;
  const c=Math.cos(place.angle),s=Math.sin(place.angle);
  const height=(x,z)=>terrain.getHeight(place.x+x*c+z*s,place.z-x*s+z*c);
  const ymin=Math.max(...[[-3.55,-2],[3.55,-2],[-3.55,2],[3.55,2],[0,0]].map(([x,z])=>height(x,z)));
  base.position.y=ymin+.68;
  for(const [inst,matrices] of local){
   matrices.forEach((m,j)=>{const a=m.clone(),v=a.elements,top=v[13]+(Math.abs(v[1])+Math.abs(v[5])+Math.abs(v[9]))*.5;
    const bottom=Math.min(top-.04,height(v[12],v[14])-base.position.y-.10),old=Math.abs(v[1])+Math.abs(v[5])+Math.abs(v[9]);
    for(const k of [1,5,9])v[k]*=(top-bottom)/Math.max(.001,old);
    v[13]=(top+bottom)*.5;inst.setMatrixAt(j,a);});
   inst.instanceMatrix.needsUpdate=true;inst.computeBoundingSphere();
  }
 }
 function bounds(){return place?{...place}:null}
 function keepClear(x,z){
  if(address&&data?.roofRings?.some(r=>inside(x,z,r)))return false;
  if(!place)return true;const s=Math.sin(place.angle),c=Math.cos(place.angle),u=(x-place.x)*c-(z-place.z)*s,v=(x-place.x)*s+(z-place.z)*c;
  return u<-4.06||u>4.06||v<-2.52||v>4.60;
 }
 function updateFinish(){
  const selected=finishes[finish];
  cladding.color.setHex(selected.color);cladding.map=texture(selected.map);cladding.map.colorSpace='srgb';cladding.needsUpdate=true; $('study-finish-rate').value=String(userRates[finish]??selected.rate);
  chips().forEach(chip=>chip.setAttribute('aria-pressed',String(chip.dataset.finish===finish)));
 }
 function setLiveSite(info){
  address=true;data=info;place=null;ground();$('study-place').textContent='Try pavilion on this parcel';
  const previous=[...siteMasses.children];siteMasses.clear();for(const child of previous)child.geometry.dispose();
  const half=terrain.terrainSize/2;
  $('study-site-action').hidden=!info.parcelRings?.length;
  const roof=(info.roofRings||[]).filter(r=>r.length>=4&&r.length<=180).map(r=>clippedRing(r,half-.08)).filter(r=>r.length>=3&&area(r)>4).sort((a,b)=>area(b)-area(a)).slice(0,16);
  for(const ring of roof){
   const points=ring;
   if(points.length<3)continue;
   const shape=new T.Shape(points.map(([x,z])=>new T.Vector2(x,-z)));
   const make=(depth,m,y)=>{const geom=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:false,steps:1});geom.rotateX(-Math.PI/2);
    const mesh=new T.Mesh(geom,m);mesh.position.y=y;mesh.castShadow=mesh.receiveShadow=true;siteMasses.add(mesh);};
   const ground=Math.min(...ring.map(([x,z])=>terrain.getHeight(x,z)))-.035;
   const top=Math.max(...ring.map(([x,z])=>terrain.getHeight(x,z)))+2.7;
   make(top-ground,wall,ground);make(.14,roofMat,top);
  }
  $('study-context-label').textContent=roof.length?'Real parcel · existing roofs diagrammed':"Real parcel · no complete mapped roof in view";
  $('study-place').hidden=false;$('study-place').disabled=!info.parcelRings?.length;
  $('study-site-help').textContent=roof.length?'Existing roof outlines are from LINZ. Proposed garden stays editable. Existing wall height and form are illustrative.':'The live parcel and site ground are separate from any proposed house.';
  baseline=null;refresh();
 }
 function reset(){
  address=false;data=null;place={x:-6.4,z:-8.1,angle:.13};ground();
  for(const child of [...siteMasses.children])child.geometry.dispose();siteMasses.clear();
  $('study-context-label').textContent='Design study · timber pavilion';$('study-place').hidden=true;$('study-site-action').hidden=true;
  $('study-site-help').textContent='Public Assembl pavilion model. Not an existing home.';
  baseline=null;refresh();
 }
 const chips=()=>Array.from(document.querySelectorAll('[data-finish]'));
 const number=(id,min,max,fallback)=>{const n=parseFloat($(id).value);return Number.isFinite(n)?clamp(n,min,max):fallback};
 function value(includeHouse=true){
  return outcome(stats,finish,{qty:54,finishRate:userRates[finish],surfaceRate:number('study-surface-rate',0,999,22),plantFactor:number('study-plant-factor',0,5,1),labourRate:number('study-labour-rate',0,999,78),house:includeHouse&&!!place});
 }
 function refresh(next){
  if(next)stats=next;
  const current=value();if(!baseline)baseline=current;
  $('study-price').textContent=money(current.materials);
  $('study-days').textContent=(current.days<.05?'0':current.days.toFixed(1))+' days';
  $('study-price-diff').textContent=signed(current.materials-baseline.materials,money);
  $('study-days-diff').textContent=signed(current.days-baseline.days,n=>n.toFixed(1)+' days');
  $('study-with-labour').textContent=money(current.total)+' including labour allowance';
  $('study-compare').style.setProperty('--cost-share',Math.round(clamp(current.materials/(current.total||1),0,1)*100)+'%');
  $('study-allowance').textContent=money(current.labour)+' labour allowance · '+current.hours.toFixed(1)+' crew-hours';
  $('study-qty').textContent=Math.round(stats.landscapedArea||0)+' m² landscaped · '+(stats.totalPlants||0)+' plants'+(place?' · 54 m² cladding allowance':'');
  document.querySelectorAll('[data-finish]').forEach(button=>button.disabled=!place);
 }
 chips().forEach(button=>button.addEventListener('click',()=>{if(!place)return;finish=button.dataset.finish;updateFinish();refresh()}));
 $('study-finish-rate').addEventListener('input',()=>{userRates[finish]=number('study-finish-rate',0,999,finishes[finish].rate);refresh()});
 ['study-surface-rate','study-plant-factor','study-labour-rate'].forEach(id=>$(id).addEventListener('input',()=>refresh()));
 $('study-baseline').addEventListener('click',()=>{baseline=value();refresh()});
 $('study-site-action').addEventListener('click',()=>{if(!$('inspector-panel').classList.contains('hidden'))$('btn-inspector').click();if($('study-panel').hidden)$('study-toggle').click();$('study-place').focus()});
 $('study-place').addEventListener('click',()=>{
  if(place&&address){place=null;ground();$('study-place').textContent='Try pavilion on this parcel';$('study-site-help').textContent='Only LINZ source and existing roof form are now shown.';refresh();return;}
  const rings=data?.parcelRings||[];
  if(rings.length!==1){$('study-site-help').textContent='Automatic trial placement is not available for a parcel with multiple rings. No house was placed.';return;}
  const actual=rings[0];
  place=siting(actual.length>3?[actual]:[],data?.roofRings||[],terrain);
  if(!place){$('study-site-help').textContent='No clear fit found for this footprint in the measured view. The model was not placed.';return}
  ground();$('study-place').textContent='Remove proposed pavilion';
  $('study-site-help').textContent='Concept fit on this parcel, not a site, setback, service, access or consent check.';
  const {x,z}=place;setCamera(x+10,Math.max(7,base.position.y+6.5),z+13,x,base.position.y+.8,z);
  refresh();
 });
 $('study-toggle').addEventListener('click',()=>{
  const panel=$('study-panel'),state=panel.hidden;panel.hidden=!state;
  $('study-toggle').setAttribute('aria-expanded',String(state));
 });
 $('study-close').addEventListener('click',()=>{$('study-toggle').click();$('study-toggle').focus()});
 document.querySelectorAll('.yr-btn').forEach(b=>b.addEventListener('click',()=>document.querySelectorAll('.yr-btn').forEach(c=>c.setAttribute('aria-pressed',String(c===b)))));
 $('study-focus').addEventListener('click',()=>{const {x,z}=place||{x:0,z:0};setCamera(x+10,Math.max(7,base.position.y+6.5),z+13,x,base.position.y+.9,z)});
 terrain.onChange(ground);ground();updateFinish();refresh();
 return {refresh,setLiveSite,reset,base,bounds,keepClear,siteMasses,readEstimate:value};
}
