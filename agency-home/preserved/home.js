// assembl.co.nz motion: headings slide up word by word, labels rise into their cells, details open underneath on hover,
// focus or a tap. The field (field.js) assembles each screen's picture; the wordmark's letters rise into their band.
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
const rise = $$(".sub, .cta, .tour, .peek, .for, .btn, .foot, .turn");
rise.forEach((el) => { el.classList.add("r"); el.style.setProperty("--i", [...el.parentElement.children].indexOf(el) % 6); });

const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.3 });
if (reduce) $$(".words, .r, .word").forEach((el) => el.classList.add("in"));
else $$(".words, .r, .word").forEach((el) => io.observe(el));

document.addEventListener("click", (e) => { const p = e.target.closest(".peek"); if (p) p.classList.toggle("open"); });
document.addEventListener("keydown", (e) => { const p = e.target.closest?.(".peek"); if (p && (e.key === "Enter" || e.key === " ") && e.target === p) { e.preventDefault(); p.classList.toggle("open"); } });

// "See the house": turn the whole picture over, square by square, and back
for (const b of $$(".turn")) b.addEventListener("click", () => {
  const on = window.__field?.flipAll(b.getAttribute("aria-pressed") !== "true");
  b.setAttribute("aria-pressed", on ? "true" : "false"); b.textContent = on ? b.dataset.on : b.dataset.off;
  document.body.classList.toggle("turned", !!on);
});
document.addEventListener("field:flip", () => { document.body.classList.remove("turned"); $$(".turn").forEach((b) => { b.setAttribute("aria-pressed", "false"); b.textContent = b.dataset.off; }); });

// over the FAQ and the footer there is no picture behind the header, so it sits on a white bar to stay readable
const solidFrom = document.querySelector("#faq");
if (solidFrom) new IntersectionObserver(([e]) => document.body.classList.toggle("solid-top", e.isIntersecting || e.boundingClientRect.top < 0),
  { rootMargin: "0px 0px -100% 0px" }).observe(solidFrom);
