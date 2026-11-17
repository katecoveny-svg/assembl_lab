// assembl.co.nz motion: headings slide up word by word, labels rise into their cells, details open underneath on hover,
// focus or a tap. The field (field.js) assembles each screen's picture; the giant letters (typeset.js) rise into the grid.
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

for (const el of $$("h1, h2")) {
  el.classList.add("words"); let k = 0;
  const walk = (node) => [...node.childNodes].forEach((n) => {
    if (n.nodeType === 3) {
      const f = document.createDocumentFragment();
      n.textContent.split(/(\s+)/).forEach((t) => { if (!t) return; if (/^\s+$/.test(t)) f.append(t); else { const w = document.createElement("span"), i = document.createElement("span"); w.className = "w"; i.textContent = t; i.style.setProperty("--k", k++); w.append(i); f.append(w); } });
      n.replaceWith(f);
    } else if (n.nodeType === 1) walk(n);
  });
  walk(el);
}
const rise = $$(".k, .sub, .cta, .t, .n, .cap, .peek, .for, .btn, .foot");
rise.forEach((el) => { el.classList.add("r"); el.style.setProperty("--i", [...el.parentElement.children].indexOf(el) % 6); });

const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.3 });
if (reduce) $$(".words, .r").forEach((el) => el.classList.add("in"));
else $$(".words, .r").forEach((el) => io.observe(el));

document.addEventListener("click", (e) => { const p = e.target.closest(".peek"); if (p) p.classList.toggle("open"); });
document.addEventListener("keydown", (e) => { const p = e.target.closest?.(".peek"); if (p && (e.key === "Enter" || e.key === " ") && e.target === p) { e.preventDefault(); p.classList.toggle("open"); } });
