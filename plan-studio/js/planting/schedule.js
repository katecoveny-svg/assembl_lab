// The schedule is derived from accepted metric records, never from brush
// presets, intended weights, loose geometry, or rendered seasonal instances.
import {PLANTS, SCHEMA, MAX_PLANTS, validPlacement} from "./model.js";
export function plantSchedule(data,f){
  if(!f?.calibrated||data?.schema!==SCHEMA||data.frame!==f.key||!Array.isArray(data.plants)||!Array.isArray(data.beds)||!Array.isArray(data.exclusions))return {total:0,rows:[]};
  const counts=new Map(), seen=new Set();
  for(const p of data.plants.slice(0,MAX_PLANTS)){
    if(seen.has(p?.id)||!validPlacement(p,data,f))continue;
    seen.add(p.id);counts.set(p.species,(counts.get(p.species)||0)+1);
  }
  const total=seen.size, rows=[...counts].sort(([a],[b])=>a.localeCompare(b)).map(([key,quantity])=>{
    const {label,botanical,layer,source}=PLANTS[key], tenths=Math.floor(quantity*1000/total);
    return {key,label,botanical,layer,source,quantity,tenths,remainder:(quantity*1000)%total};
  });
  const extras=1000-rows.reduce((sum,a)=>sum+a.tenths,0);
  if(rows.length)for(const r of [...rows].sort((a,b)=>b.remainder-a.remainder||a.key.localeCompare(b.key)).slice(0,extras))r.tenths++;
  return {total,rows:rows.map(({tenths,remainder,...r})=>({...r,percent:(tenths/10).toFixed(1)}))};
}
const quote=value=>'"'+String(value).replaceAll('"','""')+'"';
export function scheduleCsv(data,f){
  const {rows}=plantSchedule(data,f);
  const out=[["species_key","common_name","botanical_name","planting_layer","quantity","share_percent","species_reference"]];
  for(const r of rows)out.push([r.key,r.label,r.botanical,r.layer,r.quantity,r.percent,r.source]);
  return "\uFEFF"+out.map(row=>row.map(quote).join(",")).join("\r\n")+"\r\n";
}
