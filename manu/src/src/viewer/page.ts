import type { AnchorId, ViewName } from './viewer';

// A bird page: the still is the page's picture from the first paint; live 3D loads over it
// when WebGL can start, and the chip says which you are looking at. Every control is a
// button, so the model can be turned, zoomed, labelled and paused from the keyboard.
// The quiz works without the model (and its answers are in <details> without script).

const stage = document.querySelector<HTMLElement>('[data-manu-stage]');
const reducedQuery = matchMedia('(prefers-reduced-motion: reduce)');

function setupQuiz() {
  for (const q of document.querySelectorAll<HTMLFieldSetElement>('fieldset.mt-q')) {
    const btn = q.querySelector<HTMLButtonElement>('.mt-check');
    const out = q.querySelector<HTMLElement>('.mt-feedback');
    if (!btn || !out) continue;
    btn.hidden = false;
    btn.addEventListener('click', () => {
      const picked = q.querySelector<HTMLInputElement>('input[type=radio]:checked');
      q.classList.remove('is-right', 'is-wrong');
      if (!picked) {
        out.textContent = 'Choose an answer first.';
        return;
      }
      const right = picked.dataset.right === '1';
      q.classList.add(right ? 'is-right' : 'is-wrong');
      const why = q.querySelector<HTMLElement>('.mt-why')?.innerHTML ?? '';
      out.innerHTML = right ? `<strong>Yes, that’s right.</strong> ${why}` : '<strong>Not quite.</strong> Have another go, or open “Show the answer” to see why.';
      q.dataset.done ??= right ? 'right' : 'wrong';
      tally();
    });
  }
  function tally() {
    const all = [...document.querySelectorAll<HTMLFieldSetElement>('fieldset.mt-q')];
    const done = all.filter((q) => q.dataset.done);
    const score = document.querySelector<HTMLElement>('.mt-score');
    if (!score || done.length < all.length) return;
    const right = done.filter((q) => q.dataset.done === 'right').length;
    score.textContent = `${right} of ${all.length} right first time. ${right === all.length ? 'Ka pai.' : 'Open “Show the answer” on the ones you missed to see why.'}`;
  }
}

async function setupStage(el: HTMLElement) {
  const canvas = el.querySelector<HTMLCanvasElement>('canvas')!;
  const chip = el.querySelector<HTMLElement>('.mt-chip');
  const msg = el.parentElement?.querySelector<HTMLElement>('.mt-stage-msg') ?? null;
  const controls = document.querySelector<HTMLElement>('.mt-controls');
  const markers = el.querySelector<HTMLElement>('.mt-markers');
  const legend = [...document.querySelectorAll<HTMLElement>('.mt-legend [data-anchor]')];
  const ids = legend.map((li) => li.dataset.anchor as AnchorId);
  const labelsBtn = document.querySelector<HTMLButtonElement>('[data-act="labels"]');
  const motionBtn = document.querySelector<HTMLButtonElement>('[data-act="motion"]');

  // labels on the still work with or without WebGL
  let labelsOn = true;
  let placeLater: (() => void) | null = null;
  function showLabels(on: boolean) {
    labelsOn = on;
    el.classList.toggle('labels-off', !on);
    labelsBtn?.setAttribute('aria-pressed', String(on));
  }
  labelsBtn?.addEventListener('click', () => {
    showLabels(!labelsOn);
    viewer?.wake();
    if (labelsOn) placeLater?.();
  });
  for (const li of legend) {
    const on = () => el.querySelector(`.mt-marker[data-anchor="${li.dataset.anchor}"]`)?.classList.add('hot');
    const off = () => el.querySelector(`.mt-marker[data-anchor="${li.dataset.anchor}"]`)?.classList.remove('hot');
    li.addEventListener('pointerenter', on);
    li.addEventListener('pointerleave', off);
    li.addEventListener('focusin', on);
    li.addEventListener('focusout', off);
  }
  if (controls) controls.hidden = false;

  const { createViewer, webglAvailable } = await import('./viewer');
  let viewer: Awaited<ReturnType<typeof createViewer>> | null = null;
  const live = (s: string) => {
    if (msg) msg.textContent = s;
  };
  if (!webglAvailable()) {
    el.classList.add('no-webgl');
    live('This browser can’t show the 3D model, so you’re seeing a still of it. Everything else on the page works.');
    for (const b of document.querySelectorAll<HTMLElement>('.mt-controls .needs-3d, .mt-controls .mt-group, .mt-controls .mt-sep')) b.hidden = true;
    return;
  }
  el.classList.add('loading');
  if (chip) chip.textContent = 'Loading 3D…';
  try {
    viewer = await createViewer(canvas, {
      bird: el.dataset.bird!,
      flora: el.dataset.flora as 'kowhai' | 'manuka' | 'pohutukawa',
      perchUrl: el.dataset.perch!,
      paused: reducedQuery.matches,
    });
  } catch (err) {
    el.classList.remove('loading');
    el.classList.add('no-webgl');
    if (chip) chip.textContent = 'Still';
    live('The 3D model couldn’t start here, so you’re seeing a still of it.');
    for (const b of document.querySelectorAll<HTMLElement>('.mt-controls .needs-3d, .mt-controls .mt-group, .mt-controls .mt-sep')) b.hidden = true;
    console.warn('manu: 3D did not start', err);
    return;
  }
  el.classList.remove('loading');
  el.classList.add('live');
  if (chip) chip.textContent = 'Live 3D';
  live('The 3D model is ready. Drag sideways to turn it, or use the buttons below.');

  // markers follow the bones
  const dots = new Map<AnchorId, HTMLElement>();
  if (markers) {
    markers.replaceChildren();
    ids.forEach((id, i) => {
      const d = document.createElement('span');
      d.className = 'mt-marker';
      d.dataset.anchor = id;
      d.textContent = String(i + 1);
      markers.append(d);
      dots.set(id, d);
    });
  }
  function place() {
    if (!labelsOn) return;
    for (const a of viewer!.anchors(ids)) {
      const d = dots.get(a.id);
      if (!d) continue;
      d.style.transform = `translate(${a.x.toFixed(1)}px, ${a.y.toFixed(1)}px)`;
      d.classList.toggle('behind', !a.front);
      d.classList.add('placed');
    }
  }
  viewer.onFrame(place);
  placeLater = place;
  place();
  viewer.wake();

  // motion: paused under reduced motion, and whenever the visitor asks
  function syncMotion() {
    if (!motionBtn) return;
    motionBtn.textContent = viewer!.paused ? 'Let it move' : 'Pause the bird';
    motionBtn.setAttribute('aria-label', viewer!.paused ? 'Let the bird move' : 'Pause the bird');
  }
  motionBtn?.addEventListener('click', () => {
    viewer!.setPaused(!viewer!.paused);
    syncMotion();
  });
  reducedQuery.addEventListener('change', () => {
    if (reducedQuery.matches) viewer!.setPaused(true);
    syncMotion();
  });
  syncMotion();

  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-view]')) {
    b.addEventListener('click', () => {
      viewer!.goView(b.dataset.view as ViewName);
      for (const o of document.querySelectorAll<HTMLButtonElement>('[data-view]')) o.setAttribute('aria-pressed', String(o === b));
    });
  }
  const act: Record<string, () => void> = {
    left: () => viewer!.orbitBy(-0.35),
    right: () => viewer!.orbitBy(0.35),
    in: () => viewer!.orbitBy(0, -0.12),
    out: () => viewer!.orbitBy(0, 0.12),
  };
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-act]')) {
    const f = act[b.dataset.act!];
    if (f) b.addEventListener('click', f);
  }
  Object.assign(window, { __manuViewer: viewer });
}

setupQuiz();
if (stage) void setupStage(stage);
