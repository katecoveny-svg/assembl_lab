import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const file=process.env.CAFE_PAGE || new URL('../index.html', import.meta.url);
const html=readFileSync(file,'utf8');
test('actual activity toggle hides every actor and ring initially and through false/true/false',()=>{
 const actors=Object.fromEntries(['pBody','pHead','sBody','sHead','sApron','gBody'].map(n=>[n,{visible:true}]));
 const tableRings=Array.from({length:14},()=>({visible:true}));
 const block=html.match(/let activityVisible = false;[\s\S]*?setActivity\(false\);/)[0];
 const ctx=vm.createContext({...actors,tableRings});vm.runInContext(block,ctx);
 for(const expected of [false,true,false]){
   if(expected)vm.runInContext('setActivity(true)',ctx);else vm.runInContext('setActivity(false)',ctx);
   for(const mesh of [...Object.values(actors),...tableRings])assert.equal(mesh.visible,expected);
 }
});
