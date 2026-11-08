// assembl AR worlds: the code sheet for a computer. A big assembl AR code that opens the same world and mode on a phone,
// the short link, and a printable card (PNG and SVG) for a classroom wall. Uses the studio's own codes (../js/qr.js).
import { qrSVG, cardSVG, svgToPNG, STYLES } from '../js/qr.js';
import { world as worldInfo, worldURL, shortLink, posterURL, modeOf, MODES, HOST } from './worlds.js';
import { esc } from '../js/ui.js';
import { modeLabel } from './ui.js';

const slugName = (id, mode) => `assembl-ar-${id}-${mode}`;
function save(blob, name) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 30000);
}
// the poster as a PNG data URL, so the card's SVG carries it and the PNG can be drawn from it
const thumbs = new Map();
function posterData(id) {
  if (thumbs.has(id)) return thumbs.get(id);
  const p = new Promise(res => {
    const img = new Image(); img.decoding = 'async';
    img.onload = () => { try { const c = document.createElement('canvas'); c.width = 600; c.height = Math.round(600 * img.naturalHeight / img.naturalWidth); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', 0.86)); } catch (e) { res(null); } };
    img.onerror = () => res(null); img.src = posterURL(id);
  });
  thumbs.set(id, p); return p;
}

// mount(host, { id, mode, onMode }) → { set(mode), url }
export function mountSheet(host, { id, mode = 'table', onMode = null, style = 'assembly' } = {}) {
  const w = worldInfo(id);
  let m = modeOf(mode), st = style;
  host.classList.add('wsheet');
  host.innerHTML = `
    <div class="ws-modes" role="radiogroup" aria-label="Which way in">
      ${Object.values(MODES).map(x => `<label><input type="radio" name="ws-mode-${id}" value="${x.id}"><span><b>${esc(modeLabel(w, x.id))}</b><small></small></span></label>`).join('')}
    </div>
    <div class="ws-code"><div class="ws-qr" aria-live="polite"></div>
      <div class="ws-copy"><h2>Scan to open it on your phone</h2>
        <p class="ws-what"></p>
        <ol class="ws-steps"><li>Open your phone’s camera</li><li>Point it at the code</li><li>Tap the link that appears</li></ol>
      </div></div>
    <div class="ws-link"><a class="ws-short" href="#" target="_blank" rel="noopener"></a><button type="button" class="ws-btn ws-copylink">Copy link</button></div>
    <div class="ws-styles"><span class="ws-lab">Code style</span><div class="ws-seg" role="radiogroup" aria-label="Code style">${STYLES.map(s => `<label><input type="radio" name="ws-style-${id}" value="${s.id}"${s.id === st ? ' checked' : ''}><span>${s.name}</span></label>`).join('')}</div></div>
    <div class="ws-print"><span class="ws-lab">Print the AR code</span><p>A card for a classroom wall or a poster, with this world’s picture. Print it 6 cm or larger.</p>
      <div class="ws-row"><button type="button" class="ws-btn" data-dl="png">Card PNG</button><button type="button" class="ws-btn" data-dl="svg">Card SVG</button></div></div>
    <p class="ws-local" hidden></p>`;
  const $ = s => host.querySelector(s);
  host.querySelectorAll('.ws-modes label').forEach(l => { const v = l.querySelector('input').value; l.querySelector('small').textContent = w[v].note; });
  const url = () => worldURL(id, m);
  function draw() {
    host.querySelectorAll('.ws-modes input').forEach(i => { i.checked = i.value === m; });
    const svg = qrSVG(url(), { size: 320, style: st, centre: { kind: 'cube' } });
    $('.ws-qr').innerHTML = svg ? svg.replace('<svg ', `<svg class="ws-qrsvg" aria-label="${esc('assembl AR code for ' + w.name + ', ' + MODES[m].name)}" `).replace(' aria-label="QR code"', '') : '<p>That link is too long for a code.</p>';
    $('.ws-short').textContent = shortLink(id, m); $('.ws-short').href = url();
    $('.ws-what').textContent = m === 'table' ? `${w.name}, ${w.table.note.toLowerCase()}. iPhone opens AR Quick Look; Android runs the live world in Chrome.`
      : `${w.inside.note}. ${w.kind === 'place' ? 'On Android the doorway stands in your room; iPhone puts the life-size world round you, without a doorway.' : 'It stays at that size.'}`;
    const local = /^(localhost|127\.|0\.0\.0\.0)/.test(location.hostname);
    $('.ws-local').hidden = !local; if (local) $('.ws-local').textContent = `This page is running on ${location.host}, so the code points at the live lab (${HOST}).`;
  }
  host.querySelectorAll('.ws-modes input').forEach(i => i.addEventListener('change', () => { m = i.value; draw(); onMode && onMode(m); }));
  host.querySelectorAll('.ws-seg input').forEach(i => i.addEventListener('change', () => { st = i.value; draw(); }));
  $('.ws-copylink').addEventListener('click', async () => {
    const b = $('.ws-copylink');
    try { await navigator.clipboard.writeText(url()); b.textContent = 'Copied'; } catch (e) { b.textContent = 'Select the link to copy'; }
    setTimeout(() => { b.textContent = 'Copy link'; }, 1600);
  });
  async function card() {
    return cardSVG({
      url: url(), title: w.name, detail: `${MODES[m].name} · ${w.labels.join(' · ')}`, kind: MODES[m].name, thumb: await posterData(id), centre: 'cube', style: st, host: HOST,
      heading: ['Scan to open', m === 'table' ? 'it on your table' : (w.kind === 'place' ? 'and step inside' : 'it at full size')],
      steps: ['1  Open your phone camera', '2  Point it at the code', '3  Tap the link, then the button'], foot: 'iPhone, iPad and Android · no app'
    });
  }
  host.querySelectorAll('[data-dl]').forEach(b => b.addEventListener('click', async () => {
    const kind = b.dataset.dl, label = b.textContent; b.disabled = true; b.textContent = 'Making…';
    try {
      const c = await card(); if (!c) throw new Error('no card');
      if (kind === 'svg') save(new Blob([c.svg], { type: 'image/svg+xml' }), slugName(id, m) + '.svg');
      else save(await svgToPNG(c.svg, 2), slugName(id, m) + '.png');
    } catch (e) { b.textContent = 'Couldn’t make it'; setTimeout(() => { b.textContent = label; }, 1800); b.disabled = false; return; }
    b.disabled = false; b.textContent = label;
  }));
  draw();
  return { set(v) { m = modeOf(v); draw(); }, get url() { return url(); }, get mode() { return m; }, card };
}
