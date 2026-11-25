import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {parseSitePoint,loadLinzContext} from '../js/linz-context.js';

const point=parseSitePoint('-36.84355, 174.75741');
const geometry={type:'Polygon',coordinates:[[[174.7,-36.8],[174.71,-36.8],[174.71,-36.81],[174.7,-36.8]]]};
const parcel={facts:{parcel:{status:'live',asOf:'2026-11-01',values:{outline:geometry}}}};
const building={values:{latestCapture:'2025-09-19',truncated:true,geojson:{features:[{type:'Feature',geometry}]}}};
const fake=(fixtures,seen=[])=>async (url)=>{
 assert.ok(url.startsWith('/api/live/?'));
 assert.ok(!url.includes('key'));
 const args=new URL(url,'https://local.test').searchParams;
 const id=args.get('feeds');seen.push(id);assert.equal(args.get('lat'),String(point.lat));assert.equal(args.get('lon'),String(point.lon));
 return fixtures[id] ? Response.json({feeds:{[id]:fixtures[id]}}) : new Response('unavailable',{status:502});
};
test('requires finite NZ latitude/longitude and rejects malformed input',()=>{
 for(const s of ['Auckland','0, 0','-37,180','-37, Infinity','-37.0, 174,1']) assert.throws(()=>parseSitePoint(s));
});
test('same-origin and keyless; retains both geometry sets and source dates',async()=>{
 const seen=[];const r=await loadLinzContext(point,{fetcher:fake({site:parcel,footprint:building},seen)});
 assert.equal(new Set(seen).size,2);assert.equal(r.parcels.features.length,1);assert.equal(r.buildings.features.length,1);
 assert.match(r.buildingStatus,/limit reached/);assert.equal(r.capturedThrough,'2025-09-19');assert.equal(r.parcelLayerDate,'2026-11-01');
});
test('partial failure does not present missing data as an empty live result',async()=>{
 const r=await loadLinzContext(point,{fetcher:fake({footprint:building})});
 assert.equal(r.parcelStatus,'Parcel unavailable');assert.equal(r.buildings.features.length,1);
});
test('a successful no-parcel result is not labelled a network failure',async()=>{
 const r=await loadLinzContext(point,{fetcher:fake({site:{facts:{parcel:{status:'live',values:{parcel:null}}}}})});
 assert.equal(r.parcelStatus,'No parcel at this point');assert.equal(r.buildingStatus,'Buildings unavailable');
});
test('real Cloudflare response compatibility',{skip:!process.env.LINZ_RESPONSE_DIR},async()=>{
 const src=process.env.LINZ_RESPONSE_DIR;
 const fixtures=Object.fromEntries(['site','footprint'].map(k=>[k,JSON.parse(readFileSync(src+'/'+k+'.json','utf8')).feeds[k]]));
 const r=await loadLinzContext(point,{fetcher:fake(fixtures)});
 assert.equal(r.parcels.features.length,1);assert.ok(r.buildings.features.length>0); console.log('Live response fixture:',r.parcelStatus,r.buildingStatus,'latest imagery',r.capturedThrough);
});

test('map paths preserve polygon holes and north-up local metres',async()=>{
 const {outlinePath}=await import('../js/linz-map.js');
 const ring=[[174.75,-36.84],[174.751,-36.84],[174.751,-36.841],[174.75,-36.84]];
 const outline=outlinePath({features:[{geometry:{type:'MultiPolygon',coordinates:[[ring,ring]]}}]},{lat:-36.84,lon:174.75});
 assert.equal(outline.split(' Z').length,3);
 assert.match(outline,/M0.00,0.00 L[\d.]+,0.00 L[\d.]+,111.32/);
});
