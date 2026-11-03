// The house design machine: the Blender model has every node the scene drives, the drawings and the model share one set of
// numbers, the sun is in the right part of the sky for New Zealand, and the honest parts (practice questions, not buildable,
// kupu copied from other machines) are there.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const root=new URL('../../',import.meta.url),read=p=>fs.readFileSync(new URL(p,root),'utf8');
const glb=fs.readFileSync(new URL('assets/models/house/house.glb',root));
const json=JSON.parse(glb.subarray(20,20+glb.readUInt32LE(12)).toString('utf8'));
const names=new Set(json.nodes.map(n=>n.name));
const src=read('study/m/house.js'),scene=read('study/m/house-scene.js'),py=read('assets/models/house/build_house.py');
const pick=name=>{const i=src.indexOf(`const ${name}=`);assert.ok(i>=0,name);let d=0,q=null;   // one whole statement, however many lines it runs to
  for(let j=i;j<src.length;j++){const c=src[j];if(q){if(c==='\\')j++;else if(c===q)q=null;continue}if(c==='"'||c==="'"||c==='`'){q=c;continue}
    if('([{'.includes(c))d++;else if(')]}'.includes(c))d--;else if(c===';'&&d===0)return src.slice(i,j+1)+'\n'}assert.fail(name)};

test('the model has every node house-scene.js and the lesson drive, and stays small',()=>{
  for(const n of ['HOUSE','MASS_1','MASS_2','MASS_3','LEVEL_LOWER','LEVEL_UPPER','ROOF_LOWER','ROOF_UPPER','DECK','STAIR','TERRAIN','TREES','NORTH_POINT','GLASS_LOWER','GLASS_UPPER','WALLS_LOWER','WALLS_UPPER','FLOOR_UPPER'])assert.ok(names.has(n),'missing node '+n);
  for(const m of scene.matchAll(/N\.([A-Z_0-9]+)/g))assert.ok(names.has(m[1]),'scene uses '+m[1]+' which the model lacks');
  for(const m of scene.matchAll(/'((?:MASS|ROOF|LEVEL)_[A-Z0-9_]+)'/g))assert.ok(names.has(m[1]),'scene names '+m[1]);
  for(const m of src.matchAll(/node:"([A-Z_0-9]+)"/g))assert.ok(names.has(m[1]),'room or stage node '+m[1]);
  assert.ok(glb.length<3e6,'model under 3 MB: '+glb.length);
  assert.ok(fs.statSync(new URL('assets/models/house/house-hero.jpg',root)).size>40000,'Cycles hero render');
});
test('the massing stages and the house grow from the base of the model (their origin is 2 m below the lower floor)',()=>{
  for(const n of ['HOUSE','MASS_1','MASS_2','MASS_3']){const t=json.nodes.find(x=>x.name===n).translation;assert.ok(t&&Math.abs(t[1]+2)<1e-6,n)}
});
test('the drawings and the Blender model use the same design numbers',()=>{
  const OPEN=new Function(pick('OPEN')+'return OPEN')();
  const pyOpen=py.slice(py.indexOf('OPEN = ['),py.indexOf(']\nINNER')+1).replace('OPEN = ','').replace(/\(/g,'[').replace(/\)/g,']').replace(/'/g,'"').replace(/(^|[^\d])\.(\d)/g,'$10.$2');
  assert.deepEqual(JSON.parse(pyOpen),OPEN,'windows and doors match build_house.py');
  assert.match(py,/ceilL = lambda x, y: 2\.7 \+ y \* \.6 \/ 5\.5/);assert.match(src,/ceilL=y=>2\.7\+y\*\.6\/5\.5/);
  assert.match(py,/ceilU = lambda x, y: 3\.8 \+ \(y \+ 4\.5\) \* \.2/);assert.match(src,/ceilU=y=>3\.8\+\(y\+4\.5\)\*\.2/);
  assert.match(py,/STAIR = dict\(x0=5\.6, x1=6\.8, top=-1\.56, bottom=\.4, risers=8, rise=\.175, going=\.28\)/);
  const S=new Function(pick('STAIR')+'return STAIR')();assert.ok(Math.abs(S.risers*S.rise-1.4)<1e-9,'eight risers climb the 1.4 m split');
  assert.ok(Math.abs(S.bottom-S.going*(S.risers-1)-S.top)<1e-9,'seven goings fill the stair well');
  const ROOMS=new Function(pick('ROOMS')+'return ROOMS')();
  for(const r of ROOMS)assert.ok(names.has(r.node),'room plate '+r.node);
  for(const k of ['living','kitchen','bed1','bed2','bath','entry','deck'])assert.ok(ROOMS.some(r=>r.id===k),'legend has '+k);
});
test('the Sun is in the northern sky at about the right height for Wellington',()=>{
  const f=new Function(`const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));${pick('LAT')}${pick('SEASONS')}${pick('sunVec')}${pick('sunAlt')}${pick('sunAz')}${pick('facing')}${pick('glassSun')}return {sunAlt,sunAz,glassSun};`)();
  assert.ok(Math.abs(f.sunAlt('winter',12)-25.3)<.3,'midwinter noon '+f.sunAlt('winter',12));
  assert.ok(Math.abs(f.sunAlt('summer',12)-72.1)<.3,'midsummer noon '+f.sunAlt('summer',12));
  assert.ok(Math.abs(f.sunAz('winter',12))<1||Math.abs(f.sunAz('winter',12)-360)<1,'noon Sun due north');
  assert.ok(f.sunAz('equinox',9)>45&&f.sunAz('equinox',9)<90,'morning Sun in the north-east');
  assert.ok(f.glassSun(0)>f.glassSun(90)+2,'north glass gets more winter sun than east glass');
});
test('the page is wired like the other machines, and registered when the catalogue lists it',t=>{
  assert.match(read('study/m/house.html'),/kit\.js[\s\S]*data\.js[\s\S]*house\.js[\s\S]*ask\.js" defer data-page="study"/);
  assert.match(src,/import\("\.\/house-scene\.js"\)/);assert.match(scene,/\/assets\/models\/house\/house\.glb/);assert.match(scene,/dataset\.houseAsset='ready'/);
  const thumb=new URL('study/thumbnails/house.jpg',root);assert.ok(fs.statSync(thumb).size>20000,'study card thumbnail');
  const data=read('study/data.js'),D=JSON.parse(data.slice(data.indexOf('{'),data.lastIndexOf('}')+1)),m=D.machines.house;
  if(!m){t.diagnostic('not in study/data.js yet: see assets/models/house/REGISTER.md');return}
  assert.equal(m.href,'m/house.html');assert.match(read('study/kit.js'),/house:"tech"/);assert.match(read('study/index.html'),/"house"/);
});
test('the honest parts: practice questions, a truthful footer, seven challenges, kupu copied exactly from other machines',()=>{
  assert.match(src,/not real exam questions/);assert.match(src,/not a buildable design/);assert.match(src,/check your school's DVC conventions/);
  assert.ok((src.match(/\{step:"/g)||[]).length>=10,'at least 10 practice questions');assert.match(src,/cfg\.questionBank=bank/);
  const ch=src.slice(src.indexOf('challenges:['),src.indexOf('retrieval:{'));assert.equal((ch.match(/\{q:"/g)||[]).length,7,'seven challenges');
  const others=fs.readdirSync(new URL('study/m/',root)).filter(f=>f.endsWith('.js')&&!f.startsWith('house')).map(f=>read('study/m/'+f)).join('\n');
  const kupu=src.slice(src.indexOf('const KUPU=['),src.indexOf('];',src.indexOf('const KUPU=[')));
  for(const m of kupu.matchAll(/\{mi:"[^}]*\}/g))assert.ok(others.includes(m[0]),'kupu not found verbatim elsewhere: '+m[0]);
});
