/* {{TITLE}}: the console. Every value on screen is a function of the model's state. */
import {createTeardown, fmt} from '/study/teardown/kit/teardown.js';
import * as model from './model.js';
import {build} from './machine.js';

createTeardown({
  id: '{{SLUG}}',
  title: '{{TITLE}}',
  subtitle: `TODO: the real machine in one line · crank ${model.SPEC.crank} mm · rod ${model.SPEC.rod} mm`,
  level: 'TODO: the NCEA standard or curriculum topic it links to, with a source below. Teacher to confirm.',
  checked: 'TODO: the date you checked the sources',
  truth: [{label: 'Simplified', note: 'TODO: what the model leaves out.'}],
  model: {
    period: 360, unit: '°', at: model.at, checks: model.checks,
    inputs: [{key: 'rpm', label: 'Crank speed', min: 10, max: 120, step: 5, value: 60, format: (v) => fmt(v) + ' rpm', note: 'TODO: where the range comes from.'}],
  },
  build,
  bands: [{from: 0, to: 180, label: 'Inward'}, {from: 180, to: 360, label: 'Outward'}],
  step: 10,
  cycleSeconds: 4,
  live: {label: 'Slider speed, m/s', unit: 'm/s', digits: 2, value: (s) => Math.abs(s.v), a: (s) => s.half, b: (s) => fmt(s.theta) + '°'},
  readouts: [
    {label: 'Crank angle', get: (s) => fmt(s.theta) + '°'},
    {label: 'Slider position', get: (s) => fmt(s.x, 1) + ' mm'},
    {label: 'Rod angle', get: (s) => fmt(s.phi, 1) + '°'},
  ],
  charts: [
    {id: 'x', kind: 'sweep', title: 'Slider position', y: {label: 'mm', min: 0}, series: [{label: 'Position', get: (s) => s.x}], value: (s) => fmt(s.x, 1) + ' mm'},
    {id: 'v', kind: 'sweep', title: 'Slider speed', y: {label: 'm/s'}, series: [{label: 'Speed', get: (s) => s.v}], value: (s) => fmt(s.v, 2) + ' m/s'},
    {id: 'xv', kind: 'loop', title: 'Position and speed', x: {label: 'mm', get: (s) => s.x}, y: {label: 'm/s', get: (s) => s.v}, value: (s) => `${fmt(s.x, 1)} mm, ${fmt(s.v, 2)} m/s`},
  ],
  schematic: {
    title: 'Crank and slider', truth: {label: 'Exact', note: 'Exact for these lengths.'},
    formula: 'x = r + l − (r cos θ + √(l² − r² sin² θ))',
    draw(s) {
      const k = 1.4;
      const th = (s.theta * Math.PI) / 180;
      const cx = 40, cy = 75;
      const px = cx + model.SPEC.crank * k * Math.cos(th), py = cy - model.SPEC.crank * k * Math.sin(th);
      const sx = cx + (model.SPEC.crank + model.SPEC.rod - s.x) * k;
      return `<g stroke="currentColor" style="color:var(--ink)" fill="none"><circle cx="${cx}" cy="${cy}" r="${model.SPEC.crank * k}" stroke-dasharray="2 3" opacity=".5"/>
        <line x1="${cx}" y1="${cy}" x2="${px}" y2="${py}" stroke-width="3"/><line x1="${px}" y1="${py}" x2="${sx}" y2="${cy}" stroke-width="2"/>
        <rect x="${sx - 10}" y="${cy - 8}" width="20" height="16" rx="2" fill="#D4B6C7"/></g>`;
    },
  },
  callouts: [
    {anchor: 'crank', label: 'Crank', side: 'left', at: 0.3, value: (s) => fmt(s.theta) + '°'},
    {anchor: 'rod', label: 'Rod', side: 'left', at: 0.6, value: (s) => fmt(s.phi, 1) + '° from the line'},
    {anchor: 'slider', label: 'Slider', side: 'right', at: 0.4, value: (s) => fmt(s.x, 1) + ' mm', hot: (s) => s.theta < 180},
  ],
  subsystems: [{key: 'motion', label: 'Moving parts'}, {key: 'frame', label: 'Frame'}],
  views: {
    hero: {label: 'Hero', az: 20, el: 22, dist: 70, target: [5, 0, 0]},
    front: {label: 'Front', az: 0, el: 2, dist: 66, target: [5, 0, 0]},
    top: {label: 'Top', az: 0, el: 80, dist: 60, target: [5, 0, 0]},
    apart: {hidden: true, az: 24, el: 20, dist: 110, target: [5, 2, 2]},
  },
  learn: [
    {step: 'Explore', text: 'TODO: what to watch first.', show: {play: true, view: 'hero'}},
    {step: 'Predict', text: 'TODO: a prediction to write down before changing anything.'},
    {step: 'Investigate', text: 'TODO: change one input, keep the rest, record what the model says.'},
    {step: 'Explain', text: 'TODO: the why, using a chart.'},
  ],
  sources: [{label: 'TODO: the reference you built from (video, drawing, spec sheet)', href: '', note: 'TODO: what you took from it'}],
});
