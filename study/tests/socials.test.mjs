// The social studies exam machine: the Blender model still has every node the lesson drives, and the page is wired up.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const root=new URL('../../',import.meta.url);
const glb=fs.readFileSync(new URL('assets/models/socials/socials-desk.glb',root));
const json=JSON.parse(glb.subarray(20,20+glb.readUInt32LE(12)).toString('utf8'));
const names=new Set(json.nodes.map(n=>n.name));
test('the desk model has every node socials-scene.js drives',()=>{
  const want=['BOARD_FACE','HAND_HOUR','HAND_MIN','GRAPH','CONTINUUM','TOKEN_YOU','GOVERNMENT','BEEHIVE','PARLIAMENT_HOUSE','BRANCH_LEGISLATIVE','BRANCH_EXECUTIVE','BRANCH_JUDICIAL','INNOVATION','JETBOAT','BULB_GLASS','BALANCE','BALANCE_BEAM','PAN_STRENGTHS','PAN_WEAKNESSES','CARDS','CARD_FLIP','PARAGRAPH_TOWER','CLOCK','EXAM_BAG'];
  for(let i=0;i<6;i++)want.push('BAR_'+i,'BAR_'+i+'_MESH','BLOCK_'+i);for(let i=0;i<5;i++)want.push('TOKEN_'+i);
  for(const n of want)assert.ok(names.has(n),'missing node '+n);
  const scene=fs.readFileSync(new URL('study/m/socials-scene.js',root),'utf8');
  for(const n of scene.matchAll(/N\.([A-Z_0-9]+)/g))assert.ok(names.has(n[1]),'scene uses '+n[1]+' which the model lacks');
});
test('the page loads the kit, the catalogue and Allen, and the catalogue lists the machine',()=>{
  const html=fs.readFileSync(new URL('study/m/socials.html',root),'utf8');
  assert.match(html,/kit\.js[\s\S]*data\.js[\s\S]*socials\.js[\s\S]*ask\.js" defer data-page="study"/);
  const data=fs.readFileSync(new URL('study/data.js',root),'utf8');assert.match(data,/"socials": \{"title": "The social studies exam machine", "href": "m\/socials\.html"/);
  assert.ok(fs.existsSync(new URL('study/thumbnails/socials.jpg',root)),'study card thumbnail');
});
test('practice questions are labelled as practice, and the invented material says so',()=>{
  const src=fs.readFileSync(new URL('study/m/socials.js',root),'utf8');
  assert.match(src,/not real exam questions/);assert.match(src,/Practice data: an invented/);assert.match(src,/Illustration standing in for a photograph/);
  assert.match(src,/check names, dates and your class's own examples/);
});
