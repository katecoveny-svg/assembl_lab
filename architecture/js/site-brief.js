// Site brief: an add-on for the ops page (see modules.js), in each project's Site tab, between Intake and Site and sources.
// The site agent (roster: "site context") brings everything known about the project's site into one cited brief
// (assembl.site-brief.v1, the rules are in agents/site-brief-rules.js), keeps it with the project (project.site_brief), and the
// walkthrough in Site and sources hands it to the 3D page as site.brief.
//
// The steps, run by the conductor (conductor.js), each with its status:
//   gather   what the project already has: the site point and facts snapshot, intake's sheets, the model, the camera path, the shots
//   linz     the parcel outline, building outlines and which 1 m LiDAR survey covers the point (this browser, straight to LINZ)
//   live     weather now at the point and today's forecast (/api/live), the sun (computed), nearby Auckland Transport stops
//   words    the site plan sheets' own printed words (pdf.js, free): existing buildings, future stages, parking, levels
//   read     optional and paid: a model reads each site plan picture (/api/plan-read, mode sitebrief). Only when a person says go,
//            at most PAID_CAP reads per brief, never twice for the same sheet
//   brief    the brief built and checked, kept with the project
//   approve  a person approves it. Not a planning, hazard or Building Code sign-off
// The site point goes only to LINZ, the lab's own /api/live and Auckland Transport's baked file on this site; drawings only to the
// one paid read a person approved.
import { registerProjectPanel } from './modules.js';
import { createJob, runJob, approve, retry, STATUS } from './conductor.js';
import { SAMPLE_ID } from './model.js';
import { isSource, bySlot } from './site-sources-rules.js';
import {
  buildBrief, briefProblem, approveBrief, siteSheets, sheetWords, readProblem, metresPerPixel, modelFacts, outlinesQuery, parseOutlines,
  nearStops, inAuckland, GROUPS, LABELS, PAID_CAP, sunAt, nzClock, toEN,
} from './agents/site-brief-rules.js';

export const BRIEF_KEY = 'assembl.site-brief';   // + ':latest' in this browser, for a 3D page opened without a hand-over
const SAMPLE_PLAN = '/plan-studio/twins/drop/hero.plan.json';
const LINZ_DIR = new URL('../../plan-studio/twins/src/twin/linz/', import.meta.url).href;
const AKL_DATA = new URL('../../auckland/live/data/', import.meta.url).href;
const AT_LIVE = 'https://wurwcrgxjjwqdaxqceey.supabase.co/functions/v1/at-live';
const isSample = (p) => !!p && (p.sample === true || p.id === SAMPLE_ID);
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const MARK = { [STATUS.waiting]: '□', [STATUS.running]: '▶', [STATUS.person]: '!', [STATUS.done]: '■', [STATUS.failed]: '×' };
const TAG = { read: 'read', measured: 'measured', live: 'live', assumed: 'assumed', proposed: 'proposed' };

export const STEPS = [
  { id: 'gather', label: 'What the project has' },
  { id: 'linz', label: 'LINZ' },
  { id: 'live', label: 'Live' },
  { id: 'words', label: 'Site plan words' },
  { id: 'read', label: 'Site plan pictures (paid, optional)', paid: true },
  { id: 'brief', label: 'Build the brief' },
  { id: 'approve', label: 'A person approves', person: true },
];

function ensureCss() {
  if (document.querySelector('link[data-site-brief-css]')) return;
  const l = document.createElement('link');
  l.rel = 'stylesheet'; l.href = new URL('../site-brief.css?v=1', import.meta.url).href; l.dataset.siteBriefCss = '';
  document.head.append(l);
}

const S = { runs: new Map(), say: new Map() };   // project id -> { job, busy, g }, last message

// ---- small fetch helpers: a failure is a reason, never a value ---------------------------------------------------------------------
async function getJSON(url, ms = 15000) {
  const c = new AbortController(), t = setTimeout(() => c.abort(), ms);
  try { const r = await fetch(url, { signal: c.signal, headers: { accept: 'application/json' } }); if (!r.ok) throw new Error(`HTTP ${r.status}`); return await r.json(); }
  catch (e) { throw new Error(e?.name === 'AbortError' ? `no answer within ${Math.round(ms / 1000)} s` : String(e?.message ?? e).slice(0, 120)); }
  finally { clearTimeout(t); }
}
const settle = async (fn) => { try { return await fn(); } catch (e) { return { error: String(e?.message ?? e).slice(0, 160) }; } };

async function blobOf(ctx, id, type = '') {
  const here = ctx.store.current ?? ctx.store;
  if (typeof here.fileBlob === 'function') { const f = await here.fileBlob(id); if (!f?.blob) throw new Error('The file is not in the shared records any more.'); return f.blob; }
  const f = await ctx.store.getFile(id);
  if (!f?.data) throw new Error('The file is not in this browser any more.');
  return new Blob([f.data], { type });
}
const imgWidth = (dataUrl) => new Promise((res) => { const i = new Image(); i.onload = () => res(i.naturalWidth); i.onerror = () => res(0); i.src = dataUrl; });

/** the record kept with the project: { v, brief, reads: { sheetId: { read, provider, model, at, mPerPx, prompts } }, calls, job } */
export function normalRecord(v) {
  const o = v && typeof v === 'object' && v.v === 1 ? v : {};
  return { v: 1, brief: o.brief && !briefProblem(o.brief) ? o.brief : null, reads: o.reads && typeof o.reads === 'object' ? o.reads : {}, calls: Number.isInteger(o.calls) ? o.calls : 0, job: o.job ?? null };
}
async function withRecord(ctx, pid, change, action, detail) {
  const pr = await ctx.store.get('project', pid); if (!pr) return null;
  pr.site_brief = normalRecord(await change(normalRecord(pr.site_brief))); pr.updated_at = new Date().toISOString();
  await ctx.store.save('project', pr);
  if (action) try { await ctx.store.save('activity', { id: `v_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, project_id: pid, at: pr.updated_at, who: ctx.me?.name || 'Not named', action, detail }); } catch { /* kept either way */ }
  return pr.site_brief;
}

// ---- the run ----------------------------------------------------------------------------------------------------------------------
async function run(ctx, p, { paid = false } = {}) {
  const live = S.runs.get(p.id) ?? { job: createJob({ id: `site_${Date.now().toString(36)}`, kind: 'site-brief', project_id: p.id, steps: STEPS }), busy: false, g: {} };
  S.runs.set(p.id, live);
  if (live.busy) return;
  live.busy = true;
  const g = live.g;
  const handlers = {
    gather: async ({ log }) => {
      const pr = (await ctx.store.get('project', p.id)) ?? p;
      g.project = pr; g.intake = pr.intake ?? null;
      const files = await ctx.store.listFiles({ project_id: p.id }), mine = files.filter(isSource), slots = bySlot(mine);
      g.files = files; g.hasSurvey = !!slots.find((s) => s.slot.id === 'survey')?.stacks.length;
      const fl = slots.find((s) => s.slot.id === 'flythrough')?.stacks[0]?.latest;
      g.flight = fl ? { shots: Number(fl.extra?.source?.note?.match(/(\d+) shots/)?.[1]) || null, version: fl.extra?.source?.version ?? 1, status: /confirmed/.test(fl.extra?.source?.note ?? '') ? 'confirmed' : 'proposed', at: fl.created_at } : null;
      if (isSample(pr)) {
        const plan = await (await fetch(SAMPLE_PLAN)).json();
        g.planSite = { features: plan.site?.features ?? [], north: plan.site?.north ?? null, terrain: { ffl: plan.site?.terrain?.ffl ?? null } };
        g.model = modelFacts({ plan });
      } else {
        const ifc = files.filter((f) => f?.extra?.ifc?.classes).sort((a, b) => String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')))[0];
        g.model = ifc ? modelFacts({ ifc: ifc.extra.ifc }) : null;
      }
      g.point = pr.site?.lat != null ? { lat: pr.site.lat, lng: pr.site.lon } : null;
      log(`${g.point ? 'A site point' : 'No site point'}; ${plural(pr.site?.facts?.length ?? 0, 'fact')} kept; ${plural(g.intake?.sheets?.length ?? 0, 'sheet')} from intake.`);
      return { note: g.point ? 'point set' : 'no point' };
    },
    linz: {
      when: () => !!g.point,
      run: async ({ log }) => {
        const { lat, lng } = g.point;
        const [pm, gm] = await Promise.all([import(`${LINZ_DIR}parcel.js`), import(`${LINZ_DIR}ground.js`)]);
        const [parcel, outlines, dem, dsm, property] = await Promise.all([
          settle(async () => { const r = await pm.parcelAt(lat, lng); if (r.none) return { none: true }; const ring = (r.rings[0] ?? []).map(([x, y]) => [+y.toFixed(7), +x.toFixed(7)]); return { ring, area_m2: r.calcAreaM2, asOf: r.asOf }; }),
          settle(async () => parseOutlines(await getJSON(outlinesQuery(lat, lng)))),
          settle(async () => { const r = await gm.readLayer('ground', { lat, lon: lng, radius: 20 }); return r.status === 'live' ? { survey: r.values.survey?.title ?? r.truthLabel, captured: r.asOf, licence: r.licence?.name, height: r.value } : { none: true }; }),
          settle(async () => { const r = await gm.readLayer('surface', { lat, lon: lng, radius: 20 }); return r.status === 'live' ? { survey: r.values.survey?.title ?? r.truthLabel, captured: r.asOf, licence: r.licence?.name } : { none: true }; }),
          settle(async () => {
            const r=await fetch('/api/garden-site',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'property',lat,lon:lng}),signal:AbortSignal.timeout(12000)});
            if(!r.ok)throw Error('Property boundary lookup unavailable');
            const {property}=await r.json();
            if(property?.status!=='available')throw Error('Property boundary lookup unavailable');
            const {fromNZTM}=await import('/roof-solar/linz/nztm.js');
            const rings=property.outlines.flatMap(x=>x.type==='Polygon'?x.coordinates:x.coordinates.flat());
            return {rings:rings.filter(ring=>ring.length<=10000).map(ring=>ring.map(([e,n])=>{const p=fromNZTM(e,n);return [+p.lat.toFixed(7),+p.lon.toFixed(7)];})),count:property.outlines.length};
          }),
        ]);
        g.parcel = parcel; g.property = property; g.outlines = outlines; g.lidar = { dem, dsm };
        const said = [parcel.ring ? 'parcel' : null, property.count ? 'property boundary' : null, Array.isArray(outlines) ? plural(outlines.length, 'outline') : null, dem.survey ? 'LiDAR' : null].filter(Boolean);
        log(said.length ? `From LINZ: ${said.join(', ')}.` : 'LINZ gave nothing back.');
        return { note: said.join(' · ') || 'nothing' };
      },
    },
    live: {
      when: () => !!g.point,
      run: async ({ log }) => {
        const { lat, lng } = g.point;
        const [site, fc] = await Promise.all([
          settle(async () => { const j = await getJSON(`/api/live/?feeds=site&lat=${lat}&lon=${lng}`, 60000); const w = j?.feeds?.site?.facts?.['site.weather'] ?? j?.feeds?.site?.facts?.weather; if (!w || w.status !== 'live') throw new Error(w?.reason ?? 'no weather'); return w; }),
          settle(async () => { const j = await getJSON('/api/live/?feeds=weather&place=auckland'); const w = j?.feeds?.weather; if (!w || w.error) throw new Error(w?.error ?? 'no forecast'); return w; }),
        ]);
        g.weather = site; g.forecast = fc?.error ? null : fc;
        if (inAuckland(g.point)) {
          g.stops = await settle(async () => { const [st, ro] = await Promise.all([getJSON(`${AKL_DATA}stops.json`, 30000), getJSON(`${AKL_DATA}routes.json`)]); g.gtfs = { built: st.built, feedStart: st.feedStart, feedEnd: st.feedEnd }; return nearStops(st, ro, g.point); });
          g.atLive = await getJSON(AT_LIVE, 4000).then(() => 'on', () => 'off');
        } else g.stops = null;
        log(`Weather ${site.error ? 'not read' : 'read'}; ${Array.isArray(g.stops) ? plural(g.stops.length, 'stop') : 'no stops'}.`);
        return { note: [site.error ? null : 'weather', Array.isArray(g.stops) ? plural(g.stops.length, 'stop') : null].filter(Boolean).join(' · ') || 'nothing' };
      },
    },
    words: {
      when: () => siteSheets(g.intake?.sheets).length > 0,
      run: async ({ log }) => {
        const { loadPdfjs, openPdf } = await import('./intake-pdf.js'), lib = await loadPdfjs();
        g.words = {}; g.pages = {};
        for (const s of siteSheets(g.intake.sheets)) {
          const f = g.intake.files.find((x) => x.path === s.file && x.file_id);
          if (!f) { log(`${s.number ?? s.id}: the PDF was not kept, so its words were not read.`); continue; }
          const pdf = await openPdf(lib, new Uint8Array(await (await blobOf(ctx, f.file_id, 'application/pdf')).arrayBuffer()));
          try { g.words[s.id] = sheetWords(await pdf.page(s.page)); } finally { await pdf.close(); }
        }
        const n = Object.values(g.words).reduce((k, w) => k + w.existing.length + w.future.length + w.parking.length + w.levels.length, 0);
        log(`${plural(Object.keys(g.words).length, 'site plan')} read for their words: ${plural(n, 'label')}.`);
        return { note: plural(n, 'label') };
      },
    },
    read: {
      when: () => paid && siteSheets(g.intake?.sheets).length > 0,
      approval: () => `A model reads ${plural(Math.min(PAID_CAP, toRead().length), 'site plan picture')}: ${plural(Math.min(PAID_CAP, toRead().length), 'paid request')}.`,
      run: async ({ log, paid: spend }) => {
        const { loadPdfjs, openPdf } = await import('./intake-pdf.js'), lib = await loadPdfjs();
        const rec = normalRecord((await ctx.store.get('project', p.id))?.site_brief);
        let calls = rec.calls; const reads = { ...rec.reads };
        for (const s of toRead()) {
          if (calls >= PAID_CAP) { log(`Stopped at ${PAID_CAP} paid reads for this brief.`); break; }
          const f = g.intake.files.find((x) => x.path === s.file && x.file_id); if (!f) continue;
          const pdf = await openPdf(lib, new Uint8Array(await (await blobOf(ctx, f.file_id, 'application/pdf')).arrayBuffer()));
          let image; try { image = await pdf.draw(s.page, 2400); } finally { await pdf.close(); }
          spend(`site plan ${s.number ?? s.page}`); calls += 1;
          const r = await fetch('/api/plan-read/', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ image, mode: 'sitebrief' }) });
          const j = await r.json().catch(() => ({}));
          if (!r.ok || readProblem(j.plan)) { reads[s.id] = { error: j.error ?? `HTTP ${r.status}`, at: new Date().toISOString() }; log(`${s.number}: no read (${j.error ?? r.status}).`); continue; }
          reads[s.id] = { read: j.plan, provider: j.provider, model: j.model, prompts: j.prompts, at: new Date().toISOString(), mPerPx: metresPerPixel(s, await imgWidth(image)) };
          log(`${s.number}: read by ${j.provider}.`);
        }
        g.reads = reads;
        await withRecord(ctx, p.id, (x) => ({ ...x, reads, calls }), 'Site plan read for the site brief', `${calls} paid reads so far`);
        return { note: `${calls} of ${PAID_CAP} paid` };
      },
    },
    brief: async ({ log }) => {
      const rec = normalRecord((await ctx.store.get('project', p.id))?.site_brief);
      g.reads ??= rec.reads;
      const brief = buildBrief({ ...g, prompts: Object.values(g.reads ?? {}).find((r) => r?.prompts)?.prompts ?? null }, { by: 'site agent' });
      await withRecord(ctx, p.id, (x) => ({ ...x, brief, job: JSON.parse(JSON.stringify(live.job)) }), 'Site brief made', `${brief.items.length} items, ${brief.gaps.length} gaps`);
      try { localStorage.setItem(`${BRIEF_KEY}:latest`, JSON.stringify(brief)); } catch { /* the hand-over still carries it */ }
      log(`${plural(brief.items.length, 'item')}, ${plural(brief.gaps.length, 'gap')}.`);
      return { note: `${brief.items.length} items · ${brief.gaps.length} gaps` };
    },
    approve: {
      approval: () => 'A person reads the brief and approves it.',
      run: async () => {
        const by = live.job.steps.find((s) => s.id === 'approve').approved_by;
        await withRecord(ctx, p.id, (x) => ({ ...x, brief: approveBrief(x.brief, by) }), 'Site brief approved', `by ${by}`);
        return { note: `approved by ${by}` };
      },
    },
  };
  function toRead() { const done = normalRecord(g.project?.site_brief).reads; return siteSheets(g.intake?.sheets).filter((s) => !done[s.id]?.read && g.intake.files.some((x) => x.path === s.file && x.file_id)); }
  const rs = live.job.steps.find((s) => s.id === 'read');
  // the person pressed the button that names the paid requests: that press is the say-so for this step, and the brief is made again
  if (paid && (rs.status === STATUS.person || (rs.status === STATUS.done && rs.note === 'not needed'))) {
    rs.status = STATUS.person; rs.note = ''; approve(live.job, 'read', ctx.me?.name || 'A person');
    const bs = live.job.steps.find((s) => s.id === 'brief'); if (bs.status === STATUS.done) { bs.status = STATUS.waiting; bs.note = ''; }
    const as = live.job.steps.find((s) => s.id === 'approve'); as.status = STATUS.waiting; as.approved_by = ''; as.note = '';   // a new brief is approved afresh
  }
  try { await runJob(live.job, handlers, { onChange: () => ctx.redraw() }); } finally { live.busy = false; ctx.redraw(); }
}

// ---- the card ----------------------------------------------------------------------------------------------------------------------
const svg = (body, vb = '0 0 32 32', cls = 'sbx-ic') => `<svg class="${cls}" viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" focusable="false">${body}</svg>`;

/** the sun dial: a compass with today's sun now (filled) and at golden hour (ring), north up. Pure markup. */
export function sunDial(sun) {
  if (!sun) return '';
  const at = (az, alt) => { const r = 44 * (1 - Math.max(0, Math.min(90, alt)) / 90); const a = (az - 90) * Math.PI / 180; return [60 + r * Math.cos(a), 60 + r * Math.sin(a)]; };
  const [x, y] = at(sun.az, sun.alt), gh = sun.golden ? at(sun.golden.az, sun.golden.alt) : null;
  return `<svg class="sbx-dial" viewBox="0 0 120 120" fill="none" role="img" aria-label="The sun at the site: ${Math.round(sun.alt)} degrees up, ${Math.round(sun.az)} degrees from north">
    <circle cx="60" cy="60" r="44" stroke="currentColor" stroke-width="1"/><circle cx="60" cy="60" r="22" stroke="currentColor" stroke-width=".6" stroke-dasharray="2 3"/>
    <path d="M60 10v6M60 104v6M10 60h6M104 60h6" stroke="currentColor"/><text x="60" y="8" text-anchor="middle" class="sbx-dial-n">N</text>
    ${gh ? `<circle cx="${gh[0].toFixed(1)}" cy="${gh[1].toFixed(1)}" r="5" stroke="currentColor" stroke-width="1.5" class="sbx-gold"/>` : ''}
    ${sun.alt > 0 ? `<line x1="60" y1="60" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="currentColor" stroke-width=".8"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7" fill="currentColor" stroke="none" class="sbx-sun"/>` : '<text x="60" y="64" text-anchor="middle" class="sbx-dial-n">below the horizon</text>'}
  </svg>`;
}

/** the site map: parcel, the outlines named from the site plan or LINZ, the drawn boundary, stops; north up, metres from the point */
export function siteMap(brief) {
  const sc = brief?.scene, o = brief?.point; if (!sc || !o) return '';
  const rings = [...sc.boundary.map((b) => ({ ...b, en: b.ring.map(([la, ln]) => toEN(o, la, ln)) })), ...sc.existing.map((b) => ({ kind: 'building', ...b, en: b.ring.map(([la, ln]) => toEN(o, la, ln)) }))];
  if (!rings.length) return '';
  const parcel = rings.find((r) => r.kind === 'parcel'), focus = parcel?.en ?? rings.flatMap((r) => r.en);
  const xs = focus.map((p) => p[0]), ys = focus.map((p) => p[1]), span = Math.max(40, Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) * 1.9;
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = (Math.max(...ys) + Math.min(...ys)) / 2, W = 320, k = W / span;
  const P = ([e, n]) => `${(W / 2 + (e - cx) * k).toFixed(1)},${(W / 2 - (n - cy) * k).toFixed(1)}`;
  const inView = (en) => en.some(([e, n]) => Math.abs(e - cx) < span / 2 && Math.abs(n - cy) < span / 2);
  const bar = [10, 20, 50, 100].find((m) => m * k > 50) ?? 100;
  const named = sc.existing.filter((b) => b.tag === 'read');
  const poly = rings.filter((r) => inView(r.en)).map((r) => `<polygon points="${r.en.map(P).join(' ')}" class="sbx-${r.kind}"${r.kind==='property'?' fill="none" stroke="#99445f" stroke-width="2" stroke-dasharray="5 3"':''}><title>${esc(r.label ?? '')}</title></polygon>`).join('');
  const labels = sc.existing.filter((b) => inView(b.ring.map(([la, ln]) => toEN(o, la, ln)))).map((b) => { const [x, y] = P(toEN(o, b.centre.lat, b.centre.lng)).split(','); return b.tag === 'read' ? `<text x="${x}" y="${y}" class="sbx-lab">${esc(b.label)}</text>` : ''; }).join('');
  return `<svg class="sbx-map" viewBox="0 0 ${W} ${W}" role="img" aria-label="The site: LINZ parcel and property context, ${sc.existing.length} building outlines${named.length ? `, ${named.length} named from the site plan` : ''}">
    <rect width="${W}" height="${W}" class="sbx-mapbg"/>${poly}${labels}
    <g class="sbx-north" transform="translate(${W - 22} 26)"><path d="M0 -14 L6 6 L0 2 L-6 6 Z"/><text y="18" text-anchor="middle">N</text></g>
    <g class="sbx-bar" transform="translate(14 ${W - 16})"><path d="M0 0h${(bar * k).toFixed(1)}"/><text y="-5">${bar} m</text></g>
  </svg>`;
}
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function tiles(b) {
  const I = (id) => b.items.find((x) => x.id === id), G = (g) => b.items.filter((x) => x.group === g);
  const t = [];
  const sun = b.scene?.sun;
  if (sun) t.push({ k: 'Sun', big: `${Math.round(sun.alt)}°`, sub: sun.golden ? `golden hour ${nzClock(new Date(sun.golden.from))}` : 'no golden hour today', tag: 'live', art: sunDial(sun) });
  const w = I('live.weather'); if (w) t.push({ k: 'Weather now', big: `${b.scene.weather?.tempC != null ? Math.round(b.scene.weather.tempC) : '–'}°`, sub: `wind ${b.scene.weather?.windKmh != null ? Math.round(b.scene.weather.windKmh) : '–'} km/h · cloud ${b.scene.weather?.cloudPct ?? '–'}%`, tag: 'live' });
  const d = G('drawings'); if (d.length) { const sheets = d.filter((x) => x.id.startsWith('drawings.sheet.')).length, ex = d.filter((x) => /existing/.test(x.id)).length; t.push({ k: 'Drawings', big: String(sheets || d.length), sub: sheets ? `site ${sheets === 1 ? 'sheet' : 'sheets'}${ex ? ` · ${plural(ex, 'existing building')}` : ''}` : 'site items from the plan model', tag: 'read' }); }
  const pa = I('linz.parcel'); if (pa) t.push({ k: 'Parcel', big: typeof pa.value === 'number' ? pa.value.toLocaleString('en-NZ') : '■', sub: typeof pa.value === 'number' ? 'm² · LINZ' : 'LINZ outline', tag: 'measured' });
  const ol = I('linz.outlines'); if (ol) t.push({ k: 'Buildings near', big: String(ol.value), sub: 'LINZ outlines', tag: 'measured' });
  const dem = I('linz.dem'); if (dem) t.push({ k: 'LiDAR', big: '1 m', sub: String(dem.value).slice(0, 40), tag: 'read' });
  const st = G('transport'); if (st.length) t.push({ k: 'Nearest stop', big: `${st[0].value} m`, sub: st[0].name.slice(0, 34), tag: 'measured' });
  const mc = G('model').filter((x) => x.id.startsWith('model.count.')); if (mc.length) t.push({ k: 'Model', big: String(mc.reduce((s, x) => s + (Number(x.value) || 0), 0)), sub: `elements${I('model.storeys') ? ` · ${plural(I('model.storeys').value, 'storey')}` : ''}`, tag: 'measured' });
  return t;
}

async function renderPanel(el, ctx) {
  ensureCss();
  const p = ctx.project; if (!p) return undefined;
  const pr = (await ctx.store.get('project', p.id)) ?? p, rec = normalRecord(pr.site_brief), b = rec.brief, live = S.runs.get(p.id);
  const steps = live ? `<ol class="sbx-steps">${live.job.steps.map((s) => `<li class="${s.status === STATUS.person ? 'is-person' : ''}${s.status === STATUS.failed ? ' is-bad' : ''}" title="${esc(s.reason || s.note)}">${s.note === 'not needed' ? '·' : MARK[s.status]} ${esc(s.label)}${s.note && s.note !== 'not needed' ? ` · ${esc(s.note)}` : ''}</li>`).join('')}</ol>` : '';
  const failed = live?.job.steps.find((s) => s.status === STATUS.failed);
  const nSheets = siteSheets(pr.intake?.sheets).filter((s) => !rec.reads[s.id]?.read).length;
  const T = b ? tiles(b) : [];
  const byGroup = b ? GROUPS.map((g) => ({ ...g, items: b.items.filter((i) => i.group === g.id), gaps: b.gaps.filter((x) => x.group === g.id) })).filter((g) => g.items.length || g.gaps.length) : [];
  el.innerHTML = `<div class="sbx">
    <div class="sbx-head"><h3 class="sbx-h">Site brief</h3><span class="sbx-count">${b ? `${esc(b.status === 'approved' ? `approved · ${b.approval.by}` : 'proposed')} · ${esc(new Date(b.made_at).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' }))} · ${plural(b.items.length, 'item')}` : 'not made yet'}</span></div>
    ${b ? `<div class="sbx-top">
        <div class="sbx-mapbox">${siteMap(b) || `<div class="sbx-nomap">${svg('<path d="M5 9l14-4 8 6-3 14-16 3Z" stroke-dasharray="3 2.5"/>')}<p>No map: ${b.point ? 'LINZ gave no parcel or outlines' : 'no site point'}</p></div>`}</div>
        <ul class="sbx-tiles">${T.map((x) => `<li class="sbx-tile">${x.art ?? ''}<p class="sbx-k">${esc(x.k)}</p><p class="sbx-big">${esc(x.big)}</p><p class="sbx-sub">${esc(x.sub)}</p><span class="sbx-tag t-${x.tag}">${esc(TAG[x.tag])}</span></li>`).join('')}</ul>
      </div>
      <p class="sbx-legend">${LABELS.map((l) => `<span class="sbx-tag t-${l}">${l} ${b.counts[l] ?? 0}</span>`).join('')}<span class="sbx-tag t-gap">gaps ${b.gaps.length}</span></p>
      <ul class="sbx-gaps" aria-label="What is not known">${b.gaps.slice(0, 8).map((x) => `<li><span>□ ${esc(x.what)}</span><span>${esc(x.why)}</span></li>`).join('')}${b.gaps.length > 8 ? `<li><span>…</span><span>${b.gaps.length - 8} more below</span></li>` : ''}</ul>
      <details class="sbx-src"><summary>Every item and its source</summary>${byGroup.map((g) => `<h4>${esc(g.word)}</h4><ul>${g.items.map((i) => `<li><span>${esc(i.name)}${i.sheet ? ` <b class="mono">${esc(i.sheet)}</b>` : ''}</span><span class="sbx-v">${esc(typeof i.value === 'number' ? i.value.toLocaleString('en-NZ') : i.value)}${i.unit ? ` ${esc(i.unit)}` : ''}</span><span class="sbx-s">${esc(i.source)}${i.date ? ` · ${esc(String(i.date).slice(0, 10))}` : ''}${i.licence ? ` · ${esc(i.licence)}` : ''}</span><span class="sbx-tag t-${i.label}">${esc(i.how ?? i.label)}</span></li>`).join('')}${g.gaps.map((x) => `<li class="is-gap"><span>${esc(x.what)}</span><span class="sbx-v">—</span><span class="sbx-s">${esc(x.why)}</span><span class="sbx-tag t-gap">gap</span></li>`).join('')}</ul>`).join('')}</details>
      <p class="sbx-fine">${esc(b.note)} The walkthrough in Site and sources takes this brief to the 3D page.</p>` : `<p class="sbx-fine">The site agent brings the drawings, the site facts, LINZ, live weather and sun, transport and the model into one brief, every item with its source. Nothing paid runs without a person.</p>`}
    ${steps}
    ${failed ? `<p class="sbx-bad">× ${esc(failed.label)}: ${esc(failed.reason)}</p>` : ''}
    <div class="sbx-acts">
      <button class="btn${b ? '' : ' solid'}" data-sb="make"${live?.busy ? ' disabled' : ''}>${b ? 'Make it again' : 'Make the site brief'}</button>
      ${nSheets ? `<button class="btn" data-sb="read"${live?.busy || rec.calls >= PAID_CAP ? ' disabled' : ''}>Read the site plan · ${plural(Math.min(nSheets, PAID_CAP - rec.calls), 'paid request')}</button>` : ''}
      ${failed && live ? '<button class="btn" data-sb="retry">Try that step again</button>' : ''}
    </div>
    ${b && b.status !== 'approved' ? `<div class="sbx-acts"><input type="text" data-sb-who maxlength="80" placeholder="Your name" aria-label="Who approves the brief" value="${esc(ctx.me?.name ?? '')}"><button class="btn" data-sb="approve">Approve the brief</button></div>` : ''}
    ${S.say.get(p.id) ? `<p class="sbx-fine" role="status">${esc(S.say.get(p.id))}</p>` : ''}
  </div>`;
  el.onclick = async (e) => {
    const btn = e.target.closest('[data-sb]'); if (!btn) return;
    const what = btn.dataset.sb;
    try {
      if (what === 'make') { S.runs.delete(p.id); await run(ctx, p); }
      if (what === 'read') { if (!S.runs.get(p.id)) await run(ctx, p); await run(ctx, p, { paid: true }); }
      if (what === 'retry') { const L = S.runs.get(p.id), f = L?.job.steps.find((s) => s.status === STATUS.failed); if (f) retry(L.job, f.id, ctx.me?.name || 'A person'); await run(ctx, p); }
      if (what === 'approve') {
        const who = el.querySelector('[data-sb-who]')?.value.trim();
        if (!who) { S.say.set(p.id, 'Write your name: an approval names the person.'); return ctx.redraw(); }
        let L = S.runs.get(p.id);
        if (!L || L.job.steps.find((s) => s.id === 'approve').status !== STATUS.person) { S.runs.delete(p.id); await run(ctx, p); L = S.runs.get(p.id); }
        approve(L.job, 'approve', who); await run(ctx, p);
      }
    } catch (err) { S.say.set(p.id, `□ ${err?.message ?? 'It did not work.'}`); }
    ctx.redraw();
  };
  return undefined;
}

registerProjectPanel({ id: 'site-brief', title: 'Site brief', tab: 'site', order: 15, render: renderPanel });
