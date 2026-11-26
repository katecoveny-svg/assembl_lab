import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildIndex, search } from '../../auckland/live/transit.js';
import { nearbyStops, readSavedStops, searchWords } from '../../auckland/live/passenger.js';

const load = f => JSON.parse(readFileSync(new URL('../../auckland/live/data/'+f, import.meta.url)));
const index = buildIndex(load('routes.json'),load('stops.json'));

test('prefixed route and stop searches work without stripping a stop name',()=>{
  assert.equal(search(index,searchWords('bus 70'))[0].route.short,'70');
  assert.equal(search(index,searchWords('Stop 7787'))[0].stop.code,'7787');
  assert.equal(searchWords('ferry Devonport terminal'),'ferry Devonport terminal');
  assert.deepEqual(search(index,searchWords('school bus 418')),[]);
});
test('nearby stops are ordered, bounded, mode-filtered and stations are listed once',()=>{
  const rows=nearbyStops(index,-36.8449,174.7675,{mode:'ferry'});
  assert.ok(rows.length>0);
  assert.ok(rows.every(r=>r.metres<=1400&&r.stop.modes.includes('ferry')));
  assert.equal(new Set(rows.map(r=>r.stop.id)).size,rows.length);
  assert.deepEqual(rows.map(r=>r.metres),rows.map(r=>r.metres).sort((a,b)=>a-b));
  assert.deepEqual(nearbyStops(index,0,0),[]);
});
test('saved stops ignore unsupported storage and junk',()=>{
  assert.deepEqual(readSavedStops({getItem(){throw Error('denied')}}),[]);
  assert.deepEqual(readSavedStops({getItem:()=>'{'}),[]);
  assert.deepEqual(readSavedStops({getItem:()=>'["one","one",2,"two"]'}),['one','two']);
});
