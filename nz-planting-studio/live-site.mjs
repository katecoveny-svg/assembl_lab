import { toNZTM } from '/roof-solar/linz/nztm.js';
import { readLayer, unpackHeights, heightAt } from '/roof-solar/linz/ground.js';

const byId=id=>document.getElementById(id);
const form=byId('garden-address-form'), input=byId('garden-address'), results=byId('garden-address-results'),
  status=byId('garden-address-status'), map=byId('garden-parcel-map'), note=byId('garden-site-note');
let active;
const sampleNote=note.textContent;
const fresh=()=>{
  active?.abort();
  active=new AbortController();
  return active;
};
async function request(body,signal) {
  const res=await fetch('/api/garden-site',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal,cache:'no-store'});
  const j=await res.json();
  if(!res.ok) throw Error(j.error||'Site data did not load. Try again.');
  return j;
}
const rings=g=>!g?[]:g.type==='Polygon'?g.coordinates:g.type==='MultiPolygon'?g.coordinates.flat():[];
// Clip at the extent of the terrain without scaling the underlying NZTM coordinates.
function clip(a,b,h) {
  let lo=0,hi=1;
  for(const [p,q] of [[a[0]-b[0],a[0]+h],[b[0]-a[0],h-a[0]],[a[1]-b[1],a[1]+h],[b[1]-a[1],h-a[1]]]){
    if(!p){if(q<0)return null;continue;}
    const t=q/p;
    if(p<0)lo=Math.max(lo,t);else hi=Math.min(hi,t);
    if(lo>hi)return null;
  }
  return [lo,hi].map(t=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);
}
function drawMap(projected,windowSize) {
  map.replaceChildren();
  const extent=projected.reduce((max,ring)=>ring.reduce((m,[x,z])=>Math.max(m,Math.abs(x),Math.abs(z)),max),windowSize/2);
  const h=extent*1.1;
  map.setAttribute('viewBox',`${-h} ${-h} ${h*2} ${h*2}`);
  const make=(tag,attrs)=>{
    const e=document.createElementNS('http://www.w3.org/2000/svg',tag);
    for(const [k,v] of Object.entries(attrs)) e.setAttribute(k,v);
    map.appendChild(e);
  };
  make('path',{d:projected.map(r=>'M'+r.map(p=>p.join(' ')).join('L')+'Z').join(' '),fill:'#e3d0d2','fill-rule':'evenodd',stroke:'#654a4e','vector-effect':'non-scaling-stroke'});
  make('rect',{x:-windowSize/2,y:-windowSize/2,width:windowSize,height:windowSize,fill:'none',stroke:'#36594b','stroke-dasharray':'4 2','vector-effect':'non-scaling-stroke'});
  map.toggleAttribute('hidden',!projected.length);
}
async function load(r) {
  const {signal}=fresh();
  const studio=window.__nzStudio;
  if(!studio){status.textContent='The 3D garden is still starting. Try again in a moment.';return;}
  results.replaceChildren();
  status.textContent='Loading LINZ parcel and ground…';
  const center=toNZTM(r.lat,r.lon), size=studio.terrainEngine.terrainSize, half=size/2;
  const li=readLayer('ground',{lat:r.lat,lon:r.lon,radius:Math.ceil(half)+4,signal:AbortSignal.any([signal,AbortSignal.timeout(12000)])}).catch(()=>null);
  try {
    const [site,dem]=await Promise.all([request({lat:r.lat,lon:r.lon},signal),li]);
    if(signal.aborted)return;
    const local=rs=>rs.map(ring=>ring.map(([e,n])=>[e-center.e,center.n-n]));
    const parcel=local(rings(site.parcel)), buildings=local((site.buildings||[]).flatMap(rings));
    const grid=dem?.values?.heights?unpackHeights(dem.values.heights):null;
    const origin=grid ? heightAt(grid,center.e,center.n) : NaN;
    const height=(x,z)=>heightAt(grid,center.e+x,center.n-z)-origin;
    const heights=grid&&Number.isFinite(origin)?studio.terrainEngine.heights.map((_,i)=>{
      const d=studio.terrainEngine.gridDim;
      return height((i%d)*size/(d-1)-half,Math.floor(i/d)*size/(d-1)-half);
    }):null;
    const terrain=!!heights&&heights.every(Number.isFinite);
    const edges=rs=>rs.flatMap(ring=>ring.slice(1).map((b,i)=>clip(ring[i],b,half)).filter(Boolean));
    studio.setLiveSite({address:r.address,lat:r.lat,lon:r.lon,heights:terrain?heights:null,parcel:edges(parcel),buildings:edges(buildings)});
    drawMap(parcel,size);
    const ground=terrain?'LINZ 1 m LiDAR ground':'Flat preview · LINZ LiDAR not available for this view';
    const boundary=parcel.length?'LINZ parcel':'No LINZ parcel at the address point';
    const attribution=byId('garden-elevation-credit');attribution.hidden=!terrain;
    attribution.textContent=terrain?dem.licence.attribution:'';
    status.textContent=r.address;
    note.textContent=`${boundary} · ${ground}. ${site.buildings===null?'Building outlines unavailable. ':'Dashed grey lines show mapped roof footprints, not building heights. '}The 3D view covers ${size} m around the address point. Not a boundary survey.`;
  } catch(e) {
    if(!signal.aborted) status.textContent=e.message||'Site data did not load.';
  }
}
form.addEventListener('submit',async e=>{
  e.preventDefault();const q=input.value.trim(),{signal}=fresh();
  results.replaceChildren();status.textContent='Searching LINZ addresses…';
  try{
    const {matches,more}=await request({q},signal);if(signal.aborted)return;
    for(const m of matches){
      const b=document.createElement('button');
      b.type='button';b.className='garden-address-match';b.textContent=m.address;
      b.addEventListener('click',()=>load(m));results.appendChild(b);
    }
    status.textContent=matches.length?(more?'Choose a match or add the suburb to narrow the list.':'Choose your address.'):'No match. Try the street number, full street name and suburb.';
  }catch(e){if(!signal.aborted) status.textContent=e.message||'Address search unavailable.';}
});
input.addEventListener('input',()=>{active?.abort();results.replaceChildren();status.textContent='';});
window.addEventListener('garden-site-reset',()=>{
  active?.abort();
  map.setAttribute('hidden','');byId('garden-elevation-credit').hidden=true;results.replaceChildren();status.textContent='';note.textContent=sampleNote;
});
const opener=byId('garden-open-site'), tune=byId('btn-inspector'), inspector=byId('inspector-panel');
opener.addEventListener('click',()=>{
  if(inspector.classList.contains('hidden')) tune.click();
  inspector.scrollTop=0;
  input.focus({preventScroll:true});
});
new MutationObserver(()=>opener.setAttribute('aria-expanded',String(!inspector.classList.contains('hidden'))))
  .observe(inspector,{attributes:true,attributeFilter:['class']});
