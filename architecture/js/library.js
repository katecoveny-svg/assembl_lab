// Library: an add-on for the ops page (see modules.js). On each project's Presentation tab, a scrolling library of
// furniture, lighting, planting, fittings and finishes shown as studio pictures; a person picks what they like, with a
// quantity and a room, and the picks go on the project's selection board and across to the 3D page.
//
// Loaded with the page: this file only (a few hundred bytes of work). Loaded when the Presentation tab is first shown:
// library-view.js, library.css, the catalogue (/plan-studio/twins/library/catalogue.json) and, as they scroll into
// view, the pictures. Nothing here loads three.js.

import { registerProjectPanel } from './modules.js';

let view = null; // the loaded library-view.js module
const loadView = () => (view ??= import('./library-view.js'));

registerProjectPanel({
  id: 'library',
  title: 'Library',
  order: 20,
  tab: 'presentation',
  render(el, ctx) {
    if (!ctx.project) return undefined;
    const pane = el.closest('[role="tabpanel"]');
    let stop = null, gone = false;
    const open = async () => {
      if (gone || stop) return;
      stop = () => {};
      try { const m = await loadView(); if (!gone) stop = (await m.renderLibrary(el, ctx)) ?? (() => {}); }
      catch (err) { el.innerHTML = `<p class="small">□ The library could not open: ${ctx.esc(err?.message ?? 'it did not load')}.</p>`; }
    };
    if (!pane || !pane.hidden) { void open(); return () => { gone = true; stop?.(); }; }
    // the tab is hidden: wait until it is shown, so a page that never opens Presentation never loads the library
    el.innerHTML = '<p class="small lib-wait">Library: furniture, lighting, planting and fittings. Opens with this tab.</p>';
    const watch = new MutationObserver(() => { if (!pane.hidden) { watch.disconnect(); void open(); } });
    watch.observe(pane, { attributes: true, attributeFilter: ['hidden'] });
    return () => { gone = true; watch.disconnect(); stop?.(); };
  },
});
