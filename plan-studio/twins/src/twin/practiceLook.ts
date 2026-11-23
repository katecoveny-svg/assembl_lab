// The 3D page opened from a practice's workspace (?from=ops) wears that workspace's look on its own chrome: panels, buttons,
// type. The 3D scene itself is not restyled. Opened any other way, the page keeps assembl's own look.
// The workspace keeps the last look it showed in this browser under LOOK_CACHE (architecture/js/theme.js); the two pages share an
// origin, so this page reads the same key. Only the looks the workspace offers are honoured; anything else is the default.
export const LOOK_CACHE = 'assembl.architecture.look';
export const LOOKS = ['assembl', 'sketch'] as const;
/** the practice's name, kept by the workspace in this browser when it opens the 3D page (models.js, site-sources.js) */
export const PRACTICE_CACHE = 'assembl.architecture.practice';
export type Look = (typeof LOOKS)[number];

/** which look the page should wear: the workspace's, only when opened from it */
export function pageLook(search: string, read: (k: string) => string | null): Look {
  if (new URLSearchParams(search).get('from') !== 'ops') return 'assembl';
  let v: string | null = null;
  try { v = read(LOOK_CACHE); } catch { /* storage closed: the default */ }
  return (LOOKS as readonly string[]).includes(v ?? '') ? (v as Look) : 'assembl';
}

// the sketch look, as the workspace has it (architecture/ops.css html[data-theme="sketch"]), mapped onto the 3D page's own names
const SKETCH = `
html[data-look="sketch"] { color-scheme: dark; --plum: #FFFFFF; --aub: #000000; --ivory: #0A0C14; --ink: #FFFFFF; --rose: #8BA2FF; --mauve: #9AA1B8; --blush: #000000; --pale: #121A3A; --line: #1E2334; --line2: #5A6488; }
html[data-look="sketch"] body, html[data-look="sketch"] header { background: #000; color: #D6D9E4; font-family: 'Hanken Grotesk', system-ui, sans-serif; }
html[data-look="sketch"] .mono, html[data-look="sketch"] .chip, html[data-look="sketch"] .card h3 { font-family: 'Hanken Grotesk', system-ui, sans-serif; }
html[data-look="sketch"] .brand .word { color: #FFFFFF; font-weight: 300; }
html[data-look="sketch"] .card { background: #0A0C14; border-color: #1E2334; color: #D6D9E4; }
html[data-look="sketch"] .pill { background: transparent; color: #FFFFFF; border-color: #5A6488; }
html[data-look="sketch"] .pill:hover { background: #121A3A; border-color: #8BA2FF; }
html[data-look="sketch"] .pill.on { background: #121A3A; border-color: #8BA2FF; }
html[data-look="sketch"] .pill.solid, html[data-look="sketch"] .pill[aria-pressed="true"] { background: #8BA2FF; color: #000; border-color: #8BA2FF; }
html[data-look="sketch"] input, html[data-look="sketch"] select { background: #060A1D; color: #FFFFFF; border-color: #5A6488; }
html[data-look="sketch"] .chip.ok { color: #FFFFFF; border-color: #8BA2FF; background: #121A3A; }
html[data-look="sketch"] .small { color: #9AA1B8; }
html[data-look="sketch"] a { color: #8BA2FF; }
html[data-look="sketch"] .dropzone .card, html[data-look="sketch"] .drop-card { background: rgba(10,12,20,.94) !important; color: #D6D9E4; }
html[data-look="sketch"] #status, html[data-look="sketch"] #cpChip { background: rgba(10,12,20,.92) !important; color: #D6D9E4 !important; border-color: #1E2334; }
html[data-look="sketch"] :focus-visible { outline-color: #8BA2FF; }
`;
const FONTS = 'https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@200..500&display=swap';

/** wear the look: marks <html data-look>, adds the look's few rules and, for sketch, its typeface */
export function applyPageLook(doc: Document = document, look: Look = pageLook(location.search, (k) => localStorage.getItem(k))): Look {
  const root = doc.documentElement;
  // opened from a practice's workspace: the practice's name in the header in place of assembl's, and no lab navigation bar
  if (new URLSearchParams(location.search).get('from') === 'ops') {
    let name = ''; try { name = (localStorage.getItem(PRACTICE_CACHE) ?? '').trim().slice(0, 60); } catch { /* none */ }
    root.dataset.from = 'ops';
    const brand = () => {
      const w = doc.querySelector('.brand .word'), k = doc.getElementById('kicker');
      if (w && name) { w.textContent = name; (w as HTMLElement).title = 'Opened from the practice’s workspace'; }
      if (k) k.textContent = 'walkthrough';
      doc.getElementById('al-nav')?.remove();
    };
    brand(); doc.addEventListener('DOMContentLoaded', brand); setTimeout(brand, 400); setTimeout(brand, 2000);
    if (!doc.getElementById('practice-chrome')) { const st = doc.createElement('style'); st.id = 'practice-chrome'; st.textContent = 'html[data-from="ops"] #al-nav{display:none!important} html[data-from="ops"] .brand .word{letter-spacing:.02em}'; doc.head.append(st); }
  }
  if (look === 'assembl') { delete root.dataset.look; return look; }
  root.dataset.look = look;
  if (!doc.getElementById('practice-look')) {
    const st = doc.createElement('style'); st.id = 'practice-look'; st.textContent = SKETCH; doc.head.append(st);
    const ln = doc.createElement('link'); ln.rel = 'stylesheet'; ln.href = FONTS; doc.head.append(ln);
  }
  return look;
}
