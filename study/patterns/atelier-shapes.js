const TAU = Math.PI * 2;
export const FORMS = ['knot', 'halo', 'bloom', 'ribbon'];
export function shapePoint(form, u, seed = 42) {
  const a = u * TAU, phase = Math.sin(seed * .017) * .2;
  if (form === 'halo') {
    const r = 1.18 + .14 * Math.cos(6 * a + phase);
    return [r * Math.cos(a), r * Math.sin(a), .32 * Math.sin(3 * a + phase)];
  }
  if (form === 'bloom') {
    const r = 1.03 + .4 * Math.cos(5 * a + phase);
    return [r * Math.cos(a), r * Math.sin(a), .32 * Math.sin(5 * a + phase)];
  }
  if (form === 'ribbon') {
    const r = .96 + .25 * Math.cos(5 * a + phase);
    return [r * Math.cos(2 * a), r * Math.sin(2 * a), .55 * Math.sin(5 * a + phase)];
  }
  const r = 1.02 + .38 * Math.cos(3 * a + phase);
  return [r * Math.cos(2 * a), r * Math.sin(2 * a) * 1.12, .48 * Math.sin(3 * a + phase)];
}
export function cleanRecipe(input = {}) {
  const number = (key, fallback, min, max) => Number.isFinite(Number(input[key])) ? Math.max(min, Math.min(max, Number(input[key]))) : fallback;
  return {
    seed: Math.round(number('seed', 42, 0, 99999)),
    form: FORMS.includes(input.form) ? input.form : 'knot',
    material: ['chrome', 'glass', 'coral', 'porcelain'].includes(input.material) ? input.material : 'porcelain',
    lighting: ['daylight', 'gallery', 'rose'].includes(input.lighting) ? input.lighting : 'daylight',
    energy: number('energy', .55, 0, 1), thickness: number('thickness', .72, .25, 1.4),
    flutes: Math.round(number('flutes', 0, 0, 14)), zoom: number('zoom', 1, .75, 1.4),
    dark: input.dark === true, tone: Math.round(number('tone', 0, 0, 3)),
    color: /^#[0-9a-f]{6}$/i.test(input.color) ? input.color : '#c9bcdf',
    background: /^#[0-9a-f]{6}$/i.test(input.background) ? input.background : '#fffdfb',
    roughness: number('roughness', .24, .02, .9),
    word: typeof input.word === 'string' ? input.word.replace(/[<>"&]/g, '').slice(0,12) : 'PLAY',
  };
}
