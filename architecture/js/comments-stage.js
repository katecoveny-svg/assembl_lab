// A still with its pins, for the workspace's file viewer and the client page. No page code beyond the picture's own box.
import { esc, pinFromPoint, pinStyle } from './comments-rules.js';

/**
 * A still with its pins. host holds the picture (an <img>); the pins sit over it as numbered marks at their fractions of it, and
 * a click while the thread is in pin mode places a new one. Returns { redraw }.
 */
export function mountStage(host, thread) {
  const img = host.querySelector('img');
  if (!img) return { redraw() {} };
  const stage = document.createElement('div');
  stage.className = 'cm-stage';
  img.replaceWith(stage);
  stage.append(img);
  const layer = document.createElement('div');
  layer.className = 'cm-pins';
  stage.append(layer);
  const draw = () => {
    const s = thread.pins();
    stage.classList.toggle('is-pinning', s.pinning);
    layer.innerHTML = s.list.map((x) => `<button type="button" class="cm-pinmark${x.active ? ' is-active' : ''}${x.hidden ? ' is-hidden' : ''}" style="${pinStyle(x.pin)}" data-id="${esc(x.id)}" aria-label="Pin ${x.n}">${x.n}</button>`).join('')
      + (s.draft ? `<span class="cm-pinmark is-draft" style="${pinStyle(s.draft)}" aria-hidden="true">+</span>` : '');
  };
  stage.addEventListener('click', (e) => {
    const m = e.target.closest('.cm-pinmark[data-id]');
    if (m) { thread.activate(m.dataset.id); return; }
    if (!thread.pinning) return;
    thread.placePin(pinFromPoint(e.clientX, e.clientY, img.getBoundingClientRect()));
  });
  thread.on(draw);
  draw();
  return { redraw: draw };
}
