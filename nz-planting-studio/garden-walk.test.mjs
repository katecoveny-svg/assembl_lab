import assert from 'node:assert/strict';
import test from 'node:test';
import {gardenView,journeyPose,reachable,roomView,walkable} from './garden-walk.mjs';

test('the eye crosses the real open bay and clears both loungers on its way in',()=>{
  assert.deepEqual(journeyPose(0),gardenView);
  assert.deepEqual(journeyPose(1),roomView);
  let previous=gardenView;
  for(let sample=1;sample<=600;sample++){
    const pose=journeyPose(sample/600);
    assert.ok(pose[2]<=previous[2]);
    assert.ok(Math.hypot(...pose.slice(0,3).map((n,i)=>n-previous[i]))<.07);
    if(pose[2] > -7.50 && pose[2] < -5.45)assert.ok(pose[0]<-1.96,'too close to the sun lounger');
    if(Math.abs(pose[2]+7.98)<.15)assert.ok(pose[0]>-2.48 && pose[0]<-1.51,'outside slider clearance');
    if(pose[2]<-8.15)assert.ok(walkable(pose[0],pose[2]));
    previous=pose;
  }
});
test('a step or tap on the floor stops before furniture and walls',()=>{
  const from=[-1.53,-8.87];
  assert.deepEqual(reachable(from,[-1.54,-8.94]),[-1.54,-8.94]);
  for(const obstacle of [[-2.72,-9.58],[-.05,-10.6],[-3.39,-10.86],[-1.53,-7],[-1.53,-14]]){
    const last=reachable(from,obstacle);
    assert.ok(walkable(...last));
    assert.notDeepEqual(last,obstacle);
  }
});
