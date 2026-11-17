// Swiss-grid typesetting: each .giant word is broken into pairs of letters that step down and across the visible grid,
// one letter per cell, cropped by the cell like type set into a frame. Letters rise into their cells as the grid comes
// into view. Purely decorative (aria-hidden); the same words are written in the headings.
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

function set(el) {
  const word = el.dataset.word || "", box = el.parentElement, cs = getComputedStyle(box);
  const cols = +cs.getPropertyValue("--cols") || 12, phone = cols < 8, hero = el.dataset.at === "hero";
  const span = hero ? +(el.dataset.span || 2) : 1, size = +(el.dataset.chunk || 2), chunks = word.match(new RegExp(`.{1,${size}}`, "g")) || [];
  const c0h = +(el.dataset.c0 || 3), r0h = +(el.dataset.r0 || 2), step = +(el.dataset.step || 0);
  const rows = hero ? (+cs.getPropertyValue("--rows") || 4) : Math.max(4, 1 + chunks.length + (phone ? 1 : 0));
  if (!hero) box.style.setProperty("--rows", rows);
  let html = "", k = 0;
  chunks.forEach((pair, i) => {
    [...pair].forEach((ch, j) => {
      let c, r;
      if (phone) { const k = i * size + j; c = hero ? 1 + (k % 2) * 2 : 1 + ((i % 2) * 2) + j; r = (hero ? +(el.dataset.pr || 2) : 2) + (hero ? Math.floor(k / 2) : i); }
      else if (hero) { c = c0h + i * step + j * span + (step ? 0 : i * size * span); r = r0h + i; }
      else { const flip = box.classList.contains("flip"), c0 = flip ? 1 : cols - chunks.length * 2 + 1; c = c0 + i * 2 + j; r = 2 + i; }
      const crop = (i + j) % 3 === 0 ? "-8%" : (i + j) % 3 === 1 ? "6%" : "-2%";
      html += `<span class="g" style="grid-column:${c} / span ${span};grid-row:${r};--y:${crop};--k:${k++}"><i>${ch}</i></span>`;
    });
  });
  el.innerHTML = html;
}
const all = [...document.querySelectorAll(".giant")];
const run = () => all.forEach(set);
run();
let t; addEventListener("resize", () => { clearTimeout(t); t = setTimeout(run, 120); });
if (reduce) all.forEach((g) => g.classList.add("in"));
else {
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.35 });
  all.forEach((g) => io.observe(g));
}
