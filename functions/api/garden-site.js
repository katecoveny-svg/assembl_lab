// Narrow server-side access to the public LINZ layers. The credential never reaches a browser.
import { getJSON } from "../../api/_feeds/util.js";
import { arcQueryUrl } from "../../api/_feeds/site.js";
import { readRoads, ROAD_LAYER } from "../../api/_feeds/linz-roads.js";
import { fetchAddress } from "../../api/_feeds/address.js";
import { toNZTM } from "../../roof-solar/linz/nztm.js";

const ARC = "https://services.arcgis.com/xdsHIIxuCWByZiCB/arcgis/rest/services";
const TYPES = {
  parcel: ["50772", "LINZ_NZ_Primary_Parcels", "id,parcel_intent,calc_area"],
  buildings: ["101290", "LINZ_NZ_Building_Outlines", "building_id"],
  property: ["122657", "LINZ_NZ_Property_Boundaries", "OBJECTID"],
};
function reply(body, status=200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}
async function read(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(5500), redirect:"error", headers: { Accept: "application/json" } });
  if (!r.ok) throw Error("http-"+r.status);
  let j;
  try { j=await r.json(); } catch { throw Error("not-json"); }
  if (j.type !== "FeatureCollection" || !Array.isArray(j.features)) throw Error("unexpected-shape");
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
async function layer(kind, point, key, context=false) {
  const [id, name, fields]=TYPES[kind], {e,n,lat,lon}=point;
  const atPoint=kind!=="buildings";
  const radius=atPoint ? .75 : context ? 135 : 27;
  if (key?.trim()) {
    try {
      // LDS WFS uses the layer’s native CRS axis order in CQL filters; request NZTM on output.
      const dy=radius/111320,dx=dy/Math.cos(lat*Math.PI/180);
      const extent=(kind==="buildings"?[n-radius,e-radius,n+radius,e+radius]:[lat-dy,lon-dx,lat+dy,lon+dx]).map(x=>x.toFixed(7)).join(",");
      const search = new URLSearchParams({service:"WFS",version:"2.0.0",request:"GetFeature",typeNames:"layer-"+id,
        outputFormat:"json",srsName:"EPSG:2193",cql_filter:"bbox("+(kind==="property"?"geom":"shape")+","+extent+")",count:"40"});
      const features=await read("https://data.linz.govt.nz/services;key="+encodeURIComponent(key.trim())+"/wfs?"+search);
      // Guard registration if provider order or CRS varies; do not trust a remote label alone.
      function convert(c){
        if(Math.abs(c[0]-e)<50000&&Math.abs(c[1]-n)<50000)return [c[0],c[1]];
        if(Math.abs(c[1]-e)<50000&&Math.abs(c[0]-n)<50000)return [c[1],c[0]];
        if(Math.abs(c[0]-lon)<.5&&Math.abs(c[1]-lat)<.5){const q=toNZTM(c[1],c[0]);return [q.e,q.n];}
        throw Error("unexpected-crs");
      }
      for(const f of features) {
        const g=f.geometry;
        const polygon=p=>p.map(r=>r.map(convert));
        g.coordinates=g.type==="Polygon"?polygon(g.coordinates):g.coordinates.map(polygon);
      }
      if(!atPoint||features.some(f=>contains(e,n,f.geometry))) return {features,via:"lds-wfs"};
      console.warn("LINZ garden WFS fallback",kind,"no-containing-feature");
    } catch(err) {
      // Property Boundaries also supports a small keyed point lookup. Send the secret only to LDS.
      if(kind==="property"){
        try {
          const q=new URLSearchParams({layer:id,x:lon,y:lat,radius:"2",max_results:"8",geometry:"true"});
          const response=await fetch("https://data.linz.govt.nz/services/query/v1/vector.json?"+q,{
            redirect:"error",signal:AbortSignal.timeout(4000),headers:{Authorization:"key "+key.trim(),Accept:"application/json"}
          });
          if(response.ok){
            const data=await response.json(), rows=data["vectorQuery"]?.layers?.[id]?.features??data[id]?.features??data.layers?.[id]?.features;
            if(Array.isArray(rows)){
              const features=projectFeatures(rows);
              if(features.some(f=>contains(e,n,f.geometry)))return {features,via:"lds-query"};
            }
          }
        } catch { /* public mirror remains available when query is not authorized */ }
      }
      // Log only fixed categories, never URLs, request text, coordinates, or the credential.
      const code=/^(http-\d{3}|not-json|unexpected-shape|unexpected-crs)$/.test(err?.message)?err.message:"request-failed";
      console.warn("LINZ garden WFS fallback",kind,code);
    }
  }
  // Use the same WGS84 ArcGIS request as the production Site feed, then register in NZTM.
  const geo=await getJSON(arcQueryUrl(ARC,name,{lat,lon,distance:kind==="buildings"?(context?150:38):undefined,outFields:fields,geometry:true}));
  if(!Array.isArray(geo.features)||geo.error) throw Error("Unexpected LINZ public response");
  return {features:projectFeatures(geo.features),via:"linz-public"};
}
function projectFeatures(features) {
  const ring=r=>r.map(([lng,la])=>{const q=toNZTM(la,lng);return [q.e,q.n]});
  return features.filter(f=>["Polygon","MultiPolygon"].includes(f.geometry?.type)).map(f=>{
    const {type,coordinates}=f.geometry;
    return {geometry:{type,coordinates:type==="Polygon"?coordinates.map(ring):coordinates.map(p=>p.map(ring))},properties:f.properties};
  });
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
  const point={lat,lon,...toNZTM(lat,lon)};
  const context=body.mode==="context", roadsOnly=body.mode==="roads";
  const useProperty=body.mode==="property"||body.includeProperty===true||context;
  const roads=context||roadsOnly?readRoads(point).catch(()=>({status:"unavailable",lines:[],layer:ROAD_LAYER,via:null})):null;
  const property=useProperty?layer("property",point,env?.LINZ_API_KEY).then(r=>({
    status:"available", via:r.via,
    outlines:r.features.filter(f=>contains(point.e,point.n,f.geometry)).slice(0,8).map(f=>f.geometry),
    layer:122657,
  })).catch(()=>({status:"unavailable",via:null,outlines:[],layer:122657})):null;
  if(roadsOnly) return reply({roads:await roads,crs:"EPSG:2193"});
  if(body.mode==="property") return reply({property:await property,crs:"EPSG:2193"});
  const [p,b]=await Promise.allSettled([layer("parcel",point,env?.LINZ_API_KEY),layer("buildings",point,env?.LINZ_API_KEY,context)]);
  if(p.status!=="fulfilled"&&!context) return reply({error:"LINZ parcel data didn’t load. Try again in a moment."},502);
  const parcel=(p.value?.features||[]).filter(f=>contains(point.e,point.n,f.geometry)).sort((a,b)=>{
    const score=f=>/road|hydro/i.test(f.properties?.parcel_intent||"")?1:0;
    return score(a)-score(b)||(Number(a.properties?.calc_area)||Infinity)-(Number(b.properties?.calc_area)||Infinity);
  })[0];
  return reply({
    parcel:parcel?.geometry??null,
    ...(useProperty?{property:await property}:{}),
    ...(context?{roads:await roads,parcelStatus:p.status==="fulfilled"?"available":"unavailable"}:{}),
    buildings:b.status==="fulfilled"?b.value.features.slice(0,context?100:40).map(f=>f.geometry):null,
    via:{parcel:p.value?.via??null,buildings:b.status==="fulfilled"?b.value.via:null},
    crs:"EPSG:2193"
  });
}
