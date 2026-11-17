// Bundle /home/claude/manu/src/objects/catalogue.ts read-only and print every object's info block as JSON.
import { build } from 'esbuild';
import { writeFileSync } from 'node:fs';
const out = new URL('../.cache/objects-info.bundle.mjs', import.meta.url).pathname;
await build({
  stdin: { contents: "import { OBJECTS } from '/home/claude/manu/src/objects/catalogue.ts'; export const INFO = OBJECTS.map(o => o.info);", resolveDir: '/home/claude/manu/src/objects', loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', outfile: out, external: ['three', 'three/*'], logLevel: 'error',
});
const { INFO } = await import(out);
writeFileSync('/home/claude/work/inv/objects-info.json', JSON.stringify(INFO, null, 1));
console.log(INFO.length, INFO.map((i) => `${i.key} | ${i.category} | ${i.name} | ${i.dimensions.slice(0, 80)}`).join('\n'));
