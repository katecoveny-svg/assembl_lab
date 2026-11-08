// assembl AR worlds: the gallery at the top of /ar/. Every mode button is a real link to its launcher; on a phone the tap
// opens AR straight away instead (Quick Look, the live WebXR world, or Scene Viewer).
import { WORLDS, posterURL } from './worlds.js';
import { device, deviceLine, open, warm } from './launch.js';
import { chips, modeInner, esc } from './ui.js';

export function mountGallery(grid, deviceEl) {
  grid.innerHTML = WORLDS.map(w => `
    <li class="w-card" data-world="${w.id}">
      <a class="w-pic" href="/ar/w/${w.id}/" tabindex="-1" aria-hidden="true"><img src="${posterURL(w.id)}" alt="" width="640" height="480" loading="lazy" decoding="async"><span class="w-chips">${chips(w)}</span></a>
      <div class="w-body">
        <h3><a href="/ar/w/${w.id}/">${esc(w.name)}</a></h3>
        <p>${esc(w.line)}</p>
        <div class="w-modes">
          <a class="w-mode" href="/ar/w/${w.id}/?mode=table" data-mode="table" aria-label="${esc(w.name)}: on your table">${modeInner(w, 'table')}</a>
          <a class="w-mode alt" href="/ar/w/${w.id}/?mode=inside" data-mode="inside" aria-label="${esc(w.name)}: ${w.kind === 'place' ? 'step inside' : w.inside.verb.toLowerCase()}">${modeInner(w, 'inside')}</a>
        </div>
        <p class="w-msg" role="status" aria-live="polite"></p>
      </div>
    </li>`).join('');
  device().then(d => {
    if (deviceEl) deviceEl.querySelector('span').textContent = d === 'desktop' ? 'On a computer: pick a world to see it in 3D and get its code for a phone.' : deviceLine(d);
    if (d === 'desktop') return;
    warm();
    grid.addEventListener('click', async e => {
      const a = e.target.closest('a.w-mode'); if (!a) return;
      e.preventDefault();
      const card = a.closest('.w-card'), msg = card.querySelector('.w-msg'); msg.textContent = '';
      try { const r = await open(card.dataset.world, a.dataset.mode); if (r === 'sheet') location.href = a.href; }
      catch (err) { msg.textContent = err.message; }
    });
  });
}
