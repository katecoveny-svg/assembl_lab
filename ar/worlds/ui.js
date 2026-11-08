// assembl AR worlds: small shared bits of markup for the gallery, the launcher and the page buttons.
import { MODES } from './worlds.js';
import { esc } from '../js/ui.js';
export { esc };

export const ICON = {
  table: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4.5 16.5 7v4.6L12 14.1 7.5 11.6V7z"/><path d="M7.5 7 12 9.6 16.5 7M12 9.6v4.5"/><path d="M3 17.5h18M5.5 17.5V20M18.5 17.5V20"/></svg>',
  inside: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.5 20.5V4.8a1.3 1.3 0 0 1 1.3-1.3h8.4a1.3 1.3 0 0 1 1.3 1.3v15.7"/><path d="M3.5 20.5h17"/><path d="M10 12.2h.01M12.5 15.5l2.2-2.2-2.2-2.2M14.5 13.3H9"/></svg>',
  ar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7.5V4.8A1.8 1.8 0 0 1 4.8 3h2.7M16.5 3h2.7A1.8 1.8 0 0 1 21 4.8v2.7M21 16.5v2.7a1.8 1.8 0 0 1-1.8 1.8h-2.7M7.5 21H4.8A1.8 1.8 0 0 1 3 19.2v-2.7"/><path d="M12 6.6 16.6 9.2v5.4L12 17.3 7.4 14.6V9.2z"/><path d="M7.4 9.2 12 11.8l4.6-2.6M12 11.8v5.5"/></svg>'
};
export const chips = w => w.labels.map((l, i) => `<span class="w-chip${i ? ' quiet' : ''}">${esc(l)}</span>`).join('');
export const modeLabel = (w, m) => m === 'table' ? MODES.table.name : (w.inside.verb === 'Giant' ? 'Giant' : MODES.inside.name);
// a mode button's inner markup: icon, name, and the size note
const after = n => (n.includes(': ') ? n.slice(n.indexOf(': ') + 2).trim() : n);   // "Giant: an Earth 3 m across" → the part after the label (but keep 1:8)
const cap = t => t.charAt(0).toUpperCase() + t.slice(1);
export const modeInner = (w, m) => `<span class="w-ic">${ICON[m]}${esc(modeLabel(w, m))}</span><small>${esc(cap(after(m === 'table' ? w.table.note : w.inside.note)))}</small>`;
