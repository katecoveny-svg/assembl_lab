// Opt-in layout for two existing studios. Keep the original engine and controls.
export function enhance(s) {
  if (s.thumb) return;
  const time = s.cfg.title === 'Time Sculpture';
  const root = document.querySelector('.kit');
  document.documentElement.classList.add('play-space');
  document.body.classList.add(time ? 'play-time' : 'play-blocks');
  const basePalette = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(s), 'palette').get;
  Object.defineProperty(s, 'palette', { get() { return this.state.palette === 6 ? {name: 'Rose & plum', colours: ['#916A70','#D4B6C7','#F3A5BE','#492B3E','#F1EAE9','#F8F4EF']} : basePalette.call(this); } });
  const paletteButton = root.querySelector('[data-palette="6"]');
  paletteButton.lastChild.textContent = 'Rose & plum';
  paletteButton.querySelectorAll('i').forEach((swatch, i) => { swatch.style.background = ["#916A70","#D4B6C7","#F3A5BE","#492B3E","#F1EAE9","#F8F4EF"][i]; });
  const brand = root.querySelector('.kit-brand');
  brand.href = '/#playground'; brand.textContent = 'assembl. / playground';
  const stage = document.createElement('section'); stage.className = 'play-stage'; stage.setAttribute('aria-label', 'Your working canvas');
  const mat = document.createElement('div'); mat.className = 'play-mat';
  mat.append(s.canvas); stage.append(mat);
  const hint = document.createElement('p'); hint.className = 'play-hint'; hint.id = 'play-hint';
  hint.textContent = time ? 'Drag to draw · Arrow keys draw short strokes · Space makes a mark' : 'Tap to stack · Arrow keys build · Turn to change your view';
  s.canvas.setAttribute('aria-describedby', 'play-hint');
  stage.append(root.querySelector('.kit-tray'), hint);
  const panel = document.createElement('aside'); panel.className = 'play-panel'; panel.setAttribute('aria-label', 'Experiment settings');
  panel.innerHTML = `<p class="play-eyebrow">${time ? 'Draw → echo → remix' : 'Stack → turn → discover'}</p><h2>${time ? 'One stroke. <br>Endless echoes.' : 'Can your eyes <br>be fooled?'}</h2><p class="play-prompt">${time ? 'Try Twist at zero. Then turn it up. Same stroke, completely different shape.' : 'Switch the drawing order. Watch which blocks jump to the front.'}</p>`;
  const more = root.querySelector('#kit-more');
  for (const el of [...more.querySelectorAll('.kit-starts, [data-opt], .kit-slider')]) {
    const label = el.previousElementSibling;
    if (label?.classList.contains('kit-label')) panel.append(label);
    panel.append(el);
  }
  const actions = document.createElement('div'); actions.className = 'play-actions';
  actions.append(more.querySelector('#kit-reset'), more.querySelector('#kit-pause'));
  panel.append(actions);
  const note = document.createElement('p'); note.className = 'play-note';
  note.textContent = time ? 'Illustrative · Recorded strokes, rotated and scaled. Not a 3D scan.' : 'Illustrative · Flat isometric artwork.';
  panel.append(note);
  root.append(stage, panel);
  root.querySelector('.kit-cue').hidden = true;
  root.querySelector('#kit-more-open span').textContent = 'Details';
  root.querySelector('#kit-save-open span').textContent = 'Export';
  // Keep live numeric feedback in sync with presets, keyboard edits and undo.
  const sync = s.syncUI.bind(s);
  s.syncUI = () => { sync(); panel.querySelectorAll('[data-slider]').forEach(input => {
    let out = input.parentNode.querySelector('output');
    if (!out) { out = document.createElement('output'); input.parentNode.append(out); }
    out.value = input.value + (input.dataset.slider === 'turn' ? '°' : '');
  }); };
  panel.addEventListener('input', ev => { if (ev.target.matches('[data-slider]')) { const input = ev.target; input.parentNode.querySelector('output').value = input.value + (input.dataset.slider === 'turn' ? '°' : ''); } });
  const reset = root.querySelector('#kit-reset');
  const oldReset = reset.onclick;
  reset.onclick = () => { oldReset(); s.paused = false; syncPause(); s.syncUI(); s.status('Starting picture restored. Undo brings your artwork back.'); };
  const pause = root.querySelector('#kit-pause');
  const syncPause = () => { pause.setAttribute('aria-pressed', String(s.paused)); pause.lastChild.textContent = s.paused ? 'Resume' : 'Pause'; };
  pause.onclick = () => { s.paused = !s.paused; syncPause(); };
  if (time) {
    const replay = root.querySelector('[data-action="replay"]');
    replay.onclick = () => { s.paused = false; syncPause(); s.engine.replay(); s.dirty(); s.status(s.reducedMotion ? 'Full sculpture shown. Reduced motion is on.' : 'Replaying your strokes and echoes.'); };
  }
  // Preserve the full original artwork exports and palette choices.
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  motion.addEventListener('change', () => { s.reducedMotion = motion.matches; document.documentElement.classList.toggle('kit-reduced', motion.matches); s.dirty(); });
  s.syncUI();
  new ResizeObserver(() => s.resize()).observe(mat);
  s.resize(); s.dirty();
}
