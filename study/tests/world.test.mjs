// The guess the world machine: the data file is real, complete and credited, the numbers are plausible,
// and every guess-first answer is worked out from the data file (change the data and the answer changes).
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const root=new URL('../../',import.meta.url),read=p=>fs.readFileSync(new URL(p,root),'utf8');
const D=JSON.parse(read('study/m/world-data.json')),src=read('study/m/world.js');
// the pure data functions live between two markers in world.js, so they can run here without a browser
const core=src.slice(src.indexOf('// ---- core:start'),src.indexOf('// ---- core:end'));
const make=new Function('clamp',`${core}\nreturn worldCore;`)((v,a,b)=>Math.max(a,Math.min(b,v)));
const W=make(D),Y=D.meta.years,iy=y=>Y.indexOf(y),nz=D.countries.find(c=>c.id==='nzl');

test('the data file loads, stays small, and has every indicator for 1800 to 2025',()=>{
  assert.ok(fs.statSync(new URL('study/m/world-data.json',root)).size<400*1024,'under 400 KB');
  assert.equal(Y[0],1800);assert.equal(Y.at(-1),2025);assert.equal(Y.length,46);
  for(const k of ['lex','gdp','pop','cmu5','tfr','co2']){assert.ok(D.indicators[k]?.name&&D.indicators[k]?.unit,k);assert.equal(D.world[k].length,Y.length,'world '+k);
    for(const c of D.countries)assert.equal(c.d[k].length,Y.length,`${c.id} ${k}`)}
  assert.ok(D.countries.length>=180,'about 180+ countries');
  for(const c of D.countries)assert.ok(D.meta.regions[c.region],'region for '+c.id);
});
test('New Zealand is there and the values are plausible',()=>{
  assert.equal(nz.name,'New Zealand');
  const l=nz.d.lex[iy(2020)];assert.ok(l>78&&l<85,'NZ life expectancy 2020 '+l);
  const wp=D.world.pop[iy(2020)]*1000;assert.ok(wp>7.5e9&&wp<8.2e9,'world population 2020 '+wp);
  const np=nz.d.pop[iy(2020)]*1000;assert.ok(np>4.5e6&&np<5.5e6,'NZ population 2020 '+np);
  const wl=D.world.lex[iy(2020)];assert.ok(wl>70&&wl<75,'world life expectancy 2020 '+wl);
  const g=nz.d.gdp[iy(2020)];assert.ok(g>30000&&g<70000,'NZ income 2020 '+g);
  const t=D.world.tfr[iy(2020)];assert.ok(t>2&&t<2.6,'world babies per woman 2020 '+t);
  assert.ok(D.world.cmu5[iy(1900)]>D.world.cmu5[iy(2020)]*5,'child mortality fell');
  assert.ok(D.latest.co2.year>=2020&&D.latest.co2.values.nzl>3&&D.latest.co2.values.nzl<12,'NZ CO2 per person');
});
test('sources, licences, retrieval date and exact files are recorded in meta and credited on screen',()=>{
  const m=D.meta;assert.match(m.retrieved,/^\d{4}-\d{2}-\d{2}$/);
  assert.equal(m.sources.length,2);for(const x of m.sources){assert.equal(x.licence,'CC BY 4.0');assert.match(x.commit,/^[0-9a-f]{40}$/);assert.ok(x.files.length>0);assert.match(x.raw_base,/^https:\/\/raw\.githubusercontent\.com\//)}
  assert.ok(m.sources.some(x=>x.credit==='Free data from Gapminder (CC BY 4.0)'));assert.ok(m.sources.some(x=>x.credit==='Our World in Data (CC BY 4.0)'));
  assert.match(m.honesty,/estimates/);assert.match(m.honesty,/borders/);assert.match(m.honesty,/reconstructed/);
  assert.match(src,/Free data from Gapminder · Our World in Data \(CC BY 4\.0\)/);assert.match(read('tools/world/README.md'),/CC BY 4\.0/);
});
test('every quiz answer is computed from the data file',()=>{
  const Q=W.quiz();assert.ok(Q.length>=6);
  const byId=Object.fromEntries(Q.map(q=>[q.id,q]));
  for(const q of Q){assert.equal(q.opts.length,3,q.id);assert.ok(q.ans>=0&&q.ans<3,q.id);assert.ok(q.source&&q.answer,q.id)}
  assert.equal(byId['lex-now'].real,D.world.lex.at(-1));assert.equal(byId['lex-now'].opts[byId['lex-now'].ans],`About ${Math.round(D.world.lex.at(-1))} years`);
  assert.equal(byId['pop-now'].real,D.world.pop.at(-1));assert.equal(byId['lex-1800'].real,D.world.lex[0]);assert.equal(byId['tfr-now'].real,D.world.tfr.at(-1));
  const a=nz.d.gdp[iy(1950)],b=D.countries.find(c=>c.id==='chn').d.gdp.at(-1);assert.equal(byId['nz1950-china'].ans,Math.abs(a/b-1)<.1?2:a>b?0:1);
  const r=D.latest.co2.values.nzl/D.latest.co2.world;assert.equal(byId['co2-nz'].ans,r<1?0:r<2?1:2);
  // change the data, and the answers follow
  const D2=structuredClone(D);D2.world.lex[D2.world.lex.length-1]=50;D2.world.pop[D2.world.pop.length-1]=2e6;
  D2.countries.find(c=>c.id==='nzl').d.gdp[iy(1950)]=b*3;D2.latest.co2.values.nzl=D2.latest.co2.world*.5;
  const Q2=Object.fromEntries(make(D2).quiz().map(q=>[q.id,q]));
  assert.equal(Q2['lex-now'].opts[Q2['lex-now'].ans],'About 50 years');assert.equal(Q2['pop-now'].opts[Q2['pop-now'].ans],'About 2.0 billion');
  assert.equal(Q2['nz1950-china'].ans,0);assert.equal(Q2['co2-nz'].ans,0);
  // no fact is typed into the copy: the quiz builder reads every number through the data functions
  const qsrc=core.slice(core.indexOf('function quiz()'));assert.doesNotMatch(qsrc,/\b(74|73|8\.2|2\.2|30\.6|31)\b/);
});
test('the challenges can be done, and the statistics behave',()=>{
  const y70=W.firstYear('nzl','lex',70);assert.ok(y70>1900&&y70<1990,'NZ reached 70 in '+y70);
  const y3=W.firstYear('world','pop',3e6);assert.ok(y3>1950&&y3<1970,'3 billion in '+y3);
  let ok10=false;for(let y=1800;y<=2025;y++){const r=W.val('nzl','gdp',y)/W.at('nzl','gdp',1800);if(r>=9&&r<=11)ok10=true}assert.ok(ok10,'NZ income reached 10x');
  assert.ok(D.countries.some(c=>W.latest(c.id,'cmu5').v>10*W.latest('nzl','cmu5').v),'a country with 10x NZ child mortality');
  assert.ok(D.countries.some(c=>c.id!=='nzl'&&W.latest(c.id,'lex').v<W.at('nzl','lex',1950)),'a country below NZ 1950 life expectancy');
  const f=W.fit('gdp','lex',2020);assert.ok(f.r>.6,'income and life expectancy correlate '+f.r);
  assert.ok(W.fit('tfr','lex',2020).r<-.7,'a strong negative pair exists');
  assert.equal(W.val('nzl','lex',2020),nz.d.lex[iy(2020)]);const mid=W.val('nzl','lex',2022);assert.ok(mid>=Math.min(nz.d.lex[iy(2020)],nz.d.lex[iy(2025)])-1e-9);
  assert.equal(W.val('nzl','co2',D.latest.co2.year),D.latest.co2.values.nzl);assert.equal(W.val('nzl','co2',2025),null);
});
test('the page is wired up and honest',()=>{
  assert.match(read('study/m/world.html'),/kit\.js[\s\S]*data\.js[\s\S]*world\.js[\s\S]*ask\.js" defer data-page="study"/);
  assert.match(src,/not real exam questions/);assert.ok((src.match(/\{step:"/g)||[]).length>=10,'at least 10 practice questions');
  assert.match(src,/cfg\.questionBank=bank/);assert.match(src,/chimp/i);
  const ch=src.slice(src.indexOf('challenges:['),src.indexOf('truth:'));assert.equal((ch.match(/\{q:/g)||[]).length,7,'seven challenges');
  // kupu: only entries already used verbatim in other machines
  const others=fs.readdirSync(new URL('study/m/',root)).filter(f=>f.endsWith('.js')&&f!=='world.js').map(f=>read('study/m/'+f)).join('\n');
  const kupu=[...src.slice(src.indexOf('const KUPU=['),src.indexOf('];',src.indexOf('const KUPU=['))).matchAll(/\{mi:"[^}]*\}/g)].map(m=>m[0]);
  assert.ok(kupu.length>=5);for(const k of kupu){const core2=k.replace(/,chip:[^,}]+/,'');const mi=/mi:"([^"]+)",en:"([^"]+)",ta:(\d+)/.exec(core2);assert.ok(mi,k);assert.ok(others.includes(`{mi:"${mi[1]}",en:"${mi[2]}",ta:${mi[3]}`),'kupu not found elsewhere: '+k)}
  assert.ok(fs.statSync(new URL('study/thumbnails/world.jpg',root)).size>20000,'study card thumbnail');
});
