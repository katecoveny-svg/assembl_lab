// Narrow server-side access to the public LINZ layers. The credential never reaches a browser.
import { fetchAddress } from "../../api/_feeds/address.js";
import { toNZTM } from "../../roof-solar/linz/nztm.js";

const ARC = "https://services.arcgis.com/xdsHIIxuCWByZiCB/arcgis/rest/services/";
const TYPES = {
  parcel: ["50772", "LINZ_NZ_Primary_Parcels", "id,parcel_intent,calc_area"],
  buildings: ["101290", "LINZ_NZ_Building_Outlines", "building_id"],
};
function reply(body, status=200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}
async function read(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(5500), redirect:"error", headers: { Accept: "application/json" } });
  if (!r.ok) throw Error("LINZ unavailable");
  const j = await r.json();
  if (j.type !== "FeatureCollection" || !Array.isArray(j.features)) throw Error("Unexpected LINZ response");
  return j.features.filter(f => ["Polygon","MultiPolygon"].includes(f.geometry?.type));
}
function insideRing(x,y,ring) {
  let inside=false;
  for (let i=0,j=ring.length-1;i<ring.length;j=i++) {
    const [a,b]=ring[i], [c,d]=ring[j];
    if ((b>y)!==(d>y) && x<(c-a)*(y-b)/(d-b)+a) inside=!inside;
  }
  return inside;
}
function contains(e,n,g) {
  return (g.type==="Polygon" ? [g.coordinates] : g.coordinates).some(([outer,...holes]) =>
    insideRing(e,n,outer) && !holes.some(r=>insideRing(e,n,r)));
}
async function layer(kind, point, key) {
  const [id, name, fields]=TYPES[kind], {e,n}=point;
  const radius=kind==="parcel" ? .75 : 27;
  const bbox=[e-radius,n-radius,e+radius,n+radius].map(x=>x.toFixed(2));
  if (key) {
    try {
      const search = new URLSearchParams({service:"WFS",version:"2.0.0",request:"GetFeature",typeNames:"layer-"+id,
        outputFormat:"json",srsName:"EPSG:2193",bbox:bbox.join(",")+",EPSG:2193",count:"40"});
      const features=await read("https://data.linz.govt.nz/services;key="+encodeURIComponent(key)+"/wfs?"+search);
      // Guard the registration against a provider answering in a different CRS.
      if (features.every(f => {
        const c=f.geometry.type==="Polygon"?f.geometry.coordinates[0][0]:f.geometry.coordinates[0][0][0];
        return Math.abs(c[0]-e)<50000&&Math.abs(c[1]-n)<50000;
      }) && (kind!=="parcel"||features.some(f=>contains(e,n,f.geometry)))) return {features,via:"lds-wfs"};
    } catch { /* Never surface a keyed upstream URL, even on failure. */ }
  }
  const search = new URLSearchParams({ geometry:kind==="parcel"?[e,n].join(","):bbox.join(","),
    geometryType:kind==="parcel"?"esriGeometryPoint":"esriGeometryEnvelope",
    spatialRel:"esriSpatialRelIntersects",inSR:"2193",outSR:"2193",outFields:fields,returnGeometry:"true",f:"geojson"});
  return {features:await read(ARC+name+"/FeatureServer/0/query?"+search),via:"linz-public"};
}
const postcode = /^[1-9]\d{3}$/;
export async function onRequest({request,env}) {
  if (request.method!=="POST") return reply({error:"Use POST"},405);
  if (request.headers.has("origin") && request.headers.get("origin")!==new URL(request.url).origin) return reply({error:"Open Planting Studio to use this service."},403);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return reply({error:"Send JSON"},415);
  // Bound the body, including requests without Content-Length.
  let body;
  try {
    const reader=request.body.getReader(), chunks=[];
    let size=0;
    while (true) {
      const {done,value}=await reader.read(); if(done)break;
      size+=value.byteLength;
      if(size>1024) { await reader.cancel(); return reply({error:"Request is too long"},413); }
      chunks.push(value);
    }
    const decoder=new TextDecoder(); body=JSON.parse(chunks.map(x=>decoder.decode(x,{stream:true})).join("")+decoder.decode());
  } catch { return reply({error:"Address request could not be read."},400); }
  if (typeof body?.q==="string") {
    try {
      let q=body.q.trim();
      const parts=q.split(/[ ,]+/);
      if (parts.length>2&&postcode.test(parts.at(-1))) q=q.replace(/[, ]+\d{4}$/,"");
      if(q.length<4||q.length>120) return reply({error:"Type a street number and street name, then add the suburb or town."},400);
      const a=await fetchAddress({q});
      return reply({matches:a.values.matches,more:a.values.more});
    } catch(err) { return reply({error:"LINZ address search didn't return an answer. Check the street and suburb and try again."},502); }
  }
  const {lat,lon}=body||{};
  if(!Number.isFinite(lat)||!Number.isFinite(lon)||lat< -47.6||lat> -33.8||lon<166||lon>179.99) return reply({error:"Choose a New Zealand address within the available map coverage."},400);
  const point=toNZTM(lat,lon);
  const [p,b]=await Promise.allSettled([layer("parcel",point,env?.LINZ_API_KEY),layer("buildings",point,env?.LINZ_API_KEY)]);
  if(p.status!=="fulfilled") return reply({error:"LINZ parcel data didn’t load. Try again in a moment."},502);
  const parcel=p.value.features.filter(f=>contains(point.e,point.n,f.geometry)).sort((a,b)=>{
    const score=f=>/road|hydro/i.test(f.properties?.parcel_intent||"")?1:0;
    return score(a)-score(b)||(Number(a.properties?.calc_area)||Infinity)-(Number(b.properties?.calc_area)||Infinity);
  })[0];
  return reply({
    parcel:parcel?.geometry??null,
    buildings:b.status==="fulfilled"?b.value.features.slice(0,40).map(f=>f.geometry):null,
    via:{parcel:p.value.via,buildings:b.status==="fulfilled"?b.value.via:null},
    crs:"EPSG:2193"
  });
}
