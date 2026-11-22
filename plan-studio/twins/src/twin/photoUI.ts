// "Make it a photo": the architect frames a view of the model, presses one button, and Google Gemini returns a photographic
// image of that exact view, shown against the captured view with a before/after slider. The image is never the checked model
// and never a photograph: a fixed label sits on it, under it, and is burned into every download.
// Self-contained: mountPhoto(app) adds a card after the Stills card, a button on the 3D view and the result viewer.
// The server side is functions/api/render.js. Recent results stay in memory for this tab only.
import type { App } from './app';
import { cropFor, errorText, ESTIMATES, fileName, keepRecent, PHOTO_LABEL, priceShort, qualityName, ratioValue, requestBody, SEASONS, seconds, SETTING_MAX, timeFromSun, TIMES, timeName, type Quality, type Result, type Season, type Time } from './photoFrame';

const CAMERA = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><path d="M4 8h3l1.6-2.2h6.8L17 8h3v11H4z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="12" cy="13.2" r="3.4" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

const CSS = `
.ph-go{position:absolute;top:12px;right:12px;z-index:6;display:inline-flex;align-items:center;gap:7px;box-shadow:0 6px 20px rgba(33,18,31,.22)}
.ph-go[disabled]{opacity:.7}
.ph-go small{font:11px 'IBM Plex Mono',monospace;opacity:.8}
.ph-seg{display:inline-flex;border:1px solid var(--line2);border-radius:999px;padding:2px;gap:2px}
.ph-seg button{border:0;background:transparent;border-radius:999px;padding:5px 14px;min-height:32px;font:inherit;font-size:13px;color:var(--ink);cursor:pointer}
.ph-seg button[aria-pressed="true"]{background:var(--plum);color:var(--ivory)}
.ph-seg button:focus-visible{outline:2px solid var(--rose);outline-offset:2px}
#photoCard .ph-opts{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:8px 0;font-size:13px}
#photoCard .ph-opts label{display:flex;flex-direction:column;gap:4px}
#photoCard .ph-opts .wide{grid-column:1/-1}
#photoCard input[type=text]{font:inherit;font-size:13px;padding:6px 8px;border:1px solid var(--line2);border-radius:8px;background:#fff;color:var(--ink);width:100%}
#photoCard .ph-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
#photoMsg{min-height:0;margin:6px 0 0}
#photoMsg.bad{color:#9b2f45}
#photoRecent{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
#photoRecent:empty{display:none}
#photoRecent button{padding:0;border:1px solid var(--line2);border-radius:8px;overflow:hidden;width:72px;height:48px;background:var(--pale);cursor:pointer;position:relative}
#photoRecent img{width:100%;height:100%;object-fit:cover;display:block}
#photoRecent span{position:absolute;left:3px;bottom:3px;font:10px 'IBM Plex Mono',monospace;background:rgba(33,18,31,.78);color:var(--ivory);border-radius:4px;padding:0 4px}
.ph-view{position:absolute;inset:0;z-index:12;background:var(--aub);color:var(--ivory);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:14px;gap:8px}
.ph-view[hidden]{display:none}
.ph-frame{position:relative;overflow:hidden;border-radius:10px;background:#000;flex:none;user-select:none;touch-action:pan-y}
.ph-frame img{position:absolute;inset:0;width:100%;height:100%;display:block;object-fit:cover;pointer-events:none}
.ph-after{clip-path:inset(0 0 0 50%);transition:opacity .4s}
.ph-divider{position:absolute;top:0;bottom:0;left:50%;width:2px;margin-left:-1px;background:var(--ivory);box-shadow:0 0 0 1px rgba(33,18,31,.35);pointer-events:none}
.ph-divider::after{content:'';position:absolute;top:50%;left:50%;width:30px;height:30px;margin:-15px 0 0 -15px;border-radius:50%;background:var(--ivory);box-shadow:0 2px 10px rgba(0,0,0,.35)}
.ph-divider::before{content:'\\2039\\2009\\203A';position:absolute;top:50%;left:50%;transform:translate(-50%,-52%);z-index:1;color:var(--plum);font:600 15px/1 'Instrument Sans',sans-serif;white-space:nowrap}
.ph-frame input[type=range]{position:absolute;inset:0;width:100%;height:100%;margin:0;opacity:0;cursor:ew-resize}
.ph-frame input[type=range]:focus-visible + .ph-focus{outline:2px solid var(--rose);outline-offset:-2px}
.ph-focus{position:absolute;inset:0;pointer-events:none;border-radius:10px}
.ph-tag{position:absolute;top:10px;font:500 11px 'IBM Plex Mono',monospace;background:rgba(249,246,242,.92);color:var(--plum);border-radius:999px;padding:3px 9px;pointer-events:none}
.ph-tag.l{left:10px}.ph-tag.r{right:10px;background:var(--plum);color:var(--ivory)}
.ph-stamp{position:absolute;left:0;right:0;bottom:0;margin:0;padding:6px 10px;font:11px/1.35 'IBM Plex Mono',monospace;color:var(--ivory);background:linear-gradient(to top,rgba(24,11,24,.86),rgba(24,11,24,.6));pointer-events:none}
.ph-label{margin:0;font-size:12.5px;line-height:1.4;color:var(--ivory);text-align:center;max-width:820px}
.ph-bar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:center}
.ph-bar .pill{color:var(--ivory);border-color:rgba(249,246,242,.45)}
.ph-bar .pill:hover{background:rgba(249,246,242,.12);border-color:var(--ivory)}
.ph-bar .pill.solid{background:var(--ivory);color:var(--plum);border-color:var(--ivory)}
.ph-meta{font:11.5px 'IBM Plex Mono',monospace;color:var(--rose)}
.ph-wait{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(24,11,24,.38);overflow:hidden}
.ph-wait[hidden]{display:none}
.ph-wait::before{content:'';position:absolute;top:0;bottom:0;width:35%;left:-35%;background:linear-gradient(90deg,transparent,rgba(249,246,242,.28),transparent);animation:ph-scan 1.8s ease-in-out infinite}
@keyframes ph-scan{to{left:100%}}
.ph-chip{position:relative;display:flex;align-items:center;gap:10px;background:rgba(249,246,242,.95);color:var(--plum);border-radius:999px;padding:6px 6px 6px 14px;font-size:13px;box-shadow:0 8px 28px rgba(0,0,0,.3);max-width:calc(100% - 20px)}
.ph-chip b{font-weight:500;line-height:1.25}
.ph-chip .mono{font-size:12px;color:var(--mauve);white-space:nowrap}
.ph-chip .pill{min-height:30px;padding:3px 10px;font-size:12.5px}
.ph-dot{width:9px;height:9px;border-radius:50%;background:var(--plum);flex:none;animation:ph-pulse 1s ease-in-out infinite alternate}
@keyframes ph-pulse{from{opacity:.25}to{opacity:1}}
.ph-err{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(420px,calc(100% - 24px));background:var(--ivory);color:var(--ink);border-radius:14px;padding:14px 16px;box-shadow:0 10px 30px rgba(0,0,0,.35);font-size:13.5px}
.ph-err[hidden]{display:none}
.ph-err h4{margin:0 0 6px;font-size:15px;font-weight:500;color:var(--plum)}
.ph-err p{margin:0 0 10px}
.ph-err .pill:not(.solid){color:var(--ink)}
.ph-err .pill small{font:11px 'IBM Plex Mono',monospace;opacity:.8;margin-left:4px}
@media (max-width:900px){.ph-go{top:10px;right:10px;padding:6px 12px}.ph-chip{font-size:12.5px;gap:8px;padding-left:12px}.ph-view{padding:10px;gap:6px}.ph-stamp{font-size:10px;padding:4px 8px}.ph-label{font-size:11.5px}.ph-tag{top:8px;font-size:10px}}
@media (prefers-reduced-motion:reduce){.ph-wait::before,.ph-dot{animation:none}.ph-after{transition:none}}
`;

type Host = App;

/** render a fresh frame and read it in the same task (WebGL drops its buffer after the frame; WebGPU presents at the task's end),
 *  trimmed to the nearest shape Google Gemini makes. Throws if the browser hands back an empty picture. */
export function captureView(app: Host) {
  const hl = (app as unknown as { highlight?: { visible: boolean } }).highlight, was = hl?.visible ?? false;
  if (hl) hl.visible = false;
  try {
    if (app.pipeline) app.pipeline.render();
    else app.renderer.render(app.scene, app.camera);
    const src = app.canvas, c = cropFor(src.width, src.height);
    const out = document.createElement('canvas');
    out.width = c.dw; out.height = c.dh;
    const g = out.getContext('2d', { willReadFrequently: true })!;
    g.drawImage(src, c.sx, c.sy, c.sw, c.sh, 0, 0, c.dw, c.dh);
    // an empty read (all transparent, or one flat colour) would be paid for and come back as nonsense: stop here instead
    const probe = g.getImageData(0, 0, c.dw, c.dh).data, step = Math.max(4, Math.floor(probe.length / 4 / 400)) * 4;
    let lit = 0, first = -1, varied = false;
    for (let i = 0; i < probe.length; i += step) {
      if (probe[i + 3] > 0) lit++;
      const v = probe[i] * 65536 + probe[i + 1] * 256 + probe[i + 2];
      if (first < 0) first = v; else if (Math.abs(v - first) > 0) varied = true;
    }
    if (!lit || !varied) throw new Error('blank');
    return { url: out.toDataURL('image/jpeg', 0.9), ratio: c.ratio, trimmed: c.trimmed, w: c.dw, h: c.dh, crop: { w: src.width, h: src.height, sx: c.sx, sy: c.sy, sw: c.sw, sh: c.sh, dw: c.dw, dh: c.dh }, line: null as string | null };
  } finally {
    if (hl) hl.visible = was;
  }
}

/** the line drawing of the same view, cropped the same way, from the model's own geometry (photoreal/lines.ts via the
 *  Photoreal module's lineView); null if the module is not loaded or the browser cannot draw it (the photo is then asked for
 *  without it, as before) */
async function lineFor(shot: ReturnType<typeof captureView>): Promise<string | null> {
  const pr = (window as unknown as { __photoreal?: { lineView?: (c: ReturnType<typeof captureView>['crop']) => Promise<string> } }).__photoreal;
  if (!pr?.lineView) return null;
  try { const u = await pr.lineView(shot.crop); return /^data:image\/png;base64,/.test(u) ? u : null; } catch (e) { console.warn('photo: no line drawing', (e as Error)?.message ?? e); return null; }
}

/** the image with the label burned into a band along its foot, as a JPEG */
async function withLabel(src: string): Promise<Blob> {
  const img = new Image();
  img.src = src;
  await img.decode();
  const w = img.naturalWidth, h = img.naturalHeight, band = Math.max(26, Math.round(h * 0.045));
  const c = document.createElement('canvas');
  c.width = w; c.height = h + band;
  const g = c.getContext('2d')!;
  g.drawImage(img, 0, 0, w, h);
  g.fillStyle = '#21121f';
  g.fillRect(0, h, w, band);
  let size = Math.round(band * 0.42);
  const font = (s: number) => `${s}px "IBM Plex Mono", ui-monospace, monospace`;
  g.font = font(size);
  while (size > 8 && g.measureText(PHOTO_LABEL).width > w - band) { size--; g.font = font(size); }
  g.fillStyle = '#f9f6f2';
  g.textBaseline = 'middle';
  g.fillText(PHOTO_LABEL, Math.round(band * 0.5), h + band / 2);
  return await new Promise<Blob>((ok, no) => c.toBlob((b) => (b ? ok(b) : no(new Error('encode'))), 'image/jpeg', 0.92));
}

/** adds the card, the button on the view and the viewer; safe to call twice (the second call does nothing) */
export function mountPhoto(app: Host): HTMLElement | null {
  if (document.getElementById('photoCard')) return document.getElementById('photoCard');
  const stage = document.querySelector('.stage') as HTMLElement | null;
  if (!stage) return null;
  if (!document.getElementById('photoStyle')) {
    const st = document.createElement('style');
    st.id = 'photoStyle'; st.textContent = CSS;
    document.head.append(st);
  }

  // --- the card: options, the button, recent results -----------------------------------------------------------------------
  const card = document.createElement('section');
  card.className = 'card'; card.id = 'photoCard';
  card.innerHTML = `<h3>Make it a photo</h3>
    <p>Frame a view, then press the button. Google Gemini turns that exact view into a photographic image, shown against the model view.</p>
    <div class="ph-row" role="group" aria-label="Quality"><span class="ph-seg" id="photoQuality"><button type="button" data-q="fast" aria-pressed="true" title="Nano Banana 2.1: quicker">Fast</button><button type="button" data-q="best" aria-pressed="false" title="Nano Banana Pro: slower, more detail">Best</button></span></div>
    <p class="small" id="photoQNote"></p>
    <div class="ph-opts">
      <label>Light <select id="photoTime">${TIMES.map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
      <label>Season <select id="photoSeason">${SEASONS.map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
      <label class="wide">Setting <input type="text" id="photoSetting" maxlength="${SETTING_MAX}" placeholder="optional, e.g. coastal hillside, late summer" autocomplete="off" /></label>
    </div>
    <div class="ph-row"><button class="pill solid" id="photoGoCard" type="button">${CAMERA} <span>Make it a photo</span></button></div>
    <p class="small" id="photoMsg" role="status" aria-live="polite"></p>
    <div id="photoRecent" aria-label="Recent photos (this tab only)"></div>
    <p class="small">${esc(PHOTO_LABEL)} The building can come back drawn differently from the model: check it against the view. The view goes to Google to make the photo; the lab keeps nothing, and recent photos stay in this tab.</p>`;
  const $ = <T extends HTMLElement>(sel: string, root: ParentNode = card) => root.querySelector(sel) as T;
  const stills = document.getElementById('trace')?.closest('section');
  if (stills) stills.after(card); else (document.getElementById('extra') ?? document.getElementById('panel'))?.append(card);

  // --- the button on the view ---------------------------------------------------------------------------------------------
  const go = document.createElement('button');
  go.className = 'pill solid ph-go'; go.id = 'photoGo'; go.type = 'button';
  go.innerHTML = `${CAMERA}<span>Make it a photo</span><small id="photoPrice"></small>`;
  go.title = 'Turn this view into a photographic image with Google Gemini';
  stage.append(go);

  // --- the viewer, over the 3D view ---------------------------------------------------------------------------------------
  const view = document.createElement('div');
  view.className = 'ph-view'; view.id = 'photoView'; view.hidden = true;
  view.setAttribute('role', 'dialog'); view.setAttribute('aria-modal', 'false'); view.setAttribute('aria-label', 'Photo from the model view');
  view.innerHTML = `<div class="ph-frame" id="photoFrame">
      <img class="ph-before" alt="The model view, as captured" />
      <img class="ph-after" alt="Photographic image generated from the model view by Google Gemini" />
      <div class="ph-divider" aria-hidden="true"></div>
      <span class="ph-tag l">Model view</span><span class="ph-tag r">Google Gemini</span>
      <input type="range" id="photoSlide" min="0" max="100" value="50" step="1" aria-label="Compare: model view on the left, the photo on the right" /><span class="ph-focus"></span>
      <p class="ph-stamp">${esc(PHOTO_LABEL)}</p>
      <div class="ph-wait" hidden><div class="ph-chip"><span class="ph-dot" aria-hidden="true"></span><b>Google Gemini is making the photo</b><span class="mono" id="photoClock">0 s</span><button class="pill" id="photoStop" type="button">Cancel</button></div></div>
      <div class="ph-err" hidden role="alert"><h4>No photo this time</h4><p id="photoErr"></p><div class="ph-row"><button class="pill solid" id="photoRetry" type="button">Try again<small id="photoRetryPrice"></small></button><button class="pill" id="photoErrClose" type="button">Back to the model</button></div></div>
    </div>
    <p class="ph-label">${esc(PHOTO_LABEL)}</p>
    <div class="ph-bar"><span class="ph-meta" id="photoMeta"></span><button class="pill solid" id="photoSave" type="button">Download</button><button class="pill" id="photoClose" type="button">Back to the model</button></div>`;
  stage.append(view);
  const frame = $<HTMLElement>('#photoFrame', view), before = $<HTMLImageElement>('.ph-before', view), after = $<HTMLImageElement>('.ph-after', view);
  const divider = $<HTMLElement>('.ph-divider', view), slide = $<HTMLInputElement>('#photoSlide', view), wait = $<HTMLElement>('.ph-wait', view);
  const errBox = $<HTMLElement>('.ph-err', view), stamp = $<HTMLElement>('.ph-stamp', view), tags = [...view.querySelectorAll<HTMLElement>('.ph-tag')];
  const label = $<HTMLElement>('.ph-label', view), bar = $<HTMLElement>('.ph-bar', view);

  // --- state ----------------------------------------------------------------------------------------------------------------
  let quality: Quality = 'fast', timeTouched = false, recent: Result[] = [], shown: Result | null = null;
  let busy: { ac: AbortController; t0: number; tick: number } | null = null, pausedBefore: boolean | null = null, opener: HTMLElement | null = null;
  const time = $<HTMLSelectElement>('#photoTime'), season = $<HTMLSelectElement>('#photoSeason'), setting = $<HTMLInputElement>('#photoSetting');
  const msg = $<HTMLElement>('#photoMsg'), goCard = $<HTMLButtonElement>('#photoGoCard');
  const sun = document.getElementById('suntime') as HTMLInputElement | null;
  const followSun = () => { if (!timeTouched && sun) time.value = timeFromSun(Number(sun.value)); };
  followSun();
  requestAnimationFrame(followSun);
  sun?.addEventListener('input', followSun);
  time.addEventListener('change', () => { timeTouched = true; });
  for (const b of card.querySelectorAll<HTMLButtonElement>('#photoQuality button')) {
    b.addEventListener('click', () => {
      quality = b.dataset.q as Quality;
      for (const o of card.querySelectorAll<HTMLButtonElement>('#photoQuality button')) o.setAttribute('aria-pressed', String(o === b));
      price();
    });
  }
  const say = (text: string, bad = false) => { msg.textContent = text; msg.classList.toggle('bad', bad); };
  // the price is on show before anything is spent: on the card, on the button and in its title
  const est = { ...ESTIMATES };
  const price = () => {
    const e = est[quality];
    $('#photoQNote').textContent = `${quality === 'best' ? 'Slower, more detail' : 'Quicker'} · ${e.usd == null ? e.text : `about US$${e.usd.toFixed(2)} a photo, Google’s price`}`;
    $('#photoQNote').title = e.text;
    (document.getElementById('photoPrice') as HTMLElement).textContent = priceShort(e);
    (document.getElementById('photoRetryPrice') as HTMLElement).textContent = priceShort(e);
    go.title = goCard.title = `Turn this view into a photographic image with Google Gemini: ${e.text}`;
  };
  price();
  // the server's own status (a free call): its estimate wins, and a copy of the lab with no key says so before anyone presses
  fetch('/api/render').then((r) => (r.ok ? r.json() : null)).then((s) => {
    if (!s || s.type !== 'assembl.planstudio.render.status') return;
    for (const q of ['fast', 'best'] as Quality[]) if (s.estimate?.[q]?.text) est[q] = { usd: s.estimate[q].usd ?? null, text: String(s.estimate[q].text) };
    price();
    if (s.configured === false) say('Photos are not switched on in this copy of the lab (it has no Google Gemini key).');
  }).catch(() => void 0);

  // fit the frame to the viewer at the image's shape
  const fit = () => {
    if (view.hidden) return;
    const r = ratioValue(shown?.ratio ?? frame.dataset.ratio ?? '3:2');
    // label and bar keep their space in every state (they are hidden with visibility), so the frame does not jump
    const pad = 28, cw = view.clientWidth - pad, ch = view.clientHeight - pad - label.offsetHeight - bar.offsetHeight - 16;
    let w = Math.max(120, cw), h = w / r;
    if (h > ch) { h = Math.max(90, ch); w = h * r; }
    frame.style.width = `${Math.floor(w)}px`; frame.style.height = `${Math.floor(h)}px`;
  };
  new ResizeObserver(fit).observe(view);
  const setSplit = (v: number) => { after.style.clipPath = `inset(0 0 0 ${v}%)`; divider.style.left = `${v}%`; };
  slide.addEventListener('input', () => setSplit(Number(slide.value)));

  const open = (from: HTMLElement | null) => {
    if (view.hidden) { opener = from; pausedBefore = app.paused; app.paused = true; }
    view.hidden = false;
    if (innerWidth < 900) stage.scrollIntoView({ block: 'start', behavior: 'smooth' });
    requestAnimationFrame(fit);
  };
  const close = () => {
    if (busy) busy.ac.abort();
    view.hidden = true;
    if (pausedBefore !== null) { app.paused = pausedBefore; pausedBefore = null; }
    opener?.focus?.();
  };
  /** the viewer in one of its three states: waiting (the captured view under a scan), a result, or an error over the view */
  const state = (s: 'wait' | 'result' | 'error') => {
    wait.hidden = s !== 'wait';
    errBox.hidden = s !== 'error';
    const done = s === 'result';
    after.style.opacity = done ? '1' : '0';
    divider.hidden = !done; slide.hidden = !done; stamp.hidden = !done;
    for (const t of tags) t.hidden = !done;
    for (const el of [label, $<HTMLElement>('#photoSave', view), $<HTMLElement>('#photoMeta', view)]) el.style.visibility = done ? '' : 'hidden';
    $<HTMLElement>('#photoClose', view).style.visibility = s === 'error' ? 'hidden' : '';   // the error box has its own way back
    requestAnimationFrame(fit);
  };
  const show = (r: Result) => {
    shown = r;
    before.src = r.before; after.src = r.after;
    slide.value = '50'; setSplit(50);
    $('#photoMeta', view).textContent = `${qualityName(r.quality)} · ${timeName(r.time)}${r.season ? ' · ' + r.season : ''} · ${r.model} · ${seconds(r.tookMs)} · ${r.ratio}`;
    state('result');
    open(opener);
    $<HTMLButtonElement>('#photoClose', view).focus();
  };
  const drawRecent = () => {
    const box = $<HTMLElement>('#photoRecent');
    box.innerHTML = recent.map((r, i) => `<button type="button" data-i="${i}" title="${esc(`${qualityName(r.quality)}, ${timeName(r.time)}, ${new Date(r.at).toLocaleTimeString('en-NZ', { hour: 'numeric', minute: '2-digit' })}`)}"><img src="${r.after}" alt="Recent photo ${i + 1}" /><span>${esc(qualityName(r.quality))}</span></button>`).join('');
    for (const b of box.querySelectorAll<HTMLButtonElement>('button')) b.addEventListener('click', () => { opener = b; show(recent[Number(b.dataset.i)]); });
  };

  // --- make one ---------------------------------------------------------------------------------------------------------------
  let lastShot: ReturnType<typeof captureView> | null = null, drawing = false;
  const make = async (from: HTMLElement, again = false) => {
    if (busy || drawing) return;
    let shot = again ? lastShot : null;
    if (!shot) {
      try { shot = captureView(app); } catch (e) {
        console.warn('photo: could not read the view', (e as Error)?.message ?? e);
        say('Could not read the 3D view, so nothing was sent. Reload the page and try again.', true);
        app.log('Could not read the view for a photo; nothing was sent.');
        return;
      }
    }
    if (!again || !shot.line) { drawing = true; try { shot.line = await lineFor(shot); } finally { drawing = false; } }
    lastShot = shot;
    const t = time.value as Time, s = season.value as Season, set = setting.value;
    opener = from;
    before.src = shot.url; after.removeAttribute('src'); frame.dataset.ratio = shot.ratio; shown = null;
    state('wait'); open(from);
    const ac = new AbortController(), t0 = performance.now();
    const clock = () => { $('#photoClock', view).textContent = seconds(performance.now() - t0).replace(/\.\d/, ''); goCard.querySelector('span')!.textContent = `Making… ${seconds(performance.now() - t0).replace(/\.\d/, '')}`; };
    busy = { ac, t0, tick: window.setInterval(clock, 500) };
    clock();
    go.disabled = true; goCard.disabled = true;
    say(`Sent to Google Gemini (${qualityName(quality).toLowerCase()}${shot.trimmed > 0.005 ? `, framed to ${shot.ratio}` : ''}).`);
    app.log('Google Gemini is making a photo of this view…');
    let status = 0, body: unknown = null;
    try {
      const res = await fetch('/api/render', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(requestBody(shot.url, quality, t, s, set, shot.line)), signal: ac.signal });
      status = res.status;
      body = await res.json().catch(() => null);
      const b = body as { image?: string; model?: string; took_ms?: number; prompt_revision?: string } | null;
      if (!res.ok || !b?.image || !/^data:image\/(png|jpeg|webp);base64,/.test(b.image)) throw new Error('failed');
      const r: Result = { before: shot.url, after: b.image, ratio: shot.ratio, quality, time: t, season: s, setting: set, model: String(b.model ?? ''), tookMs: Number(b.took_ms ?? performance.now() - t0), prompt: String(b.prompt_revision ?? ''), at: Date.now() };
      await new Promise<void>((ok) => { const im = new Image(); im.onload = im.onerror = () => ok(); im.src = r.after; });
      recent = keepRecent(recent, r);
      drawRecent();
      show(r);
      say(`Photo made in ${seconds(r.tookMs)}. ${PHOTO_LABEL}`);
      app.log(`Photo made by Google Gemini in ${seconds(r.tookMs)}. Not a photograph, and not a checked drawing.`);
    } catch (e) {
      const stopped = (e as Error)?.name === 'AbortError';
      const text = stopped ? 'Stopped. Nothing is shown.' : errorText(status, body);
      say(text, !stopped);
      app.log(stopped ? 'Photo stopped.' : `No photo: ${text}`);
      if (stopped || view.hidden) close();
      else { $('#photoErr', view).textContent = text; state('error'); $<HTMLButtonElement>('#photoRetry', view).focus(); }
    } finally {
      clearInterval(busy?.tick); busy = null;
      go.disabled = false; goCard.disabled = false;
      goCard.querySelector('span')!.textContent = 'Make it a photo';
    }
  };
  go.addEventListener('click', () => void make(go));
  goCard.addEventListener('click', () => void make(goCard));
  $<HTMLButtonElement>('#photoStop', view).addEventListener('click', () => busy?.ac.abort());
  $<HTMLButtonElement>('#photoRetry', view).addEventListener('click', () => void make(opener ?? go, true));
  $<HTMLButtonElement>('#photoErrClose', view).addEventListener('click', close);
  $<HTMLButtonElement>('#photoClose', view).addEventListener('click', close);
  view.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } });
  $<HTMLButtonElement>('#photoSave', view).addEventListener('click', async () => {
    if (!shown) return;
    if (!app.save) return app.log('Downloads aren’t available in this view.');
    try {
      const blob = await withLabel(shown.after);
      await app.save(fileName(app.project.key, shown.quality, new Date(shown.at)), blob);
      app.log(`Photo (${(blob.size / 1e6).toFixed(1)} MB JPEG) offered for download, with the label along its foot.`);
    } catch { app.log('Couldn’t prepare that download.'); }
  });
  return card;
}
