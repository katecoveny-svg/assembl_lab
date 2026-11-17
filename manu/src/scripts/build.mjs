// Manu · birds of Aotearoa, up close: the teaching section of assembl lab at /manu/.
//
// Built from the manu three.js library (Feather engine and perch by Theo Tillberg, MIT;
// Aotearoa species and flora by assembl, MIT), copied into src/engine/. Content, with a source
// for every fact, is in content/birds.mjs and content/sources.mjs.
//
//   npm install
//   node scripts/build.mjs            JS (vite) + pages -> dist/manu, then copy dist/manu/* to the lab's /manu/
//
// Made once, not on every build, and kept in the deployed /manu/ folder:
//   models/perch.glb   node scripts/pack-perch.mjs <manu>/public/branch.glb public/models/perch.glb
//   stills/*.webp      npx vite (dev server on :5181), then
//                      python3 -I scripts/stills.py http://127.0.0.1:5181/manu/ public/stills
//                      python3 -I scripts/webp.py public/stills; copy stills.json to content/
// The pages copy public/models and public/stills when they are present.
import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';
rmSync('dist', { recursive: true, force: true });
execSync('npx vite build', { stdio: 'inherit' });
execSync('node scripts/pages.mjs dist/manu', { stdio: 'inherit' });
