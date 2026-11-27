// Aotearoa Planting Studio OS add-on for /architecture/
// Registers #/planting (top nav + full-bleed OS screen) and a per-project "Planting" tab,
// embedding /nz-planting-studio/studio-v9.2 cleanly inside the warm-ivory assembl. shell.

import { registerNav, registerRoute, registerProjectTab } from './modules.js';

const PLANTING_ICON =
  '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M12 21V9"/><path d="M12 13c-4.5 0-7-2.6-7-7 4.4 0 7 2.5 7 7Z"/><path d="M12 11c4.5 0 7-2.6 7-7-4.4 0-7 2.5-7 7Z"/>' +
  '</svg>';

const CSS = `
.pl-os-shell {
  width: 100%;
  background: #F6F1ED;
  color: #240B21;
  display: flex;
  flex-direction: column;
  min-height: calc(100dvh - 108px);
}
.pl-os-shell.is-tab {
  min-height: clamp(660px, 80dvh, 940px);
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid rgba(36, 11, 33, 0.12);
  margin-top: 8px;
  box-shadow: 0 14px 32px -22px rgba(36, 11, 33, 0.18);
}
.pl-os-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  padding: 11px 18px;
  background: #FFFDFB;
  border-bottom: 1px solid rgba(36, 11, 33, 0.10);
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
  color: #654A4E;
}
.pl-os-title {
  font: 500 15px/1.2 "Instrument Sans", system-ui, sans-serif;
  letter-spacing: -0.02em;
  color: #240B21;
}
.pl-os-stats {
  font: 500 11px/1.2 "IBM Plex Mono", ui-monospace, monospace;
  color: #240B21;
  background: #F6F1ED;
  border: 1px solid rgba(36, 11, 33, 0.12);
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
  border: 1px solid rgba(36, 11, 33, 0.14);
  background: #F6F1ED;
  color: #240B21;
  font: 500 12px/1 "Instrument Sans", system-ui, sans-serif;
  padding: 7px 13px;
  min-height: 32px;
  border-radius: 999px;
  cursor: pointer;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}
.pl-os-btn:hover {
  background: #FFFDFB;
  border-color: rgba(36, 11, 33, 0.34);
}
.pl-os-btn[aria-pressed="true"] {
  background: #240B21;
  color: #FFFDFB;
  border-color: #240B21;
}
.pl-os-frame {
  flex: 1 1 auto;
  width: 100%;
  min-height: 640px;
  border: 0;
  background: #F6F1ED;
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

/** Build the /nz-planting-studio/studio-v9.2 embed URL for an optional project & mode. Pure and Node-testable. */
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
  return `/nz-planting-studio/studio-v9.2?${params.toString()}`;
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
  const publicBed=!isTab && !project && location.hash==='#/planting' ? history.state?.publicBed : null;
  const suffix=publicBed ? '#public-bed='+encodeURIComponent(publicBed) : '';
  const initialUrl = buildPlantingEmbedUrl(project, { mode })+suffix;
  const standaloneUrl = new URL(initialUrl,location.href);
  standaloneUrl.searchParams.delete('embed');

  el.innerHTML = `
    <section class="pl-os-shell${isTab ? ' is-tab' : ''}" aria-label="Aotearoa 3D Planting Studio">
      <div class="pl-os-bar">
        <div class="pl-os-meta">
          <span class="pl-os-eyebrow">Aotearoa Planting Studio · v9.2</span>
          <span class="pl-os-title">${esc(project?.name ? `${project.name} · Site, Pool & Native Planting` : '3D Native Planting, Pool F9 & LINZ Site Studio')}</span>
          <span class="pl-os-stats" data-pl-stats hidden></span>
        </div>
        <div class="pl-os-actions" role="group" aria-label="Planting workspace mode">
          <button type="button" class="pl-os-btn" data-pl-mode="studio" aria-pressed="true">3D Garden</button>
          <button type="button" class="pl-os-btn" data-pl-mode="model" aria-pressed="false">Model Grid</button>
          <button type="button" class="pl-os-btn" data-pl-mode="photo" aria-pressed="false">Photo Match</button>
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
    // Keep a continued design mounted when switching views, including any new edits.
    if (publicBed) {
      iframe?.contentWindow?.__nzStudio?.setViewMode(mode === 'studio' ? '3d' : mode);
      return;
    }
    const nextUrl = buildPlantingEmbedUrl(project, { mode });
    if (iframe) iframe.src = nextUrl;
    if (extLink) extLink.href = nextUrl.replace(/([?&])embed=os&?/, '$1').replace(/[?&]$/, '');
  };
  el.addEventListener('click', onModeClick);

  const onMessage = (ev) => {
    if (ev.origin !== location.origin || ev.source!==iframe?.contentWindow) return;
    const data = ev.data;
    if(publicBed && data?.type==='assembl:bed-restored'){
      if(statsEl){
        statsEl.textContent='Opened your planting · '+data.count+' plants · Year '+data.year+' · '+new Intl.NumberFormat('en-NZ',{style:'currency',currency:'NZD',maximumFractionDigits:0}).format(data.total/100)+' indicative supply';
        statsEl.hidden=false;statsEl.setAttribute('role','status');
      }
      return;
    }
    if(publicBed && data?.type==='assembl:bed-recovery'){
      statsEl.textContent='Original example displayed. Use Back to return to your homepage planting.';statsEl.hidden=false;return;
    }
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
