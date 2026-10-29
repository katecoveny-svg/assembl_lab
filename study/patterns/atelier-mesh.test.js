import test from 'node:test';
import assert from 'node:assert/strict';
import {createCanvasSculpture} from './sculpture-canvas.js';
import {cleanRecipe} from './atelier-shapes.js';

test('software renderer exports finite mesh vertices and valid triangular face references',()=>{
  const pixels=()=>({data:new Uint8ClampedArray(canvas.width*canvas.height*4)});
  const context={setTransform(){},fillRect(){},save(){},translate(){},scale(){},restore(){},putImageData(){},createRadialGradient(){return{addColorStop(){}}},getImageData:pixels,createImageData:pixels};
  const canvas={width:50,height:50,clientWidth:50,clientHeight:50,getContext:()=>context};
  const renderer=createCanvasSculpture(canvas);
  for(const form of ['knot','halo','bloom','ribbon']){
    const recipe=cleanRecipe({form,thickness:1.4,flutes:14,seed:99999});
    renderer.resize(50,50,1);renderer.render(0,recipe);
    const lines=renderer.exportObj().split('\n'),vertices=lines.filter(x=>x.startsWith('v ')),faces=lines.filter(x=>x.startsWith('f '));
    assert.ok(vertices.length>4000);assert.ok(faces.length>8000);
    for(const line of vertices)assert.ok(line.split(' ').slice(1).every(v=>Number.isFinite(Number(v))&&Math.abs(Number(v))<4));
    for(const line of faces){const ids=line.split(' ').slice(1).map(Number);assert.equal(ids.length,3);assert.ok(ids.every(id=>Number.isInteger(id)&&id>=1&&id<=vertices.length));}
  }
  renderer.dispose();
});


test('WebGL geometry construction has bounded finite positions and normals for every form',async()=>{
  const {ribbonGeometry}=await import('./sculpture.js');
  for(const form of ['knot','halo','bloom','ribbon']){
    const geometry=ribbonGeometry(99999,0,{form,thickness:1.4,flutes:14,energy:1});
    for(const attr of ['position','normal'])assert.ok([...geometry.getAttribute(attr).array].every(Number.isFinite));
    assert.ok(geometry.boundingSphere.radius<3);assert.ok(geometry.index.count>80000);geometry.dispose();
  }
});
