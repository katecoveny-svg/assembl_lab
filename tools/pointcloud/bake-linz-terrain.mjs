// Offline LINZ COG overview bake. Reuses Assembl site-terrain NZTM/sheet helpers.
// node --experimental-strip-types tools/pointcloud/bake-linz-terrain.mjs /absolute/path/to/geotiff/dist-module/geotiff.js
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {decodeMVT,lon2x,lat2y} from './geo-tiles.mjs';
import {toNztm,fromNztm} from './terrain/nztm.ts';
import {sheetsForBounds,sheetBounds} from './terrain/sheets.ts';
const {fromUrl}=await import(process.argv[2]);
const area={west:174.668,east:174.905,south:-36.93,north:-36.762};

// Reuse the exact cached OSM release used by the atlas. No elevation threshold defines land.
const maskInfo=JSON.parse(fs.readFileSync('auckland/map-data.json')),waterTiles=new Map();
for(let tx=Math.floor(lon2x(area.west,13));tx<=Math.floor(lon2x(area.east,13));tx++)for(let ty=Math.floor(lat2y(area.north,13));ty<=Math.floor(lat2y(area.south,13));ty++){
 const url=maskInfo.tileTemplate.replace('{z}',13).replace('{x}',tx).replace('{y}',ty),file='tools/pointcloud/.map-cache/'+url.replace(/[^a-z0-9._-]/gi,'_');
 if(!fs.existsSync(file)){fs.mkdirSync('tools/pointcloud/.map-cache',{recursive:true});fs.writeFileSync(file,execFileSync('curl',['-fsSL','--max-time','45',url],{maxBuffer:8e6}));}
 const layer=decodeMVT(fs.readFileSync(file),['water']).water;
 waterTiles.set(tx+','+ty,{extent:layer?.extent||4096,features:(layer?.features||[]).filter(f=>f.type===3&&f.props.class!=='swimming_pool').map(f=>f.parts.map(r=>({r,minX:Math.min(...r.map(p=>p[0])),maxX:Math.max(...r.map(p=>p[0])),minY:Math.min(...r.map(p=>p[1])),maxY:Math.max(...r.map(p=>p[1]))})))});
}
function isWater(lon,lat){const xx=lon2x(lon,13),yy=lat2y(lat,13),tx=Math.floor(xx),ty=Math.floor(yy),t=waterTiles.get(tx+','+ty);if(!t)return false;const x=(xx-tx)*t.extent,y=(yy-ty)*t.extent;return t.features.some(rings=>{let inside=false;for(const {r,minX,maxX,minY,maxY}of rings){if(x<minX||x>maxX||y<minY||y>maxY)continue;for(let i=0,j=r.length-1;i<r.length;j=i++){const [a,b]=r[i],[c,d]=r[j];if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)inside=!inside;}}return inside;});}

const corners=[toNztm(area.south,area.west),toNztm(area.north,area.east),toNztm(area.north,area.west),toNztm(area.south,area.east)];
const bounds={minX:Math.floor(Math.min(...corners.map(p=>p.x))/64)*64,maxX:Math.ceil(Math.max(...corners.map(p=>p.x))/64)*64,minY:Math.floor(Math.min(...corners.map(p=>p.y))/64)*64,maxY:Math.ceil(Math.max(...corners.map(p=>p.y))/64)*64};
const base='https://nz-elevation.s3.ap-southeast-2.amazonaws.com/new-zealand/new-zealand/dem_1m/2193';
const collection=await (await fetch(base+'/collection.json')).json();
const points=[],sources=[],S=2.1/Math.max(bounds.maxX-bounds.minX,bounds.maxY-bounds.minY),cx=(bounds.minX+bounds.maxX)/2,cy=(bounds.minY+bounds.maxY)/2;
const cone=toNztm(-36.787,174.86),detail=[cone.x-3000,cone.y-3000,cone.x+3000,cone.y+3000];
for(const job of [...sheetsForBounds(bounds).map(code=>({code,spacing:64})),{code:'BA32',spacing:16}]){
 const {code,spacing}=job;
 const sb=sheetBounds(code),b=spacing===16?detail:[Math.max(sb.minX,bounds.minX),Math.max(sb.minY,bounds.minY),Math.min(sb.maxX,bounds.maxX),Math.min(sb.maxY,bounds.maxY)];
 const item=await(await fetch(`${base}/${code}.json`)).json();
 const t=await fromUrl(`${base}/${code}.tiff`,{allowFullFile:false});const im=await t.getImage();
 const w=Math.ceil((b[2]-b[0])/spacing),h=Math.ceil((b[3]-b[1])/spacing);
 const z=await t.readRasters({bbox:b,width:w,height:h,interleave:true,resampleMethod:'nearest'});
 const nd=im.getGDALNoData();
 sources.push({code,url:`${base}/${code}.json`,properties:item.properties,checksum:item.assets.visual['file:checksum'],geoKeys:im.getGeoKeys(),surveys:[...new Set(item.links.filter(l=>l.rel==='derived_from').map(l=>l.href.split('/')[4]))]});
 for(let j=0;j<h;j++)for(let i=0;i<w;i++){
  let elevation=z[j*w+i];if(!Number.isFinite(elevation)||elevation===nd||elevation< -100)continue;
  const noise=k=>{const v=Math.sin(k*127.1+311.7)*43758.5453;return v-Math.floor(v);};
  let dx=(noise(i+j*w)-.5)*.9,dy=(noise(i+j*w+7919)-.5)*.9;
  const ni=i+(dx<0?-1:1),nj=j+(dy<0?-1:1),aa=z[j*w+ni],bb=z[nj*w+i],cc=z[nj*w+ni];
  if(ni<0||ni>=w||nj<0||nj>=h||[aa,bb,cc].some(v=>!Number.isFinite(v)||v===nd)){dx=0;dy=0;}else{const u=Math.abs(dx),v=Math.abs(dy);elevation=elevation*(1-u)*(1-v)+aa*u*(1-v)+bb*(1-u)*v+cc*u*v;}
  const x=b[0]+(i+.5+dx)*(b[2]-b[0])/w,y=b[3]-(j+.5+dy)*(b[3]-b[1])/h,ll=fromNztm(x,y);
  if(ll.lon<area.west||ll.lon>area.east||ll.lat<area.south||ll.lat>area.north)continue;
  if(spacing===64&&x>detail[0]&&x<detail[2]&&y>detail[1]&&y<detail[3])continue;
  if(isWater(ll.lon,ll.lat))continue;
  const e=z[j*w+Math.min(w-1,i+1)],s=z[Math.min(h-1,j+1)*w+i];
  const gx=e===nd?0:(e-elevation)/spacing*5,gy=s===nd?0:(s-elevation)/spacing*5;
  const lambert=Math.max(0,(-gx*.55+gy*.35+.65)/Math.hypot(gx,gy,1));
  const light=Math.min(.9,.12+.56*lambert+Math.max(0,elevation)/1100);
  points.push([(x-cx)*S,elevation*S*5,(cy-y)*S,light]);
 }
 console.log(code,w,h,points.length);
}
let seed=87;for(let i=points.length-1;i>0;i--){seed=(seed*16807)%2147483647;const j=seed%(i+1);[points[i],points[j]]=[points[j],points[i]];}
const axes=[0,1,2].map(k=>[points.reduce((a,p)=>Math.min(a,p[k]),Infinity),points.reduce((a,p)=>Math.max(a,p[k]),-Infinity)]);
const data=Buffer.alloc(points.length*8);points.forEach((p,i)=>{for(let k=0;k<3;k++)data.writeUInt16LE(Math.round((p[k]-axes[k][0])/(axes[k][1]-axes[k][0])*65535),i*8+k*2);data[i*8+6]=Math.round(p[3]*255);data[i*8+7]=0;});
const anchors={};for(const [id,lat,lon]of [['citycentre',-36.8485,174.7633],['rangitoto',-36.787,174.86],['maungawhau',-36.877,174.764]]){const q=toNztm(lat,lon),x=(q.x-cx)*S,z=(cy-q.y)*S;let best=points[0],d=Infinity;for(const p of points){let dd=(p[0]-x)**2+(p[2]-z)**2;if(dd<d){d=dd;best=p;}}anchors[id]=best.slice(0,3);}
const header={waterMask:{source:maskInfo.tileTemplate,licence:maskInfo.licence,attribution:maskInfo.attribution,method:'OSM polygon even-odd containment; mapped water omitted regardless of elevation; low land preserved'},verticalDatum:'NZVD2016 (EPSG:7839), per LINZ national DEM documentation',datasetDocumentation:'https://data.linz.govt.nz/layer/121859-new-zealand-lidar-1m-dem/',format:'assembl-points/1',count:points.length,stride:8,bounds:Object.fromEntries(['x','y','z'].map((k,i)=>[k,axes[i]])),area,nztmBounds:bounds,metresPerUnit:1/S,verticalExaggeration:5,spacingMetres:64,coneSpacingMetres:16,coneBoundsNZTM:detail,anchors,sites:{},sources,built:new Date().toISOString(),licence:collection.license,provider:collection.providers,collection:base+'/collection.json',limitations:'Bare-earth DEM, overview sampled at approximately 64 m, bilinearly interpolated within cells for irregular point spacing. Not raw LiDAR points. Missing data omitted, not filled with sea level. No buildings/tower/bridge. Heights visually exaggerated 5x. Acquisition varies by contributing survey; see sheet metadata.'};
fs.writeFileSync('assets/models/auckland/linz-terrain.bin',data);fs.writeFileSync('assets/models/auckland/linz-terrain.json',JSON.stringify(header,null,2));console.log('Wrote',points.length,data.length,sources.map(s=>s.geoKeys));
