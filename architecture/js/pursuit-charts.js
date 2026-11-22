// Pursuit studio: the programme as bars and the NZIA stages as a wheel. Plain SVG strings, so they draw on screen, print in
// the pack and test without a browser. Coloured only through the page's tokens (pursuit.css: .pc-*), so both looks work and
// paper prints in the assembl look. Nothing is drawn that the practice did not type: a stage without weeks is drawn as a
// dashed "weeks to add" row, never as a guessed length.
import { STAGES } from './model.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const r1 = (n) => Math.round(n * 10) / 10;

/**
 * Bars by stage (rows from pursuit-model.js programmeRows). Each bar runs from the stage's first week to its last, with a
 * diamond at its end for the hold point. Weeks along the bottom.
 */
export function programmeSvg(rows, { width = 680, title = 'Programme by the NZIA stages' } = {}) {
  const left = 168, right = 26, top = 30, rowH = 34, axis = 34, n = Math.max(rows.length, 1);
  const height = top + n * rowH + axis;
  const total = Math.max(1, rows.reduce((a, r) => a + (r.weeks ?? 0), 0));
  const span = width - left - right, x = (w) => left + (w / total) * span;
  const step = total <= 12 ? 1 : total <= 30 ? 2 : total <= 60 ? 4 : total <= 120 ? 8 : 13;
  const ticks = []; for (let w = 0; w <= total + 1e-9; w += step) ticks.push(w);
  if (ticks.at(-1) !== total) ticks.push(total);
  const parts = [`<svg class="pc pc-prog" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-labelledby="pc-prog-t pc-prog-d" xmlns="http://www.w3.org/2000/svg">`,
    `<title id="pc-prog-t">${esc(title)}</title>`,
    `<desc id="pc-prog-d">${esc(rows.length ? rows.map((r) => `${r.n}. ${r.label}: ${r.weeks != null ? `${r.weeks} weeks, weeks ${r1(r.from)} to ${r1(r.to)}` : 'weeks not typed yet'}`).join('. ') : 'No stages in scope yet.')}</desc>`];
  for (const w of ticks) parts.push(`<line class="pc-grid" x1="${r1(x(w))}" y1="${top - 8}" x2="${r1(x(w))}" y2="${top + n * rowH}"/>`, `<text class="pc-tick" x="${r1(x(w))}" y="${top + n * rowH + 18}" text-anchor="middle">${r1(w)}</text>`);
  parts.push(`<text class="pc-axis" x="${width - right}" y="${top + n * rowH + 32}" text-anchor="end">weeks</text>`);
  if (!rows.length) parts.push(`<text class="pc-empty" x="${left}" y="${top + rowH / 2 + 4}">Tick the stages in scope and type the weeks for each.</text>`);
  rows.forEach((r, i) => {
    const y = top + i * rowH, mid = y + rowH / 2;
    parts.push(`<text class="pc-lab" x="${left - 12}" y="${mid + 4}" text-anchor="end"><tspan class="pc-num">${r.n}</tspan>  ${esc(r.label)}</text>`);
    if (r.weeks == null) {
      parts.push(`<rect class="pc-todo" x="${left}" y="${y + 8}" width="${r1(Math.min(span, 150))}" height="${rowH - 16}"/>`, `<text class="pc-todo-t" x="${left + 10}" y="${mid + 4}">weeks to add</text>`);
      return;
    }
    const x0 = x(r.from), x1 = x(r.to), wpx = Math.max(2, x1 - x0);
    parts.push(`<rect class="pc-bar" x="${r1(x0)}" y="${y + 8}" width="${r1(wpx)}" height="${rowH - 16}"><title>${esc(`${r.label}: ${r.weeks} weeks`)}</title></rect>`);
    if (wpx > 44) parts.push(`<text class="pc-bar-t" x="${r1(x0 + 8)}" y="${mid + 4}">${r1(r.weeks)} wk</text>`);
    else parts.push(`<text class="pc-tick" x="${r1(x1 + 12)}" y="${mid + 4}">${r1(r.weeks)} wk</text>`);
    parts.push(`<path class="pc-hold" d="M${r1(x1)} ${mid - 7}l7 7-7 7-7-7z"><title>${esc(`Hold point: ${r.hold}`)}</title></path>`);
  });
  parts.push(`<path class="pc-hold" d="M${left} 9l6 6-6 6-6-6z"/><text class="pc-key" x="${left + 12}" y="19">hold point: the buyer signs off before the next stage</text>`, '</svg>');
  return parts.join('');
}

/** a point on a circle, angle in degrees clockwise from the top */
const at = (cx, cy, r, deg) => { const a = ((deg - 90) * Math.PI) / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; };
function segment(cx, cy, r0, r1_, a0, a1) {
  const [x0, y0] = at(cx, cy, r1_, a0), [x1, y1] = at(cx, cy, r1_, a1), [x2, y2] = at(cx, cy, r0, a1), [x3, y3] = at(cx, cy, r0, a0), big = a1 - a0 > 180 ? 1 : 0;
  return `M${r1(x0)} ${r1(y0)}A${r1_} ${r1_} 0 ${big} 1 ${r1(x1)} ${r1(y1)}L${r1(x2)} ${r1(y2)}A${r0} ${r0} 0 ${big} 0 ${r1(x3)} ${r1(y3)}Z`;
}
/** The seven NZIA stages as a ring; the stages in scope are filled. Numbers on the ring, names in the key beside it. */
export function stageWheelSvg(scope = [], { size = 300, title = 'The NZIA stages in scope' } = {}) {
  const w = size + 250, cx = size / 2, cy = size / 2, r0 = size * 0.26, r1_ = size * 0.47, gap = 2.2, seg = 360 / STAGES.length;
  const inScope = STAGES.filter((s) => scope.includes(s.key));
  const nums = inScope.map((s) => STAGES.indexOf(s) + 1);
  const parts = [`<svg class="pc pc-wheel" viewBox="0 0 ${w} ${size}" width="${w}" height="${size}" role="img" aria-labelledby="pc-wh-t pc-wh-d" xmlns="http://www.w3.org/2000/svg">`,
    `<title id="pc-wh-t">${esc(title)}</title>`, `<desc id="pc-wh-d">${esc(inScope.length ? `In scope: ${inScope.map((s) => s.label).join(', ')}.` : 'No stages ticked yet.')}</desc>`];
  STAGES.forEach((s, i) => {
    const on = scope.includes(s.key), a0 = i * seg + gap / 2, a1 = (i + 1) * seg - gap / 2;
    parts.push(`<path class="pc-seg${on ? ' on' : ''}" d="${segment(cx, cy, r0, r1_, a0, a1)}"><title>${esc(`${i + 1}. ${s.label}${on ? ', in scope' : ''}`)}</title></path>`);
    const [tx, ty] = at(cx, cy, (r0 + r1_) / 2, (a0 + a1) / 2);
    parts.push(`<text class="pc-seg-n${on ? ' on' : ''}" x="${r1(tx)}" y="${r1(ty + 6)}" text-anchor="middle">${i + 1}</text>`);
  });
  const centre = nums.length ? (nums.length > 1 && nums.every((n, i) => i === 0 || n === nums[i - 1] + 1) ? `${nums[0]}–${nums.at(-1)}` : nums.join(', ')) : 'none';
  parts.push(`<text class="pc-c-lab" x="${cx}" y="${cy - 8}" text-anchor="middle">STAGES</text>`, `<text class="pc-c-num" x="${cx}" y="${cy + 22}" text-anchor="middle">${esc(centre)}</text>`);
  STAGES.forEach((s, i) => {
    const on = scope.includes(s.key), y = 34 + i * ((size - 58) / 6);
    parts.push(`<rect class="pc-key-sw${on ? ' on' : ''}" x="${size + 18}" y="${r1(y - 12)}" width="16" height="16"/>`, `<text class="pc-key-t${on ? ' on' : ''}" x="${size + 44}" y="${r1(y + 1)}">${i + 1}. ${esc(s.label)}</text>`);
  });
  parts.push('</svg>');
  return parts.join('');
}
