#!/usr/bin/env node
// Builds the Lab home (/index.html) as one scroll story from the catalogue (lab/catalogue.js = window.LAB_WORLDS)
// and the maturity ladder (lab/maturity.json). Run after editing either file:  node scripts/build-lab-home.cjs
//
// The page is static HTML on purpose: with no JS, or with reduced motion, it is the complete story. lab/story.js
// only adds the moving DO glass orb and live data labels on top.
//
// Curation is presentation only. Every world in LAB_WORLDS and every instrument the old /discover/ page linked
// appears here exactly once; scripts/check-lab-home.cjs fails if one goes missing or shows twice.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'lab/catalogue.js'), 'utf8'), sandbox);
const WORLDS = Object.fromEntries(sandbox.window.LAB_WORLDS.map(w => [w.id, w]));
const MATURITY = JSON.parse(fs.readFileSync(path.join(ROOT, 'lab/maturity.json'), 'utf8'));

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const href = w => w.href || `/${w.id}/`;
const stageOf = id => {
  const t = MATURITY.twins[id] || { stage: 'model', why: 'No live feed reaches this experiment yet.' };
  return { label: (MATURITY.ladder[t.stage] || {}).label || t.stage, why: t.why, stage: t.stage };
};
const used = new Set();
const take = id => { if (!WORLDS[id]) throw new Error('Unknown world ' + id); if (used.has(id)) throw new Error('Shown twice: ' + id); used.add(id); return WORLDS[id]; };

/* Truth chip: the three honest labels the company site uses. Simulated = a model of a place or system;
   Live = a working tool that makes a real file or object on your device; Illustrative = art, not a claim. */
const TRUTH = { sim: 'Simulated', live: 'Live', ill: 'Illustrative' };
const chip = k => `<span class="truth" data-k="${k}">${TRUTH[k]}</span>`;
const dataLine = (w, extra = '') => {
  const s = stageOf(w.id);
  return `<p class="src" title="${esc(s.why)}"><span class="src-stage" data-stage="${s.stage}">${esc(s.label)}</span> <span data-live="${w.id}">${esc(w.data)}</span>${extra}</p>`;
};
const img = (src, alt, w, h, eager = false) =>
  `<img src="${src}" alt="${esc(alt)}" width="${w}" height="${h}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;

/* ── chapter 2: industry twins ── */
const STAGE = [
  { id: 'cafe', kind: 'Hospitality', img: ['/assets/models/cafe/renders/cafe-hero.webp', 1440, 900], alt: 'Offline render of the café twin: dining room, counter and kitchen pass seen from above' },
  { id: 'store', kind: 'Grocery retail', img: ['/assets/posters/store.webp', 1206, 824], alt: 'The supermarket twin from above: aisles, chillers, checkouts and car park' },
  { id: 'ed', kind: 'Health', img: ['/assets/posters/ed.webp', 1206, 872], alt: 'The emergency department twin: waiting room, triage and treatment bays' },
  { id: 'dairy', kind: 'Manufacturing', img: ['/assets/posters/dairy.webp', 1206, 872], alt: 'The dairy plant twin: milk silos, dryer tower and tanker bay' },
  { id: 'energy', kind: 'Energy retail', img: ['/assets/posters/energy.webp', 1200, 840], alt: 'The energy retailer twin: a street of four houses on one power network' },
  { id: 'cars', kind: 'Vehicle retail', img: ['/assets/models/vehicles/renders/golf-hero.webp', 1200, 750], alt: 'Offline render of the Simulated 2021 Volkswagen Golf, the hero car of the agent-ready cars world' },
];
const MORE_TWINS = [
  { id: 'retail', line: 'The trade yard at 6am, the empty bins at 4pm.' },
  { id: 'stay', line: 'Bookings, cleaning, check-in and what each booking site takes.' },
  { id: 'office', line: 'Three floors, 120 desks, and the commute that fills them.' },
  { id: 'tourism', line: 'Visitors, guest nights and spend, region by region.' },
  { id: 'trades', line: 'Measure a plan, check the Building Code, price it from your rates.' },
];
const HOME = [
  { id: 'home', line: 'Insulation, solar and a heat pump in a Kiwi house.' },
  { id: 'kitchen', line: 'Turn the week you actually have into meals that work.' },
  { id: 'food', line: 'Household food from shop to plate to bin.' },
  { id: 'everyday', line: 'Attendance, sleep, screens and a healthy 24 hours.' },
];

/* ── chapter 3: study machines (real offline renders, linked to their machine pages) ── */
const MACHINES = [
  { href: '/study/m/windtunnel.html', title: 'The wind tunnel', line: 'An F1-style race car in a wind tunnel: drag, downforce and power, F = ½ρv²CdA.', meta: 'Physics · NCEA Level 1–2', img: ['/assets/models/windtunnel/windtunnel-hero.jpg', 1600, 1000], alt: 'Offline render of a race car in a wind tunnel with smoke lines over the wings' },
  { href: '/study/m/earthspace.html', title: 'Earth & Space', line: 'Star colours, light-years, day and night, the Moon’s phases and eclipses.', meta: 'Science · Year 9', img: ['/assets/models/earthspace/earthspace-hero.jpg', 1600, 1000], alt: 'Offline render of the Sun, Earth and Moon with a row of stars by colour' },
  { href: '/study/m/house.html', title: 'The house design machine', line: 'Site a house on a hillside, then plan, section and download real CAD drawings.', meta: 'DVC · Technology', img: ['/assets/models/house/house-hero.jpg', 1600, 1000], alt: 'Offline render of a modern house on a terraced hillside' },
  { href: '/study/m/world.html', title: 'Guess the world', line: 'Every country since 1800 in one moving chart. Guess first, then see the real data.', meta: 'Social studies · Statistics', img: ['/study/thumbnails/world.jpg', 800, 500], alt: 'A bubble chart of income against life expectancy for every country' },
  { href: '/study/m/socials.html', title: 'The social studies desk', line: 'Graphs, sources, values and government: the Year 9 exam on one desk.', meta: 'Social studies · Year 9', img: ['/assets/models/socials/socials-hero.webp', 1600, 1000], alt: 'Offline render of a study desk with a graph board, clock and figures' },
  { href: '/study/m/claw.html', title: 'The claw machine', line: 'Relative frequency, tree diagrams and expected value: is it worth $2?', meta: 'Maths · Years 9–11', img: ['/lab/previews/claw-blender.webp', 923, 1050], alt: 'Offline render of the claw machine cabinet' },
  { href: '/study/m/slushie.html', title: 'The slushie machine', line: 'Freezing, latent heat, sugar and energy flow inside a slushie machine.', meta: 'Science · Years 9–10', img: ['/lab/previews/slushie-blender.webp', 923, 1050], alt: 'Offline render of the slushie machine' },
  { href: '/study/m/particles.html', title: 'The particle machine', line: 'Heating curves, melting, boiling and gas pressure, from ice to steam.', meta: 'Science · Years 9–10', img: ['/lab/previews/particles-blender.webp', 1400, 1050], alt: 'Offline render of the particle apparatus: beaker on a hot plate, thermometer and syringe' },
  { href: '/study/m/lines.html', title: 'The straight-line machine', line: 'y = mx + c with two tanks and a plotter.', meta: 'Maths · NCEA Level 1', img: ['/assets/models/lines/lines-hero.webp', 1600, 1100], alt: 'Offline render of two filling tanks on a plotter base' },
  { href: '/study/m/bike.html', title: 'The downhill machine', line: 'Speed–time graphs, forces and stopping distance on a redwood trail.', meta: 'Science · Years 9–10', img: ['/lab/previews/bike-blender.webp', 1400, 1050], alt: 'Offline render of a downhill mountain bike' },
  { href: '/study/m/vinyl.html', title: 'The vinyl machine', line: 'Circumference, rpm and sound waves on a turntable.', meta: 'Science · Years 9–10', img: ['/lab/previews/vinyl-blender.webp', 1400, 1050], alt: 'Offline render of a turntable and speaker' },
  { href: '/study/m/phone.html', title: 'The phone machine', line: 'Coulombs, joules and watts inside a phone battery.', meta: 'Physics · Years 12–13', img: ['/lab/previews/phone-blender.webp', 1200, 900], alt: 'Offline render of a phone opened into its layers beside a charger' },
  { href: '/study/m/heart.html', title: 'Heart Pump Lab', line: 'Two pumps, one circulation. Valves and forward output.', meta: 'Biology · Years 9–10', img: ['/lab/previews/heart-blender.webp', 1200, 1050], alt: 'Render of a heart model opened to show its chambers' },
];
const YEARS = [['/study/#junior', 'Years 7–8'], ['/study/#y9', 'Year 9'], ['/study/#y10', 'Year 10'], ['/study/#l1', 'Year 11'], ['/study/#l2', 'Year 12'], ['/study/#l3', 'Year 13']];
const STUDY_DOORS = [
  { id: 'year9', line: 'A study sprint, an app builder, pixel analysis and an AI judgement check. No login.', truth: 'live' },
  { id: 'print', line: 'Shape a downhill bike, check its drawing, export STL or 3MF for your printer.', truth: 'live' },
];

/* ── chapter 4: the playground, a calm index (no thumbnails: these are instruments, not models) ── */
const PLAY = [
  { href: '/study/patterns/', title: 'Living Studio', line: 'Sculpt real geometry, style the light, export the mesh.', truth: 'live' },
  { world: 'ar', title: 'assembl AR', line: 'Make 3D text or a framed photo and place it in your room.', truth: 'live' },
  { href: '/instruments/reality-remix/', title: 'Reality Remix', line: 'Push and swirl thousands of colour splats into a picture.', truth: 'ill' },
  { href: '/instruments/impossible-objects/', title: 'Impossible Objects', line: 'Flip the drawing order to build a Penrose triangle.', truth: 'ill' },
  { href: '/instruments/time-sculpture/', title: 'Time Sculpture', line: 'Draw a stroke and watch it echo into a sculpture.', truth: 'ill' },
  { href: '/instruments/sonic-loom/', title: 'Sonic Loom', line: 'Weave strings across a loom and hear the picture play.', truth: 'ill' },
  { href: '/instruments/liquid-playground/', title: 'Liquid Playground', line: 'Pour, stir and marble coloured liquid.', truth: 'ill' },
  { href: '/instruments/soft-matter/', title: 'Soft Matter', line: 'Drop soft shapes, squish them, keep a picture.', truth: 'ill' },
  { href: '/instruments/squishy-lab/', title: 'Squishy Lab', line: 'Design a squishy and stamp a sticker sheet.', truth: 'ill' },
  { href: '/study/bedazzle/', title: 'Bedazzle Studio', line: 'A little sparkle, entirely your own.', truth: 'ill' },
];

/* ── markup ── */
const stageSteps = STAGE.map((s, i) => {
  const w = take(s.id);
  return `<li class="tw-step" data-i="${i}" id="twin-${w.id}">
  <figure class="tw-pic frame">${img(s.img[0], s.alt, s.img[1], s.img[2], i === 0)}</figure>
  <div class="tw-copy">
   <p class="kind">${esc(s.kind)}</p>
   <h3>${esc(w.title)}</h3>
   <p class="line">${esc(w.desc)}</p>
   <div class="meta">${chip('sim')}${dataLine(w)}</div>
   <a class="go" href="${href(w)}">${esc(w.action)}<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 12h13M13 6l6 6-6 6"/></svg></a>
  </div>
 </li>`;
}).join('\n ');

const rowTile = (w, line, truth, opts = {}) => {
  const pic = opts.pic ? `<span class="row-pic frame">${img(opts.pic, '', 240, 170)}</span>` : '';
  return `<li><a class="row${pic ? '' : ' row-type'}" href="${opts.href || href(w)}">${pic}<span class="row-copy"><strong>${esc(opts.title || w.title)}</strong><span class="row-line">${esc(line)}</span><span class="meta">${chip(truth)}${w && !opts.noData ? `<span class="src" title="${esc(stageOf(w.id).why)}"><span class="src-stage" data-stage="${stageOf(w.id).stage}">${esc(stageOf(w.id).label)}</span> <span data-live="${w.id}">${esc(w.data)}</span></span>` : ''}</span></span></a></li>`;
};
const moreTwins = MORE_TWINS.map(t => { const w = take(t.id); return rowTile(w, t.line, 'sim', { pic: w.poster || `/assets/posters/${w.id}.webp` }); }).join('\n  ');
const homeRows = HOME.map(t => { const w = take(t.id); return rowTile(w, t.line, 'sim', { pic: `/assets/posters/${w.id}.webp` }); }).join('\n  ');

// two lead cards, then rows of three; a short last row stretches so the grid never ends with a gap
const tail = (MACHINES.length - 2) % 3;
const mcClass = i => (i < 2 ? ' mc-lead' : tail && i >= MACHINES.length - tail ? (tail === 2 ? ' mc-wide' : ' mc-full') : '');
const machines = MACHINES.map((m, i) => `<li class="mc${mcClass(i)}"><a href="${m.href}">
  <figure class="frame">${img(m.img[0], m.alt, m.img[1], m.img[2])}</figure>
  <span class="mc-copy"><span class="kind">${esc(m.meta)}</span><strong>${esc(m.title)}</strong><span class="row-line">${esc(m.line)}</span><span class="meta">${chip('sim')}</span></span>
 </a></li>`).join('\n ');
const studyWorld = take('study');
const doors = STUDY_DOORS.map(d => { const w = take(d.id); return rowTile(w, d.line, d.truth, { noData: true }); }).join('\n  ');
const play = PLAY.map(p => {
  const w = p.world ? take(p.world) : null;
  return `<li><a class="ix" href="${p.href || href(w)}"><strong>${esc(p.title)}</strong><span class="row-line">${esc(p.line)}</span>${chip(p.truth)}</a></li>`;
}).join('\n  ');

const missing = Object.keys(WORLDS).filter(id => !used.has(id));
if (missing.length) throw new Error('Worlds missing from the story: ' + missing.join(', ') + '. Add them to a chapter in scripts/build-lab-home.cjs.');

// The DO glass orb, still: the first paint, and what no JS, no WebGL and reduced motion keep (lab/orb.js moves it)
const orb = `<div class="orb-still"></div>`;

const html = `<!doctype html>
<html lang="en-NZ" data-feeds="ed,power,fuel,fpi" class="lab-story">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>assembl lab · small worlds, assembled</title>
<meta name="description" content="Working models of New Zealand places, built by assembl: business twins you can run for a day, study machines that teach one idea, and a playground of instruments. Every one says what is simulated and what is real.">
<meta property="og:title" content="assembl lab · small worlds, assembled"><meta property="og:description" content="Business twins, study machines and a playground, built in Aotearoa. Every world says what is simulated and what is real."><meta property="og:image" content="https://assembl-lab.vercel.app/assets/models/cafe/renders/cafe-hero.webp">
<meta name="theme-color" content="#240B21"><link rel="icon" href="/lab/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/lab/story.css">
<script>document.documentElement.classList.add('js');</script>
<script src="/lab/story.js" defer></script>
</head>
<body>
<a class="skip" href="#twins">Skip to the twins</a>
<div class="world" aria-hidden="true"></div>
<header class="bar wrap">
 <a class="brand" href="/" aria-label="assembl lab home"><b>assembl</b> lab</a>
 <nav aria-label="Chapters"><a href="#twins">Twins</a><a href="#study">Study machines</a><a href="#playground">Playground</a></nav>
 <a class="bar-cta" href="https://assembl.co.nz/" target="_top">assembl.co.nz</a>
</header>
<main>
<section class="hero wrap" aria-labelledby="hero-title">
 <div class="hero-copy">
  <h1 id="hero-title">Small worlds,<br>assembled.</h1>
  <p class="lede">The assembl Lab is where we build working models of New Zealand places: businesses you can run for a day, machines that teach one idea, and a few instruments to play with.</p>
  <div class="actions"><a class="btn btn-paper" href="#twins">Walk through the twins</a><a class="btn btn-glass" href="#study">See the study machines</a></div>
  <p class="truth-note">${chip('sim')}${chip('ill')}${chip('live')}<span>Every world carries one of these labels.</span></p>
 </div>
 <div class="hero-art" id="orb" aria-hidden="true">${orb}</div>
</section>

<span id="explore" class="anchor" aria-hidden="true"></span>
<section class="chapter twins wrap" id="twins" aria-labelledby="twins-title">
 <div class="ch-head">
  <h2 id="twins-title">Businesses, assembled. Run one for a day.</h2>
  <p class="lede">Twins of the kinds of places New Zealand runs on. The businesses are invented; the public figures that feed them are named. Change one thing and follow where it goes.</p>
 </div>
 <div class="tw">
  <ol class="tw-steps">
 ${stageSteps}
  </ol>
 </div>
 <div class="more">
  <div class="more-col"><h3>More businesses</h3><ul class="rows">
  ${moreTwins}
  </ul></div>
  <div class="more-col"><h3>Closer to home</h3><ul class="rows">
  ${homeRows}
  </ul></div>
 </div>
</section>

<div class="sheet">
<section class="chapter study wrap" id="study" aria-labelledby="study-title">
 <div class="ch-head">
  <h2 id="study-title">One idea, assembled into a machine.</h2>
  <p class="lede">Each study machine turns one curriculum topic into something you can turn, test and break, then marks your answers against the same model. Years 7 to 13, in <a href="${href(studyWorld)}">assembly, the study app</a>.</p>
  <div class="actions"><a class="btn btn-plum go-world" href="${href(studyWorld)}">Open assembly</a><nav class="years" aria-label="Study machines by year">${YEARS.map(([h, t]) => `<a href="${h}">${t}</a>`).join('')}</nav></div>
 </div>
 <ul class="machines">
 ${machines}
 </ul>
 <div class="doors"><h3>Also in assembly</h3><ul class="rows rows-3">
  ${doors}
 </ul></div>
</section>

<section class="chapter play wrap" id="playground" aria-labelledby="play-title">
 <div class="ch-head ch-head-row">
  <h2 id="play-title">The playground. Some assembly required.</h2>
  <p class="lede">Smaller instruments for making things. No lesson and no data: everything stays on your device.</p>
 </div>
 <ul class="index">
  ${play}
 </ul>
</section>

<section class="chapter about wrap" id="about" aria-labelledby="about-title">
 <h2 id="about-title">How to read the labels.</h2>
 <dl class="labels">
  <div><dt>${chip('sim')}</dt><dd>A model of a place or a system. The place is invented; any public figures it uses are named on the page.</dd></div>
  <div><dt><span class="src-stage" data-stage="shadow">Shadow</span></dt><dd>Public data reaches the model each day or month, from Stats NZ, MBIE, Health NZ or the Electricity Authority. Nothing flows back.</dd></div>
  <div><dt>${chip('live')}</dt><dd>A working tool. It makes a real file or object on your device.</dd></div>
  <div><dt>${chip('ill')}</dt><dd>Art to play with. It makes no claim about the world.</dd></div>
 </dl>
</section>
</div>

<section class="close" aria-labelledby="close-title">
 <div class="wrap close-in">
  <h2 id="close-title">Want your business assembled as a twin?</h2>
  <p class="lede">assembl builds twins around real customer journeys, starting with public information and then, on your say-so, your own.</p>
  <div class="actions"><a class="btn btn-paper" href="https://assembl.co.nz/" target="_top">Talk to assembl</a><a class="btn btn-glass" href="${href(studyWorld)}">Study for exams</a></div>
 </div>
</section>
</main>
<footer class="foot wrap"><p><b>assembl</b> lab. Made in Aotearoa.</p><p>Independent assembl concepts. Simulated data unless marked live with a named source. Not medical, financial or energy advice. In an emergency, call 111.</p><p>© 2026 assembl</p></footer>
<script src="/ask.js" defer data-page="lab"></script>
<script src="/feeds.js" defer></script>
</body>
</html>
`;
fs.writeFileSync(path.join(ROOT, 'index.html'), html);
console.log('index.html written:', used.size, 'catalogue worlds,', PLAY.length - 1, 'playground instruments,', MACHINES.length, 'machines');
