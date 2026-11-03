// The Earth & Space machine: the Blender model has every node the scene drives, the page is wired up and listed,
// and the science in the lesson (day lengths, phases, light travel times) checks out.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const root=new URL('../../',import.meta.url),read=p=>fs.readFileSync(new URL(p,root),'utf8');
const glb=fs.readFileSync(new URL('assets/models/earthspace/earthspace.glb',root));
const json=JSON.parse(glb.subarray(20,20+glb.readUInt32LE(12)).toString('utf8'));
const names=new Set(json.nodes.map(n=>n.name));
const src=read('study/m/earthspace.js'),scene=read('study/m/earthspace-scene.js');
const pick=(name)=>{const line=src.split('\n').find(l=>l.startsWith(`const ${name}=`));assert.ok(line,name);return line+'\n'};

test('the model has every node earthspace-scene.js drives, and every star in the lesson',()=>{
  for(const n of ['EARTH_SYSTEM','EARTH_TILT','EARTH_SPIN','EARTH','CLOUDS','NZ_PIN','NZ_PIN_HEAD','NZ_PIN_STALK','AXIS','MOON','SUN'])assert.ok(names.has(n),'missing node '+n);
  for(const n of scene.matchAll(/N\.([A-Z_0-9]+)/g))assert.ok(names.has(n[1]),'scene uses '+n[1]+' which the model lacks');
  for(const n of src.matchAll(/node:"([A-Z_]+)"/g))assert.ok(names.has(n[1]),'star node '+n[1]);
  assert.ok(json.images.length>=4,'textures embedded in the model');assert.ok(glb.length<3.5e6,'model stays under 3.5 MB');
});
test('the Aotearoa pin sits at 41.3° S, 174.8° E on the model (Y up, as three.js reads it)',()=>{
  const pin=json.nodes.find(n=>n.name==='NZ_PIN').translation,lat=Math.asin(pin[1])*180/Math.PI,lon=Math.atan2(-pin[2],pin[0])*180/Math.PI;
  assert.ok(Math.abs(lat+41.3)<.2,'lat '+lat);assert.ok(Math.abs(lon-174.8)<.2,'lon '+lon);
});
test('the page loads the kit, the catalogue and Allen; the catalogue lists it for Years 9 and 10 science',()=>{
  assert.match(read('study/m/earthspace.html'),/kit\.js[\s\S]*data\.js[\s\S]*earthspace\.js[\s\S]*ask\.js" defer data-page="study"/);
  const data=read('study/data.js'),D=JSON.parse(data.slice(data.indexOf('{'),data.lastIndexOf('}')+1)),m=D.machines.earthspace;
  assert.equal(m.href,'m/earthspace.html');assert.deepEqual(m.years,[9,10]);assert.match(read('study/kit.js'),/earthspace:"science"/);
  assert.ok(fs.statSync(new URL('study/thumbnails/earthspace.jpg',root)).size>20000,'study card thumbnail');
  assert.match(read('study/index.html'),/"earthspace"/);
});
test('day lengths, Moon phases and light travel times are right',()=>{
  const f=new Function(`${pick('MIDDAY')}${pick('decl')}${pick('dayLen')}${pick('LUNAR')}${pick('phase')}${pick('lit')}return {dayLen,phase,lit};`)();
  assert.ok(f.dayLen(11)>14.5&&f.dayLen(11)<16,'December in Wellington '+f.dayLen(11));assert.ok(f.dayLen(5)>8.5&&f.dayLen(5)<9.7,'June '+f.dayLen(5));
  assert.ok(Math.abs(f.dayLen(2)-12.2)<.8&&Math.abs(f.dayLen(8)-12)<.8,'equinox months near 12 h');
  assert.equal(f.phase(0),'New moon');assert.equal(f.phase(7.4),'First quarter');assert.equal(f.phase(14.75),'Full moon');assert.equal(f.phase(22.1),'Last quarter');
  assert.ok(Math.abs(f.lit(14.76)-1)<.01&&f.lit(0)<.01);
  const DIST=[...src.matchAll(/km:([0-9.e+*]+[A-Z]*),light:"[^"]*",lightS:([0-9.e+*]+)/g)].map(m=>[eval(m[1].replace('LY','9.461e12')),eval(m[2])]);
  assert.equal(DIST.length,6);for(const [km,sec] of DIST)assert.ok(Math.abs(km/299792/sec-1)<.08,`light time for ${km} km`);
});
test('the hard parts are honest: practice questions, squashed scale, generated surfaces, NZ moon view',()=>{
  assert.match(src,/not real exam questions/);assert.match(src,/squashed so everything fits/);assert.match(src,/Natural Earth coastline data \(public domain\)/);
  assert.match(src,/in the Southern Hemisphere a waxing Moon is lit on the LEFT/i);assert.ok((src.match(/\{step:"/g)||[]).length>=12,'at least 12 practice questions');
  assert.match(src,/cfg\.questionBank=bank/);
});
