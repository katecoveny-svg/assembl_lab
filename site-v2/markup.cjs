/* PORTED FROM katecoveny-svg/assemblnz-f0afd79d components/site-v2/* at commit 2fa1750d8a7823c05941a4c9837b9fce37fb147d
   (branch feat/home-mockup-restyle, PR #1785): Button (+ Arrow), Eyebrow (+ Brand), Wordmark (+ GlassA), SplitTextReveal,
   Reveal, Parallax, Ticker, GlassAssemble, SiteNav and SiteFooter, rewritten as string templates for the Lab's static
   build (scripts/build-lab-home.cjs). Each function returns the same markup and class names as the React component's
   server render, so /site-v2/site-v2.css styles them unchanged and /site-v2/site-v2.js adds the same motion.
   Keep in step with the main repo: when a component changes there, change its twin here and update the commit above.

   Lab-only differences, on purpose:
   - Wordmark takes `suffix` ("lab") and links to the Lab home. Since 8 Nov 2026 its mark is the flat mark A, drawn
     inline (MARK_A); the glass "a" images are retired.
   - SiteNav / SiteFooter take their links as arguments: the Lab's chapters plus absolute links back to assembl.co.nz.
   - markAssemble (was GlassAssemble) renders the flat mark's four parts at rest in the HTML (no JS shows the whole "a");
     `trigger: 'load'` assembles once on page load with CSS instead of with scroll. */
'use strict';

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const attrs = o => Object.entries(o || {}).filter(([, v]) => v !== undefined && v !== false && v !== null)
  .map(([k, v]) => (v === true ? ` ${k}` : ` ${k}="${esc(v)}"`)).join('');


const PATHS = { 'up-right': 'M7 17 17 7M8 7h9v9', down: 'M12 5v14M6 13l6 6 6-6', right: 'M5 12h14M13 6l6 6-6 6' };

/** Button.tsx → Arrow */
function arrow(dir = 'up-right', size = 16) {
  return `<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="${PATHS[dir]}"/></svg>`;
}

/** Button.tsx. `label` is trusted HTML (so <span class="v2-brand"> can sit inside); `extra` adds attributes such as target. */
function button({ href, label, variant = 'primary', icon = 'up-right', size = 'md', className, extra }) {
  const cls = ['v2-btn', `v2-btn-${variant}`, size !== 'md' && `v2-btn-${size}`, className].filter(Boolean).join(' ');
  const ic = icon !== 'none' ? `<span class="v2-btn-icon" data-dir="${icon}">${arrow(icon, size === 'sm' ? 14 : 16)}</span>` : '';
  return `<a class="${cls}" href="${esc(href)}"${attrs(extra)}><span class="v2-btn-label">${label}</span>${ic}</a>`;
}

/** Eyebrow.tsx → Brand: the brand word, always lowercase "assembl", even inside uppercase labels. */
const brand = () => '<span class="v2-brand">assembl</span>';

/** Eyebrow.tsx. `html` is trusted. */
function eyebrow(html, { dot = true, tag = 'p', className, id } = {}) {
  const cls = ['v2-eyebrow', dot && 'v2-eyebrow-dot', className].filter(Boolean).join(' ');
  return `<${tag}${attrs({ id })} class="${cls}">${html}</${tag}>`;
}

/** The flat mark A (Kate, 8 Nov 2026): shoulder, stem, bowl and a dusty-rose dot, ivory on dark. Same geometry as
    lib/brand/mark-a.ts in assemblnz-f0afd79d. Replaces the retired glass "a". */
const MARK_A = '<path d="M66 82 C72 56 132 52 132 84" fill="none" stroke="#F9F6F2" stroke-width="14" stroke-linecap="round"/><line x1="132" y1="76" x2="132" y2="160" fill="none" stroke="#F9F6F2" stroke-width="14" stroke-linecap="round"/><path d="M132 112 C132 90 64 90 64 128 C64 166 132 166 132 136" fill="none" stroke="#F9F6F2" stroke-width="14" stroke-linecap="round"/><circle cx="160" cy="160" r="10" fill="#D9BACB"/>';
/** The mark on its own, inline SVG, decorative. */
function markA(size = 34, { className } = {}) {
  const cls = ['v2-wordmark-a', className].filter(Boolean).join(' ');
  return `<svg class="${cls}" viewBox="0 0 200 200" width="${size}" height="${size}" style="width:${size}px;height:${size}px" aria-hidden="true" focusable="false">${MARK_A}</svg>`;
}

/** Wordmark.tsx: lowercase "assembl" + the dusty-rose dot. Lab adds `suffix` ("lab").
    8 Nov 2026 (Kate): the "a." mark is off everywhere until a new one is chosen, so the wordmark is text only.
    `showMark` still draws the flat mark where explicitly asked. Mirrors components/site-v2/Wordmark.tsx in the main repo. */
function wordmark({ href, size = 24, mark = 34, dot = true, showMark = false, suffix, label = 'assembl home', eager = false, className, extra } = {}) {
  const style = `--v2-wm-size:${size}px;--v2-wm-a:${mark}px`;
  const body = `${showMark ? markA(mark) : ''}<span>assembl${dot ? '<span class="v2-wordmark-dot" aria-hidden="true">.</span>' : ''}</span>${suffix ? `<span class="lab-wm-suffix">${esc(suffix)}</span>` : ''}`;
  const cls = ['v2-wordmark', className].filter(Boolean).join(' ');
  return href
    ? `<a href="${esc(href)}" class="${cls}" style="${style}" aria-label="${esc(label)}"${attrs(extra)}>${body}</a>`
    : `<span class="${cls}" style="${style}">${body}</span>`;
}

/** SplitTextReveal.tsx (server render). lines: string | {text, accent}. trigger: load | inview | assemble. */
function split({ lines, text, tag = 'h2', id, className, trigger = 'inview', by = 'word', delay = 0 }) {
  const all = (lines || [text || '']).map(l => (typeof l === 'string' ? { text: l, accent: false } : { text: l.text, accent: !!l.accent }));
  let n = 0;
  const unit = u => `<span class="v2-w"${by === 'letter' ? ' aria-hidden="true"' : ''}><span class="v2-wi" style="--i:${n++}">${esc(u)}</span></span>`;
  const plain = all.map(l => l.text).join(' ');
  const body = all.map((line, li) => {
    const words = line.text.split(/\s+/).filter(Boolean);
    const inner = words.map((w, wi) => `<span>${by === 'letter' ? `<span style="white-space:nowrap">${[...w].map(unit).join('')}</span>` : unit(w)}${wi < words.length - 1 ? ' ' : ''}</span>`).join('');
    return `<span class="${['v2-split-line', line.accent && 'v2-accent'].filter(Boolean).join(' ')}">${inner}</span>${li < all.length - 1 ? ' ' : ''}`;
  }).join('');
  const cls = ['v2-split', className].filter(Boolean).join(' ');
  return `<${tag}${attrs({ id })} class="${cls}" data-trigger="${trigger}"${trigger === 'assemble' ? ' data-mode="assemble"' : ''}${by === 'letter' ? ` aria-label="${esc(plain)}"` : ''}${delay ? ` style="--d:${delay}ms"` : ''}>${body}</${tag}>`;
}

/** Reveal.tsx: each direct child fades and lifts in, staggered. `inner` is trusted HTML. */
function reveal(inner, { tag = 'div', className, delay = 0, extra } = {}) {
  return `<${tag} class="${['v2-reveal', className].filter(Boolean).join(' ')}"${delay ? ` style="--d:${delay}ms"` : ''}${attrs(extra)}>${inner}</${tag}>`;
}

/** Parallax.tsx: `distance` px; offset 'hero' = ['start start', 'end start'] (a block that starts on screen). */
function parallax(inner, { distance = 120, offset, className } = {}) {
  return `<div${className ? ` class="${className}"` : ''} data-v2-parallax="${distance}"${offset ? ` data-v2-offset="${offset}"` : ''}>${inner}</div>`;
}

/** Ticker.tsx */
function ticker({ items, label, seconds = 38, className }) {
  const row = hidden => `<ul class="v2-ticker-list"${hidden ? ' aria-hidden="true"' : ''}>${items.map(t => `<li><span>${esc(t)}</span><span class="v2-ticker-sep" aria-hidden="true">✦</span></li>`).join('')}</ul>`;
  return `<div class="${['v2-ticker', className].filter(Boolean).join(' ')}" role="region" aria-label="${esc(label)}" style="--v2-ticker-s:${seconds}s"><div class="v2-ticker-track">${row(false)}${row(true)}</div></div>`;
}

/** The flat mark assembling: its four real parts (shoulder, stem, bowl, dot) scatter and come together, decorative.
    Keeps the GlassAssemble class names and scatter values so site-v2.js and lab.css drive the motion unchanged. */
const PIECES = [
  { part: '<path d="M66 82 C72 56 132 52 132 84" fill="none" stroke="#F9F6F2" stroke-width="14" stroke-linecap="round"/>', x: -46, y: -34, r: -20 },
  { part: '<line x1="132" y1="76" x2="132" y2="160" fill="none" stroke="#F9F6F2" stroke-width="14" stroke-linecap="round"/>', x: 48, y: -40, r: 16 },
  { part: '<path d="M132 112 C132 90 64 90 64 128 C64 166 132 166 132 136" fill="none" stroke="#F9F6F2" stroke-width="14" stroke-linecap="round"/>', x: -40, y: 44, r: 14 },
  { part: '<circle cx="160" cy="160" r="10" fill="#D9BACB"/>', x: 44, y: 38, r: -18 },
];
function markAssemble({ size = 320, className, trigger = 'scroll' } = {}) {
  const pieces = PIECES.map(p => `<div class="v2-glass-piece" style="--px:${p.x}%;--py:${p.y}%;--pr:${p.r}deg" data-x="${p.x}" data-y="${p.y}" data-r="${p.r}"><svg viewBox="0 0 200 200" aria-hidden="true" focusable="false">${p.part}</svg></div>`).join('');
  return `<div class="${['v2-glass-assemble', 'v2-mark-assemble', className].filter(Boolean).join(' ')}" style="max-width:${size}px" aria-hidden="true" data-v2-assemble="${trigger}">${pieces}</div>`;
}

/** SiteNav.tsx: floating nav over a dark hero, plum glass bar once scrolled; Menu below 880px. */
function siteNav({ home, links, cta, current, solid = false, menuId = 'v2-site-menu' }) {
  const a = l => `<a href="${esc(l.href)}"${l.href === current ? ' aria-current="page"' : ''}${attrs(l.extra)}>${esc(l.label)}</a>`;
  const m = l => `<a href="${esc(l.href)}"${l.href === current ? ' aria-current="page"' : ''}${attrs(l.extra)}>${esc(l.label)}${arrow()}</a>`;
  return `<div class="v2-nav-wrap"${solid ? ' data-scrolled data-solid' : ''} data-global-chrome data-site-header>
 <header class="v2-nav">
  ${home}
  <nav aria-label="Primary" class="v2-nav-links">${links.map(a).join('')}</nav>
  <div class="v2-nav-actions">${button({ href: cta.href, label: esc(cta.label), variant: 'ghost', size: 'sm', extra: cta.extra })}<button type="button" class="v2-nav-menu-btn" aria-expanded="false" aria-controls="${menuId}">Menu</button></div>
 </header>
 <nav id="${menuId}" aria-label="Menu" class="v2-nav-menu" hidden>${links.map(m).join('')}<a href="${esc(cta.href)}" class="v2-nav-menu-cta"${attrs(cta.extra)}>${esc(cta.label)}${arrow()}</a></nav>
</div>`;
}

/** SiteFooter.tsx: wordmark, links and legal on deep plum. `note` is trusted HTML. */
function siteFooter({ home, links, legal, note, strip }) {
  const a = l => `<a href="${esc(l.href)}"${attrs(l.extra)}>${esc(l.label)}</a>`;
  return `<footer class="v2-foot" data-site-footer>
 <div class="v2-foot-row">${home}<nav aria-label="Footer" class="v2-foot-links">${links.map(a).join('')}</nav></div>
 <div class="v2-foot-row v2-foot-base"><p>${note}</p><nav aria-label="Legal" class="v2-foot-legal">${legal.map(a).join('')}</nav></div>${strip ? `
 <div class="v2-foot-strip">${strip.map(s => `<span>${s}</span>`).join('')}</div>` : ''}
</footer>`;
}

module.exports = { esc, arrow, button, brand, eyebrow, markA, wordmark, split, reveal, parallax, ticker, markAssemble, siteNav, siteFooter, MARK_A };
