import * as THREE from 'three/webgpu';
import { toNZTM } from './linz/nztm.js';

// The site brief on the 3D page (the site agent, feat/site-agent). Loaded on demand from projectPlan.ts with one line.
// The brief (assembl.site-brief.v1, architecture/js/agents/site-brief-rules.js) arrives with the hand-over as site.brief, or, for a
// page opened with ?brief=latest, from this browser's own storage (the ops page keeps the last brief made there). It is read here,
// never changed. What it does on the scene:
//   - the sun: today's real sun at the site point, now, or at today's golden hour (the page's own sun controls follow)
//   - labels on the existing buildings round the model, named from the site plan where the site agent matched one, else from LINZ
//   - the boundary lines it carries: the LINZ parcel, and the site plan's boundary and future stages where they were laid on it
//   - a "What we know about this site" card: every item with its source, and the gaps said plainly
// Nothing here is a planning, hazard or Building Code statement. Agents prepare, people approve.

export const BRIEF_KEY = 'assembl.site-brief';
export const BRIEF_TYPE = 'assembl.site-brief.v1';
type Item = { id: string; group: string; name: string; value: unknown; unit: string; source: string; date: string | null; licence: string; label: string; sheet?: string; how?: string };
type Ring = { kind: string; label: string; ring: [number, number][]; source: string; tag: string };
type Existing = { id?: string; label: string; name_from?: string; centre?: { lat: number; lng: number }; tag: string };
export type SiteBrief = {
  type: string; v: number; made_at: string; status: string; approval: { by: string; at: string } | null; point: { lat: number; lng: number } | null;
  items: Item[]; gaps: { what: string; why: string; group: string }[]; counts: Record<string, number>;
  scene: { sun: { at: string; alt: number; az: number; golden: { from: string; to: string; at: string } | null } | null; weather: { tempC: number | null; cloudPct: number | null; windKmh: number | null } | null; existing: Existing[]; boundary: Ring[]; features: { kind: string; label: string; pts: [number, number][]; open?: boolean; tag: string }[] };
};
type Host = { log(m: string): void; scene: THREE.Scene; project: { lat: number; lon: number }; setSun(d: Date): void; built: { support?: (p: THREE.Vector3) => number | null } };

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const GROUPS: [string, string][] = [['drawings', 'Drawings'], ['site', 'Site facts'], ['linz', 'LINZ'], ['live', 'Live'], ['transport', 'Transport'], ['model', 'Model']];
const nzTime = (iso: string) => new Intl.DateTimeFormat('en-NZ', { timeZone: 'Pacific/Auckland', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(iso)).replace(/\s+/g, ' ').toLowerCase();
const nzDate = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const nzHour = (d: Date) => { const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Pacific/Auckland', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d).map((x) => [x.type, x.value])); return +p.hour + +p.minute / 60; };

/** '' when the thing passed is a brief this page may use, else what is wrong (the same contract the ops page checks) */
export function briefProblem(b: unknown): string {
  const o = b as SiteBrief | null;
  if (!o || o.type !== BRIEF_TYPE || o.v !== 1) return 'not a site brief';
  if (!Array.isArray(o.items) || !Array.isArray(o.gaps) || !o.scene || !Array.isArray(o.scene.existing) || !Array.isArray(o.scene.boundary)) return 'missing parts';
  if (o.items.some((i) => !['read', 'measured', 'live', 'assumed', 'proposed'].includes(i.label) || !i.source)) return 'an item without its label or source';
  return '';
}

/** the brief for this page: the hand-over's site.brief, else ?brief=latest from this browser's storage, else null */
export function briefFor(site: { brief?: unknown } | null | undefined, q = new URLSearchParams(location.search), storage: Storage | null = globalThis.localStorage ?? null): SiteBrief | null {
  if (site?.brief && !briefProblem(site.brief)) return site.brief as SiteBrief;
  if (q.get('brief') === 'latest') { try { const b = JSON.parse(storage?.getItem(`${BRIEF_KEY}:latest`) ?? 'null'); if (!briefProblem(b)) return b as SiteBrief; } catch { /* none */ } }
  return null;
}

// ---- labels and lines -----------------------------------------------------------------------------------------------------------------
function labelSprite(text: string, tag: string) {
  const c = document.createElement('canvas'), g = c.getContext('2d')!, fs = 30, pad = 14;
  g.font = `600 ${fs}px "Instrument Sans", system-ui, sans-serif`;
  const t2 = tag === 'read' ? 'from the site plan' : tag === 'proposed' ? 'proposed' : tag === 'assumed' ? 'laid on, assumed' : 'LINZ';
  const w = Math.ceil(Math.max(g.measureText(text).width, (g.font = `500 20px "IBM Plex Mono", monospace`, g.measureText(t2).width)) + pad * 2);
  c.width = w; c.height = fs + 20 + pad * 2 + 4;
  g.fillStyle = 'rgba(255,253,251,.94)'; g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = '#654A4E'; g.lineWidth = 2; if (tag !== 'read' && tag !== 'measured') g.setLineDash([6, 4]); g.strokeRect(1, 1, c.width - 2, c.height - 2);
  g.fillStyle = '#240B21'; g.font = `600 ${fs}px "Instrument Sans", system-ui, sans-serif`; g.textBaseline = 'top'; g.fillText(text, pad, pad - 2);
  g.fillStyle = '#654A4E'; g.font = `500 20px "IBM Plex Mono", monospace`; g.fillText(t2, pad, pad + fs + 2);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true, sizeAttenuation: false }));
  const k = 0.00038; s.scale.set(c.width * k, c.height * k, 1); s.center.set(0.5, 0); s.renderOrder = 20; s.name = `label_${text}`;
  return s;
}
const LINE = { parcel: 0xfffdfb, drawn: 0x916a70, future: 0x916a70 } as Record<string, number>;

/** draw the brief's labels and boundaries: toScene maps lat/lng (or a plan-frame point) to scene x, z; y from the page's ground */
export function sceneLayer(b: SiteBrief, toScene: ((lat: number, lng: number) => [number, number]) | null, groundY: (x: number, z: number) => number) {
  const g = new THREE.Group(); g.name = 'site_brief_layer';
  const at = (x: number, z: number, up: number) => new THREE.Vector3(x, (groundY(x, z) || 0) + up, z);
  let labels = 0, lines = 0;
  if (toScene) {
    for (const e of b.scene.existing) {
      if (!e.centre) continue;
      const [x, z] = toScene(e.centre.lat, e.centre.lng); const s = labelSprite(e.label, e.tag); s.position.copy(at(x, z, 9)); g.add(s); labels++;
    }
    for (const r of b.scene.boundary) {
      if (r.ring.length < 3) continue;
      const pts = r.ring.map(([la, ln]) => { const [x, z] = toScene(la, ln); return at(x, z, 0.35); }); pts.push(pts[0].clone());
      const m = new THREE.LineDashedMaterial({ color: LINE[r.kind] ?? 0xfffdfb, dashSize: r.kind === 'parcel' ? 1.6 : 0.8, gapSize: r.kind === 'parcel' ? 0.8 : 0.6, depthTest: true });
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), m); line.computeLineDistances(); line.name = `boundary_${r.kind}`; g.add(line); lines++;
      const mid = pts[0].clone().lerp(pts[1], 0.5); const s = labelSprite(r.label, r.tag); s.position.copy(mid).add(new THREE.Vector3(0, 2.5, 0)); g.add(s); labels++;
    }
  }
  for (const f of b.scene.features ?? []) {   // the sample's site plan features, in the plan model's frame (x = u, z = v)
    if (f.pts.length < 2) continue;
    const c = f.pts.reduce((a, p) => [a[0] + p[0] / f.pts.length, a[1] + p[1] / f.pts.length], [0, 0]);
    const s = labelSprite(f.label, f.tag); s.position.copy(at(f.kind === 'boundary' ? f.pts[0][0] : c[0], f.kind === 'boundary' ? f.pts[0][1] : c[1], f.kind === 'boundary' ? 3 : 2)); g.add(s); labels++;
  }
  return { group: g, labels, lines };
}

// ---- the card ------------------------------------------------------------------------------------------------------------------------
const CSS = `
#siteBriefCard .sb-row{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0}
#siteBriefCard .sb-big{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin:8px 0}
#siteBriefCard .sb-big div{border:1px solid var(--line2,rgba(101,74,78,.28));padding:6px 8px;background:#FFFDFB}
#siteBriefCard .sb-big b{display:block;font:600 22px/1.05 "Instrument Sans",system-ui,sans-serif;color:#240B21}
#siteBriefCard .sb-big span{display:block;font:10.5px/1.3 'IBM Plex Mono',monospace;color:#654A4E;text-transform:uppercase;letter-spacing:.06em}
#siteBriefCard h4{margin:12px 0 2px;font:500 10.5px 'IBM Plex Mono',monospace;letter-spacing:.08em;text-transform:uppercase;color:#654A4E}
#siteBriefCard ul{list-style:none;margin:4px 0;padding:0}
#siteBriefCard li{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:0 8px;padding:5px 0;border-top:1px dashed rgba(51,33,47,.12);font-size:13px}
#siteBriefCard li small{grid-column:1/-1;font:11px/1.4 'IBM Plex Mono',monospace;color:#654A4E;overflow-wrap:anywhere}
#siteBriefCard li em{font-style:normal;font:10px/1 'IBM Plex Mono',monospace;border:1px solid rgba(101,74,78,.35);padding:3px 5px;align-self:start}
#siteBriefCard li em.live{background:#240B21;color:#F5F1F2;border-color:#240B21}
#siteBriefCard li em.measured{background:#E3D0D2}
#siteBriefCard li em.assumed,#siteBriefCard li em.proposed{border-style:dashed}
#siteBriefCard li.gap{color:#654A4E}
#siteBriefCard .pill[aria-pressed="true"]{background:#240B21;color:#F5F1F2}`;

export function mountSiteBrief(app: Host, site: { brief?: unknown } | null | undefined, kind: 'plan' | 'ifc' | 'glb' | string) {
  const b = briefFor(site);
  if (!b || document.getElementById('siteBriefCard')) return null;
  const extra = document.getElementById('extra'); if (!extra) return null;
  if (!document.getElementById('siteBriefStyle')) { const st = document.createElement('style'); st.id = 'siteBriefStyle'; st.textContent = CSS; document.head.append(st); }
  const sun = b.scene.sun, w = b.scene.weather;
  const groups = GROUPS.map(([id, word]) => ({ word, items: b.items.filter((i) => i.group === id), gaps: b.gaps.filter((x) => x.group === id) })).filter((x) => x.items.length || x.gaps.length);
  const el = document.createElement('section'); el.className = 'card'; el.id = 'siteBriefCard';
  el.innerHTML = `<h3>What we know about this site</h3>
    <p class="small mono">Site brief · ${esc(b.status === 'approved' && b.approval ? `approved by ${b.approval.by}` : 'proposed, not yet approved')} · ${esc(new Date(b.made_at).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' }))}</p>
    <div class="sb-big">
      <div><b>${sun ? `${Math.round(sun.alt)}°` : '–'}</b><span>sun now</span></div>
      <div><b>${w?.tempC != null ? `${Math.round(w.tempC)}°` : '–'}</b><span>${w ? `cloud ${w.cloudPct ?? '–'}%` : 'weather'}</span></div>
      <div><b>${b.gaps.length}</b><span>gaps</span></div>
    </div>
    ${sun ? `<div class="sb-row" role="group" aria-label="Sun"><button class="pill" id="sbNow" aria-pressed="false">Sun today, now</button>${sun.golden ? `<button class="pill" id="sbGold" aria-pressed="false">Golden hour · ${esc(nzTime(sun.golden.from))}</button>` : ''}</div>
      <p class="small">The sun computed for the site point${b.point ? '' : ' (no point: the page’s own)'}; weather is modelled for the nearest grid cell, not measured on site.</p>` : '<p class="small">No site point in the brief, so the sun stays as the page set it.</p>'}
    <div class="sb-row"><button class="pill" id="sbLabels" aria-pressed="true">Labels and boundaries</button></div>
    <p class="small" id="sbSay"></p>
    <h4>Sources</h4><ul>${groups.filter((g) => g.items.length).map((g) => { const src = [...new Set(g.items.map((i) => i.source.split(/[,(:·]/)[0].trim()))].slice(0, 3); const tags = [...new Set(g.items.map((i) => i.label))]; return `<li><span><b>${esc(g.word)}</b> · ${g.items.length}</span><em class="${esc(tags[0])}">${esc(tags.join(' · '))}</em><small>${esc(src.join(' · '))}</small></li>`; }).join('')}</ul>
    <h4>Not known</h4><ul>${b.gaps.slice(0, 8).map((x) => `<li class="gap"><span>□ ${esc(x.what)}</span><em>gap</em><small>${esc(x.why)}</small></li>`).join('')}${b.gaps.length > 8 ? `<li class="gap"><span>and ${b.gaps.length - 8} more</span></li>` : ''}</ul>
    <details><summary class="small">Every item and its source (${b.items.length})</summary>${groups.map((g) => `<h4>${esc(g.word)}</h4><ul>${g.items.map((i) => `<li><span>${esc(i.name)}${i.sheet ? ` · ${esc(i.sheet)}` : ''}: <b>${esc(typeof i.value === 'number' ? i.value.toLocaleString('en-NZ') : i.value)}${i.unit ? ` ${esc(i.unit)}` : ''}</b></span><em class="${esc(i.label)}">${esc(i.how ?? i.label)}</em><small>${esc(i.source)}${i.date ? ` · ${esc(String(i.date).slice(0, 10))}` : ''}${i.licence ? ` · ${esc(i.licence)}` : ''}</small></li>`).join('')}</ul>`).join('')}</details>
    <p class="small">Prepared by the site agent. Not a planning, hazard or Building Code assessment.</p>`;
  extra.prepend(el);
  const say = (m: string) => { (el.querySelector('#sbSay') as HTMLElement).textContent = m; };

  // the sun at the site: the page's own date and hour controls follow, so a person can carry on from there
  const sunTo = (d: Date, btn: string) => {
    if (b.point) { app.project.lat = b.point.lat; app.project.lon = b.point.lng; }
    const date = document.getElementById('sundate') as HTMLInputElement | null, time = document.getElementById('suntime') as HTMLInputElement | null;
    if (date) date.value = nzDate(d);
    if (time) time.value = String(Math.round(nzHour(d) * 2) / 2);
    app.setSun(d);
    for (const id of ['sbNow', 'sbGold']) el.querySelector(`#${id}`)?.setAttribute('aria-pressed', String(id === btn));
    say(`Sun set to ${nzTime(d.toISOString())} today at the site.`);
  };
  el.querySelector('#sbNow')?.addEventListener('click', () => sunTo(new Date(), 'sbNow'));
  el.querySelector('#sbGold')?.addEventListener('click', () => sun?.golden && sunTo(new Date(sun.golden.at), 'sbGold'));

  // labels and lines: on an opened model they wait for the site's ground (the Real ground card), whose frame turns lat/lng into the scene
  let layer: THREE.Group | null = null;
  const groundY = (x: number, z: number) => app.built.support?.(new THREE.Vector3(x, 0, z)) ?? 0;
  const draw = (toScene: ((lat: number, lng: number) => [number, number]) | null) => {
    if (layer) app.scene.remove(layer);
    const L = sceneLayer(b, toScene, groundY); layer = L.group; app.scene.add(layer);
    say(`${L.labels} labels and ${L.lines} boundary lines from the site brief.`);
    app.log(`Site brief: ${L.labels} labels, ${L.lines} boundary lines.`);
  };
  if (kind === 'plan') draw(null);
  else {
    let tries = 0;
    const wait = setInterval(() => {
      const gr = (window as unknown as { __site?: { ground: () => { toScene: (e: number, n: number) => [number, number] } | null } }).__site?.ground?.();
      if (gr) { clearInterval(wait); draw((lat, lng) => { const p = toNZTM(lat, lng); return gr.toScene(p.e, p.n); }); }
      else if (++tries > 180) { clearInterval(wait); say('The site’s ground was not read, so the labels could not be placed. Read it in On its site.'); }
    }, 1000);
  }
  el.querySelector('#sbLabels')?.addEventListener('click', (e) => { const on = (e.currentTarget as HTMLElement).getAttribute('aria-pressed') !== 'true'; (e.currentTarget as HTMLElement).setAttribute('aria-pressed', String(on)); if (layer) layer.visible = on; });
  (window as unknown as { __siteBrief?: unknown }).__siteBrief = { brief: b, layer: () => layer };
  return el;
}
