// The site agent (roster: "site context"): its rules and its answer key. Synthetic data and the public sample only: the point is a
// public place (Auckland Domain), the drawings are made up here, and nothing from a client's set is in this file.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  TYPE, LABELS, HOWS, PAID_CAP, sunAt, goldenHour, sheetWords, siteSheets, scaleDenom, metresPerPixel, registerRead, nameOutlines, toEN, fromEN,
  nearStops, inAuckland, modelFacts, buildBrief, briefProblem, briefForHandoff, approveBrief, item, parseOutlines, outlinesQuery,
} from '../../architecture/js/agents/site-brief-rules.js';
import { ADDONS, projectPanels } from '../../architecture/js/modules.js';
import { onRequest, SITEBRIEF_SCHEMA, SITEBRIEF_PROMPTS, validate } from '../../functions/api/plan-read.js';

const DOMAIN = { lat: -36.8606, lng: 174.7778 };   // Auckland Domain: a public place, standing in for a site
const NOW = new Date('2026-12-21T02:00:00Z');       // 3 pm NZDT on the longest day

// ---- the answer key: sun -------------------------------------------------------------------------------------------------------------
test('the sun at midsummer reaches 90 − 36.86 + 23.44 = 76.6° over the Domain, and stands north at its highest', () => {
  let best = { alt: -90 }; for (let m = 0; m < 24 * 60; m += 2) { const s = sunAt(DOMAIN.lat, DOMAIN.lng, new Date(Date.UTC(2026, 11, 20, 11) + m * 60e3)); if (s.alt > best.alt) best = s; }
  assert.ok(Math.abs(best.alt - 76.58) < 0.4, `noon altitude ${best.alt}`);
  assert.ok(best.az < 5 || best.az > 355, `noon azimuth ${best.az}`);
});
test('golden hour on 21 December ends at sunset, about 8:40 pm NZDT, and starts when the sun is 6° up', () => {
  const g = goldenHour(DOMAIN.lat, DOMAIN.lng, NOW);
  const to = new Date(g.to), mins = (to.getUTCHours() + 13) % 24 * 60 + to.getUTCMinutes();
  assert.ok(Math.abs(mins - (20 * 60 + 41)) <= 8, `sunset ${to.toISOString()}`);
  assert.ok(Math.abs(sunAt(DOMAIN.lat, DOMAIN.lng, new Date(g.from)).alt - 6) < 0.3);
  assert.ok(new Date(g.from) < new Date(g.at) && new Date(g.at) < to);
  assert.ok(g.az > 230 && g.az < 260, 'the evening sun sets south of west in midsummer');
});

// ---- the answer key: a site plan's own words -------------------------------------------------------------------------------------------
const PAGE = { items: [
  { s: 'EXISTING DWELLING', x: 300, y: 400 }, { s: 'EX. GARAGE', x: 520, y: 380 }, { s: 'FUTURE STAGE 2', x: 700, y: 300 },
  { s: '12 CARPARKS', x: 820, y: 640 }, { s: 'FFL 12.500', x: 410, y: 420 }, { s: 'RL 8.25', x: 260, y: 700 }, { s: 'BOUNDARY', x: 100, y: 90 },
  { s: 'SITE PLAN 1:200 @ A3', x: 900, y: 1100 }, { s: 'Notes: confirm all levels on site', x: 900, y: 1150 },
] };
test('a site plan’s printed words: existing buildings, a future stage, parking with its count, levels and the boundary, all as written', () => {
  const w = sheetWords(PAGE);
  assert.deepEqual(w.existing.map((e) => e.name), ['Existing Dwelling', 'Existing Garage']);
  assert.deepEqual(w.future.map((e) => e.name), ['Future Stage 2']);
  assert.deepEqual(w.parking.map((p) => p.count), [12]);
  assert.deepEqual(w.levels.map((l) => [l.kind, l.value]), [['FFL', 12.5], ['RL', 8.25]]);
  assert.equal(w.boundary.length, 1);
  assert.deepEqual([w.existing[0].x, w.existing[0].y], [300, 400]);
});
test('site sheets are picked by their printed titles; the scale gives metres per pixel from the paper width', () => {
  const sheets = [{ id: 'a#1', title: 'Site Plan', scale: '1:200 @ A3', w_mm: 420 }, { id: 'a#2', title: 'Ground Floor Plan' }, { id: 'a#3', title: 'Existing Site Context' }, { id: 'a#4', title: 'Elevations' }, { id: 'a#5', title: 'Location Plan' }];
  assert.deepEqual(siteSheets(sheets).map((s) => s.id), ['a#1', 'a#3', 'a#5']);
  assert.equal(scaleDenom('1:200 @ A3'), 200); assert.equal(scaleDenom('NTS'), null);
  assert.equal(metresPerPixel(sheets[0], 2400), 0.035);
  assert.equal(metresPerPixel({ scale: 'NTS', w_mm: 420 }, 2400), null);
});

// ---- the answer key: laying a site plan read on the parcel, and naming LINZ outlines from it --------------------------------------------
// The ground truth is made in metres east and north of the point; the "drawing" is made from it with a known scale and north, then read back.
const M_PER_PX = 0.035, NORTH = 30;
const parcelEN = [[-20, -15], [20, -15], [20, 15], [-20, 15]];
const bldgEN = { dwelling: [[-12, -6], [-2, -6], [-2, 4], [-12, 4]], garage: [[6, -10], [12, -10], [12, -4], [6, -4]] };
function toPx([e, n], c = [1200, 800]) {   // the inverse of registerRead's transform, about the parcel's centre (0, 0)
  const t = NORTH * Math.PI / 180, de = e / M_PER_PX, dn = n / M_PER_PX;
  const dx = de * Math.cos(t) + dn * Math.sin(t), dyUp = -de * Math.sin(t) + dn * Math.cos(t);
  return { x: c[0] + dx, y: c[1] - dyUp };
}
const ring = (en) => en.map(([e, n]) => { const q = fromEN(DOMAIN, e, n); return [q.lat, q.lng]; });
const READ = { scale_text: '1:200 @ A3', north_deg: NORTH, boundary: parcelEN.map((p) => toPx(p)), existing: [{ label: 'EXISTING DWELLING', points: bldgEN.dwelling.map((p) => toPx(p)), confidence: 0.9 }, { label: 'GARAGE', points: bldgEN.garage.map((p) => toPx(p)), confidence: 0.8 }], future: [{ label: 'FUTURE STAGE 2', points: [[10, 5], [18, 5], [18, 12], [10, 12]].map((p) => toPx(p)), confidence: 0.7 }], parking: [{ points: [], count: 4, confidence: 0.8 }], levels: [{ text: 'FFL 12.50', value: 12.5, x: 1100, y: 700 }], notes: '' };
const cen = (pts) => pts.reduce((a, p) => [a[0] + p[0] / pts.length, a[1] + p[1] / pts.length], [0, 0]);

test('a read laid on the parcel puts each drawn building within 0.1 m of where it truly is, and says how well the boundary fits', () => {
  assert.equal(validate(READ, SITEBRIEF_SCHEMA), null, 'the synthetic read has the schema’s shape');
  const reg = registerRead(READ, M_PER_PX, ring(parcelEN), DOMAIN);
  assert.ok(reg.fit_m < 0.1, `fit ${reg.fit_m}`);
  assert.ok(Math.abs(reg.area_drawn_m2 - 1200) < 2 && Math.abs(reg.area_parcel_m2 - 1200) < 2);
  for (const [k, pts] of Object.entries(bldgEN)) {
    const got = cen(READ.existing[k === 'dwelling' ? 0 : 1].points.map(reg.toEn)), want = cen(pts);
    assert.ok(Math.hypot(got[0] - want[0], got[1] - want[1]) < 0.1, `${k}: ${got} vs ${want}`);
  }
  assert.equal(registerRead({ ...READ, north_deg: null }, M_PER_PX, ring(parcelEN), DOMAIN), null, 'no north, no placing');
  assert.equal(registerRead(READ, null, ring(parcelEN), DOMAIN), null, 'no scale, no placing');
});
test('LINZ outlines are named from the site plan one to one within 8 m; the rest keep LINZ’s own name or use', () => {
  const outlines = [
    { id: 'a', name: null, use: 'Residential', ring: ring(bldgEN.dwelling.map(([e, n]) => [e + 1.2, n - 0.8])) },   // LINZ outline 1.4 m off the drawing
    { id: 'b', name: null, use: null, ring: ring(bldgEN.garage) },
    { id: 'c', name: 'Band rotunda', use: null, ring: ring([[60, 60], [66, 60], [66, 66], [60, 66]]) },
  ];
  const labelled = [{ label: 'Existing Dwelling', sheet: 'A-001', en: cen(bldgEN.dwelling) }, { label: 'Garage', sheet: 'A-001', en: cen(bldgEN.garage) }, { label: 'Shed', sheet: 'A-001', en: [-40, 40] }];
  const got = nameOutlines(outlines, labelled, DOMAIN);
  assert.deepEqual(got.map((o) => [o.name, o.name_from]), [['Existing Dwelling', 'site plan A-001'], ['Garage', 'site plan A-001'], ['Band rotunda', 'LINZ']]);
  assert.ok(Math.abs(got[0].matched_m - 1.44) < 0.05);
  assert.equal(nameOutlines([outlines[1]], [], DOMAIN)[0].name, 'Existing building');
});
test('LINZ’s outline answer is read as lat, lng rings; a query error is a reason, never an empty list', () => {
  const j = { features: [{ attributes: { building_id: 7, name: '', use_: 'Unknown' }, geometry: { rings: [[[174.7, -36.8], [174.71, -36.8], [174.71, -36.81]]] } }] };
  assert.deepEqual(parseOutlines(j), [{ id: '7', name: null, use: null, ring: [[-36.8, 174.7], [-36.8, 174.71], [-36.81, 174.71]] }]);
  assert.throws(() => parseOutlines({ error: { message: 'bad' } }), /bad/);
  assert.match(outlinesQuery(DOMAIN.lat, DOMAIN.lng), /LINZ_NZ_Building_Outlines.*outSR=4326/);
});

// ---- the answer key: stops ---------------------------------------------------------------------------------------------------------------
test('the nearest stops, nearest first, within 800 m; a station stands for its platforms and carries their routes', () => {
  const at = (de, dn) => fromEN(DOMAIN, de, dn);
  const p1 = at(0, 120), p2 = at(500, 0), p3 = at(0, 900), st = at(-300, -300);
  const stops = { stops: [['s1', '7001', 'Park Road', p1.lat, p1.lng, 0, -1, [0]], ['s2', '7002', 'Domain Drive', p2.lat, p2.lng, 0, -1, [0, 1]], ['s3', '7003', 'Too Far', p3.lat, p3.lng, 0, -1, [0]], ['st', '', 'Grafton Train Station', st.lat, st.lng, 1, -1, []], ['pl', '9201', 'Grafton 1', st.lat, st.lng, 0, 3, [2]]] };
  const routes = { routes: [{ id: 'r1', short: '27', type: 3 }, { id: 'r2', short: '75', type: 3 }, { id: 'r3', short: 'WEST', type: 2 }] };
  const got = nearStops(stops, routes, DOMAIN);
  assert.deepEqual(got.map((s) => [s.name, s.m]), [['Park Road', 120], ['Grafton Train Station', 424], ['Domain Drive', 500]]);
  assert.deepEqual(got[1].routes, ['WEST']); assert.deepEqual(got[1].modes, ['train']);
  assert.ok(inAuckland(DOMAIN)); assert.ok(!inAuckland({ lat: -41.29, lng: 174.78 }));
});

// ---- the brief ---------------------------------------------------------------------------------------------------------------------------
const FACTS = [
  { id: 'site.zone', label: 'Zone', status: 'live', value: 'Open Space – Sport and Active Recreation', unit: '', asOf: '2026-11-01', source: { name: 'Auckland Unitary Plan' }, licence: { attribution: 'Contains data from Auckland Council, CC BY 4.0.' } },
  { id: 'site.coastalInundation', label: 'Coastal storm-tide flooding', status: 'live', value: 'outside the mapped extent today', unit: '', asOf: null, source: { name: 'Auckland Council' }, licence: { attribution: 'Auckland Council CC BY 4.0' } },
  { id: 'site.nzs3604Zones', label: 'Wind, earthquake, exposure and snow zones (NZS 3604)', status: 'not-wired', reason: 'Not wired: terms. BRANZ Maps has no open service.' },
];
const G = () => ({
  project: { id: 'p_test', site: { lat: DOMAIN.lat, lon: DOMAIN.lng, facts: FACTS, fetched_at: '2026-12-20T22:00:00Z' }, site_sources: { camera_path: { pts: [[0, 0], [10, 5], [20, 0]], traced_by: 'tool', confirmed_by: null } } },
  intake: { updated_at: '2026-12-20T21:00:00Z', sheets: [{ id: 'set.pdf#1', file: 'set.pdf', page: 1, number: 'A-001', title: 'Site Plan', scale: '1:200 @ A3', w_mm: 420, date_iso: '2026-12-01', from: 'text' }, { id: 'set.pdf#2', file: 'set.pdf', page: 2, number: 'A-101', title: 'Ground Floor Plan', scale: '1:100', from: 'text' }], files: [] },
  words: { 'set.pdf#1': sheetWords(PAGE) },
  reads: { 'set.pdf#1': { read: READ, provider: 'openai', model: 'gpt-6.2-astra', at: '2026-12-21T01:00:00Z', mPerPx: M_PER_PX, prompts: SITEBRIEF_PROMPTS } },
  parcel: { ring: ring(parcelEN), area_m2: 1200, asOf: '2026-11-20' },
  outlines: [{ id: 'a', name: null, use: 'Residential', ring: ring(bldgEN.dwelling) }, { id: 'b', name: null, use: null, ring: ring(bldgEN.garage) }],
  lidar: { dem: { survey: 'Auckland LiDAR 1m DEM (2024)', captured: '2024-03-01', licence: 'CC BY 4.0' }, dsm: { none: true } },
  weather: { values: { at: '2026-12-21T15:00', tempC: 21.4, windKmh: 14, cloudPct: 30, sunrise: '2026-12-21T05:58', sunset: '2026-12-21T20:41' }, source: { name: 'Open-Meteo' } },
  forecast: { values: { place: 'Auckland', today: { minC: 16, maxC: 24, rainChancePct: 10 } }, source: { name: 'Open-Meteo' } },
  stops: [{ id: 's1', name: 'Park Road', m: 120, routes: ['27'], modes: ['bus'] }], gtfs: { built: '2026-11-23T00:16:54Z', feedStart: '20261112', feedEnd: '20270207' }, atLive: 'off',
  model: modelFacts({ ifc: { classes: { IfcWall: 40, IfcDoor: 12, IfcWindow: 18 }, storey_count: 2 } }), flight: { shots: 6, version: 2, status: 'proposed' },
});

test('the brief: every item has a value, a source, a date, a licence and one of read, measured, live, assumed, proposed', () => {
  const b = buildBrief(G(), { now: NOW });
  assert.equal(b.type, TYPE); assert.equal(briefProblem(b), '');
  for (const i of b.items) { assert.ok(LABELS.includes(i.label), i.id); assert.ok(i.source, i.id); assert.ok('date' in i && 'licence' in i && 'value' in i, i.id); }
  for (const i of b.items.filter((x) => x.group === 'drawings' && !x.id.startsWith('drawings.fit') && x.id !== 'drawings.sheets')) { assert.ok(HOWS.includes(i.how), `${i.id} has how`); assert.equal(i.sheet, 'A-001'); }
  const ids = new Set(b.items.map((i) => i.id));
  for (const id of ['drawings.sheet.A-001', 'drawings.north.A-001', 'drawings.fit.A-001', 'site.zone', 'linz.parcel', 'linz.outlines', 'linz.dem', 'live.sun', 'live.golden', 'live.weather', 'live.forecast', 'transport.stop.s1', 'model.storeys', 'model.path', 'model.shots']) assert.ok(ids.has(id), id);
  assert.equal(b.items.find((i) => i.id === 'drawings.existing.read.A-001.0').how, 'scaled', 'an outline measured on the sheet at its printed scale is scaled');
  assert.equal(b.items.find((i) => i.id === 'model.path').label, 'proposed', 'an unconfirmed camera path is proposed');
});
test('the brief names the LINZ outlines from the site plan, and carries the parcel, the drawn boundary and the future stage for the 3D page', () => {
  const b = buildBrief(G(), { now: NOW });
  assert.deepEqual(b.scene.existing.map((e) => [e.label, e.tag]), [['EXISTING DWELLING', 'read'], ['GARAGE', 'read']]);
  assert.deepEqual(b.scene.boundary.map((r) => [r.kind, r.tag]), [['future', 'proposed'], ['drawn', 'assumed'], ['parcel', 'measured']]);
  assert.ok(Math.abs(b.scene.sun.alt - sunAt(DOMAIN.lat, DOMAIN.lng, NOW).alt) < 0.1);
  assert.ok(b.scene.sun.golden?.from);
});
test('gaps are said plainly: tide, aerial imagery, survey, NZS 3604 zones, live arrivals, DSM', () => {
  const b = buildBrief(G(), { now: NOW }), say = (w) => b.gaps.find((x) => x.what === w)?.why ?? '';
  assert.match(say('Tide'), /^not connected/);
  assert.match(say('Aerial imagery'), /^not connected/);
  assert.match(say('Topographic survey'), /^no survey/);
  assert.match(say('Live arrivals'), /^not connected/);
  assert.match(say('Wind, earthquake, exposure and snow zones (NZS 3604)'), /^not connected/);
  assert.match(say('LiDAR surface (1 m DSM)'), /no survey/);
  assert.ok(!b.items.some((i) => i.group === 'live' && /tide/i.test(i.name)), 'no tide value is made up');
});
test('with nothing gathered the brief is all gaps and no values; it never invents a number', () => {
  const b = buildBrief({ project: { id: 'p0' } }, { now: NOW });
  assert.equal(b.items.length, 0); assert.equal(b.point, null);
  assert.ok(b.gaps.some((x) => x.what === 'Site point')); assert.ok(b.gaps.some((x) => x.what === 'Drawing set'));
});
test('without a picture read the site plan says so, and its printed words still count, as written', () => {
  const g = G(); delete g.reads;
  const b = buildBrief(g, { now: NOW });
  assert.ok(b.gaps.some((x) => x.what === 'A-001 picture read' && /paid/.test(x.why)));
  assert.ok(b.items.filter((i) => i.how === 'written').length >= 6);
  assert.deepEqual(b.scene.existing.map((e) => e.tag), ['measured', 'measured'], 'unmatched outlines stay LINZ’s');
});
test('the public sample: the plan model’s own site gives the drawings and the model counts', () => {
  const plan = JSON.parse(readFileSync(new URL('../../plan-studio/twins/drop/hero.plan.json', import.meta.url)));
  const b = buildBrief({ project: { id: 'p_sample', sample: true, site: { lat: DOMAIN.lat, lon: DOMAIN.lng } }, planSite: { features: plan.site.features, north: plan.site.north, terrain: { ffl: plan.site.terrain.ffl } }, model: modelFacts({ plan }) }, { now: NOW });
  assert.equal(briefProblem(b), '');
  assert.ok(b.items.some((i) => i.id === 'drawings.sample.boundary'));
  assert.ok(b.items.some((i) => i.id === 'model.count.walls' && i.value > 0));
  assert.ok(b.scene.features.some((f) => f.kind === 'boundary' && f.pts.length >= 3));
});
test('the hand-over copy drops long notes but keeps every source and label; a bad brief is not handed over', () => {
  const b = buildBrief(G(), { now: NOW }), h = briefForHandoff(b);
  assert.equal(h.items.length, b.items.length); assert.ok(h.items.every((i) => !('note' in i) && i.source && i.label));
  assert.equal(briefForHandoff({ ...b, items: [{ ...b.items[0], label: 'guessed' }] }), null);
  assert.equal(briefForHandoff(null), null);
});
test('a person approves the brief by name; an item with a label outside the contract is refused', () => {
  const b = buildBrief(G(), { now: NOW });
  assert.throws(() => approveBrief(b, '  '), /names the person/);
  const a = approveBrief(b, 'A Person', NOW);
  assert.equal(a.status, 'approved'); assert.equal(a.approval.by, 'A Person'); assert.match(a.approval.note, /Not a planning/);
  assert.throws(() => item({ id: 'x', group: 'live', name: 'x', source: 's', label: 'guessed' }), /label/);
  assert.throws(() => item({ id: 'x', group: 'drawings', name: 'x', source: 's', label: 'read', how: 'eyeballed' }), /how/);
});

// ---- the paid read: the plan reader's sitebrief mode, offline ------------------------------------------------------------------------------
test('the sitebrief read rides the plan reader’s chain: OpenAI first, and the answer is checked against the schema', async () => {
  const real = globalThis.fetch, warn = console.warn, calls = []; console.warn = () => {};
  globalThis.fetch = async (url, init) => { calls.push({ host: new URL(url).host, body: JSON.parse(init.body) }); return new Response(JSON.stringify({ model: 'gpt-x', choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(READ) } }] }), { status: 200 }); };
  try {
    const res = await onRequest({ request: new Request('https://x.test/api/plan-read/', { method: 'POST', body: JSON.stringify({ image: 'data:image/jpeg;base64,' + Buffer.from('x').toString('base64'), mode: 'sitebrief' }) }), env: { OPENAI_API_KEY: 'fake-KEY', GEMINI_API_KEY: 'g', ANTHROPIC_API_KEY: 'a' } });
    const j = await res.json();
    assert.equal(res.status, 200); assert.equal(j.mode, 'sitebrief'); assert.equal(j.prompts, SITEBRIEF_PROMPTS); assert.equal(j.provider, 'openai');
    assert.equal(calls.length, 1); assert.equal(calls[0].body.model, 'gpt-6.2-astra'); assert.ok(calls[0].body.response_format.json_schema.schema.properties.existing);
    const st = await (await onRequest({ request: new Request('https://x.test/api/plan-read/'), env: {} })).json();
    assert.equal(st.modes.sitebrief, SITEBRIEF_PROMPTS);
  } finally { globalThis.fetch = real; console.warn = warn; }
});

// ---- wiring ----------------------------------------------------------------------------------------------------------------------------------
test('the site brief is an add-on on the Site tab, and the walkthrough hands it across with one marked line', async () => {
  assert.ok(ADDONS.includes('./site-brief.js'));
  await import('../../architecture/js/site-brief.js');
  const p = projectPanels().find((x) => x.id === 'site-brief');
  assert.equal(p?.tab, 'site');
  const src = readFileSync(new URL('../../architecture/js/site-sources.js', import.meta.url), 'utf8');
  assert.equal(src.split('\n').filter((l) => l.includes('site agent (feat/site-agent)')).length, 1);
  assert.equal(PAID_CAP, 6);
});
