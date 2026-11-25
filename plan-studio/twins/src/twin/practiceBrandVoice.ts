// Compact, Visual-First Working Set (A101–L101), NZBC Pre-Check, Cultural Motifs & Practice Brand Card.
// Mounts onto /plan-studio/twins/drop/ for ALL input kinds (2D Plan, Multi-Sheet PDF, IFC, GLB) with secondary
// editors cleanly tucked behind native <details> disclosure (modern-web-guidance: content-first-noise-reduction).

import * as THREE from 'three/webgpu';
import type { App } from './app';
import {
  defaultNarrativeForModel,
  loadNarrative,
  saveNarrative,
  type CulturalNarrative,
} from './culturalNarrative';
import {
  buildUniversalNzbcPrecheck,
  exportWorkingSetDXF,
  exportWorkingSetPrintableHTML,
  generateWorkingDrawingSet,
  synthesizeLandscapePlan,
  type DrawingBuildingInput,
  type DrawingRoom,
  type LandscapeBed,
  type LandscapePlanInput,
  type LandscapePlant,
  type WorkingSheet,
} from './workingDrawings';
import type { SpecImpactSummary, SpecSelections } from './nzSpecifier';
import { BRAND_KEY, LOOK_CACHE, readBrand } from './practiceLook';

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

const CSS = `
#nzStudioSuite { display: contents; }
.nzb-chips { display: flex; flex-wrap: wrap; gap: 5px; margin: 7px 0 9px; }
.nzb-chip {
  font: 500 10.5px/1.2 'IBM Plex Mono', monospace; padding: 4px 8px; border-radius: 999px;
  background: #e6efe6; color: #24452a;
}
.nzb-chip.review { background: #f8ecd9; color: #8a4b14; }
.nzb-motifs { display: flex; flex-wrap: wrap; gap: 5px; margin: 6px 0; }
.nzb-motif { font: 500 11px 'IBM Plex Mono', monospace; background: var(--plum, #240B21); color: var(--ivory, #F9F6F2); padding: 3px 8px; border-radius: 999px; }
.nzb-drawer { margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(101,74,78,.16); }
.nzb-drawer summary { cursor: pointer; font: 500 12.5px 'Instrument Sans', system-ui, sans-serif; list-style-position: inside; }
.nzb-field { display: block; font-size: 12px; margin: 6px 0; }
.nzb-field input[type="text"], .nzb-field textarea, .nzb-field select {
  width: 100%; margin-top: 3px; padding: 6px 8px; border-radius: 8px;
  border: 1px solid var(--line2, rgba(101,74,78,.3)); font: inherit; font-size: 12.5px;
  background: #FFFDFB; color: #240B21;
}
dialog.nzb-draw-dlg {
  border: 0; border-radius: 16px; padding: 0;
  max-width: min(1080px, calc(100dvw - 24px)); width: 100%; max-height: calc(100dvh - 24px);
  background: #FFFDFB; color: #240B21; box-shadow: 0 24px 64px rgba(24,11,24,.48);
}
dialog.nzb-draw-dlg:modal { overscroll-behavior: contain; }
dialog.nzb-draw-dlg::backdrop { background: rgba(24, 11, 24, 0.6); overflow: hidden; overscroll-behavior: contain; }
.nzb-dlg-in { padding: 16px 20px; display: grid; gap: 10px; }
.nzb-sheet-tabs { display: flex; overflow-x: auto; gap: 4px; border-bottom: 1px solid rgba(101,74,78,.22); padding-bottom: 2px; }
.nzb-sheet-tab {
  flex: none; position: relative; appearance: none; border: 0; background: transparent;
  font: 500 12.5px 'Instrument Sans', system-ui, sans-serif; color: #240B21;
  padding: 7px 12px 9px; cursor: pointer;
}
.nzb-sheet-tab[aria-selected="true"]::after { content: ""; position: absolute; inset: auto 4px 0; border-block-end: 3px solid #240B21; }
.nzb-svg-stage { border: 1px solid rgba(101,74,78,.24); border-radius: 8px; overflow: hidden; background: #FFFDFB; }
`;

export interface BrandVoiceHostOpts {
  app: App;
  model: THREE.Object3D;
  bounds: THREE.Box3;
  inputKind: 'plan' | 'ifc' | 'glb';
  inputName: string;
  rooms: DrawingRoom[];
  getSelections: () => SpecSelections;
  getSpecImpact: () => SpecImpactSummary;
  keys: { label: string; eye: THREE.Vector3; look: THREE.Vector3 }[];
}

export function mountPracticeBrandAndAgents(host: BrandVoiceHostOpts) {
  if (!document.getElementById('nzbSuiteStyle')) {
    const st = document.createElement('style');
    st.id = 'nzbSuiteStyle';
    st.textContent = CSS;
    document.head.append(st);
  }

  let narrative: CulturalNarrative = loadNarrative() ?? defaultNarrativeForModel(host.inputName);

  const readPractice = () => {
    try { return readBrand(localStorage.getItem(BRAND_KEY)); } catch { return { name: '', logo: '' }; }
  };

  const applyHeaderBrand = () => {
    const b = readPractice();
    const w = document.querySelector('.brand .word') as HTMLElement | null;
    if (!w) return;
    if (b.logo) {
      w.innerHTML = `<img src="${esc(b.logo)}" alt="${esc(b.name || 'Practice logo')}" style="height:26px;width:auto;vertical-align:middle;display:inline-block">`;
    } else if (b.name) {
      w.textContent = b.name;
    }
  };
  applyHeaderBrand();

  const makeDrawingInput = (): DrawingBuildingInput => {
    const sz = host.bounds.getSize(new THREE.Vector3());
    let glassArea = 0, solidWallArea = 0;
    const tmp = new THREE.Box3();
    host.model.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || !m.geometry) return;
      if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
      tmp.copy(m.geometry.boundingBox!).applyMatrix4(m.matrixWorld);
      const dx = tmp.max.x - tmp.min.x, dy = tmp.max.y - tmp.min.y, dz = tmp.max.z - tmp.min.z;
      if (dy < 0.4) return;
      const surf = Math.max(dx, dz) * dy;
      const mat = (Array.isArray(m.material) ? m.material[0] : m.material) as THREE.MeshStandardMaterial | undefined;
      if (mat && (/glass|glaz/i.test(mat.name ?? '') || (mat.transparent && mat.opacity < 0.85))) glassArea += surf;
      else if (/wall|cladding|ifcwall/i.test(`${o.name} ${String(o.userData?.ifcClass ?? '')}`)) solidWallArea += surf;
    });
    const wwr = solidWallArea + glassArea > 2 ? Math.min(0.78, Math.max(0.14, glassArea / (solidWallArea + glassArea))) : 0.32;
    const b = readPractice();
    const linzChip = [...document.querySelectorAll('#chips .chip')].find((c) => c.textContent?.startsWith('Site:'))?.textContent ?? 'LINZ 1 m LiDAR / NZVD2016 ready';
    const specSummary = host.getSpecImpact();
    return {
      projectTitle: narrative.projectTitle || host.inputName,
      practiceName: b.name || narrative.practiceName,
      practiceLogo: b.logo,
      stageStatus: narrative.stageStatus,
      drawingSource: host.inputKind === 'plan' ? `Plan Twin (${host.inputName})` : `Measured ${host.inputKind.toUpperCase()} (${host.inputName})`,
      widthM: Math.max(5, sz.x || 18),
      depthM: Math.max(5, sz.z || 12),
      wallHeightM: Math.max(2.4, Math.min((sz.y || 4.2) * 0.62, 6.2)),
      ridgeHeightM: Math.max(3.0, sz.y || 5.4),
      glazingRatio: wwr,
      linzNote: linzChip,
      rooms: host.rooms,
      specSummary,
      narrative,
      landscapePlan: readLandscapePlan(specSummary, narrative),
    };
  };

  /**
   * Reads the brushed garden from `window.__nzGardenState?.()` (world metres by default; pass `coords: 'building'`
   * when already relative to the footprint min corner). Falls back to a proposal synthesised from the
   * landscaping spec + footprint (widthM × depthM) when no beds/plants have been brushed yet.
   */
  function readLandscapePlan(specSummary: SpecImpactSummary, nar: CulturalNarrative): LandscapePlanInput {
    const sz = host.bounds.getSize(new THREE.Vector3());
    const W = Math.max(5, sz.x || 18), D = Math.max(5, sz.z || 12);
    const minX = Number.isFinite(host.bounds.min.x) ? host.bounds.min.x : 0;
    const minZ = Number.isFinite(host.bounds.min.z) ? host.bounds.min.z : 0;
    const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
    let st: Record<string, unknown> | null = null;
    try {
      const fn = (window as unknown as { __nzGardenState?: () => unknown }).__nzGardenState;
      const raw = typeof fn === 'function' ? fn() : null;
      if (raw && typeof raw === 'object') st = raw as Record<string, unknown>;
    } catch { st = null; }
    const world = st?.coords !== 'building';
    const ox = world ? minX : 0, oz = world ? minZ : 0;
    const beds: LandscapeBed[] = Array.isArray(st?.beds)
      ? (st!.beds as Record<string, unknown>[]).flatMap((bd) => {
          const x = num(bd?.x), z = num(bd?.z), r = num(bd?.r);
          return x !== undefined && z !== undefined && r !== undefined && r > 0
            ? [{ x: x - ox, z: z - oz, r, kind: String(bd.kind ?? 'planting') }]
            : [];
        })
      : [];
    const plants: LandscapePlant[] = Array.isArray(st?.plants)
      ? (st!.plants as Record<string, unknown>[]).flatMap((p) => {
          const x = num(p?.x), z = num(p?.z);
          if (x === undefined || z === undefined) return [];
          return [{
            sp: String(p.sp ?? 'Native'),
            x: x - ox,
            z: z - oz,
            s: num(p.s) ?? 1.5,
            sunOk: typeof p.sunOk === 'boolean' ? p.sunOk : undefined,
            rootClash: typeof p.rootClash === 'boolean' ? p.rootClash : undefined,
          }];
        })
      : [];
    const base: LandscapePlanInput = {
      roheLabel: (typeof st?.roheLabel === 'string' && st.roheLabel) || nar.roheOrPlace,
      permeablePct: num(st?.permeablePct),
      imperviousPct: num(st?.imperviousPct),
      detentionLitres: num(st?.detentionLitres),
    };
    if (beds.length || plants.length) return { ...base, beds, plants };
    const syn = synthesizeLandscapePlan({
      projectTitle: '', drawingSource: '', widthM: W, depthM: D, wallHeightM: 3, ridgeHeightM: 5,
      rooms: [], specSummary, narrative: nar,
    });
    return { ...base, ...syn };
  }

  const openDrawingsModal = (initialSheet: WorkingSheet['id'] = 'A101') => {
    document.getElementById('nzbDrawModal')?.remove();
    const dInput = makeDrawingInput();
    const sheets = generateWorkingDrawingSet(dInput);
    let cur = initialSheet;

    const dlg = document.createElement('dialog');
    dlg.id = 'nzbDrawModal';
    dlg.className = 'nzb-draw-dlg';
    dlg.setAttribute('closedby', 'any');
    dlg.setAttribute('aria-labelledby', 'nzbDrawTitle');
    const slug = dInput.projectTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'project';

    const drawModalBody = () => {
      const s = sheets.find((x) => x.id === cur) ?? sheets[0];
      dlg.innerHTML = `
        <div class="nzb-dlg-in">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
            <div>
              <div class="mono small" style="color:#654A4E">A3 WORKING SET · SYNCED WITH 3D TWIN</div>
              <h1 id="nzbDrawTitle" style="margin:2px 0 0;font-size:19px;font-weight:500">${esc(dInput.projectTitle)}</h1>
            </div>
            <form method="dialog"><button class="pill" value="close" autofocus>Close</button></form>
          </div>
          <div class="nzb-sheet-tabs" role="tablist" aria-label="Working drawing sheets">
            ${sheets.map((sh) => `<button type="button" role="tab" class="nzb-sheet-tab" data-sh="${sh.id}" aria-selected="${sh.id === cur}"><span class="mono">${sh.id}</span> · ${esc(sh.title)}</button>`).join('')}
          </div>
          <div class="nzb-svg-stage" role="tabpanel" aria-label="${s.id} ${esc(s.title)}">${s.svg}</div>
          <div class="row wrap" style="justify-content:space-between;align-items:center">
            <span class="small" style="color:#654A4E">Verify dimensions &amp; engineering before consent issue.</span>
            <div class="row wrap">
              <button type="button" class="pill" id="nzbDlSvg">${s.id} SVG</button>
              <button type="button" class="pill" id="nzbDlDxf">DXF</button>
              <button type="button" class="pill solid" id="nzbPrintSet">Printable A3 Set</button>
            </div>
          </div>
        </div>`;

      dlg.querySelectorAll<HTMLButtonElement>('[data-sh]').forEach((b) => {
        b.addEventListener('click', () => { cur = b.dataset.sh as typeof cur; drawModalBody(); });
      });
      dlg.querySelector('#nzbDlSvg')?.addEventListener('click', () => {
        void host.app.save?.(`${slug}-${s.id}.svg`, new Blob([s.svg], { type: 'image/svg+xml' }));
      });
      dlg.querySelector('#nzbDlDxf')?.addEventListener('click', () => {
        void host.app.save?.(`${slug}-working-plan.dxf`, new Blob([exportWorkingSetDXF(dInput)], { type: 'application/dxf' }));
      });
      dlg.querySelector('#nzbPrintSet')?.addEventListener('click', () => {
        const html = exportWorkingSetPrintableHTML(sheets, dInput.projectTitle);
        const w = window.open('', '_blank');
        if (w) { w.document.write(html); w.document.close(); }
        else void host.app.save?.(`${slug}-a3-working-drawings.html`, new Blob([html], { type: 'text/html' }));
      });
    };

    drawModalBody();
    document.body.append(dlg);
    dlg.addEventListener('close', () => { dlg.returnValue = ''; dlg.remove(); });
    dlg.showModal();
  };

  try {
    const pdfRef = sessionStorage.getItem('assembl.nz.pdf-ref-render');
    if (pdfRef) (window as unknown as { __pdfReferenceRender?: string }).__pdfReferenceRender = pdfRef;
  } catch { /* ignore */ }

  const card = document.createElement('section');
  card.className = 'card';
  card.id = 'nzWorkingAgentsCard';

  const renderCard = () => {
    const dInput = makeDrawingInput();
    const checks = buildUniversalNzbcPrecheck(dInput);
    const revN = checks.filter((c) => c.status !== 'meets').length;
    const b = readPractice();
    const curLook = (() => { try { return localStorage.getItem(LOOK_CACHE) || 'assembl'; } catch { return 'assembl'; } })();

    card.innerHTML = `
      <h3>Drawings &amp; Practice</h3>
      <div class="nzb-chips" aria-label="Specialist status">
        <span class="nzb-chip">■ Intake</span>
        <span class="nzb-chip ${revN ? 'review' : ''}">${revN ? `◧ NZBC (${revN})` : '■ NZBC'}</span>
        <span class="nzb-chip">■ A101–L101</span>
        <span class="nzb-chip">■ 4K Render</span>
      </div>
      <div class="row wrap">
        <button type="button" class="pill solid" id="nzbOpenA101">A101–L101 Drawings</button>
        <button type="button" class="pill" id="nzbOpenNzbc">NZBC Check</button>
        <button type="button" class="pill" id="nzbOpenL101">L101 Landscape</button>
      </div>

      <details class="nzb-drawer">
        <summary>Cultural Motifs (${esc(narrative.motifs.slice(0, 3).map((m) => m.term).join(' · '))})</summary>
        <div class="nzb-motifs">${narrative.motifs.map((m) => `<span class="nzb-motif" title="${esc(m.meaning)}">${esc(m.term)}${m.sourcePage ? ` · p.${m.sourcePage}` : ''}</span>`).join('')}</div>
        <label class="nzb-field">Title <input type="text" id="nzbProjTitle" value="${esc(narrative.projectTitle)}"></label>
        <label class="nzb-field">Place / Rohe <input type="text" id="nzbRohe" value="${esc(narrative.roheOrPlace)}"></label>
        <label class="nzb-field">Narrative <textarea id="nzbNarText" rows="2">${esc(narrative.summary)}</textarea></label>
        <button type="button" class="pill" id="nzbSaveNar">Save</button>
      </details>

      <details class="nzb-drawer">
        <summary>Practice Brand${b.name ? ` · ${esc(b.name)}` : ''}</summary>
        <label class="nzb-field">Practice Name <input type="text" id="nzbPracName" placeholder="e.g. Kōwhai Architecture Ltd" value="${esc(b.name || narrative.practiceName)}"></label>
        <div class="row wrap small" style="align-items:center;margin-top:6px">
          <label class="pill" tabindex="0">Logo<input type="file" id="nzbLogoIn" accept="image/png,image/svg+xml,image/webp,image/jpeg" hidden></label>
          <select id="nzbThemeSel" aria-label="Studio theme" style="padding:5px 10px;border-radius:999px">
            <option value="assembl"${curLook === 'assembl' ? ' selected' : ''}>Warm Ivory</option>
            <option value="sketch"${curLook === 'sketch' ? ' selected' : ''}>Dark Sketch</option>
          </select>
          <button type="button" class="pill solid" id="nzbSaveBrand">Apply</button>
        </div>
        <p class="small mono" id="nzbBrandStatus" role="status" aria-live="polite"></p>
      </details>`;

    card.querySelector('#nzbOpenA101')?.addEventListener('click', () => openDrawingsModal('A101'));
    card.querySelector('#nzbOpenNzbc')?.addEventListener('click', () => openDrawingsModal('A301'));
    card.querySelector('#nzbOpenL101')?.addEventListener('click', () => openDrawingsModal('L101'));

    card.querySelector('#nzbSaveNar')?.addEventListener('click', () => {
      narrative = {
        ...narrative,
        projectTitle: (card.querySelector('#nzbProjTitle') as HTMLInputElement).value.trim() || narrative.projectTitle,
        roheOrPlace: (card.querySelector('#nzbRohe') as HTMLInputElement).value.trim() || narrative.roheOrPlace,
        summary: (card.querySelector('#nzbNarText') as HTMLTextAreaElement).value.trim() || narrative.summary,
        source: 'architect-entered',
      };
      saveNarrative(narrative);
      const tEl = document.getElementById('title');
      if (tEl) tEl.textContent = narrative.projectTitle;
      renderCard();
      host.app.log('Cultural narrative updated.');
    });

    let pendingLogo = b.logo;
    const setStatus = (msg: string) => {
      const s = card.querySelector('#nzbBrandStatus');
      if (s) s.textContent = msg;
    };

    card.querySelector('#nzbLogoIn')?.addEventListener('change', (e) => {
      const f = (e.target as HTMLInputElement).files?.[0];
      if (!f) return;
      if (f.size > 350_000) { setStatus('Choose a logo under 350 KB.'); return; }
      const r = new FileReader();
      r.onload = () => { pendingLogo = String(r.result ?? ''); setStatus(`${f.name} ready.`); };
      r.readAsDataURL(f);
    });

    card.querySelector('#nzbSaveBrand')?.addEventListener('click', () => {
      const name = (card.querySelector('#nzbPracName') as HTMLInputElement).value.trim().slice(0, 60);
      const theme = (card.querySelector('#nzbThemeSel') as HTMLSelectElement).value;
      try {
        const prev = JSON.parse(localStorage.getItem(BRAND_KEY) ?? 'null') as Record<string, unknown> | null;
        localStorage.setItem(BRAND_KEY, JSON.stringify({ ...(prev ?? {}), name, logo: pendingLogo, at: Date.now() }));
        localStorage.setItem(LOOK_CACHE, theme);
      } catch { /* ignore */ }
      if (theme === 'sketch') document.documentElement.dataset.look = 'sketch';
      else delete document.documentElement.dataset.look;
      applyHeaderBrand();
      setStatus(`Applied ${name || 'assembl.'}`);
    });
  };

  renderCard();

  return {
    el: card,
    refresh: () => { renderCard(); },
    openDrawingsModal,
  };
}
