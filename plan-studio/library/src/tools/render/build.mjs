import { build } from 'esbuild';
await build({ entryPoints: [new URL('./render.ts', import.meta.url).pathname], bundle: true, format: 'esm', outfile: new URL('../../.cache/render/render.js', import.meta.url).pathname, logLevel: 'warning' });
