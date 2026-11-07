#!/usr/bin/env node
// Start a new study teardown from the template: copies tools/study-teardown/template into study/teardown/<slug>/.
//   node tools/study-teardown/new-machine.cjs bike-drivetrain "Bicycle drivetrain"
// It refuses to write over a folder that exists, and it never touches the existing study machines in study/m/.
'use strict';
const fs = require('fs');
const path = require('path');
const [slug, ...rest] = process.argv.slice(2);
const title = rest.join(' ').trim();
if (!slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || !title) {
  console.error('usage: node tools/study-teardown/new-machine.cjs <slug-in-kebab-case> "<Title in sentence case>"');
  process.exit(2);
}
const root = path.join(__dirname, '../..');
const from = path.join(__dirname, 'template');
const to = path.join(root, 'study/teardown', slug);
if (fs.existsSync(to)) {
  console.error(`study/teardown/${slug}/ already exists; pick another slug or edit it by hand`);
  process.exit(1);
}
fs.mkdirSync(to, {recursive: true});
for (const f of fs.readdirSync(from)) {
  const text = fs.readFileSync(path.join(from, f), 'utf8').replaceAll('{{SLUG}}', slug).replaceAll('{{TITLE}}', title);
  fs.writeFileSync(path.join(to, f), text);
}
console.log(`study/teardown/${slug}/ is ready. Serve the repo and open /study/teardown/${slug}/, then:`);
console.log(`  flock /dev/shm/heavy.lock node tools/study-teardown/verify.cjs /study/teardown/${slug}/`);
