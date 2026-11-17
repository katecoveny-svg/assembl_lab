// The trace card on the drop page: a PDF sheet or a picture of a plan in, a plan model out, with every step shown.
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { App } from './app';
import { openPdf, planModel, readImage, readSheet, sheetThumb, surveySheets, toBuilding, type Built, type BuildOpts, type TraceRead } from './planTrace';

const COL = { ext: '#21121F', part: '#756771', door: '#B4466F', window: '#B4466F', slider: '#B4466F', opening: '#D4B6C7', deck: '#8A7B5C' } as const;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

function drawPlan(cv: HTMLCanvasElement, ir: TraceRead, b: Built | null) {
  const img = ir.image;
  const s = Math.min(1, 560 / img.width, 420 / img.height);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.round(img.width * s * dpr);
  cv.height = Math.round(img.height * s * dpr);
  cv.style.width = `${Math.round(img.width * s)}px`;
  const ctx = cv.getContext('2d')!;
  ctx.setTransform(dpr * s, 0, 0, dpr * s, 0, 0);
  ctx.globalAlpha = 0.45;
  ctx.drawImage(img, 0, 0);
  ctx.globalAlpha = 1;
  ctx.lineCap = 'round';
  const px = 1 / s;
  if (!b) {
    ctx.strokeStyle = COL.part;
    ctx.lineWidth = 2 * px;
    for (const w of ir.walls) { ctx.beginPath(); ctx.moveTo(...w.a); ctx.lineTo(...w.b); ctx.stroke(); }
    return;
  }
  for (const l of b.overlay) {
    ctx.strokeStyle = COL[l.kind];
    ctx.lineWidth = (l.kind === 'ext' ? 3.2 : l.kind === 'part' ? 2.2 : l.kind === 'deck' ? 1.4 : 4.5) * px;
    ctx.setLineDash(l.kind === 'deck' ? [5 * px, 4 * px] : []);
    ctx.beginPath();
    ctx.moveTo(...l.a);
    ctx.lineTo(...l.b);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.font = `600 ${12 * px}px Inter, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const t of b.labels) {
    ctx.lineWidth = 3.5 * px;
    ctx.strokeStyle = 'rgba(249,246,242,0.95)';
    ctx.strokeText(t.text, ...t.at);
    ctx.fillStyle = '#33212F';
    ctx.fillText(t.text, ...t.at);
  }
}

/** shows the trace card in `host`; resolves with a plan model, or null if the person goes back */
export function traceDrawing(app: App, file: File, host: HTMLElement): Promise<{ plan: Record<string, unknown>; name: string } | null> {
  return new Promise((resolve) => {
    const isPdf = /\.pdf$/i.test(file.name) || file.type === 'application/pdf';
    const base = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
    const card = document.createElement('div');
    card.className = 'card trace-card';
    card.innerHTML = `
      <div class="tr-head"><h2>Reading ${esc(file.name.length > 48 ? file.name.slice(0, 45) + '…' : file.name)}</h2><button class="pill" id="trBack">Back</button></div>
      <p class="small" id="trStatus">Opening the drawing…</p>
      <div class="tr-sheet" id="trSheetRow" hidden><label class="slider">Sheet <select id="trSheet"></select></label><canvas id="trThumb" class="tr-thumb"></canvas></div>
      <div id="trAsk" class="tr-ask" hidden><p id="trAskText"></p><button class="pill solid" id="trAi">Read it with the AI plan reader</button></div>
      <div id="trPlans" class="tr-plans"></div>
      <div id="trOpts" class="tr-opts" hidden>
        <label>Ceiling <input id="trPlate" type="number" value="2.4" step="0.05" min="2" max="4"> m</label>
        <label>Roof pitch <input id="trPitch" type="number" value="15" step="1" min="3" max="45">°</label>
        <label>Floor above ground <input id="trFloor" type="number" value="0.6" step="0.05" min="0" max="3"> m</label>
      </div>
      <div class="row wrap"><button class="pill solid" id="trBuild" disabled>Build the twin</button></div>
      <p class="small tr-truth">Sizes come from the written dimensions where they agree with the drawing. Positions read by AI are ± about 150 mm. Heights, roof, finishes and furniture are assumed or proposed until you change them.</p>`;
    const prev = [...host.children] as HTMLElement[];
    prev.forEach((c) => (c.hidden = true));
    host.append(card);
    const $ = <T extends HTMLElement>(id: string) => card.querySelector('#' + id) as T;
    const status = (t: string) => ($('trStatus').textContent = t);
    let doc: PDFDocumentProxy | null = null;
    let page = 1;
    let reads: TraceRead[] = [];
    let built: (Built | null)[] = [];
    let include: boolean[] = [];
    let token = 0;
    const finish = (v: { plan: Record<string, unknown>; name: string } | null) => {
      token++;
      card.remove();
      prev.forEach((c) => (c.hidden = false));
      resolve(v);
    };
    $('trBack').addEventListener('click', () => finish(null));
    const opts = (): BuildOpts => ({ plate: +($('trPlate') as HTMLInputElement).value || 2.4, pitch: +($('trPitch') as HTMLInputElement).value || 15, floor: Math.max(0, +($('trFloor') as HTMLInputElement).value || 0) });

    const render = () => {
      const box = $('trPlans');
      box.innerHTML = '';
      built = reads.map((ir, i) => {
        if (!ir.mmPerPx) return null;
        try {
          return toBuilding(ir, `traced-${i + 1}`, opts());
        } catch {
          return null;
        }
      });
      reads.forEach((ir, i) => {
        const b = built[i];
        const el = document.createElement('div');
        el.className = 'tr-plan';
        el.innerHTML = `<div class="tr-plan-head">${reads.length > 1 ? `<label><input type="checkbox" ${include[i] && b ? 'checked' : ''} ${b ? '' : 'disabled'}> build</label>` : ''}<input class="tr-name" value="${esc(ir.label)}" aria-label="Name"><span class="chip ${ir.src === 'drawing' ? 'ok' : 'warn'}">${ir.src === 'drawing' ? 'measured from linework' : 'read by AI · check'}</span></div>
          <canvas></canvas>
          ${b ? `<p class="tr-size">${b.W.toFixed(2)} × ${b.D.toFixed(2)} m</p>` : ''}
          ${!ir.mmPerPx ? `<p class="tr-len">${esc(ir.scaleNote)} The outside length of the long side is <input type="number" step="0.01" min="1" class="tr-lenv"> m <button class="pill tr-leng">Use it</button></p>` : /no dimension strings to check/.test(ir.scaleNote) ? `<p class="tr-len small">Nothing on this sheet confirms the scale. If the size above is wrong, the outside length of the long side is <input type="number" step="0.01" min="1" class="tr-lenv"> m <button class="pill tr-leng">Use it</button></p>` : ''}
          <ul class="small tr-report">${[`Scale: ${ir.scaleNote}`, ...(b ? b.report : ir.mmPerPx ? ['Too few walls were found to make a building from this crop.'] : [])].map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`;
        drawPlan(el.querySelector('canvas')!, ir, b);
        el.querySelector<HTMLInputElement>('input[type=checkbox]')?.addEventListener('change', (e) => { include[i] = (e.target as HTMLInputElement).checked; update(); });
        el.querySelector<HTMLInputElement>('.tr-name')!.addEventListener('input', (e) => { ir.label = (e.target as HTMLInputElement).value || ir.label; if (built[i]) built[i]!.building.name = ir.label; });
        el.querySelector('.tr-leng')?.addEventListener('click', () => {
          const len = +el.querySelector<HTMLInputElement>('.tr-lenv')!.value;
          if (!(len > 0.5)) return;
          const ws = ir.walls.filter((w) => w.ext).length >= 3 ? ir.walls.filter((w) => w.ext) : ir.walls;
          const xs = ws.flatMap((w) => [w.a[0], w.b[0]]), ys = ws.flatMap((w) => [w.a[1], w.b[1]]);
          ir.mmPerPx = (len * 1000) / Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), 1);
          ir.scaleNote = `From the ${len} m length you gave.`;
          render();
        });
        box.append(el);
      });
      $('trOpts').hidden = !built.some(Boolean);
      update();
    };
    const update = () => {
      const n = built.filter((b, i) => b && (reads.length === 1 || include[i])).length;
      ($('trBuild') as HTMLButtonElement).disabled = !n;
      $('trBuild').textContent = n > 1 ? `Build the twin (${n} homes)` : 'Build the twin';
    };
    for (const id of ['trPlate', 'trPitch', 'trFloor']) $(id).addEventListener('change', render);

    const run = async (useAi: boolean) => {
      const my = ++token;
      $('trAsk').hidden = true;
      $('trPlans').innerHTML = '';
      $('trOpts').hidden = true;
      ($('trBuild') as HTMLButtonElement).disabled = true;
      const t0 = performance.now();
      let msg = '';
      const tick = setInterval(() => my === token && status(`${msg} ${Math.round((performance.now() - t0) / 1000)} s`), 1000);
      const progress = (m: string) => { msg = m; if (my === token) status(m); };
      try {
        let got: TraceRead[] | null;
        if (doc) got = await readSheet(doc, page, progress, useAi);
        else got = useAi ? await readImage(file, progress) : null;
        if (my !== token) return;
        if (!got) {
          status(isPdf ? `Sheet ${page} has no linework to measure: its plan is a picture inside the PDF.` : 'A picture of a plan has no linework to measure.');
          $('trAskText').textContent = 'The AI plan reader can read it: a crop of each plan on the sheet goes to the lab’s reader (Claude, by Anthropic) for this read and is not stored. Plan models, IFC and GLB files never leave your browser.';
          $('trAsk').hidden = false;
          return;
        }
        reads = got;
        include = got.map(() => true);
        status(got.length > 1 ? `${got.length} plans read from sheet ${page}. Untick any you don’t want, check them, then build.` : 'Plan read. Check it against your drawing, then build.');
        render();
      } catch (e) {
        if (my === token) status(`Couldn’t read it: ${(e as Error).message}`);
      } finally {
        clearInterval(tick);
      }
    };
    $('trAi').addEventListener('click', () => void run(true));
    $('trBuild').addEventListener('click', () => {
      const chosen = built.filter((b, i): b is Built => !!b && (reads.length === 1 || include[i]));
      if (!chosen.length) return;
      const title = chosen.length === 1 ? chosen[0].building.name : base;
      const note = `${doc ? `sheet ${page} of ` : ''}${file.name}`;
      const north = reads.find((r) => r.north != null)?.north ?? null;
      finish({ plan: planModel(chosen, title === 'Traced plan' ? base : title, north, note), name: `${title} (traced)` });
    });

    void (async () => {
      try {
        if (isPdf) {
          doc = await openPdf(await file.arrayBuffer());
          status(`Looking through ${doc.numPages} sheet${doc.numPages > 1 ? 's' : ''} for the floor plan…`);
          const sheets = await surveySheets(doc);
          const best = [...sheets].sort((a, b) => b.score - a.score)[0];
          page = best.page;
          const sel = $('trSheet') as HTMLSelectElement;
          sel.innerHTML = sheets.map((s) => `<option value="${s.page}" ${s.page === page ? 'selected' : ''}>${s.page}: ${esc(s.title.slice(0, 46))}${s.page === best.page ? ' (floor plan?)' : ''}</option>`).join('');
          $('trSheetRow').hidden = doc.numPages < 2;
          const thumb = async () => {
            const c = await sheetThumb(await doc!.getPage(page), 360);
            const t = $('trThumb') as HTMLCanvasElement;
            t.width = c.width;
            t.height = c.height;
            t.getContext('2d')!.drawImage(c, 0, 0);
          };
          sel.addEventListener('change', () => { page = +sel.value; void thumb(); void run(false); });
          void thumb();
        }
        await run(false);
      } catch (e) {
        status(`Couldn’t open it: ${(e as Error).message}`);
      }
    })();
    app.log(`Reading ${file.name}…`);
  });
}
