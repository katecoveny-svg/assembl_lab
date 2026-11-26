import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createBusSightlines,busCameraPose} from '../../auckland/live/bus-sightline.mjs';
test('bus follow chooses a clear nearby angle when a building blocks the preferred view',()=>{
  const sight=createBusSightlines();
  sight.add([[-15,15],[15,15],[15,31],[-15,31]],-2,60);
  assert.equal(sight.clear([0,20,60],[0,2,0]),false);
  const pose=busCameraPose([0,2,0],0,66,.47,sight);
  assert.equal(sight.clear(pose,[0,2,0]),true);
  assert.ok(Math.abs(Math.hypot(pose[0],pose[1]-2,pose[2])-66)<.01);
});
test('uses a readable overhead angle when the published position lies inside a footprint',()=>{
  const sight=createBusSightlines();
  sight.add([[-6,-6],[6,-6],[6,6],[-6,6]],-2,60);
  assert.deepEqual(busCameraPose([0,2,0],0,66,.47,sight),[-2,68,10]);
});
