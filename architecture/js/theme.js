// The look of the workspace. Two themes: "assembl" (the default: warm white ground, plum ink) and "sketch" (black
// ground, thin blue line drawings, white type). The colours and type for each are in ops.css, under
// html[data-theme="sketch"]; with no data-theme on <html> the page looks exactly as it always has.
//
// Who chooses:
//   signed in, with a practice in use   the practice's choice, kept in practice.extra.theme (an owner changes it)
//   signed out, or browser only          this browser's choice, kept as the "look" setting in this browser
// The last look shown is also kept under LOOK_CACHE, so the next visit opens in it before sign-in has answered.

export const THEMES = {
  assembl: { label: 'assembl', says: 'Warm white ground, plum ink.' },
  sketch: { label: 'sketch', says: 'Black ground, thin blue line drawings, white type.' },
};
export const DEFAULT_THEME = 'assembl';
export const LOOK_SETTING = 'look'; // the browser's own choice: store.save('setting', { id: 'look', value })
export const LOOK_CACHE = 'assembl.architecture.look';
/** the sketch theme's typefaces, loaded only when the sketch theme is shown */
export const FONT_HREF = 'https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@200..500&family=Spectral:ital,wght@1,300&display=swap';
export const FONT_LINK_ID = 'look-fonts';

export const isTheme = (t) => typeof t === 'string' && Object.hasOwn(THEMES, t);

/**
 * Which look to show, and whose choice it is.
 *   practice   the practice in use (with its theme read from the shared records), or null when records are in this browser
 *   browser    this browser's own choice
 */
export function pickTheme({ practice = null, browser = '' } = {}) {
  if (practice) return { theme: isTheme(practice.theme) ? practice.theme : DEFAULT_THEME, scope: 'practice' };
  return { theme: isTheme(browser) ? browser : DEFAULT_THEME, scope: 'browser' };
}

/** Show a theme: mark <html>, load the sketch typefaces the first time they are needed, and remember it for next time. */
export function applyTheme(doc, theme, storage = null) {
  const t = isTheme(theme) ? theme : DEFAULT_THEME, root = doc.documentElement;
  if (t === DEFAULT_THEME) { delete root.dataset.theme; } else {
    root.dataset.theme = t;
    if (!doc.getElementById(FONT_LINK_ID)) {
      const link = doc.createElement('link');
      link.id = FONT_LINK_ID; link.rel = 'stylesheet'; link.href = FONT_HREF;
      doc.head.append(link);
    }
  }
  try { storage?.setItem(LOOK_CACHE, t); } catch { /* not remembered: the next visit opens in the default until sign-in answers */ }
  return t;
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** a small preview of each theme, drawn in that theme's own colours whatever the page is showing */
const SWATCH = {
  assembl: { ground: '#FFFDFB', line: '#654A4E', ink: '#654A4E', rule: 'rgba(101,74,78,.28)' },
  sketch: { ground: '#000000', line: '#8BA2FF', ink: '#FFFFFF', rule: '#2C3452' },
};
function swatch(t) {
  const c = SWATCH[t];
  return `<svg class="look-sw" viewBox="0 0 160 100" aria-hidden="true" focusable="false"><rect width="160" height="100" fill="${c.ground}" />`
    + `<rect x="8.5" y="8.5" width="143" height="83" fill="none" stroke="${c.rule}" />`
    + `<path d="M28 74V48L56 30L84 48V74M24 51L56 30L88 51M50 74V60H62V74" fill="none" stroke="${c.line}" stroke-width="1.25" stroke-linejoin="round" />`
    + `<path d="M100 36H138M100 46H130M100 56H134" stroke="${c.ink}" stroke-width="3" stroke-linecap="round" opacity=".85" />`
    + `<path d="M20 74H140" stroke="${c.line}" stroke-width="1" /></svg>`;
}

/**
 * The look chooser: one button per theme, the one shown pressed. Buttons carry data-look; app.js does the saving.
 *   theme      the look in use     scope   'practice' | 'browser'     canChange   false: shown, not changeable
 *   practice   the practice's name, for the words
 */
export function lookChoiceHtml({ theme = DEFAULT_THEME, scope = 'browser', canChange = true, practice = '', busy = false } = {}) {
  const whose = scope === 'practice'
    ? `${canChange ? '■ For everyone in' : '□ Chosen by an owner of'} ${esc(practice || 'the practice')}.`
    : '■ For this browser only.';
  const off = !canChange || busy ? ' disabled' : '';
  return `<div class="look" role="group" aria-label="Look of the workspace">${Object.entries(THEMES).map(([key, t]) => `<button type="button" class="look-opt" data-look="${key}" aria-pressed="${key === theme}"${off}>${swatch(key)}<span class="look-name">${esc(t.label)}</span><span class="look-says">${esc(t.says)}</span></button>`).join('')}</div>
    <p class="st look-whose">${whose}</p>`;
}
