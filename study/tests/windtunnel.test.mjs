// The wind tunnel machine: the Blender model has every node the scene drives, the physics is right (drag goes with v²,
// P = Fv in watts, top speed where P = Pmax), the airflow sketch behaves, and the page is honest about its numbers.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const root=new URL('../../',import.meta.url),read=p=>fs.readFileSync(new URL(p,root),'utf8');
const glb=fs.readFileSync(new URL('assets/models/windtunnel/windtunnel.glb',root));
const json=JSON.parse(glb.subarray(20,20+glb.readUInt32LE(12)).toString('utf8'));
const names=new Set(json.nodes.map(n=>n.name));
const src=read('study/m/windtunnel.js'),scene=read('study/m/windtunnel-scene.js');
const pick=name=>{const line=src.split('\n').find(l=>l.startsWith(`const ${name}=`));assert.ok(line,name);return line+'\n'};
const P=new Function(`${pick('RHO')}${['wingCd','wingClA','Cd','ClA','ms','q','drag','down','WEIGHT','power','topSpeed','grip','radius'].map(pick).join('')}
  return {RHO,AREA,MASS,G,PMAX,MU,Cd,ClA,ms,drag,down,WEIGHT,power,topSpeed,grip,radius};`)();

test('the model has every node windtunnel-scene.js drives, and stays small',()=>{
  for(const n of ['CAR','BODY','HALO','REAR_WING','REAR_WING_MAIN','REAR_WING_FLAP','REAR_WING_FLAP_MESH','FRONT_WING','WHEEL_FL','WHEEL_FR','WHEEL_RL','WHEEL_RR',
    'CENTRE_OF_MASS','TUNNEL','TUNNEL_FLOOR','TURNTABLE','ROLLING_ROAD','TUNNEL_FAN','SMOKE_WAND','WAND_CARRIAGE','REAR_ENDPLATE_L','REAR_ENDPLATE_R'])assert.ok(names.has(n),'missing node '+n);
  for(const n of scene.matchAll(/N\.([A-Z_0-9]+)/g))assert.ok(names.has(n[1]),'scene uses '+n[1]+' which the model lacks');
  for(const n of scene.matchAll(/\['(WHEEL_[A-Z]{2})'/g))assert.ok(names.has(n[1]),n[1]);
  assert.ok(glb.length<3e6,'model stays under 3 MB');
  const rw=json.nodes.find(n=>n.name==='REAR_WING').translation;assert.ok(Math.abs(rw[0]+2.15)<1e-3&&Math.abs(rw[1]-.84)<1e-3,'rear-wing pivot matches RW_PIVOT in windtunnel.js');
  assert.match(src,/RW_PIVOT=\[-2\.15,\.84\],FLAP_TE=\[-\.32,\.12\]/);
});
test('no real series, team or sponsor names anywhere in the machine or the model',()=>{
  const all=src+scene+read('study/m/windtunnel.html')+read('assets/models/windtunnel/build_windtunnel.py')+JSON.stringify(json.nodes.map(n=>n.name));
  for(const bad of [/formula\s*(1|one)/i,/\bF1\b/,/\bFIA\b/,/ferrari|mercedes|red bull|mclaren|williams|alpine|aston martin|haas|sauber/i])assert.doesNotMatch(all,bad);
});
test('drag: F = ½ρv²C_dA, and doubling the speed gives four times the drag',()=>{
  assert.equal(P.RHO,1.2);assert.equal(P.AREA,1.5);assert.equal(P.MASS,800);
  const v=200/3.6;assert.ok(Math.abs(P.drag(200,15,false)-.5*1.2*v*v*P.Cd(15,false)*1.5)<1e-9);
  for(const [a,d] of [[0,false],[15,false],[30,true]])for(const k of [50,100,150])assert.ok(Math.abs(P.drag(2*k,a,d)/P.drag(k,a,d)-4)<1e-9,`×2 speed → ×4 drag at ${k} km/h`);
  assert.ok(Math.abs(P.Cd(0,false)-.7)<1e-9&&P.Cd(30,false)>1.05&&P.Cd(30,false)<1.11,'C_d from 0.70 to about 1.1');
  assert.ok(P.ClA(0,false)===1.5&&Math.abs(P.ClA(30,false)-4.5)<1e-9,'C_L·A from 1.5 to 4.5 m²');
  assert.ok(P.drag(250,15,true)<P.drag(250,15,false)&&P.down(250,15,true)<P.down(250,15,false),'opening the flap cuts both drag and downforce');
});
test('power is P = Fv in watts, and top speed is where the power needed reaches 450 kW',()=>{
  const F=P.drag(180,15,false),v=180/3.6;assert.ok(Math.abs(P.power(180,15,false)-F*v)<1e-6);
  assert.ok(P.power(180,15,false)>9e4&&P.power(180,15,false)<1.1e5,'about 100 kW at 180 km/h (watts, not kW)');
  for(const [a,d] of [[0,false],[15,false],[15,true],[30,false]]){const top=P.topSpeed(a,d);assert.ok(Math.abs(P.power(top,a,d)-P.PMAX)<1,'P(top) = 450 kW');assert.ok(top>250&&top<340,'plausible top speed '+top)}
  assert.ok(Math.abs(P.power(200,15,false)/P.power(100,15,false)-8)<1e-9,'×2 speed → ×8 power');
});
test('downforce, weight and grip: numbers the challenges rely on',()=>{
  assert.ok(Math.abs(P.WEIGHT-7840)<1e-9);
  assert.ok(P.down(195,30,false)>=P.WEIGHT&&P.down(190,30,false)<P.WEIGHT,'downforce = weight at about 195 km/h with the wing at 30°');
  assert.ok(P.down(300,15,false)/P.WEIGHT>1.4&&P.down(300,15,false)/P.WEIGHT<2,'about 1.6 × weight at 300 km/h');
  assert.ok(Math.abs(P.grip(0,15,false)-1.5*7840)<1e-9);const r=P.radius(200,15,false);assert.ok(r>80&&r<200,'tightest corner at 200 km/h '+r);
  assert.ok(P.topSpeed(15,true)>310&&P.topSpeed(15,false)<310&&P.topSpeed(30,true)<310,'the DRS challenge needs the flap and a flattish wing');
});
test('the airflow sketch: streamlines rise over the car, and the smoke challenge can be met',()=>{
  const start=src.indexOf('const BODY=');const end=src.indexOf('// where the smoke goes');
  const FLOW=new Function(src.slice(start,end)+'return {FLOW,elements};')();
  FLOW.FLOW.solve(15,false);const tr=FLOW.FLOW.trace(4.9,.5,500,.04);const top=Math.max(...tr.map(p=>p[1]));
  assert.ok(top>.85,'a streamline starting at 0.5 m rises over the car: '+top);assert.ok(tr.at(-1)[0]<-5,'and makes it past the car');
  assert.ok(FLOW.FLOW.wingPsi>.8&&FLOW.FLOW.wingPsi<1.2,'the rear wing sits in the stream at about its own height');
  const w=FLOW.elements(15,false);assert.equal(w.length,4);assert.ok(w[1].p[0][1]>w[0].p[0][1],'the flap sits above the main plane');
});
test('the page is wired up like the other machines and is honest about its numbers',()=>{
  assert.match(read('study/m/windtunnel.html'),/kit\.js[\s\S]*data\.js[\s\S]*windtunnel\.js[\s\S]*ask\.js" defer data-page="study"/);
  assert.match(src,/not real exam questions/);assert.match(src,/not any real team's car or data/);assert.match(src,/textbook-style estimates/);assert.match(src,/not a CFD simulation/);
  assert.ok((src.match(/\{step:"/g)||[]).length>=10,'at least 10 practice questions');assert.match(src,/cfg\.questionBank=bank/);
  const ch=src.slice(src.indexOf('challenges:['),src.indexOf('papers:['));assert.equal((ch.match(/\{q:"/g)||[]).length,7,'seven challenges');
  // kupu Māori are only reused from other machines, never invented
  const others=fs.readdirSync(new URL('study/m/',root)).filter(f=>f.endsWith('.js')&&!f.startsWith('windtunnel')).map(f=>read('study/m/'+f)).join('\n');
  for(const m of src.matchAll(/\{mi:"([^"]+)",en:"([^"]+)",ta:(\d+)/g))assert.ok(others.includes(`{mi:"${m[1]}",en:"${m[2]}",ta:${m[3]}`),'kupu reused verbatim: '+m[1]);
  assert.ok(fs.statSync(new URL('study/thumbnails/windtunnel.jpg',root)).size>20000,'study card thumbnail');
  assert.ok(fs.statSync(new URL('assets/models/windtunnel/windtunnel-hero.jpg',root)).size>50000,'hero render');
});
