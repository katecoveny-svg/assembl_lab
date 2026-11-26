import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeNativeFoliage } from './native-foliage.mjs';

class Geometry {
  sets = {};
  setAttribute(k,v) { this.sets[k]=v; }
  setIndex(i) { this.index=i; }
  computeVertexNormals() { this.normals=true; }
}
class Attribute {
  constructor(buf,stride) { this.buf=buf;this.stride=stride; }
}
class Color {
  constructor(hex) { [this.r,this.g,this.b]=(hex.slice(1).match(/../g)??[]).map(s=>Number.parseInt(s,16)/255); }
}
const three={Geometry,Attribute,Color};
const taxa=['oioi','harakeke','platts_black','silver_spear','rengarenga','libertia','toetoe','red_tussock','carex_testacea','poa_cita','ponga','tikouka','nikau','pohutukawa','manuka','kowhai','koromiko','kakabeak','panakenake'];
const taxon=id=>({id,matureHeight:id==='panakenake'?.08:2.4,matureSpread:2,trunkColor:'#776655',flowerColor:'#ecccaa'});
test('native plant specimen geometries are deterministic and carry rooted wind weights',()=> {
  for(const id of taxa){
    const geo=makeNativeFoliage(taxon(id),three), repeat=makeNativeFoliage(taxon(id),three);
    const {position,color,aTipness,uv,aPartType}=geo.sets;
    const n=position.buf.length/3;
    assert(geo.normals, id);
    assert(geo.index.every(v=>Number.isInteger(v)&&v>=0&&v<n),id);
    assert.equal(color.buf.length,n*3,id);
    assert.equal(uv.buf.length,n*2,id);
    assert.equal(aTipness.buf.length,n,id);
    assert.equal(aPartType.buf.length,n,id);
    assert(position.buf.every(Number.isFinite),id);
    assert(aTipness.buf.some(x=>x===0),id+' should anchor its roots');
    assert(aTipness.buf.some(x=>x>.3),id+' should bend its tips');
    assert.deepEqual(repeat.sets.position.buf,position.buf,id);
  }
});
test('native pollen, fern, trunk and leaf references keep geometry choices and compact tier within bounds',()=>{
  for(const id of taxa) {
    const rich=makeNativeFoliage(taxon(id),three), compact=makeNativeFoliage(taxon(id),three,{compact:true});
    assert(compact.index.length<=rich.index.length,id);
    assert(compact.index.length/3<36000,id);
  }
  assert.equal(makeNativeFoliage(taxon('lavender'),three),null);
});

test('mophead clusters are actual geometry and flower heads keep gentle wind weights',()=>{
  for(const compact of [true,false]){
    const geo=makeNativeFoliage({id:'hydrangea',matureHeight:1.15,matureSpread:1.2, flowerColor:'#4c82f2'},three,{compact});
    const {position,aPartType,aTipness}=geo.sets;
    const fl=aPartType.buf.reduce((all,m,i)=>{if(m===2)all.push(i);return all},[]);
    assert(fl.length>=4000);
    assert(fl.every(i=>aTipness.buf[i]<.5));
    assert(position.buf.every(Number.isFinite));
    assert(geo.index.length/3<(compact?6200:12500));
    assert(aTipness.buf.some(x=>x===0));
  }
});
