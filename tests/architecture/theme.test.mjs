// The look of the workspace: which theme is shown, who chooses it, and where the choice is kept. No browser, no network.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { THEMES, DEFAULT_THEME, LOOK_SETTING, LOOK_CACHE, FONT_HREF, FONT_LINK_ID, pickTheme, applyTheme, lookChoiceHtml, isTheme } from '../../architecture/js/theme.js';
import { createStore, memoryBackend, memoryFiles } from '../../architecture/js/store.js';
import { createSwitch, createCloudStore, createGateway, createTeam } from '../../architecture/js/cloud.js';
import { mountAccount } from '../../architecture/js/account.js';
import { sampleProject } from '../../architecture/js/model.js';
import { AUTH_STORAGE_KEY } from '../../architecture/js/config.js';
import { fakeSupabase } from './fake-supabase.mjs';

const root = new URL('../../', import.meta.url);
const file = (p) => readFileSync(new URL(p, root), 'utf8');
const ME = '00000000-0000-4000-8000-00000000a11c', PRACTICE = '11111111-1111-4111-8111-111111111111', OTHER = '22222222-2222-4222-8222-222222222222';
const tick = (ms = 15) => new Promise((r) => setTimeout(r, ms));

/** a stand-in for the document: <html>, <head> and getElementById, enough for applyTheme */
function fakeDoc() {
  const head = { children: [], append(el) { this.children.push(el); } };
  return { documentElement: { dataset: {} }, head, createElement: (tag) => ({ tag }), getElementById: (id) => head.children.find((c) => c.id === id) ?? null };
}
const memStorage = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => void m.set(k, String(v)), m }; };

test('who chooses: the practice in use, else this browser; anything unknown is the default', () => {
  assert.deepEqual(Object.keys(THEMES), ['assembl', 'sketch']);
  assert.equal(DEFAULT_THEME, 'assembl');
  assert.deepEqual(pickTheme({ practice: { id: PRACTICE, theme: 'sketch' }, browser: 'assembl' }), { theme: 'sketch', scope: 'practice' });
  assert.deepEqual(pickTheme({ practice: { id: PRACTICE, theme: '' }, browser: 'sketch' }), { theme: 'assembl', scope: 'practice' }, 'a practice that has not chosen shows the default, not this browser’s choice');
  assert.deepEqual(pickTheme({ practice: null, browser: 'sketch' }), { theme: 'sketch', scope: 'browser' });
  assert.deepEqual(pickTheme({ browser: 'neon' }), { theme: 'assembl', scope: 'browser' });
  assert.deepEqual(pickTheme(), { theme: 'assembl', scope: 'browser' });
  assert.equal(isTheme('toString'), false, 'only the two looks count, not anything an object happens to have');
});

test('showing a look: <html> is marked, the sketch typefaces load once and only for sketch, and the look is remembered', () => {
  const doc = fakeDoc(), ls = memStorage();
  assert.equal(applyTheme(doc, 'assembl', ls), 'assembl');
  assert.equal(doc.documentElement.dataset.theme, undefined, 'the default look adds nothing to <html>: the page is exactly as it was');
  assert.equal(doc.head.children.length, 0, 'no sketch typefaces are loaded for the default look');
  assert.equal(ls.getItem(LOOK_CACHE), 'assembl');
  applyTheme(doc, 'sketch', ls); applyTheme(doc, 'sketch', ls);
  assert.equal(doc.documentElement.dataset.theme, 'sketch');
  assert.equal(doc.head.children.length, 1, 'the typefaces are asked for once');
  assert.deepEqual({ id: doc.head.children[0].id, rel: doc.head.children[0].rel, href: doc.head.children[0].href }, { id: FONT_LINK_ID, rel: 'stylesheet', href: FONT_HREF });
  assert.match(FONT_HREF, /Hanken\+Grotesk:wght@200\.\.500/); assert.match(FONT_HREF, /Spectral:ital,wght@1,300/);
  assert.equal(ls.getItem(LOOK_CACHE), 'sketch');
  applyTheme(doc, 'assembl', ls);
  assert.equal(doc.documentElement.dataset.theme, undefined, 'back to the default: the mark is taken off');
  assert.doesNotThrow(() => applyTheme(fakeDoc(), 'sketch', { setItem() { throw new Error('blocked'); } }), 'storage that refuses does not stop the look');
});

test('the page opens in the last look before sign-in answers: index.html reads the same key and loads the same typefaces', () => {
  const html = file('architecture/index.html');
  const early = html.match(/<script>([^<]*)<\/script>/)?.[1] ?? '';
  assert.ok(early.includes(`'${LOOK_CACHE}'`), 'the early script reads the remembered look');
  assert.ok(early.includes(FONT_HREF), 'and loads the same typefaces as theme.js');
  assert.ok(early.includes(`'${FONT_LINK_ID}'`), 'under the same id, so they are not loaded twice');
  assert.doesNotMatch(html.replace(early, ''), /Hanken|Spectral/, 'nowhere else does the page ask for the sketch typefaces');
});

test('the tokens: the default look keeps its colours, and the sketch look has the agreed ones', () => {
  const css = file('architecture/ops.css');
  const block = (sel) => css.slice(css.indexOf(`${sel} {`), css.indexOf('}', css.indexOf(`${sel} {`)));
  const def = block(':root'), sk = block('html[data-theme="sketch"]');
  for (const [k, v] of [['--plum', '#654A4E'], ['--rose', '#E3D0D2'], ['--paper', '#FFFDFB'], ['--line', 'rgba(101, 74, 78, .28)'], ['--hair', 'rgba(101, 74, 78, .14)'], ['--grid', 'rgba(101, 74, 78, .07)']]) assert.ok(def.includes(`${k}: ${v};`), `${k} is still ${v}`);
  for (const [k, v] of [['--paper', '#000000'], ['--panel', '#0A0C14'], ['--field', '#060A1D'], ['--hair', '#1E2334'], ['--line', '#2C3452'], ['--ink', '#FFFFFF'], ['--body', '#D6D9E4'], ['--mute', '#9AA1B8'], ['--blue', '#8BA2FF'], ['--blue-strong', '#5076FF'], ['--go', '#3DD68C'], ['--needs', '#FF9A3C']]) assert.ok(sk.includes(`${k}: ${v};`), `sketch ${k} is ${v}`);
  assert.match(sk, /--sans: "Hanken Grotesk"/); assert.match(sk, /--mono: "Hanken Grotesk"/);
  // every token the sketch look sets has a value in the default look too, so an add-on using it looks right in both
  for (const k of sk.match(/--[a-z-]+(?=:)/g)) if (k !== '--serif') assert.ok(def.includes(`${k}:`), `${k} has a default`);
  assert.match(css, /@media print \{\s*\/\*[^*]*\*\/\s*html\[data-theme="sketch"\] \{[^}]*--paper: #FFFDFB;/, 'paper prints in the default look');
});

test('contrast: blue on black, quiet text on the panel, and the main button pass AA', () => {
  const lum = (hex) => { const c = hex.match(/\w\w/g).map((x) => parseInt(x, 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
  assert.ok(ratio('#8BA2FF', '#000000') >= 4.5, 'line blue on black');
  assert.ok(ratio('#8BA2FF', '#0A0C14') >= 4.5, 'line blue on a panel');
  assert.ok(ratio('#9AA1B8', '#0A0C14') >= 4.5, 'quiet text on a panel');
  assert.ok(ratio('#9AA1B8', '#060A1D') >= 4.5, 'quiet text on a field');
  assert.ok(ratio('#D6D9E4', '#0A0C14') >= 4.5, 'running text on a panel');
  assert.ok(ratio('#000000', '#8BA2FF') >= 4.5, 'black type on the blue main button');
  assert.ok(ratio('#5A6488', '#060A1D') >= 3, 'an input’s border against its field (3:1 for a control)');
  assert.ok(ratio('#3DD68C', '#0A0C14') >= 3 && ratio('#FF9A3C', '#0A0C14') >= 3, 'status dots stand out from the panel');
  assert.ok(ratio('#2F6B4F', '#FFFDFB') >= 3 && ratio('#A4541A', '#FFFDFB') >= 3, 'and in the default look');
});

test('the chooser: the look in use is pressed, and one that cannot be changed says who chooses', () => {
  const mine = lookChoiceHtml({ theme: 'sketch', scope: 'browser' });
  assert.match(mine, /data-look="sketch" aria-pressed="true"/); assert.match(mine, /data-look="assembl" aria-pressed="false"/);
  assert.doesNotMatch(mine, /disabled/); assert.match(mine, /For this browser only/);
  const member = lookChoiceHtml({ theme: 'assembl', scope: 'practice', canChange: false, practice: 'Tui <Architects>' });
  assert.equal((member.match(/ disabled/g) ?? []).length, 2);
  assert.match(member, /Chosen by an owner of Tui &lt;Architects&gt;/, 'the practice name is escaped');
  assert.match(lookChoiceHtml({ theme: 'assembl', scope: 'practice', canChange: true, practice: 'Tui' }), /For everyone in Tui/);
});

test('this browser keeps its own look as a setting, and settings stay in the browser even when records are shared', async () => {
  const local = createStore(memoryBackend(), { files: memoryFiles() }), store = createSwitch(local);
  await store.save('setting', { id: LOOK_SETTING, value: 'sketch' });
  assert.equal((await store.get('setting', LOOK_SETTING)).value, 'sketch');
  const fake = fakeSupabase({ userId: ME });
  store.use(createCloudStore({ client: fake, practice: { id: PRACTICE, name: 'Tui', role: 'owner' }, local }));
  assert.equal((await store.get('setting', LOOK_SETTING)).value, 'sketch', 'read from this browser');
  await store.save('setting', { id: LOOK_SETTING, value: 'assembl' });
  assert.equal(fake.writes().length, 0, 'a browser’s look is never written to the shared records');
  assert.equal((await local.get('setting', LOOK_SETTING)).value, 'assembl');
});

test('the practice’s look: read by anyone in it, changed by an owner only, and the rest of extra is kept', async () => {
  const fake = fakeSupabase({ userId: ME }), team = createTeam(createGateway(fake));
  fake.db.practice = [{ id: PRACTICE, name: 'Tui', created_by: ME, extra: { kept: 1 } }, { id: OTHER, name: 'Kahu', created_by: ME }];
  assert.equal(await team.look(PRACTICE), '');
  assert.equal(await team.look(OTHER), '', 'a practice row with no extra at all');
  assert.equal(await team.setLook(PRACTICE, 'sketch'), 'sketch');
  assert.deepEqual(fake.db.practice[0].extra, { kept: 1, theme: 'sketch' }, 'only the theme is added');
  assert.equal(await team.look(PRACTICE), 'sketch');
  const upd = fake.writes().find((w) => w.table === 'practice' && w.action === 'update');
  assert.deepEqual(upd.filters, [['eq', 'id', PRACTICE]], 'one practice, by its id');
  fake.viewer = true; // the database changes nothing for anyone who is not an owner
  await assert.rejects(team.setLook(PRACTICE, 'assembl'), (e) => e.code === 'refused' && /only an owner/.test(e.message) && /Nothing was changed/.test(e.message));
  assert.equal(fake.db.practice[0].extra.theme, 'sketch');
  await assert.rejects(team.setLook(PRACTICE, '<b>'), /Choose a look/);
});

async function signedIn({ role = 'owner', theme, second = false } = {}) {
  const fake = fakeSupabase({ userId: ME, rpc: { my_invitations: () => [], practice_people: () => [] } });
  fake.db.practice = [{ id: PRACTICE, name: 'Tui Architects', created_by: ME, extra: theme ? { theme } : {} }];
  fake.db.practice_member = [{ practice_id: PRACTICE, user_id: ME, role }];
  if (second) { fake.db.practice.push({ id: OTHER, name: 'Kahu Studio', created_by: ME, extra: { theme: 'sketch' } }); fake.db.practice_member.push({ practice_id: OTHER, user_id: ME, role: 'member' }); }
  const session = { access_token: 'x.y.z', user: { id: ME, email: 'mere@example.org', user_metadata: { full_name: 'Mere Ngata' } } };
  fake.auth = { getSession: async () => ({ data: { session }, error: null }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }), refreshSession: async () => ({ data: { session: null }, error: { message: 'no' } }), signOut: async () => ({ error: null }), signInWithOAuth: async () => ({ data: {}, error: null }) };
  const mem = new Map([[AUTH_STORAGE_KEY, 'kept'], ['assembl.architecture.practice', PRACTICE]]);
  const win = { location: { href: 'https://lab.assembl.co.nz/architecture/', hash: '' }, history: { state: null, replaceState() {} }, localStorage: { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, String(v)), removeItem: (k) => void mem.delete(k) } };
  const el = () => ({ innerHTML: '', hidden: false, listeners: {}, addEventListener(t, fn) { this.listeners[t] = fn; } });
  const local = createStore(memoryBackend(), { files: memoryFiles() }), store = createSwitch(local), slot = el(), panel = el();
  await local.saveProject(sampleProject());
  const account = mountAccount({ store, local, slot, panel, nameLabel: el(), win, loadClient: async () => ({ createClient: () => fake }) });
  await account.ready;
  for (let i = 0; i < 40 && account.state.phase !== 'in'; i++) await tick(5);
  await tick();
  return { account, fake, slot, panel, store };
}

test('signed in: the practice’s look is read before the page shows it, and an owner can change it', async () => {
  const p = await signedIn({ theme: 'sketch' });
  assert.equal(p.store.shared, true);
  assert.equal(p.account.state.practice.theme, 'sketch');
  assert.deepEqual(pickTheme({ practice: p.account.state.practice, browser: 'assembl' }).theme, 'sketch');
  await p.account.setLook('assembl');
  assert.equal(p.fake.db.practice[0].extra.theme, 'assembl');
  assert.equal(p.account.state.practice.theme, 'assembl');
  // the practice panel shows the chooser, changeable by an owner
  await p.slot.listeners.click({ target: { closest: () => ({ dataset: { acct: 'toggle' } }) } });
  await tick();
  assert.match(p.panel.innerHTML, /Look/);
  assert.match(p.panel.innerHTML, /data-look="assembl" aria-pressed="true"/);
  assert.doesNotMatch(p.panel.innerHTML.match(/<div class="look"[\s\S]*?<\/div>/)[0], /disabled/);
});

test('signed in as a member: the look is shown, and changing it is refused before anything is sent', async () => {
  const p = await signedIn({ role: 'member', theme: 'sketch' });
  const before = p.fake.writes().length;
  await assert.rejects(p.account.setLook('assembl'), /Only an owner of Tui Architects/);
  assert.equal(p.fake.writes().length, before);
  await p.slot.listeners.click({ target: { closest: () => ({ dataset: { acct: 'toggle' } }) } });
  await tick();
  assert.match(p.panel.innerHTML, /Chosen by an owner of Tui Architects/);
});

test('more than one practice: a switcher in the header, and switching reads the other practice’s look', async () => {
  const one = await signedIn();
  assert.doesNotMatch(one.slot.innerHTML, /data-acct-switch/, 'one practice: no switcher');
  const p = await signedIn({ second: true });
  assert.match(p.slot.innerHTML, /<select data-acct-switch/);
  assert.match(p.slot.innerHTML, /Kahu Studio/);
  await p.slot.listeners.change({ target: { closest: (sel) => (sel === 'select[data-acct-switch]' ? { value: OTHER } : null) } });
  await tick();
  assert.equal(p.account.state.practice.id, OTHER);
  assert.equal(p.account.state.practice.theme, 'sketch');
});
