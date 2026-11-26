// Drop a Plan’s deployed entry owns the renderer and imports its own Three constructors. This
// additive bridge reads the existing site-pick event and registered ground; it never edits the model.
import * as THREE from 'three/webgpu';
import {clearLinzScene,drawLinzScene,readSiteContext,siteContextStatus,type SiteContext} from './linzSiteContext';
import {gridConvergence} from '../twin/linz/nztm.js';

const $ = (sel:string) => document.querySelector(sel);
const safe=(p:any)=>Number.isFinite(p?.lat)&&Number.isFinite(p?.lon)&&p.lat < -33&&p.lat > -48&&p.lon>165&&p.lon<180;
type LocationPoint={lat:number;lon:number};
let root:THREE.Group|null=null, scene:any, data:SiteContext|null=null, chosen:LocationPoint|null=null, lastGround:any=null;
let loaded:LocationPoint|null=null, read:AbortController|null=null;
let box:HTMLElement|null=null, note:HTMLElement|null=null, sw:HTMLInputElement|null=null, above:HTMLButtonElement|null=null;
let activeRegisteredGround:any=null;
let monitor:number|undefined, unavailable=false;

function addUI(){
  if(box?.isConnected)return;
  const facts=$('#siteFacts'); if(!facts)return;
  box=document.createElement('section');box.id='linz-site-context';box.style.cssText='border-top:1px solid var(--line);padding-top:12px;margin-top:10px';
  box.innerHTML='<h3>Map layers on this site</h3><label class="small"><input id="linz-context-visible" type="checkbox" checked> Show LINZ site context</label> <button class="pill" type="button" id="linz-context-view" disabled>View site from above</button><p class="small" id="linz-context-status" role="status">Pick a New Zealand address in Site facts to see the parcel, existing roofs and named roads.</p><p class="small" aria-label="Map layer colours"><span style="color:#9d6329">Amber · roof and parcel</span> <span style="color:#a44e65">Rose · property boundary</span> <span style="color:#28657d">Blue · named road centreline</span></p><p class="small">Sources: <a href="https://data.linz.govt.nz/layer/50772-nz-primary-parcels/" target="_blank" rel="noopener noreferrer">Primary Parcels</a> · <a href="https://data.linz.govt.nz/layer/101290-nz-building-outlines/" target="_blank" rel="noopener noreferrer">Building Outlines</a> · <a href="https://data.linz.govt.nz/layer/123110-nz-addresses-roads/" target="_blank" rel="noopener noreferrer">Named Roads</a> · <a href="https://data.linz.govt.nz/layer/122657-nz-property-boundaries/" target="_blank" rel="noopener noreferrer">Property Boundaries</a></p>';
  const factsOut=facts.querySelector('#sfOut');
  if(factsOut)factsOut.before(box);else facts.append(box);
  note=box.querySelector('#linz-context-status');sw=box.querySelector('#linz-context-visible');
  for(const selector of ['#sgNote','#mgNote']){
    const privacy=$(selector);
    if(privacy?.textContent?.includes('server is not asked'))privacy.textContent='This browser reads LINZ elevation files directly. Only the coordinates go to the Lab site lookup for the parcel, roofs and roads. Your model file is not sent.';
  }
  sw?.addEventListener('change',()=>{if(root)root.visible=!!sw?.checked;});
  above=box.querySelector('#linz-context-view');
  above?.addEventListener('click',()=>{
    const app=(window as any).__twin, g=activeRegisteredGround;
    if(!g||!app?.camera||!app.controls?.target)return;
    if(sw&&!sw.checked){sw.checked=true;if(root)root.visible=true;}
    const {cx,cz,size}=g.square, y=g.yAt(cx,cz);
    if(!Number.isFinite(y))return;
    const narrow=innerWidth<680, r=size*(narrow?.82:.66);
    app.camera.position.set(cx+r*.35,y+r,cz+r*.41);app.controls.target.set(cx,y,cz);app.controls.update();
    if(narrow)(document.querySelector('#c') as HTMLElement)?.scrollIntoView({block:'nearest'});
  });
}
function update(){
  if(!note||!chosen)return;
  if(!loaded){
    const own=!!$('#siteGround [hidden] #sgWhere');
    note.textContent=own?'This sample carries its own survey. The site overlay will not replace it or assume that it matches this address. Use your own plan or a model that can be placed at that address.':read?'Reading LINZ map layers for the chosen site…':'Registering the ground first. The map layers only appear when the model is placed on this address.';
    return;
  }
  const tail=data&&!lastGround?' Waiting for ground registered to this address before drawing these layers in 3D.':'';
  const why=unavailable||!data?' Saved plans with their own survey are not automatically realigned.':'';
  note.textContent=siteContextStatus(data)+tail+why;
}
function same(a:LocationPoint|null,b:LocationPoint|null){return !!a&&!!b&&Math.abs(a.lat-b.lat)<.000005&&Math.abs(a.lon-b.lon)<.000005;}
function change(p:LocationPoint){
  if(!safe(p)||same(chosen,p))return;
  chosen=p;loaded=null;data=null;unavailable=false;lastGround=null; if(root)clearLinzScene(root);
  read?.abort();read=null;update();
}
function lookup(p:LocationPoint){
  const ac=new AbortController();read=ac;update();
  readSiteContext(p.lat,p.lon,ac.signal).then(r=>{
    if(ac.signal.aborted)return;
    loaded=p;data=r;unavailable=!r;sync();update();
  }).catch(()=>{if(!ac.signal.aborted){loaded=p;unavailable=true;update();}});
}
function planGround(raw:any){
  const T=raw?.applied?.terrain,s=raw?.store;
  if(!T?.heights||!s?.point||!s?.placement)return null;
  const [cx,cz]=T.centre, P=s.placement, {lat,lon}=s.point;
  const yStep=T.size/(T.n-1);
  const th=P.turnDeg*Math.PI/180, gam=gridConvergence(lat,lon)*Math.PI/180;
  const nX=Math.sin(th), nZ=-Math.cos(th),eX=Math.cos(th),eZ=Math.sin(th);
  const A0={e:s.point.e+P.east,n:s.point.n+P.north};
  return {
    point:{lat,lng:lon}, square:{cx,cz,size:T.size}, store:s, applied:raw.applied,
    toScene:(e:number,n:number):[number,number]=>{
      const de=(e-A0.e)*Math.cos(gam)+(n-A0.n)*Math.sin(gam),dn=-(e-A0.e)*Math.sin(gam)+(n-A0.n)*Math.cos(gam);
      return [cx+de*eX+dn*nX,cz+de*eZ+dn*nZ];
    },
    yAt:(x:number,z:number)=>{
      const cx0=(x-cx+T.size/2)/yStep,cz0=(z-cz+T.size/2)/yStep,i=Math.floor(cx0),j=Math.floor(cz0);
      if(i<0||j<0||i>=T.n-1||j>=T.n-1)return NaN;
      const fx=cx0-i,fz=cz0-j,k=j*T.n+i,H=T.heights;
      return H[k]*(1-fx)*(1-fz)+H[k+1]*fx*(1-fz)+H[k+T.n]*(1-fx)*fz+H[k+T.n+1]*fx*fz;
    },
  };
}
function sync(){
  addUI();
  const w=window as any, app=w.__twin;
  if(!app?.scene||!w.__twin?.built||!box)return;
  if(scene!==app.scene){
    if(root){clearLinzScene(root);scene?.remove(root);}
    scene=app.scene;root=new THREE.Group();root.name='linz_map_layers_50772_101290_123110';root.visible=!!sw?.checked;scene.add(root);lastGround=null;
  }
  const m=w.__site?.ground?.(), raw=m??w.__ground;
  const g=m??planGround(raw), point=g?.point?{lat:g.point.lat,lon:g.point.lng}:null;
  if(point&&!chosen)change(point);
  if(!point||!same(point,chosen)||!g||!root){
    activeRegisteredGround=null;if(above)above.disabled=true;
    if(lastGround&&root){clearLinzScene(root);lastGround=null;update();}
    return;
  }
  activeRegisteredGround=g;if(above)above.disabled=!data;
  if(!read&&!loaded&&chosen)lookup(chosen);
  if(data&&raw!==lastGround){
    lastGround=raw;
    try{drawLinzScene(root,data,g.toScene,g.yAt,g.square,!g.applied?.features?.length);update();}
    catch{clearLinzScene(root);if(note)note.textContent=siteContextStatus(data)+' Unable to draw the overlay in this viewer.';}
  }
}
addEventListener('assembl:site-facts',(ev:any)=>{
  const p={lat:ev.detail?.lat,lon:ev.detail?.lon};if(!safe(p))return;
  change(p);
  // The current plan viewer auto-follows the first site. For another address after ground
  // has loaded, use its own re-read control (no changes to placement logic or to IFC/GLB).
  const held=(window as any).__ground?.store?.point;
  if(held&&!same(held,p)){
    const input=$('#sgWhere') as HTMLInputElement|null,go=$('#sgGo') as HTMLButtonElement|null;
    if(input&&go&&!go.disabled&&!go.closest('[hidden]')){input.value=`${p.lat}, ${p.lon}`;go.click();}
  }
},false);
function start(){
  if(monitor==null)monitor=window.setInterval(()=>{if(!document.hidden)sync();},400);
  sync();
}
addEventListener('pagehide',()=>{if(monitor!=null){clearInterval(monitor);monitor=undefined;}read?.abort();read=null;});
addEventListener('pageshow',start);
start();
