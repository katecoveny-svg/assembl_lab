// The CAD downloads on the house and wind tunnel machines: the files exist and are real (DXF in millimetres on the expected
// layers, with dimensions and A3 layouts; binary STLs with plenty of triangles; the 1:20 car is one closed solid), and the
// "Download the CAD files" cards link only to files that exist, with the sizes they show. Rebuild the files with
// tools/cad/house_cad.py and tools/cad/windtunnel_cad.py.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const root=new URL('../../',import.meta.url),path=p=>new URL(p,root),read=p=>fs.readFileSync(path(p),'utf8');
const HOUSE='assets/models/house/cad/',CAR='assets/models/windtunnel/cad/';

// a DXF file as (group code, value) pairs
const pairs=txt=>{const l=txt.split(/\r?\n/),out=[];for(let i=0;i+1<l.length;i+=2)out.push([+l[i].trim(),l[i+1].trim()]);return out};
const header=(P,name)=>{const i=P.findIndex(([c,v])=>c===9&&v===name);return i<0?null:P[i+1][1]};
const layers=P=>{const out=new Set();let inLayer=false;for(let i=0;i<P.length;i++){const [c,v]=P[i];
  if(c===0&&v==='TABLE'&&P[i+1]?.[0]===2)inLayer=P[i+1][1]==='LAYER';else if(c===0&&v==='ENDTAB')inLayer=false;
  else if(inLayer&&c===0&&v==='LAYER'){for(let j=i+1;j<P.length&&P[j][0]!==0;j++)if(P[j][0]===2){out.add(P[j][1]);break}}}return out};
const entityLayers=P=>{const n={};let inEnt=false;for(let i=0;i<P.length;i++){const [c,v]=P[i];if(c===2&&P[i-1]?.[1]==='SECTION')inEnt=v==='ENTITIES'||v==='BLOCKS';
  if(inEnt&&c===8)n[v]=(n[v]||0)+1}return n};
const count=(P,type)=>P.filter(([c,v])=>c===0&&v===type).length;

test('the house drawing set is a millimetre DXF on named layers, with dimensions and one A3 layout per sheet',()=>{
  const P=pairs(read(HOUSE+'house-drawings.dxf'));
  assert.equal(header(P,'$ACADVER'),'AC1024','DXF R2010');
  assert.equal(header(P,'$INSUNITS'),'4','$INSUNITS 4 = millimetres');
  const L=layers(P),E=entityLayers(P);
  for(const n of ['A-WALL','A-GLAZ','A-DOOR','A-ANNO-TEXT','A-ANNO-DIMS','C-TOPO','A-SECT'])assert.ok(L.has(n),'layer '+n);
  for(const n of ['A-WALL','A-GLAZ','A-DOOR','A-ANNO-TEXT','A-ANNO-DIMS','C-TOPO','A-SECT'])assert.ok((E[n]||0)>3,'something drawn on '+n+': '+(E[n]||0));
  assert.ok(count(P,'DIMENSION')>=40,'real dimension entities: '+count(P,'DIMENSION'));
  assert.ok(count(P,'HATCH')>=10,'poché and earth hatches');
  const txt=read(HOUSE+'house-drawings.dxf');
  for(const s of ['A001 Site plan','A101 Lower floor plan','A102 Upper floor plan','A201 Section A-A','A301 North elevation'])assert.ok(txt.includes(s),'layout '+s);
  for(const s of ['NOT FOR CONSTRUCTION','SCALE 1:100 @ A3','LIVING','BEDROOM 1','KITCHEN + DINING'])assert.ok(txt.includes(s),'text '+s);
  assert.ok(count(P,'VIEWPORT')>=5,'paper-space viewports');
  for(const f of ['house-A001-site-plan','house-A101-lower-floor-plan','house-A102-upper-floor-plan','house-A201-section-a-a','house-A301-north-elevation']){
    const Q=pairs(read(HOUSE+f+'.dxf'));assert.equal(header(Q,'$INSUNITS'),'4',f);assert.ok(count(Q,'DIMENSION')>=4,f+' has dimensions')}
});

test('the race car side elevation is a millimetre DXF with dimensions',()=>{
  const P=pairs(read(CAR+'race-car-side.dxf'));
  assert.equal(header(P,'$INSUNITS'),'4');assert.ok(count(P,'DIMENSION')>=5);
  const L=layers(P);for(const n of ['CAR-OUTL','CAR-WHEL','CAR-WING','A-ANNO-DIMS'])assert.ok(L.has(n),'layer '+n);
  assert.ok(read(CAR+'race-car-side.dxf').includes('SCALE 1:20 @ A3'));
});

const stl=p=>{const b=fs.readFileSync(path(p)),n=b.readUInt32LE(80);assert.equal(b.length,84+50*n,p+' is a binary STL');return {b,n}};
test('the STL files are binary meshes with plenty of triangles, and the house is in metres',()=>{
  const h=stl(HOUSE+'house.stl');assert.ok(h.n>1500,'house triangles '+h.n);
  let mx=-1e9,mn=1e9;for(let i=0;i<h.n;i++)for(let k=0;k<3;k++){const x=h.b.readFloatLE(84+i*50+12+k*12);mx=Math.max(mx,x);mn=Math.min(mn,x)}
  assert.ok(Math.abs(mx-mn-14.8)<.05,'house is 14.8 m across the eaves (metres): '+(mx-mn));
  const c=stl(CAR+'race-car-1to20.stl');assert.ok(c.n>20000,'car triangles '+c.n);
});

test('the 1:20 race car is one closed, watertight solid about 264 mm long',()=>{
  const {b,n}=stl(CAR+'race-car-1to20.stl'),ids=new Map(),edges=new Map();let x0=1e9,x1=-1e9;
  const vid=o=>{const k=b.readFloatLE(o)+','+b.readFloatLE(o+4)+','+b.readFloatLE(o+8);let v=ids.get(k);if(v===undefined){v=ids.size;ids.set(k,v)}return v};
  for(let i=0;i<n;i++){const o=84+i*50+12,v=[vid(o),vid(o+12),vid(o+24)];for(let k=0;k<3;k++){x0=Math.min(x0,b.readFloatLE(o+k*12));x1=Math.max(x1,b.readFloatLE(o+k*12))}
    for(let k=0;k<3;k++){const a=v[k],c=v[(k+1)%3],key=a<c?a*1e7+c:c*1e7+a;edges.set(key,(edges.get(key)||0)+1)}}
  let bad=0;for(const m of edges.values())if(m!==2)bad++;
  assert.equal(bad,0,'every edge is shared by exactly two triangles (non-manifold or open edges: '+bad+')');
  assert.ok(Math.abs(x1-x0-264.4)<2,'1:20 length in mm: '+(x1-x0));
});

test('the OBJ models carry their materials, the STEP is real, and the CADBuildr model renders through the kernel API',()=>{
  for(const [d,f] of [[HOUSE,'house'],[CAR,'race-car']]){const o=read(d+f+'.obj');assert.match(o,new RegExp('mtllib '+f+'\\.mtl'));assert.ok((o.match(/^o /gm)||[]).length>20,f+' named objects');
    assert.ok(fs.existsSync(path(d+f+'.mtl')))}
  if(fs.existsSync(path(HOUSE+'house.step'))){const s=read(HOUSE+'house.step');assert.ok(s.startsWith('ISO-10303-21;'));assert.ok((s.match(/MANIFOLD_SOLID_BREP/g)||[]).length>=50,'solids in the STEP')}
  const py=read(HOUSE+'house-cadbuildr.py');
  for(const s of ['show_dag','KernelApiClient','download_stl','rootNodeId','Extrusion'])assert.ok(py.includes(s),'CADBuildr model uses '+s);
});

// the cards: every href is an existing file, with the size the card shows; every CAD file is offered
const cards=[['study/m/house.js',HOUSE],['study/m/windtunnel.js',CAR]];
test('the "Download the CAD files" cards link only to files that exist, and show their real sizes',()=>{
  for(const [js,dir] of cards){const src=read(js);
    assert.ok(src.includes('Download the CAD files'),js+' has the card');assert.ok(src.includes(`const CAD_DIR="/${dir}"`),js+' points at '+dir);
    assert.match(src,/not for construction|not a design for manufacture/i,'honest label');
    const files=[...src.matchAll(/f:"([^"]+)",type:"[^"]+",size:(\d+)/g),...src.matchAll(/\["([A-Za-z0-9-]+\.dxf)","[^"]+",(\d+)\]/g)].map(m=>[m[1],+m[2]]);
    assert.ok(files.length>=4,js+' offers files');
    for(const [f,size] of files){assert.ok(fs.existsSync(path(dir+f)),js+' links to a missing file '+f);
      const real=fs.statSync(path(dir+f)).size;assert.ok(Math.abs(real-size)/real<.25,`${f}: the card says ${size} bytes, the file is ${real}`)}
    assert.ok(/download="\$\{x\.f\}"/.test(src),'links use the download attribute');
    const offered=new Set(files.map(f=>f[0]));
    for(const f of fs.readdirSync(path(dir)))if(!f.endsWith('.txt'))assert.ok(offered.has(f),js+' does not offer '+f);
    if(!fs.existsSync(path(dir+'house.step')))assert.ok(!src.includes('house.step'),'no STEP link without a STEP file')}
});
