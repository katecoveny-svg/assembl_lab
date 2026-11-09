import {parseQuakes, FEED} from './geonet-parser.mjs';
import {validateRecord} from '../records.mjs';
export const SCHOOL_RESOURCE='4b292323-9fcc-41f8-814b-3c7b19cf14b3';
export const SCHOOL_URL=`https://catalogue.data.govt.nz/api/3/action/datastore_search?resource_id=${SCHOOL_RESOURCE}&limit=5&fields=School_Id,Org_Name,Org_Type,Regional_Council,Status`;
export const GEONET_URL=FEED;
export function quakeRecords(payload,retrievedAt) {
 const parsed=parseQuakes(payload);
 // The original map parser discards malformed rows. Evidence ingestion fails closed.
 if(payload.features.some(f=>parseQuakes({type:'FeatureCollection',features:[f]}).length!==1)) throw Error('GeoNet schema changed');
 return parsed.filter(q=>q.quality!=='deleted').map(q=>validateRecord({schemaVersion:1,id:`geonet:${q.id}`,classification:'live',
 source:{url:`https://www.geonet.org.nz/earthquake/${q.id}`,endpoint:FEED,attribution:'Earth Sciences New Zealand / GeoNet and sponsors NHC, LINZ, NEMA and MBIE',license:{name:'CC BY 3.0 NZ',url:'https://creativecommons.org/licenses/by/3.0/nz/'},policyUrl:'https://www.geonet.org.nz/policy'},
 observedAt:q.time,observationBasis:'Earthquake origin time; magnitude and depth may be revised',retrievedAt,scope:'NZ region; MMI ≥3 feed, at most 20 recent events; not a complete catalogue',units:'magnitude; depth km; WGS84 longitude/latitude degrees',maxAgeMs:300000,value:q}));
}
export function schoolRecords(payload,resource,pkg,retrievedAt) {
 if(!payload?.success || payload.result?.resource_id!==SCHOOL_RESOURCE || !Array.isArray(payload.result.records) || resource?.id!==SCHOOL_RESOURCE || pkg?.license_id!=='CC-BY-4.0' || !pkg.resources?.some(r=>r.id===SCHOOL_RESOURCE)) throw Error('School source or licence changed');
 return payload.result.records.map(s=>{
 if(!Number.isInteger(s.School_Id)||['Org_Name','Org_Type','Regional_Council','Status'].some(k=>typeof s[k]!=='string'||!s[k].trim()))throw Error('School schema changed');
 return validateRecord({schemaVersion:1,id:`school:${s.School_Id}`,classification:'published benchmark',source:{url:`https://catalogue.data.govt.nz/dataset/${pkg.id}`,endpoint:SCHOOL_URL,attribution:'New Zealand Ministry of Education, Education Counts',license:{name:'CC BY 4.0',url:'https://creativecommons.org/licenses/by/4.0/'}},
 observedAt:resource.last_modified ? `${resource.last_modified.replace(/Z$/,'')}Z` : null,observationBasis:'Resource last-modified timestamp, not a per-school observation date',retrievedAt,scope:'Five API-returned institutions; illustrative directory sample, not representative or complete; no enrolment eligibility inference',units:'institution directory attributes',maxAgeMs:86400000,value:{id:s.School_Id,name:s.Org_Name,type:s.Org_Type,region:s.Regional_Council,status:s.Status}});
 });
}
