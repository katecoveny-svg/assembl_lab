// assembl lab home: small enhancements on top of a complete static page (see scripts/build-lab-home.cjs).
// 2. The DO glass orb: a small WebGL2 scene in the hero, loaded after first paint, skipped for reduced motion.
// 3. Live labels: /feeds.js fires "assembl:live"; the static source lines stay as the fallback.
(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  /* 2 ── DO glass orb ── */
  const host = document.getElementById('orb');
  function startOrb() {
    if (!host || reduced.matches) return;
    const probe = document.createElement('canvas');
    if (!probe.getContext('webgl2')) return;
    import('/lab/orb.js').then(m => m.mount(host)).catch(() => { /* the still orb stays */ });
  }
  if (document.readyState === 'complete') setTimeout(startOrb, 200);
  else addEventListener('load', () => (window.requestIdleCallback || setTimeout)(startOrb, { timeout: 1200 }));

  /* 3 ── live labels ── */
  function liveLabels(j) {
    const f = id => j && j.feeds && j.feeds[id] && !j.feeds[id].error ? j.feeds[id] : null;
    const set = (id, t) => document.querySelectorAll(`[data-live="${id}"]`).forEach(el => { if (t) el.textContent = t; });
    const ed = f('ed'), power = f('power'), fuel = f('fuel'), fpi = f('fpi');
    try {
      if (ed && ed.values.national) set('ed', `Health NZ: ${ed.values.national.pct}% seen in 6 h · ${ed.values.national.quarter}`);
      if (power) set('home', `Wholesale power ${power.value}c/kWh · ${power.values.date.slice(5)}`);
      if (fuel) set('office', `Petrol 91 $${fuel.values.petrol91Dollars.toFixed(2)} · ${fuel.period}`);
      if (fpi) { const t = `Food prices ${fpi.value > 0 ? '+' : ''}${fpi.value}% a year · ${fpi.period}`; ['kitchen', 'store', 'food'].forEach(id => set(id, t)); }
    } catch (err) { /* keep the static labels */ }
  }
  addEventListener('assembl:live', e => liveLabels(e.detail));
  if (window.__assemblLive) liveLabels(window.__assemblLive);
})();
