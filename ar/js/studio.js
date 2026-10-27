// assembl AR studio: pick a kind, shape it, see it in 3D, then share a code or the files.
import { createStage } from './stage.js';
import { buildText, buildLogo, buildFrame, buildCar, buildBike, buildUpload, logoFromSVGText, packLogoForLink, imageToCanvas,
  fmtSize, sizeOf, KIND_LABEL, FRAME_SIZES } from './builders.js';
import { KINDS, normalise, shareURL, decodeHash, encodeHash, CARS, CAR_PAINTS, STUDIO } from './codec.js';
import { SWATCHES, FINISHES } from './palette.js';
import { cardSVG, svgToPNG, planQR, density, STYLES, qrSVG } from './qr.js';
import { createPlacer } from './place.js';
import { deviceSentence } from './ar.js';
import { download, fileSize, slug } from './exporters.js';
import { injectCSS, esc } from './ui.js';

injectCSS();
const $ = id => document.getElementById(id);
const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)$|\.local$/.test(location.hostname);
const BIKE_FRAMES = [['492B3E', 'Plum'], ['240B21', 'Deep plum'], ['654A4E', 'Muted plum'], ['916A70', 'Dusty rose'], ['F5F1F2', 'Chalk'], ['353B4D', 'Print Lab black']];
const BIKE_ACCENTS = [['F5F1F2', 'Chalk'], ['FFFDFB', 'Paper'], ['916A70', 'Dusty rose'], ['654A4E', 'Muted plum'], ['D9A646', 'Print Lab gold']];
const wheelRange = wb => [Math.ceil(wb / 2.05 / 2) * 2, Math.floor(wb / 1.65 / 2) * 2];

// ---------------------------------------------------------------- state
const S = {
  type: 'text',
  text: { ...KINDS.text.def },
  logo: { ...KINDS.logo.def, name: '', link: null, items: null, strokes: 0 },
  frame: { canvas: null, name: '', size: 'a3', colour: 'ink', mat: 1, mount: 'wall' },
  lib: { item: 'ute', car: { ...KINDS.car.def }, bike: { ...KINDS.bike.def } },
  glb: { buffer: null, name: '', fit: 'auto' },
  qr: { style: 'assembly', centre: 'thumb' }
};
const get = path => path.split('.').reduce((o, k) => (o == null ? o : o[k]), S);
const set = (path, v) => { const ks = path.split('.'), last = ks.pop(); ks.reduce((o, k) => o[k], S)[last] = v; };

// open a shared object for editing: /ar/#k=text&...
{
  const { spec } = decodeHash(location.hash);
  if (spec) {
    if (spec.k === 'text') { S.type = 'text'; S.text = spec; }
    else if (spec.k === 'logo') { S.type = 'logo'; Object.assign(S.logo, spec, { name: 'Logo from a link' }); }
    else if (spec.k === 'car') { S.type = 'lib'; S.lib.item = spec.m; S.lib.car = spec; }
    else if (spec.k === 'bike') { S.type = 'lib'; S.lib.item = 'bike'; S.lib.bike = spec; }
  }
}

// ---------------------------------------------------------------- control markup
const H = {
  field: (label, inner, o = {}) => `<div class="field"${o.id ? ` id="${o.id}"` : ''}${o.hidden ? ' hidden' : ''}><div class="label"><span>${label}</span>${o.out ? `<output data-out="${o.out}"></output>` : ''}</div>${inner}${o.hint ? `<p class="hint">${o.hint}</p>` : ''}</div>`,
  seg: (path, opts, label) => `<div class="seg" role="radiogroup" aria-label="${esc(label)}">${opts.map(([v, t, sub]) => `<label><input type="radio" name="${path}" value="${v}" data-bind="${path}"><span>${t}${sub ? `<small>${sub}</small>` : ''}</span></label>`).join('')}</div>`,
  swatches: (path, list, label, own) => `<div class="swatches" role="radiogroup" aria-label="${esc(label)}">${own ? `<label class="sw own" title="${own}"><input type="radio" name="${path}" value="own" data-bind="${path}" aria-label="${own}"><span></span></label>` : ''}${list.map(s => `<label class="sw" title="${esc(s.name)}"><input type="radio" name="${path}" value="${s.id}" data-bind="${path}" aria-label="${esc(s.name)}"><span style="--c:${s.hex}"></span></label>`).join('')}</div>`,
  range: (path, min, max, step, label) => `<input type="range" min="${min}" max="${max}" step="${step}" data-bind="${path}" aria-label="${esc(label)}">`,
  toggle: (path, label, sub) => `<label class="switch"><input type="checkbox" data-bind="${path}"><span class="track" aria-hidden="true"></span><span class="tl"><b>${label}</b>${sub ? `<small>${sub}</small>` : ''}</span></label>`,
  drop: (id, accept, title, sub) => `<label class="drop" id="${id}Drop"><input type="file" id="${id}" accept="${accept}"><span class="ico" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V5M7.5 9.5 12 5l4.5 4.5M5 19h14"/></svg></span><span><b>${title}</b><small id="${id}Name">${sub}</small></span></label>`
};
const sw = list => list.map(([hex, name]) => ({ id: hex, name, hex: '#' + hex }));
const CAR_ICON = `<svg viewBox="0 0 64 30" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 21v-5l5-2 7-7h22l9 7 10 2 3 5h-4"/><circle cx="16" cy="22" r="4.5"/><circle cx="48" cy="22" r="4.5"/><path d="M20.5 22h23M4 21h7"/></svg>`;
const BIKE_ICON = `<svg viewBox="0 0 64 30" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><circle cx="14" cy="20" r="8"/><circle cx="50" cy="20" r="8"/><path d="M14 20l12-1 9-12M26 19l-4-10M35 7l15 13M31 9h8M20 9h5"/></svg>`;

const PANELS = {
  text: () =>
    H.field('Words', `<textarea rows="2" maxlength="48" data-bind="text.t" spellcheck="false" aria-label="Words"></textarea>`, { hint: 'Up to two lines. Macrons work: ā ē ī ō ū.' }) +
    H.field('Typeface', H.seg('text.f', [['sans', 'Instrument'], ['medium', 'Medium'], ['mono', 'Plex Mono']], 'Typeface')) +
    H.field('Letter height', H.seg('text.h', [[60, 'Desk', '6 cm'], [150, 'Shelf', '15 cm'], [450, 'Room', '45 cm']], 'Letter height')) +
    H.field('Depth', H.range('text.d', 8, 80, 1, 'Depth'), { out: 'text.d' }) +
    H.field('Colour', H.swatches('text.c', SWATCHES, 'Colour')) +
    H.field('Finish', H.seg('text.m', FINISHES.map(f => [f.id, f.name]), 'Finish')) +
    H.toggle('text.b', 'Base', 'A rounded plinth under the letters'),
  logo: () =>
    H.field('Your SVG', H.drop('logoFile', '.svg,image/svg+xml', 'Choose an SVG', 'or drop it here') + `<button type="button" class="linkbtn" data-act="sampleLogo">Use the sample mark</button>`, { hint: 'Filled shapes work best. It stays in this browser; the code carries its outline.' }) +
    `<p class="status" id="logoStatus" hidden></p>` +
    H.field('Size', H.seg('logo.w', [[160, 'Desk', '16 cm'], [400, 'Shelf', '40 cm'], [1000, 'Wall', '1 m']], 'Size')) +
    H.field('Depth', H.range('logo.d', 2, 40, 1, 'Depth'), { out: 'logo.d' }) +
    H.field('Edges', H.seg('logo.v', [[0, 'Sharp'], [1, 'Soft'], [2, 'Round'], [3, 'Full']], 'Edges')) +
    H.field('Colour', H.swatches('logo.c', SWATCHES, 'Colour', 'The logo’s own colours')) +
    H.field('Finish', H.seg('logo.m', FINISHES.map(f => [f.id, f.name]), 'Finish')) +
    H.toggle('logo.b', 'Base', 'Stand it on a rounded plinth'),
  frame: () =>
    H.field('Your photo or poster', H.drop('frameFile', 'image/jpeg,image/png,image/webp,image/gif', 'Choose an image', 'or drop it here') + `<button type="button" class="linkbtn" data-act="sampleFrame">Use the sample picture</button>`, { hint: 'JPEG, PNG or WebP. It stays on this device.' }) +
    H.field('Picture size', H.seg('frame.size', FRAME_SIZES.map(s => [s.id, s.name]), 'Picture size')) +
    H.field('Frame colour', H.swatches('frame.colour', SWATCHES, 'Frame colour')) +
    H.toggle('frame.mat', 'Mat board', 'A paper border inside the frame') +
    H.field('Put it', H.seg('frame.mount', [['wall', 'On a wall'], ['stand', 'On a table']], 'Where it goes')) +
    `<p class="honest"><b>No code for photos yet.</b> A picture is too big to fit inside a link. You can view it here on a phone, or download the files. A shareable code needs hosting, which is the next step.</p>`,
  lib: () =>
    H.field('Pick a model', `<div class="tiles" role="radiogroup" aria-label="Library model">${[...CARS.map(c => [c.id, c.name, CAR_ICON]), ['bike', 'Downhill bike', BIKE_ICON]].map(([id, name, ico]) =>
      `<label class="tile"><input type="radio" name="lib.item" value="${id}" data-bind="lib.item"><span><i class="tico" id="thumb-${id}" aria-hidden="true">${ico}</i>${name}</span></label>`).join('')}</div>`, { hint: 'The cars are assembl’s own Blender models. The bike is the assembly Print Lab’s parametric model.' }) +
    `<div id="carOpts">` +
    H.field('Scale', H.seg('lib.car.s', [['table', 'Table model', '1:18'], ['real', 'Real size', '1:1']], 'Scale')) +
    H.field('Paint', H.swatches('lib.car.p', CAR_PAINTS.map(p => ({ ...p, hex: p.id === 'silver' ? '#C5C7CB' : p.hex })), 'Paint')) +
    `</div><div id="bikeOpts" hidden>` +
    H.field('Scale', H.seg('lib.bike.s', [['model', 'Display model', '1:10'], ['real', 'Real size', '1:1']], 'Scale')) +
    H.field('Wheelbase', H.range('lib.bike.wb', 110, 170, 5, 'Wheelbase'), { out: 'lib.bike.wb', hint: 'Axle to axle on the 1:10 model.' }) +
    H.field('Wheel size', H.range('lib.bike.wd', 54, 102, 2, 'Wheel size'), { out: 'lib.bike.wd' }) +
    H.field('Shock spring', H.range('lib.bike.su', 160, 220, 10, 'Shock spring'), { out: 'lib.bike.su' }) +
    H.field('Frame colour', H.swatches('lib.bike.fr', sw(BIKE_FRAMES), 'Frame colour')) +
    H.field('Fork and cradle colour', H.swatches('lib.bike.ac', sw(BIKE_ACCENTS), 'Fork and cradle colour')) +
    H.toggle('lib.bike.b', 'Display plinth', 'A flat base with two wheel cradles') +
    `</div>`,
  glb: () =>
    H.field('Your GLB', H.drop('glbFile', '.glb,model/gltf-binary', 'Choose a .glb file', 'or drop it here'), { hint: 'glTF binary. Files with Draco, meshopt or KTX2 compression can’t be opened yet.' }) +
    H.field('Size', H.seg('glb.fit', [['auto', 'As made'], ['desk', 'Fit to 30 cm']], 'Size'), { hint: 'glTF works in metres. “As made” keeps that, unless the file is clearly in other units.' }) +
    `<p class="status" id="glbStatus" hidden></p>` +
    `<p class="honest"><b>No code for your own files yet.</b> They stay on this device. View them here on a phone, or take the USDZ and GLB with you. A shareable code needs hosting, which is the next step.</p>`
};
const OUTS = {
  'text.d': v => v + '% of the height', 'logo.d': v => v + '% of the size',
  'lib.bike.wb': v => v + ' mm', 'lib.bike.wd': v => v + ' mm', 'lib.bike.su': v => v + ' mm travel'
};

// ---------------------------------------------------------------- stage and placer
const stage = createStage($('stage'), { label: 'Your object in 3D. Drag to turn it, scroll or pinch to zoom.' });
let result = null, buildId = 0, animateNext = true, lastType = null;
const viewBtn = $('viewBtn'), viewLbl = viewBtn.querySelector('.lbl'), viewBar = viewBtn.querySelector('.bar');
const placer = createPlacer({
  source: () => result && {
    key: result.key, object: result.object, title: result.title, mount: result.mount, fixedScale: result.fixedScale,
    sceneViewer: result.sceneViewer ? new URL(result.sceneViewer, location.href).href : null,
    qrURL: result.shareable && result.shareURL && result.qrOK ? result.shareURL : null,
    snapshotOptions: { unitsPerMetre: 1, scale: 'real', maxTriangles: 300000 }
  },
  onState(state, info) {
    viewBtn.disabled = state === 'busy';
    if (state === 'busy') { viewLbl.textContent = info.label; viewBar.style.width = (info.step / info.of * 100) + '%'; }
    else { viewLbl.textContent = 'View in your space'; viewBar.style.width = '0'; }
    if (state === 'error') sheet(`<h2 id="sheetTitle">That didn’t work</h2><p>${esc(info.message)}</p>${filesRow()}`);
  },
  onNoAR: info => {
    if (info.qrURL) {
      sheet(`<h2 id="sheetTitle">Scan this with your phone</h2><p>Open the camera on an iPhone, iPad or Android phone and point it at the code. ${placer.mode === 'sceneviewer' ? 'This browser can’t do web AR, but the link opens in one that can.' : ''}</p><div class="qrbox">${qrSVG(info.qrURL, { style: S.qr.style, size: 320, centre: { kind: 'cube' } })}</div>${LOCAL ? `<p class="local-note">This code points at <b>${esc(location.host)}</b>, which a phone can’t reach. It works once the page is on assembl.co.nz.</p>` : ''}`);
    } else {
      const why = result && result.kind === 'logo' ? 'This logo is too detailed to fit in a code.' : 'This one lives only in this browser, so it has no code yet.';
      sheet(`<h2 id="sheetTitle">${placer.mode === 'sceneviewer' ? 'This browser can’t place 3D here' : 'Take it to your phone'}</h2><p>${why} Download the USDZ for an iPhone or iPad, or the GLB for Android, and open it there. A shareable code needs hosting, which is the next step.</p>${filesRow()}`);
    }
  }
});
placer.ready.then(s => { renderDevice(); });

// ---------------------------------------------------------------- UI wiring
const form = $('controls');
function renderPanel() {
  form.innerHTML = PANELS[S.type]();
  form.setAttribute('aria-labelledby', 'tab-' + S.type);
  for (const b of document.querySelectorAll('.type')) {
    const on = b.dataset.type === S.type;
    b.setAttribute('aria-selected', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1;
  }
  syncInputs();
  wireFiles();
  if (S.type === 'lib') renderLibThumbs();
}
function syncInputs() {
  for (const el of form.querySelectorAll('[data-bind]')) {
    const v = get(el.dataset.bind);
    if (el.type === 'radio') el.checked = String(v) === el.value;
    else if (el.type === 'checkbox') el.checked = !!Number(v);
    else el.value = v ?? '';
  }
  for (const o of form.querySelectorAll('[data-out]')) o.textContent = OUTS[o.dataset.out] ? OUTS[o.dataset.out](get(o.dataset.out)) : get(o.dataset.out);
  const carOpts = $('carOpts'), bikeOpts = $('bikeOpts');
  if (carOpts) { carOpts.hidden = S.lib.item === 'bike'; bikeOpts.hidden = S.lib.item !== 'bike'; }
  const wd = form.querySelector('[data-bind="lib.bike.wd"]');
  if (wd) { const [lo, hi] = wheelRange(S.lib.bike.wb); wd.min = lo; wd.max = hi; S.lib.bike.wd = Math.min(hi, Math.max(lo, S.lib.bike.wd)); wd.value = S.lib.bike.wd; }
}
form.addEventListener('input', e => {
  const el = e.target.closest('[data-bind]'); if (!el) return;
  const path = el.dataset.bind, cur = get(path);
  let v = el.type === 'checkbox' ? (el.checked ? 1 : 0) : el.value;
  if (el.type === 'radio' && !el.checked) return;
  if (typeof cur === 'number' && el.type !== 'checkbox') v = Number(v);
  set(path, v);
  if (path === 'lib.item' || path === 'text.f') animateNext = true;
  if (path === 'lib.bike.wb' || path === 'lib.item') syncInputs();
  const o = form.querySelector(`[data-out="${path}"]`); if (o) o.textContent = OUTS[path] ? OUTS[path](v) : v;
  schedule(el.type === 'range' || el.tagName === 'TEXTAREA' ? 140 : 0);
});
form.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  if (b.dataset.act === 'sampleLogo') loadSampleLogo().then(() => { animateNext = true; schedule(0); });
  if (b.dataset.act === 'sampleFrame') loadSampleFrame().then(() => { animateNext = true; schedule(0); });
});
document.querySelector('.types').addEventListener('click', e => {
  const b = e.target.closest('.type'); if (!b || b.dataset.type === S.type) return;
  S.type = b.dataset.type; animateNext = true; renderPanel(); schedule(0);
});
document.querySelector('.types').addEventListener('keydown', e => {
  if (!['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
  const tabs = [...document.querySelectorAll('.type')], i = tabs.findIndex(t => t.dataset.type === S.type);
  const j = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : (i + (e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
  e.preventDefault(); tabs[j].focus(); tabs[j].click();
});

function wireFiles() {
  const hook = (id, fn) => {
    const input = $(id); if (!input) return;
    const drop = $(id + 'Drop');
    input.addEventListener('change', () => { if (input.files[0]) fn(input.files[0]); });
    drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('over'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('over'));
    drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('over'); const f = e.dataTransfer.files[0]; if (f) fn(f); });
  };
  hook('logoFile', async f => {
    try {
      if (f.size > 3e6) throw new Error('That SVG is over 3 MB. Try a simpler export.');
      setLogo(await f.text(), f.name); animateNext = true; schedule(0);
    } catch (e) { showLogoStatus(esc(e.message), true); }
  });
  hook('frameFile', async f => {
    try {
      if (!/^image\//.test(f.type)) throw new Error('That isn’t an image file.');
      const img = await loadImage(URL.createObjectURL(f));
      S.frame.canvas = imageToCanvas(img, 2048); S.frame.name = f.name.replace(/\.[a-z0-9]+$/i, '');
      animateNext = true; schedule(0);
    } catch (e) { showMsg(e.message); }
  });
  hook('glbFile', async f => {
    if (!/\.glb$/i.test(f.name)) { showGLBStatus('Choose a .glb file (binary glTF). For .gltf with separate files, pack it as a GLB first.', true); return; }
    if (f.size > 60e6) { showGLBStatus('That file is over 60 MB, which is too big to place on a phone.', true); return; }
    S.glb.buffer = await f.arrayBuffer(); S.glb.name = f.name.replace(/\.glb$/i, '');
    animateNext = true; schedule(0);
  });
  const nm = { logoFileName: S.logo.name, frameFileName: S.frame.name, glbFileName: S.glb.name };
  for (const k in nm) if ($(k) && nm[k]) $(k).textContent = nm[k];
  if (S.type === 'logo' && S.logo.link) showLogoStatus(logoStatusText(), !S.logo.link.fits);
}
function loadImage(src) {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('We couldn’t read that image.')); i.src = src; });
}
function setLogo(text, name) {
  const { items, strokes } = logoFromSVGText(text);
  const pack = packLogoForLink(items);
  S.logo.s = pack.s; S.logo.name = name; S.logo.strokes = strokes;
  const url = shareURL({ ...S.logo, k: 'logo' });
  S.logo.link = { length: url.length, fits: !!planQR(url), grid: pack.grid };
}
function logoStatusText() {
  const L = S.logo.link; if (!L) return '';
  const extra = S.logo.strokes ? ` ${S.logo.strokes} stroke-only path${S.logo.strokes === 1 ? ' was' : 's were'} left out.` : '';
  return L.fits ? `<b>Fits in a code.</b> The outline packs into a ${L.length.toLocaleString('en-NZ')}-character link.${extra}`
    : `<b>Too detailed for a code.</b> Its link would be ${L.length.toLocaleString('en-NZ')} characters, more than a phone can scan reliably. View it here on a phone or download the files instead.${extra}`;
}
function showLogoStatus(html, warn) { const p = $('logoStatus'); if (!p) return; p.innerHTML = html; p.hidden = !html; p.classList.toggle('warn', !!warn); }
function showGLBStatus(html, warn) { const p = $('glbStatus'); if (!p) return; p.innerHTML = html; p.hidden = !html; p.classList.toggle('warn', !!warn); }
async function loadSampleLogo() {
  const t = await (await fetch(new URL('../samples/sample-mark.svg', import.meta.url))).text();
  setLogo(t, 'Sample mark (three faces of a cube)');
  const n = $('logoFileName'); if (n) n.textContent = S.logo.name;
}
async function loadSampleFrame() {
  const img = await loadImage(new URL('../samples/home-twin.jpg', import.meta.url).href);
  S.frame.canvas = imageToCanvas(img, 2048); S.frame.name = 'Home energy twin';
  const n = $('frameFileName'); if (n) n.textContent = 'Sample: the lab’s home energy twin';
}

// library tiles get real renders of the models, made once
const thumbs = new Map();
let thumbing = false;
async function renderLibThumbs() {
  for (const [id, url] of thumbs) { const el = $('thumb-' + id); if (el) el.innerHTML = `<img alt="" src="${url}">`; }
  if (thumbing || thumbs.size === 6) return;
  thumbing = true;
  try {
    for (const id of [...CARS.map(c => c.id), 'bike']) {
      if (thumbs.has(id)) continue;
      const r = id === 'bike' ? await buildBike({ ...KINDS.bike.def }) : await buildCar({ k: 'car', m: id, s: 'table', p: 'ink' });
      const url = stage.thumbnail(150, 1.6, r.object);
      thumbs.set(id, url);
      const el = $('thumb-' + id); if (el) el.innerHTML = `<img alt="" src="${url}">`;
      await new Promise(res => setTimeout(res, 30));
    }
  } catch (e) { console.warn('library thumbnails', e); }
  thumbing = false;
}

// ---------------------------------------------------------------- build
let timer = null, slowTimer = null;
function schedule(ms) { clearTimeout(timer); timer = setTimeout(rebuild, ms); }
function showMsg(text) { const m = $('stageMsg'); m.hidden = !text; m.firstElementChild.textContent = text || ''; }
async function rebuild() {
  const id = ++buildId, type = S.type;
  clearTimeout(slowTimer); slowTimer = setTimeout(() => { $('stageStatus').textContent = 'Building…'; }, 280);
  try {
    let r;
    if (type === 'text') r = await buildText(S.text);
    else if (type === 'logo') { if (!S.logo.s) await loadSampleLogo(); r = buildLogo(S.logo); r.title = S.logo.name ? S.logo.name.replace(/\.svg$/i, '') : 'Your logo'; }
    else if (type === 'frame') { if (!S.frame.canvas) await loadSampleFrame(); r = buildFrame({ ...S.frame, mat: !!S.frame.mat, name: S.frame.name }); }
    else if (type === 'lib') r = S.lib.item === 'bike' ? await buildBike(S.lib.bike) : await buildCar({ ...S.lib.car, m: S.lib.item });
    else if (type === 'glb') {
      if (!S.glb.buffer) { if (id === buildId) { stage.setObject(null); result = null; showMsg('Choose a .glb file to see it here.'); renderMeta(); updateShare(); } return; }
      r = await buildUpload(S.glb.buffer.slice(0), { fit: S.glb.fit, name: S.glb.name });
      const a = r.authored;
      showGLBStatus(`<b>${esc(S.glb.name)}</b>: made at ${fmtSize(a)}. ${esc(r.note)}.`, false);
    }
    if (id !== buildId) return;
    showMsg('');
    r.size = sizeOf(r.object);
    const anim = animateNext || lastType !== type; animateNext = false; lastType = type;
    stage.setObject(r.object, { animate: anim, keepView: anim ? false : 'refit' });
    r.key = id;
    if (r.shareable) { r.shareURL = shareURL(r.spec); r.qrOK = !!planQR(r.shareURL); }
    result = r;
    if (type === 'logo') showLogoStatus(logoStatusText(), S.logo.link && !S.logo.link.fits);
    renderMeta(); updateShare(); renderDevice();
    // keep the address bar shareable for studio edits of codable objects
    if (r.shareable) history.replaceState(null, '', '#' + encodeHash(r.spec)); else history.replaceState(null, '', location.pathname);
    clearTimeout(prefetchTimer); prefetchTimer = setTimeout(() => placer.prefetch(), 900);
  } catch (e) {
    if (id === buildId) { showMsg(e.message || String(e)); console.warn(e); }
  } finally {
    if (id === buildId) { clearTimeout(slowTimer); $('stageStatus').textContent = ''; }
  }
}
let prefetchTimer = null;

function renderMeta() {
  const r = result;
  $('objTitle').textContent = r ? r.title : 'Nothing yet';
  $('objNote').textContent = r ? `${KIND_LABEL[r.kind]} · ${r.note}` : '';
  const dims = $('dims');
  dims.lastElementChild.textContent = r ? fmtSize(r.size) : '—';
  $('scaleChip').textContent = !r ? '—' : r.fixedScale ? 'Real size in AR' : 'Resizable in AR';
  $('fileNote').textContent = 'Made in this browser when you ask for them.';
}
function renderDevice() {
  const mode = placer.mode, r = result;
  let s = deviceSentence(mode);
  if (r && !r.shareable && mode === 'none') s = 'This computer can’t place 3D in a room, and this one has no code yet. Download the USDZ or GLB to open it on a phone.';
  if (r && r.kind === 'logo' && !r.qrOK && mode === 'none') s = 'This logo is too detailed for a code. Download the USDZ or GLB to open it on a phone.';
  $('deviceNote').innerHTML = `<b>${mode === 'quicklook' ? 'On this iPhone or iPad' : mode === 'webxr' ? 'On this Android phone' : mode === 'sceneviewer' ? 'On this Android browser' : 'On this computer'}:</b> ${esc(s)}`;
}

// ---------------------------------------------------------------- share card
let card = null, shareTimer = null;
function updateShare() { clearTimeout(shareTimer); $('cardHolder').classList.add('busy'); shareTimer = setTimeout(renderShare, 260); }
async function renderShare() {
  const r = result, holder = $('cardHolder'), none = $('noShare'), opts = $('qrOptions');
  holder.classList.remove('busy');
  const off = (html, label) => { holder.innerHTML = ''; holder.hidden = true; none.hidden = false; none.innerHTML = html; opts.hidden = true; $('shareTruth').textContent = label; card = null; };
  if (!r) return off('<h3>Nothing to share yet</h3><p>Choose a file to start.</p>', 'This device');
  if (!r.shareable) return off(`<h3>No code for this one yet</h3><p>${r.kind === 'frame' ? 'A photo is too big to travel inside a link.' : 'Your own file is too big to travel inside a link.'} You can still view it here on a phone, or download the USDZ or GLB below.</p><p>A shareable code needs hosting, which is the next step. <span class="truth proposed">Proposed</span></p>`, 'This device');
  if (!r.qrOK) return off(`<h3>Too detailed for a code</h3><p>This logo’s link would be ${r.shareURL.length.toLocaleString('en-NZ')} characters. That’s more than a phone camera reads reliably.</p><p>Use a simpler SVG, or view it here on a phone and download the files. Hosting would fix this. <span class="truth proposed">Proposed</span></p>`, 'Too big');
  holder.hidden = false; none.hidden = true; opts.hidden = false; $('shareTruth').textContent = 'Works now';
  const id = r.key;
  const thumb = stage.thumbnail(300, 2.15), centreThumb = stage.thumbnail(160, 1);
  const c = await cardSVG({ url: r.shareURL, title: r.title, kind: KIND_LABEL[r.kind], detail: fmtSize(r.size) + (r.fixedScale ? ' · real size' : ''),
    thumb, centreThumb, style: S.qr.style, centre: S.qr.centre, host: (LOCAL ? location.host : 'assembl.co.nz') + '/ar' });
  if (id !== (result && result.key)) return;
  card = { ...c, url: r.shareURL, title: r.title };
  holder.innerHTML = c.svg;
  $('density').textContent = density(c.matrix).text + (c.matrix.centre ? ' · error correction H' : ` · error correction ${c.matrix.ecl}, no centre mark`);
  const a = $('shareLink'); a.href = r.shareURL; a.textContent = r.shareURL;
  $('localNote').hidden = !LOCAL; $('localHost').textContent = location.host;
}
function segInto(id, path, list) {
  const el = $(id);
  el.innerHTML = list.map(([v, t]) => `<label><input type="radio" name="${path}" value="${v}"${get(path) === v ? ' checked' : ''}><span>${t}</span></label>`).join('');
  el.addEventListener('change', e => { set(path, e.target.value); updateShare(); });
}
segInto('styleSeg', 'qr.style', STYLES.map(s => [s.id, s.name]));
segInto('centreSeg', 'qr.centre', [['thumb', 'Your object'], ['cube', 'Cube mark']]);

// ---------------------------------------------------------------- actions
viewBtn.addEventListener('click', () => { stage.finish(); placer.activate(); });
$('dlPNG').addEventListener('click', async () => { if (!card) return; download(await svgToPNG(card.svg, 2), `assembl-ar-${slug(card.title)}.png`); });
$('dlSVG').addEventListener('click', () => { if (!card) return; download(new Blob([card.svg], { type: 'image/svg+xml' }), `assembl-ar-${slug(card.title)}.svg`); });
$('copyLink').addEventListener('click', async e => {
  if (!card) return;
  const b = e.currentTarget, t = b.textContent;
  try { await navigator.clipboard.writeText(card.url); b.textContent = 'Copied'; }
  catch (err) { b.textContent = 'Select the link below'; }
  setTimeout(() => { b.textContent = t; }, 1600);
});
async function downloadFile(which, btn) {
  if (!result) return;
  stage.finish();
  const old = btn.innerHTML; btn.disabled = true; btn.innerHTML = 'Making it…';
  try {
    await new Promise(r => setTimeout(r, 30));
    const { blob, report } = await placer.files(which);
    download(blob, `assembl-ar-${slug(result.title)}.${which}`);
    $('fileNote').textContent = `${which.toUpperCase()} ${fileSize(blob)} · ${report.triangles.toLocaleString('en-NZ')} triangles · ${fmtSize(report.size)}` + (report.dropped.length ? ' · some small parts left out' : '');
  } catch (e) { $('fileNote').textContent = 'Couldn’t make the file: ' + e.message; }
  btn.disabled = false; btn.innerHTML = old;
}
$('dlGLB').addEventListener('click', e => downloadFile('glb', e.currentTarget));
$('dlUSDZ').addEventListener('click', e => downloadFile('usdz', e.currentTarget));
function filesRow() { return `<div class="btn-row"><button class="btn" type="button" data-file="usdz">USDZ <small>iPhone · iPad</small></button><button class="btn" type="button" data-file="glb">GLB <small>Android · web</small></button></div>`; }

const dlg = $('sheet');
function sheet(html) {
  $('sheetBody').innerHTML = html;
  if (!dlg.open) { try { dlg.showModal(); } catch (e) { dlg.setAttribute('open', ''); } }
}
dlg.addEventListener('click', e => {
  if (e.target === dlg || e.target.closest('[data-close]')) dlg.close();
  const f = e.target.closest('[data-file]'); if (f) downloadFile(f.dataset.file, f);
});

// test and debugging hook (read-only)
window.__assemblAR = { get result() { return result; }, get card() { return card; }, stage, placer, state: S, ready: () => new Promise(res => { const t = setInterval(() => { if (result && !$('cardHolder').classList.contains('busy')) { clearInterval(t); res(true); } }, 100); }) };

renderPanel();
schedule(0);
