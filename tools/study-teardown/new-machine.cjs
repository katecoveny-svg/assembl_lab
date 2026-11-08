#!/usr/bin/env node
// Project-local scaffolder: no deletion, no overwrite, no template HTML/JS injection.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const [slug, ...rest] = process.argv.slice(2);
const title = rest.join(' ').trim();
function fail(message) { console.error(message); process.exit(2); }
if (!slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length > 80 ||
    !title || title.length > 120 || !/^[\p{L}\p{N} ()–—-]+$/u.test(title)) {
  fail('Use a kebab-case slug and a plain-text title (letters, numbers, spaces, parentheses or dashes).');
}
const root = fs.realpathSync(path.join(__dirname, '../..'));
const from = path.join(__dirname, 'template');
// Reject symlinked ancestors, even when they point back inside the project.
let parent = root;
for (const segment of ['study', 'teardown']) {
  parent = path.join(parent, segment);
  if (!fs.existsSync(parent)) fs.mkdirSync(parent);
  const st = fs.lstatSync(parent);
  if (st.isSymbolicLink() || !st.isDirectory()) fail('Output ancestors must be real project directories.');
}
const to = path.join(parent, slug);
if (path.dirname(to) !== parent) fail('Output must be inside study/teardown.');
// Non-recursive mkdir is atomic and refuses existing destinations, including symlinks.
try { fs.mkdirSync(to); } catch (e) { fail('Destination exists or cannot be created; nothing overwritten.'); }
for (const f of fs.readdirSync(from)) {
  const source = path.join(from, f);
  if (!fs.lstatSync(source).isFile()) fail('Templates must be regular files.');
  const text = fs.readFileSync(source, 'utf8').replaceAll('{{SLUG}}', slug).replaceAll('{{TITLE}}', title);
  fs.writeFileSync(path.join(to, f), text, {flag: 'wx'});
}
console.log(`study/teardown/${slug}/ is ready for model, source and browser verification.`);
