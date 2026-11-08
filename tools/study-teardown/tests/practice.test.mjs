import test from 'node:test';
import assert from 'node:assert/strict';
import {checkNumericAnswer} from '../../../study/teardown/kit/practice.js';
test('empty answers are not coerced to zero',()=>{for(const v of ['', '  ',null,undefined])assert.equal(checkNumericAnswer(v,0).kind,'empty');assert.equal(checkNumericAnswer('0',0).kind,'match');});
test('full finite decimal and scientific notation parsing',()=>{for(const v of ['2.5','+2.5','25e-1',' .25e1 '])assert.equal(checkNumericAnswer(v,2.5).kind,'match');for(const v of ['2.5 volts','2,5','0x10','NaN','Infinity','1e309','<script>','1+1'])assert.equal(checkNumericAnswer(v,2.5).kind,'invalid');});
test('absolute tolerance inclusive boundary and signed answers',()=>{assert.equal(checkNumericAnswer('1.01',1,.01).kind,'match');assert.equal(checkNumericAnswer('.99',1,.01).kind,'match');assert.equal(checkNumericAnswer('1.011',1,.01).kind,'retry');assert.equal(checkNumericAnswer('-2',-2,0).kind,'match');assert.equal(checkNumericAnswer('2',-2,0).kind,'retry');});
test('invalid authored settings fail explicitly',()=>{for(const v of [NaN,Infinity,undefined])assert.throws(()=>checkNumericAnswer('1',v),TypeError);for(const v of [-1,NaN,Infinity])assert.throws(()=>checkNumericAnswer('1',1,v),TypeError);});
