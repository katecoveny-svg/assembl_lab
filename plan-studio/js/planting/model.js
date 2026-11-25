// Subject: proposed planting only. These are local design metres, not survey
// coordinates or a certified planting schedule. x east in the plan, -z north.
import { footprint, openingSpan, isDoor, wallFacing } from "../model.js";
import { stampSweep } from "./sweep.js";
export const SCHEMA="assembl.planting.v1", MAX_PLANTS=420, MAX_BEDS=8, MAX_EXCLUSIONS=12, MAX_VERTICES=80;
export const PLANTS={
  harakeke:{label:"Harakeke · flax",spacing:1.05,clear:.27},
  toetoe:{label:"Toetoe",spacing:1.25,clear:.32},
  "ti-kouka":{label:"Tī kōuka · cabbage tree",spacing:2.8,clear:.45}
};
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const norm=x=>Math.round(x*1000)/1000;
const asPoint=p=>({x:typeof p.x==="number"?p.x:p[0],z:typeof p.z==="number"?p.z:p[1]});
const mmPoint=([x,y])=>[norm(x/1000),norm(-y/1000)];
const finite=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite);
const rect=(x0,z0,x1,z1)=>[[x0,z0],[x1,z0],[x1,z1],[x0,z1]];
function hash(s) {
  let h=0x811c9dc5;
  for(const ch of s)h=Math.imul(h^ch.charCodeAt(0),16777619);
  return h>>>0;
}
const ratio=(s)=>hash(s)/0xffffffff;
function wallGuard(w){
  const a=mmPoint(w.a),b=mmPoint(w.b),dx=b[0]-a[0],dz=b[1]-a[1],L=Math.hypot(dx,dz);
  if(!L)return [];
  const ext=(w.t||120)/2000,ex=dx/L*ext,ez=dz/L*ext;
  return [[a[0]-ex-ez,a[1]-ez+ex],[b[0]+ex-ez,b[1]+ez+ex],[b[0]+ex+ez,b[1]+ez-ex],[a[0]-ex+ez,a[1]-ez-ex]];
}
export function frame(P){
  if(!P?.walls?.length)return null;
  const b=footprint(P), box=[b.x0/1000,-b.y1/1000,b.x1/1000,-b.y0/1000];
  if(!box.every(Number.isFinite))return null;
  const demo=P.meta?.status?.includes("fictional"), scale=P.provenance?.scale_check;
  const calibrated=Boolean(demo||scale?.status==="user-calibrated");
  const {site={}}=P,y=norm(-(site.floorAboveGround||0)/1000-.002);
  const hard=[rect(box[0]-.2,box[1]-.2,box[2]+.2,box[3]+.2), ...P.walls.map(wallGuard).filter(p=>p.length)];
  const addPolys=polys=>{for(const d of (polys||[])){if(Array.isArray(d.poly)&&d.poly.length>2&&d.poly.every(finite))hard.push(d.poly.map(mmPoint));}};
  addPolys(P.decks);addPolys(P.site?.paths);addPolys(P.site?.hardscape);
  // Present Studio's own illustrative paved entry, never claim it came from surveying.
  const entry=P.openings?.find(o=>/entry/i.test(o.note||""))||P.openings?.find(isDoor);
  const sp=entry&&openingSpan(P,entry);
  if(sp){
    const f=wallFacing(P,sp.w).out,c=mmPoint([sp.mid[0]+f[0]*6500,sp.mid[1]+f[1]*6500]);
    const ax=f[0]?6:8,az=f[0]?8:6;hard.push(rect(c[0]-ax,c[1]-az,c[0]+ax,c[1]+az));
  }
  const measured=demo?"sample":scale?.status;
  // Exact local frame, excluding room names, doors or presentation finishes.
  const key=hash(JSON.stringify([P.meta?.number,P.origin||[0,0],P.walls.map(w=>[w.id,w.a,w.b,w.t]),measured,y])).toString(16);
  return {key,box,hard,calibrated,y,basis:demo?"Known-size fictional sample":"PDF calibrated to a written dimension",
    bounds:rect(box[0]-32,box[1]-32,box[2]+32,box[3]+32)};
}
export const empty=f=>({schema:SCHEMA,frame:f?.key,beds:[],exclusions:[],plants:[]});
const orient=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const crosses=(a,b,c,d)=>orient(a,b,c)*orient(a,b,d)<0&&orient(c,d,a)*orient(c,d,b)<0;
function area(poly) {
  return Math.abs(poly.reduce((sum,p,i)=>{const q=poly[(i+1)%poly.length];return sum+p[0]*q[1]-p[1]*q[0];},0))/2;
}
function inside(p,poly){
  let b=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const [ax,az]=poly[i],[bx,bz]=poly[j];
    if(((az>p[1])!==(bz>p[1]))&&p[0]<(bx-ax)*(p[1]-az)/(bz-az)+ax)b=!b;
  }return b;
}
function segDist(p,a,b) {
  const dx=b[0]-a[0],dz=b[1]-a[1],L=dx*dx+dz*dz;
  const f=L?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/L)):0;
  return Math.hypot(p[0]-a[0]-dx*f,p[1]-a[1]-dz*f);
}
const edgeDistance=(p,poly)=>Math.min(...poly.map((a,i)=>segDist(p,a,poly[(i+1)%poly.length])));
export function ring(input,f){
  if(!Array.isArray(input)||input.length<3||input.length>MAX_VERTICES||!input.every(finite))throw Error("Draw a boundary with 3 to "+MAX_VERTICES+" corners.");
  const q=input.map(p=>p.map(norm)),[a,,c]=f.bounds;
  if(q.some(([x,z])=>x<a[0]||x>c[0]||z<a[1]||z>c[1]))throw Error("Keep the planting or path boundary within 32 m of the model.");
  if(q.some((p,i)=>q.slice(0,i).some(a=>Math.hypot(a[0]-p[0],a[1]-p[1])<.1)))throw Error("Choose distinct boundary corners.");
  if(area(q)<.22)throw Error("Draw a larger area.");
  for(let i=0;i<q.length;i++)for(let j=i+2;j<q.length;j++){
    if(i===0&&j===q.length-1)continue;
    if(crosses(q[i],q[(i+1)%q.length],q[j],q[(j+1)%q.length]))throw Error("Boundary edges cannot cross.");
  }
  return q;
}
export function allowed(data,f,p,species){
  const m=PLANTS[species];if(!m||!finite(p))return false;
  return data.beds.some(b=>inside(p,b)&&edgeDistance(p,b)>=m.clear)
    && ![...f.hard,...data.exclusions].some(b=>inside(p,b)||edgeDistance(p,b)<m.clear);
}
export function setArea(data,f,which,input){
  const mode=which==="exclude"?"exclusions":"beds";
  if(data[mode].length>=(mode==="beds"?MAX_BEDS:MAX_EXCLUSIONS))throw Error("This plan already has the maximum number of areas.");
  const poly=ring(input,f), next={...data,[mode]:[...data[mode],poly]};
  next.plants=data.plants.filter(p=>allowed(next,f,[p.x,p.z],p.species));return next;
}
const grid=.35;
const cell=(i,j)=>{
  const id=i+":"+j;
  return {id,x:norm((i+.19+(ratio(id+"x")-.5)*.28)*grid),z:norm((j+.63+(ratio(id+"z")-.5)*.28)*grid)};
};
export function paint(data,f,track,{species="harakeke",radius=1,erase=false}={}){
  if(!f?.calibrated||!data.beds.length||!own(PLANTS,species)||!track.length) return data;
  radius=Math.max(.35,Math.min(3,Number(radius)||1));
  const path=track.map(asPoint).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.z)).slice(0,640);
  const candidates=new Map(), step=.12, samplePadding=.063, r2=(radius+samplePadding)**2;
  const pairs=path.map(p=>[p.x,p.z]);
  const within=p=>pairs.some((a,i)=>i?segDist(p,pairs[i-1],a)<=radius:Math.hypot(p[0]-a[0],p[1]-a[1])<=radius);
  let previous=null;
  for(const p of path){
    if(previous && Math.hypot(previous.x-p.x,previous.z-p.z)>75){previous=p;continue;}
    stampSweep(previous,p, v=>v, v=>{
      if(!erase){
        for(let i=Math.floor((v.x-radius-samplePadding)/grid);i<=(v.x+radius+samplePadding)/grid+1;i++)for(let j=Math.floor((v.z-radius-samplePadding)/grid);j<=(v.z+radius+samplePadding)/grid+1;j++){
          const c=cell(i,j);if(!candidates.has(c.id)&&(c.x-v.x)**2+(c.z-v.z)**2<=r2)candidates.set(c.id,c);
        }
      }
      return true;
    },step);
    previous=p;
  }
  if(erase){const kept=data.plants.filter(p=>!within([p.x,p.z]));return kept.length<data.plants.length?{...data,plants:kept}:data;}
  const out=data.plants.slice(), occupied=new Set(out.map(p=>p.id));
  const sorted=[...candidates.values()].sort((a,b)=>hash(a.id)-hash(b.id)||a.id.localeCompare(b.id));
  for(const c of sorted){
    if(out.length>=MAX_PLANTS)break;
    if(occupied.has(c.id)||!within([c.x,c.z])||!allowed(data,f,[c.x,c.z],species))continue;
    if(out.some(p=>Math.hypot(p.x-c.x,p.z-c.z)<Math.max(PLANTS[p.species].spacing,PLANTS[species].spacing)*.82))continue;
    out.push({...c,species,angle:norm(ratio(c.id+"angle")*Math.PI*2),scale:norm(.82+ratio(c.id+"scale")*.38)});occupied.add(c.id);
  }
  return out.length===data.plants.length?data:{...data,plants:out};
}
export function importPlanting(data,f){
  if(!f?.calibrated||data?.schema!==SCHEMA||data.frame!==f.key)throw Error("This planting layer does not match the active calibrated plan.");
  const countOK=(rows,n)=>Array.isArray(rows)&&rows.length<=n;
  if(!countOK(data.beds,MAX_BEDS)||!countOK(data.exclusions,MAX_EXCLUSIONS)||!countOK(data.plants,MAX_PLANTS))throw Error("Planting file exceeds its supported limits.");
  const safe={...empty(f),beds:data.beds.map(p=>ring(p,f)),exclusions:data.exclusions.map(p=>ring(p,f))}, ids=new Set();
  for(const p of data.plants){
    if(!p||typeof p.id!=="string"||!/^[-\d]+:[-\d]+$/.test(p.id)||ids.has(p.id)||!own(PLANTS,p.species)||!allowed(safe,f,[p.x,p.z],p.species))throw Error("A plant in this file is outside an allowed bed or has an invalid identity.");
    const [i,j]=p.id.split(":").map(Number),expected=cell(i,j);
    if(p.x!==expected.x||p.z!==expected.z||p.angle!==norm(ratio(p.id+"angle")*Math.PI*2)||p.scale!==norm(.82+ratio(p.id+"scale")*.38))throw Error("A plant in this file is not on the expected placement grid.");
    if(safe.plants.some(a=>Math.hypot(a.x-p.x,a.z-p.z)<Math.max(PLANTS[a.species].spacing,PLANTS[p.species].spacing)*.82))throw Error("Plants in this file violate the placement spacing.");
    ids.add(p.id);safe.plants.push({id:p.id,x:p.x,z:p.z,species:p.species,angle:p.angle,scale:p.scale});
  }
  return safe;
}
