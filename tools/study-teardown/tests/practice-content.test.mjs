import test from 'node:test';
import assert from 'node:assert/strict';
import {practice as p} from '../../../study/teardown/pendulum/practice.js';
import {practice as g} from '../../../study/teardown/generator/practice.js';
import {at as pendulum} from '../../../study/teardown/pendulum/model.js';
import {at as generator} from '../../../study/teardown/generator/model.js';
import {checkNumericAnswer} from '../../../study/teardown/kit/practice.js';
test('authored answers agree with machine models',()=>{
 const ratio=pendulum(0,{length:.9}).period/pendulum(0,{length:.4}).period;
 assert.ok(Math.abs(p.questions[1].expected-ratio)<1e-10);
 assert.ok(Math.abs(g.questions[1].expected-generator(0).meanPower)<1e-10);
 assert.equal(checkNumericAnswer('1.50',p.questions[1].expected,p.questions[1].tolerance).kind,'match');
 assert.equal(checkNumericAnswer('1.62',g.questions[1].expected,g.questions[1].tolerance).kind,'match');
 assert.equal(checkNumericAnswer('3.23',g.questions[1].expected,g.questions[1].tolerance).kind,'retry');
});
test('each practice has original non-assessment scope and explanatory scaffolding',()=>{
 for(const config of [p,g]){assert.equal(config.questions.length,3);assert.match(config.scope,/Not an NZQA assessment/);for(const q of config.questions){assert.ok(q.hint&&q.answer&&q.misconception);}assert.ok(config.sources.every(s=>new URL(s.href).hostname==='www.nzqa.govt.nz'));}
});
