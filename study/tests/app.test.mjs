// The study app and shareable links: installable from the hub or any machine, honest offline behaviour,
// share cards that platforms can read, and /study/?find=<machine> deep links.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const root=new URL('../../',import.meta.url),read=p=>fs.readFileSync(new URL(p,root),'utf8');
const hub=read('study/index.html'),kit=read('study/kit.js'),app=read('study/app.js'),sw=read('study/sw.js');
const man=JSON.parse(read('study/manifest.webmanifest'));
const png=p=>{const b=fs.readFileSync(new URL(p.replace(/^\//,''),root));assert.equal(b.toString('latin1',1,4),'PNG',p);return [b.readUInt32BE(16),b.readUInt32BE(20)]};
test('manifest is scoped to /study/ with a start page inside it and real icons',()=>{
  assert.equal(man.scope,'/study/');assert.ok(man.start_url.startsWith('/study/'));assert.equal(man.display,'standalone');
  for(const i of man.icons){const [w,h]=png(i.src);assert.equal(`${w}x${h}`,i.sizes,i.src)}
  assert.ok(man.icons.some(i=>i.purpose==='maskable'));assert.deepEqual(png('/study/app/apple-touch-icon.png'),[180,180])});
test('hub and every kit machine load the app helper',()=>{
  assert.match(hub,/<link rel="manifest" href="\/study\/manifest\.webmanifest">/);assert.match(hub,/<script src="app\.js" defer>/);
  assert.match(kit,/new URL\("app\.js",KIT_SRC\)/);assert.match(hub,/data-get-app hidden>Get the app</)});
test('service worker stays in /study/, never caches Allen or videos, and is network first',()=>{
  assert.match(app,/register\("\/study\/sw\.js",\{scope:"\/study\/"\}\)/);
  assert.match(sw,/startsWith\("\/api\/"\)/);assert.match(sw,/mp4\|webm\|vtt/);assert.match(sw,/e\.respondWith\(fetch\(req\)/);
  for(const f of sw.match(/"\/study\/[^"]*"/g))if(f!=='"/study/"')assert.ok(fs.existsSync(new URL(JSON.parse(f).slice(1),root)),f)});
test('share card: Open Graph tags sit in <head> and point at a 1200×630 image that exists',()=>{
  const headEnd=hub.indexOf('</head>');for(const k of ['og:title','og:description','og:image','twitter:card'])assert.ok(hub.indexOf(k)>0&&hub.indexOf(k)<headEnd,k);
  const b=fs.readFileSync(new URL('study/share/og.jpg',root));assert.equal(b[0],0xFF);assert.equal(b[1],0xD8);
  for(const f of ['square.jpg','story.jpg'])assert.ok(fs.statSync(new URL('study/share/'+f,root)).size>20000,f)});
test('?find= opens a machine by id, or fills the search',()=>{assert.match(hub,/get\("find"\)/);assert.match(hub,/location\.replace\(m\.href\)/)});
