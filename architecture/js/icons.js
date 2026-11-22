// Line icons for the ops page: 24 by 24, a 1.5 stroke in the colour of the text around them. Always next to a word
// (or a hidden word), so they are hidden from screen readers.

const P = {
  projects: 'M4 4h6.5v6.5H4zM13.5 4H20v6.5h-6.5zM4 13.5h6.5V20H4zM13.5 13.5H20V20h-6.5z',
  cube: 'M12 3l8 4.5v9L12 21l-8-4.5v-9zM4 7.5l8 4.5 8-4.5M12 12v9',
  people: 'M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M15.5 14.3c3 .4 5.5 2.7 5.5 5.7|c9,8,3|c17,9,2.5',
  settings: 'M4 7h9M17 7h3M15 4.5v5M4 17h3M11 17h9M9 14.5v5',
  site: 'M12 21s-6.5-5.6-6.5-10.5a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21z|c12,10.5,2.2',
  drawings: 'M6 3h9l4 4v14H6zM15 3v4h4M9 12h7M9 15.5h7M9 19h4',
  presentation: 'M3 4.5h18v11H3zM12 15.5V19M8 21l4-2 4 2',
  takeoff: 'M3.5 16.5l13-13 4 4-13 13zM7.5 12.5l2 2M10.5 9.5l2 2M13.5 6.5l2 2',
  deliverables: 'M3 6.5h6l2 2h10V19H3zM8.5 14l2.5 2.5 4.5-4.5',
  predesign: 'M9 3.5h6V6H9zM7 4.5H5V21h14V4.5h-2M8.5 11h7M8.5 14.5h7M8.5 18h4',
  concept: 'M4 20l1-4.5L16 4.5 19.5 8 8.5 19zM14 7l3 3',
  developed: 'M12 3.5l9 5-9 5-9-5zM3 12.5l9 5 9-5M3 16.5l9 5 9-5',
  detailed: 'M4 20V4l16 16zM8 16v-4.5l4.5 4.5z',
  contract: 'M14 3H6v18h6M14 3l4 4v4M14 3v4h4M9 10h5M9 13.5h3M14 21l6-6-2-2-6 6v2z',
  observation: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z|c12,12,3',
  completion: 'M4 11l8-7 8 7v9.5H4zM9 15l2.2 2.2L15.5 13',
  export: 'M12 15V3.5M7.5 8L12 3.5 16.5 8M5 14v6h14v-6',
  import: 'M12 3.5V15M7.5 10.5L12 15l4.5-4.5M5 14v6h14v-6',
  pack: 'M5 5a2 2 0 0 1 2-2h12v15H7a2 2 0 0 0-2 2zM5 20a2 2 0 0 0 2 1h12v-3M9 7.5h6',
  external: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6',
  back: 'M15 5l-7 7 7 7',
  next: 'M9 5l7 7-7 7',
  plus: 'M12 5v14M5 12h14',
  trash: 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  photo: 'M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6|c15.5,9,1.5',
  file: 'M6 3h9l4 4v14H6zM15 3v4h4',
  clock: 'M12 7v5l3 2|c12,12,8.5',
  addon: 'M5 5h14v14H5zM9 12h6M12 9v6',
};

/** an inline SVG icon by name; an unknown name draws nothing */
export function icon(name, cls = '') {
  const spec = P[name];
  if (!spec) return '';
  const body = spec.split('|').map((part) => {
    if (part.startsWith('c')) { const [cx, cy, r] = part.slice(1).split(','); return `<circle cx="${cx}" cy="${cy}" r="${r}" />`; }
    return `<path d="${part}" />`;
  }).join('');
  return `<svg class="ic${cls ? ` ${cls}` : ''}" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
}

/** the icon for each of the seven stages */
export const STAGE_ICON = { predesign: 'predesign', concept: 'concept', developed: 'developed', detailed: 'detailed', contract: 'contract', observation: 'observation', completion: 'completion' };
/** icons for add-on top-bar links that bring none of their own */
export const NAV_ICON = { models: 'cube', crm: 'people', clients: 'people' };
