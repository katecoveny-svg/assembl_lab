import {validateRecord} from './records.mjs';
export async function loadSnapshot(fetcher=fetch) {
 const response=await fetcher(new URL('./data/snapshot.json',import.meta.url),{cache:'no-store',signal:AbortSignal.timeout(12000)});
 if(!response.ok) throw Error('Evidence unavailable');
 const data=await response.json();
 if(data?.schemaVersion!==1||!Array.isArray(data.records))throw Error('Invalid snapshot');
 return data.records.map(r=>{
  validateRecord(r);
  const v=r.value;
  if(r.id.startsWith('geonet:')) {
   if(!v||!Number.isFinite(v.mag)||!Number.isFinite(v.depth)||typeof v.locality!=='string'||typeof v.quality!=='string'||v.quality==='deleted')throw Error('Invalid quake');
  } else if(r.id.startsWith('school:')) {
   if(!v||['name','type','region','status'].some(k=>typeof v[k]!=='string'))throw Error('Invalid school');
  } else throw Error('Unsupported explorer record');
  return r;
 });
}
