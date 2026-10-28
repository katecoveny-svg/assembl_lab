import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const html=fs.readFileSync(new URL('./index.html',import.meta.url),'utf8'),js=fs.readFileSync(new URL('./studio.js',import.meta.url),'utf8');
test('all eleven worlds remain available',()=>{for(const id of ['liquid','sculpture','garden','attract','braid','glyph','murmur','ink','sumi','ascii','lattice'])assert.match(html,new RegExp('value="'+id+'"'));});
test('core controls have wired, existing IDs',()=>{const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));for(const m of js.matchAll(/el\('([^']+)'\)/g))assert.ok(ids.has(m[1]),'Missing '+m[1]);});
test('offline renderers do not fetch content or use provider APIs',()=>{for(const file of ['liquid.js','sculpture.js','garden.js']){const src=fs.readFileSync(new URL(file,import.meta.url),'utf8');assert.doesNotMatch(src,/\bfetch\s*\(|XMLHttpRequest|api[_-]?key/i);}});
