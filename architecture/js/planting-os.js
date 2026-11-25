// Aotearoa Planting Studio OS add-on for /architecture/
// Registers #/planting (top nav + full-bleed OS screen) and a per-project "Planting" tab,
// embedding /landscape/?embed=os&project=...&lat=...&lon=... cleanly inside the assembl. shell.

import { registerNav, registerRoute, registerProjectTab } from './modules.js';

const PLANTING_ICON =
  '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M12 21V9"/><path d="M12 13c-4.5 0-7-2.6-7-7 4.4 0 7 2.5 7 7Z"/><path d="M12 11c4.5 0 7-2.6 7-7-4.4 0-7 2.5-7 7Z"/>' +
  '</svg>';

const CSS = `
.pl-os-shell {
  width: 100%;
  background: #180B18;
  color: #F9F6F2;
  display: flex;
  flex-direction: column;
  min-height: calc(100dvh - 108px);
}
.pl-os-shell.is-tab {
  min-height: clamp(640px, 78dvh, 920px);
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid rgba(101, 74, 78, 0.32);
  margin-top: 8px;
}
.pl-os-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  padding: 10px 18px;
  background: #21121F;
  border-bottom: 1px solid rgba(217, 186, 203, 0.22);
}
.pl-os-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.pl-os-eyebrow {
  font: 500 10.5px/1.2 "IBM Plex Mono", ui-monospace, monospace;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #D9BACB;
}
.pl-os-title {
  font: 500 15px/1.2 "Instrument Sans", system-ui, sans-serif;
  letter-spacing: -0.02em;
  color: #FFFDFB;
}
.pl-os-stats {
  font: 500 11px/1.2 "IBM Plex Mono", ui-monospace, monospace;
  color: #F9F6F2;
  background: rgba(217, 186, 203, 0.14);
  border: 1px solid rgba(217, 186, 203, 0.28);
  padding: 4px 10px;
  border-radius: 999px;
}
.pl-os-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.pl-os-btn {
  appearance: none;
  border: 1px solid rgba(255, 253, 251, 0.26);
  background: rgba(24, 11, 24, 0.58);
  color: #FFFDFB;
  font: 500 12px/1 "Instrument Sans", system-ui, sans-serif;
  padding: 7px 12px;
  min-height: 32px;
  border-radius: 999px;
  cursor: pointer;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.pl-os-btn:hover {
  background: rgba(36, 11, 33, 0.85);
  border-color: rgba(255, 253, 251, 0.65);
}
.pl-os-btn[aria-pressed="true"] {
  background: #FFFDFB;
  color: #240B21;
  border-color: #FFFDFB;
}
.pl-os-frame {
  flex: 1 1 auto;
  width: 100%;
  min-height: 620px;
  border: 0;
  background: #180B18;
  display: block;
}
`;

function ensureCss() {
  if (typeof document === 'undefined' || document.getElementById('planting-os-css')) return;
  const s = document.createElement('style');
  s.id = 'planting-os-css';
  s.textContent = CSS;
  document.head.append(s);
}

/** Build the /landscape/ embed URL for an optional project & mode. Pure and Node-testable. */
export function buildPlantingEmbedUrl(project = null, opts = {}) {
  const params = new URLSearchParams();
  params.set('embed', 'os');
  if (project?.id) params.set('project', String(project.id));
  if (project?.name) params.set('title', String(project.name));
  const lat = Number(opts.lat ?? project?.site?.lat ?? project?.extra?.lat);
  const lon = Number(opts.lon ?? project?.site?.lon ?? project?.extra?.lon);
  if (Number.isFinite(lat) && Number.isFinite(lon) && (lat !== 0 || lon !== 0)) {
    params.set('lat', lat.toFixed(6));
    params.set('lon', lon.toFixed(6));
  }
  if (opts.mode && opts.mode !== 'studio') params.set('mode', String(opts.mode));
  return `/landscape/?${params.toString()}`;
}

export function formatPlantingStats(payload) {
  if (!payload || typeof payload !== 'object') return '';
  const parts = [];
  if (Number.isFinite(payload.plantCount)) parts.push(`${payload.plantCount} plants`);
  if (Number.isFinite(payload.speciesCount)) parts.push(`${payload.speciesCount} spp`);
  if (Number.isFinite(payload.nativePct)) parts.push(`${Math.round(payload.nativePct)}% native`);
  if (Number.isFinite(payload.permeablePct)) parts.push(`${Math.round(payload.permeablePct)}% permeable`);
  if (Number.isFinite(payload.totalNzd) && payload.totalNzd > 0) parts.push(`$${Math.round(payload.totalNzd).toLocaleString('en-NZ')} NZD`);
  return parts.join(' · ');
}

function mountPlantingHost(el, ctx, { isTab = false } = {}) {
  if (!el || typeof document === 'undefined') return () => {};
  ensureCss();
  const project = ctx?.project ?? null;
  const esc = ctx?.esc ?? ((s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]));
  let mode = 'studio';
  const initialUrl = buildPlantingEmbedUrl(project, { mode });
  const standaloneUrl = initialUrl.replace(/([?&])embed=os&?/, '$1').replace(/[?&]$/, '');

  el.innerHTML = `
    <section class="pl-os-shell${isTab ? ' is-tab' : ''}" aria-label="Aotearoa 3D Planting Studio">
      <div class="pl-os-bar">
        <div class="pl-os-meta">
          <span class="pl-os-eyebrow">Aotearoa Planting OS</span>
          <span class="pl-os-title">${esc(project?.name ? `${project.name} · Site & Native Planting` : '3D Native Planting & Site-Plan Brush')}</span>
          <span class="pl-os-stats" data-pl-stats hidden></span>
        </div>
        <div class="pl-os-actions" role="group" aria-label="Planting workspace mode">
          <button type="button" class="pl-os-btn" data-pl-mode="studio" aria-pressed="true">3D Garden</button>
          <button type="button" class="pl-os-btn" data-pl-mode="siteplan" aria-pressed="false">Site Plan Brush</button>
          <button type="button" class="pl-os-btn" data-pl-mode="photo" aria-pressed="false">Photo Backdrop</button>
          <a class="pl-os-btn" href="${esc(standaloneUrl)}" target="_blank" rel="noopener" data-pl-ext>Open Full Screen ↗</a>
        </div>
      </div>
      <iframe
        class="pl-os-frame"
        src="${esc(initialUrl)}"
        title="${esc(project?.name ? `${project.name} 3D Planting Studio` : 'Aotearoa 3D Planting Studio')}"
        allow="fullscreen"
      ></iframe>
    </section>
  `;

  const iframe = el.querySelector('.pl-os-frame');
  const statsEl = el.querySelector('[data-pl-stats]');
  const extLink = el.querySelector('[data-pl-ext]');

  const onModeClick = (e) => {
    const btn = e.target.closest('[data-pl-mode]');
    if (!btn) return;
    mode = btn.dataset.plMode || 'studio';
    el.querySelectorAll('[data-pl-mode]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    const nextUrl = buildPlantingEmbedUrl(project, { mode });
    if (iframe) iframe.src = nextUrl;
    if (extLink) extLink.href = nextUrl.replace(/([?&])embed=os&?/, '$1').replace(/[?&]$/, '');
  };
  el.addEventListener('click', onModeClick);

  const onMessage = (ev) => {
    if (ev.origin !== location.origin) return;
    const data = ev.data;
    if (!data || data.type !== 'assembl:planting-stats') return;
    const text = formatPlantingStats(data);
    if (statsEl && text) {
      statsEl.textContent = text;
      statsEl.hidden = false;
    }
  };
  window.addEventListener('message', onMessage);

  return () => {
    el.removeEventListener('click', onModeClick);
    window.removeEventListener('message', onMessage);
  };
}

registerNav({ id: 'planting', label: 'Planting', hash: '#/planting', order: 2, icon: PLANTING_ICON });
registerRoute('planting', {
  title: 'Planting Studio',
  render(el, ctx) {
    return mountPlantingHost(el, ctx, { isTab: false });
  },
});
registerProjectTab({
  id: 'planting',
  label: 'Planting',
  icon: PLANTING_ICON,
  order: 12,
  render(el, ctx) {
    return mountPlantingHost(el, ctx, { isTab: true });
  },
});
