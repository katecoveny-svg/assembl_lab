#!/usr/bin/env node
// Builds the Lab home (/index.html) as one scroll story from the catalogue (lab/catalogue.js = window.LAB_WORLDS)
// and the maturity ladder (lab/maturity.json). Run after editing either file:  node scripts/build-lab-home.cjs
//
// The page is static HTML on purpose: with no JS, or with reduced motion, it is the complete story. It wears the
// site-v2 look ported from assembl.co.nz (/site-v2/: tokens, CSS, and markup.cjs, the string twins of the foundation's
// components). /site-v2/site-v2.js adds the same motion as the main site (split-text headlines, reveals, parallax,
// the flat mark A assembling from its four parts); lab/story.js adds live data labels.
//
// Curation is presentation only. Every world in LAB_WORLDS and every instrument the old /discover/ page linked
// appears here exactly once; scripts/check-lab-home.cjs fails if one goes missing or shows twice.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const v2 = require('../site-v2/markup.cjs');

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

/* ── point cloud (Nov 2026): the assembl point-cloud look across the home. The pictures are stills rendered by the shared engine
   (tools/pointcloud/stills.cjs → lab/pc/stills/*.webp); a picture that has not been rendered yet keeps its original render. ── */
const still = (id, fallback) => (fs.existsSync(path.join(ROOT, `lab/pc/stills/${id}.webp`)) ? `/lab/pc/stills/${id}.webp` : fallback);
const pcAlt = (alt) => `Point cloud of ${alt.replace(/^(Offline render of |Render of )/i, '').replace(/^The /, 'the ').replace(/^A /, 'a ')}`;
/* the hero (Nov 2026): Tāmaki Makaurau Auckland as a point cloud, baked from open data by tools/pointcloud/bake-auckland.mjs
   (assets/models/auckland/auckland-points.*) and drawn by lab/pc/home.js. Callouts name real public landmarks with facts only.
   Twins stand on real sites of their kind as examples (the bake finds a site by category and keeps only its coordinates);
   no business or institution is named, and each pin says it is not a model of that site. */
const AKL = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/models/auckland/auckland-points.json'), 'utf8'));
const HERO_CALLOUTS = [   // in the order they claim space on the map
  ['skytower', 'Sky Tower', '328 m. The tallest freestanding structure in the Southern Hemisphere when it opened in 1997.'],
  ['rangitoto', 'Rangitoto', 'The youngest of Auckland’s volcanoes, about 600 years old. 260 m high.'],
  ['bridge', 'Auckland Harbour Bridge', 'Opened in 1959, 1,020 m long. Clip-on lanes added in 1969 took it to eight.'],
  ['maungawhau', 'Maungawhau / Mount Eden', 'The highest volcanic cone on the isthmus: 196 m, with a crater 50 m deep.'],
  ['waitemata', 'Waitematā Harbour', 'Auckland’s main harbour, opening east to the Hauraki Gulf.'],
].filter(([id]) => AKL.anchors[id]);
const HERO_PINS = [   // numbered in this order on the map and in its key; every one is shown
  ['ed', 'City ED twin', '#twin-ed', 'Example, not a model of this hospital'],
  ['cars', 'Car yard twin', '#twin-cars', 'Example, not a model of this site'],
  ['store', 'Supermarket twin', '#twin-store', 'Example, not a model of this site'],
  ['cafe', 'Café twin', '#twin-cafe', 'Example, not a model of this café'],
  ['retail', 'Trade yard twin', href(WORLDS.retail), 'Example, not a model of this site'],
  ['stay', 'Stay twin', href(WORLDS.stay), 'Example, not a model of this site'],
  ['office', 'Office twin', href(WORLDS.office), 'Example, not a model of this site'],
].filter(([id]) => AKL.sites && AKL.sites[id]);
const heroCallouts = HERO_CALLOUTS.map(([id, t, line]) => `<li class="hero-callout" data-anchor="${id}"><strong>${esc(t)}</strong><span>${esc(line)}</span></li>`).join('');
const heroPins = HERO_PINS.map(([id, t, h, truth], i) => `<li class="hero-pin" data-site="${id}"><a href="${h}"><span class="pin-n" aria-hidden="true">${i + 1}</span><strong>${esc(t)}</strong><span class="pin-truth">${esc(truth)}</span></a></li>`).join('');
/* the key under the map: the numbered twins and the truth line they share, always visible beside the cloud (each chip carries
   its own truth line too, shown on hover or focus) */
const heroKey = HERO_PINS.map(([id, t], i) => `<li data-site="${id}"><span class="pin-n">${i + 1}</span><strong>${esc(t)}</strong></li>`).join('');
const AKL_CREDIT = `Auckland from open map data at true scale, heights ×${AKL.verticalExaggeration}; Sky Tower and Harbour Bridge drawn from published dimensions. Elevation: LINZ (CC BY 4.0). Map data © OpenStreetMap contributors.`;
/* the twins the hero links to: plain links, no place implied (pins on the map carry the sites) */
const HERO_TAGS = [['cafe', 'Café'], ['store', 'Supermarket'], ['ed', 'Emergency department'], ['dairy', 'Dairy plant'], ['energy', 'Energy street'], ['cars', 'Car yard']];
/* the doors: straight to each part of the lab (not world tiles, so the check's "exactly once" count is untouched).
   Exam season (Nov 2026): the study machines door leads, two columns wide, showing three of the machines themselves as
   point clouds (their stills from the study chapter below, so no extra bytes), each named underneath. */
const JUMP = [
  { href: '/study/', title: 'Study machines', line: 'Free 3D machines for Years 7 to 13 and NCEA. Change one setting, watch what happens, then test yourself. No sign-up.', still: 'jump-study', truth: 'sim',
    trio: [['claw', 'The claw machine'], ['heart', 'Heart Pump Lab'], ['windtunnel', 'The wind tunnel']] },
  { href: '#twins', title: 'Business sims', line: 'Run a café, an emergency department or a dairy plant for a day.', still: 'jump-sims', truth: 'sim' },
  { href: '/plan-studio/', title: 'Architecture lab', line: 'Plans in, a measured 3D model out, pre-checked against the NZ Building Code.', still: 'jump-architecture', truth: 'live' },
  ...(fs.existsSync(path.join(ROOT, 'sea/index.html')) ? [{ href: '/sea/', title: 'Sea State', line: 'A water taxi and a ferry on a sea made of code, with a ride-comfort reading.', still: 'jump-sea', truth: 'sim' }] : []),
  { href: '#playground', title: 'Playground', line: 'Instruments for making things. Everything stays on your device.', still: 'jump-play', truth: 'ill' },
];
const jumpPic = j => {
  const trio = (j.trio || []).filter(([id]) => fs.existsSync(path.join(ROOT, `lab/pc/stills/mc-${id}.webp`)));
  if (trio.length === 3) return `<span class="jump-pic jump-trio" aria-hidden="true">${trio.map(([id, name]) => `<span class="trio-cell">${img(`/lab/pc/stills/mc-${id}.webp`, '', 1280, 960)}<span class="trio-k">${esc(name)}</span></span>`).join('')}</span>`;
  return fs.existsSync(path.join(ROOT, `lab/pc/stills/${j.still}.webp`)) ? `<span class="jump-pic">${img(`/lab/pc/stills/${j.still}.webp`, '', 800, 500)}</span>` : '';
};
const jumpTiles = JUMP.map(j => `<li${j.trio ? ' class="jump-lead"' : ''}><a class="jump-tile" href="${j.href}">${jumpPic(j)}<span class="jump-copy"><strong>${esc(j.title)}</strong><span class="row-line">${esc(j.line)}</span>${chip(j.truth)}</span><span class="row-go" aria-hidden="true">${v2.arrow('up-right', 16)}</span></a></li>`).join('\n  ');

/* ── markup ── */
const goArrow = v2.arrow('right', 18);
const stageSteps = STAGE.map((s, i) => {
  const w = take(s.id);
  return `<li class="tw-step" data-i="${i}" id="twin-${w.id}">
  <figure class="tw-pic frame">${still('twin-' + s.id, null) ? img(still('twin-' + s.id), pcAlt(s.alt), s.img[1], s.img[2], i === 0) : img(s.img[0], s.alt, s.img[1], s.img[2], i === 0)}</figure>
  <div class="tw-copy">
   <p class="kind">${esc(s.kind)}</p>
   <h3>${esc(w.title)}</h3>
   <p class="line">${esc(w.desc)}</p>
   <div class="meta">${chip('sim')}${dataLine(w)}</div>
   <a class="go" href="${href(w)}"><span>${esc(w.action)}</span>${goArrow}</a>
  </div>
 </li>`;
}).join('\n ');

const rowTile = (w, line, truth, opts = {}) => {
  const pic = opts.pic ? `<span class="row-pic frame">${img(opts.pic, '', 240, 170)}</span>` : '';
  return `<li><a class="row${pic ? '' : ' row-type'}" href="${opts.href || href(w)}">${pic}<span class="row-copy"><strong>${esc(opts.title || w.title)}</strong><span class="row-line">${esc(line)}</span><span class="meta">${chip(truth)}${w && !opts.noData ? `<span class="src" title="${esc(stageOf(w.id).why)}"><span class="src-stage" data-stage="${stageOf(w.id).stage}">${esc(stageOf(w.id).label)}</span> <span data-live="${w.id}">${esc(w.data)}</span></span>` : ''}</span></span><span class="row-go" aria-hidden="true">${v2.arrow('up-right', 16)}</span></a></li>`;
};
// the smaller twins are a calm typed index on the plum ground (a picture only once one is rendered in the point-cloud look)
const moreTwins = MORE_TWINS.map(t => { const w = take(t.id); return rowTile(w, t.line, 'sim', { pic: still('row-' + w.id, null) }); }).join('\n  ');
const homeRows = HOME.map(t => { const w = take(t.id); return rowTile(w, t.line, 'sim', { pic: still('row-' + w.id, null) }); }).join('\n  ');

// two lead cards, then rows of three; a short last row stretches so the grid never ends with a gap
const tail = (MACHINES.length - 2) % 3;
const mcClass = i => (i < 2 ? ' mc-lead' : tail && i >= MACHINES.length - tail ? (tail === 2 ? ' mc-wide' : ' mc-full') : '');
const mcId = (m) => m.href.replace(/^.*\/m\/|\.html$/g, '');
const machines = MACHINES.map((m, i) => `<li class="mc${mcClass(i)}"><a href="${m.href}">
  <figure class="frame">${still('mc-' + mcId(m), null) ? img(still('mc-' + mcId(m)), pcAlt(m.alt), 1280, 960) : img(m.img[0], m.alt, m.img[1], m.img[2])}</figure>
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

/* ── site-v2 chrome (8 Nov 2026): the foundation's SiteNav and SiteFooter, with the Lab's own doors ── */
const MAIN = 'https://assembl.co.nz';
const top = { target: '_top' };
const labMark = (size, mark, eager) => v2.wordmark({ href: '/', size, mark, suffix: 'lab', label: 'assembl lab home', eager });
const nav = v2.siteNav({
  home: labMark(23, 32, true),
  links: [{ href: '#twins', label: 'Twins' }, { href: '#study', label: 'Study machines' }, { href: '#playground', label: 'Playground' }, { href: '#about', label: 'Labels' }],
  cta: { href: `${MAIN}/`, label: 'assembl.co.nz', extra: top },
});
const footer = v2.siteFooter({
  home: labMark(22, 34),
  links: [
    { href: '#twins', label: 'Twins' }, { href: '/study/', label: 'Study machines' }, { href: '#playground', label: 'Playground' }, { href: '#about', label: 'How to read the labels' },
    { href: `${MAIN}/`, label: 'assembl.co.nz', extra: top }, { href: `${MAIN}/ai-ready`, label: 'Website check', extra: top }, { href: `${MAIN}/trust`, label: 'Trust', extra: top },
    { href: `${MAIN}/about`, label: 'About', extra: top }, { href: `${MAIN}/contact`, label: 'Contact', extra: top },
  ],
  legal: [{ href: `${MAIN}/legal/privacy`, label: 'Privacy', extra: top }, { href: `${MAIN}/legal/terms`, label: 'Terms', extra: top }, { href: `${MAIN}/legal/disclaimer`, label: 'Disclaimer', extra: top }],
  note: 'Independent assembl concepts. Simulated data unless marked live with a named source. Not medical, financial or energy advice. In an emergency, call 111.',
  strip: ['Made in Aotearoa', '© 2026 <span class="v2-brand">assembl</span>'],
});
const tickerItems = [...STAGE, ...MORE_TWINS].map(s => WORLDS[s.id].title);

const html = `<!doctype html>
<html lang="en-NZ" data-feeds="ed,power,fuel,fpi" class="lab-story">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>assembl lab · small worlds, assembled</title>
<meta name="description" content="Working models of New Zealand places, built by assembl: business twins you can run for a day, study machines that teach one idea, and a playground of instruments. Every one says what is simulated and what is real.">
<meta property="og:title" content="assembl lab · small worlds, assembled"><meta property="og:description" content="Business twins, study machines and a playground, built in Aotearoa. Every world says what is simulated and what is real."><meta property="og:image" content="https://assembl-lab.vercel.app/assets/models/cafe/renders/cafe-hero.webp">
<meta name="theme-color" content="#21121F"><link rel="icon" href="/lab/favicon.svg" type="image/svg+xml"><link rel="icon" href="/site-v2/mark-a-32.png" sizes="32x32" type="image/png"><link rel="apple-touch-icon" href="/site-v2/mark-a-180.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/site-v2/site-v2.css"><link rel="stylesheet" href="/site-v2/lab.css"><link rel="stylesheet" href="/lab/story.css"><link rel="stylesheet" href="/lab/pc/pc.css">
<script type="importmap">{"imports":{"three":"/assets/vendor/three/three.module.min.js","three/addons/":"/assets/vendor/three/addons/"}}</script>
<script>document.documentElement.classList.add('js');</script>
<script src="/site-v2/site-v2.js" defer></script>
<script src="/lab/story.js" defer></script>
<script type="module" src="/lab/pc/home.js"></script>
</head>
<body class="site-v2">
<a class="skip" href="#twins">Skip to the twins</a>
${nav}
<main>
<div class="pc-run v2-tone-plum">
<div class="pc-stage" aria-hidden="true"><canvas id="pc-canvas"></canvas><svg class="pc-leaders"></svg></div>
<section class="hero v2-tone-plum" aria-labelledby="hero-title">
 <div class="hero-glow" aria-hidden="true"></div>
 <div class="wrap hero-in">
  <div class="hero-copy">
   ${v2.eyebrow(`The ${v2.brand()} lab · Aotearoa`)}
   ${v2.split({ tag: 'h1', id: 'hero-title', className: 'v2-display-xl', trigger: 'load', lines: ['Small worlds,', { text: 'assembled.', accent: true }] })}
   <p class="v2-lede lede">The assembl Lab is where we build working models of New Zealand places: businesses you can run for a day, machines that teach one idea, and a few instruments to play with.</p>
   <div class="actions">${v2.button({ href: '#twins', label: 'Walk through the twins', icon: 'down', size: 'lg' })}${v2.button({ href: '#study', label: 'See the study machines', variant: 'secondary', icon: 'down' })}</div>
   <p class="truth-note">${chip('sim')}${chip('ill')}${chip('live')}<span>Every world carries one of these labels.</span></p>
   <ul class="hero-tags" aria-label="Business twins in the lab"><li class="hero-tags-k">Twins</li>${HERO_TAGS.map(([id, t]) => `<li><a href="#twin-${id}">${esc(t)}</a></li>`).join('')}</ul>
  </div>
 </div>
 <div class="hero-art hero-world" id="hero-world" aria-hidden="true"><img src="/lab/pc/stills/hero-auckland.webp" srcset="/lab/pc/stills/hero-auckland-sm.webp 720w, /lab/pc/stills/hero-auckland.webp 1280w, /lab/pc/stills/hero-auckland-2x.webp 1760w" sizes="(min-width: 960px) 56vw, 100vw" alt="" width="1280" height="960" fetchpriority="high" decoding="async"></div>
 <div class="wrap hero-notes">
  <p class="hero-notes-k" aria-hidden="true">On the map</p>
  <ul class="hero-callouts" aria-label="On the map">${heroCallouts}</ul>
  <p class="hero-notes-k" aria-hidden="true">Twins on real sites of their kind, as examples</p>
  <ul class="hero-pins" aria-label="Twins on the map, each an example on a real site of its kind">${heroPins}</ul>
  <div class="hero-key" aria-hidden="true"><p class="hero-key-k">Twins on the map</p><ol>${heroKey}</ol><p class="hero-key-truth">Each is an example on a real site of its kind, not a model of the business or institution there.</p></div>
  <p class="hero-credit">${esc(AKL_CREDIT)} <a href="#about">Sources</a></p>
 </div>
</section>
<section class="jump v2-tone-plum" id="jump" aria-labelledby="jump-title">
 <div class="wrap">
  <div class="ch-head">
   ${v2.eyebrow('Go straight to')}
   <h2 class="v2-h2" id="jump-title">Every part of the lab, one step away.</h2>
  </div>
  ${v2.reveal(`
  ${jumpTiles}
  `, { tag: 'ul', className: 'jump-grid' })}
 </div>
</section>

<section class="arch v2-tone-plum" id="architecture" aria-labelledby="arch-title">
 <div class="wrap arch-in">
  <div class="arch-slot" aria-hidden="true"></div>
  <div class="arch-copy">
   ${v2.eyebrow('Architecture lab · Plan Studio')}
   ${v2.split({ tag: 'h2', id: 'arch-title', className: 'v2-h2', lines: ['Plans in.', { text: 'A model you can trust out.', accent: true }] })}
   <p class="v2-lede lede v2-secondary">Upload a 2D plan. Plan Studio measures it, builds the 3D model, pre-checks it against the NZ Building Code as you edit, keeps the working drawings in step, and makes the client presentation.</p>
   <div class="actions">${v2.button({ href: '/plan-studio/', label: 'Open Plan Studio', icon: 'right' })}${v2.button({ href: '/plan-studio/points/', label: 'See the point cloud', variant: 'secondary', icon: 'right' })}</div>
   <p class="truth-note"><span class="truth" data-k="sim">Example · fictional demo hall</span><span>The building here is the studio's demo, not a client's.</span></p>
  </div>
  <ul class="arch-callouts">
   <li class="arch-callout" data-anchor="entry"><strong>Measured from your PDF</strong><span class="typing">Walls, openings and rooms read from the drawing's own linework, each with its evidence.</span></li>
   <li class="arch-callout" data-anchor="wc"><strong>NZ Building Code pre-check</strong><span class="typing">The accessible WC passes; three rooms need more ventilation. Advisory, re-run on every edit.</span></li>
   <li class="arch-callout" data-anchor="ridge"><strong>Drawings that keep up</strong><span class="typing">Plans, elevations and a section, with revision clouds when the model changes.</span></li>
  </ul>
 </div>
</section>
<button type="button" class="pc-pause" aria-label="Pause motion" aria-pressed="false" hidden><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M8 5v14M16 5v14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></button>
</div>
${v2.ticker({ items: tickerItems, label: 'Worlds in the lab', seconds: 46, className: 'v2-tone-plum lab-ticker' })}

<span id="explore" class="anchor" aria-hidden="true"></span>
<section class="chapter twins v2-tone-plum" id="twins" aria-labelledby="twins-title">
 <div class="wrap">
 <div class="ch-head">
  ${v2.eyebrow('Business twins')}
  ${v2.split({ tag: 'h2', id: 'twins-title', className: 'v2-h2', lines: ['Businesses, assembled.', { text: 'Run one for a day.', accent: true }] })}
  <p class="v2-lede lede v2-secondary">Twins of the kinds of places New Zealand runs on. The businesses are invented; the public figures that feed them are named. Change one thing and follow where it goes.</p>
 </div>
 <div class="tw">
  ${v2.reveal(`
 ${stageSteps}
  `, { tag: 'ol', className: 'tw-steps' })}
 </div>
 <hr class="v2-hairline more-rule">
 <div class="more">
  <div class="more-col"><h3>More businesses</h3>${v2.reveal(`
  ${moreTwins}
  `, { tag: 'ul', className: 'rows' })}</div>
  <div class="more-col"><h3>Closer to home</h3>${v2.reveal(`
  ${homeRows}
  `, { tag: 'ul', className: 'rows' })}</div>
 </div>
 </div>
</section>

<div class="sheet pc-lower">
<section class="chapter study v2-tone-plum" id="study" aria-labelledby="study-title">
 <div class="wrap">
 <div class="ch-head">
  ${v2.eyebrow('Study machines')}
  ${v2.split({ tag: 'h2', id: 'study-title', className: 'v2-h2', lines: ['One idea,', { text: 'assembled into a machine.', accent: true }] })}
  <p class="v2-lede lede v2-secondary">Each study machine turns one curriculum topic into something you can turn, test and break, then marks your answers against the same model. Years 7 to 13, in <a href="${href(studyWorld)}">assembly, the study app</a>.</p>
  <div class="actions">${v2.button({ href: href(studyWorld), label: 'Open assembly', icon: 'right', className: 'go-world' })}<nav class="years" aria-label="Study machines by year">${YEARS.map(([h, t]) => `<a href="${h}">${t}</a>`).join('')}</nav></div>
 </div>
 ${v2.reveal(`
 ${machines}
 `, { tag: 'ul', className: 'machines' })}
 <div class="doors"><h3>Also in assembly</h3>${v2.reveal(`
  ${doors}
 `, { tag: 'ul', className: 'rows rows-3' })}</div>
 </div>
</section>

<section class="chapter play v2-tone-plum" id="playground" aria-labelledby="play-title">
 <div class="wrap">
 <div class="ch-head ch-head-row">
  <div class="ch-title">${v2.eyebrow('The playground')}
  ${v2.split({ tag: 'h2', id: 'play-title', className: 'v2-h2', lines: ['The playground.', { text: 'Some assembly required.', accent: true }] })}</div>
  <p class="v2-lede lede v2-secondary">Smaller instruments for making things. No lesson and no data: everything stays on your device.</p>
 </div>
 ${v2.reveal(`
  ${play}
 `, { tag: 'ul', className: 'index' })}
 </div>
</section>

<section class="chapter about v2-tone-plum" id="about" aria-labelledby="about-title">
 <div class="wrap">
 ${v2.eyebrow('Labels')}
 ${v2.split({ tag: 'h2', id: 'about-title', className: 'v2-h2', lines: [{ text: 'How to read the labels.', accent: false }] })}
 ${v2.reveal(`
  <div><dt>${chip('sim')}</dt><dd>A model of a place or a system. The place is invented; any public figures it uses are named on the page.</dd></div>
  <div><dt><span class="src-stage" data-stage="shadow">Shadow</span></dt><dd>Public data reaches the model each day or month, from Stats NZ, MBIE, Health NZ or the Electricity Authority. Nothing flows back.</dd></div>
  <div><dt>${chip('live')}</dt><dd>A working tool. It makes a real file or object on your device.</dd></div>
  <div><dt>${chip('ill')}</dt><dd>Art to play with. It makes no claim about the world.</dd></div>
 `, { tag: 'dl', className: 'labels' })}
 <div class="map-note">
  <p>The city at the top of this page is built from open map data at true scale. Twins sit on real sites of their kind as examples; none models the business or institution there.</p>
  <p class="map-credit">Elevation: LINZ (CC BY 4.0) via AWS Terrain Tiles. Coastline and buildings: © OpenStreetMap contributors (ODbL), via OpenFreeMap and © OpenMapTiles. Heights ×${AKL.verticalExaggeration}. The Sky Tower and the Harbour Bridge are drawn from their published dimensions (approximate), the tower ${AKL.verticalExaggeration}× in all directions so its shape reads.</p>
 </div>
 </div>
</section>
</div>

<section class="close v2-tone-plum" aria-labelledby="close-title">
 <div class="wrap close-in">
  <div class="close-copy">
   ${v2.eyebrow(`Work with ${v2.brand()}`)}
   ${v2.split({ tag: 'h2', id: 'close-title', className: 'v2-h2', trigger: 'assemble', lines: ['Want your business', { text: 'assembled as a twin?', accent: true }] })}
   <p class="v2-lede lede v2-secondary">assembl builds twins around real customer journeys, starting with public information and then, on your say-so, your own.</p>
   <div class="actions">${v2.button({ href: `${MAIN}/`, label: 'Talk to assembl', size: 'lg', extra: top })}${v2.button({ href: href(studyWorld), label: 'Study for exams', variant: 'secondary', icon: 'right' })}</div>
  </div>
 </div>
</section>
</main>
${footer}
<script src="/ask.js" defer data-page="lab"></script>
<script src="/feeds.js" defer></script>
</body>
</html>
`;
fs.writeFileSync(path.join(ROOT, 'index.html'), html);
console.log('index.html written:', used.size, 'catalogue worlds,', PLAY.length - 1, 'playground instruments,', MACHINES.length, 'machines');
