import test from 'node:test';import assert from 'node:assert/strict';
import {CITIES,LIVE_CONFIG,createWeatherAdapter,syntheticWeather,manualWeather,validateWeather,freshness} from '../context/weather.mjs';
const now=Date.parse('2026-11-09T00:00:00Z');
test('live integration is disabled and never fetches, even after repeated clicks',async()=>{
 let calls=0;const adapter=createWeatherAdapter(LIVE_CONFIG,{fetcher:()=>{calls++;throw Error('Unexpected request')}});
 assert.equal(adapter.enabled,false);for(let i=0;i<10;i++)assert.equal((await adapter.request('auckland')).status,'disabled');assert.equal(calls,0);
});
test('only fixed public cities, explicit source/type and timezone timestamps are accepted',()=>{
 assert.equal(Object.keys(CITIES).length,4);const x=syntheticWeather('auckland','current',now);assert.equal(x.provider,'synthetic');assert.equal(x.kind,'current');
 for(const patch of [{city:'my-home'},{temperatureC:NaN},{temperatureC:90},{validAt:'2026-11-09T12:00'},{kind:'observation'},{provider:'unknown'},{validAt:new Date(now+600000).toISOString()}])assert.throws(()=>validateWeather({...x,...patch},'auckland',now));
 assert.throws(()=>validateWeather(x,'wellington',now));
 const live=validateWeather({...x,provider:'google-weather',issuedAt:null,attributions:['Synthetic protocol attribution']},'auckland',now);assert.equal(live.issuedAt,null);
 const safe=validateWeather({...x,latitude:0,studentName:'synthetic input'},'auckland',now);assert.equal(safe.latitude,undefined);assert.equal(safe.studentName,undefined);
});
test('synthetic current, forecast, stale and unavailable cases cannot masquerade as live',()=>{
 const current=syntheticWeather('wellington','current',now),forecast=syntheticWeather('wellington','forecast',now),old=syntheticWeather('wellington','stale',now);
 assert.equal(freshness(current,now),'Current-type value');assert.match(freshness(forecast,now),/^Forecast/);assert.match(freshness(forecast,now+14400000),/^Past forecast/);assert.match(freshness(old,now),/^Stale/);
 assert.deepEqual(syntheticWeather('wellington','unavailable',now),{status:'unavailable',message:'Synthetic unavailable example. No weather value was returned.'});
 assert.throws(()=>syntheticWeather('precise-address','current',now));
});
test('manual entry validates units, time and source, including zero degrees and past forecasts',()=>{
 const x=manualWeather('dunedin','0','current','2026-11-08T23:45:00Z',now);assert.equal(x.temperatureC,0);assert.equal(x.provider,'manual');assert.equal(x.issuedAt,null);
 assert.throws(()=>manualWeather('dunedin','','current','2026-11-08T23:45:00Z',now));assert.throws(()=>manualWeather('dunedin','  ','current','2026-11-08T23:45:00Z',now));
 assert.throws(()=>manualWeather('dunedin','12','current','bad',now));assert.throws(()=>manualWeather('dunedin','12','current','2026-11-10T00:00:00Z',now));
 assert.match(freshness(manualWeather('dunedin','12','forecast','2026-11-08T23:00:00Z',now),now),/^Past forecast/);
});
test('proposed shared adapter has explicit opt-in, same-origin path, cooldown, per-page cap and no retries',async()=>{
 let t=now,calls=0;const requests=[];
 // Synthetic protocol response only: no Google request or downloaded Google content.
 const fetcher=async(url,options)=>{calls++;requests.push({url,options});return {ok:true,json:async()=>({...syntheticWeather('auckland','current',t),provider:'google-weather',issuedAt:new Date(t).toISOString(),attributions:['Synthetic protocol test; not Google content.']})}};
 const config={enabled:true,endpoint:'/api/context/weather',serverCapsVerified:true};
 assert.equal(createWeatherAdapter({...config,serverCapsVerified:false}).enabled,false);assert.equal(createWeatherAdapter({...config,endpoint:'https://other.example/weather'}).enabled,false);
 const a=createWeatherAdapter(config,{fetcher,clock:()=>t});assert.equal((await a.request('unknown')).status,'unavailable');assert.equal(calls,0);
 assert.equal((await a.request('auckland')).status,'ready');assert.equal((await a.request('auckland')).status,'limited');t+=60000;assert.equal((await a.request('auckland')).status,'ready');t+=60000;assert.equal((await a.request('auckland')).status,'limited');assert.equal(calls,2);
 assert.equal(requests[0].url,'/api/context/weather?city=auckland');assert.equal(requests[0].options.cache,'no-store');assert.equal(requests[0].options.credentials,'omit');
});
test('failed or unattributed live responses become unavailable without retry or stale value reuse',async()=>{
 const config={enabled:true,endpoint:'/api/context/weather',serverCapsVerified:true};let calls=0;
 const a=createWeatherAdapter(config,{clock:()=>now,fetcher:async()=>{calls++;return {ok:true,json:async()=>({...syntheticWeather('auckland','current',now),provider:'google-weather'})}}});
 const result=await a.request('auckland');assert.equal(result.status,'unavailable');assert.equal(result.data,undefined);assert.equal(calls,1);
});
