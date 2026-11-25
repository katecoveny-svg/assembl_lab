// Live NZ Architectural Specifier Studio Card + Interactive Client Walkthrough Share Experience (?client=1).
// Applies material, colour, fitting, furniture/layout, lighting & NZ native landscaping selections LIVE in the 3D WebGPU/WebGL
// twin (zero page reload!) for BOTH 2D plans and opened IFC/GLB models, while updating live Cost ($ NZD) & Programme Delay.

import * as THREE from 'three/webgpu';
import QRCode from 'qrcode';
import type { App } from './app';
import {
  SPEC_CATEGORIES,
  calculateSpecImpact,
  completeSpecSelections,
  decodeSpecSelections,
  encodeSpecSelections,
  exportSpecCSV,
  exportSpecHTML,
  formatNzdDelta,
  formatNzdTotal,
  getSpecOption,
  type SpecCategoryId,
  type SpecSelections,
} from './nzSpecifier';
import { planting, type Placement as PlantPlacement, type Species } from './plants';
import { mountNzLandscapeBrush } from './nzLandscapeBrush';
import { BRAND_KEY, readBrand } from './practiceLook';
import { cameraQuery } from './share';

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

const CSS = `
#nzSpecCard { container-type: inline-size; }
.nzs-summary {
  display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
  background: var(--plum, #240B21); color: var(--ivory, #F9F6F2);
  border-radius: 10px; padding: 10px 12px; margin: 8px 0;
}
.nzs-kicker { font: 500 10px/1.2 'IBM Plex Mono', monospace; text-transform: uppercase; letter-spacing: .1em; color: #D9BACB; }
.nzs-big { font: 500 16px/1.2 'IBM Plex Mono', monospace; margin-top: 2px; }
.nzs-big.is-warn { color: #F5C689; }
.nzs-big.is-ok { color: #A9E4C2; }
.nzs-sub { font-size: 11.5px; color: #CBBBC6; margin-top: 2px; }

/* Single-row accessible scrolling tablist (modern-web-guidance: tabs) */
.nzs-tabs {
  display: flex; overflow-x: auto; gap: 2px; border-bottom: 1px solid var(--line2, rgba(101,74,78,.25));
  padding-bottom: 2px; margin: 8px 0; scrollbar-width: thin; scroll-snap-type: inline proximity;
}
.nzs-tab {
  flex: none; scroll-snap-align: start; position: relative;
  appearance: none; border: 0; background: transparent; color: var(--ink, #240B21);
  font: 500 12px/1.2 'Instrument Sans', system-ui, sans-serif;
  padding: 7px 10px 9px; cursor: pointer; border-radius: 6px 6px 0 0;
}
.nzs-tab[aria-selected="true"] { color: var(--plum, #240B21); }
.nzs-tab[aria-selected="true"]::after {
  content: ""; position: absolute; inset: auto 4px 0;
  border-block-end: 3px solid currentColor;
}
.nzs-tab:focus-visible { outline: 2px solid var(--rose, #916A70); outline-offset: -2px; }

.nzs-opts { display: grid; gap: 6px; margin: 8px 0; }
.nzs-opt {
  display: grid; grid-template-columns: 22px 1fr auto; gap: 8px; align-items: center;
  text-align: left; padding: 8px 10px; border-radius: 8px;
  border: 1px solid var(--line2, rgba(101,74,78,.25)); background: rgba(255,253,251,.75);
  color: var(--ink, #240B21); cursor: pointer; font: inherit;
}
.nzs-opt[aria-pressed="true"] {
  border-color: var(--plum, #240B21); box-shadow: inset 0 0 0 1px var(--plum, #240B21);
  background: #FFFDFB;
}
.nzs-swatch { width: 20px; height: 20px; border-radius: 999px; border: 1px solid rgba(36,11,33,.28); display: block; }
.nzs-opt-title { font-size: 13px; font-weight: 500; line-height: 1.25; }
.nzs-opt-meta { font: 400 11px/1.3 'IBM Plex Mono', monospace; color: #654A4E; margin-top: 2px; }
.nzs-opt-right { text-align: right; font: 500 11px/1.3 'IBM Plex Mono', monospace; }

/* Modal <dialog> + responsive stacked schedule table (modern-web-guidance: dialog + responsive-table) */
dialog.nzs-dialog {
  border: 0; border-radius: 16px; padding: 0;
  max-width: min(880px, calc(100dvw - 24px)); width: 100%; max-height: calc(100dvh - 28px);
  background: #FFFDFB; color: #240B21; box-shadow: 0 24px 64px rgba(24,11,24,.45);
}
dialog.nzs-dialog:modal { overscroll-behavior: contain; }
dialog.nzs-dialog::backdrop { background: rgba(24, 11, 24, 0.56); overflow: hidden; overscroll-behavior: contain; }
.nzs-dlg-in { padding: 18px 20px; display: grid; gap: 12px; }
.nzs-dlg-head { display: flex; justify-content: space-between; align-items: start; gap: 12px; }
.nzs-dlg-head h1 { margin: 0; font-size: 20px; font-weight: 500; letter-spacing: -.025em; }

.nzs-table-wrap {
  overflow: auto; max-inline-size: 100%; max-block-size: min(440px, 60dvh);
  container-type: inline-size; border: 1px solid rgba(101,74,78,.22); border-radius: 10px;
}
.nzs-table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 13px;
  --label-2: "Selected Specification"; --label-3: "NZBC"; --label-4: "Allowance"; --label-5: "Variation"; --label-6: "Lead / Delay";
}
.nzs-table thead { position: sticky; inset-block-start: 0; z-index: 2; }
.nzs-table thead th { background: #F6F1ED; color: #654A4E; font: 500 10.5px 'IBM Plex Mono', monospace; text-transform: uppercase; letter-spacing: .08em; padding: 9px 10px; text-align: left; border-bottom: 1px solid rgba(101,74,78,.22); }
.nzs-table tbody th, .nzs-table tbody td { padding: 9px 10px; border-bottom: 1px solid rgba(101,74,78,.14); text-align: left; vertical-align: top; }
.nzs-table tbody th { position: sticky; inset-inline-start: 0; z-index: 1; background: #FFFDFB; font-weight: 500; }

@container (width < 580px) {
  .nzs-table, .nzs-table thead, .nzs-table tbody, .nzs-table tr, .nzs-table th, .nzs-table td { display: block; }
  .nzs-table thead { display: none; }
  .nzs-table tr { border-bottom: 2px solid rgba(101,74,78,.22); padding-bottom: 6px; margin-bottom: 6px; }
  .nzs-table tbody th { position: sticky; inset-block-start: 0; background: #F6F1ED; }
  .nzs-table td:nth-child(2)::before { content: var(--label-2) ": "; font-weight: 500; }
  .nzs-table td:nth-child(3)::before { content: var(--label-3) ": "; font-weight: 500; }
  .nzs-table td:nth-child(4)::before { content: var(--label-4) ": "; font-weight: 500; }
  .nzs-table td:nth-child(5)::before { content: var(--label-5) ": "; font-weight: 500; }
  .nzs-table td:nth-child(6)::before { content: var(--label-6) ": "; font-weight: 500; }
}

/* Floating Client Walkthrough Bar (?client=1) */
.nzs-client-bar {
  position: absolute; left: 12px; right: 12px; bottom: 12px; z-index: 8;
  background: rgba(24, 11, 24, 0.9); backdrop-filter: blur(14px); color: #F9F6F2;
  border: 1px solid rgba(217, 186, 203, 0.34); border-radius: 16px;
  padding: 10px 14px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px;
  box-shadow: 0 14px 40px rgba(0,0,0,.38);
}
.nzs-client-bar select {
  background: rgba(255,253,251,.1); color: #F9F6F2; border: 1px solid rgba(217,186,203,.35);
  border-radius: 999px; padding: 5px 10px; font-size: 12px;
}
.nzs-client-bar select option { background: #180B18; color: #F9F6F2; }
`;

export interface SpecifierHostOpts {
  app: App;
  model: THREE.Object3D;
  bounds: THREE.Box3;
  projectTitle: string;
  groundAt: (x: number, z: number) => number;
  onChange?: (selections: SpecSelections) => void;
}

function estimateFloorArea(bounds: THREE.Box3): number {
  const sz = bounds.getSize(new THREE.Vector3());
  if (!Number.isFinite(sz.x) || sz.x <= 0.5 || sz.z <= 0.5) return 185;
  const footprint = sz.x * sz.z * 0.74; // architectural net-to-bbox factor
  const storeys = sz.y > 5.8 ? 1.45 : 1;
  return Math.max(45, Math.min(8000, Math.round(footprint * storeys)));
}

/** Apply current NZ Specifier selections directly onto the live Three.js model & landscape in real time */
export function applySpecToScene(host: SpecifierHostOpts, selections: SpecSelections, customFloraHolder: THREE.Group) {
  const clad = getSpecOption('cladding', selections.cladding);
  const roof = getSpecOption('roof', selections.roof);
  const join = getSpecOption('joinery', selections.joinery);
  const col = getSpecOption('colours', selections.colours);
  const flr = getSpecOption('flooring', selections.flooring);
  const fit = getSpecOption('fittings', selections.fittings);
  const fout = getSpecOption('fitout', selections.fitout);
  const lgt = getSpecOption('lighting', selections.lighting);
  const lnd = getSpecOption('landscaping', selections.landscaping);

  const seen = new Set<THREE.Material>();
  host.model.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const objName = `${obj.name} ${obj.parent?.name ?? ''} ${String(obj.userData?.name ?? '')} ${String(obj.userData?.ifcClass ?? '')}`.toLowerCase();

    for (const m of mats) {
      const std = m as THREE.MeshStandardMaterial;
      if (!std || !std.color || seen.has(m)) continue;
      if (std.transparent && std.opacity < 0.85) continue; // never paint over glass
      const mName = `${std.name ?? ''} ${String(std.userData?.scanned ?? '')}`.toLowerCase();
      const tag = `${objName} ${mName}`;

      let target: { hex: number; roughness: number; metalness: number } | null = null;
      if (/roof|corrugat|standing_seam|gutter|fascia|ifcroof/.test(tag)) {
        target = roof.render;
      } else if (/mullion|joinery|window_frame|door_frame|frame_metal|anodised|powdercoat|ifcwindow/.test(tag)) {
        target = join.render;
      } else if (/tapware|mixer|shower|towel_rail|handle|brass|stainless|chrome/.test(tag)) {
        target = fit.render;
      } else if (/cabinet|vanity|wardrobe|bench|island|sofa|upholster|boucle|linen/.test(tag)) {
        target = /sofa|upholster|boucle|cushion/.test(tag) && fout.render.accentHex
          ? { hex: fout.render.accentHex, roughness: 0.78, metalness: 0 }
          : fout.render;
      } else if (/floor|slab_interior|oak|rimu|terrazzo|carpet/.test(tag) && !/ground|terrain|lawn/.test(tag)) {
        target = flr.render;
      } else if (/lining|plaster|interior_wall|ceiling|partition/.test(tag)) {
        target = col.render;
      } else if (/cladding|weatherboard|shiplap|brick|exterior_wall|ifcwall/.test(tag)) {
        target = clad.render;
      }

      if (target) {
        seen.add(m);
        std.color.setHex(target.hex);
        std.roughness = target.roughness;
        std.metalness = target.metalness;
        std.needsUpdate = true;
      }
    }
  });

  // Trigger live hall/room layout transition if interiorAgent is mounted and supports the mode
  const winInt = (window as unknown as { __interior?: { layoutModes?: () => string[]; setLayout?: (m: string) => Promise<string> } }).__interior;
  if (fout.render.layoutMode && winInt?.layoutModes?.().includes(fout.render.layoutMode)) {
    void winInt.setLayout?.(fout.render.layoutMode).catch(() => {});
  }

  // Adjust warm interior/eave lights based on Lighting package
  const boost = lgt.render.lightBoost ?? 1.0;
  const kelvinHex = (lgt.render.lightKelvin ?? 3000) <= 2750 ? 0xffcb88 : 0xffe8c2;
  host.app.scene.traverse((o) => {
    const pl = o as THREE.PointLight;
    if (pl.isPointLight) {
      if (pl.userData.baseIntensity === undefined) pl.userData.baseIntensity = pl.intensity || 1;
      pl.intensity = pl.userData.baseIntensity * boost;
      pl.color.setHex(kelvinHex);
    }
  });

  // Update NZ Native Perimeter Landscaping Ring around the building bounds
  while (customFloraHolder.children.length) {
    const ch = customFloraHolder.children[0];
    customFloraHolder.remove(ch);
  }
  const density = lnd.render.floraDensity ?? 1.0;
  const palette = lnd.render.floraPalette ?? 'coastal';
  if (density > 0.45) {
    const cx = (host.bounds.min.x + host.bounds.max.x) / 2;
    const cz = (host.bounds.min.z + host.bounds.max.z) / 2;
    const rx = Math.max(8, (host.bounds.max.x - host.bounds.min.x) / 2 + 4.2);
    const rz = Math.max(8, (host.bounds.max.z - host.bounds.min.z) / 2 + 4.2);
    const count = Math.min(36, Math.round(16 * density));
    const speciesPool: Species[] =
      palette === 'bush'
        ? ['ponga', 'nikau', 'tikouka', 'fern', 'harakeke']
        : palette === 'wetland'
          ? ['harakeke', 'tikouka', 'tussock', 'fern']
          : ['harakeke', 'tikouka', 'hebe', 'tussock', 'ponga'];
    const pts: PlantPlacement[] = [];
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + 0.35;
      // Leave clear entry gap in front (+z)
      if (Math.sin(a) > 0.78 && Math.abs(Math.cos(a)) < 0.45) continue;
      const jitter = 1 + ((i * 7) % 5) * 0.08;
      const px = cx + Math.cos(a) * rx * jitter;
      const pz = cz + Math.sin(a) * rz * jitter;
      const py = host.groundAt(px, pz);
      pts.push({
        sp: speciesPool[i % speciesPool.length],
        x: px,
        y: py - 0.03,
        z: pz,
        s: 0.85 + ((i * 3) % 5) * 0.12,
      });
    }
    if (pts.length) {
      const pg = planting(pts, `NZ native landscaping (${lnd.label}) — proposed.`);
      customFloraHolder.add(pg);
    }
  }
}

export function mountNzSpecifier(host: SpecifierHostOpts) {
  if (!document.getElementById('nzSpecStyle')) {
    const st = document.createElement('style');
    st.id = 'nzSpecStyle';
    st.textContent = CSS;
    document.head.append(st);
  }

  const qs = new URLSearchParams(location.search);
  let selections: SpecSelections = decodeSpecSelections(qs.get('spec')) ?? completeSpecSelections();
  let activeCat: SpecCategoryId = 'cladding';
  let floorAreaM2 = Number(qs.get('area')) || estimateFloorArea(host.bounds);
  let floatWeeks = Number(qs.get('float')) || 6;
  let clientBarOn = qs.get('client') === '1';

  const floraHolder = new THREE.Group();
  floraHolder.name = 'nz_specifier_landscaping';
  host.app.scene.add(floraHolder);

  const plantBrush = mountNzLandscapeBrush({
    app: host.app,
    bounds: host.bounds,
    groundAt: host.groundAt,
    onStatsChange: () => {
      if (clientBarOn) renderClientBar();
    },
  });

  // Sync URL cleanly without reloading page
  const syncUrl = () => {
    try {
      const u = new URL(location.href);
      u.searchParams.set('spec', encodeSpecSelections(selections));
      history.replaceState(null, '', u.toString());
    } catch { /* ignore */ }
  };

  const card = document.createElement('section');
  card.className = 'card';
  card.id = 'nzSpecCard';

  let clientBar: HTMLElement | null = null;

  const openScheduleModal = () => {
    document.getElementById('nzsModal')?.remove();
    const sum = calculateSpecImpact(selections, { floorAreaM2, baselineFloatWeeks: floatWeeks });
    const br = (() => { try { return readBrand(localStorage.getItem(BRAND_KEY)); } catch { return { name: '', logo: '' }; } })();
    const dlg = document.createElement('dialog');
    dlg.id = 'nzsModal';
    dlg.className = 'nzs-dialog';
    dlg.setAttribute('closedby', 'any');
    dlg.setAttribute('aria-labelledby', 'nzsModalTitle');
    dlg.innerHTML = `
      <div class="nzs-dlg-in">
        <div class="nzs-dlg-head">
          <div>
            <div class="nzs-kicker" style="color:#654A4E">${esc(br.name || 'assembl · NZ Architectural Specifier')}</div>
            <h1 id="nzsModalTitle">${esc(host.projectTitle)} — Live Cost &amp; Programme Variation Schedule</h1>
          </div>
          <form method="dialog"><button class="pill" value="close" autofocus>Close</button></form>
        </div>
        <div class="row wrap small" style="gap:12px">
          <label>Measured / target floor area <input type="number" id="nzsAreaIn" min="35" max="12000" value="${floorAreaM2}" style="width:78px"> m²</label>
          <label>Procurement float <input type="number" id="nzsFloatIn" min="2" max="20" value="${floatWeeks}" style="width:58px"> weeks</label>
          <span class="mono">Total packages: <b>${formatNzdTotal(sum.selectedTotalNzd)}</b> · Variation: <b>${formatNzdDelta(sum.netDeltaNzd)}</b> · Delay: <b>${sum.netDelayWeeks > 0 ? `+${sum.netDelayWeeks} wks (+${sum.netDelayWorkingDays} days)` : '0 days'}</b></span>
        </div>
        <div tabindex="0" role="region" aria-labelledby="nzsModalTitle" class="nzs-table-wrap">
          <table class="nzs-table">
            <thead><tr><th>Element</th><th>Selected Specification</th><th>NZBC</th><th>Allowance</th><th>Variation</th><th>Lead / Delay</th></tr></thead>
            <tbody>
              ${sum.rows.map((r) => `
                <tr>
                  <th>${esc(r.categoryTitle)}<br><span class="small" style="font-weight:400;color:#654A4E">${esc(r.quantityText)}</span></th>
                  <td><b>${esc(r.selectedLabel)}</b><br><span class="small" style="color:#654A4E">${esc(r.specLine)}</span></td>
                  <td class="mono small">${esc(r.nzbcClause)}</td>
                  <td class="mono">${formatNzdTotal(r.selectedCostNzd)}</td>
                  <td class="mono">${formatNzdDelta(r.deltaNzd)}</td>
                  <td class="mono">${r.leadWeeks} wks${r.delayWeeks > 0 ? `<br><b style="color:#9b2f45">+${r.delayWeeks} wk delay</b>` : '<br><span style="color:#2F6B4F">On track</span>'}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
        <p class="small" style="margin:0;color:#654A4E">Indicative New Zealand supply &amp; install allowances (NZD excl. GST). Confirm supplier quotes, lead times and council consent documentation before procurement.${(() => {
          const gs = plantBrush.getStats();
          return gs.totalNzd > 0
            ? ` <b>Brushed 3D Garden (${esc(gs.roheLabel)}, Yr ${gs.growthYear}):</b> ${gs.areaM2.toFixed(1)} m², ${gs.plantCount} plants, Permeable ${gs.permeablePct}%, NZBC E1 ${gs.detentionLitres.toLocaleString('en-NZ')} L (~${formatNzdTotal(gs.totalNzd)} NZD indicative).`
            : '';
        })()}</p>
        <div class="row wrap" style="justify-content:flex-end">
          <button type="button" class="pill" id="nzsDlCsv">Download CSV Schedule</button>
          <button type="button" class="pill solid" id="nzsDlHtml">Printable Client Sign-Off (HTML/PDF)</button>
        </div>
      </div>`;
    document.body.append(dlg);
    dlg.addEventListener('close', () => { dlg.returnValue = ''; dlg.remove(); });
    // Fallback light-dismiss where HTMLDialogElement.prototype.closedBy is absent
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      let downOut = false;
      const out = (e: PointerEvent) => { const r = dlg.getBoundingClientRect(); return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom; };
      dlg.addEventListener('pointerdown', (e) => { downOut = out(e); });
      dlg.addEventListener('pointerup', (e) => { if (downOut && out(e)) dlg.close(); });
    }
    dlg.querySelector('#nzsAreaIn')?.addEventListener('change', (e) => {
      floorAreaM2 = Math.max(35, Number((e.target as HTMLInputElement).value) || 185);
      dlg.close(); renderCard(); renderClientBar(); openScheduleModal();
    });
    dlg.querySelector('#nzsFloatIn')?.addEventListener('change', (e) => {
      floatWeeks = Math.max(2, Number((e.target as HTMLInputElement).value) || 6);
      dlg.close(); renderCard(); renderClientBar(); openScheduleModal();
    });
    const slug = host.projectTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'project';
    dlg.querySelector('#nzsDlCsv')?.addEventListener('click', () => {
      void host.app.save?.(`${slug}-nz-spec-cost-schedule.csv`, new Blob([exportSpecCSV(sum, host.projectTitle, br.name)], { type: 'text/csv' }));
    });
    dlg.querySelector('#nzsDlHtml')?.addEventListener('click', () => {
      const html = exportSpecHTML(sum, host.projectTitle, br.name, br.logo);
      const w = window.open('', '_blank');
      if (w) { w.document.write(html); w.document.close(); }
      else void host.app.save?.(`${slug}-client-signoff-schedule.html`, new Blob([html], { type: 'text/html' }));
    });
    dlg.showModal();
  };

  const openClientShareModal = async () => {
    document.getElementById('nzsShareDlg')?.remove();
    const u = new URL(location.href);
    u.searchParams.set('client', '1');
    u.searchParams.set('spec', encodeSpecSelections(selections));
    u.searchParams.set('area', String(floorAreaM2));
    u.searchParams.set('float', String(floatWeeks));
    u.searchParams.set('cam', cameraQuery(host.app));
    const url = u.toString();
    const qr = await QRCode.toDataURL(url, { margin: 1, width: 220, color: { dark: '#240B21', light: '#FFFDFB' } });

    const dlg = document.createElement('dialog');
    dlg.id = 'nzsShareDlg';
    dlg.className = 'nzs-dialog';
    dlg.style.maxWidth = '480px';
    dlg.setAttribute('closedby', 'any');
    dlg.setAttribute('aria-labelledby', 'nzsShareTitle');
    dlg.innerHTML = `
      <div class="nzs-dlg-in">
        <div class="nzs-dlg-head">
          <h1 id="nzsShareTitle">Share Interactive Client Walkthrough</h1>
          <form method="dialog"><button class="pill" value="close" autofocus>Close</button></form>
        </div>
        <p class="small" style="margin:0">Clients open directly in first-person walkthrough &amp; live specifier mode — they can walk inside, swap NZ cladding, joinery, colours, fittings, furniture, lighting &amp; native landscaping, and see live NZD cost &amp; programme impact.</p>
        <div style="display:flex;justify-content:center"><img src="${qr}" width="200" height="200" alt="QR code for client walkthrough link" style="border-radius:10px;border:1px solid rgba(101,74,78,.2)" /></div>
        <input type="text" readonly value="${esc(url)}" aria-label="Client walkthrough URL" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid rgba(101,74,78,.3);font:12px 'IBM Plex Mono',monospace" />
        <div class="row wrap" style="justify-content:flex-end">
          <button type="button" class="pill" id="nzsPreviewClient">${clientBarOn ? 'Hide Client HUD Here' : 'Preview Client HUD Here'}</button>
          <button type="button" class="pill solid" id="nzsCopyClient">Copy Client Link</button>
        </div>
      </div>`;
    document.body.append(dlg);
    dlg.addEventListener('close', () => { dlg.returnValue = ''; dlg.remove(); });
    dlg.querySelector('#nzsCopyClient')?.addEventListener('click', async (e) => {
      await navigator.clipboard?.writeText(url).catch(() => {});
      (e.currentTarget as HTMLButtonElement).textContent = '✓ Copied!';
      host.app.log('Client walkthrough link copied to clipboard.');
    });
    dlg.querySelector('#nzsPreviewClient')?.addEventListener('click', () => {
      clientBarOn = !clientBarOn;
      renderClientBar();
      dlg.close();
    });
    dlg.showModal();
  };

  const renderClientBar = () => {
    clientBar?.remove();
    clientBar = null;
    if (!clientBarOn) return;
    const sum = calculateSpecImpact(selections, { floorAreaM2, baselineFloatWeeks: floatWeeks });
    const br = (() => { try { return readBrand(localStorage.getItem(BRAND_KEY)); } catch { return { name: '', logo: '' }; } })();
    const stage = host.app.canvas.parentElement;
    if (!stage) return;
    const bar = document.createElement('div');
    bar.className = 'nzs-client-bar';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'Client interactive walkthrough and specification picker');
    bar.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        ${br.logo ? `<img src="${esc(br.logo)}" alt="" style="height:22px;width:auto">` : ''}
        <span class="mono small" style="color:#D9BACB">${esc(br.name || 'Client Walkthrough')}</span>
        <button type="button" class="pill solid" id="nzsClientWalk">Walk Inside (1st-Person)</button>
        ${(['cladding', 'joinery', 'colours', 'fittings', 'fitout', 'lighting', 'landscaping'] as SpecCategoryId[]).map((cid) => {
          const cat = SPEC_CATEGORIES.find((c) => c.id === cid)!;
          return `<select data-client-cat="${cid}" aria-label="${esc(cat.title)}">${cat.options.map((o) => `<option value="${o.id}"${selections[cid] === o.id ? ' selected' : ''}>${esc(cat.shortTitle)}: ${esc(o.label.split(',')[0])}</option>`).join('')}</select>`;
        }).join('')}
      </div>
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <span class="mono small"><b>${formatNzdDelta(sum.netDeltaNzd)}</b> · <b style="color:${sum.netDelayWeeks > 0 ? '#F5C689' : '#A9E4C2'}">${sum.netDelayWeeks > 0 ? `+${sum.netDelayWeeks} wk (+${sum.netDelayWorkingDays}d) delay` : '0d delay'}</b></span>
        <button type="button" class="pill" id="nzsClientSched">Cost &amp; Delay Table</button>
        <button type="button" class="pill" id="nzsClientHide" aria-label="Exit client overlay">✕</button>
      </div>`;
    stage.append(bar);
    clientBar = bar;
    bar.querySelector('#nzsClientWalk')?.addEventListener('click', () => {
      (document.getElementById('walk') as HTMLButtonElement | null)?.click();
    });
    bar.querySelector('#nzsClientSched')?.addEventListener('click', openScheduleModal);
    bar.querySelector('#nzsClientHide')?.addEventListener('click', () => { clientBarOn = false; renderClientBar(); });
    bar.querySelectorAll<HTMLSelectElement>('[data-client-cat]').forEach((sel) => {
      sel.addEventListener('change', () => {
        const cid = sel.dataset.clientCat as SpecCategoryId;
        selections = { ...selections, [cid]: sel.value };
        applySpecToScene(host, selections, floraHolder);
        syncUrl();
        renderCard();
        renderClientBar();
        host.onChange?.(selections);
      });
    });
  };

  const renderCard = () => {
    const sum = calculateSpecImpact(selections, { floorAreaM2, baselineFloatWeeks: floatWeeks });
    const cat = SPEC_CATEGORIES.find((c) => c.id === activeCat)!;
    const baseOpt = getSpecOption(cat.id, cat.baselineOptionId);

    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
        <h3 style="margin:0">Palette &amp; Cost</h3>
        <span class="mono small" aria-live="polite"><b>${sum.netDeltaNzd === 0 ? '$0 NZD' : formatNzdDelta(sum.netDeltaNzd)}</b> · <b style="color:${sum.netDelayWeeks > 0 ? '#9b2f45' : '#2F6B4F'}">${sum.netDelayWeeks > 0 ? `+${sum.netDelayWeeks}w` : '0d delay'}</b></span>
      </div>

      <div class="nzs-tabs" role="tablist" focusgroup="tablist nomemory" aria-label="New Zealand specification categories">
        ${SPEC_CATEGORIES.map((c) => `<button type="button" role="tab" id="nzs-tab-${c.id}" class="nzs-tab" data-cat="${c.id}" aria-selected="${c.id === activeCat}"${c.id === activeCat ? ' focusgroupstart tabindex="0"' : ' tabindex="-1"'}>${esc(c.shortTitle)}</button>`).join('')}
      </div>

      <div class="nzs-opts" role="tabpanel" aria-labelledby="nzs-tab-${cat.id}">
        ${cat.options.map((o) => {
          const on = selections[cat.id] === o.id;
          const qty = o.unit === 'm2' ? Math.round(floorAreaM2 * cat.areaFactor) : 1;
          const pkgScale = floorAreaM2 > 350 ? Math.min(3.4, 1 + (floorAreaM2 - 350) / 650) : 1;
          const optDelta = Math.round((o.unit === 'm2' ? qty * o.rateNzd : o.rateNzd * pkgScale) - (baseOpt.unit === 'm2' ? qty * baseOpt.rateNzd : baseOpt.rateNzd * pkgScale));
          const extraWks = Math.max(0, o.leadWeeks - floatWeeks);
          return `<button type="button" class="nzs-opt" data-opt="${o.id}" aria-pressed="${on}" title="${esc(o.specLine)} · ${esc(o.nzbcClause)}">
            <span class="nzs-swatch" style="background:${esc(o.swatch)}" aria-hidden="true"></span>
            <span class="nzs-opt-title">${esc(o.label.split(',')[0])}</span>
            <span class="nzs-opt-right">${optDelta === 0 ? 'Base' : `${optDelta > 0 ? '+' : '−'}$${(Math.abs(optDelta) / 1000).toFixed(1).replace(/\.0$/, '')}k`} · <span style="color:${extraWks > 0 ? '#9b2f45' : '#2F6B4F'}">${extraWks > 0 ? `+${extraWks}w` : `${o.leadWeeks}w`}</span></span>
          </button>`;
        }).join('')}
      </div>

      <div class="row wrap">
        <button type="button" class="pill solid" id="nzsShareClient">Share Walk</button>
        <button type="button" class="pill" id="nzsOpenTable">Schedule</button>
        <button type="button" class="pill" id="nzsToggleHud">${clientBarOn ? 'Hide HUD' : 'Client HUD'}</button>
      </div>`;

    const tabs = [...card.querySelectorAll<HTMLButtonElement>('[data-cat]')];
    const activateTab = (cid: SpecCategoryId, focusIt = false) => {
      activeCat = cid;
      renderCard();
      const activeBtn = card.querySelector<HTMLButtonElement>(`[data-cat="${activeCat}"]`);
      activeBtn?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      if (focusIt) activeBtn?.focus();
    };
    tabs.forEach((tab, idx) => {
      tab.addEventListener('click', () => activateTab(tab.dataset.cat as SpecCategoryId));
      tab.addEventListener('keydown', (e) => {
        let nextIdx = -1;
        if (e.key === 'ArrowRight') nextIdx = (idx + 1) % tabs.length;
        else if (e.key === 'ArrowLeft') nextIdx = (idx - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') nextIdx = 0;
        else if (e.key === 'End') nextIdx = tabs.length - 1;
        if (nextIdx >= 0) {
          e.preventDefault();
          activateTab(tabs[nextIdx].dataset.cat as SpecCategoryId, true);
        }
      });
    });

    card.querySelectorAll<HTMLButtonElement>('[data-opt]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pickId = btn.dataset.opt!;
        selections = { ...selections, [activeCat]: pickId };
        applySpecToScene(host, selections, floraHolder);
        syncUrl();
        renderCard();
        renderClientBar();
        const opt = getSpecOption(activeCat, pickId);
        host.app.log(`Applied ${opt.label} (${opt.leadWeeks} wk lead).`);
        host.onChange?.(selections);
      });
    });

    card.querySelector('#nzsOpenTable')?.addEventListener('click', openScheduleModal);
    card.querySelector('#nzsShareClient')?.addEventListener('click', () => void openClientShareModal());
    card.querySelector('#nzsToggleHud')?.addEventListener('click', () => { clientBarOn = !clientBarOn; renderCard(); renderClientBar(); });
    card.append(plantBrush.el);
  };

  // Apply initial URL/default selections & render
  setTimeout(() => applySpecToScene(host, selections, floraHolder), 120);
  renderCard();
  renderClientBar();

  return {
    el: card,
    getSelections: () => ({ ...selections }),
    getImpact: () => calculateSpecImpact(selections, { floorAreaM2, baselineFloatWeeks: floatWeeks }),
    setSelections: (next: Partial<SpecSelections>) => {
      selections = completeSpecSelections({ ...selections, ...next });
      applySpecToScene(host, selections, floraHolder);
      syncUrl();
      renderCard();
      renderClientBar();
      host.onChange?.(selections);
    },
  };
}
