import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createFoodService, pendingPassItems, dishFamily } from '../plated-food.mjs';

test('the pass only shows waiting tickets, excluding served, discarded and carried meals', () => {
 const tickets = [{id:1,out:-1,items:[{k:'fish'}]},{id:2,out:478,items:[{k:'steak'}]},{id:3,out:-2,items:[{k:'pasta'}]},{id:4,out:-1,items:[{k:'soup'}]}];
 const before = JSON.stringify(tickets);
 assert.deepEqual(pendingPassItems(tickets,new Set([4])),[{k:'fish'}]);
 assert.equal(JSON.stringify(tickets),before);
 assert.equal(pendingPassItems(Array.from({length:20},(_,id)=>({id,out:-1,items:[{k:'fish'}]}))).length,12);
});
test('servings use shared dish geometry, bounded instances and clear stale plates between frames', () => {
 const root=new THREE.Group(),service=createFoodService(root,3);
 service.place(1,2,3,'steak');service.place(2,2,3,'salad');service.place(3,2,3,'pasta');service.place(4,2,3,'pasta');service.commit();
 assert.equal(service.meshes[0].count,3);
 assert.equal(service.meshes.slice(1).reduce((n,m)=>n+m.count,0),3);
 for(const m of service.meshes){assert.ok(m.geometry.getAttribute('position').array.every(Number.isFinite));}
 assert.equal(dishFamily('steak'),'grill');assert.equal(dishFamily('pasta'),'pasta');
 service.reset();service.commit();assert.ok(service.meshes.every(m=>m.count===0));
});
