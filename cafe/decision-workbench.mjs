// Presentation adapter: all outcomes come from the existing deterministic CAFE engine.
export const DECISIONS = [
  { key: 'roster', title: 'Match shifts to demand', detail: 'Put the team where the busy hours are.', view: 'office', icon: '01' },
  { key: 'waste', title: 'Prep closer to sales', detail: 'Make to the forecast, with an 8% buffer.', view: 'cabinet', dinnerView: 'kitchen', icon: '02' },
  { key: 'direct', title: 'Try direct ordering', detail: 'Trade app fees for your own ordering costs.', view: 'counter', icon: '03' }
];

export function compareWeeks(baseline, current) {
  return ['ebitda', 'wasteKg', 'walked', 'hours', 'revenue', 'labour'].map(key => ({
    key, before: baseline[key], after: current[key], delta: current[key] - baseline[key]
  }));
}

export function decisionBrief({ state, baseline, current, levers, weather, money, fmt }) {
  const active = levers.filter(l => l.modes.includes(state.mode) && state[l.k]);
  return [
    'assembl / Café decision brief', 'DRAFT · FOR MANAGER REVIEW', '',
    'Fictional venue. Simulated outcomes on estimated inputs, not measured savings.',
    `Mode: ${state.mode === 'cafe' ? 'Café' : 'Restaurant and bar'}`,
    `Weather: ${weather}; month: ${state.month + 1}; demand: ${Math.round(state.demand * 100)}%; app commission: ${Math.round(state.commission * 100)}%; weekly rent: ${money(state.rent)}.`,
    `Changes tested: ${active.map(l => l.n).join('; ') || 'None — original setup'}`, '',
    'ORIGINAL SETUP → YOUR TEST / SAME SEVEN SIMULATED DAYS',
    `Weekly operating earnings (EBITDA): ${money(baseline.ebitda)} → ${money(current.ebitda)}`,
    `Food waste: ${fmt(baseline.wasteKg, 1)} kg → ${fmt(current.wasteKg, 1)} kg`,
    `Customers who walked away: ${fmt(baseline.walked)} → ${fmt(current.walked)}`,
    `Paid staff-hours: ${fmt(baseline.hours, 1)} h → ${fmt(current.hours, 1)} h`,
    `Sales excluding GST: ${money(baseline.revenue)} → ${money(current.revenue)}`, '',
    'Earnings exclude interest, tax, depreciation, owner pay and equipment purchase. Tool running costs are modelled. Compare changes together; individual gains overlap.',
    'The comparison uses the simulation, not imported venue files. Validate demand, staffing, costs and service quality against your own POS and timesheets before making a decision.',
    'Manager to review: ____________________   Decision / next trial: ____________________',
    'No roster, price, order or connected system has been changed.'
  ].join('\n');
}

export function mountDecisionDesk(api) {
  const $ = id => document.getElementById(id);
  document.body.classList.add('cafe-workbench');
  document.title = 'Café simulator · assembl';
  document.querySelector('.top .eyebrow').textContent = 'assembl / café simulator';
  const truth = document.createElement('p'); truth.className = 'desk-truth';
  truth.textContent = 'Fictional NZ venue · simulated outcomes';
  document.querySelector('.top > div').prepend(truth);
  const side = document.querySelector('.main > .side');
  const operations = document.createElement('details'); operations.className = 'desk-operations';
  operations.innerHTML = '<summary>On the floor <span>Queues, team & orders</span></summary>';
  const ops = document.createElement('div'); ops.className = 'side';
  while (side.firstChild) ops.append(side.firstChild);
  operations.append(ops);
  side.innerHTML = `<div class="decision-desk">
    <div class="desk-heading"><div><span class="eyebrow">Make a move</span><h2>What would you change?</h2></div><button class="desk-reset" id="deskReset">Reset</button></div>
    <div class="desk-decisions" role="group" aria-label="Quick experiments">${DECISIONS.map(d => `<button class="desk-decision" data-decision="${d.key}" aria-pressed="false"><span class="desk-number" aria-hidden="true">${d.icon}</span><span><strong>${d.title}</strong><small>${d.detail}</small></span><span class="desk-toggle" aria-hidden="true">+</span></button>`).join('')}</div>
    <div class="desk-result"><div class="desk-result-head"><span>Your week, tested</span><span id="deskCount">Original setup</span></div>
      <div class="desk-earnings"><div><span>Original</span><b id="deskBefore">—</b></div><span class="desk-arrow" aria-hidden="true">→</span><div><span>Your test</span><b id="deskAfter">—</b></div></div>
      <p class="desk-delta" id="deskDelta">Choose a change to compare.</p>
      <span class="desk-caption">Weekly operating earnings · EBITDA</span>
      <div class="desk-tradeoffs" id="deskTradeoffs"></div>
      <details class="desk-assumptions"><summary>What this comparison includes</summary><p>Same seven simulated days and customers. Estimated inputs; running costs included. Earnings exclude interest, tax, depreciation, owner pay and equipment purchase. This is a test of a proposal, not measured savings.</p><p id="deskConditions"></p></details>
    </div>
    <p class="desk-feedback" id="deskFeedback" role="status" aria-live="polite">Choose one change, then combine it with another.</p>
    <button class="desk-save" id="deskSave">Save decision brief <span aria-hidden="true">↗</span></button>
  </div>`;
  side.append(operations);
  side.querySelector('.decision-desk').id = 'decisions';
  const start = document.createElement('a'); start.href = '#decisions'; start.className = 'desk-start'; start.textContent = 'Try a change ↓';
  document.querySelector('.top .sub').after(start);

  // Keep every original control reachable, with the technical/financial detail on demand.
  const deep = document.createElement('details'); deep.className = 'desk-depth'; deep.id = 'workbench';
  deep.innerHTML = '<summary><span>Go deeper</span><span>All controls, accounts, your data & evidence</span></summary><nav class="desk-tabs" aria-label="Full workbench"></nav><div class="desk-panels"></div>';
  document.querySelector('.main').after(deep);
  const groups = [
    ['settings', 'All controls', ['levers']], ['accounts', 'The accounts', ['week']],
    ['data', 'Your data', ['connect']], ['evidence', 'Evidence & AI', ['proof', 'ai', 'sources']]
  ];
  const panels = deep.querySelector('.desk-panels'), nav = deep.querySelector('nav');
  function show(key) {
    for (const button of nav.children) button.setAttribute('aria-pressed', String(button.dataset.panel === key));
    for (const panel of panels.children) panel.hidden = panel.id !== `desk-${key}`;
    api.resize();
  }
  for (const [key, title, ids] of groups) {
    const button = document.createElement('button'); button.type = 'button'; button.dataset.panel = key;
    button.textContent = title; button.setAttribute('aria-controls', `desk-${key}`); button.onclick = () => show(key); nav.append(button);
    const panel = document.createElement('div'); panel.id = `desk-${key}`; panel.setAttribute('role', 'region'); panel.setAttribute('aria-label', title);
    for (const id of ids) panel.append($(id)); panels.append(panel);
  }
  const footer = document.querySelector('.wrap > footer');
  const fullNote = footer.querySelector('p'); $('sources').append(fullNote);
  $('sources').append($('assemblLive'));
  $('levers').querySelector('h2').textContent = 'Build your own test';
  $('levers').querySelector('.shead p').textContent = 'Combine changes or adjust demand, season and costs. Every result stays simulated.';
  $('weekH').textContent = 'Where the money goes';
  $('weekP').textContent = 'Your test beside the original setup, over the same seven days.';
  $('connect').querySelector('h2').textContent = 'Compare with your own numbers';
  // Import summaries are separate from the model: never imply a file trains or connects this simulation.
  const dataNote = document.createElement('p'); dataNote.className = 'desk-data-note';
  dataNote.textContent = 'Your files add a separate comparison column. They do not replace the simulation or connect to your POS.';
  $('connect').querySelector('.shead').after(dataNote);
  show('settings');

  // Secondary playback/display controls remain accessible in a compact disclosure.
  const bar = document.querySelector('.bar');
  const playback = document.createElement('details'); playback.className = 'desk-display';
  playback.innerHTML = '<summary>Playback & display</summary><div></div>';
  const content = playback.lastElementChild;
  for (const selector of ['.seg[aria-label="Speed"]', '#wxSel', '#wxChip', '#gfxSeg', '#activityView', '#gfxNote']) {
    const el = bar.querySelector(selector); if (el) content.append(el);
  }
  bar.append(playback);
  // Reveal existing targets before the shared stage scrolls to their operational panel.
  $('stagebox').addEventListener('click', event => {
    if (event.target.closest('[data-a="panel"]')) { operations.open = true; playback.open = true; }
  }, true);
  function revealTarget(target) {
    const panel = target?.closest('.desk-panels > div');
    if (panel) { deep.open = true; show(panel.id.replace('desk-', '')); }
    for (let ancestor = target?.parentElement; ancestor; ancestor = ancestor.parentElement)
      if (ancestor.tagName === 'DETAILS') ancestor.open = true;
  }
  document.addEventListener('click', event => {
    const anchor = event.target.closest('a[href^="#"]');
    if (anchor) revealTarget(document.getElementById(anchor.hash.slice(1)));
  });
  if (location.hash) revealTarget(document.getElementById(location.hash.slice(1)));

  const feedback = $('deskFeedback');
  side.querySelectorAll('[data-decision]').forEach(button => button.onclick = () => {
    const decision = DECISIONS.find(d => d.key === button.dataset.decision), state = api.state();
    const on = !state[decision.key]; api.change(decision.key, on);
    api.focus(state.mode === 'dinner' ? decision.dinnerView || decision.view : decision.view);
    feedback.textContent = `${decision.title} ${on ? 'added' : 'removed'}. ${$('deskDelta').textContent} Review the trade-offs below.`;
  });
  $('deskReset').onclick = () => { api.reset(); feedback.textContent = 'Changes cleared. Demand, season, weather and costs kept.'; };
  $('deskSave').onclick = () => {
    const text = decisionBrief({ state: api.state(), baseline: api.baseline(), current: api.current(), levers: api.levers, weather: api.weather(), money: api.money, fmt: api.fmt });
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'assembl-cafe-decision-brief.txt'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    feedback.textContent = 'Decision brief downloaded for manager review. Nothing has been sent or applied.';
  };
  const update = () => {
    const state = api.state(), comparison = compareWeeks(api.baseline(), api.current());
    const active = api.levers.filter(l => l.modes.includes(state.mode) && state[l.k]);
    const earnings = comparison.find(x => x.key === 'ebitda');
    feedback.textContent = active.length ? `${active.length} change${active.length > 1 ? 's' : ''} tested together. Compare the earnings and service trade-offs.` : 'Choose one change, then combine it with another.';
    $('deskCount').textContent = active.length ? `${active.length} change${active.length > 1 ? 's' : ''} tested` : 'Original setup';
    $('deskReset').disabled = !active.length;
    $('deskBefore').textContent = api.money(earnings.before); $('deskAfter').textContent = api.money(earnings.after);
    $('deskDelta').textContent = !active.length ? 'Choose a change to compare.' : Math.abs(earnings.delta) < .5 ? 'No change in weekly earnings.' : `${api.money(Math.abs(earnings.delta))} ${earnings.delta > 0 ? 'more' : 'less'} per week in this model.`;
    $('deskDelta').dataset.direction = earnings.delta > .5 ? 'up' : earnings.delta < -.5 ? 'down' : 'same';
    $('deskConditions').textContent = `${Math.round(state.demand * 100)}% demand · ${api.weather()} · month ${state.month + 1}. Your imported files remain a separate comparison.`;
    $('deskTradeoffs').replaceChildren();
    for (const [key, label, suffix, digits] of [['wasteKg', 'Food binned', ' kg', 1], ['walked', 'Walked away', '', 0], ['hours', 'Paid staff-hours', ' h', 1]]) {
      const v = comparison.find(x => x.key === key), row = document.createElement('div');
      const name = document.createElement('span'); name.textContent = label;
      const values = document.createElement('span'); values.innerHTML = `<span class="desk-old">${api.fmt(v.before, digits)}</span><span aria-label="to"> → </span><b>${api.fmt(v.after, digits)}${suffix}</b>`;
      row.append(name, values); $('deskTradeoffs').append(row);
    }
    for (const button of side.querySelectorAll('[data-decision]')) {
      const on = !!state[button.dataset.decision]; button.setAttribute('aria-pressed', String(on)); button.querySelector('.desk-toggle').textContent = on ? '✓' : '+';
    }
  };
  update(); api.resize();
  return { update };
}
