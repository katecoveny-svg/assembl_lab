// Versions every file of the architecture ops page by its content, so a browser never mixes a new file with an old
// cached one (the site's browser cache keeps scripts for hours, and the page's modules import each other by plain
// names such as './model.js'). It writes, into architecture/index.html:
//   - an import map that sends each './js/<name>.js' to './js/<name>.js?v=<hash of that file>'
//   - the same kind of version on the page's own script (app.js) and its stylesheet (ops.css)
// Run after changing anything in architecture/js or ops.css:   node tools/arch-importmap.mjs
// tests/architecture/importmap.test.mjs fails when index.html is out of step with the files.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'architecture');
const hash = (file) => createHash('sha256').update(readFileSync(file)).digest('hex').slice(0, 10);

/** what index.html should say, worked out from the files as they are now */
export function expected(dir = root) {
  const js = readdirSync(path.join(dir, 'js')).filter((f) => f.endsWith('.js')).sort();
  const imports = Object.fromEntries(js.map((f) => [`./js/${f}`, `./js/${f}?v=${hash(path.join(dir, 'js', f))}`]));
  return { imports, app: imports['./js/app.js'], css: `./ops.css?v=${hash(path.join(dir, 'ops.css'))}` };
}

const START = '<!-- importmap:start (written by tools/arch-importmap.mjs) -->', END = '<!-- importmap:end -->';

/** index.html with the map, the script and the stylesheet brought up to date */
export function rewrite(html, want = expected()) {
  const map = `${START}\n    <script type="importmap">${JSON.stringify({ imports: want.imports })}</script>\n    ${END}`;
  let out = html.includes(START)
    ? html.replace(new RegExp(`${START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${END}`), map)
    : html.replace(/(\s*)<link rel="stylesheet" href="\.\/ops\.css[^"]*" \/>/, (m, sp) => `${sp}${map}${m}`);
  out = out.replace(/<link rel="stylesheet" href="\.\/ops\.css[^"]*" \/>/, `<link rel="stylesheet" href="${want.css}" />`);
  out = out.replace(/<script type="module" src="\.\/js\/app\.js[^"]*"><\/script>/, `<script type="module" src="${want.app}"></script>`);
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const file = path.join(root, 'index.html');
  const before = readFileSync(file, 'utf8'), after = rewrite(before);
  if (after !== before) writeFileSync(file, after);
  console.log(after === before ? 'architecture/index.html was already up to date' : 'architecture/index.html updated');
}
