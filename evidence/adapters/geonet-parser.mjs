export const FEED='https://api.geonet.org.nz/quake?MMI=3';
export const MAX_AGE=300000;
export function parseQuakes(payload){
 if(payload?.type!=='FeatureCollection'||!Array.isArray(payload.features))throw Error('Unexpected GeoNet response');
 return payload.features.flatMap(f=>{
  const p=f?.properties||{},c=f?.geometry?.coordinates;
  if(f?.geometry?.type!=='Point'||!Array.isArray(c)||c.length<2||!c.every(Number.isFinite)||Math.abs(c[0])>180||Math.abs(c[1])>90||!Number.isFinite(p.magnitude)||!Number.isFinite(p.depth)||!Number.isFinite(Date.parse(p.time))||!/^[a-zA-Z0-9_-]+$/.test(p.publicID||''))return [];
  return [{id:p.publicID,time:p.time,mag:p.magnitude,depth:p.depth,locality:String(p.locality||'Location not supplied'),lon:c[0],lat:c[1],quality:String(p.quality||'unspecified')}];
 }).sort((a,b)=>Date.parse(b.time)-Date.parse(a.time)).slice(0,20);
}
export function freshness(checked,now=Date.now()){return !checked?'not loaded':now-checked>MAX_AGE?'stale':'recently checked'}
export async function loadQuakes(fetcher=fetch){
 const response=await fetcher(FEED,{signal:AbortSignal.timeout(12000),cache:'no-store'});
 if(!response.ok)throw Error(`GeoNet returned ${response.status}`);
 return parseQuakes(await response.json());
}

export const VOLCANO_FEED='https://api.geonet.org.nz/volcano/val';
export function parseVolcanoes(payload){
 if(payload?.type!=='FeatureCollection'||!Array.isArray(payload.features))throw Error('Unexpected GeoNet response');
 return payload.features.flatMap(f=>{
  const p=f?.properties,c=f?.geometry?.coordinates;
  if(!p||f?.geometry?.type!=='Point'||!Array.isArray(c)||c.length<2||!Number.isFinite(c[0])||!Number.isFinite(c[1])||Math.abs(c[0])>180||Math.abs(c[1])>90||!Number.isInteger(p.level)||p.level<0||p.level>5||!/^[-a-zA-Z0-9_]+$/.test(p.volcanoID||'')||typeof p.volcanoTitle!=='string'||!p.volcanoTitle.trim()||typeof p.activity!=='string'||typeof p.hazards!=='string')return [];
  return [{id:p.volcanoID,title:p.volcanoTitle,level:p.level,activity:p.activity,hazards:p.hazards,aviation:typeof p.acc==='string'?p.acc:'Not supplied',lon:c[0],lat:c[1]}];
 }).sort((a,b)=>b.lat-a.lat);
}
export async function loadVolcanoes(fetcher=fetch){
 const response=await fetcher(VOLCANO_FEED,{signal:AbortSignal.timeout(12000),cache:'no-store'});
 if(!response.ok)throw Error(`GeoNet returned ${response.status}`);
 return parseVolcanoes(await response.json());
}
