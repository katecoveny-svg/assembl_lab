// assembl AR: shared styles for the parts that can appear on any page (the AR button, the code popover and the
// camera overlay), injected once so /ar/embed.js works on pages that don't load ar.css.
const CSS = `
.aar-btn{--aar-plum:#240B21;--aar-ink:#492B3E;--aar-paper:#FFFDFB;position:relative;display:inline-flex;align-items:center;gap:10px;min-height:46px;
 padding:11px 20px 11px 14px;border:0;border-radius:999px;background:var(--aar-plum);color:var(--aar-paper);overflow:hidden;
 font:500 15px/1.2 "Instrument Sans",system-ui,-apple-system,sans-serif;letter-spacing:-.005em;text-decoration:none;cursor:pointer;
 box-shadow:0 1px 0 rgba(36,11,33,.08),0 8px 22px -12px rgba(36,11,33,.55);-webkit-tap-highlight-color:transparent}
.aar-btn:hover{background:var(--aar-ink)}
.aar-btn:focus-visible{outline:2px solid #916A70;outline-offset:3px}
.aar-btn[disabled]{cursor:progress}
.aar-btn svg{width:24px;height:24px;flex:none}
.aar-btn img.aar-ql{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}
.aar-btn .aar-bar{position:absolute;left:0;bottom:0;height:3px;width:0;background:#916A70;transition:width .25s ease}
.aar-btn.aar-light{background:#FFFDFB;color:#240B21;box-shadow:inset 0 0 0 1px #D9CCD2}
.aar-btn.aar-light:hover{background:#F5F1F2}
.aar-wrap{position:relative;display:inline-flex;flex-direction:column;align-items:flex-start;gap:6px;max-width:100%}
.aar-note{margin:0;font:400 12px/1.4 "IBM Plex Mono",ui-monospace,monospace;color:#654A4E;max-width:34ch}
.aar-pop{position:absolute;z-index:60;top:calc(100% + 10px);left:0;width:min(300px,calc(100vw - 32px));padding:18px 18px 16px;border-radius:22px;
 background:#FFFDFB;color:#492B3E;box-shadow:0 0 0 1px #E6DCE0,0 24px 48px -24px rgba(36,11,33,.45);font:400 14px/1.45 "Instrument Sans",system-ui,sans-serif}
.aar-pop[hidden]{display:none}
.aar-pop .aar-qr{display:block;width:100%;height:auto;border-radius:14px}
.aar-pop h3{margin:12px 0 2px;font:500 17px/1.25 "Instrument Sans",system-ui,sans-serif;color:#240B21;letter-spacing:-.01em}
.aar-pop p{margin:0;color:#654A4E;font-size:13px}
.aar-pop .aar-x{position:absolute;top:8px;right:8px;width:34px;height:34px;border:0;border-radius:50%;background:#F5F1F2;color:#492B3E;font:500 18px/1 system-ui;cursor:pointer}
.aar-pop .aar-x:focus-visible{outline:2px solid #916A70;outline-offset:2px}
.aar-pop .aar-mono{display:block;margin-top:10px;font:400 11px/1.4 "IBM Plex Mono",ui-monospace,monospace;color:#916A70;word-break:break-all}
.aar-xr{position:fixed;inset:0;display:flex;flex-direction:column;justify-content:space-between;pointer-events:auto;touch-action:none;
 font:500 15px/1.35 "Instrument Sans",system-ui,sans-serif;color:#240B21;padding:max(14px,env(safe-area-inset-top)) 14px max(18px,env(safe-area-inset-bottom))}
.aar-xr-top{display:flex;align-items:center;gap:10px;padding:8px 8px 8px 16px;border-radius:999px;background:rgba(255,253,251,.92)}
.aar-xr-brand{font:400 12px "IBM Plex Mono",ui-monospace,monospace;color:#654A4E;white-space:nowrap}
.aar-xr-brand b{font-weight:500;color:#240B21}
.aar-xr-title{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.aar-xr-btn{border:0;border-radius:999px;padding:10px 16px;background:#240B21;color:#FFFDFB;font:500 14px "Instrument Sans",system-ui,sans-serif}
.aar-xr-bottom{display:flex;flex-direction:column;align-items:center;gap:10px}
.aar-xr-hint{margin:0;padding:10px 16px;border-radius:999px;background:rgba(255,253,251,.92);text-align:center;max-width:32ch}
.aar-xr-tools{display:flex;align-items:center;gap:8px;padding:6px 6px 6px 14px;border-radius:999px;background:rgba(255,253,251,.92)}
.aar-xr-tools[hidden]{display:none}
.aar-xr-scale{font:400 12px "IBM Plex Mono",ui-monospace,monospace;color:#492B3E}
@media (prefers-reduced-motion:reduce){.aar-btn .aar-bar{transition:none}}
`;
export function injectCSS() {
  if (typeof document === 'undefined' || document.getElementById('aar-css')) return;
  const s = document.createElement('style'); s.id = 'aar-css'; s.textContent = CSS;
  document.head.appendChild(s);
}

// The AR glyph: a cube inside placement brackets. Pure strokes, inherits the text colour.
export const AR_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7.5V4.8A1.8 1.8 0 0 1 4.8 3h2.7M16.5 3h2.7A1.8 1.8 0 0 1 21 4.8v2.7M21 16.5v2.7a1.8 1.8 0 0 1-1.8 1.8h-2.7M7.5 21H4.8A1.8 1.8 0 0 1 3 19.2v-2.7"/><path d="M12 6.6 16.6 9.2v5.4L12 17.3 7.4 14.6V9.2z"/><path d="M7.4 9.2 12 11.8l4.6-2.6M12 11.8v5.5"/></svg>`;

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
