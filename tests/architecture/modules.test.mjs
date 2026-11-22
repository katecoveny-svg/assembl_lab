// The add-on registry: add-ons register screens, project sections and top-bar links; a missing add-on is left out.
import test from 'node:test';
import assert from 'node:assert/strict';
import { registerRoute, registerProjectPanel, registerNav, getRoute, projectPanels, navItems, loadAddons, ADDONS, PANEL_TABS, _reset } from '../../architecture/js/modules.js';

test('screens, sections and links register and come back in order', () => {
  _reset();
  registerRoute('crm', { title: 'Clients', render() {} });
  registerProjectPanel({ id: 'b', title: 'B', order: 20, render() {} });
  registerProjectPanel({ id: 'a', title: 'A', order: 10, render() {} });
  registerNav({ id: 'crm', label: 'Clients', hash: '#/crm', order: 20 });
  registerNav({ id: 'models', label: 'Models', hash: '#/models', order: 10 });
  assert.equal(getRoute('crm').title, 'Clients');
  assert.equal(getRoute('nope'), null);
  assert.deepEqual(projectPanels().map((p) => p.id), ['a', 'b']);
  assert.deepEqual(navItems().map((n) => n.id), ['models', 'crm']);
});

test('registering the same id again replaces it', () => {
  _reset();
  registerProjectPanel({ id: 'a', title: 'First', render() {} });
  registerProjectPanel({ id: 'a', title: 'Second', render() {} });
  assert.deepEqual(projectPanels().map((p) => p.title), ['Second']);
});

test('bad names and empty add-ons are refused', () => {
  _reset();
  assert.throws(() => registerRoute('p', { render() {} }));
  assert.throws(() => registerRoute('Has Space', { render() {} }));
  assert.throws(() => registerRoute('crm', {}));
  assert.throws(() => registerProjectPanel({ id: 'x' }));
  assert.throws(() => registerNav({ id: 'x', hash: 'http://elsewhere' }));
});

test('a missing add-on is left out and the rest load', async () => {
  const got = await loadAddons(async (p) => { if (p === ADDONS[0]) throw new Error('404'); return {}; });
  assert.deepEqual(got, ADDONS.slice(1));
});

test('a section can ask for its tab; one that asks for none sits in the Model tab; an unknown tab is refused', () => {
  _reset();
  registerProjectPanel({ id: 'models', title: 'Models', render() {} });
  registerProjectPanel({ id: 'library', title: 'Library', tab: 'presentation', render() {} });
  assert.deepEqual(projectPanels().map((p) => [p.id, p.tab]), [['library', 'presentation'], ['models', 'model']]);
  assert.throws(() => registerProjectPanel({ id: 'x', tab: 'kitchen', render() {} }), /names a tab the project page does not have/);
  assert.ok(PANEL_TABS.includes('presentation') && PANEL_TABS.includes('model'));
});

test('the project page puts each section in the tab it asked for', async () => {
  const { readFileSync } = await import('node:fs');
  const app = readFileSync(new URL('../../architecture/js/app.js', import.meta.url), 'utf8');
  assert.match(app, /data-mod-panels="model"/);
  assert.match(app, /data-mod-panels="presentation"/);
  assert.match(app, /querySelector\(`\[data-mod-panels="\$\{pn\.tab \?\? 'model'\}"\]`\)/);
  for (const t of PANEL_TABS) assert.match(app, new RegExp(`\\['${t}', '`), `app.js has a ${t} tab`);
});
