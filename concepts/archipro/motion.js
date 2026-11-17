// Editorial motion: blocks rise into place as they arrive, headings slide up word by word inside their own masks, rules
// draw across, large numerals count up once, giant letters drift against the scroll, and the marquee bands move with
// the page. Details sit underneath and open on hover, focus or a tap. Everything is still under reduced motion.
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// ---------------------------------------------------------------------------------------------- headings, word by word
for (const el of $$(".sec-k h2, .cover h2, .hero h1, .lede, .cloud-head h2, .me p")) {
  if (el.dataset.words) continue; el.dataset.words = "1"; el.classList.add("words");
  let k = 0;
  const walk = (node) => {
    for (const n of [...node.childNodes]) {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((t) => {
          if (!t) return;
          if (/^\s+$/.test(t)) frag.append(document.createTextNode(t));
          else { const w = document.createElement("span"), i = document.createElement("span"); w.className = "w"; i.textContent = t; i.style.setProperty("--k", k++); w.append(i); frag.append(w); }
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && !n.classList.contains("w")) walk(n);
    }
  };
  walk(el);
}

// ---------------------------------------------------------------------------------------------- blocks and rules
const RISE = ".truth li, .fact-row li, .cloud-head, .cover-c, .console, .seen, .measure, .spec-brief fieldset, .compare, .schedule, .ds-stage, .ds-levers, .ds-figs li, .ds-tabs, .ds-paper, .ds-actions, .ck, .twin, .board, .site, .profile, .clock, .qc, .runs li, .sp, .rules li, .steps li, .me .btn, .marquee";
const DRAW = ".fact-row li, .ds-figs li, .runs li, .steps li, .clock, .sec-k, .measure, .board, .rules, .ds-levers, .schedule";
function mark(root = document) {
  for (const el of $$(RISE, root)) if (!el.classList.contains("r")) { el.classList.add("r"); el.style.setProperty("--i", [...el.parentElement.children].indexOf(el) % 6); io.observe(el); }
  for (const el of $$(DRAW, root)) if (!el.classList.contains("draw")) { el.classList.add("draw"); io.observe(el); }
}
const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); count(e.target); io.unobserve(e.target); } }), { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
const wio = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); wio.unobserve(e.target); } }), { threshold: 0.3 });
if (reduce) document.documentElement.classList.add("still");
$$(".words").forEach((el) => (reduce ? el.classList.add("in") : wio.observe(el)));
mark();
// lists that redraw (the catalogue trace, the schedule, the checks) bring their new blocks in too
// (they arrive already in place: no fade on every slider move)
const settle = (n, sel, cls) => [n, ...(n.querySelectorAll?.(sel) || [])].forEach((el) => el.matches?.(sel) && el.classList.add(cls, "in"));
new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1) { settle(n, RISE, "r"); settle(n, DRAW, "draw"); } }).observe(document.querySelector("main"), { childList: true, subtree: true });

// ---------------------------------------------------------------------------------------------- the square reveal
// Pictures, sheets, covers and figures open cell by cell, like the field behind the page: a grid of white squares over
// each one lifts away in a broken diagonal as it scrolls in.
const SQUARE = ".cover, .hero-stage, .ds-stage, .ds-paper, .twin, .record, .site, .runs li, .ds-figs li, .fact-row li, .compare, .clock";
const sqio = new IntersectionObserver((es) => es.forEach((e) => {
  if (!e.isIntersecting) return; const h = e.target; sqio.unobserve(h); h.classList.add("sq-in");
  setTimeout(() => h.querySelector(":scope > .sq")?.remove(), 2200);
}), { threshold: 0.18 });
function squares() {
  if (reduce) return;
  for (const h of $$(SQUARE)) {
    if (h.classList.contains("sq-host")) continue;
    const r = h.getBoundingClientRect(); if (r.width < 40 || r.height < 30) continue;
    const cols = Math.max(3, Math.min(14, Math.round(r.width / 96))), size = r.width / cols, rows = Math.max(1, Math.min(10, Math.round(r.height / size)));
    let cells = ""; for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const d = ((x / cols) * 0.45 + (y / rows) * 0.25 + Math.random() * 0.5) * 0.9;
      cells += `<i style="--d:${d.toFixed(3)}s"></i>`;
    }
    h.classList.add("sq-host"); h.insertAdjacentHTML("beforeend", `<div class="sq" aria-hidden="true" style="--c:${cols};--r:${rows}">${cells}</div>`); sqio.observe(h);
  }
}
squares();

// ---------------------------------------------------------------------------------------------- numerals count up, once
function count(el) {
  const b = el.matches?.(".fact-row li, .ds-figs li, .runs li") ? el.querySelector("b") : null;
  if (!b || b.dataset.counted || reduce) return;
  const node = [...b.childNodes].find((n) => n.nodeType === 3 && /\d/.test(n.textContent)); if (!node) return;
  const m = node.textContent.match(/^(\D*)([\d,]+(?:\.\d+)?)(.*)$/); if (!m) return;
  b.dataset.counted = "1";
  const [, pre, num, post] = m, dec = (num.split(".")[1] || "").length, target = parseFloat(num.replace(/,/g, "")), comma = num.includes(",");
  const t0 = performance.now(), dur = 1400;
  const step = (now) => {
    const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 4), v = target * e;
    let s = v.toFixed(dec); if (comma) s = Number(s).toLocaleString("en-NZ", { minimumFractionDigits: dec, maximumFractionDigits: dec });
    node.textContent = pre + s + post; if (p < 1) requestAnimationFrame(step); else node.textContent = pre + num + post;
  };
  requestAnimationFrame(step);
}

// ---------------------------------------------------------------------------------------------- drift and marquee, with the scroll
const covers = $$(".cover"), bands = $$(".marquee span");
let tick = 0;
function drift() {
  tick = 0; const H = innerHeight;
  for (const c of covers) {
    const r = c.getBoundingClientRect(); if (r.bottom < 0 || r.top > H) continue;
    const p = (r.top + r.height / 2 - H / 2) / H;   // -1 … 1 across the screen
    c.style.setProperty("--drift", `${(p * -46).toFixed(1)}px`);
  }
  bands.forEach((b, i) => { const r = b.getBoundingClientRect(); if (r.bottom < -200 || r.top > H + 200) return; b.style.transform = `translate3d(${(-(scrollY * (0.32 + i * 0.06)) % (b.scrollWidth / 2)).toFixed(1)}px,0,0)`; });
}
if (!reduce) { addEventListener("scroll", () => { if (!tick) tick = requestAnimationFrame(drift); }, { passive: true }); drift(); }

// ---------------------------------------------------------------------------------------------- details underneath: a tap opens them on touch screens
document.addEventListener("click", (e) => {
  const p = e.target.closest(".peek"); if (!p || e.target.closest("button:not(.peek), a, input, select, [contenteditable=true]")) return;
  p.classList.toggle("open");
});
document.addEventListener("keydown", (e) => { const p = e.target.closest?.(".peek"); if (p && (e.key === "Enter" || e.key === " ") && e.target === p) { e.preventDefault(); p.classList.toggle("open"); } });
