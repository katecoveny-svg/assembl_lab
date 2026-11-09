import {quakeRecords,GEONET_URL} from '../adapters/index.mjs';
import {freshness} from '../records.mjs';
export const MIN_INTERVAL=60000;
export async function fetchEarthquakes({fetcher=fetch,signal,now=Date.now}={}) {
 const response=await fetcher(GEONET_URL,{headers:{Accept:'application/vnd.geo+json;version=2'},cache:'no-store',signal:AbortSignal.any([signal||new AbortController().signal,AbortSignal.timeout(12000)])});
 if(!response.ok)throw Error('GeoNet unavailable');
 const payload=await response.json();
 if(!Array.isArray(payload?.features)||payload.features.length>100||payload.features.some(f=>!['best','preliminary','automatic','deleted'].includes(f?.properties?.quality)))throw Error('GeoNet schema changed');
 const retrievedAt=new Date(now()).toISOString();
 return {records:quakeRecords(payload,retrievedAt),retrievedAt};
}
export function liveStatus(state,now=Date.now()) {
 if(state.loading)return 'Checking GeoNet…';
 if(state.error)return state.retrievedAt?'Latest check unavailable · showing last successful response':'GeoNet unavailable · no replacement data';
 if(!state.retrievedAt)return 'Not requested';
 const stale=state.records.length?freshness(state.records[0],now)!=='recently retrieved':now-Date.parse(state.retrievedAt)>300000;
 return stale?'Stale · check GeoNet again':'Live source · recently checked';
}
export function createQuakeSession({load=fetchEarthquakes,now=Date.now,onChange=()=>{}}={}) {
 let state={records:[],retrievedAt:null,loading:false,error:false},controller,sequence=0,lastAttempt=-Infinity;
 const emit=()=>onChange({...state});
 return {
  get state(){return {...state};},
  async refresh(){
   if(state.loading||now()-lastAttempt<MIN_INTERVAL)return false;
   lastAttempt=now();const id=++sequence;controller=new AbortController();state={...state,loading:true,error:false};emit();
   try {const result=await load({signal:controller.signal,now});if(id!==sequence)return false;state={...result,loading:false,error:false};}
   catch {if(id!==sequence)return false;state={...state,loading:false,error:true};}
   emit();return true;
  },
  pause(){if(state.loading){sequence++;controller.abort();state={...state,loading:false,error:true};emit();}}
 };
}
