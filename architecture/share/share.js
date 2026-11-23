// A project's client page. Read-only. It shows a project only when an owner turned its client link on:
//   ?t=<token>&p=<project id>   a project kept in this browser (signed out): read from this browser's own records, so it opens
//                               only here. A preview of what the client will see once the project is in a practice's records.
//   ?t=<token>                  a project in a practice's shared records: asked of /api/arch-share, which checks the token in
//                               the database and signs short-lived links to the files.
// Either way the same rules pick what is shown (../js/share-rules.js): stills, films, the model in 3D and drawings for
// information. A wrong, old or turned-off link shows the same "not shared" page.
import { createStore, browserBackend } from '../js/store.js';
import { clientView } from '../js/share-rules.js';
import { applyTheme, LOOK_SETTING } from '../js/theme.js';
import { BRAND_KEY } from '../js/handoff.js';
import { ext } from '../js/file-library-rules.js';

const $ = document.getElementById('sh');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const q = new URLSearchParams(location.search), token = q.get('t') ?? '', pid = q.get('p') ?? '';

function notShared(title = 'This project is not shared.', line = 'Ask the architect for a new link.') {
  document.title = 'Not shared';
  $.innerHTML = `<section class="sh-none"><svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="1"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg><h1>${esc(title)}</h1><p>${esc(line)}</p></section>`;
}

/** the project from this browser's own records, with each file as an object URL */
async function fromBrowser() {
  const store = createStore(browserBackend());
  try { applyTheme(document, (await store.get('setting', LOOK_SETTING))?.value ?? ''); } catch { /* the default look */ }
  const b = await store.loadProject(pid);
  if (!b) return null;
  const files = await store.listFiles({ project_id: pid });
  const view = clientView({ project: b.project, files, documents: b.documents, token, practice: brand() });
  if (!view) return null;
  const url = async (note) => { const f = await store.getFile(note.id); return f?.data ? URL.createObjectURL(new Blob([f.data], { type: note.type || '' })) : ''; };
  const item = async (i) => ({ title: i.title, media: i.media, file: { name: i.latest.name, size: i.latest.size, url: await url(i.latest) } });
  return {
    name: view.name, practice: view.practice, local: true,
    stills: await Promise.all(view.stills.map(item)), films: await Promise.all(view.films.map(item)), drawings: await Promise.all(view.drawings.map(item)),
    model: view.model ? { name: view.model.note.name, size: view.model.note.size, url: await url(view.model.note) } : null,
  };
}
function brand() {
  try { const r = JSON.parse(localStorage.getItem(BRAND_KEY) ?? 'null'); return r?.name ? { name: r.name, logo: r.logo ?? '' } : null; } catch { return null; }
}

async function fromServer() {
  const r = await fetch(`/api/arch-share?t=${encodeURIComponent(token)}`, { headers: { accept: 'application/json' }, referrerPolicy: 'no-referrer' });
  if (r.status === 503) return { offline: true };
  if (!r.ok) return null;
  const d = await r.json();
  if (d?.practice?.theme === 'sketch') applyTheme(document, 'sketch');
  return d;
}

const sizeText = (n) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

function draw(d) {
  document.title = `${d.name} · ${d.practice?.name || 'shared'}`;
  const hero = d.stills[0] ?? null, rest = d.stills.slice(1);
  const logo = d.practice?.logo ? `<img class="sh-logo" src="${esc(d.practice.logo)}" alt="">` : '';
  $.innerHTML = `
    <header class="sh-top"><div class="sh-in">${logo}<span class="sh-by">${esc(d.practice?.name || '')}</span>${d.local ? '<span class="sh-pre">Preview · this browser only</span>' : ''}</div></header>
    <section class="sh-hero${hero ? '' : ' is-bare'}">${hero ? `<button class="sh-pic" data-big="0"><img src="${esc(hero.file.url)}" alt="${esc(hero.title)}"></button>` : ''}
      <div class="sh-in sh-title"><h1>${esc(d.name)}</h1><p class="sh-count">${[d.stills.length && `${d.stills.length} still${d.stills.length === 1 ? '' : 's'}`, d.films.length && `${d.films.length} film${d.films.length === 1 ? '' : 's'}`, d.model && 'a 3D model', d.drawings.length && `${d.drawings.length} drawing set${d.drawings.length === 1 ? '' : 's'}`].filter(Boolean).join(' · ') || 'Nothing to show yet'}</p></div></section>
    <div class="sh-in">
      ${d.films.length ? `<section class="sh-sec"><h2>Fly-through</h2><div class="sh-films">${d.films.map((f) => `<figure><video src="${esc(f.file.url)}" controls playsinline preload="metadata"></video><figcaption>${esc(f.title)}</figcaption></figure>`).join('')}</div></section>` : ''}
      ${d.model ? `<section class="sh-sec"><h2>Look around in 3D</h2><div class="sh-3d" data-3d><button class="sh-go" data-act="3d"><svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><path d="M12 3 3 7.5v9L12 21l9-4.5v-9z M3 7.5 12 12l9-4.5M12 12v9"/></svg><span>Open the model</span><small>${esc(sizeText(d.model.size || 0))}</small></button></div></section>` : ''}
      ${rest.length ? `<section class="sh-sec"><h2>Stills</h2><ul class="sh-gal">${rest.map((s, i) => `<li><button class="sh-pic" data-big="${i + 1}"><img src="${esc(s.file.url)}" alt="${esc(s.title)}" loading="lazy"></button></li>`).join('')}</ul></section>` : ''}
      ${d.drawings.length ? `<section class="sh-sec"><h2>Drawings</h2><p class="sh-note">For information only. Not for construction.</p><ul class="sh-docs">${d.drawings.map((x) => `<li><a href="${esc(x.file.url)}" download="${esc(x.file.name)}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><path d="M6 3h8l4 4v14H6z M14 3v4h4"/></svg><span>${esc(x.title)}</span><small>PDF · ${esc(sizeText(x.file.size || 0))}</small></a></li>`).join('')}</ul></section>` : ''}
      <footer class="sh-foot"><p>Renders and films are pictures of a design, not photographs. Drawings are for information only: not a consent document or a professional sign-off.</p><p class="mono">Made with assembl.</p></footer>
    </div>
    <dialog class="sh-view" aria-label="Still"><button class="sh-x" data-act="close" aria-label="Close">×</button><img alt=""></dialog>`;
  $.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-big], [data-act]');
    if (!b) return;
    if (b.dataset.big !== undefined) { const s = d.stills[Number(b.dataset.big)], dlg = $.querySelector('.sh-view'); dlg.querySelector('img').src = s.file.url; dlg.querySelector('img').alt = s.title; dlg.showModal(); }
    if (b.dataset.act === 'close') $.querySelector('.sh-view').close();
    if (b.dataset.act === '3d') open3d(d.model, b.closest('[data-3d]'));
  });
}

async function open3d(model, host) {
  host.innerHTML = '<p class="sh-wait">Opening the model…</p>';
  try {
    const mv = await import('../js/model-view.js');
    if (!mv.webglOk()) { host.innerHTML = '<p class="sh-wait">This browser cannot draw 3D.</p>'; return; }
    const bytes = new Uint8Array(await (await fetch(model.url)).arrayBuffer());
    const meshes = await mv.meshesOf(ext(model.name) === 'ifc' ? 'ifc' : 'glb', bytes);
    host.innerHTML = '';
    await mv.mountView(host, { meshes, spin: true });
    host.insertAdjacentHTML('beforeend', '<p class="sh-hint">Drag to turn · pinch or scroll to zoom</p>');
  } catch { host.innerHTML = '<p class="sh-wait">The model could not be opened here.</p>'; }
}

(async () => {
  if (!token) return notShared();
  const d = pid ? await fromBrowser().catch(() => null) : await fromServer().catch(() => null);
  if (d?.offline) return notShared('Client links are not switched on yet.', 'The architect’s practice still has to switch them on.');
  if (!d) return notShared();
  draw(d);
})();
