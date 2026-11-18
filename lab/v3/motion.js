// assembl lab motion (the assembl.co.nz system): headings slide up word by word, labels rise into their cells, the
// field assembles each window's picture. Pointing at a business twin turns the picture over to that twin.
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
const rise = $$(".sub, .cta, .chip, .k, .say, .open, .peek, .btn, .foot, .turn");
rise.forEach((el) => { el.classList.add("r"); const sib = el.closest("li") ? el.closest("li") : el; el.style.setProperty("--i", [...sib.parentElement.children].indexOf(sib) % 7); });

const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.3 });
if (reduce) $$(".words, .r, .word").forEach((el) => el.classList.add("in"));
else $$(".words, .r, .word").forEach((el) => io.observe(el));

// "See the model": turn the whole picture over, square by square, and back
for (const b of $$(".turn")) b.addEventListener("click", () => {
  const on = window.__field?.flipAll(b.getAttribute("aria-pressed") !== "true");
  b.setAttribute("aria-pressed", on ? "true" : "false"); b.textContent = on ? b.dataset.on : b.dataset.off;
  document.body.classList.toggle("turned", !!on);
});
document.addEventListener("field:flip", () => { document.body.classList.remove("turned"); $$(".turn").forEach((b) => { b.setAttribute("aria-pressed", "false"); b.textContent = b.dataset.off; }); });

// the twins: point at (or tab to) one and the picture behind turns over to it
const twins = document.getElementById("twins");
for (const a of $$(".twins .peek")) {
  const show = () => { if (!twins) return; twins.dataset.scene = a.dataset.twin; window.__field?.change(a.dataset.twin); $$(".twins .peek").forEach((p) => p.classList.toggle("on", p === a)); };
  a.addEventListener("pointerenter", show); a.addEventListener("focus", show);
}
