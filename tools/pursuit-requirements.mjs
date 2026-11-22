// Writes architecture/js/pursuit-requirements.js from architecture/data/pursuit-requirements.json.
// The JSON is the versioned data file a person edits; the .js copy is what the page and the server function import
// (Cloudflare's older Pages bundler stops on JSON imports, so the server cannot import the .json itself).
// Run after changing the JSON:   node tools/pursuit-requirements.mjs   then   node tools/arch-importmap.mjs
// tests/architecture/pursuit.test.mjs fails when the two are out of step.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'architecture');
export const JSON_FILE = path.join(root, 'data', 'pursuit-requirements.json');
export const JS_FILE = path.join(root, 'js', 'pursuit-requirements.js');

/** the .js file's text for the JSON as it is now */
export function generated(json = readFileSync(JSON_FILE, 'utf8')) {
  const data = JSON.parse(json);
  return `// Generated from architecture/data/pursuit-requirements.json by tools/pursuit-requirements.mjs. Do not edit by hand:
// change the JSON and run the tool again. What each field means is in the JSON's "about".
export const REQUIREMENTS = ${JSON.stringify(data, null, 1)};
`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out = generated();
  writeFileSync(JS_FILE, out);
  console.log(`wrote ${path.relative(process.cwd(), JS_FILE)} (${out.length} characters)`);
}
