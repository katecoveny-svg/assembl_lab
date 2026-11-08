import test from 'node:test';
import assert from 'node:assert/strict';
import {sample, reachedGoal, ARM_LENGTH} from '../../../study/teardown/robot-octopus/model.js';
test('wave speed, period and challenge use the same model',()=>{const s=sample(0,{frequency:1,wavelength:12});assert.equal(s.speed,12);assert.equal(s.period,1);assert.ok(reachedGoal(s));assert.ok(!reachedGoal(sample(0)));});
test('wave repeats after one period and has anchored ends',()=>{const a=sample(.13),b=sample(2.13);for(let k=0;k<8;k++)for(let j=0;j<17;j++)assert.ok(Math.abs(a.arms[k][j].lift-b.arms[k][j].lift)<1e-12);assert.equal(a.arms[0][0].lift,0);assert.equal(a.arms[0][16].distance,ARM_LENGTH);});
test('together mode synchronises arms; ripple offsets their phase',()=>{const s=sample(.4,{mode:'together'});assert.deepEqual(s.arms[0],s.arms[7]);assert.notEqual(sample(.4).arms[0][5].lift,sample(.4).arms[1][5].lift);});
test('reject invalid model input',()=>{assert.throws(()=>sample(NaN));assert.throws(()=>sample(0,{frequency:0}));});
