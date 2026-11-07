// assembl lab home: small enhancements on top of a complete static page (see scripts/build-lab-home.cjs).
// Motion (split-text headlines, reveals, parallax, the glass "a" assembling) is /site-v2/site-v2.js, ported from
// assembl.co.nz on 8 Nov 2026; it replaced the DO glass orb (lab/orb.js), which carried lilac light.
// 3. Live labels: /feeds.js fires "assembl:live"; the static source lines stay as the fallback.
(() => {
  'use strict';
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
