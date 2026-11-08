// assembl AR worlds: one launcher per world, at short links such as lab.assembl.co.nz/ar/w/dairy/?mode=table.
// A phone gets the two ways in as big buttons (its AR opens from a tap); a computer gets the live 3D preview and the code.
import { WORLDS, world as worldInfo, modeOf, posterURL } from './worlds.js';
import { device, deviceLine, open, warm } from './launch.js';
import { chips, modeInner, esc } from './ui.js';
import { mountSheet } from './sheet.js';

const q = new URLSearchParams(location.search);
const id = (location.pathname.match(/\/ar\/w\/([a-z0-9-]+)\/?$/) || [])[1] || q.get('w') || '';
let mode = modeOf(q.get('mode'));
const w = worldInfo(id);
const $ = s => document.querySelector(s);

function notFound() {
  document.title = 'assembl AR worlds';
  $('#wl-name').textContent = 'That world isn’t here';
  $('#wl-line').innerHTML = `Try one of these: ${WORLDS.map(x => `<a href="/ar/w/${x.id}/">${esc(x.name)}</a>`).join(', ')}.`;
  for (const el of document.querySelectorAll('.wl-desk,.wl-phone')) el.hidden = true;
}

async function start() {
  if (!w) return notFound();
  document.title = `${w.name} in AR · assembl`;
  $('#wl-name').textContent = w.name; $('#wl-line').textContent = w.line;
  $('#wl-chips').innerHTML = chips(w);
  if (w.notice) { const n = $('#wl-sos'); n.hidden = false; n.innerHTML = `<b>${esc(w.notice.split('.')[0])}.</b>${esc(w.notice.slice(w.notice.indexOf('.') + 1))}`; }
  $('#wl-from').href = w.from; $('#wl-from').textContent = w.fromName;
  $('#wl-why').textContent = w.why;
  $('#wl-credit').textContent = w.credit;
  const d = await device();
  $('#wl-device').textContent = deviceLine(d);
  if (d !== 'desktop') return phone(d);
  desktop();
}

// ── phone: two big buttons, the one from the link first ─────────────────────────────────────────────────────────
function phone(d) {
  document.documentElement.classList.add('is-phone');
  const pic = $('#wl-poster-phone'); pic.src = posterURL(w.id); pic.alt = `${w.name}, as it looks in AR`;
  const box = $('#wl-big'), order = mode === 'inside' ? ['inside', 'table'] : ['table', 'inside'];
  box.innerHTML = order.map((m, i) => `<button type="button" class="w-mode${i ? ' alt' : ' picked'}" data-mode="${m}">${modeInner(w, m)}</button>`).join('');
  const msg = $('#wl-msg');
  box.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', async () => {
    msg.textContent = '';
    try { const r = await open(w.id, b.dataset.mode); if (r === 'sheet') location.search = `?mode=${b.dataset.mode}&device=desktop`; }
    catch (e) { msg.textContent = e.message; }
  }));
  warm();
}

// ── computer: the live preview and the code ─────────────────────────────────────────────────────────────────────
let preview = null, building = 0;
function posterOnly(stage) {
  const img = document.createElement('img'); img.className = 'wl-poster'; img.alt = `${w.name}, as it looks in AR`; img.src = posterURL(w.id); stage.prepend(img);
}
async function showPreview() {
  const n = ++building;
  if (q.get('preview') === '0') { $('#wl-load').hidden = true; if (!$('#wl-stage .wl-poster')) posterOnly($('#wl-stage')); return; }   // ?preview=0: the picture, no 3D
  if (preview) { preview.dispose(); preview = null; }
  const stage = $('#wl-stage'), old = stage.querySelector('canvas'); if (old) old.remove();
  const canvas = document.createElement('canvas'); canvas.tabIndex = 0;
  canvas.setAttribute('aria-label', `3D preview of ${w.name}, ${mode === 'table' ? 'as a model on a table' : 'at full size'}. Drag to turn it, or use Shift and the arrow keys; scroll to zoom.`);
  stage.prepend(canvas);
  const load = $('#wl-load'), bar = $('#wl-load i'), status = $('#wl-status');
  load.hidden = false; $('#wl-load-t').textContent = `Building ${w.name.toLowerCase()}…`; bar.style.transform = 'scaleX(0)';
  try {
    const { createPreview } = await import('./preview.js');
    const p = await createPreview(canvas, w.id, { mode, tagsEl: $('#wl-tags'), onLearn: learn, onProgress: (a, b) => { bar.style.transform = `scaleX(${Math.min(1, a / Math.max(1, b))})`; } });
    if (n !== building) { p.dispose(); return; }
    preview = p; window.__wl = p; load.hidden = true;
    $('#wl-hint').textContent = mode === 'inside' && w.kind === 'place' ? 'The doorway stands in your room; the world is life size behind it. Drag to look round.' : mode === 'inside' ? 'Shown beside a 1.7 m figure for scale. Drag to turn, scroll to zoom.' : 'Drag to turn, scroll to zoom. Tap a label to learn more.';
    clearInterval(showPreview.t); showPreview.t = setInterval(() => { if (preview) status.textContent = preview.status() || ''; }, 500);
  } catch (e) {
    console.error(e);
    load.hidden = false; $('#wl-load-t').textContent = 'This computer couldn’t show the 3D preview. The code still works.';
    posterOnly(stage);
  }
}
function learn(t) {
  const c = $('#wl-learn'); c.hidden = false; c.querySelector('h3').textContent = t.text; c.querySelector('p').textContent = t.learn || '';
}
function desktop() {
  $('#wl-learn button').addEventListener('click', () => { $('#wl-learn').hidden = true; });
  const sheet = mountSheet($('#wl-sheet'), { id: w.id, mode, onMode: m => { mode = m; history.replaceState(null, '', `${location.pathname}?mode=${m}${q.has('w') ? '&w=' + w.id : ''}`); showPreview(); } });
  window.__wlSheet = sheet;
  showPreview();
}
start();
