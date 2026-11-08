// Reuses Lab's MVT reader. One bounded, sequential open-data download; no runtime tile service.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {decodeMVT,lon2x,lat2y} from './geo-tiles.mjs';
const area={west:174.668,east:174.905,south:-36.93,north:-36.762}, z=13;
const x0=lon2x(area.west,z),y0=lat2y(area.north,z), dx=lon2x(area.east,z)-x0,dy=lat2y(area.south,z)-y0;
const w=1200,h=Math.round(w*dy/dx),cache='tools/pointcloud/.map-cache';fs.mkdirSync(cache,{recursive:true});
function get(url){const p=cache+'/'+url.replace(/[^a-z0-9._-]/gi,'_');if(!fs.existsSync(p))fs.writeFileSync(p,execFileSync('curl',['-fsSL','--max-time','45','-A','assembl-lab-learning-map/1.0 (lab.assembl.co.nz)',url],{maxBuffer:8e6}));return fs.readFileSync(p);}
const info=JSON.parse(get('https://tiles.openfreemap.org/planet'));const groups={park:[],water:[],building:[],transportation:[]};let count=0;
for(let x=Math.floor(x0);x<=Math.floor(x0+dx);x++)for(let y=Math.floor(y0);y<=Math.floor(y0+dy);y++){
 const url=info.tiles[0].replace('{z}',z).replace('{x}',x).replace('{y}',y);const layers=decodeMVT(get(url),[...Object.keys(groups),'landcover','landuse']);count++;
 const greens=['grass','wood','forest','park','recreation_ground','village_green','cemetery'];
 for(const key of ['landcover','landuse']){const extra=layers[key];if(!extra)continue;if(!layers.park)layers.park={extent:extra.extent,features:[]};if(layers.park.extent!==extra.extent)throw Error('Unexpected tile extent');layers.park.features.push(...extra.features.filter(f=>greens.includes(f.props.class)));}
 for(const [name,items] of Object.entries(groups)){const l=layers[name];if(!l)continue;for(const f of l.features){if(name==='transportation'&&!['motorway','trunk','primary','secondary','tertiary','minor','rail'].includes(f.props.class))continue;if(name!=='transportation'&&f.type!==3)continue;
 const parts=f.parts.map(r=>r.map(([a,b])=>[(x+a/l.extent-x0)/dx*w,(y+b/l.extent-y0)/dy*h])).filter(r=>{
 const xs=r.map(p=>p[0]),ys=r.map(p=>p[1]);const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
 return maxX>=0&&minX<=w&&maxY>=0&&minY<=h&&(name!=='building'||(maxX-minX)*(maxY-minY)>1.5);
 });
 const d=parts.map(r=>r.filter((p,i)=>i===0||i===r.length-1||Math.hypot(p[0]-r[i-1][0],p[1]-r[i-1][1])>.5).map(([a,b],i)=>(i?'L':'M')+a.toFixed(1)+','+b.toFixed(1)).join('')+(f.type===3?'Z':'')).join('');if(!d)continue;
 items.push(`<path d="${d}"${name==='transportation'?` class="${['motorway','trunk','primary'].includes(f.props.class)?'major':'minor'}"`:''}/>`);
 }}
 console.log('tile',count);
}
const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}"><style>path{stroke-linejoin:round;stroke-linecap:round}#park{fill:#d5d5c5}#water{fill:#d5bacb}#building{fill:#a38e97;opacity:.55}#transportation{fill:none;stroke:#fffdfb;stroke-width:1}.major{stroke:#896572;stroke-width:2.2}</style><defs><clipPath id="bounds"><rect width="${w}" height="${h}"/></clipPath></defs><rect width="${w}" height="${h}" fill="#f1ebe1"/><g clip-path="url(#bounds)">${Object.entries(groups).map(([k,v])=>`<g id="${k}">${v.join('')}</g>`).join('')}</g><text x="12" y="${h-12}" font-size="11" font-family="sans-serif" fill="#33212f" stroke="#fffdfb" stroke-width="3" paint-order="stroke">© OpenStreetMap contributors · © OpenMapTiles · OpenFreeMap · ODbL 1.0</text></svg>`;
fs.writeFileSync('auckland/map.svg',svg);fs.writeFileSync('auckland/map-data.json',JSON.stringify({area,width:w,height:h,zoom:z,tiles:count,tileTemplate:info.tiles[0],built:new Date().toISOString(),licence:'ODbL 1.0',attribution:'OpenFreeMap © OpenMapTiles · © OpenStreetMap contributors',features:Object.fromEntries(Object.entries(groups).map(([k,v])=>[k,v.length]))},null,2));console.log(svg.length,'bytes');
