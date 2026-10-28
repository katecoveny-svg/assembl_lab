/** Original teaching models; no Studio implementation or external library copied. */
export const turnAngle = count => 360 / count;
export const waveAt = (x, phase) => Math.sin(x) + Math.sin(x + phase * Math.PI / 180);
export const waveAmplitude = phase => 2 * Math.abs(Math.cos(phase * Math.PI / 360));
export function nearest(point, sites) {
  const distances = sites.map(s => Math.hypot(point.x - s.x, point.y - s.y));
  const min = Math.min(...distances);
  return { distances, winners: distances.map((d, i) => Math.abs(d - min) < 1e-7 ? i : -1).filter(i => i >= 0) };
}
export function grade(mode, answer, state) {
  if (String(answer).trim() === '') return { correct: false, message: 'Make a prediction first, then check it against the model.' };
  const expected = mode === 'symmetry' ? turnAngle(state.count) : mode === 'waves' ? waveAmplitude(state.phase) : nearest({x:state.probe,y:50}, [{x:20,y:50},{x:state.site,y:50}]).winners.join(',');
  const correct = mode === 'regions' ? answer === expected : Number.isFinite(Number(answer)) && Math.abs(Number(answer) - expected) < (mode === 'waves' ? .011 : .06);
  const explanation = mode === 'symmetry' ? `A full turn is 360°. Divide it into ${state.count} equal repeats: 360 ÷ ${state.count} = ${expected.toFixed(1).replace('.0','')}°. Each identical petal takes the place of the next.` : mode === 'waves' ? `The peak amplitude is ${expected.toFixed(2)} units. Equal waves reinforce at 0° (2 units) and cancel at 180° (0 units). Adding displacements is different from adding their sizes.` : `The probe is ${Math.abs(state.probe-20)} units from A and ${Math.abs(state.probe-state.site)} from B. ${expected === '0,1' ? 'Equal distances put it on the boundary.' : `The shorter distance belongs to ${expected === '0' ? 'A' : 'B'}.`}`;
  return { correct, message: `${correct ? 'That fits the evidence.' : 'Not quite. Try the model again.'} ${explanation}` };
}
