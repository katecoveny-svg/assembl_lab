// The trace card on the drop page: a PDF sheet or a picture of a plan in, a plan model out, with every step shown.
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { App } from './app';
import { openPdf, planModel, readImage, readSheet, sheetThumb, surveySheets, toBuilding, type Built, type BuildOpts, type SheetInfo, type TraceRead } from './planTrace';
import { defaultRoles, fallPlane, guessHigh, interpretElevations, readElevSheet, readSiteSheet, registerSite, type ElevRead, type ElevResult, type Role, type SiteRead, type SiteResult } from './planSet';
import { applyNameEdits } from './roomNames';
import type { RoomSpec } from './homes';
import { modelFingerprint } from './approvals';
import { READ_KEY, AUTO_KEY } from './planRunUI';
import type { ReadRecord } from './planRun';

// Who the AI plan reader really is today: the lab's endpoint says which provider answers first.
let readerNameP: Promise<string> | null = null;
function readerName(): Promise<string> {
  readerNameP ??= fetch('/api/plan-read', { headers: { accept: 'application/json' } }).then((r) => (r.ok ? r.json() : null)).then((j) => {
    const first = (j?.providers as { name: string; configured: boolean; model?: string }[] | undefined)?.find((p) => p.configured);
    const names: Record<string, string> = { openai: 'OpenAI', gemini: 'Google (Gemini)', anthropic: 'Anthropic (Claude)' };
    return first ? `${names[first.name] ?? first.name}${first.model ? `, model ${first.model}` : ''}, through the lab` : 'an outside AI model through the lab';
  }).catch(() => 'an outside AI model through the lab');
  return readerNameP;
}


const COL = { ext: '#21121F', part: '#756771', door: '#B4466F', window: '#B4466F', slider: '#B4466F', opening: '#D4B6C7', deck: '#8A7B5C' } as const;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
// where a room's name came from, as the review list shows it
const NAME_CHIP = { printed: 'printed', drawn: 'from what is drawn: check', person: 'named by a person' } as const;
const chipTitle = (r: RoomSpec) => (r.nameSrc === 'drawn' ? `The drawing prints "${r.printed ?? '?'}" here. This name was suggested from what is drawn in the room: check it.` : r.nameSrc === 'person' ? `You named this room. The drawing prints "${r.printed ?? '?'}".` : 'The name printed on the drawing.');

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
      <div id="trSet" class="tr-set" hidden><p class="small"><b>The rest of the set.</b> The AI plan reader can also read a site plan (decks, stairs, paths, planting) and elevations (roof, heights, ground). Change what each sheet is for, or skip it.</p><div id="trSetList"></div></div>
      <div id="trPlans" class="tr-plans"></div>
      <div id="trExtra" class="tr-extra" hidden></div>
      <div id="trOpts" class="tr-opts" hidden>
        <label>Roof <select id="trRoof"><option value="gable">Gable</option><option value="skillion">Skillion</option><option value="flat">Flat</option></select></label>
        <label id="trHighL" hidden>High side <select id="trHigh"><option value="v0">over the north wall</option><option value="v1">over the south wall</option></select></label>
        <label>Ceiling <input id="trPlate" type="number" value="2.4" step="0.05" min="2" max="4.5"> m</label>
        <label>Roof pitch <input id="trPitch" type="number" value="15" step="1" min="2" max="45">°</label>
        <label>Floor above ground <input id="trFloor" type="number" value="0.6" step="0.05" min="0" max="6"> m</label>
        <label id="trDropL" hidden>Ground falls <input id="trDrop" type="number" value="0" step="0.1" min="0" max="12"> m under the high side</label>
      </div>
      <div class="row wrap"><button class="pill solid" id="trBuild" disabled>Build the twin</button></div>
      <p class="small tr-truth">Building it runs the full check straight after: drawings, room names, ground, site facts and the code pre-check, each with what a person must check. Sizes come from the written dimensions where they agree with the drawing. Positions read by AI are ± about 150 mm. Heights, roof, finishes and furniture are assumed or proposed until you change them.</p>`;
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
    let sheets: SheetInfo[] = [];
    let roles = new Map<number, Role>();
    let siteRead: SiteRead | null = null, elevReads: ElevRead[] = [], elev: ElevResult | null = null, site: SiteResult | null = null;
    let roofSrc: 'assumed' | 'ai' = 'assumed';
    // a person's room names, kept across re-reads of the same plan ("read index:room id" → name)
    const nameEdits = new Map<string, string>();
    const editsFor = (i: number, rooms: RoomSpec[]) => Object.fromEntries(rooms.map((r) => [r.id, nameEdits.get(`${i}:${r.id}`) ?? '']));
    const finish = (v: { plan: Record<string, unknown>; name: string } | null) => {
      token++;
      card.remove();
      prev.forEach((c) => (c.hidden = false));
      resolve(v);
    };
    $('trBack').addEventListener('click', () => finish(null));
    const val = (id: string) => ($(id) as HTMLInputElement).value;
    const opts = (): BuildOpts => ({ plate: +val('trPlate') || 2.4, pitch: +val('trPitch') || 15, floor: Math.max(0, +val('trFloor') || 0), roof: val('trRoof') as BuildOpts['roof'], high: val('trHigh') as 'v0' | 'v1', roofSrc });
    const setVal = (id: string, v: string | number) => { ($(id) as HTMLInputElement).value = String(v); };
    const extrasWanted = () => [...roles.entries()].filter(([p, r]) => r !== 'skip' && p !== page);
    const showSet = () => {
      const list = $('trSetList');
      const others = sheets.filter((x) => x.page !== page);
      $('trSet').hidden = !others.length;
      list.innerHTML = others.map((x) => `<label class="tr-setrow"><span>${x.page}: ${esc(x.title.slice(0, 40))}</span><select data-page="${x.page}"><option value="skip">Skip</option><option value="site" ${roles.get(x.page) === 'site' ? 'selected' : ''}>Site plan</option><option value="elevation" ${roles.get(x.page) === 'elevation' ? 'selected' : ''}>Elevations</option></select></label>`).join('');
      list.querySelectorAll('select').forEach((el) => el.addEventListener('change', () => { roles.set(+el.dataset.page!, el.value as Role); }));
    };
    // the site plan and the elevations: one read per sheet, all at the same time (none depends on another)
    const readExtras = async (progress: (m: string) => void) => {
      siteRead = null; elevReads = []; elev = null; site = null;
      const notes: string[] = [];
      const wanted = extrasWanted(), firstSite = wanted.find(([, r]) => r === 'site')?.[0];
      const jobs = wanted.filter(([p, r]) => r === 'elevation' || p === firstSite).map(async ([p, r]) => {
        const info = sheets.find((x) => x.page === p)!;
        try { return r === 'site' ? { p, site: await readSiteSheet(doc!, info, progress) } : { p, elev: await readElevSheet(doc!, info, progress) }; }
        catch (e) { notes.push(`Sheet ${p}: ${(e as Error).message}.`); return { p }; }
      });
      for (const j of await Promise.all(jobs)) {
        if (j.site) siteRead = j.site;
        if (j.elev) elevReads.push(j.elev);
      }
      if (elevReads.length) {
        elev = interpretElevations(elevReads);
        if (elev.roof) { setVal('trRoof', elev.roof); roofSrc = 'ai'; }
        if (elev.pitch) setVal('trPitch', elev.pitch);
        if (elev.plate) setVal('trPlate', elev.plate);
        if (elev.hUp != null) setVal('trFloor', elev.hUp.toFixed(2));
        if (elev.hUp != null && elev.hDown != null) setVal('trDrop', Math.max(0, elev.hDown - elev.hUp).toFixed(1));
      }
      return notes;
    };
    let extraNotes: string[] = [];
    const showExtra = () => {
      const lines = [...(site?.report ?? []), ...(elev?.report ?? []), ...extraNotes];
      const sk = val('trRoof') === 'skillion';
      $('trHighL').hidden = !sk; $('trDropL').hidden = !elev;
      if (sk && elev) lines.push(`High side: ${val('trHigh') === 'v0' ? 'north' : 'south'} wall (${highFromPlan ? 'assumed: over the more glazed side' : 'as you set it'}). The ground is taken to fall away under it.`);
      $('trExtra').hidden = !lines.length;
      $('trExtra').innerHTML = lines.length ? `<p class="small"><b>From the other sheets</b></p><ul class="small">${lines.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : '';
    };
    let highFromPlan = true;
    let readT0 = 0, readSecs: number | null = null;

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
      if (built[0] && highFromPlan && val('trRoof') === 'skillion') setVal('trHigh', guessHigh(built[0]));
      if (built[0] && val('trRoof') === 'skillion' && built[0].building.roof.high !== val('trHigh')) built[0] = toBuilding(reads[0], 'traced-1', opts());
      built.forEach((b, i) => { if (!b) return; const rs = b.building.levels[0].rooms; applyNameEdits(rs, editsFor(i, rs)); b.labels.forEach((t, j) => { if (rs[j]) t.text = rs[j].name; }); });
      site = siteRead && built[0] ? registerSite(siteRead, built[0]) : null;
      if (site?.ok && built[0]) {
        const L = built[0].building.levels[0] as unknown as { decks: unknown[]; stairs?: unknown[] };
        if (site.decks.length) L.decks = site.decks;
        if (site.stairs.length) L.stairs = site.stairs;
      }
      showExtra();
      reads.forEach((ir, i) => {
        const b = built[i];
        const el = document.createElement('div');
        el.className = 'tr-plan';
        el.innerHTML = `<div class="tr-plan-head">${reads.length > 1 ? `<label><input type="checkbox" ${include[i] && b ? 'checked' : ''} ${b ? '' : 'disabled'}> build</label>` : ''}<input class="tr-name" value="${esc(ir.label)}" aria-label="Name"><span class="chip ${ir.src === 'drawing' ? 'ok' : 'warn'}">${ir.src === 'drawing' ? 'measured from linework' : 'read by AI · check'}</span></div>
          <canvas></canvas>
          ${b ? `<p class="tr-size">${b.W.toFixed(2)} × ${b.D.toFixed(2)} m</p>` : ''}
          ${b && b.building.levels[0].rooms.length ? `<div class="tr-rooms"><p class="small"><b>Rooms.</b> Check each name before you build; type to change one.</p><ul>${b.building.levels[0].rooms.map((r) => `<li><input class="tr-rn" data-id="${r.id}" value="${esc(r.name)}" aria-label="Room name (${(r.w).toFixed(1)} × ${(r.d).toFixed(1)} m)"><span class="tr-rsrc ${r.nameSrc ?? 'printed'}" title="${esc(chipTitle(r))}">${NAME_CHIP[r.nameSrc ?? 'printed']}</span><span class="tr-rdim">${r.w.toFixed(2)} × ${r.d.toFixed(2)} m</span></li>`).join('')}</ul></div>` : ''}
          ${!ir.mmPerPx ? `<p class="tr-len">${esc(ir.scaleNote)} The outside length of the long side is <input type="number" step="0.01" min="1" class="tr-lenv"> m <button class="pill tr-leng">Use it</button></p>` : /no dimension strings to check/.test(ir.scaleNote) ? `<p class="tr-len small">Nothing on this sheet confirms the scale. If the size above is wrong, the outside length of the long side is <input type="number" step="0.01" min="1" class="tr-lenv"> m <button class="pill tr-leng">Use it</button></p>` : ''}
          <ul class="small tr-report">${[`Scale: ${ir.scaleNote}`, ...(b ? b.report : ir.mmPerPx ? ['Too few walls were found to make a building from this crop.'] : [])].map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`;
        drawPlan(el.querySelector('canvas')!, ir, b);
        el.querySelectorAll<HTMLInputElement>('.tr-rn').forEach((inp) => inp.addEventListener('input', () => {
          if (!b) return;
          const rs = b.building.levels[0].rooms, j = rs.findIndex((r) => r.id === inp.dataset.id), r = rs[j];
          if (!r) return;
          nameEdits.set(`${i}:${r.id}`, inp.value);
          applyNameEdits([r], { [r.id]: inp.value });
          if (b.labels[j]) b.labels[j].text = r.name;
          const chip = inp.nextElementSibling as HTMLElement;
          chip.className = `tr-rsrc ${r.nameSrc}`; chip.textContent = NAME_CHIP[r.nameSrc ?? 'printed']; chip.title = chipTitle(r);
          drawPlan(el.querySelector('canvas')!, ir, b);
        }));
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
    for (const id of ['trPlate', 'trPitch', 'trFloor', 'trRoof', 'trDrop']) $(id).addEventListener('change', render);
    $('trHigh').addEventListener('change', () => { highFromPlan = false; render(); });

    const run = async (useAi: boolean) => {
      const my = ++token;
      $('trAsk').hidden = true;
      $('trPlans').innerHTML = '';
      $('trOpts').hidden = true;
      ($('trBuild') as HTMLButtonElement).disabled = true;
      // a new read starts clean: a plan measured from another sheet must not stand in for this one (the AI button would
      // otherwise take that old linework read as this sheet's plan and only read the rest of the set)
      reads = []; built = []; include = [];
      const t0 = performance.now();
      readT0 = t0;
      let msg = '';
      const tick = setInterval(() => my === token && status(`${msg} ${Math.round((performance.now() - t0) / 1000)} s`), 1000);
      const progress = (m: string) => { msg = m; if (my === token) status(m); };
      try {
        let got: TraceRead[] | null;
        // with the AI reader asked for, the site plan and elevations go at the same time as the floor plan, not after it:
        // the same reads, one per sheet, in about the time of the slowest one
        const extrasP = useAi && doc && extrasWanted().length ? readExtras(() => {}).catch((e) => [`The other sheets: ${(e as Error).message}.`]) : null;
        if (doc) got = await readSheet(doc, page, (m) => progress(extrasP && /AI plan reader/.test(m) ? m.replace('the AI plan reader', `the AI plan reader, with the other ${extrasWanted().length} sheet${extrasWanted().length > 1 ? 's' : ''}`) : m), useAi);
        else got = useAi ? await readImage(file, progress) : null;
        if (my !== token) return;
        if (!got) {
          status(isPdf ? `Sheet ${page} has no linework to measure: its plan is a picture inside the PDF.` : 'A picture of a plan has no linework to measure.');
          { const n = 1 + extrasWanted().length; $('trAskText').textContent = `The AI plan reader can read it. ${n === 1 ? 'A crop of this sheet goes' : `Crops of ${n} sheets (this one and the ${n - 1} you picked as site plan or elevations) go`} to ${await readerName()} for this read. The lab does not store them. Plan models, IFC and GLB files never leave your browser.`; }
          $('trAsk').hidden = false;
          return;
        }
        reads = got;
        include = got.map(() => true);
        if (extrasP) { progress('Reading the other sheets…'); extraNotes = await extrasP; }
        if (my !== token) return;
        readSecs = Math.round((performance.now() - readT0) / 100) / 10;
        status(got.length > 1 ? `${got.length} plans read from sheet ${page}. Untick any you don’t want, check them, then build.` : elevReads.length || siteRead ? 'Set read. Check it against your drawings, then build.' : 'Plan read. Check it against your drawing, then build.');
        render();
        if (!useAi && doc && extrasWanted().length) {
          { const n = extrasWanted().length; $('trAskText').textContent = `The floor plan was measured from its linework. The AI plan reader can also read the site plan and elevations you picked above: ${n === 1 ? 'a crop of 1 sheet goes' : `crops of ${n} sheets go`} to ${await readerName()} for this read. The lab does not store them.`; }
          ($('trAi') as HTMLButtonElement).textContent = 'Read the rest of the set with the AI plan reader';
          $('trAsk').hidden = false;
        }
      } catch (e) {
        if (my === token) status(`Couldn’t read it: ${(e as Error).message}`);
      } finally {
        clearInterval(tick);
      }
    };
    $('trAi').addEventListener('click', () => {
      if (reads.length && reads[0].src === 'drawing') {
        // the floor plan is already measured: read only the rest of the set
        const my = ++token; $('trAsk').hidden = true;
        void (async () => { const t1 = performance.now(); try { extraNotes = await readExtras((m) => my === token && status(m)); readSecs = Math.round(((readSecs ?? 0) * 1000 + performance.now() - t1) / 100) / 10; if (my === token) { status('Set read. Check it against your drawings, then build.'); render(); } } catch (e) { status(`Couldn’t read it: ${(e as Error).message}`); } })();
      } else void run(true);
    });
    $('trBuild').addEventListener('click', () => {
      const chosen = built.filter((b, i): b is Built => !!b && (reads.length === 1 || include[i]));
      if (!chosen.length) return;
      const title = chosen.length === 1 ? chosen[0].building.name : base;
      const note = `${doc ? `sheet ${page} of ` : ''}${file.name}`;
      const north = reads.find((r) => r.north != null)?.north ?? null;
      const pm = planModel(chosen, title === 'Traced plan' ? base : title, north, note) as Record<string, unknown> & { site?: Record<string, unknown> };
      const o = opts();
      const site2: Record<string, unknown> = {};
      if (elev && elev.hUp != null && +val('trDrop') > 0.05) {
        const downhill = (o.roof === 'skillion' ? o.high : guessHigh(chosen[0])) ?? 'v1';
        site2.fall = fallPlane(chosen[0], o.floor, o.floor + +val('trDrop'), downhill, o.floor);
      }
      if (site?.ok && site.features.length) site2.features = site.features;
      if (Object.keys(site2).length) pm.site = site2;
      const sheetsUsed = [page, ...extrasWanted().map(([p]) => p)].sort((a, b) => a - b);
      // what was read, how and how sure, for the full check that runs once the model is built (this tab only: sheet titles
      // and the reader's words stay out of the plan model and any share link)
      try {
        const r0 = reads[0], from = (v: number, read: number | null | undefined, dflt: number) => (read != null && Math.abs(v - read) < 0.006 ? 'elevations' as const : Math.abs(v - dflt) < 0.006 ? 'assumed' as const : 'set by a person' as const);
        const rec: ReadRecord = {
          v: 1, fingerprint: modelFingerprint(pm), at: new Date().toISOString(), file: { kind: isPdf ? 'pdf' : 'image', pages: doc?.numPages ?? 1 }, seconds: readSecs,
          plan: { page: doc ? page : null, title: sheets.find((x) => x.page === page)?.title ?? '', reader: r0.src === 'drawing' ? 'linework' : 'ai', ...(r0.model ? { model: r0.model } : {}), ...(r0.rev ? { rev: r0.rev } : {}), scale: r0.scaleNote, plans: chosen.length },
          sheets: extrasWanted().map(([p, role]) => {
            const got = role === 'site' ? (siteRead && (siteRead as { page: number }).page === p ? siteRead : null) : elevReads.find((e) => e.page === p) ?? null;
            const why = extraNotes.find((n) => n.startsWith(`Sheet ${p}:`));
            return { page: p, title: sheets.find((x) => x.page === p)?.title ?? '', role: role as 'site' | 'elevation', ...(got ? { model: (got as { model: string }).model } : {}), ok: !!got, ...(got ? {} : { note: why ?? 'the AI plan reader was not asked to read it' }) };
          }),
          skipped: doc ? Math.max(0, sheets.length - 1 - extrasWanted().length) : 0,
          heights: { plate: { value: o.plate, from: from(o.plate, elev?.plate, 2.4) }, floor: { value: o.floor, from: from(o.floor, elev?.hUp, 0.6) }, roof: { type: o.roof ?? 'gable', pitch: o.pitch, from: roofSrc === 'ai' && elev?.roof === o.roof ? 'elevations' : o.roof === 'gable' && Math.abs(o.pitch - 15) < 0.01 ? 'assumed' : 'set by a person' } },
          site: { read: !!site?.ok, kinds: (site?.ok ? site.features : []).map((f) => String((f as { kind: string }).kind)) },
          notes: [...(site?.report ?? []), ...(elev?.report ?? [])].slice(0, 6),
        };
        sessionStorage.setItem(READ_KEY, JSON.stringify(rec));
        sessionStorage.setItem(AUTO_KEY, rec.fingerprint);
      } catch { /* no room: the full check still runs from the panel, without the read details */ }
      finish({ plan: pm, name: `${title} (traced${sheetsUsed.length > 1 ? ` from sheets ${sheetsUsed.join(', ')}` : ''})` });
    });

    void (async () => {
      try {
        if (isPdf) {
          doc = await openPdf(await file.arrayBuffer());
          status(`Looking through ${doc.numPages} sheet${doc.numPages > 1 ? 's' : ''} for the floor plan…`);
          sheets = await surveySheets(doc);
          const best = [...sheets].sort((a, b) => b.score - a.score)[0];
          page = best.page;
          roles = defaultRoles(sheets, page);
          showSet();
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
          sel.addEventListener('change', () => { page = +sel.value; roles.set(page, 'skip'); showSet(); void thumb(); void run(false); });
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
