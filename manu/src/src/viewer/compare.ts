// Compare two birds: the table of all eight is the page without script; this adds a pair
// view on top, with the real lengths drawn to one scale. The choice lives in the address
// (?a=tui&b=kereru) so a teacher can send a pair.

interface Fact { t: string; src: string[] }
interface Bird { reo: string; mid: string; en: string; sci: string; len: number; lenSrc: string[]; weight: string; weightSrc: string[]; found: string; foundSrc: string[]; bill: Fact | null; diet: Fact; status: string; tone: string; quals: string[]; form: string; flora: string }
interface Data { birds: Record<string, Bird>; refs: Record<string, { n: number; short: string; org: string }>; base: string }

const data = JSON.parse(document.getElementById('cmp-data')!.textContent!) as Data;
const pick = document.querySelector<HTMLElement>('.mt-pick')!;
const selA = document.querySelector<HTMLSelectElement>('#cmp-a')!;
const selB = document.querySelector<HTMLSelectElement>('#cmp-b')!;
const pair = document.querySelector<HTMLElement>('.mt-pair')!;
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const refs = (ids: string[]) =>
  `<span class="mt-refs">${ids.map((id) => `<a class="mt-ref" href="#src-${data.refs[id].n}" aria-label="${esc(data.refs[id].short)}, source ${data.refs[id].n}">${esc(data.refs[id].short)}</a>`).join('')}</span>`;

const q = new URLSearchParams(location.search);
if (q.get('a') && data.birds[q.get('a')!]) selA.value = q.get('a')!;
if (q.get('b') && data.birds[q.get('b')!]) selB.value = q.get('b')!;

function card(k: string, longest: number) {
  const b = data.birds[k];
  const w = ((b.len / longest) * 100).toFixed(1);
  return `<article class="mt-pair-card" aria-labelledby="pc-${k}">
<a class="mt-pair-img" href="${data.base}${k}/" tabindex="-1" aria-hidden="true"><img src="${data.base}stills/${k}-640.webp" width="640" height="512" alt="" loading="lazy" decoding="async"></a>
<h2 id="pc-${k}" class="mt-pair-name"><a href="${data.base}${k}/" lang="mi">${esc(b.reo)}</a></h2>
<p class="mt-pair-en">${esc(b.en)} · <i lang="la">${esc(b.sci)}</i></p>
<dl class="mt-pair-dl">
<div><dt>Real length</dt><dd><span class="mt-scale" style="--w:${w}%"><span></span></span>${b.len} cm ${refs(b.lenSrc)}</dd></div>
<div><dt>Weight</dt><dd>${esc(b.weight)} ${refs(b.weightSrc)}</dd></div>
<div><dt>Bill</dt><dd>${b.bill ? `${esc(b.bill.t)} ${refs(b.bill.src)}` : '<span class="mt-muted">Not described in these sources</span>'}</dd></div>
<div><dt>Diet</dt><dd>${esc(b.diet.t)} ${refs(b.diet.src)}</dd></div>
<div><dt>Status (2021)</dt><dd><span class="mt-status-pill ${b.tone}">${esc(b.status)}</span>${b.quals.length ? ` <span class="mt-muted">Qualifiers: ${esc(b.quals.join(', '))}</span>` : ''} ${refs(['nztcs-2021'])}</dd></div>
</dl>
</article>`;
}

function render() {
  const a = selA.value;
  const b = selB.value;
  const longest = Math.max(data.birds[a].len, data.birds[b].len);
  const ratio = data.birds[a].len >= data.birds[b].len ? data.birds[a].len / data.birds[b].len : data.birds[b].len / data.birds[a].len;
  const big = data.birds[a].len >= data.birds[b].len ? data.birds[a] : data.birds[b];
  const small = big === data.birds[a] ? data.birds[b] : data.birds[a];
  const sizeLine =
    a === b
      ? 'Same bird on both sides: pick a different second bird.'
      : ratio < 1.05
        ? `In life, the ${big.mid} and the ${small.mid} are about the same length.`
        : `In life, the ${big.mid} is about ${ratio.toFixed(1).replace(/\.0$/, '')} times as long as the ${small.mid}. On screen the models are the same size.`;
  pair.innerHTML = `<div class="mt-pair-grid">${card(a, longest)}${card(b, longest)}</div><p class="mt-pair-size">${esc(sizeLine)}</p>`;
  const u = new URL(location.href);
  u.searchParams.set('a', a);
  u.searchParams.set('b', b);
  history.replaceState(null, '', u);
}

selA.addEventListener('change', render);
selB.addEventListener('change', render);
pick.hidden = false;
render();
