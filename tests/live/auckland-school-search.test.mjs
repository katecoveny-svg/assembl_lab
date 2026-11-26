import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildIndex, searchTransport,addLiveSchoolRoutes} from '../../auckland/live/transit.js';
import {SCHOOL_ROUTES} from '../../auckland/live/at-school-routes.js';
const data = name => JSON.parse(readFileSync(new URL('../../auckland/live/data/'+name,import.meta.url)));
const index = () => buildIndex(data('routes.json'),data('stops.json'),SCHOOL_ROUTES);
test('school bus 413 works without any live data, with official timetable and indexed stops',()=>{
 const x=index();
 for(const hint of ['413','s413','S413-202','bus 413','school bus 413','route 413']){
   const r=searchTransport(x,hint)[0];
   assert.equal(r.id,'S413-202');assert.equal(r.kind,'route');assert.equal(r.route.school,true);
 }
 const route=x.routes.get('S413-202');assert.match(route.timetable,/at\.govt\.nz/);
 assert(route.timetableStops.some(s=>s.code==='7783'&&s.routes.includes(route.id)));
 assert.equal(searchTransport(x,'stop 7783')[0].kind,'stop');
});
test('short route codes and exact feed IDs are separate; no suffix guessing or false-live samples',()=>{
 const x=index(), nowSec=1000;
 const vehicles=[{id:'15774',routeId:'S413-202',ts:990},{id:'413',routeId:'S413-202',ts:991}];
 const lookup=(q,liveFeed=true)=>searchTransport(x,q,{vehicles,liveFeed,nowSec});
 assert.equal(lookup('413')[0].kind,'route');
 assert.equal(lookup('vehicle 413')[0].kind,'vehicle');
 assert.equal(lookup('vehicle 15774')[0].live,true);
 assert.equal(lookup('fleet 15774',false)[0].live,false);
 assert.equal(lookup('vehicle 574').length,0);
 assert.equal(lookup('school bus 413').some(r=>r.kind==='vehicle'),false);
});
test('school routes discovered on the AT feed keep exact route IDs and do not infer a timetable',()=>{
 const x=index();
 addLiveSchoolRoutes(x,[{routeId:'S999-123'},{routeId:'NOTS999-123'}]);
 assert.equal(searchTransport(x,'school bus 999')[0].route.id,'S999-123');
 assert.equal(searchTransport(x,'999')[0].route.timetable,undefined);
 assert(!x.routes.has('NOTS999-123'));
});
