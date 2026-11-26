// These LINZ lines are names/centrelines, not route directions or legal access.
import {getJSON} from "./util.js";
import {arcQueryUrl} from "./site.js";
import {toNZTM} from "../../roof-solar/linz/nztm.js";
const ARC="https://services.arcgis.com/xdsHIIxuCWByZiCB/arcgis/rest/services";
export const ROAD_LAYER=123110;
const NEAR=180;

// Clip to the working site window in NZTM metres. Long national road records don't reach the browser.
function clippedPair(a,b,{e,n},radius){
  let lo=0,hi=1;
  const [x,y]=a,[dx,dy]=[b[0]-x,b[1]-y];
  for(const [p,q] of [[-dx,x-e+radius],[dx,e+radius-x],[-dy,y-n+radius],[dy,n+radius-y]]){
    if(p===0){if(q<0)return null;continue;}
    const t=q/p;
    if(p<0)lo=Math.max(lo,t);else hi=Math.min(hi,t);
    if(lo>=hi)return null;
  }
  return [lo,hi].map(t=>[x+t*dx,y+t*dy]);
}
export function clipRoads(geo,point,radius=NEAR){
  if(geo.error||!Array.isArray(geo.features))throw Error("Road data unavailable");
  const project=([lon,lat])=>{const q=toNZTM(lat,lon);return [q.e,q.n]};
  const roads=[];
  for(const f of geo.features){
    const g=f.geometry, name=f.properties?.full_road_name;
    if(typeof name!=="string"||!name.trim())continue;
    const paths=g?.type==="LineString"?[g.coordinates]:g?.type==="MultiLineString"?g.coordinates:[];
    const clipped=[];
    for(const path of paths){
      let previous=null, current=[];
      for(const coord of path){
        const mt=project(coord);
        if(previous){
          const line=clippedPair(previous,mt,point,radius);
          if(line){
            const [a,b]=line, last=current.at(-1);
            if(last&&Math.hypot(last[0]-a[0],last[1]-a[1])<.001)current.push(b);
            else{if(current.length>1)clipped.push(current);current=[a,b];}
          }else if(current.length>1){clipped.push(current);current=[];}
        }
        previous=mt;
      }
      if(current.length>1)clipped.push(current);
    }
    if(clipped.length)roads.push({name:name.trim().slice(0,140),geometry:{type:"MultiLineString",coordinates:clipped}});

  }
  const distance=road=>Math.min(...road.geometry.coordinates.flatMap(path=>path.slice(1).map((b,i)=>{
    const [x,y]=path[i],dx=b[0]-x,dy=b[1]-y,den=dx*dx+dy*dy;
    const t=den?Math.max(0,Math.min(1,((point.e-x)*dx+(point.n-y)*dy)/den)):0;
    return Math.hypot(x+t*dx-point.e,y+t*dy-point.n);
  })));
  return roads.map(r=>({...r,distanceM:Math.round(distance(r))})).sort((a,b)=>a.distanceM-b.distanceM).slice(0,50);
}
export async function readRoads(point){
  const query=arcQueryUrl(ARC,"LINZ_NZ_Addresses_Roads",{
    lat:point.lat,lon:point.lon,distance:260,geometry:true,outFields:"full_road_name"
  });
  const geo=await getJSON(query,{ms:6500});
  return {status:"available",lines:clipRoads(geo,point),layer:ROAD_LAYER,via:"linz-public"};
}
