/* assembl lab · Agent-ready cars: the world's quiet sub-navigation, shared by /cars/, /cars/check/, /capture/ and
   /cars/dealer-twin/. It sits under the lab's own bar (or at the top of the page when there isn't one), never sticks, and
   carries no motion. Light and dark follow the page (prefers-color-scheme, or <html data-theme>). */
(() => {
  if (window.__labEmbed || document.getElementById("carnav")?.dataset.ready) return;
  const LINKS = [["/cars/", "Overview"], ["/cars/check/", "Car check"], ["/capture/", "3D capture"], ["/cars/dealer-twin/", "Dealer twin", true]];
  const here = location.pathname.replace(/index\.html$/, "");
  const active = LINKS.filter(([href]) => here.startsWith(href)).sort((a, b) => b[0].length - a[0].length)[0];
  const css = `
  .carnav{--cn-ink:#492B3E;--cn-quiet:#654A4E;--cn-line:rgba(73,43,62,.13);--cn-on:#240B21;position:relative;z-index:29;border-bottom:1px solid var(--cn-line);
    font:500 13px/1.2 "Instrument Sans",ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}
  @media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .carnav{--cn-ink:#F5F1F2;--cn-quiet:#CDB8BD;--cn-line:rgba(245,241,242,.13);--cn-on:#FFFDFB}}
  :root[data-theme="dark"] .carnav{--cn-ink:#F5F1F2;--cn-quiet:#CDB8BD;--cn-line:rgba(245,241,242,.13);--cn-on:#FFFDFB}
  .carnav-in{display:flex;align-items:center;padding:0 calc(max(22px,4vw) - 12px);min-height:46px}
  .carnav ol{display:flex;gap:2px;list-style:none;margin:0;padding:0;min-width:0}
  .carnav a{display:flex;align-items:center;gap:6px;min-height:46px;padding:0 12px;color:var(--cn-quiet)!important;text-decoration:none!important;white-space:nowrap;position:relative;border-radius:2px}
  .carnav a:hover{color:var(--cn-ink)!important}
  .carnav a[aria-current="page"]{color:var(--cn-on)!important}
  .carnav a[aria-current="page"]::after{content:"";position:absolute;left:12px;right:12px;bottom:-1px;height:2px;background:var(--cn-on);border-radius:2px}
  .carnav a:focus-visible{outline:2px solid #916A70;outline-offset:-4px}
  .carnav svg{width:11px;height:11px;flex:none;opacity:.75}
  @media (max-width:720px){.carnav-in{padding:0 8px}.carnav ol{width:100%;justify-content:space-between}.carnav a{padding:0 8px;font-size:13px}
    .carnav a[aria-current="page"]::after{left:8px;right:8px}}
  @media (max-width:360px){.carnav a{padding:0 5px;font-size:12px}.carnav svg{display:none}}`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
  const lock = '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><rect x="2.2" y="5.2" width="7.6" height="5.3" rx="1.2"/><path d="M4 5.2V3.9a2 2 0 0 1 4 0v1.3"/></svg>';
  const nav = document.getElementById("carnav") || document.createElement("nav");
  nav.id = "carnav"; nav.className = "carnav"; nav.setAttribute("aria-label", "Agent-ready cars"); nav.dataset.ready = "1";
  nav.innerHTML = `<div class="carnav-in"><ol>${LINKS.map(([href, label, locked]) =>
    `<li><a href="${href}"${active && active[0] === href ? ' aria-current="page"' : ""}>${label}${locked ? lock + '<span style="position:absolute;left:-9999px"> (private, sign-in only)</span>' : ""}</a></li>`).join("")}</ol></div>`;
  if (!nav.parentNode) document.body.insertBefore(nav, document.body.firstChild);
  // the lab's own bar names the world from the first path segment; /capture/ belongs to this one
  const fix = () => { const al = document.getElementById("al-nav"); if (!al) return false;
    if (al.nextSibling !== nav) al.after(nav);
    if (here.startsWith("/capture/")) { const c = al.querySelector(".al-current"); if (c) c.textContent = "/ Agent-ready cars"; const s = al.querySelector("select"); if (s) s.value = "cars"; }
    return true; };
  if (!fix()) { const mo = new MutationObserver(() => { if (fix()) mo.disconnect(); }); mo.observe(document.body, { childList: true }); setTimeout(() => mo.disconnect(), 4000); }
})();
