/* assembl AR worlds: a "View in AR" button for any page where a world lives. One line:
 *
 *   <script type="module" src="/ar/worlds/button.js" data-world="dairy" data-into=".card.title"></script>
 *
 *   data-world   f1 | claw | heart | earth | dairy | ed | dc | cafe (see ar/worlds/worlds.js)
 *   data-into    optional CSS selector to append the buttons to (default: just after the script tag)
 *   data-variant dark (ivory buttons, for plum pages; the default) | light (plum buttons, for paper pages)
 *
 * Two buttons: "View in AR" (on your table) and "Step inside" (or "Real size", "Giant"). On a phone each opens AR
 * straight away: AR Quick Look on iPhone and iPad, the live world in Chrome on Android, Scene Viewer otherwise. On a
 * computer each opens a small code sheet so a phone can open the same world and mode.
 * Also: import { worldButton } from '/ar/worlds/button.js'; worldButton(host, { world: 'f1', variant: 'light' }).
 * Needs nothing from the page; the WebXR runtime needs the usual import map for "three" (every 3D lab page has one).
 */
import { world as worldInfo, worldURL, shortLink, MODES } from './worlds.js';
import { device, open, warm } from './launch.js';
import { ICON, esc } from './ui.js';

const CSS = `
.war{display:inline-flex;flex-wrap:wrap;gap:8px;align-items:center;position:relative;max-width:100%;margin-top:10px;font-family:"Instrument Sans",system-ui,-apple-system,sans-serif}
.war-btn{appearance:none;display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:9px 16px 9px 12px;border:0;border-radius:999px;background:#F9F6F2;color:#21121F;
 font:600 14px/1.1 "Instrument Sans",system-ui,-apple-system,sans-serif;cursor:pointer;white-space:nowrap;-webkit-tap-highlight-color:transparent}
.war-btn svg{width:20px;height:20px;flex:none}
.war-btn.alt{background:transparent;color:#F9F6F2;box-shadow:inset 0 0 0 1px rgba(217,186,203,.45)}
.war-btn:hover{filter:brightness(.96)}
.war-btn.alt:hover{background:rgba(249,246,242,.08)}
.war-btn:focus-visible{outline:2px solid #D9BACB;outline-offset:3px}
.war-btn[disabled]{cursor:progress;opacity:.75}
.war.light .war-btn{background:#21121F;color:#F9F6F2}
.war.light .war-btn.alt{background:transparent;color:#21121F;box-shadow:inset 0 0 0 1px rgba(51,33,47,.3)}
.war.light .war-btn:focus-visible{outline-color:#756771}
.war-msg{flex-basis:100%;margin:0;font:400 11.5px/1.4 "IBM Plex Mono",ui-monospace,monospace;color:#D9BACB}
.war.light .war-msg{color:#756771}
.war-msg:empty{display:none}
.war-pop{position:absolute;z-index:80;top:calc(100% + 10px);left:0;width:min(320px,calc(100vw - 24px));padding:16px 16px 14px;border-radius:22px;background:#F9F6F2;color:#33212F;
 box-shadow:0 0 0 1px rgba(51,33,47,.12),0 24px 48px -24px rgba(0,0,0,.6);font:400 13.5px/1.45 "Instrument Sans",system-ui,sans-serif;text-align:left}
.war-pop svg.war-qr{display:block;width:100%;height:auto;border-radius:14px}
.war-pop h3{margin:10px 34px 2px 0;font:600 17px/1.25 "Instrument Sans",system-ui,sans-serif;color:#21121F}
.war-pop p{margin:0;color:#33212F}
.war-pop .war-link{display:block;margin-top:8px;font:500 11.5px/1.35 "IBM Plex Mono",ui-monospace,monospace;color:#756771;word-break:break-all}
.war-pop .war-more{display:inline-block;margin-top:10px;font:600 13px/1.3 "Instrument Sans",system-ui,sans-serif;color:#21121F}
.war-pop .war-x{position:absolute;top:8px;right:8px;width:34px;height:34px;border:0;border-radius:50%;background:#EDE5EA;color:#33212F;font:500 18px/1 system-ui;cursor:pointer}
.war-pop .war-x:focus-visible{outline:2px solid #756771;outline-offset:2px}
@media (max-width:520px){.war-btn{min-height:46px}}
`;
function injectCSS() { if (document.getElementById('war-css')) return; const s = document.createElement('style'); s.id = 'war-css'; s.textContent = CSS; document.head.appendChild(s); }

export function worldButton(host, { world: id, variant = 'dark', labels = null } = {}) {
  const w = worldInfo(id); if (!w) throw new Error('assembl AR: no world called ' + id);
  injectCSS();
  const wrap = document.createElement('div'); wrap.className = 'war' + (variant === 'light' ? ' light' : '');
  wrap.setAttribute('role', 'group'); wrap.setAttribute('aria-label', `${w.name} in augmented reality`);
  const insideName = w.kind === 'place' ? MODES.inside.name : w.inside.verb;
  const L = { table: (labels && labels.table) || 'View in AR', inside: (labels && labels.inside) || insideName };
  wrap.innerHTML = `<button type="button" class="war-btn" data-mode="table" aria-label="${esc(w.name)} in AR, on your table">${ICON.ar}<span>${esc(L.table)}</span></button>`
    + `<button type="button" class="war-btn alt" data-mode="inside" aria-label="${esc(w.name)} in AR: ${esc(insideName.toLowerCase())}">${ICON.inside}<span>${esc(L.inside)}</span></button><p class="war-msg" role="status" aria-live="polite"></p>`;
  host.appendChild(wrap);
  const msg = wrap.querySelector('.war-msg');
  let pop = null, last = null;
  function closePop() { if (!pop) return; pop.remove(); pop = null; document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onOut, true); last && last.focus(); }
  const onKey = e => { if (e.key === 'Escape') closePop(); };
  const onOut = e => { if (pop && !wrap.contains(e.target)) closePop(); };
  async function sheet(mode, btn) {
    closePop(); last = btn;
    const { qrSVG } = await import('../js/qr.js');
    pop = document.createElement('div'); pop.className = 'war-pop'; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', `Scan to open ${w.name} on a phone`);
    const url = worldURL(id, mode);
    pop.innerHTML = `<button type="button" class="war-x" aria-label="Close">×</button>${qrSVG(url, { size: 288, style: 'assembly', centre: { kind: 'cube' } }).replace('<svg ', '<svg class="war-qr" ')}
      <h3>Scan to open it on your phone</h3><p>${esc(w.name)}, ${esc(mode === 'table' ? 'on your table' : insideName.toLowerCase())}. iPhone, iPad and Android, no app.</p>
      <span class="war-link">${esc(shortLink(id, mode))}</span><a class="war-more" href="${esc(url.replace(/^https:\/\/lab\.assembl\.co\.nz/, ''))}">3D preview and a card to print →</a>`;
    wrap.appendChild(pop);
    const r = pop.getBoundingClientRect(); if (r.right > innerWidth - 12) pop.style.left = Math.min(0, innerWidth - 12 - r.right) + 'px';
    pop.querySelector('.war-x').addEventListener('click', closePop); pop.querySelector('.war-x').focus();
    document.addEventListener('keydown', onKey); setTimeout(() => document.addEventListener('pointerdown', onOut, true), 0);
  }
  wrap.addEventListener('click', async e => {
    const b = e.target.closest('.war-btn'); if (!b) return;
    msg.textContent = '';
    try {
      const r = await open(id, b.dataset.mode);
      if (r === 'sheet') sheet(b.dataset.mode, b);
    } catch (err) { msg.textContent = err.message; }
  });
  const idle = window.requestIdleCallback || (f => setTimeout(f, 900));
  idle(() => warm());
  return { el: wrap, close: closePop, device };
}

// the one-line include
for (const s of document.querySelectorAll('script[src*="/ar/worlds/button.js"][data-world]')) {
  if (s.dataset.mounted) continue; s.dataset.mounted = '1';
  const mount = () => {
    const host = s.dataset.into ? document.querySelector(s.dataset.into) : null;
    try {
      if (host) worldButton(host, { world: s.dataset.world, variant: s.dataset.variant });
      else { const h = document.createElement('div'); s.after(h); worldButton(h, { world: s.dataset.world, variant: s.dataset.variant }); }
    } catch (e) { console.warn(e); }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
}
