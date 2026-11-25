import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync, lstatSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
export const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const config = JSON.parse(readFileSync(new URL('./public-files.json', import.meta.url)));
const sha = value => createHash('sha256').update(value).digest('hex');
function walk(dir, prefix = '') {
  return readdirSync(dir).sort().flatMap(name => {
    const file = join(dir, name), relative = prefix + name, stat = lstatSync(file);
    if (stat.isSymbolicLink()) throw new Error(`Symlink refused: ${relative}`);
    if (stat.isDirectory()) return walk(file, relative + '/');
    if (!stat.isFile()) throw new Error(`Non-file refused: ${relative}`);
    return [relative];
  });
}
export function fingerprint(dir) {
  if (lstatSync(dir).isSymbolicLink()) throw new Error("Public directory symlink refused");
  const files = walk(dir);
  if (JSON.stringify(files.sort()) !== JSON.stringify(Object.keys(config.files).sort())) throw new Error('Public file set differs from the reviewed allowlist');
  return files.map(path => {
    const bytes = readFileSync(join(dir, path));
    if (bytes.length > 25 * 1024 * 1024) throw new Error(`Pages file too large: ${path}`);
    return {path, bytes: bytes.length, sha256: sha(bytes)};
  });
}
export function verify(out) {
  const receipt = JSON.parse(readFileSync(join(out, 'release.json')));
  const files = fingerprint(join(out, 'public'));
  if (JSON.stringify(files) !== JSON.stringify(receipt.files) || sha(JSON.stringify(files)) !== receipt.digest) throw new Error('Artifact hash mismatch');
  if (!/^[a-f0-9]{40}$/.test(receipt.commit) || receipt.project !== config.project) throw new Error('Invalid release provenance');
  return receipt;
}
export function build(out) {
  if (existsSync(out)) throw new Error('Output already exists; use a new empty artifact directory');
  mkdirSync(join(out, 'public'), {recursive:true});
  for (const [target, source] of Object.entries(config.files)) {
    const src = resolve(root, source), dst = join(out, 'public', target);
    if (lstatSync(src).isSymbolicLink()) throw new Error('Source symlink refused');
    mkdirSync(dirname(dst), {recursive:true});
    if (target === 'index.html') {
      // #211 stores these as home.*, but production uses agency.*; home.css belongs to the legal/work pages.
      const html = readFileSync(src, 'utf8').replace('./home.css?v=20261122c', './agency.css?v=20261122d').replace('./home.js?v=20261122a', './agency.js?v=20261122d');
      writeFileSync(dst, html);
    } else copyFileSync(src, dst);
  }
  const files = fingerprint(join(out, 'public'));
  const commit = execFileSync('git', ['rev-parse','HEAD'], {cwd:root,encoding:'utf8'}).trim();
  const dirty = !!execFileSync('git', ['status','--porcelain','--untracked-files=all'], {cwd:root,encoding:'utf8'}).trim();
  const receipt = {project:config.project, commit, dirty, digest:sha(JSON.stringify(files)), files};
  writeFileSync(join(out, 'release.json'), JSON.stringify(receipt,null,2)+'\n');
  return verify(out);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [command, output] = process.argv.slice(2);
  if (!['build','verify'].includes(command) || !output) throw new Error('Usage: artifact.mjs build|verify OUTPUT_DIRECTORY');
  const result = command === 'build' ? build(resolve(output)) : verify(resolve(output));
  console.log(JSON.stringify({commit:result.commit,dirty:result.dirty,digest:result.digest,files:result.files.length}));
}
