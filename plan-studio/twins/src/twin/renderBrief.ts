import * as THREE from 'three/webgpu';

// The photo-render prompt: plain text to take, with a recorded fly-through or a still, to an image or video model
// that re-renders the frames as photographs. It is written from what the model holds (the parts' own names and
// sources) plus any staging the plan asks for: things that belong in a finished picture but not in the model, such as
// a parked car. Nothing here renders anything; the result of using it is an artist's impression, and says so.

const uniq = (xs: string[]) => [...new Set(xs.map((s) => s.trim()).filter(Boolean))];

export function photoRenderPrompt(scene: THREE.Object3D, title: string, when: Date | null, sunRead: string): string {
  const by: Record<string, string[]> = {}, staging: string[] = [];
  scene.traverse((o) => {
    const u = o.userData as { kind?: string; name?: string; staging?: string };
    if (u.staging) staging.push(u.staging);
    if (u.kind && u.name) (by[u.kind] ??= []).push(u.name);
  });
  const list = (k: string, max = 14) => uniq(by[k] ?? []).filter((n) => !/\(proposed\)$/.test(n)).slice(0, max).join('; ');
  const date = when ? when.toLocaleDateString('en-NZ', { day: 'numeric', month: 'long' }) + ', ' + when.toLocaleTimeString('en-NZ', { hour: 'numeric', minute: '2-digit' }) : '';
  const lines: string[] = [];
  lines.push(`PHOTO-RENDER PROMPT: ${title}`);
  lines.push('');
  lines.push('Use with the fly-through video (or a still) recorded from this model as the reference.');
  lines.push('');
  lines.push('Re-render every frame of the reference as a real architectural photograph, shot on a full-frame camera with a 24 mm lens, natural light, true-to-life colour, fine material texture and soft real shadows.');
  lines.push('');
  lines.push('KEEP EXACTLY AS IN THE REFERENCE');
  lines.push('- The camera path, framing and timing.');
  lines.push('- The building: its shape, size, roof, every wall, window, door, deck, balustrade, post and stair. Do not add, remove, move or resize any part.');
  lines.push('- The ground levels, the boundary of the clearing and the position of every kept tree.');
  lines.push(`- The sun: direction and shadows as shown${date ? ` (${date}${sunRead ? '; ' + sunRead.toLowerCase() : ''})` : ''}.`);
  lines.push('- Each surface keeps the material and colour it has in the reference; make it look real, do not restyle it.');
  const parts: [string, string][] = [
    ['Outside', uniq([...(by.element ?? []), ...(by.steps ?? []), ...(by.parking ?? []), ...(by.retaining ?? [])]).join('; ')],
    ['Planting', list('planting')],
    ['Lighting', list('lighting')],
    ['Furniture', list('furniture', 10)],
  ];
  if (parts.some((p) => p[1])) {
    lines.push('');
    lines.push('WHAT IS IN THE MODEL');
    for (const [k, v] of parts) if (v) lines.push(`- ${k}: ${v}.`);
  }
  if (staging.length) {
    lines.push('');
    lines.push('ADD FOR THE PICTURE (not in the model)');
    for (const s of uniq(staging)) lines.push(`- ${s}`);
  }
  lines.push('');
  lines.push('DO NOT');
  lines.push('- Add people, animals, text, signs, logos, badges or number plates.');
  lines.push('- Add buildings, fences, paths, pools or planting that the reference does not show.');
  lines.push('- Change the weather, the season or the time of day.');
  lines.push('- Smooth away or invent structure: if a part is unclear in a frame, keep it as it was in the frame before.');
  lines.push('');
  lines.push('LABEL THE RESULT');
  lines.push("Artist's impression made from the design model. Furniture, planting, lighting and anything added for the picture are proposed. Not a survey, not an as-built record.");
  return lines.join('\n');
}
