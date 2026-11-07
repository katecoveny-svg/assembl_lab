/* PORTED FROM katecoveny-svg/assemblnz-f0afd79d components/site-v2/* at commit 2fa1750d8a7823c05941a4c9837b9fce37fb147d
   (branch feat/home-mockup-restyle, PR #1785): Button (+ Arrow), Eyebrow (+ Brand), Wordmark (+ GlassA), SplitTextReveal,
   Reveal, Parallax, Ticker, GlassAssemble, SiteNav and SiteFooter, rewritten as string templates for the Lab's static
   build (scripts/build-lab-home.cjs). Each function returns the same markup and class names as the React component's
   server render, so /site-v2/site-v2.css styles them unchanged and /site-v2/site-v2.js adds the same motion.
   Keep in step with the main repo: when a component changes there, change its twin here and update the commit above.

   Lab-only differences, on purpose:
   - Wordmark takes `suffix` ("lab") and links to the Lab home. The image is /site-v2/glass-a-512.webp (same file as
     public/home/world/glass-a-512.webp), with 96px and 192px copies in srcset.
   - SiteNav / SiteFooter take their links as arguments: the Lab's chapters plus absolute links back to assembl.co.nz.
   - GlassAssemble renders its four pieces at rest in the HTML (no JS shows the whole "a"); `trigger: 'load'` assembles
     once on page load with CSS instead of with scroll. */
'use strict';

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const attrs = o => Object.entries(o || {}).filter(([, v]) => v !== undefined && v !== false && v !== null)
  .map(([k, v]) => (v === true ? ` ${k}` : ` ${k}="${esc(v)}"`)).join('');

const GLASS_A_SRC = '/site-v2/glass-a-512.webp';
const GLASS_A_SRCSET = '/site-v2/glass-a-96.webp 96w, /site-v2/glass-a-192.webp 192w, /site-v2/glass-a-512.webp 512w';

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

/** Wordmark.tsx → GlassA: the transparent glass "a" on its own, decorative. */
function glassA(size = 34, { className, eager = false } = {}) {
  const cls = ['v2-wordmark-a', className].filter(Boolean).join(' ');
  return `<img src="${GLASS_A_SRC}" srcset="${GLASS_A_SRCSET}" sizes="${size}px" alt="" width="512" height="512" class="${cls}" style="width:${size}px;height:${size}px" aria-hidden="true"${eager ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async">`;
}

/** Wordmark.tsx: glass "a" + lowercase "assembl" + the dusty-rose dot. Lab adds `suffix` ("lab"). */
function wordmark({ href, size = 24, mark = 34, dot = true, suffix, label = 'assembl home', eager = false, className, extra } = {}) {
  const style = `--v2-wm-size:${size}px;--v2-wm-a:${mark}px`;
  const body = `${glassA(mark, { eager })}<span>assembl${dot ? '<span class="v2-wordmark-dot" aria-hidden="true">.</span>' : ''}</span>${suffix ? `<span class="lab-wm-suffix">${esc(suffix)}</span>` : ''}`;
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

/** GlassAssemble.tsx: four quarters of the glass "a" (same clips and scatter), decorative. */
const PIECES = [
  { clip: 'inset(0 49.6% 49.6% 0)', x: -46, y: -34, r: -20 },
  { clip: 'inset(0 0 49.6% 49.6%)', x: 48, y: -40, r: 16 },
  { clip: 'inset(49.6% 49.6% 0 0)', x: -40, y: 44, r: 14 },
  { clip: 'inset(49.6% 0 0 49.6%)', x: 44, y: 38, r: -18 },
];
function glassAssemble({ size = 320, className, trigger = 'scroll', eager = false } = {}) {
  const pieces = PIECES.map(p => `<div class="v2-glass-piece" style="clip-path:${p.clip};--px:${p.x}%;--py:${p.y}%;--pr:${p.r}deg" data-x="${p.x}" data-y="${p.y}" data-r="${p.r}"><img src="${GLASS_A_SRC}" srcset="${GLASS_A_SRCSET}" sizes="${size}px" alt="" width="512" height="512"${eager ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async"></div>`).join('');
  return `<div class="${['v2-glass-assemble', className].filter(Boolean).join(' ')}" style="max-width:${size}px" aria-hidden="true" data-v2-assemble="${trigger}">${pieces}</div>`;
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

module.exports = { esc, arrow, button, brand, eyebrow, glassA, wordmark, split, reveal, parallax, ticker, glassAssemble, siteNav, siteFooter, GLASS_A_SRC, GLASS_A_SRCSET };
