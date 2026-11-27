import {fieldPlate} from './atlas-page.mjs';
// Writes the Manu section of assembl lab as static pages: /manu/, one page per bird and
// /manu/compare/. Text, sources and quiz answers are all in the HTML, so the pages read
// without script; the 3D model and the quiz checking load on top.
//
// usage: node scripts/pages.mjs OUT_DIR   (after `vite build` and scripts/stills.py)

import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BIRDS, ORDER, FLORA } from '../content/birds.mjs';
import { SOURCES, QUALIFIERS, LADDER } from '../content/sources.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv[2] ?? join(root, 'dist/manu');
const BASE = '/manu/';
mkdirSync(out, { recursive: true });

// --- assets ----------------------------------------------------------------------------
const manifest = JSON.parse(readFileSync(join(root, 'build/js/.vite/manifest.json'), 'utf8'));
const entry = (src) => BASE + Object.values(manifest).find((m) => m.src === src && m.isEntry).file;
const PAGE_JS = entry('src/viewer/page.ts');
const COMPARE_JS = entry('src/viewer/compare.ts');
cpSync(join(root, 'build/js/assets'), join(out, 'assets'), { recursive: true });
// the binaries are made once, not on every build (see scripts/build.mjs): copied when present
mkdirSync(join(out, 'models'), { recursive: true });
if (existsSync(join(root, 'public/models/perch.glb'))) cpSync(join(root, 'public/models/perch.glb'), join(out, 'models/perch.glb'));
if (existsSync(join(root, 'public/stills'))) cpSync(join(root, 'public/stills'), join(out, 'stills'), { recursive: true, filter: (p) => !p.endsWith('.png') && !p.endsWith('.json') });
const css = readFileSync(join(root, 'src/styles/manu.css'), 'utf8');
const cssHash = createHash('sha1').update(css).digest('hex').slice(0, 8);
writeFileSync(join(out, 'manu.css'), css);
cpSync(join(root, 'LICENSE-manu'), join(out, 'LICENSE.txt'));
const STILLS = JSON.parse(readFileSync(join(root, 'content/stills.json'), 'utf8'));

// --- helpers ---------------------------------------------------------------------------
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const SHORT = { 'NZ Birds Online': 'NZ Birds Online', DOC: 'DOC', 'Te Ara': 'Te Ara', NZTCS: 'NZTCS' };
const shortName = (id) => (id === 'nztcs-2021' ? 'NZTCS 2021' : SHORT[SOURCES[id].org]);
const statusLine = (b) => (b.status.group === 'Not Threatened' ? 'Not Threatened' : `${b.status.group} – ${b.status.name}`);
const statusTone = (b) => (b.status.group === 'Threatened' ? 'threatened' : b.status.group === 'At Risk' ? 'atrisk' : 'notthreatened');
const ARROW = '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M8 7h9v9"/></svg>';

/** Source references for one fact: short names linking to the page's numbered list. */
function refsFor(srcIds, order) {
  return `<span class="mt-refs">${srcIds
    .map((id) => {
      const n = order.indexOf(id) + 1;
      if (n < 1) throw new Error(`source ${id} not in page list`);
      return `<a class="mt-ref" href="#src-${n}" aria-label="${esc(shortName(id))}, source ${n}">${esc(shortName(id))}</a>`;
    })
    .join('')}</span>`;
}

/** Every source a bird page cites, in the order of the page's own list. */
function pageSources(b) {
  const used = new Set();
  const walk = (o) => {
    if (Array.isArray(o)) return o.forEach(walk);
    if (o && typeof o === 'object') {
      if (Array.isArray(o.src)) o.src.forEach((s) => used.add(s));
      Object.values(o).forEach(walk);
    }
  };
  walk(b);
  used.add('nztcs-2021');
  used.add('nztcs-series');
  used.add(b.sound);
  const list = [...b.sources, ...[...used].filter((s) => !b.sources.includes(s))];
  for (const s of list) if (!SOURCES[s]) throw new Error(`unknown source ${s}`);
  return list;
}

function head({ title, description, path, image }) {
  return `<!doctype html>
<html lang="en-NZ">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="theme-color" content="#21121F">
<link rel="canonical" href="https://lab.assembl.co.nz${path}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="assembl lab">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="https://lab.assembl.co.nz${image ?? `${BASE}stills/og.jpg`}">
<link rel="icon" href="/lab/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Sans:ital,wght@0,400;0,500;1,400&family=IBM+Plex+Mono:wght@400;500&display=swap">
<link rel="stylesheet" href="${BASE}manu.css?v=${cssHash}">
</head>`;
}

function footer() {
  return `<footer class="mt-foot">
<div class="mt-wrap mt-foot-in">
<p class="mt-foot-brand">Manu · <span class="v2-brand">assembl</span> lab</p>
<p>The models are stylised procedural reconstructions, not scans. Facts on these pages come from the Department of Conservation, New Zealand Birds Online, Te Ara and the New Zealand Threat Classification System, and each one says which.</p>
<p>3D: the manu library, on the <a href="https://github.com/ttillberg/codevember-2026/tree/main/12">Feather engine and perch model by Theo Tillberg</a> (MIT). Aotearoa species, flora and these pages by <span class="v2-brand">assembl</span> (MIT; <a href="${BASE}LICENSE.txt">licence</a>). No bird recordings are copied here.</p>
<p class="mt-foot-links"><a href="${BASE}">All eight birds</a><a href="${BASE}compare/">Compare two birds</a><a href="/">assembl lab</a></p>
</div>
</footer>`;
}

function truthChips(extra = '') {
  return `<ul class="mt-truth" aria-label="How to read this page">
<li><span class="mt-chip-mark ill" aria-hidden="true"></span>Stylised model, not a scan</li>
<li><span class="mt-chip-mark src" aria-hidden="true"></span>Every fact cited</li>${extra}
</ul>`;
}

function birdSwitcher(current) {
  return `<nav class="mt-switch" aria-label="The eight birds"><ul>${ORDER.map((k) => {
    const b = BIRDS[k];
    return `<li><a href="${BASE}${k}/"${k === current ? ' aria-current="page"' : ''} lang="mi">${esc(b.reo)}</a></li>`;
  }).join('')}<li class="mt-switch-compare"><a href="${BASE}compare/"${current === 'compare' ? ' aria-current="page"' : ''}>Compare</a></li></ul></nav>`;
}

function stillImg(k, cls, sizes, alt, eager = false) {
  return `<img class="${cls}" src="${BASE}stills/${k}-1200.webp" srcset="${BASE}stills/${k}-640.webp 640w, ${BASE}stills/${k}-1200.webp 1200w" sizes="${sizes}" width="1200" height="960" alt="${esc(alt)}"${eager ? ' fetchpriority="high"' : ' loading="lazy" decoding="async"'}>`;
}

const ALT_NAME = { tui: 'tūī', korimako: 'korimako (bellbird)', piwakawaka: 'pīwakawaka (fantail)', tauhou: 'tauhou (silvereye)', miromiro: 'miromiro (tomtit)', toutouwai: 'toutouwai (North Island robin)', hihi: 'hihi (stitchbird)', kereru: 'kererū (New Zealand pigeon)' };
const NAME_MID = { tui: 'tūī', korimako: 'korimako', piwakawaka: 'pīwakawaka', tauhou: 'tauhou', miromiro: 'miromiro', toutouwai: 'toutouwai', hihi: 'hihi', kereru: 'kererū' };
const enName = (b) => (b.englishShort === b.reo ? b.english : b.englishShort);
const floraMid = (b) => FLORA[b.flora].reo.toLowerCase();
const formLower = (b) => (/^(South|North)/.test(b.form) ? b.form : b.form[0].toLowerCase() + b.form.slice(1));
const altFor = (b) => `A stylised 3D model of a ${ALT_NAME[b.key]}, ${formLower(b)}, perched on a ${FLORA[b.flora].reo.toLowerCase()} sprig, its head turned to show the bill in profile.`;

// --- a bird page ----------------------------------------------------------------------------
function birdPage(k, i) {
  const b = BIRDS[k];
  const order = pageSources(b);
  const R = (src) => refsFor(src, order);
  const still = STILLS[k];
  const A = Object.fromEntries(still.anchors.map((a) => [a.id, a]));
  const prev = BIRDS[ORDER[(i + ORDER.length - 1) % ORDER.length]];
  const next = BIRDS[ORDER[(i + 1) % ORDER.length]];
  const items = (list) => `<ul class="mt-facts">${list.map((f) => `<li>${esc(f.t)} ${R(f.src)}</li>`).join('')}</ul>`;
  const rung = LADDER.findIndex((r) => (b.status.group === 'Not Threatened' ? r.group === 'Not Threatened' : r.group === b.status.group && r.name === b.status.name));
  const sci = b.sciShown ? `<i lang="la">${esc(b.scientific)}</i> <span class="mt-sci-note">(model: <i lang="la">${esc(b.sciShown)}</i>)</span>` : `<i lang="la">${esc(b.scientific)}</i>`;

  const markers = b.labels
    .map((l, n) => {
      const a = A[l.anchor];
      return `<span class="mt-marker" data-anchor="${l.anchor}" style="left:${(a.x * 100).toFixed(2)}%;top:${(a.y * 100).toFixed(2)}%">${n + 1}</span>`;
    })
    .join('');

  const quiz = b.quiz
    .map(
      (q, n) => `<fieldset class="mt-q">
<legend><span class="mt-q-n">Question ${n + 1} of ${b.quiz.length}</span> ${esc(q.q)}</legend>
<div class="mt-options">${q.options.map((o, j) => `<label><input type="radio" name="q${n}" value="${j}"${j === q.answer ? ' data-right="1"' : ''}> <span>${esc(o)}</span></label>`).join('')}</div>
<button type="button" class="mt-btn mt-check" hidden>Check my answer</button>
<p class="mt-feedback" role="status" aria-live="polite"></p>
<details class="mt-answer"><summary>Show the answer</summary><p><strong>${esc(q.options[q.answer])}.</strong> <span class="mt-why">${esc(q.why)} ${R(q.src)}</span></p></details>
</fieldset>`,
    )
    .join('\n');

  const html = `${head({
    title: `${b.reo} · ${b.englishShort} · Manu · assembl lab`,
    description: `Learn the ${b.reo} (${b.englishShort}, ${b.scientific}) up close: a 3D model with labelled anatomy, where it lives, what it eats, its adaptations and conservation status, with every fact cited.`,
    path: `${BASE}${k}/`,
    image: `${BASE}stills/${k}-1200.webp`,
  })}
<body class="mt mt-bird">
<a class="skip" href="#main">Skip to the ${esc(b.reo)} page</a>
${birdSwitcher(k)}
<main id="main">
<section class="mt-hero mt-wrap" aria-labelledby="bird-name">
<div class="mt-hero-text">
<p class="mt-eyebrow"><a href="${BASE}">Manu · birds of Aotearoa</a> <span aria-hidden="true">/</span> ${i + 1} of ${ORDER.length}</p>
<h1 id="bird-name" lang="mi">${esc(b.reo)}</h1>
<p class="mt-names">${esc(b.english)} · ${sci}</p>
<p class="mt-summary">${esc(b.summary)}</p>
${truthChips()}
<dl class="mt-glance">
${b.glance.map((g) => `<div><dt>${esc(g.k)}</dt><dd>${esc(g.v)} ${R(g.src)}</dd></div>`).join('\n')}
<div><dt>Status (2021)</dt><dd><a class="mt-status-pill ${statusTone(b)}" href="#status">${esc(statusLine(b))}</a> ${R(['nztcs-2021'])}</dd></div>
</dl>
</div>
<div class="mt-hero-model">
<figure class="mt-stage" data-manu-stage data-bird="${k}" data-flora="${b.flora}" data-perch="${BASE}models/perch.glb">
<div class="mt-plate">
${stillImg(k, 'mt-still', '(min-width: 1000px) 56vw, 100vw', altFor(b), true)}
<canvas class="mt-canvas" role="img" aria-label="Interactive 3D model of the ${esc(ALT_NAME[b.key])}, ${esc(formLower(b))}, on a ${esc(FLORA[b.flora].reo.toLowerCase())} sprig. The numbered markers match the labelled notes below the model."></canvas>
<div class="mt-markers" aria-hidden="true">${markers}</div>
<span class="mt-chip" aria-hidden="true">Still</span>
</div>
<figcaption class="mt-stage-cap">${esc(b.form)}, on <span lang="mi">${esc(floraMid(b))}</span> (<i lang="la">${esc(FLORA[b.flora].scientific)}</i>). Stylised model, drawn at the same size as the other seven birds.</figcaption>
</figure>
<p class="mt-stage-msg" role="status" aria-live="polite"></p>
<div class="mt-controls" role="group" aria-label="Model controls" hidden>
<button type="button" class="mt-btn" data-act="labels" aria-pressed="true">Labels</button>
<button type="button" class="mt-btn needs-3d" data-act="motion">Pause the bird</button>
<span class="mt-sep" aria-hidden="true"></span>
<span class="mt-group" role="group" aria-label="View">
<button type="button" class="mt-btn needs-3d" data-view="three" aria-pressed="true">Three-quarter</button>
<button type="button" class="mt-btn needs-3d" data-view="front" aria-pressed="false">Front</button>
<button type="button" class="mt-btn needs-3d" data-view="side" aria-pressed="false">Side</button>
<button type="button" class="mt-btn needs-3d" data-view="back" aria-pressed="false">Back</button>
</span>
<span class="mt-group" role="group" aria-label="Turn and zoom">
<button type="button" class="mt-btn mt-icon needs-3d" data-act="left" aria-label="Turn left"><svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg></button>
<button type="button" class="mt-btn mt-icon needs-3d" data-act="right" aria-label="Turn right"><svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></button>
<button type="button" class="mt-btn mt-icon needs-3d" data-act="in" aria-label="Zoom in"><svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M12 6v12M6 12h12"/></svg></button>
<button type="button" class="mt-btn mt-icon needs-3d" data-act="out" aria-label="Zoom out"><svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M6 12h12"/></svg></button>
</span>
</div>
<section class="mt-legend-wrap" aria-labelledby="labels-title">
<h2 id="labels-title" class="mt-h3">Labelled anatomy</h2>
<ol class="mt-legend">
${b.labels.map((l, n) => `<li data-anchor="${l.anchor}" tabindex="-1"><span class="mt-n" aria-hidden="true">${n + 1}</span><div><b>${esc(l.title)}.</b> ${esc(l.t)} ${R(l.src)}</div></li>`).join('\n')}
</ol>
</section>
</div>
</section>

<nav class="mt-jump mt-wrap" aria-label="On this page"><a href="#lives">Where it lives</a><a href="#eats">What it eats</a><a href="#adaptations">Adaptations</a><a href="#status">Status</a>${b.culture.length ? '<a href="#names">Names and culture</a>' : ''}<a href="#quiz">Check your understanding</a><a href="#sources">Sources</a></nav>

<div class="mt-body mt-wrap">
<section id="lives" class="mt-sec"><h2>Where it lives</h2>${items(b.lives)}</section>
<section id="eats" class="mt-sec"><h2>What it eats</h2>${items(b.eats)}</section>
<section id="adaptations" class="mt-sec"><h2>Notable adaptations</h2><p class="mt-lead">How its body and behaviour fit the way it lives.</p>${items(b.adaptations)}</section>

<section id="status" class="mt-sec mt-status">
<h2>Conservation status</h2>
<div class="mt-status-card ${statusTone(b)}">
<p class="mt-status-kicker">New Zealand Threat Classification System, 2021</p>
<p class="mt-status-name">${esc(statusLine(b))}</p>
${b.status.qualifiers.length ? `<ul class="mt-quals" aria-label="Qualifiers">${b.status.qualifiers.map((q) => `<li><abbr title="${esc(QUALIFIERS[q])}">${esc(q)}</abbr> ${esc(QUALIFIERS[q])}</li>`).join('')}</ul>` : ''}
<p class="mt-status-taxon">Assessed for <i lang="la">${esc(b.status.taxon)}</i>.${b.status.criterion ? ` Criterion ${esc(b.status.criterion)}.` : ''} ${R(['nztcs-2021'])}</p>
${b.status.more ? `<p>${esc(b.status.more.t)} ${R(b.status.more.src)}</p>` : ''}
</div>
<figure class="mt-ladder-fig">
<figcaption>Where it sits among the 2021 categories for resident native birds, most to least threatened ${R(['nztcs-2021'])}</figcaption>
<ol class="mt-ladder">${LADDER.map((r, n) => `<li class="${r.group === 'Threatened' ? 'thr' : r.group === 'At Risk' ? 'risk' : 'nt'}${n === rung ? ' here' : ''}"${n === rung ? ' aria-current="true"' : ''}><span class="g">${esc(r.group)}</span><span class="c">${esc(r.group === 'Not Threatened' ? '' : r.name)}</span>${n === rung ? `<span class="you">${esc(b.reo)}</span>` : ''}</li>`).join('')}</ol>
</figure>
<p class="mt-note">Birds were last assessed in 2021, and before that in 2016 and 2012. Check the <a href="${SOURCES['nztcs-db'].url}">NZTCS database</a> for any newer listing. ${R(['nztcs-series'])}</p>
</section>

${
  b.culture.length
    ? `<section id="names" class="mt-sec"><h2>Names and culture</h2><p class="mt-lead">Only what the sources say, in their words where it matters. To learn the names and stories of your own area, ask your local hapū and iwi.</p>${items(b.culture)}</section>`
    : ''
}

<section id="model" class="mt-sec mt-model-truth"><h2>About this model</h2>
<ul class="mt-facts">
<li>A stylised procedural reconstruction, not a scan or a measured specimen. Code builds every feather, shaped by eye from field-guide descriptions and photographs.</li>
<li>All eight birds are drawn at the same size on screen. In life the ${esc(NAME_MID[k])} is about ${b.lengthCm} cm long. ${R(b.glance[0].src)} See <a href="${BASE}#size-title">all eight to scale</a>.</li>
<li>Every model uses one shared wing shape and the same set of movements (breathing, looking round, hopping, preening). Don’t read wing shape or behaviour from the model.</li>
${b.model.map((m) => `<li>${esc(m)}</li>`).join('\n')}
<li>The <span lang="mi">${esc(floraMid(b))}</span> sprig is stylised too, and not botanically checked.</li>
</ul></section>

<section id="quiz" class="mt-sec mt-quiz"><h2>Check your understanding</h2>
<p class="mt-lead">${b.quiz.length} questions. Every answer comes from a source cited on this page.</p>
<form class="mt-quiz-form" onsubmit="return false">${quiz}</form>
<p class="mt-score" role="status" aria-live="polite"></p>
</section>

<section id="listen" class="mt-sec"><h2>Listen</h2>
<p>Hear recordings of the <span lang="mi">${esc(NAME_MID[k])}</span> on <a class="mt-out" href="${SOURCES[b.sound].url}">New Zealand Birds Online${ARROW}</a>. The recordings stay on their site: none are copied here. ${R([b.sound])}</p>
</section>

<section id="sources" class="mt-sec mt-sources"><h2>Sources</h2>
<p class="mt-lead">Checked 17 November 2026.</p>
<ol>${order.map((id, n) => `<li id="src-${n + 1}"><span class="mt-src-org">${esc(SOURCES[id].org)}</span> ${esc(SOURCES[id].cite)} <a href="${esc(SOURCES[id].url)}">${esc(SOURCES[id].url.replace(/^https:\/\//, ''))}</a></li>`).join('\n')}</ol>
</section>
</div>

<nav class="mt-pager mt-wrap" aria-label="Next and previous birds">
<a class="mt-pager-prev" href="${BASE}${prev.key}/"><span class="k">Previous</span><span class="n" lang="mi">${esc(prev.reo)}</span></a>
<a class="mt-pager-mid" href="${BASE}compare/?a=${k}&amp;b=${next.key}"><span class="k">Compare</span><span class="n">${esc(b.reo)} and ${esc(next.reo)}</span></a>
<a class="mt-pager-next" href="${BASE}${next.key}/"><span class="k">Next</span><span class="n" lang="mi">${esc(next.reo)}</span></a>
</nav>
</main>
${footer()}
<script type="module" src="${PAGE_JS}"></script>
<script src="/lab/navigation.js" defer></script>
</body>
</html>
`;
  mkdirSync(join(out, k), { recursive: true });
  writeFileSync(join(out, k, 'index.html'), html);
}

// --- the section's front page ------------------------------------------------------------------
function indexPage() {
  const maxLen = 50;
  const html = `${head({
    title: 'Manu · birds of Aotearoa, up close · assembl lab',
    description: 'Eight birds of Aotearoa as 3D models you can turn and label, with where each lives, what it eats, its adaptations and conservation status. Every fact cited from DOC, NZ Birds Online, Te Ara and the NZ Threat Classification System.',
    path: BASE,
  })}
<body class="mt mt-index">
<a class="skip" href="#main">Skip to the birds</a>
<main id="main">
${fieldPlate(entry('src/viewer/atlas.ts'))}

<section class="mt-sec-wide mt-wrap" aria-labelledby="birds-title">
<h2 id="birds-title" class="mt-h2">The eight birds</h2>
<ul class="mt-cards">
${ORDER.map((k) => {
  const b = BIRDS[k];
  return `<li class="mt-card"><a href="${BASE}${k}/">${stillImg(k, 'mt-card-img', '(min-width: 1000px) 25vw, (min-width: 600px) 50vw, 100vw', '')}<span class="mt-card-name" lang="mi">${esc(b.reo)}</span><span class="mt-card-en">${esc(enName(b))} · <i lang="la">${esc(b.scientific)}</i></span><span class="mt-status-pill ${statusTone(b)}">${esc(statusLine(b))}</span></a></li>`;
}).join('\n')}
</ul>
<p class="mt-note">Statuses: New Zealand Threat Classification System, 2021 (the latest published bird assessment). <a href="${SOURCES['nztcs-2021'].url}">Read the report</a>.</p>
</section>

<section class="mt-sec-wide mt-wrap mt-how" aria-labelledby="how-title">
<h2 id="how-title" class="mt-h2">How each page works</h2>
<ol class="mt-steps">
<li><span class="mt-step-k">Look</span><p>Turn the model, view it from the front, side or back, and switch on the labels. Each number points to a feature and says what it’s for.</p></li>
<li><span class="mt-step-k">Read</span><p>Where it lives, what it eats, its adaptations and its conservation status. Every fact names its source, and the full list is at the foot of the page.</p></li>
<li><span class="mt-step-k">Check</span><p>Three questions per bird. The answers come from the cited sources, so you can always go back and see why.</p></li>
</ol>
</section>

<section class="mt-sec-wide mt-wrap mt-size" aria-labelledby="size-title">
<h2 id="size-title" class="mt-h2">How big are these birds?</h2>
<p class="mt-lead">Select “Compare at the same scale” in the viewer to see the difference. These are typical adult lengths from bill tip to tail tip.</p>
<ol class="mt-bars">
${[...ORDER].sort((a, b) => BIRDS[a].lengthCm - BIRDS[b].lengthCm).map((k) => {
  const b = BIRDS[k];
  const src = b.glance[0].src;
  return `<li><span class="mt-bar-name"><a href="${BASE}${k}/" lang="mi">${esc(b.reo)}</a></span><span class="mt-bar" style="--w:${((b.lengthCm / maxLen) * 100).toFixed(1)}%"><span class="mt-bar-fill"></span></span><span class="mt-bar-v">${b.lengthCm} cm <span class="mt-bar-src">${esc(src.map(shortName).join(', '))}</span></span></li>`;
}).join('\n')}
</ol>
</section>

<section class="mt-sec-wide mt-wrap mt-about" aria-labelledby="about-title">
<h2 id="about-title" class="mt-h2">About the models</h2>
<div class="mt-about-cols">
<div>
<h3 class="mt-h3">What they are</h3>
<p>Each bird has a feathered 3D body built around published measurements for the bill, wing, tail and legs. The depth of the breast, the curve of the neck and the resting pose are estimated from photographs.</p>
<p>They come from the manu library, which runs on Theo Tillberg’s Feather engine (MIT). The Aotearoa species and flora are by <span class="v2-brand">assembl</span>.</p>
</div>
<div>
<h3 class="mt-h3">How to read the models</h3>
<ul class="mt-facts">
<li>The fitted view enlarges small birds so you can see their markings. The 5 cm ruler changes with the view.</li>
<li>The eight birds share an animation rig. Use plumage and shape to identify them here. The species notes link to footage and calls.</li>
<li>Adult dimensions vary. Rounded lengths and weights come from each linked species account.</li>
<li>The miromiro depicts a South Island male. Look for the white forehead spot and yellow-orange breast.</li>
</ul>
</div>
<div>
<h3 class="mt-h3">For teachers</h3>
<p>Each page cites the Department of Conservation, New Zealand Birds Online, Te Ara and the 2021 New Zealand Threat Classification. Cultural notes appear only where one of those sources states them, and say which. For local names and stories, ask your local hapū and iwi.</p>
<p>Bird calls aren’t copied here. Each page links to the recordings on New Zealand Birds Online.</p>
</div>
</div>
</section>
</main>
${footer()}

</body>
</html>
`;
  writeFileSync(join(out, 'index.html'), html);
}

// --- compare ------------------------------------------------------------------------------------
function comparePage() {
  const order = ['nzbo-tui', 'nzbo-bellbird', 'nzbo-fantail', 'nzbo-silvereye', 'nzbo-tomtit', 'nzbo-robin', 'nzbo-hihi', 'nzbo-kereru', 'doc-silvereye', 'doc-tomtit', 'doc-robin', 'doc-kereru', 'doc-fantail', 'doc-hihi', 'teara-honeyeaters', 'teara-stitchbirds', 'teara-robins', 'teara-fantails', 'teara-pigeons', 'nztcs-2021'];
  const R = (src) => refsFor(src, order);
  const data = Object.fromEntries(
    ORDER.map((k) => {
      const b = BIRDS[k];
      return [k, { reo: b.reo, mid: NAME_MID[k], en: enName(b), sci: b.scientific, len: b.lengthCm, lenSrc: b.glance[0].src, weight: b.glance[1].v, weightSrc: b.glance[1].src, found: b.glance[2].v, foundSrc: b.glance[2].src, bill: b.compare.bill, diet: b.compare.diet, status: statusLine(b), tone: statusTone(b), quals: b.status.qualifiers.map((q) => QUALIFIERS[q]), form: b.form, flora: FLORA[b.flora].reo }];
    }),
  );
  const refsData = Object.fromEntries(order.map((id, n) => [id, { n: n + 1, short: shortName(id), org: SOURCES[id].org }]));
  const opts = (sel) => ORDER.map((k) => `<option value="${k}"${k === sel ? ' selected' : ''}>${esc(BIRDS[k].reo)}${BIRDS[k].englishShort === BIRDS[k].reo ? ' · parson bird' : ` · ${esc(BIRDS[k].englishShort)}`}</option>`).join('');
  const html = `${head({
    title: 'Compare two birds · Manu · assembl lab',
    description: 'Put two birds of Aotearoa side by side: real length, weight, bill, diet and conservation status, with every fact cited.',
    path: `${BASE}compare/`,
  })}
<body class="mt mt-compare">
<a class="skip" href="#main">Skip to the comparison</a>
${birdSwitcher('compare')}
<main id="main">
<section class="mt-wrap mt-compare-head" aria-labelledby="cmp-title">
<p class="mt-eyebrow"><a href="${BASE}">Manu · birds of Aotearoa</a></p>
<h1 id="cmp-title">Compare two birds</h1>
<p class="mt-summary">Pick two. Look at their bills and what they eat, then at their size and status. What do the nectar feeders have in common? How is an insect-catcher different?</p>
${truthChips()}
</section>

<section class="mt-wrap mt-pick" aria-label="Pick two birds" hidden>
<div class="mt-pick-row">
<label>First bird <select id="cmp-a">${opts('tui')}</select></label>
<label>Second bird <select id="cmp-b">${opts('kereru')}</select></label>
</div>
<div class="mt-pair" aria-live="polite"></div>
</section>

<section class="mt-wrap mt-table-wrap" aria-labelledby="all-title">
<h2 id="all-title" class="mt-h2">All eight at a glance</h2>
<div class="mt-table-scroll" tabindex="0" role="region" aria-label="Table of all eight birds (scrolls sideways on small screens)">
<table class="mt-table">
<thead><tr><th scope="col">Bird</th><th scope="col">Length</th><th scope="col">Weight</th><th scope="col">Bill</th><th scope="col">Diet</th><th scope="col">Status (2021)</th></tr></thead>
<tbody>
${ORDER.map((k) => {
  const d = data[k];
  return `<tr><th scope="row"><a href="${BASE}${k}/" lang="mi">${esc(d.reo)}</a><span>${esc(d.en)}</span></th><td>${d.len} cm ${R(d.lenSrc)}</td><td>${esc(d.weight)} ${R(d.weightSrc)}</td><td>${d.bill ? `${esc(d.bill.t)} ${R(d.bill.src)}` : '<span class="mt-muted">Not described in these sources</span>'}</td><td>${esc(d.diet.t)} ${R(d.diet.src)}</td><td><span class="mt-status-pill ${d.tone}">${esc(d.status)}</span> ${R(['nztcs-2021'])}</td></tr>`;
}).join('\n')}
</tbody>
</table>
</div>
</section>

<div class="mt-wrap"><section class="mt-sec mt-sources" id="sources"><h2>Sources</h2>
<p class="mt-lead">Checked 17 November 2026. The models are drawn at the same size; lengths are the real birds’.</p>
<ol>${order.map((id, n) => `<li id="src-${n + 1}"><span class="mt-src-org">${esc(SOURCES[id].org)}</span> ${esc(SOURCES[id].cite)} <a href="${esc(SOURCES[id].url)}">${esc(SOURCES[id].url.replace(/^https:\/\//, ''))}</a></li>`).join('\n')}</ol>
</section></div>
</main>
${footer()}
<script id="cmp-data" type="application/json">${JSON.stringify({ birds: data, refs: refsData, base: BASE }).replace(/</g, '\\u003c')}</script>
<script type="module" src="${COMPARE_JS}"></script>
<script src="/lab/navigation.js" defer></script>
</body>
</html>
`;
  mkdirSync(join(out, 'compare'), { recursive: true });
  writeFileSync(join(out, 'compare', 'index.html'), html);
}

ORDER.forEach(birdPage);
indexPage();
comparePage();
console.log('wrote', ORDER.length + 2, 'pages to', out);
