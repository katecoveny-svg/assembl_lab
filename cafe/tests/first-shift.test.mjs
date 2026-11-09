import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const source=html.slice(html.indexOf('const CAFE ='),html.indexOf('</script>',html.indexOf('const CAFE =')));
const K=vm.runInNewContext(source+';CAFE');
function run(roster=false,station=false){const s={...K.BASE,roster,station},d=K.newDay(s,1,K.typicalWeather(1));while(d.t<600)K.step(s,d);return {d,stats:K.dayStats(s,d)};}
const results=[run(),run(false,true),run(true,false),run(true,true)];
assert.deepEqual(JSON.parse(JSON.stringify(results[0].stats)),JSON.parse(JSON.stringify(run().stats)),'baseline replay deterministic');
for(const r of results){assert.equal(r.d.t,600);assert.ok(Number.isFinite(r.stats.labour));assert.equal(r.d.parties.length,results[0].d.parties.length);assert.deepEqual(Array.from(r.d.parties,p=>[p.arr,p.type,p.size]),Array.from(results[0].d.parties,p=>[p.arr,p.type,p.size]));}
assert.ok(results[3].stats.walked<results[0].stats.walked,'combined decision reduces lost customers');
assert.ok(results[3].stats.labour>results[0].stats.labour,'staffing tradeoff retains labour cost');
console.log(JSON.stringify(results.map((r,i)=>({plan:['baseline','station','roster','both'][i],walked:r.stats.walked,labour:r.stats.labour})),null,2));
console.log('PASS: deterministic replay, common customer cohort, endpoint, finite costs, decision tradeoff');

// Catch module integration syntax errors as well as model regressions.
for(const script of html.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)){const check=spawnSync(process.execPath,["--check","--input-type=module"],{input:script[1],encoding:"utf8"});assert.equal(check.status,0,check.stderr);}
