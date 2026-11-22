// Sign-in states and what the banner says in each, with a fake of Supabase's client and stand-ins for the page. No browser, no network.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore, memoryBackend } from '../../architecture/js/store.js';
import { newProject, sampleProject } from '../../architecture/js/model.js';
import { createSwitch } from '../../architecture/js/cloud.js';
import { mountAccount, readReturn, cleanReturn, returnProblem, pageAddress } from '../../architecture/js/account.js';
import { AUTH_STORAGE_KEY } from '../../architecture/js/config.js';
import { fakeSupabase, PGRST106, JWT_EXPIRED } from './fake-supabase.mjs';

const PAGE = 'https://lab.assembl.co.nz/architecture/';
const ME = '00000000-0000-4000-8000-00000000a11c', PRACTICE = '11111111-1111-4111-8111-111111111111';
const SESSION = { access_token: 'x.y.z', user: { id: ME, email: 'mere@example.org', user_metadata: { full_name: 'Mere Ngata' } } };
const tick = (ms = 15) => new Promise((r) => setTimeout(r, ms));
const text = (html) => String(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

async function page({ session = null, href = PAGE, role = 'owner', member = true, fail = null, marker = false } = {}) {
  const fake = fakeSupabase({ userId: ME, rpc: { my_invitations: () => [], practice_people: () => [] } });
  if (member) { fake.db.practice = [{ id: PRACTICE, name: 'Tui Architects' }]; fake.db.practice_member = [{ practice_id: PRACTICE, user_id: ME, role }]; }
  fake.fail = fail;
  let current = session; const signOuts = [];
  fake.auth = {
    getSession: async () => ({ data: { session: current }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    refreshSession: async () => ({ data: { session: null }, error: { message: 'no' } }),
    signOut: async (o) => { signOuts.push(o); current = null; return { error: null }; },
    signInWithOAuth: async (o) => { fake.oauth = o; return { data: {}, error: null }; },
  };
  const mem = new Map(session ? [[AUTH_STORAGE_KEY, 'kept']] : []);
  if (marker) mem.set('assembl.architecture.signin_started', String(Date.now() - 60000));
  const win = { location: { href, hash: new URL(href).hash }, history: { state: null, replaceState(_s, _t, u) { win.location.href = u; } },
    localStorage: { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => void mem.set(k, String(v)), removeItem: (k) => void mem.delete(k) } };
  const el = () => ({ innerHTML: '', hidden: false, addEventListener() {} });
  const local = createStore(memoryBackend()), store = createSwitch(local), slot = el(), panel = el(), nameLabel = el();
  await local.saveProject(sampleProject());
  const account = mountAccount({ store, local, slot, panel, nameLabel, win, loadClient: async () => ({ createClient: () => fake }) });
  await account.ready;
  for (let i = 0; i < 40 && (account.state.phase === 'starting' || (account.state.phase === 'out' && account.state.shared === 'unknown')); i++) await tick(5);
  await tick();
  return { account, store, local, fake, slot, panel, nameLabel, win, mem, signOuts };
}

test('what came back from Google is read, explained and cleaned off the address', () => {
  const bad = readReturn(`${PAGE}?error=access_denied&error_code=bad_oauth_callback&error_description=Unable+to+exchange+external+code#/`);
  assert.deepEqual(bad, { error: 'access_denied', code: 'bad_oauth_callback', description: 'Unable to exchange external code', hasCode: false });
  assert.match(returnProblem(bad), /came back with an error, so you are not signed in.*“Unable to exchange external code”.*allow-list/);
  assert.match(returnProblem(readReturn(`${PAGE}#error=access_denied&error_description=The+user+denied+access`)), /cancelled or refused, so you are not signed in/);
  assert.equal(returnProblem(readReturn(`${PAGE}#/p/abc/s/concept`)), '', 'a normal page link is not mistaken for an error');
  assert.equal(readReturn(`${PAGE}?code=abc123`).hasCode, true);
  assert.equal(cleanReturn(`${PAGE}?code=abc123&state=s#/p/abc`), `${PAGE}#/p/abc`);
  assert.equal(cleanReturn(`${PAGE}?error=x&error_description=y`), PAGE);
  assert.equal(cleanReturn(`${PAGE}#error=access_denied&error_description=no`), PAGE);
  assert.ok(returnProblem({ error: 'x', description: '<img src=x onerror=alert(1)>'.repeat(40) }).length < 520, 'what the other side said is cut short');
  assert.equal(pageAddress('https://lab.assembl.co.nz/architecture/?x=1#/p/abc/s/predesign/tool'), PAGE, 'the address given to Google never carries a project or anything else');
  assert.equal(pageAddress('https://lab.assembl.co.nz/architecture/index.html'), PAGE);
});

test('signed out: the browser store, and the banner says browser only', async () => {
  const p = await page({ fail: () => ({ code: '42501', message: 'permission denied for schema arch', status: 401 }) });
  assert.equal(p.store.shared, false);
  assert.equal(p.account.who(), null);
  assert.equal(text(p.account.truthHtml(true)), '■ Saved in this browser only. Sign in with Google to share records with your practice.');
  assert.match(p.slot.innerHTML, /Sign in with Google/);
  assert.equal(p.nameLabel.hidden, false, 'the typed name is still used');
  assert.equal(p.account.words().pointSaved, 'saved in this browser only');
  assert.match(text(p.account.truthHtml(false)), /not letting the page save/);
});

test('shared records not switched on yet: said in those words, signed out or signed in, and the browser store is kept', async () => {
  const off = () => ({ ...PGRST106, status: 406 });
  const out = await page({ fail: off });
  assert.equal(text(out.account.truthHtml(true)), '■ Saved in this browser only. Shared records are not switched on yet.');
  assert.equal(out.store.shared, false);
  const inn = await page({ session: SESSION, fail: off });
  assert.equal(text(inn.account.truthHtml(true)), '■ Saved in this browser only. Signed in. Shared records are not switched on yet.');
  assert.equal(inn.store.shared, false, 'signed in, but nothing is shared, and the page does not say it is');
  assert.equal(inn.account.state.practice, null);
  assert.ok(!/shared with/.test(inn.account.truthHtml(true)));
  await inn.store.saveProject(newProject({ name: 'Still local' }));
  assert.equal(inn.fake.writes().length, 0);
  assert.equal((await inn.local.list('project')).length, 2);
  assert.equal(inn.account.words().pointSaved, 'saved in this browser only');
});

test('signed in with a practice: the shared store, and the banner names the practice and the role', async () => {
  const p = await page({ session: SESSION, role: 'member' });
  assert.equal(p.store.shared, true);
  assert.equal(p.account.who(), 'Mere Ngata');
  assert.equal(text(p.account.truthHtml(true)), '■ Signed in and shared with Tui Architects. You are a member. The Sample stays in this browser.');
  assert.equal(p.nameLabel.hidden, true);
  assert.match(p.slot.innerHTML, /Mere Ngata/);
  assert.match(p.slot.innerHTML, /Sign out/);
  const real = newProject({ name: 'House' });
  assert.match(p.account.words(real.project).pointSaved, /^saved to the shared records of Tui Architects/);
  assert.equal(p.account.words(sampleProject().project).pointSaved, 'saved in this browser only', 'the Sample is always in the browser');
  await p.store.saveProject(real);
  assert.equal(p.fake.db.project.length, 1);
  assert.deepEqual((await p.local.list('project')).map((x) => x.name), ['A house on Waiheke Island'], 'signing in uploaded nothing, and the new project went to the practice');
  const v = await page({ session: SESSION, role: 'viewer' });
  assert.match(text(v.account.truthHtml(true)), /shared with Tui Architects\. You are a viewer: you can read everything and change nothing\./);
});

test('signed in but in no practice: nothing is shared, and the page says so', async () => {
  const p = await page({ session: SESSION, member: false });
  assert.equal(p.store.shared, false);
  assert.equal(text(p.account.truthHtml(true)), '■ Saved in this browser only. Signed in, but not in a practice yet: nothing is shared.');
  assert.equal(p.panel.hidden, false, 'the panel opens to start or join a practice');
  assert.match(p.panel.innerHTML, /Start a practice/);
  assert.match(p.panel.innerHTML, /mere@example\.org/);
});

test('a sign-in that comes back with an error, to the wrong place, or unfinished is explained, and nobody is signed in', async () => {
  const anon = () => ({ code: '42501', message: 'permission denied for schema arch', status: 401 });
  const a = await page({ href: `${PAGE}?error=server_error&error_description=Unable+to+exchange+external+code`, fail: anon });
  assert.match(a.panel.innerHTML, /came back with an error, so you are not signed in/);
  assert.equal(a.win.location.href, PAGE, 'the error is taken off the address');
  assert.equal(a.store.shared, false);
  const b = await page({ marker: true, fail: anon });
  assert.match(b.panel.innerHTML, /Sign-in did not come back to this page, so you are not signed in.*allow-list/);
  assert.equal(b.mem.has('assembl.architecture.signin_started'), false);
  const c = await page({ href: `${PAGE}?code=abc`, fail: anon });
  assert.match(c.panel.innerHTML, /could not be finished, so you are not signed in/);
  assert.equal(c.win.location.href, PAGE);
  const d = await page({ fail: anon });
  assert.equal(d.panel.hidden, true, 'no message when nothing went wrong');
});

test('a sign-in that has expired: back to the browser store, with the reason, and never a claim that records are shared', async () => {
  let expired = false;
  const p = await page({ session: SESSION, fail: () => (expired ? { ...JWT_EXPIRED, status: 401 } : null) });
  assert.equal(p.store.shared, true);
  expired = true;
  await assert.rejects(p.store.list('project'), /sign-in has expired/);
  await tick(30);
  assert.equal(p.store.shared, false);
  assert.equal(p.account.who(), null);
  assert.match(p.panel.innerHTML, /Your sign-in has expired\. Sign in again to open the shared records\. You are now looking at the records saved in this browser\./);
  assert.ok(!/shared with/.test(p.account.truthHtml(true)));
  assert.equal(p.signOuts.length, 1, 'the expired sign-in is forgotten in this browser');
  assert.match(p.slot.innerHTML, /Sign in with Google/);
});
