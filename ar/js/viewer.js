// assembl AR viewer: rebuild the object from the link, show it calmly, and offer the room.
import { createStage } from './stage.js';
import { buildFromSpec, fmtSize, sizeOf, KIND_LABEL } from './builders.js';
import { decodeHash, encodeHash, STUDIO, VIEWER } from './codec.js';
import { qrSVG } from './qr.js';
import { createPlacer } from './place.js';
import { deviceSentence } from './ar.js';
import { download, fileSize, slug } from './exporters.js';
import { injectCSS, esc } from './ui.js';

injectCSS();
const $ = id => document.getElementById(id);
const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)$|\.local$/.test(location.hostname);
let stage = null, result = null, buildId = 0;
const viewBtn = $('viewBtn'), viewLbl = viewBtn.querySelector('.lbl'), viewBar = viewBtn.querySelector('.bar');

const placer = createPlacer({
  source: () => result && { key: result.key, object: result.object, title: result.title, mount: result.mount, fixedScale: result.fixedScale,
    sceneViewer: result.sceneViewer ? new URL(result.sceneViewer, location.href).href : null, qrURL: result.url,
    snapshotOptions: { unitsPerMetre: 1, scale: 'real', maxTriangles: 300000 } },
  onState(state, info) {
    viewBtn.disabled = state === 'busy';
    if (state === 'busy') { viewLbl.textContent = info.label; viewBar.style.width = (info.step / info.of * 100) + '%'; }
    else { viewLbl.textContent = 'View in your space'; viewBar.style.width = '0'; }
    if (state === 'error') sheet(`<h2 id="sheetTitle">That didn’t work</h2><p>${esc(info.message)}</p>`);
  },
  onNoAR() {
    if (placer.mode === 'sceneviewer') sheet(`<h2 id="sheetTitle">This browser can’t place 3D here</h2><p>Try opening this page in Chrome, or download the GLB and open it in an app that supports AR.</p>`);
    else { const q = $('vQR'); q.hidden = false; q.scrollIntoView({ behavior: 'smooth', block: 'center' }); q.animate && q.animate([{ boxShadow: '0 0 0 3px #916A70' }, { boxShadow: '0 0 0 0 #916A70' }], { duration: 900 }); }
  }
});

function sheet(html) {
  const d = $('sheet'); $('sheetBody').innerHTML = html;
  if (!d.open) { try { d.showModal(); } catch (e) { d.setAttribute('open', ''); } }
}
$('sheet').addEventListener('click', e => { if (e.target === $('sheet') || e.target.closest('[data-close]')) $('sheet').close(); });

function empty(title, text) {
  $('vMain').hidden = true; $('vEmpty').hidden = false;
  $('emptyTitle').textContent = title; $('emptyText').textContent = text;
  $('vTitle').textContent = 'assembl AR'; $('vMeta').textContent = '';
  document.querySelector('.v-head').hidden = true;
}

async function load() {
  const { spec, error } = decodeHash(location.hash);
  if (!spec) {
    if (error === 'empty') return empty('Nothing to show yet', 'Scan an assembl AR code, or make your own in the studio.');
    return empty('This link doesn’t hold a model we can rebuild', error === 'damaged' ? 'Part of the link seems to be missing. Ask for the code again, or make your own in the studio.' : 'It may come from a newer version of assembl AR. Make your own in the studio.');
  }
  $('vMain').hidden = false; $('vEmpty').hidden = true; document.querySelector('.v-head').hidden = false;
  if (!stage) {
    try { stage = createStage($('stage'), { label: 'The object in 3D. Drag to turn it.' }); }
    catch (e) { $('stageMsg').hidden = false; $('stageMsg').firstElementChild.textContent = e.message; }
  }
  const id = ++buildId;
  try {
    const r = await buildFromSpec(spec);
    if (id !== buildId) return;
    r.key = id; r.size = sizeOf(r.object); r.url = VIEWER.href + '#' + encodeHash(spec); result = r;
    if (location.hash.slice(1) !== encodeHash(spec)) history.replaceState(null, '', r.url);
    if (stage) stage.setObject(r.object, { animate: true });
    $('vTitle').textContent = r.title;
    $('vKind').textContent = KIND_LABEL[r.kind];
    $('vMeta').textContent = r.note;
    document.title = r.title + ' · assembl AR';
    $('dims').lastElementChild.textContent = fmtSize(r.size);
    $('scaleChip').textContent = r.fixedScale ? 'Real size in AR' : 'Resizable in AR';
    $('editLink').href = STUDIO.href + '#' + encodeHash(spec);
    renderQR();
    setTimeout(() => placer.prefetch(), 600);
  } catch (e) {
    console.warn(e);
    empty('We couldn’t rebuild this one', e.message || 'Something in the link didn’t make sense.');
  }
}

function renderQR() {
  if (placer.mode !== 'none' || !result) return;
  $('vQR').hidden = false;
  $('vQRBox').innerHTML = qrSVG(result.url, { style: 'assembly', size: 300, centre: { kind: 'cube' } }) || '';
  if (LOCAL && !$('vQR').querySelector('.local-note')) $('vQR').insertAdjacentHTML('beforeend', `<p class="local-note">This page is on <b>${esc(location.host)}</b>, which a phone can’t reach. The code works once it’s on assembl.co.nz.</p>`);
}
placer.ready.then(s => { $('deviceNote').textContent = deviceSentence(s.mode); renderQR(); });
viewBtn.addEventListener('click', () => { if (stage) stage.finish(); placer.activate(); });
async function dl(which, btn) {
  if (!result) return;
  if (stage) stage.finish();
  const t = btn.textContent; btn.disabled = true; btn.textContent = 'Making it…';
  try {
    await new Promise(r => setTimeout(r, 30));
    const { blob, report } = await placer.files(which);
    download(blob, `assembl-ar-${slug(result.title)}.${which}`);
    $('fileNote').textContent = `${which.toUpperCase()} ${fileSize(blob)} · ${report.triangles.toLocaleString('en-NZ')} triangles`;
  } catch (e) { $('fileNote').textContent = 'Couldn’t make the file: ' + e.message; }
  btn.disabled = false; btn.textContent = t;
}
$('dlUSDZ').addEventListener('click', e => dl('usdz', e.currentTarget));
$('dlGLB').addEventListener('click', e => dl('glb', e.currentTarget));
addEventListener('hashchange', () => { placer.invalidate(); load(); });

window.__assemblAR = { get result() { return result; }, get stage() { return stage; }, placer };
load();
