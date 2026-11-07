/* The four-stroke teardown: the console around the engine. Every value on screen is a function of the model's state
   (model.js); the geometry (machine.js) is the picture, posed from the same state. */
import {createTeardown, fmt, COLOURS as C} from '/study/teardown/kit/teardown.js';
import * as model from './model.js';
import {build} from './machine.js';

const {SPEC, ASSUMED, BANDS} = model;
const SIMPLE = {label: 'Simplified', note: 'Ideal air-standard Otto cycle: ideal gas, γ = 1.4, an instant burn at TDC, no heat loss, valves that open and close at the dead centres. Real engines peak lower and are less efficient.'};

createTeardown({
  id: 'four-stroke',
  title: 'Four-stroke engine',
  subtitle: `One cylinder · bore ${SPEC.bore} × stroke ${SPEC.stroke} mm · ${fmt(model.VD / 1000, 1)} cm³ · ${fmt(SPEC.cr, 1)} : 1`,
  level: 'Links to NCEA Level 2 Physics, AS91171 mechanics: force, torque, work and power. The gas cycle goes beyond the standard.',
  checked: '8 November 2026',
  truth: [SIMPLE, {label: 'Illustrative', note: 'Heat added (800 kJ per kg of air), the rod length and the valve lift are teaching values, not measurements of a real engine.'}],
  canvasLabel: 'A single-cylinder four-stroke engine, cut open. The piston, rod, crankshaft, valves and camshaft move from the crank angle.',
  model: {
    period: 720,
    unit: '°',
    at: model.at,
    checks: model.checks,
    inputs: [
      {key: 'cr', label: 'Compression ratio', min: 6, max: 12, step: 0.1, value: SPEC.cr, digits: 1, format: (v) => fmt(v, 1) + ' : 1', note: 'Spec sheet: 9.0 : 1. The head moves to change the gap above the piston.'},
      {key: 'q', label: 'Heat added', min: 200, max: 1500, step: 50, value: 800, format: (v) => fmt(v) + ' kJ/kg', note: 'Illustrative teaching value, per kg of air in the cylinder.'},
    ],
    toggles: [{key: 'spark', label: 'Spark plug', value: true, on: 'Firing', off: 'Cut', note: 'Cut the spark: the crank still turns, but nothing burns.'}],
  },
  inputsTruth: {label: 'Illustrative', note: 'Change one thing, keep the others the same, and watch the loop and the work per cycle.'},
  build,
  bands: BANDS,
  step: 10,
  cycleSeconds: 6,
  live: {
    label: 'Gas pressure in the cylinder, bar',
    unit: 'bar',
    digits: 1,
    value: (s) => s.p,
    a: (s) => s.stroke + ' stroke',
    b: (s) => fmt(s.theta) + '° of 720°',
  },
  say: (s) => s.stroke + ' stroke',
  status: (s, k) => `One cycle takes ${fmt(k.cycleSeconds)} s here · ${fmt(120000 / SPEC.rpm, 1)} ms at ${fmt(SPEC.rpm)} rpm`,
  readoutsTruth: SIMPLE,
  readouts: [
    {label: 'Crank angle', get: (s) => `${fmt(s.theta)}° · turn ${s.theta < 360 ? 1 : 2} of 2`},
    {label: 'Camshaft', get: (s) => `${fmt(s.cam)}° · half crank speed`},
    {label: 'Piston below TDC', get: (s) => `${fmt(s.x, 1)} mm`},
    {label: 'Gas volume', get: (s) => `${fmt(s.V, 1)} cm³`},
    {label: 'Gas temperature', get: (s) => (s.strokeIndex === 3 ? 'open to exhaust' : `${fmt(s.T)} K`)},
    {label: 'Force on the piston', get: (s) => `${fmt(s.F / 1000, 2)} kN`},
    {label: 'Torque on the crank', get: (s) => `${fmt(s.torque)} N·m`},
    {label: 'Work per cycle', get: (s) => `${fmt(s.W, 1)} J`},
    {label: 'Efficiency, ideal', get: (s) => `${fmt(s.eta * 100, 1)}%`},
  ],
  charts: [
    {
      id: 'pv', kind: 'loop', title: 'Pressure and volume', truth: SIMPLE, fill: true,
      x: {label: 'cm³', get: (s) => s.V, min: 0},
      y: {label: 'bar', get: (s) => s.p, min: 0},
      value: (s) => `${fmt(s.p, 1)} bar at ${fmt(s.V, 1)} cm³`,
      footer: (_, inp) => `The area inside the loop is the work: ${fmt(model.integrate(inp, 1440).pdv, 1)} J per cycle. It closes once every 720°.`,
    },
    {
      id: 'valves', kind: 'sweep', title: 'Valve lift', truth: {label: 'Simplified', note: 'Here each valve opens and closes at a dead centre. Real valves open early and close late, so both are open together for a moment (overlap).'},
      y: {label: 'mm', min: 0, max: 7},
      series: [{label: 'Intake', get: (s) => s.liftIn}, {label: 'Exhaust', get: (s) => s.liftEx}],
      value: (s) => `intake ${fmt(s.liftIn, 1)} mm · exhaust ${fmt(s.liftEx, 1)} mm`,
    },
    {
      id: 'torque', kind: 'sweep', title: 'Torque on the crank', truth: {label: 'Simplified', note: 'Gas force only, τ = F r sin(θ + φ) / cos φ. No friction and no inertia of the moving parts.'},
      y: {label: 'N·m'},
      series: [{label: 'Torque', get: (s) => s.torque}],
      value: (s) => `${fmt(s.torque)} N·m`,
      footer: (_, inp) => `Average over the cycle: ${fmt(model.cycle(inp).W / (4 * Math.PI), 1)} N·m. Only the power stroke pushes; compression takes some back.`,
    },
  ],
  schematic: {
    title: 'Slider-crank',
    truth: {label: 'Exact', note: 'The piston position is exact for these lengths. The rod length is assumed.'},
    height: 150,
    formula: `x = r + l − (r cos θ + √(l² − r² sin² θ))<br>r = ${fmt(model.r, 1)} mm · l = ${ASSUMED.rod} mm (assumed)`,
    draw(s, {c}) {
      const k = 7.4; // px per cm
      const cx = 70;
      const cy = 124;
      const th = (s.theta * Math.PI) / 180;
      const rr = (model.r / 10) * k;
      const ll = (model.l / 10) * k;
      const px = cx + rr * Math.sin(th);
      const py = cy - rr * Math.cos(th);
      const pinY = cy - (rr * Math.cos(th) + Math.sqrt(ll * ll - (rr * Math.sin(th)) ** 2));
      const tdcY = cy - rr - ll;
      const bw = (SPEC.bore / 20) * k;
      const ink = 'currentColor';
      const acc = s.strokeIndex === 2 ? C.roseInk : ink;
      const a = (s.crank * Math.PI) / 180;
      const arc = `M${cx},${cy - 14} A14,14 0 ${s.crank > 180 ? 1 : 0} 1 ${(cx + 14 * Math.sin(a)).toFixed(1)},${(cy - 14 * Math.cos(a)).toFixed(1)}`;
      return `<g style="color:var(--ink)" font-family="IBM Plex Mono, monospace" font-size="9">
        <line x1="${cx - bw - 3}" y1="${tdcY - 1.8 * k - 2}" x2="${cx - bw - 3}" y2="${cy - 20}" stroke="${ink}" stroke-opacity=".35"/>
        <line x1="${cx + bw + 3}" y1="${tdcY - 1.8 * k - 2}" x2="${cx + bw + 3}" y2="${cy - 20}" stroke="${ink}" stroke-opacity=".35"/>
        <line x1="${cx - bw - 10}" y1="${tdcY}" x2="${cx + bw + 10}" y2="${tdcY}" stroke="${ink}" stroke-dasharray="2 3" stroke-opacity=".5"/>
        <text x="${cx + bw + 13}" y="${tdcY + 3}" fill="${ink}" fill-opacity=".7">TDC</text>
        <line x1="${cx - bw - 10}" y1="${tdcY + (SPEC.stroke / 10) * k}" x2="${cx + bw + 10}" y2="${tdcY + (SPEC.stroke / 10) * k}" stroke="${ink}" stroke-dasharray="2 3" stroke-opacity=".5"/>
        <text x="${cx + bw + 13}" y="${tdcY + (SPEC.stroke / 10) * k + 3}" fill="${ink}" fill-opacity=".7">BDC</text>
        <circle cx="${cx}" cy="${cy}" r="${rr}" fill="none" stroke="${ink}" stroke-dasharray="2 3" stroke-opacity=".45"/>
        <rect x="${cx - bw}" y="${(pinY - 1.8 * k).toFixed(1)}" width="${2 * bw}" height="${(4 * k).toFixed(1)}" rx="2" fill="${C.roseMauve}" stroke="${acc}"/>
        <line x1="${px.toFixed(1)}" y1="${py.toFixed(1)}" x2="${cx}" y2="${pinY.toFixed(1)}" stroke="${ink}" stroke-width="2.2" stroke-linecap="round"/>
        <line x1="${cx}" y1="${cy}" x2="${px.toFixed(1)}" y2="${py.toFixed(1)}" stroke="${ink}" stroke-width="3" stroke-linecap="round"/>
        <path d="${arc}" fill="none" stroke="${C.roseInk}"/>
        <circle cx="${cx}" cy="${cy}" r="2.5" fill="${ink}"/><circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="2.5" fill="${ink}"/><circle cx="${cx}" cy="${pinY.toFixed(1)}" r="2.2" fill="${ink}"/>
        <line x1="${cx - bw - 18}" y1="${tdcY}" x2="${cx - bw - 18}" y2="${pinY.toFixed(1)}" stroke="${C.roseInk}" stroke-width="1.5"/>
        <text x="${cx - bw - 22}" y="${((tdcY + pinY) / 2 + 3).toFixed(1)}" text-anchor="end" fill="${C.roseInk}">x</text>
        <g transform="translate(150,26)" fill="${ink}">
          <text y="0">θ  ${fmt(s.theta)}°</text>
          <text y="16">x  ${fmt(s.x, 1)} mm</text>
          <text y="32">φ  ${fmt(s.phi, 1)}°</text>
          <text y="48">V  ${fmt(s.V, 1)} cm³</text>
          <text y="70" fill="${C.roseInk}">${s.stroke}</text>
        </g></g>`;
    },
  },
  legend: {
    items: [
      {key: 'fresh', label: 'Air and fuel', colour: C.paleRose},
      {key: 'compressed', label: 'Compressed', colour: C.rose},
      {key: 'burning', label: 'Burning', colour: C.roseInk},
      {key: 'exhaust', label: 'Exhaust', colour: C.mist},
    ],
    active: (s) => (s.charge === 'expanding' ? 'burning' : s.charge),
  },
  callouts: [
    {anchor: 'intake', label: 'Intake valve', side: 'left', at: 0.16, value: (s) => (s.liftIn > 0.05 ? `open ${fmt(s.liftIn, 1)} mm` : 'closed'), hot: (s) => s.liftIn > 0.2},
    {anchor: 'piston', label: 'Piston', side: 'left', at: 0.4, value: (s) => `${fmt(s.x, 1)} mm below TDC`, hot: (s) => s.strokeIndex === 2},
    {anchor: 'rod', label: 'Connecting rod', side: 'left', at: 0.6, value: (s) => `${fmt(s.phi, 1)}° from upright`},
    {anchor: 'crank', label: 'Crankshaft', side: 'left', at: 0.8, value: (s) => `${fmt(s.crank)}° · ${fmt(s.torque)} N·m`},
    {anchor: 'cam', label: 'Camshaft', side: 'right', at: 0.12, value: (s) => `${fmt(s.cam)}°, half speed`},
    {anchor: 'plug', label: 'Spark plug', side: 'right', at: 0.27, value: (s) => (s.sparking ? 'sparks now' : 'fires at 360°'), hot: (s) => s.sparking},
    {anchor: 'exhaust', label: 'Exhaust valve', side: 'right', at: 0.42, value: (s) => (s.liftEx > 0.05 ? `open ${fmt(s.liftEx, 1)} mm` : 'closed'), hot: (s) => s.liftEx > 0.2},
    {anchor: 'charge', label: 'Gas in the cylinder', side: 'right', at: 0.58, value: (s) => `${fmt(s.p, 1)} bar · ${fmt(s.V, 1)} cm³`},
    {anchor: 'flywheel', label: 'Flywheel', side: 'right', at: 0.82, value: () => 'stores energy between pushes'},
  ],
  subsystems: [
    {key: 'crank', label: 'Crank train', note: 'Piston, connecting rod, crankshaft and flywheel'},
    {key: 'valves', label: 'Valve train', note: 'Camshaft, valves and springs. Simplified: shown as an overhead cam pressing the valves directly.'},
    {key: 'charge', label: 'Charge and spark', note: 'The gas in the cylinder and the spark plug'},
    {key: 'shell', label: 'Block and head', note: 'Crankcase, finned cylinder, head and ports'},
  ],
  cutOnStart: true,
  views: {
    hero: {label: 'Hero', az: 32, el: 16, dist: 66, target: [0, 7.8, 0]},
    front: {label: 'Front', az: 0, el: 3, dist: 64, target: [0, 7.8, 0]},
    side: {label: 'Side', az: 90, el: 5, dist: 64, target: [0, 7.8, 0]},
    top: {label: 'Top', az: 0, el: 76, dist: 56, target: [0, 9, 0]},
    inside: {label: 'Inside', az: 4, el: 6, dist: 34, target: [0, 12.6, 0]},
    apart: {hidden: true, az: 32, el: 14, dist: 132, target: [0, 13, 1]},
  },
  learn: [
    {step: 'Explore', text: 'Press Play and watch one whole cycle. The crankshaft turns twice while each valve opens once. Which part takes the rose colour in each stroke?', show: {play: true, view: 'hero', cut: true, select: 'all', isolate: false}, button: 'Play the cycle'},
    {step: 'Predict', text: 'Before you cut the spark, predict what happens to the loop on the pressure and volume chart, and to the work per cycle. Write your reason down.', show: {view: 'inside', select: 'charge', play: true}, button: 'Look inside'},
    {step: 'Investigate', text: 'Keep the heat added the same. Set the compression ratio to 6, 9 and 12, and record the work per cycle and the efficiency each time.', show: {view: 'front', select: 'all'}, button: 'Front view'},
    {step: 'Explain', text: 'Use the torque chart to explain why the engine needs a heavy flywheel. Which stroke pushes the crank, and which strokes take energy back?', show: {select: 'crank', isolate: true, view: 'side', play: true}, button: 'Isolate the crank'},
  ],
  sources: [
    {label: 'Engine specifications, GX160 column (Honda News)', href: 'https://hondanews.com/en-US/releases/release-0cde2246a552407380ff246f705f8d0d-honda-mid-gx-engines-specifications', note: 'Reference engine: bore 68 × stroke 45 mm, 163 cm³, 9.0 : 1, rated at 3,600 rpm. Used for the dimensions only.'},
    {label: 'Ideal Otto Cycle (NASA Glenn Research Center)', href: 'https://www.grc.nasa.gov/www/k-12/airplane/otto.html', note: 'The strokes in order and the pressure and volume diagram; the loop area is the work.'},
    {label: 'The internal combustion engine, Otto cycle (MIT Unified Engineering notes)', href: 'https://web.mit.edu/16.unified/www/FALL/thermodynamics/notes/node26.html', note: 'Isentropic compression and expansion, constant-volume burn, and efficiency 1 − 1/r^(γ−1).'},
    {label: 'AS91171 Demonstrate understanding of mechanics (NZQA)', href: 'https://www.nzqa.govt.nz/nqfdocs/ncea-resource/achievements/2019/as91171.pdf', note: 'Level 2 Physics: force, torque, work and power. Teacher to confirm the fit for your course.'},
    {label: 'Slider-crank and the torque on the crank', note: 'Geometry: x and φ from the triangle of crank and rod; τ = F r sin(θ + φ) / cos φ from virtual work. Checked against ∮p dV on this page.'},
  ],
});
