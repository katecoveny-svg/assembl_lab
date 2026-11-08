import test from 'node:test';
import assert from 'node:assert/strict';
import {at,checks} from '../../../study/teardown/generator/model.js';
const near=(a,b,t=1e-9)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
test('generator published hand checks',()=>{for(const c of checks())near(c.got,c.want,c.tol*2);});
test('Faraday derivative, Ohm law and power follow same state',()=>{
 for(let t=0;t<360;t+=7){const s=at(t),h=.001;const derivative=(at(t+h).linkage-at(t-h).linkage)/(2*h*Math.PI/180);near(s.emf,-derivative*s.omega,1e-7);near(s.current*s.R,s.emf);near(s.power,s.current*s.current*s.R);near(s.power,s.torque*s.omega);assert.ok(s.power>=0);}
});
test('speed and resistance relationships and cycle closure',()=>{near(at(90,{rpm:240}).emf,2*at(90).emf);near(at(90,{resistance:40}).power,at(90).power/2);near(at(90,{resistance:40}).emf,at(90).emf);for(const k of ['emf','flux','power','linkage'])near(at(30)[k],at(390)[k]);});
test('mean cycle power and RMS',()=>{let power=0,v2=0;for(let i=0;i<3600;i++){const s=at(i/10);power+=s.power;v2+=s.emf*s.emf;}near(power/3600,at(0).meanPower);near(Math.sqrt(v2/3600),at(0).rms);});
test('invalid inputs remain finite; zero field/speed produce zero',()=>{for(const t of [NaN,Infinity,-720,0,90]){const s=at(t,{rpm:Infinity,field:-1,resistance:0});for(const v of Object.values(s))if(typeof v==='number')assert.ok(Number.isFinite(v));}for(const inp of [{rpm:0},{field:0}]){const s=at(90,inp);near(s.emf,0);near(s.current,0);near(s.power,0);}});
