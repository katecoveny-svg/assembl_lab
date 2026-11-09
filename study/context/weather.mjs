/** Proposed ContextWeatherV1 consumer. No shared Weather endpoint is configured. */
export const CITIES=Object.freeze({auckland:'Auckland',wellington:'Wellington',christchurch:'Christchurch',dunedin:'Dunedin'});
export const LIVE_CONFIG=Object.freeze({enabled:false,endpoint:null,serverCapsVerified:false});
const time=x=>typeof x==='string'&&/(Z|[+-]\d\d:\d\d)$/.test(x)?Date.parse(x):NaN;
export function validateWeather(x,city,now=Date.now()){
 if(!CITIES[city]||x?.schema!=='ContextWeatherV1'||x.city!==city)throw Error('Unknown city or weather format.');
 if(!['current','forecast'].includes(x.kind)||!['synthetic','manual','google-weather'].includes(x.provider))throw Error('Missing data type or source.');
 if(typeof x.temperatureC!=='number'||!Number.isFinite(x.temperatureC)||x.temperatureC< -50||x.temperatureC>60)throw Error('Temperature must be between −50 and 60°C.');
 if(!Number.isFinite(time(x.validAt))||!Number.isFinite(time(x.receivedAt)))throw Error('A timestamp with timezone is required.');
 if(time(x.receivedAt)>now+300000||x.kind==='current'&&time(x.validAt)>now+300000)throw Error('Current conditions cannot be dated in the future.');
 if(x.provider==='google-weather'&&((x.issuedAt!=null&&(!Number.isFinite(time(x.issuedAt))||time(x.issuedAt)>now+300000))||!Array.isArray(x.attributions)||!x.attributions.length||x.attributions.some(a=>typeof a!=='string'||!a.trim()||a.length>500)))throw Error('Live attribution is required; any issue timestamp must be valid.');
 return Object.freeze({schema:x.schema,city,kind:x.kind,provider:x.provider,temperatureC:x.temperatureC,validAt:x.validAt,receivedAt:x.receivedAt,issuedAt:x.issuedAt||null,attributions:x.provider==='google-weather'?[...x.attributions]:[]});
}
export function freshness(record,now=Date.now()){
 const age=now-time(record.validAt);
 if(record.kind==='forecast')return age>0?'Past forecast — not current conditions':'Forecast — not an observation';
 return age>3600000||(record.issuedAt&&now-time(record.issuedAt)>3600000)?'Stale — more than 1 hour old':'Current-type value';
}
export function syntheticWeather(city,scenario='current',now=Date.now()){
 if(!CITIES[city])throw Error('Choose a listed city.');
 if(scenario==='unavailable')return {status:'unavailable',message:'Synthetic unavailable example. No weather value was returned.'};
 const offset={current:-600000,forecast:10800000,stale:-10800000}[scenario];if(offset===undefined)throw Error('Unknown fixture.');
 return validateWeather({schema:'ContextWeatherV1',city,kind:scenario==='forecast'?'forecast':'current',provider:'synthetic',temperatureC:{auckland:16,wellington:12,christchurch:9,dunedin:7}[city],validAt:new Date(now+offset).toISOString(),receivedAt:new Date(now).toISOString()},city,now);
}
export function manualWeather(city,value,kind,date,now=Date.now()){
 if(typeof value!=='string'||!value.trim()||!date||!Number.isFinite(Date.parse(date)))throw Error('Enter a temperature and a valid date/time.');
 return validateWeather({schema:'ContextWeatherV1',city,kind,provider:'manual',temperatureC:Number(value),validAt:new Date(date).toISOString(),receivedAt:new Date(now).toISOString()},city,now);
}
export function createWeatherAdapter(config=LIVE_CONFIG,{fetcher=globalThis.fetch,clock=Date.now}={}){
 let count=0,last=-Infinity,busy=false;
 const enabled=config.enabled===true&&config.serverCapsVerified===true&&config.endpoint==='/api/context/weather';
 return {enabled,async request(city){
  if(!enabled)return {status:'disabled',message:'Live weather is not connected. Use a labelled example or enter a value.'};
  if(!CITIES[city])return {status:'unavailable',message:'Choose a listed city.'};
  const now=clock();if(busy||count>=2||now-last<60000)return {status:'limited',message:'Request limit reached. Use manual entry; there is no automatic refresh.'};
  count++;last=now;busy=true;const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),8000);
  try{const response=await fetcher(config.endpoint+'?city='+city,{signal:controller.signal,credentials:'omit',cache:'no-store',headers:{Accept:'application/json'}});if(!response.ok)throw Error('Unavailable');const data=validateWeather(await response.json(),city,clock());if(data.provider!=='google-weather')throw Error('Unexpected source');return {status:'ready',data}}
  catch{return {status:'unavailable',message:'Weather is unavailable. Previous weather has been cleared; use manual entry or an example.'}}
  finally{clearTimeout(timeout);busy=false}
 }};
}
