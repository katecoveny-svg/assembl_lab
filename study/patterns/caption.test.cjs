const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(__dirname + '/caption.js', 'utf8').replace('export ', '');
const captionLines = vm.runInNewContext(source + ';captionLines');
for (const [name,w,h] of [['square',2400,2400],['portrait',2160,3840],['wide',3200,2240]]) {
  test(name + ': complete captions fit, excessive newlines block instead of clipping', () => {
    const calls=[];
    const c={canvas:{height:h},measureText:s=>({width:s.length*w*.011}),fillText:(s,x,y)=>calls.push({s,y})};
    const start=h-w*.24, margin=w*.04;
    const y=captionLines(c,'My artwork',margin,start,w-margin*2,w*.035)+w*.01;
    captionLines(c,'First line\nSecond line',margin,y,w-margin*2,w*.027);
    assert.equal(calls.map(x=>x.s).join('|'),'My artwork|First line|Second line');
    assert(calls.every(x=>x.y<h-margin));
    assert.throws(()=>captionLines(c,Array(10).fill('line').join('\n'),margin,y,w-margin*2,w*.027),/too many lines/);
    calls.length=0;
    captionLines(c,'x'.repeat(240),margin,y,w-margin*2,w*.027);
    assert.equal(calls.map(x=>x.s).join(''),'x'.repeat(240));
    assert(calls.every(x=>x.y<h-margin));
  });
}
