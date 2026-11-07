/* PORTED FROM katecoveny-svg/assemblnz-f0afd79d lib/brand/site-v2/tokens.ts at commit 2fa1750d8a7823c05941a4c9837b9fce37fb147d
   (branch feat/home-mockup-restyle, PR #1785). Same values, TypeScript types removed so the static Lab can import it.
   Do not edit here: change the main repo first, then re-port and update the commit above. */

/**
 * Site v2 tokens (8 Nov 2026). Kate's locked palette from her ChatGPT mockup: deep plum, dusty rose, warm ivory.
 * One source for every page that opts in to the v2 look. The CSS twin is styles/site-v2.css (same names as
 * custom properties under `.site-v2`). Usage note and AA pairs: docs/brand/site-v2.md.
 *
 * Rules: "assembl" is always lowercase with no e. No violet or lavender anywhere. The logo is the transparent
 * glass "a" (public/home/world/glass-a-512.webp), never a version with a white or pink tile behind it.
 */

/** Kate's palette, exactly as given, plus four derived tints that exist only to pass AA where hers cannot. */
export const SITE_V2_COLORS = {
  /** Deep plum. Hero and default dark background. */
  plum: '#21121F',
  /** Almost-black aubergine. Worlds and motion sections. */
  aubergine: '#180B18',
  /** Warm ivory. Main light background, and the text colour on dark. */
  ivory: '#F9F6F2',
  /** Plum ink. Text on every light background. */
  ink: '#33212F',
  /** Dusty rose. Accent on dark: headline accent line, period dot, focus rings. */
  rose: '#D9BACB',
  /** Muted mauve. Secondary text on warm ivory only (4.95:1). */
  mauve: '#756771',
  /** Soft blush. Light studio-style section background. */
  blush: '#F1EAE9',
  /** Pale rose. Panel background (e.g. the website-check panel). */
  paleRose: '#EADCDF',
  /** Rose mauve. Closing section / CTA band, with plum ink text. */
  roseMauve: '#D4B6C7',

  // Derived for contrast. Not new brand colours: tints of mauve and rose that keep body sizes AA.
  /** Secondary text on plum or aubergine (7.93:1 / 8.44:1). Muted mauve itself is 3.36:1 there. */
  mauveOnDark: '#B8A8B2',
  /** Secondary text on blush and pale rose (5.47:1 / 4.88:1). */
  mauveDeep: '#685A64',
  /** Accent line on ivory, blush and pale rose (5.70 / 5.17 / 4.62:1). Dusty rose itself is too pale on light. */
  roseInk: '#7E5570',
  /** Accent line on rose mauve (5.24:1). */
  roseInkDeep: '#5A3A51',
  /** Secondary text on rose mauve (5.59:1). */
  inkSoft: '#4E3A48',
};


/** Which section tone uses which pair. Every pair here is AA for body text (4.5:1+), measured 8 Nov 2026. */
export const SITE_V2_TONES = {
  plum: { bg: SITE_V2_COLORS.plum, fg: SITE_V2_COLORS.ivory, fg2: SITE_V2_COLORS.mauveOnDark, accent: SITE_V2_COLORS.rose },
  aubergine: { bg: SITE_V2_COLORS.aubergine, fg: SITE_V2_COLORS.ivory, fg2: SITE_V2_COLORS.mauveOnDark, accent: SITE_V2_COLORS.rose },
  ivory: { bg: SITE_V2_COLORS.ivory, fg: SITE_V2_COLORS.ink, fg2: SITE_V2_COLORS.mauve, accent: SITE_V2_COLORS.roseInk },
  blush: { bg: SITE_V2_COLORS.blush, fg: SITE_V2_COLORS.ink, fg2: SITE_V2_COLORS.mauveDeep, accent: SITE_V2_COLORS.roseInk },
  pale: { bg: SITE_V2_COLORS.paleRose, fg: SITE_V2_COLORS.ink, fg2: SITE_V2_COLORS.mauveDeep, accent: SITE_V2_COLORS.roseInk },
  roseMauve: { bg: SITE_V2_COLORS.roseMauve, fg: SITE_V2_COLORS.ink, fg2: SITE_V2_COLORS.inkSoft, accent: SITE_V2_COLORS.roseInkDeep },
};


/** Measured contrast ratios (WCAG 2.x relative luminance), for the docs and for tests. */
export const SITE_V2_CONTRAST = [
  { fg: 'ivory', bg: 'plum', ratio: 16.65 },
  { fg: 'ivory', bg: 'aubergine', ratio: 17.72 },
  { fg: 'rose', bg: 'plum', ratio: 10.11 },
  { fg: 'rose', bg: 'aubergine', ratio: 10.76 },
  { fg: 'mauveOnDark', bg: 'plum', ratio: 7.93 },
  { fg: 'mauveOnDark', bg: 'aubergine', ratio: 8.44 },
  { fg: 'ink', bg: 'ivory', ratio: 13.93 },
  { fg: 'ink', bg: 'blush', ratio: 12.64 },
  { fg: 'ink', bg: 'paleRose', ratio: 11.29 },
  { fg: 'ink', bg: 'roseMauve', ratio: 8.09 },
  { fg: 'mauve', bg: 'ivory', ratio: 4.95 },
  { fg: 'mauveDeep', bg: 'blush', ratio: 5.47 },
  { fg: 'mauveDeep', bg: 'paleRose', ratio: 4.88 },
  { fg: 'roseInk', bg: 'ivory', ratio: 5.70 },
  { fg: 'roseInk', bg: 'blush', ratio: 5.17 },
  { fg: 'roseInk', bg: 'paleRose', ratio: 4.62 },
  { fg: 'roseInkDeep', bg: 'roseMauve', ratio: 5.24 },
  { fg: 'inkSoft', bg: 'roseMauve', ratio: 5.59 },
  { fg: 'plum', bg: 'ivory', ratio: 16.65, note: 'primary button text' },
  { fg: 'plum', bg: 'roseMauve', ratio: 9.66 },
];

/** Pairs that fail AA for body text: never use them for words. */
export const SITE_V2_AVOID = [
  { fg: 'mauve', bg: 'plum', ratio: 3.36 },
  { fg: 'mauve', bg: 'blush', ratio: 4.49 },
  { fg: 'mauve', bg: 'roseMauve', ratio: 2.88 },
  { fg: 'roseInk', bg: 'roseMauve', ratio: 3.31 },
  { fg: 'rose', bg: 'ivory', ratio: 1.65 },
];

/**
 * Type. Instrument Sans is the brand face; its lightest cut is 400, so "thinner" means 400 (never 500+) for
 * display sizes, with tight tracking. IBM Plex Mono only for small truth labels.
 */
export const SITE_V2_TYPE = {
  fontSans: "var(--font-body, 'Instrument Sans'), 'Instrument Sans', system-ui, sans-serif",
  fontMono: "var(--font-mono, 'IBM Plex Mono'), 'IBM Plex Mono', ui-monospace, monospace",
  displayWeight: 400,
  bodyWeight: 400,
  /** Display sizes as CSS clamp() strings. */
  size: {
    displayXl: 'clamp(48px, 8.4vw, 136px)',
    display: 'clamp(44px, 6.6vw, 112px)',
    h2: 'clamp(38px, 5.2vw, 84px)',
    h3: 'clamp(26px, 2.6vw, 38px)',
    lede: 'clamp(18px, 1.5vw, 22px)',
    body: '17px',
    small: '14px',
    eyebrow: '11.5px',
  },
  tracking: { display: '-0.04em', h2: '-0.035em', h3: '-0.02em', body: '-0.003em', eyebrow: '0.22em' },
  leading: { display: 0.98, h2: 1.02, h3: 1.12, body: 1.65, lede: 1.55 },
};

/** Spacing: generous by default. Section padding is the big one; most screens hold one idea. */
export const SITE_V2_SPACE = {
  gutter: 'clamp(16px, 7vw, 120px)',
  section: 'clamp(112px, 18vh, 220px)',
  s1: '4px', s2: '8px', s3: '12px', s4: '16px', s5: '24px', s6: '32px', s7: '48px', s8: '64px', s9: '96px', s10: '144px',
  measure: '42ch',
};

export const SITE_V2_RADII = { pill: '999px', card: '28px', panel: '20px', sm: '12px' };

/** Motion. Transform and opacity only. Every effect has a static reduced-motion state. */
export const SITE_V2_MOTION = {
  easeOut: 'cubic-bezier(.16, 1, .3, 1)',
  easeInOut: 'cubic-bezier(.65, 0, .35, 1)',
  fast: '200ms',
  base: '450ms',
  slow: '900ms',
  /** Delay between words in a split-text reveal. */
  stagger: '55ms',
  /** Seconds for one loop of the ticker. */
  tickerSeconds: 38,
};

export const SITE_V2 = { colors: SITE_V2_COLORS, tones: SITE_V2_TONES, type: SITE_V2_TYPE, space: SITE_V2_SPACE, radii: SITE_V2_RADII, motion: SITE_V2_MOTION };
