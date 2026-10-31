import test from 'node:test';import assert from 'node:assert/strict';
// Geometry and rule checks for Kiln and Flocking rules. Rendering, audio and video are reviewed in a browser.
const {defaultProfile,profileFromStroke,solidOutline}=await import('./vessel.js');
const {steer}=await import('./flock.js');
test('a vessel outline is closed on the axis, so the lathe makes a solid',()=>{
 const o=solidOutline(defaultProfile(42),.5);assert.equal(o[0][0],0);assert.equal(o.at(-1)[0],0);
 assert.ok(o.every(([r,y])=>r>=0&&Number.isFinite(y)));assert.ok(o.at(-1)[1]>0,'the inner floor sits above the foot');
});
test('the inner wall never crosses the axis, even for a needle-thin stroke',()=>{
 const thin=profileFromStroke([[.02,0],[.03,.6],[.02,1.2],[.03,1.8]]);assert.ok(thin);for(const [r] of solidOutline(thin))assert.ok(r>=0);
});
test('a stroke draws the same vessel whichever side or direction it is drawn',()=>{
 const pts=[[.4,0],[.7,.5],[.5,1],[.3,1.5],[.35,1.9]];
 assert.deepEqual(profileFromStroke(pts),profileFromStroke(pts.map(([x,y])=>[-x,y]).reverse()));
 assert.equal(profileFromStroke([[.4,0],[.5,.1]]),null,'too short to throw');
});
test('separation pushes away, cohesion pulls in, and a zero weight switches a rule off',()=>{
 const b={x:0,y:0,vx:0,vy:0},near=[{x:10,y:0,vx:0,vy:0}],w={sep:1,ali:1,coh:1};
 const f=steer(b,near,w,{vision:90});assert.ok(f.sep[0]<0,'away from the neighbour');assert.ok(f.coh[0]>0,'towards the neighbour');
 const off=steer(b,near,{sep:0,ali:1,coh:0},{vision:90});assert.deepEqual(off.sep,[0,0]);assert.deepEqual(off.coh,[0,0]);
 assert.deepEqual(steer(b,[],w).sum,undefined);assert.deepEqual(steer(b,[],w).ali,[0,0]);
});
