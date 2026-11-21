import * as THREE from 'three/webgpu';

// The approval record: who said yes to what, when, and on exactly which version of the model.
// Agents prepare; people approve. This card lets a named person record an approval against a fingerprint of the
// plan model, so an approval never silently carries over to a model that has since changed.
// What it is not: it is not a signature, not a professional sign-off, and not yet a shared or locked record. It is
// kept in this browser and in the file the person downloads. A shared record needs sign-in, which is not built.

export interface Approval {
  who: string; role: string; what: string; note: string; at: string;
  fingerprint: string; drawings: string; revision: string;
  counts: Record<string, number>; assumed: string[]; tool: string;
}

// SHA-256 in plain script, so the fingerprint is the same on every page and does not need a secure context.
const K = new Uint32Array([0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2]);
export function sha256(text: string): string {
  const src = new TextEncoder().encode(text), bits = src.length * 8, n = (((src.length + 9) >> 6) + 1) << 6, m = new Uint8Array(n);
  m.set(src); m[src.length] = 0x80;
  const dv = new DataView(m.buffer); dv.setUint32(n - 8, Math.floor(bits / 0x100000000)); dv.setUint32(n - 4, bits >>> 0);
  const h = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]), w = new Uint32Array(64);
  const r = (x: number, s: number) => (x >>> s) | (x << (32 - s));
  for (let o = 0; o < n; o += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(o + i * 4);
    for (let i = 16; i < 64; i++) { const a = w[i - 15], b = w[i - 2]; w[i] = (w[i - 16] + (r(a, 7) ^ r(a, 18) ^ (a >>> 3)) + w[i - 7] + (r(b, 17) ^ r(b, 19) ^ (b >>> 10))) >>> 0; }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const t1 = (hh + (r(e, 6) ^ r(e, 11) ^ r(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) >>> 0, t2 = ((r(a, 2) ^ r(a, 13) ^ r(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      hh = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    h[0] += a; h[1] += b; h[2] += c; h[3] += d; h[4] += e; h[5] += f; h[6] += g; h[7] += hh;
  }
  return [...h].map((x) => x.toString(16).padStart(8, '0')).join('');
}

/** A fingerprint of what the model says: buildings, site features, job notes and revision. The bulky ground data is left out. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function modelFingerprint(plan: any): string {
  const core = { schema: plan?.schema, job: plan?.job, revision: plan?.revision, buildings: plan?.buildings, features: plan?.site?.features, clearing: plan?.site?.terrain?.clearing };
  return sha256(JSON.stringify(core)).slice(0, 12);
}

/** which label a part's source falls under */
export function sourceLabel(source: string | undefined): string {
  const s = (source ?? '').toLowerCase();
  if (!s) return 'not labelled';
  if (s === 'ai' || s.startsWith('ai ')) return 'read by AI';
  if (s.includes('assum') || s.includes('indicative')) return 'assumed';
  if (s.includes('propos')) return 'proposed';
  if (s.includes('survey') || s.includes('linz')) return 'survey';
  if (s.includes('written') || s === 'read') return 'written on the drawings';
  if (s.includes('scaled') || s.includes('outline') || s.includes('position')) return 'scaled from the drawings';
  return 'other';
}

export function tally(scene: THREE.Object3D) {
  const counts: Record<string, number> = {}, assumed = new Set<string>();
  scene.traverse((o) => {
    const u = o.userData as { kind?: string; name?: string; source?: string };
    if (!u.name || !u.kind) return;
    const l = sourceLabel(u.source); counts[l] = (counts[l] ?? 0) + 1;
    if (l === 'assumed') assumed.add(u.name);
  });
  return { counts, assumed: [...assumed].sort() };
}

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const ROLES = ['Registered architect', 'Design LBP', 'Chartered engineer', 'Owner or client', 'Other'];
const WHATS = ['The model matches the drawings named here', 'The assumptions listed are accepted', 'This may be shown to the client'];

interface Host { scene: THREE.Object3D; project: { key: string; title: string }; log(msg: string): void; save: ((filename: string, data: Blob) => Promise<void>) | null }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function approvalPanel(app: Host, plan: any): HTMLElement {
  const el = document.createElement('section');
  el.className = 'card'; el.id = 'approvals';
  const fp = modelFingerprint(plan), drawings = String(plan?.job?.drawings ?? 'not stated'), rev = String(plan?.revision?.current ?? 'not stated');
  const key = `assembl.approvals.${app.project.key}.${plan?.job?.nickname ?? 'model'}`;
  const tool = (document.querySelector('script[src*="twin-"]') as HTMLScriptElement | null)?.src.split('/').pop() ?? 'unknown build';
  const load = (): Approval[] => { try { return JSON.parse(localStorage.getItem(key) ?? '[]') as Approval[]; } catch { return []; } };
  const store = (a: Approval[]) => { try { localStorage.setItem(key, JSON.stringify(a)); } catch { /* storage can be closed; the download still works */ } };
  el.innerHTML = `<h3>Approval record</h3>
    <p class="small">Agents prepare, people approve. Record who said yes, to what, on this exact version of the model.</p>
    <p class="mono small" id="apVersion"></p>
    <div id="apTally" class="small"></div>
    <div class="grid2" style="margin-top:8px">
      <label style="min-width:0">Name <input id="apWho" autocomplete="name" style="width:100%;min-width:0;box-sizing:border-box" /></label>
      <label style="min-width:0">Role <select id="apRole" style="width:100%;min-width:0;box-sizing:border-box">${ROLES.map((r) => `<option>${r}</option>`).join('')}</select></label>
    </div>
    <label style="display:block;margin-top:6px">Approving <select id="apWhat" style="width:100%">${WHATS.map((w) => `<option>${w}</option>`).join('')}</select></label>
    <label style="display:block;margin-top:6px">Note <input id="apNote" placeholder="optional" style="width:100%" /></label>
    <div class="row wrap" style="margin-top:8px"><button class="pill solid" id="apGo">Record approval</button><button class="pill" id="apSave">Download record</button></div>
    <ul id="apList" class="pins"></ul>
    <p class="small">Kept in this browser and in the file you download. It is a record of who said yes. It is not a signature, not a professional sign-off, and not yet a shared record.</p>`;
  const $ = <T extends HTMLElement>(id: string) => el.querySelector('#' + id) as T;
  $('apVersion').textContent = `version ${fp} · revision ${rev}`;
  const draw = () => {
    const t = tally(app.scene), order = ['written on the drawings', 'scaled from the drawings', 'survey', 'read by AI', 'assumed', 'proposed', 'other', 'not labelled'];
    $('apTally').innerHTML = `<div><b>Drawings:</b> ${esc(drawings)}</div><div style="margin-top:4px"><b>Parts by label:</b> ${order.filter((k) => t.counts[k]).map((k) => `${esc(k)} ${t.counts[k]}`).join(' · ') || 'the model is still loading'}</div>` +
      (t.assumed.length ? `<div style="margin-top:4px"><b>Assumed, to check:</b> ${t.assumed.slice(0, 14).map(esc).join('; ')}${t.assumed.length > 14 ? `; and ${t.assumed.length - 14} more` : ''}</div>` : '');
    const list = load();
    $('apList').innerHTML = list.length ? list.map((a) => `<li><span class="mono small">${a.fingerprint === fp ? '■ this version' : '□ an earlier version (' + esc(a.fingerprint) + ')'}</span><br><b>${esc(a.who)}</b>, ${esc(a.role)}: ${esc(a.what)}${a.note ? ' (' + esc(a.note) + ')' : ''}<br><span class="small">${esc(new Date(a.at).toLocaleString('en-NZ', { dateStyle: 'medium', timeStyle: 'short' }))}</span></li>`).join('') : '<li class="small">No approvals recorded for this model in this browser.</li>';
    return t;
  };
  $('apGo').addEventListener('click', () => {
    const who = ($('apWho') as HTMLInputElement).value.trim();
    if (who.length < 2) { app.log('Approval not recorded: type the name of the person approving.'); ($('apWho') as HTMLInputElement).focus(); return; }
    const t = draw();
    const a: Approval = { who, role: ($('apRole') as HTMLSelectElement).value, what: ($('apWhat') as HTMLSelectElement).value, note: ($('apNote') as HTMLInputElement).value.trim(), at: new Date().toISOString(), fingerprint: fp, drawings, revision: rev, counts: t.counts, assumed: t.assumed, tool };
    store([a, ...load()]); draw();
    app.log(`Approval recorded for version ${fp}: ${who}, ${a.role}.`);
  });
  $('apSave').addEventListener('click', async () => {
    const t = draw(), list = load();
    const record = {
      type: 'assembl.approval-record.v1', model: { title: plan?.job?.title ?? app.project.title, fingerprint: fp, revision: rev, drawings, tool }, madeAt: new Date().toISOString(),
      labels: t.counts, assumed: t.assumed,
      aiUse: { partsReadByAI: t.counts['read by AI'] ?? 0, note: 'Parts labelled "read by AI" were read from a drawing by the AI plan reader and need a person to confirm them. Furniture, planting and lighting are proposed by the tool.' },
      approvals: list,
      standing: 'A record of who approved what on which version. Not a signature and not a professional sign-off. Kept in the browser it was made in and in this file.',
    };
    if (!app.save) return app.log('Downloads aren’t available in this view.');
    await app.save(`${app.project.key}-approval-record-${fp}.json`, new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' })).catch(() => void 0);
    app.log(`Approval record for version ${fp} offered for download (${list.length} approval${list.length === 1 ? '' : 's'}).`);
  });
  // the model is still being built when this card is made: fill the tally once it is on the stage
  setTimeout(draw, 1500); setTimeout(draw, 8000);
  return el;
}
