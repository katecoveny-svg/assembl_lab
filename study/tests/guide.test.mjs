// The study guide, the finder and the walkthrough videos: what Jack (or any student) sees before they know how anything works.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const root=new URL('../../',import.meta.url),read=p=>fs.readFileSync(new URL(p,root),'utf8');
const kit=read('study/kit.js'),guide=read('study/guide.js'),tutor=read('study/tutor.js'),hub=read('study/index.html');
const data=read('study/data.js'),D=JSON.parse(data.slice(data.indexOf('{'),data.lastIndexOf('}')+1));
test('every machine loads the guide after it mounts',()=>{assert.match(kit,/new URL\("guide\.js",KIT_SRC\)/)});
test('each tour stop points at something the machine shell or Allen actually draws',()=>{
  for(const [sel] of [...guide.matchAll(/\["([^"]+)","[^"]+","[^"]+"\]/g)].map(m=>[m[1]])){
    if(sel.startsWith('#'))assert.match(kit,new RegExp(`id="${sel.slice(1)}"`),sel);
    else if(sel.startsWith('nav.steps'))assert.match(kit,/<nav class="steps"/);
    else if(sel==='.alt-fab')assert.match(tutor,/class="alt-fab"/);
    else assert.fail('unknown stop '+sel)}});
test('the finder searches titles, descriptions and tags, and filters by subject',()=>{
  assert.match(hub,/id="find-q"/);assert.match(hub,/data-find="\$\{esc\(find\)\}"/);assert.match(hub,/id="subj-\$\{k\}"/);assert.match(hub,/href="#find">Find a machine/)});
test('every machine built on the kit has a walkthrough video with a poster and captions',()=>{
  const idx=JSON.parse(read('study/videos/index.json')).videos;
  const safe=p=>{try{return read(p)}catch(e){return ''}};
  const kitIds=Object.keys(D.machines).filter(id=>/kit\.js/.test(safe('study/'+D.machines[id].href))&&/mount\(\{/.test(safe('study/'+D.machines[id].href.replace(/\.html$/,'.js'))));
  for(const id of [...kitIds,'study']){assert.ok(idx[id],'no video for '+id);assert.ok(idx[id].dur>=15&&idx[id].dur<=60,id+' length '+idx[id].dur);
    for(const ext of ['mp4','jpg'])assert.ok(fs.statSync(new URL(`study/videos/${id}.${ext}`,root)).size>5000,`${id}.${ext}`);
    assert.match(read(`study/videos/${id}.vtt`),/^WEBVTT\n\n1\n00:00:00\.000 -->/,id+'.vtt')}});
