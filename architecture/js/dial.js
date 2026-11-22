// The instruments: a speedo dial for a project's state, a big one for the practice's month, and a small gauge for the fee
// left. Plain SVG strings (so they print and test without a browser), coloured only through ops.css tokens:
//   --h-allgo --h-go --h-hold --h-pay   the four states          --h-short   below break-even
// Every dial carries its words beside it (money.js): the colour never says anything on its own, and turquoise and green
// differ in shape too (a tick against a dot), as do the holds (pause bars, a coin).
//
// The needle is drawn where it belongs. animateDials(root) then swings each needle once from rest to its place, the first
// time that reading is shown in this tab, and never again: nothing loops, and with reduced motion it does not move at all.
import { HEALTH_KEYS } from './money-model.js';

const CX = 100, CY = 100;
const SWEEP = 120; // degrees each side of twelve o'clock
const rad = (deg) => (deg * Math.PI) / 180;
const pt = (deg, r) => [CX + r * Math.sin(rad(deg)), CY - r * Math.cos(rad(deg))];
const f = (n) => Math.round(n * 100) / 100;
function arc(a0, a1, r) {
  const [x0, y0] = pt(a0, r), [x1, y1] = pt(a1, r);
  return `M${f(x0)} ${f(y0)}A${r} ${r} 0 ${Math.abs(a1 - a0) > 180 ? 1 : 0} 1 ${f(x1)} ${f(y1)}`;
}
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
let uid = 0;

/** the state icons, 24 by 24, stroked in the colour of the text beside them */
const ICON = {
  tick: '<circle cx="12" cy="12" r="9"/><path d="M7.5 12.5l3 3 6-6.5"/>',
  dot: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.6" fill="currentColor" stroke="none"/>',
  pause: '<circle cx="12" cy="12" r="9"/><path d="M9.5 8.5v7M14.5 8.5v7"/>',
  coin: '<circle cx="12" cy="12" r="9"/><path d="M14.6 9.2c-.5-.9-1.5-1.4-2.7-1.4-1.6 0-2.7.8-2.7 2 0 2.9 5.6 1.3 5.6 4.3 0 1.2-1.2 2-2.9 2-1.3 0-2.4-.6-2.9-1.5M12 6.5v1.3M12 16.2v1.3"/>',
  none: '<circle cx="12" cy="12" r="9" stroke-dasharray="2.2 2.6"/><path d="M9.8 9.6a2.3 2.3 0 1 1 3.3 2.1c-.7.4-1.1.9-1.1 1.7v.4M12 16.6v.2"/>',
  warn: '<path d="M12 4 3 19.5h18L12 4Z"/><path d="M12 10v4.5M12 17v.3"/>',
  below: '<path d="M12 5v14M6.5 13.5 12 19l5.5-5.5"/>',
  up: '<path d="M12 19V5M6.5 10.5 12 5l5.5 5.5"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
};
export const STATE_ICON = { allgo: 'tick', go: 'dot', hold: 'pause', payment: 'coin' };
export function stateIcon(name, cls = '') {
  return `<svg class="h-ic${cls ? ` ${cls}` : ''}" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICON[name] ?? ''}</svg>`;
}

/** where on the dial a state sits: the middle of its band, or low in the green when something wants watching */
export function needleAngle(state, { watch = false } = {}) {
  const i = HEALTH_KEYS.indexOf(state);
  if (i < 0) return -SWEEP;
  const band = (2 * SWEEP) / HEALTH_KEYS.length, mid = -SWEEP + band * (i + 0.5);
  return state === 'go' && watch ? mid - band * 0.3 : mid;
}

function ticks({ from = -SWEEP, to = SWEEP, minor = 4, major = 20, r = 69, small = false } = {}) {
  let out = '';
  for (let a = from; a <= to + 1e-6; a += minor) {
    const big = Math.abs(((a - from) % major)) < 1e-6 || Math.abs(((a - from) % major) - major) < 1e-6;
    if (small && !big) continue;
    const [x0, y0] = pt(a, r), [x1, y1] = pt(a, r - (big ? 8 : 4));
    out += `<line class="${big ? 'tk-maj' : 'tk-min'}" x1="${f(x0)}" y1="${f(y0)}" x2="${f(x1)}" y2="${f(y1)}"/>`;
  }
  return out;
}

function needle(angle, key, id, { len = 74 } = {}) {
  // a tapered blade with a counterweight: heavier at the hub, a fine tip
  const blade = `M${CX - 3.2} ${CY + 2}L${CX - 0.8} ${CY - len}L${CX + 0.8} ${CY - len}L${CX + 3.2} ${CY + 2}Z`;
  return `<g class="dl-needle" data-needle data-key="${esc(key)}" data-to="${f(angle)}" transform="rotate(${f(angle)} ${CX} ${CY})" filter="url(#sh${id})">
      <path class="nd-blade" d="${blade}"/><circle class="nd-weight" cx="${CX}" cy="${CY + 13}" r="4.2"/><rect class="nd-tail" x="${CX - 1.6}" y="${CY}" width="3.2" height="12"/></g>
    <circle class="nd-hub" cx="${CX}" cy="${CY}" r="7.5"/><circle class="nd-cap" cx="${CX}" cy="${CY}" r="2.6"/>`;
}
const defs = (id) => `<defs><filter id="sh${id}" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="1.4" dy="2.2" stdDeviation="1.6" flood-color="var(--h-shadow, #000)" flood-opacity=".28"/></filter>
  <radialGradient id="fc${id}" cx="50%" cy="58%" r="62%"><stop offset="0" class="fc-in"/><stop offset="1" class="fc-out"/></radialGradient></defs>`;

/**
 * A project's dial. h is health() from money-model.js. small: the version for a project tile.
 * Returns an <svg> with role="img" and a full description; the label and the came-from line are written beside it by money.js.
 */
export function healthDial(h, { small = false, key = '', title = '' } = {}) {
  const id = ++uid, state = h?.state ?? null, watch = !!h?.watch?.length;
  const band = (2 * SWEEP) / HEALTH_KEYS.length, gap = small ? 3 : 1.6, r = 82, w = small ? 13 : 10;
  const bands = HEALTH_KEYS.map((k, i) => {
    const a0 = -SWEEP + band * i + gap / 2, a1 = -SWEEP + band * (i + 1) - gap / 2;
    return `<path class="bd bd-${k}${k === state ? ' on' : ''}" d="${arc(a0, a1, r)}" stroke-width="${w}"/>`;
  }).join('');
  const angle = needleAngle(state, { watch });
  const desc = title || (state ? `${h.label}. ${h.line}` : h?.line || 'Not enough to tell');
  return `<svg class="dial hdial${small ? ' sm' : ''}${state ? ` is-${state}` : ' is-none'}" viewBox="0 0 200 200" role="img" aria-label="${esc(desc)}" focusable="false">${defs(id)}
    <circle class="face" cx="${CX}" cy="${CY}" r="${small ? 95 : 96}" fill="url(#fc${id})"/>
    ${small ? '' : `<circle class="bezel" cx="${CX}" cy="${CY}" r="96"/><circle class="bezel-in" cx="${CX}" cy="${CY}" r="91"/>`}
    ${bands}<g class="ticks">${ticks({ r: small ? 72 : 73, small })}</g>
    ${small ? '' : `<g class="dl-ic" transform="translate(${CX - 9} ${CY + 22}) scale(.75)">${ICON[state ? STATE_ICON[state] : 'none'].replace(/<(circle|path)/g, '<$1 class="ic"')}</g>`}
    ${needle(angle, key || `${state}:${id}`, id, { len: small ? 70 : 74 })}</svg>`;
}

/**
 * The practice's month: revenue against break-even and the target band, on a big dial. mo is monthly() from
 * money-model.js; total is the month's revenue. With no break-even typed, the dial shows the needle and no bands.
 */
export function practiceDial({ total = 0, mo = {}, key = 'practice', label = '' } = {}) {
  const id = ++uid, be = mo.breakEven, low = mo.low, high = mo.high;
  const top = Math.max(high ?? 0, low ?? 0, be ?? 0, total) * 1.25 || 1;
  const at = (v) => -SWEEP + (Math.max(0, Math.min(top, v)) / top) * 2 * SWEEP;
  const r = 82, w = 12, segs = [];
  if (be != null) {
    segs.push(['short', 0, be]);
    if (low != null && low > be) segs.push(['go', be, low]);
    if (low != null && high != null) segs.push(['allgo', Math.max(low, be), high], ['allgo far', high, top]);
    else segs.push(['go', low != null ? Math.max(low, be) : be, top]);
  }
  const bands = segs.filter(([, a, b]) => b > a).map(([k, a, b]) => `<path class="bd pd-${k.replace(' ', ' pd-')} on" d="${arc(at(a) + 0.8, at(b) - 0.8, r)}" stroke-width="${w}"/>`).join('');
  const mark = (v, word, cls) => {
    if (v == null) return '';
    const a = at(v), [x0, y0] = pt(a, r + 9), [x1, y1] = pt(a, r - 12), [tx, ty] = pt(a, r + 19);
    const anchor = a < -20 ? 'end' : a > 20 ? 'start' : 'middle';
    return `<line class="pm ${cls}" x1="${f(x0)}" y1="${f(y0)}" x2="${f(x1)}" y2="${f(y1)}"/><text class="pm-t" x="${f(tx)}" y="${f(ty)}" text-anchor="${anchor}">${esc(word)}</text>`;
  };
  return `<svg class="dial pdial" viewBox="-26 -18 252 222" role="img" aria-label="${esc(label)}" focusable="false">${defs(id)}
    <circle class="face" cx="${CX}" cy="${CY}" r="96" fill="url(#fc${id})"/><circle class="bezel" cx="${CX}" cy="${CY}" r="96"/><circle class="bezel-in" cx="${CX}" cy="${CY}" r="91"/>
    ${be == null ? `<path class="bd bd-empty" d="${arc(-SWEEP, SWEEP, r)}" stroke-width="${w}"/>` : bands}
    <g class="ticks">${ticks({ r: 73 })}</g>
    ${mark(be, 'break-even', 'pm-be')}${mark(low, 'target', 'pm-lo')}${high != null && low != null && high !== low ? mark(high, '', 'pm-hi') : ''}
    ${needle(at(total), key, id)}</svg>`;
}

/** The fee left after the time so far, as a small half dial: right is all of it left, the red end is over the fee. */
export function feeGauge(p, { key = 'fee', label = '' } = {}) {
  const id = ++uid, lo = -0.25, hi = 1;
  const at = (v) => -90 + ((Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo)) * 180;
  const r = 82, share = p ? p.share : null;
  return `<svg class="dial fgauge" viewBox="0 6 200 104" role="img" aria-label="${esc(label)}" focusable="false">${defs(id)}
    <path class="bd pd-short on" d="${arc(-90, at(0) - 1, r)}" stroke-width="12"/><path class="bd fg-left on" d="${arc(at(0) + 1, 90, r)}" stroke-width="12"/>
    <g class="ticks">${ticks({ from: -90, to: 90, minor: 6, major: 36, r: 73 })}</g>
    ${share == null ? '' : needle(at(share), key, id, { len: 72 })}</svg>`;
}

// ---- the one swing ---------------------------------------------------------------------------------------------------
const seen = new Set();
const ease = (t) => { const s = 1.15; const u = t - 1; return 1 + u * u * ((s + 1) * u + s); }; // out, with one small overshoot
/** swing each needle under root from rest to its reading, once per reading per tab. Returns the number set moving. */
export function animateDials(root, { win = globalThis } = {}) {
  const needles = [...(root?.querySelectorAll?.('[data-needle]') ?? [])];
  const still = !win.matchMedia || win.matchMedia('(prefers-reduced-motion: reduce)').matches || !win.requestAnimationFrame;
  let moving = 0;
  for (const n of needles) {
    const to = Number(n.dataset.to), key = `${n.dataset.key}@${to}`;
    if (still || seen.has(key)) { seen.add(key); continue; }
    seen.add(key);
    const svg = n.ownerSVGElement, from = svg?.classList.contains('fgauge') ? -90 : -SWEEP;
    const t0 = win.performance?.now?.() ?? Date.now(), dur = 1100 + Math.min(500, Math.abs(to - from) * 2);
    n.setAttribute('transform', `rotate(${from} ${CX} ${CY})`);
    moving++;
    const step = (t) => {
      const k = Math.min(1, (t - t0) / dur), a = from + (to - from) * ease(k);
      n.setAttribute('transform', `rotate(${f(a)} ${CX} ${CY})`);
      if (k < 1 && n.isConnected) win.requestAnimationFrame(step);
    };
    win.requestAnimationFrame(step);
  }
  return moving;
}
/** for tests */
export const _forget = () => seen.clear();
