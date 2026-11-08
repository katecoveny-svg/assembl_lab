// Offline mesh derived from the published LINZ sample asset and its exact OSM water mask.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {decodeMVT,lon2x,lat2y} from './geo-tiles.mjs';
import {fromNztm} from './terrain/nztm.ts';
const header=JSON.parse(fs.readFileSync('assets/models/auckland/linz-terrain.json')),area=header.area;
// Reuse the exact cached OSM release used by the atlas. No elevation threshold defines land.
const maskInfo=JSON.parse(fs.readFileSync('auckland/map-data.json')),waterTiles=new Map();
for(let tx=Math.floor(lon2x(area.west,13));tx<=Math.floor(lon2x(area.east,13));tx++)for(let ty=Math.floor(lat2y(area.north,13));ty<=Math.floor(lat2y(area.south,13));ty++){
 const url=maskInfo.tileTemplate.replace('{z}',13).replace('{x}',tx).replace('{y}',ty),file='tools/pointcloud/.map-cache/'+url.replace(/[^a-z0-9._-]/gi,'_');
 if(!fs.existsSync(file)){fs.mkdirSync('tools/pointcloud/.map-cache',{recursive:true});fs.writeFileSync(file,execFileSync('curl',['-fsSL','--max-time','45',url],{maxBuffer:8e6}));}
 const layer=decodeMVT(fs.readFileSync(file),['water']).water;
 waterTiles.set(tx+','+ty,{extent:layer?.extent||4096,features:(layer?.features||[]).filter(f=>f.type===3&&f.props.class!=='swimming_pool').map(f=>f.parts.map(r=>({r,minX:Math.min(...r.map(p=>p[0])),maxX:Math.max(...r.map(p=>p[0])),minY:Math.min(...r.map(p=>p[1])),maxY:Math.max(...r.map(p=>p[1]))})))});
}
function isWater(lon,lat){const xx=lon2x(lon,13),yy=lat2y(lat,13),tx=Math.floor(xx),ty=Math.floor(yy),t=waterTiles.get(tx+','+ty);if(!t)return false;const x=(xx-tx)*t.extent,y=(yy-ty)*t.extent;return t.features.some(rings=>{let inside=false;for(const {r,minX,maxX,minY,maxY}of rings){if(x<minX||x>maxX||y<minY||y>maxY)continue;for(let i=0,j=r.length-1;i<r.length;j=i++){const [a,b]=r[i],[c,d]=r[j];if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)inside=!inside;}}return inside;});}


const b=fs.readFileSync('assets/models/auckland/linz-terrain.bin'),pts=[],bins=new Map(),hb=header.nztmBounds,mpu=header.metresPerUnit;
const cx=(hb.minX+hb.maxX)/2,cy=(hb.minY+hb.maxY)/2;
for(let i=0;i<header.count;i++){const p=['x','y','z'].map((k,j)=>header.bounds[k][0]+(header.bounds[k][1]-header.bounds[k][0])*b.readUInt16LE(i*8+j*2)/65535);const q=[p[0]*mpu+cx,p[1]*mpu/5,cy-p[2]*mpu];pts.push(q);const key=Math.floor(q[0]/128)+','+Math.floor(q[2]/128);if(!bins.has(key))bins.set(key,[]);bins.get(key).push(q);}
function elevation(x,y){const ix=Math.floor(x/128),iy=Math.floor(y/128),near=[];for(let a=-1;a<=1;a++)for(let c=-1;c<=1;c++)for(const p of bins.get((ix+a)+','+(iy+c))||[]){const d=(p[0]-x)**2+(p[2]-y)**2;near.push([d,p[1]]);}near.sort((a,b)=>a[0]-b[0]);if(!near.length||near[0][0]>110**2)return null;let h=0,w=0;for(const [d,z]of near.slice(0,4)){const k=1/Math.max(1,d);h+=z*k;w+=k;}return h/w;}
const nx=192,nz=Math.round(nx*(hb.maxY-hb.minY)/(hb.maxX-hb.minX)),scale=.7/(hb.maxX-hb.minX),pos=[],uv=[],land=[],indices=[];
const merc=lat=>Math.log(Math.tan(Math.PI/4+lat*Math.PI/360));
for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){const x=hb.minX+i/nx*(hb.maxX-hb.minX),y=hb.maxY-j/nz*(hb.maxY-hb.minY),ll=fromNztm(x,y),z=elevation(x,y);const valid=z!==null&&ll.lon>=area.west&&ll.lon<=area.east&&ll.lat>=area.south&&ll.lat<=area.north&&!isWater(ll.lon,ll.lat);land.push(valid);pos.push((x-cx)*scale,.018+(z??0)*scale*5,(cy-y)*scale);uv.push((ll.lon-area.west)/(area.east-area.west),(merc(ll.lat)-merc(area.south))/(merc(area.north)-merc(area.south)));}
for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const a=j*(nx+1)+i,b=a+1,c=a+nx+1,d=c+1;for(const t of [[a,c,b],[b,c,d]])if(t.every(k=>land[k]))indices.push(...t);}
const manifest={name:'Tāmaki Makaurau — tabletop terrain',units:'metres',mapWidthMetres:.7,mapDepthMetres:(hb.maxY-hb.minY)*scale,horizontalScale:scale,scaleDenominator:1/scale,verticalExaggeration:5,meshGridMetres:(hb.maxX-hb.minX)/nx,triangles:indices.length/3,source:'../../assets/models/auckland/linz-terrain.json',dataDate:header.built,verticalDatum:header.verticalDatum,waterMask:header.waterMask,licences:['LINZ CC BY 4.0','OSM derived dataset ODbL 1.0'],limits:'Inverse-distance interpolation of up to four existing LINZ samples; omit cells >110m from data and triangles with water/nodata vertices. Coastline discretised to mesh grid. No buildings. Not navigation, hazard or survey data.'};
fs.writeFileSync('tools/pointcloud/tabletop/mesh.json',JSON.stringify({pos,uv,indices,manifest}));fs.writeFileSync('auckland/3d/manifest.json',JSON.stringify(manifest,null,2));console.log(manifest);
