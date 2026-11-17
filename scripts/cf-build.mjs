// Cloudflare Pages build for the lab: copy the public files into dist/, with the lab's redirects and headers.
// What is left out matches .vercelignore (internal QA files, sources, docs), plus the server functions in api/ (Cloudflare
// runs its own versions from functions/) and any file over Cloudflare Pages' 25 MiB per-file limit, which is listed.
// Usage (Cloudflare Pages: build command `node scripts/cf-build.mjs`, output directory `dist`).
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';

const ROOT = process.cwd();
const OUT = join(ROOT, 'dist');
const LIMIT = 25 * 1024 * 1024;
const git = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).split('\0').filter(Boolean);

let tracked, ignored = new Set();
try {
  tracked = git(['ls-files', '-z']);
  if (existsSync(join(ROOT, '.vercelignore'))) ignored = new Set(git(['ls-files', '-z', '--cached', '--ignored', '--exclude-from=.vercelignore']));
} catch {
  // no git in this build: walk the tree instead (no .vercelignore matching beyond the fixed rules below)
  tracked = [];
  const walk = (d) => { for (const e of readdirSync(d, { withFileTypes: true })) { const p = join(d, e.name); if (e.name === '.git' || e.name === 'node_modules' || p === OUT) continue; if (e.isDirectory()) walk(p); else tracked.push(relative(ROOT, p).split(sep).join('/')); } };
  walk(ROOT);
}

const FIXED = [/^api\//, /^functions\//, /^scripts\//, /^docs\//, /^node_modules\//, /^dist\//, /^\.git/, /^vercel\.json$/, /^package(-lock)?\.json$/, /^\.vercelignore$/, /^wrangler\.toml$/, /\.blend\d?$/];
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
let n = 0, bytes = 0;
const tooBig = [];
for (const f of tracked) {
  if (ignored.has(f) || FIXED.some((re) => re.test(f))) continue;
  let st;
  try { st = statSync(join(ROOT, f)); } catch { continue; }
  if (!st.isFile()) continue;
  if (st.size > LIMIT) { tooBig.push(`${f} (${(st.size / 1048576).toFixed(1)} MB)`); continue; }
  const to = join(OUT, f);
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(join(ROOT, f), to);
  n++; bytes += st.size;
}

// redirects and rewrites from vercel.json (host-based ones are handled in functions/_middleware.js)
const v = JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf8'));
const conv = (s) => s.replace(/:path\*$/, '*').replace(/:path\(\.\*\)$/, '*').replace(/:(\w+)\(\.\*\)/g, '*');
const redirects = [];
for (const r of v.redirects ?? []) {
  if (r.has) continue;
  const src = conv(r.source), dst = r.destination.replace(/:path\*?$/, ':splat').replace(/:path$/, ':splat');
  redirects.push(`${src} ${dst} ${r.permanent ? 301 : 302}`);
}
for (const r of v.rewrites ?? []) {
  // Cloudflare strips index.html, so rewrite to the folder; a named segment keeps the folder itself from matching
  const dst = r.destination.replace(/index\.html$/, '');
  const line = `${r.source} ${dst} 200`;
  if (!redirects.includes(line)) redirects.push(line);
}
writeFileSync(join(OUT, '_redirects'), redirects.join('\n') + '\n');

// a real not-found page (without one, Cloudflare Pages answers every unknown address with the home page)
if (!existsSync(join(OUT, '404.html'))) writeFileSync(join(OUT, '404.html'), `<!doctype html><html lang="en-NZ"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Not found · assembl lab</title>
<style>body{margin:0;min-height:100svh;display:grid;place-items:center;background:#21121F;color:#F9F6F2;font-family:system-ui,sans-serif;text-align:center;padding:24px}a{color:#D9BACB}</style></head>
<body><main><p style="font:500 28px/1 system-ui;letter-spacing:-.05em">assembl<span style="color:#D9BACB">.</span> lab</p><p>There's nothing at this address.</p><p><a href="/">Back to the lab</a></p></main></body></html>
`);

// headers: the site-wide security headers, CORS and caching for the AR folders, and the USDZ type on every .usdz
const H = [];
const global = (v.headers ?? []).find((h) => h.source === '/(.*)');
if (global) H.push('/*', ...global.headers.map((h) => `  ${h.key}: ${h.value}`));
for (const dir of ['/ar/worlds/files', '/auckland/3d']) H.push(`${dir}/*`, '  Access-Control-Allow-Origin: *', '  Cache-Control: public, max-age=3600');
H.push('/study/lessons/climate/embed/*', '  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()', '  Referrer-Policy: no-referrer');
for (const f of tracked) if (f.endsWith('.usdz') && existsSync(join(OUT, f))) H.push(`/${f}`, '  Content-Type: model/vnd.usdz+zip');
writeFileSync(join(OUT, '_headers'), H.join('\n') + '\n');

console.log(`cf-build: ${n} files, ${(bytes / 1048576).toFixed(1)} MB in dist/; ${redirects.length} redirects; ${H.filter((l) => !l.startsWith(' ')).length} header rules.`);
if (tooBig.length) console.log(`cf-build: left out (over 25 MiB): ${tooBig.join(', ')}`);
