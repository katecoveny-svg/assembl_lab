import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { twinLink, twinHandoff, TWIN_KEEP_KEY, TWIN_HANDOFF_HREF, TWIN_PAGE, HOSTED_MODELS } from '../../architecture/js/model.js';
import { modelFingerprint, describeModel } from '../../architecture/js/fingerprint.js';
import { sessionHandoff } from '../../architecture/js/store.js';

const root = new URL('../../', import.meta.url);
const file = (p) => readFileSync(new URL(p, root), 'utf8');
const src = file('plan-studio/twins/src/twin/projectPlan.ts');
const plan = { schema: 'assembl.plan-model.v1', job: { title: 'A practice’s own house', drawings: 'Set B' }, revision: { current: 'B' }, buildings: [{ id: 'house', levels: [] }], site: { features: [] } };

test('the hand-over uses the 3D page’s own key, shape and address', () => {
  // the key the 3D page keeps a dropped plan under
  const key = src.match(/const KEEP = '([^']+)'/)?.[1];
  assert.ok(key, 'found KEEP in the 3D page’s source');
  assert.equal(TWIN_KEEP_KEY, key);
  // what it writes there, and what it reads back
  assert.match(src, /sessionStorage\.setItem\(KEEP, JSON\.stringify\(\{ plan: input\.plan, name: input\.name \}\)\)/, 'the 3D page writes { plan, name }');
  assert.match(src, /JSON\.parse\(sessionStorage\.getItem\(KEEP\) \?\? 'null'\) as \{ plan: PlanModel; name: string \} \| null/, 'the 3D page reads { plan, name }');
  assert.match(src, /if \(kept\?\.plan\?\.buildings\) return/, 'it opens the kept plan when it has buildings');
  // which address makes it look: only one with ?fin
  // (?ground, from the real ground card, also reopens the kept plan; ?fin must still do so)
  assert.match(src, /if \(new URLSearchParams\(location\.search\)\.has\('fin'\)( \|\| new URLSearchParams\(location\.search\)\.has\('ground'\))?\) \{\s*try \{\s*const kept = JSON\.parse\(sessionStorage\.getItem\(KEEP\)/, 'the kept plan is read when the address has ?fin');
  assert.equal(TWIN_HANDOFF_HREF, `${TWIN_PAGE}?fin=`);
  assert.equal(new URLSearchParams(new URL(TWIN_HANDOFF_HREF, 'https://lab.assembl.co.nz').search).has('fin'), true);
  // ?fin (and no ?plan, ?share or ?drop) also stops the page opening its example instead
  assert.match(src, /const example = !qs\.has\('plan'\) && !qs\.has\('share'\) && !qs\.has\('fin'\) && !qs\.has\('drop'\)( && !qs\.has\('ground'\))?;/);
  // an empty ?fin= is read as "no finishes chosen", so the default finishes are used
  assert.match(file('plan-studio/twins/src/twin/finishes.ts'), /export function decode\(txt: string \| null\): Schedule \| null \{\s*if \(!txt\) return null;/);
});

test('the built 3D page that is live has the same key and the same ?fin door', () => {
  const dir = new URL('plan-studio/twins/drop/assets/', root);
  const built = readdirSync(dir).filter((f) => /^projectPlan-.*\.js$/.test(f)).map((f) => readFileSync(new URL(f, dir), 'utf8')).join('\n');
  assert.ok(built.includes(`"${TWIN_KEEP_KEY}"`) || built.includes(`'${TWIN_KEEP_KEY}'`), 'the bundle holds the key');
  assert.match(built, /\.has\(["']fin["']\)/, 'the bundle looks for ?fin');
});

test('what is handed over is the plan itself and the file’s name, and the version code survives the trip', () => {
  const text = JSON.stringify(plan, null, 2), h = twinHandoff(text, 'ridge-house.plan.json');
  assert.equal(h.key, TWIN_KEEP_KEY); assert.equal(h.href, TWIN_HANDOFF_HREF);
  const kept = JSON.parse(h.value);
  assert.deepEqual(Object.keys(kept), ['plan', 'name']);
  assert.equal(kept.name, 'ridge-house.plan.json');
  assert.ok(Array.isArray(kept.plan.buildings), 'the 3D page’s own check (kept.plan.buildings) passes');
  assert.deepEqual(kept.plan, plan);
  // the 3D page works the version code out from the plan it is given: it must be the code the project recorded
  assert.equal(modelFingerprint(kept.plan), describeModel(text, 'ridge-house.plan.json').fingerprint);
  assert.equal(twinHandoff(plan, '').href, TWIN_HANDOFF_HREF, 'a plan already read works too');
  assert.equal(JSON.parse(twinHandoff(plan, '').value).name, 'Plan model');
});

test('something that is not a plan model is refused in plain words', () => {
  assert.throws(() => twinHandoff('not json', 'a.json'), /not JSON, so it cannot be opened in 3D/);
  assert.throws(() => twinHandoff('{"rooms":[]}', 'a.json'), /no buildings in it, so it cannot be opened in 3D/);
  assert.throws(() => twinHandoff('null', 'a.json'), /no buildings/);
});

test('Open in 3D: hosted file by link, kept file by hand-over, anything else by choosing again', () => {
  assert.deepEqual(twinLink({ fingerprint: HOSTED_MODELS[0].fingerprint, file: { id: 'file_1' } }), { direct: true, href: `${TWIN_PAGE}?plan=hero.plan.json` }, 'a hosted model keeps its direct link');
  assert.deepEqual(twinLink({ fingerprint: 'aaaaaaaaaaaa', file: { id: 'file_1' } }), { direct: false, handoff: true, href: TWIN_HANDOFF_HREF });
  assert.deepEqual(twinLink({ fingerprint: 'aaaaaaaaaaaa', file: null }), { direct: false, href: `${TWIN_PAGE}?drop=1` });
  assert.deepEqual(twinLink({ fingerprint: 'aaaaaaaaaaaa' }), { direct: false, href: `${TWIN_PAGE}?drop=1` });
  assert.equal(twinLink({ fingerprint: '', file: { id: 'file_1' } }), null);
});

test('the session entry is written through the storage module, with a plain message when the browser refuses', () => {
  const had = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  try {
    const m = new Map();
    Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: { setItem: (k, v) => void m.set(k, v) } });
    const h = twinHandoff(plan, 'a.json');
    assert.equal(sessionHandoff(h.key, h.value), true);
    assert.equal(m.get(TWIN_KEEP_KEY), h.value);
    Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: { setItem: () => { throw new Error('QuotaExceededError'); } } });
    assert.throws(() => sessionHandoff(h.key, h.value), /too big to pass to the 3D page from here/);
    Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: undefined });
    assert.throws(() => sessionHandoff(h.key, h.value), /not letting the page pass the model/);
  } finally {
    if (had) Object.defineProperty(globalThis, 'sessionStorage', had); else delete globalThis.sessionStorage;
  }
});
