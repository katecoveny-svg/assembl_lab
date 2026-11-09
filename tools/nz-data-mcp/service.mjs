import { createHash } from 'node:crypto';
import { quakeRecords, GEONET_URL } from '../../evidence/adapters/index.mjs';
import { toSourceContext } from '../../evidence/records.mjs';
export const CATALOGUE = 'https://catalogue.data.govt.nz/api/3/action/package_search';
export const MAX_BODY = 512 * 1024;
const scope = 'Discovery metadata only; underlying datasets, coverage and reuse rights are not verified. Never treat a search result as a connected feed.';
const text = (v, n=300) => typeof v === 'string' ? v.slice(0,n) : null;
const https = v => { try { const u=new URL(v); return u.protocol==='https:'&&!u.username&&!u.password ? u.href.slice(0,1000) : null; } catch {return null;} };
export async function readJson(url, {fetcher=fetch, timeoutMs=12000}={}) {
 const u=new URL(url);
 if (!(u.href===GEONET_URL || (u.origin===new URL(CATALOGUE).origin && u.pathname===new URL(CATALOGUE).pathname && !u.username && !u.password))) throw Error('source_not_allowed');
 const controller=new AbortController();
 let timer;
 const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('source_timeout'));},timeoutMs);});
 const work=async()=>{
  const r=await fetcher(u.href,{signal:controller.signal,redirect:'error',credentials:'omit',headers:{Accept:u.href===GEONET_URL?'application/vnd.geo+json;version=2':'application/json','User-Agent':'assembl-nz-data-review/0.1'}});
  if(!r.ok) {await r.body?.cancel();throw Error(r.status===429?'source_rate_limited':'source_unavailable');}
  if(!/json/i.test(r.headers.get('content-type')||'')) {await r.body?.cancel();throw Error('source_schema_changed');}
  if(Number(r.headers.get('content-length'))>MAX_BODY) {await r.body?.cancel();throw Error('source_too_large');}
  const chunks=[];let size=0;
  for await(const chunk of r.body){size+=chunk.length;if(size>MAX_BODY){controller.abort();throw Error('source_too_large');}chunks.push(chunk);}
  const body=Buffer.concat(chunks);
  return {payload:JSON.parse(body.toString('utf8')),sha256:createHash('sha256').update(body).digest('hex')};
 };
 try {return await Promise.race([work(),deadline]);} finally {clearTimeout(timer);}
}
export function parseCatalogue(p,retrievedAt) {
 if(p?.success!==true||!Number.isSafeInteger(p.result?.count)||p.result.count<0||!Array.isArray(p.result.results)||p.result.results.length>10)throw Error('source_schema_changed');
 return p.result.results.map(d=>{
  if(typeof d.id!=='string'||!/^[-a-zA-Z0-9_]{1,100}$/.test(d.id)||typeof d.title!=='string'||!d.title.trim())throw Error('source_schema_changed');
  return {id:d.id,title:text(d.title),sourceUrl:`https://catalogue.data.govt.nz/dataset/${d.id}`,kind:'catalogue discovery',observedAt:null,observationBasis:'No observation time supplied; metadataModified is catalogue metadata, not an observation date.',metadataModified:text(d.metadata_modified,60),retrievedAt,attribution:text(d.organization?.title)||'Publisher not supplied',licence:{name:text(d.license_title)||text(d.license_id)||'Not supplied',url:https(d.license_url),status:'publisher metadata; verify dataset terms before reuse'},scope};
 });
}
export function createService({fetcher=fetch,now=Date.now,timeoutMs=12000}={}) {
 const last=new Map();let active=false;
 return async function call(name,args={}) {
  if(!args||typeof args!=='object'||Array.isArray(args))throw Error('invalid_arguments');
  let url;
  if(name==='recent_earthquakes') {if(Object.keys(args).length)throw Error('invalid_arguments');url=GEONET_URL;}
  else if(name==='search_nz_catalogue') {
   if(Object.keys(args).some(k=>k!=='query'&&k!=='limit')||typeof args.query!=='string'||!args.query.trim()||args.query.length>120||/[\x00-\x1f\x7f]/.test(args.query)||!Number.isInteger(args.limit??5)||(args.limit??5)<1||(args.limit??5)>10)throw Error('invalid_arguments');
   const u=new URL(CATALOGUE);u.searchParams.set('q',args.query.trim());u.searchParams.set('rows',String(args.limit??5));url=u.href;
  } else throw Error('unknown_tool');
  const checkedAt=new Date(now()).toISOString();
  const failure=code=>({status:'unavailable',error:code,checkedAt,retrievedAt:null,freshness:'missing',records:[],sourceUrl:url});
  if(active)return failure('busy');
  if(now()-(last.get(name)??-Infinity)<60000)return failure('rate_limited');
  last.set(name,now());active=true;
  try {
   const {payload,sha256}=await readJson(url,{fetcher,timeoutMs});const retrievedAt=new Date(now()).toISOString();
   let records;
   if(name==='recent_earthquakes'){
    if(!Array.isArray(payload?.features)||payload.features.length>100||payload.features.some(f=>!['best','automatic','preliminary','deleted'].includes(f?.properties?.quality)||typeof f.properties.locality!=='string'||f.properties.locality.length>500||f.properties.publicID?.length>100))throw Error('source_schema_changed');
    records=quakeRecords(payload,retrievedAt).map(r=>toSourceContext(r,now()));
   }else {records=parseCatalogue(payload,retrievedAt);if(records.length>(args.limit??5))throw Error('source_schema_changed');}
   const result={status:'available',checkedAt,retrievedAt,expiresAt:new Date(Date.parse(retrievedAt)+300000).toISOString(),freshness:'recently retrieved',sourceUrl:url,sha256,records,scope:name==='recent_earthquakes'?'MMI >=3 feed; at most 20 recent events. Not complete, a forecast, an alert service or local hazard assessment. Model outputs remain simulated.':scope};
   if(Buffer.byteLength(JSON.stringify(result))>60000)throw Error('response_too_large');
   return result;
  }catch(e){return failure(['source_timeout','source_too_large','source_rate_limited','source_unavailable','response_too_large'].includes(e.message)?e.message:'source_invalid_or_unavailable');}
  finally {active=false;}
 };
}
