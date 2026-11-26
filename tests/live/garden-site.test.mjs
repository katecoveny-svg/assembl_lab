import assert from "node:assert/strict";
import test from "node:test";
import {onRequest} from "../../functions/api/garden-site.js";
import {toNZTM} from "../../roof-solar/linz/nztm.js";

const location={lat:-36.85,lon:174.76}, {e,n}=toNZTM(location.lat,location.lon);
const fakeKey="key-for-unit-test";
function request(body, options={}) {
 const {host="https://preview.example",origin=host,method="POST",env={}}=options;
 return onRequest({request:new Request(host+"/api/garden-site",{method,headers:{origin,"Content-Type":"application/json"},body:method==="POST"?JSON.stringify(body):undefined}),env});
}
function feature(half,intent="Fee Simple",dx=0) {
 const ring=[[-half,-half],[half,-half],[half,half],[-half,half],[-half,-half]].map(([x,y])=>[e+x+dx,n+y]);
 return {type:"Feature",properties:{parcel_intent:intent,calc_area:4*half*half,unneeded:"not returned"},geometry:{type:"Polygon",coordinates:[ring]}};
}
const collection=features=>Response.json({type:"FeatureCollection",features});

test("invalid method, foreign origin, overlong body and non-numeric coordinates are rejected",async()=>{
 for(const [body,opts,status] of [[null,{method:"GET"},405],[location,{origin:"https://other.example"},403],[{q:"x".repeat(1024)},{},413],[{lat:"-36",lon:"175"},{},400]]){
  assert.equal((await request(body,opts)).status,status);
 }
});
test("fixed WFS layers use the server key and return only the containing parcel and building geometries",async t=>{
 let calls=[];
 t.mock.method(globalThis,"fetch",async (raw,options)=>{
  const url=new URL(raw);calls.push(url);
  assert.equal(url.hostname,"data.linz.govt.nz");
  assert(url.pathname.includes(fakeKey));assert.equal(options.redirect,"error");
  return collection(url.searchParams.get("typeNames")==="layer-50772"?[feature(1,"Road"),feature(2,"Fee Simple",200),feature(8)]:[feature(3)]);
 });
 const r=await request(location,{env:{LINZ_API_KEY:fakeKey}}),raw=await r.text(),j=JSON.parse(raw);
 assert.equal(r.headers.get("Cache-Control"),"no-store");
 assert.equal(calls.length,2);assert(!raw.includes(fakeKey));assert(!raw.includes("unneeded"));
 assert.deepEqual(j.parcel,feature(8).geometry);
 assert.deepEqual(j.via,{parcel:"lds-wfs",buildings:"lds-wfs"});
});
test("keyed upstream failure falls back; a missing parcel is not fabricated",async t=>{
 t.mock.method(globalThis,"fetch",async (raw)=>{
  if(new URL(raw).hostname==="data.linz.govt.nz") throw Error("internal text "+fakeKey);
  return collection([]);
 });
 const r=await request(location,{env:{LINZ_API_KEY:fakeKey}}),raw=await r.text(),j=JSON.parse(raw);
 assert.equal(r.status,200);assert(!raw.includes(fakeKey));assert.equal(j.parcel,null);
 assert.deepEqual(j.via,{parcel:"linz-public",buildings:"linz-public"});
});

test("property-only mode requests the exact dataset and does not expose title, owner or valuation fields",async t=>{
 const calls=[];
 t.mock.method(globalThis,"fetch",async raw=>{
  const u=new URL(raw); calls.push(u);
  assert.equal(u.searchParams.get("typeNames"),"layer-122657");
  assert.match(u.searchParams.get("cql_filter"),/^bbox\(geom,/);
  return collection([feature(30),feature(2,"Fee Simple",16)]);
 });
 const r=await request({...location,mode:"property"},{env:{LINZ_API_KEY:fakeKey}}),raw=await r.text(), j=JSON.parse(raw);
 assert.equal(calls.length,1);assert(!raw.includes(fakeKey));assert(!raw.includes("unneeded"));
 assert.deepEqual(j,{property:{status:"available",via:"lds-wfs",outlines:[feature(30).geometry],layer:122657},crs:"EPSG:2193"});
});
test("property-only lookup falls back to the same public LINZ layer, never to parcel geometry",async t=>{
 t.mock.method(globalThis,"fetch",async raw=>{
  const u=new URL(raw);
  assert.match(u.pathname,/LINZ_NZ_Property_Boundaries\/FeatureServer\/0\/query$/);
  assert.equal(u.searchParams.get("outFields"),"OBJECTID");
  return collection([]);
 });
 const r=await request({...location,mode:"property"});
 assert.deepEqual((await r.json()).property,{status:"available",via:"linz-public",outlines:[],layer:122657});
});
