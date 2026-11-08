/** Original teaching robot. Metres/biology are not implied: all distances are illustrative cm. */
export const TAU = Math.PI * 2;
export const ARM_LENGTH = 24;
export function sample(time, {frequency = .5, wavelength = 12, mode = 'ripple'} = {}) {
  if (!Number.isFinite(time) || !Number.isFinite(frequency) || frequency <= 0 || !Number.isFinite(wavelength) || wavelength <= 0) throw new RangeError('Finite time and positive frequency/wavelength required');
  return {time, frequency, wavelength, speed: frequency * wavelength, period: 1 / frequency,
    arms: Array.from({length: 8}, (_, arm) => Array.from({length: 17}, (_, j) => {
      const distance = j / 16 * ARM_LENGTH;
      const phase = TAU * (distance / wavelength - frequency * time + (mode === 'ripple' ? arm / 8 : 0));
      // Taper amplitude at both ends. The phase still travels outwards at f × lambda.
      return {distance, lift: j === 0 || j === 16 ? 0 : Math.sin(phase) * Math.sin(Math.PI * j / 16) * 2.5};
    }))};
}
export function reachedGoal(state) { return Math.abs(state.speed - 12) < .05; }
