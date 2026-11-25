// Earlier Works & Interactive HTML Walkthroughs add-on for /architecture/.
// 1. Lets any practice keep and launch standalone self-contained 3D HTML walkthroughs (.html), milestone review cuts (.mp4),
//    masterplans (.pdf) and reference renders (.png/.jpg) inside each project's Files & Hand-off tabs — including 100 MB+
//    standalone HTML walkthroughs opened directly via Blob URLs or full-viewport <dialog> viewers.
// 2. When served locally with an optional gitignored `/local-archive/manifest.json` (never committed to public Git),
//    auto-registers local project archives (earlier HTML walkthroughs, architect reference sheets,
//    masterplans, IFC/GLB models and narrated cuts) with zero file duplication and 1-click handoff into the 3D Studio.

import { registerProjectPanel, registerWall } from './modules.js';
import { putHandoff, keepBrand } from './handoff.js';
import { activity, newProject } from './model.js';
import { sizeText, createStore, browserBackend } from './store.js';

const DROP_URL = '/plan-studio/twins/drop/';

const CSS = `
.ew-box { border: 1px solid var(--line); background: var(--panel); padding: 16px; margin-top: 14px; }
.ew-head { display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
.ew-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(270px, 1fr)); gap: 12px; margin-top: 10px; }
.ew-card {
  border: 1px solid var(--hair); background: var(--field); padding: 12px 14px;
  display: grid; gap: 6px; align-content: space-between;
}
.ew-kind { font: 500 10.5px var(--mono); text-transform: uppercase; letter-spacing: .09em; color: var(--mute); display: flex; justify-content: space-between; }
.ew-title { font: 500 15px/1.25 var(--sans); color: var(--ink); }
.ew-sub { font: 400 12.5px/1.4 var(--sans); color: var(--mute); }
.ew-acts { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
dialog.ew-viewer {
  border: 0; padding: 0; width: min(1360px, calc(100dvw - 24px)); height: calc(100dvh - 24px);
  max-width: none; max-height: none; background: #180B18; color: #F9F6F2; border-radius: 12px; overflow: hidden;
}
dialog.ew-viewer:modal { overscroll-behavior: contain; }
dialog.ew-viewer::backdrop { background: rgba(24,11,24,.72); overflow: hidden; overscroll-behavior: contain; }
.ew-vbar { display: flex; justify-content: space-between; align-items: center; padding: 8px 14px; background: #240B21; border-bottom: 1px solid rgba(217,186,203,.25); }
.ew-vbody { width: 100%; height: calc(100% - 46px); background: #000; display: grid; place-items: center; }
.ew-vbody iframe, .ew-vbody video { width: 100%; height: 100%; border: 0; }
.ew-vbody img { max-width: 100%; max-height: 100%; object-fit: contain; }
`;

function ensureCss() {
  if (typeof document === 'undefined' || document.getElementById('ew-style')) return;
  const s = document.createElement('style');
  s.id = 'ew-style';
  s.textContent = CSS;
  document.head.append(s);
}

let manifestPromise = null;
async function loadLocalManifest() {
  if (typeof fetch !== 'function') return null;
  manifestPromise ??= fetch('/local-archive/manifest.json', { headers: { accept: 'application/json' } })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);
  return manifestPromise;
}

let seededLocal = false;
async function ensureLocalProjectSeeded(ctx, manifest) {
  if (seededLocal || !manifest?.projects?.length || ctx.store.shared) return false;
  seededLocal = true;
  const existing = await ctx.store.list('project');
  let added = false;
  for (const lp of manifest.projects) {
    if (existing.some((p) => p.id === lp.id || p.name.toLowerCase().includes(lp.matchKey.toLowerCase()))) continue;
    const bundle = newProject({ name: lp.name, client: lp.client || '', now: lp.updatedAt || new Date().toISOString() });
    bundle.project.id = lp.id;
    bundle.project.extra = { ...(bundle.project.extra || {}), localArchiveId: lp.id };
    for (const s of bundle.stages) s.project_id = lp.id;
    for (const t of bundle.tasks) t.project_id = lp.id;
    for (const c of bundle.checklist) c.project_id = lp.id;
    await ctx.store.saveProject(bundle);
    added = true;
  }
  return added;
}

function openMediaViewer({ title, url, kind }) {
  document.getElementById('ewViewerDlg')?.remove();
  const dlg = document.createElement('dialog');
  dlg.id = 'ewViewerDlg';
  dlg.className = 'ew-viewer';
  dlg.setAttribute('closedby', 'any');
  dlg.setAttribute('aria-label', title);
  const body =
    kind === 'video'
      ? `<video src="${url}" controls autoplay playsinline></video>`
      : kind === 'audio'
        ? `<audio src="${url}" controls autoplay style="width:min(520px,90%)"></audio>`
        : kind === 'image'
          ? `<img src="${url}" alt="${title.replace(/"/g, '&quot;')}">`
          : `<iframe src="${url}" title="${title.replace(/"/g, '&quot;')}" sandbox="allow-scripts allow-same-origin allow-downloads"></iframe>`;
  dlg.innerHTML = `<div class="ew-vbar"><span class="mono small">${title.replace(/</g, '&lt;')}</span>
    <div style="display:flex;gap:8px"><a class="btn" href="${url}" target="_blank" rel="noopener" style="color:#F9F6F2;border-color:rgba(217,186,203,.4)">Open in New Tab ↗</a>
    <form method="dialog" style="margin:0"><button class="btn solid" value="close" autofocus>Close</button></form></div></div>
    <div class="ew-vbody">${body}</div>`;
  document.body.append(dlg);
  dlg.addEventListener('close', () => { dlg.returnValue = ''; dlg.remove(); });
  dlg.showModal();
}

async function sendUrlTo3dStudio(ctx, item, btn) {
  const orig = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Loading into 3D Studio…';
  try {
    const r = await fetch(item.url);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const blob = await r.blob();
    if (ctx.practice?.name || item.practiceName) await keepBrand(ctx.practice?.name || item.practiceName).catch(() => {});
    const hid = await putHandoff(blob, item.fileName || item.title);
    window.open(`${DROP_URL}?from=ops&handoff=${encodeURIComponent(hid)}`, '_blank');
  } catch (err) {
    alert(`Could not pass to 3D Studio: ${err?.message ?? err}`);
  } finally {
    btn.disabled = false;
    btn.textContent = orig;
  }
}

async function renderEarlierWorks(el, ctx) {
  ensureCss();
  const p = ctx.project;
  if (!p) return;
  const esc = ctx.esc;
  const manifest = await loadLocalManifest();

  // Match local archive entries for this project (if running on local Mac studio)
  const localProj = manifest?.projects?.find(
    (lp) => lp.id === p.id || lp.id === p.extra?.localArchiveId || p.name.toLowerCase().includes((lp.matchKey || '').toLowerCase()),
  );
  const localItems = localProj?.items ?? [];

  // Also gather any .html walkthroughs uploaded directly into this project's browser/cloud store
  const files = await ctx.store.listFiles({ project_id: p.id });
  const storedHtml = files.filter((f) => /\.html?$/i.test(f?.name ?? ''));

  const audioSample = localItems.find((it) => it.kind === 'audio');
  const displayItems = localItems.filter((it) => it.kind !== 'audio');

  el.innerHTML = `
    <div class="ew-box">
      <div class="ew-head">
        <div>
          <p class="label">Earlier works &amp; walkthroughs</p>
          <h3>${displayItems.length + storedHtml.length ? `${displayItems.length + storedHtml.length} interactive builds &amp; milestone studies` : 'Interactive HTML walkthroughs'}</h3>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          ${audioSample ? `<button type="button" class="btn" data-ew-sample-voice>▶ Tāne Narration Sample</button>` : ''}
          <label class="btn" tabindex="0">
            <span>+ Attach Walkthrough</span>
            <input type="file" accept=".html,.htm,.mp4,.webm,.pdf,.png,.jpg,.jpeg,.glb,.ifc" multiple hidden data-ew-upload />
          </label>
        </div>
      </div>
      ${
        displayItems.length || storedHtml.length
          ? `<div class="ew-grid">
              ${storedHtml
                .map(
                  (f) => `<article class="ew-card">
                    <div>
                      <div class="ew-kind"><span>HTML WALKTHROUGH</span><span>${esc(sizeText(f.size || 0))}</span></div>
                      <div class="ew-title">${esc(f.name.replace(/\.html?$/i, ''))}</div>
                    </div>
                    <div class="ew-acts">
                      <button type="button" class="btn solid" data-ew-stored="${esc(f.id)}" data-ew-name="${esc(f.name)}">Launch</button>
                    </div>
                  </article>`,
                )
                .join('')}
              ${displayItems
                .map(
                  (it, idx) => `<article class="ew-card">
                    <div>
                      <div class="ew-kind"><span>${esc(it.badge)}</span><span>${esc(it.sizeLabel || '')}</span></div>
                      <div class="ew-title">${esc(it.title)}</div>
                      ${it.note ? `<div class="ew-sub">${esc(it.note)}</div>` : ''}
                    </div>
                    <div class="ew-acts">
                      ${
                        it.openIn3d
                          ? `<button type="button" class="btn solid" data-ew-to3d="${idx}">Open in 3D Studio →</button>`
                          : `<button type="button" class="btn solid" data-ew-view="${idx}">${it.kind === 'html' ? 'Launch' : it.kind === 'video' ? 'Play' : 'View'}</button>`
                      }
                      <a class="btn" href="${esc(it.url)}" target="_blank" rel="noopener">↗</a>
                    </div>
                  </article>`,
                )
                .join('')}
            </div>`
          : ''
      }
    </div>`;

  el.querySelector('[data-ew-upload]')?.addEventListener('change', async (e) => {
    const picked = [...(e.target.files ?? [])];
    for (const f of picked) {
      await ctx.store.putFile({
        project_id: p.id,
        owner_kind: 'source',
        owner_id: p.id,
        name: f.name,
        type: f.type || (/\.html?$/i.test(f.name) ? 'text/html' : 'application/octet-stream'),
        data: await f.arrayBuffer(),
        extra: { source: { slot: 'other', version: 1, by: ctx.me || '' }, library: true, earlierWork: true },
      });
      try { await ctx.store.save('activity', activity(p.id, ctx.me, 'Earlier work attached', `${f.name} (${sizeText(f.size)})`)); } catch { /* ignore */ }
    }
    ctx.redraw(`Attached ${picked.length} earlier work file${picked.length === 1 ? '' : 's'}.`);
  });

  el.querySelectorAll('[data-ew-stored]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const f = await ctx.store.getFile(btn.dataset.ewStored);
      if (!f?.data) return;
      const url = URL.createObjectURL(new Blob([f.data], { type: 'text/html' }));
      openMediaViewer({ title: btn.dataset.ewName || 'Walkthrough', url, kind: 'html' });
    });
  });

  el.querySelector('[data-ew-sample-voice]')?.addEventListener('click', () => {
    if (audioSample) openMediaViewer({ title: audioSample.title, url: audioSample.url, kind: 'audio' });
  });

  el.querySelectorAll('[data-ew-view]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const it = displayItems[Number(btn.dataset.ewView)];
      if (it) openMediaViewer({ title: it.title, url: it.url, kind: it.kind });
    });
  });

  el.querySelectorAll('[data-ew-to3d]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const it = displayItems[Number(btn.dataset.ewTo3d)];
      if (it) void sendUrlTo3dStudio(ctx, it, btn);
    });
  });
}

// Wall banner on /architecture/ when local project walkthrough archives are detected on this Mac
async function renderArchiveWallBanner(el, ctx) {
  ensureCss();
  const esc = ctx.esc;
  const manifest = await loadLocalManifest();
  if (!manifest?.projects?.length) return;
  const seeded = await ensureLocalProjectSeeded(ctx, manifest);
  if (seeded) { ctx.redraw(); return; }

  const tw = manifest.projects[0];
  const shortTitle = tw.name.split('—')[0].trim();
  const showcase = manifest.showcaseWalkthroughs ?? [];
  el.innerHTML = `
    <section class="ew-box" style="margin:12px 0 18px;border-color:var(--plum)">
      <div class="ew-head">
        <div>
          <p class="label">Local Project Archive Connected · ${esc(tw.name)}</p>
          <h3>${tw.items.length} ${esc(shortTitle)} Earlier Works, HTML Walkthroughs, Masterplan &amp; Cuts Ready</h3>
        </div>
        <a class="btn solid" href="#/p/${encodeURIComponent(tw.id)}/t/drawings">Open ${esc(shortTitle)} Archive →</a>
      </div>
      <div class="ew-acts">
        ${tw.items
          .slice(0, 6)
          .map(
            (it, idx) =>
              `<button type="button" class="btn" data-wall-tw="${idx}">${esc(it.shortLabel || it.title)}</button>`,
          )
          .join('')}
        ${showcase
          .map(
            (s, idx) =>
              `<button type="button" class="btn" data-wall-show="${idx}">★ ${esc(s.title)}</button>`,
          )
          .join('')}
      </div>
    </section>`;

  el.querySelectorAll('[data-wall-tw]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const it = tw.items[Number(btn.dataset.wallTw)];
      if (!it) return;
      if (it.openIn3d) void sendUrlTo3dStudio(ctx, it, btn);
      else openMediaViewer({ title: it.title, url: it.url, kind: it.kind });
    });
  });
  el.querySelectorAll('[data-wall-show]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const s = showcase[Number(btn.dataset.wallShow)];
      if (s) openMediaViewer({ title: s.title, url: s.url, kind: s.kind });
    });
  });
}

registerWall({ id: 'earlier-works-wall', order: 2, top: renderArchiveWallBanner });
registerProjectPanel({ id: 'earlier-works-files', title: 'Earlier works & walkthroughs', order: 2, tab: 'drawings', render: renderEarlierWorks });
registerProjectPanel({ id: 'earlier-works-handoff', title: 'Earlier works & walkthroughs', order: 2, tab: 'presentation', render: renderEarlierWorks });

// Pre-seed local archive projects on module load when running in a browser so direct deep-links (#/p/<archive-id>/...) resolve immediately.
if (typeof window !== 'undefined') {
  void loadLocalManifest().then(async (manifest) => {
    const backend = browserBackend();
    if (!backend || !manifest?.projects?.length) return;
    const st = createStore(backend);
    const existing = await st.list('project');
    let added = false;
    for (const lp of manifest.projects) {
      if (existing.some((p) => p.id === lp.id || p.name.toLowerCase().includes((lp.matchKey || '').toLowerCase()))) continue;
      const bundle = newProject({ name: lp.name, client: lp.client || '', now: lp.updatedAt || new Date().toISOString() });
      bundle.project.id = lp.id;
      bundle.project.extra = { ...(bundle.project.extra || {}), localArchiveId: lp.id };
      for (const s of bundle.stages) s.project_id = lp.id;
      for (const t of bundle.tasks) t.project_id = lp.id;
      for (const c of bundle.checklist) c.project_id = lp.id;
      await st.saveProject(bundle);
      added = true;
    }
    if (added) window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
}
