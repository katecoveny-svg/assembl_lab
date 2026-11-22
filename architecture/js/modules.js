// Add-on parts of the ops page register themselves here, and app.js draws them. Each add-on lives in its own files
// (models.js, crm.js, ...) and never edits app.js. app.js loads the add-ons listed in ADDONS before the first screen;
// one that is not there yet, or fails to load, is left out and the page carries on without it.
//
//   registerRoute('crm', { title: 'Clients', render(el, ctx, rest) { ... } })   → a screen at #/crm, #/crm/<rest...>
//   registerProjectPanel({ id: 'models', title: 'Models', order: 10, render(el, ctx) { ... } })   → a section on each project
//   registerNav({ id: 'crm', label: 'Clients', hash: '#/crm', order: 20 })   → a link in the top bar
//
// ctx, given to every render: { store, account, me, project (on a project page, else null), practice (the practice in use
// when signed in, else null), navigate(hash), redraw(flash?), esc(text) }. A render may be async and may return a function
// that app.js calls before the screen is drawn again (to stop timers, release a 3D view and so on).

/** the add-ons app.js tries to load, relative to this file */
export const ADDONS = ['./models.js', './crm.js'];

const routes = new Map();
const panels = [];
const nav = [];

const ID = /^[a-z][a-z0-9-]{0,30}$/;

export function registerRoute(name, mod) {
  if (!ID.test(name) || name === 'p') throw new Error(`An add-on screen needs a short lowercase name, not "${name}".`);
  if (typeof mod?.render !== 'function') throw new Error(`The add-on screen "${name}" has nothing to draw.`);
  routes.set(name, { title: String(mod.title ?? name), render: mod.render });
}

export function registerProjectPanel(panel) {
  if (!ID.test(panel?.id ?? '')) throw new Error('An add-on section needs a short lowercase id.');
  if (typeof panel.render !== 'function') throw new Error(`The add-on section "${panel.id}" has nothing to draw.`);
  const at = panels.findIndex((x) => x.id === panel.id);
  const entry = { id: panel.id, title: String(panel.title ?? panel.id), order: Number(panel.order ?? 50), render: panel.render };
  if (at >= 0) panels[at] = entry; else panels.push(entry);
}

export function registerNav(item) {
  if (!ID.test(item?.id ?? '') || typeof item.hash !== 'string' || !item.hash.startsWith('#/')) throw new Error('A top-bar link needs an id and a #/ address.');
  const at = nav.findIndex((x) => x.id === item.id);
  const entry = { id: item.id, label: String(item.label ?? item.id), hash: item.hash, order: Number(item.order ?? 50), icon: item.icon ? String(item.icon) : '' };
  if (at >= 0) nav[at] = entry; else nav.push(entry);
}

export const getRoute = (name) => routes.get(name) ?? null;
export const projectPanels = () => [...panels].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
export const navItems = () => [...nav].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));

/** load every add-on in ADDONS; returns the ones that loaded. Never throws. */
export async function loadAddons(importer = (p) => import(p)) {
  const got = await Promise.allSettled(ADDONS.map((p) => importer(p)));
  return ADDONS.filter((_, i) => got[i].status === 'fulfilled');
}

/** for tests: forget everything registered */
export function _reset() { routes.clear(); panels.length = 0; nav.length = 0; }
