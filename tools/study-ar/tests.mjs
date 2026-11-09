import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {routeFor,sceneViewerURL} from '../../study/ar/delivery.js';
test('Aoraki relief preserves geographic extent, metre scales, provenance and sampled elevation',()=>{
 const d=JSON.parse(fs.readFileSync('tools/study-ar/terrain/aoraki-dem.json'));const m=JSON.parse(fs.readFileSync('study/ar/manifest.json')).experiences.find(e=>e.id==='fly');
 assert.deepEqual(d.boundsWGS84,{west:170.03,east:170.25,south:-43.69,north:-43.53});
 assert.equal(d.elevationsMetres.length,d.gridSize**2);assert.ok(d.elevationsMetres.every(Number.isFinite));
 assert.ok(d.widthMetres>17700&&d.widthMetres<17730);assert.ok(d.depthMetres>17780&&d.depthMetres<17810);
 assert.equal(d.tableWidthMetres,.5);assert.equal(d.verticalExaggeration,1.5);
 assert.equal(Math.min(...d.elevationsMetres),d.elevationMinMetres);assert.equal(Math.max(...d.elevationsMetres),d.elevationMaxMetres);
 assert.ok(d.elevationMaxMetres>3600&&d.elevationMaxMetres<3724);assert.ok(d.elevationMinMetres>600&&d.elevationMinMetres<700);
 assert.equal(d.source.tiles.length,4);assert.equal(d.source.licence,'CC BY 4.0');assert.equal(m.status,'exported');assert.equal(m.physicalDeviceTested,false);
 const b=fs.readFileSync('.'+m.glb),j=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));const terrain=j.nodes.find(n=>n.name==='LINZ_Aoraki_bounded_elevation');assert.ok(terrain);
 const primitive=j.meshes[terrain.mesh].primitives[0],p=j.accessors[primitive.attributes.POSITION];assert.equal(p.count,129**2);assert.equal(j.accessors[primitive.indices].count,128*128*6);
 assert.ok(Math.abs((p.max[0]-p.min[0])-.5)<1e-6);assert.ok(Math.abs((p.max[1]-p.min[1])-(d.elevationMaxMetres-d.elevationMinMetres)*.5/d.widthMetres*1.5)<1e-6);
 for(const name of ['Feature_1','Feature_2','North','Distance_scale','Interpretation_scale_and_attribution'])assert.ok(j.nodes.some(n=>n.name===name),name);
 const source=fs.readFileSync('study/ar/fly-source.html','utf8');assert.ok(source.includes(d.source.copyright)&&source.includes(d.source.attribution));assert.match(source,/not a surveyed|not surveyed/);
 assert.ok(fs.statSync('.'+m.glb).size<1_500_000);assert.ok(fs.statSync('.'+m.usdz).size<4_000_000);
});
const e={status:'exported',title:'Test & learn',page:'/study/m/slushie.html',glb:'/study/ar/models/slushie.glb',usdz:'/study/ar/models/slushie.usdz'};
test('capabilities and unavailable exports',()=>{assert.equal(routeFor({...e,status:'needs-export-review'},{quickLook:true}),'unavailable');assert.equal(routeFor(e,{secure:false,quickLook:true}),'insecure');assert.equal(routeFor(e,{quickLook:true}),'quick-look');assert.equal(routeFor(e,{android:true}),'scene-viewer');assert.equal(routeFor(e,{}),'download')});
test('Android asset and lesson fallback correctly encoded',()=>{const u=sceneViewerURL(e,'https://study.assembl.co.nz');assert.match(u,/mode=ar_preferred/);assert.match(u,/S.browser_fallback_url=https%3A%2F%2Fstudy.assembl.co.nz%2Fstudy%2Fm%2Fslushie.html%3Far-fallback%3D1/)});
test('unique IDs and QR files; real binaries under 20MB',()=>{const m=JSON.parse(fs.readFileSync('study/ar/manifest.json'));assert.equal(new Set(m.experiences.map(e=>e.id)).size,m.experiences.length);for(const e of m.experiences){assert.ok(fs.existsSync('.'+e.qr));if(e.status==='exported')for(const k of ['glb','usdz']){const b=fs.readFileSync('.'+e[k]);assert.ok(b.length<20*1024*1024,`${e.id} ${k} size`);assert.equal(b.subarray(0,k==='glb'?4:2).toString(),k==='glb'?'glTF':'PK')}}});

test('exported bounds are finite teaching scales and variant decisions agree',()=>{const m=JSON.parse(fs.readFileSync('study/ar/manifest.json'));for(const e of m.experiences.filter(e=>e.status==='exported')){assert.equal(e.boundsMetres.length,3);for(const n of e.boundsMetres)assert.ok(Number.isFinite(n)&&n>0&&n<5,`${e.id}: invalid metre bounds ${n}`)}for(const [a,b] of [['gradient','gradient3'],['unseen','unseen3']])assert.equal(m.experiences.find(e=>e.id===a).status,m.experiences.find(e=>e.id===b).status);for(const e of m.experiences)assert.ok(e.coverageReason.length>40,e.id)});

test('selected spatial scenes retain a declared step, scale and interpretation',()=>{const s=JSON.parse(fs.readFileSync('tools/study-ar/selected-scenes.json'));const m=JSON.parse(fs.readFileSync('study/ar/manifest.json')).experiences;for(const [id,x] of Object.entries(s)){assert.ok(x.scale>0);assert.ok(x.labels.length>=3);assert.ok(x.note.length>100);assert.ok(fs.readFileSync('study/m/'+id+'.js','utf8').includes('k:"'+x.step+'"'),id+' step');assert.equal(m.find(e=>e.id===id).status,'exported');}const b=fs.readFileSync('study/ar/models/engine.glb');const j=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));const triangles=j.meshes.flatMap(m=>m.primitives).reduce((n,p)=>n+j.accessors[p.indices].count/3,0);assert.ok(triangles<100000&&triangles>50000);assert.ok(fs.statSync('study/ar/models/engine.usdz').size<11_000_000)});
