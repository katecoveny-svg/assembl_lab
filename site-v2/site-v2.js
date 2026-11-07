/* PORTED FROM katecoveny-svg/assemblnz-f0afd79d components/site-v2/* at commit 2fa1750d8a7823c05941a4c9837b9fce37fb147d
   (branch feat/home-mockup-restyle, PR #1785). The client-side half of SiteNav, SplitTextReveal, Reveal (use-reveal.ts),
   Parallax and GlassAssemble, in plain JavaScript for the static Lab (the main site uses React and framer-motion).
   Same offsets, distances and scatter as the components, so motion matches assembl.co.nz. Markup comes from
   /site-v2/markup.cjs (build time) or /lab/navigation.js (injected nav). Keep in step with the main repo and update the
   commit above when re-porting.

   Rules kept from the foundation: transform and opacity only; nothing is armed before this script runs, so no JS shows
   the complete static page; reduced motion keeps everything still and visible. */
(() => {
  'use strict';
  if (window.__siteV2) return; window.__siteV2 = true;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ── SiteNav: plum glass bar once scrolled, Menu toggle below 880px, Escape closes ── */
  function navs() {
    for (const wrap of $$('.v2-nav-wrap')) {
      if (wrap.dataset.v2Bound) continue; wrap.dataset.v2Bound = '1';
      const solid = wrap.hasAttribute('data-solid');
      const btn = wrap.querySelector('.v2-nav-menu-btn');
      const menu = btn && document.getElementById(btn.getAttribute('aria-controls'));
      let open = false;
      const paint = () => { if (solid || open || scrollY > 24) wrap.setAttribute('data-scrolled', ''); else wrap.removeAttribute('data-scrolled'); };
      const set = v => { open = v; if (menu) menu.hidden = !v; if (btn) { btn.setAttribute('aria-expanded', String(v)); btn.textContent = v ? 'Close' : 'Menu'; } paint(); };
      paint(); addEventListener('scroll', paint, { passive: true });
      if (btn && menu) {
        btn.addEventListener('click', () => set(!open));
        menu.addEventListener('click', e => { if (e.target.closest('a')) set(false); });
        addEventListener('keydown', e => { if (open && e.key === 'Escape') { set(false); btn.focus(); } });
      }
    }
  }

  /* ── use-reveal.ts: arm only below-the-fold blocks, only with motion allowed ── */
  function arm(el, margin = '0px 0px -12% 0px') {
    if (reduced || typeof IntersectionObserver === 'undefined' || el.dataset.v2Armed) return;
    el.dataset.v2Armed = '1';
    if (el.getBoundingClientRect().top < innerHeight * .92) return; // already on screen: leave it visible
    el.setAttribute('data-armed', '');
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { el.setAttribute('data-in', ''); io.disconnect(); } }, { rootMargin: margin });
    io.observe(el);
  }

  /* ── scroll-linked effects: one rAF-throttled loop ── */
  const clamp01 = v => Math.max(0, Math.min(1, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  // SplitTextReveal: stable pseudo-random in [-1, 1] per index, so the scatter is the same on every visit
  const jitter = (i, salt) => { const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453; return (x - Math.floor(x)) * 2 - 1; };
  const jobs = [];

  function assembleText(el) {
    // offset ['start 0.98', 'start 0.4']: words fly together as the heading's top moves from 98% to 40% of the screen
    const units = $$('.v2-wi', el);
    jobs.push(() => {
      const top = el.getBoundingClientRect().top, vh = innerHeight;
      const p = clamp01((vh * .98 - top) / (vh * .58));
      units.forEach((u, i) => {
        const k = 1 - p;
        u.style.transform = `translate(${(jitter(i, 1) * 140 * k).toFixed(1)}px, ${((jitter(i, 2) * 90 + 50) * k).toFixed(1)}px) rotate(${(jitter(i, 3) * 22 * k).toFixed(2)}deg)`;
        u.style.opacity = lerp(.12, 1, clamp01(p / .55)).toFixed(3);
      });
    });
  }

  function parallax(el) {
    const d = Number(el.dataset.v2Parallax) || 120, hero = el.dataset.v2Offset === 'hero';
    jobs.push(() => {
      const r = el.getBoundingClientRect(), vh = innerHeight;
      // default ['start end', 'end start']: -d/2 → d/2 across the crossing; hero ['start start', 'end start']: 0 → d
      const p = hero ? clamp01(-r.top / Math.max(1, r.height)) : clamp01((vh - r.top) / (vh + r.height));
      const y = hero ? lerp(0, d, p) : lerp(-d / 2, d / 2, p);
      el.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`;
    });
  }

  function glassScroll(el) {
    // offset ['start end', 'center 0.55']: the four pieces meet as the "a" reaches the middle of the screen
    const pieces = $$('.v2-glass-piece', el);
    jobs.push(() => {
      const r = el.getBoundingClientRect(), vh = innerHeight;
      const p = clamp01((vh - r.top) / (vh * .45 + r.height / 2));
      pieces.forEach(pc => {
        const k = 1 - p;
        pc.style.transform = `translate(${(+pc.dataset.x * k).toFixed(2)}%, ${(+pc.dataset.y * k).toFixed(2)}%) rotate(${(+pc.dataset.r * k).toFixed(2)}deg)`;
        pc.style.opacity = lerp(.35, 1, clamp01(p / .5)).toFixed(3);
      });
    });
  }

  let ticking = false;
  const frame = () => { ticking = false; for (const j of jobs) j(); };
  const kick = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };

  function init() {
    navs();
    for (const el of $$('.v2-reveal')) arm(el);
    for (const el of $$('.v2-split[data-trigger="inview"]')) arm(el);
    if (reduced) return;
    for (const el of $$('.v2-split[data-trigger="assemble"]')) assembleText(el);
    for (const el of $$('[data-v2-parallax]')) parallax(el);
    for (const el of $$('.v2-glass-assemble[data-v2-assemble="scroll"]')) glassScroll(el);
    if (jobs.length) { frame(); addEventListener('scroll', kick, { passive: true }); addEventListener('resize', kick); }
  }
  window.siteV2Bind = navs; // lets /lab/navigation.js bind a nav it injects later
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
