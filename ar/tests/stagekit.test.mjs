import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {assembler} from '../worlds/stagekit.js';

function sample(){
  const root=new THREE.Group(),shown=new THREE.Mesh(new THREE.BoxGeometry()),hidden=shown.clone();
  hidden.position.x=2;hidden.visible=false;root.add(shown,hidden);
  return {shown,hidden,animation:assembler(root,[shown,hidden],{duration:1})};
}
test('assembly keeps hidden activity figures hidden during and after placement',()=>{
  const {shown,hidden,animation}=sample();animation.start();
  for(let i=0;i<15;i++){animation.update(.1);assert.equal(hidden.visible,false);}
  assert.equal(shown.visible,true);assert.equal(animation.done,true);
  animation.start();animation.update(.2);animation.start();animation.update(2);
  assert.equal(hidden.visible,false);assert.equal(shown.visible,true);
  assert.equal(hidden.position.x,2);assert.equal(hidden.position.y,0);
});
test('finishing without animation preserves the original visibility',()=>{
  const {shown,hidden,animation}=sample();animation.finish();
  assert.equal(shown.visible,true);assert.equal(hidden.visible,false);
});
