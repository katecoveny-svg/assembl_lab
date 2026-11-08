import test from 'node:test';import assert from 'node:assert/strict';import {at,checks,SPEC} from '../../../study/teardown/slushie/model.js';
test('slushie hand checks',()=>{for(const c of checks())assert.ok(Math.abs(c.got-c.want)<1e-9,c.name)});
test('energy is conserved through sensible and latent cooling',()=>{for(let t=0;t<=1800;t+=10)for(let p=0;p<=350;p+=10){const s=at(t,{cooling:p});assert.ok(s.temperature>=0&&s.temperature<=20);assert.ok(s.ice>=0&&s.ice<=1);assert.ok(Math.abs(s.energy-(SPEC.mass*SPEC.cp*(20-s.temperature)+SPEC.mass*SPEC.latent*s.ice))<1e-6)}});
test('mixing never invents refrigeration',()=>assert.deepEqual({...at(900,{rpm:0}),rpm:24,angle:at(900).angle},at(900)));
test('stronger cooling gives no warmer water or less ice',()=>{for(let t=0;t<=1800;t+=10){assert.ok(at(t,{cooling:350}).temperature<=at(t,{cooling:100}).temperature);assert.ok(at(t,{cooling:350}).ice>=at(t,{cooling:100}).ice)}});
test('fully frozen batch stops its illustrative mixer',()=>{assert.equal(at(1799,{cooling:350}).angle,at(1500,{cooling:350}).angle);assert.equal(at(1799,{cooling:350}).ice,1)});
