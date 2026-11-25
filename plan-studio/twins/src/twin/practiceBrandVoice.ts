// Unified NZ Architectural Specialist Agents, Working Drawings Viewer (A101–A401), Cultural Narrative Editor,
// Practice White-Label Branding & Fluent Te Reo Māori Voice Narration Studio (ElevenLabs v4 Tāne & Wikitoria).
// Mounts onto /plan-studio/twins/drop/ for ALL input kinds (2D Plan, Multi-Sheet PDF, IFC, GLB).

import * as THREE from 'three/webgpu';
import type { App } from './app';
import {
  buildBilingualNarrationScript,
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
  type DrawingBuildingInput,
  type DrawingRoom,
} from './workingDrawings';
import { getSpecOption, type SpecImpactSummary, type SpecSelections } from './nzSpecifier';
import { BRAND_KEY, LOOK_CACHE, readBrand } from './practiceLook';

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

const CSS = `
#nzStudioSuite { display: contents; }
.nzb-agent-list { list-style: none; margin: 8px 0; padding: 0; display: grid; gap: 5px; }
.nzb-agent-row {
  display: flex; justify-content: space-between; align-items: center; gap: 8px;
  padding: 6px 8px; border-radius: 8px; background: rgba(246, 241, 237, 0.7);
  border: 1px solid rgba(101, 74, 78, 0.18); font-size: 12.5px;
}
.nzb-badge { font: 500 10.5px 'IBM Plex Mono', monospace; padding: 2px 7px; border-radius: 999px; background: #e6efe6; color: #24452a; }
.nzb-badge.review { background: #f8ecd9; color: #8a4b14; }
.nzb-motifs { display: flex; flex-wrap: wrap; gap: 5px; margin: 6px 0; }
.nzb-motif { font: 500 11px 'IBM Plex Mono', monospace; background: var(--plum, #240B21); color: var(--ivory, #F9F6F2); padding: 3px 8px; border-radius: 999px; }
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

function splitForTts(script: string, maxLen = 620): string[] {
  const sentences = script.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((s) => s.trim()).filter(Boolean) ?? [script];
  const chunks: string[] = [];
  let cur = '';
  for (const s of sentences) {
    if ((cur + ' ' + s).trim().length <= maxLen) cur = (cur + ' ' + s).trim();
    else {
      if (cur) chunks.push(cur);
      cur = s.slice(0, maxLen);
    }
  }
  if (cur) chunks.push(cur);
  return chunks.length ? chunks : [script.slice(0, maxLen)];
}

export function mountPracticeBrandAndAgents(host: BrandVoiceHostOpts) {
  if (!document.getElementById('nzbSuiteStyle')) {
    const st = document.createElement('style');
    st.id = 'nzbSuiteStyle';
    st.textContent = CSS;
    document.head.append(st);
  }

  let narrative: CulturalNarrative = loadNarrative() ?? defaultNarrativeForModel(host.inputName);
  let activeVoice: 'tane' | 'wikitoria' = 'tane';
  let lastMp3Blob: Blob | null = null;
  let speaking = false;
  let currentAudio: HTMLAudioElement | null = null;

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

  // Measure glazing ratio & building dims directly from the 3D scene for Working Drawings & NZBC pre-check
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
    return {
      projectTitle: narrative.projectTitle || host.inputName,
      practiceName: b.name || narrative.practiceName,
      practiceLogo: b.logo,
      stageStatus: narrative.stageStatus,
      drawingSource: host.inputKind === 'plan' ? `Traced / Plan Twin (${host.inputName})` : `Measured ${host.inputKind.toUpperCase()} 3D Geometry (${host.inputName})`,
      widthM: Math.max(5, sz.x || 18),
      depthM: Math.max(5, sz.z || 12),
      wallHeightM: Math.max(2.4, Math.min((sz.y || 4.2) * 0.62, 6.2)),
      ridgeHeightM: Math.max(3.0, sz.y || 5.4),
      glazingRatio: wwr,
      linzNote: linzChip,
      rooms: host.rooms,
      specSummary: host.getSpecImpact(),
      narrative,
    };
  };

  // Modal A3 Working Drawings Set Viewer (A101–A401)
  const openDrawingsModal = (initialSheet: 'A101' | 'A201' | 'A301' | 'A401' = 'A101') => {
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
              <div class="mono small" style="color:#654A4E">WORKING PLANS &amp; DRAWINGS AGENT · LIVE SYNCED WITH 3D TWIN &amp; NZ SPECIFIER</div>
              <h1 id="nzbDrawTitle" style="margin:2px 0 0;font-size:19px;font-weight:500">${esc(dInput.projectTitle)} — A3 Architectural Working Set</h1>
            </div>
            <form method="dialog"><button class="pill" value="close" autofocus>Close</button></form>
          </div>
          <div class="nzb-sheet-tabs" role="tablist" aria-label="Working drawing sheets">
            ${sheets.map((sh) => `<button type="button" role="tab" class="nzb-sheet-tab" data-sh="${sh.id}" aria-selected="${sh.id === cur}"><span class="mono">${sh.id}</span> · ${esc(sh.title)}</button>`).join('')}
          </div>
          <div class="nzb-svg-stage" role="tabpanel" aria-label="${s.id} ${esc(s.title)}">${s.svg}</div>
          <div class="row wrap" style="justify-content:space-between;align-items:center">
            <span class="small" style="color:#654A4E">Advisory drawings generated from the 3D model &amp; live NZ specification. Verify all dimensions &amp; SED engineering before consent issue.</span>
            <div class="row wrap">
              <button type="button" class="pill" id="nzbDlSvg">Download ${s.id} SVG</button>
              <button type="button" class="pill" id="nzbDlDxf">Export CAD (DXF)</button>
              <button type="button" class="pill solid" id="nzbPrintSet">Open Printable A3 PDF Set (All 4 Sheets)</button>
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

  // Auto-populate PDF-extracted reference render into Look Check if available
  try {
    const pdfRef = sessionStorage.getItem('assembl.nz.pdf-ref-render');
    if (pdfRef) (window as unknown as { __pdfReferenceRender?: string }).__pdfReferenceRender = pdfRef;
  } catch { /* ignore */ }

  // Build default bilingual script
  const makeScript = () => {
    const sel = host.getSelections();
    const b = readPractice();
    return buildBilingualNarrationScript({
      narrative,
      practiceName: b.name || narrative.practiceName,
      claddingLabel: getSpecOption('cladding', sel.cladding).label,
      joineryLabel: getSpecOption('joinery', sel.joinery).label,
      landscapingLabel: getSpecOption('landscaping', sel.landscaping).label,
    });
  };

  // Synthesize fluent Te Reo Māori + NZ English MP3 via /api/archipro-voice (ElevenLabs v4)
  const synthesizeVoiceMp3 = async (text: string, onStatus: (s: string) => void): Promise<Blob | null> => {
    const chunks = splitForTts(text, 620);
    const parts: BlobPart[] = [];
    for (let i = 0; i < chunks.length; i++) {
      onStatus(`Synthesising fluent te reo Māori & NZ voice (${i + 1}/${chunks.length})…`);
      const r = await fetch('/api/archipro-voice', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          text: chunks[i],
          voice: activeVoice === 'wikitoria' ? 'wikitoria' : undefined,
          model: 'eleven_v4',
          previous_text: i > 0 ? chunks[i - 1] : undefined,
          next_text: i < chunks.length - 1 ? chunks[i + 1] : undefined,
        }),
      });
      if (!r.ok || !(r.headers.get('content-type') ?? '').includes('audio')) return null;
      parts.push(await r.arrayBuffer());
    }
    const mp3 = new Blob(parts, { type: 'audio/mpeg' });
    lastMp3Blob = mp3;
    return mp3;
  };

  // Container holding the two new studio cards:
  //   Card A: 5 Specialist Agents, Working Drawings (A101–A401) & Cultural Narrative
  //   Card B: Practice Branding & Fluent Te Reo Māori Voice Narration
  const wrap = document.createElement('div');
  wrap.id = 'nzStudioSuite';

  const agentsCard = document.createElement('section');
  agentsCard.className = 'card';
  agentsCard.id = 'nzWorkingAgentsCard';

  const brandCard = document.createElement('section');
  brandCard.className = 'card';
  brandCard.id = 'nzBrandVoiceCard';

  const renderAgentsCard = () => {
    const dInput = makeDrawingInput();
    const checks = buildUniversalNzbcPrecheck(dInput);
    const meetsN = checks.filter((c) => c.status === 'meets').length;
    const revN = checks.length - meetsN;

    agentsCard.innerHTML = `
      <h3>Specialist Agents &amp; Working Set</h3>
      <p class="small">Auto-running across geometry, LINZ ground, NZ Building Code, cultural narrative &amp; live specifications.</p>
      <ul class="nzb-agent-list">
        <li class="nzb-agent-row"><span><b>1. Intake &amp; Cultural Story</b><br><span class="small">${esc(dInput.drawingSource.slice(0, 42))}</span></span><span class="nzb-badge">■ Active</span></li>
        <li class="nzb-agent-row"><span><b>2. LINZ, Aerial &amp; NZBC Pre-Check</b><br><span class="small">${meetsN} meet guide · ${revN} SED/review items</span></span><span class="nzb-badge ${revN ? 'review' : ''}">${revN ? `◧ ${revN} review` : '■ Checked'}</span></li>
        <li class="nzb-agent-row"><span><b>3. Interior &amp; NZ Specifier</b><br><span class="small">${dInput.specSummary.floorAreaM2} m² · ${dInput.specSummary.rows.length} live schedules</span></span><span class="nzb-badge">■ Live 3D</span></li>
        <li class="nzb-agent-row"><span><b>4. Working Plans &amp; Drawings</b><br><span class="small">Sheets A101 Plan · A201 Elev · A301 Sec · A401 Spec</span></span><span class="nzb-badge">■ 4 A3 Sheets</span></li>
        <li class="nzb-agent-row"><span><b>5. Photoreal &amp; Fly-Through Gate</b><br><span class="small">4K Nano Banana Pro + 1080p Gemini Omni edge-locked</span></span><span class="nzb-badge">■ Ready</span></li>
      </ul>
      <div class="row wrap">
        <button type="button" class="pill solid" id="nzbOpenA101">Open Working Drawings (A101–A401)</button>
        <button type="button" class="pill" id="nzbOpenNzbc">NZBC Pre-Check (A301)</button>
      </div>

      <details style="margin-top:10px">
        <summary class="small"><b>Cultural Narrative &amp; Mana Whenua Motifs</b> (${esc(narrative.motifs.map((m) => m.term).join(' · '))})</summary>
        <div class="nzb-motifs">${narrative.motifs.map((m) => `<span class="nzb-motif" title="${esc(m.meaning)}">${esc(m.term)}${m.sourcePage ? ` · p.${m.sourcePage}` : ''}</span>`).join('')}</div>
        <label class="nzb-field">Project / Whare Title <input type="text" id="nzbProjTitle" value="${esc(narrative.projectTitle)}"></label>
        <label class="nzb-field">Rohe / Place &amp; Waterways <input type="text" id="nzbRohe" value="${esc(narrative.roheOrPlace)}"></label>
        <label class="nzb-field">Cultural &amp; Architectural Narrative <textarea id="nzbNarText" rows="3">${esc(narrative.summary)}</textarea></label>
        <p class="small" style="color:#654A4E;margin:4px 0">${esc(narrative.governanceNote)}</p>
        <button type="button" class="pill" id="nzbSaveNar">Save Narrative &amp; Sync Drawings/Voice</button>
      </details>`;

    agentsCard.querySelector('#nzbOpenA101')?.addEventListener('click', () => openDrawingsModal('A101'));
    agentsCard.querySelector('#nzbOpenNzbc')?.addEventListener('click', () => openDrawingsModal('A301'));
    agentsCard.querySelector('#nzbSaveNar')?.addEventListener('click', () => {
      narrative = {
        ...narrative,
        projectTitle: (agentsCard.querySelector('#nzbProjTitle') as HTMLInputElement).value.trim() || narrative.projectTitle,
        roheOrPlace: (agentsCard.querySelector('#nzbRohe') as HTMLInputElement).value.trim() || narrative.roheOrPlace,
        summary: (agentsCard.querySelector('#nzbNarText') as HTMLTextAreaElement).value.trim() || narrative.summary,
        source: 'architect-entered',
      };
      saveNarrative(narrative);
      const tEl = document.getElementById('title');
      if (tEl) tEl.textContent = narrative.projectTitle;
      const scriptBox = brandCard.querySelector('#nzbVoiceScript') as HTMLTextAreaElement | null;
      if (scriptBox) scriptBox.value = makeScript();
      renderAgentsCard();
      host.app.log('Cultural narrative updated across Working Drawings (A401) and Te Reo Narration.');
    });
  };

  const renderBrandCard = () => {
    const b = readPractice();
    const curLook = (() => { try { return localStorage.getItem(LOOK_CACHE) || 'assembl'; } catch { return 'assembl'; } })();
    brandCard.innerHTML = `
      <h3>Practice Branding &amp; Te Reo Voice</h3>
      <p class="small">White-label the 3D studio, client walkthrough link, A3 working drawings &amp; photoreal fly-throughs, and narrate in fluent te reo Māori &amp; NZ English.</p>
      <label class="nzb-field">Practice / Studio Name <input type="text" id="nzbPracName" placeholder="e.g. Kōwhai Architecture Ltd" value="${esc(b.name || narrative.practiceName)}"></label>
      <div class="row wrap small" style="align-items:center;margin:6px 0">
        <label class="pill" tabindex="0">Upload Practice Logo<input type="file" id="nzbLogoIn" accept="image/png,image/svg+xml,image/webp,image/jpeg" hidden></label>
        <select id="nzbThemeSel" aria-label="Studio theme" style="padding:5px 10px;border-radius:999px">
          <option value="assembl"${curLook === 'assembl' ? ' selected' : ''}>Theme: Assembl Warm Ivory</option>
          <option value="sketch"${curLook === 'sketch' ? ' selected' : ''}>Theme: Practice Dark Sketch</option>
        </select>
        <button type="button" class="pill solid" id="nzbSaveBrand">Apply Brand</button>
      </div>

      <h4 style="margin:12px 0 4px;font-size:13px">Fluent Te Reo Māori &amp; NZ English Narration</h4>
      <div class="row wrap small" style="margin-bottom:6px">
        <select id="nzbVoiceSel" aria-label="New Zealand narrator voice" style="flex:1;padding:5px 10px;border-radius:999px">
          <option value="tane"${activeVoice === 'tane' ? ' selected' : ''}>Tāne — NZ Male · Fluent Te Reo Māori (Eleven v4)</option>
          <option value="wikitoria"${activeVoice === 'wikitoria' ? ' selected' : ''}>Wikitoria — NZ Wāhine · Fluent Te Reo Māori (Eleven v4)</option>
        </select>
        <button type="button" class="pill" id="nzbRegenScript">Draft Script</button>
      </div>
      <label class="nzb-field"><span class="small">Narration Script (macrons supported: ā ē ī ō ū)</span>
        <textarea id="nzbVoiceScript" rows="4">${esc(makeScript())}</textarea>
      </label>
      <div class="row wrap">
        <button type="button" class="pill solid" id="nzbPlayTour">${speaking ? '■ Stop Tour' : '▶ Narrated 3D Fly-Through'}</button>
        <button type="button" class="pill" id="nzbDlMp3">Download MP3</button>
        <button type="button" class="pill" id="nzbRecordNarrated">Record Narrated Video</button>
      </div>
      <p class="small mono" id="nzbVoiceStatus" role="status" aria-live="polite"></p>`;

    const setStatus = (msg: string) => {
      const s = brandCard.querySelector('#nzbVoiceStatus');
      if (s) s.textContent = msg;
    };

    let pendingLogo = b.logo;
    brandCard.querySelector('#nzbLogoIn')?.addEventListener('change', (e) => {
      const f = (e.target as HTMLInputElement).files?.[0];
      if (!f) return;
      if (f.size > 350_000) { setStatus('Choose a logo under 350 KB so it travels cleanly into title cards & schedules.'); return; }
      const r = new FileReader();
      r.onload = () => { pendingLogo = String(r.result ?? ''); setStatus(`Logo ${f.name} ready — click Apply Brand.`); };
      r.readAsDataURL(f);
    });

    brandCard.querySelector('#nzbSaveBrand')?.addEventListener('click', () => {
      const name = (brandCard.querySelector('#nzbPracName') as HTMLInputElement).value.trim().slice(0, 60);
      const theme = (brandCard.querySelector('#nzbThemeSel') as HTMLSelectElement).value;
      try {
        const prev = JSON.parse(localStorage.getItem(BRAND_KEY) ?? 'null') as Record<string, unknown> | null;
        localStorage.setItem(BRAND_KEY, JSON.stringify({ ...(prev ?? {}), name, logo: pendingLogo, at: Date.now() }));
        localStorage.setItem(LOOK_CACHE, theme);
      } catch { /* ignore */ }
      if (theme === 'sketch') document.documentElement.dataset.look = 'sketch';
      else delete document.documentElement.dataset.look;
      applyHeaderBrand();
      setStatus(`Applied brand: ${name || 'assembl.'} (${theme} theme). Title cards, schedules & drawings updated.`);
    });

    brandCard.querySelector('#nzbVoiceSel')?.addEventListener('change', (e) => {
      activeVoice = (e.target as HTMLSelectElement).value as 'tane' | 'wikitoria';
      lastMp3Blob = null;
    });

    brandCard.querySelector('#nzbRegenScript')?.addEventListener('click', () => {
      (brandCard.querySelector('#nzbVoiceScript') as HTMLTextAreaElement).value = makeScript();
      lastMp3Blob = null;
      setStatus('Script refreshed from Cultural Narrative & active NZ specifications.');
    });

    const stopSpeech = () => {
      speaking = false;
      if (currentAudio) { try { currentAudio.pause(); currentAudio.src = ''; } catch { /* ignore */ } currentAudio = null; }
      try { speechSynthesis?.cancel(); } catch { /* ignore */ }
      const btn = brandCard.querySelector('#nzbPlayTour');
      if (btn) btn.textContent = '▶ Narrated 3D Fly-Through';
    };

    const flyThroughKeysDuring = (durationSec: number) => {
      if (host.keys.length < 2) return;
      const start = performance.now();
      const totalMs = Math.max(6000, durationSec * 1000);
      const step = () => {
        if (!speaking) return;
        const u = Math.min(1, (performance.now() - start) / totalMs);
        const segF = u * (host.keys.length - 1);
        const idx = Math.min(host.keys.length - 2, Math.floor(segF));
        const t = segF - idx;
        const sm = t * t * (3 - 2 * t);
        const a = host.keys[idx], b2 = host.keys[idx + 1];
        host.app.camera.position.lerpVectors(a.eye, b2.eye, sm);
        host.app.controls.target.lerpVectors(a.look, b2.look, sm);
        host.app.controls.update();
        if (u < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    brandCard.querySelector('#nzbPlayTour')?.addEventListener('click', async () => {
      if (speaking) { stopSpeech(); setStatus('Stopped.'); return; }
      const text = (brandCard.querySelector('#nzbVoiceScript') as HTMLTextAreaElement).value.trim();
      if (!text) return;
      speaking = true;
      (brandCard.querySelector('#nzbPlayTour') as HTMLButtonElement).textContent = '■ Stop Tour';
      try {
        const mp3 = await synthesizeVoiceMp3(text, setStatus);
        if (!speaking) return;
        if (mp3) {
          const url = URL.createObjectURL(mp3);
          const audio = new Audio(url);
          currentAudio = audio;
          audio.onloadedmetadata = () => {
            setStatus(`Playing ${activeVoice === 'wikitoria' ? 'Wikitoria' : 'Tāne'} (ElevenLabs v4 · ${Math.round(audio.duration || 18)} s)…`);
            flyThroughKeysDuring(audio.duration || 18);
          };
          await new Promise<void>((res) => {
            audio.onended = () => { URL.revokeObjectURL(url); res(); };
            audio.onerror = () => { URL.revokeObjectURL(url); res(); };
            audio.play().catch(() => res());
          });
        } else if (typeof speechSynthesis !== 'undefined') {
          setStatus('Cloud voice unavailable here — playing local NZ English / Māori browser voice…');
          flyThroughKeysDuring(Math.max(10, text.length / 13));
          await new Promise<void>((res) => {
            const u = new SpeechSynthesisUtterance(text);
            u.lang = 'en-NZ';
            u.rate = 0.96;
            u.onend = () => res();
            u.onerror = () => res();
            speechSynthesis.speak(u);
          });
        }
        if (speaking) setStatus('Narrated walkthrough finished.');
      } finally {
        stopSpeech();
      }
    });

    brandCard.querySelector('#nzbDlMp3')?.addEventListener('click', async () => {
      const text = (brandCard.querySelector('#nzbVoiceScript') as HTMLTextAreaElement).value.trim();
      if (!text) return;
      const mp3 = lastMp3Blob ?? (await synthesizeVoiceMp3(text, setStatus));
      if (!mp3) { setStatus('ElevenLabs voice requires live lab connection (/api/archipro-voice).'); return; }
      const slug = (narrative.projectTitle || 'project').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      void host.app.save?.(`${slug}-${activeVoice}-tereo-narration.mp3`, mp3);
      setStatus(`Downloaded ${activeVoice} narration MP3.`);
    });

    brandCard.querySelector('#nzbRecordNarrated')?.addEventListener('click', async () => {
      const text = (brandCard.querySelector('#nzbVoiceScript') as HTMLTextAreaElement).value.trim();
      if (!text) return;
      const mp3 = lastMp3Blob ?? (await synthesizeVoiceMp3(text, setStatus));
      if (!mp3) { setStatus('Connect to live lab (/api/archipro-voice) to mux synthesized voice into video, or use Fly-Through Render Film.'); return; }
      try {
        setStatus('Recording live 3D walkthrough muxed with Te Reo narration…');
        const actx = new AudioContext();
        const decoded = await actx.decodeAudioData(await mp3.arrayBuffer());
        const dest = actx.createMediaStreamDestination();
        const src = actx.createBufferSource();
        src.buffer = decoded;
        src.connect(dest);
        src.connect(actx.destination);

        const canvasStream = host.app.canvas.captureStream(30);
        const combined = new MediaStream([...canvasStream.getVideoTracks(), ...dest.stream.getAudioTracks()]);
        const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus') ? 'video/webm;codecs=vp9,opus' : 'video/webm';
        const rec = new MediaRecorder(combined, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
        const chunks: BlobPart[] = [];
        rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };

        speaking = true;
        rec.start();
        src.start();
        flyThroughKeysDuring(decoded.duration);

        await new Promise<void>((res) => { src.onended = () => res(); });
        rec.stop();
        speaking = false;
        await new Promise<void>((res) => { rec.onstop = () => res(); });
        await actx.close();

        const videoBlob = new Blob(chunks, { type: 'video/webm' });
        host.app.lastVideo = videoBlob;
        const slug = (narrative.projectTitle || 'project').toLowerCase().replace(/[^a-z0-9]+/g, '-');
        void host.app.save?.(`${slug}-narrated-flythrough.webm`, videoBlob);
        setStatus(`Narrated 3D fly-through saved (${Math.round(decoded.duration)} s, ${(videoBlob.size / 1e6).toFixed(1)} MB).`);
      } catch (err) {
        speaking = false;
        setStatus(`Recording error: ${(err as Error).message}`);
      }
    });
  };

  renderAgentsCard();
  renderBrandCard();
  wrap.append(agentsCard, brandCard);

  return {
    el: wrap,
    refresh: () => { renderAgentsCard(); },
    openDrawingsModal,
  };
}
